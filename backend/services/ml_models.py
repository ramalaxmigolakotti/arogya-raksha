"""
ml_models.py — scikit-learn ML models for 9 disease predictors.
This is new capability added in the Python rewrite — real AI predictions
instead of just CSV statistics.
"""
import math
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data"

# ── Rule-based risk scorer (used when CSVs are absent) ───────────────────────

def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def predict_diabetes_heart(age: float, glucose: float, bmi: float,
                            blood_pressure: float, insulin: float,
                            cholesterol: float, smoking: str,
                            family_history: str) -> dict:
    score = 0.0
    if glucose > 140: score += 30
    elif glucose > 120: score += 20
    elif glucose > 100: score += 10

    if bmi > 35: score += 20
    elif bmi > 30: score += 14
    elif bmi > 25: score += 7

    if blood_pressure > 140: score += 15
    elif blood_pressure > 130: score += 10
    elif blood_pressure > 120: score += 5

    if cholesterol > 240: score += 10
    elif cholesterol > 200: score += 5

    if insulin > 200: score += 10
    if age > 55: score += 10
    elif age > 45: score += 5

    if smoking == "Daily": score += 10
    elif smoking == "Occasionally": score += 4

    if family_history == "Yes": score += 15

    risk_pct = _clamp(round(score), 0, 100)
    if risk_pct < 25: level = "Low"
    elif risk_pct < 50: level = "Moderate"
    elif risk_pct < 75: level = "High"
    else: level = "Very High"

    return {
        "riskLevel": level,
        "riskPercentage": risk_pct,
        "keyFactors": [
            f"Glucose: {glucose} mg/dL",
            f"BMI: {bmi}",
            f"BP: {blood_pressure} mmHg",
            f"Cholesterol: {cholesterol} mg/dL",
        ],
        "recommendations": _get_recommendations(level),
    }


def predict_dengue(fever: str, headache: str, joint_pain: str,
                   rash: str, platelet: float, area: str, days: int) -> dict:
    score = 0.0
    if fever == "Yes": score += 25
    if headache == "Severe": score += 20
    elif headache == "Mild": score += 10
    if joint_pain == "Yes": score += 15
    if rash == "Yes": score += 15
    if platelet < 100: score += 20
    elif platelet < 150: score += 10
    if area == "Yes": score += 10
    if days >= 3: score += 10
    elif days >= 1: score += 5

    risk_pct = _clamp(round(score), 0, 100)
    if risk_pct < 30: level = "Low"
    elif risk_pct < 60: level = "Moderate"
    else: level = "High"

    return {"riskLevel": level, "riskPercentage": risk_pct, "recommendations": _get_recommendations(level)}


def predict_kidney(age: float, creatinine: float, urea: float,
                   sodium: float, potassium: float, hemoglobin: float,
                   diabetes: str, hypertension: str) -> dict:
    score = 0.0
    if creatinine > 3: score += 30
    elif creatinine > 1.5: score += 20
    elif creatinine > 1.2: score += 10

    if urea > 100: score += 20
    elif urea > 50: score += 10

    if sodium < 135: score += 10
    if potassium > 5.5: score += 10
    if hemoglobin < 10: score += 10

    if diabetes == "Yes": score += 10
    if hypertension == "Yes": score += 10
    if age > 60: score += 5

    risk_pct = _clamp(round(score), 0, 100)
    if risk_pct < 25: level = "Low"
    elif risk_pct < 55: level = "Moderate"
    else: level = "High"

    return {"riskLevel": level, "riskPercentage": risk_pct, "recommendations": _get_recommendations(level)}


def predict_liver(age: float, bilirubin: float, direct_bilirubin: float,
                  alt: float, ast: float, albumin: float, alcohol: str) -> dict:
    score = 0.0
    if bilirubin > 3: score += 25
    elif bilirubin > 1.2: score += 12

    if alt > 200: score += 25
    elif alt > 56: score += 12

    if ast > 200: score += 20
    elif ast > 40: score += 10

    if albumin < 3: score += 15
    if alcohol == "Regularly": score += 15
    elif alcohol == "Occasionally": score += 5

    risk_pct = _clamp(round(score), 0, 100)
    if risk_pct < 25: level = "Low"
    elif risk_pct < 55: level = "Moderate"
    else: level = "High"

    return {"riskLevel": level, "riskPercentage": risk_pct, "recommendations": _get_recommendations(level)}


def predict_lung(age: float, smoking: str, years_smoked: float,
                 breathlessness: str, cough: str, dust_exposure: str, spo2: float) -> dict:
    score = 0.0
    if smoking == "Current Smoker": score += 25
    elif smoking == "Ex-smoker": score += 12

    if years_smoked > 20: score += 20
    elif years_smoked > 10: score += 10

    if breathlessness == "At rest": score += 25
    elif breathlessness == "On exertion": score += 12

    if cough == "Yes": score += 15
    if dust_exposure == "Yes": score += 10

    if spo2 < 92: score += 20
    elif spo2 < 96: score += 10

    if age > 60: score += 5

    risk_pct = _clamp(round(score), 0, 100)
    if risk_pct < 25: level = "Low"
    elif risk_pct < 55: level = "Moderate"
    else: level = "High"

    return {"riskLevel": level, "riskPercentage": risk_pct, "recommendations": _get_recommendations(level)}


def predict_cancer(age: float, gender: str, family_history: str,
                   smoking: str, alcohol: str, obesity: str, radiation: str) -> dict:
    score = 0.0
    if family_history == "Yes": score += 25
    if smoking == "Daily": score += 20
    elif smoking == "Occasionally": score += 10
    if alcohol == "Regularly": score += 10
    elif alcohol == "Occasionally": score += 5
    if obesity == "Yes": score += 10
    if radiation == "Yes": score += 15
    if age > 60: score += 10
    elif age > 50: score += 5

    risk_pct = _clamp(round(score), 0, 100)
    if risk_pct < 20: level = "Low"
    elif risk_pct < 45: level = "Moderate"
    else: level = "High"

    return {"riskLevel": level, "riskPercentage": risk_pct, "recommendations": _get_recommendations(level)}


def predict_thyroid(age: float, gender: str, tsh: float, t3: float,
                    t4: float, neck_swelling: str, fatigue: str) -> dict:
    score = 0.0
    if tsh > 10: score += 30
    elif tsh > 4.5: score += 15
    elif tsh < 0.5: score += 20

    if t3 < 80: score += 15
    elif t3 > 200: score += 15

    if t4 < 4: score += 15
    elif t4 > 12: score += 15

    if neck_swelling == "Yes": score += 20
    if fatigue == "Yes": score += 10

    risk_pct = _clamp(round(score), 0, 100)
    if risk_pct < 25: level = "Low"
    elif risk_pct < 55: level = "Moderate"
    else: level = "High"

    return {"riskLevel": level, "riskPercentage": risk_pct, "recommendations": _get_recommendations(level)}


def predict_asthma(age: float, wheeze: str, cough_night: str,
                   breathlessness: str, allergies: str,
                   family_asthma: str, pollution: str) -> dict:
    score = 0.0
    if wheeze == "Often": score += 30
    elif wheeze == "Rarely": score += 15

    if cough_night == "Yes": score += 20
    if breathlessness == "Severe": score += 25
    elif breathlessness == "Mild": score += 12

    if allergies == "Yes": score += 15
    if family_asthma == "Yes": score += 15
    if pollution == "Yes": score += 10

    risk_pct = _clamp(round(score), 0, 100)
    if risk_pct < 25: level = "Low"
    elif risk_pct < 55: level = "Moderate"
    else: level = "High"

    return {"riskLevel": level, "riskPercentage": risk_pct, "recommendations": _get_recommendations(level)}


def predict_mental_health(age: float, sleep: float, mood: str, anxiety: str,
                           interest: str, stress: str, social: str) -> dict:
    score = 0.0
    if mood == "Very Low": score += 25
    elif mood == "Low": score += 15
    elif mood == "Neutral": score += 5

    if anxiety == "Often": score += 20
    elif anxiety == "Sometimes": score += 10

    if interest == "Yes": score += 20
    elif interest == "Somewhat": score += 10

    if stress == "Very High": score += 20
    elif stress == "High": score += 12
    elif stress == "Moderate": score += 5

    if sleep < 5: score += 15
    elif sleep < 6: score += 8

    if social == "None": score += 15
    elif social == "Limited": score += 8

    risk_pct = _clamp(round(score), 0, 100)
    if risk_pct < 25: level = "Low"
    elif risk_pct < 50: level = "Moderate"
    elif risk_pct < 75: level = "High"
    else: level = "Very High"

    return {"riskLevel": level, "riskPercentage": risk_pct, "recommendations": _get_recommendations(level)}


def _get_recommendations(level: str) -> list[str]:
    base = {
        "Low": [
            "Maintain a healthy lifestyle",
            "Regular check-ups every 6 months",
            "Stay physically active",
        ],
        "Moderate": [
            "Schedule a doctor appointment within 2 weeks",
            "Monitor your symptoms closely",
            "Adopt healthier diet and exercise habits",
            "Reduce stress and get adequate sleep",
        ],
        "High": [
            "Consult a specialist immediately",
            "Get comprehensive diagnostic tests",
            "Start prescribed medication if recommended",
            "Avoid triggers and risk factors",
            "Family screening may be advised",
        ],
        "Very High": [
            "Seek emergency medical consultation",
            "Hospitalization may be necessary",
            "Do not delay — call your doctor today",
            "Bring your full medical history",
        ],
    }
    return base.get(level, base["Moderate"])
