// ═══════════════════════════════════════════════════════════════════
// Claude (Anthropic) call — the API key lives ONLY here as a Worker
// secret (wrangler secret put ANTHROPIC_API_KEY). It is never shipped
// to the browser.
// ═══════════════════════════════════════════════════════════════════
export async function callClaude(env, prompt, maxTokens = 1000) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      max_tokens: Math.min(Math.max(maxTokens, 1), 1500),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}`);
  const data = await res.json();
  return (data.content || []).map((b) => b.text || "").join("");
}
