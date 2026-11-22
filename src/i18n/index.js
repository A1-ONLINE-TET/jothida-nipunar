// ═══════════════════════════════════════════════════════════════════
// மொழி அமைப்பு — தமிழ் (ta), English (en), हिन्दी (hi).
// ═══════════════════════════════════════════════════════════════════
// பயனர் நுழையும்போது ஒரு மொழியைத் தேர்கிறார் (localStorage `jn_lang`). அதன் பின் திரையில் வரும் எல்லாம் அந்த ஒரே
// மொழியில் — கலப்பு கூடாது. `t("key")` அந்த மொழியின் வாசகத்தைத் தரும்; அந்த மொழியில் இன்னும் இல்லாத key-க்குத்
// தமிழ் வாசகம் (மூல மொழி) வரும். புதிய வாசகம் சேர்க்கும்போது மூன்று அகராதிகளிலும் சேர் (scripts/test-i18n.mjs சோதிக்கும்).
//
// படிப்படியான மாற்றம்: இன்னும் அகராதிக்கு வராத திரைகள் தமிழிலேயே இருக்கும் (CLAUDE.md "மொழிகள்" பகுதி — எவை முடிந்தன).
// ═══════════════════════════════════════════════════════════════════
import { useSyncExternalStore } from "react";
import ta from "./ta.js";
import en from "./en.js";
import hi from "./hi.js";
import * as T from "./terms.js";

export const LANGS = [
  { code: "ta", label: "தமிழ்", sub: "Tamil" },
  { code: "en", label: "English", sub: "ஆங்கிலம்" },
  { code: "hi", label: "हिन्दी", sub: "Hindi" },
];
const DICT = { ta, en, hi };
const KEY = "jn_lang";

function read() {
  try { const v = localStorage.getItem(KEY); return DICT[v] ? v : ""; } catch (_) { return ""; }
}
let current = read();           // "" = இன்னும் தேர்வு செய்யப்படவில்லை
const listeners = new Set();

/** தேர்ந்த மொழி; தேர்வு இல்லையெனில் "ta". */
export function getLang() { return current || "ta"; }
/** பயனர் மொழியைத் தேர்ந்துவிட்டாரா? */
export function hasLang() { return !!current; }
export function setLang(code) {
  if (!DICT[code]) return;
  current = code;
  try { localStorage.setItem(KEY, code); } catch (_) { /* ignore */ }
  try { document.documentElement.lang = code; } catch (_) { /* ignore */ }
  listeners.forEach((fn) => fn());
}
try { if (current) document.documentElement.lang = current; } catch (_) { /* ignore */ }

/** வாசகம். vars = { name: "…" } → "{name}" இடங்களில் நிரப்பப்படும். */
export function t(key, vars, lang = getLang()) {
  let s = DICT[lang]?.[key];
  if (s == null) s = ta[key];
  if (s == null) return key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
/** அகராதியில் உள்ள பட்டியல் (மாதப் பெயர்கள் போன்றவை). */
export function tList(key, lang = getLang()) {
  const v = DICT[lang]?.[key] ?? ta[key];
  return Array.isArray(v) ? v : [];
}

/** React hook — மொழி மாறும்போது கூறு மீண்டும் வரையப்படும்.
 *  திரும்புவது: { lang, t, tList, setLang } + கலைச்சொல் பெறுநர்கள் (term): tNak, tRashi, tPlanet, tTithi, tYogam, tKaranam, tGowri, tWeekday, tDir, tPhase. */
export function useLang() {
  const lang = useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, getLang, getLang);
  return {
    lang, setLang,
    t: (k, v) => t(k, v, lang), tList: (k) => tList(k, lang),
    tNak: (x) => T.tNak(x, lang), tRashi: (x) => T.tRashi(x, lang), tPlanet: (x) => T.tPlanet(x, lang),
    tTithi: (x) => T.tTithi(x, lang), tYogam: (x) => T.tYogam(x, lang), tKaranam: (x) => T.tKaranam(x, lang),
    tGowri: (x) => T.tGowri(x, lang), tWeekday: (x) => T.tWeekday(x, lang), tDir: (x) => T.tDir(x, lang), tPhase: (x) => T.tPhase(x, lang), tMonth: (x) => T.tMonth(x, lang),
    tGem: (x) => T.tGem(x, lang), tColor: (x) => T.tColor(x, lang), tFestival: (x) => T.tFestival(x, lang),
  };
}

/** Hook இல்லாத இடங்களுக்கு — தற்போதைய மொழியில் கலைச்சொல். */
export const term = {
  nak: (x) => T.tNak(x, getLang()), rashi: (x) => T.tRashi(x, getLang()), planet: (x) => T.tPlanet(x, getLang()),
  tithi: (x) => T.tTithi(x, getLang()), yogam: (x) => T.tYogam(x, getLang()), karanam: (x) => T.tKaranam(x, getLang()),
  gowri: (x) => T.tGowri(x, getLang()), weekday: (x) => T.tWeekday(x, getLang()), dir: (x) => T.tDir(x, getLang()), phase: (x) => T.tPhase(x, getLang()),
  festival: (x) => T.tFestival(x, getLang()),
};

export const ALL_DICTS = DICT; // சோதனைக்கு
