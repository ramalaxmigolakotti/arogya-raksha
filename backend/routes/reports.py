"""
routes/reports.py — Upload, analyze medical reports with Groq AI, and retrieve reports
Mirrors backend/routes/reports.js
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from middleware.auth import get_current_user
from models.report import Report
from services.ai_service import call_groq_agent

router = APIRouter(prefix="/api/reports", tags=["Reports"])


class ReportAnalyzeRequest(BaseModel):
    fileUrl: Optional[str] = None
    extractedText: Optional[str] = None
    type: Optional[str] = "other"
    title: Optional[str] = "Medical Report"


@router.post("/analyze")
async def analyze_report(payload: ReportAnalyzeRequest, user: dict = Depends(get_current_user)):
    try:
        extracted = payload.extractedText or "No text provided"
        context = f"Report type: {payload.type}, Title: {payload.title}"

        ai_result = await call_groq_agent("reportAnalyzer", extracted, context)
        raw_ai_text = ai_result.get("data", "")

        analysis = {}
        try:
            parsed = json.loads(raw_ai_text)
            abnormal_count = parsed.get("abnormalCount", 0)
            analysis = {
                "summary": parsed.get("summary", ""),
                "abnormalValues": [
                    {
                        "parameter": p.get("name"),
                        "value": p.get("value"),
                        "normalRange": p.get("normalRange"),
                        "status": p.get("status"),
                    }
                    for p in parsed.get("parameters", [])
                    if p.get("status") != "normal"
                ],
                "recommendations": parsed.get("recommendations", []),
                "overallStatus": "critical" if abnormal_count > 3 else ("attention" if abnormal_count > 0 else "normal"),
            }
        except Exception:
            analysis = {"summary": raw_ai_text, "overallStatus": "attention"}

        report = Report.create(
            user_id=user["id"],
            file_url=payload.fileUrl,
            title=payload.title or "Medical Report",
            type_=payload.type or "other",
            extracted_text=payload.extractedText,
            analysis=analysis,
            ai_insights=raw_ai_text,
        )

        return {"success": True, "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my")
async def get_my_reports(user: dict = Depends(get_current_user)):
    try:
        reports = Report.find_by_user(user["id"])
        return {"success": True, "reports": reports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{report_id}")
async def get_report(report_id: str, user: dict = Depends(get_current_user)):
    try:
        report = Report.find_by_id(report_id)
        return {"success": True, "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
