// ═══════════════════════════════════════════════════════════════════
// நிர்ணய கணிப்பு உரையை (engine உருவாக்கும் தமிழ் வாக்கியங்கள் — பலன், தசா, பரிகாரம்,
// ராசிப் பலன், ஆழம்) தேர்ந்த மொழிக்கு (en/hi) மொழிபெயர்க்கும் layer (வழி A பகுதி 2).
// - LLM ஒரு அழைப்பில் பல வாக்கியங்களை மொழிபெயர்க்கும் (JSON array).
// - நினைவக cache (worker வாழ்நாள்) — அதே உரை மீண்டும் LLM-ஐ அழைக்காது.
// - எந்தப் பிழையிலும் தமிழ் மூலமே திரும்பும் (UI ஒருபோதும் உடையாது).
// ═══════════════════════════════════════════════════════════════════

const CACHE = new Map();          // "lang\u0000text" → translated
const CACHE_MAX = 5000;
const cacheGet = (lang, t) => CACHE.get(lang + "\u0000" + t);
const cacheSet = (lang, t, v) => {
  if (CACHE.size >= CACHE_MAX) { const k = CACHE.keys().next().value; CACHE.delete(k); }
  CACHE.set(lang + "\u0000" + t, v);
};

const LANGNAME = { en: "English", hi: "Hindi" };

// LLM பதிலிலிருந்து JSON array-ஐ எடு (```json fences, முன்/பின் உரை உட்பட)
function parseArray(raw) {
  const s = String(raw || "");
  const a = s.indexOf("["), b = s.lastIndexOf("]");
  if (a < 0 || b <= a) return null;
  try { const arr = JSON.parse(s.slice(a, b + 1)); return Array.isArray(arr) ? arr.map((x) => String(x ?? "")) : null; }
  catch (_) { return null; }
}

function buildTranslatePrompt(texts, lang) {
  const name = LANGNAME[lang] || "English";
  const list = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return `You are a professional translator of Tamil Vedic-astrology text into ${name}.
Translate each numbered Tamil line below into natural, fluent ${name}. Rules:
- Keep the astrological meaning exact. Do not add, drop, soften or invent anything.
- Use standard ${name} astrology terms (planets, signs, nakshatras, dashas). Write numbers and dates as-is.
- Keep it in ${name} script only; do not leave Tamil words (except the brand "TOPPER ASTRO").
- Preserve any leading symbol/emoji and overall tone.
Return ONLY a JSON array of ${texts.length} strings, in the same order, nothing else.

${list}`;
}

// texts: தமிழ் வாக்கியங்கள். திரும்புவது: அதே நீளப் பட்டியல் (மொழிபெயர்ப்பு அல்லது மூலம்).
// callAI: index.js-இன் அழைப்பான் (env, prompt, maxTokens) → text.
export async function translateTexts(env, texts, lang, callAI) {
  const L = (lang === "en" || lang === "hi") ? lang : null;
  if (!L || !Array.isArray(texts) || texts.length === 0) return texts || [];
  const out = new Array(texts.length);
  const need = [], needIdx = [];
  texts.forEach((t, i) => {
    const s = String(t ?? "");
    if (!s.trim() || !/[஀-௿]/.test(s)) { out[i] = s; return; }  // தமிழ் இல்லை → அப்படியே
    const c = cacheGet(L, s);
    if (c != null) { out[i] = c; return; }
    out[i] = s;                                                           // இயல்பு: மூலம் (fallback)
    if (!need.includes(s)) { need.push(s); }
    needIdx.push(i);
  });
  if (need.length === 0) return out;
  try {
    const prompt = buildTranslatePrompt(need, L);
    const raw = await callAI(env, prompt, Math.min(8000, 400 + need.join("").length));
    const arr = parseArray(raw);
    if (arr && arr.length === need.length) {
      const map = new Map();
      need.forEach((src, i) => { const tr = arr[i] && arr[i].trim() ? arr[i] : src; cacheSet(L, src, tr); map.set(src, tr); });
      texts.forEach((t, i) => { const s = String(t ?? ""); if (map.has(s)) out[i] = map.get(s); });
    }
  } catch (_) { /* பிழை → தமிழ் மூலமே (out ஏற்கனவே நிரப்பப்பட்டது) */ }
  return out;
}
