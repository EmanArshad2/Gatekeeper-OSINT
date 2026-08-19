from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_database
from app.database.models import AuditLog
router = APIRouter()
@router.get("/audit/logs")
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_database)
):
    logs = (
        db.query(AuditLog)
        .order_by(
            AuditLog.created_at.desc()
        )
        .limit(limit)
        .all()
    )
    return {
        "status": "SUCCESS",
        "count": len(logs),
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "actor": getattr(
                    log,
                    "actor",
                    "System"
                ),
                "target": getattr(
                    log,
                    "target",
                    ""
                ),
                "module": getattr(
                    log,
                    "module",
                    ""
                ),
                "status": getattr(
                    log,
                    "status",
                    "SUCCESS"
                ),
                "details": log.details or {},
                "created_at": log.created_at
            }
            for log in logs
        ]
    }
@router.post("/audit/test")
def create_test_log(
    db: Session = Depends(get_database)
):
    log = AuditLog(
        action="Backend Test",
        actor="Gatekeeper",
        target="Audit API",
        module="System",
        status="SUCCESS",
        details={
            "message": "Audit logging is working."
        }
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "status": "SUCCESS",
        "id": log.id
    }