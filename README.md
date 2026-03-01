# CAT Sense — Heavy Machinery Diagnostics

An AI-powered diagnostic platform for Caterpillar heavy equipment. Field technicians upload images, audio recordings, and sensor readings to receive structured, actionable diagnostics — failure probability, cost estimates, and recommended repair actions — through a conversational interface built for the job site.

Built at HackIllinois 2026.

---

## Features

| Tab | What it does |
|-----|-------------|
| **Chat** | Multi-turn AI diagnostic assistant. Detects intent and embeds inline widgets (vision, audio, sensors) mid-conversation. |
| **Vision** | Drag-and-drop image inspection. AWS Rekognition + Gemini identify damage with bounding box overlays, condition scores, and repair priority. |
| **Audio** | Microphone recording or file upload. FFT frequency analysis + OpenAI Whisper transcription detect bearing faults, cavitation, and other anomalies. |
| **Sensors** | Temperature and pressure telemetry input. Computes 14-day failure probability and estimated downtime cost. |
| **Report** | Consolidated session summary combining vision, audio, sensor, and AI chat outputs. |
| **Garage** | Machine registry by CAT 17-character PIN. Tracks inspection history per machine via Firebase Firestore. |
| **Inspect** | Upload inspection PDFs or images for automated fault extraction, severity triage, and recommended CAT parts. |

**Additional capabilities:**
- Multilingual UI — English, Spanish, French, German (with live AI translation)
- Text-to-speech AI responses via ElevenLabs
- RAG-augmented diagnostics using a curated CAT knowledge base
- Demo mode for offline/no-key use
- Full AI provider fallback chain: Gemini → Claude → OpenAI

---

## Tech Stack

**Frontend:** Next.js 14 · TypeScript · Tailwind CSS · Firebase Auth + Firestore

**Backend:** FastAPI (Python) · Uvicorn · Pydantic

**AI / ML:**
- Google Gemini 2.5 Flash — vision, chat, translation
- Anthropic Claude Sonnet 4.6 — vision & inspection fallback
- OpenAI GPT-4o Mini — chat, vision & translation fallback
- OpenAI Whisper — audio transcription
- ElevenLabs — text-to-speech

**Cloud Services:**
- AWS Rekognition — image label detection
- Snowflake — session analytics & logging
- Google Maps API — CAT dealer lookup

---

## Project Structure

```
cat-sense/
├── frontend/
│   └── app/
│       ├── components/         # ChatWindow, ImageUpload, AudioRecorder,
│       │                       # SensorInput, ReportCard, GarageView,
│       │                       # InspectionAnalyzer, MessageBubble,
│       │                       # ImageInspectionOverlay, VibrationGraph
│       ├── i18n/               # TranslationContext + strings (4 languages)
│       ├── api.ts              # Typed fetch client for all backend endpoints
│       ├── firebase.ts         # Firebase config
│       └── page.tsx            # Tab router + main layout
│
└── backend/
    ├── main.py                 # FastAPI app
    ├── models/schemas.py       # Pydantic response models
    ├── routes/                 # chat, vision, audio, risk, dealers,
    │                           # garage, inspection, translate
    ├── services/
    │   ├── llm_service.py      # Provider-agnostic LLM with fallbacks
    │   ├── vision_service.py   # Rekognition + Gemini/Claude/OpenAI
    │   ├── inspection_service.py
    │   ├── audio_analysis.py   # FFT anomaly detection
    │   ├── audio_transcription.py
    │   ├── risk_engine.py      # Failure probability model
    │   ├── rag_service.py      # Vector retrieval from CAT docs
    │   ├── memory_store.py     # Per-session context
    │   ├── dealer_lookup.py    # Google Maps dealer search
    │   ├── elevenlabs_service.py
    │   ├── snowflake_service.py
    │   └── demo_service.py     # Predefined responses for demo mode
    └── parts_db.json           # CAT parts catalog for inspection matching
```

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+

### Backend

```bash
cd cat-sense/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys (see below)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd cat-sense/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create `cat-sense/backend/.env`:

```env
# AI Providers (Gemini is primary; Claude and OpenAI are fallbacks)
GEMINI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
LLM_PROVIDER=gemini           # gemini | claude | openai

# AWS (optional — Vision works without it, Rekognition adds label detection)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_key
AWS_DEFAULT_REGION=us-east-1

# Snowflake (optional — analytics logging)
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USER=your_user
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_DATABASE=CAT_SENSE
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH

# Third-party
GOOGLE_MAPS_API_KEY=your_key
ELEVENLABS_API_KEY=your_key

# Demo mode — bypasses all AI calls with predefined responses
DEMO_MODE=false
```

For the frontend, set `NEXT_PUBLIC_API_URL` in `cat-sense/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Demo Mode

Set `DEMO_MODE=true` in `.env` and restart the backend. All AI calls are bypassed and predefined responses are returned — useful for demos without API keys.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/` | Send a message, receive structured AI diagnosis |
| POST | `/vision/` | Upload an image for visual inspection |
| POST | `/audio/` | Upload audio for anomaly detection |
| POST | `/risk/` | Submit sensor readings for risk assessment |
| GET | `/dealers/` | Find nearby CAT dealers by location |
| POST | `/garage/add` | Register a machine by CAT PIN |
| GET | `/garage/` | List registered machines |
| DELETE | `/garage/{id}` | Remove a machine |
| POST | `/inspection/upload` | Analyze an inspection PDF or image |
| POST | `/translate/` | Translate text to a target language |

---

## Docker

```bash
docker-compose up --build
```

---

## License

MIT
