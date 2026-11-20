import { useEffect, useState } from "react";
import { CloudUpload, ShieldCheck, FileText, MessageSquare, Trash2, ChevronRight, LogOut } from "lucide-react";
import {
  accountInfo, googleLinkAvailable, linkGoogle, signOutToAnonymous, deleteAccountData, submitReport, onUser,
} from "../firebase.js";

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

const LINK_ERRORS = {
  cancelled: "இணைப்பு நிறுத்தப்பட்டது.",
  blocked: "உலாவி புதிய சாளரத்தைத் தடுத்தது. மீண்டும் தட்டிப் பாருங்கள்.",
  network: "இணையம் கிடைக்கவில்லை. சற்றுப் பின் முயலுங்கள்.",
  "in-use": "இந்த Google கணக்கை இணைக்க முடியவில்லை. சற்றுப் பின் முயலுங்கள்.",
  unavailable: "Google இணைப்பு இப்போது கிடைக்கவில்லை.",
  failed: "இணைக்க முடியவில்லை. சற்றுப் பின் முயலுங்கள்.",
};

export default function AccountExtras({ card, cardTitle, profileCount = 0, onWiped = () => {} }) {
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
    if (r.ok) setLinkMsg({ kind: "good", text: r.switched ? "உங்கள் Google கணக்கில் முன்பு சேமித்த ஜாதகங்கள் இந்தச் சாதனத்தில் சேர்க்கப்படுகின்றன." : "இணைக்கப்பட்டது. இனி வேறு கைபேசியிலும் இதே Google கணக்கால் உங்கள் ஜாதகங்களைத் திறக்கலாம்." });
    else setLinkMsg({ kind: r.error === "cancelled" ? "plain" : "bad", text: LINK_ERRORS[r.error] || LINK_ERRORS.failed });
  };
  const doSignOut = async () => {
    if (busy) return;
    if (!window.confirm("இந்தச் சாதனத்தில் Google கணக்கிலிருந்து வெளியேறவா? மேகத்தில் உள்ள ஜாதகங்கள் அப்படியே இருக்கும்.")) return;
    setBusy("out"); await signOutToAnonymous(); setBusy(""); setInfo(accountInfo()); setLinkMsg(null);
  };
  const sendFeedback = async () => {
    const text = fbText.trim();
    if (!text || busy) return;
    setBusy("fb"); setFbMsg(null);
    const ok = await submitReport({ kind: "feedback", comment: text, app: "1.0.0" });
    setBusy("");
    if (ok) { setFbText(""); setFbMsg({ kind: "good", text: "நன்றி. உங்கள் கருத்து பதிவாகிவிட்டது." }); }
    else setFbMsg({ kind: "bad", text: "அனுப்ப முடியவில்லை. இணையத்தைச் சரிபார்த்து மீண்டும் முயலுங்கள்." });
  };
  const doDelete = async () => {
    if (busy) return;
    setBusy("del"); setDelMsg(null);
    const r = await deleteAccountData();
    setBusy("");
    if (!r.ok) { setDelMsg({ kind: "bad", text: "மேகத்தில் உள்ள தரவை நீக்க முடியவில்லை. இணையத்தைச் சரிபார்த்து மீண்டும் முயலுங்கள். இந்தச் சாதனத்தில் உள்ளவை இன்னும் நீக்கப்படவில்லை." }); return; }
    setDelOpen(false);
    onWiped();
  };

  return (
    <>
      {(canLink || info.linked) && (
        <div data-sync-card style={{ ...card, marginTop: 14, padding: 16 }}>
          <div style={{ ...cardTitle, display: "flex", alignItems: "center", gap: 8 }}><CloudUpload size={17} /> ஜாதகங்களைப் பாதுகாக்க</div>
          {info.linked ? (
            <>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "#27303f" }}>
                Google கணக்குடன் இணைக்கப்பட்டுள்ளது{info.email ? <> — <b style={{ wordBreak: "break-all" }}>{info.email}</b></> : null}. சேமித்த ஜாதகங்கள் இந்தக் கணக்கில் காக்கப்படுகின்றன.
              </div>
              <button data-google-signout onClick={doSignOut} disabled={!!busy} style={{ ...pill(false), marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <LogOut size={15} /> வெளியேறு
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "#4a5365" }}>
                இப்போது ஜாதகங்கள் இந்தக் கைபேசியில் மட்டும் உள்ளன. Google கணக்குடன் இணைத்தால், கைபேசி மாற்றினாலும் அவை திரும்பக் கிடைக்கும்.
              </div>
              <button data-google-link onClick={doLink} disabled={!!busy} style={{ ...pill(true), marginTop: 12, opacity: busy === "link" ? 0.6 : 1 }}>
                {busy === "link" ? "இணைக்கிறது…" : "Google கணக்குடன் இணை"}
              </button>
            </>
          )}
          {linkMsg && <div style={note(linkMsg.kind)}>{linkMsg.text}</div>}
        </div>
      )}

      <div data-legal-card style={{ ...card, marginTop: 14, padding: "16px 16px 6px" }}>
        <div style={{ ...cardTitle, display: "flex", alignItems: "center", gap: 8 }}><ShieldCheck size={17} /> தனியுரிமை மற்றும் உதவி</div>
        <a data-legal="privacy" href="/privacy.html" style={{ ...rowBtn, borderTop: "none" }}>
          <ShieldCheck size={18} color="#76819a" /><span style={{ flex: 1 }}>தனியுரிமைக் கொள்கை</span><ChevronRight size={18} color="#a3adc2" />
        </a>
        <a data-legal="terms" href="/terms.html" style={rowBtn}>
          <FileText size={18} color="#76819a" /><span style={{ flex: 1 }}>பயன்பாட்டு விதிமுறைகள்</span><ChevronRight size={18} color="#a3adc2" />
        </a>
        <button data-feedback-toggle onClick={() => { setFbOpen((v) => !v); setFbMsg(null); }} style={rowBtn}>
          <MessageSquare size={18} color="#76819a" /><span style={{ flex: 1 }}>கருத்து அல்லது புகார் அனுப்ப</span><ChevronRight size={18} color="#a3adc2" style={{ transform: fbOpen ? "rotate(90deg)" : "none" }} />
        </button>
        {fbOpen && (
          <div style={{ padding: "4px 0 12px" }}>
            <textarea data-feedback-input value={fbText} onChange={(e) => setFbText(e.target.value)} rows={4} maxLength={1000}
              placeholder="தவறான கணக்கு, புரியாத பகுதி, புதிய வசதி — எதுவாயினும் எழுதுங்கள்"
              style={{ width: "100%", padding: "11px 13px", borderRadius: 12, border: "1.5px solid #d9e0ee", background: "#fcfdff", color: "#27303f", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none" }} />
            <button data-feedback-send onClick={sendFeedback} disabled={!fbText.trim() || !!busy} style={{ ...pill(true), marginTop: 8, opacity: !fbText.trim() || busy ? 0.5 : 1 }}>
              {busy === "fb" ? "அனுப்புகிறது…" : "அனுப்பு"}
            </button>
            {fbMsg && <div data-feedback-msg style={note(fbMsg.kind)}>{fbMsg.text}</div>}
          </div>
        )}
        <button data-delete-toggle onClick={() => { setDelOpen((v) => !v); setDelMsg(null); }} style={{ ...rowBtn, color: "#c0564f" }}>
          <Trash2 size={18} color="#c0564f" /><span style={{ flex: 1 }}>என் தரவை நீக்கு</span><ChevronRight size={18} color="#a3adc2" style={{ transform: delOpen ? "rotate(90deg)" : "none" }} />
        </button>
        {delOpen && (
          <div data-delete-box style={{ padding: "4px 0 14px" }}>
            <div style={note("bad")}>
              சேமித்த ஜாதகங்கள்{profileCount ? ` (${profileCount})` : ""}, குறிப்புகள், சரிபார்ப்புப் பதிவுகள் ஆகியவை இந்தச் சாதனத்திலிருந்தும் மேகத்திலிருந்தும் நிரந்தரமாக நீக்கப்படும்{info.linked ? "; Google இணைப்பும் நீக்கப்படும்" : ""}. இதைத் திரும்பப் பெற முடியாது.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button data-delete-confirm onClick={doDelete} disabled={!!busy} style={{ ...pill(true), background: "#c0564f", opacity: busy === "del" ? 0.6 : 1 }}>
                {busy === "del" ? "நீக்குகிறது…" : "ஆம், எல்லாவற்றையும் நீக்கு"}
              </button>
              <button data-delete-cancel onClick={() => setDelOpen(false)} disabled={!!busy} style={pill(false)}>வேண்டாம்</button>
            </div>
            {delMsg && <div style={note(delMsg.kind)}>{delMsg.text}</div>}
          </div>
        )}
      </div>
    </>
  );
}
