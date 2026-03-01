"""
Garage routes — machine registry with CAT PIN decoding and inspection scanning.
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/garage", tags=["garage"])

# ── In-memory store ───────────────────────────────────────────────────────────

class InspectionRecord(BaseModel):
    id: str
    filename: str
    summary: str
    issues_found: list[str]
    overall_condition: str   # Good / Fair / Poor
    scanned_at: str


class Machine(BaseModel):
    id: str
    nickname: str
    pin: str                 # 17-char CAT PIN
    model_family: str
    model_code: str
    serial_number: str
    year: Optional[str]
    description: str
    inspections: list[InspectionRecord] = []
    added_at: str


machines: dict[str, Machine] = {}


# ── PIN decoder ───────────────────────────────────────────────────────────────

def _decode_pin(pin: str) -> dict:
    """
    Decode a 17-character CAT PIN.
    Tries pandas CSV lookup first; falls back to position heuristics.
    """
    pin = pin.upper().strip()

    # Attempt CSV lookup -------------------------------------------------
    try:
        import pandas as pd
        csv_path = Path(__file__).parent.parent / "data" / "cat_pins.csv"
        if csv_path.exists():
            df = pd.read_csv(csv_path, dtype=str)
            match = df[df["pin"] == pin]
            if not match.empty:
                row = match.iloc[0]
                return {
                    "model_family": row.get("model_family", "Unknown"),
                    "model_code": row.get("model_code", pin[3:8]),
                    "serial_number": row.get("serial_number", pin[8:]),
                    "year": row.get("year", None),
                    "description": row.get("description", "CAT Equipment"),
                }
    except Exception as exc:
        logger.warning("PIN CSV lookup failed: %s", exc)

    # Heuristic fallback -------------------------------------------------
    # Standard CAT PIN structure:
    #   [0]     = world manufacturer code (prefix)
    #   [1-2]   = check digits / reserved
    #   [3-7]   = model identifier
    #   [8-10]  = model variant / config
    #   [11-16] = sequential serial number
    model_code = pin[3:8] if len(pin) >= 8 else pin
    serial_number = pin[8:] if len(pin) > 8 else ""
    year = None

    # Very rough family mapping from model prefix
    prefix_map = {
        "336": "Excavator", "330": "Excavator", "320": "Excavator", "349": "Excavator",
        "963": "Track Loader", "953": "Track Loader", "972": "Wheel Loader", "980": "Wheel Loader",
        "D6": "Dozer", "D7": "Dozer", "D8": "Dozer", "D9": "Dozer",
        "740": "Articulated Truck", "745": "Articulated Truck",
        "777": "Mining Truck", "785": "Mining Truck",
        "160": "Motor Grader", "140": "Motor Grader",
        "420": "Backhoe Loader", "430": "Backhoe Loader",
    }
    family = "Heavy Equipment"
    for prefix, fam in prefix_map.items():
        if model_code.startswith(prefix):
            family = fam
            break

    return {
        "model_family": family,
        "model_code": model_code,
        "serial_number": serial_number,
        "year": year,
        "description": f"CAT {model_code} — {family}",
    }


# ── Local PDF/image text extraction fallback ─────────────────────────────────

def _local_pdf_parse(file_bytes: bytes, mime_type: str) -> tuple[str, list[str], str]:
    """Extract text from PDF and classify issues using keyword matching."""
    text = ""

    if mime_type == "application/pdf":
        try:
            import io
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            logger.warning("pypdf extraction failed: %s", e)

    if not text.strip():
        return (
            "Inspection document received. AI analysis unavailable — review the document manually.",
            ["AI service unavailable — manual inspection review required."],
            "Fair",
        )

    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # Keyword → issue category mapping
    FAIL_KEYWORDS = ["fail", "replace", "repair", "contamination", "leak", "fault code",
                     "overdue", "bypass", "triggered", "immediate", "poor", "critical"]
    WARN_KEYWORDS = ["monitor", "watch", "worn", "low", "degraded", "cracking",
                     "noisy", "rough", "approaching", "seep", "slight"]

    issues: list[str] = []
    fail_count = 0
    warn_count = 0

    for line in lines:
        ll = line.lower()
        if any(k in ll for k in FAIL_KEYWORDS):
            # Trim to a reasonable length
            issues.append(line[:120])
            fail_count += 1
        elif any(k in ll for k in WARN_KEYWORDS):
            issues.append(line[:120])
            warn_count += 1

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_issues: list[str] = []
    for i in issues:
        if i not in seen:
            seen.add(i)
            unique_issues.append(i)

    if fail_count > 0:
        condition = "Poor"
        summary = (
            f"Inspection identified {fail_count} critical failure(s) and {warn_count} advisory item(s). "
            "Immediate attention is required before returning the machine to service. "
            "Review all FAIL items and follow CAT recommended repair procedures."
        )
    elif warn_count > 0:
        condition = "Fair"
        summary = (
            f"Inspection found {warn_count} items requiring monitoring. "
            "No immediate failures detected, but several components show wear or degradation. "
            "Schedule maintenance within the recommended service window."
        )
    else:
        condition = "Good"
        summary = "All inspected items appear within acceptable limits. No significant issues detected. Continue standard maintenance schedule."

    return summary, unique_issues[:15], condition


# ── Inspection scanner (Gemini) ───────────────────────────────────────────────

async def _scan_with_gemini(file_bytes: bytes, mime_type: str, machine: Machine) -> InspectionRecord:
    import json, base64
    from datetime import datetime
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = anthropic.Anthropic(api_key=api_key)

    system_prompt = (
        "You are a CAT heavy equipment inspection analyst. "
        "Read the attached inspection document and extract ALL findings. "
        "Return ONLY a valid JSON object with exactly these keys:\n"
        '  "summary": string (2-3 sentence overview)\n'
        '  "issues_found": array of strings (every fault, warning, or item needing attention; empty array if none)\n'
        '  "overall_condition": exactly one of "Good", "Fair", or "Poor"\n\n'
        "Rules: Poor = any FAIL/fault codes/leaks/contamination/immediate risk. "
        "Fair = Monitor/Watch items only. Good = everything OK. "
        "No text outside the JSON object."
    )
    user_text = f"Machine: {machine.description} (PIN: {machine.pin}). Analyse this inspection document."

    effective_mime = mime_type or "application/pdf"
    b64 = base64.standard_b64encode(file_bytes).decode()

    logger.info("Scanning with Anthropic — mime: %s, bytes: %d", effective_mime, len(file_bytes))

    # Build content block — Claude supports PDFs and images natively
    if effective_mime == "application/pdf":
        doc_block = {
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": b64},
        }
    else:
        safe_mime = effective_mime if effective_mime in ("image/jpeg", "image/png", "image/gif", "image/webp") else "image/jpeg"
        doc_block = {
            "type": "image",
            "source": {"type": "base64", "media_type": safe_mime, "data": b64},
        }

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [doc_block, {"type": "text", "text": user_text}],
                }
            ],
        )
        text = response.content[0].text.strip()
        logger.info("Anthropic raw response: %s", text[:400])

        # Strip markdown fences if present
        if text.startswith("```"):
            lines = text.splitlines()
            end = -1 if lines[-1].strip() == "```" else len(lines)
            text = "\n".join(lines[1:end])

        parsed = json.loads(text)
        summary = str(parsed.get("summary", "Inspection complete."))
        issues = [str(i) for i in parsed.get("issues_found", [])]
        condition = parsed.get("overall_condition", "Fair")
        if condition not in ("Good", "Fair", "Poor"):
            condition = "Fair"
    except Exception as exc:
        logger.warning("Anthropic scan failed (%s), falling back to local extraction", exc)
        summary, issues, condition = _local_pdf_parse(file_bytes, effective_mime)

    return InspectionRecord(
        id=uuid.uuid4().hex[:8],
        filename="inspection_upload",
        summary=summary,
        issues_found=issues,
        overall_condition=condition,
        scanned_at=datetime.utcnow().isoformat(),
    )


# ── Routes ────────────────────────────────────────────────────────────────────

class AddMachineRequest(BaseModel):
    nickname: str
    pin: str


@router.post("/add", response_model=Machine)
def add_machine(req: AddMachineRequest):
    pin = req.pin.strip().upper()
    if len(pin) != 17:
        raise HTTPException(status_code=400, detail="PIN must be exactly 17 characters.")
    decoded = _decode_pin(pin)
    from datetime import datetime
    machine = Machine(
        id=uuid.uuid4().hex[:8],
        nickname=req.nickname.strip() or decoded["model_code"],
        pin=pin,
        model_family=decoded["model_family"],
        model_code=decoded["model_code"],
        serial_number=decoded["serial_number"],
        year=decoded.get("year"),
        description=decoded["description"],
        added_at=datetime.utcnow().isoformat(),
    )
    machines[machine.id] = machine
    logger.info("Machine added: %s (%s)", machine.nickname, machine.pin)
    return machine


@router.get("/", response_model=list[Machine])
def list_machines():
    return list(machines.values())


@router.get("/{machine_id}", response_model=Machine)
def get_machine(machine_id: str):
    m = machines.get(machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found.")
    return m


@router.post("/{machine_id}/inspection/scan", response_model=InspectionRecord)
async def scan_inspection(machine_id: str, file: UploadFile = File(...)):
    m = machines.get(machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found.")

    contents = await file.read()
    mime = file.content_type or "image/jpeg"
    record = await _scan_with_gemini(contents, mime, m)
    record.filename = file.filename or "inspection_upload"
    m.inspections.append(record)
    return record


@router.delete("/{machine_id}")
def remove_machine(machine_id: str):
    if machine_id not in machines:
        raise HTTPException(status_code=404, detail="Machine not found.")
    del machines[machine_id]
    return {"deleted": machine_id}
