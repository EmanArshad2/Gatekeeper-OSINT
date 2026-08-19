import asyncio
import os
import traceback
from datetime import datetime, timezone
from urllib.parse import urlparse
from dotenv import load_dotenv
from telethon.errors import FloodWaitError
from telethon.tl.types import Channel
from app.core.telegram.client import client
from app.core.telegram.collector import (
    get_keywords,
    analyze_text,
    process_media,
    save_intelligence,
    telegram_channels,
    normalize_channel_id,
)
# ============================================================
# ENVIRONMENT
# ============================================================
load_dotenv()
# ============================================================
# CONFIGURATION
# ============================================================
DISCOVERY_ENABLED = (
    os.getenv(
        "TELEGRAM_PUBLIC_OSINT_ENABLED",
        "true",
    ).strip().lower()
    in {
        "1",
        "true",
        "yes",
        "on",
    }
)
# Public Telegram channels
#
# Supported:
#
# TELEGRAM_PUBLIC_CHANNELS=binance,bitcoin,ethereum
#
# Also:
#
# TELEGRAM_PUBLIC_CHANNELS=
# https://t.me/binance,
# https://t.me/bitcoin
#
PUBLIC_CHANNELS_RAW = os.getenv(
    "TELEGRAM_PUBLIC_CHANNELS",
    "",
)
# Number of configured public channels to process
DISCOVERY_LIMIT = max(
    1,
    int(
        os.getenv(
            "TELEGRAM_PUBLIC_OSINT_LIMIT",
            "100",
        )
    ),
)
# Delay between complete discovery cycles
DISCOVERY_INTERVAL = max(
    10,
    int(
        os.getenv(
            "TELEGRAM_PUBLIC_OSINT_INTERVAL",
            "300",
        )
    ),
)
# Maximum number of recent messages to inspect
# per public channel
CHANNEL_MESSAGE_LIMIT = max(
    1,
    int(
        os.getenv(
            "TELEGRAM_PUBLIC_CHANNEL_MESSAGES",
            "200",
        )
    ),
)
# Maximum number of keywords loaded from API
DISCOVERY_KEYWORD_LIMIT = max(
    1,
    int(
        os.getenv(
            "TELEGRAM_PUBLIC_OSINT_KEYWORDS",
            "30",
        )
    ),
)
# Media processing
#
# When enabled:
#
# - Images
# - PDFs
# - QR codes
# - OCR
#
# can be processed.
#
MEDIA_ENABLED = (
    os.getenv(
        "TELEGRAM_PUBLIC_OSINT_MEDIA",
        "true",
    ).strip().lower()
    in {
        "1",
        "true",
        "yes",
        "on",
    }
)
# Only process media automatically when:
#
# 1. The message already contains matching keywords
# OR
# 2. The message contains no text
#
# This prevents unnecessary OCR on every public post.
MEDIA_EMPTY_TEXT_ENABLED = (
    os.getenv(
        "TELEGRAM_PUBLIC_OSINT_MEDIA_EMPTY_TEXT",
        "true",
    ).strip().lower()
    in {
        "1",
        "true",
        "yes",
        "on",
    }
)
# Maximum number of previously seen message keys
#
# Prevents unlimited memory growth during long-running
# discovery sessions.
SEEN_MESSAGES_LIMIT = max(
    1000,
    int(
        os.getenv(
            "TELEGRAM_PUBLIC_OSINT_SEEN_LIMIT",
            "50000",
        )
    ),
)
# Wait between messages
#
# This is intentionally small. Telegram's own FloodWait
# exceptions are handled separately.
MESSAGE_PROCESS_DELAY = max(
    0.0,
    float(
        os.getenv(
            "TELEGRAM_PUBLIC_OSINT_MESSAGE_DELAY",
            "0.15",
        )
    ),
)
# ============================================================
# STATE
# ============================================================
discovery_running = False
discovery_task = None
discovery_cycle_lock = asyncio.Lock()
discovery_stats = {
    "channels": 0,
    "scanned": 0,
    "messages": 0,
    "sources": 0,
    "intelligence": 0,
    "wallets": 0,
    "errors": 0,
    "skipped": 0,
    "media": 0,
}
# Seen Telegram messages
#
# Key:
#
#     (normalized_channel_id, message_id)
#
seen_messages = set()
# Resolved public channels
#
# Key:
#
#     normalized Telegram channel ID
#
# Value:
#
#     Telethon Channel entity
#
public_channels = {}
# ============================================================
# STATISTICS
# ============================================================
def get_discovery_stats():
    """
    Return current public Telegram discovery statistics.
    """
    return {
        "running": discovery_running,
        "channels": discovery_stats["channels"],
        "scanned": discovery_stats["scanned"],
        "messages": discovery_stats["messages"],
        "sources": discovery_stats["sources"],
        "intelligence": discovery_stats["intelligence"],
        "wallets": discovery_stats["wallets"],
        "errors": discovery_stats["errors"],
        "skipped": discovery_stats["skipped"],
        "media": discovery_stats["media"],
    }
def reset_cycle_stats():
    """
    Reset statistics for the current discovery cycle.
    """
    for key in discovery_stats:
        discovery_stats[key] = 0
# ============================================================
# SEEN MESSAGE MANAGEMENT
# ============================================================
def remember_message(
    channel_id,
    message_id,
):
    """
    Remember a processed Telegram message.
    Returns:
        True  -> newly added
        False -> already known
    """
    if channel_id is None or message_id is None:
        return False
    key = (
        int(channel_id),
        int(message_id),
    )
    if key in seen_messages:
        return False
    seen_messages.add(key)
    # --------------------------------------------------------
    # Prevent unlimited memory growth.
    #
    # A set does not preserve insertion order reliably for
    # eviction purposes, so rebuild when the limit is reached.
    # --------------------------------------------------------
    if len(seen_messages) > SEEN_MESSAGES_LIMIT:
        keep_count = SEEN_MESSAGES_LIMIT // 2
        recent_keys = list(seen_messages)[-keep_count:]
        seen_messages.clear()
        seen_messages.update(
            recent_keys
        )
    return True
def clear_seen_messages():
    """
    Clear the in-memory message cache.
    """
    seen_messages.clear()
# ============================================================
# PUBLIC USERNAME NORMALIZATION
# ============================================================
def normalize_public_username(
    value: str,
):
    """
    Normalize public Telegram channel references.
    Supported examples:
        binance
        @binance
        t.me/binance
        https://t.me/binance
        http://t.me/binance
        telegram.me/binance
        https://telegram.me/binance
    Returns:
        binance
    """
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    # --------------------------------------------------------
    # Remove whitespace
    # --------------------------------------------------------
    value = value.strip()
    # --------------------------------------------------------
    # Full URL
    # --------------------------------------------------------
    if (
        value.startswith("http://")
        or value.startswith("https://")
    ):
        try:
            parsed = urlparse(value)
            hostname = (
                parsed.netloc
                .lower()
                .replace(
                    "www.",
                    "",
                )
            )
            if hostname in {
                "t.me",
                "telegram.me",
            }:
                value = parsed.path.strip("/")
            else:
                return None
        except Exception:
            return None
    # --------------------------------------------------------
    # Telegram URL without protocol
    # --------------------------------------------------------
    value = value.replace(
        "t.me/",
        "",
    )
    value = value.replace(
        "telegram.me/",
        "",
    )
    # --------------------------------------------------------
    # Username prefix
    # --------------------------------------------------------
    value = (
        value
        .strip()
        .lstrip("@")
        .strip("/")
    )
    # --------------------------------------------------------
    # Remove query parameters / fragments
    # --------------------------------------------------------
    value = value.split(
        "?",
        1,
    )[0]
    value = value.split(
        "#",
        1,
    )[0]
    value = value.strip()
    if not value:
        return None
    # --------------------------------------------------------
    # Public Telegram usernames normally use:
    #
    # A-Z
    # a-z
    # 0-9
    # _
    #
    # Keep validation conservative.
    # --------------------------------------------------------
    if not all(
        character.isalnum()
        or character == "_"
        for character in value
    ):
        return None
    return value
# ============================================================
# CONFIGURED PUBLIC CHANNELS
# ============================================================
def get_configured_public_channels():
    """
    Read and normalize public Telegram channels from .env.
    """
    channels = []
    if not PUBLIC_CHANNELS_RAW:
        return channels
    for item in PUBLIC_CHANNELS_RAW.split(","):
        username = normalize_public_username(
            item
        )
        if not username:
            continue
        username = username.lower()
        if username in channels:
            continue
        channels.append(username)
    # --------------------------------------------------------
    # Respect configured discovery limit.
    # --------------------------------------------------------
    return channels[
        :DISCOVERY_LIMIT
    ]
# ============================================================
# TELEGRAM CHANNEL DISPLAY HELPERS
# ============================================================
def get_channel_username(
    channel,
):
    """
    Safely return channel username.
    """
    if channel is None:
        return None
    username = getattr(
        channel,
        "username",
        None,
    )
    if username:
        return str(
            username
        ).strip().lstrip("@")
    return None
def get_channel_title(
    channel,
):
    """
    Safely return channel title.
    """
    if channel is None:
        return None
    title = getattr(
        channel,
        "title",
        None,
    )
    if title:
        return str(title).strip()
    return None
def get_channel_display_name(
    channel,
):
    """
    Return a readable public channel name.
    """
    username = get_channel_username(
        channel
    )
    if username:
        return f"@{username}"
    title = get_channel_title(
        channel
    )
    return title or "Unknown Telegram Channel"
def build_message_source_url(
    channel,
    message_id,
):
    """
    Build the public Telegram message URL.
    """
    if message_id is None:
        return None
    username = get_channel_username(
        channel
    )
    if not username:
        return None
    return (
        f"https://t.me/"
        f"{username}/"
        f"{message_id}"
    )
# ============================================================
# MESSAGE ADAPTER
# ============================================================
class DiscoveryEvent:
    """
    Adapter that makes a discovered Telethon message
    compatible with the existing collector persistence
    and media-processing pipeline.
    """
    def __init__(
        self,
        message,
        chat_id,
        channel=None,
    ):
        self.message = message
        self.chat_id = chat_id
        self.channel = channel
    async def get_sender(self):
        """
        Resolve the original Telegram sender.
        """
        try:
            return await self.message.get_sender()
        except Exception as error:
            print(
                "Discovery sender lookup failed:",
                repr(error),
            )
            return None
# ============================================================
# PUBLIC CHANNEL RESOLUTION
# ============================================================
async def resolve_public_channel(
    username,
):
    """
    Resolve a public Telegram channel through Telethon.
    Only public channel entities are accepted.
    The resolved entity is also registered in the shared
    telegram_channels dictionary so that collector.py and
    discovery.py use the same channel metadata.
    """
    if not username:
        return None
    username = normalize_public_username(
        username
    )
    if not username:
        return None
    try:
        print(
            f"Resolving public Telegram source "
            f"@{username}..."
        )
        entity = await client.get_entity(
            username
        )
        # ----------------------------------------------------
        # Only Telegram channels are accepted.
        # ----------------------------------------------------
        if not isinstance(
            entity,
            Channel,
        ):
            print(
                f"PUBLIC SOURCE SKIPPED: "
                f"@{username} is "
                f"{type(entity).__name__}, "
                f"not a channel."
            )
            discovery_stats[
                "skipped"
            ] += 1
            return None
        # ----------------------------------------------------
        # Must have a public username.
        # ----------------------------------------------------
        channel_username = (
            get_channel_username(
                entity
            )
        )
        if not channel_username:
            print(
                f"PUBLIC SOURCE SKIPPED: "
                f"@{username} has no public username."
            )
            discovery_stats[
                "skipped"
            ] += 1
            return None
        # ----------------------------------------------------
        # Normalize Telegram channel ID.
        # ----------------------------------------------------
        channel_id = normalize_channel_id(
            getattr(
                entity,
                "id",
                None,
            )
        )
        if channel_id is None:
            print(
                f"PUBLIC SOURCE SKIPPED: "
                f"@{username} has invalid Telegram ID."
            )
            discovery_stats[
                "skipped"
            ] += 1
            return None
        # ----------------------------------------------------
        # Save in discovery registry.
        # ----------------------------------------------------
        public_channels[
            channel_id
        ] = entity
        # ----------------------------------------------------
        # Make available to collector.py.
        # ----------------------------------------------------
        telegram_channels[
            channel_id
        ] = entity
        print(
            "PUBLIC CHANNEL RESOLVED:"
        )
        print(
            "  Username:",
            f"@{channel_username}",
        )
        print(
            "  Title:",
            get_channel_title(
                entity
            ),
        )
        print(
            "  ID:",
            channel_id,
        )
        print(
            "  Type:",
            type(entity).__name__,
        )
        return entity
    except FloodWaitError as error:
        wait_seconds = int(
            getattr(
                error,
                "seconds",
                0,
            )
        )
        discovery_stats[
            "errors"
        ] += 1
        print(
            f"Telegram FloodWait while resolving "
            f"@{username}: "
            f"waiting {wait_seconds} seconds."
        )
        await asyncio.sleep(
            wait_seconds
        )
        return None
    except Exception as error:
        discovery_stats[
            "errors"
        ] += 1
        print(
            f"PUBLIC CHANNEL RESOLUTION ERROR "
            f"@{username}:",
            repr(error),
        )
        return None
# ============================================================
# KEYWORD MATCHING
# ============================================================
async def fast_keyword_match(
    text,
):
    """
    Perform a lightweight keyword pre-check.
    This is only used to decide whether media should be
    processed. Final keyword detection is still performed
    through the main Gatekeeper analyze_text() function.
    """
    if not text:
        return []
    try:
        keywords = await get_keywords()
    except Exception as error:
        print(
            "Discovery keyword loading error:",
            repr(error),
        )
        return []
    if not keywords:
        return []
    # --------------------------------------------------------
    # Respect keyword limit.
    # --------------------------------------------------------
    keywords = keywords[
        :DISCOVERY_KEYWORD_LIMIT
    ]
    lowered_text = str(
        text
    ).lower()
    matched = []
    for keyword in keywords:
        keyword = str(
            keyword
        ).strip().lower()
        if not keyword:
            continue
        # ----------------------------------------------------
        # Avoid substring false positives.
        #
        # Example:
        #
        # "eth" should not match "method".
        # ----------------------------------------------------
        import re
        if re.search(
            rf"(?<!\w)"
            rf"{re.escape(keyword)}"
            rf"(?!\w)",
            lowered_text,
        ):
            matched.append(
                keyword
            )
    return matched
# ============================================================
# MESSAGE MEDIA CHECK
# ============================================================
def message_has_media(
    message,
):
    """
    Safely determine whether a Telegram message contains
    downloadable media.
    """
    if message is None:
        return False
    return bool(
        getattr(
            message,
            "media",
            None,
        )
    )
# ============================================================
# DISCOVERED MESSAGE PROCESSING
# ============================================================
async def process_discovered_message(
    message,
    channel,
):
    """
    Process one discovered public Telegram message.
    Pipeline:
        Telegram message
              ↓
        text extraction
              ↓
        keyword pre-check
              ↓
        optional media download
              ↓
        OCR / QR
              ↓
        wallet detection
              ↓
        Gatekeeper analysis
              ↓
        database
    """
    try:
        if message is None:
            discovery_stats[
                "skipped"
            ] += 1
            return
        # ----------------------------------------------------
        # Message ID
        # ----------------------------------------------------
        message_id = getattr(
            message,
            "id",
            None,
        )
        if message_id is None:
            discovery_stats[
                "skipped"
            ] += 1
            return
        # ----------------------------------------------------
        # Channel ID
        # ----------------------------------------------------
        channel_id = normalize_channel_id(
            getattr(
                channel,
                "id",
                None,
            )
        )
        if channel_id is None:
            discovery_stats[
                "skipped"
            ] += 1
            return
        # ----------------------------------------------------
        # Deduplication
        # ----------------------------------------------------
        if not remember_message(
            channel_id,
            message_id,
        ):
            discovery_stats[
                "skipped"
            ] += 1
            return
        discovery_stats[
            "messages"
        ] += 1
        # ----------------------------------------------------
        # Channel metadata
        # ----------------------------------------------------
        username = get_channel_username(
            channel
        )
        title = get_channel_title(
            channel
        )
        display_name = get_channel_display_name(
            channel
        )
        source_url = build_message_source_url(
            channel,
            message_id,
        )
        # ----------------------------------------------------
        # Header
        # ----------------------------------------------------
        print(
            "\n"
            "----------------------------------------"
        )
        print(
            "PUBLIC TELEGRAM MESSAGE"
        )
        print(
            "Channel:",
            display_name,
        )
        print(
            "Channel ID:",
            channel_id,
        )
        print(
            "Message ID:",
            message_id,
        )
        print(
            "Source URL:",
            source_url,
        )
        print(
            "----------------------------------------"
        )
        # ====================================================
        # MESSAGE TEXT
        # ====================================================
        text = (
            getattr(
                message,
                "message",
                None,
            )
            or ""
        ).strip()
        if text:
            print(
                "Message:",
                text[:2000],
            )
        # ====================================================
        # FAST KEYWORD CHECK
        # ====================================================
        matched_keywords = (
            await fast_keyword_match(
                text
            )
        )
        if matched_keywords:
            print(
                "Fast keyword match:",
                matched_keywords,
            )
        # ====================================================
        # MEDIA
        # ====================================================
        media_text = ""
        has_media = message_has_media(
            message
        )
        should_process_media = (
            MEDIA_ENABLED
            and has_media
            and (
                bool(
                    matched_keywords
                )
                or (
                    not text
                    and MEDIA_EMPTY_TEXT_ENABLED
                )
            )
        )
        if should_process_media:
            discovery_stats[
                "media"
            ] += 1
            try:
                adapter = DiscoveryEvent(
                    message=message,
                    chat_id=channel_id,
                    channel=channel,
                )
                media_text = await process_media(
                    adapter
                )
                if media_text:
                    media_text = str(
                        media_text
                    ).strip()
            except FloodWaitError as error:
                wait_seconds = int(
                    getattr(
                        error,
                        "seconds",
                        0,
                    )
                )
                discovery_stats[
                    "errors"
                ] += 1
                print(
                    "Public Telegram media "
                    f"FloodWait: {wait_seconds} seconds."
                )
                await asyncio.sleep(
                    wait_seconds
                )
            except Exception as error:
                discovery_stats[
                    "errors"
                ] += 1
                print(
                    "Public Telegram media error:",
                    repr(error),
                )
        # ====================================================
        # COMBINE MESSAGE + OCR + QR
        # ====================================================
        parts = []
        if text:
            parts.append(
                text
            )
        if media_text:
            parts.append(
                media_text
            )
        combined_text = "\n".join(
            parts
        ).strip()
        # ----------------------------------------------------
        # No usable content
        # ----------------------------------------------------
        if not combined_text:
            discovery_stats[
                "skipped"
            ] += 1
            print(
                "Skipped: no text or extractable media."
            )
            return
        # ====================================================
        # FINAL GATEKEEPER ANALYSIS
        # ====================================================
        try:
            (
                detected_keywords,
                wallets,
            ) = await analyze_text(
                combined_text
            )
        except Exception as error:
            discovery_stats[
                "errors"
            ] += 1
            print(
                "Gatekeeper text analysis error:",
                repr(error),
            )
            return
        wallets = wallets or []
        detected_keywords = (
            detected_keywords
            or []
        )
        # ----------------------------------------------------
        # Preserve fast keyword matches if final analysis
        # didn't return them.
        # ----------------------------------------------------
        final_keywords = []
        for keyword in (
            detected_keywords
            + matched_keywords
        ):
            keyword = str(
                keyword
            ).strip().lower()
            if (
                keyword
                and keyword not in final_keywords
            ):
                final_keywords.append(
                    keyword
                )
        # ====================================================
        # INTELLIGENCE FILTER
        # ====================================================
        if (
            not final_keywords
            and not wallets
        ):
            discovery_stats[
                "skipped"
            ] += 1
            print(
                "No Gatekeeper intelligence detected."
            )
            return
        # ====================================================
        # STATISTICS
        # ====================================================
        discovery_stats[
            "intelligence"
        ] += 1
        discovery_stats[
            "wallets"
        ] += len(
            wallets
        )
        discovery_stats[
            "sources"
        ] += 1
        # ====================================================
        # INTELLIGENCE REPORT
        # ====================================================
        print(
            "\n"
            "========== PUBLIC TELEGRAM HIT =========="
        )
        print(
            "Channel:",
            display_name,
        )
        print(
            "Channel ID:",
            channel_id,
        )
        print(
            "Channel Title:",
            title,
        )
        print(
            "Message ID:",
            message_id,
        )
        print(
            "Source URL:",
            source_url,
        )
        print(
            "Matched Keywords:",
            final_keywords,
        )
        print(
            "Detected Wallets:",
            wallets,
        )
        # ====================================================
        # SAVE
        # ====================================================
        adapter = DiscoveryEvent(
            message=message,
            chat_id=channel_id,
            channel=channel,
        )
        try:
            await save_intelligence(
                adapter,
                combined_text,
                final_keywords,
                wallets,
            )
        except Exception as error:
            discovery_stats[
                "errors"
            ] += 1
            print(
                "Public Telegram database save error:",
                repr(error),
            )
            traceback.print_exc()
            return
        print(
            "PUBLIC TELEGRAM INTELLIGENCE SAVED"
        )
        print(
            "=========================================="
        )
        # ----------------------------------------------------
        # Small delay between messages.
        # ----------------------------------------------------
        if MESSAGE_PROCESS_DELAY > 0:
            await asyncio.sleep(
                MESSAGE_PROCESS_DELAY
            )
    except FloodWaitError as error:
        wait_seconds = int(
            getattr(
                error,
                "seconds",
                0,
            )
        )
        discovery_stats[
            "errors"
        ] += 1
        print(
            "Telegram FloodWait while "
            f"processing message: "
            f"{wait_seconds} seconds."
        )
        await asyncio.sleep(
            wait_seconds
        )
    except Exception as error:
        discovery_stats[
            "errors"
        ] += 1
        print(
            "Discovered message processing error:",
            repr(error),
        )
        traceback.print_exc()
# ============================================================
# PUBLIC CHANNEL SCANNING
# ============================================================
async def scan_public_channel(
    channel,
):
    """
    Scan recent history from one public Telegram channel.
    IMPORTANT:
    This intentionally uses:
        client.iter_messages()
    instead of the unsupported/global:
        channels.searchPosts
    Telegram public OSINT therefore works against explicitly
    configured public channels.
    """
    if channel is None:
        return
    username = get_channel_username(
        channel
    )
    title = get_channel_title(
        channel
    )
    display_name = get_channel_display_name(
        channel
    )
    print(
        "\n"
        "=========================================="
    )
    print(
        "SCANNING PUBLIC TELEGRAM CHANNEL"
    )
    print(
        "Channel:",
        display_name,
    )
    print(
        "Message limit:",
        CHANNEL_MESSAGE_LIMIT,
    )
    print(
        "=========================================="
    )
    channel_scanned = 0
    try:
        async for message in client.iter_messages(
            channel,
            limit=CHANNEL_MESSAGE_LIMIT,
            wait_time=1,
        ):
            channel_scanned += 1
            discovery_stats[
                "scanned"
            ] += 1
            await process_discovered_message(
                message,
                channel,
            )
        print(
            "\nFinished:",
            display_name,
        )
        print(
            "Scanned:",
            channel_scanned,
        )
    except FloodWaitError as error:
        wait_seconds = int(
            getattr(
                error,
                "seconds",
                0,
            )
        )
        discovery_stats[
            "errors"
        ] += 1
        print(
            f"FloodWait while scanning "
            f"{display_name}: "
            f"{wait_seconds} seconds."
        )
        await asyncio.sleep(
            wait_seconds
        )
    except Exception as error:
        discovery_stats[
            "errors"
        ] += 1
        print(
            f"Public channel scan error "
            f"{display_name}:",
            repr(error),
        )
        traceback.print_exc()
# ============================================================
# PUBLIC TELEGRAM SYNCHRONIZATION
# ============================================================
async def search_public_telegram():
    """
    Perform one complete public Telegram OSINT cycle.
    Pipeline:
        .env public channels
                ↓
        resolve public channels
                ↓
        iterate recent history
                ↓
        keyword pre-check
                ↓
        optional OCR / QR
                ↓
        wallet extraction
                ↓
        Gatekeeper analysis
                ↓
        TelegramMessage
                ↓
        Wallet
                ↓
        frontend APIs
    """
    if not DISCOVERY_ENABLED:
        print(
            "Public Telegram OSINT discovery disabled."
        )
        return
    # --------------------------------------------------------
    # Prevent two manual/automatic cycles from running
    # simultaneously.
    # --------------------------------------------------------
    if discovery_cycle_lock.locked():
        print(
            "Public Telegram discovery cycle "
            "already running. Skipping."
        )
        return
    async with discovery_cycle_lock:
        configured_channels = (
            get_configured_public_channels()
        )
        if not configured_channels:
            print(
                "\n"
                "=========================================="
            )
            print(
                "NO PUBLIC TELEGRAM CHANNELS CONFIGURED"
            )
            print(
                "Set TELEGRAM_PUBLIC_CHANNELS in .env"
            )
            print(
                "Example:"
            )
            print(
                "TELEGRAM_PUBLIC_CHANNELS="
                "binance,bitcoin,ethereum"
            )
            print(
                "=========================================="
            )
            return
        reset_cycle_stats()
        print(
            "\n"
            "=========================================="
        )
        print(
            "PUBLIC TELEGRAM OSINT SYNC"
        )
        print(
            "Configured public channels:",
            len(
                configured_channels
            ),
        )
        print(
            "Message limit per channel:",
            CHANNEL_MESSAGE_LIMIT,
        )
        print(
            "Media processing:",
            MEDIA_ENABLED,
        )
        print(
            "=========================================="
        )
        # ====================================================
        # RESOLVE CHANNELS
        # ====================================================
        resolved_channels = []
        for username in configured_channels:
            try:
                channel = (
                    await resolve_public_channel(
                        username
                    )
                )
                if channel is None:
                    continue
                # ------------------------------------------------
                # Avoid resolving same channel twice.
                # ------------------------------------------------
                channel_id = normalize_channel_id(
                    getattr(
                        channel,
                        "id",
                        None,
                    )
                )
                if channel_id is None:
                    continue
                if any(
                    normalize_channel_id(
                        getattr(
                            existing,
                            "id",
                            None,
                        )
                    )
                    == channel_id
                    for existing
                    in resolved_channels
                ):
                    continue
                resolved_channels.append(
                    channel
                )
            except Exception as error:
                discovery_stats[
                    "errors"
                ] += 1
                print(
                    f"Channel resolution failed "
                    f"@{username}:",
                    repr(error),
                )
        discovery_stats[
            "channels"
        ] = len(
            resolved_channels
        )
        print(
            "\nResolved public channels:",
            len(
                resolved_channels
            ),
        )
        # ====================================================
        # SCAN HISTORY
        # ====================================================
        for channel in resolved_channels:
            if not discovery_running:
                # ------------------------------------------------
                # If called manually while discovery_running is
                # false, still allow the complete cycle.
                #
                # The check is mainly relevant to cancellation
                # during the continuous loop.
                # ------------------------------------------------
                current_task = asyncio.current_task()
                if (
                    discovery_task is not None
                    and current_task
                    is discovery_task
                ):
                    break
            await scan_public_channel(
                channel
            )
        # ====================================================
        # COMPLETE
        # ====================================================
        print(
            "\n"
            "=========================================="
        )
        print(
            "PUBLIC TELEGRAM SYNC COMPLETE"
        )
        print(
            "Channels:",
            discovery_stats[
                "channels"
            ],
        )
        print(
            "Scanned:",
            discovery_stats[
                "scanned"
            ],
        )
        print(
            "Messages:",
            discovery_stats[
                "messages"
            ],
        )
        print(
            "Public Sources:",
            discovery_stats[
                "sources"
            ],
        )
        print(
            "Intelligence:",
            discovery_stats[
                "intelligence"
            ],
        )
        print(
            "Wallets:",
            discovery_stats[
                "wallets"
            ],
        )
        print(
            "Media:",
            discovery_stats[
                "media"
            ],
        )
        print(
            "Skipped:",
            discovery_stats[
                "skipped"
            ],
        )
        print(
            "Errors:",
            discovery_stats[
                "errors"
            ],
        )
        print(
            "=========================================="
        )
# ============================================================
# CONTINUOUS DISCOVERY LOOP
# ============================================================
async def discovery_loop():
    """
    Continuously run public Telegram discovery cycles.
    """
    global discovery_running
    discovery_running = True
    print(
        "\n"
        "=========================================="
    )
    print(
        "PUBLIC TELEGRAM OSINT DISCOVERY STARTED"
    )
    print(
        "Interval:",
        DISCOVERY_INTERVAL,
        "seconds",
    )
    print(
        "=========================================="
    )
    try:
        while discovery_running:
            try:
                await search_public_telegram()
            except asyncio.CancelledError:
                raise
            except Exception as error:
                discovery_stats[
                    "errors"
                ] += 1
                print(
                    "Public Telegram sync error:",
                    repr(error),
                )
                traceback.print_exc()
            # ------------------------------------------------
            # Stop requested while cycle was running.
            # ------------------------------------------------
            if not discovery_running:
                break
            print(
                "\nNext public Telegram discovery "
                f"in {DISCOVERY_INTERVAL} seconds."
            )
            try:
                await asyncio.sleep(
                    DISCOVERY_INTERVAL
                )
            except asyncio.CancelledError:
                raise
    except asyncio.CancelledError:
        print(
            "Public Telegram discovery cancelled."
        )
    except Exception as error:
        discovery_stats[
            "errors"
        ] += 1
        print(
            "Discovery loop error:",
            repr(error),
        )
        traceback.print_exc()
    finally:
        discovery_running = False
        print(
            "Public Telegram discovery stopped."
        )
# ============================================================
# START DISCOVERY
# ============================================================
async def start_discovery():
    """
    Start the background public Telegram discovery task.
    """
    global discovery_task
    global discovery_running
    if not DISCOVERY_ENABLED:
        print(
            "Public Telegram OSINT discovery disabled."
        )
        return
    if discovery_running:
        print(
            "Public Telegram OSINT discovery "
            "already running."
        )
        return
    # --------------------------------------------------------
    # Remove completed task reference.
    # --------------------------------------------------------
    if (
        discovery_task is not None
        and discovery_task.done()
    ):
        discovery_task = None
    # --------------------------------------------------------
    # If a task is still alive, don't create another one.
    # --------------------------------------------------------
    if (
        discovery_task is not None
        and not discovery_task.done()
    ):
        print(
            "Public Telegram discovery task "
            "already exists."
        )
        return
    # --------------------------------------------------------
    # Make sure the Telegram client is connected.
    # --------------------------------------------------------
    try:
        if not client.is_connected():
            await client.start()
        if not client.is_connected():
            print(
                "Telegram client is not connected. "
                "Public discovery was not started."
            )
            return
    except Exception as error:
        discovery_stats[
            "errors"
        ] += 1
        print(
            "Telegram client connection error:",
            repr(error),
        )
        traceback.print_exc()
        return
    # --------------------------------------------------------
    # Verify authorization.
    # --------------------------------------------------------
    try:
        authorized = (
            await client.is_user_authorized()
        )
        print(
            "Telegram authorized:",
            authorized,
        )
        if not authorized:
            print(
                "Telegram session is not authorized."
            )
            print(
                "Run the Telegram authorization "
                "process first."
            )
            return
    except Exception as error:
        discovery_stats[
            "errors"
        ] += 1
        print(
            "Telegram authorization check failed:",
            repr(error),
        )
        traceback.print_exc()
        return
    # --------------------------------------------------------
    # Create background task.
    # --------------------------------------------------------
    discovery_task = asyncio.create_task(
        discovery_loop(),
        name="gatekeeper_telegram_discovery",
    )
    print(
        "Public Telegram OSINT discovery task created."
    )
# ============================================================
# STOP DISCOVERY
# ============================================================
async def stop_discovery():
    """
    Stop the public Telegram discovery task.
    The shared Telethon client is intentionally NOT
    disconnected because collector.py uses the same client.
    """
    global discovery_running
    global discovery_task
    discovery_running = False
    print(
        "Stopping public Telegram OSINT discovery..."
    )
    task = discovery_task
    discovery_task = None
    if task is not None:
        if (
            not task.done()
            and task
            is not asyncio.current_task()
        ):
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            except Exception as error:
                discovery_stats[
                    "errors"
                ] += 1
                print(
                    "Discovery shutdown error:",
                    repr(error),
                )
    print(
        "Public Telegram OSINT discovery stopped."
    )
# ============================================================
# MANUAL SINGLE-CYCLE HELPER
# ============================================================
async def run_discovery_once():
    """
    Run exactly one public Telegram discovery cycle.
    Useful for:
        - FastAPI endpoint
        - manual admin action
        - testing
        - frontend sync button
    It does NOT create a permanent background loop.
    """
    if not DISCOVERY_ENABLED:
        print(
            "Public Telegram OSINT discovery disabled."
        )
        return get_discovery_stats()
    try:
        await search_public_telegram()
    except Exception as error:
        discovery_stats[
            "errors"
        ] += 1
        print(
            "Manual public Telegram discovery error:",
            repr(error),
        )
        traceback.print_exc()
    return get_discovery_stats()
# ============================================================
# PUBLIC CHANNEL REGISTRY
# ============================================================
def get_public_channels():
    """
    Return currently resolved public Telegram channels.
    This returns lightweight metadata instead of raw Telethon
    entities so it can safely be exposed through an API.
    """
    results = []
    for channel_id, channel in public_channels.items():
        username = get_channel_username(
            channel
        )
        title = get_channel_title(
            channel
        )
        results.append(
            {
                "id": channel_id,
                "username": username,
                "title": title,
                "source_url": (
                    f"https://t.me/{username}"
                    if username
                    else None
                ),
            }
        )
    return results