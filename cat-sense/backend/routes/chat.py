from fastapi import APIRouter
from models.schemas import ChatRequest, ChatResponse
from services.llm_service import generate_response

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    reply = await generate_response(request.message)
    return ChatResponse(reply=reply)
