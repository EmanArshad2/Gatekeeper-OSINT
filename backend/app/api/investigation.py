from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
)
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database.connection import get_database
from app.database.models import Wallet
from app.core.graph.service import graph_service
from app.core.investigation.engine import investigation_engine
from app.core.wallet.detector import wallet_detector
from app.core.wallet.validator import wallet_validator
import logging
logger = logging.getLogger(__name__)
router = APIRouter()
def _detect_chain(address: str) -> str:
    """Best-effort chain classification for an address typed by an
    analyst directly rather than one produced by the OCR/OSINT
    extraction pipeline."""
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
    """Same fallback used by /api/cases/{id}/wallets: if this address
    hasn't been seen by any collector yet, create it instead of 404ing.
    This is what let the "OR INVESTIGATE ONE SPECIFIC ADDRESS" box (and
    case-attached addresses that were typed in manually) actually run —
    before this, investigating any address not already sitting in the
    `wallets` table failed with 404 "Wallet not found", which is the
    "I've done the functionality but it's still not working" symptom.
    """
    address = (address or "").strip()
    wallet = (
        db.query(Wallet)
        .filter(func.lower(Wallet.address) == address.lower())
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
@router.get("/investigate/case/{case_id}")
def get_case_investigation(case_id: str):
    """
    Returns the persisted investigation graph for a case, straight from
    Neo4j — this endpoint was being called by the frontend
    (InvestigationControls.loadCaseInvestigation) but never existed on
    the backend, so every request 404'd and the UI silently fell back
    to whatever was cached in the browser's localStorage. That meant a
    completed investigation looked "gone" on refresh, in a different
    browser, or on a different machine, even though the data was safely
    in Neo4j the whole time.
    The response shape below deliberately mirrors what
    POST /api/investigate/{address} already returns (status/root/depth/
    nodes-as-count/edges-as-count/result{...with arrays...}), because
    the frontend's applyInvestigationResult() was written against that
    exact shape for the live-investigation flow and reuses it here.
    """
    case_id = str(case_id or "").strip()
    if not case_id:
        raise HTTPException(status_code=400, detail="case_id is required")
    try:
        graph_data = graph_service.get_case_investigation_graph(case_id)
    except Exception as e:
        logger.exception(
            "Case investigation retrieval failed | case_id=%s", case_id
        )
        raise HTTPException(
            status_code=500,
            detail=f"Case investigation retrieval failed: {str(e)}",
        )
    nodes = (graph_data or {}).get("nodes") or []
    edges = (graph_data or {}).get("edges") or []
    if not graph_data or graph_data.get("status") != "SUCCESS" or not nodes:
        return {
            "status": "NOT_FOUND",
            "case_id": case_id,
            "investigation": None,
        }
    case_meta = graph_data.get("case") or {}
    root = case_meta.get("root", "")
    depth = case_meta.get("depth", 0)
    return {
        "status": "SUCCESS",
        "case_id": case_id,
        "investigation": {
            "status": "SUCCESS",
            "case_id": case_id,
            "root": root,
            "depth": depth,
            "nodes": len(nodes),
            "edges": len(edges),
            "result": {
                "root": root,
                "depth": depth,
                "nodes": nodes,
                "edges": edges,
                "node_count": len(nodes),
                "edge_count": len(edges),
            },
        },
    }
@router.post("/investigate/{address}")
def investigate_wallet(
    address: str,
    depth: int = 1,
    case_id: str | None = None,
    db: Session = Depends(get_database),
):
    # =========================================================
    # NORMALIZE INPUT
    # =========================================================
    address = str(address or "").strip()
    if not address:
        raise HTTPException(
            status_code=400,
            detail="Wallet address is required",
        )
    if not case_id:
        raise HTTPException(
            status_code=400,
            detail="case_id is required for investigation",
        )
    case_id = str(case_id).strip()
    address_key = address.lower()
    logger.info(
        "Investigation request | case=%s | address=%s | depth=%s",
        case_id,
        address,
        depth,
    )
    # =========================================================
    # VALIDATE DEPTH
    # =========================================================
    if depth < 1 or depth > 3:
        raise HTTPException(
            status_code=400,
            detail="Investigation depth must be between 1 and 3",
        )
    # =========================================================
    # FIND OR CREATE WALLET
    # =========================================================
    # Previously this raised a 404 for any address that hadn't already
    # been extracted by a collector, which is why typing a fresh
    # address into "INVESTIGATE ONE SPECIFIC ADDRESS" (or attaching one
    # to a case that wasn't extracted yet) silently failed.
    wallet = _get_or_create_wallet(address, db)
    # =========================================================
    # NORMALIZE WALLET
    # =========================================================
    wallet_address = str(
        wallet.address
    ).strip()
    wallet_chain = str(
        wallet.chain or "ethereum"
    ).strip().lower()
    risk_score = float(
        wallet.risk_score
        if wallet.risk_score is not None
        else 50
    )
    # =========================================================
    # RUN INVESTIGATION
    # =========================================================
    try:
        investigation = investigation_engine.investigate(
            address=wallet_address,
            chain=wallet_chain,
            risk_score=risk_score,
            depth=depth,
        )
    except Exception as e:
        logger.exception(
            "Investigation engine failed | case=%s | address=%s",
            case_id,
            wallet_address,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Investigation engine failed: {str(e)}",
        )
    if investigation is None:
        raise HTTPException(
            status_code=500,
            detail="Investigation engine returned no result",
        )
    # =========================================================
    # PERSIST INVESTIGATION
    # =========================================================
    try:
        graph_service.ingest_investigation(
            investigation=investigation,
            case_id=case_id,
        )
    except Exception as e:
        logger.exception(
            "Graph persistence failed | case=%s | address=%s",
            case_id,
            wallet_address,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Graph persistence failed: {str(e)}",
        )
    # =========================================================
    # RESPONSE
    # =========================================================
    node_count = len(
        getattr(
            investigation,
            "nodes",
            [],
        )
        or []
    )
    edge_count = len(
        getattr(
            investigation,
            "edges",
            [],
        )
        or []
    )
    investigation_root = str(
        getattr(
            investigation,
            "root",
            wallet_address,
        )
        or wallet_address
    ).strip().lower()
    logger.info(
        (
            "Investigation completed | "
            "case=%s | root=%s | nodes=%s | edges=%s | depth=%s"
        ),
        case_id,
        investigation_root,
        node_count,
        edge_count,
        depth,
    )
    return {
        "status": "SUCCESS",
        "case_id": case_id,
        "root": investigation_root,
        "depth": depth,
        "nodes": node_count,
        "edges": edge_count,
        "graph_updated": True,
        "result": investigation,
    }