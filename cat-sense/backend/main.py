from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import chat, vision, audio, risk, dealers

app = FastAPI(title="Cat Sense API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(vision.router)
app.include_router(audio.router)
app.include_router(risk.router)
app.include_router(dealers.router)


@app.get("/")
def health():
    return {"status": "ok"}
