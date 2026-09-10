"""
routes/hospitals.py — Hospital search, nearby locator, stats, and details
Mirrors backend/routes/hospitals.js
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from models.hospital import Hospital

router = APIRouter(prefix="/api/hospitals", tags=["Hospitals"])


@router.get("")
@router.get("/")
async def search_hospitals(
    city: Optional[str] = None,
    state: Optional[str] = None,
    department: Optional[str] = None,
    emergency: Optional[str] = None,
    ambulance: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    minBeds: Optional[int] = None,
    limit: int = 50,
):
    try:
        filters = {}
        if city:
            filters["city"] = city
        if state:
            filters["state"] = state
        if department:
            filters["department"] = department
        if emergency == "true":
            filters["emergency"] = True
        if ambulance == "true":
            filters["ambulance"] = True
        if type:
            filters["type"] = type
        if search:
            filters["search"] = search
        if minBeds:
            filters["minBeds"] = minBeds

        hospitals = Hospital.find_all(filters, limit=limit)
        return {"success": True, "count": len(hospitals), "hospitals": hospitals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nearby")
async def get_nearby_hospitals(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    maxDistance: float = 10000.0,
):
    try:
        if lat is None or lng is None:
            return {"success": True, "hospitals": []}
        hospitals = Hospital.find_nearby(lat, lng, max_distance=maxDistance)
        return {"success": True, "count": len(hospitals), "hospitals": hospitals}
    except Exception:
        return {"success": True, "hospitals": []}


@router.get("/stats")
async def get_hospital_stats():
    try:
        stats = Hospital.get_stats()
        return {"success": True, "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{hospital_id}")
async def get_hospital_by_id(hospital_id: str):
    try:
        hospital = Hospital.find_by_id(hospital_id)
        return {"success": True, "hospital": hospital}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
