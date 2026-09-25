# ஜோதிட நிபுணர் — Project Guide for Claude

இந்த file-ஐ எந்த புதிய Claude session-ம் தானாகப் படிக்கும். இதில் app-ன்
architecture, deploy அமைப்பு, மற்றும் "என்ன செய்யலாம் / என்ன செய்யக்கூடாது"
விவரங்கள் உள்ளன.

---

## 🎯 App என்ன?
Vedic astrology (ஜோதிடம்) web app — React + Vite. பிறப்பு விவரம் → முழு ஜாதகம்,
dasha, deep-analysis, backtest, பொருத்தம், தினப்பலன், AI பலன் (Claude).

## 🔐 மிக முக்கிய Architecture விதி (NEVER BREAK)
proprietary astrology **logic browser-க்கு போகக் கூடாது**. அது server-side-ல்
(Cloudflare Worker) மட்டுமே run ஆகி, **output மட்டுமே** client-க்கு வரும்.

```
Browser (thin client, src/)  ──Firebase idToken──▶  Cloudflare Worker (worker/)
   • UI + forms + display only                         • எல்லா engine (src/engine.js)
   • almanac.js = public panchangam only                • Claude API (secret key)
   • api.js = the ONLY bridge to server                 • returns output JSON only
```

- **`src/engine.js`** = proprietary engine (200 functions). இதை **client-ல் (App.jsx)
  import செய்யக் கூடாது**. Worker மட்டுமே import செய்யும் (`worker/src/compute.js`).
- **`src/almanac.js`** = client-side-ல் அனுமதிக்கப்பட்ட public panchangam/ephemeris
  subset மட்டும் (calendar, home strip, horai clock). Tree-shaking மூலம் proprietary
  functions bundle-லிருந்து விலகும்.
- **`src/api.js`** = Worker-க்கு அழைக்கும் bridge (apiCompute, apiPredict, apiDaily,
  apiBacktest, apiEventTiming, apiNakBhava, apiPorutham, apiEngine). எல்லா
  personalized கணக்கும் இதன் வழியே.
- **verify:** `npm run build` பிறகு `grep -c "புனர்ப்பு" dist/assets/index-*.js` → **0**
  ஆக இருக்க வேண்டும் (proprietary logic bundle-ல் இல்லை).

## 📁 File map
| File | என்ன | யார் தொடலாம் |
|------|------|-------------|
| `src/App.jsx` | **முழு UI + design** (React, styling, screens) | ✅ design வேலைக்கு இதுதான் |
| `src/almanac.js` | client public panchangam re-exports | அரிதாக |
| `src/api.js` | server bridge | endpoint சேர்க்கும்போது |
| `src/engine.js` | proprietary engine (server-only) | logic மாற்றும்போது (client-ல் import ❌) |
| `src/precision.js`, `bhava-phalam.js`, `deep-analysis.js`, `constants.js` | engine helpers (pure) | logic மாற்றம் |
| `worker/src/*` | Cloudflare Worker (index, compute, prompt, auth, claude) | server logic/endpoints |
| `index.html`, `public/` | HTML shell, PWA, `_headers` | design/meta |

## 🎨 Design வேலை எப்படி (இதுதான் அடிக்கடி தேவை)
App-ன் **முழு design (colors, layout, fonts, screens, animation)** `src/App.jsx`-ல்
உள்ளது (inline styles + `index.html`-ன் `<style>`). Design மாற்ற:
1. `src/App.jsx` (அல்லது `index.html`) edit செய்.
2. `npm run build` — build pass ஆகிறதா பார்.
3. branch-க்கு commit + push → website **தானாகவே** update ஆகும் (கீழே பார்).
Design மாற்றம் secure engine-ஐ தொடாது — பாதுகாப்பானது.

## 🚀 Deploy அமைப்பு (LIVE)
- **Repo:** `A1-ONLINE-TET/jothida-nipunar`
- **Working branch:** `claude/gifted-bell-30bulb`  ← Pages + Worker இதிலிருந்து auto-deploy
- **Website (Cloudflare Pages):** project `jothida-app` → https://jothida-nipunar.pages.dev
  - Build: command `npm run build`, output `dist`
  - Env vars (Production): `VITE_API_URL`, `VITE_FIREBASE_API_KEY`,
    `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
- **API (Cloudflare Worker):** `jothidarjothi` → https://jothidarjothi.1982chandramathan.workers.dev
  - Root directory `worker`, deploy command `npx wrangler deploy`
  - Runtime var `FIREBASE_PROJECT_ID = jothidar-d1c8c` (in `worker/wrangler.toml`)
  - Secret needed for AI பலன்: `ANTHROPIC_API_KEY` (set in Worker → Settings → Variables & Secrets, type=Secret) — **not yet set**
  - CORS allow-list `ALLOWED_ORIGINS` in `worker/wrangler.toml` — புதிய domain சேர்த்தால் இங்கே சேர்.
- **Firebase:** project `jothidar-d1c8c` — Auth (Anonymous auto sign-in), Firestore (default-deny rules).

### ⚙️ Auto-deploy
`claude/gifted-bell-30bulb` branch-க்கு **push** செய்தால் — Cloudflare தானாகவே
Pages + Worker இரண்டையும் மீண்டும் build+deploy செய்யும் (~2 நிமிடம்). தனி வேலை இல்லை.

## 🧪 Commands
- `npm install` — dependencies (root: client; `worker/`: wrangler)
- `npm run build` — client build (deploy முன் இதை pass செய்ய வேண்டும்)
- `npm test` — 130 golden engine tests (engine.js மாற்றினால் இதை ஓட்டு)
- Worker bundle check: `cd worker && npx wrangler deploy --dry-run`

## ⚠️ Gotchas
- Worker JSON-ல் Date → ISO string ஆகும்; `api.js`-ன் `reviveDates()` client-ல்
  மீண்டும் Date ஆக்குகிறது. புதிய endpoint சேர்த்தால் இதை நினைவில் கொள்.
- Free Cloudflare plan: `wrangler.toml`-ல் `[limits] cpu_ms` வைக்கக் கூடாது.
- Worker `worker/` folder-ல் — Cloudflare build-ல் Root directory `worker` இருக்க வேண்டும்.
- Full architecture + deploy guide: `docs/SECURITY-DEPLOY.md`.
