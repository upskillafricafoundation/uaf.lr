/* =========================================================
   UAF IMPACT — ADMIN: DONATIONS MODULE (Phase 8)
   ---------------------------------------------------------
   Registers into the same module registry Phase 7's media.js
   uses (window.__uafRegisterAdminModule) — admin.js's
   activateModule() renders this into #admin-module-panel and
   nothing about the Phase 6 shell/session code changes.
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  async function callApi(action, payload, token) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      cache: "no-store",
      body: JSON.stringify(Object.assign({ action, token }, payload))
    });
    return res.json();
  }

  function fmtUSD(n) {
    return "$" + Number(n).toLocaleString("en-US");
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function escapeHtml_(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function renderDonationsModule(panel, session) {
    panel.innerHTML = `
      <div class="admin-card">
        <div class="admin-card__header">
          <h2>Donations</h2>
          <div class="admin-tabs" id="don-status-tabs">
            <button class="admin-tab is-active" data-status="PENDING">Pending</button>
            <button class="admin-tab" data-status="VERIFIED">Verified</button>
            <button class="admin-tab" data-status="REJECTED">Rejected</button>
            <button class="admin-tab" data-status="">All</button>
          </div>
        </div>
        <p class="admin-muted">Only donations UAF has verified against MTN records count toward any public funding total. Verifying is final — MTN's own transaction record is the source of truth; a screenshot alone is never sufficient.</p>
        <div id="don-list" class="admin-table-wrap"><p class="admin-muted">Loading…</p></div>
      </div>
    `;

    const listEl = panel.querySelector("#don-list");
    const tabs = panel.querySelectorAll(".admin-tab");
    let currentStatus = "PENDING";

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        currentStatus = tab.dataset.status;
        load();
      });
    });

    async function load() {
      listEl.innerHTML = '<p class="admin-muted">Loading…</p>';
      try {
        const result = await callApi("listDonations", { status: currentStatus }, session.token);
        if (!result.ok) {
          listEl.innerHTML = `<p class="admin-error">${escapeHtml_(result.error || "Couldn't load donations.")}</p>`;
          return;
        }
        renderTable(result.donations);
      } catch (err) {
        listEl.innerHTML = '<p class="admin-error">Couldn\'t reach the server.</p>';
      }
    }

    function renderTable(donations) {
      if (!donations.length) {
        listEl.innerHTML = '<p class="admin-muted">No donations in this view.</p>';
        return;
      }

      const rows = donations.map((d) => `
        <tr>
          <td>${escapeHtml_(d.transactionId)}</td>
          <td>${d.anonymous ? "Anonymous" : escapeHtml_(d.name)}</td>
          <td>${escapeHtml_(d.phone)}</td>
          <td>${fmtUSD(d.amount)}</td>
          <td>${escapeHtml_(d.paymentMethod)}</td>
          <td><span class="pill">${escapeHtml_(d.status)}</span></td>
          <td>${fmtDate(d.createdAt)}</td>
          <td>
            ${d.status === "PENDING" ? `
              <button class="btn btn--outline btn--small" data-verify="${escapeHtml_(d.transactionId)}">Verify</button>
              <button class="btn btn--outline btn--small" data-reject="${escapeHtml_(d.transactionId)}">Reject</button>
            ` : "—"}
          </td>
        </tr>
      `).join("");

      listEl.innerHTML = `
        <table class="data-table">
          <thead><tr>
            <th>Transaction</th><th>Donor</th><th>Phone</th><th>Amount</th>
            <th>Method</th><th>Status</th><th>Submitted</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      listEl.querySelectorAll("[data-verify]").forEach((btn) => {
        btn.addEventListener("click", () => actOn(btn.dataset.verify, "verifyDonation"));
      });
      listEl.querySelectorAll("[data-reject]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const reason = prompt("Reason for rejecting this donation (shown only to UAF staff):") || "";
          actOn(btn.dataset.reject, "rejectDonation", { reason });
        });
      });
    }

    async function actOn(transactionId, action, extra) {
      try {
        const result = await callApi(action, Object.assign({ transactionId }, extra || {}), session.token);
        if (!result.ok) {
          window.__uafShowToast?.(result.error || "Action failed.");
          return;
        }
        window.__uafShowToast?.(result.message || "Done.");
        load();
      } catch (err) {
        window.__uafShowToast?.("Couldn't reach the server.");
      }
    }

    load();
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("donations", renderDonationsModule);
})();
