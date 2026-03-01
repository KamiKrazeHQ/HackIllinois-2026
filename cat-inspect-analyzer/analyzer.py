import boto3
import base64
import json
import os
import anthropic
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

DAMAGE_KEYWORDS = [
    "rust", "corrosion", "crack", "damage", "broken", "leak", "stain",
    "wear", "dent", "scratch", "burn", "fracture", "debris", "dirt",
    "oil", "fluid", "bent", "missing", "worn", "tear", "erosion"
]


def run_rekognition(image_bytes):
    client = boto3.client("rekognition", region_name=AWS_REGION)

    response = client.detect_labels(
        Image={"Bytes": image_bytes},
        MaxLabels=60,
        MinConfidence=55
    )

    all_labels = [
        {
            "name": label["Name"],
            "confidence": round(label["Confidence"], 1)
        }
        for label in response["Labels"]
    ]

    damage_labels = [
        lbl for lbl in all_labels
        if any(kw in lbl["name"].lower() for kw in DAMAGE_KEYWORDS)
    ]

    return {"all_labels": all_labels, "damage_labels": damage_labels}


def run_bedrock_analysis(image_bytes, rekognition_result):
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    prompt = f"""You are an expert CAT heavy equipment inspector with 20+ years of experience.

AWS Rekognition scanned this image and found these damage-related labels:
{json.dumps(rekognition_result["damage_labels"], indent=2)}

All detected labels for context:
{json.dumps(rekognition_result["all_labels"], indent=2)}

Carefully inspect the image and return ONLY valid JSON, no markdown, no explanation, just the JSON:

{{
  "overall_condition": "Good | Fair | Poor | Critical",
  "overall_score": <1-10 where 10 is perfect>,
  "errors_found": [
    {{
      "error_id": "ERR-001",
      "category": "Structural | Fluid | Wear | Electrical | Safety | Other",
      "severity": "Low | Medium | High | Critical",
      "description": "detailed description of the issue",
      "location": "where on the equipment",
      "recommended_action": "what to do about it",
      "urgency": "Monitor | Schedule Repair | Immediate Action Required"
    }}
  ],
  "positive_observations": ["things that look good"],
  "inspection_summary": "1-2 sentence summary for a work order",
  "estimated_repair_priority": "Routine | Urgent | Emergency",
  "follow_up_recommended": true or false,
  "follow_up_notes": "any additional notes"
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_b64
                    }
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }]
    )

    raw_text = response.content[0].text
    raw_text = raw_text.replace("```json", "").replace("```", "").strip()
    return json.loads(raw_text)


def analyze_image(image_path):
    image_path = Path(image_path)

    print(f"  → Reading image...")
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print(f"  → Running Rekognition...")
    rekognition_result = run_rekognition(image_bytes)

    print(f"  → Running Bedrock (Claude) analysis...")
    analysis = run_bedrock_analysis(image_bytes, rekognition_result)

    return {
        "image": image_path.name,
        "image_path": str(image_path.resolve()),
        "rekognition_labels": rekognition_result["all_labels"],
        "damage_indicators": rekognition_result["damage_labels"],
        "analysis": analysis
    }