/* =========================================================
   UAF CAMPAIGN DRIVE — SERVICE WORKER (v31)
   Features auto-update, network-first strategy for app code,
   and instant cache invalidation so installed devices always
   receive the latest updates immediately.
   ========================================================= */

const CACHE_VERSION = "uaf-campaign-drive-v31";
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
  "./assets/icon-donate.webp",
  "./assets/icon-request.png",
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
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old cache versions immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for dynamic scripts and HTML, cache-first for static icons/assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore cross-origin Google Sheets API or chrome-extension calls
  if (url.origin !== self.location.origin) {
    return;
  }

  // Admin portal is never cached offline
  if (url.pathname.includes("/admin/")) {
    return;
  }

  // Network-first for app code and pages
  if (
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css")
  ) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first for images and icons
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      });
    })
  );
});
