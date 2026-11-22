// ═══════════════════════════════════════════════════════════════════
// Gemini (Google) call — API key lives ONLY here as a Worker secret.
//   wrangler secret put GEMINI_API_KEY
// Never shipped to the browser.
// ═══════════════════════════════════════════════════════════════════
import { AI_GUARDRAILS, aiGuardrails } from "./safety.js";

// பதிலின் மொழி வழிமுறை (buildGeminiAstrologerPrompt + prompt.js பகிர்கின்றன)
export const LANG_REPLY = {
  ta: { name: "தமிழ்", reply: (d) => `வாடிக்கையாளரின் கேள்விக்கு மட்டும் நேரடியாக, இயல்பாக, அன்புடன் ஒரு ஜோதிடர் நேரில் பேசுவது போல தமிழில் ${d} பதிலளியுங்கள்` },
  en: { name: "English", reply: (d) => `Reply only to the customer's question, directly and warmly, as an astrologer speaking in person, in English, ${d}` },
  hi: { name: "हिन्दी", reply: (d) => `ग्राहक के प्रश्न का ही उत्तर सीधे, सहज और स्नेह से, जैसे कोई ज्योतिषी आमने-सामने बात कर रहा हो, हिन्दी में, ${d} दें` },
};
const LR = (l) => LANG_REPLY[l === "en" || l === "hi" ? l : "ta"];

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

export function buildGeminiAstrologerPrompt({ name, question, engineFindings, deep = false, persona = "general", lang = "ta" }) {
  const who = PERSONA_STYLE[isPersona(persona) ? persona : "general"];
  const lr = LR(lang);
  const limit = deep ? "350" : "200";
  const depth = deep
    ? (lang === "en" ? "in depth, touching each key factor including timing and remedies" : lang === "hi" ? "विस्तार से, प्रत्येक मुख्य कारक, समय और उपाय सहित" : "விரிவாக, ஒவ்வொரு முக்கிய காரணியையும் தொட்டு, காலம் மற்றும் பரிகாரம் உட்பட ஆழமாக")
    : (lang === "en" ? "briefly, focused only on what was asked" : lang === "hi" ? "संक्षेप में, केवल पूछे गए पर केंद्रित" : "சுருக்கமாக, கேட்டதற்கு மட்டும் குவிந்து");
  // engineFindings தமிழில்; LLM அதைப் பயன்படுத்தி தேர்ந்த மொழியில் எழுதும். கட்டாயம்: வெளியீட்டு மொழி = lr.name.
  return `நீங்கள் "${who.name}" என்ற வேத ஜோதிட AI உதவியாளர்; ஒரு வாடிக்கையாளரிடம் நேரடியாக உரையாடுகிறீர்கள். பேச்சு நடை: ${who.tone}. உங்களை மனிதர் என்று சொல்லிக்கொள்ள வேண்டாம்.

கீழே உள்ளவை — இந்த வாடிக்கையாளரின் ஜாதகத்திலிருந்து கணிக்கப்பட்ட துல்லியமான ஜோதிட முடிவுகள் (engine கணக்கிட்டது; தமிழில்). இவற்றை மட்டுமே ஆதாரமாகக் கொள்ளுங்கள் — புதிய கிரக நிலை, தேதி, சதவீதம், தோஷம் எதையும் நீங்களாக உருவாக்க வேண்டாம்:

"""
${engineFindings}
"""

${aiGuardrails(lang)}

வாடிக்கையாளர் பெயர்: ${name || "நண்பர்"}
வாடிக்கையாளர் கேள்வி: "${question}"

${lr.reply(depth)}. ${lang === "en" ? `No robotic bullet lists — keep it natural like a conversation. Take details of timing/dates/doshas/remedies only from the findings above. Within ${limit} words. End with a small word of hope or a remedy. If the question is not about astrology, gently say so and invite an astrology question. Write the entire answer in English only.` : lang === "hi" ? `यंत्रवत बुलेट सूची नहीं — बातचीत जैसा सहज रखें। समय/तिथि/दोष/उपाय के विवरण केवल ऊपर दिए परिणामों से लें। ${limit} शब्दों के भीतर। अंत में एक छोटी आशा की बात या उपाय। प्रश्न ज्योतिष से न हो तो विनम्रता से कहें और ज्योतिष प्रश्न पूछने को कहें। पूरा उत्तर केवल हिन्दी में लिखें।` : `எந்திரம் போன்ற வரிசைப்பட்டியல் வேண்டாம் — உரையாடல் போல இயல்பாக இருக்கட்டும். காலம்/தேதி/தோஷம்/பரிகாரம் போன்ற விவரங்களை மேலே உள்ள முடிவுகளிலிருந்து மட்டுமே எடுத்துச் சொல்லுங்கள். ${limit} வார்த்தைகளுக்குள். இறுதியில் ஒரு சிறிய நம்பிக்கை வார்த்தை அல்லது பரிகாரம். கேள்வி ஜோதிடம் சாராதது என்றால், மென்மையாக அதைச் சொல்லி ஜோதிட கேள்வி கேட்க அழைக்கவும்.`}`;
}
