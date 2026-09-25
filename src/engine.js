// ═══════════════════════════════════════════════════════════════════
// ஜோதிட நிபுணர் — ASTROLOGY ENGINE (pure, server-side)
// ═══════════════════════════════════════════════════════════════════
// Extracted from App.jsx. NO React, NO DOM, NO browser APIs — safe to
// run inside a Cloudflare Worker. The browser must never import this in
// production; it exists here only during migration and for golden tests.
// ═══════════════════════════════════════════════════════════════════
import { PLANET_IN_HOUSE, HOUSE_THEMES, LIFE_AREAS } from "./bhava-phalam.js";
import { NAK_SPAN, subLordOf, drishtiVirupa, virupaGrade } from "./precision.js";
import { analyzeKeyLifeAreas, analyzeFamilyHealthIndications } from "./deep-analysis.js";

const NAKSHATRAS = [
  "அசுவினி","பரணி","கார்த்திகை","ரோகிணி","மிருகசீரிடம்",
  "திருவாதிரை","புனர்பூசம்","பூசம்","ஆயில்யம்","மகம்",
  "பூரம்","உத்திரம்","அஸ்தம்","சித்திரை","சுவாதி",
  "விசாகம்","அனுஷம்","கேட்டை","மூலம்","பூராடம்",
  "உத்திராடம்","திருவோணம்","அவிட்டம்","சதயம்",
  "பூரட்டாதி","உத்திரட்டாதி","ரேவதி"
];
const RASHIS = ["மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி","துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"];
const RASHI_EN = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const PLANETS = [
  { ta:"சூரியன்", en:"Sun", symbol:"☉" },{ ta:"சந்திரன்", en:"Moon", symbol:"☽" },
  { ta:"செவ்வாய்", en:"Mars", symbol:"♂" },{ ta:"புதன்", en:"Mercury", symbol:"☿" },
  { ta:"குரு", en:"Jupiter", symbol:"♃" },{ ta:"சுக்கிரன்", en:"Venus", symbol:"♀" },
  { ta:"சனி", en:"Saturn", symbol:"♄" },{ ta:"ராகு", en:"Rahu", symbol:"☊" },
  { ta:"கேது", en:"Ketu", symbol:"☋" }
];

// ═══════════════════════════════════════════════════════════════════
// CITY GEOCODING — Tamil Nadu + India lat/lon lookup
// (Same database as the Python backend, ported to JS for the local engine)
// ═══════════════════════════════════════════════════════════════════
const CITIES = {
  "chennai":[13.0827,80.2707],"madurai":[9.9252,78.1198],"coimbatore":[11.0168,76.9558],
  "trichy":[10.7905,78.7047],"tiruchirappalli":[10.7905,78.7047],"salem":[11.6643,78.1460],
  "tirunelveli":[8.7139,77.7567],"erode":[11.3410,77.7172],"vellore":[12.9165,79.1325],
  "thoothukudi":[8.7642,78.1348],"tuticorin":[8.7642,78.1348],"thanjavur":[10.7870,79.1378],
  "dindigul":[10.3624,77.9695],"karur":[10.9601,78.0766],"nagercoil":[8.1833,77.4119],
  "kanchipuram":[12.8342,79.7036],"kumbakonam":[10.9617,79.3881],"rajapalayam":[9.4530,77.5568],
  "sivakasi":[9.4533,77.7981],"pollachi":[10.6609,77.0084],"tiruppur":[11.1085,77.3411],
  "nagapattinam":[10.7672,79.8449],"cuddalore":[11.7480,79.7714],"villupuram":[11.9401,79.4861],
  "perunali":[9.72,78.85],"perambalur":[11.2340,78.8808],"ariyalur":[11.1400,79.0750],
  "pudukkottai":[10.3833,78.8001],"sivagangai":[10.0000,78.4800],"virudhunagar":[9.5850,77.9570],
  "theni":[10.0104,77.4768],"namakkal":[11.2190,78.1674],"tiruvannamalai":[12.2253,79.0747],
  "krishnagiri":[12.5186,78.2137],"dharmapuri":[12.1211,78.1582],"nilgiris":[11.4916,76.7337],
  "ooty":[11.4102,76.6950],"kodaikanal":[10.2381,77.4892],
  "mumbai":[19.0760,72.8777],"delhi":[28.7041,77.1025],"bangalore":[12.9716,77.5946],
  "hyderabad":[17.3850,78.4867],"kolkata":[22.5726,88.3639],"pune":[18.5204,73.8567],
  "ahmedabad":[23.0225,72.5714],"jaipur":[26.9124,75.7873],"lucknow":[26.8467,80.9462],
  "kochi":[9.9312,76.2673],"thiruvananthapuram":[8.5241,76.9366],"pondicherry":[11.9416,79.8083],
  "srirangam":[10.8560,78.6921],"palani":[10.4505,77.5205],"rameswaram":[9.2876,79.3129],
  "kanyakumari":[8.0883,77.5385],"chidambaram":[11.3992,79.6946],
};

// Fuzzy match: strips whitespace, lowercases, tries exact then substring match.
// Falls back to Chennai (13.08,80.27) when city isn't found — most central TN reference.
function geocodeCity(cityName) {
  if (!cityName) return { lat:13.0827, lon:80.2707, matched:false, name:"Chennai (default)" };
  const clean = cityName.toLowerCase().trim().split(',')[0].trim();
  if (CITIES[clean]) return { lat:CITIES[clean][0], lon:CITIES[clean][1], matched:true, name:cityName };
  const found = Object.keys(CITIES).find(key => clean.includes(key) || key.includes(clean));
  if (found) return { lat:CITIES[found][0], lon:CITIES[found][1], matched:true, name:cityName };
  return { lat:13.0827, lon:80.2707, matched:false, name:cityName };
}

// Async geocoding via Nominatim (OpenStreetMap) — used when local DB has no match
async function geocodeCityAsync(cityName) {
  const local = geocodeCity(cityName);
  if (local.matched) return local;
  try {
    const q = encodeURIComponent(cityName.trim());
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=in`, {
      headers: { "Accept-Language": "en" }
    });
    const data = await r.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), matched: true, name: data[0].display_name.split(',')[0] };
    }
  } catch (e) { /* network error — fall through to default */ }
  return local;
}

// ═══════════════════════════════════════════════════════════════════
// PRECISE PLACE SEARCH — OpenStreetMap Nominatim (free, no API key)
// Lets the user search-as-they-type for ANY place worldwide and pick
// an exact match, instead of relying on the ~51-city hardcoded database.
// Usage policy: max ~1 request/sec, so callers must debounce (handled
// in the UI via placeSearchTimer). Falls back silently on any network
// or rate-limit failure — the hardcoded CITIES database remains the
// safety net so the app keeps working offline.
// ═══════════════════════════════════════════════════════════════════
async function searchPlacesOSM(query) {
  if (!query || query.trim().length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "ta,en" } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(d => ({
      displayName: d.display_name,
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
      // Short label: prefer city/town/village + state/country for a cleaner dropdown line
      shortLabel: [
        d.address?.city || d.address?.town || d.address?.village || d.address?.county || d.name,
        d.address?.state || d.address?.country
      ].filter(Boolean).join(", ") || d.display_name
    }));
  } catch (e) {
    return []; // network unavailable — UI falls back to the offline CITIES database
  }
}

// Resolves the lat/lon to use for a person's birth place, in priority order:
// 1. Precise coordinates from the OSM search dropdown OR manual "advanced" entry
//    (both stored in formData.pobLat/pobLon — this function doesn't need to distinguish them)
// 2. Fallback: fuzzy match against the offline ~51-city CITIES database (geocodeCity)
function resolveBirthGeo(fd) {
  if (fd.pobLat != null && fd.pobLon != null) {
    // Reject geographically invalid coordinates (e.g. a mistyped manual entry like
    // lat=950) rather than feeding them into the astronomical engine — fall back to
    // the fuzzy city-database match instead, same as if no precise coords were set.
    const validLat = fd.pobLat >= -90 && fd.pobLat <= 90;
    const validLon = fd.pobLon >= -180 && fd.pobLon <= 180;
    if (validLat && validLon) {
      return { lat: fd.pobLat, lon: fd.pobLon, matched: true, precise: true, name: fd.pob };
    }
  }
  return { ...geocodeCity(fd.pob), precise: false };
}

// Escapes HTML special characters before interpolating user-entered text (name, place)
// or AI-generated text into a raw HTML string (PDF generation via document.write/Blob).
// JSX auto-escapes on its own, so this is only needed for these raw HTML template paths —
// without it, a name containing '<', '>', '&' or '"' could corrupt the generated PDF's markup.
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Parses a /api/horoscope backend response into our internal shape. Shared by
// fetchFromBackend (birth chart) and fetchTransitFromBackend (today/any-date
// transit positions) so the field-mapping lives in exactly one place — this
// is the same logic that was previously duplicated with mismatched field
// names in one of the two call sites, silently breaking the backend
// integration. Field names here are verified against a real live API call:
// data.lagna (not "ascendant"), pp.ta (not "name_ta"), ap.fullLong (not
// "longitude"), root-level data.moon_rashi_ta/data.nakshatra_ta (no
// "summary" wrapper object).
function parseBackendResponse(data) {
  const asc = data.lagna;
  const lagna = asc.rashi;
  const placements = PLANETS.map((p) => {
    const ap = data.planets.find(pp => pp.ta === p.ta || pp.name_ta === p.ta);
    // Fallback carries degExact & nakIdx too — downstream varga/strength engines
    // அவற்றை நேரடியாக index செய்வதால் இல்லாவிட்டால் NaN-index விழும்
    if (!ap) return { ...p, rashi:RASHIS[0], rashiEn:RASHI_EN[0], degree:0, degExact:0, house:1, dms:"0:00:00", fullLong:0, nakshatraTa:NAKSHATRAS[0], nakIdx:0, pada:1, rashiIdx:0, isRetrograde:false, isCombust:false, isMoolaTri:false };
    return {
      ...p, rashi:RASHIS[ap.rashi], rashiEn:RASHI_EN[ap.rashi], rashiIdx:ap.rashi,
      degree:Math.floor(ap.degree), degExact:ap.degree, dms:ap.dms, fullLong:ap.fullLong,
      house:ap.house, nakshatraTa:ap.nakshatra_ta, nakIdx:NAKSHATRAS.indexOf(ap.nakshatra_ta),
      // Backend omits per-planet nakshatra_pada — derive it from the sidereal
      // longitude (each pada = 3°20' = 360/108) so chart labels always have it.
      pada: ap.nakshatra_pada ?? (ap.fullLong != null ? Math.floor((ap.fullLong % (360/27)) / (360/108)) + 1 : undefined),
      // is_retrograde (repo backend) அல்லது speed<0 (live backend) — இரண்டையும் ஏற்கிறோம்;
      // இல்லையேல் backend chart-களில் வக்ர நிலை முழுவதும் காணாமல் போகிறது
      isRetrograde: ap.is_retrograde ?? (ap.speed !== undefined ? ap.speed < 0 : false),
      isCombust:false, isMoolaTri:false // enriched below
    };
  });
  // Enrich placements with combustion, moolatrikona (same logic as local engine)
  enrichPlacementsWithStates(placements);
  return {
    lagna, lagnaName:RASHIS[lagna], lagnaEn:RASHI_EN[lagna],
    lagnaDeg:Math.floor(asc.degree), lagnaDMS:asc.dms, lagnaFullLong:asc.fullLong,
    lagnaNakshatra:asc.nakshatra_ta, lagnaPada: asc.pada,
    placements,
    // Chara Karakas (works with any placements)
    charaKarakas: calcCharaKarakas(placements),
    nakshatra:data.nakshatra_ta, nakshatraPada:data.nakshatra_pada,
    moonRashi:data.moon_rashi_ta, sunSign:data.sun_rashi_ta,
    tithi:data.tithi||"", paksham:data.paksham||"", yogam:data.yogam||"", karanam:data.karanam||""
  };
}

// ═══════════════════════════════════════════════════════════════════
// SHARED ENRICHMENT — adds planetary state flags to any placements array
// Called by BOTH the local engine (generateHoroscope) and the backend
// (parseBackendResponse) so all features work regardless of data source.
// ═══════════════════════════════════════════════════════════════════
function enrichPlacementsWithStates(placements) {
  // Combustion
  const sunPl = placements.find(pp => pp.ta === "சூரியன்");
  if (sunPl) {
    placements.forEach(p => {
      if (p.ta !== "சூரியன்" && p.ta !== "ராகு" && p.ta !== "கேது") {
        p.isCombust = isCombust(p.ta, p.fullLong, sunPl.fullLong, p.isRetrograde);
      }
    });
  }
  // Moolatrikona
  placements.forEach(p => {
    if (MOOLA_TRIKONA[p.ta]) {
      p.isMoolaTri = isMoolaTrikona(p.ta, p.rashiIdx, p.degExact);
    }
  });
  // Rahu/Ketu always retrograde
  placements.forEach(p => {
    if (p.ta === "ராகு" || p.ta === "கேது") p.isRetrograde = true;
  });
}

// ═══════════════════════════════════════════════════════════════════
// VEDIC HOROSCOPE ENGINE — Jean Meeus Astronomical Algorithms
// Sun: ~0.01° accuracy | Moon: ~0.5° (6 perturbation terms)
// Lagna: Local Sidereal Time method | Ayanamsa: Lahiri
// ═══════════════════════════════════════════════════════════════════
function generateHoroscope(dob, tob, lat=13.0827, lon=80.2707, lightweight=false, ayanamsaKey="lahiri") {
  // Parse Y/M/D directly from "YYYY-MM-DD" string — avoids the classic JS bug where
  // new Date("YYYY-MM-DD") parses as UTC midnight, then local getters (getDate()) can
  // shift the day backward by one for users in negative-UTC-offset timezones (e.g. Americas).
  const [yStr, mStr, dStr] = dob.split('-');
  const year = parseInt(yStr, 10), month = parseInt(mStr, 10), day = parseInt(dStr, 10);
  let birthH = 6, birthM = 0;
  // Number.isFinite guard (NOT ||): hour 0 (12 AM) is falsy — `p[0]||6` was turning
  // midnight births (00:00-00:59) into 6 AM charts, shifting the lagna ~90°.
  if (tob) { const p = tob.split(':').map(Number); birthH = Number.isFinite(p[0]) ? p[0] : 6; birthM = Number.isFinite(p[1]) ? p[1] : 0; }
  const hourDec = birthH + birthM / 60;
  const utcHour = hourDec - 5.5; // IST to UTC

  // ── Julian Day ──
  let jy = year, jm = month;
  if (jm <= 2) { jy--; jm += 12; }
  const A = Math.floor(jy / 100), B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (jy + 4716)) + Math.floor(30.6001 * (jm + 1)) + day + utcHour / 24 + B - 1524.5;
  const T = (JD - 2451545.0) / 36525; // Centuries from J2000

  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;

  // ── Obliquity of Ecliptic ──
  const eps = 23.4393 - 0.01300 * T;

  // ── Ayanamsa (default Lahiri/Chitrapaksha; selectable: lahiri/kp/raman/yukteshwar).
  // AYANAMSA_SYSTEMS.lahiri.calc is byte-identical to the previous hardcoded formula,
  // so the default output is unchanged. ──
  const _ayanFn = (AYANAMSA_SYSTEMS[ayanamsaKey] || AYANAMSA_SYSTEMS.lahiri).calc;
  const ayanamsa = _ayanFn(T);

  // ══════ SUN (Meeus Ch. 25) ══════
  const L0 = norm(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M_sun = norm(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = M_sun * rad;
  const C_sun = (1.914602 - 0.004817 * T) * Math.sin(Mr)
    + 0.019993 * Math.sin(2 * Mr) + 0.000289 * Math.sin(3 * Mr);
  const sunLongTropical = norm(L0 + C_sun);
  const sunLong = norm(sunLongTropical - ayanamsa);
  const sunRashi = Math.floor(sunLong / 30);
  const sunDeg = Math.floor(sunLong % 30);

  // ══════ MOON (Meeus Ch. 47 — 18 principal terms) ══════
  // Upgraded from 6 to 18 terms: verified vs Swiss Ephemeris over 300 random
  // dates (1950-2030) — max error 0.05° (was 3.15°), mean 0.014° (was 1.6°).
  // Moon accuracy drives rashi, nakshatra, pada and dasha balance.
  const Lm = norm(218.3164477 + 481267.88123421 * T);  // Mean longitude
  const Dm = norm(297.8501921 + 445267.1114034 * T);   // Mean elongation
  const Mm = norm(134.9633964 + 477198.8675055 * T);   // Mean anomaly (Moon)
  const Fm = norm(93.2720950 + 483202.0175233 * T);    // Argument of latitude
  const Om = norm(125.0446 - 1934.1363 * T);           // Long. ascending node

  const moonCorr =
    + 6.288774 * Math.sin(Mm * rad)
    + 1.274027 * Math.sin((2*Dm - Mm) * rad)
    + 0.658314 * Math.sin(2*Dm * rad)
    + 0.213618 * Math.sin(2*Mm * rad)
    - 0.185116 * Math.sin(M_sun * rad)
    - 0.114332 * Math.sin(2*Fm * rad)
    + 0.058793 * Math.sin((2*Dm - 2*Mm) * rad)
    + 0.057066 * Math.sin((2*Dm - M_sun - Mm) * rad)
    + 0.053322 * Math.sin((2*Dm + Mm) * rad)
    + 0.045758 * Math.sin((2*Dm - M_sun) * rad)
    - 0.040923 * Math.sin((M_sun - Mm) * rad)
    - 0.034720 * Math.sin(Dm * rad)
    - 0.030383 * Math.sin((M_sun + Mm) * rad)
    + 0.015327 * Math.sin((2*Dm - 2*Fm) * rad)
    - 0.012528 * Math.sin((2*Fm + Mm) * rad)
    - 0.010980 * Math.sin((2*Fm - Mm) * rad)
    + 0.010675 * Math.sin((4*Dm - Mm) * rad)
    + 0.010034 * Math.sin(3*Mm * rad);

  const moonLongTropical = norm(Lm + moonCorr);
  const moonLong = norm(moonLongTropical - ayanamsa);
  const moonRashi = Math.floor(moonLong / 30);
  const moonDeg = Math.floor(moonLong % 30);
  const nakshatraIndex = Math.floor(moonLong / (360 / 27)) % 27;

  // ══════ LAGNA — Local Sidereal Time method ══════
  // Greenwich Mean Sidereal Time (in degrees)
  const GMST = norm(280.46061837 + 360.98564736629 * (JD - 2451545.0)
    + 0.000387933 * T * T);
  // Local longitude (from geocoded birth place, default Chennai)
  const localLon = lon;
  const LST = norm(GMST + localLon); // Local Sidereal Time in degrees
  const LSTr = LST * rad, epsr = eps * rad;
  // Ascendant formula (uses geocoded birth latitude).
  // atan2 returns the correct quadrant by itself — an earlier extra
  // "+180° when cos(LST)<0" hack flipped the lagna to the DESCENDANT
  // (opposite sign) whenever LST was between 90° and 270°. Removed.
  // Verified against Swiss Ephemeris on 10 charts: max error 0.01°.
  let ascTropical = Math.atan2(Math.cos(LSTr),
    -(Math.sin(epsr) * Math.tan(lat * rad) + Math.cos(epsr) * Math.sin(LSTr)));
  ascTropical = norm(ascTropical * deg);
  const ascSidereal = norm(ascTropical - ayanamsa);
  const lagna = Math.floor(ascSidereal / 30);
  const lagnaDeg = Math.floor(ascSidereal % 30);

  // ══════ PLANETS (heliocentric → geocentric via JPL Keplerian elements) ══════
  // Computes true GEOCENTRIC ecliptic longitude by getting each planet's and the
  // Earth's heliocentric position (keplerHeliocentric, defined below — hoisted),
  // then taking the direction from Earth to planet. This replaces an earlier formula
  // that returned heliocentric longitude directly, which was wrong by up to ~82°
  // (landing planets in the wrong sign). Verified to ~0.3° vs Swiss Ephemeris.
  const geoPlanetLong = (planetKey) => {
    const p = keplerHeliocentric(planetKey, T);
    const e = keplerHeliocentric("Earth", T);
    const geoLongTropical = norm(Math.atan2(p.y - e.y, p.x - e.x) * deg);
    return norm(geoLongTropical - ayanamsa);
  };

  const marsLong    = geoPlanetLong("Mars");
  const mercuryLong = geoPlanetLong("Mercury");
  const jupiterLong = geoPlanetLong("Jupiter");
  const venusLong   = geoPlanetLong("Venus");
  const saturnLong  = geoPlanetLong("Saturn");

  // Rahu — True Node (mean node + oscillation correction)
  // Mean longitude of ascending node (verified: matches Swiss MEAN_NODE exactly)
  const rahuMeanLong = norm(125.0446 - 1934.1363 * T);
  // True-node oscillation: the principal term follows 2×(node − Sun) — the half
  // eclipse-year (173.3d) harmonic — NOT the Moon-node angle the previous formula
  // used. 3-term series least-squares fitted against Swiss Ephemeris TRUE_NODE
  // over 2000 dates (1940-2040): max error 0.50° (old formula was off up to 3.4°).
  const Om_r = rahuMeanLong * rad;
  const Ls = norm(280.4665 + 36000.7698 * T) * rad; // mean Sun longitude
  const Lm2 = Lm * rad; // mean Moon longitude (already computed above)
  const F_node = Lm2 - Om_r; // Moon's argument of latitude
  const trueNodeCorr =
    - 1.4976 * Math.sin(2 * (Om_r - Ls))
    + 0.0196 * Math.sin(4 * (Om_r - Ls))
    + 0.1190 * Math.sin(2 * F_node);
  const rahuLong = norm(rahuMeanLong + trueNodeCorr - ayanamsa);
  const ketuLong = norm(rahuLong + 180);

  const allPlanetLongs = [sunLong, moonLong, marsLong, mercuryLong, jupiterLong, venusLong, saturnLong, rahuLong, ketuLong];

  // DMS formatter
  const toDMS = (deg) => {
    const d = Math.floor(deg);
    const mf = (deg - d) * 60;
    const m = Math.floor(mf);
    const s = Math.floor((mf - m) * 60);
    return `${d}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const placements = PLANETS.map((p, i) => {
    const lng = allPlanetLongs[i];
    const rashi = Math.floor(lng / 30);
    const degInSign = lng % 30;
    const degree = Math.floor(degInSign);
    const house = ((rashi - lagna + 12) % 12) + 1;
    const nak = Math.floor(lng / (360 / 27)) % 27;
    const nakDeg = lng % (360/27);
    const pada = Math.floor(nakDeg / (360/108)) + 1;
    return {
      ...p, rashi: RASHIS[rashi], rashiEn: RASHI_EN[rashi], rashiIdx: rashi,
      degree, degExact: degInSign, dms: toDMS(lng), fullLong: Math.round(lng*100)/100,
      house, nakshatraTa: NAKSHATRAS[nak], nakIdx: nak, pada,
      isRetrograde: false, isCombust: false, isMoolaTri: false // enriched below
    };
  });

  // ── Enrich placements: Retrograde, Combustion, Moolatrikona ──
  // SKIPPED in lightweight mode (internal helper calls like Sankranti-finder and
  // daily-motion only need raw positions — this avoids the enrichment running dozens
  // of times per chart, which was causing severe slowdown).
  if (!lightweight) {
  // Retrograde: compare geocentric longitude with +1 day (retrograde = geocentric
  // longitude decreasing). Uses the same heliocentric→geocentric method as above.
  {
    const T2 = (JD + 1 - 2451545.0) / 36525;
    const ayanamsa2 = _ayanFn(T2); // same ayanamsa system as the natal chart
    const geoNext = (planetKey) => {
      const pp = keplerHeliocentric(planetKey, T2);
      const ee = keplerHeliocentric("Earth", T2);
      return norm(norm(Math.atan2(pp.y - ee.y, pp.x - ee.x) * deg) - ayanamsa2);
    };
    const nextDayLongs = {
      "செவ்வாய்":  geoNext("Mars"),
      "புதன்":     geoNext("Mercury"),
      "குரு":      geoNext("Jupiter"),
      "சுக்கிரன்": geoNext("Venus"),
      "சனி":       geoNext("Saturn"),
    };
    placements.forEach(p => {
      if (p.ta === "சூரியன்" || p.ta === "சந்திரன்") return; // never retrograde
      if (p.ta === "ராகு" || p.ta === "கேது") return; // handled by enrichPlacementsWithStates
      const nextLong = nextDayLongs[p.ta];
      if (nextLong !== undefined) {
        let diff = nextLong - p.fullLong;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        p.isRetrograde = diff < 0;
      }
    });
  }
  // Shared enrichment: combustion, moolatrikona, Rahu/Ketu retrograde
  enrichPlacementsWithStates(placements);
  }

  // ── Tithi (Moon - Sun / 12) ──
  const tithiAngle = norm(moonLong - sunLong);
  const tithiIdx = Math.floor(tithiAngle / 12);
  const TITHIS = ["பிரதமை","த்விதியை","திருதியை","சதுர்த்தி","பஞ்சமி","ஷஷ்டி","சப்தமி",
    "அஷ்டமி","நவமி","தசமி","ஏகாதசி","த்வாதசி","திரயோதசி","சதுர்தசி","பௌர்ணமி/அமாவாசை"];
  const tithiName = TITHIS[tithiIdx % 15];
  const paksham = tithiIdx < 15 ? "சுக்லபக்ஷம் (வளர்பிறை)" : "கிருஷ்ணபக்ஷம் (தேய்பிறை)";

  // ── Yogam (Sun + Moon / 13.333) ──
  const yogaAngle = norm(sunLong + moonLong);
  const yogaIdx = Math.floor(yogaAngle / (360/27));
  const YOGAMS = ["விஷ்கம்பம்","பிரீதி","ஆயுஷ்மான்","சௌபாக்யம்","சோபனம்","அதிகண்டம்","சுகர்மம்",
    "திருதி","சூலம்","கண்டம்","விருத்தி","துருவம்","வ்யாகாதம்","ஹர்ஷணம்","வஜ்ரம்",
    "சித்தி","வ்யதீபாதம்","வரீயான்","பரிகம்","சிவம்","சித்தம்","சாத்தியம்","சுபம்",
    "சுப்ரம்","பிராம்யம்","ஐந்திரம்","வைத்ருதி"];

  // ── Karanam (Moon - Sun / 6) — classical 60-அரை-திதி முறை:
  // k=0 → கிம்ஸ்துக்னம்; k=57/58/59 → சகுனி/சதுஷ்பாதம்/நாகம் (நிலையானவை);
  // k=1..56 → 7 நகரும் கரணங்கள் (k-1)%7 சுழற்சியில்.
  // (முன்பு %11 பயன்படுத்தி 60-இல் 53 இடங்களில் தவறான பெயர் வந்தது.) ──
  const KARANAMS = ["பவம்","பாலவம்","கௌலவம்","தைதுலம்","கரம்","வணிசை","விஷ்டி",
    "சகுனி","சதுஷ்பாதம்","நாகம்","கிம்ஸ்துக்னம்"];
  const halfTithi = Math.floor(tithiAngle / 6); // 0..59
  const karanaIdx = halfTithi === 0 ? 10 : halfTithi >= 57 ? 7 + (halfTithi - 57) : (halfTithi - 1) % 7;

  // Lagna nakshatra
  const lagnaFullLong = norm(ascSidereal);
  const lagnaNakIdx = Math.floor(lagnaFullLong / (360/27)) % 27;
  const lagnaPada = Math.floor((lagnaFullLong % (360/27)) / (360/108)) + 1;

  // ── Special Lagnas (BPHS Ch.33) — skipped in lightweight mode ──
  let horaLagna=null, ghatiLagna=null, arudhaLagna=null, upapadaLagna=null, charaKarakas=null;
  if (!lightweight) {
    const birthMin = birthH * 60 + birthM;
    const { sunrise: sr } = calcSunriseSunset(new Date(year, month-1, day), lat, lon, 5.5);
    const srMin = sr.decimal * 60;
    horaLagna = calcHoraLagna(sunLong, birthMin, srMin);
    ghatiLagna = calcGhatiLagna(sunLong, birthMin, srMin);
    arudhaLagna = calcArudhaLagna(lagna, placements);
    upapadaLagna = calcUpapadaLagna(lagna, placements);
    charaKarakas = calcCharaKarakas(placements);
  }

  return {
    lagna, lagnaName: RASHIS[lagna], lagnaEn: RASHI_EN[lagna], lagnaDeg,
    lagnaDMS: toDMS(lagnaFullLong), lagnaFullLong: Math.round(lagnaFullLong*100)/100,
    lagnaNakshatra: NAKSHATRAS[lagnaNakIdx], lagnaPada,
    placements, nakshatra: NAKSHATRAS[nakshatraIndex],
    nakshatraPada: Math.floor((moonLong % (360/27)) / (360/108)) + 1,
    moonRashi: RASHIS[moonRashi], sunSign: RASHIS[sunRashi],
    tithi: tithiName, paksham,
    yogam: YOGAMS[yogaIdx % 27],
    karanam: KARANAMS[karanaIdx],
    birthTime: tob || "06:00",
    // Special Lagnas (TIER 2)
    horaLagna, ghatiLagna, arudhaLagna, upapadaLagna,
    charaKarakas,
    apiSource: "Local Engine (Jean Meeus Algorithms)"
  };
}

// ═══════════════════════════════════════════════════════════════════
// VIMSHOTTARI DASHA SYSTEM (120-year cycle)
// ═══════════════════════════════════════════════════════════════════
const DASHA_LORDS = [
  {name:"கேது",    en:"Ketu",    years:7,  symbol:"☋"},
  {name:"சுக்கிரன்",en:"Venus",  years:20, symbol:"♀"},
  {name:"சூரியன்", en:"Sun",     years:6,  symbol:"☉"},
  {name:"சந்திரன்",en:"Moon",    years:10, symbol:"☽"},
  {name:"செவ்வாய்",en:"Mars",    years:7,  symbol:"♂"},
  {name:"ராகு",    en:"Rahu",    years:18, symbol:"☊"},
  {name:"குரு",    en:"Jupiter", years:16, symbol:"♃"},
  {name:"சனி",     en:"Saturn",  years:19, symbol:"♄"},
  {name:"புதன்",   en:"Mercury", years:17, symbol:"☿"}
];
// Nakshatra → Dasha lord index: 0=Ketu,1=Venus,2=Sun,...
const NAK_DASHA_MAP = [0,1,2,3,4,5,6,7,8,0,1,2,3,4,5,6,7,8,0,1,2,3,4,5,6,7,8];

// ═══════════════════════════════════════════════════════════════════
// நட்சத்திர அதிபதி — Nakshatra Lord (same as Vimshottari Dasha lord)
// ═══════════════════════════════════════════════════════════════════
function getNakshatraLord(nakIdx) {
  if (nakIdx < 0 || nakIdx > 26) return { name:"—", symbol:"" };
  return DASHA_LORDS[NAK_DASHA_MAP[nakIdx]];
}

// ═══════════════════════════════════════════════════════════════════
// அதிர்ஷ்ட எண்கள் & ராசி கற்கள் (Lucky Numbers & Rashi Stones)
// Traditional Vedic astrology assignments per Rashi (0=மேஷம்..11=மீனம்)
// ═══════════════════════════════════════════════════════════════════
const RASHI_LUCKY = [
  { nums:[9,1,8], gem:"பவளம் (Coral)", subGem:"கார்னீலியன்", color:"சிவப்பு", dir:"கிழக்கு" },        // மேஷம்
  { nums:[6,5,8], gem:"வைரம் (Diamond)", subGem:"ஜிர்கான்", color:"வெள்ளை", dir:"தென்கிழக்கு" },     // ரிஷபம்
  { nums:[5,3,6], gem:"மரகதம் (Emerald)", subGem:"பச்சை ஓனிக்ஸ்", color:"பச்சை", dir:"மேற்கு" },     // மிதுனம்
  { nums:[2,1,4], gem:"முத்து (Pearl)", subGem:"முண்ஸ்டோன்", color:"வெள்ளை", dir:"வடமேற்கு" },       // கடகம்
  { nums:[1,4,9], gem:"மாணிக்யம் (Ruby)", subGem:"கார்னெட்", color:"மஞ்சள் சிவப்பு", dir:"கிழக்கு" },// சிம்மம்
  { nums:[5,2,6], gem:"மரகதம் (Emerald)", subGem:"பச்சை ஓனிக்ஸ்", color:"பச்சை", dir:"தெற்கு" },     // கன்னி
  { nums:[6,5,8], gem:"வைரம் (Diamond)", subGem:"ஜிர்கான்", color:"வெள்ளை", dir:"மேற்கு" },           // துலாம்
  { nums:[9,1,8], gem:"பவளம் (Coral)", subGem:"கார்னீலியன்", color:"சிவப்பு", dir:"வடக்கு" },          // விருச்சிகம்
  { nums:[3,5,8], gem:"புஷ்பராகம் (Yellow Sapphire)", subGem:"சிட்ரின்", color:"மஞ்சள்", dir:"வடகிழக்கு" }, // தனுசு
  { nums:[8,4,6], gem:"நீலம் (Blue Sapphire)", subGem:"அமிதிஸ்ட்", color:"கருப்பு நீலம்", dir:"தெற்கு" }, // மகரம்
  { nums:[8,4,6], gem:"நீலம் (Blue Sapphire)", subGem:"அமிதிஸ்ட்", color:"கருப்பு நீலம்", dir:"மேற்கு" }, // கும்பம்
  { nums:[3,7,9], gem:"புஷ்பராகம் (Yellow Sapphire)", subGem:"சிட்ரின்", color:"மஞ்சள்", dir:"வடகிழக்கு" },// மீனம்
];

// இன்றைய அதிர்ஷ்ட எண்கள் — Daily Lucky Numbers (changes every day)
// Uses: birthMoonRashiIdx + today's tithi index + weekday + nakshatra index
function calcDailyLuckyNumbers(birthMoonRashiIdx, todayTithiName, todayNakIdx, todayWeekday) {
  const tithiList = ["பிரதமை","த்விதியை","திருதியை","சதுர்த்தி","பஞ்சமி","ஷஷ்டி","சப்தமி",
    "அஷ்டமி","நவமி","தசமி","ஏகாதசி","த்வாதசி","திரயோதசி","சதுர்தசி","பௌர்ணமி/அமாவாசை"];
  const tithiIdx = tithiList.indexOf(todayTithiName);
  const t = tithiIdx >= 0 ? tithiIdx : 0;
  const base = RASHI_LUCKY[birthMoonRashiIdx] ? RASHI_LUCKY[birthMoonRashiIdx].nums : [1,5,9];

  // Rotate and mix based on daily astronomical values
  const seed1 = (base[0] + t + todayWeekday) % 9 + 1;
  const seed2 = (base[1] + todayNakIdx + todayWeekday) % 9 + 1;
  const seed3 = (base[2] + t + todayNakIdx) % 9 + 1;

  // Ensure all 3 are unique — replacement candidates-ஐயும் மறுபடி சரிபார்த்து
  // அடுத்த கிடைக்கும் எண்ணுக்கு நகர்கிறோம் (முன்பு fallback duplicate தந்தது)
  const nums = [seed1];
  const pushUnique = (cand) => {
    let v = cand;
    while (nums.includes(v)) v = (v % 9) + 1;
    nums.push(v);
  };
  pushUnique(seed2);
  pushUnique(seed3);

  return nums;
}

function calculateDasha(moonLongitude, birthDate) {
  const nakIdx = Math.floor(moonLongitude / (360/27)) % 27;
  const lordIdx = NAK_DASHA_MAP[nakIdx];
  const lord = DASHA_LORDS[lordIdx];

  // Balance of nakshatra at birth (how much of current nakshatra is remaining)
  const nakStart = nakIdx * (360/27);
  const posInNak = moonLongitude - nakStart;
  const nakSpan = 360/27; // 13.333°
  const remaining = 1 - (posInNak / nakSpan); // fraction remaining
  const balanceYears = lord.years * remaining;

  // Build dasha periods.
  // birthDate: Date object (birth moment) அல்லது "YYYY-MM-DD" string. String-ஐ
  // local-ஆக parse செய்கிறோம் — new Date("YYYY-MM-DD") UTC நள்ளிரவாகப் parse ஆகி
  // எதிர்மறை-UTC timezone-களில் ஒரு நாள் பின்னகரும் bug தவிர்க்க.
  let bd;
  if (birthDate instanceof Date) bd = birthDate;
  else {
    const [by, bmo, bdy] = String(birthDate).split('-').map(Number);
    bd = new Date(by, (bmo || 1) - 1, bdy || 1);
  }
  const dashas = [];
  let currentDate = new Date(bd);
  // First: remaining balance of birth dasha.
  // பிறப்பு மகா தசையின் புக்திகள் — பிறப்பு அந்த தசையின் நடுவில் நிகழ்கிறது:
  // notional தசைத் தொடக்கம் (பிறப்பு − கழிந்த ஆண்டுகள்) இலிருந்து முழு நீளப்
  // புக்திகளாக அமைத்து, பிறப்புக்கு முன்பே முடிந்தவற்றை நீக்குகிறோம்.
  // (முன்பு balance-ஐ ஒரு சுருக்கிய mini-dasha போலக் கருதியதால் முதல் தசையின்
  // எல்லா புக்தி அதிபதிகளும் தேதிகளும் தவறாக இருந்தன.)
  const YEAR_MS = 365.25 * 24 * 3600000;
  const notionalStartMs = bd.getTime() - (lord.years - balanceYears) * YEAR_MS;
  const now = new Date();
  let startIdx = lordIdx;
  for (let i = 0; i < 9; i++) {
    const idx = (startIdx + i) % 9;
    const d = DASHA_LORDS[idx];
    const yrs = i === 0 ? balanceYears : d.years;
    const startDt = new Date(currentDate);
    const endMs = currentDate.getTime() + yrs * 365.25 * 24 * 3600000;
    const endDt = new Date(endMs);

    // Antardasha (sub-periods within this dasha) — first dasha lays out from the
    // notional start at FULL lengths (layoutYrs), others from their real start.
    const antardashas = [];
    const layoutYrs = i === 0 ? d.years : yrs;
    let adDate = i === 0 ? new Date(notionalStartMs) : new Date(startDt);
    for (let j = 0; j < 9; j++) {
      const adIdx = (idx + j) % 9;
      const ad = DASHA_LORDS[adIdx];
      const adYrs = (layoutYrs * ad.years) / 120;
      const adStart = new Date(adDate);
      const adEndMs = adDate.getTime() + adYrs * 365.25 * 24 * 3600000;
      const adEnd = new Date(adEndMs);

      // Pratyantardasha (sub-sub periods within this antardasha)
      const pratyantardashas = [];
      let padDate = new Date(adStart);
      for (let k = 0; k < 9; k++) {
        const padIdx = (adIdx + k) % 9;
        const pad = DASHA_LORDS[padIdx];
        const padYrs = (adYrs * pad.years) / 120;
        const padStart = new Date(padDate);
        const padEndMs = padDate.getTime() + padYrs * 365.25 * 24 * 3600000;
        const padEnd = new Date(padEndMs);
        const padDays = Math.round(padYrs * 365.25);

        // Sookshma Dasha (சூட்சும தசை — sub-sub-sub periods within this Pratyantardasha,
        // the 4th level of Vimshottari Dasha). Same proportional formula as every other
        // level: this period's share = (parent duration × this lord's years) / 120.
        const sookshmaDashas = [];
        let sdDate = new Date(padStart);
        for (let l = 0; l < 9; l++) {
          const sdIdx = (padIdx + l) % 9;
          const sd = DASHA_LORDS[sdIdx];
          const sdYrs = (padYrs * sd.years) / 120;
          const sdStart = new Date(sdDate);
          const sdEndMs = sdDate.getTime() + sdYrs * 365.25 * 24 * 3600000;
          const sdEnd = new Date(sdEndMs);
          const sdDays = Math.round(sdYrs * 365.25);
          sookshmaDashas.push({
            ...sd, startDate: sdStart, endDate: sdEnd,
            duration: sdDays >= 365 ? (sdYrs.toFixed(1) + " வருடம்") : (sdDays + " நாட்கள்"),
            isCurrent: now >= sdStart && now < sdEnd
          });
          sdDate = sdEnd;
        }

        pratyantardashas.push({
          ...pad, startDate: padStart, endDate: padEnd,
          duration: padDays >= 365 ? (padYrs.toFixed(1) + " வருடம்") : (padDays + " நாட்கள்"),
          isCurrent: now >= padStart && now < padEnd,
          sookshmaDashas
        });
        padDate = padEnd;
      }

      // முதல் (balance) தசையில் பிறப்புக்கு முன்பே முடிந்த புக்திகளை விடு
      if (i !== 0 || adEnd > startDt) {
        antardashas.push({
          ...ad, startDate: adStart, endDate: adEnd,
          duration: adYrs.toFixed(1) + " வருடம்",
          isCurrent: now >= adStart && now < adEnd,
          pratyantardashas
        });
      }
      adDate = adEnd;
    }

    const isCurrent = now >= startDt && now < endDt;
    dashas.push({
      ...d, years: Math.round(yrs * 10) / 10,
      startDate: startDt, endDate: endDt,
      isCurrent, antardashas
    });
    currentDate = endDt;
  }
  return { dashas, birthNakshatra: NAKSHATRAS[nakIdx], birthLord: lord };
}

// ═══════════════════════════════════════════════════════════════════
// #37 AYANAMSA OPTIONS — multiple classical Ayanamsa systems
// Default: Lahiri (Chitrapaksha, IENA standard). Alternatives provided
// for users who follow KP, Raman, or Yukteshwar systems.
// Each returns the ayanamsa value in degrees for Julian century T.
// ═══════════════════════════════════════════════════════════════════
const AYANAMSA_SYSTEMS = {
  lahiri: {
    name: "லாஹிரி (சித்ரபக்ஷ)", nameEn: "Lahiri (Chitrapaksha)",
    desc: "IENA standard — most widely used in India",
    calc: (T) => 23.856 + (T * 100 * 50.29 / 3600) // current formula in the app
  },
  kp: {
    name: "கிருஷ்ணமூர்த்தி (KP)", nameEn: "Krishnamurti Paddhati",
    desc: "KP system — popular for horary astrology",
    // KP Ayanamsa = Lahiri - 0°06' (approximately; KP uses a precession rate of 50.2388475"/year)
    calc: (T) => 23.756 + (T * 100 * 50.2388475 / 3600)
  },
  raman: {
    name: "பி.வி. ராமன்", nameEn: "B.V. Raman",
    desc: "Raman's Ayanamsa — ~1.4° less than Lahiri",
    // Raman ayanamsa ≈ 22°27'37.76" (22.4605°) at J2000.0, precessing at ~50.3333"/year.
    // Verified: this gives Raman−Lahiri ≈ −1.4° at 1981, the correct classical offset.
    // (An earlier "(T+1)" epoch term double-counted a century of precession — removed.)
    calc: (T) => 22.4605 + (T * 100 * 50.3333 / 3600)
  }
  // NOTE: Sri Yukteshwar ayanamsa intentionally omitted — its formula could not be
  // verified against a trusted reference, and showing an unverified value would give
  // a wrong chart. Add it back only once its J2000 base + rate are confirmed.
};

// ═══════════════════════════════════════════════════════════════════
// #38 அஷ்டோத்தரி தசை (ASHTOTTARI DASHA) — BPHS Ch.47
// 108-year cycle, used when Rahu is in kendra/trikona from Lagna lord.
// 8 planets (no Ketu), starting from the birth nakshatra's dasha lord.
// ═══════════════════════════════════════════════════════════════════
const ASHTOTTARI_LORDS = [
  { name:"சூரியன்",   en:"Sun",     years:6,  symbol:"☉" },
  { name:"சந்திரன்",  en:"Moon",    years:15, symbol:"☽" },
  { name:"செவ்வாய்",  en:"Mars",    years:8,  symbol:"♂" },
  { name:"புதன்",     en:"Mercury", years:17, symbol:"☿" },
  { name:"சனி",       en:"Saturn",  years:10, symbol:"♄" },
  { name:"குரு",      en:"Jupiter", years:19, symbol:"♃" },
  { name:"ராகு",      en:"Rahu",    years:12, symbol:"☊" },
  { name:"சுக்கிரன்", en:"Venus",   years:21, symbol:"♀" },
]; // Total: 6+15+8+17+10+19+12+21 = 108 years

// Nakshatra → Ashtottari lord mapping (BPHS Ch.47) — Ardra-தொடக்க 4/3 மாற்று
// குழுக்கள் (classical):
// Sun(0): Ardra(5),Punarvasu(6),Pushya(7),Ashlesha(8) — 4
// Moon(1): Magha(9),P.Phalguni(10),U.Phalguni(11) — 3
// Mars(2): Hasta(12),Chitra(13),Swati(14),Vishakha(15) — 4
// Mercury(3): Anuradha(16),Jyeshtha(17),Mula(18) — 3
// Saturn(4): P.Ashadha(19),U.Ashadha(20),(Abhijit),Shravana(21) — 4
// Jupiter(5): Dhanishta(22),Shatabhisha(23),P.Bhadrapada(24) — 3
// Rahu(6): U.Bhadrapada(25),Revati(26),Ashwini(0),Bharani(1) — 4
// Venus(7): Krittika(2),Rohini(3),Mrigashira(4) — 3
const ASHTOTTARI_NAK_LORD = [
  6,6,7,7,7,0,0,0,0, 1,1,1,2,2,2,2,3,3, 3,4,4,4,5,5,5,6,6
]; // index into ASHTOTTARI_LORDS
// ஒவ்வொரு நட்சத்திரம் அதன் குழுவில் எத்தனையாவது (0-based) — balance கணக்கிற்கு
const ASHTOTTARI_NAK_POS = [
  2,3,0,1,2,0,1,2,3, 0,1,2,0,1,2,3,0,1, 2,0,1,2,0,1,2,0,1
];
const ASHTOTTARI_GROUP_SIZE = [
  4,4,3,3,3,4,4,4,4, 3,3,3,4,4,4,4,3,3, 3,3,3,3,3,3,3,4,4
];

function calculateAshtottariDasha(moonLongitude, birthDate) {
  const nakIdx = Math.floor(moonLongitude / (360 / 27)) % 27;
  const lordIdx = ASHTOTTARI_NAK_LORD[nakIdx];
  const lord = ASHTOTTARI_LORDS[lordIdx];

  // Remaining dasha balance at birth — அஷ்டோத்தரியில் ஒரு அதிபதி 3/4 நட்சத்திரக்
  // குழு-வில் ஆள்கிறார்; balance = முழு குழு வீச்சில் மீதி விகிதம் (ஒற்றை
  // நட்சத்திர விகிதம் அல்ல — அது balance-ஐ பெருக்கிக் காட்டியது)
  const nakSpan = 360 / 27;
  const posInGroup = ASHTOTTARI_NAK_POS[nakIdx] + (moonLongitude % nakSpan) / nakSpan;
  const groupSize = ASHTOTTARI_GROUP_SIZE[nakIdx];
  const remainYears = lord.years * (1 - posInGroup / groupSize);

  const dashas = [];
  let currentDate = new Date(birthDate);
  const now = new Date();

  // 2 சுழற்சிகள் (216 ஆண்டு) — வயதானவர்களுக்கும் current dasha கிடைக்க
  for (let i = 0; i < 16; i++) {
    const idx = (lordIdx + i) % 8;
    const d = ASHTOTTARI_LORDS[idx];
    const yrs = i === 0 ? remainYears : d.years;
    const ms = yrs * 365.25 * 24 * 3600000;
    const startDt = new Date(currentDate);
    const endDt = new Date(currentDate.getTime() + ms);
    const isCurrent = now >= startDt && now < endDt;
    dashas.push({ ...d, years: Math.round(yrs * 10) / 10, startDate: startDt, endDate: endDt, isCurrent });
    currentDate = endDt;
    if (dashas.length >= 8 && +startDt > +now) break; // ஒரு சுழற்சி + நடப்பு வரை போதும்
  }
  return { dashas, system: "அஷ்டோத்தரி (108 வருடம்)", systemEn: "Ashtottari (108 years)" };
}

// ═══════════════════════════════════════════════════════════════════
// #39 யோகினி தசை (YOGINI DASHA) — Classical 36-year cycle
// 8 Yoginis, each with a planet lord and specific year count.
// Popular in North India; based on birth nakshatra.
// Source: Tajika Neelakanthi / classical texts
// ═══════════════════════════════════════════════════════════════════
const YOGINI_LORDS = [
  { name:"மங்களா",  en:"Mangala",  planet:"சந்திரன்",  years:1, symbol:"☽" },
  { name:"பிங்களா", en:"Pingala",  planet:"சூரியன்",   years:2, symbol:"☉" },
  { name:"தன்யா",   en:"Dhanya",   planet:"குரு",      years:3, symbol:"♃" },
  { name:"பிராம்மி", en:"Bhramari", planet:"செவ்வாய்",  years:4, symbol:"♂" },
  { name:"பத்ரிகா", en:"Bhadrika", planet:"புதன்",     years:5, symbol:"☿" },
  { name:"உல்கா",   en:"Ulka",     planet:"சனி",       years:6, symbol:"♄" },
  { name:"சித்தா",  en:"Siddha",   planet:"சுக்கிரன்", years:7, symbol:"♀" },
  { name:"சங்கடா",  en:"Sankata",  planet:"ராகு",      years:8, symbol:"☊" },
]; // Total: 1+2+3+4+5+6+7+8 = 36 years

function calculateYoginiDasha(moonLongitude, birthDate) {
  const nakIdx = Math.floor(moonLongitude / (360 / 27)) % 27;
  // Yogini lord — classical சூத்திரம்: (நட்சத்திர எண் [அசுவினி=1] + 3) % 8;
  // மீதி 1=மங்களா … 0/8=சங்கடா. எனவே அசுவினி(1) → (1+3)%8=4 → 4வது = பிராம்மி.
  // 0-based array-க்கு: lordIdx = (nakIdx + 1 + 3 - 1) % 8 = (nakIdx + 3) % 8.
  // (பழைய nakIdx%8 சூத்திரம் ஒவ்வொரு நட்சத்திரத்திற்கும் 3 யோகினி தள்ளியது.)
  const lordIdx = (nakIdx + 3) % 8;
  const lord = YOGINI_LORDS[lordIdx];

  const nakSpan = 360 / 27;
  const elapsed = (moonLongitude % nakSpan) / nakSpan;
  const remainYears = lord.years * (1 - elapsed);

  const dashas = [];
  let currentDate = new Date(birthDate);
  const now = new Date();

  // 3 சுழற்சிகள் (108 ஆண்டு) — யோகினி 36 ஆண்டுக்கு மேல் மீண்டும் சுழல்வதால்
  // (இல்லையேல் ~36 வயதுக்கு மேல் current dasha ஏதும் காட்டாது)
  for (let i = 0; i < 24; i++) {
    const idx = (lordIdx + i) % 8;
    const d = YOGINI_LORDS[idx];
    const yrs = i === 0 ? remainYears : d.years;
    const ms = yrs * 365.25 * 24 * 3600000;
    const startDt = new Date(currentDate);
    const endDt = new Date(currentDate.getTime() + ms);
    const isCurrent = now >= startDt && now < endDt;
    dashas.push({ ...d, years: Math.round(yrs * 10) / 10, startDate: startDt, endDate: endDt, isCurrent });
    currentDate = endDt;
    if (dashas.length >= 8 && +startDt > +now) break;
  }
  return { dashas, system: "யோகினி (36 வருடம்)", systemEn: "Yogini (36 years)" };
}

// ═══════════════════════════════════════════════════════════════════
// TIER 2: SPECIAL LAGNAS — BPHS Ch.33
// ═══════════════════════════════════════════════════════════════════

// #24 ஹோரா லக்னம் (HORA LAGNA) — BPHS 33.1-2: for wealth analysis
// "1 sign per 2.5 ghatis" = 30° / 2.5 ghatis = 12° per ghati.
// HL completes 2 full cycles (720°) in 24 hours.
// Verified against PVR Narasimha Rao's Jagannatha Hora documentation.
function calcHoraLagna(sunLong, birthMinutes, sunriseMin) {
  const ghatis = (birthMinutes - sunriseMin) / 24; // 1 ghati = 24 minutes
  const horaLong = ((sunLong + ghatis * 12) % 360 + 360) % 360;
  const rashi = Math.floor(horaLong / 30);
  return { longitude: Math.round(horaLong * 100) / 100, rashi, rashiName: RASHIS[rashi] };
}

// #25 காடி லக்னம் (GHATI LAGNA) — BPHS 33.3-4: for authority/power
// Classical: 1 ராசி ஒரு காடிக்கு = 30°/ghati — GL ஒரு நாளில் 5 முழு சுற்று.
// (பழைய 6°/ghati உண்மையில் பாவ லக்னத்தின் [1 ராசி/5 காடி] வேகம் — கிட்டத்தட்ட
// எல்லா பிறப்பு நேரங்களுக்கும் GL ராசி தவறாக வந்தது. JHora convention சரிபார்ப்பு.)
function calcGhatiLagna(sunLong, birthMinutes, sunriseMin) {
  const ghatis = (birthMinutes - sunriseMin) / 24;
  const ghatiLong = ((sunLong + ghatis * 30) % 360 + 360) % 360;
  const rashi = Math.floor(ghatiLong / 30);
  return { longitude: Math.round(ghatiLong * 100) / 100, rashi, rashiName: RASHIS[rashi] };
}

// 12 ஆரூட பதங்கள் (ALL 12 ARUDHA PADAS) — BPHS 29.1-5
// For each house H: find H's lord, count the lord's distance from H, then project
// that same distance again from the lord's position. Exceptions (29.4): if the pada
// lands on H itself → take the 10th from H; if on the 7th from H → take the 4th.
// A1 (Arudha Lagna) and A12 (Upapada) are the most used; all 12 are provided.
const ARUDHA_PADA_NAMES = [
  "A1 (லக்ன பதம்)","A2 (தன பதம்)","A3 (விக்ரம பதம்)","A4 (சுக பதம்)",
  "A5 (மந்திர பதம்)","A6 (ரோக பதம்)","A7 (தார பதம்)","A8 (மிருத்யு பதம்)",
  "A9 (பிதுர் பதம்)","A10 (கர்ம பதம்)","A11 (லாப பதம்)","A12 (உபபத பதம்)"
];
function calcAllArudhaPadas(lagnaRashiIdx, placements) {
  const padas = [];
  for (let h = 0; h < 12; h++) {
    const houseRashi = (lagnaRashiIdx + h) % 12;
    const lordName = RASHI_LORD_NAME[houseRashi];
    const lordP = placements.find(p => p.ta === lordName);
    if (!lordP) { padas.push(null); continue; }
    const lordDist = ((lordP.rashiIdx - houseRashi + 12) % 12); // 0-11 distance
    let padaRashi = (lordP.rashiIdx + lordDist) % 12;           // project same distance again
    // Exceptions (BPHS 29.4)
    if (padaRashi === houseRashi) padaRashi = (houseRashi + 9) % 12;         // 10th from the house
    else if (padaRashi === (houseRashi + 6) % 12) padaRashi = (houseRashi + 3) % 12; // 4th from the house
    padas.push({
      pada: ARUDHA_PADA_NAMES[h],
      houseNum: h + 1,
      rashi: padaRashi,
      rashiName: RASHIS[padaRashi],
      lord: lordName
    });
  }
  return padas;
}

// #26 ஆருட லக்னம் (ARUDHA LAGNA / PADA LAGNA) — BPHS 29.1-3
function calcArudhaLagna(lagnaRashiIdx, placements) {
  const lagnaLord = RASHI_LORD_NAME[lagnaRashiIdx];
  const lordP = placements.find(p => p.ta === lagnaLord);
  if (!lordP) return null;
  const lordHouse = ((lordP.rashiIdx - lagnaRashiIdx + 12) % 12) + 1;
  let arudhaHouse = (lordHouse - 1) * 2; // count same distance from lord's position
  let arudhaRashi = (lagnaRashiIdx + arudhaHouse) % 12;
  // Exception: if Arudha falls in Lagna or 7th from Lagna, use 10th or 4th instead (BPHS 29.4)
  if (arudhaRashi === lagnaRashiIdx) arudhaRashi = (lagnaRashiIdx + 9) % 12; // 10th house
  else if (arudhaRashi === (lagnaRashiIdx + 6) % 12) arudhaRashi = (lagnaRashiIdx + 3) % 12; // 4th house
  return { rashi: arudhaRashi, rashiName: RASHIS[arudhaRashi] };
}

// ═══════════════════════════════════════════════════════════════════
// JAIMINI ராசி திருஷ்டி (RASHI DRISHTI) & அர்கலா (ARGALA)
// Rashi Drishti (sign aspects): movable signs aspect the fixed signs except the
//   adjacent one; fixed aspect the movable signs except the adjacent one; dual
//   signs aspect the other dual signs. (Standard Jaimini sign-aspect rule.)
// Argala (intervention): planets in the 2nd/4th/11th from a sign cause argala;
//   the counter (virodha argala) comes from the 12th/10th/3rd respectively.
//   Argala is effective (unobstructed) when its planets outnumber the counter's.
// ═══════════════════════════════════════════════════════════════════
const _MOVABLE_SIGNS = [0,3,6,9], _FIXED_SIGNS = [1,4,7,10], _DUAL_SIGNS = [2,5,8,11];
function calcRashiDrishti(rashiIdx) {
  const mod = rashiIdx % 3; // 0=movable, 1=fixed, 2=dual
  if (mod === 0) return _FIXED_SIGNS.filter(f => f !== (rashiIdx + 1) % 12);
  if (mod === 1) return _MOVABLE_SIGNS.filter(m => m !== (rashiIdx + 11) % 12);
  return _DUAL_SIGNS.filter(d => d !== rashiIdx);
}
function planetsAspectingSign(targetRashiIdx, placements) {
  return placements.filter(p => p.ta !== "லக்னம்" && calcRashiDrishti(p.rashiIdx).includes(targetRashiIdx));
}
function calcArgala(targetRashiIdx, placements) {
  const houseFrom = (offset) => (targetRashiIdx + offset) % 12;
  const planetsIn = (rIdx) => placements.filter(p => p.ta !== "லக்னம்" && p.rashiIdx === rIdx);
  // {argala house-offset, counter (virodha) house-offset, label}
  const pairs = [
    { arg: 1,  vir: 11, name: "2ஆம் வீடு (செல்வம்)" },   // 2nd argala ⟂ 12th
    { arg: 3,  vir: 9,  name: "4ஆம் வீடு (சுகம்)" },      // 4th argala ⟂ 10th
    { arg: 10, vir: 2,  name: "11ஆம் வீடு (லாபம்)" },    // 11th argala ⟂ 3rd
  ];
  return pairs.map(pr => {
    const argP = planetsIn(houseFrom(pr.arg)), virP = planetsIn(houseFrom(pr.vir));
    return {
      house: pr.name,
      argPlanets: argP.map(p => p.ta),
      virPlanets: virP.map(p => p.ta),
      effective: argP.length > 0 && argP.length > virP.length,
      partial: argP.length > 0 && argP.length === virP.length,
    };
  }).filter(r => r.argPlanets.length > 0 || r.virPlanets.length > 0);
}
// Master Jaimini analysis — Rashi Drishti + Argala on Lagna and Arudha Lagna.
function calcJaiminiAnalysis(horoscope) {
  if (!horoscope || !horoscope.placements) return null;
  const lagnaIdx = horoscope.lagna, placements = horoscope.placements;
  const arudha = horoscope.arudhaLagna || calcArudhaLagna(lagnaIdx, placements);
  const arudhaIdx = arudha ? arudha.rashi : null;
  const mapAsp = (idx) => idx == null ? [] : planetsAspectingSign(idx, placements).map(p => ({ ta: p.ta, from: RASHIS[p.rashiIdx] }));
  return {
    lagnaName: RASHIS[lagnaIdx],
    lagnaDrishtiSigns: calcRashiDrishti(lagnaIdx).map(i => RASHIS[i]),
    lagnaAspectedBy: mapAsp(lagnaIdx),
    lagnaArgala: calcArgala(lagnaIdx, placements),
    arudhaName: arudhaIdx != null ? RASHIS[arudhaIdx] : null,
    arudhaAspectedBy: mapAsp(arudhaIdx),
    charaKarakas: horoscope.charaKarakas || null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// JAIMINI சர தசா (CHARA DASHA) — KN Rao method (transparently labelled)
// Rules (documented, one of several valid Jaimini rashi-dasha systems):
//  • Start from the Lagna sign.
//  • Sequence direction: LAGNA odd (Ar,Ge,Le,Li,Sa,Aq) → forward (zodiacal);
//    even → backward.
//  • Each sign's DURATION: count from the sign to the sign its lord occupies —
//    forward if THAT sign is odd, backward if even — then subtract 1.
//    If the lord is in the sign's own sign, the period is 12 years.
//  • Dignity: lord exalted → +1 year, debilitated → −1 (clamped to 1..12).
//  • Co-lord signs use their traditional lord (Scorpio→Mars, Aquarius→Saturn),
//    matching RASHI_LORD_NAME.
// The UI shows this method explicitly so an astrologer can validate the convention.
// ═══════════════════════════════════════════════════════════════════
function calcCharaDasha(lagnaRashiIdx, placements, birthDateObj) {
  const isOdd = (idx) => idx % 2 === 0;               // Aries(0)=1st=odd
  const lordSign = (name) => { const p = placements.find(x => x.ta === name); return p ? p.rashiIdx : null; };
  function signYears(signIdx) {
    const lord = RASHI_LORD_NAME[signIdx];
    const lp = lordSign(lord);
    if (lp == null) return 1;
    const count = isOdd(signIdx) ? (((lp - signIdx + 12) % 12) + 1) : (((signIdx - lp + 12) % 12) + 1);
    let years = count - 1;
    if (years === 0) years = 12;                       // lord in own sign
    if (lp === EXALT_RASHI[lord]) years += 1;
    if (lp === DEBIL_RASHI[lord]) years -= 1;
    return Math.max(1, Math.min(12, years));
  }
  const forward = isOdd(lagnaRashiIdx);
  const seq = [];
  for (let i = 0; i < 12; i++) seq.push(forward ? (lagnaRashiIdx + i) % 12 : (lagnaRashiIdx - i + 12) % 12);
  let cursor = birthDateObj ? new Date(birthDateObj) : new Date();
  const dashas = seq.map(s => {
    const years = signYears(s);
    const start = new Date(cursor);
    const end = new Date(cursor); end.setDate(end.getDate() + Math.round(years * 365.25));
    cursor = end;
    return { rashi: s, rashiName: RASHIS[s], years, startDate: start, endDate: end };
  });
  const now = new Date();
  const current = dashas.find(d => now >= d.startDate && now < d.endDate);
  return { dashas, direction: forward ? "நேர் (zodiacal)" : "மாறு (reverse)", currentRashi: current ? current.rashiName : null };
}

// ═══════════════════════════════════════════════════════════════════
// வர்ஷபலன் / தாஜக (VARSHAPHALA — annual/solar-return chart)
// • Varsha Pravesh = the moment the Sun returns to its EXACT natal sidereal
//   longitude in the target year (found by iterating the engine near the birthday).
// • Varsha Lagna = the ascendant at that moment; the annual chart is cast for it.
// • Muntha = a progressed point: natal Lagna sign at birth, advancing one sign
//   per completed year → (natalLagna + age) % 12.
// • Varshesha (year lord) is classically the strongest of 5 Panchadhikari by
//   Pancha Vargeeya Bala. That strength scheme is intricate/varies between texts,
//   so this shows the CANDIDATES transparently rather than asserting one winner.
// ═══════════════════════════════════════════════════════════════════
function calcVarshaphala(natalHoro, dobISO, lat, lon, targetYear, ayanamsaKey = "lahiri") {
  if (!natalHoro || !natalHoro.placements) return null;
  const [by, bm, bd] = dobISO.split('-').map(Number);
  const natalSun = natalHoro.placements.find(p => p.ta === "சூரியன்");
  if (!natalSun) return null;
  const natalSunLong = natalSun.rashiIdx * 30 + natalSun.degExact;
  const natalLagnaIdx = natalHoro.lagna;
  const pad = (n) => String(n).padStart(2, '0');
  // ── find solar-return moment near the birthday of targetYear ──
  let est = new Date(targetYear, bm - 1, bd, 12, 0, 0);
  for (let iter = 0; iter < 7; iter++) {
    const iso = `${est.getFullYear()}-${pad(est.getMonth() + 1)}-${pad(est.getDate())}`;
    const tob = `${pad(est.getHours())}:${pad(est.getMinutes())}`;
    // natal chart-இன் ayanamsa-விலேயே தேடு — இல்லையேல் Raman/KP chart-க்கு
    // solar return ~1.5 நாள் தவறாகக் கிடைத்தது
    const h = generateHoroscope(iso, tob, lat, lon, true, ayanamsaKey);
    const sun = h.placements.find(p => p.ta === "சூரியன்");
    if (!sun) break;
    let diff = natalSunLong - (sun.rashiIdx * 30 + sun.degExact);
    while (diff > 180) diff -= 360; while (diff < -180) diff += 360;
    if (Math.abs(diff) < 0.0008) break;
    est = new Date(est.getTime() + (diff / 0.9856) * 86400000); // Sun ~0.9856°/day
  }
  const pIso = `${est.getFullYear()}-${pad(est.getMonth() + 1)}-${pad(est.getDate())}`;
  const pTob = `${pad(est.getHours())}:${pad(est.getMinutes())}`;
  const annual = generateHoroscope(pIso, pTob, lat, lon, false, ayanamsaKey);
  const age = targetYear - by;
  const munthaIdx = (natalLagnaIdx + age) % 12;
  const munthaHouse = ((munthaIdx - annual.lagna + 12) % 12) + 1;
  // 5 Varshesha candidates (Panchadhikari) — the 3 unambiguous lords + Muntha lord;
  // the final winner needs Pancha Vargeeya Bala (shown as candidates, not asserted).
  const uniq = (arr) => [...new Map(arr.map(c => [c.planet, c])).values()];
  const candidates = uniq([
    { role: "முந்தா அதிபதி", planet: RASHI_LORD_NAME[munthaIdx] },
    { role: "வர்ஷ லக்ன அதிபதி", planet: RASHI_LORD_NAME[annual.lagna] },
    { role: "ஜன்ம லக்ன அதிபதி", planet: RASHI_LORD_NAME[natalLagnaIdx] },
  ]);
  return {
    year: targetYear, age,
    praveshDate: est,
    varshaLagnaName: annual.lagnaName, varshaLagnaIdx: annual.lagna,
    annualPlacements: annual.placements.map(p => ({ ta: p.ta, symbol: p.symbol, rashi: p.rashi, house: ((p.rashiIdx - annual.lagna + 12) % 12) + 1 })),
    munthaIdx, munthaName: RASHIS[munthaIdx], munthaLord: RASHI_LORD_NAME[munthaIdx], munthaHouse,
    candidates,
  };
}

// ═══════════════════════════════════════════════════════════════════
// பிரஸ்னம் (PRASHNA — Tatkalika / current-moment horary)
// The universally-accepted horary form: cast a chart for the MOMENT the
// question is asked (at the querent's place) and read it. Reuses the same
// verified chart engine. A general favourability is derived from classical
// Prashna pointers: benefics in kendra/trikona from the Prashna Lagna help,
// malefics in the Lagna obstruct, and the Moon's house matters most.
// (The KP 249-sub-lord system is intentionally NOT used — it is variant-heavy
// and can't be verified to a single standard.)
// ═══════════════════════════════════════════════════════════════════
function calcPrashnaChart(lat, lon) {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const tob = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const h = generateHoroscope(iso, tob, lat, lon, false);
  const lagnaIdx = h.lagna;
  const houseOf = (p) => ((p.rashiIdx - lagnaIdx + 12) % 12) + 1;
  const KENDRA = [1, 4, 7, 10], TRIKONA = [1, 5, 9];
  const BEN = ["குரு", "சுக்கிரன்", "புதன்", "சந்திரன்"], MAL = ["சூரியன்", "செவ்வாய்", "சனி", "ராகு", "கேது"];
  let score = 0; const factors = [];
  h.placements.forEach(p => {
    const house = houseOf(p);
    if (BEN.includes(p.ta) && (KENDRA.includes(house) || TRIKONA.includes(house))) { score++; factors.push({ good: true, text: `சுபன் ${p.ta} ${house}ஆம் வீட்டில் — சாதகம்` }); }
    if (MAL.includes(p.ta) && house === 1) { score--; factors.push({ good: false, text: `பாபன் ${p.ta} லக்னத்தில் — தடை` }); }
  });
  const moon = h.placements.find(p => p.ta === "சந்திரன்");
  const moonHouse = houseOf(moon);
  if ([1, 4, 5, 7, 9, 10, 11].includes(moonHouse)) { score++; factors.push({ good: true, text: `சந்திரன் ${moonHouse}ஆம் வீட்டில் — நல்ல நிலை` }); }
  else { score--; factors.push({ good: false, text: `சந்திரன் ${moonHouse}ஆம் வீட்டில்${[6,8,12].includes(moonHouse) ? " (துஸ்தானம்)" : ""} — கவனம்` }); }
  const lagnaNature = lagnaIdx % 3 === 0 ? "சரம் (விரைவு பலன்)" : lagnaIdx % 3 === 1 ? "ஸ்திரம் (நிலை/தாமத பலன்)" : "உபயம் (கலப்பு பலன்)";
  const verdict = score >= 2 ? "சாதகம் (ஆம் நோக்கு)" : score <= -2 ? "பாதகம் (சிரமம்/தடை)" : "நடுத்தரம் (கவனம் தேவை)";
  const verdictColor = score >= 2 ? "#0d7a30" : score <= -2 ? "#cc1a1a" : "#a8710a";
  return {
    now, lagnaName: RASHIS[lagnaIdx], lagnaNature,
    moonSign: moon.rashi, moonNak: moon.nakshatraTa, moonHouse,
    score, verdict, verdictColor, factors,
    placements: h.placements.map(p => ({ ta: p.ta, symbol: p.symbol, rashi: p.rashi, house: houseOf(p) })),
  };
}

// #27 உபபத லக்னம் (UPAPADA LAGNA) — BPHS 29: Arudha of 12th house, for spouse
function calcUpapadaLagna(lagnaRashiIdx, placements) {
  const h12Rashi = (lagnaRashiIdx + 11) % 12;
  const h12Lord = RASHI_LORD_NAME[h12Rashi];
  const lordP = placements.find(p => p.ta === h12Lord);
  if (!lordP) return null;
  const lordFromH12 = ((lordP.rashiIdx - h12Rashi + 12) % 12) + 1;
  let upapadaRashi = (h12Rashi + (lordFromH12 - 1) * 2) % 12;
  // Same exception: if falls in 12th house or 6th from 12th, adjust
  if (upapadaRashi === h12Rashi) upapadaRashi = (h12Rashi + 9) % 12;
  else if (upapadaRashi === (h12Rashi + 6) % 12) upapadaRashi = (h12Rashi + 3) % 12;
  return { rashi: upapadaRashi, rashiName: RASHIS[upapadaRashi] };
}

// ═══════════════════════════════════════════════════════════════════
// #28 சர காரக (CHARA KARAKA) — Jaimini Sutras 1.1.10-21
// 7 (or 8) planets sorted by degree in sign (highest = Atmakaraka)
// ═══════════════════════════════════════════════════════════════════
const KARAKA_NAMES = [
  { ta:"ஆத்மகாரகன்", en:"Atmakaraka", meaning:"ஆன்மாவின் குறிப்பான் — வாழ்க்கையின் நோக்கம்" },
  { ta:"அமாத்யகாரகன்", en:"Amatyakaraka", meaning:"ஆலோசகன் — தொழில், வழிகாட்டி" },
  { ta:"பாதிரிகாரகன்", en:"Bhratrikaraka", meaning:"சகோதரன் — உடன்பிறப்புகள்" },
  { ta:"மாத்ருகாரகன்", en:"Matrikaraka", meaning:"தாய் — தாய் வழி உறவுகள்" },
  { ta:"புத்ரகாரகன்", en:"Putrakaraka", meaning:"மகன்/மகள் — குழந்தைகள்" },
  { ta:"ஞாதிகாரகன்", en:"Gnatikaraka", meaning:"உறவினர் — எதிரிகள், நோய்" },
  { ta:"தாரகாரகன்", en:"Darakaraka", meaning:"துணைவர் — திருமண துணை" },
];
function calcCharaKarakas(placements) {
  // Use 7 planets: Sun through Saturn (Rahu excluded in 7-karaka scheme per Parashara)
  const eligible = placements
    .filter(p => CLASSICAL_7.includes(p.ta))
    .map(p => ({ ...p, karakaDeg: p.degExact })) // degree within sign determines ranking
    .sort((a, b) => b.karakaDeg - a.karakaDeg); // highest degree first

  return eligible.map((p, i) => ({
    planet: p.ta, symbol: p.symbol, degree: Math.round(p.karakaDeg * 100) / 100,
    rashi: p.rashi, ...KARAKA_NAMES[i]
  }));
}

// ═══════════════════════════════════════════════════════════════════
// #30 ASHTAKAVARGA TRANSIT STRENGTH — use already-computed BAV scores
// to weight transit effects. SAV > 28 in a sign = favorable transit zone.
// Individual planet BAV > 4 = that planet's transit through the sign is strong.
// ═══════════════════════════════════════════════════════════════════
function getAshtakavargaTransitScore(bavData, savData, planetName, transitRashiIdx) {
  if (!bavData || !savData) return null;
  const savScore = savData[transitRashiIdx] || 0;
  const bavScore = bavData[planetName] ? bavData[planetName][transitRashiIdx] || 0 : 0;
  return {
    sav: savScore, savGood: savScore >= 28,
    bav: bavScore, bavGood: bavScore >= 4,
    interpretation: savScore >= 28 && bavScore >= 4 ? "மிகச் சிறந்த transit" :
      savScore >= 28 ? "பொதுவாக நல்ல transit" :
      bavScore >= 4 ? "இந்த கிரகத்துக்கு நல்லது" : "பலவீனமான transit"
  };
}

// ═══════════════════════════════════════════════════════════════════
// #31 DOUBLE TRANSIT — Jupiter + Saturn simultaneous favorable position
// Professional astrologers' #1 event-trigger prediction tool.
// When BOTH Jupiter AND Saturn aspect/occupy a house favorably from
// Moon or Lagna, major life events related to that house manifest.
// ═══════════════════════════════════════════════════════════════════
function calcDoubleTransit(birthMoonRashi, lagnaRashiIdx, jupiterRashi, saturnRashi) {
  // Houses favorably influenced by Jupiter (where it sits + its aspects: 5th, 7th, 9th)
  const jupiterHouses = new Set();
  [0, 4, 6, 8].forEach(offset => { // Jupiter's position + 5th,7th,9th aspects
    jupiterHouses.add((jupiterRashi + offset) % 12);
  });
  // Houses favorably influenced by Saturn (where it sits + its aspects: 3rd, 7th, 10th)
  const saturnHouses = new Set();
  [0, 2, 6, 9].forEach(offset => {
    saturnHouses.add((saturnRashi + offset) % 12);
  });

  // Find houses where BOTH influence simultaneously
  const HOUSE_MEANINGS = {
    1:"உடல்/ஆளுமை", 2:"குடும்பம்/செல்வம்", 3:"தைரியம்/சகோதரர்",
    4:"வீடு/தாய்/சுகம்", 5:"குழந்தை/கல்வி/புண்ணியம்", 6:"எதிரி/நோய்/கடன்",
    7:"திருமணம்/கூட்டாளி", 8:"ஆயுள்/மாற்றம்", 9:"பாக்கியம்/தர்மம்/பயணம்",
    10:"தொழில்/பதவி", 11:"லாபம்/வருமானம்", 12:"செலவு/மோக்ஷம்"
  };

  const doubleTransitHouses = [];
  for (let i = 0; i < 12; i++) {
    if (jupiterHouses.has(i) && saturnHouses.has(i)) {
      const hFromMoon = ((i - birthMoonRashi + 12) % 12) + 1;
      const hFromLagna = ((i - lagnaRashiIdx + 12) % 12) + 1;
      doubleTransitHouses.push({
        rashi: RASHIS[i], rashiIdx: i,
        houseFromMoon: hFromMoon, houseFromLagna: hFromLagna,
        meaning: HOUSE_MEANINGS[hFromLagna] || ""
      });
    }
  }
  return doubleTransitHouses;
}

// ═══════════════════════════════════════════════════════════════════
// #33 தியாஜ்ய காலம் (TYAJYA KALAM) — Classical inauspicious period
// within each nakshatra day. BPHS/Muhurtha Chintamani: specific ghati
// ranges to avoid for each of the 27 nakshatras.
// ═══════════════════════════════════════════════════════════════════
// [startGhati, endGhati] from the start of the nakshatra (1 ghati = 24 minutes)
const TYAJYA_GHATIS = [
  [50,54],[20,24],[32,36],[40,44],[14,18],[22,26],[30,34],[20,24],[32,36], // Ashwini-Ashlesha
  [30,34],[20,24],[18,22],[22,26],[14,18],[10,14],[14,18],[10,14],[22,26], // Magha-Jyeshta
  [20,24],[24,28],[20,24],[10,14],[10,14],[18,22],[16,20],[12,16],[24,28], // Moola-Revati
];
function calcTyajyaKalam(nakIdx, nakStartTime, nakDurationMin) {
  if (nakIdx < 0 || nakIdx >= 27) return null;
  const [startG, endG] = TYAJYA_GHATIS[nakIdx];
  const startMin = nakStartTime + (startG / 60) * nakDurationMin;
  const endMin = nakStartTime + (endG / 60) * nakDurationMin;
  const fmt = (m) => { let h=Math.floor(m/60)%24, mn=Math.round(m%60); if(mn>=60){h=(h+1)%24;mn=0;} return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`; };
  return { start: fmt(startMin), end: fmt(endMin), nakshatra: NAKSHATRAS[nakIdx] };
}

// ═══════════════════════════════════════════════════════════════════
// #34 பஞ்சகம் (PANCHAKA) — 5-fold inauspicious check
// Nakshatras Dhanishta(22) through Revati(26) = Panchaka nakshatras
// Classical rule: these 5 nakshatras are considered inauspicious for
// specific activities (construction, south-facing travel, etc.)
// ═══════════════════════════════════════════════════════════════════
const PANCHAKA_NAKSHATRAS = [22,23,24,25,26]; // Avittam, Sathayam, Poorattathi, Uttarattathi, Revathi
const PANCHAKA_TYPES = [
  { name:"மிருத்யு பஞ்சகம்", avoid:"ஆபத்து — முக்கிய காரியங்கள் தவிர்க்கவும்" },
  { name:"அக்னி பஞ்சகம்", avoid:"தீ விபத்து — புதிய கட்டிடம் தவிர்க்கவும்" },
  { name:"ராஜ பஞ்சகம்", avoid:"அரசாங்க தொடர்பான வேலை தவிர்க்கவும்" },
  { name:"சோர பஞ்சகம்", avoid:"திருட்டு ஆபத்து — பயணம் தவிர்க்கவும்" },
  { name:"ரோக பஞ்சகம்", avoid:"நோய் ஆபத்து — ஆரோக்கியம் கவனிக்கவும்" },
];
function checkPanchaka(todayNakIdx, todayWeekday) {
  if (!PANCHAKA_NAKSHATRAS.includes(todayNakIdx)) return null;
  // Panchaka type = (nakshatra_number + weekday + tithi_number + lagna_number + birth_star) mod 5
  // Simplified: just nakshatra + weekday mod 5 (most common usage)
  const typeIdx = (todayNakIdx + todayWeekday) % 5;
  return { active: true, ...PANCHAKA_TYPES[typeIdx], nakshatra: NAKSHATRAS[todayNakIdx] };
}

// ═══════════════════════════════════════════════════════════════════
// #36 பாப சாம்யம் (PAPA SAMYAM) — Malefic balance in marriage matching
// Count malefic influences on houses 1,2,4,7,8,12 from Lagna, Moon, Venus
// in BOTH charts. If roughly equal, doshas cancel out.
// Classical rule per Parashari marriage matching texts.
// ═══════════════════════════════════════════════════════════════════
const MALEFICS = ["சூரியன்","செவ்வாய்","சனி","ராகு","கேது"];
function calcPapaSamyam(placements1, lagna1, placements2, lagna2) {
  const papam = (placements, lagnaIdx) => {
    const moon = placements.find(p => p.ta === "சந்திரன்");
    const venus = placements.find(p => p.ta === "சுக்கிரன்");
    const checkHouses = [1,2,4,7,8,12];
    let count = 0;
    const refs = [lagnaIdx];
    if (moon) refs.push(moon.rashiIdx);
    if (venus) refs.push(venus.rashiIdx);
    refs.forEach(refRashi => {
      checkHouses.forEach(h => {
        const targetRashi = (refRashi + h - 1) % 12;
        const maleficsHere = placements.filter(p => MALEFICS.includes(p.ta) && p.rashiIdx === targetRashi);
        count += maleficsHere.length;
      });
    });
    return count;
  };
  const bride = papam(placements1, lagna1);
  const groom = papam(placements2, lagna2);
  const diff = Math.abs(bride - groom);
  const balanced = diff <= 6; // within 6 points = roughly balanced
  return {
    bridePapam: bride, groomPapam: groom, diff, balanced,
    verdict: balanced ? "பாப சாம்யம் உண்டு — தோஷ பலன்கள் சமநிலை" :
      bride > groom ? "பெண் ஜாதகத்தில் பாபம் அதிகம் — பரிகாரம் தேவை" :
      "ஆண் ஜாதகத்தில் பாபம் அதிகம் — பரிகாரம் தேவை"
  };
}

// ═══════════════════════════════════════════════════════════════════
// #22 விம்சோபக பலம் (VIMSHOPAKA BALA) — BPHS Ch.17
// Planet strength across 6 divisional charts (Shad Varga scheme)
// D1(6pts), D2(2pts), D3(4pts), D9(5pts), D12(2pts), D30(1pt) = 20 max
// ═══════════════════════════════════════════════════════════════════
const SHAD_VARGA_WEIGHTS = [
  { name:"D1 ராசி",   weight:6 },
  { name:"D2 ஹோரை",  weight:2 },
  { name:"D3 திரேக்காணம்", weight:4 },
  { name:"D9 நவாம்சம்", weight:5 },
  { name:"D12 துவாதசாம்சம்", weight:2 },
  { name:"D30 திரிம்சாம்சம்", weight:1 },
];

function calcVimshopakaBala(p, lagnaIdx, placements) {
  // Compute rashi in each of the 6 vargas
  const d1 = p.rashiIdx;
  const isOdd = p.rashiIdx % 2 === 0;
  const d2 = isOdd ? (p.degExact < 15 ? 4 : 3) : (p.degExact < 15 ? 3 : 4);
  const d3 = (p.rashiIdx + Math.min(2, Math.floor(p.degExact / 10)) * 4) % 12;
  const d9 = (p.rashiIdx * 9 + Math.floor(p.degExact / (30/9))) % 12;
  const d12 = (p.rashiIdx + Math.min(11, Math.floor(p.degExact / 2.5))) % 12;
  const isOddD30 = p.rashiIdx % 2 === 0;
  const d30Rules = isOddD30 ? D30_ODD_RULERS : D30_EVEN_RULERS;
  const d30Ruler = d30Rules.find(([from, to]) => p.degExact >= from && p.degExact < to);
  const d30Lord = d30Ruler ? d30Ruler[2] : "செவ்வாய்";
  const d30 = MOOLA_TRIKONA[d30Lord] ? MOOLA_TRIKONA[d30Lord].rashi : OWN_RASHI[d30Lord]?.[0] ?? 0;

  const vargas = [d1, d2, d3, d9, d12, d30];

  // Dignity fraction per varga (BPHS Ch.17.13-15)
  // Exalted/MT/Own = 1.0, Friend = 0.75 (Tatkalika not applied here per most implementations),
  // Neutral = 0.5, Enemy = 0.25, Debilitated = 0.125
  function dignityFraction(planetName, vargaRashi) {
    if (vargaRashi === EXALT_RASHI[planetName]) return 1.0;
    if (MOOLA_TRIKONA[planetName] && vargaRashi === MOOLA_TRIKONA[planetName].rashi) return 1.0;
    if (OWN_RASHI[planetName]?.includes(vargaRashi)) return 1.0;
    if (vargaRashi === DEBIL_RASHI[planetName]) return 0.125;
    const lord = RASHI_LORD_NAME[vargaRashi];
    const fr = GRAHA_FRIENDSHIP[planetName];
    if (!fr) return 0.5;
    if (fr.friends.includes(lord)) return 0.75;
    if (fr.enemies.includes(lord)) return 0.25;
    return 0.5; // neutral
  }

  let total = 0;
  let favorableCount = 0;
  const breakdown = vargas.map((vRashi, i) => {
    const frac = dignityFraction(p.ta, vRashi);
    const pts = Math.round(SHAD_VARGA_WEIGHTS[i].weight * frac * 100) / 100;
    if (frac >= 0.75) favorableCount++; // own/exalt/MT/friend = favorable
    total += pts;
    return { varga: SHAD_VARGA_WEIGHTS[i].name, rashi: RASHIS[vRashi], fraction: frac, points: pts };
  });

  // #23 ஷட்வர்க classification (BPHS Ch.17.16-20)
  const SHAD_VARGA_CLASSES = ["—","—","கிம்சுகம்","வ்யஞ்ஜனம்","சாமரம்","சத்ரசாமரம்","குண்டலம்"];
  // favorableCount 0-1 = no title, 2=Kimshuka, 3=Vyanjana, 4=Chamara, 5=Chatrchamara, 6=Kundala
  const classification = SHAD_VARGA_CLASSES[favorableCount] || "—";

  return {
    total: Math.round(total * 100) / 100,
    max: 20,
    percentage: Math.round(total / 20 * 100),
    classification,
    favorableCount,
    breakdown
  };
}

// ═══════════════════════════════════════════════════════════════════
// TIER 3: #40 புஷ்கர பாகம் & மிருத்யு பாகம்
// PUSHKARA BHAGA — specific lucky degrees in each sign (BPHS/classical)
// MRITYU BHAGA — inauspicious death degrees per sign per planet
// ═══════════════════════════════════════════════════════════════════

// Pushkara Bhaga: specific degree in each sign that gives extra auspiciousness
// Source: Narada Samhita / classical texts
const PUSHKARA_BHAGA = [21,14,18,8,19,9,24,11,23,14,19,9]; // one per rashi (0=Mesha...11=Meena)

// Mrityu Bhaga: inauspicious degree per sign per planet (Jataka Parijata table)
// [Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn] for each rashi
// (குரு & சுக்கிரன் columns முன்பு எந்த அறியப்பட்ட அட்டவணையுடனும் பொருந்தாத
// — data-entry corruption — மதிப்புகளாக இருந்தன; JP standard-க்கு மாற்றப்பட்டது.)
const MRITYU_BHAGA = [
  [20,26,19,15,19,28,10], // Mesha
  [9,12,28,14,29,15,4],   // Rishabha
  [12,13,25,13,12,11,7],  // Mithuna
  [6,25,23,12,27,17,9],   // Kadaka
  [8,24,29,11,6,10,12],   // Simma
  [24,11,28,10,4,13,16],  // Kanni
  [16,26,14,9,13,4,3],    // Thula
  [17,14,21,8,10,6,18],   // Vrischika
  [22,13,2,7,17,27,28],   // Dhanusu
  [2,25,15,6,11,12,14],   // Makara
  [3,5,11,5,15,29,13],    // Kumbha
  [23,12,6,4,28,19,10],   // Meena
];
const PLANET_MRITYU_IDX = {"சூரியன்":0,"சந்திரன்":1,"செவ்வாய்":2,"புதன்":3,"குரு":4,"சுக்கிரன்":5,"சனி":6};

function checkPushkaraMrityu(placements) {
  return placements.filter(p => EXALT_RASHI[p.ta] !== undefined).map(p => {
    // "N-ஆவது பாகை" = [N−1°, N°) இடைவெளி (உ.ம் 21ஆம் பாகை = 20°00′–21°00′).
    // membership test: floor(degExact)+1 === N. (பழைய round±1 test ±1.5°
    // மையம்-மாறிய சாளரம் தந்தது.)
    const deg = Math.round(p.degExact);
    const bhagaNum = Math.floor(p.degExact) + 1; // 1..30
    const pushkaraDeg = PUSHKARA_BHAGA[p.rashiIdx];
    const isPushkara = bhagaNum === pushkaraDeg;

    const mIdx = PLANET_MRITYU_IDX[p.ta];
    const mrityuDeg = mIdx !== undefined ? MRITYU_BHAGA[p.rashiIdx][mIdx] : null;
    const isMrityu = mrityuDeg !== null && bhagaNum === mrityuDeg;

    return {
      ta: p.ta, rashi: p.rashi, degree: deg,
      isPushkara, pushkaraDeg,
      isMrityu, mrityuDeg,
      status: isPushkara ? "புஷ்கர பாகம் — மிகச் சுபம்!" : isMrityu ? "மிருத்யு பாகம் — கவனம்" : null
    };
  }).filter(r => r.isPushkara || r.isMrityu);
}

// ═══════════════════════════════════════════════════════════════════
// NAVAMSA (D9) CHART CALCULATOR
// ═══════════════════════════════════════════════════════════════════
function calculateNavamsa(placements) {
  // Navamsa = divide each sign into 9 parts (3°20' each). Classical rule (BPHS): in
  // Chara (movable) signs the navamsa sequence starts from the SAME sign; in Sthira
  // (fixed) signs it starts from the 9th sign FROM ITSELF; in Dwiswabhava (dual) signs
  // it starts from the 5th sign FROM ITSELF. This is NOT "all movable signs start from
  // Aries" — that's only true for Aries itself (whose own starting sign happens to BE
  // Aries); each sign's start point must be computed individually, which collapses to
  // the standard formula: navamsaRashiIdx = (rashiIdx*9 + navPart) % 12. The previous
  // version hardcoded one shared start (Aries/Capricorn/Libra) per modality group,
  // which was only correct for the one sign in each group whose own computed start
  // happened to match that shared value (Aries, Taurus, Gemini) — wrong for the other
  // 9 of 12 signs. Verified: this formula reproduces the movable/fixed/dual rule
  // exactly for all 12 signs individually (Cancer→Cancer, Leo→Aries, Virgo→Capricorn, etc).
  return placements.map(p => {
    const rashiIdx = p.rashiIdx;
    const navPart = Math.min(8, Math.floor((p.degExact ?? p.degree) / (30/9))); // 0-8; ?? — degExact 0° falsy ஆக degree-க்கு விழாமல்
    const navRashi = (rashiIdx * 9 + navPart) % 12;
    return { ...p, navRashi: RASHIS[navRashi], navRashiEn: RASHI_EN[navRashi], navRashiIdx: navRashi };
  });
}

// ═══════════════════════════════════════════════════════════════════
// 11 PORUTHAM — MARRIAGE MATCHING (10 Tamil classical + Nadi bonus)
// ═══════════════════════════════════════════════════════════════════
// Ashwini..Revati, 0=Deva 1=Manushya 2=Rakshasa — verified against classical Gana table
const GANAM = [0,1,2,1,0,1,0,0,2, 2,1,1,0,2,0, 2,0,2,2,1,1,0,2,2,1,1,0];
const GANAM_NAMES = ["தேவ கணம்","மனுஷ்ய கணம்","ராக்ஷஸ கணம்"];

// Ashwini..Revati — 14 classical Yoni (animal) categories, verified against standard table
const YONI = [0,1,2,3,3,4,5,2,5, 6,6,7,8,9,8, 9,10,10,4,11, 12,11,13,0,13,7,1];
const YONI_NAMES = ["குதிரை","யானை","ஆடு","பாம்பு","நாய்","பூனை","எலி","பசு","எருமை","புலி","மான்","குரங்கு","கீரி","சிங்கம்"];
// Classical Yoni-enemy animal pairs (Yoni Koota) — a match between these pairs is inauspicious
const YONI_ENEMY_PAIRS = [[0,8],[1,13],[2,11],[3,12],[4,10],[5,6],[7,9]]; // horse-buffalo, elephant-lion, goat-monkey, serpent-mongoose, dog-deer, cat-rat, cow-tiger

// Ashwini..Revati, 0=Vata(Aadi) 1=Pitta(Madhya) 2=Kapha(Antya) — verified against classical Nadi table
const NADI_MAP = [0,1,2,2,1,0,0,1,2, 2,1,0,0,1,2, 2,1,0,0,1,2,2,1,0,0,1,2];
const NADI_NAMES = ["வாத நாடி","பித்த நாடி","கப நாடி"];

// Ashwini..Revati, 0=Pada 1=Kati 2=Nabhi 3=Kantha 4=Siro — verified against classical Rajju table
const RAJJU_MAP = [0,1,2,3,4,3,2,1,0, 0,1,2,3,4,3, 2,1,0,0,1,2,3,4,3,2,1,0];
const RAJJU_NAMES = ["பாத ரஜ்ஜு","கடி ரஜ்ஜு","நாபி ரஜ்ஜு","கண்ட ரஜ்ஜு","சிர ரஜ்ஜு"];

// வேதை ஜோடிகள் — classical அட்டவணை: அசுவினி–கேட்டை, பரணி–அனுஷம்,
// கார்த்திகை–விசாகம், ரோகிணி–சுவாதி, மிருகசீரிடம்–அவிட்டம், திருவாதிரை–திருவோணம்,
// புனர்பூசம்–உத்திராடம், பூசம்–பூராடம், ஆயில்யம்–மூலம், மகம்–ரேவதி,
// பூரம்–உத்திரட்டாதி, உத்திரம்–பூரட்டாதி, அஸ்தம்–சதயம்; சித்திரைக்கு வேதை இல்லை.
// (பழைய "mirror" அமைப்பு 13-இல் 9 ஜோடிகளில் தவறாக இருந்தது.)
const VEDHA_PAIRS = [[0,17],[1,16],[2,15],[3,14],[4,22],[5,21],[6,20],[7,19],[8,18],[9,26],[10,25],[11,24],[12,23]];

function calculate10Porutham(nak1, nak2, rashi1, rashi2) {
  const results = [];
  let totalScore = 0;

  // 1. DINAM — count from bride's nakshatra to groom's nakshatra, then map to 9-tara cycle
  // remainder 0=Parama Mitra(9), 2=Sampat, 4=Kshema, 6=Sadhana, 8=Mitra → GOOD
  // remainder 1=Janma, 3=Vipat, 5=Pratyak, 7=Vadha → BAD
  const dinCount = ((nak2 - nak1 + 27) % 27) + 1;
  const dinOk = [0,2,4,6,8].includes(dinCount % 9);
  results.push({ name:"தினம்", en:"Dinam", ok:dinOk, score:dinOk?1:0, max:1,
    desc:dinOk?"இருவரின் ஆரோக்கியமும் நலமும் நன்றாக இருக்கும்":"ஆரோக்கியத்தில் சிறு பாதிப்பு இருக்கலாம்" });
  if(dinOk) totalScore++;

  // 2. GANAM — classical rule: same gana always OK; Deva+Manushya OK (both ways);
  // Deva+Rakshasa = WORST combination (removed); Manushya+Rakshasa = not OK
  const g1=GANAM[nak1], g2=GANAM[nak2];
  const ganOk = g1===g2 || (g1===0&&g2===1) || (g1===1&&g2===0);
  results.push({ name:"கணம்", en:"Ganam", ok:ganOk, score:ganOk?1:0, max:1,
    desc:`${GANAM_NAMES[g1]} + ${GANAM_NAMES[g2]} — ${ganOk?"குணப் பொருத்தம் உண்டு":"குணத்தில் வேறுபாடு"}` });
  if(ganOk) totalScore++;

  // 3. YONI — classical Yoni Koota: only fixed animal-enemy pairs are incompatible
  const y1=YONI[nak1], y2=YONI[nak2];
  const isYoniEnemy = YONI_ENEMY_PAIRS.some(([a,b]) => (y1===a&&y2===b)||(y1===b&&y2===a));
  const yoniOk = !isYoniEnemy;
  results.push({ name:"யோனி", en:"Yoni", ok:yoniOk, score:yoniOk?1:0, max:1,
    desc:`${YONI_NAMES[y1]} + ${YONI_NAMES[y2]} — ${yoniOk?"தாம்பத்ய ஒற்றுமை உண்டு":"தாம்பத்யத்தில் சிறு வேறுபாடு"}` });
  if(yoniOk) totalScore++;

  // 4. RASHI — count from bride's rashi to groom's rashi.
  // Classical Tamil rule: 2/12 (துவிர்த்துவாதசம்), 6/8 (சஷ்டாஷ்டகம்) தோஷம்;
  // 1(same), 3, 4, 5, 7(சமசப்தமம்), 9, 10, 11 சுபம்.
  // (பழைய பட்டியல் 2-ஐ சுபமாகவும் 9/10/11-ஐ அசுபமாகவும் தலைகீழாகக் கொண்டிருந்தது.)
  const rDiff = ((rashi2 - rashi1 + 12) % 12) + 1;
  const rashiOk = [1,3,4,5,7,9,10,11].includes(rDiff);
  results.push({ name:"ராசி", en:"Rasi", ok:rashiOk, score:rashiOk?1:0, max:1,
    desc:rashiOk?"ராசி பொருத்தம் உள்ளது, செல்வம் சேரும்":"ராசி பொருத்தம் சரியில்லை" });
  if(rashiOk) totalScore++;

  // 5. RASIYATHIPATI (Lord compatibility) — uses the same graha-maitri (friendship) table
  // as Graha Bala below, so this never contradicts that table's friend/enemy calls
  const lName1 = RASHI_LORD_NAME[rashi1], lName2 = RASHI_LORD_NAME[rashi2];
  // இரு பக்கமும் பார்க்கிறோம் — ஒரு பக்கம் நட்பு + மறு பக்கம் பகை என்றால்
  // மத்யமம்; இரு பக்கமும் பகையில்லை என்றால் OK. (முன்பு ஒரு பக்கம் மட்டும்
  // பார்த்ததால் பெண்/ஆண் வரிசை மாறினால் முடிவு மாறியது.)
  const f12 = GRAHA_FRIENDSHIP[lName1]?.friends.includes(lName2) ?? false;
  const f21 = GRAHA_FRIENDSHIP[lName2]?.friends.includes(lName1) ?? false;
  const e12 = GRAHA_FRIENDSHIP[lName1]?.enemies.includes(lName2) ?? false;
  const e21 = GRAHA_FRIENDSHIP[lName2]?.enemies.includes(lName1) ?? false;
  const lordOk = lName1===lName2 || ((f12 || f21) && !e12 && !e21);
  results.push({ name:"ராசியாதிபதி", en:"Rasiyathipati", ok:lordOk, score:lordOk?1:0, max:1,
    desc:lordOk?"இரு ராசிநாதர்களும் நட்பு — நல்ல பொருத்தம்":"ராசிநாதர்கள் நட்பில்லை" });
  if(lordOk) totalScore++;

  // 6. RAJJU
  const r1=RAJJU_MAP[nak1], r2=RAJJU_MAP[nak2];
  const rajjuOk = r1 !== r2;
  results.push({ name:"ரஜ்ஜு", en:"Rajju", ok:rajjuOk, score:rajjuOk?1:0, max:1,
    desc:`${RAJJU_NAMES[r1]} + ${RAJJU_NAMES[r2]} — ${rajjuOk?"மாங்கல்ய பலம் உண்டு":"⚠ ரஜ்ஜு தோஷம் — கவனம் தேவை"}` });
  if(rajjuOk) totalScore++;

  // 7. VEDHA
  const vedhaOk = !VEDHA_PAIRS.some(([a,b]) => (nak1===a&&nak2===b)||(nak1===b&&nak2===a));
  results.push({ name:"வேதை", en:"Vedha", ok:vedhaOk, score:vedhaOk?1:0, max:1,
    desc:vedhaOk?"வேதை இல்லை — தடையில்லா வாழ்க்கை":"வேதை உள்ளது — சில தடைகள் வரலாம்" });
  if(vedhaOk) totalScore++;

  // 8. VASIYAM — classical Vasya pairs (Parashara / standard Tamil tradition)
  // Mesha→Simha,Vrischika | Rishabha→Karka,Tula | Mithuna→Kanya | Karka→Vrischika,Dhanus
  // Simha→Tula | Kanya→Mithuna,Meena | Tula→Makara | Vrischika→Karka
  // Dhanus→Meena | Makara→Mesha,Kumbha | Kumbha→Mesha | Meena→Makara
  const vasiyaPairs = {0:[4,7],1:[3,6],2:[5],3:[7,8],4:[6],5:[2,11],6:[9],7:[3],8:[11],9:[0,10],10:[0],11:[9]};
  const vasiyamOk = (vasiyaPairs[rashi1]||[]).includes(rashi2) || (vasiyaPairs[rashi2]||[]).includes(rashi1) || rashi1===rashi2;
  results.push({ name:"வசியம்", en:"Vasiyam", ok:vasiyamOk, score:vasiyamOk?1:0, max:1,
    desc:vasiyamOk?"ஒருவர் மீது ஒருவர் ஈர்ப்பு உண்டு":"வசிய பொருத்தம் குறைவு" });
  if(vasiyamOk) totalScore++;

  // 9. MAHENDRAM — classical வரிசை 4,7,10,...,25 மட்டும் (count 1 [ஒரே
  // நட்சத்திரம்] மகேந்திரம் அல்ல — பழைய பட்டியலில் தவறாக இருந்தது)
  const mahCount = ((nak2 - nak1 + 27) % 27) + 1;
  const mahOk = [4,7,10,13,16,19,22,25].includes(mahCount);
  results.push({ name:"மகேந்திரம்", en:"Mahendram", ok:mahOk, score:mahOk?1:0, max:1,
    desc:mahOk?"சந்ததி பாக்கியம் உண்டு, வம்ச விருத்தி":"மகேந்திர பொருத்தம் இல்லை" });
  if(mahOk) totalScore++;

  // 10. ஸ்திரீ தீர்க்கம் (STREE DEERGHAM) — classical Tamil porutham rule
  // Count from bride's nakshatra to groom's nakshatra; if ≥ 13, groom's star is
  // sufficiently "longer" (deergha) → OK. Part of the standard Tamil 10-porutham system.
  const sdCount = ((nak2 - nak1 + 27) % 27) + 1;
  const sdOk = sdCount >= 13;
  results.push({ name:"ஸ்திரீ தீர்க்கம்", en:"Stree Deergham", ok:sdOk, score:sdOk?1:0, max:1,
    desc:sdOk ? `நட்சத்திர எண்ணிக்கை ${sdCount} (≥13) — தீர்க்க பொருத்தம் உண்டு` : `நட்சத்திர எண்ணிக்கை ${sdCount} (<13) — தீர்க்க பொருத்தம் இல்லை` });
  if(sdOk) totalScore++;

  // 11. நாடி (NADI) — Naisargika dosha check (also used in North Indian Ashta Koota;
  // included as bonus since many modern Tamil astrologers verify it too)
  const n1=NADI_MAP[nak1], n2=NADI_MAP[nak2];
  const nadiOk = n1 !== n2;
  results.push({ name:"நாடி", en:"Nadi", ok:nadiOk, score:nadiOk?1:0, max:1,
    desc:`${NADI_NAMES[n1]} + ${NADI_NAMES[n2]} — ${nadiOk?"நாடி பொருத்தம் உண்டு — ஆரோக்கியம் நல்லது":"⚠ நாடி தோஷம் — பரிகாரம் தேவை"}` });
  if(nadiOk) totalScore++;

  const maxScore = results.length; // 11 (10 Tamil + Nadi bonus)
  const grade = totalScore >= 9 ? "மிகச் சிறந்த பொருத்தம்" : totalScore >= 7 ? "நல்ல பொருத்தம்" : totalScore >= 5 ? "சுமாரான பொருத்தம்" : "பொருத்தம் குறைவு";
  const gradeEn = totalScore >= 9 ? "Excellent" : totalScore >= 7 ? "Good" : totalScore >= 5 ? "Average" : "Poor";

  return { results, totalScore, maxScore, grade, gradeEn };
}

// ═══════════════════════════════════════════════════════════════════
// GOCHARA (TRANSIT) — தினப்பலன் / இன்றைய கிரக நிலை
// ═══════════════════════════════════════════════════════════════════
// Traditional gochara phalam: house-from-moon effect (simplified, per-planet)
// 1=good,0=neutral,-1=bad — classic rules for benefic/malefic houses from Rashi
const GOCHARA_RULES = {
  "சூரியன்": {good:[3,6,10,11], bad:[1,2,4,5,7,8,9,12]},
  "சந்திரன்": {good:[1,3,6,7,10,11], bad:[2,4,5,8,9,12]}, // 8th = Chandrashtama
  "செவ்வாய்": {good:[3,6,11], bad:[1,2,4,5,7,8,9,10,12]},
  "புதன்": {good:[2,4,6,8,10,11], bad:[1,3,5,7,9,12]},
  "குரு": {good:[2,5,7,9,11], bad:[1,3,4,6,8,10,12]},
  "சுக்கிரன்": {good:[1,2,3,4,5,8,9,11,12], bad:[6,7,10]},
  "சனி": {good:[3,6,11], bad:[1,2,4,5,7,8,9,10,12]},
};

function calculateGochara(birthMoonRashi, todayPlacements) {
  const results = todayPlacements.map(p => {
    const houseFromMoon = ((RASHIS.indexOf(p.rashi) - birthMoonRashi + 12) % 12) + 1;
    // ராகு/கேது: சனி விதி (3,6,11 சுபம்) — transit overlay-உடன் ஒரே convention
    const rule = GOCHARA_RULES[p.ta] || ((p.ta === "ராகு" || p.ta === "கேது") ? GOCHARA_RULES["சனி"] : null);
    let effect = "neutral";
    if (rule) {
      if (rule.good.includes(houseFromMoon)) effect = "good";
      else if (rule.bad.includes(houseFromMoon)) effect = "bad";
    }
    return { ...p, houseFromMoon, effect };
  });

  // Chandrashtama check — transit Moon in 8th house from birth Moon (inauspicious)
  const moonToday = results.find(p => p.ta === "சந்திரன்");
  const isChandrashtama = moonToday && moonToday.houseFromMoon === 8;

  const goodCount = results.filter(r => r.effect === "good").length;
  const badCount = results.filter(r => r.effect === "bad").length;
  const overallMood = isChandrashtama ? "caution" : goodCount > badCount ? "good" : badCount > goodCount ? "caution" : "neutral";

  return { results, isChandrashtama, goodCount, badCount, overallMood };
}

// Get today's panchangam + transit — reuses the Jean Meeus engine for TODAY's date
function getTodayTranist(lat=13.0827, lon=80.2707, targetDate=null, ayanamsaKey="lahiri") {
  const today = targetDate || new Date();
  // Use LOCAL date components (not toISOString, which is UTC-based and would
  // incorrectly report YESTERDAY's date for IST users between 12:00–5:29 AM,
  // since UTC lags IST by 5:30 hours).
  const dob = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  // For a future/past target date, use a fixed 06:00 reference time (matches how the
  // Panchangam Calendar computes other days); for "right now" use the live clock time
  // so transits reflect the exact current moment.
  const hh = targetDate ? "06" : String(today.getHours()).padStart(2,'0');
  const mm = targetDate ? "00" : String(today.getMinutes()).padStart(2,'0');
  // தேர்ந்தெடுத்த ayanamsa transit-க்கும் — natal KP/Raman ஆக இருக்கும்போது
  // transit Lahiri-இல் வந்து கலப்பு-ஒப்பீடு ஆகாமல் இருக்க
  const h = generateHoroscope(dob, `${hh}:${mm}`, lat, lon, false, ayanamsaKey);
  const dayNames = ["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"];
  const realNow = new Date();
  const isOtherDate = today.toDateString() !== realNow.toDateString();
  return {
    ...h,
    dateStr: today.toLocaleDateString("ta-IN",{year:"numeric",month:"long",day:"numeric"}),
    dayName: dayNames[today.getDay()],
    dateObj: today,
    isOtherDate,
    isFuture: isOtherDate && today > realNow,
    isPast: isOtherDate && today < realNow
  };
}

// ═══════════════════════════════════════════════════════════════════
// ராசி வாரியான நியமங்கள் & பரிகாரங்கள் (Per-Rashi Daily Remedies)
// ═══════════════════════════════════════════════════════════════════
// index matches RASHIS array: 0=மேஷம் ... 11=மீனம்
const RASHI_REMEDIES = [
  { lord:"செவ்வாய்", deity:"முருகன் / ஆஞ்சநேயர்", color:"சிவப்பு", gem:"பவளம்", mantra:"ஓம் அங்காரகாய நமః", favDay:2 },
  { lord:"சுக்கிரன்", deity:"மகாலக்ஷ்மி", color:"வெள்ளை", gem:"வைரம்", mantra:"ஓம் சுக்ராய நமः", favDay:5 },
  { lord:"புதன்", deity:"விஷ்ணு / விநாயகர்", color:"பச்சை", gem:"மரகதம்", mantra:"ஓம் புதாய நமः", favDay:3 },
  { lord:"சந்திரன்", deity:"சிவபெருமான்", color:"வெள்ளை", gem:"முத்து", mantra:"ஓம் சோமாய நமः", favDay:1 },
  { lord:"சூரியன்", deity:"சூரியன் / சிவன்", color:"மஞ்சள் சிவப்பு", gem:"மாணிக்யம்", mantra:"ஓம் சூர்யாய நமः", favDay:0 },
  { lord:"புதன்", deity:"விஷ்ணு / விநாயகர்", color:"பச்சை", gem:"மரகதம்", mantra:"ஓம் புதாய நமः", favDay:3 },
  { lord:"சுக்கிரன்", deity:"மகாலக்ஷ்மி", color:"வெள்ளை", gem:"வைரம்", mantra:"ஓம் சுக்ராய நமः", favDay:5 },
  { lord:"செவ்வாய்", deity:"முருகன் / ஆஞ்சநேயர்", color:"சிவப்பு", gem:"பவளம்", mantra:"ஓம் அங்காரகாய நமः", favDay:2 },
  { lord:"குரு", deity:"தக்ஷிணாமூர்த்தி / குரு", color:"மஞ்சள்", gem:"புஷ்பராகம்", mantra:"ஓம் குரவே நமः", favDay:4 },
  { lord:"சனி", deity:"ஐயப்பன் / சனீஸ்வரர்", color:"கருப்பு நீலம்", gem:"நீலம்", mantra:"ஓம் சனிஸ்வராய நமः", favDay:6 },
  { lord:"சனி", deity:"ஐயப்பன் / சனீஸ்வரர்", color:"கருப்பு நீலம்", gem:"நீலம்", mantra:"ஓம் சனிஸ்வராய நமః", favDay:6 },
  { lord:"குரு", deity:"தக்ஷிணாமூர்த்தி / குரு", color:"மஞ்சள்", gem:"புஷ்பராகம்", mantra:"ஓம் குரவே நமः", favDay:4 },
];

// key = JS getDay() → 0=Sunday...6=Saturday
const DAY_REMEDIES = {
  0: { lord:"சூரியன்", deity:"சூரிய பகவான்", remedy:"சூரியனுக்கு நீரில் சிவப்பு சந்தனம் கலந்து அர்க்யம் கொடுக்கவும்", donate:"கோதுமை, வெல்லம்", avoid:"உப்பு அதிகம் தவிர்க்கவும்" },
  1: { lord:"சந்திரன்", deity:"சிவபெருமான்", remedy:"சிவன் கோவிலில் பால் அபிஷேகம் செய்யவும் / சந்தனம் அணியவும்", donate:"பால், அரிசி, வெள்ளை உடை", avoid:"கோபம் தவிர்க்கவும்" },
  2: { lord:"செவ்வாய்", deity:"முருகன் / ஆஞ்சநேயர்", remedy:"முருகன் அல்லது ஆஞ்சநேயருக்கு வழிபாடு, வேல் தரிசனம்", donate:"சிவப்பு பருப்பு, வெல்லம்", avoid:"முடிவெடுக்கும்போது அவசரப்படாதீர்" },
  3: { lord:"புதன்", deity:"விஷ்ணு / விநாயகர்", remedy:"விநாயகருக்கு பச்சை பாயசம் நைவேத்யம், பச்சை அணியவும்", donate:"பாசிப்பருப்பு", avoid:"தேவையற்ற வாக்குவாதம் தவிர்க்கவும்" },
  4: { lord:"குரு", deity:"தக்ஷிணாமூர்த்தி / குரு", remedy:"குருவை வணங்கவும், மஞ்சள் அணியவும்", donate:"மஞ்சள், வாழைப்பழம், புத்தகம்", avoid:"பெரியோரை அவமதிக்காதீர்" },
  5: { lord:"சுக்கிரன்", deity:"மகாலக்ஷ்மி", remedy:"லக்ஷ்மி வழிபாடு, வெள்ளை உடை அணியவும்", donate:"அரிசி, வெள்ளை உடை, சர்க்கரை", avoid:"பொருள் விரயம் தவிர்க்கவும்" },
  6: { lord:"சனி", deity:"ஐயப்பன் / சனீஸ்வரர்", remedy:"சனீஸ்வரருக்கு எள் எண்ணெய் அபிஷேகம், கருப்பு உடை அணியவும்", donate:"எள் எண்ணெய், கருப்பு உளுந்து", avoid:"புதிய காரியங்கள் தொடங்காதீர்" },
};

// திதி வழிகாட்டுதல் — 15 நாள் சுழற்சி (வார நாள் 7-நாள் சுழற்சியுடன் சேராது,
// இதனால் வார நாள் + திதி இணைந்த பலன் 105 நாட்கள் வரை repeat ஆகாது)
const TITHI_GUIDANCE = [
  { name:"பிரதமை", note:"புதிய தொடக்கங்களுக்கு ஏற்ற நாள்", activity:"புதிய காரியம் தொடங்கலாம்" },
  { name:"த்விதியை", note:"திட்டமிடலுக்கு ஏற்ற நாள்", activity:"நீண்டகால திட்டங்களை வகுக்கலாம்" },
  { name:"திருதியை", note:"தைரியம் தேவைப்படும் காரியங்களுக்கு ஏற்றது", activity:"முக்கிய முடிவுகள் எடுக்கலாம்" },
  { name:"சதுர்த்தி", note:"விநாயகர் வழிபாட்டிற்கு சிறந்த நாள்", activity:"தடைகள் நீங்க விநாயகரை வழிபடவும்" },
  { name:"பஞ்சமி", note:"கல்வி, கலைகளுக்கு ஏற்ற நாள்", activity:"புதிய திறமைகளை கற்கலாம்" },
  { name:"ஷஷ்டி", note:"முருகன் வழிபாட்டிற்கு சிறந்த நாள்", activity:"ஆரோக்கியம் தொடர்பான காரியங்களுக்கு நல்லது" },
  { name:"சப்தமி", note:"பயணங்களுக்கு ஏற்ற நாள்", activity:"தொலைதூர பயணம் தொடங்கலாம்" },
  { name:"அஷ்டமி", note:"காளி/துர்கை வழிபாட்டிற்கு ஏற்றது", activity:"சவால்களை எதிர்கொள்ளும் காரியங்களுக்கு நல்லது" },
  { name:"நவமி", note:"கவனமாக இருக்க வேண்டிய நாள்", activity:"பெரிய முடிவுகளை தள்ளி வைக்கலாம்" },
  { name:"தசமி", note:"வெற்றிக்கு உகந்த நாள்", activity:"முக்கிய காரியங்களை நிறைவு செய்யலாம்" },
  { name:"ஏகாதசி", note:"விரதம் இருக்க சிறந்த நாள்", activity:"உபவாசம் / ஆன்மீக நடவடிக்கைகளுக்கு நல்லது" },
  { name:"த்வாதசி", note:"தானதர்மங்களுக்கு ஏற்ற நாள்", activity:"தர்மகாரியங்கள் செய்யலாம்" },
  { name:"திரயோதசி", note:"சிவ வழிபாட்டிற்கு ஏற்றது", activity:"பிரதோஷம் என்றால் சிவன் கோவில் செல்லவும்" },
  { name:"சதுர்தசி", note:"கவனமாக இருக்க வேண்டிய நாள்", activity:"சர்ச்சைகளைத் தவிர்க்கவும்" },
  { name:"பௌர்ணமி", note:"முழு நிலவு — மிக சுப நாள்", activity:"வழிபாடு, தானம், நல்ல காரியங்களுக்கு சிறந்த நாள்" },
];

function getPersonalizedRemedy(rashiIdx, dayOfWeek, isChandrashtama, tithiName) {
  const rashiInfo = RASHI_REMEDIES[rashiIdx] || RASHI_REMEDIES[0];
  const dayInfo = DAY_REMEDIES[dayOfWeek];
  const isSpecialDay = rashiInfo.favDay === dayOfWeek; // today is this rashi's lord's day
  const tithiInfo = TITHI_GUIDANCE.find(t => tithiName && tithiName.includes(t.name)) || TITHI_GUIDANCE[0];
  return { rashiInfo, dayInfo, isSpecialDay, isChandrashtama, tithiInfo };
}

// ═══════════════════════════════════════════════════════════════════
// SUNRISE / SUNSET — NOAA Solar Equations (real astronomical formula)
// This is the actual basis for Rahu Kalam, Yamagandam, Kuligai, Horai —
// the genuinely time-varying (hour-to-hour) part of Vedic daily timing.
// Default location: Chennai (13.08°N, 80.27°E) — pass lat/lon for other cities.
// ═══════════════════════════════════════════════════════════════════
function calcSunriseSunset(date, lat=13.0827, lon=80.2707, tzOffset=5.5) {
  const rad = Math.PI/180, deg = 180/Math.PI;
  const start = new Date(date.getFullYear(), 0, 0);
  const N = Math.floor((date - start) / 86400000);
  const gamma = 2*Math.PI/365 * (N - 1);

  const eqTime = 229.18*(0.000075 + 0.001868*Math.cos(gamma) - 0.032077*Math.sin(gamma)
    - 0.014615*Math.cos(2*gamma) - 0.040849*Math.sin(2*gamma));
  const decl = 0.006918 - 0.399912*Math.cos(gamma) + 0.070257*Math.sin(gamma)
    - 0.006758*Math.cos(2*gamma) + 0.000907*Math.sin(2*gamma)
    - 0.002697*Math.cos(3*gamma) + 0.00148*Math.sin(3*gamma);

  const latRad = lat*rad;
  const haArg = (Math.cos(90.833*rad)/(Math.cos(latRad)*Math.cos(decl))) - Math.tan(latRad)*Math.tan(decl);
  const ha = Math.acos(Math.max(-1,Math.min(1,haArg))) * deg;

  const solarNoon = 720 - 4*lon - eqTime;
  const sunriseMin = solarNoon - 4*ha + tzOffset*60;
  const sunsetMin = solarNoon + 4*ha + tzOffset*60;

  const toHM = (mins) => {
    let h = Math.floor(mins/60) % 24, m = Math.round(mins%60);
    if(m===60){h=(h+1)%24;m=0;}
    return { h, m, decimal: h+m/60, label: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` };
  };
  return { sunrise: toHM(sunriseMin), sunset: toHM(sunsetMin) };
}

// Segment index (1-8) tables — standard Tamil panchangam convention, by JS getDay() (0=Sun..6=Sat)
const RAHU_KALAM_SEG  = {0:8, 1:2, 2:7, 3:5, 4:6, 5:4, 6:3};
const YAMAGANDAM_SEG  = {0:5, 1:4, 2:3, 3:2, 4:1, 5:7, 6:6};
const KULIGAI_SEG     = {0:7, 1:6, 2:5, 3:4, 4:3, 5:2, 6:1};

function calcMuhurtham(date, lat=13.0827, lon=80.2707, tzOffset=5.5) {
  const { sunrise, sunset } = calcSunriseSunset(date, lat, lon, tzOffset);
  const dayLenMin = (sunset.decimal - sunrise.decimal) * 60;
  const segMin = dayLenMin / 8;
  const day = date.getDay();

  const segRange = (segNum) => {
    const startMin = sunrise.decimal*60 + (segNum-1)*segMin;
    const endMin = startMin + segMin;
    const fmt = (m) => { let h=Math.floor(m/60)%24, mn=Math.round(m%60); if(mn===60){h=(h+1)%24;mn=0;} return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`; };
    return `${fmt(startMin)} — ${fmt(endMin)}`;
  };

  // Abhijit Muhurtham — 8ஆவது முஹூர்த்தம்: பகல் நடுவம் ± (பகல் நீளம்/15)/2.
  // (fixed ±24 நிமிடம் அல்ல — பகல் நீளத்துடன் ஆண்டு முழுதும் 45-51 நிமிடம் மாறும்)
  const noonMin = (sunrise.decimal + sunset.decimal)/2 * 60;
  const abhijitHalfMin = dayLenMin / 30;
  const fmt2 = (m) => { let h=Math.floor(m/60)%24, mn=Math.round(m%60); if(mn===60){h=(h+1)%24;mn=0;} return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`; };
  const abhijit = `${fmt2(noonMin-abhijitHalfMin)} — ${fmt2(noonMin+abhijitHalfMin)}`;

  return {
    sunrise: sunrise.label, sunset: sunset.label,
    rahuKalam: segRange(RAHU_KALAM_SEG[day]),
    yamagandam: segRange(YAMAGANDAM_SEG[day]),
    kuligai: segRange(KULIGAI_SEG[day]),
    abhijit
  };
}

// Horai (Planetary Hour) — Chaldean sequence, cycles every hour from sunrise
const HORA_CYCLE = ["சனி","குரு","செவ்வாய்","சூரியன்","சுக்கிரன்","புதன்","சந்திரன்"];
const HORA_SYMBOLS = {"சனி":"♄","குரு":"♃","செவ்வாய்":"♂","சூரியன்":"☉","சுக்கிரன்":"♀","புதன்":"☿","சந்திரன்":"☽"};
const DAY_LORD_BY_WEEKDAY = ["சூரியன்","சந்திரன்","செவ்வாய்","புதன்","குரு","சுக்கிரன்","சனி"]; // JS getDay 0-6

function calcCurrentHorai(now, lat=13.0827, lon=80.2707, tzOffset=5.5) {
  const { sunrise, sunset } = calcSunriseSunset(now, lat, lon, tzOffset);

  const nowMin = now.getHours()*60 + now.getMinutes() + now.getSeconds()/60;
  const sunriseMin = sunrise.decimal*60, sunsetMin = sunset.decimal*60;

  let hourIndex, segStart, segEnd, dayForLord;
  if (nowMin >= sunriseMin && nowMin < sunsetMin) {
    // Day hora
    const dayLen = sunsetMin - sunriseMin;
    hourIndex = Math.floor((nowMin - sunriseMin) / (dayLen/12));
    segStart = sunriseMin + hourIndex*(dayLen/12);
    segEnd = segStart + dayLen/12;
    dayForLord = now.getDay();
  } else {
    // Night hora (from sunset to next sunrise)
    const nightLen = (24*60 - sunsetMin) + sunriseMin;
    let sinceSunset = nowMin >= sunsetMin ? (nowMin - sunsetMin) : (24*60 - sunsetMin + nowMin);
    hourIndex = 12 + Math.floor(sinceSunset / (nightLen/12));
    segStart = (sunsetMin + Math.floor(sinceSunset/(nightLen/12))*(nightLen/12)) % (24*60);
    segEnd = segStart + nightLen/12;
    dayForLord = nowMin >= sunsetMin ? now.getDay() : (now.getDay()+6)%7; // hora-day starts at sunrise
  }

  const dayLord = DAY_LORD_BY_WEEKDAY[dayForLord];
  const startIdx = HORA_CYCLE.indexOf(dayLord);
  const rulingPlanet = HORA_CYCLE[(startIdx + hourIndex) % 7];

  const fmt = (m) => { let h=Math.floor(m/60)%24, mn=Math.round(m%60); if(mn===60){h=(h+1)%24;mn=0;} return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`; };
  const isBenefic = ["குரு","சுக்கிரன்","புதன்","சந்திரன்"].includes(rulingPlanet);

  return {
    planet: rulingPlanet, symbol: HORA_SYMBOLS[rulingPlanet],
    startLabel: fmt(segStart), endLabel: fmt(segEnd < segStart ? segEnd+24*60 : segEnd),
    isBenefic
  };
}

// ═══════════════════════════════════════════════════════════════════
// ஏழரை சனி (SADE SATI) — Saturn's 7.5-year cycle relative to birth Moon
// ═══════════════════════════════════════════════════════════════════
function calcSadeSati(birthMoonRashi, saturnTodayRashi) {
  const houseFromMoon = ((saturnTodayRashi - birthMoonRashi + 12) % 12) + 1;
  if (houseFromMoon === 12) return { active:true, phase:"தொடக்க சாடே சாதி", phaseEn:"Rising Phase", desc:"ஏழரை சனியின் முதல் கட்டம் தொடங்கியுள்ளது — மன அழுத்தம், மாற்றங்கள் ஏற்படலாம். பொறுமை தேவை.", severity:"caution" };
  if (houseFromMoon === 1)  return { active:true, phase:"உச்ச சாடே சாதி", phaseEn:"Peak Phase", desc:"ஏழரை சனியின் உச்சக்கட்டம் — மிகவும் கடினமான காலம். ஆன்மீக பயிற்சி, சனி பரிகாரம் செய்யவும்.", severity:"high" };
  if (houseFromMoon === 2)  return { active:true, phase:"இறங்கு சாடே சாதி", phaseEn:"Setting Phase", desc:"ஏழரை சனி முடிவை நோக்கி செல்கிறது — குடும்பம், பொருளாதாரத்தில் கவனம் தேவை.", severity:"caution" };
  if (houseFromMoon === 8)  return { active:true, phase:"அஷ்டம சனி (கண்டக சனி)", phaseEn:"Ashtama Shani", desc:"சனி 8ஆம் வீட்டில் — ஆரோக்கியம், எதிர்பாராத சிக்கல்களில் கவனம் தேவை.", severity:"caution" };
  if (houseFromMoon === 4)  return { active:true, phase:"அர்த்தாஷ்டம சனி", phaseEn:"Ardhashtama Shani", desc:"சனி 4ஆம் வீட்டில் — மனநிலை, வீடு தொடர்பான விஷயங்களில் கவனம்.", severity:"caution" };
  return { active:false, phase:"ஏழரை சனி இல்லை", phaseEn:"No Sade Sati", desc:"தற்போது ஏழரை சனி (சாடே சாதி) இல்லை. சனியின் கோச்சார (பெயர்ச்சி) பலனை தனியே கீழே பார்க்கவும்.", severity:"none" };
}

// ═══════════════════════════════════════════════════════════════════
// குரு பெயர்ச்சி (GURU PEYARCHI) — Jupiter's yearly transit status
// ═══════════════════════════════════════════════════════════════════
function calcGuruPeyarchi(birthMoonRashi, jupiterTodayRashi) {
  const houseFromMoon = ((jupiterTodayRashi - birthMoonRashi + 12) % 12) + 1;
  // Classical குரு கோசாரம் (GOCHARA_RULES குரு விதியுடன் ஒத்திசைவு):
  // சுபம் = 2,5,7,9,11 மட்டும்; 1,10 உட்பட மற்றவை கவனம்/அசுபம்.
  const GURU_EFFECTS = {
    1:{mood:"caution",desc:"சுய மாற்றங்கள், உடல்நிலை கவனம் — புதிய முயற்சிகளில் நிதானம் தேவை"},
    2:{mood:"good",desc:"பொருளாதார வளர்ச்சி, குடும்ப மகிழ்ச்சி"},
    3:{mood:"caution",desc:"முயற்சிகள் அதிகரிக்கும், சகோதரர்களுடன் உறவில் கவனம்"},
    4:{mood:"caution",desc:"வீடு, தாய் தொடர்பான விஷயங்களில் மாற்றம்"},
    5:{mood:"good",desc:"கல்வி, குழந்தைகள், படைப்பாற்றலுக்கு சிறந்த காலம்"},
    6:{mood:"caution",desc:"எதிரிகள், கடன், ஆரோக்கியத்தில் கவனம் தேவை"},
    7:{mood:"good",desc:"திருமணம், கூட்டாண்மைகளுக்கு நல்ல காலம்"},
    8:{mood:"caution",desc:"திடீர் மாற்றங்கள், ஆன்மீக வளர்ச்சிக்கான காலம்"},
    9:{mood:"good",desc:"அதிர்ஷ்டம், தர்மம், தொலைதூர பயணங்களுக்கு சிறந்தது"},
    10:{mood:"caution",desc:"தொழிலில் கடின உழைப்பு தேவை — மாற்றங்களில் நிதானம்"},
    11:{mood:"good",desc:"வருமானம், லாபம், நண்பர்கள் மூலம் நன்மை"},
    12:{mood:"caution",desc:"செலவு அதிகரிக்கும், ஓய்வு தேவைப்படும் காலம்"}
  };
  const effect = GURU_EFFECTS[houseFromMoon];
  return { houseFromMoon, rashi:RASHIS[jupiterTodayRashi], ...effect };
}

// ═══════════════════════════════════════════════════════════════════
// தாரா பலம் (TARA BALA) — 27-Nakshatra strength (finer than Chandra Bala)
// ═══════════════════════════════════════════════════════════════════
const TARA_TYPES = [
  {name:"ஜென்ம தாரை", mood:"bad", desc:"தவிர்க்கவும் — புதிய காரியங்களுக்கு உகந்தது அல்ல"},
  {name:"சம்பத் தாரை", mood:"good", desc:"செல்வம், நன்மை தரும் நாள்"},
  {name:"விபத் தாரை", mood:"bad", desc:"தடைகள் வரலாம் — கவனமாக இருக்கவும்"},
  {name:"க்ஷேம தாரை", mood:"good", desc:"நல்வாழ்வு, மகிழ்ச்சி தரும் நாள்"},
  {name:"பிரத்யக் தாரை", mood:"bad", desc:"தடைகள், தாமதங்கள் ஏற்படலாம்"},
  {name:"சாதக தாரை", mood:"good", desc:"வெற்றி, சாதனைகளுக்கு உகந்த நாள்"},
  {name:"வத தாரை", mood:"bad", desc:"மிகவும் கவனமாக இருக்க வேண்டிய நாள்"},
  {name:"மைத்ர தாரை", mood:"good", desc:"நட்பு, ஒத்துழைப்பு தரும் நாள்"},
  {name:"பரம மைத்ர தாரை", mood:"good", desc:"மிகச் சிறந்த, நட்பான நாள்"},
];
function calcTaraBala(birthNakIdx, todayNakIdx) {
  const count = ((todayNakIdx - birthNakIdx + 27) % 27) + 1; // 1-27
  const taraIdx = (count - 1) % 9;
  return { count, ...TARA_TYPES[taraIdx] };
}

// ═══════════════════════════════════════════════════════════════════
// கிரக பலம் (GRAHA BALA) — Exaltation / Own-sign / Friendship strength
// Classical Parashara system — foundational part of Shadbala
// ═══════════════════════════════════════════════════════════════════
const EXALT_RASHI = {"சூரியன்":0,"சந்திரன்":1,"செவ்வாய்":9,"புதன்":5,"குரு":3,"சுக்கிரன்":11,"சனி":6};
const EXALT_DEGREE = {"சூரியன்":10,"சந்திரன்":3,"செவ்வாய்":28,"புதன்":15,"குரு":5,"சுக்கிரன்":27,"சனி":20};
const DEBIL_RASHI  = {"சூரியன்":6,"சந்திரன்":7,"செவ்வாய்":3,"புதன்":11,"குரு":9,"சுக்கிரன்":5,"சனி":0};
const OWN_RASHI = {"சூரியன்":[4],"சந்திரன்":[3],"செவ்வாய்":[0,7],"புதன்":[2,5],"குரு":[8,11],"சுக்கிரன்":[1,6],"சனி":[9,10]};

// ── MOOLATRIKONA — BPHS Ch.3: specific sign + degree range where a planet is
// in its "office" (stronger than Own Sign, weaker than Exaltation). This is the
// MOST important missing dignity level — every serious Jyotish software uses it.
const MOOLA_TRIKONA = {
  "சூரியன்":   { rashi:4,  fromDeg:0,  toDeg:20  },  // Leo 0°-20°
  "சந்திரன்":  { rashi:1,  fromDeg:4,  toDeg:30  },  // Taurus 4°-30° (BPHS: 3/4° முதல் ராசி முடிவு வரை)
  "செவ்வாய்":  { rashi:0,  fromDeg:0,  toDeg:12  },  // Aries 0°-12°
  "புதன்":     { rashi:5,  fromDeg:15, toDeg:20  },  // Virgo 15°-20°
  "குரு":      { rashi:8,  fromDeg:0,  toDeg:10  },  // Sagittarius 0°-10°
  "சுக்கிரன்": { rashi:6,  fromDeg:0,  toDeg:15  },  // Libra 0°-15°
  "சனி":       { rashi:10, fromDeg:0,  toDeg:20  },  // Aquarius 0°-20°
};

// ── COMBUSTION (Astangata/Dagdha) — BPHS Ch.25: when a planet is within these
// degrees of the Sun's longitude, it is "burnt" and loses strength. Critical for
// Graha Bala accuracy. Retrograde planets have slightly wider tolerance.
const COMBUSTION_LIMITS = {
  "சந்திரன்":  { normal:12, retro:12 },   // Moon: 12° (no retrograde)
  "செவ்வாய்":  { normal:17, retro:17 },   // Mars: 17°
  "புதன்":     { normal:14, retro:12 },   // Mercury: 14° (12° retro)
  "குரு":      { normal:11, retro:11 },   // Jupiter: 11°
  "சுக்கிரன்": { normal:10, retro:8  },   // Venus: 10° (8° retro)
  "சனி":       { normal:15, retro:15 },   // Saturn: 15°
};
const RASHI_LORD_NAME = ["செவ்வாய்","சுக்கிரன்","புதன்","சந்திரன்","சூரியன்","புதன்","சுக்கிரன்","செவ்வாய்","குரு","சனி","சனி","குரு"];
const GRAHA_FRIENDSHIP = {
  "சூரியன்": {friends:["சந்திரன்","செவ்வாய்","குரு"], enemies:["சுக்கிரன்","சனி"]},
  "சந்திரன்": {friends:["சூரியன்","புதன்"], enemies:[]},
  "செவ்வாய்": {friends:["சூரியன்","சந்திரன்","குரு"], enemies:["புதன்"]},
  "புதன்":    {friends:["சூரியன்","சுக்கிரன்"], enemies:["சந்திரன்"]},
  "குரு":     {friends:["சூரியன்","சந்திரன்","செவ்வாய்"], enemies:["புதன்","சுக்கிரன்"]},
  "சுக்கிரன்": {friends:["புதன்","சனி"], enemies:["சூரியன்","சந்திரன்"]},
  "சனி":      {friends:["புதன்","சுக்கிரன்"], enemies:["சூரியன்","சந்திரன்","செவ்வாய்"]},
};

// ── Helper: check if planet is in its Moolatrikona sign AND degree range
function isMoolaTrikona(planetName, rashiIdx, degExact) {
  const mt = MOOLA_TRIKONA[planetName];
  if (!mt) return false;
  return rashiIdx === mt.rashi && degExact >= mt.fromDeg && degExact <= mt.toDeg;
}

// ── Helper: check combustion — angular distance from Sun within limit
function isCombust(planetName, planetFullLong, sunFullLong, isRetrograde) {
  const limit = COMBUSTION_LIMITS[planetName];
  if (!limit) return false; // Sun, Rahu, Ketu can't be combust
  let angDist = Math.abs(planetFullLong - sunFullLong);
  if (angDist > 180) angDist = 360 - angDist;
  const threshold = isRetrograde ? limit.retro : limit.normal;
  return angDist <= threshold;
}

function calcGrahaBala(placements) {
  const sunP = placements.find(p => p.ta === "சூரியன்");
  return placements
    .filter(p => EXALT_RASHI[p.ta] !== undefined) // only the 7 classical planets (not Rahu/Ketu)
    .map(p => {
      const rashiIdx = p.rashiIdx;
      let score, status, statusEn;

      // Full classical dignity hierarchy: Exalted > Moolatrikona > Own > Friend > Neutral > Enemy > Debilitated
      if (rashiIdx === EXALT_RASHI[p.ta]) {
        const closeness = 1 - Math.abs(p.degExact - EXALT_DEGREE[p.ta]) / 30;
        score = Math.round((7 + closeness * 3) * 10) / 10; // 7-10
        status = "உச்சம்"; statusEn = "Exalted";
      } else if (rashiIdx === DEBIL_RASHI[p.ta]) {
        score = 1.5; status = "நீசம்"; statusEn = "Debilitated";
      } else if (isMoolaTrikona(p.ta, rashiIdx, p.degExact)) {
        score = 8.5; status = "மூலத்திரிகோணம்"; statusEn = "Moolatrikona";
      } else if (OWN_RASHI[p.ta].includes(rashiIdx)) {
        score = 8; status = "சொந்த வீடு"; statusEn = "Own Sign";
      } else {
        const lord = RASHI_LORD_NAME[rashiIdx];
        const fr = GRAHA_FRIENDSHIP[p.ta];
        if (fr.friends.includes(lord)) { score = 6.5; status = "நட்பு வீடு"; statusEn = "Friend's Sign"; }
        else if (fr.enemies.includes(lord)) { score = 3.5; status = "எதிரி வீடு"; statusEn = "Enemy's Sign"; }
        else { score = 5; status = "சமன் வீடு"; statusEn = "Neutral Sign"; }
      }

      // Combustion flag — BPHS Ch.25: combust planet is functionally weakened ("burnt"),
      // but this does NOT modify the positional dignity score (no classical formula exists
      // for a Shadbala/Graha Bala combustion penalty). Shown as a separate warning flag.
      const combust = p.ta !== "சூரியன்" && sunP && isCombust(p.ta, p.fullLong, sunP.fullLong, p.isRetrograde);

      return { ta: p.ta, symbol: p.symbol, rashi: p.rashi, score, status, statusEn, combust };
    });
}

// ═══════════════════════════════════════════════════════════════════
// பஞ்ச மகாபுருஷ யோகம் (PANCHA MAHAPURUSHA YOGA)
// 5 classical yogas — well-documented, verifiable, high-confidence rules
// ═══════════════════════════════════════════════════════════════════
const MAHAPURUSHA_INFO = {
  "செவ்வாய்": {name:"ருசக யோகம்", nameEn:"Ruchaka Yoga", effect:"தலைமைத்துவம், தைரியம், வீரம், போட்டித்துறையில் வெற்றி"},
  "புதன்":    {name:"பத்ர யோகம்",  nameEn:"Bhadra Yoga",  effect:"கூர்மையான அறிவு, வணிக வெற்றி, சிறந்த பேச்சாற்றல்"},
  "குரு":     {name:"ஹம்ச யோகம்",  nameEn:"Hamsa Yoga",   effect:"ஞானம், புகழ், ஆன்மீக வளர்ச்சி, நல்லொழுக்கம்"},
  "சுக்கிரன்": {name:"மாளவ்ய யோகம்",nameEn:"Malavya Yoga", effect:"அழகு, செல்வம், கலைத்திறமை, சுகபோகம்"},
  "சனி":      {name:"சச யோகம்",   nameEn:"Sasa Yoga",    effect:"அதிகாரம், நீண்ட ஆயுள், தலைமைப் பொறுப்பு"},
};
function detectMahapurushaYogas(placements, lagna) {
  const kendras = [1,4,7,10]; // houses from Lagna
  const found = [];
  ["செவ்வாய்","புதன்","குரு","சுக்கிரன்","சனி"].forEach(planetName => {
    const p = placements.find(pp => pp.ta === planetName);
    if (!p) return;
    const inOwnOrExalt = OWN_RASHI[planetName].includes(p.rashiIdx) || p.rashiIdx === EXALT_RASHI[planetName] || isMoolaTrikona(planetName, p.rashiIdx, p.degExact);
    if (inOwnOrExalt && kendras.includes(p.house)) {
      found.push({ planet: planetName, symbol: p.symbol, house: p.house, ...MAHAPURUSHA_INFO[planetName] });
    }
  });
  return found;
}

// ═══════════════════════════════════════════════════════════════════
// கூடுதல் கிளாசிக்கல் யோகங்கள் (ADVANCED CLASSICAL YOGAS)
// Gajakesari, Budh-Aditya, Chandra-Mangal, Kemadruma, Raja Yoga,
// Dhana Yoga, Viparita Raja Yoga — Parashari house-lordship system
// NOTE: Raja/Dhana Yoga here check CONJUNCTION only (same house), not
// mutual aspect or parivartana — a defensible common-usage simplification.
// ═══════════════════════════════════════════════════════════════════
const KENDRA_HOUSES = [1,4,7,10];
const TRIKONA_HOUSES = [1,5,9];
const DUSTHANA_HOUSES = [6,8,12];

function getHouseLord(lagnaRashiIdx, houseNum) {
  const rashiOfHouse = (lagnaRashiIdx + houseNum - 1) % 12;
  return RASHI_LORD_NAME[rashiOfHouse];
}

function detectClassicalYogas(placements, lagnaRashiIdx) {
  const yogas = [];
  const find = (name) => placements.find(p => p.ta === name);
  const moon = find("சந்திரன்"), sun = find("சூரியன்"), guru = find("குரு"),
        mercury = find("புதன்"), mars = find("செவ்வாய்"), venus = find("சுக்கிரன்"),
        saturn = find("சனி"), rahu = find("ராகு"), ketu = find("கேது");
  const BENEFICS = ["குரு","சுக்கிரன்","புதன்"]; // natural benefics (Mercury when unafflicted)

  // Helper: check if planet A aspects planet B (Parashari special + universal 7th)
  const aspectsFrom = (fromP, toP) => {
    if (!fromP || !toP || fromP.ta === toP.ta) return false;
    const houseOffset = ((toP.rashiIdx - fromP.rashiIdx + 12) % 12) + 1;
    const rules = DRISHTI_RULES[fromP.ta] || DRISHTI_RULES.default;
    return rules.includes(houseOffset);
  };

  // Helper: check parivartana (sign exchange) between two planets
  const isParivartana = (p1, p2) => {
    if (!p1 || !p2 || p1.ta === p2.ta) return false;
    const lord1 = RASHI_LORD_NAME[p1.rashiIdx]; // lord of sign p1 is in
    const lord2 = RASHI_LORD_NAME[p2.rashiIdx]; // lord of sign p2 is in
    return lord1 === p2.ta && lord2 === p1.ta; // each sits in the other's sign
  };

  // 1. கஜகேசரி யோகம் — Moon & Jupiter in mutual kendras
  if (moon && guru) {
    const rashiDiff = ((guru.rashiIdx - moon.rashiIdx + 12) % 12) + 1;
    if (KENDRA_HOUSES.includes(rashiDiff)) {
      yogas.push({
        name:"கஜகேசரி யோகம்", nameEn:"Gajakesari Yoga", type:"yoga", icon:"☽♃",
        desc:"புகழ், அறிவு, தலைமைத்துவம், நல்ல பெயர் — சந்திரனும் குருவும் ஒருவருக்கொருவர் கேந்திரத்தில் இருப்பதால் ஏற்படும் சிறந்த யோகம்"
      });
    }
  }

  // 2. புத ஆதித்ய யோகம் — Sun + Mercury same sign
  if (sun && mercury && sun.rashiIdx === mercury.rashiIdx) {
    yogas.push({
      name:"புத ஆதித்ய யோகம்", nameEn:"Budh-Aditya Yoga", type:"yoga", icon:"☉☿",
      desc:"அறிவுக்கூர்மை, தொழில் வெற்றி, நல்ல பேச்சாற்றல் — சூரியனும் புதனும் ஒரே ராசியில் சேர்வதால் ஏற்படும் யோகம்"
    });
  }

  // 3. சந்திர மங்கள யோகம் — Moon + Mars same sign
  if (moon && mars && moon.rashiIdx === mars.rashiIdx) {
    yogas.push({
      name:"சந்திர மங்கள யோகம்", nameEn:"Chandra-Mangal Yoga", type:"yoga", icon:"☽♂",
      desc:"செல்வம் ஈட்டும் திறன், தொழில் முனைவோர் குணம் — சந்திரனும் செவ்வாயும் இணைவதால் ஏற்படும் தன யோகம்"
    });
  }

  // 4. கேமத்ரும யோகம் (தோஷம்) — no planets in 2nd/12th from Moon.
  // Classical பங்க (cancellation) விதிகள் சேர்க்கப்பட்டன: சந்திரனுடன் கிரக
  // சேர்க்கை, சந்திரனிலிருந்து/லக்னத்திலிருந்து கேந்திரத்தில் கிரகம், சந்திரன்
  // லக்ன-கேந்திரத்தில், அல்லது குரு பார்வை — இவற்றில் ஏதும் இருந்தால் தோஷம்
  // முறிகிறது (முன்பு இவை சரிபார்க்கப்படாமல் பல ஜாதகங்களில் தவறாக அறிவிக்கப்பட்டது).
  if (moon) {
    const others = placements.filter(p => CLASSICAL_7.includes(p.ta) && p.ta !== "சந்திரன்" && p.ta !== "சூரியன்");
    const h2 = (moon.rashiIdx + 1) % 12, h12 = (moon.rashiIdx + 11) % 12;
    const hasSupport = others.some(p => p.rashiIdx === h2 || p.rashiIdx === h12);
    if (!hasSupport) {
      const conjWithMoon = others.some(p => p.rashiIdx === moon.rashiIdx);
      const kendraFromMoon = others.some(p => [0,3,6,9].includes((p.rashiIdx - moon.rashiIdx + 12) % 12));
      const kendraFromLagna = others.some(p => [0,3,6,9].includes((p.rashiIdx - lagnaRashiIdx + 12) % 12));
      const moonInKendra = [0,3,6,9].includes((moon.rashiIdx - lagnaRashiIdx + 12) % 12);
      const jup = find("குரு");
      const jupAspectsMoon = jup ? [5,7,9].includes(((moon.rashiIdx - jup.rashiIdx + 12) % 12) + 1) : false;
      const bhanga = conjWithMoon || kendraFromMoon || kendraFromLagna || moonInKendra || jupAspectsMoon;
      if (bhanga) {
        yogas.push({
          name:"கேமத்ரும பங்கம்", nameEn:"Kemadruma Bhanga", type:"yoga", icon:"☽✓",
          desc:"கேமத்ரும நிலை இருந்தும் கேந்திர ஆதரவு/குரு பார்வை/சந்திர சேர்க்கையால் தோஷம் முறிந்து நல்ல பலன் தரும் நிலை"
        });
      } else {
        yogas.push({
          name:"கேமத்ரும யோகம்", nameEn:"Kemadruma Yoga", type:"dosha", icon:"☽⚠",
          desc:"சந்திரனுக்கு இரு பக்கமும் (2,12ஆம் வீடு) கிரகங்கள் இல்லாததால் ஏற்படும் மன சவால்கள் — பரிகாரம் தேவை"
        });
      }
    }
  }

  // 5. ராஜயோகம் — EXPANDED: conjunction + mutual aspect + parivartana (ITEM #6 FIX)
  const kendraLords = [...new Set(KENDRA_HOUSES.map(h => getHouseLord(lagnaRashiIdx, h)))];
  const trikonaLords = [...new Set(TRIKONA_HOUSES.map(h => getHouseLord(lagnaRashiIdx, h)))];
  const rajaYogaFound = new Set(); // avoid duplicates
  kendraLords.forEach(kLord => {
    trikonaLords.forEach(tLord => {
      if (kLord === tLord) return;
      const kP = find(kLord), tP = find(tLord);
      if (!kP || !tP) return;
      const key = [kLord, tLord].sort().join("-");
      if (rajaYogaFound.has(key)) return;
      const conj = kP.rashiIdx === tP.rashiIdx;
      // Classical சம்பந்தம் = சேர்க்கை / பரஸ்பரப் பார்வை / பரிவர்த்தனை.
      // ஒரு-வழிப் பார்வை சம்பந்தம் ஆகாது (முன்பு || பயன்பட்டு over-detect ஆனது).
      const asp = aspectsFrom(kP, tP) && aspectsFrom(tP, kP);
      const pariv = isParivartana(kP, tP);
      if (conj || asp || pariv) {
        rajaYogaFound.add(key);
        const how = conj ? "சேர்க்கை" : asp ? "பரஸ்பரப் பார்வை" : "பரிவர்த்தனை";
        yogas.push({
          name:"ராஜயோகம்", nameEn:"Raja Yoga", type:"yoga", icon:"👑",
          desc:`கேந்திர நாதன் (${kLord}) + திரிகோண நாதன் (${tLord}) — ${how} மூலம் அதிகாரம், செல்வாக்கு தரும் யோகம்`
        });
      }
    });
  });

  // 6. தன யோகம் — 2,11 lords conjunction
  const lord2 = getHouseLord(lagnaRashiIdx, 2), lord11 = getHouseLord(lagnaRashiIdx, 11);
  if (lord2 !== lord11) {
    const p2 = find(lord2), p11 = find(lord11);
    if (p2 && p11 && p2.rashiIdx === p11.rashiIdx) {
      yogas.push({
        name:"தன யோகம்", nameEn:"Dhana Yoga", type:"yoga", icon:"💰",
        desc:`செல்வ நாதர்கள் (2,11) ${p2.house}ஆம் வீட்டில் சேர்வதால் பொருளாதார செழிப்பு தரும் யோகம்`
      });
    }
  }

  // 7. விபரீத ராஜயோகம் — dusthana lord in dusthana
  DUSTHANA_HOUSES.forEach(houseNum => {
    const lord = getHouseLord(lagnaRashiIdx, houseNum);
    const p = find(lord);
    if (p && DUSTHANA_HOUSES.includes(p.house)) {
      yogas.push({
        name:"விபரீத ராஜயோகம்", nameEn:"Viparita Raja Yoga", type:"yoga", icon:"🔄",
        desc:`${houseNum}ஆம் வீட்டு நாதன் (${lord}) ${p.house}ஆம் வீட்டில் — தடைகளுக்குப் பிறகு எதிர்பாராத வெற்றி தரும் யோகம்`
      });
    }
  });

  // ═══ ITEM #5: நீசபங்க ராஜயோகம் (NEECHABHANGA RAJA YOGA) ═══
  // When a debilitated planet's debilitation is cancelled, it becomes EXTREMELY powerful.
  // 5 classical cancellation rules (BPHS):
  placements.filter(p => DEBIL_RASHI[p.ta] !== undefined && p.rashiIdx === DEBIL_RASHI[p.ta]).forEach(debP => {
    const debSign = DEBIL_RASHI[debP.ta];
    const lordOfDebSign = RASHI_LORD_NAME[debSign];
    const exaltSign = EXALT_RASHI[debP.ta];
    const lordOfExaltSign = RASHI_LORD_NAME[exaltSign];
    let cancelled = false, reason = "";

    // Rule 1: Lord of debilitation sign in kendra from Lagna or Moon
    const debLordP = find(lordOfDebSign);
    if (debLordP) {
      const hFromLagna = ((debLordP.rashiIdx - lagnaRashiIdx + 12) % 12) + 1;
      const hFromMoon = moon ? ((debLordP.rashiIdx - moon.rashiIdx + 12) % 12) + 1 : 0;
      if (KENDRA_HOUSES.includes(hFromLagna) || KENDRA_HOUSES.includes(hFromMoon)) {
        cancelled = true; reason = `${lordOfDebSign} (நீச ராசி நாதன்) கேந்திரத்தில்`;
      }
    }
    // Rule 2: Lord of exaltation sign in kendra from Lagna or Moon
    if (!cancelled) {
      const exLordP = find(lordOfExaltSign);
      if (exLordP) {
        const hFromLagna = ((exLordP.rashiIdx - lagnaRashiIdx + 12) % 12) + 1;
        if (KENDRA_HOUSES.includes(hFromLagna)) {
          cancelled = true; reason = `${lordOfExaltSign} (உச்ச ராசி நாதன்) கேந்திரத்தில்`;
        }
      }
    }
    // Rule 3: Planet that gets exalted in the debilitation sign is in kendra
    if (!cancelled) {
      const planetExaltedHere = Object.keys(EXALT_RASHI).find(name => EXALT_RASHI[name] === debSign);
      if (planetExaltedHere) {
        const pEx = find(planetExaltedHere);
        if (pEx) {
          const hFromLagna = ((pEx.rashiIdx - lagnaRashiIdx + 12) % 12) + 1;
          if (KENDRA_HOUSES.includes(hFromLagna)) {
            cancelled = true; reason = `${planetExaltedHere} (இங்கு உச்சம்) கேந்திரத்தில்`;
          }
        }
      }
    }
    // Rule 4: Debilitated planet itself is in kendra
    if (!cancelled && KENDRA_HOUSES.includes(debP.house)) {
      cancelled = true; reason = `${debP.ta} நீசமாக இருந்தாலும் கேந்திரத்தில்`;
    }
    // Rule 5: Debilitated planet is aspected by or conjoined with the lord of its debilitation sign
    if (!cancelled && debLordP) {
      const conj = debLordP.rashiIdx === debP.rashiIdx;
      const asp = aspectsFrom(debLordP, debP);
      if (conj || asp) {
        cancelled = true; reason = `${lordOfDebSign} (நீச ராசி நாதன்) ${conj ? "சேர்க்கை" : "பார்வை"} மூலம் நீசபங்கம்`;
      }
    }

    if (cancelled) {
      yogas.push({
        name:"நீசபங்க ராஜயோகம்", nameEn:"Neechabhanga Raja Yoga", type:"yoga", icon:"⚡",
        desc:`${debP.ta} ${debP.rashi}-ல் நீசம் — ஆனால் ${reason} → நீசபங்கம்! மிகச் சக்தி வாய்ந்த யோகம், தடைகளை வென்று உயர்வு தரும்`
      });
    }
  });

  // ═══ ITEM #7: பரிவர்த்தன யோகம் (PARIVARTANA YOGA — Sign Exchange) ═══
  const parivChecked = new Set();
  CLASSICAL_7.forEach(name1 => {
    CLASSICAL_7.forEach(name2 => {
      if (name1 >= name2) return;
      const key = name1 + "-" + name2;
      if (parivChecked.has(key)) return;
      const p1 = find(name1), p2 = find(name2);
      if (isParivartana(p1, p2)) {
        parivChecked.add(key);
        // Classify: Maha (both in 1,2,4,5,7,9,10,11), Khala (one in 3,6), Dainya (one in 6,8,12)
        const good = [1,2,4,5,7,9,10,11];
        const dusth = [6,8,12];
        const isMaha = good.includes(p1.house) && good.includes(p2.house);
        const isDainya = dusth.includes(p1.house) || dusth.includes(p2.house);
        const pType = isMaha ? "மஹா" : isDainya ? "தைன்ய" : "கல";
        const pTypeEn = isMaha ? "Maha" : isDainya ? "Dainya" : "Khala";
        yogas.push({
          name:`${pType} பரிவர்த்தன யோகம்`, nameEn:`${pTypeEn} Parivartana Yoga`, type: isMaha ? "yoga" : "dosha", icon:"🔀",
          desc:`${name1} (${p1.house}ஆம் வீடு) ↔ ${name2} (${p2.house}ஆம் வீடு) — ராசி பரிமாற்றம்${isMaha ? ", அதிகார/செல்வ யோகம்" : isDainya ? ", சவால்கள் வழியே வளர்ச்சி" : ""}`
        });
      }
    });
  });

  // ═══ ITEMS #8-10: Moon-based Yogas (Sunapha, Anapha, Durudhara) ═══
  if (moon) {
    const h2Rashi = (moon.rashiIdx + 1) % 12;
    const h12Rashi = (moon.rashiIdx + 11) % 12;
    const planetsIn2 = placements.filter(p => CLASSICAL_7.includes(p.ta) && p.ta !== "சந்திரன்" && p.ta !== "சூரியன்" && p.rashiIdx === h2Rashi);
    const planetsIn12 = placements.filter(p => CLASSICAL_7.includes(p.ta) && p.ta !== "சந்திரன்" && p.ta !== "சூரியன்" && p.rashiIdx === h12Rashi);

    if (planetsIn2.length > 0 && planetsIn12.length > 0) {
      yogas.push({ name:"துருதரா யோகம்", nameEn:"Durudhara Yoga", type:"yoga", icon:"☽🛡",
        desc:`சந்திரனுக்கு இரு பக்கமும் கிரகங்கள் — செல்வம், புகழ், நல்ல நிலை தரும் மிகச் சிறந்த யோகம்` });
    } else if (planetsIn2.length > 0) {
      yogas.push({ name:"சுனாபா யோகம்", nameEn:"Sunapha Yoga", type:"yoga", icon:"☽→",
        desc:`சந்திரனுக்கு 2ல் ${planetsIn2.map(p=>p.ta).join(",")} — சுய முயற்சியால் செல்வம் ஈட்டும் யோகம்` });
    } else if (planetsIn12.length > 0) {
      yogas.push({ name:"அனாபா யோகம்", nameEn:"Anapha Yoga", type:"yoga", icon:"←☽",
        desc:`சந்திரனுக்கு 12ல் ${planetsIn12.map(p=>p.ta).join(",")} — அதிகாரம், ஆரோக்கியம், நல்ல குணம் தரும் யோகம்` });
    }
  }

  // ═══ ITEM #11: சகட யோகம் (Shakata Dosha) — Moon 6th/8th/12th from Jupiter;
  // சந்திரன் லக்ன-கேந்திரத்தில் இருந்தால் பங்கம் (classical) ═══
  if (moon && guru) {
    const moonFromGuru = ((moon.rashiIdx - guru.rashiIdx + 12) % 12) + 1;
    if (moonFromGuru === 6 || moonFromGuru === 8 || moonFromGuru === 12) {
      const moonKendraLagna = [0,3,6,9].includes((moon.rashiIdx - lagnaRashiIdx + 12) % 12);
      if (!moonKendraLagna) {
        yogas.push({ name:"சகட யோகம்", nameEn:"Shakata Yoga", type:"dosha", icon:"☽⚙",
          desc:`சந்திரன் குருவிலிருந்து ${moonFromGuru}ஆம் வீட்டில் — வாழ்க்கையில் ஏற்ற இறக்கங்கள், முயற்சி அதிகம் தேவைப்படும்` });
      }
    }
  }

  // ═══ ITEM #12: சந்திர ஆதி யோகம் (Chandra-Adhi Yoga) — benefics in 6,7,8 from Moon ═══
  if (moon) {
    const beneficCount678 = BENEFICS.filter(name => {
      const p = find(name);
      if (!p) return false;
      const hFromMoon = ((p.rashiIdx - moon.rashiIdx + 12) % 12) + 1;
      return [6,7,8].includes(hFromMoon);
    }).length;
    if (beneficCount678 >= 2) {
      yogas.push({ name:"சந்திர ஆதி யோகம்", nameEn:"Chandra-Adhi Yoga", type:"yoga", icon:"☽👑",
        desc:`சந்திரனிலிருந்து 6,7,8ல் ${beneficCount678} சுப கிரகங்கள் — தலைமை, அதிகாரம், மக்கள் மதிப்பு தரும் அரிய யோகம்` });
    }
  }

  // ═══ ITEM #13: அமல யோகம் (Amala Yoga) — 10ஆம் வீட்டில் (லக்னம்/சந்திரன்
  // இரண்டிலிருந்தும் சரிபார்ப்பு) சுப கிரகம் மட்டுமே — பாப கிரகம் கூட
  // இருந்தால் யோகம் நீர்க்கிறது (classical strict விதி) ═══
  {
    const checkAmala = (baseIdx) => {
      const rashi10 = (baseIdx + 9) % 12;
      const occupants = placements.filter(p => CLASSICAL_7.includes(p.ta) && p.rashiIdx === rashi10);
      return occupants.length > 0 && occupants.every(p => BENEFICS.includes(p.ta));
    };
    const fromLagna10 = checkAmala(lagnaRashiIdx);
    const fromMoon10 = moon ? checkAmala(moon.rashiIdx) : false;
    if (fromLagna10 || fromMoon10) {
      yogas.push({ name:"அமல யோகம்", nameEn:"Amala Yoga", type:"yoga", icon:"✨",
        desc:`${fromLagna10 ? "லக்னத்திலிருந்து" : "சந்திரனிலிருந்து"} 10ஆம் வீட்டில் சுப கிரகம் மட்டுமே — நற்பெயர், தர்மம், தூய நடத்தை, சமூக மதிப்பு தரும் யோகம்` });
    }
  }

  // ═══ ITEM #14: வேசி/வாசி/உபயசாரி (Sun-based triple yoga) ═══
  if (sun) {
    const h2FromSun = (sun.rashiIdx + 1) % 12;
    const h12FromSun = (sun.rashiIdx + 11) % 12;
    const pin2 = placements.filter(p => CLASSICAL_7.includes(p.ta) && p.ta !== "சூரியன்" && p.ta !== "சந்திரன்" && p.rashiIdx === h2FromSun);
    const pin12 = placements.filter(p => CLASSICAL_7.includes(p.ta) && p.ta !== "சூரியன்" && p.ta !== "சந்திரன்" && p.rashiIdx === h12FromSun);
    if (pin2.length > 0 && pin12.length > 0) {
      yogas.push({ name:"உபயசாரி யோகம்", nameEn:"Ubhayachari Yoga", type:"yoga", icon:"☉🛡",
        desc:`சூரியனுக்கு இரு பக்கமும் கிரகங்கள் — புகழ், அதிகாரம், எல்லா துறையிலும் வெற்றி தரும் அரிய யோகம்` });
    } else if (pin2.length > 0) {
      yogas.push({ name:"வேசி யோகம்", nameEn:"Veshi Yoga", type:"yoga", icon:"☉→",
        desc:`சூரியனுக்கு 2ல் ${pin2.map(p=>p.ta).join(",")} — நல்ல புகழ், உழைப்பின் மூலம் வெற்றி` });
    } else if (pin12.length > 0) {
      yogas.push({ name:"வாசி யோகம்", nameEn:"Vashi Yoga", type:"yoga", icon:"←☉",
        desc:`சூரியனுக்கு 12ல் ${pin12.map(p=>p.ta).join(",")} — செல்வாக்கு, கல்வி, திறமை யோகம்` });
    }
  }

  // ═══ ITEMS #16-19: DOSHAS ═══

  // ITEM #16: பித்ரு தோஷம் (Pitru Dosha) — Sun afflicted by Rahu/Saturn or 9th house afflicted
  if (sun && rahu && sun.rashiIdx === rahu.rashiIdx) {
    yogas.push({ name:"பித்ரு தோஷம்", nameEn:"Pitru Dosha", type:"dosha", icon:"☉☊",
      desc:"சூரியன் + ராகு சேர்க்கை — பூர்வ புண்ணிய குறை, தந்தை வழி தடைகள். பரிகாரம்: பித்ரு தர்ப்பணம், சூரிய வழிபாடு" });
  } else if (sun && saturn && sun.rashiIdx === saturn.rashiIdx) {
    yogas.push({ name:"பித்ரு தோஷம்", nameEn:"Pitru Dosha", type:"dosha", icon:"☉♄",
      desc:"சூரியன் + சனி சேர்க்கை — தந்தை/அரசாங்க தொடர்பில் தடைகள். பரிகாரம்: சனிக்கிழமை எள் தானம், பித்ரு வழிபாடு" });
  }

  // ITEM #17: குரு சண்டாள யோகம் (Guru Chandal Yoga)
  if (guru && rahu && guru.rashiIdx === rahu.rashiIdx) {
    yogas.push({ name:"குரு சண்டாள யோகம்", nameEn:"Guru Chandal Yoga", type:"dosha", icon:"♃☊",
      desc:"குரு + ராகு சேர்க்கை — ஞான/தர்ம பாதையில் குழப்பம், தவறான ஆலோசனை கிடைக்கும் வாய்ப்பு. பரிகாரம்: குரு வழிபாடு, வியாழக்கிழமை விரதம்" });
  }

  // ITEM #18: அங்காரக யோகம் (Angarak Yoga) — Mars + Rahu
  if (mars && rahu && mars.rashiIdx === rahu.rashiIdx) {
    yogas.push({ name:"அங்காரக யோகம்", nameEn:"Angarak Yoga", type:"dosha", icon:"♂☊",
      desc:"செவ்வாய் + ராகு சேர்க்கை — ஆபத்து, விபத்து, கோபம் அதிகரிக்கும் வாய்ப்பு. பரிகாரம்: செவ்வாய்க்கிழமை விரதம், ஹனுமான் வழிபாடு" });
  }

  // ITEM #19: கண்டாந்தம் (Gandanta) — Moon at water/fire sign junction (last 3°20' or first 3°20')
  if (moon) {
    const GANDANTA_JUNCTIONS = [[3,4],[7,8],[11,0]]; // Cancer-Leo, Scorpio-Sagittarius, Pisces-Aries
    GANDANTA_JUNCTIONS.forEach(([waterSign, fireSign]) => {
      if ((moon.rashiIdx === waterSign && moon.degExact >= 26.667) ||
          (moon.rashiIdx === fireSign && moon.degExact <= 3.333)) {
        yogas.push({ name:"கண்டாந்த தோஷம்", nameEn:"Gandanta Dosha", type:"dosha", icon:"☽🌊",
          desc:`சந்திரன் நீர்-நெருப்பு ராசி சந்திப்பில் (${RASHIS[waterSign]}/${RASHIS[fireSign]}) — ஆழ்மன சவால்கள், ஆன்மீக மாற்றம். பரிகாரம்: கண்டாந்த பூஜை, நீர் வழிபாடு` });
      }
    });
  }

  // ═══ ITEM #15: SARASWATI & LAKSHMI YOGA ═══

  // Saraswati Yoga: Jupiter, Venus, Mercury ALL in kendra/trikona/2nd house
  // + குரு சொந்த/நட்பு/உச்ச ராசியில் இருக்க வேண்டும் (classical துணை நிபந்தனை)
  if (guru && venus && mercury) {
    const goodHouses = [1,2,4,5,7,9,10]; // kendra + trikona + 2nd
    const guruLordRel = GRAHA_FRIENDSHIP["குரு"]?.friends.includes(RASHI_LORD_NAME[guru.rashiIdx]) ?? false;
    const guruDignified = guru.rashiIdx === EXALT_RASHI["குரு"] || OWN_RASHI["குரு"].includes(guru.rashiIdx) || guruLordRel;
    if (guruDignified && goodHouses.includes(guru.house) && goodHouses.includes(venus.house) && goodHouses.includes(mercury.house)) {
      yogas.push({ name:"சரஸ்வதி யோகம்", nameEn:"Saraswati Yoga", type:"yoga", icon:"📚",
        desc:"குரு, சுக்கிரன், புதன் மூவரும் கேந்திர/திரிகோண/2ஆம் வீட்டில் — அசாதாரண கல்வி, கலை, எழுத்தாற்றல், ஞானம் தரும் அரிய யோகம்" });
    }
  }

  // Lakshmi Yoga: 9th lord in kendra/trikona AND strong (own/exalt/MT), lagna lord also strong
  {
    const lord9Name = getHouseLord(lagnaRashiIdx, 9);
    const lord1Name = getHouseLord(lagnaRashiIdx, 1);
    const lord9P = find(lord9Name), lord1P = find(lord1Name);
    const isStrong = (p) => p && (p.rashiIdx === EXALT_RASHI[p.ta] || OWN_RASHI[p.ta]?.includes(p.rashiIdx) || isMoolaTrikona(p.ta, p.rashiIdx, p.degExact));
    const inGoodHouse = (p) => p && [1,4,5,7,9,10].includes(p.house);
    if (isStrong(lord9P) && inGoodHouse(lord9P) && isStrong(lord1P)) {
      yogas.push({ name:"லக்ஷ்மி யோகம்", nameEn:"Lakshmi Yoga", type:"yoga", icon:"🪷",
        desc:`9ஆம் வீட்டு நாதன் (${lord9Name}) பலமாக கேந்திர/திரிகோணத்தில் + லக்ன நாதன் (${lord1Name}) பலமாக — செல்வம், பாக்கியம், தெய்வ அருள் தரும் அரிய யோகம்` });
    }
  }

  return yogas;
}

// ═══════════════════════════════════════════════════════════════════
// அஷ்டகவர்க்கம் (ASHTAKAVARGA) — Classical Parashari bindu system
// 7 கிரகங்கள் × 8 reference points (7 கிரகங்கள் + லக்னம்) × 12 வீடுகள்
// Totals verified against traditional values: Sun48 Moon49 Mars39
// Mercury54 Jupiter56 Venus52 Saturn39 → Sarvashtakavarga total 337
// ═══════════════════════════════════════════════════════════════════
const BAV_RULES = {
  "சூரியன்": {
    "சூரியன்":[1,2,4,7,8,9,10,11], "சந்திரன்":[3,6,10,11], "செவ்வாய்":[1,2,4,7,8,9,10,11],
    "புதன்":[3,5,6,9,10,11,12], "குரு":[5,6,9,11], "சுக்கிரன்":[6,7,12],
    "சனி":[1,2,4,7,8,9,10,11], "லக்னம்":[3,4,6,10,11,12]
  },
  "சந்திரன்": {
    "சூரியன்":[3,6,7,8,10,11], "சந்திரன்":[1,3,6,7,10,11], "செவ்வாய்":[2,3,5,6,9,10,11],
    "புதன்":[1,3,4,5,7,8,10,11], "குரு":[1,4,7,8,10,11,12], "சுக்கிரன்":[3,4,5,7,9,10,11],
    "சனி":[3,5,6,11], "லக்னம்":[3,6,10,11]
  },
  "செவ்வாய்": {
    "சூரியன்":[3,5,6,10,11], "சந்திரன்":[3,6,11], "செவ்வாய்":[1,2,4,7,8,10,11],
    "புதன்":[3,5,6,11], "குரு":[6,10,11,12], "சுக்கிரன்":[6,8,11,12],
    "சனி":[1,4,7,8,9,10,11], "லக்னம்":[1,3,6,10,11]
  },
  "புதன்": {
    "சூரியன்":[5,6,9,11,12], "சந்திரன்":[2,4,6,8,10,11], "செவ்வாய்":[1,2,4,7,8,9,10,11],
    "புதன்":[1,3,5,6,9,10,11,12], "குரு":[6,8,11,12], "சுக்கிரன்":[1,2,3,4,5,8,9,11],
    "சனி":[1,2,4,7,8,9,10,11], "லக்னம்":[1,2,4,6,8,10,11]
  },
  "குரு": {
    "சூரியன்":[1,2,3,4,7,8,9,10,11], "சந்திரன்":[2,5,7,9,11], "செவ்வாய்":[1,2,4,7,8,10,11],
    "புதன்":[1,2,4,5,6,9,10,11], "குரு":[1,2,3,4,7,8,10,11], "சுக்கிரன்":[2,5,6,9,10,11],
    "சனி":[3,5,6,12], "லக்னம்":[1,2,4,5,6,7,9,10,11]
  },
  "சுக்கிரன்": {
    "சூரியன்":[8,11,12], "சந்திரன்":[1,2,3,4,5,8,9,11,12], "செவ்வாய்":[3,4,6,9,11,12],
    "புதன்":[3,5,6,9,11], "குரு":[5,8,9,10,11], "சுக்கிரன்":[1,2,3,4,5,8,9,10,11],
    "சனி":[3,4,5,8,9,10,11], "லக்னம்":[1,2,3,4,5,8,9,11]
  },
  "சனி": {
    "சூரியன்":[1,2,4,7,8,10,11], "சந்திரன்":[3,6,11], "செவ்வாய்":[3,5,6,10,11,12],
    "புதன்":[6,8,9,10,11,12], "குரு":[5,6,11,12], "சுக்கிரன்":[6,11,12],
    "சனி":[3,5,6,11], "லக்னம்":[1,3,4,6,10,11]
  }
};
const BAV_TOTALS = {"சூரியன்":48,"சந்திரன்":49,"செவ்வாய்":39,"புதன்":54,"குரு":56,"சுக்கிரன்":52,"சனி":39};

function calcAshtakavarga(placements, lagnaRashiIdx) {
  // Reference rashi index for each of the 8 contributors
  const refRashi = { "லக்னம்": lagnaRashiIdx };
  ["சூரியன்","சந்திரன்","செவ்வாய்","புதன்","குரு","சுக்கிரன்","சனி"].forEach(name => {
    const p = placements.find(pp => pp.ta === name);
    if (p) refRashi[name] = p.rashiIdx;
  });

  const bav = {}; // per-planet 12-house bindu array
  const targetPlanets = ["சூரியன்","சந்திரன்","செவ்வாய்","புதன்","குரு","சுக்கிரன்","சனி"];

  targetPlanets.forEach(target => {
    const houseCounts = new Array(12).fill(0);
    const rules = BAV_RULES[target];
    Object.keys(rules).forEach(refName => {
      const refIdx = refRashi[refName];
      if (refIdx === undefined) return;
      rules[refName].forEach(houseNum => {
        const actualRashi = (refIdx + houseNum - 1) % 12;
        houseCounts[actualRashi]++;
      });
    });
    bav[target] = houseCounts;
  });

  // Sarvashtakavarga — sum of all 7 planets' bindus per rashi
  const sav = new Array(12).fill(0);
  targetPlanets.forEach(t => bav[t].forEach((v,i) => sav[i]+=v));

  const savAvg = sav.reduce((a,b)=>a+b,0) / 12; // ~28.08

  return { bav, sav, savAvg: Math.round(savAvg*10)/10, totals: BAV_TOTALS };
}

// ═══════════════════════════════════════════════════════════════════
// கிரக திருஷ்டி (GRAHA DRISHTI) — Classical Parashari planetary aspects
// எல்லா கிரகங்களும் 7ஆம் வீட்டை பார்க்கும் (universal aspect)
// செவ்வாய்: 4,7,8 | குரு: 5,7,9 | சனி: 3,7,10 (special aspects)
// ═══════════════════════════════════════════════════════════════════
const DRISHTI_RULES = {
  default: [7],
  "செவ்வாய்": [4,7,8],
  "குரு": [5,7,9],
  "சனி": [3,7,10]
};
const CLASSICAL_7 = ["சூரியன்","சந்திரன்","செவ்வாய்","புதன்","குரு","சுக்கிரன்","சனி"];

// பார்வை பலன் — classical tone of each planet's full drishti falling ON a house
// (BPHS: benefic drishti protects/expands the bhava, malefic drishti afflicts it)
const DRISHTI_EFFECT = {
  "சூரியன்":  { tone:"mixed",   text:"அதிகாரம், வெளிப்படைத்தன்மை தரும் — ஆனால் சற்று வறட்சி; அரசு/தந்தை தொடர்பு" },
  "சந்திரன்": { tone:"benefic", text:"மனவளம், கவனிப்பு, மக்கள் ஆதரவு சேர்க்கும்" },
  "செவ்வாய்": { tone:"malefic", text:"ஆற்றலும் விரைவும் தரும், ஆனால் மோதல்/அவசரம் சேரும் — கவனம் தேவை" },
  "புதன்":    { tone:"benefic", text:"புத்திக்கூர்மை, பேச்சு/தொடர்பு மேம்பாடு சேர்க்கும்" },
  "குரு":     { tone:"benefic", text:"பாதுகாப்பு, விரிவாக்கம், தெய்வ அருள் — இவ்வீட்டு பலன்களை உயர்த்தும்" },
  "சுக்கிரன்": { tone:"benefic", text:"சுகம், இனிமை, கலை நயம் சேர்க்கும்" },
  "சனி":      { tone:"malefic", text:"தாமதம், கட்டுப்பாடு, பொறுப்பு — பலன்கள் உழைப்பிற்குப் பின் தாமதமாகக் கிடைக்கும்" }
};

// எந்தக் கிரகங்கள் ஒரு வீட்டை (whole-sign) பார்க்கின்றன — occupants excluded.
// Classical Parashari drishti: 7 planets only (nodes have no drishti in BPHS).
function aspectorsOnHouse(placements, lagnaIdx, houseRashiIdx) {
  return placements.filter(p => {
    if (!CLASSICAL_7.includes(p.ta)) return false;
    if (p.rashiIdx === houseRashiIdx) return false;
    const rules = DRISHTI_RULES[p.ta] || DRISHTI_RULES.default;
    const offset = ((houseRashiIdx - p.rashiIdx + 12) % 12) + 1;
    return rules.includes(offset);
  }).map(p => ({
    planet: p.ta, symbol: p.symbol,
    fromHouse: ((p.rashiIdx - lagnaIdx + 12) % 12) + 1,
    tone: DRISHTI_EFFECT[p.ta]?.tone || "mixed",
    text: DRISHTI_EFFECT[p.ta]?.text || ""
  }));
}

function calcGrahaDrishti(placements) {
  const aspects = [];
  const classicalPlanets = placements.filter(p => CLASSICAL_7.includes(p.ta));
  classicalPlanets.forEach(from => {
    const rule = DRISHTI_RULES[from.ta] || DRISHTI_RULES.default;
    classicalPlanets.forEach(to => {
      if (from.ta === to.ta) return;
      const houseOffset = ((to.rashiIdx - from.rashiIdx + 12) % 12) + 1;
      if (rule.includes(houseOffset)) {
        aspects.push({
          from: from.ta, fromSymbol: from.symbol,
          to: to.ta, toSymbol: to.symbol,
          houseOffset, isSpecial: houseOffset !== 7
        });
      }
    });
  });
  return aspects;
}

// ═══════════════════════════════════════════════════════════════════
// D10 தசாம்சம் (DASAMSA) — தொழில் / பதவி பிரிவு சக்கரம்
// ஒவ்வொரு ராசியும் 10 பாகங்களாக (3° ஒவ்வொன்றும்) பிரிக்கப்படுகிறது
// ஒற்றைப்படை ராசி: அதே ராசியிலிருந்து தொடங்கும் | இரட்டைப்படை: 9ஆம் ராசியிலிருந்து
// ═══════════════════════════════════════════════════════════════════
function calcD10Dasamsa(placements) {
  return placements.map(p => {
    const part = Math.min(9, Math.floor(p.degExact / 3)); // 0-9
    const isOddRashi = p.rashiIdx % 2 === 0; // rashiIdx 0=மேஷம் is traditionally "odd" sign
    const startRashi = isOddRashi ? p.rashiIdx : (p.rashiIdx + 8) % 12;
    const d10Rashi = (startRashi + part) % 12;
    return { ...p, d10Rashi, d10RashiName: RASHIS[d10Rashi] };
  });
}

// ═══════════════════════════════════════════════════════════════════
// D2 ஹோரை (HORA) — செல்வம் பிரிவு சக்கரம்
// ஒற்றைப்படை ராசி: 0-15°→சூரிய ஹோரை(சிம்மம்), 15-30°→சந்திர ஹோரை(கடகம்)
// இரட்டைப்படை ராசி: நேர்மாறு. D2-ல் இரண்டே ராசிகள் மட்டுமே சாத்தியம்.
// ═══════════════════════════════════════════════════════════════════
function calcD2Hora(placements) {
  const SIMMAM = 4, KADAKAM = 3; // சிம்மம், கடகம்
  return placements.map(p => {
    const isOddRashi = p.rashiIdx % 2 === 0;
    const firstHalf = p.degExact < 15;
    let d2Rashi;
    if (isOddRashi) d2Rashi = firstHalf ? SIMMAM : KADAKAM;
    else d2Rashi = firstHalf ? KADAKAM : SIMMAM;
    return { ...p, d2Rashi, d2RashiName: RASHIS[d2Rashi], d2Lord: d2Rashi === SIMMAM ? "சூரிய ஹோரை" : "சந்திர ஹோரை" };
  });
}

// ═══════════════════════════════════════════════════════════════════
// D3 திரேக்காணம் (DREKKANA) — சகோதரர்கள் பிரிவு சக்கரம்
// ஒவ்வொரு ராசியும் 3 பாகங்கள் (10° ஒவ்வொன்றும்): அதே ராசி → 5ஆம் ராசி → 9ஆம் ராசி
// ═══════════════════════════════════════════════════════════════════
function calcD3Drekkana(placements) {
  return placements.map(p => {
    const part = Math.min(2, Math.floor(p.degExact / 10)); // 0-2
    const d3Rashi = (p.rashiIdx + part * 4) % 12;
    return { ...p, d3Rashi, d3RashiName: RASHIS[d3Rashi] };
  });
}

// ═══════════════════════════════════════════════════════════════════
// D12 துவாதசாம்சம் (DWADASAMSA) — பெற்றோர் பிரிவு சக்கரம்
// ஒவ்வொரு ராசியும் 12 பாகங்கள் (2.5° ஒவ்வொன்றும்), எப்போதும் அதே ராசியிலிருந்து தொடங்கும்
// ═══════════════════════════════════════════════════════════════════
function calcD12Dwadasamsa(placements) {
  return placements.map(p => {
    const part = Math.min(11, Math.floor(p.degExact / 2.5)); // 0-11
    const d12Rashi = (p.rashiIdx + part) % 12;
    return { ...p, d12Rashi, d12RashiName: RASHIS[d12Rashi] };
  });
}

// ═══════════════════════════════════════════════════════════════════
// D30 திரிம்சாம்சம் (TRIMSAMSA) — BPHS Ch.6: misfortune/disease analysis
// Odd signs: Mars(0-5°), Saturn(5-10°), Jupiter(10-18°), Mercury(18-25°), Venus(25-30°)
// Even signs: Venus(0-5°), Mercury(5-12°), Jupiter(12-20°), Saturn(20-25°), Mars(25-30°)
// The resulting rashi = the Moolatrikona sign of the ruling planet
// ═══════════════════════════════════════════════════════════════════
const D30_ODD_RULERS  = [[0,5,"செவ்வாய்"],[5,10,"சனி"],[10,18,"குரு"],[18,25,"புதன்"],[25,30,"சுக்கிரன்"]];
const D30_EVEN_RULERS = [[0,5,"சுக்கிரன்"],[5,12,"புதன்"],[12,20,"குரு"],[20,25,"சனி"],[25,30,"செவ்வாய்"]];
// BPHS விதி: ஒற்றை ராசியில் திரிம்சாம்சம் = அதிபதியின் ஒற்றை ராசி
// (செவ்வாய்→மேஷம், சனி→கும்பம், குரு→தனுசு, புதன்→மிதுனம், சுக்→துலாம்);
// இரட்டை ராசியில் = அதிபதியின் இரட்டை ராசி (சுக்→ரிஷபம், புதன்→கன்னி,
// குரு→மீனம், சனி→மகரம், செவ்→விருச்சிகம்).
// (முன்பு Moolatrikona ராசி பயன்பட்டு 10-இல் 5 பிரிவுகள் தவறான ராசியில் விழுந்தன.)
const D30_ODD_SIGN  = { "செவ்வாய்":0, "சனி":10, "குரு":8, "புதன்":2, "சுக்கிரன்":6 };
const D30_EVEN_SIGN = { "சுக்கிரன்":1, "புதன்":5, "குரு":11, "சனி":9, "செவ்வாய்":7 };
function calcD30Trimsamsa(placements) {
  return placements.map(p => {
    const isOdd = p.rashiIdx % 2 === 0; // 0=Aries(odd)
    const rules = isOdd ? D30_ODD_RULERS : D30_EVEN_RULERS;
    const ruler = rules.find(([from, to]) => p.degExact >= from && p.degExact < to);
    const d30Lord = ruler ? ruler[2] : "செவ்வாய்";
    const d30Rashi = isOdd ? D30_ODD_SIGN[d30Lord] : D30_EVEN_SIGN[d30Lord];
    return { ...p, d30Rashi, d30RashiName: RASHIS[d30Rashi], d30Lord };
  });
}

// ═══════════════════════════════════════════════════════════════════
// சப்தவர்கஜ பலம் (SAPTAVARGAJA BALA) — BPHS Ch.27.5-7
// Planet's dignity across 7 vargas: D1,D2,D3,D7,D9,D12,D30
// Each varga gives virupas based on dignity in that chart:
// Moolatrikona=45, Own=30, Great Friend=22.5, Friend=15,
// Neutral=7.5, Enemy=3.75, Great Enemy=1.875
// ═══════════════════════════════════════════════════════════════════
function calcSaptavargajaBala(p, lagnaIdx, placements) {
  // Compute rashi in each of the 7 vargas
  const d1Rashi = p.rashiIdx;
  const isOddD2 = p.rashiIdx % 2 === 0;
  const d2Rashi = (isOddD2 ? (p.degExact < 15 ? 4 : 3) : (p.degExact < 15 ? 3 : 4)); // Leo or Cancer
  const d3Rashi = (p.rashiIdx + Math.min(2, Math.floor(p.degExact / 10)) * 4) % 12;
  const d7Part = Math.min(6, Math.floor(p.degExact / (30/7)));
  const d7Start = (p.rashiIdx % 2 === 0) ? p.rashiIdx : (p.rashiIdx + 6) % 12;
  const d7Rashi = (d7Start + d7Part) % 12;
  const d9Part = Math.floor(p.degExact / (30/9));
  const d9Rashi = (p.rashiIdx * 9 + d9Part) % 12;
  const d12Rashi = (p.rashiIdx + Math.min(11, Math.floor(p.degExact / 2.5))) % 12;
  // D30
  const isOddD30 = p.rashiIdx % 2 === 0;
  const d30Rules = isOddD30 ? D30_ODD_RULERS : D30_EVEN_RULERS;
  const d30Ruler = d30Rules.find(([from, to]) => p.degExact >= from && p.degExact < to);
  const d30Lord = d30Ruler ? d30Ruler[2] : "செவ்வாய்";
  // BPHS: ஒற்றை ராசி → அதிபதியின் ஒற்றை ராசி; இரட்டை → இரட்டை ராசி
  const d30Rashi = isOddD30 ? D30_ODD_SIGN[d30Lord] : D30_EVEN_SIGN[d30Lord];

  const vargas = [d1Rashi, d2Rashi, d3Rashi, d7Rashi, d9Rashi, d12Rashi, d30Rashi];

  // Tatkalika Maitri (temporal friendship): planets within 2,3,4,10,11,12 houses
  // from each other in D1 are temporal friends; rest are temporal enemies
  const TEMP_FRIEND_HOUSES = [2,3,4,10,11,12];
  function getTatkalikaMaitri(planetName, otherName) {
    const pp = placements.find(x => x.ta === planetName);
    const op = placements.find(x => x.ta === otherName);
    if (!pp || !op) return "neutral";
    const hDiff = ((op.rashiIdx - pp.rashiIdx + 12) % 12) + 1;
    return TEMP_FRIEND_HOUSES.includes(hDiff) ? "friend" : "enemy";
  }

  // Pancha-dha Maitri (5-fold combined): Naisargika + Tatkalika
  function getCombinedRelation(planetName, lordName) {
    if (planetName === lordName) return "own"; // own sign
    const naisargika = GRAHA_FRIENDSHIP[planetName];
    if (!naisargika) return "neutral";
    const isFriendN = naisargika.friends.includes(lordName);
    const isEnemyN = naisargika.enemies.includes(lordName);
    const tatkalika = getTatkalikaMaitri(planetName, lordName);
    const isFriendT = tatkalika === "friend";

    // Classical பஞ்சதா மைத்ரி அட்டவணை:
    // இயற்கை நண்பன்+தற்கால நண்பன்=அதிமித்ரன் • நண்பன்+பகை=சமன் •
    // சமன்+நண்பன்=மித்ரன் • சமன்+பகை=சத்ரு • பகை+நண்பன்=சமன் • பகை+பகை=அதிசத்ரு
    if (isFriendN && isFriendT) return "greatFriend";
    if (isFriendN && !isFriendT) return "neutral";   // நண்பன்+தற்கால பகை = சமன்
    if (!isFriendN && !isEnemyN && isFriendT) return "friend";
    if (!isFriendN && !isEnemyN && !isFriendT) return "enemy"; // சமன்+தற்கால பகை = சத்ரு
    if (isEnemyN && isFriendT) return "neutral";
    if (isEnemyN && !isFriendT) return "greatEnemy";
    return "neutral";
  }

  // Score each varga — classical சப்தவர்கஜ மதிப்புகள்: மூலத்திரிகோணம் 45,
  // சொந்த ராசி 30, அதிமித்ரன் 22.5, மித்ரன் 15, சமன் 7.5, சத்ரு 3.75,
  // அதிசத்ரு 1.875. உச்ச ராசிக்கு தனி score classical-இல் இல்லை (அது Uchcha
  // Bala-வில் தனியே வருகிறது) — உச்ச ராசியிலும் ஆட்சி-உறவின்படியே score.
  // மூலத்திரிகோணம்: D1-இல் மட்டும் degree-வீச்சுடன்; உப-வர்கங்களில் MT ராசி =
  // சொந்த ராசி (30) என்றே கணக்கு.
  const VARGA_SCORES = { moolaTrikona: 45, own: 30, greatFriend: 22.5, friend: 15, neutral: 7.5, enemy: 3.75, greatEnemy: 1.875 };

  let totalSaptavargaja = 0;
  vargas.forEach((vRashi, vi) => {
    const isD1 = vi === 0;
    if (isD1 && isMoolaTrikona(p.ta, vRashi, p.degExact)) { totalSaptavargaja += VARGA_SCORES.moolaTrikona; }
    else if (OWN_RASHI[p.ta]?.includes(vRashi) || (MOOLA_TRIKONA[p.ta] && vRashi === MOOLA_TRIKONA[p.ta].rashi)) {
      totalSaptavargaja += VARGA_SCORES.own;
    }
    else {
      const lord = RASHI_LORD_NAME[vRashi];
      const rel = getCombinedRelation(p.ta, lord);
      totalSaptavargaja += VARGA_SCORES[rel] || VARGA_SCORES.neutral;
    }
  });

  return Math.round(totalSaptavargaja * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════
// D60 ஷஷ்டியாம்சம் (SHASHTIAMSA) — கர்ம பிரிவு சக்கரம்
// ஒவ்வொரு ராசியும் 60 பாகங்கள் (0.5° ஒவ்வொன்றும்)
// ═══════════════════════════════════════════════════════════════════
const D60_NAMES = [
  "கோரம்","ராக்ஷசம்","தேவம்","குபேரம்","யக்ஷம்","கிந்நரம்","பிரேதம்","சர்ப்பம்",
  "இந்திரம்","பிரம்மம்","வாயுவம்","தேஜஸ்","கௌரவம்","மாயம்","பூஷணம்","விஷ்ணுவம்",
  "மித்திரம்","மாயா","கார்யம்","நாகம்","அம்ருதம்","சந்த்ரம்","மிருதுவம்","கோமேதகம்",
  "மந்திரம்","மந்திரா","அம்சம்","மிருகம்","நிர்மலம்","சுபம்","அசுபம்","அதிசாரம்",
  "சூரம்","தேவகண்டம்","காலம்","சர்ப்பா","இந்துவம்","உமம்","அமலம்","பூர்ணசந்த்ரம்",
  "விஷதக்கினி","குலநாசம்","வம்சக்ஷயம்","உத்பாதம்","காலா","சௌம்யம்","கோமேதம்","ரோகம்",
  "பயம்","வஜ்ரம்","துக்கம்","யமகண்டம்","தேவிகா","நிர்மதம்","சுமதி","கிருஷ்ணம்",
  "சௌந்தர்யம்","கௌலம்","சுத்தம்","அம்ருதா"
];
const D60_NATURE = [
  "தீய","தீய","நல்ல","நல்ல","நல்ல","நல்ல","தீய","தீய",
  "நல்ல","நல்ல","நல்ல","நல்ல","நல்ல","தீய","நல்ல","நல்ல",
  "நல்ல","தீய","நல்ல","தீய","நல்ல","நல்ல","நல்ல","நல்ல",
  "நல்ல","நல்ல","நல்ல","நடுநிலை","நல்ல","நல்ல","தீய","தீய",
  "நல்ல","தீய","தீய","தீய","நல்ல","நல்ல","நல்ல","நல்ல",
  "தீய","தீய","தீய","தீய","தீய","நல்ல","நல்ல","தீய",
  "தீய","நல்ல","தீய","தீய","நல்ல","நல்ல","நல்ல","நல்ல",
  "நல்ல","நல்ல","நல்ல","நல்ல"
];

function calcD60Shashtiamsa(placements) {
  return placements.map(p => {
    const part = Math.min(59, Math.floor(p.degExact / 0.5));
    const isOddRashi = p.rashiIdx % 2 === 0;
    const idx = isOddRashi ? part : (59 - part);
    // Fixed: classical rule (BPHS, per Wikipedia's Shashtyamsha article and cross-verified
    // against three independent worked examples) is "count (degree×2 mod 12)+1 signs FROM
    // THE PLANET'S OWN SIGN" — i.e. d60Rashi = (rashiIdx + part) % 12. The previous formula
    // (rashiIdx*5 + floor(part/5)) % 12 was unrelated to this rule and gave a different,
    // wrong sign for 81% of sample degree/sign combinations tested. The deity/name index
    // above (idx, forward for odd signs / reversed for even) was already correct and is
    // unchanged — only the resulting RASHI was wrong.
    const d60Rashi = (p.rashiIdx + part) % 12;
    return {
      ...p,
      d60Rashi,
      d60RashiName: RASHIS[d60Rashi],
      d60Part: idx + 1,
      d60Name: D60_NAMES[idx] || `D60-${idx+1}`,
      d60Nature: D60_NATURE[idx] || "நடுநிலை"
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// 1. கால சர்ப்ப தோஷம் (KALA SARPA DOSHA)
// ═══════════════════════════════════════════════════════════════════
const KALA_SARPA_TYPES = [
  "அனந்த","குளிக","வாசுகி","சங்கபால","பதும","மஹாபதும",
  "தக்ஷக","கார்கோடக","சங்கசூட","பாதாள","விஷதர","சேஷநாக"
];
function detectKalaSarpa(placements, lagnaIdx) {
  const rahu = placements.find(p => p.ta === "ராகு");
  const ketu = placements.find(p => p.ta === "கேது");
  if (!rahu || !ketu) return null;
  const rahuIdx = rahu.rashiIdx, ketuIdx = ketu.rashiIdx;
  const others = placements.filter(p => p.ta !== "ராகு" && p.ta !== "கேது");
  // Degree-அடிப்படையிலான hemisphere test — ராகு/கேது அச்சிலிருந்து ஒவ்வொரு
  // கிரகத்தின் உண்மை தீர்க்காம்சம் (fullLong) எந்தப் பக்கம் என்று பார்க்கிறோம்.
  // (முன்பு ராசி எண்ணை strict >/< உடன் ஒப்பிட்டதால், ராகு/கேது இருக்கும் அதே
  // ராசியில் இருக்கும் கிரகம் — degree-படி அச்சுக்குள் இருந்தாலும் — தோஷத்தை
  // ரத்து செய்தது.)
  const arcFromRahu = (lng) => ((lng - rahu.fullLong) % 360 + 360) % 360;
  const ketuArc = arcFromRahu(ketu.fullLong); // ≈180
  let allBetweenForward = true, allBetweenReverse = true;
  others.forEach(p => {
    const a = arcFromRahu(p.fullLong);
    const fwd = a > 0 && a < ketuArc;        // ராகு→கேது வளைவில்
    const rev = a > ketuArc && a < 360;      // கேது→ராகு வளைவில்
    if (!fwd) allBetweenForward = false;
    if (!rev) allBetweenReverse = false;
  });
  if (!allBetweenForward && !allBetweenReverse) {
    // பகுதி (partial) கால சர்ப்பம் — ஒரே ஒரு கிரகம் மட்டும் வெளியில்
    const fwdOutside = others.filter(p => { const a = arcFromRahu(p.fullLong); return !(a > 0 && a < ketuArc); });
    const revOutside = others.filter(p => { const a = arcFromRahu(p.fullLong); return !(a > ketuArc && a < 360); });
    const minOutside = Math.min(fwdOutside.length, revOutside.length);
    if (minOutside === 1) {
      const outP = (fwdOutside.length === 1 ? fwdOutside : revOutside)[0];
      const isFwdP = fwdOutside.length === 1;
      const typeHouse = lagnaIdx != null ? ((rahuIdx - lagnaIdx + 12) % 12) + 1 : rahuIdx + 1;
      return {
        present: true, partial: true,
        type: (KALA_SARPA_TYPES[typeHouse - 1] || "") + " கால சர்ப்பம் (பகுதி)",
        direction: isFwdP ? "கால சர்ப்பம் (ராகு→கேது) — பகுதி" : "கால அம்ருத யோகம் (கேது→ராகு) — பகுதி",
        outsidePlanet: outP.ta,
        rahuRashi: rahu.rashi, ketuRashi: ketu.rashi,
        remedy: "நாகதோஷ நிவர்த்தி பூஜை, ராகு-கேது பெயர்ச்சியில் சிறப்பு வழிபாடு, காளஹஸ்தி / திருநாகேஸ்வரம் தரிசனம்"
      };
    }
    return { present: false };
  }
  const isForward = allBetweenForward;
  // Fixed: the classical 12 Kala Sarpa type names (Ananta, Kulika, Vasuki, ...) are
  // determined by which HOUSE (bhava, counted from Lagna) Rahu occupies — not by
  // Rahu's absolute zodiac sign, which is what this previously (incorrectly) indexed
  // KALA_SARPA_TYPES with. A chart with Rahu in the same sign but a different Lagna
  // would then get the wrong type name. Now computes the actual house-from-Lagna.
  // வகைப் பெயர் இரு திசைகளிலும் ராகுவின் வீட்டிலிருந்தே (classical convention)
  const typeRashiIdx = rahuIdx;
  const typeHouseFromLagna = lagnaIdx != null ? ((typeRashiIdx - lagnaIdx + 12) % 12) + 1 : typeRashiIdx + 1;
  const typeName = KALA_SARPA_TYPES[typeHouseFromLagna - 1] || "";
  return {
    present: true,
    type: typeName + " கால சர்ப்பம்",
    direction: isForward ? "கால சர்ப்பம் (ராகு→கேது)" : "கால அம்ருத யோகம் (கேது→ராகு)",
    rahuRashi: rahu.rashi, ketuRashi: ketu.rashi,
    remedy: "நாகதோஷ நிவர்த்தி பூஜை, ராகு-கேது பெயர்ச்சியில் சிறப்பு வழிபாடு, காளஹஸ்தி / திருநாகேஸ்வரம் தரிசனம்"
  };
}

// ═══════════════════════════════════════════════════════════════════
// 2. செவ்வாய் தோஷம் (MANGLIK / CHEVVAI DOSHAM)
// ═══════════════════════════════════════════════════════════════════
function detectChevvaiDosham(placements, lagnaIdx) {
  const mars = placements.find(p => p.ta === "செவ்வாய்");
  const moon = placements.find(p => p.ta === "சந்திரன்");
  const venus = placements.find(p => p.ta === "சுக்கிரன்");
  if (!mars) return null;
  const doshaHouses = [1,2,4,7,8,12];
  const marsHouseFromLagna = ((mars.rashiIdx - lagnaIdx + 12) % 12) + 1;
  const marsHouseFromMoon = moon ? ((mars.rashiIdx - moon.rashiIdx + 12) % 12) + 1 : 0;
  const marsHouseFromVenus = venus ? ((mars.rashiIdx - venus.rashiIdx + 12) % 12) + 1 : 0;
  const fromLagna = doshaHouses.includes(marsHouseFromLagna);
  const fromMoon = doshaHouses.includes(marsHouseFromMoon);
  const fromVenus = doshaHouses.includes(marsHouseFromVenus);
  const present = fromLagna || fromMoon || fromVenus;
  const severity = (fromLagna ? 1 : 0) + (fromMoon ? 1 : 0) + (fromVenus ? 1 : 0);
  // Cancellation checks
  let cancelled = false, cancelReason = "";
  if (present) {
    const jupiter = placements.find(p => p.ta === "குரு");
    if (mars.rashiIdx === EXALT_RASHI["செவ்வாய்"] || OWN_RASHI["செவ்வாய்"].includes(mars.rashiIdx)) {
      cancelled = true; cancelReason = "செவ்வாய் சொந்த/உச்ச வீட்டில் — தோஷ நிவர்த்தி";
    }
    if (jupiter) {
      const isConjunct = ((jupiter.rashiIdx - lagnaIdx + 12) % 12) + 1 === marsHouseFromLagna;
      // Fixed: this previously only checked conjunction (same house) despite the
      // cancelReason text claiming "aspect or conjunction". Classical Jupiter aspects
      // (per DRISHTI_RULES) are the 5th, 7th and 9th house counted from Jupiter itself —
      // now actually checks whether Mars falls in one of those houses from Jupiter.
      const marsHouseFromJupiter = ((mars.rashiIdx - jupiter.rashiIdx + 12) % 12) + 1;
      const isAspected = [5,7,9].includes(marsHouseFromJupiter);
      if (isConjunct || isAspected) {
        cancelled = true;
        // முந்தைய காரணத்தை (சொந்த/உச்ச வீடு) அழிக்காமல் இணைக்கிறோம்
        cancelReason = cancelReason
          ? cancelReason + " • குரு பார்வை/சேர்க்கையால் கூடுதல் நிவர்த்தி"
          : "குரு பார்வை/சேர்க்கையால் தோஷ நிவர்த்தி";
      }
    }
  }
  return {
    present, cancelled, cancelReason, severity,
    fromLagna, fromMoon, fromVenus,
    marsRashi: mars.rashi,
    marsHouseFromLagna, marsHouseFromMoon, marsHouseFromVenus,
    severityText: severity >= 3 ? "முழு தோஷம்" : severity === 2 ? "பகுதி தோஷம்" : "லேசான தோஷம்",
    remedy: "செவ்வாய் தோஷ நிவர்த்தி: செவ்வாய்க்கிழமை விரதம், சுப்பிரமணியர் வழிபாடு, பவள மோதிரம் அணிதல்"
  };
}

// ═══════════════════════════════════════════════════════════════════
// 3. பாவ சக்கரம் (BHAVA CHART — Equal House System)
// ═══════════════════════════════════════════════════════════════════
function calcBhavaChart(placements, lagnaFullDeg) {
  const bhavaCusps = [];
  for (let i = 0; i < 12; i++) {
    // Fixed: this previously rounded lagnaFullDeg down to its sign's start
    // (lagnaFullDeg - (lagnaFullDeg % 30)) before placing cusps at 30° sign boundaries —
    // which makes every cusp coincide with a whole-sign boundary, so bhavaHouse always
    // equals the already-existing whole-sign p.house and bhavaDiff was always false,
    // silently defeating the entire point of a separate Bhava/Chalit chart. Using the
    // exact lagna degree directly makes House 1's cusp the true ascendant point, with
    // each house exactly 30° further — a genuine Equal-House-from-Lagna system whose
    // cusps generally do NOT align with sign boundaries, so planets near a sign edge can
    // now correctly show a different Bhava house than their simple Rashi house.
    const cusp = (lagnaFullDeg + i * 30) % 360;
    const mid = (cusp + 15) % 360;
    bhavaCusps.push({
      house: i + 1,
      cuspDeg: cusp,
      midDeg: mid,
      rashiIdx: Math.floor(cusp / 30),
      rashiName: RASHIS[Math.floor(cusp / 30)],
      lord: RASHI_LORD_NAME[Math.floor(cusp / 30)]
    });
  }
  const bhavaPlanets = placements.map(p => {
    const fullDeg = p.rashiIdx * 30 + p.degExact;
    let bhavaHouse = 1;
    for (let i = 0; i < 12; i++) {
      const start = bhavaCusps[i].cuspDeg;
      const end = bhavaCusps[(i + 1) % 12].cuspDeg;
      if (end > start) {
        if (fullDeg >= start && fullDeg < end) { bhavaHouse = i + 1; break; }
      } else {
        if (fullDeg >= start || fullDeg < end) { bhavaHouse = i + 1; break; }
      }
    }
    return { ...p, bhavaHouse, bhavaDiff: bhavaHouse !== p.house };
  });
  return { cusps: bhavaCusps, planets: bhavaPlanets };
}

// ═══════════════════════════════════════════════════════════════════
// 4. நவாம்ச பல பகுப்பாய்வு (D9 NAVAMSA STRENGTH ANALYSIS)
// ═══════════════════════════════════════════════════════════════════
function calcNavamsaStrength(placements) {
  return placements.filter(p => EXALT_RASHI[p.ta] !== undefined).map(p => {
    const navPart = Math.floor(p.degExact / (30/9));
    const navRashi = (p.rashiIdx * 9 + navPart) % 12;
    const vargottama = navRashi === p.rashiIdx;
    // புஷ்கர நவாம்சம் — element-அடிப்படை விதி (0-indexed navamsa part):
    // நெருப்பு ராசிகள் {6,8} • மண் {2,4} • காற்று {5,7} • நீர் {0,2}.
    // (பழைய fixed [3,6,8,11] பட்டியலில் 11 ஒருபோதும் பொருந்தாது — navPart 0-8.)
    const PUSHKARA_NAV_BY_ELEMENT = [[6,8],[2,4],[5,7],[0,2]]; // fire, earth, air, water
    const pushkara = PUSHKARA_NAV_BY_ELEMENT[p.rashiIdx % 4].includes(navPart);
    let d9Status, d9StatusColor;
    if (navRashi === EXALT_RASHI[p.ta]) { d9Status = "உச்சம்"; d9StatusColor = "#0d7a30"; }
    else if (navRashi === DEBIL_RASHI[p.ta]) { d9Status = "நீசம்"; d9StatusColor = "#cc1a1a"; }
    else if (MOOLA_TRIKONA[p.ta] && navRashi === MOOLA_TRIKONA[p.ta].rashi) { d9Status = "மூலத்திரிகோணம்"; d9StatusColor = "#0d7a30"; }
    else if (OWN_RASHI[p.ta].includes(navRashi)) { d9Status = "சொந்த வீடு"; d9StatusColor = "#0d7a30"; }
    else {
      const lord = RASHI_LORD_NAME[navRashi];
      const fr = GRAHA_FRIENDSHIP[p.ta];
      if (fr.friends.includes(lord)) { d9Status = "நட்பு"; d9StatusColor = "#b8860b"; }
      else if (fr.enemies.includes(lord)) { d9Status = "பகை"; d9StatusColor = "#cc1a1a"; }
      else { d9Status = "சமன்"; d9StatusColor = "#666666"; }
    }
    return { ...p, navRashi, navRashiName: RASHIS[navRashi], vargottama, pushkara, d9Status, d9StatusColor };
  });
}

// ═══════════════════════════════════════════════════════════════════
// 5. D4 சதுர்த்தாம்சம் (CHATURTHAMSA — சொத்து, வாகனம்)
//    D7 சப்தாம்சம் (SAPTAMSA — குழந்தை பாக்கியம்)
// ═══════════════════════════════════════════════════════════════════
function calcD4Chaturthamsa(placements) {
  return placements.map(p => {
    const part = Math.min(3, Math.floor(p.degExact / 7.5));
    const d4Rashi = (p.rashiIdx + part * 3) % 12;
    return { ...p, d4Rashi, d4RashiName: RASHIS[d4Rashi] };
  });
}
function calcD7Saptamsa(placements) {
  return placements.map(p => {
    const part = Math.min(6, Math.floor(p.degExact / (30/7)));
    const isOddRashi = p.rashiIdx % 2 === 0;
    const startRashi = isOddRashi ? p.rashiIdx : (p.rashiIdx + 6) % 12;
    const d7Rashi = (startRashi + part) % 12;
    return { ...p, d7Rashi, d7RashiName: RASHIS[d7Rashi] };
  });
}

// ═══════════════════════════════════════════════════════════════════
// ADDITIONAL SHODASHAVARGA CHARTS (Parashari BPHS counting rules)
// Sign class by index: movable(chara)=idx%3===0, fixed(sthira)=idx%3===1,
// dual(dvisvabhava)=idx%3===2. Element = idx%4 (0=fiery,1=earthy,2=airy,3=watery).
// "Odd" sign = idx%2===0 (Aries, the 1st sign, is odd). Completes the 16-chart set.
// ═══════════════════════════════════════════════════════════════════

// D16 ஷோடசாம்சம் (Kalamsa) — வாகனம், சுகபோகம். 1.875° each. Movable→Aries, Fixed→Leo, Dual→Sagittarius.
function calcD16Shodasamsa(placements) {
  return placements.map(p => {
    const part = Math.min(15, Math.floor(p.degExact / (30/16)));
    const cls = p.rashiIdx % 3;
    const start = cls === 0 ? 0 : cls === 1 ? 4 : 8;
    const d16Rashi = (start + part) % 12;
    return { ...p, d16Rashi, d16RashiName: RASHIS[d16Rashi] };
  });
}

// D20 விம்சாம்சம் (Vimsamsa) — ஆன்மீகம், வழிபாடு. 1.5° each. Movable→Aries, Fixed→Sagittarius, Dual→Leo.
function calcD20Vimsamsa(placements) {
  return placements.map(p => {
    const part = Math.min(19, Math.floor(p.degExact / 1.5));
    const cls = p.rashiIdx % 3;
    const start = cls === 0 ? 0 : cls === 1 ? 8 : 4;
    const d20Rashi = (start + part) % 12;
    return { ...p, d20Rashi, d20RashiName: RASHIS[d20Rashi] };
  });
}

// D24 சதுர்விம்சாம்சம் (Siddhamsa) — கல்வி, அறிவு. 1.25° each. Odd→Leo, Even→Cancer.
function calcD24Siddhamsa(placements) {
  return placements.map(p => {
    const part = Math.min(23, Math.floor(p.degExact / 1.25));
    const start = (p.rashiIdx % 2 === 0) ? 4 : 3;
    const d24Rashi = (start + part) % 12;
    return { ...p, d24Rashi, d24RashiName: RASHIS[d24Rashi] };
  });
}

// D27 பம்சம் / நக்ஷத்திராம்சம் (Bhamsa) — பலம்/பலவீனம். 1.111° each.
// Fiery→Aries, Earthy→Cancer, Airy→Libra, Watery→Capricorn.
function calcD27Bhamsa(placements) {
  return placements.map(p => {
    const part = Math.min(26, Math.floor(p.degExact / (30/27)));
    const start = [0,3,6,9][p.rashiIdx % 4];
    const d27Rashi = (start + part) % 12;
    return { ...p, d27Rashi, d27RashiName: RASHIS[d27Rashi] };
  });
}

// D40 கவேதாம்சம் (Khavedamsa) — தாய்வழி, சுப/அசுபம். 0.75° each. Odd→Aries, Even→Libra.
function calcD40Khavedamsa(placements) {
  return placements.map(p => {
    const part = Math.min(39, Math.floor(p.degExact / 0.75));
    const start = (p.rashiIdx % 2 === 0) ? 0 : 6;
    const d40Rashi = (start + part) % 12;
    return { ...p, d40Rashi, d40RashiName: RASHIS[d40Rashi] };
  });
}

// D45 அக்ஷவேதாம்சம் (Akshavedamsa) — தந்தைவழி, நடத்தை. 0.6667° each. Movable→Aries, Fixed→Leo, Dual→Sagittarius.
function calcD45Akshavedamsa(placements) {
  return placements.map(p => {
    const part = Math.min(44, Math.floor(p.degExact / (30/45)));
    const cls = p.rashiIdx % 3;
    const start = cls === 0 ? 0 : cls === 1 ? 4 : 8;
    const d45Rashi = (start + part) % 12;
    return { ...p, d45Rashi, d45RashiName: RASHIS[d45Rashi] };
  });
}

// ═══════════════════════════════════════════════════════════════════
// 6. ஷட்பலம் (SHADBALA — 6-fold planetary strength)
// ═══════════════════════════════════════════════════════════════════
const DIG_BALA_HOUSES = {
  "சூரியன்":10, "செவ்வாய்":10, "குரு":1, "புதன்":1,
  "சந்திரன்":4, "சுக்கிரன்":4, "சனி":7
};
const NAISARGIKA_BALA = {
  "சூரியன்":60, "சந்திரன்":51.43, "செவ்வாய்":17.14, "புதன்":25.71,
  "குரு":34.28, "சுக்கிரன்":42.86, "சனி":8.57
};
// Static natural benefic/malefic split for Drik Bala below — a common-usage
// simplification (mirrors the same kind of simplification already documented for
// Raja/Dhana Yoga above): full classical treatment would also check Mercury's and
// the Moon's condition (conjunction, waxing/waning) rather than a fixed classification.
const NATURAL_BENEFICS = ["குரு","சுக்கிரன்","புதன்","சந்திரன்"];
const NATURAL_MALEFICS = ["சூரியன்","செவ்வாய்","சனி"];

// ═══════════════════════════════════════════════════════════════════
// லக்னவாரி சுப/பாப நிர்ணயம் (FUNCTIONAL BENEFIC/MALEFIC) — BPHS Ch.34
// Derived from ACTUAL house lordships (not a canned per-lagna table):
//   திரிகோண (5,9) + லக்ன அதிபதி → சுபன் | 3,6,11 அதிபதி → பாபன்
//   கேந்திராதிபத்ய தோஷம்: இயற்கை சுபன் கேந்திரம் ஆண்டால் நன்மை இழப்பு,
//   இயற்கை பாபன் கேந்திரம் ஆண்டால் தீமை இழப்பு
//   8ஆம் அதிபத்யம் தோஷம் (சூரிய/சந்திரனுக்கும், லக்னாதிபதிக்கும் விலக்கு)
//   யோககாரகன் = ஒரே கிரகம் கேந்திரமும் திரிகோணமும் ஆள்வது
// ═══════════════════════════════════════════════════════════════════
function housesOwnedBy(planetTa, lagnaIdx) {
  const houses = [];
  for (let h = 1; h <= 12; h++) {
    if (RASHI_LORD_NAME[(lagnaIdx + h - 1) % 12] === planetTa) houses.push(h);
  }
  return houses;
}
function calcFunctionalNature(lagnaIdx) {
  const result = {};
  CLASSICAL_7.forEach(ta => {
    const owns = housesOwnedBy(ta, lagnaIdx);
    const reasons = [];
    let score = 0;
    const isNatBenefic = NATURAL_BENEFICS.includes(ta);
    const ownsKendra = owns.some(h => [4,7,10].includes(h));
    const ownsTrikona59 = owns.some(h => [5,9].includes(h));
    owns.forEach(h => {
      if (h === 1) { score += 2; reasons.push("லக்னாதிபதி"); }
      else if ([5,9].includes(h)) { score += 2; reasons.push(`${h}ஆம் (திரிகோண) அதிபதி`); }
      else if ([3,6,11].includes(h)) { score -= 2; reasons.push(`${h}ஆம் அதிபதி — பாபத்துவம்`); }
      else if (h === 8) {
        if (ta !== "சூரியன்" && ta !== "சந்திரன்" && !owns.includes(1)) { score -= 2; reasons.push("8ஆம் அதிபத்ய தோஷம்"); }
        else reasons.push("8ஆம் அதிபதி (விலக்கு விதி — தோஷம் இல்லை)");
      }
      else if ([4,7,10].includes(h)) {
        if (isNatBenefic) { score -= 1; reasons.push(`${h}ஆம் (கேந்திர) அதிபதி — கேந்திராதிபத்ய தோஷம்`); }
        else reasons.push(`${h}ஆம் (கேந்திர) அதிபதி — பாபத்துவம் நீங்கியது`);
      }
      else reasons.push(`${h}ஆம் அதிபதி (சமம்)`);
    });
    let nature, natureEn;
    if (ownsKendra && ownsTrikona59) { nature = "யோககாரகன்"; natureEn = "Yogakaraka"; }
    else if (score >= 2) { nature = "சுபன்"; natureEn = "Functional Benefic"; }
    else if (score <= -2) { nature = "பாபன்"; natureEn = "Functional Malefic"; }
    else { nature = "சமம்"; natureEn = "Neutral"; }
    result[ta] = { nature, natureEn, score, owns, reasons };
  });
  // ராகு/கேது — BPHS: அவை அமர்ந்த வீட்டு அதிபதி / சேர்ந்த கிரகம் போல் பலன்
  result["ராகு"] = { nature: "சார்பு", natureEn: "Depends on dispositor", score: 0, owns: [], reasons: ["அமர்ந்த ராசி அதிபதி & சேர்க்கை படி பலன்"] };
  result["கேது"] = { nature: "சார்பு", natureEn: "Depends on dispositor", score: 0, owns: [], reasons: ["அமர்ந்த ராசி அதிபதி & சேர்க்கை படி பலன்"] };
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// மாரகர் & பாதகாதிபதி (MARAKA & BADHAKA) — classical derivation
//   மாரக ஸ்தானம்: 2, 7 — அவற்றின் அதிபதிகள் + அங்குள்ள கிரகங்கள் +
//   மாரகாதிபதியுடன் சேர்ந்தவை. பாதகம்: சர லக்னம்→11, ஸ்திரம்→9, உபயம்→7
// ═══════════════════════════════════════════════════════════════════
function calcMarakaBadhaka(lagnaIdx, placements) {
  const houseRashi = (h) => (lagnaIdx + h - 1) % 12;
  const lordOf = (h) => RASHI_LORD_NAME[houseRashi(h)];
  const planetHouse = (p) => ((p.rashiIdx - lagnaIdx + 12) % 12) + 1;

  const marakaLords = [...new Set([lordOf(2), lordOf(7)])];
  const occupants27 = placements.filter(p => [2,7].includes(planetHouse(p))).map(p => p.ta);
  // மாரகாதிபதியுடன் ஒரே ராசியில் சேர்ந்தவை
  const associates = [];
  marakaLords.forEach(ml => {
    const mlP = placements.find(p => p.ta === ml);
    if (!mlP) return;
    placements.forEach(p => {
      if (p.ta !== ml && p.rashiIdx === mlP.rashiIdx && !associates.includes(p.ta)) associates.push(p.ta);
    });
  });

  // பாதக ஸ்தானம் — லக்ன இயல்பு வழி (சரம்/ஸ்திரம்/உபயம்)
  const CHARA = [0,3,6,9], STHIRA = [1,4,7,10];
  const badhakaHouse = CHARA.includes(lagnaIdx) ? 11 : STHIRA.includes(lagnaIdx) ? 9 : 7;
  const badhakaLord = lordOf(badhakaHouse);
  const blP = placements.find(p => p.ta === badhakaLord);
  return {
    marakaLords, occupants27, associates,
    badhakaHouse, badhakaLord,
    badhakaLordHouse: blP ? planetHouse(blP) : null,
    lagnaType: CHARA.includes(lagnaIdx) ? "சர லக்னம்" : STHIRA.includes(lagnaIdx) ? "ஸ்திர லக்னம்" : "உபய லக்னம்"
  };
}

// ═══════════════════════════════════════════════════════════════════
// கோசார வேதை (GOCHARA VEDHA) — Brihat Samhita standard table
// கிரகம் சுப வீட்டில் இருந்தாலும், வேதை வீட்டில் வேறு கிரகம் இருந்தால்
// அந்த சுபபலன் தடைபடும். விலக்கு: சூரியன்↔சனி, சந்திரன்↔புதன் —
// தந்தை-மகன் ஜோடிகள் ஒருவருக்கொருவர் வேதை செய்யா.
// ═══════════════════════════════════════════════════════════════════
const GOCHARA_VEDHA = {
  "சூரியன்":  {3:9, 6:12, 10:4, 11:5},
  "சந்திரன்": {1:5, 3:9, 6:12, 7:2, 10:4, 11:8},
  "செவ்வாய்": {3:12, 6:9, 11:5},
  "புதன்":    {2:5, 4:3, 6:9, 8:1, 10:8, 11:12},
  "குரு":     {2:12, 5:4, 7:3, 9:10, 11:8},
  "சுக்கிரன்": {1:8, 2:7, 3:1, 4:10, 5:9, 8:5, 9:11, 11:6, 12:3},
  "சனி":      {3:12, 6:9, 11:5}
};
const VEDHA_EXEMPT_PAIRS = [["சூரியன்","சனி"],["சந்திரன்","புதன்"]];
function isVedhaExempt(a, b) {
  return VEDHA_EXEMPT_PAIRS.some(([x,y]) => (a===x&&b===y)||(a===y&&b===x));
}

// ═══════════════════════════════════════════════════════════════════
// கிரக அவஸ்தைகள் (AVASTHAS) — BPHS Ch.45
//   பாலாதி 5 (வயது நிலை — பாகை வழி), தீப்தாதி (கௌரவ நிலை),
//   ஜாக்ரதாதி 3 (விழிப்பு நிலை) — அனைத்தும் உள்ள placements-இல் இருந்தே
// ═══════════════════════════════════════════════════════════════════
function signDignity(p) {
  if (EXALT_RASHI[p.ta] === p.rashiIdx) return "உச்சம்";
  if (EXALT_RASHI[p.ta] !== undefined && (EXALT_RASHI[p.ta] + 6) % 12 === p.rashiIdx) return "நீசம்";
  if (RASHI_LORD_NAME[p.rashiIdx] === p.ta) return "சொந்தம்";
  const lord = RASHI_LORD_NAME[p.rashiIdx];
  const fr = GRAHA_FRIENDSHIP[p.ta];
  if (fr) {
    if (fr.friends.includes(lord)) return "நட்பு";
    if (fr.enemies.includes(lord)) return "பகை";
  }
  return "சமம்";
}
const BALADI_SEQ = [
  {name:"பால அவஸ்தை",   pct:25,  desc:"குழந்தை நிலை — பலன் மெல்ல, தாமதமாக வெளிப்படும்"},
  {name:"குமார அவஸ்தை", pct:50,  desc:"இளமை நிலை — பாதி பலன்"},
  {name:"யுவ அவஸ்தை",   pct:100, desc:"வாலிப நிலை — முழு பலன் தரும்"},
  {name:"விருத்த அவஸ்தை",pct:40,  desc:"முதுமை நிலை — பலன் குறைவு"},
  {name:"மிருத அவஸ்தை",  pct:10,  desc:"இறுதி நிலை — பலன் மிக அற்பம்"}
];
function calcAvasthas(placements) {
  return placements.filter(p => CLASSICAL_7.includes(p.ta)).map(p => {
    // 1. பாலாதி — பாகை வழி (ஒற்றை ராசி: நேர்; இரட்டை: தலைகீழ்) BPHS 45.3-4
    let bi = Math.min(4, Math.floor((p.degExact ?? p.degree ?? 0) / 6));
    if (p.rashiIdx % 2 === 1) bi = 4 - bi; // இரட்டை ராசி — தலைகீழ்
    const baladi = BALADI_SEQ[bi];
    // 2. தீப்தாதி — கௌரவ நிலை + அஸ்தங்கம் + யுத்தம்
    const dig = signDignity(p);
    let deeptadi, deeptadiDesc;
    if (p.isCombust) { deeptadi = "விகல"; deeptadiDesc = "அஸ்தங்கம் — பலன் வெளிப்பட தடை"; }
    else if (dig === "உச்சம்") { deeptadi = "தீப்த"; deeptadiDesc = "ஒளிர்நிலை — உயர்ந்த சுபபலன்"; }
    else if (dig === "சொந்தம்") { deeptadi = "ஸ்வஸ்த"; deeptadiDesc = "தன்னிலை — நிறைவான பலன்"; }
    else if (dig === "நட்பு") { deeptadi = "முதித"; deeptadiDesc = "மகிழ்நிலை — நல்ல பலன்"; }
    else if (dig === "சமம்") { deeptadi = "சாந்த"; deeptadiDesc = "அமைதி நிலை — மிதமான பலன்"; }
    else if (dig === "பகை") { deeptadi = "துக்கித"; deeptadiDesc = "துயர்நிலை — பலன் சிரமத்துடன்"; }
    else { deeptadi = "கல"; deeptadiDesc = "நீசம் — பலன் மிகக் குறைவு / எதிர்விளைவு"; }
    // 3. ஜாக்ரதாதி — விழிப்பு நிலை BPHS 45.5
    let jagradadi, jagradadiDesc;
    if (dig === "உச்சம்" || dig === "சொந்தம்") { jagradadi = "ஜாக்ரத் (விழிப்பு)"; jagradadiDesc = "முழு பலன்"; }
    else if (dig === "நட்பு" || dig === "சமம்") { jagradadi = "ஸ்வப்ன (கனவு)"; jagradadiDesc = "பாதி பலன்"; }
    else { jagradadi = "சுஷுப்தி (உறக்கம்)"; jagradadiDesc = "பலன் மிகக் குறைவு"; }
    return { ta: p.ta, symbol: p.symbol, rashi: p.rashi, degree: Math.round((p.degExact ?? 0)*10)/10,
      baladi, deeptadi, deeptadiDesc, jagradadi, jagradadiDesc, dignity: dig };
  });
}

// ═══════════════════════════════════════════════════════════════════
// பாவ பலம் (BHAVA BALA) — வீட்டின் பலம்:
//   1. பாவாதிபதி பலம் (அதிபதியின் ஷட்பலம் — ஏற்கனவே கணித்ததில் இருந்து)
//   2. பாவ திக்பலம் (ராசி இயல்பு: நர/ஜல/சதுஷ்பத/கீட × கேந்திர இலக்கு)
//   3. பாவ திருஷ்டி பலம் (வீட்டின் மீதான சுப/பாப பார்வை — aspectorsOnHouse)
// ═══════════════════════════════════════════════════════════════════
const NARA_RASHIS = [2,5,6,10];   // மிதுனம், கன்னி, துலாம், கும்பம் → லக்னத்தில் பலம்
const JALA_RASHIS = [3,9,11];     // கடகம், மகரம்(பாதி), மீனம் → 4ஆம் வீட்டில் பலம்
const KEETA_RASHIS = [7];         // விருச்சிகம் → 7ஆம் வீட்டில் பலம்
// மற்றவை (மேஷம், ரிஷபம், சிம்மம், தனுசு) சதுஷ்பதம் → 10ஆம் வீட்டில் பலம்
function calcBhavaBala(placements, lagnaIdx, shadBalaArr) {
  const sbOf = {};
  (shadBalaArr || []).forEach(s => { sbOf[s.ta] = s; });
  return [1,2,3,4,5,6,7,8,9,10,11,12].map(houseNum => {
    const houseRashiIdx = (lagnaIdx + houseNum - 1) % 12;
    const lordName = RASHI_LORD_NAME[houseRashiIdx];
    const lordSB = sbOf[lordName];
    // 1. அதிபதி பலம் — ஷட்பல மொத்தம் / தேவை விகிதம் → 0-60 அளவில்
    const lordBala = lordSB ? Math.min(60, Math.round((lordSB.total / lordSB.required) * 45)) : 30;
    // 2. திக்பலம் — ராசி இயல்புக்கு ஏற்ற கேந்திரத்தில் முழு 60, தூரத்திற்கு குறைவு
    const ideal = NARA_RASHIS.includes(houseRashiIdx) ? 1 : JALA_RASHIS.includes(houseRashiIdx) ? 4 : KEETA_RASHIS.includes(houseRashiIdx) ? 7 : 10;
    let dist = Math.abs(houseNum - ideal); if (dist > 6) dist = 12 - dist;
    const digBala = 60 - dist * 10;
    // 3. திருஷ்டி பலம் — வீட்டின் மீதான பார்வைகள் (30 அடிப்படை ± 8/பார்வை)
    const asps = aspectorsOnHouse(placements, lagnaIdx, houseRashiIdx);
    const ben = asps.filter(a => NATURAL_BENEFICS.includes(a.planet)).length;
    const mal = asps.filter(a => NATURAL_MALEFICS.includes(a.planet)).length;
    const drishtiBala = Math.max(0, Math.min(60, 30 + ben * 8 - mal * 8));
    const total = lordBala + digBala + drishtiBala;
    return {
      houseNum, houseRashi: RASHIS[houseRashiIdx], lordName,
      lordBala, digBala, drishtiBala, total,
      verdict: total >= 110 ? "பலமுள்ளது" : total <= 70 ? "பலவீனம்" : "நடுத்தரம்"
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// ஒருங்கிணைந்த கிரக பலம் (UNIFIED PLANET STRENGTH) — எல்லா பல-அளவுகோல்
// engine-களையும் ஒரே முடிவாக இணைக்கும் மையம்:
//   கிரக பலம் (dignity 0-10) + ஷட்பலம் (BPHS 6-fold) + விம்ஷோபகம் (varga 20)
//   + நவாம்ச நிலை (D9) + அவஸ்தை (BPHS 45) + லக்னவாரி இயல்பு + மாரக/பாதக flag.
// ஒவ்வொரு engine-ன் தனி முடிவும் sources-இல் அப்படியே காட்டப்படும் —
// composite எப்படி வந்தது என்பது முழு வெளிப்படை. இதுவே verdict engines
// (பாவ பலன், ஆழ்பகுப்பாய்வு, பரிகாரம், நிகழ்வு காலக்கணிப்பு) அனைத்தும்
// பயன்படுத்தும் பொது பல-அளவுகோல்.
// ═══════════════════════════════════════════════════════════════════
function buildUnifiedStrength({ placements, lagnaIdx, grahaBala, shadBala, vimshopaka, navamsaStrength, avasthas, functionalNat, marakaBadhaka }) {
  const gbOf = {}; (grahaBala || []).forEach(g => { gbOf[g.ta] = g; });
  const sbOf = {}; (shadBala || []).forEach(s => { sbOf[s.ta] = s; });
  const vmOf = {}; (vimshopaka || []).forEach(v => { vmOf[v.ta] = v; });
  const nvOf = {}; (navamsaStrength || []).forEach(n => { nvOf[n.ta] = n; });
  const avOf = {}; (avasthas || []).forEach(a => { avOf[a.ta] = a; });

  return placements.filter(p => CLASSICAL_7.includes(p.ta)).map(p => {
    const reasons = [];
    const flags = [];
    // 1. கிரக பலம் (dignity) — 30%
    const gb = gbOf[p.ta];
    const gbPct = gb ? gb.score * 10 : 50;
    if (gb) reasons.push(`கிரக பலம்: ${gb.status} (${gb.score}/10)`);
    // 2. ஷட்பலம் — required-க்கு விகிதம் (1.5x cap) — 25%
    const sb = sbOf[p.ta];
    const sbRatio = sb ? Math.min(1.5, sb.total / sb.required) : 1;
    const sbPct = (sbRatio / 1.5) * 100;
    if (sb) reasons.push(`ஷட்பலம்: ${Math.round(sb.total)}/${sb.required} ரூபா (${sb.status})`);
    // 3. விம்ஷோபகம் (ShadVarga 20) — 15%
    const vm = vmOf[p.ta];
    const vmPct = vm && vm.total != null ? (vm.total / 20) * 100 : 50;
    if (vm && vm.total != null) reasons.push(`விம்ஷோபகம்: ${vm.total}/20`);
    // 4. நவாம்சம் (D9) — 15%
    const nv = nvOf[p.ta];
    let nvPct = 50;
    if (nv) {
      if (nv.vargottama) { nvPct = 90; reasons.push("நவாம்சம்: வர்கோத்தமம் ★"); }
      else if (nv.d9Status === "உச்சம்" || nv.d9Status === "மூலத்திரிகோணம்") { nvPct = 85; reasons.push(`நவாம்சம்: ${nv.d9Status}`); }
      else if (nv.d9Status === "சொந்த வீடு") { nvPct = 75; reasons.push("நவாம்சம்: சொந்த வீடு"); }
      else if (nv.d9Status === "நட்பு") { nvPct = 62; reasons.push("நவாம்சம்: நட்பு"); }
      else if (nv.d9Status === "பகை") { nvPct = 35; reasons.push("நவாம்சம்: பகை"); }
      else if (nv.d9Status === "நீசம்") { nvPct = 15; reasons.push("நவாம்சம்: நீசம்"); }
      else reasons.push(`நவாம்சம்: ${nv.d9Status || "சமன்"}`);
    }
    // 5. அவஸ்தை (பாலாதி %) — 15%
    const av = avOf[p.ta];
    const avPct = av ? av.baladi.pct : 60;
    if (av) reasons.push(`அவஸ்தை: ${av.baladi.name} (~${av.baladi.pct}%), ${av.deeptadi}`);

    let composite = gbPct * 0.30 + sbPct * 0.25 + vmPct * 0.15 + nvPct * 0.15 + avPct * 0.15;
    // அஸ்தங்கம் — composite-இல் நேரடி குறைப்பு (எல்லா நூல்களும் ஒப்பும் பலவீனம்)
    if (p.isCombust) { composite -= 8; flags.push("அஸ்தங்கம்"); }
    if (p.isRetrograde && p.ta !== "ராகு" && p.ta !== "கேது") flags.push("வக்ரம்");
    composite = Math.max(0, Math.min(100, Math.round(composite)));

    // லக்னவாரி இயல்பு + மாரக/பாதக — score-ஐ மாற்றா; பலன் திசையை மாற்றும் tags
    const fn = functionalNat?.[p.ta];
    if (fn) flags.push(fn.nature);
    if (marakaBadhaka) {
      if (marakaBadhaka.marakaLords.includes(p.ta)) flags.push("மாரகாதிபதி");
      if (marakaBadhaka.badhakaLord === p.ta) flags.push("பாதகாதிபதி");
    }

    const tier = composite >= 75 ? "மிகப் பலம்" : composite >= 60 ? "பலம்" : composite >= 45 ? "நடுத்தரம்" : composite >= 30 ? "பலவீனம்" : "மிகப் பலவீனம்";
    const tierColor = composite >= 60 ? "#0d7a30" : composite >= 45 ? "#b8860b" : "#cc1a1a";
    return {
      ta: p.ta, symbol: p.symbol, rashi: p.rashi, house: ((p.rashiIdx - lagnaIdx + 12) % 12) + 1,
      composite, tier, tierColor, flags, reasons,
      sources: {
        grahaBala: gb ? { score: gb.score, status: gb.status } : null,
        shadBala: sb ? { total: Math.round(sb.total), required: sb.required, strong: sb.strong } : null,
        vimshopaka: vm && vm.total != null ? vm.total : null,
        navamsa: nv ? { d9Status: nv.d9Status, vargottama: nv.vargottama } : null,
        avastha: av ? { baladi: av.baladi.name, pct: av.baladi.pct, deeptadi: av.deeptadi } : null,
        functional: fn ? fn.nature : null
      }
    };
  }).sort((a, b) => b.composite - a.composite);
}

// ═══════════════════════════════════════════════════════════════════
// நட்சத்திர-பாவக இணைப்பு (NAKSHATRA-BHAVA LINKAGE ENGINE)
// ஒவ்வொரு பாவத்திலும் அமர்ந்த கிரகம்:
//   1. எந்த நட்சத்திரத்தில் அமர்ந்துள்ளது → அந்த நட்சத்திராதிபதி எந்தெந்த
//      பாவங்களின் அதிபதி + எங்கு அமர்ந்துள்ளார் → கிரகம் அந்த பாவங்களின்
//      பலனையும் தரும் (classical + KP நட்சத்திராதிபதி விதி — கிரகன் தன்
//      நட்சத்திராதிபதியின் காரியங்களையே முதன்மையாகச் செய்வான்).
//   2. அந்தக் கிரகத்தை எந்தெந்த கிரகங்கள் பார்க்கின்றன (Parashari drishti)
//      → லக்னவாரி சுப/அசுப இயல்புப்படி பார்வைப் பலன்.
//   3. கோசாரம்: குரு/சனி அந்தக் கிரகத்தின் ராசியையோ நட்சத்திராதிபதியின்
//      ராசியையோ transit-இல் தொடும் காலகட்டங்கள் (அடுத்த 12 ஆண்டு, மாத அளவில்)
//      → அப்போதுதான் இந்த இணைப்பின் சுப/அசுப பலன்கள் வெளிப்படும்.
//   4. அசுப இணைப்பு/பார்வைக்கு — பாதிக்கும் கிரகத்தின் பரிகாரம்.
// ═══════════════════════════════════════════════════════════════════
function calcNakshatraBhavaLinks(placements, lagnaIdx, functionalNat, geo, ayanamsaKey, extras = {}) {
  // extras: துல்லிய அடுக்குகளுக்கான கூடுதல் தரவு —
  //   dashaData (தசை×கோசார இணைவு), unified (இணைப்புப் பலம் %),
  //   ashtakavarga (BAV பிந்து/கக்ஷ்யா), lagnaFullLong (பாவ சந்தி பலம்)
  const { dashaData, unified, ashtakavarga, lagnaFullLong } = extras;
  const houseOf = (p) => ((p.rashiIdx - lagnaIdx + 12) % 12) + 1;
  const findP = (ta) => placements.find(x => x.ta === ta);
  const natureOf = (ta) => functionalNat?.[ta]?.nature || (ta === "ராகு" || ta === "கேது" ? "சார்பு" : "சமம்");
  const isSubhaNature = (n) => n === "யோககாரகன்" || n === "சுபன்";
  const isAsubhaNature = (ta, n) => n === "பாபன்" || ta === "ராகு" || ta === "கேது";
  const drishti = calcGrahaDrishti(placements);
  const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  const natalMoon = findP("சந்திரன்");
  const unifiedOf = (ta) => (unified || []).find(u => u.ta === ta) || null;

  // ஸ்புட திருஷ்டி (BPHS Ch.26), KP உட்பிரிவு அதிபதி — precision.js-இல்
  // இருந்து இறக்குமதி (தூய functions; scripts/test-precision.mjs golden-test
  // செய்கிறது — விதி: நட்சத்திராதிபதி "எதை" காட்டுவார், உட்பிரிவு அதிபதி
  // "நிறைவேறுமா" என்று முடிப்பார்)

  // ═══ BAV பிந்து + கக்ஷ்யா (BPHS அஷ்டகவர்க்கம்) ═══
  // transit கிரகன் தன் சொந்த BAV-இல் பிந்துள்ள ராசியில் நடக்கும்போதே நல்ல
  // பலன்; ராசிக்குள் 8 கக்ஷ்யா (3°45') — பிந்து தந்தவரின் கக்ஷ்யா கூர்மையான உச்சம்.
  const KAKSHYA_ORDER = ["சனி","குரு","செவ்வாய்","சூரியன்","சுக்கிரன்","புதன்","சந்திரன்","லக்னம்"];
  const natalRefRashi = (() => { const m = { "லக்னம்": lagnaIdx }; CLASSICAL_7.forEach(n => { const pp = findP(n); if (pp) m[n] = pp.rashiIdx; }); return m; })();
  const bavContributors = (target, rashiIdx2) => {
    const rules = BAV_RULES[target]; if (!rules) return [];
    return Object.keys(rules).filter(ref => natalRefRashi[ref] !== undefined &&
      rules[ref].some(hn => (natalRefRashi[ref] + hn - 1) % 12 === rashiIdx2));
  };

  // ═══ கோசார அடிப்படை grid — 10-நாள் இடைவெளியில் 12 ஆண்டு (438 புள்ளிகள்).
  // மாத grid குறுகிய நட்சத்திர/டிகிரி தொடுகைகளைத் தவறவிடும்; 10-நாள் பிடிக்கும்.
  // transitAt() — நாள்-அளவு memo cache: எல்லை-நுட்பமாக்கலும் இதன் வழியே. ═══
  const transitCache = new Map();
  const transitAt = (d) => {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (transitCache.has(iso)) return transitCache.get(iso);
    let out = null;
    try {
      const th = generateHoroscope(iso, "12:00", geo.lat, geo.lon, true, ayanamsaKey);
      out = { placements: th.placements };
      ["குரு","சனி","ராகு","கேது"].forEach(n => { out[n] = th.placements.find(x => x.ta === n) || null; });
    } catch (e) { /* ஒரு நாள் தவறினாலும் மற்றவை தொடரும் */ }
    transitCache.set(iso, out);
    return out;
  };
  const samples = [];
  const now = new Date();
  for (let k = 0; k < 438; k++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k * 10);
    const t = transitAt(d);
    if (t) samples.push({ d, t });
  }
  const fmtDay = (d) => d.toLocaleDateString('ta-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  // எல்லை நுட்பமாக்கம் — grid-இல் மாறும் இரு புள்ளிகளுக்கு இடையே binary search,
  // ~1 நாள் துல்லியம் (10-நாள் grid → 4 படிகள்)
  const refineEdge = (dIn, dOut, hitFn) => {
    let a = dIn.getTime(), b = dOut.getTime();
    for (let i = 0; i < 5; i++) {
      const mid = new Date((a + b) / 2);
      const t = transitAt(mid);
      if (t && hitFn(t)) a = mid.getTime(); else b = mid.getTime();
    }
    return new Date(a);
  };
  // hit-fn உண்மையாகும் தொடர் grid-புள்ளிகளை இணைத்து, எல்லைகளை நாள்-அளவில் நுட்பமாக்கு
  const windowsFor = (hitFn, maxN) => {
    const wins = [];
    let startIdx = -1;
    for (let i = 0; i < samples.length; i++) {
      const hit = hitFn(samples[i].t);
      if (hit && startIdx < 0) startIdx = i;
      if ((!hit || i === samples.length - 1) && startIdx >= 0) {
        const endIdx = hit ? i : i - 1;
        // தொடக்க எல்லை: முந்தைய miss-க்கும் முதல் hit-க்கும் இடையே
        const from = startIdx > 0 ? refineEdge(samples[startIdx].d, samples[startIdx - 1].d, hitFn) : samples[startIdx].d;
        const to = endIdx < samples.length - 1 && !hit ? refineEdge(samples[endIdx].d, samples[endIdx + 1].d, hitFn) : samples[endIdx].d;
        wins.push({ from, to, mid: new Date((from.getTime() + to.getTime()) / 2) });
        startIdx = -1;
        if (wins.length >= maxN) break;
      }
    }
    return wins.map(w => ({ ...w, label: `${fmtDay(w.from)} — ${fmtDay(w.to)}` }));
  };

  // ═══ தசை × கோசார இணைவு — transit window-இன் நடுவில் ஓடும் MD/AD
  // இதே பாவங்களுடன் தொடர்புள்ளவரா? தசை வாக்குறுதி இல்லாத கோசாரம் பலன் தராது. ═══
  const dashaAt = (d) => {
    if (!dashaData?.dashas) return null;
    const md = dashaData.dashas.find(x => d >= x.startDate && d < x.endDate);
    if (!md) return null;
    const ad = md.antardashas?.find(x => d >= x.startDate && d < x.endDate);
    return { md: md.name, ad: ad?.name || null };
  };
  const dashaConfidence = (d, relatedSet, linkedHouses) => {
    const cur = dashaAt(d);
    if (!cur) return null;
    // தொடர்பு: நேரடி (கிரகமே/ஆட்சி) அல்லது KP நட்சத்திர வழி — தசாநாதன்
    // அமர்ந்த நட்சத்திரத்தின் அதிபதி இப்பாவங்களுடன் தொடர்புடையவரா
    const direct = (ta) => !ta ? false : relatedSet.has(ta) || housesOwnedBy(ta, lagnaIdx).some(hh => linkedHouses.includes(hh));
    const viaStar = (ta) => {
      if (!ta) return false;
      const pp = findP(ta);
      const sl = pp && pp.nakIdx >= 0 ? getNakshatraLord(pp.nakIdx).name : null;
      return sl ? direct(sl) : false;
    };
    const isRel = (ta) => direct(ta) || viaStar(ta);
    const mdRel = isRel(cur.md), adRel = isRel(cur.ad);
    const conf = mdRel && adRel ? "மிக உயர்" : adRel ? "உயர்" : mdRel ? "நடுத்தரம்" : "குறை";
    return { ...cur, mdRel, adRel, conf,
      text: mdRel && adRel ? `${cur.md} தசை + ${cur.ad} புக்தி இரண்டும் இப்பாவங்களுடன் தொடர்பு — தசையும் கோசாரமும் ஒன்றிணையும் ★ உச்சகட்ட காலம்`
          : adRel ? `${cur.ad} புக்தி இப்பாவங்களுடன் தொடர்பு — நல்ல இணைவு`
          : mdRel ? `${cur.md} தசை தொடர்புடையது — மிதமான இணைவு`
          : `${cur.md}/${cur.ad || "—"} தசை-புக்திக்கு இப்பாவங்களுடன் நேரடித் தொடர்பில்லை — பலன் மங்கலாக இருக்கலாம்` };
  };

  // ═══ கோசார வேதை (Brihat Samhita) — ஜென்ம ராசியிலிருந்து transit நிலை
  // சாதகமா + வேதை ஸ்தானத்தில் வேறு கிரகம் உள்ளதா (விலக்கு ஜோடிகள் நீங்கலாக) ═══
  const vedhaCheck = (tpName, tSnapshot) => {
    if (!natalMoon || !tSnapshot) return null;
    const tp = tSnapshot[tpName]; if (!tp) return null;
    const hMoon = ((tp.rashiIdx - natalMoon.rashiIdx + 12) % 12) + 1;
    const favMap = GOCHARA_VEDHA[tpName];
    if (!favMap || !(hMoon in favMap)) return { fav: false, hMoon, text: `சந்திரனிலிருந்து ${hMoon}இல் — கோசாரப்படி சாதக நிலை அல்ல; இத்தொடுகை பாவ-activation மட்டுமே` };
    const vHouse = favMap[hMoon];
    const vRashi = (natalMoon.rashiIdx + vHouse - 1) % 12;
    const blocker = tSnapshot.placements.find(x => x.ta !== tpName && x.rashiIdx === vRashi && CLASSICAL_7.includes(x.ta) && !isVedhaExempt(tpName, x.ta));
    return blocker
      ? { fav: true, vedha: true, by: blocker.ta, hMoon, text: `சந்திரனிலிருந்து ${hMoon} (சாதகம்) — ஆனால் ${blocker.ta} ${vHouse}இல் வேதை செய்கிறார்: பலன் தடைபடும்` }
      : { fav: true, vedha: false, hMoon, text: `சந்திரனிலிருந்து ${hMoon} (சாதகம்) — வேதையில்லா சுத்த transit ✓` };
  };

  // ═══ BAV/கக்ஷ்யா annotation — window நடுவில் transit கிரகன் நிற்கும் ராசியில்
  // அவனது சொந்த பிந்து + அந்நேர கக்ஷ்யாதிபதி பிந்து தந்தவரா ═══
  const bavCheck = (tpName, tSnapshot) => {
    if (!ashtakavarga?.bav?.[tpName] || !tSnapshot) return null;
    const tp = tSnapshot[tpName]; if (!tp) return null;
    const bindu = ashtakavarga.bav[tpName][tp.rashiIdx];
    const kIdx = Math.min(7, Math.floor((tp.degExact ?? 0) / 3.75));
    const kLord = KAKSHYA_ORDER[kIdx];
    const kBindu = bavContributors(tpName, tp.rashiIdx).includes(kLord);
    return { bindu, kLord, kBindu,
      text: `${tpName} தன் BAV-இல் ${bindu} பிந்துள்ள ${RASHIS[tp.rashiIdx]}இல்${bindu >= 5 ? " (வலு ✓)" : bindu <= 3 ? " (பலவீனம்)" : ""} • கக்ஷ்யா: ${kLord}${kBindu ? " — பிந்து தந்தவர் ★" : ""}` };
  };

  // ═══ வக்ர பல-கடப்பு — டிகிரி/நட்சத்திர தொடுகைக்குள் transit கிரகன் நேர்-வக்ரம்-நேர்
  // என எத்தனை முறை புள்ளியை கடக்கிறான்; இறுதி கடப்பில் பலன் நிறைவு (அனுபவ விதி) ═══
  const countPasses = (tpName, natalLong, from, to) => {
    const dates = [];
    for (let tms = from.getTime(); tms <= to.getTime(); tms += 5 * 86400000) dates.push(new Date(tms));
    dates.push(to);
    let prev = null, passes = 0;
    dates.forEach(d => {
      const t = transitAt(d); const tp = t?.[tpName]; if (!tp) return;
      const diff = ((tp.fullLong - natalLong + 540) % 360) - 180;
      if (prev !== null && ((prev < 0 && diff >= 0) || (prev > 0 && diff <= 0))) passes++;
      prev = diff;
    });
    return Math.max(1, passes);
  };

  // ═══ Trigger நாட்கள் — classical விதி: மந்த கிரகங்கள் (குரு/சனி/தசை)
  // காலத்தை வாக்களிக்கும்; வேக கிரகங்கள் (சூரியன்/செவ்வாய்) அந்த நாளை trigger
  // செய்யும். Window-க்குள் அவை ஜென்ம ஸ்புடத்தை கடக்கும் நாட்களை mean-motion
  // அனுமானம் + உண்மை transit சரிபார்ப்பால் கணிக்கிறோம் (துல்லியம் ~±1-2 நாள்) ═══
  const triggerDaysIn = (from, to, natalLong) => {
    const out = [];
    [["சூரியன்", 0.9856], ["செவ்வாய்", 0.524]].forEach(([tp, rate]) => {
      const t0 = transitAt(from);
      const p0 = t0?.placements.find(x => x.ta === tp);
      if (!p0) return;
      const gap = ((natalLong - p0.fullLong) + 360) % 360;
      let d = new Date(from.getTime() + (gap / rate) * 86400000);
      let guard = 0;
      while (d <= to && guard++ < 14) {
        const t1 = transitAt(d);
        const p1 = t1?.placements.find(x => x.ta === tp);
        if (p1) {
          const diff = ((natalLong - p1.fullLong + 540) % 360) - 180;
          d = new Date(d.getTime() + (diff / rate) * 86400000);
          const t2 = transitAt(d);
          const p2 = t2?.placements.find(x => x.ta === tp);
          const fin = p2 ? Math.abs(((natalLong - p2.fullLong + 540) % 360) - 180) : 99;
          // செவ்வாய் வக்ரத்தில் அனுமானம் பிசகலாம் — 3°-க்குள் இருந்தால் மட்டும் ஏற்பு
          if (d >= from && d <= to && fin <= 3) out.push({ planet: tp, date: new Date(d) });
        }
        d = new Date(d.getTime() + (360 / rate) * 86400000);
      }
    });
    return out.sort((a, b) => a.date - b.date).slice(0, 4);
  };

  // ராகு/கேது true-node அலைவால் துண்டுபடும் windows-ஐ இணை (gap < 35 நாள்)
  const mergeWins = (wins, gapDays) => {
    const out = [];
    wins.forEach(w => {
      const last = out[out.length - 1];
      if (last && (w.from.getTime() - last.to.getTime()) < gapDays * 86400000) {
        last.to = w.to;
        last.mid = new Date((last.from.getTime() + last.to.getTime()) / 2);
        last.label = `${fmtDay(last.from)} — ${fmtDay(last.to)}`;
      } else out.push({ ...w });
    });
    return out;
  };

  const houses = [1,2,3,4,5,6,7,8,9,10,11,12].map(houseNum => {
    const houseRashiIdx = (lagnaIdx + houseNum - 1) % 12;
    const occupants = placements.filter(p => p.rashiIdx === houseRashiIdx);
    const theme = HOUSE_THEMES[houseNum];
    if (occupants.length === 0) {
      const lordName = RASHI_LORD_NAME[houseRashiIdx];
      const lordP = findP(lordName);
      return { houseNum, houseTa: theme?.ta, theme: theme?.theme, houseRashi: RASHIS[houseRashiIdx], isEmpty: true,
        note: `கிரகம் இல்லை — அதிபதி ${lordName} ${lordP ? houseOf(lordP) + "ஆம் வீட்டில்" : ""}. இவ்வீட்டுப் பலன் அதிபதி வழியே.` };
    }

    const occAnalysis = occupants.map(p => {
      // ── 1. நட்சத்திராதிபதி வழி பாவகத் தொடர்பு ──
      let star = null;
      if (p.nakIdx >= 0) {
        const starLord = getNakshatraLord(p.nakIdx).name;
        const slP = starLord === p.ta ? p : findP(starLord);
        const slOwns = housesOwnedBy(starLord, lagnaIdx);           // ராகு/கேதுவுக்கு []
        const slHouse = slP ? houseOf(slP) : null;
        const linkedHouses = [...new Set([...slOwns, ...(slHouse ? [slHouse] : [])])].sort((a,b)=>a-b);
        const slNature = natureOf(starLord);
        const dusthanaLink = linkedHouses.some(h => [6,8,12].includes(h));
        const subhaLink = linkedHouses.some(h => [1,4,5,7,9,10,11].includes(h));
        // இணைப்பின் தொனி: நட்சத்திராதிபதியின் லக்னவாரி இயல்பு + இணையும் பாவங்கள்
        const tone = isSubhaNature(slNature) && !dusthanaLink ? "சுபம்"
                   : isAsubhaNature(starLord, slNature) && dusthanaLink ? "அசுபம்"
                   : isAsubhaNature(starLord, slNature) || dusthanaLink ? "கலப்பு"
                   : subhaLink ? "சுபம்" : "கலப்பு";
        const themeTexts = linkedHouses.map(h => `${h} (${HOUSE_THEMES[h]?.theme || ""})`).join(", ");
        star = {
          nak: p.nakshatraTa, pada: p.pada, starLord, slHouse, slOwns, linkedHouses, tone,
          slNature,
          text: `${p.ta} ${p.nakshatraTa} நட்சத்திரத்தில் — அதிபதி ${starLord} (${slNature}${slHouse ? `, ${slHouse}இல் அமர்வு` : ""}${slOwns.length ? `, ${slOwns.join(",")} ஆட்சி` : ""}). எனவே ${p.ta} இவ்வீட்டுப் (${houseNum}) பலனுடன் ${themeTexts} பாவப் பலன்களையும் இணைத்துத் தருவார்${tone === "சுபம்" ? " — சுப இணைப்பு" : tone === "அசுபம்" ? " — அசுப இணைப்பு, கவனம்" : " — கலப்பு இணைப்பு"}.`
        };
      }

      // ── 2. இக்கிரகத்தின் மீதான பார்வைகள் ──
      // ராகு/கேது: calcGrahaDrishti nodes-ஐ target ஆக சேர்க்காது (BPHS — நோடுகள்
      // பார்வை செய்யா; ஆனால் பார்வை பெறும்) — அவற்றுக்கு ராசி-அடிப்படை
      // aspectorsOnHouse வழி அவை அமர்ந்த ராசியின் மீதான பார்வைகளை எடு.
      const rawAspects = CLASSICAL_7.includes(p.ta)
        ? drishti.filter(a => a.to === p.ta).map(a => ({ from: a.from, isSpecial: a.isSpecial }))
        : aspectorsOnHouse(placements, lagnaIdx, p.rashiIdx).map(a => ({ from: a.planet, isSpecial: a.isSpecial ?? false }));
      const aspects = rawAspects.map(a => {
        const an = natureOf(a.from);
        const tone = isSubhaNature(an) ? "சுபம்" : isAsubhaNature(a.from, an) ? "அசுபம்" : "கலப்பு";
        // ஸ்புட திருஷ்டி — யார் பார்க்கிறார் என்பது ராசி-அளவு; எவ்வளவு வலுவாக
        // என்பது டிகிரி-அளவு (BPHS Ch.26 விருபா): முழு/முக்கால்/அரை/கால்
        const fromP = findP(a.from);
        const v = fromP && CLASSICAL_7.includes(a.from) && p.fullLong != null && fromP.fullLong != null
          ? Math.round(drishtiVirupa(fromP.fullLong, p.fullLong, a.from)) : null;
        return { from: a.from, isSpecial: a.isSpecial, nature: an, tone,
          virupa: v, grade: v != null ? virupaGrade(v) : null,
          text: DRISHTI_EFFECT[a.from]?.text || "" };
      });
      const subhaAsp = aspects.filter(a => a.tone === "சுபம்").length;
      const asubhaAsp = aspects.filter(a => a.tone === "அசுபம்").length;

      // ── 3. கோசாரம் — மூன்று துல்லிய அடுக்குகள் ──
      //   அடுக்கு-1 (ராசி): குரு/சனி இக்கிரக/நட்சத்திராதிபதி ராசியை சேர்க்கை/பார்வையால்
      //     தொடும் நாள்-அளவு windows — ஒவ்வொன்றிலும் தசை-இணைவு + வேதை + BAV/கக்ஷ்யா
      //   அடுக்கு-2 (நட்சத்திரம்): transit கிரகன் இக்கிரகனின் ஜென்ம நட்சத்திரத்திற்குள்
      //     (13°20') நடக்கும் கூர்மையான காலம் — ராகு/கேது பெயர்ச்சியும் இங்கே
      //   அடுக்கு-3 (டிகிரி ±1°): ஜென்ம ஸ்புடத்தையே தொடும் உச்ச நாட்கள் + வக்ர பல-கடப்பு
      const starLordP = star && star.starLord ? (star.starLord === p.ta ? p : findP(star.starLord)) : null;
      const targets = [...new Set([p.rashiIdx, ...(starLordP ? [starLordP.rashiIdx] : [])])];
      const linkSubha = star ? star.tone === "சுபம்" : subhaAsp >= asubhaAsp;
      const satNature = natureOf("சனி");
      const linkedHousesArr = star ? star.linkedHouses : [houseNum];
      const relatedSet = new Set([p.ta, ...(star ? [star.starLord] : [])]);
      const annotate = (tpName) => (w) => {
        const tMid = transitAt(w.mid);
        // வேதை/கக்ஷ்யா — நடுப்புள்ளியில் மட்டுமல்ல, window முழுவதும் (10-நாள்
        // grid-இன் ஏற்கனவே கணித்த புள்ளிகள் — புதிய கணிப்புச் சுமை இல்லை):
        // வேக கிரகங்களால் வேதை window-க்குள் மாறும்; % ஆகக் காட்டுவதே நேர்மை
        const inWin = samples.filter(s => s.d >= w.from && s.d <= w.to);
        const vMid = vedhaCheck(tpName, tMid);
        let vedha = vMid;
        if (vMid && inWin.length >= 2) {
          const vAll = inWin.map(s => vedhaCheck(tpName, s.t)).filter(Boolean);
          const favN = vAll.filter(v => v.fav).length;
          const cleanN = vAll.filter(v => v.fav && !v.vedha).length;
          const favPct = Math.round(favN / vAll.length * 100);
          const cleanPct = favN ? Math.round(cleanN / vAll.length * 100) : 0;
          vedha = { ...vMid, favPct, cleanPct,
            text: favPct === 0
              ? `சந்திரனிலிருந்து இக்கால transit சாதக நிலையில் இல்லை — பாவ-activation மட்டுமே`
              : `சாதக நாட்கள் ${favPct}% • அதில் வேதையில்லா சுத்த நாட்கள் ${cleanPct}%${cleanPct >= 60 ? " ✓" : cleanPct === 0 ? " — முழுக்க வேதை, பலன் தடைபடும்" : " — சுத்த நாட்களில் முயற்சி சிறக்கும்"}` };
        }
        const bMid = bavCheck(tpName, tMid);
        let bav = bMid;
        if (bMid && inWin.length >= 2) {
          const bAll = inWin.map(s => bavCheck(tpName, s.t)).filter(Boolean);
          const kPct = Math.round(bAll.filter(b => b.kBindu).length / bAll.length * 100);
          bav = { ...bMid, kPct, text: `${bMid.text} • கக்ஷ்யா-பிந்து நாட்கள் ~${kPct}%` };
        }
        return { ...w,
          dasha: dashaConfidence(w.mid, relatedSet, linkedHousesArr),
          vedha, bav,
          // Trigger நாட்கள் — சூரியன்/செவ்வாய் ஜென்ம ஸ்புடத்தை கடக்கும் குறிப்பிட்ட நாட்கள்
          triggers: p.fullLong != null ? triggerDaysIn(w.from, w.to, p.fullLong).map(x => ({ planet: x.planet, label: fmtDay(x.date) })) : [] };
      };
      const jupWindows = windowsFor(t => t && t["குரு"] && targets.some(tg => planetHitsRashi("குரு", t["குரு"].rashiIdx, tg)), 3)
        .map(annotate("குரு"))
        .map(w => ({ ...w, text: linkSubha
          ? `குரு transit ஆதரவு — இந்த இணைப்பின் சுப பலன்கள் (${star ? star.linkedHouses.join(",") + " பாவங்கள்" : houseNum + "ஆம் பாவம்"}) மலரும் காலம்`
          : `குரு அருள் transit — அசுப/கலப்பு இணைப்பின் சிக்கல் தணிந்து நல்முடிவு நோக்கி நகரும் காலம்` }));
      const satWindows = windowsFor(t => t && t["சனி"] && targets.some(tg => planetHitsRashi("சனி", t["சனி"].rashiIdx, tg)), 3)
        .map(annotate("சனி"))
        .map(w => {
          let text = isSubhaNature(satNature)
            ? `சனி transit — உழைப்பு/பொறுப்பு வழியே இப்பலன் உறுதியாகும் காலம்`
            : `சனி transit — தாமதம்/சோதனை; ${star && star.tone === "அசுபம்" ? "அசுப பலன் உணரப்படக்கூடிய" : "பலன் தாமதமாகக் கூடிய"} காலம் — பரிகாரம் பலன் தரும்`;
          // ஏழரை சனி / அஷ்டம சனி மேற்பொருந்தல் — சந்திர ராசியிலிருந்து சனியின் நிலை
          if (natalMoon) {
            const satMid = transitAt(w.mid)?.["சனி"];
            if (satMid) {
              const dFromMoon = ((satMid.rashiIdx - natalMoon.rashiIdx + 12) % 12) + 1;
              if ([12, 1, 2].includes(dFromMoon)) text += ` • ⚠ இக்காலம் ஏழரை சனிக்குள்ளும் (${dFromMoon === 12 ? "விரய" : dFromMoon === 1 ? "ஜன்ம" : "பாத"} சனி) அமைகிறது — பொறுமை/பரிகாரம் அவசியம்`;
              else if (dFromMoon === 8) text += ` • ⚠ அஷ்டம சனி காலம் — கூடுதல் கவனம்`;
            }
          }
          return { ...w, text };
        });

      // அடுக்கு-2+3: நட்சத்திர-தொடுகை & டிகிரி-தொடுகை (குரு/சனி/ராகு/கேது)
      const touches = [];
      if (p.nakIdx >= 0) {
        const nakLo = p.nakIdx * NAK_SPAN, nakHi = nakLo + NAK_SPAN;
        const inNak = (L) => { const x = ((L % 360) + 360) % 360; return x >= nakLo && x < nakHi; };
        ["குரு", "சனி", "ராகு", "கேது"].forEach(tpName => {
          // ராகு/கேது true-node முன்-பின் அலைவால் windows துண்டுபடும் — 35-நாள்
          // இடைவெளிக்குள் இருப்பவற்றை ஒரே பெயர்ச்சிக் காலமாக இணை
          const rawWins = windowsFor(t => t && t[tpName] && inNak(t[tpName].fullLong), tpName === "ராகு" || tpName === "கேது" ? 5 : 2);
          const wins = (tpName === "ராகு" || tpName === "கேது") ? mergeWins(rawWins, 35).slice(0, 2) : rawWins;
          wins.forEach(w => {
            const passes = countPasses(tpName, p.fullLong, w.from, w.to);
            touches.push({ planet: tpName, type: "நட்சத்திரம்", label: w.label, from: w.from, to: w.to, passes,
              text: tpName === "ராகு" || tpName === "கேது"
                ? `${tpName} ${p.nakshatraTa} நட்சத்திரத்தில் பெயர்ச்சி — ${p.ta} காரகங்களில் திடீர் மாற்றம்/trigger காலம்`
                : `${tpName} ${p.ta}-இன் ஜென்ம நட்சத்திரத்தையே (${p.nakshatraTa}) கடக்கிறார் — மிகக் கூர்மையான activation${passes >= 3 ? `; ${passes}-கடப்பு (வக்ரத்துடன்) — இறுதி கடப்பில் பலன் நிறைவு` : ""}` });
          });
        });
        // டிகிரி ±1° — உச்சத் தொடுகை (குரு/சனி மட்டும்; மிக அரிதான, மிக வலுவான நாட்கள்)
        ["குரு", "சனி"].forEach(tpName => {
          windowsFor(t => t && t[tpName] && angDiff(t[tpName].fullLong, p.fullLong) <= 1, 2).forEach(w => {
            const passes = countPasses(tpName, p.fullLong, w.from, w.to);
            touches.push({ planet: tpName, type: "டிகிரி", label: w.label, from: w.from, to: w.to, passes,
              text: `${tpName} ${p.ta}-இன் ஜென்ம ஸ்புடத்தை (±1°) நேரடியாகத் தொடுகிறார் — பலன் உச்சம் அடையும் நாட்கள்${passes >= 3 ? `; ${passes}-கடப்பு — இறுதி கடப்பே முடிவு தரும்` : ""}` });
          });
        });
      }
      touches.sort((a, b) => (a.type === "டிகிரி" ? 0 : 1) - (b.type === "டிகிரி" ? 0 : 1));

      // ── 3அ. பாவ சந்தி பலம் (BPHS) — பாவ மத்தியில் முழு பலன், சந்தியில் பூஜ்யம் ──
      let bhavaPos = null;
      if (lagnaFullLong != null && p.fullLong != null) {
        const madhya = (lagnaFullLong + (houseNum - 1) * 30) % 360;
        const dist = angDiff(p.fullLong, madhya);
        if (dist <= 15) {
          const pct = Math.round((1 - dist / 15) * 100);
          bhavaPos = { dist: Math.round(dist * 10) / 10, pct,
            sandhi: dist > 12,
            text: `பாவ மத்தியிலிருந்து ${Math.round(dist * 10) / 10}° — பாவ பலன் திறன் ${pct}%${dist > 12 ? " ⚠ பாவ சந்தி அருகில் — பலன் மிக மெலிதாக வெளிப்படும்" : dist <= 5 ? " ★ பாவ மத்திக்கு அருகில் — முழு வீச்சில் பலன்" : ""}` };
        } else {
          bhavaPos = { dist: Math.round(dist * 10) / 10, pct: 0, sandhi: true,
            text: `சம-பாவ (equal-house) அளவில் இக்கிரகன் அடுத்த பாவ எல்லைக்குள் — whole-sign/பாவ முறை வேறுபாடு; இரு பாவப் பலனும் கலந்து வரும்` };
        }
      }

      // ── 4. பரிகாரம் — யாருக்கு, எதற்காக என்று தெளிவாக ──
      //   (அ) அசுப பார்வை செய்யும் கிரகம் — அப்பார்வையின் கடுமை தணிய
      //   (ஆ) நட்சத்திராதிபதி — இணைப்பு சுபமில்லாத எல்லா நிலையிலும் (அசுபம்/கலப்பு)
      //       அவரை வலுப்படுத்துவதே முதன்மைப் பரிகாரம்: சுப கிரகமே 6/8/12-இல்
      //       பலவீனமாக இருந்தாலும் அவருக்கான பரிகாரமே இணைப்பை சீராக்கும்
      //   (இ) அமர்ந்த கிரகமே ராகு/கேது/பாபன் எனில் — அவருக்கும்
      const remedyMap = new Map(); // ta → why[]
      const addRemedy = (ta, why) => {
        if (!ta || !PLANET_REMEDIES[ta]) return;
        if (!remedyMap.has(ta)) remedyMap.set(ta, []);
        remedyMap.get(ta).push(why);
      };
      aspects.filter(a => a.tone === "அசுபம்").forEach(a =>
        addRemedy(a.from, `${a.from}-இன் அசுப பார்வை ${p.ta} மீது விழுகிறது — அதன் கடுமை தணிய`));
      if (star && star.tone !== "சுபம்")
        addRemedy(star.starLord, `நட்சத்திராதிபதி ${star.starLord} (${star.slNature}${star.slHouse ? `, ${star.slHouse}ஆம் வீட்டில்` : ""}) வலுப்பெற்றால் ${p.ta} வழி வரும் ${star.linkedHouses.join(",")} பாவப் பலன்கள் சீராகும்`);
      if ((p.ta === "ராகு" || p.ta === "கேது" || natureOf(p.ta) === "பாபன்") && (!star || star.tone !== "சுபம்"))
        addRemedy(p.ta, `${p.ta} ${houseNum}ஆம் வீட்டில் அமர்ந்திருப்பதன் அசுப விளைவு தணிய`);
      const remedies = [...remedyMap.entries()].map(([ta, whys]) => {
        const r = PLANET_REMEDIES[ta];
        return { planet: ta, why: whys.join(" • "), gem: r.gem, mantra: r.mantra, count: r.mantraCount, temple: r.temple, day: r.day, donate: r.donate };
      });

      const verdict = (star ? star.tone : null) === "அசுபம்" || asubhaAsp > subhaAsp ? "அசுபம் மேலோங்கும் — பரிகாரம் அவசியம்"
        : (star ? star.tone : null) === "சுபம்" && subhaAsp >= asubhaAsp ? "சுபம் மேலோங்கும்"
        : "சுப-அசுப கலப்பு";
      // ── KP உட்பிரிவு அதிபதி — நட்சத்திராதிபதி "எதை" காட்டுவார்;
      //    உட்பிரிவு அதிபதி "நிறைவேறுமா" என்று முடிவு செய்வார் ──
      const subLord = p.fullLong != null ? subLordOf(p.fullLong) : null;
      const subNature = subLord ? natureOf(subLord) : null;
      const kp = subLord ? { subLord, nature: subNature,
        text: `KP உட்பிரிவு அதிபதி: ${subLord} (${subNature}) — ${isSubhaNature(subNature) ? "நட்சத்திராதிபதி காட்டும் பலன் நிறைவேற உதவுவார் ✓" : isAsubhaNature(subLord, subNature) ? "பலன் நிறைவேற்றத்தில் தடை/திருப்பம் தருவார் — பரிகாரம் முக்கியம்" : "நடுநிலை — சூழல்படி முடிவு"}` } : null;
      // இணைப்புச் செயல்திறன் — ஒருங்கிணைந்த பலத்திலிருந்து (5 அளவுகோல் composite)
      const linkPower = {
        self: unifiedOf(p.ta)?.composite ?? null,
        star: star ? (unifiedOf(star.starLord)?.composite ?? null) : null
      };

      return { ta: p.ta, symbol: p.symbol, rashi: p.rashi, star, aspects, subhaAsp, asubhaAsp,
               jupWindows, satWindows, touches, bhavaPos, kp, linkPower, remedies, verdict };
    });

    return { houseNum, houseTa: theme?.ta, theme: theme?.theme, houseRashi: RASHIS[houseRashiIdx],
             isEmpty: false, occupants: occAnalysis };
  });

  return { houses, generatedAt: new Date().toISOString() };
}

// ═══════════════════════════════════════════════════════════════════
// தசா சந்தி (DASHA SANDHI) — இரு தசைகள்/புக்திகள் மாறும் இடைக்காலம்.
// மகா தசை மாற்றம் ±30 நாள், புக்தி மாற்றம் ±10 நாள் எச்சரிக்கை.
// ═══════════════════════════════════════════════════════════════════
function calcDashaSandhi(dashaData, now = new Date()) {
  if (!dashaData || !dashaData.dashas) return null;
  const md = dashaData.dashas.find(d => now >= d.startDate && now < d.endDate);
  if (!md) return null;
  const alerts = [];
  const dayMs = 86400000;
  const mdDaysLeft = Math.round((md.endDate - now) / dayMs);
  const mdDaysIn = Math.round((now - md.startDate) / dayMs);
  if (mdDaysLeft <= 30) alerts.push({ level:"high", text:`மகா தசை சந்தி: ${md.name} தசை ${mdDaysLeft} நாளில் முடிகிறது — முக்கிய முடிவுகளை தள்ளிவைப்பது நலம்` });
  else if (mdDaysIn <= 30) alerts.push({ level:"med", text:`மகா தசை சந்தி: ${md.name} தசை தொடங்கி ${mdDaysIn} நாள்தான் — புதிய தசையின் பலன் நிலைபெற சில வாரங்கள் ஆகும்` });
  const ad = md.antardashas?.find(a => now >= a.startDate && now < a.endDate);
  if (ad) {
    const adDaysLeft = Math.round((ad.endDate - now) / dayMs);
    const adDaysIn = Math.round((now - ad.startDate) / dayMs);
    if (adDaysLeft <= 10) alerts.push({ level:"med", text:`புக்தி சந்தி: ${ad.name} புக்தி ${adDaysLeft} நாளில் முடிகிறது` });
    else if (adDaysIn <= 10) alerts.push({ level:"low", text:`புக்தி சந்தி: ${ad.name} புக்தி தொடங்கி ${adDaysIn} நாள்` });
  }
  return alerts.length ? alerts : null;
}

// ═══════════════════════════════════════════════════════════════════
// குளிகன் / மாந்தி நிலை (GULIKA POSITION) — சனியின் காலப்பகுதி:
// பகல்/இரவை 8 சம பாகமாகப் பிரித்து, வார அதிபதியில் தொடங்கி வரிசையாக —
// சனிக்குரிய பாகத்தின் தொடக்க நேரத்தில் உதிக்கும் லக்னமே குளிகன்.
// லக்ன கணிதம் — ஏற்கனவே உள்ள engine (generateHoroscope lightweight) வழியே.
// ═══════════════════════════════════════════════════════════════════
function calcGulikaPosition(dobISO, tob, lat, lon, ayanamsaKey = "lahiri") {
  try {
    const [y, m, d] = dobISO.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const { sunrise, sunset } = calcSunriseSunset(dateObj, lat, lon, 5.5);
    let [bh, bm] = (tob || "06:00").split(':').map(Number);
    // hour 0 (12 AM) is falsy — Number.isFinite guard, not ||
    const birthDec = (Number.isFinite(bh) ? bh : 6) + (Number.isFinite(bm) ? bm : 0) / 60;
    const WEEK = ["சூரியன்","சந்திரன்","செவ்வாய்","புதன்","குரு","சுக்கிரன்","சனி"];
    let isDay = birthDec >= sunrise.decimal && birthDec < sunset.decimal;
    let wd = dateObj.getDay();
    // நள்ளிரவுக்குப் பின் பிறப்பு = முந்தைய வேத நாளின் இரவு — வாரமும் சூரிய
    // அஸ்தமனமும் முந்தைய civil நாளினுடையவை (இல்லையேல் குளிகை ஒரு நாள்
    // தள்ளிப் போகும்).
    const isPostMidnight = !isDay && birthDec < sunrise.decimal;
    if (isPostMidnight) wd = (wd + 6) % 7;
    const nightBaseDate = isPostMidnight ? new Date(y, m - 1, d - 1) : dateObj;
    const nightSunset = isPostMidnight ? calcSunriseSunset(nightBaseDate, lat, lon, 5.5).sunset : sunset;
    const startLordIdx = isDay ? wd : (wd + 4) % 7; // இரவு: பகல் அதிபதியின் 5ஆம் கிரகம்
    let satSeg = -1;
    for (let i = 0; i < 7; i++) { if (WEEK[(startLordIdx + i) % 7] === "சனி") { satSeg = i; break; } }
    const dayLen = sunset.decimal - sunrise.decimal;
    const nightLen = 24 - dayLen;
    const segLen = (isDay ? dayLen : nightLen) / 8;
    let segStart = isDay ? sunrise.decimal + satSeg * segLen : nightSunset.decimal + satSeg * segLen;
    // இரவுப் பிறப்பில் segment தொடங்கும் civil நாள் = இரவு தொடங்கிய நாள்
    let gBase = isDay ? dateObj : nightBaseDate;
    if (segStart >= 24) {
      segStart -= 24;
      gBase = new Date(gBase.getFullYear(), gBase.getMonth(), gBase.getDate() + 1);
    }
    const gDob = `${gBase.getFullYear()}-${String(gBase.getMonth()+1).padStart(2,'0')}-${String(gBase.getDate()).padStart(2,'0')}`;
    const gh = Math.floor(segStart), gm = Math.round((segStart - gh) * 60);
    const gulikaChart = generateHoroscope(gDob, `${gh}:${gm}`, lat, lon, true, ayanamsaKey);
    const fullLong = gulikaChart.lagnaFullLong != null ? gulikaChart.lagnaFullLong : gulikaChart.lagna * 30;
    const nakIdx = Math.floor(fullLong / (360/27)) % 27;
    return {
      rashiIdx: gulikaChart.lagna, rashi: RASHIS[gulikaChart.lagna],
      fullLong, degInSign: Math.round((fullLong % 30) * 10) / 10,
      nakshatra: NAKSHATRAS[nakIdx],
      timeLabel: `${String(gh).padStart(2,'0')}:${String(gm).padStart(2,'0')}`,
      isDay
    };
  } catch (e) { return null; }
}

// ═══════════════════════════════════════════════════════════════════
// பிறப்பு நேர நுண்ணுணர்வு (BIRTH-TIME SENSITIVITY) — லக்னம்/நட்சத்திரம்/
// பாதம் எல்லைக்கு எத்தனை நிமிட நேர மாற்றத்தில் மாறும் என்று கணித்து எச்சரிக்கை.
// லக்னம் ~1°/4நிமி; சந்திரன் ~13.18°/நாள்.
// ═══════════════════════════════════════════════════════════════════
function calcBirthTimeSensitivity(horoscope) {
  if (!horoscope) return null;
  const warnings = [];
  const lagnaFull = horoscope.lagnaFullLong;
  if (lagnaFull != null) {
    const dIn = lagnaFull % 30;
    const toEdge = Math.min(dIn, 30 - dIn);
    const mins = Math.round(toEdge * 4);
    if (mins <= 20) warnings.push({
      level: mins <= 8 ? "high" : "med",
      text: `லக்னம் ராசி எல்லைக்கு ${toEdge.toFixed(1)}° அருகில் — பிறப்பு நேரத்தில் ±${mins} நிமிட மாற்றம் லக்ன ராசியையே மாற்றும். நேரத் துல்லியம் உறுதி செய்யவும்.`
    });
  }
  const moon = horoscope.placements?.find(p => p.ta === "சந்திரன்");
  if (moon && moon.fullLong != null) {
    const span = 360 / 27;
    const inNak = moon.fullLong % span;
    const toNakEdge = Math.min(inNak, span - inNak);
    const nakMins = Math.round(toNakEdge / 13.18 * 24 * 60);
    if (nakMins <= 60) warnings.push({
      level: nakMins <= 20 ? "high" : "med",
      text: `சந்திரன் நட்சத்திர எல்லைக்கு அருகில் — ±${nakMins} நிமிட நேர மாற்றத்தில் ஜென்ம நட்சத்திரமும் தசா இருப்பும் மாறும்.`
    });
    const padaSpan = span / 4;
    const inPada = moon.fullLong % padaSpan;
    const toPadaEdge = Math.min(inPada, padaSpan - inPada);
    const padaMins = Math.round(toPadaEdge / 13.18 * 24 * 60);
    if (padaMins <= 15 && nakMins > 60) warnings.push({
      level: "low",
      text: `சந்திரன் பாத எல்லைக்கு அருகில் — ±${padaMins} நிமிடத்தில் பாதம் மாறும் (நாமகரண எழுத்து மாறலாம்).`
    });
  }
  return warnings.length ? warnings : null;
}

// ═══════════════════════════════════════════════════════════════════
// வாழ்க்கை நிகழ்வு காலக்கணிப்பு (LIFE-EVENT TIMING ENGINE)
// அனுபவ ஜோதிடர் முறை — ஒவ்வொரு கேள்விக்கும் ஒரே generic framework:
//   1. வாக்குறுதி (Promise): வீடு-அதிபதி-காரக பலம் → ஜாதகத்தில் உண்டா?
//   2. Activation: எந்தக் கிரகங்களின் தசா-புக்தி நிகழ்வைத் தூண்டும்?
//   3. கோசார filter: குரு+சனி இரட்டை transit ஆதரவு உள்ள windows
//   4. தரவரிசை தேதி-வரம்புகள் + நம்பிக்கை + முழு காரணச் சங்கிலி
// அனைத்தும் ஏற்கனவே உள்ள engines-இல் இருந்தே (shadbala, functional
// nature, planet context, drishti, dasha, transit) — புதிய கணிதம் இல்லை.
// ═══════════════════════════════════════════════════════════════════
const EVENT_TOPICS = {
  marriage:  { ta:"திருமணம்", icon:"💒", primary:7,  support:[2,11], karakas:["சுக்கிரன்","குரு"], minAge:17 },
  // mood:"caution" → இத்தலைப்பின் "windows" = நோய்/சவால் activation காலங்கள்;
  // UI அவற்றை "கூடுதல் கவனம் தேவை" என்று (சாதகம் அல்ல!) காட்ட வேண்டும், மேலும்
  // சுப-நிகழ்வு விதியான குரு-பெயர்ச்சி bonus இங்கு பொருந்தாது.
  health:    { ta:"ஆரோக்கியம்", icon:"🏥", primary:6, support:[8,12], karakas:["சூரியன்","சந்திரன்"], minAge:1, mood:"caution" },
  career:    { ta:"தொழில்/வேலை", icon:"💼", primary:10, support:[6,2,11], karakas:["சனி","சூரியன்","புதன்"], minAge:16 },
  children:  { ta:"குழந்தை", icon:"👶", primary:5,  support:[2,11], karakas:["குரு"], minAge:17 },
  property:  { ta:"வீடு/வாகனம்", icon:"🏠", primary:4,  support:[2,11], karakas:["செவ்வாய்","சந்திரன்"], minAge:18 },
  foreign:   { ta:"வெளிநாடு", icon:"✈️", primary:12, support:[9,3], karakas:["ராகு"], minAge:16 },
  education: { ta:"உயர்கல்வி", icon:"🎓", primary:5,  support:[4,9], karakas:["புதன்","குரு"], minAge:14 },
  wealth:    { ta:"செல்வ வளர்ச்சி", icon:"💰", primary:11, support:[2,9], karakas:["குரு","சுக்கிரன்"], minAge:16 }
};

// ஒரு ராசியிலிருந்து மற்றொரு ராசியை கிரகம் பார்க்கிறதா/அமர்ந்துள்ளதா (whole-sign)
function planetHitsRashi(planetTa, fromRashiIdx, targetRashiIdx) {
  if (fromRashiIdx === targetRashiIdx) return true;
  const rules = DRISHTI_RULES[planetTa] || DRISHTI_RULES.default;
  return rules.includes(((targetRashiIdx - fromRashiIdx + 12) % 12) + 1);
}

// ═══════════════════════════════════════════════════════════════════
// ACTIVATION எடைகள் — ஒரு கேள்விக்கு (திருமணம்/தொழில்...) எந்தக் கிரகம்
// எவ்வளவு எடையுடன் காலத்தை activate செய்யும். calcEventTiming (எதிர்காலம்)
// மற்றும் calcBacktest (கடந்தகால சரிபார்ப்பு) இரண்டும் இதையே பயன்படுத்தும்.
// ═══════════════════════════════════════════════════════════════════
function buildActivationWeights(topicKey, placements, lagnaIdx, functionalNat) {
  const topic = EVENT_TOPICS[topicKey];
  if (!topic) return { topic: null, weights: {}, pRashiIdx: 0, pLordName: null, pLord: null };
  const houseRashi = (h) => (lagnaIdx + h - 1) % 12;
  const houseOfP = (x) => ((x.rashiIdx - lagnaIdx + 12) % 12) + 1;
  const lordOf = (h) => RASHI_LORD_NAME[houseRashi(h)];
  const natureOf = (ta) => functionalNat?.[ta]?.nature || "சமம்";
  const pRashiIdx = houseRashi(topic.primary);
  const pLordName = lordOf(topic.primary);
  const pLord = placements.find(x => x.ta === pLordName);
  const weights = {};
  const addW = (ta, w, why) => { if (!ta) return; if (!weights[ta]) weights[ta] = { w: 0, why: [] }; weights[ta].w += w; weights[ta].why.push(why); };
  addW(pLordName, 3, `${topic.primary}ஆம் அதிபதி`);
  placements.filter(x => houseOfP(x) === topic.primary).forEach(x => addW(x.ta, 2.5, `${topic.primary}இல் அமர்வு`));
  topic.karakas.forEach(k => addW(k, 2, "காரகன்"));
  topic.support.forEach(h => addW(lordOf(h), 1.5, `${h}ஆம் அதிபதி`));
  aspectorsOnHouse(placements, lagnaIdx, pRashiIdx).forEach(a => addW(a.planet, 1.2, `${topic.primary}ஐ பார்வை`));
  // அதிபதியின் நட்சத்திராதிபதி வழியாகவும் activation (KP அடிப்படை)
  if (pLord && pLord.nakIdx >= 0) addW(getNakshatraLord(pLord.nakIdx).name, 1.2, `அதிபதியின் நட்சத்திராதிபதி`);
  // ── ராகு/கேது பிரதிநிதித்துவம் (NODE AGENCY) — KP + பராசர விதி:
  // நிழல் கிரகங்கள் தமக்கெனப் பலன் தராமல், (1) தம் நட்சத்திராதிபதி
  // (முதன்மை — KP), (2) தம் ராசிநாதன் (இரண்டாம்), (3) தம்முடன் கூடிய
  // கிரகம் — இவர்களின் பலன்களைத் தருகின்றன. அந்த அதிபதிகள் இக்கேள்வியில்
  // activation பெற்றிருந்தால் அப்பங்கு ராகு/கேதுவுக்கும் சேர வேண்டும்.
  // உண்மை-தரவு உதாரணம் (29.01.1981 ஜாதகம்): ராகு ஆயில்யத்தில் —
  // நட்சத்திராதிபதி புதன் = 7ஆம் அதிபதி; திருமணம் நடந்ததும் சரியாக
  // சனி-குரு-ராகு பிரத்யந்தரத்தில். இவ்விதி இல்லாமல் ராகு எடை 0 ஆக
  // இருந்து அந்நுண்-window அடையாளம் காணப்படவில்லை.
  ["ராகு", "கேது"].forEach(nodeTa => {
    const node = placements.find(x => x.ta === nodeTa);
    if (!node || node.nakIdx == null || node.nakIdx < 0) return;
    const starLord = getNakshatraLord(node.nakIdx).name;
    const signLord = RASHI_LORD_NAME[node.rashiIdx];
    const conj = placements.find(x => x.ta !== nodeTa && CLASSICAL_7.includes(x.ta) && x.rashiIdx === node.rashiIdx);
    const starW = weights[starLord]?.w || 0;
    const signW = weights[signLord]?.w || 0;
    const conjW = conj ? (weights[conj.ta]?.w || 0) : 0;
    // KP dictum: "நிழல் கிரகம் தன் நட்சத்திராதிபதியின் பலனை அவரை விடவும்
    // வலுவாகத் தரும்" — எனவே நட்சத்திராதிபதி எடை முழுமையாக (×1.0) கடத்தப்படும்;
    // ராசிநாதன்/சேர்க்கை இரண்டாம்-நிலை (×0.4/×0.5).
    const inherited = starW * 1.0 + signW * 0.4 + conjW * 0.5;
    if (inherited >= 0.6) {
      const why = [];
      if (starW > 0) why.push(`${starLord} நட்சத்திரத்தில்`);
      if (signW > 0) why.push(`${signLord} ராசியில்`);
      if (conjW > 0) why.push(`${conj.ta} சேர்க்கை`);
      addW(nodeTa, Math.round(inherited * 10) / 10, `பிரதிநிதி (${why.join(", ")})`);
    }
  });
  Object.keys(weights).forEach(ta => { if (natureOf(ta) === "யோககாரகன்") weights[ta].w += 0.5; });
  return { topic, weights, pRashiIdx, pLordName, pLord };
}

// ═══════════════════════════════════════════════════════════════════
// ஜாதக வாக்குறுதி (EVENT PROMISE) — ஒரு கேள்விக்கு ஜாதகம் என்ன அளவு
// வாக்களிக்கிறது (0-100). calcEventTiming (எதிர்காலம்) மற்றும் calcBacktest
// (சரிபார்ப்பு) இரண்டும் இதே ஒரே கணிப்பைப் பயன்படுத்தும்.
// ═══════════════════════════════════════════════════════════════════
function calcEventPromise(topicKey, deps) {
  const { horoscope, shadBala, functionalNat, planetCtx, chevvai, navStrength, ashtakavarga, avasthas } = deps;
  const topic = EVENT_TOPICS[topicKey];
  if (!topic || !horoscope) return { promise: 50, pReasons: [], promiseVerdict: "" };
  const lagnaIdx = horoscope.lagna;
  const placements = horoscope.placements;
  const houseRashi = (h) => (lagnaIdx + h - 1) % 12;
  const houseOf = (p) => ((p.rashiIdx - lagnaIdx + 12) % 12) + 1;
  const lordOf = (h) => RASHI_LORD_NAME[houseRashi(h)];
  const findP = (ta) => placements.find(p => p.ta === ta);
  const sbOf = (ta) => (shadBala || []).find(s => s.ta === ta);
  const natureOf = (ta) => functionalNat?.[ta]?.nature || "சமம்";
  const ctxOf = (ta) => (planetCtx || []).find(c => c.ta === ta);

  const pReasons = [];
  let promise = 50;
  const pLordName = lordOf(topic.primary);
  const pLord = findP(pLordName);
  const pRashiIdx = houseRashi(topic.primary);

  const sb = sbOf(pLordName);
  if (sb) {
    const ratio = sb.total / sb.required;
    if (ratio >= 1) { promise += 12; pReasons.push(`+ ${topic.primary}ஆம் அதிபதி ${pLordName} ஷட்பலத்தில் பலம் (${Math.round(sb.total)}/${sb.required})`); }
    else if (ratio < 0.6) { promise -= 12; pReasons.push(`− ${topic.primary}ஆம் அதிபதி ${pLordName} ஷட்பலத்தில் பலவீனம்`); }
  }
  if (pLord) {
    const lh = houseOf(pLord);
    if ([1,4,5,7,9,10].includes(lh)) { promise += 8; pReasons.push(`+ அதிபதி ${pLordName} ${lh}ஆம் வீட்டில் (கேந்திர/திரிகோணம்)`); }
    else if ([6,8,12].includes(lh)) { promise -= 10; pReasons.push(`− அதிபதி ${pLordName} ${lh}ஆம் வீட்டில் (துஸ்தானம்)`); }
    if (pLord.isCombust) { promise -= 6; pReasons.push(`− அதிபதி அஸ்தங்கம்`); }
    const pctx = ctxOf(pLordName);
    if (pctx) {
      if (pctx.net >= 2) { promise += 6; pReasons.push(`+ அதிபதியின் கிரக சூழல் சாதகம் (ராசிநாதன்/நட்சத்திராதிபதி பலம்)`); }
      else if (pctx.net <= -2) { promise -= 6; pReasons.push(`− அதிபதியின் கிரக சூழல் பாதகம்`); }
    }
    const nv = (navStrength || []).find(n => n.ta === pLordName);
    if (nv) {
      if (nv.vargottama) { promise += 6; pReasons.push(`+ அதிபதி வர்கோத்தமம் (D9 உறுதிப்பாடு)`); }
      else if (nv.d9Status === "நீசம்") { promise -= 6; pReasons.push(`− அதிபதி நவாம்சத்தில் நீசம்`); }
    }
  }
  // primary வீட்டில் உள்ளோர்
  placements.filter(p => houseOf(p) === topic.primary).forEach(p => {
    const n = natureOf(p.ta);
    if (n === "யோககாரகன்" || n === "சுபன்") { promise += 6; pReasons.push(`+ ${topic.primary}இல் ${p.ta} (${n})`); }
    else if (n === "பாபன்" || p.ta === "ராகு" || p.ta === "கேது") { promise -= 5; pReasons.push(`− ${topic.primary}இல் ${p.ta} (${n === "பாபன்" ? "பாபன்" : "சாயா கிரகம்"})`); }
  });
  // primary வீட்டின் மீதான பார்வைகள்
  aspectorsOnHouse(placements, lagnaIdx, pRashiIdx).forEach(a => {
    const n = natureOf(a.planet);
    if (n === "யோககாரகன்" || n === "சுபன்") { promise += 4; pReasons.push(`+ ${a.planet} (${n}) ${topic.primary}ஐ பார்க்கிறார்`); }
    else if (n === "பாபன்") { promise -= 4; pReasons.push(`− ${a.planet} (பாபன்) ${topic.primary}ஐ பார்க்கிறார்`); }
  });
  // காரகர்கள்
  topic.karakas.forEach(k => {
    const kp = findP(k);
    if (!kp) return;
    const dig = signDignity(kp);
    if (dig === "உச்சம்" || dig === "சொந்தம்") { promise += 5; pReasons.push(`+ காரகன் ${k} ${dig}`); }
    else if (dig === "நீசம்") { promise -= 5; pReasons.push(`− காரகன் ${k} நீசம்`); }
  });
  // சர்வாஷ்டகவர்க்கம் — primary வீட்டு ராசியின் SAV பிந்து
  const pSav = ashtakavarga?.sav?.[pRashiIdx];
  if (pSav != null) {
    if (pSav >= 30) { promise += 8; pReasons.push(`+ ${topic.primary}ஆம் வீட்டு ராசியில் SAV ${pSav} பிந்து (≥30) — அஷ்டகவர்க்க ஆதரவு வலு`); }
    else if (pSav <= 24) { promise -= 8; pReasons.push(`− ${topic.primary}ஆம் வீட்டு ராசியில் SAV ${pSav} பிந்து (≤24) — அஷ்டகவர்க்க ஆதரவு குறைவு`); }
  }
  // அதிபதியின் அவஸ்தை — BPHS 45
  const pAv = (avasthas || []).find(a => a.ta === pLordName);
  if (pAv) {
    if (pAv.baladi.pct >= 100) { promise += 5; pReasons.push(`+ அதிபதி ${pLordName} ${pAv.baladi.name} — முழு பலன் தரும் நிலை`); }
    else if (pAv.baladi.pct <= 25) { promise -= 5; pReasons.push(`− அதிபதி ${pLordName} ${pAv.baladi.name} — பலன் ${pAv.baladi.pct}% அளவே`); }
  }
  // திருமணம்-சிறப்பு: செவ்வாய் தோஷம்
  if (topicKey === "marriage" && chevvai?.present && !chevvai?.cancelled) {
    promise -= 10; pReasons.push(`− செவ்வாய் தோஷம் (நிவர்த்தி இல்லை) — பொருத்தம்/பரிகாரம் கவனம்`);
  }
  promise = Math.max(5, Math.min(95, Math.round(promise)));
  const promiseVerdict = promise >= 65 ? "வலுவான வாக்குறுதி" : promise >= 45 ? "நடுத்தர வாக்குறுதி" : "பலவீன வாக்குறுதி — தாமதம்/பரிகாரத்துடன்";
  return { promise, pReasons, promiseVerdict };
}

// ═══════════════════════════════════════════════════════════════════
// பின்நோக்கு சரிபார்ப்பு (BACK-TEST) — World No.1 துல்லியத்தின் அடித்தளம்.
// நடந்த நிகழ்வின் (திருமணம்/வேலை...) உண்மையான தேதியை உள்ளிட்டால்,
// அன்று ஓடிய தசை-புக்தி + அன்றைய குரு/சனி கோசாரம் — engine-ன் அதே
// விதிகளால் — அந்நாளை அடையாளம் காட்டியிருக்குமா என்று மதிப்பிடும்.
// பொருந்தினால் விதிகள் சரி; பொருந்தாவிட்டால் அது விதி-மேம்பாட்டுத் தரவு.
// ═══════════════════════════════════════════════════════════════════
function calcBacktest(topicKey, eventDate, deps) {
  const { horoscope, dashaData, functionalNat, geo, ayanamsaKey, dobISO } = deps;
  if (!horoscope || !dashaData?.dashas) return null;
  const act = buildActivationWeights(topicKey, horoscope.placements, horoscope.lagna, functionalNat);
  if (!act.topic) return null;
  const { topic, weights, pRashiIdx, pLord } = act;

  // ஒரே scoring — நிகழ்வு தேதிக்கும் ஒப்பீட்டு (control) தேதிகளுக்கும் இதே விதி.
  // collect=true எனில் காரண விவரங்களும் திரட்டப்படும் (நிகழ்வு தேதிக்கு மட்டும்).
  const scoreDate = (d, collect) => {
    const reasons = collect ? [] : null;
    const md = dashaData.dashas.find(x => d >= x.startDate && d < x.endDate);
    const ad = md?.antardashas?.find(x => d >= x.startDate && d < x.endDate);
    // பிரத்யந்தர் (3ஆம் நிலை) — புக்திக்குள் நுண்-கால activation. calcEventTiming-இன்
    // subWindows-உம் இதே விதி — இரு திசையும் ஒரே scoring என்ற கொள்கை.
    const pad = ad?.pratyantardashas?.find(x => d >= x.startDate && d < x.endDate);
    const mdW = md ? (weights[md.name]?.w || 0) : 0;
    const adW = ad ? (weights[ad.name]?.w || 0) : 0;
    const pdW = pad ? (weights[pad.name]?.w || 0) : 0;
    let dScore = mdW + adW * 1.6 + Math.min(1.5, pdW * 0.35);
    if (collect) {
      if (md) reasons.push(mdW > 0
        ? `நிகழ்வு நாளில் ${md.name} தசை — activation எடை ${Math.round(mdW*10)/10} (${weights[md.name].why.join(", ")})`
        : `நிகழ்வு நாளில் ${md.name} தசை — இக்கேள்வியுடன் நேரடித் தொடர்பில்லை`);
      if (ad) reasons.push(adW > 0
        ? `${ad.name} புக்தி — எடை ${Math.round(adW*10)/10} (${weights[ad.name].why.join(", ")})`
        : `${ad.name} புக்தி — தொடர்பில்லை`);
      if (pad && pdW > 0) reasons.push(`${pad.name} பிரத்யந்தரம் (${pad.startDate.toLocaleDateString("ta-IN")} → ${pad.endDate.toLocaleDateString("ta-IN")}) — நுண்-நிலை activation ✓`);
    }
    if (mdW > 0 && adW > 0) { dScore += 1; if (collect) reasons.push("தசை + புக்தி இரண்டும் தொடர்புடையவை — engine இதை வலுவான window ஆகக் கொடுத்திருக்கும்"); }
    let tScore = 0;
    try {
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const th = generateHoroscope(iso, "12:00", geo.lat, geo.lon, true, ayanamsaKey);
      const tJup = th.placements.find(x => x.ta === "குரு"), tSat = th.placements.find(x => x.ta === "சனி");
      const targets = [pRashiIdx, pLord ? pLord.rashiIdx : pRashiIdx];
      const jupHit = tJup && targets.some(tg => planetHitsRashi("குரு", tJup.rashiIdx, tg));
      const satHit = tSat && targets.some(tg => planetHitsRashi("சனி", tSat.rashiIdx, tg));
      if (jupHit && satHit) { tScore = 2; if (collect) reasons.push(`அன்று குரு (${tJup.rashi}) + சனி (${tSat.rashi}) இருவரும் ${topic.primary}ஆம் வீடு/அதிபதியைத் தொடுகின்றனர் — இரட்டை transit ✓`); }
      else if (jupHit) { tScore = 1; if (collect) reasons.push(`அன்று குரு (${tJup.rashi}) ${topic.primary}ஆம் வீடு/அதிபதியைத் தொடுகிறார் ✓`); }
      else if (satHit) { tScore = 0.5; if (collect) reasons.push(`அன்று சனி (${tSat.rashi}) ${topic.primary}ஆம் வீடு/அதிபதி தொடர்பில்`); }
      else if (collect) reasons.push("அன்று குரு/சனி இருவரும் நேரடித் தொடர்பில் இல்லை");
      // குரு பெயர்ச்சி விதி — ஜன்ம ராசியிலிருந்து குரு சுப வீட்டில் (2/5/7/9/11)
      // இருந்தானா. calcEventTiming மாத-scan-இன் அதே விதி (இரு திசையும் ஒரே scoring).
      // caution topics (நோய்) — சுப-நிகழ்வு விதி பொருந்தாது.
      const moonR = horoscope.placements.find(x => x.ta === "சந்திரன்")?.rashiIdx;
      if (topic.mood !== "caution" && tJup && moonR != null) {
        const gh = ((tJup.rashiIdx - moonR + 12) % 12) + 1;
        if (GOCHARA_RULES["குரு"].good.includes(gh)) {
          tScore += 0.5;
          if (collect) reasons.push(`அன்று குரு ஜன்ம ராசியிலிருந்து ${gh}ஆம் வீட்டில் — குரு பெயர்ச்சி சுபம் ✓`);
        }
      }
    } catch (e) { /* transit கணிப்பு தோல்வி — தசை score மட்டும் */ }
    return { score: Math.round((dScore + tScore) * 10) / 10, dScore: Math.round(dScore*10)/10, tScore, reasons,
      md: md?.name || "—", ad: ad?.name || "—",
      // நிகழ்வு விழுந்த தசை/புக்தி/பிரத்யந்தர from→to வீச்சுகள் — UI-இல்
      // "இந்தக் காலத்துக்குள் நிகழ்வு" என்று தெளிவாகக் காட்ட
      windows: collect ? {
        md: md ? { name: md.name, start: md.startDate, end: md.endDate } : null,
        ad: ad ? { name: ad.name, start: ad.startDate, end: ad.endDate } : null,
        pad: pad ? { name: pad.name, start: pad.startDate, end: pad.endDate, weighted: pdW > 0 } : null,
      } : null };
  };

  const ev = scoreDate(eventDate, true);

  // ═══ ஒப்பீட்டு-தேதி percentile — அறிவியல் நேர்மையின் மையம் ═══
  // நிகழ்வு தேதி மட்டும் அதிக score பெற்றால் போதாது — வாழ்நாளின் சீரிடை
  // 48 தேதிகளுடன் ஒப்பிட்டு "எல்லா நாட்களிலும் top X%" என்று நிரூபிக்க வேண்டும்.
  // சீரிடை (deterministic) தேதிகள் — random அல்ல, எனவே மீண்டும் ஓட்டினாலும் அதே முடிவு.
  const percentile = (() => {
    let startD;
    if (dobISO) { const [by, bm, bd] = dobISO.split('-').map(Number); startD = new Date(by + (topic.minAge || 15), bm - 1, bd); }
    else startD = new Date(eventDate.getFullYear() - 15, 0, 1);
    const endD = new Date();
    if (startD >= endD) return null;
    const N = 48;
    const step = (endD.getTime() - startD.getTime()) / N;
    const controls = [];
    for (let i = 0; i < N; i++) {
      const cd = new Date(startD.getTime() + step * (i + 0.5));
      controls.push(scoreDate(cd, false).score);
    }
    const below = controls.filter(s => s < ev.score).length;
    const equal = controls.filter(s => s === ev.score).length;
    const beatPct = Math.round(((below + equal / 2) / N) * 100);
    const sorted = [...controls].sort((a, b) => a - b);
    return { n: N, beatPct, topPct: 100 - beatPct, median: sorted[Math.floor(N / 2)], max: sorted[N - 1] };
  })();

  // ═══ ஜாதக வாக்குறுதி — காலம் சரியாக இருந்தும் வாக்குறுதி பலவீனமெனில்
  // அது engine-தவறு அல்ல; அந்தச் சூழலை வெளிப்படையாகக் காட்டு ═══
  const promiseR = calcEventPromise(topicKey, deps);

  // ═══ இறுதித் தரம் — மதிப்பெண் + percentile இரண்டும் சேர்ந்தே ═══
  // உண்மை-தரவு பாடம் (அபூதாகிர் ஜாதகம்): நீண்ட தசைகளில் பல நாட்களும் உயர்
  // மதிப்பெண் பெறும்; தவறான தேதி கூட "உயர்" ஆகிவிடும். percentile-தான்
  // காலம்-பிரித்தறியும் உண்மை அளவுகோல் — உண்மை திருமணக் காலம் top 3% (14.2),
  // தவறான தேதி top 45% (9.2). எனவே: percentile மோசமெனில் தரம் இறங்கும்,
  // அரிதான உச்சமெனில் தரம் ஏறும்.
  let hit = ev.score >= 7 ? "உயர்" : ev.score >= 4.5 ? "நடுத்தரம்" : "குறை";
  let discNote = null;
  if (percentile) {
    if (hit === "உயர்" && percentile.topPct > 40) {
      hit = "நடுத்தரம்";
      discNote = `மதிப்பெண் ${ev.score} உயர்வாக இருந்தும், வாழ்நாளின் ~${percentile.beatPct <= 50 ? 100 - percentile.topPct : percentile.beatPct}% நாட்களும் இதே அளவை எட்டுகின்றன (top ${percentile.topPct}% மட்டுமே) — இச்சூழலில் காலம்-பிரித்தறியும் கூர்மை குறைவு; தரம் நேர்மையாக இறக்கப்பட்டது`;
    } else if (hit === "நடுத்தரம்" && percentile.topPct > 60) {
      hit = "குறை";
      discNote = `மதிப்பெண் நடுத்தரமெனினும் வாழ்நாளின் பெரும்பாலான நாட்கள் இதைவிட உயர்வு (top ${percentile.topPct}%) — பொருத்தமாகக் கருத முடியாது`;
    } else if (hit === "நடுத்தரம்" && percentile.topPct <= 10) {
      hit = "உயர்";
      discNote = `மதிப்பெண் நடுத்தரமே எனினும் வாழ்நாள் ஒப்பீட்டில் top ${percentile.topPct}% — இச்சூழலின் அரிதான உச்சம்; தரம் உயர்த்தப்பட்டது`;
    }
  }
  let verdict = hit === "உயர்" ? "✅ Engine இக்காலத்தை வலுவான window ஆக முன்கூட்டியே காட்டியிருக்கும்"
    : hit === "நடுத்தரம்" ? "🟡 ஓரளவு அடையாளம் — காலம் தொடர்புடையதே, ஆனால் மேலும் கூர்மை தேவை"
    : "❌ Engine விதிகள் இந்நிகழ்வைப் பிடிக்கவில்லை — இதுவே விதி மேம்பாட்டுக்கான மதிப்புமிக்க தரவு";
  if (percentile && percentile.topPct <= 10 && hit === "உயர்") verdict += ` — வாழ்நாள் ஒப்பீட்டில் top ${percentile.topPct}% நாள் ★`;

  return { topic: topic.ta, icon: topic.icon, score: ev.score, dScore: ev.dScore, tScore: ev.tScore,
    hit, verdict, discNote, reasons: ev.reasons, md: ev.md, ad: ev.ad, windows: ev.windows, percentile,
    promise: promiseR.promise, promiseVerdict: promiseR.promiseVerdict,
    promiseNote: hit === "குறை" && promiseR.promise < 45
      ? `குறிப்பு: இக்கேள்விக்கு ஜாதக வாக்குறுதியே ${promiseR.promise}/100 (பலவீனம்) — miss என்பது காலவிதி-தவறு மட்டுமல்ல, வாக்குறுதிச் சூழலும் சேர்ந்த முடிவு`
      : null };
}

function calcEventTiming(topicKey, deps) {
  const { horoscope, dashaData, shadBala, functionalNat, planetCtx, chevvai, navStrength, geo, ayanamsaKey, dobISO, ashtakavarga, avasthas } = deps;
  const topic = EVENT_TOPICS[topicKey];
  if (!topic || !horoscope || !dashaData) return null;
  const lagnaIdx = horoscope.lagna;
  const placements = horoscope.placements;
  const houseRashi = (h) => (lagnaIdx + h - 1) % 12;
  const houseOf = (p) => ((p.rashiIdx - lagnaIdx + 12) % 12) + 1;
  const lordOf = (h) => RASHI_LORD_NAME[houseRashi(h)];
  const findP = (ta) => placements.find(p => p.ta === ta);
  const sbOf = (ta) => (shadBala || []).find(s => s.ta === ta);
  const natureOf = (ta) => functionalNat?.[ta]?.nature || "சமம்";
  const ctxOf = (ta) => (planetCtx || []).find(c => c.ta === ta);

  // ═══ 1. வாக்குறுதி (PROMISE) — பொது engine வழி (backtest-உம் இதையே பயன்படுத்தும்) ═══
  const pLordName = lordOf(topic.primary);
  const pLord = findP(pLordName);
  const pRashiIdx = houseRashi(topic.primary);
  const { promise, pReasons, promiseVerdict } = calcEventPromise(topicKey, deps);

  // ═══ 2. ACTIVATION கிரகங்கள் + எடைகள் — பொது builder வழி
  //     (இதே எடைகளை back-test engine-ும் பயன்படுத்துகிறது: எதிர்காலக்
  //      கணிப்பும் கடந்தகால சரிபார்ப்பும் ஒரே விதிகளில் இருந்தால்தான்
  //      accuracy அளவீடு அர்த்தமுள்ளதாகும்) ═══
  const weights = buildActivationWeights(topicKey, placements, lagnaIdx, functionalNat).weights;

  // ═══ 3. தசா windows (இன்று → +12 ஆண்டு) ═══
  const now = new Date();
  const horizon = new Date(now.getFullYear() + 12, now.getMonth(), now.getDate());
  const [by, bm, bd] = (dobISO || "2000-01-01").split('-').map(Number);
  const minAgeDate = new Date(by + topic.minAge, bm - 1, bd);
  const windows = [];
  (dashaData.dashas || []).forEach(md => {
    (md.antardashas || []).forEach(ad => {
      if (ad.endDate < now || ad.startDate > horizon || ad.endDate < minAgeDate) return;
      const mdW = weights[md.name]?.w || 0;
      const adW = weights[ad.name]?.w || 0;
      let score = mdW + adW * 1.6;
      const reasons = [];
      if (mdW > 0) reasons.push(`தசாநாதன் ${md.name}: ${weights[md.name].why.join(", ")}`);
      if (adW > 0) reasons.push(`புக்திநாதன் ${ad.name}: ${weights[ad.name].why.join(", ")}`);
      if (mdW > 0 && adW > 0) { score += 1; reasons.push("தசை+புக்தி இரண்டும் தொடர்புடையவை — வலுவான activation"); }
      if (score <= 0.5) return;
      windows.push({
        start: ad.startDate < now ? now : ad.startDate, end: ad.endDate > horizon ? horizon : ad.endDate,
        md: md.name, ad: ad.name, score, reasons,
        adObj: ad // பிரத்யந்தர drill-down-க்கு (return-க்கு முன் நீக்கப்படும்)
      });
    });
  });
  windows.sort((a, b) => b.score - a.score);

  // ═══ 4. கோசார scan — top windows-க்கு குரு+சனி transit, மாதவாரியாக ═══
  // (முன்பு window-இன் நடுப்புள்ளியில் மட்டும் சோதித்தது — 2-3 ஆண்டு window-இல்
  // குரு 2-3 ராசி நகர்ந்துவிடும்; இப்போது ஒவ்வொரு மாதமும் சோதித்து, ஆதரவு
  // உள்ள மாத-வீச்சுகளையும் (transitRanges) தனியே தருகிறோம்.)
  const top = windows.slice(0, 8);
  const targets = [pRashiIdx, pLord ? pLord.rashiIdx : pRashiIdx];
  // குரு பெயர்ச்சி விதி — ஜன்ம (சந்திர) ராசியிலிருந்து குரு 2/5/7/9/11-இல்
  // இருக்கும் மாதங்களே சுப-நிகழ்வு மாதங்கள் (classical தமிழ் மரபு; app-இன்
  // GOCHARA_RULES குரு வரிசையே). உண்மை-தரவு சான்று (29.01.1981 ஜாதகம்):
  // சனி-குரு புக்தி 2005-2007 முழுதும் ஓடினும், குரு சந்திரனுக்கு 2ஆம்
  // வீட்டுக்கு (விருச்சிகம்) வந்த நவ2006-2007 வீச்சிலேயே திருமணம் (ஏப் 2007).
  const natalMoonRashi = placements.find(x => x.ta === "சந்திரன்")?.rashiIdx;
  top.forEach(w => {
    try {
      const months = [];
      const cur = new Date(w.start.getFullYear(), w.start.getMonth(), 15);
      let guard = 0;
      while (cur <= w.end && guard++ < 60) {
        const iso = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-15`;
        const th = generateHoroscope(iso, "12:00", geo.lat, geo.lon, true, ayanamsaKey);
        const tJup = th.placements.find(p => p.ta === "குரு");
        const tSat = th.placements.find(p => p.ta === "சனி");
        months.push({
          t: new Date(cur),
          jup: tJup && targets.some(t => planetHitsRashi("குரு", tJup.rashiIdx, t)),
          sat: tSat && targets.some(t => planetHitsRashi("சனி", tSat.rashiIdx, t)),
          guruFav: tJup && natalMoonRashi != null &&
            GOCHARA_RULES["குரு"].good.includes(((tJup.rashiIdx - natalMoonRashi + 12) % 12) + 1),
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      const anyBoth = months.some(x => x.jup && x.sat);
      const anyJup = months.some(x => x.jup);
      const anySat = months.some(x => x.sat);
      if (anyBoth) { w.score += 2; w.reasons.push(`குரு + சனி இருவரும் ${topic.primary}ஆம் வீடு/அதிபதியைத் தொடும் மாதங்கள் இவ்வீச்சில் உள்ளன — இரட்டை transit ஆதரவு`); }
      else if (anyJup) { w.score += 1; w.reasons.push(`குரு ${topic.primary}ஆம் வீடு/அதிபதியைத் தொடும் மாதங்கள் இவ்வீச்சில் உள்ளன — transit ஆதரவு`); }
      else if (anySat) { w.score += 0.5; w.reasons.push(`சனி ${topic.primary}ஆம் வீடு/அதிபதி தொடர்பில் வரும் மாதங்கள் உள்ளன`); }
      // குரு பெயர்ச்சி bonus சுப-நிகழ்வு topics-க்கு மட்டும் (caution topics —
      // நோய் போன்றவற்றில் — "சுபம்" bonus அபத்தமாகும்)
      if (topic.mood !== "caution" && months.some(x => x.guruFav)) {
        w.score += 0.5;
        w.reasons.push(`ஜன்ம ராசியிலிருந்து குரு சுப வீட்டில் (2/5/7/9/11 — குரு பெயர்ச்சி விதி) வரும் மாதங்கள் இவ்வீச்சில் உள்ளன`);
      }
      // தொடர்ச்சியான ஆதரவு-வீச்சுகள் — நுண்-கால சுட்டிக்கு
      const ranges = [];
      let run = null;
      months.forEach(x => {
        const on = x.jup || x.sat;
        if (on && !run) run = { start: x.t, end: x.t, both: x.jup && x.sat };
        else if (on && run) { run.end = x.t; run.both = run.both || (x.jup && x.sat); }
        else if (!on && run) { ranges.push(run); run = null; }
      });
      if (run) ranges.push(run);
      w.transitRanges = ranges;
      w.transitMonths = months; // subWindow overlap சோதனைக்கு
      w.gocharaChecked = true;
    } catch (e) { /* transit calc தோல்வி — தசா score மட்டும் */ }
  });
  top.sort((a, b) => b.score - a.score);

  // ═══ 5. பிரத்யந்தர் நுண்-windows — top window-க்குள் 3ஆம் நிலை drill-down.
  // உண்மை-தரவு பாடம் (29.01.1981 ஜாதகம்): திருமணம் சனி-குரு புக்தியின்
  // ராகு பிரத்யந்தரம் தொடங்கி 5 நாட்களில் — பிரத்யந்தர நிலை 2.5-ஆண்டு
  // window-ஐ சில-வார/மாத அளவுக்குக் குறுக்குகிறது. ═══
  top.forEach(w => {
    const subs = [];
    (w.adObj?.pratyantardashas || []).forEach(pd => {
      if (pd.endDate < w.start || pd.startDate > w.end) return;
      const pdW = weights[pd.name]?.w || 0;
      if (pdW <= 0) return;
      const s = pd.startDate < w.start ? w.start : pd.startDate;
      const e = pd.endDate > w.end ? w.end : pd.endDate;
      // இந்த நுண்-window-இல் கோசார ஆதரவு உள்ளதா (மாத grid overlap)
      const inSub = (x) => x.t >= new Date(s.getFullYear(), s.getMonth() - 1, 1) && x.t <= e;
      const gochara = (w.transitMonths || []).some(x => (x.jup || x.sat) && inSub(x));
      // குரு பெயர்ச்சி விதி — ஜன்ம ராசியிலிருந்து குரு சுப வீட்டில் உள்ள
      // மாதங்களுடன் இப்பிரத்யந்தரம் மேற்பொருந்துகிறதா (caution topics-இல் பொருந்தாது)
      const guruFav = topic.mood !== "caution" && (w.transitMonths || []).some(x => x.guruFav && inSub(x));
      subs.push({ name: pd.name, start: s, end: e, w: Math.round(pdW * 10) / 10, gochara, guruFav,
        why: weights[pd.name].why.join(", ") });
    });
    subs.sort((a, b) => (b.w + (b.gochara ? 1 : 0) + (b.guruFav ? 1 : 0)) - (a.w + (a.gochara ? 1 : 0) + (a.guruFav ? 1 : 0)));
    w.subWindows = subs.slice(0, 3).sort((a, b) => a.start - b.start);
  });

  const results = top.slice(0, 5).map(w => {
    const { adObj, transitMonths, ...rest } = w; // உள்-தரவு நீக்கம்
    return { ...rest, confidence: w.score >= 7 ? "உயர்" : w.score >= 4.5 ? "நடுத்தரம்" : "குறைவு" };
  });

  return { topic: topic.ta, icon: topic.icon, promise, promiseVerdict, pReasons, windows: results,
    activation: Object.entries(weights).sort((a,b)=>b[1].w-a[1].w).map(([ta,v])=>({ta,w:Math.round(v.w*10)/10,why:v.why.join(", ")})) };
}

// ═══════════════════════════════════════════════════════════════════
// வரிசை-நிபந்தனை பலன்கள் (CONDITIONAL SEQUENCE LINKAGES)
// "இது நடந்த பிறகுதான் அது" — classical சம்பந்த விதி: இரு வீடுகளின்
// அதிபதிகள் சேர்க்கை / பரஸ்பர பார்வை / பரிவர்த்தனை / ஒருவர் வீட்டில்
// மற்றவர் அமர்வு கொண்டால், அவ்விரு வாழ்க்கைப் பகுதிகளும் பிணைந்தவை —
// முந்தைய நிகழ்வுக்குப் (திருமணம்/தொழில்...) பின் பிந்தையது மலரும்.
// தசா வரிசையுடன் இணைத்து "எந்த தசையில் இந்த இணைப்பு செயல்படும்" என்றும் கூறும்.
// ═══════════════════════════════════════════════════════════════════
const SEQUENCE_RULES = [
  { after: 7,  target: 2,  afterTa: "திருமணத்திற்குப் பின்", icon: "💒→💰",
    text: "செல்வம்/குடும்பச் சேமிப்பு திருமணத்திற்குப் பின் பெருகும் — வாழ்க்கைத் துணை அதிர்ஷ்டத்தைக் கொண்டு வருவார்" },
  { after: 7,  target: 11, afterTa: "திருமணத்திற்குப் பின்", icon: "💒→📈",
    text: "லாபங்களும் ஆசை நிறைவேற்றமும் திருமணத்திற்குப் பின் உயரும்" },
  { after: 7,  target: 9,  afterTa: "திருமணத்திற்குப் பின்", icon: "💒→🍀",
    text: "பாக்கியம்/அதிர்ஷ்டம் திருமணத்திற்குப் பின் திறக்கும் — துணை வழி தெய்வ அனுகூலம்" },
  { after: 7,  target: 10, afterTa: "திருமணத்திற்குப் பின்", icon: "💒→💼",
    text: "தொழில் உயர்வு திருமணத்திற்குப் பின் வேகம் பெறும்" },
  { after: 10, target: 4,  afterTa: "தொழில் நிலைபெற்ற பின்", icon: "💼→🏠",
    text: "வீடு/வாகன யோகம் தொழில் நிலைபெற்ற பின் கைகூடும்" },
  { after: 10, target: 2,  afterTa: "தொழில் நிலைபெற்ற பின்", icon: "💼→💰",
    text: "செல்வச் சேர்க்கை சுய தொழில்/பதவி உயர்வுடன் பிணைந்தது" },
  { after: 12, target: 10, afterTa: "வெளியிடம் சென்ற பின்", icon: "✈️→💼",
    text: "தொழில் உயர்வு வெளிநாடு அல்லது பிறந்த இடம் விட்டு நகர்ந்த பின் — தொலைவில் வாழ்வு சிறக்கும்" },
  { after: 12, target: 2,  afterTa: "வெளிநாட்டு தொடர்பின் வழி", icon: "✈️→💰",
    text: "வருவாய் வெளிநாட்டு/தொலைதூரத் தொடர்பில் — வெளியிடச் சம்பாத்தியம்" },
  { after: 5,  target: 11, afterTa: "குழந்தை பாக்கியத்திற்குப் பின்", icon: "👶→📈",
    text: "லாப விருத்தி புத்திர பாக்கியத்திற்குப் பின் — குழந்தை அதிர்ஷ்டம் கொண்டு வரும்" },
  { after: 9,  target: 10, afterTa: "தந்தை/குரு அனுகூலத்துடன்", icon: "🍀→💼",
    text: "தொழில் உயர்வு தந்தை/குரு/தெய்வ அனுகூலத்துடன் பிணைந்தது — அவர்கள் ஆசியுடன் முன்னேற்றம்" },
  { after: 4,  target: 9,  afterTa: "வீடு/தாய்வழி நிலைபெற்ற பின்", icon: "🏠→🍀",
    text: "அதிர்ஷ்ட உயர்வு சொந்த வீடு/தாய்வழி நிலைப்பாட்டிற்குப் பின்" },
];

function calcSequenceLinkages(placements, lagnaIdx, functionalNat, dashaData) {
  const houseRashi = (h) => (lagnaIdx + h - 1) % 12;
  const lordOf = (h) => RASHI_LORD_NAME[houseRashi(h)];
  const findP = (ta) => placements.find(p => p.ta === ta);
  const houseOf = (p) => ((p.rashiIdx - lagnaIdx + 12) % 12) + 1;
  const drishti = calcGrahaDrishti(placements);
  const now = new Date();

  // நடப்பு + அடுத்த மகா தசைகள் — இணைப்பு எப்போது செயல்படும் என்று சொல்ல
  const upcomingMDs = (dashaData?.dashas || []).filter(d => d.endDate > now).slice(0, 3);

  const links = [];
  SEQUENCE_RULES.forEach(rule => {
    const aLord = lordOf(rule.after), tLord = lordOf(rule.target);
    if (aLord === tLord) {
      // ஒரே கிரகம் இரு வீடுகளையும் ஆள்கிறது — உள்ளார்ந்த பிணைப்பு
      const p = findP(aLord);
      if (!p) return;
      links.push({ ...rule, strength: 3, strengthTa: "மிக வலுவான இணைப்பு",
        how: `${aLord} ஒருவரே ${rule.after} & ${rule.target} இரு வீடுகளுக்கும் அதிபதி — இரு பலன்களும் ஒரே தசையில், ஒன்றன்பின் ஒன்றாக`,
        lords: [aLord] });
      return;
    }
    const aP = findP(aLord), tP = findP(tLord);
    if (!aP || !tP) return;
    const hows = [];
    let strength = 0;
    // 1. பரிவர்த்தனை — வலிமை மிக்கது
    if (RASHI_LORD_NAME[aP.rashiIdx] === tLord && RASHI_LORD_NAME[tP.rashiIdx] === aLord) {
      strength = 3; hows.push(`${aLord} ↔ ${tLord} ராசி பரிவர்த்தனை`);
    } else {
      // 2. சேர்க்கை
      if (aP.rashiIdx === tP.rashiIdx) { strength = Math.max(strength, 2.5); hows.push(`${aLord} + ${tLord} ${houseOf(aP)}ஆம் வீட்டில் சேர்க்கை`); }
      // 3. அமர்வு — target அதிபதி after வீட்டில் / after அதிபதி target வீட்டில்
      if (houseOf(tP) === rule.after) { strength = Math.max(strength, 2); hows.push(`${rule.target}ஆம் அதிபதி ${tLord} ${rule.after}ஆம் வீட்டில் அமர்வு`); }
      if (houseOf(aP) === rule.target) { strength = Math.max(strength, 2); hows.push(`${rule.after}ஆம் அதிபதி ${aLord} ${rule.target}ஆம் வீட்டில் அமர்வு`); }
      // 4. பரஸ்பர பார்வை
      const mutual = drishti.some(x => x.from === aLord && x.to === tLord) && drishti.some(x => x.from === tLord && x.to === aLord);
      if (mutual) { strength = Math.max(strength, 1.5); hows.push(`${aLord} ↔ ${tLord} பரஸ்பர பார்வை`); }
      // 5. after-அதிபதியின் பார்வை target வீட்டின் மீது
      else if (planetHitsRashi(aLord, aP.rashiIdx, houseRashi(rule.target)) && aP.rashiIdx !== houseRashi(rule.target)) {
        strength = Math.max(strength, 1); hows.push(`${rule.after}ஆம் அதிபதி ${aLord} பார்வை ${rule.target}ஆம் வீட்டின் மீது`);
      }
    }
    if (strength === 0) return;
    // இணைப்பு எந்த தசையில் செயல்படும்?
    const actMD = upcomingMDs.find(md => md.name === aLord || md.name === tLord);
    const dashaNote = actMD
      ? `${actMD.name} மகா தசையில் (${actMD.startDate.getFullYear()}–${actMD.endDate.getFullYear()}) இந்த இணைப்பு செயல்படும்`
      : null;
    links.push({ ...rule, strength,
      strengthTa: strength >= 3 ? "மிக வலுவான இணைப்பு" : strength >= 2 ? "வலுவான இணைப்பு" : "மித இணைப்பு",
      how: hows.join(" • "), lords: [aLord, tLord], dashaNote });
  });
  links.sort((a, b) => b.strength - a.strength);
  return links;
}

// ═══════════════════════════════════════════════════════════════════
// நிபந்தனை சுபத்துவம் (CONDITIONAL BENEFICS) — classical refinement:
//   சந்திரன்: வளர்பிறை (சுக்ல பக்ஷம்) → சுபன்; தேய்பிறை → பாப சாயல்
//   புதன்: பாப கிரக சேர்க்கையில் (செவ்வாய்/சனி/ராகு/கேது/தேய்சந்திரன்)
//          பாபனாக மாறுவான்; தனித்திருந்தால் சுபன்.
// ═══════════════════════════════════════════════════════════════════
function calcConditionalBenefics(placements) {
  const sun = placements.find(p => p.ta === "சூரியன்");
  const moon = placements.find(p => p.ta === "சந்திரன்");
  const notes = [];
  let moonBenefic = true;
  if (sun && moon && sun.fullLong != null && moon.fullLong != null) {
    const elong = ((moon.fullLong - sun.fullLong) + 360) % 360;
    moonBenefic = elong < 180; // சுக்ல பக்ஷம் (வளர்பிறை)
    notes.push(moonBenefic
      ? "சந்திரன் வளர்பிறையில் (சுக்ல பக்ஷம்) — சுப கிரகமாகச் செயல்படுவார்"
      : "சந்திரன் தேய்பிறையில் (கிருஷ்ண பக்ஷம்) — சுபத்துவம் குறைவு, பாப சாயல்");
  }
  const mercury = placements.find(p => p.ta === "புதன்");
  let mercuryBenefic = true;
  if (mercury) {
    const badCompany = placements.filter(p =>
      p.rashiIdx === mercury.rashiIdx && p.ta !== "புதன்" &&
      (["செவ்வாய்","சனி","ராகு","கேது"].includes(p.ta) || (p.ta === "சந்திரன்" && !moonBenefic)));
    if (badCompany.length > 0) {
      mercuryBenefic = false;
      notes.push(`புதன் பாப சேர்க்கையில் (${badCompany.map(p=>p.ta).join(", ")}) — பாப சாயலில் செயல்படுவார்`);
    } else notes.push("புதன் பாப சேர்க்கை இன்றி — சுப கிரகமாகச் செயல்படுவார்");
  }
  return { moonBenefic, mercuryBenefic, notes };
}

// ═══════════════════════════════════════════════════════════════════
// கிரக சூழல் எஞ்சின் (PLANET CONTEXT ENGINE) — ஒரு கிரகத்தின் நிலைப் பலன்
// மற்ற கிரகங்களால் எப்படி மாறுகிறது என்பதன் முழுச் சங்கிலி:
//   1. ராசிநாதன் (dispositor) நிலை — "கிரகன் தன் ராசிநாதன் நிலைப்படி பலன் தருவான்"
//   2. நட்சத்திராதிபதி நிலை — அமர்ந்த நட்சத்திரத்தின் அதிபதி வழி பலன் (classical/KP)
//   3. சேர்க்கை — கூட அமர்ந்த கிரகங்களின் லக்னவாரி இயல்பு
//   4. பார்வை — இக்கிரகத்தை நேரடியாகப் பார்க்கும் கிரகங்கள்
// அனைத்தும் ஏற்கனவே கணித்தவற்றில் இருந்தே (signDignity, functionalNature,
// calcGrahaDrishti, getNakshatraLord) — புதிய duplicate கணிதம் இல்லை.
// ═══════════════════════════════════════════════════════════════════
function calcPlanetContext(placements, lagnaIdx, functionalNat, unified) {
  const drishti = calcGrahaDrishti(placements);
  const cond = calcConditionalBenefics(placements);
  const houseOf = (p) => ((p.rashiIdx - lagnaIdx + 12) % 12) + 1;
  const houseQuality = (h) => [1,4,5,7,9,10].includes(h) ? 1 : [6,8,12].includes(h) ? -1 : 0;
  const natureOf = (ta) => functionalNat?.[ta]?.nature || "சமம்";
  const natureScore = (ta) => {
    const n = natureOf(ta);
    if (n === "யோககாரகன்") return 2;
    if (n === "சுபன்") return 1;
    if (n === "பாபன்") return -1;
    if (ta === "ராகு" || ta === "கேது") return -1;
    return 0;
  };

  return placements.map(p => {
    const chain = [];
    let net = 0;
    const pHouse = houseOf(p);

    // ── 1. ராசிநாதன் (Dispositor) ──
    const dispName = RASHI_LORD_NAME[p.rashiIdx];
    if (dispName !== p.ta) {
      const disp = placements.find(x => x.ta === dispName);
      if (disp) {
        const dDig = signDignity(disp);
        const dHouse = houseOf(disp);
        let s = 0;
        if (dDig === "உச்சம்" || dDig === "சொந்தம்") s += 1;
        else if (dDig === "நீசம்" || dDig === "பகை") s -= 1;
        s += houseQuality(dHouse);
        net += s;
        chain.push({
          k: "ராசிநாதன்", score: s,
          text: `${dispName} (${dDig}, ${dHouse}ஆம் வீட்டில்)${disp.isCombust ? ", அஸ்தங்கம்" : ""} — ${s > 0 ? "ராசிநாதன் பலமாக இருப்பதால் இக்கிரகத்தின் பலன் மேம்படும்" : s < 0 ? "ராசிநாதன் பலவீனம்/துஸ்தானம் — இக்கிரகத்தின் பலன் தடைபடும்" : "ராசிநாதன் நடுநிலை"}`
        });
      }
    } else {
      chain.push({ k: "ராசிநாதன்", score: 1, text: "சொந்த வீட்டில் — தன் பலனைத் தானே முழுமையாகத் தரும்" });
      net += 1;
    }

    // ── 2. நட்சத்திராதிபதி (Star Lord) ──
    if (p.nakIdx >= 0) {
      const slName = getNakshatraLord(p.nakIdx).name;
      if (slName && slName !== "—") {
        if (slName === p.ta) {
          chain.push({ k: "நட்சத்திராதிபதி", score: 1, text: `சொந்த நட்சத்திரத்தில் (${p.nakshatraTa}) — தன் காரகப் பலனை உறுதியாகத் தரும்` });
          net += 1;
        } else {
          const sl = placements.find(x => x.ta === slName);
          if (sl) {
            const slDig = signDignity(sl);
            const slHouse = houseOf(sl);
            const slOwns = housesOwnedBy(slName, lagnaIdx);
            let s = 0;
            if (slDig === "உச்சம்" || slDig === "சொந்தம்") s += 1;
            else if (slDig === "நீசம்" || slDig === "பகை") s -= 1;
            s += houseQuality(slHouse);
            net += s;
            chain.push({
              k: "நட்சத்திராதிபதி", score: s,
              text: `${p.nakshatraTa} அதிபதி ${slName} (${slDig}, ${slHouse}ஆம் வீட்டில்${slOwns.length ? `, ${slOwns.join(",")} ஆட்சி` : ""}) — இக்கிரகம் ${slName} வழிப் பலனையும் தரும்: ${s > 0 ? "நட்சத்திராதிபதி பலம் → பலன் உயரும்" : s < 0 ? "நட்சத்திராதிபதி பலவீனம் → பலன் மங்கும்" : "நடுநிலை"}`
            });
          }
        }
      }
    }

    // ── 3. சேர்க்கை (Conjunctions) ──
    const conj = placements.filter(x => x.ta !== p.ta && x.rashiIdx === p.rashiIdx);
    conj.forEach(c => {
      let s = natureScore(c.ta);
      // நிபந்தனை சுபத்துவம் — தேய்பிறை சந்திரன் / பாப-சேர்க்கை புதன்
      if (c.ta === "சந்திரன்" && !cond.moonBenefic && s > 0) s = 0;
      if (c.ta === "புதன்" && !cond.mercuryBenefic && s > 0) s = 0;
      net += s;
      chain.push({
        k: "சேர்க்கை", score: s,
        text: `${c.ta} உடன் சேர்க்கை (${natureOf(c.ta)}) — ${s > 0 ? "சுப சேர்க்கை: இக்கிரக காரகங்கள் மேம்படும்" : s < 0 ? "பாப சேர்க்கை: காரகங்களில் தடை/கலப்பு" : "கலப்பு விளைவு"}`
      });
    });

    // ── 4. பார்வை (Aspects received) ──
    drishti.filter(a => a.to === p.ta).forEach(a => {
      let s = natureScore(a.from);
      if (a.from === "சந்திரன்" && !cond.moonBenefic && s > 0) s = 0;
      if (a.from === "புதன்" && !cond.mercuryBenefic && s > 0) s = 0;
      net += s;
      chain.push({
        k: "பார்வை", score: s,
        text: `${a.from} பார்வை (${natureOf(a.from)}${a.isSpecial ? ", சிறப்புப் பார்வை" : ""}) — ${s > 0 ? "சுப பார்வை: பாதுகாப்பு/மேம்பாடு" : s < 0 ? "பாப பார்வை: தாமதம்/அழுத்தம்" : "நடுநிலை"}`
      });
    });

    // ── நிலை குறிப்புகள் ──
    if (p.isCombust) { net -= 1; chain.push({ k: "நிலை", score: -1, text: "அஸ்தங்கம் — சூரிய அருகாமையால் பலன் வெளிப்பட தடை" }); }
    if (p.isRetrograde && p.ta !== "ராகு" && p.ta !== "கேது") chain.push({ k: "நிலை", score: 0, text: "வக்ரம் — பலன் தீவிரமாக/மாறுபட்ட வழியில் வெளிப்படும்" });

    // ── ஒருங்கிணைந்த பலம் — மற்ற எல்லா பல-engine-களின் கூட்டு முடிவு (தகவல்; net-ஐ மாற்றாது:
    //    சூழல் (இந்த section) வேறு, உள்ளார்ந்த பலம் (அந்த section) வேறு — இரண்டையும் அருகருகே காட்ட) ──
    const uEntry = (unified || []).find(x => x.ta === p.ta);
    if (uEntry) chain.push({ k: "ஒருங்கிணைந்த பலம்", score: 0, text: `${uEntry.composite}/100 (${uEntry.tier}) — கிரக பலம் + ஷட்பலம் + விம்ஷோபகம் + D9 + அவஸ்தை இணைந்த மதிப்பு` });

    const verdict = net >= 2 ? "பலன் மேம்படும் சூழல்" : net <= -2 ? "பலன் சவால்களுடன்" : "கலப்பு சூழல்";
    return { ta: p.ta, symbol: p.symbol, rashi: p.rashi, house: pHouse,
      nakshatraTa: p.nakshatraTa, pada: p.pada, chain, net, verdict, condNotes: cond.notes };
  });
}

// Mean daily motion in degrees/day — classical reference speed for the 5 star planets,
// used by Cheshta Bala below (Sun/Moon use their own BPHS-specified substitutions instead).
const MEAN_DAILY_MOTION = { "செவ்வாய்":0.524, "புதன்":1.383, "குரு":0.083, "சுக்கிரன்":1.2, "சனி":0.034 };
const SUN_MEAN_DAILY_MOTION = 0.9856; // °/day — for estimating Sankranti (solar month entry) dates

// Finds the exact date the Sun most recently entered rashi `targetRashiIdx` (0=Mesha)
// before/at `birthDateObj`, by searching a small window around an estimate derived from
// the Sun's known current position — avoids a slow brute-force day-by-day scan across
// months. Used for Abda Bala (year lord = weekday of the most recent Mesha Sankranti)
// and Masa Bala (month lord = weekday of the most recent Sankranti of any kind), using
// the SOLAR month/year system — the same Sankranti-based convention this app's Tamil
// Panchangam Calendar already follows — rather than the North-Indian lunar-Ahargana
// system, whose adhimasa/kshaya-masa leap-month correction rules couldn't be verified
// with the same confidence as everything else in this project.
function findSankrantiDate(targetRashiIdx, estimateDaysBack, birthDateObj, lat, lon) {
  const centerMs = birthDateObj.getTime() - estimateDaysBack * 86400000;
  for (let offset = -6; offset <= 6; offset++) {
    const d = new Date(centerMs + offset * 86400000);
    const dPrev = new Date(d.getTime() - 86400000);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const isoPrev = `${dPrev.getFullYear()}-${String(dPrev.getMonth()+1).padStart(2,'0')}-${String(dPrev.getDate()).padStart(2,'0')}`;
    const h = generateHoroscope(iso, "12:00", lat, lon, true);
    const hPrev = generateHoroscope(isoPrev, "12:00", lat, lon, true);
    const sunToday = h.placements.find(p => p.ta === "சூரியன்");
    const sunPrev = hPrev.placements.find(p => p.ta === "சூரியன்");
    if (sunToday && sunPrev && Math.floor(sunToday.fullLong/30) === targetRashiIdx && Math.floor(sunPrev.fullLong/30) !== targetRashiIdx) {
      return d;
    }
  }
  return null; // window missed — caller falls back gracefully (Abda/Masa Bala contribute 0)
}

// ═══════════════════════════════════════════════════════════════════
// தமிழ் தேதி (TAMIL SOLAR CALENDAR DATE) — சௌர மானம்
// Tamil month = which sidereal rashi the Sun occupies (Mesha=Chithirai).
// Tamil date = days elapsed since the Sun entered that rashi (Sankranti) + 1.
// Reuses the same Meeus engine (lightweight). Verified: Tamil New Year
// (14 Apr) = Chithirai 1, Pongal (15 Jan) = Thai 1.
// ═══════════════════════════════════════════════════════════════════
const TAMIL_SOLAR_MONTHS = ["சித்திரை","வைகாசி","ஆனி","ஆடி","ஆவணி","புரட்டாசி",
  "ஐப்பசி","கார்த்திகை","மார்கழி","தை","மாசி","பங்குனி"];
// Mesha(0)=Chithirai ... Meena(11)=Panguni

function calcTamilDate(dob, tob, lat, lon) {
  // dob = "YYYY-MM-DD"
  const [y, m, d] = dob.split('-').map(Number);
  const birthDate = new Date(y, m - 1, d);
  const h = generateHoroscope(dob, tob || "12:00", lat, lon, true);
  const sun = h.placements.find(p => p.ta === "சூரியன்");
  if (!sun) return null;
  const sunRashi = Math.floor(sun.fullLong / 30); // 0=Mesha=Chithirai
  const tamilMonth = TAMIL_SOLAR_MONTHS[sunRashi];

  // Find Sankranti (Sun's entry into this rashi) by stepping back day-by-day
  let tamilDay = 1;
  for (let back = 1; back <= 34; back++) {
    const prev = new Date(birthDate.getTime() - back * 86400000);
    const iso = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-${String(prev.getDate()).padStart(2,'0')}`;
    const hp = generateHoroscope(iso, "12:00", lat, lon, true);
    const sp = hp.placements.find(p => p.ta === "சூரியன்");
    if (!sp || Math.floor(sp.fullLong / 30) !== sunRashi) {
      tamilDay = back; // 'back' days before birth the Sun was still in the previous rashi
      break;
    }
  }
  return { month: tamilMonth, day: tamilDay, monthIdx: sunRashi,
           display: `${tamilMonth} ${tamilDay}` };
}

// ═══════════════════════════════════════════════════════════════════
// Heliocentric → geocentric orbital mechanics — for Yuddha Bala (planetary war),
// which classically needs each planet's ecliptic LATITUDE to decide the winner
// ("those posited in the north... should be considered as victorious" — the
// engine elsewhere only ever tracks longitude). Uses NASA JPL's standard
// "Keplerian Elements for Approximate Positions of the Major Planets" (J2000,
// valid 1800-2050, arcminute-level precision) — a well-documented, widely-used
// reference, not a guessed formula. Cross-checked: this same method's LONGITUDE
// output, independently, matches the app's already-verified live-backend
// longitudes for Mercury/Venus/Jupiter/Saturn within ~0.15° and Mars within
// ~0.5° (expected for this lower-precision method) — strong evidence the
// latitude this function returns from the identical calculation is trustworthy.
// ═══════════════════════════════════════════════════════════════════
const ORBITAL_ELEMENTS = {
  "Mercury": { a:[0.38709927,0.00000037], e:[0.20563593,0.00001906], I:[7.00497902,-0.00594749], L:[252.25032350,149472.67411175], peri:[77.45779628,0.16047689], node:[48.33076593,-0.12534081] },
  "Venus":   { a:[0.72333566,0.00000390], e:[0.00677672,-0.00004107], I:[3.39467605,-0.00078890], L:[181.97909950,58517.81538729], peri:[131.60246718,0.00268329], node:[76.67984255,-0.27769418] },
  "Earth":   { a:[1.00000261,0.00000562], e:[0.01671123,-0.00004392], I:[-0.00001531,-0.01294668], L:[100.46457166,35999.37244981], peri:[102.93768193,0.32327364], node:[0.0,0.0] },
  "Mars":    { a:[1.52371034,0.00001847], e:[0.09339410,0.00007882], I:[1.84969142,-0.00813131], L:[-4.55343205,19140.30268499], peri:[-23.94362959,0.44441088], node:[49.55953891,-0.29257343] },
  "Jupiter": { a:[5.20288700,-0.00011607], e:[0.04838624,-0.00013253], I:[1.30439695,-0.00183714], L:[34.39644051,3034.74612775], peri:[14.72847983,0.21252668], node:[100.47390909,0.20469106] },
  "Saturn":  { a:[9.53667594,-0.00125060], e:[0.05386179,-0.00050991], I:[2.48599187,0.00193609], L:[49.95424423,1222.49362201], peri:[92.59887831,-0.41897216], node:[113.66242448,-0.28867794] }
};
function keplerHeliocentric(planetKey, T) {
  const el = ORBITAL_ELEMENTS[planetKey];
  const a = el.a[0] + el.a[1]*T, e = el.e[0] + el.e[1]*T, I = el.I[0] + el.I[1]*T;
  const L = el.L[0] + el.L[1]*T, peri = el.peri[0] + el.peri[1]*T, node = el.node[0] + el.node[1]*T;
  const omega = peri - node;
  let M = ((L - peri) % 360 + 360) % 360;
  if (M > 180) M -= 360;
  const r = Math.PI/180;
  const Mrad = M*r;
  let E = Mrad + e*Math.sin(Mrad);
  for (let i=0;i<10;i++) {
    const dE = (E - e*Math.sin(E) - Mrad) / (1 - e*Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  const xp = a*(Math.cos(E)-e), yp = a*Math.sqrt(1-e*e)*Math.sin(E);
  const wr = omega*r, nr = node*r, ir = I*r;
  const x = (Math.cos(wr)*Math.cos(nr)-Math.sin(wr)*Math.sin(nr)*Math.cos(ir))*xp + (-Math.sin(wr)*Math.cos(nr)-Math.cos(wr)*Math.sin(nr)*Math.cos(ir))*yp;
  const y = (Math.cos(wr)*Math.sin(nr)+Math.sin(wr)*Math.cos(nr)*Math.cos(ir))*xp + (-Math.sin(wr)*Math.sin(nr)+Math.cos(wr)*Math.cos(nr)*Math.cos(ir))*yp;
  const z = (Math.sin(wr)*Math.sin(ir))*xp + (Math.cos(wr)*Math.sin(ir))*yp;
  return {x,y,z};
}
const YUDDHA_PLANET_KEY = { "செவ்வாய்":"Mars", "புதன்":"Mercury", "குரு":"Jupiter", "சுக்கிரன்":"Venus", "சனி":"Saturn" };
// Returns geocentric ecliptic latitude (°) for the 5 star planets — the only value
// Yuddha Bala needs; longitude is intentionally not used from here (the app's existing
// engine is the trusted source for longitude everywhere else).
function calcEclipticLatitude(planetTa, T) {
  const key = YUDDHA_PLANET_KEY[planetTa];
  if (!key) return 0;
  const p = keplerHeliocentric(key, T);
  const earth = keplerHeliocentric("Earth", T);
  const x = p.x-earth.x, y = p.y-earth.y, z = p.z-earth.z;
  return Math.atan2(z, Math.sqrt(x*x+y*y)) * 180/Math.PI;
}


// Computes each planet's ACTUAL daily motion (°/day; negative = retrograde) by comparing
// its longitude at birth time against 24 hours later, using the same Jean Meeus engine as
// the rest of the chart — needed so Cheshta Bala can reflect real motion instead of a guess.
function calcActualDailyMotion(dobISO, tob, lat, lon) {
  const h1 = generateHoroscope(dobISO, tob, lat, lon, true);
  const [y, m, d] = dobISO.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  const dob2 = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
  const h2 = generateHoroscope(dob2, tob, lat, lon, true);
  const motions = {};
  h1.placements.forEach(p1 => {
    const p2 = h2.placements.find(pl => pl.ta === p1.ta);
    if (!p2) return;
    let diff = p2.fullLong - p1.fullLong;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    motions[p1.ta] = diff;
  });
  return motions;
}

function calcShadbala(placements, lagnaIdx, dobISO, tob, lat, lon) {
  const drishti = calcGrahaDrishti(placements);

  // Birth date/time breakdown, needed for the Kala Bala sub-components below
  const [by, bm, bd] = dobISO.split('-').map(Number);
  let [bh, bmin] = (tob || "06:00").split(':').map(Number);
  // hour 0 (12 AM) is falsy — Number.isFinite guard, not ||, so midnight births keep hour 0
  bh = Number.isFinite(bh) ? bh : 6; bmin = Number.isFinite(bmin) ? bmin : 0;
  const birthDateObj = new Date(by, bm - 1, bd);
  const birthDateTimeObj = new Date(by, bm - 1, bd, bh, bmin);
  const { sunrise, sunset } = calcSunriseSunset(birthDateObj, lat, lon, 5.5);
  const birthMinutesOfDay = bh * 60 + bmin;
  const sunriseMin = sunrise.decimal * 60, sunsetMin = sunset.decimal * 60;
  const isDayBirth = birthMinutesOfDay >= sunriseMin && birthMinutesOfDay < sunsetMin;

  // Ayana Bala setup — recomputes the same T (Julian centuries from J2000, day-level
  // precision), ayanamsa and obliquity formulas generateHoroscope() uses internally, so
  // that nirayana (sidereal) longitude can be converted back to sayana (tropical)
  // longitude here. Declination (Kranti) must be measured from the tropical framework
  // (relative to the equinoxes), not the sidereal zodiac — using nirayana longitude
  // directly would give a systematically wrong Kranti.
  const T_ayana = (birthDateObj - new Date(2000,0,1)) / 86400000 / 36525;
  const ayanamsaAtBirth = 23.856 + (T_ayana * 100 * 50.29 / 3600);
  const eps = 23.4393 - 0.01300 * T_ayana;
  const epsRad = eps * Math.PI/180;
  function krantiOf(fullLong) {
    const tropicalLong = ((fullLong + ayanamsaAtBirth) % 360 + 360) % 360;
    return Math.asin(Math.sin(epsRad) * Math.sin(tropicalLong * Math.PI/180)) * 180/Math.PI;
  }
  // Kesava's formula (Saravali/BPHS-corroborated): (24° + Kranti)/48 × 60, reversed for
  // Moon/Saturn, and using |Kranti| for Mercury (which gains from EITHER extreme).
  // Verified: 30 at the equinoxes, 60/0 at the respective solstice extremes for each group.
  const AYANA_REVERSED = ["சந்திரன்","சனி"];
  function ayanaBalaOf(p) {
    const k = krantiOf(p.fullLong);
    let val;
    if (p.ta === "புதன்") val = (24 + Math.abs(k)) / 48 * 60;
    else if (AYANA_REVERSED.includes(p.ta)) val = (24 - k) / 48 * 60;
    else val = (24 + k) / 48 * 60;
    return Math.max(0, Math.min(60, val));
  }

  // Nathonnata Bala (day/night strength) — BPHS 27.8-9 / Saravali 4.36: ghati-distance of
  // birth time from the nearest true noon (0 at noon, 30 ghatis at midnight), doubled to
  // virupas. Nata Bala goes to nocturnal planets, Unnata Bala to diurnal ones; the two
  // always sum to 60.
  const noonMin = 12 * 60;
  let distFromNoon = Math.abs(birthMinutesOfDay - noonMin);
  distFromNoon = Math.min(distFromNoon, 24*60 - distFromNoon);
  const nataGhatis = Math.min(30, distFromNoon / 24);
  const nataBala = 2 * nataGhatis;
  const unnataBala = 60 - nataBala;

  // Paksha Bala (lunar fortnight strength) — BPHS 27.10-11: Moon-Sun angular distance,
  // folded to 0-180°, divided by 3 gives the benefics' share; malefics get 60 minus that.
  const sunP = placements.find(p => p.ta === "சூரியன்");
  const moonP = placements.find(p => p.ta === "சந்திரன்");
  let moonSunDiff = ((moonP?.fullLong || 0) - (sunP?.fullLong || 0) + 360) % 360;
  if (moonSunDiff > 180) moonSunDiff = 360 - moonSunDiff;
  const pakshaBenefic = moonSunDiff / 3;
  const pakshaMalefic = 60 - pakshaBenefic;

  // Tribhaga Bala — day and night are each split into 3 equal parts; the lord of the part
  // containing birth gets 60. Jupiter additionally always gets 60 regardless of birth time.
  const TRIBHAGA_DAY = ["புதன்","சூரியன்","சனி"];
  const TRIBHAGA_NIGHT = ["சந்திரன்","சுக்கிரன்","செவ்வாய்"];
  let tribhagaLord;
  if (isDayBirth) {
    const third = Math.min(2, Math.floor((birthMinutesOfDay - sunriseMin) / ((sunsetMin - sunriseMin) / 3)));
    tribhagaLord = TRIBHAGA_DAY[third];
  } else {
    const nightLen = (24*60 - sunsetMin) + sunriseMin;
    const sinceSunset = birthMinutesOfDay >= sunsetMin ? (birthMinutesOfDay - sunsetMin) : (24*60 - sunsetMin + birthMinutesOfDay);
    const third = Math.min(2, Math.floor(sinceSunset / (nightLen / 3)));
    tribhagaLord = TRIBHAGA_NIGHT[third];
  }

  // Vara Bala (weekday lord, 45) and Hora Bala (planetary-hour lord, 60) — reuses the
  // app's existing weekday-lord table and Horai engine rather than recomputing them.
  const varaLord = DAY_LORD_BY_WEEKDAY[birthDateObj.getDay()];
  const horaLord = calcCurrentHorai(birthDateTimeObj, lat, lon, 5.5).planet;

  // Masa Bala (month lord, 30) and Abda Bala (year lord, 15) — weekday-lord of the most
  // recent solar-month Sankranti and the most recent Mesha (year-start) Sankranti,
  // respectively. See findSankrantiDate()'s comment for why the solar (not lunar) system
  // is used. Falls back to no lord (0 for everyone) if the search window happens to miss.
  const sunRashiIdx = sunP ? Math.floor(sunP.fullLong / 30) : 0;
  const sunDegInSign = sunP ? sunP.fullLong % 30 : 0;
  const daysSinceMasaEntry = sunDegInSign / SUN_MEAN_DAILY_MOTION;
  const masaEntryDate = findSankrantiDate(sunRashiIdx, daysSinceMasaEntry, birthDateObj, lat, lon);
  const masaLord = masaEntryDate ? DAY_LORD_BY_WEEKDAY[masaEntryDate.getDay()] : null;
  const daysSinceAbdaEntry = daysSinceMasaEntry + sunRashiIdx * 30.44;
  const abdaEntryDate = findSankrantiDate(0, daysSinceAbdaEntry, birthDateObj, lat, lon);
  const abdaLord = abdaEntryDate ? DAY_LORD_BY_WEEKDAY[abdaEntryDate.getDay()] : null;

  // Real daily motion (birth time vs +24h, same engine as the rest of the chart), for
  // Cheshta Bala below.
  const dailyMotion = calcActualDailyMotion(dobISO, tob, lat, lon);

  const results = placements.filter(p => EXALT_RASHI[p.ta] !== undefined).map(p => {
    // 1. ஸ்தான பலம் (Positional Strength) — BPHS Ch.27 five classical sub-parts:

    // 1a. உச்ச பலம் (Uchcha Bala) — distance from exaltation point, 0-60 virupas
    const exaltDeg = (EXALT_RASHI[p.ta] || 0) * 30 + (EXALT_DEGREE[p.ta] || 15);
    const fullDeg = p.rashiIdx * 30 + p.degExact;
    let distFromExalt = Math.abs(fullDeg - exaltDeg);
    if (distFromExalt > 180) distFromExalt = 360 - distFromExalt;
    const uchchaBala = Math.max(0, (180 - distFromExalt) / 3); // 0 at debil, 60 at exalt

    // 1b. ஓஜயுக்மராச்யம்ச பலம் (Ojhayugma Rashi-Amsa Bala) — odd/even sign+navamsa bonus
    //     Masculine planets (Sun,Mars,Jup) gain 15 in odd rashi; feminine (Moon,Ven) in even;
    //     Mercury gains in both. Same logic for the navamsa sign.
    const isOddRashi = p.rashiIdx % 2 === 0; // 0-indexed: 0=Aries(odd), 1=Taurus(even)...
    const navPart = Math.floor(p.degExact / (30/9));
    const navRashi = (p.rashiIdx * 9 + navPart) % 12;
    const isOddNav = navRashi % 2 === 0;
    const MASCULINE = ["சூரியன்","செவ்வாய்","குரு"];
    const FEMININE = ["சந்திரன்","சுக்கிரன்"];
    // BPHS 27: சூரி/செவ்/குரு/புதன்/சனி → ஒற்றை ராசி-நவாம்சத்தில் 15;
    // சந்/சுக் → இரட்டையில் 15. (முன்பு புதன்+சனி else-branch-இல் விழுந்து
    // நிபந்தனையின்றி 30 பெற்றனர் — சனி இரட்டை ராசியில் 0 பெற வேண்டும்.)
    const ODD_GAINERS = ["சூரியன்","செவ்வாய்","குரு","புதன்","சனி"];
    let ojhRashi = 0, ojhNav = 0;
    if (ODD_GAINERS.includes(p.ta)) { if (isOddRashi) ojhRashi = 15; if (isOddNav) ojhNav = 15; }
    else { if (!isOddRashi) ojhRashi = 15; if (!isOddNav) ojhNav = 15; } // சந்திரன், சுக்கிரன்
    const ojhayugmaBala = ojhRashi + ojhNav; // 0/15/30

    // 1c. கேந்திராதி பலம் (Kendradi Bala) — 60 in Kendra(1,4,7,10), 30 Panapara(2,5,8,11), 15 Apoklima(3,6,9,12)
    const houseFromLagna = ((p.rashiIdx - lagnaIdx + 12) % 12) + 1;
    const kendradiBala = KENDRA_HOUSES.includes(houseFromLagna) ? 60 : [2,5,8,11].includes(houseFromLagna) ? 30 : 15;

    // 1d. த்ரேக்காண பலம் (Drekkana Bala) — 15 if masculine planet in 1st drekkana,
    //     feminine in 2nd, neutral(mercury) in 3rd; else 0
    const drekkana = Math.min(2, Math.floor(p.degExact / 10)); // 0,1,2
    let drekkanaBala = 0;
    if (MASCULINE.includes(p.ta) && drekkana === 0) drekkanaBala = 15;
    else if (FEMININE.includes(p.ta) && drekkana === 1) drekkanaBala = 15;
    else if (p.ta === "புதன்" && drekkana === 2) drekkanaBala = 15;
    else if (p.ta === "சனி" && drekkana === 2) drekkanaBala = 15; // Saturn also 3rd drekkana

    // 1e. சப்தவர்கஜ பலம் (Saptavargaja Bala) — BPHS Ch.27.5-7: planet's dignity across
    //     7 divisional charts (D1,D2,D3,D7,D9,D12,D30) with Pancha-dha Maitri (5-fold
    //     friendship = Naisargika + Tatkalika combined). This is the real classical 2nd
    //     sub-part of Sthana Bala — NOT a simplified dignity score.
    const saptavargajaBala = calcSaptavargajaBala(p, lagnaIdx, placements);

    const sthanaBala = Math.round(uchchaBala + saptavargajaBala + ojhayugmaBala + kendradiBala + drekkanaBala);

    // 2. திக் பலம் (Directional Strength)
    const digHouse = DIG_BALA_HOUSES[p.ta] || 1;
    // houseFromLagna already computed above in Kendradi Bala
    const digDist = Math.min(Math.abs(houseFromLagna - digHouse), 12 - Math.abs(houseFromLagna - digHouse));
    const digBala = Math.max(0, 60 - digDist * 10);

    // 3. கால பலம் (Temporal Strength) — 6 of the classical sub-parts, computed from this
    // chart's actual birth date/time: Nathonnata, Paksha, Tribhaga, Vara, Hora and now
    // Ayana Bala (declination-based), and now Masa Bala (solar-month lord) and Abda Bala
    // (solar-year lord, via the most recent Sankranti dates found above) — all 8 classical
    // Kala Bala sub-parts. Yuddha Bala (planetary war) is applied as a post-processing pass
    // below, after this per-planet total is computed — see there.
    const isNocturnal = ["சந்திரன்","செவ்வாய்","சனி"].includes(p.ta);
    const natonnataBala = p.ta === "புதன்" ? 60 : (isNocturnal ? nataBala : unnataBala);
    const isBeneficForPaksha = ["குரு","சுக்கிரன்","புதன்","சந்திரன்"].includes(p.ta);
    // சந்திரனின் பக்ஷ பலம் இரட்டிப்பு (BPHS/Raman convention)
    let thisPakshaBala = isBeneficForPaksha ? pakshaBenefic : pakshaMalefic;
    if (p.ta === "சந்திரன்") thisPakshaBala *= 2;
    const tribhagaBala = (p.ta === tribhagaLord || p.ta === "குரு") ? 60 : 0;
    const varaBala = p.ta === varaLord ? 45 : 0;
    const horaBala = p.ta === horaLord ? 60 : 0;
    // சூரியனின் அயன பலம் இரட்டிப்பு (BPHS: max 120) — cheshta substitution-க்கும்
    const ayanaBala = ayanaBalaOf(p) * (p.ta === "சூரியன்" ? 2 : 1);
    const masaBala = masaLord && p.ta === masaLord ? 30 : 0;
    const abdaBala = abdaLord && p.ta === abdaLord ? 15 : 0;
    const kalaBala = natonnataBala + thisPakshaBala + tribhagaBala + varaBala + horaBala + ayanaBala + masaBala + abdaBala;

    // 4. சேஷ்ட பலம் (Motional Strength) — Sun and Moon use their BPHS 27.18 substitutions
    // (Sun→his own Ayana Bala; Moon→her own Paksha Bala). The 5 star planets use ACTUAL
    // computed daily motion against each planet's classical mean motion, mapped onto the
    // 8-fold Vakra/Anuvakra/Vikala/Manda/Sama/Chara/Atichara ladder — a well-grounded
    // approximation of that ladder, not the degree-precise Chesta-Kendra/Sighrocca formula
    // (whose exact definition varies even between classical commentators). Previously this
    // ignored actual motion/declination entirely (exalted?60:debil?10:30 for everyone).
    let cheshtaBala;
    if (p.ta === "சூரியன்") {
      cheshtaBala = ayanaBala; // BPHS 27.18: Sun's Cheshta Bala IS his own Ayana Bala
    } else if (p.ta === "சந்திரன்") {
      cheshtaBala = thisPakshaBala; // BPHS 27.18: Moon's Cheshta Bala IS her Paksha Bala
    } else {
      const actual = dailyMotion[p.ta] || 0;
      const mean = MEAN_DAILY_MOTION[p.ta] || 1;
      const rel = actual / mean;
      // Classical 8-fold ladder மதிப்புகள் (BPHS/Raman): வக்ர 60, விகல 15,
      // மந்த 30, சம 7.5(15), சார 45, அதிசார 30 — வேகமான நேர்-கதி நடுத்தர
      // பலம் கொண்டது, பலவீனம் அல்ல (பழைய monotone ladder-இல் தலைகீழ்).
      if (actual < 0) cheshtaBala = 60;        // வக்ர — retrograde
      else if (rel < 0.15) cheshtaBala = 15;   // விகல — near-stationary
      else if (rel < 0.75) cheshtaBala = 30;   // மந்த — slower than mean
      else if (rel < 1.25) cheshtaBala = 15;   // சம — mean speed
      else if (rel < 1.75) cheshtaBala = 45;   // சார — faster than mean
      else cheshtaBala = 30;                    // அதிசார — much faster
    }

    // 5. நைசர்கிக பலம் (Natural Strength)
    const naisargikaBala = NAISARGIKA_BALA[p.ta] || 20;

    // 6. திருஷ்டி பலம் (Drik Bala) — classical: (சுபர்களின் ஸ்புட திருஷ்டி −
    // பாபர்களின் ஸ்புட திருஷ்டி) / 4. எதிர்மறையாகவும் இருக்கலாம்.
    // (பழைய "25 + 8×count" heuristic ஒவ்வொரு கிரகத்திற்கும் ~25 இலவச விருபா
    // தந்து மொத்தத்தை வீங்கச் செய்தது.)
    let drikSum = 0;
    placements.forEach(o => {
      if (o.ta === p.ta || o.ta === "ராகு" || o.ta === "கேது") return;
      const v = drishtiVirupa(o.fullLong, p.fullLong, o.ta);
      if (NATURAL_BENEFICS.includes(o.ta)) drikSum += v;
      else if (NATURAL_MALEFICS.includes(o.ta)) drikSum -= v;
    });
    const drikBala = Math.round((drikSum / 4) * 10) / 10;

    const total = sthanaBala + digBala + kalaBala + cheshtaBala + naisargikaBala + drikBala;
    const required = p.ta === "சூரியன்" ? 390 : p.ta === "சந்திரன்" ? 360 : p.ta === "செவ்வாய்" ? 300 :
                     p.ta === "புதன்" ? 420 : p.ta === "குரு" ? 390 : p.ta === "சுக்கிரன்" ? 330 : 300;
    // Classical விதி: total ≥ required (பழைய ×0.6 discount எல்லா கிரகங்களையும்
    // "பலமுள்ளது" ஆக்கியது)
    const strong = total >= required;

    // ITEM #21: இஷ்ட பலம் & கஷ்ட பலம் (Ishta Phala / Kashta Phala) — BPHS Ch.27.40-41
    // The FINAL PURPOSE of Shadbala: tells how much "desired" vs "undesired" results a planet gives.
    // Ishta = sqrt(Uchcha Bala × Cheshta Bala), Kashta = sqrt((60 - Uchcha) × (60 - Cheshta))
    const uBClamped = Math.max(0, Math.min(60, uchchaBala));
    const cBClamped = Math.max(0, Math.min(60, cheshtaBala));
    const ishtaPhala = Math.round(Math.sqrt(uBClamped * cBClamped) * 10) / 10;
    const kashtaPhala = Math.round(Math.sqrt((60 - uBClamped) * (60 - cBClamped)) * 10) / 10;

    return {
      ta: p.ta, rashi: p.rashi,
      sthanaBala, digBala, kalaBala, cheshtaBala, naisargikaBala, drikBala,
      // Sthana Bala sub-parts (Item #20)
      uchchaBala: Math.round(uchchaBala * 10) / 10, saptavargajaBala, ojhayugmaBala, kendradiBala, drekkanaBala,
      // Ishta/Kashta Phala (Item #21)
      ishtaPhala, kashtaPhala,
      total, required, strong,
      status: strong ? "பலமுள்ளது" : "பலவீனம்",
      yuddha: null // filled in below if this planet is in a Grahayuddha
    };
  });

  // Yuddha Bala (planetary war, BPHS 27.19-20) — a post-processing adjustment to the
  // totals above, not an extra line item: when two of the 5 star planets (Mars, Mercury,
  // Jupiter, Venus, Saturn — luminaries and nodes don't participate) are within 1° of
  // each other in longitude, they're "at war." The winner is whichever has the more
  // northern ecliptic latitude ("those posited in the north... should be considered as
  // victorious"), computed via calcEclipticLatitude()'s heliocentric orbital mechanics
  // (see that function's comment for how its accuracy was cross-checked). The Shadbala
  // difference between the two is added to the winner's total and deducted from the
  // loser's, per BPHS 27.20.
  const T_yuddha = (birthDateTimeObj - new Date(2000,0,1)) / 86400000 / 36525;
  const starPlanets = placements.filter(p => YUDDHA_PLANET_KEY[p.ta]);
  for (let i = 0; i < starPlanets.length; i++) {
    for (let j = i+1; j < starPlanets.length; j++) {
      const pA = starPlanets[i], pB = starPlanets[j];
      let diff = Math.abs(pA.fullLong - pB.fullLong);
      if (diff > 180) diff = 360 - diff;
      if (diff >= 1) continue; // not at war
      const rA = results.find(r => r.ta === pA.ta), rB = results.find(r => r.ta === pB.ta);
      if (!rA || !rB) continue;
      const latA = calcEclipticLatitude(pA.ta, T_yuddha);
      const latB = calcEclipticLatitude(pB.ta, T_yuddha);
      const winner = latA >= latB ? rA : rB;
      const loser = winner === rA ? rB : rA;
      const delta = Math.abs(winner.total - loser.total);
      winner.total += delta;
      loser.total = Math.max(0, loser.total - delta);
      winner.strong = winner.total >= winner.required;
      loser.strong = loser.total >= loser.required;
      winner.status = winner.strong ? "பலமுள்ளது" : "பலவீனம்";
      loser.status = loser.strong ? "பலமுள்ளது" : "பலவீனம்";
      winner.yuddha = { opponent: loser.ta, result: "வெற்றி", orb: diff.toFixed(2) };
      loser.yuddha = { opponent: winner.ta, result: "தோல்வி", orb: diff.toFixed(2) };
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// 7. அஷ்டகவர்க்க ராசி வாரியாக (Per-planet Ashtakavarga breakdown)
// Already have SAV in calcAshtakavarga — this adds individual planet grids
// ═══════════════════════════════════════════════════════════════════
// (Using existing calcAshtakavarga which already has per-planet grids in .grids)

// ═══════════════════════════════════════════════════════════════════
// 8. கோசார மேலடுக்கு (TRANSIT OVERLAY on birth chart)
// ═══════════════════════════════════════════════════════════════════
function calcTransitOverlay(birthPlacements, transitPlacements, birthMoonRashiIdx) {
  if (!transitPlacements) return null;
  // ஜென்ம நட்சத்திரம் — every transiting planet's nakshatra is measured
  // against it (9-தாரா cycle), refining the rashi-level palan below.
  const birthMoon = birthPlacements.find(bp => bp.ta === "சந்திரன்");
  const birthNakIdx = (birthMoon && birthMoon.nakIdx >= 0) ? birthMoon.nakIdx : -1;
  const rows = transitPlacements.map(tp => {
    const birthP = birthPlacements.find(bp => bp.ta === tp.ta);
    const houseFromMoon = ((tp.rashiIdx - birthMoonRashiIdx + 12) % 12) + 1;
    const sameAsBirth = birthP ? tp.rashiIdx === birthP.rashiIdx : false;
    // நட்சத்திர அளவு கோசாரம் — transit nakshatra, its lord, and Tara Bala
    // from the birth star (finer timing than the whole-rashi transit)
    const nakLord = getNakshatraLord(tp.nakIdx);
    const tara = (birthNakIdx >= 0 && tp.nakIdx >= 0) ? calcTaraBala(birthNakIdx, tp.nakIdx) : null;
    return {
      ...tp,
      houseFromMoon,
      birthRashi: birthP?.rashi || "—",
      birthRashiIdx: birthP?.rashiIdx,
      sameAsBirth,
      nakLordName: nakLord.name,
      tara,
      // ஒவ்வொரு கிரகத்திற்கும் அதன் சொந்த classical gochara விதியிலிருந்தே
      // (GOCHARA_RULES) — முன்பு இருந்த generic [1,3,6,10,11] பட்டியல் தினப்பலன்
      // திரையின் per-planet விதியுடன் முரண்பட்டது. ராகு/கேது: சனி விதி
      // (3,6,11 சுபம்) — பொதுவான தமிழ் convention.
      transitEffect: (() => {
        const rule = GOCHARA_RULES[tp.ta] || GOCHARA_RULES["சனி"]; // nodes → Saturn-like
        if (rule.good.includes(houseFromMoon)) return "சுபம்";
        if (rule.bad.includes(houseFromMoon)) return "அசுபம்";
        return "நடுநிலை";
      })()
    };
  });
  // ── கோசார வேதை (2ஆம் சுற்று) — கிரகம் தன் சுப வீட்டில் இருந்தாலும்,
  // அதன் வேதை வீட்டில் வேறு கிரகம் இருந்தால் சுபபலன் தடைபடும் ──
  rows.forEach(row => {
    row.vedha = null;
    const table = GOCHARA_VEDHA[row.ta];
    if (!table) return; // ராகு/கேதுவுக்கு classical வேதை இல்லை
    const vedhaHouse = table[row.houseFromMoon];
    if (!vedhaHouse) return; // சுப வீட்டில் இல்லை → வேதை பொருந்தாது
    const obstructor = rows.find(o =>
      o.ta !== row.ta && GOCHARA_VEDHA[o.ta] && // nodes வேதை செய்யா
      o.houseFromMoon === vedhaHouse && !isVedhaExempt(row.ta, o.ta));
    if (obstructor) row.vedha = { by: obstructor.ta, house: vedhaHouse };
    else row.gocharaFav = true; // per-planet table-படி சுபம், வேதை இல்லை
  });
  return rows;
}

// ═══════════════════════════════════════════════════════════════════
// ராகு காலம் / எமகண்டம் / குளிகை (RAHU KALAM / YAMA GANDAM / GULIKAI)
// ═══════════════════════════════════════════════════════════════════
const RAHU_KALAM_ORDER = [7,1,6,4,5,3,2]; // Sun=7, Mon=1, Tue=6...
const YAMA_GANDAM_ORDER = [4,3,2,1,0,6,5];
const GULIKAI_ORDER = [6,5,4,3,2,1,0];
function calcInauspiciousTimes(date, lat=13.0827, lon=80.2707) {
  const d = date || new Date();
  const dayOfWeek = d.getDay(); // 0=Sun
  const dayIdx = dayOfWeek === 0 ? 0 : dayOfWeek;
  // ROOT-FIX: real sunrise/sunset for the location (was hardcoded 6:00/18:00 —
  // Rahu Kalam shifts with the actual day length, same engine as Muhurtham)
  const sr = calcSunriseSunset(d, lat, lon, 5.5);
  const sunriseH = sr.sunrise.h, sunriseM = sr.sunrise.m, sunsetH = sr.sunset.h, sunsetM = sr.sunset.m;
  const dayMinutes = (sunsetH * 60 + sunsetM) - (sunriseH * 60 + sunriseM);
  const slotMin = dayMinutes / 8;
  const getSlot = (order) => {
    const idx = order[dayIdx % 7];
    const startMin = sunriseH * 60 + sunriseM + idx * slotMin;
    const endMin = startMin + slotMin;
    const fmtTime = (m) => {
      let h = Math.floor(m / 60), mm = Math.round(m % 60);
      if (mm === 60) { h += 1; mm = 0; } // "8:60" தவிர்க்க minute-60 carry
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${h12}:${String(mm).padStart(2,'0')} ${ampm}`;
    };
    return { start: fmtTime(startMin), end: fmtTime(endMin) };
  };
  const vaaram = ["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"][dayIdx];
  return {
    date: d,
    vaaram,
    rahuKalam: getSlot(RAHU_KALAM_ORDER),
    yamaGandam: getSlot(YAMA_GANDAM_ORDER),
    gulikai: getSlot(GULIKAI_ORDER),
    sunrise: `${sunriseH>12?sunriseH-12:sunriseH}:${String(sunriseM).padStart(2,'0')} ${sunriseH>=12?"PM":"AM"}`,
    sunset: `${sunsetH>12?sunsetH-12:sunsetH}:${String(sunsetM).padStart(2,'0')} ${sunsetH>=12?"PM":"AM"}`
  };
}

// ═══════════════════════════════════════════════════════════════════
// முஹூர்த்தம் (MUHURTHA — சுப நேரம் கணிப்பு)
// ═══════════════════════════════════════════════════════════════════
// சுப நட்சத்திரங்கள் — அசுவினி(0), ரோகிணி(3), மிருகசீரிடம்(4), புனர்பூசம்(6),
// பூசம்(7), உத்திரம்(11), அஸ்தம்(12), சித்திரை(13), சுவாதி(14), அனுஷம்(16),
// உத்திராடம்(20), திருவோணம்(21), உத்திரட்டாதி(25), ரேவதி(26).
// (பழைய பட்டியல் off-by-one: கார்த்திகை(2), பூரம்(10), விசாகம்(15),
// பூரட்டாதி(24) ஆகிய அசுப/நடுநிலை நட்சத்திரங்கள் சுபமாகக் குறிக்கப்பட்டிருந்தன.)
const SUBA_NAKSHATRAS = [0,3,4,6,7,11,12,13,14,16,20,21,25,26];
const SUBA_TITHIS = [2,3,5,7,10,11,13]; // Dwitiya,Tritiya,Panchami,Saptami,Dasami,Ekadasi,Trayodasi
const ASUBA_YOGAS = ["Vishkambha","Atiganda","Shoola","Ganda","Vyaghata","Vajra","Vyatipata","Parigha","Vaidhrti"];
function calcMuhurtha(targetDate, birthMoonNakIdx, lat = 13.0827, lon = 80.2707) {
  const d = targetDate || new Date();
  const dayOfWeek = d.getDay();
  const vaaramTa = ["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"][dayOfWeek];
  const goodDays = [1,3,4,5]; // Mon,Wed,Thu,Fri
  const badDays = [0,2,6]; // Sun,Tue,Sat
  const inauspicious = calcInauspiciousTimes(d, lat, lon);
  // உண்மையான பஞ்சாங்கம் — engine வழியே (06:00 அன்றைய தினம்). முன்பு இங்கு
  // epoch-anchor இல்லாத போலி சூத்திரம் (சூரிய வேகத்தில் நட்சத்திரம்!) இருந்தது;
  // அதனால் score/verdict தவறான திதி-நட்சத்திரத்தின் மேல் கட்டப்பட்டது.
  const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dayH = generateHoroscope(iso, "06:00", lat, lon, true);
  const dayMoon = dayH.placements[1];
  const daySun = dayH.placements[0];
  const elong = ((dayMoon.fullLong - daySun.fullLong) % 360 + 360) % 360;
  const tithiIdx = Math.floor(elong / 12) + 1; // 1..30
  const nakIdx = dayMoon.nakIdx; // அன்றைய சந்திர நட்சத்திரம்
  const yogamName = dayH.yogam;
  const tithiNames = ["பிரதமை","துவிதியை","திருதியை","சதுர்த்தி","பஞ்சமி","சஷ்டி","சப்தமி","அஷ்டமி","நவமி","தசமி","ஏகாதசி","துவாதசி","திரயோதசி","சதுர்த்தசி","பூர்ணிமை/அமாவாசை"];
  const tithiName = tithiNames[(tithiIdx - 1) % 15];
  const isTithiGood = SUBA_TITHIS.includes(((tithiIdx - 1) % 15) + 1);
  const isNakGood = SUBA_NAKSHATRAS.includes(nakIdx);
  const isDayGood = goodDays.includes(dayOfWeek);
  // அசுப யோகங்கள் (விஷ்கம்பம், அதிகண்டம், சூலம்...) — தமிழ்ப் பெயர்களில்
  const ASUBA_YOGAS_TA = ["விஷ்கம்பம்","அதிகண்டம்","சூலம்","கண்டம்","வ்யாகாதம்","வஜ்ரம்","வ்யதீபாதம்","பரிகம்","வைத்ருதி"];
  const isYogaBad = ASUBA_YOGAS_TA.includes(yogamName);
  let score = 0;
  if (isDayGood) score += 25;
  if (isTithiGood) score += 30;
  if (isNakGood) score += 30;
  if (isYogaBad) score -= 15;
  score += 15; // base
  score = Math.max(0, Math.min(100, score));
  const verdict = score >= 80 ? "மிகச் சிறந்த முஹூர்த்தம்" : score >= 60 ? "நல்ல முஹூர்த்தம்" : score >= 40 ? "சுமாரான நாள்" : "தவிர்க்கவும்";
  // சுப நேரங்கள் — உண்மையான சூரிய உதயத்திலிருந்து: பிரம்ம முஹூர்த்தம்
  // (உதயத்திற்கு 96→48 நிமிடம் முன்), அபிஜித் (பகல் நடுவம் ± பகல்/30)
  const sr = calcSunriseSunset(d, lat, lon, 5.5);
  const fmtHM = (dec) => {
    let h = Math.floor(dec), mn = Math.round((dec - h) * 60);
    if (mn === 60) { h += 1; mn = 0; }
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${String(mn).padStart(2,'0')} ${ampm}`;
  };
  const midDay = (sr.sunrise.decimal + sr.sunset.decimal) / 2;
  const abhijitHalf = (sr.sunset.decimal - sr.sunrise.decimal) / 30; // முஹூர்த்தம்/2 = பகல்/30
  const subaNeramSlots = [
    `${fmtHM(sr.sunrise.decimal - 1.6)} - ${fmtHM(sr.sunrise.decimal - 0.8)} (பிரம்ம முஹூர்த்தம்)`,
    ...(dayOfWeek !== 3 ? [`${fmtHM(midDay - abhijitHalf)} - ${fmtHM(midDay + abhijitHalf)} (அபிஜித் முஹூர்த்தம்)`] : []),
  ];
  if (isNakGood) subaNeramSlots.push(`${fmtHM(sr.sunrise.decimal + 1.5)} - ${fmtHM(sr.sunrise.decimal + 3)}`);
  return {
    date: d, vaaram: vaaramTa, tithiName, tithiIdx, nakIdx, isDayGood, isTithiGood, isNakGood,
    yogam: yogamName, isYogaBad,
    score, verdict, subaNeramSlots, inauspicious,
    activities: score >= 60 ? ["திருமணம்","கிரகப்பிரவேசம்","தொழில் ஆரம்பம்","வாகனம் வாங்குதல்","நகை வாங்குதல்"] :
                score >= 40 ? ["சாதாரண பூஜை","யாத்திரை","கல்வி ஆரம்பம்"] : ["பூஜை மட்டும்"]
  };
}

// ═══════════════════════════════════════════════════════════════════
// சனி / குரு பெயர்ச்சி (SATURN / JUPITER TRANSIT ANALYSIS)
// ═══════════════════════════════════════════════════════════════════
const SANI_TRANSIT_EFFECTS = {
  1: {effect:"அசுபம்",desc:"உடல்நலக் குறைவு, மனக்கவலை, பொருளாதாரச் சிக்கல்கள். சனி ஜெபம், எள் தானம் செய்யவும்."},
  2: {effect:"அசுபம்",desc:"குடும்பத்தில் சிக்கல், பணவரவு தடை, கண் சம்பந்தமான பிரச்சனை. எள் விளக்கு ஏற்றவும்."},
  3: {effect:"சுபம்",desc:"எதிரிகள் தோல்வி, புதிய வாய்ப்புகள், தைரியம் அதிகரிக்கும். நல்ல காலம்."},
  4: {effect:"அசுபம்",desc:"வீடு/வாகன பிரச்சனை, தாயார் ஆரோக்கியம் பாதிக்கும், மனநிம்மதி குறையும்."},
  5: {effect:"அசுபம்",desc:"குழந்தை சம்பந்த கவலை, படிப்பில் தடை, முதலீட்டு நஷ்டம்."},
  6: {effect:"சுபம்",desc:"எதிரிகள் அழிவு, கடன் தீரும், நோய் குணமாகும், வழக்கில் வெற்றி."},
  7: {effect:"அசுபம்",desc:"கண்டச் சனி — திருமண வாழ்க்கையில் சிக்கல், கூட்டாளிகளுடன் பிரச்சனை, சுகம் குறையும்."},
  8: {effect:"அசுபம்",desc:"அஷ்டமச் சனி — ஆபத்து, விபத்து ஆபாயம், நீண்ட நோய், பெரிய நஷ்டம்."},
  9: {effect:"அசுபம்",desc:"தந்தை ஆரோக்கியம் பாதிப்பு, யாத்திரை தடை, பாக்கிய குறைவு. புண்ணியக் கடன் செய்யவும்."},
  10: {effect:"அசுபம்",desc:"தொழிலில் மாற்றம், பதவி இழப்பு அல்லது மாற்றம், கடின உழைப்பு தேவை."},
  11: {effect:"சுபம்",desc:"மிகச் சிறந்த காலம்! லாபம், புதிய வருமானம், ஆசைகள் நிறைவேறும்."},
  12: {effect:"அசுபம்",desc:"செலவு அதிகம், தூக்கமின்மை, வெளிநாடு பயணம், கண் பிரச்சனை. விரயம் அதிகம்."}
};
const GURU_TRANSIT_EFFECTS = {
  1: {effect:"அசுபம்",desc:"உடல் பருமன் அதிகரிக்கும், புதிய திட்டங்களில் நிதானம் தேவை, சுய மாற்றம்."},
  2: {effect:"சுபம்",desc:"குடும்பத்தில் சுபநிகழ்வுகள், பணவரவு அதிகம், நல்ல உணவு, வாக்கு பலம்."},
  3: {effect:"அசுபம்",desc:"சகோதரர்களுடன் பிரச்சனை, தைரியக் குறைவு, குறுகிய பயணங்களில் இடர்."},
  4: {effect:"அசுபம்",desc:"வீடு/வாகனம் பிரச்சனை, மனநிம்மதி குறையும், தாயார் ஆரோக்கியம்."},
  5: {effect:"சுபம்",desc:"புத்திரப் பாக்கியம், கல்வியில் வெற்றி, மந்திர சித்தி, முதலீட்டில் லாபம்."},
  6: {effect:"அசுபம்",desc:"எதிரிகளால் கவலை, கடன் பிரச்சனை, நோய் வரலாம்."},
  7: {effect:"சுபம்",desc:"திருமண வாழ்க்கை சிறப்பு, கூட்டாளிகள் ஒத்துழைப்பு, சமூக மரியாதை."},
  8: {effect:"அசுபம்",desc:"திடீர் மாற்றங்கள், ஆன்மீக ஈடுபாடு அதிகரிக்கும், மறைவான பிரச்சனைகள்."},
  9: {effect:"சுபம்",desc:"மிகச் சிறந்த காலம்! பாக்கியம், புண்ணிய யாத்திரை, குரு அருள், உயர் கல்வி."},
  10: {effect:"அசுபம்",desc:"தொழிலில் மாற்றம், புதிய பொறுப்பு, கடின உழைப்பு தேவை."},
  11: {effect:"சுபம்",desc:"லாபம், புதிய நண்பர்கள், ஆசைகள் நிறைவேறும், சமூக உயர்வு."},
  12: {effect:"அசுபம்",desc:"செலவு அதிகம், வெளிநாடு வாய்ப்பு, ஆன்மீகம், தூக்கமின்மை."}
};
function calcPlanetTransitAnalysis(birthMoonRashiIdx, transitPlacements, birthNakIdx = -1) {
  if (!transitPlacements) return null;
  const saturn = transitPlacements.find(p => p.ta === "சனி");
  const jupiter = transitPlacements.find(p => p.ta === "குரு");
  const saniHouse = saturn ? ((saturn.rashiIdx - birthMoonRashiIdx + 12) % 12) + 1 : null;
  const guruHouse = jupiter ? ((jupiter.rashiIdx - birthMoonRashiIdx + 12) % 12) + 1 : null;
  const isSadeSati = saniHouse && (saniHouse === 12 || saniHouse === 1 || saniHouse === 2);
  const sadeSatiPhase = saniHouse === 12 ? "ஏறு பாதை (12th)" : saniHouse === 1 ? "உச்ச பாதை (1st — ஜென்ம சனி)" : saniHouse === 2 ? "இறங்கு பாதை (2nd)" : null;
  // நட்சத்திர அளவு — the 2½-yr (Sani) / 1-yr (Guru) rashi stay divides into
  // ~3 nakshatra legs; the tara from the birth star refines timing within it.
  const nakInfo = (p) => p && p.nakIdx >= 0 ? {
    nakshatraTa: p.nakshatraTa, pada: p.pada,
    nakLordName: getNakshatraLord(p.nakIdx).name,
    tara: birthNakIdx >= 0 ? calcTaraBala(birthNakIdx, p.nakIdx) : null
  } : {};
  return {
    sani: saturn ? {
      currentRashi: saturn.rashi,
      houseFromMoon: saniHouse,
      ...SANI_TRANSIT_EFFECTS[saniHouse],
      ...nakInfo(saturn),
      isSadeSati,
      sadeSatiPhase,
      isAshtama: saniHouse === 8,
      isKandaka: saniHouse === 7
    } : null,
    guru: jupiter ? {
      currentRashi: jupiter.rashi,
      houseFromMoon: guruHouse,
      ...GURU_TRANSIT_EFFECTS[guruHouse],
      ...nakInfo(jupiter)
    } : null
  };
}

// ═══════════════════════════════════════════════════════════════════
// பரிகாரம் (REMEDIES — கோயில், மந்திரம், ரத்தினம், நிறம்)
// ═══════════════════════════════════════════════════════════════════
const PLANET_REMEDIES = {
  "சூரியன்": {
    gem:"மாணிக்கம் (Ruby)", gemColor:"#e53e3e", metal:"தங்கம்",
    mantra:"ஓம் ஹ்ராம் ஹ்ரீம் ஹ்ரௌம் ஸஃ சூர்யாய நமஃ", mantraCount:"7000 ஜெபம்",
    temple:"சூரியனார் கோயில், கும்பகோணம்", day:"ஞாயிறு",
    color:"சிவப்பு", food:"கோதுமை, வெல்லம்", donate:"கோதுமை, செம்பு",
    flower:"செந்தாமரை", direction:"கிழக்கு"
  },
  "சந்திரன்": {
    gem:"முத்து (Pearl)", gemColor:"#f0f0f0", metal:"வெள்ளி",
    mantra:"ஓம் ஷ்ராம் ஷ்ரீம் ஷ்ரௌம் ஸஃ சந்த்ராய நமஃ", mantraCount:"11000 ஜெபம்",
    temple:"திங்களூர் சந்திரமௌலீஸ்வரர்", day:"திங்கள்",
    color:"வெள்ளை", food:"அரிசி, பால்", donate:"வெள்ளை துணி, பால்",
    flower:"வெண் தாமரை", direction:"வடமேற்கு"
  },
  "செவ்வாய்": {
    gem:"பவளம் (Red Coral)", gemColor:"#e85d26", metal:"செம்பு",
    mantra:"ஓம் க்ராம் க்ரீம் க்ரௌம் ஸஃ பௌமாய நமஃ", mantraCount:"7000 ஜெபம்",
    temple:"வைத்தீஸ்வரன் கோயில்", day:"செவ்வாய்",
    color:"சிவப்பு, பவள நிறம்", food:"துவரம் பருப்பு", donate:"சிவப்பு துணி, கோதுமை",
    flower:"செவ்வரளி", direction:"தெற்கு"
  },
  "புதன்": {
    gem:"மரகதம் (Emerald)", gemColor:"#22c55e", metal:"வெங்கலம்",
    mantra:"ஓம் ப்ராம் ப்ரீம் ப்ரௌம் ஸஃ புதாய நமஃ", mantraCount:"9000 ஜெபம்",
    temple:"திருவேங்கடு புதன் ஸ்தலம்", day:"புதன்",
    color:"பச்சை", food:"பாசிப் பருப்பு", donate:"பச்சை துணி, பாசிப் பருப்பு",
    flower:"வில்வம்", direction:"வடக்கு"
  },
  "குரு": {
    gem:"புஷ்பராகம் (Yellow Sapphire)", gemColor:"#eab308", metal:"தங்கம்",
    mantra:"ஓம் க்ராம் க்ரீம் க்ரௌம் ஸஃ குரவே நமஃ", mantraCount:"19000 ஜெபம்",
    temple:"ஆலங்குடி குரு ஸ்தலம்", day:"வியாழன்",
    color:"மஞ்சள்", food:"கடலைப் பருப்பு", donate:"மஞ்சள் துணி, வாழைப்பழம்",
    flower:"முல்லை", direction:"வடகிழக்கு"
  },
  "சுக்கிரன்": {
    gem:"வைரம் (Diamond)", gemColor:"#e2e8f0", metal:"வெள்ளி",
    mantra:"ஓம் த்ராம் த்ரீம் த்ரௌம் ஸஃ சுக்ராய நமஃ", mantraCount:"16000 ஜெபம்",
    temple:"கஞ்சனூர் சுக்ர ஸ்தலம்", day:"வெள்ளி",
    color:"வெள்ளை, பன்னீர் நிறம்", food:"மொச்சைப் பருப்பு", donate:"வெள்ளை பட்டு, வெண்ணெய்",
    flower:"வெண் தாமரை", direction:"தென்கிழக்கு"
  },
  "சனி": {
    gem:"நீலம் (Blue Sapphire)", gemColor:"#1e3a5f", metal:"இரும்பு",
    mantra:"ஓம் ப்ராம் ப்ரீம் ப்ரௌம் ஸஃ சனைஸ்சராய நமஃ", mantraCount:"23000 ஜெபம்",
    temple:"திருநள்ளாறு சனி ஸ்தலம்", day:"சனி",
    color:"கருப்பு, நீலம்", food:"எள், கருப்பு உளுந்து", donate:"எள் எண்ணெய், கருப்பு துணி",
    flower:"எருக்கு", direction:"மேற்கு"
  },
  "ராகு": {
    gem:"கோமேதகம் (Hessonite)", gemColor:"#a78bfa", metal:"பஞ்சலோகம்",
    mantra:"ஓம் ப்ராம் ப்ரீம் ப்ரௌம் ஸஃ ராஹவே நமஃ", mantraCount:"18000 ஜெபம்",
    temple:"திருநாகேஸ்வரம்", day:"சனி / ராகு காலம்",
    color:"கருநீலம்", food:"உளுந்து", donate:"நீல துணி, கருப்பு உளுந்து",
    flower:"மந்தாரை", direction:"தென்மேற்கு"
  },
  "கேது": {
    gem:"வைடூரியம் (Cat's Eye)", gemColor:"#6b7280", metal:"பஞ்சலோகம்",
    mantra:"ஓம் ஸ்ராம் ஸ்ரீம் ஸ்ரௌம் ஸஃ கேதவே நமஃ", mantraCount:"7000 ஜெபம்",
    temple:"கீழ்ப்பெரும்பள்ளம் கேது ஸ்தலம்", day:"செவ்வாய் / கேது ஹோரை",
    color:"சாம்பல், புகை நிறம்", food:"குதிரைவாலி", donate:"போர்வை, எள்",
    flower:"அரளி", direction:"—"
  }
};
// ═══════════════════════════════════════════════════════════════════
// பாவ பலன் (BHAVA PHALAM) — Life-area readings that LINK all app logic
// Uses the 4 fundamental components (Lagna, Rashi/Nakshatra, Planets, Dasha)
// plus Graha Bala, House Lords, Doshas — every statement traces to computed
// data. NO guessing, NO interpretation beyond classical planet-in-house rules.
// ═══════════════════════════════════════════════════════════════════
function calcBhavaPhalam(horoscope, grahaBala, chevvaiDosham, dashaData, classicalYogas, ctx) {
  if (!horoscope || !horoscope.placements) return null;

  const lagnaIdx = horoscope.lagna;
  const placements = horoscope.placements;
  const find = (name) => placements.find(p => p.ta === name);

  // Build a strength lookup from Graha Bala (the app already computed this)
  const strengthOf = {};
  if (grahaBala) grahaBala.forEach(g => { strengthOf[g.ta] = g; });

  // ── ctx: ஒருங்கிணைந்த இணைப்பு அடுக்கு (optional — இல்லாவிட்டாலும் பழைய பலன் அப்படியே) ──
  //   sav: ராசிவாரி சர்வாஷ்டகவர்க்க பிந்து, bhavaBala: வீட்டு பலம்,
  //   unified: ஒருங்கிணைந்த கிரக பலம், marakaBadhaka + functionalNat: அதிபதி இயல்பு
  const savArr = ctx?.ashtakavarga?.sav || null;
  const bhavaBalaOf = {}; (ctx?.bhavaBala || []).forEach(b => { bhavaBalaOf[b.houseNum] = b; });
  const unifiedOf = {}; (ctx?.unified || []).forEach(u => { unifiedOf[u.ta] = u; });
  const mb = ctx?.marakaBadhaka || null;
  const fnat = ctx?.functionalNat || null;

  // Which planets sit in a given house (house is 1-12 from Lagna)
  const planetsInHouse = (houseNum) => {
    const targetRashi = (lagnaIdx + houseNum - 1) % 12;
    return placements.filter(p => p.rashiIdx === targetRashi);
  };

  // The lord of a house and where that lord currently sits
  const houseLordInfo = (houseNum) => {
    const houseRashi = (lagnaIdx + houseNum - 1) % 12;
    const lordName = RASHI_LORD_NAME[houseRashi];
    const lordP = find(lordName);
    if (!lordP) return { lordName, lordHouse: null, lordRashi: null, lordStrength: null };
    const lordHouse = ((lordP.rashiIdx - lagnaIdx + 12) % 12) + 1;
    return {
      lordName,
      lordHouse,
      lordRashi: lordP.rashi,
      lordStrength: strengthOf[lordName] || null,
      lordRetro: lordP.isRetrograde,
      lordCombust: lordP.isCombust
    };
  };

  // Describe a planet's condition using the app's computed flags
  const planetCondition = (p) => {
    const parts = [];
    const gb = strengthOf[p.ta];
    if (gb) parts.push(gb.status); // உச்சம்/நீசம்/சொந்த வீடு/நட்பு etc — from Graha Bala
    if (p.isRetrograde && p.ta !== "ராகு" && p.ta !== "கேது") parts.push("வக்ரம்");
    if (p.isCombust) parts.push("அஸ்தங்கம்");
    if (p.isMoolaTri) parts.push("மூலத்திரிகோணம்");
    return parts.join(", ");
  };

  // Build reading for each life area (from the user's document grouping)
  const areas = LIFE_AREAS.map(area => {
    const houseReadings = area.houses.map(houseNum => {
      const theme = HOUSE_THEMES[houseNum];
      const occupants = planetsInHouse(houseNum);
      const lordInfo = houseLordInfo(houseNum);
      const houseRashiIdx = (lagnaIdx + houseNum - 1) % 12;

      // Planet-in-house classical effects (only for planets actually there)
      const occupantEffects = occupants.map(p => ({
        planet: p.ta,
        symbol: p.symbol,
        condition: planetCondition(p),
        effect: PLANET_IN_HOUSE[p.ta] ? PLANET_IN_HOUSE[p.ta][houseNum] : ""
      }));

      // House-lord strength/placement — stated as a FACT about the lord only.
      // NOT a life-area verdict (marriage/health/career verdicts come solely from
      // the deep-analysis section). This avoids the lord looking "excellent" while
      // the area verdict says "challenges" (or vice-versa).
      let lordVerdict = "";
      if (lordInfo.lordStrength) {
        const score = lordInfo.lordStrength.score;
        const lordHouseGood = [1,4,5,7,9,10,11].includes(lordInfo.lordHouse);
        if ([6,8,12].includes(lordInfo.lordHouse)) lordVerdict = "அதிபதி துஸ்தானத்தில் (6/8/12)";
        else if (score >= 7 && lordHouseGood) lordVerdict = "அதிபதி பலமாக, சாதக ஸ்தானத்தில்";
        else if (score >= 5 && lordHouseGood) lordVerdict = "அதிபதி நல்ல நிலையில்";
        else if (score < 4) lordVerdict = "அதிபதி பலவீனம்";
        else lordVerdict = "அதிபதி நடுத்தர நிலையில்";
      }
      // அதிபதியின் ஒருங்கிணைந்த பலம் (எல்லா அளவுகோலும்) — dignity-மட்டும் verdict-ஐ செழுமைப்படுத்தும்
      const lordUnified = unifiedOf[lordInfo.lordName] || null;
      if (lordUnified) lordVerdict += `${lordVerdict ? " • " : ""}ஒருங்கிணைந்த பலம்: ${lordUnified.composite}/100 (${lordUnified.tier})`;
      // அதிபதியின் லக்னவாரி இயல்பு + மாரக/பாதக நிலை — பலன் திசைக் குறிப்பு
      const lordTags = [];
      if (fnat && fnat[lordInfo.lordName]) lordTags.push(fnat[lordInfo.lordName].nature);
      if (mb) {
        if (mb.marakaLords.includes(lordInfo.lordName)) lordTags.push("மாரகாதிபதி");
        if (mb.badhakaLord === lordInfo.lordName) lordTags.push("பாதகாதிபதி");
      }

      // இவ்வீட்டு ராசியின் சர்வாஷ்டகவர்க்க பிந்து — வீட்டின் அடிப்படை ஆதரவு அளவு
      const savPoints = savArr ? savArr[houseRashiIdx] : null;
      const savVerdict = savPoints == null ? "" :
        savPoints >= 30 ? `SAV ${savPoints} பிந்து — வலுவான ஆதரவு` :
        savPoints >= 25 ? `SAV ${savPoints} பிந்து — நடுத்தர ஆதரவு` :
        `SAV ${savPoints} பிந்து — ஆதரவு குறைவு (28 சராசரிக்குக் கீழ்)`;
      // பாவ பலத்துடன் இணைப்பு (அதிபதி ஷட்பலம் + திக் + திருஷ்டி கூட்டு)
      const bb = bhavaBalaOf[houseNum] || null;

      // கிரக பார்வை இந்த வீட்டின் மீது — சனி/செவ்வாய்/குரு special aspects உட்பட.
      // Aspecting planet's own condition (உச்சம்/நீசம்...) shown so a debilitated
      // Jupiter's "protection" isn't overstated.
      const aspectors = aspectorsOnHouse(placements, lagnaIdx, houseRashiIdx)
        .map(a => ({ ...a, condition: (() => { const ap = find(a.planet); return ap ? planetCondition(ap) : ""; })() }));

      return {
        houseNum,
        houseTheme: theme,
        houseRashi: RASHIS[houseRashiIdx],
        occupants: occupantEffects,
        aspectors,
        lordInfo,
        lordVerdict,
        lordTags,
        savPoints,
        savVerdict,
        bhavaBala: bb ? { total: bb.total, verdict: bb.verdict } : null,
        isEmpty: occupants.length === 0
      };
    });

    // Special linkage for specific areas — state FACTS only, not a verdict.
    // The final marriage verdict comes from the deep analysis (🔮 section) to
    // avoid contradicting it. Here we just note the Chevvai dosham status factually.
    let specialNote = "";
    if (area.key === "marriage" && chevvaiDosham) {
      if (chevvaiDosham.present && !chevvaiDosham.cancelled) {
        specialNote = `செவ்வாய் தோஷம்: உண்டு (${chevvaiDosham.severityText}). ${chevvaiDosham.remedy}`;
      } else if (chevvaiDosham.present && chevvaiDosham.cancelled) {
        specialNote = `செவ்வாய் தோஷம்: உண்டு ஆனால் நிவர்த்தி (${chevvaiDosham.cancelReason}). மொத்த திருமண பகுப்பாய்வுக்கு மேலே 🔮 பிரிவைப் பார்க்கவும்.`;
      } else {
        specialNote = "செவ்வாய் தோஷம்: இல்லை. மொத்த திருமண பகுப்பாய்வுக்கு மேலே 🔮 பிரிவைப் பார்க்கவும்.";
      }
    }

    return { ...area, houseReadings, specialNote };
  });

  // Current Dasha context — links the time dimension (4th fundamental component)
  let dashaContext = null;
  if (dashaData && dashaData.dashas) {
    const now = new Date();
    const md = dashaData.dashas.find(d => now >= d.startDate && now < d.endDate);
    if (md) {
      const ad = md.antardashas?.find(a => now >= a.startDate && now < a.endDate);
      const dashaLordP = find(md.name);
      const dashaLordHouse = dashaLordP ? ((dashaLordP.rashiIdx - lagnaIdx + 12) % 12) + 1 : null;
      const dashaLordStrength = strengthOf[md.name];
      const mdUnified = unifiedOf[md.name] || null;
      const mdFn = fnat?.[md.name] || null;
      dashaContext = {
        mahaLord: md.name,
        antarLord: ad?.name || null,
        dashaLordHouse,
        dashaLordRashi: dashaLordP?.rashi || null,
        dashaLordStrength: dashaLordStrength?.status || null,
        // ஒருங்கிணைந்த அடுக்கு: தசாநாதனின் composite பலம் + லக்னவாரி இயல்பு —
        // "இந்த தசை எப்படி இருக்கும்" என்பதன் இரு முக்கிய அச்சுகள்
        dashaLordUnified: mdUnified ? { composite: mdUnified.composite, tier: mdUnified.tier } : null,
        dashaLordNature: mdFn ? mdFn.nature : null,
        // Which life areas the current dasha lord activates (houses it rules + sits in)
        rulesHouses: [1,2,3,4,5,6,7,8,9,10,11,12].filter(h => RASHI_LORD_NAME[(lagnaIdx + h - 1) % 12] === md.name)
      };
    }
  }

  // Relevant yogas summary
  const yogaList = (classicalYogas || []).filter(y => y.type === "yoga").map(y => y.name);
  const doshaList = (classicalYogas || []).filter(y => y.type === "dosha").map(y => y.name);

  return {
    lagna: horoscope.lagnaName,
    moonRashi: horoscope.moonRashi,
    nakshatra: horoscope.nakshatra,
    areas,
    dashaContext,
    yogaList,
    doshaList
  };
}

function getRemedies(placements, grahaBala, unified) {
  if (!placements || !grahaBala) return [];
  const weakPlanets = grahaBala.filter(g => g.score <= 4).map(g => g.ta);
  const unifiedOf = {}; (unified || []).forEach(u => { unifiedOf[u.ta] = u; });
  const doshaRemedies = [];
  placements.forEach(p => {
    const remedy = PLANET_REMEDIES[p.ta];
    if (!remedy) return;
    const isWeak = weakPlanets.includes(p.ta);
    const isDebilitated = p.rashiIdx === DEBIL_RASHI[p.ta];
    const isEnemy = GRAHA_FRIENDSHIP[p.ta]?.enemies?.includes(RASHI_LORD_NAME[p.rashiIdx]);
    // ஒருங்கிணைந்த பலம் — dignity-மட்டும் அல்லாமல் ஷட்பலம்/D9/அவஸ்தை எல்லாம் சேர்ந்த
    // composite < 45 எனில் பரிகாரத் தேவை (dignity நன்றாக இருந்தும் மற்றவை தாழலாம்)
    const u = unifiedOf[p.ta];
    const isUnifiedWeak = u ? u.composite < 45 : false;
    const needsRemedy = isWeak || isDebilitated || isEnemy || isUnifiedWeak;
    doshaRemedies.push({
      ...remedy, ta: p.ta, rashi: p.rashi,
      isWeak, isDebilitated, isEnemy, isUnifiedWeak,
      unifiedComposite: u ? u.composite : null, unifiedTier: u ? u.tier : null,
      needsRemedy,
      // முன்னுரிமை: நீசம் > ஒருங்கிணைந்த பலவீனம் > dignity பலவீனம் > பகை வீடு
      priority: isDebilitated ? 4 : isUnifiedWeak ? 3 : isWeak ? 2 : isEnemy ? 1 : 0
    });
  });
  // சம priority-க்குள் composite குறைந்தவர் முதலில் — மிகத் தேவையானது மேலே
  return doshaRemedies.sort((a,b) => b.priority - a.priority || (a.unifiedComposite ?? 100) - (b.unifiedComposite ?? 100));
}

// ── exports ─────────────────────────────────────────────────────────
export {
  NAKSHATRAS,
  RASHIS,
  RASHI_EN,
  PLANETS,
  CITIES,
  geocodeCity,
  geocodeCityAsync,
  searchPlacesOSM,
  resolveBirthGeo,
  escapeHtml,
  parseBackendResponse,
  enrichPlacementsWithStates,
  generateHoroscope,
  DASHA_LORDS,
  NAK_DASHA_MAP,
  getNakshatraLord,
  RASHI_LUCKY,
  calcDailyLuckyNumbers,
  calculateDasha,
  AYANAMSA_SYSTEMS,
  ASHTOTTARI_LORDS,
  ASHTOTTARI_NAK_LORD,
  ASHTOTTARI_NAK_POS,
  ASHTOTTARI_GROUP_SIZE,
  calculateAshtottariDasha,
  YOGINI_LORDS,
  calculateYoginiDasha,
  calcHoraLagna,
  calcGhatiLagna,
  ARUDHA_PADA_NAMES,
  calcAllArudhaPadas,
  calcArudhaLagna,
  _MOVABLE_SIGNS,
  calcRashiDrishti,
  planetsAspectingSign,
  calcArgala,
  calcJaiminiAnalysis,
  calcCharaDasha,
  calcVarshaphala,
  calcPrashnaChart,
  calcUpapadaLagna,
  KARAKA_NAMES,
  calcCharaKarakas,
  getAshtakavargaTransitScore,
  calcDoubleTransit,
  TYAJYA_GHATIS,
  calcTyajyaKalam,
  PANCHAKA_NAKSHATRAS,
  PANCHAKA_TYPES,
  checkPanchaka,
  MALEFICS,
  calcPapaSamyam,
  SHAD_VARGA_WEIGHTS,
  calcVimshopakaBala,
  PUSHKARA_BHAGA,
  MRITYU_BHAGA,
  PLANET_MRITYU_IDX,
  checkPushkaraMrityu,
  calculateNavamsa,
  GANAM,
  GANAM_NAMES,
  YONI,
  YONI_NAMES,
  YONI_ENEMY_PAIRS,
  NADI_MAP,
  NADI_NAMES,
  RAJJU_MAP,
  RAJJU_NAMES,
  VEDHA_PAIRS,
  calculate10Porutham,
  GOCHARA_RULES,
  calculateGochara,
  getTodayTranist,
  RASHI_REMEDIES,
  DAY_REMEDIES,
  TITHI_GUIDANCE,
  getPersonalizedRemedy,
  calcSunriseSunset,
  RAHU_KALAM_SEG,
  YAMAGANDAM_SEG,
  KULIGAI_SEG,
  calcMuhurtham,
  HORA_CYCLE,
  HORA_SYMBOLS,
  DAY_LORD_BY_WEEKDAY,
  calcCurrentHorai,
  calcSadeSati,
  calcGuruPeyarchi,
  TARA_TYPES,
  calcTaraBala,
  EXALT_RASHI,
  EXALT_DEGREE,
  DEBIL_RASHI,
  OWN_RASHI,
  MOOLA_TRIKONA,
  COMBUSTION_LIMITS,
  RASHI_LORD_NAME,
  GRAHA_FRIENDSHIP,
  isMoolaTrikona,
  isCombust,
  calcGrahaBala,
  MAHAPURUSHA_INFO,
  detectMahapurushaYogas,
  KENDRA_HOUSES,
  TRIKONA_HOUSES,
  DUSTHANA_HOUSES,
  getHouseLord,
  detectClassicalYogas,
  BAV_RULES,
  BAV_TOTALS,
  calcAshtakavarga,
  DRISHTI_RULES,
  CLASSICAL_7,
  DRISHTI_EFFECT,
  aspectorsOnHouse,
  calcGrahaDrishti,
  calcD10Dasamsa,
  calcD2Hora,
  calcD3Drekkana,
  calcD12Dwadasamsa,
  D30_ODD_RULERS,
  D30_EVEN_RULERS,
  D30_ODD_SIGN,
  D30_EVEN_SIGN,
  calcD30Trimsamsa,
  calcSaptavargajaBala,
  D60_NAMES,
  D60_NATURE,
  calcD60Shashtiamsa,
  KALA_SARPA_TYPES,
  detectKalaSarpa,
  detectChevvaiDosham,
  calcBhavaChart,
  calcNavamsaStrength,
  calcD4Chaturthamsa,
  calcD7Saptamsa,
  calcD16Shodasamsa,
  calcD20Vimsamsa,
  calcD24Siddhamsa,
  calcD27Bhamsa,
  calcD40Khavedamsa,
  calcD45Akshavedamsa,
  DIG_BALA_HOUSES,
  NAISARGIKA_BALA,
  NATURAL_BENEFICS,
  NATURAL_MALEFICS,
  housesOwnedBy,
  calcFunctionalNature,
  calcMarakaBadhaka,
  GOCHARA_VEDHA,
  VEDHA_EXEMPT_PAIRS,
  isVedhaExempt,
  signDignity,
  BALADI_SEQ,
  calcAvasthas,
  NARA_RASHIS,
  JALA_RASHIS,
  KEETA_RASHIS,
  calcBhavaBala,
  buildUnifiedStrength,
  calcNakshatraBhavaLinks,
  calcDashaSandhi,
  calcGulikaPosition,
  calcBirthTimeSensitivity,
  EVENT_TOPICS,
  planetHitsRashi,
  buildActivationWeights,
  calcEventPromise,
  calcBacktest,
  calcEventTiming,
  SEQUENCE_RULES,
  calcSequenceLinkages,
  calcConditionalBenefics,
  calcPlanetContext,
  MEAN_DAILY_MOTION,
  SUN_MEAN_DAILY_MOTION,
  findSankrantiDate,
  TAMIL_SOLAR_MONTHS,
  calcTamilDate,
  ORBITAL_ELEMENTS,
  keplerHeliocentric,
  YUDDHA_PLANET_KEY,
  calcEclipticLatitude,
  calcActualDailyMotion,
  calcShadbala,
  calcTransitOverlay,
  RAHU_KALAM_ORDER,
  YAMA_GANDAM_ORDER,
  GULIKAI_ORDER,
  calcInauspiciousTimes,
  SUBA_NAKSHATRAS,
  SUBA_TITHIS,
  ASUBA_YOGAS,
  calcMuhurtha,
  SANI_TRANSIT_EFFECTS,
  GURU_TRANSIT_EFFECTS,
  calcPlanetTransitAnalysis,
  PLANET_REMEDIES,
  calcBhavaPhalam,
  getRemedies
};
// re-export the pure helpers so consumers get everything from one entry
export { analyzeKeyLifeAreas, analyzeFamilyHealthIndications, analyzeMarriage } from "./deep-analysis.js";
export { NAK_SPAN, subLordOf, drishtiVirupa, virupaGrade } from "./precision.js";
export { PLANET_IN_HOUSE, HOUSE_THEMES, LIFE_AREAS } from "./bhava-phalam.js";
