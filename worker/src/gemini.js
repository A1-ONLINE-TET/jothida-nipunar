// ═══════════════════════════════════════════════════════════════════
// Gemini (Google) call — API key lives ONLY here as a Worker secret.
//   wrangler secret put GEMINI_API_KEY
// Never shipped to the browser.
// ═══════════════════════════════════════════════════════════════════
export async function callGemini(env, prompt, maxTokens = 1000) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const model = env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: Math.min(Math.max(maxTokens, 1), 2048),
        temperature: 0.7,
      },
    }),
  });

  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ??
    ""
  );
}
