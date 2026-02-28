"""
Gemini Vision API service (google-genai SDK).
Sends an image and returns structured machinery diagnostic JSON.
"""

import os
import json
import logging

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

_PROMPT = """
You are an expert heavy machinery diagnostician analyzing an image.

Return ONLY valid JSON (no markdown, no explanation) with exactly these fields:
{
  "component": "<name of the component visible>",
  "issue": "<description of the problem observed>",
  "severity": "<one of: Minor, Moderate, Severe>",
  "classification": "<one of: Wear, Crack, Leak, Corrosion, Deformation, Normal>",
  "confidence": <float 0.0-1.0>,
  "recommended_action": "<brief action recommendation>"
}

If no issue is found, use severity "Normal" and classification "Normal".
"""

_FALLBACK = {
    "component": "unknown",
    "issue": "Gemini API unavailable — using fallback",
    "severity": "Minor",
    "classification": "Normal",
    "confidence": 0.0,
    "recommended_action": "Manual inspection recommended",
}


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=api_key)


def analyze_image(image_bytes: bytes) -> dict:
    try:
        client = _get_client()

        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type="image/jpeg",
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[_PROMPT, image_part],
        )

        text = response.text.strip()

        # Strip accidental markdown code fences
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text)

    except EnvironmentError as e:
        logger.warning("Gemini config error: %s — returning fallback", e)
        return {**_FALLBACK, "issue": str(e)}

    except json.JSONDecodeError as e:
        logger.error("Gemini returned non-JSON: %s", e)
        return {**_FALLBACK, "issue": "Gemini returned unparseable response"}

    except Exception as e:
        logger.error("Gemini Vision error: %s", e)
        return {**_FALLBACK, "issue": f"API error: {type(e).__name__}"}
