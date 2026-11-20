import { useState } from "react";
import {
  Menu, Sun, Grid2X2, Heart, CalendarDays, ChevronRight, Sparkles,
} from "lucide-react";

import "./home.css";
import BottomNav, { NAV_ITEMS as navigation } from "./BottomNav.jsx";

const services = [
  { key: "advisory", title: "ஜோதிடரிடம் ஆலோசனை", description: "திருமணம், தொழில், ஆரோக்கியம் — ஜோதிடர் பதில்", icon: Sparkles,     theme: "purple" },
  { key: "chart",    title: "ஜாதகக் கட்டம்",     description: "கிரக நிலைகள், லக்னம், ராசி முழு ஜாதகம்",      icon: Grid2X2,      theme: "peach" },
  { key: "porutham", title: "திருமண பொருத்தம்",  description: "10 பொருத்தம், நாடி, ரஜ்ஜு, வேதம்",           icon: Heart,        theme: "rose" },
  { key: "calendar", title: "ஜோதிட நாட்கள்",     description: "முகூர்த்தம், ராகு காலம், பஞ்சாங்கம்",         icon: CalendarDays, theme: "blue" },
];


export default function HomeScreen({ handle = () => {} }) {
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

        <span className="round-button" aria-hidden="true" style={{ visibility: "hidden" }} />
      </header>

      {menuOpen && (
        <div className="menu-panel">
          {navigation.map((item) => (
            <button
              key={item.key}
              onClick={() => { setMenuOpen(false); handle(item.key); }}
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

      <BottomNav active="home" onNav={handle} fixed={false} />
    </main>
  );
}
