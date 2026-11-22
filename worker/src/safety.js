// ═══════════════════════════════════════════════════════════════════
// ஆலோசனை அரட்டையின் பாதுகாப்பு விதிகள் (server-side)
// ═══════════════════════════════════════════════════════════════════
// AI/தானியங்கி பதில் தரும் app-களுக்கு Google Play கோருவது: தீங்கான உள்ளடக்கத்தைத்
// தடுக்க வேண்டும். இங்கே மூன்று அடுக்கு:
//   1. screenQuestion  — கணக்கிடும் முன் கேள்வியைப் பார்த்து, பதில் சொல்லக் கூடாத
//      வகைகளுக்கு (தற்கொலை எண்ணம், ஆயுள்/மரண காலம், கருவின் பாலினம்) நிலையான பதில்.
//   2. safetyNote      — மருத்துவம், முதலீடு, சட்டம் சார்ந்த கேள்விகளின் பதிலுக்குக்
//      கீழே ஒரு எச்சரிக்கைக் குறிப்பு.
//   3. answerIsUnsafe  — AI எழுதிய பதிலில் மரண/ஆயுள் கணிப்பு வந்திருந்தால் அதை
//      நிராகரித்து engine பதிலுக்குத் திரும்ப.
// AI_GUARDRAILS — LLM prompt-இல் சேர்க்கப்படும் அதே விதிகள்.
// சோதனை: node scripts/test-safety.mjs
// ═══════════════════════════════════════════════════════════════════

const norm = (q) => String(q || "").toLowerCase().replace(/\s+/g, " ").trim();
const any = (s, list) => list.some((re) => re.test(s));

// ── 1அ. தற்கொலை / தன்னைத் துன்புறுத்தும் எண்ணம் ──
const CRISIS = [
  /தற்கொலை/, /தற்கொல/, /உயிரை (விட|மாய்|முடி|போக்)/, /உயிர் (விட|மாய்த்து)/,
  /சாக ?(வேண்டும்|வேணும்|ணும்|லாம்|ப் ?போ|த் ?தோணு|த் ?தோன்று)/, /சாகணும்/, /சாகலாம்/, /செத்து ?(ப் ?போ|டலாம்|விடலாம்|டணும்|ரலாம்)/,
  /வாழ (பிடிக்க|விருப்ப|ஆசை) ?(வில்லை|இல்லை|ல)/, /வாழவே (பிடிக்க|வேண்டாம்)/, /வாழ்ந்து என்ன (பயன்|பிரயோஜன)/, /இனி வாழ (முடியா|வேண்டாம்)/,
  /suicid/, /kill (myself|my ?self)/, /end my life/, /take my (own )?life/, /(want|wish) to die/, /wanna die/, /self[- ]?harm/, /no reason to live/, /don'?t want to live/,
  /tharkolai/, /tharkola/, /saaganum/, /saganum/, /sethu ?(pogalam|poganum|dalam|ralam)/, /uyira? vida/, /vaazha pidikala/,
];

// ── 1ஆ. ஆயுள் / மரண காலக் கணிப்பு ──
const DEATH_WORD = /(இறப்ப|இறப்பு|இறந்து ?(போ|விடு)|இறக்க|சாவு|சாவேன்|சாவார்|சாவான்|சாவாள்|சாவோம்|சாகும்|செத்து|மரண|உயிர் ?(போ|பிரி)|உயிரோடு|உயிருடன்|death|\bdie\b|\bdies\b|\bdying\b|\bdead\b|maranam|saavu|saaven|irappu)/;
const PREDICT_WORD = /(எப்போ|எப்பொழு|எப்ப |எப்பம்|எந்த வய|எந்த ஆண்டு|எந்த வருட|எத்தனை|எவ்வளவு|வரை|உண்டா|இருக்கா|இருக்கிறதா|இருப்ப|வருமா|நேருமா|ஆகுமா|கண்டம்|when|how long|how many|how much|will i|will my|will he|will she|until|eppo|evvalavu|evlo|ethanai|yethana)/;
const LIFESPAN_WORD = /(ஆயுள்|ஆயுசு|ஆயுட்|life ?span|longevity|aayul|ayul|aayusu)/;
const LIFESPAN_OK = /(ஆயுள் ?காப்பீ|ஆயுள் ?இன்சூ|life insurance|ஆயுள் ?தண்டனை)/;
const LIVE_HOW_LONG = /(எத்தனை (வயது|ஆண்டு|வருட|வருஷ)\S* ?(வரை)? ?(வாழ|உயிர்|இருப்ப)|எவ்வளவு (காலம்|நாள்|ஆண்டு|வருட)\S* ?(வாழ|உயிர்)|how long (will|do|can) (i|he|she|we|my \w+) live|how many years .* live|ethanai (vayasu|varusham) .* (vaazh|iruppen))/;

// ── 1இ. குழந்தையின் பாலினக் கணிப்பு (PCPNDT சட்டம்) ──
const SEX_ASK = /(ஆணா|பெண்ணா|மகனா|மகளா|பையனா|பொண்ணா|ஆண் ?பிள்ளையா|பெண் ?பிள்ளையா|boy or (a )?girl|girl or (a )?boy|son or (a )?daughter|aana penna|aanaa pennaa|paiyana ponna)/;
const CHILD_CTX = /(குழந்த|பிள்ள|வாரிசு|கர்ப்ப|கருவ|கரு |வயிற்றில|பிறக்க|பிரசவ|baby|child|pregnan|womb|unborn|deliver|kuzhand|kulanth|garbam|karu)/;
const SEX_OF_CHILD = /((ஆண்|பெண்) ?(குழந்த|பிள்ள|வாரிசு|மகவு)\S* ?(தான் )?(பிறக்கும|பிறக்குமா|பிறக்க|கிடைக்கும|உண்டா|வருமா|ஆகுமா))|(gender|sex) of (my|the|our) (baby|child|foetus|fetus)|baby'?s? (gender|sex)|will (i|we) (have|get) a (boy|girl|son|daughter|male|female)|(male|female) child|(aan|pen) kuzhandhai (pirakkuma|kidaikuma)/;
const PREGNANCY_SEX = /(கர்ப்ப|கருவ|வயிற்றில|pregnan|womb|unborn|garbam).*(ஆண்|பெண்|பாலின|gender|\bsex\b|boy|girl)|(ஆண்|பெண்|பாலின|gender|boy|girl).*(கர்ப்ப|கருவ|வயிற்றில|pregnan|womb|unborn|garbam)/;

// ── 1ஈ. "நீங்கள் மனிதரா?" ──
const IDENTITY = [
  /(நீங்க|நீங்கள்|நீ|இது|பதில் சொல்வது) .{0,20}(மனித|ரோபோ|இயந்திர|எந்திர|கணினி|உண்மையான ஜோதிட|நிஜ ஜோதிட)/,
  /(மனிதரா|மனிதனா|ரோபோவா|இயந்திரமா|ai ?யா|ai ?ஆ|ஏஐ ?யா|ஏ\.?ஐ\.? ?யா|bot ?ஆ|பாட்டா)/,
  /are you (a |an )?(human|real|ai|bot|robot|machine|person)/, /is this (a |an )?(ai|bot|human|real)/, /(neenga|nee) (manushana|manithara|ai ah|robot ah)/,
];

const ANSWERS = {
  crisis:
`நீங்கள் இப்போது மிகுந்த மன வலியில் இருப்பது போலத் தெரிகிறது. இந்த நேரத்தில் ஜாதகப் பலனை விட, உங்களுடன் பேச ஒருவர் இருப்பதுதான் முக்கியம்.

தயவுசெய்து இப்போதே இவற்றில் ஒன்றை அழையுங்கள்:
• டெலி மானஸ் — அரசு மனநல உதவி எண், 24 மணி நேரம், தமிழிலும்: 14416
• தமிழ்நாடு அரசு மருத்துவ உதவி எண்: 104
• சினேகா, சென்னை: 044-2464 0050
• அவசர உதவி: 112

நம்பிக்கையான ஒரு நண்பரிடமோ குடும்பத்தினரிடமோ இப்போதே பேசுங்கள். இந்தக் கடினமான நேரம் கடந்து போகும்; நீங்கள் தனியாக இல்லை.`,
  lifespan:
`ஆயுள், மரண காலம் பற்றிய கணிப்பை இந்தச் செயலி சொல்வதில்லை. அதை உறுதியாகச் சொல்லக் கூடாது என்பதே ஜோதிட நெறி; தவறான கணிப்பு தேவையற்ற அச்சத்தையே தரும்.

உடல்நலம் பற்றிக் கவலை இருந்தால் மருத்துவரை அணுகுங்கள். ஜாதகப்படி உடல்நலத்தில் கவனம் தேவைப்படும் காலங்களைப் பொதுவாக அறிய "என் ஆரோக்கியம் எப்படி இருக்கும்?" என்று கேட்கலாம்.`,
  fetal_sex:
`பிறக்கப்போகும் குழந்தை ஆணா பெண்ணா என்ற கணிப்பை இந்தச் செயலி சொல்வதில்லை. கருவின் பாலினத்தைக் கண்டறிவதும் அறிவிப்பதும் இந்தியச் சட்டப்படி (கருவின் பாலினத் தேர்வுத் தடைச் சட்டம், 1994) தடை செய்யப்பட்டது.

குழந்தை பாக்கியம், அதற்குச் சாதகமான காலம் பற்றி அறிய "குழந்தை பாக்கியம் எப்போது?" என்று கேட்கலாம்.`,
  identity:
`நான் மனித ஜோதிடர் அல்ல; இந்தச் செயலியின் AI உதவியாளர். உங்கள் பிறப்பு விவரத்திலிருந்து கணக்கிடப்பட்ட ஜாதகத்தை (கிரக நிலை, தசை புக்தி, கோசாரம்) வைத்துப் பதில் தருகிறேன்.

இந்தப் பதில்கள் வழிகாட்டலுக்கு மட்டும். முக்கிய முடிவுகளுக்கு அனுபவமுள்ள ஜோதிடர் அல்லது உரிய நிபுணரின் ஆலோசனையையும் பெறுங்கள்.`,
};

// கணக்கிடும் முன் கேள்வியைச் சோதி. பதில் சொல்லக் கூடாத வகை எனில் { kind, answer }.
export function screenQuestion(question) {
  const s = norm(question);
  if (!s) return null;
  if (any(s, CRISIS)) return { kind: "crisis", answer: ANSWERS.crisis };
  if (SEX_OF_CHILD.test(s) || PREGNANCY_SEX.test(s) || (SEX_ASK.test(s) && CHILD_CTX.test(s))) {
    return { kind: "fetal_sex", answer: ANSWERS.fetal_sex };
  }
  const lifespan = (LIFESPAN_WORD.test(s) && !LIFESPAN_OK.test(s)) || LIVE_HOW_LONG.test(s) || (DEATH_WORD.test(s) && PREDICT_WORD.test(s));
  if (lifespan) return { kind: "lifespan", answer: ANSWERS.lifespan };
  if (any(s, IDENTITY)) return { kind: "identity", answer: ANSWERS.identity };
  return null;
}

// ── 2. எச்சரிக்கைக் குறிப்புகள் ──
const MEDICAL = /(நோய|வியாதி|மருந்து|மாத்திரை|அறுவை|ஆபரேஷன்|சிகிச்ச|புற்று|கேன்சர்|சர்க்கரை நோய|நீரிழிவு|இதய|மாரடைப்|பக்கவாத|மன ?நல|மன ?அழுத்த|மன ?சோர்வு|கருச்சிதை|disease|illness|medicine|tablet|surgery|operation|treatment|cancer|diabet|heart attack|stroke|depress|anxiety|mental|miscarr|\bivf\b|noi|vyaadhi|marundhu)/;
const PREGNANCY = /(கர்ப்ப|கருத்தரி|கருவுற|பிரசவ|pregnan|conceiv|deliver|garbam)/;
const RISKY_MONEY = /(லாட்டரி|சூதாட்ட|பந்தய|பெட்டிங்|ரம்மி|பங்கு ?ச் ?சந்த|பங்குச்|பங்குகள|ஷேர்|கிரிப்டோ|பிட்காயின்|டிரேடிங்|ஊக வணிக|ஆன்லைன் கேம்|lottery|gambl|betting|\bbet\b|rummy|share market|stock|crypto|bitcoin|trading|f ?& ?o|futures|options trad|intraday)/;
const LEGAL = /(வழக்கு|கோர்ட்|நீதிமன்ற|விவாகரத்து|ஜாமீன்|சிறை|போலீஸ்|காவல் நிலைய|court|lawsuit|legal|divorce|bail|jail|police|\bfir\b|vazhakku)/;

export function safetyNote(category, question) {
  const s = norm(question);
  const notes = [];
  if (category === "health" || MEDICAL.test(s)) {
    notes.push("இது மருத்துவ ஆலோசனை அல்ல. உடல்நலப் பிரச்சனைக்கு மருத்துவரை அணுகுங்கள்; மருந்தையோ சிகிச்சையையோ ஜோதிடப் பலனை வைத்து நிறுத்தாதீர்கள்.");
  } else if (PREGNANCY.test(s)) {
    notes.push("கருத்தரிப்பு, பிரசவம் தொடர்பான முடிவுகளை மருத்துவரின் ஆலோசனைப்படி எடுங்கள்.");
  }
  if (RISKY_MONEY.test(s)) {
    notes.push("இது முதலீட்டு ஆலோசனை அல்ல. பங்கு, ஊக வணிகம், சூதாட்டம் ஆகியவற்றில் பணம் இழக்க நேரிடலாம்; ஜோதிடப் பலனை மட்டும் நம்பிப் பணம் போடாதீர்கள்.");
  }
  if (LEGAL.test(s)) {
    notes.push("சட்ட விஷயங்களில் வழக்கறிஞரின் ஆலோசனைப்படி செயல்படுங்கள்.");
  }
  return notes.length ? "குறிப்பு: " + notes.join(" ") : "";
}

export function withSafetyNote(answer, category, question) {
  const note = safetyNote(category, question);
  return note ? `${String(answer || "").trimEnd()}\n\n${note}` : answer;
}

// ── 3. AI எழுதிய பதிலின் சோதனை ──
const UNSAFE_OUT = [
  /(மரணம்|இறப்பு|உயிரிழப்பு) (ஏற்பட|நிகழ|சம்பவி|நேர|உண்டா)/, /இறந்து ?(விடுவ|போவ)/, /உயிரிழ(ப்பீர்|ப்பார்|க்க நேரி)/, /உயிருக்கு ஆபத்து/,
  /ஆயுள் (\d|குறைவு|குறைந்த|முடி)/, /(\d{2,3}) ?(வயது|ஆண்டு|வருட)\S* ?வரை (மட்டுமே )?(வாழ|உயிர்)/,
  /(ஆண்|பெண்) குழந்தை (தான் )?பிறக்கும்/, /you will die/, /death (will|is likely|is indicated)/,
  /(மருந்த|மாத்திரை|சிகிச்சை)\S* ?(நிறுத்த(லாம்|ுங்கள்|வும்)|தேவையில்லை|வேண்டாம்)/,
];
export function answerIsUnsafe(text) {
  return any(norm(text), UNSAFE_OUT);
}

// ── 4. AI பதில் தமிழில் மட்டும் ──
// LLM சில சமயம் ஆங்கில / ஹிந்தி ஜோதிடச் சொற்களைக் கலக்கும் ("Mahadasha", "transit", "சாடே சாதி").
// tamilOnly — பொதுவான அத்தகைய சொற்களைத் தமிழாக்கும், அடைப்புக்குறிக்குள் உள்ள ஆங்கிலத்தை நீக்கும்.
// latinWords — அதன் பின்னும் மீதமுள்ள ஆங்கிலச் சொற்கள் ("AI" தவிர); அழைப்பவர் இதை வைத்து
// பதிலை ஏற்பதா, மீண்டும் கேட்பதா என்று முடிவு செய்வார். stripLatin — கடைசி வழி: மீதமுள்ளவற்றை நீக்கும்.
const TAMIL_GLOSS = [
  [/சாடே ?சா(?:த்)?தி|சாதே ?சா(?:த்)?தி|சடே ?சதி/g, "ஏழரைச் சனி"], [/\bsade[ -]?sati\b/gi, "ஏழரைச் சனி"],
  [/\bmaha ?dasha\b/gi, "மகா தசை"], [/\bantar ?dasha\b/gi, "புக்தி"], [/\bpratyantar ?dasha\b/gi, "பிரத்யந்தர தசை"],
  [/\bsookshma ?dasha\b/gi, "சூட்சும தசை"], [/\bbhukti\b/gi, "புக்தி"], [/\bdasha\b/gi, "தசை"],
  [/\btransits?\b/gi, "கோசாரம்"], [/\bgochar[a]?\b/gi, "கோசாரம்"], [/\blagna\b|\bascendant\b/gi, "லக்னம்"],
  [/\brashi\b|\brasi\b/gi, "ராசி"], [/\bnakshatra\b/gi, "நட்சத்திரம்"], [/\btithi\b/gi, "திதி"], [/\byoga\b/gi, "யோகம்"],
  [/\bkarma\b/gi, "கர்மம்"], [/\bdosha\b/gi, "தோஷம்"], [/\bremed(?:y|ies)\b/gi, "பரிகாரம்"], [/\bpanchang(?:am)?\b/gi, "பஞ்சாங்கம்"],
  [/\bsun\b/gi, "சூரியன்"], [/\bmoon\b/gi, "சந்திரன்"], [/\bmars\b/gi, "செவ்வாய்"], [/\bmercury\b/gi, "புதன்"], [/\bjupiter\b/gi, "குரு"],
  [/\bvenus\b/gi, "சுக்கிரன்"], [/\bsaturn\b/gi, "சனி"], [/\brahu\b/gi, "ராகு"], [/\bketu\b/gi, "கேது"],
  [/\baries\b/gi, "மேஷம்"], [/\btaurus\b/gi, "ரிஷபம்"], [/\bgemini\b/gi, "மிதுனம்"], [/\bcancer\b/gi, "கடகம்"], [/\bleo\b/gi, "சிம்மம்"], [/\bvirgo\b/gi, "கன்னி"],
  [/\blibra\b/gi, "துலாம்"], [/\bscorpio\b/gi, "விருச்சிகம்"], [/\bsagittarius\b/gi, "தனுசு"], [/\bcapricorn\b/gi, "மகரம்"], [/\baquarius\b/gi, "கும்பம்"], [/\bpisces\b/gi, "மீனம்"],
];
export function tamilOnly(text) {
  let t = String(text || "");
  t = t.replace(/\*\*|__|^#{1,6}\s*/gm, "");                              // markdown குறிகள்
  t = t.replace(/\s*\((?=[^)]*[A-Za-z])[^)\u0B80-\u0BFF]*\)/g, "");        // (English only) அடைப்புக்குறிகள்
  for (const [re, to] of TAMIL_GLOSS) t = t.replace(re, to);
  t = dropMeta(t);
  return t.replace(/[ \t]{2,}/g, " ").trim();
}
// முறை விளக்க வாக்கியங்களை நீக்கும் ("…நேரடியாகப் பதில் சொல்கிறேன்.", "…ஜாதகக் கணிப்பின் அடிப்படையில் பேசுகிறேன்.") — பயனர் கோரிக்கை:
// AI தன் செயல்முறையை விவரிக்கக் கூடாது; முடிவை மட்டும் சொல்ல வேண்டும். வாக்கிய அளவில் நீக்குவதால் மற்ற உரை மாறாது.
const META_SENTENCE = /(நேரடியாக(?:ப்)? பதில் சொல்கிறேன்|ஆராய்ந்து (?:சொல்கிறேன்|பார்த்தேன்|பார்க்கிறேன்)|அடிப்படையில் (?:பேசுகிறேன்|சொல்கிறேன்|பதிலளிக்கிறேன்)|கணிப்பின்படி சொல்கிறேன்)/;
export function dropMeta(text) {
  return String(text || "").split("\n").map((line) => {
    if (!META_SENTENCE.test(line)) return line;
    return line.split(/(?<=[.!?])\s+/).filter((sn) => !META_SENTENCE.test(sn)).join(" ");
  }).join("\n").replace(/^\s*\n+/, "").replace(/\n{3,}/g, "\n\n");
}
export const latinWords = (text) => (String(text || "").match(/[A-Za-z]{2,}/g) || []).filter((w) => w !== "AI");
export function stripLatin(text) {
  return String(text || "").replace(/\(?\b(?!AI\b)[A-Za-z][A-Za-z'’\-]*\b\)?/g, "").replace(/[ \t]{2,}/g, " ").replace(/ ([,.;:!?])/g, "$1").trim();
}

// ── LLM prompt-இல் சேர்க்க வேண்டிய விதிகள் ──
export const AI_GUARDRAILS = `கட்டாய விதிகள் (எந்தச் சூழலிலும் மீறக் கூடாது):
- ஆயுள், மரணம், உயிருக்கு ஆபத்து, விபத்து நிச்சயம் என்பன போன்ற கணிப்பு எதையும் சொல்லக் கூடாது.
- நோயைக் கண்டறிவது, மருந்து அல்லது சிகிச்சையைப் பரிந்துரைப்பது, நிறுத்தச் சொல்வது கூடாது; உடல்நலம் பற்றிப் பேசினால் மருத்துவரை அணுகச் சொல்லுங்கள்.
- பிறக்கப்போகும் குழந்தை ஆணா பெண்ணா என்று சொல்லக் கூடாது.
- பங்கு, லாட்டரி, சூதாட்டம் போன்றவற்றில் பணம் போடச் சொல்லக் கூடாது; சட்ட வழக்கின் முடிவை உறுதியாகச் சொல்லக் கூடாது.
- அச்சுறுத்தும் சொற்கள் வேண்டாம்; "நிச்சயம் நடக்கும்" என்று உறுதி கூற வேண்டாம்; சாத்தியம், கவனம் என்ற அளவில் சொல்லுங்கள்.
- எந்தப் பொருளையும் (ரத்தினம், யந்திரம், பூஜை) வாங்கச் சொல்லக் கூடாது.
- சாதி, மதம், பாலினம் சார்ந்து இழிவான கருத்து கூடாது.
- நீங்கள் மனிதரா என்று கேட்டால், "நான் AI உதவியாளர்; மனித ஜோதிடர் அல்ல" என்று உண்மையைச் சொல்லுங்கள்.
- நேரடியாகச் சொல்லுங்கள்: முடிவு, காலம், செய்ய வேண்டியது மட்டும். "உங்கள் ஜாதகக் கணிப்பின் அடிப்படையில் பேசுகிறேன்", "ஆராய்ந்து சொல்கிறேன்", "நேரடியாகப் பதில் சொல்கிறேன்", "கணக்கின்படி" போன்ற முறை விளக்க வரிகளையும், கேட்காதபோது "நான் AI உதவியாளர்" என்ற அறிமுகத்தையும் பதிலில் எழுத வேண்டாம்.
- முழுப் பதிலும் தமிழில் மட்டும். ஆங்கிலச் சொற்களோ ஆங்கில எழுத்துகளோ ("AI" தவிர), ஹிந்திச் சொற்களோ வேண்டாம்: "transit" அல்ல "கோசாரம்"; "Mahadasha" அல்ல "மகா தசை"; "சாடே சாதி" அல்ல "ஏழரைச் சனி". கிரகம், ராசி, நட்சத்திரப் பெயர்களைத் தமிழில் எழுதுங்கள். அடைப்புக்குறிக்குள் ஆங்கில விளக்கம் வேண்டாம்.`;
