"""
Weighted scoring risk engine for heavy machinery health assessment.

Inputs : severity level, temperature (°C), pressure (PSI)
Outputs: failure probability (14-day), estimated downtime cost, action window
"""

from models.schemas import RiskRequest, RiskResponse

# ── Weights ───────────────────────────────────────────────────────────────────

SEVERITY_SCORE = {"Minor": 20, "Moderate": 50, "Severe": 85}

# Thresholds considered "normal" — beyond these, score increases
TEMP_BASELINE = 80.0      # °C
PRESSURE_BASELINE = 150.0  # PSI

TEMP_WEIGHT = 0.15      # score points per °C over baseline
PRESSURE_WEIGHT = 0.10  # score points per PSI over baseline

DOWNTIME_TABLE = {
    "Low":      (500,    1),
    "Medium":   (2_000,  3),
    "High":     (8_000,  7),
    "Critical": (20_000, 14),
}

ACTION_WINDOW = {
    "Low":      "Schedule maintenance within 30 days",
    "Medium":   "Schedule maintenance within 14 days",
    "High":     "Schedule maintenance within 72 hours",
    "Critical": "Immediate shutdown and inspection required",
}


def _risk_level(probability: float) -> str:
    if probability < 25:
        return "Low"
    if probability < 50:
        return "Medium"
    if probability < 75:
        return "High"
    return "Critical"


def compute_risk(request: RiskRequest) -> RiskResponse:
    base = SEVERITY_SCORE.get(request.severity, 20)

    temp_delta = max(0.0, request.temperature_c - TEMP_BASELINE)
    pressure_delta = max(0.0, request.pressure_psi - PRESSURE_BASELINE)

    probability = base + (temp_delta * TEMP_WEIGHT) + (pressure_delta * PRESSURE_WEIGHT)
    probability = min(probability, 100.0)

    level = _risk_level(probability)
    cost_per_day, days = DOWNTIME_TABLE[level]

    return RiskResponse(
        failure_probability_14_days=round(probability, 1),
        estimated_downtime_cost_usd=float(cost_per_day * days),
        recommended_action_window=ACTION_WINDOW[level],
        risk_level=level,
    )
