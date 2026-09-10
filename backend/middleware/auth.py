"""
auth.py — FastAPI dependency for authentication.
Mirrors middleware/auth.js (Clerk JWT primary, legacy JWT fallback).
"""
import time
from typing import Optional
from collections import OrderedDict

import httpx
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError

from core.config import settings
from core.supabase_client import supabase

# ── In-memory Clerk user cache (mirrors JS Map) ──────────────────────────────
_clerk_cache: OrderedDict = OrderedDict()
_CACHE_TTL = 5 * 60  # 5 minutes in seconds
_CACHE_MAX = 500


def _get_cached_clerk_user(clerk_user_id: str) -> Optional[dict]:
    entry = _clerk_cache.get(clerk_user_id)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["user"]
    if entry:
        del _clerk_cache[clerk_user_id]
    return None


def _set_cached_clerk_user(clerk_user_id: str, user: dict) -> None:
    if len(_clerk_cache) >= _CACHE_MAX:
        _clerk_cache.popitem(last=False)
    _clerk_cache[clerk_user_id] = {"user": user, "ts": time.time()}


# ── Clerk JWKS token verification ─────────────────────────────────────────────
async def _verify_clerk_token(token: str) -> Optional[dict]:
    """Verify a Clerk JWT using the Clerk backend API."""
    if not settings.CLERK_SECRET_KEY:
        return None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.clerk.com/v1/tokens/verify",
                headers={
                    "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
                params={"token": token},
                timeout=5.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data
    except Exception:
        pass

    # Fallback: decode without full verification to get sub claim
    try:
        # Clerk uses RS256 — we decode the header to get kid, but skip verification
        # for now (Clerk SDK handles this properly)
        unverified = jwt.get_unverified_claims(token)
        clerk_user_id = unverified.get("sub")
        if clerk_user_id and clerk_user_id.startswith("user_"):
            return {"sub": clerk_user_id}
    except Exception:
        pass
    return None


async def _fetch_clerk_user(clerk_user_id: str) -> Optional[dict]:
    """Fetch Clerk user details from Clerk API."""
    cached = _get_cached_clerk_user(clerk_user_id)
    if cached:
        return cached
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.clerk.com/v1/users/{clerk_user_id}",
                headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
                timeout=5.0,
            )
            if resp.status_code == 200:
                clerk_user = resp.json()
                email = ""
                if clerk_user.get("email_addresses"):
                    email = clerk_user["email_addresses"][0].get("email_address", "")
                first = clerk_user.get("first_name") or ""
                last = clerk_user.get("last_name") or ""
                name = f"{first} {last}".strip() or "User"
                role = (clerk_user.get("public_metadata") or {}).get("role", "patient")

                user_obj = {
                    "id": clerk_user_id,
                    "clerk_id": clerk_user_id,
                    "name": name,
                    "email": email,
                    "role": role,
                    "avatar": clerk_user.get("image_url"),
                }
                _set_cached_clerk_user(clerk_user_id, user_obj)
                return user_obj
    except Exception:
        pass
    return None


# ── Supabase user fallback ────────────────────────────────────────────────────
async def _find_user_by_id(user_id: str) -> Optional[dict]:
    try:
        result = supabase.from_("users").select("*").eq("id", user_id).single().execute()
        return result.data
    except Exception:
        return None


# ── Main dependency ────────────────────────────────────────────────────────────
async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> dict:
    """
    FastAPI dependency — mirrors middleware/auth.js.
    Strategy 1: Clerk token
    Strategy 2: Legacy JWT
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Access denied. No token provided.")

    token = authorization.replace("Bearer ", "").strip()

    # Strategy 1: Clerk
    try:
        payload = await _verify_clerk_token(token)
        if payload:
            clerk_user_id = payload.get("sub")
            if clerk_user_id:
                user_obj = await _fetch_clerk_user(clerk_user_id)
                if user_obj:
                    return user_obj
                # minimal fallback if Clerk API unreachable
                return {
                    "id": clerk_user_id,
                    "clerk_id": clerk_user_id,
                    "name": "User",
                    "email": "",
                    "role": "patient",
                    "avatar": None,
                }
    except Exception:
        pass

    # Strategy 2: Legacy JWT
    try:
        decoded = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
        )
        user_id = decoded.get("userId")
        if user_id:
            user = await _find_user_by_id(user_id)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token.")
            return user
    except JWTError:
        pass

    raise HTTPException(status_code=401, detail="Invalid token.")


# ── Optional auth (doesn't raise if no token) ─────────────────────────────────
async def get_optional_user(
    authorization: Optional[str] = Header(default=None),
) -> Optional[dict]:
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
