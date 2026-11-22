import { useEffect, useState } from "react";
import { CloudUpload, ShieldCheck, FileText, MessageSquare, Trash2, ChevronRight, LogOut, Languages, Check } from "lucide-react";
import {
  accountInfo, googleLinkAvailable, linkGoogle, signOutToAnonymous, deleteAccountData, onUser,
} from "../firebase.js";
import { sendReport } from "../report.js";
import { useLang, LANGS } from "../i18n/index.js";

// கணக்குப் பக்கத்தின் கீழ்ப் பகுதி: சாதனம் மாறினாலும் ஜாதகங்களைக் காக்கும் Google இணைப்பு,
// தனியுரிமை / விதிமுறைகள், கருத்து அனுப்புதல், "என் தரவை நீக்கு". (Play Store கோரும் பகுதிகள்.)

const rowBtn = {
  display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 48, padding: "10px 4px",
  background: "none", border: "none", borderTop: "1px solid #e3e8f2", cursor: "pointer", textAlign: "left",
  fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#27303f", textDecoration: "none",
};
const pill = (solid) => ({
  minHeight: 40, padding: "0 18px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700,
  border: solid ? "none" : "1px solid #c9d3ea", background: solid ? "#1f3f68" : "#ffffff", color: solid ? "#ffffff" : "#1f3f68",
});
const note = (kind) => ({
  fontSize: 13, lineHeight: 1.65, padding: "10px 12px", borderRadius: 12, marginTop: 10,
  ...(kind === "good" ? { background: "#eaf5ef", border: "1px solid #cfe6da", color: "#2e7d5b" }
    : kind === "bad" ? { background: "#fbeeed", border: "1px solid #f0d6d3", color: "#c0564f" }
    : { background: "#f5f7fb", border: "1px solid #e3e8f2", color: "#4a5365" }),
});

// இணைப்புப் பிழைக் குறியீடு → மொழி key (காட்சி உரை t() வழியே)
const LINK_ERR_KEY = {
  cancelled: "acct.err.cancelled",
  blocked: "acct.err.blocked",
  network: "acct.err.network",
  "in-use": "acct.err.inUse",
  unavailable: "acct.err.unavailable",
  failed: "acct.err.failed",
};

export default function AccountExtras({ card, cardTitle, profileCount = 0, onWiped = () => {} }) {
  const { lang, t, setLang } = useLang();
  const [info, setInfo] = useState(accountInfo);
  const [canLink, setCanLink] = useState(false);
  const [busy, setBusy] = useState("");
  const [linkMsg, setLinkMsg] = useState(null);       // { kind, text }
  const [fbOpen, setFbOpen] = useState(false);
  const [fbText, setFbText] = useState("");
  const [fbMsg, setFbMsg] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const [delMsg, setDelMsg] = useState(null);

  useEffect(() => onUser(() => setInfo(accountInfo())), []);
  useEffect(() => { let alive = true; googleLinkAvailable().then((ok) => { if (alive) setCanLink(ok); }); return () => { alive = false; }; }, []);

  const doLink = async () => {
    if (busy) return;
    setBusy("link"); setLinkMsg(null);
    const r = await linkGoogle();
    setBusy(""); setInfo(accountInfo());
    if (r.ok) setLinkMsg({ kind: "good", text: r.switched ? t("acct.linkSwitched") : t("acct.linkDone") });
    else setLinkMsg({ kind: r.error === "cancelled" ? "plain" : "bad", text: t(LINK_ERR_KEY[r.error] || LINK_ERR_KEY.failed) });
  };
  const doSignOut = async () => {
    if (busy) return;
    if (!window.confirm(t("acct.signOutConfirm"))) return;
    setBusy("out"); await signOutToAnonymous(); setBusy(""); setInfo(accountInfo()); setLinkMsg(null);
  };
  const sendFeedback = async () => {
    const text = fbText.trim();
    if (!text || busy) return;
    setBusy("fb"); setFbMsg(null);
    const ok = await sendReport({ kind: "feedback", comment: text, app: "1.0.0" });
    setBusy("");
    if (ok) { setFbText(""); setFbMsg({ kind: "good", text: t("acct.fbThanks") }); }
    else setFbMsg({ kind: "bad", text: t("acct.sendFail") });
  };
  const doDelete = async () => {
    if (busy) return;
    setBusy("del"); setDelMsg(null);
    const r = await deleteAccountData();
    setBusy("");
    if (!r.ok) { setDelMsg({ kind: "bad", text: t("acct.delFail") }); return; }
    setDelOpen(false);
    onWiped();
  };

  return (
    <>
      <div data-lang-card style={{ ...card, marginTop: 14, padding: "16px 16px 6px" }}>
        <div style={{ ...cardTitle, display: "flex", alignItems: "center", gap: 8 }}><Languages size={17} /> {t("acct.lang.title")}</div>
        {LANGS.map((l, i) => (
          <button key={l.code} data-set-lang={l.code} onClick={() => setLang(l.code)} style={{ ...rowBtn, borderTop: i ? "1px solid #e3e8f2" : "none" }}>
            <span style={{ flex: 1 }} lang={l.code}>{l.label} <span style={{ color: "#55626f", fontWeight: 500, fontSize: 12.5 }}>· {l.sub}</span></span>
            {lang === l.code ? <Check size={18} color="#2e7d5b" /> : <span style={{ width: 18 }} />}
          </button>
        ))}
      </div>

      {(canLink || info.linked) && (
        <div data-sync-card style={{ ...card, marginTop: 14, padding: 16 }}>
          <div style={{ ...cardTitle, display: "flex", alignItems: "center", gap: 8 }}><CloudUpload size={17} /> {t("acct.protect")}</div>
          {info.linked ? (
            <>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "#27303f" }}>
                {t("acct.linkedTo")}{info.email ? <> — <b style={{ wordBreak: "break-all" }}>{info.email}</b></> : null}. {t("acct.linkedSaved")}
              </div>
              <button data-google-signout onClick={doSignOut} disabled={!!busy} style={{ ...pill(false), marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <LogOut size={15} /> {t("acct.signOut")}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "#4a5365" }}>
                {t("acct.linkPrompt")}
              </div>
              <button data-google-link onClick={doLink} disabled={!!busy} style={{ ...pill(true), marginTop: 12, opacity: busy === "link" ? 0.6 : 1 }}>
                {busy === "link" ? t("acct.linking") : t("acct.linkGoogle")}
              </button>
            </>
          )}
          {linkMsg && <div style={note(linkMsg.kind)}>{linkMsg.text}</div>}
        </div>
      )}

      <div data-legal-card style={{ ...card, marginTop: 14, padding: "16px 16px 6px" }}>
        <div style={{ ...cardTitle, display: "flex", alignItems: "center", gap: 8 }}><ShieldCheck size={17} /> {t("acct.privacyHelp")}</div>
        <a data-legal="privacy" href="/privacy.html" style={{ ...rowBtn, borderTop: "none" }}>
          <ShieldCheck size={18} color="#55626f" /><span style={{ flex: 1 }}>{t("acct.privacy")}</span><ChevronRight size={18} color="#a3adc2" />
        </a>
        <a data-legal="terms" href="/terms.html" style={rowBtn}>
          <FileText size={18} color="#55626f" /><span style={{ flex: 1 }}>{t("acct.terms")}</span><ChevronRight size={18} color="#a3adc2" />
        </a>
        <button data-feedback-toggle onClick={() => { setFbOpen((v) => !v); setFbMsg(null); }} style={rowBtn}>
          <MessageSquare size={18} color="#55626f" /><span style={{ flex: 1 }}>{t("acct.feedback")}</span><ChevronRight size={18} color="#a3adc2" style={{ transform: fbOpen ? "rotate(90deg)" : "none" }} />
        </button>
        {fbOpen && (
          <div style={{ padding: "4px 0 12px" }}>
            <textarea data-feedback-input value={fbText} onChange={(e) => setFbText(e.target.value)} rows={4} maxLength={1000}
              placeholder={t("acct.fbPlaceholder")}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 12, border: "1.5px solid #d9e0ee", background: "#fcfdff", color: "#27303f", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none" }} />
            <button data-feedback-send onClick={sendFeedback} disabled={!fbText.trim() || !!busy} style={{ ...pill(true), marginTop: 8, opacity: !fbText.trim() || busy ? 0.5 : 1 }}>
              {busy === "fb" ? t("acct.sending") : t("acct.send")}
            </button>
            {fbMsg && <div data-feedback-msg style={note(fbMsg.kind)}>{fbMsg.text}</div>}
          </div>
        )}
        <button data-delete-toggle onClick={() => { setDelOpen((v) => !v); setDelMsg(null); }} style={{ ...rowBtn, color: "#c0564f" }}>
          <Trash2 size={18} color="#c0564f" /><span style={{ flex: 1 }}>{t("acct.deleteData")}</span><ChevronRight size={18} color="#a3adc2" style={{ transform: delOpen ? "rotate(90deg)" : "none" }} />
        </button>
        {delOpen && (
          <div data-delete-box style={{ padding: "4px 0 14px" }}>
            <div style={note("bad")}>
              {t("acct.deleteWarn", { count: profileCount ? ` (${profileCount})` : "", google: info.linked ? t("acct.deleteWarnGoogle") : "" })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button data-delete-confirm onClick={doDelete} disabled={!!busy} style={{ ...pill(true), background: "#c0564f", opacity: busy === "del" ? 0.6 : 1 }}>
                {busy === "del" ? t("acct.deleting") : t("acct.deleteConfirm")}
              </button>
              <button data-delete-cancel onClick={() => setDelOpen(false)} disabled={!!busy} style={pill(false)}>{t("acct.cancel")}</button>
            </div>
            {delMsg && <div style={note(delMsg.kind)}>{delMsg.text}</div>}
          </div>
        )}
      </div>
    </>
  );
}
