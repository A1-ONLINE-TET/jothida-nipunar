import { useEffect, useState } from "react";
import {
  Heart, CalendarDays, ChevronRight, Hash, Baby, PartyPopper, Flame, LayoutGrid, Star, Sunrise, Moon, Sparkles,
  CircleCheck, Ban, Compass, Clock, Bell,
} from "lucide-react";

import "./home.css";
import BottomNav from "./BottomNav.jsx";
import { kizhamai } from "./tools-data.js";
import { useLang } from "../i18n/index.js";

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

// ── நேர உதவிகள் ("HH:MM" → நிமிடம்) ──
const toMin = (hm) => { const [h, m] = String(hm || "").split(":").map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : NaN; };
const span = (range) => { const [a, b] = String(range || "").split(/\s*[–—-]\s*/); return [toMin(a), toMin(b)]; };
const hm = (min) => { const t = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
// கௌரி பஞ்சாங்கத்தின் அடுத்தடுத்த நல்ல பாகங்களை இணைத்து, தவிர்க்க வேண்டிய நேரங்களை (ராகு காலம், எமகண்டம், குளிகை) அவற்றிலிருந்து
// கழித்து "06:11–09:03 · 10:29–11:56" என்று தரும் — "நல்ல நேரம்" பட்டியலும் "தவிர்க்க" பட்டியலும் ஒன்றுக்கொன்று முரண்படாது.
const goodSpans = (slots, avoid = []) => {
  let spans = [];
  for (const x of slots || []) {
    if (!x.good) continue;
    const a = toMin(x.from); let b = toMin(x.to); if (b <= a) b += 1440;
    const last = spans[spans.length - 1];
    if (last && (last[1] === a || last[1] === a + 1440)) last[1] = last[1] === a ? b : b + 1440; else spans.push([spans.length && a < spans[spans.length - 1][1] ? a + 1440 : a, spans.length && a < spans[spans.length - 1][1] ? b + 1440 : b]);
  }
  for (const r of avoid) {
    const [x, y] = span(r); if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    spans = spans.flatMap(([a, b]) => (y <= a || x >= b) ? [[a, b]] : [[a, Math.max(a, x)], [Math.min(b, y), b]]);
  }
  return spans.filter(([a, b]) => b - a >= 20).map(([a, b]) => `${hm(a)}–${hm(b)}`).join(" · ");
};
// இப்போது நடப்பது: ராகு காலம் / எமகண்டம் / குளிகை, இல்லையெனில் கௌரி பஞ்சாங்கத்தின் நடப்புப் பாகம்.
// L = { t, tGowri } — தேர்ந்த மொழியில் உரை.
function nowStatus(today, now, L) {
  if (!today) return null;
  const m = now.getHours() * 60 + now.getMinutes();
  for (const [key, range] of [["pan.rahu", today.rahuKalam], ["pan.yama", today.yamagandam], ["pan.kuligai", today.kuligai]]) {
    const [a, b] = span(range); if (m >= a && m < b) return { good: false, text: L.t("now.in", { x: L.t(key) }), until: String(range).split(/[–—-]/)[1].trim() };
  }
  // உதயத்துக்கு முன் = முந்தைய நாளின் இரவுப் பாகம் (இங்கே இல்லை) — அப்போது எதுவும் காட்டுவதில்லை.
  if (m < toMin(today.sunrise)) return null;
  for (const x of [...(today.gowri?.day || []), ...(today.gowri?.night || [])]) {
    const a = toMin(x.from); let b = toMin(x.to); if (b <= a) b += 1440;
    if (m >= a && m < b) return { good: x.good, text: L.t(x.good ? "now.good" : "now.avoid", { x: L.tGowri(x.ta) }), until: x.to };
  }
  return null;
}

// முகப்பில் ஒவ்வொரு சேவையும் ஒரே ஒரு இடத்தில்:
//   • கீழ்ப்பட்டை — தினப்பலன், ஜாதகம், ஆலோசனை, கணக்கு (இவை முகப்பில் மீண்டும் வராது)
//   • "இன்று" அட்டை — பஞ்சாங்கத் தகவல்; தட்டினால் முழுப் பஞ்சாங்கம் (அதற்குத் தனி ஓடு இல்லை)
//   • கீழுள்ள 6 ஓடுகள் — வேறெங்கும் இல்லாத சேவைகள்
// ஓடு வரிசை — தலைப்பு/விளக்கம் t() வழியே (svc.<key>.t / .d)
const services = [
  { key: "rasi",       icon: ZodiacIcon,  theme: "green", wide: true },
  { key: "porutham",   icon: Heart,       theme: "rose" },
  { key: "numerology", icon: Hash,        theme: "purple" },
  { key: "names",      icon: Baby,        theme: "peach" },
  { key: "festivals",  icon: PartyPopper, theme: "yellow" },
  { key: "navagraha",  icon: Flame,       theme: "blue" },
];

const spaced = (s) => String(s || "").replace(/\s*[–—-]\s*/, " – ");

// வடிவமைப்பு: பயனர் கொடுத்த மாதிரிப் படம் (2026-11). மேலே தலைப்புப் படம் (/logo/home-banner.webp — சின்னமும் அதிலேயே),
// பின் அட்டைகள், ஓடுகள், கீழே அலை. `name` இப்போது காட்டப்படுவதில்லை (மாதிரியில் வாழ்த்து வரி இல்லை).
export default function HomeScreen({ handle = () => {}, today = null, special = null, hasProfile = false }) {
  const { lang, t, tNak, tTithi, tYogam, tKaranam, tGowri, tRashi, tWeekday, tPhase, tDir, tMonth } = useLang();
  // "இப்போது" பட்டை நிமிடத்துக்கு ஒரு முறை புதுப்பிக்கப்படும்
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const status = nowStatus(today, now, { t, tGowri });
  const paksha = today && today.tithi !== "பௌர்ணமி" && today.tithi !== "அமாவாசை" ? tPhase(today.waxing ? "வளர்பிறை" : "தேய்பிறை") : "";
  const weekdayTxt = today ? (lang === "ta" ? kizhamai(today.weekday) : tWeekday(today.weekday)) : "";

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
              <b>{t("home.start.title")}</b>
              <small>{t("home.start.sub")}</small>
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
                <b>{t("home.today.title")}</b>
                <small>{weekdayTxt}, {today.greg}{today.tamil ? <> · <span style={{ whiteSpace: "nowrap" }}>{tMonth(today.tamil.month)} {today.tamil.day}</span></> : null}</small>
              </span>
              <span className="today-more" aria-hidden="true"><small>{t("home.calendar")}</small><ChevronRight size={16} strokeWidth={2.4} /></span>
            </div>
            {/* இன்றைய விசேஷம் + வரும் நாட்கள் (பட்டியல் கிடைத்திருந்தால் மட்டும்) */}
            {special && (special.today.length > 0 || special.upcoming.length > 0) && (
              <div className="today-special" data-home-special>
                <Bell size={17} strokeWidth={1.9} />
                <span>
                  {special.today.length > 0 && <b>{t("home.special.today", { list: special.today.join(", ") })}</b>}
                  {special.upcoming.length > 0 && <i>{special.upcoming.map((u) => `${u.when} ${u.names.join(", ")}`).join(" · ")}</i>}
                </span>
              </div>
            )}

            {/* இப்போது நடப்பது */}
            {status && (
              <div className={`today-now ${status.good ? "good" : "bad"}`} data-home-now>
                {status.good ? <CircleCheck size={17} strokeWidth={2} /> : <Ban size={17} strokeWidth={2} />}
                <b>{status.text}</b><i>{t("pan.until", { time: status.until })}</i>
              </div>
            )}

            {/* பஞ்சாங்கம்: திதி, நட்சத்திரம், யோகம், கரணம் */}
            <div className="today-grid">
              <div className="today-cell">
                <Moon size={20} strokeWidth={1.8} />
                <span><small>{t("pan.tithi")}{paksha ? ` · ${paksha}` : ""}</small><b>{tTithi(today.tithi)}</b>{today.dp ? <i>{today.dp.tithiUntil}{today.dp.tithiNext ? ` · ${t("pan.then", { x: tTithi(today.dp.tithiNext) })}` : ""}</i> : null}</span>
              </div>
              <div className="today-cell">
                <Star size={20} strokeWidth={1.8} />
                <span><small>{t("pan.nakshatra")}</small><b>{tNak(today.nakshatra)}</b>{today.dp ? <i>{today.dp.nakUntil}{today.dp.nakNext ? ` · ${t("pan.then", { x: tNak(today.dp.nakNext) })}` : ""}</i> : null}</span>
              </div>
              {today.yogam ? <div className="today-cell"><Sparkles size={20} strokeWidth={1.8} /><span><small>{t("pan.yogam")}</small><b>{tYogam(today.yogam)}</b></span></div> : null}
              {today.karanam ? <div className="today-cell"><DayNightIcon width={20} height={20} /><span><small>{t("pan.karanam")}</small><b>{tKaranam(today.karanam)}</b></span></div> : null}
            </div>

            {/* நல்ல நேரம் (பச்சை) */}
            {today.gowri && (
              <div className="today-block good" data-home-good>
                <div className="today-block-title"><CircleCheck size={16} strokeWidth={2} />{t("pan.goodTime")}</div>
                <div className="today-times"><small>{t("pan.day")}</small><b>{goodSpans(today.gowri.day, [today.rahuKalam, today.yamagandam, today.kuligai])}</b></div>
                <div className="today-times"><small>{t("pan.night")}</small><b>{goodSpans(today.gowri.night)}</b></div>
              </div>
            )}

            {/* தவிர்க்க வேண்டிய நேரம் (சிவப்பு) */}
            <div className="today-block bad" data-home-avoid>
              <div className="today-block-title"><Ban size={16} strokeWidth={2} />{t("pan.avoidTime")}</div>
              <div className="today-three">
                <span><small>{t("pan.rahu")}</small><b>{spaced(today.rahuKalam)}</b></span>
                {today.yamagandam ? <span><small>{t("pan.yama")}</small><b>{spaced(today.yamagandam)}</b></span> : null}
                {today.kuligai ? <span><small>{t("pan.kuligai")}</small><b>{spaced(today.kuligai)}</b></span> : null}
              </div>
            </div>

            {/* சூலம், சந்திராஷ்டமம், உதயம் – அஸ்தமனம் */}
            <div className="today-foot">
              {today.soolam ? <span><Compass size={16} strokeWidth={1.8} /><small>{t("pan.soolam")}</small><b>{tDir(today.soolam)}</b></span> : null}
              {today.chandrashtama ? <span><Clock size={16} strokeWidth={1.8} /><small>{t("pan.chandrashtama")}</small><b>{tRashi(today.chandrashtama)}</b></span> : null}
              <span><Sunrise size={16} strokeWidth={1.8} /><small>{t("pan.sunriseSunset")}</small><b>{today.sunrise} – {today.sunset}</b></span>
            </div>
          </button>
        )}

        <section className="services-grid" aria-label={t("home.servicesAria")}>
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <button className={`service-card ${service.theme}`} key={service.key} data-home-service={service.key} onClick={() => handle(service.key)}>
                <span className={`service-icon${service.wide ? " wide" : ""}`}>
                  <Icon size={30} strokeWidth={1.8} />
                </span>
                <span className="service-title">{t(`svc.${service.key}.t`)}</span>
                <span className="service-description">{t(`svc.${service.key}.d`)}</span>
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
