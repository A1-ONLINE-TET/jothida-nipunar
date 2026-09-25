# 🔐 ஜோதிட நிபுணர் — Security Architecture & Deployment Guide

இந்த ஆவணம்: நமது logic-ஐ browser-லிருந்து முழுவதுமாக மறைத்து, **Firebase + Cloudflare Worker**-ல் மட்டும் run செய்யும் secure architecture-ஐ எப்படி deploy செய்வது என்பதை விளக்குகிறது.

---

## 🎯 அடிப்படைக் கொள்கை

```
Browser (thin client)  ──idToken──▶  Cloudflare Worker (எல்லா logic)  ──internal token──▶  Python Swiss backend (optional)
        │                                      │
        │                                      ├──▶ Claude API (secret key)
        └──login──▶ Firebase Auth              └──▶ Firestore (Admin SDK)
```

- **Logic browser-க்கு போகவே போகாது** — engine முழுவதும் Worker-ல் run ஆகி **output JSON மட்டும்** திரும்பும்.
- Secrets (Claude key, internal token) **Worker secret**-ஆக மட்டும் — code-ல் இல்லை, browser-ல் இல்லை.
- Login செய்த பயனர் மட்டுமே API-ஐ அழைக்க முடியும் (Firebase idToken verify).

---

## ✅ இதுவரை முடிந்தவை (committed)

| Phase | நிலை | என்ன |
|-------|------|------|
| **1. Engine extraction** | ✅ | `src/engine.js` — 200 pure functions, App.jsx-லிருந்து பிரிக்கப்பட்டது. எல்லா golden test-ம் pass. |
| **2. Worker gateway** | ✅ | `worker/` — `/api/compute`, `/api/predict`, `/api/daily`, `/api/backtest`, `/api/event-timing`, `/api/nak-bhava`, `/api/porutham`, `/api/engine`, `/api/geocode` + auth/CORS/rate-limit. |
| **2b. Python backend lock** | ✅ | `horoscope_api.py` — internal token, CORS நீக்கம், open-proxy hole அடைப்பு. |
| **3. Firestore rules + Firebase Auth (client)** | ✅ | `firestore.rules` default-deny; `src/firebase.js` idToken ஒவ்வொரு அழைப்பிலும். |
| **4. Thin client** | ✅ | App.jsx-லிருந்து proprietary engine முழுவதும் நீக்கப்பட்டது. Bundle-ல் deep-analysis/backtest/porutham/shadbala/event-timing = **0**. பொது panchangam மட்டும் `almanac.js`-ல் client-side. |
| **5. Safe headers** | ✅ | `public/_headers`. |

## 🚧 மீதமுள்ளவை (deploy பிறகு)

| பணி | என்ன |
|-----|------|
| **Deploy** | கீழே STEP 1-4 — Firebase, Worker, Python backend, Pages. |
| **CSP** | Firebase/reCAPTCHA உடன் test செய்து enable (கீழே Appendix). |
| **Watermark (optional)** | PDF-ல் user-id watermark. |

> ⚠️ **முக்கியம்:** Client இப்போது **முழுவதும் Worker-ஐ சார்ந்தது** — deploy + `VITE_API_URL`/`VITE_FIREBASE_*` set செய்யும் வரை ஜாதகம்/பலன் வேலை செய்யாது (இதுவே "logic browser-ல் இல்லை" என்பதன் விளைவு). Deploy பிறகுதான் முழுமையாக இயங்கும்.

---

## 📦 Deploy — படிப்படியாக

### STEP 1 — Firebase project

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → `jothida-nipunar`
2. **Build → Authentication → Get started** → Sign-in method: **Phone** (அல்லது Email/Google) enable செய்.
3. **Build → Firestore Database → Create database** → production mode.
4. **Firestore → Rules** tab → இந்த repo-வின் `firestore.rules` உள்ளடக்கத்தை paste → **Publish**.
5. **Project settings (⚙️) → General** → "Your apps" → Web app (`</>`) add → **firebaseConfig**-ஐ copy (apiKey, authDomain, projectId…). இது client-ல் இருப்பது **சரியே** — வலிமை rules + Worker verify-ல் உள்ளது.
6. **Project settings → Service accounts → Generate new private key** → JSON download (Worker Firestore write-க்கு, தேவைப்பட்டால்).

> `projectId`-ஐ குறித்து வைக்கவும் — Worker secret `FIREBASE_PROJECT_ID`-க்கு இதுவே.

### STEP 2 — Python Swiss backend (optional high precision)

Render/Cloud Run-ல் ஏற்கனவே உள்ள `jothida-api.onrender.com`-ஐ update செய்:

```bash
# புதிய secured horoscope_api.py-ஐ deploy செய்
# Environment variables (Render dashboard → Environment):
INTERNAL_TOKEN=<ஒரு நீளமான random string — openssl rand -hex 32>
ANTHROPIC_API_KEY=<உங்கள் Claude key>   # (predict இனி Worker-ல்; இது optional)
```

இனி இந்த backend token இல்லாமல் **யாருக்கும்** பதிலளிக்காது.

### STEP 3 — Cloudflare Worker

```bash
cd worker
npm install
npx wrangler login

# KV namespace (rate-limit + JWKS cache)
npx wrangler kv namespace create RL
# → கிடைக்கும் id-ஐ wrangler.toml-ல் REPLACE_WITH_KV_NAMESPACE_ID இடத்தில் paste

# Secrets (browser-க்கு போகாதவை)
npx wrangler secret put ANTHROPIC_API_KEY      # உங்கள் Claude key
npx wrangler secret put FIREBASE_PROJECT_ID    # STEP 1-ன் projectId
npx wrangler secret put INTERNAL_TOKEN         # STEP 2-ன் அதே token
npx wrangler secret put SWISS_BACKEND_URL      # https://jothida-api.onrender.com  (optional)

# wrangler.toml → [vars] → ALLOWED_ORIGINS-ல் உங்கள் domain(s) சேர்
#   EPHEMERIS_MODE = "swiss"  (Swiss backend வேண்டுமானால்) அல்லது "meeus"

npx wrangler deploy
# → https://jothida-nipunar-api.<you>.workers.dev  (இதை குறித்து வை)
```

**சோதனை:** login இல்லாமல் அழைத்தால் `401 unauthorized` வர வேண்டும் (auth வேலை செய்கிறது):
```bash
curl -X POST https://jothida-nipunar-api.<you>.workers.dev/api/compute -d '{}'
# → {"error":"unauthorized"}   ✅
```

### STEP 4 — Client (Cloudflare Pages)

Pages project → **Settings → Environment variables** (Production), இவற்றை set செய்:

```
VITE_API_URL              = https://jothida-nipunar-api.<you>.workers.dev
VITE_FIREBASE_API_KEY     = <firebaseConfig.apiKey>
VITE_FIREBASE_AUTH_DOMAIN = <projectId>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID  = <projectId>
VITE_FIREBASE_APP_ID      = <firebaseConfig.appId>
```

- உங்கள் Pages domain-ஐ Worker-ன் `ALLOWED_ORIGINS`-ல் சேர்த்திருப்பதை உறுதிசெய்.
- Build: `npm run build`, output `dist`. `public/_headers` தானாக deploy ஆகும்.
- **சோதனை:** login செய்து ஜாதகம் பார்க்கவும் → DevTools → Network-ல் `/api/compute` அழைப்பு தெரிய வேண்டும்; Sources-ல் engine code (dasha/deep-analysis) **தெரியக் கூடாது**.

---

## ✅ Phase 4 — Thin Client (DONE)

App.jsx இனி engine-ஐ import செய்யவில்லை. அனைத்து personalized கணக்கும் Worker வழியாக (`src/api.js`): `apiCompute`, `apiPredict`, `apiDaily`, `apiBacktest`, `apiEventTiming`, `apiNakBhava`, `apiPorutham`, `apiEngine`. பொது panchangam/ephemeris (calendar, home strip, horai clock) மட்டும் `src/almanac.js`-ல் client-side (tree-shaken subset — proprietary functions bundle-லிருந்து விடுபடும்).

**உறுதிசெய்ய** (build பிறகு):
```bash
npm run build
f=$(ls dist/assets/index-*.js)
grep -c "புனர்ப்பு" "$f"              # deep-analysis → 0
grep -c "தசாதிபதிகள் நண்பர்கள்" "$f"   # porutham     → 0
```

---

## 🛡️ Hardening checklist

- [ ] GitHub repo **private** ஆக்கு.
- [x] Prod build-ல் source maps off (`vite.config.js`).
- [x] Safe security headers (`public/_headers`).
- [ ] CSP enable (கீழே Appendix — Firebase/reCAPTCHA உடன் test).
- [ ] PDF output-ல் user-id watermark (optional, திருட்டு தடம் காண).
- [ ] Worker rate-limit values tune (தற்போது: user 60/மணி, IP 120/மணி).

---

## Appendix — Content-Security-Policy (deploy பிறகு test செய்து enable)

`public/_headers`-ன் `/*` block-ல் இந்த வரியைச் சேர்த்து, `<WORKER>` + `<PROJECT>` மாற்றி, **phone-auth/reCAPTCHA வேலை செய்கிறதா என test செய்து** commit செய்யவும்:

```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://apis.google.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://<WORKER>.workers.dev https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://nominatim.openstreetmap.org; frame-src https://<PROJECT>.firebaseapp.com https://www.google.com;
```

CSP-ஐ மிக இறுக்கமாக்கினால் Firebase phone-auth உடையும் — ஒவ்வொரு directive-ஐயும் நிஜ login flow-உடன் சோதித்த பிறகே இறுக்கவும்.

---

## 🔎 ஏன் இது "உலகத்தரம்"?

1. **Logic zero-exposure** — engine browser bundle-ல் இல்லை (Phase 4 பிறகு). DevTools-ல் பார்த்தாலும் form + fetch + render மட்டுமே தெரியும்.
2. **Auth-gated compute** — login இல்லாமல் ஒரு கணக்கும் நடக்காது.
3. **No open proxy** — Claude key Worker-ல்; prompt server-side; arbitrary-prompt hole அடைபட்டது.
4. **Least-privilege data** — Firestore default-deny, owner-only.
5. **Defence in depth** — origin lock + rate limit + input validation + internal-token backend.
