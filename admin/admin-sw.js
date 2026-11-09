/* =========================================================
   UAF ADMIN — SERVICE WORKER (v28)
   Scope: this admin folder only (independent from the public app).
   - The app shell (pages, scripts, styles, icons) opens offline.
   - Admin DATA is never cached: only same-origin GET requests are
     handled, and every API call goes to Apps Script (another origin).
   - Network-first for code so new releases always win.
   ========================================================= */
const ADMIN_CACHE = "uaf-admin-v28";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./admin.css",
  "./config.js",
  "./manifest.webmanifest",
  "./assets/uaf-logo.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/favicon-16.png",
  "./admin-tools.js",
  "./team-common.js",
  "./admin.js",
  "./community.js",
  "./programs-hub.js",
  "./empowerment.js",
  "./donations.js",
  "./stories.js",
  "./partnerships.js",
  "./tasks.js",
  "./communications.js",
  "./accounts.js",
  "./recovery.js",
  "./pwa.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ADMIN_CACHE).then((cache) =>
      Promise.allSettled(SHELL.map((u) => cache.add(new Request(u, { cache: "reload" }))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("uaf-admin-") && k !== ADMIN_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") self.skipWaiting();
  if (event.data && event.data.action === "clearCache") {
    event.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API (Apps Script), CDN libraries, fonts: straight to network

  const isCode = req.mode === "navigate" || /\.(html|js|css|json|webmanifest)$/.test(url.pathname);
  if (isCode) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(ADMIN_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) =>
            hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined)
          )
        )
    );
    return;
  }

  // images / icons: cache first
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(ADMIN_CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
