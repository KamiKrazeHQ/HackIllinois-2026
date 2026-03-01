from pydantic import BaseModel
from typing import Any


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    reply: str                          # diagnosis_summary — for display and TTS
    diagnosis: dict[str, Any] = {}      # full structured diagnosis from LLM
    audio_url: str | None = None        # ElevenLabs TTS mp3, None if TTS not configured
    context_used: dict[str, Any] = {}


# ── Vision ────────────────────────────────────────────────────────────────────

class ErrorFound(BaseModel):
    error_id: str = ""
    category: str = ""
    severity: str = "Low"        # Low | Medium | High | Critical
    description: str = ""
    location: str = ""
    recommended_action: str = ""
    urgency: str = "Monitor"     # Monitor | Schedule Repair | Immediate Action Required


class VisionResponse(BaseModel):
    # Legacy fields (kept for backward compatibility)
    description: str
    detected_issues: list[str]
    severity: str                # "Minor" | "Moderate" | "Severe"
    # Rich fields
    overall_condition: str = "Fair"          # Good | Fair | Poor | Critical
    overall_score: int = 5                   # 1-10
    errors_found: list[ErrorFound] = []
    positive_observations: list[str] = []
    inspection_summary: str = ""
    estimated_repair_priority: str = "Routine"   # Routine | Urgent | Emergency
    follow_up_recommended: bool = False
    follow_up_notes: str = ""
    rekognition_labels: list[dict] = []
    damage_indicators: list[dict] = []


# ── Audio ─────────────────────────────────────────────────────────────────────

class AudioResponse(BaseModel):
    dominant_frequency_hz: float
    anomaly_detected: bool
    anomaly_type: str
    severity: str  # "Minor" | "Moderate" | "Severe"


# ── Risk ──────────────────────────────────────────────────────────────────────

class RiskRequest(BaseModel):
    session_id: str = "default"
    severity: str = "Minor"       # "Minor" | "Moderate" | "Severe"
    temperature_c: float = 25.0
    pressure_psi: float = 100.0


class RiskResponse(BaseModel):
    failure_probability_14_days: float   # 0–100 %
    estimated_downtime_cost_usd: float
    recommended_action_window: str
    risk_level: str                      # "Low" | "Medium" | "High" | "Critical"


# ── Dealers ───────────────────────────────────────────────────────────────────

class Dealer(BaseModel):
    name: str
    address: str
    distance_km: float
    phone: str
    specialization: str


class DealersResponse(BaseModel):
    dealers: list[Dealer]
