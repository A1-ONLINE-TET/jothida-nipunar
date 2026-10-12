# ஜோதிட நிபுணர் — முழு Project வழிகாட்டி (Step by Step)

> இந்த file-ஐ GitHub-லிருந்து download செய்து, கீழே உள்ள படிகளைப் பின்பற்றி
> project-ஐ உங்கள் கணினியில் run செய்யலாம், புரிந்துகொள்ளலாம், deploy செய்யலாம்.
> எந்த அனுபவமும் இல்லாதவரும் படிப்படியாகச் செய்யலாம்.

---

## 1. App என்ன? (ஒரு பார்வையில்)

Vedic astrology (ஜோதிடம்) web app — **React + Vite** (முன்பக்கம்) +
**Cloudflare Worker** (பின்பக்கம்/server).

பிறப்பு விவரம் (தேதி, நேரம், இடம்) → முழு ஜாதகம், தசை, பொருத்தம், தினப்பலன்,
மற்றும் **AI ஜோதிடர் ஆலோசனை** (Gemini).

### 🔐 மிக முக்கியமான கட்டமைப்பு விதி (உடைக்கக் கூடாது)
உண்மையான ஜோதிட **logic (engine) browser-க்கு போகக் கூடாது**. அது
server-side-ல் (Cloudflare Worker) மட்டுமே run ஆகி, **பதில் மட்டுமே**
browser-க்கு வரும்.

```
Browser (thin client, src/)          Cloudflare Worker (worker/)
 • UI + forms + display      ──idToken──▶  • engine (உண்மையான கணக்கீடு)
 • api.js = server-க்கு பாலம்            • Gemini API (secret key)
 • engine.js import ❌ கூடாது            • output JSON மட்டும் திருப்பும்
```

---

## 2. முழு File விவரம்

### 📁 வேர் (root) files
| File | என்ன |
|------|------|
| `package.json` | client dependencies + `npm` commands (dev/build/preview/test) |
| `vite.config.js` | Vite build அமைப்பு (output = `dist`) |
| `index.html` | HTML shell + splash CSS |
| `CLAUDE.md` | Claude session-களுக்கான project guide |
| `PROJECT-GUIDE-TAMIL.md` | **இந்த file** |

### 📁 `src/` — Client (browser-ல் run ஆகும்)
| File | என்ன | தொடலாமா |
|------|------|---------|
| `main.jsx` | app entry + **ErrorBoundary** (white-screen தடுப்பு) | அரிதாக |
| `App.jsx` | **முழு UI + design + screens** (3000+ வரி) | ✅ design வேலைக்கு இதுதான் |
| `api.js` | Worker-க்கு அழைக்கும் **ஒரே பாலம்** (apiAsk, apiAskAI, apiAskDeep, apiCompute, apiDaily, apiPorutham…) | endpoint சேர்க்கும்போது |
| `firebase.js` | Firebase Auth (anonymous sign-in) + idToken | அரிதாக |
| `almanac.js` | client-side public panchangam மட்டும் (calendar, horai) | அரிதாக |
| `engine.js` | proprietary engine — **client-ல் import ❌** (Worker மட்டும்) | logic மாற்றம் |
| `precision.js`, `bhava-phalam.js`, `deep-analysis.js`, `constants.js` | engine helpers | logic மாற்றம் |
| `murugan-b64.js` | படம் (base64) | — |

### 📁 `src/components/`
| File | என்ன |
|------|------|
| `HomeScreen.jsx` | முகப்பு திரை (cards) — lucide-react icons |
| `AdvisoryScreen.jsx` | 🔮 ஆலோசனை தலைப்பு தேர்வு திரை |
| `ChatScreen.jsx` | ஜோதிடர் chat (typewriter, AI toggle, premium) |
| `ZodiacWheel.jsx` | ராசி சக்கரம் |
| `razorpay.js` | ₹49 payment flow (தற்போது free mode-ல் பயன்படாது) |
| `chat.css`, `home.css` | styling |

### 📁 `src/utils/`
| File | என்ன |
|------|------|
| `dateHelpers.js` | தேதி/நேரம் format |
| `geocoding.js` | இட தேடல் உதவி |

### 📁 `worker/` — Cloudflare Worker (server, API)
| File | என்ன |
|------|------|
| `wrangler.toml` | Worker config + env vars (`AI_PROVIDER`, `ALLOWED_ORIGINS`, secrets பட்டியல்) |
| `src/index.js` | **எல்லா API routes** (/api/ask, /api/ask-ai, /api/ask-deep, /api/compute, /api/daily, /api/porutham…) |
| `src/compute.js` | engine-ஐ wrap செய்து ஜாதகம்/தசை கணக்கிடும் |
| `src/ask.js` | rule-based ஜோதிடர் பதில் (buildAskAnswer) |
| `src/gemini.js` | Gemini API அழைப்பு + astrologer prompt |
| `src/claude.js` | Claude API அழைப்பு (மாற்று AI) |
| `src/prompt.js` | AI prompt உருவாக்கிகள் |
| `src/auth.js` | Firebase idToken சரிபார்ப்பு |
| `src/ratelimit.js` | rate limiting |
| `src/pay.js` | Razorpay order + verify (premium-க்கு) |

### 📁 `public/`
| File | என்ன |
|------|------|
| `_headers` | Cloudflare Pages security headers |
| `manifest.json` | PWA manifest |
| `logo/`, `*.png`, `favicon.svg` | படங்கள் |

---

## 3. GitHub-லிருந்து Download செய்து கணினியில் Run செய்தல்

> **தேவை:** Node.js 18+ ( https://nodejs.org இலிருந்து install ), மற்றும் git.

### படி 1 — Code-ஐ பெறுதல்
GitHub-ல் **`A1-ONLINE-TET/jothida-nipunar`** repo-க்கு சென்று:
- **Code → Download ZIP** (அல்லது git தெரிந்தால்):
```bash
git clone https://github.com/A1-ONLINE-TET/jothida-nipunar.git
cd jothida-nipunar
git checkout claude/gifted-bell-30bulb
```
> ⚠️ சமீபத்திய எல்லா வேலையும் **`claude/gifted-bell-30bulb`** branch-ல் உள்ளது
> (இதுவே production branch). ZIP download செய்தால் branch-ஐ தேர்வு செய்யவும்.

### படி 2 — Client dependencies install
project folder-ல்:
```bash
npm install
```

### படி 3 — Environment variables (`.env` file)
project root-ல் **`.env`** என்ற file உருவாக்கி கீழ்கண்டவற்றைச் சேர்க்கவும்
(மதிப்புகள் Firebase console + Worker URL-லிருந்து):
```
VITE_API_URL=https://jothidarjothi.1982chandramathan.workers.dev
VITE_FIREBASE_API_KEY=உங்கள்_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=jothidar-d1c8c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=jothidar-d1c8c
VITE_FIREBASE_APP_ID=உங்கள்_firebase_app_id
```
> இந்த மதிப்புகள் Firebase Console → Project settings → "Your apps" → SDK config-ல் இருக்கும்.

### படி 4 — Local-ல் run (development)
```bash
npm run dev
```
→ browser-ல் **http://localhost:5173** திறக்கவும். மாற்றம் செய்தால் உடனே reload ஆகும்.

### படி 5 — Build சோதனை (deploy முன்)
```bash
npm run build
```
→ error இல்லாமல் `dist/` folder உருவாகும். பார்வையிட:
```bash
npm run preview     # http://localhost:4173
```

### படி 6 — (விருப்பம்) engine tests
```bash
npm test
```

---

## 4. Worker (server) local-ல் run / சோதனை

```bash
cd worker
npm install
npx wrangler deploy --dry-run    # build சரியா பார்க்க (deploy செய்யாது)
```
> Worker-ல் மாற்றம் செய்தால் `--dry-run` pass ஆக வேண்டும்.

---

## 5. Deploy எப்படி (LIVE website)

**எல்லாம் auto-deploy** — `claude/gifted-bell-30bulb` branch-க்கு **push**
செய்தால் போதும். தனி command தேவையில்லை.

```bash
git add .
git commit -m "உங்கள் மாற்ற விளக்கம்"
git push origin claude/gifted-bell-30bulb
```

push செய்த ~2 நிமிடத்தில் Cloudflare தானாகவே:
1. **Pages** (website) rebuild + deploy → https://jothida-nipunar.pages.dev
2. **Worker** (API) rebuild + deploy

### ⚙️ Cloudflare அமைப்பு (ஏற்கனவே செய்தது)
| பகுதி | Project பெயர் | URL | Branch |
|------|------|------|------|
| Website (Pages) | **`jothida-nipunar`** | jothida-nipunar.pages.dev | `claude/gifted-bell-30bulb` ✅ |
| API (Worker) | **`jothidarjothi`** | jothidarjothi.1982chandramathan.workers.dev | `claude/gifted-bell-30bulb` |

- Pages build: command `npm run build`, output `dist`
- Worker: root directory `worker`, `npx wrangler deploy`

> ⚠️ **முக்கியம்:** Pages-ன் **Production branch** `claude/gifted-bell-30bulb`
> ஆக இருக்க வேண்டும் (Cloudflare → jothida-nipunar → Settings → Branch control).
> இது `main` ஆக இருந்தால், இந்த branch-க்கு push production-ஐ update செய்யாது
> (preview மட்டுமே ஆகும்) — இதுதான் முன்பு "white screen fix தெரியவில்லை"
> பிரச்சனைக்கு காரணமாக இருந்தது.

### 🔑 Cloudflare Worker Secrets (Dashboard → jothidarjothi → Settings → Variables)
| Secret / Var | எதற்கு | நிலை |
|------|------|------|
| `GEMINI_API_KEY` | AI chat / பலன் (Gemini) | ✅ set (https://aistudio.google.com/apikey) |
| `AI_PROVIDER` | `gemini` அல்லது `claude` | ✅ `gemini` (wrangler.toml-ல்) |
| `FIREBASE_PROJECT_ID` | auth | ✅ set |
| `ALLOWED_ORIGINS` | CORS | ✅ set |
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | ₹49 premium | ⚠️ optional (இப்போது இல்லை) |

### 💰 Payment (இப்போது எல்லாம் FREE)
`src/App.jsx`-ல் `PAYMENTS_ENABLED = false` → எல்லா chat-ம் இலவசம்.
பணம் enable செய்ய வேண்டியபோது:
1. `src/App.jsx`-ல் `PAYMENTS_ENABLED = true`
2. Worker-ல் `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` secrets சேர்

---

## 6. ஜோதிடர் Chat எப்படி வேலை செய்கிறது (AI flow)

```
பயனர் கேள்வி
   ↓
1. classifyQuestion → எந்த தலைப்பு (திருமணம்/தொழில்/பணம்…)
2. ENGINE கணக்கீடு (buildAskAnswer) → verdict + காரணிகள் + காலம் + பரிகாரம்
3. இந்த findings → Gemini-க்கு prompt-ஆக அனுப்பு
4. Gemini → ஜோதிடர் போல இயல்பான தமிழ் பதில் (புதிய கணக்கு உருவாக்காது)
```
- **AI OFF** = rule-based உடனடி பதில் (`/api/ask`)
- **AI ON** = Gemini பதில் (`/api/ask-ai`)
- **⭐ ஆழமான AI பதில்** = விரிவான Gemini பதில் (`/api/ask-deep`, இலவசம்)

---

## 7. இந்த session-ல் சரிசெய்தவை (சுருக்கம்)

1. **Gemini API** worker-ல் சேர்த்தது (dual-provider: Claude + Gemini)
2. **ஆலோசனை tab** bottom nav-ல் சேர்த்தது
3. **Chat routes** (`/api/ask`, `/api/ask-ai`, `/api/ask-deep`, `/api/ask-premium`) சேர்த்தது
4. **Engine findings → Gemini** flow (engine கணக்கிடும், Gemini மொழியாக்கும்)
5. **Free mode** (`PAYMENTS_ENABLED=false`) — எல்லாம் இலவசம்
6. **White screen fix** — chat TypingText + answer string coercion + ErrorBoundary
7. **Deploy fix** — Pages production branch `main` → `claude/gifted-bell-30bulb`
8. **Answer shape fix** — worker `buildAskAnswer().answer` (object → string)

### ⏳ கடைசி நிலை (இந்த session முடியும்போது)
- White screen ✅ சரி (live)
- Engine நிஜ பதில் ✅ சரியாக வருகிறது
- கடைசி commit (`60463f1` — answer string fix) worker-ல் **deploy ஆகிக்கொண்டிருந்தது**.
  Worker redeploy ஆனபிறகு chat-ல் நிஜ ஜோதிட பதில் தெரியும்
  (அதுவரை "மன்னிக்கவும், பதிலளிக்க முடியவில்லை" வரலாம்).
  → சரிபார்க்க: hard-refresh செய்து chat-ல் ஒரு கேள்வி கேளுங்கள்.
  → இன்னும் வராவிட்டால்: Cloudflare → jothidarjothi → Deployments-ல் கடைசி
    commit (`60463f1`) "Ready" ஆகியுள்ளதா பாருங்கள்.

---

## 8. பொதுவான commands (quick reference)

```bash
# Client
npm install            # dependencies
npm run dev            # local dev (localhost:5173)
npm run build          # production build (dist/)
npm run preview        # built version பார்க்க (localhost:4173)
npm test               # engine tests

# Worker
cd worker && npm install
cd worker && npx wrangler deploy --dry-run   # build check

# Deploy (auto)
git add . && git commit -m "..." && git push origin claude/gifted-bell-30bulb

# பாதுகாப்பு சோதனை (engine browser-ல் leak ஆகவில்லை என உறுதி)
npm run build && grep -c "புனர்ப்பு" dist/assets/index-*.js   # → 0 ஆக இருக்க வேண்டும்
```

---

## 9. உதவி தேவைப்பட்டால்
- Architecture + deploy விவரம்: `CLAUDE.md`, `docs/SECURITY-DEPLOY.md`
- Cloudflare dashboard: https://dash.cloudflare.com → Workers & Pages
- Firebase: https://console.firebase.google.com (project `jothidar-d1c8c`)
- Gemini key: https://aistudio.google.com/apikey

நன்றி! 🙏
