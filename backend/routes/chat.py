"""
routes/chat.py — Direct messaging, chat listing, and message history
Mirrors backend/routes/chat.js
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from middleware.auth import get_current_user
from models.chat import Chat
from models.user import User

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class StartChatRequest(BaseModel):
    targetUserId: str
    chatType: Optional[str] = "general"


@router.get("")
@router.get("/")
async def get_my_chats(user: dict = Depends(get_current_user)):
    try:
        user_id = user["id"]
        chats = Chat.find_by_participant(user_id)

        enriched = []
        for c in chats:
            participants = []
            for pid in c.get("participants", []):
                u = User.find_by_id(pid)
                if u:
                    participants.append({
                        "id": u["id"],
                        "name": u.get("name"),
                        "avatar": u.get("avatar"),
                        "role": u.get("role"),
                    })
            enriched.append({**c, "participants": participants})

        return {"success": True, "chats": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start")
async def start_chat(payload: StartChatRequest, user: dict = Depends(get_current_user)):
    try:
        user_id = user["id"]
        chat = Chat.find_by_participants(user_id, payload.targetUserId)
        if not chat:
            chat = Chat.create(
                participants=[user_id, payload.targetUserId],
                chat_type=payload.chatType or "general",
            )

        participants = []
        for pid in (chat.get("participants") or []):
            u = User.find_by_id(pid)
            if u:
                participants.append({
                    "id": u["id"],
                    "name": u.get("name"),
                    "avatar": u.get("avatar"),
                    "role": u.get("role"),
                })

        return {"success": True, "chat": {**chat, "participants": participants}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{chat_id}/messages")
async def get_chat_messages(chat_id: str, user: dict = Depends(get_current_user)):
    try:
        messages = Chat.get_messages(chat_id)
        enriched = []
        for m in messages:
            sender = User.find_by_id(m["sender_id"]) if m.get("sender_id") else None
            enriched.append({
                **m,
                "sender": {
                    "id": sender["id"],
                    "name": sender.get("name"),
                    "avatar": sender.get("avatar"),
                } if sender else None
            })

        return {"success": True, "messages": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
