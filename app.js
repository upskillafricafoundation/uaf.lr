/* =========================================================
   UAF IMPACT — APP SHELL
   PHASE 1: navigation, branding, PWA install, offline shell.
   PHASE 2+4: live public data layer (see data.js).
   PHASE 7: media carousel integration (see data.js/media.js).
   PHASE 8: funding & donation wiring (see data.js/donations.js).
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     CONFIG — county/year reference lists for the selectors.
  --------------------------------------------------------- */
  const COUNTIES = [
    "Montserrado", "Margibi", "Bong", "Nimba", "Grand Bassa"
  ];
  const YEARS = ["2026", "2027"];

  const APP_VERSION = "phase-8-consolidated";

  /* ---------------------------------------------------------
     ROUTER (home, works, report)
     Aliasing legacy routes:
       - impact / communities -> works
       - more -> home
       - support -> openDonateModal() on home
  --------------------------------------------------------- */
  const ROUTES = ["home", "works", "report"];

  function currentRoute() {
    const raw = (location.hash || "#/home").replace(/^#\/?/, "");
    if (raw === "impact" || raw === "communities") return "works";
    if (raw === "more") return "home";
    if (raw === "support") {
      setTimeout(openDonateModal, 50);
      return "home";
    }
    return ROUTES.includes(raw) ? raw : "home";
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

    document.getElementById("app-main")?.scrollTo?.({ top: 0 });
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", renderRoute);

  function goTo(route) {
    if (route === "support") {
      openDonateModal();
      return;
    }
    if (route === "impact" || route === "communities") {
      route = "works";
    } else if (route === "more") {
      route = "home";
    }
    location.hash = `#/${route}`;
  }
  window.__uafGoTo = goTo; // used by inline CTA buttons

  /* ---------------------------------------------------------
     DONATE POPUP MODAL (Fixed Scroll-Locked Dialog)
  --------------------------------------------------------- */
  function openDonateModal() {
    const backdrop = document.getElementById("donate-modal-backdrop");
    if (!backdrop) return;
    backdrop.classList.add("is-open");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");
  }

  function closeDonateModal() {
    const backdrop = document.getElementById("donate-modal-backdrop");
    if (!backdrop) return;
    backdrop.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
  }

  window.__uafOpenDonateModal = openDonateModal;
  window.__uafCloseDonateModal = closeDonateModal;

  function initDonateModal() {
    // Open buttons
    document.querySelectorAll("[data-action='donate']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openDonateModal();
      });
    });

    // Close button inside header
    const closeBtn = document.getElementById("donate-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeDonateModal);
    }

    // Click outside window to dismiss
    const backdrop = document.getElementById("donate-modal-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeDonateModal();
      });
    }

    // Escape key dismiss
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && backdrop?.classList.contains("is-open")) {
        closeDonateModal();
      }
    });
  }

  /* ---------------------------------------------------------
     USSD CODE COPY
  --------------------------------------------------------- */
  function initUssdCopy() {
    const btn = document.getElementById("ussd-copy-btn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const code = btn.dataset.code || "*156*3*0889541712#";
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(code);
        } else {
          const temp = document.createElement("textarea");
          temp.value = code;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          document.body.removeChild(temp);
        }
        const originalText = btn.textContent;
        btn.textContent = "✓ Copied!";
        showToast("USSD Code " + code + " copied to clipboard!");
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2500);
      } catch (err) {
        showToast("Dial " + code + " on your phone");
      }
    });
  }

  /* ---------------------------------------------------------
     DONATION AMOUNT CHIPS & DYNAMIC SUBMIT BUTTON
  --------------------------------------------------------- */
  const CURRENCY_CONFIG = {
    USD: {
      symbol: "$",
      label: "USD $",
      chips: [
        { label: "$5", amount: 5 },
        { label: "$10", amount: 10 },
        { label: "$25", amount: 25, defaultSelected: true },
        { label: "$50", amount: 50 },
        { label: "$100", amount: 100 },
        { label: "Custom", amount: "custom" }
      ]
    },
    LRD: {
      symbol: "L$",
      label: "LRD L$",
      chips: [
        { label: "L$1,000", amount: 1000 },
        { label: "L$2,500", amount: 2500 },
        { label: "L$5,000", amount: 5000, defaultSelected: true },
        { label: "L$10,000", amount: 10000 },
        { label: "L$20,000", amount: 20000 },
        { label: "Custom", amount: "custom" }
      ]
    }
  };

  let activeCurrency = "USD";

  function getSelectedAmount() {
    const customInput = document.getElementById("custom-amount");
    const activeChip = document.querySelector(".amount-chip--classic.is-selected, .amount-chip.is-selected");
    if (activeChip && activeChip.dataset.amount === "custom") {
      const val = Number(customInput?.value);
      return val > 0 ? val : 0;
    }
    if (activeChip) {
      return Number(activeChip.dataset.amount) || 0;
    }
    if (customInput && customInput.value) {
      return Number(customInput.value) || 0;
    }
    return 0;
  }

  function updateDonateButtonText() {
    const submitBtn = document.getElementById("don-submit-btn");
    if (!submitBtn) return;
    const amount = getSelectedAmount();
    const config = CURRENCY_CONFIG[activeCurrency] || CURRENCY_CONFIG.USD;
    const span = submitBtn.querySelector("span") || submitBtn;
    if (amount > 0) {
      const formatted = Number(amount).toLocaleString("en-US");
      span.textContent = `Donate ${config.symbol}${formatted} to UAF`;
    } else {
      span.textContent = "Donate to UAF";
    }
  }

  function renderAmountChips() {
    const grid = document.getElementById("amount-grid");
    if (!grid) return;
    const config = CURRENCY_CONFIG[activeCurrency] || CURRENCY_CONFIG.USD;
    const symbolLabel = document.getElementById("currency-symbol-label");
    if (symbolLabel) {
      symbolLabel.textContent = config.label;
    }

    grid.innerHTML = "";
    config.chips.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "amount-chip--classic" + (c.defaultSelected ? " is-selected" : "");
      btn.dataset.amount = String(c.amount);
      btn.textContent = c.label;
      btn.addEventListener("click", () => {
        grid.querySelectorAll(".amount-chip--classic, .amount-chip").forEach((x) => x.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        const customInput = document.getElementById("custom-amount");
        if (c.amount === "custom") {
          customInput?.removeAttribute("disabled");
          customInput?.focus();
        } else {
          if (customInput) {
            customInput.value = "";
            customInput.setAttribute("disabled", "true");
          }
        }
        updateDonateButtonText();
      });
      grid.appendChild(btn);
    });

    const customInput = document.getElementById("custom-amount");
    if (customInput) {
      customInput.value = "";
      customInput.setAttribute("disabled", "true");
    }
    updateDonateButtonText();
  }

  function initDonationControls() {
    // Currency buttons
    const currencyBtns = document.querySelectorAll(".currency-btn[data-currency]");
    currencyBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        currencyBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        activeCurrency = btn.dataset.currency || "USD";
        renderAmountChips();
      });
    });

    // Custom amount input
    const customInput = document.getElementById("custom-amount");
    if (customInput) {
      customInput.addEventListener("input", () => {
        const grid = document.getElementById("amount-grid");
        const customChip = grid?.querySelector('[data-amount="custom"]');
        if (customChip && !customChip.classList.contains("is-selected")) {
          grid.querySelectorAll(".amount-chip--classic, .amount-chip").forEach((x) => x.classList.remove("is-selected"));
          customChip.classList.add("is-selected");
        }
        updateDonateButtonText();
      });
    }

    // Frequency chips
    const freqChips = document.querySelectorAll(".frequency-chip[data-frequency]");
    freqChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        freqChips.forEach((c) => c.classList.remove("is-selected"));
        chip.classList.add("is-selected");
      });
    });

    renderAmountChips();
  }

  /* ---------------------------------------------------------
     COMMUNITY / YEAR SELECTOR (Home + Works)
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
  --------------------------------------------------------- */
  function initCarousel() {
    const track = document.querySelector(".carousel__track");
    const dotsWrap = document.querySelector(".carousel__controls");
    if (!track) return;

    const slides = track.querySelectorAll(".carousel__slide");
    if (slides.length <= 1) return;

    let index = 0;
    const dots = [];
    if (dotsWrap) dotsWrap.innerHTML = "";
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", `Show slide ${i + 1}`);
      dot.addEventListener("click", () => setSlide(i));
      dotsWrap?.appendChild(dot);
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

  window.__uafReinitCarousel = initCarousel;

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
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3800);
  }
  window.__uafShowToast = showToast;

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
     LEGAL / INFO SHEETS
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
    initDonateModal();
    initUssdCopy();
    initDonationControls();
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

    // data.js hooks in after the shell is ready.
    window.__uafDataInit && window.__uafDataInit();

    console.info("UAF Impact —", APP_VERSION);
  });
})();
