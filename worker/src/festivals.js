// ═══════════════════════════════════════════════════════════════════
// தமிழ்ப் பண்டிகைகள் + தமிழ்த் தேதி (civil) — engine-இன் பஞ்சாங்கக் கணக்கின் மேல்.
//
// ஒவ்வொரு விதியும் Drik Panchang "Tamil Calendar" பட்டியலுடன் (சென்னை, geoname-id 1264527)
// 2025–2028 (4 ஆண்டு) ஒப்பிட்டுச் சரிபார்க்கப்பட்டது; நான்கு ஆண்டிலும் பொருந்திய பண்டிகைகள் மட்டுமே இங்கே.
// (மாசி மகம், நவராத்திரி தொடக்கம், அட்சய திருதியை, கார்த்திகை தீபம் — இவை 2021–2030 பத்து ஆண்டும்
// பொருந்தியவை; கூடுதல் ஆண்டுகள் fixture-இன் "extraYears"-இல்.) விதியை மாற்றினால் scripts/test-festivals.mjs ஓட்டவும்.
//
// இடம்: சென்னை — தமிழ்நாட்டுப் பஞ்சாங்க வழக்கு (பயனர் இடத்தைப் பொறுத்து மாறாது).
// ═══════════════════════════════════════════════════════════════════
import { generateHoroscope, calcMuhurtham, NAKSHATRAS, setEngineTimezone } from "../../src/engine.js";

const LAT = 13.0827, LON = 80.2707;
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// அந்தக் கணத்தின் திதி (1..30), நட்சத்திரம், சூரிய ராசி
function sampler() {
  const cache = new Map();
  return (iso, hhmm) => {
    const k = iso + hhmm;
    let r = cache.get(k);
    if (!r) {
      const h = generateHoroscope(iso, hhmm, LAT, LON, true);
      const sun = h.placements[0], moon = h.placements[1];
      const el = (((moon.fullLong - sun.fullLong) % 360) + 360) % 360;
      r = { T: Math.floor(el / 12) + 1, N: moon.nakIdx, sunR: Math.floor((((sun.fullLong % 360) + 360) % 360) / 30) };
      cache.set(k, r);
    }
    return r;
  };
}

// start..end ஒவ்வொரு நாளுக்கும்: தமிழ் மாதம்/தேதி (சங்கராந்தி சூரிய அஸ்தமனத்துக்கு முன் நிகழ்ந்தால்
// அன்றே மாதப் பிறப்பு; பின் எனில் மறுநாள்), சந்திர மாதம் (அமாந்த — அமாவாசை முடிவில் சூரிய ராசி).
function buildDays(start, end, at) {
  const days = [];
  let d = addDays(start, -40); // மாதத் தொடக்கம் + சந்திர மாதம் அறிய முன்னோட்டம்
  let prevSunsetR = null, tmIdx = null, tmDay = null;
  let prevT = null, lunarSun = null;
  while (d <= end) {
    const iso = isoOf(d);
    const s = at(iso, "06:00");
    const sunsetR = at(iso, calcMuhurtham(d, LAT, LON).sunset).sunR;
    if (prevSunsetR != null && sunsetR !== prevSunsetR) { tmIdx = sunsetR; tmDay = 1; }
    else if (tmDay != null) tmDay += 1;
    prevSunsetR = sunsetR;
    if (prevT != null && prevT >= 28 && s.T <= 3) lunarSun = s.sunR;
    prevT = s.T;
    if (d >= start) days.push({ iso, date: d, tmIdx, tmDay, lunarSun, T6: s.T, N6: s.N });
    d = addDays(d, 1);
  }
  return days;
}

const TAMIL_MONTHS = ["சித்திரை", "வைகாசி", "ஆனி", "ஆடி", "ஆவணி", "புரட்டாசி", "ஐப்பசி", "கார்த்திகை", "மார்கழி", "தை", "மாசி", "பங்குனி"];

// ஒரு மாதத்தின் (0–11) ஒவ்வொரு நாளுக்கும் தமிழ்த் தேதி
export function tamilDatesForMonth(year, month) {
  setEngineTimezone(5.5); // பஞ்சாங்கம் எப்போதும் IST
  const at = sampler();
  const start = new Date(year, month, 1), end = new Date(year, month + 1, 0);
  return buildDays(start, end, at).map((x) => (x.tmIdx == null ? null : { month: TAMIL_MONTHS[x.tmIdx], monthIdx: x.tmIdx, day: x.tmDay }));
}

const TM = { chithirai: 0, vaikasi: 1, aadi: 3, karthigai: 7, margazhi: 8, thai: 9, masi: 10, panguni: 11 };
// அமாந்த சந்திர மாதம் = அதன் அமாவாசை முடிவில் சூரியன் இருந்த ராசி
const LM = { chaitra: 11, vaishakha: 0, shravana: 3, bhadrapada: 4, ashwina: 5, kartika: 6, magha: 9 };
const nak = (name) => NAKSHATRAS.indexOf(name);

// அந்த நாளின் உதயத்திலிருந்து பகல் நீளத்தின் f பங்கு கடந்த கணம் ("HH:MM"); f = 0 → உதயம்
function dayMoment(x, f) {
  const m = calcMuhurtham(x.date, LAT, LON);
  const [rh, rm] = m.sunrise.split(":").map(Number), [sh, sm] = m.sunset.split(":").map(Number);
  const t = Math.round(rh * 60 + rm + f * (sh * 60 + sm - rh * 60 - rm));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
const atSunrise = (x, at) => at(x.iso, dayMoment(x, 0));

// மாசி மகம்: உதயத்தில் மக நட்சத்திரம் உள்ள நாள். அந்த உதயம் ஏற்கெனவே தேய்பிறை எனில் (பௌர்ணமி
// முந்தைய நாள் மாலையே மகத்துடன் கூடியது — 2022, 2027) அதற்கு முந்தைய நாள்.
function isMasiMagam(x, at, i, days) {
  if (x.tmIdx !== TM.masi) return false;
  const s = atSunrise(x, at);
  if (s.N === nak("மகம்") && s.T <= 15) return true;
  const nx = days[i + 1];
  if (!nx) return false;
  const n = atSunrise(nx, at);
  return n.N === nak("மகம்") && n.T > 15;
}
// அட்சய திருதியை: உதயத்துக்குப் பின் 3 முகூர்த்தம் (பகலின் 1/5) கடந்த கணத்தில் வைசாக சுக்ல திருதியை
// உள்ள நாள்; இரு நாளிலும் அந்தக் கணத்தைத் தொடாவிட்டால் திருதியை தொடங்கும் நாள் (2026).
function isAkshayaTritiya(x, at, i, days) {
  if (x.lunarSun !== LM.vaishakha) return false;
  const t = at(x.iso, dayMoment(x, 0.2)).T;
  if (t === 3) return true;
  const nx = days[i + 1];
  return t === 2 && !!nx && at(nx.iso, dayMoment(nx, 0.2)).T === 4;
}
// நவராத்திரி தொடக்கம்: உதயத்தில் ஆச்வின சுக்ல பிரதமை உள்ள (முதல்) நாள்; பிரதமை எந்த உதயத்தையும்
// தொடாவிட்டால் (க்ஷயம் — 2027) அது தொடங்கும் அமாவாசை நாள்.
function isNavaratriStart(x, at, i, days) {
  const pv = days[i - 1], nx = days[i + 1];
  // lunarSun 06:00 மாதிரியில் அமாவாசை முடிந்த பின்னரே மாறும் — அன்று 06:00 இன்னும் அமாவாசை எனில் மறுநாளுடையது
  if ((x.T6 >= 28 ? nx && nx.lunarSun : x.lunarSun) !== LM.ashwina) return false;
  if (x.T6 > 3 && x.T6 < 28) return false;
  const t = atSunrise(x, at).T;
  if (t === 1) return !(pv && atSunrise(pv, at).T === 1);
  return t === 30 && !!nx && atSunrise(nx, at).T === 2;
}
// கார்த்திகை தீபம்: கார்த்திகை மாதத்தில், கிருத்திகை நட்சத்திரம் தொடங்கிய பின் வரும் முதல் அஸ்தமன நாள்
// (மாத கிருத்திகை விதியே — vratham.js). "அஸ்தமனத்தில் கிருத்திகை" என்று மட்டும் பார்த்தால் 2025 (இரு
// அஸ்தமனங்களுக்கு இடையே தொடங்கி முடிகிறது), 2029 (இரு அஸ்தமனங்களிலும் உள்ளது) தவறும். மாதத்தில்
// இருமுறை வந்தால் பின்னது (2024 = டிச 13). சென்னைப் பக்கத்துடன் 2021–2030 பத்து ஆண்டும் பொருந்தும்;
// முந்தைய விதி (06:00 நட்சத்திரம்) 2022, 2023, 2024, 2027, 2029-இல் ஒரு நாள் தள்ளிப் போனது.
function isKarthigaiDeepam(x, at, i, days) {
  if (x.tmIdx !== TM.karthigai) return false;
  const K = nak("கார்த்திகை"), pv = days[i - 1];
  const n = at(x.iso, dayMoment(x, 1)).N, p = pv ? at(pv.iso, dayMoment(pv, 1)).N : null;
  return (n === K && p !== K) || (n === K + 1 && p === K - 1);
}

// pick: "last" = ஒரே மாதத்தில் நட்சத்திரம்/திதி இருமுறை வந்தால் பின்னது (ஆதாரப் பட்டியல் வழக்கு:
// தைப்பூசம் 2025 = பிப் 11, பங்குனி உத்திரம் 2025 = ஏப் 11); குறிப்பிடாவிட்டால் முதலாவது
const RULES = [
  { name: "போகி", basis: "தை பிறப்புக்கு முந்தைய நாள்", test: (x, at, i, days) => days[i + 1] && days[i + 1].tmIdx === TM.thai && days[i + 1].tmDay === 1 },
  { name: "தைப்பொங்கல்", basis: "தை 1", test: (x) => x.tmIdx === TM.thai && x.tmDay === 1 },
  { name: "மாட்டுப் பொங்கல்", basis: "தை 2", test: (x) => x.tmIdx === TM.thai && x.tmDay === 2 },
  { name: "தை அமாவாசை", basis: "தை மாத அமாவாசை", test: (x, at) => x.tmIdx === TM.thai && at(x.iso, "12:00").T === 30 },
  { name: "ரத சப்தமி", basis: "மாக சுக்ல சப்தமி", test: (x) => x.lunarSun === LM.magha && x.T6 === 7 },
  { name: "தைப்பூசம்", basis: "தை மாத பூச நட்சத்திரம்", pick: "last", test: (x, at) => x.tmIdx === TM.thai && at(x.iso, "12:00").N === nak("பூசம்") },
  { name: "மகா சிவராத்திரி", basis: "மாக கிருஷ்ண சதுர்த்தசி (நள்ளிரவு)", pick: "last", test: (x, at) => x.lunarSun === LM.magha && at(x.iso, "23:59").T === 29 },
  { name: "மாசி மகம்", basis: "மாசி மாத மக நட்சத்திரம் (உதயம்)", pick: "last", test: isMasiMagam },
  { name: "பங்குனி உத்திரம்", basis: "பங்குனி மாத உத்திர நட்சத்திரம்", pick: "last", test: (x) => x.tmIdx === TM.panguni && x.N6 === nak("உத்திரம்") },
  { name: "தமிழ்ப் புத்தாண்டு", basis: "சித்திரை 1", test: (x) => x.tmIdx === TM.chithirai && x.tmDay === 1 },
  { name: "சித்ரா பௌர்ணமி", basis: "சித்திரை மாத பௌர்ணமி", test: (x, at) => x.tmIdx === TM.chithirai && at(x.iso, "12:00").T === 15 },
  { name: "அட்சய திருதியை", basis: "வைசாக சுக்ல திருதியை (முற்பகல்)", pick: "last", test: isAkshayaTritiya },
  { name: "வைகாசி விசாகம்", basis: "வைகாசி மாத விசாக நட்சத்திரம்", pick: "last", test: (x) => x.tmIdx === TM.vaikasi && x.N6 === nak("விசாகம்") },
  { name: "ஆடிப்பெருக்கு", basis: "ஆடி 18", test: (x) => x.tmIdx === TM.aadi && x.tmDay === 18 },
  { name: "ஆடி அமாவாசை", basis: "ஆடி மாத அமாவாசை", test: (x, at) => x.tmIdx === TM.aadi && at(x.iso, "12:00").T === 30 },
  { name: "ஆடிப்பூரம்", basis: "ஆடி மாத பூர நட்சத்திரம்", pick: "last", test: (x) => x.tmIdx === TM.aadi && x.N6 === nak("பூரம்") },
  { name: "கோகுலாஷ்டமி", basis: "சிராவண கிருஷ்ண அஷ்டமி", pick: "last", test: (x) => x.lunarSun === LM.shravana && x.T6 === 23 },
  { name: "விநாயகர் சதுர்த்தி", basis: "பாத்ரபத சுக்ல சதுர்த்தி (நண்பகல்)", pick: "last", test: (x, at) => x.lunarSun === LM.bhadrapada && at(x.iso, "12:00").T === 4 },
  { name: "மகாளய அமாவாசை", basis: "பாத்ரபத அமாவாசை", pick: "last", test: (x, at) => x.lunarSun === LM.bhadrapada && at(x.iso, "12:00").T === 30 },
  { name: "நவராத்திரி தொடக்கம்", basis: "ஆச்வின சுக்ல பிரதமை (உதயம்)", pick: "last", test: isNavaratriStart },
  { name: "சரஸ்வதி பூஜை · ஆயுத பூஜை", basis: "ஆச்வின சுக்ல நவமி", pick: "last", test: (x) => x.lunarSun === LM.ashwina && x.T6 === 9 },
  { name: "விஜயதசமி", basis: "ஆச்வின சுக்ல தசமி (பிற்பகல்)", pick: "last", test: (x, at) => x.lunarSun === LM.ashwina && at(x.iso, "15:00").T === 10 },
  { name: "தீபாவளி", basis: "ஆச்வின கிருஷ்ண சதுர்த்தசி (அதிகாலை)", pick: "last", test: (x, at) => x.lunarSun === LM.ashwina && at(x.iso, "04:30").T === 29 },
  { name: "கந்த சஷ்டி (சூரசம்ஹாரம்)", basis: "கார்த்திக சுக்ல சஷ்டி", pick: "last", test: (x, at) => x.lunarSun === LM.kartika && at(x.iso, "15:00").T === 6 },
  { name: "கார்த்திகை தீபம்", basis: "கார்த்திகை மாத கிருத்திகை நட்சத்திரம் (மாலை)", pick: "last", test: isKarthigaiDeepam },
  { name: "வைகுண்ட ஏகாதசி", basis: "மார்கழி சுக்ல ஏகாதசி (அதிகாலை)", test: (x, at) => x.tmIdx === TM.margazhi && at(x.iso, "04:30").T === 11 },
  { name: "ஆருத்ரா தரிசனம்", basis: "மார்கழி மாத திருவாதிரை நட்சத்திரம்", pick: "last", test: (x) => x.tmIdx === TM.margazhi && x.N6 === nak("திருவாதிரை") },
];

// ஒரு ஆண்டின் பண்டிகைகள் → [{ iso, name, basis, tamil }] (தேதி வரிசை)
export function computeFestivals(year) {
  setEngineTimezone(5.5);
  const at = sampler();
  const days = buildDays(new Date(year, 0, 1), new Date(year, 11, 31), at);
  const out = [];
  for (const rule of RULES) {
    const hits = [];
    days.forEach((x, i) => { if (rule.test(x, at, i, days)) hits.push(x); });
    // ஒரே நிகழ்வுக்குள் (≤ 45 நாள் இடைவெளி) பல நாட்கள் பொருந்தினால் ஒன்றைத் தேர்ந்தெடு;
    // ஜனவரி–டிசம்பர் என இருமுறை வரும் மார்கழிப் பண்டிகைகள் தனித்தனி நிகழ்வுகள்.
    const groups = [];
    for (const h of hits) {
      const g = groups[groups.length - 1];
      if (g && (h.date - g[g.length - 1].date) / 86400000 <= 45) g.push(h); else groups.push([h]);
    }
    for (const g of groups) {
      let chosen = g[0];
      if (g.length > 1) {
        if (rule.pick === "last") chosen = g[g.length - 1];
      }
      out.push({ iso: chosen.iso, name: rule.name, basis: rule.basis, tamil: chosen.tmIdx != null ? `${TAMIL_MONTHS[chosen.tmIdx]} ${chosen.tmDay}` : "" });
    }
  }
  return out.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
}
