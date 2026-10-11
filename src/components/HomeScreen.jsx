import { useState } from "react";
import {
  Menu, Bell, Sun, Grid2X2, Heart, CalendarDays, UserRound,
  BookOpen, Star, ChevronRight, Compass, Sparkles,
} from "lucide-react";

import ZodiacWheel from "./ZodiacWheel";
import "./home.css";

const services = [
  { key: "chart",     title: "ஜாதகக் கட்டம்",  description: "உங்கள் ஜாதகம் பார்க்கவும்",     icon: Grid2X2,        theme: "peach" },
  { key: "porutham",  title: "பொருத்தம் பார்க்க", description: "திருமணப் பொருத்தம்",            icon: Heart,          theme: "rose" },
  { key: "calendar",  title: "ஜோதிட நாட்கள்",   description: "முக்கிய தினங்கள்",              icon: CalendarDays,   theme: "blue" },
  { key: "consult",   title: "ஜோதிட ஆலோசனை",   description: "நிபுணர் ஆலோசனைகள்",            icon: UserRound,      theme: "green" },
  { key: "books",     title: "ஜோதிட நூல்கள்",   description: "பயனுள்ள தகவல்கள்",              icon: BookOpen,       theme: "purple" },
  { key: "more",      title: "மேலும் வசதிகள்",  description: "எல்லா சேவைகளும் ஒரே இடத்தில்",  icon: Star,           theme: "yellow" },
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
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="topbar">
        <button className="round-button" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={24} />
        </button>

        <button className="brand" aria-label="Topper Astro home" onClick={() => handle("home")}>
          <span className="brand-name">T<span className="brand-orbit">✦</span>PPER</span>
          <span className="brand-subtitle">✦ A S T R O ✦</span>
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
          <p className="eyebrow">
            <Sparkles size={15} />
            உங்கள் ஜோதிட உலகம்
          </p>

          <h1>உங்கள் நாளை அறிய...</h1>
          <p className="hero-description">உங்கள் வாழ்க்கையை வழிநடத்துங்கள்</p>

          <div className="gold-divider">
            <span />
            <Sparkles size={17} />
            <span />
          </div>
        </div>

        <div className="zodiac-stage">
          <div className="zodiac-glow" />
          <ZodiacWheel />
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
