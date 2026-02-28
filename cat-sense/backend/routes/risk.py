from fastapi import APIRouter, HTTPException
from models.schemas import RiskRequest, RiskResponse
from services.risk_engine import compute_risk
from services.demo_service import is_demo, DEMO_RISK
import services.memory_store as mem

router = APIRouter(prefix="/risk", tags=["risk"])

_TEMP_MIN, _TEMP_MAX = -50.0, 300.0      # °C
_PRES_MIN, _PRES_MAX = 0.0, 500.0        # PSI


@router.post("/", response_model=RiskResponse)
def risk(request: RiskRequest):
    # Validate sensor ranges
    if not (_TEMP_MIN <= request.temperature_c <= _TEMP_MAX):
        raise HTTPException(
            status_code=400,
            detail=f"temperature_c must be between {_TEMP_MIN} and {_TEMP_MAX}",
        )
    if not (_PRES_MIN <= request.pressure_psi <= _PRES_MAX):
        raise HTTPException(
            status_code=400,
            detail=f"pressure_psi must be between {_PRES_MIN} and {_PRES_MAX}",
        )

    # Demo mode
    if is_demo():
        mem.save_risk(request.session_id, DEMO_RISK)
        return RiskResponse(**DEMO_RISK)

    result = compute_risk(request)
    mem.save_risk(request.session_id, result.model_dump())
    return result
