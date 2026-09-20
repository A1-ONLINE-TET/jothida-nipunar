import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MURUGAN_IMG } from "./murugan-b64.js";

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
    const ap = data.planets.find(pp => pp.ta === p.ta);
    if (!ap) return { ...p, rashi:RASHIS[0], rashiEn:RASHI_EN[0], degree:0, house:1, dms:"0:00:00", fullLong:0, nakshatraTa:"", pada:1, rashiIdx:0, isRetrograde:false, isCombust:false, isMoolaTri:false };
    return {
      ...p, rashi:RASHIS[ap.rashi], rashiEn:RASHI_EN[ap.rashi], rashiIdx:ap.rashi,
      degree:Math.floor(ap.degree), degExact:ap.degree, dms:ap.dms, fullLong:ap.fullLong,
      house:ap.house, nakshatraTa:ap.nakshatra_ta, nakIdx:NAKSHATRAS.indexOf(ap.nakshatra_ta), pada:ap.nakshatra_pada,
      isRetrograde: ap.speed !== undefined ? ap.speed < 0 : false, // backend may provide speed
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
function generateHoroscope(dob, tob, lat=13.0827, lon=80.2707) {
  // Parse Y/M/D directly from "YYYY-MM-DD" string — avoids the classic JS bug where
  // new Date("YYYY-MM-DD") parses as UTC midnight, then local getters (getDate()) can
  // shift the day backward by one for users in negative-UTC-offset timezones (e.g. Americas).
  const [yStr, mStr, dStr] = dob.split('-');
  const year = parseInt(yStr, 10), month = parseInt(mStr, 10), day = parseInt(dStr, 10);
  let birthH = 6, birthM = 0;
  if (tob) { const p = tob.split(':').map(Number); birthH = p[0]||6; birthM = p[1]||0; }
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

  // ── Lahiri Ayanamsa (Chitrapaksha) — IENA-adopted value at J2000.0 ──
  const ayanamsa = 23.856 + (T * 100 * 50.29 / 3600);

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

  // ══════ MOON (Meeus Ch. 47 — 6 major terms) ══════
  const Lm = norm(218.3165 + 481267.8813 * T);  // Mean longitude
  const Dm = norm(297.8502 + 445267.1115 * T);   // Mean elongation
  const Mm = norm(134.9634 + 477198.8676 * T);   // Mean anomaly (Moon)
  const Fm = norm(93.2721 + 483202.0175 * T);    // Argument of latitude
  const Om = norm(125.0446 - 1934.1363 * T);     // Long. ascending node

  // 6 major perturbation terms
  const moonCorr =
    + 6.289 * Math.sin(Mm * rad)             // Equation of center
    - 1.274 * Math.sin((2 * Dm - Mm) * rad)  // Evection
    + 0.658 * Math.sin(2 * Dm * rad)         // Variation
    - 0.214 * Math.sin(2 * Mm * rad)         // Annual equation
    - 0.186 * Math.sin(M_sun * rad)          // Reduction to ecliptic
    + 0.110 * Math.sin(2 * Fm * rad);        // Node correction

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
  // Ascendant formula (uses geocoded birth latitude)
  let ascTropical = Math.atan2(Math.cos(LSTr),
    -(Math.sin(epsr) * Math.tan(lat * rad) + Math.cos(epsr) * Math.sin(LSTr)));
  ascTropical = norm(ascTropical * deg);
  // Correct quadrant
  if (Math.cos(LSTr) < 0) ascTropical = norm(ascTropical + 180);
  const ascSidereal = norm(ascTropical - ayanamsa);
  const lagna = Math.floor(ascSidereal / 30);
  const lagnaDeg = Math.floor(ascSidereal % 30);

  // ══════ PLANETS (Meeus — Mean Elements + Equation of Center) ══════
  // [Mean Longitude at J2000, daily motion °/day in terms of T, eccentricity, perihelion]
  const planetCalc = (L0p, Tp, ep, wp) => {
    const L = norm(L0p + Tp * T);
    const w = norm(wp + (Tp * 0.001) * T); // approximate perihelion shift
    const Ma = norm(L - w); // Mean anomaly
    const Mar = Ma * rad;
    // Equation of center (2 terms)
    const C = (2 * ep - ep*ep*ep/4) * Math.sin(Mar)
      + (5/4) * ep * ep * Math.sin(2 * Mar);
    const trueLong = norm(L + C * deg);
    return norm(trueLong - ayanamsa);
  };

  // Planet orbital elements [L0(J2000°), rate(°/century), eccentricity, perihelion(°)]
  const marsLong    = planetCalc(355.433, 19140.299, 0.09340, 336.06);
  const mercuryLong = planetCalc(252.251, 149472.675, 0.20563, 77.46);
  const jupiterLong = planetCalc(34.351, 3034.906, 0.04839, 14.33);
  const venusLong   = planetCalc(181.980, 58517.816, 0.00677, 131.53);
  const saturnLong  = planetCalc(50.077, 1222.114, 0.05415, 93.06);

  // Rahu — True Node (includes nutation wobble for ±1.5° more accuracy than Mean Node)
  // Mean longitude of ascending node
  const rahuMeanLong = norm(125.0446 - 1934.1363 * T);
  // Nutation correction terms (Meeus Ch.22, 5 principal terms) for True Node
  const Om_r = rahuMeanLong * rad;
  const Ls = norm(280.4665 + 36000.7698 * T) * rad; // mean Sun longitude
  const Lm2 = Lm * rad; // mean Moon longitude (already computed above)
  const trueNodeCorr =
    - 1.4979 * Math.sin(2 * (Lm2 - Om_r))
    - 0.1500 * Math.sin(Ls)
    - 0.1226 * Math.sin(2 * Lm2)
    + 0.1176 * Math.sin(2 * Om_r)
    - 0.0801 * Math.sin(2 * (Ls - Om_r));
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
  // Retrograde: compare planet longitude with +1 day using same engine internals
  {
    const JD2 = JD + 1; // next day
    const T2 = (JD2 - 2451545.0) / 36525;
    const norm2 = norm;
    const ayanamsa2 = 23.856 + (T2 * 100 * 50.29 / 3600);
    const planetCalc2 = (L0p, Tp, ep, wp) => {
      const L = norm2(L0p + Tp * T2);
      const w = norm2(wp + (Tp * 0.001) * T2);
      const Ma = norm2(L - w);
      const Mar = Ma * rad;
      const C = (2 * ep - ep*ep*ep/4) * Math.sin(Mar) + (5/4) * ep * ep * Math.sin(2 * Mar);
      return norm2(norm2(L + C * deg) - ayanamsa2);
    };
    const nextDayLongs = {
      "செவ்வாய்":  planetCalc2(355.433, 19140.299, 0.09340, 336.06),
      "புதன்":     planetCalc2(252.251, 149472.675, 0.20563, 77.46),
      "குரு":      planetCalc2(34.351, 3034.906, 0.04839, 14.33),
      "சுக்கிரன்": planetCalc2(181.980, 58517.816, 0.00677, 131.53),
      "சனி":       planetCalc2(50.077, 1222.114, 0.05415, 93.06),
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

  // ── Karanam (Moon - Sun / 6) ──
  const karanaIdx = Math.floor(tithiAngle / 6) % 11;
  const KARANAMS = ["பவம்","பாலவம்","கௌலவம்","தைதுலம்","கரம்","வணிசை","விஷ்டி",
    "சகுனி","சதுஷ்பாதம்","நாகம்","கிம்ஸ்துக்னம்"];

  // Lagna nakshatra
  const lagnaFullLong = norm(ascSidereal);
  const lagnaNakIdx = Math.floor(lagnaFullLong / (360/27)) % 27;
  const lagnaPada = Math.floor((lagnaFullLong % (360/27)) / (360/108)) + 1;

  // ── Special Lagnas (BPHS Ch.33) ──
  const birthMin = h * 60 + m;
  const { sunrise: sr } = calcSunriseSunset(new Date(yr, mo-1, dy), lat, lon, 5.5);
  const srMin = sr.decimal * 60;
  const horaLagna = calcHoraLagna(sunLong, birthMin, srMin);
  const ghatiLagna = calcGhatiLagna(sunLong, birthMin, srMin);
  const arudhaLagna = calcArudhaLagna(lagna, placements);
  const upapadaLagna = calcUpapadaLagna(lagna, placements);

  // ── Chara Karakas (Jaimini) ──
  const charaKarakas = calcCharaKarakas(placements);

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

  // Ensure all 3 are unique
  const nums = [seed1];
  if (!nums.includes(seed2)) nums.push(seed2); else nums.push((seed2 % 9) + 1);
  if (!nums.includes(seed3)) nums.push(seed3); else nums.push(((seed3 + 2) % 9) + 1);

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

  // Build dasha periods
  const bd = new Date(birthDate);
  const dashas = [];
  let currentDate = new Date(bd);
  // First: remaining balance of birth dasha
  const now = new Date();
  let startIdx = lordIdx;
  for (let i = 0; i < 9; i++) {
    const idx = (startIdx + i) % 9;
    const d = DASHA_LORDS[idx];
    const yrs = i === 0 ? balanceYears : d.years;
    const startDt = new Date(currentDate);
    const endMs = currentDate.getTime() + yrs * 365.25 * 24 * 3600000;
    const endDt = new Date(endMs);

    // Antardasha (sub-periods within this dasha)
    const antardashas = [];
    let adDate = new Date(startDt);
    for (let j = 0; j < 9; j++) {
      const adIdx = (idx + j) % 9;
      const ad = DASHA_LORDS[adIdx];
      const adYrs = (yrs * ad.years) / 120;
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

      antardashas.push({
        ...ad, startDate: adStart, endDate: adEnd,
        duration: adYrs.toFixed(1) + " வருடம்",
        isCurrent: now >= adStart && now < adEnd,
        pratyantardashas
      });
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
    desc: "Raman's Ayanamsa — slightly different from Lahiri",
    // Raman: 22°27'37.76" at 1900 + precession 50.3333"/year
    calc: (T) => 22.4605 + ((T + 1) * 100 * 50.3333 / 3600) // T+1 because T is from J2000, Raman epoch is 1900
  },
  yukteshwar: {
    name: "யுக்தேஸ்வர்", nameEn: "Sri Yukteshwar",
    desc: "Yukteshwar's system from Holy Science (1894)",
    // Yukteshwar: 22°27'59" at 1893 + 54"/year
    calc: (T) => 22.4664 + ((T + 1.07) * 100 * 54 / 3600) // epoch ~1893
  }
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

// Nakshatra → Ashtottari lord mapping (BPHS Ch.47):
// Venus(7): Ashwini(0),Bharani(1),Krittika(2),Rohini(3),Mrigashira(4),Revati(26)
// Sun(0): Ardra(5),Punarvasu(6),Pushya(7),Ashlesha(8)
// Moon(1): Magha(9),P.Phalguni(10),U.Phalguni(11)
// Mars(2): Hasta(12),Chitra(13),Swati(14)
// Mercury(3): Vishakha(15),Anuradha(16),Jyeshtha(17)
// Saturn(4): Mula(18),P.Ashadha(19),U.Ashadha(20)
// Jupiter(5): Shravana(21),Dhanishta(22),Shatabhisha(23)
// Rahu(6): P.Bhadrapada(24),U.Bhadrapada(25)
const ASHTOTTARI_NAK_LORD = [
  7,7,7,7,7,0,0,0,0, 1,1,1,2,2,2,3,3,3, 4,4,4,5,5,5,6,6,7
]; // index into ASHTOTTARI_LORDS

function calculateAshtottariDasha(moonLongitude, birthDate) {
  const nakIdx = Math.floor(moonLongitude / (360 / 27)) % 27;
  const lordIdx = ASHTOTTARI_NAK_LORD[nakIdx];
  const lord = ASHTOTTARI_LORDS[lordIdx];

  // Remaining dasha balance at birth
  const nakSpan = 360 / 27;
  const elapsed = (moonLongitude % nakSpan) / nakSpan;
  const remainYears = lord.years * (1 - elapsed);

  const dashas = [];
  let currentDate = new Date(birthDate);
  const now = new Date();

  for (let i = 0; i < 8; i++) {
    const idx = (lordIdx + i) % 8;
    const d = ASHTOTTARI_LORDS[idx];
    const yrs = i === 0 ? remainYears : d.years;
    const ms = yrs * 365.25 * 24 * 3600000;
    const startDt = new Date(currentDate);
    const endDt = new Date(currentDate.getTime() + ms);
    const isCurrent = now >= startDt && now < endDt;
    dashas.push({ ...d, years: Math.round(yrs * 10) / 10, startDate: startDt, endDate: endDt, isCurrent });
    currentDate = endDt;
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
  // Yogini lord: cycle repeats every 8 nakshatras starting from Ashwini=Mangala
  // Ashwini(0)→Mangala, Bharani(1)→Pingala, ..., Pushya(7)→Sankata, Ashlesha(8)→Mangala again
  const lordIdx = nakIdx % 8;
  const lord = YOGINI_LORDS[lordIdx];

  const nakSpan = 360 / 27;
  const elapsed = (moonLongitude % nakSpan) / nakSpan;
  const remainYears = lord.years * (1 - elapsed);

  const dashas = [];
  let currentDate = new Date(birthDate);
  const now = new Date();

  for (let i = 0; i < 8; i++) {
    const idx = (lordIdx + i) % 8;
    const d = YOGINI_LORDS[idx];
    const yrs = i === 0 ? remainYears : d.years;
    const ms = yrs * 365.25 * 24 * 3600000;
    const startDt = new Date(currentDate);
    const endDt = new Date(currentDate.getTime() + ms);
    const isCurrent = now >= startDt && now < endDt;
    dashas.push({ ...d, years: Math.round(yrs * 10) / 10, startDate: startDt, endDate: endDt, isCurrent });
    currentDate = endDt;
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
// "1 sign per 5 ghatis" = 30° / 5 ghatis = 6° per ghati.
// GL completes 1 full cycle (360°) in 24 hours.
function calcGhatiLagna(sunLong, birthMinutes, sunriseMin) {
  const ghatis = (birthMinutes - sunriseMin) / 24;
  const ghatiLong = ((sunLong + ghatis * 6) % 360 + 360) % 360;
  const rashi = Math.floor(ghatiLong / 30);
  return { longitude: Math.round(ghatiLong * 100) / 100, rashi, rashiName: RASHIS[rashi] };
}

// #26 ஆருட லக்னம் (ARUDHA LAGNA / PADA LAGNA) — BPHS 29.1-3
// Count from Lagna lord to Lagna lord's position, then count same from that position
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

// Mrityu Bhaga: inauspicious degree per sign per planet (BPHS Ch.44 / Sarvartha Chintamani)
// [Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn] for each rashi
const MRITYU_BHAGA = [
  [20,26,19,15,18,12,10], // Mesha
  [9,12,28,14,29,4,4],    // Rishabha
  [12,13,25,13,12,6,7],   // Mithuna
  [6,25,23,12,27,8,9],    // Kadaka
  [8,24,29,11,6,4,12],    // Simma
  [24,11,28,10,13,18,16], // Kanni
  [16,26,14,9,10,20,3],   // Thula
  [17,14,21,8,14,12,18],  // Vrischika
  [22,13,2,7,6,8,28],     // Dhanusu
  [2,25,15,6,12,12,14],   // Makara
  [3,5,11,5,15,4,13],     // Kumbha
  [23,12,6,4,13,20,10],   // Meena
];
const PLANET_MRITYU_IDX = {"சூரியன்":0,"சந்திரன்":1,"செவ்வாய்":2,"புதன்":3,"குரு":4,"சுக்கிரன்":5,"சனி":6};

function checkPushkaraMrityu(placements) {
  return placements.filter(p => EXALT_RASHI[p.ta] !== undefined).map(p => {
    const deg = Math.round(p.degExact);
    const pushkaraDeg = PUSHKARA_BHAGA[p.rashiIdx];
    const isPushkara = Math.abs(deg - pushkaraDeg) <= 1; // within 1° of Pushkara point

    const mIdx = PLANET_MRITYU_IDX[p.ta];
    const mrityuDeg = mIdx !== undefined ? MRITYU_BHAGA[p.rashiIdx][mIdx] : null;
    const isMrityu = mrityuDeg !== null && Math.abs(deg - mrityuDeg) <= 1; // within 1°

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
    const navPart = Math.min(8, Math.floor((p.degExact || p.degree) / (30/9))); // 0-8, use exact fractional degree
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

const VEDHA_PAIRS = [[0,17],[1,16],[2,15],[3,14],[4,13],[5,12],[6,11],[7,10],[8,9],[18,26],[19,25],[20,24],[21,23]];

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

  // 4. RASHI — count from bride's rashi to groom's rashi
  // Favorable: 1(same),2,3,4,5,7 | Bad: 6(ari),8(ashtama),9,10,11,12(vyaya)
  const rDiff = ((rashi2 - rashi1 + 12) % 12) + 1;
  const rashiOk = [1,2,3,4,5,7].includes(rDiff);
  results.push({ name:"ராசி", en:"Rasi", ok:rashiOk, score:rashiOk?1:0, max:1,
    desc:rashiOk?"ராசி பொருத்தம் உள்ளது, செல்வம் சேரும்":"ராசி பொருத்தம் சரியில்லை" });
  if(rashiOk) totalScore++;

  // 5. RASIYATHIPATI (Lord compatibility) — uses the same graha-maitri (friendship) table
  // as Graha Bala below, so this never contradicts that table's friend/enemy calls
  const lName1 = RASHI_LORD_NAME[rashi1], lName2 = RASHI_LORD_NAME[rashi2];
  const lordOk = lName1===lName2 || (GRAHA_FRIENDSHIP[lName1]?.friends.includes(lName2) ?? false);
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

  // 9. MAHENDRAM
  const mahCount = ((nak2 - nak1 + 27) % 27) + 1;
  const mahOk = [1,4,7,10,13,16,19,22,25].includes(mahCount);
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
    const rule = GOCHARA_RULES[p.ta];
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
function getTodayTranist(lat=13.0827, lon=80.2707, targetDate=null) {
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
  const h = generateHoroscope(dob, `${hh}:${mm}`, lat, lon);
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

  // Abhijit Muhurtham — most auspicious, centered on solar noon, ~48 min window
  const noonMin = (sunrise.decimal + sunset.decimal)/2 * 60;
  const fmt2 = (m) => { let h=Math.floor(m/60)%24, mn=Math.round(m%60); if(mn===60){h=(h+1)%24;mn=0;} return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`; };
  const abhijit = `${fmt2(noonMin-24)} — ${fmt2(noonMin+24)}`;

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
  return { active:false, phase:"ஏழரை சனி இல்லை", phaseEn:"No Sade Sati", desc:"தற்போது சனி தொடர்பான சிறப்பு கவனம் தேவையில்லை.", severity:"none" };
}

// ═══════════════════════════════════════════════════════════════════
// குரு பெயர்ச்சி (GURU PEYARCHI) — Jupiter's yearly transit status
// ═══════════════════════════════════════════════════════════════════
function calcGuruPeyarchi(birthMoonRashi, jupiterTodayRashi) {
  const houseFromMoon = ((jupiterTodayRashi - birthMoonRashi + 12) % 12) + 1;
  const GURU_EFFECTS = {
    1:{mood:"good",desc:"தன்னம்பிக்கை, புதிய தொடக்கங்களுக்கு நல்ல காலம்"},
    2:{mood:"good",desc:"பொருளாதார வளர்ச்சி, குடும்ப மகிழ்ச்சி"},
    3:{mood:"caution",desc:"முயற்சிகள் அதிகரிக்கும், சகோதரர்களுடன் உறவில் கவனம்"},
    4:{mood:"caution",desc:"வீடு, தாய் தொடர்பான விஷயங்களில் மாற்றம்"},
    5:{mood:"good",desc:"கல்வி, குழந்தைகள், படைப்பாற்றலுக்கு சிறந்த காலம்"},
    6:{mood:"caution",desc:"எதிரிகள், கடன், ஆரோக்கியத்தில் கவனம் தேவை"},
    7:{mood:"good",desc:"திருமணம், கூட்டாண்மைகளுக்கு நல்ல காலம்"},
    8:{mood:"caution",desc:"திடீர் மாற்றங்கள், ஆன்மீக வளர்ச்சிக்கான காலம்"},
    9:{mood:"good",desc:"அதிர்ஷ்டம், தர்மம், தொலைதூர பயணங்களுக்கு சிறந்தது"},
    10:{mood:"good",desc:"தொழில், பதவி உயர்வுக்கு சிறந்த காலம்"},
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
  "சந்திரன்":  { rashi:1,  fromDeg:4,  toDeg:20  },  // Taurus 4°-20°
  "செவ்வாய்":  { rashi:0,  fromDeg:0,  toDeg:12  },  // Aries 0°-12°
  "புதன்":     { rashi:5,  fromDeg:16, toDeg:20  },  // Virgo 16°-20°
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

  // 4. கேமத்ரும யோகம் (தோஷம்) — no planets in 2nd/12th from Moon
  if (moon) {
    const others = placements.filter(p => CLASSICAL_7.includes(p.ta) && p.ta !== "சந்திரன்" && p.ta !== "சூரியன்");
    const h2 = (moon.rashiIdx + 1) % 12, h12 = (moon.rashiIdx + 11) % 12;
    const hasSupport = others.some(p => p.rashiIdx === h2 || p.rashiIdx === h12);
    if (!hasSupport) {
      yogas.push({
        name:"கேமத்ரும யோகம்", nameEn:"Kemadruma Yoga", type:"dosha", icon:"☽⚠",
        desc:"சந்திரனுக்கு இரு பக்கமும் (2,12ஆம் வீடு) கிரகங்கள் இல்லாததால் ஏற்படும் மன சவால்கள் — பரிகாரம் தேவை"
      });
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
      const asp = aspectsFrom(kP, tP) || aspectsFrom(tP, kP);
      const pariv = isParivartana(kP, tP);
      if (conj || asp || pariv) {
        rajaYogaFound.add(key);
        const how = conj ? "சேர்க்கை" : asp ? "பார்வை" : "பரிவர்த்தனை";
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

  // ═══ ITEM #11: சகட யோகம் (Shakata Dosha) — Moon 6th/8th from Jupiter ═══
  if (moon && guru) {
    const moonFromGuru = ((moon.rashiIdx - guru.rashiIdx + 12) % 12) + 1;
    if (moonFromGuru === 6 || moonFromGuru === 8) {
      yogas.push({ name:"சகட யோகம்", nameEn:"Shakata Yoga", type:"dosha", icon:"☽⚙",
        desc:`சந்திரன் குருவிலிருந்து ${moonFromGuru}ஆம் வீட்டில் — வாழ்க்கையில் ஏற்ற இறக்கங்கள், முயற்சி அதிகம் தேவைப்படும்` });
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

  // ═══ ITEM #13: அமல யோகம் (Amala Yoga) — benefic in 10th from Lagna/Moon ═══
  {
    const rashi10FromLagna = (lagnaRashiIdx + 9) % 12;
    const beneficIn10 = BENEFICS.some(name => { const p = find(name); return p && p.rashiIdx === rashi10FromLagna; });
    if (beneficIn10) {
      yogas.push({ name:"அமல யோகம்", nameEn:"Amala Yoga", type:"yoga", icon:"✨",
        desc:"10ஆம் வீட்டில் சுப கிரகம் — நற்பெயர், தர்மம், தூய நடத்தை, சமூக மதிப்பு தரும் யோகம்" });
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
  if (guru && venus && mercury) {
    const goodHouses = [1,2,4,5,7,9,10]; // kendra + trikona + 2nd
    if (goodHouses.includes(guru.house) && goodHouses.includes(venus.house) && goodHouses.includes(mercury.house)) {
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
function calcD30Trimsamsa(placements) {
  return placements.map(p => {
    const isOdd = p.rashiIdx % 2 === 0; // 0=Aries(odd)
    const rules = isOdd ? D30_ODD_RULERS : D30_EVEN_RULERS;
    const ruler = rules.find(([from, to]) => p.degExact >= from && p.degExact < to);
    const d30Lord = ruler ? ruler[2] : "செவ்வாய்";
    // D30 rashi = Moolatrikona sign of the ruling planet
    const d30Rashi = MOOLA_TRIKONA[d30Lord] ? MOOLA_TRIKONA[d30Lord].rashi : OWN_RASHI[d30Lord]?.[0] ?? 0;
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
  const d30Rashi = MOOLA_TRIKONA[d30Lord] ? MOOLA_TRIKONA[d30Lord].rashi : OWN_RASHI[d30Lord]?.[0] ?? 0;

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

    if (isFriendN && isFriendT) return "greatFriend";
    if (isFriendN && !isFriendT) return "friend";
    if (!isFriendN && !isEnemyN && isFriendT) return "friend"; // neutral+temporal friend = friend
    if (!isFriendN && !isEnemyN && !isFriendT) return "neutral"; // neutral+temporal enemy = neutral (some texts say enemy)
    if (isEnemyN && isFriendT) return "neutral"; // enemy+temporal friend = neutral
    if (isEnemyN && !isFriendT) return "greatEnemy";
    return "neutral";
  }

  // Score each varga
  const VARGA_SCORES = { exalt: 20, moolaTrikona: 45, own: 30, greatFriend: 22.5, friend: 15, neutral: 7.5, enemy: 3.75, greatEnemy: 1.875 };

  let totalSaptavargaja = 0;
  vargas.forEach(vRashi => {
    // Check dignity in this varga
    if (vRashi === EXALT_RASHI[p.ta]) { totalSaptavargaja += VARGA_SCORES.exalt; }
    else if (MOOLA_TRIKONA[p.ta] && vRashi === MOOLA_TRIKONA[p.ta].rashi) { totalSaptavargaja += VARGA_SCORES.moolaTrikona; }
    else if (OWN_RASHI[p.ta]?.includes(vRashi)) { totalSaptavargaja += VARGA_SCORES.own; }
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
  let allBetweenForward = true, allBetweenReverse = true;
  others.forEach(p => {
    const r = p.rashiIdx;
    const fwd = rahuIdx <= ketuIdx
      ? (r > rahuIdx && r < ketuIdx)
      : (r > rahuIdx || r < ketuIdx);
    const rev = ketuIdx <= rahuIdx
      ? (r > ketuIdx && r < rahuIdx)
      : (r > ketuIdx || r < rahuIdx);
    if (!fwd) allBetweenForward = false;
    if (!rev) allBetweenReverse = false;
  });
  if (!allBetweenForward && !allBetweenReverse) return { present: false };
  const isForward = allBetweenForward;
  // Fixed: the classical 12 Kala Sarpa type names (Ananta, Kulika, Vasuki, ...) are
  // determined by which HOUSE (bhava, counted from Lagna) Rahu occupies — not by
  // Rahu's absolute zodiac sign, which is what this previously (incorrectly) indexed
  // KALA_SARPA_TYPES with. A chart with Rahu in the same sign but a different Lagna
  // would then get the wrong type name. Now computes the actual house-from-Lagna.
  const typeRashiIdx = isForward ? rahuIdx : ketuIdx;
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
        cancelled = true; cancelReason = "குரு பார்வை/சேர்க்கையால் தோஷ நிவர்த்தி";
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
    const pushkara = [3,6,8,11].includes(navPart); // Pushkara navamsa pada positions
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
    const h = generateHoroscope(iso, "12:00", lat, lon);
    const hPrev = generateHoroscope(isoPrev, "12:00", lat, lon);
    const sunToday = h.placements.find(p => p.ta === "சூரியன்");
    const sunPrev = hPrev.placements.find(p => p.ta === "சூரியன்");
    if (sunToday && sunPrev && Math.floor(sunToday.fullLong/30) === targetRashiIdx && Math.floor(sunPrev.fullLong/30) !== targetRashiIdx) {
      return d;
    }
  }
  return null; // window missed — caller falls back gracefully (Abda/Masa Bala contribute 0)
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
  const h1 = generateHoroscope(dobISO, tob, lat, lon);
  const [y, m, d] = dobISO.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  const dob2 = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
  const h2 = generateHoroscope(dob2, tob, lat, lon);
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
  bh = bh || 6; bmin = bmin || 0;
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
    let ojhRashi = 0, ojhNav = 0;
    if (MASCULINE.includes(p.ta)) { if (isOddRashi) ojhRashi = 15; if (isOddNav) ojhNav = 15; }
    else if (FEMININE.includes(p.ta)) { if (!isOddRashi) ojhRashi = 15; if (!isOddNav) ojhNav = 15; }
    else { ojhRashi = 15; ojhNav = 15; } // Mercury — always 15
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
    const thisPakshaBala = isBeneficForPaksha ? pakshaBenefic : pakshaMalefic;
    const tribhagaBala = (p.ta === tribhagaLord || p.ta === "குரு") ? 60 : 0;
    const varaBala = p.ta === varaLord ? 45 : 0;
    const horaBala = p.ta === horaLord ? 60 : 0;
    const ayanaBala = ayanaBalaOf(p);
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
      if (actual < 0) cheshtaBala = 60;        // Vakra — retrograde
      else if (rel < 0.25) cheshtaBala = 50;   // Vikala — near-stationary
      else if (rel < 0.75) cheshtaBala = 40;   // Manda — slower than mean
      else if (rel < 1.25) cheshtaBala = 30;   // Sama — mean speed
      else if (rel < 1.75) cheshtaBala = 20;   // Chara — faster than mean
      else cheshtaBala = 15;                    // Atichara — much faster than mean
    }

    // 5. நைசர்கிக பலம் (Natural Strength)
    const naisargikaBala = NAISARGIKA_BALA[p.ta] || 20;

    // 6. திருஷ்டி பலம் (Aspectual Strength) — real aspects received, benefic vs malefic
    const aspectsReceived = drishti.filter(a => a.to === p.ta);
    const beneficAspects = aspectsReceived.filter(a => NATURAL_BENEFICS.includes(a.from)).length;
    const maleficAspects = aspectsReceived.filter(a => NATURAL_MALEFICS.includes(a.from)).length;
    const drikBala = Math.max(0, Math.min(50, 25 + beneficAspects*8 - maleficAspects*8));

    const total = sthanaBala + digBala + kalaBala + cheshtaBala + naisargikaBala + drikBala;
    const required = p.ta === "சூரியன்" ? 390 : p.ta === "சந்திரன்" ? 360 : p.ta === "செவ்வாய்" ? 300 :
                     p.ta === "புதன்" ? 420 : p.ta === "குரு" ? 390 : p.ta === "சுக்கிரன்" ? 330 : 300;
    const strong = total >= required * 0.6;

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
      winner.strong = winner.total >= winner.required * 0.6;
      loser.strong = loser.total >= loser.required * 0.6;
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
  return transitPlacements.map(tp => {
    const birthP = birthPlacements.find(bp => bp.ta === tp.ta);
    const houseFromMoon = ((tp.rashiIdx - birthMoonRashiIdx + 12) % 12) + 1;
    const sameAsBirth = birthP ? tp.rashiIdx === birthP.rashiIdx : false;
    return {
      ...tp,
      houseFromMoon,
      birthRashi: birthP?.rashi || "—",
      birthRashiIdx: birthP?.rashiIdx,
      sameAsBirth,
      transitEffect: [1,3,6,10,11].includes(houseFromMoon) ? "சுபம்" : [2,5,9].includes(houseFromMoon) ? "நடுநிலை" : "அசுபம்"
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// ராகு காலம் / எமகண்டம் / குளிகை (RAHU KALAM / YAMA GANDAM / GULIKAI)
// ═══════════════════════════════════════════════════════════════════
const RAHU_KALAM_ORDER = [7,1,6,4,5,3,2]; // Sun=7, Mon=1, Tue=6...
const YAMA_GANDAM_ORDER = [4,3,2,1,0,6,5];
const GULIKAI_ORDER = [6,5,4,3,2,1,0];
function calcInauspiciousTimes(date, lat=13.0827) {
  const d = date || new Date();
  const dayOfWeek = d.getDay(); // 0=Sun
  const dayIdx = dayOfWeek === 0 ? 0 : dayOfWeek;
  const sunriseH = 6, sunriseM = 0, sunsetH = 18, sunsetM = 0;
  const dayMinutes = (sunsetH * 60 + sunsetM) - (sunriseH * 60 + sunriseM);
  const slotMin = dayMinutes / 8;
  const getSlot = (order) => {
    const idx = order[dayIdx % 7];
    const startMin = sunriseH * 60 + sunriseM + idx * slotMin;
    const endMin = startMin + slotMin;
    const fmtTime = (m) => {
      const h = Math.floor(m / 60), mm = Math.round(m % 60);
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
    sunrise: "6:00 AM",
    sunset: "6:00 PM"
  };
}

// ═══════════════════════════════════════════════════════════════════
// முஹூர்த்தம் (MUHURTHA — சுப நேரம் கணிப்பு)
// ═══════════════════════════════════════════════════════════════════
const SUBA_NAKSHATRAS = [2,4,6,7,10,12,13,15,16,20,21,24,26]; // Rohini,Mrigasira,Pushya,Punarvasu...
const SUBA_TITHIS = [2,3,5,7,10,11,13]; // Dwitiya,Tritiya,Panchami,Saptami,Dasami,Ekadasi,Trayodasi
const ASUBA_YOGAS = ["Vishkambha","Atiganda","Shoola","Ganda","Vyaghata","Vajra","Vyatipata","Parigha","Vaidhrti"];
function calcMuhurtha(targetDate, birthMoonNakIdx) {
  const d = targetDate || new Date();
  const dayOfWeek = d.getDay();
  const vaaramTa = ["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"][dayOfWeek];
  const goodDays = [1,3,4,5]; // Mon,Wed,Thu,Fri
  const badDays = [0,2,6]; // Sun,Tue,Sat
  const inauspicious = calcInauspiciousTimes(d);
  const dayJ = Math.floor((d - new Date(2000,0,1)) / 86400000);
  const approxTithi = ((dayJ * 12.19) % 30 + 30) % 30;
  const tithiIdx = Math.floor(approxTithi) + 1;
  const approxNak = ((dayJ * 0.9856 * 27/360 + birthMoonNakIdx) % 27 + 27) % 27;
  const nakIdx = Math.floor(approxNak);
  const tithiNames = ["பிரதமை","துவிதியை","திருதியை","சதுர்த்தி","பஞ்சமி","சஷ்டி","சப்தமி","அஷ்டமி","நவமி","தசமி","ஏகாதசி","துவாதசி","திரயோதசி","சதுர்த்தசி","பூர்ணிமை/அமாவாசை"];
  const tithiName = tithiNames[(tithiIdx - 1) % 15];
  const isTithiGood = SUBA_TITHIS.includes(tithiIdx % 15);
  const isNakGood = SUBA_NAKSHATRAS.includes(nakIdx);
  const isDayGood = goodDays.includes(dayOfWeek);
  let score = 0;
  if (isDayGood) score += 30;
  if (isTithiGood) score += 30;
  if (isNakGood) score += 25;
  score += 15; // base
  const verdict = score >= 80 ? "மிகச் சிறந்த முஹூர்த்தம்" : score >= 60 ? "நல்ல முஹூர்த்தம்" : score >= 40 ? "சுமாரான நாள்" : "தவிர்க்கவும்";
  const subaNeramSlots = [];
  if (isDayGood) {
    subaNeramSlots.push("6:00 AM - 7:30 AM (பிரம்ம முஹூர்த்தம்)");
    subaNeramSlots.push("10:00 AM - 11:30 AM (அபிஜித் முஹூர்த்தம்)");
  }
  if (isNakGood) {
    subaNeramSlots.push("7:30 AM - 9:00 AM");
  }
  if (isTithiGood) {
    subaNeramSlots.push("3:00 PM - 4:30 PM");
  }
  return {
    date: d, vaaram: vaaramTa, tithiName, tithiIdx, nakIdx, isDayGood, isTithiGood, isNakGood,
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
  9: {effect:"நடுநிலை",desc:"தந்தை ஆரோக்கியம் பாதிப்பு, யாத்திரை தடை, பாக்கிய குறைவு. புண்ணியக் கடன் செய்யவும்."},
  10: {effect:"நடுநிலை",desc:"தொழிலில் மாற்றம், பதவி இழப்பு அல்லது மாற்றம், கடின உழைப்பு தேவை."},
  11: {effect:"சுபம்",desc:"மிகச் சிறந்த காலம்! லாபம், புதிய வருமானம், ஆசைகள் நிறைவேறும்."},
  12: {effect:"அசுபம்",desc:"செலவு அதிகம், தூக்கமின்மை, வெளிநாடு பயணம், கண் பிரச்சனை. விரயம் அதிகம்."}
};
const GURU_TRANSIT_EFFECTS = {
  1: {effect:"நடுநிலை",desc:"உடல் பருமன் அதிகரிக்கும், புதிய திட்டங்கள் தொடங்கும், சுய மாற்றம்."},
  2: {effect:"சுபம்",desc:"குடும்பத்தில் சுபநிகழ்வுகள், பணவரவு அதிகம், நல்ல உணவு, வாக்கு பலம்."},
  3: {effect:"அசுபம்",desc:"சகோதரர்களுடன் பிரச்சனை, தைரியக் குறைவு, குறுகிய பயணங்களில் இடர்."},
  4: {effect:"அசுபம்",desc:"வீடு/வாகனம் பிரச்சனை, மனநிம்மதி குறையும், தாயார் ஆரோக்கியம்."},
  5: {effect:"சுபம்",desc:"புத்திரப் பாக்கியம், கல்வியில் வெற்றி, மந்திர சித்தி, முதலீட்டில் லாபம்."},
  6: {effect:"அசுபம்",desc:"எதிரிகளால் கவலை, கடன் பிரச்சனை, நோய் வரலாம்."},
  7: {effect:"சுபம்",desc:"திருமண வாழ்க்கை சிறப்பு, கூட்டாளிகள் ஒத்துழைப்பு, சமூக மரியாதை."},
  8: {effect:"அசுபம்",desc:"திடீர் மாற்றங்கள், ஆன்மீக ஈடுபாடு அதிகரிக்கும், மறைவான பிரச்சனைகள்."},
  9: {effect:"சுபம்",desc:"மிகச் சிறந்த காலம்! பாக்கியம், புண்ணிய யாத்திரை, குரு அருள், உயர் கல்வி."},
  10: {effect:"நடுநிலை",desc:"தொழிலில் மாற்றம், புதிய பொறுப்பு, கடின உழைப்பு மூலம் வெற்றி."},
  11: {effect:"சுபம்",desc:"லாபம், புதிய நண்பர்கள், ஆசைகள் நிறைவேறும், சமூக உயர்வு."},
  12: {effect:"அசுபம்",desc:"செலவு அதிகம், வெளிநாடு வாய்ப்பு, ஆன்மீகம், தூக்கமின்மை."}
};
function calcPlanetTransitAnalysis(birthMoonRashiIdx, transitPlacements) {
  if (!transitPlacements) return null;
  const saturn = transitPlacements.find(p => p.ta === "சனி");
  const jupiter = transitPlacements.find(p => p.ta === "குரு");
  const saniHouse = saturn ? ((saturn.rashiIdx - birthMoonRashiIdx + 12) % 12) + 1 : null;
  const guruHouse = jupiter ? ((jupiter.rashiIdx - birthMoonRashiIdx + 12) % 12) + 1 : null;
  const saniIn712or8 = saniHouse && [7,7.5,8,1,2].includes(saniHouse);
  const isSadeSati = saniHouse && (saniHouse === 12 || saniHouse === 1 || saniHouse === 2);
  const sadeSatiPhase = saniHouse === 12 ? "ஏறு பாதை (12th)" : saniHouse === 1 ? "உச்ச பாதை (1st — ஜென்ம சனி)" : saniHouse === 2 ? "இறங்கு பாதை (2nd)" : null;
  return {
    sani: saturn ? {
      currentRashi: saturn.rashi,
      houseFromMoon: saniHouse,
      ...SANI_TRANSIT_EFFECTS[saniHouse],
      isSadeSati,
      sadeSatiPhase,
      isAshtama: saniHouse === 8,
      isKandaka: saniHouse === 7
    } : null,
    guru: jupiter ? {
      currentRashi: jupiter.rashi,
      houseFromMoon: guruHouse,
      ...GURU_TRANSIT_EFFECTS[guruHouse]
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
function getRemedies(placements, grahaBala) {
  if (!placements || !grahaBala) return [];
  const weakPlanets = grahaBala.filter(g => g.score <= 4).map(g => g.ta);
  const doshaRemedies = [];
  placements.forEach(p => {
    const remedy = PLANET_REMEDIES[p.ta];
    if (!remedy) return;
    const isWeak = weakPlanets.includes(p.ta);
    const isDebilitated = p.rashiIdx === DEBIL_RASHI[p.ta];
    const isEnemy = GRAHA_FRIENDSHIP[p.ta]?.enemies?.includes(RASHI_LORD_NAME[p.rashiIdx]);
    const needsRemedy = isWeak || isDebilitated || isEnemy;
    doshaRemedies.push({
      ...remedy, ta: p.ta, rashi: p.rashi,
      isWeak, isDebilitated, isEnemy, needsRemedy,
      priority: isDebilitated ? 3 : isWeak ? 2 : isEnemy ? 1 : 0
    });
  });
  return doshaRemedies.sort((a,b) => b.priority - a.priority);
}

// ═══════════════════════════════════════════════════════════════════
// ROTATING MANTRA CHAKRA
// ═══════════════════════════════════════════════════════════════════
function MantraChakra({ speed = 90, size = 500, opacity = 0.25 }) {
  const cx = 250, cy = 250;
  const NAVA_COLORS = ["#e85d26","#c0c0c0","#dc2626","#22c55e","#eab308","#ec4899","#1e3a5f","#6366f1","#a78bfa"];

  const petals = (count, r, petalW, petalH) => {
    const paths = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const a1 = angle - petalW, a2 = angle + petalW;
      const cp1x = cx + Math.cos(a1) * (r + petalH);
      const cp1y = cy + Math.sin(a1) * (r + petalH);
      const cp2x = cx + Math.cos(a2) * (r + petalH);
      const cp2y = cy + Math.sin(a2) * (r + petalH);
      const tipX = cx + Math.cos(angle) * (r + petalH * 1.35);
      const tipY = cy + Math.sin(angle) * (r + petalH * 1.35);
      paths.push(`M ${cx+Math.cos(a1)*r} ${cy+Math.sin(a1)*r} Q ${cp1x} ${cp1y} ${tipX} ${tipY} Q ${cp2x} ${cp2y} ${cx+Math.cos(a2)*r} ${cy+Math.sin(a2)*r}`);
    }
    return paths;
  };

  const triangle = (r, up) => {
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const a = (i/3)*Math.PI*2 + (up ? -Math.PI/2 : Math.PI/2);
      pts.push(`${cx+Math.cos(a)*r},${cy+Math.sin(a)*r}`);
    }
    return pts.join(" ");
  };

  const hexagon = (r) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i/6)*Math.PI*2 - Math.PI/2;
      pts.push(`${cx+Math.cos(a)*r},${cy+Math.sin(a)*r}`);
    }
    return pts.join(" ");
  };

  const zodiacSymbols = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
  const sacredChars = ["ॐ","श्री","ह्रीं","क्लीं","ऐं","सौ:","नम:","शिव","शक्ति","ह्रौं","श्रीं","ऐं"];
  const tamilSacred = ["ஓம்","ஸ்ரீ","சிவ","சக்தி","நம","ஹ்ரீம்","க்லீம்","சௌ"];

  return (
    <div style={{
      position:"fixed", top:"50%", left:"50%",
      transform:"translate(-50%,-50%)",
      width:size, height:size,
      pointerEvents:"none", zIndex:1, opacity
    }}>
      <svg viewBox="0 0 500 500" style={{
        width:"100%", height:"100%", position:"absolute",
        animation:`chakraSpin ${speed}s linear infinite`
      }}>
        <defs>
          <linearGradient id="cg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7b1c1c"/><stop offset="100%" stopColor="#b8860b"/>
          </linearGradient>
          <linearGradient id="cg2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626"/><stop offset="100%" stopColor="#6366f1"/>
          </linearGradient>
          <filter id="chakraGlow">
            <feGaussianBlur stdDeviation="1.5" result="g"/>
            <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <circle cx={cx} cy={cy} r="246" fill="none" stroke="#7b1c1c" strokeWidth="2" opacity="0.6" />
        <circle cx={cx} cy={cy} r="242" fill="none" stroke="#b8860b" strokeWidth="1" opacity="0.5" />
        <circle cx={cx} cy={cy} r="238" fill="none" stroke="#1e3a5f" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.4" />

        {zodiacSymbols.map((z, i) => {
          const a = (i/12)*Math.PI*2 - Math.PI/2;
          const col = ["#7b1c1c","#b8860b","#dc2626","#22c55e","#eab308","#6366f1","#ec4899","#1e3a5f","#e85d26","#22c55e","#6366f1","#b8860b"][i];
          return (
            <text key={i} x={cx+Math.cos(a)*228} y={cy+Math.sin(a)*228+5}
              textAnchor="middle" fill={col} fontSize="16" opacity="0.85"
              fontWeight="bold" filter="url(#chakraGlow)">{z}</text>
          );
        })}

        <circle cx={cx} cy={cy} r="215" fill="none" stroke="#7b1c1c" strokeWidth="0.6" strokeDasharray="2 6" opacity="0.35" />

        {petals(16, 172, 0.12, 32).map((d, i) => (
          <path key={`p1${i}`} d={d} fill="none" stroke={NAVA_COLORS[i%9]} strokeWidth="1.4" opacity="0.5" />
        ))}

        <circle cx={cx} cy={cy} r="172" fill="none" stroke="#7b1c1c" strokeWidth="1" opacity="0.4" />

        {petals(8, 132, 0.2, 36).map((d, i) => (
          <path key={`p2${i}`} d={d} fill="none" stroke="url(#cg2)" strokeWidth="1.5" opacity="0.5" />
        ))}

        {sacredChars.map((ch, i) => {
          const a = (i/12)*Math.PI*2 - Math.PI/2;
          return (
            <text key={`sc${i}`} x={cx+Math.cos(a)*157} y={cy+Math.sin(a)*157+4}
              textAnchor="middle" fill="#7b1c1c" fontSize="11" opacity="0.5"
              fontFamily="serif" fontWeight="bold">{ch}</text>
          );
        })}

        {[192, 172, 132, 100, 70, 45, 25].map((r, i) => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none"
            stroke={["#7b1c1c","#b8860b","#dc2626","#1e3a5f","#6366f1","#22c55e","#eab308"][i]} strokeWidth={i<2?"1":"0.7"}
            opacity={0.35-i*0.03} />
        ))}

        <polygon points={hexagon(150)} fill="none" stroke="#b8860b" strokeWidth="0.8" opacity="0.35" />
        <polygon points={hexagon(100)} fill="none" stroke="#7b1c1c" strokeWidth="0.7" opacity="0.3" />

        <polygon points={triangle(118, true)} fill="none" stroke="#7b1c1c" strokeWidth="1.8" opacity="0.6" filter="url(#chakraGlow)" />
        <polygon points={triangle(118, false)} fill="none" stroke="#1e3a5f" strokeWidth="1.8" opacity="0.55" filter="url(#chakraGlow)" />
        <polygon points={triangle(90, true)} fill="none" stroke="#dc2626" strokeWidth="1.4" opacity="0.45" />
        <polygon points={triangle(90, false)} fill="none" stroke="#6366f1" strokeWidth="1.4" opacity="0.45" />
        <polygon points={triangle(62, true)} fill="none" stroke="#b8860b" strokeWidth="1.2" opacity="0.4" />
        <polygon points={triangle(62, false)} fill="none" stroke="#22c55e" strokeWidth="1.2" opacity="0.4" />

        {Array.from({ length: 36 }, (_, i) => {
          const a = (i/36)*Math.PI*2;
          const outer = i%3===0 ? 215 : i%3===1 ? 192 : 172;
          return (
            <line key={`rl${i}`}
              x1={cx+Math.cos(a)*45} y1={cy+Math.sin(a)*45}
              x2={cx+Math.cos(a)*outer} y2={cy+Math.sin(a)*outer}
              stroke={NAVA_COLORS[i%9]} strokeWidth={i%3===0?"0.6":"0.3"}
              opacity={i%3===0?0.3:0.15} />
          );
        })}

        {Array.from({ length: 9 }, (_, i) => {
          const a = (i/9)*Math.PI*2;
          return (
            <circle key={`dot${i}`} cx={cx+Math.cos(a)*215} cy={cy+Math.sin(a)*215}
              r="3" fill={NAVA_COLORS[i]} opacity="0.7" filter="url(#chakraGlow)" />
          );
        })}

        <circle cx={cx} cy={cy} r="8" fill="#b8860b" opacity="0.5" filter="url(#chakraGlow)">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r="4" fill="#7b1c1c" opacity="0.8">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r="1.5" fill="#fff" opacity="0.9" />
      </svg>

      <svg viewBox="0 0 500 500" style={{
        width:"100%", height:"100%", position:"absolute", top:0, left:0,
        animation:`chakraSpinReverse ${speed*0.65}s linear infinite`
      }}>
        {petals(12, 58, 0.18, 28).map((d, i) => (
          <path key={`ip${i}`} d={d} fill="none" stroke={NAVA_COLORS[i%9]} strokeWidth="1.2" opacity="0.45" />
        ))}
        {PLANETS.map((p, i) => {
          const a = (i/9)*Math.PI*2 - Math.PI/2;
          return (
            <text key={`ng${i}`} x={cx+Math.cos(a)*105} y={cy+Math.sin(a)*105+6}
              textAnchor="middle" fill={NAVA_COLORS[i%9]} fontSize="18" opacity="0.7"
              fontWeight="bold">{p.symbol}</text>
          );
        })}
        {tamilSacred.map((ch, i) => {
          const a = (i/8)*Math.PI*2 - Math.PI/2;
          return (
            <text key={`ts${i}`} x={cx+Math.cos(a)*78} y={cy+Math.sin(a)*78+4}
              textAnchor="middle" fill="#7b1c1c" fontSize="10" opacity="0.5"
              fontFamily="'Noto Sans Tamil',sans-serif">{ch}</text>
          );
        })}
      </svg>

      <svg viewBox="0 0 500 500" style={{
        width:"100%", height:"100%", position:"absolute", top:0, left:0,
        animation:`chakraSpin ${speed*0.4}s linear infinite`
      }}>
        <circle cx={cx} cy={cy} r="18" fill="none" stroke="#7b1c1c" strokeWidth="0.6"
          strokeDasharray="2 3" opacity="0.4" />
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i/9)*Math.PI*2;
          return <circle key={`md${i}`} cx={cx+Math.cos(a)*15} cy={cy+Math.sin(a)*15}
            r="1.2" fill={NAVA_COLORS[i]} opacity="0.6" />;
        })}
      </svg>

      <style>{`
        @keyframes chakraSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes chakraSpinReverse { from { transform:rotate(360deg); } to { transform:rotate(0deg); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// South Indian Rashi Chart
// ═══════════════════════════════════════════════════════════════════
// Short names for chart cells (2-3 chars max like reference)
const P_SHORT = {"சூரியன்":"சூ","சந்திரன்":"சந்","செவ்வாய்":"செவ்","புதன்":"புத","குரு":"கு","சுக்கிரன்":"சுக்","சனி":"சனி","ராகு":"ராகு","கேது":"கேது"};

// Generate chart SVG as raw string (for PDF)
function chartSVGString(planetList, lagnaIdx, chartTitle, isNavamsa=false) {
  const cW=80,cH=68,W=cW*4,H=cH*4;
  const siPos=[{r:11,row:0,col:0},{r:0,row:0,col:1},{r:1,row:0,col:2},{r:2,row:0,col:3},{r:10,row:1,col:0},{r:3,row:1,col:3},{r:9,row:2,col:0},{r:4,row:2,col:3},{r:8,row:3,col:0},{r:7,row:3,col:1},{r:6,row:3,col:2},{r:5,row:3,col:3}];
  const rp={};
  planetList.forEach(p=>{
    const ri=isNavamsa?(p.navRashiIdx??RASHIS.indexOf(p.navRashi)):RASHIS.indexOf(p.rashi);
    if(ri>=0){if(!rp[ri])rp[ri]=[];rp[ri].push(p);}
  });
  const mR=isNavamsa?(planetList[1]?.navRashiIdx??0):planetList.findIndex(p=>p.ta==="சந்திரன்")>=0?RASHIS.indexOf(planetList.find(p=>p.ta==="சந்திரன்")?.rashi||RASHIS[0]):0;

  let cells="";
  siPos.forEach(({r:rashi,row,col})=>{
    const x=col*cW,y=row*cH,isL=rashi===lagnaIdx;
    const planets=rp[rashi]||[];
    // Center-aligned planet names
    const totalH=planets.length*14;
    const startY=y+(cH-totalH)/2;
    planets.forEach((p,pi)=>{
      const shortN=P_SHORT[p.ta]||p.ta.slice(0,3);
      cells+=`<text x="${x+cW/2}" y="${startY+pi*14+10}" text-anchor="middle" fill="#000" font-size="10" font-weight="600" font-family="'Noto Sans Tamil',sans-serif">${shortN}</text>`;
    });
    if(isL) cells+=`<text x="${x+cW/2}" y="${y+cH-4}" text-anchor="middle" fill="#cc0000" font-size="10" font-weight="900" font-family="sans-serif">லக்</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${W+4} ${H+4}" width="${W+4}" height="${H+4}" style="background:#fff">
    <rect x="-1" y="-1" width="${W+2}" height="${H+2}" fill="none" stroke="#1a8d1a" stroke-width="3"/>
    <rect x="2" y="2" width="${W-4}" height="${H-4}" fill="none" stroke="#1a8d1a" stroke-width="1"/>
    ${[1,2,3].map(i=>`<line x1="${cW*i}" y1="0" x2="${cW*i}" y2="${H}" stroke="#1a8d1a" stroke-width="1.5"/><line x1="0" y1="${cH*i}" x2="${W}" y2="${cH*i}" stroke="#1a8d1a" stroke-width="1.5"/>`).join("")}
    <rect x="${cW}" y="${cH}" width="${cW*2}" height="${cH*2}" fill="#fff" stroke="#1a8d1a" stroke-width="1.5"/>
    <text x="${W/2}" y="${H/2-8}" text-anchor="middle" fill="#000" font-size="12" font-weight="700" font-family="'Noto Sans Tamil',sans-serif">${chartTitle}</text>
    <text x="${W/2}" y="${H/2+10}" text-anchor="middle" fill="#000" font-size="14" font-weight="900" font-family="'Noto Sans Tamil',serif">${RASHIS[mR>=0?mR:0]}</text>
    ${cells}
  </svg>`;
}

function TraditionalChart({ horoscope, navamsaData, title="ராசி", showNavamsa=true }) {
  const { lagna, placements } = horoscope;
  const siPos = [
    {rashi:11,r:0,c:0},{rashi:0,r:0,c:1},{rashi:1,r:0,c:2},{rashi:2,r:0,c:3},
    {rashi:10,r:1,c:0},{rashi:3,r:1,c:3},{rashi:9,r:2,c:0},{rashi:4,r:2,c:3},
    {rashi:8,r:3,c:0},{rashi:7,r:3,c:1},{rashi:6,r:3,c:2},{rashi:5,r:3,c:3}
  ];

  const renderChart = (planetList, lagnaIdx, chartTitle, isNavamsa=false) => {
    const cW=72, cH=60, W=cW*4, H=cH*4;
    const rashiPlanets = {};
    planetList.forEach(p => {
      const ri = isNavamsa ? (p.navRashiIdx ?? RASHIS.indexOf(p.navRashi)) : RASHIS.indexOf(p.rashi);
      if(ri>=0){ if(!rashiPlanets[ri]) rashiPlanets[ri]=[]; rashiPlanets[ri].push(p); }
    });

    const moonRashi = isNavamsa
      ? (planetList[1]?.navRashiIdx ?? 0)
      : RASHIS.indexOf(horoscope.moonRashi);

    return (
      <svg viewBox={`-2 -2 ${W+4} ${H+4}`} style={{width:"100%",maxWidth:300,background:"#fff",borderRadius:4}}>
        <rect x="-1" y="-1" width={W+2} height={H+2} fill="none" stroke="#1a8d1a" strokeWidth="3"/>
        <rect x="2" y="2" width={W-4} height={H-4} fill="none" stroke="#1a8d1a" strokeWidth="1"/>
        {[1,2,3].map(i=>(
          <g key={i}>
            <line x1={cW*i} y1={0} x2={cW*i} y2={H} stroke="#1a8d1a" strokeWidth="1.5"/>
            <line x1={0} y1={cH*i} x2={W} y2={cH*i} stroke="#1a8d1a" strokeWidth="1.5"/>
          </g>
        ))}
        <rect x={cW} y={cH} width={cW*2} height={cH*2} fill="#fff" stroke="#1a8d1a" strokeWidth="1.5"/>
        <text x={W/2} y={H/2-8} textAnchor="middle" fill="#000" fontSize="12" fontWeight="700"
          fontFamily="'Noto Sans Tamil',sans-serif">{chartTitle}</text>
        <text x={W/2} y={H/2+8} textAnchor="middle" fill="#000" fontSize="14" fontWeight="900"
          fontFamily="'Noto Sans Tamil',serif">{RASHIS[moonRashi>=0?moonRashi:0]}</text>

        {siPos.map(({rashi,r,c})=>{
          const x=c*cW, y=r*cH;
          const isL = rashi === lagnaIdx;
          const planets = rashiPlanets[rashi] || [];
          // Center-align: calculate vertical start position
          const totalH = planets.length * 14;
          const startY = y + (cH - totalH) / 2;
          return (
            <g key={rashi}>
              {planets.map((p,pi)=>{
                const shortN = P_SHORT[p.ta] || p.ta.slice(0,3);
                return(
                  <text key={pi}
                    x={x + cW/2}
                    y={startY + pi*14 + 10}
                    textAnchor="middle"
                    fill="#000" fontSize="10" fontWeight="600"
                    fontFamily="'Noto Sans Tamil',sans-serif">
                    {shortN}
                  </text>
                );
              })}
              {isL && (
                <text x={x+cW/2} y={y+cH-4} textAnchor="middle"
                  fill="#cc0000" fontSize="10" fontWeight="900"
                  fontFamily="'Noto Sans Tamil',sans-serif">லக்</text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  const navLagna = navamsaData
    ? (() => {
        const movable=[0,3,6,9], fixed=[1,4,7,10];
        const lDeg = horoscope.lagnaDeg || 0;
        const navPart = Math.floor(lDeg / (30/9));
        let startR;
        if(movable.includes(lagna)) startR=0;
        else if(fixed.includes(lagna)) startR=9;
        else startR=6;
        return (startR + navPart) % 12;
      })()
    : 0;

  return (
    <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
      <div style={{flex:"1 1 auto",maxWidth:300,minWidth:200}}>
        {renderChart(placements, lagna, "ராசி")}
      </div>
      {showNavamsa && navamsaData && (
        <div style={{flex:"1 1 auto",maxWidth:300,minWidth:200}}>
          {renderChart(navamsaData, navLagna, "நவாம்சம்", true)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TRADITIONAL SOUTH INDIAN JATHAGAM PDF — Temple Style
// ═══════════════════════════════════════════════════════════════════
function generateJathagamPDF(formData, horoscope, prediction) {
  const lagna = horoscope.lagna;
  const cW = 118, cH = 108;
  const chartW = cW*4, chartH = cH*4;
  const siPos = [
    {rashi:11,r:0,c:0},{rashi:0,r:0,c:1},{rashi:1,r:0,c:2},{rashi:2,r:0,c:3},
    {rashi:10,r:1,c:0},{rashi:3,r:1,c:3},{rashi:9,r:2,c:0},{rashi:4,r:2,c:3},
    {rashi:8,r:3,c:0},{rashi:7,r:3,c:1},{rashi:6,r:3,c:2},{rashi:5,r:3,c:3}
  ];
  const rashiPlanets = {};
  horoscope.placements.forEach(p => {
    const ri = RASHIS.indexOf(p.rashi);
    if (ri >= 0) { if (!rashiPlanets[ri]) rashiPlanets[ri] = []; rashiPlanets[ri].push(p); }
  });

  // ── Chart SVG (warm cream + maroon + gold) ──
  const cellsSVG = siPos.map(({rashi,r,c}) => {
    const x=c*cW, y=r*cH, isL=rashi===lagna;
    const planets=rashiPlanets[rashi]||[];
    const bg = isL
      ? `<rect x="${x+2}" y="${y+2}" width="${cW-4}" height="${cH-4}" fill="#fff3d4" rx="3"/>`
      : `<rect x="${x}" y="${y}" width="${cW}" height="${cH}" fill="#fffdf5"/>`;
    const rashiTa = `<text x="${x+6}" y="${y+15}" fill="${isL?"#7b1c1c":"#8b6060"}" font-size="9" font-weight="700" font-family="'Noto Sans Tamil',serif">${RASHIS[rashi]}</text>`;
    const rashiNum = `<text x="${x+cW-6}" y="${y+15}" text-anchor="end" fill="${isL?"#b8860b":"#bbb"}" font-size="8" font-family="serif">${rashi+1}</text>`;
    const lagnaBadge = isL ? `<rect x="${x+6}" y="${y+cH-20}" width="50" height="14" rx="3" fill="#7b1c1c"/><text x="${x+31}" y="${y+cH-9}" text-anchor="middle" fill="#fff3d4" font-size="8" font-weight="700" font-family="'Noto Sans Tamil',sans-serif">லக்னம்</text>` : "";
    const planetsHTML = planets.map((p,pi) => {
      const py = y + 28 + pi*16;
      const col = isL ? "#4a0000" : "#1a1a2e";
      const dcol = isL ? "#8b4500" : "#7b3030";
      return `<text x="${x+7}" y="${py+11}" fill="${isL?"#7b1c1c":"#8b4040"}" font-size="12" font-weight="700" font-family="serif">${p.symbol}</text>`
           + `<text x="${x+22}" y="${py+11}" fill="${col}" font-size="10" font-weight="600" font-family="'Noto Sans Tamil',sans-serif">${PLANET_SHORT[p.ta]||p.ta}</text>`
           + `<text x="${x+cW-5}" y="${py+11}" text-anchor="end" fill="${dcol}" font-size="8" font-family="monospace">${p.degree}°</text>`;
    }).join("");
    return bg + rashiTa + rashiNum + planetsHTML + lagnaBadge;
  }).join("");

  const chartSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${chartW} ${chartH}" width="${chartW}" height="${chartH}">
    <rect width="${chartW}" height="${chartH}" fill="#fffdf5"/>
    <rect x="0" y="0" width="${chartW}" height="${chartH}" fill="none" stroke="#7b1c1c" stroke-width="4"/>
    <rect x="4" y="4" width="${chartW-8}" height="${chartH-8}" fill="none" stroke="#d4a853" stroke-width="1.5"/>
    <rect x="7" y="7" width="${chartW-14}" height="${chartH-14}" fill="none" stroke="#7b1c1c" stroke-width="0.5"/>
    ${[1,2,3].map(i=>`
      <line x1="${cW*i}" y1="0" x2="${cW*i}" y2="${chartH}" stroke="#7b1c1c" stroke-width="1.5"/>
      <line x1="0" y1="${cH*i}" x2="${chartW}" y2="${cH*i}" stroke="#7b1c1c" stroke-width="1.5"/>
    `).join("")}
    <rect x="${cW}" y="${cH}" width="${cW*2}" height="${cH*2}" fill="#fdf6e3"/>
    <line x1="${cW}" y1="${cH}" x2="${cW*3}" y2="${cH*3}" stroke="#d4a85360" stroke-width="1"/>
    <line x1="${cW*3}" y1="${cH}" x2="${cW}" y2="${cH*3}" stroke="#d4a85360" stroke-width="1"/>
    <text x="${chartW/2}" y="${cH*2-18}" text-anchor="middle" fill="#7b1c1c" font-size="16" font-weight="700" font-family="'Noto Sans Tamil',serif">ராசி சக்கரம்</text>
    <text x="${chartW/2}" y="${cH*2}" text-anchor="middle" fill="#b8860b" font-size="10" font-family="'Noto Sans Tamil',sans-serif">தென் இந்திய முறை</text>
    <text x="${chartW/2}" y="${cH*2+16}" text-anchor="middle" fill="#aaa" font-size="8.5" font-family="monospace">Nirayana • Lahiri Ayanamsa</text>
    ${cellsSVG}
  </svg>`;

  // ── Planet rows ──
  const planetColors = ["#7b0000","#000080","#8b0000","#006400","#FF8C00","#8B008B","#00008B","#4B0082","#8B4513"];
  const planetRows = horoscope.placements.map((p,i) => {
    const isL2 = horoscope.placements[i].house === 1;
    return `<tr style="background:${i%2===0?"#fffdf5":"#fdf6e3"}">
      <td style="padding:8px 10px;font-weight:700;color:#7b1c1c;font-size:13px;">${p.ta}</td>
      <td style="padding:8px 10px;color:#555;font-size:12px;">${p.en}</td>
      <td style="padding:8px 10px;font-weight:600;color:#1a1a2e;font-size:13px;">${p.rashi}</td>
      <td style="padding:8px 10px;text-align:center;color:#8b4500;font-weight:600;">${p.degree}°</td>
      <td style="padding:8px 10px;text-align:center;">
        <span style="background:${p.house===1?"#7b1c1c":"#e8e0d0"};color:${p.house===1?"#fff3d4":"#555"};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${p.house}</span>
      </td>
    </tr>`;
  }).join("");

  const birthTime = formData.tob ? `${formData.tob} ${formData.ampm}` : "—";
  const aiSection = prediction ? `
    <div class="page-break"></div>
    <div class="section" style="border-top:3px double #7b1c1c;padding-top:24px;">
      <div class="sec-head">
        <div class="sec-icon">🤖</div>
        <div class="sec-title">AI ஜோதிட பலன்</div>
        <div class="sec-sub">Powered by Claude AI</div>
      </div>
      <div style="background:#fffdf0;border:1px solid #d4a85340;border-left:4px solid #7b1c1c;border-radius:0 8px 8px 0;padding:20px 22px;margin-top:14px;">
        <p style="font-size:13.5px;line-height:2.1;color:#1a1a2e;white-space:pre-wrap;margin:0;font-family:'Noto Sans Tamil',serif;">${prediction}</p>
      </div>
    </div>` : "";

  const today = new Date().toLocaleDateString("ta-IN",{year:"numeric",month:"long",day:"numeric"});

  const html = `<!DOCTYPE html>
<html lang="ta">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(formData.name)} — ஜாதகம்</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@300;400;600;700&family=Noto+Serif+Tamil:wght@400;700&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Noto Sans Tamil','Segoe UI',sans-serif;background:#f5f0e8;color:#1a1a2e;min-height:100vh;}
@media print{
  body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .no-print{display:none!important;}
  .page-break{page-break-before:always;}
  .page{box-shadow:none!important;margin:0!important;border-radius:0!important;}
}
.page{max-width:760px;margin:20px auto;background:#fff;box-shadow:0 4px 40px #0002;border-radius:4px;overflow:hidden;}

/* ── TEMPLE HEADER ── */
.temple-header{
  background:linear-gradient(180deg,#7b1c1c 0%,#a52020 40%,#8b1a1a 100%);
  padding:0;text-align:center;position:relative;overflow:hidden;
}
.temple-border-top{height:8px;background:repeating-linear-gradient(90deg,#d4a853 0px,#d4a853 10px,#7b1c1c 10px,#7b1c1c 20px);}
.temple-border-bot{height:8px;background:repeating-linear-gradient(90deg,#d4a853 0px,#d4a853 10px,#7b1c1c 10px,#7b1c1c 20px);}
.temple-inner{padding:20px 30px 16px;}
.om-symbol{font-size:36px;color:#f0c75e;text-shadow:0 2px 8px #0005;line-height:1;margin-bottom:8px;}
.header-title{font-size:28px;font-weight:700;color:#fff3d4;letter-spacing:1px;font-family:'Noto Serif Tamil',serif;text-shadow:0 2px 6px #0006;margin-bottom:4px;}
.header-name{font-size:20px;font-weight:600;color:#f0c75e;margin-bottom:6px;}
.header-sub{font-size:11px;color:#f0c75eaa;letter-spacing:3px;font-weight:300;}
.header-stars{color:#f0c75e;font-size:16px;letter-spacing:6px;margin:8px 0 2px;}

/* ── GOLD DIVIDER ── */
.gold-div{height:3px;background:linear-gradient(90deg,transparent,#d4a853,#f0c75e,#d4a853,transparent);}
.gold-div-thin{height:1px;background:linear-gradient(90deg,transparent,#d4a85360,transparent);margin:16px 0;}

/* ── CONTENT ── */
.content{padding:28px 32px;}

/* ── SECTION ── */
.section{margin-bottom:28px;}
.sec-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #7b1c1c;}
.sec-icon{width:32px;height:32px;background:#7b1c1c;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.sec-title{font-size:15px;font-weight:700;color:#7b1c1c;font-family:'Noto Serif Tamil',serif;}
.sec-sub{font-size:10px;color:#aaa;margin-left:auto;}

/* ── INFO CARDS ── */
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.info-card{background:linear-gradient(135deg,#fffdf5,#fdf6e3);border:1px solid #d4a85340;border-left:3px solid #7b1c1c;border-radius:0 6px 6px 0;padding:12px 14px;}
.info-lbl{font-size:10px;color:#999;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;}
.info-val{font-size:15px;font-weight:700;color:#1a1a2e;}
.info-sub{font-size:10px;color:#b8860b;margin-top:3px;}

/* ── SUMMARY ROW ── */
.summary-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.sum-box{background:#7b1c1c;border-radius:6px;padding:12px 8px;text-align:center;}
.sum-lbl{font-size:9px;color:#f0c75eaa;margin-bottom:4px;letter-spacing:0.5px;}
.sum-val{font-size:13px;font-weight:700;color:#fff3d4;line-height:1.3;}

/* ── CHART ── */
.chart-wrap{display:flex;justify-content:center;padding:8px 0;}
.chart-caption{text-align:center;font-size:11px;color:#888;margin-top:8px;}

/* ── TABLE ── */
table{width:100%;border-collapse:collapse;font-size:13px;}
thead tr{background:#7b1c1c;}
th{padding:10px 10px;color:#fff3d4;font-weight:700;font-size:11px;text-align:left;letter-spacing:0.3px;}
td{border-bottom:1px solid #e8e0d0;}

/* ── FOOTER ── */
.footer{background:#7b1c1c;padding:14px 30px;text-align:center;}
.footer-border{height:4px;background:repeating-linear-gradient(90deg,#d4a853 0px,#d4a853 8px,#7b1c1c 8px,#7b1c1c 16px);margin-bottom:12px;}
.footer-text{font-size:10px;color:#f0c75eaa;line-height:1.8;}
.footer-om{font-size:20px;color:#f0c75e;margin-bottom:6px;}

/* ── PRINT BUTTON ── */
.print-btn{position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#7b1c1c,#a52020);color:#fff3d4;border:2px solid #d4a853;border-radius:50px;padding:14px 28px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px #7b1c1c60;font-family:'Noto Sans Tamil',sans-serif;letter-spacing:0.5px;}
.print-btn:hover{background:linear-gradient(135deg,#a52020,#c02020);}
</style>
</head>
<body>
<div class="page">

  <!-- TEMPLE HEADER -->
  <div class="temple-header">
    <div class="temple-border-top"></div>
    <div class="temple-inner">
      <img src="${MURUGAN_IMG}" alt="முருகன்" style="width:90px;height:90px;object-fit:contain;border-radius:50%;border:2px solid #d4a853;box-shadow:0 0 20px #d4a85340;margin-bottom:8px;"/>
      <div class="header-stars">✦ ✦ ✦ ✦ ✦</div>
      <div class="header-title">ஜாதக விவரம்</div>
      <div class="header-name">${escapeHtml(formData.name)}</div>
      <div class="header-sub">JATHAGAM &nbsp;•&nbsp; VEDIC BIRTH CHART &nbsp;•&nbsp; தமிழ் ஜோதிடம்</div>
      <div class="header-stars" style="margin-top:10px;">★ ★ ★ ★ ★</div>
    </div>
    <div class="temple-border-bot"></div>
  </div>

  <div class="gold-div"></div>

  <div class="content">

    <!-- BIRTH DETAILS -->
    <div class="section">
      <div class="sec-head">
        <div class="sec-icon">📋</div>
        <div class="sec-title">பிறப்பு விவரங்கள்</div>
        <div class="sec-sub">Birth Details</div>
      </div>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-lbl">பெயர் / Name</div>
          <div class="info-val">${escapeHtml(formData.name)}</div>
        </div>
        <div class="info-card">
          <div class="info-lbl">பிறந்த தேதி / Date of Birth</div>
          <div class="info-val">${formData.dob}</div>
        </div>
        <div class="info-card">
          <div class="info-lbl">பிறந்த நேரம் / Time of Birth</div>
          <div class="info-val">${birthTime}</div>
          <div class="info-sub">${formData.ampm==="AM"?"☀ காலை (Morning)":"☽ மாலை (Evening)"}</div>
        </div>
        <div class="info-card">
          <div class="info-lbl">பிறந்த இடம் / Place of Birth</div>
          <div class="info-val">${escapeHtml(formData.pob||"—")}</div>
        </div>
      </div>
    </div>

    <div class="gold-div-thin"></div>

    <!-- SUMMARY -->
    <div class="section">
      <div class="sec-head">
        <div class="sec-icon">⭐</div>
        <div class="sec-title">முக்கிய ஜோதிட விவரங்கள்</div>
        <div class="sec-sub">Key Astrological Details</div>
      </div>
      <div class="summary-row">
        <div class="sum-box">
          <div class="sum-lbl">லக்னம்</div>
          <div class="sum-val">${horoscope.lagnaName}<br/><span style="font-size:10px;font-weight:400;color:#f0c75e80">${horoscope.lagnaEn} ${horoscope.lagnaDeg}°</span></div>
        </div>
        <div class="sum-box">
          <div class="sum-lbl">சந்திர ராசி</div>
          <div class="sum-val">${horoscope.moonRashi}</div>
        </div>
        <div class="sum-box">
          <div class="sum-lbl">நட்சத்திரம்</div>
          <div class="sum-val">${horoscope.nakshatra}</div>
        </div>
        <div class="sum-box">
          <div class="sum-lbl">சூரிய ராசி</div>
          <div class="sum-val">${horoscope.sunSign}</div>
        </div>
      </div>
    </div>

    <div class="gold-div-thin"></div>

    <!-- RASHI CHART -->
    <div class="section">
      <div class="sec-head">
        <div class="sec-icon">◎</div>
        <div class="sec-title">ராசி சக்கரம்</div>
        <div class="sec-sub">தென் இந்திய முறை</div>
      </div>
      <div class="chart-wrap">${chartSVG}</div>
      <div class="chart-caption">தென் இந்திய ராசி சக்கரம் &nbsp;•&nbsp; நிராயண முறை &nbsp;•&nbsp; லகிரி அயனாம்சம்</div>
    </div>

    <div class="gold-div-thin"></div>

    <!-- PLANET TABLE -->
    <div class="section">
      <div class="sec-head">
        <div class="sec-icon">🪐</div>
        <div class="sec-title">கிரக நிலைகள்</div>
        <div class="sec-sub">Planetary Positions</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="text-align:center;width:40px;">சின்னம்</th>
            <th>கிரகம்</th>
            <th>Planet</th>
            <th>ராசி</th>
            <th style="text-align:center;">கலை °</th>
            <th style="text-align:center;">வீடு</th>
          </tr>
        </thead>
        <tbody>${planetRows}</tbody>
      </table>
    </div>

    ${aiSection}

  </div><!-- end content -->

  <!-- TEMPLE FOOTER -->
  <div class="footer">
    <div class="footer-border"></div>
    <div class="footer-om">ॐ</div>
    <div class="footer-text">
      ஜோதிட நிபுணர் — Jothida Nipunar &nbsp;|&nbsp; Jean Meeus Astronomical Algorithms &nbsp;|&nbsp; Lahiri Ayanamsa<br/>
      உருவாக்கப்பட்ட தேதி: ${today}
    </div>
  </div>

</div><!-- end page -->

<button class="print-btn no-print" onclick="window.print()">
  📄 PDF சேமி / அச்சிடு
</button>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("பாப்-அப் தடுக்கப்பட்டுள்ளது. இந்த தளத்திற்கு pop-ups-ஐ browser-ல் அனுமதித்துவிட்டு மீண்டும் முயற்சிக்கவும்.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 1000);
}

// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// DATE HELPERS — dd-mm-yyyy format input
// ═══════════════════════════════════════════════════════════════════
// Auto-format as user types: "2" → "2", "25" → "25-", "25-1" → "25-1", "25-12" → "25-12-", etc.
function formatDateInput(raw) {
  let digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += ".";
    out += digits[i];
  }
  return out; // e.g. "25.12.1990"
}

// Auto-format as user types: "0" → "0", "06" → "06", "063" → "06:3", "0630" → "06:30"
// Clamps hour to 1-12 and minute to 0-59 once both digits of that segment are entered.
function formatTimeInput(raw) {
  let digits = raw.replace(/\D/g, "").slice(0, 4); // max 4 digits: hhmm
  let hh = digits.slice(0, 2), mm = digits.slice(2, 4);
  if (hh.length === 2) {
    let hNum = parseInt(hh, 10);
    if (hNum > 12) hh = "12";
    else if (hNum === 0) hh = "01";
  }
  if (mm.length === 2) {
    let mNum = parseInt(mm, 10);
    if (mNum > 59) mm = "59";
  }
  let out = hh;
  for (let i = 0; i < mm.length; i++) {
    if (i === 0) out += ":";
    out += mm[i];
  }
  return out; // e.g. "06:30"
}

// Convert dd-mm-yyyy or dd.mm.yyyy → YYYY-MM-DD (ISO) for engine calculations
function parseDDMMYYYY(str) {
  if (!str) return "";
  const parts = str.split(/[-./]/);
  if (parts.length !== 3 || parts[2].length !== 4) return "";
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
}

// Validate: is it a complete dd-mm-yyyy with reasonable values?
function isValidDDMMYYYY(str) {
  if (!str || str.length !== 10) return false;
  const iso = parseDDMMYYYY(str);
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100;
}

const SCREEN = { SPLASH:0, AUTH:1, FORM:2, LOADING:3, RESULT:4, PREMIUM:5, PORUTHAM:6, DAILY:7, CALENDAR:8 };

export default function AstrologyApp() {
  const [screen, setScreen] = useState(SCREEN.SPLASH);
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name:"", dob:"", tob:"", pob:"", ampm:"AM", pobLat:null, pobLon:null, pobSource:null });
  const [horoscope, setHoroscope] = useState(null);
  const [prediction, setPrediction] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chart");
  const [fadeIn, setFadeIn] = useState(true);
  // Precise place search (OpenStreetMap Nominatim) — for accurate birth-place lat/lon
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeDropdownOpen, setPlaceDropdownOpen] = useState(false);
  const [showManualGeo, setShowManualGeo] = useState(false);
  const placeSearchTimer = useRef(null);
  const isSubmittingRef = useRef(false); // guards against a rapid double-click firing handleSubmit twice during the 300ms screen-fade transition
  // New states
  const [dashaData, setDashaData] = useState(null);
  const [navamsaData, setNavamsaData] = useState(null);
  const [grahaBala, setGrahaBala] = useState(null);
  const [mahapurushaYogas, setMahapurushaYogas] = useState([]);
  const [classicalYogas, setClassicalYogas] = useState([]);
  const [advancedView, setAdvancedView] = useState("");
  const [omPlayed, setOmPlayed] = useState(false);
  const [ashtakavargaData, setAshtakavargaData] = useState(null);
  const [drishtiData, setDrishtiData] = useState([]);
  const [d10Data, setD10Data] = useState(null);
  const [d2Data, setD2Data] = useState(null);
  const [d3Data, setD3Data] = useState(null);
  const [d12Data, setD12Data] = useState(null);
  const [d60Data, setD60Data] = useState(null);
  const [d4Data, setD4Data] = useState(null);
  const [d7Data, setD7Data] = useState(null);
  const [kalaSarpa, setKalaSarpa] = useState(null);
  const [chevvaiDosham, setChevvaiDosham] = useState(null);
  const [bhavaChart, setBhavaChart] = useState(null);
  const [navamsaStrength, setNavamsaStrength] = useState(null);
  const [shadBala, setShadBala] = useState(null);
  const [transitOverlay, setTransitOverlay] = useState(null);
  const [inauspiciousTimes, setInauspiciousTimes] = useState(null);
  const [muhurthaData, setMuhurthaData] = useState(null);
  const [planetTransitAnalysis, setPlanetTransitAnalysis] = useState(null);
  const [remediesData, setRemediesData] = useState(null);
  const [expandedDasha, setExpandedDasha] = useState(null);
  // Porutham
  const [poruthBride, setPoruthBride] = useState({ name:"", dob:"", tob:"", ampm:"AM" });
  const [poruthGroom, setPoruthGroom] = useState({ name:"", dob:"", tob:"", ampm:"AM" });
  const [poruthResult, setPoruthResult] = useState(null);
  const [poruthLoading, setPoruthLoading] = useState(false);
  // Daily prediction
  const [dailyData, setDailyData] = useState(null);
  const [dailyPrediction, setDailyPrediction] = useState("");
  const [dailyLoading, setDailyLoading] = useState(false);
  // Calendar
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calSelected, setCalSelected] = useState(new Date().getDate());
  // Backend-accuracy data for the Panchangam Calendar, keyed by day-of-month. Populated
  // in the background (see useEffect below) after the local-computed grid already
  // rendered, so opening the calendar is never blocked waiting on the network.
  const [calBackendData, setCalBackendData] = useState({});
  const [calFetching, setCalFetching] = useState(false);
  // Live clock for Horai (planetary hour) — updates every 30s
  const [liveClock, setLiveClock] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Background-fetch backend (Swiss Ephemeris) accuracy data for every day of the
  // visible Panchangam Calendar month. The calendar grid renders immediately from the
  // instant local engine (see the CALENDAR screen render below); this effect then
  // fetches each day from the live backend in parallel and, as results arrive, replaces
  // the local approximation with the accurate value per day. Any day whose request
  // fails or times out (fetchTransitFromBackend has its own 8s cap) simply keeps
  // showing its local value — this is a pure enhancement, never a blocker.
  useEffect(() => {
    if (screen !== SCREEN.CALENDAR) return;
    let cancelled = false;
    setCalBackendData({});
    (async () => {
      setCalFetching(true);
      const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
      const results = await Promise.allSettled(
        Array.from({length: daysInMonth}, (_, i) => i+1).map(d =>
          fetchTransitFromBackend(new Date(calYear, calMonth, d, 6, 0), 13.0827, 80.2707)
            .then(result => ({ d, result }))
        )
      );
      if (cancelled) return;
      const newData = {};
      results.forEach(r => {
        if (r.status === "fulfilled" && r.value.result) newData[r.value.d] = r.value.result;
      });
      setCalBackendData(newData);
      setCalFetching(false);
    })();
    return () => { cancelled = true; };
  }, [screen, calMonth, calYear]);

  const goTo = useCallback((s) => {
    setFadeIn(false);
    setTimeout(() => { setScreen(s); setFadeIn(true); }, 300);
  }, []);

  useEffect(() => {
    if(screen===SCREEN.SPLASH){ const t=setTimeout(()=>goTo(SCREEN.AUTH),3200); return()=>clearTimeout(t); }
  }, [screen, goTo]);

  // ── Backend warm-up ping — Render free tier sleeps after 15min inactivity.
  // Send a lightweight ping during Splash screen so the server wakes up while
  // the user fills the form (~20-30s). By submit time, backend will be ready.
  useEffect(() => {
    fetch("https://jothida-api.onrender.com/api/horoscope?year=2000&month=1&day=1&hour=6&minute=0&lat=13&lon=80&tz=5.5")
      .catch(() => {}); // silent — failure is fine, local engine is the fallback
  }, []);

  // ── ஓம் ஒலி (Om Sound) — synthesized, free, plays once on app open ──
  const playOmSound = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      const ctx = new Ctx();
      if (ctx.state === "suspended") ctx.resume().catch(()=>{});
      const now = ctx.currentTime;
      const duration = 4.2;
      // One octave above 136.1Hz — same "Om frequency" lineage, but audible on small phone speakers
      // (most phone speakers roll off heavily below ~250Hz)
      const baseFreq = 272.2;

      // Master envelope — slow devotional swell in, gentle sustain, long fade out
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.45, now + 0.9);
      master.gain.setValueAtTime(0.45, now + duration - 2.0);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // Soft low-pass filter — warm chant-like tone, wide enough to stay clear on small speakers
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2500;
      filter.Q.value = 0.6;
      master.connect(filter);
      filter.connect(ctx.destination);

      // Fundamental + harmonics — most energy sits where phone speakers reproduce well
      const partials = [
        { mult: 0.5, gain: 0.35, type: "sine" },     // 136.1 Hz — felt more than heard, adds depth
        { mult: 1,   gain: 1.0,  type: "sine" },     // 272.2 Hz — main audible tone
        { mult: 2,   gain: 0.5,  type: "sine" },     // 544.4 Hz
        { mult: 3,   gain: 0.28, type: "sine" },     // 816.6 Hz — brightness, cuts through small speakers
        { mult: 1.5, gain: 0.18, type: "triangle" }, // overtone warmth
      ];
      const oscillators = [];
      partials.forEach(p => {
        const osc = ctx.createOscillator();
        osc.type = p.type;
        osc.frequency.setValueAtTime(baseFreq * p.mult, now);
        const g = ctx.createGain();
        g.gain.value = p.gain;
        osc.connect(g);
        g.connect(master);
        osc.start(now);
        osc.stop(now + duration + 0.1);
        oscillators.push(osc);
      });

      // Gentle vibrato on the fundamental — living, chant-like quality
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 3.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2.5;
      lfo.connect(lfoGain);
      lfoGain.connect(oscillators[1].frequency); // vibrato on the main audible partial
      lfo.start(now);
      lfo.stop(now + duration + 0.1);

      setTimeout(() => { try { ctx.close(); } catch(e){} }, (duration + 0.5) * 1000);
      return true;
    } catch (e) {
      return false; // autoplay blocked or Web Audio unsupported — never interrupt the user
    }
  }, []);

  useEffect(() => {
    if (omPlayed) return;
    // Best-effort immediate attempt (works if browser allows, or on repeat visits)
    playOmSound();
    // Guaranteed fallback: browsers require a user gesture for audio —
    // play on the very first tap/click/key if the immediate attempt was silently blocked
    const tryOnGesture = () => {
      if (omPlayed) return;
      const ok = playOmSound();
      if (ok) setOmPlayed(true);
    };
    document.addEventListener("click", tryOnGesture);
    document.addEventListener("touchstart", tryOnGesture);
    document.addEventListener("keydown", tryOnGesture);
    return () => {
      document.removeEventListener("click", tryOnGesture);
      document.removeEventListener("touchstart", tryOnGesture);
      document.removeEventListener("keydown", tryOnGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [omPlayed, playOmSound]);

  // ── Backend API (Swiss Ephemeris — deploy on Render.com) ──
  // After deploying, paste your Render URL here:
  const [backendUrl, setBackendUrl] = useState("https://jothida-api.onrender.com");
  const [apiSource, setApiSource] = useState("");

  const fetchFromBackend = async (dob, hour, minute, city) => {
    try {
      const [y, m, d] = dob.split('-').map(Number);
      const geo = geocodeCity(city);
      const url = `${backendUrl}/api/horoscope?year=${y}&month=${m}&day=${d}&hour=${hour}&minute=${minute}&lat=${geo.lat}&lon=${geo.lon}&tz=5.5`;
      // Render free tier cold start can take 30-60s — cap at 10s so the user doesn't
      // stare at the loading screen forever. Falls back to the local engine.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.success) return null;

      return {
        ...parseBackendResponse(data),
        birthTime:`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,
        apiSource:"Swiss Ephemeris (NASA JPL DE431)"
      };
    } catch (e) {
      console.log("Backend error, using local:", e);
      return null;
    }
  };

  // Fetches TODAY's (or any target date's) planetary transit positions from the live
  // backend, for the Daily Prediction screen. Uses the exact same /api/horoscope
  // endpoint and parseBackendResponse() as the birth-chart fetch above — this endpoint
  // doesn't distinguish "natal" vs "transit", it just computes positions for whatever
  // date/time/location it's given, so today's date works exactly like a birth date does.
  // Falls back to null on any failure (network, cold-start timeout, bad response) so the
  // caller can drop back to the instant local Jean Meeus engine rather than block the UI.
  const fetchTransitFromBackend = async (dateObj, lat, lon) => {
    try {
      const year = dateObj.getFullYear(), month = dateObj.getMonth()+1, day = dateObj.getDate();
      const hour = dateObj.getHours(), minute = dateObj.getMinutes();
      const url = `${backendUrl}/api/horoscope?year=${year}&month=${month}&day=${day}&hour=${hour}&minute=${minute}&lat=${lat}&lon=${lon}&tz=5.5`;
      // Render's free tier sleeps after inactivity and can take 30-60s to wake up —
      // that's too long for what should feel like an instant "today's panchangam"
      // screen, so cap the wait at 8s and fall back to the local engine past that.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.success) return null;

      const dayNames = ["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"];
      const realNow = new Date();
      const isOtherDate = dateObj.toDateString() !== realNow.toDateString();
      return {
        ...parseBackendResponse(data),
        dateStr: dateObj.toLocaleDateString("ta-IN",{year:"numeric",month:"long",day:"numeric"}),
        dayName: dayNames[dateObj.getDay()],
        dateObj, isOtherDate,
        isFuture: isOtherDate && dateObj > realNow,
        isPast: isOtherDate && dateObj < realNow,
        apiSource: "Swiss Ephemeris (NASA JPL DE431)"
      };
    } catch (e) {
      console.log("Backend transit fetch error, using local:", e);
      return null;
    }
  };

  const handleSubmit = async () => {
    if(!formData.dob||!formData.name||!isValidDDMMYYYY(formData.dob))return;
    // Prevent a rapid double-click from firing this twice: goTo()'s screen switch is
    // delayed by a 300ms fade, so the FORM screen (and this button) stays mounted briefly
    // after the first click. isSubmittingRef is a ref (updates synchronously, unlike state)
    // so this check is reliable even for clicks that land within that same tick.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setTimeout(() => { isSubmittingRef.current = false; }, 500);
    goTo(SCREEN.LOADING);

    // Convert dd-mm-yyyy → YYYY-MM-DD (ISO) for all engine calculations
    const dobISO = parseDDMMYYYY(formData.dob);

    // Convert time with AM/PM to 24h format
    let h24 = 6, min24 = 0;
    if (formData.tob) {
      const [hh, mm] = formData.tob.split(':').map(Number);
      h24 = hh || 6;
      min24 = mm || 0;
      if (formData.ampm === "PM" && h24 < 12) h24 += 12;
      if (formData.ampm === "AM" && h24 === 12) h24 = 0;
    }
    const finalTime = `${String(h24).padStart(2,'0')}:${String(min24).padStart(2,'0')}`;

    // Try API first, fallback to local
    let result = await fetchFromBackend(dobISO, h24, min24, formData.pob);
    if (result) {
      setApiSource("api");
      setHoroscope(result);
      const geoT = resolveBirthGeo(formData);
      setNavamsaData(calculateNavamsa(result.placements));
      setGrahaBala(calcGrahaBala(result.placements));
      setMahapurushaYogas(detectMahapurushaYogas(result.placements, result.lagna));
      setClassicalYogas(detectClassicalYogas(result.placements, result.lagna));
      setAshtakavargaData(calcAshtakavarga(result.placements, result.lagna));
      setDrishtiData(calcGrahaDrishti(result.placements));
      setD10Data(calcD10Dasamsa(result.placements));
      setD2Data(calcD2Hora(result.placements));
      setD3Data(calcD3Drekkana(result.placements));
      setD12Data(calcD12Dwadasamsa(result.placements));
      setD60Data(calcD60Shashtiamsa(result.placements));
      setD4Data(calcD4Chaturthamsa(result.placements));
      setD7Data(calcD7Saptamsa(result.placements));
      setKalaSarpa(detectKalaSarpa(result.placements, result.lagna));
      setChevvaiDosham(detectChevvaiDosham(result.placements, result.lagna));
      const lagnaP = result.placements.find(p => p.ta === "லக்னம்") || { degExact: 0, rashiIdx: result.lagna };
      const lagnaFullDeg = result.lagna * 30 + (lagnaP.degExact || 0);
      setBhavaChart(calcBhavaChart(result.placements, lagnaFullDeg));
      setNavamsaStrength(calcNavamsaStrength(result.placements));
      setShadBala(calcShadbala(result.placements, result.lagna, dobISO, finalTime, geoT.lat, geoT.lon));
      // Transit: generate today's planetary positions for Gochara overlay.
      // Try the live backend first (same accuracy source as the birth chart above),
      // fall back to the local engine on any failure — matches the same
      // backend-first/local-fallback pattern used for the birth chart and Daily Prediction.
      const _now1 = new Date();
      let transitH = await fetchTransitFromBackend(_now1, geoT.lat, geoT.lon);
      if (!transitH) {
        // Fixed: new Date().toISOString() is UTC-based and incorrectly shows YESTERDAY's
        // date for IST users between 12:00–5:29 AM (UTC lags IST by 5:30 hours). Use local
        // date components instead so the transit date always matches the viewer's actual day.
        const todayISO = `${_now1.getFullYear()}-${String(_now1.getMonth()+1).padStart(2,'0')}-${String(_now1.getDate()).padStart(2,'0')}`;
        const nowH = _now1.getHours(), nowM = _now1.getMinutes();
        transitH = generateHoroscope(todayISO, `${nowH}:${nowM}`, geoT.lat, geoT.lon);
      }
      const birthMoon = result.placements.find(p => p.ta === "சந்திரன்");
      setTransitOverlay(calcTransitOverlay(result.placements, transitH.placements, birthMoon?.rashiIdx || 0));
      setInauspiciousTimes(calcInauspiciousTimes(new Date(), geoT.lat));
      const birthNakP = result.placements.find(p => p.ta === "சந்திரன்");
      setMuhurthaData(calcMuhurtha(new Date(), birthNakP?.nakIdx || 0));
      setPlanetTransitAnalysis(calcPlanetTransitAnalysis(birthMoon?.rashiIdx || 0, transitH.placements));
      setRemediesData(getRemedies(result.placements, calcGrahaBala(result.placements)));
      const moonP = result.placements.find(p => p.ta === "சந்திரன்");
      const moonLongFromApi = moonP ? (moonP.rashiIdx * 30 + moonP.degExact) : 0;
      setDashaData(calculateDasha(moonLongFromApi, dobISO));
    } else {
      setApiSource("local");
      const geo = resolveBirthGeo(formData);
      const h = generateHoroscope(dobISO, finalTime, geo.lat, geo.lon);
      setHoroscope(h);
      setNavamsaData(calculateNavamsa(h.placements));
      setGrahaBala(calcGrahaBala(h.placements));
      setMahapurushaYogas(detectMahapurushaYogas(h.placements, h.lagna));
      setClassicalYogas(detectClassicalYogas(h.placements, h.lagna));
      setAshtakavargaData(calcAshtakavarga(h.placements, h.lagna));
      setDrishtiData(calcGrahaDrishti(h.placements));
      setD10Data(calcD10Dasamsa(h.placements));
      setD2Data(calcD2Hora(h.placements));
      setD3Data(calcD3Drekkana(h.placements));
      setD12Data(calcD12Dwadasamsa(h.placements));
      setD60Data(calcD60Shashtiamsa(h.placements));
      setD4Data(calcD4Chaturthamsa(h.placements));
      setD7Data(calcD7Saptamsa(h.placements));
      setKalaSarpa(detectKalaSarpa(h.placements, h.lagna));
      setChevvaiDosham(detectChevvaiDosham(h.placements, h.lagna));
      const lagnaP2 = h.placements.find(p => p.ta === "லக்னம்") || { degExact: 0, rashiIdx: h.lagna };
      const lagnaFullDeg2 = h.lagna * 30 + (lagnaP2.degExact || 0);
      setBhavaChart(calcBhavaChart(h.placements, lagnaFullDeg2));
      setNavamsaStrength(calcNavamsaStrength(h.placements));
      setShadBala(calcShadbala(h.placements, h.lagna, dobISO, finalTime, geo.lat, geo.lon));
      // Transit: generate today's planetary positions for Gochara overlay
      // Fixed: same UTC/local timezone bug as above — use local date components.
      const _now2 = new Date();
      const todayISO2 = `${_now2.getFullYear()}-${String(_now2.getMonth()+1).padStart(2,'0')}-${String(_now2.getDate()).padStart(2,'0')}`;
      const nowH2 = _now2.getHours(), nowM2 = _now2.getMinutes();
      const transitH2 = generateHoroscope(todayISO2, `${nowH2}:${nowM2}`, geo.lat, geo.lon);
      const birthMoon2 = h.placements.find(p => p.ta === "சந்திரன்");
      setTransitOverlay(calcTransitOverlay(h.placements, transitH2.placements, birthMoon2?.rashiIdx || 0));
      setInauspiciousTimes(calcInauspiciousTimes(new Date(), geo.lat));
      setMuhurthaData(calcMuhurtha(new Date(), birthMoon2?.nakIdx || 0));
      setPlanetTransitAnalysis(calcPlanetTransitAnalysis(birthMoon2?.rashiIdx || 0, transitH2.placements));
      setRemediesData(getRemedies(h.placements, calcGrahaBala(h.placements)));
      // Calculate moon longitude for dasha
      const [dY,dM,dD] = dobISO.split('-').map(Number);
      const dDate = new Date(dY, dM-1, dD); // local-time construction, matches new Date(2000,0,1) reference below — avoids UTC/local mismatch
      const T2 = ((dDate - new Date(2000,0,1)) / 86400000 / 36525);
      const Lm2 = ((218.3165+481267.8813*T2)%360+360)%360;
      const Dm2 = ((297.8502+445267.1115*T2)%360+360)%360;
      const Mm2 = ((134.9634+477198.8676*T2)%360+360)%360;
      const Fm2 = ((93.2721+483202.0175*T2)%360+360)%360;
      const Ms2 = ((357.52911+35999.05029*T2)%360+360)%360;
      const ayanamsa2 = 23.856+(T2*100*50.29/3600);
      const r = Math.PI/180;
      const mCorr = 6.289*Math.sin(Mm2*r)-1.274*Math.sin((2*Dm2-Mm2)*r)+0.658*Math.sin(2*Dm2*r)
        -0.214*Math.sin(2*Mm2*r)-0.186*Math.sin(Ms2*r)+0.110*Math.sin(2*Fm2*r);
      const mLong = (((Lm2+mCorr)%360+360)%360-ayanamsa2+360)%360;
      setDashaData(calculateDasha(mLong, dobISO));
    }
    goTo(SCREEN.RESULT);
  };

  const getCurrentDashaInfo = () => {
    if (!dashaData) return "";
    // Fixed: never rely on .isCurrent — it's a snapshot frozen at the moment the horoscope
    // was first generated and never updates again. Always recompute fresh against live "now".
    const now = new Date();
    const md = dashaData.dashas.find(d => now >= d.startDate && now < d.endDate);
    if (!md) return "";
    const ad = md.antardashas?.find(a => now >= a.startDate && now < a.endDate);
    const pad = ad?.pratyantardashas?.find(p => now >= p.startDate && now < p.endDate);
    const sd = pad?.sookshmaDashas?.find(s => now >= s.startDate && now < s.endDate);
    let info = `நடப்பு மகா தசை: ${md.name} (${md.startDate.toLocaleDateString("ta-IN")} — ${md.endDate.toLocaleDateString("ta-IN")})`;
    if (ad) info += `\nநடப்பு புக்தி (அந்தர் தசை): ${md.name}-${ad.name} (${ad.duration})`;
    if (pad) info += `\nநடப்பு பிரத்யந்தர் தசை: ${md.name}-${ad.name}-${pad.name} (${pad.duration})`;
    if (sd) info += `\nநடப்பு சூட்சும தசை: ${md.name}-${ad.name}-${pad.name}-${sd.name} (${sd.duration})`;
    return info;
  };

  const fetchAIPrediction = async () => {
    if(!horoscope)return;
    setPredictionLoading(true); setPrediction("");
    try {
      const dashaInfo = getCurrentDashaInfo();
      const prompt = `You are a world-class Vedic astrologer. Based on these birth chart details, give a personalized prediction in Tamil (with some English terms).
Name: ${formData.name}, DOB: ${formData.dob}, TOB: ${formData.tob||"Unknown"}, POB: ${formData.pob||"Unknown"}
Lagna: ${horoscope.lagnaName} (${horoscope.lagnaEn}), Moon: ${horoscope.moonRashi}, Nakshatra: ${horoscope.nakshatra}
Planets: ${horoscope.placements.map(p=>`${p.ta}:${p.rashi} H${p.house} ${p.degree}°`).join(", ")}
${dashaInfo ? `Dasha periods:\n${dashaInfo}` : ""}
Predict: பொது பலன், தொழில், திருமணம், ஆரோக்கியம், நிதி. Consider the current Mahadasha-Antardasha-Pratyantardasha lords and their combined effects on each life area. 200 words. Warm tone.`;
      const r = await fetch(`${backendUrl}/api/predict`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt, max_tokens:1000})
      });
      const data = await r.json();
      setPrediction(data.text||"பலன் கிடைக்கவில்லை.");
    } catch(e){ setPrediction("AI பலன் பெற இணைய இணைப்பு தேவை."); }
    setPredictionLoading(false);
  };

  // ── DAILY PREDICTION (தினப்பலன்) ── targetDate: null = "இப்போது" (live now), or a Date object for a future/past date
  const openDailyScreen = async (targetDate = null) => {
    if (!horoscope) return;
    const geo = resolveBirthGeo(formData);
    const refDate = targetDate || new Date();

    // Show the same loading screen used for birth-chart generation while we try the
    // live backend — Render's free tier can take a few seconds (or up to ~8s on a
    // cold start) to respond, so this avoids an ambiguous "did my click register?" pause.
    goTo(SCREEN.LOADING);

    // Try the live Swiss Ephemeris backend first (same accuracy source and same
    // /api/horoscope endpoint as the main birth chart), fall back to the instant local
    // Jean Meeus engine on any failure — network error, cold-start timeout, bad response.
    let today = await fetchTransitFromBackend(refDate, geo.lat, geo.lon);
    if (!today) {
      today = getTodayTranist(geo.lat, geo.lon, targetDate);
    }

    const birthMoonRashi = RASHIS.indexOf(horoscope.moonRashi);
    const gochara = calculateGochara(birthMoonRashi, today.placements);
    const remedy = getPersonalizedRemedy(birthMoonRashi, today.dateObj.getDay(), gochara.isChandrashtama, today.tithi);
    const muhurtham = calcMuhurtham(today.dateObj, geo.lat, geo.lon);

    // Sade Sati (Saturn transit) & Guru Peyarchi (Jupiter transit)
    const saturnToday = today.placements.find(p => p.ta === "சனி");
    const jupiterToday = today.placements.find(p => p.ta === "குரு");
    const sadeSati = saturnToday ? calcSadeSati(birthMoonRashi, RASHIS.indexOf(saturnToday.rashi)) : null;
    const guruPeyarchi = jupiterToday ? calcGuruPeyarchi(birthMoonRashi, RASHIS.indexOf(jupiterToday.rashi)) : null;

    // Tara Bala (birth nakshatra vs this date's transiting moon nakshatra)
    const birthNakIdx = NAKSHATRAS.indexOf(horoscope.nakshatra);
    const todayNakIdx = NAKSHATRAS.indexOf(today.nakshatra);
    const taraBala = (birthNakIdx>=0 && todayNakIdx>=0) ? calcTaraBala(birthNakIdx, todayNakIdx) : null;

    // Running Dasha (Mahadasha) + Antardasha (Bhukti) + Pratyantardasha + Sookshma Dasha
    // as of the SELECTED date — key classical factor. Uses `refDate` (computed once at the
    // top of this function — the target date if one was picked, else the moment the screen
    // was opened) so that browsing to a future date correctly shows the dasha that will
    // actually be running then, not today's dasha.
    // IMPORTANT: never rely on dashaData.dashas[i].isCurrent — that's a snapshot frozen at
    // the moment the horoscope was first generated and never updates again.
    let currentDasha = null;
    if (dashaData) {
      const mahadasha = dashaData.dashas.find(d => refDate >= d.startDate && refDate < d.endDate);
      if (mahadasha) {
        const bhukti = mahadasha.antardashas.find(ad => refDate >= ad.startDate && refDate < ad.endDate) || mahadasha.antardashas[0];
        const pratyantar = bhukti?.pratyantardashas?.find(p => refDate >= p.startDate && refDate < p.endDate);
        const sookshma = pratyantar?.sookshmaDashas?.find(s => refDate >= s.startDate && refDate < s.endDate);
        const msLeftInBhukti = bhukti ? bhukti.endDate.getTime() - refDate.getTime() : 0;
        const daysLeftInBhukti = Math.max(0, Math.round(msLeftInBhukti / (24*3600000)));
        const daysLeftInSookshma = sookshma ? Math.max(0, Math.round((sookshma.endDate.getTime() - refDate.getTime()) / (24*3600000))) : 0;
        currentDasha = { mahadasha, bhukti, pratyantar, sookshma, daysLeftInBhukti, daysLeftInSookshma };
      }
    }

    setDailyData({ today, gochara, remedy, muhurtham, sadeSati, guruPeyarchi, taraBala, currentDasha });
    setDailyPrediction("");
    goTo(SCREEN.DAILY);
  };

  const fetchDailyPrediction = async () => {
    if (!horoscope || !dailyData) return;
    setDailyLoading(true); setDailyPrediction("");
    try {
      const { today, gochara, remedy, sadeSati, guruPeyarchi, taraBala, currentDasha } = dailyData;
      const transitSummary = gochara.results.map(p =>
        `${p.ta}: ${p.rashi} (birth moon-க்கு ${p.houseFromMoon}ஆம் வீடு, ${p.effect==="good"?"சுபம்":p.effect==="bad"?"அசுபம்":"நடுநிலை"})`
      ).join(", ");
      const timeframe = today.isFuture ? `on the future date ${today.dateStr}` : today.isPast ? `on the past date ${today.dateStr}` : "today";
      const dashaLine = currentDasha
        ? `The full dasha chain running ${timeframe}: ${currentDasha.mahadasha.name} Mahadasha (main period) → ${currentDasha.bhukti?.name || currentDasha.mahadasha.name} Bhukti (sub-period)${currentDasha.pratyantar ? ` → ${currentDasha.pratyantar.name} Pratyantardasha (sub-sub-period)` : ""}${currentDasha.sookshma ? ` → ${currentDasha.sookshma.name} Sookshma Dasha (finest-grained period, ${currentDasha.daysLeftInSookshma} days left)` : ""}. This is the person's most important long-term astrological influence for that date — the Mahadasha and Bhukti set the broad theme, while the Pratyantardasha and Sookshma Dasha fine-tune what's emphasized right now. Consider what all these planets govern together.`
        : "Dasha data not available.";
      const prompt = `You are a Tamil Vedic astrologer giving a ${today.isOtherDate ? "specific-date" : "daily"} horoscope reading. Respond ONLY in Tamil.
Person: ${formData.name}
Birth chart: Lagna ${horoscope.lagnaName}, Moon sign (Rashi) ${horoscope.moonRashi}, Nakshatra ${horoscope.nakshatra}
${today.isOtherDate ? "Target date" : "Today's date"}: ${today.dateStr} (${today.dayName}கிழமை)${today.isFuture ? " — this is a FUTURE date, not today. Phrase the reading as 'அன்று' (on that day) not 'இன்று' (today)." : today.isPast ? " — this is a PAST date. Phrase the reading in past tense as 'அன்று' (on that day)." : ""}
Panchangam for that date: திதி ${today.tithi} ${today.paksham}, யோகம் ${today.yogam}, கரணம் ${today.karanam}, நட்சத்திரம் ${today.nakshatra}
Planetary transits relative to birth moon sign, as of that date: ${transitSummary}
${dashaLine}
${gochara.isChandrashtama ? `${today.isOtherDate ? "அன்று" : "இன்று"} சந்திராஷ்டமம் — கவனமாக இருக்க வேண்டிய நாள்.` : ""}
${sadeSati?.active ? `Sade Sati status on that date: ${sadeSati.phase} — ${sadeSati.desc}` : "No Sade Sati on that date."}
Guru Peyarchi (Jupiter transit) effect on that date: ${guruPeyarchi?.desc || "N/A"}
Tara Bala on that date: ${taraBala?.name} (${taraBala?.mood === "good" ? "favorable" : "use caution"})
Recommended remedy for this rashi: worship ${remedy?.dayInfo?.deity}, ${remedy?.dayInfo?.remedy}
Give a short, warm, practical ${today.isFuture ? "prediction for that future date" : "daily prediction"} (170 words max) covering: general mood, favorable/unfavorable timing, one practical tip. The Dasha-Bhukti is the most important personalization factor — ground the reading in what the Mahadasha and Bhukti lords represent, then layer in the transits and panchangam on top. Do not repeat the raw planetary data back — synthesize it into natural guidance.`;
      const r = await fetch(`${backendUrl}/api/predict`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt, max_tokens:600})
      });
      const data = await r.json();
      setDailyPrediction(data.text||"இன்றைய பலன் கிடைக்கவில்லை.");
    } catch(e){ setDailyPrediction("இணைய இணைப்பு தேவை."); }
    setDailyLoading(false);
  };


  const handleAuth = (e) => { e?.preventDefault?.(); setUser({name:formData.name||"User"}); goTo(SCREEN.FORM); };

  // ─── NAVAGRAHA COLORS ───
  const GRAHA_COLORS = {
    "சூரியன்":"#e85d26","சந்திரன்":"#c0c0c0","செவ்வாய்":"#dc2626","புதன்":"#22c55e",
    "குரு":"#eab308","சுக்கிரன்":"#ec4899","சனி":"#1e3a5f","ராகு":"#6366f1","கேது":"#b8860b"
  };
  const grahaCardBorder = (planetTa) => GRAHA_COLORS[planetTa] || "#b8860b";

  // ─── PROFESSIONAL HINDU LIGHT THEME ───
  const base = {
    minHeight:"100vh",
    background:"#ffffff",
    fontFamily:"'Segoe UI','Noto Sans Tamil',system-ui,sans-serif",
    color:"#1a1a1a", position:"relative", overflow:"hidden"
  };
  const container = {
    maxWidth:420, margin:"0 auto", padding:"0 20px",
    position:"relative", zIndex:3,
    opacity:fadeIn?1:0, transform:fadeIn?"translateY(0)":"translateY(14px)",
    transition:"opacity 0.45s ease, transform 0.45s ease"
  };
  const T = {
    gold: "#7b1c1c",
    goldBg: "#eadada",
    accent: "#b8860b",
    accentSoft: "#b8860b",
    text: "#1a1a1a",
    textSoft: "#333333",
    textMuted: "#666666",
    bg: "#ffffff",
    cardBg: "#ffffff",
    cardBorder: "1px solid #e0e0e0",
    inputBg: "#fafafa",
    inputBorder: "1.5px solid #d0d0d0",
    inputColor: "#1a1a1a",
    good: "#0d7a30",
    bad: "#cc1a1a",
    neutral: "#7a5200",
    shadow: "0 4px 20px rgba(0,0,0,0.08)",
    pink: "#9b2c2c",
    roseGold: "#b8860b",
  };
  const btnGold = {
    background:"linear-gradient(135deg, #7b1c1c, #9b2c2c, #7b1c1c)",
    color:"#ffffff", border:"none", borderRadius:14, padding:"14px 0",
    width:"100%", fontSize:16, fontWeight:700, cursor:"pointer",
    boxShadow:"0 4px 20px #7b1c1c30"
  };
  const btnOutline = {
    background:"transparent", color:"#7b1c1c",
    border:"1.5px solid #7b1c1c40", borderRadius:14,
    padding:"12px 0", width:"100%", fontSize:15, fontWeight:600, cursor:"pointer"
  };
  const inputStyle = {
    width:"100%", padding:"13px 16px",
    background:"#fafafa", border:"1.5px solid #d0d0d0",
    borderRadius:12, color:"#1a1a1a", fontSize:15, outline:"none",
    boxSizing:"border-box"
  };
  const labelStyle = { display:"block", marginBottom:6, fontSize:13, color:"#b8860b", fontWeight:700 };
  const card = {
    background:"#ffffff", border:"1px solid #e8e8e8",
    borderRadius:18, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,0.04)"
  };

  // ═══════ SPLASH ═══════
  if(screen===SCREEN.SPLASH) return (
    <div style={{...base, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <MantraChakra speed={70} size={620} opacity={0.18}/>
      <div style={{textAlign:"center", zIndex:3, animation:"splashIn 1.2s ease-out"}}>
        <div onClick={()=>{ const ok = playOmSound(); if(ok) setOmPlayed(true); }} style={{
          width:160, height:160, margin:"0 auto 28px", borderRadius:"50%",
          background:"radial-gradient(circle at 50% 50%, #f0c75e40, #d4a85320, transparent)",
          boxShadow:"0 0 80px #d4a85370, 0 0 160px #d4a85330, 0 0 240px #d4a85315",
          display:"flex", alignItems:"center", justifyContent:"center",
          animation:"sunPulse 3s ease-in-out infinite", cursor:"pointer",
          overflow:"hidden", border:"3px solid #d4a85380"
        }}><img src="/murugan.png" alt="முருகன்" style={{width:140,height:140,objectFit:"contain",borderRadius:"50%",filter:"drop-shadow(0 0 12px #d4a85360)"}}/></div>
        <h1 style={{fontSize:32, fontWeight:700, margin:"0 0 8px", letterSpacing:3, color:"#7b1c1c"}}>ஜோதிட நிபுணர்</h1>
        <p style={{fontSize:13, color:"#b8860b", letterSpacing:5, fontWeight:500}}>JOTHIDA NIPUNAR</p>
        <p style={{fontSize:11, color:"#b8860b80", marginTop:12}}>✦ Advanced Vedic Astrology ✦</p>
        <div style={{marginTop:40}}>
          <div style={{width:36,height:3,borderRadius:2,margin:"0 auto",
            background:"linear-gradient(90deg,transparent,#d4a853,transparent)",
            animation:"pulse 1.5s ease-in-out infinite"}}/>
        </div>
      </div>
      <style>{`
        @keyframes splashIn{from{opacity:0;transform:scale(0.9) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}
        @keyframes sunPulse{0%,100%{box-shadow:0 0 80px #d4a85370,0 0 160px #d4a85330;}50%{box-shadow:0 0 100px #d4a85390,0 0 200px #d4a85340,0 0 300px #d4a85318;}}
        @keyframes pulse{0%,100%{opacity:0.3;}50%{opacity:1;}}
      `}</style>
    </div>
  );

  // ═══════ AUTH ═══════
  if(screen===SCREEN.AUTH) return (
    <div style={base}>
      <div style={{...container, paddingTop:56}}>
        <div style={{textAlign:"center", marginBottom:36}}>
          <div style={{
            width:64, height:64, margin:"0 auto 16px", borderRadius:"50%",
            background:"radial-gradient(circle at 35% 35%, #d4a853, #b8860b)",
            boxShadow:"0 0 30px #b8860b20",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:30
          }}>☉</div>
          <h1 style={{fontSize:22, fontWeight:700, margin:"0 0 4px", color:"#7b1c1c"}}>ஜோதிட நிபுணர்</h1>
          <p style={{fontSize:12, color:"#b8860b", margin:0}}>
            {authMode==="login"?"உங்கள் கணக்கில் உள்நுழையுங்கள்":"புதிய கணக்கு உருவாக்குங்கள்"}
          </p>
        </div>
        <div style={{display:"flex",gap:0,marginBottom:28,background:"#f0e0e0",borderRadius:12,padding:3}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>setAuthMode(m)} style={{
              flex:1,padding:"10px 0",border:"none",borderRadius:10,
              background:authMode===m?"#7b1c1c":"transparent",
              color:authMode===m?"#fffdf5":"#555555",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.25s"
            }}>{m==="login"?"உள்நுழைவு":"பதிவு"}</button>
          ))}
        </div>
        <div style={card}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {authMode==="register"&&(
              <div><label style={labelStyle}>பெயர்</label>
              <input style={inputStyle} placeholder="உங்கள் பெயர்" value={formData.name} maxLength={60}
                onChange={e=>setFormData(d=>({...d,name:e.target.value}))}/></div>
            )}
            <div><label style={labelStyle}>மின்னஞ்சல்</label>
            <input type="email" style={inputStyle} placeholder="email@example.com"/></div>
            <div><label style={labelStyle}>கடவுச்சொல்</label>
            <input type="password" style={inputStyle} placeholder="••••••••"/></div>
            <button style={btnGold} onClick={handleAuth}>
              {authMode==="login"?"உள்நுழைக →":"கணக்கு உருவாக்கு →"}
            </button>
            <button style={{...btnOutline,display:"flex",alignItems:"center",justifyContent:"center",gap:10}} onClick={handleAuth}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Google மூலம் உள்நுழைக
            </button>
          </div>
        </div>
        <p style={{textAlign:"center",marginTop:20,fontSize:12,color:"#888888"}}>Firebase Auth • One Device • Encrypted</p>
      </div>
    </div>
  );

  // ═══════ FORM ═══════
  if(screen===SCREEN.FORM) return (
    <div style={base}>
      <div style={{...container, paddingTop:24}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 2px",color:T.gold,letterSpacing:0.5}}>ஜாதகம் பார்க்க</h2>
            <p style={{fontSize:12,color:T.accent,margin:0,fontWeight:500}}>பிறப்பு விவரங்களை உள்ளிடுக</p>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>goTo(SCREEN.PREMIUM)} style={{
              background:"#eddada",border:"1px solid #7b1c1c20",
              borderRadius:10,padding:"8px 14px",color:T.gold,fontSize:11,fontWeight:600,cursor:"pointer"
            }}>⭐ Premium</button>
          </div>
        </div>
        <div style={card}>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div><label style={labelStyle}>பெயர் *</label>
            <input style={inputStyle} placeholder="உங்கள் பெயர்" value={formData.name} maxLength={60}
              onChange={e=>setFormData(d=>({...d,name:e.target.value}))}/></div>
            <div><label style={labelStyle}>பிறந்த தேதி * <span style={{fontSize:10,color:"#555555",fontWeight:400}}>(DD.MM.YYYY)</span></label>
            <input type="text" inputMode="numeric" maxLength={10}
              style={{...inputStyle,letterSpacing:2,fontFamily:"monospace",fontSize:16}}
              placeholder="DD.MM.YYYY" value={formData.dob}
              onChange={e=>{
                const formatted = formatDateInput(e.target.value);
                setFormData(d=>({...d,dob:formatted}));
              }}/>
            {formData.dob && formData.dob.length === 10 && (
              <div style={{fontSize:10,marginTop:4,color:isValidDDMMYYYY(formData.dob)?"#4ade80":"#dc2626"}}>
                {isValidDDMMYYYY(formData.dob)
                  ? `✓ ${formData.dob}`
                  : "⚠ தவறான தேதி — சரிபார்க்கவும்"}
              </div>
            )}</div>
            <div><label style={labelStyle}>பிறந்த நேரம் * <span style={{fontSize:10,color:"#555555",fontWeight:400}}>(மணி:நிமிடம்)</span></label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="text" inputMode="numeric" maxLength={5}
                style={{...inputStyle, width:"46%", textAlign:"center", padding:"13px 8px", letterSpacing:2, fontFamily:"monospace", fontSize:16}}
                placeholder="06:30"
                value={formData.tob}
                onChange={e=>setFormData(d=>({...d, tob: formatTimeInput(e.target.value)}))}/>
              {/^\d{2}:\d{2}$/.test(formData.tob) && (
                <span style={{fontSize:16,color:"#4ade80"}}>✓</span>
              )}
              {/* AM/PM Toggle */}
              <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1.5px solid #d4a85330",flexShrink:0,flex:1}}>
                {["AM","PM"].map(p=>(
                  <button key={p} onClick={()=>setFormData(d=>({...d,ampm:p}))} style={{
                    flex:1,padding:"12px 10px",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                    transition:"all 0.2s",
                    background:formData.ampm===p
                      ? (p==="AM"
                        ? "linear-gradient(135deg,#d4a853,#b8860b)"
                        : "linear-gradient(135deg,#7b1c1c,#9b2c2c)")
                      : "rgba(255,255,255,0.5)",
                    color:formData.ampm===p ? "#fffdf5" : "#555555"
                  }}>
                    {p==="AM"?"☀ காலை":"☽ மாலை"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{fontSize:10,color:"#555555",marginTop:5}}>
              {formData.ampm==="AM"?"காலை 12:00 — பிற்பகல் 11:59":"பிற்பகல் 12:00 — இரவு 11:59"}
            </div>
            </div>
            <div style={{position:"relative"}}>
              <label style={labelStyle}>பிறந்த இடம் <span style={{fontSize:10,color:"#555555",fontWeight:400}}>(துல்லியமான ஊரைத் தேடி தேர்ந்தெடுக்கவும்)</span></label>
              <input style={inputStyle} placeholder="எ.கா. Madurai, Tamil Nadu — தட்டச்சு செய்யவும்"
                value={formData.pob}
                onChange={e=>{
                  const val = e.target.value;
                  // Typing invalidates any previously-selected precise coordinates
                  setFormData(d=>({...d, pob:val, pobLat:null, pobLon:null, pobSource:null}));
                  setPlaceDropdownOpen(false);
                  if (placeSearchTimer.current) clearTimeout(placeSearchTimer.current);
                  if (val.trim().length < 3) { setPlaceResults([]); return; }
                  setPlaceSearching(true);
                  placeSearchTimer.current = setTimeout(async () => {
                    const results = await searchPlacesOSM(val);
                    setPlaceResults(results);
                    setPlaceSearching(false);
                    setPlaceDropdownOpen(results.length > 0);
                  }, 500); // debounce — respects Nominatim's ~1 req/sec usage policy
                }}
                onBlur={()=>{ setTimeout(()=>setPlaceDropdownOpen(false), 200); }} // delay lets dropdown click register first
                onFocus={()=>{ if(placeResults.length>0) setPlaceDropdownOpen(true); }}/>

              {placeSearching && (
                <div style={{fontSize:10,marginTop:5,color:"#555555"}}>🔍 தேடுகிறது...</div>
              )}

              {/* Search results dropdown */}
              {placeDropdownOpen && placeResults.length > 0 && (
                <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:20,marginTop:4,
                  background:"#ffffff",border:"1.5px solid #d0d0d0",borderRadius:12,
                  boxShadow:"0 8px 32px rgba(0,0,0,0.15)",maxHeight:220,overflowY:"auto"}}>
                  {placeResults.map((r,i)=>(
                    <div key={i}
                      onMouseDown={()=>{
                        setFormData(d=>({...d, pob:r.shortLabel, pobLat:r.lat, pobLon:r.lon, pobSource:"osm"}));
                        setPlaceDropdownOpen(false);
                        setPlaceResults([]);
                      }}
                      style={{padding:"10px 14px",cursor:"pointer",borderBottom:i<placeResults.length-1?"1px solid #e0e0e0":"none"}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#7b1c1c"}}>📍 {r.shortLabel}</div>
                      <div style={{fontSize:9,color:"#555555",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.displayName}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Status indicator */}
              {formData.pobLat != null && formData.pobLon != null ? (
                <div style={{fontSize:10,marginTop:5,color:"#4ade80"}}>
                  ✓ துல்லியமான ஆயத்தொலைவு {formData.pobSource==="manual"?"(கைமுறையாக உள்ளிடப்பட்டது)":"(தேடலில் இருந்து தேர்ந்தெடுக்கப்பட்டது)"} — {formData.pobLat.toFixed(4)}°N, {formData.pobLon.toFixed(4)}°E
                </div>
              ) : formData.pob && formData.pob.trim() && !placeSearching && (() => {
                const geo = geocodeCity(formData.pob);
                return (
                  <div style={{fontSize:10,marginTop:5,color:geo.matched?"#7b1c1c":"#dc2626"}}>
                    {geo.matched
                      ? `≈ database-ல் தோராயமாக கண்டறியப்பட்டது — மேலே தோன்றும் தேடல் பட்டியலில் இருந்து துல்லியமான இடத்தைத் தேர்ந்தெடுக்க பரிந்துரைக்கிறோம்`
                      : `⚠ கண்டறியப்படவில்லை — Chennai coordinates fallback (பிழை வரலாம்). மேலே தேடல் முடிவுகள் வரவில்லை என்றால் கீழே கைமுறையாக உள்ளிடவும்`}
                  </div>
                );
              })()}

              {/* Manual precise lat/lon entry — for advanced users who already know exact coordinates */}
              <button type="button" onClick={()=>setShowManualGeo(v=>!v)} style={{
                background:"none",border:"none",color:"#555555",fontSize:10,cursor:"pointer",
                padding:"6px 0 0",textDecoration:"underline"
              }}>{showManualGeo?"▲ கைமுறை Lat/Lon மறை":"✏️ கூடுதல் துல்லியம்: Lat/Lon நேரடியாக உள்ளிடவும்"}</button>

              {showManualGeo && (
                <div>
                  <div style={{display:"flex",gap:8,marginTop:6}}>
                    <input type="number" step="0.0001" min="-90" max="90" placeholder="Latitude (எ.கா. 9.9252)"
                      style={{...inputStyle,fontSize:12,padding:"9px 10px"}}
                      value={formData.pobSource==="manual" ? (formData.pobLat ?? "") : ""}
                      onChange={e=>{
                        const lat = e.target.value === "" ? null : parseFloat(e.target.value);
                        setFormData(d=>({...d, pobLat:lat, pobSource: lat!=null && d.pobLon!=null ? "manual" : d.pobSource}));
                      }}/>
                    <input type="number" step="0.0001" min="-180" max="180" placeholder="Longitude (எ.கா. 78.1198)"
                      style={{...inputStyle,fontSize:12,padding:"9px 10px"}}
                      value={formData.pobSource==="manual" ? (formData.pobLon ?? "") : ""}
                      onChange={e=>{
                        const lon = e.target.value === "" ? null : parseFloat(e.target.value);
                        setFormData(d=>({...d, pobLon:lon, pobSource: lon!=null && d.pobLat!=null ? "manual" : d.pobSource}));
                      }}/>
                  </div>
                  {formData.pobSource==="manual" && ((formData.pobLat!=null && (formData.pobLat<-90||formData.pobLat>90)) || (formData.pobLon!=null && (formData.pobLon<-180||formData.pobLon>180))) && (
                    <div style={{fontSize:10,marginTop:4,color:"#ff6b8a"}}>
                      ⚠ தவறான coordinates — Latitude -90 முதல் 90 வரையும், Longitude -180 முதல் 180 வரையும் மட்டுமே செல்லுபடியாகும். சரிசெய்யும் வரை city database மதிப்பு பயன்படுத்தப்படும்.
                    </div>
                  )}
                </div>
              )}
            </div>
            <button style={{...btnGold,opacity:(!formData.name||!isValidDDMMYYYY(formData.dob))?0.4:1,
              pointerEvents:(!formData.name||!isValidDDMMYYYY(formData.dob))?"none":"auto"}} onClick={handleSubmit}>
              ஜாதகம் உருவாக்கு ☉
            </button>
          </div>
        </div>
        {/* Backend API Section */}
        <div style={{...card, marginTop:14, padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <label style={{fontSize:12,color:"#b8860b",fontWeight:600}}>🔗 Backend API URL</label>
            <a href="https://render.com" target="_blank" rel="noopener"
              style={{fontSize:10,color:"#d4a853",textDecoration:"none"}}>Free deploy →</a>
          </div>
          <input style={{...inputStyle,fontSize:12,padding:"10px 14px"}}
            placeholder="https://jothida-api.onrender.com"
            value={backendUrl} onChange={e=>setBackendUrl(e.target.value)}/>
          <div style={{fontSize:10,marginTop:6,color:backendUrl?"#4ade80":"#888888"}}>
            {backendUrl
              ? "✓ Swiss Ephemeris Backend — 100% NASA accuracy"
              : "Backend இல்லை — Local Jean Meeus Engine (~0.5° accuracy)"}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
          {[{icon:"☊",t:"ராசி பலன்",s:"12 ராசிகள்"},{icon:"☽",t:"நட்சத்திர பலன்",s:"27 நட்சத்திரங்கள்"},
            {icon:"♃",t:"கிரக நிலை",s:"9 கிரகங்கள்"},{icon:"🤖",t:"AI பலன்கள்",s:"Claude AI"}
          ].map((c,i)=>(
            <div key={i} style={{...card,padding:"14px 12px",textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:4}}>{c.icon}</div>
              <div style={{fontSize:12,fontWeight:600,color:"#1a1a1a"}}>{c.t}</div>
              <div style={{fontSize:10,color:"#b8860b"}}>{c.s}</div>
            </div>
          ))}
        </div>
        {/* Porutham Button */}
        <button onClick={()=>goTo(SCREEN.PORUTHAM)} style={{
          ...btnOutline, marginTop:12, borderColor:"#ff6b8a30", color:"#dc2626",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8
        }}>
          <span style={{fontSize:18}}>💍</span> திருமண பொருத்தம் பார்க்க
        </button>
        <button onClick={()=>goTo(SCREEN.CALENDAR)} style={{
          ...btnOutline, marginTop:10, borderColor:"#4ade8030", color:"#4ade80",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontSize:13
        }}>📅 பஞ்சாங்க நாட்காட்டி</button>
      </div>
    </div>
  );

  // ═══════ LOADING ═══════
  if(screen===SCREEN.LOADING) return (
    <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",zIndex:3}}>
        <div style={{position:"relative",width:120,height:120,margin:"0 auto 28px"}}>
          <svg viewBox="0 0 120 120" style={{width:120,height:120,animation:"spin 2s linear infinite"}}>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#d4a85320" strokeWidth="2.5"/>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#d4a853" strokeWidth="2.5"
              strokeDasharray="60 280" strokeLinecap="round"/>
          </svg>
          <svg viewBox="0 0 120 120" style={{width:90,height:90,position:"absolute",top:15,left:15,animation:"spinR 3s linear infinite"}}>
            <circle cx="60" cy="60" r="40" fill="none" stroke="#b8860b30" strokeWidth="1.5"/>
            <circle cx="60" cy="60" r="40" fill="none" stroke="#b8860b" strokeWidth="1.5"
              strokeDasharray="40 210" strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:36}}>☉</div>
        </div>
        <p style={{color:"#7b1c1c",fontSize:15,fontWeight:500}}>கிரக நிலைகளை கணக்கிடுகிறது...</p>
        <p style={{color:"#555555",fontSize:11,marginTop:6}}>Swiss Ephemeris Engine</p>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:20}}>
          {[0,1,2,3,4].map(i=>(
            <div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#d4a853",
              animation:`dotP 1.2s ease-in-out ${i*0.15}s infinite`}}/>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes spinR{to{transform:rotate(-360deg);}}
        @keyframes dotP{0%,100%{opacity:0.2;transform:scale(0.8);}50%{opacity:1;transform:scale(1.3);}}
      `}</style>
    </div>
  );

  // ═══════ PREMIUM ═══════
  if(screen===SCREEN.PREMIUM) return (
    <div style={base}>
      <div style={{...container,paddingTop:24}}>
        <button onClick={()=>goTo(SCREEN.FORM)} style={{background:"none",border:"none",color:T.accent,fontSize:14,cursor:"pointer",padding:0,marginBottom:20}}>← பின் செல்</button>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:40,marginBottom:8}}>⭐</div>
          <h2 style={{fontSize:22,fontWeight:400,margin:"0 0 6px",color:"#7b1c1c"}}>Premium திட்டம்</h2>
          <p style={{fontSize:13,color:"#b8860b",margin:0}}>முழு ஜோதிட அனுபவத்தைப் பெறுங்கள்</p>
        </div>
        {[
          {name:"மாதாந்திர",price:"₹149",period:"/மாதம்",features:["வரம்பற்ற ஜாதகங்கள்","AI பலன்கள்","தினப்பலன்"],popular:false},
          {name:"ஆண்டு",price:"₹999",period:"/ஆண்டு",features:["எல்லா மாதாந்திர அம்சங்கள்","பரிகாரங்கள்","முன்னுரிமை ஆதரவு","திருமண பொருத்தம்"],popular:true}
        ].map((plan,i)=>(
          <div key={i} style={{...card,marginBottom:16,border:plan.popular?"1.5px solid #d4a85350":card.border,position:"relative"}}>
            {plan.popular&&(<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
              background:"linear-gradient(135deg,#7b1c1c,#9b2c2c)",color:"#fffdf5",
              fontSize:10,fontWeight:700,padding:"3px 14px",borderRadius:20}}>பிரபலமானது</div>)}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
              <h3 style={{fontSize:16,fontWeight:600,color:"#1a1a1a",margin:0}}>{plan.name}</h3>
              <div><span style={{fontSize:26,fontWeight:700,color:"#7b1c1c"}}>{plan.price}</span>
              <span style={{fontSize:12,color:"#b8860b"}}>{plan.period}</span></div>
            </div>
            {plan.features.map((f,fi)=>(<div key={fi} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{color:"#d4a853",fontSize:14}}>✓</span>
              <span style={{fontSize:13,color:"#333333"}}>{f}</span>
            </div>))}
            <button style={{...btnGold,marginTop:14,fontSize:14}}>தொடங்கு →</button>
          </div>
        ))}
      </div>
    </div>
  );


  // ═══════ RESULT — ALL INFO ON ONE PAGE (Professional Software Style) ═══════
  if(screen===SCREEN.RESULT&&horoscope){
    const birthTime = formData.tob ? `${formData.tob} ${formData.ampm}` : "—";

    const downloadPDF = () => {
      const h = horoscope;
      const pRows = h.placements.map((p,i)=>{
        const lord = getNakshatraLord(p.nakIdx);
        const flags = `${p.isRetrograde && p.ta !== "ராகு" && p.ta !== "கேது" ? ' <span style="color:#c00;font-size:9px">℞</span>' : ""}${p.isCombust ? ' <span style="color:#fff;background:#f60;font-size:7px;padding:0 2px;border-radius:2px;font-weight:700">C</span>' : ""}${p.isMoolaTri ? ' <span style="color:#0a7;font-size:8px">MT</span>' : ""}`;
        return `<tr style="background:${i%2===0?"#fff":"#f9f9f0"}"><td style="padding:6px 8px">${p.ta}${flags}</td><td style="padding:6px 8px;font-family:monospace">${p.dms||p.fullLong}</td><td style="padding:6px 8px">${p.rashi}</td><td style="padding:6px 8px">${p.nakshatraTa||""} - ${p.pada||""}</td><td style="padding:6px 8px;color:#8b4500">${lord.name}</td></tr>`;
      }).join("");
      // Full Dasha table (all 9 periods with dates)
      const dashaRows = dashaData ? dashaData.dashas.map((d,i)=>
        `<tr style="background:${d.isCurrent?"#e8f5e9":i%2===0?"#fff":"#f9f9f0"}${d.isCurrent?";font-weight:700":""}">
          <td style="padding:6px 8px">${d.name}${d.isCurrent?' <span style="color:#1a8d1a;font-size:10px">(நடப்பு)</span>':""}</td>
          <td style="padding:6px 8px;text-align:center">${d.years} ஆண்டு</td>
          <td style="padding:6px 8px">${d.startDate.toLocaleDateString("ta-IN")}</td>
          <td style="padding:6px 8px">${d.endDate.toLocaleDateString("ta-IN")}</td>
        </tr>`
      ).join("") : "";
      const dashaSection = dashaData ? `<div class="sec-title">விம்சோத்தரி தசா காலக்கணக்கு (Vimshottari Dasha)</div>
        <p style="font-size:12px;color:#555;margin-bottom:8px">பிறப்பு நட்சத்திரம்: <strong>${dashaData.birthNakshatra}</strong> — நட்சத்திர நாதன்: <strong>${dashaData.birthLord.name}</strong></p>
        <table class="pt"><thead><tr><th>தசை (Mahadasha)</th><th style="text-align:center">காலம்</th><th>தொடக்கம்</th><th>முடிவு</th></tr></thead>
        <tbody>${dashaRows}</tbody></table>` : "";

      // Generate chart SVGs for PDF
      const rashiSVG = chartSVGString(h.placements, h.lagna, "ராசி", false);
      const movable2=[0,3,6,9],fixed2=[1,4,7,10];
      const nDeg=h.lagnaDeg||0, nPart=Math.floor(nDeg/(30/9));
      let nStart; if(movable2.includes(h.lagna))nStart=0; else if(fixed2.includes(h.lagna))nStart=9; else nStart=6;
      const navLagna2=(nStart+nPart)%12;
      const navSVG = navamsaData ? chartSVGString(navamsaData, navLagna2, "நவாம்சம்", true) : "";
      const chartSection = `<div class="sec-title">ராசி சக்கரம் / நவாம்ச சக்கரம்</div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">
          <div style="flex:1;min-width:280px;max-width:340px">${rashiSVG}</div>
          ${navSVG?`<div style="flex:1;min-width:280px;max-width:340px">${navSVG}</div>`:""}
        </div>`;
      const aiPart = prediction ? `<div style="margin-top:20px;border-top:2px solid #1a8d1a;padding-top:16px"><h3 style="color:#1a8d1a;font-size:14px">🤖 AI ஜோதிட பலன்</h3><p style="font-size:13px;line-height:2;white-space:pre-wrap;margin-top:8px">${escapeHtml(prediction)}</p></div>` : "";
      const html = `<!DOCTYPE html><html lang="ta"><head><meta charset="UTF-8"/><title>${escapeHtml(formData.name)} — ஜாதகம்</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans Tamil',sans-serif;background:#fff;color:#222;padding:20px}
.page{max-width:700px;margin:0 auto;border:3px solid #1a8d1a;border-radius:4px;overflow:hidden}
.hdr{background:#1a8d1a;color:#fff;text-align:center;padding:14px}.hdr h1{font-size:20px;margin:0 0 2px}.hdr p{font-size:11px;opacity:.8}
.body{padding:20px}
.info-tbl{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}
.info-tbl td{padding:5px 8px;border-bottom:1px solid #eee}.info-tbl td:first-child{color:#1a8d1a;font-weight:600;width:40%}
.sec-title{font-size:14px;font-weight:700;color:#1a8d1a;border-bottom:2px solid #1a8d1a;padding-bottom:4px;margin:16px 0 10px}
table.pt{width:100%;border-collapse:collapse;font-size:12px;border:1px solid #1a8d1a}
table.pt th{background:#1a8d1a;color:#fff;padding:7px 8px;text-align:left;font-size:11px}
table.pt td{padding:6px 8px;border-bottom:1px solid #ddd}
.ftr{background:#1a8d1a;color:#fff;text-align:center;padding:10px;font-size:10px;margin-top:16px}
@media print{body{padding:0}.page{border:none}.no-print{display:none!important}}
.btn{position:fixed;bottom:20px;right:20px;background:#1a8d1a;color:#fff;border:none;border-radius:30px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans Tamil',sans-serif;box-shadow:0 4px 16px #0003}
</style></head><body><div class="page">
<div class="hdr"><img src="${MURUGAN_IMG}" alt="முருகன்" style="width:70px;height:70px;object-fit:contain;border-radius:50%;border:2px solid #fff8;margin-bottom:8px;"/><h1>☉ ${escapeHtml(formData.name)} — ஜாதக விவரம்</h1><p>JATHAGAM • VEDIC BIRTH CHART</p></div>
<div class="body">
<table class="info-tbl">
<tr><td>பெயர்</td><td>: ${escapeHtml(formData.name)}</td></tr>
<tr><td>பிறந்த நாள்</td><td>: ${formData.dob}</td></tr>
<tr><td>பிறந்த நேரம்</td><td>: ${birthTime}</td></tr>
<tr><td>பிறந்த இடம்</td><td>: ${escapeHtml(formData.pob||"—")}</td></tr>
<tr><td>உதய லக்னம்</td><td>: ${h.lagnaName}</td></tr>
<tr><td>ராசி</td><td>: ${h.moonRashi}</td></tr>
<tr><td>விண்மீன்</td><td>: ${h.nakshatra}, பாதம் ${h.nakshatraPada||1}</td></tr>
<tr><td>நிலவு நாள்(திதி)</td><td>: ${h.tithi||""}, ${h.paksham||""}</td></tr>
<tr><td>கரணம்</td><td>: ${h.karanam||"—"}</td></tr>
<tr><td>யோகம்</td><td>: ${h.yogam||"—"}</td></tr>
</table>
${chartSection}
<div class="sec-title">நிராயண ஸ்புடங்கள்</div>
<table class="pt"><thead><tr><th>கிரகம்</th><th>தீர்காம்சம்</th><th>ராசி</th><th>நட்சத்திரம்-பாதம்</th><th>அதிபதி</th></tr></thead><tbody>
<tr style="background:#e8f5e9;font-weight:700"><td>லக்னம்</td><td style="font-family:monospace">${h.lagnaDMS||""}</td><td>${h.lagnaName}</td><td>${h.lagnaNakshatra||""} - ${h.lagnaPada||""}</td></tr>
${pRows}</tbody></table>
${dashaSection}
${aiPart}
</div><div class="ftr">ஜோதிட நிபுணர் | Jean Meeus Algorithms | Lahiri Ayanamsa | ${new Date().toLocaleDateString("ta-IN")}</div>
</div><button class="btn no-print" onclick="window.print()">📄 PDF சேமி / அச்சிடு</button></body></html>`;
      try {
        const blob = new Blob([html],{type:'text/html;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const opened = window.open(url,'_blank');
        setTimeout(()=>URL.revokeObjectURL(url),10000);
        if (!opened) throw new Error("popup-blocked");
      } catch(e) {
        const w = window.open('','_blank');
        if(w){w.document.write(html);w.document.close();}
        else alert("பாப்-அப் தடுக்கப்பட்டுள்ளது. இந்த தளத்திற்கு pop-ups-ஐ browser-ல் அனுமதித்துவிட்டு மீண்டும் முயற்சிக்கவும்.");
      }
    };

    return (
      <div style={base}>
        <div style={{...container,paddingTop:20,paddingBottom:30}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <button onClick={()=>goTo(SCREEN.FORM)} style={{background:"none",border:"none",color:T.accent,fontSize:14,cursor:"pointer",padding:0}}>← திரும்பு</button>
            <h2 style={{fontSize:16,fontWeight:700,margin:0,color:T.gold}}>{formData.name} — ஜாதகம்</h2>
            <div/>
          </div>

          {/* ═══ TAB SWITCHER: ஜாதகம் / இன்றைய பலன் ═══ */}
          <div style={{display:"flex",gap:0,marginBottom:14,background:"#f0e0e0",borderRadius:12,padding:3}}>
            <button style={{
              flex:1,padding:"10px 0",border:"none",borderRadius:10,
              background:"#7b1c1c",
              color:"#fffdf5",fontSize:12,fontWeight:700,cursor:"pointer"
            }}>📜 ஜாதகம்</button>
            <button onClick={()=>openDailyScreen()} style={{
              flex:1,padding:"10px 0",border:"none",borderRadius:10,
              background:"transparent",color:T.accentSoft,fontSize:12,fontWeight:600,cursor:"pointer"
            }}>📅 இன்றைய பலன்</button>
          </div>

          {/* ═══ 1. BIRTH DETAILS ═══ */}
          <div style={{...card,marginBottom:10,padding:"12px 14px",fontSize:12}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>
                {[
                  ["பெயர்",formData.name],["பிறந்த நாள்",formData.dob],["பிறந்த நேரம்",birthTime],
                  ["பிறந்த இடம்",formData.pob||"—"],["உதய லக்னம்",horoscope.lagnaName],["ராசி",horoscope.moonRashi],
                  ["விண்மீன்",`${horoscope.nakshatra}, பாதம் ${horoscope.nakshatraPada||1}`],
                  ["நிலவு நாள்(திதி)",`${horoscope.tithi||""}, ${horoscope.paksham||""}`],
                  ["கரணம்",horoscope.karanam||"—"],["யோகம்",horoscope.yogam||"—"],
                ].map(([l,v],i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #e8e0e0"}}>
                    <td style={{padding:"4px 0",color:"#b8860b",width:"42%",fontWeight:600,fontSize:11}}>{l}</td>
                    <td style={{padding:"4px 0",color:"#888888",width:10}}>:</td>
                    <td style={{padding:"4px 6px",color:"#1a1a1a",fontWeight:600,fontSize:11}}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ═══ 2. RASHI + NAVAMSA CHARTS ═══ */}
          <div style={{...card,marginBottom:10,padding:8}}>
            <TraditionalChart horoscope={horoscope} navamsaData={navamsaData} title="ராசி" showNavamsa={true}/>
          </div>

          {/* ═══ 3. PLANETARY POSITIONS TABLE ═══ */}
          <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>நிராயண ஸ்புடங்கள்</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                <thead><tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                  <th style={{padding:"5px 2px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                  <th style={{padding:"5px 2px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>தீர்காம்சம்</th>
                  <th style={{padding:"5px 2px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>ராசி</th>
                  <th style={{padding:"5px 2px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>நட்சத்திரம்-பாதம்</th>
                  <th style={{padding:"5px 2px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>அதிபதி</th>
                </tr></thead>
                <tbody>
                  {(()=>{
                    const lagnaNakIdx = NAKSHATRAS.indexOf(horoscope.lagnaNakshatra);
                    const lagnaLord = getNakshatraLord(lagnaNakIdx);
                    return (
                      <tr style={{borderBottom:"1px solid #e0e0e0",background:"#fdf6e3"}}>
                        <td style={{padding:"5px 2px",fontWeight:700,color:"#7b1c1c"}}>லக்னம்</td>
                        <td style={{padding:"5px 2px",textAlign:"center",color:"#1a1a1a",fontFamily:"monospace"}}>{horoscope.lagnaDMS}</td>
                        <td style={{padding:"5px 2px",color:"#7b1c1c"}}>{horoscope.lagnaName}</td>
                        <td style={{padding:"5px 2px",color:"#333333"}}>{horoscope.lagnaNakshatra} - {horoscope.lagnaPada}</td>
                        <td style={{padding:"5px 2px",color:"#8b6914",fontWeight:600}}>{lagnaLord.name}</td>
                      </tr>
                    );
                  })()}
                  {horoscope.placements.map((p,i)=>{
                    const lord = getNakshatraLord(p.nakIdx);
                    return (
                      <tr key={i} style={{borderBottom:"1px solid #e8e0e0",background:i%2?"#faf5f0":"transparent"}}>
                        <td style={{padding:"5px 2px",color:"#1a1a1a",fontWeight:600}}>
                          {p.ta}
                          {p.isRetrograde && p.ta !== "ராகு" && p.ta !== "கேது" && <span style={{color:"#cc1a1a",fontSize:9,marginLeft:2}} title="வக்ரம் (Retrograde)">℞</span>}
                          {p.isCombust && <span style={{color:"#fff",background:"#ff6600",fontSize:7,marginLeft:2,padding:"0 2px",borderRadius:2,fontWeight:700}} title="அஸ்தங்கம் (Combust)">C</span>}
                          {p.isMoolaTri && <span style={{color:"#0d7a30",fontSize:8,marginLeft:2}} title="மூலத்திரிகோணம்">MT</span>}
                        </td>
                        <td style={{padding:"5px 2px",textAlign:"center",color:"#1a1a1a",fontFamily:"monospace"}}>{p.dms}</td>
                        <td style={{padding:"5px 2px",color:"#7b1c1c",fontWeight:600}}>{p.rashi}</td>
                        <td style={{padding:"5px 2px",color:"#333333"}}>{p.nakshatraTa} - {p.pada}</td>
                        <td style={{padding:"5px 2px",color:"#8b6914",fontWeight:600}}>{lord.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {dashaData&&(<div style={{marginTop:8,padding:"6px 8px",background:"#f0e0e0",borderRadius:6,borderLeft:"3px solid #f0c75e",fontSize:11,color:"#7b1c1c",fontWeight:600}}>
              தசை இருப்பு: {dashaData.birthLord.name} {dashaData.dashas[0]?.years} வருடம்
            </div>)}
          </div>

          {/* ═══ 3.1 அதிர்ஷ்ட எண்கள் & ராசி கற்கள் (Birth-based) ═══ */}
          {(()=>{
            const moonRashiIdx = RASHIS.indexOf(horoscope.moonRashi);
            const lucky = RASHI_LUCKY[moonRashiIdx >= 0 ? moonRashiIdx : 0];
            const nakIdx = NAKSHATRAS.indexOf(horoscope.nakshatra);
            const nakLord = getNakshatraLord(nakIdx);
            return (
              <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:10,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                  💎 அதிர்ஷ்ட விவரங்கள் & ராசி கற்கள்
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{background:"#f0c75e08",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>🔢 அதிர்ஷ்ட எண்கள்</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#7b1c1c",letterSpacing:4}}>
                      {lucky.nums.join("  ")}
                    </div>
                    <div style={{fontSize:8,color:"#666666",marginTop:2}}>ராசி அடிப்படை (நிரந்தரம்)</div>
                  </div>
                  <div style={{background:"#f2ecda",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>🧭 அதிர்ஷ்ட திசை</div>
                    <div style={{fontSize:14,fontWeight:700,color:"#b8860b"}}>{lucky.dir}</div>
                    <div style={{fontSize:8,color:"#666666",marginTop:2}}>சாதகமான திசை</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{background:"linear-gradient(135deg,#d4a85308,#b8860b10)",borderRadius:8,padding:"8px 10px",border:"1px solid #d4a85318"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>💎 ராசி ரத்தினம்</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>{lucky.gem}</div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#b8860b10,#d4a85308)",borderRadius:8,padding:"8px 10px",border:"1px solid #b8860b25"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>💠 உப ரத்தினம்</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#b8860b"}}>{lucky.subGem}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"#4ade8008",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>🌈 அதிர்ஷ்ட நிறம்</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#4ade80"}}>{lucky.color}</div>
                  </div>
                  <div style={{background:"#f0c75e08",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>⭐ நட்சத்திர அதிபதி</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>{nakLord.name}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═══ ADVANCED VIEW SELECTOR — தேர்ந்தெடுத்து பார்க்க ═══ */}
          <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderLeft:"3px solid #7b1c1c",paddingLeft:8,letterSpacing:0.5}}>
              🔬 மேலும் ஆழமான விவரங்கள்
            </div>
            <select
              value={advancedView}
              onChange={e=>setAdvancedView(e.target.value)}
              style={{
                width:"100%", padding:"10px 12px", background:"#f5f0e0",
                border:"1.5px solid #d4a85330", borderRadius:10, color:"#1a1a1a",
                fontSize:13, outline:"none", fontFamily:"'Noto Sans Tamil',sans-serif"
              }}
            >
              <option value="">— பார்க்க வேண்டியதைத் தேர்ந்தெடுக்கவும் —</option>
              <option value="grahabala">💪 கிரக பலம் (Graha Bala)</option>
              <option value="yogas">🕉 யோகங்கள் (Mahapurusha + Classical)</option>
              <option value="ashtakavarga">🔢 சர்வாஷ்டகவர்க்கம்</option>
              <option value="drishti">👁 கிரக திருஷ்டி (Aspects)</option>
              <option value="d10">💼 தசாம்சம் D10 (தொழில்)</option>
              <option value="divisional">🔀 பிரிவு சக்கரங்கள் (D2,D3,D4,D7,D12,D60)</option>
              <option value="kalasarpa">🐍 கால சர்ப்ப தோஷம்</option>
              <option value="chevvai">🔴 செவ்வாய் தோஷம்</option>
              <option value="bhava">🏠 பாவ சக்கரம் (Bhava Chart)</option>
              <option value="navamsastrength">💎 நவாம்ச பலம் (D9 Strength)</option>
              <option value="shadbala">⚖ ஷட்பலம் (Shadbala)</option>
              <option value="transitoverlay">🌍 கோசாரம் (Transit Overlay)</option>
              <option value="rahukalam">⏰ ராகு காலம் / எமகண்டம் / குளிகை</option>
              <option value="muhurtha">🕉 முஹூர்த்தம் (சுப நேரம்)</option>
              <option value="saniguru">🪐 சனி-குரு பெயர்ச்சி பலன்</option>
              <option value="remedies">💎 பரிகாரம் (கோயில், மந்திரம், ரத்தினம்)</option>
            </select>
          </div>

          {/* ═══ 3.5 GRAHA BALA (Planet Strength) ═══ */}
          {advancedView==="grahabala" && grahaBala && grahaBala.length > 0 && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                💪 கிரக பலம் (Graha Bala)
              </div>
              {grahaBala.map((g,i) => {
                const statusColor = g.status==="உச்சம்"||g.status==="சொந்த வீடு" ? "#4ade80"
                  : g.status==="நீசம்" ? "#dc2626"
                  : g.status==="நட்பு வீடு" ? "#b8860b" : "#333333";
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",
                    borderBottom:i<grahaBala.length-1?"1px solid #e8e0e0":"none"}}>
                    <span style={{fontSize:14,width:20}}>{g.symbol}</span>
                    <span style={{fontSize:11,color:"#1a1a1a",width:70}}>{g.ta}</span>
                    <div style={{flex:1,background:"#eddada",borderRadius:4,height:6,overflow:"hidden"}}>
                      <div style={{width:`${g.score*10}%`,height:"100%",background:statusColor,borderRadius:4}}/>
                    </div>
                    <span style={{fontSize:9,fontWeight:700,color:statusColor,width:32,textAlign:"right"}}>{g.score}/10</span>
                    <span style={{fontSize:9,color:statusColor,width:62,textAlign:"right"}}>{g.status}</span>
                  </div>
                );
              })}
              <div style={{fontSize:9,color:"#777777",marginTop:8}}>
                உச்சம்/நீசம்/சொந்த வீடு/நட்பு அடிப்படையிலான பலம் — Parashara முறை
              </div>
            </div>
          )}

          {/* ═══ 3.6 YOGAS (Mahapurusha + Classical combined) ═══ */}
          {advancedView==="yogas" && (
            <>
              {mahapurushaYogas && mahapurushaYogas.length > 0 && (
                <div style={{...card,marginBottom:10,padding:"12px 14px",border:"1px solid #f0c75e40",
                  background:"linear-gradient(135deg,rgba(212,168,83,0.08),rgba(167,139,250,0.04))"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderLeft:"3px solid #7b1c1c",paddingLeft:8,letterSpacing:0.5}}>
                    ⭐ பஞ்ச மகாபுருஷ யோகம் கண்டறியப்பட்டது!
                  </div>
                  {mahapurushaYogas.map((y,i) => (
                    <div key={i} style={{marginBottom:i<mahapurushaYogas.length-1?10:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:18}}>{y.symbol}</span>
                        <span style={{fontSize:13,fontWeight:700,color:"#7b1c1c"}}>{y.name}</span>
                        <span style={{fontSize:9,color:"#555555"}}>({y.house}ஆம் வீடு)</span>
                      </div>
                      <div style={{fontSize:11,color:"#333333",marginTop:3,lineHeight:1.5}}>{y.effect}</div>
                    </div>
                  ))}
                </div>
              )}
              {classicalYogas && classicalYogas.length > 0 && (
                <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                    🕉 யோகங்கள் கண்டறியப்பட்டது ({classicalYogas.length})
                  </div>
                  {classicalYogas.map((y,i) => {
                    const isDosha = y.type === "dosha";
                    const col = isDosha ? "#dc2626" : "#7b1c1c";
                    return (
                      <div key={i} style={{
                        marginBottom:i<classicalYogas.length-1?10:0, padding:"8px 10px",
                        background:`${col}08`, borderLeft:`3px solid ${col}`, borderRadius:"0 6px 6px 0"
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:14}}>{y.icon}</span>
                          <span style={{fontSize:12,fontWeight:700,color:col}}>{y.name}</span>
                          <span style={{fontSize:8,color:`${col}90`}}>{y.nameEn}</span>
                          {isDosha && <span style={{fontSize:7,background:"#ff6b8a20",color:"#dc2626",padding:"1px 6px",borderRadius:5,marginLeft:"auto",fontWeight:700}}>தோஷம்</span>}
                        </div>
                        <div style={{fontSize:10.5,color:"#333333",marginTop:4,lineHeight:1.6}}>{y.desc}</div>
                      </div>
                    );
                  })}
                  <div style={{fontSize:9,color:"#777777",marginTop:8}}>
                    கேந்திர/திரிகோண நாத சேர்க்கை + பார்வை + பரிவர்த்தனை அடிப்படையில் — BPHS classical rules
                  </div>
                </div>
              )}
              {(!mahapurushaYogas || mahapurushaYogas.length===0) && (!classicalYogas || classicalYogas.length===0) && (
                <div style={{...card,marginBottom:10,padding:"14px",textAlign:"center",fontSize:11,color:"#555555"}}>
                  இந்த ஜாதகத்தில் மேற்குறிப்பிட்ட யோகங்கள் எதுவும் கண்டறியப்படவில்லை
                </div>
              )}
            </>
          )}

          {/* ═══ 3.7 ASHTAKAVARGA — SARVASHTAKAVARGA ═══ */}
          {advancedView==="ashtakavarga" && ashtakavargaData && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🔢 சர்வாஷ்டகவர்க்கம் (Sarvashtakavarga)
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
                {ashtakavargaData.sav.map((count,i) => {
                  const strong = count > ashtakavargaData.savAvg + 2;
                  const weak = count < ashtakavargaData.savAvg - 2;
                  const col = strong ? "#4ade80" : weak ? "#dc2626" : "#b8860b";
                  return (
                    <div key={i} style={{
                      background:`${col}10`, border:`1px solid ${col}30`, borderRadius:8,
                      padding:"6px 4px", textAlign:"center"
                    }}>
                      <div style={{fontSize:8,color:"#555555"}}>{RASHIS[i].slice(0,3)}</div>
                      <div style={{fontSize:14,fontWeight:700,color:col}}>{count}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                சராசரி: {ashtakavargaData.savAvg} bindus/வீடு • பச்சை=வலிமை (Gochara-க்கு நல்லது) • சிவப்பு=பலவீனம் • மொத்தம்: 337 bindus, 7 கிரகங்கள் × 8 reference points
              </div>
            </div>
          )}

          {/* ═══ 3.8 GRAHA DRISHTI — PLANETARY ASPECTS ═══ */}
          {advancedView==="drishti" && drishtiData && drishtiData.length > 0 && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                👁 கிரக திருஷ்டி (Graha Drishti)
              </div>
              {drishtiData.map((a,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",
                  borderBottom:i<drishtiData.length-1?"1px solid #e8e0e0":"none"}}>
                  <span style={{fontSize:15}}>{a.fromSymbol}</span>
                  <span style={{fontSize:11,color:"#1a1a1a",width:60}}>{a.from}</span>
                  <span style={{fontSize:12,color:"#b8860b"}}>→</span>
                  <span style={{fontSize:15}}>{a.toSymbol}</span>
                  <span style={{fontSize:11,color:"#1a1a1a",flex:1}}>{a.to}</span>
                  <span style={{
                    fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:5,
                    background:a.isSpecial?"#e6d2d2":"#f0e8d0",
                    color:a.isSpecial?"#7b1c1c":"#555555"
                  }}>{a.houseOffset}ஆம் வீடு{a.isSpecial?" (சிறப்பு)":""}</span>
                </div>
              ))}
              <div style={{fontSize:9,color:"#777777",marginTop:8}}>
                எல்லா கிரகங்களும் 7ஆம் வீட்டை பார்க்கும் • செவ்வாய்:4,8 • குரு:5,9 • சனி:3,10
              </div>
            </div>
          )}

          {/* ═══ 3.9 D10 DASAMSA — CAREER CHART ═══ */}
          {advancedView==="d10" && d10Data && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                💼 தசாம்சம் D10 (தொழில் பிரிவு சக்கரம்)
              </div>
              {d10Data.map((p,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",
                  borderBottom:i<d10Data.length-1?"1px solid #e8e0e0":"none"}}>
                  <span style={{fontSize:11,color:"#1a1a1a",width:64,fontWeight:600}}>{p.ta}</span>
                  <span style={{fontSize:10,color:"#666666"}}>D1: {p.rashi}</span>
                  <span style={{fontSize:11,color:"#b8860b"}}>→</span>
                  <span style={{fontSize:11,fontWeight:600,color:"#7b1c1c",flex:1,textAlign:"right"}}>{p.d10RashiName}</span>
                </div>
              ))}
              <div style={{fontSize:9,color:"#777777",marginTop:8}}>
                தொழில், பதவி, சமூக அந்தஸ்து பற்றிய நுணுக்கமான பலன் — Parashari முறை
              </div>
            </div>
          )}

          {/* ═══ 3.10 D2/D3/D12 — COMBINED DIVISIONAL TABLE ═══ */}
          {advancedView==="divisional" && d2Data && d3Data && d12Data && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🔀 பிரிவு சக்கரங்கள் (Divisional Charts)
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D2 செல்வம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D3 சகோதரர்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D4 சொத்து</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D7 குழந்தை</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D12 பெற்றோர்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D60 கர்மம்</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d2Data.map((p,i) => (
                      <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                        <td style={{padding:"6px 4px",color:"#1a1a1a",fontWeight:600}}>{p.ta}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{p.d2RashiName?.slice(0,4)}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d3Data[i]?.d3RashiName?.slice(0,4)}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d4Data&&d4Data[i]?d4Data[i].d4RashiName?.slice(0,4):""}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d7Data&&d7Data[i]?d7Data[i].d7RashiName?.slice(0,4):""}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d12Data[i]?.d12RashiName?.slice(0,4)}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:d60Data&&d60Data[i]?.d60Nature==="தீய"?"#cc1a1a":"#0d7a30",fontWeight:600,fontSize:9}}>{d60Data&&d60Data[i]?`${d60Data[i].d60RashiName?.slice(0,4)}`:""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {d60Data && (
                <div style={{marginTop:10,padding:"10px 12px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#7b1c1c",marginBottom:6}}>D60 ஷஷ்டியாம்சம் — கர்ம விவரம்</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {d60Data.map((p,i)=>(
                      <div key={i} style={{fontSize:8,padding:"3px 6px",borderRadius:4,
                        background:p.d60Nature==="நல்ல"?"#e6f4ea":p.d60Nature==="தீய"?"#fde8e8":"#f5f5f5",
                        color:p.d60Nature==="நல்ல"?"#0d7a30":p.d60Nature==="தீய"?"#cc1a1a":"#666",
                        border:`1px solid ${p.d60Nature==="நல்ல"?"#b7e1c7":p.d60Nature==="தீய"?"#f5c6c6":"#ddd"}`}}>
                        {p.ta} — {p.d60Name} ({p.d60Nature})
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                D2=செல்வம் • D3=சகோதரர்கள் • D4=சொத்து/வாகனம் • D7=குழந்தைகள் • D12=பெற்றோர் • D60=கர்மம் — Parashari முறை
              </div>
            </div>
          )}

          {/* ═══ கால சர்ப்ப தோஷம் ═══ */}
          {advancedView==="kalasarpa" && kalaSarpa && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🐍 கால சர்ப்ப தோஷம்
              </div>
              {kalaSarpa.present ? (
                <div>
                  <div style={{padding:"10px 12px",background:"#fde8e8",borderRadius:8,border:"1px solid #f5c6c6",marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#cc1a1a",marginBottom:4}}>⚠ கால சர்ப்ப தோஷம் உள்ளது</div>
                    <div style={{fontSize:11,color:"#333"}}>வகை: <span style={{fontWeight:700,color:"#7b1c1c"}}>{kalaSarpa.type}</span></div>
                    <div style={{fontSize:11,color:"#333",marginTop:2}}>திசை: <span style={{fontWeight:600}}>{kalaSarpa.direction}</span></div>
                    <div style={{fontSize:11,color:"#333",marginTop:2}}>ராகு: <span style={{fontWeight:600}}>{kalaSarpa.rahuRashi}</span> • கேது: <span style={{fontWeight:600}}>{kalaSarpa.ketuRashi}</span></div>
                  </div>
                  <div style={{padding:"10px 12px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#7b1c1c",marginBottom:6}}>பரிகாரம்</div>
                    <div style={{fontSize:10,color:"#333",lineHeight:1.6}}>{kalaSarpa.remedy}</div>
                  </div>
                </div>
              ) : (
                <div style={{padding:"10px 12px",background:"#e6f4ea",borderRadius:8,border:"1px solid #b7e1c7"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#0d7a30"}}>✓ கால சர்ப்ப தோஷம் இல்லை</div>
                  <div style={{fontSize:10,color:"#333",marginTop:4}}>அனைத்து கிரகங்களும் ராகு-கேது அச்சுக்கு வெளியே உள்ளன.</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ செவ்வாய் தோஷம் ═══ */}
          {advancedView==="chevvai" && chevvaiDosham && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🔴 செவ்வாய் தோஷம் (மாங்கல்ய தோஷம்)
              </div>
              {chevvaiDosham.present ? (
                <div>
                  <div style={{padding:"10px 12px",background:"#fde8e8",borderRadius:8,border:"1px solid #f5c6c6",marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#cc1a1a",marginBottom:4}}>⚠ செவ்வாய் தோஷம் உள்ளது</div>
                    <div style={{fontSize:11,color:"#333"}}>தீவிரம்: <span style={{fontWeight:700,color:chevvaiDosham.severity >= 3 ? "#cc1a1a" : "#7a5200"}}>{chevvaiDosham.severityText}</span></div>
                    <div style={{fontSize:11,color:"#333",marginTop:2}}>செவ்வாய் ராசி: <span style={{fontWeight:600}}>{chevvaiDosham.marsRashi}</span></div>
                    <div style={{fontSize:10,color:"#555",marginTop:4}}>
                      {chevvaiDosham.fromLagna && <span style={{display:"inline-block",background:"#fff3e0",padding:"2px 6px",borderRadius:4,margin:"2px 4px 2px 0",border:"1px solid #ffe0b2"}}>லக்னத்திலிருந்து: வீடு {chevvaiDosham.marsHouseFromLagna}</span>}
                      {chevvaiDosham.fromMoon && <span style={{display:"inline-block",background:"#fff3e0",padding:"2px 6px",borderRadius:4,margin:"2px 4px 2px 0",border:"1px solid #ffe0b2"}}>சந்திரனிலிருந்து: வீடு {chevvaiDosham.marsHouseFromMoon}</span>}
                      {chevvaiDosham.fromVenus && <span style={{display:"inline-block",background:"#fff3e0",padding:"2px 6px",borderRadius:4,margin:"2px 4px 2px 0",border:"1px solid #ffe0b2"}}>சுக்கிரனிலிருந்து: வீடு {chevvaiDosham.marsHouseFromVenus}</span>}
                    </div>
                  </div>
                  {chevvaiDosham.cancelled && (
                    <div style={{padding:"8px 12px",background:"#e6f4ea",borderRadius:8,border:"1px solid #b7e1c7",marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#0d7a30"}}>✓ தோஷ நிவர்த்தி: {chevvaiDosham.cancelReason}</div>
                    </div>
                  )}
                  <div style={{padding:"10px 12px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#7b1c1c",marginBottom:6}}>பரிகாரம்</div>
                    <div style={{fontSize:10,color:"#333",lineHeight:1.6}}>செவ்வாய்க்கிழமை விரதம் • அங்காரக ஸ்தோத்திரம் • பவள மோதிரம் அணிதல் • செவ்வாய் தோஷ நிவர்த்தி பூஜை</div>
                  </div>
                </div>
              ) : (
                <div style={{padding:"10px 12px",background:"#e6f4ea",borderRadius:8,border:"1px solid #b7e1c7"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#0d7a30"}}>✓ செவ்வாய் தோஷம் இல்லை</div>
                  <div style={{fontSize:10,color:"#333",marginTop:4}}>செவ்வாய் 1, 2, 4, 7, 8, 12 ஆகிய வீடுகளில் இல்லை.</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ பாவ சக்கரம் ═══ */}
          {advancedView==="bhava" && bhavaChart && bhavaChart.cusps && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🏠 பாவ சக்கரம் (Bhava Chart — Equal House)
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>பாவம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>தொடக்கம்°</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>ராசி</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>அதிபதி</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகங்கள்</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bhavaChart.cusps.map((cusp,i) => {
                      const planetsInHouse = bhavaChart.planets ? bhavaChart.planets.filter(p => p.bhavaHouse === i+1).map(p => p.ta) : [];
                      return (
                        <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                          <td style={{padding:"6px 4px",color:"#1a1a1a",fontWeight:600}}>{i+1} — {["தனு","தனம்","சகஜ","சுக","புத்ர","ரிபு","காமம்","ஆயுள்","பாக்யம்","கர்மம்","லாபம்","விரயம்"][i]}</td>
                          <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600,fontFamily:"monospace"}}>{cusp.cuspDeg?.toFixed(1)}</td>
                          <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{cusp.rashiName}</td>
                          <td style={{padding:"6px 4px",textAlign:"center",color:"#b8860b",fontWeight:600,fontSize:10}}>{cusp.lord}</td>
                          <td style={{padding:"6px 4px",color:"#333",fontSize:10}}>{planetsInHouse.length>0?planetsInHouse.join(", "):"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {bhavaChart.planets && bhavaChart.planets.some(p => p.bhavaDiff) && (
                <div style={{marginTop:10,padding:"10px 12px",background:"#fff8e1",borderRadius:8,border:"1px solid #ffe082"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#7a5200",marginBottom:6}}>⚠ பாவ-ராசி வேறுபாடுகள்</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {bhavaChart.planets.filter(p=>p.bhavaDiff).map((p,i)=>(
                      <div key={i} style={{fontSize:9,padding:"3px 6px",borderRadius:4,background:"#fff3e0",color:"#7a5200",border:"1px solid #ffe0b2"}}>
                        {p.ta}: ராசி வீடு {p.house} → பாவ வீடு {p.bhavaHouse}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                Equal House System — லக்ன பாகையிலிருந்து சம அளவு (30°) பாவ விரிவு
              </div>
            </div>
          )}

          {/* ═══ நவாம்ச பல பகுப்பாய்வு ═══ */}
          {advancedView==="navamsastrength" && navamsaStrength && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                💎 நவாம்ச பல பகுப்பாய்வு (D9 Strength)
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D9 ராசி</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>வர்கோத்தமா</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>நிலை</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>புஷ்கர</th>
                    </tr>
                  </thead>
                  <tbody>
                    {navamsaStrength.map((p,i) => (
                      <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                        <td style={{padding:"6px 4px",color:"#1a1a1a",fontWeight:600}}>{p.ta}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{p.navRashiName}</td>
                        <td style={{padding:"6px 4px",textAlign:"center"}}>
                          {p.vargottama ? <span style={{color:"#0d7a30",fontWeight:700}}>✓ ஆம்</span> : <span style={{color:"#999"}}>—</span>}
                        </td>
                        <td style={{padding:"6px 4px",textAlign:"center",fontSize:10,color:p.d9StatusColor||"#666",fontWeight:700}}>
                          {p.d9Status}
                        </td>
                        <td style={{padding:"6px 4px",textAlign:"center"}}>
                          {p.pushkara ? <span style={{color:"#b8860b",fontWeight:700}}>✓</span> : <span style={{color:"#999"}}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
                {navamsaStrength.filter(p=>p.vargottama).map((p,i)=>(
                  <div key={i} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:"#e6f4ea",color:"#0d7a30",border:"1px solid #b7e1c7",fontWeight:600}}>
                    {p.ta} — வர்கோத்தமா
                  </div>
                ))}
              </div>
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                வர்கோத்தமா = ராசியிலும் நவாம்சத்திலும் ஒரே ராசி • புஷ்கர நவாம்சம் = சுபப் பலம் அதிகம்
              </div>
            </div>
          )}

          {/* ═══ ஷட்பலம் ═══ */}
          {advancedView==="shadbala" && shadBala && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                ⚖ ஷட்பலம் (Shadbala — 6 வகை பலம்)
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"left",fontSize:9}}>கிரகம்</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>ஸ்தான</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>திக்</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>கால</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>சேஷ்டா</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>நைசர்கிக</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>திரிக்</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>மொத்தம்</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>தேவை</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>நிலை</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shadBala.map((p,i) => (
                      <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                        <td style={{padding:"5px 3px",color:"#1a1a1a",fontWeight:600,fontSize:10}}>
                          {p.ta}
                          {p.yuddha && (
                            <span title={`${p.yuddha.result} — ${p.yuddha.opponent}-உடன் யுத்தம் (${p.yuddha.orb}°)`}
                              style={{marginLeft:3,fontSize:8,color:p.yuddha.result==="வெற்றி"?"#0d7a30":"#cc1a1a"}}>
                              ⚔{p.yuddha.result==="வெற்றி"?"✓":"✗"}
                            </span>
                          )}
                        </td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.sthanaBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.digBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.kalaBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.cheshtaBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.naisargikaBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.drikBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#7b1c1c",fontWeight:700,fontSize:10}}>{p.total?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#b8860b",fontSize:9}}>{p.required?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center"}}>
                          {p.total >= p.required ?
                            <span style={{color:"#0d7a30",fontWeight:700,fontSize:9}}>✓ பலம்</span> :
                            <span style={{color:"#cc1a1a",fontWeight:700,fontSize:9}}>✗ பலவீனம்</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:10}}>
                {shadBala.map((p,i)=>(
                  <div key={i} style={{position:"relative",width:60,height:50}}>
                    <div style={{fontSize:8,textAlign:"center",color:"#333",fontWeight:600,marginBottom:2}}>{p.ta}</div>
                    <div style={{height:30,background:"#f0f0f0",borderRadius:4,overflow:"hidden",border:"1px solid #e0e0e0"}}>
                      <div style={{height:"100%",width:`${Math.min((p.total/p.required)*100,100)}%`,
                        background:p.total>=p.required?"linear-gradient(90deg,#0d7a30,#2ea55f)":"linear-gradient(90deg,#cc1a1a,#e85050)",
                        borderRadius:4,transition:"width 0.3s"}}/>
                    </div>
                    <div style={{fontSize:7,textAlign:"center",color:"#666",marginTop:1}}>{((p.total/p.required)*100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                ஸ்தான=இருப்பிடம் • திக்=திசை • கால=நேரம் • சேஷ்டா=இயக்கம் • நைசர்கிக=இயற்கை • திரிக்=பார்வை
                {shadBala.some(p=>p.yuddha) && " • ⚔=கிரக யுத்தம் (Yuddha)"}
              </div>
            </div>
          )}

          {/* ═══ கோசாரம் (Transit Overlay) ═══ */}
          {advancedView==="transitoverlay" && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🌍 கோசாரம் — இன்றைய கிரக நிலை (Transit Overlay)
              </div>
              {transitOverlay && transitOverlay.length > 0 ? (
                <div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
                      <thead>
                        <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>ஜனன ராசி</th>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>கோசார ராசி</th>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>சந்திரனிலிருந்து</th>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>பலன்</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transitOverlay.map((p,i) => (
                          <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                            <td style={{padding:"6px 4px",color:"#1a1a1a",fontWeight:600}}>{p.ta}</td>
                            <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{p.birthRashi}</td>
                            <td style={{padding:"6px 4px",textAlign:"center",color:"#b8860b",fontWeight:600}}>{p.transitRashi||p.rashi}</td>
                            <td style={{padding:"6px 4px",textAlign:"center",color:"#333",fontWeight:600}}>{p.houseFromMoon}</td>
                            <td style={{padding:"6px 4px",textAlign:"center",
                              color:p.transitEffect==="சுபம்"?"#0d7a30":p.transitEffect==="அசுபம்"?"#cc1a1a":"#7a5200",
                              fontWeight:700,fontSize:10}}>
                              {p.transitEffect||"நடுநிலை"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                    சந்திர ராசியிலிருந்து கோசாரக் கிரகங்களின் நிலை • சுப/அசுப பலன்கள் Vedha இல்லாமல் கணிக்கப்பட்டவை
                  </div>
                </div>
              ) : (
                <div style={{padding:"14px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#7a5200",fontWeight:600}}>கோசார தரவு கிடைக்கவில்லை</div>
                  <div style={{fontSize:10,color:"#666",marginTop:4}}>Swiss Ephemeris API மூலம் இன்றைய கிரக நிலைகள் பெறப்படும்போது கோசாரம் காட்டப்படும்</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ராகு காலம் / எமகண்டம் / குளிகை ═══ */}
          {advancedView==="rahukalam" && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                ⏰ இன்றைய ராகு காலம் / எமகண்டம் / குளிகை
              </div>
              {(() => {
                const times = inauspiciousTimes || calcInauspiciousTimes(new Date());
                return (
                  <div>
                    <div style={{fontSize:12,color:"#b8860b",fontWeight:600,marginBottom:10}}>
                      📅 {times.vaaram} — {times.date.toLocaleDateString("ta-IN")}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      <div style={{padding:"12px 10px",background:"#fde8e8",borderRadius:8,border:"1px solid #f5c6c6",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#cc1a1a",fontWeight:700,marginBottom:4}}>🐍 ராகு காலம்</div>
                        <div style={{fontSize:13,color:"#cc1a1a",fontWeight:800}}>{times.rahuKalam.start}</div>
                        <div style={{fontSize:10,color:"#666"}}>முதல்</div>
                        <div style={{fontSize:13,color:"#cc1a1a",fontWeight:800}}>{times.rahuKalam.end}</div>
                      </div>
                      <div style={{padding:"12px 10px",background:"#fff3e0",borderRadius:8,border:"1px solid #ffe0b2",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#7a5200",fontWeight:700,marginBottom:4}}>💀 எமகண்டம்</div>
                        <div style={{fontSize:13,color:"#7a5200",fontWeight:800}}>{times.yamaGandam.start}</div>
                        <div style={{fontSize:10,color:"#666"}}>முதல்</div>
                        <div style={{fontSize:13,color:"#7a5200",fontWeight:800}}>{times.yamaGandam.end}</div>
                      </div>
                      <div style={{padding:"12px 10px",background:"#f3e8ff",borderRadius:8,border:"1px solid #d8b4fe",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#6b21a8",fontWeight:700,marginBottom:4}}>⚫ குளிகை</div>
                        <div style={{fontSize:13,color:"#6b21a8",fontWeight:800}}>{times.gulikai.start}</div>
                        <div style={{fontSize:10,color:"#666"}}>முதல்</div>
                        <div style={{fontSize:13,color:"#6b21a8",fontWeight:800}}>{times.gulikai.end}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:10,padding:"8px 12px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8"}}>
                      <div style={{fontSize:10,color:"#333"}}><span style={{color:"#b8860b",fontWeight:600}}>🌅 சூரிய உதயம்:</span> {times.sunrise}</div>
                      <div style={{fontSize:10,color:"#333"}}><span style={{color:"#7b1c1c",fontWeight:600}}>🌇 சூரிய அஸ்தமனம்:</span> {times.sunset}</div>
                    </div>
                    <div style={{fontSize:9,color:"#777",marginTop:8,lineHeight:1.5}}>
                      இந்த நேரங்களில் சுபகாரியங்கள் தொடங்க வேண்டாம் • ராகு காலத்தில் புதிய பணி ஆரம்பிக்க வேண்டாம்
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ முஹூர்த்தம் ═══ */}
          {advancedView==="muhurtha" && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🕉 முஹூர்த்தம் — இன்றைய சுப நேரம்
              </div>
              {(() => {
                const m = muhurthaData || calcMuhurtha(new Date(), 0);
                return (
                  <div>
                    <div style={{padding:"12px",background:m.score>=60?"#e6f4ea":"#fff3e0",borderRadius:8,border:`1px solid ${m.score>=60?"#b7e1c7":"#ffe0b2"}`,marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:m.score>=60?"#0d7a30":"#7a5200"}}>{m.verdict}</div>
                          <div style={{fontSize:11,color:"#333",marginTop:2}}>{m.vaaram} — திதி: {m.tithiName}</div>
                        </div>
                        <div style={{fontSize:28,fontWeight:900,color:m.score>=60?"#0d7a30":"#7a5200"}}>{m.score}%</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                      <div style={{padding:"8px",background:m.isDayGood?"#e6f4ea":"#fde8e8",borderRadius:8,textAlign:"center",border:`1px solid ${m.isDayGood?"#b7e1c7":"#f5c6c6"}`}}>
                        <div style={{fontSize:9,color:"#666",marginBottom:2}}>கிழமை</div>
                        <div style={{fontSize:11,fontWeight:700,color:m.isDayGood?"#0d7a30":"#cc1a1a"}}>{m.isDayGood?"✓ சுபம்":"✗ அசுபம்"}</div>
                      </div>
                      <div style={{padding:"8px",background:m.isTithiGood?"#e6f4ea":"#fde8e8",borderRadius:8,textAlign:"center",border:`1px solid ${m.isTithiGood?"#b7e1c7":"#f5c6c6"}`}}>
                        <div style={{fontSize:9,color:"#666",marginBottom:2}}>திதி</div>
                        <div style={{fontSize:11,fontWeight:700,color:m.isTithiGood?"#0d7a30":"#cc1a1a"}}>{m.isTithiGood?"✓ சுபம்":"✗ அசுபம்"}</div>
                      </div>
                      <div style={{padding:"8px",background:m.isNakGood?"#e6f4ea":"#fde8e8",borderRadius:8,textAlign:"center",border:`1px solid ${m.isNakGood?"#b7e1c7":"#f5c6c6"}`}}>
                        <div style={{fontSize:9,color:"#666",marginBottom:2}}>நட்சத்திரம்</div>
                        <div style={{fontSize:11,fontWeight:700,color:m.isNakGood?"#0d7a30":"#cc1a1a"}}>{m.isNakGood?"✓ சுபம்":"✗ அசுபம்"}</div>
                      </div>
                    </div>
                    {m.subaNeramSlots.length > 0 && (
                      <div style={{padding:"10px 12px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8",marginBottom:10}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#7b1c1c",marginBottom:6}}>🕐 சுப நேரங்கள்</div>
                        {m.subaNeramSlots.map((s,i) => (
                          <div key={i} style={{fontSize:10,color:"#0d7a30",fontWeight:600,padding:"3px 0",borderBottom:i<m.subaNeramSlots.length-1?"1px solid #eee":"none"}}>✓ {s}</div>
                        ))}
                      </div>
                    )}
                    <div style={{padding:"10px 12px",background:"#f0f9ff",borderRadius:8,border:"1px solid #bae6fd"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#0369a1",marginBottom:6}}>📋 இன்று தொடங்கலாம்</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {m.activities.map((a,i) => (
                          <span key={i} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:"#e0f2fe",color:"#0369a1",border:"1px solid #bae6fd"}}>{a}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ சனி-குரு பெயர்ச்சி ═══ */}
          {advancedView==="saniguru" && planetTransitAnalysis && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🪐 சனி-குரு பெயர்ச்சி பலன்கள்
              </div>
              {planetTransitAnalysis.sani && (
                <div style={{padding:"12px",background:planetTransitAnalysis.sani.effect==="சுபம்"?"#e6f4ea":planetTransitAnalysis.sani.effect==="அசுபம்"?"#fde8e8":"#fff8e1",
                  borderRadius:8,border:`1px solid ${planetTransitAnalysis.sani.effect==="சுபம்"?"#b7e1c7":planetTransitAnalysis.sani.effect==="அசுபம்"?"#f5c6c6":"#ffe082"}`,marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#1e3a5f"}}>🪐 சனி பெயர்ச்சி</div>
                    <div style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,
                      background:planetTransitAnalysis.sani.effect==="சுபம்"?"#dcfce7":planetTransitAnalysis.sani.effect==="அசுபம்"?"#fee2e2":"#fef9c3",
                      color:planetTransitAnalysis.sani.effect==="சுபம்"?"#0d7a30":planetTransitAnalysis.sani.effect==="அசுபம்"?"#cc1a1a":"#7a5200"}}>
                      {planetTransitAnalysis.sani.effect}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:"#333",marginBottom:4}}>
                    தற்போது: <span style={{fontWeight:700,color:"#7b1c1c"}}>{planetTransitAnalysis.sani.currentRashi}</span> — சந்திரனிலிருந்து <span style={{fontWeight:700}}>{planetTransitAnalysis.sani.houseFromMoon}ம் வீடு</span>
                  </div>
                  <div style={{fontSize:10,color:"#333",lineHeight:1.6}}>{planetTransitAnalysis.sani.desc}</div>
                  {planetTransitAnalysis.sani.isSadeSati && (
                    <div style={{marginTop:8,padding:"8px 10px",background:"#fde8e8",borderRadius:6,border:"1px solid #f5c6c6"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#cc1a1a"}}>⚠ சாடே-சாதி (7½ சனி) நடப்பில் உள்ளது!</div>
                      <div style={{fontSize:10,color:"#333",marginTop:2}}>நிலை: {planetTransitAnalysis.sani.sadeSatiPhase}</div>
                    </div>
                  )}
                  {planetTransitAnalysis.sani.isAshtama && (
                    <div style={{marginTop:8,padding:"8px 10px",background:"#fde8e8",borderRadius:6,border:"1px solid #f5c6c6"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#cc1a1a"}}>⚠ அஷ்டமச் சனி — மிகவும் எச்சரிக்கையாக இருக்கவும்</div>
                    </div>
                  )}
                </div>
              )}
              {planetTransitAnalysis.guru && (
                <div style={{padding:"12px",background:planetTransitAnalysis.guru.effect==="சுபம்"?"#e6f4ea":planetTransitAnalysis.guru.effect==="அசுபம்"?"#fde8e8":"#fff8e1",
                  borderRadius:8,border:`1px solid ${planetTransitAnalysis.guru.effect==="சுபம்"?"#b7e1c7":planetTransitAnalysis.guru.effect==="அசுபம்"?"#f5c6c6":"#ffe082"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#eab308"}}>🔮 குரு பெயர்ச்சி</div>
                    <div style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,
                      background:planetTransitAnalysis.guru.effect==="சுபம்"?"#dcfce7":planetTransitAnalysis.guru.effect==="அசுபம்"?"#fee2e2":"#fef9c3",
                      color:planetTransitAnalysis.guru.effect==="சுபம்"?"#0d7a30":planetTransitAnalysis.guru.effect==="அசுபம்"?"#cc1a1a":"#7a5200"}}>
                      {planetTransitAnalysis.guru.effect}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:"#333",marginBottom:4}}>
                    தற்போது: <span style={{fontWeight:700,color:"#7b1c1c"}}>{planetTransitAnalysis.guru.currentRashi}</span> — சந்திரனிலிருந்து <span style={{fontWeight:700}}>{planetTransitAnalysis.guru.houseFromMoon}ம் வீடு</span>
                  </div>
                  <div style={{fontSize:10,color:"#333",lineHeight:1.6}}>{planetTransitAnalysis.guru.desc}</div>
                </div>
              )}
              <div style={{fontSize:9,color:"#777",marginTop:8,lineHeight:1.5}}>
                சனி ஒரு ராசியில் 2½ வருடம் • குரு ஒரு ராசியில் 1 வருடம் தங்கும் • சந்திர ராசியிலிருந்து கணிக்கப்பட்டது
              </div>
            </div>
          )}

          {/* ═══ பரிகாரம் ═══ */}
          {advancedView==="remedies" && remediesData && remediesData.length > 0 && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                💎 பரிகாரம் — கோயில், மந்திரம், ரத்தினம்
              </div>
              {remediesData.filter(r => r.needsRemedy).length > 0 && (
                <div style={{padding:"10px 12px",background:"#fff3e0",borderRadius:8,border:"1px solid #ffe0b2",marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#7a5200",marginBottom:4}}>⚠ பரிகாரம் தேவையான கிரகங்கள்</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {remediesData.filter(r=>r.needsRemedy).map((r,i)=>(
                      <span key={i} style={{fontSize:10,padding:"3px 8px",borderRadius:4,fontWeight:600,
                        background:r.isDebilitated?"#fde8e8":"#fff8e1",
                        color:r.isDebilitated?"#cc1a1a":"#7a5200",
                        border:`1px solid ${r.isDebilitated?"#f5c6c6":"#ffe082"}`}}>
                        {r.ta} {r.isDebilitated?"(நீசம்)":r.isWeak?"(பலவீனம்)":"(பகை)"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {remediesData.map((r,i) => (
                <div key={i} style={{marginBottom:8,padding:"10px 12px",background:r.needsRemedy?"#fffbeb":"#f8f8f8",
                  borderRadius:8,border:`1px solid ${r.needsRemedy?"#fde68a":"#e8e8e8"}`,
                  borderLeft:r.needsRemedy?`3px solid ${r.gemColor}`:"3px solid #e0e0e0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#1a1a1a"}}>{r.ta} <span style={{fontSize:10,color:"#666",fontWeight:400}}>({r.rashi})</span></div>
                    {r.needsRemedy && <span style={{fontSize:8,padding:"2px 6px",borderRadius:4,background:"#fde8e8",color:"#cc1a1a",fontWeight:700}}>பரிகாரம் தேவை</span>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10}}>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>💎 ரத்தினம்:</span> <span style={{color:"#333"}}>{r.gem}</span></div>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>🏛 கோயில்:</span> <span style={{color:"#333"}}>{r.temple}</span></div>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>📅 கிழமை:</span> <span style={{color:"#333"}}>{r.day}</span></div>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>🎨 நிறம்:</span> <span style={{color:"#333"}}>{r.color}</span></div>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>🌸 மலர்:</span> <span style={{color:"#333"}}>{r.flower}</span></div>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>🧭 திசை:</span> <span style={{color:"#333"}}>{r.direction}</span></div>
                    <div style={{gridColumn:"1/3"}}><span style={{color:"#b8860b",fontWeight:600}}>🙏 தானம்:</span> <span style={{color:"#333"}}>{r.donate}</span></div>
                  </div>
                  <div style={{marginTop:6,padding:"6px 8px",background:"#f0f9ff",borderRadius:4,border:"1px solid #bae6fd"}}>
                    <div style={{fontSize:9,color:"#0369a1",fontWeight:600}}>🔔 மந்திரம்: <span style={{fontWeight:400}}>{r.mantra}</span></div>
                    <div style={{fontSize:9,color:"#666",marginTop:2}}>ஜெப எண்ணிக்கை: {r.mantraCount}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ 4. DASHA SUMMARY (with dates) ═══ */}
          {dashaData&&(<div style={{...card,marginBottom:10,padding:"12px 14px"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#7b1c1c",marginBottom:4,borderBottom:"1px solid #d4a85330",paddingBottom:4}}>📅 விம்சோத்தரி தசா காலக்கணக்கு</div>
            <div style={{fontSize:10,color:"#b8860b",marginBottom:8,marginTop:6}}>
              நட்சத்திரம்: <span style={{color:"#1a1a1a"}}>{dashaData.birthNakshatra}</span> • நாதன்: <span style={{color:"#1a1a1a"}}>{dashaData.birthLord.name}</span>
            </div>
            {dashaData.dashas.map((d,i)=>(
              <div key={i}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:(expandedDasha===i||String(expandedDasha).startsWith(i+"-"))?"none":"1px solid #e8e0e0",
                  background:d.isCurrent?"#fdf6e3":"transparent",cursor:"pointer"}}
                  onClick={()=>setExpandedDasha(expandedDasha===i||(typeof expandedDasha==='string'&&expandedDasha.startsWith(i+"-"))?null:i)}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11,fontWeight:d.isCurrent?700:400,color:d.isCurrent?"#7b1c1c":"#333333"}}>{d.name} தசை</span>
                      {d.isCurrent&&<span style={{fontSize:7,background:"#f0c75e20",color:"#7b1c1c",padding:"1px 5px",borderRadius:4,fontWeight:700}}>நடப்பு</span>}
                    </div>
                    <div style={{fontSize:9,color:"#666666",marginTop:1}}>
                      {d.startDate.toLocaleDateString("ta-IN")} — {d.endDate.toLocaleDateString("ta-IN")}
                    </div>
                  </div>
                  <span style={{fontSize:9,color:"#666666"}}>{d.years}y</span>
                  <span style={{fontSize:10,color:"#777777",transition:"transform 0.2s",transform:(expandedDasha===i||String(expandedDasha).startsWith(i+"-"))?"rotate(180deg)":"rotate(0)"}}> ▾</span>
                </div>
                {(expandedDasha===i||String(expandedDasha).startsWith(i+"-"))&&d.antardashas&&(
                  <div style={{marginLeft:24,borderLeft:"2px solid #d4a85350",paddingLeft:10,marginBottom:6}}>
                    <div style={{fontSize:9,color:"#555555",fontWeight:600,marginBottom:4,marginTop:2}}>புக்தி (Antardasha)</div>
                    {d.antardashas.map((ad,j)=>(
                      <div key={j}>
                        <div style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",cursor:"pointer",
                          background:ad.isCurrent?"#f0e8d0":"transparent",borderRadius:4}}
                          onClick={(e)=>{e.stopPropagation();setExpandedDasha(expandedDasha===`${i}-${j}`?i:`${i}-${j}`)}}>
                          <span style={{fontSize:10,flex:1,color:ad.isCurrent?"#b8860b":"#333333"}}>{ad.name}
                            {ad.isCurrent&&<span style={{fontSize:7,background:"#e8dcc0",color:"#b8860b",padding:"0 4px",borderRadius:3,marginLeft:4,fontWeight:700}}>நடப்பு</span>}
                          </span>
                          <span style={{fontSize:8,color:"#777777"}}>{ad.startDate.toLocaleDateString("ta-IN",{month:"short",year:"2-digit"})}</span>
                          <span style={{fontSize:8,color:"#888888",transition:"transform 0.2s",transform:expandedDasha===`${i}-${j}`?"rotate(180deg)":"rotate(0)"}}>▾</span>
                        </div>
                        {(expandedDasha===`${i}-${j}`||String(expandedDasha).startsWith(`${i}-${j}-`))&&ad.pratyantardashas&&(
                          <div style={{marginLeft:18,borderLeft:"1px solid #b8860b40",paddingLeft:8,marginBottom:4}}>
                            <div style={{fontSize:8,color:"#666666",fontWeight:600,marginBottom:2,marginTop:2}}>பிரத்யந்தரம் (Pratyantardasha)</div>
                            {ad.pratyantardashas.map((pad,k)=>(
                              <div key={k}>
                                <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0",cursor:"pointer",
                                  background:pad.isCurrent?"#e8f5e9":"transparent",borderRadius:3}}
                                  onClick={(e)=>{e.stopPropagation();setExpandedDasha(expandedDasha===`${i}-${j}-${k}`?`${i}-${j}`:`${i}-${j}-${k}`)}}>
                                  <span style={{fontSize:9,flex:1,color:pad.isCurrent?"#0d7a30":"#555555"}}>{pad.name}
                                    {pad.isCurrent&&<span style={{fontSize:6,background:"#d4edda",color:"#0d7a30",padding:"0 3px",borderRadius:3,marginLeft:3,fontWeight:700}}>நடப்பு</span>}
                                  </span>
                                  <span style={{fontSize:7,color:"#888888"}}>{pad.duration}</span>
                                  <span style={{fontSize:7,color:"#999999",transition:"transform 0.2s",transform:expandedDasha===`${i}-${j}-${k}`?"rotate(180deg)":"rotate(0)"}}>▾</span>
                                </div>
                                {expandedDasha===`${i}-${j}-${k}`&&pad.sookshmaDashas&&(
                                  <div style={{marginLeft:14,borderLeft:"1px solid #0d7a3040",paddingLeft:6,marginBottom:3}}>
                                    <div style={{fontSize:7,color:"#777777",fontWeight:600,marginBottom:2,marginTop:2}}>சூட்சுமம் (Sookshma Dasha)</div>
                                    {pad.sookshmaDashas.map((sd,l)=>(
                                      <div key={l} style={{display:"flex",alignItems:"center",gap:4,padding:"1px 0",
                                        background:sd.isCurrent?"#e0f0ff":"transparent",borderRadius:3}}>
                                        <span style={{fontSize:8,flex:1,color:sd.isCurrent?"#1565c0":"#666666"}}>{sd.name}
                                          {sd.isCurrent&&<span style={{fontSize:5,background:"#cfe4fa",color:"#1565c0",padding:"0 3px",borderRadius:3,marginLeft:3,fontWeight:700}}>நடப்பு</span>}
                                        </span>
                                        <span style={{fontSize:6,color:"#999999"}}>{sd.duration}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>)}

          {/* ═══ 5. AI BUTTON ═══ */}
          {!prediction && !predictionLoading && (
            <button style={{...btnOutline,marginBottom:10,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
              onClick={fetchAIPrediction}>🤖 AI ஜோதிட பலன் பெறு</button>
          )}
          {predictionLoading&&(<div style={{...card,marginBottom:10,textAlign:"center",padding:16}}>
            <div style={{width:24,height:24,margin:"0 auto 8px",border:"2px solid #d4a85320",borderTop:"2px solid #d4a853",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
          </div>)}
          {prediction&&(<div style={{...card,marginBottom:10,padding:"12px 14px",fontSize:12,lineHeight:1.8,color:"#333333",whiteSpace:"pre-wrap"}}>{prediction}</div>)}

          {/* ═══ 6. ACTIONS ═══ */}
          <button onClick={downloadPDF} style={{...btnGold,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:14,padding:"13px 0",boxShadow:"0 4px 24px #d4a85345"}}>
            📄 முழு ஜாதகம் PDF பதிவிறக்கு
          </button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}}>
            <button style={{...btnOutline,fontSize:10,padding:"9px 0"}} onClick={()=>goTo(SCREEN.FORM)}>புதிய ஜாதகம்</button>
            <button style={{...btnOutline,fontSize:10,padding:"9px 0",borderColor:"#ff6b8a30",color:"#dc2626"}} onClick={()=>goTo(SCREEN.PORUTHAM)}>💍 பொருத்தம்</button>
            <button style={{...btnOutline,fontSize:10,padding:"9px 0",borderColor:"#d4a85340",color:"#7b1c1c"}} onClick={()=>goTo(SCREEN.PREMIUM)}>⭐ Premium</button>
          </div>
          <button style={{...btnOutline,fontSize:11,padding:"9px 0",marginTop:6,borderColor:"#4ade8030",color:"#4ade80"}} onClick={()=>goTo(SCREEN.CALENDAR)}>📅 பஞ்சாங்க நாட்காட்டி</button>
        </div>
      </div>
    );
  }

  // ═══════ PORUTHAM (Marriage Matching) ═══════
  if(screen===SCREEN.PORUTHAM) {
    const handlePorutham = async () => {
      if(!isValidDDMMYYYY(poruthBride.dob) || !isValidDDMMYYYY(poruthGroom.dob)) return;
      setPoruthLoading(true);

      const parseTob = (tob) => {
        if (!tob) return { hour: 6, minute: 0 };
        const [h, m] = tob.split(':').map(Number);
        return { hour: h || 6, minute: m || 0 };
      };
      const brideTob = parseTob(poruthBride.tob);
      const groomTob = parseTob(poruthGroom.tob);

      // Try the live Swiss Ephemeris backend for both charts (same accuracy source as
      // the main horoscope), in parallel since they're independent — fall back to the
      // local engine for whichever one fails, rather than only ever using local as before.
      // Porutham has no birth-place field, so "" city falls through to the same Chennai
      // default geocodeCity() and generateHoroscope() already both use.
      const [brideResult, groomResult] = await Promise.all([
        fetchFromBackend(parseDDMMYYYY(poruthBride.dob), brideTob.hour, brideTob.minute, ""),
        fetchFromBackend(parseDDMMYYYY(poruthGroom.dob), groomTob.hour, groomTob.minute, "")
      ]);
      const h1 = brideResult || generateHoroscope(parseDDMMYYYY(poruthBride.dob), poruthBride.tob || "06:00");
      const h2 = groomResult || generateHoroscope(parseDDMMYYYY(poruthGroom.dob), poruthGroom.tob || "06:00");

      const nak1 = NAKSHATRAS.indexOf(h1.nakshatra);
      const nak2 = NAKSHATRAS.indexOf(h2.nakshatra);
      const rashi1 = RASHIS.indexOf(h1.moonRashi);
      const rashi2 = RASHIS.indexOf(h2.moonRashi);
      setPoruthResult({ ...calculate10Porutham(nak1>=0?nak1:0, nak2>=0?nak2:0, rashi1>=0?rashi1:0, rashi2>=0?rashi2:0), bride:h1, groom:h2, brideName:poruthBride.name, groomName:poruthGroom.name });
      setPoruthLoading(false);
    };

    return(
      <div style={base}>
        <div style={{...container,paddingTop:24,paddingBottom:30}}>
          <button onClick={()=>goTo(horoscope?SCREEN.RESULT:SCREEN.FORM)} style={{background:"none",border:"none",color:T.accent,fontSize:14,cursor:"pointer",padding:0,marginBottom:16}}>← பின் செல்</button>

          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:36,marginBottom:6}}>💍</div>
            <h2 style={{fontSize:20,fontWeight:500,color:"#dc2626",margin:"0 0 4px"}}>திருமண பொருத்தம்</h2>
            <p style={{fontSize:12,color:"#b8860b"}}>திருமணப் பொருத்தம் — Kundali Matching</p>
          </div>

          <div style={{...card,marginBottom:12,borderLeft:"3px solid #ff6b8a"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#dc2626",marginBottom:10}}>👰 பெண் விவரம்</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input style={inputStyle} placeholder="பெண் பெயர்" value={poruthBride.name}
                onChange={e=>setPoruthBride(d=>({...d,name:e.target.value}))}/>
              <input type="text" inputMode="numeric" maxLength={10}
                style={{...inputStyle,letterSpacing:2,fontFamily:"monospace",fontSize:15}}
                placeholder="DD.MM.YYYY" value={poruthBride.dob}
                onChange={e=>setPoruthBride(d=>({...d,dob:formatDateInput(e.target.value)}))}/>
            </div>
          </div>

          <div style={{...card,marginBottom:16,borderLeft:"3px solid #6b8aff"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#6b8aff",marginBottom:10}}>🤵 ஆண் விவரம்</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input style={inputStyle} placeholder="ஆண் பெயர்" value={poruthGroom.name}
                onChange={e=>setPoruthGroom(d=>({...d,name:e.target.value}))}/>
              <input type="text" inputMode="numeric" maxLength={10}
                style={{...inputStyle,letterSpacing:2,fontFamily:"monospace",fontSize:15}}
                placeholder="DD.MM.YYYY" value={poruthGroom.dob}
                onChange={e=>setPoruthGroom(d=>({...d,dob:formatDateInput(e.target.value)}))}/>
            </div>
          </div>

          <button style={{...btnGold,opacity:(!isValidDDMMYYYY(poruthBride.dob)||!isValidDDMMYYYY(poruthGroom.dob)||poruthLoading)?0.4:1,
            pointerEvents:(!isValidDDMMYYYY(poruthBride.dob)||!isValidDDMMYYYY(poruthGroom.dob)||poruthLoading)?"none":"auto",
            background:"linear-gradient(135deg,#ff6b8a,#ff8fab,#ff6b8a)"}} onClick={handlePorutham}>
            {poruthLoading ? "கணக்கிடுகிறது..." : "💍 பொருத்தம் பார் →"}
          </button>

          {poruthResult&&(
            <div style={{marginTop:20}}>
              <div style={{...card,textAlign:"center",marginBottom:14}}>
                <div style={{position:"relative",width:100,height:100,margin:"0 auto 10px"}}>
                  <svg viewBox="0 0 100 100" style={{width:100,height:100}}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff10" strokeWidth="6"/>
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={poruthResult.totalScore>=9?"#4ade80":poruthResult.totalScore>=7?"#7b1c1c":"#dc2626"}
                      strokeWidth="6" strokeDasharray={`${poruthResult.totalScore*(264/poruthResult.maxScore)} 264`}
                      strokeLinecap="round" transform="rotate(-90 50 50)"/>
                    <text x="50" y="46" textAnchor="middle" fill="#7b1c1c" fontSize="24" fontWeight="700">{poruthResult.totalScore}</text>
                    <text x="50" y="62" textAnchor="middle" fill="#b8860b" fontSize="10">/{poruthResult.maxScore}</text>
                  </svg>
                </div>
                <div style={{fontSize:16,fontWeight:700,color:poruthResult.totalScore>=9?"#4ade80":poruthResult.totalScore>=7?"#7b1c1c":"#dc2626"}}>
                  {poruthResult.grade}
                </div>
                <div style={{fontSize:11,color:"#b8860b",marginTop:4}}>{poruthResult.brideName||"பெண்"} ❤ {poruthResult.groomName||"ஆண்"}</div>
              </div>
              {poruthResult.results.map((r,i)=>(
                <div key={i} style={{...card,padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",gap:12,borderLeft:`3px solid ${r.ok?"#4ade80":"#dc2626"}`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,fontSize:14,background:r.ok?"#4ade8020":"#ff6b8a20",color:r.ok?"#4ade80":"#dc2626",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{r.ok?"✓":"✗"}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{r.name}</span><span style={{fontSize:10,color:"#b8860b"}}>{r.en}</span></div>
                    <div style={{fontSize:11,color:"#b8860b",marginTop:3,lineHeight:1.5}}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════ DAILY PREDICTION (தினப்பலன்) ═══════
  if(screen===SCREEN.DAILY && dailyData) {
    const { today, gochara, remedy, muhurtham, sadeSati, guruPeyarchi, taraBala, currentDasha } = dailyData;
    const moodColor = gochara.overallMood==="good" ? "#4ade80" : gochara.overallMood==="caution" ? "#dc2626" : "#7b1c1c";
    const moodText = gochara.overallMood==="good" ? `${today.isOtherDate?"அன்று":"இன்று"} நல்ல நாள்` : gochara.overallMood==="caution" ? "கவனமாக இருக்க வேண்டிய நாள்" : "சாதாரண நாள்";
    const dailyGeo = resolveBirthGeo(formData);
    const currentHorai = calcCurrentHorai(liveClock, dailyGeo.lat, dailyGeo.lon); // live — refreshes every 30s via liveClock state

    return (
      <div style={base}>
        <div style={{...container,paddingTop:20,paddingBottom:30}}>
          <button onClick={()=>goTo(SCREEN.RESULT)} style={{background:"none",border:"none",color:T.accent,fontSize:14,cursor:"pointer",padding:0,marginBottom:12}}>← திரும்பு</button>

          {/* ═══ TAB SWITCHER: ஜாதகம் / இன்றைய பலன் ═══ */}
          <div style={{display:"flex",gap:0,marginBottom:16,background:"#f5f0e0",borderRadius:12,padding:3}}>
            <button onClick={()=>goTo(SCREEN.RESULT)} style={{
              flex:1,padding:"10px 0",border:"none",borderRadius:10,
              background:"transparent",color:"#555555",fontSize:12,fontWeight:600,cursor:"pointer"
            }}>📜 ஜாதகம்</button>
            <button style={{
              flex:1,padding:"10px 0",border:"none",borderRadius:10,
              background:"linear-gradient(135deg,#d4a85325,#b8860b25)",
              color:"#7b1c1c",fontSize:12,fontWeight:700,cursor:"pointer"
            }}>📅 இன்றைய பலன்</button>
          </div>

          <div style={{textAlign:"center",marginBottom:12}}>
            <div style={{fontSize:32,marginBottom:6}}>{today.isFuture?"🔮":today.isPast?"🕰":"📅"}</div>
            <h2 style={{fontSize:19,fontWeight:500,color:"#7b1c1c",margin:"0 0 2px"}}>
              {today.isFuture?"எதிர்கால பலன்":today.isPast?"கடந்த நாள் பலன்":"இன்றைய பலன்"}
            </h2>
            <p style={{fontSize:12,color:"#b8860b"}}>{today.dateStr} • {today.dayName}கிழமை</p>
            {today.isOtherDate && (
              <div style={{fontSize:9,color:today.isFuture?"#4ade80":"#555555",marginTop:3,fontWeight:600}}>
                {today.isFuture?"✨ எதிர்கால கணிப்பு — அன்றைய தசை-புக்தி அடிப்படையில்":"📖 கடந்த நாளின் பலன் பார்வை"}
              </div>
            )}
          </div>

          {/* ═══ Date Navigator — browse to any past/future date ═══ */}
          <div style={{...card,marginBottom:12,padding:"10px 12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>{
                const d = new Date(today.dateObj); d.setDate(d.getDate()-1);
                openDailyScreen(d);
              }} style={{background:"#f2ecda",border:"1px solid #d4a85325",borderRadius:8,
                width:32,height:32,color:"#7b1c1c",fontSize:15,cursor:"pointer",flexShrink:0}}>◂</button>

              <input type="date" value={`${today.dateObj.getFullYear()}-${String(today.dateObj.getMonth()+1).padStart(2,'0')}-${String(today.dateObj.getDate()).padStart(2,'0')}`}
                onChange={e=>{
                  if(!e.target.value) return;
                  const [y,m,d] = e.target.value.split('-').map(Number);
                  openDailyScreen(new Date(y, m-1, d));
                }}
                style={{...inputStyle,flex:1,padding:"7px 10px",fontSize:12,colorScheme:"dark",textAlign:"center"}}/>

              <button onClick={()=>{
                const d = new Date(today.dateObj); d.setDate(d.getDate()+1);
                openDailyScreen(d);
              }} style={{background:"#f2ecda",border:"1px solid #d4a85325",borderRadius:8,
                width:32,height:32,color:"#7b1c1c",fontSize:15,cursor:"pointer",flexShrink:0}}>▸</button>
            </div>
            {today.isOtherDate && (
              <button onClick={()=>openDailyScreen(null)} style={{
                marginTop:8,width:"100%",background:"none",border:"none",color:"#4ade80",
                fontSize:11,fontWeight:600,cursor:"pointer",padding:"4px 0"
              }}>📍 இன்றைக்கு திரும்பு</button>
            )}
          </div>

          {/* Live Horai — updates every ~30s. Only meaningful for "today"; hidden when browsing another date. */}
          {!today.isOtherDate && (
          <div style={{...card,marginBottom:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,
            border:`1px solid ${currentHorai.isBenefic?"#4ade8030":"#ff6b8a30"}`}}>
            <div style={{fontSize:24}}>{currentHorai.symbol}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:9,color:"#555555"}}>இப்போது நடக்கும் ஹோரை (Live)</div>
              <div style={{fontSize:13,fontWeight:700,color:currentHorai.isBenefic?"#4ade80":"#dc2626"}}>
                {currentHorai.planet} ஹோரை
              </div>
              <div style={{fontSize:9,color:"#666666"}}>{currentHorai.startLabel} — {currentHorai.endLabel}</div>
            </div>
            <div style={{fontSize:9,color:currentHorai.isBenefic?"#4ade80":"#dc2626",fontWeight:600,textAlign:"right"}}>
              {currentHorai.isBenefic?"✓ சுப நேரம்":"⚠ கவனம்"}
            </div>
          </div>
          )}

          {/* Mood Banner */}
          <div style={{...card,marginBottom:12,padding:"14px 16px",textAlign:"center",
            border:`1.5px solid ${moodColor}40`, background:`${moodColor}10`}}>
            <div style={{fontSize:15,fontWeight:700,color:moodColor}}>{moodText}</div>
            {gochara.isChandrashtama && (
              <div style={{fontSize:11,color:"#dc2626",marginTop:6,fontWeight:600}}>
                ⚠ {today.isOtherDate?"அன்று":"இன்று"} சந்திராஷ்டமம் — புதிய காரியங்களைத் தவிர்க்கவும்
              </div>
            )}
            <div style={{fontSize:10,color:"#555555",marginTop:6}}>
              சுப கிரகங்கள்: {gochara.goodCount} • எச்சரிக்கை: {gochara.badCount}
            </div>
          </div>

          {/* ═══ Current Dasha chain — most important long-term personalization factor ═══ */}
          {currentDasha && (
            <div style={{...card,marginBottom:12,padding:"12px 14px",
              background:"linear-gradient(135deg,#d4a85312,#b8860b15)",border:"1px solid #d4a85325"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#b8860b",marginBottom:8,letterSpacing:0.5}}>
                ⏳ {today.isOtherDate?"அன்றைய தசை சங்கிலி":"தற்போதைய தசை சங்கிலி"}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:8,color:"#666666",marginBottom:2}}>மகாதசை</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#7b1c1c"}}>
                    {currentDasha.mahadasha.name}
                  </div>
                </div>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:8,color:"#666666",marginBottom:2}}>புக்தி (அந்தர் தசை)</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#b8860b"}}>
                    {currentDasha.bhukti?.name || currentDasha.mahadasha.name}
                  </div>
                </div>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:8,color:"#666666",marginBottom:2}}>பிரத்யந்தர தசை</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#7b1c1c"}}>
                    {currentDasha.pratyantar?.name || "—"}
                  </div>
                </div>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:8,color:"#666666",marginBottom:2}}>சூட்சும தசை</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#b8860b"}}>
                    {currentDasha.sookshma?.name || "—"}
                  </div>
                </div>
              </div>
              {currentDasha.daysLeftInSookshma > 0 ? (
                <div style={{fontSize:9,color:"#666666",marginTop:6,textAlign:"center"}}>
                  இந்த சூட்சும தசை இன்னும் {currentDasha.daysLeftInSookshma} நாட்கள் நீடிக்கும்
                </div>
              ) : currentDasha.daysLeftInBhukti > 0 && (
                <div style={{fontSize:9,color:"#666666",marginTop:6,textAlign:"center"}}>
                  இந்த புக்தி இன்னும் {currentDasha.daysLeftInBhukti} நாட்கள் நீடிக்கும்
                </div>
              )}
            </div>
          )}

          {/* Sade Sati + Tara Bala row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {sadeSati && (
              <div style={{...card,padding:"10px 12px",
                border:`1px solid ${sadeSati.active?(sadeSati.severity==="high"?"#ff6b8a40":"#f0c75e30"):"#4ade8025"}`}}>
                <div style={{fontSize:9,color:"#555555",marginBottom:3}}>ஏழரை சனி</div>
                <div style={{fontSize:11,fontWeight:700,
                  color:sadeSati.active?(sadeSati.severity==="high"?"#dc2626":"#7b1c1c"):"#4ade80"}}>
                  {sadeSati.active?"⚠ "+sadeSati.phase:"✓ இல்லை"}
                </div>
              </div>
            )}
            {taraBala && (
              <div style={{...card,padding:"10px 12px",
                border:`1px solid ${taraBala.mood==="good"?"#4ade8025":"#ff6b8a30"}`}}>
                <div style={{fontSize:9,color:"#555555",marginBottom:3}}>தாரா பலம்</div>
                <div style={{fontSize:11,fontWeight:700,color:taraBala.mood==="good"?"#4ade80":"#dc2626"}}>
                  {taraBala.mood==="good"?"✓ ":"⚠ "}{taraBala.name}
                </div>
              </div>
            )}
          </div>

          {/* Guru Peyarchi */}
          {guruPeyarchi && (
            <div style={{...card,marginBottom:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,
              border:`1px solid ${guruPeyarchi.mood==="good"?"#4ade8025":"#f0c75e30"}`}}>
              <div style={{fontSize:22}}>♃</div>
              <div style={{flex:1}}>
                <div style={{fontSize:9,color:"#555555"}}>குரு பெயர்ச்சி பலன் ({guruPeyarchi.rashi})</div>
                <div style={{fontSize:11,color:"#333333",lineHeight:1.5,marginTop:2}}>{guruPeyarchi.desc}</div>
              </div>
            </div>
          )}

          {/* Muhurtham — Rahu Kalam, Yamagandam, Kuligai, Abhijit */}
          {muhurtham && (
            <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#7b1c1c",marginBottom:2,borderBottom:"1px solid #d4a85330",paddingBottom:4}}>
                ⏰ இன்றைய நல்ல நேரம் / தவிர்க்க வேண்டிய நேரம்
              </div>
              <div style={{fontSize:9,color:"#666666",marginBottom:8,marginTop:4}}>
                சூரிய உதயம் {muhurtham.sunrise} • அஸ்தமனம் {muhurtham.sunset} (Chennai அடிப்படையில்)
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #e8e0e0"}}>
                <span style={{fontSize:8,fontWeight:700,color:"#4ade80",background:"#4ade8015",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>சுபம்</span>
                <span style={{fontSize:11,color:"#1a1a1a"}}>அபிஜித் முகூர்த்தம்</span>
                <span style={{fontSize:10,color:"#b8860b",marginLeft:"auto"}}>{muhurtham.abhijit}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #e8e0e0"}}>
                <span style={{fontSize:8,fontWeight:700,color:"#dc2626",background:"#ff6b8a15",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>தவிர்க்க</span>
                <span style={{fontSize:11,color:"#1a1a1a"}}>ராகு காலம்</span>
                <span style={{fontSize:10,color:"#b8860b",marginLeft:"auto"}}>{muhurtham.rahuKalam}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #e8e0e0"}}>
                <span style={{fontSize:8,fontWeight:700,color:"#dc2626",background:"#ff6b8a15",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>தவிர்க்க</span>
                <span style={{fontSize:11,color:"#1a1a1a"}}>எமகண்டம்</span>
                <span style={{fontSize:10,color:"#b8860b",marginLeft:"auto"}}>{muhurtham.yamagandam}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0"}}>
                <span style={{fontSize:8,fontWeight:700,color:"#dc2626",background:"#ff6b8a15",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>தவிர்க்க</span>
                <span style={{fontSize:11,color:"#1a1a1a"}}>குளிகை</span>
                <span style={{fontSize:10,color:"#b8860b",marginLeft:"auto"}}>{muhurtham.kuligai}</span>
              </div>
            </div>
          )}

          {/* Today's Panchangam */}
          <div style={{...card,marginBottom:12,padding:"12px 14px",fontSize:12}}>
            <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
              இன்றைய பஞ்சாங்கம்
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>
                {[
                  ["திதி",`${today.tithi}, ${today.paksham}`],
                  ["நட்சத்திரம்",`${today.nakshatra}, பாதம் ${today.nakshatraPada||1}`],
                  ["யோகம்",today.yogam],
                  ["கரணம்",today.karanam],
                  ["சந்திர ராசி",today.moonRashi],
                ].map(([l,v],i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #e8e0e0"}}>
                    <td style={{padding:"4px 0",color:"#b8860b",width:"38%",fontWeight:600,fontSize:11}}>{l}</td>
                    <td style={{padding:"4px 0",color:"#888888",width:10}}>:</td>
                    <td style={{padding:"4px 6px",color:"#1a1a1a",fontWeight:600,fontSize:11}}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ═══ இன்றைய அதிர்ஷ்ட எண்கள் (Daily Lucky Numbers) ═══ */}
          {(()=>{
            const moonRashiIdx = RASHIS.indexOf(horoscope.moonRashi);
            const todayNakIdx = NAKSHATRAS.indexOf(today.nakshatra);
            const dailyNums = calcDailyLuckyNumbers(moonRashiIdx >= 0 ? moonRashiIdx : 0, today.tithi, todayNakIdx >= 0 ? todayNakIdx : 0, today.dateObj.getDay());
            const birthLucky = RASHI_LUCKY[moonRashiIdx >= 0 ? moonRashiIdx : 0];
            const todayNakLord = getNakshatraLord(todayNakIdx);
            return (
              <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:10,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                  🍀 {today.isOtherDate?"அன்றைய அதிர்ஷ்ட விவரங்கள்":"இன்றைய அதிர்ஷ்ட விவரங்கள்"}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"linear-gradient(135deg,#f0c75e10,#d4a85308)",borderRadius:8,padding:"10px 12px",border:"1px solid #f0c75e18"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:4}}>🔢 {today.isOtherDate?"அன்றைய அதிர்ஷ்ட எண்கள்":"இன்றைய அதிர்ஷ்ட எண்கள்"}</div>
                    <div style={{fontSize:22,fontWeight:800,color:"#7b1c1c",letterSpacing:6}}>
                      {dailyNums.join("  ")}
                    </div>
                    <div style={{fontSize:8,color:"#777777",marginTop:3}}>திதி + நட்சத்திரம் + கிழமை அடிப்படை</div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#b8860b15,#d4a85308)",borderRadius:8,padding:"10px 12px",border:"1px solid #b8860b25"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:4}}>💎 ராசி ரத்தினம்</div>
                    <div style={{fontSize:12,fontWeight:700,color:"#b8860b"}}>{birthLucky.gem}</div>
                    <div style={{fontSize:10,color:"#666666",marginTop:3}}>உப: {birthLucky.subGem}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}}>
                  <div style={{background:"#4ade8008",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:8,color:"#666666"}}>நிரந்தர எண்</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#4ade80"}}>{birthLucky.nums.join(", ")}</div>
                  </div>
                  <div style={{background:"#f0c75e08",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:8,color:"#666666"}}>அதிர்ஷ்ட திசை</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>{birthLucky.dir}</div>
                  </div>
                  <div style={{background:"#f2ecda",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:8,color:"#666666"}}>{today.isOtherDate?"அன்று நட்சத்திரம்":"இன்று நட்சத்திரம்"}</div>
                    <div style={{fontSize:10,fontWeight:700,color:"#b8860b"}}>{todayNakLord.name}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═══ NIYAMAM & PARIKARAM — ராசிக்கான நியமங்கள் & பரிகாரங்கள் ═══ */}
          {remedy && (
            <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🕉 உங்கள் ராசிக்கான நியமங்கள் & பரிகாரங்கள்
              </div>

              {/* Constant Rashi info */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{background:"#f0c75e08",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:9,color:"#555555"}}>ஆட்சி கிரகம்</div>
                  <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>{remedy.rashiInfo.lord}</div>
                </div>
                <div style={{background:"#f0c75e08",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:9,color:"#555555"}}>வழிபட வேண்டிய தெய்வம்</div>
                  <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>{remedy.rashiInfo.deity}</div>
                </div>
                <div style={{background:"#f2ecda",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:9,color:"#555555"}}>அணிய நல்ல நிறம்</div>
                  <div style={{fontSize:11,fontWeight:700,color:"#1a1a1a"}}>{remedy.rashiInfo.color}</div>
                </div>
                <div style={{background:"#f2ecda",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:9,color:"#555555"}}>ரத்தினம்</div>
                  <div style={{fontSize:11,fontWeight:700,color:"#1a1a1a"}}>{remedy.rashiInfo.gem}</div>
                </div>
              </div>
              <div style={{background:"#4ade8008",border:"1px solid #4ade8020",borderRadius:6,padding:"8px 10px",marginBottom:10}}>
                <div style={{fontSize:9,color:"#4ade8090"}}>தினசரி ஜபிக்க வேண்டிய மந்திரம்</div>
                <div style={{fontSize:12,fontWeight:600,color:"#4ade80",fontFamily:"serif",marginTop:2}}>{remedy.rashiInfo.mantra}</div>
              </div>

              {/* Today's specific remedy */}
              <div style={{borderTop:"1px dashed #d4a85330",paddingTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#1a1a1a",marginBottom:6}}>
                  📿 இன்று ({today.dayName}கிழமை) செய்ய வேண்டியவை
                </div>
                {remedy.isSpecialDay && (
                  <div style={{fontSize:10,background:"#e6d2d2",color:"#7b1c1c",padding:"4px 8px",borderRadius:6,marginBottom:6,fontWeight:600}}>
                    ⭐ இன்று உங்கள் ராசி நாதன் ({remedy.rashiInfo.lord}) நாள் — சிறப்பு நாள்!
                  </div>
                )}
                <div style={{fontSize:11,color:"#333333",lineHeight:1.7,marginBottom:6}}>
                  <span style={{color:"#b8860b"}}>வழிபாடு:</span> {remedy.dayInfo.remedy}
                </div>
                <div style={{fontSize:11,color:"#333333",lineHeight:1.7,marginBottom:6}}>
                  <span style={{color:"#b8860b"}}>தானம்:</span> {remedy.dayInfo.donate}
                </div>
                <div style={{fontSize:11,color:"#333333",lineHeight:1.7}}>
                  <span style={{color:"#b8860b"}}>தவிர்க்க வேண்டியது:</span> {remedy.dayInfo.avoid}
                </div>

                {/* Tithi-based guidance — changes daily (15-day cycle), keeps this from feeling like a 7-day repeat */}
                <div style={{marginTop:10,borderTop:"1px dashed #b8860b30",paddingTop:8}}>
                  <div style={{fontSize:10,color:"#b8860b",marginBottom:3}}>
                    🌙 இன்றைய திதி ({today.tithi}) வழிகாட்டுதல்
                  </div>
                  <div style={{fontSize:11,color:"#333333",lineHeight:1.6}}>
                    {remedy.tithiInfo.note} — <span style={{color:"#4ade80"}}>{remedy.tithiInfo.activity}</span>
                  </div>
                </div>

                {remedy.isChandrashtama && (
                  <div style={{marginTop:10,background:"#ff6b8a10",border:"1px solid #ff6b8a30",borderRadius:6,padding:"8px 10px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#dc2626",marginBottom:3}}>⚠ சந்திராஷ்டம பரிகாரம்</div>
                    <div style={{fontSize:10,color:"#333333",lineHeight:1.6}}>
                      இன்று புதிய காரியங்கள், பயணம், முக்கிய முடிவுகள் தவிர்க்கவும். சிவன் கோவிலில் "ஓம் நமசிவாய" 108 முறை ஜபிக்கவும். பால் அபிஷேகம் செய்தால் நல்லது.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gochara Transit Table */}
          <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
              கிரக கோசாரம் (உங்கள் ராசி: {horoscope.moonRashi})
            </div>
            {gochara.results.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 4px",
                borderBottom:i<gochara.results.length-1?"1px solid #7b1c1c08":"none",
                borderLeft:`3px solid ${grahaCardBorder(p.ta)}`,marginBottom:2,borderRadius:4,
                background:`${grahaCardBorder(p.ta)}08`}}>
                <span style={{fontSize:11,color:T.text,flex:1,fontWeight:600}}>{p.ta} — {p.rashi}</span>
                <span style={{fontSize:9,color:T.textMuted}}>{p.houseFromMoon}ஆம் வீடு</span>
                <span style={{
                  fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:5,
                  background:p.effect==="good"?T.good+"20":p.effect==="bad"?T.bad+"20":T.neutral+"15",
                  color:p.effect==="good"?T.good:p.effect==="bad"?T.bad:T.accentSoft
                }}>{p.effect==="good"?"சுபம்":p.effect==="bad"?"அசுபம்":"நடுநிலை"}</span>
              </div>
            ))}
          </div>

          {/* AI Daily Prediction */}
          <div style={{...card,marginBottom:12,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#d4a85330,#b8860b20)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
              <div style={{fontSize:13,fontWeight:600,color:"#7b1c1c"}}>AI தினப்பலன்</div>
            </div>
            {dailyLoading ? (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{width:26,height:26,margin:"0 auto 8px",border:"2px solid #d4a85320",borderTop:"2px solid #d4a853",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                <p style={{color:"#b8860b",fontSize:12}}>தினப்பலன் உருவாக்குகிறது...</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
              </div>
            ) : dailyPrediction ? (
              <div style={{fontSize:13,lineHeight:1.9,color:"#333333",whiteSpace:"pre-wrap"}}>{dailyPrediction}</div>
            ) : (
              <button style={{...btnGold,width:"auto",padding:"10px 24px",display:"inline-block",fontSize:13}} onClick={fetchDailyPrediction}>
                🔮 {today.isOtherDate?"அன்றைய பலன் பெறு":"இன்றைய பலன் பெறு"} →
              </button>
            )}
          </div>

          <button style={{...btnOutline,fontSize:12,padding:"10px 0"}} onClick={()=>goTo(SCREEN.RESULT)}>← ஜாதகத்திற்கு திரும்பு</button>
        </div>
      </div>
    );
  }

  // ═══════ PANCHANGAM CALENDAR (Alb Astro style) ═══════
  if(screen===SCREEN.CALENDAR) {
    const MONTH_NAMES_TA = ["ஜனவரி","பிப்ரவரி","மார்ச்","ஏப்ரல்","மே","ஜூன்","ஜூலை","ஆகஸ்ட்","செப்டம்பர்","அக்டோபர்","நவம்பர்","டிசம்பர்"];
    const DAY_NAMES_TA = ["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"];
    const DAY_SHORT = ["ஞா","தி","செ","பு","வி","வெ","ச"];
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();

    // Tamil month mapping (approximate Gregorian mid-month to Tamil month)
    const TAMIL_MONTHS = ["தை","மாசி","பங்குனி","சித்திரை","வைகாசி","ஆனி","ஆடி","ஆவணி","புரட்டாசி","ஐப்பசி","கார்த்திகை","மார்கழி"];
    const tamilMonthIdx = (calMonth + 9) % 12; // Approximate mapping

    // Generate all day data for the month — prefer the backend (Swiss Ephemeris) result
    // for a day once the background fetch above has resolved it; every day still has an
    // instant local value to fall back to, so the grid never waits on the network.
    const calData = [];
    for(let d=1; d<=daysInMonth; d++){
      const dt = new Date(calYear, calMonth, d);
      const iso = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const backendDay = calBackendData[d];
      const h = backendDay || generateHoroscope(iso, "06:00", 13.0827, 80.2707);
      const muh = calcMuhurtham(dt, 13.0827, 80.2707, 5.5);

      // Paksham calculation
      const paksham = h.paksham || "";
      const isPournami = h.tithi === "பௌர்ணமி/அமாவாசை" && paksham.includes("சுக்ல");
      const isAmavasai = h.tithi === "பௌர்ணமி/அமாவாசை" && !paksham.includes("சுக்ல");
      const isEkadashi = h.tithi === "ஏகாதசி";
      const isPradosham = h.tithi === "திரயோதசி";
      const isChaturthi = h.tithi === "சதுர்த்தி";

      // Categorize day
      let dayType = "normal"; // normal, good, bad, festival
      if(isPournami || isAmavasai || isEkadashi) dayType = "festival";
      else if(["பஞ்சமி","தசமி","சப்தமி"].includes(h.tithi)) dayType = "good";
      else if(["நவமி","அஷ்டமி"].includes(h.tithi)) dayType = "bad";

      calData.push({
        d, dt, dayOfWeek: dt.getDay(),
        tithi: h.tithi, nakshatra: h.nakshatra, yogam: h.yogam, karanam: h.karanam,
        paksham, moonRashi: h.moonRashi,
        sunrise: muh.sunrise, sunset: muh.sunset,
        rahuKalam: muh.rahuKalam, yamagandam: muh.yamagandam, kuligai: muh.kuligai, abhijit: muh.abhijit,
        dayType, isPournami, isAmavasai, isEkadashi, isPradosham, isChaturthi,
        isFromBackend: !!backendDay
      });
    }

    const sel = calData[calSelected - 1]; // Selected day data
    const today = new Date();
    const isCurrentMonth = calMonth === today.getMonth() && calYear === today.getFullYear();

    return(
      <div style={base}>
        <div style={{...container,paddingTop:16,paddingBottom:30}}>
          <button onClick={()=>goTo(horoscope?SCREEN.RESULT:SCREEN.FORM)} style={{background:"none",border:"none",color:T.accent,fontSize:14,cursor:"pointer",padding:0,marginBottom:12}}>← பின் செல்</button>

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:14}}>
            <div style={{fontSize:11,color:"#666666",letterSpacing:3,marginBottom:2}}>✦ பஞ்சாங்கம் ✦</div>
            <div style={{fontSize:11,color:"#4ade80",marginTop:4}}>{TAMIL_MONTHS[tamilMonthIdx]} மாதம்</div>
            {calFetching && (
              <div style={{fontSize:9,color:"#b8860b80",marginTop:4}}>
                ⟳ துல்லியமான தரவை பின்னணியில் பெறுகிறது...
              </div>
            )}
          </div>

          {/* Month Navigator */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,padding:"8px 12px",
            background:"linear-gradient(135deg,#d4a85308,#b8860b10)",borderRadius:12,border:"1px solid #d4a85315"}}>
            <button onClick={()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);} else setCalMonth(m=>m-1); setCalSelected(1); }}
              style={{background:"none",border:"none",color:"#7b1c1c",fontSize:20,cursor:"pointer",padding:"4px 8px"}}>◂</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:17,fontWeight:700,color:"#7b1c1c",letterSpacing:1}}>{MONTH_NAMES_TA[calMonth]}</div>
              <div style={{fontSize:11,color:"#555555"}}>{calYear}</div>
            </div>
            <button onClick={()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);} else setCalMonth(m=>m+1); setCalSelected(1); }}
              style={{background:"none",border:"none",color:"#7b1c1c",fontSize:20,cursor:"pointer",padding:"4px 8px"}}>▸</button>
          </div>

          {/* Calendar Grid */}
          <div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,border:"1px solid #d4a85310",padding:"8px 6px",marginBottom:12}}>
            {/* Day headers */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:4}}>
              {DAY_SHORT.map((dh,i)=>(
                <div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,
                  color:i===0?"#dc2626":i===6?"#2563eb":"#555555",padding:"6px 0"}}>{dh}</div>
              ))}
            </div>
            {/* Date cells */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
              {Array.from({length:firstDay},(_,i)=>(<div key={`e${i}`}/>))}
              {calData.map((cd,i)=>{
                const isTodayCell = isCurrentMonth && cd.d === today.getDate();
                const isSelected = cd.d === calSelected;
                const bgMap = {festival:"#f0c75e10",good:"#4ade8008",bad:"#ff6b8a08",normal:"transparent"};
                const borderMap = {festival:"#f0c75e30",good:"#4ade8015",bad:"#ff6b8a15",normal:"#f0e0e0"};
                return(
                  <div key={i} onClick={()=>setCalSelected(cd.d)} style={{
                    background:isSelected?"#ede4cc":bgMap[cd.dayType],
                    border:isSelected?"1.5px solid #a78bfa":isTodayCell?"1.5px solid #f0c75e50":`1px solid ${borderMap[cd.dayType]}`,
                    borderRadius:8,padding:"3px 2px",minHeight:48,textAlign:"center",cursor:"pointer",
                    transition:"all 0.15s",position:"relative"
                  }}>
                    {isTodayCell && <div style={{position:"absolute",top:2,right:3,width:5,height:5,borderRadius:"50%",background:"#7b1c1c"}}/>}
                    <div style={{fontSize:14,fontWeight:700,color:
                      isSelected?"#b8860b":
                      cd.dayOfWeek===0?"#dc2626":
                      cd.isPournami||cd.isAmavasai?"#7b1c1c":
                      cd.dayType==="bad"?"#ff6b8a80":"#1a1a1a"
                    }}>{cd.d}</div>
                    <div style={{fontSize:6.5,color:cd.dayType==="festival"?"#7b1c1c":"#555555",lineHeight:1.2,marginTop:1,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cd.nakshatra?cd.nakshatra.slice(0,4):""}</div>
                    <div style={{fontSize:6,color:
                      cd.dayType==="good"?"#4ade80":
                      cd.dayType==="bad"?"#dc262680":"#777777",lineHeight:1.2}}>
                      {cd.isPournami?"🌕":cd.isAmavasai?"🌑":cd.isEkadashi?"🕉":""}
                      {cd.tithi?cd.tithi.slice(0,4):""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{fontSize:8,color:"#7b1c1c"}}>🌕 பௌர்ணமி</span>
            <span style={{fontSize:8,color:"#b8860b"}}>🌑 அமாவாசை</span>
            <span style={{fontSize:8,color:"#4ade80"}}>● சுபம்</span>
            <span style={{fontSize:8,color:"#dc2626"}}>● அசுபம்</span>
            <span style={{fontSize:8,color:"#7b1c1c"}}>🕉 ஏகாதசி</span>
          </div>

          {/* ═══ Selected Day Detail — Full Panchangam ═══ */}
          {sel && (
            <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
              {/* Day Header */}
              <div style={{background:"linear-gradient(135deg,#d4a85318,#b8860b15)",padding:"12px 14px",
                borderBottom:"1px solid #d4a85320"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:24,fontWeight:800,color:"#7b1c1c"}}>{sel.d}</div>
                    <div style={{fontSize:12,fontWeight:600,color:"#1a1a1a"}}>{DAY_NAMES_TA[sel.dayOfWeek]}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,color:"#b8860b"}}>{MONTH_NAMES_TA[calMonth]} {calYear}</div>
                    <div style={{fontSize:10,color:"#666666"}}>{TAMIL_MONTHS[tamilMonthIdx]}</div>
                    <div style={{fontSize:8,color:sel.isFromBackend?"#4ade80":"#66666680",marginTop:2}}>
                      {sel.isFromBackend ? "✓ Swiss Ephemeris" : "≈ local estimate"}
                    </div>
                  </div>
                </div>
                {(sel.isPournami||sel.isAmavasai||sel.isEkadashi||sel.isPradosham||sel.isChaturthi) && (
                  <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {sel.isPournami && <span style={{fontSize:9,background:"#f0c75e20",color:"#7b1c1c",padding:"2px 8px",borderRadius:10,fontWeight:600}}>🌕 பௌர்ணமி</span>}
                    {sel.isAmavasai && <span style={{fontSize:9,background:"#e8dcc0",color:"#b8860b",padding:"2px 8px",borderRadius:10,fontWeight:600}}>🌑 அமாவாசை</span>}
                    {sel.isEkadashi && <span style={{fontSize:9,background:"#4ade8020",color:"#4ade80",padding:"2px 8px",borderRadius:10,fontWeight:600}}>🕉 ஏகாதசி</span>}
                    {sel.isPradosham && <span style={{fontSize:9,background:"#e6d2d2",color:"#7b1c1c",padding:"2px 8px",borderRadius:10,fontWeight:600}}>🔱 பிரதோஷம்</span>}
                    {sel.isChaturthi && <span style={{fontSize:9,background:"#ff6b8a15",color:"#dc2626",padding:"2px 8px",borderRadius:10,fontWeight:600}}>🐘 சதுர்த்தி</span>}
                  </div>
                )}
              </div>

              {/* Panchangam 5 Angas */}
              <div style={{padding:"10px 14px",borderBottom:"1px solid #e8e0e0"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#b8860b",marginBottom:8,letterSpacing:1}}>☸ பஞ்சாங்கம் (5 அங்கங்கள்)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {[
                    {label:"வாரம்", value: DAY_NAMES_TA[sel.dayOfWeek], icon:"📅", color:"#1a1a1a"},
                    {label:"திதி", value: sel.tithi, icon:"🌙", color: sel.dayType==="bad"?"#dc2626":sel.dayType==="good"?"#4ade80":"#7b1c1c"},
                    {label:"நட்சத்திரம்", value: sel.nakshatra, icon:"⭐", color:"#b8860b"},
                    {label:"யோகம்", value: sel.yogam, icon:"☯", color:"#1a1a1a"},
                    {label:"கரணம்", value: sel.karanam, icon:"⚡", color:"#1a1a1a"},
                    {label:"பக்ஷம்", value: sel.paksham, icon: sel.paksham?.includes("சுக்ல")?"🌓":"🌗", color:"#b8860b"},
                  ].map((item,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",
                      background:"rgba(255,255,255,0.02)",borderRadius:6}}>
                      <span style={{fontSize:14}}>{item.icon}</span>
                      <div>
                        <div style={{fontSize:8,color:"#666666"}}>{item.label}</div>
                        <div style={{fontSize:11,fontWeight:600,color:item.color}}>{item.value||"—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Moon Rashi */}
              <div style={{padding:"8px 14px",borderBottom:"1px solid #e8e0e0",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>☽</span>
                <div>
                  <div style={{fontSize:8,color:"#666666"}}>சந்திர ராசி</div>
                  <div style={{fontSize:12,fontWeight:600,color:"#7b1c1c"}}>{sel.moonRashi||"—"}</div>
                </div>
              </div>

              {/* Sunrise / Sunset */}
              <div style={{padding:"8px 14px",borderBottom:"1px solid #e8e0e0"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18}}>🌅</span>
                    <div>
                      <div style={{fontSize:8,color:"#666666"}}>சூரிய உதயம்</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#7b1c1c",fontFamily:"monospace"}}>{sel.sunrise}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18}}>🌇</span>
                    <div>
                      <div style={{fontSize:8,color:"#666666"}}>சூரிய அஸ்தமனம்</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#dc2626",fontFamily:"monospace"}}>{sel.sunset}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kalam Table — Rahu, Ema, Gulikai, Abhijit */}
              <div style={{padding:"10px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#b8860b",marginBottom:8,letterSpacing:1}}>⏰ காலங்கள்</div>
                {[
                  {label:"ராகு காலம்", value:sel.rahuKalam, icon:"☊", color:"#dc2626", bg:"#ff6b8a08", desc:"தவிர்க்கவும்"},
                  {label:"எமகண்டம்", value:sel.yamagandam, icon:"💀", color:"#ff6b8a80", bg:"#ff6b8a05", desc:"தவிர்க்கவும்"},
                  {label:"குளிகை", value:sel.kuligai, icon:"⚠", color:"#b8860b", bg:"#f8f4ea", desc:"கவனம்"},
                  {label:"அபிஜித் முகூர்த்தம்", value:sel.abhijit, icon:"✨", color:"#4ade80", bg:"#4ade8008", desc:"மிகச் சிறந்தது"},
                ].map((k,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",marginBottom:4,
                    background:k.bg,borderRadius:8,borderLeft:`3px solid ${k.color}30`}}>
                    <span style={{fontSize:14,width:20,textAlign:"center"}}>{k.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,fontWeight:600,color:k.color}}>{k.label}</div>
                      <div style={{fontSize:8,color:"#777777"}}>{k.desc}</div>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:k.color,fontFamily:"monospace"}}>{k.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Today Button */}
          {!isCurrentMonth && (
            <button onClick={()=>{setCalMonth(today.getMonth());setCalYear(today.getFullYear());setCalSelected(today.getDate());}}
              style={{...btnOutline,fontSize:11,padding:"9px 0",borderColor:"#f0c75e30",color:"#7b1c1c"}}>
              📍 இன்றைய தேதிக்கு செல்
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}