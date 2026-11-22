// ═══════════════════════════════════════════════════════════════════
// AI ஜோதிட உதவியாளர்கள் — ஒவ்வொரு தேவைக்கும் ஒருவர் (பெயர், படம், அறிமுகம், மாதிரிக் கேள்விகள்).
// key = worker/src/ask.js-இன் தலைப்பு (TOPICS) — அந்தத் தலைப்பின் வீடுகள், காரகன், தசையை வைத்தே
// சேவையகம் பதிலளிக்கிறது; இங்கே இருப்பது காட்சித் தகவல் மட்டும் (கணக்கு எதுவும் இல்லை).
// AI பதிலின் பேச்சுத் தொனி: worker/src/gemini.js → PERSONA_STYLE (அதே key).
//
// படங்கள்: src/assets/personas/<key>.webp (png/jpg-உம் சரி). கோப்பு இல்லையெனில் sample.webp.
// புதிய படம் சேர்க்க அந்தக் கோப்புறையின் README-ஐப் பாருங்கள் — நிரல் மாற்றம் தேவையில்லை.
// ⚠ இவர்கள் AI உதவியாளர்கள்: மதிப்பீடு, "online" குறி, கட்டணம், மனிதப் பெயர் போன்றவற்றைச் சேர்க்காதே.
// ═══════════════════════════════════════════════════════════════════
import { Sparkles, Heart, Briefcase, Coins, HeartPulse, GraduationCap, Baby, Plane } from "lucide-react";

const files = import.meta.glob("../assets/personas/*.{webp,png,jpg,jpeg}", { eager: true, query: "?url", import: "default" });
const IMAGES = {};
for (const path in files) IMAGES[path.split("/").pop().replace(/\.[^.]+$/, "")] = files[path];

export const PERSONAS = [
  { key: "general", name: "ஜோதிட குரு", role: "பொது ஆலோசனை, சொந்தக் கேள்வி", icon: Sparkles, color: "#7d6a3f", tint: "#f8f3e6",
    intro: "உங்கள் ஜாதகம் பற்றிய எந்தக் கேள்வியையும் கேளுங்கள்.",
    suggestions: ["என் வாழ்க்கை பொதுவாக எப்படி இருக்கும்?", "நடப்பு தசை என்ன தரும்?", "எதில் கவனம் தேவை?"],
    en: { name: "Astrology Guru", role: "General guidance, your own question",
      intro: "Ask any question about your horoscope.",
      suggestions: ["How will my life be in general?", "What will the current dasha bring?", "What needs attention?"] },
    hi: { name: "ज्योतिष गुरु", role: "सामान्य मार्गदर्शन, आपका अपना प्रश्न",
      intro: "अपनी कुंडली के बारे में कोई भी प्रश्न पूछें।",
      suggestions: ["मेरा जीवन सामान्यतः कैसा रहेगा?", "वर्तमान दशा क्या देगी?", "किस पर ध्यान चाहिए?"] } },
  { key: "marriage", name: "மணவாழ்வு வழிகாட்டி", role: "திருமண காலம், துணை, மண வாழ்க்கை", icon: Heart, color: "#b86084", tint: "#faeef3",
    intro: "திருமண காலம், வாழ்க்கைத் துணை, மண வாழ்க்கை பற்றிக் கேளுங்கள்.",
    suggestions: ["என் திருமணம் எப்போது நடக்கும்?", "வாழ்க்கைத் துணை எப்படி இருப்பார்?", "திருமண வாழ்க்கை எப்படி அமையும்?"],
    en: { name: "Marriage Guide", role: "Marriage timing, partner, married life",
      intro: "Ask about marriage timing, your life partner and married life.",
      suggestions: ["When will my marriage happen?", "What will my partner be like?", "How will my married life be?"] },
    hi: { name: "विवाह मार्गदर्शक", role: "विवाह समय, जीवनसाथी, वैवाहिक जीवन",
      intro: "विवाह समय, जीवनसाथी और वैवाहिक जीवन के बारे में पूछें।",
      suggestions: ["मेरा विवाह कब होगा?", "मेरा जीवनसाथी कैसा होगा?", "मेरा वैवाहिक जीवन कैसा रहेगा?"] } },
  { key: "career", name: "தொழில் வழிகாட்டி", role: "வேலை, பதவி உயர்வு, ஏற்ற துறை", icon: Briefcase, color: "#6b9150", tint: "#f0f6ea",
    intro: "வேலை, தொழில், பதவி உயர்வு பற்றிக் கேளுங்கள்.",
    suggestions: ["தொழிலில் முன்னேற்றம் எப்போது?", "எனக்கு எந்தத் துறை ஏற்றது?", "வேலை மாற்றம் நல்லதா?"],
    en: { name: "Career Guide", role: "Job, promotion, suitable field",
      intro: "Ask about work, career and promotion.",
      suggestions: ["When will I progress in my career?", "Which field suits me?", "Is a job change good?"] },
    hi: { name: "व्यवसाय मार्गदर्शक", role: "नौकरी, पदोन्नति, उपयुक्त क्षेत्र",
      intro: "नौकरी, व्यवसाय और पदोन्नति के बारे में पूछें।",
      suggestions: ["व्यवसाय में उन्नति कब होगी?", "मेरे लिए कौन-सा क्षेत्र उपयुक्त है?", "क्या नौकरी बदलना अच्छा है?"] } },
  { key: "wealth", name: "செல்வ வழிகாட்டி", role: "வருமானம், சேமிப்பு, கடன்", icon: Coins, color: "#c07a4a", tint: "#faf0e8",
    intro: "வருமானம், சேமிப்பு, கடன் பற்றிக் கேளுங்கள்.",
    suggestions: ["பண வரவு எப்படி இருக்கும்?", "கடன் எப்போது தீரும்?", "சேமிப்பு பெருகுமா?"],
    en: { name: "Wealth Guide", role: "Income, savings, debt",
      intro: "Ask about income, savings and debt.",
      suggestions: ["How will my income be?", "When will my debt clear?", "Will my savings grow?"] },
    hi: { name: "धन मार्गदर्शक", role: "आय, बचत, ऋण",
      intro: "आय, बचत और ऋण के बारे में पूछें।",
      suggestions: ["मेरी आय कैसी रहेगी?", "मेरा ऋण कब चुकेगा?", "क्या मेरी बचत बढ़ेगी?"] } },
  { key: "health", name: "நலம் வழிகாட்டி", role: "உடல்நலம், கவனம் தேவைப்படும் காலம்", icon: HeartPulse, color: "#2e8b84", tint: "#e9f5f4",
    intro: "உடல்நலத்தில் கவனம் தேவைப்படும் காலங்களைச் சொல்கிறேன். இது மருத்துவ ஆலோசனை அல்ல.",
    suggestions: ["என் ஆரோக்கியம் எப்படி இருக்கும்?", "உடல்நலத்தில் கவனம் தேவைப்படும் காலம் எது?", "மன அமைதி எப்போது கிடைக்கும்?"],
    en: { name: "Wellness Guide", role: "Health, periods needing care",
      intro: "I note the periods that need care for your health. This is not medical advice.",
      suggestions: ["How will my health be?", "Which period needs health care?", "When will I find peace of mind?"] },
    hi: { name: "स्वास्थ्य मार्गदर्शक", role: "स्वास्थ्य, ध्यान आवश्यक काल",
      intro: "स्वास्थ्य हेतु ध्यान आवश्यक काल बताता हूँ। यह चिकित्सा सलाह नहीं है।",
      suggestions: ["मेरा स्वास्थ्य कैसा रहेगा?", "किस काल में स्वास्थ्य का ध्यान चाहिए?", "मन की शांति कब मिलेगी?"] } },
  { key: "education", name: "கல்வி வழிகாட்டி", role: "படிப்பு, தேர்வு, உயர்கல்வி", icon: GraduationCap, color: "#8a62b0", tint: "#f4eefa",
    intro: "படிப்பு, தேர்வு, உயர்கல்வி பற்றிக் கேளுங்கள்.",
    suggestions: ["தேர்வில் வெற்றி கிடைக்குமா?", "உயர்கல்வி வாய்ப்பு உண்டா?", "எந்தப் படிப்பு எனக்கு ஏற்றது?"],
    en: { name: "Education Guide", role: "Studies, exams, higher education",
      intro: "Ask about studies, exams and higher education.",
      suggestions: ["Will I succeed in exams?", "Is there a chance for higher education?", "Which course suits me?"] },
    hi: { name: "शिक्षा मार्गदर्शक", role: "पढ़ाई, परीक्षा, उच्च शिक्षा",
      intro: "पढ़ाई, परीक्षा और उच्च शिक्षा के बारे में पूछें।",
      suggestions: ["क्या परीक्षा में सफलता मिलेगी?", "क्या उच्च शिक्षा का योग है?", "मेरे लिए कौन-सी पढ़ाई उपयुक्त है?"] } },
  { key: "children", name: "சந்தான வழிகாட்டி", role: "குழந்தை பாக்கியம், சந்ததி", icon: Baby, color: "#b5683a", tint: "#faf0e8",
    intro: "குழந்தை பாக்கியம், அதற்குச் சாதகமான காலம் பற்றிக் கேளுங்கள்.",
    suggestions: ["குழந்தை பாக்கியம் எப்போது?", "சந்ததி யோகம் எப்படி உள்ளது?", "குழந்தைகளால் மகிழ்ச்சி உண்டா?"],
    en: { name: "Progeny Guide", role: "Children, progeny",
      intro: "Ask about children and the favourable time for it.",
      suggestions: ["When is the blessing of children?", "How is the progeny yoga?", "Will children bring joy?"] },
    hi: { name: "संतान मार्गदर्शक", role: "संतान, वंश",
      intro: "संतान और उसके अनुकूल काल के बारे में पूछें।",
      suggestions: ["संतान सुख कब है?", "संतान योग कैसा है?", "क्या संतान से सुख मिलेगा?"] } },
  { key: "travel", name: "பயண வழிகாட்டி", role: "வெளிநாடு, இடமாற்றம்", icon: Plane, color: "#5565b8", tint: "#eef1fb",
    intro: "வெளிநாட்டு வாய்ப்பு, இடமாற்றம், பயணம் பற்றிக் கேளுங்கள்.",
    suggestions: ["வெளிநாடு செல்லும் வாய்ப்பு உண்டா?", "இடமாற்றம் எப்போது?", "வெளிநாட்டில் குடியேற முடியுமா?"],
    en: { name: "Travel Guide", role: "Abroad, relocation",
      intro: "Ask about chances of going abroad, relocation and travel.",
      suggestions: ["Is there a chance to go abroad?", "When is relocation?", "Can I settle abroad?"] },
    hi: { name: "यात्रा मार्गदर्शक", role: "विदेश, स्थानांतरण",
      intro: "विदेश अवसर, स्थानांतरण और यात्रा के बारे में पूछें।",
      suggestions: ["क्या विदेश जाने का योग है?", "स्थानांतरण कब है?", "क्या विदेश में बस सकता हूँ?"] } },
].map((p) => ({ ...p, image: IMAGES[p.key] || IMAGES.sample || "", ownImage: !!IMAGES[p.key] }));

const BY_KEY = Object.fromEntries(PERSONAS.map((p) => [p.key, p]));
export const personaFor = (key) => BY_KEY[key] || BY_KEY.general;

// தேர்ந்த மொழியில் உதவியாளரின் காட்சித் தகவல் (key/icon/color மாறாது; name/role/intro/suggestions மட்டும்)
export function localizePersona(p, lang) {
  if (!p) return p;
  const L = (lang === "en" || lang === "hi") ? p[lang] : null;
  return L ? { ...p, name: L.name, role: L.role, intro: L.intro, suggestions: L.suggestions } : p;
}

// ஜாதகம் → பலன்கள் tab-இன் வாழ்க்கைப் பகுதி (bhava-phalam area key) → அதற்குரிய உதவியாளர்
export const PERSONA_FOR_AREA = { self: "general", wealth: "wealth", education: "education", health: "health", marriage: "marriage", career: "career" };
