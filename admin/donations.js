/* =========================================================
   UAF IMPACT — ADMIN: DONATIONS & FUNDING MODULE (Phase 8)
   ---------------------------------------------------------
   Registers itself with admin.js's module registry and renders
   into #admin-module-panel when "Donations" is clicked.
   Reads window.__uafAdminSession to authenticate requests.

   Enforces Phase 8 requirements:
   - Verified total calculation
   - Pending donations queue
   - Action buttons for Verify / Reject with reviewer notes
   - CSV Export for Accountant / Admin
   - Role-based permissions mirror (server enforces authoritatively)
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  // Mirrors Config.gs ROLE_PERMISSIONS - All admin roles have view and export
  const ROLE_CAN = {
    VIEW_DONATIONS: ["ADMIN", "ADMINISTRATOR", "COORDINATOR", "SUPER_ADMIN", "ACCOUNTANT", "PROGRAM_MANAGER", "EXECUTIVE_STAFF"],
    VERIFY_DONATION: ["ADMIN", "ADMINISTRATOR", "COORDINATOR", "SUPER_ADMIN", "ACCOUNTANT", "EXECUTIVE_STAFF"],
    EXPORT_DONATIONS: ["ADMIN", "ADMINISTRATOR", "COORDINATOR", "SUPER_ADMIN", "ACCOUNTANT", "PROGRAM_MANAGER", "EXECUTIVE_STAFF"]
  };

  function can(permission, role) {
    const sp = window.__uafAdminSession && window.__uafAdminSession.permissions;
    if (sp && sp.length) return sp.includes("*") || sp.includes(permission === "EXPORT_DONATIONS" ? "VIEW_DONATIONS" : permission);
    if (!role) return true;
    const r = String(role).toUpperCase().trim().replace(/[\s-]+/g, "_");
    if (r === "SUPER_ADMIN" || r === "ADMIN" || r === "SUPERADMIN") return true;
    return (ROLE_CAN[permission] || []).some((p) => p.toUpperCase().replace(/[\s-]+/g, "_") === r);
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

  function formatCurrency(num) {
    const val = Number(num) || 0;
    return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // Persistent Donation Deletion Tombstones
  function getDeletedDonations() {
    try {
      return JSON.parse(localStorage.getItem("uaf_deleted_donations") || "[]");
    } catch (_) {
      return [];
    }
  }

  function addDeletedDonation(txId) {
    if (!txId) return;
    const list = getDeletedDonations();
    const idStr = String(txId).trim();
    if (!list.includes(idStr)) {
      list.push(idStr);
      try {
        localStorage.setItem("uaf_deleted_donations", JSON.stringify(list));
      } catch (_) {}
    }
  }

  function isDonationDeleted(item, deletedList) {
    if (!item) return true;
    const list = deletedList || getDeletedDonations();
    const tx = String(item.transactionId || item.id || "").trim();
    const ref = String(item.reference || item.ref || "").trim();
    return list.some((id) => id === tx || (ref && id === ref));
  }

  const T = window.__uafTools;
  let donationPage = 0;
  let donationSig = "";
  let childOptions = null;
  let cachedDonations = [];
  let currentFilter = "ALL";
  let searchQuery = "";

  function renderDonationsModule(container, session) {
    if (!can("VIEW_DONATIONS", session.role)) {
      container.innerHTML = `
        <div class="admin-card">
          <h2>Access Restricted</h2>
          <p class="admin-muted">Your role (${escapeHtml(session.role)}) does not have permission to view donation records.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admin-module-header">
        <div>
          <h2>Donations &amp; Funding Management</h2>
          <p class="admin-muted" style="margin-top:4px;">Review incoming donations, verify transactions, and track campaign funding.</p>
        </div>
        <div style="display:flex;gap:8px;">
          ${can("VERIFY_DONATION", session.role) ? '<button id="donations-add-btn" class="btn btn--primary">+ Add Donation</button>' : ""}
          <button id="donations-refresh-btn" class="btn btn--outline">Refresh</button>
        </div>
      </div>

      <!-- Download / Export Filter Bar -->
      <div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;">
        <div style="flex:1;min-width:130px;">
          <label style="display:block;font-size:11.5px;font-weight:600;color:var(--ink-600);margin-bottom:4px;">Year</label>
          <select id="export-don-year" style="width:100%;padding:6px 10px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;">
            <option value="ALL">All Years</option>
            <option value="2023">2023</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
          </select>
        </div>
        <div style="flex:1;min-width:130px;">
          <label style="display:block;font-size:11.5px;font-weight:600;color:var(--ink-600);margin-bottom:4px;">Month</label>
          <select id="export-don-month" style="width:100%;padding:6px 10px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;">
            <option value="ALL">All Months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>
        <div style="flex:1;min-width:150px;">
          <label style="display:block;font-size:11.5px;font-weight:600;color:var(--ink-600);margin-bottom:4px;">Location</label>
          <select id="export-don-location" style="width:100%;padding:6px 10px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;">
            <option value="ALL">All Locations</option>
            <option value="Montserrado">Montserrado</option>
            <option value="Margibi">Margibi</option>
            <option value="Bong">Bong</option>
            <option value="Nimba">Nimba</option>
            <option value="Grand Bassa">Grand Bassa</option>
            <option value="Liberia">Liberia (General)</option>
          </select>
        </div>
        <div>
          <button id="donations-export-btn" class="btn btn--outline" style="font-size:12px;padding:6px 12px;display:flex;align-items:center;gap:6px;background:#f8fafc;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download CSV</span>
          </button>
          <button id="donations-pdf-btn" class="btn btn--outline" style="font-size:12px;padding:6px 12px;display:flex;align-items:center;gap:6px;background:#f8fafc;margin-left:6px;">
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      <div id="donations-flash"></div>

      <!-- Stat Cards -->
      <div class="admin-stats-grid">
        <div class="admin-stat-card">
          <div class="admin-stat-card__label">Verified Total</div>
          <div class="admin-stat-card__value" id="stat-verified-total">$0.00</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-card__label">Pending Review</div>
          <div class="admin-stat-card__value" id="stat-pending-count" style="color:var(--amber-600);">0</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-card__label">Pending Amount</div>
          <div class="admin-stat-card__value" id="stat-pending-amount" style="color:var(--amber-600);">$0.00</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-card__label">Total Transactions</div>
          <div class="admin-stat-card__value" id="stat-total-count">0</div>
        </div>
      </div>

      <!-- Controls: Filter & Search -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div class="admin-filter-bar" style="margin-bottom:0;">
          <button class="admin-filter-btn is-active" data-filter="ALL">All (<span id="count-all">0</span>)</button>
          <button class="admin-filter-btn" data-filter="PENDING">Pending (<span id="count-pending">0</span>)</button>
          <button class="admin-filter-btn" data-filter="VERIFIED">Verified (<span id="count-verified">0</span>)</button>
          <button class="admin-filter-btn" data-filter="REJECTED">Rejected (<span id="count-rejected">0</span>)</button>
        </div>
        <div style="min-width:240px;max-width:320px;flex:1;">
          <input type="text" id="donations-search" placeholder="Search by name, phone, ref ID…" style="padding:7px 12px;font-size:13px;width:100%;border:1px solid var(--border);border-radius:var(--radius-sm);" />
        </div>
      </div>

      <!-- Table Container -->
      <div class="admin-table-wrap">
        <div id="donations-table-container">
          <p class="admin-muted" style="padding:24px;text-align:center;">Loading donations…</p>
        </div>
      </div>

      <!-- Add Donation (direct verified support) -->
      <div id="manual-donation-modal" class="admin-modal-overlay is-hidden">
        <div class="admin-modal" style="max-width:540px;">
          <h3 style="margin:0;">Add Donation</h3>
          <p class="admin-muted" style="font-size:12px;margin:4px 0 12px;">Direct support received by UAF. It is recorded as <strong>already verified</strong>.</p>
          <form id="manual-donation-form">
            <div class="form-field">
              <label for="md-name">Support name (donor / organization) *</label>
              <input type="text" id="md-name" required maxlength="150" placeholder="e.g. Hope Foundation" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="md-type">Type of donation *</label>
                <select id="md-type" required>
                  <option value="Cash">Cash / Money</option>
                  <option value="Books">Books</option>
                  <option value="Uniform">Uniform</option>
                  <option value="School Supplies">School Supplies</option>
                  <option value="Food">Food</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Other Materials">Other Materials</option>
                </select>
              </div>
              <div class="form-field" id="md-qty-wrap" style="display:none;">
                <label for="md-qty">Quantity *</label>
                <input type="number" id="md-qty" min="1" step="1" placeholder="e.g. 50" />
              </div>
            </div>
            <div class="form-field">
              <label for="md-amount" id="md-amount-label">Amount (USD) *</label>
              <input type="number" id="md-amount" min="0" step="0.01" placeholder="e.g. 250" />
            </div>
            <div class="form-field">
              <label for="md-tied">Tied to *</label>
              <select id="md-tied" required>
                <option value="">General donation (not tied to a child)</option>
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="md-date">Date received</label>
                <input type="date" id="md-date" />
              </div>
              <div class="form-field">
                <label for="md-phone">Contact phone (optional)</label>
                <input type="text" id="md-phone" maxlength="40" />
              </div>
            </div>
            <div class="form-field">
              <label for="md-notes">Notes (optional)</label>
              <input type="text" id="md-notes" maxlength="300" />
            </div>
            <div id="md-error" class="admin-error is-hidden"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
              <button type="button" id="md-cancel" class="btn btn--outline">Cancel</button>
              <button type="submit" id="md-save" class="btn btn--primary">Save Verified Donation</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById("donations-refresh-btn").addEventListener("click", () => loadDonations(session));

    const exportBtn = document.getElementById("donations-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", exportCsv);
    }

    document.getElementById("donations-pdf-btn")?.addEventListener("click", exportPdfDonations);
    document.getElementById("donations-add-btn")?.addEventListener("click", () => openAddDonation(session));
    document.getElementById("md-cancel")?.addEventListener("click", () => document.getElementById("manual-donation-modal").classList.add("is-hidden"));
    document.getElementById("md-type")?.addEventListener("change", syncDonationType);
    document.getElementById("manual-donation-form")?.addEventListener("submit", (e) => handleSaveManualDonation(e, session));

    const filterBtns = container.querySelectorAll(".admin-filter-btn");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        currentFilter = btn.dataset.filter;
        renderFilteredTable(session);
      });
    });

    const searchInput = document.getElementById("donations-search");
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderFilteredTable(session);
    });

    loadDonations(session);
  }

  function flash(message, kind) {
    const el = document.getElementById("donations-flash");
    if (!el) return;
    el.innerHTML = `<div class="admin-error" style="${kind === "success" ? "background:var(--green-050);color:var(--green-700);" : ""}">${escapeHtml(message)}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ""; }, 5000);
  }

  async function loadDonations(session) {
    const tableContainer = document.getElementById("donations-table-container");
    if (!tableContainer) return;
    tableContainer.innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading donations…</p>';

    let items = [];
    try {
      const result = await callApi("listDonations", { token: session.token });
      if (result && result.ok) {
        items = result.donations || result.items || [];
      } else {
        const stored = localStorage.getItem("uaf_admin_donations");
        items = stored ? JSON.parse(stored) : [];
      }
    } catch (err) {
      const stored = localStorage.getItem("uaf_admin_donations");
      items = stored ? JSON.parse(stored) : [];
    }

    const deletedList = getDeletedDonations();
    items = items.filter((d) => !isDonationDeleted(d, deletedList));

    cachedDonations = items;
    try {
      localStorage.setItem("uaf_admin_donations", JSON.stringify(cachedDonations));
    } catch (_) {}
    updateStats(cachedDonations);
    renderFilteredTable(session);
  }

  function updateStats(items) {
    let verifiedTotal = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let verifiedCount = 0;
    let rejectedCount = 0;

    items.forEach((item) => {
      const amt = Number(item.amount) || 0;
      const st = String(item.status || "").toUpperCase();
      if (st === "VERIFIED") {
        verifiedTotal += amt;
        verifiedCount++;
      } else if (st === "PENDING") {
        pendingCount++;
        pendingAmount += amt;
      } else if (st === "REJECTED") {
        rejectedCount++;
      }
    });

    const statVerifiedTotal = document.getElementById("stat-verified-total");
    const statPendingCount = document.getElementById("stat-pending-count");
    const statPendingAmount = document.getElementById("stat-pending-amount");
    const statTotalCount = document.getElementById("stat-total-count");

    if (statVerifiedTotal) statVerifiedTotal.textContent = formatCurrency(verifiedTotal);
    if (statPendingCount) statPendingCount.textContent = pendingCount;
    if (statPendingAmount) statPendingAmount.textContent = formatCurrency(pendingAmount);
    if (statTotalCount) statTotalCount.textContent = items.length;

    const cAll = document.getElementById("count-all");
    const cPending = document.getElementById("count-pending");
    const cVerified = document.getElementById("count-verified");
    const cRejected = document.getElementById("count-rejected");

    if (cAll) cAll.textContent = items.length;
    if (cPending) cPending.textContent = pendingCount;
    if (cVerified) cVerified.textContent = verifiedCount;
    if (cRejected) cRejected.textContent = rejectedCount;
  }

  function renderFilteredTable(session) {
    const tableContainer = document.getElementById("donations-table-container");
    if (!tableContainer) return;

    let filtered = cachedDonations.slice();

    if (currentFilter !== "ALL") {
      filtered = filtered.filter((d) => String(d.status || "").toUpperCase() === currentFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter((d) => {
        const text = [
          d.transactionId,
          d.externalId,
          d.name,
          d.phone,
          d.senderNumber,
          d.email,
          d.mtnReference,
          d.paymentMethod,
          d.donationType,
          d.tiedTo,
          d.notes
        ].filter(Boolean).join(" ").toLowerCase();
        return text.indexOf(searchQuery) !== -1;
      });
    }

    if (filtered.length === 0) {
      tableContainer.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No matching donations found.</p>';
      return;
    }

    filtered = T.newestFirst(filtered, ["createdAt"]);
    const _sig = currentFilter + "|" + searchQuery;
    if (_sig !== donationSig) { donationPage = 0; donationSig = _sig; }
    const _pg = T.paginate(filtered, donationPage, 10);
    donationPage = _pg.page;
    filtered = _pg.slice;

    const rowsHtml = filtered.map((item) => {
      const st = String(item.status || "PENDING").toUpperCase();
      let badgeClass = "admin-badge--pending";
      if (st === "VERIFIED") badgeClass = "admin-badge--verified";
      if (st === "REJECTED") badgeClass = "admin-badge--rejected";

      const donorDisplay = item.anonymous ? `${escapeHtml(item.name || "Anonymous")} <span style="font-size:10.5px;color:var(--ink-400);">(Anon)</span>` : escapeHtml(item.name || "Anonymous");
      const contactInfo = [item.phone, item.email].filter(Boolean).map(escapeHtml).join("<br/>") || "—";
      const methodDisplay = formatMethod(item.paymentMethod, item.senderNumber || item.mtnReference);

      let actionHtml = "";
      if (st === "PENDING" && can("VERIFY_DONATION", session.role)) {
        actionHtml = `
          <div style="display:flex;gap:6px;">
            <button class="btn--verify" data-action="verify" data-id="${escapeHtml(item.transactionId)}">Verify</button>
            <button class="btn--reject" data-action="reject" data-id="${escapeHtml(item.transactionId)}">Reject</button>
          </div>
        `;
      } else if (st === "VERIFIED") {
        actionHtml = `<span class="admin-muted" style="font-size:11px;">By ${escapeHtml(item.verifiedBy || "Admin")}<br/>${formatDate(item.verifiedAt)}</span>`;
      } else if (st === "REJECTED") {
        actionHtml = `<span class="admin-muted" style="font-size:11px;color:var(--red-600);">${escapeHtml(item.notes || "Rejected")}</span>`;
      } else {
        actionHtml = `<span class="admin-muted">—</span>`;
      }

      actionHtml += `
        <div style="margin-top:4px;">
          <button class="btn btn--outline" style="font-size:11px;padding:2px 7px;color:var(--red-700);" data-action="delete" data-id="${escapeHtml(item.transactionId)}">Delete</button>
        </div>
      `;

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${formatDate(item.createdAt)}</div>
            <div style="font-size:11px;color:var(--ink-400);">${escapeHtml(item.transactionId || "—")}</div>
          </td>
          <td>
            <div>${donorDisplay}</div>
            <div style="font-size:11.5px;color:var(--ink-500);">${contactInfo}</div>
          </td>
          <td>
            <strong style="color:var(--ink-900);font-size:14px;">${formatCurrency(item.amount)}</strong>
            <div style="font-size:10.5px;color:var(--ink-400);">${escapeHtml(item.currency || "USD")}</div>
          </td>
          <td>
            <div>${methodDisplay}</div>
            ${donationExtra(item)}
          </td>
          <td>
            <span class="admin-badge ${badgeClass}">${escapeHtml(st)}</span>
          </td>
          <td>
            ${actionHtml}
          </td>
        </tr>
      `;
    }).join("");

    tableContainer.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Date / ID</th>
            <th>Donor / Contact</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    T.attachPager(tableContainer, _pg, (pp) => { donationPage = pp; renderFilteredTable(session); });

    // Attach verify / reject / delete listeners
    tableContainer.querySelectorAll("button[data-action='verify']").forEach((btn) => {
      btn.addEventListener("click", () => handleVerify(btn.dataset.id, session));
    });

    tableContainer.querySelectorAll("button[data-action='reject']").forEach((btn) => {
      btn.addEventListener("click", () => handleReject(btn.dataset.id, session));
    });

    tableContainer.querySelectorAll("button[data-action='delete']").forEach((btn) => {
      btn.addEventListener("click", () => handleDeleteDonation(btn.dataset.id, session));
    });
  }

  function handleDeleteDonation(txId, session) {
    if (!confirm("Are you sure you want to permanently delete this donation record? This action cannot be undone.")) return;
    addDeletedDonation(txId);
    const deletedList = getDeletedDonations();
    cachedDonations = cachedDonations.filter((d) => !isDonationDeleted(d, deletedList) && String(d.transactionId).trim() !== String(txId).trim());
    try {
      localStorage.setItem("uaf_admin_donations", JSON.stringify(cachedDonations));
    } catch (_) {}

    // Background server deletion if API connected
    try {
      callApi("deleteDonation", { token: session?.token, transactionId: txId, id: txId }).catch(() => {});
    } catch (_) {}

    flash("Donation record permanently deleted.", "success");
    updateStats(cachedDonations);
    renderFilteredTable(session);
  }

  function formatMethod(method, ref) {
    let name = method || "Unknown";
    if (method === "MTN_MOMO" || method === "manual_momo") name = "MTN MoMo";
    else if (method === "ORANGE_MONEY") name = "Orange Money";
    else if (method === "BANK_TRANSFER") name = "Bank Transfer";
    else if (method === "CASH") name = "Cash";

    if (ref) {
      return `${escapeHtml(name)}<br/><span style="font-size:11px;font-weight:600;color:var(--blue-700);">Sender: ${escapeHtml(ref)}</span>`;
    }
    return escapeHtml(name);
  }

  async function handleVerify(transactionId, session) {
    const don = cachedDonations.find((d) => d.transactionId === transactionId);
    const donorName = don ? (don.name || "Donor") : "this donation";
    const amountStr = don ? formatCurrency(don.amount) : "";

    const confirmed = window.confirm(`Are you sure you want to verify donation ${transactionId} (${amountStr}) from ${donorName}? This will count towards official verified public funding metrics.`);
    if (!confirmed) return;

    try {
      const result = await callApi("verifyDonation", {
        token: session.token,
        transactionId: transactionId
      });

      if (result.ok) {
        flash(result.message || `Donation ${transactionId} verified successfully.`, "success");
        loadDonations(session);
      } else {
        flash(result.error || "Failed to verify donation.");
      }
    } catch (err) {
      flash("Network error while verifying donation.");
    }
  }

  async function handleReject(transactionId, session) {
    const don = cachedDonations.find((d) => d.transactionId === transactionId);
    const donorName = don ? (don.name || "Donor") : "this donation";

    const reason = window.prompt(`Please enter the reason for rejecting donation ${transactionId} from ${donorName}:`, "Payment unverified / discrepancy");
    if (reason === null) return; // Cancelled

    try {
      const result = await callApi("rejectDonation", {
        token: session.token,
        transactionId: transactionId,
        notes: reason.trim()
      });

      if (result.ok) {
        flash(result.message || `Donation ${transactionId} rejected.`, "success");
        loadDonations(session);
      } else {
        flash(result.error || "Failed to reject donation.");
      }
    } catch (err) {
      flash("Network error while rejecting donation.");
    }
  }

  function donationExtra(item) {
    const bits = [];
    if (item.donationType && item.donationType !== "Cash") {
      bits.push(`${escapeHtml(item.donationType)}${item.quantity ? " × " + escapeHtml(item.quantity) : ""}`);
    }
    if (item.tiedTo) bits.push("For: " + escapeHtml(item.tiedTo));
    if (item.source === "ADMIN_DIRECT") bits.push("Direct entry");
    return bits.length ? `<div style="font-size:11px;color:var(--ink-500);">${bits.join(" · ")}</div>` : "";
  }

  /* ---------------- Add Donation (direct verified support) ---------------- */
  function syncDonationType() {
    const type = document.getElementById("md-type").value;
    const isCash = type === "Cash";
    document.getElementById("md-qty-wrap").style.display = isCash ? "none" : "";
    document.getElementById("md-qty").required = !isCash;
    document.getElementById("md-amount-label").textContent = isCash ? "Amount (USD) *" : "Estimated value (USD) — optional";
    document.getElementById("md-amount").required = isCash;
  }

  async function openAddDonation(session) {
    const form = document.getElementById("manual-donation-form");
    form.reset();
    document.getElementById("md-error").classList.add("is-hidden");
    document.getElementById("md-date").value = new Date().toISOString().slice(0, 10);
    syncDonationType();
    document.getElementById("manual-donation-modal").classList.remove("is-hidden");

    const select = document.getElementById("md-tied");
    if (childOptions === null) {
      select.innerHTML = '<option value="">Loading identified children…</option>';
      try {
        const res = await callApi("listDonationChildren", { token: session.token });
        childOptions = res && res.ok && Array.isArray(res.children) ? res.children : [];
      } catch (_) { childOptions = []; }
    }
    select.innerHTML = '<option value="">General donation (not tied to a child)</option>' +
      childOptions.map((c, i) => `<option value="${i}">${escapeHtml(c.name)} — ${escapeHtml([c.community, c.county].filter(Boolean).join(", "))} (${escapeHtml(c.id)})</option>`).join("");
  }

  async function handleSaveManualDonation(e, session) {
    e.preventDefault();
    const err = document.getElementById("md-error");
    err.classList.add("is-hidden");
    const btn = document.getElementById("md-save");
    const tiedIdx = document.getElementById("md-tied").value;
    const child = tiedIdx !== "" && childOptions ? childOptions[Number(tiedIdx)] : null;

    const payload = {
      token: session.token,
      name: document.getElementById("md-name").value.trim(),
      donationType: document.getElementById("md-type").value,
      quantity: document.getElementById("md-qty").value,
      amount: document.getElementById("md-amount").value,
      phone: document.getElementById("md-phone").value.trim(),
      receivedDate: document.getElementById("md-date").value,
      notes: document.getElementById("md-notes").value.trim(),
      tiedChildId: child ? child.id : "",
      tiedChildName: child ? child.name : ""
    };

    btn.disabled = true;
    try {
      const res = await callApi("createManualDonation", payload);
      if (!res || !res.ok) {
        err.textContent = (res && res.error) || "Could not save the donation.";
        err.classList.remove("is-hidden");
        return;
      }
      document.getElementById("manual-donation-modal").classList.add("is-hidden");
      flash(`Donation ${res.transactionId || ""} recorded and verified.`, "success");
      window.dispatchEvent(new Event("uaf_data_updated"));
      loadDonations(session);
    } catch (ex) {
      err.textContent = "Couldn't reach the server.";
      err.classList.remove("is-hidden");
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------------- PDF download ---------------- */
  function getExportItems() {
    const yearFilter = document.getElementById("export-don-year")?.value || "ALL";
    const monthFilter = document.getElementById("export-don-month")?.value || "ALL";
    const locFilter = document.getElementById("export-don-location")?.value || "ALL";
    let items = cachedDonations.slice();
    if (yearFilter !== "ALL") {
      items = items.filter((d) => { const dt = new Date(d.createdAt); return isNaN(dt.getTime()) ? true : String(dt.getFullYear()) === yearFilter; });
    }
    if (monthFilter !== "ALL") {
      items = items.filter((d) => { const dt = new Date(d.createdAt); return isNaN(dt.getTime()) ? true : (dt.getMonth() + 1) === Number(monthFilter); });
    }
    if (locFilter !== "ALL") {
      items = items.filter((d) => `${d.address || ""} ${d.country || ""} ${d.notes || ""}`.toLowerCase().includes(locFilter.toLowerCase()));
    }
    return T.newestFirst(items, ["createdAt"]);
  }

  async function exportPdfDonations() {
    const items = getExportItems();
    if (!items.length) { flash("No donations match the selected year/month/location criteria."); return; }
    const btn = document.getElementById("donations-pdf-btn");
    const orig = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = "<span>Preparing…</span>"; }
    try {
      const verified = items.filter((d) => String(d.status).toUpperCase() === "VERIFIED").reduce((a, d) => a + (Number(d.amount) || 0), 0);
      const headers = ["Date", "Transaction ID", "Donor", "Type / Quantity", "Tied To", "Amount (USD)", "Method", "Status"];
      const rows = items.map((d) => [
        d.createdAt ? formatDate(d.createdAt) : "", d.transactionId || "", d.name || "Anonymous",
        d.donationType && d.donationType !== "Cash" ? d.donationType + (d.quantity ? " x " + d.quantity : "") : "Cash",
        d.tiedTo || "General", Number(d.amount || 0).toFixed(2), d.paymentMethod || "", String(d.status || "").toUpperCase()
      ]);
      await T.exportPdf("Donations & Funding Report", "Verified total: $" + verified.toFixed(2), "UAF-donations-" + T.today(), headers, rows, true);
      flash("Donations PDF downloaded.", "success");
    } catch (err) {
      console.warn("Donation PDF failed", err);
      flash("PDF download failed. Check your internet connection and try again.");
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
  }

  function exportCsv() {
    if (!cachedDonations.length) {
      flash("No donations to export.");
      return;
    }

    const yearFilter = document.getElementById("export-don-year")?.value || "ALL";
    const monthFilter = document.getElementById("export-don-month")?.value || "ALL";
    const locFilter = document.getElementById("export-don-location")?.value || "ALL";

    let items = cachedDonations.slice();

    if (yearFilter !== "ALL") {
      items = items.filter((d) => {
        if (!d.createdAt) return true;
        const dt = new Date(d.createdAt);
        return !isNaN(dt.getTime()) ? String(dt.getFullYear()) === yearFilter : true;
      });
    }

    if (monthFilter !== "ALL") {
      items = items.filter((d) => {
        if (!d.createdAt) return true;
        const dt = new Date(d.createdAt);
        return !isNaN(dt.getTime()) ? (dt.getMonth() + 1) === Number(monthFilter) : true;
      });
    }

    if (locFilter !== "ALL") {
      items = items.filter((d) => {
        const text = `${d.address || ""} ${d.country || ""} ${d.notes || ""}`.toLowerCase();
        if (locFilter === "Other") return true;
        return text.includes(locFilter.toLowerCase());
      });
    }

    if (!items.length) {
      flash("No donations match the selected year/month/location criteria.");
      return;
    }

    const headers = [
      "TransactionID",
      "ExternalID",
      "Date",
      "Name",
      "Phone",
      "Email",
      "Amount",
      "Currency",
      "PaymentMethod",
      "MTNReference",
      "Status",
      "Anonymous",
      "VerifiedBy",
      "VerifiedAt",
      "Notes"
    ];

    const csvRows = [headers.join(",")];

    items.forEach((d) => {
      const row = [
        d.transactionId || "",
        d.externalId || "",
        d.createdAt || "",
        d.name || "",
        d.phone || "",
        d.email || "",
        d.amount || 0,
        d.currency || "USD",
        d.paymentMethod || "",
        d.mtnReference || "",
        d.status || "",
        d.anonymous ? "YES" : "NO",
        d.verifiedBy || "",
        d.verifiedAt || "",
        (d.notes || "").replace(/"/g, '""')
      ];

      const escaped = row.map((val) => `"${String(val).replace(/"/g, '""')}"`);
      csvRows.push(escaped.join(","));
    });

    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uaf-donations-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("donations", renderDonationsModule);
})();
