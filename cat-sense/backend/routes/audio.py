from fastapi import APIRouter, UploadFile, File, Query
from models.schemas import AudioResponse
import services.memory_store as mem

router = APIRouter(prefix="/audio", tags=["audio"])

_MOCK: dict = {
    "dominant_frequency_hz": 142.5,
    "anomaly_detected": True,
    "anomaly_type": "bearing knock",
    "severity": "Moderate",
}


@router.post("/", response_model=AudioResponse)
async def audio(
    file: UploadFile = File(...),  # noqa: ARG001 — used once real service is wired in
    session_id: str = Query(default="default"),
):
    # TODO: replace with real FFT / ML analysis
    result = AudioResponse(**_MOCK)
    mem.save_audio(session_id, _MOCK)
    return result
