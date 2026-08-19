import uuid
from pathlib import Path
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session
from app.core.correlation.engine import correlation_engine
from app.core.enrichment.engine import enrichment_engine
from app.core.graph.service import graph_service
from app.core.media import load_images
from app.core.ocr.engine import ocr_engine
from app.core.osint.engine import osint_engine
from app.core.qr.scanner import qr_scanner
from app.core.scoring.engine import risk_engine
from app.core.wallet.detector import wallet_detector
from app.core.wallet.validator import wallet_validator
from app.database.connection import get_database
from app.database.models import (
    AuditLog,
    Extraction,
    Media,
    Wallet,
)
router = APIRouter()
# ============================================================
# EVIDENCE STORAGE
# ============================================================
STORAGE_DIR = (
    Path(__file__).resolve().parents[2]
    / "storage"
    / "evidence"
)
STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)
# ============================================================
# HELPERS
# ============================================================
def safe_filename(filename: str | None) -> str:
    """
    Prevent directory traversal and keep only the original
    filename portion.
    """
    name = Path(filename or "evidence").name
    if not name:
        name = "evidence"
    return name
def save_evidence_file(
    content: bytes,
    filename: str,
) -> Path:
    """
    Save the original uploaded evidence using a unique filename.
    """
    original_name = safe_filename(filename)
    unique_name = (
        f"{uuid.uuid4().hex}_{original_name}"
    )
    destination = STORAGE_DIR / unique_name
    destination.write_bytes(content)
    return destination
def delete_evidence_file(path: Path | None) -> None:
    """
    Remove an evidence file if processing fails.
    """
    if path is None:
        return
    try:
        if path.exists():
            path.unlink()
    except Exception as error:
        print(
            f"[WARNING] Could not remove evidence file "
            f"{path}: {error}"
        )
def add_audit_log(
    db: Session,
    action: str,
    details: dict,
    actor: str = "System",
    module: str = "Evidence",
    target: str = "",
    status: str = "SUCCESS",
):
    log = AuditLog(
        action=action,
        actor=actor,
        target=target,
        module=module,
        status=status,
        details=details,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    print(
        f"[AUDIT] {log.id} | {action}"
    )
# ============================================================
# MEDIA EXTRACTION
# ============================================================
@router.post("/extract-media")
async def extract_media(
    file: UploadFile = File(...),
    db: Session = Depends(get_database),
):
    stored_path: Path | None = None
    try:
        # ----------------------------------------------------
        # 1. RECEIVE FILE
        # ----------------------------------------------------
        original_filename = safe_filename(
            file.filename
        )
        print(
            f"\n[EXTRACTION] Processing: "
            f"{original_filename}"
        )
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty.",
            )
        print(
            f"[EXTRACTION] File size: "
            f"{len(content):,} bytes"
        )
        # ----------------------------------------------------
        # 2. SAVE ORIGINAL EVIDENCE
        # ----------------------------------------------------
        stored_path = save_evidence_file(
            content,
            original_filename,
        )
        print(
            f"[EVIDENCE] Stored: "
            f"{stored_path}"
        )
        # ----------------------------------------------------
        # 3. LOAD MEDIA
        # ----------------------------------------------------
        images = load_images(content)
        if not images:
            delete_evidence_file(stored_path)
            stored_path = None
            raise HTTPException(
                status_code=400,
                detail="Invalid or unsupported evidence file.",
            )
        page_count = len(images)
        print(
            f"[MEDIA] Loaded {page_count} page(s)"
        )
        # ----------------------------------------------------
        # 4. OCR + QR + WALLET DETECTION
        # ----------------------------------------------------
        page_texts = []
        all_qr_codes = []
        combined_text_parts = []
        # address -> first page where it appeared
        wallet_first_page = {}
        # Keep detected wallets here so we don't run
        # wallet detection a second time on the combined text.
        detected_wallets = []
        # Prevent duplicate wallets across pages.
        detected_addresses = set()
        for page_number, page_image in enumerate(
            images,
            start=1,
        ):
            print(
                f"[PAGE {page_number}/{page_count}] "
                f"Processing..."
            )
            # ---------------- OCR ----------------
            page_text = (
                ocr_engine.extract_text(
                    page_image
                )
                or ""
            )
            page_texts.append(page_text)
            # ---------------- QR ----------------
            page_qr_codes = (
                qr_scanner.scan(
                    page_image
                )
                or []
            )
            all_qr_codes.extend(
                page_qr_codes
            )
            # ---------------- Combined page text ----------------
            page_combined = page_text
            if page_qr_codes:
                page_combined += (
                    "\n"
                    + "\n".join(
                        page_qr_codes
                    )
                )
            combined_text_parts.append(
                page_combined
            )
            # ---------------- Wallet detection ----------------
            page_wallets = (
                wallet_detector.detect(
                    page_combined
                )
                or []
            )
            for wallet in page_wallets:
                address = wallet.get(
                    "address"
                )
                if not address:
                    continue
                if address in detected_addresses:
                    continue
                detected_addresses.add(
                    address
                )
                wallet_first_page[
                    address
                ] = page_number
                wallet["page_number"] = (
                    page_number
                )
                detected_wallets.append(
                    wallet
                )
        # ----------------------------------------------------
        # 5. COMBINE OCR DATA
        # ----------------------------------------------------
        text = "\n".join(
            page_texts
        )
        qr_codes = all_qr_codes
        combined_text = "\n".join(
            combined_text_parts
        )
        print(
            f"[OCR] Text extracted: "
            f"{len(text):,} characters"
        )
        print(
            f"[QR] Codes detected: "
            f"{len(qr_codes)}"
        )
        print(
            f"[WALLET] Unique wallets detected: "
            f"{len(detected_wallets)}"
        )
        # ----------------------------------------------------
        # 6. WALLET VALIDATION / RISK / ENRICHMENT
        # ----------------------------------------------------
        validated_wallets = []
        for wallet in detected_wallets:
            address = wallet.get(
                "address"
            )
            print(
                f"[WALLET] Processing: "
                f"{address}"
            )
            wallet = (
                wallet_validator.validate(
                    wallet
                )
            )
            wallet = (
                risk_engine.calculate(
                    wallet,
                    "file_upload",
                )
            )
            wallet = (
                enrichment_engine.enrich(
                    wallet
                )
            )
            wallet = (
                osint_engine.enrich(
                    wallet
                )
            )
            wallet["page_number"] = (
                wallet_first_page.get(
                    wallet.get("address"),
                    wallet.get(
                        "page_number",
                        1,
                    ),
                )
            )
            validated_wallets.append(
                wallet
            )
        # ----------------------------------------------------
        # 7. CORRELATION
        # ----------------------------------------------------
        correlation_result = (
            correlation_engine.correlate(
                combined_text,
                validated_wallets,
            )
        )
        # ----------------------------------------------------
        # 8. SAVE MEDIA RECORD
        # ----------------------------------------------------
        media_record = Media(
            filename=original_filename,
            file_type=file.content_type,
            file_size=len(content),
            file_path=str(stored_path),
            source_type="upload",
        )
        db.add(
            media_record
        )
        db.commit()
        db.refresh(
            media_record
        )
        print(
            f"[DATABASE] Media created: "
            f"{media_record.id}"
        )
        # ----------------------------------------------------
        # 9. AUDIT: EVIDENCE UPLOADED
        # ----------------------------------------------------
        add_audit_log(
            db,
            action="Evidence Uploaded",
            actor="Analyst",
            module="Evidence",
            target=original_filename,
            details={
                "filename": original_filename,
                "media_id": media_record.id,
                "file_size": len(content),
                "file_type": file.content_type,
                "page_count": page_count,
            },
        )
        # ----------------------------------------------------
        # 10. EXTRACTION RECORD
        # ----------------------------------------------------
        highest_risk = max(
            (
                w.get(
                    "risk_score",
                    0,
                )
                for w in validated_wallets
            ),
            default=0,
        )
        extraction_record = Extraction(
            media_id=media_record.id,
            ocr_text=text,
            wallet_count=len(
                validated_wallets
            ),
            highest_risk=highest_risk,
            page_count=page_count,
        )
        db.add(
            extraction_record
        )
        db.commit()
        db.refresh(
            extraction_record
        )
        print(
            f"[DATABASE] Extraction created: "
            f"{extraction_record.id}"
        )
        # ----------------------------------------------------
        # 11. AUDIT: OCR COMPLETE
        # ----------------------------------------------------
        add_audit_log(
            db,
            action="OCR Extraction Completed",
            actor="Analyst",
            module="Extraction",
            target=extraction_record.id,
            details={
                "wallets_found": len(
                    validated_wallets
                ),
                "highest_risk": highest_risk,
                "extraction_id": extraction_record.id,
                "page_count": page_count,
                "qr_codes": len(qr_codes),
            },
        )
        # ----------------------------------------------------
        # 12. ENTITIES
        # ----------------------------------------------------
        entities = []
        entities.extend(
            correlation_result.get(
                "telegram_users",
                [],
            )
        )
        entities.extend(
            correlation_result.get(
                "emails",
                [],
            )
        )
        entities.extend(
            correlation_result.get(
                "phones",
                [],
            )
        )
        entities.extend(
            correlation_result.get(
                "websites",
                [],
            )
        )
        # ----------------------------------------------------
        # 13. WALLET DATABASE + GRAPH
        # ----------------------------------------------------
        for wallet in validated_wallets:
            wallet_record = Wallet(
                extraction_id=(
                    extraction_record.id
                ),
                address=wallet["address"],
                chain=wallet["chain"],
                valid=wallet["valid"],
                confidence=wallet[
                    "confidence"
                ],
                risk_score=wallet.get(
                    "risk_score",
                    0,
                ),
                risk_level=wallet.get(
                    "risk_level",
                    "LOW",
                ),
                page_number=wallet.get(
                    "page_number",
                    1,
                ),
                ocr_corrected=wallet.get(
                    "ocr_corrected",
                    False,
                ),
            )
            db.add(
                wallet_record
            )
            # ---------------- Neo4j ----------------
            graph_service.create_media_graph(
                original_filename,
                wallet,
                source="file_upload",
            )
            graph_service.create_entity_links(
                wallet["address"],
                entities,
            )
        # Wallet-to-wallet relationships
        graph_service.create_wallet_links(
            validated_wallets
        )
        db.commit()
        # ----------------------------------------------------
        # 14. AUDIT: GRAPH UPDATED
        # ----------------------------------------------------
        add_audit_log(
            db,
            action="Neo4j Graph Updated",
            actor="System",
            module="Graph",
            target=original_filename,
            details={
                "media_id": media_record.id,
                "wallets": len(
                    validated_wallets
                ),
                "entities": len(
                    entities
                ),
            },
        )
        # ----------------------------------------------------
        # 15. RESPONSE
        # ----------------------------------------------------
        return {
            "status": "SUCCESS",
            "filename": original_filename,
            "media_id": media_record.id,
            "evidence_id": (
                f"EV-{media_record.id:04d}"
            ),
            "ocr_text": text,
            "qr_codes": qr_codes,
            "wallets": validated_wallets,
            "wallet_count": len(
                validated_wallets
            ),
            "page_count": page_count,
            "telegram_users": (
                correlation_result.get(
                    "telegram_users",
                    [],
                )
            ),
            "emails": (
                correlation_result.get(
                    "emails",
                    [],
                )
            ),
            "phones": (
                correlation_result.get(
                    "phones",
                    [],
                )
            ),
            "websites": (
                correlation_result.get(
                    "websites",
                    [],
                )
            ),
        }
    except HTTPException:
        raise
    except Exception as error:
        db.rollback()
        print(
            "\n[EXTRACTION ERROR]"
        )
        print(
            f"{type(error).__name__}: "
            f"{error}"
        )
        delete_evidence_file(
            stored_path
        )
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )