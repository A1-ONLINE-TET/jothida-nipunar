import {
  ArrowLeft, Star, Sparkles, Compass, BookOpen,
  CalendarDays, ChevronRight,
} from "lucide-react";

import "./home.css";

const services = [
  { key: "dasha",       title: "தசா அட்டவணை",          description: "விம்சோத்தரி தசா, அந்தர்தசா காலக்கணக்கு",     icon: Star,         theme: "yellow" },
  { key: "yogas",       title: "யோகங்கள் & தோஷங்கள்",  description: "மகாபுருஷ யோகம், கால சர்ப்ப, செவ்வாய் தோஷம்",  icon: Sparkles,     theme: "purple" },
  { key: "nakbhava",    title: "நட்சத்திர-பாவக",       description: "நட்சத்திர-பாவக இணைப்பு, கோசார காலம்",        icon: Compass,      theme: "blue" },
  { key: "backtest",    title: "Backtest சரிபார்ப்பு",  description: "கடந்த நிகழ்வுகளில் ஜோதிட துல்லியம் சோதனை",   icon: BookOpen,     theme: "green" },
  { key: "eventtiming", title: "நிகழ்வு நேரம்",        description: "திருமணம், வேலை, பயணம் — சிறந்த நேரம்",       icon: CalendarDays, theme: "blue" },
  { key: "sadesati",    title: "சாதே சாதி / குரு பெயர்ச்சி", description: "சனி, குரு கோசார தாக்கம் பார்க்கவும்",  icon: Star,         theme: "yellow" },
  { key: "muhurtham",   title: "முகூர்த்தம்",           description: "சுப நேரம், ராகு காலம், யமகண்டம்",            icon: CalendarDays, theme: "peach" },
];

export default function AdvisoryScreen({ handle = () => {}, onBack = () => {} }) {
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

        <button className="brand brand-logo" aria-label="Topper Astro home" onClick={() => handle("home")}>
          <img src="/logo/topper-text.webp" alt="TOPPER ASTRO" />
        </button>

        <span className="round-button" aria-hidden="true" style={{ visibility: "hidden" }} />
      </header>

      <section className="hero" style={{ minHeight: "auto", paddingBottom: 8 }}>
        <div className="hero-copy">
          <h1>ஜோதிடரிடம் ஆலோசனை</h1>
          <p style={{ color: "#c9a84a", fontSize: 13, marginTop: 6, fontWeight: 600 }}>
            விரிவான ஜோதிட பகுப்பாய்வு
          </p>
          <div className="gold-divider">
            <span />
            <Sparkles size={17} />
            <span />
          </div>
        </div>
      </section>

      <section className="services-grid" aria-label="Advanced astrology services">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <button className={`service-card ${service.theme}`} key={service.key} onClick={() => handle(service.key)}>
              <span className="service-icon">
                <Icon size={31} strokeWidth={1.6} />
              </span>
              <span className="service-title">{service.title}</span>
              <span className="service-description">{service.description}</span>
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
