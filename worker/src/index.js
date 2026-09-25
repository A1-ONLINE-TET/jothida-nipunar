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
import { buildHoroscope, computeFullReport } from "./compute.js";
import { buildBirthPrompt, currentDashaInfo } from "./prompt.js";
import { callClaude } from "./claude.js";
import { searchPlacesOSM } from "../../src/engine.js";

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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
  return {
    dobISO, time24, lat, lon, ayanamsaKey, gender,
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
      // ── auth (all API routes require a valid Firebase user) ──
      let user;
      try { user = await authUser(request, env); }
      catch (_) { return json(env, origin, { error: "unauthorized" }, 401); }

      // ── rate limit per user ──
      const ip = request.headers.get("CF-Connecting-IP") || "0";
      if (!(await rateLimit(env, `u:${user.sub}`, 60, 3600))) {
        return json(env, origin, { error: "rate limited" }, 429);
      }
      if (!(await rateLimit(env, `ip:${ip}`, 120, 3600))) {
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
        const text = await callClaude(env, prompt, 1000);
        return json(env, origin, { text });
      }

      return json(env, origin, { error: "not found" }, 404);
    } catch (e) {
      return json(env, origin, { error: "bad request" }, 400);
    }
  },
};
