import logging
import time

from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from models.schemas import AudioResponse
from services.audio_transcription import transcribe_audio
from services.audio_analysis import run_fft
from services.demo_service import is_demo, DEMO_AUDIO
import services.memory_store as mem

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audio", tags=["audio"])

_MAX_AUDIO_BYTES = 20 * 1024 * 1024  # 20 MB proxy for ~20s WAV


@router.post("/", response_model=AudioResponse)
async def audio(
    file: UploadFile = File(...),
    session_id: str = Query(default="default"),
):
    audio_bytes = await file.read()
    filename = file.filename or "audio.wav"

    # Validate file size (~20s WAV proxy)
    if len(audio_bytes) > _MAX_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="Audio file exceeds 20 MB limit")

    # Demo mode — skip FFT and Whisper calls
    if is_demo():
        logger.info("DEMO_MODE: returning predefined audio response")
        mem.save_audio(session_id, DEMO_AUDIO)
        return AudioResponse(
            dominant_frequency_hz=DEMO_AUDIO["dominant_frequency_hz"],
            anomaly_detected=DEMO_AUDIO["anomaly_detected"],
            anomaly_type=DEMO_AUDIO["anomaly_type"],
            severity=DEMO_AUDIO["severity"],
        )

    t0 = time.perf_counter()
    fft = run_fft(audio_bytes)
    transcription = transcribe_audio(audio_bytes, filename=filename)
    logger.info("Audio analysis completed in %.0fms", (time.perf_counter() - t0) * 1000)

    # FFT is ground truth for frequency; transcription upgrades severity if keywords match
    dominant_freq = fft["dominant_frequency_hz"]
    anomaly_detected = fft["anomaly_detected"] or transcription["anomaly_detected"]

    # Pick whichever analysis found the higher severity
    severity_rank = {"Minor": 1, "Moderate": 2, "Severe": 3}
    fft_sev = fft.get("severity", "Minor")
    tr_sev = transcription.get("severity", "Minor")
    severity = fft_sev if severity_rank[fft_sev] >= severity_rank[tr_sev] else tr_sev

    anomaly_type = fft.get("anomaly_type") or transcription.get("anomaly_type") or "none"

    combined = {
        "dominant_frequency_hz": dominant_freq,
        "peak_amplitude_normalized": fft.get("peak_amplitude_normalized", 0.0),
        "sample_rate_hz": fft.get("sample_rate_hz", 0),
        "fft_anomaly": fft.get("anomaly_type"),
        "fft_error": fft.get("error"),
        "transcript": transcription.get("transcript", ""),
        "transcript_anomaly": transcription.get("anomaly_type"),
        "transcription_error": transcription.get("error"),
        "anomaly_detected": anomaly_detected,
        "anomaly_type": anomaly_type,
        "severity": severity,
    }

    mem.save_audio(session_id, combined)

    return AudioResponse(
        dominant_frequency_hz=dominant_freq,
        anomaly_detected=anomaly_detected,
        anomaly_type=anomaly_type,
        severity=severity,
    )
