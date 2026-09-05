"""Appointment model wrapping Supabase table 'appointments'"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from core.supabase_client import supabase

TABLE = "appointments"


class Appointment:
    @classmethod
    def create(cls, data: Dict[str, Any]):
        payload = {
            "patient_id": data.get("patientId") or data.get("patient_id"),
            "patient_name": data.get("patientName") or data.get("patient_name"),
            "patient_email": data.get("patientEmail") or data.get("patient_email"),
            "patient_phone": data.get("patientPhone") or data.get("patient_phone"),
            "doctor_id": data.get("doctorId") or data.get("doctor_id"),
            "hospital_id": data.get("hospitalId") or data.get("hospital_id"),
            "date": data.get("date"),
            "time_slot": data.get("timeSlot") or data.get("time_slot") or {},
            "department": data.get("department"),
            "reason": data.get("reason"),
        }
        res = supabase.from_(TABLE).insert(payload).select().single().execute()
        return res.data

    @classmethod
    def find_by_patient(cls, patient_id: str) -> List[Dict[str, Any]]:
        res = supabase.from_(TABLE).select("*").eq("patient_id", patient_id).order("date", desc=True).execute()
        return res.data or []

    @classmethod
    def find_all(cls) -> List[Dict[str, Any]]:
        res = supabase.from_(TABLE).select("*").order("date", desc=True).execute()
        return res.data or []

    @classmethod
    def find_by_id(cls, apt_id: str):
        res = supabase.from_(TABLE).select("*").eq("id", apt_id).execute()
        return res.data[0] if res.data else None

    @classmethod
    def update_status(cls, apt_id: str, status: str):
        payload = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
        res = supabase.from_(TABLE).update(payload).eq("id", apt_id).select().single().execute()
        return res.data

    @classmethod
    def update_payment(cls, apt_id: str, payment_proof: str):
        payload = {
            "payment_proof": payment_proof,
            "payment_status": "uploaded",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        res = supabase.from_(TABLE).update(payload).eq("id", apt_id).select().single().execute()
        return res.data
