import asyncio
import logging
from datetime import datetime
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
from app.database.models import Extraction, Media, Wallet, WebsiteSource
logger = logging.getLogger(__name__)
COLLECTOR_NAME = "website"
# How often the collector re-checks the seed URL list and re-crawls it.
# Kept short for demo purposes — raise this for real deployments so you
# don't hammer the same sites repeatedly.
POLL_INTERVAL_SECONDS = 300
REQUEST_TIMEOUT_SECONDS = 15
MAX_IMAGES_PER_PAGE = 8
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB safety cap per image
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; GatekeeperOSINT/1.0; "
        "+https://github.com/) "
    )
}
def _get_active_urls():
    db = SessionLocal()
    try:
        sources = (
            db.query(WebsiteSource)
            .filter(WebsiteSource.active.is_(True))
            .all()
        )
        return [source.url for source in sources]
    finally:
        db.close()
def _mark_crawled(url: str):
    db = SessionLocal()
    try:
        source = (
            db.query(WebsiteSource)
            .filter(WebsiteSource.url == url)
            .first()
        )
        if source:
            source.last_crawled_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()
def _fetch_page(url: str):
    response = requests.get(
        url, headers=HEADERS, timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response.text
def _extract_text_and_images(html: str, base_url: str):
    soup = BeautifulSoup(html, "html.parser")
    # Strip script/style before extracting visible text.
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    text = "\n".join(
        line.strip() for line in text.splitlines() if line.strip()
    )
    image_urls = []
    for img in soup.find_all("img"):
        src = img.get("src")
        if not src:
            continue
        absolute_url = urljoin(base_url, src)
        if absolute_url not in image_urls:
            image_urls.append(absolute_url)
    return text, image_urls[:MAX_IMAGES_PER_PAGE]
def _download_image(url: str):
    try:
        response = requests.get(
            url, headers=HEADERS, timeout=REQUEST_TIMEOUT_SECONDS,
            stream=True,
        )
        response.raise_for_status()
        content_length = int(response.headers.get("Content-Length", 0))
        if content_length and content_length > MAX_IMAGE_BYTES:
            return None
        content = response.content
        if len(content) > MAX_IMAGE_BYTES:
            return None
        return content
    except Exception as error:
        logger.warning("Failed to download image %s: %s", url, error)
        return None
def _process_page(url: str):
    """
    Runs one seed URL through: fetch -> parse -> OCR images -> wallet
    detection -> validation/scoring/enrichment -> persistence.
    Mirrors the exact pipeline used by the manual file-upload endpoint
    (api/extraction.py) so results are consistent across sources.
    """
    html = _fetch_page(url)
    page_text, image_urls = _extract_text_and_images(html, url)
    combined_text_parts = [page_text] if page_text else []
    all_qr_codes = []
    images_processed = 0
    for image_url in image_urls:
        image_bytes = _download_image(image_url)
        if not image_bytes:
            continue
        images = load_images(image_bytes)
        if not images:
            continue
        images_processed += 1
        collector_manager.increment(COLLECTOR_NAME, "images")
        page_image = images[0]
        image_text = ocr_engine.extract_text(page_image)
        image_qr_codes = qr_scanner.scan(page_image)
        if image_text:
            combined_text_parts.append(image_text)
        if image_qr_codes:
            all_qr_codes.extend(image_qr_codes)
            combined_text_parts.append("\n".join(image_qr_codes))
    combined_text = "\n".join(combined_text_parts)
    if not combined_text.strip():
        return 0
    detected_wallets = wallet_detector.detect(combined_text)
    validated_wallets = []
    for wallet in detected_wallets:
        wallet = wallet_validator.validate(wallet)
        wallet = risk_engine.calculate(wallet, "website_collection")
        wallet = enrichment_engine.enrich(wallet)
        wallet = osint_engine.enrich(wallet)
        validated_wallets.append(wallet)
    correlation_result = correlation_engine.correlate(combined_text)
    highest_risk = 0
    if validated_wallets:
        highest_risk = max(
            wallet.get("risk_score", 0) for wallet in validated_wallets
        )
    db = SessionLocal()
    try:
        domain = urlparse(url).netloc or url
        media_record = Media(
            filename=domain,
            file_type="text/html",
            file_size=len(html.encode("utf-8", errors="ignore")),
            source_type="website",
            source_url=url,
        )
        db.add(media_record)
        db.flush()
        extraction_record = Extraction(
            media_id=media_record.id,
            ocr_text=combined_text,
            wallet_count=len(validated_wallets),
            highest_risk=highest_risk,
            page_count=1,
        )
        db.add(extraction_record)
        db.flush()
        for wallet in validated_wallets:
            db.add(Wallet(
                extraction_id=extraction_record.id,
                address=wallet["address"],
                chain=wallet["chain"],
                valid=wallet["valid"],
                confidence=wallet["confidence"],
                risk_score=wallet.get("risk_score", 0),
                risk_level=wallet.get("risk_level", "LOW"),
                page_number=1,
                ocr_corrected=wallet.get("ocr_corrected", False),
            ))
        db.commit()
    finally:
        db.close()
    collector_manager.increment(COLLECTOR_NAME, "processed")
    collector_manager.increment(
        COLLECTOR_NAME, "wallets", len(validated_wallets)
    )
    if all_qr_codes:
        collector_manager.increment(
            COLLECTOR_NAME, "qrs", len(all_qr_codes)
        )
    logger.info(
        "Website collector: %s -> %s wallet(s), %s image(s) scanned",
        url, len(validated_wallets), images_processed,
    )
    return len(validated_wallets)
async def start_collector():
    """
    Long-running loop: on each cycle, re-reads the active seed URL list
    (so URLs can be added/removed live from the UI) and crawls each one.
    Runs as an asyncio task under collector_manager, same pattern as the
    Telegram collector, so it starts/stops/cancels the same way.
    """
    logger.info("Website OSINT collector starting...")
    try:
        while True:
            urls = await asyncio.to_thread(_get_active_urls)
            if not urls:
                logger.info(
                    "Website collector: no active seed URLs configured."
                )
            for url in urls:
                try:
                    await asyncio.to_thread(_process_page, url)
                    await asyncio.to_thread(_mark_crawled, url)
                except Exception as error:
                    logger.exception(
                        "Website collector failed on %s: %s", url, error
                    )
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
    except asyncio.CancelledError:
        logger.info("Website OSINT collector stopped.")
        raise
async def stop_collector():
    # Cancellation is handled by collector_manager.stop() cancelling the
    # asyncio task directly — nothing extra to clean up here since each
    # page crawl uses its own short-lived DB session.
    return True