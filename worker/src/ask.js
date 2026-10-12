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

// keyword → category (தமிழ் + English + Tanglish). First match wins, checked in order.
const KEYWORDS = [
  ["marriage", [
    "திருமண","கல்யாண","மணம்","மண ","வாழ்க்கைத் துணை","வாழ்க்கை துணை","துணை","கணவ","மனைவ","வரன்","வர ","மாப்பிள்ள","பெண் பார்","பொருத்த","ஜோடி","சம்பந்த","நிச்சயதார்த்த","காதல்","லவ்",
    "marriage","wedding","spouse","partner","love","match","fiance",
    "thirumanam","thirumana","kalyanam","kalyana","manam","varan","pondatti","pondaatti","purushan","maapillai","kaadhal","jodi"]],
  ["career",   [
    "தொழில","வேலை","உத்தியோக","பதவி","சம்பள","ஊதிய","பிசினஸ","வியாபார","வணிக","முன்னேற்ற","பதவி உயர்","வேலை வாய்ப்","ராஜினாம","பணி",
    "job","career","business","work","promotion","boss","salary","office","employment",
    "velai","vேlai","thozhil","thozil","udhyogam","business","sambalam","oodhiyam","padavi","vேlai vaippu"]],
  ["wealth",   [
    "பண","செல்வ","கடன்","நிதி","சொத்து","வருமான","லாப","நஷ்ட","வறுமை","ஐஸ்வர்ய","லட்சுமி","சேமிப்","முதலீ","பங்கு","கடனில",
    "money","wealth","finance","loan","income","rich","savings","debt","profit","investment",
    "panam","panakkaran","selvam","kadan","sothu","varumanam","laabam","sேmippu","mudhaleedu"]],
  ["health",   [
    "ஆரோக்கிய","உடல்","உடம்","நோய","மருத்துவ","சுகாதார","சுகம்","ஆயுள்","பலம்","பலஹீன","மன அழுத்த","மனநல","அறுவை","சிகிச்ச","வியாதி",
    "health","disease","sick","body","medical","surgery","stress","illness","fitness","life span","longevity",
    "aarokiyam","aarogyam","udal","udambu","noi","sugam","maruthuvam","vyaadhi","aayul"]],
  ["education",[
    "கல்வி","படிப்","பள்ளி","கல்லூரி","தேர்வு","பரீட்ச","தேர்ச்சி","அறிவு","வித்தை","மாணவ","உயர்கல்வி","ஸ்காலர்","மதிப்பெண்",
    "education","study","exam","college","school","degree","student","scholarship","marks","learning",
    "kalvi","padippu","padipu","palli","kalloori","thervu","maanavan","vidhyai"]],
  ["children", [
    "குழந்த","பிள்ள","சந்ததி","மகன","மகள","கர்ப்ப","வாரிச","பாக்கிய","சிசு","புத்திர","கருத்தரி",
    "child","children","baby","son","daughter","pregnan","kid","offspring","conceive",
    "kuzhandhai","kuzhanthai","pillai","santhathi","magan","magal","varisu","garbam"]],
  ["travel",   [
    "பயண","வெளிநா","வெளியூர","இடம் மாற்","குடியேற்ற","சொந்த ஊர","ஊர் மாற்","வெளிமாநில","இடமாற்ற",
    "visa","travel","abroad","foreign","migrat","relocat","settle",
    "payanam","velinadu","veliyur","veliநாடு","kudiyettam","ur maatram","foreign trip"]],
];

function classify(q) {
  const s = (q || "").toLowerCase();
  for (const [cat, keys] of KEYWORDS) {
    if (keys.some((k) => s.includes(k.toLowerCase()))) return cat;
  }
  return "general";
}
const VALID_TOPICS = new Set(["marriage", "career", "wealth", "health", "education", "children", "travel"]);
// follow-up கேள்வியின் நோக்கம் — எப்போது / பரிகாரம் / ஏன் / எப்படி
function detectIntent(q) {
  const s = (q || "").toLowerCase();
  const has = (arr) => arr.some((k) => s.includes(k));
  if (has(["எப்போது", "எப்பொழுது", "எப்போ", "when", "eppo", "எந்த வருட", "எந்த வருஷ", "எந்த காலம்", "எந்த நேர", "நேரம்", "சரியாகும்", "ஆகுமா", "ஆகும்", "நடக்கும்", "முடியும்", "aagum", "sariyaagum", "nadakum", "naal"])) return "timing";
  if (has(["பரிகார", "பரிஹார", "remedy", "என்ன செய்ய", "தீர்வு", "parikaram", "seiya"])) return "remedy";
  if (has(["ஏன்", "காரண", "why", "yen"])) return "cause";
  if (has(["எப்படி", "how", "தன்மை", "eppadi"])) return "quality";
  return null;
}
// follow-up கேள்வி — keyword இல்லை ஆனால் முந்தைய தலைப்பைத் தொடர்கிறது
// ("எப்போது சரியாகும்?", "எப்படி?", "இன்னும் சொல்லுங்க", "அது பற்றி...")
// index.js இதை வைத்து நிகழ்வு-காலக்கணிப்பு topic-ஐ தேர்வு செய்யும்.
export function classifyQuestion(q, lastTopic = "") {
  const cat = classify(q);
  if (cat === "general" && VALID_TOPICS.has(lastTopic)) return lastTopic;
  return cat;
}

// Cloudflare Worker-ல் 'ta-IN' date locale கிடைக்காது — கை-format
const TA_MONTHS = ["ஜனவரி","பிப்ரவரி","மார்ச்","ஏப்ரல்","மே","ஜூன்","ஜூலை","ஆகஸ்ட்","செப்டம்பர்","அக்டோபர்","நவம்பர்","டிசம்பர்"];
function fmtMonthYear(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${TA_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

// bhavaPhalam-இல் ஒரு வீட்டு எண்ணுக்கான classical reading-ஐ கண்டுபிடி
function houseReadingFor(bhavaPhalam, houseNum) {
  if (!bhavaPhalam || !Array.isArray(bhavaPhalam.areas)) return null;
  for (const a of bhavaPhalam.areas) {
    const hr = (a.houseReadings || []).find((r) => r.houseNum === houseNum);
    if (hr) return hr;
  }
  return null;
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
  // index.js ஏற்கனவே follow-up-ஐ கணக்கில் கொண்டு category-ஐ தீர்மானித்துள்ளது
  const cat = extras.category || classify(question);
  const topic = TOPICS[cat] || TOPICS.general;
  const seed = hashStr((question || "") + (h.lagnaName || ""));
  const name = (h._name || "").trim();
  const greet = name ? `${name}, ` : "";
  const lagnaIdx = h.lagna;

  const lines = [];
  // ஒரு பிரிவு (heading + வரிகள்) — வரிகள் இருந்தால் மட்டும் சேர்
  const sec = (title, body) => {
    const items = (body || []).filter((x) => x && x.trim());
    if (items.length) lines.push(`${title}\n${items.join("\n")}`);
  };
  // verdict summary-இல் உள்ள நீண்ட "(குறிப்பு: ▲▼...)" meta-note-ஐ நீக்கு
  const cleanTxt = (s) => (s || "").replace(/\s*\(குறிப்பு:[\s\S]*$/, "").trim();

  const { md, ad } = currentLords(dashaData);
  const et = extras.eventTiming;
  const isCaution = cat === "health";

  // ── follow-up: "எப்போது?/பரிகாரம்?" போன்ற தொடர் கேள்விக்கு — குவிந்த பதில்
  // (முழு reading-ஐ மீண்டும் காட்டாமல், கேட்டதற்கு மட்டும்) ──
  if (extras.followUp) {
    const intent = detectIntent(question);
    if (intent === "timing") {
      const foc = [`${greet}${topic.label} — எப்போது என்பதைப் பார்ப்போம்.`];
      if (md) foc.push(`தற்போது ${md}${ad ? `-${ad}` : ""} தசை நடைபெறுகிறது.`);
      if (et && Array.isArray(et.windows) && et.windows.length) {
        const w = et.windows[0];
        foc.push(isCaution
          ? `கவனம் தேவை காலம்: ${fmtMonthYear(w.start)} – ${fmtMonthYear(w.end)} (${w.md} தசை).`
          : `சாதகமான காலம்: ${fmtMonthYear(w.start)} – ${fmtMonthYear(w.end)} (${w.md} தசை${w.ad ? `/${w.ad} புக்தி` : ""}, நம்பிக்கை ${w.confidence}).`);
        if (et.windows[1] && !isCaution) foc.push(`பிறகு: ${fmtMonthYear(et.windows[1].start)} – ${fmtMonthYear(et.windows[1].end)} (${et.windows[1].md} தசை).`);
        if (typeof et.promise === "number") foc.push(`ஜாதக வாக்குறுதி: ${et.promise}%${(!isCaution && et.promiseVerdict) ? ` — ${et.promiseVerdict}` : ""}.`);
      } else {
        foc.push("அடுத்த 12 ஆண்டுகளில் வலுவான தசா activation குறைவு — பொறுமையுடன் முயற்சி தேவை.");
      }
      foc.push("இந்தக் காலங்களில் முயற்சி செய்தால் பலன் கிடைக்கும். 🙏");
      return { category: cat, label: topic.label, answer: foc.join("\n\n") };
    }
    if (intent === "remedy") {
      const foc = [`${greet}${topic.label} — பரிகாரங்களைப் பார்ப்போம்.`];
      const rr = [];
      if (Array.isArray(extras.remedies)) {
        const want = new Set([topic.karaka, RASHI_LORD[houseSign(lagnaIdx, topic.houses[0])]]);
        for (const r of extras.remedies.filter((r) => r.needsRemedy && want.has(r.ta)).slice(0, 3)) {
          rr.push(`• ${r.ta}: ரத்தினம் ${r.gem}${r.mantra ? `, மந்திரம் ${r.mantra}` : ""}${r.temple ? `, ${r.temple}` : ""}${r.donate ? `, தானம்: ${r.donate}` : ""}`);
        }
      }
      if (extras.kalaSarpa && extras.kalaSarpa.present && extras.kalaSarpa.remedy) rr.push(`• கால சர்ப்பம்: ${extras.kalaSarpa.remedy}`);
      if (cat === "marriage" && extras.chevvai && extras.chevvai.present && !extras.chevvai.cancelled) rr.push("• செவ்வாய் தோஷம்: செவ்வாய் பகவான் வழிபாடு, வைதீஸ்வரன் கோயில்; பொருத்தத்தில் சமன் பார்க்கவும்.");
      if (rr.length) foc.push(rr.join("\n"));
      else foc.push("உங்கள் ஜாதகத்தில் தனிப் பலவீனம் இல்லை — இஷ்ட தெய்வ வழிபாடு, நல்ல நாளில் காரியம் தொடங்கினால் போதும்.");
      foc.push("பரிகாரம் முழு மனதுடன் செய்தால் பலன் உண்டு. 🙏");
      return { category: cat, label: topic.label, answer: foc.join("\n\n") };
    }
  }

  // ── தொடக்கம் — ஜோதிடர் வரவேற்பு ──
  lines.push(`${greet}உங்கள் லக்னம் ${h.lagnaName}, சந்திர ராசி ${h.moonRashi}, நட்சத்திரம் ${h.nakshatra}. ${topic.label} குறித்து உங்கள் ஜாதகத்தை ஆராய்ந்து சொல்கிறேன்.`);

  const ka = extras.keyAreas ? extras.keyAreas[cat] : null;

  if (ka) {
    // ── ஆழ் synthesizer உள்ள தலைப்பு (திருமணம்/ஆரோக்கியம்/தொழில்) ──
    sec("◆ மொத்த நிலை", [`${ka.verdict}${ka.summary ? ` — ${cleanTxt(ka.summary)}` : ""}`]);
    const facts = (ka.factors || []).filter((f) => f && f.text).slice(0, 4)
      .map((f) => `${(f.weight || 0) > 0 ? "✓" : (f.weight || 0) < 0 ? "⚠" : "•"} ${f.text}`);
    sec("◆ முக்கிய காரணிகள்", facts);
    if (ka.spouseProfile) {
      const sp = ka.spouseProfile;
      const traits = (sp.traits || []).slice(0, 3).map((t) => t.trait).filter(Boolean).join(", ");
      sec("◆ வாழ்க்கைத் துணை குறியீடு", [
        traits ? `இயல்பு: ${traits}.` : "",
        `${sp.direction ? `திசைக் குறியீடு: ${sp.direction}` : ""}${sp.distance ? ` • ${sp.distance}` : ""}`,
      ]);
    }
    if (ka.tridosha) {
      sec("◆ உடலியல் தோஷம்", [`${ka.tridosha.dominant} மிகுதி${ka.tridosha.close ? ` (இணை: ${ka.tridosha.close})` : ""} — ${ka.tridosha.effects}`]);
    }
  } else {
    // ── keyAreas இல்லாத தலைப்பு — வீடு + அதிபதி + காரகன் + bhavaPhalam ──
    const chart = [];
    for (const hn of topic.houses) {
      const occ = inHouse(h, hn);
      const signIdx = houseSign(lagnaIdx, hn);
      const lord = RASHI_LORD[signIdx];
      const lordP = planet(h, lord);
      if (occ.length) {
        const tone = strengthNote(occ);
        chart.push(`${hn}ஆம் வீட்டில் (${RASHIS[signIdx]}) ${occ.map((p) => p.ta).join(", ")} — ${tone === "good" ? "சாதகமான அமைப்பு" : tone === "mixed" ? "சில சவால்களுடன் முன்னேற்றம்" : "கலவையான பலன்"}.`);
      } else {
        chart.push(`${hn}ஆம் வீடு (${RASHIS[signIdx]}) காலி — அதிபதி ${lord} முக்கியம்.`);
      }
      if (lordP) chart.push(`${hn}ஆம் அதிபதி ${lord} ${lordP.house}ஆம் வீட்டில் (${lordP.rashi}) — ${BENEFIC.has(lord) ? "நன்மை தரும்" : "முயற்சியால் சாதகமாக்கலாம்"}.`);
    }
    const kP = planet(h, topic.karaka);
    if (kP) chart.push(`காரகன் ${topic.karaka} ${kP.house}ஆம் வீட்டில் (${kP.rashi})${kP.isRetrograde ? ", வக்கிரம்" : ""} — இதன் தசை/பெயர்ச்சி காலங்களில் முக்கிய நிகழ்வுகள்.`);
    sec("◆ ஜாதக அமைப்பு", chart);

    const bp = extras.bhavaPhalam;
    if (bp) {
      const bl = [];
      for (const hn of topic.houses) {
        const hr = houseReadingFor(bp, hn);
        if (!hr) continue;
        for (const o of (hr.occupants || []).slice(0, 2)) bl.push(`${o.planet}${o.condition ? ` (${o.condition})` : ""}: ${o.effect}`);
      }
      sec("◆ விரிவான பலன்", bl);
    }
  }

  // ── எப்போது — நிகழ்வு காலக்கணிப்பு (தசா × கோசாரம் × வாக்குறுதி) ──
  const timing = [];
  if (md) timing.push(`தற்போது ${md}${ad ? `-${ad}` : ""} தசை நடைபெறுகிறது.`);
  if (et && Array.isArray(et.windows) && et.windows.length) {
    const w = et.windows[0];
    if (isCaution) {
      timing.push(`கவனம் தேவை காலம்: ${fmtMonthYear(w.start)} – ${fmtMonthYear(w.end)} (${w.md} தசை) — உணவு, ஓய்வு, மருத்துவப் பரிசோதனையில் கவனம்.`);
    } else {
      timing.push(`அடுத்த சாதக காலம்: ${fmtMonthYear(w.start)} – ${fmtMonthYear(w.end)} (${w.md} தசை${w.ad ? `/${w.ad} புக்தி` : ""}, நம்பிக்கை ${w.confidence}).`);
      if (et.windows[1]) timing.push(`பிறகு: ${fmtMonthYear(et.windows[1].start)} – ${fmtMonthYear(et.windows[1].end)} (${et.windows[1].md} தசை).`);
    }
    if (typeof et.promise === "number") timing.push(isCaution ? `பாதிப்பு அளவு: ${et.promise}%.` : `ஜாதக வாக்குறுதி: ${et.promise}%${et.promiseVerdict ? ` — ${et.promiseVerdict}` : ""}.`);
  }
  sec(isCaution ? "◆ கவனம் தேவை காலம்" : "◆ எப்போது", timing);

  // ── கவனிக்க வேண்டியவை — தோஷம்/சாதே சாதி/கால சர்ப்பம்/சந்ததி (ஒரே இடத்தில்) ──
  const caution = [];
  if (cat === "marriage" && extras.chevvai && extras.chevvai.present) {
    caution.push(extras.chevvai.cancelled
      ? `செவ்வாய் தோஷம் உண்டு, ஆனால் நிவர்த்தி (${extras.chevvai.cancelReason}) — அதிக கவலை வேண்டாம்.`
      : `செவ்வாய் தோஷம் உண்டு (${extras.chevvai.severityText || ""}) — பொருத்தத்தில் கவனம்; பரிகாரம் உதவும்.`);
  }
  if (cat === "health" && extras.sadeSati) {
    caution.push(extras.sadeSati.active
      ? `சாதே சாதி நடைபெறுகிறது (${extras.sadeSati.phase}) — உடல்/மன நலனில் கவனம்; ஓய்வு, யோகா உதவும்.`
      : "சாதே சாதி இப்போது இல்லை — சனியின் கடுமை இல்லை.");
  }
  if (extras.kalaSarpa && extras.kalaSarpa.present && (cat === "marriage" || cat === "children" || cat === "career")) {
    caution.push(`கால சர்ப்ப அமைப்பு (${extras.kalaSarpa.type}) — சில காலதாமதம் சாத்தியம்.`);
  }
  if (cat === "children" && extras.familyHealth && extras.familyHealth.children) {
    const ch = extras.familyHealth.children;
    caution.push(`சந்ததி: ${ch.restriction ? "தடை/குறைவு சாத்தியம்" : "சுமூகம்"}${ch.detail ? ` — ${ch.detail}` : ""}`);
  }
  sec("◆ கவனிக்க வேண்டியவை", caution);

  // ── யோகம் (தொழில்/பணம்) ──
  if (cat === "career" || cat === "wealth") {
    const topYoga = (extras.mahapurusha || [])[0] || (extras.classicalYogas || []).filter((y) => y.type !== "dosha")[0];
    if (topYoga && topYoga.name) sec("◆ யோகம்", [`"${topYoga.name}" யோகம் உள்ளது — ${cat === "career" ? "தொழில்/பதவி" : "செல்வ"} வளர்ச்சிக்கு வலு சேர்க்கும்.`]);
  }

  // ── பரிகாரம் ──
  const rem = [];
  if (Array.isArray(extras.remedies)) {
    const want = new Set([topic.karaka, RASHI_LORD[houseSign(lagnaIdx, topic.houses[0])]]);
    for (const r of extras.remedies.filter((r) => r.needsRemedy && want.has(r.ta)).slice(0, 2)) {
      rem.push(`${r.ta}: ரத்தினம் ${r.gem}${r.mantra ? `, மந்திரம் ${r.mantra}` : ""}${r.temple ? `, ${r.temple}` : ""}`);
    }
  }
  if (extras.kalaSarpa && extras.kalaSarpa.present && extras.kalaSarpa.remedy && (cat === "marriage" || cat === "children" || cat === "career")) {
    rem.push(`கால சர்ப்பம்: ${extras.kalaSarpa.remedy}`);
  }
  sec("◆ பரிகாரம்", rem);

  // ── நிறைவு ──
  lines.push(pick([
    "நம்பிக்கையுடன் முன்னேறுங்கள் — நல்ல நாளில் முக்கிய காரியங்களைத் தொடங்குங்கள். 🙏",
    "இன்னும் விரிவாக அறிய வேறு கேள்வி கேளுங்கள். வாழ்க வளமுடன். ✨",
  ], seed + 7));

  return {
    category: cat,
    label: topic.label,
    answer: lines.join("\n\n"),
  };
}
