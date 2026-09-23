// ═══════════════════════════════════════════════════════════════════
// ஆழமான வாழ்க்கை பகுப்பாய்வு (DEEP LIFE-AREA ANALYSIS)
// The 3 areas people consult astrologers for: MARRIAGE, HEALTH, CAREER.
// Applies MULTIPLE classical factors together (not just planet-in-house):
//   - House occupants + their strength/condition
//   - House LORD placement (kendra/trikona = good; dusthana 6,8,12 = affliction)
//   - Karaka (natural significator) strength & placement
//   - Benefic vs malefic aspects on the house
//   - Navamsa (D9) confirmation
// Sources: BPHS, Saravali, Phaladeepika classical marriage/health/career rules.
// Produces a weighted verdict — used to give an HONEST assessment, including
// warnings when classical factors point to difficulty.
// ═══════════════════════════════════════════════════════════════════

const NATURAL_BENEFICS = ["குரு", "சுக்கிரன்", "புதன்", "சந்திரன்"];
const NATURAL_MALEFICS = ["சூரியன்", "செவ்வாய்", "சனி", "ராகு", "கேது"];
const DUSTHANA = [6, 8, 12];   // houses of difficulty
const KENDRA = [1, 4, 7, 10];  // angular (strong)
const TRIKONA = [1, 5, 9];     // trinal (auspicious)

// Special aspects (houses a planet aspects, counted from itself)
const ASPECT_RULES = {
  default: [7],
  "செவ்வாய்": [4, 7, 8],
  "குரு": [5, 7, 9],
  "சனி": [3, 7, 10],
  "ராகு": [5, 7, 9],  // Rahu/Ketu aspects (many traditions use 5,7,9 like Jupiter)
  "கேது": [5, 7, 9],
};

// ── Helper: does planet A aspect house H (from lagna)? ──
function planetAspectsHouse(planet, lagnaIdx, targetHouseNum) {
  const planetHouse = ((planet.rashiIdx - lagnaIdx + 12) % 12) + 1;
  const rules = ASPECT_RULES[planet.ta] || ASPECT_RULES.default;
  return rules.some(offset => ((planetHouse - 1 + offset - 1) % 12) + 1 === targetHouseNum);
}

// ── Helper: strength status of a planet from grahaBala ──
function strengthLevel(planetName, grahaBala) {
  const g = grahaBala?.find(x => x.ta === planetName);
  if (!g) return { score: 5, status: "—", level: "medium" };
  const level = g.score >= 7 ? "strong" : g.score >= 5 ? "medium" : "weak";
  return { score: g.score, status: g.status, level, combust: g.combust };
}

// ── Helper: navamsa sign of a planet (for D9 confirmation) ──
function navamsaSign(p) {
  const navPart = Math.floor(p.degExact / (30 / 9));
  return (p.rashiIdx * 9 + navPart) % 12;
}

// ── ctx: ஒருங்கிணைந்த இணைப்பு அடுக்கு (App-இன் மைய engine-களில் இருந்து) ──
// ctx = { sav: [12], shadBala: [{ta,total,required,strong}], functionalNat: {ta:{nature}} }
// இல்லாவிட்டால் (null) பழைய factor-கள் மட்டுமே — verdict முறை மாறாது.
// SAV (சர்வாஷ்டகவர்க்கம்) — அந்த வீட்டு ராசியின் மொத்த பிந்து: ≥30 வலு, ≤24 குறை (சராசரி ~28).
function savFactor(ctx, houseRashiIdx, houseLabel, factors) {
  const sav = ctx?.sav?.[houseRashiIdx];
  if (sav == null) return 0;
  if (sav >= 30) { factors.push({ text: `${houseLabel} ராசியில் சர்வாஷ்டகவர்க்கம் ${sav} பிந்து (≥30) — வீட்டிற்கு வலுவான ஆதரவு`, weight: +1 }); return 1; }
  if (sav <= 24) { factors.push({ text: `${houseLabel} ராசியில் சர்வாஷ்டகவர்க்கம் ${sav} பிந்து (≤24) — வீட்டு ஆதரவு குறைவு`, weight: -1 }); return -1; }
  factors.push({ text: `${houseLabel} ராசியில் சர்வாஷ்டகவர்க்கம் ${sav} பிந்து — சராசரி நிலை`, weight: 0 });
  return 0;
}
// ஷட்பலம் — BPHS 6-அம்ச பலம்: dignity-மட்டும் பார்க்கும் grahaBala-விலிருந்து சுயாதீன உறுதிப்பாடு
function shadbalaFactor(ctx, planetName, roleLabel, factors) {
  const sb = ctx?.shadBala?.find(s => s.ta === planetName);
  if (!sb) return 0;
  const ratio = sb.total / sb.required;
  if (ratio >= 1) { factors.push({ text: `${roleLabel} ${planetName} ஷட்பலத்தில் தேவையை எட்டுகிறார் (${Math.round(sb.total)}/${sb.required} ரூபா) — BPHS உறுதிப்பாடு`, weight: +1 }); return 1; }
  if (ratio < 0.6) { factors.push({ text: `${roleLabel} ${planetName} ஷட்பலத்தில் மிகக் குறைவு (${Math.round(sb.total)}/${sb.required} ரூபா)`, weight: -1 }); return -1; }
  return 0;
}
// லக்னவாரி இயல்பு — அதே கிரகம் இந்த லக்னத்திற்கு யோககாரகனா/பாபனா
function functionalFactor(ctx, planetName, roleLabel, factors) {
  const fn = ctx?.functionalNat?.[planetName];
  if (!fn) return 0;
  if (fn.nature === "யோககாரகன்") { factors.push({ text: `${roleLabel} ${planetName} இந்த லக்னத்திற்கு யோககாரகன் — பலன் உயர்வாக விளையும்`, weight: +1 }); return 1; }
  if (fn.nature === "பாபன்") { factors.push({ text: `${roleLabel} ${planetName} இந்த லக்னத்திற்கு செயல்முறை பாபன் — பலனில் கலப்பு/தடை`, weight: -1 }); return -1; }
  return 0;
}

// ═══════════════════════════════════════════════════════════════════
// MARRIAGE ANALYSIS (7th house) — the #1 consultation reason
// ═══════════════════════════════════════════════════════════════════
export function analyzeMarriage(horoscope, grahaBala, chevvaiDosham, navamsaStrength, ctx) {
  const RASHI_LORD = ["செவ்வாய்","சுக்கிரன்","புதன்","சந்திரன்","சூரியன்","புதன்","சுக்கிரன்","செவ்வாய்","குரு","சனி","சனி","குரு"];
  const lagnaIdx = horoscope.lagna;
  const placements = horoscope.placements;
  const find = (n) => placements.find(p => p.ta === n);

  const factors = [];       // each: {text, weight} weight: +good / -bad
  let score = 0;

  // House 7 details
  const h7Rashi = (lagnaIdx + 6) % 12;
  const h7LordName = RASHI_LORD[h7Rashi];
  const h7Lord = find(h7LordName);
  const h7LordHouse = h7Lord ? ((h7Lord.rashiIdx - lagnaIdx + 12) % 12) + 1 : null;
  const occupants7 = placements.filter(p => p.rashiIdx === h7Rashi);

  // FACTOR 1: 7th lord placement (MOST important for marriage stability)
  if (h7LordHouse) {
    if (DUSTHANA.includes(h7LordHouse)) {
      score -= 2;
      factors.push({ text: `7ஆம் வீட்டு அதிபதி (${h7LordName}) ${h7LordHouse}ஆம் வீட்டில் (துஸ்தானம்) — திருமண வாழ்வில் தடை/பிரிவு சாத்தியம்`, weight: -2 });
    } else if (KENDRA.includes(h7LordHouse) || TRIKONA.includes(h7LordHouse)) {
      score += 2;
      factors.push({ text: `7ஆம் வீட்டு அதிபதி (${h7LordName}) ${h7LordHouse}ஆம் வீட்டில் (கேந்திர/திரிகோணம்) — திருமண வாழ்வு நிலையானது`, weight: +2 });
    } else {
      factors.push({ text: `7ஆம் வீட்டு அதிபதி (${h7LordName}) ${h7LordHouse}ஆம் வீட்டில் — நடுத்தர நிலை`, weight: 0 });
    }
    // 7th lord strength
    const lordStr = strengthLevel(h7LordName, grahaBala);
    if (lordStr.level === "weak") { score -= 1; factors.push({ text: `7ஆம் வீட்டு அதிபதி பலவீனம் (${lordStr.status}) — துணை/உறவில் பலவீனம்`, weight: -1 }); }
    else if (lordStr.level === "strong") { score += 1; factors.push({ text: `7ஆம் வீட்டு அதிபதி பலம் (${lordStr.status})`, weight: +1 }); }
  }

  // FACTOR 2: Venus (Kalatra Karaka — significator of spouse) condition
  const venus = find("சுக்கிரன்");
  if (venus) {
    const venusHouse = ((venus.rashiIdx - lagnaIdx + 12) % 12) + 1;
    const venusStr = strengthLevel("சுக்கிரன்", grahaBala);
    if (DUSTHANA.includes(venusHouse) || venusStr.level === "weak" || venus.isCombust) {
      score -= 1;
      const why = [DUSTHANA.includes(venusHouse) ? venusHouse+"ஆம் வீட்டில்" : "", venus.isCombust ? "அஸ்தங்கம்" : "", venusStr.level==="weak" ? "பலவீனம்" : ""].filter(Boolean).join(", ");
      factors.push({ text: `கல்யாண காரகன் சுக்கிரன் — ${why} — திருமண சுகத்தில் குறை`, weight: -1 });
    } else if (venusStr.level === "strong") {
      score += 1;
      factors.push({ text: `கல்யாண காரகன் சுக்கிரன் பலமாக உள்ளார் — திருமண சுகம்`, weight: +1 });
    }
  }

  // FACTOR 3: Malefics in 7th house (Mars, Saturn, Rahu, Ketu, Sun)
  const maleficsIn7 = occupants7.filter(p => NATURAL_MALEFICS.includes(p.ta));
  if (maleficsIn7.length > 0) {
    score -= maleficsIn7.length;
    factors.push({ text: `7ஆம் வீட்டில் பாப கிரகம்: ${maleficsIn7.map(p=>p.ta).join(", ")} — தாம்பத்யத்தில் சவால்/கருத்து வேறுபாடு`, weight: -maleficsIn7.length });
  }
  // Benefics in 7th house
  const beneficsIn7 = occupants7.filter(p => NATURAL_BENEFICS.includes(p.ta));
  if (beneficsIn7.length > 0) {
    score += 1;
    factors.push({ text: `7ஆம் வீட்டில் சுப கிரகம்: ${beneficsIn7.map(p=>p.ta).join(", ")} — நல்ல துணை`, weight: +1 });
  }

  // FACTOR 4: Malefic aspects on 7th house
  const maleficAspects7 = placements.filter(p => NATURAL_MALEFICS.includes(p.ta) && p.rashiIdx !== h7Rashi && planetAspectsHouse(p, lagnaIdx, 7));
  if (maleficAspects7.length > 0) {
    score -= 1;
    factors.push({ text: `7ஆம் வீட்டை பாப கிரகம் பார்க்கிறது: ${maleficAspects7.map(p=>p.ta).join(", ")} — உறவில் அழுத்தம்`, weight: -1 });
  }
  // Jupiter aspect on 7th (very protective for marriage)
  const jupiter = find("குரு");
  if (jupiter && jupiter.rashiIdx !== h7Rashi && planetAspectsHouse(jupiter, lagnaIdx, 7)) {
    score += 1;
    factors.push({ text: `குரு 7ஆம் வீட்டை பார்க்கிறார் — திருமண வாழ்வுக்கு பாதுகாப்பு`, weight: +1 });
  }

  // FACTOR 5: Chevvai Dosham (already computed by app)
  if (chevvaiDosham) {
    if (chevvaiDosham.present && !chevvaiDosham.cancelled) {
      score -= 1;
      factors.push({ text: `செவ்வாய் தோஷம் உண்டு (${chevvaiDosham.severityText}) — பொருத்தம் பார்க்க கவனம் தேவை`, weight: -1 });
    } else if (chevvaiDosham.present && chevvaiDosham.cancelled) {
      factors.push({ text: `செவ்வாய் தோஷம் உண்டு ஆனால் நிவர்த்தி (${chevvaiDosham.cancelReason})`, weight: 0 });
    }
  }

  // FACTOR 6: Navamsa 7th lord / Venus in navamsa (D9 confirms marriage)
  if (navamsaStrength) {
    const venusNav = navamsaStrength.find(p => p.ta === "சுக்கிரன்");
    if (venusNav && (venusNav.d9Status === "நீசம்" || venusNav.d9Status === "பகை")) {
      score -= 1;
      factors.push({ text: `நவாம்சத்தில் சுக்கிரன் ${venusNav.d9Status} — திருமண சுகம் குறையலாம் (D9 உறுதி)`, weight: -1 });
    } else if (venusNav && venusNav.vargottama) {
      score += 1;
      factors.push({ text: `சுக்கிரன் வர்கோத்தமம் — திருமண வாழ்வு பலம் (D9 உறுதி)`, weight: +1 });
    }
  }

  // FACTOR 7 (இணைப்பு அடுக்கு): 7ஆம் ராசியின் SAV + 7ஆம் அதிபதியின் ஷட்பலம் + லக்னவாரி இயல்பு
  score += savFactor(ctx, h7Rashi, "7ஆம் வீட்டு", factors);
  score += shadbalaFactor(ctx, h7LordName, "7ஆம் அதிபதி", factors);
  score += functionalFactor(ctx, h7LordName, "7ஆம் அதிபதி", factors);

  // VERDICT
  let verdict, verdictColor, summary;
  if (score >= 3) {
    verdict = "மிகச் சிறந்த திருமண யோகம்"; verdictColor = "#0d7a30";
    summary = "வலுவான classical அமைப்பு — நல்ல, நிலையான திருமண வாழ்வு எதிர்பார்க்கலாம்.";
  } else if (score >= 1) {
    verdict = "நல்ல திருமண யோகம்"; verdictColor = "#0d7a30";
    summary = "பொதுவாக சாதகமான அமைப்பு — சில கவனம் தேவைப்படலாம்.";
  } else if (score >= -1) {
    verdict = "நடுத்தர — கவனம் தேவை"; verdictColor = "#b8860b";
    summary = "சாதக-பாதக அம்சங்கள் கலந்துள்ளன. பொருத்தம் கவனமாக பார்க்கவும், பரிகாரம் உதவும்.";
  } else {
    verdict = "⚠ திருமண வாழ்வில் சவால்கள்"; verdictColor = "#cc1a1a";
    summary = "பல classical factors திருமண வாழ்வில் தடை/பிரிவு சாத்தியத்தை காட்டுகின்றன. பொருத்தம் மிக கவனமாக பார்க்கவும், முழு பரிகாரம் அவசியம். இது ஒரு எச்சரிக்கை — முயற்சி மற்றும் புரிதலால் மேம்படுத்தலாம்.";
  }

  return { area: "திருமணம்", icon: "💍", score, verdict, verdictColor, summary, factors,
           h7Rashi: horoscope.placements.length ? null : null,
           details: { h7LordName, h7LordHouse, occupants: occupants7.map(p=>p.ta) } };
}

// ═══════════════════════════════════════════════════════════════════
// HEALTH ANALYSIS (1st, 6th, 8th houses + Lagna lord)
// ═══════════════════════════════════════════════════════════════════
export function analyzeHealth(horoscope, grahaBala, ctx) {
  const RASHI_LORD = ["செவ்வாய்","சுக்கிரன்","புதன்","சந்திரன்","சூரியன்","புதன்","சுக்கிரன்","செவ்வாய்","குரு","சனி","சனி","குரு"];
  const lagnaIdx = horoscope.lagna;
  const placements = horoscope.placements;
  const find = (n) => placements.find(p => p.ta === n);

  const factors = [];
  let score = 0;

  // FACTOR 1: Lagna (1st house) & Lagna lord — the body's vitality
  const lagnaLordName = RASHI_LORD[lagnaIdx];
  const lagnaLord = find(lagnaLordName);
  const lagnaLordHouse = lagnaLord ? ((lagnaLord.rashiIdx - lagnaIdx + 12) % 12) + 1 : null;
  const lagnaLordStr = strengthLevel(lagnaLordName, grahaBala);

  if (lagnaLordHouse && DUSTHANA.includes(lagnaLordHouse)) {
    score -= 2;
    factors.push({ text: `லக்ன அதிபதி (${lagnaLordName}) ${lagnaLordHouse}ஆம் வீட்டில் (துஸ்தானம்) — உடல்நலத்தில் கவனம் தேவை`, weight: -2 });
  } else if (lagnaLordStr.level === "strong") {
    score += 2;
    factors.push({ text: `லக்ன அதிபதி (${lagnaLordName}) பலம் (${lagnaLordStr.status}) — நல்ல உடல் வலிமை, நோய் எதிர்ப்பு`, weight: +2 });
  } else if (lagnaLordStr.level === "weak") {
    score -= 1;
    factors.push({ text: `லக்ன அதிபதி (${lagnaLordName}) பலவீனம் (${lagnaLordStr.status}) — உடல் வலிமை குறைவு`, weight: -1 });
  }

  // FACTOR 2: Malefics in Lagna (1st house)
  const h1Occupants = placements.filter(p => ((p.rashiIdx - lagnaIdx + 12) % 12) + 1 === 1);
  const maleficsIn1 = h1Occupants.filter(p => NATURAL_MALEFICS.includes(p.ta));
  if (maleficsIn1.length > 0) {
    score -= 1;
    factors.push({ text: `லக்னத்தில் பாப கிரகம்: ${maleficsIn1.map(p=>p.ta).join(", ")} — உடல்நலத்தில் கவனம்`, weight: -1 });
  }

  // FACTOR 3: 6th house (disease) — a STRONG 6th lord in dusthana is actually
  // classical "Viparita" (protects health); malefic 6th lord in kendra can bring illness
  const h6Rashi = (lagnaIdx + 5) % 12;
  const h6LordName = RASHI_LORD[h6Rashi];
  const h6Lord = find(h6LordName);
  const h6LordHouse = h6Lord ? ((h6Lord.rashiIdx - lagnaIdx + 12) % 12) + 1 : null;
  if (h6LordHouse === 6 || (h6LordHouse && DUSTHANA.includes(h6LordHouse))) {
    score += 1;
    factors.push({ text: `6ஆம் வீட்டு அதிபதி (${h6LordName}) துஸ்தானத்தில் — நோய் எதிர்ப்பு சக்தி நல்லது (விபரீத நன்மை)`, weight: +1 });
  } else if (h6LordHouse === 1) {
    score -= 1;
    factors.push({ text: `6ஆம் வீட்டு அதிபதி (${h6LordName}) லக்னத்தில் — அடிக்கடி சிறு நோய்கள் சாத்தியம்`, weight: -1 });
  }

  // FACTOR 4: 8th house (longevity/chronic) — malefics here need attention
  const h8Rashi = (lagnaIdx + 7) % 12;
  const occupants8 = placements.filter(p => p.rashiIdx === h8Rashi);
  const maleficsIn8 = occupants8.filter(p => NATURAL_MALEFICS.includes(p.ta));
  if (maleficsIn8.length > 0) {
    score -= 1;
    factors.push({ text: `8ஆம் வீட்டில்: ${maleficsIn8.map(p=>p.ta).join(", ")} — நாள்பட்ட ஆரோக்கிய கவனம், ஏழரை சனி காலத்தில் கூடுதல் கவனம்`, weight: -1 });
  }

  // FACTOR 5: Moon (mind/vitality) condition
  const moon = find("சந்திரன்");
  if (moon) {
    const moonHouse = ((moon.rashiIdx - lagnaIdx + 12) % 12) + 1;
    const moonStr = strengthLevel("சந்திரன்", grahaBala);
    if (DUSTHANA.includes(moonHouse) || moonStr.level === "weak") {
      score -= 1;
      factors.push({ text: `சந்திரன் ${moonHouse}ஆம் வீட்டில்${moonStr.level==="weak"?" (பலவீனம்)":""} — மன அழுத்தம், மனநலனில் கவனம்`, weight: -1 });
    }
  }

  // FACTOR 6: Benefic aspect on Lagna (protective)
  const beneficAspects1 = placements.filter(p => NATURAL_BENEFICS.includes(p.ta) && ((p.rashiIdx - lagnaIdx + 12) % 12) + 1 !== 1 && planetAspectsHouse(p, lagnaIdx, 1));
  if (beneficAspects1.length > 0) {
    score += 1;
    factors.push({ text: `லக்னத்தை சுப கிரகம் பார்க்கிறது: ${beneficAspects1.map(p=>p.ta).join(", ")} — ஆரோக்கியத்திற்கு பாதுகாப்பு`, weight: +1 });
  }

  // FACTOR 7 (இணைப்பு அடுக்கு): லக்ன ராசியின் SAV + லக்னாதிபதியின் ஷட்பலம்
  score += savFactor(ctx, lagnaIdx, "லக்ன", factors);
  score += shadbalaFactor(ctx, lagnaLordName, "லக்னாதிபதி", factors);

  let verdict, verdictColor, summary;
  if (score >= 3) {
    verdict = "மிகச் சிறந்த ஆரோக்கியம்"; verdictColor = "#0d7a30";
    summary = "வலுவான உடல் அமைப்பு — நல்ல நோய் எதிர்ப்பு சக்தி, நீண்ட ஆயுள்.";
  } else if (score >= 1) {
    verdict = "நல்ல ஆரோக்கியம்"; verdictColor = "#0d7a30";
    summary = "பொதுவாக நல்ல உடல்நலம் — சாதாரண கவனம் போதும்.";
  } else if (score >= -1) {
    verdict = "நடுத்தர — கவனம் தேவை"; verdictColor = "#b8860b";
    summary = "உடல்நலத்தில் சில பலவீனங்கள். சரியான உணவு, யோகா, மருத்துவ பரிசோதனை உதவும்.";
  } else {
    verdict = "⚠ ஆரோக்கியத்தில் கவனம் அவசியம்"; verdictColor = "#cc1a1a";
    summary = "பல factors உடல்நலத்தில் கவனம் தேவை என்று காட்டுகின்றன. வழக்கமான மருத்துவ பரிசோதனை, பரிகாரம், ஆரோக்கிய பழக்கம் அவசியம்.";
  }

  return { area: "ஆரோக்கியம்", icon: "🏥", score, verdict, verdictColor, summary, factors,
           details: { lagnaLordName, lagnaLordHouse } };
}

// ═══════════════════════════════════════════════════════════════════
// CAREER ANALYSIS (10th house + lord, Sun/Saturn/Mercury karakas)
// ═══════════════════════════════════════════════════════════════════
export function analyzeCareer(horoscope, grahaBala, dashaData, ctx) {
  const RASHI_LORD = ["செவ்வாய்","சுக்கிரன்","புதன்","சந்திரன்","சூரியன்","புதன்","சுக்கிரன்","செவ்வாய்","குரு","சனி","சனி","குரு"];
  const lagnaIdx = horoscope.lagna;
  const placements = horoscope.placements;
  const find = (n) => placements.find(p => p.ta === n);

  const factors = [];
  let score = 0;

  // House 10 details
  const h10Rashi = (lagnaIdx + 9) % 12;
  const h10LordName = RASHI_LORD[h10Rashi];
  const h10Lord = find(h10LordName);
  const h10LordHouse = h10Lord ? ((h10Lord.rashiIdx - lagnaIdx + 12) % 12) + 1 : null;
  const occupants10 = placements.filter(p => p.rashiIdx === h10Rashi);

  // FACTOR 1: 10th lord placement (career direction & success)
  if (h10LordHouse) {
    if (KENDRA.includes(h10LordHouse) || TRIKONA.includes(h10LordHouse) || h10LordHouse === 11) {
      score += 2;
      factors.push({ text: `10ஆம் வீட்டு அதிபதி (${h10LordName}) ${h10LordHouse}ஆம் வீட்டில் (பலமான ஸ்தானம்) — தொழிலில் உயர்வு, வெற்றி`, weight: +2 });
    } else if (DUSTHANA.includes(h10LordHouse)) {
      score -= 2;
      factors.push({ text: `10ஆம் வீட்டு அதிபதி (${h10LordName}) ${h10LordHouse}ஆம் வீட்டில் (துஸ்தானம்) — தொழிலில் தடை/மாற்றங்கள், முயற்சி தேவை`, weight: -2 });
    } else {
      factors.push({ text: `10ஆம் வீட்டு அதிபதி (${h10LordName}) ${h10LordHouse}ஆம் வீட்டில்`, weight: 0 });
    }
    const lordStr = strengthLevel(h10LordName, grahaBala);
    if (lordStr.level === "strong") { score += 1; factors.push({ text: `10ஆம் வீட்டு அதிபதி பலம் (${lordStr.status}) — தொழில் நிலைப்பாடு`, weight: +1 }); }
    else if (lordStr.level === "weak") { score -= 1; factors.push({ text: `10ஆம் வீட்டு அதிபதி பலவீனம் (${lordStr.status})`, weight: -1 }); }
  }

  // FACTOR 2: Planets in 10th house → determine career field
  const CAREER_FIELDS = {
    "சூரியன்": "அரசு பணி, நிர்வாகம், அரசியல், தலைமைப் பொறுப்பு",
    "சந்திரன்": "மக்கள் தொடர்பு, பொது சேவை, திரவம்/பால் தொழில், மனநல துறை",
    "செவ்வாய்": "பொறியியல், ராணுவம், காவல்துறை, அறுவை சிகிச்சை, விளையாட்டு, நிலம்/சொத்து",
    "புதன்": "வியாபாரம், கணக்கு, எழுத்து, தொடர்பு, IT, ஆசிரியர், ஆலோசனை",
    "குரு": "ஆசிரியர், நீதி, ஆலோசகர், ஆன்மீகம், நிதி, மேலாண்மை",
    "சுக்கிரன்": "கலை, சினிமா, ஊடகம், அழகு, ஆடம்பரம், வடிவமைப்பு, விருந்தோம்பல்",
    "சனி": "சேவை, தொழிலாளர், நிர்வாகம், சட்டம், சுரங்கம்/எண்ணெய், கட்டுமானம்",
    "ராகு": "வெளிநாடு, தொழில்நுட்பம், விமானம், மருந்து, வித்தியாசமான துறை",
    "கேது": "ஆன்மீகம், ஆராய்ச்சி, மருத்துவம், மறை அறிவியல்",
  };
  if (occupants10.length > 0) {
    const fields = occupants10.map(p => `${p.ta} → ${CAREER_FIELDS[p.ta]||""}`);
    factors.push({ text: `10ஆம் வீட்டில் ${occupants10.map(p=>p.ta).join(", ")} — சாதகமான துறை: ${occupants10.map(p=>CAREER_FIELDS[p.ta]).filter(Boolean).join(" / ")}`, weight: 0 });
    // Benefic in 10th adds
    if (occupants10.some(p => NATURAL_BENEFICS.includes(p.ta))) { score += 1; }
  } else {
    // Empty 10th — career read from the lord's sign
    const lordSignField = CAREER_FIELDS[h10LordName] || "";
    factors.push({ text: `10ஆம் வீட்டில் கிரகம் இல்லை — அதிபதி ${h10LordName} அடிப்படையில் துறை: ${lordSignField}`, weight: 0 });
  }

  // FACTOR 3: Sun (authority/govt), Saturn (service/labor), Mercury (business) — karma karakas
  const sun = find("சூரியன்"), saturn = find("சனி"), mercury = find("புதன்");
  const sunStr = strengthLevel("சூரியன்", grahaBala);
  const saturnStr = strengthLevel("சனி", grahaBala);
  if (sunStr.level === "strong") { score += 1; factors.push({ text: `சூரியன் பலம் — அரசு/அதிகார பதவி யோகம், தலைமைத் திறன்`, weight: +1 }); }
  if (saturnStr.level === "strong") { factors.push({ text: `சனி பலம் — கடின உழைப்பால் நிலையான தொழில் வளர்ச்சி`, weight: 0 }); }

  // FACTOR 4: 10th from Moon (also indicates profession)
  const moon = find("சந்திரன்");
  if (moon) {
    const tenthFromMoonRashi = (moon.rashiIdx + 9) % 12;
    const occ10Moon = placements.filter(p => p.rashiIdx === tenthFromMoonRashi && p.ta !== "சந்திரன்");
    if (occ10Moon.length > 0) {
      factors.push({ text: `சந்திரனிலிருந்து 10ல் ${occ10Moon.map(p=>p.ta).join(", ")} — தொழில் திசையை உறுதிசெய்கிறது`, weight: 0 });
    }
  }

  // FACTOR 5: Raja/Dhana yogas are shown in the dedicated "யோகங்கள்" section, not
  // scored into this career verdict (a yoga-weighted boost would need verification
  // against known-truth charts before being trusted — intentionally not applied here).

  // FACTOR 6: Current dasha lord's relation to 10th house
  if (dashaData && dashaData.dashas) {
    const now = new Date();
    const md = dashaData.dashas.find(d => now >= d.startDate && now < d.endDate);
    if (md) {
      const dashaLordP = find(md.name);
      if (dashaLordP) {
        const dashaLordHouse = ((dashaLordP.rashiIdx - lagnaIdx + 12) % 12) + 1;
        const rulesTenth = h10LordName === md.name;
        if (dashaLordHouse === 10 || rulesTenth) {
          score += 1;
          factors.push({ text: `நடப்பு ${md.name} தசை தொழில் வீட்டை (10) செயல்படுத்துகிறது — தொழில் மாற்றம்/உயர்வுக்கு காலம்`, weight: +1 });
        }
      }
    }
  }

  // FACTOR 7 (இணைப்பு அடுக்கு): 10ஆம் ராசியின் SAV + 10ஆம் அதிபதியின் ஷட்பலம் + லக்னவாரி இயல்பு
  score += savFactor(ctx, h10Rashi, "10ஆம் வீட்டு", factors);
  score += shadbalaFactor(ctx, h10LordName, "10ஆம் அதிபதி", factors);
  score += functionalFactor(ctx, h10LordName, "10ஆம் அதிபதி", factors);

  let verdict, verdictColor, summary;
  if (score >= 3) {
    verdict = "மிகச் சிறந்த தொழில் யோகம்"; verdictColor = "#0d7a30";
    summary = "வலுவான அமைப்பு — தொழிலில் உயர்வு, பதவி, நல்ல பெயர் எதிர்பார்க்கலாம்.";
  } else if (score >= 1) {
    verdict = "நல்ல தொழில் யோகம்"; verdictColor = "#0d7a30";
    summary = "பொதுவாக சாதகமான தொழில் அமைப்பு — முயற்சியால் வெற்றி.";
  } else if (score >= -1) {
    verdict = "நடுத்தர — முயற்சி தேவை"; verdictColor = "#b8860b";
    summary = "தொழிலில் ஏற்ற இறக்கங்கள் சாத்தியம். சரியான துறை தேர்வு, கடின உழைப்பு முக்கியம்.";
  } else {
    verdict = "⚠ தொழிலில் சவால்கள்"; verdictColor = "#cc1a1a";
    summary = "தொழில் வீட்டில் தடைகள் உள்ளன. துறை தேர்வில் கவனம், பொறுமை, பரிகாரம் உதவும். மாற்றங்களுக்கு தயாராக இருக்கவும்.";
  }

  // Suitable-profession suggestion — classical karaka fields of the planets shaping
  // the 10th house. IMPORTANT: use BOTH the 10th LORD *and* any occupants (lord first),
  // not occupants alone — otherwise a chart like Jupiter-ruled 10th with Venus sitting in
  // it would only show Venus's arts fields and miss the 10th lord's teaching/advisory
  // (e.g. a Jupiter-10th-lord person who is a teacher). Planets that aspect the 10th are
  // added too, since they also shape the profession. This is an INDICATION, not a fixed
  // prediction — a chart can lean one way while life takes another.
  const aspectors10 = placements.filter(p => p.ta !== h10LordName && !occupants10.includes(p) && planetAspectsHouse(p, lagnaIdx, 10)).map(p => p.ta);
  const fieldSources = [...new Set([h10LordName, ...occupants10.map(p => p.ta), ...aspectors10])];
  const suggestedFields = [...new Set(fieldSources.map(n => CAREER_FIELDS[n]).filter(Boolean).join(" / ").split(" / "))].join(" / ");
  if (suggestedFields) summary = `🎯 பொருத்தமான துறை (குறியீடு): ${suggestedFields}.\n${summary}`;

  return { area: "தொழில்", icon: "💼", score, verdict, verdictColor, summary, factors,
           suggestedFields,
           details: { h10LordName, h10LordHouse, occupants: occupants10.map(p=>p.ta) } };
}

// ═══════════════════════════════════════════════════════════════════
// Master function — runs all 3 key analyses
// ═══════════════════════════════════════════════════════════════════
// When an area has BOTH supportive (▲) and challenging (▼) factors, a lay reader can
// see the mixed lines as a contradiction ("it says challenges but also good spouse").
// This appends one reconciliation line to the summary explaining the net balance, so the
// positives and the verdict are understood as a weighed whole rather than a contradiction.
function addBalanceNote(area) {
  if (!area || !area.factors) return area;
  const pos = area.factors.filter(f => f.weight > 0).length;
  const neg = area.factors.filter(f => f.weight < 0).length;
  if (pos > 0 && neg > 0) {
    const lean = area.score < 0
      ? "பாதக காரணிகள் சற்று மிகுதி என்பதால் மொத்த மதிப்பீடு கவனம் நோக்கி உள்ளது"
      : area.score > 0
      ? "சாதக காரணிகள் மேலோங்குவதால் மொத்த மதிப்பீடு சாதகமாக உள்ளது"
      : "இரு தரப்பும் சமமாக உள்ளன";
    area.summary += ` (குறிப்பு: இதில் சாதக (▲) மற்றும் பாதக (▼) — இரண்டு வகை காரணிகளும் உள்ளன; ${lean}. இது முரண் அல்ல — எல்லா காரணிகளையும் நிறுத்திக் கணக்கிட்ட மொத்த சமநிலையே இந்த முடிவு. கீழே தனி classical குறிப்புகள் ஒவ்வொரு காரணியையும் தனித்தனியே விவரிக்கின்றன.)`;
  }
  return area;
}

export function analyzeKeyLifeAreas(horoscope, grahaBala, chevvaiDosham, navamsaStrength, dashaData, ctx) {
  if (!horoscope || !horoscope.placements) return null;
  return {
    marriage: addBalanceNote(analyzeMarriage(horoscope, grahaBala, chevvaiDosham, navamsaStrength, ctx)),
    health: addBalanceNote(analyzeHealth(horoscope, grahaBala, ctx)),
    career: addBalanceNote(analyzeCareer(horoscope, grahaBala, dashaData, ctx)),
  };
}

// ═══════════════════════════════════════════════════════════════════
// PAST-EVENT INDICATIONS (siblings / children / disease tendency)
// These build trust by matching known life facts, but count & gender rules are
// classically UNRELIABLE — so this gives an honest LEANING, never a fake exact
// number. Everything is labelled "குறியீடு" (indication).
// ═══════════════════════════════════════════════════════════════════
const _RL = ["செவ்வாய்","சுக்கிரன்","புதன்","சந்திரன்","சூரியன்","புதன்","சுக்கிரன்","செவ்வாய்","குரு","சனி","சனி","குரு"];
const MASC_PLANETS = ["சூரியன்", "செவ்வாய்", "குரு"];   // masculine
const FEM_PLANETS = ["சந்திரன்", "சுக்கிரன்"];          // feminine (Mercury/Saturn = neutral)

// Disease tendency by afflicted significator — classical karaka→body mapping.
const DISEASE_SIGNIFICATOR = {
  "சுக்கிரன்": "நீரிழிவு (சர்க்கரை), சிறுநீரகம், இனப்பெருக்க உறுப்பு",
  "குரு":      "நீரிழிவு (சர்க்கரை), கல்லீரல், உடல் பருமன், கொழுப்பு",
  "செவ்வாய்":  "ரத்தக் கோளாறு, காயம்/அறுவை, அழற்சி, ரத்த அழுத்தம்",
  "சனி":       "மூட்டு/எலும்பு, நாள்பட்ட நோய், நரம்புத் தளர்ச்சி, வாதம்",
  "சந்திரன்":  "மனநலம்/மன அழுத்தம், சளி/நீர்க்கோவை, ரத்தசோகை",
  "சூரியன்":   "இதயம், கண், எலும்பு, ஜீரண வெப்பம்",
  "புதன்":     "நரம்பு மண்டலம், தோல், பேச்சு/மூச்சு",
};

function analyzeFamilyHealthIndications(horoscope, grahaBala) {
  if (!horoscope || !horoscope.placements) return null;
  const lagnaIdx = horoscope.lagna, placements = horoscope.placements;
  const find = (n) => placements.find(p => p.ta === n);
  const houseRashi = (h) => (lagnaIdx + h - 1) % 12;
  const occupants = (rIdx) => placements.filter(p => p.ta !== "லக்னம்" && p.rashiIdx === rIdx);
  const strengthOf = (n) => grahaBala?.find(g => g.ta === n);
  // "எதிரி வீடு" = calcGrahaBala-இன் status string ("பகை" D9 vocabulary — இரண்டையும் ஏற்கிறோம்)
  const isAfflicted = (n) => { const g = strengthOf(n); const p = find(n); if (!p) return false; const house = ((p.rashiIdx - lagnaIdx + 12) % 12) + 1; return (g && g.score < 4) || (g && (g.status === "நீசம்" || g.status === "பகை" || g.status === "எதிரி வீடு")) || DUSTHANA.includes(house) || p.isCombust; };

  // ── Siblings v2: multi-factor classical gender vote ──
  // Classical விதிகள் (Prasna Marga / Saravali):
  //   ஒற்றை ராசி → ஆண் சாய்வு, இரட்டை ராசி → பெண் சாய்வு.
  //   ஆண் கிரகம் (சூரி,செவ்,குரு) / பெண் (சந்,சுக்) நேரடி பாலினம் தரும்;
  //   நடுநிலை கிரகம் (புத,சனி) அமர்ந்த ராசியின் பாலினத்தை எடுக்கும்.
  // Factors (எடை): 3ஆம் அதிபதி(2 / நடுநிலை-ராசிவழி 1.5) > சகோதர காரகன்
  //   செவ்வாய் அமர்ந்த ராசி(1.5) = 3இல் அமர்ந்தோர்(1.5/1) >
  //   3ஐ பார்ப்போர்(1/0.5) = 3ஆம் ராசி இயல்பு(1) = D3-இல் 3ஆம் அதிபதி(1).
  // (D3 த்ரேக்காணம் = சகோதர வர்க்கம் — BPHS)
  const h3 = houseRashi(3), h3Lord = _RL[h3], occ3 = occupants(h3);
  const oddSign = (r) => r % 2 === 0; // idx 0=மேஷம் → ஒற்றை
  const isDirectGender = (n) => MASC_PLANETS.includes(n) || FEM_PLANETS.includes(n);
  const genderOf = (n, p) => MASC_PLANETS.includes(n) ? "M" : FEM_PLANETS.includes(n) ? "F"
    : (p ? (oddSign(p.rashiIdx) ? "M" : "F") : "");
  let sibM = 0, sibF = 0; const sibWhy = [];
  const sibVote = (g, w, why) => {
    if (!g) return;
    if (g === "M") sibM += w; else sibF += w;
    sibWhy.push(`${why} → ${g === "M" ? "ஆண்" : "பெண்"}`);
  };
  // 1. 3ஆம் அதிபதி — நேரடி பாலினம் அல்லது அமர்ந்த ராசி வழி
  const l3p = find(h3Lord);
  sibVote(genderOf(h3Lord, l3p), isDirectGender(h3Lord) ? 2 : 1.5,
    `3ஆம் அதிபதி ${h3Lord}${!isDirectGender(h3Lord) && l3p ? ` (நடுநிலை — ${l3p.rashi} ${oddSign(l3p.rashiIdx) ? "ஒற்றை" : "இரட்டை"} ராசியில்)` : isDirectGender(h3Lord) ? ` (${MASC_PLANETS.includes(h3Lord) ? "ஆண்" : "பெண்"} கிரகம்)` : ""}`);
  // 2. சகோதர காரகன் செவ்வாய் — அமர்ந்த ராசி பாலினம்
  const sibMars = find("செவ்வாய்");
  if (sibMars) sibVote(oddSign(sibMars.rashiIdx) ? "M" : "F", 1.5,
    `காரகன் செவ்வாய் ${sibMars.rashi} (${oddSign(sibMars.rashiIdx) ? "ஒற்றை" : "இரட்டை"}) ராசியில்`);
  // 3. 3இல் அமர்ந்தோர்
  occ3.forEach(p => sibVote(genderOf(p.ta, p), isDirectGender(p.ta) ? 1.5 : 1,
    `3இல் ${p.ta}${!isDirectGender(p.ta) ? ` (நடுநிலை — ${p.rashi} ${oddSign(p.rashiIdx) ? "ஒற்றை" : "இரட்டை"})` : ""}`));
  // 4. 3ஐ பார்ப்போர்
  placements.filter(p => p.rashiIdx !== h3 && planetAspectsHouse(p, lagnaIdx, 3))
    .forEach(p => sibVote(genderOf(p.ta, p), isDirectGender(p.ta) ? 1 : 0.5, `${p.ta} 3ஐ பார்க்கிறார்`));
  // 5. 3ஆம் ராசியின் இயல்பு
  sibVote(oddSign(h3) ? "M" : "F", 1, `3ஆம் ராசி ${oddSign(h3) ? "ஒற்றை" : "இரட்டை"} இயல்பு`);
  // 6. D3 த்ரேக்காணம் — 3ஆம் அதிபதி D3-இல் அமரும் ராசி (1st/5th/9th drekkana விதி)
  if (l3p) {
    const dg = l3p.degExact ?? l3p.degree ?? 0;
    const d3r = dg < 10 ? l3p.rashiIdx : dg < 20 ? (l3p.rashiIdx + 4) % 12 : (l3p.rashiIdx + 8) % 12;
    sibVote(oddSign(d3r) ? "M" : "F", 1, `D3 த்ரேக்காணத்தில் 3ஆம் அதிபதி ${oddSign(d3r) ? "ஒற்றை" : "இரட்டை"} ராசியில்`);
  }
  const sibDiff = sibF - sibM;
  const siblings = {
    lean: sibDiff >= 1.5 ? "சகோதரி (பெண்) சாத்தியம் அதிகம்" : sibDiff <= -1.5 ? "சகோதரர் (ஆண்) சாத்தியம் அதிகம்" : "ஆண்/பெண் கலப்பு அல்லது தெளிவில்லை",
    detail: `மதிப்பீடு — பெண் ${sibF} : ஆண் ${sibM} புள்ளிகள். ${sibWhy.join(" • ")}`,
  };

  // ── Children (5th house; malefics restrict; gender NOT asserted — unreliable) ──
  const h5 = houseRashi(5), h5Lord = _RL[h5], occ5 = occupants(h5);
  const malefics5 = occ5.filter(p => NATURAL_MALEFICS.includes(p.ta));
  const jup = find("குரு");
  const children = {
    restriction: malefics5.length > 0 || isAfflicted(h5Lord) || (jup && isAfflicted("குரு")),
    detail: `5ஆம் வீட்டு அதிபதி ${h5Lord}${occ5.length ? `, 5ல் ${occ5.map(p => p.ta).join(", ")}` : ", 5ல் கிரகம் இல்லை"}${malefics5.length ? ` — பாப கிரகம் (${malefics5.map(p => p.ta).join(", ")}) சந்ததியில் தடை/குறைவைக் குறிக்கலாம்` : ""}`,
    note: "எண்ணிக்கை/பாலினம் (ஆண்/பெண்) செம்மையாக கணிக்க இயலாது — இது வெறும் குறியீடு.",
  };

  // ── Disease tendency (afflicted significators → body areas) ──
  const tendencies = [];
  ["சுக்கிரன்", "குரு", "செவ்வாய்", "சனி", "சந்திரன்", "சூரியன்", "புதன்"].forEach(n => {
    if (isAfflicted(n) && DISEASE_SIGNIFICATOR[n]) tendencies.push({ planet: n, area: DISEASE_SIGNIFICATOR[n] });
  });

  return { siblings, children, healthTendencies: tendencies };
}
export { analyzeFamilyHealthIndications };
