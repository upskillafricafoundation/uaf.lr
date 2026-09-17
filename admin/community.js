/* =========================================================
   UAF IMPACT — ADMIN: COMMUNITY DATA & OUT-OF-SCHOOL REPORTS
   ---------------------------------------------------------
   Handles reviewing field submissions for out-of-school children
   and maintaining verified community-level statistics.
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  const ROLE_CAN = {
    REVIEW_SUBMISSIONS: ["SUPER_ADMIN", "ADMIN", "VERIFIER"],
    MANAGE_STATS: ["SUPER_ADMIN", "ADMIN", "PROGRAM_MANAGER", "VERIFIER"]
  };

  function can(perm, role) {
    if (role === "SUPER_ADMIN") return true;
    return (ROLE_CAN[perm] || []).indexOf(role) !== -1;
  }

  async function callApi(action, payload) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ action }, payload))
    });
    return res.json();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatDate(isoStr) {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch (e) {
      return isoStr;
    }
  }

  let cachedSubmissions = [];
  let cachedStats = [];
  let currentTab = "submissions";
  let statusFilter = "ALL";

  function renderCommunityModule(container, session) {
    if (!can("REVIEW_SUBMISSIONS", session.role) && !can("MANAGE_STATS", session.role)) {
      container.innerHTML = `
        <div class="admin-card">
          <h2>Access Restricted</h2>
          <p class="admin-muted">Your role (${escapeHtml(session.role)}) does not have permission to view community verification data.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admin-module-header">
        <div>
          <h2>Community Data &amp; Field Reports</h2>
          <p class="admin-muted" style="margin-top:4px;">Review out-of-school reports from the community and manage verified statistical indicators.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="community-refresh-btn" class="btn btn--outline">Refresh</button>
        </div>
      </div>

      <div id="community-flash"></div>

      <!-- View Switcher Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px;">
        <button id="tab-submissions-btn" class="admin-filter-btn is-active">Out-of-School Reports (<span id="count-sub-total">0</span>)</button>
        <button id="tab-stats-btn" class="admin-filter-btn">Community Stats Directory (<span id="count-stats-total">0</span>)</button>
      </div>

      <!-- Submissions View -->
      <div id="view-submissions">
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-card__label">Total Reports</div>
            <div class="admin-stat-card__value" id="stat-total-reports">0</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card__label">Pending Review</div>
            <div class="admin-stat-card__value" id="stat-pending-reports" style="color:var(--amber-600);">0</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card__label">Verified Reports</div>
            <div class="admin-stat-card__value" id="stat-verified-reports" style="color:var(--green-700);">0</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card__label">Children Reported</div>
            <div class="admin-stat-card__value" id="stat-children-reported">0</div>
          </div>
        </div>

        <div class="admin-filter-bar">
          <button class="admin-filter-btn is-active" data-sub-filter="ALL">All Reports</button>
          <button class="admin-filter-btn" data-sub-filter="DRAFT">Pending / Draft</button>
          <button class="admin-filter-btn" data-sub-filter="VERIFIED">Verified</button>
          <button class="admin-filter-btn" data-sub-filter="REJECTED">Rejected</button>
        </div>

        <div class="admin-table-wrap">
          <div id="submissions-table-container">
            <p class="admin-muted" style="padding:24px;text-align:center;">Loading submissions…</p>
          </div>
        </div>
      </div>

      <!-- Community Stats View -->
      <div id="view-stats" class="is-hidden">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:15px;margin:0;">Verified Community Indicators</h3>
          <button id="add-stat-btn" class="btn btn--primary" style="font-size:12.5px;">+ Add / Update Stat</button>
        </div>
        <div class="admin-table-wrap">
          <div id="stats-table-container">
            <p class="admin-muted" style="padding:24px;text-align:center;">Loading community stats…</p>
          </div>
        </div>
      </div>

      <!-- Modal for Stat Entry -->
      <div id="stat-modal" class="admin-modal-overlay is-hidden">
        <div class="admin-modal">
          <h3 id="stat-modal-title">Update Community Statistic</h3>
          <form id="stat-form">
            <input type="hidden" id="stat-row" />
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="stat-county">County</label>
                <select id="stat-county" required>
                  <option value="Montserrado">Montserrado</option>
                  <option value="Margibi">Margibi</option>
                  <option value="Bong">Bong</option>
                  <option value="Nimba">Nimba</option>
                  <option value="Grand Bassa">Grand Bassa</option>
                </select>
              </div>
              <div class="form-field">
                <label for="stat-community">Community</label>
                <input type="text" id="stat-community" required placeholder="e.g. West Point" />
              </div>
              <div class="form-field">
                <label for="stat-year">Year</label>
                <input type="text" id="stat-year" required value="${new Date().getFullYear()}" />
              </div>
              <div class="form-field">
                <label for="stat-status">Status</label>
                <select id="stat-status">
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
              <div class="form-field">
                <label for="stat-out-of-school">Out Of School Count</label>
                <input type="number" id="stat-out-of-school" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="stat-enrolled">Enrolled Count</label>
                <input type="number" id="stat-enrolled" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="stat-amount-needed">Funding Needed ($USD)</label>
                <input type="number" id="stat-amount-needed" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="stat-amount-gen">Funding Generated ($USD)</label>
                <input type="number" id="stat-amount-gen" min="0" value="0" />
              </div>
            </div>
            <div class="form-field">
              <label for="stat-notes">Methodology Note</label>
              <input type="text" id="stat-notes" placeholder="Field census / door-to-door survey" />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
              <button type="button" id="stat-modal-cancel" class="btn btn--outline">Cancel</button>
              <button type="submit" class="btn btn--primary">Save Statistics</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById("community-refresh-btn").addEventListener("click", () => {
      loadSubmissions(session);
      loadStats(session);
    });

    const tabSubBtn = document.getElementById("tab-submissions-btn");
    const tabStatsBtn = document.getElementById("tab-stats-btn");
    const viewSub = document.getElementById("view-submissions");
    const viewStats = document.getElementById("view-stats");

    tabSubBtn.addEventListener("click", () => {
      tabSubBtn.classList.add("is-active");
      tabStatsBtn.classList.remove("is-active");
      viewSub.classList.remove("is-hidden");
      viewStats.classList.add("is-hidden");
      currentTab = "submissions";
    });

    tabStatsBtn.addEventListener("click", () => {
      tabStatsBtn.classList.add("is-active");
      tabSubBtn.classList.remove("is-active");
      viewStats.classList.remove("is-hidden");
      viewSub.classList.add("is-hidden");
      currentTab = "stats";
      if (!cachedStats.length) loadStats(session);
    });

    const filterBtns = container.querySelectorAll("button[data-sub-filter]");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        statusFilter = btn.dataset.subFilter;
        renderSubmissionsTable(session);
      });
    });

    // Stat Modal handlers
    const modal = document.getElementById("stat-modal");
    document.getElementById("add-stat-btn").addEventListener("click", () => {
      document.getElementById("stat-form").reset();
      document.getElementById("stat-row").value = "";
      document.getElementById("stat-modal-title").textContent = "Add Community Statistics";
      modal.classList.remove("is-hidden");
    });

    document.getElementById("stat-modal-cancel").addEventListener("click", () => {
      modal.classList.add("is-hidden");
    });

    document.getElementById("stat-form").addEventListener("submit", (e) => handleSaveStat(e, session));

    loadSubmissions(session);
  }

  function flash(message, kind) {
    const el = document.getElementById("community-flash");
    if (!el) return;
    el.innerHTML = `<div class="admin-error" style="${kind === "success" ? "background:var(--green-050);color:var(--green-700);" : ""}">${escapeHtml(message)}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ""; }, 5000);
  }

  async function loadSubmissions(session) {
    const container = document.getElementById("submissions-table-container");
    if (!container) return;
    container.innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading submissions…</p>';

    try {
      const res = await callApi("listOutOfSchoolSubmissions", { token: session.token });
      if (!res.ok) {
        container.innerHTML = `<div class="admin-error" style="margin:16px;">${escapeHtml(res.error || "Failed to load reports.")}</div>`;
        return;
      }

      cachedSubmissions = res.submissions || [];
      updateSubmissionsStats(cachedSubmissions);
      renderSubmissionsTable(session);
    } catch (err) {
      container.innerHTML = '<div class="admin-error" style="margin:16px;">Error connecting to server.</div>';
    }
  }

  function updateSubmissionsStats(items) {
    let pendingCount = 0;
    let verifiedCount = 0;
    let childrenCount = 0;

    items.forEach((item) => {
      const st = String(item.status || "DRAFT").toUpperCase();
      if (st === "DRAFT" || st === "UNDER_REVIEW") pendingCount++;
      if (st === "VERIFIED") verifiedCount++;
      childrenCount += Number(item.approxChildCount) || 0;
    });

    const elTotal = document.getElementById("stat-total-reports");
    const elPending = document.getElementById("stat-pending-reports");
    const elVerified = document.getElementById("stat-verified-reports");
    const elChildren = document.getElementById("stat-children-reported");
    const elCountSub = document.getElementById("count-sub-total");

    if (elTotal) elTotal.textContent = items.length;
    if (elPending) elPending.textContent = pendingCount;
    if (elVerified) elVerified.textContent = verifiedCount;
    if (elChildren) elChildren.textContent = childrenCount;
    if (elCountSub) elCountSub.textContent = items.length;
  }

  function renderSubmissionsTable(session) {
    const container = document.getElementById("submissions-table-container");
    if (!container) return;

    let items = cachedSubmissions.slice();
    if (statusFilter !== "ALL") {
      items = items.filter((it) => {
        const st = String(it.status || "DRAFT").toUpperCase();
        if (statusFilter === "DRAFT") return st === "DRAFT" || st === "UNDER_REVIEW";
        return st === statusFilter;
      });
    }

    if (items.length === 0) {
      container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No reports in this category.</p>';
      return;
    }

    const rows = items.map((r) => {
      const st = String(r.status || "DRAFT").toUpperCase();
      let badgeCls = "admin-badge--pending";
      if (st === "VERIFIED") badgeCls = "admin-badge--verified";
      if (st === "REJECTED") badgeCls = "admin-badge--rejected";

      let actionsHtml = "";
      if (can("REVIEW_SUBMISSIONS", session.role) && (st === "DRAFT" || st === "UNDER_REVIEW")) {
        actionsHtml = `
          <div style="display:flex;gap:6px;">
            <button class="btn--verify" data-sub-action="verify" data-row="${r.rowNumber}">Verify</button>
            <button class="btn--reject" data-sub-action="reject" data-row="${r.rowNumber}">Reject</button>
          </div>
        `;
      } else if (st === "VERIFIED") {
        actionsHtml = `<span class="admin-muted" style="font-size:11px;">By ${escapeHtml(r.reviewedBy || "Admin")}<br/>${formatDate(r.reviewedAt)}</span>`;
      } else {
        actionsHtml = `<span class="admin-muted" style="font-size:11px;color:var(--red-600);">${escapeHtml(r.reviewerNotes || "Rejected")}</span>`;
      }

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${formatDate(r.timestamp)}</div>
            <div style="font-size:11px;color:var(--ink-400);">${escapeHtml(r.county)} · ${escapeHtml(r.community)}</div>
          </td>
          <td>
            <div>${escapeHtml(r.reporterName || "Anonymous")}</div>
            <div style="font-size:11px;color:var(--ink-400);">${escapeHtml(r.reporterPhone || "—")}</div>
          </td>
          <td>
            <strong style="color:var(--blue-900);font-size:14px;">~${escapeHtml(r.approxChildCount)}</strong> children
          </td>
          <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:normal;font-size:12px;">
            ${escapeHtml(r.notes || "—")}
          </td>
          <td>
            <span class="admin-badge ${badgeCls}">${escapeHtml(st)}</span>
          </td>
          <td>
            ${actionsHtml}
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Date / Location</th>
            <th>Reporter</th>
            <th>Est. Children</th>
            <th>Notes</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    container.querySelectorAll("button[data-sub-action='verify']").forEach((b) => {
      b.addEventListener("click", () => handleReviewSub(Number(b.dataset.row), "VERIFIED", session));
    });
    container.querySelectorAll("button[data-sub-action='reject']").forEach((b) => {
      b.addEventListener("click", () => handleReviewSub(Number(b.dataset.row), "REJECTED", session));
    });
  }

  async function handleReviewSub(rowNumber, newStatus, session) {
    let notes = "";
    if (newStatus === "REJECTED") {
      notes = window.prompt("Please provide a reason for rejecting this report:", "Duplicate report / inaccurate location");
      if (notes === null) return;
    } else {
      notes = window.prompt("Optional verification notes (e.g. Verified by phone or field visit):", "Verified with community leader");
      if (notes === null) return;
    }

    try {
      const res = await callApi("reviewOutOfSchoolSubmission", {
        token: session.token,
        rowNumber: rowNumber,
        status: newStatus,
        reviewerNotes: (notes || "").trim()
      });

      if (res.ok) {
        flash(res.message || "Report updated.", "success");
        loadSubmissions(session);
      } else {
        flash(res.error || "Failed to update report.");
      }
    } catch (err) {
      flash("Connection error.");
    }
  }

  async function loadStats(session) {
    const container = document.getElementById("stats-table-container");
    if (!container) return;
    container.innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading community indicators…</p>';

    try {
      const res = await callApi("listCommunityStatsAdmin", { token: session.token });
      if (!res.ok) {
        container.innerHTML = `<div class="admin-error" style="margin:16px;">${escapeHtml(res.error || "Failed to load stats.")}</div>`;
        return;
      }

      cachedStats = res.stats || [];
      const elCount = document.getElementById("count-stats-total");
      if (elCount) elCount.textContent = cachedStats.length;

      if (!cachedStats.length) {
        container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No community statistics on file yet.</p>';
        return;
      }

      const rows = cachedStats.map((s) => `
        <tr>
          <td><strong>${escapeHtml(s.county)}</strong><br/><span style="font-size:11px;color:var(--ink-500);">${escapeHtml(s.community)}</span></td>
          <td>${escapeHtml(s.year)}</td>
          <td><span class="admin-badge ${s.status === 'VERIFIED' ? 'admin-badge--verified' : 'admin-badge--pending'}">${escapeHtml(s.status)}</span></td>
          <td>${escapeHtml(s.outOfSchoolIdentified)}</td>
          <td>${escapeHtml(s.enrolled)}</td>
          <td>$${Number(s.amountNeededUSD || 0).toLocaleString()}</td>
          <td>$${Number(s.amountGeneratedUSD || 0).toLocaleString()}</td>
          <td>
            <button class="btn btn--outline" style="padding:4px 8px;font-size:11px;" data-edit-stat="${s.rowNumber}">Edit</button>
          </td>
        </tr>
      `).join("");

      container.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>County / Community</th>
              <th>Year</th>
              <th>Status</th>
              <th>Out of School</th>
              <th>Enrolled</th>
              <th>Needed ($)</th>
              <th>Raised ($)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;

      container.querySelectorAll("button[data-edit-stat]").forEach((btn) => {
        btn.addEventListener("click", () => openEditStatModal(Number(btn.dataset.editStat)));
      });
    } catch (e) {
      container.innerHTML = '<div class="admin-error" style="margin:16px;">Connection error loading stats.</div>';
    }
  }

  function openEditStatModal(rowNumber) {
    const item = cachedStats.find((s) => s.rowNumber === rowNumber);
    if (!item) return;

    document.getElementById("stat-row").value = item.rowNumber;
    document.getElementById("stat-county").value = item.county;
    document.getElementById("stat-community").value = item.community;
    document.getElementById("stat-year").value = item.year || new Date().getFullYear();
    document.getElementById("stat-status").value = item.status || "VERIFIED";
    document.getElementById("stat-out-of-school").value = item.outOfSchoolIdentified || 0;
    document.getElementById("stat-enrolled").value = item.enrolled || 0;
    document.getElementById("stat-amount-needed").value = item.amountNeededUSD || 0;
    document.getElementById("stat-amount-gen").value = item.amountGeneratedUSD || 0;
    document.getElementById("stat-notes").value = item.rateMethodologyNote || "";

    document.getElementById("stat-modal-title").textContent = `Edit Statistics: ${item.community}`;
    document.getElementById("stat-modal").classList.remove("is-hidden");
  }

  async function handleSaveStat(e, session) {
    e.preventDefault();
    const rowNumber = document.getElementById("stat-row").value;
    const modal = document.getElementById("stat-modal");

    const payload = {
      token: session.token,
      rowNumber: rowNumber ? Number(rowNumber) : undefined,
      county: document.getElementById("stat-county").value,
      community: document.getElementById("stat-community").value.trim(),
      year: document.getElementById("stat-year").value.trim(),
      status: document.getElementById("stat-status").value,
      outOfSchoolIdentified: Number(document.getElementById("stat-out-of-school").value) || 0,
      enrolled: Number(document.getElementById("stat-enrolled").value) || 0,
      amountNeededUSD: Number(document.getElementById("stat-amount-needed").value) || 0,
      amountGeneratedUSD: Number(document.getElementById("stat-amount-gen").value) || 0,
      rateMethodologyNote: document.getElementById("stat-notes").value.trim()
    };

    try {
      const res = await callApi("updateCommunityStat", payload);
      if (res.ok) {
        flash(res.message || "Statistics saved successfully.", "success");
        modal.classList.add("is-hidden");
        loadStats(session);
      } else {
        flash(res.error || "Failed to save statistics.");
      }
    } catch (err) {
      flash("Error communicating with server.");
    }
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("community", renderCommunityModule);
})();
