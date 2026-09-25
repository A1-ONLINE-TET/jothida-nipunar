// ═══════════════════════════════════════════════════════════════════
// Firebase (client) — Auth only. Config comes from build-time env vars
// (VITE_FIREBASE_*). The apiKey here is NOT a secret: Firebase security
// rests on Firestore rules + the Worker verifying the ID token.
// ═══════════════════════════════════════════════════════════════════
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialise when configured, so the app still builds/runs in dev
// before Firebase is set up.
export const firebaseReady = Boolean(cfg.apiKey && cfg.projectId);
export const app = firebaseReady ? initializeApp(cfg) : null;
export const auth = app ? getAuth(app) : null;

// Auto sign-in every visitor anonymously so the app has a valid Firebase
// ID token to call the Worker with — no login screen needed. This gates the
// API to real app loads (blocks direct scraping) and gives per-user rate
// limiting. Upgrade to Email/Phone sign-in later if you need real accounts.
if (auth) {
  signInAnonymously(auth).catch(() => { /* Anonymous provider not enabled yet */ });
}

export function onUser(cb) {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

// Wait (briefly) for anonymous sign-in to complete, then return a fresh ID
// token. Sent as a Bearer token on every Worker API call so the server can
// verify the caller. Returns null if Firebase isn't configured.
export async function getIdToken() {
  if (!auth) return null;
  if (!auth.currentUser) {
    await new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => { if (u) { unsub(); resolve(); } });
      setTimeout(() => { unsub(); resolve(); }, 8000); // give up after 8s
    });
  }
  if (!auth.currentUser) return null;
  try { return await auth.currentUser.getIdToken(); }
  catch (_) { return null; }
}
