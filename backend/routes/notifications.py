"""
routes/notifications.py — FCM device token registration and push notifications
Mirrors backend/routes/notifications.js
"""
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.firebase_admin import send_push_multicast, is_configured

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

device_tokens: Dict[str, List[str]] = {}


class RegisterTokenRequest(BaseModel):
    userId: str
    token: str
    platform: Optional[str] = "web"


@router.post("/register-token")
async def register_token(payload: RegisterTokenRequest):
    if not payload.userId or not payload.token:
        raise HTTPException(status_code=400, detail="userId and token required")

    tokens = device_tokens.setdefault(payload.userId, [])
    if payload.token not in tokens:
        tokens.append(payload.token)

    print(f"[FCM] Token registered for user {payload.userId} ({payload.platform}) — total: {len(tokens)}")
    return {"success": True, "message": "Token registered"}


def get_all_tokens() -> List[str]:
    all_tokens = []
    for tokens in device_tokens.values():
        all_tokens.extend(tokens)
    return list(set(all_tokens))


async def send_push_to_hospital(hospital_id: str, payload: Dict[str, Any]):
    if not is_configured():
        return

    tokens = get_all_tokens()
    if not tokens:
        return

    notification = {
        "title": payload.get("title", "🚨 Emergency SOS Alert"),
        "body": payload.get("body", "New patient incoming — action required"),
    }
    data = {
        "incidentId": str(payload.get("incidentId", "")),
        "patientName": str(payload.get("patientName", "")),
        "severity": str(payload.get("severity", "unknown")),
        "url": "/hospital/portal",
    }
    try:
        res = send_push_multicast(tokens, notification, data)
        print(f"[FCM] Push sent: {res}")
    except Exception as e:
        print(f"[FCM] Push notification failed: {e}")
