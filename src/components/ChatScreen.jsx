import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import "./chat.css";
import { ReportLink } from "./ReportBox.jsx";

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


// Answers must be plain strings before they become a message — a non-string
// (object/number) would throw when rendered as a React child or sliced by the
// typewriter, blanking the whole app. Coerce defensively at the boundary.
function asText(v, fallback) {
  if (typeof v === "string" && v.trim()) return v;
  if (v == null) return fallback;
  if (typeof v === "object") return fallback;
  const s = String(v);
  return s.trim() ? s : fallback;
}

// persona = src/components/personas.js-இன் ஓர் உதவியாளர் (பெயர், படம், அறிமுகம், மாதிரிக் கேள்விகள்).
// அதன் key தொடக்கத் தலைப்பாகச் சேவையகத்துக்குச் செல்கிறது — தெளிவான தலைப்பு இல்லாத கேள்வி
// ("எப்போது?") அந்த உதவியாளரின் துறையிலேயே பதிலளிக்கப்படும்.
export default function ChatScreen({ ask, askAI, askPremium, onBack, onReport, persona, personName, initialQuestion = "", premiumLabel = "ஆழமான AI பதில்" }) {
  const [aiMode, setAiMode] = useState(false); // AI இயல்பு மொழி ON/OFF
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const autoSentRef = useRef(false);
  const lastTopicRef = useRef(persona.key === "general" ? "" : persona.key); // follow-up நினைவு — தொடக்கம்: உதவியாளரின் துறை

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
      const useAI = !!(aiMode && askAI);
      const fn = useAI ? askAI : ask;
      const { answer, category, ai } = await fn(question, lastTopicRef.current);
      if (category && category !== "general") lastTopicRef.current = category;
      setMessages((m) => [...m, { role: "astro", q: question, mode: useAI && ai ? "ai" : "engine", text: asText(answer, "மன்னிக்கவும், இப்போது பதிலளிக்க முடியவில்லை."), done: false }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "astro", error: true, text: "சர்வர் இப்போது பதிலளிக்கவில்லை. சில வினாடிகள் கழித்து மீண்டும் முயலுங்கள்.", done: true }]);
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
      setMessages((m) => [...m, { role: "astro", q: question, mode: "deep", text: asText(answer, "மன்னிக்கவும், பதிலளிக்க முடியவில்லை."), done: false, premium: true }]);
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg !== "cancelled") {
        setMessages((m) => [...m, { role: "astro", error: true, text: "பதில் பெற முடியவில்லை. மீண்டும் முயலுங்கள்.", done: true }]);
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
          <img className="chat-ava-img" src={persona.image} alt="" width="42" height="42" />
          <div style={{ minWidth: 0 }}>
            <div className="chat-ttl">{persona.name}</div>
            <div className="chat-sub">AI உதவியாளர்</div>
          </div>
        </div>
        {askAI && (
          <button
            onClick={() => setAiMode((v) => !v)}
            title="AI இயல்பு மொழி"
            style={{
              marginLeft: "auto", cursor: "pointer", fontSize: 12, fontWeight: 700, minHeight: 36,
              padding: "0 14px", borderRadius: 999, fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
              border: aiMode ? "1px solid #1f3f68" : "1px solid #e3e8f2",
              background: aiMode ? "#1f3f68" : "#ffffff", color: aiMode ? "#ffffff" : "#4a5365",
            }}
          >
            AI: {aiMode ? "இயக்கம்" : "நிறுத்தம்"}
          </button>
        )}
      </header>

      <div className="chat-notice" data-ai-notice>
        இது தானியங்கி AI உதவியாளர்; மனித ஜோதிடர் அல்ல. பதில்கள் உங்கள் ஜாதகக் கணக்கிலிருந்து உருவாகின்றன — வழிகாட்டலுக்கு மட்டும். மருத்துவம், சட்டம், முதலீடு போன்ற முடிவுகளுக்கு உரிய நிபுணரை அணுகுங்கள்.
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        <div className="chat-hero" data-persona-hero={persona.key}>
          <img src={persona.image} alt="" width="104" height="104" />
          <div className="chat-hero-name">{persona.name}</div>
          <div className="chat-hero-role">{persona.role}</div>
          <p className="chat-hero-intro">
            வணக்கம்{personName ? " " + personName : ""}. நான் {persona.name} — உங்கள் ஜாதகக் கணக்கை வைத்துப் பதிலளிக்கும் AI உதவியாளர்; மனித ஜோதிடர் அல்ல. {persona.intro}
          </p>
        </div>
        {messages.map((m, i) => (
          <div key={i} className={`chat-row ${m.role}`}>
            {m.role === "astro" && <img className="chat-row-ava" src={persona.image} alt="" width="28" height="28" />}
            <div className={`chat-bubble ${m.role} ${m.premium ? "premium" : ""}`}>
              {m.premium && <div className="chat-premium-tag">AI ஆழ்ந்த பதில்</div>}
              {m.role === "astro" && !m.done
                ? <TypingText text={m.text} onDone={() => markDone(i)} />
                : <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span>}
              {m.role === "astro" && m.done && !m.error && onReport && (
                <ReportLink onReport={(reason, comment) => onReport({ question: m.q || "", answer: m.text, reason, comment, mode: `${m.mode || "engine"}:${persona.key}` })} />
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="chat-row astro">
            <img className="chat-row-ava" src={persona.image} alt="" width="28" height="28" />
            <div className="chat-bubble astro chat-typing">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
        {messages.length === 0 && !busy && (
          <div className="chat-suggest" data-suggestions>
            {persona.suggestions.map((s) => (
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
        <button className="chat-send" onClick={() => send()} disabled={busy || !input.trim()} aria-label="அனுப்பு"><Send size={18} /></button>
      </div>
    </div>
  );
}
