"""
routes/healthshare.py — Community medical equipment sharing, donations, volunteers, and requests
Mirrors backend/routes/healthshare.js
"""
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Any

from core.supabase_client import supabase

router = APIRouter(prefix="/api/healthshare", tags=["HealthShare"])


class CreateResourceRequest(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    condition: Optional[str] = "good"
    type: Optional[str] = "donate"
    price: Optional[float] = 0.0
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact_phone: Optional[str] = None


class RegisterVolunteerRequest(BaseModel):
    full_name: str
    role: str
    skills: Optional[List[str]] = []
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    availability: Optional[Any] = {}


class CreateResourceRequestModel(BaseModel):
    resource_id: str
    message: Optional[str] = None
    contact_phone: Optional[str] = None


@router.post("/resources")
async def create_resource(payload: CreateResourceRequest, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        data = payload.model_dump()
        data["posted_by"] = x_user_id
        data["status"] = "available"

        res = supabase.from_("healthshare_resources").insert([data]).select().single().execute()
        return {"success": True, "resource": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resources")
async def list_resources(
    category: Optional[str] = None,
    city: Optional[str] = None,
    type: Optional[str] = None,
    q: Optional[str] = None,
):
    try:
        query = supabase.from_("healthshare_resources").select("*").eq("status", "available").order("created_at", desc=True).limit(50)
        if category:
            query = query.eq("category", category)
        if city:
            query = query.ilike("city", f"%{city}%")
        if type:
            query = query.eq("type", type)
        if q:
            query = query.ilike("title", f"%{q}%")

        res = query.execute()
        return {"success": True, "resources": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_healthshare_stats(x_user_id: Optional[str] = Header(None)):
    try:
        my_res = supabase.from_("healthshare_resources").select("id").eq("posted_by", x_user_id or "").eq("status", "available").execute() if x_user_id else None
        all_res = supabase.from_("healthshare_resources").select("id").eq("status", "available").execute()
        vol_res = supabase.from_("healthshare_volunteers").select("id").eq("status", "active").execute()
        req_res = supabase.from_("healthshare_requests").select("id").eq("status", "pending").execute()

        return {
            "success": True,
            "stats": {
                "my_shared": len(my_res.data or []) if my_res else 0,
                "available_resources": len(all_res.data or []),
                "volunteers": len(vol_res.data or []),
                "active_requests": len(req_res.data or []),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/volunteers")
async def register_volunteer(payload: RegisterVolunteerRequest, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        data = payload.model_dump()
        data["user_id"] = x_user_id
        data["status"] = "active"

        res = supabase.from_("healthshare_volunteers").insert([data]).select().single().execute()
        return {"success": True, "volunteer": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/volunteers")
async def list_volunteers(city: Optional[str] = None, role: Optional[str] = None):
    try:
        query = supabase.from_("healthshare_volunteers").select("*").eq("status", "active").order("created_at", desc=True).limit(50)
        if city:
            query = query.ilike("city", f"%{city}%")
        if role:
            query = query.eq("role", role)

        res = query.execute()
        return {"success": True, "volunteers": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests")
async def request_resource(payload: CreateResourceRequestModel, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        data = {
            "requested_by": x_user_id,
            "resource_id": payload.resource_id,
            "message": payload.message,
            "contact_phone": payload.contact_phone,
            "status": "pending",
        }
        res = supabase.from_("healthshare_requests").insert([data]).select().single().execute()
        return {"success": True, "request": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
