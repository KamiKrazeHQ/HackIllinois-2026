from fastapi import APIRouter
from models.schemas import DealersResponse, Dealer

router = APIRouter(prefix="/dealers", tags=["dealers"])

_MOCK_DEALERS = [
    Dealer(
        name="CAT Midwest — Chicago",
        address="1234 Industrial Pkwy, Chicago, IL 60601",
        distance_km=3.2,
        phone="+1-312-555-0101",
        specialization="Hydraulics & Engine Overhaul",
    ),
    Dealer(
        name="Finning CAT — Champaign",
        address="789 Equipment Blvd, Champaign, IL 61820",
        distance_km=14.7,
        phone="+1-217-555-0192",
        specialization="Preventive Maintenance & Diagnostics",
    ),
    Dealer(
        name="Altorfer CAT — Peoria",
        address="456 Machinery Lane, Peoria, IL 61602",
        distance_km=29.1,
        phone="+1-309-555-0344",
        specialization="Electrical Systems & Sensors",
    ),
]


@router.get("/", response_model=DealersResponse)
def dealers(lat: float = 41.87, lon: float = -87.62, radius_km: float = 50.0):  # noqa: ARG001 — lat/lon used once geo lookup is wired in
    # TODO: filter by real lat/lon when a geolocation service is wired in
    nearby = [d for d in _MOCK_DEALERS if d.distance_km <= radius_km]
    return DealersResponse(dealers=nearby)
