"""
supabase_client.py — singleton Supabase client (supabase-py).
Mirrors supabaseClient.js.
"""
import warnings
from supabase import create_client, Client
from core.config import settings

if not settings.SUPABASE_URL or settings.SUPABASE_URL == "https://placeholder.supabase.co":
    warnings.warn("⚠️  SUPABASE_URL not set. Running in demo mode.")

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY,
)
