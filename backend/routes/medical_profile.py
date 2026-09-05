"""
routes/medical_profile.py — Patient medical profile CRUD and SOS emergency card
Mirrors backend/routes/medicalProfile.js
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Any

from middleware.auth import get_current_user
from core.supabase_client import supabase

router = APIRouter(prefix="/api/medical-profile", tags=["Medical Profile"])
TABLE = "user_medical_profiles"


class MedicalProfileRequest(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    conditions: Optional[List[str]] = []
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    sugar_level_fasting: Optional[float] = None
    sugar_level_pp: Optional[float] = None
    pulse_rate: Optional[int] = None
    current_medications: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    preferred_hospitals: Optional[List[str]] = []
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    has_insurance: Optional[bool] = False
    insurance_provider: Optional[str] = None
    policy_number: Optional[str] = None
    organ_donor: Optional[bool] = False
    doctor_notes: Optional[str] = None


@router.get("")
@router.get("/")
async def get_medical_profile(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    try:
        res = supabase.from_(TABLE).select("*").eq("user_id", user_id).execute()
        if not res.data:
            return {"success": True, "profile": None, "hasProfile": False}
        return {"success": True, "profile": res.data[0], "hasProfile": True}
    except Exception as e:
        if "does not exist" in str(e):
            return {"success": True, "profile": None, "hasProfile": False}
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
@router.post("/")
async def save_medical_profile(payload: MedicalProfileRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    try:
        profile_data = payload.model_dump()
        profile_data["user_id"] = user_id

        res = supabase.from_(TABLE).upsert(profile_data, on_conflict="user_id").select().single().execute()
        return {"success": True, "profile": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/emergency-card")
async def get_emergency_card(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    try:
        res = supabase.from_(TABLE).select(
            "full_name, age, gender, blood_group, conditions, allergies, current_medications, "
            "bp_systolic, bp_diastolic, sugar_level_fasting, pulse_rate, preferred_hospitals, "
            "emergency_contact_name, emergency_contact_phone, has_insurance, insurance_provider, "
            "organ_donor, doctor_notes"
        ).eq("user_id", user_id).execute()

        if not res.data:
            return {"success": True, "card": None}

        data = res.data[0]
        bp = f"{data['bp_systolic']}/{data['bp_diastolic']} mmHg" if data.get("bp_systolic") and data.get("bp_diastolic") else None
        sugar = f"{data['sugar_level_fasting']} mg/dL (fasting)" if data.get("sugar_level_fasting") else None

        card = {
            **data,
            "bp": bp,
            "sugar": sugar,
            "conditions_summary": ", ".join(data.get("conditions") or []),
            "medications_summary": ", ".join(data.get("current_medications") or []),
            "allergies_summary": ", ".join(data.get("allergies") or []),
            "preferred_hospital_primary": (data.get("preferred_hospitals") or ["Apollo Emergency Care"])[0],
        }

        return {"success": True, "card": card}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
