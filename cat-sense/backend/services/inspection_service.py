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


def analyze_inspection(file_bytes: bytes, mime_type: str) -> list[dict]:
    from google import genai
    from google.genai import types
    import PIL.Image

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    client = genai.Client(api_key=api_key)

    if mime_type == "application/pdf":
        contents = [
            types.Part.from_bytes(data=file_bytes, mime_type="application/pdf"),
            _PROMPT,
        ]
    else:
        img = PIL.Image.open(io.BytesIO(file_bytes))
        contents = [_PROMPT, img]

    response = client.models.generate_content(model="gemini-1.5-flash", contents=contents)
    raw = response.text.strip().replace("```json", "").replace("```", "").strip()

    try:
        faults = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Could not parse inspection JSON: %s", raw[:200])
        faults = []

    augmented = []
    for fault in faults:
        search_text = f"{fault.get('fault', '')} {fault.get('description', '')} {fault.get('component', '')}"
        fault["parts"] = _find_matching_parts(search_text)
        augmented.append(fault)

    return augmented
