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

export function buildAskAnswer(h, dashaData, question) {
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
