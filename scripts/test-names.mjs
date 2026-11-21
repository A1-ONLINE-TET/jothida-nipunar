// குழந்தைப் பெயர்ப் பட்டியல் (src/components/names-data.js) ↔ நட்சத்திர பாத எழுத்துக்கள்
// (src/components/tools-data.js → NAME_SYLLABLES) பொருந்துகின்றனவா என்ற சோதனை.
// ஓட்ட: node scripts/test-names.mjs
import { NAME_SYLLABLES } from "../src/components/tools-data.js";
import { NAMES_BY_SOUND, SOUND_FAMILIES } from "../src/components/names-data.js";

let pass = 0, fail = 0;
const bad = (msg) => { fail++; console.log("✗ " + msg); };
const ok = () => { pass++; };

const STYLES = ["n", "c", "t"]; // நவீனம், நடுத்தரம், பாரம்பரியம்
const VIRAMA = "்";
const isConsonant = (ch) => ch >= "க" && ch <= "ஹ";
// உயிர் எழுத்து / உயிர்க்குறி → ஒலி வகை (குறில், நெடில் இரண்டும் ஒரே வகை)
const VOWEL_LETTER = { "அ": "a", "ஆ": "a", "இ": "i", "ஈ": "i", "உ": "u", "ஊ": "u", "எ": "e", "ஏ": "e", "ஒ": "o", "ஓ": "o" };
const VOWEL_SIGN = { "ா": "a", "ி": "i", "ீ": "i", "ு": "u", "ூ": "u", "ெ": "e", "ே": "e", "ொ": "o", "ோ": "o" };
// ஐ, ஔ (ை, ௌ) எந்த ஒலி வகையிலும் சேராது — அத்தகைய பெயர்கள் பட்டியலில் இருக்கக் கூடாது.
const OTHER_SIGN = { "ை": "ai", "ௌ": "au" };
// தமிழ் எழுத்துமுறை: "ஸ" ஒலியில் தொடங்கும் பெயர்கள் வழக்கமாக "ச" என்றே எழுதப்படும்
// (சரவணன், சுரேஷ், சீதா). அதனால் ஸ-வரிசை ஒலிகளுக்கு "ச" தொடக்கமும் ஏற்கப்படும்.
const SPELLING_ALIAS = { "ஸ": ["ச"] };
// தமிழ் எழுத்துகளும் குறிகளும் மட்டும் (தமிழ் எண்கள், குறியீடுகள், இடைவெளி, லத்தீன் கூடாது)
const TAMIL_NAME = /^[ஂ-்ௗ]+$/;

// முதல் அசையின் { தொடக்க எழுத்து, உயிர் வகை } — தொடக்கக் கூட்டெழுத்தை (ஷ்யா, ப்ரி) தாண்டி உயிரைப் பார்க்கும்.
function firstSyllable(word) {
  const s = [...word];
  const head = s[0];
  if (VOWEL_LETTER[head]) return { head, vowel: VOWEL_LETTER[head], kind: "vowel" };
  if (!isConsonant(head)) return { head, vowel: null, kind: "other" };
  let i = 0;
  while (s[i + 1] === VIRAMA && isConsonant(s[i + 2])) i += 2;
  const sign = s[i + 1];
  const vowel = VOWEL_SIGN[sign] || OTHER_SIGN[sign] || (sign === VIRAMA ? null : "a");
  return { head, vowel, kind: "consonant" };
}

// ── ஒலி → எதிர்பார்க்கப்படும் தொடக்க எழுத்துகள் + உயிர் வகை (NAME_SYLLABLES-இலிருந்து) ──
const expected = new Map(); // roman → { heads:Set, vowel, kind, syllables:Set }
for (const row of NAME_SYLLABLES) {
  for (const [syl, roman] of row) {
    const fs = firstSyllable(syl);
    if (fs.kind === "other" || !fs.vowel) { bad(`NAME_SYLLABLES: cannot parse syllable "${syl}" (${roman})`); continue; }
    let e = expected.get(roman);
    if (!e) expected.set(roman, (e = { heads: new Set(), vowel: fs.vowel, kind: fs.kind, syllables: new Set() }));
    if (e.vowel !== fs.vowel || e.kind !== fs.kind) bad(`NAME_SYLLABLES: sound "${roman}" is paired with syllables of different vowels (${[...e.syllables, syl].join(", ")})`);
    e.syllables.add(syl);
    if (fs.kind === "vowel") {
      for (const [letter, cls] of Object.entries(VOWEL_LETTER)) if (cls === fs.vowel) e.heads.add(letter);
    } else {
      e.heads.add(fs.head);
      for (const alt of SPELLING_ALIAS[fs.head] || []) e.heads.add(alt);
    }
  }
}

// ── 1. திறவுகோல்கள்: ஒவ்வொரு ஒலிக்கும் ஒன்று; கூடுதல் இல்லை ──
const keys = Object.keys(NAMES_BY_SOUND);
for (const roman of expected.keys()) {
  if (Object.prototype.hasOwnProperty.call(NAMES_BY_SOUND, roman)) ok(); else bad(`missing key "${roman}"`);
}
for (const k of keys) { if (expected.has(k)) ok(); else bad(`extra key "${k}" (not a sound in NAME_SYLLABLES)`); }

// ── 2. ஒவ்வொரு பெயரும்: தமிழ் எழுத்து மட்டும், சரியான தொடக்க ஒலி, மறுபடி வராதது ──
const count = { m: { n: 0, c: 0, t: 0 }, f: { n: 0, c: 0, t: 0 } };
let withNames = 0; const empty = [];
for (const [roman, v] of Object.entries(NAMES_BY_SOUND)) {
  const e = expected.get(roman); if (!e) continue;
  const all = { m: [], f: [] };
  for (const g of ["m", "f"]) {
    if (!v || !v[g] || typeof v[g] !== "object" || Array.isArray(v[g])) { bad(`${roman}.${g} must be an object with n/c/t lists`); continue; }
    const extra = Object.keys(v[g]).filter((k) => !STYLES.includes(k)); if (extra.length) bad(`${roman}.${g}: unknown style keys ${extra.join(", ")}`); else ok();
    for (const st of STYLES) {
      const list = v[g][st];
      if (!Array.isArray(list)) { bad(`${roman}.${g}.${st} must be an array`); continue; }
      for (const name of list) {
        count[g][st]++; all[g].push(name);
        if (typeof name !== "string" || !name || name !== name.trim() || name !== name.normalize("NFC") || !TAMIL_NAME.test(name)) { bad(`${roman}.${g}.${st}: "${name}" is not a plain Tamil name`); continue; }
        const fs = firstSyllable(name);
        if (!e.heads.has(fs.head)) bad(`${roman}.${g}.${st}: "${name}" starts with "${fs.head}", expected ${[...e.heads].join("/")}`);
        else if (fs.vowel !== e.vowel) bad(`${roman}.${g}.${st}: "${name}" has first vowel "${fs.vowel}", expected "${e.vowel}"`);
        else ok();
      }
    }
    if (new Set(all[g]).size === all[g].length) ok(); else bad(`${roman}.${g}: duplicate names — ${all[g].filter((n, i) => all[g].indexOf(n) !== i).join(", ")}`);
  }
  const both = all.m.filter((n) => all.f.includes(n));
  if (both.length) bad(`${roman}: listed for both genders — ${both.join(", ")}`); else ok();
  if (all.m.length + all.f.length) withNames++; else empty.push(roman);
}
// ── 3. ஒரே தமிழ் எழுத்தைப் பகிரும் ஒலிக் குடும்பங்கள் (திரையில் இணைத்துக் காட்டப்படுபவை) ──
const famSeen = new Set(); let emptyLetters = [];
for (const fam of SOUND_FAMILIES) {
  const es = fam.map((r) => expected.get(r));
  if (es.some((e) => !e)) { bad(`SOUND_FAMILIES: unknown sound in ${fam.join(", ")}`); continue; }
  for (const r of fam) { if (famSeen.has(r)) bad(`SOUND_FAMILIES: "${r}" is in two families`); else ok(); famSeen.add(r); }
  // எல்லா ஒலிகளும் ஒரே உயிர் வகை, பொதுவான தொடக்க எழுத்துடன்
  if (es.every((e) => e.vowel === es[0].vowel && [...e.heads].some((h) => es[0].heads.has(h)))) ok(); else bad(`SOUND_FAMILIES: ${fam.join(", ")} do not share a Tamil letter`);
  // ஒரு பெயர் குடும்பத்தில் ஒரு முறை மட்டும், ஒரே பாலினத்தில்
  const where = new Map();
  for (const r of fam) for (const g of ["m", "f"]) for (const st of STYLES) for (const name of NAMES_BY_SOUND[r]?.[g]?.[st] || []) {
    if (where.has(name)) bad(`family ${fam.join("/")}: "${name}" is in ${where.get(name)} and ${r}.${g}`); else { ok(); where.set(name, `${r}.${g}`); }
  }
}
// எந்தத் தமிழ் எழுத்துக்கும் பெயர் இல்லாமல் போகிறதா (குடும்பத்தையும் சேர்த்துப் பார்த்து)
const famOf = (r) => SOUND_FAMILIES.find((f) => f.includes(r)) || [r];
for (const r of expected.keys()) {
  const n = famOf(r).reduce((a, x) => a + ["m", "f"].reduce((b, g) => b + STYLES.reduce((c, st) => c + (NAMES_BY_SOUND[x]?.[g]?.[st] || []).length, 0), 0), 0);
  if (!n) emptyLetters.push(r);
}
const sum = (o) => o.n + o.c + o.t;
console.log(`sounds: ${keys.length} · with names: ${withNames} · boy names: ${sum(count.m)} · girl names: ${sum(count.f)} · total: ${sum(count.m) + sum(count.f)}`);
console.log(`by style — நவீனம்: ${count.m.n + count.f.n} · நடுத்தரம்: ${count.m.c + count.f.c} · பாரம்பரியம்: ${count.m.t + count.f.t}`);
if (empty.length) console.log(`empty sounds (${empty.length}): ${empty.join(", ")}`);
console.log(`letters with no names even with related sounds (${emptyLetters.length}): ${emptyLetters.join(", ") || "—"}`);
console.log(fail ? `✗ ${fail} NAME CHECKS FAILED (${pass} passed)` : `✓ ALL ${pass} NAME CHECKS PASSED`);
if (fail) process.exit(1);
