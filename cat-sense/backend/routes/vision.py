import logging
import time

from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from models.schemas import VisionResponse
from services.vision_service import analyze_image
from services.demo_service import is_demo, DEMO_VISION
import services.memory_store as mem

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vision", tags=["vision"])

_MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/", response_model=VisionResponse)
async def vision(
    file: UploadFile = File(...),
    session_id: str = Query(default="default"),
):
    image_bytes = await file.read()

    if len(image_bytes) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 10 MB limit")

    if is_demo():
        logger.info("DEMO_MODE: returning predefined vision response")
        mem.save_image(session_id, DEMO_VISION)
        return VisionResponse(**DEMO_VISION)

    mime_type = file.content_type or "image/jpeg"

    t0 = time.perf_counter()
    result = analyze_image(image_bytes, mime_type)
    logger.info("Vision analysis completed in %.0fms", (time.perf_counter() - t0) * 1000)

    mem.save_image(session_id, result)
    return VisionResponse(**result)
