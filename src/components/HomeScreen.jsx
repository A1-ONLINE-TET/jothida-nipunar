import {
  Heart, CalendarDays, ChevronRight, Hash, Baby, PartyPopper, Flame, LayoutGrid, Sun, Star, Sunrise,
} from "lucide-react";

import "./home.css";
import BottomNav from "./BottomNav.jsx";
import { kizhamai } from "./tools-data.js";

// "12 ராசி பலன்" ஓட்டின் சின்னம்: 12 பிரிவுச் சக்கரம், நடுவில் சூரியன் (lucide-இல் இல்லாததால் இங்கே).
function ZodiacIcon(props) {
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6, c = Math.cos(a), s = Math.sin(a);
    return <line key={i} x1={12 + 5.6 * c} y1={12 + 5.6 * s} x2={12 + 10 * c} y2={12 + 10 * s} />;
  });
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
    return <line key={i} x1={12 + 2.7 * c} y1={12 + 2.7 * s} x2={12 + 3.9 * c} y2={12 + 3.9 * s} />;
  });
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" fill="#ffffff" />
      <circle cx="12" cy="12" r="5.6" />
      {spokes}
      <g stroke="#e9962f"><circle cx="12" cy="12" r="1.5" fill="#f6b73c" />{rays}</g>
    </svg>
  );
}

// உதயம் – அஸ்தமனம்: பகல்/இரவைக் குறிக்கும் இரு பாதி வட்டம்.
function DayNightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" /><line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}

// முகப்பில் ஒவ்வொரு சேவையும் ஒரே ஒரு இடத்தில்:
//   • கீழ்ப்பட்டை — தினப்பலன், ஜாதகம், ஆலோசனை, கணக்கு (இவை முகப்பில் மீண்டும் வராது)
//   • "இன்று" அட்டை — பஞ்சாங்கத் தகவல்; தட்டினால் முழுப் பஞ்சாங்கம் (அதற்குத் தனி ஓடு இல்லை)
//   • கீழுள்ள 6 ஓடுகள் — வேறெங்கும் இல்லாத சேவைகள்
const services = [
  { key: "rasi",       title: "12 ராசி பலன்",      description: "இன்று முதல் ஆண்டு வரை",          icon: ZodiacIcon,  theme: "green", wide: true },
  { key: "porutham",   title: "திருமண பொருத்தம்", description: "10 பொருத்தம்",                   icon: Heart,       theme: "rose" },
  { key: "numerology", title: "எண் கணிதம்",        description: "பிறந்த தேதி, பெயர் எண்",         icon: Hash,        theme: "purple" },
  { key: "names",      title: "குழந்தை பெயர்",     description: "நட்சத்திரப்படி அழகிய பெயர்கள்",  icon: Baby,        theme: "peach" },
  { key: "festivals",  title: "பண்டிகைகள்",        description: "விரத நாட்களுடன்",                icon: PartyPopper, theme: "yellow" },
  { key: "navagraha",  title: "நவகிரக வழிபாடு",    description: "மந்திரம், கோயில், தானம்",        icon: Flame,       theme: "blue" },
];

const spaced = (s) => String(s || "").replace(/\s*[–—-]\s*/, " – ");

// வடிவமைப்பு: பயனர் கொடுத்த மாதிரிப் படம் (2026-11). மேலே தலைப்புப் படம் (/logo/home-banner.webp — சின்னமும் அதிலேயே),
// பின் அட்டைகள், ஓடுகள், கீழே அலை. `name` இப்போது காட்டப்படுவதில்லை (மாதிரியில் வாழ்த்து வரி இல்லை).
export default function HomeScreen({ handle = () => {}, today = null, hasProfile = false }) {
  const paksha = today && today.tithi !== "பௌர்ணமி" && today.tithi !== "அமாவாசை" ? (today.waxing ? "வளர்பிறை" : "தேய்பிறை") : "";

  return (
    <main className="app-shell home-v2">
      <header className="home-banner">
        <img src="/logo/home-banner.webp" alt="TOPPER ASTRO" width="1038" height="362" fetchpriority="high" decoding="async" />
      </header>

      <div className="home-body">
        {/* புதிய பயனருக்கு மட்டும்: பிறப்பு விவரம் உள்ளிட அழைப்பு (சுயவிவரம் வந்ததும் மறையும்) */}
        {!hasProfile && (
          <button className="start-card" data-home-start onClick={() => handle("newchart")}>
            <span className="start-icon"><LayoutGrid size={24} strokeWidth={1.9} /></span>
            <span className="start-copy">
              <b>உங்கள் ஜாதகத்தை உருவாக்குங்கள்</b>
              <small>பிறந்த தேதி, நேரம், இடம் — ஒரு முறை உள்ளிட்டால் போதும்</small>
            </span>
            <span className="start-go" aria-hidden="true"><ChevronRight size={19} strokeWidth={2.6} /></span>
          </button>
        )}

        {/* இன்றைய பஞ்சாங்கம் — தகவல் அட்டை; முழு நாட்காட்டிக்கு ஒரே நுழைவு */}
        {today && (
          <button className="today-card" data-home-today onClick={() => handle("calendar")}>
            <div className="today-head">
              <span className="today-icon"><CalendarDays size={25} strokeWidth={1.9} /></span>
              <span className="today-date">
                <b>இன்றைய பஞ்சாங்கம்</b>
                <small>{kizhamai(today.weekday)}, {today.greg}{today.tamil ? <> · <span style={{ whiteSpace: "nowrap" }}>{today.tamil.month} {today.tamil.day}</span></> : null}</small>
              </span>
              <span className="today-more" aria-hidden="true"><ChevronRight size={18} strokeWidth={2.4} /></span>
            </div>
            <div className="today-grid">
              <div className="today-cell">
                <Sun size={22} strokeWidth={1.8} />
                <span><small>திதி{paksha ? ` · ${paksha}` : ""}</small><b>{today.tithi}</b>{today.dp ? <i>{today.dp.tithiUntil}{today.dp.tithiNext ? ` · பின் ${today.dp.tithiNext}` : ""}</i> : null}</span>
              </div>
              <div className="today-cell">
                <Star size={22} strokeWidth={1.8} />
                <span><small>நட்சத்திரம்</small><b>{today.nakshatra}</b>{today.dp ? <i>{today.dp.nakUntil}{today.dp.nakNext ? ` · பின் ${today.dp.nakNext}` : ""}</i> : null}</span>
              </div>
              <div className="today-cell">
                <Sunrise size={22} strokeWidth={1.8} />
                <span><small>ராகு காலம்</small><b>{spaced(today.rahuKalam)}</b></span>
              </div>
              <div className="today-cell">
                <DayNightIcon width={22} height={22} />
                <span><small>உதயம் – அஸ்தமனம்</small><b>{today.sunrise} – {today.sunset}</b></span>
              </div>
            </div>
          </button>
        )}

        <section className="services-grid" aria-label="சேவைகள்">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <button className={`service-card ${service.theme}`} key={service.key} data-home-service={service.key} onClick={() => handle(service.key)}>
                <span className={`service-icon${service.wide ? " wide" : ""}`}>
                  <Icon size={30} strokeWidth={1.8} />
                </span>
                <span className="service-title">{service.title}</span>
                <span className="service-description">{service.description}</span>
              </button>
            );
          })}
        </section>
      </div>

      <div className="home-wave" aria-hidden="true">
        <div className="home-wave-art"><img src="/logo/home-wave.webp" alt="" width="1038" height="153" loading="lazy" decoding="async" /></div>
        <div className="home-wave-fill" />
      </div>

      <BottomNav active="home" onNav={handle} />
    </main>
  );
}
