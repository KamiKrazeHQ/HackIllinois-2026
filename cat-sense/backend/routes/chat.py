from fastapi import APIRouter
from models.schemas import ChatRequest, ChatResponse
from services.llm_service import generate_response
from services.snowflake_service import log_session
from services.elevenlabs_service import synthesise
import services.memory_store as mem

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest):
    sid = request.session_id
    ctx = mem.get_full_context(sid)

    diagnosis = generate_response(request.message, ctx)
    summary = diagnosis.get("diagnosis_summary", "Unable to determine — insufficient data")

    mem.add_chat_message(sid, "user", request.message)
    mem.add_chat_message(sid, "assistant", summary)

    # TTS — pass plain text summary, returns URL path or None
    audio_url = synthesise(summary, session_id=sid)

    # Log to Snowflake (silent fallback if not configured)
    log_session(sid, ctx)

    return ChatResponse(reply=summary, diagnosis=diagnosis, audio_url=audio_url, context_used=ctx)
