/* =========================================================
   UAF IMPACT — APP SHELL (7-Screen Line-Art UI)
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     CONFIG & COUNTIES
  --------------------------------------------------------- */
  const COUNTIES = [
    "Montserrado", "Margibi", "Bong", "Nimba", "Grand Bassa"
  ];
  const YEARS = ["2026", "2027"];
  const APP_VERSION = "2.0.0-ui-grid";

  /* ---------------------------------------------------------
     ROUTER (7 Distinct Screens)
     1. menu (Default Home / Grid of Line-Art Icons)
     2. donate (Image 2 style with USSD auto-dialer)
     3. statistics (Communities stats, Funding gap, Stories)
     4. impact-drive (Impact Overview, Directory, Programs)
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
    if (raw === "support" || raw === "donate" || raw === "fundraising" || raw === "fundraise") return "donate";
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
      const story = window.__uafGetStory && window.__uafGetStory(storyId);
      if (!story || !modal) return;

      modal.dataset.activeStoryId = storyId;
      if (window.__uafStoryCarouselPause) {
        window.__uafStoryCarouselPause();
      }

      // Track and increment view count when user clicks story to read details
      incrementStoryView(storyId);

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

      modal.classList.remove("is-hidden");
      modal.style.display = "flex";
    }

    window.__uafOpenStoryDetailModal = openStoryDetailModal;

    // Event delegation on document to handle any dynamically rendered story cards
    document.addEventListener("click", (e) => {
      // Do not trigger story modal if user clicked "Support this Story" or other buttons
      if (e.target.closest(".btn-story-support-trigger") || e.target.closest(".btn-story-donate") || e.target.closest(".btn-campaign-donate")) {
        return;
      }
      const trigger = e.target.closest("[data-story-id]");
      if (!trigger) return;
      const storyId = trigger.dataset.storyId;
      if (storyId) {
        e.stopPropagation();
        openStoryDetailModal(storyId);
      }
    });
  }

  /* ---------------------------------------------------------
     COLLAPSIBLE DONATE FORM TOGGLE (In Fundraising Tab)
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
        formWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      const nameInput = document.getElementById("don-name");
      if (nameInput) nameInput.focus();
    }, 120);
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
      formWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      const nameInput = document.getElementById("don-name");
      if (nameInput) setTimeout(() => nameInput.focus(), 250);
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
    const DURATION_MS = 30000; // exactly 30 seconds
    const TICK_MS = 100;

    function getCards() {
      return Array.from(track.querySelectorAll(".campaign-card"));
    }

    function getCardsPerView() {
      return window.innerWidth <= 640 ? 1 : 2;
    }

    function updateCarouselPosition() {
      const cards = getCards();
      const total = cards.length;
      if (total === 0) return;

      const perView = getCardsPerView();
      if (currentIndex >= total) currentIndex = 0;
      if (currentIndex < 0) currentIndex = Math.max(0, total - 1);

      const firstCard = cards[0];
      const gap = 20;
      const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : (track.offsetWidth / perView);
      const step = cardWidth + gap;

      track.style.transform = `translateX(-${currentIndex * step}px)`;

      if (statusText) {
        const isPaused = isUserHolding || isModalOpen;
        const pauseNotice = isPaused ? " (Paused)" : " (30s)";
        statusText.textContent = `Story ${currentIndex + 1} of ${total} — Active${pauseNotice}`;
      }
      if (pulseDot) {
        pulseDot.classList.toggle("is-paused", isUserHolding || isModalOpen);
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
      updateCarouselPosition();
    }

    function prevStory() {
      const cards = getCards();
      const total = cards.length;
      if (total <= 1) return;
      currentIndex = (currentIndex - 1 + total) % total;
      elapsedMs = 0;
      updateCarouselPosition();
    }

    // Interval ticker for 30s timer
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
          statusText.textContent = `Story ${currentIndex + 1} of ${cards.length} — Paused`;
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
                <label>Child's Community / Town *</label>
                <input type="text" class="child-community" placeholder="Current Community / Town" required />
              </div>
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
            </div>

            <div class="form-field">
              <label>Child Photo (optional)</label>
              <input type="file" class="child-photo" accept="image/*" />
              <span style="font-size:11.5px;color:var(--ink-500);margin-top:2px;display:block;">Clear face portrait for identification and sponsorship profile.</span>
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
          if (abuseSelect.value === "Yes") {
            abuseBox.classList.remove("is-hidden");
            abuseType.setAttribute("required", "true");
          } else {
            abuseBox.classList.add("is-hidden");
            abuseType.removeAttribute("required");
            abuseType.value = "";
          }
        }

        abuseSelect.addEventListener("change", updateAbuseState);

        const data = preserved[idx];
        if (data) {
          if (c.querySelector(".child-name")) c.querySelector(".child-name").value = data.name;
          if (c.querySelector(".child-gender")) c.querySelector(".child-gender").value = data.gender;
          if (c.querySelector(".child-age")) c.querySelector(".child-age").value = data.age;
          if (c.querySelector(".child-origin")) c.querySelector(".child-origin").value = data.origin;
          if (c.querySelector(".child-community")) c.querySelector(".child-community").value = data.community;
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
     INIT ON DOM READY & IMMEDIATE EXECUTION FALLBACK
  --------------------------------------------------------- */
  function initApp() {
    initDonationControls();
    initSearchDialog();
    initInstall();
    initStoryModal();
    initDonateToggle();
    updateOnlineStatus();
    renderRoute();
    setupDynamicChildProfiles();

    // Wire up all [data-goto] elements (normal routing without auto-opening donation form)
    document.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const goto = el.dataset.goto;
        goTo(goto);
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
