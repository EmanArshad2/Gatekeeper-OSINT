from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_database
from app.database.models import Wallet, Extraction, Media
router = APIRouter()
@router.get("/wallets")
def get_wallets(db: Session = Depends(get_database)):
    wallets = (
        db.query(Wallet)
        .order_by(Wallet.created_at.desc())
        .all()
    )
    wallet_list = []
    total_transactions = 0
    total_assets = 0
    high_risk = 0
    for wallet in wallets:
        tx_count = len(wallet.transactions or [])
        total_transactions += tx_count
        total_assets += wallet.balance or 0
        if (wallet.risk_level or "").upper() == "HIGH":
            high_risk += 1
        wallet_list.append(
            {
                "id": wallet.id,
                "address": wallet.address,
                "chain": wallet.chain,
                "risk_level": wallet.risk_level,
                "risk_score": wallet.risk_score,
                "confidence": wallet.confidence,
                "balance": wallet.balance,
                "transaction_count": tx_count,
                "blacklisted": wallet.blacklisted,
                "labels": wallet.labels or [],
                "created_at": wallet.created_at,
            }
        )
    return {
        "status": "SUCCESS",
        "summary": {
            "wallets": len(wallet_list),
            "high_risk": high_risk,
            "transactions": total_transactions,
            "assets": total_assets,
        },
        "wallets": wallet_list,
    }
@router.get("/wallets/{wallet_id}/evidence")
def get_wallet_evidence(wallet_id: int, db: Session = Depends(get_database)):
    """
    Returns the full evidence trail for a wallet address — every place
    it was found (across uploads, Telegram, Website, and X/Twitter
    collection), with the originating OCR snippet, confidence, and risk
    breakdown for each occurrence. A wallet found via multiple sources
    will show multiple entries here, which is itself a meaningful signal.
    """
    wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found.")
    # Same address can legitimately appear across several extractions —
    # show every occurrence, not just this one row.
    occurrences = (
        db.query(Wallet)
        .filter(Wallet.address == wallet.address)
        .order_by(Wallet.created_at.desc())
        .all()
    )
    evidence_items = []
    for occurrence in occurrences:
        extraction = (
            db.query(Extraction)
            .filter(Extraction.id == occurrence.extraction_id)
            .first()
        )
        media = None
        if extraction:
            media = (
                db.query(Media)
                .filter(Media.id == extraction.media_id)
                .first()
            )
        snippet = None
        if extraction and extraction.ocr_text:
            text = extraction.ocr_text
            # Prefer locating the raw OCR text if this was an
            # OCR-corrected match, since the corrected address won't
            # appear verbatim in the source text.
            needle = getattr(occurrence, "raw_ocr_text", None) or occurrence.address
            idx = text.find(needle)
            if idx == -1:
                idx = text.lower().find(needle.lower())
            if idx != -1:
                start = max(0, idx - 80)
                end = min(len(text), idx + len(needle) + 80)
                snippet = text[start:end].strip()
            else:
                snippet = text[:160].strip()
        evidence_items.append({
            "wallet_row_id": occurrence.id,
            "page_number": occurrence.page_number,
            "ocr_corrected": occurrence.ocr_corrected,
            "confidence": occurrence.confidence,
            "risk_score": occurrence.risk_score,
            "risk_level": occurrence.risk_level,
            "risk_reasons": occurrence.risk_reasons or [],
            "found_at": occurrence.created_at,
            "source_type": getattr(media, "source_type", None) or "upload",
            "source_url": getattr(media, "source_url", None),
            "filename": getattr(media, "filename", None),
            "snippet": snippet,
        })
    return {
        "status": "SUCCESS",
        "address": wallet.address,
        "chain": wallet.chain,
        "occurrence_count": len(evidence_items),
        "evidence": evidence_items,
    }