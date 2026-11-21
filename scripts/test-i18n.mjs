// மொழி அகராதிகள் (src/i18n/ta.js, en.js, hi.js) ஒன்றுக்கொன்று பொருந்துகின்றனவா என்ற சோதனை.
//   node scripts/test-i18n.mjs
import ta from "../src/i18n/ta.js";
import en from "../src/i18n/en.js";
import hi from "../src/i18n/hi.js";

let pass = 0, fail = 0;
const bad = (m) => { fail++; console.log("✗ " + m); };
const ok = () => { pass++; };
const D = { en, hi };
const vars = (s) => (String(s).match(/\{[a-zA-Z]+\}/g) || []).sort().join(",");
const TAMIL = /[஀-௿]/, DEVA = /[ऀ-ॿ]/, LATIN = /[A-Za-z]/;

for (const [code, dict] of Object.entries(D)) {
  for (const k of Object.keys(ta)) {
    if (!(k in dict)) { bad(`${code}: missing key "${k}"`); continue; }
    const a = ta[k], b = dict[k];
    if (Array.isArray(a)) { if (Array.isArray(b) && b.length === a.length && b.every((x) => typeof x === "string" && x.trim())) ok(); else bad(`${code}: "${k}" must be a list of ${a.length} items`); continue; }
    if (typeof b !== "string" || !b.trim()) { bad(`${code}: "${k}" is empty`); continue; }
    if (vars(a) !== vars(b)) bad(`${code}: "${k}" placeholders differ (${vars(a)} vs ${vars(b)})`); else ok();
  }
  for (const k of Object.keys(dict)) if (!(k in ta)) bad(`${code}: extra key "${k}" (not in ta.js)`); else ok();
}
// ஒரு மொழியில் வேறு மொழி எழுத்து கலக்கக் கூடாது
const flat = (d) => Object.entries(d).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map((s) => [k, s]));
for (const [k, s] of flat(ta)) { if (DEVA.test(s) || LATIN.test(s.replace(/\{[a-zA-Z]+\}/g, "").replace(/\b(AI|PDF|Google)\b/g, ""))) bad(`ta: "${k}" has non-Tamil letters: ${s}`); else ok(); }
for (const [k, s] of flat(en)) { if (TAMIL.test(s) || DEVA.test(s)) bad(`en: "${k}" has non-English letters: ${s}`); else ok(); }
for (const [k, s] of flat(hi)) { if (TAMIL.test(s) || LATIN.test(s.replace(/\{[a-zA-Z]+\}/g, "").replace(/\b(AI|PDF|Google)\b/g, ""))) bad(`hi: "${k}" has non-Hindi letters: ${s}`); else ok(); }

console.log(fail ? `✗ ${fail} I18N CHECKS FAILED (${pass} passed)` : `✓ ALL ${pass} I18N CHECKS PASSED`);
if (fail) process.exit(1);
