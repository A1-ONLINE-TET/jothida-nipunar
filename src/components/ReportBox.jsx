import { useState } from "react";
import { Flag, Check } from "lucide-react";
import "./chat.css";

// AI / தானியங்கி பதில் பற்றிய புகார் — Play Store-இன் AI உள்ளடக்கக் கொள்கை கோரும்
// app-க்குள்ளான புகார் வசதி. அரட்டைப் பதில்கள், AI பலன் உரைகள் இரண்டிலும் இதே பெட்டி.
const REPORT_REASONS = [
  ["wrong", "தவறான தகவல்"],
  ["harmful", "அச்சுறுத்தும் / தீங்கான அறிவுரை"],
  ["offensive", "புண்படுத்தும் சொற்கள்"],
  ["other", "வேறு காரணம்"],
];

export function ReportBox({ onSend, onClose }) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | failed
  const submit = async () => {
    if (!reason || state === "sending") return;
    setState("sending");
    const ok = await onSend(reason, comment.trim());
    if (!ok) setState("failed");
  };
  return (
    <div className="chat-report-box" data-report-box>
      <div className="chat-report-ttl">இந்தப் பதிலில் என்ன சிக்கல்?</div>
      <div className="chat-report-reasons">
        {REPORT_REASONS.map(([k, label]) => (
          <button key={k} type="button" data-report-reason={k} className={reason === k ? "on" : ""} onClick={() => setReason(k)}>{label}</button>
        ))}
      </div>
      <textarea data-report-comment value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} placeholder="விரும்பினால் விவரம் எழுதுங்கள்" />
      {state === "failed" && <div className="chat-report-err">அனுப்ப முடியவில்லை. இணையத்தைச் சரிபார்த்து மீண்டும் முயலுங்கள்.</div>}
      <div className="chat-report-actions">
        <button type="button" data-report-send className="primary" disabled={!reason || state === "sending"} onClick={submit}>{state === "sending" ? "அனுப்புகிறது…" : "புகார் அனுப்பு"}</button>
        <button type="button" data-report-cancel onClick={onClose}>வேண்டாம்</button>
      </div>
    </div>
  );
}

// புகார் இணைப்பு → பெட்டி → "பதிவானது". onReport(reason, comment) → Promise<boolean>.
export function ReportLink({ onReport, label = "தவறான பதிலா? புகார் செய்" }) {
  const [state, setState] = useState("closed"); // closed | open | done
  if (state === "done") return <div className="chat-reported" data-report-done><Check size={14} /> புகார் பதிவானது. நன்றி.</div>;
  if (state === "open") {
    return <ReportBox onClose={() => setState("closed")}
      onSend={async (reason, comment) => { const ok = await onReport(reason, comment); if (ok) setState("done"); return ok; }} />;
  }
  return <button type="button" className="chat-report-link" data-report-open onClick={() => setState("open")}><Flag size={13} /> {label}</button>;
}

// AI எழுதிய பலன் உரையின் கீழ்: "AI உருவாக்கியது" குறிப்பு + புகார் இணைப்பு.
export function AiTextFooter({ onReport }) {
  return (
    <div data-ai-footer style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #e3e8f2" }}>
      <div style={{ fontSize: 12, lineHeight: 1.55, color: "#55626f" }}>இந்த உரை AI உருவாக்கியது; வழிகாட்டலுக்கு மட்டும்.</div>
      <ReportLink onReport={onReport} label="தவறாக உள்ளதா? புகார் செய்" />
    </div>
  );
}
