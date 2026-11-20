// ═══════════════════════════════════════════════════════════════════
// மாத விரத நாட்கள் — engine-இன் பஞ்சாங்கக் கணக்கின் மேல் (server-only).
//
// ஒவ்வொரு விதியும் Drik Panchang (சென்னை) விரதப் பட்டியல்களுடன் 2021–2030 (10 ஆண்டு,
// 1246 தேதி) ஒப்பிட்டுச் சரிபார்க்கப்பட்டது: scripts/fixtures/vratham-ref.json,
// சோதனை: node scripts/test-vratham.mjs. விதியை மாற்றினால் அந்தச் சோதனை கட்டாயம்.
//
// இடம்: சென்னை, IST — தமிழ்நாட்டுப் பஞ்சாங்க வழக்கு (festivals.js போலவே; பயனர் இடம் சாராது).
//
// கணக்கு முறை: ஒவ்வொரு நாளும் 00:00 IST-க்கு engine-இலிருந்து சூரியன் / சந்திரன் / ராகு நிலை
// (ஆண்டுக்கு ~380 அழைப்பு), இடைப்பட்ட கணங்களுக்கு 4-புள்ளி இடைக்கணிப்பு (engine-உடன்
// வேறுபாடு ≤ 0.002° ≈ 10 விநாடி). திதி / நட்சத்திரத் தொடக்க முடிவு நேரங்கள் அதிலிருந்து.
// சூரிய உதயம் / அஸ்தமனம் = engine-இன் calcSunriseSunset.
// ═══════════════════════════════════════════════════════════════════
import { generateHoroscope, calcSunriseSunset, setEngineTimezone, AYANAMSA_SYSTEMS } from "../../src/engine.js";

const LAT = 13.0827, LON = 80.2707, TZ = 5.5; // சென்னை (festivals.js-உடன் ஒன்றே)
const PAD = 6;                                 // ஆண்டின் இரு முனையிலும் கூடுதல் நாட்கள்
const RAD = Math.PI / 180;
const pad2 = (n) => String(n).padStart(2, "0");
const lonOf = (p) => p.rashiIdx * 30 + p.degExact; // fullLong 0.01°-க்கு முழுமையாக்கப்பட்டது — இது முழுத் துல்லியம்

// x = அந்த ஆண்டின் ஜன 1, 00:00 IST-இலிருந்து நாட்கள் (பின்னம் = நாளின் பகுதி)
function buildEphemeris(year) {
  const nDays = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
  const n = nDays + 2 * PAD + 1;
  const elong = [], moon = [], node = [];
  const push = (arr, v) => { // 360° தாவல் இல்லாத தொடர் மதிப்பு
    if (arr.length) { const p = arr[arr.length - 1]; v += 360 * Math.round((p - v) / 360); }
    arr.push(v);
  };
  for (let j = 0; j < n; j++) {
    const d = new Date(year, 0, 1 + j - PAD);
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const pl = generateHoroscope(iso, "00:00", LAT, LON, true).placements;
    const sun = lonOf(pl[0]), mo = lonOf(pl[1]);
    push(moon, mo);
    push(elong, (((mo - sun) % 360) + 360) % 360);
    push(node, lonOf(pl.find((p) => p.en === "Rahu")));
  }
  // 4-புள்ளி Lagrange இடைக்கணிப்பு
  const at = (arr, x) => {
    const u = x + PAD, j = Math.min(Math.max(Math.floor(u), 1), n - 3), t = u - j;
    return -t * (t - 1) * (t - 2) / 6 * arr[j - 1] + (t + 1) * (t - 1) * (t - 2) / 2 * arr[j]
      - (t + 1) * t * (t - 2) / 2 * arr[j + 1] + (t + 1) * t * (t - 1) / 6 * arr[j + 2];
  };
  // arr (ஏறுவரிசை) = step-இன் ஒவ்வொரு மடங்கையும் தொடும் கணங்கள் → [{ m, x }]
  const crossings = (arr, step) => {
    const out = [];
    for (let j = 1; j < n - 2; j++) {
      for (let m = Math.ceil(arr[j] / step); m * step < arr[j + 1]; m++) {
        let a = j - PAD, b = a + 1;
        for (let k = 0; k < 22; k++) { const mid = (a + b) / 2; if (at(arr, mid) < m * step) a = mid; else b = mid; }
        out.push({ m, x: (a + b) / 2 });
      }
    }
    return out;
  };
  const sunCache = new Map();
  const sunOf = (i) => { // நாள் i-இன் உதயம் / அஸ்தமனம் (x அலகில்)
    let s = sunCache.get(i);
    if (!s) {
      const r = calcSunriseSunset(new Date(year, 0, 1 + i), LAT, LON, TZ);
      s = { rise: i + r.sunrise.decimal / 24, set: i + r.sunset.decimal / 24 };
      sunCache.set(i, s);
    }
    return s;
  };
  const jd0 = Date.UTC(year, 0, 1) / 86400000 + 2440587.5 - TZ / 24; // ஜன 1, 00:00 IST-இன் JD (UT)
  return { nDays, moonAt: (x) => at(moon, x), nodeAt: (x) => at(node, x), tithis: crossings(elong, 12), stars: crossings(moon, 360 / 27), sunOf, jd0 };
}

// ── நாளின் பகுதிகள் (x அலகில்) ──
const dayPart = (f) => (E, i) => { const s = E.sunOf(i); return s.rise + f * (s.set - s.rise); };            // பகலின் f பங்கு
const nightPart = (g) => (E, i) => { const s = E.sunOf(i); return s.set + g * (E.sunOf(i + 1).rise - s.set); }; // இரவின் g பங்கு
const sunset = dayPart(1);
const madhyahnaStart = dayPart(2 / 5), madhyahnaEnd = dayPart(3 / 5); // பகல் 5 பங்கில் 3-ஆவது
const aparahnaStart = dayPart(3 / 5), aparahnaEnd = dayPart(4 / 5);   // பகல் 5 பங்கில் 4-ஆவது
const pradoshaEnd = nightPart(1 / 5);                                 // அஸ்தமனம் முதல் இரவின் 1/5
const nishitaStart = nightPart(7 / 15), nishitaEnd = nightPart(8 / 15); // இரவின் 8-ஆவது முகூர்த்தம் (நள்ளிரவு)

// சந்திரோதயம் (சங்கடஹர சதுர்த்திக்கு மட்டும்). engine-இல் சந்திரோதயக் கணக்கு இல்லை; சந்திரனின்
// நிலை engine-உடையது (தீர்க்கரேகை + ராகுவிலிருந்து அட்சம்), அதை அடிவானக் கோணமாக்கும் நிலையான
// மாற்றம் மட்டும் இங்கே. உயரம் 0.95° (சந்திர இடமாறு தோற்றம்) — Drik வெளியிட்ட 124 சந்திரோதய
// நேரங்களுடன் ≤ 1 நிமிட வேறுபாடு (scripts/test-vratham.mjs இதைச் சரிபார்க்கும்).
function moonAltitude(E, x) {
  const jd = E.jd0 + x, T = (jd - 2451545) / 36525;
  const ml = E.moonAt(x);
  const lam = (ml + AYANAMSA_SYSTEMS.lahiri.calc(T)) * RAD;      // சாயன தீர்க்கரேகை
  const beta = 5.128 * Math.sin((ml - E.nodeAt(x)) * RAD) * RAD; // அட்சம் (சராசரி ராகுவிலிருந்து)
  const eps = (23.4393 - 0.013 * T) * RAD;
  const dec = Math.asin(Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lam));
  const ra = Math.atan2(Math.sin(lam) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps), Math.cos(lam));
  const lst = (280.46061837 + 360.98564736629 * (jd - 2451545) + LON) * RAD;
  return Math.asin(Math.sin(LAT * RAD) * Math.sin(dec) + Math.cos(LAT * RAD) * Math.cos(dec) * Math.cos(lst - ra)) / RAD;
}
const MOONRISE_ALT = 0.95;
// நாள் i-இன் மாலை / இரவுச் சந்திரோதயம் (தேய்பிறைத் தொடக்கம்: அஸ்தமனத்துக்குப் பின்); இல்லையெனில் null
function moonrise(E, i) {
  let a = E.sunOf(i).set - 1.5 / 24, b = a + 9 / 24;
  if (!(moonAltitude(E, a) < MOONRISE_ALT && moonAltitude(E, b) > MOONRISE_ALT)) return null;
  for (let k = 0; k < 16; k++) { const mid = (a + b) / 2; if (moonAltitude(E, mid) < MOONRISE_ALT) a = mid; else b = mid; }
  return (a + b) / 2;
}

// ── நாள் தேர்வு விதிகள். iv = { s, e } திதி / நட்சத்திரத்தின் தொடக்கம், முடிவு ──

// தொடங்கிய பின் வரும் முதல் "கணம்" (அஸ்தமனம் / மத்தியான முடிவு / சந்திரோதயம்) உள்ள நாள்
function firstDayFrom(E, iv, moment) {
  for (let i = Math.floor(iv.s) - 1; i <= Math.floor(iv.s) + 2; i++) { const m = moment(E, i); if (m != null && m >= iv.s) return i; }
  return null;
}

// காலப் பகுதியில் (wa..wb) திதி அதிக நேரம் இருக்கும் நாள். இரு நாளும் பகுதி முழுதும் இருந்தால் bothFull
// ("first" | "last"); எந்த நாளிலும் தொடாவிட்டால் none ("start" = தொடங்கும் நாள், "next" = மறுநாள்).
function dayByWindow(E, iv, wa, wb, { bothFull, none }) {
  const i0 = Math.floor(iv.s) - 1, hits = [];
  for (let i = i0; i <= i0 + 3; i++) {
    const a = wa(E, i), b = wb(E, i), o = Math.min(b, iv.e) - Math.max(a, iv.s);
    if (o > 0) hits.push({ i, o, full: iv.s <= a && b <= iv.e });
  }
  if (hits.length === 1) return hits[0].i;
  if (hits.length > 1) {
    const [p, q] = hits;
    if (p.full && q.full) return bothFull === "first" ? p.i : q.i;
    return p.o >= q.o ? p.i : q.i;
  }
  for (let i = i0; i <= i0 + 3; i++) if (wb(E, i) <= iv.s && iv.e <= wa(E, i + 1)) return none === "start" ? i : i + 1;
  return null;
}

// ஸ்மார்த்த ஏகாதசி: ஏகாதசி முடிந்த பின் வரும் முதல் உதயத்தில் துவாதசி இருந்தால் அதற்கு முந்தைய நாள்
// (உதய ஏகாதசி; இரு உதயங்களில் இருந்தால் பின்னது; உதயத்தைத் தொடாத க்ஷய ஏகாதசி எனில் தொடங்கும் நாள்).
// அந்த உதயத்துக்குள் துவாதசியும் முடிந்திருந்தால் (துவாதசி க்ஷயம்) இன்னும் ஒரு நாள் முன் — மறுநாள்
// பாரணை துவாதசியில் அமைய.
function ekadashiDay(E, iv, dwadashiEnd) {
  for (let i = Math.floor(iv.e); i <= Math.floor(iv.e) + 2; i++) {
    const rise = E.sunOf(i).rise;
    if (rise >= iv.e) return rise < dwadashiEnd ? i - 1 : i - 2;
  }
  return null;
}

const SHUKLA = "வளர்பிறை", KRISHNA = "தேய்பிறை";

// விதிகள் — ஒவ்வொன்றும் Drik பட்டியலுடன் 10 ஆண்டு பொருந்தியது (vratham-ref.json).
// ஆதாரத்தில் நிகழாததால் சரிபார்க்க முடியாத இரு கிளைகள்: பிரதோஷம் / சதுர்த்தி — காலப் பகுதி முழுதும்
// இரு நாளும் திதி இருப்பது (26½ மணிக்கு மேல் நீளும் திதி; மிக அரிது) — இவை நூல் வழக்குப்படி வைக்கப்பட்டவை.
//
// சஷ்டி (வளர்பிறை — முருகன்) வேண்டுமென்றே சேர்க்கப்படவில்லை: எந்த விதியும் எல்லா ஆதாரங்களுடனும்
// பொருந்தவில்லை, தமிழ்ச் சுவர் நாட்காட்டிகள் Drik-இலிருந்து சுமார் மூன்றில் ஒரு மாதம் ஒரு நாள் வேறுபடுகின்றன.
//   விதி 1 — சஷ்டி தொடங்கிய பின் வரும் முதல் அஸ்தமன நாள் (Drik "Skanda Sashti", பஞ்சமியுடன் கூடியது):
//     Drik 124/124 (2021–2030); tamildailycalendar.com 45/74, calendar.tamildot.com 47/74 (2022–2027).
//   விதி 2 — உதயத்தில் சஷ்டி உள்ள நாள்: Drik 61/124; tamildailycalendar.com 66/74, calendar.tamildot.com 65/74.
// ஆதாரத் தேதிகளும் ஒப்பீடும் fixture-இல் உள்ளன (observances.sashti, crossChecks); சோதனை "sashti" வெளியீட்டில்
// இல்லை என்பதை உறுதி செய்கிறது. மீண்டும் சேர்க்க: விதி 1 = { key: "sashti", name: "சஷ்டி", tithi: 6,
// paksha: SHUKLA, pick: (E, iv) => firstDayFrom(E, iv, sunset) } + fixture-இல் shipped: true.
const TITHI_RULES = [
  // அமாவாசை (தர்ப்பண நாள்): அபராஹ்ண காலத்தில் அமாவாசைத் திதி அதிகம் உள்ள நாள்
  { key: "amavasai", name: "அமாவாசை", tithi: 30,
    pick: (E, iv) => dayByWindow(E, iv, aparahnaStart, aparahnaEnd, { bothFull: "first", none: "start" }) },
  // பௌர்ணமி விரதம்: மத்தியான காலம் முடிவதற்குள் பௌர்ணமி தொடங்கினால் அன்று, இல்லையேல் மறுநாள்
  { key: "pournami", name: "பௌர்ணமி", tithi: 15,
    pick: (E, iv) => firstDayFrom(E, iv, madhyahnaEnd) },
  { key: "ekadashi", name: "ஏகாதசி", tithi: 11, paksha: SHUKLA, pick: ekadashiDay },
  { key: "ekadashi", name: "ஏகாதசி", tithi: 26, paksha: KRISHNA, pick: ekadashiDay },
  // பிரதோஷம்: பிரதோஷ காலத்தில் (அஸ்தமனம் + இரவின் 1/5) திரயோதசி அதிகம் உள்ள நாள்
  { key: "pradosham", name: "பிரதோஷம்", tithi: 13, paksha: SHUKLA,
    pick: (E, iv) => dayByWindow(E, iv, sunset, pradoshaEnd, { bothFull: "last", none: "next" }) },
  { key: "pradosham", name: "பிரதோஷம்", tithi: 28, paksha: KRISHNA,
    pick: (E, iv) => dayByWindow(E, iv, sunset, pradoshaEnd, { bothFull: "last", none: "next" }) },
  // சங்கடஹர சதுர்த்தி: தேய்பிறைச் சதுர்த்தி தொடங்கிய பின் வரும் முதல் சந்திரோதய நாள்
  { key: "sankatahara", name: "சங்கடஹர சதுர்த்தி", tithi: 19, paksha: KRISHNA,
    pick: (E, iv) => firstDayFrom(E, iv, moonrise),
    note: (E, i) => { const m = moonrise(E, i); return m == null ? undefined : `சந்திரோதயம் ${hhmm(m)}`; } },
  // சதுர்த்தி (விநாயகர்): மத்தியான காலத்தில் வளர்பிறைச் சதுர்த்தி அதிகம் உள்ள நாள்
  { key: "chaturthi", name: "சதுர்த்தி", tithi: 4, paksha: SHUKLA,
    pick: (E, iv) => dayByWindow(E, iv, madhyahnaStart, madhyahnaEnd, { bothFull: "first", none: "start" }) },
  // மாத சிவராத்திரி: நள்ளிரவு (நிசீத) காலத்தில் தேய்பிறைச் சதுர்த்தசி அதிகம் உள்ள நாள்
  { key: "sivaratri", name: "மாத சிவராத்திரி", tithi: 29, paksha: KRISHNA,
    pick: (E, iv) => dayByWindow(E, iv, nishitaStart, nishitaEnd, { bothFull: "last", none: "next" }) },
];
const KRITTIKA = 2; // நட்சத்திர வரிசை எண் (0 = அசுவினி)
const ORDER = ["amavasai", "pournami", "ekadashi", "pradosham", "sivaratri", "sankatahara", "chaturthi", "krittikai"];

function hhmm(x) {
  const t = Math.round((x - Math.floor(x)) * 1440) % 1440;
  return `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`;
}

// ஓர் ஆங்கில ஆண்டின் விரத நாட்கள்
// → { year, items: [{ key, name, date: "YYYY-MM-DD", paksha?, note? }] } (தேதி வரிசை)
export function computeVratham(year) {
  setEngineTimezone(TZ); // பஞ்சாங்கம் எப்போதும் IST
  year = Math.trunc(Number(year));
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return { year, items: [] };
  const E = buildEphemeris(year);
  const items = [];
  const add = (key, name, i, extra) => {
    if (i == null || i < 0 || i >= E.nDays) return;
    const d = new Date(year, 0, 1 + i);
    const item = { key, name, date: `${year}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` };
    if (extra.paksha) item.paksha = extra.paksha;
    if (extra.note) item.note = extra.note;
    items.push(item);
  };

  // திதி எண் → அதன் ஒவ்வொரு நிகழ்வு { s, e, next } (next = அடுத்த திதியின் முடிவு)
  const T = E.tithis;
  for (const rule of TITHI_RULES) {
    for (let k = 0; k + 2 < T.length; k++) {
      if (((T[k].m % 30) + 30) % 30 !== rule.tithi - 1) continue;
      const iv = { s: T[k].x, e: T[k + 1].x };
      const i = rule.pick(E, iv, T[k + 2].x);
      if (i == null) continue;
      let note = rule.note ? rule.note(E, i) : undefined;
      if (rule.key === "pradosham") {
        const wd = new Date(year, 0, 1 + i).getDay();
        if (wd === 6) note = "சனிப் பிரதோஷம்"; else if (wd === 1) note = "சோம பிரதோஷம்";
      }
      add(rule.key, rule.name, i, { paksha: rule.paksha, note });
    }
  }
  // கிருத்திகை: கார்த்திகை நட்சத்திரம் தொடங்கிய பின் வரும் முதல் அஸ்தமன நாள் (மாலையில் கிருத்திகை)
  const S = E.stars;
  for (let k = 0; k + 1 < S.length; k++) {
    if (((S[k].m % 27) + 27) % 27 !== KRITTIKA) continue;
    add("krittikai", "கிருத்திகை", firstDayFrom(E, { s: S[k].x, e: S[k + 1].x }, sunset), {});
  }

  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : ORDER.indexOf(a.key) - ORDER.indexOf(b.key)));
  return { year, items };
}
