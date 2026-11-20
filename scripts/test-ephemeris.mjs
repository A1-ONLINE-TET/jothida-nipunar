// ═══════════════════════════════════════════════════════════════════
// EPHEMERIS ACCURACY TEST — engine-இன் கிரக/லக்ன தீர்க்காம்சங்களை ஒரு தனிப்பட்ட
// (independent) ephemeris-இன் மதிப்புகளுடன் ஒப்பிடுகிறது (scripts/fixtures/ephemeris-ref.json,
// 1905–2094, 120 பிறப்புகள்). engine.js-இன் வானியல் பகுதியை மாற்றினால் இது காக்கும்:
// 2026-11 audit-இல் கண்ட "J2000 → நாளின் equinox precession விடுபட்டது" (5 கிரகங்கள்
// நூற்றாண்டுக்கு 1.4° தவறு) போன்ற பிழை மீண்டும் வந்தால் உடனே தோல்வி காட்டும்.
// ═══════════════════════════════════════════════════════════════════
import fs from "node:fs";
import * as m from "../src/engine.js";

const { rows } = JSON.parse(fs.readFileSync(new URL("./fixtures/ephemeris-ref.json", import.meta.url), "utf8"));
// அனுமதிக்கப்பட்ட அதிகபட்சப் பிழை (பாகை). செவ்வாய்/சுக்கிரன் பூமிக்கு அருகில் வரும்போது சற்று அதிகம்.
const TOL = { sun: 0.002, moon: 0.012, mars: 0.09, mercury: 0.04, jupiter: 0.04, venus: 0.05, saturn: 0.03, rahuMean: 0.002, lagna: 0.03 };
const TA = { sun: "சூரியன்", moon: "சந்திரன்", mars: "செவ்வாய்", mercury: "புதன்", jupiter: "குரு", venus: "சுக்கிரன்", saturn: "சனி", rahuMean: "ராகு" };
const diff = (a, b) => { let d = a - b; if (d > 180) d -= 360; if (d < -180) d += 360; return Math.abs(d); };

let pass = 0, fail = 0; const worst = {};
for (const r of rows) {
  const h = m.generateHoroscope(r.dob, r.tob, r.lat, r.lon, true, "lahiri", 5.5);
  const got = { lagna: h.lagnaFullLong };
  for (const k of Object.keys(TA)) { const p = h.placements.find((x) => x.ta === TA[k]); got[k] = p.rashiIdx * 30 + p.degExact; }
  for (const k of Object.keys(TOL)) {
    if (k === "rahuMean" && m.NODE_TYPE !== "mean") continue;
    const e = diff(got[k], r[k]) - (k === "lagna" ? 0.005 : 0); // lagnaFullLong 2 தசமத்துக்கு round ஆகிறது
    worst[k] = Math.max(worst[k] || 0, e);
    if (e <= TOL[k]) pass++; else { fail++; console.error(`✗ ${k} ${r.dob} ${r.tob}: engine ${got[k].toFixed(4)}°, reference ${r[k]}° (Δ ${e.toFixed(4)}°, limit ${TOL[k]}°)`); }
  }
}
console.log("  max error (deg): " + Object.entries(worst).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(" · "));
if (fail) { console.error(`${fail} FAILED, ${pass} passed`); process.exit(1); }
console.log(`✓ ALL ${pass} EPHEMERIS CHECKS PASSED`);
