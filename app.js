/* =========================================================
   UAF CAMPAIGN DRIVE — MODERN CLIENT APPLICATION (v31)
   =========================================================
   Covers:
   - 4-Screen Router (Menu, Donate, Request Data, Submit OSSC)
   - Stories Carousel with 15s auto-scroll & pause controls
   - Story Detail Modal with full unconstrained narrative
   - Donate Form with story preselection & instant reference ID
   - Request Data & OSSC Form submissions with reference IDs
   - Dynamic child profiles repeater for community reports
   - PWA installation guide & service worker integration
   ========================================================= */

(() => {
  "use strict";

  const CURRENT_BUILD_VER = "2026-10-03-uaf-campaign-drive-v31";

  /* ---------------------------------------------------------
     TOAST NOTIFICATIONS
  --------------------------------------------------------- */
  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4000);
  }
  window.__uafShowToast = showToast;

  /* ---------------------------------------------------------
     SCREEN ROUTER (4 Screens: menu, donate, request-data, submit-ossc)
  --------------------------------------------------------- */
  const VALID_SCREENS = ["menu", "donate", "request-data", "submit-ossc"];

  function navigateTo(screenId, scrollToAnchor = null) {
    if (!VALID_SCREENS.includes(screenId)) {
      screenId = "menu";
    }

    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.remove("is-active");
      if (s.dataset.screen === screenId) {
        s.classList.add("is-active");
      }
    });

    window.scrollTo({ top: 0, behavior: "instant" });

    // Update location hash without looping
    if (window.location.hash.slice(2) !== screenId) {
      window.history.pushState(null, "", `#/${screenId}`);
    }

    // Optional smooth scroll to section (e.g. #donation-section)
    if (scrollToAnchor) {
      setTimeout(() => {
        const el = document.getElementById(scrollToAnchor);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  function handleHashChange() {
    const rawHash = window.location.hash.slice(2).trim();
    if (!rawHash) {
      navigateTo("menu");
      return;
    }

    // Direct short link handler: #/c/{shareCode}
    if (rawHash.startsWith("c/")) {
      const code = rawHash.slice(2);
      navigateTo("donate");
      setTimeout(() => {
        const story = window.__uafGetStory ? window.__uafGetStory(code) : null;
        if (story) openStoryModal(story.id || story.storyId);
      }, 400);
      return;
    }

    navigateTo(rawHash);
  }

  window.addEventListener("hashchange", handleHashChange);

  // Global navigation click delegation
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-goto]");
    if (btn) {
      e.preventDefault();
      const target = btn.dataset.goto;
      const scrollTo = btn.dataset.scrollTo || null;
      navigateTo(target, scrollTo);
    }
  });

  /* ---------------------------------------------------------
     STORIES CAROUSEL CONTROLLER
  --------------------------------------------------------- */
  function initStoryCarousel() {
    const viewport = document.getElementById("stories-carousel-viewport");
    const grid = document.getElementById("fundraising-stories-grid");
    const statusText = document.getElementById("carousel-status-text");
    const pulseDot = document.getElementById("carousel-pulse-dot");
    const progressFill = document.getElementById("carousel-progress-fill");
    const prevBtn = document.getElementById("carousel-prev-btn");
    const nextBtn = document.getElementById("carousel-next-btn");
    const dotsContainer = document.getElementById("carousel-dots-container");

    if (!viewport || !grid) return;

    let currentIndex = 0;
    let isUserHolding = false;
    let isModalOpen = false;
    let elapsedMs = 0;
    const DURATION_MS = 15000;
    const TICK_MS = 100;

    function getCards() {
      return Array.from(grid.querySelectorAll(".campaign-card"));
    }

    function updateCarouselPosition() {
      const cards = getCards();
      const total = cards.length;
      if (total === 0) return;

      if (currentIndex >= total) currentIndex = 0;
      if (currentIndex < 0) currentIndex = Math.max(0, total - 1);

      const targetCard = cards[currentIndex];
      const offset = targetCard ? targetCard.offsetLeft : 0;
      grid.style.transform = `translateX(-${offset}px)`;

      const isPaused = isUserHolding || isModalOpen;
      if (statusText) {
        statusText.textContent = `Story ${currentIndex + 1} of ${total}${isPaused ? " (Paused)" : ""}`;
      }
      if (pulseDot) {
        pulseDot.classList.toggle("is-paused", isPaused);
      }

      if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll(".carousel-dot");
        dots.forEach((d, i) => d.classList.toggle("is-active", i === currentIndex));
      }
    }

    function renderDots() {
      if (!dotsContainer) return;
      const cards = getCards();
      dotsContainer.innerHTML = "";
      cards.forEach((_, idx) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot" + (idx === currentIndex ? " is-active" : "");
        dot.setAttribute("aria-label", `Story ${idx + 1}`);
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
      if (cards.length <= 1) return;
      currentIndex = (currentIndex + 1) % cards.length;
      elapsedMs = 0;
      if (progressFill) progressFill.style.width = "0%";
      updateCarouselPosition();
    }

    function prevStory() {
      const cards = getCards();
      if (cards.length <= 1) return;
      currentIndex = (currentIndex - 1 + cards.length) % cards.length;
      elapsedMs = 0;
      if (progressFill) progressFill.style.width = "0%";
      updateCarouselPosition();
    }

    // Interval ticker
    if (window.__uafCarouselTimer) clearInterval(window.__uafCarouselTimer);
    window.__uafCarouselTimer = setInterval(() => {
      const activeScreen = document.querySelector(".screen[data-screen='donate']");
      const isDonateScreenActive = activeScreen && activeScreen.classList.contains("is-active");
      const isPaused = isUserHolding || isModalOpen || !isDonateScreenActive;

      if (!isPaused) {
        elapsedMs += TICK_MS;
        const pct = Math.min(100, (elapsedMs / DURATION_MS) * 100);
        if (progressFill) progressFill.style.width = `${pct}%`;

        if (elapsedMs >= DURATION_MS) {
          nextStory();
        }
      }
    }, TICK_MS);

    viewport.addEventListener("mouseenter", () => { isUserHolding = true; updateCarouselPosition(); });
    viewport.addEventListener("mouseleave", () => { isUserHolding = false; updateCarouselPosition(); });
    viewport.addEventListener("touchstart", () => { isUserHolding = true; updateCarouselPosition(); }, { passive: true });
    viewport.addEventListener("touchend", () => { isUserHolding = false; updateCarouselPosition(); }, { passive: true });

    if (prevBtn) prevBtn.onclick = (e) => { e.preventDefault(); prevStory(); };
    if (nextBtn) nextBtn.onclick = (e) => { e.preventDefault(); nextStory(); };

    window.__uafCarouselPause = () => { isModalOpen = true; updateCarouselPosition(); };
    window.__uafCarouselResume = () => { isModalOpen = false; updateCarouselPosition(); };

    renderDots();
    updateCarouselPosition();
  }
  window.__uafInitStoryCarousel = initStoryCarousel;

  /* ---------------------------------------------------------
     STORY DETAIL MODAL
  --------------------------------------------------------- */
  function openStoryModal(storyId) {
    const modal = document.getElementById("story-modal-backdrop");
    if (!modal) return;

    const story = window.__uafGetStory ? window.__uafGetStory(storyId) : null;
    if (!story) return;

    modal.dataset.activeStoryId = story.id || story.storyId;
    if (window.__uafCarouselPause) window.__uafCarouselPause();

    // Increment read views counter
    try {
      const views = JSON.parse(localStorage.getItem("uaf_story_views") || "{}");
      views[story.id || story.storyId] = (Number(views[story.id || story.storyId]) || 0) + 1;
      localStorage.setItem("uaf_story_views", JSON.stringify(views));
    } catch (_) {}

    const tagEl = document.getElementById("story-modal-tag");
    const locEl = document.getElementById("story-modal-location");
    const titleEl = document.getElementById("story-modal-title");
    const imgEl = document.getElementById("story-modal-img");
    const imgWrap = document.getElementById("story-modal-img-wrap");
    const quoteEl = document.getElementById("story-modal-quote");
    const authorEl = document.getElementById("story-modal-author");
    const quoteWrap = quoteEl ? quoteEl.closest(".story-modal-quote-wrap") : null;
    const actEl = document.getElementById("story-modal-activities");
    const actSection = actEl ? actEl.closest(".story-modal-section") : null;
    const narEl = document.getElementById("story-modal-narrative");
    const raisedEl = document.getElementById("story-modal-raised-val");
    const goalEl = document.getElementById("story-modal-goal-val");
    const fillEl = document.getElementById("story-modal-funding-fill");

    if (tagEl) tagEl.textContent = story.tag || story.category || "Field Story";
    if (locEl) locEl.textContent = `${story.community ? story.community + ", " : ""}${story.county || "Liberia"}`;
    if (titleEl) titleEl.textContent = story.title || "";

    // Image banner
    if (imgEl && imgWrap) {
      if (story.imageUrl && String(story.imageUrl).trim()) {
        imgEl.style.display = "block";
        imgEl.src = story.imageUrl;
        imgWrap.style.display = "block";
      } else {
        imgWrap.style.display = "none";
      }
    }

    // Funding progress
    const raised = Number(story.raised != null ? story.raised : (story.amountRaised || 0));
    const goal = Number(story.goal != null ? story.goal : (story.fundingGoal || story.goalUsd || 0));
    const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

    if (raisedEl) raisedEl.textContent = "$" + raised.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " raised";
    if (goalEl) goalEl.textContent = "of $" + goal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " goal";
    if (fillEl) fillEl.style.width = pct + "%";

    // Quote / Testimonial
    if (quoteWrap) {
      if (story.testimonial && story.testimonial.trim()) {
        quoteWrap.style.display = "block";
        if (quoteEl) quoteEl.textContent = story.testimonial;
        if (authorEl) authorEl.textContent = `— ${story.speaker || "Beneficiary Story"}`;
      } else {
        quoteWrap.style.display = "none";
      }
    }

    // Field Activities
    if (actSection) {
      if (story.activities && story.activities.trim()) {
        actSection.style.display = "block";
        if (actEl) actEl.textContent = story.activities;
      } else {
        actSection.style.display = "none";
      }
    }

    // Complete narrative without limits
    if (narEl) {
      narEl.textContent = story.narrative || story.content || story.summary || "";
    }

    // Render Share buttons
    const shareBar = document.getElementById("story-modal-share-bar");
    if (shareBar) {
      const shareCode = story.shareCode || String(story.id || story.storyId).replace("UAF-STORY-", "");
      const shareUrl = `${window.location.origin}${window.location.pathname}#/c/${encodeURIComponent(shareCode)}`;
      const shareText = `Support "${story.title}" on UAF Campaign Drive:`;

      shareBar.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:12px;font-weight:700;color:var(--ink-700);">Share:</span>
          <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}" target="_blank" rel="noopener noreferrer" class="btn-share-social" style="background:#25D366;color:#fff;padding:4px 10px;border-radius:6px;font-size:11.5px;font-weight:700;text-decoration:none;">WhatsApp</a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener noreferrer" class="btn-share-social" style="background:#1877F2;color:#fff;padding:4px 10px;border-radius:6px;font-size:11.5px;font-weight:700;text-decoration:none;">Facebook</a>
        </div>
      `;
    }

    // Render interactive reactions and comments
    renderStoryReactions(story.id || story.storyId);
    renderStoryComments(story.id || story.storyId);

    modal.classList.remove("is-hidden");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeStoryModal() {
    const modal = document.getElementById("story-modal-backdrop");
    if (modal) {
      modal.classList.add("is-hidden");
      modal.style.display = "none";
      delete modal.dataset.activeStoryId;
    }
    document.body.style.overflow = "";
    if (window.__uafCarouselResume) window.__uafCarouselResume();
  }

  /* ---------------------------------------------------------
     STORY REACTIONS & COMMENTS CONTROLLER
  --------------------------------------------------------- */
  function getStoredReactions(storyId) {
    try {
      const stored = localStorage.getItem(`uaf_reactions_${storyId}`);
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return { likes: 12, loves: 8, cheers: 5, userVoted: {} };
  }

  function saveStoredReactions(storyId, data) {
    try {
      localStorage.setItem(`uaf_reactions_${storyId}`, JSON.stringify(data));
    } catch (_) {}
  }

  function renderStoryReactions(storyId) {
    const bar = document.getElementById("story-modal-reactions-bar");
    if (!bar) return;
    const data = getStoredReactions(storyId);
    const uv = data.userVoted || {};

    bar.innerHTML = `
      <div class="story-reactions-group">
        <button type="button" class="reaction-btn ${uv.like ? "is-active" : ""}" data-reaction="like" title="Helpful / Insightful">
          <span>👍</span>
          <span class="reaction-count">${data.likes}</span>
        </button>
        <button type="button" class="reaction-btn ${uv.love ? "is-active" : ""}" data-reaction="love" title="Inspiring / Heartwarming">
          <span>❤️</span>
          <span class="reaction-count">${data.loves}</span>
        </button>
        <button type="button" class="reaction-btn ${uv.cheer ? "is-active" : ""}" data-reaction="cheer" title="Celebrate Impact">
          <span>🎉</span>
          <span class="reaction-count">${data.cheers}</span>
        </button>
      </div>
    `;

    bar.querySelectorAll(".reaction-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.reaction;
        const cur = getStoredReactions(storyId);
        cur.userVoted = cur.userVoted || {};
        if (cur.userVoted[type]) {
          cur.userVoted[type] = false;
          if (type === "like") cur.likes = Math.max(0, cur.likes - 1);
          if (type === "love") cur.loves = Math.max(0, cur.loves - 1);
          if (type === "cheer") cur.cheers = Math.max(0, cur.cheers - 1);
        } else {
          cur.userVoted[type] = true;
          if (type === "like") cur.likes++;
          if (type === "love") cur.loves++;
          if (type === "cheer") cur.cheers++;
        }
        saveStoredReactions(storyId, cur);
        renderStoryReactions(storyId);
      });
    });
  }

  function getStoredComments(storyId) {
    try {
      const stored = localStorage.getItem(`uaf_comments_${storyId}`);
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [];
  }

  function saveStoredComments(storyId, comments) {
    try {
      localStorage.setItem(`uaf_comments_${storyId}`, JSON.stringify(comments));
    } catch (_) {}
  }

  function renderStoryComments(storyId) {
    const listEl = document.getElementById("story-comments-list");
    const countEl = document.getElementById("story-comments-count");
    if (!listEl) return;
    const comments = getStoredComments(storyId);
    if (countEl) countEl.textContent = comments.length;

    if (comments.length === 0) {
      listEl.innerHTML = `<p style="font-size:12px;color:var(--ink-400);font-style:italic;">No messages yet. Be the first to leave a message of encouragement!</p>`;
      return;
    }

    listEl.innerHTML = comments.map((c) => `
      <div class="story-comment-item">
        <div class="story-comment-header">
          <span class="story-comment-author">
            ${escapeHtml(c.author)}
            ${c.isPrivate ? '<span class="story-comment-badge-admin">Private (Admin Only)</span>' : ""}
          </span>
          <span class="story-comment-time">${escapeHtml(c.time || "Just now")}</span>
        </div>
        <p class="story-comment-text">${escapeHtml(c.text)}</p>
      </div>
    `).join("");
  }

  // Handle comment submission
  const commentForm = document.getElementById("story-comment-form");
  commentForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const modal = document.getElementById("story-modal-backdrop");
    const activeStoryId = modal?.dataset.activeStoryId;
    if (!activeStoryId) return;

    const authorInput = document.getElementById("comment-author");
    const textInput = document.getElementById("comment-text");
    const privateCheck = document.getElementById("comment-private");

    const author = authorInput?.value.trim() || "Supporter";
    const text = textInput?.value.trim() || "";
    const isPrivate = privateCheck?.checked || false;

    if (!text) return;

    const comments = getStoredComments(activeStoryId);
    comments.push({
      author,
      text,
      isPrivate,
      time: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    });
    saveStoredComments(activeStoryId, comments);

    textInput.value = "";
    renderStoryComments(activeStoryId);
    showToast(isPrivate ? "Message recorded privately for UAF administration." : "Message posted successfully!");
  });

  document.getElementById("story-modal-close")?.addEventListener("click", closeStoryModal);
  document.getElementById("story-modal-done-btn")?.addEventListener("click", closeStoryModal);
  document.getElementById("story-modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "story-modal-backdrop") closeStoryModal();
  });

  // Modal support button -> dedicate story & scroll to donation form
  document.getElementById("story-modal-support-btn")?.addEventListener("click", () => {
    const modal = document.getElementById("story-modal-backdrop");
    const activeStoryId = modal?.dataset.activeStoryId;
    closeStoryModal();
    if (activeStoryId) {
      preselectDonationStory(activeStoryId);
    }
  });

  // Card click delegation
  document.addEventListener("click", (e) => {
    // 1. Read More click
    const readBtn = e.target.closest(".btn-card-readmore");
    if (readBtn) {
      e.preventDefault();
      openStoryModal(readBtn.dataset.storyId);
      return;
    }

    // 2. Card Donate click
    const donBtn = e.target.closest(".btn-card-donate");
    if (donBtn) {
      e.preventDefault();
      preselectDonationStory(donBtn.dataset.storyId, donBtn.dataset.storyTitle);
      return;
    }

    // 3. Share dots copy link click
    const shareBtn = e.target.closest(".btn-story-share-dots");
    if (shareBtn) {
      e.preventDefault();
      const url = shareBtn.dataset.shareUrl || window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => showToast("Story link copied to clipboard!"));
      } else {
        window.prompt("Copy story link:", url);
      }
      return;
    }

    // 4. Card body click opens modal (unless clicking interactive button)
    const card = e.target.closest(".campaign-card[data-story-id]");
    if (card && !e.target.closest("button, a")) {
      openStoryModal(card.dataset.storyId);
    }
  });

  /* ---------------------------------------------------------
     DONATION FORM & PRESET AMOUNT CHIPS
  --------------------------------------------------------- */
  const PRESET_AMOUNTS = {
    USD: [1, 5, 10, 25, 50, 100],
    LRD: [100, 500, 1000, 2500, 5000]
  };

  let selectedCurrency = "USD";
  let selectedAmount = 5;

  function renderAmountChips() {
    const container = document.getElementById("amount-grid");
    const customInput = document.getElementById("custom-amount");
    if (!container) return;

    container.innerHTML = "";
    const list = PRESET_AMOUNTS[selectedCurrency] || PRESET_AMOUNTS.USD;

    list.forEach((amt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "amount-chip" + (amt === selectedAmount ? " is-selected" : "");
      btn.textContent = (selectedCurrency === "USD" ? "$" : "L$") + amt.toLocaleString();
      btn.addEventListener("click", () => {
        selectedAmount = amt;
        if (customInput) {
          customInput.value = "";
          customInput.disabled = true;
        }
        renderAmountChips();
        updateSubmitButtonLabel();
      });
      container.appendChild(btn);
    });

    // Custom Chip
    const customChip = document.createElement("button");
    customChip.type = "button";
    customChip.className = "amount-chip" + (selectedAmount === "custom" ? " is-selected" : "");
    customChip.textContent = "Custom";
    customChip.addEventListener("click", () => {
      selectedAmount = "custom";
      if (customInput) {
        customInput.disabled = false;
        customInput.focus();
      }
      renderAmountChips();
      updateSubmitButtonLabel();
    });
    container.appendChild(customChip);
  }

  function updateSubmitButtonLabel() {
    const label = document.getElementById("don-submit-label");
    if (!label) return;
    const customInput = document.getElementById("custom-amount");
    let displayAmt = selectedAmount === "custom" ? (Number(customInput?.value) || 0) : selectedAmount;
    const sym = selectedCurrency === "USD" ? "$" : "L$";
    label.textContent = `Donate ${sym}${displayAmt} ${selectedCurrency} to UAF`;
  }

  // Currency Toggle Listeners
  document.querySelectorAll("#currency-toggle .currency-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#currency-toggle .currency-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      selectedCurrency = btn.dataset.currency;
      selectedAmount = selectedCurrency === "USD" ? 5 : 500;
      const symLabel = document.getElementById("currency-symbol-label");
      if (symLabel) symLabel.textContent = selectedCurrency === "USD" ? "USD $" : "LRD L$";
      renderAmountChips();
      updateSubmitButtonLabel();
    });
  });

  document.getElementById("custom-amount")?.addEventListener("input", updateSubmitButtonLabel);

  function preselectDonationStory(storyId, storyTitle = null) {
    const hiddenIdInput = document.getElementById("don-dedicated-story-id");
    const select = document.getElementById("don-story-select");
    const alertBox = document.getElementById("don-story-tied-alert");
    const titleText = document.getElementById("don-tied-story-title");

    const story = window.__uafGetStory ? window.__uafGetStory(storyId) : null;
    const title = storyTitle || (story ? story.title : "Community Campaign");

    if (hiddenIdInput) hiddenIdInput.value = storyId;
    if (select) select.value = storyId;

    if (alertBox) {
      alertBox.classList.remove("is-hidden");
      if (titleText) titleText.textContent = title;
    }

    navigateTo("donate", "donation-section");
    showToast(`Dedicated gift for: ${title}`);
  }

  document.getElementById("btn-clear-tied-story")?.addEventListener("click", () => {
    const hiddenIdInput = document.getElementById("don-dedicated-story-id");
    const select = document.getElementById("don-story-select");
    const alertBox = document.getElementById("don-story-tied-alert");

    if (hiddenIdInput) hiddenIdInput.value = "";
    if (select) select.value = "General Support";
    if (alertBox) alertBox.classList.add("is-hidden");
    showToast("Donation updated to General Support");
  });

  /* ---------------------------------------------------------
     DONATION FREQUENCY & PAYMENT METHOD SELECTORS
  --------------------------------------------------------- */
  // Frequency Chips
  document.querySelectorAll("#donation-frequency-chips .frequency-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#donation-frequency-chips .frequency-chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      const hiddenInput = document.getElementById("don-frequency");
      if (hiddenInput) hiddenInput.value = chip.dataset.freq || "Once";
    });
  });

  // Payment Method Cards
  document.querySelectorAll("#payment-methods-grid .payment-method-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll("#payment-methods-grid .payment-method-card").forEach((c) => c.classList.remove("is-active"));
      card.classList.add("is-active");
      const hiddenInput = document.getElementById("don-payment-method");
      if (hiddenInput) hiddenInput.value = card.dataset.method || "MTN Mobile Money";
    });
  });

  // Submit Donation Form
  const donationForm = document.getElementById("donation-form");
  donationForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("don-submit-btn");
    const successCard = document.getElementById("donation-success-view");
    const refEl = document.getElementById("don-success-ref");

    const customInput = document.getElementById("custom-amount");
    const amt = selectedAmount === "custom" ? Number(customInput?.value) : Number(selectedAmount);

    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid donation amount.");
      return;
    }

    const payload = {
      name: document.getElementById("don-name")?.value.trim(),
      phone: document.getElementById("don-phone")?.value.trim(),
      email: document.getElementById("don-email")?.value.trim(),
      address: document.getElementById("don-address")?.value.trim(),
      amount: amt,
      currency: selectedCurrency,
      frequency: document.getElementById("don-frequency")?.value || "Once",
      paymentMethod: document.getElementById("don-payment-method")?.value || "MTN Mobile Money",
      storyId: document.getElementById("don-story-select")?.value || "General Support",
      paymentReference: document.getElementById("don-payment-ref")?.value.trim(),
      message: document.getElementById("don-message")?.value.trim(),
      anonymous: document.getElementById("don-anon")?.checked || false
    };

    if (submitBtn) {
      submitBtn.setAttribute("disabled", "true");
      submitBtn.classList.add("is-loading");
    }

    try {
      const res = await window.UAF_DATA.submitDonation(payload);
      if (res && res.ok) {
        donationForm.classList.add("is-hidden");
        if (successCard) successCard.classList.remove("is-hidden");
        if (refEl) refEl.textContent = res.transactionId || res.recordId || "PENDING";
        showToast("Thank you! Your donation was submitted for verification.");
      } else {
        showToast(res?.error || "Submission failed. Please check your connection and retry.");
      }
    } catch (err) {
      showToast("Could not submit. Your form has been queued for auto-sync.");
    } finally {
      if (submitBtn) {
        submitBtn.removeAttribute("disabled");
        submitBtn.classList.remove("is-loading");
      }
    }
  });

  document.getElementById("btn-donate-another")?.addEventListener("click", () => {
    const successCard = document.getElementById("donation-success-view");
    if (successCard) successCard.classList.add("is-hidden");
    if (donationForm) {
      donationForm.reset();
      donationForm.classList.remove("is-hidden");
      selectedAmount = selectedCurrency === "USD" ? 5 : 500;
      renderAmountChips();
      updateSubmitButtonLabel();
    }
  });

  /* ---------------------------------------------------------
     REQUEST DATA FORM (EvidenceRequests -> initial status NEW)
  --------------------------------------------------------- */
  const evidenceForm = document.getElementById("evidence-form");
  evidenceForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("ev-submit-btn");
    const successCard = document.getElementById("evidence-success-view");
    const refEl = document.getElementById("ev-success-ref");

    const payload = {
      name: document.getElementById("ev-name")?.value.trim(),
      email: document.getElementById("ev-email")?.value.trim(),
      organization: document.getElementById("ev-org")?.value.trim(),
      reason: document.getElementById("ev-reason")?.value,
      requestDetails: document.getElementById("ev-request")?.value.trim()
    };

    if (submitBtn) {
      submitBtn.setAttribute("disabled", "true");
      submitBtn.classList.add("is-loading");
    }

    try {
      const res = await window.UAF_DATA.submitEvidenceRequest(payload);
      if (res && res.ok) {
        evidenceForm.classList.add("is-hidden");
        if (successCard) successCard.classList.remove("is-hidden");
        if (refEl) refEl.textContent = res.requestId || res.recordId || "NEW";
        showToast("Evidence request submitted with status NEW.");
      } else {
        showToast(res?.error || "Submission error. Please retry.");
      }
    } catch (_) {
      showToast("Submission queued offline.");
    } finally {
      if (submitBtn) {
        submitBtn.removeAttribute("disabled");
        submitBtn.classList.remove("is-loading");
      }
    }
  });

  document.getElementById("btn-ev-another")?.addEventListener("click", () => {
    const successCard = document.getElementById("evidence-success-view");
    if (successCard) successCard.classList.add("is-hidden");
    if (evidenceForm) {
      evidenceForm.reset();
      evidenceForm.classList.remove("is-hidden");
    }
  });

  /* ---------------------------------------------------------
     IDENTIFY OSSC REPORT FORM (OutOfSchoolSubmissions -> status NEW)
     With Multi-Child Profiles Repeater
  --------------------------------------------------------- */
  const osscForm = document.getElementById("report-form");
  const countInput = document.getElementById("rep-count");
  const profilesContainer = document.getElementById("children-profiles-container");
  const addChildBtn = document.getElementById("btn-add-child-profile");

  function renderChildCards(count) {
    if (!profilesContainer) return;
    let n = parseInt(count, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > 20) n = 20;
    if (countInput) countInput.value = n;

    // Preserve existing child inputs
    const existing = [];
    profilesContainer.querySelectorAll(".child-card").forEach((c) => {
      existing.push({
        name: c.querySelector(".child-name")?.value || "",
        gender: c.querySelector(".child-gender")?.value || "",
        age: c.querySelector(".child-age")?.value || "",
        barrier: c.querySelector(".child-barrier")?.value || ""
      });
    });

    profilesContainer.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const data = existing[i] || { name: "", gender: "", age: "", barrier: "" };
      const card = document.createElement("div");
      card.className = "child-card";
      card.innerHTML = `
        <div class="child-card__header">
          <span class="child-card__title">Child Profile #${i + 1}</span>
          ${n > 1 ? `<button type="button" class="btn-remove-child" data-index="${i}" aria-label="Remove child">✕ Remove</button>` : ""}
        </div>
        <div class="form-row-3">
          <div class="form-field">
            <label>Child's Full Name (or initials) *</label>
            <input type="text" class="child-name" value="${escapeHtml(data.name)}" placeholder="e.g. Moses K." required />
          </div>
          <div class="form-field">
            <label>Gender *</label>
            <select class="child-gender input-select" required>
              <option value="">Select</option>
              <option value="Male" ${data.gender === "Male" ? "selected" : ""}>Male</option>
              <option value="Female" ${data.gender === "Female" ? "selected" : ""}>Female</option>
            </select>
          </div>
          <div class="form-field">
            <label>Approx Age *</label>
            <input type="number" class="child-age" min="3" max="18" value="${escapeHtml(data.age)}" placeholder="Years" required />
          </div>
        </div>
        <div class="form-field" style="margin-top:10px;">
          <label>Primary Exclusion Barrier</label>
          <select class="child-barrier input-select">
            <option value="Tuition fees & school uniform" ${data.barrier === "Tuition fees & school uniform" ? "selected" : ""}>Tuition fees &amp; school uniform</option>
            <option value="Child labor / Street hawking" ${data.barrier === "Child labor / Street hawking" ? "selected" : ""}>Child labor / Street hawking</option>
            <option value="No school facility nearby" ${data.barrier === "No school facility nearby" ? "selected" : ""}>No school facility nearby</option>
            <option value="Single-parent vulnerability" ${data.barrier === "Single-parent vulnerability" ? "selected" : ""}>Single-parent vulnerability</option>
            <option value="Disability / Special needs" ${data.barrier === "Disability / Special needs" ? "selected" : ""}>Disability / Special needs</option>
            <option value="Orphan / Abandoned" ${data.barrier === "Orphan / Abandoned" ? "selected" : ""}>Orphan / Abandoned</option>
          </select>
        </div>
      `;
      profilesContainer.appendChild(card);
    }

    // Attach remove handlers
    profilesContainer.querySelectorAll(".btn-remove-child").forEach((btn) => {
      btn.addEventListener("click", () => {
        let curCount = parseInt(countInput?.value || "1", 10);
        if (curCount > 1) {
          renderChildCards(curCount - 1);
        }
      });
    });
  }

  addChildBtn?.addEventListener("click", () => {
    let curCount = parseInt(countInput?.value || "1", 10);
    if (curCount < 20) {
      renderChildCards(curCount + 1);
    } else {
      showToast("Maximum 20 children per batch report.");
    }
  });

  countInput?.addEventListener("change", (e) => renderChildCards(e.target.value));

  osscForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("rep-submit-btn");
    const successCard = document.getElementById("ossc-success-view");
    const refEl = document.getElementById("ossc-success-ref");

    const childProfiles = [];
    profilesContainer?.querySelectorAll(".child-card").forEach((c) => {
      childProfiles.push({
        name: c.querySelector(".child-name")?.value.trim() || "",
        gender: c.querySelector(".child-gender")?.value || "",
        age: c.querySelector(".child-age")?.value || "",
        barrier: c.querySelector(".child-barrier")?.value || ""
      });
    });

    const summaryText = childProfiles.map((cp, idx) =>
      `[Child ${idx + 1}: ${cp.name}, ${cp.gender}, age ${cp.age} (${cp.barrier})]`
    ).join("; ");

    const notes = [
      document.getElementById("rep-notes")?.value.trim(),
      childProfiles.length > 0 ? `Children Profile Details: ${summaryText}` : ""
    ].filter(Boolean).join(" | ");

    const payload = {
      reporterName: document.getElementById("rep-name")?.value.trim(),
      reporterPhone: document.getElementById("rep-phone")?.value.trim(),
      county: document.getElementById("rep-county")?.value,
      community: document.getElementById("rep-community")?.value.trim(),
      childCount: childProfiles.length || countInput?.value || 1,
      notes,
      children: childProfiles,
      consent: document.getElementById("rep-consent")?.checked || false
    };

    if (submitBtn) {
      submitBtn.setAttribute("disabled", "true");
      submitBtn.classList.add("is-loading");
    }

    try {
      const res = await window.UAF_DATA.submitOutOfSchoolReport(payload);
      if (res && res.ok) {
        osscForm.classList.add("is-hidden");
        if (successCard) successCard.classList.remove("is-hidden");
        if (refEl) refEl.textContent = res.submissionId || res.recordId || "NEW";
        showToast("Case submitted successfully with status NEW.");
      } else {
        showToast(res?.error || "Submission failed. Please retry.");
      }
    } catch (_) {
      showToast("Report queued offline.");
    } finally {
      if (submitBtn) {
        submitBtn.removeAttribute("disabled");
        submitBtn.classList.remove("is-loading");
      }
    }
  });

  document.getElementById("btn-ossc-another")?.addEventListener("click", () => {
    const successCard = document.getElementById("ossc-success-view");
    if (successCard) successCard.classList.add("is-hidden");
    if (osscForm) {
      osscForm.reset();
      osscForm.classList.remove("is-hidden");
      renderChildCards(1);
    }
  });

  /* ---------------------------------------------------------
     SEARCH DIALOG & HIDDEN ADMIN GATEWAY CONTROLLER
  --------------------------------------------------------- */
  const searchBackdrop = document.getElementById("search-dialog-backdrop");
  const searchCloseBtn = document.getElementById("search-dialog-close");
  const searchInput = document.getElementById("search-query-input");
  const searchResultsList = document.getElementById("search-results-list");

  function openSearchDialog() {
    if (!searchBackdrop) return;
    searchBackdrop.classList.remove("is-hidden");
    if (searchInput) {
      searchInput.value = "";
      setTimeout(() => searchInput.focus(), 100);
    }
    renderSearchResults("");
  }

  function closeSearchDialog() {
    if (!searchBackdrop) return;
    searchBackdrop.classList.add("is-hidden");
  }

  document.getElementById("btn-header-search")?.addEventListener("click", openSearchDialog);
  searchCloseBtn?.addEventListener("click", closeSearchDialog);
  searchBackdrop?.addEventListener("click", (e) => {
    if (e.target.id === "search-dialog-backdrop") closeSearchDialog();
  });

  function renderSearchResults(query) {
    if (!searchResultsList) return;
    const q = (query || "").trim().toLowerCase();
    const stories = (window.UAF_DATA && window.UAF_DATA.getStories) ? window.UAF_DATA.getStories() : [];

    const matchedStories = stories.filter((s) => {
      if (!q) return true;
      const text = `${s.title || ""} ${s.summary || ""} ${s.county || ""} ${s.community || ""} ${s.tag || ""}`.toLowerCase();
      return text.includes(q);
    }).slice(0, 6);

    let html = "";

    // Hidden Admin Portal gateway item - accessible via search
    const matchesAdmin = !q || "admin portal login staff backend dashboard manage".includes(q) || q.includes("adm") || q.includes("log") || q.includes("sta");
    if (matchesAdmin) {
      html += `
        <div class="search-result-item search-result-item--admin" data-action="go-admin">
          <strong>🔐 Admin Portal (Staff Login)</strong>
          <small>Authorized access for campaign editors, donation verifiers & institutional data desks.</small>
        </div>
      `;
    }

    if (matchedStories.length > 0) {
      html += matchedStories.map((s) => `
        <div class="search-result-item" data-story-id="${escapeHtml(s.id || s.storyId)}">
          <strong>${escapeHtml(s.title)}</strong>
          <small>${escapeHtml(s.county || "Liberia")} · ${escapeHtml(s.tag || "Campaign Case")}</small>
        </div>
      `).join("");
    } else if (!matchesAdmin) {
      html += `
        <div style="padding:16px;text-align:center;color:var(--ink-400);font-size:13px;">
          No matching stories found for "${escapeHtml(query)}".
        </div>
      `;
    }

    searchResultsList.innerHTML = html;

    // Click on Admin Portal
    searchResultsList.querySelectorAll("[data-action='go-admin']").forEach((item) => {
      item.addEventListener("click", () => {
        closeSearchDialog();
        window.location.href = "admin/index.html";
      });
    });

    // Click on story result
    searchResultsList.querySelectorAll("[data-story-id]").forEach((item) => {
      item.addEventListener("click", () => {
        const sId = item.dataset.storyId;
        closeSearchDialog();
        navigateTo("donate");
        setTimeout(() => openStoryModal(sId), 300);
      });
    });
  }

  searchInput?.addEventListener("input", (e) => {
    renderSearchResults(e.target.value);
  });

  /* ---------------------------------------------------------
     TIMED DONATION ENGAGEMENT POPUP CONTROLLER
  --------------------------------------------------------- */
  const engagementModal = document.getElementById("donation-engagement-modal");
  const engagementCloseBtn = document.getElementById("donation-engagement-close");
  const engagementDismissBtn = document.getElementById("btn-engagement-dismiss");
  const engagementDonateBtn = document.getElementById("btn-engagement-donate");

  function closeEngagementModal() {
    if (engagementModal) engagementModal.classList.add("is-hidden");
  }

  function triggerEngagementPopup() {
    if (!engagementModal) return;
    if (sessionStorage.getItem("uaf_engagement_seen")) return;
    sessionStorage.setItem("uaf_engagement_seen", "true");
    engagementModal.classList.remove("is-hidden");
  }

  engagementCloseBtn?.addEventListener("click", closeEngagementModal);
  engagementDismissBtn?.addEventListener("click", closeEngagementModal);
  engagementModal?.addEventListener("click", (e) => {
    if (e.target.id === "donation-engagement-modal") closeEngagementModal();
  });

  engagementDonateBtn?.addEventListener("click", () => {
    closeEngagementModal();
    navigateTo("donate", "donation-section");
  });

  // Trigger popup after 45 seconds of active browsing
  setTimeout(triggerEngagementPopup, 45000);

  /* ---------------------------------------------------------
     PWA INSTALLATION PROMPT
  --------------------------------------------------------- */
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  const installGuide = document.getElementById("install-guide-backdrop");
  document.querySelectorAll("[data-action='install']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
      } else if (installGuide) {
        installGuide.classList.remove("is-hidden");
      } else {
        showToast("To install, use your browser's menu -> 'Add to Home Screen'.");
      }
    });
  });

  document.getElementById("install-guide-close")?.addEventListener("click", () => {
    installGuide?.classList.add("is-hidden");
  });
  installGuide?.addEventListener("click", (e) => {
    if (e.target.id === "install-guide-backdrop") installGuide.classList.add("is-hidden");
  });

  /* ---------------------------------------------------------
     APP INITIALIZATION
  --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderAmountChips();
    renderChildCards(1);
    handleHashChange();
  });

})();
