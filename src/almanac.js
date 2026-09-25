// ═══════════════════════════════════════════════════════════════════
// ALMANAC (client-side) — PUBLIC panchangam/ephemeris + trivial display
// helpers only. These power instant, sync-rendered widgets (home "today"
// strip, the month calendar grid, the live horai clock, the place-search
// box) where a network round-trip per render would ruin the UX.
//
// This is NOT the product's secret sauce. The proprietary INTERPRETIVE
// engine — dasha analysis, deep-analysis, dignity/shadbala, ashtakavarga,
// backtest, event-timing, porutham, nakshatra-bhava — runs ONLY in the
// Cloudflare Worker and is never imported here, so Rollup tree-shakes it
// out of the browser bundle. (Verify: grep the built JS for calcBacktest /
// analyzeKeyLifeAreas → 0 matches.)
// ═══════════════════════════════════════════════════════════════════
export {
  // ephemeris + panchangam for a date (calendar, home strip)
  generateHoroscope, calcMuhurtham, calcInauspiciousTimes, calcTamilDate,
  // live planetary-hour clock
  calcCurrentHorai,
  // trivial display lookups + place search (public data)
  getNakshatraLord, geocodeCity, geocodeCityAsync, searchPlacesOSM,
  resolveBirthGeo, escapeHtml,
  // display constant tables (names / labels / reference data)
  NAKSHATRAS, RASHIS, RASHI_EN, PLANETS, RASHI_LUCKY, AYANAMSA_SYSTEMS,
  GRAHA_FRIENDSHIP, CLASSICAL_7, EVENT_TOPICS,
} from "./engine.js";
