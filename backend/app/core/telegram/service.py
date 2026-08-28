"""
Telegram Intelligence Service.
Provides high-level helpers for querying collected Telegram messages and OSINT.
"""
import logging
from sqlalchemy.orm import Session
from app.database.models import TelegramMessage
from app.core.telegram.parser import parse_telegram_message

logger = logging.getLogger(__name__)

class TelegramOSINTService:
    def get_recent_messages(self, db: Session, limit: int = 50):
        return db.query(TelegramMessage).order_by(TelegramMessage.created_at.desc()).limit(limit).all()

    def analyze_and_store(self, db: Session, channel_id: str, message_id: int, message_text: str, sender_info: dict = None):
        parsed = parse_telegram_message(message_text)
        wallets = [w["address"] for w in parsed.get("wallets", [])]

        msg_record = TelegramMessage(
            channel_id=str(channel_id),
            message_id=message_id,
            message=message_text,
            wallet_addresses=wallets,
            keywords=parsed.get("handles", []) + parsed.get("emails", []),
            username=(sender_info or {}).get("username"),
            channel_title=(sender_info or {}).get("channel_title"),
        )
        db.add(msg_record)
        db.commit()
        db.refresh(msg_record)
        return msg_record

telegram_service = TelegramOSINTService()
