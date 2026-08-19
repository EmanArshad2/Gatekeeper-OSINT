from sqlalchemy import text
from app.database.connection import SessionLocal
def get_history():
    db = SessionLocal()
    try:
        result = db.execute(
            text(
                """
                SELECT
                    m.id,
                    m.filename,
                    m.uploaded_at,
                    COALESCE(e.risk_score, 0) AS risk_score,
                    COUNT(w.id) AS wallet_count
                FROM media m
                LEFT JOIN extractions e
                    ON e.media_id = m.id
                LEFT JOIN wallets w
                    ON w.extraction_id = e.id
                GROUP BY
                    m.id,
                    m.filename,
                    m.uploaded_at,
                    e.risk_score
                ORDER BY
                    m.uploaded_at DESC
                """
            )
        )
        history = []
        for row in result.fetchall():
            history.append(
                {
                    "id": row.id,
                    "filename": row.filename,
                    "uploaded_at": (
                        row.uploaded_at.isoformat()
                        if row.uploaded_at
                        else None
                    ),
                    "risk_score": row.risk_score,
                    "wallet_count": row.wallet_count,
                }
            )
        return {
            "status": "SUCCESS",
            "history": history,
        }
    finally:
        db.close()