import { useState } from "react";
import {
  Menu, Bell, Sun, Grid2X2, Heart, CalendarDays, UserRound,
  BookOpen, Star, ChevronRight, Compass, Sparkles,
} from "lucide-react";

import "./home.css";

const services = [
  { key: "chart",       title: "ஜாதகக் கட்டம்",       description: "கிரக நிலைகள், லக்னம், ராசி முழு ஜாதகம்",      icon: Grid2X2,      theme: "peach" },
  { key: "dasha",       title: "தசா அட்டவணை",          description: "விம்சோத்தரி தசா, அந்தர்தசா காலக்கணக்கு",      icon: Star,         theme: "yellow" },
  { key: "yogas",       title: "யோகங்கள் & தோஷங்கள்",  description: "மகாபுருஷ யோகம், கால சர்ப்ப, செவ்வாய் தோஷம்",   icon: Sparkles,     theme: "purple" },
  { key: "porutham",    title: "திருமண பொருத்தம்",     description: "10 பொருத்தம், நாடி, ரஜ்ஜு, வேதம்",            icon: Heart,        theme: "rose" },
  { key: "nakbhava",    title: "நட்சத்திர-பாவக",       description: "நட்சத்திர-பாவக இணைப்பு, கோசார காலம்",         icon: Compass,      theme: "blue" },
  { key: "backtest",    title: "Backtest சரிபார்ப்பு",  description: "கடந்த நிகழ்வுகளில் ஜோதிட துல்லியம் சோதனை",    icon: BookOpen,     theme: "green" },
  { key: "eventtiming", title: "நிகழ்வு நேரம்",        description: "திருமணம், வேலை, பயணம் — சிறந்த நேரம்",        icon: CalendarDays, theme: "blue" },
  { key: "sadesati",    title: "சாதே சாதி / குரு பெயர்ச்சி", description: "சனி, குரு கோசார தாக்கம் பார்க்கவும்",   icon: Star,         theme: "yellow" },
  { key: "muhurtham",   title: "முகூர்த்தம்",           description: "சுப நேரம், ராகு காலம், யமகண்டம்",             icon: CalendarDays, theme: "peach" },
  { key: "consult",     title: "ஜோதிடரிடம் கேளுங்கள்", description: "உங்கள் கேள்விக்கு நேரடி பதில் பெறுங்கள்",     icon: UserRound,    theme: "green" },
];

const navigation = [
  { key: "home",    label: "முகப்பு",     icon: Compass },
  { key: "daily",   label: "ராசிபலன்",   icon: Sun },
  { key: "chart",   label: "ஜாதகம்",     icon: Grid2X2 },
  { key: "account", label: "என் கணக்கு", icon: UserRound },
];

export default function HomeScreen({ handle = () => {} }) {
  const [activeTab, setActiveTab] = useState("முகப்பு");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="app-shell">
      <div className="sky-stars" aria-hidden="true" />
      <div className="sky-moon" aria-hidden="true" />
      <div className="sky-glow sky-glow-gold" aria-hidden="true" />
      <div className="sky-glow sky-glow-blue" aria-hidden="true" />
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="topbar">
        <button className="round-button" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={24} />
        </button>

        <button className="brand brand-logo" aria-label="Topper Astro home" onClick={() => handle("home")}>
          <img src="/logo/topper-text.webp" alt="TOPPER ASTRO" />
        </button>

        <button className="round-button" aria-label="Notifications" onClick={() => handle("notifications")}>
          <Bell size={23} />
        </button>
      </header>

      {menuOpen && (
        <div className="menu-panel">
          {navigation.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.label); setMenuOpen(false); handle(item.key); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <section className="hero">
        <div className="hero-copy">
          <h1>உங்கள் நாளை அறிய...</h1>
          <h1>உங்கள் வாழ்க்கையை வழிநடத்த...</h1>

          <div className="gold-divider">
            <span />
            <Sparkles size={17} />
            <span />
          </div>
        </div>

        <div className="zodiac-stage">
          <div className="zodiac-glow" />
          <img className="zodiac-wheel-img" src="/logo/compass.webp" alt="ராசி சக்கரம்" />
          <div className="zodiac-pedestal" />
          <div className="zodiac-pedestal-top" />
        </div>
      </section>

      <button className="horoscope-card" onClick={() => handle("daily")}>
        <div className="sun-emblem">
          <Sun size={43} strokeWidth={1.5} />
        </div>

        <div className="horoscope-copy">
          <h2>இன்றைய ராசிபலன்</h2>
          <p>உங்கள் நாளுக்கான பலன்கள்</p>
        </div>

        <span className="gold-arrow" aria-hidden="true">
          <ChevronRight size={25} />
        </span>
      </button>

      <section className="services-grid" aria-label="Astrology services">
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

      <nav className="bottom-nav" aria-label="Main navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.label;
          return (
            <button
              key={item.key}
              className={`nav-item ${active ? "active" : ""}`}
              onClick={() => { setActiveTab(item.label); handle(item.key); }}
              aria-current={active ? "page" : undefined}
            >
              <span className="nav-icon">
                <Icon size={24} strokeWidth={active ? 2.3 : 1.7} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
