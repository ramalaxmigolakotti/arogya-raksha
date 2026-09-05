"""
routes/predict.py — Disease prediction metadata, CSV stats, and AI/ML risk prediction engine
Mirrors and extends backend/routes/predict.js
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from services.predictor_datasets import load_all, get_stats
from services.ml_models import (
    predict_diabetes_heart,
    predict_dengue,
    predict_kidney,
    predict_liver,
    predict_lung,
    predict_cancer,
    predict_thyroid,
    predict_asthma,
    predict_mental_health,
)

router = APIRouter(prefix="/api/predict", tags=["Disease Predictors"])

PREDICTORS_META = [
    {
        "id": "diabetes-heart",
        "name": "Diabetes & Heart Risk",
        "description": "Analyzes glucose levels, BMI, blood pressure and lifestyle to predict diabetes & cardiovascular risk using Framingham Heart Study data.",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "unit": "years", "min": 1, "max": 120},
            {"key": "glucose", "label": "Glucose Level", "type": "number", "unit": "mg/dL", "min": 50, "max": 400},
            {"key": "bmi", "label": "BMI", "type": "number", "unit": "kg/m²", "min": 10, "max": 60},
            {"key": "blood_pressure", "label": "Blood Pressure (Systolic)", "type": "number", "unit": "mmHg", "min": 60, "max": 250},
            {"key": "insulin", "label": "Insulin Level", "type": "number", "unit": "μU/mL", "min": 0, "max": 900},
            {"key": "cholesterol", "label": "Cholesterol", "type": "number", "unit": "mg/dL", "min": 100, "max": 400},
            {"key": "smoking", "label": "Do you smoke?", "type": "select", "options": ["No", "Occasionally", "Daily"]},
            {"key": "family_history", "label": "Family History of Diabetes/Heart Disease?", "type": "select", "options": ["No", "Yes"]},
        ],
    },
    {
        "id": "dengue",
        "name": "Dengue Fever Risk",
        "description": "Assesses dengue fever risk based on symptoms, platelet count and mosquito exposure history.",
        "fields": [
            {"key": "fever", "label": "High Fever (>38.5°C)?", "type": "select", "options": ["No", "Yes"]},
            {"key": "headache", "label": "Severe Headache?", "type": "select", "options": ["No", "Mild", "Severe"]},
            {"key": "joint_pain", "label": "Joint / Muscle Pain?", "type": "select", "options": ["No", "Yes"]},
            {"key": "rash", "label": "Skin Rash?", "type": "select", "options": ["No", "Yes"]},
            {"key": "platelet", "label": "Platelet Count (if tested)", "type": "number", "unit": "K/μL", "min": 0, "max": 500},
            {"key": "area", "label": "High mosquito-prone area?", "type": "select", "options": ["No", "Yes"]},
            {"key": "days", "label": "Days since symptoms began", "type": "number", "unit": "days", "min": 0, "max": 20},
        ],
    },
    {
        "id": "kidney",
        "name": "Kidney Disease Risk",
        "description": "Evaluates kidney function through creatinine, urea, and urine analysis markers.",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "unit": "years", "min": 1, "max": 120},
            {"key": "creatinine", "label": "Serum Creatinine", "type": "number", "unit": "mg/dL", "min": 0.1, "max": 20},
            {"key": "urea", "label": "Blood Urea", "type": "number", "unit": "mg/dL", "min": 5, "max": 300},
            {"key": "sodium", "label": "Sodium Level", "type": "number", "unit": "mEq/L", "min": 100, "max": 200},
            {"key": "potassium", "label": "Potassium Level", "type": "number", "unit": "mEq/L", "min": 2, "max": 8},
            {"key": "hemoglobin", "label": "Hemoglobin", "type": "number", "unit": "g/dL", "min": 3, "max": 20},
            {"key": "diabetes", "label": "Diabetic?", "type": "select", "options": ["No", "Yes"]},
            {"key": "hypertension", "label": "Hypertension?", "type": "select", "options": ["No", "Yes"]},
        ],
    },
    {
        "id": "liver",
        "name": "Liver Disease Risk",
        "description": "Analyses liver enzymes, bilirubin and protein levels for early liver disease detection.",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "unit": "years", "min": 1, "max": 120},
            {"key": "bilirubin", "label": "Total Bilirubin", "type": "number", "unit": "mg/dL", "min": 0.1, "max": 50},
            {"key": "direct_bilirubin", "label": "Direct Bilirubin", "type": "number", "unit": "mg/dL", "min": 0, "max": 25},
            {"key": "alt", "label": "ALT (SGPT)", "type": "number", "unit": "U/L", "min": 0, "max": 2000},
            {"key": "ast", "label": "AST (SGOT)", "type": "number", "unit": "U/L", "min": 0, "max": 2000},
            {"key": "albumin", "label": "Albumin", "type": "number", "unit": "g/dL", "min": 0, "max": 10},
            {"key": "alcohol", "label": "Alcohol consumption?", "type": "select", "options": ["No", "Occasionally", "Regularly"]},
        ],
    },
    {
        "id": "lung",
        "name": "Lung Disease Risk",
        "description": "Predicts risk of COPD and pulmonary diseases based on smoking history, symptoms and exposure.",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "unit": "years", "min": 1, "max": 120},
            {"key": "smoking", "label": "Smoking?", "type": "select", "options": ["Never", "Ex-smoker", "Current Smoker"]},
            {"key": "years_smoked", "label": "Years smoked (0 if never)", "type": "number", "unit": "years", "min": 0, "max": 60},
            {"key": "breathlessness", "label": "Breathlessness?", "type": "select", "options": ["No", "On exertion", "At rest"]},
            {"key": "cough", "label": "Chronic cough?", "type": "select", "options": ["No", "Yes"]},
            {"key": "dust_exposure", "label": "Occupational dust/chemical exposure?", "type": "select", "options": ["No", "Yes"]},
            {"key": "spo2", "label": "SpO2 (Oxygen Saturation)", "type": "number", "unit": "%", "min": 70, "max": 100},
        ],
    },
    {
        "id": "cancer",
        "name": "Cancer Risk Screening",
        "description": "Assesses general cancer risk based on lifestyle, family history and key biomarkers.",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "unit": "years", "min": 1, "max": 120},
            {"key": "gender", "label": "Gender", "type": "select", "options": ["Male", "Female", "Other"]},
            {"key": "family_history", "label": "Family history of cancer?", "type": "select", "options": ["No", "Yes"]},
            {"key": "smoking", "label": "Smoking?", "type": "select", "options": ["No", "Occasionally", "Daily"]},
            {"key": "alcohol", "label": "Alcohol?", "type": "select", "options": ["No", "Occasionally", "Regularly"]},
            {"key": "obesity", "label": "Overweight/Obese?", "type": "select", "options": ["No", "Yes"]},
            {"key": "radiation", "label": "Radiation exposure history?", "type": "select", "options": ["No", "Yes"]},
        ],
    },
    {
        "id": "thyroid",
        "name": "Thyroid Risk",
        "description": "Evaluates thyroid function and risk of thyroid disorders using TSH, T3, T4 levels and symptoms.",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "unit": "years", "min": 1, "max": 120},
            {"key": "gender", "label": "Gender", "type": "select", "options": ["Male", "Female"]},
            {"key": "tsh", "label": "TSH Level", "type": "number", "unit": "mIU/L", "min": 0, "max": 30},
            {"key": "t3", "label": "T3 Level", "type": "number", "unit": "ng/dL", "min": 50, "max": 250},
            {"key": "t4", "label": "T4 Level", "type": "number", "unit": "μg/dL", "min": 1, "max": 20},
            {"key": "neck_swelling", "label": "Neck swelling / lump?", "type": "select", "options": ["No", "Yes"]},
            {"key": "fatigue", "label": "Chronic fatigue / weight changes?", "type": "select", "options": ["No", "Yes"]},
        ],
    },
    {
        "id": "asthma",
        "name": "Asthma Risk",
        "description": "Predicts asthma likelihood based on allergy history, breathing patterns and environment.",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "unit": "years", "min": 1, "max": 120},
            {"key": "wheeze", "label": "Wheezing?", "type": "select", "options": ["Never", "Rarely", "Often"]},
            {"key": "cough_night", "label": "Nighttime cough?", "type": "select", "options": ["No", "Yes"]},
            {"key": "breathlessness", "label": "Breathlessness on exercise?", "type": "select", "options": ["No", "Mild", "Severe"]},
            {"key": "allergies", "label": "Known allergies?", "type": "select", "options": ["No", "Yes"]},
            {"key": "family_asthma", "label": "Family history of asthma?", "type": "select", "options": ["No", "Yes"]},
            {"key": "pollution", "label": "Exposed to high pollution?", "type": "select", "options": ["No", "Yes"]},
        ],
    },
    {
        "id": "mental-health",
        "name": "Mental Health Risk",
        "description": "Screens for depression, anxiety and burnout based on sleep, mood and lifestyle patterns.",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "unit": "years", "min": 10, "max": 100},
            {"key": "sleep", "label": "Average sleep (hours/night)", "type": "number", "unit": "hours", "min": 0, "max": 16},
            {"key": "mood", "label": "Mood most days?", "type": "select", "options": ["Good", "Neutral", "Low", "Very Low"]},
            {"key": "anxiety", "label": "Anxiety / Excessive worry?", "type": "select", "options": ["No", "Sometimes", "Often"]},
            {"key": "interest", "label": "Lost interest in activities?", "type": "select", "options": ["No", "Somewhat", "Yes"]},
            {"key": "stress", "label": "Stress level", "type": "select", "options": ["Low", "Moderate", "High", "Very High"]},
            {"key": "social", "label": "Social support / family?", "type": "select", "options": ["Good", "Limited", "None"]},
        ],
    },
]


class PredictStatsRequest(BaseModel):
    predictorId: str


class PredictRunRequest(BaseModel):
    predictorId: str
    inputs: Dict[str, Any]


@router.get("")
@router.get("/")
async def list_predictors():
    try:
        csv_stats = load_all()
        predictors = [
            {
                **p,
                "totalPatients": (csv_stats.get(p["id"]) or {}).get("rows", 0),
                "dataFiles": (csv_stats.get(p["id"]) or {}).get("files", []),
            }
            for p in PREDICTORS_META
        ]
        return {"success": True, "predictors": predictors}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stats")
async def get_predictor_stats(payload: PredictStatsRequest):
    try:
        csv_stats = get_stats()
        s = csv_stats.get(payload.predictorId)
        if not s:
            raise HTTPException(status_code=404, detail="Predictor not found")
        return {"success": True, "stats": s}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run")
async def run_prediction(payload: PredictRunRequest):
    p_id = payload.predictorId
    inp = payload.inputs
    try:
        if p_id == "diabetes-heart":
            res = predict_diabetes_heart(
                age=float(inp.get("age", 45)),
                glucose=float(inp.get("glucose", 100)),
                bmi=float(inp.get("bmi", 24)),
                blood_pressure=float(inp.get("blood_pressure", 120)),
                insulin=float(inp.get("insulin", 80)),
                cholesterol=float(inp.get("cholesterol", 180)),
                smoking=str(inp.get("smoking", "No")),
                family_history=str(inp.get("family_history", "No")),
            )
        elif p_id == "dengue":
            res = predict_dengue(
                fever=str(inp.get("fever", "No")),
                headache=str(inp.get("headache", "No")),
                joint_pain=str(inp.get("joint_pain", "No")),
                rash=str(inp.get("rash", "No")),
                platelet=float(inp.get("platelet", 250)),
                area=str(inp.get("area", "No")),
                days=float(inp.get("days", 1)),
            )
        elif p_id == "kidney":
            res = predict_kidney(
                age=float(inp.get("age", 50)),
                creatinine=float(inp.get("creatinine", 1.0)),
                urea=float(inp.get("urea", 30)),
                sodium=float(inp.get("sodium", 140)),
                potassium=float(inp.get("potassium", 4.5)),
                hemoglobin=float(inp.get("hemoglobin", 14.0)),
                diabetes=str(inp.get("diabetes", "No")),
                hypertension=str(inp.get("hypertension", "No")),
            )
        elif p_id == "liver":
            res = predict_liver(
                age=float(inp.get("age", 45)),
                bilirubin=float(inp.get("bilirubin", 0.8)),
                direct_bilirubin=float(inp.get("direct_bilirubin", 0.2)),
                alt=float(inp.get("alt", 30)),
                ast=float(inp.get("ast", 28)),
                albumin=float(inp.get("albumin", 4.0)),
                alcohol=str(inp.get("alcohol", "No")),
            )
        elif p_id == "lung":
            res = predict_lung(
                age=float(inp.get("age", 50)),
                smoking=str(inp.get("smoking", "Never")),
                years_smoked=float(inp.get("years_smoked", 0)),
                breathlessness=str(inp.get("breathlessness", "No")),
                cough=str(inp.get("cough", "No")),
                dust_exposure=str(inp.get("dust_exposure", "No")),
                spo2=float(inp.get("spo2", 98)),
            )
        elif p_id == "cancer":
            res = predict_cancer(
                age=float(inp.get("age", 50)),
                gender=str(inp.get("gender", "Male")),
                family_history=str(inp.get("family_history", "No")),
                smoking=str(inp.get("smoking", "No")),
                alcohol=str(inp.get("alcohol", "No")),
                obesity=str(inp.get("obesity", "No")),
                radiation=str(inp.get("radiation", "No")),
            )
        elif p_id == "thyroid":
            res = predict_thyroid(
                age=float(inp.get("age", 35)),
                gender=str(inp.get("gender", "Female")),
                tsh=float(inp.get("tsh", 2.5)),
                t3=float(inp.get("t3", 120)),
                t4=float(inp.get("t4", 8.0)),
                neck_swelling=str(inp.get("neck_swelling", "No")),
                fatigue=str(inp.get("fatigue", "No")),
            )
        elif p_id == "asthma":
            res = predict_asthma(
                age=float(inp.get("age", 25)),
                wheeze=str(inp.get("wheeze", "Never")),
                cough_night=str(inp.get("cough_night", "No")),
                breathlessness=str(inp.get("breathlessness", "No")),
                allergies=str(inp.get("allergies", "No")),
                family_asthma=str(inp.get("family_asthma", "No")),
                pollution=str(inp.get("pollution", "No")),
            )
        elif p_id == "mental-health":
            res = predict_mental_health(
                age=float(inp.get("age", 30)),
                sleep=float(inp.get("sleep", 7.0)),
                mood=str(inp.get("mood", "Good")),
                anxiety=str(inp.get("anxiety", "No")),
                interest=str(inp.get("interest", "No")),
                stress=str(inp.get("stress", "Low")),
                social=str(inp.get("social", "Good")),
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown predictor: {p_id}")

        return {"success": True, "predictorId": p_id, "prediction": res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
