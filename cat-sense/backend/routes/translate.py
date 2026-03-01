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

_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"]


class TranslateRequest(BaseModel):
    texts: list[str]
    target: str = "en"


def _parse_translations(raw: str, expected: int) -> list[str]:
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON array found: {raw[:200]}")
    translated = json.loads(match.group())
    if not isinstance(translated, list) or len(translated) != expected:
        raise ValueError(f"Expected list of {expected} items, got {len(translated) if isinstance(translated, list) else type(translated)}")
    return translated


def _translate_gemini(prompt: str) -> str:
    from google import genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")
    client = genai.Client(api_key=api_key)
    last_exc: Exception | None = None
    for model in _GEMINI_MODELS:
        try:
            response = client.models.generate_content(model=model, contents=[prompt])
            return response.text or ""
        except Exception as exc:
            logger.warning("Translate Gemini model %s failed: %s", model, exc)
            last_exc = exc
    raise last_exc


def _translate_openai(prompt: str) -> str:
    from openai import OpenAI
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content or ""


@router.post("/")
async def translate(req: TranslateRequest):
    if not req.texts:
        raise HTTPException(status_code=400, detail="No texts provided")

    lang_name = _LANG_NAMES.get(req.target, req.target)
    prompt = (
        f"Translate the following texts to {lang_name}. "
        "Return ONLY a valid JSON array of translated strings, one per input, in the same order. "
        "No markdown, no code fences, no extra text.\n\n"
        f"Input:\n{json.dumps(req.texts, ensure_ascii=False)}"
    )

    raw: str | None = None
    try:
        raw = _translate_gemini(prompt)
    except Exception as exc:
        logger.warning("Gemini translation failed (%s) — trying OpenAI", exc)
        try:
            raw = _translate_openai(prompt)
            logger.info("Translation completed via OpenAI fallback")
        except Exception as openai_exc:
            logger.error("OpenAI translation also failed: %s", openai_exc)
            raise HTTPException(status_code=500, detail=f"Translation failed: {openai_exc}")

    try:
        return {"translations": _parse_translations(raw, len(req.texts))}
    except Exception as exc:
        logger.error("Translation parse failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Translation parse failed: {exc}")
