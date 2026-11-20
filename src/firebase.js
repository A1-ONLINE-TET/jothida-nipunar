// ═══════════════════════════════════════════════════════════════════
// Firebase (client) — Auth + a small per-user Firestore record.
// Config comes from build-time env vars (VITE_FIREBASE_*). The apiKey here
// is NOT a secret: Firebase security rests on Firestore rules + the Worker
// verifying the ID token.
//
// Firestore is used through the "lite" SDK (plain REST calls, no realtime
// listeners / offline cache) — the app only reads and writes one document,
// and the full SDK cost ~250 KB of JavaScript on first load.
// ═══════════════════════════════════════════════════════════════════
import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider,
  linkWithPopup, signInWithCredential, signOut, deleteUser,
} from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, addDoc, collection, arrayUnion,
} from "firebase/firestore/lite";

// Firebase WEB config is NOT secret (Firebase security rests on Firestore
// rules + the Worker verifying the ID token). Env vars override; the public
// fallback below guarantees the client is always configured even if the
// build-time VITE_FIREBASE_* vars don't reach the bundle.
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC4CfHyRAICyDu8ZtoEH4bM86lp4Vh8RsE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jothidar-d1c8c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jothidar-d1c8c",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:120041380116:web:31d9f926683fd37bd40a01",
};

// Only initialise when configured, so the app still builds/runs in dev
// before Firebase is set up.
export const firebaseReady = Boolean(cfg.apiKey && cfg.projectId);
export const app = firebaseReady ? initializeApp(cfg) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// Every visitor gets an anonymous Firebase user so the app has a valid ID
// token to call the Worker with — no login screen needed. A user who links
// Google (Account page) keeps the same uid, so their saved charts follow them
// to a new phone. Anonymous sign-in runs only when no user is restored from
// the device, otherwise it would replace a linked account on every load.
let _authError = "";
export function getAuthError() { return _authError; }

function ensureAnonymous() {
  if (!auth) return Promise.resolve();
  return signInAnonymously(auth)
    .then(() => { _authError = ""; })
    .catch((e) => { _authError = `${e?.code || ""} — ${e?.message || e}`; });
}

if (auth) {
  // authStateReady resolves once the persisted user (if any) has been read.
  const ready = typeof auth.authStateReady === "function" ? auth.authStateReady() : Promise.resolve();
  ready.then(() => { if (!auth.currentUser) return ensureAnonymous(); _authError = ""; })
       .catch(() => ensureAnonymous());
} else {
  _authError = "Firebase not configured";
}

export function onUser(cb) {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

// Wait (briefly) for sign-in to complete, then return a fresh ID token. Sent
// as a Bearer token on every Worker API call so the server can verify the
// caller. Returns null if Firebase isn't configured.
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

// Wait briefly for the user to be ready, then return the uid.
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

// ── Cloud copy of the saved charts (Firestore users/{uid}) ──────────
// Only the owner can read/write it (Firestore rules). Best-effort: failures
// are swallowed so the app still works offline / unconfigured.
const CLOUD_MAX = 50;
function slim(p) {
  return {
    id: p.id, name: p.name || "", dob: p.dob || "", tob: p.tob || "", sec: p.sec || "", ampm: p.ampm || "AM",
    gender: p.gender || "", pob: p.pob || "", pobLat: p.pobLat ?? null, pobLon: p.pobLon ?? null,
    pobSource: p.pobSource ?? null, pobTz: p.pobTz || "", notes: (p.notes || "").slice(0, 600), savedAt: p.savedAt || "",
  };
}

export async function saveProfilesCloud(list) {
  if (!db || !Array.isArray(list)) return false;
  const uid = await waitUid();
  if (!uid) return false;
  try {
    const profiles = list.slice(0, CLOUD_MAX).map(slim);
    // `owner` is required by the Firestore rules (owner === uid, immutable).
    // `profile` (the first chart) is kept for older app versions that read it.
    await setDoc(doc(db, "users", uid),
      { owner: uid, profile: profiles[0] || null, profiles, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (_) { return false; }
}

// Returns the saved list, [] when the user has none, or null when the cloud
// could not be reached (callers must not treat that as "empty").
export async function loadProfilesCloud() {
  if (!db) return null;
  const uid = await waitUid();
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return [];
    const d = snap.data();
    if (Array.isArray(d.profiles)) return d.profiles.filter((p) => p && p.name);
    return d.profile && d.profile.name ? [d.profile] : [];
  } catch (_) { return null; }
}

// ── Account: who is signed in ───────────────────────────────────────
export function accountInfo() {
  const u = auth && auth.currentUser;
  if (!u) return { ready: false, linked: false, email: "", name: "" };
  const g = (u.providerData || []).find((p) => p.providerId === "google.com");
  return { ready: true, linked: !u.isAnonymous && !!g, email: (g && g.email) || u.email || "", name: (g && g.displayName) || u.displayName || "" };
}

// Is Google sign-in usable from this address? The Firebase project must have
// this host in its authorised domains (and the Google provider switched on).
// Asked from Firebase's public project-config endpoint; cached per session.
export async function googleLinkAvailable() {
  if (!auth) return false;
  const host = typeof location !== "undefined" ? location.hostname : "";
  try {
    const cached = sessionStorage.getItem("jn_glink");
    if (cached === "1" || cached === "0") return cached === "1";
  } catch (_) { /* ignore */ }
  let ok = false;
  try {
    const res = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${encodeURIComponent(cfg.apiKey)}`);
    if (res.ok) {
      const j = await res.json();
      const domains = Array.isArray(j.authorizedDomains) ? j.authorizedDomains : [];
      const hostOk = domains.some((d) => host === d || host.endsWith("." + d));
      const idp = Array.isArray(j.idpConfig) ? j.idpConfig : null;
      const googleOn = idp ? idp.some((p) => /google/i.test(p.provider || "") && p.enabled !== false) : true;
      ok = hostOk && googleOn;
    }
  } catch (_) { ok = false; }
  try { sessionStorage.setItem("jn_glink", ok ? "1" : "0"); } catch (_) { /* ignore */ }
  return ok;
}

// Link the current (anonymous) user to a Google account so the same uid —
// and its saved charts — can be opened on another device. If that Google
// account already belongs to an earlier install, switch to it instead.
// Returns { ok, switched, error } — never throws.
export async function linkGoogle() {
  if (!auth) return { ok: false, error: "unavailable" };
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    if (auth.currentUser) await linkWithPopup(auth.currentUser, provider);
    else return { ok: false, error: "unavailable" };
    return { ok: true, switched: false };
  } catch (e) {
    const code = e && e.code ? e.code : "";
    if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
      try {
        const cred = GoogleAuthProvider.credentialFromError(e);
        if (cred) { await signInWithCredential(auth, cred); return { ok: true, switched: true }; }
      } catch (_) { /* fall through */ }
      return { ok: false, error: "in-use" };
    }
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return { ok: false, error: "cancelled" };
    if (code === "auth/popup-blocked") return { ok: false, error: "blocked" };
    if (code === "auth/operation-not-allowed" || code === "auth/unauthorized-domain") return { ok: false, error: "unavailable" };
    if (code === "auth/network-request-failed") return { ok: false, error: "network" };
    return { ok: false, error: "failed" };
  }
}

// Sign out of the Google account on this device (the cloud copy stays). A
// fresh anonymous user is created straight away so the app keeps working.
export async function signOutToAnonymous() {
  if (!auth) return false;
  try { await signOut(auth); } catch (_) { /* ignore */ }
  await ensureAnonymous();
  return true;
}

// Delete everything this app holds about the user on the server: the
// Firestore record and the Firebase sign-in itself. The caller clears the
// device copy. Returns { ok, error }.
export async function deleteAccountData() {
  if (!auth) return { ok: true };
  const u = auth.currentUser;
  if (!u) return { ok: true };
  try {
    if (db) await deleteDoc(doc(db, "users", u.uid));
  } catch (e) {
    // Offline / blocked: don't claim the server copy is gone.
    return { ok: false, error: (e && e.code) || "failed" };
  }
  try { await deleteUser(u); }
  catch (e) {
    // The record is already gone; a sign-in that is too old to delete itself is
    // signed out instead (it holds no data any more).
    try { await signOut(auth); } catch (_) { /* ignore */ }
  }
  await ensureAnonymous();
  return { ok: true };
}

// ── Reports and feedback ────────────────────────────────────────────
// A wrong / harmful answer report, or a message to the developer. Stored in
// the `reports` collection (create-only for the sender; nobody can read it
// from the app). If that collection is not yet enabled in the project's
// rules, the report is kept on the user's own record so it is not lost.
export async function submitReport(report) {
  if (!db) return false;
  const uid = await waitUid();
  if (!uid) return false;
  const clip = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");
  const entry = {
    owner: uid,
    kind: clip(report.kind, 20) || "answer",          // "answer" | "feedback"
    reason: clip(report.reason, 40),
    comment: clip(report.comment, 1000),
    question: clip(report.question, 400),
    answer: clip(report.answer, 3000),
    mode: clip(report.mode, 20),                       // "ai" | "engine" | "deep"
    app: clip(report.app, 20),
    createdAt: new Date().toISOString(),
  };
  try { await addDoc(collection(db, "reports"), entry); return true; }
  catch (_) { /* fall back to the user's own record */ }
  try {
    await setDoc(doc(db, "users", uid), { owner: uid, reports: arrayUnion(entry) }, { merge: true });
    return true;
  } catch (_) { return false; }
}
