from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    Float,
    JSON,
)
from app.database.connection import Base
# =====================================================
# MEDIA TABLE
# =====================================================
class Media(Base):
    __tablename__ = "media"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    filename = Column(
        String,
        nullable=False,
    )
    file_type = Column(
        String,
        nullable=True,
    )
    file_size = Column(
        Integer,
        nullable=True,
    )
    file_path = Column(
        String,
        nullable=True,
    )
    source_type = Column(
        String,
        default="upload",
        nullable=True,
    )
    source_url = Column(
        String,
        nullable=True,
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
# =====================================================
# WEBSITE SOURCE TABLE
# =====================================================
class WebsiteSource(Base):
    __tablename__ = "website_sources"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    url = Column(
        String,
        nullable=False,
        unique=True,
    )
    active = Column(
        Boolean,
        default=True,
    )
    last_crawled_at = Column(
        DateTime,
        nullable=True,
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
# =====================================================
# EXTRACTION TABLE
# =====================================================
class Extraction(Base):
    __tablename__ = "extractions"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    media_id = Column(
        Integer,
        nullable=False,
    )
    ocr_text = Column(
        Text,
        nullable=True,
    )
    highest_risk = Column(
        Float,
        default=0,
    )
    wallet_count = Column(
        Integer,
        default=0,
    )
    page_count = Column(
        Integer,
        default=1,
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
# =====================================================
# WALLET TABLE
# =====================================================
class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    # IMPORTANT:
    # Wallets can originate from:
    #
    # 1. File/media extraction
    # 2. Telegram OSINT
    # 3. Website OSINT
    # 4. Other collectors
    #
    # Therefore extraction_id MUST be nullable.
    extraction_id = Column(
        Integer,
        nullable=True
    )
    address = Column(
        String,
        index=True,
        nullable=False
    )
    chain = Column(
        String,
        nullable=False,
    )
    valid = Column(
        Boolean,
        default=False,
    )
    confidence = Column(
        Float,
        default=0,
    )
    page_number = Column(
        Integer,
        default=1,
    )
    ocr_corrected = Column(
        Boolean,
        default=False,
    )
    # =================================================
    # Risk Intelligence
    # =================================================
    risk_score = Column(
        Float,
        default=0,
    )
    risk_level = Column(
        String,
        default="LOW",
    )
    risk_reasons = Column(
        JSON,
        default=list,
    )
    # =================================================
    # Blockchain Enrichment
    # =================================================
    balance = Column(
        Float,
        default=0,
    )
    transactions = Column(
        JSON,
        default=list,
    )
    labels = Column(
        JSON,
        default=list,
    )
    blacklisted = Column(
        Boolean,
        default=False,
    )
    # =================================================
    # OSINT Correlation
    # =================================================
    osint = Column(
        JSON,
        default=list,
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
# =====================================================
# CORRELATION ENTITY TABLE
# =====================================================
class Entity(Base):
    __tablename__ = "entities"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    extraction_id = Column(
        Integer,
        nullable=False,
    )
    entity_type = Column(
        String,
        nullable=False,
    )
    value = Column(
        String,
        nullable=False,
        index=True,
    )
    confidence = Column(
        Float,
        default=0,
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
# =====================================================
# AUDIT LOG TABLE
# =====================================================
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    action = Column(
        String,
        nullable=False,
    )
    actor = Column(
        String,
        default="System",
    )
    target = Column(
        String,
        nullable=True,
    )
    status = Column(
        String,
        default="SUCCESS",
    )
    module = Column(
        String,
        nullable=True,
    )
    details = Column(
        JSON,
        default=dict,
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
# =====================================================
# TWEET TABLE
# =====================================================
class Tweet(Base):
    __tablename__ = "tweets"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    tweet_id = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )
    author = Column(
        String,
        nullable=True,
    )
    text = Column(
        Text,
        nullable=True,
    )
    media_url = Column(
        String,
        nullable=True,
    )
    platform = Column(
        String,
        default="X/Twitter",
    )
    risk = Column(
        String,
        default="MEDIUM",
    )
    wallet_count = Column(
        Integer,
        default=0,
    )
    processed = Column(
        Boolean,
        default=False,
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
# =====================================================
# SETTINGS TABLE
# =====================================================
class SettingsRecord(Base):
    __tablename__ = "settings"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    desktop_notifications = Column(
        Boolean,
        default=True,
    )
    threat_notifications = Column(
        Boolean,
        default=True,
    )
    auto_refresh = Column(
        Boolean,
        default=True,
    )
    audit_logging = Column(
        Boolean,
        default=True,
    )
    anonymous_telemetry = Column(
        Boolean,
        default=False,
    )
    postgres_url = Column(
        String,
        default="localhost:5432",
    )
    neo4j_url = Column(
        String,
        default="bolt://localhost:7687",
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
# =====================================================
# TELEGRAM MESSAGE TABLE
# =====================================================
class TelegramMessage(Base):
    __tablename__ = "telegram_messages"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    # Telegram channel information
    channel_id = Column(
        String,
        nullable=False,
        index=True,
    )
    channel_username = Column(
        String,
        nullable=True,
    )
    channel_title = Column(
        String,
        nullable=True,
    )
    # Telegram sender information
    sender_id = Column(
        Integer,
        nullable=True,
    )
    username = Column(
        String,
        nullable=True,
    )
    # Telegram message information
    message_id = Column(
        Integer,
        nullable=True,
        index=True,
    )
    message_date = Column(
        DateTime,
        nullable=True,
    )
    message = Column(
        Text,
        nullable=True,
    )
    # Gatekeeper analysis
    keywords = Column(
        JSON,
        default=list,
    )
    wallet_addresses = Column(
        JSON,
        default=list,
    )
    risk_score = Column(
        Float,
        default=0,
    )
    risk_level = Column(
        String,
        default="LOW",
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
# =====================================================
# INVESTIGATION CASE TABLE
# =====================================================
class Case(Base):
    __tablename__ = "cases"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    name = Column(
        String,
        nullable=False,
    )
    description = Column(
        Text,
        nullable=True,
    )
    status = Column(
        String,
        default="ACTIVE",
    )
    analyst = Column(
        String,
        nullable=True,
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
# =====================================================
# CASE ↔ WALLET
# =====================================================
class CaseWallet(Base):
    __tablename__ = "case_wallets"
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )
    case_id = Column(
        Integer,
        nullable=False,
        index=True,
    )
    wallet_id = Column(
        Integer,
        nullable=False,
        index=True,
    )
    added_at = Column(
        DateTime,
        default=datetime.utcnow,
    )