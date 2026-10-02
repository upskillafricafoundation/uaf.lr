/* =========================================================
   UAF CAMPAIGN DRIVE — SERVICE WORKER (v30)
   Features auto-update, network-first strategy for app code,
   and instant cache invalidation so installed devices always
   receive the latest updates immediately.
   ========================================================= */

const CACHE_VERSION = "uaf-campaign-drive-v30";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./config.js",
  "./app.js",
  "./data.js",
  "./manifest.json",
  "./assets/hero-bg.jpg",
  "./assets/active-campaigns-hands-bg.svg",
  "./assets/uaf-logo.png",
  "./assets/nic-logo.png",
  "./assets/icon-impact.png",
  "./assets/icon-request.png",
  "./assets/icon-donate.webp",
  "./assets/icon-partners.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/favicon-16.png"
];

// Install: pre-cache app shell and immediately activate
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => console.warn("PWA pre-cache notice:", url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate: delete ALL old caches immediately and take control of all open clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Message listener for manual client-side commands
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
  if (event.data && event.data.action === "clearCache") {
    caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))));
  }
});

// Fetch: Network-First for core code & navigation, Cache-First for static media
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/admin") || url.pathname.includes("/api")) return;

  const isCodeOrDoc = req.mode === "navigate" ||
                      url.pathname.endsWith(".html") ||
                      url.pathname.endsWith(".js") ||
                      url.pathname.endsWith(".css") ||
                      url.pathname.endsWith(".json");

  if (isCodeOrDoc) {
    // Network-first strategy for rapid code updates
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            if (req.mode === "navigate") {
              return caches.match("./index.html").then((fb) => fb || caches.match("./"));
            }
            return cached;
          });
        })
    );
  } else {
    // Cache-first for images/assets with background refresh
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return res;
        }).catch(() => null);

        return cached || fetchPromise;
      })
    );
  }
});
