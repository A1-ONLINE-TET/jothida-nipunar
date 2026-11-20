// ═══════════════════════════════════════════════════════════════════
// பரிகாரம் tab — ஜாதகத்தின் வேர்க் காரணத்திலிருந்து பரிகாரம்.
// எல்லாக் கணக்கும் server-இல் (/api/remedy-plan); இங்கே காட்சி மட்டும்.
// விற்பனை இல்லை: ரத்தினம்/பூஜை எதுவும் விற்கப்படுவதில்லை — "தேவையா, தேவையில்லையா" என்ற தீர்ப்பு மட்டும்.
// ═══════════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  ShieldCheck, Gem, CalendarClock, CircleCheck, TriangleAlert, ChevronDown, ChevronRight,
  Flame, Info, Share2, Sprout, Clock, Star, Heart, Hourglass,
} from "lucide-react";

const INK = "#27303f", SOFT = "#4a5365", MUTED = "#76819a", LINE = "#e3e8f2", NAVY = "#1f3f68";
const TEAL = "#2e8b84", TEAL_DARK = "#226b66", TEAL_TINT = "#e9f5f4";
const GREEN = "#2e7d5b", RED = "#c0564f", GOLD = "#a9823c";

const STAGE = {
  now:      { color: "#b5683a", tint: "#faf0e8", icon: Clock },
  root:     { color: "#5565b8", tint: "#eef1fb", icon: Sprout },
  later:    { color: "#8a62b0", tint: "#f4eefa", icon: Hourglass },
  marriage: { color: "#c2607c", tint: "#fbeef2", icon: Heart },
};
const GEM = {
  ok:      { color: GREEN, tint: "#eaf5ef", label: "ரத்தினம்: பொருந்தும் — உறுதி செய்த பின் மட்டும்" },
  caution: { color: GOLD,  tint: "#f8f3e6", label: "ரத்தினம்: ஜோதிடர் ஆலோசனையுடன் மட்டும்" },
  no:      { color: RED,   tint: "#fbeeed", label: "ரத்தினம்: அணிய வேண்டாம்" },
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
  const [open, setOpen] = useState(!!defaultOpen);
  const st = STAGE[it.stage] || STAGE.root; const StIcon = st.icon;
  const gem = it.gem ? GEM[it.gem.verdict] : null;
  const start = it.startOn;
  return (
    <div data-remedy-item={it.id} style={{ ...card, marginBottom: 12, padding: 0, overflow: "hidden", boxShadow: `inset 3px 0 0 ${st.color}, 0 10px 34px -14px rgba(35,55,95,0.16)` }}>
      <div style={{ padding: "15px 16px 12px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          <span style={pill(st.color, st.tint)}><StIcon size={12} strokeWidth={2.2} />{it.stageLabel}</span>
          {it.primary && <span style={pill("#7d6a3f", "#f6f1e4")}><Star size={11} strokeWidth={2.4} />முதன்மை</span>}
          {it.until && <span style={pill(SOFT, "#f2f5fb")}>{fmtDate(it.until)} வரை</span>}
          {!it.until && it.comingFrom && <span style={pill(SOFT, "#f2f5fb")}>{fmtDate(it.comingFrom)} முதல்</span>}
        </div>
        <div style={{ fontSize: 16.5, fontWeight: 700, color: NAVY, lineHeight: 1.45, marginBottom: 10 }}>{it.title}</div>

        <div style={label}>வேர்க் காரணம்</div>
        {it.root.map((t, i) => (<div key={i} style={bullet}><span style={dot(st.color)} /><span>{t}</span></div>))}

        {it.role?.length > 0 && (<>
          <div style={{ ...label, marginTop: 10 }}>உங்களுக்கு ஏன் முக்கியம்</div>
          {it.role.map((t, i) => (<div key={i} style={{ ...bullet, color: SOFT }}><span style={dot("#a3adc2")} /><span>{t}</span></div>))}
        </>)}

        {it.affects?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {it.affects.map((a) => (<span key={a} style={{ fontSize: 12, color: SOFT, background: "#f5f7fb", border: `1px solid ${LINE}`, padding: "3px 10px", borderRadius: 999 }}>{a}</span>))}
          </div>
        )}

        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: TEAL_TINT }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: TEAL_DARK, marginBottom: 3 }}>முறை: {it.approachLabel}</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: INK }}>{it.approachWhy}</div>
        </div>
      </div>

      <button data-remedy-toggle={it.id} onClick={() => setOpen((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "11px 16px 11px 18px", background: "#fafbfe",
        borderTop: `1px solid ${LINE}`, borderLeft: "none", borderRight: "none", borderBottom: open ? `1px solid ${LINE}` : "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: NAVY }}>
        <span>செய்ய வேண்டியவை ({it.steps.length})</span>
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
                <span><b>தொடங்க உகந்த நாள்:</b> {fmtDate(start.date)} ({start.day}{start.waxing ? ", வளர்பிறை" : ""})
                  {start.waxing && start.soonest && +new Date(start.soonest) !== +new Date(start.date) ? ` — காத்திருக்க வேண்டாம் எனில் ${fmtDate(start.soonest)} அன்றே தொடங்கலாம்.` : ""}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.7, color: INK }}>
              <Clock size={16} color={NAVY} style={{ marginTop: 3, flexShrink: 0 }} />
              <span><b>எவ்வளவு காலம்:</b> {it.duration}</span>
            </div>
          </div>

          {gem && (
            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: gem.tint }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: gem.color, marginBottom: 3 }}><Gem size={15} />{gem.label}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: INK }}>{it.gem.note}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RemedyTab({ plan, card, fmtDate, onRetry, onNav, onOpenAll, onShare, name }) {
  const [showWhy, setShowWhy] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const secTitle = { fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 10 };

  if (!plan || plan === "loading") {
    return (
      <div data-remedy-loading style={{ ...card, textAlign: "center", padding: "28px 18px", marginBottom: 12 }}>
        <div style={{ width: 26, height: 26, margin: "0 auto 12px", border: "2px solid #2e8b8425", borderTop: `2px solid ${TEAL}`, borderRadius: "50%", animation: "jnSpin .8s linear infinite" }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>பரிகாரத் திட்டம் தயாராகிறது…</div>
        <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.7 }}>உங்கள் ஜாதகத்தில் எது உண்மையில் கவனம் கோருகிறது என்று ஆராயப்படுகிறது.</div>
      </div>
    );
  }
  if (plan === "error") {
    return (
      <div style={{ ...card, textAlign: "center", padding: "24px 18px", marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: RED, marginBottom: 12 }}>பரிகாரத் திட்டத்தைப் பெற முடியவில்லை.</div>
        <button data-remedy-retry onClick={onRetry} style={{ padding: "10px 22px", borderRadius: 999, border: `1px solid ${NAVY}`, background: "#fff", color: NAVY, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>மீண்டும் முயற்சி</button>
      </div>
    );
  }

  const troubled = (plan.areas || []).filter((a) => !a.ok);
  const good = plan.headline?.tone === "good";
  const shareText = () => [
    `${name || ""} — பரிகாரத் திட்டம்`.trim(),
    `${plan.lagna} லக்னம் · ${plan.moonRashi} ராசி · ${plan.nakshatra}`,
    plan.headline?.title,
    ...plan.items.map((it, i) => `${i + 1}. ${it.title} (${it.stageLabel}) — ${it.steps[0]?.text || ""}`),
    "— ஜோதிட நிபுணர்",
  ].filter(Boolean).join("\n");

  return (
    <div data-remedy-plan>
      {/* ── தலைப்பு: எத்தனை, எது முதலில் ── */}
      <div style={{ ...card, marginBottom: 12, padding: "16px", background: good ? "#eaf5ef" : TEAL_TINT, border: `1px solid ${good ? "#cfe6da" : "#cfe6e3"}` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ width: 42, height: 42, borderRadius: 13, background: "#ffffff", color: good ? GREEN : TEAL, display: "grid", placeItems: "center", flexShrink: 0 }}>
            {good ? <CircleCheck size={22} strokeWidth={1.9} /> : <ShieldCheck size={22} strokeWidth={1.9} />}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: good ? GREEN : TEAL_DARK, marginBottom: 2 }}>உங்கள் ஜாதகத்தின்படி</div>
            <div data-remedy-headline style={{ fontSize: 17, fontWeight: 700, color: NAVY, lineHeight: 1.45, marginBottom: 5 }}>{plan.headline.title}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.75, color: INK }}>{plan.headline.text}</div>
          </div>
        </div>
        <button data-remedy-why onClick={() => setShowWhy((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, padding: 0, background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: TEAL_DARK }}>
          <Info size={15} />எப்படித் தீர்மானிக்கப்பட்டது?
          <ChevronDown size={15} style={{ transform: showWhy ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>
        {showWhy && (
          <div style={{ marginTop: 8, padding: "10px 12px", background: "#ffffff", borderRadius: 12 }}>
            {plan.principle.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.7, color: INK, marginBottom: i < plan.principle.length - 1 ? 6 : 0 }}>
                <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 20, background: TEAL_TINT, color: TEAL_DARK, fontSize: 11.5, fontWeight: 700, display: "grid", placeItems: "center", marginTop: 2 }}>{i + 1}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        )}
      </div>

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

      {/* ── பகுதிவாரி வேர்க் காரணம் ── */}
      {troubled.length > 0 && (
        <div style={{ ...card, marginBottom: 12, padding: "16px 16px 8px" }}>
          <div style={secTitle}>கவனம் கோரும் பகுதிகள் — ஏன்?</div>
          {troubled.map((a, i) => (
            <div key={a.key} style={{ padding: "10px 0", borderTop: i ? "1px solid #eef1f6" : "none" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{a.name}</span>
                <span style={{ fontSize: 12, color: "#b5683a", fontWeight: 600, textAlign: "right" }}>{a.verdict}</span>
              </div>
              {a.causes.map((t, j) => (<div key={j} style={{ ...bullet, fontSize: 13, color: SOFT }}><span style={dot("#c9b08f")} /><span>{t}</span></div>))}
              {a.linked.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: MUTED }}>இதற்கான பரிகாரம்:</span>
                  {a.linked.map((n) => (<span key={n} style={pill(TEAL_DARK, TEAL_TINT)}>{n}</span>))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── பரிகாரங்கள் ── */}
      {plan.items.length > 0 && <div style={{ ...secTitle, marginTop: 4 }}>செய்ய வேண்டிய பரிகாரங்கள்</div>}
      {plan.items.map((it) => (<ItemCard key={it.id} it={it} card={card} fmtDate={fmtDate} defaultOpen={it.primary} />))}

      {plan.more?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button data-remedy-more onClick={() => setShowMore((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "13px 16px", borderRadius: 14, border: `1px solid ${LINE}`, background: "#ffffff", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: NAVY }}>
            <span>விரும்பினால் செய்யலாம் ({plan.more.length})</span>
            <ChevronDown size={18} style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {showMore && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.7, marginBottom: 10 }}>இவை லேசான அளவிலானவை — மேலுள்ளவற்றைத் தொடங்கிய பிறகு, நேரம் இருந்தால் மட்டும்.</div>
              {plan.more.map((it) => (<ItemCard key={it.id} it={it} card={card} fmtDate={fmtDate} />))}
            </div>
          )}
        </div>
      )}

      {/* ── பரிகாரம் தேவையில்லாதவை ── */}
      {plan.noNeed?.length > 0 && (
        <div style={{ ...card, marginBottom: 12, padding: "16px 16px 8px" }}>
          <div style={secTitle}>பரிகாரம் தேவையில்லாதவை</div>
          {plan.noNeed.map((n, i) => (
            <div key={i} data-remedy-noneed style={{ display: "flex", gap: 10, padding: "9px 0", borderTop: i ? "1px solid #eef1f6" : "none" }}>
              <CircleCheck size={18} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{n.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: SOFT }}>{n.why}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── இன்றைய வழிபாடு ── */}
      {plan.today && (
        <div style={{ ...card, marginBottom: 12, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 36, height: 36, borderRadius: 11, background: "#faf0e8", color: "#c07a4a", display: "grid", placeItems: "center", flexShrink: 0 }}><Flame size={19} strokeWidth={1.8} /></span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>இன்றைய வழிபாடு</div>
              <div style={{ fontSize: 12, color: MUTED }}>{plan.today.weekday} · {plan.today.lord} · {plan.today.deity}</div>
            </div>
          </div>
          {plan.today.matches && <div style={{ ...pill("#7d6a3f", "#f6f1e4"), marginBottom: 8 }}>இன்று உங்கள் பரிகார நாள்: {plan.today.matches}</div>}
          <div style={{ fontSize: 13.5, lineHeight: 1.75, color: INK }}>{plan.today.remedy}.</div>
          <div style={{ fontSize: 13, lineHeight: 1.75, color: SOFT, marginTop: 4 }}><b>தானம்:</b> {plan.today.donate} · <b>தவிர்க்க:</b> {plan.today.avoid}</div>
        </div>
      )}

      {/* ── இணைப்புகள் ── */}
      <div style={{ ...card, marginBottom: 12, padding: "4px 16px" }}>
        {[
          ["navagraha", "நவகிரக வழிபாட்டு அட்டவணை", "ஒன்பது கிரகங்களின் மந்திரம், கோயில், தானம்", () => onNav("navagraha")],
          ["all", "எல்லாக் கிரகங்களின் நிலை", "ஒவ்வொரு கிரகத்தின் பலமும் அதற்குரிய விவரமும்", onOpenAll],
          ...(plan.doshas?.some((d) => d.key === "chevvai" && d.status === "present") ? [["porutham", "திருமண பொருத்தம்", "துணையின் ஜாதகத்துடன் தோஷ சமநிலை பார்க்க", () => onNav("porutham")]] : []),
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
        <button data-remedy-share onClick={() => onShare(`${name || ""} — பரிகாரத் திட்டம்`.trim(), shareText())} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 0", borderRadius: 14, border: `1px solid ${LINE}`, background: "#ffffff", color: NAVY, fontSize: 13.5, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
          <Share2 size={17} /> பரிகாரத் திட்டத்தைப் பகிர்
        </button>
      )}

      {/* ── நேர்மையான குறிப்பு ── */}
      <div style={{ padding: "12px 14px", borderRadius: 14, background: "#f8f3e6", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "#7d6a3f", marginBottom: 5 }}><TriangleAlert size={15} />கவனத்தில் கொள்க</div>
        {plan.caution.map((t, i) => (<div key={i} style={{ ...bullet, fontSize: 12.5, color: SOFT }}><span style={dot("#c7a568")} /><span>{t}</span></div>))}
      </div>
    </div>
  );
}
