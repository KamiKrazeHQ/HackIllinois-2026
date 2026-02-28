"""
In-memory RAG service using Gemini embeddings + numpy cosine similarity.
Loads a curated CAT machinery knowledge base at startup.
Retrieves the top-K most relevant passages for a query.
"""

import os
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)

# ── Knowledge base ────────────────────────────────────────────────────────────
# Curated CAT machinery fault documents. Add more passages or load from files.

_DOCUMENTS = [
    "Hydraulic cylinder surface cracks indicate fatigue failure. "
    "Caused by overloading or material defects. Immediate inspection required to prevent complete failure.",

    "Seal wear in hydraulic cylinders leads to fluid leakage. "
    "Leakage reduces system pressure, causing sluggish operation. Replace seals and check for scoring on the cylinder bore.",

    "Bearing inner race fault produces vibration frequencies between 100-200 Hz. "
    "Early stage: slight vibration. Late stage: loud knocking. Replace bearing immediately to prevent shaft damage.",

    "Bearing outer race fault produces frequencies between 200-350 Hz. "
    "Often caused by contaminated lubricant or misalignment. Flush lubrication system and realign shaft.",

    "Gear mesh frequency anomalies (350-600 Hz) indicate worn gear teeth or inadequate lubrication. "
    "Check gear tooth contact pattern and lubrication levels.",

    "Cavitation in hydraulic pumps produces high-frequency noise (900-1500 Hz). "
    "Caused by air ingestion or low fluid level. Check suction line and fluid reservoir immediately.",

    "Structural resonance at low frequencies (20-80 Hz) indicates loose mounting bolts or worn mounts. "
    "Inspect and retorque all mounting hardware.",

    "Corrosion on steel components accelerates under high humidity. "
    "Apply protective coating and store equipment under cover. Treat affected areas with rust converter.",

    "Minor severity faults should be addressed within 30 days to prevent escalation. "
    "Document findings and schedule routine maintenance.",

    "Moderate severity faults carry 40-60% failure risk over 14 days. "
    "Schedule immediate maintenance within 72 hours. Reduce operating load by 25%.",

    "Severe severity faults require immediate shutdown. "
    "Continued operation risks catastrophic failure, personnel injury, and significantly higher repair costs.",

    "CAT D-series hydraulic systems operate at 350 bar nominal pressure. "
    "Pressure drops of more than 15% indicate pump wear or internal leakage.",

    "Track tension on CAT bulldozers should be checked every 250 operating hours. "
    "Incorrect tension causes accelerated undercarriage wear.",

    "Engine oil analysis intervals: every 500 hours for diesel engines under normal conditions. "
    "Elevated metal particles indicate bearing or ring wear.",

    "Estimated downtime cost for hydraulic system failure: $8,000-$20,000 per day including parts and labor. "
    "Preventive maintenance costs typically 10-15% of reactive repair costs.",
]


# ── Vector store ──────────────────────────────────────────────────────────────

class _VectorStore:
    def __init__(self):
        self._docs: list[str] = []
        self._embeddings: Optional[np.ndarray] = None
        self._ready = False

    def build(self, documents: list[str]) -> None:
        try:
            embeddings = [_embed(doc) for doc in documents]
            self._docs = documents
            self._embeddings = np.array(embeddings, dtype=np.float32)
            # L2-normalise for cosine similarity via dot product
            norms = np.linalg.norm(self._embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1
            self._embeddings /= norms
            self._ready = True
            logger.info("RAG vector store built with %d documents", len(documents))
        except Exception as e:
            logger.warning("RAG build failed: %s", e)
            self._ready = False

    def query(self, text: str, top_k: int = 3) -> list[str]:
        if not self._ready or self._embeddings is None:
            return []
        try:
            q_vec = np.array(_embed(text), dtype=np.float32)
            q_norm = np.linalg.norm(q_vec)
            if q_norm == 0:
                return []
            q_vec /= q_norm
            scores = self._embeddings @ q_vec
            top_indices = np.argsort(scores)[::-1][:top_k]
            return [self._docs[i] for i in top_indices]
        except Exception as e:
            logger.warning("RAG query failed: %s", e)
            return []


_store = _VectorStore()


# ── Gemini embedding call ─────────────────────────────────────────────────────

def _embed(text: str) -> list[float]:
    from google import genai
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    result = client.models.embed_content(
        model="models/gemini-embedding-001",
        contents=text,
    )
    return result.embeddings[0].values


# ── Public interface ──────────────────────────────────────────────────────────

def initialise() -> None:
    """Call once at startup to build the vector store."""
    if not os.environ.get("GEMINI_API_KEY"):
        logger.warning("GEMINI_API_KEY not set — RAG disabled")
        return
    _store.build(_DOCUMENTS)


def retrieve(query: str, top_k: int = 3) -> list[str]:
    """Return top-K relevant passages for a query string."""
    return _store.query(query, top_k=top_k)


def retrieve_as_block(query: str, top_k: int = 3) -> str:
    """Return relevant passages formatted as a single context block."""
    passages = retrieve(query, top_k=top_k)
    if not passages:
        return ""
    return "\n".join(f"[KB] {p}" for p in passages)
