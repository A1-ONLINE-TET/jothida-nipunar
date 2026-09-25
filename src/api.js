// ═══════════════════════════════════════════════════════════════════
// API CLIENT — the ONLY bridge to the server. Every astrology
// calculation the client needs is fetched from the Cloudflare Worker;
// the engine is never run in the browser. Each call carries the user's
// Firebase ID token, and results are date-revived (Worker JSON turns
// Date objects into ISO strings — we turn them back).
// ═══════════════════════════════════════════════════════════════════
import { getIdToken } from "./firebase.js";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Revive ISO date strings back into Date objects, recursively.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
export function reviveDates(v) {
  if (typeof v === "string") return ISO_DATE.test(v) ? new Date(v) : v;
  if (Array.isArray(v)) return v.map(reviveDates);
  if (v && typeof v === "object") {
    const o = {};
    for (const k in v) o[k] = reviveDates(v[k]);
    return o;
  }
  return v;
}

async function post(path, body) {
  const token = await getIdToken();
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function get(path) {
  const token = await getIdToken();
  const res = await fetch(BASE + path, {
    headers: { ...(token ? { Authorization: "Bearer " + token } : {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Full birth report — replaces the client's old runAllEngines pipeline.
export async function apiCompute(birth) {
  const { report, source } = await post("/api/compute", birth);
  return { report: reviveDates(report), source };
}

// AI birth-chart reading (prompt built server-side).
export async function apiPredict(birth) {
  const { text } = await post("/api/predict", birth);
  return text;
}

// Daily / specific-date bundle + optional AI reading.
export async function apiDaily(birth, targetDateISO = null, withText = true) {
  const { daily, text } = await post("/api/daily", { ...birth, targetDateISO, withText });
  return { daily: reviveDates(daily), text };
}

// Generic on-demand engine call (porutham, event-timing, backtest, …).
export async function apiEngine(fn, args = []) {
  const { result } = await post("/api/engine", { fn, args });
  return reviveDates(result);
}

// Place search (Nominatim proxied through the Worker).
export async function apiGeocode(q) {
  const { results } = await get("/api/geocode?q=" + encodeURIComponent(q));
  return results || [];
}
