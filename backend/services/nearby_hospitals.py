"""
nearby_hospitals.py — Fetch real hospitals from OpenStreetMap Overpass API.
Mirrors services/nearbyHospitals.js.
"""
import math
from typing import Optional
import httpx

_OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def fetch_nearby_hospitals(lat: float, lng: float, radius_km: float = 10) -> list[dict]:
    """
    Query OpenStreetMap Overpass API for hospitals/clinics near (lat, lng).
    Returns a list of facility dicts sorted by distance.
    """
    radius_m = radius_km * 1000
    query = f"""
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:{radius_m},{lat},{lng});
  node["amenity"="clinic"](around:{radius_m},{lat},{lng});
  node["amenity"="health_post"](around:{radius_m},{lat},{lng});
  node["amenity"="doctors"](around:{radius_m},{lat},{lng});
  node["healthcare"="centre"](around:{radius_m},{lat},{lng});
  node["healthcare"="hospital"](around:{radius_m},{lat},{lng});
  node["healthcare"="clinic"](around:{radius_m},{lat},{lng});
  way["amenity"="hospital"](around:{radius_m},{lat},{lng});
  way["healthcare"="hospital"](around:{radius_m},{lat},{lng});
);
out center;
""".strip()

    try:
        async with httpx.AsyncClient(timeout=22) as client:
            resp = await client.post(
                _OVERPASS_URL,
                content=f"data={httpx.QueryParams({'': query}).value.lstrip('=')}",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        print(f"[Overpass] Error: {e}")
        return []

    facilities = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        if not tags.get("name"):
            continue
        f_lat = el.get("lat") or (el.get("center") or {}).get("lat")
        f_lng = el.get("lon") or (el.get("center") or {}).get("lon")
        if not f_lat or not f_lng:
            continue
        dist = round(_haversine(lat, lng, f_lat, f_lng), 2)
        facilities.append({
            "id": str(el.get("id")),
            "name": tags["name"],
            "lat": f_lat,
            "lng": f_lng,
            "distance_km": dist,
            "address": ", ".join(filter(None, [
                tags.get("addr:full"),
                tags.get("addr:street"),
                tags.get("addr:city"),
            ])) or "",
            "phone": tags.get("phone") or tags.get("contact:phone") or "",
            "emergency": tags.get("emergency", "unknown"),
            "type": tags.get("amenity") or tags.get("healthcare") or "health_facility",
        })

    facilities.sort(key=lambda x: x["distance_km"])
    return facilities[:30]
