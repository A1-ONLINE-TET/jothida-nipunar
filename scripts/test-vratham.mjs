// மாத விரத விதிகள் (worker/src/vratham.js) ↔ ஆதாரத் தேதிகள் (scripts/fixtures/vratham-ref.json) — 2021–2030.
// ஓட்ட: node scripts/test-vratham.mjs
import { readFileSync } from "node:fs";
import { computeVratham } from "../worker/src/vratham.js";

const fx = JSON.parse(readFileSync(new URL("./fixtures/vratham-ref.json", import.meta.url), "utf8"));
const ref = fx.observances;
const years = Object.keys(ref.amavasai.dates).map(Number);
let pass = 0, fail = 0, known = 0;
const bad = (msg) => { fail++; console.log("✗ " + msg); };
const per = {}; // key → { ok, total }
const mins = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const weekday = (iso) => new Date(iso + "T00:00:00Z").getUTCDay();
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

for (const year of years) {
  const out = computeVratham(year);
  if (out.year !== year || !Array.isArray(out.items)) { bad(`${year}: wrong result shape`); continue; }
  const got = {};
  let prev = "";
  for (const it of out.items) {
    (got[it.key] ||= []).push(it);
    // வடிவம்: தேதி வரிசை, அந்த ஆண்டுக்குள், தமிழ்ப் பெயர், emoji இல்லை
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date) || !it.date.startsWith(year + "-")) bad(`${year} ${it.key}: bad date ${it.date}`);
    if (it.date < prev) bad(`${year}: items not sorted at ${it.date}`);
    prev = it.date;
    if (!ref[it.key]) { bad(`${year} ${it.key}: no reference entry`); continue; }
    // வேண்டுமென்றே விடப்பட்ட விரதம் (சஷ்டி — fixture-இல் shipped: false) வெளியீட்டில் வரக் கூடாது
    if (ref[it.key].shipped === false) { bad(`${year} ${it.key} ${it.date}: this observance must not be in the output (see fixture: notShipped)`); continue; }
    if (it.name !== ref[it.key].name) bad(`${year} ${it.key}: name "${it.name}" expected "${ref[it.key].name}"`);
    if (EMOJI.test(it.name + (it.note || ""))) bad(`${year} ${it.key}: emoji in output`);
    if (it.paksha !== undefined && it.paksha !== "வளர்பிறை" && it.paksha !== "தேய்பிறை") bad(`${year} ${it.key}: bad paksha ${it.paksha}`);
  }
  for (const [key, o] of Object.entries(ref)) {
    if (o.shipped === false) { if (!got[key]) pass++; continue; } // ஆண்டுக்கு ஒரு சோதனை: வெளியீட்டில் இல்லை
    const want = o.dates[year] || [], have = (got[key] || []).map((x) => x.date);
    const p = (per[key] ||= { ok: 0, total: 0 });
    const exc = (o.exceptions || []).filter((e) => e.reference.startsWith(year + "-"));
    for (const d of want) {
      p.total++;
      const e = exc.find((x) => x.reference === d);
      if (have.includes(d)) { if (e) bad(`${year} ${key}: ${d} is listed as a known exception but now matches — remove it from the fixture`); else { pass++; p.ok++; } }
      else if (e && have.includes(e.computed)) known++;
      else bad(`${year} ${key}: reference ${d} not computed (computed: ${have.filter((h) => Math.abs(new Date(h) - new Date(d)) <= 3 * 86400000).join(", ") || "none nearby"})`);
    }
    for (const d of have) if (!want.includes(d) && !exc.some((e) => e.computed === d)) bad(`${year} ${key}: computed ${d} is not in the reference`);

    for (const it of got[key] || []) {
      // பக்ஷம்: ஏகாதசி / பிரதோஷம் — ஆதாரத்தின் கிருஷ்ண பக்ஷப் பட்டியலுடன்
      if (o.krishna && want.includes(it.date)) {
        const exp = o.krishna.includes(it.date) ? "தேய்பிறை" : "வளர்பிறை";
        if (it.paksha === exp) pass++; else bad(`${year} ${key} ${it.date}: paksha ${it.paksha} expected ${exp}`);
      }
      // சனிப் / சோம பிரதோஷம் குறிப்பு ↔ கிழமை
      if (key === "pradosham") {
        const wd = weekday(it.date), exp = wd === 6 ? "சனிப் பிரதோஷம்" : wd === 1 ? "சோம பிரதோஷம்" : undefined;
        if (it.note === exp) pass++; else bad(`${year} pradosham ${it.date}: note ${it.note} expected ${exp}`);
      }
      // சந்திரோதய நேரம் ↔ ஆதாரம் (± 2 நிமிடம்)
      if (o.moonrise && o.moonrise[it.date]) {
        const m = /(\d\d:\d\d)$/.exec(it.note || "");
        if (m && Math.abs(mins(m[1]) - mins(o.moonrise[it.date])) <= 2) pass++;
        else bad(`${year} ${key} ${it.date}: moonrise note "${it.note}" reference ${o.moonrise[it.date]}`);
      }
    }
  }
}
for (const [key, o] of Object.entries(ref)) if (o.shipped === false) console.log(`  ${o.name} (${key}): not shipped — asserted absent from the output`);
for (const [key, p] of Object.entries(per)) {
  const ex = (ref[key].exceptions || []).length;
  console.log(`  ${ref[key].name} (${key}): ${p.ok}/${p.total} reference dates${ex ? ` + ${ex} known exception` : ""}`);
}
const t0 = performance.now(); computeVratham(2026);
console.log(`  computeVratham(2026): ${(performance.now() - t0).toFixed(1)} ms`);
console.log(fail ? `✗ ${fail} VRATHAM CHECKS FAILED (${pass} passed)` : `✓ ALL ${pass} VRATHAM CHECKS PASSED (${known} known exception${known === 1 ? "" : "s"} — see fixture)`);
process.exit(fail ? 1 : 0);
