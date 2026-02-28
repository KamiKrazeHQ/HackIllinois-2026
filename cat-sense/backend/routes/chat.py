import logging
import time

from fastapi import APIRouter
from models.schemas import ChatRequest, ChatResponse
from services.llm_service import generate_response
from services.snowflake_service import log_session
from services.elevenlabs_service import synthesise
from services.demo_service import is_demo, DEMO_DIAGNOSIS
import services.memory_store as mem

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

_MAX_MESSAGE_CHARS = 1000


@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest):
    sid = request.session_id

    # Sanitize + cap input length
    message = request.message.strip()[:_MAX_MESSAGE_CHARS]
    if not message:
        message = "Summarize the current diagnostic findings."

    ctx = mem.get_full_context(sid)

    # Demo mode — skip LLM call
    if is_demo():
        logger.info("DEMO_MODE: returning predefined chat response")
        summary = DEMO_DIAGNOSIS["diagnosis_summary"]
        mem.add_chat_message(sid, "user", message)
        mem.add_chat_message(sid, "assistant", summary)
        audio_url = synthesise(summary, session_id=sid)
        return ChatResponse(reply=summary, diagnosis=DEMO_DIAGNOSIS, audio_url=audio_url, context_used=ctx)

    t0 = time.perf_counter()
    diagnosis = generate_response(message, ctx)
    logger.info("LLM response completed in %.0fms", (time.perf_counter() - t0) * 1000)

    summary = diagnosis.get("diagnosis_summary", "Unable to determine — insufficient data")

    mem.add_chat_message(sid, "user", message)
    mem.add_chat_message(sid, "assistant", summary)

    audio_url = synthesise(summary, session_id=sid)
    log_session(sid, ctx)

    return ChatResponse(reply=summary, diagnosis=diagnosis, audio_url=audio_url, context_used=ctx)
