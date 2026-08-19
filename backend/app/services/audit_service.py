from sqlalchemy.orm import Session
from app.database.models import AuditLog
class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        actor: str = "System",
        target: str = "",
        module: str = "",
        status: str = "SUCCESS",
        details=None,
    ):
        try:
            log = AuditLog(
                action=action,
                actor=actor,
                target=target,
                module=module,
                status=status,
                details=details or {},
            )
            db.add(log)
            db.commit()
        except Exception as e:
            print("Audit Log Error:", e)
            db.rollback()