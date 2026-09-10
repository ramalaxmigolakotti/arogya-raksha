"""Chat and Message models wrapping Supabase 'chats' and 'messages' tables"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from core.supabase_client import supabase

CHATS_TABLE = "chats"
MESSAGES_TABLE = "messages"


class Chat:
    @classmethod
    def create(cls, participants: List[str], chat_type: str = "general"):
        payload = {
            "participants": participants,
            "chat_type": chat_type,
        }
        res = supabase.from_(CHATS_TABLE).insert(payload).select().single().execute()
        return res.data

    @classmethod
    def find_by_participant(cls, user_id: str) -> List[Dict[str, Any]]:
        res = (supabase.from_(CHATS_TABLE)
               .select("*")
               .contains("participants", [user_id])
               .order("last_message_at", desc=True)
               .execute())
        return res.data or []

    @classmethod
    def find_by_participants(cls, user_id1: str, user_id2: str) -> Optional[Dict[str, Any]]:
        res = (supabase.from_(CHATS_TABLE)
               .select("*")
               .contains("participants", [user_id1, user_id2])
               .limit(1)
               .execute())
        return res.data[0] if res.data else None

    @classmethod
    def find_by_id(cls, chat_id: str) -> Optional[Dict[str, Any]]:
        res = supabase.from_(CHATS_TABLE).select("*").eq("id", chat_id).execute()
        return res.data[0] if res.data else None

    @classmethod
    def add_message(cls, chat_id: str, sender_id: str, content: str, msg_type: str = "text", file_url: Optional[str] = None):
        msg_payload = {
            "chat_id": chat_id,
            "sender_id": sender_id,
            "content": content,
            "type": msg_type,
            "file_url": file_url,
        }
        res = supabase.from_(MESSAGES_TABLE).insert(msg_payload).select().single().execute()
        msg_data = res.data

        now_iso = datetime.now(timezone.utc).isoformat()
        supabase.from_(CHATS_TABLE).update({
            "last_message": content,
            "last_message_at": now_iso,
            "updated_at": now_iso,
        }).eq("id", chat_id).execute()

        return msg_data

    @classmethod
    def get_messages(cls, chat_id: str) -> List[Dict[str, Any]]:
        res = (supabase.from_(MESSAGES_TABLE)
               .select("*")
               .eq("chat_id", chat_id)
               .order("created_at", desc=False)
               .execute())
        return res.data or []
