"""Doctor model wrapping Supabase table 'doctors'"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from core.supabase_client import supabase

TABLE = "doctors"


class Doctor:
    @classmethod
    def create(cls, data: Dict[str, Any]):
        payload = {
            "user_id": data.get("userId") or data.get("user_id"),
            "license_id": data.get("licenseId") or data.get("license_id"),
            "specialization": data.get("specialization"),
            "qualification": data.get("qualification"),
            "experience": data.get("experience"),
            "hospital_id": data.get("hospitalId") or data.get("hospital_id"),
            "consultation_fee": data.get("consultationFee") or data.get("consultation_fee"),
            "languages": data.get("languages") or [],
            "bio": data.get("bio"),
        }
        res = supabase.from_(TABLE).insert(payload).select().single().execute()
        return res.data

    @classmethod
    def find_by_user_id(cls, user_id: str):
        res = supabase.from_(TABLE).select("*").eq("user_id", user_id).execute()
        return res.data[0] if res.data else None

    @classmethod
    def find_by_id(cls, doc_id: str):
        res = supabase.from_(TABLE).select("*").eq("id", doc_id).execute()
        return res.data[0] if res.data else None

    @classmethod
    def get_all(cls, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        filters = filters or {}
        query = supabase.from_(TABLE).select("*")
        if filters.get("specialization"):
            query = query.eq("specialization", filters["specialization"])
        if filters.get("verified") is not None:
            query = query.eq("verified", filters["verified"])
        res = query.execute()
        return res.data or []

    @classmethod
    def update(cls, doc_id: str, updates: Dict[str, Any]):
        payload = {**updates, "updated_at": datetime.now(timezone.utc).isoformat()}
        res = supabase.from_(TABLE).update(payload).eq("id", doc_id).select().single().execute()
        return res.data
