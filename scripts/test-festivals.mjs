// பண்டிகை விதிகள் (worker/src/festivals.js) ↔ ஆதாரத் தேதிகள் (scripts/fixtures) — 2025–2028.
// ஓட்ட: node scripts/test-festivals.mjs
import { readFileSync } from "node:fs";
import { computeFestivals, tamilDatesForMonth } from "../worker/src/festivals.js";

const ref = JSON.parse(readFileSync(new URL("./fixtures/tamil-festivals-ref.json", import.meta.url), "utf8")).festivals;
let pass = 0, fail = 0;
const bad = (msg) => { fail++; console.log("✗ " + msg); };
for (const year of [2025, 2026, 2027, 2028]) {
  const got = {};
  for (const f of computeFestivals(year)) (got[f.name] ||= []).push(f.iso);
  for (const [name, byYear] of Object.entries(ref)) {
    const want = byYear[year] || [], have = got[name] || [];
    if (!want.length) { if (have.length) bad(`${year} ${name}: computed ${have} but reference has none`); else pass++; continue; }
    // கணக்கிட்ட ஒவ்வொரு தேதியும் ஆதாரத்தில் இருக்க வேண்டும்; ஆதாரம் இரு மரபுத் தேதிகள்
    // (எ.கா. கோகுலாஷ்டமி 2025) தந்தால் அவற்றில் ஒன்று போதும்.
    const extra = have.filter((d) => !want.includes(d));
    const sameEvent = want.length === 2 && Math.abs(new Date(want[0]) - new Date(want[1])) <= 2 * 86400000;
    const missing = sameEvent ? (have.length ? [] : want) : want.filter((d) => !have.includes(d));
    if (extra.length || missing.length) bad(`${year} ${name}: computed [${have}] reference [${want}]`); else pass++;
  }
  for (const name of Object.keys(got)) if (!ref[name]) bad(`${year} ${name}: no reference entry`);
}
// தமிழ்த் தேதி: பொங்கல் = தை 1, புத்தாண்டு = சித்திரை 1 (ஆதாரத் தேதிகளில்)
for (const [name, mon, day] of [["தைப்பொங்கல்", "தை", 1], ["தமிழ்ப் புத்தாண்டு", "சித்திரை", 1], ["ஆடிப்பெருக்கு", "ஆடி", 18]]) {
  for (const [year, list] of Object.entries(ref[name])) {
    const d = new Date(list[0] + "T00:00:00");
    const t = tamilDatesForMonth(d.getFullYear(), d.getMonth())[d.getDate() - 1];
    if (t && t.month === mon && t.day === day) pass++; else bad(`${year} ${name}: tamil date ${JSON.stringify(t)} expected ${mon} ${day}`);
  }
}
console.log(fail ? `✗ ${fail} FESTIVAL CHECKS FAILED (${pass} passed)` : `✓ ALL ${pass} FESTIVAL CHECKS PASSED`);
process.exit(fail ? 1 : 0);
