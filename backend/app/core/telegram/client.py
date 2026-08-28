import os
import logging
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

API_ID_VALUE = os.getenv("TELEGRAM_API_ID")
API_HASH = os.getenv("TELEGRAM_API_HASH")
SESSION_NAME = os.getenv("TELEGRAM_SESSION", "gatekeeper")

client = None
IS_TELEGRAM_CONFIGURED = False

BASE_DIR = Path(__file__).resolve().parents[3]
SESSION_DIR = BASE_DIR / "telegram_sessions"
SESSION_DIR.mkdir(parents=True, exist_ok=True)
SESSION_PATH = SESSION_DIR / SESSION_NAME

if API_ID_VALUE and API_HASH:
    try:
        from telethon import TelegramClient
        api_id = int(API_ID_VALUE)
        client = TelegramClient(str(SESSION_PATH), api_id, API_HASH)
        IS_TELEGRAM_CONFIGURED = True
        logger.info("Telegram client configured with session: %s", SESSION_PATH)
    except Exception as err:
        logger.warning("Telegram client initialization failed: %s", err)
        client = None
        IS_TELEGRAM_CONFIGURED = False
else:
    logger.info("Telegram API credentials not provided in .env; Telegram monitoring disabled.")

def get_telegram_client():
    return client

def is_telegram_configured() -> bool:
    return IS_TELEGRAM_CONFIGURED and client is not None
