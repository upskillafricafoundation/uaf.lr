/* =========================================================
   UAF IMPACT — SERVICE WORKER
   Caches only the public app shell (markup, styles, scripts,
   icons). Never cache admin routes or private API responses —
   Phase 4's public data fetch is explicitly excluded below via
   the /api path check, same rule Phase 1 set.
   ========================================================= */

const CACHE_VERSION = "uaf-impact-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./config.js",
  "./app.js",
  "./data.js",
  "./manifest.json",
  "./assets/uaf-logo.png",
  "./assets/nic-logo.png",
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

/* Rule: never intercept /admin or /api paths here in later phases,
   and never intercept requests to a different origin (the Apps
   Script API lives on script.google.com, not this origin) — the
   origin check below already excludes it, but the path check stays
   as defense in depth if the API is ever proxied same-origin. */
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
            return caches.match("./index.html");
          }
        });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
