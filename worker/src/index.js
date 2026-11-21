// ═══════════════════════════════════════════════════════════════════
// ஜோதிட நிபுணர் — Secure API Gateway (Cloudflare Worker)
// ═══════════════════════════════════════════════════════════════════
// The browser sends birth details + a Firebase ID token; this Worker
// authenticates, rate-limits, runs the ENGINE server-side, and returns
// only the computed OUTPUT. The astrology logic is never shipped to the
// client. Secrets (Claude key, internal token) live only as Worker
// secrets. See wrangler.toml for setup.
// ═══════════════════════════════════════════════════════════════════
import { verifyIdToken } from "./auth.js";
import { rateLimit } from "./ratelimit.js";
import { notifyOwner } from "./notify.js";
import {
  buildHoroscope, computeFullReport, computeDasha, computeDailyBundle,
  computeBacktest, computeEventTiming, computeNakBhava, computePorutham,
  computeRasiPalan, computeMonthMuhurta, computeAltDashas, computeRasiPeriod, navagrahaReference, computeConsultation,
} from "./compute.js";
import { computeFestivals } from "./festivals.js";
import { computeVratham } from "./vratham.js";
import { computeRemedyPlan } from "./remedy.js";
import { buildBirthPrompt, buildDailyPrompt, currentDashaInfo } from "./prompt.js";
import { classifyQuestion, buildAskAnswer, topicLabel } from "./ask.js";
import { createOrder, verifyPayment } from "./pay.js";
import { buildGeminiAstrologerPrompt, isPersona } from "./gemini.js";
import { callClaude } from "./claude.js";
import { callGemini } from "./gemini.js";
import { screenQuestion, withSafetyNote, answerIsUnsafe, tamilOnly, latinWords, stripLatin } from "./safety.js";

// Route AI calls: set AI_PROVIDER="gemini" in wrangler.toml [vars] to use Gemini.
// Default is Claude. Falls back to the other if the primary key is missing.
async function callAI(env, prompt, maxTokens = 1000) {
  const provider = (env.AI_PROVIDER || "claude").toLowerCase();
  if (provider === "gemini") {
    if (env.GEMINI_API_KEY) return callGemini(env, prompt, maxTokens);
    if (env.ANTHROPIC_API_KEY) return callClaude(env, prompt, maxTokens);
    throw new Error("No AI API key set");
  }
  // default: claude
  if (env.ANTHROPIC_API_KEY) return callClaude(env, prompt, maxTokens);
  if (env.GEMINI_API_KEY) return callGemini(env, prompt, maxTokens);
  throw new Error("No AI API key set");
}
import { searchPlacesOSM } from "../../src/engine.js";
import * as engine from "../../src/engine.js";

// Generic engine RPC allow-list: every EXPORTED function is callable by
// name via /api/engine. This lets the thin client invoke any on-demand
// calculation (porutham, event-timing, calendar day, backtest, horai…)
// without shipping the engine. Only functions are exposed; data tables
// and anything non-function are rejected. Auth + rate-limit still apply.
const ENGINE_FNS = new Set(
  Object.keys(engine).filter((k) => typeof engine[k] === "function" && k !== "setEngineTimezone")
);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
};

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
}
function corsHeaders(env, origin) {
  const list = allowedOrigins(env);
  const allow = list.includes(origin) ? origin : "";
  const h = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Access-Code",
    "Access-Control-Max-Age": "86400",
  };
  if (allow) h["Access-Control-Allow-Origin"] = allow;
  return h;
}
function json(env, origin, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...SECURITY_HEADERS, ...corsHeaders(env, origin) },
  });
}

// ── input validation ─────────────────────────────────────────────
const AYANAMSAS = new Set(["lahiri", "kp", "raman"]);
function clampStr(s, n) { return typeof s === "string" ? s.slice(0, n) : ""; }
// Offset (hours east of UTC) of an IANA zone for a LOCAL wall-clock time. The runtime's
// time-zone database supplies daylight saving and historical changes — including India's
// +6:30 war time (Sep 1942 – Oct 1945) and Madras time before 1906.
function zoneOffsetHours(zone, y, m, d, hh, mm) {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const offAt = (utcMs) => {
    const p = {}; for (const x of fmt.formatToParts(new Date(utcMs))) p[x.type] = x.value;
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - utcMs) / 3600000;
  };
  const local = Date.UTC(y, m - 1, d, hh, mm);
  let off = offAt(local - 5.5 * 3600000);
  off = offAt(local - off * 3600000);
  return Math.round(off * 3600) / 3600;
}

function normalizeBirth(b) {
  if (!b || typeof b !== "object") throw new Error("no body");
  const dobISO = clampStr(b.dobISO, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobISO)) throw new Error("bad dobISO");
  const [y, m, d] = dobISO.split("-").map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) throw new Error("dob out of range");
  const time24 = /^\d{1,2}:\d{2}$/.test(b.time24 || "") ? b.time24 : "06:00";
  const [th, tm] = time24.split(":").map(Number);
  if (th > 23 || tm > 59) throw new Error("bad time");
  const lat = Number(b.lat), lon = Number(b.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("bad lat");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error("bad lon");
  const ayanamsaKey = AYANAMSAS.has(b.ayanamsaKey) ? b.ayanamsaKey : "lahiri";
  const gender = b.gender === "ஆண்" || b.gender === "பெண்" ? b.gender : null;
  // Birth-place civil zone: the client sends an IANA name only for births outside India.
  const tz = typeof b.tz === "string" && /^[A-Za-z_]{2,20}\/[A-Za-z_\/-]{2,30}$/.test(b.tz) ? b.tz : "Asia/Kolkata";
  let tzOffset = 5.5;
  try { tzOffset = zoneOffsetHours(tz, y, m, d, th, tm); } catch { try { tzOffset = zoneOffsetHours("Asia/Kolkata", y, m, d, th, tm); } catch { tzOffset = 5.5; } }
  if (!Number.isFinite(tzOffset) || tzOffset < -12 || tzOffset > 14) tzOffset = 5.5;
  return {
    dobISO, time24, lat, lon, ayanamsaKey, gender, tz, tzOffset,
    name: clampStr(b.name, 80), dob: clampStr(b.dob, 20),
    tob: clampStr(b.tob, 8), ampm: clampStr(b.ampm, 2), pob: clampStr(b.pob, 120),
  };
}

// Fetch high-precision Swiss placements from the locked Python backend.
async function fetchSwiss(env, birth) {
  if (env.EPHEMERIS_MODE !== "swiss" || !env.SWISS_BACKEND_URL || birth.ayanamsaKey !== "lahiri") return null;
  try {
    const [h, mn] = birth.time24.split(":").map(Number);
    const u = new URL(env.SWISS_BACKEND_URL.replace(/\/$/, "") + "/api/horoscope");
    const [y, m, d] = birth.dobISO.split("-").map(Number);
    u.search = new URLSearchParams({ year: y, month: m, day: d, hour: h, minute: mn, lat: birth.lat, lon: birth.lon, tz: 5.5 }).toString();
    const res = await fetch(u, { headers: { "X-Internal-Token": env.INTERNAL_TOKEN || "" } });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) { return null; }
}

// AI உரை — பாதுகாப்பு விதிகளை மீறினால் ஒருமுறை மீண்டும் கேட்கும்; மீண்டும் மீறினால் பிழை.
// வெளியீடு தமிழில் மட்டும்: பொதுவான ஆங்கிலச் சொற்கள் தமிழாக்கப்படும்; அதன் பின்னும் ஆங்கிலம் அதிகம் இருந்தால்
// மீண்டும் கேட்கும்; இரண்டாம் முறையும் இருந்தால் மீதமுள்ள ஆங்கிலச் சொற்கள் நீக்கப்படும்.
async function safeAI(env, prompt, maxTokens) {
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = tamilOnly(await callAI(env, prompt, maxTokens));
    if (answerIsUnsafe(text)) continue;
    if (latinWords(text).length <= 2) return stripLatin(text);
    last = text;
  }
  if (last) return stripLatin(last);
  throw new Error("unsafe ai output");
}

// ஆலோசனைக் கேள்விக்கான பதில் — பாதுகாப்பு விதிகளுடன். mode: "engine" | "ai" | "deep".
// persona = client-இன் உதவியாளர் key (ask.js தலைப்புகளில் ஒன்று) — சரிபார்த்த பின் மட்டும் பயன்படும்:
// தெளிவான தலைப்பு இல்லாத கேள்விக்கு அதன் துறை; AI நடையில் அதன் பேச்சுத் தொனி.
async function answerQuestion(env, birth, question, lastTopic, mode, personaRaw = "") {
  const persona = isPersona(personaRaw) ? personaRaw : "general";
  const screened = screenQuestion(question);
  if (screened) return { category: "general", label: "", answer: screened.answer, ai: false, safety: screened.kind };
  const swiss = await fetchSwiss(env, birth);
  const h = buildHoroscope(birth, swiss);
  h._name = birth.name;
  const dashaData = computeDasha(h, birth);
  const category = classifyQuestion(question, lastTopic || (persona !== "general" ? persona : ""));
  const label = topicLabel(category);
  // ஆழ்ந்த கணிப்புகள் (பலன்கள் பக்கத்தின் அதே தீர்ப்பு, நிகழ்வுக் காலம், தோஷம், யோகம், ஏழரைச் சனி) — பதிலின் அடிப்படை.
  // கணக்கு தவறினால் அடிப்படை அடுக்குடன் (வீடு, அதிபதி, காரகன், தசை) பதில் தொடரும்.
  let deep = {};
  try { deep = computeConsultation(h, birth, category) || {}; } catch (_) { deep = {}; }
  // கேள்வியில் தனித் தலைப்புச் சொல் இல்லை ("எப்போது?", "பரிகாரம் என்ன?") = முந்தைய தலைப்பின் தொடர் கேள்வி → குவிந்த பதில்.
  const followUp = category !== "general" && classifyQuestion(question, "") === "general";
  const engineFindings = buildAskAnswer(h, deep.dashaData || dashaData, question, { ...deep, category, name: birth.name, followUp }).answer;
  let answer = engineFindings, ai = false;
  if (mode !== "engine") {
    try {
      // The engine already did the astrology; the LLM only phrases its findings
      // as an astrologer would. Facts come from the engine. An answer that breaks
      // the safety rules is dropped in favour of the engine's own wording.
      const deep = mode === "deep";
      const prompt = buildGeminiAstrologerPrompt({ name: birth.name, question, engineFindings, deep, persona });
      // AI பதில் பாதுகாப்பு விதிகளை மீறினாலோ, ஆங்கிலச் சொற்கள் கலந்திருந்தாலோ engine-இன் தமிழ்ப் பதிலே தரப்படும்.
      const text = tamilOnly(await callAI(env, prompt, deep ? 6000 : 4000));
      if (text && !answerIsUnsafe(text) && latinWords(text).length <= 2) { answer = stripLatin(text); ai = true; }
    } catch (_) { /* fall back to engine findings */ }
  }
  return { category, label, answer: withSafetyNote(answer, category, question), ai };
}

async function authUser(request, env) {
  const hdr = request.headers.get("Authorization") || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!token) throw new Error("no token");
  return await verifyIdToken(token, env);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...corsHeaders(env, origin) } });
    }

    // Reject browsers whose origin is not allow-listed (defence in depth;
    // CORS already blocks the response, this blocks the work too).
    if (origin && !allowedOrigins(env).includes(origin)) {
      return json(env, origin, { error: "forbidden origin" }, 403);
    }

    try {
      // ── access-code gate (optional) ── if ACCESS_CODE is set, every API
      // call must carry the matching X-Access-Code header. Stops a leaked
      // link being used (and running up AI cost) by anyone who lacks the code.
      // ACCESS_GATE = "off" (wrangler.toml) அணைத்து வைக்கும் — பொது வெளியீட்டுக்கு (உரிமையாளர் கோரிக்கை 2026-11).
      if (env.ACCESS_CODE && env.ACCESS_GATE !== "off") {
        const supplied = request.headers.get("X-Access-Code") || "";
        if (supplied !== env.ACCESS_CODE) {
          return json(env, origin, { error: "access denied" }, 403);
        }
      }

      // ── auth (all API routes require a valid Firebase user) ──
      let user;
      try { user = await authUser(request, env); }
      catch (_) { return json(env, origin, { error: "unauthorized" }, 401); }

      // ── rate limit ──
      // பொது வரம்பு தாராளம்: ஒரு ஜாதகம் திறப்பதே பல அழைப்புகள்; கைபேசி இணைய நிறுவனங்களில் பலர் ஒரே IP-ஐப் பகிர்கின்றனர்
      // (CGNAT) — குறுகிய IP வரம்பு உண்மைப் பயனர்களைத் தடுத்துவிடும். செலவுள்ள AI அழைப்புகளுக்கு மட்டும் இறுக்கமான வரம்பு.
      const ip = request.headers.get("CF-Connecting-IP") || "0";
      const local = ip === "0" || ip === "127.0.0.1" || ip === "::1";   // wrangler dev / சோதனை
      if (!(await rateLimit(env, `u:${user.sub}`, 600, 3600))) {
        return json(env, origin, { error: "rate limited" }, 429);
      }
      if (!local && !(await rateLimit(env, `ip:${ip}`, 3000, 3600))) {
        return json(env, origin, { error: "rate limited" }, 429);
      }
      const AI_PATHS = ["/api/predict", "/api/ask-ai", "/api/ask-premium", "/api/ask-deep"];   // /api/daily: AI உரை கேட்கும்போது மட்டும் (கீழே)
      if (AI_PATHS.includes(url.pathname) && !(await rateLimit(env, `ai:${user.sub}`, 40, 3600))) {
        return json(env, origin, { error: "rate limited" }, 429);
      }

      // ── /api/geocode?q= (proxy so the client never hits Nominatim directly) ──
      if (url.pathname === "/api/geocode" && request.method === "GET") {
        const q = clampStr(url.searchParams.get("q") || "", 120);
        const results = await searchPlacesOSM(q);
        return json(env, origin, { results });
      }

      if (request.method !== "POST") return json(env, origin, { error: "method not allowed" }, 405);
      const body = await request.json().catch(() => null);

      // ── /api/compute — full birth report ──
      if (url.pathname === "/api/compute") {
        const birth = normalizeBirth(body);
        const swiss = await fetchSwiss(env, birth);
        const h = buildHoroscope(birth, swiss);
        const report = computeFullReport(h, birth);
        return json(env, origin, { source: swiss ? "swiss" : "local", report });
      }

      // ── /api/predict — birth-chart AI reading (prompt built server-side) ──
      if (url.pathname === "/api/predict") {
        const birth = normalizeBirth(body);
        const swiss = await fetchSwiss(env, birth);
        const h = buildHoroscope(birth, swiss);
        const report = computeFullReport(h, birth);
        const dashaInfo = currentDashaInfo(report.dashaData);
        const prompt = buildBirthPrompt({
          person: { name: birth.name, dob: birth.dob, tob: birth.tob, ampm: birth.ampm, pob: birth.pob },
          horoscope: h, dashaInfo,
        });
        const text = await safeAI(env, prompt, 4000);
        return json(env, origin, { text });
      }

      // ── /api/daily — daily/specific-date bundle + AI reading ──
      if (url.pathname === "/api/daily") {
        const birth = normalizeBirth(body);
        const targetDateISO = /^\d{4}-\d{2}-\d{2}$/.test(body?.targetDateISO || "") ? body.targetDateISO : null;
        const withText = body?.withText !== false;
        const swiss = await fetchSwiss(env, birth);
        const h = buildHoroscope(birth, swiss);
        const dashaData = computeDasha(h, birth);
        const daily = computeDailyBundle(h, dashaData, birth, targetDateISO);
        let text = "";
        // AI வரம்பு தாண்டினால் கணக்கு மட்டும் திரும்பும் (AI உரை இல்லாமல்) — தினப்பலன் பக்கம் தடைபடாது
        if (withText && (await rateLimit(env, `ai:${user.sub}`, 40, 3600))) {
          const prompt = buildDailyPrompt({ person: { name: birth.name }, horoscope: h, daily });
          text = await safeAI(env, prompt, 3500);
        }
        return json(env, origin, { daily, text });
      }

      // ── /api/backtest — verify a past event against engine rules ──
      if (url.pathname === "/api/backtest") {
        const birth = normalizeBirth(body);
        const topic = clampStr(body?.topic, 30) || "marriage";
        const eventDateISO = clampStr(body?.eventDateISO, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDateISO)) return json(env, origin, { error: "bad eventDateISO" }, 400);
        const h = buildHoroscope(birth, await fetchSwiss(env, birth));
        return json(env, origin, { result: computeBacktest(h, birth, topic, eventDateISO) });
      }

      // ── /api/event-timing — life-event timing windows for a topic ──
      if (url.pathname === "/api/event-timing") {
        const birth = normalizeBirth(body);
        const topic = clampStr(body?.topic, 30) || "marriage";
        const h = buildHoroscope(birth, await fetchSwiss(env, birth));
        return json(env, origin, { result: computeEventTiming(h, birth, topic) });
      }

      // ── /api/nak-bhava — nakshatra-bhava linkage analysis ──
      if (url.pathname === "/api/nak-bhava") {
        const birth = normalizeBirth(body);
        const h = buildHoroscope(birth, await fetchSwiss(env, birth));
        return json(env, origin, { result: computeNakBhava(h, birth) });
      }

      // ── /api/porutham — marriage matching (10 porutham + dasha compat) ──
      if (url.pathname === "/api/porutham") {
        const norm = (o) => {
          const b = normalizeBirth({ ...o, lat: 13.0827, lon: 80.2707 });
          return b;
        };
        const bride = norm(body?.bride || {});
        const groom = norm(body?.groom || {});
        const ayanamsaKey = AYANAMSAS.has(body?.ayanamsaKey) ? body.ayanamsaKey : "lahiri";
        return json(env, origin, { result: computePorutham(bride, groom, ayanamsaKey) });
      }

      // ── /api/rasi-palan — 12 ராசி பலன் (பிறப்பு விவரம் தேவையில்லை) ──
      if (url.pathname === "/api/rasi-palan") {
        const rashiIdx = body?.rashiIdx;
        if (typeof rashiIdx !== "number" || !Number.isInteger(rashiIdx) || rashiIdx < 0 || rashiIdx > 11) return json(env, origin, { error: "bad rashiIdx" }, 400);
        const targetDateISO = /^\d{4}-\d{2}-\d{2}$/.test(body?.targetDateISO || "") ? body.targetDateISO : null;
        const lat = body?.lat, lon = body?.lon;
        const okGeo = typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180;
        const ayanamsaKey = AYANAMSAS.has(body?.ayanamsaKey) ? body.ayanamsaKey : "lahiri";
        return json(env, origin, { result: computeRasiPalan(rashiIdx, targetDateISO, okGeo ? lat : 13.0827, okGeo ? lon : 80.2707, ayanamsaKey) });
      }

      // ── /api/rasi-period — ராசி பலன்: வாரம் / மாதம் / ஆண்டு (கோசாரக் கணக்கு) ──
      if (url.pathname === "/api/rasi-period") {
        const rashiIdx = body?.rashiIdx;
        if (typeof rashiIdx !== "number" || !Number.isInteger(rashiIdx) || rashiIdx < 0 || rashiIdx > 11) return json(env, origin, { error: "bad rashiIdx" }, 400);
        const period = ["week", "month", "year"].includes(body?.period) ? body.period : "week";
        const lat = body?.lat, lon = body?.lon;
        const okGeo = typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180;
        const ayanamsaKey = AYANAMSAS.has(body?.ayanamsaKey) ? body.ayanamsaKey : "lahiri";
        return json(env, origin, { result: computeRasiPeriod(rashiIdx, period, okGeo ? lat : 13.0827, okGeo ? lon : 80.2707, ayanamsaKey) });
      }

      // ── /api/festivals — ஒரு ஆண்டின் தமிழ்ப் பண்டிகைகள் (சரிபார்க்கப்பட்ட விதிகள்) ──
      if (url.pathname === "/api/festivals") {
        const year = body?.year;
        if (typeof year !== "number" || !Number.isInteger(year) || year < 1950 || year > 2100) return json(env, origin, { error: "bad year" }, 400);
        return json(env, origin, { result: computeFestivals(year) });
      }

      // ── /api/vratham — ஓர் ஆண்டின் மாத விரத நாட்கள் (அமாவாசை, பௌர்ணமி, ஏகாதசி, பிரதோஷம்…) ──
      // ── /api/report-notify : பயனரின் கருத்து/புகாரை உரிமையாளரின் WhatsApp-க்கு அறிவிப்பாக அனுப்புதல் ──
      // உரிமையாளரின் எண்ணும் சாவியும் Worker ரகசியங்களில் மட்டும் (WHATSAPP_PHONE, CALLMEBOT_APIKEY); அவை எந்தப் பதிலிலும்
      // வெளியே போவதில்லை. ரகசியங்கள் இல்லையெனில் எதுவும் அனுப்பப்படாது ({ sent:false }). புகாரின் முழு விவரம் Firestore `reports`-இல்.
      if (url.pathname === "/api/report-notify") {
        if (!(await rateLimit(env, `rn:${user.sub}`, 6, 3600))) return json(env, origin, { sent: false }, 200);
        const sent = await notifyOwner(env, body || {});
        return json(env, origin, { sent }, 200);
      }

      if (url.pathname === "/api/vratham") {
        const year = body?.year;
        if (typeof year !== "number" || !Number.isInteger(year) || year < 1950 || year > 2100) return json(env, origin, { error: "bad year" }, 400);
        return json(env, origin, { result: computeVratham(year) });
      }

      // ── /api/navagraha — நவகிரக வழிபாட்டுக் குறிப்புகள் ──
      if (url.pathname === "/api/navagraha") {
        return json(env, origin, { result: navagrahaReference() });
      }

      // ── /api/muhurta-month — மாத சுப நாட்கள் (+ தாரா பலம் / சந்திராஷ்டமம்) ──
      if (url.pathname === "/api/muhurta-month") {
        const year = body?.year, month = body?.month;
        if (typeof year !== "number" || typeof month !== "number" || !Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || month < 0 || month > 11) return json(env, origin, { error: "bad month" }, 400);
        const lat = body?.lat, lon = body?.lon;
        const okGeo = typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180;
        // null/undefined → தனிப்பயன் இல்லை (Number(null) === 0 என்பதால் வகையை நேரடியாகச் சரிபார்)
        const intIn = (v, lo, hi) => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : null);
        const birthNakIdx = intIn(body?.birthNakIdx, 0, 26);
        const birthMoonRashi = intIn(body?.birthMoonRashi, 0, 11);
        return json(env, origin, { result: computeMonthMuhurta(year, month, okGeo ? lat : 13.0827, okGeo ? lon : 80.2707, birthNakIdx, birthMoonRashi) });
      }

      // ── /api/remedy-plan — வேர்க் காரண அடிப்படைப் பரிகாரத் திட்டம் ──
      if (url.pathname === "/api/remedy-plan") {
        const birth = normalizeBirth(body);
        const h = buildHoroscope(birth, await fetchSwiss(env, birth));
        return json(env, origin, { result: computeRemedyPlan(h, computeFullReport(h, birth), birth) });
      }

      // ── /api/alt-dashas — யோகினி + அஷ்டோத்தரி தசை ──
      if (url.pathname === "/api/alt-dashas") {
        const birth = normalizeBirth(body);
        const h = buildHoroscope(birth, await fetchSwiss(env, birth));
        return json(env, origin, { result: computeAltDashas(h, birth) });
      }

      // ── /api/ask, /api/ask-ai, /api/ask-deep — ஆலோசனை அரட்டை ──
      //   ask      : engine கணக்கிட்ட பதில் (LLM இல்லை)
      //   ask-ai   : அதே engine முடிவுகளை AI இயல்பு மொழியில் சொல்கிறது
      //   ask-deep : அதன் விரிவான வடிவம் (கட்டணம் இல்லை)
      // மூன்றுக்கும் ஒரே பாதுகாப்பு வரிசை (worker/src/safety.js): கேள்விச் சோதனை →
      // engine பதில் → (AI) → AI பதிலின் சோதனை → எச்சரிக்கைக் குறிப்பு.
      if (url.pathname === "/api/ask" || url.pathname === "/api/ask-ai" || url.pathname === "/api/ask-deep") {
        const birth = normalizeBirth(body);
        const question = clampStr(body?.question, 300);
        const lastTopic = clampStr(body?.lastTopic, 40);
        const out = await answerQuestion(env, birth, question, lastTopic,
          url.pathname === "/api/ask" ? "engine" : url.pathname === "/api/ask-ai" ? "ai" : "deep", clampStr(body?.persona, 20));
        return json(env, origin, out);
      }

      // ── /api/order — create a Razorpay order for the premium answer ──
      if (url.pathname === "/api/order") {
        const amount = Math.min(Math.max(parseInt(body?.amount, 10) || 4900, 100), 100000);
        try {
          const order = await createOrder(env, amount);
          return json(env, origin, { orderId: order.id, amount: order.amount, keyId: env.RAZORPAY_KEY_ID });
        } catch (_) {
          return json(env, origin, { error: "payment not available" }, 503);
        }
      }

      // ── /api/ask-premium — deep AI answer, only after verified payment ──
      if (url.pathname === "/api/ask-premium") {
        const orderId = clampStr(body?.razorpay_order_id, 64);
        const paymentId = clampStr(body?.razorpay_payment_id, 64);
        const signature = clampStr(body?.razorpay_signature, 128);
        const ok = await verifyPayment(env, orderId, paymentId, signature);
        if (!ok) return json(env, origin, { error: "payment verification failed" }, 402);
        const birth = normalizeBirth(body);
        const question = clampStr(body?.question, 300);
        const lastTopic = clampStr(body?.lastTopic, 40);
        const out = await answerQuestion(env, birth, question, lastTopic, "deep", clampStr(body?.persona, 20));
        return json(env, origin, out);
      }

      // ── /api/engine — generic allow-listed engine RPC {fn, args} ──
      // Lets the thin client run any on-demand calculation without the
      // engine ever being in the browser bundle.
      if (url.pathname === "/api/engine") {
        const fn = clampStr(body?.fn, 60);
        const args = Array.isArray(body?.args) ? body.args : [];
        if (!ENGINE_FNS.has(fn)) return json(env, origin, { error: "unknown fn" }, 400);
        if (args.length > 12) return json(env, origin, { error: "too many args" }, 400);
        engine.setEngineTimezone(5.5); // பொது engine அழைப்புகள் (பிரச்னம் முதலியன) எப்போதும் IST
        const result = await engine[fn](...args);
        return json(env, origin, { result });
      }

      return json(env, origin, { error: "not found" }, 404);
    } catch (e) {
      return json(env, origin, { error: "bad request" }, 400);
    }
  },
};
