from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes import chat, vision, audio, risk, dealers
from services.rag_service import initialise as rag_init

app = FastAPI(title="CAT Sense API", version="0.1.0")


@app.on_event("startup")
def startup():
    rag_init()  # Build RAG vector store from knowledge base

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(vision.router)
app.include_router(audio.router)
app.include_router(risk.router)
app.include_router(dealers.router)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "service": "CAT Sense API"}
