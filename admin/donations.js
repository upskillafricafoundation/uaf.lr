/* =========================================================
   UAF CAMPAIGN DRIVE — ADMIN DONATIONS REVIEW (v31)
   =========================================================
   Covers:
   - Filterable donations review table (Status, Story, Search)
   - Detail view & receipt copy modal
   - Actions: Verify / Approve and Reject (with reason)
   - One-Click CSV Download & individual receipt exporter
   ========================================================= */

(() => {
  "use strict";

  let donationsList = [];

  function renderDonationsModule(container, session) {
    container.innerHTML = `
      <div class="admin-card">
        <div class="dash-welcome-row" style="margin-bottom:18px;">
          <div>
            <h2>Donations Review &amp; Verification</h2>
            <p class="admin-muted">Review incoming mobile money transfers and bank donations. Approving immediately updates that story's progress.</p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="btn btn--outline" id="btn-download-donations-csv">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download CSV (1-Click)</span>
            </button>
            <button type="button" class="btn btn--primary" id="btn-refresh-donations">
              <span>Refresh List</span>
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="admin-filter-bar">
          <input type="text" id="donations-search-input" class="admin-search-input" placeholder="Search by donor name, phone, or Transaction ID..." />
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <label style="font-size:12px;font-weight:700;color:var(--ink-600);">Status:</label>
            <select id="donations-status-filter" class="input-select" style="min-width:130px;">
              <option value="ALL">All Statuses</option>
              <option value="PENDING" selected>Pending Review</option>
              <option value="VERIFIED">Verified / Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <!-- Donations Table -->
        <div class="table-scroll-wrap" style="margin-top:14px;">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Donor Details</th>
                <th>Amount</th>
                <th>Dedicated Story</th>
                <th>Payment Ref</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="donations-table-body">
              <tr><td colspan="7" style="text-align:center;padding:24px;color:var(--ink-400);">Loading donations...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Donation Detail / Review Modal -->
      <div class="story-modal-backdrop is-hidden" id="donation-detail-modal" style="display:none;">
        <div class="story-modal-card" style="max-width:540px;">
          <div class="story-modal-header">
            <h3 style="margin:0;font-size:17px;font-weight:800;">Review Donation Intent</h3>
            <button type="button" class="story-modal-close" id="btn-close-don-modal">&times;</button>
          </div>
          <div class="story-modal-body" id="don-modal-content">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
    `;

    loadDonationsData();

    document.getElementById("btn-refresh-donations")?.addEventListener("click", loadDonationsData);
    document.getElementById("donations-search-input")?.addEventListener("input", renderDonationsTable);
    document.getElementById("donations-status-filter")?.addEventListener("change", renderDonationsTable);
    document.getElementById("btn-close-don-modal")?.addEventListener("click", closeDonationModal);

    // Download CSV
    document.getElementById("btn-download-donations-csv")?.addEventListener("click", () => {
      const filtered = getFilteredDonations();
      window.__uafDownloadCsv(
        `UAF_Donations_${new Date().toISOString().slice(0, 10)}.csv`,
        ["transactionId", "storyId", "name", "phone", "email", "amount", "currency", "paymentReference", "verificationStatus", "message", "notes", "createdAt", "verifiedAt", "verifiedBy"],
        filtered
      );
    });
  }

  async function loadDonationsData() {
    const session = window.__uafAdminSession;
    if (!session || !session.token) return;

    try {
      const res = await window.__uafAdminCallApi("listDonations", { token: session.token, status: "ALL" });
      if (res.ok && Array.isArray(res.donations)) {
        donationsList = res.donations;
        renderDonationsTable();
      }
    } catch (err) {
      console.warn("Notice loading donations:", err);
    }
  }

  function getFilteredDonations() {
    const search = (document.getElementById("donations-search-input")?.value || "").toLowerCase().trim();
    const status = (document.getElementById("donations-status-filter")?.value || "ALL").toUpperCase();

    return donationsList.filter((d) => {
      const vStatus = String(d.verificationStatus || d.status || "PENDING").toUpperCase();
      if (status !== "ALL" && vStatus !== status) return false;
      if (search) {
        const text = `${d.transactionId} ${d.name} ${d.phone} ${d.email} ${d.storyId} ${d.paymentReference}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  }

  function renderDonationsTable() {
    const tbody = document.getElementById("donations-table-body");
    if (!tbody) return;

    const filtered = getFilteredDonations();
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--ink-400);">No donations matching filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((d) => {
      const vStatus = String(d.verificationStatus || d.status || "PENDING").toUpperCase();
      const statusClass = vStatus === "VERIFIED" ? "published" : (vStatus === "REJECTED" ? "closed" : "draft");

      return `
        <tr>
          <td>
            <strong>${window.__uafEscapeHtml(d.transactionId)}</strong>
            <div style="font-size:11px;color:var(--ink-400);">${window.__uafEscapeHtml(d.createdAt ? d.createdAt.slice(0, 10) : "")}</div>
          </td>
          <td>
            <strong>${window.__uafEscapeHtml(d.name || "Anonymous")}</strong>
            <div style="font-size:12px;color:var(--ink-500);">${window.__uafEscapeHtml(d.phone || "")}</div>
          </td>
          <td>
            <strong style="color:#0284c7;font-size:14.5px;">${d.currency === 'LRD' ? 'L$' : '$'}${Number(d.amount).toLocaleString()}</strong>
            <div style="font-size:11px;color:var(--ink-400);">${window.__uafEscapeHtml(d.currency)}</div>
          </td>
          <td>
            <span style="font-size:12.5px;font-weight:600;">${window.__uafEscapeHtml(d.storyId || "General Support")}</span>
          </td>
          <td>
            <code style="font-size:11.5px;background:var(--ink-100);padding:2px 6px;border-radius:4px;">${window.__uafEscapeHtml(d.paymentReference || "None")}</code>
          </td>
          <td>
            <span class="status-badge status-badge--${statusClass}">${vStatus}</span>
          </td>
          <td>
            <div style="display:flex;gap:6px;">
              <button type="button" class="btn btn--outline btn-sm btn-inspect-don" data-id="${d.transactionId}">Review</button>
              <button type="button" class="btn btn--outline btn-sm btn-receipt-don" data-id="${d.transactionId}" title="Download receipt">Receipt</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".btn-inspect-don").forEach((btn) => {
      btn.addEventListener("click", () => openDonationDetail(btn.dataset.id));
    });

    tbody.querySelectorAll(".btn-receipt-don").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = donationsList.find((x) => x.transactionId === btn.dataset.id);
        if (item) {
          window.__uafDownloadRecordReceipt(`Donation_Receipt_${item.transactionId}.txt`, `Donation #${item.transactionId}`, item);
        }
      });
    });
  }

  function openDonationDetail(transactionId) {
    const item = donationsList.find((x) => x.transactionId === transactionId);
    if (!item) return;

    const modal = document.getElementById("donation-detail-modal");
    const content = document.getElementById("don-modal-content");
    if (!modal || !content) return;

    const vStatus = String(item.verificationStatus || item.status || "PENDING").toUpperCase();

    content.innerHTML = `
      <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12px;font-weight:700;color:var(--ink-500);">REFERENCE ID</span>
          <span class="status-badge status-badge--${vStatus === 'VERIFIED' ? 'published' : (vStatus === 'REJECTED' ? 'closed' : 'draft')}">${vStatus}</span>
        </div>
        <div style="font-family:monospace;font-size:18px;font-weight:800;color:var(--navy-900);">${window.__uafEscapeHtml(item.transactionId)}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;font-size:13px;">
        <div>
          <span style="font-size:11px;color:var(--ink-500);display:block;">Donor Name</span>
          <strong>${window.__uafEscapeHtml(item.name || "Anonymous")}</strong>
        </div>
        <div>
          <span style="font-size:11px;color:var(--ink-500);display:block;">Phone Number</span>
          <strong>${window.__uafEscapeHtml(item.phone || "Not specified")}</strong>
        </div>
        <div>
          <span style="font-size:11px;color:var(--ink-500);display:block;">Donation Amount</span>
          <strong style="color:#0284c7;font-size:16px;">${item.currency === 'LRD' ? 'L$' : '$'}${Number(item.amount).toLocaleString()}</strong>
        </div>
        <div>
          <span style="font-size:11px;color:var(--ink-500);display:block;">Payment Reference</span>
          <strong>${window.__uafEscapeHtml(item.paymentReference || "None")}</strong>
        </div>
      </div>

      <div style="margin-bottom:14px;font-size:13px;">
        <span style="font-size:11px;color:var(--ink-500);display:block;">Dedicated Campaign / Story</span>
        <strong>${window.__uafEscapeHtml(item.storyId || "General Support")}</strong>
      </div>

      ${item.message ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12.5px;color:#78350f;">
          <strong>Donor Message:</strong> "${window.__uafEscapeHtml(item.message)}"
        </div>
      ` : ""}

      ${item.notes ? `
        <div style="font-size:12px;color:var(--ink-600);margin-bottom:14px;">
          <strong>Reviewer Notes / History:</strong> ${window.__uafEscapeHtml(item.notes)}
        </div>
      ` : ""}

      ${vStatus === "PENDING" ? `
        <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:16px;">
          <div class="form-field">
            <label for="review-notes-input">Verification / Rejection Notes (Optional)</label>
            <input type="text" id="review-notes-input" placeholder="e.g. Verified via MTN MoMo statement ref 92837..." />
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button type="button" class="btn btn--outline" id="btn-reject-action" style="color:#b91c1c;border-color:#fca5a5;">
              Reject Donation
            </button>
            <button type="button" class="btn btn--primary" id="btn-verify-action" style="background:#059669;">
              ✓ Verify &amp; Approve
            </button>
          </div>
        </div>
      ` : `
        <div style="border-top:1px solid var(--border);padding-top:12px;font-size:12px;color:var(--ink-500);text-align:right;">
          Verified by: <strong>${window.__uafEscapeHtml(item.verifiedBy || "Staff")}</strong> on ${window.__uafEscapeHtml(item.verifiedAt || item.createdAt || "")}
        </div>
      `}
    `;

    document.getElementById("btn-verify-action")?.addEventListener("click", () => verifyDonation(item.transactionId));
    document.getElementById("btn-reject-action")?.addEventListener("click", () => rejectDonation(item.transactionId));

    modal.classList.remove("is-hidden");
    modal.style.display = "flex";
  }

  function closeDonationModal() {
    const modal = document.getElementById("donation-detail-modal");
    if (modal) {
      modal.classList.add("is-hidden");
      modal.style.display = "none";
    }
  }

  async function verifyDonation(transactionId) {
    const session = window.__uafAdminSession;
    const btn = document.getElementById("btn-verify-action");
    if (btn) btn.setAttribute("disabled", "true");

    try {
      const res = await window.__uafAdminCallApi("verifyDonation", {
        token: session.token,
        transactionId: transactionId
      });
      if (res.ok) {
        alert(res.message || "Donation verified and story progress updated!");
        closeDonationModal();
        loadDonationsData();
      } else {
        alert(res.error || "Verification failed.");
      }
    } catch (_) {
      alert("Error verifying donation.");
    }
  }

  async function rejectDonation(transactionId) {
    const notesInput = document.getElementById("review-notes-input");
    const notes = notesInput ? notesInput.value.trim() : "";
    const session = window.__uafAdminSession;

    try {
      const res = await window.__uafAdminCallApi("rejectDonation", {
        token: session.token,
        transactionId: transactionId,
        notes: notes || "Rejected during administrative review"
      });
      if (res.ok) {
        alert(res.message || "Donation rejected.");
        closeDonationModal();
        loadDonationsData();
      } else {
        alert(res.error || "Rejection failed.");
      }
    } catch (_) {
      alert("Error rejecting donation.");
    }
  }

  window.__uafRegisterAdminModule("donations", renderDonationsModule);
})();
