"""
OpenAI Whisper transcription service.
Transcribes audio bytes to text, then extracts basic acoustic metadata.
"""

import os
import io
import logging

logger = logging.getLogger(__name__)

_FALLBACK = {
    "transcript": "",
    "dominant_frequency_hz": 0.0,
    "anomaly_detected": False,
    "anomaly_type": "none",
    "severity": "Minor",
    "error": "Whisper unavailable",
}


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.wav") -> dict:
    """
    Sends audio to Whisper, returns transcript + lightweight metadata.
    Falls back gracefully if the API key is missing.
    """
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

        buf = io.BytesIO(audio_bytes)
        buf.name = filename  # Whisper needs a filename hint for format detection

        transcript_obj = client.audio.transcriptions.create(
            model="whisper-1",
            file=buf,
            response_format="text",
        )
        transcript = str(transcript_obj).strip()

        # Lightweight keyword-based anomaly detection on the transcript
        anomaly_type, severity = _classify_transcript(transcript)

        return {
            "transcript": transcript,
            "dominant_frequency_hz": 0.0,   # real FFT goes here in Layer 3
            "anomaly_detected": anomaly_type != "none",
            "anomaly_type": anomaly_type,
            "severity": severity,
            "error": None,
        }

    except KeyError:
        logger.warning("OPENAI_API_KEY not set — audio transcription unavailable")
        return {**_FALLBACK, "error": "OPENAI_API_KEY not configured"}

    except Exception as e:
        logger.error("Whisper error: %s", e)
        return {**_FALLBACK, "error": f"{type(e).__name__}: {e}"}


# ── Simple keyword classifier ─────────────────────────────────────────────────

_SEVERE_KEYWORDS = {"grinding", "screech", "bang", "clunk", "knock", "rattle"}
_MODERATE_KEYWORDS = {"hiss", "squeal", "whine", "vibrat", "rumble", "clicking"}


def _classify_transcript(transcript: str) -> tuple[str, str]:
    lower = transcript.lower()
    for word in _SEVERE_KEYWORDS:
        if word in lower:
            return word, "Severe"
    for word in _MODERATE_KEYWORDS:
        if word in lower:
            return word, "Moderate"
    return "none", "Minor"
