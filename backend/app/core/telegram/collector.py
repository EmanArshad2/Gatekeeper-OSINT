import asyncio
import os
import re
import traceback
from pathlib import Path
import cv2
import httpx
import numpy as np
from dotenv import load_dotenv
from pdf2image import convert_from_path
from sqlalchemy.orm.attributes import flag_modified
from telethon import events
from app.core.ocr.engine import ocr_engine
from app.core.qr.scanner import qr_scanner
from app.core.telegram.client import client
from app.database.connection import SessionLocal
from app.database.models import TelegramMessage, Wallet
# =====================================================
# Environment
# =====================================================
load_dotenv()
# =====================================================
# Telegram Collector Configuration
# =====================================================
MEDIA_DIR = Path(
    os.getenv(
        "TELEGRAM_MEDIA_DIR",
        "telegram_media",
    )
)
MEDIA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)
KEYWORDS_API_URL = os.getenv(
    "KEYWORDS_API_URL",
    "http://127.0.0.1:8000/api/keywords",
)
# =====================================================
# Telegram Channels
# =====================================================
TELEGRAM_CHANNELS = [
    channel.strip().lstrip("@")
    for channel in os.getenv(
        "TELEGRAM_CHANNELS",
        "",
    ).split(",")
    if channel.strip()
]
# =====================================================
# Wallet Detection Patterns
# =====================================================
WALLET_PATTERNS = {
    # Ethereum / EVM
    "ethereum": r"\b0x[a-fA-F0-9]{40}\b",
    # Bitcoin Legacy + SegWit
    "bitcoin": (
        r"\b(?:"
        r"bc1[a-zA-HJ-NP-Z0-9]{25,87}"
        r"|"
        r"[13][a-km-zA-HJ-NP-Z1-9]{25,59}"
        r")\b"
    ),
    # TRON
    "tron": r"\bT[a-zA-Z0-9]{33}\b",
    # Solana
    "solana": (
        r"\b[1-9A-HJ-NP-Za-km-z]"
        r"{32,44}\b"
    ),
    # Litecoin
    "litecoin": (
        r"\b(?:"
        r"L[a-km-zA-HJ-NP-Z1-9]{26,33}"
        r"|"
        r"M[a-km-zA-HJ-NP-Z1-9]{26,33}"
        r"|"
        r"ltc1[a-zA-HJ-NP-Z0-9]{25,87}"
        r")\b"
    ),
}
# =====================================================
# Collector State
# =====================================================
telegram_running = False
telegram_stats = {
    "processed": 0,
    "wallets": 0,
    "images": 0,
    "pdfs": 0,
    "qrs": 0,
    "keywords": 0,
    "errors": 0,
}
# =====================================================
# Resolved Telegram Channel Entities
# =====================================================
telegram_channels = {}
# =====================================================
# Keyword Cache
# =====================================================
_keyword_cache = []
_keyword_cache_time = 0
KEYWORD_CACHE_SECONDS = 10
# =====================================================
# Runtime Lock
# =====================================================
collector_lock = asyncio.Lock()
# =====================================================
# Statistics
# =====================================================
def get_telegram_stats():
    """
    Return current Telegram collector statistics.
    """
    return {
        "running": telegram_running,
        "processed": telegram_stats["processed"],
        "wallets": telegram_stats["wallets"],
        "images": telegram_stats["images"],
        "pdfs": telegram_stats["pdfs"],
        "qrs": telegram_stats["qrs"],
        "keywords": telegram_stats["keywords"],
        "errors": telegram_stats["errors"],
    }
def reset_telegram_stats():
    """
    Reset collector counters.
    """
    for key in telegram_stats:
        telegram_stats[key] = 0
# =====================================================
# Telegram Channel ID Helpers
# =====================================================
def normalize_channel_id(chat_id):
    """
    Normalize Telegram IDs.
    Telegram channel/supergroup IDs may appear as:
        123456789
        -123456789
        -100123456789
    Internally Gatekeeper stores the normalized positive ID.
    """
    if chat_id is None:
        return None
    try:
        chat_id = int(chat_id)
    except (TypeError, ValueError):
        return None
    chat_id = abs(chat_id)
    string_id = str(chat_id)
    if (
        string_id.startswith("100")
        and len(string_id) > 10
    ):
        return int(string_id[3:])
    return chat_id
def is_monitored_channel(chat_id):
    """
    Check whether an incoming Telegram event belongs
    to a configured channel.
    """
    normalized_id = normalize_channel_id(chat_id)
    if normalized_id is None:
        return False
    return normalized_id in telegram_channels
# =====================================================
# Resolve Telegram Channels
# =====================================================
async def load_telegram_channels():
    """
    Resolve all configured Telegram channels.
    Resolution order:
    1. Existing dialogs
    2. Telethon entity resolution
    3. Username resolution
    4. Numeric ID fallback
    """
    telegram_channels.clear()
    print(
        "\n========== TELEGRAM CHANNELS =========="
    )
    if not TELEGRAM_CHANNELS:
        print(
            "No Telegram channels configured."
        )
        print(
        "Public Telegram OSINT discovery "
        "will continue."
    )
        print(
            "Set TELEGRAM_CHANNELS in .env"
        )
        print(
            "Example:"
        )
        print(
            "TELEGRAM_CHANNELS=telegram,durov"
        )
        print(
            "=======================================\n"
        )
        return
    dialogs = []
    try:
        dialogs = await client.get_dialogs()
        print(
            f"Loaded {len(dialogs)} Telegram dialogs."
        )
    except Exception as error:
        print(
            "Failed to load Telegram dialogs:",
            repr(error),
        )
    dialog_entities = {}
    for dialog in dialogs:
        try:
            entity = dialog.entity
            entity_id = normalize_channel_id(
                getattr(
                    entity,
                    "id",
                    None,
                )
            )
            if entity_id is None:
                continue
            dialog_entities[entity_id] = entity
        except Exception as error:
            print(
                "Dialog processing error:",
                repr(error),
            )
    for configured_channel in TELEGRAM_CHANNELS:
        configured_channel = (
            configured_channel
            .strip()
            .lstrip("@")
        )
        if not configured_channel:
            continue
        entity = None
        # =================================================
        # Numeric ID
        # =================================================
        try:
            numeric_id = int(
                configured_channel
            )
            normalized_id = normalize_channel_id(
                numeric_id
            )
            entity = dialog_entities.get(
                normalized_id
            )
            if entity:
                print(
                    f"Resolved numeric ID "
                    f"from dialogs: "
                    f"{configured_channel}"
                )
            else:
                try:
                    entity = await client.get_entity(
                        numeric_id
                    )
                except Exception:
                    if numeric_id > 0:
                        marked_id = (
                            -1000000000000
                            + numeric_id
                        )
                        entity = (
                            await client.get_entity(
                                marked_id
                            )
                        )
                    else:
                        raise
        except ValueError:
            # =================================================
            # Username
            # =================================================
            try:
                entity = await client.get_entity(
                    configured_channel
                )
            except Exception as error:
                print(
                    f"FAILED TO RESOLVE "
                    f"@{configured_channel}:",
                    repr(error),
                )
                continue
        except Exception as error:
            print(
                f"FAILED TO RESOLVE "
                f"{configured_channel}:",
                repr(error),
            )
            continue
        if entity is None:
            print(
                f"FAILED TO RESOLVE "
                f"{configured_channel}"
            )
            continue
        entity_id = normalize_channel_id(
            getattr(
                entity,
                "id",
                None,
            )
        )
        if entity_id is None:
            print(
                f"INVALID TELEGRAM ENTITY: "
                f"{configured_channel}"
            )
            continue
        telegram_channels[entity_id] = entity
        channel_username = getattr(
            entity,
            "username",
            None,
        )
        channel_title = getattr(
            entity,
            "title",
            None,
        )
        print(
            "\nMONITORING:",
            (
                f"@{channel_username}"
                if channel_username
                else configured_channel
            ),
        )
        print(
            "  ID:",
            entity_id,
        )
        print(
            "  Title:",
            channel_title,
        )
        print(
            "  Type:",
            type(entity).__name__,
        )
    print(
        f"\nResolved "
        f"{len(telegram_channels)} "
        f"Telegram channel(s)."
    )
    print(
        "=======================================\n"
    )
# =====================================================
# Dynamic Keyword Loader
# =====================================================
async def get_keywords():
    """
    Load keywords dynamically from Gatekeeper API.
    Uses a short cache to avoid hitting the endpoint
    for every Telegram message.
    """
    global _keyword_cache
    global _keyword_cache_time
    current_time = (
        asyncio
        .get_running_loop()
        .time()
    )
    if (
        _keyword_cache
        and (
            current_time
            - _keyword_cache_time
        ) < KEYWORD_CACHE_SECONDS
    ):
        return _keyword_cache
    try:
        async with httpx.AsyncClient(
            timeout=5.0
        ) as http_client:
            response = await http_client.get(
                KEYWORDS_API_URL
            )
            response.raise_for_status()
            data = response.json()
            keywords = data.get(
                "keywords",
                [],
            )
            if isinstance(
                keywords,
                list,
            ):
                cleaned_keywords = []
                for keyword in keywords:
                    keyword = str(
                        keyword
                    ).strip().lower()
                    if (
                        keyword
                        and keyword
                        not in cleaned_keywords
                    ):
                        cleaned_keywords.append(
                            keyword
                        )
                _keyword_cache = (
                    cleaned_keywords
                )
                _keyword_cache_time = (
                    current_time
                )
                print(
                    "Loaded Telegram keywords:",
                    _keyword_cache,
                )
                return _keyword_cache
    except Exception as error:
        print(
            "Keyword loading error:",
            repr(error),
        )
    return _keyword_cache
# =====================================================
# QR Text Normalization
# =====================================================
def normalize_qr_text(text):
    """
    Remove common cryptocurrency URI prefixes
    from QR scanner output.
    """
    if not text:
        return ""
    text = str(text).strip()
    prefixes = [
        "ethereum:",
        "bitcoin:",
        "tron:",
        "solana:",
        "litecoin:",
        "bitcoin://",
        "ethereum://",
        "tron://",
        "solana://",
        "litecoin://",
    ]
    lowered = text.lower()
    for prefix in prefixes:
        if lowered.startswith(prefix):
            return text[len(prefix):].strip()
    return text
def normalize_ocr_text(text: str):
    """
    Normalize OCR text before keyword and wallet extraction.
    OCR frequently inserts line breaks or spaces inside
    cryptocurrency addresses.
    """
    if not text:
        return ""
    text = str(text)
    # Normalize common whitespace
    text = text.replace("\r", "\n")
    # Join hexadecimal Ethereum address fragments split by
    # whitespace/newlines.
    text = re.sub(
        r"(0x[a-fA-F0-9]{20,})[\s\n]+([a-fA-F0-9]{4,40})",
        r"\1\2",
        text,
    )
    # Join Bitcoin address fragments split by whitespace.
    text = re.sub(
        r"(bc1[a-zA-HJ-NP-Z0-9]{10,})[\s\n]+([a-zA-HJ-NP-Z0-9]{5,87})",
        r"\1\2",
        text,
        flags=re.IGNORECASE,
    )
    return text
# =====================================================
# Wallet Extraction
# =====================================================
def extract_wallets(text: str):
    """
    Extract cryptocurrency wallet addresses
    from arbitrary text.
    """
    wallets = []
    if not text:
        return wallets
    text = normalize_ocr_text(text)
    normalized_text = normalize_qr_text(text)
    search_text = (
        f"{text}\n"
        f"{normalized_text}"
    )
    for chain, pattern in WALLET_PATTERNS.items():
        try:
            matches = re.findall(
                pattern,
                search_text,
            )
        except re.error as error:
            print(
                f"Wallet regex error "
                f"for {chain}:",
                repr(error),
            )
            continue
        for address in matches:
            if isinstance(
                address,
                tuple,
            ):
                address = address[0]
            if not address:
                continue
            already_exists = any(
                wallet["address"] == address
                for wallet in wallets
            )
            if already_exists:
                continue
            wallets.append(
                {
                    "address": address,
                    "chain": chain,
                }
            )
    return wallets
# =====================================================
# Text Analysis
# =====================================================
async def analyze_text(text: str):
    """
    Analyze Telegram message text.
    Returns:
        matched_keywords
        detected_wallets
    """
    if not text:
        return [], []
    keywords = await get_keywords()
    normalized_text = normalize_ocr_text(text)
    lowered = normalized_text.lower()
    matched_keywords = []
    for keyword in keywords:
        keyword = keyword.strip().lower()
        if not keyword:
            continue
        if re.search(
            rf"(?<!\w){re.escape(keyword)}(?!\w)",
            lowered,
        ):
            matched_keywords.append(
                keyword
            )
    wallets = extract_wallets(normalized_text)
    telegram_stats["keywords"] += len(
        matched_keywords
    )
    return (
        matched_keywords,
        wallets,
    )
# =====================================================
# Risk Analysis
# =====================================================
def calculate_risk(
    keywords,
    wallets,
):
    """
    Calculate a basic Gatekeeper Telegram
    intelligence risk score.
    Scoring:
        keyword       +10 each
        wallet        +20
        multiple wallets +10
    """
    score = 0
    score += len(keywords) * 10
    if wallets:
        score += 20
    if len(wallets) >= 2:
        score += 10
    score = min(
        score,
        100,
    )
    if score >= 70:
        level = "HIGH"
    elif score >= 40:
        level = "MEDIUM"
    else:
        level = "LOW"
    return (
        score,
        level,
    )
# =====================================================
# Image Processing
# =====================================================
def process_image(
    image,
    source="IMAGE",
):
    """
    Run OCR and QR extraction on an image.
    """
    extracted_text = ""
    qr_results = []
    if image is None:
        print(
            f"{source}: empty image."
        )
        return (
            extracted_text,
            qr_results,
        )
    try:
        extracted_text = (
            ocr_engine.extract_text(
                image
            )
            or ""
        )
        print(
            f"{source} OCR RESULT:",
            extracted_text,
        )
    except Exception as error:
        print(
            f"{source} OCR ERROR:",
            repr(error),
        )
    try:
        qr_results = (
            qr_scanner.scan(
                image
            )
            or []
        )
        print(
            f"{source} QR RESULT:",
            qr_results,
        )
    except Exception as error:
        print(
            f"{source} QR ERROR:",
            repr(error),
        )
    return (
        extracted_text,
        qr_results,
    )
# =====================================================
# PDF Processing
# =====================================================
def process_pdf(path):
    """
    Convert every PDF page to an image and run
    OCR + QR extraction.
    """
    extracted_text = ""
    all_qr_results = []
    try:
        print(
            "\nPDF PROCESSING:",
            path,
        )
        pages = convert_from_path(
            str(path),
            dpi=200,
        )
        print(
            "PDF PAGES:",
            len(pages),
        )
        for page_number, page in enumerate(
            pages,
            start=1,
        ):
            print(
                f"PDF PAGE "
                f"{page_number}: processing..."
            )
            image = cv2.cvtColor(
                np.array(page),
                cv2.COLOR_RGB2BGR,
            )
            (
                page_text,
                qr_results,
            ) = process_image(
                image,
                f"PDF PAGE {page_number}",
            )
            if page_text:
                extracted_text += (
                    "\n"
                    + page_text
                )
            for qr_data in qr_results:
                if qr_data not in all_qr_results:
                    all_qr_results.append(
                        qr_data
                    )
        return (
            extracted_text.strip(),
            all_qr_results,
        )
    except Exception as error:
        print(
            "PDF PROCESSING ERROR:",
            repr(error),
        )
        return (
            extracted_text.strip(),
            all_qr_results,
        )
# =====================================================
# Telegram Media Processing
# =====================================================
async def process_media(event):
    """
    Download and process Telegram media.
    Supported:
        JPG
        JPEG
        PNG
        WEBP
        BMP
        PDF
    """
    extracted_text = ""
    try:
        if not event.message.media:
            return extracted_text
        path = (
            await event.message.download_media(
                file=str(MEDIA_DIR)
            )
        )
        if not path:
            print(
                "Media download failed."
            )
            return extracted_text
        path = Path(path)
        print(
            "\nMEDIA DOWNLOADED:",
            path,
        )
        extension = path.suffix.lower()
        # =================================================
        # IMAGE
        # =================================================
        if extension in {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".bmp",
        }:
            telegram_stats["images"] += 1
            image = cv2.imread(
                str(path)
            )
            if image is None:
                print(
                    "Unable to read image:",
                    path,
                )
                return extracted_text
            (
                ocr_text,
                qr_results,
            ) = process_image(
                image,
                "TELEGRAM IMAGE",
            )
            extracted_text = ocr_text
            if qr_results:
                telegram_stats["qrs"] += len(
                    qr_results
                )
                qr_text = "\n".join(
                    str(item)
                    for item in qr_results
                    if item
                )
                if qr_text:
                    extracted_text += (
                        "\n"
                        + qr_text
                    )
        # =================================================
        # PDF
        # =================================================
        elif extension == ".pdf":
            telegram_stats["pdfs"] += 1
            (
                pdf_text,
                qr_results,
            ) = process_pdf(
                path
            )
            extracted_text = pdf_text
            if qr_results:
                telegram_stats["qrs"] += len(
                    qr_results
                )
                qr_text = "\n".join(
                    str(item)
                    for item in qr_results
                    if item
                )
                if qr_text:
                    extracted_text += (
                        "\n"
                        + qr_text
                    )
        else:
            print(
                "Unsupported Telegram media:",
                extension,
            )
        return extracted_text.strip()
    except Exception as error:
        print(
            "Media processing error:",
            repr(error),
        )
        telegram_stats["errors"] += 1
        return extracted_text
# =====================================================
# Wallet OSINT Helpers
# =====================================================
def merge_wallet_osint(
    existing_osint,
    chat_id,
    username=None,
    channel_username=None,
    channel_title=None,
    message_id=None,
):
    """
    Add Telegram source information to wallet OSINT
    without creating duplicate source entries.
    """
    if not isinstance(
        existing_osint,
        list,
    ):
        existing_osint = []
    new_source = {
        "source": "telegram",
        "channel": str(chat_id),
    }
    if channel_username:
        new_source[
            "channel_username"
        ] = channel_username
    if channel_title:
        new_source[
            "channel_title"
        ] = channel_title
    if username:
        new_source[
            "sender_username"
        ] = username
    if message_id is not None:
        new_source[
            "message_id"
        ] = message_id
    for source in existing_osint:
        if not isinstance(
            source,
            dict,
        ):
            continue
        same_channel = (
            source.get("source")
            == "telegram"
            and str(
                source.get("channel")
            )
            == str(chat_id)
        )
        same_message = (
            message_id is not None
            and source.get("message_id")
            == message_id
        )
        if same_message and same_channel:
            return existing_osint
    existing_osint.append(
        new_source
    )
    return existing_osint
def merge_wallet_labels(existing_labels):
    """
    Add Telegram label without duplicates.
    """
    if not isinstance(
        existing_labels,
        list,
    ):
        existing_labels = []
    if "telegram" not in existing_labels:
        existing_labels.append(
            "telegram"
        )
    return existing_labels
# =====================================================
# Safe JSON Helpers
# =====================================================
def safe_json_list(value):
    """
    Safely normalize a SQLAlchemy JSON field
    into a Python list.
    """
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return []
# =====================================================
# Save Telegram Intelligence
# =====================================================
async def save_intelligence(
    event,
    text,
    keywords,
    wallets,
):
    """
    Persist Telegram intelligence into:
        TelegramMessage
        Wallet
    IMPORTANT:
    Telegram wallets do NOT originate from the OCR
    Extraction table, so extraction_id remains NULL.
    This requires:
        wallets.extraction_id
    to be nullable in PostgreSQL.
    """
    db = None
    try:
        # =================================================
        # Risk
        # =================================================
        (
            risk_score,
            risk_level,
        ) = calculate_risk(
            keywords,
            wallets,
        )
        # =================================================
        # Sender
        # =================================================
        sender = None
        try:
            sender = await event.get_sender()
        except Exception as error:
            print(
                "Sender lookup failed:",
                repr(error),
            )
        sender_username = (
            getattr(
                sender,
                "username",
                None,
            )
            if sender
            else None
        )
        sender_id = (
            getattr(
                sender,
                "id",
                None,
            )
            if sender
            else None
        )
        # =================================================
        # Channel
        # =================================================
        normalized_channel_id = (
            normalize_channel_id(
                event.chat_id
            )
        )
        if normalized_channel_id is None:
            print(
                "Unable to normalize Telegram channel ID."
            )
            return
        channel_id = str(
            normalized_channel_id
        )
        channel = telegram_channels.get(
            normalized_channel_id
        )
        channel_username = getattr(
            channel,
            "username",
            None,
        )
        channel_title = getattr(
            channel,
            "title",
            None,
        )
        # =================================================
        # Message
        # =================================================
        message_id = getattr(
            event.message,
            "id",
            None,
        )
        message_date = getattr(
            event.message,
            "date",
            None,
        )
        # =================================================
        # Database
        # =================================================
        db = SessionLocal()
        # =================================================
        # Detect TelegramMessage Columns
        # =================================================
        telegram_message_table = getattr(
            TelegramMessage,
            "__table__",
            None,
        )
        telegram_message_column_names = set()
        if telegram_message_table is not None:
            telegram_message_column_names = {
                column.name
                for column in telegram_message_table.columns
            }
        # =================================================
        # Telegram Message Duplicate Check
        # =================================================
        existing_message = None
        if message_id is not None:
            if (
                "message_id"
                in telegram_message_column_names
            ):
                existing_message = (
                    db.query(
                        TelegramMessage
                    )
                    .filter(
                        TelegramMessage.channel_id
                        == channel_id,
                        TelegramMessage.message_id
                        == message_id,
                    )
                    .first()
                )
            else:
                existing_message = (
                    db.query(
                        TelegramMessage
                    )
                    .filter(
                        TelegramMessage.channel_id
                        == channel_id,
                        TelegramMessage.username
                        == sender_username,
                        TelegramMessage.message
                        == text[:3000],
                    )
                    .first()
                )
        else:
            existing_message = (
                db.query(
                    TelegramMessage
                )
                .filter(
                    TelegramMessage.channel_id
                    == channel_id,
                    TelegramMessage.username
                    == sender_username,
                    TelegramMessage.message
                    == text[:3000],
                )
                .first()
            )
        # =================================================
        # Save Telegram Evidence
        # =================================================
        if existing_message is not None:
            print(
                "\nTelegram evidence already exists."
            )
        else:
            message_data = {
                "channel_id": channel_id,
                "username": sender_username,
                "message": text[:3000],
                "keywords": keywords,
                "wallet_addresses": wallets,
                "risk_score": risk_score,
                "risk_level": risk_level,
            }
            if (
                "message_id"
                in telegram_message_column_names
            ):
                message_data[
                    "message_id"
                ] = message_id
            if (
                "message_date"
                in telegram_message_column_names
            ):
                message_data[
                    "message_date"
                ] = message_date
            if (
                "sender_id"
                in telegram_message_column_names
            ):
                message_data[
                    "sender_id"
                ] = sender_id
            if (
                "channel_username"
                in telegram_message_column_names
            ):
                message_data[
                    "channel_username"
                ] = channel_username
            if (
                "channel_title"
                in telegram_message_column_names
            ):
                message_data[
                    "channel_title"
                ] = channel_title
            record = TelegramMessage(
                **message_data
            )
            db.add(record)
            print(
                "New Telegram evidence saved."
            )
        # =================================================
        # Wallet Intelligence
        # =================================================
        new_wallet_count = 0
        updated_wallet_count = 0
        for item in wallets:
            if not isinstance(
                item,
                dict,
            ):
                continue
            address = item.get(
                "address"
            )
            chain = item.get(
                "chain"
            )
            if not address or not chain:
                continue
            # =================================================
            # Existing Wallet
            # =================================================
            existing_wallet = (
                db.query(
                    Wallet
                )
                .filter(
                    Wallet.address
                    == address
                )
                .first()
            )
            # =================================================
            # NEW WALLET
            # =================================================
            if existing_wallet is None:
                wallet_osint = [
                    {
                        "source": "telegram",
                        "channel": channel_id,
                        "channel_username": (
                            channel_username
                        ),
                        "channel_title": (
                            channel_title
                        ),
                        "sender_username": (
                            sender_username
                        ),
                        "message_id": (
                            message_id
                        ),
                    }
                ]
                wallet_labels = [
                    "telegram",
                ]
                # =================================================
                # IMPORTANT FIX
                #
                # Telegram wallets do not come from an
                # Extraction record.
                #
                # Therefore extraction_id is explicitly NULL.
                # =================================================
                wallet = Wallet(
                    extraction_id=None,
                    address=address,
                    chain=chain,
                    valid=True,
                    confidence=90,
                    page_number=1,
                    ocr_corrected=False,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    risk_reasons=[],
                    balance=0,
                    transactions=[],
                    labels=wallet_labels,
                    blacklisted=False,
                    osint=wallet_osint,
                )
                db.add(wallet)
                new_wallet_count += 1
                telegram_stats[
                    "wallets"
                ] += 1
                print(
                    "NEW WALLET:",
                    address,
                    "|",
                    chain,
                )
                continue
            # =================================================
            # EXISTING WALLET
            # =================================================
            print(
                "EXISTING WALLET FOUND:",
                address,
            )
            # =================================================
            # Existing OSINT
            # =================================================
            existing_osint = safe_json_list(
                existing_wallet.osint
            )
            existing_wallet.osint = (
                merge_wallet_osint(
                    existing_osint,
                    channel_id,
                    sender_username,
                    channel_username,
                    channel_title,
                    message_id,
                )
            )
            # =================================================
            # Existing Labels
            # =================================================
            existing_labels = safe_json_list(
                existing_wallet.labels
            )
            existing_wallet.labels = (
                merge_wallet_labels(
                    existing_labels
                )
            )
            # =================================================
            # Risk Update
            # =================================================
            existing_risk = (
                existing_wallet.risk_score
                if existing_wallet.risk_score is not None
                else 0
            )
            if risk_score > existing_risk:
                existing_wallet.risk_score = (
                    risk_score
                )
                existing_wallet.risk_level = (
                    risk_level
                )
            # =================================================
            # Confidence
            # =================================================
            existing_confidence = (
                existing_wallet.confidence
                if existing_wallet.confidence is not None
                else 0
            )
            existing_wallet.confidence = min(
                existing_confidence + 2,
                100,
            )
            # =================================================
            # SQLAlchemy JSON field updates
            # =================================================
            try:
                flag_modified(
                    existing_wallet,
                    "osint",
                )
            except Exception as error:
                print(
                    "OSINT flag_modified warning:",
                    repr(error),
                )
            try:
                flag_modified(
                    existing_wallet,
                    "labels",
                )
            except Exception as error:
                print(
                    "Labels flag_modified warning:",
                    repr(error),
                )
            updated_wallet_count += 1
        # =================================================
        # Commit
        # =================================================
        db.commit()
        # =================================================
        # Console Intelligence Report
        # =================================================
        print(
            "\n========== TELEGRAM OSINT HIT =========="
        )
        print(
            "Channel ID:",
            channel_id,
        )
        print(
            "Channel Username:",
            (
                f"@{channel_username}"
                if channel_username
                else None
            ),
        )
        print(
            "Channel Title:",
            channel_title,
        )
        print(
            "Sender:",
            (
                f"@{sender_username}"
                if sender_username
                else sender_id
            ),
        )
        print(
            "Sender ID:",
            sender_id,
        )
        print(
            "Message ID:",
            message_id,
        )
        print(
            "Message Date:",
            message_date,
        )
        print(
            "Matched Keywords:",
            keywords,
        )
        print(
            "Wallets:",
            wallets,
        )
        print(
            "Risk:",
            risk_level,
            risk_score,
        )
        print(
            "New wallets:",
            new_wallet_count,
        )
        print(
            "Updated wallets:",
            updated_wallet_count,
        )
        print(
            "DATABASE SAVED"
        )
        print(
            "========================================"
        )
    except Exception as error:
        if db is not None:
            try:
                db.rollback()
            except Exception:
                pass
        telegram_stats[
            "errors"
        ] += 1
        print(
            "Database error:",
            repr(error),
        )
        traceback.print_exc()
    finally:
        if db is not None:
            try:
                db.close()
            except Exception:
                pass
# =====================================================
# Telegram Message Listener
# =====================================================
@client.on(events.NewMessage)
async def telegram_listener(event):
    """
    Main Telegram event listener.
    Only configured channels are processed.
    """
    try:
        # =================================================
        # Channel Filter
        # =================================================
        if not is_monitored_channel(
            event.chat_id
        ):
            return
        # =================================================
        # Prevent simultaneous processing
        # =================================================
        async with collector_lock:
            telegram_stats[
                "processed"
            ] += 1
            # =================================================
            # Channel Information
            # =================================================
            normalized_id = (
                normalize_channel_id(
                    event.chat_id
                )
            )
            channel = telegram_channels.get(
                normalized_id
            )
            channel_username = getattr(
                channel,
                "username",
                None,
            )
            channel_title = getattr(
                channel,
                "title",
                None,
            )
            # =================================================
            # Message Information
            # =================================================
            message_id = getattr(
                event.message,
                "id",
                None,
            )
            message_date = getattr(
                event.message,
                "date",
                None,
            )
            print(
                "\n========== TELEGRAM MESSAGE =========="
            )
            print(
                "Channel ID:",
                normalized_id,
            )
            print(
                "Channel Username:",
                (
                    f"@{channel_username}"
                    if channel_username
                    else None
                ),
            )
            print(
                "Channel Title:",
                channel_title,
            )
            print(
                "Message ID:",
                message_id,
            )
            print(
                "Date:",
                message_date,
            )
            # =================================================
            # Message Text
            # =================================================
            text = (
                event.message.message
                or ""
            )
            if text:
                print(
                    "Message:",
                    text[:2000],
                )
            # =================================================
            # Media
            # =================================================
            media_text = await process_media(
                event
            )
            # =================================================
            # Combine Text + OCR + QR
            # =================================================
            text_parts = []
            if text.strip():
                text_parts.append(
                    text.strip()
                )
            if media_text.strip():
                text_parts.append(
                    media_text.strip()
                )
            combined_text = (
                "\n".join(
                    text_parts
                )
            ).strip()
            # =================================================
            # Empty Message
            # =================================================
            if not combined_text:
                print(
                    "No text or extractable "
                    "media content."
                )
                print(
                    "===================================="
                )
                return
            # =================================================
            # Analyze
            # =================================================
            (
                keywords,
                wallets,
            ) = await analyze_text(
                combined_text
            )
            print(
                "Matched Keywords:",
                keywords,
            )
            print(
                "Detected Wallets:",
                wallets,
            )
            # =================================================
            # Ignore Irrelevant Messages
            # =================================================
            if (
                not keywords
                and not wallets
            ):
                print(
                    "No Gatekeeper intelligence detected."
                )
                print(
                    "===================================="
                )
                return
            # =================================================
            # Save
            # =================================================
            await save_intelligence(
                event,
                combined_text,
                keywords,
                wallets,
            )
            print(
                "===================================="
            )
    except Exception as error:
        telegram_stats[
            "errors"
        ] += 1
        print(
            "Telegram listener error:",
            repr(error),
        )
        traceback.print_exc()
# =====================================================
# Start Telegram Collector
# =====================================================
async def start_collector():
    """
    Start the Telegram OSINT collector.
    Uses the existing Gatekeeper Telegram client.
    """
    global telegram_running
    if telegram_running:
        print(
            "Telegram collector already running."
        )
        return
    reset_telegram_stats()
    telegram_running = True
    print(
        "\n========================================"
    )
    print(
        "Telegram OSINT collector started..."
    )
    print(
        "Monitoring Telegram messages and media..."
    )
    print(
        "Dynamic keywords enabled."
    )
    print(
        "Configured channels:",
        TELEGRAM_CHANNELS,
    )
    print(
        "========================================"
    )
    try:
        # =================================================
        # Connect existing client
        # =================================================
        if not client.is_connected():
            await client.start()
        if not client.is_connected():
            print(
                "Telegram client failed to connect."
            )
            telegram_running = False
            return
        print(
            "Telegram client connected."
        )
        # =================================================
        # Authorization
        # =================================================
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
            telegram_running = False
            return
        # =================================================
        # Resolve Channels
        # =================================================
        await load_telegram_channels()
        if not telegram_channels:
            print(
                "No Telegram channels could "
                "be resolved."
            )
            telegram_running = False
            return
        from app.core.telegram.discovery import start_discovery
        await start_discovery()
        # =================================================
        # Collector Ready
        # =================================================
        print(
            "\nTelegram collector is now "
            "waiting for new messages..."
        )
        print(
            "Monitoring:",
            len(
                telegram_channels
            ),
            "channel(s)"
        )
        # =================================================
        # Keep collector alive
        # =================================================
        while telegram_running:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        print(
            "Telegram collector cancelled."
        )
    except Exception as error:
        telegram_stats[
            "errors"
        ] += 1
        print(
            "Telegram collector error:",
            repr(error),
        )
        traceback.print_exc()
    finally:
        telegram_running = False
        print(
            "Telegram collector stopped."
        )
# =====================================================
# Stop Telegram Collector
# =====================================================
async def stop_collector():
    """
    Stop only the Gatekeeper Telegram collector.
    The shared Telethon client remains connected.
    """
    global telegram_running
    telegram_running = False
    print(
        "Stopping Telegram collector..."
    )
    print(
        "Telegram collector stopped."
    )