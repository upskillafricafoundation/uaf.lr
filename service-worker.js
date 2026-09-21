/* =========================================================
   UAF IMPACT — SERVICE WORKER (OFFLINE-FIRST ENGINE v9)
   Caches the complete app shell (markup, styles, scripts,
   icons, media assets) for full offline execution and auto-sync.
   ========================================================= */

const CACHE_VERSION = "uaf-impact-shell-v16";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./config.js",
  "./app.js",
  "./data.js",
  "./manifest.json",
  "./assets/hero-bg.jpg",
  "./assets/uaf-logo.png",
  "./assets/nic-logo.png",
  "./assets/icon-impact.jpg",
  "./assets/icon-request.png",
  "./assets/icon-donate.webp",
  "./assets/icon-partners.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/favicon-16.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/admin") || url.pathname.includes("/api")) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === "navigate") {
            return caches.match("./index.html").then((fallback) => fallback || caches.match("./"));
          }
          return cached;
        });
    })
  );
});
