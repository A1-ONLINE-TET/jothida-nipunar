// ═══════════════════════════════════════════════════════════════════
// Firebase ID-token verification (RS256) using WebCrypto — no SDK.
// ═══════════════════════════════════════════════════════════════════
// Only requests carrying a VALID Firebase ID token for OUR project are
// allowed to reach the engine. The token is minted by Firebase Auth in
// the browser after the user signs in; it cannot be forged without
// Google's private signing key.
// ═══════════════════════════════════════════════════════════════════

const JWK_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const JWKS_CACHE_KEY = "jwks:securetoken";

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function decodeJson(b64url) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(b64url)));
}

// Fetch Google's current signing keys, cached in KV until they expire.
async function getKeys(env) {
  try {
    const cached = await env.RL.get(JWKS_CACHE_KEY, "json");
    if (cached && cached.exp > Date.now() && cached.keys) return cached.keys;
  } catch (_) { /* KV miss — fetch fresh */ }

  const res = await fetch(JWK_URL);
  if (!res.ok) throw new Error("jwks fetch failed");
  const { keys } = await res.json();
  // Respect Cache-Control max-age so we rotate with Google.
  let ttl = 3600;
  const cc = res.headers.get("cache-control") || "";
  const m = cc.match(/max-age=(\d+)/);
  if (m) ttl = Math.max(300, parseInt(m[1], 10));
  const byKid = {};
  for (const k of keys) byKid[k.kid] = k;
  try {
    await env.RL.put(
      JWKS_CACHE_KEY,
      JSON.stringify({ keys: byKid, exp: Date.now() + ttl * 1000 }),
      { expirationTtl: ttl }
    );
  } catch (_) { /* KV write best-effort */ }
  return byKid;
}

// Returns the verified token payload, or throws.
export async function verifyIdToken(idToken, env) {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID not set");
  if (!idToken || idToken.split(".").length !== 3) throw new Error("malformed token");

  const [h, p, s] = idToken.split(".");
  const header = decodeJson(h);
  const payload = decodeJson(p);

  if (header.alg !== "RS256") throw new Error("bad alg");

  const now = Math.floor(Date.now() / 1000);
  const skew = 60; // allow small clock skew
  if (payload.aud !== projectId) throw new Error("bad aud");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("bad iss");
  if (!payload.sub) throw new Error("no sub");
  if (typeof payload.exp !== "number" || payload.exp < now - skew) throw new Error("expired");
  if (typeof payload.iat !== "number" || payload.iat > now + skew) throw new Error("bad iat");
  if (payload.auth_time && payload.auth_time > now + skew) throw new Error("bad auth_time");

  const keys = await getKeys(env);
  const jwk = keys[header.kid];
  if (!jwk) throw new Error("unknown kid");

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const data = new TextEncoder().encode(`${h}.${p}`);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(s), data);
  if (!ok) throw new Error("bad signature");

  return payload; // { sub: uid, email?, ... }
}
