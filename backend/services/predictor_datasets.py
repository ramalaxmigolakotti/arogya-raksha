"""
predictor_datasets.py — Loads all 9 predictor CSVs using pandas.
Mirrors services/predictorDatasets.js.
"""
import os
from pathlib import Path
from typing import Optional

import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data"

DATASET_MAP = {
    "predict_heart.csv":        "diabetes-heart",
    "predict_dengue.csv":       "dengue",
    "predict_kidney.csv":       "kidney",
    "predict_liver.csv":        "liver",
    "predict_lung.csv":         "lung",
    "predict_cancer.csv":       "cancer",
    "predict_thyroid.csv":      "thyroid",
    "predict_asthma.csv":       "asthma",
    "predict_mental_health.csv": "mental-health",
    "diabetes.csv":             "diabetes-heart",  # extra source
}

_stats: dict = {}
_loaded: bool = False


def load_all() -> dict:
    global _stats, _loaded
    if _loaded:
        return _stats

    total_rows = 0
    for filename, predictor_id in DATASET_MAP.items():
        filepath = DATA_DIR / filename
        if not filepath.exists():
            continue
        try:
            df = pd.read_csv(filepath, low_memory=False)
            rows = len(df)
            columns = list(df.columns)
            if predictor_id not in _stats:
                _stats[predictor_id] = {"rows": 0, "columns": [], "files": []}
            _stats[predictor_id]["rows"] += rows
            existing_cols = set(_stats[predictor_id]["columns"])
            for c in columns:
                if c not in existing_cols:
                    _stats[predictor_id]["columns"].append(c)
                    existing_cols.add(c)
            _stats[predictor_id]["files"].append(filename)
            total_rows += rows
        except Exception as e:
            print(f"[PredictorDatasets] Error loading {filename}: {e}")

    _loaded = True
    print(f"[PredictorDatasets] ✅ Loaded {len(_stats)} predictors — {total_rows:,} total patient records")
    return _stats


def get_stats() -> dict:
    return _stats
