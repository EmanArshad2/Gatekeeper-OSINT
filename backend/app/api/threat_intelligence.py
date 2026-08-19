from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_database
from app.database.models import (
    Wallet,
    AuditLog,
    TelegramMessage,
)
router = APIRouter(
    prefix="/threat-intelligence",
    tags=["Threat Intelligence"],
)
@router.get("")
def threat_intelligence(
    db: Session = Depends(get_database),
):
    # ==============================
    # Fetch Wallet Intelligence
    # ==============================
    wallets = (
        db.query(Wallet)
        .order_by(
            Wallet.created_at.desc()
        )
        .all()
    )
    # ==============================
    # Fetch Audit Logs
    # ==============================
    audit_logs = (
        db.query(AuditLog)
        .order_by(
            AuditLog.created_at.desc()
        )
        .limit(20)
        .all()
    )
    # ==============================
    # Fetch Telegram OSINT
    # ==============================
    telegram_messages = (
        db.query(TelegramMessage)
        .order_by(
            TelegramMessage.created_at.desc()
        )
        .limit(20)
        .all()
    )
    # ==============================
    # Threat Metrics
    # ==============================
    wallet_threats = len(
        [
            wallet
            for wallet in wallets
            if (wallet.risk_score or 0) > 0
        ]
    )
    telegram_threats = len(
        [
            message
            for message in telegram_messages
            if (message.risk_score or 0) > 0
        ]
    )
    active_threats = (
        wallet_threats +
        telegram_threats
    )
    high_severity_wallets = len(
        [
            wallet
            for wallet in wallets
            if (
                wallet.risk_level or ""
            ).upper() == "HIGH"
        ]
    )
    high_severity_telegram = len(
        [
            message
            for message in telegram_messages
            if (
                message.risk_level or ""
            ).upper() == "HIGH"
        ]
    )
    high_severity = (
        high_severity_wallets +
        high_severity_telegram
    )
    # ==============================
    # OSINT Sources
    # ==============================
    sources = set()
    for wallet in wallets:
        if wallet.labels:
            for label in wallet.labels:
                sources.add(
                    str(label)
                )
        if wallet.osint:
            for source in wallet.osint:
                sources.add(
                    str(source)
                )
    if telegram_messages:
        sources.add(
            "Telegram"
        )
    # ==============================
    # Intelligence Feed
    # ==============================
    feed = []
    # Wallet Feed
    for wallet in wallets[:10]:
        feed.append(
            {
                "source":
                    wallet.chain.capitalize(),
                "severity":
                    wallet.risk_level or "LOW",
                "title":
                    "Wallet Intelligence Updated",
                "description":
                    (
                        f"{wallet.address[:14]}..."
                        f" scored "
                        f"{wallet.risk_score}/100"
                    ),
                "time":
                    wallet.created_at.isoformat(),
            }
        )
    # Audit Feed
    for log in audit_logs[:10]:
        feed.append(
            {
                "source":
                    log.module or "Gatekeeper",
                "severity":
                    "LOW",
                "title":
                    log.action,
                "description":
                    log.target or "",
                "time":
                    log.created_at.isoformat(),
            }
        )
    # Telegram Feed
    for message in telegram_messages:
        feed.append(
            {
                "source":
                    "Telegram",
                "severity":
                    message.risk_level or "LOW",
                "title":
                    "Telegram OSINT Detection",
                "description":
                    message.message[:250],
                "time":
                    message.created_at.isoformat(),
            }
        )
    # Latest first
    feed.sort(
        key=lambda item: item["time"],
        reverse=True,
    )
    return {
        "status":
            "SUCCESS",
        "summary": {
            "active_threats":
                active_threats,
            "high_severity":
                high_severity,
            "osint_sources":
                len(sources),
            "live_events":
                len(feed),
        },
        "feed":
            feed,
    }