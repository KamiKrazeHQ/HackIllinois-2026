const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Error type ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body.detail ?? body.error ?? detail
    } catch {}
    throw new ApiError(res.status, detail)
  }
  return res.json()
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function fetchChat(message: string, sessionId = "default") {
  const res = await fetch(`${BASE_URL}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  return handleResponse(res)
}

// ── Vision ────────────────────────────────────────────────────────────────────

export async function uploadImage(file: File, sessionId = "default") {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/vision/?session_id=${sessionId}`, {
    method: "POST",
    body: form,
  });
  return handleResponse(res)
}

// ── Audio ─────────────────────────────────────────────────────────────────────

export async function uploadAudio(file: File, sessionId = "default") {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/audio/?session_id=${sessionId}`, {
    method: "POST",
    body: form,
  });
  return handleResponse(res)
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
  return handleResponse(res)
}

// ── Garage ────────────────────────────────────────────────────────────────────

export async function addMachine(nickname: string, pin: string) {
  const res = await fetch(`${BASE_URL}/garage/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, pin }),
  })
  return handleResponse(res)
}

export async function listMachines() {
  const res = await fetch(`${BASE_URL}/garage/`)
  return handleResponse(res)
}

export async function getMachine(id: string) {
  const res = await fetch(`${BASE_URL}/garage/${id}`)
  return handleResponse(res)
}

export async function scanInspection(
  machineId: string,
  file: File,
  machineDescription = "CAT Equipment",
  machinePin = "",
) {
  const form = new FormData()
  form.append("file", file)
  form.append("machine_description", machineDescription)
  form.append("machine_pin", machinePin)
  const res = await fetch(`${BASE_URL}/garage/${machineId}/inspection/scan`, {
    method: "POST",
    body: form,
  })
  return handleResponse(res)
}

export async function removeMachine(id: string) {
  const res = await fetch(`${BASE_URL}/garage/${id}`, { method: "DELETE" })
  return handleResponse(res)
}

// ── Dealers ───────────────────────────────────────────────────────────────────

export async function fetchDealers(lat = 41.87, lon = -87.62, radiusKm = 50) {
  const res = await fetch(
    `${BASE_URL}/dealers/?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`
  );
  return handleResponse(res)
}
