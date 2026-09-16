# ☉ ஜோதிட நிபுணர் — Jothida Nipunar

Advanced Vedic Astrology App with AI Predictions

🔭 **Jean Meeus Astronomical Algorithms** — Sun ±0.01° | Moon ±0.5° | Proper Lahiri Ayanamsa  
🤖 **Claude AI** Powered Predictions in Tamil  
🔑 **FreeAstroAPI** Integration — Swiss Ephemeris (NASA JPL DE431)  
📱 **PWA** — Install on any phone like a native app

---

## 🚀 Quick Deploy — 3 Steps

### Step 1: GitHub-க்கு Push

```bash
# Clone or create repo
git init
git add .
git commit -m "🚀 Jothida Nipunar v1.0"

# GitHub-ல் new repo உருவாக்கு: jothida-nipunar
git remote add origin https://github.com/YOUR_USERNAME/jothida-nipunar.git
git branch -M main
git push -u origin main
```

### Step 2: Cloudflare Pages-ல் Deploy

1. **[dash.cloudflare.com](https://dash.cloudflare.com)** → Login
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. **GitHub account** connect செய்யுங்கள்
4. **jothida-nipunar** repo select செய்யுங்கள்
5. Build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. **Save and Deploy** — 2 நிமிடத்தில் live! ✅

### Step 3: Custom Domain (Optional)

- **Pages** → **Custom domains** → **Set up**
- `jothidanipunar.com` அல்லது subdomain add செய்யுங்கள்
- Cloudflare DNS automatically configure ஆகும்

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📁 Project Structure

```
jothida-nipunar/
├── index.html            # Entry HTML with Tamil fonts, PWA meta
├── package.json          # Vite + React dependencies
├── vite.config.js        # Build configuration
├── public/
│   ├── manifest.json     # PWA manifest (Add to Home Screen)
│   └── favicon.svg       # Golden sun favicon
├── src/
│   ├── main.jsx          # React entry point
│   └── App.jsx           # Full app — all 6 screens
└── horoscope_api.py      # Python backend (optional, for 100% accuracy)
```

---

## 🔑 FreeAstroAPI Setup (Optional — for NASA-level accuracy)

1. Visit [freeastroapi.com](https://www.freeastroapi.com)
2. Sign up (free, 10 seconds)
3. Copy API key
4. Paste in app's form → 🔑 API Key field
5. 80 requests/day free, permanent

Without API key, the app uses **Jean Meeus local engine** (~0.5° accuracy).

---

## 🐍 Python Backend (100% Swiss Ephemeris)

For absolute accuracy, run the Python backend:

```bash
pip install pyswisseph
python horoscope_api.py --port 8080
# → http://localhost:8080/api/horoscope?year=1981&month=1&day=29&hour=10&minute=51&lat=8.76&lon=78.13&tz=5.5
```

Deploy to **Google Cloud Run** or **Railway** for production backend.

---

## 📱 Android APK (Capacitor)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Jothida Nipunar" "com.jothida.nipunar"
npm run build
npx cap add android
npx cap copy
npx cap open android
# → Android Studio opens → Build → Generate Signed APK/AAB
```

---

## License

MIT © 2026 Jothida Nipunar
