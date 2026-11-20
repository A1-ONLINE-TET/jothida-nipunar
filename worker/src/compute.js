// ═══════════════════════════════════════════════════════════════════
// FULL-REPORT ORCHESTRATOR (server-side)
// ═══════════════════════════════════════════════════════════════════
// Mirrors the client's old runAllEngines() pipeline exactly, but returns
// one plain JSON object instead of calling React setState. This is the
// heart of "logic runs only on the server": the browser sends birth
// details, this runs every engine, and only the assembled result is
// returned. The engine module is imported from the extracted src/engine.js.
// ═══════════════════════════════════════════════════════════════════
import {
  generateHoroscope, parseBackendResponse,
  calculateNavamsa, calcGrahaDrishti,
  calcD10Dasamsa, calcD2Hora, calcD3Drekkana, calcD12Dwadasamsa, calcD60Shashtiamsa,
  calcD4Chaturthamsa, calcD7Saptamsa, calcD16Shodasamsa, calcD20Vimsamsa, calcD24Siddhamsa,
  calcD27Bhamsa, calcD40Khavedamsa, calcD45Akshavedamsa,
  calcJaiminiAnalysis, calcAllArudhaPadas, calcCharaDasha, calcVarshaphala, calcBhavaChart,
  calcGrahaBala, calcShadbala, calcVimshopakaBala, calcNavamsaStrength, calcAvasthas,
  calcFunctionalNature, calcMarakaBadhaka, calcAshtakavarga, calcBhavaBala, buildUnifiedStrength,
  detectMahapurushaYogas, detectClassicalYogas, detectKalaSarpa, detectChevvaiDosham,
  calculateDasha, calcTransitOverlay, calcPlanetTransitAnalysis, calcInauspiciousTimes,
  calcMuhurtha, calcBhavaPhalam, analyzeKeyLifeAreas, analyzeFamilyHealthIndications,
  calcPlanetContext, calcSequenceLinkages, getRemedies, calcGulikaPosition,
  calcBirthTimeSensitivity, calcTamilDate, CLASSICAL_7,
  getTodayTranist, calculateGochara, getPersonalizedRemedy, calcMuhurtham,
  calcSadeSati, calcGuruPeyarchi, calcTaraBala, RASHIS, NAKSHATRAS,
  calcDashaSandhi, calcNakshatraBhavaLinks, calcBacktest, calcEventTiming,
  calculate10Porutham, calcDailyLuckyNumbers, GRAHA_FRIENDSHIP,
  calculateYoginiDasha, calculateAshtottariDasha, checkPanchaka, SANI_TRANSIT_EFFECTS,
  GURU_TRANSIT_EFFECTS, HOUSE_THEMES, PLANET_REMEDIES, DAY_REMEDIES,
  setEngineTimezone, civilNow,
} from "../../src/engine.js";
import { tamilDatesForMonth } from "./festivals.js";

// Every entry point sets the engine's civil zone first: the birth place's zone for
// birth-based work (birth.tzOffset — IST unless the person was born abroad or in the
// 1942–45 war-time period), IST for everything else. The engine keeps it in module
// state, so it must be set inside each synchronous computation, never across an await.
export const useZone = (birth) => setEngineTimezone(birth && Number.isFinite(birth.tzOffset) ? birth.tzOffset : 5.5);

// Vimshottari dasha for this birth (needed by the daily bundle + prompts).
export function computeDasha(h, birth) {
  useZone(birth);
  const [dY, dM, dD] = birth.dobISO.split("-").map(Number);
  const [dH, dMin] = (birth.time24 || "06:00").split(":").map(Number);
  const moonP = h.placements.find((p) => p.ta === "சந்திரன்");
  const moonLong = moonP ? (moonP.fullLong != null ? moonP.fullLong : moonP.rashiIdx * 30 + (moonP.degExact || 0)) : 0;
  return calculateDasha(moonLong, new Date(dY, dM - 1, dD, Number.isFinite(dH) ? dH : 6, Number.isFinite(dMin) ? dMin : 0));
}

// Daily / specific-date bundle — mirrors the client's openDailyScreen assembly.
export function computeDailyBundle(h, dashaData, birth, targetDateISO) {
  useZone(birth);
  const { lat, lon, ayanamsaKey } = birth;
  const targetDate = targetDateISO ? new Date(targetDateISO + "T06:00:00") : null;
  const refDate = targetDate || civilNow();
  const today = getTodayTranist(lat, lon, targetDate, ayanamsaKey);

  const bmRaw = RASHIS.indexOf(h.moonRashi);
  const birthMoonRashi = bmRaw >= 0 ? bmRaw : 0;
  const gochara = calculateGochara(birthMoonRashi, today.placements);
  const remedy = getPersonalizedRemedy(birthMoonRashi, today.dateObj.getDay(), gochara.isChandrashtama, today.tithi);
  const muhurtham = calcMuhurtham(today.dateObj, lat, lon);

  const saturnToday = today.placements.find((p) => p.ta === "சனி");
  const jupiterToday = today.placements.find((p) => p.ta === "குரு");
  const sadeSati = saturnToday ? calcSadeSati(birthMoonRashi, RASHIS.indexOf(saturnToday.rashi)) : null;
  const guruPeyarchi = jupiterToday ? calcGuruPeyarchi(birthMoonRashi, RASHIS.indexOf(jupiterToday.rashi)) : null;

  const birthNakIdx = NAKSHATRAS.indexOf(h.nakshatra);
  const todayNakIdx = NAKSHATRAS.indexOf(today.nakshatra);
  const taraBala = birthNakIdx >= 0 && todayNakIdx >= 0 ? calcTaraBala(birthNakIdx, todayNakIdx) : null;

  let currentDasha = null;
  if (dashaData) {
    const mahadasha = dashaData.dashas.find((d) => refDate >= d.startDate && refDate < d.endDate);
    if (mahadasha) {
      const bhukti = mahadasha.antardashas.find((ad) => refDate >= ad.startDate && refDate < ad.endDate) || mahadasha.antardashas[0];
      const pratyantar = bhukti?.pratyantardashas?.find((p) => refDate >= p.startDate && refDate < p.endDate);
      const sookshma = pratyantar?.sookshmaDashas?.find((s) => refDate >= s.startDate && refDate < s.endDate);
      const daysLeftInBhukti = bhukti ? Math.max(0, Math.round((bhukti.endDate.getTime() - refDate.getTime()) / 86400000)) : 0;
      const daysLeftInSookshma = sookshma ? Math.max(0, Math.round((sookshma.endDate.getTime() - refDate.getTime()) / 86400000)) : 0;
      currentDasha = { mahadasha, bhukti, pratyantar, sookshma, daysLeftInBhukti, daysLeftInSookshma };
    }
  }
  const luckyNums = calcDailyLuckyNumbers(birthMoonRashi, today.tithi, todayNakIdx >= 0 ? todayNakIdx : 0, today.dateObj.getDay());

  return { today, gochara, remedy, muhurtham, sadeSati, guruPeyarchi, taraBala, currentDasha, luckyNums };
}

// Build the base horoscope `h`. If `swissJson` (Python Swiss-Ephemeris
// response) is supplied, parse it into engine shape; otherwise compute
// locally with the chosen ayanamsa.
export function buildHoroscope(birth, swissJson) {
  useZone(birth);
  if (swissJson) {
    const h = parseBackendResponse(swissJson);
    if (h && h.placements) return h;
  }
  return generateHoroscope(birth.dobISO, birth.time24, birth.lat, birth.lon, false, birth.ayanamsaKey);
}

export function computeFullReport(h, birth) {
  useZone(birth);
  const placements = h.placements;
  const lagnaIdx = h.lagna;
  const { dobISO, time24: finalTime, lat, lon, ayanamsaKey, gender, name, dob } = birth;
  const geo = { lat, lon };

  // transit chart for "now"
  const now = civilNow();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const transitH = generateHoroscope(todayISO, `${now.getHours()}:${now.getMinutes()}`, lat, lon, false, ayanamsaKey);

  const moonP = placements.find((p) => p.ta === "சந்திரன்");
  const moonLong = moonP ? (moonP.fullLong != null ? moonP.fullLong : moonP.rashiIdx * 30 + (moonP.degExact || 0)) : 0;

  const R = { chartMeta: { dobISO, finalTime, geo, ayanamsaKey, name, dob }, horoscope: h };

  // ── 1. varga charts ──
  R.navamsaData = calculateNavamsa(placements);
  R.drishtiData = calcGrahaDrishti(placements);
  R.d10Data = calcD10Dasamsa(placements);
  R.d2Data = calcD2Hora(placements);
  R.d3Data = calcD3Drekkana(placements);
  R.d12Data = calcD12Dwadasamsa(placements);
  R.d60Data = calcD60Shashtiamsa(placements);
  R.d4Data = calcD4Chaturthamsa(placements);
  R.d7Data = calcD7Saptamsa(placements);
  R.d16Data = calcD16Shodasamsa(placements);
  R.d20Data = calcD20Vimsamsa(placements);
  R.d24Data = calcD24Siddhamsa(placements);
  R.d27Data = calcD27Bhamsa(placements);
  R.d40Data = calcD40Khavedamsa(placements);
  R.d45Data = calcD45Akshavedamsa(placements);
  R.jaiminiData = calcJaiminiAnalysis(h);
  R.arudhaPadasData = calcAllArudhaPadas(lagnaIdx, placements);
  {
    const [cY, cM, cD] = dobISO.split("-").map(Number);
    R.charaDashaData = calcCharaDasha(lagnaIdx, placements, new Date(cY, cM - 1, cD));
  }
  {
    const nowY = civilNow().getFullYear();
    let vp = calcVarshaphala(h, dobISO, lat, lon, nowY, ayanamsaKey);
    if (vp && vp.praveshDate > civilNow()) vp = calcVarshaphala(h, dobISO, lat, lon, nowY - 1, ayanamsaKey);
    R.varshaphalaData = vp;
  }
  const lagnaFullDeg = h.lagnaFullLong != null ? h.lagnaFullLong : lagnaIdx * 30;
  R.bhavaChart = calcBhavaChart(placements, lagnaFullDeg);

  // ── 2. multi-metric strength engines ──
  const grahaBalaR = calcGrahaBala(placements);
  R.grahaBala = grahaBalaR;
  const shadBalaR = calcShadbala(placements, lagnaIdx, dobISO, finalTime, lat, lon);
  R.shadBala = shadBalaR;
  const vimshopakaR = placements.filter((p) => CLASSICAL_7.includes(p.ta)).map((p) => ({ ta: p.ta, symbol: p.symbol, ...calcVimshopakaBala(p, lagnaIdx, placements) }));
  R.vimshopakaData = vimshopakaR;
  const navStrengthR = calcNavamsaStrength(placements);
  R.navamsaStrength = navStrengthR;
  const avasthasR = calcAvasthas(placements);
  R.avasthasData = avasthasR;
  const functionalNatR = calcFunctionalNature(lagnaIdx);
  R.functionalNature = functionalNatR;
  const marakaBadhakaR = calcMarakaBadhaka(lagnaIdx, placements);
  R.marakaBadhaka = marakaBadhakaR;
  const ashtakavargaR = calcAshtakavarga(placements, lagnaIdx);
  R.ashtakavargaData = ashtakavargaR;
  const bhavaBalaR = calcBhavaBala(placements, lagnaIdx, shadBalaR);
  R.bhavaBalaData = bhavaBalaR;

  // ── 3. unified strength ──
  const unifiedR = buildUnifiedStrength({
    placements, lagnaIdx, grahaBala: grahaBalaR, shadBala: shadBalaR,
    vimshopaka: vimshopakaR, navamsaStrength: navStrengthR, avasthas: avasthasR,
    functionalNat: functionalNatR, marakaBadhaka: marakaBadhakaR,
  });
  R.unifiedStrength = unifiedR;

  // ── 4. yogas / doshas ──
  R.mahapurushaYogas = detectMahapurushaYogas(placements, lagnaIdx);
  const classicalYogasR = detectClassicalYogas(placements, lagnaIdx);
  R.classicalYogas = classicalYogasR;
  R.kalaSarpa = detectKalaSarpa(placements, lagnaIdx);
  const chevvaiR = detectChevvaiDosham(placements, lagnaIdx);
  R.chevvaiDosham = chevvaiR;

  // ── 5. dasha (anchored at birth time) ──
  const [dY, dM, dD] = dobISO.split("-").map(Number);
  const [dH, dMin] = (finalTime || "06:00").split(":").map(Number);
  const dashaR = calculateDasha(moonLong, new Date(dY, dM - 1, dD, Number.isFinite(dH) ? dH : 6, Number.isFinite(dMin) ? dMin : 0));
  R.dashaData = dashaR;

  // ── 6. transit / times ──
  const birthMoon = placements.find((p) => p.ta === "சந்திரன்");
  if (transitH) {
    R.transitOverlay = calcTransitOverlay(placements, transitH.placements, birthMoon?.rashiIdx || 0);
    R.planetTransitAnalysis = calcPlanetTransitAnalysis(birthMoon?.rashiIdx || 0, transitH.placements, birthMoon && birthMoon.nakIdx >= 0 ? birthMoon.nakIdx : -1);
  }
  R.inauspiciousTimes = calcInauspiciousTimes(civilNow(), lat, lon);
  R.muhurthaData = calcMuhurtha(civilNow(), birthMoon && birthMoon.nakIdx >= 0 ? birthMoon.nakIdx : 0, lat, lon);

  // ── 7. verdict engines ──
  const ctx = { ashtakavarga: ashtakavargaR, bhavaBala: bhavaBalaR, unified: unifiedR, marakaBadhaka: marakaBadhakaR, functionalNat: functionalNatR };
  R.bhavaPhalam = calcBhavaPhalam(h, grahaBalaR, chevvaiR, dashaR, classicalYogasR, ctx);
  R.keyAreas = analyzeKeyLifeAreas(h, grahaBalaR, chevvaiR, navStrengthR, dashaR, { sav: ashtakavargaR.sav, shadBala: shadBalaR, functionalNat: functionalNatR, gender: gender || null });
  R.familyHealthData = analyzeFamilyHealthIndications(h, grahaBalaR);
  R.planetContext = calcPlanetContext(placements, lagnaIdx, functionalNatR, unifiedR);
  R.sequenceLinks = calcSequenceLinkages(placements, lagnaIdx, functionalNatR, dashaR);
  R.remediesData = getRemedies(placements, grahaBalaR, unifiedR);
  R.gulikaData = calcGulikaPosition(dobISO, finalTime, lat, lon, ayanamsaKey);
  R.btSensitivity = calcBirthTimeSensitivity(h);
  R.dashaSandhi = calcDashaSandhi(dashaR, civilNow());
  try { R.tamilDate = calcTamilDate(dobISO, finalTime, lat, lon); } catch (_) { R.tamilDate = null; }

  return R;
}

// Deps bundle shared by backtest + event-timing (recomputed server-side so
// Date objects are real, never client-serialized strings).
function reportDeps(r, h, birth) {
  return {
    horoscope: h, dashaData: r.dashaData, functionalNat: r.functionalNature,
    geo: { lat: birth.lat, lon: birth.lon }, ayanamsaKey: birth.ayanamsaKey,
    shadBala: r.shadBala, planetCtx: r.planetContext, navStrength: r.navamsaStrength,
    chevvai: r.chevvaiDosham, ashtakavarga: r.ashtakavargaData, avasthas: r.avasthasData,
    dobISO: birth.dobISO,
  };
}

export function computeBacktest(h, birth, topic, eventDateISO) {
  useZone(birth);
  const r = computeFullReport(h, birth);
  const [y, m, d] = eventDateISO.split("-").map(Number);
  return calcBacktest(topic, new Date(y, m - 1, d), reportDeps(r, h, birth));
}

export function computeEventTiming(h, birth, topic) {
  useZone(birth);
  const r = computeFullReport(h, birth);
  return calcEventTiming(topic, reportDeps(r, h, birth));
}

// ask-category → EVENT_TOPICS key (நிகழ்வு காலக்கணிப்பு தலைப்பு)
const CAT_TO_EVENT = {
  marriage: "marriage", career: "career", wealth: "wealth", health: "health",
  education: "education", children: "children", travel: "foreign",
};

// ஆலோசனை chat-க்கான ஆழ்பொருள் bundle — ஒரு முறை முழு report கணக்கிட்டு,
// topic-க்கான நிகழ்வு windows + தோஷம்/யோகம்/சாதே சாதி சேர்த்துத் தரும்.
export function computeConsultation(h, birth, category) {
  useZone(birth);
  const r = computeFullReport(h, birth);
  const evKey = CAT_TO_EVENT[category] || null;
  let eventTiming = null;
  if (evKey) { try { eventTiming = calcEventTiming(evKey, reportDeps(r, h, birth)); } catch (_) { /* skip */ } }
  let sadeSati = null;
  try {
    const today = getTodayTranist(birth.lat, birth.lon, null, birth.ayanamsaKey);
    const bmRaw = RASHIS.indexOf(h.moonRashi);
    const birthMoonRashi = bmRaw >= 0 ? bmRaw : 0;
    const sat = today.placements.find((p) => p.ta === "சனி");
    if (sat) sadeSati = calcSadeSati(birthMoonRashi, RASHIS.indexOf(sat.rashi));
  } catch (_) { /* skip */ }
  return {
    dashaData: r.dashaData, eventTiming, sadeSati,
    chevvai: r.chevvaiDosham, kalaSarpa: r.kalaSarpa,
    classicalYogas: r.classicalYogas, mahapurusha: r.mahapurushaYogas,
    // ஆழ் synthesizers — ground to max
    keyAreas: r.keyAreas, bhavaPhalam: r.bhavaPhalam,
    familyHealth: r.familyHealthData, remedies: r.remediesData,
  };
}

export function computeNakBhava(h, birth) {
  useZone(birth);
  const r = computeFullReport(h, birth);
  return calcNakshatraBhavaLinks(
    h.placements, h.lagna, r.functionalNature, { lat: birth.lat, lon: birth.lon }, birth.ayanamsaKey,
    { dashaData: r.dashaData, unified: r.unifiedStrength, ashtakavarga: r.ashtakavargaData, lagnaFullLong: h.lagnaFullLong }
  );
}

// Marriage matching — mirrors the client's runPorutham (Chennai default geo).
export function computePorutham(bride, groom, ayanamsaKey) {
  useZone(null);
  const tzOf = (x) => (Number.isFinite(x.tzOffset) ? x.tzOffset : 5.5);
  const h1 = generateHoroscope(bride.dobISO, bride.time24, 13.0827, 80.2707, false, ayanamsaKey, tzOf(bride));
  const h2 = generateHoroscope(groom.dobISO, groom.time24, 13.0827, 80.2707, false, ayanamsaKey, tzOf(groom));
  const nak1 = NAKSHATRAS.indexOf(h1.nakshatra), nak2 = NAKSHATRAS.indexOf(h2.nakshatra);
  const rashi1 = RASHIS.indexOf(h1.moonRashi), rashi2 = RASHIS.indexOf(h2.moonRashi);
  let dashaCompat = null;
  try {
    const moonLong = (hh) => { const mp = hh.placements.find((p) => p.ta === "சந்திரன்"); return mp ? (mp.fullLong ?? mp.rashiIdx * 30 + (mp.degExact || 0)) : null; };
    const bd1 = bride.dobISO.split("-").map(Number), bd2 = groom.dobISO.split("-").map(Number);
    const [bh1, bm1] = bride.time24.split(":").map(Number), [bh2, bm2] = groom.time24.split(":").map(Number);
    const ml1 = moonLong(h1), ml2 = moonLong(h2);
    if (ml1 != null && ml2 != null) {
      const now = civilNow();
      const d1 = calculateDasha(ml1, new Date(bd1[0], bd1[1] - 1, bd1[2], bh1 || 6, bm1 || 0));
      const d2 = calculateDasha(ml2, new Date(bd2[0], bd2[1] - 1, bd2[2], bh2 || 6, bm2 || 0));
      const md1 = d1.dashas.find((d) => now >= d.startDate && now < d.endDate);
      const md2 = d2.dashas.find((d) => now >= d.startDate && now < d.endDate);
      if (md1 && md2) {
        const f12 = GRAHA_FRIENDSHIP[md1.name]?.friends.includes(md2.name) ?? false;
        const f21 = GRAHA_FRIENDSHIP[md2.name]?.friends.includes(md1.name) ?? false;
        const e12 = GRAHA_FRIENDSHIP[md1.name]?.enemies.includes(md2.name) ?? false;
        const e21 = GRAHA_FRIENDSHIP[md2.name]?.enemies.includes(md1.name) ?? false;
        const ok = md1.name === md2.name || ((f12 || f21) && !e12 && !e21);
        const neutral = !ok && !e12 && !e21;
        dashaCompat = { bride: md1.name, groom: md2.name, ok, neutral,
          text: md1.name === md2.name ? "இருவரும் ஒரே தசாதிபதி — காலப்போக்கு ஒத்திசைவு"
            : ok ? "தசாதிபதிகள் நண்பர்கள் — வாழ்க்கைக் காலகட்டங்கள் இணக்கம்"
            : neutral ? "தசாதிபதிகள் சம நிலை — நடுத்தர இணக்கம்"
            : "தசாதிபதிகள் பகை நிலை — காலகட்டங்களில் இழுபறி சாத்தியம்; பரிகாரம்/பொறுமை உதவும்" };
      }
    }
  } catch (_) { /* optional */ }
  return { ...calculate10Porutham(nak1 >= 0 ? nak1 : 0, nak2 >= 0 ? nak2 : 0, rashi1 >= 0 ? rashi1 : 0, rashi2 >= 0 ? rashi2 : 0), bride: h1, groom: h2, brideName: bride.name, groomName: groom.name, dashaCompat };
}

// ═══════════════════════════════════════════════════════════════════
// 12 ராசி பலன் — பிறப்பு விவரம் தேவையில்லை; ராசி (சந்திர ராசி) அடிப்படையில்
// அன்றைய கோசாரம், குரு/சனி பெயர்ச்சி நிலை, பரிகாரம், அதிர்ஷ்ட எண்கள்.
// ═══════════════════════════════════════════════════════════════════
export function computeRasiPalan(rashiIdx, targetDateISO, lat = 13.0827, lon = 80.2707, ayanamsaKey = "lahiri") {
  useZone(null);
  const targetDate = targetDateISO ? new Date(targetDateISO + "T06:00:00") : null;
  const today = getTodayTranist(lat, lon, targetDate, ayanamsaKey);
  const g = calculateGochara(rashiIdx, today.placements);
  const weekday = today.dateObj.getDay();
  const todayNakIdx = NAKSHATRAS.indexOf(today.nakshatra);
  const remedy = getPersonalizedRemedy(rashiIdx, weekday, g.isChandrashtama, today.tithi);
  const sat = today.placements.find((p) => p.ta === "சனி");
  const jup = today.placements.find((p) => p.ta === "குரு");
  const satRashi = sat ? RASHIS.indexOf(sat.rashi) : -1;
  const sadeSati = sat ? calcSadeSati(rashiIdx, satRashi) : null;
  const guruPeyarchi = jup ? calcGuruPeyarchi(rashiIdx, RASHIS.indexOf(jup.rashi)) : null;
  const saniHouse = sat ? ((satRashi - rashiIdx + 12) % 12) + 1 : null;
  const saniTransit = saniHouse ? { houseFromMoon: saniHouse, rashi: sat.rashi, ...(SANI_TRANSIT_EFFECTS[saniHouse] || {}) } : null;
  const pk = todayNakIdx >= 0 ? checkPanchaka(todayNakIdx, weekday) : null;
  return {
    rashi: RASHIS[rashiIdx],
    date: { dateStr: today.dateStr, dayName: today.dayName, dateObj: today.dateObj },
    panchang: { tithi: today.tithi, paksham: today.paksham, nakshatra: today.nakshatra, yogam: today.yogam, karanam: today.karanam, moonRashi: today.moonRashi },
    gochara: {
      overallMood: g.overallMood, isChandrashtama: !!g.isChandrashtama, goodCount: g.goodCount, badCount: g.badCount,
      results: g.results.map((r) => ({ ta: r.ta, symbol: r.symbol, rashi: r.rashi, houseFromMoon: r.houseFromMoon, effect: r.effect, isRetrograde: !!r.isRetrograde })),
    },
    remedy, sadeSati, guruPeyarchi, saniTransit,
    panchaka: pk && pk.active ? pk : null,
    luckyNums: calcDailyLuckyNumbers(rashiIdx, today.tithi, todayNakIdx >= 0 ? todayNakIdx : 0, weekday),
  };
}

// ═══════════════════════════════════════════════════════════════════
// மாத சுப நாட்கள் — ஒவ்வொரு நாளுக்கும் பொது முகூர்த்த மதிப்பு (கிழமை + திதி +
// நட்சத்திரம் + யோகம்). ஜென்ம நட்சத்திரம்/ராசி கொடுத்தால் தாரா பலம், சந்திராஷ்டமம்.
// ═══════════════════════════════════════════════════════════════════
export function computeMonthMuhurta(year, month, lat = 13.0827, lon = 80.2707, birthNakIdx = null, birthMoonRashi = null) {
  useZone(null);
  const days = new Date(year, month + 1, 0).getDate();
  const tamil = tamilDatesForMonth(year, month); // சென்னை வழக்கு — civil தமிழ்த் தேதி
  const out = [];
  for (let d = 1; d <= days; d++) {
    const dt = new Date(year, month, d, 6, 0, 0);
    const m = calcMuhurtha(dt, birthNakIdx, lat, lon);
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const h = generateHoroscope(iso, "06:00", lat, lon, true);
    const moonRashiIdx = RASHIS.indexOf(h.moonRashi);
    const tara = birthNakIdx != null && m.nakIdx >= 0 ? calcTaraBala(birthNakIdx, m.nakIdx) : null;
    const pk = m.nakIdx >= 0 ? checkPanchaka(m.nakIdx, dt.getDay()) : null;
    out.push({
      d, score: m.score, verdict: m.verdict, vaaram: m.vaaram, tithiName: m.tithiName, tithiIdx: m.tithiIdx,
      paksham: m.tithiIdx <= 15 ? "வளர்பிறை" : "தேய்பிறை",
      nakIdx: m.nakIdx, nakshatra: NAKSHATRAS[m.nakIdx] || "", yogam: m.yogam, isYogaBad: !!m.isYogaBad,
      moonRashi: h.moonRashi, tamil: tamil[d - 1] || null,
      tara, chandrashtama: birthMoonRashi != null && moonRashiIdx >= 0 ? (((moonRashiIdx - birthMoonRashi + 12) % 12) + 1) === 8 : false,
      panchaka: pk && pk.active ? pk.name : null,
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════
// மாற்று தசை முறைகள் — யோகினி, அஷ்டோத்தரி (ஜோதிடர்களுக்கு ஒப்பீட்டுக்கு)
// ═══════════════════════════════════════════════════════════════════
export function computeAltDashas(h, birth) {
  useZone(birth);
  const [dY, dM, dD] = birth.dobISO.split("-").map(Number);
  const [dH, dMin] = (birth.time24 || "06:00").split(":").map(Number);
  const moonP = h.placements.find((p) => p.ta === "சந்திரன்");
  const moonLong = moonP ? (moonP.fullLong ?? moonP.rashiIdx * 30 + (moonP.degExact ?? moonP.degree ?? 0)) : 0;
  const birthDate = new Date(dY, dM - 1, dD, Number.isFinite(dH) ? dH : 6, Number.isFinite(dMin) ? dMin : 0);
  const slim = (r) => r && r.dashas ? { system: r.system, dashas: r.dashas.map((d) => ({ name: d.name, planet: d.planet || d.name, years: d.years, startDate: d.startDate, endDate: d.endDate, isCurrent: !!d.isCurrent })) } : null;
  return { yogini: slim(calculateYoginiDasha(moonLong, birthDate)), ashtottari: slim(calculateAshtottariDasha(moonLong, birthDate)) };
}

// ═══════════════════════════════════════════════════════════════════
// ராசி பலன் — வாரம் / மாதம் / ஆண்டு. எழுதிய கட்டுரை அல்ல: அந்தக் காலத்தின் உண்மையான
// கிரக நகர்வை (கோசாரம்) ராசியிலிருந்து எண்ணிக் கணக்கிட்டது.
// ═══════════════════════════════════════════════════════════════════
const istToday = () => { const t = new Date(Date.now() + 5.5 * 3600 * 1000); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() }; };
const isoYMD = (y, m, d) => { const x = new Date(Date.UTC(y, m, d)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`; };
const houseFrom = (rashiIdx, planetRashiIdx) => ((planetRashiIdx - rashiIdx + 12) % 12) + 1;

export function computeRasiPeriod(rashiIdx, period, lat = 13.0827, lon = 80.2707, ayanamsaKey = "lahiri") {
  useZone(null);
  const { y, m, d } = istToday();
  const snap = (iso) => {
    const t = getTodayTranist(lat, lon, new Date(iso + "T06:00:00"), ayanamsaKey);
    const g = calculateGochara(rashiIdx, t.placements);
    return { t, g };
  };
  const planetRow = (r) => ({ ta: r.ta, rashi: r.rashi, house: r.houseFromMoon, effect: r.effect, theme: HOUSE_THEMES[r.houseFromMoon]?.theme || "" });

  if (period === "year") {
    // மெதுவான கிரகங்கள் — ஆண்டு முழுவதும் 2 நாள் இடைவெளியில்; ராசி மாறும் நாளைத் துல்லியமாகத் தேடு
    const SLOW = ["குரு", "சனி", "ராகு", "கேது"];
    const rashiOn = (iso) => { const t = getTodayTranist(lat, lon, new Date(iso + "T06:00:00"), ayanamsaKey); const o = {}; for (const p of t.placements) if (SLOW.includes(p.ta)) o[p.ta] = RASHIS.indexOf(p.rashi); return o; };
    const segs = {}; for (const p of SLOW) segs[p] = [];
    let prev = rashiOn(isoYMD(y, 0, 1));
    for (const p of SLOW) segs[p].push({ rashiIdx: prev[p], from: isoYMD(y, 0, 1) });
    const lastDay = Math.round((Date.UTC(y, 11, 31) - Date.UTC(y, 0, 1)) / 86400000);
    for (let i = 2; i <= lastDay + 1; i += 2) {
      const k = Math.min(i, lastDay);
      const cur = rashiOn(isoYMD(y, 0, 1 + k));
      for (const p of SLOW) {
        if (cur[p] !== prev[p]) {
          // மாற்றம் k-1 அல்லது k நாளில் — முந்தைய நாளைச் சோதி
          const mid = rashiOn(isoYMD(y, 0, k));
          const changeDay = mid[p] !== prev[p] ? k - 1 : k;
          const iso = isoYMD(y, 0, 1 + changeDay);
          segs[p][segs[p].length - 1].to = isoYMD(y, 0, changeDay);
          segs[p].push({ rashiIdx: cur[p], from: iso });
        }
      }
      prev = cur;
    }
    const slow = [];
    for (const p of SLOW) for (const sg of segs[p]) {
      const house = houseFrom(rashiIdx, sg.rashiIdx);
      const table = p === "குரு" ? GURU_TRANSIT_EFFECTS : p === "சனி" ? SANI_TRANSIT_EFFECTS : null;
      const good = table ? table[house]?.effect === "சுபம்" : [3, 6, 11].includes(house);
      slow.push({ ta: p, rashi: RASHIS[sg.rashiIdx], house, from: sg.from, to: sg.to || isoYMD(y, 11, 31), effect: good ? "good" : "bad",
        desc: table ? (table[house]?.desc || "") : "", theme: HOUSE_THEMES[house]?.theme || "",
        sadeSati: p === "சனி" ? calcSadeSati(rashiIdx, sg.rashiIdx) : null });
    }
    slow.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
    return { rashi: RASHIS[rashiIdx], period, year: y, slow };
  }

  // வாரம் (7 நாள்) / மாதம் (30 நாள்) — இன்றிலிருந்து
  const span = period === "month" ? 30 : 7;
  const days = [], ingresses = [];
  let prevRashi = null, first = null;
  for (let i = 0; i < span; i++) {
    const iso = isoYMD(y, m, d + i);
    const { t, g } = snap(iso);
    if (i === 0) first = g;
    const moon = g.results.find((r) => r.ta === "சந்திரன்");
    days.push({ iso, dayName: t.dayName, mood: g.overallMood, chandrashtama: !!g.isChandrashtama, moonRashi: moon?.rashi || "", moonHouse: moon?.houseFromMoon || null });
    const cur = {}; for (const r of g.results) cur[r.ta] = r.rashi;
    if (prevRashi) for (const r of g.results) {
      if (r.ta !== "சந்திரன்" && prevRashi[r.ta] !== r.rashi) ingresses.push({ iso, ...planetRow(r) });
    }
    prevRashi = cur;
  }
  const counts = { good: 0, neutral: 0, caution: 0 };
  for (const x of days) counts[x.mood] = (counts[x.mood] || 0) + 1;
  return {
    rashi: RASHIS[rashiIdx], period, from: days[0].iso, to: days[days.length - 1].iso, days, counts,
    bestDays: days.filter((x) => x.mood === "good" && !x.chandrashtama).map((x) => x.iso),
    chandrashtama: days.filter((x) => x.chandrashtama).map((x) => x.iso),
    planets: first.results.filter((r) => r.ta !== "சந்திரன்").map(planetRow),
    ingresses,
  };
}

// நவகிரக வழிபாட்டுக் குறிப்புகள் — engine-இன் பரிகார அட்டவணை (ரத்தினம், மந்திரம், கோயில், தானம்…)
export function navagrahaReference() {
  return {
    planets: Object.entries(PLANET_REMEDIES).map(([ta, r]) => ({ ta, gem: r.gem, metal: r.metal, mantra: r.mantra, mantraCount: r.mantraCount,
      temple: r.temple, day: r.day, color: r.color, food: r.food, donate: r.donate, flower: r.flower, direction: r.direction })),
    weekdays: [0, 1, 2, 3, 4, 5, 6].map((i) => DAY_REMEDIES[i] || null),
  };
}
