/* =========================================================
   UAF CAMPAIGN DRIVE — ADMIN SUBMITTED DATA MODULE (v31)
   =========================================================
   Covers:
   - Data Requests (EvidenceRequests) & OSSC Submissions (OutOfSchoolSubmissions)
   - Search, status filtering (NEW, REVIEWED, CLOSED, ALL)
   - One-Click CSV Download with UTF-8 BOM
   - Single record receipt / review copy download
   - Status updates & reviewer notes (original fields are immutable)
   ========================================================= */

(() => {
  "use strict";

  let activeTab = "evidence"; // "evidence" | "ossc"
  let evidenceList = [];
  let osscList = [];

  function renderSubmissionsModule(container, session) {
    container.innerHTML = `
      <div class="admin-card">
        <div class="dash-welcome-row" style="margin-bottom:18px;">
          <div>
            <h2>Submitted Community &amp; Evidence Data</h2>
            <p class="admin-muted">Review incoming institutional data requests and community out-of-school child reports. Original records are read-only; update status and add reviewer notes.</p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="btn btn--outline" id="btn-download-submissions-csv">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download CSV (1-Click)</span>
            </button>
            <button type="button" class="btn btn--primary" id="btn-refresh-submissions">
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        <!-- Sub-tabs Switcher -->
        <div style="display:flex;gap:8px;border-bottom:1px solid #e2e8f0;margin-bottom:16px;">
          <button type="button" class="admin-tab-btn is-active" id="tab-btn-evidence" style="padding:10px 18px;border:none;background:none;font-weight:700;cursor:pointer;border-bottom:3px solid #007a99;color:#007a99;">
            Data Requests (EvidenceRequests) <span class="badge" id="badge-ev-count" style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:6px;">0</span>
          </button>
          <button type="button" class="admin-tab-btn" id="tab-btn-ossc" style="padding:10px 18px;border:none;background:none;font-weight:600;cursor:pointer;border-bottom:3px solid transparent;color:#64748b;">
            OSSC Reports (OutOfSchoolSubmissions) <span class="badge" id="badge-ossc-count" style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:6px;">0</span>
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="admin-filter-bar">
          <input type="text" id="submissions-search-input" class="admin-search-input" placeholder="Search by name, organization, community, ID, or keywords..." />
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <label style="font-size:12px;font-weight:700;color:var(--ink-600);">Status:</label>
            <select id="submissions-status-filter" class="input-select" style="min-width:130px;">
              <option value="ALL">All Statuses</option>
              <option value="NEW" selected>New Submissions</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="CLOSED">Closed</option>
            </select>

            <div id="ossc-county-filter-wrap" style="display:none;align-items:center;gap:6px;">
              <label style="font-size:12px;font-weight:700;color:var(--ink-600);">County:</label>
              <select id="submissions-county-filter" class="input-select" style="min-width:140px;">
                <option value="ALL">All Counties</option>
                <option value="Montserrado">Montserrado</option>
                <option value="Nimba">Nimba</option>
                <option value="Bong">Bong</option>
                <option value="Grand Bassa">Grand Bassa</option>
                <option value="Margibi">Margibi</option>
                <option value="Lofa">Lofa</option>
                <option value="Other">Other Counties</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Tables View Container -->
        <div id="submissions-table-container" style="margin-top:14px;">
          <!-- Injected dynamically -->
        </div>
      </div>
    `;

    bindTabEvents();
    loadSubmissionsData();
  }

  function bindTabEvents() {
    const tabEvidence = document.getElementById("tab-btn-evidence");
    const tabOssc = document.getElementById("tab-btn-ossc");
    const countyWrap = document.getElementById("ossc-county-filter-wrap");

    tabEvidence?.addEventListener("click", () => {
      activeTab = "evidence";
      tabEvidence.classList.add("is-active");
      tabEvidence.style.borderBottomColor = "#007a99";
      tabEvidence.style.color = "#007a99";
      tabEvidence.style.fontWeight = "700";

      tabOssc.classList.remove("is-active");
      tabOssc.style.borderBottomColor = "transparent";
      tabOssc.style.color = "#64748b";
      tabOssc.style.fontWeight = "600";

      if (countyWrap) countyWrap.style.display = "none";
      renderActiveTable();
    });

    tabOssc?.addEventListener("click", () => {
      activeTab = "ossc";
      tabOssc.classList.add("is-active");
      tabOssc.style.borderBottomColor = "#007a99";
      tabOssc.style.color = "#007a99";
      tabOssc.style.fontWeight = "700";

      tabEvidence.classList.remove("is-active");
      tabEvidence.style.borderBottomColor = "transparent";
      tabEvidence.style.color = "#64748b";
      tabEvidence.style.fontWeight = "600";

      if (countyWrap) countyWrap.style.display = "flex";
      renderActiveTable();
    });

    document.getElementById("submissions-search-input")?.addEventListener("input", renderActiveTable);
    document.getElementById("submissions-status-filter")?.addEventListener("change", renderActiveTable);
    document.getElementById("submissions-county-filter")?.addEventListener("change", renderActiveTable);
    document.getElementById("btn-refresh-submissions")?.addEventListener("click", loadSubmissionsData);
    document.getElementById("btn-download-submissions-csv")?.addEventListener("click", downloadCurrentTabCsv);
  }

  async function loadSubmissionsData() {
    const session = window.__uafAdminSession;
    if (!session || !session.token) return;

    const container = document.getElementById("submissions-table-container");
    if (container) {
      container.innerHTML = `
        <div style="text-align:center;padding:30px;color:var(--ink-400);">
          <div class="spinner" style="margin:0 auto 10px auto;"></div>
          <p>Loading submitted data records...</p>
        </div>
      `;
    }

    try {
      const [evRes, osscRes] = await Promise.all([
        window.__uafAdminCallApi("listEvidenceRequests", { token: session.token, status: "ALL" }),
        window.__uafAdminCallApi("listOutOfSchoolSubmissions", { token: session.token, status: "ALL" })
      ]);

      if (evRes.ok && Array.isArray(evRes.requests)) {
        evidenceList = evRes.requests;
        const newCount = evidenceList.filter((r) => String(r.status).toUpperCase() === "NEW").length;
        const b = document.getElementById("badge-ev-count");
        if (b) b.textContent = newCount;
      }

      if (osscRes.ok && Array.isArray(osscRes.submissions)) {
        osscList = osscRes.submissions;
        const newCount = osscList.filter((r) => String(r.status).toUpperCase() === "NEW").length;
        const b = document.getElementById("badge-ossc-count");
        if (b) b.textContent = newCount;
      }

      renderActiveTable();
    } catch (err) {
      if (container) {
        container.innerHTML = `<div style="text-align:center;padding:24px;color:#dc2626;">Notice: Could not load submitted records. Check connection and retry.</div>`;
      }
    }
  }

  function getFilteredEvidence() {
    const q = (document.getElementById("submissions-search-input")?.value || "").toLowerCase().trim();
    const st = (document.getElementById("submissions-status-filter")?.value || "ALL").toUpperCase();

    return evidenceList.filter((r) => {
      const matchesSearch = !q ||
        (r.requestId && r.requestId.toLowerCase().includes(q)) ||
        (r.requesterName && r.requesterName.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.organization && r.organization.toLowerCase().includes(q)) ||
        (r.requestDetails && r.requestDetails.toLowerCase().includes(q));

      const matchesStatus = st === "ALL" || String(r.status).toUpperCase() === st;
      return matchesSearch && matchesStatus;
    });
  }

  function getFilteredOssc() {
    const q = (document.getElementById("submissions-search-input")?.value || "").toLowerCase().trim();
    const st = (document.getElementById("submissions-status-filter")?.value || "ALL").toUpperCase();
    const county = (document.getElementById("submissions-county-filter")?.value || "ALL").toLowerCase();

    return osscList.filter((r) => {
      const matchesSearch = !q ||
        (r.submissionId && r.submissionId.toLowerCase().includes(q)) ||
        (r.reporterName && r.reporterName.toLowerCase().includes(q)) ||
        (r.reporterPhone && r.reporterPhone.toLowerCase().includes(q)) ||
        (r.community && r.community.toLowerCase().includes(q)) ||
        (r.county && r.county.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q));

      const matchesStatus = st === "ALL" || String(r.status).toUpperCase() === st;
      const matchesCounty = county === "all" || (r.county && r.county.toLowerCase().includes(county));

      return matchesSearch && matchesStatus && matchesCounty;
    });
  }

  function renderActiveTable() {
    const container = document.getElementById("submissions-table-container");
    if (!container) return;

    if (activeTab === "evidence") {
      renderEvidenceTable(container);
    } else {
      renderOsscTable(container);
    }
  }

  function renderEvidenceTable(container) {
    const records = getFilteredEvidence();
    if (records.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:36px;color:var(--ink-400);border:1px dashed #cbd5e1;border-radius:12px;">
          <p style="margin:0;font-weight:600;">No evidence requests match your filter.</p>
          <small>Change filters or submit a new inquiry from the public portal.</small>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-scroll-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Requester &amp; Org</th>
              <th>Request Details</th>
              <th>Date</th>
              <th>Status</th>
              <th>Reviewer Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((r) => `
              <tr>
                <td><strong>${window.__uafEscapeHtml(r.requestId)}</strong></td>
                <td>
                  <strong>${window.__uafEscapeHtml(r.requesterName)}</strong><br />
                  <span style="font-size:12px;color:var(--ink-500);">${window.__uafEscapeHtml(r.email)}</span><br />
                  <span style="font-size:11px;color:#0284c7;font-weight:600;">${window.__uafEscapeHtml(r.organization)}</span>
                </td>
                <td style="max-width:240px;">
                  <div style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.4;">
                    ${window.__uafEscapeHtml(r.requestDetails)}
                  </div>
                </td>
                <td style="white-space:nowrap;font-size:12px;color:var(--ink-500);">
                  ${r.createdAt ? r.createdAt.slice(0, 10) : "—"}
                </td>
                <td>
                  <span class="status-badge status-badge--${String(r.status).toLowerCase()}">${window.__uafEscapeHtml(r.status)}</span>
                </td>
                <td style="max-width:180px;font-size:12px;color:var(--ink-600);">
                  ${r.reviewerNotes ? window.__uafEscapeHtml(r.reviewerNotes) : '<span style="color:#94a3b8;font-style:italic;">None</span>'}
                </td>
                <td style="white-space:nowrap;">
                  <button type="button" class="btn btn--outline btn-sm btn-review-evidence" data-id="${window.__uafEscapeHtml(r.requestId)}" style="margin-right:4px;">
                    Review
                  </button>
                  <button type="button" class="btn btn--outline btn-sm btn-receipt-evidence" data-id="${window.__uafEscapeHtml(r.requestId)}" title="Download record copy">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll(".btn-review-evidence").forEach((btn) => {
      btn.addEventListener("click", () => openEvidenceModal(btn.dataset.id));
    });

    container.querySelectorAll(".btn-receipt-evidence").forEach((btn) => {
      btn.addEventListener("click", () => downloadSingleEvidenceRecord(btn.dataset.id));
    });
  }

  function renderOsscTable(container) {
    const records = getFilteredOssc();
    if (records.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:36px;color:var(--ink-400);border:1px dashed #cbd5e1;border-radius:12px;">
          <p style="margin:0;font-weight:600;">No out-of-school submissions match your filter.</p>
          <small>Change search filters or submit a community report from the public portal.</small>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-scroll-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Submission ID</th>
              <th>Reporter Info</th>
              <th>Location</th>
              <th>Children</th>
              <th>Report Notes</th>
              <th>Status</th>
              <th>Reviewer Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((r) => `
              <tr>
                <td><strong>${window.__uafEscapeHtml(r.submissionId)}</strong></td>
                <td>
                  <strong>${window.__uafEscapeHtml(r.reporterName)}</strong><br />
                  <span style="font-size:12px;color:var(--ink-500);">${window.__uafEscapeHtml(r.reporterPhone)}</span>
                </td>
                <td>
                  <strong>${window.__uafEscapeHtml(r.community)}</strong><br />
                  <span style="font-size:12px;color:#0284c7;font-weight:600;">${window.__uafEscapeHtml(r.county)} County</span>
                </td>
                <td style="text-align:center;">
                  <span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#fef3c7;color:#92400e;font-weight:700;font-size:12px;">
                    ${Number(r.childCount) || 1}
                  </span>
                </td>
                <td style="max-width:200px;">
                  <div style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.4;">
                    ${window.__uafEscapeHtml(r.notes || "No detailed notes provided.")}
                  </div>
                </td>
                <td>
                  <span class="status-badge status-badge--${String(r.status).toLowerCase()}">${window.__uafEscapeHtml(r.status)}</span>
                </td>
                <td style="max-width:180px;font-size:12px;color:var(--ink-600);">
                  ${r.reviewerNotes ? window.__uafEscapeHtml(r.reviewerNotes) : '<span style="color:#94a3b8;font-style:italic;">None</span>'}
                </td>
                <td style="white-space:nowrap;">
                  <button type="button" class="btn btn--outline btn-sm btn-review-ossc" data-id="${window.__uafEscapeHtml(r.submissionId)}" style="margin-right:4px;">
                    Review
                  </button>
                  <button type="button" class="btn btn--outline btn-sm btn-receipt-ossc" data-id="${window.__uafEscapeHtml(r.submissionId)}" title="Download record copy">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll(".btn-review-ossc").forEach((btn) => {
      btn.addEventListener("click", () => openOsscModal(btn.dataset.id));
    });

    container.querySelectorAll(".btn-receipt-ossc").forEach((btn) => {
      btn.addEventListener("click", () => downloadSingleOsscRecord(btn.dataset.id));
    });
  }

  /* ---------------------------------------------------------
     MODALS — EVIDENCE REQUEST REVIEW
  --------------------------------------------------------- */
  function openEvidenceModal(requestId) {
    const item = evidenceList.find((r) => r.requestId === requestId || r.id === requestId);
    if (!item) return;

    let modal = document.getElementById("submission-detail-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "submission-detail-modal";
      modal.className = "admin-modal-overlay";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="admin-modal" style="max-width:620px;">
        <div class="dash-welcome-row" style="margin-bottom:14px;">
          <div>
            <h3 style="margin:0;">Review Evidence Request</h3>
            <span style="font-size:12px;color:var(--ink-400);font-weight:600;">Reference: ${window.__uafEscapeHtml(item.requestId)}</span>
          </div>
          <button type="button" class="btn btn--outline btn-sm" id="btn-close-sub-modal">&times;</button>
        </div>

        <div style="background:#f8fafc;padding:14px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--ink-400);text-transform:uppercase;">Requester Name</label>
              <div style="font-size:13px;font-weight:700;color:var(--ink-800);">${window.__uafEscapeHtml(item.requesterName)}</div>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--ink-400);text-transform:uppercase;">Email Address</label>
              <div style="font-size:13px;color:#0284c7;font-weight:600;"><a href="mailto:${window.__uafEscapeHtml(item.email)}">${window.__uafEscapeHtml(item.email)}</a></div>
            </div>
          </div>

          <div style="margin-bottom:10px;">
            <label style="font-size:11px;font-weight:700;color:var(--ink-400);text-transform:uppercase;">Organization / Affiliation</label>
            <div style="font-size:13px;font-weight:600;color:var(--ink-800);">${window.__uafEscapeHtml(item.organization || "Independent")}</div>
          </div>

          <div>
            <label style="font-size:11px;font-weight:700;color:var(--ink-400);text-transform:uppercase;">Request Details &amp; Proposed Research Use</label>
            <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;line-height:1.5;color:var(--ink-800);max-height:140px;overflow-y:auto;white-space:pre-wrap;">${window.__uafEscapeHtml(item.requestDetails)}</div>
          </div>
        </div>

        <form id="evidence-status-form">
          <div class="form-group" style="margin-bottom:14px;">
            <label style="font-size:12px;font-weight:700;">Update Status:</label>
            <select id="evidence-modal-status" class="input-select" style="width:100%;">
              <option value="NEW" ${item.status === "NEW" ? "selected" : ""}>NEW — Awaiting Processing</option>
              <option value="REVIEWED" ${item.status === "REVIEWED" ? "selected" : ""}>REVIEWED — Approved / In Progress</option>
              <option value="CLOSED" ${item.status === "CLOSED" ? "selected" : ""}>CLOSED — Response Dispatched / Complete</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:18px;">
            <label style="font-size:12px;font-weight:700;">Reviewer Notes &amp; Audit Trail:</label>
            <textarea id="evidence-modal-notes" class="input-text" rows="3" placeholder="Enter administrative notes, follow-up actions, or reasons for closure...">${window.__uafEscapeHtml(item.reviewerNotes || "")}</textarea>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <button type="button" class="btn btn--outline" id="btn-modal-receipt-evidence">
              Download Record Copy
            </button>
            <div style="display:flex;gap:10px;">
              <button type="button" class="btn btn--outline" id="btn-cancel-evidence-modal">Cancel</button>
              <button type="submit" class="btn btn--primary" id="btn-save-evidence-status">Save Status &amp; Notes</button>
            </div>
          </div>
        </form>
      </div>
    `;

    document.getElementById("btn-close-sub-modal")?.addEventListener("click", closeSubModal);
    document.getElementById("btn-cancel-evidence-modal")?.addEventListener("click", closeSubModal);
    document.getElementById("btn-modal-receipt-evidence")?.addEventListener("click", () => downloadSingleEvidenceRecord(item.requestId));

    document.getElementById("evidence-status-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newStatus = document.getElementById("evidence-modal-status")?.value;
      const notes = document.getElementById("evidence-modal-notes")?.value.trim();
      const saveBtn = document.getElementById("btn-save-evidence-status");

      if (saveBtn) {
        saveBtn.setAttribute("disabled", "true");
        saveBtn.textContent = "Saving...";
      }

      try {
        const session = window.__uafAdminSession;
        const res = await window.__uafAdminCallApi("updateEvidenceRequestStatus", {
          token: session.token,
          requestId: item.requestId,
          status: newStatus,
          reviewerNotes: notes
        });

        if (res.ok) {
          alert(res.message || "Evidence request updated successfully.");
          closeSubModal();
          loadSubmissionsData();
        } else {
          alert(res.error || "Update failed.");
        }
      } catch (_) {
        alert("Connection notice: Could not update evidence request.");
      } finally {
        if (saveBtn) {
          saveBtn.removeAttribute("disabled");
          saveBtn.textContent = "Save Status & Notes";
        }
      }
    });

    modal.classList.remove("is-hidden");
    modal.style.display = "flex";
  }

  /* ---------------------------------------------------------
     MODALS — OSSC SUBMISSION REVIEW
  --------------------------------------------------------- */
  function openOsscModal(submissionId) {
    const item = osscList.find((r) => r.submissionId === submissionId || r.id === submissionId);
    if (!item) return;

    let modal = document.getElementById("submission-detail-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "submission-detail-modal";
      modal.className = "admin-modal-overlay";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="admin-modal" style="max-width:620px;">
        <div class="dash-welcome-row" style="margin-bottom:14px;">
          <div>
            <h3 style="margin:0;">Review Out-of-School Child Report</h3>
            <span style="font-size:12px;color:var(--ink-400);font-weight:600;">Reference: ${window.__uafEscapeHtml(item.submissionId)}</span>
          </div>
          <button type="button" class="btn btn--outline btn-sm" id="btn-close-sub-modal">&times;</button>
        </div>

        <div style="background:#f8fafc;padding:14px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--ink-400);text-transform:uppercase;">Community Reporter</label>
              <div style="font-size:13px;font-weight:700;color:var(--ink-800);">${window.__uafEscapeHtml(item.reporterName)}</div>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--ink-400);text-transform:uppercase;">Phone Number</label>
              <div style="font-size:13px;color:#0284c7;font-weight:600;"><a href="tel:${window.__uafEscapeHtml(item.reporterPhone)}">${window.__uafEscapeHtml(item.reporterPhone)}</a></div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--ink-400);text-transform:uppercase;">Community &amp; County</label>
              <div style="font-size:13px;font-weight:600;color:var(--ink-800);">${window.__uafEscapeHtml(item.community)}, ${window.__uafEscapeHtml(item.county)} County</div>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--ink-400);text-transform:uppercase;">Approx. Out-of-School Children</label>
              <div style="font-size:14px;font-weight:700;color:#b45309;">${Number(item.childCount) || 1} children reported</div>
            </div>
          </div>

          <div>
            <label style="font-size:11px;font-weight:700;color:var(--ink-400);text-transform:uppercase;">Community Case Details &amp; Location Notes</label>
            <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;line-height:1.5;color:var(--ink-800);max-height:130px;overflow-y:auto;white-space:pre-wrap;">${window.__uafEscapeHtml(item.notes || "No additional notes provided.")}</div>
          </div>
        </div>

        <form id="ossc-status-form">
          <div class="form-group" style="margin-bottom:14px;">
            <label style="font-size:12px;font-weight:700;">Update Status:</label>
            <select id="ossc-modal-status" class="input-select" style="width:100%;">
              <option value="NEW" ${item.status === "NEW" ? "selected" : ""}>NEW — Awaiting Field Verification</option>
              <option value="REVIEWED" ${item.status === "REVIEWED" ? "selected" : ""}>REVIEWED — Field Verified / Enrollment Team Contacted</option>
              <option value="CLOSED" ${item.status === "CLOSED" ? "selected" : ""}>CLOSED — Action Completed / Enrolled</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:18px;">
            <label style="font-size:12px;font-weight:700;">Reviewer Notes &amp; Verification Action:</label>
            <textarea id="ossc-modal-notes" class="input-text" rows="3" placeholder="Enter verification notes, school placement details, or reviewer findings...">${window.__uafEscapeHtml(item.reviewerNotes || "")}</textarea>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <button type="button" class="btn btn--outline" id="btn-modal-receipt-ossc">
              Download Record Copy
            </button>
            <div style="display:flex;gap:10px;">
              <button type="button" class="btn btn--outline" id="btn-cancel-ossc-modal">Cancel</button>
              <button type="submit" class="btn btn--primary" id="btn-save-ossc-status">Save Status &amp; Notes</button>
            </div>
          </div>
        </form>
      </div>
    `;

    document.getElementById("btn-close-sub-modal")?.addEventListener("click", closeSubModal);
    document.getElementById("btn-cancel-ossc-modal")?.addEventListener("click", closeSubModal);
    document.getElementById("btn-modal-receipt-ossc")?.addEventListener("click", () => downloadSingleOsscRecord(item.submissionId));

    document.getElementById("ossc-status-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newStatus = document.getElementById("ossc-modal-status")?.value;
      const notes = document.getElementById("ossc-modal-notes")?.value.trim();
      const saveBtn = document.getElementById("btn-save-ossc-status");

      if (saveBtn) {
        saveBtn.setAttribute("disabled", "true");
        saveBtn.textContent = "Saving...";
      }

      try {
        const session = window.__uafAdminSession;
        const res = await window.__uafAdminCallApi("updateOutOfSchoolStatus", {
          token: session.token,
          submissionId: item.submissionId,
          status: newStatus,
          reviewerNotes: notes
        });

        if (res.ok) {
          alert(res.message || "OSSC report updated successfully.");
          closeSubModal();
          loadSubmissionsData();
        } else {
          alert(res.error || "Update failed.");
        }
      } catch (_) {
        alert("Connection notice: Could not update OSSC report.");
      } finally {
        if (saveBtn) {
          saveBtn.removeAttribute("disabled");
          saveBtn.textContent = "Save Status & Notes";
        }
      }
    });

    modal.classList.remove("is-hidden");
    modal.style.display = "flex";
  }

  function closeSubModal() {
    const modal = document.getElementById("submission-detail-modal");
    if (modal) {
      modal.classList.add("is-hidden");
      modal.style.display = "none";
    }
  }

  /* ---------------------------------------------------------
     ONE-CLICK CSV EXPORTS (UTF-8 BOM) & RECORD RECEIPTS
  --------------------------------------------------------- */
  function downloadCurrentTabCsv() {
    const today = new Date().toISOString().slice(0, 10);
    if (activeTab === "evidence") {
      const records = getFilteredEvidence();
      window.__uafDownloadCsv(
        `UAF_Evidence_Requests_${today}.csv`,
        ["requestId", "requesterName", "email", "organization", "requestDetails", "status", "reviewerNotes", "createdAt", "closedAt"],
        records
      );
    } else {
      const records = getFilteredOssc();
      window.__uafDownloadCsv(
        `UAF_OSSC_Submissions_${today}.csv`,
        ["submissionId", "reporterName", "reporterPhone", "county", "community", "childCount", "notes", "status", "reviewedBy", "reviewedAt", "reviewerNotes", "timestamp"],
        records
      );
    }
  }

  function downloadSingleEvidenceRecord(requestId) {
    const item = evidenceList.find((r) => r.requestId === requestId || r.id === requestId);
    if (!item) return;

    window.__uafDownloadRecordReceipt(
      `Evidence_Request_${item.requestId}.txt`,
      "Evidence Data Request Record Copy",
      {
        "Request ID": item.requestId,
        "Requester Name": item.requesterName,
        "Requester Email": item.email,
        "Organization": item.organization,
        "Request Details": item.requestDetails,
        "Review Status": item.status,
        "Reviewer Notes": item.reviewerNotes,
        "Created At": item.createdAt,
        "Closed At": item.closedAt
      }
    );
  }

  function downloadSingleOsscRecord(submissionId) {
    const item = osscList.find((r) => r.submissionId === submissionId || r.id === submissionId);
    if (!item) return;

    window.__uafDownloadRecordReceipt(
      `OSSC_Report_${item.submissionId}.txt`,
      "Out-of-School Children Report Record Copy",
      {
        "Submission ID": item.submissionId,
        "Reporter Name": item.reporterName,
        "Reporter Phone": item.reporterPhone,
        "County": item.county,
        "Community": item.community,
        "Approx Child Count": item.childCount,
        "Case Notes": item.notes,
        "Consent Given": item.consentGiven,
        "Review Status": item.status,
        "Reviewed By": item.reviewedBy,
        "Reviewed At": item.reviewedAt,
        "Reviewer Notes": item.reviewerNotes,
        "Submitted At": item.timestamp
      }
    );
  }

  // Register with Admin Module Switcher
  window.__uafRegisterAdminModule("submissions", renderSubmissionsModule);
})();
