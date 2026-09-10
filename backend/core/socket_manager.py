"""
socket_manager.py — Socket.io singleton (mirrors ioInstance.js).
"""
from typing import Optional
import socketio

_sio: Optional[socketio.AsyncServer] = None


def set_sio(sio: socketio.AsyncServer) -> None:
    global _sio
    _sio = sio


def get_sio() -> Optional[socketio.AsyncServer]:
    return _sio
