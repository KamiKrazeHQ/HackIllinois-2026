import json
import logging
import os
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/translate", tags=["translate"])

_LANG_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "zh": "Chinese",
    "ja": "Japanese",
    "pt": "Portuguese",
    "ar": "Arabic",
}


class TranslateRequest(BaseModel):
    texts: list[str]
    target: str = "en"


@router.post("/")
async def translate(req: TranslateRequest):
    if not req.texts:
        raise HTTPException(status_code=400, detail="No texts provided")

    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    from google import genai

    lang_name = _LANG_NAMES.get(req.target, req.target)
    client = genai.Client(api_key=gemini_key)

    prompt = (
        f"Translate the following texts to {lang_name}. "
        "Return ONLY a valid JSON array of translated strings, one per input, in the same order. "
        "No markdown, no code fences, no extra text.\n\n"
        f"Input:\n{json.dumps(req.texts, ensure_ascii=False)}"
    )

    try:
        from google.genai import types as genai_types
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt],
            config=genai_types.GenerateContentConfig(
                thinking_config=genai_types.ThinkingConfig(thinking_budget=0)
            ),
        )
        raw = response.text or ""
        # Extract the JSON array robustly — strip any stray preamble
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON array found in response: {raw[:200]}")
        translated = json.loads(match.group())
        if not isinstance(translated, list) or len(translated) != len(req.texts):
            raise ValueError(f"Expected list of {len(req.texts)} items")
        return {"translations": translated}
    except Exception as exc:
        logger.error("Translation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Translation failed: {exc}")
