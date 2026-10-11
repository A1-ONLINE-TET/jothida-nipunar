// ═══════════════════════════════════════════════════════════════════
// Firebase (client) — Auth only. Config comes from build-time env vars
// (VITE_FIREBASE_*). The apiKey here is NOT a secret: Firebase security
// rests on Firestore rules + the Worker verifying the ID token.
// ═══════════════════════════════════════════════════════════════════
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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
export const db = app ? getFirestore(app) : null;

// Auto sign-in every visitor anonymously so the app has a valid Firebase
// ID token to call the Worker with — no login screen needed. This gates the
// API to real app loads (blocks direct scraping) and gives per-user rate
// limiting. Upgrade to Email/Phone sign-in later if you need real accounts.
let _authError = "";
export function getAuthError() { return _authError; }

if (auth) {
  signInAnonymously(auth)
    .then((c) => { _authError = ""; console.log("JN ANON SIGN-IN OK uid=", c?.user?.uid); })
    .catch((e) => { _authError = `${e?.code || ""} — ${e?.message || e}`; console.error("JN ANON SIGN-IN FAILED:", _authError); });
} else {
  _authError = "Firebase not configured (VITE_FIREBASE_* missing)";
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
  if (!auth.currentUser) { console.error("JN TOKEN: no currentUser (sign-in not ready)"); return null; }
  try {
    const t = await auth.currentUser.getIdToken();
    console.log("JN TOKEN: obtained, length=", t ? t.length : 0);
    return t;
  }
  catch (e) { console.error("JN TOKEN ERROR:", e?.code, e?.message); return null; }
}

// Wait briefly for the anonymous user to be ready, then return the uid.
async function waitUid() {
  if (!auth) return null;
  if (!auth.currentUser) {
    await new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => { if (u) { unsub(); resolve(); } });
      setTimeout(() => { unsub(); resolve(); }, 6000);
    });
  }
  return auth.currentUser ? auth.currentUser.uid : null;
}

// ── Cloud profile (Firestore) — free per-user storage of birth details ──
// Saved under users/{uid}. Only the owner can read/write it (Firestore rules).
// Best-effort: failures are swallowed so the app still works offline / unconfigured.
export async function saveProfileCloud(profile) {
  if (!db) return false;
  const uid = await waitUid();
  if (!uid) return false;
  try {
    // `owner` is required by the Firestore rules (owner === uid, immutable).
    await setDoc(doc(db, "users", uid),
      { owner: uid, profile, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (_) { return false; }
}

export async function loadProfileCloud() {
  if (!db) return null;
  const uid = await waitUid();
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data().profile || null) : null;
  } catch (_) { return null; }
}
