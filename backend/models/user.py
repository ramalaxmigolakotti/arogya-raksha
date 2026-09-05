"""User model wrapping Supabase table 'users'"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from core.supabase_client import supabase

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
TABLE = "users"


class User:
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def sanitize(user: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not user:
            return None
        safe = dict(user)
        safe.pop("password", None)
        return safe

    @classmethod
    def create(cls, name: str, email: str, password: str, role: str = "patient", phone: Optional[str] = None):
        hashed = cls.hash_password(password)
        res = supabase.from_(TABLE).insert({
            "name": name,
            "email": email.lower(),
            "password": hashed,
            "role": role,
            "phone": phone,
        }).select().single().execute()
        return cls.sanitize(res.data)

    @classmethod
    def find_by_email(cls, email: str):
        res = supabase.from_(TABLE).select("*").eq("email", email.lower()).execute()
        return res.data[0] if res.data else None

    @classmethod
    def find_by_id(cls, user_id: str):
        res = supabase.from_(TABLE).select("*").eq("id", user_id).execute()
        return res.data[0] if res.data else None

    @classmethod
    def update(cls, user_id: str, updates: Dict[str, Any]):
        update_data = {**updates, "updated_at": datetime.now(timezone.utc).isoformat()}
        res = supabase.from_(TABLE).update(update_data).eq("id", user_id).select().single().execute()
        return cls.sanitize(res.data)
