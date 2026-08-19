import os
from pathlib import Path
from dotenv import load_dotenv
from telethon import TelegramClient
# =====================================================
# ENVIRONMENT CONFIGURATION
# =====================================================
load_dotenv()
API_ID_VALUE = os.getenv(
    "TELEGRAM_API_ID",
)
API_HASH = os.getenv(
    "TELEGRAM_API_HASH",
)
SESSION_NAME = os.getenv(
    "TELEGRAM_SESSION",
    "gatekeeper",
)
# =====================================================
# VALIDATE TELEGRAM CREDENTIALS
# =====================================================
if not API_ID_VALUE:
    raise RuntimeError(
        "TELEGRAM_API_ID is not configured."
    )
if not API_HASH:
    raise RuntimeError(
        "TELEGRAM_API_HASH is not configured."
    )
try:
    API_ID = int(API_ID_VALUE)
except ValueError as error:
    raise RuntimeError(
        "TELEGRAM_API_ID must be an integer."
    ) from error
# =====================================================
# SESSION DIRECTORY
# =====================================================
BASE_DIR = Path(
    __file__
).resolve().parents[3]
SESSION_DIR = (
    BASE_DIR / "telegram_sessions"
)
SESSION_DIR.mkdir(
    parents=True,
    exist_ok=True,
)
SESSION_PATH = (
    SESSION_DIR / SESSION_NAME
)
# =====================================================
# TELEGRAM CLIENT
# =====================================================
client = TelegramClient(
    str(SESSION_PATH),
    API_ID,
    API_HASH,
)
