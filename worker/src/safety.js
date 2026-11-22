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
const LANG = (l) => (l === "en" || l === "hi") ? l : "ta";

// ── 1அ. தற்கொலை / தன்னைத் துன்புறுத்தும் எண்ணம் ──
const CRISIS = [
  /தற்கொலை/, /தற்கொல/, /உயிரை (விட|மாய்|முடி|போக்)/, /உயிர் (விட|மாய்த்து)/,
  /சாக ?(வேண்டும்|வேணும்|ணும்|லாம்|ப் ?போ|த் ?தோணு|த் ?தோன்று)/, /சாகணும்/, /சாகலாம்/, /செத்து ?(ப் ?போ|டலாம்|விடலாம்|டணும்|ரலாம்)/,
  /வாழ (பிடிக்க|விருப்ப|ஆசை) ?(வில்லை|இல்லை|ல)/, /வாழவே (பிடிக்க|வேண்டாம்)/, /வாழ்ந்து என்ன (பயன்|பிரயோஜன)/, /இனி வாழ (முடியா|வேண்டாம்)/,
  /suicid/, /kill (myself|my ?self)/, /end my life/, /take my (own )?life/, /(want|wish) to die/, /wanna die/, /self[- ]?harm/, /no reason to live/, /don'?t want to live/,
  /tharkolai/, /tharkola/, /saaganum/, /saganum/, /sethu ?(pogalam|poganum|dalam|ralam)/, /uyira? vida/, /vaazha pidikala/,
  // हिन्दी
  /आत्महत्या/, /खुदकुशी/, /मर ?(जाऊँ|जाना चाहता|जाना चाहती|जाऊंगा)/, /मरना चाहता/, /मरना चाहती/, /जीना नहीं चाहता/, /जीने का मन नहीं/, /ज़िंदगी खत्म/, /जान दे ?(दूँ|दूंगा|देना)/, /खुद को (नुकसान|खत्म)/,
];

// ── 1ஆ. ஆயுள் / மரண காலக் கணிப்பு ──
const DEATH_WORD = /(இறப்ப|இறப்பு|இறந்து ?(போ|விடு)|இறக்க|சாவு|சாவேன்|சாவார்|சாவான்|சாவாள்|சாவோம்|சாகும்|செத்து|மரண|உயிர் ?(போ|பிரி)|உயிரோடு|உயிருடன்|death|\bdie\b|\bdies\b|\bdying\b|\bdead\b|maranam|saavu|saaven|irappu|मृत्यु|मौत|मरण|मर ?(जा|जाऊ|जाएग|जाएँग))/;
const PREDICT_WORD = /(எப்போ|எப்பொழு|எப்ப |எப்பம்|எந்த வய|எந்த ஆண்டு|எந்த வருட|எத்தனை|எவ்வளவு|வரை|உண்டா|இருக்கா|இருக்கிறதா|இருப்ப|வருமா|நேருமா|ஆகுமா|கண்டம்|when|how long|how many|how much|will i|will my|will he|will she|until|eppo|evvalavu|evlo|ethanai|yethana|कब|कितने|कितनी|कब तक|क्या होगा|होगा क्या)/;
const LIFESPAN_WORD = /(ஆயுள்|ஆயுசு|ஆயுட்|life ?span|longevity|aayul|ayul|aayusu|आयु|आयुष्य|जीवनकाल|उम्र कितनी)/;
const LIFESPAN_OK = /(ஆயுள் ?காப்பீ|ஆயுள் ?இன்சூ|life insurance|ஆயுள் ?தண்டனை)/;
const LIVE_HOW_LONG = /(எத்தனை (வயது|ஆண்டு|வருட|வருஷ)\S* ?(வரை)? ?(வாழ|உயிர்|இருப்ப)|எவ்வளவு (காலம்|நாள்|ஆண்டு|வருட)\S* ?(வாழ|உயிர்)|how long (will|do|can) (i|he|she|we|my \w+) live|how many years .* live|ethanai (vayasu|varusham) .* (vaazh|iruppen))/;

// ── 1இ. குழந்தையின் பாலினக் கணிப்பு (PCPNDT சட்டம்) ──
const SEX_ASK = /(ஆணா|பெண்ணா|மகனா|மகளா|பையனா|பொண்ணா|ஆண் ?பிள்ளையா|பெண் ?பிள்ளையா|boy or (a )?girl|girl or (a )?boy|son or (a )?daughter|aana penna|aanaa pennaa|paiyana ponna)/;
const CHILD_CTX = /(குழந்த|பிள்ள|வாரிசு|கர்ப்ப|கருவ|கரு |வயிற்றில|பிறக்க|பிரசவ|baby|child|pregnan|womb|unborn|deliver|kuzhand|kulanth|garbam|karu|बच्च|शिशु|संतान|गर्भ|पेट में|जन्म लेने)/;
const SEX_ASK_HI = /(लड़का या लड़की|लड़की या लड़का|बेटा या बेटी|बेटी या बेटा|पुत्र या पुत्री)/;
const SEX_OF_CHILD = /((ஆண்|பெண்) ?(குழந்த|பிள்ள|வாரிசு|மகவு)\S* ?(தான் )?(பிறக்கும|பிறக்குமா|பிறக்க|கிடைக்கும|உண்டா|வருமா|ஆகுமா))|(gender|sex) of (my|the|our) (baby|child|foetus|fetus)|baby'?s? (gender|sex)|will (i|we) (have|get) a (boy|girl|son|daughter|male|female)|(male|female) child|(aan|pen) kuzhandhai (pirakkuma|kidaikuma)/;
const PREGNANCY_SEX = /(கர்ப்ப|கருவ|வயிற்றில|pregnan|womb|unborn|garbam).*(ஆண்|பெண்|பாலின|gender|\bsex\b|boy|girl)|(ஆண்|பெண்|பாலின|gender|boy|girl).*(கர்ப்ப|கருவ|வயிற்றில|pregnan|womb|unborn|garbam)/;

// ── 1ஈ. "நீங்கள் மனிதரா?" ──
const IDENTITY = [
  /(நீங்க|நீங்கள்|நீ|இது|பதில் சொல்வது) .{0,20}(மனித|ரோபோ|இயந்திர|எந்திர|கணினி|உண்மையான ஜோதிட|நிஜ ஜோதிட)/,
  /(மனிதரா|மனிதனா|ரோபோவா|இயந்திரமா|ai ?யா|ai ?ஆ|ஏஐ ?யா|ஏ\.?ஐ\.? ?யா|bot ?ஆ|பாட்டா)/,
  /are you (a |an )?(human|real|ai|bot|robot|machine|person)/, /is this (a |an )?(ai|bot|human|real)/, /(neenga|nee) (manushana|manithara|ai ah|robot ah)/,
];

const ANSWERS_TA = {
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
const ANSWERS_EN = {
  crisis:
`It sounds like you are in a lot of emotional pain right now. At a time like this, having someone to talk to matters far more than any horoscope.

Please reach out to one of these right now:
• Tele MANAS — Government mental-health helpline, 24 hours: 14416
• Tamil Nadu Government health helpline: 104
• Sneha, Chennai: 044-2464 0050
• Emergency: 112

Please speak to a trusted friend or family member right now. This hard moment will pass; you are not alone.`,
  lifespan:
`This app does not predict lifespan or the time of death. Astrological ethics say such things must never be stated with certainty; a wrong prediction only causes needless fear.

If you are worried about health, please consult a doctor. To learn in general about periods that need care for your health, you can ask "How will my health be?"`,
  fetal_sex:
`This app does not predict whether an unborn child will be a boy or a girl. Determining or disclosing the sex of a foetus is prohibited under Indian law (the Pre-Conception and Pre-Natal Diagnostic Techniques Act, 1994).

To learn about the blessing of children and a favourable time for it, you can ask "When is the blessing of children?"`,
  identity:
`I am not a human astrologer; I am this app's AI assistant. I answer using the horoscope calculated from your birth details (planetary positions, dasha-bhukti, transits).

These answers are for guidance only. For important decisions, please also seek advice from an experienced astrologer or the relevant professional.`,
};
const ANSWERS_HI = {
  crisis:
`लगता है आप अभी बहुत मानसिक पीड़ा में हैं। ऐसे समय में किसी कुंडली फल से कहीं अधिक ज़रूरी है कि आपसे बात करने के लिए कोई हो।

कृपया अभी इनमें से किसी एक को कॉल करें:
• टेली मानस — सरकारी मानसिक स्वास्थ्य हेल्पलाइन, 24 घंटे: 14416
• तमिलनाडु सरकारी स्वास्थ्य हेल्पलाइन: 104
• स्नेहा, चेन्नई: 044-2464 0050
• आपातकाल: 112

कृपया अभी किसी विश्वसनीय मित्र या परिजन से बात करें। यह कठिन समय बीत जाएगा; आप अकेले नहीं हैं।`,
  lifespan:
`यह ऐप आयु या मृत्यु के समय की भविष्यवाणी नहीं करता। ज्योतिष की मर्यादा यही है कि इसे निश्चित रूप से नहीं कहना चाहिए; ग़लत भविष्यवाणी केवल अनावश्यक भय देती है।

स्वास्थ्य की चिंता हो तो कृपया चिकित्सक से मिलें। स्वास्थ्य हेतु ध्यान आवश्यक काल सामान्य रूप से जानने के लिए आप पूछ सकते हैं "मेरा स्वास्थ्य कैसा रहेगा?"`,
  fetal_sex:
`यह ऐप यह भविष्यवाणी नहीं करता कि गर्भस्थ शिशु लड़का होगा या लड़की। गर्भ के लिंग का पता लगाना या बताना भारतीय कानून (गर्भधारण पूर्व और प्रसव पूर्व निदान तकनीक अधिनियम, 1994) के अंतर्गत प्रतिबंधित है।

संतान सुख और उसके अनुकूल काल के बारे में जानने हेतु आप पूछ सकते हैं "संतान सुख कब है?"`,
  identity:
`मैं मानव ज्योतिषी नहीं हूँ; मैं इस ऐप का AI सहायक हूँ। मैं आपके जन्म विवरण से गणित कुंडली (ग्रह स्थिति, दशा-भुक्ति, गोचर) के आधार पर उत्तर देता हूँ।

ये उत्तर केवल मार्गदर्शन हेतु हैं। बड़े निर्णयों के लिए कृपया किसी अनुभवी ज्योतिषी या संबंधित विशेषज्ञ से भी सलाह लें।`,
};
const ANSWERS_BY_LANG = { ta: ANSWERS_TA, en: ANSWERS_EN, hi: ANSWERS_HI };

// கணக்கிடும் முன் கேள்வியைச் சோதி. பதில் சொல்லக் கூடாத வகை எனில் { kind, answer }. lang = பதிலின் மொழி.
export function screenQuestion(question, lang) {
  const s = norm(question);
  if (!s) return null;
  const A = ANSWERS_BY_LANG[LANG(lang)];
  if (any(s, CRISIS)) return { kind: "crisis", answer: A.crisis };
  if (SEX_OF_CHILD.test(s) || PREGNANCY_SEX.test(s) || ((SEX_ASK.test(s) || SEX_ASK_HI.test(s)) && CHILD_CTX.test(s))) {
    return { kind: "fetal_sex", answer: A.fetal_sex };
  }
  const lifespan = (LIFESPAN_WORD.test(s) && !LIFESPAN_OK.test(s)) || LIVE_HOW_LONG.test(s) || (DEATH_WORD.test(s) && PREDICT_WORD.test(s));
  if (lifespan) return { kind: "lifespan", answer: A.lifespan };
  if (any(s, IDENTITY)) return { kind: "identity", answer: A.identity };
  return null;
}

// ── 2. எச்சரிக்கைக் குறிப்புகள் ──
const MEDICAL = /(நோய|வியாதி|மருந்து|மாத்திரை|அறுவை|ஆபரேஷன்|சிகிச்ச|புற்று|கேன்சர்|சர்க்கரை நோய|நீரிழிவு|இதய|மாரடைப்|பக்கவாத|மன ?நல|மன ?அழுத்த|மன ?சோர்வு|கருச்சிதை|disease|illness|medicine|tablet|surgery|operation|treatment|cancer|diabet|heart attack|stroke|depress|anxiety|mental|miscarr|\bivf\b|noi|vyaadhi|marundhu)/;
const PREGNANCY = /(கர்ப்ப|கருத்தரி|கருவுற|பிரசவ|pregnan|conceiv|deliver|garbam)/;
const RISKY_MONEY = /(லாட்டரி|சூதாட்ட|பந்தய|பெட்டிங்|ரம்மி|பங்கு ?ச் ?சந்த|பங்குச்|பங்குகள|ஷேர்|கிரிப்டோ|பிட்காயின்|டிரேடிங்|ஊக வணிக|ஆன்லைன் கேம்|lottery|gambl|betting|\bbet\b|rummy|share market|stock|crypto|bitcoin|trading|f ?& ?o|futures|options trad|intraday)/;
const LEGAL = /(வழக்கு|கோர்ட்|நீதிமன்ற|விவாகரத்து|ஜாமீன்|சிறை|போலீஸ்|காவல் நிலைய|court|lawsuit|legal|divorce|bail|jail|police|\bfir\b|vazhakku)/;

const NOTE_TXT = {
  ta: { medical: "இது மருத்துவ ஆலோசனை அல்ல. உடல்நலப் பிரச்சனைக்கு மருத்துவரை அணுகுங்கள்; மருந்தையோ சிகிச்சையையோ ஜோதிடப் பலனை வைத்து நிறுத்தாதீர்கள்.",
    pregnancy: "கருத்தரிப்பு, பிரசவம் தொடர்பான முடிவுகளை மருத்துவரின் ஆலோசனைப்படி எடுங்கள்.",
    money: "இது முதலீட்டு ஆலோசனை அல்ல. பங்கு, ஊக வணிகம், சூதாட்டம் ஆகியவற்றில் பணம் இழக்க நேரிடலாம்; ஜோதிடப் பலனை மட்டும் நம்பிப் பணம் போடாதீர்கள்.",
    legal: "சட்ட விஷயங்களில் வழக்கறிஞரின் ஆலோசனைப்படி செயல்படுங்கள்.", prefix: "குறிப்பு: " },
  en: { medical: "This is not medical advice. For a health problem consult a doctor; do not stop any medicine or treatment based on an astrology reading.",
    pregnancy: "Make decisions about conception and childbirth on your doctor's advice.",
    money: "This is not investment advice. You can lose money in shares, speculation or gambling; do not invest based on an astrology reading alone.",
    legal: "In legal matters, act on a lawyer's advice.", prefix: "Note: " },
  hi: { medical: "यह चिकित्सा सलाह नहीं है। स्वास्थ्य समस्या हेतु चिकित्सक से मिलें; कोई दवा या उपचार ज्योतिष फल के आधार पर बंद न करें।",
    pregnancy: "गर्भधारण और प्रसव संबंधी निर्णय चिकित्सक की सलाह से लें।",
    money: "यह निवेश सलाह नहीं है। शेयर, सट्टा या जुए में धन की हानि हो सकती है; केवल ज्योतिष फल के आधार पर निवेश न करें।",
    legal: "कानूनी मामलों में वकील की सलाह से कार्य करें।", prefix: "सूचना: " },
};
export function safetyNote(category, question, lang) {
  const s = norm(question);
  const T = NOTE_TXT[LANG(lang)];
  const notes = [];
  if (category === "health" || MEDICAL.test(s)) notes.push(T.medical);
  else if (PREGNANCY.test(s)) notes.push(T.pregnancy);
  if (RISKY_MONEY.test(s)) notes.push(T.money);
  if (LEGAL.test(s)) notes.push(T.legal);
  return notes.length ? T.prefix + notes.join(" ") : "";
}

export function withSafetyNote(answer, category, question, lang) {
  const note = safetyNote(category, question, lang);
  return note ? `${String(answer || "").trimEnd()}\n\n${note}` : answer;
}

// ── 3. AI எழுதிய பதிலின் சோதனை ──
const UNSAFE_OUT = [
  /(மரணம்|இறப்பு|உயிரிழப்பு) (ஏற்பட|நிகழ|சம்பவி|நேர|உண்டா)/, /இறந்து ?(விடுவ|போவ)/, /உயிரிழ(ப்பீர்|ப்பார்|க்க நேரி)/, /உயிருக்கு ஆபத்து/,
  /ஆயுள் (\d|குறைவு|குறைந்த|முடி)/, /(\d{2,3}) ?(வயது|ஆண்டு|வருட)\S* ?வரை (மட்டுமே )?(வாழ|உயிர்)/,
  /(ஆண்|பெண்) குழந்தை (தான் )?பிறக்கும்/, /you will die/, /death (will|is likely|is indicated)/,
  /(மருந்த|மாத்திரை|சிகிச்சை)\S* ?(நிறுத்த(லாம்|ுங்கள்|வும்)|தேவையில்லை|வேண்டாம்)/,
  // English output
  /you (will|may|could) die/, /your (death|demise) (will|is|may)/, /(die|death) (at|by|before|around) (the )?age/, /live (only )?(until|till|up to) (the )?age/, /you will (have|get) a (boy|girl|son|daughter)/, /it will be a (boy|girl|son|daughter)/, /(stop|discontinue) (your |the )?(medicine|medication|treatment)/,
  // हिन्दी output
  /(मृत्यु|मौत) (होगी|होने|निश्चित|संभव)/, /आप मर (जाएँगे|जाओगे)/, /(\d{2,3}) ?(वर्ष|साल|वय) तक (ही )?(जीवित|जीएँगे)/, /आयु (कम|\d)/, /(लड़का|लड़की|बेटा|बेटी) ही (होगा|होगी)/, /(दवा|दवाई|इलाज|उपचार) (बंद|रोक|छोड़)/,
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

const AI_GUARDRAILS_EN = `Mandatory rules (never break, in any situation):
- Do not predict lifespan, death, danger to life, or that an accident is certain.
- Do not diagnose an illness, prescribe or recommend medicine or treatment, or tell anyone to stop one; if health comes up, tell them to consult a doctor.
- Do not say whether an unborn child will be a boy or a girl.
- Do not tell anyone to put money into shares, lottery or gambling; do not state the outcome of a legal case with certainty.
- No threatening words; do not say something "will definitely happen" — speak in terms of likelihood and caution.
- Do not tell anyone to buy any product (gemstone, yantra, pooja).
- No demeaning remarks based on caste, religion or gender.
- If asked whether you are human, tell the truth: "I am an AI assistant, not a human astrologer."
- Speak directly: only the conclusion, the timing and what to do. Do not write method-narration lines like "based on your horoscope calculation", "let me analyse", or the "I am an AI assistant" introduction when it was not asked.
- Reply ONLY in English — clear, natural English. Do not use Tamil or Hindi words or letters.`;

const AI_GUARDRAILS_HI = `अनिवार्य नियम (किसी भी स्थिति में न तोड़ें):
- आयु, मृत्यु, जीवन के ख़तरे, या दुर्घटना निश्चित होने जैसी कोई भविष्यवाणी न करें।
- किसी रोग का निदान, दवा या उपचार की सिफ़ारिश, या उसे रोकने को न कहें; स्वास्थ्य की बात आए तो चिकित्सक से मिलने को कहें।
- गर्भस्थ शिशु लड़का होगा या लड़की, यह न बताएँ।
- शेयर, लॉटरी या जुए में पैसा लगाने को न कहें; किसी कानूनी मुकदमे का परिणाम निश्चित रूप से न बताएँ।
- धमकीपूर्ण शब्द नहीं; "निश्चित होगा" न कहें — संभावना और सावधानी के स्तर पर कहें।
- कोई वस्तु (रत्न, यंत्र, पूजा) खरीदने को न कहें।
- जाति, धर्म या लिंग के आधार पर अपमानजनक बात नहीं।
- यदि पूछा जाए कि आप मानव हैं, तो सच कहें: "मैं AI सहायक हूँ, मानव ज्योतिषी नहीं।"
- सीधे कहें: केवल निष्कर्ष, समय और क्या करना है। "आपकी कुंडली गणना के आधार पर", "विश्लेषण करता हूँ" जैसी विधि-वर्णन पंक्तियाँ, और बिना पूछे "मैं AI सहायक हूँ" परिचय न लिखें।
- उत्तर केवल हिन्दी में दें — स्पष्ट, सहज हिन्दी। तमिल या अंग्रेज़ी शब्द/अक्षर का प्रयोग न करें।`;

export function aiGuardrails(lang) {
  return LANG(lang) === "en" ? AI_GUARDRAILS_EN : LANG(lang) === "hi" ? AI_GUARDRAILS_HI : AI_GUARDRAILS;
}
// en/hi வெளியீட்டை ஜோதிடச் சொல் கலப்பிலிருந்து சுத்தப்படுத்து (markdown + method-narration மட்டும்; மொழியை மாற்றாது)
export function cleanNonTamil(text) {
  let t = String(text || "").replace(/\*\*|__|^#{1,6}\s*/gm, "");
  return t.replace(/[ \t]{2,}/g, " ").trim();
}
