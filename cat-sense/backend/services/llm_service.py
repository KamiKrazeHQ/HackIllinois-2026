"""
Provider-agnostic LLM reasoning service.
Set LLM_PROVIDER=gemini (default) or claude / openai in your .env.

All responses are validated against a structured JSON schema.
On parse failure, one retry is attempted with a stricter prompt.
"""

import os
import re
import json
import logging
import concurrent.futures
from typing import Any
from services.rag_service import retrieve_as_block

logger = logging.getLogger(__name__)

_TIMEOUT_S = 30
_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

# ── Output schema ─────────────────────────────────────────────────────────────

RESPONSE_SCHEMA = {
    "diagnosis_summary": str,
    "probable_causes": list,
    "severity": str,           # "Minor" | "Moderate" | "Severe"
    "failure_probability": str, # e.g. "55%"
    "estimated_cost": str,      # e.g. "$56,000"
    "recommended_action": str,
}

_JSON_INSTRUCTION = """
You MUST respond with ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "diagnosis_summary": "<one sentence summary of findings>",
  "probable_causes": ["<cause 1>", "<cause 2>"],
  "severity": "<Minor | Moderate | Severe>",
  "failure_probability": "<0-100%>",
  "estimated_cost": "<estimated downtime cost in USD>",
  "recommended_action": "<specific next step for the technician>"
}
"""

_STRICT_JSON_INSTRUCTION = """
CRITICAL: Output ONLY a raw JSON object. No text before or after.
No markdown. No ```json. No explanation. ONLY the JSON object.
Schema:
{
  "diagnosis_summary": "string",
  "probable_causes": ["string"],
  "severity": "Minor|Moderate|Severe",
  "failure_probability": "string ending in %",
  "estimated_cost": "string starting with $",
  "recommended_action": "string"
}
"""

_SYSTEM_PROMPT = """
You are CAT Sense, an expert AI diagnostic system for heavy machinery.
You receive structured sensor data (image analysis, audio analysis, risk scores)
and answer the technician's questions with precise, actionable diagnostics.
Use technical language appropriate for field technicians.
"""

# ── JSON parsing ──────────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict | None:
    """Extract and parse JSON from LLM output, stripping markdown fences."""
    text = text.strip()
    # Strip ```json ... ``` fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # Find first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return None


def _validate(data: dict) -> dict:
    """Ensure all required fields exist; fill missing ones with defaults."""
    defaults = {
        "diagnosis_summary": "Unable to determine — insufficient data",
        "probable_causes": ["Unknown"],
        "severity": "Minor",
        "failure_probability": "N/A",
        "estimated_cost": "N/A",
        "recommended_action": "Manual inspection recommended",
    }
    for key, default in defaults.items():
        if key not in data or not data[key]:
            data[key] = default
    if not isinstance(data["probable_causes"], list):
        data["probable_causes"] = [str(data["probable_causes"])]
    return data


def _parse_or_retry(raw: str, retry_fn) -> dict:
    """Parse JSON from raw text; retry once with strict prompt if it fails."""
    result = _extract_json(raw)
    if result:
        return _validate(result)

    logger.warning("JSON parse failed on first attempt — retrying with strict prompt")
    retry_raw = retry_fn()
    result = _extract_json(retry_raw)
    if result:
        return _validate(result)

    logger.error("JSON parse failed after retry. Raw: %s", raw[:200])
    return _validate({})


# ── Context builder ───────────────────────────────────────────────────────────

def _build_context_block(context: dict[str, Any]) -> str:
    parts = []

    if context.get("image_analysis"):
        img = context["image_analysis"]
        parts.append(
            f"[VISION] Component: {img.get('component', 'unknown')} | "
            f"Issue: {img.get('issue', 'none')} | "
            f"Severity: {img.get('severity')} | "
            f"Classification: {img.get('classification')}"
        )

    if context.get("audio_analysis"):
        aud = context["audio_analysis"]
        parts.append(
            f"[AUDIO] Anomaly: {aud.get('anomaly_type', 'none')} | "
            f"Frequency: {aud.get('dominant_frequency_hz')} Hz | "
            f"Severity: {aud.get('severity')}"
        )

    if context.get("risk_output"):
        risk = context["risk_output"]
        parts.append(
            f"[RISK] Level: {risk.get('risk_level')} | "
            f"Failure probability (14 days): {risk.get('failure_probability_14_days')}% | "
            f"Estimated downtime cost: ${risk.get('estimated_downtime_cost_usd'):,.0f} | "
            f"Action: {risk.get('recommended_action_window')}"
        )

    if not parts:
        return "No sensor data available yet."
    return "\n".join(parts)


# ── Provider calls ────────────────────────────────────────────────────────────

def _call_gemini(prompt: str, strict: bool = False) -> str:
    from google import genai
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    instruction = _STRICT_JSON_INSTRUCTION if strict else _JSON_INSTRUCTION
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=f"{_SYSTEM_PROMPT}\n{instruction}\n\n{prompt}",
    )
    return response.text


def _call_claude(prompt: str, history: list[dict], strict: bool = False) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    instruction = _STRICT_JSON_INSTRUCTION if strict else _JSON_INSTRUCTION
    messages = [{"role": t["role"], "content": t["content"]} for t in history[-6:]]
    messages.append({"role": "user", "content": prompt})
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=f"{_SYSTEM_PROMPT}\n{instruction}",
        messages=messages,
    )
    return response.content[0].text


def _call_openai(prompt: str, history: list[dict], strict: bool = False) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    instruction = _STRICT_JSON_INSTRUCTION if strict else _JSON_INSTRUCTION
    messages = [{"role": "system", "content": f"{_SYSTEM_PROMPT}\n{instruction}"}]
    for t in history[-6:]:
        messages.append({"role": t["role"], "content": t["content"]})
    messages.append({"role": "user", "content": prompt})
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=600,
        messages=messages,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content


# ── Public interface ──────────────────────────────────────────────────────────

_FALLBACK = _validate({})


def generate_response(user_message: str, context: dict[str, Any]) -> dict:
    """
    Returns a validated dict matching RESPONSE_SCHEMA.
    Never raises — falls back to defaults on any error.
    """
    provider = os.environ.get("LLM_PROVIDER", "gemini").lower()
    context_block = _build_context_block(context)
    history = context.get("chat_history", [])

    rag_block = retrieve_as_block(user_message)
    if rag_block:
        context_block = f"{context_block}\n\nRelevant Knowledge Base:\n{rag_block}"

    prompt = f"Sensor Context:\n{context_block}\n\nTechnician Question: {user_message}"

    def _run() -> dict:
        if provider == "claude":
            raw = _call_claude(prompt, history)
            return _parse_or_retry(raw, lambda: _call_claude(prompt, history, strict=True))
        if provider == "openai":
            raw = _call_openai(prompt, history)
            return _parse_or_retry(raw, lambda: _call_openai(prompt, history, strict=True))
        # Default: gemini
        raw = _call_gemini(prompt)
        return _parse_or_retry(raw, lambda: _call_gemini(prompt, strict=True))

    try:
        future = _executor.submit(_run)
        return future.result(timeout=_TIMEOUT_S)

    except concurrent.futures.TimeoutError:
        logger.error("LLM timed out after %ds (%s)", _TIMEOUT_S, provider)
        return {**_FALLBACK, "diagnosis_summary": f"LLM timed out after {_TIMEOUT_S}s — try again"}

    except KeyError as e:
        logger.warning("Missing API key: %s", e)
        return {**_FALLBACK, "diagnosis_summary": f"API key missing: {e}"}

    except Exception as e:
        logger.error("LLM error (%s): %s", provider, e)
        return {**_FALLBACK, "diagnosis_summary": f"LLM error: {type(e).__name__}"}
