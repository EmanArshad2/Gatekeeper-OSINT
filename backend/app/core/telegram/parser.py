"""
Telegram Message Parser & OSINT Entity Extractor.
"""
import re
import logging
from app.core.wallet.detector import wallet_detector

logger = logging.getLogger(__name__)

EMAIL_REGEX = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"
URL_REGEX = r"https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[/\w\.-]*"
HANDLE_REGEX = r"(?<!\w)@[A-Za-z0-9_]{4,32}\b"

def parse_telegram_message(message_text: str) -> dict:
    """
    Parses arbitrary Telegram message text to discover wallet addresses,
    email addresses, URLs, and handles.
    """
    if not message_text:
        return {
            "wallets": [],
            "emails": [],
            "urls": [],
            "handles": [],
        }

    wallets = wallet_detector.detect(message_text)
    emails = list(set(re.findall(EMAIL_REGEX, message_text)))
    urls = list(set(re.findall(URL_REGEX, message_text)))
    handles = list(set(re.findall(HANDLE_REGEX, message_text)))

    return {
        "wallets": wallets,
        "emails": emails,
        "urls": urls,
        "handles": handles,
    }
