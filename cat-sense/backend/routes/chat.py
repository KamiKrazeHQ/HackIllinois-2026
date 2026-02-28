from fastapi import APIRouter
from models.schemas import ChatRequest, ChatResponse
import services.memory_store as mem

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest):
    sid = request.session_id
    ctx = mem.get_full_context(sid)

    # Build a simulated reasoning reply from stored context
    parts: list[str] = []

    if ctx["image_analysis"]:
        img = ctx["image_analysis"]
        parts.append(
            f"Visual inspection found: {', '.join(img.get('detected_issues', []))} "
            f"(severity: {img.get('severity', 'unknown')})."
        )

    if ctx["audio_analysis"]:
        aud = ctx["audio_analysis"]
        parts.append(
            f"Audio analysis detected a {aud.get('anomaly_type', 'unknown')} anomaly "
            f"at {aud.get('dominant_frequency_hz', '?')} Hz "
            f"(severity: {aud.get('severity', 'unknown')})."
        )

    if ctx["risk_output"]:
        risk = ctx["risk_output"]
        parts.append(
            f"Risk assessment: {risk.get('risk_level')} — "
            f"{risk.get('failure_probability_14_days')}% failure probability over 14 days. "
            f"{risk.get('recommended_action_window')}."
        )

    if not parts:
        parts.append(
            "No sensor data has been analysed yet. "
            "Please upload an image or audio recording to begin diagnostics."
        )

    summary = " ".join(parts)
    reply = f"CAT Sense Analysis: {summary} | You asked: \"{request.message}\""

    mem.add_chat_message(sid, "user", request.message)
    mem.add_chat_message(sid, "assistant", reply)

    return ChatResponse(reply=reply, context_used=ctx)
