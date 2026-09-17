/* =========================================================
   UAF IMPACT — LIVE PUBLIC DATA (Phase 2 + 4 + 7 + 8)
   ---------------------------------------------------------
   Fetches CONFIG.API_URL, caches the result in memory, and
   populates live numbers/tables. Never invents a number:
   if a value truly isn't there, the placeholder / empty-state
   stays exactly as built.

   - Out-of-school reporting (#report-form) -> Phase 4
   - Public photo carousel (#publicPhotos) -> Phase 7
   - Funding summary & donation submission (#donation-form) -> Phase 8
   - MTN MoMo server polling (#createMomoDonation) -> Phase 9
   ========================================================= */

(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";
  const isConfigured = API_URL && !API_URL.includes("PASTE_YOUR");

  let publicData = null;      // { counties, communities, funding, generatedAt }
  let publicPhotos = [];      // [{ photoId, title, caption, category, county, community, program, photoDate, imageUrl }]
  let fundingSummary = null;  // { totalVerifiedUSD, verifiedDonationCount, uniqueSupporterCount }

  /* ---------------------------------------------------------
     FETCH — PUBLIC DATA
  --------------------------------------------------------- */
  async function loadPublicData() {
    if (!isConfigured) {
      console.warn("UAF Impact: API_URL not set in config.js yet — showing Phase 1 empty states.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}?route=publicData`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown API error");
      publicData = json;
      renderAll();
    } catch (err) {
      console.error("UAF Impact: failed to load public data.", err);
    }
  }

  /* ---------------------------------------------------------
     FETCH — PUBLIC PHOTOS (Phase 7)
  --------------------------------------------------------- */
  async function loadPublicPhotos() {
    if (!isConfigured) return;
    try {
      const res = await fetch(`${API_URL}?route=publicPhotos`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown API error");
      publicPhotos = json.photos || [];
      renderCarousel(publicPhotos);
    } catch (err) {
      console.error("UAF Impact: failed to load public photos.", err);
    }
  }

  /* ---------------------------------------------------------
     FETCH — FUNDING SUMMARY (Phase 8)
  --------------------------------------------------------- */
  async function loadFundingSummary() {
    if (!isConfigured) return;
    try {
      const res = await fetch(`${API_URL}?route=fundingSummary`);
      const json = await res.json();
      if (json.ok) {
        fundingSummary = json;
        renderFundingGap();
        renderImpactDashboard();
      }
    } catch (err) {
      console.error("UAF Impact: failed to load funding summary.", err);
    }
  }

  /* ---------------------------------------------------------
     FILTER STATE
  --------------------------------------------------------- */
  function currentFilter(scopeEl) {
    const countySel = scopeEl.querySelector('[data-role="county-select"]');
    const yearSel = scopeEl.querySelector('[data-role="year-select"]');
    return {
      county: countySel ? countySel.value : "",
      year: yearSel ? yearSel.value : ""
    };
  }

  function filterCommunities(filter) {
    if (!publicData) return [];
    return publicData.communities.filter((c) => {
      if (filter.county && c.county !== filter.county) return false;
      if (filter.year && c.year !== filter.year) return false;
      return true;
    });
  }

  function sum(list, key) {
    return list.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  }

  function fmt(n) {
    return Number(n).toLocaleString("en-US");
  }

  function fmtUSD(n) {
    return "$" + Number(n).toLocaleString("en-US");
  }

  function fmtDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit"
    });
  }

  /* ---------------------------------------------------------
     RENDER — HOME SNAPSHOT
  --------------------------------------------------------- */
  function renderHomeSnapshot() {
    const screen = document.querySelector('[data-screen="home"]');
    if (!screen || !publicData) return;

    const filter = currentFilter(screen);
    const rows = filterCommunities(filter);
    const notice = document.getElementById("selector-notice");
    const cards = screen.querySelectorAll(".snapshot-grid .snapshot-card__value");

    if (!rows.length) {
      if (notice && (filter.county || filter.year)) notice.classList.remove("is-hidden");
      return;
    }
    if (notice) notice.classList.add("is-hidden");

    const identified = sum(rows, "outOfSchoolIdentified");
    const supported = sum(rows, "supportedReenrolled");
    const yetToEnroll = sum(rows, "yetToEnroll");
    const population = sum(rows, "childPopulation");
    const hasRate = population > 0;
    const rate = hasRate ? ((identified / population) * 100).toFixed(1) + "%" : null;

    const values = [fmt(identified), rate, fmt(supported), fmt(yetToEnroll)];
    cards.forEach((el, i) => {
      if (values[i] === null || values[i] === undefined) return;
      el.textContent = values[i];
      el.classList.remove("is-empty");
    });

    stampMeta(screen, rows);
  }

  /* ---------------------------------------------------------
     RENDER — PHOTO CAROUSEL (Phase 7)
  --------------------------------------------------------- */
  function renderCarousel(photos) {
    const track = document.querySelector(".carousel__track");
    if (!track || !photos || !photos.length) return;

    track.innerHTML = "";
    photos.forEach((p) => {
      const slide = document.createElement("div");
      slide.className = "carousel__slide carousel__slide--photo";
      const img = document.createElement("img");
      img.src = p.imageUrl;
      img.loading = "lazy";
      img.alt = p.title || p.caption || "UAF field photograph";
      slide.appendChild(img);

      const captionText = [p.title, [p.community, p.county].filter(Boolean).join(", ")]
        .filter(Boolean).join(" — ");
      if (captionText) {
        const caption = document.createElement("div");
        caption.className = "carousel__caption";
        caption.textContent = captionText;
        slide.appendChild(caption);
      }
      track.appendChild(slide);
    });

    window.__uafReinitCarousel && window.__uafReinitCarousel();
  }

  /* ---------------------------------------------------------
     RENDER — IMPACT DASHBOARD
  --------------------------------------------------------- */
  function renderImpactDashboard() {
    const screen = document.querySelector('[data-screen="impact"]');
    if (!screen || !publicData) return;

    const filter = currentFilter(screen);
    const rows = filterCommunities(filter);
    const metricEls = screen.querySelectorAll(".metric-grid .metric-card__value");

    if (rows.length) {
      const neededTotal = sum(rows, "amountNeeded");
      const generatedTotal = fundingSummary
        ? fundingSummary.totalVerifiedUSD
        : sum(rows, "amountGenerated");

      const progress = neededTotal > 0
        ? Math.min(100, Math.round((generatedTotal / neededTotal) * 100)) + "%"
        : null;

      const values = [
        fmt(sum(rows, "outOfSchoolIdentified")),
        fmt(sum(rows, "supportedReenrolled")),
        fmt(sum(rows, "supportedReenrolled")),
        fmt(sum(rows, "enrolled")),
        fmt(sum(rows, "yetToEnroll")),
        fmt(sum(rows, "underMonitoring")),
        fmt(new Set(rows.map((r) => r.county + "|" + r.community)).size),
        progress
      ];
      metricEls.forEach((el, i) => {
        if (values[i] === null || values[i] === undefined) return;
        el.textContent = values[i];
        el.classList.add("is-live");
      });
      stampMeta(screen, rows);
    }

    renderCommunityTable(screen.querySelector(".data-table tbody"), rows, "impact");
  }

  /* ---------------------------------------------------------
     RENDER — COMMUNITIES SCREEN
  --------------------------------------------------------- */
  function renderCommunitiesScreen() {
    const screen = document.querySelector('[data-screen="communities"]');
    if (!screen || !publicData) return;

    const filter = currentFilter(screen);
    const rows = filterCommunities(filter);
    renderCommunityTable(screen.querySelector(".data-table tbody"), rows, "communities");
  }

  function renderCommunityTable(tbody, rows, variant) {
    if (!tbody) return;
    if (!rows.length) return;

    tbody.innerHTML = "";
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      if (variant === "impact") {
        const gap = Math.max(0, (r.amountNeeded || 0) - (r.amountGenerated || 0));
        tr.innerHTML = `
          <td>${escapeHtml_(r.community)}</td>
          <td>${fmt(r.outOfSchoolIdentified)}</td>
          <td>${fmt(r.supportedReenrolled)}</td>
          <td>${fmt(r.yetToEnroll)}</td>
          <td>${fmtUSD(r.amountGenerated)}</td>
          <td>${fmtUSD(r.amountNeeded)}</td>
          <td>${fmtUSD(gap)}</td>`;
      } else {
        tr.innerHTML = `
          <td>${escapeHtml_(r.community)}</td>
          <td>${escapeHtml_(r.county)}</td>
          <td>${fmt(r.outOfSchoolIdentified)}</td>
          <td>${fmt(r.supportedReenrolled)}</td>
          <td><span class="pill pill--verified">${escapeHtml_(r.status)}</span></td>`;
      }
      tbody.appendChild(tr);
    });
  }

  /* ---------------------------------------------------------
     RENDER — FUNDING GAP CARD (Home)
  --------------------------------------------------------- */
  function renderFundingGap() {
    if (!publicData || !publicData.funding) return;
    const card = document.querySelector(".funding-card");
    if (!card) return;

    const f = publicData.funding;
    // Spec §8.5: Use verified total from fundingSummary if available
    const verifiedTotal = (fundingSummary && typeof fundingSummary.totalVerifiedUSD === "number")
      ? fundingSummary.totalVerifiedUSD
      : f.totalGeneratedUSD;

    const totalNeeded = f.totalNeededUSD;

    const rows = card.querySelectorAll(".funding-row strong");
    if (rows[0]) rows[0].textContent = fmtUSD(verifiedTotal);
    if (rows[1]) rows[1].textContent = fmtUSD(totalNeeded);

    const fill = card.querySelector(".funding-bar-fill");
    if (fill && totalNeeded > 0) {
      fill.style.width = Math.min(100, Math.round((verifiedTotal / totalNeeded) * 100)) + "%";
    }

    const meta = card.querySelector("[data-last-updated]");
    const stamped = fmtDate(fundingSummary?.generatedAt || f.lastUpdated);
    if (meta && stamped) meta.textContent = "Last updated: " + stamped;
  }

  /* ---------------------------------------------------------
     LAST-UPDATED STAMPS
  --------------------------------------------------------- */
  function stampMeta(screen, rows) {
    const latest = rows.reduce((max, r) => {
      if (!r.lastUpdated) return max;
      const d = new Date(r.lastUpdated);
      return !max || d > max ? d : max;
    }, null);
    if (!latest) return;
    screen.querySelectorAll("[data-last-updated]").forEach((el) => {
      el.textContent = "Last updated: " + fmtDate(latest.toISOString());
    });
  }

  function renderAll() {
    renderHomeSnapshot();
    renderImpactDashboard();
    renderCommunitiesScreen();
    renderFundingGap();
  }

  /* ---------------------------------------------------------
     RE-FILTER ON SELECTOR CHANGE
  --------------------------------------------------------- */
  function bindFilterListeners() {
    document.querySelectorAll('[data-role="county-select"], [data-role="year-select"]')
      .forEach((el) => el.addEventListener("change", renderAll));
  }

  /* ---------------------------------------------------------
     OUT-OF-SCHOOL REPORT FORM (Phase 4)
  --------------------------------------------------------- */
  function initReportForm() {
    const form = document.getElementById("report-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!isConfigured) {
        window.__uafShowToast?.("Submissions aren't connected yet — try again soon.");
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const payload = {
        action: "submitOutOfSchoolReport",
        reporterName: form.reporterName.value.trim(),
        reporterPhone: form.reporterPhone.value.trim(),
        county: form.county.value.trim(),
        community: form.community.value.trim(),
        childCount: Number(form.childCount.value),
        notes: form.notes.value.trim(),
        consent: document.getElementById("rep-consent").checked
      };

      submitBtn?.setAttribute("disabled", "true");
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.ok) {
          window.__uafShowToast?.(json.message || "Submitted for verification. Thank you.");
          form.reset();
        } else {
          window.__uafShowToast?.(json.error || "Couldn't submit — please check the form and try again.");
        }
      } catch (err) {
        window.__uafShowToast?.("Couldn't reach the server. Please check your connection and try again.");
      } finally {
        submitBtn?.removeAttribute("disabled");
      }
    });
  }

  /* ---------------------------------------------------------
     DONATION FORM — REAL SUBMISSION (Phase 8 + 9)
  --------------------------------------------------------- */
  function initDonationForm() {
    const form = document.getElementById("donation-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!isConfigured) {
        window.__uafShowToast?.("Donations aren't connected yet — try again soon.");
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');

      // Amount: selected chip or custom input
      let amount = 0;
      const selectedChip = document.querySelector(".amount-chip.is-selected");
      if (selectedChip) {
        if (selectedChip.dataset.amount === "custom") {
          const customInput = document.getElementById("custom-amount");
          amount = Number(customInput?.value || 0);
        } else {
          amount = Number(selectedChip.dataset.amount || 0);
        }
      }

      if (!amount || amount <= 0) {
        window.__uafShowToast?.("Please select or enter a valid donation amount.");
        return;
      }

      // Payment method
      const selectedMethodEl = document.querySelector(".payment-method.is-selected");
      const paymentMethod = selectedMethodEl?.dataset.method || "momo";

      const name = document.getElementById("don-name")?.value.trim() || "";
      const phone = document.getElementById("don-phone")?.value.trim() || "";
      const email = document.getElementById("don-email")?.value.trim() || "";
      const country = document.getElementById("don-country")?.value.trim() || "Liberia";
      const message = document.getElementById("don-message")?.value.trim() || "";
      const anonymous = document.getElementById("don-anon")?.checked || false;
      const consent = document.getElementById("don-consent")?.checked || false;

      if (!name || !phone || !consent) {
        window.__uafShowToast?.("Full name, phone, and communication consent are required.");
        return;
      }

      submitBtn?.setAttribute("disabled", "true");
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Processing...";

      try {
        const actionName = paymentMethod === "momo" ? "createMomoDonation" : "createDonation";
        const payload = {
          action: actionName,
          name, phone, email, country,
          amount, paymentMethod,
          message, anonymous, consent
        };

        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (json.ok) {
          form.reset();
          document.querySelectorAll(".amount-chip").forEach((c) => c.classList.remove("is-selected"));
          const customInput = document.getElementById("custom-amount");
          if (customInput) {
            customInput.value = "";
            customInput.setAttribute("disabled", "true");
          }

          if (json.pendingMomo && json.transactionId) {
            window.__uafShowToast?.("Prompt sent to phone. Ref: " + json.transactionId);
            pollMomoPaymentStatus(json.transactionId, phone);
          } else {
            window.__uafShowToast?.(json.message || `Donation Ref: ${json.transactionId}. Awaiting verification.`);
          }
          loadFundingSummary();
        } else {
          window.__uafShowToast?.(json.error || "Could not submit donation. Please try again.");
        }
      } catch (err) {
        window.__uafShowToast?.("Network error. Please check your connection and try again.");
      } finally {
        submitBtn?.removeAttribute("disabled");
        submitBtn.textContent = originalText;
      }
    });
  }

  function pollMomoPaymentStatus(transactionId, phone) {
    let attempts = 0;
    const maxAttempts = 15;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        window.__uafShowToast?.("Verification pending. Check reference: " + transactionId);
        return;
      }
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "checkMomoStatus", transactionId, phone })
        });
        const json = await res.json();
        if (json.ok && json.status === "VERIFIED") {
          clearInterval(interval);
          window.__uafShowToast?.("Donation verified! Thank you for supporting a child.");
          loadFundingSummary();
        } else if (json.ok && json.status === "FAILED") {
          clearInterval(interval);
          window.__uafShowToast?.("Payment declined or timed out on mobile.");
        }
      } catch (e) {}
    }, 4000);
  }

  /* ---------------------------------------------------------
     HTML ESCAPING
  --------------------------------------------------------- */
  function escapeHtml_(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* ---------------------------------------------------------
     INIT — called from app.js after shell is ready
  --------------------------------------------------------- */
  window.__uafDataInit = function () {
    initReportForm();
    initDonationForm();
    bindFilterListeners();
    loadPublicData();
    loadPublicPhotos();
    loadFundingSummary();
  };
})();
