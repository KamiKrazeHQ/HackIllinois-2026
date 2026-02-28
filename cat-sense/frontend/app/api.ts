const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function fetchChat(message: string, sessionId = "default") {
  const res = await fetch(`${BASE_URL}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  return res.json();
}

// ── Vision ────────────────────────────────────────────────────────────────────

export async function uploadImage(file: File, sessionId = "default") {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/vision/?session_id=${sessionId}`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

// ── Audio ─────────────────────────────────────────────────────────────────────

export async function uploadAudio(file: File, sessionId = "default") {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/audio/?session_id=${sessionId}`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

// ── Risk ──────────────────────────────────────────────────────────────────────

export interface RiskPayload {
  session_id?: string;
  severity: "Minor" | "Moderate" | "Severe";
  temperature_c: number;
  pressure_psi: number;
}

export async function fetchRisk(payload: RiskPayload) {
  const res = await fetch(`${BASE_URL}/risk/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: "default", ...payload }),
  });
  return res.json();
}

// ── Dealers ───────────────────────────────────────────────────────────────────

export async function fetchDealers(
  lat = 41.87,
  lon = -87.62,
  radiusKm = 50
) {
  const res = await fetch(
    `${BASE_URL}/dealers/?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`
  );
  return res.json();
}
