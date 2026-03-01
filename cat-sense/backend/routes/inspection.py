import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from services.inspection_service import analyze_inspection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/inspection", tags=["inspection"])

_ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_inspection(file: UploadFile = File(...)):
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Please upload a PDF or image.",
        )

    contents = await file.read()
    if len(contents) > _MAX_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    try:
        results = analyze_inspection(contents, file.content_type)
    except Exception as exc:
        logger.error("Inspection analysis failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

    urgent = [f for f in results if f.get("severity") == "Urgent"]
    monitor = [f for f in results if f.get("severity") == "Monitor"]

    return {
        "filename": file.filename,
        "total_faults": len(results),
        "urgent_count": len(urgent),
        "monitor_count": len(monitor),
        "faults": urgent + monitor,
    }
