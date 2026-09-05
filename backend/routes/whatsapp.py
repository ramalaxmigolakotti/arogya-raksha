"""
routes/whatsapp.py — Twilio WhatsApp triage webhook and TwiML responses
Mirrors backend/routes/whatsapp.js
"""
from fastapi import APIRouter, Request, Response, Form
from typing import Optional
from twilio.twiml.messaging_response import MessagingResponse

from core.supabase_client import supabase

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Triage"])


@router.post("/webhook")
async def whatsapp_webhook(
    Body: Optional[str] = Form(default=""),
    From: Optional[str] = Form(default=""),
):
    try:
        incoming_msg = (Body or "").lower().strip()
        from_number = From or ""
        print(f"Received WhatsApp from {from_number}: {incoming_msg}")

        twiml = MessagingResponse()

        if "help" in incoming_msg or "emergency" in incoming_msg:
            try:
                supabase.from_("whatsapp_triage").insert([{
                    "phone_number": from_number,
                    "message": Body,
                    "urgency": "high",
                    "ai_summary": "Emergency help requested.",
                }]).execute()
            except Exception as e:
                print(f"WhatsApp triage DB insert error: {e}")

            twiml.message("🚨 *Arogya-Rakhshaa AI:* We have noted your emergency. Connecting to emergency response services immediately.")

        elif "symptom" in incoming_msg:
            twiml.message("🩺 *Arogya-Rakhshaa AI:* Please list your symptoms one by one (e.g., Fever, Cough, Chest Pain).")

        else:
            try:
                supabase.from_("whatsapp_triage").insert([{
                    "phone_number": from_number,
                    "message": Body,
                    "urgency": "low",
                    "ai_summary": "General inquiry.",
                }]).execute()
            except Exception as e:
                print(f"WhatsApp triage DB insert error: {e}")

            twiml.message("Welcome to *Arogya-Rakhshaa AI*!\nHow can I assist you today?\n\nReply with:\n1️⃣ *Help* for emergencies\n2️⃣ *Symptoms* for AI triage")

        return Response(content=str(twiml), media_type="text/xml")
    except Exception as e:
        print(f"Error in WhatsApp webhook: {e}")
        return Response(content="<Response><Message>Service error</Message></Response>", media_type="text/xml")
