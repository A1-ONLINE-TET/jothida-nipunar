// ═══════════════════════════════════════════════════════════════════
// பரிகாரம் tab — ஜாதகத்துக்கான பரிகாரங்கள், நேரடியாக (பயனர் கோரிக்கை 2026-11: "எப்படித் தீர்மானிக்கப்பட்டது",
// "ஏன் முக்கியம்", "முறை ஏன்" போன்ற விளக்கப் பகுதிகள் வேண்டாம் — என்ன செய்ய வேண்டும் என்பது மட்டும்).
// எல்லாக் கணக்கும் server-இல் (/api/remedy-plan); இங்கே காட்சி மட்டும்.
// விற்பனை இல்லை: ரத்தினம்/பூஜை எதுவும் விற்கப்படுவதில்லை — "தேவையா, தேவையில்லையா" என்ற தீர்ப்பு மட்டும்.
// ═══════════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  Gem, CalendarClock, CircleCheck, TriangleAlert, ChevronDown, ChevronRight,
  Flame, Share2, Sprout, Clock, Star, Heart, Hourglass,
} from "lucide-react";
import { useLang } from "../i18n/index.js";

const INK = "#27303f", SOFT = "#4a5365", MUTED = "#55626f", LINE = "#e3e8f2", NAVY = "#1f3f68";
const TEAL = "#2e8b84", TEAL_DARK = "#226b66", TEAL_TINT = "#e9f5f4";
const GREEN = "#2e7d5b", RED = "#c0564f", GOLD = "#a9823c";

const STAGE = {
  now:      { color: "#b5683a", tint: "#faf0e8", icon: Clock },
  root:     { color: "#5565b8", tint: "#eef1fb", icon: Sprout },
  later:    { color: "#8a62b0", tint: "#f4eefa", icon: Hourglass },
  marriage: { color: "#c2607c", tint: "#fbeef2", icon: Heart },
};
const GEM = {
  ok:      { color: GREEN, tint: "#eaf5ef" },
  caution: { color: GOLD,  tint: "#f8f3e6" },
  no:      { color: RED,   tint: "#fbeeed" },
};
const DOSHA_TONE = {
  present:   { color: "#b5683a", tint: "#faf0e8" },
  partial:   { color: GOLD, tint: "#f8f3e6" },
  cancelled: { color: GREEN, tint: "#eaf5ef" },
  absent:    { color: GREEN, tint: "#eaf5ef" },
};

const label = { fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3, color: MUTED, marginBottom: 5 };
const bullet = { display: "flex", gap: 8, fontSize: 13.5, lineHeight: 1.7, color: INK, marginBottom: 3 };
const dot = (c) => ({ width: 5, height: 5, borderRadius: 5, background: c, marginTop: 9, flexShrink: 0 });
const pill = (c, t) => ({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: c, background: t, padding: "3px 10px", borderRadius: 999, lineHeight: 1.6 });

function ItemCard({ it, card, fmtDate, defaultOpen }) {
  const { t, tWeekday, tPhase } = useLang();
  const [open, setOpen] = useState(!!defaultOpen);
  const st = STAGE[it.stage] || STAGE.root; const StIcon = st.icon;
  const gem = it.gem ? GEM[it.gem.verdict] : null;
  const start = it.startOn;
  return (
    <div data-remedy-item={it.id} style={{ ...card, marginBottom: 12, padding: 0, overflow: "hidden", boxShadow: `inset 3px 0 0 ${st.color}, 0 10px 34px -14px rgba(35,55,95,0.16)` }}>
      <div style={{ padding: "15px 16px 12px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          <span style={pill(st.color, st.tint)}><StIcon size={12} strokeWidth={2.2} />{it.stageLabel}</span>
          {it.primary && <span style={pill("#7d6a3f", "#f6f1e4")}><Star size={11} strokeWidth={2.4} />{t("rem.primary")}</span>}
          {it.until && <span style={pill(SOFT, "#f2f5fb")}>{t("result.untilDate", { date: fmtDate(it.until) })}</span>}
          {!it.until && it.comingFrom && <span style={pill(SOFT, "#f2f5fb")}>{t("rem.from", { date: fmtDate(it.comingFrom) })}</span>}
        </div>
        <div style={{ fontSize: 16.5, fontWeight: 700, color: NAVY, lineHeight: 1.45, marginBottom: 10 }}>{it.title}</div>

        <div style={label}>{t("rem.reason")}</div>
        {it.root.map((t, i) => (<div key={i} style={bullet}><span style={dot(st.color)} /><span>{t}</span></div>))}

        {it.affects?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {it.affects.map((a) => (<span key={a} style={{ fontSize: 12, color: SOFT, background: "#f5f7fb", border: `1px solid ${LINE}`, padding: "3px 10px", borderRadius: 999 }}>{a}</span>))}
          </div>
        )}

      </div>

      <button data-remedy-toggle={it.id} onClick={() => setOpen((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "11px 16px 11px 18px", background: "#fafbfe",
        borderTop: `1px solid ${LINE}`, borderLeft: "none", borderRight: "none", borderBottom: open ? `1px solid ${LINE}` : "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: NAVY }}>
        <span>{t("rem.todo", { n: it.steps.length })}</span>
        <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>

      {open && (
        <div style={{ padding: "12px 16px 15px 18px" }}>
          {it.steps.map((s, i) => (
            <div key={s.k} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: i ? "1px solid #eef1f6" : "none" }}>
              <span style={{ flexShrink: 0, width: 80, fontSize: 12, fontWeight: 700, color: TEAL_DARK, paddingTop: 2 }}>{s.label}</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.7, color: INK }}>{s.text}</span>
            </div>
          ))}

          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: "#f5f7fb" }}>
            {start && (
              <div style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.7, color: INK, marginBottom: 4 }}>
                <CalendarClock size={16} color={NAVY} style={{ marginTop: 3, flexShrink: 0 }} />
                <span><b>{t("rem.startDay")}</b> {fmtDate(start.date)} ({tWeekday(start.day)}{start.waxing ? ", " + tPhase("வளர்பிறை") : ""})
                  {start.waxing && start.soonest && +new Date(start.soonest) !== +new Date(start.date) ? t("rem.soonest", { date: fmtDate(start.soonest) }) : ""}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.7, color: INK }}>
              <Clock size={16} color={NAVY} style={{ marginTop: 3, flexShrink: 0 }} />
              <span><b>{t("rem.duration")}</b> {it.duration}</span>
            </div>
          </div>

          {gem && (
            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: gem.tint }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: gem.color, marginBottom: 3 }}><Gem size={15} />{t(`rem.gem.${it.gem.verdict}`)}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: INK }}>{it.gem.note}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RemedyTab({ plan, card, fmtDate, onRetry, onNav, onOpenAll, onShare, name }) {
  const { t, tWeekday, tPlanet } = useLang();
  const [showMore, setShowMore] = useState(false);
  const secTitle = { fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 10 };

  if (!plan || plan === "loading") {
    return (
      <div data-remedy-loading style={{ ...card, textAlign: "center", padding: "28px 18px", marginBottom: 12 }}>
        <div style={{ width: 26, height: 26, margin: "0 auto 12px", border: "2px solid #2e8b8425", borderTop: `2px solid ${TEAL}`, borderRadius: "50%", animation: "jnSpin .8s linear infinite" }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>{t("rem.loading")}</div>
      </div>
    );
  }
  if (plan === "error") {
    return (
      <div style={{ ...card, textAlign: "center", padding: "24px 18px", marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: RED, marginBottom: 12 }}>{t("rem.error")}</div>
        <button data-remedy-retry onClick={onRetry} style={{ padding: "10px 22px", borderRadius: 999, border: `1px solid ${NAVY}`, background: "#fff", color: NAVY, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>{t("rem.retry")}</button>
      </div>
    );
  }

  const good = plan.headline?.tone === "good";
  const shareText = () => [
    `${name || ""} — பரிகாரத் திட்டம்`.trim(),
    `${plan.lagna} லக்னம் · ${plan.moonRashi} ராசி · ${plan.nakshatra}`,
    ...plan.items.map((it, i) => `${i + 1}. ${it.title} (${it.stageLabel}) — ${it.steps[0]?.text || ""}`),
    "— ஜோதிட நிபுணர்",
  ].filter(Boolean).join("\n");

  return (
    <div data-remedy-plan>
      {/* ── பரிகாரம் தேவையில்லை என்றால் மட்டும் ஒரு நேரடி அறிவிப்பு ── */}
      {good && (
        <div style={{ ...card, marginBottom: 12, padding: "16px", background: "#eaf5ef", border: "1px solid #cfe6da" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ width: 42, height: 42, borderRadius: 13, background: "#ffffff", color: GREEN, display: "grid", placeItems: "center", flexShrink: 0 }}><CircleCheck size={22} strokeWidth={1.9} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div data-remedy-headline style={{ fontSize: 17, fontWeight: 700, color: NAVY, lineHeight: 1.45, marginBottom: 5 }}>{plan.headline.title}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.75, color: INK }}>{plan.headline.text}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── தோஷ / கோசார நிலை ── */}
      {plan.doshas?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(plan.doshas.length, 3)}, 1fr)`, gap: 8, marginBottom: 12 }}>
          {plan.doshas.map((d) => {
            const tone = DOSHA_TONE[d.status] || DOSHA_TONE.absent;
            return (
              <div key={d.key} data-dosha={d.key} data-status={d.status} style={{ borderRadius: 14, padding: "10px 8px", textAlign: "center", background: tone.tint, border: `1px solid ${tone.color}22` }}>
                <div style={{ fontSize: 11.5, color: SOFT, lineHeight: 1.5, marginBottom: 3 }}>{d.name}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: tone.color, lineHeight: 1.45 }}>{d.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── பரிகாரங்கள் ── */}
      {plan.items.length > 0 && <div data-remedy-headline style={{ ...secTitle, marginTop: 4 }}>{t("rem.yourRemedies")}</div>}
      {plan.items.map((it) => (<ItemCard key={it.id} it={it} card={card} fmtDate={fmtDate} defaultOpen={it.primary} />))}

      {plan.more?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button data-remedy-more onClick={() => setShowMore((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "13px 16px", borderRadius: 14, border: `1px solid ${LINE}`, background: "#ffffff", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: NAVY }}>
            <span>{t("rem.optional", { n: plan.more.length })}</span>
            <ChevronDown size={18} style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {showMore && (
            <div style={{ marginTop: 10 }}>
              {plan.more.map((it) => (<ItemCard key={it.id} it={it} card={card} fmtDate={fmtDate} />))}
            </div>
          )}
        </div>
      )}

      {/* ── பரிகாரம் தேவையில்லாதவை (பெயர்கள் மட்டும்) ── */}
      {plan.noNeed?.length > 0 && (
        <div style={{ ...card, marginBottom: 12, padding: "16px" }}>
          <div style={secTitle}>{t("rem.noNeed")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {plan.noNeed.map((n, i) => (
              <span key={i} data-remedy-noneed style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: GREEN, background: "#eaf5ef", border: "1px solid #cfe6da", padding: "5px 11px", borderRadius: 999, lineHeight: 1.5 }}>
                <CircleCheck size={14} style={{ flexShrink: 0 }} />{n.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── இன்றைய வழிபாடு ── */}
      {plan.today && (
        <div style={{ ...card, marginBottom: 12, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 36, height: 36, borderRadius: 11, background: "#faf0e8", color: "#c07a4a", display: "grid", placeItems: "center", flexShrink: 0 }}><Flame size={19} strokeWidth={1.8} /></span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{t("rem.todayWorship")}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{tWeekday(plan.today.weekday)} · {tPlanet(plan.today.lord)} · {plan.today.deity}</div>
            </div>
          </div>
          {plan.today.matches && <div style={{ ...pill("#7d6a3f", "#f6f1e4"), marginBottom: 8 }}>{t("rem.todayMatch", { x: plan.today.matches })}</div>}
          <div style={{ fontSize: 13.5, lineHeight: 1.75, color: INK }}>{plan.today.remedy}.</div>
          <div style={{ fontSize: 13, lineHeight: 1.75, color: SOFT, marginTop: 4 }}><b>{t("common.donate")}:</b> {plan.today.donate} · <b>{t("rasi.avoid")}:</b> {plan.today.avoid}</div>
        </div>
      )}

      {/* ── இணைப்புகள் ── */}
      <div style={{ ...card, marginBottom: 12, padding: "4px 16px" }}>
        {[
          ["navagraha", t("rem.link.navagraha.t"), t("rem.link.navagraha.d"), () => onNav("navagraha")],
          ["all", t("rem.link.all.t"), t("rem.link.all.d"), onOpenAll],
          ...(plan.doshas?.some((d) => d.key === "chevvai" && d.status === "present") ? [["porutham", t("svc.porutham.t"), t("rem.link.porutham.d"), () => onNav("porutham")]] : []),
        ].map(([k, t, d, fn], i) => (
          <button key={k} data-remedy-link={k} onClick={fn} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "none", cursor: "pointer", padding: "12px 0",
            borderLeft: "none", borderRight: "none", borderBottom: "none", borderTop: i ? "1px solid #eef1f6" : "none" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: INK }}>{t}</span>
              <span style={{ display: "block", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{d}</span>
            </span>
            <ChevronRight size={18} color="#a3adc2" style={{ flexShrink: 0 }} />
          </button>
        ))}
      </div>

      {plan.items.length > 0 && (
        <button data-remedy-share onClick={() => onShare(`${name || ""} — ${t("rem.planTitle")}`.trim(), shareText())} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 0", borderRadius: 14, border: `1px solid ${LINE}`, background: "#ffffff", color: NAVY, fontSize: 13.5, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
          <Share2 size={17} /> {t("rem.share")}
        </button>
      )}

      {/* ── நேர்மையான குறிப்பு ── */}
      <div style={{ padding: "12px 14px", borderRadius: 14, background: "#f8f3e6", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "#7d6a3f", marginBottom: 5 }}><TriangleAlert size={15} />{t("rem.caution")}</div>
        {plan.caution.map((t, i) => (<div key={i} style={{ ...bullet, fontSize: 12.5, color: SOFT }}><span style={dot("#c7a568")} /><span>{t}</span></div>))}
      </div>
    </div>
  );
}
