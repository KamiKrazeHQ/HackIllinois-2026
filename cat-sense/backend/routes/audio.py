from fastapi import APIRouter, UploadFile, File
from services.audio_analysis import analyze_audio

router = APIRouter(prefix="/audio", tags=["audio"])


@router.post("/")
async def audio(file: UploadFile = File(...)):
    result = await analyze_audio(await file.read())
    return {"result": result}
