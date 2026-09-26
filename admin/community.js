/* =========================================================
   UAF IMPACT — ADMIN: COMMUNITY DATA, OSSC, ENROLLMENTS & STATS
   ---------------------------------------------------------
   Administrative portal for:
   1. Out-of-School Children review, verification & enrollment
   2. Verified School Partnerships management
   3. Household Livelihood Empowerment Training records
   4. Accurate Community Statistics Directory with manual target setting
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  const ROLE_CAN = {
    REVIEW_SUBMISSIONS: ["SUPER_ADMIN", "ADMIN", "EXECUTIVE_STAFF", "COORDINATOR", "ADMINISTRATOR", "VERIFIER", "PROGRAM_MANAGER"],
    MANAGE_STATS: ["SUPER_ADMIN", "ADMIN", "EXECUTIVE_STAFF", "COORDINATOR", "ADMINISTRATOR", "VERIFIER", "PROGRAM_MANAGER"]
  };

  function can(perm, role) {
    if (!role) return true;
    const r = String(role).toUpperCase().trim().replace(/[\s-]+/g, "_");
    if (r === "SUPER_ADMIN" || r === "ADMIN" || r === "SUPERADMIN") return true;
    return (ROLE_CAN[perm] || []).some((p) => p.toUpperCase().replace(/[\s-]+/g, "_") === r);
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

  const LIBERIA_COUNTIES = [
    "Bomi", "Bong", "Gbarpolu", "Grand Bassa", "Grand Cape Mount",
    "Grand Gedeh", "Grand Kru", "Lofa", "Margibi", "Maryland",
    "Montserrado", "Nimba", "River Cess", "River Gee", "Sinoe"
  ];

  /* ---------------------------------------------------------
     PERSISTENT DELETION TOMBSTONES
  --------------------------------------------------------- */
  function getDeletedSubmissions() {
    try {
      return JSON.parse(localStorage.getItem("uaf_deleted_submissions") || "[]");
    } catch (_) {
      return [];
    }
  }

  function addDeletedSubmission(item) {
    if (!item) return;
    const deleted = getDeletedSubmissions();
    const entry = {
      rowNumber: item.rowNumber != null ? String(item.rowNumber) : "",
      id: item.id ? String(item.id) : "",
      timestamp: item.timestamp || "",
      reporterName: item.reporterName || "",
      childName: item.childName || "",
      county: item.county || item.residenceCounty || "",
      community: item.community || ""
    };
    if (!deleted.some(d => (entry.rowNumber && d.rowNumber === entry.rowNumber) || (entry.id && d.id === entry.id) || (entry.timestamp && d.timestamp === entry.timestamp && d.reporterName === entry.reporterName && (!entry.childName || d.childName === entry.childName)))) {
      deleted.push(entry);
    }
    try {
      localStorage.setItem("uaf_deleted_submissions", JSON.stringify(deleted));
    } catch (_) {}
  }

  function isSubmissionDeleted(item, deletedList) {
    if (!item) return true;
    const list = deletedList || getDeletedSubmissions();
    return list.some((d) => {
      if (d.rowNumber && item.rowNumber && String(d.rowNumber) === String(item.rowNumber)) return true;
      if (d.id && item.id && String(d.id) === String(item.id)) return true;
      if (d.timestamp && item.timestamp && d.timestamp === item.timestamp && (d.reporterName || "") === (item.reporterName || "")) {
        if (!d.childName || !item.childName || d.childName.trim().toLowerCase() === item.childName.trim().toLowerCase()) return true;
      }
      if (d.childName && item.childName && d.childName.trim().toLowerCase() === item.childName.trim().toLowerCase()) {
        const itemCo = (item.county || item.residenceCounty || "").trim().toLowerCase();
        const dCo = (d.county || "").trim().toLowerCase();
        if (!dCo || !itemCo || dCo === itemCo) return true;
      }
      return false;
    });
  }

  function getDeletedStats() {
    try {
      return JSON.parse(localStorage.getItem("uaf_deleted_stats") || "[]");
    } catch (_) {
      return [];
    }
  }

  function addDeletedStat(item) {
    if (!item) return;
    const deleted = getDeletedStats();
    const key = `${(item.county || "").toLowerCase().trim()}|${(item.community || "").toLowerCase().trim()}`;
    const entry = {
      key: key,
      rowNumber: item.rowNumber != null ? String(item.rowNumber) : "",
      county: item.county || "",
      community: item.community || ""
    };
    if (!deleted.some(d => (entry.key && d.key === entry.key) || (entry.rowNumber && d.rowNumber === entry.rowNumber))) {
      deleted.push(entry);
    }
    try {
      localStorage.setItem("uaf_deleted_stats", JSON.stringify(deleted));
      const delComms = JSON.parse(localStorage.getItem("uaf_deleted_communities") || "[]");
      if (key && !delComms.includes(key)) {
        delComms.push(key);
        localStorage.setItem("uaf_deleted_communities", JSON.stringify(delComms));
      }
    } catch (_) {}
  }

  function isStatDeleted(item, deletedList) {
    if (!item) return true;
    const list = deletedList || getDeletedStats();
    const key = `${(item.county || "").toLowerCase().trim()}|${(item.community || "").toLowerCase().trim()}`;
    return list.some((d) => {
      if (d.key && d.key === key) return true;
      if (d.rowNumber && String(d.rowNumber) === String(item.rowNumber)) return true;
      return false;
    });
  }

  // School Partnerships Tombstones
  function getDeletedPartnerships() {
    try {
      return JSON.parse(localStorage.getItem("uaf_deleted_partnerships") || "[]");
    } catch (_) {
      return [];
    }
  }

  function addDeletedPartnership(id, schoolName) {
    const list = getDeletedPartnerships();
    const str = String(id || schoolName || "").trim();
    if (str && !list.includes(str)) {
      list.push(str);
      try {
        localStorage.setItem("uaf_deleted_partnerships", JSON.stringify(list));
      } catch (_) {}
    }
  }

  function isPartnershipDeleted(item, deletedList) {
    if (!item) return true;
    const list = deletedList || getDeletedPartnerships();
    const id = String(item.id || "").trim();
    const name = String(item.schoolName || "").trim();
    return list.some((d) => (id && d === id) || (name && d === name));
  }

  // Empowerment Tombstones
  function getDeletedEmpowerment() {
    try {
      return JSON.parse(localStorage.getItem("uaf_deleted_empowerment") || "[]");
    } catch (_) {
      return [];
    }
  }

  function addDeletedEmpowerment(id, name) {
    const list = getDeletedEmpowerment();
    const str = String(id || name || "").trim();
    if (str && !list.includes(str)) {
      list.push(str);
      try {
        localStorage.setItem("uaf_deleted_empowerment", JSON.stringify(list));
      } catch (_) {}
    }
  }

  function isEmpowermentDeleted(item, deletedList) {
    if (!item) return true;
    const list = deletedList || getDeletedEmpowerment();
    const id = String(item.id || "").trim();
    const name = String(item.name || "").trim();
    return list.some((d) => (id && d === id) || (name && d === name));
  }

  /* ---------------------------------------------------------
     STATE & REGISTRIES
  --------------------------------------------------------- */
  let cachedSubmissions = [];
  let cachedStats = [];
  let cachedPartnerships = [];
  let cachedEmpowerment = [];
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
          <h2>Community Data, Field Reports &amp; Impact Operations</h2>
          <p class="admin-muted" style="margin-top:4px;">Manage out-of-school children, school enrollment records, school partnerships, empowerment trainees, and accurate community statistics.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="community-refresh-btn" class="btn btn--outline">Refresh All Data</button>
        </div>
      </div>

      <div id="community-flash"></div>

      <!-- View Switcher Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px;overflow-x:auto;">
        <button id="tab-submissions-btn" class="admin-filter-btn is-active">Out-of-School Children (<span id="count-sub-total">0</span>)</button>
        <button id="tab-partnerships-btn" class="admin-filter-btn">School Partnerships (<span id="count-partnerships-total">0</span>)</button>
        <button id="tab-empowerment-btn" class="admin-filter-btn">Empowerment Data (<span id="count-empowerment-total">0</span>)</button>
        <button id="tab-stats-btn" class="admin-filter-btn">Community Stats Directory (<span id="count-stats-total">0</span>)</button>
      </div>

      <!-- 1. Out-of-School Children View -->
      <div id="view-submissions">
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-card__label">Children Identified</div>
            <div class="admin-stat-card__value" id="stat-total-reports">0</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card__label">Enrolled In School</div>
            <div class="admin-stat-card__value" id="stat-enrolled-count" style="color:var(--green-700);">0</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card__label">Pending Verification</div>
            <div class="admin-stat-card__value" id="stat-pending-reports" style="color:var(--amber-600);">0</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card__label">Verified Reports</div>
            <div class="admin-stat-card__value" id="stat-verified-reports" style="color:var(--blue-700);">0</div>
          </div>
        </div>

        <div class="admin-filter-bar">
          <button class="admin-filter-btn is-active" data-sub-filter="ALL">All Records</button>
          <button class="admin-filter-btn" data-sub-filter="DRAFT">Pending / Draft</button>
          <button class="admin-filter-btn" data-sub-filter="VERIFIED">Verified</button>
          <button class="admin-filter-btn" data-sub-filter="ENROLLED">Enrolled</button>
          <button class="admin-filter-btn" data-sub-filter="REJECTED">Rejected</button>
        </div>

        <div class="admin-table-wrap">
          <div id="submissions-table-container">
            <p class="admin-muted" style="padding:24px;text-align:center;">Loading identified child cases…</p>
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

      <!-- 2. School Partnerships View -->
      <div id="view-partnerships" class="is-hidden">
        <div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <h3 style="font-size:15px;margin:0;color:var(--blue-900);">Verified School Partnerships</h3>
              <p class="admin-muted" style="margin:4px 0 0;font-size:12.5px;">Partner schools collaborating with UAF to enroll and subsidize out-of-school children.</p>
            </div>
            <button type="button" id="add-partnership-btn" class="btn btn--primary" style="font-size:12.5px;">+ Add School Partnership</button>
          </div>
        </div>
        <div class="admin-table-wrap">
          <div id="partnerships-table-container">
            <p class="admin-muted" style="padding:24px;text-align:center;">Loading school partnerships…</p>
          </div>
        </div>
      </div>

      <!-- 3. Empowerment Data View -->
      <div id="view-empowerment" class="is-hidden">
        <div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <h3 style="font-size:15px;margin:0;color:var(--blue-900);">Household Livelihood Empowerment Training Records</h3>
              <p class="admin-muted" style="margin:4px 0 0;font-size:12.5px;">Vocational training provided to caregivers to ensure sustainable household income for children's schooling.</p>
            </div>
            <button type="button" id="add-empowerment-btn" class="btn btn--primary" style="font-size:12.5px;">+ Add Empowerment Trainee</button>
          </div>
        </div>
        <div class="admin-table-wrap">
          <div id="empowerment-table-container">
            <p class="admin-muted" style="padding:24px;text-align:center;">Loading empowerment records…</p>
          </div>
        </div>
      </div>

      <!-- 4. Community Stats View -->
      <div id="view-stats" class="is-hidden">
        <!-- Global Indicators & Funding Editor -->
        <div class="admin-card" style="margin-bottom:18px;background:var(--blue-050);border:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h3 style="font-size:15px;margin:0;color:var(--blue-900);">Global Funding Target &amp; System Indicators</h3>
            <span class="admin-badge admin-badge--neutral">Target Settings</span>
          </div>
          <p class="admin-muted" style="margin-bottom:12px;font-size:12.5px;">Set overall campaign funding goals. Community balances are automatically calculated by deducting verified donations.</p>
          <form id="global-kpis-form">
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
              <div class="form-field">
                <label for="kpi-amount-needed">Total Campaign Target ($USD)</label>
                <input type="number" id="kpi-amount-needed" min="0" value="0" />
              </div>
              <div class="form-field">
                <label for="kpi-amount-raised">Total Donations Verified ($USD)</label>
                <input type="number" id="kpi-amount-raised" min="0" value="0" />
              </div>
            </div>
            <div style="margin-top:12px;text-align:right;">
              <button type="submit" class="btn btn--primary" style="font-size:12.5px;">Save Global Funding</button>
            </div>
          </form>
        </div>

        <!-- Download / Export & Directory Controls -->
        <div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
            <div>
              <h3 style="font-size:15px;margin:0;color:var(--blue-900);">Verified Community Indicators Directory</h3>
              <p class="admin-muted" style="margin:2px 0 0;font-size:12px;">Statistics accurately derived from out-of-school records, enrollments, empowerment, and partnerships.</p>
            </div>
            <div style="display:flex;gap:8px;">
              <button id="add-stat-btn" class="btn btn--primary" style="font-size:12.5px;">+ Set Community Target</button>
            </div>
          </div>

          <!-- Download Community Data Filter Bar -->
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;padding-top:10px;border-top:1px solid var(--ink-100);">
            <div style="flex:1;min-width:130px;">
              <label style="display:block;font-size:11.5px;font-weight:600;color:var(--ink-600);margin-bottom:4px;">Year</label>
              <select id="export-comm-year" style="width:100%;padding:6px 10px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;">
                <option value="ALL">All Years</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            <div style="flex:1;min-width:150px;">
              <label style="display:block;font-size:11.5px;font-weight:600;color:var(--ink-600);margin-bottom:4px;">Location / County</label>
              <select id="export-comm-location" style="width:100%;padding:6px 10px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;">
                <option value="ALL">All 15 Counties</option>
                ${LIBERIA_COUNTIES.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>
            <div>
              <button type="button" id="btn-download-community-csv" class="btn btn--outline" style="font-size:12px;padding:6px 12px;display:flex;align-items:center;gap:6px;background:#f8fafc;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download CSV</span>
              </button>
            </div>
          </div>
        </div>

        <div class="admin-table-wrap">
          <div id="stats-table-container">
            <p class="admin-muted" style="padding:24px;text-align:center;">Loading community stats…</p>
          </div>
        </div>
      </div>

      <!-- MODAL 1: Child School Enrollment -->
      <div id="child-enrollment-modal" class="admin-modal-overlay is-hidden">
        <div class="admin-modal" style="max-width:520px;">
          <h3 id="enroll-modal-title">Enroll Child in School</h3>
          <p class="admin-muted" id="enroll-modal-subtitle" style="font-size:12px;margin:2px 0 14px;"></p>
          <form id="child-enrollment-form">
            <input type="hidden" id="enroll-child-row" />
            <div class="form-field">
              <label for="enroll-date">Date of Enrollment *</label>
              <input type="date" id="enroll-date" required />
            </div>
            <div class="form-field">
              <label for="enroll-school-select">Select School (Partner Schools or Type Below) *</label>
              <select id="enroll-school-select" style="margin-bottom:8px;">
                <option value="">-- Choose from Registered Partner Schools --</option>
              </select>
              <input type="text" id="enroll-school-custom" placeholder="Or type new / community school name" />
            </div>
            <div class="form-field">
              <label for="enroll-school-year">School Year *</label>
              <select id="enroll-school-year" required>
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026" selected>2025/2026</option>
                <option value="2026/2027">2026/2027</option>
                <option value="2027/2028">2027/2028</option>
              </select>
            </div>
            <div class="form-field">
              <label for="enroll-notes">Enrollment / Subsidization Notes (Optional)</label>
              <input type="text" id="enroll-notes" placeholder="e.g. Tuition waived, uniforms provided" />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
              <button type="button" id="enroll-modal-cancel" class="btn btn--outline">Cancel</button>
              <button type="submit" class="btn btn--primary">Save School Enrollment</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL 2: Add School Partnership -->
      <div id="partnership-modal" class="admin-modal-overlay is-hidden">
        <div class="admin-modal" style="max-width:540px;">
          <h3 id="partnership-modal-title">Add School Partnership</h3>
          <form id="partnership-form" style="margin-top:12px;">
            <input type="hidden" id="partner-id" />
            <div class="form-field">
              <label for="partner-school-name">School Name *</label>
              <input type="text" id="partner-school-name" required placeholder="e.g. St. Mary Community Public School" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="partner-county">County / Location *</label>
                <select id="partner-county" required>
                  ${LIBERIA_COUNTIES.map(c => `<option value="${c}" ${c === 'Montserrado' ? 'selected' : ''}>${c}</option>`).join("")}
                </select>
              </div>
              <div class="form-field">
                <label for="partner-community">Community / Town *</label>
                <input type="text" id="partner-community" required placeholder="e.g. Duport Road" />
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="partner-rep-name">Representative Name *</label>
                <input type="text" id="partner-rep-name" required placeholder="Principal / Dean name" />
              </div>
              <div class="form-field">
                <label for="partner-telephone">Telephone *</label>
                <input type="tel" id="partner-telephone" required placeholder="088... or 077..." />
              </div>
            </div>
            <div class="form-field">
              <label for="partner-date">Date of Partnership *</label>
              <input type="date" id="partner-date" required />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
              <button type="button" id="partner-modal-cancel" class="btn btn--outline">Cancel</button>
              <button type="submit" class="btn btn--primary">Save Partnership</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL 3: Add Empowerment Trainee -->
      <div id="empowerment-modal" class="admin-modal-overlay is-hidden">
        <div class="admin-modal" style="max-width:560px;">
          <h3 id="empowerment-modal-title">Add Empowerment Trainee</h3>
          <form id="empowerment-form" style="margin-top:12px;">
            <input type="hidden" id="empower-id" />
            <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="empower-name">Caregiver / Trainee Full Name *</label>
                <input type="text" id="empower-name" required placeholder="Full Name" />
              </div>
              <div class="form-field">
                <label for="empower-gender">Gender *</label>
                <select id="empower-gender" required>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="empower-county">County *</label>
                <select id="empower-county" required>
                  ${LIBERIA_COUNTIES.map(c => `<option value="${c}" ${c === 'Montserrado' ? 'selected' : ''}>${c}</option>`).join("")}
                </select>
              </div>
              <div class="form-field">
                <label for="empower-community">Community / Town *</label>
                <input type="text" id="empower-community" required placeholder="e.g. Duport Road" />
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="empower-skill">Skill Trained *</label>
                <select id="empower-skill" required>
                  <option value="Soap Making">Soap Making</option>
                  <option value="Tie-Dye / Batik">Tie-Dye / Batik</option>
                  <option value="Baking & Pastry">Baking &amp; Pastry</option>
                  <option value="Tailoring & Sewing">Tailoring &amp; Sewing</option>
                  <option value="Sustainable Agriculture">Sustainable Agriculture</option>
                  <option value="Computer Literacy">Computer Literacy</option>
                  <option value="Small Business / Susu Management">Small Business / Susu Management</option>
                  <option value="Other Vocational Skill">Other Vocational Skill</option>
                </select>
              </div>
              <div class="form-field">
                <label for="empower-contact">Contact Telephone *</label>
                <input type="tel" id="empower-contact" required placeholder="088... or 077..." />
              </div>
            </div>
            <div class="form-field">
              <label for="empower-child-select">Connected to Child (Optional)</label>
              <select id="empower-child-select">
                <option value="">-- None / General Household --</option>
              </select>
            </div>
            <div class="form-field">
              <label for="empower-photo">Trainee Photo (Optional)</label>
              <input type="file" id="empower-photo" accept="image/*" />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
              <button type="button" id="empower-modal-cancel" class="btn btn--outline">Cancel</button>
              <button type="submit" class="btn btn--primary">Save Empowerment Record</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL 4: Set Manual Community Target -->
      <div id="stat-target-modal" class="admin-modal-overlay is-hidden">
        <div class="admin-modal" style="max-width:500px;">
          <h3 id="stat-target-modal-title">Set Community Funding Target</h3>
          <p class="admin-muted" style="font-size:12px;margin:2px 0 14px;">Set the funding target to raise manually. Donations will automatically deduct from it to find the balance to raise.</p>
          <form id="stat-target-form">
            <input type="hidden" id="stat-target-row" />
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="stat-target-county">County *</label>
                <select id="stat-target-county" required>
                  ${LIBERIA_COUNTIES.map(c => `<option value="${c}" ${c === 'Montserrado' ? 'selected' : ''}>${c}</option>`).join("")}
                </select>
              </div>
              <div class="form-field">
                <label for="stat-target-community">Community Name *</label>
                <input type="text" id="stat-target-community" required placeholder="e.g. Duport Road" />
              </div>
            </div>
            <div class="form-field">
              <label for="stat-target-amount">Amount to Raise ($USD) *</label>
              <input type="number" id="stat-target-amount" min="0" required placeholder="e.g. 5000" />
            </div>
            <div class="form-field">
              <label for="stat-target-notes">Methodology / Notes (Optional)</label>
              <input type="text" id="stat-target-notes" placeholder="Field census / door-to-door survey target" />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
              <button type="button" id="stat-target-modal-cancel" class="btn btn--outline">Cancel</button>
              <button type="submit" class="btn btn--primary">Save Funding Target</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL 5: Case Detail View Modal -->
      <div id="case-detail-modal" class="admin-modal-backdrop is-hidden" style="position:fixed;inset:0;background:rgba(15,23,42,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;">
        <div class="admin-modal-card" style="background:#ffffff;border-radius:16px;max-width:720px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
            <div>
              <h3 id="case-detail-title" style="margin:0;font-size:17px;color:var(--ink-900);">Child Case Review &amp; Field Verification</h3>
              <p class="admin-muted" id="case-detail-subtitle" style="margin:4px 0 0;font-size:12px;">Submitted report breakdown</p>
            </div>
            <button type="button" id="case-detail-close" class="btn btn--outline" style="padding:4px 10px;font-size:12px;">&times; Close</button>
          </div>
          <div id="case-detail-content"></div>
          <div id="case-detail-actions" style="display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border);padding-top:16px;margin-top:20px;"></div>
        </div>
      </div>
    `;

    // Tab switcher events
    const tabSubBtn = document.getElementById("tab-submissions-btn");
    const tabPartnersBtn = document.getElementById("tab-partnerships-btn");
    const tabEmpowerBtn = document.getElementById("tab-empowerment-btn");
    const tabStatsBtn = document.getElementById("tab-stats-btn");

    const viewSub = document.getElementById("view-submissions");
    const viewPartners = document.getElementById("view-partnerships");
    const viewEmpower = document.getElementById("view-empowerment");
    const viewStats = document.getElementById("view-stats");

    function switchTab(tabKey) {
      currentTab = tabKey;
      [tabSubBtn, tabPartnersBtn, tabEmpowerBtn, tabStatsBtn].forEach(b => b?.classList.remove("is-active"));
      [viewSub, viewPartners, viewEmpower, viewStats].forEach(v => v?.classList.add("is-hidden"));

      if (tabKey === "submissions") {
        tabSubBtn?.classList.add("is-active");
        viewSub?.classList.remove("is-hidden");
        loadSubmissions(session);
      } else if (tabKey === "partnerships") {
        tabPartnersBtn?.classList.add("is-active");
        viewPartners?.classList.remove("is-hidden");
        loadPartnerships(session);
      } else if (tabKey === "empowerment") {
        tabEmpowerBtn?.classList.add("is-active");
        viewEmpower?.classList.remove("is-hidden");
        loadEmpowerment(session);
      } else if (tabKey === "stats") {
        tabStatsBtn?.classList.add("is-active");
        viewStats?.classList.remove("is-hidden");
        loadStats(session);
      }
    }

    tabSubBtn?.addEventListener("click", () => switchTab("submissions"));
    tabPartnersBtn?.addEventListener("click", () => switchTab("partnerships"));
    tabEmpowerBtn?.addEventListener("click", () => switchTab("empowerment"));
    tabStatsBtn?.addEventListener("click", () => switchTab("stats"));

    // Global refresh
    document.getElementById("community-refresh-btn")?.addEventListener("click", () => {
      loadSubmissions(session);
      loadPartnerships(session);
      loadEmpowerment(session);
      loadStats(session);
      flash("Refreshed all community data.", "success");
    });

    // Submissions filter buttons
    const filterBtns = container.querySelectorAll("button[data-sub-filter]");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        statusFilter = btn.dataset.subFilter;
        renderSubmissionsTable(session);
      });
    });

    // Enrollment Modal handlers
    const enrollModal = document.getElementById("child-enrollment-modal");
    document.getElementById("enroll-modal-cancel")?.addEventListener("click", () => {
      enrollModal.classList.add("is-hidden");
    });
    document.getElementById("child-enrollment-form")?.addEventListener("submit", (e) => handleSaveEnrollment(e, session));

    // School Partnerships Modal handlers
    const partnerModal = document.getElementById("partnership-modal");
    document.getElementById("add-partnership-btn")?.addEventListener("click", () => {
      document.getElementById("partnership-form").reset();
      document.getElementById("partner-id").value = "";
      document.getElementById("partner-date").value = new Date().toISOString().split("T")[0];
      document.getElementById("partnership-modal-title").textContent = "Add School Partnership";
      partnerModal.classList.remove("is-hidden");
    });
    document.getElementById("partner-modal-cancel")?.addEventListener("click", () => {
      partnerModal.classList.add("is-hidden");
    });
    document.getElementById("partnership-form")?.addEventListener("submit", (e) => handleSavePartnership(e, session));

    // Empowerment Modal handlers
    const empowerModal = document.getElementById("empowerment-modal");
    document.getElementById("add-empowerment-btn")?.addEventListener("click", () => {
      document.getElementById("empowerment-form").reset();
      document.getElementById("empower-id").value = "";
      document.getElementById("empowerment-modal-title").textContent = "Add Empowerment Trainee";
      populateConnectedChildrenDropdown();
      empowerModal.classList.remove("is-hidden");
    });
    document.getElementById("empower-modal-cancel")?.addEventListener("click", () => {
      empowerModal.classList.add("is-hidden");
    });
    document.getElementById("empowerment-form")?.addEventListener("submit", (e) => handleSaveEmpowerment(e, session));

    // Set Target Modal handlers
    const targetModal = document.getElementById("stat-target-modal");
    document.getElementById("add-stat-btn")?.addEventListener("click", () => {
      document.getElementById("stat-target-form").reset();
      document.getElementById("stat-target-row").value = "";
      document.getElementById("stat-target-modal-title").textContent = "Set Community Funding Target";
      targetModal.classList.remove("is-hidden");
    });
    document.getElementById("stat-target-modal-cancel")?.addEventListener("click", () => {
      targetModal.classList.add("is-hidden");
    });
    document.getElementById("stat-target-form")?.addEventListener("submit", (e) => handleSaveTarget(e, session));

    // Download CSV
    document.getElementById("btn-download-community-csv")?.addEventListener("click", downloadCommunityCsv);

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
        try {
          localStorage.setItem("uaf_admin_funding", JSON.stringify(funding));
          window.dispatchEvent(new Event("uaf_data_updated"));
          flash("Global campaign funding targets saved.", "success");
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

    // Initial load
    loadSubmissions(session);
    loadPartnerships(session);
    loadEmpowerment(session);
    loadStats(session);
  }

  function flash(message, kind) {
    const el = document.getElementById("community-flash");
    if (!el) return;
    el.innerHTML = `<div class="admin-error" style="${kind === "success" ? "background:var(--green-050);color:var(--green-700);border:1px solid #C4E7D4;" : ""}">${escapeHtml(message)}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ""; }, 5000);
  }

  /* ---------------------------------------------------------
     1. OUT-OF-SCHOOL CHILDREN LOGIC
  --------------------------------------------------------- */
  async function loadSubmissions(session) {
    const container = document.getElementById("submissions-table-container");
    if (!container) return;
    container.innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading identified children…</p>';

    let items = [];
    try {
      if (API_URL) {
        try {
          const res = await callApi("listOutOfSchoolSubmissions", { token: session.token });
          if (res.ok && Array.isArray(res.submissions)) {
            items = res.submissions;
          }
        } catch (err) {
          console.warn("API list error, using local fallback", err);
        }
      }

      // Check local storage reports as well
      const localReports = JSON.parse(localStorage.getItem("uaf_ossc_reports") || "[]");
      if (localReports.length > 0) {
        const mapped = localReports.map((lr, idx) => ({
          rowNumber: lr.rowNumber || -(idx + 1),
          id: lr.id || `ossc_${idx + 1}`,
          timestamp: lr.timestamp || new Date().toISOString(),
          county: lr.residenceCounty || lr.county || (lr.children && lr.children[0] && lr.children[0].childOrigin) || "Montserrado",
          community: lr.childCommunity || lr.community || (lr.children && lr.children[0] && lr.children[0].childCommunity) || "Duport Road",
          residenceCounty: lr.residenceCounty || lr.county || "Montserrado",
          originCounty: lr.originCounty || lr.childOrigin || "",
          reporterName: lr.reporterName || "Field Enumerator",
          reporterPhone: lr.reporterPhone || "—",
          approxChildCount: 1,
          notes: lr.statement || lr.notes || (lr.children ? lr.children.map((c) => c.statement).join("; ") : "Local field report"),
          status: lr.status || (lr.enrolled ? "ENROLLED" : "DRAFT"),
          enrolled: lr.enrolled === true || lr.status === "ENROLLED",
          enrolledSchool: lr.enrolledSchool || "",
          enrollmentDate: lr.enrollmentDate || "",
          schoolYear: lr.schoolYear || "",
          reviewedBy: lr.reviewedBy || "",
          reviewedAt: lr.reviewedAt || "",
          reviewerNotes: lr.reviewerNotes || "",
          children: lr.children || [],
          childName: lr.childName || (lr.children && lr.children.map((c) => c.childName).join(", ")) || "Identified Child",
          gender: lr.gender || "—",
          childAge: lr.childAge || "—",
          livingWith: lr.livingWith || "—",
          photoData: lr.photoData || lr.childPhotoData || (lr.children && lr.children[0] && lr.children[0].childPhotoData) || "",
          causeOfExclusion: lr.causeOfExclusion || "—",
          parentName: lr.parentName || "—",
          parentPhone: lr.parentPhone || "—",
          consent: lr.consent !== false,
          isLocal: true
        }));

        mapped.forEach((ml) => {
          if (!items.some((it) => it.timestamp === ml.timestamp && it.childName === ml.childName)) {
            items.unshift(ml);
          }
        });
      }

      // Filter out permanently deleted tombstones
      const deletedList = getDeletedSubmissions();
      items = items.filter((it) => !isSubmissionDeleted(it, deletedList));

      // Synchronize cleaned reports in localStorage
      if (localReports.length > 0) {
        const cleanedReports = localReports.filter((lr, idx) => {
          const rowNum = lr.rowNumber || -(idx + 1);
          return !isSubmissionDeleted({ ...lr, rowNumber: rowNum }, deletedList);
        });
        if (cleanedReports.length !== localReports.length) {
          try {
            localStorage.setItem("uaf_ossc_reports", JSON.stringify(cleanedReports));
          } catch (_) {}
        }
      }

      cachedSubmissions = items;
      updateSubmissionsStats(cachedSubmissions);
      renderSubmissionsTable(session);
    } catch (err) {
      container.innerHTML = '<div class="admin-error" style="margin:16px;">Error loading child cases.</div>';
    }
  }

  function updateSubmissionsStats(items) {
    let pendingCount = 0;
    let verifiedCount = 0;
    let enrolledCount = 0;

    items.forEach((item) => {
      const st = String(item.status || "DRAFT").toUpperCase();
      if (st === "DRAFT" || st === "UNDER_REVIEW") pendingCount++;
      if (st === "VERIFIED") verifiedCount++;
      if (item.enrolled === true || st === "ENROLLED") enrolledCount++;
    });

    const elTotal = document.getElementById("stat-total-reports");
    const elPending = document.getElementById("stat-pending-reports");
    const elVerified = document.getElementById("stat-verified-reports");
    const elEnrolled = document.getElementById("stat-enrolled-count");
    const elCountSub = document.getElementById("count-sub-total");

    if (elTotal) elTotal.textContent = items.length;
    if (elPending) elPending.textContent = pendingCount;
    if (elVerified) elVerified.textContent = verifiedCount;
    if (elEnrolled) elEnrolled.textContent = enrolledCount;
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
        if (statusFilter === "ENROLLED") return it.enrolled === true || st === "ENROLLED";
        return st === statusFilter;
      });
    }

    if (items.length === 0) {
      container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No identified child records in this category.</p>';
      return;
    }

    const rows = items.map((r) => {
      const st = String(r.status || "DRAFT").toUpperCase();
      let badgeCls = "admin-badge--pending";
      if (st === "VERIFIED") badgeCls = "admin-badge--verified";
      if (st === "ENROLLED" || r.enrolled) badgeCls = "admin-badge--verified";
      if (st === "REJECTED") badgeCls = "admin-badge--rejected";

      let enrollmentCell = "";
      if (r.enrolled || st === "ENROLLED") {
        enrollmentCell = `
          <div>
            <span class="admin-badge admin-badge--verified" style="font-size:11px;font-weight:700;">✓ Enrolled</span>
            <div style="font-size:11px;font-weight:600;color:var(--blue-900);margin-top:2px;">${escapeHtml(r.enrolledSchool || "Partner School")}</div>
            <div style="font-size:10.5px;color:var(--ink-500);">${escapeHtml(r.schoolYear || "")} · ${formatDate(r.enrollmentDate)}</div>
            <button class="btn btn--outline btn-enroll-child" data-row="${r.rowNumber}" style="font-size:10px;padding:2px 6px;margin-top:4px;">Change School</button>
          </div>
        `;
      } else {
        enrollmentCell = `
          <button class="btn btn--primary btn-enroll-child" data-row="${r.rowNumber}" style="font-size:11px;padding:4px 9px;white-space:nowrap;background:var(--blue-700);">
            + Enroll Child
          </button>
        `;
      }

      let actionsHtml = `<button class="btn btn--outline" style="font-size:11px;padding:3px 8px;margin-bottom:4px;display:block;" data-sub-action="view" data-row="${r.rowNumber}">View Case</button>`;

      if (can("REVIEW_SUBMISSIONS", session.role) && (st === "DRAFT" || st === "UNDER_REVIEW")) {
        actionsHtml += `
          <div style="display:flex;gap:4px;margin-bottom:4px;">
            <button class="btn--verify" style="font-size:10.5px;padding:3px 7px;" data-sub-action="verify" data-row="${r.rowNumber}">Verify</button>
            <button class="btn--reject" style="font-size:10.5px;padding:3px 7px;" data-sub-action="reject" data-row="${r.rowNumber}">Reject</button>
          </div>
        `;
      }

      actionsHtml += `<button class="btn btn--outline" style="font-size:11px;padding:3px 8px;color:var(--red-700);display:block;" data-sub-action="delete" data-row="${r.rowNumber}">Delete</button>`;

      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              ${r.photoData ? `
                <img src="${r.photoData}" alt="Child" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #cbd5e1;flex-shrink:0;" />
              ` : `
                <div style="width:36px;height:36px;border-radius:50%;background:#e0f2fe;color:#0369a1;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">
                  ${escapeHtml((r.childName || "C").charAt(0).toUpperCase())}
                </div>
              `}
              <div>
                <strong>${escapeHtml(r.childName || "Child Case")}</strong>
                <div style="font-size:11px;color:var(--ink-500);">${escapeHtml(r.gender || "—")} · Age ${escapeHtml(r.childAge || "—")}</div>
              </div>
            </div>
          </td>
          <td>
            <div><strong>Residence:</strong> ${escapeHtml(r.residenceCounty || r.county)}</div>
            <div style="font-size:11.5px;color:var(--ink-600);">${escapeHtml(r.community)}</div>
            ${r.originCounty ? `<div style="font-size:10.5px;color:var(--ink-400);margin-top:2px;">Origin: ${escapeHtml(r.originCounty)}</div>` : ""}
          </td>
          <td>
            <div>${escapeHtml(r.parentName || "—")}</div>
            <div style="font-size:11px;color:var(--ink-500);">${escapeHtml(r.parentPhone || "No Phone")} · ${escapeHtml(r.livingWith || "—")}</div>
          </td>
          <td style="max-width:180px;font-size:12px;white-space:normal;">
            <span style="color:#b91c1c;font-weight:600;">${escapeHtml(r.causeOfExclusion || "Out of School")}</span>
          </td>
          <td>
            <span class="admin-badge ${badgeCls}">${escapeHtml(r.enrolled ? "ENROLLED" : st)}</span>
          </td>
          <td>
            ${enrollmentCell}
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
            <th>Child / Demographics</th>
            <th>Residence &amp; Origin</th>
            <th>Caregiver / Contact</th>
            <th>Reason Out of School</th>
            <th>Status</th>
            <th>School Enrollment</th>
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
    container.querySelectorAll("button[data-sub-action='delete']").forEach((b) => {
      b.addEventListener("click", () => handleDeleteSub(Number(b.dataset.row), session));
    });
    container.querySelectorAll(".btn-enroll-child").forEach((b) => {
      b.addEventListener("click", () => openEnrollChildModal(Number(b.dataset.row), session));
    });
  }

  function handleDeleteSub(rowNumber, session) {
    if (!confirm("Are you sure you want to permanently delete this child record? This action cannot be undone.")) return;
    const target = cachedSubmissions.find((item) => Number(item.rowNumber) === rowNumber);
    addDeletedSubmission(target || { rowNumber });

    // Clean up uaf_ossc_reports in localStorage
    try {
      const localReports = JSON.parse(localStorage.getItem("uaf_ossc_reports") || "[]");
      const filteredReports = localReports.filter((lr, idx) => {
        const rNum = lr.rowNumber || -(idx + 1);
        if (Number(rNum) === rowNumber) return false;
        if (target && target.timestamp && lr.timestamp === target.timestamp && (lr.childName || "") === (target.childName || "")) return false;
        return true;
      });
      localStorage.setItem("uaf_ossc_reports", JSON.stringify(filteredReports));
    } catch (_) {}

    cachedSubmissions = cachedSubmissions.filter((item) => Number(item.rowNumber) !== rowNumber && !isSubmissionDeleted(item));
    updateSubmissionsStats(cachedSubmissions);
    renderSubmissionsTable(session);
    loadStats(session);
    window.dispatchEvent(new Event("uaf_data_updated"));
    flash("Child record permanently deleted.", "success");

    // Server deletion
    try {
      callApi("deleteOutOfSchoolSubmission", {
        token: session?.token,
        rowNumber: rowNumber,
        id: target?.id,
        timestamp: target?.timestamp,
        childName: target?.childName
      }).catch(() => {});
    } catch (_) {}
  }

  function showSubmissionDetailModal(sub, session) {
    const modal = document.getElementById("case-detail-modal");
    const content = document.getElementById("case-detail-content");
    const actions = document.getElementById("case-detail-actions");
    const title = document.getElementById("case-detail-title");
    const subtitle = document.getElementById("case-detail-subtitle");
    if (!modal || !content) return;

    if (title) title.textContent = `Child Case Profile: ${sub.childName}`;
    if (subtitle) subtitle.textContent = `Reported on ${formatDate(sub.timestamp)} by ${sub.reporterName || "Enumerator"} (${sub.reporterPhone || "No contact"})`;

    const st = String(sub.status || "DRAFT").toUpperCase();

    content.innerHTML = `
      <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;background:#004F71;color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;margin-bottom:12px;">
          <span>${escapeHtml(sub.childName)}</span>
          <span style="font-size:12px;opacity:0.9;">Age: ${escapeHtml(sub.childAge || "—")} · Gender: ${escapeHtml(sub.gender || "—")}</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:10px;font-size:12.5px;margin-bottom:12px;">
          <div><strong>Current County of Residence:</strong> <span style="color:#0369a1;font-weight:700;">${escapeHtml(sub.residenceCounty || sub.county || "—")}</span></div>
          <div><strong>Town / Community:</strong> ${escapeHtml(sub.community || "—")}</div>
          <div><strong>County of Origin:</strong> ${escapeHtml(sub.originCounty || "—")}</div>
          <div><strong>Living Arrangement:</strong> ${escapeHtml(sub.livingWith || "—")}</div>
          <div><strong>Years Out of School:</strong> ${escapeHtml(sub.yearsOut || "—")}</div>
          <div><strong>Primary Cause of Exclusion:</strong> <span style="color:#b91c1c;font-weight:600;">${escapeHtml(sub.causeOfExclusion || "—")}</span></div>
        </div>

        ${sub.photoData ? `
          <div style="margin-bottom:12px;">
            <div style="font-size:11.5px;font-weight:700;color:var(--ink-700);margin-bottom:4px;">Child Identification Portrait:</div>
            <img src="${sub.photoData}" alt="Child Photo" style="max-height:180px;max-width:260px;border-radius:8px;border:1px solid #cbd5e1;object-fit:cover;" />
          </div>
        ` : ""}

        <div style="border-top:1px dashed #cbd5e1;padding-top:10px;margin-top:10px;font-size:12.5px;">
          <div><strong>Parent / Caregiver:</strong> ${escapeHtml(sub.parentName || "—")} (${escapeHtml(sub.parentPhone || "No contact")})</div>
        </div>

        <div style="margin-top:12px;">
          <div style="font-size:12px;font-weight:700;color:var(--ink-800);margin-bottom:4px;">Field Narrative &amp; Living Condition:</div>
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #004F71;padding:10px 14px;border-radius:4px;font-size:12.5px;line-height:1.5;color:var(--ink-800);">
            ${escapeHtml(sub.notes || "No case narrative recorded.")}
          </div>
        </div>

        <div style="margin-top:10px;font-size:11.5px;color:#166534;background:#f0fdf4;padding:8px 12px;border-radius:6px;">
          ✓ <strong>Parental Consent Confirmed:</strong> Agreement signed for UAF advocacy &amp; educational sponsorship.
        </div>
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
            ${st === "VERIFIED" || sub.enrolled ? `<span style="color:var(--green-700);font-weight:700;">✓ Verified</span> by ${escapeHtml(sub.reviewedBy || "Admin")} on ${formatDate(sub.reviewedAt)}` : `<span style="color:var(--red-600);font-weight:700;">✗ Rejected:</span> ${escapeHtml(sub.reviewerNotes || "Report declined")}`}
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
      notes = window.prompt("Verification notes (e.g. Verified by phone or field visit):", "Verified by field team");
      if (notes === null) return;
    }

    const localReports = JSON.parse(localStorage.getItem("uaf_ossc_reports") || "[]");
    const target = localReports.find(r => Number(r.rowNumber) === rowNumber) || localReports[Math.abs(rowNumber) - 1];
    if (target) {
      target.status = newStatus;
      target.reviewedBy = session.name || "Admin";
      target.reviewedAt = new Date().toISOString();
      target.reviewerNotes = (notes || "").trim();
      localStorage.setItem("uaf_ossc_reports", JSON.stringify(localReports));
      flash(`Report successfully updated to ${newStatus}.`, "success");
      loadSubmissions(session);
      loadStats(session);
      window.dispatchEvent(new Event("uaf_data_updated"));
      return;
    }

    try {
      const res = await callApi("reviewOutOfSchoolSubmission", {
        token: session.token,
        rowNumber: rowNumber,
        status: newStatus,
        reviewerNotes: notes
      });
      if (res.ok) {
        flash(`Report #${rowNumber} updated to ${newStatus}.`, "success");
        loadSubmissions(session);
        loadStats(session);
        window.dispatchEvent(new Event("uaf_data_updated"));
      } else {
        flash(res.error || "Update failed.");
      }
    } catch (err) {
      flash("Connection error.");
    }
  }

  /* ---------------------------------------------------------
     CHILD ENROLLMENT MODAL & LOGIC
  --------------------------------------------------------- */
  function openEnrollChildModal(rowNumber, session) {
    const sub = cachedSubmissions.find(s => Number(s.rowNumber) === rowNumber);
    if (!sub) return;

    const modal = document.getElementById("child-enrollment-modal");
    document.getElementById("enroll-child-row").value = rowNumber;
    document.getElementById("enroll-modal-title").textContent = `Enroll ${sub.childName} in School`;
    document.getElementById("enroll-modal-subtitle").textContent = `Current Location: ${sub.residenceCounty || sub.county} · ${sub.community}`;
    document.getElementById("enroll-date").value = sub.enrollmentDate || new Date().toISOString().split("T")[0];
    document.getElementById("enroll-school-year").value = sub.schoolYear || "2025/2026";
    document.getElementById("enroll-school-custom").value = "";
    document.getElementById("enroll-notes").value = sub.reviewerNotes || "";

    // Populate Partner Schools dropdown
    const select = document.getElementById("enroll-school-select");
    select.innerHTML = '<option value="">-- Choose from Registered Partner Schools --</option>';

    // Load active partnerships
    const partners = JSON.parse(localStorage.getItem("uaf_school_partnerships") || "[]");
    partners.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.schoolName;
      opt.textContent = `${p.schoolName} (${p.location || p.county})`;
      if (sub.enrolledSchool && sub.enrolledSchool === p.schoolName) opt.selected = true;
      select.appendChild(opt);
    });

    if (sub.enrolledSchool && !partners.some(p => p.schoolName === sub.enrolledSchool)) {
      document.getElementById("enroll-school-custom").value = sub.enrolledSchool;
    }

    modal.classList.remove("is-hidden");
  }

  async function handleSaveEnrollment(e, session) {
    e.preventDefault();
    const rowNumber = Number(document.getElementById("enroll-child-row").value);
    const date = document.getElementById("enroll-date").value;
    const selectedSchool = document.getElementById("enroll-school-select").value.trim();
    const customSchool = document.getElementById("enroll-school-custom").value.trim();
    const schoolName = customSchool || selectedSchool;
    const schoolYear = document.getElementById("enroll-school-year").value;
    const notes = document.getElementById("enroll-notes").value.trim();

    if (!schoolName) {
      alert("Please select a partner school or type a custom school name.");
      return;
    }

    const sub = cachedSubmissions.find(s => Number(s.rowNumber) === rowNumber);
    if (!sub) return;

    // Update in memory
    sub.enrolled = true;
    sub.status = "ENROLLED";
    sub.enrolledSchool = schoolName;
    sub.enrollmentDate = date;
    sub.schoolYear = schoolYear;
    sub.reviewedBy = session.name || "Admin";
    sub.reviewedAt = new Date().toISOString();

    // Update uaf_ossc_reports in localStorage
    try {
      const reports = JSON.parse(localStorage.getItem("uaf_ossc_reports") || "[]");
      const target = reports.find(r => Number(r.rowNumber) === rowNumber) || reports.find(r => r.childName === sub.childName);
      if (target) {
        target.enrolled = true;
        target.status = "ENROLLED";
        target.enrolledSchool = schoolName;
        target.enrollmentDate = date;
        target.schoolYear = schoolYear;
      }
      localStorage.setItem("uaf_ossc_reports", JSON.stringify(reports));
    } catch (_) {}

    // Store in uaf_child_enrollments
    try {
      const enrollments = JSON.parse(localStorage.getItem("uaf_child_enrollments") || "[]");
      const existingIdx = enrollments.findIndex(en => Number(en.childRow) === rowNumber || en.childName === sub.childName);
      const enrObj = {
        id: "enr_" + Date.now(),
        childRow: rowNumber,
        childName: sub.childName,
        county: sub.residenceCounty || sub.county,
        community: sub.community,
        schoolName: schoolName,
        enrollmentDate: date,
        schoolYear: schoolYear,
        notes: notes,
        enrolledBy: session.name || "Admin",
        createdAt: new Date().toISOString()
      };
      if (existingIdx >= 0) enrollments[existingIdx] = enrObj;
      else enrollments.unshift(enrObj);
      localStorage.setItem("uaf_child_enrollments", JSON.stringify(enrollments));
    } catch (_) {}

    // Background backend call
    try {
      callApi("enrollChild", {
        token: session.token,
        rowNumber: rowNumber,
        childName: sub.childName,
        schoolName: schoolName,
        enrollmentDate: date,
        schoolYear: schoolYear,
        notes: notes
      }).catch(() => {});
    } catch (_) {}

    document.getElementById("child-enrollment-modal").classList.add("is-hidden");
    flash(`Child "${sub.childName}" successfully enrolled in ${schoolName}!`, "success");
    renderSubmissionsTable(session);
    loadStats(session);
    window.dispatchEvent(new Event("uaf_data_updated"));
  }

  /* ---------------------------------------------------------
     2. SCHOOL PARTNERSHIPS LOGIC
  --------------------------------------------------------- */
  async function loadPartnerships(session) {
    const container = document.getElementById("partnerships-table-container");
    if (!container) return;

    let items = [];
    try {
      if (API_URL) {
        const res = await callApi("listSchoolPartnerships", { token: session.token });
        if (res && res.ok && Array.isArray(res.partnerships)) items = res.partnerships;
      }
    } catch (_) {}

    if (!items.length) {
      try {
        const stored = localStorage.getItem("uaf_school_partnerships");
        items = stored ? JSON.parse(stored) : [
          {
            id: "sp_1",
            schoolName: "St. Mary Community Public School",
            location: "Montserrado",
            county: "Montserrado",
            community: "West Point",
            repName: "Principal Joseph Harmon",
            partnershipDate: "2025-09-01",
            telephone: "0770112233"
          },
          {
            id: "sp_2",
            schoolName: "Duport Road Alliance Academy",
            location: "Montserrado",
            county: "Montserrado",
            community: "Duport Road",
            repName: "Rev. Matthew Kpoto",
            partnershipDate: "2025-10-15",
            telephone: "0886445566"
          }
        ];
      } catch (_) {}
    }

    const delList = getDeletedPartnerships();
    items = items.filter(p => !isPartnershipDeleted(p, delList));
    cachedPartnerships = items;
    try {
      localStorage.setItem("uaf_school_partnerships", JSON.stringify(cachedPartnerships));
    } catch (_) {}

    const elCount = document.getElementById("count-partnerships-total");
    if (elCount) elCount.textContent = cachedPartnerships.length;

    renderPartnershipsTable(session);
  }

  function renderPartnershipsTable(session) {
    const container = document.getElementById("partnerships-table-container");
    if (!container) return;

    if (!cachedPartnerships.length) {
      container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No school partnerships on file. Click <strong>"+ Add School Partnership"</strong> to register a partner school.</p>';
      return;
    }

    const rows = cachedPartnerships.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.schoolName)}</strong></td>
        <td>${escapeHtml(p.location || p.county)} · <span style="font-size:11.5px;color:var(--ink-500);">${escapeHtml(p.community || "—")}</span></td>
        <td>${escapeHtml(p.repName || "—")}</td>
        <td>${formatDate(p.partnershipDate)}</td>
        <td><a href="tel:${escapeHtml(p.telephone)}" style="color:var(--blue-700);text-decoration:none;">${escapeHtml(p.telephone)}</a></td>
        <td>
          <button class="btn btn--outline" style="padding:4px 8px;font-size:11px;color:var(--red-700);" data-delete-partner="${p.id || p.schoolName}">Delete</button>
        </td>
      </tr>
    `).join("");

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>School Name</th>
            <th>Location / County</th>
            <th>Representative Name</th>
            <th>Date of Partnership</th>
            <th>Telephone</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    container.querySelectorAll("button[data-delete-partner]").forEach(b => {
      b.addEventListener("click", () => handleDeletePartnership(b.dataset.deletePartner, session));
    });
  }

  async function handleSavePartnership(e, session) {
    e.preventDefault();
    const schoolName = document.getElementById("partner-school-name").value.trim();
    const county = document.getElementById("partner-county").value;
    const community = document.getElementById("partner-community").value.trim();
    const repName = document.getElementById("partner-rep-name").value.trim();
    const date = document.getElementById("partner-date").value;
    const tel = document.getElementById("partner-telephone").value.trim();

    const newPartner = {
      id: "sp_" + Date.now(),
      schoolName: schoolName,
      location: county,
      county: county,
      community: community,
      repName: repName,
      partnershipDate: date,
      telephone: tel,
      createdAt: new Date().toISOString()
    };

    cachedPartnerships.unshift(newPartner);
    try {
      localStorage.setItem("uaf_school_partnerships", JSON.stringify(cachedPartnerships));
    } catch (_) {}

    // Background backend call
    try {
      callApi("createSchoolPartnership", Object.assign({ token: session.token }, newPartner)).catch(() => {});
    } catch (_) {}

    document.getElementById("partnership-modal").classList.add("is-hidden");
    flash(`School partnership "${schoolName}" saved successfully.`, "success");
    loadPartnerships(session);
    loadStats(session);
    window.dispatchEvent(new Event("uaf_data_updated"));
  }

  function handleDeletePartnership(id, session) {
    const p = cachedPartnerships.find(x => (x.id || x.schoolName) === id);
    if (!confirm(`Are you sure you want to permanently delete "${p ? p.schoolName : id}"?`)) return;

    addDeletedPartnership(id, p?.schoolName);
    cachedPartnerships = cachedPartnerships.filter(x => (x.id || x.schoolName) !== id);
    try {
      localStorage.setItem("uaf_school_partnerships", JSON.stringify(cachedPartnerships));
    } catch (_) {}

    // Background backend call
    try {
      callApi("deleteSchoolPartnership", { token: session.token, id: id, schoolName: p?.schoolName }).catch(() => {});
    } catch (_) {}

    flash("School partnership removed.", "success");
    loadPartnerships(session);
    loadStats(session);
    window.dispatchEvent(new Event("uaf_data_updated"));
  }

  /* ---------------------------------------------------------
     3. EMPOWERMENT DATA LOGIC
  --------------------------------------------------------- */
  async function loadEmpowerment(session) {
    const container = document.getElementById("empowerment-table-container");
    if (!container) return;

    let items = [];
    try {
      if (API_URL) {
        const res = await callApi("listEmpowermentData", { token: session.token });
        if (res && res.ok && Array.isArray(res.trainees)) items = res.trainees;
      }
    } catch (_) {}

    if (!items.length) {
      try {
        const stored = localStorage.getItem("uaf_empowerment_records");
        items = stored ? JSON.parse(stored) : [
          {
            id: "emp_1",
            name: "Mother Comfort Toe",
            gender: "Female",
            county: "Montserrado",
            community: "Duport Road",
            skill: "Soap Making",
            connectedChild: "Blessing K.",
            contact: "0770223344"
          },
          {
            id: "emp_2",
            name: "Ma Musu Koroma",
            gender: "Female",
            county: "Montserrado",
            community: "West Point",
            skill: "Tie-Dye / Batik",
            connectedChild: "Emmanuel Flomo",
            contact: "0886112233"
          }
        ];
      } catch (_) {}
    }

    const delList = getDeletedEmpowerment();
    items = items.filter(e => !isEmpowermentDeleted(e, delList));
    cachedEmpowerment = items;
    try {
      localStorage.setItem("uaf_empowerment_records", JSON.stringify(cachedEmpowerment));
    } catch (_) {}

    const elCount = document.getElementById("count-empowerment-total");
    if (elCount) elCount.textContent = cachedEmpowerment.length;

    renderEmpowermentTable(session);
  }

  function renderEmpowermentTable(session) {
    const container = document.getElementById("empowerment-table-container");
    if (!container) return;

    if (!cachedEmpowerment.length) {
      container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No empowerment records on file. Click <strong>"+ Add Empowerment Trainee"</strong> to log vocational training data.</p>';
      return;
    }

    const rows = cachedEmpowerment.map(e => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            ${e.photoData ? `
              <img src="${e.photoData}" alt="${escapeHtml(e.name)}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #cbd5e1;flex-shrink:0;" />
            ` : `
              <div style="width:34px;height:34px;border-radius:50%;background:#fef3c7;color:#b45309;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">
                ${escapeHtml((e.name || "E").charAt(0).toUpperCase())}
              </div>
            `}
            <div>
              <strong>${escapeHtml(e.name)}</strong>
              <div style="font-size:11px;color:var(--ink-500);">${escapeHtml(e.gender || "—")}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(e.county)} · <span style="font-size:11.5px;color:var(--ink-500);">${escapeHtml(e.community)}</span></td>
        <td><span class="admin-badge admin-badge--neutral" style="font-size:11px;font-weight:600;">${escapeHtml(e.skill)}</span></td>
        <td>${e.connectedChild ? `<span style="color:var(--blue-700);font-weight:600;">${escapeHtml(e.connectedChild)}</span>` : '<span style="color:var(--ink-400);">None</span>'}</td>
        <td><a href="tel:${escapeHtml(e.contact)}" style="color:var(--blue-700);text-decoration:none;">${escapeHtml(e.contact)}</a></td>
        <td>
          <button class="btn btn--outline" style="padding:4px 8px;font-size:11px;color:var(--red-700);" data-delete-empower="${e.id || e.name}">Delete</button>
        </td>
      </tr>
    `).join("");

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Trainee / Caregiver</th>
            <th>Location / Community</th>
            <th>Skill Trained</th>
            <th>Connected Child</th>
            <th>Contact</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    container.querySelectorAll("button[data-delete-empower]").forEach(b => {
      b.addEventListener("click", () => handleDeleteEmpowerment(b.dataset.deleteEmpower, session));
    });
  }

  function populateConnectedChildrenDropdown() {
    const select = document.getElementById("empower-child-select");
    if (!select) return;
    select.innerHTML = '<option value="">-- None / General Household --</option>';

    cachedSubmissions.forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub.childName;
      opt.textContent = `${sub.childName} (${sub.residenceCounty || sub.county} · ${sub.community})`;
      select.appendChild(opt);
    });
  }

  async function handleSaveEmpowerment(e, session) {
    e.preventDefault();
    const name = document.getElementById("empower-name").value.trim();
    const gender = document.getElementById("empower-gender").value;
    const county = document.getElementById("empower-county").value;
    const community = document.getElementById("empower-community").value.trim();
    const skill = document.getElementById("empower-skill").value;
    const connectedChild = document.getElementById("empower-child-select").value.trim();
    const contact = document.getElementById("empower-contact").value.trim();
    const photoInput = document.getElementById("empower-photo");

    let photoData = "";
    if (photoInput && photoInput.files && photoInput.files[0]) {
      try {
        photoData = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(photoInput.files[0]);
        });
      } catch (_) {}
    }

    const newEmpower = {
      id: "emp_" + Date.now(),
      name,
      gender,
      county,
      community,
      skill,
      connectedChild,
      contact,
      photoData,
      createdAt: new Date().toISOString()
    };

    cachedEmpowerment.unshift(newEmpower);
    try {
      localStorage.setItem("uaf_empowerment_records", JSON.stringify(cachedEmpowerment));
    } catch (_) {}

    // Background backend call
    try {
      callApi("createEmpowermentData", Object.assign({ token: session.token }, newEmpower)).catch(() => {});
    } catch (_) {}

    document.getElementById("empowerment-modal").classList.add("is-hidden");
    flash(`Empowerment record for "${name}" saved successfully.`, "success");
    loadEmpowerment(session);
    loadStats(session);
    window.dispatchEvent(new Event("uaf_data_updated"));
  }

  function handleDeleteEmpowerment(id, session) {
    const e = cachedEmpowerment.find(x => (x.id || x.name) === id);
    if (!confirm(`Are you sure you want to permanently delete "${e ? e.name : id}"?`)) return;

    addDeletedEmpowerment(id, e?.name);
    cachedEmpowerment = cachedEmpowerment.filter(x => (x.id || x.name) !== id);
    try {
      localStorage.setItem("uaf_empowerment_records", JSON.stringify(cachedEmpowerment));
    } catch (_) {}

    // Background backend call
    try {
      callApi("deleteEmpowermentData", { token: session.token, id: id, name: e?.name }).catch(() => {});
    } catch (_) {}

    flash("Empowerment trainee record removed.", "success");
    loadEmpowerment(session);
    loadStats(session);
    window.dispatchEvent(new Event("uaf_data_updated"));
  }

  /* ---------------------------------------------------------
     4. COMMUNITY STATS DIRECTORY & MANUAL TARGET SETTING
  --------------------------------------------------------- */
  async function loadStats(session) {
    const container = document.getElementById("stats-table-container");
    if (!container) return;

    // Load active child reports
    const localReports = JSON.parse(localStorage.getItem("uaf_ossc_reports") || "[]");
    const delSubs = getDeletedSubmissions();
    const activeChildren = localReports.filter((r) => !isSubmissionDeleted(r, delSubs) && String(r.status).toUpperCase() !== "REJECTED");

    // Load enrollments
    const enrollments = JSON.parse(localStorage.getItem("uaf_child_enrollments") || "[]");

    // Load partnerships
    const partnerships = JSON.parse(localStorage.getItem("uaf_school_partnerships") || "[]");
    const delPartners = getDeletedPartnerships();
    const activePartners = partnerships.filter((p) => !isPartnershipDeleted(p, delPartners));

    // Load empowerment
    const empowerment = JSON.parse(localStorage.getItem("uaf_empowerment_records") || "[]");
    const delEmp = getDeletedEmpowerment();
    const activeEmp = empowerment.filter((e) => !isEmpowermentDeleted(e, delEmp));

    // Load verified donations
    let verifiedDonations = [];
    try {
      const stored = localStorage.getItem("uaf_admin_donations");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          verifiedDonations = parsed.filter((d) => String(d.status || "").toUpperCase() === "VERIFIED");
        }
      }
    } catch (_) {}

    // Load admin communities (manual targets)
    let adminComms = [];
    try {
      const stored = localStorage.getItem("uaf_admin_communities");
      if (stored) adminComms = JSON.parse(stored);
    } catch (_) {}

    const delStats = getDeletedStats();
    adminComms = adminComms.filter((s) => !isStatDeleted(s, delStats));

    // Build unique list of communities from adminComms + activeChildren + partnerships + empowerment
    const commMap = new Map();

    adminComms.forEach((s) => {
      const key = `${(s.county || "").toLowerCase().trim()}|${(s.community || "").toLowerCase().trim()}`;
      commMap.set(key, { ...s });
    });

    activeChildren.forEach((c) => {
      const co = (c.residenceCounty || c.county || "").trim();
      const cm = (c.community || "").trim();
      if (co && cm && !isStatDeleted({ county: co, community: cm }, delStats)) {
        const key = `${co.toLowerCase()}|${cm.toLowerCase()}`;
        if (!commMap.has(key)) {
          commMap.set(key, {
            rowNumber: Date.now() + Math.random(),
            county: co,
            community: cm,
            year: "2026",
            status: "VERIFIED",
            amountNeeded: 0,
            amountGenerated: 0
          });
        }
      }
    });

    // Compute strictly accurate figures:
    const calculatedStats = Array.from(commMap.values()).map((comm) => {
      const coKey = (comm.county || "").toLowerCase().trim();
      const cmKey = (comm.community || "").toLowerCase().trim();

      // Count out-of-school children identified living in this community & county
      const outCount = activeChildren.filter((r) => {
        const rCo = (r.residenceCounty || r.county || "").toLowerCase().trim();
        const rCm = (r.community || "").toLowerCase().trim();
        return rCo === coKey && (rCm === cmKey || !cmKey);
      }).length;

      // Count enrolled children living in this community & county
      const enrCount = activeChildren.filter((r) => {
        const rCo = (r.residenceCounty || r.county || "").toLowerCase().trim();
        const rCm = (r.community || "").toLowerCase().trim();
        const isEnr = r.enrolled === true || String(r.status).toUpperCase() === "ENROLLED" || enrollments.some((en) => String(en.childName || "").toLowerCase().trim() === String(r.childName || "").toLowerCase().trim());
        return rCo === coKey && (rCm === cmKey || !cmKey) && isEnr;
      }).length;

      // Count parents empowered
      const parentsCount = activeEmp.filter((e) => {
        const eCo = (e.county || "").toLowerCase().trim();
        const eCm = (e.community || "").toLowerCase().trim();
        return eCo === coKey && (eCm === cmKey || !cmKey);
      }).length;

      // Count school partners
      const schoolCount = activePartners.filter((p) => {
        const pCo = (p.location || p.county || "").toLowerCase().trim();
        const pCm = (p.community || "").toLowerCase().trim();
        return pCo === coKey && (pCm === cmKey || !cmKey);
      }).length;

      // Amount to Raise (Target): Admin sets manually
      const targetNeeded = Number(comm.amountNeeded || comm.amountNeededUSD) || 0;

      // Amount Raised (Donations): sum of verified donations for this community/county
      let donGenerated = 0;
      verifiedDonations.forEach((d) => {
        const dText = `${d.campaign || ""} ${d.notes || ""} ${d.message || ""}`.toLowerCase();
        if (dText.includes(cmKey) || (dText.includes(coKey) && !cmKey)) {
          donGenerated += Number(d.amount) || 0;
        }
      });
      const generated = Math.max(donGenerated, Number(comm.amountGenerated || comm.amountGeneratedUSD) || 0);

      // Balance to Raise = Amount Needed - Amount Raised
      const balanceToRaise = Math.max(0, targetNeeded - generated);

      return {
        ...comm,
        outOfSchoolIdentified: outCount,
        supportedReenrolled: enrCount,
        yetToEnroll: Math.max(0, outCount - enrCount),
        parentsEmpowered: parentsCount,
        schoolPartners: schoolCount,
        amountNeeded: targetNeeded,
        amountGenerated: generated,
        balanceToRaise: balanceToRaise
      };
    });

    cachedStats = calculatedStats;
    try {
      localStorage.setItem("uaf_admin_communities", JSON.stringify(cachedStats));
    } catch (_) {}

    const elCount = document.getElementById("count-stats-total");
    if (elCount) elCount.textContent = cachedStats.length;

    renderStatsTable(session);
  }

  function renderStatsTable(session) {
    const container = document.getElementById("stats-table-container");
    if (!container) return;

    if (!cachedStats.length) {
      container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No community statistics on file yet. Click <strong>"+ Set Community Target"</strong> to create an entry.</p>';
      return;
    }

    const rows = cachedStats.map((s) => `
      <tr>
        <td><strong>${escapeHtml(s.county)}</strong><br/><span style="font-size:11.5px;color:var(--ink-600);">${escapeHtml(s.community)}</span></td>
        <td><strong>${Number(s.outOfSchoolIdentified || 0).toLocaleString()}</strong></td>
        <td><span style="color:var(--green-700);font-weight:700;">${Number(s.supportedReenrolled || 0).toLocaleString()}</span></td>
        <td><span style="color:var(--amber-700);font-weight:700;">${Number(s.yetToEnroll || 0).toLocaleString()}</span></td>
        <td>${Number(s.parentsEmpowered || 0).toLocaleString()}</td>
        <td>${Number(s.schoolPartners || 0).toLocaleString()}</td>
        <td>$${Number(s.amountNeeded || 0).toLocaleString()}</td>
        <td>$${Number(s.amountGenerated || 0).toLocaleString()}</td>
        <td><strong style="color:var(--blue-700);">$${Number(s.balanceToRaise || 0).toLocaleString()}</strong></td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn--outline" style="padding:4px 8px;font-size:11px;" data-edit-target="${s.rowNumber}">Set Target</button>
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
            <th>Out of School</th>
            <th>Re-enrolled</th>
            <th>Yet to Enroll</th>
            <th>Empowerment</th>
            <th>Schools</th>
            <th>Target to Raise ($)</th>
            <th>Raised ($)</th>
            <th>Balance to Raise ($)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    container.querySelectorAll("button[data-edit-target]").forEach((btn) => {
      btn.addEventListener("click", () => openSetTargetModal(Number(btn.dataset.editTarget)));
    });
    container.querySelectorAll("button[data-delete-stat]").forEach((btn) => {
      btn.addEventListener("click", () => handleDeleteStat(Number(btn.dataset.deleteStat), session));
    });
  }

  function openSetTargetModal(rowNumber) {
    const item = cachedStats.find((s) => Number(s.rowNumber) === rowNumber);
    if (!item) return;

    document.getElementById("stat-target-row").value = item.rowNumber;
    document.getElementById("stat-target-county").value = item.county;
    document.getElementById("stat-target-community").value = item.community;
    document.getElementById("stat-target-amount").value = item.amountNeeded || 0;
    document.getElementById("stat-target-notes").value = item.rateMethodologyNote || "";

    document.getElementById("stat-target-modal-title").textContent = `Funding Target: ${item.community} (${item.county})`;
    document.getElementById("stat-target-modal").classList.remove("is-hidden");
  }

  async function handleSaveTarget(e, session) {
    e.preventDefault();
    const rowVal = document.getElementById("stat-target-row").value;
    const rowNumber = rowVal ? Number(rowVal) : Date.now();
    const county = document.getElementById("stat-target-county").value;
    const community = document.getElementById("stat-target-community").value.trim();
    const targetAmount = Number(document.getElementById("stat-target-amount").value) || 0;
    const notes = document.getElementById("stat-target-notes").value.trim();

    const existingIdx = cachedStats.findIndex((s) => Number(s.rowNumber) === rowNumber || (s.county === county && s.community === community));
    if (existingIdx >= 0) {
      cachedStats[existingIdx].amountNeeded = targetAmount;
      cachedStats[existingIdx].rateMethodologyNote = notes;
      cachedStats[existingIdx].balanceToRaise = Math.max(0, targetAmount - (cachedStats[existingIdx].amountGenerated || 0));
    } else {
      cachedStats.unshift({
        rowNumber,
        county,
        community,
        year: "2026",
        status: "VERIFIED",
        outOfSchoolIdentified: 0,
        supportedReenrolled: 0,
        yetToEnroll: 0,
        parentsEmpowered: 0,
        schoolPartners: 0,
        amountNeeded: targetAmount,
        amountGenerated: 0,
        balanceToRaise: targetAmount,
        rateMethodologyNote: notes
      });
    }

    try {
      localStorage.setItem("uaf_admin_communities", JSON.stringify(cachedStats));
    } catch (_) {}

    // Background backend call
    try {
      callApi("updateCommunityStat", {
        token: session.token,
        rowNumber,
        county,
        community,
        amountNeededUSD: targetAmount,
        rateMethodologyNote: notes
      }).catch(() => {});
    } catch (_) {}

    document.getElementById("stat-target-modal").classList.add("is-hidden");
    flash(`Funding target for ${community} set to $${targetAmount.toLocaleString()}.`, "success");
    loadStats(session);
    window.dispatchEvent(new Event("uaf_data_updated"));
  }

  function handleDeleteStat(rowNumber, session) {
    const item = cachedStats.find((s) => Number(s.rowNumber) === rowNumber);
    const commName = item ? item.community : "this community";
    if (!confirm(`Are you sure you want to permanently delete statistics for ${commName}?`)) return;

    addDeletedStat(item || { rowNumber });
    cachedStats = cachedStats.filter((s) => Number(s.rowNumber) !== rowNumber && !isStatDeleted(s));

    try {
      localStorage.setItem("uaf_admin_communities", JSON.stringify(cachedStats));
    } catch (_) {}

    // Background backend call
    try {
      callApi("deleteCommunityStat", {
        token: session.token,
        rowNumber: rowNumber,
        county: item?.county,
        community: item?.community
      }).catch(() => {});
    } catch (_) {}

    flash("Community statistics removed.", "success");
    loadStats(session);
    window.dispatchEvent(new Event("uaf_data_updated"));
  }

  /* ---------------------------------------------------------
     BROCHURE CONTROLS & CSV EXPORT
  --------------------------------------------------------- */
  function updateBrochureStatusDisplay() {
    const customBrochure = localStorage.getItem("uaf_brochure_pdf");
    const metaStr = localStorage.getItem("uaf_brochure_meta");
    const badge = document.getElementById("brochure-status-badge");
    const meta = document.getElementById("brochure-meta-display");

    if (customBrochure && metaStr) {
      try {
        const parsed = JSON.parse(metaStr);
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

  function downloadCommunityCsv() {
    const locFilter = document.getElementById("export-comm-location")?.value || "ALL";
    let list = cachedStats.slice();

    if (locFilter !== "ALL") {
      list = list.filter((s) => (s.county || "").toLowerCase() === locFilter.toLowerCase());
    }

    if (!list.length) {
      flash("No community records available to download.");
      return;
    }

    const headers = [
      "County",
      "Community",
      "Out of School Identified",
      "Supported and Re-enrolled",
      "Yet to Enroll",
      "Parents Empowered",
      "School Partners",
      "Target to Raise (USD)",
      "Amount Raised (USD)",
      "Balance to Raise (USD)"
    ];

    const escapeCsv = (val) => {
      const s = String(val == null ? "" : val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = list.map((s) => [
      escapeCsv(s.county),
      escapeCsv(s.community),
      Number(s.outOfSchoolIdentified || 0),
      Number(s.supportedReenrolled || 0),
      Number(s.yetToEnroll || 0),
      Number(s.parentsEmpowered || 0),
      Number(s.schoolPartners || 0),
      Number(s.amountNeeded || 0),
      Number(s.amountGenerated || 0),
      Number(s.balanceToRaise || 0)
    ].join(","));

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `UAF_Community_Stats_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash("Community statistics CSV downloaded.", "success");
  }

  // Register with admin.js module router
  if (window.__uafRegisterAdminModule) {
    window.__uafRegisterAdminModule("community", renderCommunityModule);
  }
})();
