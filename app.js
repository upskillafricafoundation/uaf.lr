/* =========================================================
   UAF IMPACT — APP SHELL
   PHASE 1: navigation, branding, PWA install, offline shell.
   No live data yet — Impact/Communities figures are wired to
   the public API in Phase 4. Everything data-shaped here is
   built so Phase 4 only has to swap fetchers, not markup.
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     CONFIG — placeholder reference lists only.
     Phase 4 replaces these with a call to the public API
     (Communities.gs) instead of hardcoding them here.
  --------------------------------------------------------- */
  const COUNTIES = [
    "Montserrado", "Margibi", "Bong", "Nimba", "Grand Bassa"
  ];
  const YEARS = ["2026", "2027"];

  const APP_VERSION = "phase-1";

  /* ---------------------------------------------------------
     ROUTER
  --------------------------------------------------------- */
  const ROUTES = ["home", "impact", "communities", "support", "more"];

  function currentRoute() {
    const hash = (location.hash || "#/home").replace("#/", "");
    return ROUTES.includes(hash) ? hash : "home";
  }

  function renderRoute() {
    const route = currentRoute();

    document.querySelectorAll(".screen").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.screen === route);
    });
    document.querySelectorAll(".bottom-nav__item").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.nav === route);
    });
    document.querySelectorAll(".nav-link").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.nav === route);
    });

    document.getElementById("app-main").scrollTo?.({ top: 0 });
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", renderRoute);

  function goTo(route) {
    location.hash = `#/${route}`;
  }
  window.__uafGoTo = goTo; // used by inline CTA buttons

  /* ---------------------------------------------------------
     COMMUNITY / YEAR SELECTOR (Home + Communities + Impact)
     Populates <select> elements marked with data-role.
  --------------------------------------------------------- */
  function populateSelect(select, items, placeholder) {
    if (!select) return;
    select.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = placeholder;
    select.appendChild(optAll);
    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      select.appendChild(opt);
    });
  }

  function initSelectors() {
    document.querySelectorAll('[data-role="county-select"]').forEach((el) =>
      populateSelect(el, COUNTIES, "All counties")
    );
    document.querySelectorAll('[data-role="year-select"]').forEach((el) =>
      populateSelect(el, YEARS, "All years")
    );
  }

  function handleSelectorChange() {
    const notice = document.getElementById("selector-notice");
    if (notice) {
      notice.classList.remove("is-hidden");
    }
  }

  /* ---------------------------------------------------------
     PHOTO CAROUSEL ("See the Impact")
     No approved photos yet — shown as a single explanatory
     slide. Phase 7 (Media.gs) will feed real approved photos
     into this same track/dot structure.
  --------------------------------------------------------- */
  function initCarousel() {
    const track = document.querySelector(".carousel__track");
    const dotsWrap = document.querySelector(".carousel__controls");
    if (!track) return;

    const slides = track.querySelectorAll(".carousel__slide");
    if (slides.length <= 1) return; // nothing to rotate

    let index = 0;
    const dots = [];
    dotsWrap.innerHTML = "";
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", `Show slide ${i + 1}`);
      dot.addEventListener("click", () => setSlide(i));
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    function setSlide(i) {
      index = i;
      track.style.transform = `translateX(-${i * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle("is-active", di === i));
    }

    let timer = setInterval(() => setSlide((index + 1) % slides.length), 5000);
    track.addEventListener("mouseenter", () => clearInterval(timer));
    track.addEventListener("mouseleave", () => {
      timer = setInterval(() => setSlide((index + 1) % slides.length), 5000);
    });
  }

  /* ---------------------------------------------------------
     DONATION AMOUNT CHIPS
  --------------------------------------------------------- */
  function initAmountChips() {
    const chips = document.querySelectorAll(".amount-chip[data-amount]");
    const customInput = document.getElementById("custom-amount");
    if (!chips.length) return;

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.remove("is-selected"));
        chip.classList.add("is-selected");
        if (chip.dataset.amount === "custom") {
          customInput?.removeAttribute("disabled");
          customInput?.focus();
        } else {
          if (customInput) {
            customInput.value = "";
            customInput.setAttribute("disabled", "true");
          }
        }
      });
    });
  }

  function initPaymentMethods() {
    const methods = document.querySelectorAll(".payment-method[data-method]");
    methods.forEach((m) => {
      m.addEventListener("click", () => {
        methods.forEach((x) => x.classList.remove("is-selected"));
        m.classList.add("is-selected");
      });
    });
  }

  /* ---------------------------------------------------------
     FORM STUBS
     Phase 1 = frontend only. No browser code may ever talk to
     Sheets/MTN directly (see project security rules), so these
     handlers simply confirm receipt in the UI. Phase 4 swaps
     the body of each submit handler for a fetch() to the
     Apps Script Web App endpoint.
  --------------------------------------------------------- */
  function initDonationForm() {
    const form = document.getElementById("donation-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Secure donations open soon — this form isn't connected to payment yet.");
    });
  }

  function initReportForm() {
    const form = document.getElementById("report-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Submission queue opens soon. Your report isn't sent yet.");
      form.reset();
    });
  }

  function initContactForm() {
    const form = document.getElementById("evidence-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Data & Evidence requests open soon — not sent yet.");
      form.reset();
    });
  }

  /* ---------------------------------------------------------
     TOAST
  --------------------------------------------------------- */
  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  /* ---------------------------------------------------------
     OFFLINE STATUS
  --------------------------------------------------------- */
  function updateOnlineStatus() {
    const banner = document.getElementById("status-banner");
    if (!banner) return;
    if (navigator.onLine) {
      banner.classList.remove("is-visible");
    } else {
      banner.querySelector("span").textContent =
        "Offline — showing previously cached information.";
      banner.classList.add("is-visible");
    }
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);

  /* ---------------------------------------------------------
     LAST UPDATED STAMPS
     Placeholder now; Phase 4 sets these from the API response
     timestamp rather than the client clock.
  --------------------------------------------------------- */
  function stampLastUpdated() {
    document.querySelectorAll("[data-last-updated]").forEach((el) => {
      el.textContent = "Last updated: not yet published";
    });
  }

  /* ---------------------------------------------------------
     PWA INSTALL PROMPT
  --------------------------------------------------------- */
  let deferredPrompt = null;
  function initInstall() {
    const installBtns = document.querySelectorAll("[data-action='install']");
    const sheet = document.getElementById("install-sheet");
    const sheetBackdrop = document.getElementById("install-sheet-backdrop");

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtns.forEach((btn) => btn.classList.remove("is-hidden"));
    });

    installBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!deferredPrompt) {
          openSheet(sheet, sheetBackdrop);
          return;
        }
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      });
    });

    window.addEventListener("appinstalled", () => {
      installBtns.forEach((btn) => btn.classList.add("is-hidden"));
      showToast("UAF Impact installed. Thank you.");
    });
  }

  function openSheet(sheet, backdrop) {
    if (!sheet || !backdrop) return;
    backdrop.classList.add("is-visible");
  }
  function closeSheets() {
    document.querySelectorAll(".sheet-backdrop").forEach((b) =>
      b.classList.remove("is-visible")
    );
  }
  function initSheets() {
    document.querySelectorAll("[data-action='close-sheet']").forEach((btn) =>
      btn.addEventListener("click", closeSheets)
    );
    document.querySelectorAll(".sheet-backdrop").forEach((backdrop) =>
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeSheets();
      })
    );
  }

  /* ---------------------------------------------------------
     MORE SCREEN — legal / info sheets
  --------------------------------------------------------- */
  function initInfoSheets() {
    const sheet = document.getElementById("info-sheet");
    const backdrop = document.getElementById("info-sheet-backdrop");
    const titleEl = document.getElementById("info-sheet-title");
    const bodyEl = document.getElementById("info-sheet-body");

    document.querySelectorAll("[data-info]").forEach((item) => {
      item.addEventListener("click", () => {
        const key = item.dataset.info;
        const content = INFO_CONTENT[key];
        if (!content) return;
        titleEl.textContent = content.title;
        bodyEl.innerHTML = content.body;
        backdrop.classList.add("is-visible");
      });
    });
  }

  const INFO_CONTENT = {
    privacy: {
      title: "Privacy Policy",
      body: `<p>UAF Impact collects only the information needed to operate the platform: donation contact details, community submissions, and evidence requests. Data about individual children is never published publicly — only approved, aggregated community-level figures appear on this app.</p>
      <p>Full privacy policy text will be published here before the platform leaves sandbox testing.</p>`
    },
    safeguarding: {
      title: "Child Safeguarding",
      body: `<p>UAF does not publish children's names, exact addresses, phone numbers, school records, or case histories. Any photograph involving a child is reviewed for consent and safeguarding risk before publication, and only appears once marked Approved.</p>
      <p>If you have a child safeguarding concern related to UAF's work, please contact us directly — see the Contact section.</p>`
    },
    dataprotection: {
      title: "Data Protection",
      body: `<p>Data & Evidence Requests, donation records, and out-of-school submissions are reviewed before anything is added to public statistics or shared further. UAF applies data minimization: only what a program genuinely needs is collected.</p>
      <p><em>"Transparency Without Compromising Child Privacy."</em></p>`
    },
    terms: {
      title: "Terms of Use",
      body: `<p>UAF Impact is provided by Upskill Africa Foundation to share verified, approved education-access information about its programs in Liberia. Statistics reflect only what UAF has verified — figures are never presented as official national data unless the methodology supports that claim.</p>
      <p>Full terms will be published here ahead of production launch.</p>`
    }
  };

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initSelectors();
    document.querySelectorAll('[data-role="county-select"], [data-role="year-select"]')
      .forEach((el) => el.addEventListener("change", handleSelectorChange));
    initCarousel();
    initAmountChips();
    initPaymentMethods();
    initDonationForm();
    initReportForm();
    initContactForm();
    initInstall();
    initSheets();
    initInfoSheets();
    updateOnlineStatus();
    stampLastUpdated();
    renderRoute();

    document.querySelectorAll("[data-goto]").forEach((el) =>
      el.addEventListener("click", () => goTo(el.dataset.goto))
    );

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        /* offline-first is best-effort; app still works without SW */
      });
    }

    console.info("UAF Impact —", APP_VERSION);
  });
})();
