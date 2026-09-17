/* =========================================================
   UAF IMPACT — ADMIN: AUDIT LOGS VIEWER
   ---------------------------------------------------------
   Tamper-evident system activity and security audit trail viewer.
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

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
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch (e) {
      return isoStr;
    }
  }

  let cachedLogs = [];
  let actionFilter = "ALL";
  let resultFilter = "ALL";
  let searchQuery = "";

  function renderAuditModule(container, session) {
    if (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "AUDITOR") {
      container.innerHTML = `
        <div class="admin-card">
          <h2>Access Restricted</h2>
          <p class="admin-muted">Security and compliance audit logs are restricted to Administrators and Auditors.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admin-module-header">
        <div>
          <h2>System Audit &amp; Activity Trail</h2>
          <p class="admin-muted" style="margin-top:4px;">Immutable, append-only log of all authentication, verification, and administrative actions.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="audit-export-btn" class="btn btn--outline">Export CSV</button>
          <button id="audit-refresh-btn" class="btn btn--primary">Refresh</button>
        </div>
      </div>

      <div id="audit-flash"></div>

      <!-- Controls & Filters -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <select id="filter-audit-result" style="padding:6px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);">
            <option value="ALL">All Results</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
            <option value="LOCKED">LOCKED</option>
          </select>
        </div>
        <div style="min-width:240px;max-width:320px;flex:1;">
          <input type="text" id="audit-search" placeholder="Search user, action, resource…" style="padding:7px 12px;font-size:13px;width:100%;border:1px solid var(--border);border-radius:var(--radius-sm);" />
        </div>
      </div>

      <!-- Table Wrap -->
      <div class="admin-table-wrap">
        <div id="audit-table-container">
          <p class="admin-muted" style="padding:24px;text-align:center;">Loading audit logs…</p>
        </div>
      </div>
    `;

    document.getElementById("audit-refresh-btn").addEventListener("click", () => loadLogs(session));
    document.getElementById("audit-export-btn").addEventListener("click", exportAuditCsv);

    document.getElementById("filter-audit-result").addEventListener("change", (e) => {
      resultFilter = e.target.value;
      renderLogsTable();
    });

    document.getElementById("audit-search").addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderLogsTable();
    });

    loadLogs(session);
  }

  function flash(message, kind) {
    const el = document.getElementById("audit-flash");
    if (!el) return;
    el.innerHTML = `<div class="admin-error" style="${kind === "success" ? "background:var(--green-050);color:var(--green-700);" : ""}">${escapeHtml(message)}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ""; }, 5000);
  }

  async function loadLogs(session) {
    const container = document.getElementById("audit-table-container");
    if (!container) return;
    container.innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading audit logs…</p>';

    try {
      const res = await callApi("listAuditLogs", { token: session.token });
      if (!res.ok) {
        container.innerHTML = `<div class="admin-error" style="margin:16px;">${escapeHtml(res.error || "Failed to load audit logs.")}</div>`;
        return;
      }

      cachedLogs = res.logs || [];
      renderLogsTable();
    } catch (err) {
      container.innerHTML = '<div class="admin-error" style="margin:16px;">Error connecting to server.</div>';
    }
  }

  function renderLogsTable() {
    const container = document.getElementById("audit-table-container");
    if (!container) return;

    let items = cachedLogs.slice();

    if (resultFilter !== "ALL") {
      items = items.filter((l) => String(l.result || "").toUpperCase() === resultFilter);
    }

    if (searchQuery) {
      items = items.filter((l) => {
        const text = [
          l.userId,
          l.role,
          l.action,
          l.resource,
          l.resourceId,
          l.result,
          l.notes
        ].filter(Boolean).join(" ").toLowerCase();
        return text.indexOf(searchQuery) !== -1;
      });
    }

    if (items.length === 0) {
      container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No audit records found matching criteria.</p>';
      return;
    }

    const rows = items.map((l) => {
      const res = String(l.result || "").toUpperCase();
      let badgeCls = "admin-badge--verified";
      if (res === "FAILURE") badgeCls = "admin-badge--rejected";
      else if (res === "LOCKED") badgeCls = "admin-badge--pending";

      return `
        <tr>
          <td style="font-size:12px;white-space:nowrap;">
            ${formatDate(l.timestamp)}
          </td>
          <td>
            <div style="font-weight:600;">${escapeHtml(l.userId || "PUBLIC")}</div>
            <div style="font-size:11px;color:var(--ink-500);">${escapeHtml(l.role || "ANONYMOUS")}</div>
          </td>
          <td>
            <code style="font-size:12px;background:var(--bg);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">${escapeHtml(l.action)}</code>
          </td>
          <td>
            <div>${escapeHtml(l.resource || "—")}</div>
            <div style="font-size:11px;color:var(--ink-400);">${escapeHtml(l.resourceId || "")}</div>
          </td>
          <td>
            <span class="admin-badge ${badgeCls}">${escapeHtml(res)}</span>
          </td>
          <td style="max-width:280px;white-space:normal;font-size:12px;color:var(--ink-700);">
            ${escapeHtml(l.notes || "—")}
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor / Role</th>
            <th>Action</th>
            <th>Target Resource</th>
            <th>Result</th>
            <th>Details / Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  function exportAuditCsv() {
    if (!cachedLogs.length) {
      flash("No logs to export.");
      return;
    }

    const headers = ["LogID", "Timestamp", "UserID", "Role", "Action", "Resource", "ResourceID", "Result", "Notes"];
    const csvRows = [headers.join(",")];

    cachedLogs.forEach((l) => {
      const row = [
        l.logId || "",
        l.timestamp || "",
        l.userId || "",
        l.role || "",
        l.action || "",
        l.resource || "",
        l.resourceId || "",
        l.result || "",
        (l.notes || "").replace(/"/g, '""')
      ];
      csvRows.push(row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","));
    });

    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uaf-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("audit", renderAuditModule);
})();
