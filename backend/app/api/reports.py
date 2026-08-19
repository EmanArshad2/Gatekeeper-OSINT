import io
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy.orm import Session
from app.database.connection import get_database
from app.database.models import Case, CaseWallet, Wallet
from app.database.neo4j import get_neo4j_driver
logger = logging.getLogger(__name__)
router = APIRouter()
@router.get("/reports-status")
def reports_status():
    return {
        "module": "Report Generator",
        "status": "READY",
    }
# =====================================================================
# SHARED HELPERS
# =====================================================================
def _case_wallets(case_id: int, db: Session):
    """Real wallets attached to a specific case — not the whole graph."""
    links = db.query(CaseWallet).filter(CaseWallet.case_id == case_id).all()
    wallet_ids = [link.wallet_id for link in links]
    if not wallet_ids:
        return []
    return db.query(Wallet).filter(Wallet.id.in_(wallet_ids)).all()
def _parse_wallet_ids(raw: str | None) -> list[int] | None:
    """Parses a comma-separated ?wallet_ids=1,2,3 query param."""
    if not raw:
        return None
    ids = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(int(part))
        except ValueError:
            continue
    return ids or None
def _resolve_adhoc_wallets(wallet_ids: list[int] | None, db: Session):
    """
    Resolves the wallet set for an ad-hoc (no-case) report.
    If wallet_ids is provided, scope to exactly those wallets (e.g. the
    ones a user selected on the Evidence or Wallet Intelligence page).
    If wallet_ids is omitted entirely, the report covers every wallet
    extracted so far across all sources (uploads, Telegram, X/Twitter,
    websites) — this is what powers "generate a report from everything
    I've extracted" without first creating a case.
    """
    query = db.query(Wallet)
    if wallet_ids:
        query = query.filter(Wallet.id.in_(wallet_ids))
    return query.order_by(Wallet.created_at.desc()).all()
def _fetch_graph_edges(addresses: list[str]) -> list[dict]:
    """Pulls Neo4j relationships scoped to a specific set of addresses."""
    edges = []
    if not addresses:
        return edges
    try:
        driver = get_neo4j_driver()
        with driver.session() as session:
            result = session.run(
                """
                MATCH (a)-[r]->(b)
                WHERE a.address IN $addresses OR b.address IN $addresses
                RETURN a, r, b
                LIMIT 500
                """,
                addresses=addresses,
            )
            for record in result:
                edges.append({
                    "type": record["r"].type,
                    "source": dict(record["a"]).get("address"),
                    "target": dict(record["b"]).get("address"),
                })
    except Exception as error:
        logger.warning(
            "Graph lookup failed (continuing without graph data): %s", error
        )
    return edges
def _build_report_pdf(
    *,
    report_title: str,
    subtitle_lines: list[str],
    wallets: list[Wallet],
    edges: list[dict],
    filename_hint: str,
) -> StreamingResponse:
    """
    Shared PDF builder used by both case-scoped and ad-hoc reports, so
    the two paths never drift out of sync with each other.
    """
    high_risk_wallets = [w for w in wallets if (w.risk_score or 0) >= 70]
    max_risk = max([w.risk_score or 0 for w in wallets], default=0)
    try:
        buffer = io.BytesIO()
        pdf = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        content = []
        def add_text(text, style="Normal"):
            content.append(Paragraph(str(text), styles[style]))
            content.append(Spacer(1, 8))
        add_text("Gatekeeper Forensic Investigation Report", "Title")
        add_text(f"Generated: {datetime.now(timezone.utc)}")
        add_text(report_title, "Heading2")
        for line in subtitle_lines:
            add_text(line)
        content.append(Spacer(1, 15))
        add_text("Investigation Summary", "Heading2")
        summary_table_data = [
            ["Metric", "Value"],
            ["Wallets Covered", len(wallets)],
            ["High Risk Wallets", len(high_risk_wallets)],
            ["Graph Relationships", len(edges)],
            ["Maximum Risk Score", f"{max_risk}/100"],
        ]
        table = Table(summary_table_data)
        table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]))
        content.append(table)
        content.append(Spacer(1, 20))
        add_text("Wallet Intelligence", "Heading2")
        if wallets:
            for wallet in wallets:
                add_text(f"""
Address: {wallet.address}
Chain: {wallet.chain or 'Unknown'}
Risk Score: {wallet.risk_score or 0}
Risk Level: {wallet.risk_level or 'Unknown'}
Confidence: {wallet.confidence or 0}
OCR Corrected: {'Yes' if wallet.ocr_corrected else 'No'}
""")
        else:
            add_text("No wallets are included in this report.")
        add_text("Risk Assessment", "Heading2")
        if high_risk_wallets:
            for wallet in high_risk_wallets:
                add_text(f"""
Suspicious Wallet: {wallet.address}
Risk: {wallet.risk_score}/100
Reasons: {wallet.risk_reasons or 'Not provided'}
""")
        else:
            add_text("No high-risk wallets detected in this report.")
        add_text("Blockchain Graph Analysis", "Heading2")
        add_text(f"""
Graph Relationships Found: {len(edges)}
Relationships were queried from Neo4j, scoped to the wallet addresses
included in this report.
""")
        pdf.build(content)
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                    f"attachment; filename=gatekeeper-{filename_hint}.pdf"
            }
        )
    except Exception as e:
        logger.exception("Report generation failed: %s", e)
        raise HTTPException(status_code=500, detail="Report generation failed")
# =====================================================================
# AD-HOC REPORTS (NO CASE REQUIRED)
#
# These mirror the case-scoped endpoints above, but operate directly on
# whatever wallets have been extracted so far — from uploads, Telegram,
# X/Twitter, or website OSINT — regardless of whether they've been
# organized into a case yet. Pass ?wallet_ids=1,2,3 to scope the report
# to a specific selection (e.g. from the Evidence or Wallet
# Intelligence page); omit it to cover everything extracted to date.
# =====================================================================
@router.get("/reports/summary/adhoc")
def report_summary_adhoc(
    wallet_ids: str | None = Query(default=None),
    db: Session = Depends(get_database),
):
    ids = _parse_wallet_ids(wallet_ids)
    wallets = _resolve_adhoc_wallets(ids, db)
    high_risk = [w for w in wallets if (w.risk_score or 0) >= 70]
    max_risk = max([w.risk_score or 0 for w in wallets], default=0)
    osint_matches = sum(1 for w in wallets if w.osint)
    return {
        "status": "SUCCESS",
        "case": None,
        "summary": {
            "evidence_count": len(wallets),
            "wallet_count": len(wallets),
            "risk_score": max_risk,
            "high_risk_count": len(high_risk),
            "osint_matches": osint_matches,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "scope": "selection" if ids else "all_extracted",
        },
    }
@router.post("/report/generate/adhoc")
def generate_report_adhoc(
    payload: dict | None = None,
    db: Session = Depends(get_database),
):
    payload = payload or {}
    wallet_ids = payload.get("wallet_ids")
    if isinstance(wallet_ids, list):
        wallet_ids = [int(w) for w in wallet_ids if str(w).strip().isdigit()]
    else:
        wallet_ids = None
    wallets = _resolve_adhoc_wallets(wallet_ids, db)
    if not wallets:
        raise HTTPException(
            status_code=404,
            detail=(
                "No wallets found for this report. Extract some wallet "
                "addresses first, or check your selection."
            ),
        )
    addresses = [w.address for w in wallets]
    edges = _fetch_graph_edges(addresses)
    title = payload.get("title") or "All Extracted Intelligence"
    subtitle = [
        (
            f"Scope: {len(wallets)} selected wallet(s)"
            if wallet_ids
            else f"Scope: all {len(wallets)} wallet(s) extracted to date"
        ),
        "No case was assigned to this report.",
    ]
    return _build_report_pdf(
        report_title=title,
        subtitle_lines=subtitle,
        wallets=wallets,
        edges=edges,
        filename_hint="adhoc-report",
    )
@router.get("/report/export-json/adhoc")
def export_report_json_adhoc(
    wallet_ids: str | None = Query(default=None),
    db: Session = Depends(get_database),
):
    ids = _parse_wallet_ids(wallet_ids)
    wallets = _resolve_adhoc_wallets(ids, db)
    return {
        "case": None,
        "scope": "selection" if ids else "all_extracted",
        "wallets": [
            {
                "id": w.id,
                "address": w.address,
                "chain": w.chain,
                "risk_score": w.risk_score,
                "risk_level": w.risk_level,
                "confidence": w.confidence,
                "ocr_corrected": w.ocr_corrected,
            }
            for w in wallets
        ],
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
# =====================================================================
# CASE-SCOPED REPORTS
# =====================================================================
@router.get("/reports/summary/{case_id}")
def report_summary(case_id: int, db: Session = Depends(get_database)):
    """Real summary telemetry for a specific case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    wallets = _case_wallets(case_id, db)
    high_risk = [w for w in wallets if (w.risk_score or 0) >= 70]
    max_risk = max([w.risk_score or 0 for w in wallets], default=0)
    osint_matches = sum(1 for w in wallets if w.osint)
    return {
        "status": "SUCCESS",
        "case": {
            "id": case.id,
            "name": case.name,
            "status": case.status,
        },
        "summary": {
            "evidence_count": len(wallets),
            "wallet_count": len(wallets),
            "risk_score": max_risk,
            "high_risk_count": len(high_risk),
            "osint_matches": osint_matches,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }
@router.post("/report/generate/{case_id}")
def generate_report(case_id: int, db: Session = Depends(get_database)):
    """Generates a PDF scoped to a real case's actual attached wallets."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    wallets = _case_wallets(case_id, db)
    addresses = [w.address for w in wallets]
    edges = _fetch_graph_edges(addresses)
    subtitle = [f"Case: {case.name} (ID: {case.id})"]
    if case.description:
        subtitle.append(f"Description: {case.description}")
    return _build_report_pdf(
        report_title="Case Investigation",
        subtitle_lines=subtitle,
        wallets=wallets,
        edges=edges,
        filename_hint=f"case-{case_id}",
    )
@router.get("/report/export-json/{case_id}")
def export_report_json(case_id: int, db: Session = Depends(get_database)):
    """Real JSON export scoped to a case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    wallets = _case_wallets(case_id, db)
    return {
        "case": {
            "id": case.id,
            "name": case.name,
            "description": case.description,
            "status": case.status,
        },
        "wallets": [
            {
                "address": w.address,
                "chain": w.chain,
                "risk_score": w.risk_score,
                "risk_level": w.risk_level,
                "confidence": w.confidence,
                "ocr_corrected": w.ocr_corrected,
            }
            for w in wallets
        ],
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
