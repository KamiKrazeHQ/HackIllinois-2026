"""
Vision analysis: AWS Rekognition (label detection) + Gemini (deep analysis).
Falls back to Gemini-only if AWS credentials are not configured.
"""

from __future__ import annotations

import io
import json
import logging
import os

logger = logging.getLogger(__name__)

DAMAGE_KEYWORDS = [
    "rust", "corrosion", "crack", "damage", "broken", "leak", "stain",
    "wear", "dent", "scratch", "burn", "fracture", "debris", "dirt",
    "oil", "fluid", "bent", "missing", "worn", "tear", "erosion",
]

_CONDITION_TO_SEVERITY = {
    "Good": "Minor",
    "Fair": "Moderate",
    "Poor": "Severe",
    "Critical": "Severe",
}

_FALLBACK = {
    "description": "Vision API unavailable — manual inspection recommended.",
    "detected_issues": ["AI service unavailable"],
    "severity": "Minor",
    "overall_condition": "Fair",
    "overall_score": 5,
    "errors_found": [],
    "positive_observations": [],
    "inspection_summary": "Vision API unavailable — manual inspection recommended.",
    "estimated_repair_priority": "Routine",
    "follow_up_recommended": False,
    "follow_up_notes": "",
    "rekognition_labels": [],
    "damage_indicators": [],
}


# ── AWS Rekognition ───────────────────────────────────────────────────────────

def _run_rekognition(image_bytes: bytes) -> dict:
    import boto3
    region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
    client = boto3.client("rekognition", region_name=region)
    response = client.detect_labels(
        Image={"Bytes": image_bytes},
        MaxLabels=60,
        MinConfidence=55,
    )
    all_labels = [
        {"name": lbl["Name"], "confidence": round(lbl["Confidence"], 1)}
        for lbl in response["Labels"]
    ]
    damage_labels = [
        lbl for lbl in all_labels
        if any(kw in lbl["name"].lower() for kw in DAMAGE_KEYWORDS)
    ]
    return {"all_labels": all_labels, "damage_labels": damage_labels}


# ── Google Gemini ─────────────────────────────────────────────────────────────

_PROMPT_WITH_REKOG = """\
You are an expert CAT heavy equipment inspector with 20+ years of experience.

AWS Rekognition scanned this image and detected these damage-related labels:
{damage_labels}

All detected labels for context:
{all_labels}

Inspect the image and return ONLY valid JSON — no markdown, no explanation:
{{
  "overall_condition": "Good | Fair | Poor | Critical",
  "overall_score": <integer 1-10, 10 = perfect>,
  "errors_found": [
    {{
      "error_id": "ERR-001",
      "category": "Structural | Fluid | Wear | Electrical | Safety | Other",
      "severity": "Low | Medium | High | Critical",
      "description": "detailed description",
      "location": "where on the equipment",
      "recommended_action": "what to do",
      "urgency": "Monitor | Schedule Repair | Immediate Action Required"
    }}
  ],
  "positive_observations": ["list of things that look good"],
  "inspection_summary": "1-2 sentence summary for a work order",
  "estimated_repair_priority": "Routine | Urgent | Emergency",
  "follow_up_recommended": true,
  "follow_up_notes": "additional notes"
}}"""

_PROMPT_DIRECT = """\
You are an expert CAT heavy equipment inspector with 20+ years of experience.

Inspect this image and return ONLY valid JSON — no markdown, no explanation:
{
  "overall_condition": "Good | Fair | Poor | Critical",
  "overall_score": <integer 1-10, 10 = perfect>,
  "errors_found": [
    {
      "error_id": "ERR-001",
      "category": "Structural | Fluid | Wear | Electrical | Safety | Other",
      "severity": "Low | Medium | High | Critical",
      "description": "detailed description",
      "location": "where on the equipment",
      "recommended_action": "what to do",
      "urgency": "Monitor | Schedule Repair | Immediate Action Required"
    }
  ],
  "positive_observations": ["list of things that look good"],
  "inspection_summary": "1-2 sentence summary for a work order",
  "estimated_repair_priority": "Routine | Urgent | Emergency",
  "follow_up_recommended": true,
  "follow_up_notes": "additional notes"
}"""


def _run_gemini(image_bytes: bytes, rekognition_result: dict | None, mime_type: str = "image/jpeg") -> dict:
    from google import genai
    from google.genai import types
    import PIL.Image

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    client = genai.Client(api_key=api_key)

    if rekognition_result:
        prompt_text = _PROMPT_WITH_REKOG.format(
            damage_labels=json.dumps(rekognition_result["damage_labels"], indent=2),
            all_labels=json.dumps(rekognition_result["all_labels"], indent=2),
        )
    else:
        prompt_text = _PROMPT_DIRECT

    img = PIL.Image.open(io.BytesIO(image_bytes))
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=[prompt_text, img],
    )

    import re as _re
    raw = response.text or ""
    match = _re.search(r"\{.*\}", raw, _re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object in vision response: {raw[:200]}")
    return json.loads(match.group())


# ── Public API ────────────────────────────────────────────────────────────────

def analyze_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Run Rekognition (if AWS credentials present) then Gemini deep analysis.
    Returns a dict with both legacy VisionResponse fields and rich new fields.
    """
    rekognition_result = None
    all_labels: list = []
    damage_labels: list = []

    # Try Rekognition first (only if AWS credentials are configured)
    if os.getenv("AWS_ACCESS_KEY_ID"):
        try:
            rekognition_result = _run_rekognition(image_bytes)
            all_labels = rekognition_result["all_labels"]
            damage_labels = rekognition_result["damage_labels"]
            logger.info(
                "Rekognition: %d total labels, %d damage indicators",
                len(all_labels), len(damage_labels),
            )
        except Exception as exc:
            logger.warning("Rekognition failed (%s) — using Gemini-only analysis", exc)

    # Gemini analysis
    try:
        analysis = _run_gemini(image_bytes, rekognition_result, mime_type)
    except Exception as exc:
        logger.error("Gemini vision failed: %s", exc)
        return {**_FALLBACK}

    condition = analysis.get("overall_condition", "Fair")
    errors = analysis.get("errors_found", [])
    summary = analysis.get("inspection_summary", "Inspection complete.")

    return {
        # Legacy-compatible fields
        "description": summary,
        "detected_issues": [e.get("description", "") for e in errors[:5] if e.get("description")],
        "severity": _CONDITION_TO_SEVERITY.get(condition, "Moderate"),
        # Rich fields
        "overall_condition": condition,
        "overall_score": int(analysis.get("overall_score", 5)),
        "errors_found": errors,
        "positive_observations": analysis.get("positive_observations", []),
        "inspection_summary": summary,
        "estimated_repair_priority": analysis.get("estimated_repair_priority", "Routine"),
        "follow_up_recommended": bool(analysis.get("follow_up_recommended", False)),
        "follow_up_notes": analysis.get("follow_up_notes", ""),
        "rekognition_labels": all_labels,
        "damage_indicators": damage_labels,
    }
