"""
In-memory session store.
Each session_id maps to its own state dict — no database required.
"""

from typing import Any

_sessions: dict[str, dict[str, Any]] = {}


def _session(session_id: str) -> dict[str, Any]:
    if session_id not in _sessions:
        _sessions[session_id] = {
            "image_analysis": None,
            "audio_analysis": None,
            "sensor_data": None,
            "risk_output": None,
            "chat_history": [],
        }
    return _sessions[session_id]


# ── Savers ────────────────────────────────────────────────────────────────────

def save_image(session_id: str, data: dict) -> None:
    _session(session_id)["image_analysis"] = data


def save_audio(session_id: str, data: dict) -> None:
    _session(session_id)["audio_analysis"] = data


def save_sensor(session_id: str, data: dict) -> None:
    _session(session_id)["sensor_data"] = data


def save_risk(session_id: str, data: dict) -> None:
    _session(session_id)["risk_output"] = data


def add_chat_message(session_id: str, role: str, content: str) -> None:
    """role: 'user' or 'assistant'"""
    _session(session_id)["chat_history"].append({"role": role, "content": content})


# ── Reader ────────────────────────────────────────────────────────────────────

def get_full_context(session_id: str) -> dict[str, Any]:
    return _session(session_id)


def clear_session(session_id: str) -> None:
    _sessions.pop(session_id, None)
