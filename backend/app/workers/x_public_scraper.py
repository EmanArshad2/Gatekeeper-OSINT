import asyncio
import logging
import os
from datetime import datetime
from typing import Any
import httpx
from dotenv import load_dotenv
from Scweet import Scweet
from app.collectors.manager import collector_manager
from app.core.text.normalizer import repair_mojibake
# ============================================================
# CONFIGURATION
# ============================================================
load_dotenv()
logger = logging.getLogger("gatekeeper-x-public")
QUEUE_URL = "http://127.0.0.1:8000/api/tweets/queue"
SEARCH_CONFIG_URL = "http://127.0.0.1:8000/api/tweets/search-config"
DEFAULT_SEARCH_TERMS = [
    "btc wallet",
    "crypto wallet",
    "usdt address",
    "seed phrase",
    "private key",
]
DEFAULT_TWEETS_PER_SEARCH = 20
DEFAULT_DISPLAY_TYPE = "Latest"
# Delay between individual keyword searches.
SEARCH_DELAY = 10
# Delay between complete collection cycles.
CYCLE_DELAY = 300
# HTTP timeouts.
CONFIG_TIMEOUT = 10
QUEUE_TIMEOUT = 15
# ============================================================
# RUNTIME STATE
# ============================================================
# Tweets successfully submitted to Gatekeeper during this
# worker lifetime.
processed_tweets: set[str] = set()
# ============================================================
# AUTHENTICATION
# ============================================================
X_AUTH_TOKEN = os.getenv("X_AUTH_TOKEN")
if not X_AUTH_TOKEN:
    raise RuntimeError(
        "X_AUTH_TOKEN is not set. "
        "Add X_AUTH_TOKEN=<your_auth_token> to backend/.env"
    )
# ============================================================
# SCWEET CLIENT
# ============================================================
scraper = Scweet(
    auth_token=X_AUTH_TOKEN,
    manifest_scrape_on_init=True,
)
# ============================================================
# DEFAULT SEARCH CONFIG
# ============================================================
def get_default_search_config() -> dict[str, Any]:
    """
    Return a fresh copy of the default X search configuration.
    """
    return {
        "keywords": DEFAULT_SEARCH_TERMS.copy(),
        "since": None,
        "until": None,
        "limit": DEFAULT_TWEETS_PER_SEARCH,
        "display_type": DEFAULT_DISPLAY_TYPE,
    }
# ============================================================
# CLEAN KEYWORDS
# ============================================================
def clean_keywords(keywords) -> list[str]:
    """
    Clean, normalize and deduplicate search keywords.
    """
    if not isinstance(keywords, list):
        return DEFAULT_SEARCH_TERMS.copy()
    cleaned = []
    seen = set()
    for keyword in keywords:
        keyword = str(keyword).strip()
        if not keyword:
            continue
        normalized = keyword.casefold()
        if normalized in seen:
            continue
        seen.add(normalized)
        cleaned.append(keyword)
    if not cleaned:
        return DEFAULT_SEARCH_TERMS.copy()
    return cleaned
# ============================================================
# VALIDATE DATE
# ============================================================
def validate_date(
    value,
    field_name: str,
):
    """
    Validate YYYY-MM-DD date values.
    """
    if not value:
        return None
    value = str(value).strip()
    try:
        datetime.strptime(
            value,
            "%Y-%m-%d",
        )
        return value
    except ValueError:
        logger.warning(
            "Invalid %s date '%s'. Ignoring.",
            field_name,
            value,
        )
        return None
# ============================================================
# REPAIR X TEXT ENCODING
# ============================================================
def normalize_x_text(
    text: Any,
) -> tuple[str, str]:
    """
    Return:
        raw_text
        normalized_text
    The raw text is preserved exactly as received from Scweet.
    The normalized text is passed through the Gatekeeper
    mojibake repair function.
    Examples of corruption this is intended to repair:
        sÃ©nateur      -> sénateur
        rÃ©ception     -> réception
        dÃ©montre      -> démontre
        liÃ©s          -> liés
        numÃ©riques    -> numériques
    """
    if text is None:
        return "", ""
    raw_text = str(text)
    try:
        normalized_text = repair_mojibake(
            raw_text
        )
        if normalized_text is None:
            normalized_text = raw_text
        normalized_text = str(
            normalized_text
        )
    except Exception as error:
        logger.warning(
            "Mojibake repair failed: %s",
            error,
        )
        normalized_text = raw_text
    return (
        raw_text,
        normalized_text,
    )
# ============================================================
# GET SEARCH CONFIGURATION
# ============================================================
async def get_search_config() -> dict[str, Any]:
    """
    Load the latest X search configuration from FastAPI.
    The frontend updates:
        /api/tweets/search-config
    The worker reads that configuration before every
    collection cycle.
    """
    default_config = get_default_search_config()
    try:
        async with httpx.AsyncClient(
            timeout=CONFIG_TIMEOUT
        ) as client:
            response = await client.get(
                SEARCH_CONFIG_URL,
                headers={
                    "Accept": "application/json",
                },
            )
        if response.status_code != 200:
            logger.warning(
                "Search config API returned HTTP %s. "
                "Using defaults.",
                response.status_code,
            )
            return default_config
        data = response.json()
        if not isinstance(data, dict):
            logger.warning(
                "Search config response is not a JSON object. "
                "Using defaults."
            )
            return default_config
        config = data.get("config")
        if not isinstance(config, dict):
            logger.warning(
                "Search config payload is missing 'config'. "
                "Using defaults."
            )
            return default_config
        # ----------------------------------------------------
        # KEYWORDS
        # ----------------------------------------------------
        keywords = clean_keywords(
            config.get("keywords")
        )
        # ----------------------------------------------------
        # DATE RANGE
        # ----------------------------------------------------
        since = validate_date(
            config.get("since"),
            "since",
        )
        until = validate_date(
            config.get("until"),
            "until",
        )
        if since and until:
            since_date = datetime.strptime(
                since,
                "%Y-%m-%d",
            ).date()
            until_date = datetime.strptime(
                until,
                "%Y-%m-%d",
            ).date()
            if since_date > until_date:
                logger.warning(
                    "Invalid search date range: %s -> %s. "
                    "Ignoring date filters.",
                    since,
                    until,
                )
                since = None
                until = None
        # ----------------------------------------------------
        # LIMIT
        # ----------------------------------------------------
        try:
            limit = int(
                config.get(
                    "limit",
                    DEFAULT_TWEETS_PER_SEARCH,
                )
            )
        except (
            TypeError,
            ValueError,
        ):
            limit = DEFAULT_TWEETS_PER_SEARCH
        limit = max(
            1,
            min(
                limit,
                100,
            ),
        )
        # ----------------------------------------------------
        # DISPLAY TYPE
        # ----------------------------------------------------
        display_type = str(
            config.get(
                "display_type",
                DEFAULT_DISPLAY_TYPE,
            )
        ).strip()
        allowed_display_types = {
            "latest": "Latest",
            "top": "Top",
            "people": "People",
            "media": "Media",
        }
        display_type = allowed_display_types.get(
            display_type.casefold(),
            DEFAULT_DISPLAY_TYPE,
        )
        # ----------------------------------------------------
        # FINAL CONFIG
        # ----------------------------------------------------
        final_config = {
            "keywords": keywords,
            "since": since,
            "until": until,
            "limit": limit,
            "display_type": display_type,
        }
        return final_config
    except httpx.RequestError as error:
        logger.warning(
            "Could not connect to search config API: %s",
            error,
        )
        return default_config
    except Exception as error:
        logger.warning(
            "Could not load X search configuration: %s",
            error,
        )
        return default_config
# ============================================================
# EXTRACT MEDIA URL
# ============================================================
def extract_media_url(
    tweet: dict,
):
    """
    Extract the first media URL returned by Scweet.
    Supports the common Scweet image_links structure.
    """
    try:
        media = tweet.get("media") or {}
        if not isinstance(media, dict):
            return None
        image_links = (
            media.get("image_links")
            or []
        )
        if (
            isinstance(image_links, list)
            and image_links
        ):
            return str(
                image_links[0]
            )
        # Some Scweet versions / structures may expose
        # generic media links.
        media_links = (
            media.get("media_links")
            or []
        )
        if (
            isinstance(media_links, list)
            and media_links
        ):
            return str(
                media_links[0]
            )
    except Exception as error:
        logger.debug(
            "Could not extract media URL: %s",
            error,
        )
    return None
# ============================================================
# NORMALIZE TWEET
# ============================================================
def normalize_tweet(
    tweet: dict,
):
    """
    Convert Scweet's tweet object into the Gatekeeper
    queue format.
    IMPORTANT:
    raw_text:
        Original text returned by Scweet.
    normalized_text:
        UTF-8/mojibake-repaired version.
    text:
        Normalized version sent as the primary tweet text
        to the Gatekeeper backend.
    """
    if not isinstance(tweet, dict):
        return None
    # --------------------------------------------------------
    # TWEET ID
    # --------------------------------------------------------
    tweet_id = (
        tweet.get("tweet_id")
        or tweet.get("id")
        or tweet.get("id_str")
    )
    if not tweet_id:
        return None
    tweet_id = str(
        tweet_id
    ).strip()
    if not tweet_id:
        return None
    # --------------------------------------------------------
    # AUTHOR
    # --------------------------------------------------------
    user = tweet.get("user") or {}
    if not isinstance(user, dict):
        user = {}
    author = (
        user.get("screen_name")
        or user.get("username")
        or user.get("name")
        or tweet.get("author")
        or "unknown"
    )
    author = str(
        author
    ).strip()
    if not author:
        author = "unknown"
    # --------------------------------------------------------
    # TEXT
    # --------------------------------------------------------
    raw_text_source = (
        tweet.get("text")
        or tweet.get("full_text")
        or tweet.get("content")
        or ""
    )
    raw_text, normalized_text = (
        normalize_x_text(
            raw_text_source
        )
    )
    # Keep payload reasonable.
    raw_text = raw_text[:8000]
    normalized_text = normalized_text[:8000]
    # --------------------------------------------------------
    # URL
    # --------------------------------------------------------
    tweet_url = (
        tweet.get("tweet_url")
        or tweet.get("url")
        or f"https://x.com/i/status/{tweet_id}"
    )
    tweet_url = str(
        tweet_url
    ).strip()
    # --------------------------------------------------------
    # MEDIA
    # --------------------------------------------------------
    media_url = extract_media_url(
        tweet
    )
    # --------------------------------------------------------
    # PAYLOAD
    # --------------------------------------------------------
    return {
        "tweet_id": tweet_id,
        "author": author,
        # Primary text used by Gatekeeper.
        "text": normalized_text,
        # Explicitly preserved source text.
        "raw_text": raw_text,
        # Explicit normalized representation.
        "normalized_text": normalized_text,
        "media_url": media_url,
        "tweet_url": tweet_url,
        "platform": "X/Twitter",
    }
# ============================================================
# SEND TWEET TO GATEKEEPER QUEUE
# ============================================================
async def send_to_queue(
    payload: dict,
) -> bool:
    """
    Send a normalized tweet to the Gatekeeper backend.
    The tweet is added to processed_tweets only after
    the backend successfully accepts it.
    """
    tweet_id = payload.get(
        "tweet_id"
    )
    if not tweet_id:
        return False
    # --------------------------------------------------------
    # LOCAL DUPLICATE PROTECTION
    # --------------------------------------------------------
    if tweet_id in processed_tweets:
        logger.debug(
            "Tweet %s already processed locally.",
            tweet_id,
        )
        return False
    try:
        async with httpx.AsyncClient(
            timeout=QUEUE_TIMEOUT
        ) as client:
            response = await client.post(
                QUEUE_URL,
                json=payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json; charset=utf-8",
                },
            )
        # ----------------------------------------------------
        # ACCEPTED / SUCCESS
        # ----------------------------------------------------
        if response.status_code in {
            200,
            201,
        }:
            processed_tweets.add(
                tweet_id
            )
            collector_manager.increment(
                "twitter",
                "processed",
            )
            try:
                result = response.json()
                wallet_count = int(
                    result.get(
                        "wallet_count",
                        0,
                    )
                    or 0
                )
                if wallet_count > 0:
                    collector_manager.increment(
                        "twitter",
                        "wallets",
                        wallet_count,
                    )
                    logger.info(
                        "Tweet %s -> %s wallet(s) detected.",
                        tweet_id,
                        wallet_count,
                    )
            except Exception as error:
                logger.debug(
                    "Could not parse queue response for %s: %s",
                    tweet_id,
                    error,
                )
            logger.info(
                "Tweet %s successfully queued.",
                tweet_id,
            )
            return True
        # ----------------------------------------------------
        # DUPLICATE / ALREADY EXISTS
        # ----------------------------------------------------
        if response.status_code == 409:
            processed_tweets.add(
                tweet_id
            )
            logger.debug(
                "Tweet %s already exists in Gatekeeper.",
                tweet_id,
            )
            return True
        # ----------------------------------------------------
        # OTHER HTTP ERROR
        # ----------------------------------------------------
        logger.warning(
            "Queue returned HTTP %s for tweet %s.",
            response.status_code,
            tweet_id,
        )
        try:
            body = response.text[:1000]
            logger.debug(
                "Queue response for %s: %s",
                tweet_id,
                body,
            )
        except Exception:
            pass
        collector_manager.increment(
            "twitter",
            "errors",
        )
        return False
    except httpx.RequestError as error:
        logger.warning(
            "Queue connection error for tweet %s: %s",
            tweet_id,
            error,
        )
        collector_manager.increment(
            "twitter",
            "errors",
        )
        return False
    except Exception as error:
        logger.warning(
            "Queue error for tweet %s: %s",
            tweet_id,
            error,
        )
        collector_manager.increment(
            "twitter",
            "errors",
        )
        return False
# ============================================================
# SCRAPE ONE KEYWORD
# ============================================================
async def scrape_keyword(
    keyword: str,
    config: dict,
) -> int:
    logger.info(
        "--------------------------------------------------"
    )
    logger.info(
        "X SEARCH | %s",
        keyword,
    )
    logger.info(
        "Range: %s -> %s",
        config["since"] or "ANY",
        config["until"] or "ANY",
    )
    logger.info(
        "Limit: %s | Type: %s",
        config["limit"],
        config["display_type"],
    )
    # --------------------------------------------------------
    # Scweet parameters
    # --------------------------------------------------------
    search_kwargs = {
        "limit": config["limit"],
        "display_type": config["display_type"],
        "resume": False,
        "save": False,
    }
    if config["since"]:
        search_kwargs["since"] = config["since"]
    if config["until"]:
        search_kwargs["until"] = config["until"]
    # --------------------------------------------------------
    # Run Scweet in a thread because its search method is
    # synchronous.
    # --------------------------------------------------------
    try:
        tweets = await asyncio.to_thread(
            scraper.search,
            keyword,
            **search_kwargs,
        )
    except Exception as error:
        logger.warning(
            "Scweet search failed for '%s': %s",
            keyword,
            error,
        )
        collector_manager.increment(
            "twitter",
            "errors",
        )
        return 0
    if not tweets:
        logger.info(
            "No results returned for '%s'.",
            keyword,
        )
        return 0
    logger.info(
        "Scweet returned %s result(s) for '%s'.",
        len(tweets),
        keyword,
    )
    queued_count = 0
    # --------------------------------------------------------
    # Process tweets
    # --------------------------------------------------------
    for tweet in tweets:
        try:
            payload = normalize_tweet(
                tweet
            )
            if not payload:
                continue
            tweet_id = payload[
                "tweet_id"
            ]
            if tweet_id in processed_tweets:
                continue
            # Log encoding repairs so we can verify the fix.
            raw_text = payload.get(
                "raw_text",
                "",
            )
            normalized_text = payload.get(
                "normalized_text",
                "",
            )
            if (
                raw_text
                and normalized_text
                and raw_text != normalized_text
            ):
                logger.info(
                    "UTF-8 repair applied to tweet %s.",
                    tweet_id,
                )
            success = await send_to_queue(
                payload
            )
            if success:
                queued_count += 1
        except Exception as error:
            logger.warning(
                "Tweet processing failed: %s",
                error,
            )
            collector_manager.increment(
                "twitter",
                "errors",
            )
    logger.info(
        "Search complete | keyword='%s' | queued=%s",
        keyword,
        queued_count,
    )
    return queued_count
# ============================================================
# RUN ONE COLLECTION CYCLE
# ============================================================
async def run_collection_cycle() -> int:
    """
    Execute one complete X collection cycle using the
    latest API configuration.
    """
    config = await get_search_config()
    logger.info(
        "=================================================="
    )
    logger.info(
        "ACTIVE X SEARCH CONFIGURATION"
    )
    logger.info(
        "Keywords: %s",
        config["keywords"],
    )
    logger.info(
        "Since: %s",
        config["since"] or "ANY",
    )
    logger.info(
        "Until: %s",
        config["until"] or "ANY",
    )
    logger.info(
        "Limit: %s",
        config["limit"],
    )
    logger.info(
        "Display type: %s",
        config["display_type"],
    )
    logger.info(
        "=================================================="
    )
    total_queued = 0
    # --------------------------------------------------------
    # Search each configured keyword
    # --------------------------------------------------------
    for index, keyword in enumerate(
        config["keywords"],
        start=1,
    ):
        logger.info(
            "SEARCH %s/%s | %s",
            index,
            len(config["keywords"]),
            keyword,
        )
        try:
            queued = await scrape_keyword(
                keyword,
                config,
            )
            total_queued += queued
        except Exception as error:
            logger.warning(
                "Keyword '%s' failed: %s",
                keyword,
                error,
            )
            collector_manager.increment(
                "twitter",
                "errors",
            )
        # Don't wait after the final keyword.
        if index < len(
            config["keywords"]
        ):
            await asyncio.sleep(
                SEARCH_DELAY
            )
    logger.info(
        "X collection cycle completed | "
        "queued=%s | known=%s",
        total_queued,
        len(processed_tweets),
    )
    return total_queued
# ============================================================
# MAIN SCRAPER
# ============================================================
async def run_scraper():
    logger.info(
        "=================================================="
    )
    logger.info(
        "STARTING GATEKEEPER X / TWITTER COLLECTOR"
    )
    logger.info(
        "Scweet authentication loaded."
    )
    logger.info(
        "Configuration endpoint: %s",
        SEARCH_CONFIG_URL,
    )
    logger.info(
        "Queue endpoint: %s",
        QUEUE_URL,
    )
    logger.info(
        "UTF-8/mojibake repair: ENABLED"
    )
    logger.info(
        "Raw + normalized tweet text: ENABLED"
    )
    logger.info(
        "=================================================="
    )
    # --------------------------------------------------------
    # Mark collector active
    # --------------------------------------------------------
    try:
        collector_manager.set_running(
            "twitter",
            True,
        )
    except Exception as error:
        logger.debug(
            "Could not set twitter collector active: %s",
            error,
        )
    try:
        while True:
            try:
                await run_collection_cycle()
            except Exception as error:
                logger.exception(
                    "X collection cycle failed: %s",
                    error,
                )
                collector_manager.increment(
                    "twitter",
                    "errors",
                )
            logger.info(
                "Waiting %s seconds before next X collection cycle...",
                CYCLE_DELAY,
            )
            await asyncio.sleep(
                CYCLE_DELAY
            )
    except asyncio.CancelledError:
        logger.info(
            "X/Twitter collector cancellation received."
        )
        raise
    finally:
        try:
            collector_manager.set_running(
                "twitter",
                False,
            )
        except Exception as error:
            logger.debug(
                "Could not set twitter collector inactive: %s",
                error,
            )
        logger.info(
            "X/Twitter collector stopped."
        )
# ============================================================
# COLLECTOR INTERFACE
# ============================================================
start_collector = run_scraper
async def stop_collector():
    """
    Collector manager compatibility interface.
    The actual async worker is cancelled by the collector
    manager/process lifecycle.
    """
    logger.info(
        "X/Twitter stop requested."
    )
    return True
# ============================================================
# DIRECT EXECUTION
# ============================================================
if __name__ == "__main__":
    try:
        asyncio.run(
            run_scraper()
        )
    except KeyboardInterrupt:
        logger.info(
            "X/Twitter collector interrupted by user."
        )