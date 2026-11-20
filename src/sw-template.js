// ஜோதிட நிபுணர் — service worker (built into /sw.js by vite.config.js).
// நோக்கம்: ஒருமுறை திறந்த பின் app இணையம் இல்லாமலும் திறக்க வேண்டும் (முகப்பு, பஞ்சாங்கம்,
// நாட்காட்டி போன்ற பொதுப் பகுதிகள் சாதனத்திலேயே கணக்கிடப்படுகின்றன). தனிப்பட்ட ஜாதகக்
// கணக்குகள் சேவையகத்தில் நடப்பதால் அவற்றுக்கு இணையம் தேவை — API அழைப்புகளை இது தொடுவதில்லை.
const VERSION = "__VERSION__";
const SHELL = "jn-shell-" + VERSION;
const FONTS = "jn-fonts-v1";
const PRECACHE = "__PRECACHE__";
// சேமித்த கோப்பு URL-ஆல் மட்டும் பொருத்தப்படும் (Vary தலைப்பால் தவறவிடக் கூடாது).
const MATCH = { ignoreVary: true };
const STATIC = [
  "/", "/manifest.json", "/favicon.svg", "/icon-192.png", "/icon-512.png",
  "/logo/compass.webp", "/logo/topper-text.webp", "/logo/logo-full.webp",
  "/logo/zodiac-ring.webp", "/logo/new-zodiac-wheel.webp", "/logo/new-topper-logo.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(PRECACHE);
    await Promise.allSettled(STATIC.map((u) => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("jn-shell-") && k !== SHELL).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, MATCH);
  const refresh = fetch(request).then((res) => {
    const html = res && res.type !== "opaque" && (res.headers.get("content-type") || "").includes("text/html");
    if (res && (res.ok || res.type === "opaque") && !html) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await refresh) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // பக்கம் திறப்பது: எப்போதும் இணையத்திலிருந்து (புதிய பதிப்பு உடனே வரும்); இணையம் இல்லையெனில் சேமித்த app.
    if (req.mode === "navigate") {
      event.respondWith((async () => {
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected && url.pathname === "/") {
            const cache = await caches.open(SHELL);
            cache.put("/", res.clone());
          }
          return res;
        } catch (_) {
          const cache = await caches.open(SHELL);
          return (await cache.match("/", MATCH)) || Response.error();
        }
      })());
      return;
    }
    // பெயரில் hash உள்ள கோப்புகள் மாறுவதில்லை: சேமிப்பிலிருந்து.
    if (url.pathname.startsWith("/assets/")) {
      event.respondWith((async () => {
        const cache = await caches.open(SHELL);
        const hit = await cache.match(req, MATCH);
        if (hit) return hit;
        const res = await fetch(req);
        // இல்லாத கோப்புக்கு hosting app-இன் HTML-ஐத் திருப்பும் — அதை JS/CSS ஆகச் சேமிக்கக் கூடாது.
        const type = res.headers.get("content-type") || "";
        if (res.ok && !type.includes("text/html")) cache.put(req, res.clone());
        return res;
      })());
      return;
    }
    if (/\.(webp|png|svg|json|ico)$/.test(url.pathname) && !url.pathname.startsWith("/.well-known/")) {
      event.respondWith(staleWhileRevalidate(SHELL, req));
    }
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(FONTS, req));
  }
  // மற்ற எல்லாம் (கணக்கீட்டுச் சேவையகம், Firebase) — நேரடியாக இணையத்துக்கு.
});
