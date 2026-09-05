"""BloodDonor model wrapping Supabase table 'blood_donors'"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from core.supabase_client import supabase

TABLE = "blood_donors"


class BloodDonor:
    @classmethod
    def create(cls, user_id: str, blood_group: str, phone: str, city: Optional[str] = None,
               state: Optional[str] = None, location: Optional[Dict[str, Any]] = None):
        payload = {
            "user_id": user_id,
            "blood_group": blood_group,
            "phone": phone,
            "city": city,
            "state": state,
            "location": location or {},
        }
        res = supabase.from_(TABLE).insert(payload).select().single().execute()
        return res.data

    @classmethod
    def find_by_user(cls, user_id: str):
        res = supabase.from_(TABLE).select("*").eq("user_id", user_id).execute()
        return res.data[0] if res.data else None

    @classmethod
    def update(cls, donor_id: str, updates: Dict[str, Any]):
        payload = {**updates, "updated_at": datetime.now(timezone.utc).isoformat()}
        res = supabase.from_(TABLE).update(payload).eq("id", donor_id).select().single().execute()
        return res.data

    @classmethod
    def update_by_user(cls, user_id: str, updates: Dict[str, Any]):
        payload = {**updates, "updated_at": datetime.now(timezone.utc).isoformat()}
        res = supabase.from_(TABLE).update(payload).eq("user_id", user_id).select().single().execute()
        return res.data

    @classmethod
    def search(cls, filters: Optional[Dict[str, Any]] = None, limit: int = 50) -> List[Dict[str, Any]]:
        filters = filters or {}
        query = supabase.from_(TABLE).select("*").eq("available", True)
        if filters.get("bloodGroup"):
            query = query.eq("blood_group", filters["bloodGroup"])
        if filters.get("city"):
            query = query.ilike("city", f"%{filters['city']}%")
        res = query.limit(limit).execute()
        return res.data or []
