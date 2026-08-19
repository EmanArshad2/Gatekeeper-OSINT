from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging

from app.collectors.manager import collector_manager

from app.core.telegram.collector import (
    get_telegram_stats,
    start_collector as start_telegram_collector,
    stop_collector as stop_telegram_collector,
)

from app.core.website.collector import (
    start_collector as start_website_collector,
    stop_collector as stop_website_collector,
)

from app.workers.x_public_scraper import (
    start_collector as start_twitter_collector,
    stop_collector as stop_twitter_collector,
)

from app.database.connection import get_database
from app.database.models import WebsiteSource


# ============================================================
# LOGGER
# ============================================================

logger = logging.getLogger("gatekeeper-collectors")


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/collectors",
    tags=["Collectors"],
)


# ============================================================
# TELEGRAM
# ============================================================

@router.post("/start/telegram")
async def start_telegram():
    """
    Start the Telegram collector.
    """

    try:
        started = await collector_manager.start(
            "telegram",
            start_telegram_collector,
        )

    except Exception as error:

        logger.exception(
            "Failed to start Telegram collector."
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Telegram collector failed to start. "
                f"Error: {error}"
            ),
        )

    if not started:

        raise HTTPException(
            status_code=400,
            detail="Telegram collector is already running.",
        )

    return {
        "status": "SUCCESS",
        "message": "Telegram collector started.",
    }


@router.post("/stop/telegram")
async def stop_telegram():
    """
    Stop the Telegram collector.
    """

    try:

        await stop_telegram_collector()

        await collector_manager.stop(
            "telegram"
        )

    except Exception as error:

        logger.exception(
            "Failed to stop Telegram collector."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Telegram collector failed to stop. "
                f"Error: {error}"
            ),
        )

    return {
        "status": "SUCCESS",
        "message": "Telegram collector stopped.",
    }


# ============================================================
# WEBSITE
# ============================================================

@router.post("/start/website")
async def start_website():
    """
    Start the website collector.
    """

    try:

        started = await collector_manager.start(
            "website",
            start_website_collector,
        )

    except Exception as error:

        logger.exception(
            "Failed to start website collector."
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Website collector failed to start. "
                f"Error: {error}"
            ),
        )

    if not started:

        raise HTTPException(
            status_code=400,
            detail="Website collector is already running.",
        )

    return {
        "status": "SUCCESS",
        "message": "Website collector started.",
    }


@router.post("/stop/website")
async def stop_website():
    """
    Stop the website collector.
    """

    try:

        await stop_website_collector()

        await collector_manager.stop(
            "website"
        )

    except Exception as error:

        logger.exception(
            "Failed to stop website collector."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Website collector failed to stop. "
                f"Error: {error}"
            ),
        )

    return {
        "status": "SUCCESS",
        "message": "Website collector stopped.",
    }


# ============================================================
# WEBSITE SOURCES
# ============================================================

@router.get("/website/sources")
def list_website_sources(
    db: Session = Depends(get_database),
):
    """
    Return configured website sources.
    """

    sources = (
        db.query(WebsiteSource)
        .order_by(
            WebsiteSource.id.desc()
        )
        .all()
    )

    return {
        "status": "SUCCESS",
        "sources": [
            {
                "id": source.id,
                "url": source.url,
                "active": source.active,
                "last_crawled_at": (
                    source.last_crawled_at.isoformat()
                    if source.last_crawled_at
                    else None
                ),
            }
            for source in sources
        ],
    }


@router.post("/website/sources")
def add_website_source(
    data: dict,
    db: Session = Depends(get_database),
):
    """
    Add a website source.
    """

    url = (
        data.get("url")
        or ""
    ).strip()

    if not url:

        raise HTTPException(
            status_code=400,
            detail="A URL is required.",
        )

    if not (
        url.startswith("http://")
        or url.startswith("https://")
    ):

        url = f"https://{url}"

    existing = (
        db.query(WebsiteSource)
        .filter(
            WebsiteSource.url == url
        )
        .first()
    )

    if existing:

        raise HTTPException(
            status_code=400,
            detail="This URL is already configured.",
        )

    source = WebsiteSource(
        url=url,
        active=True,
    )

    db.add(source)
    db.commit()
    db.refresh(source)

    return {
        "status": "SUCCESS",
        "source": {
            "id": source.id,
            "url": source.url,
            "active": source.active,
        },
    }


@router.delete(
    "/website/sources/{source_id}"
)
def remove_website_source(
    source_id: int,
    db: Session = Depends(get_database),
):
    """
    Remove a website source.
    """

    source = (
        db.query(WebsiteSource)
        .filter(
            WebsiteSource.id == source_id
        )
        .first()
    )

    if not source:

        raise HTTPException(
            status_code=404,
            detail="Source not found.",
        )

    db.delete(source)
    db.commit()

    return {
        "status": "SUCCESS"
    }


# ============================================================
# TWITTER / X
# ============================================================

@router.post("/start/twitter")
async def start_twitter():
    """
    Start the X/Twitter collector.

    The collector uses Scweet internally.
    No Playwright dependency check is performed here.
    """

    logger.info(
        "Twitter collector start requested."
    )

    try:

        started = await collector_manager.start(
            "twitter",
            start_twitter_collector,
        )

    except Exception as error:

        logger.exception(
            "Failed to start Twitter/Scweet collector."
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Twitter/Scweet collector failed to start. "
                f"Error: {error}"
            ),
        )

    if not started:

        raise HTTPException(
            status_code=400,
            detail=(
                "Twitter collector is already running."
            ),
        )

    logger.info(
        "Twitter/Scweet collector started successfully."
    )

    return {
        "status": "SUCCESS",
        "message": (
            "Twitter collector started successfully. "
            "Using Scweet for X public search."
        ),
    }


@router.post("/stop/twitter")
async def stop_twitter():
    """
    Stop the X/Twitter collector.
    """

    logger.info(
        "Twitter collector stop requested."
    )

    try:

        await stop_twitter_collector()

        await collector_manager.stop(
            "twitter"
        )

    except Exception as error:

        logger.exception(
            "Failed to stop Twitter/Scweet collector."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Twitter collector failed to stop. "
                f"Error: {error}"
            ),
        )

    logger.info(
        "Twitter/Scweet collector stopped."
    )

    return {
        "status": "SUCCESS",
        "message": "Twitter collector stopped.",
    }


# ============================================================
# START ALL
# ============================================================

@router.post("/start-all")
async def start_all():
    """
    Start all collectors.
    """

    started_collectors = []
    skipped_collectors = []
    errors = []

    # --------------------------------------------------------
    # TELEGRAM
    # --------------------------------------------------------

    try:

        telegram_started = await collector_manager.start(
            "telegram",
            start_telegram_collector,
        )

        if telegram_started:

            started_collectors.append(
                "telegram"
            )

        else:

            skipped_collectors.append(
                "telegram"
            )

    except Exception as error:

        logger.exception(
            "Failed to start Telegram collector."
        )

        errors.append(
            {
                "collector": "telegram",
                "error": str(error),
            }
        )

    # --------------------------------------------------------
    # WEBSITE
    # --------------------------------------------------------

    try:

        website_started = await collector_manager.start(
            "website",
            start_website_collector,
        )

        if website_started:

            started_collectors.append(
                "website"
            )

        else:

            skipped_collectors.append(
                "website"
            )

    except Exception as error:

        logger.exception(
            "Failed to start website collector."
        )

        errors.append(
            {
                "collector": "website",
                "error": str(error),
            }
        )

    # --------------------------------------------------------
    # TWITTER / SCWEET
    # --------------------------------------------------------

    try:

        twitter_started = await collector_manager.start(
            "twitter",
            start_twitter_collector,
        )

        if twitter_started:

            started_collectors.append(
                "twitter"
            )

        else:

            skipped_collectors.append(
                "twitter"
            )

    except Exception as error:

        logger.exception(
            "Failed to start Twitter/Scweet collector."
        )

        errors.append(
            {
                "collector": "twitter",
                "error": str(error),
            }
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "status": (
            "SUCCESS"
            if not errors
            else "PARTIAL"
        ),
        "message": "Collectors processed.",
        "started": started_collectors,
        "skipped": skipped_collectors,
        "errors": errors,
    }


# ============================================================
# STOP ALL
# ============================================================

@router.post("/stop-all")
async def stop_all():
    """
    Stop all collectors.
    """

    errors = []

    # --------------------------------------------------------
    # TELEGRAM
    # --------------------------------------------------------

    try:

        await stop_telegram_collector()

    except Exception as error:

        logger.exception(
            "Failed to stop Telegram collector."
        )

        errors.append(
            {
                "collector": "telegram",
                "error": str(error),
            }
        )

    # --------------------------------------------------------
    # WEBSITE
    # --------------------------------------------------------

    try:

        await stop_website_collector()

    except Exception as error:

        logger.exception(
            "Failed to stop website collector."
        )

        errors.append(
            {
                "collector": "website",
                "error": str(error),
            }
        )

    # --------------------------------------------------------
    # TWITTER / SCWEET
    # --------------------------------------------------------

    try:

        await stop_twitter_collector()

    except Exception as error:

        logger.exception(
            "Failed to stop Twitter/Scweet collector."
        )

        errors.append(
            {
                "collector": "twitter",
                "error": str(error),
            }
        )

    # --------------------------------------------------------
    # MANAGER
    # --------------------------------------------------------

    try:

        await collector_manager.stop_all()

    except Exception as error:

        logger.exception(
            "Failed to stop collector manager."
        )

        errors.append(
            {
                "collector": "manager",
                "error": str(error),
            }
        )

    return {
        "status": (
            "SUCCESS"
            if not errors
            else "PARTIAL"
        ),
        "message": "All collectors stopped.",
        "errors": errors,
    }


# ============================================================
# COLLECTOR STATUS
# ============================================================

@router.get("/status")
async def collectors_status():
    """
    Return status for all collectors.
    """

    # --------------------------------------------------------
    # TELEGRAM
    # --------------------------------------------------------

    telegram_status = get_telegram_stats()

    # --------------------------------------------------------
    # MANAGER
    # --------------------------------------------------------

    manager_status = collector_manager.get_status()

    if isinstance(
        manager_status,
        dict,
    ):

        manager_telegram = manager_status.get(
            "telegram",
            {},
        )

        if isinstance(
            manager_telegram,
            dict,
        ):

            telegram_status = {
                **manager_telegram,
                **telegram_status,
            }

    # --------------------------------------------------------
    # DEFAULT STATUS
    # --------------------------------------------------------

    default_status = {
        "running": False,
        "processed": 0,
        "wallets": 0,
        "images": 0,
        "pdfs": 0,
        "qrs": 0,
        "errors": 0,
    }

    # --------------------------------------------------------
    # WEBSITE
    # --------------------------------------------------------

    website_status = (
        default_status.copy()
    )

    # --------------------------------------------------------
    # TWITTER
    # --------------------------------------------------------

    twitter_status = (
        default_status.copy()
    )

    if isinstance(
        manager_status,
        dict,
    ):

        manager_website = manager_status.get(
            "website"
        )

        if isinstance(
            manager_website,
            dict,
        ):

            website_status = {
                **default_status,
                **manager_website,
            }

        manager_twitter = manager_status.get(
            "twitter"
        )

        if isinstance(
            manager_twitter,
            dict,
        ):

            twitter_status = {
                **default_status,
                **manager_twitter,
            }

    # --------------------------------------------------------
    # TWITTER IMPLEMENTATION INFO
    # --------------------------------------------------------

    twitter_status = {
        **twitter_status,
        "available": True,
        "engine": "Scweet",
    }

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "status": "SUCCESS",
        "collectors": {
            "telegram": telegram_status,
            "website": website_status,
            "twitter": twitter_status,
        },
    }