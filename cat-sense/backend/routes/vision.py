from fastapi import APIRouter, UploadFile, File, Query
from models.schemas import VisionResponse
from services.gemini_service import analyze_image
import services.memory_store as mem

router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/", response_model=VisionResponse)
async def vision(
    file: UploadFile = File(...),
    session_id: str = Query(default="default"),
):
    image_bytes = await file.read()
    result = analyze_image(image_bytes)

    # Normalise Gemini output to match VisionResponse schema
    response = VisionResponse(
        description=result.get("issue", "No description available"),
        detected_issues=[result.get("issue", "unknown")] if result.get("issue") else [],
        severity=result.get("severity", "Minor"),
    )

    mem.save_image(session_id, result)
    return response
