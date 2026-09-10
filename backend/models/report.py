"""Report model wrapping Supabase table 'reports'"""
from typing import Optional, Dict, Any, List
from core.supabase_client import supabase

TABLE = "reports"


class Report:
    @classmethod
    def create(cls, user_id: str, file_url: Optional[str] = None, title: Optional[str] = None,
               type_: Optional[str] = "other", extracted_text: Optional[str] = None,
               analysis: Optional[Dict[str, Any]] = None, ai_insights: Optional[str] = None):
        payload = {
            "user_id": user_id,
            "type": type_ or "other",
            "title": title or "Medical Report",
            "file_url": file_url,
            "extracted_text": extracted_text,
            "analysis": analysis or {},
            "ai_insights": ai_insights,
        }
        res = supabase.from_(TABLE).insert(payload).select().single().execute()
        return res.data

    @classmethod
    def find_by_user(cls, user_id: str) -> List[Dict[str, Any]]:
        res = supabase.from_(TABLE).select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data or []

    @classmethod
    def find_by_id(cls, report_id: str):
        res = supabase.from_(TABLE).select("*").eq("id", report_id).execute()
        return res.data[0] if res.data else None
