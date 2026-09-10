"""
routes/ai.py — AI health assistants (symptom checker, diabetes prediction, general chat, emergency assessment)
Mirrors backend/routes/ai.js
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any, Dict

from middleware.auth import get_current_user
from services.ai_service import call_groq_agent

router = APIRouter(prefix="/api/ai", tags=["AI Agents"])


class SymptomCheckRequest(BaseModel):
    symptoms: List[str] = []
    additionalInfo: Optional[str] = None


class DiabetesPredictRequest(BaseModel):
    symptoms: Optional[Any] = None
    sugarLevels: Optional[Any] = None
    lifestyle: Optional[Any] = None


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


class EmergencyAssessRequest(BaseModel):
    situation: str


@router.post("/symptoms")
async def check_symptoms(payload: SymptomCheckRequest, user: dict = Depends(get_current_user)):
    try:
        symptoms_str = ", ".join(payload.symptoms)
        context = f"Patient symptoms: {symptoms_str}. Additional info: {payload.additionalInfo or 'None'}"
        health_profile = json.dumps(user.get("health_profile") or {})

        result = await call_groq_agent("symptomChecker", context, health_profile)
        return {"success": True, "analysis": result.get("data", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/diabetes")
async def predict_diabetes(payload: DiabetesPredictRequest, user: dict = Depends(get_current_user)):
    try:
        context = (
            f"Symptoms: {json.dumps(payload.symptoms)}. "
            f"Sugar levels: {json.dumps(payload.sugarLevels)}. "
            f"Lifestyle: {json.dumps(payload.lifestyle)}"
        )
        health_profile = json.dumps(user.get("health_profile") or {})

        result = await call_groq_agent("diabetesPredictor", context, health_profile)
        return {"success": True, "prediction": result.get("data", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat_with_ai(payload: ChatRequest, user: dict = Depends(get_current_user)):
    try:
        result = await call_groq_agent("generalHealth", payload.message, payload.context or "")
        return {"success": True, "response": result.get("data", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/emergency-assess")
async def emergency_assess(payload: EmergencyAssessRequest):
    try:
        result = await call_groq_agent("emergencyAgent", payload.situation)
        return {"success": True, "assessment": result.get("data", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
