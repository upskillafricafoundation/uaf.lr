/* =========================================================
   UAF CAMPAIGN DRIVE — APP SHELL (Line-Art & Heroic UI)
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     CACHE BUSTING & INSTANT UPDATE PURGE
     Purges old caches on installed devices to ensure immediate updates
  --------------------------------------------------------- */
  const CURRENT_BUILD_VER = "2026-09-30-uaf-campaign-drive-v27";
  try {
    const savedBuild = localStorage.getItem("uaf_app_build_version");
    if (savedBuild !== CURRENT_BUILD_VER) {
      localStorage.setItem("uaf_app_build_version", CURRENT_BUILD_VER);
      // Clean legacy mock reaction cache
      const rxRaw = localStorage.getItem("uaf_story_reactions");
      if (rxRaw && (rxRaw.includes('"like":28') || rxRaw.includes('"like":12') || rxRaw.includes('"like":24'))) {
        localStorage.removeItem("uaf_story_reactions");
      }
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k));
        });
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let reg of registrations) {
            reg.update();
          }
        });
      }
    }
  } catch (_) {}

  /* ---------------------------------------------------------
     HTML ESCAPER (Safe sanitization)
  --------------------------------------------------------- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* ---------------------------------------------------------
     CONFIG & COUNTIES
  --------------------------------------------------------- */
  const COUNTIES = [
    "Montserrado", "Margibi", "Bong", "Nimba", "Grand Bassa"
  ];
  const YEARS = ["2026", "2027"];
  const APP_VERSION = "2.5.0-campaign-drive";

  /* ---------------------------------------------------------
     ROUTER (7 Distinct Screens)
     1. menu (Default Home / Grid of Line-Art Icons)
     2. donate (Campaigns & Stories with USSD auto-dialer)
     3. statistics (NIC Communities stats, 8-KPI blocks, Directory)
     4. impact-drive (Impact Overview, Programs & Interventions)
     5. request-data (Evidence & Data Request Form)
     6. submit-ossc (Out-of-School Children Field Intake Form)
     7. partners (UAF Partners & Collaborators Showcase)
  --------------------------------------------------------- */
  const ROUTES = [
    "menu",
    "donate",
    "statistics",
    "impact-drive",
    "request-data",
    "submit-ossc",
    "partners"
  ];

  function currentRoute() {
    const raw = (location.hash || "#/menu").replace(/^#\/?/, "").toLowerCase();
    if (!raw || raw === "home" || raw === "menu") return "menu";
    if (raw.startsWith("c/") || raw === "c") return "donate";
    if (raw === "support" || raw === "donate" || raw === "fundraising" || raw === "fundraise" || raw === "campaigns") return "donate";
    if (raw === "statistics" || raw === "stats") return "statistics";
    if (raw === "impact-drive" || raw === "impact" || raw === "communities" || raw === "works") return "impact-drive";
    if (raw === "request-data" || raw === "request" || raw === "evidence") return "request-data";
    if (raw === "submit-ossc" || raw === "identify-ossc" || raw === "report" || raw === "ossc") return "submit-ossc";
    if (raw === "partners" || raw === "partner" || raw === "collaborators") return "partners";

    return ROUTES.includes(raw) ? raw : "menu";
  }

  function renderRoute() {
    const route = currentRoute();

    document.querySelectorAll(".screen").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.screen === route);
    });

    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.nav === route);
    });

    // Toggle non-scrollable home screen mode
    document.body.classList.toggle("is-home-screen", route === "menu");

    // Scroll to top on route change
    const main = document.getElementById("app-main");
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", renderRoute);

  function goTo(route) {
    if (!route) route = "menu";
    const clean = route.replace(/^#\/?/, "");
    location.hash = `#/${clean}`;
  }
  window.__uafGoTo = goTo;

  // Universal global click delegation for all [data-goto] elements (menu cards, buttons, links)
  document.addEventListener("click", (e) => {
    const gotoEl = e.target.closest("[data-goto]");
    if (gotoEl) {
      e.preventDefault();
      const targetRoute = gotoEl.dataset.goto;
      if (targetRoute) goTo(targetRoute);
    }
  });

  /* ---------------------------------------------------------
     DONATION AMOUNT CHIPS & DYNAMIC SUBMIT BUTTON (Image 2 Style)
  --------------------------------------------------------- */
  const CURRENCY_CONFIG = {
    USD: {
      symbol: "$",
      label: "USD $",
      chips: [
        { label: "$1", amount: 1 },
        { label: "$5", amount: 5, defaultSelected: true },
        { label: "$10", amount: 10 },
        { label: "$25", amount: 25 },
        { label: "$50", amount: 50 },
        { label: "$100", amount: 100 },
        { label: "Custom", amount: "custom" }
      ]
    },
    LRD: {
      symbol: "L$",
      label: "LRD L$",
      chips: [
        { label: "L$100", amount: 100 },
        { label: "L$500", amount: 500, defaultSelected: true },
        { label: "L$1,000", amount: 1000 },
        { label: "L$2,500", amount: 2500 },
        { label: "L$5,000", amount: 5000 },
        { label: "L$10,000", amount: 10000 },
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

  /* ---------------------------------------------------------
     DONATION CONTROLS (Currency, Tabs, USSD Dial, Frequency)
  --------------------------------------------------------- */
  function initDonationControls() {
    // 1. Payment Tabs (Manual Active vs Automated Coming Soon)
    const tabAuto = document.getElementById("tab-auto-momo");
    if (tabAuto) {
      tabAuto.addEventListener("click", () => {
        showToast("This Feature Coming Soon. Please use manual transfer for now.");
      });
    }

    // 2. USSD Auto-Dialer Link
    const dialLink = document.getElementById("ussd-dial-link");
    if (dialLink) {
      dialLink.addEventListener("click", () => {
        const code = "*156*3*0889541712#";
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code);
          }
        } catch (e) {}
        showToast("Opening dial pad with " + code);
      });
    }

    // 3. Desktop USSD Copy Button
    const copyBtn = document.getElementById("ussd-copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const code = copyBtn.dataset.code || "*156*3*0889541712#";
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
          const original = copyBtn.textContent;
          copyBtn.textContent = "Copied!";
          showToast("USSD Code " + code + " copied to clipboard!");
          setTimeout(() => { copyBtn.textContent = original; }, 2500);
        } catch (err) {
          showToast("Dial " + code + " on your phone");
        }
      });
    }

    // 4. Currency Buttons
    const currencyBtns = document.querySelectorAll(".currency-btn[data-currency]");
    currencyBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        currencyBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        activeCurrency = btn.dataset.currency || "USD";
        renderAmountChips();
      });
    });

    // 5. Custom amount input
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

    // 6. Frequency chips
    const freqChips = document.querySelectorAll(".freq-chip[data-frequency], .frequency-chip[data-frequency]");
    freqChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        freqChips.forEach((c) => c.classList.remove("is-selected"));
        chip.classList.add("is-selected");
      });
    });

    // 7. Add Note toggle
    const noteCheckbox = document.getElementById("don-add-note");
    const noteContainer = document.getElementById("don-message-container");
    if (noteCheckbox && noteContainer) {
      noteCheckbox.addEventListener("change", () => {
        if (noteCheckbox.checked) {
          noteContainer.classList.remove("is-hidden");
          const textarea = document.getElementById("don-message");
          if (textarea) textarea.focus();
        } else {
          noteContainer.classList.add("is-hidden");
        }
      });
    }

    renderAmountChips();
  }

  /* ---------------------------------------------------------
     SEARCH DIALOG
  --------------------------------------------------------- */
  function initSearchDialog() {
    const trigger = document.getElementById("header-search-btn");
    const backdrop = document.getElementById("search-dialog-backdrop");
    const closeBtn = document.getElementById("search-dialog-close");
    const searchInput = document.getElementById("global-search-input");
    const resultsContainer = document.getElementById("search-results-container");

    if (!trigger || !backdrop) return;

    function openSearch() {
      backdrop.classList.remove("is-hidden");
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      renderSearchResults("");
    }

    function closeSearch() {
      backdrop.classList.add("is-hidden");
    }

    trigger.addEventListener("click", openSearch);
    closeBtn?.addEventListener("click", closeSearch);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeSearch();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !backdrop.classList.contains("is-hidden")) {
        closeSearch();
      }
    });

    const searchableItems = [
      { title: "Donate to UAF", type: "Page", route: "donate", desc: "Support children re-enrollment with MTN Mobile Money" },
      { title: "Communities Statistics", type: "Page", route: "statistics", desc: "View out-of-school counts, rates, and verified data" },
      { title: "Funding Gap", type: "Feature", route: "statistics", desc: "Transparent breakdown of verified funds vs community need" },
      { title: "Active Community Stories", type: "Feature", route: "statistics", desc: "Campaign priorities and student success stories" },
      { title: "Impact Drive Overview", type: "Page", route: "impact-drive", desc: "8 core field metrics across all target counties" },
      { title: "Community Data Directory", type: "Table", route: "impact-drive", desc: "Audit list of verified communities in Liberia" },
      { title: "UAF Programs", type: "Interventions", route: "impact-drive", desc: "No Invisible Child, Education Access, Safeguarding, ALP" },
      { title: "Request Data & Evidence", type: "Form", route: "request-data", desc: "Request research datasets and program evaluation records" },
      { title: "Submit Out-of-School Children", type: "Form", route: "submit-ossc", desc: "Report children needing school intake and support" },
      { title: "UAF Partners & Collaborators", type: "Page", route: "partners", desc: "Institutional partners, school alliances, child protection" },
      { title: "Admin Portal & Login", type: "Staff Console", route: "admin", desc: "Authorized staff login, role verification, and admin portal access" },
      { title: "Montserrado County", type: "County", route: "statistics", county: "Montserrado", desc: "West Point, Clara Town, Duala, Red Light, New Kru Town" },
      { title: "Margibi County", type: "County", route: "statistics", county: "Margibi", desc: "Kakata, Harbel, Unification Town" },
      { title: "Bong County", type: "County", route: "statistics", county: "Bong", desc: "Gbarnga, Totota, Suakoko" },
      { title: "Nimba County", type: "County", route: "statistics", county: "Nimba", desc: "Ganta, Sanniquellie, Karnplay" },
      { title: "Grand Bassa County", type: "County", route: "statistics", county: "Grand Bassa", desc: "Buchanan, Owensgrove" }
    ];

    function renderSearchResults(query) {
      if (!resultsContainer) return;
      const q = query.trim().toLowerCase();
      if (!q) {
        resultsContainer.innerHTML = `
          <div style="font-size:12.5px; color:var(--ink-400); margin-top:8px;">
            <p><strong>Quick Navigation:</strong></p>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
              <span class="search-tag" data-search-route="donate">Donate</span>
              <span class="search-tag" data-search-route="statistics">Statistics</span>
              <span class="search-tag" data-search-route="impact-drive">Impact Drive</span>
              <span class="search-tag" data-search-route="submit-ossc">Submit OSSC</span>
              <span class="search-tag" data-search-route="request-data">Request Data</span>
              <span class="search-tag" data-search-route="partners">Partners</span>
            </div>
          </div>
        `;
        wireQuickTags();
        return;
      }

      const matches = searchableItems.filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
        );
      });

      if (!matches.length) {
        resultsContainer.innerHTML = `<p style="padding:14px; text-align:center; color:var(--ink-400); font-size:13px;">No results found for "${query}".</p>`;
        return;
      }

      resultsContainer.innerHTML = matches.map((item) => `
        <div class="search-result-item" data-search-route="${item.route}" ${item.county ? `data-search-county="${item.county}"` : ""}>
          <div>
            <strong>${item.title}</strong>
            <p>${item.desc}</p>
          </div>
          <span class="search-result-type">${item.type}</span>
        </div>
      `).join("");

      wireQuickTags();
    }

    function wireQuickTags() {
      resultsContainer.querySelectorAll("[data-search-route]").forEach((el) => {
        el.addEventListener("click", () => {
          const route = el.dataset.searchRoute;
          const county = el.dataset.searchCounty;
          closeSearch();
          if (route === "admin" || route.startsWith("admin")) {
            window.location.href = "admin/index.html";
            return;
          }
          goTo(route);
          if (county) {
            setTimeout(() => {
              const countySelect = document.getElementById("stats-county");
              if (countySelect) {
                countySelect.value = county;
                countySelect.dispatchEvent(new Event("change"));
              }
            }, 100);
          }
        });
      });
    }

    searchInput?.addEventListener("input", (e) => {
      renderSearchResults(e.target.value);
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
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3800);
  }
  window.__uafShowToast = showToast;

  /* ---------------------------------------------------------
     STORY DETAIL MODAL & VIEW COUNTER TRACKING
  --------------------------------------------------------- */
  function getStoryViews() {
    try {
      const stored = localStorage.getItem("uaf_story_views");
      return stored ? JSON.parse(stored) : {};
    } catch (_) {
      return {};
    }
  }

  function updateStoryViewsDisplay() {
    const views = getStoryViews();
    document.querySelectorAll("[data-story-views]").forEach((el) => {
      const id = el.dataset.storyViews;
      const count = Number(views[id]) || 0;
      el.textContent = `${count} read${count === 1 ? "" : "s"}`;
    });
  }

  function incrementStoryView(storyId) {
    if (!storyId) return;
    try {
      // Prevent inflating reads on repeated clicks within the same user session
      const sessionKey = "uaf_read_sess_" + String(storyId).toLowerCase();
      if (sessionStorage.getItem(sessionKey)) {
        return;
      }
      sessionStorage.setItem(sessionKey, "1");
    } catch (_) {}

    const views = getStoryViews();
    views[storyId] = (Number(views[storyId]) || 0) + 1;
    try {
      localStorage.setItem("uaf_story_views", JSON.stringify(views));
    } catch (_) {}
    updateStoryViewsDisplay();
  }

  function initStoryModal() {
    const modal = document.getElementById("story-modal-backdrop");
    const closeBtn = document.getElementById("story-modal-close");
    const doneBtn = document.getElementById("story-modal-done-btn");
    const modalSupportBtn = document.getElementById("story-modal-support-btn");

    function closeModal() {
      if (modal) {
        modal.classList.add("is-hidden");
        modal.style.display = "none";
        delete modal.dataset.activeStoryId;
      }
      document.body.style.overflow = "";
      if (window.__uafStoryCarouselResume) {
        window.__uafStoryCarouselResume();
      }
    }

    if (modal) {
      modal.classList.add("is-hidden");
      modal.style.display = "none";
    }

    updateStoryViewsDisplay();

    closeBtn?.addEventListener("click", closeModal);
    doneBtn?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    modalSupportBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      const activeStoryId = modal?.dataset.activeStoryId;
      const story = activeStoryId && window.__uafGetStory ? window.__uafGetStory(activeStoryId) : null;
      const title = story ? story.title : (document.getElementById("story-modal-title")?.textContent || "Community Story");
      const category = story ? (story.category || story.tag) : "";
      tieDonationToStory(activeStoryId, title, category);
    });

    function formatUSD(num) {
      const n = Number(num) || 0;
      return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function openStoryDetailModal(storyId) {
      if (!modal) return;

      // Resilient story lookup: function, shareCode, or DOM fallback
      let story = null;
      if (typeof window.__uafGetStory === "function") {
        story = window.__uafGetStory(storyId);
      }
      if (!story && typeof window.__uafGetStoryByShareCode === "function") {
        story = window.__uafGetStoryByShareCode(storyId);
      }
      if (!story) {
        const cleanId = String(storyId || "").trim();
        const cardEl = document.querySelector(`.campaign-card[data-story-id="${cleanId}"], .campaign-card[data-share-code="${cleanId}"]`);
        if (cardEl) {
          const title = cardEl.querySelector(".campaign-card__title")?.textContent || "Community Story";
          const summary = cardEl.querySelector(".campaign-card__lead")?.textContent || "";
          const narrative = cardEl.querySelector(".campaign-card__desc")?.textContent || summary;
          const tag = cardEl.querySelector(".campaign-card__tag")?.textContent || "Community Story";
          const img = cardEl.querySelector(".campaign-card__img")?.src || "assets/uaf-logo.png";
          story = {
            id: cleanId,
            title,
            summary,
            narrative,
            tag,
            category: tag,
            imageUrl: img,
            testimonial: summary,
            speaker: "Beneficiary Story",
            activities: "Community verification, tuition waiver sponsorship, and learning kit distribution.",
            amountRaised: 0,
            fundingGoal: 0
          };
        }
      }
      if (!story) return;

      modal.dataset.activeStoryId = story.id || storyId;
      if (window.__uafStoryCarouselPause) {
        window.__uafStoryCarouselPause();
      }

      // Track and increment view count once per unique reader session
      incrementStoryView(story.id || storyId);

      const tagEl = document.getElementById("story-modal-tag");
      const locEl = document.getElementById("story-modal-location");
      const titleEl = document.getElementById("story-modal-title");
      const quoteEl = document.getElementById("story-modal-quote");
      const authorEl = document.getElementById("story-modal-author");
      const actEl = document.getElementById("story-modal-activities");
      const narEl = document.getElementById("story-modal-narrative");
      const imgEl = document.getElementById("story-modal-img");
      const imgWrap = document.getElementById("story-modal-img-wrap");
      const fundingWrap = document.getElementById("story-modal-funding-wrap");
      const raisedEl = document.getElementById("story-modal-raised-val");
      const goalEl = document.getElementById("story-modal-goal-val");
      const fillEl = document.getElementById("story-modal-funding-fill");

      if (tagEl) tagEl.textContent = story.tag || story.category || "Community Story";
      if (locEl) locEl.textContent = `${story.community ? story.community + " · " : ""}${story.county || "Liberia"}`;
      if (titleEl) titleEl.textContent = story.title || "";

      // Story image
      if (imgEl && imgWrap) {
        if (story.imageUrl) {
          imgEl.src = story.imageUrl;
          imgWrap.style.display = "block";
        } else {
          imgWrap.style.display = "none";
        }
      }

      // Amount raised & target progress bar
      if (fundingWrap) {
        const raised = Number(story.amountRaised || 0);
        const goal = Number(story.fundingGoal || 0);
        if (raised > 0 || goal > 0) {
          fundingWrap.style.display = "block";
          if (raisedEl) raisedEl.textContent = formatUSD(raised) + " raised";
          if (goalEl) goalEl.textContent = goal > 0 ? "of " + formatUSD(goal) + " target" : "";
          if (fillEl) {
            const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 100;
            fillEl.style.width = pct + "%";
          }
        } else {
          fundingWrap.style.display = "none";
        }
      }

      if (quoteEl) quoteEl.textContent = story.testimonial || "";
      if (authorEl) authorEl.textContent = `— ${story.speaker || "Beneficiary Story"}`;
      if (actEl) actEl.textContent = story.activities || "Field verification, tuition sponsorship, and learning kits distribution.";
      if (narEl) narEl.textContent = story.narrative || story.summary || "";

      // Render reactions bar (Like, Heart, Celebrate)
      const reactionsBar = document.getElementById("story-modal-reactions-bar");
      if (reactionsBar) {
        const reactions = window.__uafGetStoryReactions ? window.__uafGetStoryReactions(story.id || storyId) : { counts: { like: 0, heart: 0, celebrate: 0 }, voted: {} };
        const counts = reactions.counts || {};
        const voted = reactions.voted || {};

        reactionsBar.innerHTML = `
          <div class="story-reactions-bar" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 0;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;margin:14px 0;">
            <button type="button" class="btn-story-reaction ${voted.like ? 'is-reacted is-active' : ''}" data-reaction="like" data-reaction-type="like" data-story-id="${story.id || storyId}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;border:1px solid #e2e8f0;background:${voted.like ? '#e0f2fe' : '#ffffff'};color:${voted.like ? '#0369a1' : '#334155'};font-size:12.5px;font-weight:600;cursor:pointer;">
              <span>👍 Like</span>
              <span class="reaction-count" style="font-size:11.5px;font-weight:700;background:rgba(0,0,0,0.06);padding:1px 6px;border-radius:999px;">${counts.like || 0}</span>
            </button>
            <button type="button" class="btn-story-reaction ${voted.heart ? 'is-reacted is-active' : ''}" data-reaction="heart" data-reaction-type="heart" data-story-id="${story.id || storyId}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;border:1px solid #e2e8f0;background:${voted.heart ? '#ffe4e6' : '#ffffff'};color:${voted.heart ? '#e11d48' : '#334155'};font-size:12.5px;font-weight:600;cursor:pointer;">
              <span>❤️ Love</span>
              <span class="reaction-count" style="font-size:11.5px;font-weight:700;background:rgba(0,0,0,0.06);padding:1px 6px;border-radius:999px;">${counts.heart || 0}</span>
            </button>
            <button type="button" class="btn-story-reaction ${voted.celebrate ? 'is-reacted is-active' : ''}" data-reaction="celebrate" data-reaction-type="celebrate" data-story-id="${story.id || storyId}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;border:1px solid #e2e8f0;background:${voted.celebrate ? '#fef3c7' : '#ffffff'};color:${voted.celebrate ? '#b45309' : '#334155'};font-size:12.5px;font-weight:600;cursor:pointer;">
              <span>🎉 Celebrate</span>
              <span class="reaction-count" style="font-size:11.5px;font-weight:700;background:rgba(0,0,0,0.06);padding:1px 6px;border-radius:999px;">${counts.celebrate || 0}</span>
            </button>
          </div>
        `;
      }

      // Render social share buttons with unique opaque short link
      const shareBar = document.getElementById("story-modal-share-bar");
      if (shareBar) {
        const shareCode = story.shareCode || (story.id ? story.id.replace("story_", "") : storyId);
        const storyShortUrl = `${window.location.origin}${window.location.pathname}#/c/${shareCode}`;
        const shareText = `Read "${story.title}" on UAF Campaign Drive. Support verified education & empowerment in Liberia:`;

        shareBar.innerHTML = `
          <div class="story-social-share-row" style="margin:12px 0 16px;">
            <div style="font-size:11.5px;font-weight:700;color:var(--ink-700);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <span>Share this Story:</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + storyShortUrl)}" target="_blank" rel="noopener noreferrer" class="btn-share-social btn-share-whatsapp" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:6px;background:#25D366;color:#ffffff;text-decoration:none;font-size:11.5px;font-weight:700;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.35C9.36 7.35 9.09 7.41 8.86 7.66C8.63 7.91 7.99 8.51 7.99 9.73C7.99 10.95 8.88 12.13 9 12.3C9.13 12.47 10.73 14.95 13.2 16C13.78 16.26 14.24 16.41 14.59 16.53C15.19 16.71 15.73 16.69 16.16 16.63C16.64 16.55 17.65 16.01 17.86 15.42C18.07 14.83 18.07 14.32 18.01 14.22C17.95 14.12 17.78 14.06 17.52 13.93C17.26 13.81 15.99 13.18 15.75 13.1C15.52 13.01 15.35 12.97 15.18 13.22C15.01 13.48 14.53 14.06 14.38 14.22C14.23 14.4 14.09 14.42 13.83 14.29C13.57 14.16 12.74 13.89 11.75 13C10.98 12.32 10.46 11.47 10.31 11.22C10.16 10.97 10.29 10.83 10.42 10.7C10.54 10.58 10.68 10.4 10.82 10.24C10.95 10.07 11 9.95 11.09 9.78C11.17 9.61 11.13 9.46 11.07 9.33C11.01 9.21 10.53 8.03 10.33 7.55C10.14 7.08 9.94 7.15 9.78 7.14C9.64 7.14 9.48 7.35 9.53 7.35Z"/></svg>
                <span>WhatsApp</span>
              </a>
              <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storyShortUrl)}" target="_blank" rel="noopener noreferrer" class="btn-share-social btn-share-facebook" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:6px;background:#1877F2;color:#ffffff;text-decoration:none;font-size:11.5px;font-weight:700;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
                <span>Facebook</span>
              </a>
              <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(storyShortUrl)}" target="_blank" rel="noopener noreferrer" class="btn-share-social btn-share-linkedin" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:6px;background:#0A66C2;color:#ffffff;text-decoration:none;font-size:11.5px;font-weight:700;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
                <span>LinkedIn</span>
              </a>
              <button type="button" class="btn-share-social btn-share-copylink" data-copy-url="${storyShortUrl}" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:6px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;font-size:11.5px;font-weight:700;cursor:pointer;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        `;
      }

      // Render comments list with safe try-catch
      try {
        renderModalCommentsList(story.id || storyId);
      } catch (cErr) {
        console.warn("Comments rendering notice:", cErr);
      }

      modal.classList.remove("is-hidden");
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }

    function renderModalCommentsList(storyId) {
      const listEl = document.getElementById("story-modal-comments-list");
      const countEl = document.getElementById("story-modal-comments-count");
      if (!listEl) return;

      const comments = window.__uafGetStoryComments ? window.__uafGetStoryComments(storyId, false) : [];
      if (countEl) {
        countEl.textContent = `${comments.length} comment${comments.length === 1 ? '' : 's'}`;
      }

      if (comments.length === 0) {
        listEl.innerHTML = `<div style="font-size:12px;color:var(--ink-500);font-style:italic;padding:8px 0;">No public comments yet. Be the first supporter to leave a note!</div>`;
        return;
      }

      listEl.innerHTML = comments.map((c) => `
        <div class="story-comment-item">
          <div class="story-comment-meta">
            <span class="story-comment-author">${escapeHtml(c.author || "Supporter")}</span>
            <span class="story-comment-time">${escapeHtml(new Date(c.timestamp).toLocaleDateString())}</span>
          </div>
          <div class="story-comment-body">${escapeHtml(c.text)}</div>
        </div>
      `).join("");
    }

    // Story comment form handler
    const commentForm = document.getElementById("story-modal-comment-form");
    if (commentForm && !commentForm.dataset.bound) {
      commentForm.dataset.bound = "true";
      commentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const activeStoryId = modal?.dataset.activeStoryId;
        if (!activeStoryId) return;

        const authorInput = document.getElementById("story-comment-author");
        const privateCheck = document.getElementById("story-comment-private");
        const textInput = document.getElementById("story-comment-text");

        const author = authorInput?.value.trim() || "Anonymous Supporter";
        const isPrivate = privateCheck?.checked || false;
        const text = textInput?.value.trim() || "";

        if (!text) return;

        if (window.__uafAddStoryComment) {
          window.__uafAddStoryComment(activeStoryId, author, text, isPrivate);
        }

        if (isPrivate) {
          showToast("Thank you! Your note was sent privately to UAF Admins.");
        } else {
          showToast("Comment posted successfully! Thank you for your support.");
        }

        if (textInput) textInput.value = "";
        renderModalCommentsList(activeStoryId);
      });
    }

    window.__uafOpenStoryDetailModal = openStoryDetailModal;

    // Event delegation on document to handle Read More & View Full Case
    document.addEventListener("click", (e) => {
      // 1. Explicit Read More & View Full Case click
      const readMoreBtn = e.target.closest(".btn-story-readmore-link, .btn-read-story-trigger");
      if (readMoreBtn) {
        e.preventDefault();
        e.stopPropagation();
        const storyId = readMoreBtn.dataset.storyId || readMoreBtn.closest("[data-story-id]")?.dataset.storyId;
        if (storyId) {
          openStoryDetailModal(storyId);
        }
        return;
      }

      // 2. Card background click (excluding interactive buttons, views badge, controls, and links)
      if (e.target.closest(".btn-story-support-trigger, .btn-story-donate, .btn-campaign-donate, .btn-story-share-dots, .btn-story-reaction, .btn-share-social, .btn-share-copylink, .campaign-card__views-badge, .stories-carousel-header-bar, .btn-carousel-arrow, a, button")) {
        return;
      }
      const card = e.target.closest(".campaign-card[data-story-id]");
      if (card) {
        const storyId = card.dataset.storyId;
        if (storyId) {
          e.stopPropagation();
          openStoryDetailModal(storyId);
        }
      }
    });

    // 3-dots Story Share Link Handler & Clipboard Fallback
    function fallbackCopyText(text) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        showToast("Story link copied to clipboard!");
      } catch (err) {
        window.prompt("Copy story link:", text);
      }
      document.body.removeChild(ta);
    }

    // Universal Reaction, Copy Link, and 3-Dots Share Click Delegation
    document.addEventListener("click", (e) => {
      // Reaction click
      const rxBtn = e.target.closest(".btn-story-reaction");
      if (rxBtn) {
        e.preventDefault();
        e.stopPropagation();
        const storyId = rxBtn.dataset.storyId;
        const type = rxBtn.dataset.reactionType || rxBtn.dataset.reaction;
        if (!storyId || !type) return;

        if (window.__uafToggleStoryReaction) {
          const res = window.__uafToggleStoryReaction(storyId, type);
          if (res) {
            // Update all matching reaction buttons across both cards and open story modal
            document.querySelectorAll(`.btn-story-reaction[data-story-id="${storyId}"]`).forEach((b) => {
              const bType = b.dataset.reactionType || b.dataset.reaction;
              if (bType && res.counts && res.counts[bType] != null) {
                const cnt = b.querySelector(".reaction-count");
                if (cnt) cnt.textContent = res.counts[bType];
                const isVoted = !!(res.voted && res.voted[bType]);
                b.classList.toggle("is-reacted", isVoted);
                b.classList.toggle("is-active", isVoted);
                if (bType === "like") b.style.background = isVoted ? "#e0f2fe" : "#ffffff";
                if (bType === "heart") b.style.background = isVoted ? "#ffe4e6" : "#ffffff";
                if (bType === "celebrate") b.style.background = isVoted ? "#fef3c7" : "#ffffff";
              }
            });
          }
        }
        return;
      }

      // Copy Link Button (on card or in modal)
      const copyBtn = e.target.closest("[data-copy-url], .btn-share-copylink");
      if (copyBtn) {
        e.preventDefault();
        e.stopPropagation();
        let url = copyBtn.dataset.copyUrl || copyBtn.dataset.shareUrl;
        if (!url) {
          const shareCode = copyBtn.dataset.shareCode || copyBtn.dataset.storyId;
          if (shareCode) {
            url = `${window.location.origin}${window.location.pathname}#/c/${encodeURIComponent(shareCode)}`;
          }
        }
        if (url) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
              showToast("Story link copied to clipboard!");
            }).catch(() => fallbackCopyText(url));
          } else {
            fallbackCopyText(url);
          }
        }
        return;
      }

      // 3-dots Share Icon on Story Image
      const shareBtn = e.target.closest(".btn-story-share-dots");
      if (shareBtn) {
        e.stopPropagation();
        e.preventDefault();
        const storyId = shareBtn.dataset.shareStoryId || shareBtn.dataset.storyId;
        const story = storyId && window.__uafGetStory ? window.__uafGetStory(storyId) : null;
        const shareCode = shareBtn.dataset.shareCode || story?.shareCode || (storyId ? storyId.replace("story_", "") : "");
        const shareUrl = `${window.location.origin}${window.location.pathname}#/c/${encodeURIComponent(shareCode)}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            showToast("Story link copied to clipboard!");
          }).catch(() => fallbackCopyText(shareUrl));
        } else {
          fallbackCopyText(shareUrl);
        }
        return;
      }
    });

    // Deep link support: auto-open story detail modal when #/c/<code> or #/donate?story=... is visited
    function handleStoryDeepLink() {
      const hash = window.location.hash || "";

      // 1. Opaque short link: #/c/x7k9p2 or #c/x7k9p2
      const codeMatch = hash.match(/#\/?c\/([a-zA-Z0-9_-]+)/i);
      if (codeMatch && codeMatch[1]) {
        const shareCode = codeMatch[1];
        const story = window.__uafGetStoryByShareCode ? window.__uafGetStoryByShareCode(shareCode) : null;
        const targetId = story ? story.id : shareCode;
        goTo("donate");
        setTimeout(() => {
          if (typeof window.__uafOpenStoryDetailModal === "function") {
            window.__uafOpenStoryDetailModal(targetId);
          }
        }, 300);
        return;
      }

      // 2. Query param: #/donate?story=...
      const match = hash.match(/[?&]story=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const storyId = match[1];
        goTo("donate");
        setTimeout(() => {
          if (typeof window.__uafOpenStoryDetailModal === "function") {
            window.__uafOpenStoryDetailModal(storyId);
          }
        }, 300);
      }
    }
    window.addEventListener("hashchange", handleStoryDeepLink);
    setTimeout(handleStoryDeepLink, 350);
  }

  /* ---------------------------------------------------------
     COLLAPSIBLE DONATE FORM TOGGLE (In Fundraising Tab)
     Starts smoothly from the very first field (Currency & Amount)
  --------------------------------------------------------- */
  function openDonationForm(impactArea) {
    goTo("donate");
    const formWrapper = document.getElementById("donation-form-wrapper");
    const toggleBtn = document.getElementById("btn-toggle-donate-form");
    const textSpan = document.getElementById("btn-donate-toggle-text");

    if (formWrapper) {
      formWrapper.style.display = "block";
    }
    if (toggleBtn) {
      toggleBtn.classList.add("is-open");
      toggleBtn.setAttribute("aria-expanded", "true");
    }
    if (textSpan) {
      textSpan.textContent = "Close Donation Form";
    }

    if (impactArea) {
      const impactAreaSelect = document.getElementById("don-impact-area");
      if (impactAreaSelect) {
        for (let i = 0; i < impactAreaSelect.options.length; i++) {
          if (impactAreaSelect.options[i].text.toLowerCase().includes(impactArea.toLowerCase()) || impactAreaSelect.options[i].value.toLowerCase().includes(impactArea.toLowerCase())) {
            impactAreaSelect.selectedIndex = i;
            break;
          }
        }
      }
    }

    setTimeout(() => {
      if (formWrapper) {
        const yOffset = -75; // Header offset so Select Currency & Amount chips start at the top
        const y = formWrapper.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    }, 100);
  }
  window.__uafOpenDonationForm = openDonationForm;

  function toggleDonationForm() {
    const formWrapper = document.getElementById("donation-form-wrapper");
    const toggleBtn = document.getElementById("btn-toggle-donate-form");
    const textSpan = document.getElementById("btn-donate-toggle-text");
    if (!formWrapper) return;

    const isHidden = formWrapper.style.display === "none" || !formWrapper.style.display;
    if (isHidden) {
      formWrapper.style.display = "block";
      if (toggleBtn) {
        toggleBtn.classList.add("is-open");
        toggleBtn.setAttribute("aria-expanded", "true");
      }
      if (textSpan) textSpan.textContent = "Close Donation Form";
      const yOffset = -75;
      const y = formWrapper.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    } else {
      formWrapper.style.display = "none";
      if (toggleBtn) {
        toggleBtn.classList.remove("is-open");
        toggleBtn.setAttribute("aria-expanded", "false");
      }
      if (textSpan) textSpan.textContent = "Donate Now";
    }
  }
  window.__uafToggleDonationForm = toggleDonationForm;

  function initDonateToggle() {
    const toggleBtn = document.getElementById("btn-toggle-donate-form");
    if (toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.preventDefault();
        toggleDonationForm();
      };
    }

    const headerDonateBtn = document.querySelector(".btn-header-donate");
    if (headerDonateBtn) {
      headerDonateBtn.onclick = (e) => {
        e.preventDefault();
        openDonationForm();
      };
    }
  }

  /* ---------------------------------------------------------
     TIE DONATION TO STORY
     Connects donation directly to a specific community story / child
  --------------------------------------------------------- */
  function tieDonationToStory(storyId, storyTitle, storyCategory) {
    // 1. Close detail modal if open
    const modal = document.getElementById("story-modal-backdrop");
    if (modal) {
      modal.classList.add("is-hidden");
      modal.style.display = "none";
      delete modal.dataset.activeStoryId;
      if (window.__uafStoryCarouselResume) window.__uafStoryCarouselResume();
    }

    // 2. Set Dedication Banner & Hidden Inputs
    const alertEl = document.getElementById("don-story-tied-alert");
    const titleEl = document.getElementById("don-story-tied-title");
    const idInput = document.getElementById("don-dedicated-story-id");
    const titleInput = document.getElementById("don-dedicated-story-title");

    const cleanTitle = storyTitle || "Verified Child Story";

    if (alertEl) alertEl.classList.remove("is-hidden");
    if (titleEl) titleEl.textContent = cleanTitle;
    if (idInput) idInput.value = storyId || "";
    if (titleInput) titleInput.value = cleanTitle;

    // 3. Prepopulate dedication note
    const noteCheckbox = document.getElementById("don-add-note");
    const noteContainer = document.getElementById("don-message-container");
    const messageInput = document.getElementById("don-message");
    if (noteCheckbox && noteContainer && messageInput) {
      noteCheckbox.checked = true;
      noteContainer.classList.remove("is-hidden");
      if (!messageInput.value.trim() || messageInput.value.startsWith("Dedicated gift supporting:")) {
        messageInput.value = `Dedicated gift supporting: ${cleanTitle}`;
      }
    }

    // 4. Map and pre-select Impact Area
    let impactTarget = "Education Access";
    const catLower = (storyCategory || cleanTitle).toLowerCase();
    if (catLower.includes("invisible") || catLower.includes("nic")) {
      impactTarget = "No Invisible Child";
    } else if (catLower.includes("women") || catLower.includes("livelihood") || catLower.includes("soap")) {
      impactTarget = "Women & Youth Livelihoods";
    } else if (catLower.includes("alp") || catLower.includes("digital") || catLower.includes("computer")) {
      impactTarget = "Alternative Learning";
    } else if (catLower.includes("education") || catLower.includes("tuition") || catLower.includes("school")) {
      impactTarget = "Education Access";
    }

    // 5. Expand donation form & scroll smoothly
    openDonationForm(impactTarget);
    showToast(`Donation tied to: ${cleanTitle}`);
  }
  window.__uafTieDonationToStory = tieDonationToStory;

  function clearStoryDonationTie() {
    const alertEl = document.getElementById("don-story-tied-alert");
    const idInput = document.getElementById("don-dedicated-story-id");
    const titleInput = document.getElementById("don-dedicated-story-title");
    const messageInput = document.getElementById("don-message");

    if (alertEl) alertEl.classList.add("is-hidden");
    if (idInput) idInput.value = "";
    if (titleInput) titleInput.value = "";

    if (messageInput && messageInput.value.startsWith("Dedicated gift supporting:")) {
      messageInput.value = "";
    }

    const impactAreaSelect = document.getElementById("don-impact-area");
    if (impactAreaSelect) impactAreaSelect.value = "General Support";

    showToast("Donation updated to General Support — Area of Greatest Need");
  }
  window.__uafClearStoryDonationTie = clearStoryDonationTie;

  /* ---------------------------------------------------------
     30-SECOND SIDE-BY-SIDE STORY CAROUSEL & AUTO-SCROLLER
     - 2 cards visible on desktop/tablet, 1 on mobile
     - Auto-advances every 30 seconds
     - Pauses on mouse hover, mobile touch/hold, or full story modal
     - Resumes seamlessly when released or modal closed
  --------------------------------------------------------- */
  function initStoryCarousel() {
    const viewport = document.getElementById("stories-carousel-viewport");
    const track = document.getElementById("fundraising-stories-grid");
    const statusText = document.getElementById("carousel-status-text");
    const pulseDot = document.getElementById("carousel-pulse-dot");
    const progressFill = document.getElementById("carousel-progress-fill");
    const prevBtn = document.getElementById("carousel-prev-btn");
    const nextBtn = document.getElementById("carousel-next-btn");
    const dotsContainer = document.getElementById("carousel-dots-container");

    if (!viewport || !track) return;

    let currentIndex = 0;
    let isUserHolding = false;
    let isModalOpen = false;
    let elapsedMs = 0;
    const DURATION_MS = 15000; // 15 seconds
    const TICK_MS = 100;

    function getCards() {
      return Array.from(track.querySelectorAll(".campaign-card"));
    }

    function getCardsPerView() {
      return 1;
    }

    function updateCarouselPosition() {
      const cards = getCards();
      const total = cards.length;
      if (total === 0) return;

      if (currentIndex >= total) currentIndex = 0;
      if (currentIndex < 0) currentIndex = Math.max(0, total - 1);

      const targetCard = cards[currentIndex];
      const offset = targetCard ? targetCard.offsetLeft : 0;
      track.style.transform = `translateX(-${offset}px)`;

      const isPaused = isUserHolding || isModalOpen;
      if (statusText) {
        statusText.textContent = `Story ${currentIndex + 1} of ${total}${isPaused ? " (Paused)" : ""}`;
      }
      if (pulseDot) {
        pulseDot.classList.toggle("is-paused", isPaused);
      }

      if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll(".stories-carousel-dot");
        dots.forEach((d, i) => {
          d.classList.toggle("is-active", i === currentIndex);
        });
      }
    }

    function renderDots() {
      if (!dotsContainer) return;
      const cards = getCards();
      dotsContainer.innerHTML = "";
      cards.forEach((_, idx) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "stories-carousel-dot" + (idx === currentIndex ? " is-active" : "");
        dot.setAttribute("aria-label", `Go to story ${idx + 1}`);
        dot.addEventListener("click", () => {
          currentIndex = idx;
          elapsedMs = 0;
          if (progressFill) progressFill.style.width = "0%";
          updateCarouselPosition();
        });
        dotsContainer.appendChild(dot);
      });
    }

    function nextStory() {
      const cards = getCards();
      const total = cards.length;
      if (total <= 1) return;
      currentIndex = (currentIndex + 1) % total;
      elapsedMs = 0;
      if (progressFill) progressFill.style.width = "0%";
      updateCarouselPosition();
    }

    function prevStory() {
      const cards = getCards();
      const total = cards.length;
      if (total <= 1) return;
      currentIndex = (currentIndex - 1 + total) % total;
      elapsedMs = 0;
      if (progressFill) progressFill.style.width = "0%";
      updateCarouselPosition();
    }

    // Interval ticker for 15s timer
    if (window.__uafCarouselInterval) clearInterval(window.__uafCarouselInterval);
    window.__uafCarouselInterval = setInterval(() => {
      const activeScreen = document.querySelector(".screen[data-screen='donate']");
      const isDonateScreenActive = activeScreen && activeScreen.classList.contains("is-active");
      const isPaused = isUserHolding || isModalOpen || !isDonateScreenActive;

      if (!isPaused) {
        elapsedMs += TICK_MS;
        const pct = Math.min(100, (elapsedMs / DURATION_MS) * 100);
        if (progressFill) progressFill.style.width = `${pct}%`;

        if (elapsedMs >= DURATION_MS) {
          nextStory();
          if (progressFill) progressFill.style.width = "0%";
        }
      } else {
        if (pulseDot) pulseDot.classList.add("is-paused");
        if (statusText && isDonateScreenActive) {
          const cards = getCards();
          statusText.textContent = `Story ${currentIndex + 1} of ${cards.length} (Paused)`;
        }
      }
    }, TICK_MS);

    // Pause on hover or touch/hold
    viewport.addEventListener("mouseenter", () => {
      isUserHolding = true;
      updateCarouselPosition();
    });
    viewport.addEventListener("mouseleave", () => {
      isUserHolding = false;
      updateCarouselPosition();
    });
    viewport.addEventListener("touchstart", () => {
      isUserHolding = true;
      updateCarouselPosition();
    }, { passive: true });
    viewport.addEventListener("touchend", () => {
      isUserHolding = false;
      updateCarouselPosition();
    }, { passive: true });

    if (prevBtn) {
      prevBtn.onclick = (e) => {
        e.preventDefault();
        prevStory();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = (e) => {
        e.preventDefault();
        nextStory();
      };
    }

    window.__uafStoryCarouselPause = () => {
      isModalOpen = true;
      updateCarouselPosition();
    };
    window.__uafStoryCarouselResume = () => {
      isModalOpen = false;
      updateCarouselPosition();
    };

    window.addEventListener("resize", () => {
      updateCarouselPosition();
    });

    renderDots();
    updateCarouselPosition();
  }
  window.__uafInitStoryCarousel = initStoryCarousel;

  /* ---------------------------------------------------------
     OFFLINE STATUS & DRAFT QUEUE BADGE
  --------------------------------------------------------- */
  function updateOnlineStatus() {
    const banner = document.getElementById("status-banner");
    const textEl = document.getElementById("status-banner-text");
    const badge = document.getElementById("offline-sync-badge");
    if (!banner) return;

    let queuedCount = 0;
    try {
      const q = JSON.parse(localStorage.getItem("uaf_offline_queue") || "[]");
      queuedCount = Array.isArray(q) ? q.length : 0;
    } catch (_) {}

    if (badge) {
      if (queuedCount > 0) {
        badge.textContent = `${queuedCount} draft${queuedCount > 1 ? "s" : ""} queued`;
        badge.classList.remove("is-hidden");
      } else {
        badge.classList.add("is-hidden");
      }
    }

    if (navigator.onLine) {
      if (queuedCount > 0) {
        banner.classList.add("is-visible");
        if (textEl) textEl.textContent = `Online — syncing ${queuedCount} offline draft(s)...`;
        window.__uafSyncOfflineDrafts && window.__uafSyncOfflineDrafts();
      } else {
        banner.classList.remove("is-visible");
      }
    } else {
      if (textEl) {
        textEl.textContent = queuedCount > 0
          ? `Offline mode — ${queuedCount} draft(s) saved locally. Auto-syncs on reconnect.`
          : "Offline mode — submissions are saved as drafts and auto-synced when online.";
      }
      banner.classList.add("is-visible");
    }
  }
  window.__uafUpdateOnlineStatus = updateOnlineStatus;
  window.addEventListener("online", () => {
    updateOnlineStatus();
    window.__uafSyncOfflineDrafts && window.__uafSyncOfflineDrafts();
  });
  window.addEventListener("offline", updateOnlineStatus);

  /* ---------------------------------------------------------
     PWA INSTALL PROMPT & GUIDED DIALOG
  --------------------------------------------------------- */
  let deferredPrompt = null;
  function initInstall() {
    const installBtns = document.querySelectorAll("[data-action='install']");
    const guideBackdrop = document.getElementById("install-guide-backdrop");
    const guideClose = document.getElementById("install-guide-close");
    const promptTrigger = document.getElementById("install-prompt-trigger");

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    function openInstallGuide() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          deferredPrompt = null;
        });
      } else if (guideBackdrop) {
        guideBackdrop.classList.remove("is-hidden");
      } else {
        showToast("To install, use your browser's 'Add to Home Screen' or 'Install' menu option.");
      }
    }

    installBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openInstallGuide();
      });
    });

    guideClose?.addEventListener("click", () => {
      guideBackdrop?.classList.add("is-hidden");
    });

    guideBackdrop?.addEventListener("click", (e) => {
      if (e.target === guideBackdrop) guideBackdrop.classList.add("is-hidden");
    });

    promptTrigger?.addEventListener("click", () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          deferredPrompt = null;
          guideBackdrop?.classList.add("is-hidden");
        });
      } else {
        showToast("Follow the browser instructions shown above to install!");
      }
    });

    window.addEventListener("appinstalled", () => {
      guideBackdrop?.classList.add("is-hidden");
      showToast("UAF Impact installed successfully!");
    });
  }

  /* ---------------------------------------------------------
     DYNAMIC CHILD PROFILES REPEATER (Screen 6: Submit OSSC)
  --------------------------------------------------------- */
  const ALL_15_LIBERIA_COUNTIES = [
    "Montserrado", "Margibi", "Bong", "Nimba", "Grand Bassa",
    "Lofa", "Maryland", "Sinoe", "Grand Cape Mount", "Grand Gedeh",
    "Rivercess", "Grand Kru", "Bomi", "River Gee", "Gbarpolu"
  ];

  function setupDynamicChildProfiles() {
    const countInput = document.getElementById("rep-count");
    const container = document.getElementById("children-profiles-container");
    if (!countInput || !container) return;

    function renderChildCards(targetCount) {
      let count = parseInt(targetCount, 10);
      if (isNaN(count) || count < 1) count = 1;
      if (count > 20) count = 20;

      // Preserve existing input data before re-rendering
      const existingCards = container.querySelectorAll(".child-profile-card");
      const preserved = [];
      existingCards.forEach((c) => {
        preserved.push({
          name: c.querySelector(".child-name")?.value || "",
          gender: c.querySelector(".child-gender")?.value || "",
          age: c.querySelector(".child-age")?.value || "",
          origin: c.querySelector(".child-origin")?.value || "",
          residenceCounty: c.querySelector(".child-residence-county")?.value || "",
          community: c.querySelector(".child-community")?.value || "",
          livingWith: c.querySelector(".child-living-with")?.value || "",
          parentName: c.querySelector(".parent-name")?.value || "",
          parentPhone: c.querySelector(".parent-phone")?.value || "",
          yearsOut: c.querySelector(".child-years-out")?.value || "",
          currentClass: c.querySelector(".child-class")?.value || "",
          cause: c.querySelector(".child-cause")?.value || "",
          abuseObs: c.querySelector(".child-abuse-obs")?.value || "No",
          abuseType: c.querySelector(".child-abuse-type")?.value || "",
          statement: c.querySelector(".child-statement")?.value || "",
          consent: c.querySelector(".child-consent")?.checked || false
        });
      });

      const repCountyVal = document.getElementById("rep-county")?.value || "";
      const repCommVal = document.getElementById("rep-community")?.value || "";

      const countyOptionsHtml = ALL_15_LIBERIA_COUNTIES.map(
        (co) => `<option value="${co}">${co} County</option>`
      ).join("");

      let html = "";
      for (let i = 1; i <= count; i++) {
        html += `
          <div class="child-profile-card" data-child-index="${i}">
            <div class="child-profile-card-header">
              <span>Child #${i} Profile &amp; Case Details</span>
              <span style="font-size:11px;font-weight:normal;opacity:0.9;">Case Record ${i} of ${count}</span>
            </div>

            <!-- Basic Child Bio -->
            <div class="form-row-2">
              <div class="form-field">
                <label>Child full name *</label>
                <input type="text" class="child-name" placeholder="Child's full name" required />
              </div>
              <div class="form-field">
                <label>Gender *</label>
                <select class="child-gender" required>
                  <option value="">Select Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-field">
                <label>Child Age *</label>
                <input type="number" class="child-age" min="3" max="21" placeholder="Age (3–21)" required />
              </div>
              <div class="form-field">
                <label>Child Origin (County) *</label>
                <select class="child-origin" required>
                  <option value="">Select County of Origin</option>
                  ${countyOptionsHtml}
                </select>
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-field">
                <label>Child Current County of Residence *</label>
                <select class="child-residence-county" required>
                  <option value="">Select Current County of Residence</option>
                  ${countyOptionsHtml}
                </select>
              </div>
              <div class="form-field">
                <label>Child's Community / Town *</label>
                <input type="text" class="child-community" placeholder="Current Community / Town" required />
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-field">
                <label>Child living with *</label>
                <select class="child-living-with" required>
                  <option value="">Select living arrangement</option>
                  <option value="Full Parent">Full Parent</option>
                  <option value="Single parent">Single parent</option>
                  <option value="Grand Parent">Grand Parent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Alone">Alone</option>
                </select>
              </div>
              <div class="form-field">
                <label>Child Photo (optional)</label>
                <input type="file" class="child-photo" accept="image/*" />
                <span style="font-size:11.5px;color:var(--ink-500);margin-top:2px;display:block;">Clear face portrait for identification and sponsorship profile.</span>
              </div>
            </div>

            <!-- Parent / Guardian Information -->
            <div style="font-weight:700;font-size:13px;color:var(--ink-800);margin:14px 0 8px;padding-top:8px;border-top:1px dashed var(--border);">
              Parent / Guardian Information
            </div>
            <div class="form-row-2">
              <div class="form-field">
                <label>Parent / Guardian Name</label>
                <input type="text" class="parent-name" placeholder="Full name of parent/caregiver" />
              </div>
              <div class="form-field">
                <label>Parent / Guardian Phone</label>
                <input type="tel" class="parent-phone" placeholder="088... or 077..." />
              </div>
            </div>

            <div class="form-field">
              <label>Parent / Guardian Photo (optional)</label>
              <input type="file" class="parent-photo" accept="image/*" />
            </div>

            <!-- Educational Background & Cause of Exclusion -->
            <div style="font-weight:700;font-size:13px;color:var(--ink-800);margin:14px 0 8px;padding-top:8px;border-top:1px dashed var(--border);">
              Education Status &amp; Causes of Exclusion
            </div>
            <div class="form-row-2">
              <div class="form-field">
                <label>Years out of school *</label>
                <input type="number" class="child-years-out" min="0" max="15" placeholder="e.g. 1, 2" required />
              </div>
              <div class="form-field">
                <label>Current / Last Grade *</label>
                <input type="text" class="child-class" placeholder="e.g. Grade 2, ABC, Never attended" required />
              </div>
            </div>

            <div class="form-field">
              <label>Primary Cause of Exclusion *</label>
              <select class="child-cause" required>
                <option value="">Select Primary Cause of Exclusion</option>
                <option value="Orphan">Orphan (Loss of parents)</option>
                <option value="Neglected">Neglected / Abandoned</option>
                <option value="Financial Hardship / Inability to Pay School Fees">Financial Hardship / Inability to Pay School Fees</option>
                <option value="Lack of Uniforms, Books or Learning Supplies">Lack of Uniforms, Books or Learning Supplies</option>
                <option value="Child Labor / Street Selling / Petty Trading">Child Labor / Street Selling / Petty Trading</option>
                <option value="Extreme Distance to Nearest School">Extreme Distance to Nearest School</option>
                <option value="Loss of Primary Caregiver">Loss of Primary Caregiver</option>
                <option value="Adolescent Pregnancy & Early Caregiving">Adolescent Pregnancy & Early Caregiving</option>
                <option value="Physical Disability or Special Learning Needs">Physical Disability or Special Learning Needs</option>
                <option value="Family Relocation / Instability">Family Relocation / Instability</option>
                <option value="Chronic Illness / Health Challenges">Chronic Illness / Health Challenges</option>
                <option value="Other Community Barrier">Other Community Barrier</option>
              </select>
            </div>

            <!-- Abuse Assessment -->
            <div style="font-weight:700;font-size:13px;color:var(--ink-800);margin:14px 0 8px;padding-top:8px;border-top:1px dashed var(--border);">
              Safeguarding &amp; Protection Observation
            </div>
            <div class="form-field">
              <label>Is child experiencing any form of abuse? *</label>
              <select class="child-abuse-obs" required>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div class="abuse-specification-box is-hidden">
              <label style="font-size:12.5px;font-weight:700;color:#92400e;margin-bottom:6px;display:block;">
                Specify Form of Abuse Experienced *
              </label>
              <select class="child-abuse-type">
                <option value="">Select Form of Abuse</option>
                <option value="Child Trafficking">Child Trafficking</option>
                <option value="Maltreatment / Severe Physical Abuse">Maltreatment / Severe Physical Abuse</option>
                <option value="Street Selling / Commercial Exploitation">Street Selling / Commercial Exploitation</option>
                <option value="Forced Child Labor">Forced Child Labor</option>
                <option value="Verbal & Emotional Abuse">Verbal & Emotional Abuse</option>
                <option value="Sexual Abuse">Sexual Abuse</option>
                <option value="Deprivation of Food & Care / Neglect">Deprivation of Food & Care / Neglect</option>
                <option value="Other Form of Abuse">Other Form of Abuse</option>
              </select>
            </div>

            <!-- Child Case Story -->
            <div class="form-field" style="margin-top:10px;">
              <label>Child Case Narrative / Story *</label>
              <textarea class="child-statement" rows="3" placeholder="Describe the child's living conditions, daily routine, why they are out of school, and what assistance is needed..." required></textarea>
            </div>

            <!-- Consent -->
            <div class="consent-statement-box">
              <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;font-weight:600;cursor:pointer;margin:0;">
                <input type="checkbox" class="child-consent" required style="margin-top:2px;flex-shrink:0;" />
                <span>I agree that the images and information of my child case should be used by UAF and partners on behalf of my child case for advocacy, seeking sponsorship for the benefit of my child only and should not be used for any purpose after besides *</span>
              </label>
            </div>
          </div>
        `;
      }

      container.innerHTML = html;

      // Restore preserved data and wire up abuse toggle
      const newCards = container.querySelectorAll(".child-profile-card");
      newCards.forEach((c, idx) => {
        const abuseSelect = c.querySelector(".child-abuse-obs");
        const abuseBox = c.querySelector(".abuse-specification-box");
        const abuseType = c.querySelector(".child-abuse-type");

        function updateAbuseState() {
          if (!abuseSelect || !abuseBox) return;
          if (abuseSelect.value === "Yes") {
            abuseBox.classList.remove("is-hidden");
            abuseType?.setAttribute("required", "true");
          } else {
            abuseBox.classList.add("is-hidden");
            abuseType?.removeAttribute("required");
            if (abuseType) abuseType.value = "";
          }
        }

        abuseSelect?.addEventListener("change", updateAbuseState);

        const data = preserved[idx];
        if (data) {
          if (c.querySelector(".child-name")) c.querySelector(".child-name").value = data.name;
          if (c.querySelector(".child-gender")) c.querySelector(".child-gender").value = data.gender;
          if (c.querySelector(".child-age")) c.querySelector(".child-age").value = data.age;
          if (c.querySelector(".child-origin")) c.querySelector(".child-origin").value = data.origin;
          if (c.querySelector(".child-residence-county")) c.querySelector(".child-residence-county").value = data.residenceCounty || repCountyVal;
          if (c.querySelector(".child-community")) c.querySelector(".child-community").value = data.community || repCommVal;
          if (c.querySelector(".child-living-with")) c.querySelector(".child-living-with").value = data.livingWith;
          if (c.querySelector(".parent-name")) c.querySelector(".parent-name").value = data.parentName;
          if (c.querySelector(".parent-phone")) c.querySelector(".parent-phone").value = data.parentPhone;
          if (c.querySelector(".child-years-out")) c.querySelector(".child-years-out").value = data.yearsOut;
          if (c.querySelector(".child-class")) c.querySelector(".child-class").value = data.currentClass;
          if (c.querySelector(".child-cause")) c.querySelector(".child-cause").value = data.cause;
          if (abuseSelect) abuseSelect.value = data.abuseObs;
          if (abuseType) abuseType.value = data.abuseType;
          if (c.querySelector(".child-statement")) c.querySelector(".child-statement").value = data.statement;
          if (c.querySelector(".child-consent")) c.querySelector(".child-consent").checked = data.consent;
          updateAbuseState();
        } else {
          if (c.querySelector(".child-residence-county") && repCountyVal) c.querySelector(".child-residence-county").value = repCountyVal;
          if (c.querySelector(".child-community") && repCommVal) c.querySelector(".child-community").value = repCommVal;
        }
      });
    }

    countInput.addEventListener("input", (e) => {
      renderChildCards(e.target.value);
    });

    countInput.addEventListener("change", (e) => {
      renderChildCards(e.target.value);
    });

    // Initial render
    renderChildCards(countInput.value || 1);
  }

  /* ---------------------------------------------------------
     TIMED DONATION ENGAGEMENT POPUP
     "Please Donate, Educate a Kid or Empower a household"
     Pops up after reading/browsing for ~75 seconds (with X and Donate button)
  --------------------------------------------------------- */
  function initDonationEngagementPopup() {
    const modal = document.getElementById("donation-engagement-modal");
    const closeBtn = document.getElementById("donation-engagement-close");
    const donateBtn = document.getElementById("donation-engagement-donate-btn");
    const dismissBtn = document.getElementById("donation-engagement-dismiss-btn");
    if (!modal) return;

    function hidePopup() {
      modal.classList.add("is-hidden");
      modal.style.display = "none";
      try {
        sessionStorage.setItem("uaf_engagement_prompt_dismissed", "true");
      } catch (_) {}
    }

    closeBtn?.addEventListener("click", hidePopup);
    dismissBtn?.addEventListener("click", hidePopup);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hidePopup();
    });

    donateBtn?.addEventListener("click", () => {
      hidePopup();
      openDonationForm();
    });

    // Check if previously dismissed in this session
    try {
      if (sessionStorage.getItem("uaf_engagement_prompt_dismissed") === "true") {
        return;
      }
    } catch (_) {}

    // Pop up after user has been browsing for 75 seconds
    setTimeout(() => {
      try {
        if (sessionStorage.getItem("uaf_engagement_prompt_dismissed") === "true") {
          return;
        }
      } catch (_) {}
      modal.classList.remove("is-hidden");
      modal.style.display = "flex";
    }, 75000);
  }

  /* ---------------------------------------------------------
     INIT ON DOM READY & IMMEDIATE EXECUTION FALLBACK
  --------------------------------------------------------- */
  function initApp() {
    try { initDonationControls(); } catch (e) { console.warn("Donation controls init:", e); }
    try { initSearchDialog(); } catch (e) { console.warn("Search dialog init:", e); }
    try { initInstall(); } catch (e) { console.warn("Install init:", e); }
    try { initStoryModal(); } catch (e) { console.warn("Story modal init:", e); }
    try { initDonateToggle(); } catch (e) { console.warn("Donate toggle init:", e); }
    try { initDonationEngagementPopup(); } catch (e) { console.warn("Engagement popup init:", e); }
    try { updateOnlineStatus(); } catch (e) { console.warn("Online status init:", e); }
    try { renderRoute(); } catch (e) { console.warn("Render route init:", e); }
    try { setupDynamicChildProfiles(); } catch (e) { console.warn("Child profiles init:", e); }

    // Wire up all [data-goto] elements (normal routing without auto-opening donation form)
    document.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const goto = el.dataset.goto;
        if (goto) goTo(goto);
      });
    });

    // Wire up all direct donate buttons across the app
    document.querySelectorAll(".btn-header-donate, .btn-story-donate, .btn-campaign-donate").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openDonationForm(btn.dataset.impact);
      });
    });

    // Global delegation for story support triggers and clearing tie
    document.addEventListener("click", (e) => {
      const supportTrigger = e.target.closest(".btn-story-support-trigger");
      if (supportTrigger) {
        e.preventDefault();
        e.stopPropagation();
        const storyId = supportTrigger.dataset.storyId;
        const storyTitle = supportTrigger.dataset.storyTitle;
        const storyCat = supportTrigger.dataset.storyCategory;
        tieDonationToStory(storyId, storyTitle, storyCat);
        return;
      }

      const clearTieBtn = e.target.closest("#btn-clear-story-tie");
      if (clearTieBtn) {
        e.preventDefault();
        clearStoryDonationTie();
        return;
      }
    });

    // Initialize 30-Second Side-by-Side Story Carousel
    initStoryCarousel();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    }

    // Call data.js init
    window.__uafDataInit && window.__uafDataInit();

    console.info("UAF Impact —", APP_VERSION);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
