from fastapi import APIRouter, UploadFile, File, Query
from models.schemas import VisionResponse
import services.memory_store as mem

router = APIRouter(prefix="/vision", tags=["vision"])

# Mock result — swap analyze_image() in here once Gemini is integrated
_MOCK: dict = {
    "description": "Hydraulic cylinder showing surface cracks and minor fluid leakage near the seal.",
    "detected_issues": ["surface cracks", "fluid leakage", "seal wear"],
    "severity": "Moderate",
}


@router.post("/", response_model=VisionResponse)
async def vision(
    file: UploadFile = File(...),  # noqa: ARG001 — used once real service is wired in
    session_id: str = Query(default="default"),
):
    # TODO: replace with real Gemini Vision call
    result = VisionResponse(**_MOCK)
    mem.save_image(session_id, _MOCK)
    return result
