from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.connection import get_database
from app.database.models import AuditLog, Extraction, Wallet
router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)
@router.get("")
def get_notifications(
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_database),
):
    """
    Powers the notification bell. Reuses existing data (high-risk wallets,
    audit log errors) rather than a dedicated notifications table — these
    already carry everything a "notable event" needs.
    """
    notifications = []
    # ---- High-risk / critical wallets, most recent first ----
    high_risk_wallets = (
        db.query(Wallet, Extraction.created_at)
        .join(Extraction, Wallet.extraction_id == Extraction.id)
        .filter(Wallet.risk_level.in_(["HIGH", "CRITICAL"]))
        .order_by(Extraction.created_at.desc())
        .limit(limit)
        .all()
    )
    for wallet, created_at in high_risk_wallets:
        notifications.append({
            "type": "high_risk_wallet",
            "severity": "critical" if wallet.risk_level == "CRITICAL" else "high",
            "title": f"{wallet.risk_level} risk wallet detected",
            "subtitle": f"{wallet.address[:10]}...{wallet.address[-6:]} · {wallet.chain.upper()}",
            "created_at": created_at.isoformat() if created_at else None,
            "route": f"/wallets/{wallet.id}",
        })
    # ---- Recent system/collector errors from the audit log ----
    error_logs = (
        db.query(AuditLog)
        .filter(AuditLog.status == "ERROR")
        .order_by(AuditLog.created_at.desc())
        .limit(5)
        .all()
    )
    for log in error_logs:
        notifications.append({
            "type": "system_error",
            "severity": "warning",
            "title": log.action or "System error",
            "subtitle": log.module or "",
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "route": "/audit",
        })
    # Sort combined feed by recency and trim to the requested limit.
    notifications.sort(key=lambda n: n["created_at"] or "", reverse=True)
    notifications = notifications[:limit]
    # Simple "unread" heuristic: anything from the last 24 hours.
    cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
    unread_count = sum(
        1 for n in notifications if (n["created_at"] or "") >= cutoff
    )
    return {
        "status": "SUCCESS",
        "count": len(notifications),
        "unread_count": unread_count,
        "notifications": notifications,
    }