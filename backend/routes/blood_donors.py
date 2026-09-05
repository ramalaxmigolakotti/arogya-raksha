"""
routes/blood_donors.py — Register blood donor, search donors, toggle availability
Mirrors backend/routes/bloodDonors.js
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Any

from middleware.auth import get_current_user
from models.blood_donor import BloodDonor
from models.user import User

router = APIRouter(prefix="/api/blood-donors", tags=["Blood Donors"])


class RegisterDonorRequest(BaseModel):
    bloodGroup: str
    phone: str
    city: Optional[str] = None
    state: Optional[str] = None
    location: Optional[Any] = None


class AvailabilityRequest(BaseModel):
    available: bool


@router.post("/register")
async def register_donor(payload: RegisterDonorRequest, user: dict = Depends(get_current_user)):
    try:
        user_id = user["id"]
        donor = BloodDonor.find_by_user(user_id)

        if donor:
            updates = {
                "blood_group": payload.bloodGroup,
                "phone": payload.phone,
                "city": payload.city,
                "state": payload.state,
            }
            if payload.location is not None:
                updates["location"] = payload.location
            donor = BloodDonor.update(donor["id"], updates)
        else:
            donor = BloodDonor.create(
                user_id=user_id,
                blood_group=payload.bloodGroup,
                phone=payload.phone,
                city=payload.city,
                state=payload.state,
                location=payload.location,
            )

        return {"success": True, "donor": donor}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_donors(bloodGroup: Optional[str] = None, city: Optional[str] = None):
    try:
        filters = {}
        if bloodGroup:
            filters["bloodGroup"] = bloodGroup
        if city:
            filters["city"] = city

        donors = BloodDonor.search(filters)
        enriched = []
        for d in donors:
            u = User.find_by_id(d["user_id"]) if d.get("user_id") else None
            enriched.append({
                **d,
                "user": {"id": u["id"], "name": u.get("name")} if u else None
            })

        return {"success": True, "donors": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/availability")
async def toggle_availability(payload: AvailabilityRequest, user: dict = Depends(get_current_user)):
    try:
        donor = BloodDonor.update_by_user(user["id"], {"available": payload.available})
        return {"success": True, "donor": donor}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
