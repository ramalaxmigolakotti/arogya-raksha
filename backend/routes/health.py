"""
routes/health.py — Health assessment routes (cost estimation & diabetes screening)
Mirrors backend/routes/health.js
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Union, Any

from services.cost_estimation import estimate_cost, screen_diabetes_risk, load_cost_data

router = APIRouter(prefix="/api/health", tags=["Health Assessments"])


class CostEstimateRequest(BaseModel):
    age: int
    sex: Optional[str] = "male"
    bmi: Optional[float] = 25.0
    smoker: Optional[Union[bool, str]] = False
    children: Optional[int] = 0


class DiabetesScreeningRequest(BaseModel):
    glucose: Optional[float] = None
    bloodPressure: Optional[float] = None
    bmi: Optional[float] = None
    age: Optional[int] = None
    pregnancies: Optional[int] = None
    insulin: Optional[float] = None
    skinThickness: Optional[float] = None


@router.post("/cost-estimate")
async def get_cost_estimate(payload: CostEstimateRequest):
    try:
        is_smoker = payload.smoker is True or str(payload.smoker).lower() in ["yes", "true", "1"]
        estimate = estimate_cost({
            "age": payload.age,
            "sex": payload.sex or "male",
            "bmi": payload.bmi if payload.bmi is not None else 25.0,
            "smoker": is_smoker,
            "children": payload.children or 0,
        })
        return {"success": True, "estimate": estimate}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/diabetes-screening")
async def get_diabetes_screening(payload: DiabetesScreeningRequest):
    try:
        screening = screen_diabetes_risk(payload.model_dump())
        return {"success": True, "screening": screening}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_health_stats():
    try:
        data = load_cost_data()
        return {
            "success": True,
            "stats": {
                "cost_dataset_records": len(data),
                "features_available": ["cost-estimate", "diabetes-screening"],
                "datasets_loaded": {
                    "medical_costs": len(data) > 0,
                    "diabetes": True,
                },
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
