// ═══════════════════════════════════════════════════════════════════
// KV-backed fixed-window rate limiter.
// ═══════════════════════════════════════════════════════════════════
// Stops abuse / scraping: a signed-in user (or IP) may make at most
// `max` requests per `windowSec`. Fails OPEN only if KV itself errors,
// so a KV outage never locks out real users — but the auth gate still
// applies, so this is a throttle, not the primary defence.
// ═══════════════════════════════════════════════════════════════════
export async function rateLimit(env, key, max, windowSec) {
  if (!env.RL) return true; // KV not configured — rely on Cloudflare's edge limits
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
