from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


class RiskRequest(BaseModel):
    vibration_data: list[float] = []
    audio_features: dict = {}
    image_description: str = ""


class RiskResponse(BaseModel):
    score: float
