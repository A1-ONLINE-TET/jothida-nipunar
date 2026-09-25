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
} from "../../src/engine.js";

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
  try { R.tamilDate = calcTamilDate(dobISO, finalTime, lat, lon); } catch (_) { R.tamilDate = null; }

  return R;
}
