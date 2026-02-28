"""
CAT dealer lookup service.
Uses Google Maps Places API when GOOGLE_MAPS_API_KEY is set.
Falls back to curated mock data otherwise.
"""

import os
import math
import logging
import urllib.request
import urllib.parse
import json

logger = logging.getLogger(__name__)

# ── Fallback mock dealers ─────────────────────────────────────────────────────

_MOCK_DEALERS = [
    {"name": "CAT Midwest — Chicago",    "address": "1234 Industrial Pkwy, Chicago, IL 60601",  "lat": 41.878, "lon": -87.630, "phone": "+1-312-555-0101", "specialization": "Hydraulics & Engine Overhaul"},
    {"name": "Finning CAT — Champaign",  "address": "789 Equipment Blvd, Champaign, IL 61820",  "lat": 40.116, "lon": -88.243, "phone": "+1-217-555-0192", "specialization": "Preventive Maintenance"},
    {"name": "Altorfer CAT — Peoria",    "address": "456 Machinery Lane, Peoria, IL 61602",     "lat": 40.693, "lon": -89.589, "phone": "+1-309-555-0344", "specialization": "Electrical Systems & Sensors"},
    {"name": "Thompson CAT — Joliet",    "address": "321 Heavy Equip Dr, Joliet, IL 60432",     "lat": 41.525, "lon": -88.081, "phone": "+1-815-555-0217", "specialization": "Undercarriage & Track"},
    {"name": "Whayne CAT — Springfield", "address": "654 Dealer Blvd, Springfield, IL 62701",   "lat": 39.801, "lon": -89.644, "phone": "+1-217-555-0388", "specialization": "Engine Rebuild & Overhaul"},
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _mock_lookup(lat: float, lon: float, radius_km: float, limit: int) -> list[dict]:
    results = []
    for d in _MOCK_DEALERS:
        dist = _haversine_km(lat, lon, d["lat"], d["lon"])
        if dist <= radius_km:
            results.append({**d, "distance_km": round(dist, 1)})
    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]


# ── Google Maps Places API ────────────────────────────────────────────────────

def _google_maps_lookup(lat: float, lon: float, radius_km: float, limit: int) -> list[dict]:
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]
    radius_m = int(radius_km * 1000)

    params = urllib.parse.urlencode({
        "location": f"{lat},{lon}",
        "radius": radius_m,
        "keyword": "CAT heavy equipment dealer",
        "type": "store",
        "key": api_key,
    })
    url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?{params}"

    with urllib.request.urlopen(url, timeout=5) as resp:
        data = json.loads(resp.read().decode())

    dealers = []
    for place in data.get("results", [])[:limit]:
        plat = place["geometry"]["location"]["lat"]
        plon = place["geometry"]["location"]["lng"]
        dist = _haversine_km(lat, lon, plat, plon)
        dealers.append({
            "name": place.get("name", "Unknown"),
            "address": place.get("vicinity", ""),
            "distance_km": round(dist, 1),
            "phone": "",          # requires a Places Detail call — add if time permits
            "specialization": "CAT Equipment Dealer",
        })

    dealers.sort(key=lambda x: x["distance_km"])
    return dealers


# ── Public interface ──────────────────────────────────────────────────────────

def find_dealers(lat: float, lon: float, radius_km: float = 50.0, limit: int = 3) -> list[dict]:
    if os.environ.get("GOOGLE_MAPS_API_KEY"):
        try:
            return _google_maps_lookup(lat, lon, radius_km, limit)
        except Exception as e:
            logger.warning("Google Maps lookup failed: %s — falling back to mock", e)

    return _mock_lookup(lat, lon, radius_km, limit)
