from fastapi import APIRouter, UploadFile, File
from services.gemini_service import analyze_image

router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/")
async def vision(file: UploadFile = File(...)):
    result = await analyze_image(await file.read())
    return {"result": result}
