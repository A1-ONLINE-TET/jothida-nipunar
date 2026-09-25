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
} from "../../src/engine.js";

// Vimshottari dasha for this birth (needed by the daily bundle + prompts).
export function computeDasha(h, birth) {
  const [dY, dM, dD] = birth.dobISO.split("-").map(Number);
  const [dH, dMin] = (birth.time24 || "06:00").split(":").map(Number);
  const moonP = h.placements.find((p) => p.ta === "சந்திரன்");
  const moonLong = moonP ? (moonP.fullLong != null ? moonP.fullLong : moonP.rashiIdx * 30 + (moonP.degExact || 0)) : 0;
  return calculateDasha(moonLong, new Date(dY, dM - 1, dD, Number.isFinite(dH) ? dH : 6, Number.isFinite(dMin) ? dMin : 0));
}

// Daily / specific-date bundle — mirrors the client's openDailyScreen assembly.
export function computeDailyBundle(h, dashaData, birth, targetDateISO) {
  const { lat, lon, ayanamsaKey } = birth;
  const targetDate = targetDateISO ? new Date(targetDateISO + "T06:00:00") : null;
  const refDate = targetDate || new Date();
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
  if (swissJson) {
    const h = parseBackendResponse(swissJson);
    if (h && h.placements) return h;
  }
  return generateHoroscope(birth.dobISO, birth.time24, birth.lat, birth.lon, false, birth.ayanamsaKey);
}

export function computeFullReport(h, birth) {
  const placements = h.placements;
  const lagnaIdx = h.lagna;
  const { dobISO, time24: finalTime, lat, lon, ayanamsaKey, gender, name, dob } = birth;
  const geo = { lat, lon };

  // transit chart for "now"
  const now = new Date();
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
    const nowY = new Date().getFullYear();
    let vp = calcVarshaphala(h, dobISO, lat, lon, nowY, ayanamsaKey);
    if (vp && vp.praveshDate > new Date()) vp = calcVarshaphala(h, dobISO, lat, lon, nowY - 1, ayanamsaKey);
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
  R.inauspiciousTimes = calcInauspiciousTimes(new Date(), lat, lon);
  R.muhurthaData = calcMuhurtha(new Date(), birthMoon && birthMoon.nakIdx >= 0 ? birthMoon.nakIdx : 0, lat, lon);

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
  R.dashaSandhi = calcDashaSandhi(dashaR, new Date());
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
  const r = computeFullReport(h, birth);
  const [y, m, d] = eventDateISO.split("-").map(Number);
  return calcBacktest(topic, new Date(y, m - 1, d), reportDeps(r, h, birth));
}

export function computeEventTiming(h, birth, topic) {
  const r = computeFullReport(h, birth);
  return calcEventTiming(topic, reportDeps(r, h, birth));
}

export function computeNakBhava(h, birth) {
  const r = computeFullReport(h, birth);
  return calcNakshatraBhavaLinks(
    h.placements, h.lagna, r.functionalNature, { lat: birth.lat, lon: birth.lon }, birth.ayanamsaKey,
    { dashaData: r.dashaData, unified: r.unifiedStrength, ashtakavarga: r.ashtakavargaData, lagnaFullLong: h.lagnaFullLong }
  );
}

// Marriage matching — mirrors the client's runPorutham (Chennai default geo).
export function computePorutham(bride, groom, ayanamsaKey) {
  const h1 = generateHoroscope(bride.dobISO, bride.time24, 13.0827, 80.2707, false, ayanamsaKey);
  const h2 = generateHoroscope(groom.dobISO, groom.time24, 13.0827, 80.2707, false, ayanamsaKey);
  const nak1 = NAKSHATRAS.indexOf(h1.nakshatra), nak2 = NAKSHATRAS.indexOf(h2.nakshatra);
  const rashi1 = RASHIS.indexOf(h1.moonRashi), rashi2 = RASHIS.indexOf(h2.moonRashi);
  let dashaCompat = null;
  try {
    const moonLong = (hh) => { const mp = hh.placements.find((p) => p.ta === "சந்திரன்"); return mp ? (mp.fullLong ?? mp.rashiIdx * 30 + (mp.degExact || 0)) : null; };
    const bd1 = bride.dobISO.split("-").map(Number), bd2 = groom.dobISO.split("-").map(Number);
    const [bh1, bm1] = bride.time24.split(":").map(Number), [bh2, bm2] = groom.time24.split(":").map(Number);
    const ml1 = moonLong(h1), ml2 = moonLong(h2);
    if (ml1 != null && ml2 != null) {
      const now = new Date();
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
