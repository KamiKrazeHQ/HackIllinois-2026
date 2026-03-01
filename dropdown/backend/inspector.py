import json
import anthropic
from pathlib import Path
import base64
import os

def _load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_env_file(Path(__file__).resolve().parent / ".env")
_load_env_file(Path(__file__).resolve().parent.parent / ".env")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

DB_PATH = Path(__file__).parent / "parts_db.json"
with open(DB_PATH) as f:
    PARTS_DB = json.load(f)


def find_matching_parts(fault_description: str) -> list[dict]:
    fault_lower = fault_description.lower()
    matched_parts = []
    seen_numbers = set()

    for category in PARTS_DB["keywords"].values():
        for keyword in category["keywords"]:
            if keyword in fault_lower:
                for part in category["parts"]:
                    if part["part_number"] not in seen_numbers:
                        matched_parts.append(part)
                        seen_numbers.add(part["part_number"])
                break

    return matched_parts


def analyze_inspection(file_bytes: bytes, mime_type: str) -> list[dict]:
    if not ANTHROPIC_API_KEY or client is None:
        raise RuntimeError("Missing ANTHROPIC_API_KEY environment variable.")

    prompt = """
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

    encoded = base64.standard_b64encode(file_bytes).decode("utf-8")

    if mime_type == "application/pdf":
        content = [
            {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": encoded,
                },
            },
            {"type": "text", "text": prompt},
        ]
    else:
        content = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime_type,
                    "data": encoded,
                },
            },
            {"type": "text", "text": prompt},
        ]

    try:
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content": content}],
        )
    except Exception as exc:
        message = str(exc)
        if "not_found_error" in message and "model" in message:
            raise RuntimeError(
                f"Anthropic model '{ANTHROPIC_MODEL}' was not found. "
                "Set ANTHROPIC_MODEL in .env to a valid model ID from your Anthropic account."
            ) from exc
        raise

    text_chunks = [block.text for block in response.content if getattr(block, "type", "") == "text" and hasattr(block, "text")]
    raw = "\n".join(text_chunks).strip().replace("```json", "").replace("```", "").strip()

    try:
        faults = json.loads(raw)
    except json.JSONDecodeError:
        faults = []

    augmented = []
    for fault in faults:
        search_text = f"{fault.get('fault', '')} {fault.get('description', '')} {fault.get('component', '')}"
        parts = find_matching_parts(search_text)
        fault["parts"] = parts
        augmented.append(fault)

    return augmented
