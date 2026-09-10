"""
routes/medicines.py — Medicine search, letter browse, categories, alternatives, and AI medicine advisor
Mirrors backend/routes/medicines.js
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from models.medicine import Medicine
from services.ai_service import call_groq_agent

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])


class AskQuestionRequest(BaseModel):
    question: str


@router.get("/browse")
async def browse_medicines(
    letter: str = "A",
    page: int = 1,
    limit: int = 24,
):
    try:
        data = Medicine.browse(letter=letter, page=page, limit=limit)
        return {
            "success": True,
            "total": data["total"],
            "count": len(data["medicines"]),
            "medicines": data["medicines"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_medicines(
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 24,
):
    try:
        if not q:
            return {"success": True, "total": 0, "medicines": []}

        data = Medicine.search_paginated(q, page=page, limit=limit)
        if data["total"] == 0:
            ai_result = await call_groq_agent("medicineAdvisor", q)
            return {"success": True, "total": 0, "medicines": [], "aiResponse": ai_result.get("data", "")}

        return {
            "success": True,
            "total": data["total"],
            "count": len(data["medicines"]),
            "medicines": data["medicines"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories")
async def get_categories():
    try:
        categories = Medicine.get_categories()
        return {"success": True, "categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/category/{category}")
async def get_medicines_by_category(category: str):
    try:
        medicines = Medicine.find_by_category(category)
        return {"success": True, "count": len(medicines), "medicines": medicines}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alternatives/{name}")
async def get_alternatives(name: str):
    try:
        alternatives = Medicine.find_alternatives(name)
        return {
            "success": True,
            "original": name,
            "count": len(alternatives),
            "alternatives": alternatives,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask")
async def ask_medicine_ai(payload: AskQuestionRequest):
    try:
        result = await call_groq_agent("medicineAdvisor", payload.question)
        return {"success": True, "response": result.get("data", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{name}")
async def get_medicine_by_name(name: str):
    try:
        med = Medicine.find_by_name(name)
        if not med:
            ai_result = await call_groq_agent("medicineAdvisor", f"Tell me about {name}")
            return {"success": True, "medicine": None, "aiResponse": ai_result.get("data", "")}
        return {"success": True, "medicine": med}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
