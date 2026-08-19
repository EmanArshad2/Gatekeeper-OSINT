from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel, Field
router = APIRouter(
    prefix="/settings",
    tags=["Settings"],
)
# ============================================================
# SETTINGS MODEL
# ============================================================
class SettingsUpdate(BaseModel):
    desktop_notifications: bool | None = None
    threat_notifications: bool | None = None
    auto_refresh: bool | None = None
    audit_logging: bool | None = None
    anonymous_telemetry: bool | None = None
    postgres_url: str | None = Field(default=None, min_length=1)
    neo4j_url: str | None = Field(default=None, min_length=1)
# ============================================================
# DEFAULT SETTINGS
# ============================================================
settings_store: dict[str, Any] = {
    "desktop_notifications": True,
    "threat_notifications": True,
    "auto_refresh": True,
    "audit_logging": True,
    "anonymous_telemetry": False,
    "postgres_url": "localhost:5432",
    "neo4j_url": "bolt://localhost:7687",
}
# ============================================================
# GET SETTINGS
# ============================================================
@router.get("")
def get_settings():
    """
    Return the current Gatekeeper configuration.
    """
    return {
        "status": "SUCCESS",
        "settings": settings_store,
    }
# ============================================================
# UPDATE SETTINGS
# ============================================================
@router.post("")
def update_settings(data: SettingsUpdate):
    """
    Update Gatekeeper settings.
    Only supported settings are accepted.
    Unknown fields are ignored automatically by Pydantic.
    """
    update_data = data.model_dump(
        exclude_none=True
    )
    if update_data:
        settings_store.update(update_data)
    return {
        "status": "SUCCESS",
        "message": "Settings updated successfully.",
        "settings": settings_store,
    }
# ============================================================
# TEST DATABASE CONNECTIONS
# ============================================================
@router.get("/test-db")
def test_database():
    """
    Verify that PostgreSQL and Neo4j connection
    configuration values are present.
    NOTE:
    This currently validates configuration only.
    Actual database connectivity testing can be added
    once the Settings phase is complete.
    """
    postgres_url = settings_store.get("postgres_url")
    neo4j_url = settings_store.get("neo4j_url")
    postgres_configured = bool(
        postgres_url and postgres_url.strip()
    )
    neo4j_configured = bool(
        neo4j_url and neo4j_url.strip()
    )
    if not postgres_configured or not neo4j_configured:
        return {
            "status": "ERROR",
            "message": "One or more database connections are not configured.",
            "postgres": postgres_configured,
            "neo4j": neo4j_configured,
        }
    return {
        "status": "SUCCESS",
        "message": "Database connection configuration is valid.",
        "postgres": True,
        "neo4j": True,
    }