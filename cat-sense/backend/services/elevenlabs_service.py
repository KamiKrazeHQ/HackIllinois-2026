"""
ElevenLabs TTS service.
Converts AI reply text to speech and saves as an MP3.
Returns a URL path the frontend can play directly.

Required .env:
  ELEVENLABS_API_KEY=your_key_here
  ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  (optional, defaults to Rachel)
"""

import os
import time
import logging
import urllib.request
import urllib.error
import json

logger = logging.getLogger(__name__)

# ElevenLabs voice IDs — swap in .env to change voice
_DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel — clear, professional

_AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "audio")
_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"


def _truncate(text: str, max_chars: int = 800) -> str:
    """ElevenLabs charges per character — keep demo responses short."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + "..."


def synthesise(text: str, session_id: str = "default") -> str | None:
    """
    Convert text to speech via ElevenLabs.
    Returns the URL path to the saved MP3, or None if TTS is unavailable.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        logger.debug("ELEVENLABS_API_KEY not set — TTS skipped")
        return None

    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", _DEFAULT_VOICE_ID)
    url = _TTS_URL.format(voice_id=voice_id)

    payload = json.dumps({
        "text": _truncate(text),
        "model_id": "eleven_flash_v2_5",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            audio_bytes = resp.read()

        # Save to static/audio/{session_id}_{timestamp}.mp3
        os.makedirs(_AUDIO_DIR, exist_ok=True)
        filename = f"{session_id}_{int(time.time())}.mp3"
        filepath = os.path.join(_AUDIO_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(audio_bytes)

        logger.info("TTS saved: %s", filename)
        return f"/static/audio/{filename}"

    except urllib.error.HTTPError as e:
        logger.error("ElevenLabs HTTP error %s: %s", e.code, e.read().decode())
        return None
    except Exception as e:
        logger.error("ElevenLabs TTS error: %s", e)
        return None
