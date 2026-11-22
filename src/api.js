// ═══════════════════════════════════════════════════════════════════
// API CLIENT — the ONLY bridge to the server. Every astrology
// calculation the client needs is fetched from the Cloudflare Worker;
// the engine is never run in the browser. Each call carries the user's
// Firebase ID token, and results are date-revived (Worker JSON turns
// Date objects into ISO strings — we turn them back).
// ═══════════════════════════════════════════════════════════════════
import { getIdToken } from "./firebase.js";
import { getLang } from "./i18n/index.js";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Access code (temporary login gate). Stored after the user enters it; sent
// on every request. If the server rejects it (403), clear and reload so the
// gate re-prompts.
const ACCESS_KEY = "jn_access";
function accessCode() {
  try { return localStorage.getItem(ACCESS_KEY) || ""; } catch (_) { return ""; }
}
function onAccessDenied() {
  try { localStorage.removeItem(ACCESS_KEY); } catch (_) {}
  try { location.reload(); } catch (_) {}
}

// Revive ISO date strings back into Date objects, recursively.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
// The Worker runs in UTC and builds its Dates from wall-clock values (birth time, dasha
// dates, "today") — so the ISO string's UTC fields ARE the intended wall-clock reading.
// Rebuild them as local wall-clock Dates; `new Date(iso)` would shift everything by the
// device's UTC offset (+5:30 in India: a dasha ending at 20:00 showed the next day's date).
export function reviveDates(v) {
  if (typeof v === "string") {
    if (!ISO_DATE.test(v)) return v;
    const d = new Date(v);
    if (isNaN(d)) return v;
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
  }
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
      "X-Access-Code": accessCode(),
    },
    body: JSON.stringify(body || {}),
  });
  if (res.status === 403) { onAccessDenied(); throw new Error("access denied"); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function get(path) {
  const token = await getIdToken();
  const res = await fetch(BASE + path, {
    headers: { ...(token ? { Authorization: "Bearer " + token } : {}), "X-Access-Code": accessCode() },
  });
  if (res.status === 403) { onAccessDenied(); throw new Error("access denied"); }
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
  const { text } = await post("/api/predict", { ...birth, lang: getLang() });
  return text;
}

// Daily / specific-date bundle + optional AI reading.
export async function apiDaily(birth, targetDateISO = null, withText = true) {
  const { daily, text } = await post("/api/daily", { ...birth, targetDateISO, withText, lang: getLang() });
  return { daily: reviveDates(daily), text };
}

// Rule-based astrologer chat — chart-grounded answer (தமிழ்: engine; en/hi: AI மொழியாக்கம்).
export async function apiAsk(birth, question, lastTopic = "", persona = "") {
  const { category, label, answer, ai } = await post("/api/ask", { ...birth, question, lastTopic, persona, lang: getLang() });
  return { category, label, answer, ai };
}

// Hybrid: engine துல்லியம் + Gemini இயல்பு மொழி. key இல்லையேல் engine பதில் (ai:false).
export async function apiAskAI(birth, question, lastTopic = "", persona = "") {
  const { category, label, answer, ai } = await post("/api/ask-ai", { ...birth, question, lastTopic, persona, lang: getLang() });
  return { category, label, answer, ai };
}

// FREE deep answer (no payment) — engine findings phrased deeply by the LLM.
export async function apiAskDeep(birth, question, lastTopic = "", persona = "") {
  const { answer, ai } = await post("/api/ask-deep", { ...birth, question, lastTopic, persona, lang: getLang() });
  return { answer, ai };
}

// Create a Razorpay order (amount in paise). Returns {orderId, amount, keyId}.
export async function apiOrder(amount) {
  return post("/api/order", { amount });
}

// Premium AI answer — only returned after the Worker verifies the payment.
export async function apiAskPremium(birth, question, pay) {
  const { answer } = await post("/api/ask-premium", { ...birth, question, ...pay, lang: getLang() });
  return { answer };
}

// On-demand proprietary analyses (deps recomputed server-side).
export async function apiBacktest(birth, topic, eventDateISO) {
  const { result } = await post("/api/backtest", { ...birth, topic, eventDateISO });
  return reviveDates(result);
}
export async function apiEventTiming(birth, topic) {
  const { result } = await post("/api/event-timing", { ...birth, topic });
  return reviveDates(result);
}
export async function apiNakBhava(birth) {
  const { result } = await post("/api/nak-bhava", birth);
  return reviveDates(result);
}
export async function apiPorutham(bride, groom, ayanamsaKey) {
  const { result } = await post("/api/porutham", { bride, groom, ayanamsaKey });
  return reviveDates(result);
}

// 12 ராசி பலன் — rashiIdx 0..11 (மேஷம்..மீனம்); பிறப்பு விவரம் தேவையில்லை.
export async function apiRasiPalan(rashiIdx, targetDateISO = null, geo = null, ayanamsaKey = "lahiri") {
  const { result } = await post("/api/rasi-palan", { rashiIdx, targetDateISO, lat: geo?.lat, lon: geo?.lon, ayanamsaKey });
  return reviveDates(result);
}
// மாத சுப நாட்கள் (+ ஜென்ம நட்சத்திரம்/ராசி இருந்தால் தாரா பலம், சந்திராஷ்டமம்).
export async function apiMuhurtaMonth(year, month, geo = null, birthNakIdx = null, birthMoonRashi = null) {
  const { result } = await post("/api/muhurta-month", { year, month, lat: geo?.lat, lon: geo?.lon, birthNakIdx, birthMoonRashi });
  return result || [];
}
// ராசி பலன் — "week" | "month" | "year" (கோசாரக் கணக்கு).
export async function apiRasiPeriod(rashiIdx, period, geo = null, ayanamsaKey = "lahiri") {
  const { result } = await post("/api/rasi-period", { rashiIdx, period, lat: geo?.lat, lon: geo?.lon, ayanamsaKey });
  return result;
}
// ஒரு ஆண்டின் தமிழ்ப் பண்டிகைகள் → [{ iso, name, basis, tamil }]
export async function apiFestivals(year) {
  const { result } = await post("/api/festivals", { year });
  return result || [];
}
// ஒரு ஆண்டின் மாத விரத நாட்கள் → { year, items: [{ key, name, date, paksha?, note? }] }
// (date என்பது "YYYY-MM-DD" சரம் — reviveDates அதை Date ஆக்காது.)
export async function apiVratham(year) {
  const { result } = await post("/api/vratham", { year });
  return (result && Array.isArray(result.items)) ? result.items : [];
}
// கருத்து / புகார் பதிவானதும் உரிமையாளருக்கு அறிவிப்பு (சேவையகம் WhatsApp வழியாக அனுப்பும்; எண் அங்கேயே உள்ளது).
// கருத்து உரையும் வகையும் மட்டும் செல்லும். தோல்வி அமைதியாக விடப்படும் — புகார் ஏற்கனவே Firestore-இல் பதிவாகிவிட்டது.
export function apiNotifyReport(report) {
  return post("/api/report-notify", { kind: report?.kind || "answer", reason: report?.reason || "", comment: report?.comment || "" }).catch(() => null);
}
// நவகிரக வழிபாட்டுக் குறிப்புகள்.
export async function apiNavagraha() {
  const { result } = await post("/api/navagraha", {});
  return result;
}
// பரிகாரத் திட்டம் — ஜாதகத்தின் வேர்க் காரணத்திலிருந்து (எது தேவை, எது தேவையில்லை).
export async function apiRemedyPlan(birth) {
  const { result } = await post("/api/remedy-plan", birth);
  return reviveDates(result);
}
// யோகினி + அஷ்டோத்தரி தசை.
export async function apiAltDashas(birth) {
  const { result } = await post("/api/alt-dashas", birth);
  return reviveDates(result);
}

// Generic on-demand engine call (prashna, etc. — args must be JSON-safe,
// no Date objects).
export async function apiEngine(fn, args = []) {
  const { result } = await post("/api/engine", { fn, args });
  return reviveDates(result);
}

// Place search (Nominatim proxied through the Worker).
export async function apiGeocode(q) {
  const { results } = await get("/api/geocode?q=" + encodeURIComponent(q));
  return results || [];
}
