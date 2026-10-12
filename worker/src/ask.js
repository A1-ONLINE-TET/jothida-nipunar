// ═══════════════════════════════════════════════════════════════════
// RULE-BASED ASTROLOGER CHAT  (no LLM — fully server-side, free)
// Takes the user's free-text question + their computed chart and builds a
// personalised Tamil answer, as if a real astrologer were replying. Grounded
// in the actual chart (house occupants, house lord, karaka, running dasha).
// ═══════════════════════════════════════════════════════════════════

const RASHIS = ["மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி","துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"];
// sign index → ruling planet (Tamil)
const RASHI_LORD = ["செவ்வாய்","சுக்கிரன்","புதன்","சந்திரன்","சூரியன்","புதன்","சுக்கிரன்","செவ்வாய்","குரு","சனி","சனி","குரு"];

const BENEFIC = new Set(["குரு","சுக்கிரன்","புதன்","சந்திரன்"]);
const MALEFIC = new Set(["சனி","செவ்வாய்","சூரியன்","ராகு","கேது"]);

// category → houses that matter + karaka planet + friendly label
const TOPICS = {
  marriage:  { houses:[7],    karaka:"சுக்கிரன்", label:"திருமணம் / வாழ்க்கைத் துணை" },
  career:    { houses:[10],   karaka:"சனி",       label:"தொழில் / வேலை" },
  wealth:    { houses:[2,11], karaka:"குரு",      label:"பணம் / செல்வம்" },
  health:    { houses:[1,6],  karaka:"சூரியன்",   label:"ஆரோக்கியம்" },
  education: { houses:[4,5],  karaka:"புதன்",     label:"கல்வி / படிப்பு" },
  children:  { houses:[5],    karaka:"குரு",      label:"குழந்தை / சந்ததி" },
  travel:    { houses:[12,3], karaka:"சந்திரன்",  label:"பயணம் / வெளிநாடு" },
  general:   { houses:[1],    karaka:"சந்திரன்",  label:"பொது வாழ்க்கை" },
};

// keyword → category (Tamil + English). First match wins, checked in order.
const KEYWORDS = [
  ["marriage", ["திருமண","கல்யாண","மண","வாழ்க்கைத் துணை","கணவ","மனைவ","வரன்","பொருத்த","marriage","wedding","spouse","partner","love","காதல்"]],
  ["career",   ["தொழில","வேலை","உத்தியோக","பதவி","சம்பள","பிசினஸ","வியாபார","job","career","business","work","promotion","boss"]],
  ["wealth",   ["பண","செல்வ","கட","நிதி","சொத்து","வருமான","லாப","நஷ்ட","money","wealth","finance","loan","income","rich"]],
  ["health",   ["ஆரோக்கிய","உடல்","நோய","மருத்துவ","சுகாதார","பலம","health","disease","sick","body","medical"]],
  ["education",["கல்வி","படிப்","பள்ளி","கல்லூரி","தேர்வு","பரீட்ச","education","study","exam","college","school","degree"]],
  ["children", ["குழந்த","பிள்ள","சந்ததி","மகன","மகள","கர்ப்ப","child","children","baby","son","daughter","pregnan"]],
  ["travel",   ["பயண","வெளிநா","வெளியூர","இடம் மாற்","visa","travel","abroad","foreign","migrat"]],
];

function classify(q) {
  const s = (q || "").toLowerCase();
  for (const [cat, keys] of KEYWORDS) {
    if (keys.some((k) => s.includes(k.toLowerCase()))) return cat;
  }
  return "general";
}
// index.js இதை வைத்து நிகழ்வு-காலக்கணிப்பு topic-ஐ தேர்வு செய்யும்
export function classifyQuestion(q) { return classify(q); }

// Cloudflare Worker-ல் 'ta-IN' date locale கிடைக்காது — கை-format
const TA_MONTHS = ["ஜனவரி","பிப்ரவரி","மார்ச்","ஏப்ரல்","மே","ஜூன்","ஜூலை","ஆகஸ்ட்","செப்டம்பர்","அக்டோபர்","நவம்பர்","டிசம்பர்"];
function fmtMonthYear(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${TA_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

const houseSign = (lagnaIdx, houseNum) => (lagnaIdx + houseNum - 1) % 12;
const planet = (h, ta) => h.placements.find((p) => p.ta === ta);
const inHouse = (h, n) => h.placements.filter((p) => p.house === n && p.ta !== "ராகு" && p.ta !== "கேது");

// current Mahadasha + Bhukti lord names from the dasha chain
function currentLords(dashaData) {
  if (!dashaData || !dashaData.dashas) return { md: null, ad: null };
  const now = new Date();
  const md = dashaData.dashas.find((d) => now >= new Date(d.startDate) && now < new Date(d.endDate));
  if (!md) return { md: null, ad: null };
  const ad = md.antardashas?.find((a) => now >= new Date(a.startDate) && now < new Date(a.endDate));
  return { md: md.name, ad: ad?.name || null, mdEnd: md.endDate };
}

function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

function strengthNote(planets) {
  if (!planets.length) return null;
  const nBen = planets.filter((p) => BENEFIC.has(p.ta)).length;
  const nMal = planets.filter((p) => MALEFIC.has(p.ta)).length;
  if (nBen > nMal) return "good";
  if (nMal > nBen) return "mixed";
  return "neutral";
}

export function buildAskAnswer(h, dashaData, question, extras = {}) {
  const cat = classify(question);
  const topic = TOPICS[cat];
  const seed = hashStr((question || "") + (h.lagnaName || ""));
  const name = (h._name || "").trim();
  const greet = name ? `${name}, ` : "";
  const lagnaIdx = h.lagna;

  const lines = [];

  // opener
  lines.push(pick([
    `${greet}உங்கள் ஜாதகத்தை ஆராய்ந்து ${topic.label} குறித்து பார்க்கிறேன்.`,
    `${greet}${topic.label} பற்றிய உங்கள் கேள்விக்கு, உங்கள் ஜாதக அமைப்பின்படி சொல்கிறேன்.`,
    `${greet}உங்கள் லக்னம் ${h.lagnaName}, சந்திர ராசி ${h.moonRashi}, நட்சத்திரம் ${h.nakshatra}. இதன் அடிப்படையில் ${topic.label} பார்ப்போம்.`,
  ], seed));

  // relevant house(s)
  for (const hn of topic.houses) {
    const occ = inHouse(h, hn);
    const signIdx = houseSign(lagnaIdx, hn);
    const lord = RASHI_LORD[signIdx];
    const lordP = planet(h, lord);
    if (occ.length) {
      const names = occ.map((p) => p.ta).join(", ");
      const tone = strengthNote(occ);
      lines.push(`${hn}ஆம் வீட்டில் (${RASHIS[signIdx]}) ${names} அமைந்துள்ளது — ` + (
        tone === "good" ? "இது சாதகமான அமைப்பு; இந்தப் பகுதியில் ஆதரவு உண்டு."
        : tone === "mixed" ? "சில சவால்களுடன் முன்னேற்றம்; பொறுமை தேவை."
        : "கலவையான பலன்கள்; முயற்சியுடன் நல்லது நடக்கும்."));
    } else {
      lines.push(`${hn}ஆம் வீடு (${RASHIS[signIdx]}) காலியாக உள்ளது — அதன் அதிபதி ${lord}தான் முக்கியம்.`);
    }
    if (lordP) {
      lines.push(`${hn}ஆம் அதிபதி ${lord} ${lordP.house}ஆம் வீட்டில் (${lordP.rashi}) உள்ளார் — ` + (
        BENEFIC.has(lord) ? "சுபகிரகம் என்பதால் இது உங்களுக்கு நன்மை தரும்." : "இதன் பலனை முயற்சியால் சாதகமாக்கலாம்."));
    }
  }

  // karaka
  const kP = planet(h, topic.karaka);
  if (kP) {
    lines.push(`${topic.label}-க்கான காரகன் ${topic.karaka} ${kP.house}ஆம் வீட்டில் (${kP.rashi})` +
      (kP.isRetrograde ? ", வக்கிரம்" : "") + " — " + pick([
        "இது இந்தப் பகுதியில் தனித்துவமான பலனைக் கொடுக்கும்.",
        "இதன் தசை/பெயர்ச்சி காலங்களில் முக்கிய நிகழ்வுகள் வரும்.",
        "இதன் நிலை உங்கள் முயற்சிக்கு வலு சேர்க்கும்.",
      ], seed + kP.house));
  }

  // running dasha → timing
  const { md, ad, mdEnd } = currentLords(dashaData);
  if (md) {
    const fav = BENEFIC.has(md) || (ad && BENEFIC.has(ad));
    lines.push(`தற்போது ${md}${ad ? `-${ad}` : ""} தசை நடைபெறுகிறது — ` + (
      fav ? pick([
        "இந்தக் காலம் இந்தப் பகுதிக்கு பொதுவாக சாதகம். முக்கிய முடிவுகளுக்கு ஏற்ற நேரம்.",
        "சுபகிரக தசை என்பதால் முயற்சிகள் பலன் தரும் வாய்ப்பு அதிகம்.",
      ], seed)
      : pick([
        "இந்தக் காலத்தில் நிதானமும் பொறுமையும் தேவை; அவசர முடிவுகள் வேண்டாம்.",
        "சில தடைகள் இருந்தாலும், சரியான முயற்சியால் கடந்து செல்லலாம்.",
      ], seed)));
  }

  // ── நிகழ்வு காலக்கணிப்பு — "எப்போது?" (தசா × கோசாரம் × வாக்குறுதி) ──
  const et = extras.eventTiming;
  const isCaution = cat === "health";
  if (et && Array.isArray(et.windows) && et.windows.length) {
    const w = et.windows[0];
    const range = `${fmtMonthYear(w.start)} – ${fmtMonthYear(w.end)}`;
    if (isCaution) {
      lines.push(`⚠ கூடுதல் கவனம் தேவை காலம்: ${range} (${w.md} தசை${w.ad ? `/${w.ad} புக்தி` : ""}). இக்காலத்தில் உணவு, ஓய்வு, மருத்துவப் பரிசோதனையில் கவனம் தேவை.`);
    } else {
      lines.push(`📅 அடுத்த சாதகமான காலம்: ${range} — ${w.md} தசை${w.ad ? `/${w.ad} புக்தி` : ""} [நம்பிக்கை: ${w.confidence}]. இக்காலத்தில் ${topic.label} தொடர்பான முயற்சிகள் பலன் தரும்.`);
      if (et.windows[1]) {
        const w2 = et.windows[1];
        lines.push(`மற்றொரு சாதக காலம்: ${fmtMonthYear(w2.start)} – ${fmtMonthYear(w2.end)} (${w2.md} தசை).`);
      }
    }
    if (typeof et.promise === "number") {
      lines.push(`${isCaution ? "6/8/12 பாவ செயல்பாட்டு அளவு" : "ஜாதக வாக்குறுதி (Promise)"}: ${et.promise}%${(!isCaution && et.promiseVerdict) ? ` — ${et.promiseVerdict}` : ""}.`);
    }
  } else if (et) {
    lines.push(isCaution
      ? "அடுத்த 12 ஆண்டுகளில் 6/8/12 வலு-activation குறைவு — ஆரோக்கியத்திற்கு நல்ல அறிகுறி."
      : "அடுத்த 12 ஆண்டுகளில் வலுவான தசா activation குறைவு — நீண்டகால தசை பட்டியலைப் பாருங்கள்.");
  }

  // ── topic-க்கு ஏற்ற தோஷம் / யோகம் ──
  if (cat === "marriage" && extras.chevvai) {
    const cd = extras.chevvai;
    if (cd.present) {
      lines.push(cd.cancelled
        ? `🔴 செவ்வாய் தோஷம் உள்ளது ஆனால் நிவர்த்தி ஆகிறது (${cd.cancelReason}) — அதிக கவலை வேண்டாம்.`
        : `🔴 செவ்வாய் தோஷம் உள்ளது (${cd.severityText || ""}) — பொருத்தம் பார்க்கும்போது துணையின் ஜாதகத்திலும் சமன் பார்க்கவும்; பரிகாரம் உதவும்.`);
    } else {
      lines.push("✓ செவ்வாய் தோஷம் இல்லை — திருமண வாழ்க்கைக்கு இது சாதகம்.");
    }
  }
  if (cat === "health" && extras.sadeSati) {
    const ss = extras.sadeSati;
    lines.push(ss.active
      ? `♄ தற்போது சாதே சாதி நடைபெறுகிறது (${ss.phase}${ss.severity ? `, தீவிரம்: ${ss.severity === "high" ? "அதிகம்" : "நடுத்தரம்"}` : ""}) — உடல்நலம், மன அழுத்தத்தில் கூடுதல் கவனம்; ஓய்வு, யோகா, தியானம் உதவும்.`
      : "✓ தற்போது சாதே சாதி இல்லை — சனியின் கடுமையான தாக்கம் இப்போது இல்லை.");
  }
  if (cat === "career" || cat === "wealth") {
    const mp = extras.mahapurusha || [];
    const cy = (extras.classicalYogas || []).filter((y) => y.type !== "dosha");
    const topYoga = mp[0] || cy[0];
    if (topYoga && topYoga.name) {
      lines.push(`👑 உங்கள் ஜாதகத்தில் "${topYoga.name}" யோகம் உள்ளது — இது ${cat === "career" ? "தொழில்/பதவி" : "செல்வ"} வளர்ச்சிக்கு வலு சேர்க்கும்.`);
    }
  }
  if (extras.kalaSarpa && extras.kalaSarpa.present && (cat === "marriage" || cat === "children" || cat === "career")) {
    lines.push(`🐍 கால சர்ப்ப அமைப்பு (${extras.kalaSarpa.type}) உள்ளது — சில காலதாமதம் சாத்தியம்; பரிகாரம்: ${extras.kalaSarpa.remedy}`);
  }

  // closing guidance / remedy
  lines.push(pick([
    "பரிகாரமாக — உங்கள் இஷ்ட தெய்வத்தை வழிபட்டு, நல்ல நாளில் முக்கிய காரியங்களைத் தொடங்குங்கள். 🙏",
    "தொடர்ந்து பார்க்க, முழு ஜாதகம் + தசை விவரங்களைப் பாருங்கள். நம்பிக்கையுடன் முன்னேறுங்கள். ✨",
    "மேலும் ஆழமான பலனுக்கு குறிப்பிட்ட தேதி/நிகழ்வு சொன்னால், நுணுக்கமாகப் பார்க்கலாம். 🌟",
  ], seed + 7));

  return {
    category: cat,
    label: topic.label,
    answer: lines.join("\n\n"),
  };
}
