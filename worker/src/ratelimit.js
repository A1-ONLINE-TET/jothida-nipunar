// ═══════════════════════════════════════════════════════════════════
// KV-backed fixed-window rate limiter.
// ═══════════════════════════════════════════════════════════════════
// Stops abuse / scraping: a signed-in user (or IP) may make at most
// `max` requests per `windowSec`. Fails OPEN only if KV itself errors,
// so a KV outage never locks out real users — but the auth gate still
// applies, so this is a throttle, not the primary defence.
// ═══════════════════════════════════════════════════════════════════
export async function rateLimit(env, key, max, windowSec) {
  if (!env.RL) return memLimit(key, max, windowSec); // KV இல்லை — இந்த isolate-இன் நினைவகத்தில் மட்டும் (best-effort)
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / windowSec);
  const k = `rl:${key}:${window}`;
  try {
    const cur = parseInt((await env.RL.get(k)) || "0", 10);
    if (cur >= max) return false;
    await env.RL.put(k, String(cur + 1), { expirationTtl: windowSec + 5 });
    return true;
  } catch (_) {
    return true; // KV error → don't block legitimate traffic
  }
}

// KV அமைக்கப்படாதபோது: ஒரே isolate-க்குள் மட்டும் எண்ணும் எளிய தடுப்பு. isolate மாறினால் எண்ணிக்கை மீளும் என்பதால் இது
// முழுமையான பாதுகாப்பு அல்ல; ஒரே பயனர்/IP தொடர்ந்து அடிப்பதை மட்டும் மட்டுப்படுத்தும். முழுத் தடுப்புக்கு KV (RL) அமைக்கவும்.
const _mem = new Map();
function memLimit(key, max, windowSec) {
  const window = Math.floor(Date.now() / 1000 / windowSec);
  const k = `${key}:${window}`;
  const cur = _mem.get(k) || 0;
  if (cur >= max) return false;
  if (_mem.size > 5000) _mem.clear();
  _mem.set(k, cur + 1);
  return true;
}
