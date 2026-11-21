import { Sparkles } from "lucide-react";

import "./home.css";
import BottomNav from "./BottomNav.jsx";
import { PERSONAS } from "./personas.js";

// ஆலோசனை — ஒவ்வொரு தேவைக்கும் ஓர் AI உதவியாளர் (படம், பெயர், துறை). தட்டினால் அந்த உதவியாளருடன்
// அரட்டை திறக்கும்; worker/src/ask.js அந்தத் தலைப்பின் வீடுகள், காரகன், தசையை வைத்துப் பதிலளிக்கும்.
export default function AdvisoryScreen({ onPick = () => {}, onNav = () => {} }) {
  return (
    <main className="app-shell">
      <div className="sky-stars" aria-hidden="true" />
      <div className="sky-moon" aria-hidden="true" />
      <div className="sky-glow sky-glow-gold" aria-hidden="true" />
      <div className="sky-glow sky-glow-blue" aria-hidden="true" />
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="topbar topbar-center">
        <span className="brand brand-logo">
          <img src="/logo/topper-astro.webp" alt="TOPPER ASTRO" width="780" height="254" style={{ maxWidth: 270, maxHeight: "none", WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 76%, transparent 100%)", maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 76%, transparent 100%)" }} />
        </span>
      </header>

      <section className="hero" style={{ minHeight: "auto", paddingBottom: 8, flex: "0 0 auto" }}>
        <div className="hero-copy">
          <h1>AI ஜோதிட உதவியாளர்கள்</h1>
          <p style={{ color: "#c9a84a", fontSize: 13, marginTop: 6, fontWeight: 600 }}>
            எந்தத் தலைப்பில் ஆலோசனை வேண்டும்?
          </p>
          <p data-ai-notice style={{ fontSize: 12, lineHeight: 1.6, marginTop: 8, color: "#76819a", maxWidth: 330, marginLeft: "auto", marginRight: "auto" }}>
            பதிலளிப்பது AI உதவியாளர்; மனித ஜோதிடர் அல்ல.
          </p>
          <div className="gold-divider">
            <span />
            <Sparkles size={17} />
            <span />
          </div>
        </div>
      </section>

      <section className="persona-grid" aria-label="AI உதவியாளர்கள்">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          return (
            <button className="persona-card" key={p.key} data-persona={p.key} onClick={() => onPick(p.key)}>
              <span className="persona-pic" style={{ background: p.tint }}>
                <img src={p.image} alt="" loading="lazy" width="96" height="96" />
                <span className="persona-topic" style={{ color: p.color }}><Icon size={15} strokeWidth={2} /></span>
                <span className="persona-ai">AI</span>
              </span>
              <span className="persona-name">{p.name}</span>
              <span className="persona-role">{p.role}</span>
            </button>
          );
        })}
      </section>

      <div style={{ flex: "1 1 auto" }} />
      <BottomNav active="advisory" onNav={onNav} />
    </main>
  );
}
