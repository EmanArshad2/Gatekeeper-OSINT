import asyncio
import gc
import hashlib
import logging
import time
from collections import OrderedDict
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from app.collectors.manager import collector_manager
from app.core.correlation.engine import correlation_engine
from app.core.enrichment.engine import enrichment_engine
from app.core.media import load_images
from app.core.ocr.engine import ocr_engine
from app.core.osint.engine import osint_engine
from app.core.qr.scanner import qr_scanner
from app.core.scoring.engine import risk_engine
from app.core.wallet.detector import wallet_detector
from app.core.wallet.validator import wallet_validator
from app.database.connection import SessionLocal
from app.database.models import (
    Extraction,
    Media,
    Wallet,
    WebsiteSource,
)
logger = logging.getLogger(__name__)
COLLECTOR_NAME = "website"
# =============================================================
# CONFIGURATION
# =============================================================
POLL_INTERVAL_SECONDS = 300
REQUEST_TIMEOUT_SECONDS = 15
MAX_IMAGES_PER_PAGE = 8
MAX_IMAGE_BYTES = 8 * 1024 * 1024
# Prevent enormous HTML pages from consuming memory.
MAX_HTML_BYTES = 10 * 1024 * 1024
# Ignore tracking pixels, icons, spacers, etc.
MIN_IMAGE_WIDTH = 80
MIN_IMAGE_HEIGHT = 80
# Only process real raster images.
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
}
# Maximum number of page hashes kept in memory.
# This prevents the cache itself from becoming a memory leak.
MAX_CACHE_ENTRIES = 500
# Maximum text kept from a single page.
MAX_COMBINED_TEXT_CHARS = 500_000
# =============================================================
# HTTP
# =============================================================
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; GatekeeperOSINT/1.0; "
        "+https://github.com/)"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,"
        "application/xml;q=0.9,*/*;q=0.8"
    ),
}
# Reuse TCP connections instead of creating a new connection
# for every image/page.
HTTP_SESSION = requests.Session()
HTTP_SESSION.headers.update(HEADERS)
# =============================================================
# IN-MEMORY DEDUP CACHE
# =============================================================
# OrderedDict allows us to remove the oldest entries when the
# cache reaches MAX_CACHE_ENTRIES.
PAGE_HASH_CACHE = OrderedDict()
def _page_hash(url: str, html: str) -> str:
    """
    Generate a stable hash for the current page.
    URL is included so identical content from different websites
    is not considered the same page.
    """
    payload = (
        f"{url}\n"
        f"{html}"
    ).encode(
        "utf-8",
        errors="ignore",
    )
    return hashlib.sha256(payload).hexdigest()
def _is_duplicate_page(url: str, html: str) -> bool:
    """
    Returns True when this exact page content has already been
    processed during the current backend lifetime.
    """
    content_hash = _page_hash(
        url,
        html,
    )
    previous_hash = PAGE_HASH_CACHE.get(url)
    # Move URL to the end of the LRU cache.
    if url in PAGE_HASH_CACHE:
        PAGE_HASH_CACHE.move_to_end(url)
    if previous_hash == content_hash:
        logger.info(
            "Website collector: unchanged page skipped: %s",
            url,
        )
        return True
    PAGE_HASH_CACHE[url] = content_hash
    PAGE_HASH_CACHE.move_to_end(url)
    # Keep memory bounded.
    while len(PAGE_HASH_CACHE) > MAX_CACHE_ENTRIES:
        PAGE_HASH_CACHE.popitem(
            last=False
        )
    return False
# =============================================================
# DATABASE
# =============================================================
def _get_active_urls():
    db = SessionLocal()
    try:
        sources = (
            db.query(WebsiteSource)
            .filter(
                WebsiteSource.active.is_(True)
            )
            .all()
        )
        # Remove duplicates while preserving order.
        urls = []
        seen = set()
        for source in sources:
            url = (source.url or "").strip()
            if not url:
                continue
            if url in seen:
                continue
            seen.add(url)
            urls.append(url)
        return urls
    finally:
        db.close()
def _mark_crawled(url: str):
    db = SessionLocal()
    try:
        source = (
            db.query(WebsiteSource)
            .filter(
                WebsiteSource.url == url
            )
            .first()
        )
        if source:
            source.last_crawled_at = datetime.now(
                timezone.utc
            )
            db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to update last_crawled_at for %s",
            url,
        )
    finally:
        db.close()
# =============================================================
# PAGE FETCH
# =============================================================
def _fetch_page(url: str):
    """
    Fetch HTML with a hard memory limit.
    """
    response = None
    try:
        response = HTTP_SESSION.get(
            url,
            timeout=REQUEST_TIMEOUT_SECONDS,
            stream=True,
        )
        response.raise_for_status()
        content_type = (
            response.headers
            .get(
                "Content-Type",
                "",
            )
            .lower()
        )
        if (
            content_type
            and "text/html" not in content_type
            and "application/xhtml+xml"
            not in content_type
        ):
            logger.warning(
                "Skipping non-HTML website: %s [%s]",
                url,
                content_type,
            )
            return None
        content_length = int(
            response.headers.get(
                "Content-Length",
                0,
            )
            or 0
        )
        if content_length > MAX_HTML_BYTES:
            logger.warning(
                "Skipping oversized HTML page: %s (%s bytes)",
                url,
                content_length,
            )
            return None
        chunks = []
        total_size = 0
        for chunk in response.iter_content(
            chunk_size=64 * 1024
        ):
            if not chunk:
                continue
            total_size += len(chunk)
            if total_size > MAX_HTML_BYTES:
                logger.warning(
                    "HTML page exceeded memory limit: %s",
                    url,
                )
                return None
            chunks.append(chunk)
        content = b"".join(chunks)
        if not content:
            return None
        return content.decode(
            response.encoding
            or "utf-8",
            errors="ignore",
        )
    except requests.RequestException as error:
        logger.warning(
            "Failed to fetch website %s: %s",
            url,
            error,
        )
        return None
    except Exception:
        logger.exception(
            "Unexpected page fetch error: %s",
            url,
        )
        return None
    finally:
        if response is not None:
            response.close()
# =============================================================
# HTML EXTRACTION
# =============================================================
def _extract_text_and_images(
    html: str,
    base_url: str,
):
    soup = BeautifulSoup(
        html,
        "html.parser",
    )
    # Remove non-visible content.
    for tag in soup(
        [
            "script",
            "style",
            "noscript",
            "template",
            "iframe",
            "svg",
        ]
    ):
        tag.decompose()
    text = soup.get_text(
        separator="\n"
    )
    text = "\n".join(
        line.strip()
        for line in text.splitlines()
        if line.strip()
    )
    # Prevent giant pages from creating giant strings.
    if len(text) > MAX_COMBINED_TEXT_CHARS:
        logger.warning(
            "Page text truncated from %s to %s characters",
            len(text),
            MAX_COMBINED_TEXT_CHARS,
        )
        text = text[
            :MAX_COMBINED_TEXT_CHARS
        ]
    image_urls = []
    seen_images = set()
    for img in soup.find_all("img"):
        # Some websites use lazy loading.
        src = (
            img.get("src")
            or img.get("data-src")
            or img.get("data-lazy-src")
        )
        if not src:
            continue
        if src.startswith("data:"):
            continue
        absolute_url = urljoin(
            base_url,
            src,
        )
        parsed_url = urlparse(
            absolute_url
        )
        path = parsed_url.path.lower()
        # Ignore SVG/icons.
        if path.endswith(
            (
                ".svg",
                ".ico",
                ".icns",
            )
        ):
            continue
        if absolute_url in seen_images:
            continue
        seen_images.add(
            absolute_url
        )
        image_urls.append(
            absolute_url
        )
        if (
            len(image_urls)
            >= MAX_IMAGES_PER_PAGE
        ):
            break
    return text, image_urls
# =============================================================
# IMAGE DOWNLOAD
# =============================================================
def _download_image(url: str):
    """
    Safely download a raster image.
    The response is always closed.
    """
    response = None
    try:
        response = HTTP_SESSION.get(
            url,
            timeout=REQUEST_TIMEOUT_SECONDS,
            stream=True,
        )
        response.raise_for_status()
        content_type = (
            response.headers
            .get(
                "Content-Type",
                "",
            )
            .split(";")[0]
            .strip()
            .lower()
        )
        # Only process supported raster images.
        if (
            content_type
            not in ALLOWED_IMAGE_TYPES
        ):
            logger.debug(
                "Skipping unsupported image %s [%s]",
                url,
                content_type,
            )
            return None
        content_length = int(
            response.headers.get(
                "Content-Length",
                0,
            )
            or 0
        )
        if content_length > MAX_IMAGE_BYTES:
            logger.warning(
                "Skipping oversized image %s (%s bytes)",
                url,
                content_length,
            )
            return None
        chunks = []
        total_size = 0
        for chunk in response.iter_content(
            chunk_size=64 * 1024
        ):
            if not chunk:
                continue
            total_size += len(chunk)
            if total_size > MAX_IMAGE_BYTES:
                logger.warning(
                    "Image exceeded size limit: %s",
                    url,
                )
                return None
            chunks.append(chunk)
        content = b"".join(
            chunks
        )
        if not content:
            return None
        return content
    except requests.RequestException as error:
        logger.warning(
            "Failed to download image %s: %s",
            url,
            error,
        )
        return None
    except Exception:
        logger.exception(
            "Unexpected image download error: %s",
            url,
        )
        return None
    finally:
        if response is not None:
            response.close()
# =============================================================
# TEXT LIMIT
# =============================================================
def _append_text(
    parts,
    text,
):
    """
    Append text while keeping the combined text bounded.
    """
    if not text:
        return
    current_length = sum(
        len(part)
        for part in parts
    )
    remaining = (
        MAX_COMBINED_TEXT_CHARS
        - current_length
    )
    if remaining <= 0:
        return
    parts.append(
        text[:remaining]
    )
# =============================================================
# WALLET DEDUPLICATION
# =============================================================
def _deduplicate_wallets(wallets):
    """
    Remove duplicate wallets returned by OCR + page text.
    Same address + chain = one wallet.
    """
    unique = {}
    for wallet in wallets:
        if not wallet:
            continue
        address = str(
            wallet.get(
                "address",
                "",
            )
        ).strip()
        chain = str(
            wallet.get(
                "chain",
                "",
            )
        ).strip().lower()
        if not address:
            continue
        key = (
            chain,
            address.lower(),
        )
        unique[key] = wallet
    return list(
        unique.values()
    )
# =============================================================
# PAGE PROCESSING
# =============================================================
def _process_page(url: str):
    """
    Process one website URL through:
    fetch
    -> HTML parsing
    -> image extraction
    -> OCR
    -> QR scanning
    -> wallet detection
    -> validation
    -> scoring
    -> enrichment
    -> OSINT
    -> correlation
    -> persistence
    """
    started_at = time.monotonic()
    html = None
    page_text = None
    image_urls = []
    try:
        # =====================================================
        # FETCH PAGE
        # =====================================================
        html = _fetch_page(url)
        if not html:
            return 0
        # =====================================================
        # DUPLICATE PAGE CHECK
        # =====================================================
        if _is_duplicate_page(
            url,
            html,
        ):
            return 0
        # =====================================================
        # EXTRACT PAGE
        # =====================================================
        page_text, image_urls = (
            _extract_text_and_images(
                html,
                url,
            )
        )
        combined_text_parts = []
        if page_text:
            _append_text(
                combined_text_parts,
                page_text,
            )
        all_qr_codes = []
        images_processed = 0
        # =====================================================
        # PROCESS IMAGES
        # =====================================================
        for image_url in image_urls:
            image_bytes = (
                _download_image(
                    image_url
                )
            )
            if not image_bytes:
                continue
            page_image = None
            images = None
            try:
                # -------------------------------------------------
                # IMAGE DECODING
                # -------------------------------------------------
                images = load_images(
                    image_bytes
                )
                if not images:
                    logger.debug(
                        "No decodable image: %s",
                        image_url,
                    )
                    continue
                page_image = images[0]
                try:
                    height, width = (
                        page_image.shape[:2]
                    )
                except (
                    AttributeError,
                    ValueError,
                    IndexError,
                ):
                    logger.warning(
                        "Invalid image object: %s",
                        image_url,
                    )
                    continue
                # -------------------------------------------------
                # TINY IMAGE FILTER
                # -------------------------------------------------
                if (
                    width < MIN_IMAGE_WIDTH
                    or height < MIN_IMAGE_HEIGHT
                ):
                    logger.debug(
                        "Skipping tiny image %s (%sx%s)",
                        image_url,
                        width,
                        height,
                    )
                    continue
                images_processed += 1
                collector_manager.increment(
                    COLLECTOR_NAME,
                    "images",
                )
                # -------------------------------------------------
                # OCR
                # -------------------------------------------------
                try:
                    image_text = (
                        ocr_engine.extract_text(
                            page_image
                        )
                    )
                    if image_text:
                        _append_text(
                            combined_text_parts,
                            image_text,
                        )
                except Exception as error:
                    logger.warning(
                        "OCR failed for %s: %s",
                        image_url,
                        error,
                    )
                # -------------------------------------------------
                # QR
                # -------------------------------------------------
                try:
                    image_qr_codes = (
                        qr_scanner.scan(
                            page_image
                        )
                    )
                    if image_qr_codes:
                        for qr in image_qr_codes:
                            if (
                                qr
                                and qr
                                not in all_qr_codes
                            ):
                                all_qr_codes.append(
                                    qr
                                )
                        _append_text(
                            combined_text_parts,
                            "\n".join(
                                image_qr_codes
                            ),
                        )
                except Exception as error:
                    logger.warning(
                        "QR scanning failed for %s: %s",
                        image_url,
                        error,
                    )
            except Exception as error:
                logger.warning(
                    "Image processing failed for %s: %s",
                    image_url,
                    error,
                )
            finally:
                # Release references to potentially large
                # NumPy/OpenCV image arrays.
                page_image = None
                images = None
                image_bytes = None
                gc.collect()
        # =====================================================
        # COMBINE TEXT
        # =====================================================
        combined_text = "\n".join(
            combined_text_parts
        )
        # Explicit final safety limit.
        if len(combined_text) > MAX_COMBINED_TEXT_CHARS:
            combined_text = (
                combined_text[
                    :MAX_COMBINED_TEXT_CHARS
                ]
            )
        if not combined_text.strip():
            logger.info(
                "Website collector: no readable content: %s",
                url,
            )
            return 0
        # =====================================================
        # WALLET DETECTION
        # =====================================================
        try:
            detected_wallets = (
                wallet_detector.detect(
                    combined_text
                )
            )
        except Exception:
            logger.exception(
                "Wallet detection failed for %s",
                url,
            )
            detected_wallets = []
        detected_wallets = (
            _deduplicate_wallets(
                detected_wallets
            )
        )
        # =====================================================
        # WALLET PROCESSING
        # =====================================================
        validated_wallets = []
        for wallet in detected_wallets:
            try:
                wallet = (
                    wallet_validator.validate(
                        wallet
                    )
                )
                if not wallet:
                    continue
                wallet = (
                    risk_engine.calculate(
                        wallet,
                        "website_collection",
                    )
                )
                wallet = (
                    enrichment_engine.enrich(
                        wallet
                    )
                )
                wallet = (
                    osint_engine.enrich(
                        wallet
                    )
                )
                if wallet:
                    validated_wallets.append(
                        wallet
                    )
            except Exception as error:
                logger.warning(
                    "Wallet processing failed: %s",
                    error,
                )
        # Final wallet deduplication because enrichment may
        # modify/return wallet dictionaries.
        validated_wallets = (
            _deduplicate_wallets(
                validated_wallets
            )
        )
        # =====================================================
        # CORRELATION
        # =====================================================
        try:
            correlation_engine.correlate(
                combined_text,
                validated_wallets,
            )
        except Exception as error:
            logger.warning(
                "Correlation failed for %s: %s",
                url,
                error,
            )
        # =====================================================
        # HIGHEST RISK
        # =====================================================
        highest_risk = 0
        if validated_wallets:
            highest_risk = max(
                int(
                    wallet.get(
                        "risk_score",
                        0,
                    )
                    or 0
                )
                for wallet in validated_wallets
            )
        # =====================================================
        # DATABASE PERSISTENCE
        # =====================================================
        db = SessionLocal()
        try:
            domain = (
                urlparse(url).netloc
                or url
            )
            media_record = Media(
                filename=domain,
                file_type="text/html",
                file_size=len(
                    html.encode(
                        "utf-8",
                        errors="ignore",
                    )
                ),
                source_type="website",
                source_url=url,
            )
            db.add(
                media_record
            )
            db.flush()
            extraction_record = Extraction(
                media_id=media_record.id,
                ocr_text=combined_text,
                wallet_count=len(
                    validated_wallets
                ),
                highest_risk=highest_risk,
                page_count=1,
            )
            db.add(
                extraction_record
            )
            db.flush()
            for wallet in validated_wallets:
                address = wallet.get(
                    "address"
                )
                chain = wallet.get(
                    "chain"
                )
                if not address or not chain:
                    continue
                db.add(
                    Wallet(
                        extraction_id=(
                            extraction_record.id
                        ),
                        address=address,
                        chain=chain,
                        valid=wallet.get(
                            "valid",
                            False,
                        ),
                        confidence=wallet.get(
                            "confidence",
                            0,
                        ),
                        risk_score=wallet.get(
                            "risk_score",
                            0,
                        ),
                        risk_level=wallet.get(
                            "risk_level",
                            "LOW",
                        ),
                        page_number=1,
                        ocr_corrected=wallet.get(
                            "ocr_corrected",
                            False,
                        ),
                    )
                )
            db.commit()
        except Exception:
            db.rollback()
            logger.exception(
                "Database persistence failed for %s",
                url,
            )
            raise
        finally:
            db.close()
        # =====================================================
        # METRICS
        # =====================================================
        collector_manager.increment(
            COLLECTOR_NAME,
            "processed",
        )
        collector_manager.increment(
            COLLECTOR_NAME,
            "wallets",
            len(validated_wallets),
        )
        if all_qr_codes:
            collector_manager.increment(
                COLLECTOR_NAME,
                "qrs",
                len(all_qr_codes),
            )
        elapsed = (
            time.monotonic()
            - started_at
        )
        logger.info(
            "Website collector: %s -> "
            "%s wallet(s), %s image(s), "
            "%s QR(s), %.2fs",
            url,
            len(validated_wallets),
            images_processed,
            len(all_qr_codes),
            elapsed,
        )
        return len(
            validated_wallets
        )
    except Exception:
        logger.exception(
            "Website collector failed while processing %s",
            url,
        )
        return 0
    finally:
        # Release large temporary objects.
        html = None
        page_text = None
        image_urls = None
        gc.collect()
# =============================================================
# COLLECTOR LOOP
# =============================================================
async def start_collector():
    """
    Long-running website collector.
    Active WebsiteSource records are reloaded every cycle.
    """
    logger.info(
        "Website OSINT collector starting..."
    )
    try:
        while True:
            cycle_started = (
                time.monotonic()
            )
            try:
                urls = await asyncio.to_thread(
                    _get_active_urls
                )
            except Exception:
                logger.exception(
                    "Failed to load active website sources"
                )
                urls = []
            if not urls:
                logger.info(
                    "Website collector: "
                    "no active seed URLs configured."
                )
            for url in urls:
                try:
                    await asyncio.to_thread(
                        _process_page,
                        url,
                    )
                except Exception:
                    # This is deliberately isolated so one website
                    # can NEVER terminate the collection loop.
                    logger.exception(
                        "Website processing crashed: %s",
                        url,
                    )
                finally:
                    try:
                        await asyncio.to_thread(
                            _mark_crawled,
                            url,
                        )
                    except Exception:
                        logger.exception(
                            "Failed marking website crawled: %s",
                            url,
                        )
                    # Give the event loop some breathing room
                    # between potentially expensive OCR jobs.
                    await asyncio.sleep(
                        0.1
                    )
            cycle_time = (
                time.monotonic()
                - cycle_started
            )
            logger.info(
                "Website collection cycle completed "
                "in %.2fs (%s URL(s))",
                cycle_time,
                len(urls),
            )
            await asyncio.sleep(
                POLL_INTERVAL_SECONDS
            )
    except asyncio.CancelledError:
        logger.info(
            "Website OSINT collector stopped."
        )
        raise
    except Exception:
        # Never silently kill the background collector.
        logger.exception(
            "Website collector loop terminated unexpectedly."
        )
        raise
async def stop_collector():
    """
    Collector shutdown hook.
    collector_manager handles task cancellation directly.
    """
    try:
        HTTP_SESSION.close()
    except Exception:
        pass
    return True