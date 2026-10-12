import {
  ArrowLeft, Heart, Briefcase, Coins, HeartPulse,
  GraduationCap, Baby, Plane, MessageCircle, ChevronRight, Sparkles,
} from "lucide-react";

import "./home.css";

// நோக்கம் (purpose) அடிப்படை — ஒவ்வொரு தலைப்பும் ஒரு கேள்வியாக engine-க்கு செல்லும்.
// worker/src/ask.js இந்தக் கேள்விகளை topic-ஆக classify செய்து chart படித்து பதிலளிக்கும்.
const topics = [
  { key: "marriage",  title: "திருமணம்",        description: "வாழ்க்கைத் துணை, காலம், பொருத்தம்",  icon: Heart,         theme: "rose",
    question: "என் திருமணம் எப்போது நடக்கும்? வாழ்க்கைத் துணை எப்படி இருப்பார்?" },
  { key: "career",    title: "தொழில் / வேலை",    description: "முன்னேற்றம், பதவி உயர்வு, துறை",     icon: Briefcase,     theme: "blue",
    question: "என் தொழிலில் முன்னேற்றம் எப்போது? எந்தத் துறை சிறந்தது?" },
  { key: "wealth",    title: "பணம் / செல்வம்",   description: "வருமானம், சேமிப்பு, செல்வ யோகம்",    icon: Coins,         theme: "yellow",
    question: "என் பண வரவு, செல்வ வளர்ச்சி எப்படி இருக்கும்?" },
  { key: "health",    title: "ஆரோக்கியம்",       description: "உடல்நலம், தோஷம், கவனம் தேவை காலம்",  icon: HeartPulse,    theme: "green",
    question: "என் ஆரோக்கியம் பற்றி சொல்லுங்கள். கவனம் தேவை காலம் எது?" },
  { key: "education", title: "கல்வி / படிப்பு",  description: "தேர்வு வெற்றி, உயர்கல்வி வாய்ப்பு",  icon: GraduationCap, theme: "purple",
    question: "என் கல்வி, படிப்பில் வெற்றி உண்டா? உயர்கல்வி வாய்ப்பு?" },
  { key: "children",  title: "குழந்தை பாக்கியம்", description: "சந்ததி, குழந்தை யோகம், காலம்",      icon: Baby,          theme: "peach",
    question: "குழந்தை பாக்கியம் பற்றி சொல்லுங்கள்." },
  { key: "travel",    title: "பயணம் / வெளிநாடு", description: "வெளிநாட்டு வாய்ப்பு, இட மாற்றம்",     icon: Plane,         theme: "blue",
    question: "வெளிநாடு செல்லும் வாய்ப்பு உண்டா? எப்போது?" },
  { key: "general",   title: "சொந்த கேள்வி",      description: "உங்கள் கேள்வியை நேரடியாகக் கேளுங்கள்", icon: MessageCircle, theme: "rose",
    question: "" },
];

export default function AdvisoryScreen({ onBack = () => {}, onPick = () => {}, astrologerName = "ஜோதிட குரு" }) {
  return (
    <main className="app-shell">
      <div className="sky-stars" aria-hidden="true" />
      <div className="sky-moon" aria-hidden="true" />
      <div className="sky-glow sky-glow-gold" aria-hidden="true" />
      <div className="sky-glow sky-glow-blue" aria-hidden="true" />
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="topbar">
        <button className="round-button" aria-label="பின் செல்" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <button className="brand brand-logo" aria-label="Topper Astro home" onClick={onBack}>
          <img src="/logo/topper-text.webp" alt="TOPPER ASTRO" />
        </button>
        <span className="round-button" aria-hidden="true" style={{ visibility: "hidden" }} />
      </header>

      <section className="hero" style={{ minHeight: "auto", paddingBottom: 8 }}>
        <div className="hero-copy">
          <h1>{astrologerName}</h1>
          <p style={{ color: "#c9a84a", fontSize: 13, marginTop: 6, fontWeight: 600 }}>
            எந்தத் தலைப்பில் ஆலோசனை வேண்டும்?
          </p>
          <div className="gold-divider">
            <span />
            <Sparkles size={17} />
            <span />
          </div>
        </div>
      </section>

      <section className="services-grid" aria-label="ஆலோசனை தலைப்புகள்">
        {topics.map((t) => {
          const Icon = t.icon;
          return (
            <button className={`service-card ${t.theme}`} key={t.key} onClick={() => onPick(t.question)}>
              <span className="service-icon">
                <Icon size={31} strokeWidth={1.6} />
              </span>
              <span className="service-title">{t.title}</span>
              <span className="service-description">{t.description}</span>
              <span className="service-arrow">
                <ChevronRight size={18} />
              </span>
            </button>
          );
        })}
      </section>
    </main>
  );
}
