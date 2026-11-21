import React, { useState, useEffect, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import AstrologyApp from './App.jsx'

// ── Access gate (temporary login) ──────────────────────────────────
// Enabled only when VITE_REQUIRE_ACCESS === "true". The entered code is
// stored and sent on every API call (api.js); the Worker enforces it via
// the ACCESS_CODE secret, so a leaked link is useless without the code.
const REQUIRE_ACCESS = import.meta.env.VITE_REQUIRE_ACCESS === "true";
const ACCESS_KEY = "jn_access";
function hasAccess() { try { return !!localStorage.getItem(ACCESS_KEY); } catch (_) { return false; } }

function AccessGate({ children }) {
  const [ok, setOk] = useState(() => !REQUIRE_ACCESS || hasAccess());
  const [code, setCode] = useState("");
  if (ok) return children;
  const submit = (e) => {
    e?.preventDefault?.();
    const c = code.trim();
    if (!c) return;
    try { localStorage.setItem(ACCESS_KEY, c); } catch (_) {}
    setOk(true); // the Worker validates it on the first API call
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, background: "#ffffff", color: "#27303f", fontFamily: "'Noto Sans Tamil', system-ui, sans-serif", textAlign: "center" }}>
      <img src="/logo/topper-astro.webp" alt="TOPPER ASTRO" style={{ width: 280, maxWidth: "84vw", height: "auto", WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 76%, transparent 100%)", maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 76%, transparent 100%)" }} />
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1f3f68" }}>ஜோதிட நிபுணர்</h2>
      <p style={{ margin: 0, fontSize: 14, color: "#4a5365", maxWidth: 300, lineHeight: 1.7 }}>
        தொடர அணுகல் குறியீட்டை உள்ளிடுங்கள்.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        <input
          type="password" value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="அணுகல் குறியீடு" autoFocus
          style={{ padding: "13px 16px", borderRadius: 12, border: "1.5px solid #d9e0ee", background: "#fcfdff", color: "#27303f", fontSize: 16, textAlign: "center", outline: "none" }}
        />
        <button type="submit" style={{ padding: "12px 26px", borderRadius: 999, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#2a4d7e,#1f3f68 45%,#16304f)", color: "#f6f8fc", fontSize: 15, fontWeight: 700 }}>
          உள்நுழை
        </button>
      </form>
      <p style={{ margin: 0, fontSize: 12, color: "#76819a", maxWidth: 300 }}>
        குறியீடு தவறெனில் மீண்டும் கேட்கும்.
      </p>
    </div>
  );
}

// White-screen guard: if any screen throws during render, show a friendly
// reload card instead of a blank page. The reload button also clears
// caches + unregisters any service worker, so a stale/broken cached bundle
// can never trap the user on a white screen.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  async hardReload() {
    try {
      if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); }
      if ('serviceWorker' in navigator) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map((r) => r.unregister())); }
    } catch (_) { /* ignore */ }
    location.reload(true);
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, background: "#ffffff", color: "#27303f", fontFamily: "'Noto Sans Tamil', system-ui, sans-serif", textAlign: "center" }}>
        <img src="/logo/topper-astro.webp" alt="TOPPER ASTRO" style={{ width: 280, maxWidth: "84vw", height: "auto", WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 76%, transparent 100%)", maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 76%, transparent 100%)" }} />
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "#1f3f68" }}>சிறிய இடையூறு ஏற்பட்டது</h2>
        <p style={{ margin: 0, fontSize: 14, color: "#4a5365", maxWidth: 320, lineHeight: 1.7 }}>
          பயன்பாட்டை மீண்டும் ஏற்றினால் சரியாகிவிடும். கீழே உள்ள பொத்தானை அழுத்துங்கள்.
        </p>
        <button onClick={() => this.hardReload()} style={{ marginTop: 6, padding: "12px 26px", borderRadius: 999, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#2a4d7e,#1f3f68 45%,#16304f)", color: "#f6f8fc", fontSize: 15, fontWeight: 700 }}>
          மீண்டும் ஏற்று
        </button>
      </div>
    );
  }
}

// இணையம் இல்லாதபோது ஒரு சிறு அறிவிப்பு — பொதுப் பகுதிகள் (பஞ்சாங்கம், நாட்காட்டி) சாதனத்திலேயே
// கணக்கிடப்படுவதால் இயங்கும்; ஜாதகக் கணக்குகளுக்கு இணையம் தேவை.
function OfflineNotice() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (!offline) return null;
  return (
    <div data-offline-notice role="status" style={{ position: "fixed", left: 0, right: 0, bottom: "calc(92px + env(safe-area-inset-bottom))", zIndex: 200, display: "flex", justifyContent: "center", pointerEvents: "none", padding: "0 16px" }}>
      <div style={{ maxWidth: 420, padding: "9px 16px", borderRadius: 999, background: "#27303f", color: "#ffffff", fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, textAlign: "center", fontFamily: "'Noto Sans Tamil', system-ui, sans-serif", boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}>
        இணையம் இல்லை. பஞ்சாங்கம், நாட்காட்டி இயங்கும்; ஜாதகக் கணக்குக்கு இணையம் தேவை.
      </div>
    </div>
  );
}

// Service worker — app shell-ஐச் சேமித்து இணையம் இல்லாமலும் திறக்க உதவும் (production build மட்டும்).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AccessGate>
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#ffffff" }} />}>
          <AstrologyApp />
        </Suspense>
      </AccessGate>
      <OfflineNotice />
    </ErrorBoundary>
  </React.StrictMode>
)
