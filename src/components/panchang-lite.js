// ═══════════════════════════════════════════════════════════════════
// முகப்பு "இன்று" அட்டைக்கான civil தமிழ்த் தேதி — பொதுப் பஞ்சாங்கக் கணக்கு மட்டும்
// (almanac.js-இன் public ephemeris; proprietary logic இல்லை).
// விதி server-இன் worker/src/festivals.js உடன் ஒன்றே: சூரிய அஸ்தமனத்தில் சூரியன் புதிய
// ராசியில் இருக்கும் முதல் நாள் = மாதப் பிறப்பு (தேதி 1). இடம்: சென்னை (தமிழ்நாட்டுப்
// பஞ்சாங்க வழக்கு) — நாட்காட்டிப் பக்கம் காட்டும் தேதியுடன் பொருந்த வேண்டும்.
// ═══════════════════════════════════════════════════════════════════
import { generateHoroscope, calcMuhurtham } from "../almanac.js";

const LAT = 13.0827, LON = 80.2707;
const TAMIL_MONTHS = ["சித்திரை", "வைகாசி", "ஆனி", "ஆடி", "ஆவணி", "புரட்டாசி", "ஐப்பசி", "கார்த்திகை", "மார்கழி", "தை", "மாசி", "பங்குனி"];
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function sunRashiAtSunset(d) {
  const sunset = calcMuhurtham(d, LAT, LON, 5.5).sunset;
  const h = generateHoroscope(isoOf(d), sunset, LAT, LON, true, "lahiri", 5.5);
  const sun = h.placements[0];
  return Math.floor((((sun.fullLong % 360) + 360) % 360) / 30);
}

// date (local) → { month, monthIdx, day } அல்லது null
export function tamilCivilDate(date) {
  try {
    const r0 = sunRashiAtSunset(date);
    let day = 1;
    for (let i = 1; i <= 32; i++) {
      const prev = new Date(date.getFullYear(), date.getMonth(), date.getDate() - i);
      if (sunRashiAtSunset(prev) !== r0) break;
      day++;
    }
    return { month: TAMIL_MONTHS[r0], monthIdx: r0, day };
  } catch (e) { return null; }
}

// ═══════════════════════════════════════════════════════════════════
// நாளின் திதி / நட்சத்திரம் — சூரிய உதயத்தில் நடப்பது + அது முடியும் நேரம் + அடுத்தது.
// (நாள் முழுக்க ஒரே திதி இருப்பதில்லை: உதயத்தில் தசமி, மதியம் ஏகாதசி என்று மாறும். முடிவு
// நேரத்தைக் காட்டினால் முகப்பு, நாட்காட்டி, தினப்பலன் மூன்றும் ஒரே தகவலைச் சொல்லும்.)
// ═══════════════════════════════════════════════════════════════════
const hm = (min) => { const t = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

export function dayPanchang(date, lat = LAT, lon = LON) {
  try {
    const cache = new Map();
    const at = (min) => { // min = நள்ளிரவிலிருந்து நிமிடங்கள் (1440-ஐத் தாண்டினால் மறுநாள்)
      const k = Math.round(min);
      if (cache.has(k)) return cache.get(k);
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + Math.floor(k / 1440));
      const h = generateHoroscope(isoOf(d), hm(k), lat, lon, true, "lahiri", 5.5);
      const sun = h.placements[0], moon = h.placements[1];
      const el = (((moon.fullLong - sun.fullLong) % 360) + 360) % 360;
      const r = { t: Math.floor(el / 12), n: moon.nakIdx, tithi: h.tithi, nak: h.nakshatra, waxing: Math.floor(el / 12) < 15 };
      cache.set(k, r); return r;
    };
    const [sh, sm] = calcMuhurtham(date, lat, lon, 5.5).sunrise.split(":").map(Number);
    const start = sh * 60 + sm;
    const s0 = at(start);
    const endOf = (key) => {
      let lo = start, hi = null;
      for (let m = start + 60; m <= start + 30 * 60; m += 60) { if (at(m)[key] !== s0[key]) { hi = m; break; } lo = m; }
      if (hi == null) return null;
      while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (at(mid)[key] === s0[key]) lo = mid; else hi = mid; }
      return { min: hi, time: hm(hi), nextDay: hi >= 1440, next: at(hi + 2) };
    };
    const te = endOf("t"), ne = endOf("n");
    const until = (e) => (e ? `${e.nextDay ? "மறுநாள் " : ""}${e.time} வரை` : "நாள் முழுவதும்");
    return {
      tithi: s0.tithi, waxing: s0.waxing, tithiUntil: until(te), tithiNext: te ? te.next.tithi : null,
      nakshatra: s0.nak, nakUntil: until(ne), nakNext: ne ? ne.next.nak : null,
    };
  } catch (e) { return null; }
}
