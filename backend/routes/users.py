"""routes/users.py — GET/PUT /api/users/profile, PUT /api/users/health-profile"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

from middleware.auth import get_current_user
from core.supabase_client import supabase

router = APIRouter(prefix="/api/users", tags=["users"])

ALLOWED_UPDATES = {"name", "phone", "avatar", "health_profile", "preferred_language", "location"}


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    health_profile: Optional[Any] = None
    healthProfile: Optional[Any] = None
    preferred_language: Optional[str] = None
    preferredLanguage: Optional[str] = None
    location: Optional[Any] = None


@router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    try:
        return {"success": True, "user": {k: v for k, v in user.items() if k != "password"}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    try:
        updates = {}
        data = body.model_dump(exclude_none=True)
        for key in ALLOWED_UPDATES:
            if key in data:
                updates[key] = data[key]
        if "healthProfile" in data:
            updates["health_profile"] = data["healthProfile"]
        if "preferredLanguage" in data:
            updates["preferred_language"] = data["preferredLanguage"]

        result = supabase.from_("users").update(updates).eq("id", user["id"]).select().single().execute()
        return {"success": True, "user": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/health-profile")
async def update_health_profile(body: dict, user: dict = Depends(get_current_user)):
    try:
        result = supabase.from_("users").update({"health_profile": body}).eq("id", user["id"]).select().single().execute()
        return {"success": True, "user": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
