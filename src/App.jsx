import { useState, useEffect, useRef, useCallback, useMemo, lazy } from "react";
// PDF தலைப்புப் படம் (61 KB base64) — PDF உருவாக்கும்போது மட்டும் ஏற்றப்படும்.
let MURUGAN_IMG = "";
const loadPdfImage = () => MURUGAN_IMG ? Promise.resolve() : import("./murugan-b64.js").then((m) => { MURUGAN_IMG = m.MURUGAN_IMG; }).catch(() => {});
// TOPPER ASTRO logo — splash 3-layer composite (background removed, separate
// layers in public/logo/): zodiac ring + compass counter-rotate behind the
// fixed TOPPER text. Public assets → referenced by URL, not import.
const zodiacRingImg = "/logo/zodiac-ring.webp";
const compassImg = "/logo/compass.webp";
const topperTextImg = "/logo/topper-text.webp";
const logoFullImg = "/logo/logo-full.webp"; // static composite — welcome/header
const newZodiacWheelImg = "/logo/new-zodiac-wheel.webp";
const newTopperLogoImg = "/logo/new-topper-logo.webp";
import HomeScreen from "./components/HomeScreen";
// முகப்பு உடனே தேவை; மற்ற திரைகள் திறக்கும்போது ஏற்றப்படும் (முதல் திறப்பு வேகமாக).
const AdvisoryScreen = lazy(() => import("./components/AdvisoryScreen"));
const ChatScreen = lazy(() => import("./components/ChatScreen"));
import { personaFor, PERSONA_FOR_AREA } from "./components/personas.js";
import BottomNav from "./components/BottomNav.jsx";
import { kizhamai } from "./components/tools-data.js";
import { tamilCivilDate, dayPanchang } from "./components/panchang-lite.js";
const RemedyTab = lazy(() => import("./components/RemedyTab.jsx"));
const toolScreen = (name) => lazy(() => import("./components/ToolsScreens.jsx").then((m) => ({ default: m[name] })));
const RasiPalanScreen = toolScreen("RasiPalanScreen");
const NumerologyScreen = toolScreen("NumerologyScreen");
const NameLettersScreen = toolScreen("NameLettersScreen");
const FestivalsScreen = toolScreen("FestivalsScreen");
const NavagrahaScreen = toolScreen("NavagrahaScreen");
import { NAME_SYLLABLES, VARA_SOOLAM, gowriForDay } from "./components/tools-data.js";
import { NotebookPen, Share2, Users, Heart, HeartPulse, Briefcase, Coins, GraduationCap, Hourglass, ChevronRight, ChevronLeft, ChevronDown, FileText, Sparkles, Star, UserRound, Plus, Trash2, Settings, ShieldCheck } from "lucide-react";
import { apiAsk, apiAskAI, apiAskDeep } from "./api.js";
import { payThenAskPremium } from "./components/razorpay.js";

// ── FREE MODE ──────────────────────────────────────────────────────
// இப்போது எல்லாம் இலவசம். ஆழமான AI பதிலுக்கு பணம் தேவையில்லை.
// பணம் enable செய்ய வேண்டியபோது: PAYMENTS_ENABLED = true ஆக்கவும்
// (premium பட்டன் மீண்டும் Razorpay checkout-க்கு செல்லும்).
const PAYMENTS_ENABLED = false;
const APP_VERSION = "1.0.0";
// ── The proprietary interpretive engine runs ONLY in the Cloudflare
// Worker. The browser talks to it through api.js and never imports the
// engine. Public panchangam/ephemeris + trivial display helpers come from
// almanac.js (a tree-shaken client subset — see that file).
import {
  apiCompute, apiPredict, apiDaily, apiBacktest, apiEventTiming,
  apiNakBhava, apiPorutham, apiEngine, apiRasiPalan, apiMuhurtaMonth, apiAltDashas, apiRemedyPlan,
  apiRasiPeriod, apiFestivals, apiNavagraha, apiVratham,
} from "./api.js";
import { saveProfilesCloud, loadProfilesCloud, getAuthError, onUser } from "./firebase.js";
import { sendReport } from "./report.js";
import Onboarding from "./components/Onboarding.jsx";
import { getLang, hasLang, setLang as setAppLang } from "./i18n/index.js";
const AccountExtras = lazy(() => import("./components/AccountExtras.jsx"));
import { AiTextFooter } from "./components/ReportBox.jsx";
import {
  generateHoroscope, calcMuhurtham, calcInauspiciousTimes, calcTamilDate,
  calcCurrentHorai, getNakshatraLord, geocodeCity, geocodeCityAsync,
  searchPlacesOSM, resolveBirthGeo, escapeHtml,
  NAKSHATRAS, RASHIS, RASHI_EN, PLANETS, RASHI_LUCKY, AYANAMSA_SYSTEMS,
  GRAHA_FRIENDSHIP, CLASSICAL_7, EVENT_TOPICS,
} from "./almanac.js";
// The engine is server-side only; the client always talks to the Worker.
const USE_API = true;


// ═══════════════════════════════════════════════════════════════════
// ROTATING MANTRA CHAKRA
// ═══════════════════════════════════════════════════════════════════
function MantraChakra({ speed = 90, size = 500, opacity = 0.25 }) {
  const cx = 250, cy = 250;
  const NAVA_COLORS = ["#e85d26","#c0c0c0","#c0564f","#22c55e","#eab308","#ec4899","#1e3a5f","#6366f1","#a78bfa"];

  const petals = (count, r, petalW, petalH) => {
    const paths = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const a1 = angle - petalW, a2 = angle + petalW;
      const cp1x = cx + Math.cos(a1) * (r + petalH);
      const cp1y = cy + Math.sin(a1) * (r + petalH);
      const cp2x = cx + Math.cos(a2) * (r + petalH);
      const cp2y = cy + Math.sin(a2) * (r + petalH);
      const tipX = cx + Math.cos(angle) * (r + petalH * 1.35);
      const tipY = cy + Math.sin(angle) * (r + petalH * 1.35);
      paths.push(`M ${cx+Math.cos(a1)*r} ${cy+Math.sin(a1)*r} Q ${cp1x} ${cp1y} ${tipX} ${tipY} Q ${cp2x} ${cp2y} ${cx+Math.cos(a2)*r} ${cy+Math.sin(a2)*r}`);
    }
    return paths;
  };

  const triangle = (r, up) => {
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const a = (i/3)*Math.PI*2 + (up ? -Math.PI/2 : Math.PI/2);
      pts.push(`${cx+Math.cos(a)*r},${cy+Math.sin(a)*r}`);
    }
    return pts.join(" ");
  };

  const hexagon = (r) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i/6)*Math.PI*2 - Math.PI/2;
      pts.push(`${cx+Math.cos(a)*r},${cy+Math.sin(a)*r}`);
    }
    return pts.join(" ");
  };

  const zodiacSymbols = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
  const sacredChars = ["ॐ","श्री","ह्रीं","क्लीं","ऐं","सौ:","नम:","शिव","शक्ति","ह्रौं","श्रीं","ऐं"];
  const tamilSacred = ["ஓம்","ஸ்ரீ","சிவ","சக்தி","நம","ஹ்ரீம்","க்லீம்","சௌ"];

  return (
    <div style={{
      position:"fixed", top:"50%", left:"50%",
      transform:"translate(-50%,-50%)",
      width:size, height:size,
      pointerEvents:"none", zIndex:1, opacity
    }}>
      <svg viewBox="0 0 500 500" style={{
        width:"100%", height:"100%", position:"absolute",
        animation:`chakraSpin ${speed}s linear infinite`
      }}>
        <defs>
          <linearGradient id="cg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1f3f68"/><stop offset="100%" stopColor="#a9823c"/>
          </linearGradient>
          <linearGradient id="cg2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c0564f"/><stop offset="100%" stopColor="#6366f1"/>
          </linearGradient>
          <filter id="chakraGlow">
            <feGaussianBlur stdDeviation="1.5" result="g"/>
            <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <circle cx={cx} cy={cy} r="246" fill="none" stroke="#1f3f68" strokeWidth="2" opacity="0.6" />
        <circle cx={cx} cy={cy} r="242" fill="none" stroke="#a9823c" strokeWidth="1" opacity="0.5" />
        <circle cx={cx} cy={cy} r="238" fill="none" stroke="#1e3a5f" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.4" />

        {zodiacSymbols.map((z, i) => {
          const a = (i/12)*Math.PI*2 - Math.PI/2;
          const col = ["#1f3f68","#a9823c","#c0564f","#22c55e","#eab308","#6366f1","#ec4899","#1e3a5f","#e85d26","#22c55e","#6366f1","#a9823c"][i];
          return (
            <text key={i} x={cx+Math.cos(a)*228} y={cy+Math.sin(a)*228+5}
              textAnchor="middle" fill={col} fontSize="16" opacity="0.85"
              fontWeight="bold" filter="url(#chakraGlow)">{z}</text>
          );
        })}

        <circle cx={cx} cy={cy} r="215" fill="none" stroke="#1f3f68" strokeWidth="0.6" strokeDasharray="2 6" opacity="0.35" />

        {petals(16, 172, 0.12, 32).map((d, i) => (
          <path key={`p1${i}`} d={d} fill="none" stroke={NAVA_COLORS[i%9]} strokeWidth="1.4" opacity="0.5" />
        ))}

        <circle cx={cx} cy={cy} r="172" fill="none" stroke="#1f3f68" strokeWidth="1" opacity="0.4" />

        {petals(8, 132, 0.2, 36).map((d, i) => (
          <path key={`p2${i}`} d={d} fill="none" stroke="url(#cg2)" strokeWidth="1.5" opacity="0.5" />
        ))}

        {sacredChars.map((ch, i) => {
          const a = (i/12)*Math.PI*2 - Math.PI/2;
          return (
            <text key={`sc${i}`} x={cx+Math.cos(a)*157} y={cy+Math.sin(a)*157+4}
              textAnchor="middle" fill="#1f3f68" fontSize="11" opacity="0.5"
              fontFamily="serif" fontWeight="bold">{ch}</text>
          );
        })}

        {[192, 172, 132, 100, 70, 45, 25].map((r, i) => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none"
            stroke={["#1f3f68","#a9823c","#c0564f","#1e3a5f","#6366f1","#22c55e","#eab308"][i]} strokeWidth={i<2?"1":"0.7"}
            opacity={0.35-i*0.03} />
        ))}

        <polygon points={hexagon(150)} fill="none" stroke="#a9823c" strokeWidth="0.8" opacity="0.35" />
        <polygon points={hexagon(100)} fill="none" stroke="#1f3f68" strokeWidth="0.7" opacity="0.3" />

        <polygon points={triangle(118, true)} fill="none" stroke="#1f3f68" strokeWidth="1.8" opacity="0.6" filter="url(#chakraGlow)" />
        <polygon points={triangle(118, false)} fill="none" stroke="#1e3a5f" strokeWidth="1.8" opacity="0.55" filter="url(#chakraGlow)" />
        <polygon points={triangle(90, true)} fill="none" stroke="#c0564f" strokeWidth="1.4" opacity="0.45" />
        <polygon points={triangle(90, false)} fill="none" stroke="#6366f1" strokeWidth="1.4" opacity="0.45" />
        <polygon points={triangle(62, true)} fill="none" stroke="#a9823c" strokeWidth="1.2" opacity="0.4" />
        <polygon points={triangle(62, false)} fill="none" stroke="#22c55e" strokeWidth="1.2" opacity="0.4" />

        {Array.from({ length: 36 }, (_, i) => {
          const a = (i/36)*Math.PI*2;
          const outer = i%3===0 ? 215 : i%3===1 ? 192 : 172;
          return (
            <line key={`rl${i}`}
              x1={cx+Math.cos(a)*45} y1={cy+Math.sin(a)*45}
              x2={cx+Math.cos(a)*outer} y2={cy+Math.sin(a)*outer}
              stroke={NAVA_COLORS[i%9]} strokeWidth={i%3===0?"0.6":"0.3"}
              opacity={i%3===0?0.3:0.15} />
          );
        })}

        {Array.from({ length: 9 }, (_, i) => {
          const a = (i/9)*Math.PI*2;
          return (
            <circle key={`dot${i}`} cx={cx+Math.cos(a)*215} cy={cy+Math.sin(a)*215}
              r="3" fill={NAVA_COLORS[i]} opacity="0.7" filter="url(#chakraGlow)" />
          );
        })}

        <circle cx={cx} cy={cy} r="8" fill="#a9823c" opacity="0.5" filter="url(#chakraGlow)">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r="4" fill="#1f3f68" opacity="0.8">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r="1.5" fill="#fff" opacity="0.9" />
      </svg>

      <svg viewBox="0 0 500 500" style={{
        width:"100%", height:"100%", position:"absolute", top:0, left:0,
        animation:`chakraSpinReverse ${speed*0.65}s linear infinite`
      }}>
        {petals(12, 58, 0.18, 28).map((d, i) => (
          <path key={`ip${i}`} d={d} fill="none" stroke={NAVA_COLORS[i%9]} strokeWidth="1.2" opacity="0.45" />
        ))}
        {PLANETS.map((p, i) => {
          const a = (i/9)*Math.PI*2 - Math.PI/2;
          return (
            <text key={`ng${i}`} x={cx+Math.cos(a)*105} y={cy+Math.sin(a)*105+6}
              textAnchor="middle" fill={NAVA_COLORS[i%9]} fontSize="18" opacity="0.7"
              fontWeight="bold">{p.symbol}</text>
          );
        })}
        {tamilSacred.map((ch, i) => {
          const a = (i/8)*Math.PI*2 - Math.PI/2;
          return (
            <text key={`ts${i}`} x={cx+Math.cos(a)*78} y={cy+Math.sin(a)*78+4}
              textAnchor="middle" fill="#1f3f68" fontSize="10" opacity="0.5"
              fontFamily="'Noto Sans Tamil',sans-serif">{ch}</text>
          );
        })}
      </svg>

      <svg viewBox="0 0 500 500" style={{
        width:"100%", height:"100%", position:"absolute", top:0, left:0,
        animation:`chakraSpin ${speed*0.4}s linear infinite`
      }}>
        <circle cx={cx} cy={cy} r="18" fill="none" stroke="#1f3f68" strokeWidth="0.6"
          strokeDasharray="2 3" opacity="0.4" />
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i/9)*Math.PI*2;
          return <circle key={`md${i}`} cx={cx+Math.cos(a)*15} cy={cy+Math.sin(a)*15}
            r="1.2" fill={NAVA_COLORS[i]} opacity="0.6" />;
        })}
      </svg>

      <style>{`
        @keyframes chakraSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes chakraSpinReverse { from { transform:rotate(360deg); } to { transform:rotate(0deg); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// South Indian Rashi Chart
// ═══════════════════════════════════════════════════════════════════
// Short names for chart cells (2-3 chars max like reference)
const P_SHORT = {"சூரியன்":"சூ","சந்திரன்":"சந்","செவ்வாய்":"செவ்","புதன்":"புத","குரு":"கு","சுக்கிரன்":"சுக்","சனி":"சனி","ராகு":"ராகு","கேது":"கேது"};

// Nakshatra abbreviations — index-aligned with NAKSHATRAS (all 27 distinct)
const NAK_SHORT = [
  "அசு","பர","கார்","ரோ","மிரு",
  "திரு","புன","பூச","ஆயி","மக",
  "பூர","உத்","அஸ்","சித்","சுவா",
  "விசா","அனு","கேட்","மூல","பூரா",
  "உத்தி","ஓண","அவி","சத",
  "பூரட்","உத்ரட்","ரேவ"
];
// "கார்-3" style label for a planet's nakshatra + pada (empty if unknown)
function nakPadaLabel(p) {
  const i = (p.nakIdx >= 0 && p.nakIdx < 27) ? p.nakIdx : NAKSHATRAS.indexOf(p.nakshatraTa);
  if (i < 0 || !p.nakshatraTa) return "";
  return `${NAK_SHORT[i]}${p.pada ? "-" + p.pada : ""}`;
}

// Generate chart SVG as raw string (for PDF)
function chartSVGString(planetList, lagnaIdx, chartTitle, isNavamsa=false) {
  const cW=80,cH=68,W=cW*4,H=cH*4;
  const siPos=[{r:11,row:0,col:0},{r:0,row:0,col:1},{r:1,row:0,col:2},{r:2,row:0,col:3},{r:10,row:1,col:0},{r:3,row:1,col:3},{r:9,row:2,col:0},{r:4,row:2,col:3},{r:8,row:3,col:0},{r:7,row:3,col:1},{r:6,row:3,col:2},{r:5,row:3,col:3}];
  const rp={};
  planetList.forEach(p=>{
    const ri=isNavamsa?(p.navRashiIdx??RASHIS.indexOf(p.navRashi)):RASHIS.indexOf(p.rashi);
    if(ri>=0){if(!rp[ri])rp[ri]=[];rp[ri].push(p);}
  });
  const mR=isNavamsa?(planetList[1]?.navRashiIdx??0):planetList.findIndex(p=>p.ta==="சந்திரன்")>=0?RASHIS.indexOf(planetList.find(p=>p.ta==="சந்திரன்")?.rashi||RASHIS[0]):0;

  let cells="";
  siPos.forEach(({r:rashi,row,col})=>{
    const x=col*cW,y=row*cH,isL=rashi===lagnaIdx;
    const planets=rp[rashi]||[];
    // Center-aligned planet names; shrink rows on stellium
    const rowH=planets.length>4?Math.max(10,(cH-6)/planets.length):14;
    const totalH=planets.length*rowH;
    const startY=y+(cH-totalH)/2;
    planets.forEach((p,pi)=>{
      const shortN=P_SHORT[p.ta]||p.ta.slice(0,3);
      const nak=!isNavamsa?nakPadaLabel(p):"";
      const nakT=nak?`<tspan dx="2" font-size="6.5" font-weight="400" fill="#555">${nak}</tspan>`:"";
      cells+=`<text x="${x+cW/2}" y="${startY+pi*rowH+10}" text-anchor="middle" fill="#000" font-size="10" font-weight="600" font-family="'Noto Sans Tamil',sans-serif">${shortN}${nakT}</text>`;
    });
    if(isL) cells+=`<text x="${x+cW/2}" y="${y+cH-4}" text-anchor="middle" fill="#cc0000" font-size="10" font-weight="900" font-family="sans-serif">லக்</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${W+4} ${H+4}" width="${W+4}" height="${H+4}" style="background:#fff">
    <rect x="-1" y="-1" width="${W+2}" height="${H+2}" fill="none" stroke="#1a8d1a" stroke-width="3"/>
    <rect x="2" y="2" width="${W-4}" height="${H-4}" fill="none" stroke="#1a8d1a" stroke-width="1"/>
    ${[1,2,3].map(i=>`<line x1="${cW*i}" y1="0" x2="${cW*i}" y2="${H}" stroke="#1a8d1a" stroke-width="1.5"/><line x1="0" y1="${cH*i}" x2="${W}" y2="${cH*i}" stroke="#1a8d1a" stroke-width="1.5"/>`).join("")}
    <rect x="${cW}" y="${cH}" width="${cW*2}" height="${cH*2}" fill="#fff" stroke="#1a8d1a" stroke-width="1.5"/>
    <text x="${W/2}" y="${H/2-8}" text-anchor="middle" fill="#000" font-size="12" font-weight="700" font-family="'Noto Sans Tamil',sans-serif">${chartTitle}</text>
    <text x="${W/2}" y="${H/2+10}" text-anchor="middle" fill="#000" font-size="14" font-weight="900" font-family="'Noto Sans Tamil',serif">${RASHIS[mR>=0?mR:0]}</text>
    ${cells}
  </svg>`;
}

function TraditionalChart({ horoscope, navamsaData, title="ராசி", showNavamsa=true, gulika=null, north=false }) {
  const { lagna, placements } = horoscope;

  // ── வட இந்திய (வைர) கட்டம் — வீடுகள் நிலையானவை: 1ஆம் வீடு (லக்னம்) மேல் நடு,
  //    பின் இடஞ்சுழியாக 2…12. ஒவ்வொரு வீட்டிலும் அதன் ராசி எண் (1 = மேஷம்). ──
  const renderNorth = (planetList, lagnaIdx, chartTitle, isNavamsa=false) => {
    const S = 288, q = S/4, h = S/2;
    const byHouse = {};
    planetList.forEach(p => {
      const ri = isNavamsa ? (p.navRashiIdx ?? RASHIS.indexOf(p.navRashi)) : RASHIS.indexOf(p.rashi);
      if (ri >= 0) { const hs = ((ri - lagnaIdx + 12) % 12) + 1; (byHouse[hs] ||= []).push(P_SHORT[p.ta] || p.ta.slice(0,3)); }
    });
    // [கிரகங்கள் மையம் x,y] [ராசி எண் x,y] — வீடு 1..12
    const POS = [
      null,
      [h, q - 6,        h, h - 16],
      [q, S*0.085,      q, q - 9],
      [S*0.085, q,      q - 13, q + 4],
      [q, h - 4,        h - 20, h + 4],
      [S*0.085, 3*q,    q - 13, 3*q + 4],
      [q, S*0.915,      q, 3*q + 16],
      [h, 3*q + 2,      h, h + 24],
      [3*q, S*0.915,    3*q, 3*q + 16],
      [S*0.915, 3*q,    3*q + 13, 3*q + 4],
      [3*q, h - 4,      h + 20, h + 4],
      [S*0.915, q,      3*q + 13, q + 4],
      [3*q, S*0.085,    3*q, q - 9],
    ];
    const kendra = (n) => n === 1 || n === 4 || n === 7 || n === 10;
    return (
      <svg data-north-chart viewBox={`-2 -2 ${S+4} ${S+24}`} style={{width:"100%",maxWidth:340,background:"#fff",borderRadius:4}}>
        <rect x="0" y="0" width={S} height={S} fill="none" stroke="#35598c" strokeWidth="2.5"/>
        <line x1="0" y1="0" x2={S} y2={S} stroke="#35598c" strokeWidth="1.2"/>
        <line x1={S} y1="0" x2="0" y2={S} stroke="#35598c" strokeWidth="1.2"/>
        <polygon points={`${h},0 ${S},${h} ${h},${S} 0,${h}`} fill="none" stroke="#35598c" strokeWidth="1.2"/>
        {POS.map((ps, n) => {
          if (!ps) return null;
          const [px, py, nx, ny] = ps;
          const list = byHouse[n] || [];
          const per = kendra(n) ? 2 : (n === 3 || n === 5 || n === 9 || n === 11) ? 1 : 2; // ஒரு வரியில் எத்தனை
          const lines = []; for (let i = 0; i < list.length; i += per) lines.push(list.slice(i, i + per).join(" "));
          const lh = 11, y0 = py - ((lines.length - 1) * lh) / 2 + 3;
          return (
            <g key={n}>
              <text x={nx} y={ny} textAnchor="middle" fill="#a9823c" fontSize="10" fontWeight="700" fontFamily="sans-serif">{((lagnaIdx + n - 1) % 12) + 1}</text>
              {lines.map((t, i) => (
                <text key={i} x={px} y={y0 + i*lh} textAnchor="middle" fill="#000" fontSize={lines.length > 3 ? 9.8 : 10.5} fontWeight="700" fontFamily="'Noto Sans Tamil',sans-serif">{t}</text>
              ))}
              {n === 1 && <text x={h} y={q - 28} textAnchor="middle" fill="#c0564f" fontSize="10" fontWeight="900" fontFamily="'Noto Sans Tamil',sans-serif">லக்</text>}
            </g>
          );
        })}
        <text x={h} y={S + 16} textAnchor="middle" fill="#1f3f68" fontSize="11" fontWeight="700" fontFamily="'Noto Sans Tamil',sans-serif">{chartTitle} — லக்னம் {RASHIS[lagnaIdx]} ({lagnaIdx + 1})</text>
      </svg>
    );
  };
  const siPos = [
    {rashi:11,r:0,c:0},{rashi:0,r:0,c:1},{rashi:1,r:0,c:2},{rashi:2,r:0,c:3},
    {rashi:10,r:1,c:0},{rashi:3,r:1,c:3},{rashi:9,r:2,c:0},{rashi:4,r:2,c:3},
    {rashi:8,r:3,c:0},{rashi:7,r:3,c:1},{rashi:6,r:3,c:2},{rashi:5,r:3,c:3}
  ];

  const renderChart = (planetList, lagnaIdx, chartTitle, isNavamsa=false) => {
    const cW=72, cH=60, W=cW*4, H=cH*4;
    const rashiPlanets = {};
    planetList.forEach(p => {
      const ri = isNavamsa ? (p.navRashiIdx ?? RASHIS.indexOf(p.navRashi)) : RASHIS.indexOf(p.rashi);
      if(ri>=0){ if(!rashiPlanets[ri]) rashiPlanets[ri]=[]; rashiPlanets[ri].push(p); }
    });

    const moonRashi = isNavamsa
      ? (planetList[1]?.navRashiIdx ?? 0)
      : RASHIS.indexOf(horoscope.moonRashi);

    return (
      <svg viewBox={`-2 -2 ${W+4} ${H+4}`} style={{width:"100%",maxWidth:340,background:"#fff",borderRadius:4}}>
        <rect x="-1" y="-1" width={W+2} height={H+2} fill="none" stroke="#35598c" strokeWidth="3"/>
        <rect x="2" y="2" width={W-4} height={H-4} fill="none" stroke="#35598c" strokeWidth="1"/>
        {[1,2,3].map(i=>(
          <g key={i}>
            <line x1={cW*i} y1={0} x2={cW*i} y2={H} stroke="#35598c" strokeWidth="1.5"/>
            <line x1={0} y1={cH*i} x2={W} y2={cH*i} stroke="#35598c" strokeWidth="1.5"/>
          </g>
        ))}
        <rect x={cW} y={cH} width={cW*2} height={cH*2} fill="#fff" stroke="#35598c" strokeWidth="1.5"/>
        <text x={W/2} y={H/2-8} textAnchor="middle" fill="#000" fontSize="12" fontWeight="700"
          fontFamily="'Noto Sans Tamil',sans-serif">{chartTitle}</text>
        <text x={W/2} y={H/2+8} textAnchor="middle" fill="#000" fontSize="14" fontWeight="900"
          fontFamily="'Noto Sans Tamil',serif">{RASHIS[moonRashi>=0?moonRashi:0]}</text>

        {siPos.map(({rashi,r,c})=>{
          const x=c*cW, y=r*cH;
          const isL = rashi === lagnaIdx;
          const planets = rashiPlanets[rashi] || [];
          // Center-align: calculate vertical start position
          // Shrink row height when a stellium would overflow the box
          const rowH = planets.length > 4 ? Math.max(11, (cH - 14) / planets.length) : 14.5;
          const totalH = planets.length * rowH;
          const startY = y + (cH - totalH) / 2;
          return (
            <g key={rashi}>
              {planets.map((p,pi)=>{
                const shortN = P_SHORT[p.ta] || p.ta.slice(0,3);
                // Nakshatra-pada beside planet (rasi chart only —
                // nakshatra belongs to the natal longitude, not navamsa)
                return(
                  <text key={pi}
                    x={x + cW/2}
                    y={startY + pi*rowH + 10}
                    textAnchor="middle"
                    fill="#16304f" fontSize={planets.length > 4 ? 10 : 11} fontWeight="700"
                    fontFamily="'Noto Sans Tamil',sans-serif">
                    {shortN}
                  </text>
                );
              })}
              {isL && (
                <text x={x+cW/2} y={y+cH-4} textAnchor="middle"
                  fill="#c0564f" fontSize="10.5" fontWeight="900"
                  fontFamily="'Noto Sans Tamil',sans-serif">லக்</text>
              )}
              {/* குளிகன் — சனியின் காலப்பகுதி லக்னம் (ராசி chart மட்டும்) */}
              {!isNavamsa && gulika != null && rashi === gulika && (
                <text x={x+4} y={y+12} textAnchor="start"
                  fill="#76819a" fontSize="9.8" fontWeight="700"
                  fontFamily="'Noto Sans Tamil',sans-serif">குளி</text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  const navLagna = navamsaData
    ? (() => {
        // கிரகங்களின் அதே formula: (rashi×9 + part) % 12 — முன்பு இங்கு
        // பழைய தவறான "movable→மேஷம்" scheme இருந்து 12-இல் 9 லக்னங்களுக்கு
        // navamsa லக்னம் தவறாக வந்தது. lagnaFullLong-இலிருந்து பின்ன டிகிரி.
        const lDegExact = horoscope.lagnaFullLong != null
          ? horoscope.lagnaFullLong % 30
          : (horoscope.lagnaDeg || 0);
        const navPart = Math.min(8, Math.floor(lDegExact / (30/9)));
        return (lagna * 9 + navPart) % 12;
      })()
    : 0;

  return (
    <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
      <div style={{flex:"1 1 auto",maxWidth:300,minWidth:200}}>
        {north ? renderNorth(placements, lagna, "ராசி") : renderChart(placements, lagna, "ராசி")}
      </div>
      {showNavamsa && navamsaData && (
        <div style={{flex:"1 1 auto",maxWidth:300,minWidth:200}}>
          {north ? renderNorth(navamsaData, navLagna, "நவாம்சம்", true) : renderChart(navamsaData, navLagna, "நவாம்சம்", true)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// DATE HELPERS — dd-mm-yyyy format input
// ═══════════════════════════════════════════════════════════════════
// Auto-format as user types: "2" → "2", "25" → "25-", "25-1" → "25-1", "25-12" → "25-12-", etc.
function formatDateInput(raw) {
  let digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += ".";
    out += digits[i];
  }
  return out; // e.g. "25.12.1990"
}

// Auto-format as user types: "0" → "0", "06" → "06", "063" → "06:3", "0630" → "06:30"
// Clamps hour to 1-12 and minute to 0-59 once both digits of that segment are entered.
function formatTimeInput(raw) {
  let digits = raw.replace(/\D/g, "").slice(0, 4); // max 4 digits: hhmm
  let hh = digits.slice(0, 2), mm = digits.slice(2, 4);
  if (hh.length === 2) {
    let hNum = parseInt(hh, 10);
    if (hNum > 12) hh = "12";
    else if (hNum === 0) hh = "01";
  }
  if (mm.length === 2) {
    let mNum = parseInt(mm, 10);
    if (mNum > 59) mm = "59";
  }
  let out = hh;
  for (let i = 0; i < mm.length; i++) {
    if (i === 0) out += ":";
    out += mm[i];
  }
  return out; // e.g. "06:30"
}

// Convert dd-mm-yyyy or dd.mm.yyyy → YYYY-MM-DD (ISO) for engine calculations
function parseDDMMYYYY(str) {
  if (!str) return "";
  const parts = str.split(/[-./]/);
  if (parts.length !== 3 || parts[2].length !== 4) return "";
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
}

// Validate: is it a complete dd-mm-yyyy with reasonable values?
function isValidDDMMYYYY(str) {
  if (!str || str.length !== 10) return false;
  const iso = parseDDMMYYYY(str);
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100;
}

// ═══════════════════════════════════════════════════════════════════
// சேமித்த ஜாதகங்கள் (SAVED PROFILES) — localStorage-இல் பிறப்பு விவரங்கள்.
// ஜாதகம் உருவாக்கும்போது தானாக சேமிக்கப்படும்; அடுத்த முறை ஒரே தட்டில்
// மீண்டும் திறக்கலாம் (குடும்பம் முழுவதற்கும் — 20 வரை).
// localStorage private-mode/blocked நிலைகளில் throw ஆகலாம் — எல்லா
// அணுகலும் try/catch-இல்; கிடைக்காவிட்டால் வசதி மட்டும் மறையும், app இயங்கும்.
// ═══════════════════════════════════════════════════════════════════
const PROFILES_KEY = "jn_profiles_v2";
function loadProfiles() {
  try {
    const arr = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function persistProfiles(list) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable — skip */ }
}

// பின்நோக்கு சரிபார்ப்பு பதிவுகள் — accuracy சேமிப்பு (World No.1 அளவீடு:
// எத்தனை உண்மை நிகழ்வுகளை engine சரியாக அடையாளம் காட்டியது)
const BACKTESTS_KEY = "jn_backtests_v1";
function loadBacktests() {
  try { const a = JSON.parse(localStorage.getItem(BACKTESTS_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function persistBacktests(list) {
  try { localStorage.setItem(BACKTESTS_KEY, JSON.stringify(list)); } catch (e) { /* skip */ }
}

// முதல்-முறை onboarding flag — first-time user-க்கு மட்டும் Welcome காட்ட.
// localStorage private-mode/blocked நிலைகளில் throw ஆகலாம் → try/catch.
const ONBOARD_KEY = "jn_onboarded_v2";
function isOnboarded() {
  try { return localStorage.getItem(ONBOARD_KEY) === "1"; } catch (e) { return false; }
}
function markOnboarded() {
  try { localStorage.setItem(ONBOARD_KEY, "1"); } catch (e) { /* storage unavailable — skip */ }
}

const SCREEN = { SPLASH:0, AUTH:1, FORM:2, LOADING:3, RESULT:4, PREMIUM:5, PORUTHAM:6, DAILY:7, CALENDAR:8, HOME:9, WELCOME:10, CHAT:11, ADVISORY:12, ONBOARD:20, ACCOUNT:13, SERVICES:14, RASI:15, NUMEROLOGY:16, NAMES:17, FESTIVALS:18, NAVAGRAHA:19 };

// முகப்பு கேள்வி அட்டைகள் — தட்டினால் FORM → ஜாதகம் → அந்தப் பகுதிக்கு நேரடி
const HOME_QUESTIONS = [
  { key:"marriage",  icon:"💒", q:"திருமணம் எப்போது?",  sub:"காலம் · துணை · வாழ்க்கை", topic:"marriage" },
  { key:"career",    icon:"💼", q:"தொழில் / வேலை?",       sub:"உயர்வு · துறை · காலம்",   topic:"career" },
  { key:"health",    icon:"🏥", q:"ஆரோக்கியம்?",          sub:"நோய் · தோஷம் · கவனம்",   topic:"health" },
  { key:"wealth",    icon:"💰", q:"செல்வ வளர்ச்சி?",       sub:"லாபம் · சேமிப்பு · யோகம்", topic:"wealth" },
  { key:"porutham",  icon:"💍", q:"திருமணப் பொருத்தம்",   sub:"10 பொருத்தம் · தசை",     nav:"PORUTHAM" },
  { key:"full",      icon:"📜", q:"முழு ஜாதகம்",           sub:"சக்கரம் · தசை · பலன்கள்", nav:"FORM" },
];

// ═══════════════════════════════════════════════════════════════════
// DISPLAY HELPERS — காட்சிக்கு மட்டும் (engine output மாறாது)
// ═══════════════════════════════════════════════════════════════════
const stripEmoji = (t) => String(t ?? "").replace(/[\p{Extended_Pictographic}️‍]/gu, "").replace(/[ \t]{2,}/g, " ").trim();
const TA_WORDS = [[/\btransit\b/g, "கோசாரம்"], [/\bfactors\b/g, "காரணிகள்"], [/\bclassical\b/g, "பாரம்பரிய"], [/\bchronic\b/g, "நீண்டகால"], [/BPHS உறுதிப்பாடு/g, "சாஸ்திர உறுதிப்பாடு"]];
const taText = (t) => TA_WORDS.reduce((x, [re, to]) => x.replace(re, to), stripEmoji(t));
// பகிர் — கைபேசியில் system share sheet; இல்லையேல் WhatsApp
const shareOut = (title, text) => {
  try {
    if (navigator.share) { navigator.share({ title, text }).catch(() => {}); return; }
  } catch (_) { /* fall through */ }
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
};
// engine தரும் கடும் நிறங்களை அமைதியான மூன்று பொருள்-நிறங்களாக்கு
const calmTone = (c) => { const k = String(c || "").toLowerCase(); return k === "#0d7a30" ? "#2e7d5b" : k === "#cc1a1a" ? "#c0564f" : k === "#b8860b" ? "#a9823c" : (c || "#27303f"); };
const fmtDateTa = (d) => d ? new Date(d).toLocaleDateString("ta-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
// பிறந்த இடத்தின் நேர மண்டலம் (IANA பெயர்) — "" = இந்தியா. Offset-ஐ server கணக்கிடும்
// (கோடைக்கால நேரம், வரலாற்று மாற்றங்கள் உட்பட); இங்கே பெயர் மட்டும்.
const BIRTH_ZONES = [
  ["", "இந்தியா"], ["Asia/Colombo", "இலங்கை"], ["Asia/Singapore", "சிங்கப்பூர்"], ["Asia/Kuala_Lumpur", "மலேசியா"],
  ["Asia/Dubai", "ஐக்கிய அரபு அமீரகம் / ஓமன்"], ["Asia/Riyadh", "சவுதி / குவைத் / கத்தார் / பஹ்ரைன்"],
  ["Europe/London", "இங்கிலாந்து / அயர்லாந்து"], ["Europe/Paris", "மத்திய ஐரோப்பா (பிரான்ஸ், ஜெர்மனி, சுவிஸ், நார்வே…)"],
  ["America/New_York", "அமெரிக்கா / கனடா — கிழக்கு"], ["America/Chicago", "அமெரிக்கா / கனடா — மத்திய"],
  ["America/Denver", "அமெரிக்கா / கனடா — மலைப்பகுதி"], ["America/Los_Angeles", "அமெரிக்கா / கனடா — மேற்கு"],
  ["Australia/Sydney", "ஆஸ்திரேலியா — சிட்னி / மெல்போர்ன்"], ["Australia/Brisbane", "ஆஸ்திரேலியா — பிரிஸ்பேன்"],
  ["Australia/Adelaide", "ஆஸ்திரேலியா — அடிலெய்ட்"], ["Australia/Perth", "ஆஸ்திரேலியா — பெர்த்"],
  ["Pacific/Auckland", "நியூசிலாந்து"], ["Africa/Johannesburg", "தென்னாப்பிரிக்கா"], ["Indian/Mauritius", "மொரிஷியஸ்"],
  ["Asia/Hong_Kong", "ஹாங்காங்"], ["Asia/Tokyo", "ஜப்பான்"], ["Asia/Bangkok", "தாய்லாந்து / வியட்நாம்"],
  ["Asia/Yangon", "மியான்மர்"], ["Asia/Kathmandu", "நேபாளம்"], ["Asia/Dhaka", "வங்கதேசம்"], ["Asia/Karachi", "பாகிஸ்தான்"],
];
const ZONE_BY_COUNTRY = {
  in: "", lk: "Asia/Colombo", sg: "Asia/Singapore", my: "Asia/Kuala_Lumpur", ae: "Asia/Dubai", om: "Asia/Dubai",
  sa: "Asia/Riyadh", kw: "Asia/Riyadh", qa: "Asia/Riyadh", bh: "Asia/Riyadh", gb: "Europe/London", ie: "Europe/London",
  fr: "Europe/Paris", de: "Europe/Paris", ch: "Europe/Paris", it: "Europe/Paris", nl: "Europe/Paris", be: "Europe/Paris",
  es: "Europe/Paris", no: "Europe/Paris", se: "Europe/Paris", dk: "Europe/Paris", at: "Europe/Paris",
  nz: "Pacific/Auckland", za: "Africa/Johannesburg", mu: "Indian/Mauritius", hk: "Asia/Hong_Kong", jp: "Asia/Tokyo",
  th: "Asia/Bangkok", vn: "Asia/Bangkok", mm: "Asia/Yangon", np: "Asia/Kathmandu", bd: "Asia/Dhaka", pk: "Asia/Karachi",
};
// நாட்டுக் குறியீடு (+ பல மண்டல நாடுகளுக்குத் தீர்க்கரேகை) → மண்டலம். தெரியாவிட்டால் "" (பயனர் தேர்ந்தெடுப்பார்).
function guessBirthZone(cc, lat, lon) {
  if (!cc) return "";
  if (cc === "us" || cc === "ca") return lon > -85.5 ? "America/New_York" : lon > -101.5 ? "America/Chicago" : lon > -114.5 ? "America/Denver" : "America/Los_Angeles";
  if (cc === "au") return lon < 129 ? "Australia/Perth" : lon < 141 ? "Australia/Adelaide" : lat > -29 ? "Australia/Brisbane" : "Australia/Sydney";
  return ZONE_BY_COUNTRY[cc] ?? "";
}

// ராசிப் பெயர்ச் சுருக்கம் — அட்டவணைக் கலங்களுக்கு (எழுத்தை நடுவில் வெட்டாமல்)
const RASHI_SHORT = { "மேஷம்":"மேஷ", "ரிஷபம்":"ரிஷ", "மிதுனம்":"மிது", "கடகம்":"கட", "சிம்மம்":"சிம்", "கன்னி":"கன்", "துலாம்":"துலா", "விருச்சிகம்":"விரு", "தனுசு":"தனு", "மகரம்":"மக", "கும்பம்":"கும்", "மீனம்":"மீன" };
const rashiShort = (n) => RASHI_SHORT[n] || (n || "");
// வர்க்கச் சக்கர அட்டவணை — கிரகம் × வர்க்கங்கள்; 412px திரையில் நகர்த்தாமல் பொருந்தும்.
// cols: [[குறி, பொருள், (i)=>ராசிப் பெயர், (i)=>நிறம்?], …]
const VargaGrid = ({ names, cols }) => (
  <div className="jn-xscroll" style={{overflowX:"auto"}}>
    <table data-varga-grid style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:300}}>
      <colgroup><col style={{width:"26%"}}/>{cols.map((c,k)=>(<col key={k}/>))}</colgroup>
      <thead>
        <tr style={{borderBottom:"1px solid #e3e8f2"}}>
          <th style={{padding:"6px 2px",textAlign:"left",fontSize:12,fontWeight:700,color:"#76819a"}}>கிரகம்</th>
          {cols.map(([code, sub],k)=>(
            <th key={k} style={{padding:"6px 1px",textAlign:"center",lineHeight:1.3}}>
              <span title={sub} style={{display:"block",fontSize:11.5,fontWeight:700,color:"#1f3f68",overflowWrap:"anywhere"}}>{code}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {names.map((ta,i)=>(
          <tr key={ta} style={{borderTop:i?"1px solid #eef1f6":"none"}}>
            <td style={{padding:"8px 2px",fontSize:12.5,fontWeight:700,color:"#27303f",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ta}</td>
            {cols.map(([,,get,tone],k)=>(
              <td key={k} style={{padding:"8px 1px",textAlign:"center",fontSize:12.5,fontWeight:600,color:(tone && tone(i)) || "#27303f"}}>{rashiShort(get(i)) || "—"}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// துணைப் பக்கங்களின் "பின்" பொத்தான் — எல்லா இடத்திலும் ஒரே தோற்றம், 40px தொடு இலக்கு.
const BackLink = ({ onClick, label = "பின்" }) => (
  <button data-back onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:4,minHeight:40,padding:"0 16px 0 10px",marginBottom:12,
    background:"#ffffff",border:"1px solid #e3e8f2",borderRadius:999,color:"#1f3f68",fontSize: 13.5,fontWeight:600,cursor:"pointer"}}>
    <ChevronLeft size={18}/>{label}
  </button>
);
// engine தரும் "4:38 PM" போன்ற 12-மணி நேரங்களை நாட்காட்டி/தினப்பலன் பக்கங்களின் 24-மணி வடிவுக்கு ("16:38") மாற்று.
const to24h = (str) => String(str ?? "").replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi, (_, h, m, ap) => {
  let hh = Number(h) % 12; if (/pm/i.test(ap)) hh += 12;
  return `${String(hh).padStart(2, "0")}:${m}`;
});
// சிறு நிலைக் குறி (சுபம் / தவிர்க்க …)
const chipSm = { fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, lineHeight: 1.5, flexShrink: 0 };

// வாழ்க்கைப் பகுதி → icon + நிறம் (பலன்கள் / சுருக்கம் இரண்டிலும் ஒன்றே)
const AREA_STYLE = {
  self:      { icon: UserRound,     color: "#5565b8", tint: "#eef1fb", short: "குணநலன்" },
  wealth:    { icon: Coins,         color: "#c07a4a", tint: "#faf0e8", short: "தனம்" },
  education: { icon: GraduationCap, color: "#8a62b0", tint: "#f4eefa", short: "கல்வி" },
  health:    { icon: HeartPulse,    color: "#2e8b84", tint: "#e9f5f4", short: "ஆரோக்கியம்" },
  marriage:  { icon: Heart,         color: "#b86084", tint: "#faeef3", short: "திருமணம்" },
  career:    { icon: Briefcase,     color: "#6b9150", tint: "#f0f6ea", short: "தொழில்" },
};
// "ஆழம்" tab — 29 பகுப்பாய்வுகள், வகை வாரியாக (key = advancedView)
const DEEP_GROUPS = [
  { title: "கிரக பலம்", color: "#3e4c99", items: [
    ["grahabala", "கிரக பலம்"], ["unified", "ஒருங்கிணைந்த கிரக பலம்"], ["shadbala", "ஷட்பலம்"],
    ["navamsastrength", "நவாம்ச பலம்"], ["avasthas", "கிரக அவஸ்தைகள்"], ["bhavabala", "பாவ பலம்"],
    ["funcnature", "லக்னவாரி சுப-பாபர் / மாரக-பாதகர்"], ["planetcontext", "கிரக சூழல்"] ] },
  { title: "யோகம் & தோஷம்", color: "#53763c", items: [
    ["yogas", "யோகங்கள்"], ["kalasarpa", "கால சர்ப்ப தோஷம்"], ["chevvai", "செவ்வாய் தோஷம்"] ] },
  { title: "சக்கரங்கள் & வர்க்கங்கள்", color: "#226b66", items: [
    ["bhava", "பாவ சக்கரம்"], ["d10", "தசாம்சம் (தொழில்)"], ["divisional", "பிரிவு சக்கரங்கள்"],
    ["shodashavarga", "மேல் வர்க்கங்கள்"], ["ashtakavarga", "சர்வாஷ்டகவர்க்கம்"], ["drishti", "கிரக திருஷ்டி (பார்வை)"] ] },
  { title: "காலக்கணிப்பு", color: "#9d5f38", items: [
    ["eventtiming", "வாழ்க்கை நிகழ்வு காலக்கணிப்பு"], ["sequence", "வரிசை-நிபந்தனை பலன்கள்"],
    ["nakbhava", "நட்சத்திர-பாவக இணைப்பு"], ["transitoverlay", "கோசாரம்"], ["saniguru", "சனி-குரு பெயர்ச்சி பலன்"],
    ["varshaphala", "வர்ஷபலன் (ஆண்டு ஜாதகம்)"], ["backtest", "பின்நோக்கு சரிபார்ப்பு"] ] },
  { title: "சிறப்பு முறைகள்", color: "#6f4c92", items: [
    ["jaimini", "ஜைமினி முறை"], ["prashna", "பிரஸ்னம் (இப்போதைய கேள்வி)"] ] },
  { title: "நாள் & பரிகாரம்", color: "#99496a", items: [
    ["rahukalam", "ராகு காலம் / எமகண்டம் / குளிகை"], ["muhurtha", "முஹூர்த்தம் (சுப நேரம்)"], ["remedies", "கிரக வழிபாட்டு அட்டவணை"] ] },
];

export default function AstrologyApp() {
  const [screen, setScreen] = useState(SCREEN.SPLASH);
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name:"", phone:"", dob:"", tob:"", sec:"", pob:"", ampm:"AM", gender:"", pobLat:null, pobLon:null, pobSource:null, pobTz:"" });
  // சேமித்த ஜாதகங்கள் — lazy initializer: localStorage read ஒருமுறை மட்டும்
  const [profiles, setProfiles] = useState(loadProfiles);
  const [chatInitialQ, setChatInitialQ] = useState(""); // ஆலோசனை தலைப்பிலிருந்து chat-க்கு auto கேள்வி
  const [chatPersona, setChatPersona] = useState("general"); // அரட்டையில் உள்ள AI உதவியாளர் (personas.js key)
  const [chatFrom, setChatFrom] = useState("advisory");      // அரட்டை எங்கிருந்து திறந்தது — "பின்" அங்கேயே திரும்பும்

  // ஜாதகம் வெற்றிகரமாக உருவானதும் அழைக்கப்படும் — அதே நபர் (பெயர்+தேதி+நேரம்)
  // ஏற்கனவே இருந்தால் புதுப்பிக்கும்; இல்லையேல் பட்டியலின் முதலில் சேர்க்கும்.
  const saveCurrentProfile = () => {
    if (!formData.name || !formData.dob) return;
    setProfiles(prev => {
      const same = (p) => p.name === formData.name && p.dob === formData.dob && p.tob === formData.tob && p.ampm === formData.ampm;
      const old = prev.find(same);
      const rest = prev.filter(p => !same(p));
      const entry = {
        id: old?.id || Date.now(), notes: old?.notes || "",
        name: formData.name, phone: formData.phone || "", dob: formData.dob, tob: formData.tob, sec: formData.sec || "", ampm: formData.ampm,
        gender: formData.gender || "",
        pob: formData.pob, pobLat: formData.pobLat, pobLon: formData.pobLon, pobSource: formData.pobSource, pobTz: formData.pobTz || "",
        savedAt: new Date().toISOString()
      };
      const next = [entry, ...rest].slice(0, 200);
      persistProfiles(next);
      return next;
    });
  };

  const loadProfile = (p) => {
    setFormData({ name:p.name||"", phone:p.phone||"", dob:p.dob||"", tob:p.tob||"", sec:p.sec||"", pob:p.pob||"", ampm:p.ampm||"AM",
      gender:p.gender||"", pobLat:p.pobLat ?? null, pobLon:p.pobLon ?? null, pobSource:p.pobSource ?? null, pobTz:p.pobTz || "" });
    setPlaceResults([]); setPlaceDropdownOpen(false);
  };

  // ── சேமித்த ஜாதகங்களின் மேகப் பிரதி (Firestore users/{uid}) ──
  // உள்நுழைந்த கணக்கு தெரிந்ததும் (தொடக்கம், Google இணைப்பு, கணக்கு மாற்றம்) மேகப் பட்டியலை
  // இந்தச் சாதனப் பட்டியலுடன் சேர்க்கும்; அதன் பின் ஒவ்வொரு மாற்றமும் மேகத்தில் சேமிக்கப்படும்.
  // மேகத்தை அடைய முடியாவிட்டால் (இணையம் இல்லை) இந்த அமர்வில் எழுதுவதில்லை — காலிப் பட்டியல்
  // மேகப் பிரதியை அழித்துவிடக் கூடாது.
  const cloudUidRef = useRef(null);
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  useEffect(() => {
    let alive = true;
    const unsub = onUser(async (u) => {
      if (!u) { cloudUidRef.current = null; return; }
      if (cloudUidRef.current === u.uid) return;
      cloudUidRef.current = null;
      const cloud = await loadProfilesCloud();
      if (!alive || cloud === null) return;
      const keyOf = (p) => `${p.name}|${p.dob}|${p.tob}|${p.ampm}`;
      const local = profilesRef.current;
      const seen = new Set(local.map(keyOf));
      const merged = [...local, ...cloud.filter((p) => !seen.has(keyOf(p)))].slice(0, 200);
      cloudUidRef.current = u.uid;
      if (merged.length !== local.length) { persistProfiles(merged); setProfiles(merged); }
      else if (local.length && cloud.length !== local.length) saveProfilesCloud(local);
    });
    return () => { alive = false; unsub(); };
  }, []);
  useEffect(() => {
    if (!cloudUidRef.current) return;
    const t = setTimeout(() => { if (cloudUidRef.current) saveProfilesCloud(profiles); }, 1500);
    return () => clearTimeout(t);
  }, [profiles]);

  const deleteProfile = (id) => {
    setProfiles(prev => { const next = prev.filter(p => p.id !== id); persistProfiles(next); return next; });
  };
  const [horoscope, setHoroscope] = useState(null);
  // ஜாதகம் தயாரானதும் PDF தலைப்புப் படத்தை முன்கூட்டியே ஏற்று — "PDF பதிவிறக்கு" தட்டும்போது காத்திருக்க வேண்டாம்.
  useEffect(() => { if (horoscope) loadPdfImage(); }, [horoscope]);
  const [prediction, setPrediction] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);
  // ஜாதக முடிவுப் பக்கத்தின் உள்-tabs: summary | chart | palan | dasha | deep
  const [resultTab, setResultTab] = useState("summary");
  const [openAreas, setOpenAreas] = useState(() => new Set()); // பலன்கள் — விரித்த பகுதிகள்
  // தற்போது state-இல் உள்ள ஜாதகம் எந்தப் பிறப்பு விவரத்துக்கானது — விவரம்/சுயவிவரம்
  // மாறினால் பழைய ஜாதகம் புதிய பெயருடன் காட்டப்படாமல் மீண்டும் கணக்கிட இது உதவும்.
  const chartKeyRef = useRef("");
  // கட்ட வடிவம் — தென்னிந்திய (இயல்பு) / வட இந்திய; தேர்வு நினைவில் நிற்கும்
  const [northChart, setNorthChart] = useState(() => { try { return localStorage.getItem("jn_chart_style") === "north"; } catch (_) { return false; } });
  const pickChartStyle = (north) => { setNorthChart(north); try { localStorage.setItem("jn_chart_style", north ? "north" : "south"); } catch (_) { /* ignore */ } };
  // தசா tab — விம்சோத்தரி (இயல்பு) | யோகினி | அஷ்டோத்தரி (கேட்கும்போது server கணக்கு)
  const [dashaSystem, setDashaSystem] = useState("vim");
  const [tzUnknown, setTzUnknown] = useState(false); // வெளிநாட்டு இடம், மண்டலம் ஊகிக்க முடியவில்லை
  const [altDashas, setAltDashas] = useState(null);
  const [remedyPlan, setRemedyPlan] = useState(null); // null | "loading" | "error" | plan
  // கணக்கு — சேமித்த ஜாதகத் தேடல், குறிப்பு திருத்தம்
  const [profileQuery, setProfileQuery] = useState("");
  const [noteEditId, setNoteEditId] = useState(null);
  const [fadeIn, setFadeIn] = useState(true);
  // Precise place search (OpenStreetMap Nominatim) — for accurate birth-place lat/lon
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeDropdownOpen, setPlaceDropdownOpen] = useState(false);
  const [showManualGeo, setShowManualGeo] = useState(false);
  const placeSearchTimer = useRef(null);
  const isSubmittingRef = useRef(false); // guards against a rapid double-click firing handleSubmit twice during the 300ms screen-fade transition
  // New states
  const [dashaData, setDashaData] = useState(null);
  const [navamsaData, setNavamsaData] = useState(null);
  const [grahaBala, setGrahaBala] = useState(null);
  const [mahapurushaYogas, setMahapurushaYogas] = useState([]);
  const [classicalYogas, setClassicalYogas] = useState([]);
  const [advancedView, setAdvancedView] = useState("");
  const [omPlayed, setOmPlayed] = useState(false);
  const [ashtakavargaData, setAshtakavargaData] = useState(null);
  const [drishtiData, setDrishtiData] = useState([]);
  const [d10Data, setD10Data] = useState(null);
  const [d2Data, setD2Data] = useState(null);
  const [d3Data, setD3Data] = useState(null);
  const [d12Data, setD12Data] = useState(null);
  const [d60Data, setD60Data] = useState(null);
  const [d4Data, setD4Data] = useState(null);
  const [d7Data, setD7Data] = useState(null);
  const [d16Data, setD16Data] = useState(null);
  const [d20Data, setD20Data] = useState(null);
  const [d24Data, setD24Data] = useState(null);
  const [d27Data, setD27Data] = useState(null);
  const [d40Data, setD40Data] = useState(null);
  const [d45Data, setD45Data] = useState(null);
  const [jaiminiData, setJaiminiData] = useState(null);
  const [arudhaPadasData, setArudhaPadasData] = useState(null);
  const [charaDashaData, setCharaDashaData] = useState(null);
  const [varshaphalaData, setVarshaphalaData] = useState(null);
  const [familyHealthData, setFamilyHealthData] = useState(null);
  const [prashnaData, setPrashnaData] = useState(null);
  const [vimshopakaData, setVimshopakaData] = useState(null);
  const [kalaSarpa, setKalaSarpa] = useState(null);
  const [chevvaiDosham, setChevvaiDosham] = useState(null);
  const [bhavaChart, setBhavaChart] = useState(null);
  const [navamsaStrength, setNavamsaStrength] = useState(null);
  const [shadBala, setShadBala] = useState(null);
  const [transitOverlay, setTransitOverlay] = useState(null);
  const [functionalNature, setFunctionalNature] = useState(null);
  const [unifiedStrength, setUnifiedStrength] = useState(null);
  // நட்சத்திர-பாவக இணைப்பு — கோசார sampling கனமானதால் (144 மாத transit கணிப்பு)
  // view தேர்ந்தெடுக்கும்போது மட்டுமே lazy ஆக கணிக்கப்படும்
  const [nakBhavaData, setNakBhavaData] = useState(null);
  // PDF-க்காக: user இந்த ஜாதகத்தில் எந்த "மேலும் ஆழமான" பகுதிகளை திறந்து
  // பார்த்தார் — PDF-இல் அவை மட்டுமே இணைக்கப்படும் (select செய்து பார்த்தவை மட்டும்)
  const [viewedViews, setViewedViews] = useState(() => new Set());
  // பின்நோக்கு சரிபார்ப்பு — நடந்த நிகழ்வுகளுடன் engine விதிகளை சோதித்தல்
  const [btTopic, setBtTopic] = useState("marriage");
  const [btDateStr, setBtDateStr] = useState("");
  const [btResult, setBtResult] = useState(null);
  const [backtests, setBacktests] = useState(loadBacktests);

  const runBacktest = async () => {
    if (!horoscope || !dashaData || !isValidDDMMYYYY(btDateStr)) return;
    const [dd, mm, yy] = btDateStr.split('.').map(Number);
    const eventISO = `${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
    const geoB = chartMeta?.geo || resolveBirthGeo(formData);
    let res;
    try {
      res = await apiBacktest(buildBirth(chartMeta?.dobISO || parseDDMMYYYY(formData.dob), chartMeta?.finalTime || "06:00", geoB), btTopic, eventISO);
    } catch (e) { return; }
    if (!res) return;
    setBtResult(res);
    setBacktests(prev => {
      const next = [{ id: Date.now(), chart: `${chartMeta?.name ?? formData.name} (${chartMeta?.dob ?? formData.dob})`, topic: res.topic, icon: res.icon, dateStr: btDateStr,
        score: res.score, hit: res.hit, dScore: res.dScore, tScore: res.tScore,
        topPct: res.percentile ? res.percentile.topPct : null }, ...prev].slice(0, 100);
      persistBacktests(next);
      return next;
    });
  };
  // Chart உருவாக்கப்பட்ட தருணத்தின் params snapshot — form/ayanamsa-ஐ பின்னர்
  // மாற்றினாலும் backtest / event-timing / nak-bhava பழைய chart-உடன் ஒரே
  // அடிப்படையில் கணக்கிட (stale-mix bug தடுப்பு)
  const [chartMeta, setChartMeta] = useState(null);
  const [marakaBadhaka, setMarakaBadhaka] = useState(null);
  const [avasthasData, setAvasthasData] = useState(null);
  const [bhavaBalaData, setBhavaBalaData] = useState(null);
  const [gulikaData, setGulikaData] = useState(null);
  const [btSensitivity, setBtSensitivity] = useState(null);
  const [dashaSandhi, setDashaSandhi] = useState(null);
  const [planetContext, setPlanetContext] = useState(null);
  const [eventTiming, setEventTiming] = useState({});
  const [sequenceLinks, setSequenceLinks] = useState(null);
  const [eventTopic, setEventTopic] = useState("marriage");
  const [inauspiciousTimes, setInauspiciousTimes] = useState(null);
  const [muhurthaData, setMuhurthaData] = useState(null);
  const [planetTransitAnalysis, setPlanetTransitAnalysis] = useState(null);
  const [remediesData, setRemediesData] = useState(null);
  const [bhavaPhalam, setBhavaPhalam] = useState(null);
  const [keyAreas, setKeyAreas] = useState(null);
  // முகப்பில் தேர்ந்த கேள்வி — ஜாதகம் உருவானதும் அந்தப் பகுதிக்கு நேரடி
  const [homeQuestion, setHomeQuestion] = useState(null);
  // முகப்பு "இன்று" அட்டை — நாட்காட்டிப் பக்கத்தின் அதே கணக்கு (06:00 பஞ்சாங்கம், சுயவிவர இடம் / சென்னை),
  // தினமும் ஒருமுறை. பொதுப் பஞ்சாங்கம் மட்டும் (almanac).
  const homeToday = useMemo(() => {
    try {
      const now = new Date();
      const iso = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const g = resolveBirthGeo(formData);
      const h = generateHoroscope(iso, "06:00", g.lat, g.lon, true);
      const muh = calcMuhurtham(now, g.lat, g.lon, 5.5);
      return {
        weekday: ["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"][now.getDay()],
        greg: now.toLocaleDateString("ta-IN",{day:"numeric",month:"long",year:"numeric"}),
        tamil: tamilCivilDate(now),
        tithi: h.tithi, waxing: (h.paksham || "").includes("சுக்ல"), nakshatra: h.nakshatra,
        dp: dayPanchang(now, g.lat, g.lon),
        rahuKalam: (muh.rahuKalam || "").replace(" — ", "–"), sunrise: muh.sunrise, sunset: muh.sunset,
        // தினசரித் தேவைகள் (பொதுப் பஞ்சாங்கம்): யோகம், கரணம், தவிர்க்க வேண்டிய நேரங்கள், கௌரி நல்ல நேரம், சூலம், சந்திராஷ்டமம்
        yogam: h.yogam, karanam: h.karanam, moonRashi: h.moonRashi,
        yamagandam: (muh.yamagandam || "").replace(" — ", "–"), kuligai: (muh.kuligai || "").replace(" — ", "–"), abhijit: (muh.abhijit || "").replace(" — ", "–"),
        gowri: gowriForDay(now.getDay(), muh.sunrise, muh.sunset, calcMuhurtham(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), g.lat, g.lon, 5.5).sunrise),
        soolam: VARA_SOOLAM[now.getDay()],
        // இன்றைய சந்திரன் எந்த ராசிக்கு 8ஆம் இடத்தில் உள்ளாரோ அந்த ராசிக்குச் சந்திராஷ்டமம்
        chandrashtama: RASHIS.indexOf(h.moonRashi) >= 0 ? RASHIS[(RASHIS.indexOf(h.moonRashi) + 5) % 12] : "",
      };
    } catch(e) { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [new Date().toDateString(), formData.pob, formData.pobLat, formData.pobLon]);
  // முகப்பு: இன்றைய விசேஷமும் வரும் ஒரு வாரத்தின் விரத/பண்டிகை நாட்களும். ஆண்டுப் பட்டியல் (பண்டிகைகள் பக்கத்தின் அதே
  // சேவையகக் கணக்கு) ஒரு முறை பெற்றுச் சாதனத்தில் சேமிக்கப்படும்; இணையம் இல்லையெனில் சேமித்ததே — இல்லாவிட்டால் இப்பகுதி வராது.
  const [homeSpecials, setHomeSpecials] = useState(() => {
    try { const c = JSON.parse(localStorage.getItem("jn_specials") || "null"); return c && c.year === new Date().getFullYear() && Array.isArray(c.list) ? c : null; } catch (_) { return null; }
  });
  useEffect(() => {
    const year = new Date().getFullYear();
    if (screen !== SCREEN.HOME || (homeSpecials && homeSpecials.year === year)) return;
    let alive = true;
    Promise.all([apiFestivals(year), apiVratham(year)]).then(([fest, vr]) => {
      if (!alive) return;
      const list = [
        ...(fest || []).map((f) => ({ iso: f.iso, name: f.name, fest: true })),
        ...(vr || []).map((v) => ({ iso: v.date, name: v.key === "pradosham" && v.note ? v.note : v.name })),
      ].filter((x) => x.iso && x.name);
      if (!list.length) return;
      const c = { year, list };
      setHomeSpecials(c);
      try { localStorage.setItem("jn_specials", JSON.stringify(c)); } catch (_) { /* ignore */ }
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);
  const homeSpecial = useMemo(() => {
    if (!homeSpecials) return null;
    const now = new Date(), isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const names = (iso) => { const xs = homeSpecials.list.filter((x) => x.iso === iso); return [...new Set([...xs.filter((x) => x.fest), ...xs.filter((x) => !x.fest)].map((x) => x.name))]; };
    const upcoming = [];
    for (let i = 1; i <= 7 && upcoming.length < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), n = names(isoOf(d));
      if (n.length) upcoming.push({ when: i === 1 ? "நாளை" : d.toLocaleDateString("ta-IN", { day: "numeric", month: "short" }), names: n });
    }
    return { today: names(isoOf(now)), upcoming };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeSpecials, new Date().toDateString()]);
  const [tamilDate, setTamilDate] = useState(null);
  const [showTamilDate, setShowTamilDate] = useState(false);
  const [expandedDasha, setExpandedDasha] = useState(null);
  // Porutham
  const [poruthBride, setPoruthBride] = useState({ name:"", dob:"", tob:"", ampm:"AM" });
  const [poruthGroom, setPoruthGroom] = useState({ name:"", dob:"", tob:"", ampm:"AM" });
  const [poruthResult, setPoruthResult] = useState(null);
  const [poruthLoading, setPoruthLoading] = useState(false);
  // Daily prediction
  const [dailyData, setDailyData] = useState(null);
  const [dailyPrediction, setDailyPrediction] = useState("");
  const [dailyAiOk, setDailyAiOk] = useState(false); // dailyPrediction உண்மையில் AI உரையா (பிழைச் செய்தி அல்ல)
  const [dailyLoading, setDailyLoading] = useState(false);
  // Calendar
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calSelected, setCalSelected] = useState(new Date().getDate());
  // Backend-accuracy data for the Panchangam Calendar, keyed by day-of-month. Populated
  // in the background (see useEffect below) after the local-computed grid already
  // rendered, so opening the calendar is never blocked waiting on the network.
  const [calBackendData, setCalBackendData] = useState({});
  const [calFetching, setCalFetching] = useState(false);
  // Live clock for Horai (planetary hour) — updates every 30s
  const [liveClock, setLiveClock] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Background-fetch backend (Swiss Ephemeris) accuracy data for every day of the
  // visible Panchangam Calendar month. The calendar grid renders immediately from the
  // instant local engine (see the CALENDAR screen render below); this effect then
  // fetches each day from the live backend in parallel and, as results arrive, replaces
  // the local approximation with the accurate value per day. Any day whose request
  // fails or times out (fetchTransitFromBackend has its own 8s cap) simply keeps
  // showing its local value — this is a pure enhancement, never a blocker.
  // The Panchangam calendar renders entirely from the local almanac
  // (public ephemeris). High-precision per-day refinement is not fetched
  // here anymore — the engine lives server-side and the calendar is a
  // public almanac view, so the instant local values are used directly.
  useEffect(() => {
    if (screen !== SCREEN.CALENDAR) return;
    setCalBackendData({});
    setCalFetching(false);
  }, [screen, calMonth, calYear]);

  // மாத சுப நாட்கள் / விசேஷ நாட்கள் / சந்திராஷ்டமம் — server கணக்கு (engine).
  // தற்போதைய ஜாதகம் இருந்தால் அதன் நட்சத்திரம், ராசிக்கு ஏற்ப தனிப்பயன்.
  const [calMuhurta, setCalMuhurta] = useState({ key: "", days: null });
  const [calOpen, setCalOpen] = useState(() => new Set());
  const [calFestivals, setCalFestivals] = useState({ year: 0, list: [] });
  const [calVratham, setCalVratham] = useState({ year: 0, map: {} });
  useEffect(() => {
    if (screen !== SCREEN.CALENDAR || calFestivals.year === calYear) return;
    let alive = true;
    apiFestivals(calYear).then((list) => { if (alive) setCalFestivals({ year: calYear, list }); }).catch(() => {});
    // விரத நாட்கள் (அமாவாசை, பௌர்ணமி, ஏகாதசி…) — "பண்டிகைகள்" பக்கத்தின் அதே server பட்டியல்; நாட்காட்டியின்
    // புள்ளிகளும் குறிகளும் அதனுடன் ஒத்திருக்க. கிடைக்காவிட்டால் (இணையம் இல்லை) உதய காலத் திதிக் குறிகள்.
    apiVratham(calYear).then((items) => {
      if (!alive) return;
      const map = {};
      for (const v of items) (map[v.date] = map[v.date] || []).push(v);
      setCalVratham({ year: calYear, map });
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, calYear]);
  useEffect(() => {
    if (screen !== SCREEN.CALENDAR) return;
    const cur = !!(horoscope && chartKeyRef.current === birthKey());
    const nakIdx = cur ? NAKSHATRAS.indexOf(horoscope.nakshatra) : -1;
    const rIdx = cur ? RASHIS.indexOf(horoscope.moonRashi) : -1;
    const geo = resolveBirthGeo(formData);
    const key = `${calYear}-${calMonth}-${nakIdx}-${rIdx}-${geo.lat}-${geo.lon}`;
    if (calMuhurta.key === key) return;
    let alive = true;
    setCalMuhurta({ key, days: null });
    apiMuhurtaMonth(calYear, calMonth, geo, nakIdx >= 0 ? nakIdx : null, rIdx >= 0 ? rIdx : null)
      .then((days) => { if (alive) setCalMuhurta({ key, days }); })
      .catch(() => { if (alive) setCalMuhurta({ key, days: [] }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, calMonth, calYear]);

  // ── திரை வரலாறு: கைபேசியின் "பின்" பொத்தான் (Android app, உலாவி) முந்தைய திரைக்குச் செல்ல வேண்டும்;
  // முகப்பில் அழுத்தினால் மட்டும் app மூடும். திரை மாற்றம் ஒவ்வொன்றும் உலாவி வரலாற்றில் பதிவாகிறது:
  //   • முகப்பு = வேர்; முகப்புக்குச் செல்வது வரலாற்றை வேர் வரை திருப்பும்.
  //   • கீழ்ப்பட்டையின் ஒரு tab-இலிருந்து இன்னொரு tab = மாற்றீடு (அடுக்காது) — "பின்" முகப்புக்கு.
  //   • LOADING போன்ற இடைநிலைத் திரைகள் வரலாற்றில் தங்காது.
  //   • முந்தைய திரைக்கே திரும்பும் "பின்" பொத்தான்கள் = history.back().
  //   • "ஆழம்" பகுதியின் ஒரு பகுப்பாய்வு = தனிப் பதிவு (view) — "பின்" பட்டியலுக்கு.
  const navStack = useRef([{ jn: SCREEN.HOME }]);
  const skipPop = useRef(0);
  const histOK = typeof window !== "undefined" && !!window.history && typeof window.history.pushState === "function";
  const NAV_TRANSIENT = [SCREEN.SPLASH, SCREEN.LOADING, SCREEN.WELCOME, SCREEN.AUTH];
  const NAV_TABS = [SCREEN.DAILY, SCREEN.RESULT, SCREEN.ADVISORY, SCREEN.ACCOUNT];
  const histWrite = (kind, entry) => {
    if (!histOK) return;
    const st = navStack.current;
    try {
      if (kind === "push") { st.push(entry); window.history.pushState({ jn: entry.jn, view: entry.view || "", d: st.length - 1 }, ""); }
      else { st[st.length - 1] = entry; window.history.replaceState({ jn: entry.jn, view: entry.view || "", d: st.length - 1 }, ""); }
    } catch (_) { /* வரலாறு கிடைக்காத சூழல் — திரை மாற்றம் மட்டும் */ }
  };
  const histBack = (n) => {
    if (!histOK || n <= 0) return;
    const st = navStack.current;
    st.length = Math.max(1, st.length - n);
    skipPop.current += 1;
    try { window.history.go(-n); } catch (_) { skipPop.current -= 1; }
  };
  const goTo = useCallback((s) => {
    setFadeIn(false);
    setTimeout(() => { setScreen(s); setFadeIn(true); }, 300);
    const st = navStack.current;
    const top = st[st.length - 1];
    if (s === SCREEN.HOME) { if (st.length > 1) histBack(st.length - 1); }
    else if (NAV_TRANSIENT.includes(s) && s !== SCREEN.LOADING) { /* SPLASH / WELCOME / AUTH — பதிவு இல்லை */ }
    else if (st.length >= 2 && st[st.length - 2].jn === s && !st[st.length - 2].view) histBack(1);
    else if (top.jn === s) { /* அதே திரை — "ஆழம்" பகுதியின் பதிவை கீழே உள்ள effect கவனிக்கும் */ }
    else if (NAV_TRANSIENT.includes(top.jn) || (s === SCREEN.LOADING && !top.view && (top.jn === SCREEN.FORM || NAV_TABS.includes(top.jn)))
      || (NAV_TABS.includes(top.jn) && NAV_TABS.includes(s) && !top.view)) histWrite("replace", { jn: s });
    else histWrite("push", { jn: s });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const navGuard = useRef({});
  useEffect(() => {
    if (!histOK) return undefined;
    try { window.history.replaceState({ jn: SCREEN.HOME, view: "", d: 0 }, ""); } catch (_) { /* ignore */ }
    const onPop = (e) => {
      if (skipPop.current > 0) { skipPop.current -= 1; return; }   // நாமே அழைத்த back/go — திரை ஏற்கனவே மாறிவிட்டது
      const state = e.state && typeof e.state.jn === "number" ? e.state : { jn: SCREEN.HOME, view: "", d: 0 };
      const st = navStack.current;
      const d = Math.max(0, Math.min(typeof state.d === "number" ? state.d : 0, st.length - 1));
      st.length = d + 1;
      let target = st[d].jn, view = st[d].view || "";
      const g = navGuard.current;
      // தேவையான தரவு இல்லாத திரைக்குத் திரும்ப முடியாது (எ.கா. தரவு நீக்கிய பின்) → முகப்பு.
      if (NAV_TRANSIENT.includes(target) || (target === SCREEN.RESULT && !g.hasChart) || (target === SCREEN.DAILY && !g.hasDaily) || (target === SCREEN.CHAT && !g.hasBirth)) { target = SCREEN.HOME; view = ""; }
      setAdvancedView(view);
      setFadeIn(false);
      setTimeout(() => { setScreen(target); setFadeIn(true); window.scrollTo({ top: 0 }); }, 200);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  navGuard.current = { hasChart: !!horoscope, hasDaily: !!dailyData, hasBirth: !!(formData.name && formData.dob) };
  // "ஆழம்" பகுதியில் ஒரு பகுப்பாய்வு திறந்தால் தனி வரலாற்றுப் பதிவு; மூடினால் அது நீங்கும்.
  useEffect(() => {
    if (!histOK || screen !== SCREEN.RESULT) return;
    const st = navStack.current, top = st[st.length - 1];
    if (top.jn !== SCREEN.RESULT) return;
    if (advancedView) {
      if (!top.view) histWrite("push", { jn: SCREEN.RESULT, view: advancedView });
      else if (top.view !== advancedView) histWrite("replace", { jn: SCREEN.RESULT, view: advancedView });
    } else if (top.view) histBack(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedView, screen]);

  useEffect(() => {
    // முதல்-முறை → Welcome; திரும்பும் user → நேரடி HOME (onboarding மீண்டும் காட்டாது)
    if(screen===SCREEN.SPLASH){ const t=setTimeout(()=>{
      const saved=loadProfiles(); if(saved.length>0){loadProfile(saved[0]);}
      // முதல்-முறை (விவரம்+மொழி இல்லை) → முழு நுழைவு; மொழி மட்டும் இல்லை (பழைய பயனர்) → மொழிப் படி மட்டும்; இல்லையேல் முகப்பு.
      if(!isOnboarded()) goTo(SCREEN.ONBOARD);
      else if(!hasLang()) goTo(SCREEN.ONBOARD);
      else goTo(SCREEN.HOME);
    },5600); return()=>clearTimeout(t); }
  }, [screen, goTo]);


  // ── ஓம் ஒலி (Om Sound) — synthesized, free, plays once on app open ──
  const playOmSound = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      const ctx = new Ctx();
      if (ctx.state === "suspended") ctx.resume().catch(()=>{});
      const now = ctx.currentTime;
      const duration = 4.2;
      // One octave above 136.1Hz — same "Om frequency" lineage, but audible on small phone speakers
      // (most phone speakers roll off heavily below ~250Hz)
      const baseFreq = 272.2;

      // Master envelope — slow devotional swell in, gentle sustain, long fade out
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.45, now + 0.9);
      master.gain.setValueAtTime(0.45, now + duration - 2.0);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // Soft low-pass filter — warm chant-like tone, wide enough to stay clear on small speakers
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2500;
      filter.Q.value = 0.6;
      master.connect(filter);
      filter.connect(ctx.destination);

      // Fundamental + harmonics — most energy sits where phone speakers reproduce well
      const partials = [
        { mult: 0.5, gain: 0.35, type: "sine" },     // 136.1 Hz — felt more than heard, adds depth
        { mult: 1,   gain: 1.0,  type: "sine" },     // 272.2 Hz — main audible tone
        { mult: 2,   gain: 0.5,  type: "sine" },     // 544.4 Hz
        { mult: 3,   gain: 0.28, type: "sine" },     // 816.6 Hz — brightness, cuts through small speakers
        { mult: 1.5, gain: 0.18, type: "triangle" }, // overtone warmth
      ];
      const oscillators = [];
      partials.forEach(p => {
        const osc = ctx.createOscillator();
        osc.type = p.type;
        osc.frequency.setValueAtTime(baseFreq * p.mult, now);
        const g = ctx.createGain();
        g.gain.value = p.gain;
        osc.connect(g);
        g.connect(master);
        osc.start(now);
        osc.stop(now + duration + 0.1);
        oscillators.push(osc);
      });

      // Gentle vibrato on the fundamental — living, chant-like quality
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 3.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2.5;
      lfo.connect(lfoGain);
      lfoGain.connect(oscillators[1].frequency); // vibrato on the main audible partial
      lfo.start(now);
      lfo.stop(now + duration + 0.1);

      setTimeout(() => { try { ctx.close(); } catch(e){} }, (duration + 0.5) * 1000);
      return true;
    } catch (e) {
      return false; // autoplay blocked or Web Audio unsupported — never interrupt the user
    }
  }, []);

  useEffect(() => {
    if (omPlayed) return;
    // Best-effort immediate attempt (works if browser allows, or on repeat visits)
    playOmSound();
    // Guaranteed fallback: browsers require a user gesture for audio —
    // play on the very first tap/click/key if the immediate attempt was silently blocked
    const tryOnGesture = () => {
      if (omPlayed) return;
      const ok = playOmSound();
      if (ok) setOmPlayed(true);
    };
    document.addEventListener("click", tryOnGesture);
    document.addEventListener("touchstart", tryOnGesture);
    document.addEventListener("keydown", tryOnGesture);
    return () => {
      document.removeEventListener("click", tryOnGesture);
      document.removeEventListener("touchstart", tryOnGesture);
      document.removeEventListener("keydown", tryOnGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [omPlayed, playOmSound]);

  // ── Backend API (Swiss Ephemeris — deploy on Render.com) ──
  // After deploying, paste your Render URL here:
  const [ayanamsaKey, setAyanamsaKey] = useState("lahiri");
  const [apiSource, setApiSource] = useState("");


  // இந்தப் பிறப்பு விவரத்தின் அடையாளம் — ஜாதகம் இதற்கானதுதானா என்று ஒப்பிட.
  const birthKey = () => [formData.name, formData.dob, formData.tob, formData.ampm, formData.pob,
    formData.pobLat, formData.pobLon, formData.pobTz || "", formData.gender, ayanamsaKey].join("|");
  const chartIsCurrent = () => !!(horoscope && dashaData && chartKeyRef.current === birthKey());
  // Form-இன் 12h நேரம் → 24h; ISO தேதி; பிறந்த இட ஆயத்தொலைவு.
  const birthFromForm = () => {
    const dobISO = parseDDMMYYYY(formData.dob);
    let h24 = 6, min24 = 0;
    if (formData.tob) {
      const [hh, mm] = formData.tob.split(':').map(Number);
      h24 = Number.isFinite(hh) ? hh : 6; min24 = Number.isFinite(mm) ? mm : 0; // 0 மணி (நள்ளிரவு) falsy — || பயன்படுத்தக் கூடாது
      if (formData.ampm === "PM" && h24 < 12) h24 += 12;
      if (formData.ampm === "AM" && h24 === 12) h24 = 0;
    }
    const finalTime = `${String(h24).padStart(2,'0')}:${String(min24).padStart(2,'0')}`;
    return { dobISO, finalTime, geoT: resolveBirthGeo(formData) };
  };

  // Assemble the birth payload the Worker expects from the form.
  const buildBirth = (dobISO, finalTime, geo) => ({
    dobISO, time24: finalTime, lat: geo.lat, lon: geo.lon,
    ayanamsaKey, gender: formData.gender || null,
    tz: formData.pobTz || undefined, // இந்தியாவுக்கு வெளியே பிறப்பு மட்டும் (இல்லையேல் server IST கொள்ளும்)
    name: formData.name, dob: formData.dob, tob: formData.tob || "",
    ampm: formData.ampm || "", pob: formData.pob || "",
  });

  // Apply a full report returned by /api/compute to state — the server-side
  // equivalent of runAllEngines (which sets the same values from the local
  // engine). Keys mirror computeFullReport() in the Worker.
  const applyReport = (r) => {
    chartKeyRef.current = birthKey();
    setDailyData(null); setPrediction(""); setOpenAreas(new Set());
    setAltDashas(null); setDashaSystem("vim"); setRemedyPlan(null);
    setChartMeta(r.chartMeta); setHoroscope(r.horoscope);
    setNavamsaData(r.navamsaData); setDrishtiData(r.drishtiData);
    setD10Data(r.d10Data); setD2Data(r.d2Data); setD3Data(r.d3Data);
    setD12Data(r.d12Data); setD60Data(r.d60Data); setD4Data(r.d4Data);
    setD7Data(r.d7Data); setD16Data(r.d16Data); setD20Data(r.d20Data);
    setD24Data(r.d24Data); setD27Data(r.d27Data); setD40Data(r.d40Data);
    setD45Data(r.d45Data); setJaiminiData(r.jaiminiData);
    setArudhaPadasData(r.arudhaPadasData); setCharaDashaData(r.charaDashaData);
    setVarshaphalaData(r.varshaphalaData); setBhavaChart(r.bhavaChart);
    setGrahaBala(r.grahaBala); setShadBala(r.shadBala);
    setVimshopakaData(r.vimshopakaData); setNavamsaStrength(r.navamsaStrength);
    setAvasthasData(r.avasthasData); setFunctionalNature(r.functionalNature);
    setMarakaBadhaka(r.marakaBadhaka); setAshtakavargaData(r.ashtakavargaData);
    setBhavaBalaData(r.bhavaBalaData); setUnifiedStrength(r.unifiedStrength);
    setMahapurushaYogas(r.mahapurushaYogas); setClassicalYogas(r.classicalYogas);
    setKalaSarpa(r.kalaSarpa); setChevvaiDosham(r.chevvaiDosham);
    setDashaData(r.dashaData); setTransitOverlay(r.transitOverlay);
    setPlanetTransitAnalysis(r.planetTransitAnalysis);
    setInauspiciousTimes(r.inauspiciousTimes); setMuhurthaData(r.muhurthaData);
    setBhavaPhalam(r.bhavaPhalam); setKeyAreas(r.keyAreas);
    setFamilyHealthData(r.familyHealthData); setPlanetContext(r.planetContext);
    setSequenceLinks(r.sequenceLinks); setRemediesData(r.remediesData);
    setGulikaData(r.gulikaData); setBtSensitivity(r.btSensitivity);
    setDashaSandhi(r.dashaSandhi || null);
    setTamilDate(r.tamilDate || null);
    setNakBhavaData(null); setViewedViews(new Set());
  };

  const handleSubmit = async () => {
    if(!formData.dob||!formData.name||!isValidDDMMYYYY(formData.dob))return;
    // Prevent a rapid double-click from firing this twice: goTo()'s screen switch is
    // delayed by a 300ms fade, so the FORM screen (and this button) stays mounted briefly
    // after the first click. isSubmittingRef is a ref (updates synchronously, unlike state)
    // so this check is reliable even for clicks that land within that same tick.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setTimeout(() => { isSubmittingRef.current = false; }, 500);
    goTo(SCREEN.LOADING);

    // Convert dd-mm-yyyy → YYYY-MM-DD (ISO) for all engine calculations
    const dobISO = parseDDMMYYYY(formData.dob);

    // Convert time with AM/PM to 24h format
    let h24 = 6, min24 = 0;
    if (formData.tob) {
      const [hh, mm] = formData.tob.split(':').map(Number);
      h24 = Number.isFinite(hh) ? hh : 6;
      min24 = mm || 0;
      if (formData.ampm === "PM" && h24 < 12) h24 += 12;
      if (formData.ampm === "AM" && h24 === 12) h24 = 0;
    }
    const finalTime = `${String(h24).padStart(2,'0')}:${String(min24).padStart(2,'0')}`;

    // Resolve the birth geo ONCE (precise OSM/manual coords when available) and use it
    // for BOTH the backend chart request and shadbala/gochara — keeps them consistent.
    const geoT = resolveBirthGeo(formData);

    // Tamil solar-calendar date (optional display) — computed from the birth data
    try {
      setTamilDate(calcTamilDate(dobISO, finalTime, geoT.lat, geoT.lon));
    } catch (e) { setTamilDate(null); }

    // ── Server-side path: engine runs in the Worker, only output returns ──
    if (USE_API) {
      try {
        const { report, source } = await apiCompute(buildBirth(dobISO, finalTime, geoT));
        setApiSource(source === "swiss" ? "api" : "local");
        applyReport(report);
        saveCurrentProfile();
        setResultTab("summary"); setAdvancedView("");
        if (!isOnboarded()) markOnboarded();
        goTo(SCREEN.RESULT);
      } catch (e) {
        setApiSource("");
        const ae = getAuthError();
        const detail = ae ? `\n\nஉள்நுழைவுப் பிழை:\n${ae}` : `\n\n(${String(e?.message || e)})`;
        alert("⚠ சர்வர் இப்போது பதிலளிக்கவில்லை." + detail);
        goTo(SCREEN.FORM);
      }
      return;
    }
  };

  // வாழ்க்கை நிகழ்வு காலக்கணிப்பு — கேட்கும்போது (on-demand) கணக்கிடு
  const runEventTiming = async (topicKey) => {
    if (!horoscope || !dashaData) return;
    const geo = chartMeta?.geo || resolveBirthGeo(formData);
    try {
      const res = await apiEventTiming(buildBirth(chartMeta?.dobISO || parseDDMMYYYY(formData.dob), chartMeta?.finalTime || "06:00", geo), topicKey);
      setEventTiming(prev => ({ ...prev, [topicKey]: res }));
    } catch (e) { /* leave unset — UI shows retry */ }
  };

  // முகப்பு கேள்வியிலிருந்து RESULT-க்கு வந்ததும் — அந்தத் தலைப்பின்
  // காலக்கணிப்பைத் திறந்து, அப்பகுதிக்கு scroll செய்து, banner காட்டு
  useEffect(() => {
    if (screen === SCREEN.RESULT && homeQuestion?.topic && horoscope && dashaData) {
      const topic = homeQuestion.topic;
      setResultTab("deep");
      setAdvancedView("eventtiming");
      setEventTopic(topic);
      if (!eventTiming[topic]) runEventTiming(topic);
      const timer = setTimeout(() => {
        const el = document.getElementById("jn-eventtiming");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, homeQuestion, horoscope, dashaData]);

  const fetchAIPrediction = async () => {
    if(!horoscope)return;
    setPredictionLoading(true); setPrediction("");
    // Server-side path: prompt is built inside the Worker (no prompt leaves
    // the browser), the Claude key stays on the server.
    if (USE_API) {
      try {
        const geo = chartMeta?.geo || resolveBirthGeo(formData);
        const birth = buildBirth(chartMeta?.dobISO || parseDDMMYYYY(formData.dob), chartMeta?.finalTime || "06:00", geo);
        setPrediction(await apiPredict(birth) || "பலன் கிடைக்கவில்லை.");
      } catch (e) { setPrediction("AI பலன் பெற இணைய இணைப்பு தேவை."); }
      setPredictionLoading(false);
      return;
    }
  };

  // ── DAILY PREDICTION (தினப்பலன்) ── targetDate: null = "இப்போது" (live now), or a Date object for a future/past date
  const openDailyScreen = async (targetDate = null) => {
    if (!horoscope) return;
    const geo = resolveBirthGeo(formData);
    const refDate = targetDate || new Date();

    // Show the same loading screen used for birth-chart generation while we try the
    // live backend — Render's free tier can take a few seconds (or up to ~8s on a
    // cold start) to respond, so this avoids an ambiguous "did my click register?" pause.
    goTo(SCREEN.LOADING);

    // Server-side path: the daily bundle is computed in the Worker.
    if (USE_API) {
      try {
        const birth = buildBirth(chartMeta?.dobISO || parseDDMMYYYY(formData.dob), chartMeta?.finalTime || "06:00", geo);
        const targetISO = targetDate
          ? `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2,'0')}-${String(targetDate.getDate()).padStart(2,'0')}`
          : null;
        const { daily } = await apiDaily(birth, targetISO, false);
        setDailyData(daily); setDailyPrediction("");
        goTo(SCREEN.DAILY);
      } catch (e) {
        alert("⚠ தினப்பலன் சர்வர் பதிலளிக்கவில்லை. மீண்டும் முயற்சிக்கவும்.");
        goTo(SCREEN.HOME);
      }
      return;
    }
  };

  const fetchDailyPrediction = async () => {
    if (!horoscope || !dailyData) return;
    setDailyLoading(true); setDailyPrediction("");
    if (USE_API) {
      try {
        const geo = chartMeta?.geo || resolveBirthGeo(formData);
        const birth = buildBirth(chartMeta?.dobISO || parseDDMMYYYY(formData.dob), chartMeta?.finalTime || "06:00", geo);
        const dObj = dailyData.today?.dateObj ? new Date(dailyData.today.dateObj) : null;
        const targetISO = dObj ? `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}` : null;
        const { text } = await apiDaily(birth, targetISO, true);
        setDailyAiOk(!!text);
        setDailyPrediction(text || "இன்றைய பலன் கிடைக்கவில்லை.");
      } catch (e) { setDailyAiOk(false); setDailyPrediction("இணைய இணைப்பு தேவை."); }
      setDailyLoading(false);
      return;
    }
  };


  const handleAuth = (e) => { e?.preventDefault?.(); setUser({name:formData.name||"User"}); goTo(SCREEN.FORM); };

  // ─── NAVAGRAHA COLORS ───
  const GRAHA_COLORS = {
    "சூரியன்":"#e85d26","சந்திரன்":"#c0c0c0","செவ்வாய்":"#c0564f","புதன்":"#22c55e",
    "குரு":"#eab308","சுக்கிரன்":"#ec4899","சனி":"#1e3a5f","ராகு":"#6366f1","கேது":"#a9823c"
  };
  const grahaCardBorder = (planetTa) => GRAHA_COLORS[planetTa] || "#a9823c";

  // ─── SACRED-LUXE HINDU LIGHT THEME (World No.1 design system) ───
  const base = {
    minHeight:"100vh",
    background:"transparent",           // lets the body's fixed warm gradient show through every screen
    fontFamily:"'Noto Sans Tamil','Segoe UI',system-ui,sans-serif",
    color:"#27303f", position:"relative", overflow:"hidden"
  };
  const container = {
    maxWidth:430, margin:"0 auto", padding:"0 20px",
    position:"relative", zIndex:3,
    opacity:fadeIn?1:0, transform:fadeIn?"translateY(0)":"translateY(14px)",
    transition:"opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.5s cubic-bezier(0.22,1,0.36,1)"
  };
  const T = {
    gold: "#1f3f68",
    goldBg: "#e9edf6",
    accent: "#7d6a3f",
    accentSoft: "#a9823c",
    text: "#27303f",
    textSoft: "#4a5365",
    textMuted: "#76819a",
    bg: "#fcfdff",
    cardBg: "rgba(251,252,255,0.92)",
    cardBorder: "1px solid #e3e8f2",
    inputBg: "#fcfdff",
    inputBorder: "1.5px solid #d9e0ee",
    inputColor: "#27303f",
    good: "#2e7d5b",
    bad: "#c0564f",
    neutral: "#7d6a3f",
    shadow: "0 10px 34px -12px rgba(35,55,95,0.18), 0 2px 8px rgba(35,55,95,0.05)",
    pink: "#35598c",
    roseGold: "#a9823c",
  };
  const btnGold = {
    background:"linear-gradient(135deg, #2a4d7e 0%, #1f3f68 45%, #16304f 100%)",
    color:"#f6f8fc", border:"1px solid #1f3f68", borderRadius:14, padding:"15px 0",
    width:"100%", fontSize:16, fontWeight:700, cursor:"pointer", letterSpacing:0.3,
    boxShadow:"0 10px 26px -8px rgba(31,63,104,0.55), inset 0 1px 0 rgba(255,255,255,0.18)",
    position:"relative", overflow:"hidden"
  };
  const btnOutline = {
    background:"rgba(251,252,255,0.7)", color:"#1f3f68",
    border:"1.5px solid #ccd6e8", borderRadius:14,
    padding:"13px 0", width:"100%", fontSize:15, fontWeight:600, cursor:"pointer",
    backdropFilter:"blur(6px)", boxShadow:"0 2px 10px rgba(35,55,95,0.05)"
  };
  const inputStyle = {
    width:"100%", padding:"14px 16px",
    background:"#fcfdff", border:"1.5px solid #d9e0ee",
    borderRadius:12, color:"#27303f", fontSize:15, outline:"none",
    boxSizing:"border-box"
  };
  const labelStyle = { display:"block", marginBottom:7, fontSize:12.5, color:"#7d6a3f", fontWeight:700, letterSpacing:0.3, textTransform:"uppercase" };
  const card = {
    background:"linear-gradient(180deg, rgba(255,255,255,0.96), rgba(251,252,255,0.9))",
    border:"1px solid #e3e8f2",
    borderRadius:18, padding:20,
    boxShadow:"0 10px 34px -14px rgba(35,55,95,0.16), 0 1px 4px rgba(35,55,95,0.04)",
    backdropFilter:"blur(4px)"
  };

  // ─── முகப்பு கேள்வி → அந்தப் பகுதிக்கு அழைத்துச் செல் ───
  const openQuestion = (item) => {
    if (item.nav === "PORUTHAM") { setHomeQuestion(null); goTo(SCREEN.PORUTHAM); return; }
    setHomeQuestion(item.nav === "FORM" ? null : item);
    // ஏற்கனவே ஜாதகம் உருவாக்கப்பட்டிருந்தால் நேரடி முடிவுக்கு; இல்லையேல் FORM
    goTo(horoscope ? SCREEN.RESULT : SCREEN.FORM);
  };

  // ═══════ வழிசெலுத்தல் — எல்லா பக்கங்களும் இதன் வழியே இணைகின்றன ═══════
  // ஜாதக முடிவுப் பக்கம் — view: "" (சுருக்கம்) | "chart" | "palan" | "dasha" | ஆழ்பகுதி key.
  // ஜாதகம் இல்லை / வேறு நபருடையது எனில் முதலில் கணக்கிடும் (returning user, profile மாற்றம்).
  const RESULT_TABS = ["summary", "chart", "palan", "dasha", "remedy", "deep"];
  const showResultView = (view) => {
    if (!view) { setResultTab("summary"); setAdvancedView(""); }
    else if (RESULT_TABS.includes(view)) { setResultTab(view); setAdvancedView(""); }
    else { setResultTab("deep"); setAdvancedView(view); }
  };
  const openResultView = async (view) => {
    if (chartIsCurrent()) { showResultView(view); goTo(SCREEN.RESULT); return; }
    if (!formData.dob || !formData.name || !isValidDDMMYYYY(formData.dob)) { goTo(SCREEN.FORM); return; }
    goTo(SCREEN.LOADING);
    try {
      const { dobISO, finalTime, geoT } = birthFromForm();
      const { report, source } = await apiCompute(buildBirth(dobISO, finalTime, geoT));
      setApiSource(source === "swiss" ? "api" : "local");
      applyReport(report);
      showResultView(view); goTo(SCREEN.RESULT);
    } catch (e) { goTo(SCREEN.FORM); }
  };

  // தினப்பலன் — எங்கிருந்து தட்டினாலும் (முகப்பு, கீழ்ப்பட்டை) தனிப்பட்ட பலனைத் திறக்கும்.
  // ஜாதகம் இன்னும் கணக்கிடப்படவில்லை எனில் அதையும் சேர்த்துக் கணக்கிடும்.
  const openDailyAuto = async () => {
    if (chartIsCurrent()) { openDailyScreen(); return; }
    if (!formData.dob || !formData.name || !isValidDDMMYYYY(formData.dob)) { goTo(SCREEN.FORM); return; }
    goTo(SCREEN.LOADING);
    try {
      const { dobISO, finalTime, geoT } = birthFromForm();
      const birth = buildBirth(dobISO, finalTime, geoT);
      const { report, source } = await apiCompute(birth);
      setApiSource(source === "swiss" ? "api" : "local");
      applyReport(report);
      const { daily } = await apiDaily(birth, null, false);
      setDailyData(daily); setDailyPrediction("");
      goTo(SCREEN.DAILY);
    } catch (e) {
      alert("⚠ தினப்பலன் சர்வர் பதிலளிக்கவில்லை. மீண்டும் முயற்சிக்கவும்.");
      goTo(SCREEN.HOME);
    }
  };

  // Home, கீழ்ப்பட்டை, Advisory — எல்லாவற்றுக்கும் பொதுவான navigation handler
  const handleNav = (key) => {
    switch (key) {
      case "home":        goTo(SCREEN.HOME); break;
      case "advisory":
      case "consult":     goTo(SCREEN.ADVISORY); break;
      case "daily":       openDailyAuto(); break;
      case "chart":       openResultView(""); break;
      case "dasha":       openResultView("dasha"); break;
      case "yogas":       openResultView("yogas"); break;
      case "nakbhava":    openResultView("nakbhava"); break;
      case "backtest":    openResultView("backtest"); break;
      case "eventtiming": openResultView("eventtiming"); break;
      case "sadesati":    openResultView("saniguru"); break;
      case "porutham":    setHomeQuestion(null); goTo(SCREEN.PORUTHAM); break;
      case "muhurtham":
      case "calendar":    goTo(SCREEN.CALENDAR); break;
      case "account":     goTo(SCREEN.ACCOUNT); break;
      case "premium":     goTo(SCREEN.PREMIUM); break;
      case "newchart":    goTo(SCREEN.FORM); break;
      case "rasi":        goTo(SCREEN.RASI); break;
      case "numerology":  goTo(SCREEN.NUMEROLOGY); break;
      case "names":       goTo(SCREEN.NAMES); break;
      case "festivals":   goTo(SCREEN.FESTIVALS); break;
      case "navagraha":   goTo(SCREEN.NAVAGRAHA); break;
      case "remedy":      openResultView("remedy"); break;
      default: break;
    }
  };

  // பாதுகாப்பு வலை: ஜாதகம்/தினப்பலன் தரவு இல்லாமல் அந்தப் பக்கத்துக்கு வந்துவிட்டால்
  // (வெற்றுத் திரை வராமல்) தானாகக் கணக்கிட்டுத் திறக்கும்.
  useEffect(() => {
    if (screen === SCREEN.RESULT && !chartIsCurrent()) openResultView(advancedView || (resultTab !== "deep" ? resultTab : ""));
    else if (screen === SCREEN.DAILY && !dailyData) openDailyAuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // பரிகாரம் tab முதன்முறை திறக்கும்போது திட்டத்தை server-இலிருந்து பெறு (ஜாதகம் மாறினால் applyReport அதை நீக்கும்).
  useEffect(() => {
    if (screen !== SCREEN.RESULT || resultTab !== "remedy" || remedyPlan || !horoscope) return;
    const key = chartKeyRef.current;
    setRemedyPlan("loading");
    apiRemedyPlan(buildBirth(chartMeta?.dobISO || parseDDMMYYYY(formData.dob), chartMeta?.finalTime || "06:00", chartMeta?.geo || resolveBirthGeo(formData)))
      .then((p) => { if (chartKeyRef.current === key) setRemedyPlan(p); })
      .catch(() => { if (chartKeyRef.current === key) setRemedyPlan("error"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, resultTab, remedyPlan, horoscope]);

  if(screen===SCREEN.HOME) {
    return <HomeScreen handle={handleNav} today={homeToday} special={homeSpecial} hasProfile={profiles.length > 0 || !!(formData.name && isValidDDMMYYYY(formData.dob))} name={formData.name} />;
  }

  if(screen===SCREEN.ADVISORY) {
    // உதவியாளரைத் தட்டினால் அவருடன் அரட்டை. பிறப்பு விவரம் இல்லையெனில் முதலில் FORM.
    const pickPersona = (key) => {
      const ready = formData.name && formData.dob;
      const go = () => { setChatPersona(key); setChatFrom("advisory"); setChatInitialQ(""); goTo(SCREEN.CHAT); };
      if (ready) go();
      else if (profiles[0]) { loadProfile(profiles[0]); go(); }
      else goTo(SCREEN.FORM);
    };
    return <AdvisoryScreen onPick={pickPersona} onNav={handleNav} />;
  }

  // ═══════ CHAT — rule-based ஜோதிடர் உரையாடல் (LLM இல்லை) ═══════
  if(screen===SCREEN.CHAT) {
    // எப்போதும் தற்போதைய சுயவிவரத்தின் பிறப்பு விவரம் — ஜாதகம் இதே நபருடையது எனில்
    // அதன் துல்லிய chartMeta; இல்லையேல் form-இலிருந்து (பழைய நபரின் தரவு கலக்காது).
    const chatBirth = () => {
      if (chartIsCurrent() && chartMeta?.dobISO) {
        return buildBirth(chartMeta.dobISO, chartMeta.finalTime || "06:00", chartMeta.geo || resolveBirthGeo(formData));
      }
      const { dobISO, finalTime, geoT } = birthFromForm();
      return buildBirth(dobISO, finalTime, geoT);
    };
    // காட்சிக்கு மட்டும்: பதிலில் உள்ள emoji-களை நீக்கு (engine வெளியீடு மாறாது).
    const clean = (r) => (r && typeof r.answer === "string" ? { ...r, answer: stripEmoji(r.answer).replace(/[ \t]+\n/g, "\n").trim() } : r);
    const persona = personaFor(chatPersona);
    const askAstrologer = async (question, lastTopic = "") => clean(await apiAsk(chatBirth(), question, lastTopic, persona.key));
    const askAstrologerAI = async (question, lastTopic = "") => clean(await apiAskAI(chatBirth(), question, lastTopic, persona.key));
    const askPremiumAstrologer = async (question) => {
      const birth = chatBirth();
      // FREE mode: deep answer with no payment. When payments are on,
      // route through Razorpay checkout as before.
      if (!PAYMENTS_ENABLED) return clean(await apiAskDeep(birth, question, "", persona.key));
      return payThenAskPremium({ birth, question, name: formData.name, amountPaise: 4900 });
    };
    return <ChatScreen key={persona.key} persona={persona} ask={askAstrologer} askAI={askAstrologerAI} askPremium={askPremiumAstrologer} personName={formData.name || ""}
      initialQuestion={chatInitialQ}
      onReport={(r) => sendReport({ ...r, kind: "answer", app: APP_VERSION })}
      premiumLabel={PAYMENTS_ENABLED ? "ஆழமான AI பதில் · ₹49" : "ஆழமான AI பதில்"}
      onBack={()=>{ setChatInitialQ(""); goTo(chatFrom === "result" && chartIsCurrent() ? SCREEN.RESULT : SCREEN.ADVISORY); }} />;
  }

  // ═══════ SPLASH ═══════
  // ═══════ SPLASH — முனிவர் ராசி-சக்கரம்: வெளி வட்டம் கடிகார திசை (இடம்→வலம்),
  // உள் மஞ்சள் வட்ட ஒளிக்கதிர்கள் எதிர் திசை (வலம்→இடம்), முனிவர் அசையாமல்,
  // பின்னொளி blink. நுட்பம்: (1) முழு படம் சுழல்கிறது → வெளி ராசி வளையம்
  // சுழல்வது தெரியும்; (2) அதே படத்தின் நடு-வட்டப் பிரதி clip-path circle-உடன்
  // அசையாமல் மேலே → முனிவர் நிமிர்ந்தே; (3) golden conic கதிர்கள் screen-blend
  // உடன் எதிர்-சுழற்சி; (4) radial glow, blink animation. ═══════
  // ═══════ WELCOME (first-time onboarding) — premium introduction ═══════
  // முதல்-முறை user-க்கு மட்டும். "தொடங்குங்கள்" → onboarded flag + HOME.
  // (Auth silent-anonymous — தனி sign-in தேவையில்லை; auth logic தொடாதது.)
  // ── நுழைவு (ஒரு பக்கத்தில் ஒரு கேள்வி; மொழி → … → பிறந்த இடம்) ──
  if(screen===SCREEN.ONBOARD) {
    // ஏற்கனவே விவரம் உள்ளவர் (பழைய பயனர்) — மொழிப் படி மட்டும்; புதியவர் — எல்லாப் படிகளும்.
    const onlyLang = isOnboarded();
    const existing = (loadProfiles()[0]) || null;
    return (
      <Onboarding
        steps={onlyLang ? ["lang"] : undefined}
        initial={existing ? { name:existing.name, phone:existing.phone, gender:existing.gender, dob:existing.dob, tob:existing.tob, sec:existing.sec, ampm:existing.ampm, pob:existing.pob, pobLat:existing.pobLat, pobLon:existing.pobLon, pobSource:existing.pobSource, pobTz:existing.pobTz } : {}}
        searchPlaces={searchPlacesOSM}
        guessZone={guessBirthZone}
        onDone={(d)=>{
          if(d.lang) setAppLang(d.lang);
          if(!onlyLang){
            // விவரங்களைச் சேமி (ஜாதகம் இங்கே கணக்கிடப்படுவதில்லை — ஜாதகப் பகுதியில் திறக்கும்போதுதான்)
            const entry = { id: Date.now(), notes:"", name:d.name, phone:d.phone||"", dob:d.dob, tob:d.tob, sec:d.sec||"", ampm:d.ampm||"AM",
              gender:d.gender||"", pob:d.pob, pobLat:d.pobLat, pobLon:d.pobLon, pobSource:d.pobSource, pobTz:d.pobTz||"", savedAt:new Date().toISOString() };
            setFormData({ name:d.name, phone:d.phone||"", dob:d.dob, tob:d.tob, sec:d.sec||"", pob:d.pob, ampm:d.ampm||"AM",
              gender:d.gender||"", pobLat:d.pobLat, pobLon:d.pobLon, pobSource:d.pobSource, pobTz:d.pobTz||"" });
            setProfiles(prev=>{ const rest = prev.filter(p=>!(p.name===d.name && p.dob===d.dob && p.tob===d.tob && p.ampm===(d.ampm||"AM")));
              const next=[entry, ...rest].slice(0,200); persistProfiles(next); return next; });
          }
          markOnboarded();
          goTo(SCREEN.HOME);
        }}
      />
    );
  }

  if(screen===SCREEN.WELCOME) {
    const POINTS = [
      { icon:"🔭", t:"வானியல் துல்லியம்", s:"தனி வானியல் கணக்குடன் சரிபார்த்த கிரக நிலைகள்" },
      { icon:"📜", t:"பாரம்பரிய கணிதம்", s:"பராசர ஹோரை · சாராவளி பாரம்பரிய விதிகள்" },
      { icon:"✓", t:"சரிபார்க்கக்கூடிய கணிப்பு", s:"கடந்த நிகழ்வுகளுடன் ஒப்பிட்டுப் பார்க்கலாம்" },
    ];
    return (
      <div style={base}>
        <div style={{...container, paddingTop:36, paddingBottom:40, textAlign:"center",
          display:"flex", flexDirection:"column", alignItems:"center"}}>
          {/* logo/brand — TOPPER ASTRO full logo */}
          <div style={{position:"relative", marginTop:12, marginBottom:18}}>
            <img src={logoFullImg} alt="TOPPER ASTRO — ஜோதிட நிபுணர்" style={{position:"relative", width:220, maxWidth:"72vw",
              height:"auto", objectFit:"contain", filter:"drop-shadow(0 8px 26px rgba(170,140,85,0.32))"}}/>
          </div>
          <h1 className="jn-serif" style={{fontSize:30, fontWeight:700, margin:"0 0 6px", letterSpacing:1,
            background:"linear-gradient(180deg,#35598c,#1f3f68 60%,#16304f)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text"}}>ஜோதிட நிபுணர்</h1>
          <p style={{fontSize:13, color:T.accent, margin:"0 0 4px", lineHeight:1.6, maxWidth:320}}>
            வேத ஜோதிடத்தின் ஆழமும், நவீன துல்லியமும் இணைந்த உங்கள் சொந்த ஜோதிட வழிகாட்டி.
          </p>

          {/* short value points */}
          <div style={{display:"flex", flexDirection:"column", gap:11, width:"100%", maxWidth:340, margin:"26px 0 30px"}}>
            {POINTS.map((p,i)=>(
              <div key={i} style={{display:"flex", alignItems:"center", gap:13, textAlign:"left",
                background:"linear-gradient(180deg,#ffffff,#fffaf0)", border:"1px solid #e3e8f2",
                borderRadius:14, padding:"13px 15px", boxShadow:"0 4px 14px -8px rgba(35,55,95,0.14)"}}>
                <div style={{width:40, height:40, flexShrink:0, borderRadius:11, fontSize:19,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:"radial-gradient(circle at 35% 30%, #e7edf8, #d8e2f2)"}}>{p.icon}</div>
                <div style={{lineHeight:1.35}}>
                  <div style={{fontSize:13.5, fontWeight:700, color:"#27303f"}}>{p.t}</div>
                  <div style={{fontSize:12.5, color:"#76819a"}}>{p.s}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{width:"100%", maxWidth:340}}>
            <button style={btnGold} onClick={()=>{ markOnboarded(); goTo(SCREEN.HOME); }}>
              தொடங்குங்கள் &nbsp;→
            </button>
            <p style={{fontSize:12, color:"#9aa4ba", marginTop:12}}>✦ பாரம்பரிய வேத ஜோதிடம் ✦</p>
          </div>
        </div>
      </div>
    );
  }

  if(screen===SCREEN.SPLASH) return (
    <div style={{...base, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", overflow:"hidden"}}>
      {/* radial glow backdrop */}
      <div aria-hidden="true" style={{position:"absolute", top:"42%", left:"50%",
        width:"min(130vw,640px)", height:"min(130vw,640px)", transform:"translate(-50%,-50%)", pointerEvents:"none",
        background:"radial-gradient(circle, rgba(176,150,95,0.13) 0%, rgba(176,150,95,0.04) 48%, transparent 72%)"}}/>

      {/* sparkle flash overlay */}
      <div aria-hidden="true" className="jn-flash-burst" style={{position:"absolute", top:"38%", left:"50%",
        width:"min(110vw,520px)", height:"min(110vw,520px)", transform:"translate(-50%,-50%)", pointerEvents:"none",
        background:"radial-gradient(circle, rgba(235,241,252,0.55) 0%, transparent 60%)"}}/>

      <div onClick={()=>{ const ok = playOmSound(); if(ok) setOmPlayed(true); }}
        style={{display:"flex", flexDirection:"column", alignItems:"center", cursor:"pointer",
          animation:"splashIn 1.0s ease-out"}}>

        {/* புதிய சின்னம் (முகப்பின் தலைப்புப் படத்திலுள்ள அதே "Topper Astro") — விளிம்புகள் மெல்லக் கரையும் */}
        <img src="/logo/topper-astro.webp" alt="TOPPER ASTRO" width="780" height="254"
          style={{width:"min(94vw,430px)", height:"auto", objectFit:"contain", WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 76%, transparent 100%)", maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 76%, transparent 100%)"}}/>
      </div>

      {/* tagline + loader */}
      <div style={{textAlign:"center", zIndex:3, marginTop:20, animation:"splashIn 1.5s ease-out"}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:12, margin:"0 0 8px"}}>
          <span style={{width:30, height:1, background:"linear-gradient(90deg,transparent,#bba368)"}}/>
          <p className="jn-serif" style={{fontSize:15, color:"#1f3f68", letterSpacing:2, fontWeight:700, margin:0}}>ஜோதிட நிபுணர்</p>
          <span style={{width:30, height:1, background:"linear-gradient(90deg,#bba368,transparent)"}}/>
        </div>
        <p style={{fontSize:12, color:"#a08a55", letterSpacing:2.4, margin:0, textTransform:"uppercase"}}>பாரம்பரிய வேத ஜோதிடம்</p>
        <div style={{width:148, height:3, borderRadius:3, background:"rgba(170,140,85,0.15)",
          overflow:"hidden", margin:"18px auto 0"}}>
          <div className="jn-load-bar" style={{height:"100%", width:"42%", borderRadius:3,
            background:"linear-gradient(90deg,#e2d2a8,#a9823c)"}}/>
        </div>
      </div>
      <style>{`
        @keyframes splashIn{from{opacity:0;transform:scale(0.93) translateY(18px);}to{opacity:1;transform:scale(1) translateY(0);}}
        @keyframes jnSpinCW{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        .jn-spin-cw{animation:jnSpinCW 55s linear infinite;transform-origin:50% 50%;}
        @keyframes jnTopperSlide{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        .jn-topper-slide{animation:jnTopperSlide 1.4s ease-out;}
        @keyframes jnFlashBurst{0%{opacity:0;}18%{opacity:1;}60%{opacity:0.6;}100%{opacity:0.15;}}
        .jn-flash-burst{animation:jnFlashBurst 2.2s ease-out forwards;}
        @keyframes jnLoadBar{0%{transform:translateX(-120%);}100%{transform:translateX(360%);}}
        .jn-load-bar{animation:jnLoadBar 1.5s cubic-bezier(0.65,0,0.35,1) infinite;}
        @media (prefers-reduced-motion: reduce){ .jn-spin-cw,.jn-load-bar{animation:none;} }
        @keyframes pulse{0%,100%{opacity:0.3;}50%{opacity:1;}}
      `}</style>
    </div>
  );

  // ═══════ AUTH ═══════
  if(screen===SCREEN.AUTH) return (
    <div style={base}>
      <div style={{...container, paddingTop:56}}>
        <div style={{textAlign:"center", marginBottom:36}}>
          <div style={{
            width:64, height:64, margin:"0 auto 16px", borderRadius:"50%",
            background:"radial-gradient(circle at 35% 35%, #c7a568, #a9823c)",
            boxShadow:"0 0 30px #a9823c20",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:30
          }}>☉</div>
          <h1 style={{fontSize:22, fontWeight:700, margin:"0 0 4px", color:"#1f3f68"}}>ஜோதிட நிபுணர்</h1>
          <p style={{fontSize:12, color:"#a9823c", margin:0}}>
            {authMode==="login"?"உங்கள் கணக்கில் உள்நுழையுங்கள்":"புதிய கணக்கு உருவாக்குங்கள்"}
          </p>
        </div>
        <div style={{display:"flex",gap:0,marginBottom:28,background:"#e9edf6",borderRadius:12,padding:3}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>setAuthMode(m)} style={{
              flex:1,padding:"10px 0",border:"none",borderRadius:10,
              background:authMode===m?"#1f3f68":"transparent",
              color:authMode===m?"#fafbfe":"#4a5365",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.25s"
            }}>{m==="login"?"உள்நுழைவு":"பதிவு"}</button>
          ))}
        </div>
        <div style={card}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {authMode==="register"&&(
              <div><label style={labelStyle}>பெயர்</label>
              <input style={inputStyle} placeholder="உங்கள் பெயர்" value={formData.name} maxLength={60}
                onChange={e=>setFormData(d=>({...d,name:e.target.value}))}/></div>
            )}
            <div><label style={labelStyle}>மின்னஞ்சல்</label>
            <input type="email" style={inputStyle} placeholder="மின்னஞ்சல் முகவரி"/></div>
            <div><label style={labelStyle}>கடவுச்சொல்</label>
            <input type="password" style={inputStyle} placeholder="••••••••"/></div>
            <button style={btnGold} onClick={handleAuth}>
              {authMode==="login"?"உள்நுழைக →":"கணக்கு உருவாக்கு →"}
            </button>
            <button style={{...btnOutline,display:"flex",alignItems:"center",justifyContent:"center",gap:10}} onClick={handleAuth}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Google மூலம் உள்நுழைக
            </button>
          </div>
        </div>
        <p style={{textAlign:"center",marginTop:20,fontSize:12,color:"#76819a"}}>பாதுகாப்பான உள்நுழைவு</p>
      </div>
    </div>
  );

  // ═══════ பொதுச் சேவைகள் — பிறப்பு விவரம் தேவையில்லாதவை ═══════
  if(screen===SCREEN.RASI) {
    // தற்போதைய ஜாதகம் இருந்தால் அதன் ராசியே முன்தேர்வு
    const myRashi = chartIsCurrent() ? RASHIS.indexOf(horoscope.moonRashi) : -1;
    const geo = formData.dob ? resolveBirthGeo(formData) : null;
    return <RasiPalanScreen rashis={RASHIS} defaultRashi={myRashi >= 0 ? myRashi : null}
      fetchPalan={(idx, iso) => apiRasiPalan(idx, iso, geo, ayanamsaKey)}
      fetchPeriod={(idx, period) => apiRasiPeriod(idx, period, geo, ayanamsaKey)} onNav={handleNav} onShare={shareOut} />;
  }
  if(screen===SCREEN.NUMEROLOGY) return <NumerologyScreen defaultDob={isValidDDMMYYYY(formData.dob) ? formData.dob : ""} onNav={handleNav} />;
  if(screen===SCREEN.NAMES) {
    const cur = chartIsCurrent();
    return <NameLettersScreen nakshatras={NAKSHATRAS} defaultNak={cur ? Math.max(0, NAKSHATRAS.indexOf(horoscope.nakshatra)) : 0}
      defaultPada={cur ? (horoscope.nakshatraPada || null) : null} onNav={handleNav} />;
  }

  if(screen===SCREEN.FESTIVALS) {
    // பண்டிகையைத் தட்டினால் நாட்காட்டியில் அந்த நாள் — அன்றைய பஞ்சாங்கம், நல்ல நேரம்
    const openDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); setCalYear(y); setCalMonth(m - 1); setCalSelected(d); goTo(SCREEN.CALENDAR); };
    return <FestivalsScreen fetchFestivals={apiFestivals} fetchVratham={apiVratham} onNav={handleNav} onOpenDate={openDate} />;
  }
  if(screen===SCREEN.NAVAGRAHA) return <NavagrahaScreen fetchNavagraha={apiNavagraha} onNav={handleNav} />;

  // ═══════ ACCOUNT — சேமித்த ஜாதகங்கள் + அமைப்புகள் ═══════
  if(screen===SCREEN.ACCOUNT) {
    const isActive = (p) => p.name===formData.name && p.dob===formData.dob && p.tob===formData.tob && p.ampm===formData.ampm;
    const hasBirth = !!(formData.name && isValidDDMMYYYY(formData.dob));
    const blank = { name:"", phone:"", dob:"", tob:"", sec:"", pob:"", ampm:"AM", gender:"", pobLat:null, pobLon:null, pobSource:null, pobTz:"" };
    const cardTitle = { fontSize: 15, fontWeight:700, color:"#1f3f68", marginBottom:10 };
    return (
      <div style={base}>
        <div style={{...container,paddingTop:22,paddingBottom:104}}>
          <h2 style={{fontSize: 20,fontWeight:700,margin:"0 0 2px",color:"#1f3f68"}}>என் கணக்கு</h2>
          <p style={{fontSize: 13,color:"#76819a",margin:"0 0 18px"}}>சேமித்த ஜாதகங்களும் அமைப்புகளும்</p>

          <div style={{...card,marginBottom:14,padding:"16px"}}>
            <div style={cardTitle}>சேமித்த ஜாதகங்கள்</div>
            {profiles.length===0 && (
              <div style={{fontSize: 13,color:"#76819a",lineHeight:1.7,marginBottom:10}}>இன்னும் ஜாதகம் எதுவும் சேமிக்கப்படவில்லை. பிறப்பு விவரம் கொடுத்து ஜாதகம் உருவாக்கினால் இங்கே சேரும்.</div>
            )}
            {profiles.length > 5 && (
              <input data-profile-search value={profileQuery} onChange={e=>setProfileQuery(e.target.value)} placeholder="பெயர் அல்லது ஊர் தேடு"
                style={{...inputStyle,fontSize: 14,padding:"11px 14px",marginBottom:10}}/>
            )}
            {profiles.filter(p => { const q = profileQuery.trim().toLowerCase(); return !q || (p.name||"").toLowerCase().includes(q) || (p.pob||"").toLowerCase().includes(q); }).map(p=>{
              const on = isActive(p);
              const editing = noteEditId === p.id;
              const saveNote = (text) => setProfiles(prev => { const next = prev.map(x => x.id === p.id ? { ...x, notes: text.slice(0, 600) } : x); persistProfiles(next); return next; });
              return (
                <div key={p.id} style={{marginBottom:8,borderRadius:14,background:on?"#eef1fb":"#ffffff",border:on?"1px solid #c9d3ea":"1px solid #e3e8f2"}}>
                  <div data-profile={p.name} onClick={()=>{ loadProfile(p); setProfiles(prev => { const next = [p, ...prev.filter(x => x.id !== p.id)]; persistProfiles(next); return next; }); }}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",cursor:"pointer"}}>
                    <span style={{width:36,height:36,borderRadius:"50%",background:on?"#1f3f68":"#f3f5f9",color:on?"#ffffff":"#76819a",display:"grid",placeItems:"center",flexShrink:0}}><UserRound size={18}/></span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize: 14,fontWeight:700,color:"#27303f",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {p.name}{on && <span style={{fontSize: 11,fontWeight:700,color:"#3e4c99",background:"#dfe5f6",borderRadius:999,padding:"2px 8px",marginLeft:8}}>தற்போது</span>}
                      </div>
                      <div style={{fontSize: 12,color:"#76819a",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {p.dob}{p.tob ? ` · ${p.tob} ${p.ampm === "AM" ? "காலை" : "மாலை"}` : ""}{p.pob ? ` · ${p.pob}` : ""}
                      </div>
                    </div>
                    <button aria-label={`${p.name} — குறிப்பு`} data-note-btn onClick={(e)=>{ e.stopPropagation(); setNoteEditId(editing ? null : p.id); }}
                      style={{background:"none",border:"none",color:p.notes?"#a9823c":"#76819a",cursor:"pointer",padding:8,flexShrink:0,display:"grid",placeItems:"center"}}><NotebookPen size={17}/></button>
                    <button aria-label={`${p.name} — நீக்கு`} onClick={(e)=>{ e.stopPropagation(); if (window.confirm(`"${p.name}" ஜாதகத்தை நீக்கவா?`)) deleteProfile(p.id); }}
                      style={{background:"none",border:"none",color:"#c0564f",cursor:"pointer",padding:8,flexShrink:0,display:"grid",placeItems:"center"}}><Trash2 size={17}/></button>
                  </div>
                  {!editing && p.notes && (
                    <div data-note-preview style={{fontSize: 12.5,color:"#4a5365",lineHeight:1.6,padding:"0 12px 10px 58px",whiteSpace:"pre-wrap"}}>{p.notes}</div>
                  )}
                  {editing && (
                    <div style={{padding:"0 12px 12px"}}>
                      <textarea data-note-input defaultValue={p.notes || ""} rows={3} maxLength={600} placeholder="குறிப்பு — எ.கா. கேட்ட கேள்வி, சொன்ன பரிகாரம், அடுத்த சந்திப்பு"
                        onBlur={(e)=>saveNote(e.target.value)}
                        style={{...inputStyle,fontSize: 13.5,padding:"10px 12px",resize:"vertical",lineHeight:1.6}}/>
                      <button data-note-save onClick={()=>setNoteEditId(null)} style={{marginTop:6,background:"#1f3f68",border:"none",borderRadius:999,color:"#ffffff",fontSize: 12.5,fontWeight:600,padding:"7px 16px",cursor:"pointer"}}>சேமி</button>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{marginTop:6}}>
              <button data-new-chart style={{...btnOutline,width:"100%",fontSize: 13.5,padding:"12px 0",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
                onClick={()=>{ setFormData(blank); setHomeQuestion(null); goTo(SCREEN.FORM); }}><Plus size={16}/> புதிய ஜாதகம்</button>
            </div>
            {hasBirth && (
              <button data-edit-birth onClick={()=>{ setHomeQuestion(null); goTo(SCREEN.FORM); }} style={{background:"none",border:"none",padding:0,marginTop:6,minHeight:40,fontSize: 13,fontWeight:600,color:"#1f3f68",cursor:"pointer"}}>
                {formData.name} — பிறப்பு விவரத்தைத் திருத்து →
              </button>
            )}
          </div>

          <div style={{...card,marginBottom:14,padding:"16px"}}>
            <div style={{...cardTitle,display:"flex",alignItems:"center",gap:8}}><Settings size={17}/> அமைப்புகள்</div>
            <label style={{fontSize: 13,fontWeight:600,color:"#4a5365",display:"block",marginBottom:6}}>அயனாம்சம்</label>
            <select value={ayanamsaKey} onChange={e=>setAyanamsaKey(e.target.value)}
              style={{...inputStyle,fontSize: 14,padding:"12px 14px",cursor:"pointer"}}>
              {Object.entries(AYANAMSA_SYSTEMS).map(([k,v])=>(
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
            <div style={{fontSize: 12.5,marginTop:8,color:"#76819a",lineHeight:1.6}}>
பெரும்பாலானோர் லாஹிரி முறையைப் பயன்படுத்துகின்றனர். மாற்றினால் அடுத்த முறை ஜாதகம் திறக்கும்போது புதிதாகக் கணக்கிடப்படும்.
            </div>
          </div>

          {/* கட்டணத் திட்டங்கள் இயக்கத்தில் இருக்கும்போது மட்டும் Premium பக்கத்துக்கான இணைப்பு (விலை காட்டி "விரைவில்" என்று சொல்லும் பக்கம் வேண்டாம்) */}
          {PAYMENTS_ENABLED ? (
          <button data-premium-link onClick={()=>goTo(SCREEN.PREMIUM)} style={{...card,display:"flex",alignItems:"center",gap:12,width:"100%",textAlign:"left",padding:"14px 16px",cursor:"pointer",marginBottom:14}}>
            <span style={{width:40,height:40,borderRadius:12,background:"#f6f1e4",color:"#a9823c",display:"grid",placeItems:"center",flexShrink:0}}><Star size={20} strokeWidth={1.8}/></span>
            <span style={{flex:1,minWidth:0}}>
              <span style={{display:"block",fontSize: 14.5,fontWeight:700,color:"#1f3f68"}}>சிறப்புத் திட்டம்</span>
              <span style={{display:"block",fontSize: 12,color:"#76819a"}}>{PAYMENTS_ENABLED ? "கூடுதல் வசதிகள்" : "தற்போது எல்லா வசதிகளும் இலவசம்"}</span>
            </span>
            <ChevronRight size={18} color="#a3adc2" style={{flexShrink:0}}/>
          </button>
          ) : (
            <div data-free-note style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:14,background:"#eaf5ef",border:"1px solid #cfe6da"}}>
              <ShieldCheck size={18} color="#2e7d5b" style={{flexShrink:0}}/>
              <span style={{fontSize: 13,lineHeight:1.6,color:"#27303f"}}>இந்தச் செயலியின் எல்லா வசதிகளும் தற்போது <b>இலவசம்</b>.</span>
            </div>
          )}

          <AccountExtras card={card} cardTitle={cardTitle} profileCount={profiles.length}
            onWiped={() => {
              try { ["jn_profiles_v2", "jn_backtests_v1", "jn_chart_style"].forEach((k) => localStorage.removeItem(k)); } catch (_) { /* ignore */ }
              cloudUidRef.current = null;
              profilesRef.current = []; setProfiles([]); setBacktests([]); persistBacktests([]); setFormData(blank); setHoroscope(null);
              goTo(SCREEN.HOME);
            }} />

          <p style={{textAlign:"center",fontSize: 11.5,color:"#a3adc2",margin:"14px 0 0"}}>ஜோதிட நிபுணர் · TOPPER ASTRO · பதிப்பு {APP_VERSION}</p>
        </div>
        <BottomNav active="account" onNav={handleNav} />
      </div>
    );
  }

  // ═══════ FORM ═══════
  if(screen===SCREEN.FORM) return (
    <div style={base}>
      <div style={{...container, paddingTop:18, paddingBottom:104}}>
        <BackLink onClick={()=>goTo(SCREEN.HOME)} />
        {/* தேர்ந்த கேள்வி banner — முகப்பிலிருந்து வந்தால் */}
        {homeQuestion && (
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 14px",
            background:"linear-gradient(135deg,#f2f5fb,#e8edf7)",border:"1px solid #d7dfee",borderRadius:12}}>
            <span style={{fontSize:22}}>{homeQuestion.icon}</span>
            <div style={{lineHeight:1.3}}>
              <div style={{fontSize:11.5,color:"#7d6a3f",fontWeight:600}}>உங்கள் கேள்வி</div>
              <div style={{fontSize:13.5,fontWeight:700,color:"#1f3f68"}}>{homeQuestion.q}</div>
            </div>
            <span style={{marginLeft:"auto",fontSize:11.5,color:"#7d6a3f",textAlign:"right",maxWidth:110}}>விவரம் நிரப்பினால் பதில் கிடைக்கும்</span>
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 2px",color:"#3e4c99",letterSpacing:0.5}}>ஜாதகம் பார்க்க</h2>
            <p style={{fontSize:12,color:T.accent,margin:0,fontWeight:500}}>பிறப்பு விவரங்களை உள்ளிடுக</p>
          </div>
          {profiles.length > 0 && (
            <button data-saved-link onClick={()=>goTo(SCREEN.ACCOUNT)} style={{
              background:"#ffffff",border:"1px solid #e3e8f2",borderRadius:999,padding:"8px 14px",
              color:"#1f3f68",fontSize: 12.5,fontWeight:600,cursor:"pointer",flexShrink:0
            }}>சேமித்தவை ({profiles.length}) →</button>
          )}
        </div>

        <div style={card}>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div><label style={labelStyle}>பெயர் *</label>
            <input style={inputStyle} placeholder="உங்கள் பெயர்" value={formData.name} maxLength={60}
              onChange={e=>setFormData(d=>({...d,name:e.target.value}))}/></div>
            <div><label style={labelStyle}>பிறந்த தேதி * <span style={{fontSize:12,color:"#4a5365",fontWeight:400}}>(நாள்.மாதம்.ஆண்டு)</span></label>
            <input type="text" inputMode="numeric" maxLength={10}
              style={{...inputStyle,letterSpacing:2,fontFamily:"monospace",fontSize:16}}
              placeholder="நாள்.மாதம்.ஆண்டு" value={formData.dob}
              onChange={e=>{
                const formatted = formatDateInput(e.target.value);
                setFormData(d=>({...d,dob:formatted}));
              }}/>
            {formData.dob && formData.dob.length === 10 && (
              <div style={{fontSize:12,marginTop:4,color:isValidDDMMYYYY(formData.dob)?"#58a97f":"#c0564f"}}>
                {isValidDDMMYYYY(formData.dob)
                  ? `✓ ${formData.dob}`
                  : "⚠ தவறான தேதி — சரிபார்க்கவும்"}
              </div>
            )}</div>
            <div><label style={labelStyle}>பிறந்த நேரம் * <span style={{fontSize:12,color:"#4a5365",fontWeight:400}}>(மணி:நிமிடம்)</span></label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="text" inputMode="numeric" maxLength={5}
                style={{...inputStyle, width:"46%", textAlign:"center", padding:"13px 8px", letterSpacing:2, fontFamily:"monospace", fontSize:16}}
                placeholder="06:30"
                value={formData.tob}
                onChange={e=>setFormData(d=>({...d, tob: formatTimeInput(e.target.value)}))}/>
              {/^\d{2}:\d{2}$/.test(formData.tob) && (
                <span style={{fontSize:16,color:"#58a97f"}}>✓</span>
              )}
              {/* AM/PM Toggle */}
              <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1.5px solid #c7a56830",flexShrink:0,flex:1}}>
                {["AM","PM"].map(p=>(
                  <button key={p} onClick={()=>setFormData(d=>({...d,ampm:p}))} style={{
                    flex:1,padding:"12px 10px",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                    transition:"all 0.2s",
                    background:formData.ampm===p
                      ? (p==="AM"
                        ? "linear-gradient(135deg,#c7a568,#a9823c)"
                        : "linear-gradient(135deg,#1f3f68,#35598c)")
                      : "rgba(255,255,255,0.5)",
                    color:formData.ampm===p ? "#fafbfe" : "#4a5365"
                  }}>
                    {p==="AM"?"☀ காலை":"☽ மாலை"}
                  </button>
                ))}
              </div>
            </div>
            {/* optional seconds — saved if given, ignored otherwise */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
              <input type="text" inputMode="numeric" maxLength={2}
                style={{...inputStyle, width:"46%", textAlign:"center", padding:"11px 8px", fontFamily:"monospace", fontSize:15}}
                placeholder="வினாடி"
                value={formData.sec}
                onChange={e=>setFormData(d=>({...d, sec: e.target.value.replace(/\D/g,'').slice(0,2)}))}/>
              <span style={{fontSize:12,color:"#76819a"}}>வினாடி — தெரிந்தால் மட்டும்</span>
            </div>
            <div style={{fontSize:12,color:"#4a5365",marginTop:5}}>
              {formData.ampm==="AM"?"காலை 12:00 — பிற்பகல் 11:59":"பிற்பகல் 12:00 — இரவு 11:59"}
            </div>
            </div>
            {/* பாலினம் — ஆண்→சுக்கிரன் / பெண்→குரு காரக வேறுபாடு + மாங்கல்யக் கணிப்புக்கு */}
            <div>
              <label style={labelStyle}>பாலினம் <span style={{fontSize:12,color:"#4a5365",fontWeight:400}}>(விருப்பம்)</span></label>
              <div style={{display:"flex",gap:8}}>
                {["ஆண்","பெண்"].map(g=>(
                  <button key={g} type="button" onClick={()=>setFormData(d=>({...d,gender:d.gender===g?"":g}))} style={{
                    flex:1,padding:"11px 0",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",
                    border:`1.5px solid ${formData.gender===g?"#1f3f68":"#d9e0ee"}`,
                    background:formData.gender===g?"linear-gradient(135deg,#1f3f6815,#a9823c15)":"transparent",
                    color:formData.gender===g?"#1f3f68":"#76819a"}}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div style={{position:"relative"}}>
              <label style={labelStyle}>பிறந்த இடம் <span style={{fontSize:12,color:"#4a5365",fontWeight:400}}>(ஊரைத் தேடித் தேர்ந்தெடுக்கவும்)</span></label>
              <input style={inputStyle} placeholder="எ.கா. மதுரை — தட்டச்சு செய்யவும்"
                value={formData.pob}
                onChange={e=>{
                  const val = e.target.value;
                  // Typing invalidates any previously-selected precise coordinates
                  setFormData(d=>({...d, pob:val, pobLat:null, pobLon:null, pobSource:null, pobTz:""}));
                  setPlaceDropdownOpen(false);
                  if (placeSearchTimer.current) clearTimeout(placeSearchTimer.current);
                  if (val.trim().length < 3) { setPlaceResults([]); return; }
                  setPlaceSearching(true);
                  placeSearchTimer.current = setTimeout(async () => {
                    const results = await searchPlacesOSM(val);
                    setPlaceResults(results);
                    setPlaceSearching(false);
                    setPlaceDropdownOpen(results.length > 0);
                  }, 500); // debounce — respects Nominatim's ~1 req/sec usage policy
                }}
                onBlur={()=>{ setTimeout(()=>setPlaceDropdownOpen(false), 200); }} // delay lets dropdown click register first
                onFocus={()=>{ if(placeResults.length>0) setPlaceDropdownOpen(true); }}/>

              {placeSearching && (
                <div style={{fontSize:12,marginTop:5,color:"#4a5365"}}>🔍 தேடுகிறது...</div>
              )}

              {/* Search results dropdown */}
              {placeDropdownOpen && placeResults.length > 0 && (
                <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:20,marginTop:4,
                  background:"#ffffff",border:"1.5px solid #d0d0d0",borderRadius:12,
                  boxShadow:"0 8px 32px rgba(0,0,0,0.15)",maxHeight:220,overflowY:"auto"}}>
                  {placeResults.map((r,i)=>(
                    <div key={i}
                      onMouseDown={()=>{
                        setFormData(d=>({...d, pob:r.shortLabel, pobLat:r.lat, pobLon:r.lon, pobSource:"osm", pobTz: guessBirthZone(r.countryCode, r.lat, r.lon)}));
                        setTzUnknown(!!r.countryCode && r.countryCode !== "in" && guessBirthZone(r.countryCode, r.lat, r.lon) === "");
                        setPlaceDropdownOpen(false);
                        setPlaceResults([]);
                      }}
                      style={{padding:"10px 14px",cursor:"pointer",borderBottom:i<placeResults.length-1?"1px solid #e0e0e0":"none"}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#1f3f68"}}>📍 {r.shortLabel}</div>
                      <div style={{fontSize:11.5,color:"#4a5365",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.displayName}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Status indicator */}
              {formData.pobLat != null && formData.pobLon != null ? (
                <div style={{fontSize:12,marginTop:5,color:"#58a97f"}}>
                  ✓ துல்லியமான இடம் — {formData.pobLat.toFixed(4)}°, {formData.pobLon.toFixed(4)}°
                </div>
              ) : formData.pob && formData.pob.trim() && !placeSearching && (() => {
                const geo = geocodeCity(formData.pob);
                return (
                  <div style={{fontSize:12,marginTop:5,color:geo.matched?"#1f3f68":"#c0564f"}}>
                    {geo.matched
                      ? `≈ தோராயமான இடம் — பட்டியலில் இருந்து ஊரைத் தேர்ந்தெடுத்தால் துல்லியம் கூடும்`
                      : `இந்த ஊர் கண்டறியப்படவில்லை — சென்னை இடமாகக் கொள்ளப்படும். பட்டியலில் இருந்து தேர்ந்தெடுக்கவும் அல்லது கீழே அட்சரேகை/தீர்க்கரேகை உள்ளிடவும்`}
                  </div>
                );
              })()}

              {/* நேர மண்டலம் — இந்தியாவுக்கு வெளியே பிறந்தவர்களுக்கு மட்டும் தோன்றும் */}
              {(formData.pobTz || tzUnknown || showManualGeo) && (
                <div data-tz-field style={{marginTop:8}}>
                  <label style={{...labelStyle,fontSize:12.5}}>பிறந்த இடத்தின் நேர மண்டலம்</label>
                  <select data-tz-select value={formData.pobTz || ""} onChange={e=>{ const v = e.target.value; setFormData(d=>({...d, pobTz:v})); setTzUnknown(false); }}
                    style={{...inputStyle,fontSize:13,padding:"10px 10px",appearance:"auto"}}>
                    {BIRTH_ZONES.map(([v,l])=>(<option key={v} value={v}>{l}</option>))}
                  </select>
                  <div style={{fontSize:12,marginTop:4,color:tzUnknown?"#c0564f":"#76819a",lineHeight:1.6}}>
                    {tzUnknown ? "இந்த இடம் இந்தியாவுக்கு வெளியே — சரியான நேர மண்டலத்தைத் தேர்ந்தெடுக்கவும்; இல்லையேல் லக்னம் தவறும்."
                      : "பிறந்த நேரம் அந்த ஊரின் கடிகார நேரமாகவே உள்ளிடவும். கோடைக்கால நேர மாற்றம் தானாகக் கணக்கிடப்படும்."}
                  </div>
                </div>
              )}

              {/* Manual precise lat/lon entry — for advanced users who already know exact coordinates */}
              <button type="button" onClick={()=>setShowManualGeo(v=>!v)} style={{
                background:"none",border:"none",color:"#4a5365",fontSize:12.5,cursor:"pointer",
                padding:0,marginTop:4,minHeight:36,textDecoration:"underline"
              }}>{showManualGeo?"அட்சரேகை/தீர்க்கரேகை மறை":"அட்சரேகை/தீர்க்கரேகை நேரடியாக உள்ளிட"}</button>

              {showManualGeo && (
                <div>
                  <div style={{display:"flex",gap:8,marginTop:6}}>
                    <input type="number" step="0.0001" min="-90" max="90" placeholder="அட்சரேகை (எ.கா. 9.9252)"
                      style={{...inputStyle,fontSize:12,padding:"9px 10px"}}
                      value={formData.pobSource==="manual" ? (formData.pobLat ?? "") : ""}
                      onChange={e=>{
                        const lat = e.target.value === "" ? null : parseFloat(e.target.value);
                        setFormData(d=>({...d, pobLat:lat, pobSource: lat!=null && d.pobLon!=null ? "manual" : d.pobSource}));
                      }}/>
                    <input type="number" step="0.0001" min="-180" max="180" placeholder="தீர்க்கரேகை (எ.கா. 78.1198)"
                      style={{...inputStyle,fontSize:12,padding:"9px 10px"}}
                      value={formData.pobSource==="manual" ? (formData.pobLon ?? "") : ""}
                      onChange={e=>{
                        const lon = e.target.value === "" ? null : parseFloat(e.target.value);
                        setFormData(d=>({...d, pobLon:lon, pobSource: lon!=null && d.pobLat!=null ? "manual" : d.pobSource}));
                      }}/>
                  </div>
                  {formData.pobSource==="manual" && ((formData.pobLat!=null && (formData.pobLat<-90||formData.pobLat>90)) || (formData.pobLon!=null && (formData.pobLon<-180||formData.pobLon>180))) && (
                    <div style={{fontSize:12,marginTop:4,color:"#d98aa3"}}>
                      ⚠ தவறான அட்ச, தீர்க்கரேகை — அட்சரேகை -90 முதல் 90 வரையும், தீர்க்கரேகை -180 முதல் 180 வரையும் மட்டுமே செல்லுபடியாகும். சரிசெய்யும் வரை ஊரின் பதிவு மதிப்பு பயன்படுத்தப்படும்.
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="jn-shine" style={{...btnGold,opacity:(!formData.name||!isValidDDMMYYYY(formData.dob))?0.4:1,
              pointerEvents:(!formData.name||!isValidDDMMYYYY(formData.dob))?"none":"auto"}} onClick={handleSubmit}>
              ஜாதகம் உருவாக்கு
            </button>
          </div>
        </div>
      </div>
      <BottomNav active="chart" onNav={handleNav} />
    </div>
  );

  // ═══════ LOADING ═══════
  if(screen===SCREEN.LOADING) return (
    <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",zIndex:3}}>
        <div style={{position:"relative",width:120,height:120,margin:"0 auto 28px"}}>
          <svg viewBox="0 0 120 120" style={{width:120,height:120,animation:"spin 2s linear infinite"}}>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#c7a56820" strokeWidth="2.5"/>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#c7a568" strokeWidth="2.5"
              strokeDasharray="60 280" strokeLinecap="round"/>
          </svg>
          <svg viewBox="0 0 120 120" style={{width:90,height:90,position:"absolute",top:15,left:15,animation:"spinR 3s linear infinite"}}>
            <circle cx="60" cy="60" r="40" fill="none" stroke="#a9823c30" strokeWidth="1.5"/>
            <circle cx="60" cy="60" r="40" fill="none" stroke="#a9823c" strokeWidth="1.5"
              strokeDasharray="40 210" strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:36}}>☉</div>
        </div>
        <p style={{color:"#1f3f68",fontSize:15,fontWeight:500}}>கிரக நிலைகளை கணக்கிடுகிறது...</p>
        <p style={{color:"#4a5365",fontSize:12.5,marginTop:6}}>வானியல் கணிதம் · பாரம்பரிய ஜோதிட விதிகள்</p>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:20}}>
          {[0,1,2,3,4].map(i=>(
            <div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#c7a568",
              animation:`dotP 1.2s ease-in-out ${i*0.15}s infinite`}}/>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes spinR{to{transform:rotate(-360deg);}}
        @keyframes dotP{0%,100%{opacity:0.2;transform:scale(0.8);}50%{opacity:1;transform:scale(1.3);}}
      `}</style>
    </div>
  );

  // ═══════ PREMIUM ═══════
  if(screen===SCREEN.PREMIUM) return (
    <div style={base}>
      <div style={{...container,paddingTop:24,paddingBottom:104}}>
        <BackLink onClick={()=>goTo(SCREEN.ACCOUNT)} label="என் கணக்கு" />
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:56,height:56,borderRadius:18,background:"#f4eefa",color:"#6f4c92",display:"grid",placeItems:"center",margin:"0 auto 10px"}}><Star size={28} strokeWidth={1.7}/></div>
          <h2 style={{fontSize:22,fontWeight:700,margin:"0 0 6px",color:"#6f4c92"}}>சிறப்புத் திட்டம்</h2>
          <p style={{fontSize:13,color:"#76819a",margin:0}}>முழு ஜோதிட அனுபவத்தைப் பெறுங்கள்</p>
        </div>
        {!PAYMENTS_ENABLED && (
          <div style={{fontSize: 13,color:"#2e7d5b",background:"#e9f5ee",borderRadius:14,padding:"12px 14px",marginBottom:18,lineHeight:1.6,textAlign:"center"}}>
            தற்போது எல்லா வசதிகளும் இலவசம். கட்டணத் திட்டங்கள் விரைவில் தொடங்கும்.
          </div>
        )}
        {[
          {name:"மாதாந்திர",price:"₹149",period:"/மாதம்",features:["வரம்பற்ற ஜாதகங்கள்","AI பலன்கள்","தினப்பலன்"],popular:false},
          {name:"ஆண்டு",price:"₹999",period:"/ஆண்டு",features:["எல்லா மாதாந்திர அம்சங்கள்","பரிகாரங்கள்","முன்னுரிமை ஆதரவு","திருமண பொருத்தம்"],popular:true}
        ].map((plan,i)=>(
          <div key={i} style={{...card,marginBottom:16,border:plan.popular?"1.5px solid #c7a56850":card.border,position:"relative"}}>
            {plan.popular&&(<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
              background:"linear-gradient(135deg,#1f3f68,#35598c)",color:"#fafbfe",
              fontSize:12,fontWeight:700,padding:"3px 14px",borderRadius:20}}>பிரபலமானது</div>)}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
              <h3 style={{fontSize:16,fontWeight:600,color:"#27303f",margin:0}}>{plan.name}</h3>
              <div><span style={{fontSize:26,fontWeight:700,color:"#1f3f68"}}>{plan.price}</span>
              <span style={{fontSize:12,color:"#a9823c"}}>{plan.period}</span></div>
            </div>
            {plan.features.map((f,fi)=>(<div key={fi} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{color:"#c7a568",fontSize:14}}>✓</span>
              <span style={{fontSize:13,color:"#27303f"}}>{f}</span>
            </div>))}
            <button disabled={!PAYMENTS_ENABLED} style={{...btnGold,marginTop:14,fontSize:14,opacity:PAYMENTS_ENABLED?1:0.45,cursor:PAYMENTS_ENABLED?"pointer":"default"}}>
              {PAYMENTS_ENABLED ? "தொடங்கு →" : "விரைவில் வருகிறது"}
            </button>
          </div>
        ))}
      </div>
      <BottomNav active="account" onNav={handleNav} />
    </div>
  );


  // ═══════ RESULT — ALL INFO ON ONE PAGE (Professional Software Style) ═══════
  if(screen===SCREEN.RESULT&&horoscope){
    const birthTime = formData.tob ? `${formData.tob} ${formData.ampm === "PM" ? "மாலை" : "காலை"}` : "—";

    const downloadPDF = async () => {
      await loadPdfImage();
      const h = horoscope;
      const fmtD = (d) => d ? d.toLocaleDateString("ta-IN") : "";
      // ── ஓலை-style section builder ──
      // cls = நிற வகுப்பு: ஒவ்வொரு பகுதிக்கும் தனி நிறம் — PDF-இல் பகுதிகள்
      // நன்கு தெரியும்படி பிரிந்து, நல்ல இடைவெளியுடன் அமையும்
      const sec = (icon, title, inner, cls) => `<div class="sec ${cls||"cMaroon"}"><div class="sec-hd"><span class="sec-ic">${icon}</span><span>${title}</span><span class="sec-lace">✦ ✦ ✦</span></div><div class="sec-in">${inner}</div></div>`;
      // PDF-இல் ஒரு "மேலும் ஆழமான" பகுதி சேர்வது: user அதை app-இல் திறந்து பார்த்திருந்தால் மட்டுமே
      const ifViewed = (key, part) => viewedViews.has(key) ? part : "";

      // 1. நிராயண ஸ்புடங்கள்
      const pRows = h.placements.map((p,i)=>{
        const lord = getNakshatraLord(p.nakIdx);
        const flags = `${p.isRetrograde && p.ta !== "ராகு" && p.ta !== "கேது" ? ' <span style="color:#c00;font-size:9px">℞</span>' : ""}${p.isCombust ? ' <span style="color:#fff;background:#b85c00;font-size:7px;padding:0 2px;border-radius:2px;font-weight:700">அஸ்</span>' : ""}`;
        return `<tr${i%2?' class="alt"':''}><td>${p.ta}${flags}</td><td class="mono">${p.dms||p.fullLong}</td><td>${p.rashi}</td><td>${p.nakshatraTa||""} - ${p.pada||""}</td><td style="color:#7b1c1c">${lord.name}</td></tr>`;
      }).join("");

      // 2. Charts
      const rashiSVG = chartSVGString(h.placements, h.lagna, "ராசி", false);
      // நவாம்ச லக்னம் — கிரகங்களின் அதே (rashi×9+part)%12 formula, பின்ன டிகிரியுடன்
      const nDegExact = h.lagnaFullLong != null ? h.lagnaFullLong % 30 : (h.lagnaDeg||0);
      const nPart = Math.min(8, Math.floor(nDegExact/(30/9)));
      const navLagna2 = (h.lagna*9 + nPart) % 12;
      const navSVG = navamsaData ? chartSVGString(navamsaData, navLagna2, "நவாம்சம்", true) : "";
      // (ராசி + நவாம்சம் — இரண்டு சக்கரங்கள் மட்டும்; D10 வேண்டுமெனில் app-இல் பார்க்கலாம்)

      // 3. லக்னவாரி சுப/பாபர் + மாரக/பாதக
      const fnPart = functionalNature ? sec("⚖","லக்னவாரி சுப-பாபர்",
        `<table class="pt"><thead><tr><th>கிரகம்</th><th>இயல்பு</th><th>காரணம்</th></tr></thead><tbody>` +
        Object.entries(functionalNature).map(([ta,fn],i)=>`<tr${i%2?' class="alt"':''}><td>${ta}</td><td style="font-weight:700;color:${fn.nature==="யோககாரகன்"||fn.nature==="சுபன்"?"#1b5e20":fn.nature==="பாபன்"?"#a02020":"#6b5a13"}">${fn.nature==="யோககாரகன்"?"👑 யோககாரகன்":fn.nature}</td><td style="font-size:9px">${fn.reasons.join(" • ")}</td></tr>`).join("") +
        `</tbody></table>` +
        (marakaBadhaka ? `<div class="olainote">☠ <b>மாரகாதிபதிகள் (2,7):</b> ${marakaBadhaka.marakaLords.join(", ")}${marakaBadhaka.occupants27.length?` • மாரக ஸ்தானத்தில்: ${marakaBadhaka.occupants27.join(", ")}`:""} &nbsp;|&nbsp; <b>பாதகாதிபதி:</b> ${marakaBadhaka.badhakaLord} (${marakaBadhaka.lagnaType} → ${marakaBadhaka.badhakaHouse}ஆம் வீடு)</div>` : ""), "cPurple") : "";

      // 4. ஷட்பலம்
      const sbPart = shadBala ? sec("💪","ஷட்பலம்",
        `<table class="pt"><thead><tr><th>கிரகம்</th><th>ஸ்தான</th><th>திக்</th><th>கால</th><th>சேஷ்டா</th><th>நைசர்.</th><th>திருக்</th><th>மொத்தம்/தேவை</th><th>நிலை</th><th>இஷ்ட/கஷ்ட</th></tr></thead><tbody>` +
        shadBala.map((s,i)=>`<tr${i%2?' class="alt"':''}><td>${s.ta}</td><td>${Math.round(s.sthanaBala)}</td><td>${Math.round(s.digBala)}</td><td>${Math.round(s.kalaBala)}</td><td>${Math.round(s.cheshtaBala)}</td><td>${Math.round(s.naisargikaBala)}</td><td>${Math.round(s.drikBala)}</td><td class="mono">${Math.round(s.total)}/${s.required}</td><td style="color:${s.strong?"#1b5e20":"#a02020"};font-weight:700">${s.status}</td><td class="mono">${s.ishtaPhala}/${s.kashtaPhala}</td></tr>`).join("") +
        `</tbody></table>`, "cGreen") : "";

      // 5. அஷ்டகவர்க்கம் (SAV)
      const savPart = (ashtakavargaData && ashtakavargaData.sav) ? sec("🔢","சர்வாஷ்டகவர்க்கம்",
        `<table class="pt"><thead><tr>${RASHIS.map(r=>`<th style="font-size:8.5px;padding:4px 3px">${r}</th>`).join("")}</tr></thead><tbody><tr>` +
        ashtakavargaData.sav.map(v=>`<td style="text-align:center;font-weight:700;color:${v>=30?"#1b5e20":v<=25?"#a02020":"#333"}">${v}</td>`).join("") +
        `</tr></tbody></table><div class="olainote">30+ பரல் = வலுவான ராசி • 25- = பலவீனம் • மொத்தம் 337</div>`, "cOrange") : "";

      // 6. அவஸ்தைகள்
      const avPart = avasthasData ? sec("🌗","கிரக அவஸ்தைகள்",
        `<table class="pt"><thead><tr><th>கிரகம்</th><th>பாலாதி</th><th>தீப்தாதி</th><th>ஜாக்ரதாதி</th></tr></thead><tbody>` +
        avasthasData.map((a,i)=>`<tr${i%2?' class="alt"':''}><td>${a.ta} <span style="font-size:8px;color:#888">${a.rashi} ${a.degree}°</span></td><td>${a.baladi.name} (~${a.baladi.pct}%)</td><td>${a.deeptadi} — <span style="font-size:9px">${a.deeptadiDesc}</span></td><td>${a.jagradadi}</td></tr>`).join("") +
        `</tbody></table>`, "cSlate") : "";

      // 7. கிரக சூழல்
      const pcPart = planetContext ? sec("🔗","கிரக சூழல் — மற்ற கிரகங்களால் பலன் மாற்றம்",
        planetContext.map(pc=>`<div class="olabox"><b>${pc.symbol} ${pc.ta}</b> — ${pc.rashi}, ${pc.house}ஆம் வீடு (${pc.nakshatraTa||""}${pc.pada?`-${pc.pada}`:""}) <span style="float:right;font-weight:700;color:${pc.net>=2?"#1b5e20":pc.net<=-2?"#a02020":"#6b5a13"}">${pc.verdict}</span><div style="font-size:9px;line-height:1.7;margin-top:2px">${pc.chain.map(c=>`<span style="color:${c.score>0?"#1b5e20":c.score<0?"#8a4a00":"#555"}">• ${c.k}: ${c.text}</span>`).join("<br>")}</div></div>`).join(""), "cRose") : "";

      // 8. பாவ பலம்
      const bbPart = bhavaBalaData ? sec("🏠","பாவ பலம் — வீட்டு வலிமை",
        `<table class="pt"><thead><tr><th>வீடு</th><th>அதிபதி</th><th>அதிபதி பலம்</th><th>திக்</th><th>திருஷ்டி</th><th>மொத்தம்</th><th>நிலை</th></tr></thead><tbody>` +
        bhavaBalaData.map((b,i)=>`<tr${i%2?' class="alt"':''}><td>${b.houseNum} (${b.houseRashi})</td><td>${b.lordName}</td><td>${b.lordBala}</td><td>${b.digBala}</td><td>${b.drishtiBala}</td><td style="font-weight:700">${b.total}</td><td style="color:${b.verdict==="பலமுள்ளது"?"#1b5e20":b.verdict==="பலவீனம்"?"#a02020":"#6b5a13"};font-weight:700">${b.verdict}</td></tr>`).join("") +
        `</tbody></table>`, "cOlive") : "";

      // 9. யோகங்கள் & தோஷங்கள்
      const allYogas = [...(mahapurushaYogas||[]).map(y=>({icon:"👑",name:y.name,type:"yoga",desc:`${y.planet} ${y.house}ஆம் வீட்டில் — ${y.effect}`})), ...(classicalYogas||[])];
      const yogaPart = allYogas.length ? sec("🕉","யோகங்கள் & தோஷங்கள்",
        allYogas.map(y=>`<div class="olabox" style="border-left-color:${y.type==="dosha"?"#a02020":"#1b5e20"}"><b>${y.icon||""} ${y.name}</b> <span style="font-size:8.5px;color:${y.type==="dosha"?"#a02020":"#1b5e20"}">[${y.type==="dosha"?"தோஷம்":"யோகம்"}]</span><div style="font-size:9.5px;color:#4a3a20">${y.desc||""}</div></div>`).join("") +
        (kalaSarpa?.present?`<div class="olabox" style="border-left-color:#a02020"><b>🐍 ${kalaSarpa.type}</b> — ${kalaSarpa.direction}<div style="font-size:9px">பரிகாரம்: ${kalaSarpa.remedy}</div></div>`:"") +
        (chevvaiDosham?`<div class="olabox" style="border-left-color:${chevvaiDosham.present&&!chevvaiDosham.cancelled?"#a02020":"#1b5e20"}"><b>🔴 செவ்வாய் தோஷம்:</b> ${chevvaiDosham.present?(chevvaiDosham.cancelled?`உண்டு ஆனால் நிவர்த்தி (${chevvaiDosham.cancelReason})`:`உண்டு (${chevvaiDosham.severityText||""})`):"இல்லை"}</div>`:""), "cTeal") : "";

      // 10. தசா — MD table + நடப்பு MD-இன் புக்திகள்
      const now = new Date();
      const dashaRows = dashaData ? dashaData.dashas.map((d,i)=>{
        const cur = now >= d.startDate && now < d.endDate;
        return `<tr${cur?' style="background:#e8dcb0;font-weight:700"':(i%2?' class="alt"':'')}><td>${d.name}${cur?' <span style="font-size:9px;color:#1b5e20">(நடப்பு)</span>':""}</td><td style="text-align:center">${d.years} ஆண்டு</td><td>${fmtD(d.startDate)}</td><td>${fmtD(d.endDate)}</td></tr>`;
      }).join("") : "";
      const curMD = dashaData?.dashas.find(d=>now>=d.startDate&&now<d.endDate);
      const bhuktiRows = curMD?.antardashas ? curMD.antardashas.map((a,i)=>{
        const cur = now >= a.startDate && now < a.endDate;
        return `<tr${cur?' style="background:#e8dcb0;font-weight:700"':(i%2?' class="alt"':'')}><td>${curMD.name} / ${a.name}${cur?' <span style="font-size:9px;color:#1b5e20">(நடப்பு)</span>':""}</td><td>${fmtD(a.startDate)}</td><td>${fmtD(a.endDate)}</td></tr>`;
      }).join("") : "";
      const dashaPart = dashaData ? sec("📅","விம்சோத்தரி தசா",
        `<div class="olainote">பிறப்பு நட்சத்திரம்: <b>${dashaData.birthNakshatra}</b> • நாதன்: <b>${dashaData.birthLord.name}</b></div>` +
        `<table class="pt"><thead><tr><th>மகா தசை</th><th style="text-align:center">காலம்</th><th>தொடக்கம்</th><th>முடிவு</th></tr></thead><tbody>${dashaRows}</tbody></table>` +
        (bhuktiRows?`<div style="height:6px"></div><table class="pt"><thead><tr><th>நடப்பு தசையின் புக்திகள்</th><th>தொடக்கம்</th><th>முடிவு</th></tr></thead><tbody>${bhuktiRows}</tbody></table>`:""), "cBlue") : "";

      // 11. வரிசை-நிபந்தனை
      const seqPart = (sequenceLinks && sequenceLinks.length) ? sec("⛓","வரிசை-நிபந்தனை பலன்கள் — எது எதற்குப் பின்",
        sequenceLinks.map(lk=>`<div class="olabox"><b>${lk.icon} ${lk.afterTa}</b> <span style="font-size:8.5px;color:#7b1c1c">[${lk.strengthTa}]</span><div style="font-size:10px">${lk.text}</div><div style="font-size:9px;color:#7b1c1c">📐 ${lk.how}${lk.dashaNote?` — <span style="color:#1b5e20">${lk.dashaNote}</span>`:""}</div></div>`).join(""), "cBrown") : "";

      // 12. Deep analysis (திருமணம்/ஆரோக்கியம்/தொழில்)
      const kaPart = keyAreas ? sec("🔮","முக்கிய வாழ்க்கைப் பகுதி பகுப்பாய்வு",
        ["marriage","health","career"].map(k=>{ const a=keyAreas[k]; if(!a) return "";
          return `<div class="olabox"><b>${a.icon} ${a.area}</b> — <span style="font-weight:700">${a.verdict}</span><div style="font-size:9.5px;margin-top:2px">${a.summary||""}</div>${(a.factors||[]).slice(0,6).map(f=>`<div style="font-size:9px;color:${(f.weight||0)>0?"#1b5e20":"#8a4a00"}">• ${f.text}</div>`).join("")}</div>`; }).join(""), "cCrimson") : "";

      // 13. குடும்பம் & உடல்நலம்
      const fhPart = familyHealthData ? sec("👨‍👩‍👧","குடும்பம் & உடல்நல குறியீடுகள்",
        `<div class="olabox"><b>👫 சகோதரர்கள்:</b> ${familyHealthData.siblings.lean}</div>` +
        `<div class="olabox"><b>👶 குழந்தைகள்:</b> ${familyHealthData.children.restriction?"⚠ சந்ததியில் தடை/குறைவு சாத்தியம்":"சுமூக குறியீடு"}<div style="font-size:9px">${familyHealthData.children.detail}</div></div>` +
        (familyHealthData.healthTendencies.length?`<div class="olabox"><b>🩺 நோய் நாட்டம்:</b>${familyHealthData.healthTendencies.map(t=>`<div style="font-size:9.5px">• ${t.planet} பலவீனம் → ${t.area}</div>`).join("")}</div>`:""), "cTeal") : "";

      // 14. பரிகாரம்
      const remPart = (remediesData && remediesData.length) ? sec("💎","பரிகாரங்கள்",
        `<table class="pt"><thead><tr><th>கிரகம்</th><th>கிழமை</th><th>மந்திரம்</th><th>கோயில்</th><th>தானம்</th></tr></thead><tbody>` +
        remediesData.filter(r=>r.needsRemedy).map((r,i)=>`<tr${i%2?' class="alt"':''}><td>${r.ta}</td><td>${r.day}</td><td style="font-size:9px">${r.mantra}</td><td style="font-size:9px">${r.temple}</td><td style="font-size:9px">${r.donate}</td></tr>`).join("") +
        `</tbody></table>`, "cGold") : "";

      // 15. AI கணிப்பு
      const aiPart = prediction ? sec("🤖","AI ஜோதிட பலன்", `<p style="font-size:11px;line-height:2;white-space:pre-wrap">${escapeHtml(prediction)}</p>`, "cPurple") : "";

      // 16. ஒருங்கிணைந்த கிரக பலம் — view-இல் பார்த்திருந்தால்
      const unifiedPart = unifiedStrength ? sec("🧩","ஒருங்கிணைந்த கிரக பலம்",
        `<table class="pt"><thead><tr><th>கிரகம்</th><th>மதிப்பு</th><th>நிலை</th><th>ஆதாரங்கள்</th><th>குறிப்புகள்</th></tr></thead><tbody>` +
        unifiedStrength.map((u,i)=>`<tr${i%2?' class="alt"':''}><td>${u.symbol} ${u.ta}<div style="font-size:8px;color:#888">${u.rashi}, ${u.house}ஆம் வீடு</div></td><td style="font-weight:700;color:${u.tierColor}">${u.composite}/100</td><td style="font-weight:700;color:${u.tierColor}">${u.tier}</td><td style="font-size:8.5px">${u.reasons.join("<br>")}</td><td style="font-size:8.5px;color:#8a4a00">${u.flags.join(", ")}</td></tr>`).join("") +
        `</tbody></table>`, "cTeal") : "";

      // 17. நட்சத்திர-பாவக இணைப்பு — view-இல் பார்த்திருந்தால் (4 உட்பிரிவுகளும் நிறம் பிரிந்து)
      const nakBhavaPart = (nakBhavaData && nakBhavaData!=="loading") ? sec("⭐","நட்சத்திர-பாவக இணைப்பு • பார்வை • கோசார காலம் • பரிகாரம்",
        nakBhavaData.houses.filter(hs=>!hs.isEmpty).map(hs=>
          `<div class="olabox" style="border-left-color:#303f9f;background:#fbfaf3">
            <b style="color:#303f9f">${hs.houseNum}ஆம் வீடு (${hs.houseRashi}) — ${hs.theme}</b>` +
          hs.occupants.map(oc=>{
            const vColor = oc.verdict.startsWith("சுபம்") ? "#1b5e20" : oc.verdict.startsWith("அசுபம்") ? "#a02020" : "#8a6d00";
            return `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #c9b585">
              <b>${oc.symbol} ${oc.ta}</b>${oc.star?` — ${oc.star.nak}${oc.star.pada?`-${oc.star.pada}`:""} (அதிபதி: ${oc.star.starLord})`:""} <span style="float:right;font-weight:700;color:${vColor}">${oc.verdict}</span>
              ${oc.star?`<div style="background:#eef0fa;border:1px solid #c5cae9;border-radius:4px;padding:4px 8px;margin:4px 0;font-size:9.5px;line-height:1.7">🔗 <b>பாவகத் தொடர்பு:</b> ${oc.star.text}${oc.linkPower&&oc.linkPower.star!=null?`<br>⚡ <b>செயல்திறன்:</b> ${oc.ta} ${oc.linkPower.self??"—"}/100 • நட்சத்திராதிபதி ${oc.star.starLord} ${oc.linkPower.star}/100`:""}${oc.kp?`<br>🎯 ${oc.kp.text}`:""}${oc.bhavaPos?`<br>🏠 ${oc.bhavaPos.text}`:""}</div>`:""}
              ${oc.aspects.length?`<div style="background:#fdf6e6;border:1px solid #e8d5a0;border-radius:4px;padding:4px 8px;margin:4px 0;font-size:9.5px;line-height:1.7"><b>👁 பார்வைகள் (ஸ்புட திருஷ்டி அளவுடன்):</b> ${oc.aspects.map(a=>`<span style="color:${a.tone==="சுபம்"?"#1b5e20":a.tone==="அசுபம்"?"#a02020":"#8a6d00"}">${a.from} (${a.nature}${a.isSpecial?", சிறப்பு":""}${a.virupa!=null?` • ${a.virupa}/60 ${a.grade}`:""}) — ${a.text}</span>`).join("<br>")}</div>`:`<div style="font-size:9px;color:#888;margin:3px 0">👁 பார்வை இல்லை — தன் இயல்பிலேயே பலன்</div>`}
              ${(oc.jupWindows.length||oc.satWindows.length)?`<div style="background:#edf5ea;border:1px solid #c5dcc0;border-radius:4px;padding:4px 8px;margin:4px 0;font-size:9.5px;line-height:1.7"><b style="color:#33691e">📅 கோசார பலன் காலங்கள் (நாள்-அளவு):</b><br>${[...oc.jupWindows.map(w=>({...w,sym:"♃",col:"#1b5e20"})),...oc.satWindows.map(w=>({...w,sym:"♄",col:"#7a5200"}))].map(w=>`<span style="color:${w.col}">${w.sym} <b>${w.label}</b> — ${w.text}</span>${w.dasha?`<br><span style="font-size:8.5px">⏳ தசை-இணைவு [${w.dasha.conf}]: ${w.dasha.text}</span>`:""}${w.vedha?`<br><span style="font-size:8.5px;color:${w.vedha.vedha?"#a02020":"#33691e"}">🛡 ${w.vedha.text}</span>`:""}${w.bav?`<br><span style="font-size:8.5px;color:#5a4a20">🔢 ${w.bav.text}</span>`:""}${w.triggers&&w.triggers.length?`<br><span style="font-size:8.5px;color:#7b1c1c;font-weight:700">⚡ தூண்டல் நாட்கள்: ${w.triggers.map(tg=>`${tg.planet==="சூரியன்"?"☉":"♂"} ${tg.label}`).join(" • ")} (±1-2 நாள்)</span>`:""}`).join("<br>")}</div>`:""}
              ${oc.touches&&oc.touches.length?`<div style="background:#eef0fa;border:1px solid #c5cae9;border-radius:4px;padding:4px 8px;margin:4px 0;font-size:9px;line-height:1.7"><b style="color:#303f9f">🎯 கூர்மையான தொடுகைகள் (நட்சத்திரம் / ஸ்புடம் ±1°):</b><br>${oc.touches.map(tc=>`<span style="color:${tc.type==="டிகிரி"?"#7b1c1c":"#303f9f"}">${tc.type==="டிகிரி"?"🔥":"⭐"} <b>${tc.label}</b> — ${tc.text}</span>`).join("<br>")}</div>`:""}
              ${oc.remedies.length?`<div style="background:#fdeef0;border:1px solid #eabfc7;border-radius:4px;padding:4px 8px;margin:4px 0;font-size:9.5px;line-height:1.7"><b style="color:#a02020">🙏 பரிகாரம்:</b><br>${oc.remedies.map(r=>`<b>${r.planet} கிரக பரிகாரம்</b> <i style="font-size:8.5px;color:#8a5a30">(எதற்காக: ${r.why})</i><br>📿 ${r.mantra} — ${r.count} • 🛕 ${r.temple}<br>🎁 ${r.day} அன்று ${r.donate} தானம் • 💎 ${r.gem}`).join("<br>")}</div>`:`<div style="font-size:8.5px;color:#33691e;margin:3px 0">🙏 பரிகாரம் தேவையில்லை — இணைப்பும் பார்வைகளும் சுபம்</div>`}
            </div>`;
          }).join("") + `</div>`).join("") +
        ``, "cIndigo") : "";

      // Extra panchanga row values
      const gulikaRow = gulikaData ? `<tr><td>குளிகன் (மாந்தி)</td><td>: ${gulikaData.rashi} ${gulikaData.degInSign}° — ${gulikaData.nakshatra} (${gulikaData.timeLabel})</td></tr>` : "";
      const sensNote = btSensitivity ? btSensitivity.map(w=>`<div class="olainote" style="border-color:#a02020;color:#a02020">⚠ ${w.text}</div>`).join("") : "";

      const html = `<!DOCTYPE html><html lang="ta"><head><meta charset="UTF-8"/><title>${escapeHtml(formData.name)} — முழு ஜாதகம்</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Serif+Tamil:wght@600;700&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans Tamil',sans-serif;background:#e8dcc0;color:#3a2a10;padding:18px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
/* ── ஓலைச்சுவடி (palm-leaf) page ── */
.page{max-width:760px;margin:0 auto;background:linear-gradient(180deg,#f6ecce 0%,#f0e3ba 50%,#eaddb0 100%);border:3px double #8b5a2b;border-radius:8px;overflow:hidden;box-shadow:0 6px 30px #0003}
.ola-edge{height:10px;background:repeating-linear-gradient(90deg,#8b5a2b 0 6px,#b8894a 6px 12px,#8b5a2b 12px 18px)}
.hdr{background:linear-gradient(180deg,#7b1c1c,#5d1414);text-align:center;padding:18px 20px 14px;border-bottom:3px solid #d4a853}
.hdr h1{font-size:22px;color:#f6ecce;font-family:'Noto Serif Tamil',serif;letter-spacing:1px}
.hdr .nm{font-size:17px;color:#f0c75e;font-weight:700;margin-top:3px}
.hdr .sub{font-size:9px;color:#f0c75e99;letter-spacing:3px;margin-top:4px}
.body{padding:18px 22px}
/* ── பகுதி — ஒவ்வொன்றுக்கும் தனி நிறம் (--sc தலைப்பு, --sc2 அலங்காரம், --tint பின்னணி),
     நல்ல இடைவெளி (28px) — பகுதிகள் நன்கு பிரிந்து தெரியும் ── */
.sec{margin-bottom:28px;page-break-inside:avoid;border:1.5px solid var(--sc,#7b1c1c);border-radius:8px;overflow:hidden;background:var(--tint,#fdf6e6)}
.sec-hd{display:flex;align-items:center;gap:8px;background:linear-gradient(90deg,var(--sc,#7b1c1c),var(--sc2,#9a3020));color:#fffdf2;font-family:'Noto Serif Tamil',serif;font-size:13px;font-weight:700;padding:7px 12px;border-left:6px solid var(--sc2,#d4a853)}
.sec-in{padding:10px 12px}
.cMaroon{--sc:#7b1c1c;--sc2:#a8552a;--tint:#fdf6e6}
.cBrown{--sc:#5d4020;--sc2:#a8763a;--tint:#f8f1e2}
.cBlue{--sc:#1e4f7a;--sc2:#4a86b8;--tint:#eef4fa}
.cGreen{--sc:#1b5e20;--sc2:#5a9e50;--tint:#eef6ec}
.cPurple{--sc:#5e2a7e;--sc2:#9068b0;--tint:#f5effa}
.cOrange{--sc:#b35900;--sc2:#dd9040;--tint:#fdf2e4}
.cTeal{--sc:#00695c;--sc2:#3a9a8c;--tint:#e8f4f2}
.cRose{--sc:#8e2444;--sc2:#c06080;--tint:#faeef2}
.cIndigo{--sc:#303f9f;--sc2:#6a78c8;--tint:#eef0fa}
.cOlive{--sc:#5e5e10;--sc2:#9a9a48;--tint:#f6f6e6}
.cCrimson{--sc:#8b1030;--sc2:#c05068;--tint:#fbeef0}
.cSlate{--sc:#37474f;--sc2:#708790;--tint:#eff3f4}
.cGold{--sc:#8a6d00;--sc2:#c0a030;--tint:#faf5e0}
.sec-lace{margin-left:auto;color:#d4a853;font-size:9px;letter-spacing:4px}
.info-tbl{width:100%;border-collapse:collapse;font-size:11.5px}
.info-tbl td{padding:4px 8px;border-bottom:1px dashed #c9b585}.info-tbl td:first-child{color:#7b1c1c;font-weight:700;width:38%}
table.pt{width:100%;border-collapse:collapse;font-size:10px;border:1.5px solid #8b5a2b;background:#faf3dc}
table.pt th{background:#7b1c1c;color:#f6ecce;padding:5px 6px;text-align:left;font-size:9.5px}
table.pt td{padding:4px 6px;border-bottom:1px solid #dcc99a}
table.pt tr.alt td{background:#f3e9c8}
.mono{font-family:monospace}
.olabox{background:#faf3dc;border:1px solid #d9c48c;border-left:4px solid #b8894a;border-radius:4px;padding:6px 10px;margin-bottom:6px;font-size:10.5px;page-break-inside:avoid}
.olainote{background:#f3e9c8;border:1px dashed #b8894a;border-radius:4px;padding:5px 10px;margin:6px 0;font-size:9.5px;color:#5a4520}
.charts{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.charts>div{flex:1;min-width:280px;max-width:340px;background:#fffdf2;border:2px solid #8b5a2b;border-radius:6px;padding:6px}
.ftr{background:#5d1414;color:#f0c75e;text-align:center;padding:12px;font-size:9px;line-height:1.8;border-top:3px solid #d4a853}
@media print{body{padding:0;background:#fff}.page{border:none;box-shadow:none;max-width:100%}.no-print{display:none!important}.sec{page-break-inside:avoid}}
.btn{position:fixed;bottom:20px;right:20px;background:#7b1c1c;color:#f6ecce;border:2px solid #d4a853;border-radius:30px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans Tamil',sans-serif;box-shadow:0 4px 16px #0004}
</style></head><body><div class="page">
<div class="ola-edge"></div>
<div class="hdr"><img src="${MURUGAN_IMG}" alt="முருகன்" style="width:70px;height:70px;object-fit:contain;border-radius:50%;border:2px solid #d4a853;margin-bottom:6px;"/>
<h1>✦ ஸ்ரீ ஜாதக ஓலை ✦</h1><div class="nm">${escapeHtml(formData.name)}</div>
<div class="sub">முழு ஜாதகம் • தமிழ் ஜோதிடம்</div></div>
<div class="body">
${sec("📋","பிறப்பு & பஞ்சாங்க விவரம்",`<table class="info-tbl">
<tr><td>பெயர்</td><td>: ${escapeHtml(formData.name)}</td></tr>
<tr><td>பிறந்த நாள் / நேரம்</td><td>: ${formData.dob} • ${birthTime}</td></tr>
<tr><td>பிறந்த இடம்</td><td>: ${escapeHtml(formData.pob||"—")}</td></tr>
<tr><td>உதய லக்னம்</td><td>: ${h.lagnaName} — ${h.lagnaNakshatra||""}, பாதம் ${h.lagnaPada||""}</td></tr>
<tr><td>ராசி / விண்மீன்</td><td>: ${h.moonRashi} / ${h.nakshatra}, பாதம் ${h.nakshatraPada||1}</td></tr>
<tr><td>திதி / கரணம் / யோகம்</td><td>: ${h.tithi||""}, ${h.paksham||""} / ${h.karanam||"—"} / ${h.yogam||"—"}</td></tr>
${gulikaRow}
${tamilDate?`<tr><td>தமிழ் தேதி (சௌரம்)</td><td>: ${tamilDate.display||`${tamilDate.month||""} ${tamilDate.day||""}`}</td></tr>`:""}
</table>${sensNote}`)}
${sec("🕉","ராசி • நவாம்ச சக்கரங்கள்",`<div class="charts"><div>${rashiSVG}</div>${navSVG?`<div>${navSVG}</div>`:""}</div>`,"cBrown")}
${sec("🪐","நிராயண ஸ்புடங்கள்",`<table class="pt"><thead><tr><th>கிரகம்</th><th>தீர்காம்சம்</th><th>ராசி</th><th>நட்சத்திரம்-பாதம்</th><th>நட்சத்திராதிபதி</th></tr></thead><tbody>
<tr style="background:#e8dcb0;font-weight:700"><td>லக்னம்</td><td class="mono">${h.lagnaDMS||""}</td><td>${h.lagnaName}</td><td>${h.lagnaNakshatra||""} - ${h.lagnaPada||""}</td><td></td></tr>
${pRows}</tbody></table>`)}
${dashaPart}
${kaPart}
${fhPart}
${(() => {
  // ── கூடுதல் ஆழ்பகுதிகள் — app-இல் select செய்து பார்த்தவை மட்டும் ──
  const extras = [
    ifViewed("unified", unifiedPart),
    ifViewed("nakbhava", nakBhavaPart),
    ifViewed("funcnature", fnPart),
    ifViewed("planetcontext", pcPart),
    ifViewed("shadbala", sbPart),
    ifViewed("ashtakavarga", savPart),
    ifViewed("avasthas", avPart),
    ifViewed("bhavabala", bbPart),
    (viewedViews.has("yogas") || viewedViews.has("kalasarpa") || viewedViews.has("chevvai")) ? yogaPart : "",
    ifViewed("sequence", seqPart),
    ifViewed("remedies", remPart),
  ].filter(Boolean).join("");
  return extras;
})()}
${aiPart}
</div>
<div class="ftr">🕉 ஜோதிட நிபுணர் — முழு ஜாதக ஓலை<br>${(AYANAMSA_SYSTEMS[ayanamsaKey]||AYANAMSA_SYSTEMS.lahiri).name} அயனாம்சம் • உருவாக்கம்: ${new Date().toLocaleDateString("ta-IN")}</div>
<div class="ola-edge"></div>
</div><button class="btn no-print" onclick="window.print()">📄 PDF சேமி / அச்சிடு</button></body></html>`;
      try {
        const blob = new Blob([html],{type:'text/html;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const opened = window.open(url,'_blank');
        setTimeout(()=>URL.revokeObjectURL(url),10000);
        if (!opened) throw new Error("popup-blocked");
      } catch(e) {
        const w = window.open('','_blank');
        if(w){w.document.write(html);w.document.close();}
        else alert("புதிய சாளரம் தடுக்கப்பட்டுள்ளது. இந்தத் தளத்துக்குப் புதிய சாளரங்களை உலாவியில் அனுமதித்துவிட்டு மீண்டும் முயலுங்கள்.");
      }
    };

    // ஆழ்பகுதி தேர்வு — PDF-க்காக பதிவு + நட்சத்திர-பாவக இணைப்பை முதல் தேர்விலேயே கணி
    const pickAdvancedView = (v) => {
      setAdvancedView(v);
      // திறந்து பார்த்த பகுதிகள் மட்டுமே PDF-இல் சேரும்
      if (v) setViewedViews(prev => { const n = new Set(prev); n.add(v); return n; });
      if (v === "nakbhava" && !nakBhavaData && horoscope && chartMeta) {
        // Computed server-side (Swiss-precise) — the browser only receives the finished analysis.
        setNakBhavaData("loading");
        (async () => {
          try {
            const geoNB = chartMeta?.geo || resolveBirthGeo(formData);
            const nb = await apiNakBhava(buildBirth(chartMeta?.dobISO || parseDDMMYYYY(formData.dob), chartMeta?.finalTime || "06:00", geoNB));
            setNakBhavaData(nb);
          } catch (e) { setNakBhavaData(null); }
        })();
      }
      window.scrollTo({ top: 0 });
    };
    const secTitle = { fontSize: 15, fontWeight:700, color:"#1f3f68", marginBottom:10 };
    const chipBase = { fontSize: 12, fontWeight:600, padding:"4px 11px", borderRadius:999, lineHeight:1.5 };
    const toggleArea = (k) => setOpenAreas(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

    return (
      <div style={base}>
        <div style={{...container,paddingTop:16,paddingBottom:104}} className="jn-in">

          {/* ═══ HERO — premium name banner ═══ */}
          <div style={{
            position:"relative", overflow:"hidden", borderRadius:20, marginBottom:14,
            padding:"22px 20px", textAlign:"center",
            background:"linear-gradient(135deg, #2a4d7e 0%, #1f3f68 48%, #16304f 100%)",
            boxShadow:"0 14px 34px -12px rgba(31,63,104,0.55)"
          }}>
            <div style={{position:"absolute",inset:0,opacity:0.16,pointerEvents:"none",
              background:"radial-gradient(120px 120px at 85% 15%, #f7e2a6, transparent), radial-gradient(160px 160px at 10% 110%, #e2d2a8, transparent)"}}/>
            <div style={{position:"relative",zIndex:1}}>
              <div style={{fontSize:12.5,letterSpacing:4,color:"#f7e2a6",fontWeight:600,marginBottom:6}}>✦ ஜாதக விவரம் ✦</div>
              <h2 className="jn-serif" style={{fontSize:26,fontWeight:700,margin:"0 0 8px",color:"#f6f8fc",letterSpacing:0.5}}>{formData.name}</h2>
              <div style={{display:"inline-flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                {[horoscope.lagnaName+" லக்னம்", horoscope.moonRashi+" ராசி", horoscope.nakshatra].map((chip,i)=>(
                  <span key={i} style={{fontSize:12.5,fontWeight:600,color:"#16304f",background:"linear-gradient(180deg,#f7e2a6,#e2d2a8)",
                    padding:"4px 11px",borderRadius:20,boxShadow:"0 2px 6px rgba(0,0,0,0.12)"}}>{chip}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ உள்-tabs: சுருக்கம் | கட்டம் | பலன்கள் | தசா | ஆழம் ═══ */}
          <div className="jn-tabs" style={{display:"flex",gap:3,marginBottom:14,overflowX:"auto",scrollbarWidth:"none"}}>
            {[["summary","சுருக்கம்"],["chart","கட்டம்"],["palan","பலன்கள்"],["dasha","தசா"],["remedy","பரிகாரம்"],["deep","ஆழம்"]].map(([k,l])=>(
              <button key={k} data-tab={k} onClick={()=>{ setResultTab(k); window.scrollTo({top:0}); }} style={{
                flex:"1 0 auto",padding:"9px 2px",borderRadius:999,fontSize:"clamp(11.5px, 3.1vw, 12.5px)",fontWeight:resultTab===k?700:500,cursor:"pointer",whiteSpace:"nowrap",
                border:resultTab===k?"1px solid #1f3f68":"1px solid #e3e8f2",
                background:resultTab===k?"#1f3f68":"#ffffff",color:resultTab===k?"#ffffff":"#4a5365"}}>{l}</button>
            ))}
          </div>

          {/* ═══ சுருக்கம் — முக்கிய முடிவுகள் மட்டும்; விவரம் அந்தந்த tab-இல் ═══ */}
          {resultTab==="summary" && (<>
            {keyAreas && (
              <div style={{...card,marginBottom:12,padding:"16px 16px 6px"}}>
                <div style={secTitle}>முக்கிய முடிவுகள்</div>
                {["marriage","career","health"].map((k,i,arr)=>{
                  const a = keyAreas[k]; if(!a) return null;
                  const st = AREA_STYLE[k]; const Icon = st.icon;
                  return (
                    <button key={k} onClick={()=>{ setOpenAreas(new Set([k])); setResultTab("palan"); window.scrollTo({top:0}); }} style={{
                      display:"flex",alignItems:"center",gap:12,width:"100%",textAlign:"left",background:"none",borderTop:"none",borderLeft:"none",borderRight:"none",
                      borderBottom:i<arr.length-1?"1px solid #eef1f6":"none",padding:"12px 0",cursor:"pointer"}}>
                      <span style={{width:40,height:40,borderRadius:12,background:st.tint,color:st.color,display:"grid",placeItems:"center",flexShrink:0}}><Icon size={20} strokeWidth={1.8}/></span>
                      <span style={{flex:1,minWidth:0}}>
                        <span style={{display:"block",fontSize: 12,color:"#76819a"}}>{st.short}</span>
                        <span style={{display:"block",fontSize: 14.5,fontWeight:700,color:calmTone(a.verdictColor),lineHeight:1.45}}>{stripEmoji(a.verdict)}</span>
                      </span>
                      <ChevronRight size={18} color="#a3adc2" style={{flexShrink:0}}/>
                    </button>
                  );
                })}
              </div>
            )}

            {bhavaPhalam?.dashaContext && (()=>{
              const dc = bhavaPhalam.dashaContext;
              const md = dashaData?.dashas?.find(d=>d.isCurrent);
              return (
                <button onClick={()=>{ setResultTab("dasha"); window.scrollTo({top:0}); }} style={{...card,display:"flex",alignItems:"center",gap:12,width:"100%",textAlign:"left",marginBottom:12,padding:"14px 16px",cursor:"pointer"}}>
                  <span style={{width:40,height:40,borderRadius:12,background:"#f6f1e4",color:"#a9823c",display:"grid",placeItems:"center",flexShrink:0}}><Hourglass size={20} strokeWidth={1.8}/></span>
                  <span style={{flex:1,minWidth:0}}>
                    <span style={{display:"block",fontSize: 12,color:"#76819a"}}>நடப்பு தசை</span>
                    <span style={{display:"block",fontSize: 14.5,fontWeight:700,color:"#1f3f68",lineHeight:1.45}}>{dc.mahaLord} தசை{dc.antarLord ? ` · ${dc.antarLord} புக்தி` : ""}</span>
                    {md && <span style={{display:"block",fontSize: 12,color:"#76819a"}}>{fmtDateTa(md.endDate)} வரை</span>}
                  </span>
                  <ChevronRight size={18} color="#a3adc2" style={{flexShrink:0}}/>
                </button>
              );
            })()}

            {bhavaPhalam && (bhavaPhalam.yogaList.length > 0 || bhavaPhalam.doshaList.length > 0) && (
              <div style={{...card,marginBottom:12,padding:"16px"}}>
                <div style={secTitle}>யோகங்கள் & தோஷங்கள்</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {bhavaPhalam.yogaList.map((y,i)=>(<span key={"y"+i} style={{...chipBase,background:"#e9f5ee",color:"#2e7d5b"}}>{stripEmoji(y)}</span>))}
                  {bhavaPhalam.doshaList.map((y,i)=>(<span key={"d"+i} style={{...chipBase,background:"#fbeeed",color:"#c0564f"}}>{stripEmoji(y)}</span>))}
                </div>
                <button onClick={()=>{ setResultTab("deep"); pickAdvancedView("yogas"); }} style={{background:"none",border:"none",padding:0,marginTop:4,minHeight:40,fontSize: 13,fontWeight:600,color:"#1f3f68",cursor:"pointer"}}>விவரம் பார்க்க →</button>
              </div>
            )}

            {/* AI பலன் + PDF */}
            {!prediction && !predictionLoading && (
              <button style={{...btnGold,marginBottom:10,fontSize: 14.5,padding:"14px 0",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
                onClick={fetchAIPrediction}><Sparkles size={18}/> AI ஜோதிட பலன் பெறு</button>
            )}
            {predictionLoading&&(<div style={{...card,marginBottom:10,textAlign:"center",padding:16}}>
              <div style={{width:24,height:24,margin:"0 auto 8px",border:"2px solid #c7a56820",borderTop:"2px solid #c7a568",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              <div style={{fontSize: 12,color:"#76819a"}}>பலன் தயாராகிறது…</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
            </div>)}
            {prediction&&(<div style={{...card,marginBottom:10,padding:"16px"}}>
              <div style={secTitle}>AI ஜோதிட பலன்</div>
              <div style={{fontSize: 14,lineHeight:1.85,color:"#27303f",whiteSpace:"pre-wrap"}}>{prediction}</div>
              <AiTextFooter onReport={(reason, comment) => sendReport({ kind: "answer", mode: "predict", question: "AI ஜோதிட பலன்", answer: prediction, reason, comment, app: APP_VERSION })} />
            </div>)}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button data-pdf onClick={downloadPDF} style={{...btnOutline,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize: 13.5,padding:"13px 0"}}>
                <FileText size={17}/> PDF பதிவிறக்கு
              </button>
              <button data-share onClick={()=>shareOut(`${formData.name} — ஜாதகச் சுருக்கம்`, [
                `${formData.name} — ஜாதகச் சுருக்கம்`,
                `லக்னம்: ${horoscope.lagnaName} · ராசி: ${horoscope.moonRashi} · நட்சத்திரம்: ${horoscope.nakshatra}`,
                ...(keyAreas ? ["marriage","career","health"].filter(k=>keyAreas[k]).map(k=>`${AREA_STYLE[k].short}: ${stripEmoji(keyAreas[k].verdict)}`) : []),
                bhavaPhalam?.dashaContext ? `நடப்பு தசை: ${bhavaPhalam.dashaContext.mahaLord}${bhavaPhalam.dashaContext.antarLord ? " / " + bhavaPhalam.dashaContext.antarLord + " புக்தி" : ""}` : "",
                "— ஜோதிட நிபுணர்",
              ].filter(Boolean).join("\n"))} style={{...btnOutline,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize: 13.5,padding:"13px 0"}}>
                <Share2 size={17}/> பகிர்
              </button>
            </div>
          </>)}

          {/* ═══ கட்டம் — பிறப்பு விவரம், ராசி/நவாம்சம், ஸ்புடங்கள், அதிர்ஷ்டம் ═══ */}
          {resultTab==="chart" && (<>
          {/* ═══ 1. BIRTH DETAILS ═══ */}
          <div style={{...card,marginBottom:10,padding:"12px 14px",fontSize:12}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>
                {[
                  ["பெயர்",formData.name],["பிறந்த நாள்",formData.dob],["பிறந்த நேரம்",birthTime],
                  ["பிறந்த இடம்",formData.pob||"—"],["உதய லக்னம்",horoscope.lagnaName],["ராசி",horoscope.moonRashi],
                  ["விண்மீன்",`${horoscope.nakshatra}, பாதம் ${horoscope.nakshatraPada||1}`],
                  ...(()=>{ const sy = NAME_SYLLABLES[NAKSHATRAS.indexOf(horoscope.nakshatra)]?.[(horoscope.nakshatraPada||1)-1]; return sy ? [["பெயர் எழுத்து", sy[0]]] : []; })(),
                  ["நிலவு நாள்(திதி)",`${horoscope.tithi||""}, ${horoscope.paksham||""}`],
                  ["கரணம்",horoscope.karanam||"—"],["யோகம்",horoscope.yogam||"—"],
                  ...(gulikaData ? [["குளிகன் (மாந்தி)",`${gulikaData.rashi} ${gulikaData.degInSign}° — ${gulikaData.nakshatra} (${gulikaData.timeLabel})`]] : []),
                ].map(([l,v],i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #eef1f6"}}>
                    <td style={{padding:"4px 0",color:"#a9823c",width:"42%",fontWeight:600,fontSize:12.5}}>{l}</td>
                    <td style={{padding:"4px 0",color:"#76819a",width:10}}>:</td>
                    <td style={{padding:"4px 6px",color:"#27303f",fontWeight:600,fontSize:12.5}}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* பிறப்பு நேர நுண்ணுணர்வு எச்சரிக்கை — லக்னம்/நட்சத்திரம் எல்லைக்கு அருகில் */}
            {btSensitivity && btSensitivity.map((w, wi) => (
              <div key={wi} style={{marginTop:8,padding:"7px 10px",borderRadius:6,fontSize:12,lineHeight:1.6,
                background:w.level==="high"?"#fde8e8":"#fff8e1",
                border:`1px solid ${w.level==="high"?"#f5c6c6":"#ffe082"}`,
                color:w.level==="high"?"#c0564f":"#7d6a3f"}}>
                ⚠ {w.text}
              </div>
            ))}
            {/* தமிழ் தேதி — optional toggle */}
            <div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #c7a56850"}}>
              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13,minHeight:40}}>
                <input type="checkbox" checked={showTamilDate} onChange={e=>setShowTamilDate(e.target.checked)} style={{cursor:"pointer",width:20,height:20,accentColor:"#1f3f68",flexShrink:0}}/>
                <span style={{color:"#1f3f68",fontWeight:600}}>தமிழ் தேதி காட்டு (சௌர மானம்)</span>
              </label>
              {showTamilDate && tamilDate && (
                <div style={{marginTop:6,padding:"6px 10px",background:"#fff8e8",borderRadius:6,fontSize:12}}>
                  <span style={{color:"#a9823c",fontWeight:600}}>தமிழ் தேதி:</span>{" "}
                  <span style={{color:"#1f3f68",fontWeight:700}}>{tamilDate.month} {tamilDate.day}</span>
                  <div style={{fontSize:11.5,color:"#76819a",marginTop:2,fontStyle:"italic"}}>
                    சூரியன் {RASHIS[tamilDate.monthIdx]} ராசியில் — திருக்கணித சௌர மான முறை
                  </div>
                </div>
              )}
              {showTamilDate && !tamilDate && (
                <div style={{marginTop:6,fontSize:12,color:"#76819a"}}>தமிழ் தேதி கணக்கிட முடியவில்லை</div>
              )}
            </div>
          </div>
          <div style={{...card,marginBottom:10,padding:8}}>
            <div style={{display:"flex",gap:6,justifyContent:"center",margin:"4px 0 10px"}}>
              {[[false,"தென்னிந்திய கட்டம்"],[true,"வட இந்திய கட்டம்"]].map(([v,l])=>(
                <button key={l} data-chart-style={v?"north":"south"} onClick={()=>pickChartStyle(v)} style={{minHeight:38,padding:"0 16px",borderRadius:999,fontSize: 12.5,fontWeight:northChart===v?700:500,cursor:"pointer",
                  border:northChart===v?"1px solid #a9823c":"1px solid #e3e8f2",background:northChart===v?"#f6f1e4":"#ffffff",color:northChart===v?"#7d6a3f":"#4a5365"}}>{l}</button>
              ))}
            </div>
            <TraditionalChart horoscope={horoscope} navamsaData={navamsaData} title="ராசி" showNavamsa={true} gulika={gulikaData?.rashiIdx ?? null} north={northChart}/>
            {northChart && <div style={{fontSize: 11.5,color:"#76819a",textAlign:"center",margin:"6px 8px 4px",lineHeight:1.5}}>மேல் நடு = 1ஆம் வீடு (லக்னம்); இடஞ்சுழியாக 2 முதல் 12 வரை. எண்கள் ராசியைக் குறிக்கும் (1 = மேஷம்).</div>}
          </div>

          {/* ═══ 3. PLANETARY POSITIONS TABLE ═══ */}
          <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#3e4c99",marginBottom:8,borderBottom:"2px solid #5565b830",borderLeft:"3px solid #5565b8",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>நிராயண ஸ்புடங்கள்</div>
            <div className="jn-xscroll" style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,tableLayout:"fixed"}}>
                <colgroup><col style={{width:"21%"}}/><col style={{width:"20%"}}/><col style={{width:"17%"}}/><col style={{width:"25%"}}/><col style={{width:"17%"}}/></colgroup>
                <thead><tr style={{borderBottom:"1.5px solid #c7a56840"}}>
                  <th style={{padding:"5px 2px",color:"#a9823c",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                  <th style={{padding:"5px 2px",color:"#a9823c",fontWeight:700,textAlign:"center"}}>பாகை</th>
                  <th style={{padding:"5px 2px",color:"#a9823c",fontWeight:700,textAlign:"left"}}>ராசி</th>
                  <th style={{padding:"5px 2px",color:"#a9823c",fontWeight:700,textAlign:"left"}}>நட்சத்திரம்</th>
                  <th style={{padding:"5px 2px",color:"#a9823c",fontWeight:700,textAlign:"left"}}>அதிபதி</th>
                </tr></thead>
                <tbody>
                  {(()=>{
                    const lagnaNakIdx = NAKSHATRAS.indexOf(horoscope.lagnaNakshatra);
                    const lagnaLord = getNakshatraLord(lagnaNakIdx);
                    return (
                      <tr style={{borderBottom:"1px solid #e0e0e0",background:"#f1f4fa"}}>
                        <td style={{padding:"5px 2px",fontWeight:700,color:"#1f3f68"}}>லக்னம்</td>
                        <td style={{padding:"5px 2px",textAlign:"center",color:"#27303f",fontVariantNumeric:"tabular-nums",fontSize:12}}>{horoscope.lagnaDMS}</td>
                        <td style={{padding:"5px 2px",color:"#1f3f68"}}>{horoscope.lagnaName}</td>
                        <td style={{padding:"5px 2px",color:"#27303f"}}>{horoscope.lagnaNakshatra} - {horoscope.lagnaPada}</td>
                        <td style={{padding:"5px 2px",color:"#7d6a3f",fontWeight:600}}>{lagnaLord.name}</td>
                      </tr>
                    );
                  })()}
                  {horoscope.placements.map((p,i)=>{
                    const lord = getNakshatraLord(p.nakIdx);
                    return (
                      <tr key={i} style={{borderBottom:"1px solid #eef1f6",background:i%2?"#f6f8fc":"transparent"}}>
                        <td style={{padding:"5px 2px",color:"#27303f",fontWeight:600}}>
                          {p.ta}
                          {p.isRetrograde && p.ta !== "ராகு" && p.ta !== "கேது" && <span style={{color:"#c0564f",fontSize:11.5,marginLeft:2}} title="வக்ரம்">℞</span>}
                          {p.isCombust && <span style={{color:"#fff",background:"#d98a4a",fontSize:11,marginLeft:2,padding:"0 3px",borderRadius:2,fontWeight:700}} title="அஸ்தங்கம்">அ</span>}
                          {p.isMoolaTri && <span style={{color:"#2e7d5b",fontSize:11,marginLeft:2}} title="மூலத்திரிகோணம்">மூ</span>}
                        </td>
                        <td style={{padding:"5px 2px",textAlign:"center",color:"#27303f",fontVariantNumeric:"tabular-nums",fontSize:12}}>{p.dms}</td>
                        <td style={{padding:"5px 2px",color:"#1f3f68",fontWeight:600}}>{p.rashi}</td>
                        <td style={{padding:"5px 2px",color:"#27303f"}}>{p.nakshatraTa} - {p.pada}</td>
                        <td style={{padding:"5px 2px",color:"#7d6a3f",fontWeight:600}}>{lord.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {dashaData&&(<div style={{marginTop:8,padding:"6px 8px",background:"#e9edf6",borderRadius:6,borderLeft:"3px solid #2e8b84",fontSize:12.5,color:"#226b66",fontWeight:600}}>
              தசை இருப்பு: {dashaData.birthLord.name} {dashaData.dashas[0]?.years} வருடம்
            </div>)}
          </div>

          {/* ═══ 3.1 அதிர்ஷ்ட எண்கள் & ராசி கற்கள் (Birth-based) ═══ */}
          {(()=>{
            const moonRashiIdx = RASHIS.indexOf(horoscope.moonRashi);
            const lucky = RASHI_LUCKY[moonRashiIdx >= 0 ? moonRashiIdx : 0];
            const nakIdx = NAKSHATRAS.indexOf(horoscope.nakshatra);
            const nakLord = getNakshatraLord(nakIdx);
            return (
              <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#9d5f38",marginBottom:10,borderBottom:"2px solid #c07a4a30",borderLeft:"3px solid #c07a4a",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                  அதிர்ஷ்ட விவரங்கள் & ராசி கற்கள்
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{background:"#dcc27e08",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:11.5,color:"#4a5365",marginBottom:2}}>அதிர்ஷ்ட எண்கள்</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#1f3f68",letterSpacing:4}}>
                      {lucky.nums.join("  ")}
                    </div>
                    <div style={{fontSize:11,color:"#4a5365",marginTop:2}}>ராசி அடிப்படை (நிரந்தரம்)</div>
                  </div>
                  <div style={{background:"#eceff7",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:11.5,color:"#4a5365",marginBottom:2}}>அதிர்ஷ்ட திசை</div>
                    <div style={{fontSize:14,fontWeight:700,color:"#a9823c"}}>{lucky.dir}</div>
                    <div style={{fontSize:11,color:"#4a5365",marginTop:2}}>சாதகமான திசை</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{background:"linear-gradient(135deg,#c7a56808,#a9823c10)",borderRadius:8,padding:"8px 10px",border:"1px solid #c7a56818"}}>
                    <div style={{fontSize:11.5,color:"#4a5365",marginBottom:2}}>ராசி ரத்தினம்</div>
                    <div style={{fontSize:12.5,fontWeight:700,color:"#1f3f68"}}>{lucky.gem}</div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#a9823c10,#c7a56808)",borderRadius:8,padding:"8px 10px",border:"1px solid #a9823c25"}}>
                    <div style={{fontSize:11.5,color:"#4a5365",marginBottom:2}}>உப ரத்தினம்</div>
                    <div style={{fontSize:12.5,fontWeight:700,color:"#a9823c"}}>{lucky.subGem}</div>
                  </div>
                </div>
                <div style={{fontSize:11.5,color:"#76819a",lineHeight:1.6,margin:"-4px 0 10px"}}>ராசி ரத்தினம் பொதுக் குறிப்பு மட்டும் — அணியும் முன் "பரிகாரம்" பகுதியில் உங்கள் லக்னத்துக்கான தீர்ப்பைப் பாருங்கள்.</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"#58a97f08",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:11.5,color:"#4a5365",marginBottom:2}}>அதிர்ஷ்ட நிறம்</div>
                    <div style={{fontSize:12.5,fontWeight:700,color:"#58a97f"}}>{lucky.color}</div>
                  </div>
                  <div style={{background:"#dcc27e08",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:11.5,color:"#4a5365",marginBottom:2}}>நட்சத்திர அதிபதி</div>
                    <div style={{fontSize:12.5,fontWeight:700,color:"#1f3f68"}}>{nakLord.name}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          </>)}

          {/* ═══ ஆழம் — வகை வாரியான பட்டியல்; தட்டினால் அந்தப் பகுப்பாய்வு மட்டும் ═══ */}
          {resultTab==="deep" && !advancedView && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{...secTitle,marginBottom:4}}>ஆழமான பகுப்பாய்வுகள்</div>
              <div style={{fontSize: 12.5,color:"#76819a",marginBottom:14,lineHeight:1.6}}>ஒரு பகுதியைத் தட்டினால் அதன் முழு விவரம் திறக்கும்.</div>
              {DEEP_GROUPS.map(g=>(
                <div key={g.title} style={{marginBottom:16}}>
                  <div style={{fontSize: 12.5,fontWeight:700,color:g.color,marginBottom:7}}>{g.title}</div>
                  <div style={{border:"1px solid #e3e8f2",borderRadius:14,overflow:"hidden"}}>
                    {g.items.map(([k,l],i)=>(
                      <button key={k} data-deep={k} onClick={()=>pickAdvancedView(k)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,width:"100%",
                        padding:"12px 14px",background:"#ffffff",borderLeft:"none",borderRight:"none",borderBottom:"none",borderTop:i?"1px solid #eef1f6":"none",cursor:"pointer",textAlign:"left",fontSize: 13.5,color:"#27303f"}}>
                        <span>{l}</span><ChevronRight size={16} color="#a3adc2" style={{flexShrink:0}}/>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {resultTab==="deep" && advancedView && (
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <button data-deep-back onClick={()=>{ setAdvancedView(""); window.scrollTo({top:0}); }} style={{background:"#ffffff",border:"1px solid #e3e8f2",borderRadius:999,color:"#1f3f68",fontSize: 13,cursor:"pointer",padding:"7px 14px",fontWeight:600,flexShrink:0}}>← பட்டியல்</button>
            </div>
          )}

          {/* ═══ பலன்கள் ═══ */}
          {resultTab==="palan" && (<>
          {/* ═══ 3.4 பாவ பலன் — பகுதி வாரியாக: முடிவு மேலே, முழு விவரம் தட்டினால் மட்டும் ═══ */}
          {bhavaPhalam && bhavaPhalam.areas.map((area, ai) => {
            // Deep verdict (marriage/health/career) — அந்தப் பகுதியின் ஒருங்கிணைந்த முடிவு
            const ka = keyAreas ? keyAreas[area.key] : null;
            const st = AREA_STYLE[area.key] || AREA_STYLE.self;
            const Icon = st.icon;
            const open = openAreas.has(area.key);
            // முக்கிய காரணிகள் — எடை அதிகமான மூன்று; மீதி "முழு விவரம்"-இல்
            const topFactors = ka ? [...ka.factors].filter(f=>f.weight).sort((x,y)=>Math.abs(y.weight)-Math.abs(x.weight)).slice(0,3) : [];
            const restFactors = ka ? ka.factors.filter(f=>!topFactors.includes(f)) : [];
            const factorRow = (f, fi) => (
              <div key={fi} style={{fontSize: 13,color:"#4a5365",marginBottom:6,lineHeight:1.6,display:"flex",gap:8}}>
                <span style={{color:f.weight>0?"#2e7d5b":f.weight<0?"#c0564f":"#a3adc2",fontWeight:700,flexShrink:0,fontSize: 11,paddingTop:3}}>{f.weight>0?"▲":f.weight<0?"▼":"•"}</span>
                <span>{taText(f.text)}</span>
              </div>
            );
            const lordLine = (hr) => hr.lordInfo.lordHouse ? (
              <div style={{fontSize: 12.5,color:"#4a5365",lineHeight:1.6}}>
                அதிபதி <b>{hr.lordInfo.lordName}</b> {hr.lordInfo.lordHouse}ஆம் வீட்டில்
                {hr.lordVerdict && <span style={{color:(hr.lordVerdict.includes("பலமாக")||hr.lordVerdict.includes("நல்ல"))?"#2e7d5b":(hr.lordVerdict.includes("பலவீன")||hr.lordVerdict.includes("துஸ்தான"))?"#c0564f":"#4a5365"}}> — {hr.lordVerdict.split(" • ")[0]}</span>}
              </div>
            ) : null;
            return (
              <div key={ai} data-area={area.key} style={{...card,marginBottom:10,padding:"16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <span style={{width:36,height:36,borderRadius:11,background:st.tint,color:st.color,display:"grid",placeItems:"center",flexShrink:0}}><Icon size={18} strokeWidth={1.8}/></span>
                  <div style={{fontSize: 15,fontWeight:700,color:"#1f3f68",flex:1,lineHeight:1.4}}>{area.ta}</div>
                </div>

                {ka ? (<>
                  <div style={{fontSize: 14.5,fontWeight:700,color:calmTone(ka.verdictColor),marginBottom:6,lineHeight:1.5}}>{stripEmoji(ka.verdict)}</div>
                  {ka.chips && ka.chips.length > 0 && (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                      {ka.chips.map((c,ci)=>(
                        <span key={ci} style={{...chipBase,
                          background:c.tone==="bad"?"#fbeeed":c.tone==="warn"?"#f6f1e4":c.tone==="good"?"#e9f5ee":"#eef1fb",
                          color:c.tone==="bad"?"#c0564f":c.tone==="warn"?"#7d6a3f":c.tone==="good"?"#2e7d5b":"#3e4c99"}}>{stripEmoji(c.label)}</span>
                      ))}
                    </div>
                  )}
                  <div style={{fontSize: 13,color:"#4a5365",lineHeight:1.7,whiteSpace:"pre-line",marginBottom:10}}>{taText(String(ka.summary||"").split(" (குறிப்பு:")[0])}</div>
                  {topFactors.map(factorRow)}
                </>) : (
                  area.houseReadings.map((hr, hi) => (
                    <div key={hi} style={{marginBottom:8}}>
                      <div style={{fontSize: 12,color:"#76819a",marginBottom:3}}>{hr.houseNum}ஆம் வீடு · {hr.houseRashi}</div>
                      {hr.occupants.length > 0 ? hr.occupants.map((occ, oi) => (
                        <div key={oi} style={{fontSize: 13,color:"#4a5365",marginBottom:4,lineHeight:1.65}}>
                          <b style={{color:"#27303f"}}>{occ.planet}</b> — {taText(occ.effect)}
                        </div>
                      )) : lordLine(hr)}
                    </div>
                  ))
                )}

                <button data-area-toggle={area.key} onClick={()=>toggleArea(area.key)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",
                  padding:"0",marginTop:4,minHeight:40,fontSize: 13,fontWeight:600,color:"#1f3f68",cursor:"pointer"}}>
                  {open ? "விவரத்தை மறை" : "முழு விவரம்"}
                  <ChevronDown size={16} style={{transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                </button>

                {open && (
                  <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #eef1f6"}}>
                    {restFactors.length > 0 && (<>
                      <div style={{fontSize: 12,fontWeight:700,color:"#76819a",marginBottom:8}}>மற்ற காரணிகள்</div>
                      {restFactors.map(factorRow)}
                    </>)}

                    {/* வாழ்க்கைத் துணை விவரம் (திருமணம் மட்டும்) */}
                    {ka?.spouseProfile && (
                      <div style={{margin:"10px 0",padding:"12px",background:"#f8f9fc",borderRadius:12}}>
                        <div style={{fontSize: 13,fontWeight:700,color:"#27303f",marginBottom:6}}>வாழ்க்கைத் துணை</div>
                        {ka.spouseProfile.traits.map((t,ti)=>(
                          <div key={ti} style={{fontSize: 12.5,color:"#4a5365",lineHeight:1.7}}><b>{t.planet}</b>: {t.trait}</div>
                        ))}
                        <div style={{fontSize: 12.5,color:"#4a5365",lineHeight:1.7,marginTop:2}}>
                          திசை: <b>{ka.spouseProfile.direction||"—"}</b>{ka.spouseProfile.distance ? ` · ${ka.spouseProfile.distance}` : ""}
                        </div>
                      </div>
                    )}
                    {/* திரிதோஷம் (ஆரோக்கியம் மட்டும்) */}
                    {ka?.tridosha && (
                      <div style={{margin:"10px 0",padding:"12px",background:"#f8f9fc",borderRadius:12}}>
                        <div style={{fontSize: 13,fontWeight:700,color:"#27303f",marginBottom:6}}>
                          உடலியல் தோஷக் கணிப்பு: <span style={{color:"#c0564f"}}>{ka.tridosha.dominant} மிகுதி</span>{ka.tridosha.close ? ` (இணை: ${ka.tridosha.close})` : ""}
                        </div>
                        <div style={{fontSize: 12.5,color:"#4a5365",lineHeight:1.7}}>சாத்தியப் பாதிப்புகள்: {ka.tridosha.effects}</div>
                        {ka.healthMeta && (
                          <div style={{fontSize: 12.5,color:"#4a5365",lineHeight:1.7,marginTop:2}}>
                            மூலம்: {ka.healthMeta.origin}<br/>காலத் தன்மை: {taText(ka.healthMeta.chronicity)}
                          </div>
                        )}
                        <div style={{fontSize: 11.5,color:"#76819a",marginTop:4}}>இது ஜோதிடக் குறியீடு — மருத்துவ ஆலோசனைக்கு மாற்று அல்ல.</div>
                      </div>
                    )}

                    <div style={{fontSize: 12,fontWeight:700,color:"#76819a",margin:"12px 0 8px"}}>வீடு வாரியான குறிப்புகள்</div>
                    {area.houseReadings.map((hr, hi) => (
                      <div key={hi} style={{marginBottom:12}}>
                        <div style={{fontSize: 13,color:"#27303f",fontWeight:700,marginBottom:4}}>
                          {hr.houseNum}ஆம் வீடு ({hr.houseTheme.ta}) · {hr.houseRashi}
                        </div>
                        {/* இவ்வீட்டில் உள்ள கிரகங்கள் — பாரம்பரியப் பலன் */}
                        {hr.occupants.length > 0 ? hr.occupants.map((occ, oi) => {
                          const pc = planetContext?.find(x => x.ta === occ.planet);
                          return (
                            <div key={oi} style={{fontSize: 12.5,color:"#4a5365",marginBottom:5,lineHeight:1.65}}>
                              <b style={{color:"#27303f"}}>{occ.planet}</b>
                              {occ.condition && <span style={{color:/நீசம்|பகை|அஸ்தங்கம்/.test(occ.condition)?"#c0564f":/உச்சம்|சொந்த|ஆட்சி|மூலத்திரிகோண/.test(occ.condition)?"#2e7d5b":"#76819a"}}> ({occ.condition})</span>}
                              {ka && <span> — {taText(occ.effect)}</span>}
                              {pc && <div style={{fontSize: 12,color:"#76819a"}}>மற்ற கிரகங்களின் தாக்கம்: <b style={{color:pc.net>=2?"#2e7d5b":pc.net<=-2?"#c0564f":"#4a5365"}}>{pc.verdict}</b></div>}
                            </div>
                          );
                        }) : (
                          <div style={{fontSize: 12.5,color:"#76819a",marginBottom:4}}>இந்த வீட்டில் கிரகம் இல்லை.</div>
                        )}
                        {/* இவ்வீட்டின் மீது விழும் கிரகப் பார்வைகள் */}
                        {hr.aspectors && hr.aspectors.length > 0 && hr.aspectors.map((asp, api) => (
                          <div key={api} style={{fontSize: 12.5,color:"#4a5365",lineHeight:1.65,display:"flex",gap:8,marginBottom:3}}>
                            <span style={{color:asp.tone==="benefic"?"#2e7d5b":asp.tone==="malefic"?"#c0564f":"#a3adc2",fontSize: 9,paddingTop:5,flexShrink:0}}>●</span>
                            <span><b style={{color:"#27303f"}}>{asp.planet}</b> பார்வை ({asp.fromHouse}ஆம் வீட்டிலிருந்து) — {taText(asp.text)}</span>
                          </div>
                        ))}
                        {lordLine(hr)}
                        {/* அஷ்டகவர்க்கம் & பாவ பலம் — இவ்வீட்டின் வலிமை */}
                        {(hr.savVerdict || hr.bhavaBala) && (
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                            {hr.savVerdict && (
                              <span style={{...chipBase,fontSize: 11.5,background:hr.savPoints>=30?"#e9f5ee":hr.savPoints<=24?"#fbeeed":"#f3f5f9",
                                color:hr.savPoints>=30?"#2e7d5b":hr.savPoints<=24?"#c0564f":"#4a5365"}}>அஷ்டகவர்க்கம்: {hr.savPoints} பிந்து</span>
                            )}
                            {hr.bhavaBala && (
                              <span style={{...chipBase,fontSize: 11.5,background:hr.bhavaBala.verdict==="பலமுள்ளது"?"#e9f5ee":hr.bhavaBala.verdict==="பலவீனம்"?"#fbeeed":"#f3f5f9",
                                color:hr.bhavaBala.verdict==="பலமுள்ளது"?"#2e7d5b":hr.bhavaBala.verdict==="பலவீனம்"?"#c0564f":"#4a5365"}}>வீட்டு பலம்: {hr.bhavaBala.verdict}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* சிறப்புக் குறிப்பு (எ.கா. செவ்வாய் தோஷம்) — நடுநிலை நிறத்தில் */}
                    {area.specialNote && (
                      <div style={{fontSize: 12.5,color:area.specialNote.includes("⚠")?"#c0564f":"#4a5365",background:area.specialNote.includes("⚠")?"#fbeeed":"#f8f9fc",padding:"10px 12px",borderRadius:12,lineHeight:1.65}}>
                        {stripEmoji(area.specialNote)}
                      </div>
                    )}
                  </div>
                )}

                {/* இந்தப் பகுதிக்குரிய AI உதவியாளரிடம் மேலும் கேட்க */}
                {(()=>{
                  const ps = personaFor(PERSONA_FOR_AREA[area.key]);
                  return (
                    <button data-area-ask={ps.key} onClick={()=>{ setChatPersona(ps.key); setChatFrom("result"); setChatInitialQ(""); goTo(SCREEN.CHAT); }}
                      style={{display:"flex",alignItems:"center",gap:10,width:"100%",marginTop:10,padding:"9px 10px",minHeight:56,textAlign:"left",cursor:"pointer",
                        background:"#f5f7fb",border:"1px solid #e3e8f2",borderRadius:12,fontFamily:"inherit"}}>
                      <img src={ps.image} alt="" width="38" height="38" loading="lazy" style={{width:38,height:38,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                      <span style={{flex:1,minWidth:0}}>
                        <span style={{display:"block",fontSize: 13.5,fontWeight:700,color:"#27303f",lineHeight:1.4}}>{ps.name} · AI</span>
                        <span style={{display:"block",fontSize: 12,color:"#76819a",lineHeight:1.5}}>இந்தப் பகுதியைப் பற்றி மேலும் கேட்க</span>
                      </span>
                      <ChevronRight size={18} color="#a3adc2" style={{flexShrink:0}}/>
                    </button>
                  );
                })()}
              </div>
            );
          })}
          {/* ═══ குடும்பம் & உடல்நலக் குறியீடுகள் (சகோதரர், குழந்தைகள், நோய் நாட்டம்) ═══ */}
          {familyHealthData && (()=>{
            const fh = familyHealthData;
            const open = openAreas.has("__family");
            const row = { display:"flex", gap: 12, padding:"9px 0", borderTop:"1px solid #eef1f6", fontSize: 13, lineHeight: 1.6 };
            const lab = { width: 96, flexShrink: 0, color:"#76819a" };
            return (
              <div data-area="family" style={{...card,marginBottom:10,padding:"16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <span style={{width:36,height:36,borderRadius:11,background:"#eef1fb",color:"#5565b8",display:"grid",placeItems:"center",flexShrink:0}}><Users size={18} strokeWidth={1.8}/></span>
                  <div style={{fontSize: 15,fontWeight:700,color:"#1f3f68",flex:1,lineHeight:1.4}}>குடும்பம் & உடல்நலக் குறியீடுகள்</div>
                </div>
                <div style={{...row,borderTop:"none"}}>
                  <span style={lab}>சகோதரர்கள்</span>
                  <b style={{color:"#27303f",fontWeight:600}}>{fh.siblings.lean}</b>
                </div>
                <div style={row}>
                  <span style={lab}>குழந்தைகள்</span>
                  <b style={{fontWeight:600,color:fh.children.restriction?"#c0564f":"#2e7d5b"}}>{fh.children.restriction ? "சந்ததியில் தடை/குறைவு சாத்தியம் — கவனம்" : "பெரிய தடை இல்லை"}</b>
                </div>
                <div style={row}>
                  <span style={lab}>நோய் நாட்டம்</span>
                  <span style={{color:"#4a5365"}}>
                    {fh.healthTendencies.length > 0 ? fh.healthTendencies.map((h,i)=>(
                      <span key={i} style={{display:"block"}}><b style={{color:"#27303f"}}>{h.planet}</b> — {h.area}</span>
                    )) : <span style={{color:"#2e7d5b"}}>குறிப்பிட்ட நோய் நாட்டம் இல்லை</span>}
                  </span>
                </div>
                <button data-area-toggle="family" onClick={()=>toggleArea("__family")} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",
                  padding:"0",marginTop:4,minHeight:40,fontSize: 13,fontWeight:600,color:"#1f3f68",cursor:"pointer"}}>
                  {open ? "விவரத்தை மறை" : "முழு விவரம்"}
                  <ChevronDown size={16} style={{transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                </button>
                {open && (
                  <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #eef1f6",fontSize: 12.5,color:"#4a5365",lineHeight:1.7}}>
                    <div style={{marginBottom:8}}><b style={{color:"#27303f"}}>சகோதரர்கள் (3ஆம் வீடு):</b> {fh.siblings.lean}</div>
                    <div style={{marginBottom:8}}><b style={{color:"#27303f"}}>குழந்தைகள் (5ஆம் வீடு):</b> {fh.children.detail}</div>
                    <div style={{fontSize: 11.5,color:"#76819a"}}>இவை பாரம்பரியக் குறியீடுகள் மட்டுமே — சரியான எண்ணிக்கை/பாலினம் அல்ல; மருத்துவப் பரிசோதனைக்கு மாற்று அல்ல.</div>
                  </div>
                )}
              </div>
            );
          })()}
          </>)}

          {/* ═══ ஆழம் — தேர்ந்த பகுப்பாய்வு ═══ */}
          {resultTab==="deep" && (<>
          {/* ═══ 3.5 GRAHA BALA (Planet Strength) ═══ */}
          {advancedView==="grahabala" && grahaBala && grahaBala.length > 0 && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #c07a4a",lineHeight:1.4}}>
                கிரக பலம்
              </div>
              {grahaBala.map((g,i) => {
                const statusColor = g.status==="உச்சம்"||g.status==="சொந்த வீடு" ? "#2e7d5b"
                  : g.status==="நீசம்" ? "#c0564f"
                  : g.status==="நட்பு வீடு" ? "#a9823c" : "#27303f";
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",
                    borderBottom:i<grahaBala.length-1?"1px solid #eef1f6":"none"}}>
                    <span style={{fontSize:13.5,fontWeight:700,color:"#27303f",width:74,flexShrink:0}}>{g.ta}</span>
                    <div style={{flex:1,background:"#e9edf6",borderRadius:10,height:6,overflow:"hidden"}}>
                      <div style={{width:`${g.score*10}%`,height:"100%",background:statusColor,borderRadius:10}}/>
                    </div>
                    <span style={{fontSize:12.5,fontWeight:700,color:statusColor,width:44,textAlign:"right",flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{g.score}/10</span>
                    <span style={{fontSize:12.5,color:statusColor,width:96,textAlign:"right",flexShrink:0,whiteSpace:"nowrap"}}>{g.status}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ 3.6 YOGAS (Mahapurusha + Classical combined) ═══ */}
          {advancedView==="yogas" && (
            <>
              {mahapurushaYogas && mahapurushaYogas.length > 0 && (
                <div style={{...card,marginBottom:12,padding:"16px",border:"1px solid #dcc27e40",
                  background:"linear-gradient(135deg,rgba(212,168,83,0.08),rgba(167,139,250,0.04))"}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#99496a",marginBottom:8,borderLeft:"3px solid #b86084",paddingLeft:8,letterSpacing:0.5}}>
                    பஞ்ச மகாபுருஷ யோகம் கண்டறியப்பட்டது!
                  </div>
                  {mahapurushaYogas.map((y,i) => (
                    <div key={i} style={{marginBottom:i<mahapurushaYogas.length-1?10:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:18}}>{y.symbol}</span>
                        <span style={{fontSize:14,fontWeight:700,color:"#1f3f68"}}>{y.name}</span>
                        <span style={{fontSize:12.5,color:"#4a5365"}}>({y.house}ஆம் வீடு)</span>
                      </div>
                      <div style={{fontSize:13.5,color:"#27303f",marginTop:3,lineHeight:1.5}}>{y.effect}</div>
                    </div>
                  ))}
                </div>
              )}
              {classicalYogas && classicalYogas.length > 0 && (
                <div style={{...card,marginBottom:12,padding:"16px"}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #6b9150",lineHeight:1.4}}>
                    யோகங்கள் கண்டறியப்பட்டது ({classicalYogas.length})
                  </div>
                  {classicalYogas.map((y,i) => {
                    const isDosha = y.type === "dosha";
                    const col = isDosha ? "#c0564f" : "#1f3f68";
                    return (
                      <div key={i} style={{
                        marginBottom:i<classicalYogas.length-1?10:0, padding:"8px 10px",
                        background:`${col}08`, borderLeft:`3px solid ${col}`, borderRadius:"0 6px 6px 0"
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:14,color:"#76819a"}}>{stripEmoji(y.icon)}</span>
                          <span style={{fontSize:13,fontWeight:700,color:col}}>{y.name}</span>
                          {isDosha && <span style={{fontSize:12,background:"#d98aa320",color:"#c0564f",padding:"1px 6px",borderRadius:10,marginLeft:"auto",fontWeight:700}}>தோஷம்</span>}
                        </div>
                        <div style={{fontSize:13,color:"#27303f",marginTop:4,lineHeight:1.6}}>{y.desc}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              {(!mahapurushaYogas || mahapurushaYogas.length===0) && (!classicalYogas || classicalYogas.length===0) && (
                <div style={{...card,marginBottom:10,padding:"14px",textAlign:"center",fontSize:13.5,color:"#4a5365"}}>
                  இந்த ஜாதகத்தில் மேற்குறிப்பிட்ட யோகங்கள் எதுவும் கண்டறியப்படவில்லை
                </div>
              )}
            </>
          )}

          {/* ═══ 3.7 ASHTAKAVARGA — SARVASHTAKAVARGA ═══ */}
          {advancedView==="ashtakavarga" && ashtakavargaData && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #8a62b0",lineHeight:1.4}}>
                சர்வாஷ்டகவர்க்கம்
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
                {ashtakavargaData.sav.map((count,i) => {
                  const strong = count > ashtakavargaData.savAvg + 2;
                  const weak = count < ashtakavargaData.savAvg - 2;
                  const col = strong ? "#2e7d5b" : weak ? "#c0564f" : "#a9823c";
                  return (
                    <div key={i} style={{
                      background:`${col}10`, border:`1px solid ${col}30`, borderRadius:12,
                      padding:"6px 4px", textAlign:"center"
                    }}>
                      <div style={{fontSize:12,color:"#4a5365"}}>{RASHIS[i].slice(0,3)}</div>
                      <div style={{fontSize:14,fontWeight:700,color:col}}>{count}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:12.5,color:"#76819a",marginTop:8,lineHeight:1.5}}>
                சராசரி: {ashtakavargaData.savAvg} பிந்து/வீடு • பச்சை=வலிமை (கோசாரத்துக்கு நல்லது) • சிவப்பு=பலவீனம் • மொத்தம்: 337 பிந்துக்கள்
              </div>
            </div>
          )}

          {/* ═══ 3.8 GRAHA DRISHTI — PLANETARY ASPECTS ═══ */}
          {advancedView==="drishti" && drishtiData && drishtiData.length > 0 && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #5565b8",lineHeight:1.4}}>
                கிரக திருஷ்டி
              </div>
              {drishtiData.map((a,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",
                  borderBottom:i<drishtiData.length-1?"1px solid #eef1f6":"none"}}>
                  <span style={{fontSize:15}}>{a.fromSymbol}</span>
                  <span style={{fontSize:13.5,color:"#27303f",width:60}}>{a.from}</span>
                  <span style={{fontSize:13,color:"#a9823c"}}>→</span>
                  <span style={{fontSize:15}}>{a.toSymbol}</span>
                  <span style={{fontSize:13.5,color:"#27303f",flex:1}}>{a.to}</span>
                  <span style={{
                    fontSize:12.5,fontWeight:600,padding:"2px 7px",borderRadius:10,
                    background:a.isSpecial?"#f0d6d3":"#e9dcc0",
                    color:a.isSpecial?"#1f3f68":"#4a5365"
                  }}>{a.houseOffset}ஆம் வீடு{a.isSpecial?" (சிறப்பு)":""}</span>
                </div>
              ))}
            </div>
          )}

          {/* ═══ 3.9 D10 DASAMSA — CAREER CHART ═══ */}
          {advancedView==="d10" && d10Data && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #2e8b84",lineHeight:1.4}}>
                தசாம்சம் (தொழில் பிரிவு சக்கரம்)
              </div>
              {d10Data.map((p,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",
                  borderBottom:i<d10Data.length-1?"1px solid #eef1f6":"none"}}>
                  <span style={{fontSize:13.5,color:"#27303f",width:64,fontWeight:600}}>{p.ta}</span>
                  <span style={{fontSize:13,color:"#4a5365"}}>ராசி: {p.rashi}</span>
                  <span style={{fontSize:13.5,color:"#a9823c"}}>→</span>
                  <span style={{fontSize:13.5,fontWeight:600,color:"#1f3f68",flex:1,textAlign:"right"}}>{p.d10RashiName}</span>
                </div>
              ))}
              <div style={{fontSize:12.5,color:"#76819a",marginTop:8}}>
                தொழில், பதவி, சமூக அந்தஸ்து
              </div>
            </div>
          )}

          {/* ═══ 3.10 D2/D3/D12 — COMBINED DIVISIONAL TABLE ═══ */}
          {advancedView==="divisional" && d2Data && d3Data && d12Data && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #c07a4a",lineHeight:1.4}}>
                பிரிவு சக்கரங்கள்
              </div>
              <VargaGrid names={d2Data.map(p=>p.ta)} cols={[
                ["ஹோரை","செல்வம்",(i)=>d2Data[i]?.d2RashiName],
                ["திரேக்.","சகோதரர்",(i)=>d3Data[i]?.d3RashiName],
                ["சதுர்த்.","சொத்து",(i)=>d4Data?.[i]?.d4RashiName],
                ["சப்த.","குழந்தை",(i)=>d7Data?.[i]?.d7RashiName],
                ["துவாத.","பெற்றோர்",(i)=>d12Data[i]?.d12RashiName],
                ["ஷஷ்டி.","கர்மம்",(i)=>d60Data?.[i]?.d60RashiName,(i)=>d60Data?.[i] ? (d60Data[i].d60Nature==="தீய"?"#c0564f":"#2e7d5b") : null],
              ]} />
              {d60Data && (
                <div style={{marginTop:10,padding:"10px 12px",background:"#f5f7fb",borderRadius:12,border:"1px solid #e3e8f2"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1f3f68",marginBottom:6}}>ஷஷ்டியாம்சம் — கர்ம விவரம்</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {d60Data.map((p,i)=>(
                      <div key={i} style={{fontSize:12,padding:"3px 6px",borderRadius:10,
                        background:p.d60Nature==="நல்ல"?"#eaf5ef":p.d60Nature==="தீய"?"#fbeeed":"#f5f7fb",
                        color:p.d60Nature==="நல்ல"?"#2e7d5b":p.d60Nature==="தீய"?"#c0564f":"#4a5365",
                        border:`1px solid ${p.d60Nature==="நல்ல"?"#cfe6da":p.d60Nature==="தீய"?"#f0d6d3":"#ddd"}`}}>
                        {p.ta} — {p.d60Name} ({p.d60Nature})
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{fontSize:12.5,color:"#76819a",marginTop:8,lineHeight:1.5}}>
                ஹோரை = செல்வம் • திரேக்காணம் = சகோதரர்கள் • சதுர்த்தாம்சம் = சொத்து/வாகனம் • சப்தாம்சம் = குழந்தைகள் • துவாதசாம்சம் = பெற்றோர் • ஷஷ்டியாம்சம் = கர்மம்
              </div>
            </div>
          )}

          {/* ═══ மேல் வர்க்கங்கள் (Shodashavarga — D16/D20/D24/D27/D40/D45) ═══ */}
          {advancedView==="shodashavarga" && d16Data && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #b86084",lineHeight:1.4}}>
                மேல் வர்க்க சக்கரங்கள்
              </div>
              <VargaGrid names={d16Data.map(p=>p.ta)} cols={[
                ["ஷோடச.","வாகனம்",(i)=>d16Data[i]?.d16RashiName],
                ["விம்ச.","ஆன்மீகம்",(i)=>d20Data?.[i]?.d20RashiName],
                ["சதுர்வி.","கல்வி",(i)=>d24Data?.[i]?.d24RashiName],
                ["பம்ச.","பலம்",(i)=>d27Data?.[i]?.d27RashiName],
                ["கவேத.","தாய்வழி",(i)=>d40Data?.[i]?.d40RashiName],
                ["அக்ஷ.","தந்தைவழி",(i)=>d45Data?.[i]?.d45RashiName],
              ]} />
              <div style={{fontSize:12.5,color:"#76819a",marginTop:8,lineHeight:1.6}}>
                ஷோடசாம்சம் = வாகனம்/சுகபோகம் • விம்சாம்சம் = ஆன்மீகம்/வழிபாடு • சதுர்விம்சாம்சம் = கல்வி/அறிவு • பம்சாம்சம் = பலம்/பலவீனம் • கவேதாம்சம் = தாய்வழி சுப/அசுபம் • அக்ஷவேதாம்சம் = தந்தைவழி/நடத்தை
              </div>

              {/* Vimshopaka Bala (ShadVarga 20-point strength) */}
              {vimshopakaData && (
                <div style={{marginTop:12,paddingTop:10,borderTop:"1px dashed #e3e8f2"}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:"#7d6a3f",marginBottom:6}}>விம்சோபக பலம் — ஷட்வர்க்கம் (20)</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {vimshopakaData.map((v,i)=>(
                      <div key={i} style={{fontSize:12.5,padding:"4px 8px",borderRadius:10,minWidth:78,
                        background:v.percentage>=70?"#eaf5ef":v.percentage>=45?"#f5f7fb":"#fbeeed",
                        border:`1px solid ${v.percentage>=70?"#cfe6da":v.percentage>=45?"#e3e8f2":"#f0d6d3"}`}}>
                        <div style={{fontWeight:700,color:"#16304f"}}>{v.symbol} {v.ta}</div>
                        <div style={{color:v.percentage>=70?"#2e7d5b":v.percentage>=45?"#7d6a3f":"#c0564f",fontWeight:700}}>{v.total}/20 ({v.percentage}%)</div>
                        {v.classification && v.classification!=="—" && <div style={{color:"#76819a",fontSize:12}}>{v.classification}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ஜைமினி — ராசி திருஷ்டி, அர்கலா, சர காரகர் ═══ */}
          {advancedView==="jaimini" && jaiminiData && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #6b9150",lineHeight:1.4}}>
                ஜைமினி பகுப்பாய்வு
              </div>

              {/* Chara Karakas */}
              {jaiminiData.charaKarakas && jaiminiData.charaKarakas.length > 0 && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:"#7d6a3f",marginBottom:5}}>சர காரகர்கள்</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {jaiminiData.charaKarakas.map((k,i)=>(
                      <div key={i} style={{fontSize:12.5,padding:"3px 7px",borderRadius:10,background:"#f5f7fb",border:"1px solid #e3e8f2",color:"#16304f"}}>
                        <b>{k.ta}</b>{k.planet?` — ${k.planet}`:""}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rashi Drishti on Lagna */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:13.5,fontWeight:700,color:"#7d6a3f",marginBottom:5}}>ராசி திருஷ்டி — லக்னம் ({jaiminiData.lagnaName})</div>
                <div style={{fontSize:13,color:"#4a5365",lineHeight:1.6}}>
                  லக்னம் இந்த ராசிகளை பார்க்கிறது: <b style={{color:"#1f3f68"}}>{jaiminiData.lagnaDrishtiSigns.join(", ")}</b>
                </div>
                <div style={{fontSize:13,color:"#4a5365",lineHeight:1.6,marginTop:3}}>
                  லக்னத்தை பார்க்கும் கிரகங்கள்: {jaiminiData.lagnaAspectedBy.length>0
                    ? <b style={{color:"#1f3f68"}}>{jaiminiData.lagnaAspectedBy.map(a=>`${a.ta} (${a.from})`).join(", ")}</b>
                    : <span style={{color:"#76819a"}}>இல்லை</span>}
                </div>
              </div>

              {/* Argala on Lagna */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:13.5,fontWeight:700,color:"#7d6a3f",marginBottom:5}}>அர்கலா — லக்னத்தின் மேல்</div>
                {jaiminiData.lagnaArgala.length>0 ? jaiminiData.lagnaArgala.map((a,i)=>(
                  <div key={i} style={{fontSize:13,color:"#4a5365",lineHeight:1.6,marginBottom:3,padding:"4px 8px",background:a.effective?"#eaf5ef":a.partial?"#f5f7fb":"#fbeeed",borderRadius:10,border:`1px solid ${a.effective?"#cfe6da":a.partial?"#e3e8f2":"#f0d6d3"}`}}>
                    <b>{a.house}</b>: அர்கலா [{a.argPlanets.join(", ")||"—"}] · விரோதம் [{a.virPlanets.join(", ")||"—"}]
                    <span style={{fontWeight:700,color:a.effective?"#2e7d5b":a.partial?"#7d6a3f":"#c0564f"}}> — {a.effective?"செயல்படும் அர்கலா":a.partial?"பகுதி தடை":"தடைபட்டது"}</span>
                  </div>
                )) : <div style={{fontSize:13,color:"#76819a"}}>குறிப்பிடத்தக்க அர்கலா இல்லை</div>}
              </div>

              {/* Arudha */}
              {jaiminiData.arudhaName && (
                <div style={{fontSize:13,color:"#4a5365",lineHeight:1.6,marginBottom:4}}>
                  <b style={{color:"#7d6a3f"}}>அருட லக்னம்:</b> {jaiminiData.arudhaName}
                  {jaiminiData.arudhaAspectedBy.length>0 && <span> — பார்க்கும் கிரகங்கள்: <b style={{color:"#1f3f68"}}>{jaiminiData.arudhaAspectedBy.map(a=>a.ta).join(", ")}</b></span>}
                </div>
              )}

              {/* All 12 Arudha Padas */}
              {arudhaPadasData && (
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px dashed #e3e8f2"}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:"#7d6a3f",marginBottom:6}}>12 ஆரூட பதங்கள்</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:4}}>
                    {arudhaPadasData.filter(Boolean).map((p,i)=>(
                      <div key={i} style={{padding:"8px 10px",borderRadius:12,background:p.houseNum===1||p.houseNum===12?"#f8f3e6":"#f5f7fb",border:"1px solid #e3e8f2"}}>
                        <div style={{fontSize:12,color:"#76819a",lineHeight:1.4}}>{p.pada}</div>
                        <div style={{fontSize:13.5,fontWeight:700,color:"#1f3f68",lineHeight:1.5}}>{p.rashiName}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:12,color:"#a3adc2",marginTop:4,fontStyle:"italic"}}>லக்ன பதம் = பொதுத் தோற்றம், புகழ் · உபபத பதம் = துணை</div>
                </div>
              )}

              {/* Chara Dasha (KN Rao) */}
              {charaDashaData && (
                <div style={{marginTop:12,paddingTop:10,borderTop:"1px dashed #e3e8f2"}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:"#7d6a3f",marginBottom:5}}>சர தசா — திசை: {String(charaDashaData.direction || "").replace(/\s*\((zodiacal|reverse)\)/, "")}</div>
                  <div className="jn-xscroll" style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead><tr style={{borderBottom:"1.5px solid #c7a56840"}}>
                        <th style={{padding:"4px 3px",color:"#a9823c",fontWeight:700,textAlign:"left"}}>ராசி தசை</th>
                        <th style={{padding:"4px 3px",color:"#a9823c",fontWeight:700,textAlign:"center"}}>ஆண்டு</th>
                        <th style={{padding:"4px 3px",color:"#a9823c",fontWeight:700,textAlign:"left"}}>தொடக்கம்</th>
                        <th style={{padding:"4px 3px",color:"#a9823c",fontWeight:700,textAlign:"left"}}>முடிவு</th>
                      </tr></thead>
                      <tbody>
                        {charaDashaData.dashas.map((d,i)=>{
                          const isCur=charaDashaData.currentRashi===d.rashiName && new Date()>=d.startDate && new Date()<d.endDate;
                          return (
                            <tr key={i} style={{borderBottom:"1px solid #eef1f6",background:isCur?"#eaf5ef":i%2?"#f5f7fb":"transparent",fontWeight:isCur?700:400}}>
                              <td style={{padding:"5px 3px",color:"#1f3f68",fontWeight:600}}>{d.rashiName}{isCur&&<span style={{color:"#2e7d5b",fontSize:11}}> (நடப்பு)</span>}</td>
                              <td style={{padding:"5px 3px",textAlign:"center",color:"#27303f"}}>{d.years}</td>
                              <td style={{padding:"5px 3px",color:"#4a5365"}}>{d.startDate.toLocaleDateString("ta-IN")}</td>
                              <td style={{padding:"5px 3px",color:"#4a5365"}}>{d.endDate.toLocaleDateString("ta-IN")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ═══ வர்ஷபலன் (Varshaphala — annual chart) ═══ */}
          {advancedView==="varshaphala" && varshaphalaData && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #8a62b0",lineHeight:1.4}}>
                வர்ஷபலன் — {varshaphalaData.year}–{varshaphalaData.year+1} (வயது {varshaphalaData.age})
              </div>

              <div style={{fontSize:13.5,color:"#27303f",lineHeight:1.7,marginBottom:10,background:"#f5f7fb",border:"1px solid #e3e8f2",borderRadius:12,padding:"8px 10px"}}>
                <div><b>வர்ஷ பிரவேசம்:</b> {fmtDateTa(varshaphalaData.praveshDate)}, {String(varshaphalaData.praveshDate.getHours()).padStart(2,"0")}:{String(varshaphalaData.praveshDate.getMinutes()).padStart(2,"0")}</div>
                <div><b>வர்ஷ லக்னம்:</b> <span style={{color:"#1f3f68",fontWeight:700}}>{varshaphalaData.varshaLagnaName}</span></div>
                <div><b>முந்தா:</b> <span style={{color:"#1f3f68",fontWeight:700}}>{varshaphalaData.munthaName}</span> ({varshaphalaData.munthaHouse}ஆம் வர்ஷ வீடு) — அதிபதி {varshaphalaData.munthaLord}</div>
              </div>

              {/* Annual chart planet houses */}
              <div style={{fontSize:13.5,fontWeight:700,color:"#7d6a3f",marginBottom:5}}>ஆண்டு ஜாதக கிரக நிலை</div>
              <div className="jn-xscroll" style={{overflowX:"auto",marginBottom:10}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{borderBottom:"1.5px solid #c7a56840"}}>
                    <th style={{padding:"4px 3px",color:"#a9823c",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                    <th style={{padding:"4px 3px",color:"#a9823c",fontWeight:700,textAlign:"left"}}>ராசி</th>
                    <th style={{padding:"4px 3px",color:"#a9823c",fontWeight:700,textAlign:"center"}}>வர்ஷ வீடு</th>
                  </tr></thead>
                  <tbody>
                    {varshaphalaData.annualPlacements.map((p,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid #eef1f6",background:i%2?"#f5f7fb":"transparent"}}>
                        <td style={{padding:"5px 3px",color:"#1f3f68",fontWeight:600}}>{p.symbol} {p.ta}</td>
                        <td style={{padding:"5px 3px",color:"#27303f"}}>{p.rashi}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#27303f",fontWeight:600}}>{p.house}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Varshesha candidates */}
              <div style={{fontSize:13.5,fontWeight:700,color:"#7d6a3f",marginBottom:4}}>வர்ஷேஸ் (ஆண்டு அதிபதி) — வேட்பாளர்கள்</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                {varshaphalaData.candidates.map((c,i)=>(
                  <div key={i} style={{fontSize:12.5,padding:"4px 8px",borderRadius:10,background:"#f5f7fb",border:"1px solid #e3e8f2",color:"#16304f"}}>
                    <b>{c.planet}</b> — {c.role}
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ═══ பிரஸ்னம் (Prashna — current-moment horary) ═══ */}
          {advancedView==="prashna" && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #5565b8",lineHeight:1.4}}>
                பிரஸ்னம்
              </div>
              <div style={{fontSize:13,color:"#4a5365",lineHeight:1.6,marginBottom:10}}>
                மனதில் ஒரு கேள்வியை நினைத்து, <b>இப்போது</b> கீழே பொத்தானை அழுத்துங்கள்.
              </div>
              <button onClick={async ()=>{ const geo=resolveBirthGeo(formData); try{ setPrashnaData(await apiEngine("calcPrashnaChart",[geo.lat, geo.lon])); }catch(e){} }}
                className="jn-shine" style={{...btnGold, marginBottom:12}}>
                இப்போது பிரஸ்னம் போடு
              </button>

              {prashnaData && (
                <div>
                  <div style={{padding:"10px 12px",borderRadius:10,background:`${prashnaData.verdictColor}12`,border:`1px solid ${prashnaData.verdictColor}30`,marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:13,fontWeight:700,color:"#1f3f68"}}>தீர்ப்பு</span>
                      <span style={{fontSize:14,fontWeight:700,color:prashnaData.verdictColor}}>{prashnaData.verdict}</span>
                    </div>
                    <div style={{fontSize:13,color:"#4a5365",marginTop:3}}>{prashnaData.now.toLocaleString("ta-IN")}</div>
                  </div>

                  <div style={{fontSize:13.5,color:"#27303f",lineHeight:1.7,marginBottom:10,background:"#f5f7fb",border:"1px solid #e3e8f2",borderRadius:12,padding:"8px 10px"}}>
                    <div><b>பிரஸ்ன லக்னம்:</b> <span style={{color:"#1f3f68",fontWeight:700}}>{prashnaData.lagnaName}</span> — {prashnaData.lagnaNature}</div>
                    <div>☽ <b>சந்திரன்:</b> {prashnaData.moonSign} ({prashnaData.moonNak}) — {prashnaData.moonHouse}ஆம் வீடு</div>
                  </div>

                  <div style={{fontSize:13.5,fontWeight:700,color:"#7d6a3f",marginBottom:4}}>காரணிகள்</div>
                  {prashnaData.factors.map((f,i)=>(
                    <div key={i} style={{fontSize:13,color:"#4a5365",marginBottom:3,display:"flex",gap:6}}>
                      <span style={{color:f.good?"#2e7d5b":"#c0564f",fontWeight:700}}>{f.good?"▲":"▼"}</span>
                      <span>{f.text}</span>
                    </div>
                  ))}

                  <div style={{fontSize:12,color:"#76819a",marginTop:8,lineHeight:1.5}}>
                    தத்கால பிரஸ்னம் — கேள்வி கேட்ட தருணத்துக்கு லக்னம். சுபன் கேந்திர/திரிகோணத்தில் = சாதகம், பாபன் லக்னத்தில் = தடை, சந்திரனின் நிலை முக்கியம். (கிருஷ்ணமூர்த்தி பத்ததியின் 249 உப நட்சத்திராதிபதி முறை இங்கு பயன்படுத்தப்படவில்லை.)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ கால சர்ப்ப தோஷம் ═══ */}
          {advancedView==="kalasarpa" && kalaSarpa && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #2e8b84",lineHeight:1.4}}>
                கால சர்ப்ப தோஷம்
              </div>
              {kalaSarpa.present ? (
                <div>
                  <div style={{padding:"10px 12px",background:"#fbeeed",borderRadius:12,border:"1px solid #f0d6d3",marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#c0564f",marginBottom:4}}>கால சர்ப்ப தோஷம் உள்ளது</div>
                    <div style={{fontSize:13.5,color:"#27303f"}}>வகை: <span style={{fontWeight:700,color:"#1f3f68"}}>{kalaSarpa.type}</span></div>
                    <div style={{fontSize:13.5,color:"#27303f",marginTop:2}}>திசை: <span style={{fontWeight:600}}>{kalaSarpa.direction}</span></div>
                    <div style={{fontSize:13.5,color:"#27303f",marginTop:2}}>ராகு: <span style={{fontWeight:600}}>{kalaSarpa.rahuRashi}</span> • கேது: <span style={{fontWeight:600}}>{kalaSarpa.ketuRashi}</span></div>
                  </div>
                  <div style={{padding:"10px 12px",background:"#f5f7fb",borderRadius:12,border:"1px solid #e3e8f2"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#1f3f68",marginBottom:6}}>பரிகாரம்</div>
                    <div style={{fontSize:13.5,color:"#27303f",lineHeight:1.7}}>{kalaSarpa.remedy}</div>
                    <button data-dosha-remedy-link="kalasarpa" onClick={()=>{ showResultView("remedy"); window.scrollTo({top:0}); }} style={{marginTop:8,padding:0,background:"none",border:"none",cursor:"pointer",fontSize:13.5,fontWeight:700,color:"#226b66",textAlign:"left"}}>உங்கள் ஜாதகத்துக்கு எந்த அளவு தேவை — "பரிகாரம்" பகுதியில் பார்க்க →</button>
                  </div>
                </div>
              ) : (
                <div style={{padding:"10px 12px",background:"#eaf5ef",borderRadius:12,border:"1px solid #cfe6da"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#2e7d5b"}}>கால சர்ப்ப தோஷம் இல்லை</div>
                  <div style={{fontSize:13,color:"#27303f",marginTop:4}}>அனைத்து கிரகங்களும் ராகு-கேது அச்சுக்கு வெளியே உள்ளன.</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ செவ்வாய் தோஷம் ═══ */}
          {advancedView==="chevvai" && chevvaiDosham && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #c07a4a",lineHeight:1.4}}>
                செவ்வாய் தோஷம் (மாங்கல்ய தோஷம்)
              </div>
              {chevvaiDosham.present ? (
                <div>
                  <div style={{padding:"10px 12px",background:"#fbeeed",borderRadius:12,border:"1px solid #f0d6d3",marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#c0564f",marginBottom:4}}>செவ்வாய் தோஷம் உள்ளது</div>
                    <div style={{fontSize:13.5,color:"#27303f"}}>தீவிரம்: <span style={{fontWeight:700,color:chevvaiDosham.severity >= 3 ? "#c0564f" : "#7d6a3f"}}>{chevvaiDosham.severityText}</span></div>
                    <div style={{fontSize:13.5,color:"#27303f",marginTop:2}}>செவ்வாய் ராசி: <span style={{fontWeight:600}}>{chevvaiDosham.marsRashi}</span></div>
                    <div style={{fontSize:13,color:"#4a5365",marginTop:4}}>
                      {chevvaiDosham.fromLagna && <span style={{display:"inline-block",background:"#f5f7fb",padding:"2px 6px",borderRadius:10,margin:"2px 4px 2px 0",border:"1px solid #e9dcc0"}}>லக்னத்திலிருந்து: வீடு {chevvaiDosham.marsHouseFromLagna}</span>}
                      {chevvaiDosham.fromMoon && <span style={{display:"inline-block",background:"#f5f7fb",padding:"2px 6px",borderRadius:10,margin:"2px 4px 2px 0",border:"1px solid #e9dcc0"}}>சந்திரனிலிருந்து: வீடு {chevvaiDosham.marsHouseFromMoon}</span>}
                      {chevvaiDosham.fromVenus && <span style={{display:"inline-block",background:"#f5f7fb",padding:"2px 6px",borderRadius:10,margin:"2px 4px 2px 0",border:"1px solid #e9dcc0"}}>சுக்கிரனிலிருந்து: வீடு {chevvaiDosham.marsHouseFromVenus}</span>}
                    </div>
                  </div>
                  {chevvaiDosham.cancelled && (
                    <div style={{padding:"8px 12px",background:"#eaf5ef",borderRadius:12,border:"1px solid #cfe6da",marginBottom:10}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#2e7d5b"}}>தோஷ நிவர்த்தி: {chevvaiDosham.cancelReason}</div>
                    </div>
                  )}
                  <div style={{padding:"10px 12px",background:"#f5f7fb",borderRadius:12,border:"1px solid #e3e8f2"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#1f3f68",marginBottom:6}}>பரிகாரம்</div>
                    <div style={{fontSize:13.5,color:"#27303f",lineHeight:1.7}}>செவ்வாய்க்கிழமை விரதம் • முருகன் வழிபாடு • கந்த சஷ்டி கவசம் பாராயணம்</div>
                    <button data-dosha-remedy-link="chevvai" onClick={()=>{ showResultView("remedy"); window.scrollTo({top:0}); }} style={{marginTop:8,padding:0,background:"none",border:"none",cursor:"pointer",fontSize:13.5,fontWeight:700,color:"#226b66",textAlign:"left"}}>ரத்தினம் அணியலாமா, எப்போது தொடங்குவது — "பரிகாரம்" பகுதியில் பார்க்க →</button>
                  </div>
                </div>
              ) : (
                <div style={{padding:"10px 12px",background:"#eaf5ef",borderRadius:12,border:"1px solid #cfe6da"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#2e7d5b"}}>செவ்வாய் தோஷம் இல்லை</div>
                  <div style={{fontSize:13,color:"#27303f",marginTop:4}}>செவ்வாய் 1, 2, 4, 7, 8, 12 ஆகிய வீடுகளில் இல்லை.</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ பாவ சக்கரம் ═══ */}
          {advancedView==="bhava" && bhavaChart && bhavaChart.cusps && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #b86084",lineHeight:1.4}}>
                பாவ சக்கரம்
              </div>
              <div data-bhava-rows>
                {bhavaChart.cusps.map((cusp,i) => {
                  const planetsInHouse = bhavaChart.planets ? bhavaChart.planets.filter(p => p.bhavaHouse === i+1).map(p => p.ta) : [];
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderTop:i?"1px solid #eef1f6":"none"}}>
                      <span style={{width:28,height:28,borderRadius:9,background:"#eef1fb",color:"#3e4c99",fontSize:13,fontWeight:700,display:"grid",placeItems:"center",flexShrink:0}}>{i+1}</span>
                      <span style={{flex:1,minWidth:0}}>
                        <span style={{display:"block",fontSize:13.5,fontWeight:700,color:"#27303f"}}>{["தனு","தனம்","சகஜ","சுக","புத்ர","ரிபு","காமம்","ஆயுள்","பாக்யம்","கர்மம்","லாபம்","விரயம்"][i]} · {cusp.rashiName} <span style={{fontWeight:500,color:"#76819a",fontVariantNumeric:"tabular-nums"}}>{cusp.cuspDeg?.toFixed(1)}°</span></span>
                        <span style={{display:"block",fontSize:12.5,color:"#76819a",lineHeight:1.5}}>அதிபதி {cusp.lord}</span>
                      </span>
                      <span style={{fontSize:13,fontWeight:600,color:planetsInHouse.length?"#1f3f68":"#a3adc2",textAlign:"right",maxWidth:"42%"}}>{planetsInHouse.length>0?planetsInHouse.join(", "):"—"}</span>
                    </div>
                  );
                })}
              </div>
              {bhavaChart.planets && bhavaChart.planets.some(p => p.bhavaDiff) && (
                <div style={{marginTop:10,padding:"10px 12px",background:"#f8f3e6",borderRadius:12,border:"1px solid #e9dcc0"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#7d6a3f",marginBottom:6}}>பாவ-ராசி வேறுபாடுகள்</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {bhavaChart.planets.filter(p=>p.bhavaDiff).map((p,i)=>(
                      <div key={i} style={{fontSize:12.5,padding:"3px 6px",borderRadius:10,background:"#f5f7fb",color:"#7d6a3f",border:"1px solid #e9dcc0"}}>
                        {p.ta}: ராசி வீடு {p.house} → பாவ வீடு {p.bhavaHouse}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ நவாம்ச பல பகுப்பாய்வு ═══ */}
          {advancedView==="navamsastrength" && navamsaStrength && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #6b9150",lineHeight:1.4}}>
                நவாம்ச பல பகுப்பாய்வு
              </div>
              <div className="jn-xscroll" style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,tableLayout:"fixed"}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #c7a56840"}}>
                      <th style={{padding:"5px 4px",color:"#a9823c",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                      <th style={{padding:"5px 4px",color:"#a9823c",fontWeight:700,textAlign:"center"}}>நவாம்ச ராசி</th>
                      <th style={{padding:"5px 4px",color:"#a9823c",fontWeight:700,textAlign:"center"}}>வர்கோத்.</th>
                      <th style={{padding:"5px 4px",color:"#a9823c",fontWeight:700,textAlign:"center"}}>நிலை</th>
                      <th style={{padding:"5px 4px",color:"#a9823c",fontWeight:700,textAlign:"center"}}>புஷ்கர</th>
                    </tr>
                  </thead>
                  <tbody>
                    {navamsaStrength.map((p,i) => (
                      <tr key={i} style={{borderBottom:"1px solid #eef1f6",background:i%2?"#f5f7fb":"transparent"}}>
                        <td style={{padding:"6px 4px",color:"#27303f",fontWeight:600}}>{p.ta}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#1f3f68",fontWeight:600}}>{p.navRashiName}</td>
                        <td style={{padding:"6px 4px",textAlign:"center"}}>
                          {p.vargottama ? <span style={{color:"#2e7d5b",fontWeight:700}}>ஆம்</span> : <span style={{color:"#76819a"}}>—</span>}
                        </td>
                        <td style={{padding:"6px 4px",textAlign:"center",fontSize:12,color:p.d9StatusColor||"#4a5365",fontWeight:700}}>
                          {p.d9Status}
                        </td>
                        <td style={{padding:"6px 4px",textAlign:"center"}}>
                          {p.pushkara ? <span style={{color:"#a9823c",fontWeight:700}}>✓</span> : <span style={{color:"#76819a"}}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
                {navamsaStrength.filter(p=>p.vargottama).map((p,i)=>(
                  <div key={i} style={{fontSize:12.5,padding:"3px 8px",borderRadius:10,background:"#eaf5ef",color:"#2e7d5b",border:"1px solid #cfe6da",fontWeight:600}}>
                    {p.ta} — வர்கோத்தமா
                  </div>
                ))}
              </div>
              <div style={{fontSize:12.5,color:"#76819a",marginTop:8,lineHeight:1.5}}>
                வர்கோத்தமா = ராசியிலும் நவாம்சத்திலும் ஒரே ராசி • புஷ்கர நவாம்சம் = சுபப் பலம் அதிகம்
              </div>
            </div>
          )}

          {/* ═══ ஷட்பலம் ═══ */}
          {advancedView==="shadbala" && shadBala && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #8a62b0",lineHeight:1.4}}>
                ஷட்பலம் — 6 வகை பலம்
              </div>
              <div data-shadbala-main>
                {shadBala.map((p,i) => {
                  const ok = p.total >= p.required;
                  return (
                    <div key={i} style={{padding:"10px 0",borderTop:i?"1px solid #eef1f6":"none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{flex:1,minWidth:0,fontSize:14,fontWeight:700,color:"#27303f"}}>{p.ta}
                          {p.yuddha && <span style={{marginLeft:6,fontSize:12,fontWeight:600,color:p.yuddha.result==="வெற்றி"?"#2e7d5b":"#c0564f"}}>கிரக யுத்தம்: {p.yuddha.result} ({p.yuddha.opponent})</span>}
                        </span>
                        <span style={{fontSize:13,fontWeight:700,color:"#27303f",fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{p.total?.toFixed(0)} <span style={{fontWeight:500,color:"#76819a"}}>/ {p.required?.toFixed(0)}</span></span>
                        <span style={{...chipSm,color:ok?"#2e7d5b":"#c0564f",background:ok?"#eaf5ef":"#fbeeed"}}>{ok?"பலம்":"பலவீனம்"}</span>
                      </div>
                      <div style={{height:6,background:"#eef1f6",borderRadius:6,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${Math.min(100,(p.total/p.required)*66)}%`,background:ok?"#2e7d5b":"#c0564f",borderRadius:6}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button data-shadbala-toggle onClick={()=>toggleArea("__shadComp")} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",padding:0,marginTop:4,minHeight:40,fontSize: 13,fontWeight:600,color:"#1f3f68",cursor:"pointer"}}>
                {openAreas.has("__shadComp") ? "ஆறு கூறுகளை மறை" : "ஆறு கூறுகளின் விவரம்"}
                <ChevronDown size={16} style={{transform:openAreas.has("__shadComp")?"rotate(180deg)":"none",transition:"transform .2s"}}/>
              </button>
              {openAreas.has("__shadComp") && (
                <div className="jn-xscroll" style={{overflowX:"auto"}}>
                  <table data-shadbala-comp style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:300}}>
                    <colgroup><col style={{width:"22%"}}/><col/><col/><col/><col/><col/><col/></colgroup>
                    <thead>
                      <tr style={{borderBottom:"1px solid #e3e8f2"}}>
                        <th style={{padding:"6px 2px",textAlign:"left",fontSize:12,fontWeight:700,color:"#76819a"}}>கிரகம்</th>
                        {["ஸ்தான","திக்","கால","சேஷ்டா","இயற்கை","பார்வை"].map(h=>(<th key={h} style={{padding:"6px 1px",textAlign:"center",fontSize:11.5,fontWeight:700,color:"#76819a"}}>{h}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {shadBala.map((p,i) => (
                        <tr key={i} style={{borderTop:i?"1px solid #eef1f6":"none"}}>
                          <td style={{padding:"8px 2px",fontSize:12.5,fontWeight:700,color:"#27303f",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.ta}</td>
                          {[p.sthanaBala,p.digBala,p.kalaBala,p.cheshtaBala,p.naisargikaBala,p.drikBala].map((v,k)=>(<td key={k} style={{padding:"8px 1px",textAlign:"center",fontSize:12.5,color:"#27303f",fontVariantNumeric:"tabular-nums"}}>{v?.toFixed(0)}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ லக்னவாரி சுப-பாபர் / மாரக-பாதகர் ═══ */}
          {advancedView==="funcnature" && functionalNature && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #5565b8",lineHeight:1.4}}>
                லக்னவாரி சுப-பாபர்
              </div>
              {Object.entries(functionalNature).map(([ta, fn], i) => (
                <div key={i} style={{padding:"7px 10px",marginBottom:5,borderRadius:10,
                  background:fn.nature==="யோககாரகன்"?"#eaf5ef":fn.nature==="சுபன்"?"#eaf5ef":fn.nature==="பாபன்"?"#fbeeed":"#f5f7fb",
                  border:`1px solid ${fn.nature==="யோககாரகன்"?"#cfe6da":fn.nature==="சுபன்"?"#cfe6da":fn.nature==="பாபன்"?"#f0d6d3":"#e3e8f2"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:13.5,fontWeight:700,color:"#27303f"}}>{ta}</span>
                    <span style={{fontSize:13,fontWeight:800,
                      color:fn.nature==="யோககாரகன்"?"#2e7d5b":fn.nature==="சுபன்"?"#2e7d5b":fn.nature==="பாபன்"?"#c0564f":"#7d6a3f"}}>
                      {fn.nature==="யோககாரகன்"?"👑 யோககாரகன்":fn.nature}
                    </span>
                  </div>
                  <div style={{fontSize:12.5,color:"#4a5365",marginTop:2}}>{fn.reasons.join(" • ")}</div>
                </div>
              ))}
              {marakaBadhaka && (
                <div style={{marginTop:10,padding:"10px 12px",background:"#f8f3e6",borderRadius:12,border:"1px solid #e9dcc0"}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:"#1f3f68",marginBottom:4}}>மாரகர் & பாதகாதிபதி</div>
                  <div style={{fontSize:13,color:"#27303f",lineHeight:1.7}}>
                    <b>மாரகாதிபதிகள் (2,7):</b> {marakaBadhaka.marakaLords.join(", ")}
                    {marakaBadhaka.occupants27.length > 0 && <span> • மாரக ஸ்தானத்தில்: {marakaBadhaka.occupants27.join(", ")}</span>}
                    {marakaBadhaka.associates.length > 0 && <span> • மாரக சேர்க்கை: {marakaBadhaka.associates.join(", ")}</span>}
                    <br/>
                    <b>பாதகாதிபதி:</b> {marakaBadhaka.badhakaLord} ({marakaBadhaka.lagnaType} → {marakaBadhaka.badhakaHouse}ஆம் வீடு பாதக ஸ்தானம்)
                    {marakaBadhaka.badhakaLordHouse && <span> — தற்போது {marakaBadhaka.badhakaLordHouse}ஆம் வீட்டில்</span>}
                  </div>
                  <div style={{fontSize:12.5,color:"#7d6a3f",marginTop:4}}>
                    மாரக/பாதக கிரகங்களின் தசா-புக்திகளில் ஆரோக்கியம், தடைகள் குறித்து கூடுதல் கவனம் தேவை.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ வரிசை-நிபந்தனை பலன்கள் ═══ */}
          {advancedView==="sequence" && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #2e8b84",lineHeight:1.4}}>
                வரிசை-நிபந்தனை பலன்கள் — "எது எதற்குப் பின்?"
              </div>
              {(!sequenceLinks || sequenceLinks.length === 0) ? (
                <div style={{padding:"12px",textAlign:"center",fontSize:13.5,color:"#7d6a3f",background:"#f5f7fb",borderRadius:12}}>
                  இந்த ஜாதகத்தில் குறிப்பிடத்தக்க வரிசை-இணைப்புகள் இல்லை — ஒவ்வொரு பகுதியும் தன் தசையில் தனித்தே பலன் தரும்
                </div>
              ) : sequenceLinks.map((lk, i) => (
                <div key={i} style={{marginBottom:8,padding:"9px 11px",borderRadius:12,
                  background:lk.strength>=3?"#eaf5ef":lk.strength>=2?"#f8f3e6":"#f5f7fb",
                  border:`1px solid ${lk.strength>=3?"#cfe6da":lk.strength>=2?"#e9dcc0":"#e3e8f2"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <span style={{flex:1,minWidth:0,fontSize:14,fontWeight:700,color:"#27303f"}}>{lk.afterTa}</span>
                    <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:999,whiteSpace:"nowrap",flexShrink:0,
                      background:lk.strength>=3?"#ffffff":lk.strength>=2?"#ffffff":"#eef1f6",
                      color:lk.strength>=3?"#2e7d5b":"#7d6a3f"}}>{lk.strengthTa}</span>
                  </div>
                  <div style={{fontSize:13.5,color:"#27303f",lineHeight:1.6,marginBottom:3}}>{lk.text}</div>
                  <div style={{fontSize:12.5,color:"#1f3f68",lineHeight:1.5}}>{lk.how}</div>
                  {lk.dashaNote && (
                    <div style={{fontSize:12.5,color:"#2e7d5b",fontWeight:600,marginTop:2}}>{lk.dashaNote}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ═══ வாழ்க்கை நிகழ்வு காலக்கணிப்பு ═══ */}
          {advancedView==="eventtiming" && (
            <div id="jn-eventtiming" style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #c07a4a",lineHeight:1.4}}>
                வாழ்க்கை நிகழ்வு காலக்கணிப்பு — "எப்போது?"
              </div>
              {/* Topic chips */}
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                {Object.entries(EVENT_TOPICS).map(([key,t])=>(
                  <button key={key} onClick={()=>{ setEventTopic(key); if(!eventTiming[key]) runEventTiming(key); }}
                    style={{minHeight:38,padding:"0 14px",borderRadius:999,fontSize:14,fontWeight:600,cursor:"pointer",
                      border:`1px solid ${eventTopic===key?"#1f3f68":"#e3e8f2"}`,
                      background:eventTopic===key?"#1f3f68":"#fafbfe",
                      color:eventTopic===key?"#fafbfe":"#1f3f68"}}>
                    {t.ta}
                  </button>
                ))}
              </div>
              {(() => {
                const et = eventTiming[eventTopic];
                if (!et) return (
                  <div style={{padding:"14px",textAlign:"center",fontSize:13.5,color:"#7d6a3f",background:"#f5f7fb",borderRadius:12}}>
                    மேலே ஒரு கேள்வியைத் தேர்ந்தெடுக்கவும்
                  </div>
                );
                const isCaution = EVENT_TOPICS[eventTopic]?.mood === "caution";
                return (
                  <div>
                    {/* 1. வாக்குறுதி — caution topic-இல் இது "பாதிப்பு-சாத்திய அளவு" */}
                    <div style={{marginBottom:10,padding:"10px 12px",borderRadius:12,
                      background:et.promise>=65?"#eaf5ef":et.promise<45?"#fbeeed":"#f8f3e6",
                      border:`1px solid ${et.promise>=65?"#cfe6da":et.promise<45?"#f0d6d3":"#e9dcc0"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:700,color:"#27303f"}}>{isCaution ? "6/8/12 பாவ செயல்பாட்டு அளவு (நோய்-சாத்தியம்)" : "ஜாதக வாக்குறுதி"}</span>
                        <span style={{fontSize:13,fontWeight:800,color:et.promise>=65?"#2e7d5b":et.promise<45?"#c0564f":"#7d6a3f"}}>{et.promise}%{isCaution ? "" : ` — ${et.promiseVerdict}`}</span>
                      </div>
                      <div style={{height:8,background:"#eef1f6",borderRadius:10,overflow:"hidden",marginBottom:6}}>
                        <div style={{width:`${et.promise}%`,height:"100%",borderRadius:10,
                          background:et.promise>=65?"linear-gradient(90deg,#2e7d5b,#2e7d5b)":et.promise<45?"linear-gradient(90deg,#f0d6d3,#c0564f)":"linear-gradient(90deg,#e9dcc0,#7d6a3f)"}}/>
                      </div>
                      {et.pReasons.map((r,i)=>(
                        <div key={i} style={{fontSize:12.5,lineHeight:1.6,color:r.startsWith("+")?"#2e7d5b":"#c0564f"}}>{r}</div>
                      ))}
                    </div>
                    {/* 2. தேதி-வரம்புகள் — caution topic-இல் இவை எச்சரிக்கைக் காலங்கள்! */}
                    <div style={{fontSize:13.5,fontWeight:700,color:isCaution?"#c0564f":"#1f3f68",marginBottom:6}}>
                      {isCaution ? "கூடுதல் கவனம் தேவை காலக்கட்டங்கள் (6/8/12 தசா × கோசாரம்)" : "📅 சாதகமான காலக்கட்டங்கள் (தசா × கோசாரம்)"}
                    </div>
                    {isCaution && (
                      <div style={{fontSize:12.5,color:"#7d6a3f",background:"#f8f3e6",border:"1px dashed #c7a56860",borderRadius:10,padding:"5px 8px",marginBottom:6,lineHeight:1.5}}>
                        இக்காலங்களில் உணவு/ஓய்வு/மருத்துவ பரிசோதனையில் கூடுதல் கவனம்; இவற்றுக்கு <b>இடைப்பட்ட காலங்களே</b> சிகிச்சை/அறுவை/மீட்சிக்கு சாதகமானவை.
                      </div>
                    )}
                    {et.windows.length === 0 && (
                      <div style={{fontSize:13,color:"#7d6a3f",padding:"8px"}}>{isCaution ? "அடுத்த 12 ஆண்டுகளில் 6/8/12 வலுத் தூண்டல் இல்லை — ஆரோக்கியத்திற்கு நல்ல அறிகுறி" : "அடுத்த 12 ஆண்டுகளில் வலுவான தசைத் தூண்டல் இல்லை — நீண்ட கால தசா பட்டியலைப் பார்க்கவும்"}</div>
                    )}
                    {et.windows.map((w,i)=>(
                      <div key={i} style={{marginBottom:8,padding:"8px 10px",borderRadius:12,
                        background:i===0?(isCaution?"#fbeeed":"#eaf5ef"):"#f5f7fb",
                        border:`1.5px solid ${i===0?(isCaution?"#c0564f":"#2e7d5b"):"#e3e8f2"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                          <span style={{fontSize:13.5,fontWeight:700,color:"#27303f"}}>
                            {w.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short'})} — {w.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short'})}
                          </span>
                          <span style={{fontSize:12.5,fontWeight:800,padding:"2px 8px",borderRadius:10,
                            background:isCaution
                              ? (w.confidence==="உயர்"?"#fbeeed":w.confidence==="நடுத்தரம்"?"#f8f3e6":"#f5f7fb")
                              : (w.confidence==="உயர்"?"#eaf5ef":w.confidence==="நடுத்தரம்"?"#f8f3e6":"#fbeeed"),
                            color:isCaution
                              ? (w.confidence==="உயர்"?"#c0564f":w.confidence==="நடுத்தரம்"?"#7d6a3f":"#4a5365")
                              : (w.confidence==="உயர்"?"#2e7d5b":w.confidence==="நடுத்தரம்"?"#7d6a3f":"#c0564f")}}>
                            {isCaution?"தீவிரம்":"நம்பிக்கை"}: {w.confidence}
                          </span>
                        </div>
                        <div style={{fontSize:13,color:"#1f3f68",fontWeight:600,marginBottom:2}}>{w.md} தசை / {w.ad} புக்தி</div>
                        {w.reasons.map((r,ri)=>(
                          <div key={ri} style={{fontSize:12.5,color:"#4a5365",lineHeight:1.6}}>• {r}</div>
                        ))}
                        {/* பிரத்யந்தர நுண்-windows — புக்திக்குள் மிகச் சாதகமான குறுகிய காலம் */}
                        {w.subWindows && w.subWindows.length > 0 && (
                          <div style={{marginTop:5,padding:"6px 8px",background:"#fafbfe",borderRadius:10,border:"1px dashed #a9823c60"}}>
                            <div style={{fontSize:12.5,fontWeight:700,color:"#7d6a3f",marginBottom:2}}>நுண்-காலம் (பிரத்யந்தர தசை):</div>
                            {w.subWindows.map((s,si)=>(
                              <div key={si} style={{fontSize:12.5,color:"#4a5365",lineHeight:1.7}}>
                                {(s.gochara || s.guruFav) ? "★ " : "• "}{s.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})} → {s.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})}
                                {" "}<b style={{color:"#1f3f68"}}>{s.name}</b> ({s.why}){s.gochara && <span style={{color:"#2e7d5b"}}> + கோசார ஆதரவு</span>}{s.guruFav && <span style={{color:"#2e7d5b"}}> + குரு பெயர்ச்சி சுபம்</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* கோசார ஆதரவு மாத-வீச்சுகள் */}
                        {w.transitRanges && w.transitRanges.length > 0 && (
                          <div style={{fontSize:12.5,color:"#2e7d5b",marginTop:3}}>
                            கோசார ஆதரவு: {w.transitRanges.map(r =>
                              `${r.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short'})}–${r.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short'})}${r.both?" (குரு+சனி)":""}`
                            ).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                    {/* இக்கேள்வியுடன் பிணைந்த வரிசை-நிபந்தனைகள் */}
                    {(() => {
                      const th = EVENT_TOPICS[eventTopic]?.primary;
                      const rel = (sequenceLinks || []).filter(lk => lk.after === th || lk.target === th);
                      if (!rel.length) return null;
                      return (
                        <div style={{marginTop:8,padding:"8px 10px",background:"#f5f7fb",borderRadius:12,border:"1px solid #e3e8f2"}}>
                          <div style={{fontSize:13,fontWeight:700,color:"#1f3f68",marginBottom:4}}>இக்கேள்வியுடன் பிணைந்த நிபந்தனைகள்</div>
                          {rel.map((lk,li)=>(
                            <div key={li} style={{fontSize:12.5,color:"#4a5365",lineHeight:1.6,marginBottom:3}}>
                              {lk.text} <span style={{color:"#1f3f68"}}>({lk.how})</span>
                              {lk.dashaNote && <span style={{color:"#2e7d5b",fontWeight:600}}> — {lk.dashaNote}</span>}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <div style={{fontSize:12.5,color:"#76819a",marginTop:6,lineHeight:1.5}}>
                      முறை: ஜாதக வாக்குறுதி (அதிபதி ஷட்பலம் + சூழல் + நவாம்சம் + காரகர்) → தசா-புக்தித் தூண்டல் (எடை-கூட்டல்) →
                      குரு+சனி இரட்டைக் கோசாரச் சரிபார்ப்பு. வாக்குறுதி பலவீனமாக இருந்தால் காலம் மட்டும் போதாது — பரிகாரம்/பொருத்தம் இணைக்கவும்.
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ நட்சத்திர-பாவக இணைப்பு — நட்சத்திராதிபதி வழி பாவத் தொடர்பு,
               பார்வைப் பலன், கோசார காலக்கட்டம், பரிகாரம் ═══ */}
          {advancedView==="nakbhava" && nakBhavaData==="loading" && (
            <div style={{...card,marginBottom:10,padding:"20px 14px",textAlign:"center",color:"#7d6a3f",fontSize:13}}>
              நட்சத்திர-பாவக இணைப்பு கணிக்கப்படுகிறது…
            </div>
          )}
          {advancedView==="nakbhava" && nakBhavaData && nakBhavaData!=="loading" && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:10,paddingLeft:10,borderLeft:"3px solid #b86084",lineHeight:1.4}}>
                நட்சத்திர-பாவக இணைப்பு
              </div>
              <div style={{fontSize:12.5,color:"#7d6a3f",marginBottom:10,lineHeight:1.6}}>
                ஒவ்வொரு கிரகத்தையும் தட்டினால் பார்வை, கோசார காலம், பரிகாரம் விரியும்.
              </div>
              {nakBhavaData.houses.map((hs,hi)=>(
                <div key={hi} style={{marginBottom:hs.isEmpty?6:10,padding:hs.isEmpty?"6px 10px":"10px 12px",borderRadius:12,
                  background:hs.isEmpty?"#f5f7fb":"#fcfdff",border:`1px solid ${hs.isEmpty?"#e9dcc0":"#e3e8f2"}`}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:"#1f3f68"}}>
                    {hs.houseNum}ஆம் வீடு ({hs.houseRashi}) — {hs.theme}
                  </div>
                  {hs.isEmpty ? (
                    <div style={{fontSize:12.5,color:"#76819a",marginTop:2}}>{hs.note}</div>
                  ) : hs.occupants.map((oc,oi)=>(
                    <div key={oi} style={{marginTop:8,paddingTop:8,borderTop:oi>0?"1px dashed #e3e8f2":"none"}}>
                      <div data-nb-toggle onClick={()=>toggleArea(`nb-${hi}-${oi}`)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:3,cursor:"pointer"}}>
                        <span style={{fontSize:13.5,fontWeight:700}}>{oc.symbol} {oc.ta}
                          {oc.star && <span style={{fontSize:12.5,color:"#7d6a3f",fontWeight:500}}> — {oc.star.nak}{oc.star.pada?`-${oc.star.pada}`:""} (அதிபதி: {oc.star.starLord})</span>}
                        </span>
                        <span style={{fontSize:12.5,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:oc.verdict.startsWith("சுபம்")?"#eaf5ef":oc.verdict.startsWith("அசுபம்")?"#fbeeed":"#f8f3e6",
                          color:oc.verdict.startsWith("சுபம்")?"#2e7d5b":oc.verdict.startsWith("அசுபம்")?"#c0564f":"#7d6a3f"}}>{oc.verdict}</span>
                        <ChevronDown size={16} color="#76819a" style={{flexShrink:0,transform:openAreas.has(`nb-${hi}-${oi}`)?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                      </div>
                      {openAreas.has(`nb-${hi}-${oi}`) && (<>
                      {/* 1. நட்சத்திராதிபதி வழி பாவகத் தொடர்பு + செயல்திறன் + KP + பாவ நிலை */}
                      {oc.star && (
                        <div style={{fontSize:12.5,lineHeight:1.65,color:"#4a5365",background:"#f5f7fb",border:"1px solid #e9dcc0",borderRadius:10,padding:"6px 8px",marginBottom:5}}>
                          {oc.star.text}
                          {(oc.linkPower?.self != null || oc.linkPower?.star != null) && (
                            <div style={{marginTop:3,fontSize:12.5,color:"#7d6a3f",fontWeight:600}}>
                              ⚡ செயல்திறன் (ஒருங்கிணைந்த பலம்): {oc.ta} {oc.linkPower.self != null ? `${oc.linkPower.self}/100` : "—"}
                              {oc.linkPower.star != null && <> • நட்சத்திராதிபதி {oc.star.starLord} {oc.linkPower.star}/100 — இணைப்பு இந்த அளவிலேயே செயல்படும்</>}
                            </div>
                          )}
                          {oc.kp && (
                            <div style={{marginTop:3,fontSize:12.5,color:oc.kp.nature==="சுபன்"||oc.kp.nature==="யோககாரகன்"?"#2e7d5b":oc.kp.nature==="பாபன்"?"#c0564f":"#7d6a3f",fontWeight:600}}>
                              {oc.kp.text}
                            </div>
                          )}
                          {oc.bhavaPos && (
                            <div style={{marginTop:3,fontSize:12.5,color:oc.bhavaPos.sandhi?"#c0564f":"#2e7d5b",fontWeight:600}}>
                              {oc.bhavaPos.text}
                            </div>
                          )}
                        </div>
                      )}
                      {/* 2. பார்வைகள் — ஸ்புட திருஷ்டி அளவுடன் (BPHS விருபா) */}
                      {oc.aspects.length > 0 ? oc.aspects.map((a,ai)=>(
                        <div key={ai} style={{fontSize:12.5,lineHeight:1.6,
                          color:a.tone==="சுபம்"?"#2e7d5b":a.tone==="அசுபம்"?"#c0564f":"#7d6a3f"}}>
                          <b>{a.from}</b> ({a.nature}{a.isSpecial?", சிறப்புப் பார்வை":""})
                          {a.virupa != null && <b style={{fontSize:12}}> [{a.virupa}/60 — {a.grade} பார்வை]</b>} — {a.text}
                        </div>
                      )) : (
                        <div style={{fontSize:12.5,color:"#76819a"}}>இக்கிரகத்தின் மீது எந்தப் பார்வையும் இல்லை — தன் இயல்பிலேயே பலன் தரும்</div>
                      )}
                      {/* 3. கோசாரம் — நாள்-அளவு windows + தசை இணைவு + வேதை + BAV/கக்ஷ்யா */}
                      {(oc.jupWindows.length > 0 || oc.satWindows.length > 0) && (
                        <div style={{marginTop:5,padding:"6px 8px",background:"#eaf5ef",border:"1px solid #cfe6da",borderRadius:10}}>
                          <div style={{fontSize:12.5,fontWeight:700,color:"#2e7d5b",marginBottom:2}}>கோசாரத்தில் பலன் வெளிப்படும் காலங்கள் (நாள்-அளவு துல்லியம், அடுத்த 12 ஆண்டு)</div>
                          {[...oc.jupWindows.map(w=>({...w,sym:"♃",col:"#2e7d5b"})), ...oc.satWindows.map(w=>({...w,sym:"♄",col:"#7d6a3f"}))].map((w,wi)=>(
                            <div key={wi} style={{marginBottom:5,paddingBottom:4,borderBottom:"1px dashed #cfe6da"}}>
                              <div style={{fontSize:12.5,lineHeight:1.6,color:w.col}}>{w.sym} <b>{w.label}</b> — {taText(w.text)}</div>
                              {w.dasha && (
                                <div style={{fontSize:12,lineHeight:1.6,color:w.dasha.conf==="மிக உயர்"||w.dasha.conf==="உயர்"?"#2e7d5b":w.dasha.conf==="குறை"?"#c0564f":"#7d6a3f"}}>
                                  தசை-இணைவு <b>[{w.dasha.conf}]</b>: {w.dasha.text}
                                </div>
                              )}
                              {w.vedha && (
                                <div style={{fontSize:12,lineHeight:1.6,color:w.vedha.vedha?"#c0564f":w.vedha.fav?"#2e7d5b":"#76819a"}}>
                                  வேதை: {w.vedha.text}
                                </div>
                              )}
                              {w.bav && (
                                <div style={{fontSize:12,lineHeight:1.6,color:"#7d6a3f"}}>
                                  {w.bav.text}
                                </div>
                              )}
                              {w.triggers && w.triggers.length > 0 && (
                                <div style={{fontSize:12,lineHeight:1.6,color:"#1f3f68",fontWeight:600}}>
                                  தூண்டு நாட்கள் (வேக கிரகம் ஜென்ம ஸ்புடம் தொடும்): {w.triggers.map((tg,tgi)=>(
                                    <span key={tgi}>{tgi>0 && " • "}{tg.planet==="சூரியன்"?"☉":"♂"} {tg.label}</span>
                                  ))} — இந்நாட்களில் நிகழ்வு வாய்ப்பு உச்சம் (±1-2 நாள்)
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 3ஆ. கூர்மையான தொடுகைகள் — நட்சத்திரம் / ஜென்ம ஸ்புடம் ±1° */}
                      {oc.touches && oc.touches.length > 0 && (
                        <div style={{marginTop:5,padding:"6px 8px",background:"#eef1fb",border:"1px solid #d8def2",borderRadius:10}}>
                          <div style={{fontSize:12.5,fontWeight:700,color:"#3e4c99",marginBottom:2}}>கூர்மையான தொடுகைகள் — நட்சத்திரம் & ஜென்ம ஸ்புட (±1°) அளவில்</div>
                          {oc.touches.map((tc,ti)=>(
                            <div key={ti} style={{fontSize:12,lineHeight:1.65,color:tc.type==="டிகிரி"?"#1f3f68":"#3e4c99",marginBottom:2}}>
                              <b>{tc.label}</b> — {tc.text}
                              {tc.swissNote && <b style={{color:"#2e7d5b"}}> [{tc.swissNote}]</b>}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 4. பரிகாரம் — யாருக்கு, எதற்காக, என்ன செய்ய */}
                      {oc.remedies.length > 0 ? (
                        <div style={{marginTop:5,padding:"6px 8px",background:"#fbeeed",border:"1px solid #f0d6d3",borderRadius:10}}>
                          <div style={{fontSize:12.5,fontWeight:700,color:"#c0564f",marginBottom:2}}>பரிகாரம்</div>
                          {oc.remedies.map((r,ri)=>(
                            <div key={ri} style={{marginBottom:5,paddingBottom:4,borderBottom:ri<oc.remedies.length-1?"1px dashed #f0d6d3":"none"}}>
                              <div style={{fontSize:12.5,fontWeight:700,color:"#1f3f68"}}>{r.planet} கிரக பரிகாரம்</div>
                              <div style={{fontSize:12,color:"#7d6a3f",lineHeight:1.6,fontStyle:"italic"}}>எதற்காக: {r.why}</div>
                              <div style={{fontSize:12.5,lineHeight:1.7,color:"#7d6a3f"}}>
                                மந்திரம்: {r.mantra} — {r.count}<br/>
                                கோயில்: {r.temple}<br/>
                                {r.day} அன்று {r.donate} தானம்
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{marginTop:5,fontSize:12.5,color:"#2e7d5b",background:"#eaf5ef",border:"1px solid #cfe6da",borderRadius:10,padding:"4px 8px"}}>
                          பரிகாரம் தேவையில்லை — இக்கிரகத்தின் இணைப்பும் பார்வைகளும் சுபமாக உள்ளன
                        </div>
                      )}
                      </>)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ═══ பின்நோக்கு சரிபார்ப்பு — உண்மை நிகழ்வுகளுடன் engine accuracy ═══ */}
          {advancedView==="backtest" && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:10,paddingLeft:10,borderLeft:"3px solid #6b9150",lineHeight:1.4}}>
                பின்நோக்கு சரிபார்ப்பு
              </div>
              <div style={{fontSize:12.5,color:"#7d6a3f",marginBottom:10,lineHeight:1.6}}>
                வாழ்க்கையில் <b>ஏற்கனவே நடந்த</b> நிகழ்வின் தேதியை உள்ளிடுங்கள் (எ.கா. திருமண நாள்) —
                அன்று ஓடிய தசை-புக்தி + அன்றைய குரு/சனி கோசாரத்தை இதே விதிகளால் மதிப்பிட்டு,
                "இந்நாளை முன்கூட்டியே அடையாளம் காட்டியிருக்குமா" என்று நேர்மையாகச் சொல்லும்.
                பொருந்தினால் விதிகள் சரி; பொருந்தாவிட்டால் அதுவே மேம்பாட்டுத் தரவு.
              </div>
              {/* கேள்வி தேர்வு */}
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                {Object.entries(EVENT_TOPICS).map(([k,v])=>(
                  <button key={k} onClick={()=>setBtTopic(k)} style={{
                    minHeight:38,padding:"0 14px",borderRadius:999,fontSize:14,fontWeight:600,cursor:"pointer",
                    border:`1px solid ${btTopic===k?"#1f3f68":"#e3e8f2"}`,
                    background:btTopic===k?"#1f3f68":"#f5f7fb",color:btTopic===k?"#fafbfe":"#4a5365"
                  }}>{v.ta}</button>
                ))}
              </div>
              {/* தேதி + சரிபார் */}
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                <input type="text" inputMode="numeric" maxLength={10} placeholder="நிகழ்வு தேதி (நாள்.மாதம்.ஆண்டு)"
                  value={btDateStr}
                  onChange={e=>setBtDateStr(formatDateInput(e.target.value))}
                  style={{flex:1,padding:"10px 12px",background:"#f5f7fb",border:"1.5px solid #c7a56830",borderRadius:10,fontSize:14,letterSpacing:1,fontFamily:"monospace",outline:"none"}}/>
                <button onClick={runBacktest} disabled={!isValidDDMMYYYY(btDateStr)} style={{
                  padding:"10px 16px",borderRadius:10,border:"none",cursor:isValidDDMMYYYY(btDateStr)?"pointer":"not-allowed",
                  background:isValidDDMMYYYY(btDateStr)?"linear-gradient(135deg,#1f3f68,#35598c)":"#ddd",
                  color:"#fafbfe",fontSize:13,fontWeight:700}}>சரிபார் →</button>
              </div>
              {/* முடிவு */}
              {btResult && (
                <div style={{marginBottom:10,padding:"10px 12px",borderRadius:12,
                  background:btResult.hit==="உயர்"?"#eaf5ef":btResult.hit==="குறை"?"#fbeeed":"#f8f3e6",
                  border:`1.5px solid ${btResult.hit==="உயர்"?"#2e7d5b":btResult.hit==="குறை"?"#f0d6d3":"#e9dcc0"}`}}>
                  <div style={{fontSize:13.5,fontWeight:800,marginBottom:3,
                    color:btResult.hit==="உயர்"?"#2e7d5b":btResult.hit==="குறை"?"#c0564f":"#7d6a3f"}}>
                    {btResult.verdict}
                  </div>
                  <div style={{fontSize:13,color:"#4a5365",marginBottom:4}}>
                    {btResult.topic} • {btDateStr} • {btResult.md} தசை / {btResult.ad} புக்தி • மதிப்பெண்: <b>{btResult.score}</b> ({btResult.hit})
                    <span style={{color:"#76819a"}}> — தசைப் பங்கு {btResult.dScore} + கோசாரப் பங்கு {btResult.tScore}</span>
                  </div>
                  {/* நிகழ்வு விழுந்த காலவீச்சுகள் — from → to */}
                  {btResult.windows && (
                    <div style={{marginBottom:6,padding:"7px 10px",background:"#fafbfe",borderRadius:12,border:"1px dashed #a9823c60"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#7d6a3f",marginBottom:3}}>நிகழ்வு விழுந்த காலவீச்சுகள்:</div>
                      {btResult.windows.md && (
                        <div style={{fontSize:12.5,color:"#4a5365",lineHeight:1.7}}>
                          • மகா தசை: <b style={{color:"#1f3f68"}}>{btResult.windows.md.name}</b>{" "}
                          {btResult.windows.md.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})} → {btResult.windows.md.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})}
                        </div>
                      )}
                      {btResult.windows.ad && (
                        <div style={{fontSize:12.5,color:"#4a5365",lineHeight:1.7}}>
                          • புக்தி: <b style={{color:"#1f3f68"}}>{btResult.windows.ad.name}</b>{" "}
                          {btResult.windows.ad.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})} → {btResult.windows.ad.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})}
                        </div>
                      )}
                      {btResult.windows.pad && (
                        <div style={{fontSize:12.5,color:"#4a5365",lineHeight:1.7}}>
                          {btResult.windows.pad.weighted ? "★" : "•"} பிரத்யந்தரம் (நுண்-காலம்): <b style={{color:"#1f3f68"}}>{btResult.windows.pad.name}</b>{" "}
                          {btResult.windows.pad.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})} → {btResult.windows.pad.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})}
                          {btResult.windows.pad.weighted && <span style={{color:"#2e7d5b"}}> — இக்கேள்வியுடன் தொடர்புள்ள நுண் காலம் ✓</span>}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Percentile — அறிவியல் ஒப்பீடு: நிகழ்வு நாள் vs வாழ்நாள் சீரிடை நாட்கள் */}
                  {btResult.percentile && (
                    <div style={{fontSize:13,fontWeight:700,marginBottom:4,padding:"5px 8px",borderRadius:10,
                      background:btResult.percentile.topPct<=10?"#eaf5ef":btResult.percentile.topPct<=30?"#f8f3e6":"#fbeeed",
                      color:btResult.percentile.topPct<=10?"#2e7d5b":btResult.percentile.topPct<=30?"#7d6a3f":"#c0564f"}}>
                      ஒப்பீடு: இந்நாளின் தூண்டல் அளவு, வாழ்நாளின் {btResult.percentile.n} சீரிடை நாட்களுடன் ஒப்பிட்டதில் <b>முதல் {btResult.percentile.topPct}%</b>
                      <span style={{fontWeight:400}}> (சராசரி நாள் மதிப்பெண் {btResult.percentile.median}, அதிகபட்சம் {btResult.percentile.max} — உங்கள் நாள் {btResult.score})</span>
                    </div>
                  )}
                  {/* ஜாதக வாக்குறுதி சூழல் */}
                  <div style={{fontSize:12.5,color:"#7d6a3f",marginBottom:4}}>
                    இக்கேள்விக்கான ஜாதக வாக்குறுதி: <b>{btResult.promise}/100</b> ({btResult.promiseVerdict})
                  </div>
                  {btResult.discNote && (
                    <div style={{fontSize:12.5,color:"#7d6a3f",fontWeight:600,marginBottom:4,padding:"4px 8px",background:"#f8f3e6",borderRadius:10,border:"1px dashed #e9dcc0"}}>
                      {btResult.discNote}
                    </div>
                  )}
                  {btResult.promiseNote && (
                    <div style={{fontSize:12.5,color:"#7d6a3f",fontStyle:"italic",marginBottom:4}}>{btResult.promiseNote}</div>
                  )}
                  {btResult.reasons.map((r,ri)=>(
                    <div key={ri} style={{fontSize:12.5,lineHeight:1.65,color:"#4a5365"}}>• {r}</div>
                  ))}
                </div>
              )}
              {/* மொத்த accuracy */}
              {backtests.length > 0 && (()=>{
                const matched = backtests.filter(b=>b.hit!=="குறை").length;
                const pct = Math.round(matched/backtests.length*100);
                // தவறு-பகுப்பாய்வு: miss-களில் எந்தப் பகுதி (தசை / transit) தவறியது —
                // இதுவே எந்த விதியை fine-tune செய்ய வேண்டும் என்பதன் நேரடி feedback
                const misses = backtests.filter(b=>b.hit==="குறை" && b.dScore!=null);
                const dashaMiss = misses.filter(b=>b.dScore<=1).length;
                const transitMiss = misses.filter(b=>b.tScore===0).length;
                const withPct = backtests.filter(b=>b.topPct!=null);
                const avgTop = withPct.length ? Math.round(withPct.reduce((s,b)=>s+b.topPct,0)/withPct.length) : null;
                return (
                  <div style={{padding:"8px 10px",background:"#e9dcc0",borderRadius:12,marginBottom:8}}>
                    <div style={{fontSize:13.5,fontWeight:700,color:"#1f3f68"}}>
                      மொத்த துல்லியம்: {backtests.length} நிகழ்வுகளில் {matched} பொருத்தம் — <span style={{color:pct>=70?"#2e7d5b":pct>=50?"#7d6a3f":"#c0564f"}}>{pct}%</span>
                      {avgTop!=null && <span style={{fontWeight:600,color:"#7d6a3f"}}> • சராசரி நிலை: முதல் {avgTop}%</span>}
                    </div>
                    {misses.length > 0 && (
                      <div style={{fontSize:12.5,color:"#c0564f",marginTop:2}}>
                        தவறு-பகுப்பாய்வு: தவறிய {misses.length} கணிப்புகளில் — தசை-தொடர்பின்மை {dashaMiss}, கோசார ஆதரவின்மை {transitMiss} (எந்த விதியை மேம்படுத்த வேண்டும் என்பதைக் காட்டுகிறது)
                      </div>
                    )}
                    <div style={{fontSize:12,color:"#7d6a3f",marginTop:2}}>பல ஜாதகங்களில் பல நிகழ்வுகளை சோதிக்க சோதிக்க இந்த அளவீடு நம்பகமாகும் — இதுவே உலகத்தர சான்று</div>
                  </div>
                );
              })()}
              {/* வரலாறு */}
              {backtests.map(b=>(
                <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,
                  padding:"5px 8px",marginBottom:4,borderRadius:10,background:"#f5f7fb",border:"1px solid #e9dcc0"}}>
                  <span style={{fontSize:12.5,color:"#4a5365"}}>{b.topic} • {b.dateStr} • {b.chart}</span>
                  <span style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    <b style={{fontSize:12.5,color:b.hit==="உயர்"?"#2e7d5b":b.hit==="குறை"?"#c0564f":"#7d6a3f"}}>{b.score} • {b.hit}</b>
                    <button onClick={()=>setBacktests(prev=>{const next=prev.filter(x=>x.id!==b.id);persistBacktests(next);return next;})}
                      style={{background:"none",border:"none",color:"#c0564f",fontSize:13,cursor:"pointer",padding:0}}>🗑</button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ═══ ஒருங்கிணைந்த கிரக பலம் — எல்லா பல-engine-களின் இணைப்பு மையம் ═══ */}
          {advancedView==="unified" && unifiedStrength && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:10,paddingLeft:10,borderLeft:"3px solid #8a62b0",lineHeight:1.4}}>
                ஒருங்கிணைந்த கிரக பலம்
              </div>
              {unifiedStrength.map((u,i)=>(
                <div key={i} style={{marginBottom:10,padding:"12px 14px",borderRadius:14,
                  background:u.composite>=60?"#eaf5ef":u.composite<45?"#fbeeed":"#f5f7fb",
                  border:`1px solid ${u.composite>=60?"#cfe6da":u.composite<45?"#f0d6d3":"#e3e8f2"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <span style={{flex:1,minWidth:0,fontSize:14,fontWeight:700,color:"#27303f"}}>{u.ta} <span style={{fontSize:12.5,fontWeight:500,color:"#76819a"}}>· {u.rashi}, {u.house}ஆம் வீடு</span></span>
                    <span style={{fontSize:13,fontWeight:800,color:u.composite>=60?"#2e7d5b":u.composite<45?"#c0564f":"#7d6a3f",whiteSpace:"nowrap"}}>{u.composite}/100 · {u.tier}</span>
                  </div>
                  {/* Composite bar */}
                  <div style={{height:6,background:"#eef1f6",borderRadius:6,marginBottom:5,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${u.composite}%`,background:u.composite>=60?"#2e7d5b":u.composite<45?"#c0564f":"#a9823c",borderRadius:6}}/>
                  </div>
                  {u.reasons.map((r,ri)=>(
                    <div key={ri} style={{fontSize:12.5,color:"#4a5365",lineHeight:1.6}}>• {r}</div>
                  ))}
                  {u.flags.length > 0 && (
                    <div style={{marginTop:4,display:"flex",gap:4,flexWrap:"wrap"}}>
                      {u.flags.map((f,fi)=>(
                        <span key={fi} style={{fontSize:12,fontWeight:700,padding:"2px 7px",borderRadius:12,
                          background:["யோககாரகன்","சுபன்"].includes(f)?"#eaf5ef":["பாபன்","மாரகாதிபதி","பாதகாதிபதி","அஸ்தங்கம்"].includes(f)?"#fbeeed":"#f8f3e6",
                          color:["யோககாரகன்","சுபன்"].includes(f)?"#2e7d5b":["பாபன்","மாரகாதிபதி","பாதகாதிபதி","அஸ்தங்கம்"].includes(f)?"#c0564f":"#7d6a3f"}}>{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ═══ கிரக சூழல் — inter-planet influence chain ═══ */}
          {advancedView==="planetcontext" && planetContext && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #5565b8",lineHeight:1.4}}>
                கிரக சூழல்
              </div>
              {planetContext[0]?.condNotes?.length > 0 && (
                <div style={{fontSize:12.5,color:"#7d6a3f",background:"#f5f7fb",border:"1px solid #e3e8f2",borderRadius:10,padding:"6px 8px",marginBottom:8,lineHeight:1.6}}>
                  {planetContext[0].condNotes.map((n,i)=><div key={i}>• {n}</div>)}
                </div>
              )}
              {planetContext.map((pc,i)=>(
                <div key={i} style={{marginBottom:8,padding:"8px 10px",borderRadius:12,
                  background:pc.net>=2?"#eaf5ef":pc.net<=-2?"#fbeeed":"#f5f7fb",
                  border:`1px solid ${pc.net>=2?"#cfe6da":pc.net<=-2?"#f0d6d3":"#e3e8f2"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:13.5,fontWeight:700}}>
                      {pc.symbol} {pc.ta} — {pc.rashi}, {pc.house}ஆம் வீடு
                      {pc.nakshatraTa && <span style={{fontSize:12.5,color:"#7d6a3f",fontWeight:400}}> ({pc.nakshatraTa}{pc.pada?`-${pc.pada}`:""})</span>}
                    </span>
                    <span style={{fontSize:13,fontWeight:800,
                      color:pc.net>=2?"#2e7d5b":pc.net<=-2?"#c0564f":"#7d6a3f"}}>{pc.verdict}</span>
                  </div>
                  {pc.chain.map((c,ci)=>(
                    <div key={ci} style={{fontSize:12.5,lineHeight:1.6,
                      color:c.score>0?"#2e7d5b":c.score<0?"#c0564f":"#4a5365"}}>
                      <b style={{color:"#1f3f68"}}>{c.k}:</b> {c.text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ═══ கிரக அவஸ்தைகள் ═══ */}
          {advancedView==="avasthas" && avasthasData && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #2e8b84",lineHeight:1.4}}>
                கிரக அவஸ்தைகள் — பலன் தீவிர அளவு
              </div>
              <div data-avastha-rows>
                {avasthasData.map((a,i)=>{
                  const c1 = a.baladi.pct>=100?"#2e7d5b":a.baladi.pct<=25?"#c0564f":"#7d6a3f";
                  const c2 = ["தீப்த","ஸ்வஸ்த","முதித"].includes(a.deeptadi)?"#2e7d5b":["கல","விகல","துக்கித"].includes(a.deeptadi)?"#c0564f":"#7d6a3f";
                  const c3 = a.jagradadi.includes("விழிப்பு")?"#2e7d5b":a.jagradadi.includes("உறக்கம்")?"#c0564f":"#7d6a3f";
                  const row = (label, name, desc, c) => (
                    <div style={{display:"flex",gap:10,padding:"5px 0",fontSize:13,lineHeight:1.55}}>
                      <span style={{width:86,flexShrink:0,color:"#76819a"}}>{label}</span>
                      <span style={{flex:1,minWidth:0}}><b style={{color:c}}>{name}</b><span style={{color:"#4a5365"}}> — {desc}</span></span>
                    </div>
                  );
                  return (
                    <div key={i} style={{padding:"11px 0",borderTop:i?"1px solid #eef1f6":"none"}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#27303f",marginBottom:3}}>{a.ta} <span style={{fontSize:12.5,fontWeight:500,color:"#76819a"}}>· {a.rashi} {a.degree}°</span></div>
                      {row("வயது நிலை", a.baladi.name, `${a.baladi.desc} (~${a.baladi.pct}%)`, c1)}
                      {row("கௌரவ நிலை", a.deeptadi, a.deeptadiDesc, c2)}
                      {row("விழிப்பு நிலை", a.jagradadi, a.jagradadiDesc, c3)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ பாவ பலம் ═══ */}
          {advancedView==="bhavabala" && bhavaBalaData && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #c07a4a",lineHeight:1.4}}>
                பாவ பலம் — எந்த வீடு பலமானது?
              </div>
              {bhavaBalaData.map((b,i)=>(
                <div key={i} style={{padding:"10px 0",borderTop:i?"1px solid #eef1f6":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <span style={{flex:1,minWidth:0,fontSize:13.5,fontWeight:700,color:"#27303f"}}>{b.houseNum}ஆம் வீடு · {b.houseRashi} <span style={{fontWeight:500,color:"#76819a"}}>· அதிபதி {b.lordName}</span></span>
                    <span style={{...chipSm,whiteSpace:"nowrap",color:b.verdict==="பலமுள்ளது"?"#2e7d5b":b.verdict==="பலவீனம்"?"#c0564f":"#7d6a3f",background:b.verdict==="பலமுள்ளது"?"#eaf5ef":b.verdict==="பலவீனம்"?"#fbeeed":"#f8f3e6"}}>{b.total} · {b.verdict}</span>
                  </div>
                  <div style={{height:7,background:"#eef1f6",borderRadius:10,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(100,(b.total/180)*100)}%`,height:"100%",borderRadius:10,
                      background:b.verdict==="பலமுள்ளது"?"#2e7d5b":b.verdict==="பலவீனம்"?"#c0564f":"#a9823c"}}/>
                  </div>
                  <div style={{fontSize:12.5,color:"#76819a",marginTop:5}}>
                    அதிபதி பலம் {b.lordBala} + திக்பலம் {b.digBala} + திருஷ்டி பலம் {b.drishtiBala}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ கோசாரம் (Transit Overlay) ═══ */}
          {advancedView==="transitoverlay" && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #b86084",lineHeight:1.4}}>
                கோசாரம் — இன்றைய கிரக நிலை
              </div>
              {transitOverlay && transitOverlay.length > 0 ? (
                <div>
                  <div data-transit-rows>
                    {transitOverlay.map((p,i) => {
                      const eff = p.transitEffect || "நடுநிலை";
                      const tone = eff==="சுபம்" ? ["#2e7d5b","#eaf5ef"] : eff==="அசுபம்" ? ["#c0564f","#fbeeed"] : ["#7d6a3f","#f8f3e6"];
                      return (
                        <div key={i} style={{padding:"10px 0",borderTop:i?"1px solid #eef1f6":"none"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{flex:1,minWidth:0,fontSize:14,fontWeight:700,color:"#27303f"}}>{p.ta} <span style={{fontWeight:600,color:"#1f3f68"}}>— {p.transitRashi||p.rashi}</span></span>
                            <span style={{...chipSm,color:tone[0],background:tone[1]}}>{eff}</span>
                          </div>
                          <div style={{fontSize:12.5,color:"#4a5365",lineHeight:1.65,marginTop:2}}>
                            உங்கள் ராசிக்கு {p.houseFromMoon}ஆம் இடம் · பிறப்பில் {p.birthRashi}
                          </div>
                          <div style={{fontSize:12.5,color:"#76819a",lineHeight:1.65}}>
                            {p.nakshatraTa || "—"}{p.pada ? `-${p.pada}` : ""}{p.nakLordName && p.nakLordName !== "—" ? ` (அதிபதி ${p.nakLordName})` : ""}
                            {p.tara ? <> · <span style={{fontWeight:600,color:p.tara.mood==="good"?"#2e7d5b":"#c0564f"}}>{p.tara.name}</span></> : null}
                            {p.vedha ? <> · <span style={{fontWeight:600,color:"#c0564f"}}>வேதை ({p.vedha.by})</span></> : null}
                            {p.gocharaFav && !p.vedha ? <> · <span style={{fontWeight:600,color:"#2e7d5b"}}>வேதை இல்லை</span></> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{fontSize:12.5,color:"#76819a",marginTop:8,lineHeight:1.5}}>
                    பச்சை தாரை = அந்தக் கிரக காரகங்கள் சாதகம் • சிவப்பு தாரை = அக்காலத்தில் கவனம் தேவை
                  </div>
                </div>
              ) : (
                <div style={{padding:"14px",background:"#f5f7fb",borderRadius:12,border:"1px solid #e3e8f2",textAlign:"center"}}>
                  <div style={{fontSize:13.5,color:"#7d6a3f",fontWeight:600}}>கோசார தரவு கிடைக்கவில்லை</div>
                  <div style={{fontSize:13,color:"#4a5365",marginTop:4}}>இன்றைய கிரக நிலைகள் பெறப்படும்போது கோசாரம் காட்டப்படும்</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ராகு காலம் / எமகண்டம் / குளிகை ═══ */}
          {advancedView==="rahukalam" && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #6b9150",lineHeight:1.4}}>
                இன்றைய ராகு காலம் / எமகண்டம் / குளிகை
              </div>
              {(() => {
                const times = inauspiciousTimes || calcInauspiciousTimes(new Date());
                return (
                  <div>
                    <div style={{fontSize:13,color:"#a9823c",fontWeight:600,marginBottom:10}}>
                      {times.vaaram} — {times.date.toLocaleDateString("ta-IN")}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      <div style={{padding:"12px 10px",background:"#fbeeed",borderRadius:12,border:"1px solid #f0d6d3",textAlign:"center"}}>
                        <div style={{fontSize:13,color:"#c0564f",fontWeight:700,marginBottom:4}}>ராகு காலம்</div>
                        <div style={{fontSize:14,color:"#c0564f",fontWeight:800}}>{to24h(times.rahuKalam.start)}</div>
                        <div style={{fontSize:13,color:"#4a5365"}}>முதல்</div>
                        <div style={{fontSize:14,color:"#c0564f",fontWeight:800}}>{to24h(times.rahuKalam.end)}</div>
                      </div>
                      <div style={{padding:"12px 10px",background:"#f5f7fb",borderRadius:12,border:"1px solid #e9dcc0",textAlign:"center"}}>
                        <div style={{fontSize:13,color:"#7d6a3f",fontWeight:700,marginBottom:4}}>எமகண்டம்</div>
                        <div style={{fontSize:14,color:"#7d6a3f",fontWeight:800}}>{to24h(times.yamaGandam.start)}</div>
                        <div style={{fontSize:13,color:"#4a5365"}}>முதல்</div>
                        <div style={{fontSize:14,color:"#7d6a3f",fontWeight:800}}>{to24h(times.yamaGandam.end)}</div>
                      </div>
                      <div style={{padding:"12px 10px",background:"#f4eefa",borderRadius:12,border:"1px solid #dccdea",textAlign:"center"}}>
                        <div style={{fontSize:13,color:"#6f4c92",fontWeight:700,marginBottom:4}}>குளிகை</div>
                        <div style={{fontSize:14,color:"#6f4c92",fontWeight:800}}>{to24h(times.gulikai.start)}</div>
                        <div style={{fontSize:13,color:"#4a5365"}}>முதல்</div>
                        <div style={{fontSize:14,color:"#6f4c92",fontWeight:800}}>{to24h(times.gulikai.end)}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:10,padding:"8px 12px",background:"#f5f7fb",borderRadius:12,border:"1px solid #e3e8f2"}}>
                      <div style={{fontSize:13,color:"#27303f"}}><span style={{color:"#76819a",fontWeight:600}}>சூரிய உதயம்:</span> {to24h(times.sunrise)}</div>
                      <div style={{fontSize:13,color:"#27303f"}}><span style={{color:"#76819a",fontWeight:600}}>அஸ்தமனம்:</span> {to24h(times.sunset)}</div>
                    </div>
                    <div style={{fontSize:12.5,color:"#76819a",marginTop:8,lineHeight:1.5}}>
                      இந்த நேரங்களில் சுபகாரியங்கள் தொடங்க வேண்டாம் • ராகு காலத்தில் புதிய பணி ஆரம்பிக்க வேண்டாம்
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ முஹூர்த்தம் ═══ */}
          {advancedView==="muhurtha" && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #8a62b0",lineHeight:1.4}}>
                முஹூர்த்தம் — இன்றைய சுப நேரம்
              </div>
              {(() => {
                const m = muhurthaData;
                if (!m) return null;
                return (
                  <div>
                    <div style={{padding:"12px",background:m.score>=60?"#eaf5ef":"#f5f7fb",borderRadius:12,border:`1px solid ${m.score>=60?"#cfe6da":"#e9dcc0"}`,marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:m.score>=60?"#2e7d5b":"#7d6a3f"}}>{m.verdict}</div>
                          <div style={{fontSize:13.5,color:"#27303f",marginTop:2}}>{m.vaaram} — திதி: {m.tithiName}</div>
                        </div>
                        <div style={{fontSize:28,fontWeight:900,color:m.score>=60?"#2e7d5b":"#7d6a3f"}}>{m.score}%</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                      <div style={{padding:"8px",background:m.isDayGood?"#eaf5ef":"#fbeeed",borderRadius:12,textAlign:"center",border:`1px solid ${m.isDayGood?"#cfe6da":"#f0d6d3"}`}}>
                        <div style={{fontSize:12.5,color:"#4a5365",marginBottom:2}}>கிழமை</div>
                        <div style={{fontSize:13.5,fontWeight:700,color:m.isDayGood?"#2e7d5b":"#c0564f"}}>{m.isDayGood?"சுபம்":"அசுபம்"}</div>
                      </div>
                      <div style={{padding:"8px",background:m.isTithiGood?"#eaf5ef":"#fbeeed",borderRadius:12,textAlign:"center",border:`1px solid ${m.isTithiGood?"#cfe6da":"#f0d6d3"}`}}>
                        <div style={{fontSize:12.5,color:"#4a5365",marginBottom:2}}>திதி</div>
                        <div style={{fontSize:13.5,fontWeight:700,color:m.isTithiGood?"#2e7d5b":"#c0564f"}}>{m.isTithiGood?"சுபம்":"அசுபம்"}</div>
                      </div>
                      <div style={{padding:"8px",background:m.isNakGood?"#eaf5ef":"#fbeeed",borderRadius:12,textAlign:"center",border:`1px solid ${m.isNakGood?"#cfe6da":"#f0d6d3"}`}}>
                        <div style={{fontSize:12.5,color:"#4a5365",marginBottom:2}}>நட்சத்திரம்</div>
                        <div style={{fontSize:13.5,fontWeight:700,color:m.isNakGood?"#2e7d5b":"#c0564f"}}>{m.isNakGood?"சுபம்":"அசுபம்"}</div>
                      </div>
                    </div>
                    {m.subaNeramSlots.length > 0 && (
                      <div style={{padding:"10px 12px",background:"#f5f7fb",borderRadius:12,border:"1px solid #e3e8f2",marginBottom:10}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#1f3f68",marginBottom:6}}>சுப நேரங்கள்</div>
                        {m.subaNeramSlots.map((s,i) => (
                          <div key={i} style={{fontSize:13,color:"#2e7d5b",fontWeight:600,padding:"3px 0",borderBottom:i<m.subaNeramSlots.length-1?"1px solid #eef1f6":"none"}}>{to24h(s).replace(" - ", "–")}</div>
                        ))}
                      </div>
                    )}
                    <div style={{padding:"10px 12px",background:"#eef1fb",borderRadius:12,border:"1px solid #d8def2"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#3e4c99",marginBottom:6}}>இன்று தொடங்கலாம்</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {m.activities.map((a,i) => (
                          <span key={i} style={{fontSize:12.5,padding:"3px 8px",borderRadius:10,background:"#eef1fb",color:"#3e4c99",border:"1px solid #d8def2"}}>{a}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ சனி-குரு பெயர்ச்சி ═══ */}
          {advancedView==="saniguru" && planetTransitAnalysis && (
            <div style={{...card,marginBottom:12,padding:"16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1f3f68",marginBottom:12,paddingLeft:10,borderLeft:"3px solid #5565b8",lineHeight:1.4}}>
                சனி-குரு பெயர்ச்சி பலன்கள்
              </div>
              {planetTransitAnalysis.sani && (
                <div style={{padding:"12px",background:planetTransitAnalysis.sani.effect==="சுபம்"?"#eaf5ef":planetTransitAnalysis.sani.effect==="அசுபம்"?"#fbeeed":"#f8f3e6",
                  borderRadius:12,border:`1px solid ${planetTransitAnalysis.sani.effect==="சுபம்"?"#cfe6da":planetTransitAnalysis.sani.effect==="அசுபம்"?"#f0d6d3":"#e9dcc0"}`,marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#3e4c99"}}>சனி பெயர்ச்சி</div>
                    <div style={{fontSize:13,fontWeight:600,padding:"3px 8px",borderRadius:10,
                      background:planetTransitAnalysis.sani.effect==="சுபம்"?"#eaf5ef":planetTransitAnalysis.sani.effect==="அசுபம்"?"#fbeeed":"#f8f3e6",
                      color:planetTransitAnalysis.sani.effect==="சுபம்"?"#2e7d5b":planetTransitAnalysis.sani.effect==="அசுபம்"?"#c0564f":"#7d6a3f"}}>
                      {planetTransitAnalysis.sani.effect}
                    </div>
                  </div>
                  <div style={{fontSize:13.5,color:"#27303f",marginBottom:4}}>
                    தற்போது: <span style={{fontWeight:700,color:"#1f3f68"}}>{planetTransitAnalysis.sani.currentRashi}</span> — சந்திரனிலிருந்து <span style={{fontWeight:700}}>{planetTransitAnalysis.sani.houseFromMoon}ம் வீடு</span>
                  </div>
                  {planetTransitAnalysis.sani.nakshatraTa && (
                    <div style={{fontSize:13,color:"#27303f",marginBottom:4}}>
                      நட்சத்திரப் பயணம்: <b>{planetTransitAnalysis.sani.nakshatraTa}{planetTransitAnalysis.sani.pada?`-${planetTransitAnalysis.sani.pada}`:""}</b> (அதிபதி: {planetTransitAnalysis.sani.nakLordName})
                      {planetTransitAnalysis.sani.tara && (
                        <span style={{fontWeight:700,marginLeft:4,color:planetTransitAnalysis.sani.tara.mood==="good"?"#2e7d5b":"#c0564f"}}>
                          • {planetTransitAnalysis.sani.tara.name} — {planetTransitAnalysis.sani.tara.desc.replace(/நாள்/g,"காலம்")}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{fontSize:13,color:"#27303f",lineHeight:1.6}}>{planetTransitAnalysis.sani.desc}</div>
                  {planetTransitAnalysis.sani.isSadeSati && (
                    <div style={{marginTop:8,padding:"8px 10px",background:"#fbeeed",borderRadius:10,border:"1px solid #f0d6d3"}}>
                      <div style={{fontSize:13.5,fontWeight:700,color:"#c0564f"}}>ஏழரை சனி நடப்பில் உள்ளது!</div>
                      <div style={{fontSize:13,color:"#27303f",marginTop:2}}>நிலை: {planetTransitAnalysis.sani.sadeSatiPhase}</div>
                    </div>
                  )}
                  {planetTransitAnalysis.sani.isAshtama && (
                    <div style={{marginTop:8,padding:"8px 10px",background:"#fbeeed",borderRadius:10,border:"1px solid #f0d6d3"}}>
                      <div style={{fontSize:13.5,fontWeight:700,color:"#c0564f"}}>அஷ்டமச் சனி — மிகவும் எச்சரிக்கையாக இருக்கவும்</div>
                    </div>
                  )}
                </div>
              )}
              {planetTransitAnalysis.guru && (
                <div style={{padding:"12px",background:planetTransitAnalysis.guru.effect==="சுபம்"?"#eaf5ef":planetTransitAnalysis.guru.effect==="அசுபம்"?"#fbeeed":"#f8f3e6",
                  borderRadius:12,border:`1px solid ${planetTransitAnalysis.guru.effect==="சுபம்"?"#cfe6da":planetTransitAnalysis.guru.effect==="அசுபம்"?"#f0d6d3":"#e9dcc0"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#7d6a3f"}}>குரு பெயர்ச்சி</div>
                    <div style={{fontSize:13,fontWeight:600,padding:"3px 8px",borderRadius:10,
                      background:planetTransitAnalysis.guru.effect==="சுபம்"?"#eaf5ef":planetTransitAnalysis.guru.effect==="அசுபம்"?"#fbeeed":"#f8f3e6",
                      color:planetTransitAnalysis.guru.effect==="சுபம்"?"#2e7d5b":planetTransitAnalysis.guru.effect==="அசுபம்"?"#c0564f":"#7d6a3f"}}>
                      {planetTransitAnalysis.guru.effect}
                    </div>
                  </div>
                  <div style={{fontSize:13.5,color:"#27303f",marginBottom:4}}>
                    தற்போது: <span style={{fontWeight:700,color:"#1f3f68"}}>{planetTransitAnalysis.guru.currentRashi}</span> — சந்திரனிலிருந்து <span style={{fontWeight:700}}>{planetTransitAnalysis.guru.houseFromMoon}ம் வீடு</span>
                  </div>
                  {planetTransitAnalysis.guru.nakshatraTa && (
                    <div style={{fontSize:13,color:"#27303f",marginBottom:4}}>
                      நட்சத்திரப் பயணம்: <b>{planetTransitAnalysis.guru.nakshatraTa}{planetTransitAnalysis.guru.pada?`-${planetTransitAnalysis.guru.pada}`:""}</b> (அதிபதி: {planetTransitAnalysis.guru.nakLordName})
                      {planetTransitAnalysis.guru.tara && (
                        <span style={{fontWeight:700,marginLeft:4,color:planetTransitAnalysis.guru.tara.mood==="good"?"#2e7d5b":"#c0564f"}}>
                          • {planetTransitAnalysis.guru.tara.name} — {planetTransitAnalysis.guru.tara.desc.replace(/நாள்/g,"காலம்")}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{fontSize:13,color:"#27303f",lineHeight:1.6}}>{planetTransitAnalysis.guru.desc}</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ கிரக வழிபாட்டு அட்டவணை (பொதுக் குறிப்பு) — தனிப்பட்ட தீர்ப்பு "பரிகாரம்" tab-இல் ═══ */}
          {advancedView==="remedies" && remediesData && remediesData.length > 0 && (
            <div style={{...card,marginBottom:10,padding:"16px"}}>
              <div style={secTitle}>கிரக வழிபாட்டு அட்டவணை</div>
              <button data-open-remedy-tab onClick={()=>{ showResultView("remedy"); window.scrollTo({top:0}); }} style={{display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",cursor:"pointer",
                padding:"11px 12px",borderRadius:12,background:"#e9f5f4",border:"1px solid #cfe6e3",marginBottom:12}}>
                <ShieldCheck size={18} color="#2e8b84" style={{flexShrink:0}}/>
                <span style={{flex:1,fontSize: 14,lineHeight:1.6,color:"#27303f"}}>இது ஒன்பது கிரகங்களின் பொதுக் குறிப்பு. <b>உங்களுக்கு எது தேவை, எந்த ரத்தினம் கூடாது</b> என்பதைப் "பரிகாரம்" பகுதி காட்டும்.</span>
                <ChevronRight size={17} color="#2e8b84" style={{flexShrink:0}}/>
              </button>
              {remediesData.map((r,i) => {
                const state = r.isDebilitated ? ["நீசம்","#c0564f","#fbeeed"] : r.isUnifiedWeak ? ["பலவீனம்","#b5683a","#faf0e8"] : r.isEnemy ? ["பகை வீடு","#a9823c","#f8f3e6"] : r.unifiedTier ? [r.unifiedTier,"#2e7d5b","#eaf5ef"] : null;
                return (
                <div key={i} style={{padding:"12px 0",borderTop:i?"1px solid #eef1f6":"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:7}}>
                    <div style={{fontSize: 14.5,fontWeight:700,color:"#27303f"}}>{r.ta} <span style={{fontSize: 13.5,color:"#76819a",fontWeight:500}}>· {r.rashi}{r.unifiedComposite!=null?` · ${r.unifiedComposite}/100`:""}</span></div>
                    {state && <span style={{...chipBase,fontSize: 12.5,color:state[1],background:state[2]}}>{state[0]}</span>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 10px",fontSize: 13.5,lineHeight:1.6,color:"#27303f"}}>
                    <div><span style={{color:"#76819a"}}>கிழமை:</span> {r.day}</div>
                    <div><span style={{color:"#76819a"}}>நிறம்:</span> {r.color}</div>
                    <div><span style={{color:"#76819a"}}>மலர்:</span> {r.flower}</div>
                    <div><span style={{color:"#76819a"}}>திசை:</span> {r.direction}</div>
                    <div style={{gridColumn:"1/3"}}><span style={{color:"#76819a"}}>கோயில்:</span> {r.temple}</div>
                    <div style={{gridColumn:"1/3"}}><span style={{color:"#76819a"}}>தானம்:</span> {r.donate}</div>
                    <div style={{gridColumn:"1/3"}}><span style={{color:"#76819a"}}>உரிய ரத்தினம்:</span> {r.gem}</div>
                  </div>
                  <div style={{marginTop:7,padding:"8px 10px",background:"#f5f7fb",borderRadius:10}}>
                    <div style={{fontSize: 13.5,color:"#1f3f68",fontWeight:600,lineHeight:1.6}}>{r.mantra}</div>
                    <div style={{fontSize: 12.5,color:"#76819a",marginTop:2}}>ஜெப எண்ணிக்கை: {r.mantraCount}</div>
                  </div>
                </div>);
              })}
              <div style={{fontSize: 13,color:"#76819a",lineHeight:1.7,marginTop:6}}>ரத்தினம் எல்லோருக்கும் பொருந்தாது — லக்னத்துக்கு நன்மை தரும் கிரகத்தின் ரத்தினம் மட்டுமே, அதுவும் ஜோதிடர் ஆலோசனையுடன்.</div>
            </div>
          )}

          </>)}

          {/* ═══ தசா ═══ */}
          {/* ═══ பரிகாரம் — வேர்க் காரணத்திலிருந்து (server கணக்கு) ═══ */}
          {resultTab==="remedy" && (
            <RemedyTab plan={remedyPlan} card={card} fmtDate={fmtDateTa} name={formData.name}
              onRetry={()=>setRemedyPlan(null)} onNav={handleNav} onShare={shareOut}
              onOpenAll={()=>{ showResultView("remedies"); window.scrollTo({top:0}); }} />
          )}

          {resultTab==="dasha" && (<>
          {/* தற்போதைய காலம் — நடப்பு தசை/புக்தி, தசாநாதன் நிலை */}
          {bhavaPhalam?.dashaContext && (()=>{
            const dc = bhavaPhalam.dashaContext;
            const fn = functionalNature && functionalNature[dc.mahaLord];
            const pc = planetContext?.find(x => x.ta === dc.mahaLord);
            const good = fn && (fn.nature==="யோககாரகன்" || fn.nature==="சுபன்");
            const chainOpen = openAreas.has("__dashaChain");
            return (
              <div style={{...card,marginBottom:10,padding:"16px"}}>
                <div style={{fontSize: 12,color:"#76819a",marginBottom:2}}>தற்போதைய காலம்</div>
                <div style={{fontSize: 17,fontWeight:700,color:"#1f3f68",marginBottom:8,lineHeight:1.4}}>
                  {dc.mahaLord} தசை{dc.antarLord ? ` · ${dc.antarLord} புக்தி` : ""}
                </div>
                <div style={{fontSize: 13,color:"#4a5365",lineHeight:1.7}}>
                  {dc.mahaLord} {dc.dashaLordHouse}ஆம் வீட்டில் ({dc.dashaLordRashi}){dc.dashaLordStrength ? ` — ${dc.dashaLordStrength}` : ""}.
                  {dc.rulesHouses.length > 0 && <span> இந்த தசையில் {dc.rulesHouses.join(", ")}ஆம் வீட்டு விஷயங்கள் முன்னணியில் இருக்கும்.</span>}
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
                  {dc.dashaLordUnified && (
                    <span style={{...chipBase,background:dc.dashaLordUnified.composite>=60?"#e9f5ee":dc.dashaLordUnified.composite<45?"#fbeeed":"#f3f5f9",
                      color:dc.dashaLordUnified.composite>=60?"#2e7d5b":dc.dashaLordUnified.composite<45?"#c0564f":"#4a5365"}}>தசாநாதன் பலம்: {dc.dashaLordUnified.tier}</span>
                  )}
                  {fn && (<span style={{...chipBase,background:good?"#e9f5ee":fn.nature==="பாபன்"?"#fbeeed":"#f3f5f9",color:good?"#2e7d5b":fn.nature==="பாபன்"?"#c0564f":"#4a5365"}}>உங்கள் லக்னத்திற்கு {fn.nature}</span>)}
                  {marakaBadhaka?.marakaLords.includes(dc.mahaLord) && <span style={{...chipBase,background:"#fbeeed",color:"#c0564f"}}>மாரகாதிபதி — ஆரோக்கியத்தில் கவனம்</span>}
                  {marakaBadhaka?.badhakaLord === dc.mahaLord && <span style={{...chipBase,background:"#fbeeed",color:"#c0564f"}}>பாதகாதிபதி — தடைகளில் கவனம்</span>}
                </div>
                {/* தசா சந்தி எச்சரிக்கை */}
                {dashaData && dashaSandhi && dashaSandhi.map((sa, si) => (
                  <div key={si} style={{fontSize: 12.5,marginTop:10,padding:"10px 12px",borderRadius:12,lineHeight:1.6,
                    background:sa.level==="high"?"#fbeeed":"#f6f1e4",color:sa.level==="high"?"#c0564f":"#7d6a3f"}}>{stripEmoji(sa.text)}</div>
                ))}
                {/* தசாநாதன் தன் ராசிநாதன், நட்சத்திராதிபதி, சேர்க்கை-பார்வை வழியாகவும் பலன் தருவான் */}
                {pc && (<>
                  <button onClick={()=>toggleArea("__dashaChain")} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",padding:0,marginTop:6,minHeight:40,fontSize: 13,fontWeight:600,color:"#1f3f68",cursor:"pointer"}}>
                    தசாநாதன் பலன் தரும் வழி <ChevronDown size={16} style={{transform:chainOpen?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                  </button>
                  {chainOpen && (
                    <div style={{marginTop:8}}>
                      {pc.chain.slice(0, 4).map((c, ci) => (
                        <div key={ci} style={{fontSize: 12.5,color:"#4a5365",lineHeight:1.65,display:"flex",gap:8,marginBottom:4}}>
                          <span style={{color:c.score>0?"#2e7d5b":c.score<0?"#c0564f":"#a3adc2",fontSize: 9,paddingTop:5,flexShrink:0}}>●</span>
                          <span><b style={{color:"#27303f"}}>{c.k}</b>: {c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>)}
              </div>
            );
          })()}

          {/* தசை முறை — விம்சோத்தரி / யோகினி / அஷ்டோத்தரி */}
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {[["vim","விம்சோத்தரி"],["yogini","யோகினி"],["ashtottari","அஷ்டோத்தரி"]].map(([k,l])=>(
              <button key={k} data-dasha-system={k} onClick={()=>{
                setDashaSystem(k);
                if (k !== "vim" && !altDashas) {
                  setAltDashas("loading");
                  apiAltDashas(buildBirth(chartMeta?.dobISO || parseDDMMYYYY(formData.dob), chartMeta?.finalTime || "06:00", chartMeta?.geo || resolveBirthGeo(formData)))
                    .then(setAltDashas).catch(()=>setAltDashas("error"));
                }
              }} style={{flex:1,padding:"8px 0",borderRadius:12,fontSize: 12.5,fontWeight:dashaSystem===k?700:500,cursor:"pointer",
                border:dashaSystem===k?"1px solid #a9823c":"1px solid #e3e8f2",background:dashaSystem===k?"#f6f1e4":"#ffffff",color:dashaSystem===k?"#7d6a3f":"#4a5365"}}>{l}</button>
            ))}
          </div>
          {dashaSystem!=="vim" && (
            <div data-alt-dasha style={{...card,marginBottom:10,padding:"16px"}}>
              <div style={{...secTitle,marginBottom:2}}>{dashaSystem==="yogini" ? "யோகினி தசை (36 ஆண்டு சுழற்சி)" : "அஷ்டோத்தரி தசை (108 ஆண்டு சுழற்சி)"}</div>
              {altDashas==="loading" && <div style={{fontSize: 13,color:"#76819a"}}>கணக்கிடப்படுகிறது…</div>}
              {altDashas==="error" && <div style={{fontSize: 13,color:"#c0564f"}}>பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.</div>}
              {altDashas && typeof altDashas==="object" && (altDashas[dashaSystem]?.dashas||[]).map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 8px",borderTop:i?"1px solid #eef1f6":"none",background:d.isCurrent?"#f1f4fa":"transparent",borderRadius:d.isCurrent?8:0}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize: 14,fontWeight:d.isCurrent?700:400,color:d.isCurrent?"#1f3f68":"#27303f"}}>
                      {d.name}{d.planet && d.planet!==d.name ? ` (${d.planet})` : ""}
                      {d.isCurrent && <span style={{fontSize: 11,background:"#e7edf8",color:"#1f3f68",padding:"1px 7px",borderRadius:999,fontWeight:700,marginLeft:8}}>நடப்பு</span>}
                    </div>
                    <div style={{fontSize: 12,color:"#4a5365",marginTop:1}}>{fmtDateTa(d.startDate)} — {fmtDateTa(d.endDate)}</div>
                  </div>
                  <span style={{fontSize: 12,color:"#4a5365",flexShrink:0}}>{d.years} ஆண்டு</span>
                </div>
              ))}
            </div>
          )}

          {/* ═══ 4. DASHA SUMMARY (with dates) ═══ */}
          {dashaSystem==="vim"&&dashaData&&(<div style={{...card,marginBottom:10,padding:"16px"}}>
            <div style={{...secTitle,marginBottom:2}}>விம்சோத்தரி தசா காலக்கணக்கு</div>
            <div style={{fontSize: 13,color:"#a9823c",marginBottom:8,marginTop:6}}>
              நட்சத்திரம்: <span style={{color:"#27303f"}}>{dashaData.birthNakshatra}</span> • நாதன்: <span style={{color:"#27303f"}}>{dashaData.birthLord.name}</span>
            </div>
            {dashaData.dashas.map((d,i)=>(
              <div key={i}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"11px 0",borderBottom:(expandedDasha===i||String(expandedDasha).startsWith(i+"-"))?"none":"1px solid #eef1f6",
                  background:d.isCurrent?"#f1f4fa":"transparent",cursor:"pointer"}}
                  onClick={()=>setExpandedDasha(expandedDasha===i||(typeof expandedDasha==='string'&&expandedDasha.startsWith(i+"-"))?null:i)}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize: 14,fontWeight:d.isCurrent?700:400,color:d.isCurrent?"#1f3f68":"#27303f"}}>{d.name} தசை</span>
                      {d.isCurrent&&<span style={{fontSize: 11,background:"#dcc27e20",color:"#1f3f68",padding:"1px 5px",borderRadius:4,fontWeight:700}}>நடப்பு</span>}
                    </div>
                    <div style={{fontSize: 12,color:"#4a5365",marginTop:1}}>
                      {fmtDateTa(d.startDate)} — {fmtDateTa(d.endDate)}
                    </div>
                  </div>
                  <span style={{fontSize: 12,color:"#4a5365"}}>{d.years} ஆண்டு</span>
                  <span style={{fontSize: 13,color:"#76819a",transition:"transform 0.2s",transform:(expandedDasha===i||String(expandedDasha).startsWith(i+"-"))?"rotate(180deg)":"rotate(0)"}}> ▾</span>
                </div>
                {(expandedDasha===i||String(expandedDasha).startsWith(i+"-"))&&d.antardashas&&(
                  <div style={{marginLeft:24,borderLeft:"2px solid #c7a56850",paddingLeft:10,marginBottom:6}}>
                    <div style={{fontSize: 12,color:"#4a5365",fontWeight:600,marginBottom:4,marginTop:2}}>புக்தி</div>
                    {d.antardashas.map((ad,j)=>(
                      <div key={j}>
                        <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 0",cursor:"pointer",
                          background:ad.isCurrent?"#f6f1e4":"transparent",borderRadius:4}}
                          onClick={(e)=>{e.stopPropagation();setExpandedDasha(expandedDasha===`${i}-${j}`?i:`${i}-${j}`)}}>
                          <span style={{fontSize: 13,flex:1,color:ad.isCurrent?"#a9823c":"#27303f"}}>{ad.name}
                            {ad.isCurrent&&<span style={{fontSize: 11,background:"#e8dcc0",color:"#a9823c",padding:"0 4px",borderRadius:3,marginLeft:4,fontWeight:700}}>நடப்பு</span>}
                          </span>
                          <span style={{fontSize: 11.5,color:"#76819a"}}>{ad.startDate.toLocaleDateString("ta-IN",{month:"short",year:"2-digit"})}</span>
                          <span style={{fontSize: 11.5,color:"#76819a",transition:"transform 0.2s",transform:expandedDasha===`${i}-${j}`?"rotate(180deg)":"rotate(0)"}}>▾</span>
                        </div>
                        {(expandedDasha===`${i}-${j}`||String(expandedDasha).startsWith(`${i}-${j}-`))&&ad.pratyantardashas&&(
                          <div style={{marginLeft:18,borderLeft:"1px solid #a9823c40",paddingLeft:8,marginBottom:4}}>
                            <div style={{fontSize: 11.5,color:"#4a5365",fontWeight:600,marginBottom:2,marginTop:2}}>பிரத்யந்தரம்</div>
                            {ad.pratyantardashas.map((pad,k)=>(
                              <div key={k}>
                                <div style={{display:"flex",alignItems:"center",gap:4,padding:"6px 0",cursor:"pointer",
                                  background:pad.isCurrent?"#e8f5e9":"transparent",borderRadius:3}}
                                  onClick={(e)=>{e.stopPropagation();setExpandedDasha(expandedDasha===`${i}-${j}-${k}`?`${i}-${j}`:`${i}-${j}-${k}`)}}>
                                  <span style={{fontSize: 12,flex:1,color:pad.isCurrent?"#2e7d5b":"#4a5365"}}>{pad.name}
                                    {pad.isCurrent&&<span style={{fontSize: 11,background:"#d4edda",color:"#2e7d5b",padding:"0 3px",borderRadius:3,marginLeft:3,fontWeight:700}}>நடப்பு</span>}
                                  </span>
                                  <span style={{fontSize: 11,color:"#76819a"}}>{pad.duration}</span>
                                  <span style={{fontSize: 11,color:"#76819a",transition:"transform 0.2s",transform:expandedDasha===`${i}-${j}-${k}`?"rotate(180deg)":"rotate(0)"}}>▾</span>
                                </div>
                                {expandedDasha===`${i}-${j}-${k}`&&pad.sookshmaDashas&&(
                                  <div style={{marginLeft:14,borderLeft:"1px solid #2e7d5b40",paddingLeft:6,marginBottom:3}}>
                                    <div style={{fontSize: 11,color:"#76819a",fontWeight:600,marginBottom:2,marginTop:2}}>சூட்சுமம்</div>
                                    {pad.sookshmaDashas.map((sd,l)=>(
                                      <div key={l} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 0",
                                        background:sd.isCurrent?"#e0f0ff":"transparent",borderRadius:3}}>
                                        <span style={{fontSize: 11.5,flex:1,color:sd.isCurrent?"#1565c0":"#4a5365"}}>{sd.name}
                                          {sd.isCurrent&&<span style={{fontSize: 11,background:"#cfe4fa",color:"#1565c0",padding:"0 3px",borderRadius:3,marginLeft:3,fontWeight:700}}>நடப்பு</span>}
                                        </span>
                                        <span style={{fontSize: 11,color:"#76819a"}}>{sd.duration}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>)}

          </>)}
        </div>
        <BottomNav active="chart" onNav={handleNav} />
      </div>
    );
  }

  // ═══════ PORUTHAM (Marriage Matching) ═══════
  if(screen===SCREEN.PORUTHAM) {
    const handlePorutham = async () => {
      if(!isValidDDMMYYYY(poruthBride.dob) || !isValidDDMMYYYY(poruthGroom.dob)) return;
      setPoruthLoading(true);

      // 12h + AM/PM → 24h (12 AM → 0, 12 PM → 12). நேரம் இல்லாவிடில் 06:00.
      const parseTob = (tob, ampm) => {
        if (!tob) return { hour: 6, minute: 0 };
        const [h, m] = tob.split(':').map(Number);
        let h24 = Number.isFinite(h) ? h : 6;
        if (ampm === "PM" && h24 < 12) h24 += 12;
        if (ampm === "AM" && h24 === 12) h24 = 0;
        return { hour: h24, minute: Number.isFinite(m) ? m : 0 };
      };
      const brideTob = parseTob(poruthBride.tob, poruthBride.ampm);
      const groomTob = parseTob(poruthGroom.tob, poruthGroom.ampm);
      const tob24Str = (t) => `${String(t.hour).padStart(2,'0')}:${String(t.minute).padStart(2,'0')}`;

      // Both charts + 10-porutham + dasha compatibility are computed in the
      // Worker (Chennai default geo, as before). Only the result returns.
      try {
        const bride = { dobISO: parseDDMMYYYY(poruthBride.dob), time24: tob24Str(brideTob), name: poruthBride.name };
        const groom = { dobISO: parseDDMMYYYY(poruthGroom.dob), time24: tob24Str(groomTob), name: poruthGroom.name };
        const res = await apiPorutham(bride, groom, ayanamsaKey);
        setPoruthResult(res);
      } catch (e) { /* leave previous result */ }
      setPoruthLoading(false);
    };

    return(
      <div style={base}>
        <div style={{...container,paddingTop:24,paddingBottom:104}}>
          <BackLink onClick={()=>goTo(SCREEN.HOME)} />

          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{width:52,height:52,borderRadius:16,background:"#fbeef2",color:"#c2607c",display:"grid",placeItems:"center",margin:"0 auto 8px"}}><Heart size={26} strokeWidth={1.8}/></div>
            <h2 style={{fontSize:20,fontWeight:700,color:"#1f3f68",margin:"0 0 4px"}}>திருமண பொருத்தம்</h2>
            <p style={{fontSize:12.5,color:"#76819a",margin:0}}>10 பொருத்தம் · தோஷ ஒப்பீடு · தசை ஒத்திசைவு</p>
          </div>

          <div style={{...card,marginBottom:12,boxShadow:`inset 3px 0 0 #d98aa3, ${card.boxShadow}`}}>
            <div style={{fontSize:13,fontWeight:600,color:"#c0564f",marginBottom:10}}>பெண் விவரம்</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input style={inputStyle} placeholder="பெண் பெயர்" value={poruthBride.name}
                onChange={e=>setPoruthBride(d=>({...d,name:e.target.value}))}/>
              <input type="text" inputMode="numeric" maxLength={10}
                style={{...inputStyle,letterSpacing:2,fontFamily:"monospace",fontSize:15}}
                placeholder="நாள்.மாதம்.ஆண்டு" value={poruthBride.dob}
                onChange={e=>setPoruthBride(d=>({...d,dob:formatDateInput(e.target.value)}))}/>
              <div style={{display:"flex",gap:8}}>
                <input type="text" inputMode="numeric" maxLength={5}
                  style={{...inputStyle,flex:1,letterSpacing:2,fontFamily:"monospace",fontSize:15}}
                  placeholder="மணி:நிமிடம் (விருப்பம்)" value={poruthBride.tob}
                  onChange={e=>setPoruthBride(d=>({...d,tob:formatTimeInput(e.target.value)}))}/>
                {["AM","PM"].map(ap=>(
                  <button key={ap} onClick={()=>setPoruthBride(d=>({...d,ampm:ap}))} style={{
                    padding:"8px 12px",borderRadius:8,fontSize:12,cursor:"pointer",
                    border:`1px solid ${poruthBride.ampm===ap?"#d98aa3":"#d9e0ee"}`,
                    background:poruthBride.ampm===ap?"#d98aa322":"transparent",
                    color:poruthBride.ampm===ap?"#c0564f":"#76819a"}}>
                    {ap==="AM"?"☀ காலை":"☽ மாலை"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{...card,marginBottom:16,boxShadow:`inset 3px 0 0 #7a93d9, ${card.boxShadow}`}}>
            <div style={{fontSize:13,fontWeight:600,color:"#7a93d9",marginBottom:10}}>ஆண் விவரம்</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input style={inputStyle} placeholder="ஆண் பெயர்" value={poruthGroom.name}
                onChange={e=>setPoruthGroom(d=>({...d,name:e.target.value}))}/>
              <input type="text" inputMode="numeric" maxLength={10}
                style={{...inputStyle,letterSpacing:2,fontFamily:"monospace",fontSize:15}}
                placeholder="நாள்.மாதம்.ஆண்டு" value={poruthGroom.dob}
                onChange={e=>setPoruthGroom(d=>({...d,dob:formatDateInput(e.target.value)}))}/>
              <div style={{display:"flex",gap:8}}>
                <input type="text" inputMode="numeric" maxLength={5}
                  style={{...inputStyle,flex:1,letterSpacing:2,fontFamily:"monospace",fontSize:15}}
                  placeholder="மணி:நிமிடம் (விருப்பம்)" value={poruthGroom.tob}
                  onChange={e=>setPoruthGroom(d=>({...d,tob:formatTimeInput(e.target.value)}))}/>
                {["AM","PM"].map(ap=>(
                  <button key={ap} onClick={()=>setPoruthGroom(d=>({...d,ampm:ap}))} style={{
                    padding:"8px 12px",borderRadius:8,fontSize:12,cursor:"pointer",
                    border:`1px solid ${poruthGroom.ampm===ap?"#7a93d9":"#d9e0ee"}`,
                    background:poruthGroom.ampm===ap?"#7a93d922":"transparent",
                    color:poruthGroom.ampm===ap?"#7a93d9":"#76819a"}}>
                    {ap==="AM"?"☀ காலை":"☽ மாலை"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button style={{...btnGold,opacity:(!isValidDDMMYYYY(poruthBride.dob)||!isValidDDMMYYYY(poruthGroom.dob)||poruthLoading)?0.4:1,
            pointerEvents:(!isValidDDMMYYYY(poruthBride.dob)||!isValidDDMMYYYY(poruthGroom.dob)||poruthLoading)?"none":"auto",
            }} data-porutham-submit onClick={handlePorutham}>
            {poruthLoading ? "கணக்கிடுகிறது…" : "பொருத்தம் பார்"}
          </button>

          {poruthResult&&(
            <div style={{marginTop:20}}>
              <div style={{...card,textAlign:"center",marginBottom:14}}>
                <div style={{position:"relative",width:100,height:100,margin:"0 auto 10px"}}>
                  <svg viewBox="0 0 100 100" style={{width:100,height:100}}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff10" strokeWidth="6"/>
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={poruthResult.totalScore>=9?"#58a97f":poruthResult.totalScore>=7?"#1f3f68":"#c0564f"}
                      strokeWidth="6" strokeDasharray={`${poruthResult.totalScore*(264/poruthResult.maxScore)} 264`}
                      strokeLinecap="round" transform="rotate(-90 50 50)"/>
                    <text x="50" y="46" textAnchor="middle" fill="#1f3f68" fontSize="24" fontWeight="700">{poruthResult.totalScore}</text>
                    <text x="50" y="62" textAnchor="middle" fill="#a9823c" fontSize="10">/{poruthResult.maxScore}</text>
                  </svg>
                </div>
                <div style={{fontSize:16,fontWeight:700,color:poruthResult.totalScore>=9?"#58a97f":poruthResult.totalScore>=7?"#1f3f68":"#c0564f"}}>
                  {poruthResult.grade}
                </div>
                <div style={{fontSize:12.5,color:"#a9823c",marginTop:4}}>{poruthResult.brideName||"பெண்"} ❤ {poruthResult.groomName||"ஆண்"}</div>
                <button data-share onClick={()=>shareOut("திருமண பொருத்தம்", [
                  `திருமண பொருத்தம்: ${poruthResult.brideName||"பெண்"} — ${poruthResult.groomName||"ஆண்"}`,
                  `${poruthResult.totalScore}/${poruthResult.maxScore} — ${poruthResult.grade}`,
                  `பொருந்துபவை: ${poruthResult.results.filter(r=>r.ok).map(r=>r.name).join(", ") || "—"}`,
                  `பொருந்தாதவை: ${poruthResult.results.filter(r=>!r.ok).map(r=>r.name).join(", ") || "—"}`,
                  "— ஜோதிட நிபுணர்",
                ].join("\n"))} style={{marginTop:12,background:"#ffffff",border:"1px solid #e3e8f2",borderRadius:999,padding:"8px 18px",color:"#1f3f68",fontSize: 13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
                  <Share2 size={15}/> பகிர்
                </button>
              </div>
              {poruthResult.results.map((r,i)=>(
                <div key={i} style={{...card,padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",gap:12,boxShadow:`inset 3px 0 0 ${r.ok?"#58a97f":"#c0564f"}`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,fontSize:14,background:r.ok?"#58a97f20":"#d98aa320",color:r.ok?"#58a97f":"#c0564f",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{r.ok?"✓":"✗"}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600,color:"#27303f"}}>{r.name}</span></div>
                    <div style={{fontSize:12.5,color:"#a9823c",marginTop:3,lineHeight:1.5}}>{r.desc}</div>
                  </div>
                </div>
              ))}
              {/* தசா-பொருத்தம் — கூடுதல் தகவல் (10-பொருத்த மதிப்பெண்ணில் சேராது) */}
              {poruthResult.dashaCompat && (
                <div style={{...card,padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",gap:12,
                  borderLeft:`3px solid ${poruthResult.dashaCompat.ok?"#58a97f":poruthResult.dashaCompat.neutral?"#c7a568":"#c0564f"}`,
                  background:"#fdf8ec"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",
                    background:poruthResult.dashaCompat.ok?"#58a97f20":poruthResult.dashaCompat.neutral?"#c7a56820":"#d98aa320"}}>⏳</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:13,fontWeight:600,color:"#27303f"}}>தசா-பொருத்தம்</span>
                      <span style={{fontSize:11.5,color:"#7d6a3f"}}>கூடுதல் (மதிப்பெண்ணில் சேராது)</span>
                    </div>
                    <div style={{fontSize:12.5,color:"#a9823c",marginTop:3,lineHeight:1.5}}>
                      பெண்: {poruthResult.dashaCompat.bride} தசை • ஆண்: {poruthResult.dashaCompat.groom} தசை — {poruthResult.dashaCompat.text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <BottomNav active="" onNav={handleNav} />
      </div>
    );
  }

  // ═══════ DAILY PREDICTION (தினப்பலன்) ═══════
  if(screen===SCREEN.DAILY && dailyData) {
    const { today, gochara, remedy, muhurtham, sadeSati, guruPeyarchi, taraBala, currentDasha } = dailyData;
    const moodColor = gochara.overallMood==="good" ? "#58a97f" : gochara.overallMood==="caution" ? "#c0564f" : "#1f3f68";
    const moodText = gochara.overallMood==="good" ? `${today.isOtherDate?"அன்று":"இன்று"} நல்ல நாள்` : gochara.overallMood==="caution" ? "கவனமாக இருக்க வேண்டிய நாள்" : "சாதாரண நாள்";
    const dailyGeo = resolveBirthGeo(formData);
    const currentHorai = calcCurrentHorai(liveClock, dailyGeo.lat, dailyGeo.lon); // live — refreshes every 30s via liveClock state

    return (
      <div style={base}>
        <div style={{...container,paddingTop:20,paddingBottom:104}}>
          <div style={{textAlign:"center",marginBottom:12}}>
            <h2 style={{fontSize:20,fontWeight:700,color:"#1f3f68",margin:"0 0 2px"}}>
              {today.isFuture?"எதிர்கால பலன்":today.isPast?"கடந்த நாள் பலன்":"இன்றைய பலன்"}
            </h2>
            <p style={{fontSize:12.5,color:"#76819a",margin:0}}>{formData.name ? `${formData.name} · ` : ""}{horoscope?.moonRashi ? `${horoscope.moonRashi} ராசி` : ""}</p>
            {today.isOtherDate && (
              <div style={{fontSize:11.5,color:today.isFuture?"#58a97f":"#4a5365",marginTop:3,fontWeight:600}}>
                {today.isFuture?"எதிர்கால கணிப்பு":"கடந்த நாளின் பலன் பார்வை"}
              </div>
            )}
          </div>

          {/* ═══ Date Navigator — browse to any past/future date ═══ */}
          <div style={{...card,marginBottom:12,padding:"8px 10px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button aria-label="முந்தைய நாள்" data-daily-prev onClick={()=>{
                const d = new Date(today.dateObj); d.setDate(d.getDate()-1);
                openDailyScreen(d);
              }} style={{width:40,height:40,display:"grid",placeItems:"center",background:"#f2f5fb",border:"1px solid #e3e8f2",borderRadius:12,color:"#1f3f68",cursor:"pointer",flexShrink:0}}><ChevronLeft size={20}/></button>

              {/* தேதி — தமிழில் காட்டப்படும்; தட்டினால் கருவியின் தேதித் தேர்வி திறக்கும் (மறைவான input மேலே படர்ந்துள்ளது) */}
              <label style={{position:"relative",flex:1,minHeight:40,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <span data-daily-date style={{fontSize: 14.5,fontWeight:700,color:"#27303f",lineHeight:1.35}}>{today.dateStr}</span>
                <span style={{fontSize:12,color:"#76819a",lineHeight:1.3,whiteSpace:"nowrap"}}>{kizhamai(today.dayName)} · மாற்ற தட்டவும்</span>
                <input type="date" aria-label="தேதியைத் தேர்ந்தெடுக்க" value={`${today.dateObj.getFullYear()}-${String(today.dateObj.getMonth()+1).padStart(2,'0')}-${String(today.dateObj.getDate()).padStart(2,'0')}`}
                  onChange={e=>{
                    if(!e.target.value) return;
                    const [y,m,d] = e.target.value.split('-').map(Number);
                    openDailyScreen(new Date(y, m-1, d));
                  }}
                  onClick={e=>{ try { e.currentTarget.showPicker && e.currentTarget.showPicker(); } catch(_){} }}
                  style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",border:"none",padding:0}}/>
              </label>

              <button aria-label="அடுத்த நாள்" data-daily-next onClick={()=>{
                const d = new Date(today.dateObj); d.setDate(d.getDate()+1);
                openDailyScreen(d);
              }} style={{width:40,height:40,display:"grid",placeItems:"center",background:"#f2f5fb",border:"1px solid #e3e8f2",borderRadius:12,color:"#1f3f68",cursor:"pointer",flexShrink:0}}><ChevronRight size={20}/></button>
            </div>
            {today.isOtherDate && (
              <button onClick={()=>openDailyScreen(null)} style={{
                marginTop:8,width:"100%",background:"none",border:"none",color:"#58a97f",
                fontSize:13,fontWeight:700,cursor:"pointer",padding:"10px 0 4px",minHeight:36
              }}>இன்றைக்கு திரும்பு</button>
            )}
          </div>

          {/* Live Horai — updates every ~30s. Only meaningful for "today"; hidden when browsing another date. */}
          {!today.isOtherDate && (
          <div style={{...card,marginBottom:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,
            border:`1px solid ${currentHorai.isBenefic?"#58a97f30":"#d98aa330"}`}}>
            <div style={{fontSize:24}}>{currentHorai.symbol}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11.5,color:"#4a5365"}}>இப்போது நடக்கும் ஹோரை (நேரலை)</div>
              <div style={{fontSize:13,fontWeight:700,color:currentHorai.isBenefic?"#58a97f":"#c0564f"}}>
                {currentHorai.planet} ஹோரை
              </div>
              <div style={{fontSize:11.5,color:"#4a5365"}}>{currentHorai.startLabel} — {currentHorai.endLabel}</div>
            </div>
            <div style={{fontSize:11.5,color:currentHorai.isBenefic?"#58a97f":"#c0564f",fontWeight:600,textAlign:"right"}}>
              {currentHorai.isBenefic?"✓ சுப நேரம்":"⚠ கவனம்"}
            </div>
          </div>
          )}

          {/* Mood Banner */}
          <div style={{...card,position:"relative",marginBottom:12,padding:"14px 44px",textAlign:"center",
            border:`1.5px solid ${moodColor}40`, background:`${moodColor}10`}}>
            <div style={{fontSize:15,fontWeight:700,color:moodColor}}>{moodText}</div>
            <button data-share onClick={()=>shareOut("இன்றைய பலன்", [
              `${formData.name} — ${today.dateStr} ${kizhamai(today.dayName)}`,
              moodText + (gochara.isChandrashtama ? " (சந்திராஷ்டமம்)" : ""),
              currentDasha?.mahadasha ? `நடப்பு தசை: ${currentDasha.mahadasha.name}${currentDasha.bhukti ? " / " + currentDasha.bhukti.name : ""}` : "",
              muhurtham ? `ராகு காலம்: ${muhurtham.rahuKalam}` : "",
              "— ஜோதிட நிபுணர்",
            ].filter(Boolean).join("\n"))} style={{position:"absolute",top:4,right:4,width:40,height:40,background:"none",border:"none",color:"#4a5365",cursor:"pointer",padding:0,display:"grid",placeItems:"center"}} aria-label="பகிர்"><Share2 size={17}/></button>
            {gochara.isChandrashtama && (
              <div style={{fontSize:12.5,color:"#c0564f",marginTop:6,fontWeight:600}}>
                ⚠ {today.isOtherDate?"அன்று":"இன்று"} சந்திராஷ்டமம் — புதிய காரியங்களைத் தவிர்க்கவும்
              </div>
            )}
            <div style={{fontSize:12,color:"#4a5365",marginTop:6}}>
              சுப கிரகங்கள்: {gochara.goodCount} • எச்சரிக்கை: {gochara.badCount}
            </div>
          </div>

          {/* ═══ Current Dasha chain — most important long-term personalization factor ═══ */}
          {currentDasha && (
            <div style={{...card,marginBottom:12,padding:"12px 14px",
              background:"linear-gradient(135deg,#c7a56812,#a9823c15)",border:"1px solid #c7a56825"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#a9823c",marginBottom:8,letterSpacing:0.5}}>
                {today.isOtherDate?"அன்றைய தசை சங்கிலி":"தற்போதைய தசை சங்கிலி"}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:11,color:"#4a5365",marginBottom:2}}>மகாதசை</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#1f3f68"}}>
                    {currentDasha.mahadasha.name}
                  </div>
                </div>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:11,color:"#4a5365",marginBottom:2}}>புக்தி (அந்தர் தசை)</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#a9823c"}}>
                    {currentDasha.bhukti?.name || currentDasha.mahadasha.name}
                  </div>
                </div>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:11,color:"#4a5365",marginBottom:2}}>பிரத்யந்தர தசை</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#1f3f68"}}>
                    {currentDasha.pratyantar?.name || "—"}
                  </div>
                </div>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:11,color:"#4a5365",marginBottom:2}}>சூட்சும தசை</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#a9823c"}}>
                    {currentDasha.sookshma?.name || "—"}
                  </div>
                </div>
              </div>
              {currentDasha.daysLeftInSookshma > 0 ? (
                <div style={{fontSize:11.5,color:"#4a5365",marginTop:6,textAlign:"center"}}>
                  இந்த சூட்சும தசை இன்னும் {currentDasha.daysLeftInSookshma} நாட்கள் நீடிக்கும்
                </div>
              ) : currentDasha.daysLeftInBhukti > 0 && (
                <div style={{fontSize:11.5,color:"#4a5365",marginTop:6,textAlign:"center"}}>
                  இந்த புக்தி இன்னும் {currentDasha.daysLeftInBhukti} நாட்கள் நீடிக்கும்
                </div>
              )}
            </div>
          )}

          {/* Sade Sati + Tara Bala row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {sadeSati && (
              <div style={{...card,padding:"10px 12px",
                border:`1px solid ${sadeSati.active?(sadeSati.severity==="high"?"#d98aa340":"#dcc27e30"):"#58a97f25"}`}}>
                <div style={{fontSize:11.5,color:"#4a5365",marginBottom:3}}>{sadeSati.active && !sadeSati.isEzharai ? "சனி கோசாரம்" : "ஏழரைச் சனி"}</div>
                <div style={{fontSize:12.5,fontWeight:700,
                  color:sadeSati.active?(sadeSati.severity==="high"?"#c0564f":"#1f3f68"):"#58a97f"}}>
                  {sadeSati.active ? sadeSati.phase : "இல்லை"}
                </div>
                {sadeSati.active && sadeSati.stage && <div data-sani-stage style={{fontSize:11.5,color:"#76819a",marginTop:2}}>{sadeSati.stage}</div>}
              </div>
            )}
            {taraBala && (
              <div style={{...card,padding:"10px 12px",
                border:`1px solid ${taraBala.mood==="good"?"#58a97f25":"#d98aa330"}`}}>
                <div style={{fontSize:11.5,color:"#4a5365",marginBottom:3}}>தாரா பலம்</div>
                <div style={{fontSize:12.5,fontWeight:700,color:taraBala.mood==="good"?"#58a97f":"#c0564f"}}>
                  {taraBala.mood==="good"?"✓ ":"⚠ "}{taraBala.name}
                </div>
              </div>
            )}
          </div>

          {/* Guru Peyarchi */}
          {guruPeyarchi && (
            <div style={{...card,marginBottom:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,
              border:`1px solid ${guruPeyarchi.mood==="good"?"#58a97f25":"#dcc27e30"}`}}>
              <div style={{fontSize:22}}>♃</div>
              <div style={{flex:1}}>
                <div style={{fontSize:11.5,color:"#4a5365"}}>குரு பெயர்ச்சி பலன் ({guruPeyarchi.rashi})</div>
                <div style={{fontSize:12.5,color:"#27303f",lineHeight:1.5,marginTop:2}}>{guruPeyarchi.desc}</div>
              </div>
            </div>
          )}

          {/* Muhurtham — Rahu Kalam, Yamagandam, Kuligai, Abhijit */}
          {muhurtham && (
            <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#1f3f68",marginBottom:2,borderBottom:"1px solid #c7a56830",paddingBottom:4}}>
                இன்றைய நல்ல நேரம் / தவிர்க்க வேண்டிய நேரம்
              </div>
              <div style={{fontSize:11.5,color:"#4a5365",marginBottom:8,marginTop:4}}>
                சூரிய உதயம் {muhurtham.sunrise} • அஸ்தமனம் {muhurtham.sunset} ({formData.pob ? formData.pob.split(",")[0] : "பிறந்த இடம்"} நேரப்படி)
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #eef1f6"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#58a97f",background:"#58a97f15",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>சுபம்</span>
                <span style={{fontSize:12.5,color:"#27303f"}}>அபிஜித் முகூர்த்தம்</span>
                <span style={{fontSize:12,color:"#a9823c",marginLeft:"auto"}}>{muhurtham.abhijit}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #eef1f6"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#c0564f",background:"#d98aa315",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>தவிர்க்க</span>
                <span style={{fontSize:12.5,color:"#27303f"}}>ராகு காலம்</span>
                <span style={{fontSize:12,color:"#a9823c",marginLeft:"auto"}}>{muhurtham.rahuKalam}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #eef1f6"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#c0564f",background:"#d98aa315",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>தவிர்க்க</span>
                <span style={{fontSize:12.5,color:"#27303f"}}>எமகண்டம்</span>
                <span style={{fontSize:12,color:"#a9823c",marginLeft:"auto"}}>{muhurtham.yamagandam}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#c0564f",background:"#d98aa315",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>தவிர்க்க</span>
                <span style={{fontSize:12.5,color:"#27303f"}}>குளிகை</span>
                <span style={{fontSize:12,color:"#a9823c",marginLeft:"auto"}}>{muhurtham.kuligai}</span>
              </div>
            </div>
          )}

          {/* Today's Panchangam */}
          <div style={{...card,marginBottom:12,padding:"12px 14px",fontSize:12}}>
            <div style={{fontSize:13,fontWeight:700,color:"#53763c",marginBottom:8,borderBottom:"2px solid #6b915030",borderLeft:"3px solid #6b9150",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
              இன்றைய பஞ்சாங்கம்
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>
                {(()=>{ const dp = dayPanchang(new Date(today.dateObj), dailyGeo.lat, dailyGeo.lon); return [
                  ["திதி", dp ? `${dp.tithi} — ${dp.tithiUntil}${dp.tithiNext ? `; பின் ${dp.tithiNext}` : ""}` : `${today.tithi}, ${today.paksham}`],
                  ["நட்சத்திரம்", dp ? `${dp.nakshatra} — ${dp.nakUntil}${dp.nakNext ? `; பின் ${dp.nakNext}` : ""}` : `${today.nakshatra}, பாதம் ${today.nakshatraPada||1}`],
                  ["யோகம்",today.yogam],
                  ["கரணம்",today.karanam],
                  ["சந்திர ராசி",today.moonRashi],
                ]; })().map(([l,v],i)=>(
                  <tr key={i} style={{borderTop:i?"1px solid #eef1f6":"none"}}>
                    <td style={{padding:"7px 0",color:"#76819a",width:"34%",fontSize:13,verticalAlign:"top"}}>{l}</td>
                    <td style={{padding:"7px 0 7px 6px",color:"#27303f",fontWeight:600,fontSize:13,lineHeight:1.5}}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ═══ இன்றைய அதிர்ஷ்ட எண்கள் (Daily Lucky Numbers) ═══ */}
          {(()=>{
            const moonRashiIdx = RASHIS.indexOf(horoscope.moonRashi);
            const todayNakIdx = NAKSHATRAS.indexOf(today.nakshatra);
            const dailyNums = dailyData?.luckyNums || {};
            const birthLucky = RASHI_LUCKY[moonRashiIdx >= 0 ? moonRashiIdx : 0];
            const todayNakLord = getNakshatraLord(todayNakIdx);
            return (
              <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#6f4c92",marginBottom:10,borderBottom:"2px solid #8a62b030",borderLeft:"3px solid #8a62b0",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                  {today.isOtherDate?"அன்றைய அதிர்ஷ்ட விவரங்கள்":"இன்றைய அதிர்ஷ்ட விவரங்கள்"}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"linear-gradient(135deg,#dcc27e10,#c7a56808)",borderRadius:8,padding:"10px 12px",border:"1px solid #dcc27e18"}}>
                    <div style={{fontSize:11.5,color:"#4a5365",marginBottom:4}}>{today.isOtherDate?"அன்றைய அதிர்ஷ்ட எண்கள்":"இன்றைய அதிர்ஷ்ட எண்கள்"}</div>
                    <div style={{fontSize:22,fontWeight:800,color:"#1f3f68",letterSpacing:6}}>
                      {dailyNums.join("  ")}
                    </div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#a9823c15,#c7a56808)",borderRadius:8,padding:"10px 12px",border:"1px solid #a9823c25"}}>
                    <div style={{fontSize:11.5,color:"#4a5365",marginBottom:4}}>அதிர்ஷ்ட நிறம்</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#a9823c"}}>{birthLucky.color}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}}>
                  <div style={{background:"#58a97f08",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"#4a5365"}}>நிரந்தர எண்</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#58a97f"}}>{birthLucky.nums.join(", ")}</div>
                  </div>
                  <div style={{background:"#dcc27e08",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"#4a5365"}}>அதிர்ஷ்ட திசை</div>
                    <div style={{fontSize:12.5,fontWeight:700,color:"#1f3f68"}}>{birthLucky.dir}</div>
                  </div>
                  <div style={{background:"#eceff7",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"#4a5365"}}>{today.isOtherDate?"அன்று நட்சத்திரம்":"இன்று நட்சத்திரம்"}</div>
                    <div style={{fontSize:12,fontWeight:700,color:"#a9823c"}}>{todayNakLord.name}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═══ NIYAMAM & PARIKARAM — ராசிக்கான நியமங்கள் & பரிகாரங்கள் ═══ */}
          {remedy && (
            <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#3e4c99",marginBottom:8,borderBottom:"2px solid #5565b830",borderLeft:"3px solid #5565b8",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                உங்கள் ராசிக்கான நியமங்கள் & பரிகாரங்கள்
              </div>

              {/* Constant Rashi info */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{background:"#dcc27e08",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:11.5,color:"#4a5365"}}>ஆட்சி கிரகம்</div>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#1f3f68"}}>{remedy.rashiInfo.lord}</div>
                </div>
                <div style={{background:"#dcc27e08",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:11.5,color:"#4a5365"}}>வழிபட வேண்டிய தெய்வம்</div>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#1f3f68"}}>{remedy.rashiInfo.deity}</div>
                </div>
                <div style={{background:"#eceff7",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:11.5,color:"#4a5365"}}>அணிய நல்ல நிறம்</div>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#27303f"}}>{remedy.rashiInfo.color}</div>
                </div>
                <div style={{background:"#eceff7",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:11.5,color:"#4a5365"}}>சாதகமான கிழமை</div>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#27303f"}}>{kizhamai(["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"][remedy.rashiInfo.favDay] || "")}</div>
                </div>
              </div>
              <div style={{background:"#58a97f08",border:"1px solid #58a97f20",borderRadius:6,padding:"8px 10px",marginBottom:10}}>
                <div style={{fontSize:11.5,color:"#58a97f90"}}>தினசரி ஜபிக்க வேண்டிய மந்திரம்</div>
                <div style={{fontSize:12,fontWeight:600,color:"#58a97f",fontFamily:"serif",marginTop:2}}>{remedy.rashiInfo.mantra}</div>
              </div>

              {/* Today's specific remedy */}
              <div style={{borderTop:"1px dashed #c7a56830",paddingTop:10}}>
                <div style={{fontSize:12.5,fontWeight:700,color:"#27303f",marginBottom:6}}>
                  இன்று ({kizhamai(today.dayName)}) செய்ய வேண்டியவை
                </div>
                {remedy.isSpecialDay && (
                  <div style={{fontSize:12,background:"#e6d2d2",color:"#1f3f68",padding:"4px 8px",borderRadius:6,marginBottom:6,fontWeight:600}}>
                    இன்று உங்கள் ராசி நாதன் ({remedy.rashiInfo.lord}) நாள் — சிறப்பு நாள்!
                  </div>
                )}
                <div style={{fontSize:12.5,color:"#27303f",lineHeight:1.7,marginBottom:6}}>
                  <span style={{color:"#a9823c"}}>வழிபாடு:</span> {remedy.dayInfo.remedy}
                </div>
                <div style={{fontSize:12.5,color:"#27303f",lineHeight:1.7,marginBottom:6}}>
                  <span style={{color:"#a9823c"}}>தானம்:</span> {remedy.dayInfo.donate}
                </div>
                <div style={{fontSize:12.5,color:"#27303f",lineHeight:1.7}}>
                  <span style={{color:"#a9823c"}}>தவிர்க்க வேண்டியது:</span> {remedy.dayInfo.avoid}
                </div>

                {/* Tithi-based guidance — changes daily (15-day cycle), keeps this from feeling like a 7-day repeat */}
                <div style={{marginTop:10,borderTop:"1px dashed #a9823c30",paddingTop:8}}>
                  <div style={{fontSize:12,color:"#a9823c",marginBottom:3}}>
                    இன்றைய திதி ({today.tithi}) வழிகாட்டுதல்
                  </div>
                  <div style={{fontSize:12.5,color:"#27303f",lineHeight:1.6}}>
                    {remedy.tithiInfo.note} — <span style={{color:"#58a97f"}}>{remedy.tithiInfo.activity}</span>
                  </div>
                </div>

                {remedy.isChandrashtama && (
                  <div style={{marginTop:10,background:"#d98aa310",border:"1px solid #d98aa330",borderRadius:6,padding:"8px 10px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#c0564f",marginBottom:3}}>⚠ சந்திராஷ்டம பரிகாரம்</div>
                    <div style={{fontSize:12,color:"#27303f",lineHeight:1.6}}>
                      இன்று புதிய காரியங்கள், பயணம், முக்கிய முடிவுகள் தவிர்க்கவும். சிவன் கோவிலில் "ஓம் நமசிவாய" 108 முறை ஜபிக்கவும். பால் அபிஷேகம் செய்தால் நல்லது.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gochara Transit Table */}
          <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#226b66",marginBottom:8,borderBottom:"2px solid #2e8b8430",borderLeft:"3px solid #2e8b84",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
              கிரக கோசாரம் (உங்கள் ராசி: {horoscope.moonRashi})
            </div>
            {gochara.results.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 4px",
                borderBottom:i<gochara.results.length-1?"1px solid #1f3f6808":"none",
                borderLeft:`3px solid ${grahaCardBorder(p.ta)}`,marginBottom:2,borderRadius:4,
                background:`${grahaCardBorder(p.ta)}08`}}>
                <span style={{fontSize:12.5,color:T.text,flex:1,fontWeight:600}}>{p.ta} — {p.rashi}</span>
                <span style={{fontSize:11.5,color:T.textMuted}}>{p.houseFromMoon}ஆம் வீடு</span>
                <span style={{
                  fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:5,
                  background:p.effect==="good"?T.good+"20":p.effect==="bad"?T.bad+"20":T.neutral+"15",
                  color:p.effect==="good"?T.good:p.effect==="bad"?T.bad:T.accentSoft
                }}>{p.effect==="good"?"சுபம்":p.effect==="bad"?"அசுபம்":"நடுநிலை"}</span>
              </div>
            ))}
          </div>

          {/* AI Daily Prediction */}
          <div style={{...card,marginBottom:12,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#c7a56830,#a9823c20)",
                display:"flex",alignItems:"center",justifyContent:"center",color:"#a9823c"}}><Sparkles size={17}/></div>
              <div style={{fontSize:13,fontWeight:600,color:"#1f3f68"}}>AI தினப்பலன்</div>
            </div>
            {dailyLoading ? (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{width:26,height:26,margin:"0 auto 8px",border:"2px solid #c7a56820",borderTop:"2px solid #c7a568",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                <p style={{color:"#a9823c",fontSize:12}}>தினப்பலன் உருவாக்குகிறது...</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
              </div>
            ) : dailyPrediction ? (
              <>
                <div style={{fontSize:13,lineHeight:1.9,color:"#27303f",whiteSpace:"pre-wrap"}}>{dailyPrediction}</div>
                {dailyAiOk && <AiTextFooter onReport={(reason, comment) => sendReport({ kind: "answer", mode: "daily", question: "AI தினப்பலன்", answer: dailyPrediction, reason, comment, app: APP_VERSION })} />}
              </>
            ) : (
              <button style={{...btnGold,width:"auto",padding:"10px 24px",display:"inline-block",fontSize:13}} onClick={fetchDailyPrediction}>
                {today.isOtherDate?"அன்றைய பலன் பெறு":"இன்றைய பலன் பெறு"} →
              </button>
            )}
          </div>

        </div>
        <BottomNav active="daily" onNav={handleNav} />
      </div>
    );
  }

  // ═══════ PANCHANGAM CALENDAR (Alb Astro style) ═══════
  if(screen===SCREEN.CALENDAR) {
    const MONTH_NAMES_TA = ["ஜனவரி","பிப்ரவரி","மார்ச்","ஏப்ரல்","மே","ஜூன்","ஜூலை","ஆகஸ்ட்","செப்டம்பர்","அக்டோபர்","நவம்பர்","டிசம்பர்"];
    const DAY_NAMES_TA = ["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"];
    const DAY_SHORT = ["ஞா","தி","செ","பு","வி","வெ","ச"];
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();

    // Tamil month mapping (approximate Gregorian mid-month to Tamil month)
    const TAMIL_MONTHS = ["தை","மாசி","பங்குனி","சித்திரை","வைகாசி","ஆனி","ஆடி","ஆவணி","புரட்டாசி","ஐப்பசி","கார்த்திகை","மார்கழி"];
    // தை-முதல் வரிசைக்கு January(0) → தை(0): நேரடி mapping. (முன்பு +9 offset
    // சித்திரை-முதல் பட்டியலுக்கானது தவறாகப் பயன்பட்டு ஜனவரி → ஐப்பசி என்று
    // 3 மாதம் தள்ளிக் காட்டியது. மாத நடுப்பகுதி வரை முந்தைய தமிழ் மாதம்
    // நடப்பதால் இது தோராயமே — header-க்கு இரண்டையும் காட்டுகிறோம்.)
    const tamilMonthIdx = calMonth % 12;
    const tamilMonthPrevIdx = (calMonth + 11) % 12;

    // Generate all day data for the month — prefer the backend (Swiss Ephemeris) result
    // for a day once the background fetch above has resolved it; every day still has an
    // instant local value to fall back to, so the grid never waits on the network.
    const calData = [];
    for(let d=1; d<=daysInMonth; d++){
      const dt = new Date(calYear, calMonth, d);
      const iso = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const backendDay = calBackendData[d];
      // பயனர் இடம் இருந்தால் அதன் sunrise/rahu-kalam — இல்லையேல் Chennai
      const calGeo = resolveBirthGeo(formData);
      const h = backendDay || generateHoroscope(iso, "06:00", calGeo.lat, calGeo.lon);
      const muh = calcMuhurtham(dt, calGeo.lat, calGeo.lon, 5.5);

      // Paksham calculation
      const paksham = h.paksham || "";
      const isPournami = h.tithi === "பௌர்ணமி" || (h.tithi === "பௌர்ணமி/அமாவாசை" && paksham.includes("சுக்ல"));
      const isAmavasai = h.tithi === "அமாவாசை" || (h.tithi === "பௌர்ணமி/அமாவாசை" && !paksham.includes("சுக்ல"));
      const isEkadashi = h.tithi === "ஏகாதசி";
      const isPradosham = h.tithi === "திரயோதசி";
      const isChaturthi = h.tithi === "சதுர்த்தி";

      // Categorize day
      let dayType = "normal"; // normal, good, bad, festival
      if(isPournami || isAmavasai || isEkadashi) dayType = "festival";
      else if(["பஞ்சமி","தசமி","சப்தமி"].includes(h.tithi)) dayType = "good";
      else if(["நவமி","அஷ்டமி"].includes(h.tithi)) dayType = "bad";

      calData.push({
        d, dt, dayOfWeek: dt.getDay(),
        tithi: h.tithi, nakshatra: h.nakshatra, yogam: h.yogam, karanam: h.karanam,
        paksham, moonRashi: h.moonRashi,
        sunrise: muh.sunrise, sunset: muh.sunset,
        rahuKalam: muh.rahuKalam, yamagandam: muh.yamagandam, kuligai: muh.kuligai, abhijit: muh.abhijit,
        dayType, isPournami, isAmavasai, isEkadashi, isPradosham, isChaturthi,
        isFromBackend: !!backendDay
      });
    }

    const sel = calData[calSelected - 1]; // Selected day data
    const selGeo = resolveBirthGeo(formData);
    const selPanchang = sel ? dayPanchang(new Date(calYear, calMonth, sel.d), selGeo.lat, selGeo.lon) : null; // உதய காலத் திதி/நட்சத்திரம் + முடிவு நேரம்
    const today = new Date();
    const isCurrentMonth = calMonth === today.getMonth() && calYear === today.getFullYear();

    return(
      <div style={base}>
        <div style={{...container,paddingTop:16,paddingBottom:104}}>
          <BackLink onClick={()=>goTo(SCREEN.HOME)} />

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:14}}>
            <div style={{fontSize: 20,fontWeight:700,color:"#1f3f68"}}>பஞ்சாங்கம்</div>
            <div style={{fontSize:12.5,color:"#76819a",marginTop:2}}>{TAMIL_MONTHS[tamilMonthPrevIdx]} / {TAMIL_MONTHS[tamilMonthIdx]} மாதம்</div>
          </div>

          {/* Month Navigator */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,padding:"6px 8px",
            background:"#e9f5f4",borderRadius:14,border:"1px solid #cfe6e3"}}>
            <button aria-label="முந்தைய மாதம்" onClick={()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);} else setCalMonth(m=>m-1); setCalSelected(1); }}
              style={{width:40,height:40,display:"grid",placeItems:"center",background:"#ffffff",border:"1px solid #cfe6e3",borderRadius:12,color:"#226b66",cursor:"pointer"}}><ChevronLeft size={20}/></button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:17,fontWeight:700,color:"#226b66"}}>{MONTH_NAMES_TA[calMonth]} {calYear}</div>
            </div>
            <button aria-label="அடுத்த மாதம்" onClick={()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);} else setCalMonth(m=>m+1); setCalSelected(1); }}
              style={{width:40,height:40,display:"grid",placeItems:"center",background:"#ffffff",border:"1px solid #cfe6e3",borderRadius:12,color:"#226b66",cursor:"pointer"}}><ChevronRight size={20}/></button>
          </div>

          {/* Calendar Grid — தேதி + குறிப் புள்ளிகள் மட்டும்; விவரம் கீழே தேர்ந்தெடுத்த நாள் அட்டையில் */}
          <div style={{...card,padding:"8px 8px 10px",marginBottom:10}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
              {DAY_SHORT.map((dh,i)=>(
                <div key={i} style={{textAlign:"center",fontSize:12,fontWeight:700,
                  color:i===0?"#c0564f":"#76819a",padding:"6px 0"}}>{dh}</div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {Array.from({length:firstDay},(_,i)=>(<div key={`e${i}`}/>))}
              {calData.map((cd,i)=>{
                const isTodayCell = isCurrentMonth && cd.d === today.getDate();
                const isSelected = cd.d === calSelected;
                const iso = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(cd.d).padStart(2,"0")}`;
                const isFest = calFestivals.year === calYear && calFestivals.list.some(f => f.iso === iso);
                const vk = calVratham.year === calYear ? (calVratham.map[iso] || []).map(v => v.key) : null;
                const mark = (key, flag) => (vk ? vk.includes(key) : flag);
                const dots = [mark("pournami", cd.isPournami) ? "#e0b84c" : null, mark("amavasai", cd.isAmavasai) ? "#27303f" : null, mark("ekadashi", cd.isEkadashi) ? "#2e8b84" : null, isFest ? "#c2607c" : null].filter(Boolean);
                return(
                  <button key={i} data-cal-day={cd.d} onClick={()=>setCalSelected(cd.d)} style={{
                    background:isSelected?"#1f3f68":cd.dayType==="good"?"#eef7f1":cd.dayType==="bad"?"#fbf1f0":"#ffffff",
                    border:isSelected?"1px solid #1f3f68":isTodayCell?"1.5px solid #a9823c":"1px solid #e9edf6",
                    borderRadius:10,padding:"6px 0 5px",minHeight:46,textAlign:"center",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4
                  }}>
                    <span style={{fontSize:15,fontWeight:isSelected||isTodayCell?800:600,lineHeight:1.2,
                      color:isSelected?"#ffffff":cd.dayOfWeek===0?"#c0564f":"#27303f"}}>{cd.d}</span>
                    <span style={{display:"flex",gap:3,height:6}}>
                      {dots.map((c,k)=>(<span key={k} style={{width:6,height:6,borderRadius:6,background:c,boxShadow:isSelected?"0 0 0 1px #ffffff":"none"}}/>))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{display:"flex",justifyContent:"center",gap:"6px 12px",marginBottom:14,flexWrap:"wrap"}}>
            {[["#e0b84c","பௌர்ணமி"],["#27303f","அமாவாசை"],["#2e8b84","ஏகாதசி"],["#c2607c","பண்டிகை"]].map(([c,l])=>(
              <span key={l} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11.5,color:"#4a5365"}}><span style={{width:7,height:7,borderRadius:7,background:c}}/>{l}</span>
            ))}
            <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11.5,color:"#4a5365"}}><span style={{width:11,height:11,borderRadius:3,background:"#eef7f1",border:"1px solid #cfe6da"}}/>சுப நாள்</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11.5,color:"#4a5365"}}><span style={{width:11,height:11,borderRadius:3,background:"#fbf1f0",border:"1px solid #f0d6d3"}}/>கவனம்</span>
          </div>

          {/* ═══ Selected Day Detail — Full Panchangam ═══ */}
          {sel && (
            <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
              {/* Day Header */}
              <div style={{background:"linear-gradient(135deg,#c7a56818,#a9823c15)",padding:"12px 14px",
                borderBottom:"1px solid #c7a56820"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:24,fontWeight:800,color:"#1f3f68"}}>{sel.d}</div>
                    <div style={{fontSize:12,fontWeight:600,color:"#27303f"}}>{DAY_NAMES_TA[sel.dayOfWeek]}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,color:"#a9823c"}}>{MONTH_NAMES_TA[calMonth]} {calYear}</div>
                    <div data-tamil-date style={{fontSize:12,color:"#4a5365"}}>{(()=>{ const md = calMuhurta.days ? calMuhurta.days.find(x => x.d === sel.d) : null; return md?.tamil ? `${md.tamil.month} ${md.tamil.day}` : `${TAMIL_MONTHS[tamilMonthPrevIdx]}/${TAMIL_MONTHS[tamilMonthIdx]}`; })()}</div>
                  </div>
                </div>
                {(()=>{
                  const iso = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(sel.d).padStart(2,"0")}`;
                  const fs = calFestivals.year === calYear ? calFestivals.list.filter(f => f.iso === iso) : [];
                  return fs.length ? (
                    <div data-day-festival style={{marginTop:8,fontSize: 13.5,fontWeight:700,color:"#99496a"}}>{fs.map(f => f.name).join(" · ")}</div>
                  ) : null;
                })()}
                {(()=>{
                  const iso = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(sel.d).padStart(2,"0")}`;
                  const TONE = { pournami:["#7d6a3f","#f6f1e4"], amavasai:["#27303f","#eceff5"], ekadashi:["#226b66","#e9f5f4"], pradosham:["#5565b8","#eef1fb"] };
                  const chips = calVratham.year === calYear
                    ? (calVratham.map[iso] || []).map(v => [v.note && v.key === "pradosham" ? v.note : v.name, ...(TONE[v.key] || ["#4a5365","#f3f5f9"])])
                    : [[sel.isPournami,"pournami","பௌர்ணமி"],[sel.isAmavasai,"amavasai","அமாவாசை"],[sel.isEkadashi,"ekadashi","ஏகாதசி"],[sel.isPradosham,"pradosham","பிரதோஷம்"],[sel.isChaturthi,"chaturthi","சதுர்த்தி"]]
                        .filter(x => x[0]).map(([,k,l]) => [l, ...(TONE[k] || ["#4a5365","#f3f5f9"])]);
                  return chips.length ? (
                    <div data-day-vratham style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                      {chips.map(([l,c,b])=>(<span key={l} style={{fontSize:11.5,background:b,color:c,padding:"3px 10px",borderRadius:999,fontWeight:700}}>{l}</span>))}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* பஞ்சாங்கம் — உதய காலத் திதி/நட்சத்திரம் + முடியும் நேரம் */}
              {(()=>{
                const dp = selPanchang;
                const rows = [
                  ["திதி", dp ? dp.tithi : sel.tithi, dp ? `${dp.tithiUntil}${dp.tithiNext ? ` · பின் ${dp.tithiNext}` : ""}` : (sel.paksham || "")],
                  ["நட்சத்திரம்", dp ? dp.nakshatra : sel.nakshatra, dp ? `${dp.nakUntil}${dp.nakNext ? ` · பின் ${dp.nakNext}` : ""}` : ""],
                  ["பக்ஷம்", sel.paksham?.includes("சுக்ல") ? "வளர்பிறை" : "தேய்பிறை", ""],
                  ["யோகம்", sel.yogam, ""], ["கரணம்", sel.karanam, ""], ["சந்திர ராசி", sel.moonRashi, ""],
                  ["சூரிய உதயம்", sel.sunrise, ""], ["சூரிய அஸ்தமனம்", sel.sunset, ""],
                ];
                return (
                  <div data-cal-panchang style={{padding:"6px 14px 4px",borderBottom:"1px solid #eef1f6"}}>
                    {rows.map(([l,v,x],i)=>(
                      <div key={l} style={{display:"flex",gap:10,padding:"8px 0",borderTop:i?"1px solid #f2f4f9":"none",fontSize: 13.5,lineHeight:1.5}}>
                        <span style={{width:128,flexShrink:0,color:"#76819a"}}>{l}</span>
                        <span style={{flex:1,minWidth:0}}>
                          <span style={{fontWeight:700,color:"#27303f",fontVariantNumeric:"tabular-nums"}}>{v||"—"}</span>
                          {x ? <span style={{display:"block",fontSize:12,color:"#76819a"}}>{x}</span> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* காலங்கள் — ராகு காலம், எமகண்டம், குளிகை, அபிஜித் */}
              <div style={{padding:"12px 14px"}}>
                <div style={{fontSize: 13.5,fontWeight:700,color:"#1f3f68",marginBottom:8}}>நல்ல நேரம் · தவிர்க்க வேண்டிய நேரம்</div>
                {[
                  {label:"அபிஜித் முகூர்த்தம்", value:sel.abhijit, good:true},
                  {label:"ராகு காலம்", value:sel.rahuKalam},
                  {label:"எமகண்டம்", value:sel.yamagandam},
                  {label:"குளிகை", value:sel.kuligai},
                ].map((k,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:i?"1px solid #f2f4f9":"none"}}>
                    <span style={{...chipSm,color:k.good?"#2e7d5b":"#c0564f",background:k.good?"#eaf5ef":"#fbeeed"}}>{k.good?"சுபம்":"தவிர்க்க"}</span>
                    <span style={{flex:1,fontSize: 13.5,fontWeight:600,color:"#27303f"}}>{k.label}</span>
                    <span style={{fontSize: 13.5,fontWeight:700,color:"#27303f",fontVariantNumeric:"tabular-nums"}}>{(k.value||"").replace(" — ","–")}</span>
                  </div>
                ))}
              </div>

              {/* நாளின் தன்மை — சுப மதிப்பு, சூலம், பஞ்சகம், (தனிப்பட்ட) தாரா பலம் / சந்திராஷ்டமம் */}
              {(()=>{
                const md = calMuhurta.days ? calMuhurta.days.find(x => x.d === sel.d) : null;
                const rows = [
                  md ? ["சுப மதிப்பு", `${md.verdict} (${md.score}/100)`, md.score >= 60 ? "#2e7d5b" : md.score < 40 ? "#c0564f" : "#4a5365"] : null,
                  ["வார சூலம்", `${VARA_SOOLAM[sel.dayOfWeek]} — இத்திசைப் பயணத்தைத் தவிர்ப்பது மரபு`, "#4a5365"],
                  md?.panchaka ? ["பஞ்சகம்", md.panchaka, "#c0564f"] : null,
                  md?.tara ? ["உங்கள் தாரா பலம்", `${md.tara.name} — ${md.tara.desc}`, md.tara.mood === "good" ? "#2e7d5b" : md.tara.mood === "bad" ? "#c0564f" : "#4a5365"] : null,
                  md?.chandrashtama ? ["சந்திராஷ்டமம்", "உங்கள் ராசிக்கு சந்திராஷ்டம நாள் — முக்கிய முடிவுகளைத் தவிர்க்கவும்", "#c0564f"] : null,
                ].filter(Boolean);
                return (
                  <div data-day-nature style={{padding:"4px 14px 10px",borderTop:"1px solid #eef1f6"}}>
                    {rows.map(([k,v,c],i)=>(
                      <div key={k} style={{display:"flex",gap:12,padding:"8px 0",borderTop:i?"1px solid #eef1f6":"none",fontSize: 13,lineHeight:1.6}}>
                        <span style={{width:104,flexShrink:0,color:"#76819a"}}>{k}</span>
                        <span style={{color:c,fontWeight:600}}>{v}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* கௌரி நல்ல நேரம் + ஹோரை அட்டவணை — தட்டினால் விரியும் */}
              {(()=>{
                const next = calData[sel.d] || sel; // மறுநாள் உதயம் (மாத இறுதியில் அதே நாள் மதிப்பு)
                const toMin = (hm) => { const [h,m] = String(hm).split(":").map(Number); return h*60 + (m||0); };
                const gowri = gowriForDay(sel.dayOfWeek, sel.sunrise, sel.sunset, next.sunrise);
                const horaRows = () => {
                  const sr = toMin(sel.sunrise), ss = toMin(sel.sunset), nsr = toMin(next.sunrise) + 1440;
                  const g2 = resolveBirthGeo(formData);
                  const at = (min) => { const d = new Date(sel.dt.getFullYear(), sel.dt.getMonth(), sel.dt.getDate(), 0, 0, 0); d.setMinutes(Math.round(min) + 1); return calcCurrentHorai(d, g2.lat, g2.lon); };
                  const out = [];
                  for (let i = 0; i < 12; i++) out.push({ ...at(sr + i * (ss - sr) / 12), night: false });
                  for (let i = 0; i < 12; i++) out.push({ ...at(ss + i * (nsr - ss) / 12), night: true });
                  return out;
                };
                const toggle = (k) => setCalOpen(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
                const head = (k, title, hint) => (
                  <button data-cal-toggle={k} onClick={()=>toggle(k)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,width:"100%",padding:"13px 14px",
                    background:"none",borderLeft:"none",borderRight:"none",borderBottom:"none",borderTop:"1px solid #eef1f6",cursor:"pointer",textAlign:"left"}}>
                    <span>
                      <span style={{display:"block",fontSize: 14,fontWeight:700,color:"#1f3f68"}}>{title}</span>
                      <span style={{display:"block",fontSize: 12,color:"#76819a"}}>{hint}</span>
                    </span>
                    <ChevronDown size={18} color="#76819a" style={{transform:calOpen.has(k)?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
                  </button>
                );
                const slot = (x, i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"7px 10px",borderRadius:10,marginBottom:4,
                    background:x.good?"#e9f5ee":"#fbeeed"}}>
                    <span style={{fontSize: 13,fontWeight:700,color:x.good?"#2e7d5b":"#c0564f"}}>{x.ta}</span>
                    <span style={{fontSize: 12.5,color:"#4a5365",fontFamily:"monospace"}}>{x.from} – {x.to}</span>
                  </div>
                );
                return (<>
                  {head("gowri", "கௌரி நல்ல நேரம்", "உத்தி, அமிர்தம், லாபம், தனம், சுகம் — நல்லவை")}
                  {calOpen.has("gowri") && (
                    <div data-gowri style={{padding:"0 14px 12px"}}>
                      <div style={{fontSize: 12,fontWeight:700,color:"#76819a",margin:"2px 0 6px"}}>பகல்</div>
                      {gowri.day.map(slot)}
                      <div style={{fontSize: 12,fontWeight:700,color:"#76819a",margin:"10px 0 6px"}}>இரவு</div>
                      {gowri.night.map(slot)}
                    </div>
                  )}
                  {head("hora", "ஹோரை அட்டவணை", "குரு, சுக்கிரன், புதன், சந்திரன் ஹோரைகள் சுபம்")}
                  {calOpen.has("hora") && (
                    <div data-hora style={{padding:"0 14px 12px"}}>
                      {horaRows().map((h, i) => (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderTop:i?"1px solid #f3f5f9":"none",fontSize: 13}}>
                          <span style={{width:22,textAlign:"center",color:"#a9823c"}}>{h.symbol}</span>
                          <span style={{flex:1,fontWeight:600,color:h.isBenefic?"#2e7d5b":"#4a5365"}}>{h.planet}{i===0?" (பகல்)":i===12?" (இரவு)":""}</span>
                          <span style={{fontSize: 12.5,color:"#4a5365",fontFamily:"monospace"}}>{h.startLabel} – {h.endLabel}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>);
              })()}
            </div>
          )}

          {/* ═══ இந்த மாத முக்கிய நாட்கள் — விரதம்/விசேஷம், சுப நாட்கள், சந்திராஷ்டமம் ═══ */}
          {(()=>{
            const days = calMuhurta.days;
            const personal = !!(horoscope && chartKeyRef.current === birthKey());
            const vratOf = (x) => {
              const v = [];
              if (x.tithiIdx === 15) v.push("பௌர்ணமி");
              if (x.tithiIdx === 30) v.push("அமாவாசை");
              if (x.tithiIdx === 11 || x.tithiIdx === 26) v.push("ஏகாதசி");
              if (x.tithiIdx === 13 || x.tithiIdx === 28) v.push("பிரதோஷம்");
              if (x.tithiIdx === 4) v.push("சதுர்த்தி");
              if (x.tithiIdx === 19) v.push("சங்கடஹர சதுர்த்தி");
              if (x.tithiIdx === 6) v.push("சஷ்டி");
              if (x.tithiIdx === 29) v.push("மாத சிவராத்திரி");
              if (x.nakshatra === "கார்த்திகை") v.push("கிருத்திகை");
              return v;
            };
            const dateChip = (x, bg, fg) => (
              <button key={x.d} onClick={()=>setCalSelected(x.d)} style={{fontSize: 13,fontWeight:700,minHeight:36,padding:"0 13px",borderRadius:999,border:"none",cursor:"pointer",background:bg,color:fg}}>
                {x.d} {DAY_SHORT[new Date(calYear, calMonth, x.d).getDay()]}
              </button>
            );
            return (
              <div data-month-days style={{...card,padding:"16px",marginBottom:12}}>
                <div style={{fontSize: 15,fontWeight:700,color:"#1f3f68",marginBottom:10}}>{MONTH_NAMES_TA[calMonth]} — முக்கிய நாட்கள்</div>
                {days === null && <div style={{fontSize: 13,color:"#76819a"}}>கணக்கிடப்படுகிறது…</div>}
                {days && days.length === 0 && <div style={{fontSize: 13,color:"#c0564f"}}>இந்தப் பட்டியலைப் பெற முடியவில்லை. இணைய இணைப்பைச் சரிபார்க்கவும்.</div>}
                {days && days.length > 0 && (<>
                  {(()=>{
                    const pre = `${calYear}-${String(calMonth+1).padStart(2,"0")}-`;
                    const fs = calFestivals.year === calYear ? calFestivals.list.filter(f => f.iso.startsWith(pre)) : [];
                    return (<>
                      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:6}}>
                        <div style={{fontSize: 12.5,fontWeight:700,color:"#99496a"}}>பண்டிகைகள்</div>
                        <button data-all-festivals onClick={()=>goTo(SCREEN.FESTIVALS)} style={{background:"none",border:"none",padding:"0 0 0 12px",minHeight:36,fontSize: 12.5,fontWeight:600,color:"#1f3f68",cursor:"pointer"}}>ஆண்டு முழுவதும் →</button>
                      </div>
                      {fs.length === 0 && <div style={{fontSize: 13,color:"#76819a",marginBottom:4}}>இந்த மாதம் முக்கியப் பண்டிகை இல்லை.</div>}
                      {fs.map((f) => { const d = Number(f.iso.slice(8)); return (
                        <button key={f.iso + f.name} data-month-festival onClick={()=>setCalSelected(d)} style={{display:"flex",gap:12,width:"100%",textAlign:"left",padding:"7px 0",background:"none",
                          borderLeft:"none",borderRight:"none",borderBottom:"none",borderTop:"1px solid #f3f5f9",cursor:"pointer",fontSize: 13,lineHeight:1.5}}>
                          <span style={{width:60,flexShrink:0,fontWeight:700,color:"#27303f"}}>{d} {DAY_SHORT[new Date(calYear, calMonth, d).getDay()]}</span>
                          <span style={{color:"#99496a",fontWeight:600}}>{f.name}</span>
                        </button>
                      ); })}
                    </>);
                  })()}
                  <div style={{fontSize: 12.5,fontWeight:700,color:"#226b66",margin:"14px 0 6px"}}>விரத நாட்கள்</div>
                  {(()=>{
                    // "பண்டிகைகள் → விரத நாட்கள்" பக்கத்தின் அதே server பட்டியல் (ஒவ்வொரு விரதத்துக்கும் உரிய நேர விதிப்படி).
                    // அது கிடைக்காதபோது மட்டும் உதய காலத் திதிப்படி தோராயப் பட்டியல்.
                    const vrOK = calVratham.year === calYear;
                    const rows = vrOK
                      ? days.map(x => { const iso = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(x.d).padStart(2,"0")}`;
                          return { d: x.d, names: (calVratham.map[iso] || []).map(v => v.key === "pradosham" && v.note ? v.note : v.name) }; }).filter(r => r.names.length)
                      : days.map(x => ({ d: x.d, names: vratOf(x).filter(n => n !== "சஷ்டி") })).filter(r => r.names.length);
                    return (<>
                      {rows.map((r) => (
                        <button key={r.d} data-month-vratham onClick={()=>setCalSelected(r.d)} style={{display:"flex",gap:12,width:"100%",textAlign:"left",padding:"7px 0",background:"none",
                          borderLeft:"none",borderRight:"none",borderBottom:"none",borderTop:"1px solid #f3f5f9",cursor:"pointer",fontSize: 13,lineHeight:1.5}}>
                          <span style={{width:60,flexShrink:0,fontWeight:700,color:"#27303f"}}>{r.d} {DAY_SHORT[new Date(calYear, calMonth, r.d).getDay()]}</span>
                          <span style={{color:"#4a5365"}}>{r.names.join(" · ")}</span>
                        </button>
                      ))}
                      {!vrOK && <div style={{fontSize: 11.5,color:"#a3adc2",marginTop:6,lineHeight:1.6}}>தோராயப் பட்டியல் (சூரிய உதயத் திதிப்படி). சரியான விரத நாட்களுக்கு இணையம் தேவை.</div>}
                    </>);
                  })()}

                  <div style={{fontSize: 12.5,fontWeight:700,color:"#53763c",margin:"14px 0 6px"}}>பொதுவான சுப நாட்கள்</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {days.filter(x => x.score >= 80 && !x.panchaka).map(x => dateChip(x, "#e9f5ee", "#2e7d5b"))}
                    {days.filter(x => x.score >= 80 && !x.panchaka).length === 0 && <span style={{fontSize: 13,color:"#76819a"}}>இந்த மாதம் மிகச் சிறந்த நாள் இல்லை; நல்ல நாட்களை நாள் விவரத்தில் பார்க்கவும்.</span>}
                  </div>
                  <div style={{fontSize: 11.5,color:"#76819a",marginTop:6,lineHeight:1.6}}>திருமணம் போன்ற முகூர்த்தங்களுக்கு இருவர் நட்சத்திரப்படியும் பார்க்க வேண்டும்.</div>

                  <div style={{fontSize: 12.5,fontWeight:700,color:"#99496a",margin:"14px 0 6px"}}>சந்திராஷ்டமம்</div>
                  {personal ? (
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {days.filter(x => x.chandrashtama).map(x => dateChip(x, "#fbeeed", "#c0564f"))}
                      {days.filter(x => x.chandrashtama).length === 0 && <span style={{fontSize: 13,color:"#76819a"}}>இந்த மாதம் இல்லை.</span>}
                    </div>
                  ) : (
                    <div style={{fontSize: 13,color:"#76819a",lineHeight:1.6}}>ஜாதகம் உருவாக்கினால் உங்கள் ராசிக்கான சந்திராஷ்டம நாட்களும் தாரா பலமும் இங்கே காட்டப்படும்.</div>
                  )}
                  {personal && <div style={{fontSize: 11.5,color:"#76819a",marginTop:6}}>{formData.name} — {horoscope.moonRashi} ராசி, {horoscope.nakshatra} நட்சத்திரப்படி.</div>}
                  <div style={{fontSize: 11.5,color:"#a3adc2",marginTop:10,lineHeight:1.6}}>ஊர், பஞ்சாங்க மரபைப் பொறுத்து விரத நாள் ஒரு நாள் வேறுபடலாம்.</div>
                </>)}
              </div>
            );
          })()}

          {/* Quick Today Button */}
          {!isCurrentMonth && (
            <button onClick={()=>{setCalMonth(today.getMonth());setCalYear(today.getFullYear());setCalSelected(today.getDate());}}
              style={{...btnOutline,fontSize:12.5,padding:"9px 0",borderColor:"#dcc27e30",color:"#1f3f68"}}>
              📍 இன்றைய தேதிக்கு செல்
            </button>
          )}
        </div>
        <BottomNav active="" onNav={handleNav} />
      </div>
    );
  }

  // எந்தப் பக்கமும் பொருந்தாத இடைநிலை (தரவு ஏற்றப்படும் வரை) — பாதுகாப்பு வலை effect திருப்பும்
  return (
    <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:"#76819a",fontSize: 14}}>ஏற்றுகிறது…</p>
    </div>
  );
}