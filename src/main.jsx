import React, { useState } from 'react'
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24, background: "#0b0a1a", color: "#f5efe0", fontFamily: "'Noto Sans Tamil', system-ui, sans-serif", textAlign: "center" }}>
      <div style={{ fontSize: 46 }}>🔮</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>ஜோதிட நிபுணர்</h2>
      <p style={{ margin: 0, fontSize: 14, color: "#c9b88a", maxWidth: 300, lineHeight: 1.7 }}>
        தொடர அணுகல் குறியீட்டை (access code) உள்ளிடுங்கள்.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        <input
          type="password" value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="அணுகல் குறியீடு" autoFocus
          style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #3a3550", background: "#17142b", color: "#f5efe0", fontSize: 16, textAlign: "center", outline: "none" }}
        />
        <button type="submit" style={{ padding: "12px 26px", borderRadius: 999, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#c9a84a,#9a7b2e)", color: "#1a1206", fontSize: 15, fontWeight: 700 }}>
          உள்நுழை
        </button>
      </form>
      <p style={{ margin: 0, fontSize: 11.5, color: "#6b6480", maxWidth: 300 }}>
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
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24, background: "#0b0a1a", color: "#f5efe0", fontFamily: "'Noto Sans Tamil', system-ui, sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 44 }}>🔮</div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>சிறிய இடையூறு ஏற்பட்டது</h2>
        <p style={{ margin: 0, fontSize: 14, color: "#c9b88a", maxWidth: 320, lineHeight: 1.7 }}>
          பயன்பாட்டை மீண்டும் ஏற்றினால் சரியாகிவிடும். கீழே உள்ள பொத்தானை அழுத்துங்கள்.
        </p>
        <button onClick={() => this.hardReload()} style={{ marginTop: 6, padding: "12px 26px", borderRadius: 999, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#c9a84a,#9a7b2e)", color: "#1a1206", fontSize: 15, fontWeight: 700 }}>
          மீண்டும் ஏற்று
        </button>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AccessGate>
        <AstrologyApp />
      </AccessGate>
    </ErrorBoundary>
  </React.StrictMode>
)
