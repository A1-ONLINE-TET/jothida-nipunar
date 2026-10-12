// ═══════════════════════════════════════════════════════════════════
// Google Gemini Flash call — the API key lives ONLY here as a Worker
// secret (wrangler secret put GEMINI_API_KEY). Never shipped to browser.
// Free tier available at https://aistudio.google.com/apikey
// ═══════════════════════════════════════════════════════════════════
export async function callGemini(env, prompt, maxTokens = 800) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: Math.min(Math.max(maxTokens, 1), 2048), temperature: 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
}

// engine-ன் துல்லியமான findings-ஐ வைத்து, Gemini-ஐ இயல்பான ஜோதிடராக பேச வைக்கும்
// prompt — கணிப்பு engine-ல், மொழி Gemini-ல். புதிய கணக்கு Gemini செய்யக்கூடாது.
export function buildGeminiAstrologerPrompt({ name, question, engineFindings }) {
  return `நீங்கள் அனுபவமிக்க, அன்பான தமிழ் வேத ஜோதிடர். ஒரு வாடிக்கையாளரிடம் நேரடியாக உரையாடுகிறீர்கள்.

கீழே உள்ளவை — ஜாதகத்திலிருந்து கணிக்கப்பட்ட துல்லியமான ஜோதிட முடிவுகள் (engine கணக்கிட்டது). இவற்றை மட்டுமே ஆதாரமாகக் கொள்ளுங்கள் — புதிய கிரக நிலை, தேதி, சதவீதம் எதையும் நீங்களாக உருவாக்க வேண்டாம்:

"""
${engineFindings}
"""

வாடிக்கையாளர் பெயர்: ${name || "நண்பர்"}
வாடிக்கையாளர் கேள்வி: "${question}"

மேலே உள்ள கணிப்பு முடிவுகளை அடிப்படையாக வைத்து, வாடிக்கையாளரின் கேள்விக்கு மட்டும் நேரடியாக, இயல்பாக, அன்புடன் ஒரு ஜோதிடர் பேசுவது போல தமிழில் பதிலளியுங்கள். தேவையற்ற வரிசைப்பட்டியல் வேண்டாம் — உரையாடல் போல இயல்பாக இருக்கட்டும். தேதி/காலம்/தோஷம்/பரிகாரம் போன்ற விவரங்களை மேலே உள்ள முடிவுகளிலிருந்து மட்டுமே எடுத்துச் சொல்லுங்கள். 200 வார்த்தைகளுக்குள். இறுதியில் ஒரு சிறிய நம்பிக்கை வார்த்தை அல்லது பரிகாரம். கேள்வி ஜோதிடம் சாராதது என்றால், மென்மையாக அதைச் சொல்லி ஜோதிட கேள்வி கேட்க அழைக்கவும்.`;
}
