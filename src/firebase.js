// ═══════════════════════════════════════════════════════════════════
// Firebase (client) — Auth only. Config comes from build-time env vars
// (VITE_FIREBASE_*). The apiKey here is NOT a secret: Firebase security
// rests on Firestore rules + the Worker verifying the ID token.
// ═══════════════════════════════════════════════════════════════════
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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

export function onUser(cb) {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

// Fresh ID token for the signed-in user (or null). Sent as a Bearer token
// on every Worker API call so the server can verify who is calling.
export async function getIdToken() {
  if (!auth || !auth.currentUser) return null;
  try { return await auth.currentUser.getIdToken(); }
  catch (_) { return null; }
}
