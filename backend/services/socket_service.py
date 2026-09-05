"""
socket_service.py — python-socketio event handlers.
Mirrors services/socketService.js — all the same events.
"""
from typing import Dict
import socketio
from core.supabase_client import supabase

# online_users: userId → socket_id
_online_users: Dict[str, str] = {}


def register_handlers(sio: socketio.AsyncServer) -> None:
    """Register all socket event handlers onto the given AsyncServer."""

    @sio.event
    async def connect(sid, environ):
        print(f"User connected: {sid}")

    @sio.event
    async def disconnect(sid):
        # Remove from online users
        to_remove = [uid for uid, s in _online_users.items() if s == sid]
        for uid in to_remove:
            del _online_users[uid]
        await sio.emit("online_users", list(_online_users.keys()))

    @sio.on("user_online")
    async def user_online(sid, user_id):
        _online_users[user_id] = sid
        await sio.emit("online_users", list(_online_users.keys()))

    @sio.on("join_chat")
    async def join_chat(sid, chat_id):
        await sio.enter_room(sid, chat_id)

    @sio.on("send_message")
    async def send_message(sid, data):
        try:
            chat_id = data.get("chatId")
            sender_id = data.get("senderId")
            content = data.get("content")
            msg_type = data.get("type", "text")
            file_url = data.get("fileUrl")

            # Persist message to Supabase
            result = supabase.from_("messages").insert([{
                "chat_id": chat_id,
                "sender_id": sender_id,
                "content": content,
                "type": msg_type,
                "file_url": file_url,
            }]).select().single().execute()
            message = result.data or {}

            # Fetch sender info
            sender_res = supabase.from_("users").select("id,name,avatar").eq("id", sender_id).single().execute()
            sender = sender_res.data

            await sio.emit("new_message", {**message, "sender": sender}, room=chat_id)
        except Exception as e:
            print(f"Socket message error: {e}")

    @sio.on("typing")
    async def typing(sid, data):
        await sio.emit("user_typing", data, room=data.get("chatId"), skip_sid=sid)

    @sio.on("stop_typing")
    async def stop_typing(sid, data):
        await sio.emit("user_stop_typing", data, room=data.get("chatId"), skip_sid=sid)

    # ── WebRTC signaling ──────────────────────────────────────────

    @sio.on("call_user")
    async def call_user(sid, data):
        target_id = data.get("targetId")
        target_sid = _online_users.get(target_id)
        if target_sid:
            await sio.emit("incoming_call", {
                "from": data.get("from"),
                "signal": data.get("signal"),
                "callType": data.get("callType"),
            }, to=target_sid)

    @sio.on("answer_call")
    async def answer_call(sid, data):
        await sio.emit("call_accepted", data.get("signal"), to=data.get("to"))

    @sio.on("end_call")
    async def end_call(sid, data):
        target_id = data.get("targetId")
        target_sid = _online_users.get(target_id)
        if target_sid:
            await sio.emit("call_ended", to=target_sid)
