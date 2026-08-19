from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_database
from app.database.models import Case, CaseWallet, Wallet
from app.core.wallet.detector import wallet_detector
from app.core.wallet.validator import wallet_validator
router = APIRouter(
    prefix="/cases",
    tags=["Cases"]
)
def _detect_chain(address: str) -> str:
    """Best-effort chain classification for an address typed by an
    analyst directly (not yet run through the OCR/OSINT extraction
    pipeline). Falls back to 'ethereum' for 0x-style addresses and
    'unknown' otherwise so the row can still be created."""
    detections = wallet_detector.detect(address) or []
    for item in detections:
        candidate = item.get("address") if isinstance(item, dict) else None
        if candidate and candidate.lower() == address.lower():
            return item.get("chain", "unknown")
    if detections:
        return detections[0].get("chain", "unknown")
    if address.lower().startswith("0x"):
        return "ethereum"
    return "unknown"
def _get_or_create_wallet(address: str, db: Session) -> Wallet:
    """Looks up a wallet by address, and if it hasn't been seen by any
    OSINT/extraction collector yet, creates it on the fly. Previously
    attaching or investigating an address that wasn't already in the
    `wallets` table (e.g. one an analyst typed in manually rather than
    one that was extracted from evidence) failed with a 404, even
    though every other part of the UI treats a raw address as a valid
    thing to investigate."""
    address = (address or "").strip()
    wallet = (
        db.query(Wallet)
        .filter(Wallet.address.ilike(address))
        .first()
    )
    if wallet:
        return wallet
    chain = _detect_chain(address)
    validation = wallet_validator.validate({"address": address, "chain": chain})
    wallet = Wallet(
        address=address,
        chain=chain,
        valid=bool(validation.get("valid")),
        confidence=validation.get("confidence", 0),
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet
def _serialize_case(case: Case, wallet_count: int = 0) -> dict:
    return {
        "id": case.id,
        "name": case.name,
        "description": case.description,
        "status": case.status,
        "analyst": case.analyst,
        "wallet_count": wallet_count,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "updated_at": case.updated_at.isoformat() if case.updated_at else None,
    }
@router.get("")
def list_cases(db: Session = Depends(get_database)):
    cases = db.query(Case).order_by(Case.updated_at.desc()).all()
    results = []
    for case in cases:
        wallet_count = (
            db.query(CaseWallet)
            .filter(CaseWallet.case_id == case.id)
            .count()
        )
        results.append(_serialize_case(case, wallet_count))
    return {"status": "SUCCESS", "cases": results}
@router.post("")
def create_case(data: dict, db: Session = Depends(get_database)):
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Case name is required.")
    case = Case(
        name=name,
        description=data.get("description"),
        status="ACTIVE",
        analyst=data.get("analyst"),
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    # Optionally attach an initial set of wallet IDs at creation time.
    initial_wallet_ids = data.get("wallet_ids") or []
    for wallet_id in initial_wallet_ids:
        exists = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if exists:
            db.add(CaseWallet(case_id=case.id, wallet_id=wallet_id))
    if initial_wallet_ids:
        db.commit()
    return {"status": "SUCCESS", "case": _serialize_case(case, len(initial_wallet_ids))}
@router.get("/{case_id}")
def get_case(case_id: int, db: Session = Depends(get_database)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    links = db.query(CaseWallet).filter(CaseWallet.case_id == case_id).all()
    wallet_ids = [link.wallet_id for link in links]
    wallets = (
        db.query(Wallet).filter(Wallet.id.in_(wallet_ids)).all()
        if wallet_ids else []
    )
    return {
        "status": "SUCCESS",
        "case": _serialize_case(case, len(wallets)),
        "wallets": [
            {
                "id": w.id,
                "address": w.address,
                "chain": w.chain,
                "risk_score": w.risk_score,
                "risk_level": w.risk_level,
            }
            for w in wallets
        ],
    }
@router.patch("/{case_id}")
def update_case(case_id: int, data: dict, db: Session = Depends(get_database)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    for field in ("name", "description", "status", "analyst"):
        if field in data:
            setattr(case, field, data[field])
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    wallet_count = (
        db.query(CaseWallet).filter(CaseWallet.case_id == case.id).count()
    )
    return {"status": "SUCCESS", "case": _serialize_case(case, wallet_count)}
@router.delete("/{case_id}")
def delete_case(case_id: int, db: Session = Depends(get_database)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    db.query(CaseWallet).filter(CaseWallet.case_id == case_id).delete()
    db.delete(case)
    db.commit()
    return {"status": "SUCCESS"}
@router.post("/{case_id}/wallets")
def attach_wallet(case_id: int, data: dict, db: Session = Depends(get_database)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    wallet_id = data.get("wallet_id")
    address = (data.get("address") or "").strip()
    wallet = None
    if wallet_id:
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found.")
    elif address:
        # Auto-create the wallet if this is the first time this address
        # has been seen — previously an address typed directly into the
        # case panel (rather than one already extracted by OCR/OSINT)
        # 404'd here even though it's a perfectly valid thing to
        # investigate.
        wallet = _get_or_create_wallet(address, db)
    else:
        raise HTTPException(
            status_code=400, detail="wallet_id or address is required."
        )
    existing = db.query(CaseWallet).filter(
        CaseWallet.case_id == case_id, CaseWallet.wallet_id == wallet.id
    ).first()
    if existing:
        return {"status": "SUCCESS", "message": "Wallet already attached."}
    db.add(CaseWallet(case_id=case_id, wallet_id=wallet.id))
    case.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "SUCCESS", "message": "Wallet attached to case."}
@router.delete("/{case_id}/wallets/{wallet_id}")
def detach_wallet(case_id: int, wallet_id: int, db: Session = Depends(get_database)):
    link = db.query(CaseWallet).filter(
        CaseWallet.case_id == case_id, CaseWallet.wallet_id == wallet_id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Wallet is not attached to this case.")
    db.delete(link)
    db.commit()
    return {"status": "SUCCESS"}