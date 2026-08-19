from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.connection import get_database
from app.database.models import Media, Extraction, Wallet
router = APIRouter()
# ================================================================
# EVIDENCE STORAGE
# ================================================================
BACKEND_ROOT = Path(__file__).resolve().parents[2]
STORAGE_DIR = BACKEND_ROOT / "storage" / "evidence"
# ================================================================
# HELPERS
# ================================================================
def get_media_by_id(
    media_id: int,
    db: Session,
):
    media = (
        db.query(Media)
        .filter(Media.id == media_id)
        .first()
    )
    if not media:
        raise HTTPException(
            status_code=404,
            detail="Evidence record not found",
        )
    return media
def get_file_type(content_type: str | None) -> str:
    if not content_type:
        return "Unknown"
    content_type = content_type.lower()
    if "pdf" in content_type:
        return "PDF"
    if "image" in content_type:
        return "Image"
    if "video" in content_type:
        return "Video"
    if "audio" in content_type:
        return "Audio"
    if "html" in content_type:
        return "HTML"
    return content_type.split("/")[-1].upper()
def format_file_size(file_size: int | None) -> str:
    if file_size is None:
        return "Unknown"
    if file_size >= 1024 * 1024:
        return f"{file_size / (1024 * 1024):.2f} MB"
    if file_size >= 1024:
        return f"{file_size / 1024:.2f} KB"
    return f"{file_size} B"
# ================================================================
# RESOLVE EVIDENCE FILE
# ================================================================
def resolve_evidence_file(media: Media) -> Path | None:
    """
    Resolve the actual physical evidence file.
    We try several possible locations because older database
    records may contain absolute paths, relative paths, or paths
    from an older storage configuration.
    """
    candidates: list[Path] = []
    # 1. Path stored in database
    if media.file_path:
        stored_path = Path(str(media.file_path))
        # Absolute DB path
        if stored_path.is_absolute():
            candidates.append(stored_path)
        # Relative to backend root
        candidates.append(BACKEND_ROOT / stored_path)
        # Relative to current working directory
        candidates.append(stored_path)
        # Relative to evidence storage
        candidates.append(STORAGE_DIR / stored_path.name)
    # 2. Standard evidence storage
    if media.filename:
        candidates.append(
            STORAGE_DIR / media.filename
        )
    # Return first existing regular file
    seen: set[str] = set()
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            key = str(resolved).lower()
            if key in seen:
                continue
            seen.add(key)
            if resolved.is_file():
                return resolved
        except (OSError, RuntimeError):
            continue
    return None
# ================================================================
# GET EVIDENCE REGISTER
# ================================================================
@router.get("/evidence")
def get_evidence(
    db: Session = Depends(get_database),
):
    media_files = (
        db.query(
            Media.id,
            Media.filename,
            Media.file_type,
            Media.file_size,
            Media.file_path,
            Media.created_at,
        )
        .order_by(Media.created_at.desc())
        .all()
    )
    files = []
    for media in media_files:
        # --------------------------------------------------------
        # Resolve physical file
        # --------------------------------------------------------
        resolved_path = resolve_evidence_file(media)
        file_exists = resolved_path is not None
        # --------------------------------------------------------
        # If the DB does not have a file size, get it from disk
        # --------------------------------------------------------
        actual_size = media.file_size
        if actual_size is None and resolved_path:
            try:
                actual_size = resolved_path.stat().st_size
            except OSError:
                actual_size = None
        # --------------------------------------------------------
        # Evidence record
        # --------------------------------------------------------
        files.append(
            {
                "id": f"EV-{media.id:04d}",
                "media_id": media.id,
                "file": media.filename,
                "type": get_file_type(media.file_type),
                "uploaded": media.created_at,
                "size": format_file_size(actual_size),
                "view_url": (
                    f"/api/evidence/{media.id}/view"
                ),
                "download_url": (
                    f"/api/evidence/{media.id}/download"
                ),
                "available": file_exists,
            }
        )
    return {
        "status": "SUCCESS",
        "files": files,
    }
# ================================================================
# VIEW EVIDENCE
# ================================================================
@router.get("/evidence/{media_id}/view")
def view_evidence(
    media_id: int,
    db: Session = Depends(get_database),
):
    media = get_media_by_id(
        media_id,
        db,
    )
    file_path = resolve_evidence_file(media)
    if file_path is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Evidence file not found on disk. "
                f"Expected file: {media.filename}"
            ),
        )
    return FileResponse(
        path=str(file_path),
        media_type=(
            media.file_type
            or "application/octet-stream"
        ),
        filename=media.filename,
        content_disposition_type="inline",
    )
# ================================================================
# DOWNLOAD EVIDENCE
# ================================================================
@router.get("/evidence/{media_id}/download")
def download_evidence(
    media_id: int,
    db: Session = Depends(get_database),
):
    media = get_media_by_id(
        media_id,
        db,
    )
    file_path = resolve_evidence_file(media)
    if file_path is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Evidence file not found on disk. "
                f"Expected file: {media.filename}"
            ),
        )
    return FileResponse(
        path=str(file_path),
        media_type=(
            media.file_type
            or "application/octet-stream"
        ),
        filename=media.filename,
        content_disposition_type="attachment",
    )
# ================================================================
# WALLETS EXTRACTED FROM A SPECIFIC EVIDENCE ITEM
# ================================================================
# Evidence rows only carry media_id/file metadata — the wallets found
# in that file live on the Wallet table, linked via Extraction.media_id
# -> Extraction.id -> Wallet.extraction_id. This endpoint resolves that
# chain so a "Generate Report" button can sit on each individual
# evidence row, scoped to just what was found in that one file, instead
# of only being reachable case-wide or across everything ever extracted.
@router.get("/evidence/{media_id}/wallets")
def get_evidence_wallets(
    media_id: int,
    db: Session = Depends(get_database),
):
    get_media_by_id(media_id, db)  # 404s if the evidence doesn't exist
    extraction_ids = [
        row.id
        for row in db.query(Extraction)
        .filter(Extraction.media_id == media_id)
        .all()
    ]
    wallets = (
        db.query(Wallet)
        .filter(Wallet.extraction_id.in_(extraction_ids))
        .all()
        if extraction_ids
        else []
    )
    return {
        "status": "SUCCESS",
        "media_id": media_id,
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