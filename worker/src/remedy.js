// ═══════════════════════════════════════════════════════════════════
// பரிகாரத் திட்டம் — "வேர்க் காரணத்திலிருந்து பரிகாரம்" (server-side மட்டும்)
//
// எல்லாக் கிரகத்துக்கும் பரிகாரம் பட்டியலிடுவதில்லை. ஜாதகத்தில்
//   (1) எந்தக் கிரகம் உண்மையில் பாதிக்கப்பட்டுள்ளது (நீசம் / பலவீனம் / பகை / அஸ்தங்கம் / மறைவு),
//   (2) அது இந்த ஜாதகருக்கு எவ்வளவு முக்கியம் (லக்னாதிபதி, நடப்பு தசை/புக்தி, பாதிக்கப்பட்ட
//       வாழ்க்கைப் பகுதியின் அதிபதி/காரகன்),
//   (3) அது இந்த லக்னத்துக்கு சுபனா பாபனா (பலப்படுத்துவதா, சாந்தி செய்வதா — ரத்தினம் கூடுமா கூடாதா)
// என்ற மூன்றையும் பார்த்து, தேவையான இடத்தில் மட்டும் பரிகாரம் சொல்கிறது. தோஷங்கள் (செவ்வாய்,
// கால சர்ப்பம்) மற்றும் சனி கோசாரம் (ஏழரை / அஷ்டம / கண்டக) தனியாக மதிப்பிடப்படும்.
//
// உள்ளீடு: computeFullReport-இன் வெளியீடு (engine கணக்கு மாறாது; இது அதன் மேல் விளக்க அடுக்கு).
// பரிகார உள்ளடக்கம் (மந்திரம், கோயில், தானம்) engine-இன் PLANET_REMEDIES அட்டவணையிலிருந்து.
// ═══════════════════════════════════════════════════════════════════
import { PLANET_REMEDIES, DAY_REMEDIES, RASHIS, generateHoroscope, setEngineTimezone } from "../../src/engine.js";

const SEVEN = ["சூரியன்", "சந்திரன்", "செவ்வாய்", "புதன்", "குரு", "சுக்கிரன்", "சனி"];
const NODES = ["ராகு", "கேது"];
const WEEKDAY_OF = { "சூரியன்": 0, "சந்திரன்": 1, "செவ்வாய்": 2, "புதன்": 3, "குரு": 4, "சுக்கிரன்": 5, "சனி": 6, "ராகு": 6, "கேது": 2 };
const WEEKDAY_TA = ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"];
const WEEKDAY_FULL = ["ஞாயிற்றுக்கிழமை", "திங்கட்கிழமை", "செவ்வாய்க்கிழமை", "புதன்கிழமை", "வியாழக்கிழமை", "வெள்ளிக்கிழமை", "சனிக்கிழமை"];
const DATIVE = { "சூரியன்": "சூரியனுக்கு", "சந்திரன்": "சந்திரனுக்கு", "செவ்வாய்": "செவ்வாய்க்கு", "புதன்": "புதனுக்கு", "குரு": "குருவுக்கு", "சுக்கிரன்": "சுக்கிரனுக்கு", "சனி": "சனிக்கு", "ராகு": "ராகுவுக்கு", "கேது": "கேதுவுக்கு" };

// கிரகத்துக்குரிய வழிபாட்டுத் தெய்வம் + நடைமுறை ஒழுக்கம் (காரகத்துவ அடிப்படை — பொது மரபு)
const DEITY = {
  "சூரியன்": "சிவபெருமான் / சூரிய நாராயணர்", "சந்திரன்": "அம்பாள் (பார்வதி)", "செவ்வாய்": "முருகப்பெருமான்",
  "புதன்": "பெருமாள் (விஷ்ணு)", "குரு": "தட்சிணாமூர்த்தி", "சுக்கிரன்": "மகாலட்சுமி",
  "சனி": "சனீஸ்வரர் / ஆஞ்சநேயர்", "ராகு": "துர்க்கை அம்மன்", "கேது": "விநாயகர்",
};
const CONDUCT = {
  "சூரியன்": "தந்தையையும் மூத்தோரையும் மதித்து நடப்பது; அதிகாலையில் எழுந்து சூரியனை வணங்குவது.",
  "சந்திரன்": "தாயைப் பேணுவது; மன அமைதிக்கு தினமும் சில நிமிடம் தியானம்; இரவு உறக்கத்தைச் சீராக வைப்பது.",
  "செவ்வாய்": "கோபத்தையும் அவசரத்தையும் கட்டுப்படுத்துவது; சகோதரர்களுடன் நல்லுறவு; தினசரி உடற்பயிற்சி.",
  "புதன்": "பேச்சில் நிதானம், கணக்கு வழக்கில் நேர்மை; மாணவர்களின் கல்விக்கு இயன்ற உதவி.",
  "குரு": "ஆசிரியர், பெரியோர் ஆசியைப் பெறுவது; இயன்றபோது அன்னதானம்; கற்றதைப் பிறருக்குச் சொல்லித் தருவது.",
  "சுக்கிரன்": "வாழ்க்கைத் துணையையும் பெண்களையும் மதித்து நடப்பது; உடை, இருப்பிடத்தில் தூய்மை.",
  "சனி": "உழைப்பாளர், முதியோர், மாற்றுத்திறனாளிகளுக்கு உதவுவது; நேர்மை, நேரம் தவறாமை; சோம்பலைத் தவிர்ப்பது.",
  "ராகு": "குறுக்கு வழி, போதைப் பழக்கம், அவசர முதலீடுகளைத் தவிர்ப்பது; பெரிய முடிவுகளில் இரண்டாவது ஆலோசனை கேட்பது.",
  "கேது": "தினமும் சிறிது நேரம் தியானம்; தெரு நாய்களுக்கு உணவளிப்பது; தனிமைப்படுத்திக்கொள்ளாமல் உறவுகளுடன் தொடர்பில் இருப்பது.",
};
const KARAKA = {
  "சூரியன்": "தந்தை · அரசு ஆதரவு", "சந்திரன்": "மனம் · தாய்", "செவ்வாய்": "தைரியம் · நிலம்", "புதன்": "கல்வி · வணிகம்",
  "குரு": "செல்வம் · ஞானம்", "சுக்கிரன்": "திருமண சுகம் · வசதி", "சனி": "உழைப்பு · நிலைத்தன்மை", "ராகு": "அயல் தொடர்பு · பேராசை", "கேது": "ஆன்மீகம் · பற்றின்மை",
};
const HOUSE_AREA = { 1: "உடல் நலம்", 2: "தனம்", 3: "முயற்சி", 4: "வீடு · தாய்", 5: "குழந்தைகள் · புத்தி", 6: "கடன் · நோய்", 7: "திருமணம்", 8: "ஆயுள் · எதிர்பாராத மாற்றம்", 9: "பாக்கியம் · தந்தை", 10: "தொழில்", 11: "லாபம்", 12: "செலவு · உறக்கம்" };

const clean = (s) => String(s || "").replace(/^[\s⚠✓✔✗★☆•·\-–—]+/u, "").replace(/\s+/g, " ").trim();
const istNow = () => new Date(Date.now() + 330 * 60000); // IST கடிகாரம் (getUTC* மூலம் படிக்க)
const isoUTC = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
const noonIST = (y, m, d) => new Date(Date.UTC(y, m, d, 6, 30)); // client-இல் அதே நாளாகக் காட்ட

// வரும் நாட்களில், அந்தக் கிரகத்தின் கிழமையும் வளர்பிறையும் சேரும் முதல் நாள் (தொடங்க உகந்தது)
function nextStartDay(weekday, birth, preferWaxing = true) {
  const now = istNow();
  const mk = (d) => noonIST(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  let fallback = null;
  for (let i = 1; i <= 35; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    if (d.getUTCDay() !== weekday) continue;
    if (!fallback) fallback = d;
    try {
      const hh = generateHoroscope(isoUTC(d), "06:00", birth.lat, birth.lon, true, birth.ayanamsaKey);
      const sun = hh.placements.find((p) => p.ta === "சூரியன்"), moon = hh.placements.find((p) => p.ta === "சந்திரன்");
      const el = (((moon.fullLong - sun.fullLong) % 360) + 360) % 360;
      const tithi = Math.floor(el / 12) + 1; // 1..15 = வளர்பிறை
      if (tithi <= 15) return { date: mk(d), waxing: true, soonest: mk(fallback), day: WEEKDAY_FULL[weekday] };
      if (!preferWaxing) break;
    } catch { break; }
  }
  return fallback ? { date: mk(fallback), waxing: false, soonest: mk(fallback), day: WEEKDAY_FULL[weekday] } : null;
}

// சனி தற்போதைய ராசியில் கடைசியாக இருக்கும் நாள் (வக்ர மறுநுழைவையும் சேர்த்து) — சுமார் தேதி
function saturnStayUntil(currentRashi, birth) {
  const rIdx = RASHIS.indexOf(currentRashi);
  if (rIdx < 0) return null;
  const now = istNow();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const inSign = (offset) => {
    const d = new Date(base + offset * 86400000);
    const hh = generateHoroscope(isoUTC(d), "06:00", birth.lat, birth.lon, true, birth.ayanamsaKey);
    const s = hh.placements.find((p) => p.ta === "சனி");
    return !!s && s.rashiIdx === rIdx;
  };
  try {
    const STEP = 45, MAX = 1215; // ~3.3 ஆண்டு
    let last = 0;
    for (let o = STEP; o <= MAX; o += STEP) if (inSign(o)) last = o;
    if (last >= MAX) return null;
    let lo = last, hi = last + STEP; // lo = ராசியில், hi = வெளியே
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (inSign(mid)) lo = mid; else hi = mid; }
    const d = new Date(base + lo * 86400000);
    return noonIST(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  } catch { return null; }
}

function stepsFor(planet, { light = false } = {}) {
  const r = PLANET_REMEDIES[planet];
  if (!r) return [];
  const day = WEEKDAY_FULL[WEEKDAY_OF[planet]];
  const out = [
    { k: "worship", label: "வழிபாடு", text: `${day}தோறும் ${DEITY[planet]} வழிபாடு; நவகிரக சன்னதியில் ${DATIVE[planet]} விளக்கேற்றி வணங்குங்கள்.` },
    { k: "mantra", label: "மந்திரம்", text: light ? `${r.mantra} — ${day} 108 முறை.` : `${r.mantra} — தினமும் 108 முறை (மொத்த இலக்கு: ${r.mantraCount}).` },
    { k: "charity", label: "தானம்", text: `${day} ${r.donate} — இயன்ற அளவு, தேவையுள்ளவருக்கு.` },
  ];
  if (!light) out.push({ k: "temple", label: "கோயில்", text: `${r.temple} — வாய்ப்புக் கிடைக்கும்போது ஒரு முறை தரிசனம்; இயலாவிட்டால் அருகிலுள்ள கோயிலின் நவகிரக சன்னதி போதும்.` });
  out.push({ k: "conduct", label: "நடைமுறை", text: CONDUCT[planet] });
  return out;
}

export function computeRemedyPlan(h, R, birth) {
  setEngineTimezone(5.5); // "இன்று", தொடங்கும் நாள், சனி கோசாரம் — IST நாட்காட்டிப்படி
  const uni = {}; (R.unifiedStrength || []).forEach((u) => { uni[u.ta] = u; });
  const gb = {}; (R.grahaBala || []).forEach((g) => { gb[g.ta] = g; });
  const fn = R.functionalNature || {};
  const mb = R.marakaBadhaka || { marakaLords: [] };
  const P = (name) => h.placements.find((p) => p.ta === name);
  const houseOf = (p) => (p ? ((p.rashiIdx - h.lagna + 12) % 12) + 1 : null);
  const owns = (name) => (fn[name]?.owns || []);
  const lordOf = (house) => SEVEN.find((n) => owns(n).includes(house)) || null;
  const lagnaLord = lordOf(1);
  const female = /பெண்/.test(birth.gender || "");

  // ── நடப்பு / வரும் தசை புக்தி ──
  const dashas = R.dashaData?.dashas || [];
  const mdIdx = dashas.findIndex((d) => d.isCurrent);
  const md = mdIdx >= 0 ? dashas[mdIdx] : null;
  const ads = md?.antardashas || [];
  const adIdx = ads.findIndex((a) => a.isCurrent);
  const ad = adIdx >= 0 ? ads[adIdx] : null;
  const now = Date.now();
  const within = (date, months) => date && new Date(date).getTime() - now < months * 30.44 * 86400000;
  const nextAd = adIdx >= 0 && ads[adIdx + 1] && within(ads[adIdx + 1].startDate, 12) ? ads[adIdx + 1] : null;
  const nextMd = mdIdx >= 0 && dashas[mdIdx + 1] && within(dashas[mdIdx + 1].startDate, 24) ? dashas[mdIdx + 1] : null;

  // ── பாதிக்கப்பட்ட வாழ்க்கைப் பகுதிகள் (engine தீர்ப்பு: score < 0) ──
  const ka = R.keyAreas || {};
  const AREA_DEF = [
    { key: "health", name: "ஆரோக்கியம்", lordHouse: 1, karaka: "சூரியன்", karakaLabel: "ஆரோக்கிய காரகன்" },
    { key: "marriage", name: "திருமணம்", lordHouse: 7, karaka: female ? "குரு" : "சுக்கிரன்", karakaLabel: female ? "கணவன் காரகன்" : "களத்திர காரகன்" },
    { key: "career", name: "தொழில்", lordHouse: 10, karaka: "சனி", karakaLabel: "கர்ம காரகன்" },
  ];
  const troubled = AREA_DEF.filter((a) => ka[a.key] && typeof ka[a.key].score === "number" && ka[a.key].score < 0);

  // ── ஒவ்வொரு கிரகத்தின் நிலை ஆய்வு ──
  const diag = {};
  for (const name of SEVEN) {
    const p = P(name); if (!p) continue;
    const u = uni[name], g = gb[name];
    const house = houseOf(p);
    const status = g?.status || "";
    const dignified = ["உச்சம்", "சொந்த வீடு", "மூலத்திரிகோணம்"].includes(status);
    const root = []; let affl = 0;
    if (status === "நீசம்") { affl += 3; root.push(`${name} ${p.rashi} ராசியில் நீசம் — இயல்பான பலம் மிகக் குறைந்த நிலை`); }
    if (u && u.composite < 30) { affl += 3; root.push(`ஒருங்கிணைந்த பலம் ${u.composite}/100 — மிகப் பலவீனம்`); }
    else if (u && u.composite < 45) { affl += 2; root.push(`ஒருங்கிணைந்த பலம் ${u.composite}/100 — பலவீனம்`); }
    if (status === "எதிரி வீடு") { affl += 1; root.push(`பகை வீட்டில் (${p.rashi}) — தன் பலனை முழுமையாகத் தர முடியாத நிலை`); }
    if (p.isCombust || (u?.flags || []).includes("அஸ்தங்கம்")) { affl += 1.5; root.push("சூரியனுக்கு மிக அருகில் — அஸ்தங்கம் (ஒளி மங்கிய நிலை)"); }
    if ([6, 8, 12].includes(house) && !dignified) { affl += 1; root.push(`${house}ஆம் வீட்டில் — மறைவு ஸ்தானம்`); }
    const nature = fn[name]?.nature || "சமம்";
    const isMaraka = (mb.marakaLords || []).includes(name), isBadhaka = mb.badhakaLord === name;
    diag[name] = { name, house, rashi: p.rashi, status, composite: u?.composite ?? null, tier: u?.tier || "", affl, root, nature, isMaraka, isBadhaka, owns: owns(name) };
  }
  for (const name of NODES) {
    const p = P(name); if (!p) continue;
    const house = houseOf(p);
    const root = []; let affl = 0;
    const withLum = h.placements.filter((q) => (q.ta === "சூரியன்" || q.ta === "சந்திரன்") && q.rashiIdx === p.rashiIdx).map((q) => q.ta);
    if ([8, 12].includes(house)) { affl += 2; root.push(`${name} ${house}ஆம் வீட்டில் — மறைவு ஸ்தானம்`); }
    else if (![3, 6, 10, 11].includes(house)) { affl += 1; root.push(`${name} ${house}ஆம் வீட்டில் — இது ${name}வுக்கு இயல்பான பலம் தரும் இடம் அல்ல (3, 6, 10, 11 சிறந்தவை)`); }
    if (withLum.length) { affl += 1.5; root.push(`${withLum.join(", ")} உடன் ஒரே ராசியில் — கிரகண சேர்க்கை`); }
    diag[name] = { name, house, rashi: p.rashi, status: "", composite: null, tier: "", affl, root, nature: "சார்பு", isMaraka: false, isBadhaka: false, owns: [], node: true };
  }

  // ── முக்கியத்துவம் (இந்த ஜாதகருக்கு இக்கிரகம் ஏன் முக்கியம்) ──
  const role = {}; const imp = {}; const addRole = (n, w, text) => { if (!diag[n]) return; (role[n] ||= []).push(text); imp[n] = (imp[n] || 0) + w; };
  if (lagnaLord) addRole(lagnaLord, 3, "லக்னாதிபதி — உடல், மனவுறுதி, வாழ்வின் அடித்தளம்");
  if (md) addRole(md.name, 3, `நடப்பு மகா தசை நாதன் — இத்தசை முழுவதும் இவரே வாழ்வை நடத்துகிறார்`);
  if (ad && ad.name !== md?.name) addRole(ad.name, 1.5, "நடப்பு புக்தி நாதன் — இப்போதைய அனுபவங்களைத் தீர்மானிக்கிறார்");
  for (const n of SEVEN) {
    const d = diag[n]; if (!d) continue;
    if (d.nature === "யோககாரகன்") addRole(n, 2, "யோககாரகன் — இந்த லக்னத்துக்கு மிக நன்மை தரக்கூடிய கிரகம்");
    if (n !== lagnaLord && d.owns.includes(5)) addRole(n, 1.5, "5ஆம் அதிபதி — பூர்வ புண்ணியம், புத்தி, குழந்தைகள்");
    if (n !== lagnaLord && d.owns.includes(9)) addRole(n, 1.5, "9ஆம் அதிபதி — பாக்கியம், தந்தை, தெய்வ அருள்");
  }
  addRole("சந்திரன்", 1.5, "மனோகாரகன் — மன அமைதி, உறக்கம், தாய்");
  for (const a of troubled) {
    const lord = lordOf(a.lordHouse);
    if (lord && lord !== lagnaLord) addRole(lord, 2, `${a.lordHouse}ஆம் அதிபதி — ${a.name} தொடர்பாக ஜாதகம் கவனம் கோருகிறது`);
    else if (lord) { imp[lord] = (imp[lord] || 0) + 1; }
    if (a.karaka !== lord) addRole(a.karaka, 1.5, `${a.karakaLabel} — ${a.name} தொடர்பாக ஜாதகம் கவனம் கோருகிறது`);
  }

  if (nextAd && nextAd.name !== ad?.name && nextAd.name !== md?.name) addRole(nextAd.name, 1.5, "அடுத்து வரும் புக்தி நாதன்");
  if (nextMd && nextMd.name !== md?.name) addRole(nextMd.name, 2, "அடுத்து வரும் மகா தசை நாதன்");

  // ── பரிகாரம் தேவையா? ──
  const planetItems = []; const noNeed = [];
  const fmtOwn = (d) => d.owns.length ? d.owns.map((x) => `${x}ஆம்`).join(", ") + " வீட்டு அதிபதி" : "";
  for (const name of [...SEVEN, ...NODES]) {
    const d = diag[name]; if (!d) continue;
    const importance = imp[name] || 0;
    const isMD = md?.name === name, isAD = ad?.name === name && !isMD;
    const hostile = d.nature === "பாபன்" || d.isMaraka || d.isBadhaka;
    const comingLord = (nextMd && nextMd.name === name) || (nextAd && nextAd.name === name);
    const keyRole = name === lagnaLord || isMD || isAD || comingLord || troubled.some((a) => lordOf(a.lordHouse) === name || a.karaka === name);
    let need = false, light = false;
    if (importance >= 1.5 && (d.affl >= 2 || (d.affl >= 1 && keyRole))) need = true;
    // பாதிப்பு இல்லாவிட்டாலும் தசை நாதன் மாரக/பாதகாதிபதி எனில் — எளிய சாந்தி மட்டும்
    else if ((isMD || isAD) && (d.isMaraka || d.isBadhaka) && name !== lagnaLord) { need = true; light = true; }
    if (!need) {
      if (isMD) noNeed.push({ title: `${name} மகா தசை`, why: d.node ? `${name} ${d.house}ஆம் வீட்டில் — சாதகமான இடம். தசைக்கெனத் தனிப் பரிகாரம் தேவையில்லை.` : `தசை நாதன் ${name} ${d.composite != null ? `போதிய பலத்துடன் (${d.composite}/100)` : "நல்ல நிலையில்"} உள்ளார். தசைக்கெனத் தனிப் பரிகாரம் தேவையில்லை.` });
      else if (d.affl >= 2) noNeed.push({ title: name, why: `பலம் சற்றுக் குறைவு; ஆனால் தற்போது உங்கள் ஜாதகத்தில் முக்கியப் பங்கு வகிக்கவில்லை. இப்போது தனிப் பரிகாரம் அவசியமில்லை.` });
      continue;
    }

    // ── அணுகுமுறை: பலப்படுத்துவதா, சாந்தி செய்வதா ──
    const r = PLANET_REMEDIES[name] || {};
    let approach, approachLabel, approachWhy, gem;
    const tags = [d.isMaraka ? "மாரகாதிபதி" : "", d.isBadhaka ? "பாதகாதிபதி" : ""].filter(Boolean).join(", ");
    if (d.node) {
      approach = "pacify"; approachLabel = "சாந்தி செய்தல்";
      approachWhy = `${name} நிழல் கிரகம் — அதைப் பலப்படுத்துவது அல்ல, அமைதிப்படுத்துவதே முறை.`;
      gem = { name: r.gem, verdict: "no", note: `${r.gem} தானாக அணிய வேண்டாம். நிழல் கிரக ரத்தினங்கள் எல்லா ஜாதகத்துக்கும் பொருந்தாது.` };
    } else if (name === lagnaLord || ((d.nature === "சுபன்" || d.nature === "யோககாரகன்") && !d.isBadhaka)) {
      approach = "strengthen"; approachLabel = "பலப்படுத்துதல்";
      approachWhy = name === lagnaLord
        ? `${name} உங்கள் லக்னாதிபதி — எப்போதும் உங்களுக்குச் சாதகமானவர். அவரைப் பலப்படுத்துவது நேரடிப் பயன் தரும்.`
        : `${name} இந்த லக்னத்துக்கு ${d.nature} (${fmtOwn(d)}) — நன்மை செய்யும் கிரகம் பலம் குறைந்திருப்பதால் அதைப் பலப்படுத்த வேண்டும்.`;
      gem = d.isMaraka && name !== lagnaLord
        ? { name: r.gem, verdict: "caution", note: `${name} நன்மை தரும் கிரகம் என்றாலும் மாரக ஆதிபத்தியமும் உள்ளது. ${r.gem} அணிவதை ஜோதிடரிடம் நேரில் ஜாதகம் காட்டி உறுதி செய்த பிறகே முடிவு செய்யுங்கள்.` }
        : { name: r.gem, verdict: "ok", note: `${r.gem} பொருந்தக்கூடிய ரத்தினம். எடை, உலோகம், அணியும் நாள் ஆகியவற்றை அனுபவமுள்ள ஜோதிடரிடம் உறுதி செய்த பிறகே அணியுங்கள். ரத்தினம் கட்டாயமல்ல — வழிபாடும் ஒழுக்கமுமே முதன்மை.` };
    } else if (d.nature === "சுபன்" || d.nature === "யோககாரகன்") {
      approach = "balance"; approachLabel = "சமநிலைப்படுத்துதல்";
      approachWhy = `${name} இந்த லக்னத்துக்கு ${d.nature} — நன்மை தருபவர்; ஆனால் பாதக ஆதிபத்தியமும் சேர்ந்துள்ளது. எனவே ரத்தினத்தால் பலப்படுத்தாமல், வழிபாடு, தானம், ஒழுக்கம் மூலம் அவரது நல்ல பலனைப் பெறுவதே முறை.`;
      gem = { name: r.gem, verdict: "caution", note: `${r.gem} தானாக அணிய வேண்டாம் — நன்மையும் பாதகமும் கலந்த ஆதிபத்தியம் என்பதால் ஜோதிடரிடம் நேரில் ஜாதகம் காட்டி ஆலோசித்த பிறகே.` };
    } else if (hostile) {
      approach = "pacify"; approachLabel = "சாந்தி செய்தல்";
      approachWhy = `${name} இந்த லக்னத்துக்கு ${d.nature === "பாபன்" ? "செயல்முறை பாபன்" : d.nature}${tags ? ` · ${tags}` : ""}${fmtOwn(d) ? ` (${fmtOwn(d)})` : ""}. இக்கிரகத்தைப் பலப்படுத்தினால் அதன் பாதகப் பலனும் கூடலாம்; எனவே ஜபம், தானம், வழிபாடு மூலம் அமைதிப்படுத்துவதே சரியான முறை.`;
      gem = { name: r.gem, verdict: "no", note: `${r.gem} அணிய வேண்டாம் — இந்த லக்னத்துக்கு ${name} ${tags || "பாபன்"} என்பதால் அதன் ரத்தினம் பாதகத்தைக் கூட்டக்கூடும்.` };
    } else {
      approach = "balance"; approachLabel = "சமநிலைப்படுத்துதல்";
      approachWhy = `${name} இந்த லக்னத்துக்கு சமநிலைக் கிரகம்${fmtOwn(d) ? ` (${fmtOwn(d)})` : ""}. மந்திரம், தானம், வழிபாடு போதும்.`;
      gem = { name: r.gem, verdict: "caution", note: `${r.gem} தேவையில்லை. விரும்பினால் ஜோதிடரிடம் ஜாதகம் காட்டி ஆலோசித்த பிறகே.` };
    }

    // ── எந்த நிலையில் / எவ்வளவு காலம் ──
    let stage = "root", stageLabel = "அடிப்படை பலம்", until = null, duration;
    if (isAD) { stage = "now"; stageLabel = "இப்போதே"; until = ad.endDate; duration = "நடப்பு புக்தி முடியும் வரை — வாரம் ஒரு முறை தவறாமல்."; }
    else if (isMD) { stage = "now"; stageLabel = "இப்போதே"; until = md.endDate; duration = "நடப்பு மகா தசை முழுவதும் — வாரம் ஒரு முறை தவறாமல்."; }
    else duration = "முதலில் 48 நாள் (ஒரு மண்டலம்) தொடர்ந்து; பிறகு வாரம் ஒரு முறை தொடரலாம்.";
    // நடப்புக் காலம் 6 வாரத்துக்குள் முடிகிறது எனில் நீண்ட பரிகாரம் தேவையில்லை
    if (until && within(until, 1.5)) { light = true; duration = `இந்த ${isAD ? "புக்தி" : "தசை"} விரைவில் முடிகிறது — அதுவரை வாரம் ஒரு முறை எளிய வழிபாடு போதும்.`; }
    const roles = [...(role[name] || [])];
    const coming = nextMd?.name === name ? nextMd : nextAd?.name === name ? nextAd : null;
    if (coming && stage !== "now") {
      stage = "later"; stageLabel = "வரும் காலத்துக்கு";
      duration = `வரும் ${name} ${coming === nextMd ? "மகா தசை" : "புக்தி"} தொடங்கும் முன்பே தொடங்கி, அக்காலம் முழுவதும் — வாரம் ஒரு முறை.`;
    }

    const affects = [...new Set([...(d.node ? [HOUSE_AREA[d.house]] : d.owns.map((x) => HOUSE_AREA[x])), KARAKA[name]].filter(Boolean))].slice(0, 4);
    const rootLines = d.root.length ? d.root : [`${name} பலத்தில் குறையில்லை; ஆனால் ${tags || "தசை நாதன்"} என்ற முறையில் இக்காலத்தில் கவனம் தேவை`];
    const start = nextStartDay(WEEKDAY_OF[name], birth, stage !== "now");
    planetItems.push({
      id: `planet-${name}`, kind: "planet", planet: name, title: light ? `${name} — எளிய வழிபாடு` : `${name} ${approach === "strengthen" ? "பலம் பெற" : approach === "balance" ? "வழிபாடு" : "சாந்தி"}`,
      stage, stageLabel, until, comingFrom: coming && stage !== "now" ? coming.startDate : null,
      root: rootLines, role: roles, affects, approach, approachLabel, approachWhy,
      steps: stepsFor(name, { light }), day: WEEKDAY_TA[WEEKDAY_OF[name]],
      startOn: start, duration, gem, light,
      score: light ? 2 : d.affl + importance + (stage === "now" ? 2 : 0),
    });
  }
  // செவ்வாய் தோஷம் உள்ளபோது செவ்வாய்க்கான தனிப் பரிகாரம் அதனுடன் இணைக்கப்படும் (ஒரே வழிபாடு இருமுறை வேண்டாம்)
  const cdActive = !!(R.chevvaiDosham && R.chevvaiDosham.present && !R.chevvaiDosham.cancelled);
  let marsMerged = null;
  if (cdActive) {
    const i = planetItems.findIndex((x) => x.planet === "செவ்வாய்" && x.stage !== "now");
    if (i >= 0) marsMerged = planetItems.splice(i, 1)[0];
  }
  planetItems.sort((a, b) => b.score - a.score);
  const mainPlanets = planetItems.slice(0, 3);
  const morePlanets = planetItems.slice(3);

  // ── தோஷங்கள் ──
  const doshaItems = []; const doshas = [];
  const cd = R.chevvaiDosham;
  if (cd) {
    if (cd.present && !cd.cancelled) {
      const mars = diag["செவ்வாய்"]; const mr = PLANET_REMEDIES["செவ்வாய்"];
      const from = [cd.fromLagna ? `லக்னத்திலிருந்து ${cd.marsHouseFromLagna}ஆம் வீட்டில்` : "", cd.fromMoon ? `சந்திரனிலிருந்து ${cd.marsHouseFromMoon}ஆம் வீட்டில்` : "", cd.fromVenus ? `சுக்கிரனிலிருந்து ${cd.marsHouseFromVenus}ஆம் வீட்டில்` : ""].filter(Boolean);
      const marsGood = mars && (mars.nature === "சுபன்" || mars.nature === "யோககாரகன்" || lagnaLord === "செவ்வாய்") && !mars.isBadhaka;
      const mild = /லேசான/.test(cd.severityText || "");
      doshas.push({ key: "chevvai", name: "செவ்வாய் தோஷம்", status: "present", label: cd.severityText || "உண்டு" });
      doshaItems.push({
        id: "dosha-chevvai", kind: "dosha", title: `செவ்வாய் தோஷம் — ${cd.severityText}`,
        stage: "marriage", stageLabel: "திருமணத்துக்கு முன்",
        root: [`செவ்வாய் ${cd.marsRashi} ராசியில்: ${from.join("; ")}`, mild ? "லேசான அளவு — மூன்று நிலைகளில் ஒன்றில் மட்டும் அமைந்துள்ளது" : "விதிவிலக்கு (தோஷ நிவர்த்தி) அமைப்பு ஜாதகத்தில் இல்லை"],
        role: ["திருமணப் பொருத்தம் பார்க்கும் நிலையில்தான் இதற்கு முக்கியத்துவம்; திருமணம் ஆனவர்களுக்கு தம்பதி ஒற்றுமைக்கான வழிபாடாகச் செய்யலாம்.", ...(marsMerged ? marsMerged.root.map((t) => `மேலும்: செவ்வாய் ${t.replace(/^செவ்வாய்\s*/, "")}`) : [])],
        affects: ["திருமணப் பொருத்தம்", "தம்பதி ஒற்றுமை"],
        approach: "pacify", approachLabel: "சாந்தி + பொருத்தம்",
        approachWhy: "முதன்மைத் தீர்வு பரிகாரம் அல்ல — பொருத்தம் பார்க்கும்போது இருவர் ஜாதகத்திலும் தோஷ சமநிலை இருப்பதை உறுதி செய்வதே. வழிபாடு அதற்குத் துணை.",
        steps: [
          { k: "worship", label: "வழிபாடு", text: "செவ்வாய்க்கிழமைதோறும் முருகப்பெருமான் வழிபாடு; கந்த சஷ்டி கவசம் பாராயணம்." },
          { k: "charity", label: "தானம்", text: `செவ்வாய்க்கிழமை ${mr.donate} — இயன்ற அளவு.` },
          { k: "temple", label: "கோயில்", text: `${mr.temple} — திருமண முயற்சி தொடங்கும் முன் ஒரு முறை தரிசனம்.` },
          { k: "conduct", label: "நடைமுறை", text: "பொருத்தம் பார்க்கும்போது துணையின் ஜாதகத்திலும் செவ்வாய் நிலையைச் சரிபாருங்கள் (இந்த app-இன் பொருத்தம் பகுதி இதைக் கணக்கிடும்)." },
        ],
        day: "செவ்வாய்", startOn: nextStartDay(2, birth, false),
        duration: mild ? "திருமண முயற்சி தொடங்கும்போது சில வாரங்கள் போதும்." : "திருமணம் நிச்சயமாகும் வரை செவ்வாய்க்கிழமைதோறும்.",
        gem: marsGood
          ? { name: mr.gem, verdict: "caution", note: `செவ்வாய் உங்கள் லக்னத்துக்கு நன்மை தரும் கிரகம்; ${mr.gem} பற்றி ஜோதிடரிடம் நேரில் ஆலோசித்து முடிவு செய்யலாம். தோஷத்துக்காக மட்டும் அணிய வேண்டாம்.` }
          : { name: mr.gem, verdict: "no", note: `${mr.gem} அணிய வேண்டாம் — செவ்வாய் தோஷம் என்பது செவ்வாயின் வேகம் அதிகமுள்ள நிலை; ரத்தினம் அதை மேலும் கூட்டும்.` },
        score: (mild ? 2 : 4) + (marsMerged ? 1 : 0),
      });
    } else if (cd.present && cd.cancelled) {
      doshas.push({ key: "chevvai", name: "செவ்வாய் தோஷம்", status: "cancelled", label: "நிவர்த்தி" });
      noNeed.push({ title: "செவ்வாய் தோஷம்", why: `அமைப்பு இருந்தாலும் நிவர்த்தி ஆகிவிட்டது${cd.cancelReason ? ` — ${clean(cd.cancelReason)}` : ""}. பரிகாரம் தேவையில்லை.` });
    } else {
      doshas.push({ key: "chevvai", name: "செவ்வாய் தோஷம்", status: "absent", label: "இல்லை" });
      noNeed.push({ title: "செவ்வாய் தோஷம்", why: "உங்கள் ஜாதகத்தில் இல்லை." });
    }
  }
  const ks = R.kalaSarpa;
  if (ks && ks.present) {
    const partial = !!ks.partial;
    doshas.push({ key: "kalasarpa", name: "கால சர்ப்ப அமைப்பு", status: partial ? "partial" : "present", label: partial ? "பகுதி" : "உண்டு" });
    const stepsKs = String(ks.remedy || "").split(/,\s*/).map(clean).filter(Boolean);
    doshaItems.push({
      id: "dosha-kalasarpa", kind: "dosha", title: clean(ks.type) || "கால சர்ப்ப அமைப்பு",
      stage: "root", stageLabel: partial ? "எளிய வழிபாடு" : "அடிப்படை",
      root: [`கிரகங்கள் ராகு (${ks.rahuRashi}) – கேது (${ks.ketuRashi}) அச்சின் ஒரு பக்கத்தில் அமைந்துள்ளன`, partial ? `${ks.outsidePlanet || "ஒரு கிரகம்"} அச்சுக்கு வெளியே உள்ளதால் இது பகுதி அமைப்பு — தாக்கம் குறைவு` : "எல்லாக் கிரகங்களும் அச்சுக்குள் — முழு அமைப்பு"],
      role: ["முயற்சிக்கும் பலனுக்கும் இடையே தாமதம், ஏற்ற இறக்கம் என்று மரபு கூறுகிறது; உழைப்பைக் கைவிடாதவர்களுக்கு பிற்பகுதியில் நல்ல உயர்வும் உண்டு."],
      affects: ["முயற்சியில் தாமதம்", "மன அமைதி"],
      approach: "pacify", approachLabel: "நாக வழிபாடு",
      approachWhy: partial ? "பகுதி அமைப்பு என்பதால் பெரிய பூஜைகள் அவசியமில்லை; எளிய நாக வழிபாடு போதும்." : "ராகு-கேதுவை அமைதிப்படுத்தும் நாக வழிபாடே இதற்கான மரபு வழி.",
      steps: [
        { k: "worship", label: "வழிபாடு", text: partial ? "செவ்வாய் அல்லது வெள்ளிக்கிழமை அருகிலுள்ள கோயிலில் நாகர் சன்னதியில் விளக்கேற்றி வழிபாடு." : (stepsKs[0] || "நாக தோஷ நிவர்த்தி பூஜை") + "." },
        ...(partial ? [] : stepsKs.slice(1).map((t, i) => ({ k: "temple" + i, label: i === stepsKs.length - 2 ? "கோயில்" : "சிறப்பு நாள்", text: t + "." }))),
        { k: "conduct", label: "நடைமுறை", text: "தாமதங்களில் மனம் தளராமல் தொடர் முயற்சி; ராகு காலத்தில் துர்க்கை வழிபாடு மன உறுதி தரும்." },
      ],
      day: "செவ்வாய் / வெள்ளி", startOn: null,
      duration: partial ? "மாதம் ஒரு முறை போதும்." : "ஆண்டுக்கு ஒரு முறை சிறப்பு வழிபாடு; இடையில் மாதம் ஒரு முறை நாகர் வழிபாடு.",
      gem: null, score: partial ? 1 : 3.5,
    });
  } else if (ks) {
    doshas.push({ key: "kalasarpa", name: "கால சர்ப்ப அமைப்பு", status: "absent", label: "இல்லை" });
    noNeed.push({ title: "கால சர்ப்ப அமைப்பு", why: "உங்கள் ஜாதகத்தில் இல்லை." });
  }

  // ── சனி கோசாரம் (ஏழரை / அஷ்டம / கண்டக) ──
  const transitItems = [];
  const sani = R.planetTransitAnalysis?.sani;
  if (sani) {
    const kind = sani.isSadeSati ? "ஏழரை சனி" : sani.isAshtama ? "அஷ்டம சனி" : sani.isKandaka ? "கண்டக சனி" : null;
    if (kind) {
      const natal = diag["சனி"]; const sr = PLANET_REMEDIES["சனி"];
      const strongNatal = natal && natal.composite != null && natal.composite >= 60;
      const benefNatal = natal && (natal.nature === "யோககாரகன்" || natal.nature === "சுபன்" || lagnaLord === "சனி");
      const until = saturnStayUntil(sani.currentRashi, birth);
      const phase = sani.isSadeSati ? clean(String(sani.sadeSatiPhase || "").replace(/\(.*?\)/g, "")) : "";
      doshas.push({ key: "sani", name: kind, status: "present", label: phase || "நடப்பில்" });
      const soft = [];
      if (strongNatal) soft.push(`உங்கள் ஜாதகத்தில் சனி பலமாக (${natal.composite}/100) இருப்பதால் தாக்கம் மிதமாகவே இருக்கும்`);
      if (benefNatal) soft.push("சனி உங்கள் லக்னத்துக்கு நன்மை தரும் கிரகம் — இக்காலம் உழைப்புக்கு ஏற்ற உயர்வையும் தரும்");
      transitItems.push({
        id: "transit-sani", kind: "transit", title: `${kind}${phase ? ` — ${phase}` : ""}`,
        stage: "now", stageLabel: "இப்போதே", until,
        root: [`கோசார சனி ${sani.currentRashi} ராசியில் — உங்கள் ஜென்ம ராசி (${h.moonRashi})க்கு ${sani.houseFromMoon}ஆம் இடம்`, (() => { const t = clean(String(sani.desc || "").split(/\.\s/)[0]).replace(/\.$/, ""); return t ? `இக்கட்டத்துக்கு மரபு கூறும் பலன்: ${t}` : ""; })()].filter(Boolean),
        role: soft.length ? soft : ["சனி தண்டிப்பவர் அல்ல, ஒழுங்குபடுத்துபவர் — இக்காலத்தில் பொறுமையும் ஒழுக்கமும்தான் உண்மையான பரிகாரம்."],
        affects: sani.isSadeSati ? ["மன அழுத்தம்", "குடும்பம் · பணம்", "உடல் சோர்வு"] : sani.isAshtama ? ["ஆரோக்கியம்", "எதிர்பாராத செலவு"] : ["கூட்டு · உறவு", "பயணம்"],
        approach: "pacify", approachLabel: "பொறுமை + சனி வழிபாடு",
        approachWhy: "இது ஜாதகக் குறை அல்ல; எல்லோருக்கும் சுழற்சியில் வரும் காலகட்டம். காலம் முடியும்போது தானாக விலகும் — அதுவரை நிதானமும் சேவையும் தாக்கத்தைக் குறைக்கும்.",
        steps: [
          { k: "worship", label: "வழிபாடு", text: "சனிக்கிழமைதோறும் சனீஸ்வரருக்கு எள் (நல்லெண்ணெய்) தீபம்; ஆஞ்சநேயர் வழிபாடு." },
          { k: "mantra", label: "மந்திரம்", text: `${sr.mantra} — சனிக்கிழமை 108 முறை.` },
          { k: "charity", label: "சேவை", text: "முதியோர், உழைப்பாளர், மாற்றுத்திறனாளிகளுக்கு உணவு அல்லது உதவி — இதுவே சனிக்கு மிக உகந்த பரிகாரம்." },
          { k: "temple", label: "கோயில்", text: `${sr.temple} — வாய்ப்புக் கிடைக்கும்போது ஒரு முறை தரிசனம்.` },
          { k: "conduct", label: "நடைமுறை", text: "பெரிய கடன், அவசர முதலீடு, வேலை மாற்றம் ஆகியவற்றில் நிதானம்; உடல்நலப் பரிசோதனையைத் தள்ளிப்போடாதீர்கள்." },
        ],
        day: "சனி", startOn: nextStartDay(6, birth, false),
        duration: until ? "சனி இந்த ராசியை விட்டு நகரும் வரை — சனிக்கிழமைதோறும்." : "இக்காலம் முடியும் வரை — சனிக்கிழமைதோறும்.",
        gem: { name: sr.gem, verdict: "no", note: `கோசாரத்துக்காக ${sr.gem} அணிய வேண்டாம் — நீலம் மிக வேகமாகச் செயல்படும் ரத்தினம்; ஜாதக ஆய்வு இன்றி அணிவது ஆபத்து.` },
        score: (sani.isSadeSati && sani.houseFromMoon === 1) || sani.isAshtama ? 6 : strongNatal ? 3.5 : 5,
      });
    } else {
      doshas.push({ key: "sani", name: "ஏழரை / அஷ்டம சனி", status: "absent", label: "இல்லை" });
      noNeed.push({ title: "ஏழரை சனி · அஷ்டம சனி", why: `தற்போது இல்லை — கோசார சனி உங்கள் ராசிக்கு ${sani.houseFromMoon}ஆம் இடத்தில்.` });
    }
  }

  // ── வரிசை: இப்போதே → அடிப்படை → திருமணத்துக்கு முன் ──
  // மிக லேசானவை (பகுதி கால சர்ப்பம், லேசான தோஷம், எளிய சாந்தி) "விரும்பினால்" பட்டியலுக்கு.
  const ORDER = { now: 0, root: 1, later: 2, marriage: 3 };
  const all = [...mainPlanets, ...doshaItems, ...transitItems];
  // முதன்மைப் பட்டியலில் அதிகபட்சம் 4 — மீதி "விரும்பினால்" பட்டியலில் (குறைவான, தெளிவான பரிகாரமே பயன் தரும்).
  // நடப்புக் காலத்துக்கானவை (தசை/புக்தி, சனி கோசாரம்) தேர்வில் முன்னுரிமை பெறும்.
  const rank = (x) => x.score + (x.stage === "now" ? 1.5 : 0);
  const ranked = all.filter((x) => x.score >= 2.5).sort((a, b) => rank(b) - rank(a));
  const items = ranked.slice(0, 4).sort((a, b) => (ORDER[a.stage] - ORDER[b.stage]) || (b.score - a.score));
  const optional = [...ranked.slice(4), ...all.filter((x) => x.score < 2.5), ...morePlanets];
  [...items].sort((a, b) => b.score - a.score).slice(0, 2).forEach((x) => { x.primary = true; });

  // ── பகுதிவாரி வேர்க் காரணம் (engine-இன் காரணிகள் அப்படியே) ──
  const inPlan = new Set([...planetItems.map((x) => x.planet)]);
  if (marsMerged) inPlan.add("செவ்வாய்");
  const areas = AREA_DEF.filter((a) => ka[a.key]).map((a) => {
    const k = ka[a.key]; const bad = typeof k.score === "number" && k.score < 0;
    const causes = bad ? (k.factors || []).filter((f) => f.weight < 0).sort((x, y) => x.weight - y.weight).slice(0, 3).map((f) => clean(f.text)) : [];
    const lord = lordOf(a.lordHouse);
    const linked = [...new Set([lord, a.karaka])].filter((n) => n && inPlan.has(n));
    if (a.key === "marriage" && doshaItems.some((x) => x.id === "dosha-chevvai")) { const mi = linked.indexOf("செவ்வாய்"); if (mi >= 0) linked.splice(mi, 1); linked.push("செவ்வாய் தோஷம்"); }
    if (a.key === "health" && transitItems.length) linked.push(transitItems[0].title.split(" — ")[0]);
    return { key: a.key, name: a.name, ok: !bad, good: typeof k.score === "number" && k.score >= 1, verdict: clean(k.verdict), causes, linked };
  });
  areas.filter((a) => a.good).forEach((a) => noNeed.push({ title: a.name, why: `${a.verdict} — இப்பகுதிக்கெனத் தனிப் பரிகாரம் தேவையில்லை.` }));

  const fine = SEVEN.filter((n) => diag[n] && diag[n].affl === 0 && !inPlan.has(n));
  if (fine.length) noNeed.push({ title: "மற்ற கிரகங்கள்", why: `${fine.join(", ")} — ஜாதகத்தில் போதிய பலத்துடன் உள்ளன. இவற்றைப் பலப்படுத்தத் தனிப் பரிகாரம் தேவையில்லை.` });

  // ── இன்றைய வழிபாடு ──
  const ist = istNow(); const dow = ist.getUTCDay();
  const dr = DAY_REMEDIES[dow] || null;
  const todayItem = items.find((x) => x.kind === "planet" && WEEKDAY_OF[x.planet] === dow) || (dow === 6 ? transitItems[0] : null) || (dow === 2 ? items.find((x) => x.id === "dosha-chevvai") : null) || null;
  const today = dr ? { weekday: WEEKDAY_FULL[dow], lord: dr.lord, deity: dr.deity, remedy: dr.remedy, donate: dr.donate, avoid: dr.avoid, matches: todayItem ? todayItem.title : null } : null;

  const nowCount = items.filter((x) => x.stage === "now").length;
  const headline = items.length === 0
    ? { tone: "good", title: "பெரிய பரிகாரம் எதுவும் தேவையில்லை", text: "உங்கள் ஜாதகத்தில் முக்கியக் கிரகங்கள் போதிய பலத்துடன் உள்ளன; கவனிக்க வேண்டிய தோஷமோ கோசாரமோ தற்போது இல்லை. வழக்கமான இறை வழிபாடு போதும்." }
    : { tone: nowCount ? "now" : "calm", title: items.length === 1 ? "ஒரு பரிகாரம் பரிந்துரைக்கப்படுகிறது" : `${items.length} பரிகாரங்கள் பரிந்துரைக்கப்படுகின்றன`,
      text: `${nowCount ? (nowCount === items.length ? "இவை இப்போதைய காலகட்டத்துக்கானவை. " : nowCount === 1 ? "இவற்றில் ஒன்று இப்போதைய காலகட்டத்துக்கானது. " : `இவற்றில் ${nowCount} இப்போதைய காலகட்டத்துக்கானவை. `) : ""}${items.length > 1 ? `எல்லாவற்றையும் ஒரே நேரத்தில் செய்ய வேண்டியதில்லை — "முதன்மை" எனக் குறிக்கப்பட்டதில் தொடங்குங்கள்.` : "இதை நிதானமாக, தொடர்ச்சியாகச் செய்தால் போதும்."}` };

  const strip = ({ score, ...x }) => x;
  return {
    lagna: RASHIS[h.lagna], moonRashi: h.moonRashi, nakshatra: h.nakshatra,
    dasha: md ? { maha: md.name, mahaEnd: md.endDate, antar: ad?.name || null, antarEnd: ad?.endDate || null } : null,
    headline,
    principle: [
      "எந்தக் கிரகம் உண்மையில் பாதிக்கப்பட்டுள்ளது (நீசம், பலவீனம், பகை வீடு, அஸ்தங்கம், மறைவு) என்று முதலில் பார்க்கப்படுகிறது.",
      "அது உங்களுக்கு எவ்வளவு முக்கியம் — லக்னாதிபதியா, நடப்பு தசை/புக்தி நாதனா, கவனம் கோரும் வாழ்க்கைப் பகுதியின் அதிபதியா — என்று பார்க்கப்படுகிறது.",
      "அக்கிரகம் உங்கள் லக்னத்துக்கு நன்மை தருபவரா (பலப்படுத்த வேண்டும்) அல்லது பாதகம் தருபவரா (சாந்தி செய்ய வேண்டும்; ரத்தினம் கூடாது) என்பதைப் பொறுத்து முறை தீர்மானிக்கப்படுகிறது.",
      "பாதிப்பு இல்லாத கிரகங்களுக்கும், நிவர்த்தியான தோஷங்களுக்கும் பரிகாரம் சொல்லப்படுவதில்லை.",
    ],
    doshas, areas,
    items: items.map(strip),
    more: optional.map(strip),
    noNeed,
    today,
    caution: [
      "பரிகாரம் என்பது மன உறுதியையும் ஒழுங்கையும் தரும் மரபு வழி; பலனுக்கு உத்தரவாதம் அல்ல. உங்கள் முயற்சியே முதன்மை.",
      "உடல்நலப் பிரச்சனைகளுக்கு மருத்துவ ஆலோசனையே முதல் படி — பரிகாரம் அதற்கு மாற்று அல்ல.",
      "பெரும் செலவுள்ள பூஜை, ரத்தினம் எதையும் அவசரப்பட்டுச் செய்ய வேண்டாம். எளிய வழிபாடும் தானமும் அதே பலனைத் தரும்.",
    ],
  };
}
