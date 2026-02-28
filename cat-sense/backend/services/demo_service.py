"""
Demo mode — stable predefined outputs for all routes.

Set DEMO_MODE=true in .env to enable.
When enabled, all external API calls are bypassed so the demo
works even with no internet / expired keys.
"""

import os


def is_demo() -> bool:
    return os.environ.get("DEMO_MODE", "").lower() in ("1", "true", "yes")


# ── Predefined responses ───────────────────────────────────────────────────────

DEMO_VISION = {
    "component": "hydraulic pump",
    "issue": "Visible crack on the pump housing near the inlet port",
    "severity": "Moderate",
    "classification": "Crack",
    "confidence": 0.91,
    "recommended_action": "Replace hydraulic pump housing within 48 hours",
}

DEMO_AUDIO = {
    "dominant_frequency_hz": 187.5,
    "peak_amplitude_normalized": 0.74,
    "sample_rate_hz": 44100,
    "anomaly_detected": True,
    "anomaly_type": "bearing outer race fault",
    "severity": "Moderate",
    "fft_anomaly": "bearing outer race fault",
    "transcript": "high pitched grinding noise during operation",
    "transcript_anomaly": "grinding",
    "transcription_error": None,
    "fft_error": None,
}

DEMO_RISK = {
    "failure_probability_14_days": 62.0,
    "estimated_downtime_cost_usd": 48000.0,
    "recommended_action_window": "Schedule maintenance within 48 hours",
    "risk_level": "High",
}

DEMO_DIAGNOSIS = {
    "diagnosis_summary": (
        "Hydraulic pump shows a Moderate crack on the housing combined with "
        "bearing outer race fault at 187 Hz — failure likely within 14 days."
    ),
    "probable_causes": [
        "Fatigue crack from prolonged high-pressure cycling",
        "Bearing wear due to contaminated hydraulic fluid",
        "Misalignment causing uneven load distribution",
    ],
    "severity": "Moderate",
    "failure_probability": "62%",
    "estimated_cost": "$48,000",
    "recommended_action": (
        "Replace hydraulic pump housing and inspect bearing assembly. "
        "Flush and replace hydraulic fluid. Schedule full inspection within 48 hours."
    ),
}
