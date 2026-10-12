import { useState, useRef, useEffect } from "react";
import "./chat.css";

// Astrologer message that reveals itself character-by-character (typewriter).
function TypingText({ text, onDone }) {
  // Coerce to a string always — if an answer ever comes back as a non-string
  // (object/number/undefined), `.slice`/`.length` would throw and blank the
  // whole app. Guarding here keeps the chat resilient to any response shape.
  const safe = typeof text === "string" ? text : (text == null ? "" : String(text));
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setN(i);
      if (i >= safe.length) { clearInterval(id); onDone && onDone(); }
    }, 18);
    return () => clearInterval(id);
  }, [safe]);
  const shown = safe.slice(0, n);
  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {shown}
      {n < safe.length && <span className="jn-caret">▋</span>}
    </span>
  );
}

const SUGGESTIONS = [
  "என் திருமணம் எப்போது நடக்கும்?",
  "தொழிலில் முன்னேற்றம் உண்டா?",
  "பண வரவு எப்படி இருக்கும்?",
  "ஆரோக்கியம் பற்றி சொல்லுங்கள்",
];

export default function ChatScreen({ ask, askAI, askPremium, onBack, personName, initialQuestion = "", astrologerName = "ஜோதிட குரு", astrologerTagline = "உங்கள் ஜாதகம் சார்ந்த பதில்கள்", premiumLabel = "⭐ ஆழமான AI பதில் · ₹49" }) {
  const [aiMode, setAiMode] = useState(false); // 🤖 AI இயல்பு மொழி (Gemini) ON/OFF
  const [messages, setMessages] = useState([
    { role: "astro", text: `வணக்கம்${personName ? " " + personName : ""} 🙏 நான் ${astrologerName}. உங்கள் ஜாதகத்தை ஆராய்ந்து பதிலளிக்கிறேன். உங்கள் கேள்வியைக் கேளுங்கள் — திருமணம், தொழில், பணம், ஆரோக்கியம், கல்வி...`, done: true },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const autoSentRef = useRef(false);
  const lastTopicRef = useRef(""); // follow-up நினைவு — முந்தைய தலைப்பு

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  // ஒரு நோக்கத் தலைப்பிலிருந்து வந்தால் — அந்தக் கேள்வியை தானாக அனுப்பு (ஒருமுறை)
  useEffect(() => {
    if (initialQuestion && !autoSentRef.current) {
      autoSentRef.current = true;
      send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const send = async (q) => {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question, done: true }]);
    setBusy(true);
    try {
      const fn = (aiMode && askAI) ? askAI : ask;
      const { answer, category } = await fn(question, lastTopicRef.current);
      if (category && category !== "general") lastTopicRef.current = category;
      setMessages((m) => [...m, { role: "astro", text: answer || "மன்னிக்கவும், இப்போது பதிலளிக்க முடியவில்லை.", done: false }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "astro", text: "⚠ சர்வர் இப்போது பதிலளிக்கவில்லை. சில வினாடிகள் கழித்து மீண்டும் முயற்சிக்கவும்.", done: true }]);
    } finally {
      setBusy(false);
    }
  };

  const sendPremium = async () => {
    const question = input.trim();
    if (!question || busy || !askPremium) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question, done: true }]);
    setBusy(true);
    try {
      const { answer } = await askPremium(question);
      setMessages((m) => [...m, { role: "astro", text: answer || "மன்னிக்கவும், பதிலளிக்க முடியவில்லை.", done: false, premium: true }]);
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg !== "cancelled") {
        setMessages((m) => [...m, { role: "astro", text: "⚠ பணம் செலுத்துதல்/பதில் தோல்வி. மீண்டும் முயற்சிக்கவும்.", done: true }]);
      }
    } finally {
      setBusy(false);
    }
  };

  const markDone = (idx) =>
    setMessages((m) => m.map((msg, i) => (i === idx ? { ...msg, done: true } : msg)));

  return (
    <div className="chat-wrap">
      <header className="chat-top">
        <button className="chat-back" onClick={onBack} aria-label="பின்">‹</button>
        <div className="chat-astro">
          <div className="chat-ava">🔮</div>
          <div>
            <div className="chat-ttl">{astrologerName}</div>
            <div className="chat-sub">{astrologerTagline}</div>
          </div>
        </div>
        {askAI && (
          <button
            onClick={() => setAiMode((v) => !v)}
            title="AI இயல்பு மொழி"
            style={{
              marginLeft: "auto", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
              padding: "6px 12px", borderRadius: 14,
              background: aiMode ? "#7b1c1c" : "#efe6cf", color: aiMode ? "#fff8e7" : "#7b1c1c",
            }}
          >
            🤖 AI {aiMode ? "ON" : "OFF"}
          </button>
        )}
      </header>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-row ${m.role}`}>
            <div className={`chat-bubble ${m.role} ${m.premium ? "premium" : ""}`}>
              {m.premium && <div className="chat-premium-tag">⭐ AI ஆழ்ந்த பதில்</div>}
              {m.role === "astro" && !m.done
                ? <TypingText text={m.text} onDone={() => markDone(i)} />
                : <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="chat-row astro">
            <div className="chat-bubble astro chat-typing">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
        {messages.length <= 1 && (
          <div className="chat-suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {askPremium && (
        <div className="chat-premium-row">
          <button className="chat-premium-btn" onClick={sendPremium} disabled={busy || !input.trim()}>
            {premiumLabel}
          </button>
          <span className="chat-premium-hint">சிக்கலான கேள்விகளுக்கு விரிவான AI பதில்</span>
        </div>
      )}

      <div className="chat-input">
        <input
          type="text"
          value={input}
          placeholder="உங்கள் கேள்வியை இங்கே எழுதுங்கள்..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        />
        <button className="chat-send" onClick={() => send()} disabled={busy || !input.trim()} aria-label="அனுப்பு">➤</button>
      </div>
    </div>
  );
}
