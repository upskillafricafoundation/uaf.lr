/* =========================================================
   UAF IMPACT — LIVE PUBLIC DATA (Phase 2 + Phase 4)
   ---------------------------------------------------------
   Fetches CONFIG.API_URL once, caches the result in memory,
   and fills in the numbers/tables that Phase 1 left as em-
   dash placeholders. Never invents a number: if a value truly
   isn't there, the placeholder / empty-state stays exactly as
   Phase 1 built it.

   Also owns #report-form's submit — the out-of-school data
   submission — which now actually POSTs to the backend as a
   DRAFT pending UAF verification.

   Nothing here changes markup structure, IDs, or classes from
   Phase 1. Phase 3's Communities filtering and Phase 8/9's
   donation flow plug into this same fetch layer later.
   ========================================================= */

(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";
  const isConfigured = API_URL && !API_URL.includes("PASTE_YOUR");

  let publicData = null; // { counties, communities, funding, generatedAt }
  let publicPhotos = []; // Phase 7: [{ photoId, title, caption, category, county, community, program, photoDate, imageUrl }]

  /* ---------------------------------------------------------
     FETCH
  --------------------------------------------------------- */
  async function loadPublicData() {
    if (!isConfigured) {
      console.warn("UAF Impact: API_URL not set in config.js yet — showing Phase 1 empty states.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}?route=publicData`, { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown API error");
      publicData = json;
      renderAll();
    } catch (err) {
      // Network/API failure stays silent to the user — Phase 1's
      // existing empty states already communicate "no data yet",
      // and the offline banner covers connectivity loss.
      console.error("UAF Impact: failed to load public data.", err);
    }
  }

  /* ---------------------------------------------------------
     FETCH — PUBLIC PHOTOS (Phase 7)
     Separate route, separate failure mode: if this fails, the
     Home screen simply keeps Phase 1's placeholder carousel
     slide exactly as it was — publicData's own render path is
     never affected by a photo-fetch failure or vice versa.
  --------------------------------------------------------- */
  async function loadPublicPhotos() {
    if (!isConfigured) return;
    try {
      const res = await fetch(`${API_URL}?route=publicPhotos`, { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown API error");
      publicPhotos = json.photos || [];
      renderCarousel(publicPhotos);
    } catch (err) {
      console.error("UAF Impact: failed to load public photos.", err);
    }
  }

  /* ---------------------------------------------------------
     FILTER STATE — read whatever the visible county/year
     selects currently say, per screen.
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
      return; // leave Phase 1's em-dash placeholders as-is
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
     Reuses the EXACT .carousel__track / .carousel__slide /
     .carousel__dot markup and classes app.js's initCarousel()
     already animates. If zero photos are returned, Phase 1's
     existing placeholder slide is left exactly as-is — the
     track is never emptied into a blank carousel.
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

    // Re-run app.js's own carousel init against the new slide set —
    // see the __uafReinitCarousel note in app.js. Its logic is
    // untouched; this just re-triggers it now that real slides exist.
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
      const funding = { generated: sum(rows, "amountGenerated"), needed: sum(rows, "amountNeeded") };
      const progress = funding.needed > 0
        ? Math.min(100, Math.round((funding.generated / funding.needed) * 100)) + "%"
        : null;

      const values = [
        fmt(sum(rows, "outOfSchoolIdentified")),
        fmt(sum(rows, "supportedReenrolled")),
        fmt(sum(rows, "supportedReenrolled")), // re-enrolled tracked together with supported in CommunityStats
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
    if (!rows.length) return; // keep Phase 1's "No verified community data" row

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

    const { totalGeneratedUSD, totalNeededUSD, lastUpdated } = publicData.funding;
    if (!totalGeneratedUSD && !totalNeededUSD) return; // no verified funding rows yet — keep placeholders

    const rows = card.querySelectorAll(".funding-row strong");
    if (rows[0]) rows[0].textContent = fmtUSD(totalGeneratedUSD);
    if (rows[1]) rows[1].textContent = fmtUSD(totalNeededUSD);

    const fill = card.querySelector(".funding-bar-fill");
    if (fill && totalNeededUSD > 0) {
      fill.style.width = Math.min(100, Math.round((totalGeneratedUSD / totalNeededUSD) * 100)) + "%";
    }

    const meta = card.querySelector("[data-last-updated]");
    const stamped = fmtDate(lastUpdated);
    if (meta && stamped) meta.textContent = "Last updated: " + stamped;
  }

  /* ---------------------------------------------------------
     LAST-UPDATED STAMPS (per screen, based on visible rows)
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
     Phase 1's app.js already populates these selects; we just
     also listen for changes to re-render with live data.
  --------------------------------------------------------- */
  function bindFilterListeners() {
    document.querySelectorAll('[data-role="county-select"], [data-role="year-select"]')
      .forEach((el) => el.addEventListener("change", renderAll));
  }

  /* ---------------------------------------------------------
     OUT-OF-SCHOOL REPORT FORM — real submission
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
          headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight to Apps Script
          cache: "no-store", // Apps Script's redirect target is single-use/ephemeral — never let the browser reuse a cached one
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
       window.__uafDataInit = function () {
    initReportForm();
    initDonationForm();
    bindFilterListeners();
    loadPublicData();
    loadPublicPhotos();
  };
  }

  /* ---------------------------------------------------------
     HTML ESCAPING for anything rendered from API data
  --------------------------------------------------------- */
  function escapeHtml_(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* ---------------------------------------------------------
     INIT — called from app.js after the shell is ready
  --------------------------------------------------------- */
  window.__uafDataInit = function () {
    initReportForm();
    bindFilterListeners();
    loadPublicData();

       /* ---------------------------------------------------------
     DONATION FORM — real submission (Phase 8, manual MTN
     transfer path only; MOMO is rejected server-side until
     Phase 9 wires the live MTN Collection API)
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

      const selectedChip = document.querySelector(".amount-chip.is-selected");
      const customInput = document.getElementById("custom-amount");
      let amount = null;
      if (selectedChip && selectedChip.dataset.amount !== "custom") {
        amount = Number(selectedChip.dataset.amount);
      } else if (customInput && !customInput.disabled) {
        amount = Number(customInput.value);
      }
      if (!amount || amount <= 0) {
        window.__uafShowToast?.("Please select or enter a donation amount.");
        return;
      }

      const selectedMethod = document.querySelector(".payment-method.is-selected");
      const method = selectedMethod?.dataset.method === "momo" ? "MOMO" : "MANUAL";

      const payload = {
        action: "submitDonation",
        name: document.getElementById("don-name").value.trim(),
        phone: document.getElementById("don-phone").value.trim(),
        email: document.getElementById("don-email").value.trim(),
        country: document.getElementById("don-country").value.trim(),
        amount: amount,
        paymentMethod: method,
        anonymous: document.getElementById("don-anon").checked,
        message: document.getElementById("don-message").value.trim(),
        consent: document.getElementById("don-consent").checked
      };

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn?.setAttribute("disabled", "true");
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          cache: "no-store",
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.ok) {
          window.__uafShowToast?.(json.message || "Thank you — your donation has been recorded.");
          form.reset();
          document.querySelectorAll(".amount-chip").forEach((c) => c.classList.remove("is-selected"));
          if (customInput) customInput.setAttribute("disabled", "true");
        } else {
          window.__uafShowToast?.(json.error || "Couldn't record your donation — please check the form and try again.");
        }
      } catch (err) {
        window.__uafShowToast?.("Couldn't reach the server. Please check your connection and try again.");
      } finally {
        submitBtn?.removeAttribute("disabled");
      }
    });
  }
    loadPublicPhotos();
  };
})();
