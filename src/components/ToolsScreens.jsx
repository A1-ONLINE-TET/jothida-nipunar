import { NAMES_BY_SOUND, SOUND_FAMILIES } from "./names-data.js";
import { useEffect, useState } from "react";
import {
  ChevronRight, Share2, TriangleAlert, CircleCheck, ChevronLeft,
} from "lucide-react";

import BottomNav from "./BottomNav.jsx";
import { NAME_SYLLABLES, NUMBER_INFO, numerologyOf, kizhamai } from "./tools-data.js";

// ── பகிரப்படும் நடை (App.jsx-இன் card/ink tokens-உடன் ஒத்தது) ──
const page = { minHeight: "100vh", fontFamily: "'Noto Sans Tamil','Segoe UI',system-ui,sans-serif", color: "#27303f" };
const wrap = { maxWidth: 430, margin: "0 auto", padding: "18px 20px 104px" };
const card = { background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 18, padding: 16, boxShadow: "0 10px 34px -14px rgba(35,55,95,0.14), 0 1px 4px rgba(35,55,95,0.04)", marginBottom: 12 };
const h2 = { fontSize: 20, fontWeight: 700, margin: "0 0 2px", color: "#1f3f68" };
const sub = { fontSize: 13, color: "#55626f", margin: "0 0 16px", lineHeight: 1.6 };
const secTitle = { fontSize: 15, fontWeight: 700, color: "#1f3f68", marginBottom: 10 };
const chip = { fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 999, lineHeight: 1.5, display: "inline-block" };
const backBtn = { display: "inline-flex", alignItems: "center", gap: 4, minHeight: 40, padding: "0 16px 0 10px", marginBottom: 12, background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 999, color: "#1f3f68", fontSize: 13.5, fontWeight: 600, cursor: "pointer" };
const input = { width: "100%", padding: "13px 15px", background: "#fcfdff", border: "1.5px solid #c2cfca", borderRadius: 12, color: "#27303f", fontSize: 16, outline: "none", boxSizing: "border-box" };
const label = { display: "block", marginBottom: 6, fontSize: 13, color: "#4a5365", fontWeight: 600 };
const note = { fontSize: 11.5, color: "#a3adc2", textAlign: "center", lineHeight: 1.6, margin: "4px 0 0" };
const iconBox = (bg, fg) => ({ width: 40, height: 40, borderRadius: 12, background: bg, color: fg, display: "grid", placeItems: "center", flexShrink: 0 });

function Back({ onBack, text = "பின்" }) {
  return <button data-back style={backBtn} onClick={onBack}><ChevronLeft size={18} />{text}</button>;
}

// ═══════════════════════════════════════════════════════════════════
// 12 ராசி பலன் — ராசியைத் தேர்ந்தெடுத்தால் அன்றைய கோசார பலன் (server கணக்கு)
// ═══════════════════════════════════════════════════════════════════
const RASHI_GLYPH = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"].map((g) => g + "\uFE0E"); // text presentation
const isoOffset = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const MODES = [["today", "இன்று"], ["tomorrow", "நாளை"], ["week", "வாரம்"], ["month", "மாதம்"], ["year", "ஆண்டு"]];
const dShort = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("ta-IN", { day: "numeric", month: "short" });
const dWeek = (iso) => ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"][new Date(iso + "T00:00:00").getDay()];
const MOOD = { good: { t: "நல்ல நாள்", c: "#2e7d5b", bg: "#e9f5ee" }, caution: { t: "கவனம்", c: "#c0564f", bg: "#fbeeed" }, neutral: { t: "சாதாரணம்", c: "#4a5365", bg: "#f3f5f9" } };

export function RasiPalanScreen({ rashis, defaultRashi = null, fetchPalan, fetchPeriod, onNav, onShare }) {
  const [rashi, setRashi] = useState(defaultRashi);
  const [mode, setMode] = useState("today");
  const [data, setData] = useState(null);     // இன்று / நாளை
  const [pdata, setPdata] = useState(null);   // வாரம் / மாதம் / ஆண்டு
  const [state, setState] = useState("idle"); // idle | loading | error
  const day = mode === "tomorrow" ? 1 : 0;
  const isDaily = mode === "today" || mode === "tomorrow";

  useEffect(() => {
    if (rashi == null) return;
    let alive = true;
    setState("loading");
    const job = isDaily ? fetchPalan(rashi, day === 0 ? null : isoOffset(day)).then((r) => { if (alive) setData(r); })
                        : fetchPeriod(rashi, mode).then((r) => { if (alive) setPdata(r); });
    job.then(() => { if (alive) setState("idle"); }).catch(() => { if (alive) { setData(null); setPdata(null); setState("error"); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rashi, mode]);

  const g = data?.gochara;
  const mood = g ? (g.overallMood === "good" ? { t: "நல்ல நாள்", c: "#2e7d5b", bg: "#e9f5ee" } : g.overallMood === "caution" ? { t: "கவனம் தேவைப்படும் நாள்", c: "#c0564f", bg: "#fbeeed" } : { t: "சாதாரண நாள்", c: "#4a5365", bg: "#f3f5f9" }) : null;
  const moon = g?.results.find((r) => r.ta === "சந்திரன்");
  const good = g ? g.results.filter((r) => r.effect === "good").map((r) => r.ta) : [];
  const bad = g ? g.results.filter((r) => r.effect === "bad").map((r) => r.ta) : [];
  const dayWord = day === 0 ? "இன்று" : "நாளை";
  const shareText = () => data ? [
    `${data.rashi} ராசி — ${dayWord} (${data.date.dateStr})`,
    mood.t + (g.isChandrashtama ? " — சந்திராஷ்டமம்" : ""),
    data.guruPeyarchi ? `குரு: ${data.guruPeyarchi.desc}` : "",
    data.remedy?.dayInfo?.remedy ? `இன்றைய வழிபாடு: ${data.remedy.dayInfo.remedy}` : "",
    `அதிர்ஷ்ட எண்கள்: ${(data.luckyNums || []).join(", ")}`,
    "— ஜோதிட நிபுணர்",
  ].filter(Boolean).join("\n") : "";

  return (
    <div style={page}>
      <div style={wrap}>
        <Back onBack={() => onNav("home")} />
        <h2 style={h2}>12 ராசி பலன்</h2>
        <p style={sub}>உங்கள் ராசியைத் தேர்ந்தெடுங்கள்</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
          {rashis.map((r, i) => {
            const on = rashi === i;
            return (
              <button key={i} data-rashi={i} onClick={() => setRashi(i)} style={{ padding: "10px 2px 8px", borderRadius: 14, cursor: "pointer", textAlign: "center",
                border: on ? "1px solid #1f3f68" : "1px solid #e3e8f2", background: on ? "#1f3f68" : "#ffffff", color: on ? "#ffffff" : "#27303f" }}>
                <span style={{ display: "block", fontSize: 18, lineHeight: 1.2, color: on ? "#f7e2a6" : "#a9823c" }}>{RASHI_GLYPH[i]}</span>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: on ? 700 : 500 }}>{r}</span>
              </button>
            );
          })}
        </div>

        {rashi == null && (
          <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13, lineHeight: 1.7 }}>
            ராசி தெரியவில்லையா? “ஜாதகம்” பகுதியில் பிறப்பு விவரம் கொடுத்தால் உங்கள் ராசி, நட்சத்திரம் தெரியும்.
          </div>
        )}

        {rashi != null && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {MODES.map(([k, t]) => (
              <button key={k} data-mode={k} onClick={() => setMode(k)} style={{ flex: "1 1 auto", minHeight: 38, padding: "9px 2px", borderRadius: 999, fontSize: 12.5, fontWeight: mode === k ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
                border: mode === k ? "1px solid #1f3f68" : "1px solid #e3e8f2", background: mode === k ? "#1f3f68" : "#ffffff", color: mode === k ? "#ffffff" : "#4a5365" }}>{t}</button>
            ))}
          </div>
        )}

        {rashi != null && state === "loading" && <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13 }}>பலன் கணக்கிடப்படுகிறது…</div>}
        {rashi != null && state === "error" && <div style={{ ...card, textAlign: "center", color: "#c0564f", fontSize: 13 }}>பலன் பெற முடியவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.</div>}

        {rashi != null && state === "idle" && !isDaily && pdata && pdata.period === mode && (
          <PeriodPalan p={pdata} onNav={onNav} onShare={onShare} />
        )}

        {rashi != null && state === "idle" && isDaily && data && (<>
          <div data-palan style={{ ...card, background: mood.bg, border: "none", boxShadow: "none" }}>
            <div style={{ fontSize: 12.5, color: "#4a5365", marginBottom: 2 }}>{data.rashi} ராசி · {data.date.dateStr} · {kizhamai(data.date.dayName)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: mood.c, lineHeight: 1.4 }}>{mood.t}</div>
            {g.isChandrashtama && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8, fontSize: 13, color: "#c0564f", lineHeight: 1.6 }}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 3 }} />
                <span><b>சந்திராஷ்டமம்</b> — {dayWord} புதிய முயற்சிகள், முக்கிய முடிவுகள், வாக்குவாதங்களைத் தவிர்ப்பது நல்லது.</span>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={secTitle}>{dayWord} கிரக நிலை</div>
            {moon && <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7, marginBottom: 8 }}>சந்திரன் {moon.rashi} ராசியில் — உங்கள் ராசிக்கு {moon.houseFromMoon}ஆம் இடம்.</div>}
            {good.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#55626f", marginBottom: 5 }}>சாதகமான கிரகங்கள்</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{good.map((p) => <span key={p} style={{ ...chip, background: "#e9f5ee", color: "#2e7d5b" }}>{p}</span>)}</div>
              </div>
            )}
            {bad.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: "#55626f", marginBottom: 5 }}>கவனம் தேவைப்படும் கிரகங்கள்</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{bad.map((p) => <span key={p} style={{ ...chip, background: "#fbeeed", color: "#c0564f" }}>{p}</span>)}</div>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={secTitle}>நீண்டகால நிலை (குரு · சனி)</div>
            {data.guruPeyarchi && (
              <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7, marginBottom: 8 }}>
                <b style={{ color: "#27303f" }}>குரு</b> — {data.guruPeyarchi.rashi} ராசியில் ({data.guruPeyarchi.houseFromMoon}ஆம் இடம்): {data.guruPeyarchi.desc}
              </div>
            )}
            {data.saniTransit && (
              <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7, marginBottom: 8 }}>
                <b style={{ color: "#27303f" }}>சனி</b> — {data.saniTransit.rashi} ராசியில் ({data.saniTransit.houseFromMoon}ஆம் இடம்): {data.saniTransit.desc}
              </div>
            )}
            {data.sadeSati && (
              <span style={{ ...chip, background: data.sadeSati.active ? "#fbeeed" : "#e9f5ee", color: data.sadeSati.active ? "#c0564f" : "#2e7d5b" }}>
                {data.sadeSati.active ? `${data.sadeSati.isEzharai ? "ஏழரைச் சனி — " : ""}${data.sadeSati.phase}${data.sadeSati.stage ? ` (${data.sadeSati.stage})` : ""}` : "ஏழரைச் சனி இல்லை"}
              </span>
            )}
          </div>

          <div style={card}>
            <div style={secTitle}>{dayWord} செய்ய வேண்டியவை</div>
            {[
              ["திதி", `${data.panchang.tithi} · ${data.panchang.nakshatra} நட்சத்திரம்`],
              data.remedy?.tithiInfo?.activity ? ["உகந்த செயல்", data.remedy.tithiInfo.activity] : null,
              data.remedy?.dayInfo?.remedy ? ["வழிபாடு", data.remedy.dayInfo.remedy] : null,
              data.remedy?.dayInfo?.donate ? ["தானம்", data.remedy.dayInfo.donate] : null,
              data.remedy?.dayInfo?.avoid ? ["தவிர்க்க", data.remedy.dayInfo.avoid] : null,
              data.panchaka ? ["பஞ்சகம்", `${data.panchaka.name} — ${data.panchaka.avoid}`] : null,
            ].filter(Boolean).map(([k, v], i) => (
              <div key={k} style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: i ? "1px solid #eef1f6" : "none", fontSize: 13, lineHeight: 1.6 }}>
                <span style={{ width: 92, flexShrink: 0, color: "#55626f" }}>{k}</span>
                <span style={{ color: "#27303f" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={secTitle}>{data.rashi} ராசிக்கான குறிப்புகள்</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["ராசி அதிபதி", data.remedy?.rashiInfo?.lord], ["வழிபடு தெய்வம்", data.remedy?.rashiInfo?.deity],
                ["உகந்த நிறம்", data.remedy?.rashiInfo?.color], ["ரத்தினம்", data.remedy?.rashiInfo?.gem],
                ["அதிர்ஷ்ட எண்கள்", (data.luckyNums || []).join(", ")],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ background: "#f8f9fc", borderRadius: 12, padding: "9px 12px" }}>
                  <div style={{ fontSize: 11.5, color: "#55626f" }}>{k}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1f3f68" }}>{v}</div>
                </div>
              ))}
            </div>
            {data.remedy?.rashiInfo?.mantra && <div style={{ fontSize: 13, color: "#4a5365", marginTop: 10 }}>மந்திரம்: <b style={{ color: "#27303f" }}>{data.remedy.rashiInfo.mantra}</b></div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <button data-share onClick={() => onShare(`${data.rashi} ராசி பலன்`, shareText())} style={{ padding: "12px 0", borderRadius: 14, border: "1.5px solid #ccd6e8", background: "#ffffff", color: "#1f3f68", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Share2 size={16} /> பகிர்
            </button>
            <button data-personal onClick={() => onNav("daily")} style={{ padding: "12px 0", borderRadius: 14, border: "1px solid #1f3f68", background: "#1f3f68", color: "#ffffff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
              தனிப்பட்ட பலன் →
            </button>
          </div>
        </>)}
      </div>
      <BottomNav active="" onNav={onNav} />
    </div>
  );
}


// ── வாரம் / மாதம் / ஆண்டு — கோசாரக் கணக்கின் காட்சி ──
function PlanetRows({ rows, dated = false }) {
  return rows.map((r, i) => (
    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderTop: i ? "1px solid #eef1f6" : "none" }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, color: "#4a5365" }}>
        {dated && <span style={{ color: "#55626f" }}>{dShort(r.iso)} · </span>}
        <b style={{ color: "#27303f" }}>{r.ta}</b> {dated ? "→" : "—"} {r.rashi} ({r.house}ஆம் இடம்)
        {r.theme && <span style={{ display: "block", fontSize: 12, color: "#55626f" }}>{r.theme}</span>}
      </div>
      <span style={{ ...chip, flexShrink: 0, background: r.effect === "good" ? "#e9f5ee" : r.effect === "bad" ? "#fbeeed" : "#f3f5f9", color: r.effect === "good" ? "#2e7d5b" : r.effect === "bad" ? "#c0564f" : "#4a5365" }}>
        {r.effect === "good" ? "சாதகம்" : r.effect === "bad" ? "கவனம்" : "நடுநிலை"}
      </span>
    </div>
  ));
}

function PeriodPalan({ p, onNav, onShare }) {
  if (p.period === "year") {
    return (<>
      <div data-period="year" style={card}>
        <div style={secTitle}>{p.rashi} ராசி — {p.year} ஆண்டு நிலை</div>
        <div style={{ fontSize: 12.5, color: "#55626f", lineHeight: 1.6, marginBottom: 6 }}>குரு, சனி, ராகு, கேது நிலை</div>
        {p.slow.map((s, i) => (
          <div key={i} style={{ padding: "11px 0", borderTop: "1px solid #eef1f6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#27303f" }}>{s.ta} — {s.rashi} <span style={{ fontWeight: 500, color: "#55626f" }}>({s.house}ஆம் இடம்)</span></div>
              <span style={{ ...chip, flexShrink: 0, background: s.effect === "good" ? "#e9f5ee" : "#fbeeed", color: s.effect === "good" ? "#2e7d5b" : "#c0564f" }}>{s.effect === "good" ? "சாதகம்" : "கவனம்"}</span>
            </div>
            <div style={{ fontSize: 12, color: "#55626f", marginTop: 2 }}>{dShort(s.from)} – {dShort(s.to)}</div>
            <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.65, marginTop: 4 }}>{s.desc || s.theme}</div>
            {s.sadeSati?.active && <span style={{ ...chip, marginTop: 6, background: "#fbeeed", color: "#c0564f" }}>{s.sadeSati.isEzharai ? "ஏழரைச் சனி — " : ""}{s.sadeSati.phase}{s.sadeSati.stage ? ` (${s.sadeSati.stage})` : ""}</span>}
          </div>
        ))}
      </div>
    </>);
  }
  const isWeek = p.period === "week";
  const share = () => onShare(`${p.rashi} ராசி — ${isWeek ? "வார" : "மாத"} பலன்`, [
    `${p.rashi} ராசி — ${dShort(p.from)} முதல் ${dShort(p.to)} வரை`,
    `நல்ல நாட்கள்: ${p.counts.good || 0} · கவனம்: ${p.counts.caution || 0}`,
    p.bestDays.length ? `சிறந்த நாட்கள்: ${p.bestDays.slice(0, 8).map(dShort).join(", ")}` : "",
    p.chandrashtama.length ? `சந்திராஷ்டமம்: ${p.chandrashtama.map(dShort).join(", ")}` : "",
    "— ஜோதிட நிபுணர்",
  ].filter(Boolean).join("\n"));
  return (<>
    <div data-period={p.period} style={card}>
      <div style={secTitle}>{p.rashi} ராசி — {isWeek ? "இந்த வாரம்" : "அடுத்த 30 நாட்கள்"}</div>
      <div style={{ fontSize: 12.5, color: "#55626f", marginBottom: 10 }}>{dShort(p.from)} முதல் {dShort(p.to)} வரை</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[["good", "நல்ல நாட்கள்"], ["neutral", "சாதாரணம்"], ["caution", "கவனம்"]].map(([k, t]) => (
          <div key={k} style={{ background: MOOD[k].bg, borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: MOOD[k].c, lineHeight: 1.2 }}>{p.counts[k] || 0}</div>
            <div style={{ fontSize: 11.5, color: "#4a5365" }}>{t}</div>
          </div>
        ))}
      </div>
      {p.chandrashtama.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, fontSize: 13, color: "#c0564f", lineHeight: 1.6 }}>
          <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 3 }} />
          <span><b>சந்திராஷ்டமம்:</b> {p.chandrashtama.map((x) => `${dShort(x)} (${dWeek(x)})`).join(", ")} — முக்கிய முடிவுகளைத் தவிர்க்கவும்.</span>
        </div>
      )}
    </div>

    {isWeek ? (
      <div style={card}>
        <div style={secTitle}>நாள் வாரியாக</div>
        {p.days.map((x, i) => (
          <div key={x.iso} data-pday style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i ? "1px solid #eef1f6" : "none" }}>
            <div style={{ width: 92, flexShrink: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#27303f" }}>{dWeek(x.iso)}</div>
              <div style={{ fontSize: 12, color: "#55626f" }}>{dShort(x.iso)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "#4a5365", lineHeight: 1.5 }}>சந்திரன் {x.moonRashi}{x.moonHouse ? ` (${x.moonHouse}ஆம் இடம்)` : ""}</div>
            <span style={{ ...chip, flexShrink: 0, background: x.chandrashtama ? "#fbeeed" : MOOD[x.mood].bg, color: x.chandrashtama ? "#c0564f" : MOOD[x.mood].c }}>{x.chandrashtama ? "சந்திராஷ்டமம்" : MOOD[x.mood].t}</span>
          </div>
        ))}
      </div>
    ) : (
      <div style={card}>
        <div style={secTitle}>சிறந்த நாட்கள்</div>
        {p.bestDays.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{p.bestDays.map((x) => <span key={x} data-best style={{ ...chip, background: "#e9f5ee", color: "#2e7d5b" }}>{dShort(x)} {dWeek(x).slice(0, 2)}</span>)}</div>
        ) : <div style={{ fontSize: 13, color: "#55626f" }}>இந்தக் காலத்தில் கிரக நிலை பெரும்பாலும் கவனம் தேவைப்படுவதாக உள்ளது.</div>}
      </div>
    )}

    <div style={card}>
      <div style={secTitle}>தற்போதைய கிரக நிலை</div>
      <PlanetRows rows={p.planets} />
    </div>
    {p.ingresses.length > 0 && (
      <div style={card}>
        <div style={secTitle}>{isWeek ? "இந்த வாரக்" : "இந்தக் காலக்"} கிரக மாற்றங்கள்</div>
        <PlanetRows rows={p.ingresses} dated />
      </div>
    )}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
      <button data-share onClick={share} style={{ padding: "12px 0", borderRadius: 14, border: "1.5px solid #ccd6e8", background: "#ffffff", color: "#1f3f68", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Share2 size={16} /> பகிர்</button>
      <button onClick={() => onNav("daily")} style={{ padding: "12px 0", borderRadius: 14, border: "1px solid #1f3f68", background: "#1f3f68", color: "#ffffff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>தனிப்பட்ட பலன் →</button>
    </div>
  </>);
}

// ═══════════════════════════════════════════════════════════════════
// பண்டிகைகள் — ஓர் ஆண்டின் தமிழ்ப் பண்டிகைகள் (server கணக்கு; சரிபார்க்கப்பட்ட விதிகள்)
// ═══════════════════════════════════════════════════════════════════
// விரத நாட்களின் வடிகட்டி — key → காட்சிப் பெயர்
const VRATHAM_KINDS = [
  ["all", "எல்லாம்"], ["amavasai", "அமாவாசை"], ["pournami", "பௌர்ணமி"], ["ekadashi", "ஏகாதசி"], ["pradosham", "பிரதோஷம்"],
  ["chaturthi", "சதுர்த்தி"], ["sankatahara", "சங்கடஹர சதுர்த்தி"], ["krittikai", "கிருத்திகை"], ["sivaratri", "சிவராத்திரி"],
];
const TA_MONTHS_FULL = ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"];

export function FestivalsScreen({ fetchFestivals, fetchVratham, onNav, onOpenDate }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState("festivals"); // festivals | vratham
  const [kind, setKind] = useState("all");
  const [list, setList] = useState(null);
  const [err, setErr] = useState(false);
  const [vr, setVr] = useState(null);
  const [vrErr, setVrErr] = useState(false);
  useEffect(() => {
    let alive = true; setList(null); setErr(false);
    fetchFestivals(year).then((r) => { if (alive) setList(r); }).catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);
  useEffect(() => {
    if (mode !== "vratham" || !fetchVratham) return undefined;
    let alive = true; setVr(null); setVrErr(false);
    fetchVratham(year).then((r) => { if (alive) setVr(r); }).catch(() => { if (alive) setVrErr(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, mode]);
  const todayIso = isoOffset(0);
  const next = list ? list.find((f) => f.iso >= todayIso) : null;
  const yearBtn = { width: 40, height: 40, borderRadius: "50%", border: "1px solid #e3e8f2", background: "#ffffff", color: "#1f3f68", cursor: "pointer", display: "grid", placeItems: "center" };
  const seg = (on) => ({ flex: 1, minHeight: 40, borderRadius: 999, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, background: on ? "#1f3f68" : "transparent", color: on ? "#ffffff" : "#4a5365" });
  const chip = (on) => ({ flexShrink: 0, minHeight: 36, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", border: on ? "1px solid #1f3f68" : "1px solid #e3e8f2", background: on ? "#eef1fb" : "#ffffff", color: on ? "#1f3f68" : "#4a5365" });
  const dateBox = (iso, strong) => (
    <span style={{ width: 54, flexShrink: 0, textAlign: "center", background: strong ? "#1f3f68" : "#f3f5f9", color: strong ? "#ffffff" : "#1f3f68", borderRadius: 12, padding: "6px 0" }}>
      <span style={{ display: "block", fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{new Date(iso + "T00:00:00").getDate()}</span>
      <span style={{ display: "block", fontSize: 11 }}>{new Date(iso + "T00:00:00").toLocaleDateString("ta-IN", { month: "short" })}</span>
    </span>
  );
  const rowBtn = (first, past) => ({ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer", padding: "11px 0", fontFamily: "inherit",
    background: "none", borderLeft: "none", borderRight: "none", borderBottom: "none", borderTop: first ? "none" : "1px solid #eef1f6", opacity: past ? 0.55 : 1 });
  // விரத நாட்கள்: வகைப்படி வடிகட்டி, மாதவாரியாகக் குழுவாக்கு
  const vrItems = vr ? vr.filter((v) => kind === "all" || v.key === kind) : [];
  const vrNext = vrItems.find((v) => v.date >= todayIso) || null;
  // "எல்லாம்" = மாதவாரி அட்டைகள்; ஒரே வகை = ஒரே பட்டியல் (மாதத்துக்கு ஓரிரு வரிகளே வரும்).
  const vrMonths = [];
  for (const v of vrItems) {
    const m = kind === "all" ? Number(v.date.slice(5, 7)) - 1 : -1;
    if (!vrMonths.length || vrMonths[vrMonths.length - 1].m !== m) vrMonths.push({ m, items: [] });
    vrMonths[vrMonths.length - 1].items.push(v);
  }
  return (
    <div style={page}>
      <div style={wrap}>
        <Back onBack={() => onNav("home")} />
        <h2 style={h2}>பண்டிகைகள், விரத நாட்கள்</h2>
        <p style={sub}>தமிழ்நாட்டுப் பஞ்சாங்க வழக்குப்படி</p>
        {fetchVratham && (
          <div data-fest-mode style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "#f3f5f9", marginBottom: 12 }}>
            <button data-mode="festivals" style={seg(mode === "festivals")} onClick={() => setMode("festivals")}>பண்டிகைகள்</button>
            <button data-mode="vratham" style={seg(mode === "vratham")} onClick={() => setMode("vratham")}>விரத நாட்கள்</button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button data-year-prev aria-label="முந்தைய ஆண்டு" style={yearBtn} onClick={() => setYear((y) => y - 1)}><ChevronLeft size={20} /></button>
          <div data-year style={{ fontSize: 20, fontWeight: 800, color: "#1f3f68" }}>{year}</div>
          <button data-year-next aria-label="அடுத்த ஆண்டு" style={yearBtn} onClick={() => setYear((y) => y + 1)}><ChevronRight size={20} /></button>
        </div>

        {mode === "festivals" && (
          <>
            {err && <div style={{ ...card, textAlign: "center", color: "#c0564f", fontSize: 13 }}>பட்டியலைப் பெற முடியவில்லை. இணைய இணைப்பைச் சரிபார்க்கவும்.</div>}
            {!err && list === null && <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13 }}>கணக்கிடப்படுகிறது…</div>}
            {list && (
              <div style={{ ...card, padding: "4px 14px" }}>
                {list.map((f, i) => {
                  const isNext = next && f === next;
                  return (
                    <button key={f.iso + f.name} data-festival onClick={() => onOpenDate(f.iso)} style={rowBtn(i === 0, f.iso < todayIso)}>
                      {dateBox(f.iso, isNext)}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "#27303f", lineHeight: 1.4 }}>{f.name}</span>
                        <span style={{ display: "block", fontSize: 12, color: "#55626f", lineHeight: 1.5 }}>{dWeek(f.iso)} · {f.tamil}{isNext ? " · அடுத்து வருவது" : ""}</span>
                      </span>
                      <ChevronRight size={16} color="#a3adc2" style={{ flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}
            <p style={note}>ஊர், பஞ்சாங்க மரபைப் பொறுத்து ஒரு நாள் வேறுபடலாம்.</p>
          </>
        )}

        {mode === "vratham" && (
          <>
            <div data-vratham-kinds style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {VRATHAM_KINDS.map(([k, label]) => (
                <button key={k} data-vkind={k} style={chip(kind === k)} onClick={() => setKind(k)}>{label}</button>
              ))}
            </div>
            {vrErr && <div style={{ ...card, textAlign: "center", color: "#c0564f", fontSize: 13 }}>பட்டியலைப் பெற முடியவில்லை. இணைய இணைப்பைச் சரிபார்க்கவும்.</div>}
            {!vrErr && vr === null && <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13 }}>கணக்கிடப்படுகிறது…</div>}
            {vr && vrItems.length === 0 && <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13 }}>இந்த ஆண்டுக்குப் பட்டியல் இல்லை.</div>}
            {vrMonths.map((g) => (
              <div key={g.m} data-vratham-month style={{ ...card, padding: g.m < 0 ? "4px 14px" : "10px 14px 4px" }}>
                {g.m >= 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "#7d6a3f", paddingBottom: 4 }}>{TA_MONTHS_FULL[g.m]}</div>}
                {g.items.map((v, i) => {
                  const isNext = vrNext === v;
                  const extra = [v.paksha, v.note].filter(Boolean).join(" · ");
                  return (
                    <button key={v.date + v.key} data-vratham={v.key} onClick={() => onOpenDate(v.date)} style={rowBtn(i === 0, v.date < todayIso)}>
                      {dateBox(v.date, isNext)}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "#27303f", lineHeight: 1.4 }}>{v.name}</span>
                        <span style={{ display: "block", fontSize: 12, color: "#55626f", lineHeight: 1.5 }}>{dWeek(v.date)}{extra ? ` · ${extra}` : ""}{isNext ? " · அடுத்து வருவது" : ""}</span>
                      </span>
                      <ChevronRight size={16} color="#a3adc2" style={{ flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            ))}
            <p style={note}>ஊர், பஞ்சாங்க மரபைப் பொறுத்து ஒரு நாள் வேறுபடலாம்.</p>
          </>
        )}
      </div>
      <BottomNav active="" onNav={onNav} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// நவகிரக வழிபாடு — மந்திரம், கோயில், ரத்தினம், தானம் (engine பரிகார அட்டவணை)
// ═══════════════════════════════════════════════════════════════════
export function NavagrahaScreen({ fetchNavagraha, onNav }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchNavagraha().then((r) => { if (alive) setData(r); }).catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const wd = new Date().getDay();
  const today = data?.weekdays?.[wd];
  return (
    <div style={page}>
      <div style={wrap}>
        <Back onBack={() => onNav("home")} />
        <h2 style={h2}>நவகிரக வழிபாடு</h2>
        <p style={sub}>ஒவ்வொரு கிரகத்துக்கும் மந்திரம், கோயில், ரத்தினம், தானம்</p>
        {err && <div style={{ ...card, textAlign: "center", color: "#c0564f", fontSize: 13 }}>விவரங்களைப் பெற முடியவில்லை. இணைய இணைப்பைச் சரிபார்க்கவும்.</div>}
        {!err && !data && <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13 }}>ஏற்றுகிறது…</div>}
        {today && (
          <div data-today-worship style={{ ...card, background: "#f6f1e4", border: "none", boxShadow: "none" }}>
            <div style={{ fontSize: 12.5, color: "#7d6a3f", marginBottom: 2 }}>இன்று {kizhamai(dWeek(isoOffset(0)))} · {today.lord}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#27303f", lineHeight: 1.5 }}>{today.deity}</div>
            <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7, marginTop: 4 }}>{today.remedy}</div>
            <div style={{ fontSize: 12.5, color: "#55626f", lineHeight: 1.6, marginTop: 4 }}>தானம்: {today.donate}</div>
          </div>
        )}
        {data && data.planets.map((g) => {
          const on = open === g.ta;
          return (
            <div key={g.ta} style={{ ...card, padding: 0, overflow: "hidden" }}>
              <button data-graha={g.ta} onClick={() => setOpen(on ? null : g.ta)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 16px" }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#1f3f68" }}>{g.ta}</span>
                  <span style={{ display: "block", fontSize: 12, color: "#55626f" }}>{kizhamai(g.day)} · {g.gem}</span>
                </span>
                <ChevronRight size={18} color="#a3adc2" style={{ flexShrink: 0, transform: on ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
              </button>
              {on && (
                <div data-graha-detail style={{ padding: "0 16px 14px" }}>
                  <div style={{ background: "#f8f9fc", borderRadius: 12, padding: "10px 12px", fontSize: 14, fontWeight: 700, color: "#27303f", lineHeight: 1.7, marginBottom: 6 }}>{g.mantra}
                    <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#55626f" }}>{g.mantraCount}</span>
                  </div>
                  {[["கோயில்", g.temple], ["ரத்தினம்", g.gem], ["உலோகம்", g.metal], ["நிறம்", g.color], ["மலர்", g.flower], ["தானம்", g.donate], ["உணவு", g.food], ["திசை", g.direction]].filter(([, v]) => v).map(([k, v], i) => (
                    <div key={k} style={{ display: "flex", gap: 12, padding: "7px 0", borderTop: i ? "1px solid #eef1f6" : "none", fontSize: 13, lineHeight: 1.6 }}>
                      <span style={{ width: 76, flexShrink: 0, color: "#55626f" }}>{k}</span>
                      <span style={{ color: "#27303f" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <p style={note}>உங்கள் ஜாதகத்துக்கான பரிகாரம்: “ஜாதகம்” பகுதியின் “பரிகாரம்”.</p>
      </div>
      <BottomNav active="" onNav={onNav} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// எண் கணிதம் — பிறவி எண், விதி எண், பெயர் எண்
// ═══════════════════════════════════════════════════════════════════
const fmtDob = (raw) => { const d = raw.replace(/\D/g, "").slice(0, 8); return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("."); };

export function NumerologyScreen({ defaultDob = "", onNav }) {
  const [dob, setDob] = useState(defaultDob);
  const [name, setName] = useState("");
  const n = numerologyOf(dob, name);
  const rows = [
    ["பிறவி எண்", "அடிப்படை இயல்பு", n.birth],
    ["விதி எண்", "வாழ்க்கைப் பாதை", n.destiny],
    ["பெயர் எண்", n.nameTotal ? `பெயர் எழுத்துக்களின் கூட்டு (${n.nameTotal})` : "பெயர் எழுத்துக்களின் கூட்டு", n.name],
  ];
  return (
    <div style={page}>
      <div style={wrap}>
        <Back onBack={() => onNav("home")} />
        <h2 style={h2}>எண் கணிதம்</h2>
        <p style={sub}>பிறந்த தேதியும் பெயரும் கொடுத்தால் மூன்று எண்களும் கிடைக்கும்</p>
        <div style={card}>
          <label style={label}>பிறந்த தேதி</label>
          <input style={{ ...input, letterSpacing: 2, fontFamily: "monospace", marginBottom: 14 }} inputMode="numeric" maxLength={10} placeholder="நாள்.மாதம்.ஆண்டு"
            value={dob} onChange={(e) => setDob(fmtDob(e.target.value))} />
          <label style={label}>பெயர் (ஆங்கில எழுத்துக்களில்)</label>
          <input style={input} placeholder="எ.கா. KUMAR" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {rows.filter(([, , v]) => v != null).map(([title, how, v]) => {
          const info = NUMBER_INFO[v];
          if (!info) return null;   // 0 / வரம்புக்கு வெளியே → crash தடுப்பு
          return (
            <div key={title} data-num={title} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <span style={{ width: 52, height: 52, borderRadius: 16, background: "#eef1fb", color: "#1f3f68", display: "grid", placeItems: "center", fontSize: 26, fontWeight: 800, flexShrink: 0 }}>{v}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1f3f68" }}>{title}</div>
                  <div style={{ fontSize: 12, color: "#55626f", lineHeight: 1.5 }}>{how}</div>
                </div>
              </div>
              <span style={{ ...chip, background: "#f6f1e4", color: "#7d6a3f", marginBottom: 8 }}>{info.planet} · {info.title}</span>
              <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7 }}>{info.text}</div>
            </div>
          );
        })}
        {n.birth == null && n.name == null && (
          <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13, lineHeight: 1.7 }}>பிறந்த தேதி அல்லது பெயரை உள்ளிடுங்கள்.</div>
        )}
      </div>
      <BottomNav active="" onNav={onNav} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// குழந்தை பெயர் எழுத்துக்கள் — நட்சத்திர பாதப்படி
// ═══════════════════════════════════════════════════════════════════
// பெயர் நடை: n = நவீனம், c = நடுத்தரம், t = பாரம்பரியம் (names-data.js)
const NAME_STYLES = [["n", "நவீனம்"], ["c", "நடுத்தரம்"], ["t", "பாரம்பரியம்"]];
// தமிழில் ஒரே எழுத்து பல ஒலிகளைக் குறிக்கும் (கா — கார்த்திக், காயத்ரி; பா — பாண்டியன், பாரதி). அந்த எழுத்தில் தொடங்கும்
// எல்லாப் பெயர்களும் காட்டப்படும்: பாதத்துக்கு உரிய ஒலியின் பெயர்கள் முதலில், பின் அதே எழுத்தின் மற்ற ஒலிகளுடையவை.
// "ஸ" என்று தொடங்கும் பெயர்கள் ஸ-வரிசை எழுத்துகளில் மட்டும்.
const RELATED_SOUNDS = {};
for (const fam of SOUND_FAMILIES) for (const s of fam) RELATED_SOUNDS[s] = fam.filter((x) => x !== s);
const namesOf = (sound, g, style, letter = "") => {
  const pick = (s) => { const v = NAMES_BY_SOUND[s]?.[g]; if (!v) return []; return style === "all" ? [...v.n, ...v.c, ...v.t] : (v[style] || []); };
  const own = pick(sound), rel = RELATED_SOUNDS[sound];
  if (!rel) return own;
  const seen = new Set(own), out = [...own], sLetter = letter.startsWith("ஸ");
  for (const s of rel) for (const n of pick(s)) if (!seen.has(n) && (sLetter || !n.startsWith("ஸ"))) { seen.add(n); out.push(n); }
  return out;
};

export function NameLettersScreen({ nakshatras, defaultNak = 0, defaultPada = null, onNav }) {
  const [nak, setNak] = useState(defaultNak >= 0 ? defaultNak : 0);
  const [pada, setPada] = useState(defaultPada || 1);
  const [style, setStyle] = useState("all");
  const syl = NAME_SYLLABLES[nak] || [];
  const cur = syl[pada - 1] || syl[0] || ["", ""];
  const total = namesOf(cur[1], "m", "all", cur[0]).length + namesOf(cur[1], "f", "all", cur[0]).length;
  const nameChip = { fontSize: 13.5, fontWeight: 600, color: "#27303f", background: "#f5f7fb", border: "1px solid #e3e8f2", borderRadius: 999, padding: "6px 12px", lineHeight: 1.4 };
  const styleChip = (on) => ({ flexShrink: 0, minHeight: 36, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", border: on ? "1px solid #1f3f68" : "1px solid #e3e8f2", background: on ? "#eef1fb" : "#ffffff", color: on ? "#1f3f68" : "#4a5365" });
  // ஒரு பாலினத்தின் பெயர்கள்: "எல்லாம்" எனில் நடைவாரியாகத் துணைத் தலைப்புடன்; ஒரு நடை எனில் அது மட்டும்.
  const group = (title, g, attr) => {
    const parts = (style === "all" ? NAME_STYLES : NAME_STYLES.filter(([k]) => k === style)).map(([k, label]) => [k, label, namesOf(cur[1], g, k, cur[0])]).filter(([, , list]) => list.length);
    const count = parts.reduce((a, [, , l]) => a + l.length, 0);
    return (
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1f3f68", marginBottom: 8 }}>{title}{count ? ` (${count})` : ""}</div>
        {parts.length ? parts.map(([k, label, list]) => (
          <div key={k} {...{ [attr]: k }} style={{ marginBottom: 10 }}>
            {style === "all" && <div style={{ fontSize: 12, fontWeight: 700, color: "#7d6a3f", marginBottom: 6 }}>{label}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {list.map((n) => <span key={n} data-name style={nameChip}>{n}</span>)}
            </div>
          </div>
        )) : <div style={{ fontSize: 13, color: "#55626f" }}>இந்த நடையில் இந்த எழுத்தில் வழக்கமான பெயர்கள் அரிது.</div>}
      </div>
    );
  };
  return (
    <div style={page}>
      <div style={wrap}>
        <Back onBack={() => onNav("home")} />
        <h2 style={h2}>குழந்தை பெயர்</h2>
        <p style={sub}>பிறந்த நட்சத்திர பாதத்துக்கு உரிய எழுத்தில் பெயர் தொடங்குவது மரபு. பாதத்தைத் தட்டினால் அந்த எழுத்தில் தொடங்கும் பெயர்கள்.</p>
        <div style={card}>
          <label style={label}>பிறந்த நட்சத்திரம்</label>
          <select data-nak value={nak} onChange={(e) => { setNak(Number(e.target.value)); setPada(1); }} style={{ ...input, cursor: "pointer" }}>
            {nakshatras.map((n, i) => <option key={i} value={i}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {syl.map(([ta, en], i) => {
            const mine = defaultPada === i + 1 && nak === defaultNak;
            const on = pada === i + 1;
            const ex = namesOf(en, "m", "all", ta)[0] || namesOf(en, "f", "all", ta)[0];
            return (
              <button key={i} data-pada={i + 1} aria-pressed={on} onClick={() => setPada(i + 1)}
                style={{ ...card, marginBottom: 0, textAlign: "center", cursor: "pointer", fontFamily: "inherit", border: on ? "1.5px solid #1f3f68" : card.border, background: on ? "#eef1fb" : "#ffffff" }}>
                <div style={{ fontSize: 12, color: "#55626f" }}>{i + 1}ஆம் பாதம்{mine ? " · உங்களுடையது" : ""}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#1f3f68", lineHeight: 1.4 }}>{ta}</div>
                <div data-pada-example style={{ fontSize: 12.5, color: "#7d6a3f", minHeight: 19 }}>{ex ? `எ.கா. ${ex}` : ""}</div>
              </button>
            );
          })}
        </div>
        <div data-names-card style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1f3f68" }}>“{cur[0]}” எழுத்துக்கு உரிய பெயர்கள்{total ? ` (${total})` : ""}</div>
          {total > 0 ? (
            <>
              <div data-name-styles style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                <button data-name-style="all" style={styleChip(style === "all")} onClick={() => setStyle("all")}>எல்லாம்</button>
                {NAME_STYLES.map(([k, label]) => <button key={k} data-name-style={k} style={styleChip(style === k)} onClick={() => setStyle(k)}>{label}</button>)}
              </div>
              {group("ஆண் குழந்தை", "m", "data-names-m")}
              {group("பெண் குழந்தை", "f", "data-names-f")}
            </>
          ) : (
            <div data-names-empty style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7, marginTop: 8 }}>
              இந்த எழுத்தில் தொடங்கும் வழக்கமான தமிழ்ப் பெயர்கள் அரிது. இதே நட்சத்திரத்தின் மற்ற பாத எழுத்துகளையும் பார்க்கலாம்; பல குடும்பங்கள் நட்சத்திரத்தின் எந்தப் பாத எழுத்தையும் ஏற்கின்றன.
            </div>
          )}
        </div>
        <div style={{ ...card, display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#4a5365", lineHeight: 1.7 }}>
          <CircleCheck size={18} color="#2e7d5b" style={{ flexShrink: 0, marginTop: 3 }} />
          <span>நட்சத்திரமும் பாதமும் தெரியவில்லையா? “ஜாதகம்” பகுதியில் பிறப்பு விவரம் கொடுத்தால் “கட்டம்” பகுதியில் நட்சத்திரம், பாதம், உரிய எழுத்து மூன்றும் தெரியும்.</span>
        </div>
        <p style={note}>பெயர்கள் பரிந்துரைகள் மட்டுமே.</p>
      </div>
      <BottomNav active="" onNav={onNav} />
    </div>
  );
}
