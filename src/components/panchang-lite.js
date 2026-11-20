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
