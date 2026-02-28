import logging
import time
import uuid

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from routes import chat, vision, audio, risk, dealers
from services.rag_service import initialise as rag_init

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("cat_sense")

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="CAT Sense API", version="0.1.0")


@app.on_event("startup")
def startup():
    rag_init()


# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every request with timing and a short request ID."""
    req_id = uuid.uuid4().hex[:8]
    start = time.perf_counter()
    logger.info("→ [%s] %s %s", req_id, request.method, request.url.path)
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info("← [%s] %s %.0fms", req_id, response.status_code, elapsed)
    return response


# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "detail": f"{type(exc).__name__}: {exc}",
        },
    )


# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(chat.router)
app.include_router(vision.router)
app.include_router(audio.router)
app.include_router(risk.router)
app.include_router(dealers.router)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "service": "CAT Sense API"}
