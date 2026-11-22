import { NAMES_BY_SOUND, SOUND_FAMILIES } from "./names-data.js";
import { useEffect, useState } from "react";
import {
  ChevronRight, Share2, TriangleAlert, CircleCheck, ChevronLeft,
} from "lucide-react";

import BottomNav from "./BottomNav.jsx";
import { NAME_SYLLABLES, NUMBER_INFO, numerologyOf, kizhamai } from "./tools-data.js";
import { useLang } from "../i18n/index.js";

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

const MODES = ["today", "tomorrow", "week", "month", "year"];
const dShort = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("ta-IN", { day: "numeric", month: "short" });
const dWeek = (iso) => ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"][new Date(iso + "T00:00:00").getDay()];
// நிலை நிறங்கள் (நல்லது / கவனம் / நடுநிலை); காட்சிப் பெயர் t() வழியே (moodLabel)
const MOOD = { good: { c: "#2e7d5b", bg: "#e9f5ee" }, caution: { c: "#c0564f", bg: "#fbeeed" }, neutral: { c: "#4a5365", bg: "#f3f5f9" } };
const moodLabel = (t, k) => t(k === "good" ? "rasi.mood.good" : k === "caution" ? "rasi.mood.caution" : "rasi.mood.neutral");

export function RasiPalanScreen({ rashis, defaultRashi = null, fetchPalan, fetchPeriod, onNav, onShare }) {
  const { lang, t, tRashi, tPlanet, tNak, tTithi, tWeekday, tColor, tGem } = useLang();
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
  const mood = g ? (g.overallMood === "good" ? { t: t("rasi.mood.good"), c: "#2e7d5b", bg: "#e9f5ee" } : g.overallMood === "caution" ? { t: t("rasi.mood.cautionDay"), c: "#c0564f", bg: "#fbeeed" } : { t: t("rasi.mood.neutralDay"), c: "#4a5365", bg: "#f3f5f9" }) : null;
  const moon = g?.results.find((r) => r.ta === "சந்திரன்");
  const good = g ? g.results.filter((r) => r.effect === "good").map((r) => r.ta) : [];
  const bad = g ? g.results.filter((r) => r.effect === "bad").map((r) => r.ta) : [];
  const dayWord = t(day === 0 ? "rasi.dayToday" : "rasi.dayTomorrow");
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
        <Back onBack={() => onNav("home")} text={t("common.back")} />
        <h2 style={h2}>{t("svc.rasi.t")}</h2>
        <p style={sub}>{t("rasi.choose")}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
          {rashis.map((r, i) => {
            const on = rashi === i;
            return (
              <button key={i} data-rashi={i} onClick={() => setRashi(i)} style={{ padding: "10px 2px 8px", borderRadius: 14, cursor: "pointer", textAlign: "center",
                border: on ? "1px solid #1f3f68" : "1px solid #e3e8f2", background: on ? "#1f3f68" : "#ffffff", color: on ? "#ffffff" : "#27303f" }}>
                <span style={{ display: "block", fontSize: 18, lineHeight: 1.2, color: on ? "#f7e2a6" : "#a9823c" }}>{RASHI_GLYPH[i]}</span>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: on ? 700 : 500 }}>{tRashi(r)}</span>
              </button>
            );
          })}
        </div>

        {rashi == null && (
          <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13, lineHeight: 1.7 }}>
            {t("rasi.dontKnow")}
          </div>
        )}

        {rashi != null && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {MODES.map((k) => (
              <button key={k} data-mode={k} onClick={() => setMode(k)} style={{ flex: "1 1 auto", minHeight: 38, padding: "9px 2px", borderRadius: 999, fontSize: 12.5, fontWeight: mode === k ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
                border: mode === k ? "1px solid #1f3f68" : "1px solid #e3e8f2", background: mode === k ? "#1f3f68" : "#ffffff", color: mode === k ? "#ffffff" : "#4a5365" }}>{t("rasi.mode." + k)}</button>
            ))}
          </div>
        )}

        {rashi != null && state === "loading" && <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13 }}>{t("common.computing")}</div>}
        {rashi != null && state === "error" && <div style={{ ...card, textAlign: "center", color: "#c0564f", fontSize: 13 }}>{t("rasi.fetchFail")}</div>}

        {rashi != null && state === "idle" && !isDaily && pdata && pdata.period === mode && (
          <PeriodPalan p={pdata} onNav={onNav} onShare={onShare} />
        )}

        {rashi != null && state === "idle" && isDaily && data && (<>
          <div data-palan style={{ ...card, background: mood.bg, border: "none", boxShadow: "none" }}>
            <div style={{ fontSize: 12.5, color: "#4a5365", marginBottom: 2 }}>{tRashi(data.rashi)} {t("result.rashi")} · {data.date.dateStr} · {lang === "ta" ? kizhamai(data.date.dayName) : tWeekday(data.date.dayName)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: mood.c, lineHeight: 1.4 }}>{mood.t}</div>
            {g.isChandrashtama && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8, fontSize: 13, color: "#c0564f", lineHeight: 1.6 }}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 3 }} />
                <span><b>{t("pan.chandrashtama")}</b> — {t("rasi.chandrashtamaNote", { day: dayWord })}</span>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={secTitle}>{t("rasi.planetState", { day: dayWord })}</div>
            {moon && <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7, marginBottom: 8 }}>{t("rasi.planetInRashi", { planet: tPlanet("சந்திரன்"), rashi: tRashi(moon.rashi) })} — {t("house.n", { n: moon.houseFromMoon })}</div>}
            {good.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#55626f", marginBottom: 5 }}>{t("rasi.goodPlanets")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{good.map((p) => <span key={p} style={{ ...chip, background: "#e9f5ee", color: "#2e7d5b" }}>{tPlanet(p)}</span>)}</div>
              </div>
            )}
            {bad.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: "#55626f", marginBottom: 5 }}>{t("rasi.cautionPlanets")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{bad.map((p) => <span key={p} style={{ ...chip, background: "#fbeeed", color: "#c0564f" }}>{tPlanet(p)}</span>)}</div>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={secTitle}>{t("rasi.longTerm")}</div>
            {data.guruPeyarchi && (
              <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7, marginBottom: 8 }}>
                <b style={{ color: "#27303f" }}>{tPlanet("குரு")}</b> — {t("rasi.inRashiHouse", { rashi: tRashi(data.guruPeyarchi.rashi), house: t("house.n", { n: data.guruPeyarchi.houseFromMoon }) })}: {data.guruPeyarchi.desc}
              </div>
            )}
            {data.saniTransit && (
              <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7, marginBottom: 8 }}>
                <b style={{ color: "#27303f" }}>{tPlanet("சனி")}</b> — {t("rasi.inRashiHouse", { rashi: tRashi(data.saniTransit.rashi), house: t("house.n", { n: data.saniTransit.houseFromMoon }) })}: {data.saniTransit.desc}
              </div>
            )}
            {data.sadeSati && (
              <span style={{ ...chip, background: data.sadeSati.active ? "#fbeeed" : "#e9f5ee", color: data.sadeSati.active ? "#c0564f" : "#2e7d5b" }}>
                {data.sadeSati.active ? `${data.sadeSati.isEzharai ? t("rasi.ezharai") + " — " : ""}${data.sadeSati.phase}${data.sadeSati.stage ? ` (${data.sadeSati.stage})` : ""}` : t("rasi.noEzharai")}
              </span>
            )}
          </div>

          <div style={card}>
            <div style={secTitle}>{t("rasi.todo", { day: dayWord })}</div>
            {[
              [t("pan.tithi"), t("rasi.tithiNak", { tithi: tTithi(data.panchang.tithi), nak: tNak(data.panchang.nakshatra) })],
              data.remedy?.tithiInfo?.activity ? [t("rasi.activity"), data.remedy.tithiInfo.activity] : null,
              data.remedy?.dayInfo?.remedy ? [t("rasi.worship"), data.remedy.dayInfo.remedy] : null,
              data.remedy?.dayInfo?.donate ? [t("common.donate"), data.remedy.dayInfo.donate] : null,
              data.remedy?.dayInfo?.avoid ? [t("rasi.avoid"), data.remedy.dayInfo.avoid] : null,
              data.panchaka ? [t("rasi.panchakam"), `${data.panchaka.name} — ${data.panchaka.avoid}`] : null,
            ].filter(Boolean).map(([k, v], i) => (
              <div key={k} style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: i ? "1px solid #eef1f6" : "none", fontSize: 13, lineHeight: 1.6 }}>
                <span style={{ width: 92, flexShrink: 0, color: "#55626f" }}>{k}</span>
                <span style={{ color: "#27303f" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={secTitle}>{t("rasi.tipsFor", { rashi: tRashi(data.rashi) })}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                [t("rasi.lord"), data.remedy?.rashiInfo?.lord], [t("rasi.deity"), data.remedy?.rashiInfo?.deity],
                [t("rasi.color"), data.remedy?.rashiInfo?.color ? tColor(data.remedy.rashiInfo.color) : null], [t("common.gem"), data.remedy?.rashiInfo?.gem ? tGem(data.remedy.rashiInfo.gem) : null],
                [t("lucky.numbers"), (data.luckyNums || []).join(", ")],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ background: "#f8f9fc", borderRadius: 12, padding: "9px 12px" }}>
                  <div style={{ fontSize: 11.5, color: "#55626f" }}>{k}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1f3f68" }}>{v}</div>
                </div>
              ))}
            </div>
            {data.remedy?.rashiInfo?.mantra && <div style={{ fontSize: 13, color: "#4a5365", marginTop: 10 }}>{t("common.mantra")}: <b style={{ color: "#27303f" }}>{data.remedy.rashiInfo.mantra}</b></div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <button data-share onClick={() => onShare(`${data.rashi} ராசி பலன்`, shareText())} style={{ padding: "12px 0", borderRadius: 14, border: "1.5px solid #ccd6e8", background: "#ffffff", color: "#1f3f68", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Share2 size={16} /> {t("common.share")}
            </button>
            <button data-personal onClick={() => onNav("daily")} style={{ padding: "12px 0", borderRadius: 14, border: "1px solid #1f3f68", background: "#1f3f68", color: "#ffffff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
              {t("rasi.personal")}
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
  const { t, tPlanet, tRashi } = useLang();
  return rows.map((r, i) => (
    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderTop: i ? "1px solid #eef1f6" : "none" }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.6, color: "#4a5365" }}>
        {dated && <span style={{ color: "#55626f" }}>{dShort(r.iso)} · </span>}
        <b style={{ color: "#27303f" }}>{tPlanet(r.ta)}</b> {dated ? "→" : "—"} {tRashi(r.rashi)} ({t("house.n", { n: r.house })})
        {r.theme && <span style={{ display: "block", fontSize: 12, color: "#55626f" }}>{r.theme}</span>}
      </div>
      <span style={{ ...chip, flexShrink: 0, background: r.effect === "good" ? "#e9f5ee" : r.effect === "bad" ? "#fbeeed" : "#f3f5f9", color: r.effect === "good" ? "#2e7d5b" : r.effect === "bad" ? "#c0564f" : "#4a5365" }}>
        {r.effect === "good" ? t("rasi.effect.good") : r.effect === "bad" ? t("rasi.mood.caution") : t("rasi.effect.neutral")}
      </span>
    </div>
  ));
}

function PeriodPalan({ p, onNav, onShare }) {
  const { t, tRashi, tPlanet, tWeekday } = useLang();
  if (p.period === "year") {
    return (<>
      <div data-period="year" style={card}>
        <div style={secTitle}>{t("rasi.yearState", { rashi: tRashi(p.rashi), year: p.year })}</div>
        <div style={{ fontSize: 12.5, color: "#55626f", lineHeight: 1.6, marginBottom: 6 }}>{t("rasi.slowPlanets")}</div>
        {p.slow.map((s, i) => (
          <div key={i} style={{ padding: "11px 0", borderTop: "1px solid #eef1f6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#27303f" }}>{tPlanet(s.ta)} — {tRashi(s.rashi)} <span style={{ fontWeight: 500, color: "#55626f" }}>({t("house.n", { n: s.house })})</span></div>
              <span style={{ ...chip, flexShrink: 0, background: s.effect === "good" ? "#e9f5ee" : "#fbeeed", color: s.effect === "good" ? "#2e7d5b" : "#c0564f" }}>{s.effect === "good" ? t("rasi.effect.good") : t("rasi.mood.caution")}</span>
            </div>
            <div style={{ fontSize: 12, color: "#55626f", marginTop: 2 }}>{dShort(s.from)} – {dShort(s.to)}</div>
            <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.65, marginTop: 4 }}>{s.desc || s.theme}</div>
            {s.sadeSati?.active && <span style={{ ...chip, marginTop: 6, background: "#fbeeed", color: "#c0564f" }}>{s.sadeSati.isEzharai ? t("rasi.ezharai") + " — " : ""}{s.sadeSati.phase}{s.sadeSati.stage ? ` (${s.sadeSati.stage})` : ""}</span>}
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
      <div style={secTitle}>{t(isWeek ? "rasi.weekTitle" : "rasi.monthTitle", { rashi: tRashi(p.rashi) })}</div>
      <div style={{ fontSize: 12.5, color: "#55626f", marginBottom: 10 }}>{t("rasi.range", { from: dShort(p.from), to: dShort(p.to) })}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[["good", "rasi.goodDays"], ["neutral", "rasi.mood.neutral"], ["caution", "rasi.mood.caution"]].map(([k, lk]) => (
          <div key={k} style={{ background: MOOD[k].bg, borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: MOOD[k].c, lineHeight: 1.2 }}>{p.counts[k] || 0}</div>
            <div style={{ fontSize: 11.5, color: "#4a5365" }}>{t(lk)}</div>
          </div>
        ))}
      </div>
      {p.chandrashtama.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, fontSize: 13, color: "#c0564f", lineHeight: 1.6 }}>
          <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 3 }} />
          <span><b>{t("pan.chandrashtama")}:</b> {t("rasi.chandrashtamaDates", { dates: p.chandrashtama.map((x) => `${dShort(x)} (${tWeekday(dWeek(x))})`).join(", ") })}</span>
        </div>
      )}
    </div>

    {isWeek ? (
      <div style={card}>
        <div style={secTitle}>{t("rasi.dayByDay")}</div>
        {p.days.map((x, i) => (
          <div key={x.iso} data-pday style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i ? "1px solid #eef1f6" : "none" }}>
            <div style={{ width: 92, flexShrink: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#27303f" }}>{tWeekday(dWeek(x.iso))}</div>
              <div style={{ fontSize: 12, color: "#55626f" }}>{dShort(x.iso)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "#4a5365", lineHeight: 1.5 }}>{t("rasi.planetInRashi", { planet: tPlanet("சந்திரன்"), rashi: tRashi(x.moonRashi) })}{x.moonHouse ? ` (${t("house.n", { n: x.moonHouse })})` : ""}</div>
            <span style={{ ...chip, flexShrink: 0, background: x.chandrashtama ? "#fbeeed" : MOOD[x.mood].bg, color: x.chandrashtama ? "#c0564f" : MOOD[x.mood].c }}>{x.chandrashtama ? t("pan.chandrashtama") : moodLabel(t, x.mood)}</span>
          </div>
        ))}
      </div>
    ) : (
      <div style={card}>
        <div style={secTitle}>{t("rasi.bestDays")}</div>
        {p.bestDays.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{p.bestDays.map((x) => <span key={x} data-best style={{ ...chip, background: "#e9f5ee", color: "#2e7d5b" }}>{dShort(x)} {tWeekday(dWeek(x)).slice(0, 2)}</span>)}</div>
        ) : <div style={{ fontSize: 13, color: "#55626f" }}>{t("rasi.noBestDays")}</div>}
      </div>
    )}

    <div style={card}>
      <div style={secTitle}>{t("rasi.currentPlanets")}</div>
      <PlanetRows rows={p.planets} />
    </div>
    {p.ingresses.length > 0 && (
      <div style={card}>
        <div style={secTitle}>{t(isWeek ? "rasi.weekChanges" : "rasi.periodChanges")}</div>
        <PlanetRows rows={p.ingresses} dated />
      </div>
    )}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
      <button data-share onClick={share} style={{ padding: "12px 0", borderRadius: 14, border: "1.5px solid #ccd6e8", background: "#ffffff", color: "#1f3f68", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Share2 size={16} /> {t("common.share")}</button>
      <button onClick={() => onNav("daily")} style={{ padding: "12px 0", borderRadius: 14, border: "1px solid #1f3f68", background: "#1f3f68", color: "#ffffff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>{t("rasi.personal")}</button>
    </div>
  </>);
}

// ═══════════════════════════════════════════════════════════════════
// பண்டிகைகள் — ஓர் ஆண்டின் தமிழ்ப் பண்டிகைகள் (server கணக்கு; சரிபார்க்கப்பட்ட விதிகள்)
// ═══════════════════════════════════════════════════════════════════
// விரத நாட்களின் வடிகட்டி — key (காட்சிப் பெயர் t("vk."+k) வழியே)
const VRATHAM_KINDS = ["all", "amavasai", "pournami", "ekadashi", "pradosham", "chaturthi", "sankatahara", "krittikai", "sivaratri"];

export function FestivalsScreen({ fetchFestivals, fetchVratham, onNav, onOpenDate }) {
  const { t, tList, tWeekday } = useLang();
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
        <Back onBack={() => onNav("home")} text={t("common.back")} />
        <h2 style={h2}>{t("fest.title")}</h2>
        <p style={sub}>{t("fest.sub")}</p>
        {fetchVratham && (
          <div data-fest-mode style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "#f3f5f9", marginBottom: 12 }}>
            <button data-mode="festivals" style={seg(mode === "festivals")} onClick={() => setMode("festivals")}>{t("fest.festivals")}</button>
            <button data-mode="vratham" style={seg(mode === "vratham")} onClick={() => setMode("vratham")}>{t("fest.vrathams")}</button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button data-year-prev aria-label={t("fest.prevYear")} style={yearBtn} onClick={() => setYear((y) => y - 1)}><ChevronLeft size={20} /></button>
          <div data-year style={{ fontSize: 20, fontWeight: 800, color: "#1f3f68" }}>{year}</div>
          <button data-year-next aria-label={t("fest.nextYear")} style={yearBtn} onClick={() => setYear((y) => y + 1)}><ChevronRight size={20} /></button>
        </div>

        {mode === "festivals" && (
          <>
            {err && <div style={{ ...card, textAlign: "center", color: "#c0564f", fontSize: 13 }}>{t("err.fetchList")}</div>}
            {!err && list === null && <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13 }}>{t("common.computing")}</div>}
            {list && (
              <div style={{ ...card, padding: "4px 14px" }}>
                {list.map((f, i) => {
                  const isNext = next && f === next;
                  return (
                    <button key={f.iso + f.name} data-festival onClick={() => onOpenDate(f.iso)} style={rowBtn(i === 0, f.iso < todayIso)}>
                      {dateBox(f.iso, isNext)}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "#27303f", lineHeight: 1.4 }}>{f.name}</span>
                        <span style={{ display: "block", fontSize: 12, color: "#55626f", lineHeight: 1.5 }}>{tWeekday(dWeek(f.iso))} · {f.tamil}{isNext ? ` · ${t("fest.next")}` : ""}</span>
                      </span>
                      <ChevronRight size={16} color="#a3adc2" style={{ flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}
            <p style={note}>{t("fest.note")}</p>
          </>
        )}

        {mode === "vratham" && (
          <>
            <div data-vratham-kinds style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {VRATHAM_KINDS.map((k) => (
                <button key={k} data-vkind={k} style={chip(kind === k)} onClick={() => setKind(k)}>{t("vk." + k)}</button>
              ))}
            </div>
            {vrErr && <div style={{ ...card, textAlign: "center", color: "#c0564f", fontSize: 13 }}>{t("err.fetchList")}</div>}
            {!vrErr && vr === null && <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13 }}>{t("common.computing")}</div>}
            {vr && vrItems.length === 0 && <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13 }}>{t("fest.emptyYear")}</div>}
            {vrMonths.map((g) => (
              <div key={g.m} data-vratham-month style={{ ...card, padding: g.m < 0 ? "4px 14px" : "10px 14px 4px" }}>
                {g.m >= 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "#7d6a3f", paddingBottom: 4 }}>{tList("months")[g.m]}</div>}
                {g.items.map((v, i) => {
                  const isNext = vrNext === v;
                  const extra = [v.paksha, v.note].filter(Boolean).join(" · ");
                  return (
                    <button key={v.date + v.key} data-vratham={v.key} onClick={() => onOpenDate(v.date)} style={rowBtn(i === 0, v.date < todayIso)}>
                      {dateBox(v.date, isNext)}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "#27303f", lineHeight: 1.4 }}>{v.name}</span>
                        <span style={{ display: "block", fontSize: 12, color: "#55626f", lineHeight: 1.5 }}>{tWeekday(dWeek(v.date))}{extra ? ` · ${extra}` : ""}{isNext ? ` · ${t("fest.next")}` : ""}</span>
                      </span>
                      <ChevronRight size={16} color="#a3adc2" style={{ flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            ))}
            <p style={note}>{t("fest.note")}</p>
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
export function NavagrahaScreen({ fetchNavagraha, onNav, onBack }) {
  const { lang, t, tPlanet, tWeekday, tGem, tColor, tDir } = useLang();
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
        <Back onBack={() => (onBack ? onBack() : onNav("home"))} text={t("common.back")} />
        <h2 style={h2}>{t("svc.navagraha.t")}</h2>
        <p style={sub}>{t("navag.sub")}</p>
        {err && <div style={{ ...card, textAlign: "center", color: "#c0564f", fontSize: 13 }}>{t("err.fetchInfo")}</div>}
        {!err && !data && <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13 }}>{t("common.loading")}</div>}
        {today && (
          <div data-today-worship style={{ ...card, background: "#f6f1e4", border: "none", boxShadow: "none" }}>
            <div style={{ fontSize: 12.5, color: "#7d6a3f", marginBottom: 2 }}>{t("navag.today", { day: lang === "ta" ? kizhamai(dWeek(isoOffset(0))) : tWeekday(dWeek(isoOffset(0))), lord: tPlanet(today.lord) })}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#27303f", lineHeight: 1.5 }}>{today.deity}</div>
            <div style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7, marginTop: 4 }}>{today.remedy}</div>
            <div style={{ fontSize: 12.5, color: "#55626f", lineHeight: 1.6, marginTop: 4 }}>{t("common.donate")}: {today.donate}</div>
          </div>
        )}
        {data && data.planets.map((g) => {
          const on = open === g.ta;
          return (
            <div key={g.ta} style={{ ...card, padding: 0, overflow: "hidden" }}>
              <button data-graha={g.ta} onClick={() => setOpen(on ? null : g.ta)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 16px" }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#1f3f68" }}>{tPlanet(g.ta)}</span>
                  <span style={{ display: "block", fontSize: 12, color: "#55626f" }}>{lang === "ta" ? kizhamai(g.day) : tWeekday(g.day)} · {tGem(g.gem)}</span>
                </span>
                <ChevronRight size={18} color="#a3adc2" style={{ flexShrink: 0, transform: on ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
              </button>
              {on && (
                <div data-graha-detail style={{ padding: "0 16px 14px" }}>
                  <div style={{ background: "#f8f9fc", borderRadius: 12, padding: "10px 12px", fontSize: 14, fontWeight: 700, color: "#27303f", lineHeight: 1.7, marginBottom: 6 }}>{g.mantra}
                    <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#55626f" }}>{g.mantraCount}</span>
                  </div>
                  {[[t("navag.temple"), g.temple], [t("common.gem"), g.gem ? tGem(g.gem) : null], [t("navag.metal"), g.metal], [t("navag.color"), g.color ? tColor(g.color) : null], [t("navag.flower"), g.flower], [t("common.donate"), g.donate], [t("navag.food"), g.food], [t("navag.direction"), g.direction ? tDir(g.direction) : null]].filter(([, v]) => v).map(([k, v], i) => (
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
        <p style={note}>{t("navag.note")}</p>
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
  const { t } = useLang();
  const [dob, setDob] = useState(defaultDob);
  const [name, setName] = useState("");
  const n = numerologyOf(dob, name);
  const rows = [
    [t("num.birth"), t("num.birthHow"), n.birth],
    [t("num.destiny"), t("num.destinyHow"), n.destiny],
    [t("num.name"), n.nameTotal ? t("num.nameHowTotal", { total: n.nameTotal }) : t("num.nameHow"), n.name],
  ];
  return (
    <div style={page}>
      <div style={wrap}>
        <Back onBack={() => onNav("home")} text={t("common.back")} />
        <h2 style={h2}>{t("svc.numerology.t")}</h2>
        <p style={sub}>{t("num.sub")}</p>
        <div style={card}>
          <label style={label}>{t("ob.dob.title")}</label>
          <input style={{ ...input, letterSpacing: 2, fontFamily: "monospace", marginBottom: 14 }} inputMode="numeric" maxLength={10} placeholder={t("form.dobHint")}
            value={dob} onChange={(e) => setDob(fmtDob(e.target.value))} />
          <label style={label}>{t("num.nameLabel")}</label>
          <input style={input} placeholder={t("num.namePlaceholder", { ex: "KUMAR" })} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
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
          <div style={{ ...card, textAlign: "center", color: "#55626f", fontSize: 13, lineHeight: 1.7 }}>{t("num.empty")}</div>
        )}
      </div>
      <BottomNav active="" onNav={onNav} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// குழந்தை பெயர் எழுத்துக்கள் — நட்சத்திர பாதப்படி
// ═══════════════════════════════════════════════════════════════════
// பெயர் நடை: n = நவீனம், c = நடுத்தரம், t = பாரம்பரியம் (names-data.js) — காட்சிப் பெயர் t("names.*") வழியே
const NAME_STYLES = [["n", "names.modern"], ["c", "names.middle"], ["t", "names.traditional"]];
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
  const { t, tNak } = useLang();
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
            {style === "all" && <div style={{ fontSize: 12, fontWeight: 700, color: "#7d6a3f", marginBottom: 6 }}>{t(label)}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {list.map((n) => <span key={n} data-name style={nameChip}>{n}</span>)}
            </div>
          </div>
        )) : <div style={{ fontSize: 13, color: "#55626f" }}>{t("names.styleEmpty")}</div>}
      </div>
    );
  };
  return (
    <div style={page}>
      <div style={wrap}>
        <Back onBack={() => onNav("home")} text={t("common.back")} />
        <h2 style={h2}>{t("svc.names.t")}</h2>
        <p style={sub}>{t("names.sub")}</p>
        <div style={card}>
          <label style={label}>{t("names.nakLabel")}</label>
          <select data-nak value={nak} onChange={(e) => { setNak(Number(e.target.value)); setPada(1); }} style={{ ...input, cursor: "pointer" }}>
            {nakshatras.map((n, i) => <option key={i} value={i}>{tNak(n)}</option>)}
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
                <div style={{ fontSize: 12, color: "#55626f" }}>{t("names.pada", { n: i + 1 })}{mine ? ` · ${t("names.mine")}` : ""}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#1f3f68", lineHeight: 1.4 }}>{ta}</div>
                <div data-pada-example style={{ fontSize: 12.5, color: "#7d6a3f", minHeight: 19 }}>{ex ? t("names.eg", { ex }) : ""}</div>
              </button>
            );
          })}
        </div>
        <div data-names-card style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1f3f68" }}>{t("names.forLetter", { letter: cur[0] })}{total ? ` (${total})` : ""}</div>
          {total > 0 ? (
            <>
              <div data-name-styles style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                <button data-name-style="all" style={styleChip(style === "all")} onClick={() => setStyle("all")}>{t("vk.all")}</button>
                {NAME_STYLES.map(([k, label]) => <button key={k} data-name-style={k} style={styleChip(style === k)} onClick={() => setStyle(k)}>{t(label)}</button>)}
              </div>
              {group(t("names.boy"), "m", "data-names-m")}
              {group(t("names.girl"), "f", "data-names-f")}
            </>
          ) : (
            <div data-names-empty style={{ fontSize: 13, color: "#4a5365", lineHeight: 1.7, marginTop: 8 }}>
              {t("names.empty")}
            </div>
          )}
        </div>
        <div style={{ ...card, display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#4a5365", lineHeight: 1.7 }}>
          <CircleCheck size={18} color="#2e7d5b" style={{ flexShrink: 0, marginTop: 3 }} />
          <span>{t("names.hint")}</span>
        </div>
        <p style={note}>{t("names.note")}</p>
      </div>
      <BottomNav active="" onNav={onNav} />
    </div>
  );
}
