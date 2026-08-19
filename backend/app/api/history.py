from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from app.database.connection import get_database
from app.database.models import (
    Extraction,
    Media
)
router = APIRouter()
@router.get("/history")
def get_history(
    db: Session = Depends(get_database)
):
    records = (
        db.query(
            Extraction,
            Media
        )
        .join(
            Media,
            Extraction.media_id == Media.id
        )
        .order_by(
            Extraction.created_at.desc()
        )
        .all()
    )
    history = []
    for extraction, media in records:
        history.append(
            {
                "id": extraction.id,
                # Real uploaded filename
                "filename": media.filename,
                "uploaded_at": extraction.created_at,
                # Stored wallet count from extraction table
                "wallet_count": extraction.wallet_count or 0,
                # Stored risk score
                "risk_score": extraction.highest_risk or 0
            }
        )
    return {
        "status": "SUCCESS",
        "history": history
    }