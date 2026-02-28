from fastapi import APIRouter
from models.schemas import RiskRequest, RiskResponse
from services.risk_engine import compute_risk

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/", response_model=RiskResponse)
async def risk(request: RiskRequest):
    score = await compute_risk(request)
    return RiskResponse(score=score)
