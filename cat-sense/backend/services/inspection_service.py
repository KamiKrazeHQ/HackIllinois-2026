"""
Inspection report analyzer: Gemini 2.5 Flash reads PDF/image inspection documents,
extracts faults, and matches them to genuine CAT parts from the local parts DB.
"""

from __future__ import annotations

import io
import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

_DB_PATH = Path(__file__).parent.parent / "parts_db.json"
with open(_DB_PATH) as _f:
    _PARTS_DB = json.load(_f)

_PROMPT = """
You are a Caterpillar heavy equipment inspection analyst.
Analyze this inspection document and extract all mechanical faults or issues.

For each fault found, categorize it as:
- "Urgent": Safety-critical issues requiring immediate attention (Red alert)
- "Monitor": Issues to watch that are not immediately critical (Orange alert)

Return ONLY a valid JSON array with no markdown or extra text. Each item must have:
{
  "fault": "Short title of the fault",
  "description": "Detailed description of the issue found",
  "severity": "Urgent" or "Monitor",
  "component": "The specific machine component affected"
}

If no faults are found, return an empty array: []
"""


def _find_matching_parts(fault_description: str) -> list[dict]:
    fault_lower = fault_description.lower()
    matched: list[dict] = []
    seen: set[str] = set()
    for category in _PARTS_DB["keywords"].values():
        for keyword in category["keywords"]:
            if keyword in fault_lower:
                for part in category["parts"]:
                    if part["part_number"] not in seen:
                        matched.append(part)
                        seen.add(part["part_number"])
                break
    return matched


_INSPECTION_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"]


def _parse_faults(raw: str) -> list[dict]:
    raw = raw.strip().replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        logger.warning("Could not parse inspection JSON: %s", raw[:200])
        return []


def _run_gemini_inspection(file_bytes: bytes, mime_type: str) -> list[dict]:
    from google import genai
    from google.genai import types
    import PIL.Image

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    client = genai.Client(api_key=api_key)

    if mime_type == "application/pdf":
        contents = [types.Part.from_bytes(data=file_bytes, mime_type="application/pdf"), _PROMPT]
    else:
        img = PIL.Image.open(io.BytesIO(file_bytes))
        contents = [_PROMPT, img]

    last_exc: Exception | None = None
    for model in _INSPECTION_MODELS:
        try:
            response = client.models.generate_content(model=model, contents=contents)
            if model != _INSPECTION_MODELS[0]:
                logger.info("Inspection fell back to Gemini model: %s", model)
            return _parse_faults(response.text)
        except Exception as exc:
            logger.warning("Inspection model %s failed (%s: %s), trying next", model, type(exc).__name__, exc)
            last_exc = exc
    raise last_exc


def _run_claude_inspection(file_bytes: bytes, mime_type: str) -> list[dict]:
    import base64
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=api_key)
    encoded = base64.standard_b64encode(file_bytes).decode("utf-8")

    if mime_type == "application/pdf":
        file_block = {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": encoded}}
    else:
        file_block = {"type": "image", "source": {"type": "base64", "media_type": mime_type, "data": encoded}}

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": [file_block, {"type": "text", "text": _PROMPT}]}],
    )
    logger.info("Inspection analysis completed via Claude fallback")
    return _parse_faults(response.content[0].text)


def analyze_inspection(file_bytes: bytes, mime_type: str) -> list[dict]:
    try:
        faults = _run_gemini_inspection(file_bytes, mime_type)
    except Exception as exc:
        logger.warning("All Gemini inspection models failed (%s) — trying Claude", exc)
        faults = _run_claude_inspection(file_bytes, mime_type)

    augmented = []
    for fault in faults:
        search_text = f"{fault.get('fault', '')} {fault.get('description', '')} {fault.get('component', '')}"
        fault["parts"] = _find_matching_parts(search_text)
        augmented.append(fault)

    return augmented
