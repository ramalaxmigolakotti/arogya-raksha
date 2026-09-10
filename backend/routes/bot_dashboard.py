"""
routes/bot_dashboard.py — Bot status route
Mirrors backend/routes/botDashboard.js
"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/bot-dashboard", tags=["Bot Dashboard"])


@router.get("/status")
async def get_bot_status():
    return {"success": True, "status": "ok", "service": "botDashboard"}
