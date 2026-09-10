"""
routes/doctor_profiles.py — Doctor profiles CRUD, image uploads to Cloudinary, and search
Mirrors backend/routes/doctorProfiles.js
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Any

from middleware.auth import get_current_user
from core.supabase_client import supabase
from services.cloudinary_service import upload_to_cloudinary, delete_from_cloudinary

router = APIRouter(prefix="/api/doctor-profiles", tags=["Doctor Profiles"])
TABLE = "doctor_profiles"


class CreateDoctorProfileRequest(BaseModel):
    name: str
    phone: str
    location: str
    specialization: Optional[str] = ""
    qualification: Optional[str] = ""
    experience: Optional[int] = 0
    consultationFee: Optional[float] = 0.0
    hospitalName: Optional[str] = ""
    hospitalImage: Optional[str] = ""
    profileImage: Optional[str] = ""
    bio: Optional[str] = ""
    languages: Optional[List[str]] = []


class UpdateDoctorProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[int] = None
    consultationFee: Optional[float] = None
    hospitalName: Optional[str] = None
    hospitalImage: Optional[str] = None
    profileImage: Optional[str] = None
    bio: Optional[str] = None
    languages: Optional[List[str]] = None
    isAvailable: Optional[bool] = None


@router.get("")
@router.get("/")
async def list_doctors(
    search: Optional[str] = None,
    location: Optional[str] = None,
    specialization: Optional[str] = None,
):
    try:
        query = supabase.from_(TABLE).select("*").eq("is_available", True).order("created_at", desc=True)
        if specialization:
            query = query.ilike("specialization", f"%{specialization}%")
        if location:
            query = query.ilike("location", f"%{location}%")

        res = query.execute()
        doctors = res.data or []

        if search:
            q = search.lower()
            doctors = [
                d for d in doctors
                if q in (d.get("name") or "").lower() or
                q in (d.get("location") or "").lower() or
                q in (d.get("specialization") or "").lower() or
                q in (d.get("hospital_name") or "").lower()
            ]

        return {"success": True, "doctors": doctors}
    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "doctors": []}
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me")
async def get_my_doctor_profile(user: dict = Depends(get_current_user)):
    try:
        res = supabase.from_(TABLE).select("*").eq("user_id", user["id"]).execute()
        profile = res.data[0] if res.data else None
        return {"success": True, "profile": profile}
    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "profile": None}
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{doc_id}")
async def get_doctor_by_id(doc_id: str):
    try:
        res = supabase.from_(TABLE).select("*").eq("id", doc_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Doctor not found.")
        return {"success": True, "doctor": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
@router.post("/")
async def create_doctor_profile(payload: CreateDoctorProfileRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    try:
        # Check existing
        existing = supabase.from_(TABLE).select("id").eq("user_id", user_id).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail="You already have a doctor profile. Please edit it instead.")

        hospital_image_url = ""
        if payload.hospitalImage and payload.hospitalImage.startswith("data:"):
            try:
                res = upload_to_cloudinary(payload.hospitalImage, folder=f"arogya-raksha/doctors/{user_id}/hospital", resource_type="image")
                hospital_image_url = res.get("url", "")
            except Exception as e:
                print(f"Hospital image upload failed: {e}")

        profile_image_url = ""
        if payload.profileImage and payload.profileImage.startswith("data:"):
            try:
                res = upload_to_cloudinary(payload.profileImage, folder=f"arogya-raksha/doctors/{user_id}/profile", resource_type="image")
                profile_image_url = res.get("url", "")
            except Exception as e:
                print(f"Profile image upload failed: {e}")

        insert_data = {
            "user_id": user_id,
            "name": payload.name,
            "phone": payload.phone,
            "location": payload.location,
            "specialization": payload.specialization or "",
            "qualification": payload.qualification or "",
            "experience": payload.experience or 0,
            "consultation_fee": payload.consultationFee or 0.0,
            "hospital_name": payload.hospitalName or "",
            "hospital_image": hospital_image_url,
            "profile_image": profile_image_url,
            "bio": payload.bio or "",
            "languages": payload.languages or [],
        }

        res = supabase.from_(TABLE).insert(insert_data).select().single().execute()
        return {"success": True, "profile": res.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("")
@router.put("/")
async def update_my_doctor_profile(payload: UpdateDoctorProfileRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    try:
        existing_res = supabase.from_(TABLE).select("*").eq("user_id", user_id).execute()
        if not existing_res.data:
            raise HTTPException(status_code=404, detail="No profile found. Create one first.")
        existing = existing_res.data[0]

        updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if payload.name is not None:
            updates["name"] = payload.name
        if payload.phone is not None:
            updates["phone"] = payload.phone
        if payload.location is not None:
            updates["location"] = payload.location
        if payload.specialization is not None:
            updates["specialization"] = payload.specialization
        if payload.qualification is not None:
            updates["qualification"] = payload.qualification
        if payload.experience is not None:
            updates["experience"] = payload.experience
        if payload.consultationFee is not None:
            updates["consultation_fee"] = payload.consultationFee
        if payload.hospitalName is not None:
            updates["hospital_name"] = payload.hospitalName
        if payload.bio is not None:
            updates["bio"] = payload.bio
        if payload.languages is not None:
            updates["languages"] = payload.languages
        if payload.isAvailable is not None:
            updates["is_available"] = payload.isAvailable

        if payload.hospitalImage and payload.hospitalImage.startswith("data:"):
            try:
                res = upload_to_cloudinary(payload.hospitalImage, folder=f"arogya-raksha/doctors/{user_id}/hospital", resource_type="image")
                updates["hospital_image"] = res.get("url", "")
            except Exception as e:
                print(f"Hospital image upload failed: {e}")

        if payload.profileImage and payload.profileImage.startswith("data:"):
            try:
                res = upload_to_cloudinary(payload.profileImage, folder=f"arogya-raksha/doctors/{user_id}/profile", resource_type="image")
                updates["profile_image"] = res.get("url", "")
            except Exception as e:
                print(f"Profile image upload failed: {e}")

        res = supabase.from_(TABLE).update(updates).eq("user_id", user_id).select().single().execute()
        return {"success": True, "profile": res.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("")
@router.delete("/")
async def delete_my_doctor_profile(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    try:
        existing_res = supabase.from_(TABLE).select("*").eq("user_id", user_id).execute()
        if not existing_res.data:
            raise HTTPException(status_code=404, detail="No profile found.")
        existing = existing_res.data[0]

        if existing.get("hospital_image"):
            try:
                pub_id = existing["hospital_image"].split("/upload/")[1].rsplit(".", 1)[0]
                delete_from_cloudinary(pub_id)
            except Exception:
                pass

        if existing.get("profile_image"):
            try:
                pub_id = existing["profile_image"].split("/upload/")[1].rsplit(".", 1)[0]
                delete_from_cloudinary(pub_id)
            except Exception:
                pass

        supabase.from_(TABLE).delete().eq("user_id", user_id).execute()
        return {"success": True, "message": "Profile deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
