// ═══════════════════════════════════════════════════════════════════
// நிர்ணய கணிப்பு உரை (engine உருவாக்கும் தமிழ் வாக்கியங்கள்) → தேர்ந்த மொழி (வழி A பகுதி 2).
// pr(text): உடனே cache-இல் உள்ள மொழிபெயர்ப்பு அல்லது தமிழ் மூலம் (fallback). தமிழ் மூலம் என்றால்
// அதைப் பின்னணியில் worker-க்கு அனுப்பி மொழிபெயர்த்து, வந்ததும் மீண்டும் வரைகிறது (useProse).
// - cache: நினைவகம் + localStorage (jn_prose_<lang>). ஒருமுறை மொழிபெயர்த்தால் மீண்டும் அழைக்காது.
// - எந்தப் பிழையிலும் தமிழ் மூலமே தெரியும்; UI ஒருபோதும் தடைபடாது.
// - தமிழ் (ta) மொழியில் pr() எதையும் மாற்றாது / அழைக்காது.
// ═══════════════════════════════════════════════════════════════════
import { useReducer, useEffect } from "react";
import { getLang } from "./i18n/index.js";
import { apiTranslate } from "./api.js";

const hasTamil = (s) => /[஀-௿]/.test(s);
const C = new Map();              // "lang\u0000text" → translated
const loaded = new Set();         // எந்த மொழிகள் localStorage-இலிருந்து ஏற்றப்பட்டன
const subs = new Set();           // re-render callbacks
let pending = new Set();          // மொழிபெயர்க்க வேண்டிய தமிழ் உரைகள்
let timer = null;

function hydrate(lang) {
  if (loaded.has(lang)) return; loaded.add(lang);
  try {
    const o = JSON.parse(localStorage.getItem("jn_prose_" + lang) || "{}");
    for (const k in o) C.set(lang + "\u0000" + k, o[k]);
  } catch (_) { /* ignore */ }
}
function persist(lang) {
  try {
    const o = {}; const pre = lang + "\u0000";
    for (const [k, v] of C) if (k.startsWith(pre)) o[k.slice(pre.length)] = v;
    // அளவைக் கட்டுப்படுத்த: அதிகபட்சம் ~1200 உள்ளீடு
    const keys = Object.keys(o); if (keys.length > 1200) for (const k of keys.slice(0, keys.length - 1200)) delete o[k];
    localStorage.setItem("jn_prose_" + lang, JSON.stringify(o));
  } catch (_) { /* storage full/unavailable — நினைவகம் மட்டும் */ }
}
function flush(lang) {
  timer = null;
  const texts = [...pending]; pending = new Set();
  if (!texts.length) return;
  (async () => {
    let any = false;
    for (let i = 0; i < texts.length; i += 60) {
      const chunk = texts.slice(i, i + 60);
      const tr = await apiTranslate(chunk, lang);                 // பிழையில் மூலமே திரும்பும்
      chunk.forEach((t, j) => { const v = tr[j]; if (v && v !== t) { C.set(lang + "\u0000" + t, v); any = true; } });
    }
    if (any) { persist(lang); subs.forEach((fn) => fn()); }
  })();
}

/** தமிழ் உரை → தேர்ந்த மொழி (cache) அல்லது தமிழ் மூலம். தேவைப்பட்டால் பின்னணி மொழிபெயர்ப்பைத் தூண்டும். */
export function pr(text) {
  const lang = getLang();
  if (lang === "ta" || text == null) return text;
  const s = String(text);
  if (!s.trim() || !hasTamil(s)) return s;
  hydrate(lang);
  const hit = C.get(lang + "\u0000" + s);
  if (hit != null) return hit;
  pending.add(s);
  if (!timer) timer = setTimeout(() => flush(lang), 140);
  return s;                                                       // மொழிபெயர்க்கும் வரை தமிழ்
}

/** React hook — பின்னணி மொழிபெயர்ப்பு வந்ததும் கூறு மீண்டும் வரையும். pr-ஐத் திருப்பும். */
export function useProse() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => { subs.add(force); return () => subs.delete(force); }, []);
  return pr;
}
