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
| **2. Worker gateway** | ✅ | `worker/` — `/api/compute`, `/api/predict`, `/api/geocode` + auth/CORS/rate-limit. |
| **2b. Python backend lock** | ✅ | `horoscope_api.py` — internal token, CORS நீக்கம், open-proxy hole அடைப்பு. |
| **3. Firestore rules** | ✅ | `firestore.rules` — default-deny, owner-only. |

## 🚧 மீதமுள்ளவை (deploy பிறகு)

| Phase | என்ன |
|-------|------|
| **3b. Firebase Auth (client)** | Login UI + idToken-ஐ ஒவ்வொரு Worker அழைப்பிலும் அனுப்புதல். |
| **4. Thin client** | App.jsx-லிருந்து engine import நீக்கம் → எல்லா கணக்கும் Worker வழியாக (கீழே பார்க்கவும்). |
| **5. Hardening** | CSP headers, PDF watermark, obfuscation. |

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

- `wrangler.toml`-ல் Worker URL-ஐ `ALLOWED_ORIGINS`-ல் இணைத்தபடி, client build-ல் Worker URL-ஐ `VITE_API_URL` env-ஆக set செய் (Phase 4-ல் wire ஆகும்).
- Pages build: `npm run build`, output `dist`.

---

## 🔧 Phase 4 — Thin Client Migration (remaining work)

இலக்கு: App.jsx-லிருந்து `import ... from "./engine.js"` முழுவதையும் நீக்குதல். அப்போதுதான் bundle-ல் logic இருக்காது.

### 4.1 — Worker-க்கு சேர்க்க வேண்டிய endpoints
`/api/compute` + `/api/predict` ஏற்கனவே உள்ளன. கீழ்க்கண்டவை UI-ன் மற்ற பகுதிகளுக்குத் தேவை (compute.js-ல் engine functions ஏற்கனவே உள்ளன — wrapper மட்டும்):

| Endpoint | Engine function | UI பயன்பாடு |
|----------|-----------------|-------------|
| `/api/daily` | daily bundle (getTodayTranist, calcSadeSati, calcGuruPeyarchi, calcTaraBala, getPersonalizedRemedy) + `buildDailyPrompt` | தினப்பலன் screen |
| `/api/event-timing` | `calcEventTiming` | வாழ்க்கை நிகழ்வு காலக்கணிப்பு |
| `/api/porutham` | `generateHoroscope` ×2 + `calculate10Porutham` | திருமண பொருத்தம் |
| `/api/calendar-day` | `generateHoroscope` | பஞ்சாங்க calendar |
| `/api/nak-bhava` | `calcNakshatraBhavaLinks` | நட்சத்திர-பாவ பகுப்பு |

### 4.2 — Client மாற்றங்கள்
1. `handleSubmit` → local compute-க்கு பதில் `fetch(VITE_API_URL + "/api/compute", { headers:{Authorization:"Bearer "+idToken}, body: birthDetails })`.
2. திரும்பிய `report`-ஐ **date-reviver** வழியே Date-ஆக மாற்று (Worker JSON-ல் Date → ISO string ஆகிவிடும்):
   ```js
   const ISO = /^\d{4}-\d{2}-\d{2}T/;
   const revive = (v) => typeof v === "string" && ISO.test(v) ? new Date(v)
     : Array.isArray(v) ? v.map(revive)
     : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)])) : v;
   ```
3. `runAllEngines`-ஐ `applyReport(report)`-ஆக மாற்று — ஒவ்வொரு `setX(report.key)` மட்டும் (compute.js-ன் key பெயர்கள் state setter-களுடன் ஒத்தவை).
4. மற்ற எல்லா `generateHoroscope`/`calc*` inline அழைப்புகளையும் (porutham, calendar, event-timing, nak-bhava) மேலுள்ள endpoints-க்கு மாற்று.
5. இறுதியாக `import { ... } from "./engine.js"`-ஐ **நீக்கு**. `npm run build` பிறகு bundle-ல் engine இருக்காது — இதை உறுதிசெய்ய:
   ```bash
   grep -c "generateHoroscope" dist/assets/*.js   # → 0 வர வேண்டும்
   ```
6. Client-side-ல் தங்கக்கூடியவை (pure UI, logic அல்ல): `chartSVGString`, `MantraChakra`, `TraditionalChart`, `generateJathagamPDF`, `formatDateInput/parseDDMMYYYY` (dateHelpers).

### 4.3 — Firebase Auth wiring
```js
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithPhoneNumber } from "firebase/auth";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// அழைப்புக்கு முன்: const idToken = await auth.currentUser.getIdToken();
```

---

## 🛡️ Phase 5 — Hardening checklist

- [ ] GitHub repo **private** ஆக்கு.
- [ ] `index.html`-ல் CSP + `X-Frame-Options`, `Referrer-Policy` meta.
- [ ] Prod build-ல் source maps off (✅ ஏற்கனவே `vite.config.js`).
- [ ] PDF output-ல் user-id watermark (திருட்டு தடம் காண).
- [ ] Worker rate-limit values tune (தற்போது: user 60/மணி, IP 120/மணி).
- [ ] `/api/compute` response (~1.3MB) — தேவையற்ற field களை UI-க்கு மட்டும் சுருக்கு.

---

## 🔎 ஏன் இது "உலகத்தரம்"?

1. **Logic zero-exposure** — engine browser bundle-ல் இல்லை (Phase 4 பிறகு). DevTools-ல் பார்த்தாலும் form + fetch + render மட்டுமே தெரியும்.
2. **Auth-gated compute** — login இல்லாமல் ஒரு கணக்கும் நடக்காது.
3. **No open proxy** — Claude key Worker-ல்; prompt server-side; arbitrary-prompt hole அடைபட்டது.
4. **Least-privilege data** — Firestore default-deny, owner-only.
5. **Defence in depth** — origin lock + rate limit + input validation + internal-token backend.
