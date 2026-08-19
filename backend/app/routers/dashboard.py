# =====================================================
# Gatekeeper Dashboard Router
# =====================================================
from fastapi import APIRouter
from app.services.dashboard_service import get_dashboard_data
router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)
@router.get("")
async def dashboard():
    return get_dashboard_data()