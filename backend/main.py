"""
main.py — FastAPI application entry point with Socket.IO, CORS, and 25 routed modules.
Replaces backend/server.js in Python.
"""
import os
import uvicorn
import socketio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.socket_manager import set_sio
from core.redis_client import redis_health
from services.socket_service import register_handlers
from services.predictor_datasets import load_all as load_predictor_datasets
from models.medicine import load_medicines

# ── Import all routes ──────────────────────────────────────────────────────────
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.hospitals import router as hospitals_router
from routes.reports import router as reports_router
from routes.medicines import router as medicines_router
from routes.ai import router as ai_router
from routes.emergency import router as emergency_router
from routes.blood_donors import router as blood_donors_router
from routes.chat import router as chat_router
from routes.orders import router as orders_router
from routes.health import router as health_router
from routes.doctor_profiles import router as doctor_profiles_router
from routes.medical_profile import router as medical_profile_router
from routes.notifications import router as notifications_router
from routes.whatsapp import router as whatsapp_router
from routes.predict import router as predict_router
from routes.bot_dashboard import router as bot_dashboard_router


# ── Socket.IO Server Setup ───────────────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
)
set_sio(sio)
register_handlers(sio)


# ── Lifespan for startup & shutdown ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Arogya Raksha Python API initializing...")
    # Preload CSV datasets in background/startup
    try:
        load_predictor_datasets()
    except Exception as e:
        print(f"⚠️ Predictor datasets preload error: {e}")

    try:
        load_medicines()
    except Exception as e:
        print(f"⚠️ Medicines dataset preload error: {e}")

    # Check Redis
    r_health = await redis_health()
    if r_health.get("status") == "connected":
        print("✅ Connected to Redis Cloud")
    else:
        print("⚠️ Redis not connected — caching disabled")

    yield
    print("🛑 Arogya Raksha Python API shutting down...")


# ── FastAPI App Setup ────────────────────────────────────────────────────────
app = FastAPI(
    title="Arogya-Rakhshaa AI Healthcare API",
    description="Python FastAPI backend powering AI triage, disease predictors, crisis coordination, elder care, and telemedicine.",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS Middleware ──────────────────────────────────────────────────────────
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]
if settings.FRONTEND_URL:
    allowed_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Server Health Check ──────────────────────────────────────────────────────
@app.get("/api/health")
@app.get("/health")
async def health_check():
    r_health = await redis_health()
    return {
        "status": "ok",
        "message": "Arogya Raksha Python API is running",
        "runtime": "Python FastAPI + scikit-learn",
        "database": "Supabase (PostgreSQL)",
        "cache": f"Redis ({r_health.get('status', 'unknown')})",
    }


# ── Include all Routers ───────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(hospitals_router)
app.include_router(reports_router)
app.include_router(medicines_router)
app.include_router(ai_router)
app.include_router(emergency_router)
app.include_router(blood_donors_router)
app.include_router(chat_router)
app.include_router(orders_router)
app.include_router(health_router)
app.include_router(doctor_profiles_router)
app.include_router(medical_profile_router)
app.include_router(notifications_router)
app.include_router(whatsapp_router)
app.include_router(predict_router)
app.include_router(bot_dashboard_router)


# ── Mount Socket.IO onto ASGI app ────────────────────────────────────────────
# The combined ASGI app serves both HTTP FastAPI routes and Socket.IO connections
app_asgi = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app,
    socketio_path="/socket.io",
)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run("main:app_asgi", host="0.0.0.0", port=port, reload=True)
