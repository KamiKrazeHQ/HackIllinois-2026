from fastapi import APIRouter, UploadFile, File, Query
from models.schemas import AudioResponse
from services.audio_transcription import transcribe_audio
from services.audio_analysis import run_fft
import services.memory_store as mem

router = APIRouter(prefix="/audio", tags=["audio"])


@router.post("/", response_model=AudioResponse)
async def audio(
    file: UploadFile = File(...),
    session_id: str = Query(default="default"),
):
    audio_bytes = await file.read()
    filename = file.filename or "audio.wav"

    # Run both in parallel (both are CPU/IO bound, run sequentially for simplicity)
    fft = run_fft(audio_bytes)
    transcription = transcribe_audio(audio_bytes, filename=filename)

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
        # FFT fields
        "dominant_frequency_hz": dominant_freq,
        "peak_amplitude_normalized": fft.get("peak_amplitude_normalized", 0.0),
        "sample_rate_hz": fft.get("sample_rate_hz", 0),
        "fft_anomaly": fft.get("anomaly_type"),
        "fft_error": fft.get("error"),
        # Transcription fields
        "transcript": transcription.get("transcript", ""),
        "transcript_anomaly": transcription.get("anomaly_type"),
        "transcription_error": transcription.get("error"),
        # Merged
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
