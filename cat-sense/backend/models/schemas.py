from pydantic import BaseModel
from typing import Any


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    reply: str
    context_used: dict[str, Any] = {}


# ── Vision ────────────────────────────────────────────────────────────────────

class VisionResponse(BaseModel):
    description: str
    detected_issues: list[str]
    severity: str  # "Minor" | "Moderate" | "Severe"


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
