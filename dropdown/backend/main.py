from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

try:
    from .inspector import analyze_inspection
except ImportError:
    from inspector import analyze_inspection

app = FastAPI(title="CAT Inspection RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/upload-inspection")
async def upload_inspection(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Please upload a PDF or image."
        )

    contents = await file.read()

    try:
        results = analyze_inspection(contents, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    urgent = [f for f in results if f.get("severity") == "Urgent"]
    monitor = [f for f in results if f.get("severity") == "Monitor"]
    sorted_results = urgent + monitor

    return {
        "filename": file.filename,
        "total_faults": len(results),
        "urgent_count": len(urgent),
        "monitor_count": len(monitor),
        "faults": sorted_results,
    }
