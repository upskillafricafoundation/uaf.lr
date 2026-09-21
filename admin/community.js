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

        <!-- UAF Institutional Brochure PDF Management Card -->
        <div class="admin-card" style="margin-top:20px;border:1.5px solid #bae6fd;background:#f0f9ff;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h3 style="font-size:15px;margin:0;color:#0369a1;">UAF Institutional Brochure (PDF) Management</h3>
            <span class="admin-badge admin-badge--neutral" id="brochure-status-badge">Default Institutional PDF</span>
          </div>
          <p class="admin-muted" style="margin-bottom:12px;font-size:12.5px;">
            Upload and manage the official UAF Institutional Brochure PDF downloaded by users and partner organizations in the Request Data tab.
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
            <input type="file" id="admin-brochure-file" accept="application/pdf" style="font-size:12.5px;max-width:280px;" />
            <button type="button" id="btn-upload-brochure" class="btn btn--primary" style="font-size:12px;">Upload &amp; Publish PDF</button>
            <button type="button" id="btn-preview-brochure" class="btn btn--outline" style="font-size:12px;">Preview Download</button>
            <button type="button" id="btn-reset-brochure" class="btn btn--outline" style="font-size:12px;color:var(--red-600);border-color:#fca5a5;">Reset to Default</button>
          </div>
          <div id="brochure-meta-display" style="font-size:11.5px;color:#0284c7;margin-top:8px;">
            Currently serving the built-in official UAF Institutional Brochure (PDF).
          </div>
        </div>
      </div>

      <!-- Community Stats View -->
      <div id="view-stats" class="is-hidden">
        <!-- Global Indicators & Funding Editor -->
        <div class="admin-card" style="margin-bottom:18px;background:var(--blue-050);border:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h3 style="font-size:15px;margin:0;color:var(--blue-900);">Global Funding &amp; Impact Overview Indicators</h3>
            <span class="admin-badge admin-badge--neutral">Regular Updates</span>
          </div>
          <p class="admin-muted" style="margin-bottom:12px;font-size:12.5px;">Update public-facing aggregate funding targets and the 5 Impact Drive overview indicators anytime.</p>
          <form id="global-kpis-form">
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:10px;">
              <div class="form-field">
                <label for="kpi-amount-needed">Total Needed ($USD)</label>
                <input type="number" id="kpi-amount-needed" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="kpi-amount-raised">Total Raised ($USD)</label>
                <input type="number" id="kpi-amount-raised" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="kpi-children">Children Enrolled</label>
                <input type="number" id="kpi-children" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="kpi-women">Women Trained</label>
                <input type="number" id="kpi-women" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="kpi-computer">Computer Trained</label>
                <input type="number" id="kpi-computer" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="kpi-youth">Youths Impacted</label>
                <input type="number" id="kpi-youth" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="kpi-career">Career Development</label>
                <input type="number" id="kpi-career" min="0" value="0" />
              </div>
            </div>
            <div style="margin-top:12px;text-align:right;">
              <button type="submit" class="btn btn--primary" style="font-size:12.5px;">Save Overview Indicators</button>
            </div>
          </form>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:15px;margin:0;">Verified Community Indicators Directory</h3>
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
        <div class="admin-modal" style="max-width:560px;">
          <h3 id="stat-modal-title">Update Community Statistic</h3>
          <form id="stat-form">
            <input type="hidden" id="stat-row" />
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="stat-county">County (All 15 Counties)</label>
                <select id="stat-county" required>
                  <option value="Bomi">Bomi</option>
                  <option value="Bong">Bong</option>
                  <option value="Gbarpolu">Gbarpolu</option>
                  <option value="Grand Bassa">Grand Bassa</option>
                  <option value="Grand Cape Mount">Grand Cape Mount</option>
                  <option value="Grand Gedeh">Grand Gedeh</option>
                  <option value="Grand Kru">Grand Kru</option>
                  <option value="Lofa">Lofa</option>
                  <option value="Margibi">Margibi</option>
                  <option value="Maryland">Maryland</option>
                  <option value="Montserrado" selected>Montserrado</option>
                  <option value="Nimba">Nimba</option>
                  <option value="River Cess">River Cess</option>
                  <option value="River Gee">River Gee</option>
                  <option value="Sinoe">Sinoe</option>
                </select>
              </div>
              <div class="form-field">
                <label for="stat-community">Community Name</label>
                <input type="text" id="stat-community" required placeholder="e.g. West Point" />
              </div>
              <div class="form-field">
                <label for="stat-year">Year</label>
                <input type="text" id="stat-year" required value="${new Date().getFullYear()}" />
              </div>
              <div class="form-field">
                <label for="stat-status">Verification Status</label>
                <select id="stat-status">
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
              <div class="form-field">
                <label for="stat-out-of-school">Out Of School Identified</label>
                <input type="number" id="stat-out-of-school" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="stat-enrolled">Supported &amp; Re-enrolled</label>
                <input type="number" id="stat-enrolled" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="stat-parents">Parents Empowered</label>
                <input type="number" id="stat-parents" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="stat-schools">School Partners</label>
                <input type="number" id="stat-schools" min="0" value="1" />
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
              <label for="stat-notes">Methodology / Verification Note</label>
              <input type="text" id="stat-notes" placeholder="Field census / door-to-door survey" />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
              <button type="button" id="stat-modal-cancel" class="btn btn--outline">Cancel</button>
              <button type="submit" class="btn btn--primary">Save Statistics</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Case Detail View Modal -->
      <div id="case-detail-modal" class="admin-modal-backdrop is-hidden" style="position:fixed;inset:0;background:rgba(15,23,42,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;">
        <div class="admin-modal-card" style="background:#ffffff;border-radius:16px;max-width:720px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
            <div>
              <h3 id="case-detail-title" style="margin:0;font-size:17px;color:var(--ink-900);">Child Case Review &amp; Field Verification</h3>
              <p class="admin-muted" id="case-detail-subtitle" style="margin:4px 0 0;font-size:12px;">Submitted report breakdown</p>
            </div>
            <button type="button" id="case-detail-close" class="btn btn--outline" style="padding:4px 10px;font-size:12px;">&times; Close</button>
          </div>
          <div id="case-detail-content">
            <!-- Dynamic case and child profile details populated by JS -->
          </div>
          <div id="case-detail-actions" style="display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border);padding-top:16px;margin-top:20px;">
            <!-- Verification / Rejection buttons populated by JS -->
          </div>
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
      loadStats(session);
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

    // Global KPIs Form handler
    const globalKpisForm = document.getElementById("global-kpis-form");
    if (globalKpisForm) {
      globalKpisForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const funding = {
          totalNeededUSD: Number(document.getElementById("kpi-amount-needed").value) || 0,
          totalGeneratedUSD: Number(document.getElementById("kpi-amount-raised").value) || 0,
          lastUpdated: new Date().toISOString()
        };
        const impactKpis = {
          children: Number(document.getElementById("kpi-children").value) || 0,
          women: Number(document.getElementById("kpi-women").value) || 0,
          computer: Number(document.getElementById("kpi-computer").value) || 0,
          youth: Number(document.getElementById("kpi-youth").value) || 0,
          career: Number(document.getElementById("kpi-career").value) || 0
        };
        try {
          localStorage.setItem("uaf_admin_funding", JSON.stringify(funding));
          localStorage.setItem("uaf_admin_impact_kpis", JSON.stringify(impactKpis));
          window.dispatchEvent(new Event("uaf_data_updated"));
          flash("Global funding and impact indicators saved successfully.", "success");
        } catch (err) {
          flash("Could not save to local storage: " + err.message);
        }
      });
    }

    // Detail modal close
    document.getElementById("case-detail-close")?.addEventListener("click", () => {
      document.getElementById("case-detail-modal")?.classList.add("is-hidden");
    });

    initBrochureAdminControls();

    loadSubmissions(session);
    loadStats(session);
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

    let items = [];
    try {
      if (API_URL) {
        try {
          const res = await callApi("listOutOfSchoolSubmissions", { token: session.token });
          if (res.ok && res.submissions) {
            items = res.submissions;
          }
        } catch (err) {
          console.warn("API list error, using local fallback", err);
        }
      }

      // Check local storage reports as well (offline/local intake submissions)
      const localReports = JSON.parse(localStorage.getItem("uaf_ossc_reports") || "[]");
      if (localReports.length > 0) {
        const mapped = localReports.map((lr, idx) => ({
          rowNumber: lr.rowNumber || -(idx + 1),
          timestamp: lr.timestamp || new Date().toISOString(),
          county: lr.county || (lr.children && lr.children[0] && lr.children[0].childOrigin) || "Montserrado",
          community: lr.community || (lr.children && lr.children[0] && lr.children[0].childCommunity) || "Duport Road",
          reporterName: lr.reporterName || "Field Enumerator",
          reporterPhone: lr.reporterPhone || "—",
          approxChildCount: lr.childCount || (lr.children ? lr.children.length : 1),
          notes: lr.statement || (lr.children ? lr.children.map((c) => c.statement).join("; ") : "Local field report"),
          status: lr.status || "DRAFT",
          reviewedBy: lr.reviewedBy || "",
          reviewedAt: lr.reviewedAt || "",
          reviewerNotes: lr.reviewerNotes || "",
          children: lr.children || [],
          childName: lr.childName || (lr.children && lr.children.map((c) => c.childName).join(", ")),
          gender: lr.gender || "",
          photoData: lr.photoData || (lr.children && lr.children[0] && lr.children[0].childPhotoData),
          causeOfExclusion: lr.causeOfExclusion || "",
          parentName: lr.parentName || "",
          parentPhone: lr.parentPhone || "",
          consent: lr.consent !== false,
          isLocal: true
        }));

        mapped.forEach((ml) => {
          if (!items.some((it) => it.timestamp === ml.timestamp && it.reporterName === ml.reporterName)) {
            items.unshift(ml);
          }
        });
      }

      cachedSubmissions = items;
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

      let actionsHtml = `<button class="btn btn--outline" style="font-size:11px;padding:3px 8px;margin-bottom:4px;display:block;" data-sub-action="view" data-row="${r.rowNumber}">View Story</button>`;

      if (can("REVIEW_SUBMISSIONS", session.role) && (st === "DRAFT" || st === "UNDER_REVIEW")) {
        actionsHtml += `
          <div style="display:flex;gap:6px;">
            <button class="btn--verify" data-sub-action="verify" data-row="${r.rowNumber}">Verify</button>
            <button class="btn--reject" data-sub-action="reject" data-row="${r.rowNumber}">Reject</button>
          </div>
        `;
      } else if (st === "VERIFIED") {
        actionsHtml += `<div class="admin-muted" style="font-size:11px;">By ${escapeHtml(r.reviewedBy || "Admin")}<br/>${formatDate(r.reviewedAt)}</div>`;
      } else {
        actionsHtml += `<div class="admin-muted" style="font-size:11px;color:var(--red-600);">${escapeHtml(r.reviewerNotes || "Rejected")}</div>`;
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

    container.querySelectorAll("button[data-sub-action='view']").forEach((b) => {
      b.addEventListener("click", () => {
        const rowNum = Number(b.dataset.row);
        const sub = cachedSubmissions.find((item) => Number(item.rowNumber) === rowNum);
        if (sub) showSubmissionDetailModal(sub, session);
      });
    });

    container.querySelectorAll("button[data-sub-action='verify']").forEach((b) => {
      b.addEventListener("click", () => handleReviewSub(Number(b.dataset.row), "VERIFIED", session));
    });
    container.querySelectorAll("button[data-sub-action='reject']").forEach((b) => {
      b.addEventListener("click", () => handleReviewSub(Number(b.dataset.row), "REJECTED", session));
    });
  }

  function showSubmissionDetailModal(sub, session) {
    const modal = document.getElementById("case-detail-modal");
    const content = document.getElementById("case-detail-content");
    const actions = document.getElementById("case-detail-actions");
    const title = document.getElementById("case-detail-title");
    const subtitle = document.getElementById("case-detail-subtitle");
    if (!modal || !content) return;

    if (title) title.textContent = `Case Review: ${sub.county} · ${sub.community}`;
    if (subtitle) subtitle.textContent = `Reported by ${sub.reporterName || "Enumerator"} (${sub.reporterPhone || "No Phone"}) on ${formatDate(sub.timestamp)} · Status: ${sub.status || "DRAFT"}`;

    const st = String(sub.status || "DRAFT").toUpperCase();
    const childrenList = Array.isArray(sub.children) && sub.children.length > 0 ? sub.children : null;

    let childrenHtml = "";
    if (childrenList) {
      childrenHtml = childrenList.map((ch, i) => {
        return `
          <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;background:#004F71;color:#fff;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:700;margin-bottom:10px;">
              <span>Child #${i + 1}: ${escapeHtml(ch.childName)}</span>
              <span style="font-size:11px;opacity:0.9;">Age: ${escapeHtml(ch.childAge || "—")} · Gender: ${escapeHtml(ch.gender || "—")}</span>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:8px;font-size:12px;margin-bottom:10px;">
              <div><strong>County of Origin:</strong> ${escapeHtml(ch.childOrigin || "—")}</div>
              <div><strong>Town / Community:</strong> ${escapeHtml(ch.childCommunity || "—")}</div>
              <div><strong>Living Arrangement:</strong> ${escapeHtml(ch.livingWith || "—")}</div>
              <div><strong>Years Out of School:</strong> ${escapeHtml(ch.yearsOut || "—")}</div>
              <div><strong>Last Grade Attended:</strong> ${escapeHtml(ch.currentClass || "—")}</div>
              <div><strong>Cause of Exclusion:</strong> <span style="color:#b91c1c;font-weight:600;">${escapeHtml(ch.causeOfExclusion || "—")}</span></div>
            </div>

            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:12px;">
              <strong>Protection Assessment:</strong> ${ch.abuseObserved === "Yes" ? `<span style="color:#dc2626;font-weight:700;">⚠️ Yes — ${escapeHtml(ch.abuseType || "Identified Form of Abuse")}</span>` : '<span style="color:#15803d;font-weight:600;">None observed by reporter</span>'}
            </div>

            ${ch.childPhotoData ? `
              <div style="margin-bottom:10px;">
                <div style="font-size:11.5px;font-weight:700;color:var(--ink-700);margin-bottom:4px;">Child Identification Portrait:</div>
                <img src="${ch.childPhotoData}" alt="Child Photo" style="max-height:160px;max-width:240px;border-radius:8px;border:1px solid #cbd5e1;object-fit:cover;" />
              </div>
            ` : ""}

            <div style="border-top:1px dashed #cbd5e1;padding-top:8px;margin-top:8px;font-size:12px;">
              <div><strong>Parent / Caregiver:</strong> ${escapeHtml(ch.parentName || "—")} (${escapeHtml(ch.parentPhone || "No contact")})</div>
              ${ch.parentPhotoData ? `
                <div style="margin-top:6px;">
                  <div style="font-size:11px;font-weight:700;color:var(--ink-600);margin-bottom:2px;">Parent / Guardian Photo:</div>
                  <img src="${ch.parentPhotoData}" alt="Parent Photo" style="max-height:140px;max-width:200px;border-radius:8px;border:1px solid #cbd5e1;object-fit:cover;" />
                </div>
              ` : ""}
            </div>

            <div style="margin-top:10px;">
              <div style="font-size:11.5px;font-weight:700;color:var(--ink-800);margin-bottom:3px;">Field Case Narrative &amp; Living Condition:</div>
              <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #004F71;padding:8px 12px;border-radius:4px;font-size:12.5px;line-height:1.45;color:var(--ink-800);">
                ${escapeHtml(ch.statement || "No statement recorded.")}
              </div>
            </div>

            <div style="margin-top:8px;font-size:11.5px;color:#166534;background:#f0fdf4;padding:6px 10px;border-radius:4px;">
              ✓ <strong>Parental Consent Confirmed:</strong> Agreement signed for UAF advocacy &amp; educational sponsorship.
            </div>
          </div>
        `;
      }).join("");
    } else {
      childrenHtml = `
        <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px;">
          <div style="font-size:13px;font-weight:700;color:var(--ink-900);margin-bottom:8px;">
            Single / Legacy Record: ${escapeHtml(sub.childName || "Unspecified Child")} (${escapeHtml(sub.gender || "—")})
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:6px;font-size:12px;margin-bottom:8px;">
            <div><strong>Location:</strong> ${escapeHtml(sub.county)} · ${escapeHtml(sub.community)}</div>
            <div><strong>Est. Children:</strong> ${escapeHtml(sub.approxChildCount)}</div>
            <div><strong>Cause:</strong> ${escapeHtml(sub.causeOfExclusion || "—")}</div>
            <div><strong>Parent:</strong> ${escapeHtml(sub.parentName || "—")} (${escapeHtml(sub.parentPhone || "—")})</div>
          </div>
          ${sub.photoData ? `
            <div style="margin:8px 0;">
              <img src="${sub.photoData}" alt="Child Photo" style="max-height:160px;max-width:240px;border-radius:8px;border:1px solid #cbd5e1;object-fit:cover;" />
            </div>
          ` : ""}
          <div style="margin-top:8px;">
            <strong>Case Statement:</strong>
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #004F71;padding:8px 12px;border-radius:4px;font-size:12.5px;margin-top:4px;">
              ${escapeHtml(sub.notes || "No details provided.")}
            </div>
          </div>
        </div>
      `;
    }

    content.innerHTML = `
      <div style="background:#e0f2fe;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="font-size:12px;color:#0369a1;">
          <strong>Reporter Contact:</strong> ${escapeHtml(sub.reporterName || "Anonymous")} · Phone: ${escapeHtml(sub.reporterPhone || "—")}
        </div>
        <div style="font-size:12px;color:#0369a1;">
          <strong>Approx. Children Count:</strong> <span style="font-weight:700;font-size:13px;">${escapeHtml(sub.approxChildCount || 1)}</span>
        </div>
      </div>
      <div>
        <h4 style="margin:0 0 10px;font-size:14px;color:var(--ink-800);">Detailed Child Profile(s) &amp; Safeguarding Logs</h4>
        ${childrenHtml}
      </div>
    `;

    // Render action buttons
    if (actions) {
      if (can("REVIEW_SUBMISSIONS", session.role) && (st === "DRAFT" || st === "UNDER_REVIEW")) {
        actions.innerHTML = `
          <button type="button" id="modal-btn-close" class="btn btn--outline">Close</button>
          <button type="button" id="modal-btn-reject" class="btn btn--outline" style="color:var(--red-600);border-color:#fca5a5;">Reject Case</button>
          <button type="button" id="modal-btn-verify" class="btn btn--primary" style="background:var(--green-700);border-color:var(--green-700);">✓ Verify &amp; Accept Case</button>
        `;
        document.getElementById("modal-btn-close")?.addEventListener("click", () => modal.classList.add("is-hidden"));
        document.getElementById("modal-btn-verify")?.addEventListener("click", async () => {
          modal.classList.add("is-hidden");
          await handleReviewSub(Number(sub.rowNumber), "VERIFIED", session);
        });
        document.getElementById("modal-btn-reject")?.addEventListener("click", async () => {
          modal.classList.add("is-hidden");
          await handleReviewSub(Number(sub.rowNumber), "REJECTED", session);
        });
      } else {
        actions.innerHTML = `
          <div style="margin-right:auto;font-size:12px;color:var(--ink-500);">
            ${st === "VERIFIED" ? `<span style="color:var(--green-700);font-weight:700;">✓ Verified</span> by ${escapeHtml(sub.reviewedBy || "Admin")} on ${formatDate(sub.reviewedAt)}` : `<span style="color:var(--red-600);font-weight:700;">✗ Rejected:</span> ${escapeHtml(sub.reviewerNotes || "Report declined")}`}
          </div>
          <button type="button" id="modal-btn-close" class="btn btn--outline">Close</button>
        `;
        document.getElementById("modal-btn-close")?.addEventListener("click", () => modal.classList.add("is-hidden"));
      }
    }

    modal.classList.remove("is-hidden");
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

    // Handle local storage reports
    if (rowNumber < 0) {
      const idx = Math.abs(rowNumber) - 1;
      const localReports = JSON.parse(localStorage.getItem("uaf_ossc_reports") || "[]");
      if (localReports[idx]) {
        localReports[idx].status = newStatus;
        localReports[idx].reviewedBy = session.name || "Admin";
        localReports[idx].reviewedAt = new Date().toISOString();
        localReports[idx].reviewerNotes = (notes || "").trim();
        localStorage.setItem("uaf_ossc_reports", JSON.stringify(localReports));
        flash(`Report successfully updated to ${newStatus}.`, "success");
        loadSubmissions(session);
        return;
      }
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

  function updateBrochureStatusDisplay() {
    const badge = document.getElementById("brochure-status-badge");
    const meta = document.getElementById("brochure-meta-display");
    const customBrochure = localStorage.getItem("uaf_brochure_pdf");
    const storedMeta = localStorage.getItem("uaf_brochure_meta");

    if (customBrochure && storedMeta) {
      try {
        const parsed = JSON.parse(storedMeta);
        if (badge) {
          badge.textContent = "Custom Active PDF";
          badge.className = "admin-badge admin-badge--verified";
        }
        if (meta) {
          const sizeKb = Math.round(parsed.fileSize / 1024);
          meta.textContent = `Current Active File: ${parsed.fileName} (${sizeKb} KB) · Updated ${formatDate(parsed.updatedAt)}`;
        }
      } catch (_) {}
    } else {
      if (badge) {
        badge.textContent = "Default Institutional PDF";
        badge.className = "admin-badge admin-badge--neutral";
      }
      if (meta) {
        meta.textContent = "Currently serving the built-in official UAF Institutional Brochure (PDF).";
      }
    }
  }

  function initBrochureAdminControls() {
    updateBrochureStatusDisplay();

    const uploadBtn = document.getElementById("btn-upload-brochure");
    const previewBtn = document.getElementById("btn-preview-brochure");
    const resetBtn = document.getElementById("btn-reset-brochure");
    const fileInput = document.getElementById("admin-brochure-file");

    uploadBtn?.addEventListener("click", () => {
      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        flash("Please choose a PDF file to upload.");
        return;
      }
      const file = fileInput.files[0];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        flash("Invalid file format. Only PDF files are allowed.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          localStorage.setItem("uaf_brochure_pdf", reader.result);
          localStorage.setItem("uaf_brochure_meta", JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            updatedAt: new Date().toISOString()
          }));
          window.dispatchEvent(new Event("uaf_brochure_updated"));
          updateBrochureStatusDisplay();
          flash("Official UAF Institutional Brochure uploaded and published successfully.", "success");
        } catch (err) {
          flash("Could not save file: " + err.message);
        }
      };
      reader.readAsDataURL(file);
    });

    previewBtn?.addEventListener("click", () => {
      const customBrochure = localStorage.getItem("uaf_brochure_pdf");
      if (customBrochure) {
        const a = document.createElement("a");
        a.href = customBrochure;
        a.download = "UAF_Institutional_Brochure_Preview.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        flash("Downloading current brochure preview...", "success");
        return;
      }
      flash("Default brochure active in Request Data tab.", "success");
    });

    resetBtn?.addEventListener("click", () => {
      if (window.confirm("Reset official brochure back to default institutional PDF?")) {
        localStorage.removeItem("uaf_brochure_pdf");
        localStorage.removeItem("uaf_brochure_meta");
        window.dispatchEvent(new Event("uaf_brochure_updated"));
        updateBrochureStatusDisplay();
        if (fileInput) fileInput.value = "";
        flash("Brochure reset to default institutional document.", "success");
      }
    });
  }

  async function loadStats(session) {
    const container = document.getElementById("stats-table-container");
    if (!container) return;

    // Prefill Global Overview Indicators form
    try {
      const storedFunding = localStorage.getItem("uaf_admin_funding");
      if (storedFunding) {
        const f = JSON.parse(storedFunding);
        if (document.getElementById("kpi-amount-needed")) document.getElementById("kpi-amount-needed").value = f.totalNeededUSD || 0;
        if (document.getElementById("kpi-amount-raised")) document.getElementById("kpi-amount-raised").value = f.totalGeneratedUSD || 0;
      }
      const storedImpact = localStorage.getItem("uaf_admin_impact_kpis");
      if (storedImpact) {
        const k = JSON.parse(storedImpact);
        if (document.getElementById("kpi-children")) document.getElementById("kpi-children").value = k.children || 0;
        if (document.getElementById("kpi-women")) document.getElementById("kpi-women").value = k.women || 0;
        if (document.getElementById("kpi-computer")) document.getElementById("kpi-computer").value = k.computer || 0;
        if (document.getElementById("kpi-youth")) document.getElementById("kpi-youth").value = k.youth || 0;
        if (document.getElementById("kpi-career")) document.getElementById("kpi-career").value = k.career || 0;
      }
    } catch (_) {}

    container.innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading community indicators…</p>';

    let loadedStats = [];
    try {
      const res = await callApi("listCommunityStatsAdmin", { token: session.token });
      if (res && res.ok && Array.isArray(res.stats) && res.stats.length > 0) {
        loadedStats = res.stats;
      } else {
        const stored = localStorage.getItem("uaf_admin_communities");
        loadedStats = stored ? JSON.parse(stored) : [];
      }
    } catch (err) {
      const stored = localStorage.getItem("uaf_admin_communities");
      loadedStats = stored ? JSON.parse(stored) : [];
    }

    cachedStats = loadedStats;
    const elCount = document.getElementById("count-stats-total");
    if (elCount) elCount.textContent = cachedStats.length;

    if (!cachedStats.length) {
      container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No community statistics on file yet. Click <strong>"+ Add / Update Stat"</strong> to create a verified community entry.</p>';
      return;
    }

    const rows = cachedStats.map((s) => `
      <tr>
        <td><strong>${escapeHtml(s.county)}</strong><br/><span style="font-size:11.5px;color:var(--ink-600);">${escapeHtml(s.community)}</span></td>
        <td>${escapeHtml(s.year || 2026)}</td>
        <td><span class="admin-badge ${s.status === 'VERIFIED' ? 'admin-badge--verified' : 'admin-badge--pending'}">${escapeHtml(s.status || 'VERIFIED')}</span></td>
        <td><strong>${Number(s.outOfSchoolIdentified || 0).toLocaleString()}</strong></td>
        <td>${Number(s.supportedReenrolled || s.enrolled || 0).toLocaleString()}</td>
        <td>${Number(s.parentsEmpowered || 0).toLocaleString()}</td>
        <td>${Number(s.schoolPartners || 1).toLocaleString()}</td>
        <td>$${Number(s.amountNeeded || s.amountNeededUSD || 0).toLocaleString()}</td>
        <td>$${Number(s.amountGenerated || s.amountGeneratedUSD || 0).toLocaleString()}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn--outline" style="padding:4px 8px;font-size:11px;" data-edit-stat="${s.rowNumber}">Edit</button>
            <button class="btn btn--outline" style="padding:4px 8px;font-size:11px;color:var(--red-700);" data-delete-stat="${s.rowNumber}">Delete</button>
          </div>
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
            <th>Re-enrolled</th>
            <th>Parents</th>
            <th>Schools</th>
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
    container.querySelectorAll("button[data-delete-stat]").forEach((btn) => {
      btn.addEventListener("click", () => handleDeleteStat(Number(btn.dataset.deleteStat), session));
    });
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
    document.getElementById("stat-enrolled").value = item.supportedReenrolled || item.enrolled || 0;
    document.getElementById("stat-parents").value = item.parentsEmpowered || 0;
    document.getElementById("stat-schools").value = item.schoolPartners || 1;
    document.getElementById("stat-amount-needed").value = item.amountNeeded || item.amountNeededUSD || 0;
    document.getElementById("stat-amount-gen").value = item.amountGenerated || item.amountGeneratedUSD || 0;
    document.getElementById("stat-notes").value = item.rateMethodologyNote || "";

    document.getElementById("stat-modal-title").textContent = `Edit Statistics: ${item.community}`;
    document.getElementById("stat-modal").classList.remove("is-hidden");
  }

  async function handleSaveStat(e, session) {
    e.preventDefault();
    const rowVal = document.getElementById("stat-row").value;
    const rowNumber = rowVal ? Number(rowVal) : Date.now();
    const modal = document.getElementById("stat-modal");

    const outCount = Number(document.getElementById("stat-out-of-school").value) || 0;
    const enrCount = Number(document.getElementById("stat-enrolled").value) || 0;
    const needed = Number(document.getElementById("stat-amount-needed").value) || 0;
    const generated = Number(document.getElementById("stat-amount-gen").value) || 0;
    const parents = Number(document.getElementById("stat-parents").value) || 0;
    const schools = Number(document.getElementById("stat-schools").value) || 1;

    const statObj = {
      rowNumber: rowNumber,
      county: document.getElementById("stat-county").value,
      community: document.getElementById("stat-community").value.trim(),
      year: document.getElementById("stat-year").value.trim(),
      status: document.getElementById("stat-status").value,
      outOfSchoolIdentified: outCount,
      supportedReenrolled: enrCount,
      enrolled: enrCount,
      yetToEnroll: Math.max(0, outCount - enrCount),
      parentsEmpowered: parents,
      schoolPartners: schools,
      amountNeeded: needed,
      amountNeededUSD: needed,
      amountGenerated: generated,
      amountGeneratedUSD: generated,
      rateMethodologyNote: document.getElementById("stat-notes").value.trim(),
      updatedAt: new Date().toISOString()
    };

    const existingIdx = cachedStats.findIndex((s) => s.rowNumber === rowNumber);
    if (existingIdx >= 0) {
      cachedStats[existingIdx] = statObj;
    } else {
      cachedStats.unshift(statObj);
    }

    try {
      localStorage.setItem("uaf_admin_communities", JSON.stringify(cachedStats));
      window.dispatchEvent(new Event("uaf_data_updated"));
    } catch (_) {}

    try {
      callApi("updateCommunityStat", Object.assign({ token: session.token }, statObj));
    } catch (_) {}

    flash("Community statistics saved successfully.", "success");
    modal.classList.add("is-hidden");
    loadStats(session);
  }

  function handleDeleteStat(rowNumber, session) {
    const item = cachedStats.find((s) => s.rowNumber === rowNumber);
    const commName = item ? item.community : "this community";
    if (!confirm(`Are you sure you want to delete statistics for ${commName}?`)) return;

    cachedStats = cachedStats.filter((s) => s.rowNumber !== rowNumber);
    try {
      localStorage.setItem("uaf_admin_communities", JSON.stringify(cachedStats));
      window.dispatchEvent(new Event("uaf_data_updated"));
    } catch (_) {}

    flash(`Deleted community record for ${commName}.`, "success");
    loadStats(session);
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("community", renderCommunityModule);
})();
