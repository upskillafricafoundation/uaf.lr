/* =========================================================
   UAF CAMPAIGN DRIVE — DATA LAYER & OFFLINE-FIRST ENGINE
   =========================================================
   Covers:
   - Live Campaign Stories fetching & local storage caching
   - Direct-to-database form submission handlers (Donate, Evidence, OSSC)
   - Offline queue with deduplication & auto-sync on reconnect
   - Story reactions & reader counter storage
   ========================================================= */

(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatMoney(num) {
    const n = Number(num) || 0;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ---------------------------------------------------------
     STORIES DATA STORAGE & RETRIEVAL
  --------------------------------------------------------- */
  function getUafStories() {
    try {
      const stored = localStorage.getItem("uaf_stories");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  }
  window.__uafGetStories = getUafStories;

  function saveUafStories(list) {
    try {
      localStorage.setItem("uaf_stories", JSON.stringify(list));
    } catch (_) {}
  }

  window.__uafGetStory = function (storyId) {
    if (!storyId) return null;
    const clean = String(storyId).trim().toLowerCase();
    const list = getUafStories();
    return list.find((s) => {
      const sId = String(s.id || s.storyId || "").trim().toLowerCase();
      const sCode = String(s.shareCode || "").trim().toLowerCase();
      return sId === clean || sCode === clean;
    }) || null;
  };

  /* ---------------------------------------------------------
     FETCH LIVE STORIES FROM BACKEND (with intelligent merge)
  --------------------------------------------------------- */
  async function fetchPublicStories() {
    if (!API_URL) {
      renderFundraisingStories();
      return;
    }

    try {
      const res = await fetch(API_URL + "?route=publicStories&t=" + Date.now(), {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      const data = await res.json();

      if (data && data.ok && Array.isArray(data.stories)) {
        const local = getUafStories();
        const mergedMap = new Map();

        // Populate local first
        local.forEach((s) => {
          const id = String(s.id || s.storyId || "").trim();
          if (id) mergedMap.set(id, s);
        });

        // Merge remote updates (progress, raised, goal, published status)
        data.stories.forEach((rem) => {
          const id = String(rem.id || rem.storyId || "").trim();
          if (!id) return;
          const loc = mergedMap.get(id);
          if (loc) {
            // Keep local image if remote is placeholder logo
            const remImg = rem.imageUrl || "";
            const isRemLogo = remImg.includes("uaf-logo.png") || !remImg;
            const useImg = (isRemLogo && loc.imageUrl && !loc.imageUrl.includes("uaf-logo.png"))
              ? loc.imageUrl
              : (rem.imageUrl || loc.imageUrl || "assets/uaf-logo.png");

            mergedMap.set(id, Object.assign({}, loc, rem, {
              imageUrl: useImg,
              narrative: (rem.narrative && rem.narrative.length >= (loc.narrative || "").length) ? rem.narrative : (loc.narrative || rem.content || "")
            }));
          } else {
            mergedMap.set(id, rem);
          }
        });

        const finalList = Array.from(mergedMap.values());
        saveUafStories(finalList);
      }
    } catch (err) {
      console.warn("Notice: Fetching remote stories failed, using cached stories.", err);
    } finally {
      renderFundraisingStories();
      populateStorySelectDropdown();
    }
  }
  window.__uafFetchPublicStories = fetchPublicStories;

  /* ---------------------------------------------------------
     RENDER CAMPAIGN STORIES CARDS & PROGRESS BARS
  --------------------------------------------------------- */
  function renderFundraisingStories() {
    const grid = document.getElementById("fundraising-stories-grid");
    if (!grid) return;

    const stories = getUafStories().filter((s) => String(s.status || "PUBLISHED").toUpperCase() === "PUBLISHED");
    const statusText = document.getElementById("carousel-status-text");
    const pulseDot = document.getElementById("carousel-pulse-dot");
    const prevBtn = document.getElementById("carousel-prev-btn");
    const nextBtn = document.getElementById("carousel-next-btn");
    const progressTrack = document.querySelector(".stories-carousel-progress-track");

    if (stories.length === 0) {
      if (statusText) statusText.textContent = "0 Active Campaigns";
      if (pulseDot) pulseDot.style.display = "none";
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
      if (progressTrack) progressTrack.style.display = "none";

      grid.innerHTML = `
        <div class="stories-empty-state">
          <div class="empty-icon-wrap">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <h3>No Active Campaigns at This Time</h3>
          <p>Community impact cases and child education appeals will appear here immediately once published by UAF administrators.</p>
        </div>
      `;
      return;
    }

    if (pulseDot) pulseDot.style.display = "";
    if (prevBtn) prevBtn.style.display = "";
    if (nextBtn) nextBtn.style.display = "";
    if (progressTrack) progressTrack.style.display = "";

    let viewsMap = {};
    try {
      viewsMap = JSON.parse(localStorage.getItem("uaf_story_views") || "{}");
    } catch (_) {}

    grid.innerHTML = stories.map((s) => {
      const storyId = s.id || s.storyId;
      const raised = Number(s.raised != null ? s.raised : (s.amountRaised || 0));
      const goal = Number(s.goal != null ? s.goal : (s.fundingGoal || s.goalUsd || 0));
      const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
      const views = (viewsMap[storyId] != null ? viewsMap[storyId] : (s.views || 0));
      const shareCode = s.shareCode || String(storyId).replace("UAF-STORY-", "");
      const shareUrl = `${window.location.origin}${window.location.pathname}#/c/${encodeURIComponent(shareCode)}`;

      return `
        <div class="campaign-card" data-story-id="${escapeHtml(storyId)}" data-share-code="${escapeHtml(shareCode)}">
          <div class="campaign-card__img-wrap">
            <img src="${s.imageUrl || 'assets/uaf-logo.png'}" alt="${escapeHtml(s.title)}" class="campaign-card__img" onerror="this.src='assets/uaf-logo.png';" />
            <div class="campaign-card__views-badge">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span class="story-views-count" data-story-views="${escapeHtml(storyId)}">${views} read${views === 1 ? "" : "s"}</span>
            </div>
            <button type="button" class="btn-story-share-dots" data-share-url="${escapeHtml(shareUrl)}" title="Copy short link" aria-label="Share story link">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
          </div>

          <div class="campaign-card__body">
            <div class="campaign-card__tag-wrap">
              <span class="campaign-card__tag">${escapeHtml(s.tag || s.category || "Field Story")}</span>
              <span class="campaign-card__location">${escapeHtml(s.community ? s.community + ", " : "")}${escapeHtml(s.county || "Liberia")}</span>
            </div>

            <h3 class="campaign-card__title">${escapeHtml(s.title)}</h3>
            <p class="campaign-card__lead">${escapeHtml(s.summary || "")}</p>

            <!-- Funding Progress Bar: Raised of Goal -->
            <div class="campaign-card__funding-box">
              <div class="campaign-card__meta">
                <span class="raised-val">${formatMoney(raised)} <small>raised</small></span>
                <span class="goal-val">of ${formatMoney(goal)} goal</span>
              </div>
              <div class="funding-track-custom">
                <div class="funding-fill-custom" style="width: ${pct}%;"></div>
              </div>
              <div class="funding-pct-row">
                <span>Progress</span>
                <strong>${pct}% Funded</strong>
              </div>
            </div>

            <!-- Card Action Buttons -->
            <div class="campaign-card__actions">
              <button type="button" class="btn-card-donate" data-story-id="${escapeHtml(storyId)}" data-story-title="${escapeHtml(s.title)}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span>Donate</span>
              </button>
              <button type="button" class="btn-card-readmore" data-story-id="${escapeHtml(storyId)}">
                <span>Read Story &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    if (window.__uafInitStoryCarousel) {
      window.__uafInitStoryCarousel();
    }
  }

  function populateStorySelectDropdown() {
    const select = document.getElementById("don-story-select");
    if (!select) return;
    const stories = getUafStories().filter((s) => String(s.status || "PUBLISHED").toUpperCase() === "PUBLISHED");
    const currentVal = select.value;

    select.innerHTML = '<option value="General Support">General Support — Area of Greatest Need</option>';
    stories.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id || s.storyId;
      opt.textContent = `${s.title} (${formatMoney(s.raised || s.amountRaised || 0)} of ${formatMoney(s.goal || s.fundingGoal || 0)})`;
      select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
  }

  /* ---------------------------------------------------------
     OFFLINE QUEUE & DEDUPLICATION ENGINE
  --------------------------------------------------------- */
  function getOfflineQueue() {
    try {
      return JSON.parse(localStorage.getItem("uaf_offline_queue") || "[]");
    } catch (_) {
      return [];
    }
  }

  function saveOfflineQueue(q) {
    try {
      localStorage.setItem("uaf_offline_queue", JSON.stringify(q));
    } catch (_) {}
    updateOfflineQueueBadge();
  }

  function updateOfflineQueueBadge() {
    const badge = document.getElementById("offline-sync-badge");
    const q = getOfflineQueue();
    if (!badge) return;
    if (q.length > 0) {
      badge.textContent = `${q.length} queued`;
      badge.classList.remove("is-hidden");
    } else {
      badge.classList.add("is-hidden");
    }
  }

  function queueOfflineDraft(action, payload) {
    const q = getOfflineQueue();
    const requestId = "REQ-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const item = {
      action,
      payload: Object.assign({}, payload, { requestId }),
      queuedAt: new Date().toISOString()
    };
    q.push(item);
    saveOfflineQueue(q);
    return item;
  }

  async function syncOfflineQueue() {
    if (!navigator.onLine || !API_URL) return;
    const q = getOfflineQueue();
    if (q.length === 0) return;

    const banner = document.getElementById("status-banner");
    const textEl = document.getElementById("status-banner-text");
    if (banner) banner.classList.add("is-visible");
    if (textEl) textEl.textContent = `Online — syncing ${q.length} saved offline draft(s)...`;

    const remaining = [];
    for (const item of q) {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(Object.assign({ action: item.action }, item.payload))
        });
        const result = await res.json();
        if (!result.ok && !result.message?.includes("already received")) {
          remaining.push(item);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    saveOfflineQueue(remaining);

    if (remaining.length === 0) {
      if (textEl) textEl.textContent = "All drafts synced successfully to UAF database!";
      setTimeout(() => {
        if (banner) banner.classList.remove("is-visible");
      }, 4000);
      fetchPublicStories();
    } else {
      if (textEl) textEl.textContent = `${remaining.length} draft(s) pending reconnect.`;
    }
  }
  window.__uafSyncOfflineQueue = syncOfflineQueue;
  window.addEventListener("online", syncOfflineQueue);

  /* ---------------------------------------------------------
     DIRECT FORM SUBMISSION HANDLERS
  --------------------------------------------------------- */
  async function submitDirect(action, payload) {
    if (!navigator.onLine) {
      const queued = queueOfflineDraft(action, payload);
      return {
        ok: true,
        offline: true,
        recordId: queued.payload.requestId,
        message: "Offline: Your submission is saved on your device and will automatically send when you reconnect."
      };
    }

    const clientReqId = "REQ-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const bodyPayload = Object.assign({ action, requestId: clientReqId }, payload);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(bodyPayload)
    });
    const result = await res.json();
    return result;
  }

  window.UAF_DATA = {
    fetchPublicStories,
    getStories: getUafStories,
    getStory: window.__uafGetStory,
    submitDonation: (payload) => submitDirect("createDonation", payload),
    submitEvidenceRequest: (payload) => submitDirect("submitEvidenceRequest", payload),
    submitOutOfSchoolReport: (payload) => submitDirect("submitOutOfSchoolReport", payload),
    syncOfflineQueue
  };

  // Initialize on load
  document.addEventListener("DOMContentLoaded", () => {
    updateOfflineQueueBadge();
    fetchPublicStories();
  });
})();
