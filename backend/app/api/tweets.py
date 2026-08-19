import logging
import requests
from datetime import date, datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from pdf2image import convert_from_bytes
from app.core.enrichment.engine import enrichment_engine
from app.core.media import load_images
from app.core.ocr.engine import ocr_engine
from app.core.osint.engine import osint_engine
from app.core.qr.scanner import qr_scanner
from app.core.scoring.engine import risk_engine
from app.core.wallet.detector import wallet_detector
from app.core.wallet.validator import wallet_validator
from app.database.connection import get_database
from app.database.models import (
    Extraction,
    Media,
    Tweet,
    Wallet,
)
logger = logging.getLogger(__name__)
router = APIRouter()
# ============================================================
# X / TWITTER SEARCH CONFIGURATION
# ============================================================
DEFAULT_X_KEYWORDS = [
    "btc wallet",
    "crypto wallet",
    "usdt address",
    "seed phrase",
    "private key",
]
ALLOWED_DISPLAY_TYPES = {
    "Latest",
    "Top",
    "People",
    "Media",
}
DEFAULT_X_SEARCH_CONFIG = {
    "keywords": DEFAULT_X_KEYWORDS.copy(),
    "since": None,
    "until": None,
    "limit": 20,
    "display_type": "Latest",
}
# Runtime configuration used by the X public scraper.
#
# NOTE:
# This is intentionally kept in memory for now.
# It can later be moved to PostgreSQL if persistent
# configuration across backend restarts is required.
x_search_config = DEFAULT_X_SEARCH_CONFIG.copy()
# ============================================================
# SEARCH CONFIG MODEL
# ============================================================
class XSearchConfig(BaseModel):
    """
    Configuration received from the frontend
    for X public search.
    """
    keywords: list[str] = Field(
        default_factory=lambda: DEFAULT_X_KEYWORDS.copy(),
        min_length=1,
    )
    since: date | None = None
    until: date | None = None
    limit: int = Field(
        default=20,
        ge=1,
        le=100,
    )
    display_type: str = Field(
        default="Latest",
    )
    @field_validator("keywords")
    @classmethod
    def validate_keywords(
        cls,
        value: list[str],
    ) -> list[str]:
        cleaned = []
        for keyword in value:
            keyword = keyword.strip()
            if keyword:
                cleaned.append(keyword)
        if not cleaned:
            raise ValueError(
                "At least one search keyword is required."
            )
        # Remove duplicates while preserving order.
        return list(dict.fromkeys(cleaned))
    @field_validator("display_type")
    @classmethod
    def validate_display_type(
        cls,
        value: str,
    ) -> str:
        value = value.strip()
        if value not in ALLOWED_DISPLAY_TYPES:
            raise ValueError(
                "Invalid display type. "
                f"Allowed values: "
                f"{', '.join(sorted(ALLOWED_DISPLAY_TYPES))}"
            )
        return value
# ============================================================
# X SEARCH CONFIG HELPERS
# ============================================================
def get_current_x_search_config() -> dict[str, Any]:
    """
    Return a copy so callers cannot accidentally mutate
    the global configuration object.
    """
    return {
        "keywords": list(
            x_search_config["keywords"]
        ),
        "since": x_search_config["since"],
        "until": x_search_config["until"],
        "limit": x_search_config["limit"],
        "display_type": x_search_config["display_type"],
    }
def reset_x_search_config() -> dict[str, Any]:
    """
    Reset X search configuration to defaults.
    """
    global x_search_config
    x_search_config = {
        "keywords": DEFAULT_X_KEYWORDS.copy(),
        "since": None,
        "until": None,
        "limit": 20,
        "display_type": "Latest",
    }
    logger.info(
        "X search configuration reset to defaults."
    )
    return get_current_x_search_config()
# ============================================================
# GET X SEARCH CONFIGURATION
# ============================================================
@router.get("/tweets/search-config")
def get_x_search_config():
    """
    Return the current X/Twitter public search configuration.
    """
    return {
        "status": "SUCCESS",
        "config": get_current_x_search_config(),
    }
# ============================================================
# UPDATE X SEARCH CONFIGURATION
# ============================================================
@router.post("/tweets/search-config")
def update_x_search_config(
    config: XSearchConfig,
):
    """
    Update runtime X/Twitter public search configuration.
    """
    if config.since and config.until:
        if config.since > config.until:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Since date cannot be after "
                    "until date."
                ),
            )
    global x_search_config
    x_search_config = {
        "keywords": list(
            config.keywords
        ),
        "since": (
            config.since.isoformat()
            if config.since
            else None
        ),
        "until": (
            config.until.isoformat()
            if config.until
            else None
        ),
        "limit": config.limit,
        "display_type": config.display_type,
    }
    logger.info(
        "X search configuration updated: %s",
        x_search_config,
    )
    return {
        "status": "SUCCESS",
        "message": (
            "X search configuration updated."
        ),
        "config": get_current_x_search_config(),
    }
# ============================================================
# RESET X SEARCH CONFIGURATION
# ============================================================
@router.post(
    "/tweets/search-config/reset"
)
def reset_x_search_configuration():
    config = reset_x_search_config()
    return {
        "status": "SUCCESS",
        "message": (
            "X search configuration "
            "reset to defaults."
        ),
        "config": config,
    }
# ============================================================
# X SEARCH CONFIGURATION OPTIONS
# ============================================================
@router.get(
    "/tweets/search-config/options"
)
def get_x_search_config_options():
    return {
        "status": "SUCCESS",
        "options": {
            "display_types": sorted(
                ALLOWED_DISPLAY_TYPES
            ),
            "min_limit": 1,
            "max_limit": 100,
            "default_limit": 20,
            "default_display_type": "Latest",
        },
    }
# ============================================================
# MEDIA DOWNLOAD HELPERS
# ============================================================
def download_remote_media(
    media_url: str,
) -> tuple[bytes, str, str]:
    """
    Download remote X media.
    Returns:
        content
        content_type
        filename
    """
    if not media_url:
        raise ValueError(
            "Media URL is empty."
        )
    response = requests.get(
        media_url,
        timeout=30,
        headers={
            "User-Agent": (
                "Mozilla/5.0 "
                "(Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 "
                "(KHTML, like Gecko) "
                "Chrome/151 Safari/537.36"
            )
        },
    )
    response.raise_for_status()
    content = response.content
    content_type = (
        response.headers.get(
            "content-type",
            "",
        )
        .lower()
        .split(";")[0]
        .strip()
    )
    filename = (
        media_url
        .split("?")[0]
        .rstrip("/")
        .split("/")[-1]
        or "x_media"
    )
    return (
        content,
        content_type,
        filename,
    )
# ============================================================
# MEDIA TYPE DETECTION
# ============================================================
def detect_media_type(
    content: bytes,
    content_type: str,
    filename: str,
) -> str:
    """
    Determine whether downloaded media is an image
    or PDF.
    Uses HTTP metadata and file signatures.
    """
    lowered_filename = filename.lower()
    # --------------------------------------------------------
    # PDF
    # --------------------------------------------------------
    if (
        content.startswith(b"%PDF")
        or "application/pdf" in content_type
        or lowered_filename.endswith(".pdf")
    ):
        return "pdf"
    # --------------------------------------------------------
    # IMAGE
    # --------------------------------------------------------
    if (
        content.startswith(b"\xff\xd8\xff")
        or content.startswith(b"\x89PNG")
        or content.startswith(b"RIFF")
        or "image/" in content_type
        or lowered_filename.endswith(
            (
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
                ".bmp",
                ".gif",
            )
        )
    ):
        return "image"
    return "unknown"
# ============================================================
# PROCESS IMAGE BYTES
# ============================================================
def inspect_image_bytes(
    content: bytes,
) -> dict[str, Any]:
    """
    Process a single image.
    OCR + QR extraction.
    """
    result = {
        "page": 1,
        "ocr_text": "",
        "qr_results": [],
        "error": None,
    }
    try:
        images = load_images(
            content
        )
        if not images:
            result["error"] = (
                "Unable to decode image."
            )
            return result
        image = images[0]
        # ----------------------------------------------------
        # OCR
        # ----------------------------------------------------
        try:
            result["ocr_text"] = (
                ocr_engine.extract_text(
                    image
                )
                or ""
            )
        except Exception as error:
            logger.exception(
                "X investigation OCR failed."
            )
            result["error"] = (
                f"OCR error: {error}"
            )
        # ----------------------------------------------------
        # QR
        # ----------------------------------------------------
        try:
            qr_results = (
                qr_scanner.scan(
                    image
                )
                or []
            )
            result["qr_results"] = [
                str(item)
                for item in qr_results
            ]
        except Exception as error:
            logger.exception(
                "X investigation QR scan failed."
            )
            if result["error"]:
                result["error"] += (
                    f" | QR error: {error}"
                )
            else:
                result["error"] = (
                    f"QR error: {error}"
                )
    except Exception as error:
        logger.exception(
            "Image inspection failed."
        )
        result["error"] = str(error)
    return result
# ============================================================
# PROCESS PDF BYTES
# ============================================================
def inspect_pdf_bytes(
    content: bytes,
) -> list[dict[str, Any]]:
    """
    Convert every PDF page to an image and run
    OCR + QR detection on every page.
    """
    results = []
    try:
        pages = convert_from_bytes(
            content,
            dpi=200,
        )
        logger.info(
            "X investigation PDF contains %s page(s).",
            len(pages),
        )
        for page_number, page in enumerate(
            pages,
            start=1,
        ):
            page_result = {
                "page": page_number,
                "ocr_text": "",
                "qr_results": [],
                "error": None,
            }
            # ------------------------------------------------
            # OCR
            # ------------------------------------------------
            try:
                page_result["ocr_text"] = (
                    ocr_engine.extract_text(
                        page
                    )
                    or ""
                )
            except Exception as error:
                logger.exception(
                    "PDF OCR failed on page %s.",
                    page_number,
                )
                page_result["error"] = (
                    f"OCR error: {error}"
                )
            # ------------------------------------------------
            # QR
            # ------------------------------------------------
            try:
                qr_results = (
                    qr_scanner.scan(
                        page
                    )
                    or []
                )
                page_result[
                    "qr_results"
                ] = [
                    str(item)
                    for item in qr_results
                ]
            except Exception as error:
                logger.exception(
                    "PDF QR scan failed on page %s.",
                    page_number,
                )
                if page_result["error"]:
                    page_result["error"] += (
                        f" | QR error: {error}"
                    )
                else:
                    page_result["error"] = (
                        f"QR error: {error}"
                    )
            results.append(
                page_result
            )
    except Exception as error:
        logger.exception(
            "PDF inspection failed."
        )
        results.append(
            {
                "page": 1,
                "ocr_text": "",
                "qr_results": [],
                "error": str(error),
            }
        )
    return results
# ============================================================
# INSPECT REMOTE MEDIA
# ============================================================
def inspect_remote_media(
    media_url: str,
) -> dict[str, Any]:
    """
    Download and inspect X media.
    Supports:
        Image
        PDF
    """
    content, content_type, filename = (
        download_remote_media(
            media_url
        )
    )
    media_type = detect_media_type(
        content,
        content_type,
        filename,
    )
    if media_type == "image":
        pages = [
            inspect_image_bytes(
                content
            )
        ]
    elif media_type == "pdf":
        pages = inspect_pdf_bytes(
            content
        )
    else:
        raise ValueError(
            "Unsupported media type. "
            f"Content-Type={content_type}, "
            f"filename={filename}"
        )
    # --------------------------------------------------------
    # COMBINE OCR
    # --------------------------------------------------------
    combined_ocr = "\n".join(
        page["ocr_text"]
        for page in pages
        if page.get("ocr_text")
    )
    # --------------------------------------------------------
    # COMBINE QR RESULTS
    # --------------------------------------------------------
    qr_results = []
    for page in pages:
        for qr in page.get(
            "qr_results",
            [],
        ):
            if qr not in qr_results:
                qr_results.append(
                    qr
                )
    return {
        "media_type": media_type,
        "content_type": content_type,
        "filename": filename,
        "pages": pages,
        "page_count": len(pages),
        "ocr_text": combined_ocr.strip(),
        "qr_results": qr_results,
    }
# ============================================================
# WALLET ANALYSIS
# ============================================================
def analyze_wallets(
    combined_text: str,
) -> tuple[list, list]:
    """
    Detect, validate, score and enrich wallets.
    """
    if not combined_text:
        return [], []
    detected_wallets = (
        wallet_detector.detect(
            combined_text
        )
        or []
    )
    validated_wallets = []
    errors = []
    for wallet in detected_wallets:
        try:
            wallet = (
                wallet_validator.validate(
                    wallet
                )
            )
            wallet = (
                risk_engine.calculate(
                    wallet,
                    "twitter_investigation",
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
            validated_wallets.append(
                wallet
            )
        except Exception as error:
            logger.warning(
                "Wallet investigation failed: %s",
                error,
            )
            errors.append(
                str(error)
            )
    return (
        validated_wallets,
        errors,
    )
# ============================================================
# RISK SUMMARY
# ============================================================
def calculate_investigation_risk(
    wallets: list,
) -> tuple[int, str]:
    highest_risk = 0
    risk_label = "LOW"
    if wallets:
        highest_risk = max(
            wallet.get(
                "risk_score",
                0,
            )
            for wallet in wallets
        )
        if highest_risk >= 75:
            risk_label = "CRITICAL"
        elif highest_risk >= 50:
            risk_label = "HIGH"
        elif highest_risk >= 25:
            risk_label = "MEDIUM"
    return (
        highest_risk,
        risk_label,
    )
# ============================================================
# QUEUE X TWEET
# ============================================================
@router.post("/tweets/queue")
def queue_tweet(
    payload: dict,
    db: Session = Depends(get_database),
):
    """
    Queue and process a tweet collected by the X collector.
    The tweet is checked for duplicate IDs, then its text/media
    goes through OCR, QR scanning, wallet detection, validation,
    enrichment, OSINT enrichment and risk scoring.
    """
    tweet_id = payload.get(
        "tweet_id"
    )
    if not tweet_id:
        raise HTTPException(
            status_code=400,
            detail="tweet_id is required.",
        )
    existing = (
        db.query(Tweet)
        .filter(
            Tweet.tweet_id
            == tweet_id
        )
        .first()
    )
    if existing:
        return {
            "status": "EXISTS",
            "id": existing.id,
            "tweet_id": existing.tweet_id,
            "wallet_count": (
                existing.wallet_count
                or 0
            ),
        }
    tweet_text = (
        payload.get("text")
        or ""
    )
    media_url = (
        payload.get("media_url")
    )
    # --------------------------------------------------------
    # EXTRACTION PIPELINE
    # --------------------------------------------------------
    combined_text_parts = []
    if tweet_text:
        combined_text_parts.append(
            tweet_text
        )
    image_ocr_text = ""
    qr_results = []
    media_result = None
    if media_url:
        try:
            media_result = (
                inspect_remote_media(
                    media_url
                )
            )
            image_ocr_text = (
                media_result.get(
                    "ocr_text"
                )
                or ""
            )
            qr_results = (
                media_result.get(
                    "qr_results",
                    [],
                )
            )
            if image_ocr_text:
                combined_text_parts.append(
                    image_ocr_text
                )
            if qr_results:
                combined_text_parts.append(
                    "\n".join(
                        qr_results
                    )
                )
        except Exception as error:
            logger.warning(
                "Failed to fetch/OCR tweet media %s: %s",
                media_url,
                error,
            )
    combined_text = "\n".join(
        part
        for part in combined_text_parts
        if part
    )
    # --------------------------------------------------------
    # WALLET ANALYSIS
    # --------------------------------------------------------
    (
        validated_wallets,
        wallet_errors,
    ) = analyze_wallets(
        combined_text
    )
    # --------------------------------------------------------
    # RISK
    # --------------------------------------------------------
    (
        highest_risk,
        risk_label,
    ) = calculate_investigation_risk(
        validated_wallets
    )
    # --------------------------------------------------------
    # STORE TWEET
    # --------------------------------------------------------
    tweet = Tweet(
        tweet_id=tweet_id,
        author=payload.get(
            "author"
        ),
        text=tweet_text,
        media_url=media_url,
        platform="X/Twitter",
        risk=risk_label,
        wallet_count=len(
            validated_wallets
        ),
        processed=True,
    )
    db.add(tweet)
    db.commit()
    db.refresh(tweet)
    # --------------------------------------------------------
    # STORE MEDIA / EXTRACTION / WALLETS
    # --------------------------------------------------------
    if media_url:
        media_record = Media(
            filename=(
                (
                    media_result or {}
                ).get(
                    "filename"
                )
                or f"tweet_{tweet_id}"
            ),
            file_type=(
                (
                    media_result or {}
                ).get(
                    "content_type"
                )
                or "application/octet-stream"
            ),
            source_type="twitter",
            source_url=media_url,
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
            page_count=(
                (
                    media_result or {}
                ).get(
                    "page_count",
                    1,
                )
                or 1
            ),
        )
        db.add(
            extraction_record
        )
        db.flush()
        for wallet in validated_wallets:
            db.add(
                Wallet(
                    extraction_id=(
                        extraction_record.id
                    ),
                    address=wallet[
                        "address"
                    ],
                    chain=wallet[
                        "chain"
                    ],
                    valid=wallet.get(
                        "valid",
                        True,
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
    logger.info(
        "X tweet processed: "
        "tweet_id=%s wallets=%s risk=%s",
        tweet_id,
        len(validated_wallets),
        risk_label,
    )
    return {
        "status": "SUCCESS",
        "id": tweet.id,
        "tweet_id": tweet_id,
        "wallet_count": len(
            validated_wallets
        ),
        "risk": risk_label,
        "ocr_detected": bool(
            image_ocr_text
        ),
        "qr_count": len(
            qr_results
        ),
        "media_type": (
            (
                media_result or {}
            ).get(
                "media_type"
            )
        ),
        "page_count": (
            (
                media_result or {}
            ).get(
                "page_count",
                0,
            )
        ),
    }
# ============================================================
# X TWEET FEED
#
# IMPORTANT:
# This route MUST appear BEFORE:
#
#     /tweets/{tweet_id}
#
# Otherwise FastAPI interprets "feed" as tweet_id.
# ============================================================
@router.get(
    "/tweets/feed"
)
def tweet_feed(
    db: Session = Depends(get_database),
):
    """
    Return the latest 50 collected X/Twitter tweets.
    """
    tweets = (
        db.query(Tweet)
        .order_by(
            Tweet.created_at.desc()
        )
        .limit(50)
        .all()
    )
    return {
        "status": "SUCCESS",
        "count": len(tweets),
        "tweets": [
            {
                "id": tweet.id,
                "tweet_id": (
                    tweet.tweet_id
                ),
                "author": (
                    tweet.author
                ),
                "text": (
                    tweet.text
                ),
                "media_url": (
                    tweet.media_url
                ),
                "platform": (
                    tweet.platform
                ),
                "risk": (
                    tweet.risk
                ),
                "wallet_count": (
                    tweet.wallet_count
                    or 0
                ),
                "processed": (
                    tweet.processed
                ),
                "created_at": (
                    tweet.created_at
                ),
                # Frontend convenience fields
                "has_media": bool(
                    tweet.media_url
                ),
                "investigate_available": True,
                "investigate_url": (
                    f"/api/tweets/"
                    f"{tweet.tweet_id}/investigate"
                ),
            }
            for tweet in tweets
        ],
    }
# ============================================================
# GET SINGLE X TWEET
#
# IMPORTANT:
# Keep this AFTER /tweets/feed.
# ============================================================
@router.get(
    "/tweets/{tweet_id}"
)
def get_tweet(
    tweet_id: str,
    db: Session = Depends(get_database),
):
    """
    Return one specific X tweet.
    Used by the investigation panel.
    """
    tweet = (
        db.query(Tweet)
        .filter(
            Tweet.tweet_id
            == tweet_id
        )
        .first()
    )
    if not tweet:
        raise HTTPException(
            status_code=404,
            detail="Tweet not found.",
        )
    return {
        "status": "SUCCESS",
        "tweet": {
            "id": tweet.id,
            "tweet_id": (
                tweet.tweet_id
            ),
            "author": (
                tweet.author
            ),
            "text": (
                tweet.text
            ),
            "media_url": (
                tweet.media_url
            ),
            "platform": (
                tweet.platform
            ),
            "risk": (
                tweet.risk
            ),
            "wallet_count": (
                tweet.wallet_count
                or 0
            ),
            "processed": (
                tweet.processed
            ),
            "created_at": (
                tweet.created_at
            ),
            "has_media": bool(
                tweet.media_url
            ),
            "investigate_available": True,
        },
    }
# ============================================================
# INVESTIGATE SPECIFIC X TWEET
# ============================================================
@router.post(
    "/tweets/{tweet_id}/investigate"
)
def investigate_tweet(
    tweet_id: str,
    db: Session = Depends(get_database),
):
    """
    Perform an on-demand forensic investigation of one
    collected X/Twitter post.
    Investigation includes:
        - Original tweet text
        - Remote media download
        - Image/PDF detection
        - OCR
        - Page-level OCR
        - QR scanning
        - Wallet detection
        - Wallet validation
        - Risk scoring
        - Enrichment
        - OSINT correlation
        - Evidence storage
    """
    # --------------------------------------------------------
    # FIND TWEET
    # --------------------------------------------------------
    tweet = (
        db.query(Tweet)
        .filter(
            Tweet.tweet_id
            == tweet_id
        )
        .first()
    )
    if not tweet:
        raise HTTPException(
            status_code=404,
            detail=(
                f"X tweet {tweet_id} "
                "was not found."
            ),
        )
    logger.info(
        "Starting manual X investigation: %s",
        tweet_id,
    )
    # --------------------------------------------------------
    # BASE INVESTIGATION RESULT
    # --------------------------------------------------------
    investigation = {
        "tweet": {
            "id": tweet.id,
            "tweet_id": (
                tweet.tweet_id
            ),
            "author": tweet.author,
            "text": tweet.text,
            "media_url": (
                tweet.media_url
            ),
            "platform": (
                tweet.platform
            ),
            "stored_risk": (
                tweet.risk
            ),
            "stored_wallet_count": (
                tweet.wallet_count
                or 0
            ),
            "created_at": (
                tweet.created_at
            ),
        },
        "investigation": {
            "status": "STARTED",
            "investigated_at": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),
            "media_inspected": False,
            "media_type": None,
            "filename": None,
            "content_type": None,
            "page_count": 0,
            "ocr_text": "",
            "pages": [],
            "qr_results": [],
            "wallets": [],
            "wallet_count": 0,
            "highest_risk": 0,
            "risk": "LOW",
            "errors": [],
            "extraction_id": None,
        },
    }
    # --------------------------------------------------------
    # ORIGINAL TWEET TEXT
    # --------------------------------------------------------
    combined_text_parts = []
    if tweet.text:
        combined_text_parts.append(
            tweet.text
        )
    # --------------------------------------------------------
    # MEDIA INVESTIGATION
    # --------------------------------------------------------
    if tweet.media_url:
        try:
            media_result = (
                inspect_remote_media(
                    tweet.media_url
                )
            )
            investigation[
                "investigation"
            ][
                "media_inspected"
            ] = True
            investigation[
                "investigation"
            ][
                "media_type"
            ] = media_result.get(
                "media_type"
            )
            investigation[
                "investigation"
            ][
                "filename"
            ] = media_result.get(
                "filename"
            )
            investigation[
                "investigation"
            ][
                "content_type"
            ] = media_result.get(
                "content_type"
            )
            investigation[
                "investigation"
            ][
                "page_count"
            ] = media_result.get(
                "page_count",
                0,
            )
            investigation[
                "investigation"
            ][
                "ocr_text"
            ] = media_result.get(
                "ocr_text",
                "",
            )
            investigation[
                "investigation"
            ][
                "pages"
            ] = media_result.get(
                "pages",
                [],
            )
            investigation[
                "investigation"
            ][
                "qr_results"
            ] = media_result.get(
                "qr_results",
                [],
            )
            # Add OCR to analysis text
            if media_result.get(
                "ocr_text"
            ):
                combined_text_parts.append(
                    media_result[
                        "ocr_text"
                    ]
                )
            # Add QR data to analysis text
            if media_result.get(
                "qr_results"
            ):
                combined_text_parts.append(
                    "\n".join(
                        media_result[
                            "qr_results"
                        ]
                    )
                )
        except Exception as error:
            logger.exception(
                "X tweet investigation media error: %s",
                tweet_id,
            )
            investigation[
                "investigation"
            ][
                "errors"
            ].append(
                f"Media inspection failed: {error}"
            )
    # --------------------------------------------------------
    # COMBINED INVESTIGATION TEXT
    # --------------------------------------------------------
    combined_text = "\n".join(
        part
        for part in combined_text_parts
        if part
    ).strip()
    # --------------------------------------------------------
    # WALLET ANALYSIS
    # --------------------------------------------------------
    (
        validated_wallets,
        wallet_errors,
    ) = analyze_wallets(
        combined_text
    )
    investigation[
        "investigation"
    ][
        "wallets"
    ] = validated_wallets
    investigation[
        "investigation"
    ][
        "wallet_count"
    ] = len(
        validated_wallets
    )
    if wallet_errors:
        investigation[
            "investigation"
        ][
            "errors"
        ].extend(
            wallet_errors
        )
    # --------------------------------------------------------
    # RISK
    # --------------------------------------------------------
    (
        highest_risk,
        risk_label,
    ) = calculate_investigation_risk(
        validated_wallets
    )
    investigation[
        "investigation"
    ][
        "highest_risk"
    ] = highest_risk
    investigation[
        "investigation"
    ][
        "risk"
    ] = risk_label
    # --------------------------------------------------------
    # SAVE INVESTIGATION EVIDENCE
    #
    # IMPORTANT:
    # Save evidence whenever media exists, even if:
    #
    #     wallet_count == 0
    #
    # This allows analysts to inspect suspicious images/PDFs
    # that contain text but no wallet address.
    # --------------------------------------------------------
    if tweet.media_url:
        try:
            media_record = (
                db.query(Media)
                .filter(
                    Media.source_url
                    == tweet.media_url
                )
                .first()
            )
            if not media_record:
                media_record = Media(
                    filename=(
                        investigation[
                            "investigation"
                        ][
                            "filename"
                        ]
                        or f"tweet_{tweet_id}"
                    ),
                    file_type=(
                        investigation[
                            "investigation"
                        ][
                            "content_type"
                        ]
                        or "application/octet-stream"
                    ),
                    source_type="twitter",
                    source_url=(
                        tweet.media_url
                    ),
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
                page_count=(
                    investigation[
                        "investigation"
                    ][
                        "page_count"
                    ]
                    or 1
                ),
            )
            db.add(
                extraction_record
            )
            db.flush()
            # ------------------------------------------------
            # STORE WALLETS
            # ------------------------------------------------
            for wallet in validated_wallets:
                wallet_address = wallet.get(
                    "address"
                )
                if not wallet_address:
                    continue
                existing_wallet = (
                    db.query(Wallet)
                    .filter(
                        Wallet.address
                        == wallet_address
                    )
                    .first()
                )
                if existing_wallet:
                    continue
                db.add(
                    Wallet(
                        extraction_id=(
                            extraction_record.id
                        ),
                        address=(
                            wallet_address
                        ),
                        chain=wallet.get(
                            "chain",
                            "UNKNOWN",
                        ),
                        valid=wallet.get(
                            "valid",
                            True,
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
            investigation[
                "investigation"
            ][
                "extraction_id"
            ] = extraction_record.id
        except Exception as error:
            db.rollback()
            logger.exception(
                "Failed to save X investigation evidence."
            )
            investigation[
                "investigation"
            ][
                "errors"
            ].append(
                f"Evidence storage failed: {error}"
            )
    # --------------------------------------------------------
    # FINAL STATUS
    # --------------------------------------------------------
    investigation[
        "investigation"
    ][
        "status"
    ] = "COMPLETED"
    logger.info(
        "X investigation completed: "
        "tweet_id=%s wallets=%s risk=%s",
        tweet_id,
        len(validated_wallets),
        risk_label,
    )
    return {
        "status": "SUCCESS",
        **investigation,
    }