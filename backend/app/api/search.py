from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.connection import get_database
from app.database.models import Wallet, Media, Extraction
router = APIRouter(
    prefix="/search",
    tags=["Search"]
)
@router.get("")
def global_search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(8, ge=1, le=25),
    db: Session = Depends(get_database),
):
    """
    Unified search across wallets and evidence, powering the global
    ⌘K search modal. Returns a small, typed, ranked-by-recency result
    list rather than a full paginated resultset — this is a quick-jump
    search, not a filtering/browsing endpoint.
    """
    term = f"%{q.strip()}%"
    results = []
    # ---- Wallets ----
    wallets = (
        db.query(Wallet)
        .filter(Wallet.address.ilike(term))
        .order_by(Wallet.id.desc())
        .limit(limit)
        .all()
    )
    for wallet in wallets:
        results.append({
            "type": "wallet",
            "id": wallet.id,
            "title": wallet.address,
            "subtitle": f"{wallet.chain.upper()} · risk {wallet.risk_level or 'N/A'}",
            "risk_level": wallet.risk_level,
            "route": f"/wallets/{wallet.id}",
        })
    # ---- Evidence (uploaded files) ----
    media_items = (
        db.query(Media)
        .filter(Media.filename.ilike(term))
        .order_by(Media.id.desc())
        .limit(limit)
        .all()
    )
    for media in media_items:
        results.append({
            "type": "evidence",
            "id": media.id,
            "title": media.filename,
            "subtitle": media.file_type or "Evidence file",
            "route": f"/evidence/{media.id}",
        })
    # ---- OCR text matches (only when nothing else matched closely,
    # to avoid flooding results with noisy full-text hits) ----
    if len(results) < limit:
        extractions = (
            db.query(Extraction)
            .filter(Extraction.ocr_text.ilike(term))
            .order_by(Extraction.id.desc())
            .limit(limit - len(results))
            .all()
        )
        for extraction in extractions:
            snippet = (extraction.ocr_text or "")[:80].replace("\n", " ")
            results.append({
                "type": "extraction",
                "id": extraction.id,
                "title": f"Extraction #{extraction.id}",
                "subtitle": snippet,
                "route": f"/evidence/{extraction.media_id}",
            })
    return {
        "status": "SUCCESS",
        "query": q,
        "count": len(results),
        "results": results[:limit],
    }