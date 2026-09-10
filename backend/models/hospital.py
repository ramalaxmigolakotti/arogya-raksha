"""Hospital model wrapping Supabase table 'hospitals' with geospatial haversine search"""
import math
from typing import Optional, Dict, Any, List
from core.supabase_client import supabase

TABLE = "hospitals"


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # meters
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class Hospital:
    @classmethod
    def find_all(cls, filters: Optional[Dict[str, Any]] = None, limit: int = 50) -> List[Dict[str, Any]]:
        filters = filters or {}
        query = supabase.from_(TABLE).select("*")
        if filters.get("city"):
            query = query.ilike("city", f"%{filters['city']}%")
        if filters.get("state"):
            query = query.ilike("state", f"%{filters['state']}%")
        if filters.get("department"):
            query = query.contains("departments", [filters["department"]])
        if filters.get("emergency") is not None:
            query = query.eq("emergency", filters["emergency"])
        if filters.get("ambulance") is not None:
            query = query.eq("ambulance", filters["ambulance"])
        if filters.get("type"):
            query = query.eq("type", filters["type"])
        if filters.get("search"):
            s = filters["search"]
            query = query.or_(f"name.ilike.%{s}%,address.ilike.%{s}%,city.ilike.%{s}%")
        if filters.get("minBeds"):
            query = query.gte("total_beds", int(filters["minBeds"]))

        res = query.order("rating", desc=True).limit(limit).execute()
        return res.data or []

    @classmethod
    def find_by_id(cls, hospital_id: str):
        res = supabase.from_(TABLE).select("*").eq("id", hospital_id).execute()
        return res.data[0] if res.data else None

    @classmethod
    def find_nearby(cls, lat: float, lng: float, max_distance: float = 10000.0, limit: int = 20) -> List[Dict[str, Any]]:
        res = supabase.from_(TABLE).select("*").execute()
        data = res.data or []

        results = []
        for h in data:
            coords = (h.get("location") or {}).get("coordinates")
            if not coords or len(coords) < 2:
                continue
            h_lon, h_lat = coords[0], coords[1]
            dist = haversine(lat, lng, h_lat, h_lon)
            if dist <= max_distance:
                h_copy = dict(h)
                h_copy["distance_meters"] = round(dist)
                h_copy["distance_km"] = f"{(dist / 1000):.1f}"
                results.append(h_copy)

        results.sort(key=lambda x: x["distance_meters"])
        return results[:limit]

    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        res = supabase.from_(TABLE).select("type, city, emergency, ambulance").execute()
        data = res.data or []

        stats: Dict[str, Any] = {
            "total": len(data),
            "by_type": {},
            "by_city": {},
            "with_emergency": sum(1 for h in data if h.get("emergency")),
            "with_ambulance": sum(1 for h in data if h.get("ambulance")),
        }

        for h in data:
            t = h.get("type") or "general"
            stats["by_type"][t] = stats["by_type"].get(t, 0) + 1
            c = h.get("city")
            if c:
                stats["by_city"][c] = stats["by_city"].get(c, 0) + 1

        sorted_cities = sorted(stats["by_city"].items(), key=lambda x: x[1], reverse=True)[:20]
        stats["top_cities"] = [{"city": city, "count": count} for city, count in sorted_cities]
        del stats["by_city"]
        return stats
