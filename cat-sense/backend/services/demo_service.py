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
    "description": "Hydraulic pump shows a high-severity crack at the inlet port with active fluid seepage. Immediate replacement required.",
    "detected_issues": [
        "Crack on pump housing near inlet port",
        "Fluid seepage around seal area",
        "Surface corrosion on mounting bracket",
    ],
    "severity": "Moderate",
    "overall_condition": "Poor",
    "overall_score": 4,
    "errors_found": [
        {
            "error_id": "ERR-001",
            "category": "Structural",
            "severity": "High",
            "description": "Visible crack on the pump housing near the inlet port",
            "location": "Hydraulic pump inlet port",
            "recommended_action": "Replace hydraulic pump housing within 48 hours",
            "urgency": "Immediate Action Required",
        },
        {
            "error_id": "ERR-002",
            "category": "Fluid",
            "severity": "Medium",
            "description": "Fluid seepage detected around the shaft seal area",
            "location": "Pump shaft seal",
            "recommended_action": "Replace shaft seal and inspect hydraulic fluid level",
            "urgency": "Schedule Repair",
        },
        {
            "error_id": "ERR-003",
            "category": "Wear",
            "severity": "Low",
            "description": "Surface corrosion forming on mounting bracket",
            "location": "Pump mounting bracket",
            "recommended_action": "Clean, treat with rust inhibitor, repaint",
            "urgency": "Monitor",
        },
    ],
    "positive_observations": [
        "Hydraulic lines appear intact with no visible kinks",
        "Pressure relief valve appears properly seated",
    ],
    "inspection_summary": "Hydraulic pump shows a high-severity crack at the inlet port with active fluid seepage. Immediate replacement of pump housing required before returning to service.",
    "estimated_repair_priority": "Urgent",
    "follow_up_recommended": True,
    "follow_up_notes": "After pump housing replacement, perform full hydraulic pressure test and inspect all downstream components for contamination.",
    "rekognition_labels": [
        {"name": "Machine", "confidence": 99.1},
        {"name": "Hydraulic", "confidence": 87.3},
        {"name": "Crack", "confidence": 76.5},
        {"name": "Oil Stain", "confidence": 68.2},
    ],
    "damage_indicators": [
        {"name": "Crack", "confidence": 76.5},
        {"name": "Oil Stain", "confidence": 68.2},
    ],
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

DEMO_INSPECTION = [
    {
        "fault": "Hydraulic Cylinder Seal Failure",
        "description": "Active fluid leak detected at the rod seal of the hydraulic cylinder. Oil residue visible along the cylinder barrel indicating progressive seal degradation.",
        "severity": "Urgent",
        "component": "Hydraulic Cylinder",
        "parts": [
            {"part_number": "1P-0507", "name": "Hydraulic Cylinder Seal Kit", "price_usd": 189.00},
        ],
    },
    {
        "fault": "Engine Air Filter Restriction",
        "description": "Air filter restriction indicator in yellow zone. Filter element shows heavy dust loading, reducing engine airflow by an estimated 15-20%.",
        "severity": "Urgent",
        "component": "Air Intake System",
        "parts": [
            {"part_number": "1R-0749", "name": "Engine Air Filter Element", "price_usd": 67.50},
        ],
    },
    {
        "fault": "Track Pad Wear — Left Side",
        "description": "Left-side track pads measured at 18mm remaining (service limit 12mm). Recommend scheduling replacement within next 200 operating hours.",
        "severity": "Monitor",
        "component": "Undercarriage",
        "parts": [
            {"part_number": "9W-2451", "name": "Track Shoe Assembly", "price_usd": 1240.00},
        ],
    },
    {
        "fault": "Coolant Additive Depletion",
        "description": "Coolant SCA (supplemental coolant additive) concentration below minimum threshold. Cavitation erosion risk to cylinder liners if not treated.",
        "severity": "Monitor",
        "component": "Cooling System",
        "parts": [
            {"part_number": "8T-5560", "name": "Cooling System Conditioner", "price_usd": 34.00},
        ],
    },
]

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
