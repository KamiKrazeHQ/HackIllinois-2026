from fastapi import APIRouter
from models.schemas import RiskRequest, RiskResponse
from services.risk_engine import compute_risk
import services.memory_store as mem

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/", response_model=RiskResponse)
def risk(request: RiskRequest):
    result = compute_risk(request)
    mem.save_risk(request.session_id, result.model_dump())
    return result
