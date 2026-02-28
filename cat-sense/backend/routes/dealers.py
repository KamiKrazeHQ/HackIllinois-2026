from fastapi import APIRouter
from services.dealer_lookup import find_dealers

router = APIRouter(prefix="/dealers", tags=["dealers"])


@router.get("/")
async def dealers(lat: float, lon: float, radius_km: float = 10.0):
    results = await find_dealers(lat, lon, radius_km)
    return {"dealers": results}
