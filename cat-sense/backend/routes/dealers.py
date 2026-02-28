from fastapi import APIRouter
from models.schemas import DealersResponse, Dealer
from services.dealer_lookup import find_dealers

router = APIRouter(prefix="/dealers", tags=["dealers"])


@router.get("/", response_model=DealersResponse)
def dealers(lat: float = 41.87, lon: float = -87.62, radius_km: float = 50.0):
    results = find_dealers(lat, lon, radius_km, limit=3)
    return DealersResponse(dealers=[Dealer(**d) for d in results])
