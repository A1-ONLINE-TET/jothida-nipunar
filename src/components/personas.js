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
    suggestions: ["என் வாழ்க்கை பொதுவாக எப்படி இருக்கும்?", "நடப்பு தசை என்ன தரும்?", "எதில் கவனம் தேவை?"] },
  { key: "marriage", name: "மணவாழ்வு வழிகாட்டி", role: "திருமண காலம், துணை, மண வாழ்க்கை", icon: Heart, color: "#b86084", tint: "#faeef3",
    intro: "திருமண காலம், வாழ்க்கைத் துணை, மண வாழ்க்கை பற்றிக் கேளுங்கள்.",
    suggestions: ["என் திருமணம் எப்போது நடக்கும்?", "வாழ்க்கைத் துணை எப்படி இருப்பார்?", "திருமண வாழ்க்கை எப்படி அமையும்?"] },
  { key: "career", name: "தொழில் வழிகாட்டி", role: "வேலை, பதவி உயர்வு, ஏற்ற துறை", icon: Briefcase, color: "#6b9150", tint: "#f0f6ea",
    intro: "வேலை, தொழில், பதவி உயர்வு பற்றிக் கேளுங்கள்.",
    suggestions: ["தொழிலில் முன்னேற்றம் எப்போது?", "எனக்கு எந்தத் துறை ஏற்றது?", "வேலை மாற்றம் நல்லதா?"] },
  { key: "wealth", name: "செல்வ வழிகாட்டி", role: "வருமானம், சேமிப்பு, கடன்", icon: Coins, color: "#c07a4a", tint: "#faf0e8",
    intro: "வருமானம், சேமிப்பு, கடன் பற்றிக் கேளுங்கள்.",
    suggestions: ["பண வரவு எப்படி இருக்கும்?", "கடன் எப்போது தீரும்?", "சேமிப்பு பெருகுமா?"] },
  { key: "health", name: "நலம் வழிகாட்டி", role: "உடல்நலம், கவனம் தேவைப்படும் காலம்", icon: HeartPulse, color: "#2e8b84", tint: "#e9f5f4",
    intro: "உடல்நலத்தில் கவனம் தேவைப்படும் காலங்களைச் சொல்கிறேன். இது மருத்துவ ஆலோசனை அல்ல.",
    suggestions: ["என் ஆரோக்கியம் எப்படி இருக்கும்?", "உடல்நலத்தில் கவனம் தேவைப்படும் காலம் எது?", "மன அமைதி எப்போது கிடைக்கும்?"] },
  { key: "education", name: "கல்வி வழிகாட்டி", role: "படிப்பு, தேர்வு, உயர்கல்வி", icon: GraduationCap, color: "#8a62b0", tint: "#f4eefa",
    intro: "படிப்பு, தேர்வு, உயர்கல்வி பற்றிக் கேளுங்கள்.",
    suggestions: ["தேர்வில் வெற்றி கிடைக்குமா?", "உயர்கல்வி வாய்ப்பு உண்டா?", "எந்தப் படிப்பு எனக்கு ஏற்றது?"] },
  { key: "children", name: "சந்தான வழிகாட்டி", role: "குழந்தை பாக்கியம், சந்ததி", icon: Baby, color: "#b5683a", tint: "#faf0e8",
    intro: "குழந்தை பாக்கியம், அதற்குச் சாதகமான காலம் பற்றிக் கேளுங்கள்.",
    suggestions: ["குழந்தை பாக்கியம் எப்போது?", "சந்ததி யோகம் எப்படி உள்ளது?", "குழந்தைகளால் மகிழ்ச்சி உண்டா?"] },
  { key: "travel", name: "பயண வழிகாட்டி", role: "வெளிநாடு, இடமாற்றம்", icon: Plane, color: "#5565b8", tint: "#eef1fb",
    intro: "வெளிநாட்டு வாய்ப்பு, இடமாற்றம், பயணம் பற்றிக் கேளுங்கள்.",
    suggestions: ["வெளிநாடு செல்லும் வாய்ப்பு உண்டா?", "இடமாற்றம் எப்போது?", "வெளிநாட்டில் குடியேற முடியுமா?"] },
].map((p) => ({ ...p, image: IMAGES[p.key] || IMAGES.sample || "", ownImage: !!IMAGES[p.key] }));

const BY_KEY = Object.fromEntries(PERSONAS.map((p) => [p.key, p]));
export const personaFor = (key) => BY_KEY[key] || BY_KEY.general;

// ஜாதகம் → பலன்கள் tab-இன் வாழ்க்கைப் பகுதி (bhava-phalam area key) → அதற்குரிய உதவியாளர்
export const PERSONA_FOR_AREA = { self: "general", wealth: "wealth", education: "education", health: "health", marriage: "marriage", career: "career" };
