"""
config.py — centralised settings using Pydantic BaseSettings.
All env vars are read from .env (or the real environment on Render).
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Server ──────────────────────────────────────────────────
    PORT: int = 5000
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Supabase ─────────────────────────────────────────────────
    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_KEY: str = "placeholder-key"

    # ── Auth ──────────────────────────────────────────────────────
    JWT_SECRET: str = "default-secret"
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""

    # ── Redis ─────────────────────────────────────────────────────
    REDIS_URL: str = ""

    # ── AI / Groq ─────────────────────────────────────────────────
    GROQ_API_KEY: str = "demo-key"

    # ── Cloudinary ────────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # ── Firebase ──────────────────────────────────────────────────
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_PRIVATE_KEY_ID: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_CLIENT_ID: str = ""

    # ── Email ─────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "Arogya Raksha <onboarding@resend.dev>"

    # ── Twilio ────────────────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"

    # ── Google Maps ────────────────────────────────────────────────
    GOOGLE_MAPS_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
