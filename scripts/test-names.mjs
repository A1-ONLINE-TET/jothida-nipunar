// குழந்தைப் பெயர்ப் பட்டியல் (src/components/names-data.js) ↔ நட்சத்திர பாத எழுத்துக்கள்
// (src/components/tools-data.js → NAME_SYLLABLES) பொருந்துகின்றனவா என்ற சோதனை.
// ஓட்ட: node scripts/test-names.mjs
import { NAME_SYLLABLES } from "../src/components/tools-data.js";
import { NAMES_BY_SOUND } from "../src/components/names-data.js";

let pass = 0, fail = 0;
const bad = (msg) => { fail++; console.log("✗ " + msg); };
const ok = () => { pass++; };

const MAX_PER_LIST = 12;
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
for (const k of keys) {
  if (expected.has(k)) ok(); else bad(`extra key "${k}" (not a sound in NAME_SYLLABLES)`);
}

// ── 2. ஒவ்வொரு பட்டியலும், ஒவ்வொரு பெயரும் ──
let boys = 0, girls = 0, soundsWithNames = 0;
const empty = [];
for (const k of keys) {
  const e = expected.get(k);
  const v = NAMES_BY_SOUND[k];
  if (!v || typeof v !== "object" || !Array.isArray(v.m) || !Array.isArray(v.f)) { bad(`"${k}": value must be { m: [...], f: [...] }`); continue; }
  const extraProps = Object.keys(v).filter((p) => p !== "m" && p !== "f");
  if (extraProps.length) bad(`"${k}": unexpected properties ${extraProps.join(", ")}`); else ok();
  if (v.m.length + v.f.length > 0) soundsWithNames++; else empty.push(k);
  boys += v.m.length; girls += v.f.length;
  for (const g of ["m", "f"]) {
    const list = v[g];
    if (list.length > MAX_PER_LIST) bad(`"${k}".${g}: ${list.length} names (limit ${MAX_PER_LIST})`); else ok();
    const seen = new Set();
    for (const name of list) {
      const where = `"${k}".${g} "${name}"`;
      if (typeof name !== "string" || !name) { bad(`"${k}".${g}: empty or non-string entry`); continue; }
      if (seen.has(name)) bad(`${where}: duplicate in list`); else ok();
      seen.add(name);
      if (name !== name.trim()) bad(`${where}: leading/trailing space`);
      if (name !== name.normalize("NFC")) bad(`${where}: not NFC-normalized`);
      if (/[A-Za-z0-9]/.test(name)) bad(`${where}: contains Latin letters or digits`);
      if (!TAMIL_NAME.test(name)) { bad(`${where}: contains characters outside the Tamil letters/signs`); continue; }
      if ([...name].length < 2) { bad(`${where}: too short to be a name`); continue; }
      if (!e) continue; // கூடுதல் திறவுகோல் — மேலே ஏற்கெனவே பிழை
      const fs = firstSyllable(name);
      if (!e.heads.has(fs.head)) { bad(`${where}: starts with "${fs.head}", expected one of ${[...e.heads].join(" ")}`); continue; }
      if (fs.vowel !== e.vowel) { bad(`${where}: first-syllable vowel "${fs.vowel}" does not fit sound ${k} (expected "${e.vowel}" as in ${[...e.syllables].join(", ")})`); continue; }
      ok();
    }
    // ஒரே பெயர் ஒரே ஒலியின் ஆண், பெண் இரு பட்டியலிலும் இருக்கக் கூடாது
    if (g === "f") for (const name of list) if (v.m.includes(name)) bad(`"${k}": "${name}" is in both m and f`);
  }
}

console.log(`sounds: ${expected.size} · with names: ${soundsWithNames} · boy names: ${boys} · girl names: ${girls} · total: ${boys + girls}`);
console.log(`empty sounds (${empty.length}): ${empty.join(", ") || "-"}`);
console.log(fail ? `✗ ${fail} NAME CHECKS FAILED (${pass} passed)` : `✓ ALL ${pass} NAME CHECKS PASSED`);
process.exit(fail ? 1 : 0);
