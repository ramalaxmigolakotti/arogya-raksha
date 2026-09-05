"""
redis_client.py — async Redis client + caching helpers.
Mirrors services/redisService.js.
"""
import json
import warnings
from typing import Any, Optional

import redis.asyncio as aioredis
from core.config import settings

# ── Client ───────────────────────────────────────────────────────────────────
_redis: Optional[aioredis.Redis] = None
_connected: bool = False


async def get_redis() -> Optional[aioredis.Redis]:
    global _redis, _connected
    if _redis is not None:
        return _redis
    if not settings.REDIS_URL:
        warnings.warn("⚠️  REDIS_URL not set — caching disabled")
        return None
    try:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=10,
            retry_on_timeout=True,
        )
        await _redis.ping()
        _connected = True
        print("✅ Connected to Redis Cloud")
    except Exception as e:
        warnings.warn(f"⚠️  Redis connection failed: {e}")
        _redis = None
        _connected = False
    return _redis


# ── Helpers ──────────────────────────────────────────────────────────────────

async def cache_get(key: str) -> Optional[Any]:
    r = await get_redis()
    if not r:
        return None
    try:
        data = await r.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        print(f"Redis GET error: {e}")
        return None


async def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> None:
    r = await get_redis()
    if not r:
        return
    try:
        await r.set(key, json.dumps(value), ex=ttl_seconds)
    except Exception as e:
        print(f"Redis SET error: {e}")


async def cache_del(pattern: str) -> None:
    r = await get_redis()
    if not r:
        return
    try:
        if "*" in pattern:
            keys = await r.keys(pattern)
            if keys:
                await r.delete(*keys)
        else:
            await r.delete(pattern)
    except Exception as e:
        print(f"Redis DEL error: {e}")


async def redis_health() -> dict:
    r = await get_redis()
    if not r:
        return {"status": "disconnected"}
    try:
        pong = await r.ping()
        return {"status": "connected", "ping": str(pong)}
    except Exception:
        return {"status": "error"}
