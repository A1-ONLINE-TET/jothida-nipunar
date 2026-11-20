import {
  Heart, CalendarDays, ChevronRight, Sparkles, Star, Hash, Baby, PartyPopper, Flame, Grid2X2,
} from "lucide-react";

import "./home.css";
import BottomNav from "./BottomNav.jsx";
import { kizhamai } from "./tools-data.js";

// முகப்பில் ஒவ்வொரு சேவையும் ஒரே ஒரு இடத்தில்:
//   • கீழ்ப்பட்டை — தினப்பலன், ஜாதகம், ஆலோசனை, கணக்கு (இவை முகப்பில் மீண்டும் வராது)
//   • "இன்று" அட்டை — பஞ்சாங்கத் தகவல்; தட்டினால் முழுப் பஞ்சாங்கம் (அதற்குத் தனி ஓடு இல்லை)
//   • கீழுள்ள 6 ஓடுகள் — வேறெங்கும் இல்லாத சேவைகள்
const services = [
  { key: "rasi",       title: "12 ராசி பலன்",      description: "இன்று முதல் ஆண்டு வரை",   icon: Star,        theme: "green" },
  { key: "porutham",   title: "திருமண பொருத்தம்", description: "10 பொருத்தம்",            icon: Heart,       theme: "rose" },
  { key: "numerology", title: "எண் கணிதம்",        description: "பிறவி, விதி, பெயர் எண்",  icon: Hash,        theme: "purple" },
  { key: "names",      title: "குழந்தை பெயர்",     description: "நட்சத்திரப்படி எழுத்து",  icon: Baby,        theme: "peach" },
  { key: "festivals",  title: "பண்டிகைகள்",        description: "விசேஷ நாட்கள்",           icon: PartyPopper, theme: "yellow" },
  { key: "navagraha",  title: "நவகிரக வழிபாடு",    description: "மந்திரம், கோயில், தானம்", icon: Flame,       theme: "blue" },
];

export default function HomeScreen({ handle = () => {}, today = null, hasProfile = false, name = "" }) {
  const paksha = today && today.tithi !== "பௌர்ணமி" && today.tithi !== "அமாவாசை" ? (today.waxing ? "வளர்பிறை" : "தேய்பிறை") : "";

  return (
    <main className={`app-shell${hasProfile ? "" : " has-start"}`}>
      <div className="sky-stars" aria-hidden="true" />
      <div className="sky-moon" aria-hidden="true" />
      <div className="sky-glow sky-glow-gold" aria-hidden="true" />
      <div className="sky-glow sky-glow-blue" aria-hidden="true" />

      <header className="topbar topbar-center">
        <span className="brand brand-logo">
          <img src="/logo/topper-text.webp" alt="TOPPER ASTRO" />
        </span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <h1>உங்கள் நாளை அறிய...</h1>
          <h1>உங்கள் வாழ்க்கையை வழிநடத்த...</h1>
          <div className="gold-divider">
            <span />
            <Sparkles size={17} />
            <span />
          </div>
          {hasProfile && name ? <p className="hero-greeting">வணக்கம், {name}</p> : null}
        </div>

        <div className="zodiac-stage">
          <div className="zodiac-glow" />
          <img className="zodiac-wheel-img" src="/logo/compass.webp" alt="ராசி சக்கரம்" />
          <div className="zodiac-pedestal" />
          <div className="zodiac-pedestal-top" />
        </div>
      </section>

      {/* புதிய பயனருக்கு மட்டும்: பிறப்பு விவரம் உள்ளிட அழைப்பு (சுயவிவரம் வந்ததும் மறையும்) */}
      {!hasProfile && (
        <button className="start-card" data-home-start onClick={() => handle("newchart")}>
          <span className="start-icon"><Grid2X2 size={22} strokeWidth={1.8} /></span>
          <span className="start-copy">
            <b>உங்கள் ஜாதகத்தை உருவாக்குங்கள்</b>
            <small>பிறந்த தேதி, நேரம், இடம் — ஒரு முறை உள்ளிட்டால் போதும்</small>
          </span>
          <ChevronRight size={20} />
        </button>
      )}

      {/* இன்றைய பஞ்சாங்கம் — தகவல் அட்டை; முழு நாட்காட்டிக்கு ஒரே நுழைவு */}
      {today && (
        <button className="today-card" data-home-today onClick={() => handle("calendar")}>
          <div className="today-head">
            <span className="today-icon"><CalendarDays size={20} strokeWidth={1.8} /></span>
            <span className="today-date">
              <b>இன்றைய பஞ்சாங்கம்</b>
              <small>{kizhamai(today.weekday)}, {today.greg}{today.tamil ? ` · ${today.tamil.month} ${today.tamil.day}` : ""}</small>
            </span>
            <span className="today-more" aria-hidden="true"><ChevronRight size={16} /></span>
          </div>
          <div className="today-grid">
            <span><small>திதி{paksha ? ` · ${paksha}` : ""}</small><b>{today.tithi}</b>{today.dp ? <i>{today.dp.tithiUntil}{today.dp.tithiNext ? ` · பின் ${today.dp.tithiNext}` : ""}</i> : null}</span>
            <span><small>நட்சத்திரம்</small><b>{today.nakshatra}</b>{today.dp ? <i>{today.dp.nakUntil}{today.dp.nakNext ? ` · பின் ${today.dp.nakNext}` : ""}</i> : null}</span>
            <span><small>ராகு காலம்</small><b>{today.rahuKalam}</b></span>
            <span><small>உதயம் · அஸ்தமனம்</small><b>{today.sunrise} · {today.sunset}</b></span>
          </div>
        </button>
      )}

      <section className="services-grid" aria-label="சேவைகள்">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <button className={`service-card ${service.theme}`} key={service.key} data-home-service={service.key} onClick={() => handle(service.key)}>
              <span className="service-icon">
                <Icon size={28} strokeWidth={1.6} />
              </span>
              <span className="service-title">{service.title}</span>
              <span className="service-description">{service.description}</span>
            </button>
          );
        })}
      </section>

      <BottomNav active="home" onNav={handle} />
    </main>
  );
}
