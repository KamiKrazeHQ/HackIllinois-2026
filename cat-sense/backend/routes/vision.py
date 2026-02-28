import logging
import time

from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from models.schemas import VisionResponse
from services.gemini_service import analyze_image
from services.demo_service import is_demo, DEMO_VISION
import services.memory_store as mem

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vision", tags=["vision"])

_MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/", response_model=VisionResponse)
async def vision(
    file: UploadFile = File(...),
    session_id: str = Query(default="default"),
):
    image_bytes = await file.read()

    # Validate file size
    if len(image_bytes) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 5 MB limit")

    # Demo mode — skip Gemini call
    if is_demo():
        logger.info("DEMO_MODE: returning predefined vision response")
        mem.save_image(session_id, DEMO_VISION)
        return VisionResponse(
            description=DEMO_VISION["issue"],
            detected_issues=[DEMO_VISION["issue"]],
            severity=DEMO_VISION["severity"],
        )

    t0 = time.perf_counter()
    result = analyze_image(image_bytes)
    logger.info("Gemini Vision completed in %.0fms", (time.perf_counter() - t0) * 1000)

    response = VisionResponse(
        description=result.get("issue", "No description available"),
        detected_issues=[result.get("issue", "unknown")] if result.get("issue") else [],
        severity=result.get("severity", "Minor"),
    )

    mem.save_image(session_id, result)
    return response
