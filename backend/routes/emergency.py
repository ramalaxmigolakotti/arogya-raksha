"""
routes/emergency.py — SOS emergency alerts and emergency contacts
Mirrors backend/routes/emergency.js
"""
import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

from middleware.auth import get_current_user

router = APIRouter(prefix="/api/emergency", tags=["Emergency"])


class SosRequest(BaseModel):
    location: Optional[Any] = None
    message: Optional[str] = None
    emergencyContacts: Optional[Any] = None


@router.post("/sos")
async def trigger_sos(payload: SosRequest, user: dict = Depends(get_current_user)):
    try:
        print(f"🚨 SOS Alert from user {user.get('id')}: location={payload.location}, msg={payload.message}")
        return {
            "success": True,
            "message": "Emergency alert sent successfully!",
            "alert": {
                "id": str(int(time.time() * 1000)),
                "status": "dispatched",
                "nearestHospital": "AIIMS Delhi",
                "estimatedArrival": "8 minutes",
                "ambulanceNumber": "108",
                "emergencyNumber": "112",
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contacts")
async def get_emergency_contacts(user: dict = Depends(get_current_user)):
    try:
        health_profile = user.get("health_profile") or {}
        contacts = health_profile.get("emergencyContacts", [])
        return {
            "success": True,
            "contacts": contacts,
            "defaultNumbers": {
                "ambulance": "108",
                "emergency": "112",
                "poisonControl": "1800-11-6117",
                "mentalHealth": "08046110007",
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
