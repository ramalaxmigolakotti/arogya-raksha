"""routes/auth.py — POST /api/auth/register, /login, GET /api/auth/verify"""
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt
import bcrypt

from core.config import settings
from core.supabase_client import supabase
from services.email_service import send_welcome_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _make_token(user_id: str, role: str = "patient") -> str:
    payload = {
        "userId": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def _sanitize(user: dict) -> dict:
    return {k: v for k, v in user.items() if k != "password"}


# ── Models ────────────────────────────────────────────────────────────────────

class RegisterBody(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "patient"
    phone: Optional[str] = None
    licenseId: Optional[str] = None
    specialization: Optional[str] = None


class LoginBody(BaseModel):
    email: str
    password: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(body: RegisterBody):
    try:
        # Check existing
        existing = supabase.from_("users").select("id").eq("email", body.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Email already registered.")

        hashed = _hash_password(body.password)
        result = supabase.from_("users").insert([{
            "name": body.name,
            "email": body.email,
            "password": hashed,
            "role": body.role or "patient",
            "phone": body.phone,
        }]).select().single().execute()
        user = result.data

        # Doctor profile
        if body.role == "doctor":
            supabase.from_("doctors").insert([{
                "user_id": user["id"],
                "license_id": body.licenseId,
                "specialization": body.specialization or "General Medicine",
            }]).execute()

        token = _make_token(user["id"], user["role"])

        # Send welcome email (non-blocking)
        asyncio.create_task(asyncio.to_thread(
            send_welcome_email, body.email, body.name, body.role or "patient"
        ))

        return {"success": True, "token": token, "user": _sanitize(user)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login")
async def login(body: LoginBody):
    try:
        result = supabase.from_("users").select("*").eq("email", body.email).single().execute()
        if not result.data:
            raise HTTPException(status_code=400, detail="Invalid credentials.")
        user = result.data

        if not _check_password(body.password, user.get("password", "")):
            raise HTTPException(status_code=400, detail="Invalid credentials.")

        token = _make_token(user["id"], user["role"])

        doctor_profile = None
        if user["role"] == "doctor":
            dp = supabase.from_("doctors").select("*").eq("user_id", user["id"]).single().execute()
            doctor_profile = dp.data

        return {"success": True, "token": token, "user": _sanitize(user), "doctorProfile": doctor_profile}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/verify")
async def verify(authorization: Optional[str] = None):
    from fastapi import Header
    if not authorization:
        raise HTTPException(status_code=401, detail="No token.")
    token = authorization.replace("Bearer ", "").strip()
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id = decoded.get("userId")
        result = supabase.from_("users").select("*").eq("id", user_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="Invalid token.")
        return {"success": True, "user": _sanitize(result.data)}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token.")
