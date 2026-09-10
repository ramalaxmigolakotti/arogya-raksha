"""
firebase_admin.py — Firebase Admin SDK for push notifications.
Mirrors services/firebaseAdmin.js.
"""
from typing import Optional
import firebase_admin
from firebase_admin import credentials, messaging
from core.config import settings

_app: Optional[firebase_admin.App] = None
_configured = False


def _init() -> None:
    global _app, _configured
    if _app:
        return
    if not (settings.FIREBASE_PROJECT_ID and settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL):
        print("⚠️  Firebase credentials not set — push notifications disabled")
        return
    try:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "client_id": settings.FIREBASE_CLIENT_ID,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        _app = firebase_admin.initialize_app(cred)
        _configured = True
        print("✅ Firebase Admin SDK initialized")
    except Exception as e:
        print(f"⚠️  Firebase init failed: {e}")


_init()


def is_configured() -> bool:
    return _configured


def send_multicast(tokens: list[str], title: str, body: str, data: Optional[dict] = None) -> dict:
    """Send push notification to multiple device tokens."""
    if not _configured or not tokens:
        return {"success_count": 0, "failure_count": 0}
    try:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            tokens=tokens,
        )
        response = messaging.send_each_for_multicast(message)
        return {
            "success_count": response.success_count,
            "failure_count": response.failure_count,
        }
    except Exception as e:
        print(f"[FCM] Push failed: {e}")
        return {"success_count": 0, "failure_count": len(tokens)}
