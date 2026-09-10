"""
routes/media.py — Cloudinary media upload, avatar update, doctor gallery, and direct upload signatures
Mirrors backend/routes/media.js
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from middleware.auth import get_current_user
from core.supabase_client import supabase
from core.config import settings
from core.redis_client import cache_del
from services.cloudinary_service import upload_to_cloudinary, delete_from_cloudinary, generate_upload_signature

router = APIRouter(prefix="/api/media", tags=["Media"])
TABLE = "media_uploads"


class MediaUploadRequest(BaseModel):
    fileData: str
    mediaType: Optional[str] = "image"
    title: Optional[str] = ""
    description: Optional[str] = ""


class AvatarUploadRequest(BaseModel):
    fileData: str


@router.post("/upload")
async def upload_media(payload: MediaUploadRequest, user: dict = Depends(get_current_user)):
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
        raise HTTPException(status_code=503, detail="Media uploads are not configured. Missing Cloudinary credentials.")

    if not payload.fileData:
        raise HTTPException(status_code=400, detail="No file data provided.")

    if not payload.fileData.startswith("data:"):
        raise HTTPException(status_code=400, detail="Invalid file data format. Expected a base64 data URI.")

    resource_type = "video" if payload.mediaType == "video" else "image"
    folder = f"arogya-raksha/{user.get('role', 'patient')}s/{user['id']}"

    try:
        cloud_result = upload_to_cloudinary(payload.fileData, folder=folder, resource_type=resource_type)
    except Exception as e:
        msg = str(e)
        if "Invalid API key" in msg or "unknown api key" in msg or "401" in msg:
            raise HTTPException(status_code=500, detail="Cloudinary authentication failed.")
        if "File size too large" in msg:
            raise HTTPException(status_code=413, detail="File too large for Cloudinary.")
        raise HTTPException(status_code=500, detail=f"Upload to cloud storage failed: {msg}")

    try:
        insert_data = {
            "user_id": user["id"],
            "user_name": user.get("name") or "Unknown",
            "user_role": user.get("role") or "patient",
            "media_type": resource_type,
            "url": cloud_result.get("url"),
            "thumbnail_url": cloud_result.get("thumbnail_url"),
            "public_id": cloud_result.get("public_id"),
            "title": payload.title or "",
            "description": payload.description or "",
            "format": cloud_result.get("format"),
            "width": cloud_result.get("width"),
            "height": cloud_result.get("height"),
            "bytes": cloud_result.get("bytes"),
            "duration": cloud_result.get("duration"),
        }
        res = supabase.from_(TABLE).insert(insert_data).select().single().execute()
        await cache_del("cache:/api/media/doctors/*")
        return {"success": True, "media": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/avatar")
async def update_avatar(payload: AvatarUploadRequest, user: dict = Depends(get_current_user)):
    if not settings.CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=503, detail="Cloudinary not configured.")

    if not payload.fileData:
        raise HTTPException(status_code=400, detail="No file data provided.")

    try:
        cloud_result = upload_to_cloudinary(
            payload.fileData,
            folder="arogya-raksha/avatars",
            resource_type="image",
            public_id=f"avatar-{user['id']}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Avatar upload failed: {str(e)}")

    try:
        res = supabase.from_("users").update({
            "avatar": cloud_result.get("url"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", user["id"]).select().single().execute()

        safe_user = dict(res.data) if res.data else {}
        safe_user.pop("password", None)

        return {"success": True, "user": safe_user, "avatarUrl": cloud_result.get("url")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my")
async def get_my_uploads(user: dict = Depends(get_current_user)):
    try:
        res = supabase.from_(TABLE).select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
        return {"success": True, "media": res.data or []}
    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "media": []}
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/doctors/gallery")
async def get_doctor_gallery():
    try:
        res = supabase.from_(TABLE).select("*").eq("user_role", "doctor").order("created_at", desc=True).limit(100).execute()
        return {"success": True, "media": res.data or []}
    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "media": []}
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/doctors/{user_id}")
async def get_doctor_media(user_id: str):
    try:
        res = supabase.from_(TABLE).select("*").eq("user_id", user_id).eq("user_role", "doctor").order("created_at", desc=True).execute()
        return {"success": True, "media": res.data or []}
    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "media": []}
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{media_id}")
async def delete_media(media_id: str, user: dict = Depends(get_current_user)):
    try:
        res = supabase.from_(TABLE).select("*").eq("id", media_id).single().execute()
        media = res.data
        if not media:
            raise HTTPException(status_code=404, detail="Media not found.")

        if media.get("user_id") != user["id"] and user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Unauthorized.")

        try:
            delete_from_cloudinary(media.get("public_id"), media.get("media_type"))
        except Exception:
            pass

        supabase.from_(TABLE).delete().eq("id", media_id).execute()
        await cache_del("cache:/api/media/doctors/*")
        return {"success": True, "message": "Media deleted."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sign")
async def get_upload_signature(user: dict = Depends(get_current_user)):
    try:
        folder = f"arogya-raksha/{user.get('role', 'patient')}s/{user['id']}"
        sign_data = generate_upload_signature(folder)
        return {"success": True, **sign_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
