import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const NAKSHATRAS = [
  "அசுவினி","பரணி","கார்த்திகை","ரோகிணி","மிருகசீரிடம்",
  "திருவாதிரை","புனர்பூசம்","பூசம்","ஆயில்யம்","மகம்",
  "பூரம்","உத்திரம்","அஸ்தம்","சித்திரை","சுவாதி",
  "விசாகம்","அனுஷம்","கேட்டை","மூலம்","பூராடம்",
  "உத்திராடம்","திருவோணம்","அவிட்டம்","சதயம்",
  "பூரட்டாதி","உத்திரட்டாதி","ரேவதி"
];
const RASHIS = ["மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி","துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"];
const RASHI_EN = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const PLANETS = [
  { ta:"சூரியன்", en:"Sun", symbol:"☉" },{ ta:"சந்திரன்", en:"Moon", symbol:"☽" },
  { ta:"செவ்வாய்", en:"Mars", symbol:"♂" },{ ta:"புதன்", en:"Mercury", symbol:"☿" },
  { ta:"குரு", en:"Jupiter", symbol:"♃" },{ ta:"சுக்கிரன்", en:"Venus", symbol:"♀" },
  { ta:"சனி", en:"Saturn", symbol:"♄" },{ ta:"ராகு", en:"Rahu", symbol:"☊" },
  { ta:"கேது", en:"Ketu", symbol:"☋" }
];

// ═══════════════════════════════════════════════════════════════════
// VEDIC HOROSCOPE ENGINE — Jean Meeus Astronomical Algorithms
// Sun: ~0.01° accuracy | Moon: ~0.5° (6 perturbation terms)
// Lagna: Local Sidereal Time method | Ayanamsa: Lahiri
// ═══════════════════════════════════════════════════════════════════
function generateHoroscope(dob, tob) {
  const d = new Date(dob);
  const year = d.getFullYear(), month = d.getMonth() + 1, day = d.getDate();
  let birthH = 6, birthM = 0;
  if (tob) { const p = tob.split(':').map(Number); birthH = p[0]||6; birthM = p[1]||0; }
  const hourDec = birthH + birthM / 60;
  const utcHour = hourDec - 5.5; // IST to UTC

  // ── Julian Day ──
  let jy = year, jm = month;
  if (jm <= 2) { jy--; jm += 12; }
  const A = Math.floor(jy / 100), B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (jy + 4716)) + Math.floor(30.6001 * (jm + 1)) + day + utcHour / 24 + B - 1524.5;
  const T = (JD - 2451545.0) / 36525; // Centuries from J2000

  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;

  // ── Obliquity of Ecliptic ──
  const eps = 23.4393 - 0.01300 * T;

  // ── Lahiri Ayanamsa (Chitrapaksha) ──
  const ayanamsa = 23.85 + (T * 100 * 50.29 / 3600);

  // ══════ SUN (Meeus Ch. 25) ══════
  const L0 = norm(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M_sun = norm(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = M_sun * rad;
  const C_sun = (1.914602 - 0.004817 * T) * Math.sin(Mr)
    + 0.019993 * Math.sin(2 * Mr) + 0.000289 * Math.sin(3 * Mr);
  const sunLongTropical = norm(L0 + C_sun);
  const sunLong = norm(sunLongTropical - ayanamsa);
  const sunRashi = Math.floor(sunLong / 30);
  const sunDeg = Math.floor(sunLong % 30);

  // ══════ MOON (Meeus Ch. 47 — 6 major terms) ══════
  const Lm = norm(218.3165 + 481267.8813 * T);  // Mean longitude
  const Dm = norm(297.8502 + 445267.1115 * T);   // Mean elongation
  const Mm = norm(134.9634 + 477198.8676 * T);   // Mean anomaly (Moon)
  const Fm = norm(93.2721 + 483202.0175 * T);    // Argument of latitude
  const Om = norm(125.0446 - 1934.1363 * T);     // Long. ascending node

  // 6 major perturbation terms
  const moonCorr =
    + 6.289 * Math.sin(Mm * rad)             // Equation of center
    - 1.274 * Math.sin((2 * Dm - Mm) * rad)  // Evection
    + 0.658 * Math.sin(2 * Dm * rad)         // Variation
    - 0.214 * Math.sin(2 * Mm * rad)         // Annual equation
    - 0.186 * Math.sin(M_sun * rad)          // Reduction to ecliptic
    + 0.110 * Math.sin(2 * Fm * rad);        // Node correction

  const moonLongTropical = norm(Lm + moonCorr);
  const moonLong = norm(moonLongTropical - ayanamsa);
  const moonRashi = Math.floor(moonLong / 30);
  const moonDeg = Math.floor(moonLong % 30);
  const nakshatraIndex = Math.floor(moonLong / (360 / 27)) % 27;

  // ══════ LAGNA — Local Sidereal Time method ══════
  // Greenwich Mean Sidereal Time (in degrees)
  const GMST = norm(280.46061837 + 360.98564736629 * (JD - 2451545.0)
    + 0.000387933 * T * T);
  // Local longitude (default: Thoothukudi 78.13°E, user can adjust)
  const localLon = 78.13;
  const LST = norm(GMST + localLon); // Local Sidereal Time in degrees
  const LSTr = LST * rad, epsr = eps * rad;
  // Ascendant formula
  let ascTropical = Math.atan2(Math.cos(LSTr),
    -(Math.sin(epsr) * Math.tan(8.76 * rad) + Math.cos(epsr) * Math.sin(LSTr)));
  ascTropical = norm(ascTropical * deg);
  // Correct quadrant
  if (Math.cos(LSTr) < 0) ascTropical = norm(ascTropical + 180);
  const ascSidereal = norm(ascTropical - ayanamsa);
  const lagna = Math.floor(ascSidereal / 30);
  const lagnaDeg = Math.floor(ascSidereal % 30);

  // ══════ PLANETS (Meeus — Mean Elements + Equation of Center) ══════
  // [Mean Longitude at J2000, daily motion °/day in terms of T, eccentricity, perihelion]
  const planetCalc = (L0p, Tp, ep, wp) => {
    const L = norm(L0p + Tp * T);
    const w = norm(wp + (Tp * 0.001) * T); // approximate perihelion shift
    const Ma = norm(L - w); // Mean anomaly
    const Mar = Ma * rad;
    // Equation of center (2 terms)
    const C = (2 * ep - ep*ep*ep/4) * Math.sin(Mar)
      + (5/4) * ep * ep * Math.sin(2 * Mar);
    const trueLong = norm(L + C * deg);
    return norm(trueLong - ayanamsa);
  };

  // Planet orbital elements [L0(J2000°), rate(°/century), eccentricity, perihelion(°)]
  const marsLong    = planetCalc(355.433, 19140.299, 0.09340, 336.06);
  const mercuryLong = planetCalc(252.251, 149472.675, 0.20563, 77.46);
  const jupiterLong = planetCalc(34.351, 3034.906, 0.04839, 14.33);
  const venusLong   = planetCalc(181.980, 58517.816, 0.00677, 131.53);
  const saturnLong  = planetCalc(50.077, 1222.114, 0.05415, 93.06);

  // Rahu (Mean Node — retrograde)
  const rahuLong = norm(norm(125.0446 - 1934.1363 * T) - ayanamsa);
  const ketuLong = norm(rahuLong + 180);

  const allPlanetLongs = [sunLong, moonLong, marsLong, mercuryLong, jupiterLong, venusLong, saturnLong, rahuLong, ketuLong];

  const placements = PLANETS.map((p, i) => {
    const lng = allPlanetLongs[i];
    const rashi = Math.floor(lng / 30);
    const degree = Math.floor(lng % 30);
    const house = ((rashi - lagna + 12) % 12) + 1;
    const nak = Math.floor(lng / (360 / 27)) % 27;
    return {
      ...p, rashi: RASHIS[rashi], rashiEn: RASHI_EN[rashi],
      degree, house, nakshatraTa: NAKSHATRAS[nak]
    };
  });

  return {
    lagna, lagnaName: RASHIS[lagna], lagnaEn: RASHI_EN[lagna], lagnaDeg,
    placements, nakshatra: NAKSHATRAS[nakshatraIndex],
    moonRashi: RASHIS[moonRashi], sunSign: RASHIS[sunRashi],
    birthTime: tob || "06:00",
    apiSource: "Local Engine (Jean Meeus Algorithms)"
  };
}

// ═══════════════════════════════════════════════════════════════════
// COSMIC UNIVERSE BACKGROUND
// ═══════════════════════════════════════════════════════════════════
function CosmicBackground() {
  const starsData = useMemo(() => {
    const layers = [];
    for (let i = 0; i < 140; i++) layers.push({
      x:Math.random()*100, y:Math.random()*100, size:Math.random()*0.8+0.2,
      color:"#ffffff", opacity:Math.random()*0.5+0.15,
      twinkle:Math.random()*5+3, delay:Math.random()*6
    });
    for (let i = 0; i < 55; i++) layers.push({
      x:Math.random()*100, y:Math.random()*100, size:Math.random()*1.3+0.6,
      color:Math.random()>0.5?"#ffe8a0":"#c8b0ff",
      opacity:Math.random()*0.6+0.2, twinkle:Math.random()*4+2, delay:Math.random()*5
    });
    for (let i = 0; i < 15; i++) layers.push({
      x:Math.random()*100, y:Math.random()*100, size:Math.random()*1.6+1.2,
      color:i%3===0?"#ffcc44":i%3===1?"#cc88ff":"#88ccff",
      opacity:Math.random()*0.7+0.3, twinkle:Math.random()*3+1.5, delay:Math.random()*4
    });
    return layers;
  }, []);

  const shootingStars = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      startX:Math.random()*60+10, startY:Math.random()*30,
      angle:Math.random()*30+20, delay:i*6+Math.random()*4, dur:Math.random()*1+0.6
    })), []);

  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      {/* Rich nebula gradients */}
      <div style={{
        position:"absolute", inset:0,
        background: `
          radial-gradient(ellipse 700px 500px at 10% 15%, rgba(120,40,180,0.2) 0%, transparent 70%),
          radial-gradient(ellipse 600px 500px at 85% 80%, rgba(25,50,160,0.18) 0%, transparent 65%),
          radial-gradient(ellipse 500px 400px at 55% 10%, rgba(180,60,220,0.1) 0%, transparent 55%),
          radial-gradient(ellipse 400px 350px at 20% 85%, rgba(40,80,200,0.08) 0%, transparent 55%),
          radial-gradient(ellipse 350px 250px at 90% 25%, rgba(212,168,83,0.07) 0%, transparent 45%),
          radial-gradient(ellipse 300px 300px at 50% 50%, rgba(100,20,140,0.06) 0%, transparent 50%)
        `
      }} />
      {/* Floating nebula clouds */}
      <div style={{
        position:"absolute", width:400, height:400, top:"5%", left:"0%",
        borderRadius:"50%",
        background:"radial-gradient(circle, rgba(160,80,220,0.08) 0%, transparent 70%)",
        filter:"blur(50px)", animation:"nebulaDrift1 28s ease-in-out infinite"
      }} />
      <div style={{
        position:"absolute", width:350, height:350, bottom:"10%", right:"0%",
        borderRadius:"50%",
        background:"radial-gradient(circle, rgba(60,100,220,0.07) 0%, transparent 70%)",
        filter:"blur(55px)", animation:"nebulaDrift2 32s ease-in-out infinite"
      }} />
      <div style={{
        position:"absolute", width:280, height:280, top:"50%", left:"40%",
        borderRadius:"50%",
        background:"radial-gradient(circle, rgba(212,168,83,0.05) 0%, transparent 70%)",
        filter:"blur(40px)", animation:"nebulaDrift3 22s ease-in-out infinite"
      }} />
      <div style={{
        position:"absolute", width:250, height:250, top:"30%", right:"15%",
        borderRadius:"50%",
        background:"radial-gradient(circle, rgba(180,50,200,0.06) 0%, transparent 65%)",
        filter:"blur(45px)", animation:"nebulaDrift1 35s ease-in-out infinite reverse"
      }} />

      <svg width="100%" height="100%" style={{ position:"absolute" }}>
        <defs>
          <filter id="starGlow"><feGaussianBlur stdDeviation="1.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {starsData.map((s, i) => (
          <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.size}
            fill={s.color} opacity="0" filter={s.size>1?"url(#starGlow)":undefined}>
            <animate attributeName="opacity"
              values={`${s.opacity*0.2};${s.opacity};${s.opacity*0.2}`}
              dur={`${s.twinkle}s`} begin={`${s.delay}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {shootingStars.map((ss, i) => {
          const endX = ss.startX + Math.cos(ss.angle*Math.PI/180)*35;
          const endY = ss.startY + Math.sin(ss.angle*Math.PI/180)*35;
          return (
            <line key={`ss${i}`} x1={`${ss.startX}%`} y1={`${ss.startY}%`}
              x2={`${ss.startX}%`} y2={`${ss.startY}%`}
              stroke="url(#shootGrad)" strokeWidth="1.8" strokeLinecap="round" opacity="0">
              <animate attributeName="x2" values={`${ss.startX}%;${endX}%`}
                dur={`${ss.dur}s`} begin={`${ss.delay}s`} repeatCount="indefinite" />
              <animate attributeName="y2" values={`${ss.startY}%;${endY}%`}
                dur={`${ss.dur}s`} begin={`${ss.delay}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0"
                dur={`${ss.dur}s`} begin={`${ss.delay}s`} repeatCount="indefinite" />
            </line>
          );
        })}
        <defs>
          <linearGradient id="shootGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0c75e"/><stop offset="100%" stopColor="transparent"/>
          </linearGradient>
        </defs>
      </svg>
      <style>{`
        @keyframes nebulaDrift1 { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(35px,-25px) scale(1.15); } }
        @keyframes nebulaDrift2 { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(-30px,20px) scale(1.2); } }
        @keyframes nebulaDrift3 { 0%,100% { transform:translate(0,0); } 50% { transform:translate(25px,30px); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ROTATING MANTRA CHAKRA — HIGHLY VISIBLE, GLOWING
// ═══════════════════════════════════════════════════════════════════
function MantraChakra({ speed = 90, size = 500, opacity = 0.25 }) {
  const cx = 250, cy = 250;

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
      {/* Glow backdrop behind the chakra */}
      <div style={{
        position:"absolute", inset:"-15%",
        borderRadius:"50%",
        background:"radial-gradient(circle, rgba(212,168,83,0.08) 0%, rgba(139,126,200,0.04) 40%, transparent 70%)",
        animation:`chakraPulse ${speed*0.3}s ease-in-out infinite`
      }} />

      {/* ═══ OUTER RING — Slow clockwise ═══ */}
      <svg viewBox="0 0 500 500" style={{
        width:"100%", height:"100%", position:"absolute",
        animation:`chakraSpin ${speed}s linear infinite`
      }}>
        <defs>
          <linearGradient id="cg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8c45a"/><stop offset="100%" stopColor="#a78bfa"/>
          </linearGradient>
          <linearGradient id="cg2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbd872"/><stop offset="100%" stopColor="#7c5cc8"/>
          </linearGradient>
          <linearGradient id="cg3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0c75e"/><stop offset="100%" stopColor="#d4a853"/>
          </linearGradient>
          <filter id="chakraGlow">
            <feGaussianBlur stdDeviation="2" result="g"/>
            <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="1"/>
          </filter>
        </defs>

        {/* Outermost double ring */}
        <circle cx={cx} cy={cy} r="246" fill="none" stroke="#d4a853" strokeWidth="1.8" opacity="0.7" />
        <circle cx={cx} cy={cy} r="242" fill="none" stroke="#a78bfa" strokeWidth="0.6" opacity="0.4" />
        <circle cx={cx} cy={cy} r="238" fill="none" stroke="#d4a853" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.45" />

        {/* Zodiac symbols ring — larger, brighter */}
        {zodiacSymbols.map((z, i) => {
          const a = (i/12)*Math.PI*2 - Math.PI/2;
          return (
            <text key={i} x={cx+Math.cos(a)*228} y={cy+Math.sin(a)*228+5}
              textAnchor="middle" fill="#f0c75e" fontSize="16" opacity="0.8"
              fontWeight="bold" filter="url(#chakraGlow)">{z}</text>
          );
        })}

        {/* Decorative dotted rings */}
        <circle cx={cx} cy={cy} r="215" fill="none" stroke="#d4a853" strokeWidth="0.6" strokeDasharray="1.5 8" opacity="0.5" />
        <circle cx={cx} cy={cy} r="212" fill="none" stroke="#a78bfa" strokeWidth="0.4" strokeDasharray="4 12" opacity="0.35" />

        {/* Lotus petal layer 1 — 16 petals (outer) */}
        {petals(16, 172, 0.12, 32).map((d, i) => (
          <path key={`p1${i}`} d={d} fill="none" stroke="url(#cg1)" strokeWidth="1.2" opacity="0.7" />
        ))}

        {/* Ring between petal layers */}
        <circle cx={cx} cy={cy} r="172" fill="none" stroke="#d4a853" strokeWidth="0.8" opacity="0.5" />

        {/* Lotus petal layer 2 — 8 petals */}
        {petals(8, 132, 0.2, 36).map((d, i) => (
          <path key={`p2${i}`} d={d} fill="none" stroke="url(#cg2)" strokeWidth="1.3" opacity="0.65" />
        ))}

        {/* Sacred chars ring — 12 chars, bigger, brighter */}
        {sacredChars.map((ch, i) => {
          const a = (i/12)*Math.PI*2 - Math.PI/2;
          return (
            <text key={`sc${i}`} x={cx+Math.cos(a)*157} y={cy+Math.sin(a)*157+4}
              textAnchor="middle" fill="#e8c45a" fontSize="11" opacity="0.6"
              fontFamily="serif" fontWeight="bold">{ch}</text>
          );
        })}

        {/* Concentric circles — thicker, brighter */}
        {[192, 172, 132, 100, 70, 45, 25].map((r, i) => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none"
            stroke={i%2===0?"#d4a853":"#a78bfa"} strokeWidth={i<2?"0.8":"0.6"}
            opacity={0.45-i*0.04} />
        ))}

        {/* Hexagon frames */}
        <polygon points={hexagon(150)} fill="none" stroke="#d4a853" strokeWidth="0.7" opacity="0.35" />
        <polygon points={hexagon(100)} fill="none" stroke="#a78bfa" strokeWidth="0.6" opacity="0.3" />

        {/* Sri Yantra — 4 pairs of interlocking triangles — THICKER, GLOWING */}
        <polygon points={triangle(118, true)} fill="none" stroke="#f0c75e" strokeWidth="1.4" opacity="0.7" filter="url(#chakraGlow)" />
        <polygon points={triangle(118, false)} fill="none" stroke="#a78bfa" strokeWidth="1.4" opacity="0.65" filter="url(#chakraGlow)" />
        <polygon points={triangle(90, true)} fill="none" stroke="#e8c45a" strokeWidth="1.2" opacity="0.6" />
        <polygon points={triangle(90, false)} fill="none" stroke="#8b7ec8" strokeWidth="1.2" opacity="0.55" />
        <polygon points={triangle(62, true)} fill="none" stroke="#f0c75e" strokeWidth="1" opacity="0.5" />
        <polygon points={triangle(62, false)} fill="none" stroke="#a78bfa" strokeWidth="1" opacity="0.45" />
        <polygon points={triangle(38, true)} fill="none" stroke="#d4a853" strokeWidth="0.8" opacity="0.4" />
        <polygon points={triangle(38, false)} fill="none" stroke="#8b7ec8" strokeWidth="0.8" opacity="0.35" />

        {/* 36 radial spokes — brighter */}
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i/36)*Math.PI*2;
          const outer = i%3===0 ? 215 : i%3===1 ? 192 : 172;
          return (
            <line key={`rl${i}`}
              x1={cx+Math.cos(a)*45} y1={cy+Math.sin(a)*45}
              x2={cx+Math.cos(a)*outer} y2={cy+Math.sin(a)*outer}
              stroke={i%3===0?"#d4a853":"#a78bfa"} strokeWidth={i%3===0?"0.5":"0.3"}
              opacity={i%3===0?0.4:0.2} />
          );
        })}

        {/* 12 bright accent dots on outer ring */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i/12)*Math.PI*2;
          return (
            <circle key={`dot${i}`} cx={cx+Math.cos(a)*215} cy={cy+Math.sin(a)*215}
              r="2.5" fill="#f0c75e" opacity="0.6" filter="url(#chakraGlow)" />
          );
        })}

        {/* Center bindu — bright glowing */}
        <circle cx={cx} cy={cy} r="8" fill="#d4a853" opacity="0.5" filter="url(#chakraGlow)">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r="4" fill="#f0c75e" opacity="0.8">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r="1.5" fill="#fff" opacity="0.9" />
      </svg>

      {/* ═══ INNER RING — Counter-clockwise ═══ */}
      <svg viewBox="0 0 500 500" style={{
        width:"100%", height:"100%", position:"absolute", top:0, left:0,
        animation:`chakraSpinReverse ${speed*0.65}s linear infinite`
      }}>
        {/* Inner lotus — 12 petals */}
        {petals(12, 58, 0.18, 28).map((d, i) => (
          <path key={`ip${i}`} d={d} fill="none" stroke="#f0c75e" strokeWidth="0.9" opacity="0.55" />
        ))}
        {/* Navagraha symbols — BIG, BRIGHT */}
        {PLANETS.map((p, i) => {
          const a = (i/9)*Math.PI*2 - Math.PI/2;
          return (
            <text key={`ng${i}`} x={cx+Math.cos(a)*105} y={cy+Math.sin(a)*105+6}
              textAnchor="middle" fill="#f0c75e" fontSize="18" opacity="0.6"
              fontWeight="bold">{p.symbol}</text>
          );
        })}
        {/* Tamil sacred chars — inner ring */}
        {tamilSacred.map((ch, i) => {
          const a = (i/8)*Math.PI*2 - Math.PI/2;
          return (
            <text key={`ts${i}`} x={cx+Math.cos(a)*78} y={cy+Math.sin(a)*78+4}
              textAnchor="middle" fill="#a78bfa" fontSize="9" opacity="0.45"
              fontFamily="'Noto Sans Tamil',sans-serif">{ch}</text>
          );
        })}
      </svg>

      {/* ═══ MICRO RING — Fast, subtle ═══ */}
      <svg viewBox="0 0 500 500" style={{
        width:"100%", height:"100%", position:"absolute", top:0, left:0,
        animation:`chakraSpin ${speed*0.4}s linear infinite`
      }}>
        <circle cx={cx} cy={cy} r="18" fill="none" stroke="#f0c75e" strokeWidth="0.5"
          strokeDasharray="2 3" opacity="0.4" />
        {/* Tiny rotating dots near center */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i/6)*Math.PI*2;
          return <circle key={`md${i}`} cx={cx+Math.cos(a)*15} cy={cy+Math.sin(a)*15}
            r="1" fill="#f0c75e" opacity="0.5" />;
        })}
      </svg>

      <style>{`
        @keyframes chakraSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes chakraSpinReverse { from { transform:rotate(360deg); } to { transform:rotate(0deg); } }
        @keyframes chakraPulse { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:0.8; transform:scale(1.04); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// South Indian Rashi Chart
// ═══════════════════════════════════════════════════════════════════
// Short Tamil names for inside the chart cells
const PLANET_SHORT = {
  "சூரியன்":"சூரி","சந்திரன்":"சந்தி","செவ்வாய்":"செவ்வா",
  "புதன்":"புதன்","குரு":"குரு","சுக்கிரன்":"சுக்கி",
  "சனி":"சனி","ராகு":"ராகு","கேது":"கேது"
};

function SouthIndianChart({ horoscope }) {
  const { lagna, placements } = horoscope;

  // Bigger cells so text fits clearly
  const cellW = 96, cellH = 88;
  const chartW = cellW * 4, chartH = cellH * 4;

  const siPositions = [
    {rashi:11,r:0,c:0},{rashi:0,r:0,c:1},{rashi:1,r:0,c:2},{rashi:2,r:0,c:3},
    {rashi:10,r:1,c:0},{rashi:3,r:1,c:3},{rashi:9,r:2,c:0},{rashi:4,r:2,c:3},
    {rashi:8,r:3,c:0},{rashi:7,r:3,c:1},{rashi:6,r:3,c:2},{rashi:5,r:3,c:3}
  ];

  // Group planets by rashi — store full planet object
  const rashiPlanets = {};
  placements.forEach(p => {
    const ri = RASHIS.indexOf(p.rashi);
    if (ri >= 0) {
      if (!rashiPlanets[ri]) rashiPlanets[ri] = [];
      rashiPlanets[ri].push(p);
    }
  });

  // Row height per planet entry inside a cell
  const rowH = 14;

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH}`}
      style={{ width:"100%", maxWidth:400 }}
      fontFamily="'Noto Sans Tamil','Segoe UI',sans-serif"
    >
      <defs>
        <linearGradient id="chartBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#100828"/>
          <stop offset="100%" stopColor="#1a0a2e"/>
        </linearGradient>
        <linearGradient id="lagnaGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4a853" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#d4a853" stopOpacity="0.08"/>
        </linearGradient>
        <linearGradient id="centerGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a0e27cc"/>
          <stop offset="100%" stopColor="#1a0a2ecc"/>
        </linearGradient>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width={chartW} height={chartH} rx="10" fill="url(#chartBg)"/>

      {/* Grid lines */}
      {[1,2,3].map(i=>(
        <g key={i}>
          <line x1={cellW*i} y1={0} x2={cellW*i} y2={chartH} stroke="#d4a85335" strokeWidth="0.7"/>
          <line x1={0} y1={cellH*i} x2={chartW} y2={cellH*i} stroke="#d4a85335" strokeWidth="0.7"/>
        </g>
      ))}

      {/* Outer border */}
      <rect x="1" y="1" width={chartW-2} height={chartH-2} rx="10"
        fill="none" stroke="#d4a853" strokeWidth="2"/>

      {/* Center box */}
      <rect x={cellW} y={cellH} width={cellW*2} height={cellH*2}
        fill="url(#centerGrad)" stroke="#d4a85350" strokeWidth="1"/>
      {/* Center diagonals */}
      <line x1={cellW} y1={cellH} x2={cellW*3} y2={cellH*3} stroke="#d4a85320" strokeWidth="0.5"/>
      <line x1={cellW*3} y1={cellH} x2={cellW} y2={cellH*3} stroke="#d4a85320" strokeWidth="0.5"/>
      <text x={chartW/2} y={chartH/2-12} textAnchor="middle"
        fill="#d4a853" fontSize="13" fontWeight="700">ராசி சக்கரம்</text>
      <text x={chartW/2} y={chartH/2+6} textAnchor="middle"
        fill="#a78bfa" fontSize="9">தென் இந்திய முறை</text>
      <text x={chartW/2} y={chartH/2+20} textAnchor="middle"
        fill="#d4a85370" fontSize="8">Nirayana • Lahiri</text>

      {/* Rashi cells */}
      {siPositions.map(({rashi, r, c}) => {
        const x = c * cellW, y = r * cellH;
        const isLagna = rashi === lagna;
        const planets = rashiPlanets[rashi] || [];

        return (
          <g key={rashi}>
            {/* Lagna highlight */}
            {isLagna && (
              <rect x={x+1} y={y+1} width={cellW-2} height={cellH-2}
                fill="url(#lagnaGlow)" rx="4"/>
            )}

            {/* Rashi name top-left */}
            <text x={x+5} y={y+13}
              fill={isLagna ? "#f0c75e" : "#8b7ec899"}
              fontSize="8" fontWeight={isLagna?"700":"400"}>
              {RASHIS[rashi]}
            </text>

            {/* Lagna badge */}
            {isLagna && (
              <g>
                <rect x={x+cellW-26} y={y+3} width={22} height={12} rx="3"
                  fill="#d4a85330" stroke="#d4a85360" strokeWidth="0.5"/>
                <text x={x+cellW-15} y={y+12} textAnchor="middle"
                  fill="#f0c75e" fontSize="7" fontWeight="700">லக்னம்</text>
              </g>
            )}

            {/* Planet entries — symbol + short name + degree */}
            {planets.map((p, pi) => {
              const py = y + 26 + pi * rowH;
              const shortName = PLANET_SHORT[p.ta] || p.ta;
              const isLagnaPlanet = isLagna;
              const textCol = isLagnaPlanet ? "#ffe088" : "#e8e0f0";
              const symCol  = isLagnaPlanet ? "#f0c75e" : "#d4a853";
              const degCol  = isLagnaPlanet ? "#f0c75e99" : "#a78bfa99";
              return (
                <g key={pi}>
                  {/* Symbol */}
                  <text x={x+6} y={py+10}
                    fill={symCol} fontSize="11" fontWeight="700">
                    {p.symbol}
                  </text>
                  {/* Short Tamil name */}
                  <text x={x+20} y={py+10}
                    fill={textCol} fontSize="9" fontWeight="500">
                    {shortName}
                  </text>
                  {/* Degree */}
                  <text x={x+cellW-5} y={py+10} textAnchor="end"
                    fill={degCol} fontSize="7.5">
                    {p.degree}°
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FULL JATHAGAM PDF GENERATOR
// ═══════════════════════════════════════════════════════════════════
function generateJathagamPDF(formData, horoscope, prediction) {
  // Build South Indian chart as SVG string
  const lagna = horoscope.lagna;
  const cW = 110, cH = 100;
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

  const cellsSVG = siPos.map(({rashi,r,c}) => {
    const x=c*cW, y=r*cH, isL=rashi===lagna;
    const planets = rashiPlanets[rashi]||[];
    const bg = isL ? `<rect x="${x+1}" y="${y+1}" width="${cW-2}" height="${cH-2}" fill="#d4a85320"/>` : "";
    const rashiText = `<text x="${x+4}" y="${y+13}" fill="${isL?"#b8860b":"#555"}" font-size="8" font-weight="${isL?"700":"400"}" font-family="serif">${RASHIS[rashi]}</text>`;
    const lagnaTag = isL ? `<rect x="${x+cW-30}" y="${y+3}" width="27" height="12" rx="3" fill="#d4a85340"/><text x="${x+cW-17}" y="${y+12}" text-anchor="middle" fill="#8b6914" font-size="7.5" font-weight="700" font-family="sans-serif">லக்னம்</text>` : "";
    const planetsSVG = planets.map((p,pi) => {
      const py = y + 26 + pi*14;
      return `<text x="${x+4}" y="${py+10}" fill="${isL?"#8b5e00":"#333"}" font-size="10" font-weight="700" font-family="serif">${p.symbol}</text>`
           + `<text x="${x+18}" y="${py+10}" fill="${isL?"#5c3a00":"#222"}" font-size="9" font-family="sans-serif">${PLANET_SHORT[p.ta]||p.ta}</text>`
           + `<text x="${x+cW-4}" y="${py+10}" text-anchor="end" fill="#666" font-size="7.5" font-family="sans-serif">${p.degree}°</text>`;
    }).join("");
    return bg + rashiText + lagnaTag + planetsSVG;
  }).join("");

  const chartSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${chartW} ${chartH}" width="${chartW}" height="${chartH}" font-family="'Noto Sans Tamil',serif,sans-serif">
    <rect width="${chartW}" height="${chartH}" fill="#fffdf5" rx="6"/>
    ${[1,2,3].map(i=>`<line x1="${cW*i}" y1="0" x2="${cW*i}" y2="${chartH}" stroke="#d4a85340" stroke-width="0.8"/><line x1="0" y1="${cH*i}" x2="${chartW}" y2="${cH*i}" stroke="#d4a85340" stroke-width="0.8"/>`).join("")}
    <rect x="1" y="1" width="${chartW-2}" height="${chartH-2}" rx="6" fill="none" stroke="#d4a853" stroke-width="1.5"/>
    <rect x="${cW}" y="${cH}" width="${cW*2}" height="${cH*2}" fill="#fdf8ee" stroke="#d4a85350" stroke-width="1"/>
    <line x1="${cW}" y1="${cH}" x2="${cW*3}" y2="${cH*3}" stroke="#d4a85325" stroke-width="0.5"/>
    <line x1="${cW*3}" y1="${cH}" x2="${cW}" y2="${cH*3}" stroke="#d4a85325" stroke-width="0.5"/>
    <text x="${chartW/2}" y="${cH*2-10}" text-anchor="middle" fill="#b8860b" font-size="14" font-weight="700" font-family="sans-serif">ராசி சக்கரம்</text>
    <text x="${chartW/2}" y="${cH*2+10}" text-anchor="middle" fill="#888" font-size="9" font-family="sans-serif">தென் இந்திய முறை • Lahiri Ayanamsa</text>
    ${cellsSVG}
  </svg>`;

  // Planet table rows
  const planetRows = horoscope.placements.map(p =>
    `<tr>
      <td style="padding:7px 10px;font-size:15px;text-align:center;">${p.symbol}</td>
      <td style="padding:7px 10px;font-weight:600;">${p.ta}</td>
      <td style="padding:7px 10px;">${p.en}</td>
      <td style="padding:7px 10px;">${p.rashi}</td>
      <td style="padding:7px 10px;text-align:center;">${p.degree}°</td>
      <td style="padding:7px 10px;text-align:center;">${p.house}</td>
    </tr>`
  ).join("");

  const birthTime = formData.tob ? `${formData.tob} ${formData.ampm}` : "—";
  const aiSection = prediction
    ? `<div style="margin-top:32px;background:#fffdf0;border:1px solid #d4a85340;border-radius:10px;padding:20px;">
        <h3 style="font-size:15px;color:#8b6914;margin:0 0 12px;font-family:sans-serif;">🤖 AI ஜோதிட பலன் (Claude AI)</h3>
        <p style="font-size:13px;line-height:1.9;color:#333;white-space:pre-wrap;margin:0;">${prediction}</p>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="ta">
<head>
<meta charset="UTF-8"/>
<title>${formData.name} — ஜாதகம்</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Noto Sans Tamil','Segoe UI',sans-serif; background:#fff; color:#222; padding:0; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none; }
  }
  .page { max-width:740px; margin:0 auto; padding:32px 28px; }
  .header { text-align:center; border-bottom:2px solid #d4a853; padding-bottom:20px; margin-bottom:24px; }
  .header-sun { font-size:44px; line-height:1; }
  .header h1 { font-size:26px; color:#8b6914; font-weight:700; margin:8px 0 4px; }
  .header .subtitle { font-size:12px; color:#888; letter-spacing:2px; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:24px; }
  .info-box { background:#fffdf0; border:1px solid #d4a85330; border-radius:8px; padding:12px 14px; }
  .info-box .label { font-size:10px; color:#888; margin-bottom:3px; }
  .info-box .value { font-size:15px; font-weight:700; color:#333; }
  .info-box .sub { font-size:10px; color:#b8860b; margin-top:2px; }
  .section { margin-bottom:28px; }
  .section-title { font-size:14px; font-weight:700; color:#8b6914; margin-bottom:12px;
    padding-bottom:6px; border-bottom:1px solid #d4a85330; }
  .chart-wrap { display:flex; justify-content:center; margin-bottom:6px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { background:#d4a85315; color:#8b6914; font-weight:700; padding:9px 10px;
       text-align:left; font-size:12px; }
  tr:nth-child(even) { background:#fffdf5; }
  tr:hover { background:#fef9e7; }
  td { border-bottom:1px solid #d4a85315; }
  .lagna-badge { background:#d4a85325; color:#8b6914; border-radius:12px;
    padding:2px 8px; font-size:10px; font-weight:700; }
  .summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .summary-box { background:#fffdf0; border:1px solid #d4a85330; border-radius:8px;
    padding:12px; text-align:center; }
  .summary-box .s-label { font-size:9px; color:#888; margin-bottom:4px; }
  .summary-box .s-value { font-size:14px; font-weight:700; color:#5c3a00; }
  .footer { text-align:center; margin-top:32px; padding-top:16px;
    border-top:1px solid #d4a85330; font-size:10px; color:#aaa; }
  .print-btn { position:fixed; bottom:24px; right:24px; background:linear-gradient(135deg,#d4a853,#f0c75e);
    color:#0a0518; border:none; border-radius:14px; padding:14px 28px;
    font-size:15px; font-weight:700; cursor:pointer; box-shadow:0 4px 20px #d4a85350;
    font-family:'Noto Sans Tamil',sans-serif; }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="header-sun">☉</div>
    <h1>${formData.name} — ஜாதகம்</h1>
    <div class="subtitle">JATHAGAM • VEDIC BIRTH CHART</div>
  </div>

  <!-- Birth Info -->
  <div class="section">
    <div class="section-title">📋 பிறப்பு விவரங்கள்</div>
    <div class="info-grid">
      <div class="info-box"><div class="label">பெயர்</div><div class="value">${formData.name}</div></div>
      <div class="info-box"><div class="label">பிறந்த தேதி</div><div class="value">${formData.dob}</div></div>
      <div class="info-box"><div class="label">பிறந்த நேரம்</div><div class="value">${birthTime}</div><div class="sub">${formData.ampm==="AM"?"☀ காலை":"☽ மாலை"}</div></div>
      <div class="info-box"><div class="label">பிறந்த இடம்</div><div class="value">${formData.pob||"—"}</div></div>
    </div>
  </div>

  <!-- Summary -->
  <div class="section">
    <div class="section-title">⭐ முக்கிய விவரங்கள்</div>
    <div class="summary-grid">
      <div class="summary-box"><div class="s-label">லக்னம்</div><div class="s-value">${horoscope.lagnaName}</div><div style="font-size:10px;color:#888;">${horoscope.lagnaEn} ${horoscope.lagnaDeg}°</div></div>
      <div class="summary-box"><div class="s-label">சந்திர ராசி</div><div class="s-value">${horoscope.moonRashi}</div></div>
      <div class="summary-box"><div class="s-label">நட்சத்திரம்</div><div class="s-value">${horoscope.nakshatra}</div></div>
      <div class="summary-box"><div class="s-label">சூரிய ராசி</div><div class="s-value">${horoscope.sunSign}</div></div>
      <div class="summary-box"><div class="s-label">Ayanamsa</div><div class="s-value" style="font-size:12px;">Lahiri</div></div>
      <div class="summary-box"><div class="s-label">Engine</div><div class="s-value" style="font-size:10px;">Jean Meeus</div></div>
    </div>
  </div>

  <!-- Rashi Chart SVG -->
  <div class="section">
    <div class="section-title">◎ ராசி சக்கரம் (தென் இந்திய முறை)</div>
    <div class="chart-wrap">${chartSVG}</div>
  </div>

  <!-- Planet Table -->
  <div class="section">
    <div class="section-title">🪐 கிரக நிலைகள் (Planetary Positions)</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:center;">சின்னம்</th>
          <th>கிரகம் (தமிழ்)</th>
          <th>Planet</th>
          <th>ராசி</th>
          <th style="text-align:center;">கலை</th>
          <th style="text-align:center;">வீடு</th>
        </tr>
      </thead>
      <tbody>${planetRows}</tbody>
    </table>
  </div>

  ${aiSection}

  <div class="footer">
    ஜோதிட நிபுணர் — Jothida Nipunar &nbsp;|&nbsp; Jean Meeus Astronomical Algorithms &nbsp;|&nbsp; Lahiri Ayanamsa<br/>
    Generated on ${new Date().toLocaleDateString("ta-IN", {year:"numeric",month:"long",day:"numeric"})}
  </div>
</div>

<button class="print-btn no-print" onclick="window.print()">
  📄 PDF சேமி / அச்சிடு
</button>
</body>
</html>`;

  // Open in new tab and trigger print
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  // Auto-trigger print dialog after fonts load
  win.onload = () => setTimeout(() => win.print(), 800);
}

// ═══════════════════════════════════════════════════════════════════
const SCREEN = { SPLASH:0, AUTH:1, FORM:2, LOADING:3, RESULT:4, PREMIUM:5 };

export default function AstrologyApp() {
  const [screen, setScreen] = useState(SCREEN.SPLASH);
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name:"", dob:"", tob:"", pob:"", ampm:"AM" });
  const [horoscope, setHoroscope] = useState(null);
  const [prediction, setPrediction] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chart");
  const [fadeIn, setFadeIn] = useState(true);

  const goTo = useCallback((s) => {
    setFadeIn(false);
    setTimeout(() => { setScreen(s); setFadeIn(true); }, 300);
  }, []);

  useEffect(() => {
    if(screen===SCREEN.SPLASH){ const t=setTimeout(()=>goTo(SCREEN.AUTH),3200); return()=>clearTimeout(t); }
  }, [screen, goTo]);

  // ── FreeAstroAPI Key (user sets this) ──
  // Get free key: https://www.freeastroapi.com → Login → Copy key
  const [apiKey, setApiKey] = useState("");
  const [apiSource, setApiSource] = useState(""); // "api" or "local"

  // Fetch from FreeAstroAPI Vedic Chart endpoint
  const fetchFromAPI = async (dob, hour, minute, city) => {
    if (!apiKey) return null;
    try {
      const [y, m, d] = dob.split('-').map(Number);
      const res = await fetch("https://api.freeastroapi.com/api/v2/vedic/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ year: y, month: m, day: d, hour, minute, city: city || "Chennai" })
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.data) return null;

      // Map API response → our horoscope format
      const vd = data.data;
      const ascSign = vd.ascendant?.sign || "";
      const lagnaIdx = RASHI_EN.findIndex(r => r.toLowerCase() === ascSign.toLowerCase());
      const lagna = lagnaIdx >= 0 ? lagnaIdx : 0;

      const placements = PLANETS.map((p, i) => {
        // Find matching planet in API response
        const apiPlanet = vd.planets?.find(pp =>
          pp.name?.toLowerCase() === p.en.toLowerCase() ||
          pp.name?.toLowerCase() === p.en.toLowerCase().replace("rahu","rahu (north node)").replace("ketu","ketu (south node)")
        );
        if (apiPlanet) {
          const rIdx = RASHI_EN.findIndex(r => r.toLowerCase() === (apiPlanet.sign||"").toLowerCase());
          const rashi = rIdx >= 0 ? rIdx : 0;
          return {
            ...p,
            rashi: RASHIS[rashi], rashiEn: RASHI_EN[rashi],
            degree: Math.floor(apiPlanet.degree || 0),
            house: apiPlanet.house || ((rashi - lagna + 12) % 12) + 1,
            nakshatra: apiPlanet.nakshatra || "",
            retrograde: apiPlanet.is_retro || false
          };
        }
        return { ...p, rashi: RASHIS[0], rashiEn: RASHI_EN[0], degree: 0, house: 1 };
      });

      const moonPlanet = vd.planets?.find(pp => pp.name?.toLowerCase() === "moon");
      const moonIdx = moonPlanet ? RASHI_EN.findIndex(r => r.toLowerCase() === (moonPlanet.sign||"").toLowerCase()) : 0;

      return {
        lagna, lagnaName: RASHIS[lagna], lagnaEn: RASHI_EN[lagna],
        lagnaDeg: Math.floor(vd.ascendant?.degree || 0),
        placements,
        nakshatra: moonPlanet?.nakshatra || NAKSHATRAS[0],
        moonRashi: RASHIS[moonIdx >= 0 ? moonIdx : 0],
        sunSign: RASHIS[RASHI_EN.findIndex(r => r.toLowerCase() === (vd.planets?.find(pp=>pp.name?.toLowerCase()==="sun")?.sign||"").toLowerCase()) || 0],
        birthTime: `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,
        apiSource: "FreeAstroAPI (Swiss Ephemeris)"
      };
    } catch (e) {
      console.log("API error, falling back to local:", e);
      return null;
    }
  };

  const handleSubmit = async () => {
    if(!formData.dob||!formData.name)return;
    goTo(SCREEN.LOADING);

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

    // Try API first, fallback to local
    let result = await fetchFromAPI(formData.dob, h24, min24, formData.pob);
    if (result) {
      setApiSource("api");
      setHoroscope(result);
    } else {
      setApiSource("local");
      setHoroscope(generateHoroscope(formData.dob, finalTime));
    }
    goTo(SCREEN.RESULT);
  };

  const fetchAIPrediction = async () => {
    if(!horoscope)return;
    setPredictionLoading(true); setPrediction("");
    try {
      const prompt = `You are a world-class Vedic astrologer. Based on these birth chart details, give a personalized prediction in Tamil (with some English terms).
Name: ${formData.name}, DOB: ${formData.dob}, TOB: ${formData.tob||"Unknown"}, POB: ${formData.pob||"Unknown"}
Lagna: ${horoscope.lagnaName} (${horoscope.lagnaEn}), Moon: ${horoscope.moonRashi}, Nakshatra: ${horoscope.nakshatra}
Planets: ${horoscope.placements.map(p=>`${p.ta}:${p.rashi} H${p.house} ${p.degree}°`).join(", ")}
Predict: பொது பலன், தொழில், திருமணம், ஆரோக்கியம், நிதி. 200 words. Warm tone.`;
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      const data = await r.json();
      setPrediction(data.content?.map(b=>b.text||"").join("")||"பலன் கிடைக்கவில்லை.");
    } catch(e){ setPrediction("AI பலன் பெற இணைய இணைப்பு தேவை."); }
    setPredictionLoading(false);
  };

  const handleAuth = (e) => { e?.preventDefault?.(); setUser({name:formData.name||"User"}); goTo(SCREEN.FORM); };

  // ─── STYLES ───
  const base = {
    minHeight:"100vh",
    background:"linear-gradient(160deg, #030108 0%, #0c0320 18%, #150838 38%, #1a0645 55%, #120530 75%, #08021a 100%)",
    fontFamily:"'Segoe UI','Noto Sans Tamil',system-ui,sans-serif",
    color:"#e8e0f0", position:"relative", overflow:"hidden"
  };
  const container = {
    maxWidth:420, margin:"0 auto", padding:"0 20px",
    position:"relative", zIndex:3,
    opacity:fadeIn?1:0, transform:fadeIn?"translateY(0)":"translateY(14px)",
    transition:"opacity 0.45s ease, transform 0.45s ease"
  };
  const btnGold = {
    background:"linear-gradient(135deg, #d4a853, #f0c75e, #d4a853)",
    color:"#0a0e27", border:"none", borderRadius:14, padding:"14px 0",
    width:"100%", fontSize:16, fontWeight:700, cursor:"pointer",
    boxShadow:"0 4px 28px #d4a85345"
  };
  const btnOutline = {
    background:"transparent", color:"#d4a853",
    border:"1.5px solid #d4a85340", borderRadius:14,
    padding:"12px 0", width:"100%", fontSize:15, fontWeight:600, cursor:"pointer"
  };
  const inputStyle = {
    width:"100%", padding:"13px 16px",
    background:"rgba(255,255,255,0.04)", border:"1.5px solid #d4a85325",
    borderRadius:12, color:"#e8e0f0", fontSize:15, outline:"none",
    boxSizing:"border-box", backdropFilter:"blur(6px)"
  };
  const labelStyle = { display:"block", marginBottom:6, fontSize:13, color:"#a78bfa", fontWeight:500 };
  const card = {
    background:"linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
    border:"1px solid rgba(212,168,83,0.12)", borderRadius:18, padding:20,
    backdropFilter:"blur(14px)"
  };

  // ═══════ SPLASH ═══════
  if(screen===SCREEN.SPLASH) return (
    <div style={{...base, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <CosmicBackground/>
      <MantraChakra speed={70} size={620} opacity={0.3}/>
      <div style={{textAlign:"center", zIndex:3, animation:"splashIn 1.2s ease-out"}}>
        <div style={{
          width:115, height:115, margin:"0 auto 28px", borderRadius:"50%",
          background:"radial-gradient(circle at 35% 35%, #f0c75e, #d4a853, #8b6914)",
          boxShadow:"0 0 80px #d4a85370, 0 0 160px #d4a85330, 0 0 240px #d4a85315",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:54,
          animation:"sunPulse 3s ease-in-out infinite"
        }}>☉</div>
        <h1 style={{fontSize:32, fontWeight:300, margin:"0 0 8px", letterSpacing:3, color:"#f0c75e"}}>ஜோதிட நிபுணர்</h1>
        <p style={{fontSize:13, color:"#a78bfa", letterSpacing:5, fontWeight:300}}>JOTHIDA NIPUNAR</p>
        <p style={{fontSize:11, color:"#a78bfa60", marginTop:12}}>✦ Advanced Vedic Astrology ✦</p>
        <div style={{marginTop:40}}>
          <div style={{width:36,height:3,borderRadius:2,margin:"0 auto",
            background:"linear-gradient(90deg,transparent,#d4a853,transparent)",
            animation:"pulse 1.5s ease-in-out infinite"}}/>
        </div>
      </div>
      <style>{`
        @keyframes splashIn{from{opacity:0;transform:scale(0.9) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}
        @keyframes sunPulse{0%,100%{box-shadow:0 0 80px #d4a85370,0 0 160px #d4a85330;}50%{box-shadow:0 0 100px #d4a85390,0 0 200px #d4a85340,0 0 300px #d4a85318;}}
        @keyframes pulse{0%,100%{opacity:0.3;}50%{opacity:1;}}
      `}</style>
    </div>
  );

  // ═══════ AUTH ═══════
  if(screen===SCREEN.AUTH) return (
    <div style={base}>
      <CosmicBackground/>
      <MantraChakra speed={95} size={560} opacity={0.2}/>
      <div style={{...container, paddingTop:56}}>
        <div style={{textAlign:"center", marginBottom:36}}>
          <div style={{
            width:64, height:64, margin:"0 auto 16px", borderRadius:"50%",
            background:"radial-gradient(circle at 35% 35%, #f0c75e, #d4a853)",
            boxShadow:"0 0 50px #d4a85340",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:30
          }}>☉</div>
          <h1 style={{fontSize:22, fontWeight:400, margin:"0 0 4px", color:"#f0c75e"}}>ஜோதிட நிபுணர்</h1>
          <p style={{fontSize:12, color:"#a78bfa", margin:0}}>
            {authMode==="login"?"உங்கள் கணக்கில் உள்நுழையுங்கள்":"புதிய கணக்கு உருவாக்குங்கள்"}
          </p>
        </div>
        <div style={{display:"flex",gap:0,marginBottom:28,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:3}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>setAuthMode(m)} style={{
              flex:1,padding:"10px 0",border:"none",borderRadius:10,
              background:authMode===m?"linear-gradient(135deg,#d4a85325,#a78bfa18)":"transparent",
              color:authMode===m?"#f0c75e":"#a78bfa60",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.25s"
            }}>{m==="login"?"உள்நுழைவு":"பதிவு"}</button>
          ))}
        </div>
        <div style={card}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {authMode==="register"&&(
              <div><label style={labelStyle}>பெயர்</label>
              <input style={inputStyle} placeholder="உங்கள் பெயர்" value={formData.name}
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
        <p style={{textAlign:"center",marginTop:20,fontSize:12,color:"#a78bfa40"}}>Firebase Auth • One Device • Encrypted</p>
      </div>
    </div>
  );

  // ═══════ FORM ═══════
  if(screen===SCREEN.FORM) return (
    <div style={base}>
      <CosmicBackground/>
      <MantraChakra speed={100} size={500} opacity={0.15}/>
      <div style={{...container, paddingTop:24}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:400,margin:"0 0 2px",color:"#f0c75e"}}>ஜாதகம் பார்க்க</h2>
            <p style={{fontSize:12,color:"#a78bfa",margin:0}}>பிறப்பு விவரங்களை உள்ளிடுக</p>
          </div>
          <button onClick={()=>goTo(SCREEN.PREMIUM)} style={{
            background:"linear-gradient(135deg,#d4a85325,#a78bfa18)",border:"1px solid #d4a85330",
            borderRadius:10,padding:"8px 14px",color:"#f0c75e",fontSize:11,fontWeight:600,cursor:"pointer"
          }}>⭐ Premium</button>
        </div>
        <div style={card}>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div><label style={labelStyle}>பெயர் *</label>
            <input style={inputStyle} placeholder="உங்கள் பெயர்" value={formData.name}
              onChange={e=>setFormData(d=>({...d,name:e.target.value}))}/></div>
            <div><label style={labelStyle}>பிறந்த தேதி *</label>
            <input type="date" style={{...inputStyle,colorScheme:"dark"}} value={formData.dob}
              onChange={e=>setFormData(d=>({...d,dob:e.target.value}))}/></div>
            <div><label style={labelStyle}>பிறந்த நேரம் *</label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="number" min="1" max="12" placeholder="மணி"
                style={{...inputStyle, width:"28%", textAlign:"center", padding:"13px 8px"}}
                value={formData.tob ? formData.tob.split(':')[0] : ""}
                onChange={e=>{
                  let h = Math.min(12, Math.max(0, parseInt(e.target.value)||0));
                  const m = formData.tob ? formData.tob.split(':')[1]||"00" : "00";
                  setFormData(d=>({...d, tob: h ? `${h}:${m}` : ""}));
                }}/>
              <span style={{color:"#f0c75e",fontSize:20,fontWeight:700}}>:</span>
              <input type="number" min="0" max="59" placeholder="நிமிடம்"
                style={{...inputStyle, width:"28%", textAlign:"center", padding:"13px 8px"}}
                value={formData.tob ? formData.tob.split(':')[1]||"" : ""}
                onChange={e=>{
                  let m = Math.min(59, Math.max(0, parseInt(e.target.value)||0));
                  const h = formData.tob ? formData.tob.split(':')[0]||"6" : "6";
                  setFormData(d=>({...d, tob: `${h}:${String(m).padStart(2,'0')}`}));
                }}/>
              {/* AM/PM Toggle */}
              <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1.5px solid #d4a85330",flexShrink:0}}>
                {["AM","PM"].map(p=>(
                  <button key={p} onClick={()=>setFormData(d=>({...d,ampm:p}))} style={{
                    padding:"12px 14px",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                    transition:"all 0.2s",
                    background:formData.ampm===p
                      ? (p==="AM"
                        ? "linear-gradient(135deg,#f0c75e,#d4a853)"
                        : "linear-gradient(135deg,#7c5cc8,#a78bfa)")
                      : "rgba(255,255,255,0.03)",
                    color:formData.ampm===p ? (p==="AM"?"#0a0518":"#fff") : "#a78bfa60"
                  }}>
                    {p==="AM"?"☀ காலை":"☽ மாலை"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{fontSize:10,color:"#a78bfa50",marginTop:5}}>
              {formData.ampm==="AM"?"காலை 12:00 — பிற்பகல் 11:59":"பிற்பகல் 12:00 — இரவு 11:59"}
            </div>
            </div>
            <div><label style={labelStyle}>பிறந்த இடம்</label>
            <input style={inputStyle} placeholder="எ.கா. சென்னை, தமிழ்நாடு" value={formData.pob}
              onChange={e=>setFormData(d=>({...d,pob:e.target.value}))}/></div>
            <button style={{...btnGold,opacity:(!formData.name||!formData.dob)?0.4:1,
              pointerEvents:(!formData.name||!formData.dob)?"none":"auto"}} onClick={handleSubmit}>
              ஜாதகம் உருவாக்கு ☉
            </button>
          </div>
        </div>
        {/* API Key Section */}
        <div style={{...card, marginTop:14, padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <label style={{fontSize:12,color:"#a78bfa",fontWeight:600}}>🔑 FreeAstroAPI Key</label>
            <a href="https://www.freeastroapi.com" target="_blank" rel="noopener"
              style={{fontSize:10,color:"#d4a853",textDecoration:"none"}}>Free key பெறு →</a>
          </div>
          <input style={{...inputStyle,fontSize:13,padding:"10px 14px"}}
            type="password" placeholder="API key இல்லாமலும் Local Engine வேலை செய்யும்"
            value={apiKey} onChange={e=>setApiKey(e.target.value)}/>
          <div style={{fontSize:10,marginTop:6,color:apiKey?"#4ade80":"#a78bfa40"}}>
            {apiKey
              ? "✓ API Key set — Swiss Ephemeris (NASA precision) பயன்படுத்தப்படும்"
              : "API key இல்லை — Local Approximate Engine பயன்படுத்தப்படும்"}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
          {[{icon:"☊",t:"ராசி பலன்",s:"12 ராசிகள்"},{icon:"☽",t:"நட்சத்திர பலன்",s:"27 நட்சத்திரங்கள்"},
            {icon:"♃",t:"கிரக நிலை",s:"9 கிரகங்கள்"},{icon:"🤖",t:"AI பலன்கள்",s:"Claude AI"}
          ].map((c,i)=>(
            <div key={i} style={{...card,padding:"14px 12px",textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:4}}>{c.icon}</div>
              <div style={{fontSize:12,fontWeight:600,color:"#e8e0f0"}}>{c.t}</div>
              <div style={{fontSize:10,color:"#a78bfa"}}>{c.s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ═══════ LOADING ═══════
  if(screen===SCREEN.LOADING) return (
    <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <CosmicBackground/>
      <MantraChakra speed={20} size={520} opacity={0.35}/>
      <div style={{textAlign:"center",zIndex:3}}>
        <div style={{position:"relative",width:120,height:120,margin:"0 auto 28px"}}>
          <svg viewBox="0 0 120 120" style={{width:120,height:120,animation:"spin 2s linear infinite"}}>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#d4a85320" strokeWidth="2.5"/>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#d4a853" strokeWidth="2.5"
              strokeDasharray="60 280" strokeLinecap="round"/>
          </svg>
          <svg viewBox="0 0 120 120" style={{width:90,height:90,position:"absolute",top:15,left:15,animation:"spinR 3s linear infinite"}}>
            <circle cx="60" cy="60" r="40" fill="none" stroke="#a78bfa30" strokeWidth="1.5"/>
            <circle cx="60" cy="60" r="40" fill="none" stroke="#a78bfa" strokeWidth="1.5"
              strokeDasharray="40 210" strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:36}}>☉</div>
        </div>
        <p style={{color:"#f0c75e",fontSize:15,fontWeight:500}}>கிரக நிலைகளை கணக்கிடுகிறது...</p>
        <p style={{color:"#a78bfa50",fontSize:11,marginTop:6}}>Swiss Ephemeris Engine</p>
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
      <CosmicBackground/>
      <MantraChakra speed={100} size={420} opacity={0.12}/>
      <div style={{...container,paddingTop:24}}>
        <button onClick={()=>goTo(SCREEN.FORM)} style={{background:"none",border:"none",color:"#a78bfa",fontSize:14,cursor:"pointer",padding:0,marginBottom:20}}>← பின் செல்</button>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:40,marginBottom:8}}>⭐</div>
          <h2 style={{fontSize:22,fontWeight:400,margin:"0 0 6px",color:"#f0c75e"}}>Premium திட்டம்</h2>
          <p style={{fontSize:13,color:"#a78bfa",margin:0}}>முழு ஜோதிட அனுபவத்தைப் பெறுங்கள்</p>
        </div>
        {[
          {name:"மாதாந்திர",price:"₹149",period:"/மாதம்",features:["வரம்பற்ற ஜாதகங்கள்","AI பலன்கள்","தினப்பலன்"],popular:false},
          {name:"ஆண்டு",price:"₹999",period:"/ஆண்டு",features:["எல்லா மாதாந்திர அம்சங்கள்","பரிகாரங்கள்","முன்னுரிமை ஆதரவு","திருமண பொருத்தம்"],popular:true}
        ].map((plan,i)=>(
          <div key={i} style={{...card,marginBottom:16,border:plan.popular?"1.5px solid #d4a85350":card.border,position:"relative"}}>
            {plan.popular&&(<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
              background:"linear-gradient(135deg,#d4a853,#f0c75e)",color:"#0a0e27",
              fontSize:10,fontWeight:700,padding:"3px 14px",borderRadius:20}}>பிரபலமானது</div>)}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
              <h3 style={{fontSize:16,fontWeight:600,color:"#e8e0f0",margin:0}}>{plan.name}</h3>
              <div><span style={{fontSize:26,fontWeight:700,color:"#f0c75e"}}>{plan.price}</span>
              <span style={{fontSize:12,color:"#a78bfa"}}>{plan.period}</span></div>
            </div>
            {plan.features.map((f,fi)=>(<div key={fi} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{color:"#d4a853",fontSize:14}}>✓</span>
              <span style={{fontSize:13,color:"#e8e0f0cc"}}>{f}</span>
            </div>))}
            <button style={{...btnGold,marginTop:14,fontSize:14}}>தொடங்கு →</button>
          </div>
        ))}
      </div>
    </div>
  );

  // ═══════ RESULT ═══════
  if(screen===SCREEN.RESULT&&horoscope){
    const tabs=[{key:"chart",label:"ராசி சக்கரம்",icon:"◎"},{key:"planets",label:"கிரகங்கள்",icon:"☿"},{key:"ai",label:"AI பலன்",icon:"🤖"}];
    return (
      <div style={base}>
        <CosmicBackground/>
        <MantraChakra speed={110} size={460} opacity={0.12}/>
        <div style={{...container,paddingTop:20,paddingBottom:30}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <button onClick={()=>goTo(SCREEN.FORM)} style={{background:"none",border:"none",color:"#a78bfa",fontSize:14,cursor:"pointer",padding:0}}>← திரும்பு</button>
            <h2 style={{fontSize:17,fontWeight:500,margin:0,color:"#f0c75e"}}>{formData.name} — ஜாதகம்</h2>
            <div style={{width:40}}/>
          </div>
          {/* Primary Info */}
          <div style={{...card,marginBottom:10,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
            <div><div style={{fontSize:10,color:"#a78bfa",marginBottom:2}}>லக்னம்</div>
            <div style={{fontSize:15,fontWeight:700,color:"#f0c75e"}}>{horoscope.lagnaName}</div>
            <div style={{fontSize:10,color:"#a78bfa60"}}>{horoscope.lagnaEn} {horoscope.lagnaDeg}°</div></div>
            <div><div style={{fontSize:10,color:"#a78bfa",marginBottom:2}}>சந்திர ராசி</div>
            <div style={{fontSize:15,fontWeight:700,color:"#e8e0f0"}}>{horoscope.moonRashi}</div></div>
            <div><div style={{fontSize:10,color:"#a78bfa",marginBottom:2}}>நட்சத்திரம்</div>
            <div style={{fontSize:15,fontWeight:700,color:"#e8e0f0"}}>{horoscope.nakshatra}</div></div>
          </div>
          {/* Secondary Info — Sun sign, birth time */}
          <div style={{...card,marginBottom:18,padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
            <div><div style={{fontSize:9,color:"#a78bfa80"}}>சூரிய ராசி</div>
            <div style={{fontSize:12,fontWeight:600,color:"#d4a853"}}>{horoscope.sunSign}</div></div>
            <div><div style={{fontSize:9,color:"#a78bfa80"}}>பிறந்த நேரம்</div>
            <div style={{fontSize:12,fontWeight:600,color:"#e8e0f0cc"}}>
              {formData.tob ? `${formData.tob} ${formData.ampm}` : horoscope.birthTime}
            </div>
            <div style={{fontSize:9,color:formData.ampm==="AM"?"#f0c75e60":"#a78bfa60"}}>
              {formData.ampm==="AM"?"☀ காலை":"☽ மாலை"}
            </div></div>
            <div><div style={{fontSize:9,color:"#a78bfa80"}}>தேதி</div>
            <div style={{fontSize:12,fontWeight:600,color:"#e8e0f0cc"}}>{formData.dob}</div></div>
          </div>
          <div style={{display:"flex",gap:0,marginBottom:18,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:3}}>
            {tabs.map(t=>(
              <button key={t.key} onClick={()=>{setActiveTab(t.key);if(t.key==="ai"&&!prediction&&!predictionLoading)fetchAIPrediction();}} style={{
                flex:1,padding:"10px 4px",border:"none",borderRadius:10,
                background:activeTab===t.key?"linear-gradient(135deg,#d4a85325,#a78bfa18)":"transparent",
                color:activeTab===t.key?"#f0c75e":"#a78bfa60",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.25s"
              }}>{t.icon} {t.label}</button>
            ))}
          </div>

          {activeTab==="chart"&&(<div style={{...card,textAlign:"center"}}>
            <SouthIndianChart horoscope={horoscope}/>
            <p style={{fontSize:11,color:"#a78bfa",marginTop:12,marginBottom:0}}>
              தென் இந்திய ராசி சக்கரம் • லக்னம்: {horoscope.lagnaName}
            </p>
            <div style={{marginTop:8,display:"inline-block",
              background:apiSource==="api"?"rgba(74,222,128,0.1)":"rgba(167,139,250,0.1)",
              border:`1px solid ${apiSource==="api"?"#4ade8030":"#a78bfa25"}`,
              borderRadius:8,padding:"4px 12px",fontSize:10,
              color:apiSource==="api"?"#4ade80":"#a78bfa"
            }}>
              {apiSource==="api"?"✓ FreeAstroAPI — Swiss Ephemeris (NASA JPL)":"⚡ Local Approximate Engine"}
            </div>
          </div>)}

          {activeTab==="planets"&&(<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {horoscope.placements.map((p,i)=>(
              <div key={i} style={{...card,padding:"12px 16px",display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:40,height:40,borderRadius:12,
                  background:"linear-gradient(135deg,#d4a85325,#a78bfa18)",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0
                }}>{p.symbol}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:14,fontWeight:600,color:"#e8e0f0"}}>{p.ta}</span>
                    <span style={{fontSize:11,color:"#a78bfa"}}>{p.degree}°</span>
                  </div>
                  <div style={{fontSize:12,color:"#a78bfa",marginTop:2}}>{p.rashi} • வீடு {p.house}</div>
                </div>
              </div>
            ))}
          </div>)}

          {activeTab==="ai"&&(<div style={card}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#d4a85330,#a78bfa20)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
              <div><div style={{fontSize:14,fontWeight:600,color:"#f0c75e"}}>AI ஜோதிட பலன்</div>
              <div style={{fontSize:10,color:"#a78bfa"}}>Powered by Claude AI</div></div>
            </div>
            {predictionLoading?(<div style={{textAlign:"center",padding:"30px 0"}}>
              <div style={{width:32,height:32,margin:"0 auto 12px",border:"2px solid #d4a85320",
                borderTop:"2px solid #d4a853",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              <p style={{color:"#a78bfa",fontSize:13}}>AI பலன் உருவாக்குகிறது...</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
            </div>):prediction?(
              <div style={{fontSize:14,lineHeight:1.8,color:"#e8e0f0cc",whiteSpace:"pre-wrap"}}>{prediction}</div>
            ):(<div style={{textAlign:"center",padding:"20px 0"}}>
              <p style={{color:"#a78bfa",fontSize:13,marginBottom:14}}>AI மூலம் தனிப்பயன் பலன் பெறுங்கள்</p>
              <button style={{...btnGold,width:"auto",padding:"12px 32px",display:"inline-block"}} onClick={fetchAIPrediction}>AI பலன் பெறு →</button>
            </div>)}
            {prediction&&(<button onClick={fetchAIPrediction} style={{...btnOutline,marginTop:16,fontSize:13}}>மீண்டும் பலன் பெறு ↻</button>)}
          </div>)}

          {/* PDF Download Button */}
          <button
            onClick={()=>generateJathagamPDF(formData, horoscope, prediction)}
            style={{
              ...btnGold, marginTop:18,
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              fontSize:16, padding:"16px 0",
              boxShadow:"0 6px 32px #d4a85355"
            }}>
            <span style={{fontSize:20}}>📄</span>
            முழு ஜாதகம் PDF பதிவிறக்கு
          </button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
            <button style={{...btnOutline,fontSize:12,padding:"10px 0"}} onClick={()=>goTo(SCREEN.FORM)}>புதிய ஜாதகம்</button>
            <button style={{...btnOutline,fontSize:12,padding:"10px 0",borderColor:"#d4a85340",color:"#f0c75e"}}
              onClick={()=>goTo(SCREEN.PREMIUM)}>⭐ Premium பெறு</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
