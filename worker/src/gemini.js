// ═══════════════════════════════════════════════════════════════════
// Gemini (Google) call — API key lives ONLY here as a Worker secret.
//   wrangler secret put GEMINI_API_KEY
// Never shipped to the browser.
// ═══════════════════════════════════════════════════════════════════
import { AI_GUARDRAILS } from "./safety.js";

export async function callGemini(env, prompt, maxTokens = 1000) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  // "gemini-flash-latest" auto-tracks the current flash model, so the app
  // won't break again when a specific version is retired (gemini-2.0-flash
  // was deprecated). Override with the GEMINI_MODEL var if needed.
  const model = env.GEMINI_MODEL || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      // Gemini 3.x flash models "think" by default, and those hidden
      // thinking tokens count against maxOutputTokens — leaving almost
      // nothing for the real answer (answers got cut to one line).
      // thinkingBudget:0 turns thinking off so all tokens go to the reply,
      // and a generous cap guarantees the Tamil answer completes.
      maxOutputTokens: Math.min(Math.max(maxTokens, 1), 8192),
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  // Retry once on transient overload (503/429) — Gemini flash models get
  // brief "high demand" spikes.
  let res;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    if (res.ok || (res.status !== 503 && res.status !== 429)) break;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
  }

  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ??
    ""
  );
}

// ───────────────────────────────────────────────────────────────────
// ASTROLOGER PROMPT — the engine does ALL the astrology (computes the
// verdict, factors, timing, remedies for whatever the user asked). We
// hand those computed FINDINGS to Gemini and ask it ONLY to phrase them
// warmly, as a real astrologer talking to the client — never to invent
// new planet positions, dates, or percentages of its own.
// ───────────────────────────────────────────────────────────────────
// ஆலோசனைப் பக்கத்தின் AI உதவியாளர்கள் (src/components/personas.js — அதே key). ஒவ்வொருவருக்கும் பேச்சுத் தொனி
// மட்டும் வேறு; ஜோதிட உண்மைகள் எப்போதும் engine முடிவுகளிலிருந்தே. client அனுப்பும் key இந்தப் பட்டியலில்
// இருந்தால் மட்டும் ஏற்கப்படும் — client-இலிருந்து prompt உரை எதுவும் வருவதில்லை.
const PERSONA_STYLE = {
  general:   { name: "ஜோதிட குரு",          tone: "அனுபவம் மிக்க குருவின் அமைதியான, தெளிவான நடை" },
  marriage:  { name: "மணவாழ்வு வழிகாட்டி",   tone: "அன்பும் பரிவும் நிறைந்த, உறவுகளை மதிக்கும் நடை; குடும்பத்தினரைக் குறை சொல்ல வேண்டாம்" },
  career:    { name: "தொழில் வழிகாட்டி",     tone: "நடைமுறைக்கு ஏற்ற, செயல்படத் தூண்டும் நடை; அடுத்து என்ன செய்யலாம் என்பதில் கவனம்" },
  wealth:    { name: "செல்வ வழிகாட்டி",      tone: "நிதானமான, சிக்கனத்தை வலியுறுத்தும் நடை; எதிலும் பணம் போடச் சொல்ல வேண்டாம்" },
  health:    { name: "நலம் வழிகாட்டி",       tone: "ஆறுதலான, அச்சம் தராத நடை; நோய் பெயர் சொல்ல வேண்டாம், மருத்துவரை அணுகச் சொல்லுங்கள்" },
  education: { name: "கல்வி வழிகாட்டி",      tone: "ஊக்கமளிக்கும் ஆசிரியரின் நடை; முயற்சியின் பங்கை வலியுறுத்துங்கள்" },
  children:  { name: "சந்தான வழிகாட்டி",     tone: "மென்மையான, நம்பிக்கை தரும் நடை; மருத்துவ விஷயங்களில் மருத்துவரை அணுகச் சொல்லுங்கள்" },
  travel:    { name: "பயண வழிகாட்டி",        tone: "தெளிவான, உற்சாகமான நடை; விசா, சட்ட நடைமுறைகளுக்கு உறுதி கூற வேண்டாம்" },
};
export const isPersona = (key) => typeof key === "string" && Object.prototype.hasOwnProperty.call(PERSONA_STYLE, key);

export function buildGeminiAstrologerPrompt({ name, question, engineFindings, deep = false, persona = "general" }) {
  const who = PERSONA_STYLE[isPersona(persona) ? persona : "general"];
  const limit = deep ? "350 வார்த்தைகளுக்குள்" : "200 வார்த்தைகளுக்குள்";
  const depth = deep
    ? "விரிவாக, ஒவ்வொரு முக்கிய காரணியையும் தொட்டு, காலம் மற்றும் பரிகாரம் உட்பட ஆழமாக"
    : "சுருக்கமாக, கேட்டதற்கு மட்டும் குவிந்து";
  return `நீங்கள் "${who.name}" என்ற தமிழ் வேத ஜோதிட AI உதவியாளர்; ஒரு வாடிக்கையாளரிடம் நேரடியாக உரையாடுகிறீர்கள். பேச்சு நடை: ${who.tone}. உங்களை மனிதர் என்று சொல்லிக்கொள்ள வேண்டாம்.

கீழே உள்ளவை — இந்த வாடிக்கையாளரின் ஜாதகத்திலிருந்து கணிக்கப்பட்ட துல்லியமான ஜோதிட முடிவுகள் (engine கணக்கிட்டது). இவற்றை மட்டுமே ஆதாரமாகக் கொள்ளுங்கள் — புதிய கிரக நிலை, தேதி, சதவீதம், தோஷம் எதையும் நீங்களாக உருவாக்க வேண்டாம்:

"""
${engineFindings}
"""

${AI_GUARDRAILS}

வாடிக்கையாளர் பெயர்: ${name || "நண்பர்"}
வாடிக்கையாளர் கேள்வி: "${question}"

மேலே உள்ள கணிப்பு முடிவுகளை அடிப்படையாக வைத்து, வாடிக்கையாளரின் கேள்விக்கு மட்டும் நேரடியாக, இயல்பாக, அன்புடன் ஒரு ஜோதிடர் நேரில் பேசுவது போல தமிழில் ${depth} பதிலளியுங்கள். எந்திரம் போன்ற வரிசைப்பட்டியல் வேண்டாம் — உரையாடல் போல இயல்பாக இருக்கட்டும். காலம்/தேதி/தோஷம்/பரிகாரம் போன்ற விவரங்களை மேலே உள்ள முடிவுகளிலிருந்து மட்டுமே எடுத்துச் சொல்லுங்கள். ${limit}. இறுதியில் ஒரு சிறிய நம்பிக்கை வார்த்தை அல்லது பரிகாரம். கேள்வி ஜோதிடம் சாராதது என்றால், மென்மையாக அதைச் சொல்லி ஜோதிட கேள்வி கேட்க அழைக்கவும்.`;
}
