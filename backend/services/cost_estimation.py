"""
cost_estimation.py — Medical cost estimation using KNN on CSV data.
Mirrors services/costEstimationService.js — now using pandas.
"""
import math
from pathlib import Path
from typing import Optional

import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data"
_cost_data: Optional[pd.DataFrame] = None
INR_RATE = 83


def _load_cost_data() -> pd.DataFrame:
    global _cost_data
    if _cost_data is not None:
        return _cost_data
    csv_path = DATA_DIR / "medical_costs.csv"
    if not csv_path.exists():
        print("⚠️  medical_costs.csv not found — cost estimation will use defaults")
        _cost_data = pd.DataFrame()
        return _cost_data
    df = pd.read_csv(csv_path)
    df["smoker"] = df["smoker"] == "yes"
    _cost_data = df
    print(f"📊 Loaded {len(df)} medical cost records for estimation")
    return _cost_data


def estimate_cost(age: int, sex: str = "male", bmi: float = 25.0, smoker: bool = False, children: int = 0) -> dict:
    """KNN (k=20) cost estimation — mirrors estimateCost() in JS."""
    data = _load_cost_data()
    if data.empty:
        base = 5000
        if age > 50: base *= 2
        if smoker: base *= 2.5
        if bmi > 30: base *= 1.3
        return {
            "estimated_annual_cost_usd": round(base),
            "estimated_annual_cost_inr": round(base * INR_RATE),
            "confidence": "low",
            "source": "fallback",
        }

    df = data.copy()
    df["distance"] = (
        (df["age"] - age).abs() / 50 * 3
        + (df["bmi"] - bmi).abs() / 30 * 2
        + (df["smoker"] != smoker).astype(float) * 4
        + (df["sex"] != sex).astype(float) * 0.3
        + (df["children"] - children).abs() / 5
    )
    neighbors = df.nsmallest(20, "distance")
    avg_cost = neighbors["charges"].mean()
    min_cost = neighbors["charges"].min()
    max_cost = neighbors["charges"].max()

    return {
        "estimated_annual_cost_usd": round(avg_cost),
        "estimated_annual_cost_inr": round(avg_cost * INR_RATE),
        "cost_range_usd": {"min": round(min_cost), "max": round(max_cost)},
        "cost_range_inr": {"min": round(min_cost * INR_RATE), "max": round(max_cost * INR_RATE)},
        "monthly_emi_6":  round((avg_cost * INR_RATE) / 6),
        "monthly_emi_12": round((avg_cost * INR_RATE) / 12),
        "monthly_emi_24": round((avg_cost * INR_RATE) / 24),
        "confidence": "high",
        "source": "dataset",
        "similar_profiles_analyzed": 20,
    }


def screen_diabetes_risk(
    glucose: Optional[float] = None,
    blood_pressure: Optional[float] = None,
    bmi: Optional[float] = None,
    age: Optional[int] = None,
    pregnancies: Optional[int] = None,
    insulin: Optional[float] = None,
    skin_thickness: Optional[float] = None,
) -> dict:
    """Rule-based diabetes risk scoring — mirrors screenDiabetesRisk() in JS."""
    risk_score = 0
    g = glucose or 0
    b = bmi or 0
    bp = blood_pressure or 0
    a = age or 0

    if g > 140: risk_score += 3
    elif g > 120: risk_score += 2
    elif g > 100: risk_score += 1

    if b > 35: risk_score += 3
    elif b > 30: risk_score += 2
    elif b > 25: risk_score += 1

    if bp > 90: risk_score += 2
    elif bp > 80: risk_score += 1

    if a > 50: risk_score += 2
    elif a > 40: risk_score += 1

    if (pregnancies or 0) > 4: risk_score += 1
    if (insulin or 0) > 200: risk_score += 2

    max_score = 13
    risk_percent = min(round((risk_score / max_score) * 100), 100)

    if risk_percent < 20:
        risk_level = "Low"
        recommendation = "Your diabetes risk is low. Maintain a healthy lifestyle with regular exercise and balanced diet."
    elif risk_percent < 50:
        risk_level = "Moderate"
        recommendation = "You have moderate diabetes risk. Consider regular blood sugar monitoring, increase physical activity, and reduce sugar intake."
    elif risk_percent < 75:
        risk_level = "High"
        recommendation = "Your diabetes risk is high. Please consult a doctor for a comprehensive blood test (HbA1c). Lifestyle changes are strongly recommended."
    else:
        risk_level = "Very High"
        recommendation = "Your diabetes risk is very high. Please see an endocrinologist immediately for proper diagnosis and treatment plan."

    return {
        "risk_score": risk_score,
        "risk_percent": risk_percent,
        "risk_level": risk_level,
        "recommendation": recommendation,
        "factors": {
            "glucose": glucose or "Not provided",
            "bmi": bmi or "Not provided",
            "blood_pressure": blood_pressure or "Not provided",
            "age": age or "Not provided",
        },
    }
