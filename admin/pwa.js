/* =========================================================
   UAF ADMIN — INSTALL & LINKS  (NEW FILE)
   - registers the admin's own service worker
   - "Install app" buttons (Chrome / Edge / Android) + iPhone hint
   - points every "Public Website" link at UAF_CONFIG.PUBLIC_URL
   ========================================================= */
(() => {
  "use strict";

  const cfg = window.UAF_CONFIG || {};

  /* ---- links back to the public site ---- */
  const publicUrl = cfg.PUBLIC_URL || "../index.html";
  document.querySelectorAll("[data-public-link]").forEach((a) => {
    a.setAttribute("href", publicUrl + "#/menu");
  });

  /* ---- service worker (scope = this admin folder) ---- */
  if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // first-ever install: no reload (do not interrupt sign-in). Real update: reload once.
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./admin-sw.js", { scope: "./" })
        .then((reg) => { try { reg.update(); } catch (_) {} })
        .catch(() => {});
    });
  }

  /* ---- install button ---- */
  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const buttons = () => Array.from(document.querySelectorAll(".js-install-admin"));
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  let deferred = null;

  function refresh() {
    const show = !!deferred && !isStandalone();
    buttons().forEach((b) => b.classList.toggle("is-hidden", !show));
    const hint = document.getElementById("ios-install-hint");
    if (hint) hint.classList.toggle("is-hidden", !(isIos && !isStandalone()));
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    refresh();
  });

  window.addEventListener("appinstalled", () => { deferred = null; refresh(); });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest && e.target.closest(".js-install-admin");
    if (!btn || !deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch (_) {}
    deferred = null;
    refresh();
  });

  refresh();
})();
