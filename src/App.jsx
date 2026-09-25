import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MURUGAN_IMG } from "./murugan-b64.js";
// முனிவர் ராசி-சக்கர splash — 2 அடுக்குப் படங்கள்:
// ring   = முழு சக்கரம் (பாய்/ஓலை-நுனிகள் நீக்கியது) — வெளி நீல வளையம் சுழலும்;
// center = நடு தங்க வட்டம் முழுவதும் (முனிவர்+கதிர்+நூல்+விளக்கு) alpha-mask
//          பிரதி — அசையாமல் மேலே. வெளி வளையம் மட்டும் சுழல்வது தெரியும்.
import wheelRingImg from "./assets/rishi2-ring.webp";
import wheelCenterImg from "./assets/rishi2-center.webp";
// ── The proprietary interpretive engine runs ONLY in the Cloudflare
// Worker. The browser talks to it through api.js and never imports the
// engine. Public panchangam/ephemeris + trivial display helpers come from
// almanac.js (a tree-shaken client subset — see that file).
import {
  apiCompute, apiPredict, apiDaily, apiBacktest, apiEventTiming,
  apiNakBhava, apiPorutham, apiEngine,
} from "./api.js";
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
  const NAVA_COLORS = ["#e85d26","#c0c0c0","#dc2626","#22c55e","#eab308","#ec4899","#1e3a5f","#6366f1","#a78bfa"];

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
            <stop offset="0%" stopColor="#7b1c1c"/><stop offset="100%" stopColor="#b8860b"/>
          </linearGradient>
          <linearGradient id="cg2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626"/><stop offset="100%" stopColor="#6366f1"/>
          </linearGradient>
          <filter id="chakraGlow">
            <feGaussianBlur stdDeviation="1.5" result="g"/>
            <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <circle cx={cx} cy={cy} r="246" fill="none" stroke="#7b1c1c" strokeWidth="2" opacity="0.6" />
        <circle cx={cx} cy={cy} r="242" fill="none" stroke="#b8860b" strokeWidth="1" opacity="0.5" />
        <circle cx={cx} cy={cy} r="238" fill="none" stroke="#1e3a5f" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.4" />

        {zodiacSymbols.map((z, i) => {
          const a = (i/12)*Math.PI*2 - Math.PI/2;
          const col = ["#7b1c1c","#b8860b","#dc2626","#22c55e","#eab308","#6366f1","#ec4899","#1e3a5f","#e85d26","#22c55e","#6366f1","#b8860b"][i];
          return (
            <text key={i} x={cx+Math.cos(a)*228} y={cy+Math.sin(a)*228+5}
              textAnchor="middle" fill={col} fontSize="16" opacity="0.85"
              fontWeight="bold" filter="url(#chakraGlow)">{z}</text>
          );
        })}

        <circle cx={cx} cy={cy} r="215" fill="none" stroke="#7b1c1c" strokeWidth="0.6" strokeDasharray="2 6" opacity="0.35" />

        {petals(16, 172, 0.12, 32).map((d, i) => (
          <path key={`p1${i}`} d={d} fill="none" stroke={NAVA_COLORS[i%9]} strokeWidth="1.4" opacity="0.5" />
        ))}

        <circle cx={cx} cy={cy} r="172" fill="none" stroke="#7b1c1c" strokeWidth="1" opacity="0.4" />

        {petals(8, 132, 0.2, 36).map((d, i) => (
          <path key={`p2${i}`} d={d} fill="none" stroke="url(#cg2)" strokeWidth="1.5" opacity="0.5" />
        ))}

        {sacredChars.map((ch, i) => {
          const a = (i/12)*Math.PI*2 - Math.PI/2;
          return (
            <text key={`sc${i}`} x={cx+Math.cos(a)*157} y={cy+Math.sin(a)*157+4}
              textAnchor="middle" fill="#7b1c1c" fontSize="11" opacity="0.5"
              fontFamily="serif" fontWeight="bold">{ch}</text>
          );
        })}

        {[192, 172, 132, 100, 70, 45, 25].map((r, i) => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none"
            stroke={["#7b1c1c","#b8860b","#dc2626","#1e3a5f","#6366f1","#22c55e","#eab308"][i]} strokeWidth={i<2?"1":"0.7"}
            opacity={0.35-i*0.03} />
        ))}

        <polygon points={hexagon(150)} fill="none" stroke="#b8860b" strokeWidth="0.8" opacity="0.35" />
        <polygon points={hexagon(100)} fill="none" stroke="#7b1c1c" strokeWidth="0.7" opacity="0.3" />

        <polygon points={triangle(118, true)} fill="none" stroke="#7b1c1c" strokeWidth="1.8" opacity="0.6" filter="url(#chakraGlow)" />
        <polygon points={triangle(118, false)} fill="none" stroke="#1e3a5f" strokeWidth="1.8" opacity="0.55" filter="url(#chakraGlow)" />
        <polygon points={triangle(90, true)} fill="none" stroke="#dc2626" strokeWidth="1.4" opacity="0.45" />
        <polygon points={triangle(90, false)} fill="none" stroke="#6366f1" strokeWidth="1.4" opacity="0.45" />
        <polygon points={triangle(62, true)} fill="none" stroke="#b8860b" strokeWidth="1.2" opacity="0.4" />
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

        <circle cx={cx} cy={cy} r="8" fill="#b8860b" opacity="0.5" filter="url(#chakraGlow)">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r="4" fill="#7b1c1c" opacity="0.8">
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
              textAnchor="middle" fill="#7b1c1c" fontSize="10" opacity="0.5"
              fontFamily="'Noto Sans Tamil',sans-serif">{ch}</text>
          );
        })}
      </svg>

      <svg viewBox="0 0 500 500" style={{
        width:"100%", height:"100%", position:"absolute", top:0, left:0,
        animation:`chakraSpin ${speed*0.4}s linear infinite`
      }}>
        <circle cx={cx} cy={cy} r="18" fill="none" stroke="#7b1c1c" strokeWidth="0.6"
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

function TraditionalChart({ horoscope, navamsaData, title="ராசி", showNavamsa=true, gulika=null }) {
  const { lagna, placements } = horoscope;
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
      <svg viewBox={`-2 -2 ${W+4} ${H+4}`} style={{width:"100%",maxWidth:300,background:"#fff",borderRadius:4}}>
        <rect x="-1" y="-1" width={W+2} height={H+2} fill="none" stroke="#1a8d1a" strokeWidth="3"/>
        <rect x="2" y="2" width={W-4} height={H-4} fill="none" stroke="#1a8d1a" strokeWidth="1"/>
        {[1,2,3].map(i=>(
          <g key={i}>
            <line x1={cW*i} y1={0} x2={cW*i} y2={H} stroke="#1a8d1a" strokeWidth="1.5"/>
            <line x1={0} y1={cH*i} x2={W} y2={cH*i} stroke="#1a8d1a" strokeWidth="1.5"/>
          </g>
        ))}
        <rect x={cW} y={cH} width={cW*2} height={cH*2} fill="#fff" stroke="#1a8d1a" strokeWidth="1.5"/>
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
          const rowH = planets.length > 4 ? Math.max(10, (cH - 6) / planets.length) : 14;
          const totalH = planets.length * rowH;
          const startY = y + (cH - totalH) / 2;
          return (
            <g key={rashi}>
              {planets.map((p,pi)=>{
                const shortN = P_SHORT[p.ta] || p.ta.slice(0,3);
                // Nakshatra-pada beside planet (rasi chart only —
                // nakshatra belongs to the natal longitude, not navamsa)
                const nak = !isNavamsa ? nakPadaLabel(p) : "";
                return(
                  <text key={pi}
                    x={x + cW/2}
                    y={startY + pi*rowH + 10}
                    textAnchor="middle"
                    fill="#000" fontSize="10" fontWeight="600"
                    fontFamily="'Noto Sans Tamil',sans-serif">
                    {shortN}
                    {nak && <tspan dx="2" fontSize="6.5" fontWeight="400" fill="#555">{nak}</tspan>}
                  </text>
                );
              })}
              {isL && (
                <text x={x+cW/2} y={y+cH-4} textAnchor="middle"
                  fill="#cc0000" fontSize="10" fontWeight="900"
                  fontFamily="'Noto Sans Tamil',sans-serif">லக்
                  {!isNavamsa && horoscope.lagnaNakshatra && (
                    <tspan dx="2" fontSize="6.5" fontWeight="400" fill="#a33">
                      {nakPadaLabel({ nakIdx: NAKSHATRAS.indexOf(horoscope.lagnaNakshatra), nakshatraTa: horoscope.lagnaNakshatra, pada: horoscope.lagnaPada })}
                    </tspan>
                  )}</text>
              )}
              {/* குளிகன் — சனியின் காலப்பகுதி லக்னம் (ராசி chart மட்டும்) */}
              {!isNavamsa && gulika != null && rashi === gulika && (
                <text x={x+4} y={y+10} textAnchor="start"
                  fill="#555" fontSize="7" fontWeight="700"
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
        {renderChart(placements, lagna, "ராசி")}
      </div>
      {showNavamsa && navamsaData && (
        <div style={{flex:"1 1 auto",maxWidth:300,minWidth:200}}>
          {renderChart(navamsaData, navLagna, "நவாம்சம்", true)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TRADITIONAL SOUTH INDIAN JATHAGAM PDF — Temple Style
// ═══════════════════════════════════════════════════════════════════
function generateJathagamPDF(formData, horoscope, prediction) {
  const lagna = horoscope.lagna;
  const cW = 118, cH = 108;
  const chartW = cW*4, chartH = cH*4;
  const siPos = [
    {rashi:11,r:0,c:0},{rashi:0,r:0,c:1},{rashi:1,r:0,c:2},{rashi:2,r:0,c:3},
    {rashi:10,r:1,c:0},{rashi:3,r:1,c:3},{rashi:9,r:2,c:0},{rashi:4,r:2,c:3},
    {rashi:8,r:3,c:0},{rashi:7,r:3,c:1},{rashi:6,r:3,c:2},{rashi:5,r:3,c:3}
  ];
  const rashiPlanets = {};
  horoscope.placements.forEach(p => {
    const ri = RASHIS.indexOf(p.rashi);
    if (ri >= 0) { if (!rashiPlanets[ri]) rashiPlanets[ri] = []; rashiPlanets[ri].push(p); }
  });

  // ── Chart SVG (warm cream + maroon + gold) ──
  const cellsSVG = siPos.map(({rashi,r,c}) => {
    const x=c*cW, y=r*cH, isL=rashi===lagna;
    const planets=rashiPlanets[rashi]||[];
    const bg = isL
      ? `<rect x="${x+2}" y="${y+2}" width="${cW-4}" height="${cH-4}" fill="#fff3d4" rx="3"/>`
      : `<rect x="${x}" y="${y}" width="${cW}" height="${cH}" fill="#fffdf5"/>`;
    const rashiTa = `<text x="${x+6}" y="${y+15}" fill="${isL?"#7b1c1c":"#8b6060"}" font-size="9" font-weight="700" font-family="'Noto Sans Tamil',serif">${RASHIS[rashi]}</text>`;
    const rashiNum = `<text x="${x+cW-6}" y="${y+15}" text-anchor="end" fill="${isL?"#b8860b":"#bbb"}" font-size="8" font-family="serif">${rashi+1}</text>`;
    const lagnaBadge = isL ? `<rect x="${x+6}" y="${y+cH-20}" width="50" height="14" rx="3" fill="#7b1c1c"/><text x="${x+31}" y="${y+cH-9}" text-anchor="middle" fill="#fff3d4" font-size="8" font-weight="700" font-family="'Noto Sans Tamil',sans-serif">லக்னம்</text>` : "";
    const planetsHTML = planets.map((p,pi) => {
      const py = y + 28 + pi*16;
      const col = isL ? "#4a0000" : "#1a1a2e";
      const dcol = isL ? "#8b4500" : "#7b3030";
      return `<text x="${x+7}" y="${py+11}" fill="${isL?"#7b1c1c":"#8b4040"}" font-size="12" font-weight="700" font-family="serif">${p.symbol}</text>`
           + `<text x="${x+22}" y="${py+11}" fill="${col}" font-size="10" font-weight="600" font-family="'Noto Sans Tamil',sans-serif">${PLANET_SHORT[p.ta]||p.ta}</text>`
           + `<text x="${x+cW-5}" y="${py+11}" text-anchor="end" fill="${dcol}" font-size="8" font-family="monospace">${p.degree}°</text>`;
    }).join("");
    return bg + rashiTa + rashiNum + planetsHTML + lagnaBadge;
  }).join("");

  const chartSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${chartW} ${chartH}" width="${chartW}" height="${chartH}">
    <rect width="${chartW}" height="${chartH}" fill="#fffdf5"/>
    <rect x="0" y="0" width="${chartW}" height="${chartH}" fill="none" stroke="#7b1c1c" stroke-width="4"/>
    <rect x="4" y="4" width="${chartW-8}" height="${chartH-8}" fill="none" stroke="#d4a853" stroke-width="1.5"/>
    <rect x="7" y="7" width="${chartW-14}" height="${chartH-14}" fill="none" stroke="#7b1c1c" stroke-width="0.5"/>
    ${[1,2,3].map(i=>`
      <line x1="${cW*i}" y1="0" x2="${cW*i}" y2="${chartH}" stroke="#7b1c1c" stroke-width="1.5"/>
      <line x1="0" y1="${cH*i}" x2="${chartW}" y2="${cH*i}" stroke="#7b1c1c" stroke-width="1.5"/>
    `).join("")}
    <rect x="${cW}" y="${cH}" width="${cW*2}" height="${cH*2}" fill="#fdf6e3"/>
    <line x1="${cW}" y1="${cH}" x2="${cW*3}" y2="${cH*3}" stroke="#d4a85360" stroke-width="1"/>
    <line x1="${cW*3}" y1="${cH}" x2="${cW}" y2="${cH*3}" stroke="#d4a85360" stroke-width="1"/>
    <text x="${chartW/2}" y="${cH*2-18}" text-anchor="middle" fill="#7b1c1c" font-size="16" font-weight="700" font-family="'Noto Sans Tamil',serif">ராசி சக்கரம்</text>
    <text x="${chartW/2}" y="${cH*2}" text-anchor="middle" fill="#b8860b" font-size="10" font-family="'Noto Sans Tamil',sans-serif">தென் இந்திய முறை</text>
    <text x="${chartW/2}" y="${cH*2+16}" text-anchor="middle" fill="#aaa" font-size="8.5" font-family="monospace">Nirayana (Sidereal)</text>
    ${cellsSVG}
  </svg>`;

  // ── Planet rows ──
  const planetColors = ["#7b0000","#000080","#8b0000","#006400","#FF8C00","#8B008B","#00008B","#4B0082","#8B4513"];
  const planetRows = horoscope.placements.map((p,i) => {
    const isL2 = horoscope.placements[i].house === 1;
    return `<tr style="background:${i%2===0?"#fffdf5":"#fdf6e3"}">
      <td style="padding:8px 10px;font-size:13px;">${p.symbol||""}</td>
      <td style="padding:8px 10px;font-weight:700;color:#7b1c1c;font-size:13px;">${p.ta}</td>
      <td style="padding:8px 10px;color:#555;font-size:12px;">${p.en}</td>
      <td style="padding:8px 10px;font-weight:600;color:#1a1a2e;font-size:13px;">${p.rashi}</td>
      <td style="padding:8px 10px;text-align:center;color:#8b4500;font-weight:600;">${p.degree}°</td>
      <td style="padding:8px 10px;text-align:center;">
        <span style="background:${p.house===1?"#7b1c1c":"#e8e0d0"};color:${p.house===1?"#fff3d4":"#555"};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${p.house}</span>
      </td>
    </tr>`;
  }).join("");

  const birthTime = formData.tob ? `${formData.tob} ${formData.ampm}` : "—";
  const aiSection = prediction ? `
    <div class="page-break"></div>
    <div class="section" style="border-top:3px double #7b1c1c;padding-top:24px;">
      <div class="sec-head">
        <div class="sec-icon">🤖</div>
        <div class="sec-title">AI ஜோதிட பலன்</div>
        <div class="sec-sub">Powered by Claude AI</div>
      </div>
      <div style="background:#fffdf0;border:1px solid #d4a85340;border-left:4px solid #7b1c1c;border-radius:0 8px 8px 0;padding:20px 22px;margin-top:14px;">
        <p style="font-size:13.5px;line-height:2.1;color:#1a1a2e;white-space:pre-wrap;margin:0;font-family:'Noto Sans Tamil',serif;">${prediction}</p>
      </div>
    </div>` : "";

  const today = new Date().toLocaleDateString("ta-IN",{year:"numeric",month:"long",day:"numeric"});

  const html = `<!DOCTYPE html>
<html lang="ta">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(formData.name)} — ஜாதகம்</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@300;400;600;700&family=Noto+Serif+Tamil:wght@400;700&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Noto Sans Tamil','Segoe UI',sans-serif;background:#f5f0e8;color:#1a1a2e;min-height:100vh;}
@media print{
  body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .no-print{display:none!important;}
  .page-break{page-break-before:always;}
  .page{box-shadow:none!important;margin:0!important;border-radius:0!important;}
}
.page{max-width:760px;margin:20px auto;background:#fff;box-shadow:0 4px 40px #0002;border-radius:4px;overflow:hidden;}

/* ── TEMPLE HEADER ── */
.temple-header{
  background:linear-gradient(180deg,#7b1c1c 0%,#a52020 40%,#8b1a1a 100%);
  padding:0;text-align:center;position:relative;overflow:hidden;
}
.temple-border-top{height:8px;background:repeating-linear-gradient(90deg,#d4a853 0px,#d4a853 10px,#7b1c1c 10px,#7b1c1c 20px);}
.temple-border-bot{height:8px;background:repeating-linear-gradient(90deg,#d4a853 0px,#d4a853 10px,#7b1c1c 10px,#7b1c1c 20px);}
.temple-inner{padding:20px 30px 16px;}
.om-symbol{font-size:36px;color:#f0c75e;text-shadow:0 2px 8px #0005;line-height:1;margin-bottom:8px;}
.header-title{font-size:28px;font-weight:700;color:#fff3d4;letter-spacing:1px;font-family:'Noto Serif Tamil',serif;text-shadow:0 2px 6px #0006;margin-bottom:4px;}
.header-name{font-size:20px;font-weight:600;color:#f0c75e;margin-bottom:6px;}
.header-sub{font-size:11px;color:#f0c75eaa;letter-spacing:3px;font-weight:300;}
.header-stars{color:#f0c75e;font-size:16px;letter-spacing:6px;margin:8px 0 2px;}

/* ── GOLD DIVIDER ── */
.gold-div{height:3px;background:linear-gradient(90deg,transparent,#d4a853,#f0c75e,#d4a853,transparent);}
.gold-div-thin{height:1px;background:linear-gradient(90deg,transparent,#d4a85360,transparent);margin:16px 0;}

/* ── CONTENT ── */
.content{padding:28px 32px;}

/* ── SECTION ── */
.section{margin-bottom:28px;}
.sec-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #7b1c1c;}
.sec-icon{width:32px;height:32px;background:#7b1c1c;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.sec-title{font-size:15px;font-weight:700;color:#7b1c1c;font-family:'Noto Serif Tamil',serif;}
.sec-sub{font-size:10px;color:#aaa;margin-left:auto;}

/* ── INFO CARDS ── */
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.info-card{background:linear-gradient(135deg,#fffdf5,#fdf6e3);border:1px solid #d4a85340;border-left:3px solid #7b1c1c;border-radius:0 6px 6px 0;padding:12px 14px;}
.info-lbl{font-size:10px;color:#999;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;}
.info-val{font-size:15px;font-weight:700;color:#1a1a2e;}
.info-sub{font-size:10px;color:#b8860b;margin-top:3px;}

/* ── SUMMARY ROW ── */
.summary-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.sum-box{background:#7b1c1c;border-radius:6px;padding:12px 8px;text-align:center;}
.sum-lbl{font-size:9px;color:#f0c75eaa;margin-bottom:4px;letter-spacing:0.5px;}
.sum-val{font-size:13px;font-weight:700;color:#fff3d4;line-height:1.3;}

/* ── CHART ── */
.chart-wrap{display:flex;justify-content:center;padding:8px 0;}
.chart-caption{text-align:center;font-size:11px;color:#888;margin-top:8px;}

/* ── TABLE ── */
table{width:100%;border-collapse:collapse;font-size:13px;}
thead tr{background:#7b1c1c;}
th{padding:10px 10px;color:#fff3d4;font-weight:700;font-size:11px;text-align:left;letter-spacing:0.3px;}
td{border-bottom:1px solid #e8e0d0;}

/* ── FOOTER ── */
.footer{background:#7b1c1c;padding:14px 30px;text-align:center;}
.footer-border{height:4px;background:repeating-linear-gradient(90deg,#d4a853 0px,#d4a853 8px,#7b1c1c 8px,#7b1c1c 16px);margin-bottom:12px;}
.footer-text{font-size:10px;color:#f0c75eaa;line-height:1.8;}
.footer-om{font-size:20px;color:#f0c75e;margin-bottom:6px;}

/* ── PRINT BUTTON ── */
.print-btn{position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#7b1c1c,#a52020);color:#fff3d4;border:2px solid #d4a853;border-radius:50px;padding:14px 28px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px #7b1c1c60;font-family:'Noto Sans Tamil',sans-serif;letter-spacing:0.5px;}
.print-btn:hover{background:linear-gradient(135deg,#a52020,#c02020);}
</style>
</head>
<body>
<div class="page">

  <!-- TEMPLE HEADER -->
  <div class="temple-header">
    <div class="temple-border-top"></div>
    <div class="temple-inner">
      <img src="${MURUGAN_IMG}" alt="முருகன்" style="width:90px;height:90px;object-fit:contain;border-radius:50%;border:2px solid #d4a853;box-shadow:0 0 20px #d4a85340;margin-bottom:8px;"/>
      <div class="header-stars">✦ ✦ ✦ ✦ ✦</div>
      <div class="header-title">ஜாதக விவரம்</div>
      <div class="header-name">${escapeHtml(formData.name)}</div>
      <div class="header-sub">JATHAGAM &nbsp;•&nbsp; VEDIC BIRTH CHART &nbsp;•&nbsp; தமிழ் ஜோதிடம்</div>
      <div class="header-stars" style="margin-top:10px;">★ ★ ★ ★ ★</div>
    </div>
    <div class="temple-border-bot"></div>
  </div>

  <div class="gold-div"></div>

  <div class="content">

    <!-- BIRTH DETAILS -->
    <div class="section">
      <div class="sec-head">
        <div class="sec-icon">📋</div>
        <div class="sec-title">பிறப்பு விவரங்கள்</div>
        <div class="sec-sub">Birth Details</div>
      </div>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-lbl">பெயர் / Name</div>
          <div class="info-val">${escapeHtml(formData.name)}</div>
        </div>
        <div class="info-card">
          <div class="info-lbl">பிறந்த தேதி / Date of Birth</div>
          <div class="info-val">${formData.dob}</div>
        </div>
        <div class="info-card">
          <div class="info-lbl">பிறந்த நேரம் / Time of Birth</div>
          <div class="info-val">${birthTime}</div>
          <div class="info-sub">${formData.ampm==="AM"?"☀ காலை (Morning)":"☽ மாலை (Evening)"}</div>
        </div>
        <div class="info-card">
          <div class="info-lbl">பிறந்த இடம் / Place of Birth</div>
          <div class="info-val">${escapeHtml(formData.pob||"—")}</div>
        </div>
      </div>
    </div>

    <div class="gold-div-thin"></div>

    <!-- SUMMARY -->
    <div class="section">
      <div class="sec-head">
        <div class="sec-icon">⭐</div>
        <div class="sec-title">முக்கிய ஜோதிட விவரங்கள்</div>
        <div class="sec-sub">Key Astrological Details</div>
      </div>
      <div class="summary-row">
        <div class="sum-box">
          <div class="sum-lbl">லக்னம்</div>
          <div class="sum-val">${horoscope.lagnaName}<br/><span style="font-size:10px;font-weight:400;color:#f0c75e80">${horoscope.lagnaEn} ${horoscope.lagnaDeg}°</span></div>
        </div>
        <div class="sum-box">
          <div class="sum-lbl">சந்திர ராசி</div>
          <div class="sum-val">${horoscope.moonRashi}</div>
        </div>
        <div class="sum-box">
          <div class="sum-lbl">நட்சத்திரம்</div>
          <div class="sum-val">${horoscope.nakshatra}</div>
        </div>
        <div class="sum-box">
          <div class="sum-lbl">சூரிய ராசி</div>
          <div class="sum-val">${horoscope.sunSign}</div>
        </div>
      </div>
    </div>

    <div class="gold-div-thin"></div>

    <!-- RASHI CHART -->
    <div class="section">
      <div class="sec-head">
        <div class="sec-icon">◎</div>
        <div class="sec-title">ராசி சக்கரம்</div>
        <div class="sec-sub">தென் இந்திய முறை</div>
      </div>
      <div class="chart-wrap">${chartSVG}</div>
      <div class="chart-caption">தென் இந்திய ராசி சக்கரம் &nbsp;•&nbsp; நிராயண முறை &nbsp;•&nbsp; லகிரி அயனாம்சம்</div>
    </div>

    <div class="gold-div-thin"></div>

    <!-- PLANET TABLE -->
    <div class="section">
      <div class="sec-head">
        <div class="sec-icon">🪐</div>
        <div class="sec-title">கிரக நிலைகள்</div>
        <div class="sec-sub">Planetary Positions</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="text-align:center;width:40px;">சின்னம்</th>
            <th>கிரகம்</th>
            <th>Planet</th>
            <th>ராசி</th>
            <th style="text-align:center;">கலை °</th>
            <th style="text-align:center;">வீடு</th>
          </tr>
        </thead>
        <tbody>${planetRows}</tbody>
      </table>
    </div>

    ${aiSection}

  </div><!-- end content -->

  <!-- TEMPLE FOOTER -->
  <div class="footer">
    <div class="footer-border"></div>
    <div class="footer-om">ॐ</div>
    <div class="footer-text">
      ஜோதிட நிபுணர் — Jothida Nipunar &nbsp;|&nbsp; Nirayana (Sidereal) Ephemeris<br/>
      உருவாக்கப்பட்ட தேதி: ${today}
    </div>
  </div>

</div><!-- end page -->

<button class="print-btn no-print" onclick="window.print()">
  📄 PDF சேமி / அச்சிடு
</button>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("பாப்-அப் தடுக்கப்பட்டுள்ளது. இந்த தளத்திற்கு pop-ups-ஐ browser-ல் அனுமதித்துவிட்டு மீண்டும் முயற்சிக்கவும்.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 1000);
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
const PROFILES_KEY = "jn_profiles_v1";
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

const SCREEN = { SPLASH:0, AUTH:1, FORM:2, LOADING:3, RESULT:4, PREMIUM:5, PORUTHAM:6, DAILY:7, CALENDAR:8, HOME:9 };

// முகப்பு கேள்வி அட்டைகள் — தட்டினால் FORM → ஜாதகம் → அந்தப் பகுதிக்கு நேரடி
const HOME_QUESTIONS = [
  { key:"marriage",  icon:"💒", q:"திருமணம் எப்போது?",  sub:"காலம் · துணை · வாழ்க்கை", topic:"marriage" },
  { key:"career",    icon:"💼", q:"தொழில் / வேலை?",       sub:"உயர்வு · துறை · காலம்",   topic:"career" },
  { key:"health",    icon:"🏥", q:"ஆரோக்கியம்?",          sub:"நோய் · தோஷம் · கவனம்",   topic:"health" },
  { key:"wealth",    icon:"💰", q:"செல்வ வளர்ச்சி?",       sub:"லாபம் · சேமிப்பு · யோகம்", topic:"wealth" },
  { key:"porutham",  icon:"💍", q:"திருமணப் பொருத்தம்",   sub:"10 பொருத்தம் · தசை",     nav:"PORUTHAM" },
  { key:"full",      icon:"📜", q:"முழு ஜாதகம்",           sub:"சக்கரம் · தசை · பலன்கள்", nav:"FORM" },
];

export default function AstrologyApp() {
  const [screen, setScreen] = useState(SCREEN.SPLASH);
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name:"", dob:"", tob:"", pob:"", ampm:"AM", gender:"", pobLat:null, pobLon:null, pobSource:null });
  // சேமித்த ஜாதகங்கள் — lazy initializer: localStorage read ஒருமுறை மட்டும்
  const [profiles, setProfiles] = useState(loadProfiles);

  // ஜாதகம் வெற்றிகரமாக உருவானதும் அழைக்கப்படும் — அதே நபர் (பெயர்+தேதி+நேரம்)
  // ஏற்கனவே இருந்தால் புதுப்பிக்கும்; இல்லையேல் பட்டியலின் முதலில் சேர்க்கும்.
  const saveCurrentProfile = () => {
    if (!formData.name || !formData.dob) return;
    setProfiles(prev => {
      const rest = prev.filter(p => !(p.name === formData.name && p.dob === formData.dob && p.tob === formData.tob && p.ampm === formData.ampm));
      const next = [{
        id: Date.now(),
        name: formData.name, dob: formData.dob, tob: formData.tob, ampm: formData.ampm,
        gender: formData.gender || "",
        pob: formData.pob, pobLat: formData.pobLat, pobLon: formData.pobLon, pobSource: formData.pobSource,
        savedAt: new Date().toISOString()
      }, ...rest].slice(0, 20);
      persistProfiles(next);
      return next;
    });
  };

  const loadProfile = (p) => {
    setFormData({ name:p.name||"", dob:p.dob||"", tob:p.tob||"", pob:p.pob||"", ampm:p.ampm||"AM",
      gender:p.gender||"", pobLat:p.pobLat ?? null, pobLon:p.pobLon ?? null, pobSource:p.pobSource ?? null });
    setPlaceResults([]); setPlaceDropdownOpen(false);
  };

  const deleteProfile = (id) => {
    setProfiles(prev => { const next = prev.filter(p => p.id !== id); persistProfiles(next); return next; });
  };
  const [horoscope, setHoroscope] = useState(null);
  const [prediction, setPrediction] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chart");
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
  // முகப்பு "இன்று" strip — Chennai default, தினமும் ஒருமுறை (dateKey) கணி
  const homeToday = useMemo(() => {
    try {
      const now = new Date();
      const iso = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const h = generateHoroscope(iso, "06:00", 13.0827, 80.2707, true);
      const inaus = calcInauspiciousTimes(now, 13.0827, 80.2707);
      let tamil = null; try { tamil = calcTamilDate(iso, "06:00", 13.0827, 80.2707); } catch(e){}
      const wd = ["ஞாயிறு","திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி"][now.getDay()];
      return { h, inaus, tamil, wd, now,
        greg: now.toLocaleDateString("ta-IN",{day:"numeric",month:"long",year:"numeric"}) };
    } catch(e) { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [new Date().toDateString()]);
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

  const goTo = useCallback((s) => {
    setFadeIn(false);
    setTimeout(() => { setScreen(s); setFadeIn(true); }, 300);
  }, []);

  useEffect(() => {
    if(screen===SCREEN.SPLASH){ const t=setTimeout(()=>goTo(SCREEN.HOME),2600); return()=>clearTimeout(t); }
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
  const [backendUrl, setBackendUrl] = useState("https://jothida-api.onrender.com");
  const [ayanamsaKey, setAyanamsaKey] = useState("lahiri");
  const [apiSource, setApiSource] = useState("");


  // Assemble the birth payload the Worker expects from the form.
  const buildBirth = (dobISO, finalTime, geo) => ({
    dobISO, time24: finalTime, lat: geo.lat, lon: geo.lon,
    ayanamsaKey, gender: formData.gender || null,
    name: formData.name, dob: formData.dob, tob: formData.tob || "",
    ampm: formData.ampm || "", pob: formData.pob || "",
  });

  // Apply a full report returned by /api/compute to state — the server-side
  // equivalent of runAllEngines (which sets the same values from the local
  // engine). Keys mirror computeFullReport() in the Worker.
  const applyReport = (r) => {
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
      h24 = hh || 6;
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
        goTo(SCREEN.RESULT);
      } catch (e) {
        setApiSource("");
        alert("⚠ சர்வர் இப்போது பதிலளிக்கவில்லை. சில வினாடிகள் கழித்து மீண்டும் முயற்சிக்கவும்.");
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
      setActiveTab("chart");
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
        goTo(SCREEN.RESULT);
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
        setDailyPrediction(text || "இன்றைய பலன் கிடைக்கவில்லை.");
      } catch (e) { setDailyPrediction("இணைய இணைப்பு தேவை."); }
      setDailyLoading(false);
      return;
    }
  };


  const handleAuth = (e) => { e?.preventDefault?.(); setUser({name:formData.name||"User"}); goTo(SCREEN.FORM); };

  // ─── NAVAGRAHA COLORS ───
  const GRAHA_COLORS = {
    "சூரியன்":"#e85d26","சந்திரன்":"#c0c0c0","செவ்வாய்":"#dc2626","புதன்":"#22c55e",
    "குரு":"#eab308","சுக்கிரன்":"#ec4899","சனி":"#1e3a5f","ராகு":"#6366f1","கேது":"#b8860b"
  };
  const grahaCardBorder = (planetTa) => GRAHA_COLORS[planetTa] || "#b8860b";

  // ─── SACRED-LUXE HINDU LIGHT THEME (World No.1 design system) ───
  const base = {
    minHeight:"100vh",
    background:"transparent",           // lets the body's fixed warm gradient show through every screen
    fontFamily:"'Noto Sans Tamil','Segoe UI',system-ui,sans-serif",
    color:"#241a15", position:"relative", overflow:"hidden"
  };
  const container = {
    maxWidth:430, margin:"0 auto", padding:"0 20px",
    position:"relative", zIndex:3,
    opacity:fadeIn?1:0, transform:fadeIn?"translateY(0)":"translateY(14px)",
    transition:"opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.5s cubic-bezier(0.22,1,0.36,1)"
  };
  const T = {
    gold: "#7b1c1c",
    goldBg: "#f4e6d8",
    accent: "#a8710a",
    accentSoft: "#b8860b",
    text: "#241a15",
    textSoft: "#4a3d35",
    textMuted: "#7a6b60",
    bg: "#fffdf8",
    cardBg: "rgba(255,253,248,0.92)",
    cardBorder: "1px solid #ecdfce",
    inputBg: "#fffdf7",
    inputBorder: "1.5px solid #e2d3bf",
    inputColor: "#241a15",
    good: "#0d7a30",
    bad: "#cc1a1a",
    neutral: "#a8710a",
    shadow: "0 10px 34px -12px rgba(90,40,10,0.18), 0 2px 8px rgba(90,40,10,0.05)",
    pink: "#9b2c2c",
    roseGold: "#b8860b",
  };
  const btnGold = {
    background:"linear-gradient(135deg, #8f2020 0%, #7b1c1c 45%, #5f1414 100%)",
    color:"#fff7ec", border:"1px solid #7b1c1c", borderRadius:14, padding:"15px 0",
    width:"100%", fontSize:16, fontWeight:700, cursor:"pointer", letterSpacing:0.3,
    boxShadow:"0 10px 26px -8px rgba(123,28,28,0.55), inset 0 1px 0 rgba(255,255,255,0.18)",
    position:"relative", overflow:"hidden"
  };
  const btnOutline = {
    background:"rgba(255,253,248,0.7)", color:"#7b1c1c",
    border:"1.5px solid #d9c3a8", borderRadius:14,
    padding:"13px 0", width:"100%", fontSize:15, fontWeight:600, cursor:"pointer",
    backdropFilter:"blur(6px)", boxShadow:"0 2px 10px rgba(90,40,10,0.05)"
  };
  const inputStyle = {
    width:"100%", padding:"14px 16px",
    background:"#fffdf7", border:"1.5px solid #e2d3bf",
    borderRadius:12, color:"#241a15", fontSize:15, outline:"none",
    boxSizing:"border-box"
  };
  const labelStyle = { display:"block", marginBottom:7, fontSize:12.5, color:"#a8710a", fontWeight:700, letterSpacing:0.3, textTransform:"uppercase" };
  const card = {
    background:"linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,253,248,0.9))",
    border:"1px solid #ecdfce",
    borderRadius:18, padding:20,
    boxShadow:"0 10px 34px -14px rgba(90,40,10,0.16), 0 1px 4px rgba(90,40,10,0.04)",
    backdropFilter:"blur(4px)"
  };

  // ─── முகப்பு கேள்வி → அந்தப் பகுதிக்கு அழைத்துச் செல் ───
  const openQuestion = (item) => {
    if (item.nav === "PORUTHAM") { setHomeQuestion(null); goTo(SCREEN.PORUTHAM); return; }
    setHomeQuestion(item.nav === "FORM" ? null : item);
    // ஏற்கனவே ஜாதகம் உருவாக்கப்பட்டிருந்தால் நேரடி முடிவுக்கு; இல்லையேல் FORM
    goTo(horoscope ? SCREEN.RESULT : SCREEN.FORM);
  };

  // ─── கீழ் Tab Bar (Flutter-style) — எல்லா முதன்மைத் திரைகளிலும் ───
  const TABS = [
    { key:"home",  icon:"🏠", label:"முகப்பு",  screen:SCREEN.HOME },
    { key:"chart", icon:"📊", label:"ஜாதகம்",   screen: horoscope ? SCREEN.RESULT : SCREEN.FORM },
    { key:"today", icon:"🌞", label:"இன்று",    screen: horoscope ? SCREEN.DAILY : SCREEN.CALENDAR },
    { key:"me",    icon:"👤", label:"நான்",      screen:SCREEN.FORM },
  ];
  const BottomTabs = ({ active }) => (
    <div style={{position:"fixed", left:0, right:0, bottom:0, zIndex:40,
      background:"rgba(255,253,248,0.94)", backdropFilter:"blur(12px)",
      borderTop:"1px solid #ecdfce", boxShadow:"0 -6px 24px -12px rgba(90,40,10,0.18)",
      paddingBottom:"env(safe-area-inset-bottom, 0px)"}}>
      <div style={{maxWidth:430, margin:"0 auto", display:"flex"}}>
        {TABS.map(t=>{
          const on = active===t.key;
          return (
            <button key={t.key} onClick={()=>{ setActiveTab(t.key); goTo(t.screen); }} style={{
              flex:1, background:"none", border:"none", cursor:"pointer",
              padding:"9px 0 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:2}}>
              <span style={{fontSize:20, filter:on?"none":"grayscale(0.5) opacity(0.55)",
                transform:on?"translateY(-1px) scale(1.08)":"none", transition:"all 0.2s"}}>{t.icon}</span>
              <span style={{fontSize:9.5, fontWeight:on?700:500, color:on?"#7b1c1c":"#9a8a7a",
                letterSpacing:0.2}}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ═══════ HOME — "இன்று + உங்கள் கேள்வி" முகப்பு (login-க்கு பதில்) ═══════
  if(screen===SCREEN.HOME) {
    const savedName = profiles[0]?.name || (formData.name || "");
    const t = homeToday;
    return (
      <div style={base}>
        <div style={{...container, paddingTop:20, paddingBottom:96}}>
          {/* header */}
          <div style={{display:"flex", alignItems:"center", gap:11, marginBottom:16}}>
            <img src={wheelCenterImg} alt="" style={{width:44, height:44, objectFit:"contain",
              borderRadius:"50%", filter:"drop-shadow(0 2px 6px #b8860b40)"}}/>
            <div style={{lineHeight:1.2}}>
              <div className="jn-serif" style={{fontSize:19, fontWeight:700, color:"#7b1c1c"}}>ஜோதிட நிபுணர்</div>
              <div style={{fontSize:10.5, color:"#a8710a", letterSpacing:0.5}}>
                {savedName ? `வணக்கம், ${savedName} 🙏` : "வேத ஜோதிட வழிகாட்டி"}
              </div>
            </div>
          </div>

          {/* இன்று strip */}
          {t && (
            <div style={{...card, padding:"13px 15px", marginBottom:18,
              background:"linear-gradient(135deg, #fff8ec, #fdf3e0)", border:"1px solid #ecdcc0"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6}}>
                <span style={{fontSize:12.5, fontWeight:700, color:"#7b1c1c"}}>📅 இன்று · {t.wd}</span>
                <span style={{fontSize:10.5, color:"#8b6914"}}>{t.greg}</span>
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:"5px 14px", fontSize:11, color:"#5a4a3a"}}>
                {t.tamil && <span>🗓 {t.tamil.month} {t.tamil.day}</span>}
                <span>🌙 {t.h.tithi}</span>
                <span>⭐ {t.h.nakshatra}</span>
                <span>♌ {t.h.moonRashi}</span>
              </div>
              {t.inaus && (
                <div style={{marginTop:8, paddingTop:8, borderTop:"1px dashed #e0cfae",
                  display:"flex", flexWrap:"wrap", gap:"4px 14px", fontSize:10.5}}>
                  <span style={{color:"#cc1a1a", fontWeight:600}}>⚠ ராகு காலம்: {t.inaus.rahuKalam.start}–{t.inaus.rahuKalam.end}</span>
                  <span style={{color:"#a8710a"}}>எமகண்டம்: {t.inaus.yamaGandam.start}–{t.inaus.yamaGandam.end}</span>
                </div>
              )}
              <button onClick={()=>goTo(horoscope?SCREEN.DAILY:SCREEN.CALENDAR)} style={{
                marginTop:10, width:"100%", background:"rgba(123,28,28,0.06)", border:"1px solid #e6cf9a",
                borderRadius:10, color:"#7b1c1c", fontSize:11.5, fontWeight:600, cursor:"pointer", padding:"8px 0"}}>
                📿 முழு பஞ்சாங்கம் / தினப்பலன் →
              </button>
            </div>
          )}

          {/* கேள்வி அட்டைகள் */}
          <div style={{fontSize:13.5, fontWeight:700, color:"#7b1c1c", marginBottom:3, textAlign:"center"}}>உங்கள் கேள்வி என்ன? 🙏</div>
          <div style={{fontSize:10.5, color:"#a8710a", marginBottom:14, textAlign:"center"}}>ஒரு கேள்வியைத் தேர்ந்தெடுங்கள் — ஜோதிடம் பதில் தரும்</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:11}}>
            {HOME_QUESTIONS.map(item=>(
              <button key={item.key} onClick={()=>openQuestion(item)} style={{
                background:"linear-gradient(180deg,#ffffff,#fffaf0)", border:"1px solid #ecdfce",
                borderRadius:16, padding:"18px 12px 14px", cursor:"pointer", textAlign:"center",
                boxShadow:"0 6px 18px -10px rgba(90,40,10,0.18)", transition:"transform 0.15s",
                WebkitTapHighlightColor:"transparent"}}
                onTouchStart={e=>e.currentTarget.style.transform="scale(0.96)"}
                onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
                <div style={{fontSize:34, marginBottom:8, lineHeight:1}}>{item.icon}</div>
                <div style={{fontSize:13.5, fontWeight:700, color:"#241a15", marginBottom:3}}>{item.q}</div>
                <div style={{fontSize:9.5, color:"#9a8a7a"}}>{item.sub}</div>
              </button>
            ))}
          </div>

          <div style={{textAlign:"center", marginTop:18, fontSize:9.5, color:"#b0a090"}}>
            ✦ Swiss Ephemeris · BPHS classical engine · backtest-verified ✦
          </div>
        </div>
        <BottomTabs active="home"/>
      </div>
    );
  }

  // ═══════ SPLASH ═══════
  // ═══════ SPLASH — முனிவர் ராசி-சக்கரம்: வெளி வட்டம் கடிகார திசை (இடம்→வலம்),
  // உள் மஞ்சள் வட்ட ஒளிக்கதிர்கள் எதிர் திசை (வலம்→இடம்), முனிவர் அசையாமல்,
  // பின்னொளி blink. நுட்பம்: (1) முழு படம் சுழல்கிறது → வெளி ராசி வளையம்
  // சுழல்வது தெரியும்; (2) அதே படத்தின் நடு-வட்டப் பிரதி clip-path circle-உடன்
  // அசையாமல் மேலே → முனிவர் நிமிர்ந்தே; (3) golden conic கதிர்கள் screen-blend
  // உடன் எதிர்-சுழற்சி; (4) radial glow, blink animation. ═══════
  if(screen===SCREEN.SPLASH) return (
    <div style={{...base, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", overflow:"hidden"}}>
      <div onClick={()=>{ const ok = playOmSound(); if(ok) setOmPlayed(true); }}
        style={{position:"relative", width:"min(88vw, 52vh, 460px)", aspectRatio:"1/1", cursor:"pointer",
          animation:"splashIn 1.1s ease-out", filter:"drop-shadow(0 10px 40px #b8860b40)"}}>
        {/* 1. முழு சக்கரம் (நுனிகள் நீக்கிய பிரதி) — வெளி நீல வளையம் சுழல்கிறது */}
        <img src={wheelRingImg} alt="ராசி சக்கரம்" className="jn-wheel-spin-cw"
          style={{position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain"}}/>
        {/* 2. நடு தங்க வட்டம் முழுவதும் (முனிவர்+கதிர்+நூல்+விளக்கு) — அசையாமல் */}
        <img src={wheelCenterImg} alt="" aria-hidden="true"
          style={{position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain"}}/>
      </div>
      <div style={{textAlign:"center", zIndex:3, marginTop:26, animation:"splashIn 1.4s ease-out"}}>
        <h1 className="jn-serif" style={{fontSize:34, fontWeight:700, margin:"0 0 8px", letterSpacing:2,
          background:"linear-gradient(180deg,#9b2c2c,#7b1c1c 60%,#5f1414)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text"}}>ஜோதிட நிபுணர்</h1>
        <p className="jn-latin" style={{fontSize:14, color:"#a8710a", letterSpacing:7, fontWeight:600, margin:0}}>JOTHIDA NIPUNAR</p>
        <p style={{fontSize:11, color:"#b8860b", marginTop:12, letterSpacing:1.5}}>✦ Swiss Ephemeris · Classical Vedic Astrology ✦</p>
        <div style={{marginTop:24, display:"flex", gap:7, justifyContent:"center", alignItems:"center"}}>
          {[0,1,2].map(i=>(
            <div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#b8860b",
              animation:`jnGlowPulse 1.4s ease-in-out ${i*0.2}s infinite`}}/>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes splashIn{from{opacity:0;transform:scale(0.92) translateY(16px);}to{opacity:1;transform:scale(1) translateY(0);}}
        @keyframes jnSpinCW{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        .jn-wheel-spin-cw{animation:jnSpinCW 48s linear infinite;transform-origin:50% 50%;}
        @media (prefers-reduced-motion: reduce){ .jn-wheel-spin-cw{animation:none;} }
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
            background:"radial-gradient(circle at 35% 35%, #d4a853, #b8860b)",
            boxShadow:"0 0 30px #b8860b20",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:30
          }}>☉</div>
          <h1 style={{fontSize:22, fontWeight:700, margin:"0 0 4px", color:"#7b1c1c"}}>ஜோதிட நிபுணர்</h1>
          <p style={{fontSize:12, color:"#b8860b", margin:0}}>
            {authMode==="login"?"உங்கள் கணக்கில் உள்நுழையுங்கள்":"புதிய கணக்கு உருவாக்குங்கள்"}
          </p>
        </div>
        <div style={{display:"flex",gap:0,marginBottom:28,background:"#f0e0e0",borderRadius:12,padding:3}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>setAuthMode(m)} style={{
              flex:1,padding:"10px 0",border:"none",borderRadius:10,
              background:authMode===m?"#7b1c1c":"transparent",
              color:authMode===m?"#fffdf5":"#555555",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.25s"
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
            <input type="email" style={inputStyle} placeholder="email@example.com"/></div>
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
        <p style={{textAlign:"center",marginTop:20,fontSize:12,color:"#888888"}}>Firebase Auth • One Device • Encrypted</p>
      </div>
    </div>
  );

  // ═══════ FORM ═══════
  if(screen===SCREEN.FORM) return (
    <div style={base}>
      <div style={{...container, paddingTop:18, paddingBottom:90}}>
        <button onClick={()=>goTo(SCREEN.HOME)} style={{background:"none",border:"none",color:T.accent,fontSize:13,cursor:"pointer",padding:0,marginBottom:12,fontWeight:600}}>← முகப்பு</button>
        {/* தேர்ந்த கேள்வி banner — முகப்பிலிருந்து வந்தால் */}
        {homeQuestion && (
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 14px",
            background:"linear-gradient(135deg,#fff3e0,#fde8cf)",border:"1px solid #e6cf9a",borderRadius:12}}>
            <span style={{fontSize:22}}>{homeQuestion.icon}</span>
            <div style={{lineHeight:1.3}}>
              <div style={{fontSize:9.5,color:"#a8710a",fontWeight:600}}>உங்கள் கேள்வி</div>
              <div style={{fontSize:13.5,fontWeight:700,color:"#7b1c1c"}}>{homeQuestion.q}</div>
            </div>
            <span style={{marginLeft:"auto",fontSize:9.5,color:"#8b6914",textAlign:"right",maxWidth:110}}>விவரம் நிரப்பினால் பதில் கிடைக்கும்</span>
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 2px",color:T.gold,letterSpacing:0.5}}>ஜாதகம் பார்க்க</h2>
            <p style={{fontSize:12,color:T.accent,margin:0,fontWeight:500}}>பிறப்பு விவரங்களை உள்ளிடுக</p>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>goTo(SCREEN.PREMIUM)} style={{
              background:"#eddada",border:"1px solid #7b1c1c20",
              borderRadius:10,padding:"8px 14px",color:T.gold,fontSize:11,fontWeight:600,cursor:"pointer"
            }}>⭐ Premium</button>
          </div>
        </div>

        {/* ═══ சேமித்த ஜாதகங்கள் — ஒரே தட்டில் மீண்டும் திறக்க ═══ */}
        {profiles.length > 0 && (
          <div style={{...card, marginBottom:16, padding:"14px 16px"}}>
            <div style={{fontSize:13,fontWeight:700,color:T.gold,marginBottom:2}}>📂 சேமித்த ஜாதகங்கள்</div>
            <div style={{fontSize:9.5,color:"#8b6914",marginBottom:10}}>தட்டினால் விவரங்கள் நிரப்பப்படும் — பிறகு「ஜாதகம் உருவாக்கு」அழுத்தவும்</div>
            {profiles.map(p => (
              <div key={p.id}
                onClick={()=>loadProfile(p)}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,
                  padding:"9px 12px",marginBottom:6,borderRadius:10,cursor:"pointer",
                  background:"#faf6e8",border:"1px solid #e6dcc9"}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#7b1c1c",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    ☉ {p.name}
                  </div>
                  <div style={{fontSize:10,color:"#666",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {p.dob} • {p.tob} {p.ampm === "AM" ? "காலை" : "மாலை"}{p.pob ? ` • ${p.pob}` : ""}
                  </div>
                </div>
                <button
                  onClick={(e)=>{ e.stopPropagation(); deleteProfile(p.id); }}
                  title="நீக்கு"
                  style={{background:"none",border:"1px solid #e0c8c8",borderRadius:8,color:"#cc1a1a",
                    fontSize:12,cursor:"pointer",padding:"5px 9px",flexShrink:0}}>🗑</button>
              </div>
            ))}
          </div>
        )}

        <div style={card}>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div><label style={labelStyle}>பெயர் *</label>
            <input style={inputStyle} placeholder="உங்கள் பெயர்" value={formData.name} maxLength={60}
              onChange={e=>setFormData(d=>({...d,name:e.target.value}))}/></div>
            <div><label style={labelStyle}>பிறந்த தேதி * <span style={{fontSize:10,color:"#555555",fontWeight:400}}>(DD.MM.YYYY)</span></label>
            <input type="text" inputMode="numeric" maxLength={10}
              style={{...inputStyle,letterSpacing:2,fontFamily:"monospace",fontSize:16}}
              placeholder="DD.MM.YYYY" value={formData.dob}
              onChange={e=>{
                const formatted = formatDateInput(e.target.value);
                setFormData(d=>({...d,dob:formatted}));
              }}/>
            {formData.dob && formData.dob.length === 10 && (
              <div style={{fontSize:10,marginTop:4,color:isValidDDMMYYYY(formData.dob)?"#4ade80":"#dc2626"}}>
                {isValidDDMMYYYY(formData.dob)
                  ? `✓ ${formData.dob}`
                  : "⚠ தவறான தேதி — சரிபார்க்கவும்"}
              </div>
            )}</div>
            <div><label style={labelStyle}>பிறந்த நேரம் * <span style={{fontSize:10,color:"#555555",fontWeight:400}}>(மணி:நிமிடம்)</span></label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="text" inputMode="numeric" maxLength={5}
                style={{...inputStyle, width:"46%", textAlign:"center", padding:"13px 8px", letterSpacing:2, fontFamily:"monospace", fontSize:16}}
                placeholder="06:30"
                value={formData.tob}
                onChange={e=>setFormData(d=>({...d, tob: formatTimeInput(e.target.value)}))}/>
              {/^\d{2}:\d{2}$/.test(formData.tob) && (
                <span style={{fontSize:16,color:"#4ade80"}}>✓</span>
              )}
              {/* AM/PM Toggle */}
              <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1.5px solid #d4a85330",flexShrink:0,flex:1}}>
                {["AM","PM"].map(p=>(
                  <button key={p} onClick={()=>setFormData(d=>({...d,ampm:p}))} style={{
                    flex:1,padding:"12px 10px",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                    transition:"all 0.2s",
                    background:formData.ampm===p
                      ? (p==="AM"
                        ? "linear-gradient(135deg,#d4a853,#b8860b)"
                        : "linear-gradient(135deg,#7b1c1c,#9b2c2c)")
                      : "rgba(255,255,255,0.5)",
                    color:formData.ampm===p ? "#fffdf5" : "#555555"
                  }}>
                    {p==="AM"?"☀ காலை":"☽ மாலை"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{fontSize:10,color:"#555555",marginTop:5}}>
              {formData.ampm==="AM"?"காலை 12:00 — பிற்பகல் 11:59":"பிற்பகல் 12:00 — இரவு 11:59"}
            </div>
            </div>
            {/* பாலினம் — ஆண்→சுக்கிரன் / பெண்→குரு காரக வேறுபாடு + மாங்கல்யக் கணிப்புக்கு */}
            <div>
              <label style={labelStyle}>பாலினம் <span style={{fontSize:10,color:"#555555",fontWeight:400}}>(திருமணக் காரக விதிக்கு — விருப்பம்)</span></label>
              <div style={{display:"flex",gap:8}}>
                {["ஆண்","பெண்"].map(g=>(
                  <button key={g} type="button" onClick={()=>setFormData(d=>({...d,gender:d.gender===g?"":g}))} style={{
                    flex:1,padding:"11px 0",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",
                    border:`1.5px solid ${formData.gender===g?"#7b1c1c":"#e0d8c8"}`,
                    background:formData.gender===g?"linear-gradient(135deg,#7b1c1c15,#b8860b15)":"transparent",
                    color:formData.gender===g?"#7b1c1c":"#777"}}>
                    {g==="ஆண்"?"👨 ஆண்":"👩 பெண்"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{position:"relative"}}>
              <label style={labelStyle}>பிறந்த இடம் <span style={{fontSize:10,color:"#555555",fontWeight:400}}>(துல்லியமான ஊரைத் தேடி தேர்ந்தெடுக்கவும்)</span></label>
              <input style={inputStyle} placeholder="எ.கா. Madurai, Tamil Nadu — தட்டச்சு செய்யவும்"
                value={formData.pob}
                onChange={e=>{
                  const val = e.target.value;
                  // Typing invalidates any previously-selected precise coordinates
                  setFormData(d=>({...d, pob:val, pobLat:null, pobLon:null, pobSource:null}));
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
                <div style={{fontSize:10,marginTop:5,color:"#555555"}}>🔍 தேடுகிறது...</div>
              )}

              {/* Search results dropdown */}
              {placeDropdownOpen && placeResults.length > 0 && (
                <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:20,marginTop:4,
                  background:"#ffffff",border:"1.5px solid #d0d0d0",borderRadius:12,
                  boxShadow:"0 8px 32px rgba(0,0,0,0.15)",maxHeight:220,overflowY:"auto"}}>
                  {placeResults.map((r,i)=>(
                    <div key={i}
                      onMouseDown={()=>{
                        setFormData(d=>({...d, pob:r.shortLabel, pobLat:r.lat, pobLon:r.lon, pobSource:"osm"}));
                        setPlaceDropdownOpen(false);
                        setPlaceResults([]);
                      }}
                      style={{padding:"10px 14px",cursor:"pointer",borderBottom:i<placeResults.length-1?"1px solid #e0e0e0":"none"}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#7b1c1c"}}>📍 {r.shortLabel}</div>
                      <div style={{fontSize:9,color:"#555555",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.displayName}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Status indicator */}
              {formData.pobLat != null && formData.pobLon != null ? (
                <div style={{fontSize:10,marginTop:5,color:"#4ade80"}}>
                  ✓ துல்லியமான ஆயத்தொலைவு {formData.pobSource==="manual"?"(கைமுறையாக உள்ளிடப்பட்டது)":"(தேடலில் இருந்து தேர்ந்தெடுக்கப்பட்டது)"} — {formData.pobLat.toFixed(4)}°N, {formData.pobLon.toFixed(4)}°E
                </div>
              ) : formData.pob && formData.pob.trim() && !placeSearching && (() => {
                const geo = geocodeCity(formData.pob);
                return (
                  <div style={{fontSize:10,marginTop:5,color:geo.matched?"#7b1c1c":"#dc2626"}}>
                    {geo.matched
                      ? `≈ database-ல் தோராயமாக கண்டறியப்பட்டது — மேலே தோன்றும் தேடல் பட்டியலில் இருந்து துல்லியமான இடத்தைத் தேர்ந்தெடுக்க பரிந்துரைக்கிறோம்`
                      : `⚠ கண்டறியப்படவில்லை — Chennai coordinates fallback (பிழை வரலாம்). மேலே தேடல் முடிவுகள் வரவில்லை என்றால் கீழே கைமுறையாக உள்ளிடவும்`}
                  </div>
                );
              })()}

              {/* Manual precise lat/lon entry — for advanced users who already know exact coordinates */}
              <button type="button" onClick={()=>setShowManualGeo(v=>!v)} style={{
                background:"none",border:"none",color:"#555555",fontSize:10,cursor:"pointer",
                padding:"6px 0 0",textDecoration:"underline"
              }}>{showManualGeo?"▲ கைமுறை Lat/Lon மறை":"✏️ கூடுதல் துல்லியம்: Lat/Lon நேரடியாக உள்ளிடவும்"}</button>

              {showManualGeo && (
                <div>
                  <div style={{display:"flex",gap:8,marginTop:6}}>
                    <input type="number" step="0.0001" min="-90" max="90" placeholder="Latitude (எ.கா. 9.9252)"
                      style={{...inputStyle,fontSize:12,padding:"9px 10px"}}
                      value={formData.pobSource==="manual" ? (formData.pobLat ?? "") : ""}
                      onChange={e=>{
                        const lat = e.target.value === "" ? null : parseFloat(e.target.value);
                        setFormData(d=>({...d, pobLat:lat, pobSource: lat!=null && d.pobLon!=null ? "manual" : d.pobSource}));
                      }}/>
                    <input type="number" step="0.0001" min="-180" max="180" placeholder="Longitude (எ.கா. 78.1198)"
                      style={{...inputStyle,fontSize:12,padding:"9px 10px"}}
                      value={formData.pobSource==="manual" ? (formData.pobLon ?? "") : ""}
                      onChange={e=>{
                        const lon = e.target.value === "" ? null : parseFloat(e.target.value);
                        setFormData(d=>({...d, pobLon:lon, pobSource: lon!=null && d.pobLat!=null ? "manual" : d.pobSource}));
                      }}/>
                  </div>
                  {formData.pobSource==="manual" && ((formData.pobLat!=null && (formData.pobLat<-90||formData.pobLat>90)) || (formData.pobLon!=null && (formData.pobLon<-180||formData.pobLon>180))) && (
                    <div style={{fontSize:10,marginTop:4,color:"#ff6b8a"}}>
                      ⚠ தவறான coordinates — Latitude -90 முதல் 90 வரையும், Longitude -180 முதல் 180 வரையும் மட்டுமே செல்லுபடியாகும். சரிசெய்யும் வரை city database மதிப்பு பயன்படுத்தப்படும்.
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="jn-shine" style={{...btnGold,opacity:(!formData.name||!isValidDDMMYYYY(formData.dob))?0.4:1,
              pointerEvents:(!formData.name||!isValidDDMMYYYY(formData.dob))?"none":"auto"}} onClick={handleSubmit}>
              ஜாதகம் உருவாக்கு ☉
            </button>
          </div>
        </div>
        {/* Backend API Section */}
        <div style={{...card, marginTop:14, padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <label style={{fontSize:12,color:"#b8860b",fontWeight:600}}>🔗 Backend API URL</label>
            <a href="https://render.com" target="_blank" rel="noopener"
              style={{fontSize:10,color:"#d4a853",textDecoration:"none"}}>Free deploy →</a>
          </div>
          <input style={{...inputStyle,fontSize:12,padding:"10px 14px"}}
            placeholder="https://jothida-api.onrender.com"
            value={backendUrl} onChange={e=>setBackendUrl(e.target.value)}/>
          <div style={{fontSize:10,marginTop:6,color:backendUrl?"#4ade80":"#888888"}}>
            {backendUrl
              ? "✓ Swiss Ephemeris Backend — 100% NASA accuracy"
              : "Backend இல்லை — Local Jean Meeus Engine (~0.5° accuracy)"}
          </div>
        </div>

        {/* Ayanamsa selector */}
        <div style={{...card, marginTop:14, padding:"14px 16px"}}>
          <label style={{fontSize:12,color:"#a8710a",fontWeight:700,display:"block",marginBottom:8}}>🌀 அயனாம்சம் (Ayanamsa)</label>
          <select value={ayanamsaKey} onChange={e=>setAyanamsaKey(e.target.value)}
            style={{...inputStyle,fontSize:13,padding:"11px 14px",cursor:"pointer"}}>
            {Object.entries(AYANAMSA_SYSTEMS).map(([k,v])=>(
              <option key={k} value={k}>{v.name} — {v.nameEn}</option>
            ))}
          </select>
          <div style={{fontSize:10,marginTop:6,color:"#8b6914",lineHeight:1.5}}>
            {AYANAMSA_SYSTEMS[ayanamsaKey]?.desc}
            {ayanamsaKey!=="lahiri" && <span style={{color:"#cc1a1a"}}><br/>⚠ லாஹிரி அல்லாத அயனாம்சம் — local engine பயன்படுத்தப்படும் (backend Lahiri மட்டுமே).</span>}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
          {[{icon:"☊",t:"ராசி பலன்",s:"12 ராசிகள்"},{icon:"☽",t:"நட்சத்திர பலன்",s:"27 நட்சத்திரங்கள்"},
            {icon:"♃",t:"கிரக நிலை",s:"9 கிரகங்கள்"},{icon:"🤖",t:"AI பலன்கள்",s:"Claude AI"}
          ].map((c,i)=>(
            <div key={i} style={{...card,padding:"14px 12px",textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:4}}>{c.icon}</div>
              <div style={{fontSize:12,fontWeight:600,color:"#1a1a1a"}}>{c.t}</div>
              <div style={{fontSize:10,color:"#b8860b"}}>{c.s}</div>
            </div>
          ))}
        </div>
        {/* Porutham Button */}
        <button onClick={()=>goTo(SCREEN.PORUTHAM)} style={{
          ...btnOutline, marginTop:12, borderColor:"#ff6b8a30", color:"#dc2626",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8
        }}>
          <span style={{fontSize:18}}>💍</span> திருமண பொருத்தம் பார்க்க
        </button>
        <button onClick={()=>goTo(SCREEN.CALENDAR)} style={{
          ...btnOutline, marginTop:10, borderColor:"#4ade8030", color:"#4ade80",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontSize:13
        }}>📅 பஞ்சாங்க நாட்காட்டி</button>
      </div>
    </div>
  );

  // ═══════ LOADING ═══════
  if(screen===SCREEN.LOADING) return (
    <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",zIndex:3}}>
        <div style={{position:"relative",width:120,height:120,margin:"0 auto 28px"}}>
          <svg viewBox="0 0 120 120" style={{width:120,height:120,animation:"spin 2s linear infinite"}}>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#d4a85320" strokeWidth="2.5"/>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#d4a853" strokeWidth="2.5"
              strokeDasharray="60 280" strokeLinecap="round"/>
          </svg>
          <svg viewBox="0 0 120 120" style={{width:90,height:90,position:"absolute",top:15,left:15,animation:"spinR 3s linear infinite"}}>
            <circle cx="60" cy="60" r="40" fill="none" stroke="#b8860b30" strokeWidth="1.5"/>
            <circle cx="60" cy="60" r="40" fill="none" stroke="#b8860b" strokeWidth="1.5"
              strokeDasharray="40 210" strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:36}}>☉</div>
        </div>
        <p style={{color:"#7b1c1c",fontSize:15,fontWeight:500}}>கிரக நிலைகளை கணக்கிடுகிறது...</p>
        <p style={{color:"#555555",fontSize:11,marginTop:6}}>Swiss Ephemeris Engine</p>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:20}}>
          {[0,1,2,3,4].map(i=>(
            <div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#d4a853",
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
      <div style={{...container,paddingTop:24}}>
        <button onClick={()=>goTo(SCREEN.FORM)} style={{background:"none",border:"none",color:T.accent,fontSize:14,cursor:"pointer",padding:0,marginBottom:20}}>← பின் செல்</button>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:40,marginBottom:8}}>⭐</div>
          <h2 style={{fontSize:22,fontWeight:400,margin:"0 0 6px",color:"#7b1c1c"}}>Premium திட்டம்</h2>
          <p style={{fontSize:13,color:"#b8860b",margin:0}}>முழு ஜோதிட அனுபவத்தைப் பெறுங்கள்</p>
        </div>
        {[
          {name:"மாதாந்திர",price:"₹149",period:"/மாதம்",features:["வரம்பற்ற ஜாதகங்கள்","AI பலன்கள்","தினப்பலன்"],popular:false},
          {name:"ஆண்டு",price:"₹999",period:"/ஆண்டு",features:["எல்லா மாதாந்திர அம்சங்கள்","பரிகாரங்கள்","முன்னுரிமை ஆதரவு","திருமண பொருத்தம்"],popular:true}
        ].map((plan,i)=>(
          <div key={i} style={{...card,marginBottom:16,border:plan.popular?"1.5px solid #d4a85350":card.border,position:"relative"}}>
            {plan.popular&&(<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
              background:"linear-gradient(135deg,#7b1c1c,#9b2c2c)",color:"#fffdf5",
              fontSize:10,fontWeight:700,padding:"3px 14px",borderRadius:20}}>பிரபலமானது</div>)}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
              <h3 style={{fontSize:16,fontWeight:600,color:"#1a1a1a",margin:0}}>{plan.name}</h3>
              <div><span style={{fontSize:26,fontWeight:700,color:"#7b1c1c"}}>{plan.price}</span>
              <span style={{fontSize:12,color:"#b8860b"}}>{plan.period}</span></div>
            </div>
            {plan.features.map((f,fi)=>(<div key={fi} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{color:"#d4a853",fontSize:14}}>✓</span>
              <span style={{fontSize:13,color:"#333333"}}>{f}</span>
            </div>))}
            <button style={{...btnGold,marginTop:14,fontSize:14}}>தொடங்கு →</button>
          </div>
        ))}
      </div>
    </div>
  );


  // ═══════ RESULT — ALL INFO ON ONE PAGE (Professional Software Style) ═══════
  if(screen===SCREEN.RESULT&&horoscope){
    const birthTime = formData.tob ? `${formData.tob} ${formData.ampm}` : "—";

    const downloadPDF = () => {
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
      const fnPart = functionalNature ? sec("⚖","லக்னவாரி சுப-பாபர் (BPHS Ch.34)",
        `<table class="pt"><thead><tr><th>கிரகம்</th><th>இயல்பு</th><th>காரணம்</th></tr></thead><tbody>` +
        Object.entries(functionalNature).map(([ta,fn],i)=>`<tr${i%2?' class="alt"':''}><td>${ta}</td><td style="font-weight:700;color:${fn.nature==="யோககாரகன்"||fn.nature==="சுபன்"?"#1b5e20":fn.nature==="பாபன்"?"#a02020":"#6b5a13"}">${fn.nature==="யோககாரகன்"?"👑 யோககாரகன்":fn.nature}</td><td style="font-size:9px">${fn.reasons.join(" • ")}</td></tr>`).join("") +
        `</tbody></table>` +
        (marakaBadhaka ? `<div class="olainote">☠ <b>மாரகாதிபதிகள் (2,7):</b> ${marakaBadhaka.marakaLords.join(", ")}${marakaBadhaka.occupants27.length?` • மாரக ஸ்தானத்தில்: ${marakaBadhaka.occupants27.join(", ")}`:""} &nbsp;|&nbsp; <b>பாதகாதிபதி:</b> ${marakaBadhaka.badhakaLord} (${marakaBadhaka.lagnaType} → ${marakaBadhaka.badhakaHouse}ஆம் வீடு)</div>` : ""), "cPurple") : "";

      // 4. ஷட்பலம்
      const sbPart = shadBala ? sec("💪","ஷட்பலம் (BPHS Ch.27)",
        `<table class="pt"><thead><tr><th>கிரகம்</th><th>ஸ்தான</th><th>திக்</th><th>கால</th><th>சேஷ்டா</th><th>நைசர்.</th><th>திருக்</th><th>மொத்தம்/தேவை</th><th>நிலை</th><th>இஷ்ட/கஷ்ட</th></tr></thead><tbody>` +
        shadBala.map((s,i)=>`<tr${i%2?' class="alt"':''}><td>${s.ta}</td><td>${Math.round(s.sthanaBala)}</td><td>${Math.round(s.digBala)}</td><td>${Math.round(s.kalaBala)}</td><td>${Math.round(s.cheshtaBala)}</td><td>${Math.round(s.naisargikaBala)}</td><td>${Math.round(s.drikBala)}</td><td class="mono">${Math.round(s.total)}/${s.required}</td><td style="color:${s.strong?"#1b5e20":"#a02020"};font-weight:700">${s.status}</td><td class="mono">${s.ishtaPhala}/${s.kashtaPhala}</td></tr>`).join("") +
        `</tbody></table>`, "cGreen") : "";

      // 5. அஷ்டகவர்க்கம் (SAV)
      const savPart = (ashtakavargaData && ashtakavargaData.sav) ? sec("🔢","சர்வாஷ்டகவர்க்கம்",
        `<table class="pt"><thead><tr>${RASHIS.map(r=>`<th style="font-size:8.5px;padding:4px 3px">${r}</th>`).join("")}</tr></thead><tbody><tr>` +
        ashtakavargaData.sav.map(v=>`<td style="text-align:center;font-weight:700;color:${v>=30?"#1b5e20":v<=25?"#a02020":"#333"}">${v}</td>`).join("") +
        `</tr></tbody></table><div class="olainote">30+ பரல் = வலுவான ராசி • 25- = பலவீனம் • மொத்தம் 337</div>`, "cOrange") : "";

      // 6. அவஸ்தைகள்
      const avPart = avasthasData ? sec("🌗","கிரக அவஸ்தைகள் (BPHS Ch.45)",
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
        `<div class="olabox"><b>👫 சகோதரர்கள்:</b> ${familyHealthData.siblings.lean}<div style="font-size:9px">${familyHealthData.siblings.detail}</div></div>` +
        `<div class="olabox"><b>👶 குழந்தைகள்:</b> ${familyHealthData.children.restriction?"⚠ சந்ததியில் தடை/குறைவு சாத்தியம்":"சுமூக குறியீடு"}<div style="font-size:9px">${familyHealthData.children.detail} ${familyHealthData.children.note}</div></div>` +
        (familyHealthData.healthTendencies.length?`<div class="olabox"><b>🩺 நோய் நாட்டம்:</b>${familyHealthData.healthTendencies.map(t=>`<div style="font-size:9.5px">• ${t.planet} பலவீனம் → ${t.area}</div>`).join("")}</div>`:""), "cTeal") : "";

      // 14. பரிகாரம்
      const remPart = (remediesData && remediesData.length) ? sec("💎","பரிகாரங்கள்",
        `<table class="pt"><thead><tr><th>கிரகம்</th><th>ரத்தினம்</th><th>மந்திரம்</th><th>கோயில்</th><th>தானம்</th></tr></thead><tbody>` +
        remediesData.filter(r=>r.needsRemedy).map((r,i)=>`<tr${i%2?' class="alt"':''}><td>${r.ta}</td><td>${r.gem}</td><td style="font-size:9px">${r.mantra}</td><td style="font-size:9px">${r.temple}</td><td style="font-size:9px">${r.donate}</td></tr>`).join("") +
        `</tbody></table>`, "cGold") : "";

      // 15. AI கணிப்பு
      const aiPart = prediction ? sec("🤖","AI ஜோதிட பலன்", `<p style="font-size:11px;line-height:2;white-space:pre-wrap">${escapeHtml(prediction)}</p>`, "cPurple") : "";

      // 16. ஒருங்கிணைந்த கிரக பலம் — view-இல் பார்த்திருந்தால்
      const unifiedPart = unifiedStrength ? sec("🧩","ஒருங்கிணைந்த கிரக பலம் — 5 அளவுகோல்கள் ஒன்றாக",
        `<table class="pt"><thead><tr><th>கிரகம்</th><th>மதிப்பு</th><th>நிலை</th><th>ஆதாரங்கள்</th><th>குறிப்புகள்</th></tr></thead><tbody>` +
        unifiedStrength.map((u,i)=>`<tr${i%2?' class="alt"':''}><td>${u.symbol} ${u.ta}<div style="font-size:8px;color:#888">${u.rashi}, ${u.house}ஆம் வீடு</div></td><td style="font-weight:700;color:${u.tierColor}">${u.composite}/100</td><td style="font-weight:700;color:${u.tierColor}">${u.tier}</td><td style="font-size:8.5px">${u.reasons.join("<br>")}</td><td style="font-size:8.5px;color:#8a4a00">${u.flags.join(", ")}</td></tr>`).join("") +
        `</tbody></table><div class="olainote">கிரக பலம் 30% + ஷட்பலம் 25% + விம்ஷோபகம் 15% + நவாம்சம் 15% + அவஸ்தை 15%</div>`, "cTeal") : "";

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
              ${(oc.jupWindows.length||oc.satWindows.length)?`<div style="background:#edf5ea;border:1px solid #c5dcc0;border-radius:4px;padding:4px 8px;margin:4px 0;font-size:9.5px;line-height:1.7"><b style="color:#33691e">📅 கோசார பலன் காலங்கள் (நாள்-அளவு):</b><br>${[...oc.jupWindows.map(w=>({...w,sym:"♃",col:"#1b5e20"})),...oc.satWindows.map(w=>({...w,sym:"♄",col:"#7a5200"}))].map(w=>`<span style="color:${w.col}">${w.sym} <b>${w.label}</b> — ${w.text}</span>${w.dasha?`<br><span style="font-size:8.5px">⏳ தசை-இணைவு [${w.dasha.conf}]: ${w.dasha.text}</span>`:""}${w.vedha?`<br><span style="font-size:8.5px;color:${w.vedha.vedha?"#a02020":"#33691e"}">🛡 ${w.vedha.text}</span>`:""}${w.bav?`<br><span style="font-size:8.5px;color:#5a4a20">🔢 ${w.bav.text}</span>`:""}${w.triggers&&w.triggers.length?`<br><span style="font-size:8.5px;color:#7b1c1c;font-weight:700">⚡ Trigger நாட்கள்: ${w.triggers.map(tg=>`${tg.planet==="சூரியன்"?"☉":"♂"} ${tg.label}`).join(" • ")} (±1-2 நாள்)</span>`:""}`).join("<br>")}</div>`:""}
              ${oc.touches&&oc.touches.length?`<div style="background:#eef0fa;border:1px solid #c5cae9;border-radius:4px;padding:4px 8px;margin:4px 0;font-size:9px;line-height:1.7"><b style="color:#303f9f">🎯 கூர்மையான தொடுகைகள் (நட்சத்திரம் / ஸ்புடம் ±1°):</b><br>${oc.touches.map(tc=>`<span style="color:${tc.type==="டிகிரி"?"#7b1c1c":"#303f9f"}">${tc.type==="டிகிரி"?"🔥":"⭐"} <b>${tc.label}</b> — ${tc.text}</span>`).join("<br>")}</div>`:""}
              ${oc.remedies.length?`<div style="background:#fdeef0;border:1px solid #eabfc7;border-radius:4px;padding:4px 8px;margin:4px 0;font-size:9.5px;line-height:1.7"><b style="color:#a02020">🙏 பரிகாரம்:</b><br>${oc.remedies.map(r=>`<b>${r.planet} கிரக பரிகாரம்</b> <i style="font-size:8.5px;color:#8a5a30">(எதற்காக: ${r.why})</i><br>📿 ${r.mantra} — ${r.count} • 🛕 ${r.temple}<br>🎁 ${r.day} அன்று ${r.donate} தானம் • 💎 ${r.gem}`).join("<br>")}</div>`:`<div style="font-size:8.5px;color:#33691e;margin:3px 0">🙏 பரிகாரம் தேவையில்லை — இணைப்பும் பார்வைகளும் சுபம்</div>`}
            </div>`;
          }).join("") + `</div>`).join("") +
        `<div class="olainote">🔵 பாவகத் தொடர்பு • 🟡 பார்வைகள் • 🟢 கோசார காலம் • 🔴 பரிகாரம் — நான்கு பகுதிகளும் நிறத்தால் பிரிக்கப்பட்டுள்ளன</div>`, "cIndigo") : "";

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
<div class="sub">COMPLETE JATHAGAM • ALL CLASSICAL ENGINES • தமிழ் ஜோதிடம்</div></div>
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
  return extras
    ? `<div class="olainote" style="border-color:#7b1c1c;font-weight:600">📌 கீழே: நீங்கள் app-இல் திறந்து பார்த்த கூடுதல் ஆழ்பகுதிகள் மட்டும்</div>${extras}`
    : `<div class="olainote">📌 கூடுதல் ஆழ்பகுதிகள் எதுவும் திறக்கப்படவில்லை — "மேலும் ஆழமான விவரங்கள்" பட்டியலில் பார்த்த பகுதிகள் மட்டுமே PDF-இல் சேரும்</div>`;
})()}
${aiPart}
</div>
<div class="ftr">🕉 ஜோதிட நிபுணர் — முழு ஜாதக ஓலை<br>${apiSource==="api" ? "Swiss Ephemeris" : "Jean Meeus Local Engine"} • ${(AYANAMSA_SYSTEMS[ayanamsaKey]||AYANAMSA_SYSTEMS.lahiri).nameEn} Ayanamsa • BPHS/சாராவளி classical engines • உருவாக்கம்: ${new Date().toLocaleDateString("ta-IN")}<br>இது கணினி-கணித ஜாதகம் — முக்கிய முடிவுகளுக்கு அனுபவ ஜோதிடரை அணுகவும்</div>
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
        else alert("பாப்-அப் தடுக்கப்பட்டுள்ளது. இந்த தளத்திற்கு pop-ups-ஐ browser-ல் அனுமதித்துவிட்டு மீண்டும் முயற்சிக்கவும்.");
      }
    };

    return (
      <div style={base}>
        <div style={{...container,paddingTop:16,paddingBottom:30}} className="jn-in">
          <div style={{display:"flex",alignItems:"center",marginBottom:14}}>
            <button onClick={()=>goTo(SCREEN.FORM)} style={{background:"rgba(255,253,248,0.8)",border:"1px solid #e2d3bf",borderRadius:10,color:T.accent,fontSize:13,cursor:"pointer",padding:"7px 12px",fontWeight:600}}>←</button>
          </div>

          {/* ═══ HERO — premium name banner ═══ */}
          <div style={{
            position:"relative", overflow:"hidden", borderRadius:20, marginBottom:14,
            padding:"22px 20px", textAlign:"center",
            background:"linear-gradient(135deg, #8f2020 0%, #7b1c1c 48%, #5f1414 100%)",
            boxShadow:"0 14px 34px -12px rgba(123,28,28,0.55)"
          }}>
            <div style={{position:"absolute",inset:0,opacity:0.16,pointerEvents:"none",
              background:"radial-gradient(120px 120px at 85% 15%, #f7e2a6, transparent), radial-gradient(160px 160px at 10% 110%, #e8c979, transparent)"}}/>
            <div style={{position:"relative",zIndex:1}}>
              <div style={{fontSize:11,letterSpacing:4,color:"#f7e2a6",fontWeight:600,marginBottom:6}}>✦ ஜாதக விவரம் ✦</div>
              <h2 className="jn-serif" style={{fontSize:26,fontWeight:700,margin:"0 0 8px",color:"#fff7ec",letterSpacing:0.5}}>{formData.name}</h2>
              <div style={{display:"inline-flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                {[horoscope.lagnaName+" லக்னம்", horoscope.moonRashi+" ராசி", horoscope.nakshatra].map((chip,i)=>(
                  <span key={i} style={{fontSize:11,fontWeight:600,color:"#5f1414",background:"linear-gradient(180deg,#f7e2a6,#e8c979)",
                    padding:"4px 11px",borderRadius:20,boxShadow:"0 2px 6px rgba(0,0,0,0.12)"}}>{chip}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ TAB SWITCHER: ஜாதகம் / இன்றைய பலன் ═══ */}
          <div style={{display:"flex",gap:4,marginBottom:14,background:"#f2e4d3",borderRadius:14,padding:4,boxShadow:"inset 0 1px 3px rgba(90,40,10,0.08)"}}>
            <button style={{
              flex:1,padding:"11px 0",border:"none",borderRadius:11,
              background:"linear-gradient(135deg,#7b1c1c,#5f1414)",
              color:"#fff7ec",fontSize:12.5,fontWeight:700,cursor:"pointer",
              boxShadow:"0 4px 12px -4px rgba(123,28,28,0.6)"
            }}>📜 ஜாதகம்</button>
            <button onClick={()=>openDailyScreen()} style={{
              flex:1,padding:"11px 0",border:"none",borderRadius:11,
              background:"transparent",color:T.accent,fontSize:12.5,fontWeight:600,cursor:"pointer"
            }}>📅 இன்றைய பலன்</button>
          </div>

          {/* ═══ 1. BIRTH DETAILS ═══ */}
          <div style={{...card,marginBottom:10,padding:"12px 14px",fontSize:12}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>
                {[
                  ["பெயர்",formData.name],["பிறந்த நாள்",formData.dob],["பிறந்த நேரம்",birthTime],
                  ["பிறந்த இடம்",formData.pob||"—"],["உதய லக்னம்",horoscope.lagnaName],["ராசி",horoscope.moonRashi],
                  ["விண்மீன்",`${horoscope.nakshatra}, பாதம் ${horoscope.nakshatraPada||1}`],
                  ["நிலவு நாள்(திதி)",`${horoscope.tithi||""}, ${horoscope.paksham||""}`],
                  ["கரணம்",horoscope.karanam||"—"],["யோகம்",horoscope.yogam||"—"],
                  ...(gulikaData ? [["குளிகன் (மாந்தி)",`${gulikaData.rashi} ${gulikaData.degInSign}° — ${gulikaData.nakshatra} (${gulikaData.timeLabel})`]] : []),
                ].map(([l,v],i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #e8e0e0"}}>
                    <td style={{padding:"4px 0",color:"#b8860b",width:"42%",fontWeight:600,fontSize:11}}>{l}</td>
                    <td style={{padding:"4px 0",color:"#888888",width:10}}>:</td>
                    <td style={{padding:"4px 6px",color:"#1a1a1a",fontWeight:600,fontSize:11}}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* பிறப்பு நேர நுண்ணுணர்வு எச்சரிக்கை — லக்னம்/நட்சத்திரம் எல்லைக்கு அருகில் */}
            {btSensitivity && btSensitivity.map((w, wi) => (
              <div key={wi} style={{marginTop:8,padding:"7px 10px",borderRadius:6,fontSize:10.5,lineHeight:1.6,
                background:w.level==="high"?"#fde8e8":"#fff8e1",
                border:`1px solid ${w.level==="high"?"#f5c6c6":"#ffe082"}`,
                color:w.level==="high"?"#cc1a1a":"#7a5200"}}>
                ⚠ {w.text}
              </div>
            ))}
            {/* தமிழ் தேதி — optional toggle */}
            <div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #d4a85350"}}>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11}}>
                <input type="checkbox" checked={showTamilDate} onChange={e=>setShowTamilDate(e.target.checked)} style={{cursor:"pointer"}}/>
                <span style={{color:"#7b1c1c",fontWeight:600}}>📅 தமிழ் தேதி காட்டு (சௌர மானம்)</span>
              </label>
              {showTamilDate && tamilDate && (
                <div style={{marginTop:6,padding:"6px 10px",background:"#fff8e8",borderRadius:6,fontSize:12}}>
                  <span style={{color:"#b8860b",fontWeight:600}}>தமிழ் தேதி:</span>{" "}
                  <span style={{color:"#7b1c1c",fontWeight:700}}>{tamilDate.month} {tamilDate.day}</span>
                  <div style={{fontSize:9,color:"#999",marginTop:2,fontStyle:"italic"}}>
                    சூரியன் {RASHIS[tamilDate.monthIdx]} ராசியில் — திருக்கணித சௌர மான முறை
                  </div>
                </div>
              )}
              {showTamilDate && !tamilDate && (
                <div style={{marginTop:6,fontSize:10,color:"#999"}}>தமிழ் தேதி கணக்கிட முடியவில்லை</div>
              )}
            </div>
          </div>
          <div style={{...card,marginBottom:10,padding:8}}>
            <TraditionalChart horoscope={horoscope} navamsaData={navamsaData} title="ராசி" showNavamsa={true} gulika={gulikaData?.rashiIdx ?? null}/>
          </div>

          {/* ═══ 3. PLANETARY POSITIONS TABLE ═══ */}
          <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>நிராயண ஸ்புடங்கள்</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                <thead><tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                  <th style={{padding:"5px 2px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                  <th style={{padding:"5px 2px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>தீர்காம்சம்</th>
                  <th style={{padding:"5px 2px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>ராசி</th>
                  <th style={{padding:"5px 2px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>நட்சத்திரம்-பாதம்</th>
                  <th style={{padding:"5px 2px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>அதிபதி</th>
                </tr></thead>
                <tbody>
                  {(()=>{
                    const lagnaNakIdx = NAKSHATRAS.indexOf(horoscope.lagnaNakshatra);
                    const lagnaLord = getNakshatraLord(lagnaNakIdx);
                    return (
                      <tr style={{borderBottom:"1px solid #e0e0e0",background:"#fdf6e3"}}>
                        <td style={{padding:"5px 2px",fontWeight:700,color:"#7b1c1c"}}>லக்னம்</td>
                        <td style={{padding:"5px 2px",textAlign:"center",color:"#1a1a1a",fontFamily:"monospace"}}>{horoscope.lagnaDMS}</td>
                        <td style={{padding:"5px 2px",color:"#7b1c1c"}}>{horoscope.lagnaName}</td>
                        <td style={{padding:"5px 2px",color:"#333333"}}>{horoscope.lagnaNakshatra} - {horoscope.lagnaPada}</td>
                        <td style={{padding:"5px 2px",color:"#8b6914",fontWeight:600}}>{lagnaLord.name}</td>
                      </tr>
                    );
                  })()}
                  {horoscope.placements.map((p,i)=>{
                    const lord = getNakshatraLord(p.nakIdx);
                    return (
                      <tr key={i} style={{borderBottom:"1px solid #e8e0e0",background:i%2?"#faf5f0":"transparent"}}>
                        <td style={{padding:"5px 2px",color:"#1a1a1a",fontWeight:600}}>
                          {p.ta}
                          {p.isRetrograde && p.ta !== "ராகு" && p.ta !== "கேது" && <span style={{color:"#cc1a1a",fontSize:9,marginLeft:2}} title="வக்ரம் (Retrograde)">℞</span>}
                          {p.isCombust && <span style={{color:"#fff",background:"#ff6600",fontSize:7,marginLeft:2,padding:"0 2px",borderRadius:2,fontWeight:700}} title="அஸ்தங்கம் (Combust)">C</span>}
                          {p.isMoolaTri && <span style={{color:"#0d7a30",fontSize:8,marginLeft:2}} title="மூலத்திரிகோணம்">MT</span>}
                        </td>
                        <td style={{padding:"5px 2px",textAlign:"center",color:"#1a1a1a",fontFamily:"monospace"}}>{p.dms}</td>
                        <td style={{padding:"5px 2px",color:"#7b1c1c",fontWeight:600}}>{p.rashi}</td>
                        <td style={{padding:"5px 2px",color:"#333333"}}>{p.nakshatraTa} - {p.pada}</td>
                        <td style={{padding:"5px 2px",color:"#8b6914",fontWeight:600}}>{lord.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {dashaData&&(<div style={{marginTop:8,padding:"6px 8px",background:"#f0e0e0",borderRadius:6,borderLeft:"3px solid #f0c75e",fontSize:11,color:"#7b1c1c",fontWeight:600}}>
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
                <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:10,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                  💎 அதிர்ஷ்ட விவரங்கள் & ராசி கற்கள்
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{background:"#f0c75e08",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>🔢 அதிர்ஷ்ட எண்கள்</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#7b1c1c",letterSpacing:4}}>
                      {lucky.nums.join("  ")}
                    </div>
                    <div style={{fontSize:8,color:"#666666",marginTop:2}}>ராசி அடிப்படை (நிரந்தரம்)</div>
                  </div>
                  <div style={{background:"#f2ecda",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>🧭 அதிர்ஷ்ட திசை</div>
                    <div style={{fontSize:14,fontWeight:700,color:"#b8860b"}}>{lucky.dir}</div>
                    <div style={{fontSize:8,color:"#666666",marginTop:2}}>சாதகமான திசை</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{background:"linear-gradient(135deg,#d4a85308,#b8860b10)",borderRadius:8,padding:"8px 10px",border:"1px solid #d4a85318"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>💎 ராசி ரத்தினம்</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>{lucky.gem}</div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#b8860b10,#d4a85308)",borderRadius:8,padding:"8px 10px",border:"1px solid #b8860b25"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>💠 உப ரத்தினம்</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#b8860b"}}>{lucky.subGem}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"#4ade8008",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>🌈 அதிர்ஷ்ட நிறம்</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#4ade80"}}>{lucky.color}</div>
                  </div>
                  <div style={{background:"#f0c75e08",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:2}}>⭐ நட்சத்திர அதிபதி</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>{nakLord.name}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═══ ADVANCED VIEW SELECTOR — தேர்ந்தெடுத்து பார்க்க ═══ */}
          <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderLeft:"3px solid #7b1c1c",paddingLeft:8,letterSpacing:0.5}}>
              🔬 மேலும் ஆழமான விவரங்கள்
            </div>
            <select
              value={advancedView}
              onChange={e=>{
                const v = e.target.value;
                setAdvancedView(v);
                // PDF-க்காக பதிவு — திறந்து பார்த்த பகுதிகள் மட்டுமே PDF-இல் சேரும்
                if (v) setViewedViews(prev => { const n = new Set(prev); n.add(v); return n; });
                // நட்சத்திர-பாவக இணைப்பு — முதல் தேர்விலேயே கணி (12 ஆண்டு transit sampling)
                if (v === "nakbhava" && !nakBhavaData && horoscope && chartMeta) {
                  // Computed server-side (Swiss-precise) — the browser only
                  // receives the finished linkage analysis.
                  setNakBhavaData("loading");
                  (async () => {
                    try {
                      const geoNB = chartMeta?.geo || resolveBirthGeo(formData);
                      const nb = await apiNakBhava(buildBirth(chartMeta?.dobISO || parseDDMMYYYY(formData.dob), chartMeta?.finalTime || "06:00", geoNB));
                      setNakBhavaData(nb);
                    } catch (e) { setNakBhavaData(null); }
                  })();
                }
              }}
              style={{
                width:"100%", padding:"10px 12px", background:"#f5f0e0",
                border:"1.5px solid #d4a85330", borderRadius:10, color:"#1a1a1a",
                fontSize:13, outline:"none", fontFamily:"'Noto Sans Tamil',sans-serif"
              }}
            >
              <option value="">— பார்க்க வேண்டியதைத் தேர்ந்தெடுக்கவும் —</option>
              <option value="grahabala">💪 கிரக பலம் (Graha Bala)</option>
              <option value="unified">🧩 ஒருங்கிணைந்த கிரக பலம் (எல்லா அளவுகோலும் ஒன்றாக)</option>
              <option value="nakbhava">⭐ நட்சத்திர-பாவக இணைப்பு + பார்வை + கோசார காலம் + பரிகாரம்</option>
              <option value="backtest">🧪 பின்நோக்கு சரிபார்ப்பு — நடந்த நிகழ்வுகளுடன் engine துல்லியத்தை சோதி</option>
              <option value="yogas">🕉 யோகங்கள் (Mahapurusha + Classical)</option>
              <option value="ashtakavarga">🔢 சர்வாஷ்டகவர்க்கம்</option>
              <option value="drishti">👁 கிரக திருஷ்டி (Aspects)</option>
              <option value="funcnature">⚖ லக்னவாரி சுப-பாபர் / மாரக-பாதகர்</option>
              <option value="planetcontext">🔗 கிரக சூழல் (ராசிநாதன்-நட்சத்திராதிபதி-சேர்க்கை-பார்வை)</option>
              <option value="eventtiming">🎯 வாழ்க்கை நிகழ்வு காலக்கணிப்பு (எப்போது?)</option>
              <option value="sequence">⛓ வரிசை-நிபந்தனை பலன்கள் (எது எதற்குப் பின்?)</option>
              <option value="avasthas">🌗 கிரக அவஸ்தைகள் (Avasthas)</option>
              <option value="bhavabala">🏠 பாவ பலம் (Bhava Bala)</option>
              <option value="d10">💼 தசாம்சம் D10 (தொழில்)</option>
              <option value="divisional">🔀 பிரிவு சக்கரங்கள் (D2,D3,D4,D7,D12,D60)</option>
              <option value="shodashavarga">🕉 மேல் வர்க்கங்கள் (D16,D20,D24,D27,D40,D45)</option>
              <option value="jaimini">☯ ஜைமினி (ராசி திருஷ்டி, அர்கலா, காரகர், சர தசா)</option>
              <option value="varshaphala">📅 வர்ஷபலன் (ஆண்டு ஜாதகம் — Tajaka)</option>
              <option value="prashna">❓ பிரஸ்னம் (இப்போது கேள்வி — Horary)</option>
              <option value="kalasarpa">🐍 கால சர்ப்ப தோஷம்</option>
              <option value="chevvai">🔴 செவ்வாய் தோஷம்</option>
              <option value="bhava">🏠 பாவ சக்கரம் (Bhava Chart)</option>
              <option value="navamsastrength">💎 நவாம்ச பலம் (D9 Strength)</option>
              <option value="shadbala">⚖ ஷட்பலம் (Shadbala)</option>
              <option value="transitoverlay">🌍 கோசாரம் (Transit Overlay)</option>
              <option value="rahukalam">⏰ ராகு காலம் / எமகண்டம் / குளிகை</option>
              <option value="muhurtha">🕉 முஹூர்த்தம் (சுப நேரம்)</option>
              <option value="saniguru">🪐 சனி-குரு பெயர்ச்சி பலன்</option>
              <option value="remedies">💎 பரிகாரம் (கோயில், மந்திரம், ரத்தினம்)</option>
            </select>
          </div>

          {/* Deep 3-area analysis is now integrated INTO each life-area block below
              (marriage/health/career), so there is a single unified reading per area
              instead of a separate top verdict that could contradict the detail. */}

          {/* ═══ குடும்பம் & ஆரோக்கிய குறியீடுகள் (siblings/children/disease tendency) ═══ */}
          {familyHealthData && (
            <div style={{...card,marginBottom:10,padding:"14px 16px"}}>
              <div style={{fontSize:14,fontWeight:700,color:"#7b1c1c",marginBottom:2,textAlign:"center"}}>👨‍👩‍👧 குடும்பம் & உடல்நல குறியீடுகள்</div>
              <div style={{fontSize:9,color:"#8b6914",textAlign:"center",marginBottom:12}}>சகோதரர்கள் • குழந்தைகள் • நோய் நாட்டம் — classical குறியீடு (சரியான எண்/பாலினம் அல்ல)</div>

              {/* Siblings */}
              <div style={{marginBottom:10,borderLeft:"3px solid #f0c75e",paddingLeft:10}}>
                <div style={{fontSize:12,fontWeight:700,color:"#7b1c1c",marginBottom:3}}>👫 சகோதரர்கள் (3ஆம் வீடு)</div>
                <div style={{fontSize:11,color:"#0d7a30",fontWeight:600}}>{familyHealthData.siblings.lean}</div>
                <div style={{fontSize:10,color:"#666",marginTop:2}}>{familyHealthData.siblings.detail}</div>
              </div>

              {/* Children */}
              <div style={{marginBottom:10,borderLeft:"3px solid #f0c75e",paddingLeft:10}}>
                <div style={{fontSize:12,fontWeight:700,color:"#7b1c1c",marginBottom:3}}>👶 குழந்தைகள் (5ஆம் வீடு)</div>
                <div style={{fontSize:11,fontWeight:600,color:familyHealthData.children.restriction?"#cc1a1a":"#0d7a30"}}>
                  {familyHealthData.children.restriction ? "⚠ சந்ததியில் தடை/குறைவு சாத்தியம் — கவனம்" : "சந்ததி விஷயத்தில் பெரிய தடை இல்லை"}
                </div>
                <div style={{fontSize:10,color:"#666",marginTop:2}}>{familyHealthData.children.detail}</div>
                <div style={{fontSize:9,color:"#a8710a",marginTop:2,fontStyle:"italic"}}>{familyHealthData.children.note}</div>
              </div>

              {/* Disease tendencies */}
              <div style={{borderLeft:"3px solid #f0c75e",paddingLeft:10}}>
                <div style={{fontSize:12,fontWeight:700,color:"#7b1c1c",marginBottom:3}}>🩺 நோய் நாட்டம் (பலவீன காரகர்)</div>
                {familyHealthData.healthTendencies.length>0 ? (
                  familyHealthData.healthTendencies.map((h,i)=>(
                    <div key={i} style={{fontSize:10,color:"#555",marginBottom:3,lineHeight:1.5}}>
                      <b style={{color:"#cc1a1a"}}>{h.planet}</b> பலவீனம்/பாதிப்பு → <span style={{color:"#333"}}>{h.area}</span>
                    </div>
                  ))
                ) : <div style={{fontSize:10,color:"#0d7a30"}}>முக்கிய காரகர்கள் பலமாக உள்ளனர் — குறிப்பிட்ட நோய் நாட்டம் இல்லை</div>}
                <div style={{fontSize:9,color:"#a8710a",marginTop:3,fontStyle:"italic"}}>* இது நாட்டம் மட்டுமே — மருத்துவ பரிசோதனையை மாற்றாது. பலவீன கிரகம் = அதன் காரக உறுப்பில் கவனம்.</div>
              </div>
            </div>
          )}

          {/* ═══ 3.4 பாவ பலன் (LIFE-AREA READINGS) ═══ */}
          {bhavaPhalam && (
            <div style={{...card,marginBottom:10,padding:"14px 16px"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#7b1c1c",marginBottom:6,textAlign:"center"}}>📖 ஜாதக பலன்கள் (விவரம்)</div>
              <div style={{fontSize:10,color:"#6b5a48",background:"#f5efe3",border:"1px solid #e6dcc9",borderRadius:8,padding:"7px 10px",marginBottom:10,lineHeight:1.5,textAlign:"center"}}>
                ⓘ திருமணம் • ஆரோக்கியம் • தொழில் — ஒவ்வொன்றுக்கும் <b>🔮 மொத்த முடிவு</b> (எல்லா காரணிகளையும் சேர்த்தது) அந்தந்த பகுதியில் மேலே; அதற்குக் கீழே <b>தனி classical குறிப்புகள்</b> (சில சாதகம், சில பாதகம்).
              </div>
              <div style={{fontSize:10,color:"#8b6914",textAlign:"center",marginBottom:12}}>
                லக்னம்: {bhavaPhalam.lagna} • ராசி: {bhavaPhalam.moonRashi} • நட்சத்திரம்: {bhavaPhalam.nakshatra}
              </div>

              {bhavaPhalam.areas.map((area, ai) => {
                // Deep verdict (marriage/health/career) integrated into THIS area's block —
                // the single source of the combined reading for that area.
                const ka = keyAreas ? keyAreas[area.key] : null;
                return (
                <div key={ai} style={{marginBottom:14,borderLeft:"3px solid #f0c75e",paddingLeft:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:6}}>
                    {area.icon} {area.ta}
                  </div>

                  {ka && (
                    <div style={{border:`1px solid ${ka.verdictColor}30`,borderRadius:10,overflow:"hidden",marginBottom:10}}>
                      <div style={{background:`${ka.verdictColor}12`,padding:"9px 11px",borderBottom:`1px solid ${ka.verdictColor}20`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                          <span style={{fontSize:12,fontWeight:700,color:"#7b1c1c"}}>🔮 மொத்த முடிவு</span>
                          <span style={{fontSize:12,fontWeight:700,color:ka.verdictColor,textAlign:"right"}}>{ka.verdict}</span>
                        </div>
                        {/* வகை/தோஷ chips — காதல்/நிச்சயம், வேலை/தொழில், தோஷ மிகுதி... */}
                        {ka.chips && ka.chips.length > 0 && (
                          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
                            {ka.chips.map((c,ci)=>(
                              <span key={ci} style={{fontSize:9,fontWeight:700,padding:"2px 9px",borderRadius:10,
                                background:c.tone==="bad"?"#fee2e2":c.tone==="warn"?"#fef3c7":c.tone==="good"?"#dcfce7":"#e8eef8",
                                color:c.tone==="bad"?"#b91c1c":c.tone==="warn"?"#8a5a00":c.tone==="good"?"#166534":"#3b5aa0"}}>
                                {c.label}
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{fontSize:10.5,color:"#444",marginTop:4,lineHeight:1.5,whiteSpace:"pre-line"}}>{ka.summary}</div>
                      </div>
                      <div style={{padding:"7px 11px"}}>
                        {ka.factors.map((f, fi) => (
                          <div key={fi} style={{fontSize:10,color:"#555",marginBottom:4,lineHeight:1.5,display:"flex",gap:6}}>
                            <span style={{color:f.weight>0?"#0d7a30":f.weight<0?"#cc1a1a":"#999",fontWeight:700,flexShrink:0}}>{f.weight>0?"▲":f.weight<0?"▼":"•"}</span>
                            <span>{f.text}</span>
                          </div>
                        ))}
                        {/* வாழ்க்கைத் துணை விவரம் (திருமண area மட்டும்) */}
                        {ka.spouseProfile && (
                          <div style={{marginTop:6,padding:"7px 9px",background:"#fdf8ec",border:"1px dashed #d4a85360",borderRadius:8}}>
                            <div style={{fontSize:10,fontWeight:700,color:"#8b4500",marginBottom:3}}>💑 வாழ்க்கைத் துணை விவரம் (குறியீடு — {ka.spouseProfile.source} அடிப்படையில்)</div>
                            {ka.spouseProfile.traits.map((t,ti)=>(
                              <div key={ti} style={{fontSize:9.5,color:"#4a3a20",lineHeight:1.6}}>• <b>{t.planet}</b>: {t.trait}</div>
                            ))}
                            <div style={{fontSize:9.5,color:"#4a3a20",lineHeight:1.6,marginTop:2}}>
                              🧭 திசைக் குறியீடு: <b>{ka.spouseProfile.direction||"—"}</b>{ka.spouseProfile.distance ? ` • ${ka.spouseProfile.distance}` : ""}
                              {ka.spouseProfile.d9Note ? ` • D9-இல் 7ஆம் அதிபதி: ${ka.spouseProfile.d9Note}` : ""}
                            </div>
                            <div style={{fontSize:8.5,color:"#999",marginTop:2}}>இவை classical குறியீடுகள் — உறுதியான விவரணை அல்ல</div>
                          </div>
                        )}
                        {/* திரிதோஷம் (ஆரோக்கிய area மட்டும்) */}
                        {ka.tridosha && (
                          <div style={{marginTop:6,padding:"7px 9px",background:"#fdf8ec",border:"1px dashed #d4a85360",borderRadius:8}}>
                            <div style={{fontSize:10,fontWeight:700,color:"#8b4500",marginBottom:3}}>
                              🌿 உடலியல் தோஷக் கணிப்பு: <span style={{color:"#b91c1c"}}>{ka.tridosha.dominant} மிகுதி</span>{ka.tridosha.close ? ` (இணை: ${ka.tridosha.close})` : ""}
                            </div>
                            <div style={{fontSize:9.5,color:"#4a3a20",lineHeight:1.6}}>சாத்தியப் பாதிப்புகள்: {ka.tridosha.effects}</div>
                            {ka.healthMeta && (
                              <div style={{fontSize:9.5,color:"#4a3a20",lineHeight:1.6,marginTop:2}}>
                                மூலம்: {ka.healthMeta.origin}<br/>காலத் தன்மை: {ka.healthMeta.chronicity}
                              </div>
                            )}
                            <div style={{fontSize:8.5,color:"#999",marginTop:2}}>இது ஜோதிடக் குறியீடு — மருத்துவ ஆலோசனைக்கு மாற்று அல்ல</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {ka && <div style={{fontSize:9,color:"#8b6914",fontWeight:600,marginBottom:5}}>கீழே தனி classical குறிப்புகள் ⬇</div>}

                  {area.houseReadings.map((hr, hi) => (
                    <div key={hi} style={{marginBottom:8}}>
                      <div style={{fontSize:11,color:"#8b6914",fontWeight:600,marginBottom:3}}>
                        {hr.houseNum}ஆம் வீடு ({hr.houseTheme.ta}) — {hr.houseRashi}
                      </div>

                      {/* Planets sitting in this house — classical effects */}
                      {hr.occupants.length > 0 ? (
                        hr.occupants.map((occ, oi) => (
                          <div key={oi} style={{fontSize:11,color:"#333",marginBottom:4,lineHeight:1.5}}>
                            <span style={{fontWeight:700,color:"#7b1c1c"}}>{occ.symbol} {occ.planet}</span>
                            {occ.condition && <span style={{fontSize:9,color:/நீசம்|பகை|அஸ்தங்கம்/.test(occ.condition)?"#cc1a1a":/உச்சம்|சொந்த|ஆட்சி|மூலத்திரிகோண/.test(occ.condition)?"#0d7a30":"#8b6914",marginLeft:4}}>({occ.condition})</span>}
                            <br/>{occ.effect}
                            {/* கிரக சூழல் சங்கிலி — இப்பலனை மற்ற கிரகங்கள் எப்படி மாற்றுகின்றன */}
                            {(() => {
                              const pc = planetContext?.find(x => x.ta === occ.planet);
                              if (!pc) return null;
                              const disp = pc.chain.find(c => c.k === "ராசிநாதன்");
                              const star = pc.chain.find(c => c.k === "நட்சத்திராதிபதி");
                              return (
                                <div style={{fontSize:9,marginTop:2,lineHeight:1.5,
                                  color:pc.net>=2?"#2e7d32":pc.net<=-2?"#a03a00":"#6b5a48"}}>
                                  🔗 {disp && <span>ராசிநாதன்: {disp.text.split(" — ")[0]}</span>}
                                  {star && <span> • நட்: {star.text.split(" அதிபதி ")[1]?.split(" — ")[0] || ""}</span>}
                                  {" → "}<b>{pc.verdict}</b>
                                </div>
                              );
                            })()}
                          </div>
                        ))
                      ) : (
                        <div style={{fontSize:10,color:"#999",marginBottom:4,fontStyle:"italic"}}>
                          இந்த வீட்டில் கிரகம் இல்லை — வீட்டு அதிபதி நிலை பார்க்கவும்
                        </div>
                      )}

                      {/* Graha drishti falling ON this house — Saturn/Mars/Jupiter
                          special aspects included; modifies the house's palan */}
                      {hr.aspectors && hr.aspectors.length > 0 && (
                        <div style={{marginTop:2,marginBottom:4}}>
                          {hr.aspectors.map((asp, api) => (
                            <div key={api} style={{fontSize:10,lineHeight:1.5,
                              color:asp.tone==="benefic"?"#0d7a30":asp.tone==="malefic"?"#a03a00":"#6b5a13"}}>
                              👁 <b>{asp.symbol} {asp.planet}</b> ({asp.fromHouse}ஆம் வீட்டிலிருந்து பார்வை)
                              {asp.condition && <span style={{fontSize:9,color:"#8b6914"}}> [{asp.condition}]</span>}
                              {" — "}{asp.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* House lord placement — links where the significator sits */}
                      {hr.lordInfo.lordHouse && (
                        <div style={{fontSize:10,color:"#555",marginTop:2}}>
                          அதிபதி <b>{hr.lordInfo.lordName}</b> → {hr.lordInfo.lordHouse}ஆம் வீட்டில்
                          {hr.lordInfo.lordStrength && <span> ({hr.lordInfo.lordStrength.status})</span>}
                          {hr.lordVerdict && <span style={{color:(hr.lordVerdict.includes("பலமாக")||hr.lordVerdict.includes("நல்ல"))?"#0d7a30":(hr.lordVerdict.includes("பலவீன")||hr.lordVerdict.includes("துஸ்தான"))?"#cc1a1a":"#8b6914"}}> — {hr.lordVerdict}</span>}
                          {hr.lordTags && hr.lordTags.length > 0 && (
                            <span style={{color:"#8b6914"}}> [{hr.lordTags.join(", ")}]</span>
                          )}
                        </div>
                      )}
                      {/* இணைப்பு அடுக்கு: இவ்வீட்டின் SAV பிந்து + பாவ பலம் — அஷ்டகவர்க்கம் &
                          Bhava Bala engine-களின் முடிவு இங்கேயே பலனுடன் இணைகிறது */}
                      {(hr.savVerdict || hr.bhavaBala) && (
                        <div style={{fontSize:9.5,color:"#6b5a13",marginTop:3,display:"flex",gap:8,flexWrap:"wrap"}}>
                          {hr.savVerdict && (
                            <span style={{padding:"2px 7px",borderRadius:8,background:hr.savPoints>=30?"#dcfce7":hr.savPoints<=24?"#fee2e2":"#fef9c3",
                              color:hr.savPoints>=30?"#1b5e20":hr.savPoints<=24?"#cc1a1a":"#7a5200",fontWeight:600}}>🔢 {hr.savVerdict}</span>
                          )}
                          {hr.bhavaBala && (
                            <span style={{padding:"2px 7px",borderRadius:8,background:hr.bhavaBala.verdict==="பலமுள்ளது"?"#dcfce7":hr.bhavaBala.verdict==="பலவீனம்"?"#fee2e2":"#fef9c3",
                              color:hr.bhavaBala.verdict==="பலமுள்ளது"?"#1b5e20":hr.bhavaBala.verdict==="பலவீனம்"?"#cc1a1a":"#7a5200",fontWeight:600}}>🏠 பாவ பலம் {hr.bhavaBala.total} — {hr.bhavaBala.verdict}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Special note (e.g. Chevvai Dosham) — informational fact, rendered
                      NEUTRAL (not green) so a "dosham cancelled" line never looks like a
                      positive marriage verdict beside the 🔮 challenges verdict above. */}
                  {area.specialNote && (
                    <div style={{fontSize:10,color:area.specialNote.includes("⚠")?"#cc1a1a":"#6b5a48",background:area.specialNote.includes("⚠")?"#fff0f0":"#f5efe3",border:"1px solid #e6dcc9",padding:"6px 8px",borderRadius:6,marginTop:4}}>
                      {area.specialNote}
                    </div>
                  )}
                </div>
                );
              })}

              {/* Current Dasha context — the time dimension */}
              {bhavaPhalam.dashaContext && (
                <div style={{marginTop:12,padding:"8px 10px",background:"#f0e8d0",borderRadius:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#7b1c1c",marginBottom:4}}>⏳ தற்போதைய காலம் (திசா-புக்தி)</div>
                  <div style={{fontSize:11,color:"#333",lineHeight:1.5}}>
                    நடப்பு தசை: <b>{bhavaPhalam.dashaContext.mahaLord}</b>
                    {bhavaPhalam.dashaContext.antarLord && <span> / புக்தி: <b>{bhavaPhalam.dashaContext.antarLord}</b></span>}
                    <br/>
                    {bhavaPhalam.dashaContext.mahaLord} {bhavaPhalam.dashaContext.dashaLordHouse}ஆம் வீட்டில் ({bhavaPhalam.dashaContext.dashaLordRashi})
                    {bhavaPhalam.dashaContext.dashaLordStrength && <span> — {bhavaPhalam.dashaContext.dashaLordStrength}</span>}
                    {bhavaPhalam.dashaContext.dashaLordUnified && (
                      <span> • ஒருங்கிணைந்த பலம்: <b style={{color:bhavaPhalam.dashaContext.dashaLordUnified.composite>=60?"#0d7a30":bhavaPhalam.dashaContext.dashaLordUnified.composite<45?"#cc1a1a":"#7a5200"}}>
                        {bhavaPhalam.dashaContext.dashaLordUnified.composite}/100 ({bhavaPhalam.dashaContext.dashaLordUnified.tier})</b></span>
                    )}
                    {bhavaPhalam.dashaContext.rulesHouses.length > 0 && (
                      <span><br/>இந்த தசையில் {bhavaPhalam.dashaContext.rulesHouses.join(",")}ஆம் வீட்டு விஷயங்கள் முன்னணியில் இருக்கும்</span>
                    )}
                  </div>
                  {/* தசாநாதன் — இந்த லக்னத்திற்கு யோககாரகனா / சுபனா / பாபனா / மாரகனா */}
                  {functionalNature && functionalNature[bhavaPhalam.dashaContext.mahaLord] && (
                    <div style={{fontSize:10.5,marginTop:5,padding:"5px 8px",borderRadius:6,
                      background:functionalNature[bhavaPhalam.dashaContext.mahaLord].nature==="யோககாரகன்"||functionalNature[bhavaPhalam.dashaContext.mahaLord].nature==="சுபன்"?"#e8f5e9":functionalNature[bhavaPhalam.dashaContext.mahaLord].nature==="பாபன்"?"#fde8e8":"#f7f5ef",
                      color:functionalNature[bhavaPhalam.dashaContext.mahaLord].nature==="யோககாரகன்"||functionalNature[bhavaPhalam.dashaContext.mahaLord].nature==="சுபன்"?"#1b5e20":functionalNature[bhavaPhalam.dashaContext.mahaLord].nature==="பாபன்"?"#cc1a1a":"#6b5a13"}}>
                      ⚖ தசாநாதன் {bhavaPhalam.dashaContext.mahaLord} — உங்கள் லக்னத்திற்கு <b>{functionalNature[bhavaPhalam.dashaContext.mahaLord].nature}</b>
                      {marakaBadhaka?.marakaLords.includes(bhavaPhalam.dashaContext.mahaLord) && <b style={{color:"#cc1a1a"}}> • மாரகாதிபதி — ஆரோக்கியத்தில் கவனம்</b>}
                      {marakaBadhaka?.badhakaLord === bhavaPhalam.dashaContext.mahaLord && <b style={{color:"#a03a00"}}> • பாதகாதிபதி — தடைகள் கவனம்</b>}
                    </div>
                  )}
                  {/* BPHS தசாபல விதி — தசாநாதன் தன் ராசிநாதன், நட்சத்திராதிபதி,
                      சேர்க்கை-பார்வை கிரகங்களின் வழியாகவும் பலன் தருவான் */}
                  {(() => {
                    const pc = planetContext?.find(x => x.ta === bhavaPhalam.dashaContext.mahaLord);
                    if (!pc) return null;
                    return (
                      <div style={{fontSize:9.5,marginTop:4,padding:"5px 8px",borderRadius:6,background:"#faf6e8",border:"1px solid #e6dcc9",lineHeight:1.7,color:"#4a3a20"}}>
                        <b style={{color:"#7b1c1c"}}>🔗 தசாநாதன் பலன் தரும் வழி ({pc.verdict}):</b>
                        {pc.chain.slice(0, 4).map((c, ci) => (
                          <div key={ci} style={{color:c.score>0?"#2e7d32":c.score<0?"#a03a00":"#555"}}>• {c.k}: {c.text}</div>
                        ))}
                      </div>
                    );
                  })()}
                  {/* தசா சந்தி எச்சரிக்கை */}
                  {dashaData && (() => {
                    const sandhi = dashaSandhi;
                    return sandhi ? sandhi.map((sa, si) => (
                      <div key={si} style={{fontSize:10,marginTop:4,padding:"5px 8px",borderRadius:6,
                        background:sa.level==="high"?"#fde8e8":"#fff8e1",
                        color:sa.level==="high"?"#cc1a1a":"#7a5200",fontWeight:600}}>
                        ⏳ {sa.text}
                      </div>
                    )) : null;
                  })()}
                </div>
              )}

              {/* Yogas & Doshas summary */}
              {(bhavaPhalam.yogaList.length > 0 || bhavaPhalam.doshaList.length > 0) && (
                <div style={{marginTop:10,fontSize:10,color:"#555"}}>
                  {bhavaPhalam.yogaList.length > 0 && <div>✅ சுப யோகங்கள்: {bhavaPhalam.yogaList.join(", ")}</div>}
                  {bhavaPhalam.doshaList.length > 0 && <div style={{marginTop:2}}>⚠ தோஷங்கள்: {bhavaPhalam.doshaList.join(", ")}</div>}
                </div>
              )}

              <div style={{fontSize:8,color:"#aaa",textAlign:"center",marginTop:10,fontStyle:"italic"}}>
                BPHS / சாராவளி classical grantha அடிப்படையில் — கிரக நிலை, வீட்டு அதிபதி, கிரக பலம், தசை இணைத்து
              </div>
            </div>
          )}

          {/* ═══ 3.5 GRAHA BALA (Planet Strength) ═══ */}
          {advancedView==="grahabala" && grahaBala && grahaBala.length > 0 && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                💪 கிரக பலம் (Graha Bala)
              </div>
              {grahaBala.map((g,i) => {
                const statusColor = g.status==="உச்சம்"||g.status==="சொந்த வீடு" ? "#4ade80"
                  : g.status==="நீசம்" ? "#dc2626"
                  : g.status==="நட்பு வீடு" ? "#b8860b" : "#333333";
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",
                    borderBottom:i<grahaBala.length-1?"1px solid #e8e0e0":"none"}}>
                    <span style={{fontSize:14,width:20}}>{g.symbol}</span>
                    <span style={{fontSize:11,color:"#1a1a1a",width:70}}>{g.ta}</span>
                    <div style={{flex:1,background:"#eddada",borderRadius:4,height:6,overflow:"hidden"}}>
                      <div style={{width:`${g.score*10}%`,height:"100%",background:statusColor,borderRadius:4}}/>
                    </div>
                    <span style={{fontSize:9,fontWeight:700,color:statusColor,width:32,textAlign:"right"}}>{g.score}/10</span>
                    <span style={{fontSize:9,color:statusColor,width:62,textAlign:"right"}}>{g.status}</span>
                  </div>
                );
              })}
              <div style={{fontSize:9,color:"#777777",marginTop:8}}>
                உச்சம்/நீசம்/சொந்த வீடு/நட்பு அடிப்படையிலான பலம் — Parashara முறை
              </div>
            </div>
          )}

          {/* ═══ 3.6 YOGAS (Mahapurusha + Classical combined) ═══ */}
          {advancedView==="yogas" && (
            <>
              {mahapurushaYogas && mahapurushaYogas.length > 0 && (
                <div style={{...card,marginBottom:10,padding:"12px 14px",border:"1px solid #f0c75e40",
                  background:"linear-gradient(135deg,rgba(212,168,83,0.08),rgba(167,139,250,0.04))"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderLeft:"3px solid #7b1c1c",paddingLeft:8,letterSpacing:0.5}}>
                    ⭐ பஞ்ச மகாபுருஷ யோகம் கண்டறியப்பட்டது!
                  </div>
                  {mahapurushaYogas.map((y,i) => (
                    <div key={i} style={{marginBottom:i<mahapurushaYogas.length-1?10:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:18}}>{y.symbol}</span>
                        <span style={{fontSize:13,fontWeight:700,color:"#7b1c1c"}}>{y.name}</span>
                        <span style={{fontSize:9,color:"#555555"}}>({y.house}ஆம் வீடு)</span>
                      </div>
                      <div style={{fontSize:11,color:"#333333",marginTop:3,lineHeight:1.5}}>{y.effect}</div>
                    </div>
                  ))}
                </div>
              )}
              {classicalYogas && classicalYogas.length > 0 && (
                <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                    🕉 யோகங்கள் கண்டறியப்பட்டது ({classicalYogas.length})
                  </div>
                  {classicalYogas.map((y,i) => {
                    const isDosha = y.type === "dosha";
                    const col = isDosha ? "#dc2626" : "#7b1c1c";
                    return (
                      <div key={i} style={{
                        marginBottom:i<classicalYogas.length-1?10:0, padding:"8px 10px",
                        background:`${col}08`, borderLeft:`3px solid ${col}`, borderRadius:"0 6px 6px 0"
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:14}}>{y.icon}</span>
                          <span style={{fontSize:12,fontWeight:700,color:col}}>{y.name}</span>
                          <span style={{fontSize:8,color:`${col}90`}}>{y.nameEn}</span>
                          {isDosha && <span style={{fontSize:7,background:"#ff6b8a20",color:"#dc2626",padding:"1px 6px",borderRadius:5,marginLeft:"auto",fontWeight:700}}>தோஷம்</span>}
                        </div>
                        <div style={{fontSize:10.5,color:"#333333",marginTop:4,lineHeight:1.6}}>{y.desc}</div>
                      </div>
                    );
                  })}
                  <div style={{fontSize:9,color:"#777777",marginTop:8}}>
                    கேந்திர/திரிகோண நாத சேர்க்கை + பார்வை + பரிவர்த்தனை அடிப்படையில் — BPHS classical rules
                  </div>
                </div>
              )}
              {(!mahapurushaYogas || mahapurushaYogas.length===0) && (!classicalYogas || classicalYogas.length===0) && (
                <div style={{...card,marginBottom:10,padding:"14px",textAlign:"center",fontSize:11,color:"#555555"}}>
                  இந்த ஜாதகத்தில் மேற்குறிப்பிட்ட யோகங்கள் எதுவும் கண்டறியப்படவில்லை
                </div>
              )}
            </>
          )}

          {/* ═══ 3.7 ASHTAKAVARGA — SARVASHTAKAVARGA ═══ */}
          {advancedView==="ashtakavarga" && ashtakavargaData && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🔢 சர்வாஷ்டகவர்க்கம் (Sarvashtakavarga)
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
                {ashtakavargaData.sav.map((count,i) => {
                  const strong = count > ashtakavargaData.savAvg + 2;
                  const weak = count < ashtakavargaData.savAvg - 2;
                  const col = strong ? "#4ade80" : weak ? "#dc2626" : "#b8860b";
                  return (
                    <div key={i} style={{
                      background:`${col}10`, border:`1px solid ${col}30`, borderRadius:8,
                      padding:"6px 4px", textAlign:"center"
                    }}>
                      <div style={{fontSize:8,color:"#555555"}}>{RASHIS[i].slice(0,3)}</div>
                      <div style={{fontSize:14,fontWeight:700,color:col}}>{count}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                சராசரி: {ashtakavargaData.savAvg} bindus/வீடு • பச்சை=வலிமை (Gochara-க்கு நல்லது) • சிவப்பு=பலவீனம் • மொத்தம்: 337 bindus, 7 கிரகங்கள் × 8 reference points
              </div>
            </div>
          )}

          {/* ═══ 3.8 GRAHA DRISHTI — PLANETARY ASPECTS ═══ */}
          {advancedView==="drishti" && drishtiData && drishtiData.length > 0 && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                👁 கிரக திருஷ்டி (Graha Drishti)
              </div>
              {drishtiData.map((a,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",
                  borderBottom:i<drishtiData.length-1?"1px solid #e8e0e0":"none"}}>
                  <span style={{fontSize:15}}>{a.fromSymbol}</span>
                  <span style={{fontSize:11,color:"#1a1a1a",width:60}}>{a.from}</span>
                  <span style={{fontSize:12,color:"#b8860b"}}>→</span>
                  <span style={{fontSize:15}}>{a.toSymbol}</span>
                  <span style={{fontSize:11,color:"#1a1a1a",flex:1}}>{a.to}</span>
                  <span style={{
                    fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:5,
                    background:a.isSpecial?"#e6d2d2":"#f0e8d0",
                    color:a.isSpecial?"#7b1c1c":"#555555"
                  }}>{a.houseOffset}ஆம் வீடு{a.isSpecial?" (சிறப்பு)":""}</span>
                </div>
              ))}
              <div style={{fontSize:9,color:"#777777",marginTop:8}}>
                எல்லா கிரகங்களும் 7ஆம் வீட்டை பார்க்கும் • செவ்வாய்:4,8 • குரு:5,9 • சனி:3,10
              </div>
            </div>
          )}

          {/* ═══ 3.9 D10 DASAMSA — CAREER CHART ═══ */}
          {advancedView==="d10" && d10Data && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                💼 தசாம்சம் D10 (தொழில் பிரிவு சக்கரம்)
              </div>
              {d10Data.map((p,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",
                  borderBottom:i<d10Data.length-1?"1px solid #e8e0e0":"none"}}>
                  <span style={{fontSize:11,color:"#1a1a1a",width:64,fontWeight:600}}>{p.ta}</span>
                  <span style={{fontSize:10,color:"#666666"}}>D1: {p.rashi}</span>
                  <span style={{fontSize:11,color:"#b8860b"}}>→</span>
                  <span style={{fontSize:11,fontWeight:600,color:"#7b1c1c",flex:1,textAlign:"right"}}>{p.d10RashiName}</span>
                </div>
              ))}
              <div style={{fontSize:9,color:"#777777",marginTop:8}}>
                தொழில், பதவி, சமூக அந்தஸ்து பற்றிய நுணுக்கமான பலன் — Parashari முறை
              </div>
            </div>
          )}

          {/* ═══ 3.10 D2/D3/D12 — COMBINED DIVISIONAL TABLE ═══ */}
          {advancedView==="divisional" && d2Data && d3Data && d12Data && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🔀 பிரிவு சக்கரங்கள் (Divisional Charts)
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D2 செல்வம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D3 சகோதரர்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D4 சொத்து</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D7 குழந்தை</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D12 பெற்றோர்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D60 கர்மம்</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d2Data.map((p,i) => (
                      <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                        <td style={{padding:"6px 4px",color:"#1a1a1a",fontWeight:600}}>{p.ta}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{p.d2RashiName?.slice(0,4)}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d3Data[i]?.d3RashiName?.slice(0,4)}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d4Data&&d4Data[i]?d4Data[i].d4RashiName?.slice(0,4):""}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d7Data&&d7Data[i]?d7Data[i].d7RashiName?.slice(0,4):""}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d12Data[i]?.d12RashiName?.slice(0,4)}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:d60Data&&d60Data[i]?.d60Nature==="தீய"?"#cc1a1a":"#0d7a30",fontWeight:600,fontSize:9}}>{d60Data&&d60Data[i]?`${d60Data[i].d60RashiName?.slice(0,4)}`:""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {d60Data && (
                <div style={{marginTop:10,padding:"10px 12px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#7b1c1c",marginBottom:6}}>D60 ஷஷ்டியாம்சம் — கர்ம விவரம்</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {d60Data.map((p,i)=>(
                      <div key={i} style={{fontSize:8,padding:"3px 6px",borderRadius:4,
                        background:p.d60Nature==="நல்ல"?"#e6f4ea":p.d60Nature==="தீய"?"#fde8e8":"#f5f5f5",
                        color:p.d60Nature==="நல்ல"?"#0d7a30":p.d60Nature==="தீய"?"#cc1a1a":"#666",
                        border:`1px solid ${p.d60Nature==="நல்ல"?"#b7e1c7":p.d60Nature==="தீய"?"#f5c6c6":"#ddd"}`}}>
                        {p.ta} — {p.d60Name} ({p.d60Nature})
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                D2=செல்வம் • D3=சகோதரர்கள் • D4=சொத்து/வாகனம் • D7=குழந்தைகள் • D12=பெற்றோர் • D60=கர்மம் — Parashari முறை
              </div>
            </div>
          )}

          {/* ═══ மேல் வர்க்கங்கள் (Shodashavarga — D16/D20/D24/D27/D40/D45) ═══ */}
          {advancedView==="shodashavarga" && d16Data && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🕉 மேல் வர்க்க சக்கரங்கள் (Higher Divisional Charts)
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D16 வாகனம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D20 ஆன்மீகம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D24 கல்வி</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D27 பலம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D40 தாய்வழி</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D45 தந்தைவழி</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d16Data.map((p,i) => (
                      <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                        <td style={{padding:"6px 4px",color:"#1a1a1a",fontWeight:600}}>{p.ta}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{p.d16RashiName?.slice(0,4)}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d20Data&&d20Data[i]?d20Data[i].d20RashiName?.slice(0,4):""}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d24Data&&d24Data[i]?d24Data[i].d24RashiName?.slice(0,4):""}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d27Data&&d27Data[i]?d27Data[i].d27RashiName?.slice(0,4):""}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d40Data&&d40Data[i]?d40Data[i].d40RashiName?.slice(0,4):""}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{d45Data&&d45Data[i]?d45Data[i].d45RashiName?.slice(0,4):""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.6}}>
                D16=வாகனம்/சுகபோகம் • D20=ஆன்மீகம்/வழிபாடு • D24=கல்வி/அறிவு • D27=பலம்/பலவீனம் • D40=தாய்வழி சுப/அசுபம் • D45=தந்தைவழி/நடத்தை — BPHS Parashari முறை. இவை ராசி (D1), நவாம்சம் (D9), தசாம்சம் (D10) உடன் சேர்ந்து முழு Shodashavarga (16 சக்கரம்) அமைப்பை நிறைவு செய்கின்றன.
              </div>

              {/* Vimshopaka Bala (ShadVarga 20-point strength) */}
              {vimshopakaData && (
                <div style={{marginTop:12,paddingTop:10,borderTop:"1px dashed #e6dcc9"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#a8710a",marginBottom:6}}>விம்சோபக பலம் (Vimshopaka — ஷட்வர்க்க 20)</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {vimshopakaData.map((v,i)=>(
                      <div key={i} style={{fontSize:9,padding:"4px 8px",borderRadius:6,minWidth:78,
                        background:v.percentage>=70?"#e6f4ea":v.percentage>=45?"#f5efe3":"#fde8e8",
                        border:`1px solid ${v.percentage>=70?"#b7e1c7":v.percentage>=45?"#e6dcc9":"#f5c6c6"}`}}>
                        <div style={{fontWeight:700,color:"#5f1414"}}>{v.symbol} {v.ta}</div>
                        <div style={{color:v.percentage>=70?"#0d7a30":v.percentage>=45?"#a8710a":"#cc1a1a",fontWeight:700}}>{v.total}/20 ({v.percentage}%)</div>
                        {v.classification && v.classification!=="—" && <div style={{color:"#777",fontSize:8}}>{v.classification}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:8,color:"#777",marginTop:6,lineHeight:1.5}}>
                    ஷட்வர்க்கம் (D1×6+D2×2+D3×4+D9×5+D12×2+D30×1 = 20) கிரக கண்ணியம் அடிப்படையில் — BPHS அத்.17. 70%+ = மிக பலம், 45%+ = நடுத்தரம்.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ஜைமினி — ராசி திருஷ்டி, அர்கலா, சர காரகர் ═══ */}
          {advancedView==="jaimini" && jaiminiData && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                ☯ ஜைமினி பகுப்பாய்வு (Jaimini)
              </div>

              {/* Chara Karakas */}
              {jaiminiData.charaKarakas && jaiminiData.charaKarakas.length > 0 && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#a8710a",marginBottom:5}}>சர காரகர்கள் (Chara Karakas)</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {jaiminiData.charaKarakas.map((k,i)=>(
                      <div key={i} style={{fontSize:9,padding:"3px 7px",borderRadius:5,background:"#f5efe3",border:"1px solid #e6dcc9",color:"#5f1414"}}>
                        <b>{k.ta}</b>{k.planet?` — ${k.planet}`:""}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rashi Drishti on Lagna */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:"#a8710a",marginBottom:5}}>ராசி திருஷ்டி — லக்னம் ({jaiminiData.lagnaName})</div>
                <div style={{fontSize:10,color:"#555",lineHeight:1.6}}>
                  லக்னம் இந்த ராசிகளை பார்க்கிறது: <b style={{color:"#7b1c1c"}}>{jaiminiData.lagnaDrishtiSigns.join(", ")}</b>
                </div>
                <div style={{fontSize:10,color:"#555",lineHeight:1.6,marginTop:3}}>
                  லக்னத்தை பார்க்கும் கிரகங்கள்: {jaiminiData.lagnaAspectedBy.length>0
                    ? <b style={{color:"#7b1c1c"}}>{jaiminiData.lagnaAspectedBy.map(a=>`${a.ta} (${a.from})`).join(", ")}</b>
                    : <span style={{color:"#999"}}>இல்லை</span>}
                </div>
              </div>

              {/* Argala on Lagna */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#a8710a",marginBottom:5}}>அர்கலா — லக்னத்தின் மேல்</div>
                {jaiminiData.lagnaArgala.length>0 ? jaiminiData.lagnaArgala.map((a,i)=>(
                  <div key={i} style={{fontSize:10,color:"#555",lineHeight:1.6,marginBottom:3,padding:"4px 8px",background:a.effective?"#e6f4ea":a.partial?"#f5efe3":"#fde8e8",borderRadius:5,border:`1px solid ${a.effective?"#b7e1c7":a.partial?"#e6dcc9":"#f5c6c6"}`}}>
                    <b>{a.house}</b>: அர்கலா [{a.argPlanets.join(", ")||"—"}] · விரோதம் [{a.virPlanets.join(", ")||"—"}]
                    <span style={{fontWeight:700,color:a.effective?"#0d7a30":a.partial?"#a8710a":"#cc1a1a"}}> — {a.effective?"செயல்படும் அர்கலா":a.partial?"பகுதி தடை":"தடைபட்டது"}</span>
                  </div>
                )) : <div style={{fontSize:10,color:"#999"}}>குறிப்பிடத்தக்க அர்கலா இல்லை</div>}
              </div>

              {/* Arudha */}
              {jaiminiData.arudhaName && (
                <div style={{fontSize:10,color:"#555",lineHeight:1.6,marginBottom:4}}>
                  <b style={{color:"#a8710a"}}>அருட லக்னம் (AL):</b> {jaiminiData.arudhaName}
                  {jaiminiData.arudhaAspectedBy.length>0 && <span> — பார்க்கும் கிரகங்கள்: <b style={{color:"#7b1c1c"}}>{jaiminiData.arudhaAspectedBy.map(a=>a.ta).join(", ")}</b></span>}
                </div>
              )}

              {/* All 12 Arudha Padas */}
              {arudhaPadasData && (
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px dashed #e6dcc9"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#a8710a",marginBottom:6}}>12 ஆரூட பதங்கள் (Arudha Padas)</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:4}}>
                    {arudhaPadasData.filter(Boolean).map((p,i)=>(
                      <div key={i} style={{fontSize:9,padding:"4px 7px",borderRadius:5,background:p.houseNum===1?"#fff3d6":"#f5efe3",border:"1px solid #e6dcc9",color:"#5f1414",display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontWeight:600}}>{p.pada}</span>
                        <b style={{color:"#7b1c1c"}}>{p.rashiName}</b>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:8,color:"#aaa",marginTop:4,fontStyle:"italic"}}>A1=லக்ன பதம் (பொது தோற்றம்/புகழ்), A12=உபபத பதம் (துணை) — BPHS 29</div>
                </div>
              )}

              {/* Chara Dasha (KN Rao) */}
              {charaDashaData && (
                <div style={{marginTop:12,paddingTop:10,borderTop:"1px dashed #e6dcc9"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#a8710a",marginBottom:5}}>சர தசா (Chara Dasha) — திசை: {charaDashaData.direction}</div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                      <thead><tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                        <th style={{padding:"4px 3px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>ராசி தசை</th>
                        <th style={{padding:"4px 3px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>ஆண்டு</th>
                        <th style={{padding:"4px 3px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>தொடக்கம்</th>
                        <th style={{padding:"4px 3px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>முடிவு</th>
                      </tr></thead>
                      <tbody>
                        {charaDashaData.dashas.map((d,i)=>{
                          const isCur=charaDashaData.currentRashi===d.rashiName && new Date()>=d.startDate && new Date()<d.endDate;
                          return (
                            <tr key={i} style={{borderBottom:"1px solid #eee",background:isCur?"#e8f5e9":i%2?"#fafafa":"transparent",fontWeight:isCur?700:400}}>
                              <td style={{padding:"5px 3px",color:"#7b1c1c",fontWeight:600}}>{d.rashiName}{isCur&&<span style={{color:"#1a8d1a",fontSize:8}}> (நடப்பு)</span>}</td>
                              <td style={{padding:"5px 3px",textAlign:"center",color:"#333"}}>{d.years}</td>
                              <td style={{padding:"5px 3px",color:"#555"}}>{d.startDate.toLocaleDateString("ta-IN")}</td>
                              <td style={{padding:"5px 3px",color:"#555"}}>{d.endDate.toLocaleDateString("ta-IN")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{fontSize:8,color:"#777",marginTop:5,lineHeight:1.5}}>
                    <b>முறை (KN Rao):</b> லக்னம் ஒற்றை→நேர், இரட்டை→மாறு. கால அளவு = ராசியிலிருந்து அதிபதி வரை எண்ணி −1 (சொந்த வீடு=12), உச்சம்+1/நீசம்−1 (1..12). ஸ்கார்பியோ→செவ்வாய், கும்பம்→சனி. * இது KN Rao முறை — Jaimini ராசி தசாக்களில் ஒன்று; பிற முறைகளும் (Narayana/Sthira) உண்டு.
                  </div>
                </div>
              )}

              <div style={{fontSize:9,color:"#777",marginTop:6,lineHeight:1.5}}>
                ராசி திருஷ்டி: சர→ஸ்திர (அடுத்தது தவிர), ஸ்திர→சர (அடுத்தது தவிர), உभய→உभய. அர்கலா: 2/4/11ஆம் வீட்டு கிரகம் தலையீடு, விரோதம் 12/10/3ல் இருந்து — ஜைமினி முறை.
              </div>
            </div>
          )}

          {/* ═══ வர்ஷபலன் (Varshaphala — annual chart) ═══ */}
          {advancedView==="varshaphala" && varshaphalaData && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                📅 வர்ஷபலன் — {varshaphalaData.year}–{varshaphalaData.year+1} (வயது {varshaphalaData.age})
              </div>

              <div style={{fontSize:11,color:"#333",lineHeight:1.7,marginBottom:10,background:"#f5efe3",border:"1px solid #e6dcc9",borderRadius:8,padding:"8px 10px"}}>
                <div>☀ <b>வர்ஷ பிரவேசம்:</b> {varshaphalaData.praveshDate.toLocaleDateString("ta-IN")} {varshaphalaData.praveshDate.toLocaleTimeString("ta-IN",{hour:'2-digit',minute:'2-digit'})}</div>
                <div>🔼 <b>வர்ஷ லக்னம்:</b> <span style={{color:"#7b1c1c",fontWeight:700}}>{varshaphalaData.varshaLagnaName}</span></div>
                <div>🎯 <b>முந்தா:</b> <span style={{color:"#7b1c1c",fontWeight:700}}>{varshaphalaData.munthaName}</span> ({varshaphalaData.munthaHouse}ஆம் வர்ஷ வீடு) — அதிபதி {varshaphalaData.munthaLord}</div>
              </div>

              {/* Annual chart planet houses */}
              <div style={{fontSize:11,fontWeight:700,color:"#a8710a",marginBottom:5}}>ஆண்டு ஜாதக கிரக நிலை</div>
              <div style={{overflowX:"auto",marginBottom:10}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                  <thead><tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                    <th style={{padding:"4px 3px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                    <th style={{padding:"4px 3px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>ராசி</th>
                    <th style={{padding:"4px 3px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>வர்ஷ வீடு</th>
                  </tr></thead>
                  <tbody>
                    {varshaphalaData.annualPlacements.map((p,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                        <td style={{padding:"5px 3px",color:"#7b1c1c",fontWeight:600}}>{p.symbol} {p.ta}</td>
                        <td style={{padding:"5px 3px",color:"#333"}}>{p.rashi}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontWeight:600}}>{p.house}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Varshesha candidates */}
              <div style={{fontSize:11,fontWeight:700,color:"#a8710a",marginBottom:4}}>வர்ஷேஸ் (ஆண்டு அதிபதி) — வேட்பாளர்கள்</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                {varshaphalaData.candidates.map((c,i)=>(
                  <div key={i} style={{fontSize:9,padding:"4px 8px",borderRadius:6,background:"#f5efe3",border:"1px solid #e6dcc9",color:"#5f1414"}}>
                    <b>{c.planet}</b> — {c.role}
                  </div>
                ))}
              </div>

              <div style={{fontSize:8,color:"#777",marginTop:6,lineHeight:1.5}}>
                வர்ஷ பிரவேசம் = சூரியன் ஜன்ம நிலைக்கு திரும்பும் தருணம். முந்தா = ஜன்ம லக்னம் + வயது (ஆண்டுக்கு 1 ராசி). * இறுதி வர்ஷேஸ் பஞ்ச வர்கீய பலத்தால் தீர்மானிக்கப்படும் (நூல்களுக்கிடையே சிறிது வேறுபாடு உண்டு) — எனவே வேட்பாளர்கள் மட்டும் காட்டப்படுகிறது, ஊகிக்கப்படவில்லை.
              </div>
            </div>
          )}

          {/* ═══ பிரஸ்னம் (Prashna — current-moment horary) ═══ */}
          {advancedView==="prashna" && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                ❓ பிரஸ்னம் (Prashna Horary)
              </div>
              <div style={{fontSize:10.5,color:"#555",lineHeight:1.6,marginBottom:10}}>
                மனதில் ஒரு கேள்வியை நினைத்து, <b>இப்போது</b> கீழே பொத்தானை அழுத்துங்கள். அந்த தருணத்துக்கான லக்னம் அமைத்து பலன் பார்க்கப்படும் (தத்கால பிரஸ்ன முறை).
              </div>
              <button onClick={async ()=>{ const geo=resolveBirthGeo(formData); try{ setPrashnaData(await apiEngine("calcPrashnaChart",[geo.lat, geo.lon])); }catch(e){} }}
                className="jn-shine" style={{...btnGold, marginBottom:12}}>
                🔮 இப்போது பிரஸ்னம் போடு
              </button>

              {prashnaData && (
                <div>
                  <div style={{padding:"10px 12px",borderRadius:10,background:`${prashnaData.verdictColor}12`,border:`1px solid ${prashnaData.verdictColor}30`,marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#7b1c1c"}}>தீர்ப்பு</span>
                      <span style={{fontSize:13,fontWeight:700,color:prashnaData.verdictColor}}>{prashnaData.verdict}</span>
                    </div>
                    <div style={{fontSize:10,color:"#666",marginTop:3}}>{prashnaData.now.toLocaleString("ta-IN")}</div>
                  </div>

                  <div style={{fontSize:11,color:"#333",lineHeight:1.7,marginBottom:10,background:"#f5efe3",border:"1px solid #e6dcc9",borderRadius:8,padding:"8px 10px"}}>
                    <div>🔼 <b>பிரஸ்ன லக்னம்:</b> <span style={{color:"#7b1c1c",fontWeight:700}}>{prashnaData.lagnaName}</span> — {prashnaData.lagnaNature}</div>
                    <div>☽ <b>சந்திரன்:</b> {prashnaData.moonSign} ({prashnaData.moonNak}) — {prashnaData.moonHouse}ஆம் வீடு</div>
                  </div>

                  <div style={{fontSize:11,fontWeight:700,color:"#a8710a",marginBottom:4}}>காரணிகள்</div>
                  {prashnaData.factors.map((f,i)=>(
                    <div key={i} style={{fontSize:10,color:"#555",marginBottom:3,display:"flex",gap:6}}>
                      <span style={{color:f.good?"#0d7a30":"#cc1a1a",fontWeight:700}}>{f.good?"▲":"▼"}</span>
                      <span>{f.text}</span>
                    </div>
                  ))}

                  <div style={{fontSize:8,color:"#777",marginTop:8,lineHeight:1.5}}>
                    தத்கால பிரஸ்னம் — கேள்வி கேட்ட தருணத்துக்கு லக்னம். சுபன் கேந்திர/திரிகோணத்தில் = சாதகம், பாபன் லக்னத்தில் = தடை, சந்திரனின் நிலை முக்கியம். (KP 249 sub-lord முறை பயன்படுத்தப்படவில்லை — அது variant-heavy.)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ கால சர்ப்ப தோஷம் ═══ */}
          {advancedView==="kalasarpa" && kalaSarpa && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🐍 கால சர்ப்ப தோஷம்
              </div>
              {kalaSarpa.present ? (
                <div>
                  <div style={{padding:"10px 12px",background:"#fde8e8",borderRadius:8,border:"1px solid #f5c6c6",marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#cc1a1a",marginBottom:4}}>⚠ கால சர்ப்ப தோஷம் உள்ளது</div>
                    <div style={{fontSize:11,color:"#333"}}>வகை: <span style={{fontWeight:700,color:"#7b1c1c"}}>{kalaSarpa.type}</span></div>
                    <div style={{fontSize:11,color:"#333",marginTop:2}}>திசை: <span style={{fontWeight:600}}>{kalaSarpa.direction}</span></div>
                    <div style={{fontSize:11,color:"#333",marginTop:2}}>ராகு: <span style={{fontWeight:600}}>{kalaSarpa.rahuRashi}</span> • கேது: <span style={{fontWeight:600}}>{kalaSarpa.ketuRashi}</span></div>
                  </div>
                  <div style={{padding:"10px 12px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#7b1c1c",marginBottom:6}}>பரிகாரம்</div>
                    <div style={{fontSize:10,color:"#333",lineHeight:1.6}}>{kalaSarpa.remedy}</div>
                  </div>
                </div>
              ) : (
                <div style={{padding:"10px 12px",background:"#e6f4ea",borderRadius:8,border:"1px solid #b7e1c7"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#0d7a30"}}>✓ கால சர்ப்ப தோஷம் இல்லை</div>
                  <div style={{fontSize:10,color:"#333",marginTop:4}}>அனைத்து கிரகங்களும் ராகு-கேது அச்சுக்கு வெளியே உள்ளன.</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ செவ்வாய் தோஷம் ═══ */}
          {advancedView==="chevvai" && chevvaiDosham && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🔴 செவ்வாய் தோஷம் (மாங்கல்ய தோஷம்)
              </div>
              {chevvaiDosham.present ? (
                <div>
                  <div style={{padding:"10px 12px",background:"#fde8e8",borderRadius:8,border:"1px solid #f5c6c6",marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#cc1a1a",marginBottom:4}}>⚠ செவ்வாய் தோஷம் உள்ளது</div>
                    <div style={{fontSize:11,color:"#333"}}>தீவிரம்: <span style={{fontWeight:700,color:chevvaiDosham.severity >= 3 ? "#cc1a1a" : "#7a5200"}}>{chevvaiDosham.severityText}</span></div>
                    <div style={{fontSize:11,color:"#333",marginTop:2}}>செவ்வாய் ராசி: <span style={{fontWeight:600}}>{chevvaiDosham.marsRashi}</span></div>
                    <div style={{fontSize:10,color:"#555",marginTop:4}}>
                      {chevvaiDosham.fromLagna && <span style={{display:"inline-block",background:"#fff3e0",padding:"2px 6px",borderRadius:4,margin:"2px 4px 2px 0",border:"1px solid #ffe0b2"}}>லக்னத்திலிருந்து: வீடு {chevvaiDosham.marsHouseFromLagna}</span>}
                      {chevvaiDosham.fromMoon && <span style={{display:"inline-block",background:"#fff3e0",padding:"2px 6px",borderRadius:4,margin:"2px 4px 2px 0",border:"1px solid #ffe0b2"}}>சந்திரனிலிருந்து: வீடு {chevvaiDosham.marsHouseFromMoon}</span>}
                      {chevvaiDosham.fromVenus && <span style={{display:"inline-block",background:"#fff3e0",padding:"2px 6px",borderRadius:4,margin:"2px 4px 2px 0",border:"1px solid #ffe0b2"}}>சுக்கிரனிலிருந்து: வீடு {chevvaiDosham.marsHouseFromVenus}</span>}
                    </div>
                  </div>
                  {chevvaiDosham.cancelled && (
                    <div style={{padding:"8px 12px",background:"#e6f4ea",borderRadius:8,border:"1px solid #b7e1c7",marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#0d7a30"}}>✓ தோஷ நிவர்த்தி: {chevvaiDosham.cancelReason}</div>
                    </div>
                  )}
                  <div style={{padding:"10px 12px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#7b1c1c",marginBottom:6}}>பரிகாரம்</div>
                    <div style={{fontSize:10,color:"#333",lineHeight:1.6}}>செவ்வாய்க்கிழமை விரதம் • அங்காரக ஸ்தோத்திரம் • பவள மோதிரம் அணிதல் • செவ்வாய் தோஷ நிவர்த்தி பூஜை</div>
                  </div>
                </div>
              ) : (
                <div style={{padding:"10px 12px",background:"#e6f4ea",borderRadius:8,border:"1px solid #b7e1c7"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#0d7a30"}}>✓ செவ்வாய் தோஷம் இல்லை</div>
                  <div style={{fontSize:10,color:"#333",marginTop:4}}>செவ்வாய் 1, 2, 4, 7, 8, 12 ஆகிய வீடுகளில் இல்லை.</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ பாவ சக்கரம் ═══ */}
          {advancedView==="bhava" && bhavaChart && bhavaChart.cusps && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🏠 பாவ சக்கரம் (Bhava Chart — Equal House)
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>பாவம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>தொடக்கம்°</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>ராசி</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>அதிபதி</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகங்கள்</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bhavaChart.cusps.map((cusp,i) => {
                      const planetsInHouse = bhavaChart.planets ? bhavaChart.planets.filter(p => p.bhavaHouse === i+1).map(p => p.ta) : [];
                      return (
                        <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                          <td style={{padding:"6px 4px",color:"#1a1a1a",fontWeight:600}}>{i+1} — {["தனு","தனம்","சகஜ","சுக","புத்ர","ரிபு","காமம்","ஆயுள்","பாக்யம்","கர்மம்","லாபம்","விரயம்"][i]}</td>
                          <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600,fontFamily:"monospace"}}>{cusp.cuspDeg?.toFixed(1)}</td>
                          <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{cusp.rashiName}</td>
                          <td style={{padding:"6px 4px",textAlign:"center",color:"#b8860b",fontWeight:600,fontSize:10}}>{cusp.lord}</td>
                          <td style={{padding:"6px 4px",color:"#333",fontSize:10}}>{planetsInHouse.length>0?planetsInHouse.join(", "):"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {bhavaChart.planets && bhavaChart.planets.some(p => p.bhavaDiff) && (
                <div style={{marginTop:10,padding:"10px 12px",background:"#fff8e1",borderRadius:8,border:"1px solid #ffe082"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#7a5200",marginBottom:6}}>⚠ பாவ-ராசி வேறுபாடுகள்</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {bhavaChart.planets.filter(p=>p.bhavaDiff).map((p,i)=>(
                      <div key={i} style={{fontSize:9,padding:"3px 6px",borderRadius:4,background:"#fff3e0",color:"#7a5200",border:"1px solid #ffe0b2"}}>
                        {p.ta}: ராசி வீடு {p.house} → பாவ வீடு {p.bhavaHouse}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                Equal House System — லக்ன பாகையிலிருந்து சம அளவு (30°) பாவ விரிவு
              </div>
            </div>
          )}

          {/* ═══ நவாம்ச பல பகுப்பாய்வு ═══ */}
          {advancedView==="navamsastrength" && navamsaStrength && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                💎 நவாம்ச பல பகுப்பாய்வு (D9 Strength)
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>D9 ராசி</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>வர்கோத்தமா</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>நிலை</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>புஷ்கர</th>
                    </tr>
                  </thead>
                  <tbody>
                    {navamsaStrength.map((p,i) => (
                      <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                        <td style={{padding:"6px 4px",color:"#1a1a1a",fontWeight:600}}>{p.ta}</td>
                        <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{p.navRashiName}</td>
                        <td style={{padding:"6px 4px",textAlign:"center"}}>
                          {p.vargottama ? <span style={{color:"#0d7a30",fontWeight:700}}>✓ ஆம்</span> : <span style={{color:"#999"}}>—</span>}
                        </td>
                        <td style={{padding:"6px 4px",textAlign:"center",fontSize:10,color:p.d9StatusColor||"#666",fontWeight:700}}>
                          {p.d9Status}
                        </td>
                        <td style={{padding:"6px 4px",textAlign:"center"}}>
                          {p.pushkara ? <span style={{color:"#b8860b",fontWeight:700}}>✓</span> : <span style={{color:"#999"}}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
                {navamsaStrength.filter(p=>p.vargottama).map((p,i)=>(
                  <div key={i} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:"#e6f4ea",color:"#0d7a30",border:"1px solid #b7e1c7",fontWeight:600}}>
                    {p.ta} — வர்கோத்தமா
                  </div>
                ))}
              </div>
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                வர்கோத்தமா = ராசியிலும் நவாம்சத்திலும் ஒரே ராசி • புஷ்கர நவாம்சம் = சுபப் பலம் அதிகம்
              </div>
            </div>
          )}

          {/* ═══ ஷட்பலம் ═══ */}
          {advancedView==="shadbala" && shadBala && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                ⚖ ஷட்பலம் (Shadbala — 6 வகை பலம்)
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"left",fontSize:9}}>கிரகம்</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>ஸ்தான</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>திக்</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>கால</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>சேஷ்டா</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>நைசர்கிக</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>திரிக்</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>மொத்தம்</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>தேவை</th>
                      <th style={{padding:"5px 3px",color:"#b8860b",fontWeight:700,textAlign:"center",fontSize:9}}>நிலை</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shadBala.map((p,i) => (
                      <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                        <td style={{padding:"5px 3px",color:"#1a1a1a",fontWeight:600,fontSize:10}}>
                          {p.ta}
                          {p.yuddha && (
                            <span title={`${p.yuddha.result} — ${p.yuddha.opponent}-உடன் யுத்தம் (${p.yuddha.orb}°)`}
                              style={{marginLeft:3,fontSize:8,color:p.yuddha.result==="வெற்றி"?"#0d7a30":"#cc1a1a"}}>
                              ⚔{p.yuddha.result==="வெற்றி"?"✓":"✗"}
                            </span>
                          )}
                        </td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.sthanaBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.digBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.kalaBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.cheshtaBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.naisargikaBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#333",fontSize:9}}>{p.drikBala?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#7b1c1c",fontWeight:700,fontSize:10}}>{p.total?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center",color:"#b8860b",fontSize:9}}>{p.required?.toFixed(0)}</td>
                        <td style={{padding:"5px 3px",textAlign:"center"}}>
                          {p.total >= p.required ?
                            <span style={{color:"#0d7a30",fontWeight:700,fontSize:9}}>✓ பலம்</span> :
                            <span style={{color:"#cc1a1a",fontWeight:700,fontSize:9}}>✗ பலவீனம்</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:10}}>
                {shadBala.map((p,i)=>(
                  <div key={i} style={{position:"relative",width:60,height:50}}>
                    <div style={{fontSize:8,textAlign:"center",color:"#333",fontWeight:600,marginBottom:2}}>{p.ta}</div>
                    <div style={{height:30,background:"#f0f0f0",borderRadius:4,overflow:"hidden",border:"1px solid #e0e0e0"}}>
                      <div style={{height:"100%",width:`${Math.min((p.total/p.required)*100,100)}%`,
                        background:p.total>=p.required?"linear-gradient(90deg,#0d7a30,#2ea55f)":"linear-gradient(90deg,#cc1a1a,#e85050)",
                        borderRadius:4,transition:"width 0.3s"}}/>
                    </div>
                    <div style={{fontSize:7,textAlign:"center",color:"#666",marginTop:1}}>{((p.total/p.required)*100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                ஸ்தான=இருப்பிடம் • திக்=திசை • கால=நேரம் • சேஷ்டா=இயக்கம் • நைசர்கிக=இயற்கை • திரிக்=பார்வை
                {shadBala.some(p=>p.yuddha) && " • ⚔=கிரக யுத்தம் (Yuddha)"}
              </div>
            </div>
          )}

          {/* ═══ லக்னவாரி சுப-பாபர் / மாரக-பாதகர் ═══ */}
          {advancedView==="funcnature" && functionalNature && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                ⚖ லக்னவாரி சுப-பாபர் (Functional Nature) — BPHS Ch.34
              </div>
              <div style={{fontSize:10,color:"#666",marginBottom:8}}>
                {horoscope?.lagnaName} லக்னத்திற்கு — வீட்டு அதிபத்யத்தில் இருந்து நேரடியாகக் கணிக்கப்பட்டது.
                ஒரே கிரகம் ஒரு லக்னத்திற்கு நன்மையும், மற்றொன்றுக்கு தீமையும் தரும் — இதுவே தனிநபர் பலனின் அடிப்படை.
              </div>
              {Object.entries(functionalNature).map(([ta, fn], i) => (
                <div key={i} style={{padding:"7px 10px",marginBottom:5,borderRadius:6,
                  background:fn.nature==="யோககாரகன்"?"#e8f5e9":fn.nature==="சுபன்"?"#f1f8e9":fn.nature==="பாபன்"?"#fde8e8":"#f7f5ef",
                  border:`1px solid ${fn.nature==="யோககாரகன்"?"#a5d6a7":fn.nature==="சுபன்"?"#c5e1a5":fn.nature==="பாபன்"?"#f5c6c6":"#e6dcc9"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11.5,fontWeight:700,color:"#1a1a1a"}}>{ta}</span>
                    <span style={{fontSize:10.5,fontWeight:800,
                      color:fn.nature==="யோககாரகன்"?"#1b5e20":fn.nature==="சுபன்"?"#33691e":fn.nature==="பாபன்"?"#cc1a1a":"#8b6914"}}>
                      {fn.nature==="யோககாரகன்"?"👑 யோககாரகன்":fn.nature}
                    </span>
                  </div>
                  <div style={{fontSize:9.5,color:"#555",marginTop:2}}>{fn.reasons.join(" • ")}</div>
                </div>
              ))}
              {marakaBadhaka && (
                <div style={{marginTop:10,padding:"10px 12px",background:"#fff8e1",borderRadius:8,border:"1px solid #ffe082"}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:"#7b1c1c",marginBottom:4}}>☠ மாரகர் & பாதகாதிபதி</div>
                  <div style={{fontSize:10.5,color:"#333",lineHeight:1.7}}>
                    <b>மாரகாதிபதிகள் (2,7):</b> {marakaBadhaka.marakaLords.join(", ")}
                    {marakaBadhaka.occupants27.length > 0 && <span> • மாரக ஸ்தானத்தில்: {marakaBadhaka.occupants27.join(", ")}</span>}
                    {marakaBadhaka.associates.length > 0 && <span> • மாரக சேர்க்கை: {marakaBadhaka.associates.join(", ")}</span>}
                    <br/>
                    <b>பாதகாதிபதி:</b> {marakaBadhaka.badhakaLord} ({marakaBadhaka.lagnaType} → {marakaBadhaka.badhakaHouse}ஆம் வீடு பாதக ஸ்தானம்)
                    {marakaBadhaka.badhakaLordHouse && <span> — தற்போது {marakaBadhaka.badhakaLordHouse}ஆம் வீட்டில்</span>}
                  </div>
                  <div style={{fontSize:9,color:"#8b6914",marginTop:4}}>
                    மாரக/பாதக கிரகங்களின் தசா-புக்திகளில் ஆரோக்கியம், தடைகள் குறித்து கூடுதல் கவனம் தேவை — கீழே தசா பட்டியலுடன் ஒப்பிடவும்.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ வரிசை-நிபந்தனை பலன்கள் ═══ */}
          {advancedView==="sequence" && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                ⛓ வரிசை-நிபந்தனை பலன்கள் — "எது எதற்குப் பின்?"
              </div>
              <div style={{fontSize:10,color:"#666",marginBottom:8,lineHeight:1.6}}>
                Classical சம்பந்த விதி: இரு வீடுகளின் அதிபதிகள் இணைந்தால் (சேர்க்கை/பரிவர்த்தனை/அமர்வு/பார்வை)
                அவ்விரு வாழ்க்கைப் பகுதிகளும் பிணைந்தவை — முந்தையது நிகழ்ந்த பின் பிந்தையது மலரும்.
              </div>
              {(!sequenceLinks || sequenceLinks.length === 0) ? (
                <div style={{padding:"12px",textAlign:"center",fontSize:11,color:"#8b6914",background:"#faf6e8",borderRadius:8}}>
                  இந்த ஜாதகத்தில் குறிப்பிடத்தக்க வரிசை-இணைப்புகள் இல்லை — ஒவ்வொரு பகுதியும் தன் தசையில் தனித்தே பலன் தரும்
                </div>
              ) : sequenceLinks.map((lk, i) => (
                <div key={i} style={{marginBottom:8,padding:"9px 11px",borderRadius:8,
                  background:lk.strength>=3?"#f1f8e9":lk.strength>=2?"#faf9f0":"#faf9f5",
                  border:`1.5px solid ${lk.strength>=3?"#7cb342":lk.strength>=2?"#d4a853":"#e6dcc9"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:700,color:"#1a1a1a"}}>{lk.icon} {lk.afterTa}</span>
                    <span style={{fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:10,
                      background:lk.strength>=3?"#dcfce7":lk.strength>=2?"#fef9c3":"#f5f0e0",
                      color:lk.strength>=3?"#1b5e20":"#7a5200"}}>{lk.strengthTa}</span>
                  </div>
                  <div style={{fontSize:11,color:"#333",lineHeight:1.6,marginBottom:3}}>{lk.text}</div>
                  <div style={{fontSize:9.5,color:"#7b1c1c",lineHeight:1.5}}>📐 {lk.how}</div>
                  {lk.dashaNote && (
                    <div style={{fontSize:9.5,color:"#0d7a30",fontWeight:600,marginTop:2}}>⏳ {lk.dashaNote}</div>
                  )}
                </div>
              ))}
              <div style={{fontSize:9,color:"#777",marginTop:6,lineHeight:1.5}}>
                வலிமை: பரிவர்த்தனை/இரட்டை ஆட்சி &gt; சேர்க்கை &gt; அமர்வு &gt; பரஸ்பர பார்வை &gt; ஒருவழிப் பார்வை.
                தசா குறிப்பு = நடப்பு/அடுத்த 3 மகா தசைகளில் இணைப்பு-அதிபதியின் தசை.
              </div>
            </div>
          )}

          {/* ═══ வாழ்க்கை நிகழ்வு காலக்கணிப்பு ═══ */}
          {advancedView==="eventtiming" && (
            <div id="jn-eventtiming" style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🎯 வாழ்க்கை நிகழ்வு காலக்கணிப்பு — "எப்போது?"
              </div>
              {/* Topic chips */}
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                {Object.entries(EVENT_TOPICS).map(([key,t])=>(
                  <button key={key} onClick={()=>{ setEventTopic(key); if(!eventTiming[key]) runEventTiming(key); }}
                    style={{padding:"5px 10px",borderRadius:16,fontSize:10.5,fontWeight:600,cursor:"pointer",
                      border:`1.5px solid ${eventTopic===key?"#7b1c1c":"#d4a853"}`,
                      background:eventTopic===key?"#7b1c1c":"#fffdf5",
                      color:eventTopic===key?"#fffdf5":"#7b1c1c"}}>
                    {t.icon} {t.ta}
                  </button>
                ))}
              </div>
              {(() => {
                const et = eventTiming[eventTopic];
                if (!et) return (
                  <div style={{padding:"14px",textAlign:"center",fontSize:11,color:"#8b6914",background:"#faf6e8",borderRadius:8}}>
                    மேலே ஒரு கேள்வியைத் தேர்ந்தெடுக்கவும் — தசா × கோசாரம் × வாக்குறுதி மூன்றையும் இணைத்து கணிக்கப்படும்
                  </div>
                );
                const isCaution = EVENT_TOPICS[eventTopic]?.mood === "caution";
                return (
                  <div>
                    {/* 1. வாக்குறுதி — caution topic-இல் இது "பாதிப்பு-சாத்திய அளவு" */}
                    <div style={{marginBottom:10,padding:"10px 12px",borderRadius:8,
                      background:et.promise>=65?"#f1f8e9":et.promise<45?"#fdf0f0":"#fff8e1",
                      border:`1px solid ${et.promise>=65?"#c5e1a5":et.promise<45?"#f0c8c8":"#ffe082"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:"#333"}}>{et.icon} {isCaution ? "6/8/12 பாவ செயல்பாட்டு அளவு (நோய்-சாத்தியம்)" : "ஜாதக வாக்குறுதி (Promise)"}</span>
                        <span style={{fontSize:12,fontWeight:800,color:et.promise>=65?"#1b5e20":et.promise<45?"#cc1a1a":"#7a5200"}}>{et.promise}%{isCaution ? "" : ` — ${et.promiseVerdict}`}</span>
                      </div>
                      <div style={{height:8,background:"#eee",borderRadius:4,overflow:"hidden",marginBottom:6}}>
                        <div style={{width:`${et.promise}%`,height:"100%",borderRadius:4,
                          background:et.promise>=65?"linear-gradient(90deg,#66bb6a,#2e7d32)":et.promise<45?"linear-gradient(90deg,#ef9a9a,#c62828)":"linear-gradient(90deg,#ffe082,#f9a825)"}}/>
                      </div>
                      {et.pReasons.map((r,i)=>(
                        <div key={i} style={{fontSize:9.5,lineHeight:1.6,color:r.startsWith("+")?"#2e7d32":"#a03a00"}}>{r}</div>
                      ))}
                    </div>
                    {/* 2. தேதி-வரம்புகள் — caution topic-இல் இவை எச்சரிக்கைக் காலங்கள்! */}
                    <div style={{fontSize:11.5,fontWeight:700,color:isCaution?"#cc1a1a":"#7b1c1c",marginBottom:6}}>
                      {isCaution ? "⚠ கூடுதல் கவனம் தேவை காலக்கட்டங்கள் (6/8/12 தசா × கோசாரம்)" : "📅 சாதகமான காலக்கட்டங்கள் (தசா × கோசாரம்)"}
                    </div>
                    {isCaution && (
                      <div style={{fontSize:9.5,color:"#8b4500",background:"#fff8ee",border:"1px dashed #d4a85360",borderRadius:6,padding:"5px 8px",marginBottom:6,lineHeight:1.5}}>
                        இக்காலங்களில் உணவு/ஓய்வு/மருத்துவ பரிசோதனையில் கூடுதல் கவனம்; இவற்றுக்கு <b>இடைப்பட்ட காலங்களே</b> சிகிச்சை/அறுவை/மீட்சிக்கு சாதகமானவை.
                      </div>
                    )}
                    {et.windows.length === 0 && (
                      <div style={{fontSize:10.5,color:"#8b6914",padding:"8px"}}>{isCaution ? "அடுத்த 12 ஆண்டுகளில் 6/8/12 வலு-activation இல்லை — ஆரோக்கியத்திற்கு நல்ல அறிகுறி" : "அடுத்த 12 ஆண்டுகளில் வலுவான தசா activation இல்லை — நீண்ட கால தசா பட்டியலைப் பார்க்கவும்"}</div>
                    )}
                    {et.windows.map((w,i)=>(
                      <div key={i} style={{marginBottom:8,padding:"8px 10px",borderRadius:8,
                        background:i===0?(isCaution?"#fdf0f0":"#f1f8e9"):"#faf9f5",
                        border:`1.5px solid ${i===0?(isCaution?"#e57373":"#7cb342"):"#e6dcc9"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                          <span style={{fontSize:11.5,fontWeight:700,color:"#1a1a1a"}}>
                            {i===0 && (isCaution?"⚠ ":"⭐ ")}{w.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short'})} — {w.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short'})}
                          </span>
                          <span style={{fontSize:9.5,fontWeight:800,padding:"2px 8px",borderRadius:10,
                            background:isCaution
                              ? (w.confidence==="உயர்"?"#fee2e2":w.confidence==="நடுத்தரம்"?"#fef9c3":"#f0f0e8")
                              : (w.confidence==="உயர்"?"#dcfce7":w.confidence==="நடுத்தரம்"?"#fef9c3":"#fee2e2"),
                            color:isCaution
                              ? (w.confidence==="உயர்"?"#cc1a1a":w.confidence==="நடுத்தரம்"?"#7a5200":"#666")
                              : (w.confidence==="உயர்"?"#1b5e20":w.confidence==="நடுத்தரம்"?"#7a5200":"#cc1a1a")}}>
                            {isCaution?"தீவிரம்":"நம்பிக்கை"}: {w.confidence}
                          </span>
                        </div>
                        <div style={{fontSize:10,color:"#7b1c1c",fontWeight:600,marginBottom:2}}>{w.md} தசை / {w.ad} புக்தி</div>
                        {w.reasons.map((r,ri)=>(
                          <div key={ri} style={{fontSize:9.5,color:"#555",lineHeight:1.6}}>• {r}</div>
                        ))}
                        {/* பிரத்யந்தர நுண்-windows — புக்திக்குள் மிகச் சாதகமான குறுகிய காலம் */}
                        {w.subWindows && w.subWindows.length > 0 && (
                          <div style={{marginTop:5,padding:"6px 8px",background:"#fffdf5",borderRadius:6,border:"1px dashed #b8860b60"}}>
                            <div style={{fontSize:9.5,fontWeight:700,color:"#8b4500",marginBottom:2}}>🎯 நுண்-காலம் (பிரத்யந்தர தசை):</div>
                            {w.subWindows.map((s,si)=>(
                              <div key={si} style={{fontSize:9.5,color:"#4a3a20",lineHeight:1.7}}>
                                {(s.gochara || s.guruFav) ? "★ " : "• "}{s.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})} → {s.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})}
                                {" "}<b style={{color:"#7b1c1c"}}>{s.name}</b> ({s.why}){s.gochara && <span style={{color:"#0d7a30"}}> + கோசார ஆதரவு</span>}{s.guruFav && <span style={{color:"#0d7a30"}}> + குரு பெயர்ச்சி சுபம்</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* கோசார ஆதரவு மாத-வீச்சுகள் */}
                        {w.transitRanges && w.transitRanges.length > 0 && (
                          <div style={{fontSize:9,color:"#0d7a30",marginTop:3}}>
                            🪐 கோசார ஆதரவு: {w.transitRanges.map(r =>
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
                        <div style={{marginTop:8,padding:"8px 10px",background:"#faf6e8",borderRadius:8,border:"1px solid #e6dcc9"}}>
                          <div style={{fontSize:10.5,fontWeight:700,color:"#7b1c1c",marginBottom:4}}>⛓ இக்கேள்வியுடன் பிணைந்த நிபந்தனைகள்</div>
                          {rel.map((lk,li)=>(
                            <div key={li} style={{fontSize:9.5,color:"#4a3a20",lineHeight:1.6,marginBottom:3}}>
                              {lk.icon} {lk.text} <span style={{color:"#7b1c1c"}}>({lk.how})</span>
                              {lk.dashaNote && <span style={{color:"#0d7a30",fontWeight:600}}> — {lk.dashaNote}</span>}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <div style={{fontSize:9,color:"#777",marginTop:6,lineHeight:1.5}}>
                      முறை: ஜாதக வாக்குறுதி (அதிபதி ஷட்பலம் + சூழல் + D9 + காரகர்) → தசா-புக்தி activation (எடை-கூட்டல்) →
                      குரு+சனி இரட்டை transit சரிபார்ப்பு. வாக்குறுதி பலவீனமாக இருந்தால் காலம் மட்டும் போதாது — பரிகாரம்/பொருத்தம் இணைக்கவும்.
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ நட்சத்திர-பாவக இணைப்பு — நட்சத்திராதிபதி வழி பாவத் தொடர்பு,
               பார்வைப் பலன், கோசார காலக்கட்டம், பரிகாரம் ═══ */}
          {advancedView==="nakbhava" && nakBhavaData==="loading" && (
            <div style={{...card,marginBottom:10,padding:"20px 14px",textAlign:"center",color:"#8b6914",fontSize:12}}>
              ⭐ நட்சத்திர-பாவக இணைப்பு கணிக்கப்படுகிறது…
            </div>
          )}
          {advancedView==="nakbhava" && nakBhavaData && nakBhavaData!=="loading" && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:4,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                ⭐ நட்சத்திர-பாவக இணைப்பு — கிரகன் யாருடைய நட்சத்திரத்தில்? எந்தப் பாவப் பலன்? எப்போது?
              </div>
              <div style={{fontSize:9.5,color:"#8b6914",marginBottom:10,lineHeight:1.6}}>
                விதி: கிரகன் அமர்ந்த நட்சத்திரத்தின் அதிபதி எந்தப் பாவங்களை ஆள்கிறாரோ/அமர்ந்துள்ளாரோ — அந்தப் பாவப்
                பலன்களையும் அக்கிரகன் இணைத்துத் தருவான் (classical/KP). அதன் மீதான பார்வைகள் சுப/அசுபத்தை மாற்றும்;
                குரு/சனி கோசாரம் அந்த ராசிகளைத் தொடும்போதே பலன் வெளிப்படும்.
              </div>
              {nakBhavaData.houses.map((hs,hi)=>(
                <div key={hi} style={{marginBottom:hs.isEmpty?6:10,padding:hs.isEmpty?"6px 10px":"10px 12px",borderRadius:8,
                  background:hs.isEmpty?"#faf9f5":"#fffdf7",border:`1px solid ${hs.isEmpty?"#eee5d5":"#e6dcc9"}`}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:"#7b1c1c"}}>
                    {hs.houseNum}ஆம் வீடு ({hs.houseRashi}) — {hs.theme}
                  </div>
                  {hs.isEmpty ? (
                    <div style={{fontSize:9.5,color:"#888",marginTop:2}}>{hs.note}</div>
                  ) : hs.occupants.map((oc,oi)=>(
                    <div key={oi} style={{marginTop:8,paddingTop:8,borderTop:oi>0?"1px dashed #e6dcc9":"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                        <span style={{fontSize:11.5,fontWeight:700}}>{oc.symbol} {oc.ta}
                          {oc.star && <span style={{fontSize:9.5,color:"#8b6914",fontWeight:500}}> — {oc.star.nak}{oc.star.pada?`-${oc.star.pada}`:""} (அதிபதி: {oc.star.starLord})</span>}
                        </span>
                        <span style={{fontSize:9.5,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:oc.verdict.startsWith("சுபம்")?"#dcfce7":oc.verdict.startsWith("அசுபம்")?"#fee2e2":"#fef9c3",
                          color:oc.verdict.startsWith("சுபம்")?"#1b5e20":oc.verdict.startsWith("அசுபம்")?"#cc1a1a":"#7a5200"}}>{oc.verdict}</span>
                      </div>
                      {/* 1. நட்சத்திராதிபதி வழி பாவகத் தொடர்பு + செயல்திறன் + KP + பாவ நிலை */}
                      {oc.star && (
                        <div style={{fontSize:9.5,lineHeight:1.65,color:"#4a3a20",background:"#faf6e8",border:"1px solid #eee0c5",borderRadius:6,padding:"6px 8px",marginBottom:5}}>
                          🔗 {oc.star.text}
                          {(oc.linkPower?.self != null || oc.linkPower?.star != null) && (
                            <div style={{marginTop:3,fontSize:9,color:"#6b5a13",fontWeight:600}}>
                              ⚡ செயல்திறன் (ஒருங்கிணைந்த பலம்): {oc.ta} {oc.linkPower.self != null ? `${oc.linkPower.self}/100` : "—"}
                              {oc.linkPower.star != null && <> • நட்சத்திராதிபதி {oc.star.starLord} {oc.linkPower.star}/100 — இணைப்பு இந்த அளவிலேயே செயல்படும்</>}
                            </div>
                          )}
                          {oc.kp && (
                            <div style={{marginTop:3,fontSize:9,color:oc.kp.nature==="சுபன்"||oc.kp.nature==="யோககாரகன்"?"#1b5e20":oc.kp.nature==="பாபன்"?"#a03a00":"#6b5a13",fontWeight:600}}>
                              🎯 {oc.kp.text}
                            </div>
                          )}
                          {oc.bhavaPos && (
                            <div style={{marginTop:3,fontSize:9,color:oc.bhavaPos.sandhi?"#a03a00":"#33691e",fontWeight:600}}>
                              🏠 {oc.bhavaPos.text}
                            </div>
                          )}
                        </div>
                      )}
                      {/* 2. பார்வைகள் — ஸ்புட திருஷ்டி அளவுடன் (BPHS விருபா) */}
                      {oc.aspects.length > 0 ? oc.aspects.map((a,ai)=>(
                        <div key={ai} style={{fontSize:9.5,lineHeight:1.6,
                          color:a.tone==="சுபம்"?"#2e7d32":a.tone==="அசுபம்"?"#a03a00":"#6b5a13"}}>
                          👁 <b>{a.from}</b> ({a.nature}{a.isSpecial?", சிறப்புப் பார்வை":""})
                          {a.virupa != null && <b style={{fontSize:8.5}}> [{a.virupa}/60 — {a.grade} பார்வை]</b>} — {a.text}
                        </div>
                      )) : (
                        <div style={{fontSize:9.5,color:"#999"}}>👁 இக்கிரகத்தின் மீது எந்தப் பார்வையும் இல்லை — தன் இயல்பிலேயே பலன் தரும்</div>
                      )}
                      {/* 3. கோசாரம் — நாள்-அளவு windows + தசை இணைவு + வேதை + BAV/கக்ஷ்யா */}
                      {(oc.jupWindows.length > 0 || oc.satWindows.length > 0) && (
                        <div style={{marginTop:5,padding:"6px 8px",background:"#f0f6ec",border:"1px solid #d8e6cf",borderRadius:6}}>
                          <div style={{fontSize:9.5,fontWeight:700,color:"#33691e",marginBottom:2}}>📅 கோசாரத்தில் பலன் வெளிப்படும் காலங்கள் (நாள்-அளவு துல்லியம், அடுத்த 12 ஆண்டு)</div>
                          {[...oc.jupWindows.map(w=>({...w,sym:"♃",col:"#2e7d32"})), ...oc.satWindows.map(w=>({...w,sym:"♄",col:"#7a5200"}))].map((w,wi)=>(
                            <div key={wi} style={{marginBottom:5,paddingBottom:4,borderBottom:"1px dashed #d8e6cf"}}>
                              <div style={{fontSize:9,lineHeight:1.6,color:w.col}}>{w.sym} <b>{w.label}</b> — {w.text}</div>
                              {w.dasha && (
                                <div style={{fontSize:8.5,lineHeight:1.6,color:w.dasha.conf==="மிக உயர்"||w.dasha.conf==="உயர்"?"#1b5e20":w.dasha.conf==="குறை"?"#a03a00":"#7a5200"}}>
                                  ⏳ தசை-இணைவு <b>[{w.dasha.conf}]</b>: {w.dasha.text}
                                </div>
                              )}
                              {w.vedha && (
                                <div style={{fontSize:8.5,lineHeight:1.6,color:w.vedha.vedha?"#a03a00":w.vedha.fav?"#1b5e20":"#777"}}>
                                  🛡 வேதை: {w.vedha.text}
                                </div>
                              )}
                              {w.bav && (
                                <div style={{fontSize:8.5,lineHeight:1.6,color:"#5a4a20"}}>
                                  🔢 {w.bav.text}
                                </div>
                              )}
                              {w.triggers && w.triggers.length > 0 && (
                                <div style={{fontSize:8.5,lineHeight:1.6,color:"#7b1c1c",fontWeight:600}}>
                                  ⚡ Trigger நாட்கள் (வேக கிரகம் ஜென்ம ஸ்புடம் தொடும்): {w.triggers.map((tg,tgi)=>(
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
                        <div style={{marginTop:5,padding:"6px 8px",background:"#eef0fa",border:"1px solid #c5cae9",borderRadius:6}}>
                          <div style={{fontSize:9.5,fontWeight:700,color:"#303f9f",marginBottom:2}}>🎯 கூர்மையான தொடுகைகள் — நட்சத்திரம் & ஜென்ம ஸ்புட (±1°) அளவில்</div>
                          {oc.touches.map((tc,ti)=>(
                            <div key={ti} style={{fontSize:8.5,lineHeight:1.65,color:tc.type==="டிகிரி"?"#7b1c1c":"#303f9f",marginBottom:2}}>
                              {tc.type==="டிகிரி"?"🔥":"⭐"} <b>{tc.label}</b> — {tc.text}
                              {tc.swissNote && <b style={{color:"#00695c"}}> [{tc.swissNote}]</b>}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 4. பரிகாரம் — யாருக்கு, எதற்காக, என்ன செய்ய */}
                      {oc.remedies.length > 0 ? (
                        <div style={{marginTop:5,padding:"6px 8px",background:"#fdf3f0",border:"1px solid #f0d5c8",borderRadius:6}}>
                          <div style={{fontSize:9.5,fontWeight:700,color:"#a03a00",marginBottom:2}}>🙏 பரிகாரம்</div>
                          {oc.remedies.map((r,ri)=>(
                            <div key={ri} style={{marginBottom:5,paddingBottom:4,borderBottom:ri<oc.remedies.length-1?"1px dashed #f0d5c8":"none"}}>
                              <div style={{fontSize:9.5,fontWeight:700,color:"#7b1c1c"}}>{r.planet} கிரக பரிகாரம்</div>
                              <div style={{fontSize:8.5,color:"#8a5a30",lineHeight:1.6,fontStyle:"italic"}}>எதற்காக: {r.why}</div>
                              <div style={{fontSize:9,lineHeight:1.7,color:"#5a3a20"}}>
                                📿 மந்திரம்: {r.mantra} — {r.count}<br/>
                                🛕 கோயில்: {r.temple}<br/>
                                🎁 {r.day} அன்று {r.donate} தானம் • 💎 ரத்தினம்: {r.gem}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{marginTop:5,fontSize:9,color:"#33691e",background:"#f0f6ec",border:"1px solid #d8e6cf",borderRadius:6,padding:"4px 8px"}}>
                          🙏 பரிகாரம் தேவையில்லை — இக்கிரகத்தின் இணைப்பும் பார்வைகளும் சுபமாக உள்ளன
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              <div style={{fontSize:9,color:"#777",marginTop:6,lineHeight:1.5}}>
                முறை: நட்சத்திராதிபதி விதி (BPHS/KP) → லக்னவாரி சுப-அசுபம் → Parashari பார்வை → குரு/சனி transit
                (கிரக ராசி + நட்சத்திராதிபதி ராசி மீது சேர்க்கை/சிறப்புப் பார்வை, மாத அளவு துல்லியம்).
                கோசாரக் காலங்கள் பலன் "வெளிப்படும்" நேரம்; பலனின் அளவு ஜாதக வாக்குறுதியையே சார்ந்தது.
              </div>
            </div>
          )}

          {/* ═══ பின்நோக்கு சரிபார்ப்பு — உண்மை நிகழ்வுகளுடன் engine accuracy ═══ */}
          {advancedView==="backtest" && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:4,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🧪 பின்நோக்கு சரிபார்ப்பு — Engine துல்லியத்தை நிரூபிக்கும் கருவி
              </div>
              <div style={{fontSize:9.5,color:"#8b6914",marginBottom:10,lineHeight:1.6}}>
                வாழ்க்கையில் <b>ஏற்கனவே நடந்த</b> நிகழ்வின் தேதியை உள்ளிடுங்கள் (எ.கா. திருமண நாள்) —
                அன்று ஓடிய தசை-புக்தி + அன்றைய குரு/சனி கோசாரத்தை engine-ன் அதே விதிகளால் மதிப்பிட்டு,
                "இந்நாளை முன்கூட்டியே அடையாளம் காட்டியிருக்குமா" என்று நேர்மையாகச் சொல்லும்.
                பொருந்தினால் விதிகள் சரி; பொருந்தாவிட்டால் அதுவே மேம்பாட்டுத் தரவு.
              </div>
              {/* கேள்வி தேர்வு */}
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                {Object.entries(EVENT_TOPICS).map(([k,v])=>(
                  <button key={k} onClick={()=>setBtTopic(k)} style={{
                    padding:"6px 10px",borderRadius:14,fontSize:10.5,fontWeight:600,cursor:"pointer",
                    border:`1.5px solid ${btTopic===k?"#7b1c1c":"#e6dcc9"}`,
                    background:btTopic===k?"#7b1c1c":"#faf9f5",color:btTopic===k?"#fffdf5":"#555"
                  }}>{v.icon} {v.ta}</button>
                ))}
              </div>
              {/* தேதி + சரிபார் */}
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                <input type="text" inputMode="numeric" maxLength={10} placeholder="நிகழ்வு தேதி DD.MM.YYYY"
                  value={btDateStr}
                  onChange={e=>setBtDateStr(formatDateInput(e.target.value))}
                  style={{flex:1,padding:"10px 12px",background:"#f5f0e0",border:"1.5px solid #d4a85330",borderRadius:10,fontSize:13,letterSpacing:1,fontFamily:"monospace",outline:"none"}}/>
                <button onClick={runBacktest} disabled={!isValidDDMMYYYY(btDateStr)} style={{
                  padding:"10px 16px",borderRadius:10,border:"none",cursor:isValidDDMMYYYY(btDateStr)?"pointer":"not-allowed",
                  background:isValidDDMMYYYY(btDateStr)?"linear-gradient(135deg,#7b1c1c,#9b2c2c)":"#ddd",
                  color:"#fffdf5",fontSize:12,fontWeight:700}}>சரிபார் →</button>
              </div>
              {/* முடிவு */}
              {btResult && (
                <div style={{marginBottom:10,padding:"10px 12px",borderRadius:8,
                  background:btResult.hit==="உயர்"?"#f1f8e9":btResult.hit==="குறை"?"#fdf0f0":"#fef9e7",
                  border:`1.5px solid ${btResult.hit==="உயர்"?"#7cb342":btResult.hit==="குறை"?"#f0c8c8":"#e6cf7a"}`}}>
                  <div style={{fontSize:11.5,fontWeight:800,marginBottom:3,
                    color:btResult.hit==="உயர்"?"#1b5e20":btResult.hit==="குறை"?"#cc1a1a":"#8a6d00"}}>
                    {btResult.verdict}
                  </div>
                  <div style={{fontSize:10,color:"#555",marginBottom:4}}>
                    {btResult.icon} {btResult.topic} • {btDateStr} • {btResult.md} தசை / {btResult.ad} புக்தி • மதிப்பெண்: <b>{btResult.score}</b> ({btResult.hit})
                    <span style={{color:"#888"}}> — தசைப் பங்கு {btResult.dScore} + transit பங்கு {btResult.tScore}</span>
                  </div>
                  {/* நிகழ்வு விழுந்த காலவீச்சுகள் — from → to */}
                  {btResult.windows && (
                    <div style={{marginBottom:6,padding:"7px 10px",background:"#fffdf5",borderRadius:8,border:"1px dashed #b8860b60"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#8b4500",marginBottom:3}}>📅 நிகழ்வு விழுந்த காலவீச்சுகள்:</div>
                      {btResult.windows.md && (
                        <div style={{fontSize:9.5,color:"#4a3a20",lineHeight:1.7}}>
                          • மகா தசை: <b style={{color:"#7b1c1c"}}>{btResult.windows.md.name}</b>{" "}
                          {btResult.windows.md.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})} → {btResult.windows.md.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})}
                        </div>
                      )}
                      {btResult.windows.ad && (
                        <div style={{fontSize:9.5,color:"#4a3a20",lineHeight:1.7}}>
                          • புக்தி: <b style={{color:"#7b1c1c"}}>{btResult.windows.ad.name}</b>{" "}
                          {btResult.windows.ad.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})} → {btResult.windows.ad.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})}
                        </div>
                      )}
                      {btResult.windows.pad && (
                        <div style={{fontSize:9.5,color:"#4a3a20",lineHeight:1.7}}>
                          {btResult.windows.pad.weighted ? "★" : "•"} பிரத்யந்தரம் (நுண்-காலம்): <b style={{color:"#7b1c1c"}}>{btResult.windows.pad.name}</b>{" "}
                          {btResult.windows.pad.start.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})} → {btResult.windows.pad.end.toLocaleDateString('ta-IN',{year:'numeric',month:'short',day:'numeric'})}
                          {btResult.windows.pad.weighted && <span style={{color:"#0d7a30"}}> — இக்கேள்வியுடன் தொடர்புள்ள நுண்-window ✓</span>}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Percentile — அறிவியல் ஒப்பீடு: நிகழ்வு நாள் vs வாழ்நாள் சீரிடை நாட்கள் */}
                  {btResult.percentile && (
                    <div style={{fontSize:10,fontWeight:700,marginBottom:4,padding:"5px 8px",borderRadius:6,
                      background:btResult.percentile.topPct<=10?"#dcfce7":btResult.percentile.topPct<=30?"#fef9c3":"#fee2e2",
                      color:btResult.percentile.topPct<=10?"#1b5e20":btResult.percentile.topPct<=30?"#7a5200":"#cc1a1a"}}>
                      📊 அறிவியல் ஒப்பீடு: இந்நாளின் activation, வாழ்நாளின் {btResult.percentile.n} சீரிடை நாட்களுடன் ஒப்பிட்டதில் <b>top {btResult.percentile.topPct}%</b>
                      <span style={{fontWeight:400}}> (சராசரி நாள் score {btResult.percentile.median}, அதிகபட்சம் {btResult.percentile.max} — உங்கள் நாள் {btResult.score})</span>
                    </div>
                  )}
                  {/* ஜாதக வாக்குறுதி சூழல் */}
                  <div style={{fontSize:9.5,color:"#6b5a13",marginBottom:4}}>
                    🔮 இக்கேள்விக்கான ஜாதக வாக்குறுதி: <b>{btResult.promise}/100</b> ({btResult.promiseVerdict})
                  </div>
                  {btResult.discNote && (
                    <div style={{fontSize:9,color:"#7a5200",fontWeight:600,marginBottom:4,padding:"4px 8px",background:"#fef9e7",borderRadius:6,border:"1px dashed #e6cf7a"}}>
                      ⚖ {btResult.discNote}
                    </div>
                  )}
                  {btResult.promiseNote && (
                    <div style={{fontSize:9,color:"#8a5a30",fontStyle:"italic",marginBottom:4}}>{btResult.promiseNote}</div>
                  )}
                  {btResult.reasons.map((r,ri)=>(
                    <div key={ri} style={{fontSize:9.5,lineHeight:1.65,color:"#4a3a20"}}>• {r}</div>
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
                  <div style={{padding:"8px 10px",background:"#f0e8d0",borderRadius:8,marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>
                      📊 மொத்த துல்லியம்: {backtests.length} நிகழ்வுகளில் {matched} பொருத்தம் — <span style={{color:pct>=70?"#1b5e20":pct>=50?"#8a6d00":"#cc1a1a"}}>{pct}%</span>
                      {avgTop!=null && <span style={{fontWeight:600,color:"#5a4a20"}}> • சராசரி percentile: top {avgTop}%</span>}
                    </div>
                    {misses.length > 0 && (
                      <div style={{fontSize:9,color:"#a03a00",marginTop:2}}>
                        🔍 தவறு-பகுப்பாய்வு: {misses.length} miss-இல் — தசை-தொடர்பின்மை {dashaMiss}, transit-இன்மை {transitMiss} (எந்த விதியை மேம்படுத்த வேண்டும் என்பதன் நேரடி feedback)
                      </div>
                    )}
                    <div style={{fontSize:8.5,color:"#8b6914",marginTop:2}}>பல ஜாதகங்களில் பல நிகழ்வுகளை சோதிக்க சோதிக்க இந்த அளவீடு நம்பகமாகும் — இதுவே உலகத்தர சான்று</div>
                  </div>
                );
              })()}
              {/* வரலாறு */}
              {backtests.map(b=>(
                <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,
                  padding:"5px 8px",marginBottom:4,borderRadius:6,background:"#faf9f5",border:"1px solid #eee5d5"}}>
                  <span style={{fontSize:9.5,color:"#555"}}>{b.icon} {b.topic} • {b.dateStr} • {b.chart}</span>
                  <span style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    <b style={{fontSize:9.5,color:b.hit==="உயர்"?"#1b5e20":b.hit==="குறை"?"#cc1a1a":"#8a6d00"}}>{b.score} • {b.hit}</b>
                    <button onClick={()=>setBacktests(prev=>{const next=prev.filter(x=>x.id!==b.id);persistBacktests(next);return next;})}
                      style={{background:"none",border:"none",color:"#cc1a1a",fontSize:10,cursor:"pointer",padding:0}}>🗑</button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ═══ ஒருங்கிணைந்த கிரக பலம் — எல்லா பல-engine-களின் இணைப்பு மையம் ═══ */}
          {advancedView==="unified" && unifiedStrength && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:4,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🧩 ஒருங்கிணைந்த கிரக பலம் — 5 அளவுகோல்கள் ஒரே முடிவாக
              </div>
              <div style={{fontSize:9.5,color:"#8b6914",marginBottom:10,lineHeight:1.6}}>
                கிரக பலம் (30%) + ஷட்பலம் (25%) + விம்ஷோபகம் (15%) + நவாம்சம் D9 (15%) + அவஸ்தை (15%) —
                ஒவ்வொரு engine-ன் தனி மதிப்பும் கீழே அப்படியே உள்ளது; composite எப்படி வந்தது என்பது முழு வெளிப்படை.
                பாவ பலன், ஆழ்பகுப்பாய்வு, பரிகார முன்னுரிமை அனைத்தும் இதே மதிப்பையே பயன்படுத்துகின்றன.
              </div>
              {unifiedStrength.map((u,i)=>(
                <div key={i} style={{marginBottom:8,padding:"8px 10px",borderRadius:8,
                  background:u.composite>=60?"#f1f8e9":u.composite<45?"#fdf0f0":"#faf9f5",
                  border:`1px solid ${u.composite>=60?"#c5e1a5":u.composite<45?"#f0c8c8":"#e6dcc9"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:11.5,fontWeight:700}}>{u.symbol} {u.ta} — {u.rashi}, {u.house}ஆம் வீடு</span>
                    <span style={{fontSize:10.5,fontWeight:800,color:u.tierColor}}>{u.composite}/100 • {u.tier}</span>
                  </div>
                  {/* Composite bar */}
                  <div style={{height:6,background:"#eee",borderRadius:3,marginBottom:5,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${u.composite}%`,background:u.tierColor,borderRadius:3}}/>
                  </div>
                  {u.reasons.map((r,ri)=>(
                    <div key={ri} style={{fontSize:9.5,color:"#555",lineHeight:1.6}}>• {r}</div>
                  ))}
                  {u.flags.length > 0 && (
                    <div style={{marginTop:4,display:"flex",gap:4,flexWrap:"wrap"}}>
                      {u.flags.map((f,fi)=>(
                        <span key={fi} style={{fontSize:8.5,fontWeight:700,padding:"2px 7px",borderRadius:8,
                          background:["யோககாரகன்","சுபன்"].includes(f)?"#dcfce7":["பாபன்","மாரகாதிபதி","பாதகாதிபதி","அஸ்தங்கம்"].includes(f)?"#fee2e2":"#fef9c3",
                          color:["யோககாரகன்","சுபன்"].includes(f)?"#1b5e20":["பாபன்","மாரகாதிபதி","பாதகாதிபதி","அஸ்தங்கம்"].includes(f)?"#cc1a1a":"#7a5200"}}>{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div style={{fontSize:9,color:"#777",marginTop:6,lineHeight:1.5}}>
                குறிப்பு: இயல்பு tags (யோககாரகன்/பாபன்/மாரக/பாதக) மதிப்பெண்ணை மாற்றா — பலன் எந்தத் திசையில்
                விளையும் என்பதைக் காட்டும். பலமான பாபன் தீமையை உறுதியாகவும், பலவீன சுபன் நன்மையை தாமதமாகவும் தருவர்.
              </div>
            </div>
          )}

          {/* ═══ கிரக சூழல் — inter-planet influence chain ═══ */}
          {advancedView==="planetcontext" && planetContext && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🔗 கிரக சூழல் — ஒரு கிரகத்தின் பலனை மற்ற கிரகங்கள் எப்படி மாற்றுகின்றன
              </div>
              {planetContext[0]?.condNotes?.length > 0 && (
                <div style={{fontSize:9.5,color:"#6b5a13",background:"#faf6e8",border:"1px solid #e6dcc9",borderRadius:6,padding:"6px 8px",marginBottom:8,lineHeight:1.6}}>
                  {planetContext[0].condNotes.map((n,i)=><div key={i}>• {n}</div>)}
                </div>
              )}
              {planetContext.map((pc,i)=>(
                <div key={i} style={{marginBottom:8,padding:"8px 10px",borderRadius:8,
                  background:pc.net>=2?"#f1f8e9":pc.net<=-2?"#fdf0f0":"#faf9f5",
                  border:`1px solid ${pc.net>=2?"#c5e1a5":pc.net<=-2?"#f0c8c8":"#e6dcc9"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:11.5,fontWeight:700}}>
                      {pc.symbol} {pc.ta} — {pc.rashi}, {pc.house}ஆம் வீடு
                      {pc.nakshatraTa && <span style={{fontSize:9,color:"#8b6914",fontWeight:400}}> ({pc.nakshatraTa}{pc.pada?`-${pc.pada}`:""})</span>}
                    </span>
                    <span style={{fontSize:10,fontWeight:800,
                      color:pc.net>=2?"#1b5e20":pc.net<=-2?"#cc1a1a":"#8b6914"}}>{pc.verdict}</span>
                  </div>
                  {pc.chain.map((c,ci)=>(
                    <div key={ci} style={{fontSize:9.5,lineHeight:1.6,
                      color:c.score>0?"#2e7d32":c.score<0?"#a03a00":"#555"}}>
                      <b style={{color:"#7b1c1c"}}>{c.k}:</b> {c.text}
                    </div>
                  ))}
                </div>
              ))}
              <div style={{fontSize:9,color:"#777",marginTop:6,lineHeight:1.5}}>
                விதி: கிரகன் தன் ராசிநாதன் & நட்சத்திராதிபதியின் நிலைப்படியும், சேர்க்கை-பார்வைப்படியும் பலன் தருவான் (BPHS/KP அடிப்படை).
                சுப/பாப இயல்பு லக்னவாரி (functional) — இயற்கை அல்ல.
              </div>
            </div>
          )}

          {/* ═══ கிரக அவஸ்தைகள் ═══ */}
          {advancedView==="avasthas" && avasthasData && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🌗 கிரக அவஸ்தைகள் (BPHS Ch.45) — பலன் தீவிர அளவு
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                  <thead>
                    <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>பாலாதி (வயது)</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>தீப்தாதி (கௌரவம்)</th>
                      <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>ஜாக்ரதாதி (விழிப்பு)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {avasthasData.map((a,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                        <td style={{padding:"6px 4px",fontWeight:600}}>{a.symbol} {a.ta}<div style={{fontSize:8.5,color:"#888"}}>{a.rashi} {a.degree}°</div></td>
                        <td style={{padding:"6px 4px",textAlign:"center"}}>
                          <b style={{color:a.baladi.pct>=100?"#0d7a30":a.baladi.pct<=25?"#cc1a1a":"#7a5200"}}>{a.baladi.name}</b>
                          <div style={{fontSize:8.5,color:"#666"}}>{a.baladi.desc} (~{a.baladi.pct}%)</div>
                        </td>
                        <td style={{padding:"6px 4px",textAlign:"center"}}>
                          <b style={{color:["தீப்த","ஸ்வஸ்த","முதித"].includes(a.deeptadi)?"#0d7a30":["கல","விகல","துக்கித"].includes(a.deeptadi)?"#cc1a1a":"#7a5200"}}>{a.deeptadi}</b>
                          <div style={{fontSize:8.5,color:"#666"}}>{a.deeptadiDesc}</div>
                        </td>
                        <td style={{padding:"6px 4px",textAlign:"center"}}>
                          <b style={{color:a.jagradadi.includes("விழிப்பு")?"#0d7a30":a.jagradadi.includes("உறக்கம்")?"#cc1a1a":"#7a5200"}}>{a.jagradadi}</b>
                          <div style={{fontSize:8.5,color:"#666"}}>{a.jagradadiDesc}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{fontSize:9,color:"#777",marginTop:8,lineHeight:1.5}}>
                பாலாதி — ராசியில் பாகை வழி (ஒற்றை நேர்/இரட்டை தலைகீழ்) • தீப்தாதி — உச்ச/சொந்த/நட்பு/பகை/நீச/அஸ்தங்க நிலை •
                ஜாக்ரதாதி — விழிப்பு நிலை. வீட்டு பலன் இந்த அவஸ்தை சதவீதத்தால் கூடும்/குறையும்.
              </div>
            </div>
          )}

          {/* ═══ பாவ பலம் ═══ */}
          {advancedView==="bhavabala" && bhavaBalaData && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🏠 பாவ பலம் (Bhava Bala) — எந்த வீடு பலமானது?
              </div>
              {bhavaBalaData.map((b,i)=>(
                <div key={i} style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,marginBottom:2}}>
                    <span style={{fontWeight:600}}>{b.houseNum}ஆம் வீடு ({b.houseRashi}) — அதிபதி {b.lordName}</span>
                    <span style={{fontWeight:700,color:b.verdict==="பலமுள்ளது"?"#0d7a30":b.verdict==="பலவீனம்"?"#cc1a1a":"#7a5200"}}>{b.total} • {b.verdict}</span>
                  </div>
                  <div style={{height:7,background:"#eee",borderRadius:4,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(100,(b.total/180)*100)}%`,height:"100%",borderRadius:4,
                      background:b.verdict==="பலமுள்ளது"?"linear-gradient(90deg,#66bb6a,#2e7d32)":b.verdict==="பலவீனம்"?"linear-gradient(90deg,#ef9a9a,#c62828)":"linear-gradient(90deg,#ffe082,#f9a825)"}}/>
                  </div>
                  <div style={{fontSize:8.5,color:"#888",marginTop:1}}>
                    அதிபதி பலம் {b.lordBala} + திக்பலம் {b.digBala} + திருஷ்டி பலம் {b.drishtiBala}
                  </div>
                </div>
              ))}
              <div style={{fontSize:9,color:"#777",marginTop:8,lineHeight:1.5}}>
                அதிபதி பலம் = வீட்டு அதிபதியின் ஷட்பல விகிதம் • திக்பலம் = ராசி இயல்பு (நர/ஜல/கீட/சதுஷ்பத) × கேந்திர இலக்கு •
                திருஷ்டி பலம் = வீட்டின் மீதான சுப/பாப பார்வைகள். பலமுள்ள வீட்டின் காரகங்கள் வாழ்வில் சிறக்கும்.
              </div>
            </div>
          )}

          {/* ═══ கோசாரம் (Transit Overlay) ═══ */}
          {advancedView==="transitoverlay" && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🌍 கோசாரம் — இன்றைய கிரக நிலை (Transit Overlay)
              </div>
              {transitOverlay && transitOverlay.length > 0 ? (
                <div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
                      <thead>
                        <tr style={{borderBottom:"1.5px solid #d4a85340"}}>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"left"}}>கிரகம்</th>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>ஜனன ராசி</th>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>கோசார ராசி</th>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>சந்திரனிலிருந்து</th>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>நட்சத்திரம்</th>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>தாரை</th>
                          <th style={{padding:"5px 4px",color:"#b8860b",fontWeight:700,textAlign:"center"}}>பலன்</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transitOverlay.map((p,i) => (
                          <tr key={i} style={{borderBottom:"1px solid #eee",background:i%2?"#fafafa":"transparent"}}>
                            <td style={{padding:"6px 4px",color:"#1a1a1a",fontWeight:600}}>{p.ta}</td>
                            <td style={{padding:"6px 4px",textAlign:"center",color:"#7b1c1c",fontWeight:600}}>{p.birthRashi}</td>
                            <td style={{padding:"6px 4px",textAlign:"center",color:"#b8860b",fontWeight:600}}>{p.transitRashi||p.rashi}</td>
                            <td style={{padding:"6px 4px",textAlign:"center",color:"#333",fontWeight:600}}>{p.houseFromMoon}</td>
                            <td style={{padding:"6px 4px",textAlign:"center",color:"#333"}}>
                              {p.nakshatraTa || "—"}{p.pada ? `-${p.pada}` : ""}
                              {p.nakLordName && p.nakLordName !== "—" && (
                                <div style={{fontSize:8.5,color:"#8b6914"}}>அதி: {p.nakLordName}</div>
                              )}
                            </td>
                            <td style={{padding:"6px 4px",textAlign:"center",fontWeight:600,fontSize:10,
                              color:p.tara ? (p.tara.mood==="good"?"#0d7a30":"#cc1a1a") : "#999"}}
                              title={p.tara ? p.tara.desc.replace(/நாள்/g,"காலம்") : ""}>
                              {p.tara ? p.tara.name.replace(" தாரை","") : "—"}
                            </td>
                            <td style={{padding:"6px 4px",textAlign:"center",
                              color:p.transitEffect==="சுபம்"?"#0d7a30":p.transitEffect==="அசுபம்"?"#cc1a1a":"#7a5200",
                              fontWeight:700,fontSize:10}}>
                              {p.transitEffect||"நடுநிலை"}
                              {p.vedha && (
                                <div style={{fontSize:8.5,color:"#cc1a1a",fontWeight:600}}
                                  title={`${p.vedha.house}ஆம் வீட்டில் ${p.vedha.by} இருப்பதால் இந்த சுப கோசாரம் தடைபடுகிறது`}>
                                  ⛔ வேதை ({p.vedha.by})
                                </div>
                              )}
                              {p.gocharaFav && !p.vedha && (
                                <div style={{fontSize:8.5,color:"#0d7a30",fontWeight:600}}>✓ வேதை இல்லை</div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{fontSize:9,color:"#777777",marginTop:8,lineHeight:1.5}}>
                    சந்திர ராசியிலிருந்து கோசாரக் கிரகங்களின் நிலை • வேதை (Brihat Samhita) சரிபார்க்கப்பட்டது — ⛔ = சுப கோசாரம் வேதையால் தடை; விலக்கு: சூரியன்↔சனி, சந்திரன்↔புதன்<br/>
                    தாரை = ஜென்ம நட்சத்திரத்திலிருந்து கோசாரக் கிரகத்தின் நட்சத்திரம் வரை 9-தாரா சுழற்சி — ராசிப் பலனை நட்சத்திர அளவில் நுட்பமாக்குகிறது.
                    பச்சை தாரை = அந்தக் கிரக காரகங்கள் சாதகம் • சிவப்பு தாரை = அக்காலத்தில் கவனம் தேவை
                  </div>
                </div>
              ) : (
                <div style={{padding:"14px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#7a5200",fontWeight:600}}>கோசார தரவு கிடைக்கவில்லை</div>
                  <div style={{fontSize:10,color:"#666",marginTop:4}}>Swiss Ephemeris API மூலம் இன்றைய கிரக நிலைகள் பெறப்படும்போது கோசாரம் காட்டப்படும்</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ராகு காலம் / எமகண்டம் / குளிகை ═══ */}
          {advancedView==="rahukalam" && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                ⏰ இன்றைய ராகு காலம் / எமகண்டம் / குளிகை
              </div>
              {(() => {
                const times = inauspiciousTimes || calcInauspiciousTimes(new Date());
                return (
                  <div>
                    <div style={{fontSize:12,color:"#b8860b",fontWeight:600,marginBottom:10}}>
                      📅 {times.vaaram} — {times.date.toLocaleDateString("ta-IN")}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      <div style={{padding:"12px 10px",background:"#fde8e8",borderRadius:8,border:"1px solid #f5c6c6",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#cc1a1a",fontWeight:700,marginBottom:4}}>🐍 ராகு காலம்</div>
                        <div style={{fontSize:13,color:"#cc1a1a",fontWeight:800}}>{times.rahuKalam.start}</div>
                        <div style={{fontSize:10,color:"#666"}}>முதல்</div>
                        <div style={{fontSize:13,color:"#cc1a1a",fontWeight:800}}>{times.rahuKalam.end}</div>
                      </div>
                      <div style={{padding:"12px 10px",background:"#fff3e0",borderRadius:8,border:"1px solid #ffe0b2",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#7a5200",fontWeight:700,marginBottom:4}}>💀 எமகண்டம்</div>
                        <div style={{fontSize:13,color:"#7a5200",fontWeight:800}}>{times.yamaGandam.start}</div>
                        <div style={{fontSize:10,color:"#666"}}>முதல்</div>
                        <div style={{fontSize:13,color:"#7a5200",fontWeight:800}}>{times.yamaGandam.end}</div>
                      </div>
                      <div style={{padding:"12px 10px",background:"#f3e8ff",borderRadius:8,border:"1px solid #d8b4fe",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#6b21a8",fontWeight:700,marginBottom:4}}>⚫ குளிகை</div>
                        <div style={{fontSize:13,color:"#6b21a8",fontWeight:800}}>{times.gulikai.start}</div>
                        <div style={{fontSize:10,color:"#666"}}>முதல்</div>
                        <div style={{fontSize:13,color:"#6b21a8",fontWeight:800}}>{times.gulikai.end}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:10,padding:"8px 12px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8"}}>
                      <div style={{fontSize:10,color:"#333"}}><span style={{color:"#b8860b",fontWeight:600}}>🌅 சூரிய உதயம்:</span> {times.sunrise}</div>
                      <div style={{fontSize:10,color:"#333"}}><span style={{color:"#7b1c1c",fontWeight:600}}>🌇 சூரிய அஸ்தமனம்:</span> {times.sunset}</div>
                    </div>
                    <div style={{fontSize:9,color:"#777",marginTop:8,lineHeight:1.5}}>
                      இந்த நேரங்களில் சுபகாரியங்கள் தொடங்க வேண்டாம் • ராகு காலத்தில் புதிய பணி ஆரம்பிக்க வேண்டாம்
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ முஹூர்த்தம் ═══ */}
          {advancedView==="muhurtha" && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🕉 முஹூர்த்தம் — இன்றைய சுப நேரம்
              </div>
              {(() => {
                const m = muhurthaData;
                if (!m) return null;
                return (
                  <div>
                    <div style={{padding:"12px",background:m.score>=60?"#e6f4ea":"#fff3e0",borderRadius:8,border:`1px solid ${m.score>=60?"#b7e1c7":"#ffe0b2"}`,marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:m.score>=60?"#0d7a30":"#7a5200"}}>{m.verdict}</div>
                          <div style={{fontSize:11,color:"#333",marginTop:2}}>{m.vaaram} — திதி: {m.tithiName}</div>
                        </div>
                        <div style={{fontSize:28,fontWeight:900,color:m.score>=60?"#0d7a30":"#7a5200"}}>{m.score}%</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                      <div style={{padding:"8px",background:m.isDayGood?"#e6f4ea":"#fde8e8",borderRadius:8,textAlign:"center",border:`1px solid ${m.isDayGood?"#b7e1c7":"#f5c6c6"}`}}>
                        <div style={{fontSize:9,color:"#666",marginBottom:2}}>கிழமை</div>
                        <div style={{fontSize:11,fontWeight:700,color:m.isDayGood?"#0d7a30":"#cc1a1a"}}>{m.isDayGood?"✓ சுபம்":"✗ அசுபம்"}</div>
                      </div>
                      <div style={{padding:"8px",background:m.isTithiGood?"#e6f4ea":"#fde8e8",borderRadius:8,textAlign:"center",border:`1px solid ${m.isTithiGood?"#b7e1c7":"#f5c6c6"}`}}>
                        <div style={{fontSize:9,color:"#666",marginBottom:2}}>திதி</div>
                        <div style={{fontSize:11,fontWeight:700,color:m.isTithiGood?"#0d7a30":"#cc1a1a"}}>{m.isTithiGood?"✓ சுபம்":"✗ அசுபம்"}</div>
                      </div>
                      <div style={{padding:"8px",background:m.isNakGood?"#e6f4ea":"#fde8e8",borderRadius:8,textAlign:"center",border:`1px solid ${m.isNakGood?"#b7e1c7":"#f5c6c6"}`}}>
                        <div style={{fontSize:9,color:"#666",marginBottom:2}}>நட்சத்திரம்</div>
                        <div style={{fontSize:11,fontWeight:700,color:m.isNakGood?"#0d7a30":"#cc1a1a"}}>{m.isNakGood?"✓ சுபம்":"✗ அசுபம்"}</div>
                      </div>
                    </div>
                    {m.subaNeramSlots.length > 0 && (
                      <div style={{padding:"10px 12px",background:"#f8f8f8",borderRadius:8,border:"1px solid #e8e8e8",marginBottom:10}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#7b1c1c",marginBottom:6}}>🕐 சுப நேரங்கள்</div>
                        {m.subaNeramSlots.map((s,i) => (
                          <div key={i} style={{fontSize:10,color:"#0d7a30",fontWeight:600,padding:"3px 0",borderBottom:i<m.subaNeramSlots.length-1?"1px solid #eee":"none"}}>✓ {s}</div>
                        ))}
                      </div>
                    )}
                    <div style={{padding:"10px 12px",background:"#f0f9ff",borderRadius:8,border:"1px solid #bae6fd"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#0369a1",marginBottom:6}}>📋 இன்று தொடங்கலாம்</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {m.activities.map((a,i) => (
                          <span key={i} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:"#e0f2fe",color:"#0369a1",border:"1px solid #bae6fd"}}>{a}</span>
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
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🪐 சனி-குரு பெயர்ச்சி பலன்கள்
              </div>
              {planetTransitAnalysis.sani && (
                <div style={{padding:"12px",background:planetTransitAnalysis.sani.effect==="சுபம்"?"#e6f4ea":planetTransitAnalysis.sani.effect==="அசுபம்"?"#fde8e8":"#fff8e1",
                  borderRadius:8,border:`1px solid ${planetTransitAnalysis.sani.effect==="சுபம்"?"#b7e1c7":planetTransitAnalysis.sani.effect==="அசுபம்"?"#f5c6c6":"#ffe082"}`,marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#1e3a5f"}}>🪐 சனி பெயர்ச்சி</div>
                    <div style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,
                      background:planetTransitAnalysis.sani.effect==="சுபம்"?"#dcfce7":planetTransitAnalysis.sani.effect==="அசுபம்"?"#fee2e2":"#fef9c3",
                      color:planetTransitAnalysis.sani.effect==="சுபம்"?"#0d7a30":planetTransitAnalysis.sani.effect==="அசுபம்"?"#cc1a1a":"#7a5200"}}>
                      {planetTransitAnalysis.sani.effect}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:"#333",marginBottom:4}}>
                    தற்போது: <span style={{fontWeight:700,color:"#7b1c1c"}}>{planetTransitAnalysis.sani.currentRashi}</span> — சந்திரனிலிருந்து <span style={{fontWeight:700}}>{planetTransitAnalysis.sani.houseFromMoon}ம் வீடு</span>
                  </div>
                  {planetTransitAnalysis.sani.nakshatraTa && (
                    <div style={{fontSize:10.5,color:"#333",marginBottom:4}}>
                      ✨ நட்சத்திரப் பயணம்: <b>{planetTransitAnalysis.sani.nakshatraTa}{planetTransitAnalysis.sani.pada?`-${planetTransitAnalysis.sani.pada}`:""}</b> (அதிபதி: {planetTransitAnalysis.sani.nakLordName})
                      {planetTransitAnalysis.sani.tara && (
                        <span style={{fontWeight:700,marginLeft:4,color:planetTransitAnalysis.sani.tara.mood==="good"?"#0d7a30":"#cc1a1a"}}>
                          • {planetTransitAnalysis.sani.tara.name} — {planetTransitAnalysis.sani.tara.desc.replace(/நாள்/g,"காலம்")}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{fontSize:10,color:"#333",lineHeight:1.6}}>{planetTransitAnalysis.sani.desc}</div>
                  {planetTransitAnalysis.sani.isSadeSati && (
                    <div style={{marginTop:8,padding:"8px 10px",background:"#fde8e8",borderRadius:6,border:"1px solid #f5c6c6"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#cc1a1a"}}>⚠ சாடே-சாதி (7½ சனி) நடப்பில் உள்ளது!</div>
                      <div style={{fontSize:10,color:"#333",marginTop:2}}>நிலை: {planetTransitAnalysis.sani.sadeSatiPhase}</div>
                    </div>
                  )}
                  {planetTransitAnalysis.sani.isAshtama && (
                    <div style={{marginTop:8,padding:"8px 10px",background:"#fde8e8",borderRadius:6,border:"1px solid #f5c6c6"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#cc1a1a"}}>⚠ அஷ்டமச் சனி — மிகவும் எச்சரிக்கையாக இருக்கவும்</div>
                    </div>
                  )}
                </div>
              )}
              {planetTransitAnalysis.guru && (
                <div style={{padding:"12px",background:planetTransitAnalysis.guru.effect==="சுபம்"?"#e6f4ea":planetTransitAnalysis.guru.effect==="அசுபம்"?"#fde8e8":"#fff8e1",
                  borderRadius:8,border:`1px solid ${planetTransitAnalysis.guru.effect==="சுபம்"?"#b7e1c7":planetTransitAnalysis.guru.effect==="அசுபம்"?"#f5c6c6":"#ffe082"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#eab308"}}>🔮 குரு பெயர்ச்சி</div>
                    <div style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,
                      background:planetTransitAnalysis.guru.effect==="சுபம்"?"#dcfce7":planetTransitAnalysis.guru.effect==="அசுபம்"?"#fee2e2":"#fef9c3",
                      color:planetTransitAnalysis.guru.effect==="சுபம்"?"#0d7a30":planetTransitAnalysis.guru.effect==="அசுபம்"?"#cc1a1a":"#7a5200"}}>
                      {planetTransitAnalysis.guru.effect}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:"#333",marginBottom:4}}>
                    தற்போது: <span style={{fontWeight:700,color:"#7b1c1c"}}>{planetTransitAnalysis.guru.currentRashi}</span> — சந்திரனிலிருந்து <span style={{fontWeight:700}}>{planetTransitAnalysis.guru.houseFromMoon}ம் வீடு</span>
                  </div>
                  {planetTransitAnalysis.guru.nakshatraTa && (
                    <div style={{fontSize:10.5,color:"#333",marginBottom:4}}>
                      ✨ நட்சத்திரப் பயணம்: <b>{planetTransitAnalysis.guru.nakshatraTa}{planetTransitAnalysis.guru.pada?`-${planetTransitAnalysis.guru.pada}`:""}</b> (அதிபதி: {planetTransitAnalysis.guru.nakLordName})
                      {planetTransitAnalysis.guru.tara && (
                        <span style={{fontWeight:700,marginLeft:4,color:planetTransitAnalysis.guru.tara.mood==="good"?"#0d7a30":"#cc1a1a"}}>
                          • {planetTransitAnalysis.guru.tara.name} — {planetTransitAnalysis.guru.tara.desc.replace(/நாள்/g,"காலம்")}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{fontSize:10,color:"#333",lineHeight:1.6}}>{planetTransitAnalysis.guru.desc}</div>
                </div>
              )}
              <div style={{fontSize:9,color:"#777",marginTop:8,lineHeight:1.5}}>
                சனி ஒரு ராசியில் 2½ வருடம் • குரு ஒரு ராசியில் 1 வருடம் தங்கும் • சந்திர ராசியிலிருந்து கணிக்கப்பட்டது
              </div>
            </div>
          )}

          {/* ═══ பரிகாரம் ═══ */}
          {advancedView==="remedies" && remediesData && remediesData.length > 0 && (
            <div style={{...card,marginBottom:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                💎 பரிகாரம் — கோயில், மந்திரம், ரத்தினம்
              </div>
              {remediesData.filter(r => r.needsRemedy).length > 0 && (
                <div style={{padding:"10px 12px",background:"#fff3e0",borderRadius:8,border:"1px solid #ffe0b2",marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#7a5200",marginBottom:4}}>⚠ பரிகாரம் தேவையான கிரகங்கள்</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {remediesData.filter(r=>r.needsRemedy).map((r,i)=>(
                      <span key={i} style={{fontSize:10,padding:"3px 8px",borderRadius:4,fontWeight:600,
                        background:r.isDebilitated?"#fde8e8":"#fff8e1",
                        color:r.isDebilitated?"#cc1a1a":"#7a5200",
                        border:`1px solid ${r.isDebilitated?"#f5c6c6":"#ffe082"}`}}>
                        {r.ta} {r.isDebilitated?"(நீசம்)":r.isWeak?"(பலவீனம்)":"(பகை)"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {remediesData.map((r,i) => (
                <div key={i} style={{marginBottom:8,padding:"10px 12px",background:r.needsRemedy?"#fffbeb":"#f8f8f8",
                  borderRadius:8,border:`1px solid ${r.needsRemedy?"#fde68a":"#e8e8e8"}`,
                  borderLeft:r.needsRemedy?`3px solid ${r.gemColor}`:"3px solid #e0e0e0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#1a1a1a"}}>{r.ta} <span style={{fontSize:10,color:"#666",fontWeight:400}}>({r.rashi})</span></div>
                    {r.needsRemedy && <span style={{fontSize:8,padding:"2px 6px",borderRadius:4,background:"#fde8e8",color:"#cc1a1a",fontWeight:700}}>பரிகாரம் தேவை</span>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10}}>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>💎 ரத்தினம்:</span> <span style={{color:"#333"}}>{r.gem}</span></div>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>🏛 கோயில்:</span> <span style={{color:"#333"}}>{r.temple}</span></div>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>📅 கிழமை:</span> <span style={{color:"#333"}}>{r.day}</span></div>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>🎨 நிறம்:</span> <span style={{color:"#333"}}>{r.color}</span></div>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>🌸 மலர்:</span> <span style={{color:"#333"}}>{r.flower}</span></div>
                    <div><span style={{color:"#b8860b",fontWeight:600}}>🧭 திசை:</span> <span style={{color:"#333"}}>{r.direction}</span></div>
                    <div style={{gridColumn:"1/3"}}><span style={{color:"#b8860b",fontWeight:600}}>🙏 தானம்:</span> <span style={{color:"#333"}}>{r.donate}</span></div>
                  </div>
                  <div style={{marginTop:6,padding:"6px 8px",background:"#f0f9ff",borderRadius:4,border:"1px solid #bae6fd"}}>
                    <div style={{fontSize:9,color:"#0369a1",fontWeight:600}}>🔔 மந்திரம்: <span style={{fontWeight:400}}>{r.mantra}</span></div>
                    <div style={{fontSize:9,color:"#666",marginTop:2}}>ஜெப எண்ணிக்கை: {r.mantraCount}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ 4. DASHA SUMMARY (with dates) ═══ */}
          {dashaData&&(<div style={{...card,marginBottom:10,padding:"12px 14px"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#7b1c1c",marginBottom:4,borderBottom:"1px solid #d4a85330",paddingBottom:4}}>📅 விம்சோத்தரி தசா காலக்கணக்கு</div>
            <div style={{fontSize:10,color:"#b8860b",marginBottom:8,marginTop:6}}>
              நட்சத்திரம்: <span style={{color:"#1a1a1a"}}>{dashaData.birthNakshatra}</span> • நாதன்: <span style={{color:"#1a1a1a"}}>{dashaData.birthLord.name}</span>
            </div>
            {dashaData.dashas.map((d,i)=>(
              <div key={i}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:(expandedDasha===i||String(expandedDasha).startsWith(i+"-"))?"none":"1px solid #e8e0e0",
                  background:d.isCurrent?"#fdf6e3":"transparent",cursor:"pointer"}}
                  onClick={()=>setExpandedDasha(expandedDasha===i||(typeof expandedDasha==='string'&&expandedDasha.startsWith(i+"-"))?null:i)}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11,fontWeight:d.isCurrent?700:400,color:d.isCurrent?"#7b1c1c":"#333333"}}>{d.name} தசை</span>
                      {d.isCurrent&&<span style={{fontSize:7,background:"#f0c75e20",color:"#7b1c1c",padding:"1px 5px",borderRadius:4,fontWeight:700}}>நடப்பு</span>}
                    </div>
                    <div style={{fontSize:9,color:"#666666",marginTop:1}}>
                      {d.startDate.toLocaleDateString("ta-IN")} — {d.endDate.toLocaleDateString("ta-IN")}
                    </div>
                  </div>
                  <span style={{fontSize:9,color:"#666666"}}>{d.years}y</span>
                  <span style={{fontSize:10,color:"#777777",transition:"transform 0.2s",transform:(expandedDasha===i||String(expandedDasha).startsWith(i+"-"))?"rotate(180deg)":"rotate(0)"}}> ▾</span>
                </div>
                {(expandedDasha===i||String(expandedDasha).startsWith(i+"-"))&&d.antardashas&&(
                  <div style={{marginLeft:24,borderLeft:"2px solid #d4a85350",paddingLeft:10,marginBottom:6}}>
                    <div style={{fontSize:9,color:"#555555",fontWeight:600,marginBottom:4,marginTop:2}}>புக்தி (Antardasha)</div>
                    {d.antardashas.map((ad,j)=>(
                      <div key={j}>
                        <div style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",cursor:"pointer",
                          background:ad.isCurrent?"#f0e8d0":"transparent",borderRadius:4}}
                          onClick={(e)=>{e.stopPropagation();setExpandedDasha(expandedDasha===`${i}-${j}`?i:`${i}-${j}`)}}>
                          <span style={{fontSize:10,flex:1,color:ad.isCurrent?"#b8860b":"#333333"}}>{ad.name}
                            {ad.isCurrent&&<span style={{fontSize:7,background:"#e8dcc0",color:"#b8860b",padding:"0 4px",borderRadius:3,marginLeft:4,fontWeight:700}}>நடப்பு</span>}
                          </span>
                          <span style={{fontSize:8,color:"#777777"}}>{ad.startDate.toLocaleDateString("ta-IN",{month:"short",year:"2-digit"})}</span>
                          <span style={{fontSize:8,color:"#888888",transition:"transform 0.2s",transform:expandedDasha===`${i}-${j}`?"rotate(180deg)":"rotate(0)"}}>▾</span>
                        </div>
                        {(expandedDasha===`${i}-${j}`||String(expandedDasha).startsWith(`${i}-${j}-`))&&ad.pratyantardashas&&(
                          <div style={{marginLeft:18,borderLeft:"1px solid #b8860b40",paddingLeft:8,marginBottom:4}}>
                            <div style={{fontSize:8,color:"#666666",fontWeight:600,marginBottom:2,marginTop:2}}>பிரத்யந்தரம் (Pratyantardasha)</div>
                            {ad.pratyantardashas.map((pad,k)=>(
                              <div key={k}>
                                <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 0",cursor:"pointer",
                                  background:pad.isCurrent?"#e8f5e9":"transparent",borderRadius:3}}
                                  onClick={(e)=>{e.stopPropagation();setExpandedDasha(expandedDasha===`${i}-${j}-${k}`?`${i}-${j}`:`${i}-${j}-${k}`)}}>
                                  <span style={{fontSize:9,flex:1,color:pad.isCurrent?"#0d7a30":"#555555"}}>{pad.name}
                                    {pad.isCurrent&&<span style={{fontSize:6,background:"#d4edda",color:"#0d7a30",padding:"0 3px",borderRadius:3,marginLeft:3,fontWeight:700}}>நடப்பு</span>}
                                  </span>
                                  <span style={{fontSize:7,color:"#888888"}}>{pad.duration}</span>
                                  <span style={{fontSize:7,color:"#999999",transition:"transform 0.2s",transform:expandedDasha===`${i}-${j}-${k}`?"rotate(180deg)":"rotate(0)"}}>▾</span>
                                </div>
                                {expandedDasha===`${i}-${j}-${k}`&&pad.sookshmaDashas&&(
                                  <div style={{marginLeft:14,borderLeft:"1px solid #0d7a3040",paddingLeft:6,marginBottom:3}}>
                                    <div style={{fontSize:7,color:"#777777",fontWeight:600,marginBottom:2,marginTop:2}}>சூட்சுமம் (Sookshma Dasha)</div>
                                    {pad.sookshmaDashas.map((sd,l)=>(
                                      <div key={l} style={{display:"flex",alignItems:"center",gap:4,padding:"1px 0",
                                        background:sd.isCurrent?"#e0f0ff":"transparent",borderRadius:3}}>
                                        <span style={{fontSize:8,flex:1,color:sd.isCurrent?"#1565c0":"#666666"}}>{sd.name}
                                          {sd.isCurrent&&<span style={{fontSize:5,background:"#cfe4fa",color:"#1565c0",padding:"0 3px",borderRadius:3,marginLeft:3,fontWeight:700}}>நடப்பு</span>}
                                        </span>
                                        <span style={{fontSize:6,color:"#999999"}}>{sd.duration}</span>
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

          {/* ═══ 5. AI BUTTON ═══ */}
          {!prediction && !predictionLoading && (
            <button style={{...btnOutline,marginBottom:10,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
              onClick={fetchAIPrediction}>🤖 AI ஜோதிட பலன் பெறு</button>
          )}
          {predictionLoading&&(<div style={{...card,marginBottom:10,textAlign:"center",padding:16}}>
            <div style={{width:24,height:24,margin:"0 auto 8px",border:"2px solid #d4a85320",borderTop:"2px solid #d4a853",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
          </div>)}
          {prediction&&(<div style={{...card,marginBottom:10,padding:"12px 14px",fontSize:12,lineHeight:1.8,color:"#333333",whiteSpace:"pre-wrap"}}>{prediction}</div>)}

          {/* ═══ 6. ACTIONS ═══ */}
          <button onClick={downloadPDF} style={{...btnGold,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:14,padding:"13px 0",boxShadow:"0 4px 24px #d4a85345"}}>
            📄 முழு ஜாதகம் PDF பதிவிறக்கு
          </button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}}>
            <button style={{...btnOutline,fontSize:10,padding:"9px 0"}} onClick={()=>goTo(SCREEN.FORM)}>புதிய ஜாதகம்</button>
            <button style={{...btnOutline,fontSize:10,padding:"9px 0",borderColor:"#ff6b8a30",color:"#dc2626"}} onClick={()=>goTo(SCREEN.PORUTHAM)}>💍 பொருத்தம்</button>
            <button style={{...btnOutline,fontSize:10,padding:"9px 0",borderColor:"#d4a85340",color:"#7b1c1c"}} onClick={()=>goTo(SCREEN.PREMIUM)}>⭐ Premium</button>
          </div>
          <button style={{...btnOutline,fontSize:11,padding:"9px 0",marginTop:6,borderColor:"#4ade8030",color:"#4ade80"}} onClick={()=>goTo(SCREEN.CALENDAR)}>📅 பஞ்சாங்க நாட்காட்டி</button>
        </div>
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
        <div style={{...container,paddingTop:24,paddingBottom:30}}>
          <button onClick={()=>goTo(horoscope?SCREEN.RESULT:SCREEN.FORM)} style={{background:"none",border:"none",color:T.accent,fontSize:14,cursor:"pointer",padding:0,marginBottom:16}}>← பின் செல்</button>

          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:36,marginBottom:6}}>💍</div>
            <h2 style={{fontSize:20,fontWeight:500,color:"#dc2626",margin:"0 0 4px"}}>திருமண பொருத்தம்</h2>
            <p style={{fontSize:12,color:"#b8860b"}}>திருமணப் பொருத்தம் — Kundali Matching</p>
          </div>

          <div style={{...card,marginBottom:12,borderLeft:"3px solid #ff6b8a"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#dc2626",marginBottom:10}}>👰 பெண் விவரம்</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input style={inputStyle} placeholder="பெண் பெயர்" value={poruthBride.name}
                onChange={e=>setPoruthBride(d=>({...d,name:e.target.value}))}/>
              <input type="text" inputMode="numeric" maxLength={10}
                style={{...inputStyle,letterSpacing:2,fontFamily:"monospace",fontSize:15}}
                placeholder="DD.MM.YYYY" value={poruthBride.dob}
                onChange={e=>setPoruthBride(d=>({...d,dob:formatDateInput(e.target.value)}))}/>
              <div style={{display:"flex",gap:8}}>
                <input type="text" inputMode="numeric" maxLength={5}
                  style={{...inputStyle,flex:1,letterSpacing:2,fontFamily:"monospace",fontSize:15}}
                  placeholder="HH:MM (விருப்பம்)" value={poruthBride.tob}
                  onChange={e=>setPoruthBride(d=>({...d,tob:formatTimeInput(e.target.value)}))}/>
                {["AM","PM"].map(ap=>(
                  <button key={ap} onClick={()=>setPoruthBride(d=>({...d,ampm:ap}))} style={{
                    padding:"8px 12px",borderRadius:8,fontSize:12,cursor:"pointer",
                    border:`1px solid ${poruthBride.ampm===ap?"#ff6b8a":"#e0d8c8"}`,
                    background:poruthBride.ampm===ap?"#ff6b8a22":"transparent",
                    color:poruthBride.ampm===ap?"#dc2626":"#888"}}>
                    {ap==="AM"?"☀ காலை":"☽ மாலை"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{...card,marginBottom:16,borderLeft:"3px solid #6b8aff"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#6b8aff",marginBottom:10}}>🤵 ஆண் விவரம்</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input style={inputStyle} placeholder="ஆண் பெயர்" value={poruthGroom.name}
                onChange={e=>setPoruthGroom(d=>({...d,name:e.target.value}))}/>
              <input type="text" inputMode="numeric" maxLength={10}
                style={{...inputStyle,letterSpacing:2,fontFamily:"monospace",fontSize:15}}
                placeholder="DD.MM.YYYY" value={poruthGroom.dob}
                onChange={e=>setPoruthGroom(d=>({...d,dob:formatDateInput(e.target.value)}))}/>
              <div style={{display:"flex",gap:8}}>
                <input type="text" inputMode="numeric" maxLength={5}
                  style={{...inputStyle,flex:1,letterSpacing:2,fontFamily:"monospace",fontSize:15}}
                  placeholder="HH:MM (விருப்பம்)" value={poruthGroom.tob}
                  onChange={e=>setPoruthGroom(d=>({...d,tob:formatTimeInput(e.target.value)}))}/>
                {["AM","PM"].map(ap=>(
                  <button key={ap} onClick={()=>setPoruthGroom(d=>({...d,ampm:ap}))} style={{
                    padding:"8px 12px",borderRadius:8,fontSize:12,cursor:"pointer",
                    border:`1px solid ${poruthGroom.ampm===ap?"#6b8aff":"#e0d8c8"}`,
                    background:poruthGroom.ampm===ap?"#6b8aff22":"transparent",
                    color:poruthGroom.ampm===ap?"#6b8aff":"#888"}}>
                    {ap==="AM"?"☀ காலை":"☽ மாலை"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button style={{...btnGold,opacity:(!isValidDDMMYYYY(poruthBride.dob)||!isValidDDMMYYYY(poruthGroom.dob)||poruthLoading)?0.4:1,
            pointerEvents:(!isValidDDMMYYYY(poruthBride.dob)||!isValidDDMMYYYY(poruthGroom.dob)||poruthLoading)?"none":"auto",
            background:"linear-gradient(135deg,#ff6b8a,#ff8fab,#ff6b8a)"}} onClick={handlePorutham}>
            {poruthLoading ? "கணக்கிடுகிறது..." : "💍 பொருத்தம் பார் →"}
          </button>

          {poruthResult&&(
            <div style={{marginTop:20}}>
              <div style={{...card,textAlign:"center",marginBottom:14}}>
                <div style={{position:"relative",width:100,height:100,margin:"0 auto 10px"}}>
                  <svg viewBox="0 0 100 100" style={{width:100,height:100}}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff10" strokeWidth="6"/>
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={poruthResult.totalScore>=9?"#4ade80":poruthResult.totalScore>=7?"#7b1c1c":"#dc2626"}
                      strokeWidth="6" strokeDasharray={`${poruthResult.totalScore*(264/poruthResult.maxScore)} 264`}
                      strokeLinecap="round" transform="rotate(-90 50 50)"/>
                    <text x="50" y="46" textAnchor="middle" fill="#7b1c1c" fontSize="24" fontWeight="700">{poruthResult.totalScore}</text>
                    <text x="50" y="62" textAnchor="middle" fill="#b8860b" fontSize="10">/{poruthResult.maxScore}</text>
                  </svg>
                </div>
                <div style={{fontSize:16,fontWeight:700,color:poruthResult.totalScore>=9?"#4ade80":poruthResult.totalScore>=7?"#7b1c1c":"#dc2626"}}>
                  {poruthResult.grade}
                </div>
                <div style={{fontSize:11,color:"#b8860b",marginTop:4}}>{poruthResult.brideName||"பெண்"} ❤ {poruthResult.groomName||"ஆண்"}</div>
              </div>
              {poruthResult.results.map((r,i)=>(
                <div key={i} style={{...card,padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",gap:12,borderLeft:`3px solid ${r.ok?"#4ade80":"#dc2626"}`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,fontSize:14,background:r.ok?"#4ade8020":"#ff6b8a20",color:r.ok?"#4ade80":"#dc2626",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{r.ok?"✓":"✗"}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{r.name}</span><span style={{fontSize:10,color:"#b8860b"}}>{r.en}</span></div>
                    <div style={{fontSize:11,color:"#b8860b",marginTop:3,lineHeight:1.5}}>{r.desc}</div>
                  </div>
                </div>
              ))}
              {/* தசா-பொருத்தம் — கூடுதல் தகவல் (10-பொருத்த மதிப்பெண்ணில் சேராது) */}
              {poruthResult.dashaCompat && (
                <div style={{...card,padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",gap:12,
                  borderLeft:`3px solid ${poruthResult.dashaCompat.ok?"#4ade80":poruthResult.dashaCompat.neutral?"#d4a853":"#dc2626"}`,
                  background:"#fdf8ec"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",
                    background:poruthResult.dashaCompat.ok?"#4ade8020":poruthResult.dashaCompat.neutral?"#d4a85320":"#ff6b8a20"}}>⏳</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>தசா-பொருத்தம்</span>
                      <span style={{fontSize:9,color:"#8b6914"}}>கூடுதல் (மதிப்பெண்ணில் சேராது)</span>
                    </div>
                    <div style={{fontSize:11,color:"#b8860b",marginTop:3,lineHeight:1.5}}>
                      பெண்: {poruthResult.dashaCompat.bride} தசை • ஆண்: {poruthResult.dashaCompat.groom} தசை — {poruthResult.dashaCompat.text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════ DAILY PREDICTION (தினப்பலன்) ═══════
  if(screen===SCREEN.DAILY && dailyData) {
    const { today, gochara, remedy, muhurtham, sadeSati, guruPeyarchi, taraBala, currentDasha } = dailyData;
    const moodColor = gochara.overallMood==="good" ? "#4ade80" : gochara.overallMood==="caution" ? "#dc2626" : "#7b1c1c";
    const moodText = gochara.overallMood==="good" ? `${today.isOtherDate?"அன்று":"இன்று"} நல்ல நாள்` : gochara.overallMood==="caution" ? "கவனமாக இருக்க வேண்டிய நாள்" : "சாதாரண நாள்";
    const dailyGeo = resolveBirthGeo(formData);
    const currentHorai = calcCurrentHorai(liveClock, dailyGeo.lat, dailyGeo.lon); // live — refreshes every 30s via liveClock state

    return (
      <div style={base}>
        <div style={{...container,paddingTop:20,paddingBottom:30}}>
          <button onClick={()=>goTo(SCREEN.RESULT)} style={{background:"none",border:"none",color:T.accent,fontSize:14,cursor:"pointer",padding:0,marginBottom:12}}>← திரும்பு</button>

          {/* ═══ TAB SWITCHER: ஜாதகம் / இன்றைய பலன் ═══ */}
          <div style={{display:"flex",gap:0,marginBottom:16,background:"#f5f0e0",borderRadius:12,padding:3}}>
            <button onClick={()=>goTo(SCREEN.RESULT)} style={{
              flex:1,padding:"10px 0",border:"none",borderRadius:10,
              background:"transparent",color:"#555555",fontSize:12,fontWeight:600,cursor:"pointer"
            }}>📜 ஜாதகம்</button>
            <button style={{
              flex:1,padding:"10px 0",border:"none",borderRadius:10,
              background:"linear-gradient(135deg,#d4a85325,#b8860b25)",
              color:"#7b1c1c",fontSize:12,fontWeight:700,cursor:"pointer"
            }}>📅 இன்றைய பலன்</button>
          </div>

          <div style={{textAlign:"center",marginBottom:12}}>
            <div style={{fontSize:32,marginBottom:6}}>{today.isFuture?"🔮":today.isPast?"🕰":"📅"}</div>
            <h2 style={{fontSize:19,fontWeight:500,color:"#7b1c1c",margin:"0 0 2px"}}>
              {today.isFuture?"எதிர்கால பலன்":today.isPast?"கடந்த நாள் பலன்":"இன்றைய பலன்"}
            </h2>
            <p style={{fontSize:12,color:"#b8860b"}}>{today.dateStr} • {today.dayName}கிழமை</p>
            {today.isOtherDate && (
              <div style={{fontSize:9,color:today.isFuture?"#4ade80":"#555555",marginTop:3,fontWeight:600}}>
                {today.isFuture?"✨ எதிர்கால கணிப்பு — அன்றைய தசை-புக்தி அடிப்படையில்":"📖 கடந்த நாளின் பலன் பார்வை"}
              </div>
            )}
          </div>

          {/* ═══ Date Navigator — browse to any past/future date ═══ */}
          <div style={{...card,marginBottom:12,padding:"10px 12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>{
                const d = new Date(today.dateObj); d.setDate(d.getDate()-1);
                openDailyScreen(d);
              }} style={{background:"#f2ecda",border:"1px solid #d4a85325",borderRadius:8,
                width:32,height:32,color:"#7b1c1c",fontSize:15,cursor:"pointer",flexShrink:0}}>◂</button>

              <input type="date" value={`${today.dateObj.getFullYear()}-${String(today.dateObj.getMonth()+1).padStart(2,'0')}-${String(today.dateObj.getDate()).padStart(2,'0')}`}
                onChange={e=>{
                  if(!e.target.value) return;
                  const [y,m,d] = e.target.value.split('-').map(Number);
                  openDailyScreen(new Date(y, m-1, d));
                }}
                style={{...inputStyle,flex:1,padding:"7px 10px",fontSize:12,colorScheme:"dark",textAlign:"center"}}/>

              <button onClick={()=>{
                const d = new Date(today.dateObj); d.setDate(d.getDate()+1);
                openDailyScreen(d);
              }} style={{background:"#f2ecda",border:"1px solid #d4a85325",borderRadius:8,
                width:32,height:32,color:"#7b1c1c",fontSize:15,cursor:"pointer",flexShrink:0}}>▸</button>
            </div>
            {today.isOtherDate && (
              <button onClick={()=>openDailyScreen(null)} style={{
                marginTop:8,width:"100%",background:"none",border:"none",color:"#4ade80",
                fontSize:11,fontWeight:600,cursor:"pointer",padding:"4px 0"
              }}>📍 இன்றைக்கு திரும்பு</button>
            )}
          </div>

          {/* Live Horai — updates every ~30s. Only meaningful for "today"; hidden when browsing another date. */}
          {!today.isOtherDate && (
          <div style={{...card,marginBottom:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,
            border:`1px solid ${currentHorai.isBenefic?"#4ade8030":"#ff6b8a30"}`}}>
            <div style={{fontSize:24}}>{currentHorai.symbol}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:9,color:"#555555"}}>இப்போது நடக்கும் ஹோரை (Live)</div>
              <div style={{fontSize:13,fontWeight:700,color:currentHorai.isBenefic?"#4ade80":"#dc2626"}}>
                {currentHorai.planet} ஹோரை
              </div>
              <div style={{fontSize:9,color:"#666666"}}>{currentHorai.startLabel} — {currentHorai.endLabel}</div>
            </div>
            <div style={{fontSize:9,color:currentHorai.isBenefic?"#4ade80":"#dc2626",fontWeight:600,textAlign:"right"}}>
              {currentHorai.isBenefic?"✓ சுப நேரம்":"⚠ கவனம்"}
            </div>
          </div>
          )}

          {/* Mood Banner */}
          <div style={{...card,marginBottom:12,padding:"14px 16px",textAlign:"center",
            border:`1.5px solid ${moodColor}40`, background:`${moodColor}10`}}>
            <div style={{fontSize:15,fontWeight:700,color:moodColor}}>{moodText}</div>
            {gochara.isChandrashtama && (
              <div style={{fontSize:11,color:"#dc2626",marginTop:6,fontWeight:600}}>
                ⚠ {today.isOtherDate?"அன்று":"இன்று"} சந்திராஷ்டமம் — புதிய காரியங்களைத் தவிர்க்கவும்
              </div>
            )}
            <div style={{fontSize:10,color:"#555555",marginTop:6}}>
              சுப கிரகங்கள்: {gochara.goodCount} • எச்சரிக்கை: {gochara.badCount}
            </div>
          </div>

          {/* ═══ Current Dasha chain — most important long-term personalization factor ═══ */}
          {currentDasha && (
            <div style={{...card,marginBottom:12,padding:"12px 14px",
              background:"linear-gradient(135deg,#d4a85312,#b8860b15)",border:"1px solid #d4a85325"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#b8860b",marginBottom:8,letterSpacing:0.5}}>
                ⏳ {today.isOtherDate?"அன்றைய தசை சங்கிலி":"தற்போதைய தசை சங்கிலி"}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:8,color:"#666666",marginBottom:2}}>மகாதசை</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#7b1c1c"}}>
                    {currentDasha.mahadasha.name}
                  </div>
                </div>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:8,color:"#666666",marginBottom:2}}>புக்தி (அந்தர் தசை)</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#b8860b"}}>
                    {currentDasha.bhukti?.name || currentDasha.mahadasha.name}
                  </div>
                </div>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:8,color:"#666666",marginBottom:2}}>பிரத்யந்தர தசை</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#7b1c1c"}}>
                    {currentDasha.pratyantar?.name || "—"}
                  </div>
                </div>
                <div style={{background:"#f8f4ea",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:8,color:"#666666",marginBottom:2}}>சூட்சும தசை</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#b8860b"}}>
                    {currentDasha.sookshma?.name || "—"}
                  </div>
                </div>
              </div>
              {currentDasha.daysLeftInSookshma > 0 ? (
                <div style={{fontSize:9,color:"#666666",marginTop:6,textAlign:"center"}}>
                  இந்த சூட்சும தசை இன்னும் {currentDasha.daysLeftInSookshma} நாட்கள் நீடிக்கும்
                </div>
              ) : currentDasha.daysLeftInBhukti > 0 && (
                <div style={{fontSize:9,color:"#666666",marginTop:6,textAlign:"center"}}>
                  இந்த புக்தி இன்னும் {currentDasha.daysLeftInBhukti} நாட்கள் நீடிக்கும்
                </div>
              )}
            </div>
          )}

          {/* Sade Sati + Tara Bala row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {sadeSati && (
              <div style={{...card,padding:"10px 12px",
                border:`1px solid ${sadeSati.active?(sadeSati.severity==="high"?"#ff6b8a40":"#f0c75e30"):"#4ade8025"}`}}>
                <div style={{fontSize:9,color:"#555555",marginBottom:3}}>ஏழரை சனி</div>
                <div style={{fontSize:11,fontWeight:700,
                  color:sadeSati.active?(sadeSati.severity==="high"?"#dc2626":"#7b1c1c"):"#4ade80"}}>
                  {sadeSati.active?"⚠ "+sadeSati.phase:"✓ இல்லை"}
                </div>
              </div>
            )}
            {taraBala && (
              <div style={{...card,padding:"10px 12px",
                border:`1px solid ${taraBala.mood==="good"?"#4ade8025":"#ff6b8a30"}`}}>
                <div style={{fontSize:9,color:"#555555",marginBottom:3}}>தாரா பலம்</div>
                <div style={{fontSize:11,fontWeight:700,color:taraBala.mood==="good"?"#4ade80":"#dc2626"}}>
                  {taraBala.mood==="good"?"✓ ":"⚠ "}{taraBala.name}
                </div>
              </div>
            )}
          </div>

          {/* Guru Peyarchi */}
          {guruPeyarchi && (
            <div style={{...card,marginBottom:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,
              border:`1px solid ${guruPeyarchi.mood==="good"?"#4ade8025":"#f0c75e30"}`}}>
              <div style={{fontSize:22}}>♃</div>
              <div style={{flex:1}}>
                <div style={{fontSize:9,color:"#555555"}}>குரு பெயர்ச்சி பலன் ({guruPeyarchi.rashi})</div>
                <div style={{fontSize:11,color:"#333333",lineHeight:1.5,marginTop:2}}>{guruPeyarchi.desc}</div>
              </div>
            </div>
          )}

          {/* Muhurtham — Rahu Kalam, Yamagandam, Kuligai, Abhijit */}
          {muhurtham && (
            <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#7b1c1c",marginBottom:2,borderBottom:"1px solid #d4a85330",paddingBottom:4}}>
                ⏰ இன்றைய நல்ல நேரம் / தவிர்க்க வேண்டிய நேரம்
              </div>
              <div style={{fontSize:9,color:"#666666",marginBottom:8,marginTop:4}}>
                சூரிய உதயம் {muhurtham.sunrise} • அஸ்தமனம் {muhurtham.sunset} (Chennai அடிப்படையில்)
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #e8e0e0"}}>
                <span style={{fontSize:8,fontWeight:700,color:"#4ade80",background:"#4ade8015",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>சுபம்</span>
                <span style={{fontSize:11,color:"#1a1a1a"}}>அபிஜித் முகூர்த்தம்</span>
                <span style={{fontSize:10,color:"#b8860b",marginLeft:"auto"}}>{muhurtham.abhijit}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #e8e0e0"}}>
                <span style={{fontSize:8,fontWeight:700,color:"#dc2626",background:"#ff6b8a15",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>தவிர்க்க</span>
                <span style={{fontSize:11,color:"#1a1a1a"}}>ராகு காலம்</span>
                <span style={{fontSize:10,color:"#b8860b",marginLeft:"auto"}}>{muhurtham.rahuKalam}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #e8e0e0"}}>
                <span style={{fontSize:8,fontWeight:700,color:"#dc2626",background:"#ff6b8a15",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>தவிர்க்க</span>
                <span style={{fontSize:11,color:"#1a1a1a"}}>எமகண்டம்</span>
                <span style={{fontSize:10,color:"#b8860b",marginLeft:"auto"}}>{muhurtham.yamagandam}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0"}}>
                <span style={{fontSize:8,fontWeight:700,color:"#dc2626",background:"#ff6b8a15",padding:"3px 8px",borderRadius:5,width:70,textAlign:"center"}}>தவிர்க்க</span>
                <span style={{fontSize:11,color:"#1a1a1a"}}>குளிகை</span>
                <span style={{fontSize:10,color:"#b8860b",marginLeft:"auto"}}>{muhurtham.kuligai}</span>
              </div>
            </div>
          )}

          {/* Today's Panchangam */}
          <div style={{...card,marginBottom:12,padding:"12px 14px",fontSize:12}}>
            <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
              இன்றைய பஞ்சாங்கம்
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>
                {[
                  ["திதி",`${today.tithi}, ${today.paksham}`],
                  ["நட்சத்திரம்",`${today.nakshatra}, பாதம் ${today.nakshatraPada||1}`],
                  ["யோகம்",today.yogam],
                  ["கரணம்",today.karanam],
                  ["சந்திர ராசி",today.moonRashi],
                ].map(([l,v],i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #e8e0e0"}}>
                    <td style={{padding:"4px 0",color:"#b8860b",width:"38%",fontWeight:600,fontSize:11}}>{l}</td>
                    <td style={{padding:"4px 0",color:"#888888",width:10}}>:</td>
                    <td style={{padding:"4px 6px",color:"#1a1a1a",fontWeight:600,fontSize:11}}>{v}</td>
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
                <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:10,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                  🍀 {today.isOtherDate?"அன்றைய அதிர்ஷ்ட விவரங்கள்":"இன்றைய அதிர்ஷ்ட விவரங்கள்"}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"linear-gradient(135deg,#f0c75e10,#d4a85308)",borderRadius:8,padding:"10px 12px",border:"1px solid #f0c75e18"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:4}}>🔢 {today.isOtherDate?"அன்றைய அதிர்ஷ்ட எண்கள்":"இன்றைய அதிர்ஷ்ட எண்கள்"}</div>
                    <div style={{fontSize:22,fontWeight:800,color:"#7b1c1c",letterSpacing:6}}>
                      {dailyNums.join("  ")}
                    </div>
                    <div style={{fontSize:8,color:"#777777",marginTop:3}}>திதி + நட்சத்திரம் + கிழமை எண்கணித அடிப்படை (classical தசா அல்ல)</div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,#b8860b15,#d4a85308)",borderRadius:8,padding:"10px 12px",border:"1px solid #b8860b25"}}>
                    <div style={{fontSize:9,color:"#555555",marginBottom:4}}>💎 ராசி ரத்தினம்</div>
                    <div style={{fontSize:12,fontWeight:700,color:"#b8860b"}}>{birthLucky.gem}</div>
                    <div style={{fontSize:10,color:"#666666",marginTop:3}}>உப: {birthLucky.subGem}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}}>
                  <div style={{background:"#4ade8008",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:8,color:"#666666"}}>நிரந்தர எண்</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#4ade80"}}>{birthLucky.nums.join(", ")}</div>
                  </div>
                  <div style={{background:"#f0c75e08",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:8,color:"#666666"}}>அதிர்ஷ்ட திசை</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>{birthLucky.dir}</div>
                  </div>
                  <div style={{background:"#f2ecda",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:8,color:"#666666"}}>{today.isOtherDate?"அன்று நட்சத்திரம்":"இன்று நட்சத்திரம்"}</div>
                    <div style={{fontSize:10,fontWeight:700,color:"#b8860b"}}>{todayNakLord.name}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═══ NIYAMAM & PARIKARAM — ராசிக்கான நியமங்கள் & பரிகாரங்கள் ═══ */}
          {remedy && (
            <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
                🕉 உங்கள் ராசிக்கான நியமங்கள் & பரிகாரங்கள்
              </div>

              {/* Constant Rashi info */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{background:"#f0c75e08",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:9,color:"#555555"}}>ஆட்சி கிரகம்</div>
                  <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>{remedy.rashiInfo.lord}</div>
                </div>
                <div style={{background:"#f0c75e08",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:9,color:"#555555"}}>வழிபட வேண்டிய தெய்வம்</div>
                  <div style={{fontSize:11,fontWeight:700,color:"#7b1c1c"}}>{remedy.rashiInfo.deity}</div>
                </div>
                <div style={{background:"#f2ecda",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:9,color:"#555555"}}>அணிய நல்ல நிறம்</div>
                  <div style={{fontSize:11,fontWeight:700,color:"#1a1a1a"}}>{remedy.rashiInfo.color}</div>
                </div>
                <div style={{background:"#f2ecda",borderRadius:6,padding:"7px 9px"}}>
                  <div style={{fontSize:9,color:"#555555"}}>ரத்தினம்</div>
                  <div style={{fontSize:11,fontWeight:700,color:"#1a1a1a"}}>{remedy.rashiInfo.gem}</div>
                </div>
              </div>
              <div style={{background:"#4ade8008",border:"1px solid #4ade8020",borderRadius:6,padding:"8px 10px",marginBottom:10}}>
                <div style={{fontSize:9,color:"#4ade8090"}}>தினசரி ஜபிக்க வேண்டிய மந்திரம்</div>
                <div style={{fontSize:12,fontWeight:600,color:"#4ade80",fontFamily:"serif",marginTop:2}}>{remedy.rashiInfo.mantra}</div>
              </div>

              {/* Today's specific remedy */}
              <div style={{borderTop:"1px dashed #d4a85330",paddingTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#1a1a1a",marginBottom:6}}>
                  📿 இன்று ({today.dayName}கிழமை) செய்ய வேண்டியவை
                </div>
                {remedy.isSpecialDay && (
                  <div style={{fontSize:10,background:"#e6d2d2",color:"#7b1c1c",padding:"4px 8px",borderRadius:6,marginBottom:6,fontWeight:600}}>
                    ⭐ இன்று உங்கள் ராசி நாதன் ({remedy.rashiInfo.lord}) நாள் — சிறப்பு நாள்!
                  </div>
                )}
                <div style={{fontSize:11,color:"#333333",lineHeight:1.7,marginBottom:6}}>
                  <span style={{color:"#b8860b"}}>வழிபாடு:</span> {remedy.dayInfo.remedy}
                </div>
                <div style={{fontSize:11,color:"#333333",lineHeight:1.7,marginBottom:6}}>
                  <span style={{color:"#b8860b"}}>தானம்:</span> {remedy.dayInfo.donate}
                </div>
                <div style={{fontSize:11,color:"#333333",lineHeight:1.7}}>
                  <span style={{color:"#b8860b"}}>தவிர்க்க வேண்டியது:</span> {remedy.dayInfo.avoid}
                </div>

                {/* Tithi-based guidance — changes daily (15-day cycle), keeps this from feeling like a 7-day repeat */}
                <div style={{marginTop:10,borderTop:"1px dashed #b8860b30",paddingTop:8}}>
                  <div style={{fontSize:10,color:"#b8860b",marginBottom:3}}>
                    🌙 இன்றைய திதி ({today.tithi}) வழிகாட்டுதல்
                  </div>
                  <div style={{fontSize:11,color:"#333333",lineHeight:1.6}}>
                    {remedy.tithiInfo.note} — <span style={{color:"#4ade80"}}>{remedy.tithiInfo.activity}</span>
                  </div>
                </div>

                {remedy.isChandrashtama && (
                  <div style={{marginTop:10,background:"#ff6b8a10",border:"1px solid #ff6b8a30",borderRadius:6,padding:"8px 10px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#dc2626",marginBottom:3}}>⚠ சந்திராஷ்டம பரிகாரம்</div>
                    <div style={{fontSize:10,color:"#333333",lineHeight:1.6}}>
                      இன்று புதிய காரியங்கள், பயணம், முக்கிய முடிவுகள் தவிர்க்கவும். சிவன் கோவிலில் "ஓம் நமசிவாய" 108 முறை ஜபிக்கவும். பால் அபிஷேகம் செய்தால் நல்லது.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gochara Transit Table */}
          <div style={{...card,marginBottom:12,padding:"12px 14px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#7b1c1c",marginBottom:8,borderBottom:"2px solid #b8860b30",borderLeft:"3px solid #7b1c1c",paddingBottom:4,paddingLeft:8,letterSpacing:0.5}}>
              கிரக கோசாரம் (உங்கள் ராசி: {horoscope.moonRashi})
            </div>
            {gochara.results.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 4px",
                borderBottom:i<gochara.results.length-1?"1px solid #7b1c1c08":"none",
                borderLeft:`3px solid ${grahaCardBorder(p.ta)}`,marginBottom:2,borderRadius:4,
                background:`${grahaCardBorder(p.ta)}08`}}>
                <span style={{fontSize:11,color:T.text,flex:1,fontWeight:600}}>{p.ta} — {p.rashi}</span>
                <span style={{fontSize:9,color:T.textMuted}}>{p.houseFromMoon}ஆம் வீடு</span>
                <span style={{
                  fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:5,
                  background:p.effect==="good"?T.good+"20":p.effect==="bad"?T.bad+"20":T.neutral+"15",
                  color:p.effect==="good"?T.good:p.effect==="bad"?T.bad:T.accentSoft
                }}>{p.effect==="good"?"சுபம்":p.effect==="bad"?"அசுபம்":"நடுநிலை"}</span>
              </div>
            ))}
          </div>

          {/* AI Daily Prediction */}
          <div style={{...card,marginBottom:12,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#d4a85330,#b8860b20)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
              <div style={{fontSize:13,fontWeight:600,color:"#7b1c1c"}}>AI தினப்பலன்</div>
            </div>
            {dailyLoading ? (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{width:26,height:26,margin:"0 auto 8px",border:"2px solid #d4a85320",borderTop:"2px solid #d4a853",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                <p style={{color:"#b8860b",fontSize:12}}>தினப்பலன் உருவாக்குகிறது...</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
              </div>
            ) : dailyPrediction ? (
              <div style={{fontSize:13,lineHeight:1.9,color:"#333333",whiteSpace:"pre-wrap"}}>{dailyPrediction}</div>
            ) : (
              <button style={{...btnGold,width:"auto",padding:"10px 24px",display:"inline-block",fontSize:13}} onClick={fetchDailyPrediction}>
                🔮 {today.isOtherDate?"அன்றைய பலன் பெறு":"இன்றைய பலன் பெறு"} →
              </button>
            )}
          </div>

          <button style={{...btnOutline,fontSize:12,padding:"10px 0"}} onClick={()=>goTo(SCREEN.RESULT)}>← ஜாதகத்திற்கு திரும்பு</button>
        </div>
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
      const isPournami = h.tithi === "பௌர்ணமி/அமாவாசை" && paksham.includes("சுக்ல");
      const isAmavasai = h.tithi === "பௌர்ணமி/அமாவாசை" && !paksham.includes("சுக்ல");
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
    const today = new Date();
    const isCurrentMonth = calMonth === today.getMonth() && calYear === today.getFullYear();

    return(
      <div style={base}>
        <div style={{...container,paddingTop:16,paddingBottom:30}}>
          <button onClick={()=>goTo(horoscope?SCREEN.RESULT:SCREEN.FORM)} style={{background:"none",border:"none",color:T.accent,fontSize:14,cursor:"pointer",padding:0,marginBottom:12}}>← பின் செல்</button>

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:14}}>
            <div style={{fontSize:11,color:"#666666",letterSpacing:3,marginBottom:2}}>✦ பஞ்சாங்கம் ✦</div>
            <div style={{fontSize:11,color:"#4ade80",marginTop:4}}>{TAMIL_MONTHS[tamilMonthPrevIdx]} / {TAMIL_MONTHS[tamilMonthIdx]} மாதம்</div>
            {calFetching && (
              <div style={{fontSize:9,color:"#b8860b80",marginTop:4}}>
                ⟳ துல்லியமான தரவை பின்னணியில் பெறுகிறது...
              </div>
            )}
          </div>

          {/* Month Navigator */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,padding:"8px 12px",
            background:"linear-gradient(135deg,#d4a85308,#b8860b10)",borderRadius:12,border:"1px solid #d4a85315"}}>
            <button onClick={()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);} else setCalMonth(m=>m-1); setCalSelected(1); }}
              style={{background:"none",border:"none",color:"#7b1c1c",fontSize:20,cursor:"pointer",padding:"4px 8px"}}>◂</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:17,fontWeight:700,color:"#7b1c1c",letterSpacing:1}}>{MONTH_NAMES_TA[calMonth]}</div>
              <div style={{fontSize:11,color:"#555555"}}>{calYear}</div>
            </div>
            <button onClick={()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);} else setCalMonth(m=>m+1); setCalSelected(1); }}
              style={{background:"none",border:"none",color:"#7b1c1c",fontSize:20,cursor:"pointer",padding:"4px 8px"}}>▸</button>
          </div>

          {/* Calendar Grid */}
          <div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,border:"1px solid #d4a85310",padding:"8px 6px",marginBottom:12}}>
            {/* Day headers */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:4}}>
              {DAY_SHORT.map((dh,i)=>(
                <div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,
                  color:i===0?"#dc2626":i===6?"#2563eb":"#555555",padding:"6px 0"}}>{dh}</div>
              ))}
            </div>
            {/* Date cells */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
              {Array.from({length:firstDay},(_,i)=>(<div key={`e${i}`}/>))}
              {calData.map((cd,i)=>{
                const isTodayCell = isCurrentMonth && cd.d === today.getDate();
                const isSelected = cd.d === calSelected;
                const bgMap = {festival:"#f0c75e10",good:"#4ade8008",bad:"#ff6b8a08",normal:"transparent"};
                const borderMap = {festival:"#f0c75e30",good:"#4ade8015",bad:"#ff6b8a15",normal:"#f0e0e0"};
                return(
                  <div key={i} onClick={()=>setCalSelected(cd.d)} style={{
                    background:isSelected?"#ede4cc":bgMap[cd.dayType],
                    border:isSelected?"1.5px solid #a78bfa":isTodayCell?"1.5px solid #f0c75e50":`1px solid ${borderMap[cd.dayType]}`,
                    borderRadius:8,padding:"3px 2px",minHeight:48,textAlign:"center",cursor:"pointer",
                    transition:"all 0.15s",position:"relative"
                  }}>
                    {isTodayCell && <div style={{position:"absolute",top:2,right:3,width:5,height:5,borderRadius:"50%",background:"#7b1c1c"}}/>}
                    <div style={{fontSize:14,fontWeight:700,color:
                      isSelected?"#b8860b":
                      cd.dayOfWeek===0?"#dc2626":
                      cd.isPournami||cd.isAmavasai?"#7b1c1c":
                      cd.dayType==="bad"?"#ff6b8a80":"#1a1a1a"
                    }}>{cd.d}</div>
                    <div style={{fontSize:6.5,color:cd.dayType==="festival"?"#7b1c1c":"#555555",lineHeight:1.2,marginTop:1,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cd.nakshatra?cd.nakshatra.slice(0,4):""}</div>
                    <div style={{fontSize:6,color:
                      cd.dayType==="good"?"#4ade80":
                      cd.dayType==="bad"?"#dc262680":"#777777",lineHeight:1.2}}>
                      {cd.isPournami?"🌕":cd.isAmavasai?"🌑":cd.isEkadashi?"🕉":""}
                      {cd.tithi?cd.tithi.slice(0,4):""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{fontSize:8,color:"#7b1c1c"}}>🌕 பௌர்ணமி</span>
            <span style={{fontSize:8,color:"#b8860b"}}>🌑 அமாவாசை</span>
            <span style={{fontSize:8,color:"#4ade80"}}>● சுபம்</span>
            <span style={{fontSize:8,color:"#dc2626"}}>● அசுபம்</span>
            <span style={{fontSize:8,color:"#7b1c1c"}}>🕉 ஏகாதசி</span>
          </div>

          {/* ═══ Selected Day Detail — Full Panchangam ═══ */}
          {sel && (
            <div style={{...card,padding:0,overflow:"hidden",marginBottom:12}}>
              {/* Day Header */}
              <div style={{background:"linear-gradient(135deg,#d4a85318,#b8860b15)",padding:"12px 14px",
                borderBottom:"1px solid #d4a85320"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:24,fontWeight:800,color:"#7b1c1c"}}>{sel.d}</div>
                    <div style={{fontSize:12,fontWeight:600,color:"#1a1a1a"}}>{DAY_NAMES_TA[sel.dayOfWeek]}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,color:"#b8860b"}}>{MONTH_NAMES_TA[calMonth]} {calYear}</div>
                    <div style={{fontSize:10,color:"#666666"}}>{TAMIL_MONTHS[tamilMonthPrevIdx]}/{TAMIL_MONTHS[tamilMonthIdx]}</div>
                    <div style={{fontSize:8,color:sel.isFromBackend?"#4ade80":"#66666680",marginTop:2}}>
                      {sel.isFromBackend ? "✓ Swiss Ephemeris" : "≈ local estimate"}
                    </div>
                  </div>
                </div>
                {(sel.isPournami||sel.isAmavasai||sel.isEkadashi||sel.isPradosham||sel.isChaturthi) && (
                  <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {sel.isPournami && <span style={{fontSize:9,background:"#f0c75e20",color:"#7b1c1c",padding:"2px 8px",borderRadius:10,fontWeight:600}}>🌕 பௌர்ணமி</span>}
                    {sel.isAmavasai && <span style={{fontSize:9,background:"#e8dcc0",color:"#b8860b",padding:"2px 8px",borderRadius:10,fontWeight:600}}>🌑 அமாவாசை</span>}
                    {sel.isEkadashi && <span style={{fontSize:9,background:"#4ade8020",color:"#4ade80",padding:"2px 8px",borderRadius:10,fontWeight:600}}>🕉 ஏகாதசி</span>}
                    {sel.isPradosham && <span style={{fontSize:9,background:"#e6d2d2",color:"#7b1c1c",padding:"2px 8px",borderRadius:10,fontWeight:600}}>🔱 பிரதோஷம்</span>}
                    {sel.isChaturthi && <span style={{fontSize:9,background:"#ff6b8a15",color:"#dc2626",padding:"2px 8px",borderRadius:10,fontWeight:600}}>🐘 சதுர்த்தி</span>}
                  </div>
                )}
              </div>

              {/* Panchangam 5 Angas */}
              <div style={{padding:"10px 14px",borderBottom:"1px solid #e8e0e0"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#b8860b",marginBottom:8,letterSpacing:1}}>☸ பஞ்சாங்கம் (5 அங்கங்கள்)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {[
                    {label:"வாரம்", value: DAY_NAMES_TA[sel.dayOfWeek], icon:"📅", color:"#1a1a1a"},
                    {label:"திதி", value: sel.tithi, icon:"🌙", color: sel.dayType==="bad"?"#dc2626":sel.dayType==="good"?"#4ade80":"#7b1c1c"},
                    {label:"நட்சத்திரம்", value: sel.nakshatra, icon:"⭐", color:"#b8860b"},
                    {label:"யோகம்", value: sel.yogam, icon:"☯", color:"#1a1a1a"},
                    {label:"கரணம்", value: sel.karanam, icon:"⚡", color:"#1a1a1a"},
                    {label:"பக்ஷம்", value: sel.paksham, icon: sel.paksham?.includes("சுக்ல")?"🌓":"🌗", color:"#b8860b"},
                  ].map((item,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",
                      background:"rgba(255,255,255,0.02)",borderRadius:6}}>
                      <span style={{fontSize:14}}>{item.icon}</span>
                      <div>
                        <div style={{fontSize:8,color:"#666666"}}>{item.label}</div>
                        <div style={{fontSize:11,fontWeight:600,color:item.color}}>{item.value||"—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Moon Rashi */}
              <div style={{padding:"8px 14px",borderBottom:"1px solid #e8e0e0",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>☽</span>
                <div>
                  <div style={{fontSize:8,color:"#666666"}}>சந்திர ராசி</div>
                  <div style={{fontSize:12,fontWeight:600,color:"#7b1c1c"}}>{sel.moonRashi||"—"}</div>
                </div>
              </div>

              {/* Sunrise / Sunset */}
              <div style={{padding:"8px 14px",borderBottom:"1px solid #e8e0e0"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18}}>🌅</span>
                    <div>
                      <div style={{fontSize:8,color:"#666666"}}>சூரிய உதயம்</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#7b1c1c",fontFamily:"monospace"}}>{sel.sunrise}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18}}>🌇</span>
                    <div>
                      <div style={{fontSize:8,color:"#666666"}}>சூரிய அஸ்தமனம்</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#dc2626",fontFamily:"monospace"}}>{sel.sunset}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kalam Table — Rahu, Ema, Gulikai, Abhijit */}
              <div style={{padding:"10px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#b8860b",marginBottom:8,letterSpacing:1}}>⏰ காலங்கள்</div>
                {[
                  {label:"ராகு காலம்", value:sel.rahuKalam, icon:"☊", color:"#dc2626", bg:"#ff6b8a08", desc:"தவிர்க்கவும்"},
                  {label:"எமகண்டம்", value:sel.yamagandam, icon:"💀", color:"#ff6b8a80", bg:"#ff6b8a05", desc:"தவிர்க்கவும்"},
                  {label:"குளிகை", value:sel.kuligai, icon:"⚠", color:"#b8860b", bg:"#f8f4ea", desc:"கவனம்"},
                  {label:"அபிஜித் முகூர்த்தம்", value:sel.abhijit, icon:"✨", color:"#4ade80", bg:"#4ade8008", desc:"மிகச் சிறந்தது"},
                ].map((k,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",marginBottom:4,
                    background:k.bg,borderRadius:8,borderLeft:`3px solid ${k.color}30`}}>
                    <span style={{fontSize:14,width:20,textAlign:"center"}}>{k.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,fontWeight:600,color:k.color}}>{k.label}</div>
                      <div style={{fontSize:8,color:"#777777"}}>{k.desc}</div>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:k.color,fontFamily:"monospace"}}>{k.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Today Button */}
          {!isCurrentMonth && (
            <button onClick={()=>{setCalMonth(today.getMonth());setCalYear(today.getFullYear());setCalSelected(today.getDate());}}
              style={{...btnOutline,fontSize:11,padding:"9px 0",borderColor:"#f0c75e30",color:"#7b1c1c"}}>
              📍 இன்றைய தேதிக்கு செல்
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}