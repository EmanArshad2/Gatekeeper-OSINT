from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.connection import get_database
from app.database.models import Wallet
router = APIRouter(
    prefix="/risk-analysis",
    tags=["Risk Analysis"],
)
@router.get("")
def get_risk_analysis(
    db: Session = Depends(get_database),
):
    wallets = (
        db.query(Wallet)
        .order_by(Wallet.created_at.desc())
        .all()
    )
    total_wallets = len(wallets)
    high = sum(
        1
        for wallet in wallets
        if (wallet.risk_level or "").upper() == "HIGH"
    )
    medium = sum(
        1
        for wallet in wallets
        if (wallet.risk_level or "").upper() == "MEDIUM"
    )
    average_score = (
        round(
            db.query(
                func.avg(Wallet.risk_score)
            ).scalar()
            or 0
        )
    )
    results = []
    for wallet in wallets:
        if wallet.risk_reasons and len(wallet.risk_reasons):
            reason = wallet.risk_reasons[0]
        else:
            reason = "No risk indicators"
        results.append(
            {
                "id": wallet.id,
                "address": wallet.address,
                "chain": wallet.chain,
                "risk_score": wallet.risk_score,
                "risk_level": wallet.risk_level,
                "reason": reason,
                "confidence": wallet.confidence,
                "created_at": wallet.created_at,
            }
        )
    return {
        "status": "SUCCESS",
        "summary": {
            "wallets": total_wallets,
            "high": high,
            "medium": medium,
            "average_score": average_score,
        },
        "wallets": results,
    }