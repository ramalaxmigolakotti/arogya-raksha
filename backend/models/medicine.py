"""
medicine.py — In-memory medicine search across 250k+ medicines from data/medicines.csv
Mirrors backend/models/Medicine.js
"""
import csv
from pathlib import Path
from typing import List, Dict, Any, Optional

DATA_PATH = Path(__file__).parent.parent / "data" / "medicines.csv"

_medicines: List[Dict[str, Any]] = []
_loaded: bool = False


def _normalize(s: Optional[str]) -> str:
    return (s or "").lower().strip()


def load_medicines() -> List[Dict[str, Any]]:
    global _medicines, _loaded
    if _loaded:
        return _medicines

    if not DATA_PATH.exists():
        return []

    items = []
    try:
        with open(DATA_PATH, mode="r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            # normalize field names
            for idx, row in enumerate(reader):
                # Clean headers
                clean_row = {
                    k.replace("(", "").replace(")", "").replace("₹", "").strip().lower(): v
                    for k, v in row.items() if k
                }
                name = clean_row.get("name", "").strip()
                if not name:
                    continue

                price_val = 0.0
                raw_price = clean_row.get("price", "0")
                try:
                    price_val = float(raw_price)
                except ValueError:
                    price_val = 0.0

                comp1 = clean_row.get("short_composition1", "").strip()
                comp2 = clean_row.get("short_composition2", "").strip()
                generic_parts = [c for c in [comp1, comp2] if c]
                generic_name = " + ".join(generic_parts)

                m = {
                    "id": int(clean_row.get("id", idx)) if clean_row.get("id", "").isdigit() else idx,
                    "name": name,
                    "price": price_val,
                    "market_price": price_val,
                    "is_discontinued": clean_row.get("is_discontinued", "").lower() == "true",
                    "manufacturer": clean_row.get("manufacturer_name", ""),
                    "manufacturer_name": clean_row.get("manufacturer_name", ""),
                    "type": clean_row.get("type", "allopathy"),
                    "category": clean_row.get("type", "allopathy"),
                    "pack_size": clean_row.get("pack_size_label", ""),
                    "pack_size_label": clean_row.get("pack_size_label", ""),
                    "generic_name": generic_name,
                    "short_composition1": comp1,
                    "short_composition2": comp2,
                }
                items.append(m)
        _medicines = items
        _loaded = True
        print(f"[Medicine] Loaded {len(_medicines):,} medicines from CSV")
    except Exception as e:
        print(f"[Medicine] Error loading CSV: {e}")

    return _medicines


def _matches_query(med: Dict[str, Any], query_lower: str) -> bool:
    return (
        query_lower in _normalize(med["name"]) or
        query_lower in _normalize(med["generic_name"]) or
        query_lower in _normalize(med["manufacturer"]) or
        query_lower in _normalize(med["category"]) or
        query_lower in _normalize(med["short_composition1"]) or
        query_lower in _normalize(med["short_composition2"])
    )


class Medicine:
    @classmethod
    def search(cls, query: str, limit: int = 30) -> List[Dict[str, Any]]:
        meds = load_medicines()
        lq = _normalize(query)
        starts_with = []
        contains = []

        for med in meds:
            nl = _normalize(med["name"])
            if nl.startswith(lq):
                starts_with.append(med)
            elif _matches_query(med, lq):
                contains.append(med)

            if len(starts_with) + len(contains) >= limit * 3:
                break

        return (starts_with + contains)[:limit]

    @classmethod
    def search_paginated(cls, query: str, page: int = 1, limit: int = 24) -> Dict[str, Any]:
        meds = load_medicines()
        lq = _normalize(query)
        starts_with = []
        contains = []

        for med in meds:
            nl = _normalize(med["name"])
            if nl.startswith(lq):
                starts_with.append(med)
            elif _matches_query(med, lq):
                contains.append(med)

        all_matches = starts_with + contains
        total = len(all_matches)
        offset = (page - 1) * limit
        return {
            "total": total,
            "medicines": all_matches[offset: offset + limit]
        }

    @classmethod
    def browse(cls, letter: str = "A", page: int = 1, limit: int = 24) -> Dict[str, Any]:
        meds = load_medicines()
        ltr = (letter or "A").upper()

        filtered = [m for m in meds if m["name"] and m["name"].upper().startswith(ltr)]
        filtered.sort(key=lambda x: x["name"])

        total = len(filtered)
        offset = (page - 1) * limit
        return {
            "total": total,
            "medicines": filtered[offset: offset + limit]
        }

    @classmethod
    def find_by_name(cls, name: str) -> Optional[Dict[str, Any]]:
        meds = load_medicines()
        lq = _normalize(name)
        for m in meds:
            if _normalize(m["name"]) == lq:
                return m
        for m in meds:
            if lq in _normalize(m["name"]):
                return m
        return None

    @classmethod
    def find_by_category(cls, category: str, limit: int = 50) -> List[Dict[str, Any]]:
        meds = load_medicines()
        lq = _normalize(category)
        return [m for m in meds if lq in _normalize(m["category"])][:limit]

    @classmethod
    def find_alternatives(cls, medicine_name: str, limit: int = 10) -> List[Dict[str, Any]]:
        meds = load_medicines()
        original = cls.find_by_name(medicine_name)
        if not original or not original.get("generic_name"):
            return []

        main_generic = _normalize(original["generic_name"].split("+")[0].split("(")[0])
        matches = [
            m for m in meds
            if m["id"] != original["id"] and main_generic in _normalize(m["generic_name"])
        ]
        matches.sort(key=lambda x: x.get("price", 0.0))
        return matches[:limit]

    @classmethod
    def get_categories(cls) -> List[Dict[str, Any]]:
        meds = load_medicines()
        counts: Dict[str, int] = {}
        for m in meds:
            cat = m.get("category") or "Other"
            counts[cat] = counts.get(cat, 0) + 1
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return [{"name": name, "count": count} for name, count in sorted_counts]

    @classmethod
    def count(cls) -> int:
        return len(load_medicines())

    @classmethod
    def is_loaded(cls) -> bool:
        return _loaded
