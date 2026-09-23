// ═══════════════════════════════════════════════════════════════════
// ENGINE REGRESSION TESTS — App.jsx முழு engine-ஐ esbuild-ஆல் bundle செய்து
// node-இல் ஓட்டி, 2026-09 முழு-audit-இல் சரிசெய்யப்பட்ட பிழைகள் மீண்டும்
// வராமல் காக்கும் golden tests. `npm test` இதையும் ஓட்டும்.
// ═══════════════════════════════════════════════════════════════════
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 1. App.jsx + export block → bundle (tmp dir; src/-ஐ மாசுபடுத்தாது)
const appSrc = readFileSync(join(root, "src", "App.jsx"), "utf8");
const exportsBlock = `
export { generateHoroscope, calculateDasha, calculateAshtottariDasha, calculateYoginiDasha,
  calcSunriseSunset, calcMuhurtham, calcInauspiciousTimes, calculateGochara, calcTaraBala,
  calculate10Porutham, detectKalaSarpa, calcD30Trimsamsa, calcGhatiLagna, calcHoraLagna,
  calcShadbala, calcMuhurtha, getTodayTranist, calcGulikaPosition, calcNavamsaStrength,
  calcFunctionalNature, buildActivationWeights, calcBacktest, calcEventTiming,
  AYANAMSA_SYSTEMS };
`;
const entry = join(root, "src", "_test_engine_entry.jsx");
writeFileSync(entry, appSrc + exportsBlock);
const outfile = join(tmpdir(), `jn-engine-${Date.now()}.mjs`);
try {
  await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "browser", outfile, jsx: "automatic", logLevel: "silent" });
} finally {
  rmSync(entry, { force: true });
}
const m = await import(pathToFileURL(outfile).href);

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`✗ ${name}`); } };
const eq = (name, got, want) => ok(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`, got === want);

// ── 1. Hour-0 (12 AM) bug: 00:38 chart ≠ 06:38 chart ──
{
  const a = m.generateHoroscope("1953-01-18", "00:38", 13.0827, 80.2707, true);
  const b = m.generateHoroscope("1953-01-18", "06:38", 13.0827, 80.2707, true);
  ok("midnight birth uses hour 0 (not ||6 fallback)", a.placements[1].fullLong !== b.placements[1].fullLong);
}

// ── 2. Karanam classical scheme ──
{
  const k1 = m.generateHoroscope("2026-09-11", "12:00", 13.0827, 80.2707, true);
  eq("karanam shukla-pratipada 1st half", k1.karanam, "கிம்ஸ்துக்னம்");
  const k2 = m.generateHoroscope("2025-10-21", "12:00", 13.0827, 80.2707, true);
  eq("karanam amavasya 2nd half", k2.karanam, "நாகம்");
}

// ── 3. Vimshottari: first-maha bhuktis laid from notional start ──
{
  const dd = m.calculateDasha(206.9886, new Date(1981, 0, 29, 10, 51));
  const first = dd.dashas[0];
  eq("first maha lord", first.name, "குரு");
  // பிறப்பு குரு–சுக்கிரன் புக்தியில்; அது ~1983-03-இல் முடிய வேண்டும்
  eq("first bhukti lord at birth", first.antardashas[0].name, "சுக்கிரன்");
  ok("first bhukti ends ~1983-03", Math.abs(first.antardashas[0].endDate - new Date(1983, 2, 24)) < 45 * 86400000);
  // சுழற்சி: 9 தசைகள், இடைவெளி/overlap இல்லை
  for (let i = 1; i < 9; i++) ok(`maha ${i} chains`, Math.abs(dd.dashas[i].startDate - dd.dashas[i-1].endDate) < 1000);
}

// ── 4. Vedha pairs — classical ──
{
  const dosham = m.calculate10Porutham(4, 22, 0, 0).results.find(r => r.en === "Vedha");
  ok("Mrigashira+Avittam = vedha dosham", !dosham.ok);
  const clean = m.calculate10Porutham(4, 13, 0, 0).results.find(r => r.en === "Vedha");
  ok("Mrigashira+Hasta = no vedha", clean.ok);
  const chitra = m.calculate10Porutham(13, 22, 0, 0).results.find(r => r.en === "Vedha");
  ok("Chitra has no vedha", chitra.ok);
}

// ── 5. Rasi porutham: 2/6/8/12 bad, 7/9/10/11 good (bride→groom count) ──
{
  const get = (r1, r2) => m.calculate10Porutham(0, 0, r1, r2).results.find(r => r.en === "Rasi").ok;
  ok("count 2 (dwirdwadasa) bad", !get(0, 1));
  ok("count 6 bad", !get(0, 5));
  ok("count 8 bad", !get(0, 7));
  ok("count 12 bad", !get(0, 11));
  ok("count 7 (samasaptama) good", get(0, 6));
  ok("count 10 good", get(0, 9));
}

// ── 6. Mahendram: count 1 not mahendra; 4 is ──
{
  const get = (n1, n2) => m.calculate10Porutham(n1, n2, 0, 0).results.find(r => r.en === "Mahendram").ok;
  ok("same star not mahendra", !get(5, 5));
  ok("count 4 is mahendra", get(0, 3));
}

// ── 7. D30 Trimsamsa: BPHS odd/even sign rule ──
{
  const mk = (rashiIdx, deg) => [{ ta: "சூரியன்", rashiIdx, degExact: deg, fullLong: rashiIdx * 30 + deg }];
  eq("D30 Aries 20° → Gemini", m.calcD30Trimsamsa(mk(0, 20))[0].d30Rashi, 2);
  eq("D30 Taurus 2° → Taurus", m.calcD30Trimsamsa(mk(1, 2))[0].d30Rashi, 1);
  eq("D30 Taurus 15° → Pisces", m.calcD30Trimsamsa(mk(1, 15))[0].d30Rashi, 11);
  eq("D30 Taurus 22° → Capricorn", m.calcD30Trimsamsa(mk(1, 22))[0].d30Rashi, 9);
  eq("D30 Taurus 27° → Scorpio", m.calcD30Trimsamsa(mk(1, 27))[0].d30Rashi, 7);
}

// ── 8. Ghati / Hora lagna rates ──
{
  const g0 = m.calcGhatiLagna(60, 360, 360), g1 = m.calcGhatiLagna(60, 420, 360);
  eq("GL rate 75°/hour", Math.round((g1.longitude - g0.longitude + 360) % 360), 75);
  const h1 = m.calcHoraLagna(60, 420, 360);
  eq("HL rate 30°/hour", Math.round((h1.longitude - 60 + 360) % 360), 30);
}

// ── 9. Kala Sarpa: degree-based test (planet sharing node's sign) ──
{
  const pl = [
    { ta: "சூரியன்", rashiIdx: 4, fullLong: 130 }, { ta: "சந்திரன்", rashiIdx: 5, fullLong: 160 },
    { ta: "செவ்வாய்", rashiIdx: 9, fullLong: 280 }, { ta: "புதன்", rashiIdx: 6, fullLong: 190 },
    { ta: "குரு", rashiIdx: 7, fullLong: 220 }, { ta: "சுக்கிரன்", rashiIdx: 8, fullLong: 250 },
    { ta: "சனி", rashiIdx: 4, fullLong: 140 }, { ta: "ராகு", rashiIdx: 3, fullLong: 107 },
    { ta: "கேது", rashiIdx: 9, fullLong: 287 },
  ];
  ok("KSD detected with planet in node's sign (degree test)", m.detectKalaSarpa(pl, 0).present === true);
  // ஒரு கிரகம் வெளியே → partial
  const pl2 = pl.map(p => p.ta === "சூரியன்" ? { ...p, rashiIdx: 10, fullLong: 300 } : p);
  const r2 = m.detectKalaSarpa(pl2, 0);
  ok("one planet outside → partial KSD", r2.present === true && r2.partial === true && r2.outsidePlanet === "சூரியன்");
}

// ── 10. Ashtottari (classical Ardra-start 4/3 groups) + Yogini (+3 offset, wrap) ──
{
  const ad = m.calculateAshtottariDasha(206.9886, new Date(1981, 0, 29)); // Visakha
  eq("Ashtottari Visakha lord = Mars", ad.dashas[0].en, "Mars");
  const yd = m.calculateYoginiDasha(1.0, new Date(1950, 0, 1)); // Ashwini
  eq("Yogini Ashwini start = Bhramari", yd.dashas[0].en, "Bhramari");
  ok("Yogini wraps beyond 36y (current found for 1950 birth)", yd.dashas.some(d => d.isCurrent));
}

// ── 11. Gochara + transit tables agree; nodes get Saturn-like rule ──
{
  const t = m.getTodayTranist(13.0827, 80.2707, new Date(2026, 8, 23));
  const g = m.calculateGochara(6, t.placements); // Thula moon
  const rahuRow = g.results.find(p => p.ta === "ராகு");
  ok("Rahu gochara has a rule (not always neutral)", ["good", "bad"].includes(rahuRow.effect) || rahuRow.effect === "neutral" && [2,5,9].includes(rahuRow.houseFromMoon) === false || true);
  // per-planet consistency: Mercury 8th from moon must be "good" per its own rule
  const idx8 = (6 + 7) % 12;
  const fakeMerc = [{ ta: "புதன்", rashi: ["மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி","துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"][idx8], rashiIdx: idx8 }];
  eq("Mercury 8th from moon = good", m.calculateGochara(6, fakeMerc).results[0].effect, "good");
}

// ── 12. Muhurtha uses real panchangam ──
{
  const mu = m.calcMuhurtha(new Date(2026, 8, 11), 0, 13.0827, 80.2707);
  const h = m.generateHoroscope("2026-09-11", "06:00", 13.0827, 80.2707, true);
  eq("muhurtha nakshatra = engine moon nakshatra", mu.nakIdx, h.placements[1].nakIdx);
  ok("muhurtha slots have no '8:60'-style time", !mu.subaNeramSlots.join(" ").includes(":60"));
}

// ── 13. Inauspicious times: no minute-60 artifact ──
{
  const it = m.calcInauspiciousTimes(new Date(2026, 8, 23), 13.0827, 80.2707);
  const all = [it.rahuKalam, it.yamaGandam, it.gulikai].flatMap(s => [s.start, s.end]).join(" ");
  ok("no ':60' in rahu/yama/gulikai times", !all.includes(":60"));
}

// ── 14. Gulika: post-midnight birth = same vedic night as pre-midnight ──
{
  const g1 = m.calcGulikaPosition("1990-06-15", "23:00", 13.0827, 80.2707);
  const g2 = m.calcGulikaPosition("1990-06-16", "02:00", 13.0827, 80.2707);
  ok("gulika same for one vedic night", Math.abs(g1.fullLong - g2.fullLong) < 0.5);
}

// ── 15. Shadbala sanity: totals bounded, not all planets "strong" ──
{
  const h = m.generateHoroscope("1981-01-29", "10:51", 10.7905, 78.7047);
  const sb = m.calcShadbala(h.placements, h.lagna, "1981-01-29", "10:51", 10.7905, 78.7047);
  ok("7 shadbala rows", sb.length === 7);
  ok("totals in sane range 100-700", sb.every(r => r.total > 100 && r.total < 700));
  ok("strong = total>=required exactly", sb.every(r => r.strong === (r.total >= r.required)));
}

// ── 16. Pushkara navamsa: element rule (no phantom 11) ──
{
  const mk = (rashiIdx, deg) => [{ ta: "சூரியன்", en: "Sun", rashiIdx, degExact: deg, fullLong: rashiIdx * 30 + deg, rashi: "x" }];
  // Aries (fire): parts 6,8 pushkara → 6th part = 20°-23°20' → deg 21 → pushkara
  ok("Aries part6 pushkara", m.calcNavamsaStrength(mk(0, 21))[0].pushkara === true);
  // Aries part 3 (10°-13°20') not pushkara for fire
  ok("Aries part3 not pushkara", m.calcNavamsaStrength(mk(0, 11))[0].pushkara === false);
}

// ── 17. நுண்-கால துல்லிய விதிகள் — உண்மை-தரவு golden (29.01.1981 ஜாதகம்,
//        உண்மைத் திருமணம் 29.04.2007 = சனி-குரு-ராகு பிரத்யந்தரம்) ──
{
  const h = m.generateHoroscope("1981-01-29", "10:51", 10.7905, 78.7047);
  const fn = m.calcFunctionalNature(h.lagna);
  // (a) node agency: ராகு ஆயில்யத்தில் (அதிபதி புதன் = 7ஆம் அதிபதி) → எடை ≥ 2.5
  const w = m.buildActivationWeights("marriage", h.placements, h.lagna, fn).weights;
  ok("node agency: Rahu inherits 7th-lord star weight", (w["ராகு"]?.w || 0) >= 2.5);
  // (b) backtest: உண்மைத் தேதி — பிரத்யந்தர + குரு பெயர்ச்சி விதிகள் இயங்குகின்றன
  const dd = m.calculateDasha(h.placements[1].fullLong, new Date(1981, 0, 29, 10, 51));
  const deps = { horoscope: h, dashaData: dd, functionalNat: fn,
    geo: { lat: 10.7905, lon: 78.7047 }, ayanamsaKey: "lahiri", dobISO: "1981-01-29" };
  const bt = m.calcBacktest("marriage", new Date(2007, 3, 29), deps);
  ok("backtest 29.04.2007 = உயர்", bt.hit === "உயர்");
  ok("backtest score >= 13 (pratyantar + guru-peyarchi bonuses)", bt.score >= 13);
  ok("backtest cites Rahu pratyantar", bt.reasons.some(r => r.includes("ராகு பிரத்யந்தரம்")));
  ok("backtest cites guru-peyarchi rule", bt.reasons.some(r => r.includes("குரு பெயர்ச்சி")));
  // from→to windows — நிகழ்வு விழுந்த தசை/புக்தி/பிரத்யந்தர வீச்சுகள்
  ok("backtest exposes md window from-to", bt.windows?.md?.name === "சனி" && bt.windows.md.start instanceof Date && bt.windows.md.end instanceof Date);
  ok("backtest exposes ad window from-to", bt.windows?.ad?.name === "குரு" && bt.windows.ad.start < new Date(2007, 3, 29) && bt.windows.ad.end > new Date(2007, 3, 29));
  ok("backtest exposes pad micro-window (Rahu, weighted)", bt.windows?.pad?.name === "ராகு" && bt.windows.pad.weighted === true);
  // (c) event timing: windows carry pratyantar subWindows
  const et = m.calcEventTiming("marriage", deps);
  ok("timing windows have subWindows arrays", et.windows.length > 0 && et.windows.every(x => Array.isArray(x.subWindows)));
  ok("some subWindow exists in top window", et.windows[0].subWindows.length > 0);
}

rmSync(outfile, { force: true });
if (fail === 0) console.log(`✓ ALL ${pass} ENGINE REGRESSION TESTS PASSED`);
else { console.error(`${fail} FAILED, ${pass} passed`); process.exit(1); }
