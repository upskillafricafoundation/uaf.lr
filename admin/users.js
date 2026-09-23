/* =========================================================
   UAF IMPACT — ADMIN: USERS & ROLES MANAGEMENT
   ---------------------------------------------------------
   Administrative portal for staff account creation, role assignments,
   account activation/deactivation, and password resets.
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  const ROLES_LIST = [
    { key: "ADMIN", label: "Admin (Matches Super Admin - Full Access)" },
    { key: "SUPER_ADMIN", label: "Super Admin (Full System Access)" },
    { key: "EXECUTIVE_STAFF", label: "Executive Staff (Data, Donations, Stories)" },
    { key: "COORDINATOR", label: "Coordinator (Executive Staff)" },
    { key: "ADMINISTRATOR", label: "Administrator (Executive Staff)" },
    { key: "FINANCE", label: "Finance / Accountant (Executive Staff)" },
    { key: "VERIFIER", label: "Verifier (Executive Staff)" },
    { key: "PROGRAM_MANAGER", label: "Program Manager (Executive Staff)" },
    { key: "SUPPORTER_MANAGER", label: "Supporter Manager (Executive Staff)" },
    { key: "VIEWER", label: "Viewer (Executive Staff)" }
  ];

  function isSuperAdmin(role) {
    const r = String(role || "").toUpperCase().trim().replace(/[\s-]+/g, "_");
    return r === "SUPER_ADMIN" || r === "ADMIN" || r === "SUPERADMIN";
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
    if (!isoStr) return "Never";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return isoStr;
    }
  }

  let cachedUsers = [];

  function renderUsersModule(container, session) {
    if (!isSuperAdmin(session?.role)) {
      container.innerHTML = `
        <div class="admin-card">
          <h2>Access Restricted</h2>
          <p class="admin-muted">Staff account management is restricted to Super Admin / Admin.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admin-module-header">
        <div>
          <h2>Staff Users &amp; Role Assignments</h2>
          <p class="admin-muted" style="margin-top:4px;">Manage administrative staff access and role-based permissions across UAF programs.</p>
        </div>
        <div style="display:flex;gap:8px;">
          ${isSuperAdmin(session?.role) ? '<button id="add-user-btn" class="btn btn--primary">+ Add User</button>' : ''}
          <button id="users-refresh-btn" class="btn btn--outline">Refresh</button>
        </div>
      </div>

      <div id="users-flash"></div>

      <!-- Stat Cards -->
      <div class="admin-stats-grid">
        <div class="admin-stat-card">
          <div class="admin-stat-card__label">Total Staff Users</div>
          <div class="admin-stat-card__value" id="stat-total-users">0</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-card__label">Active Accounts</div>
          <div class="admin-stat-card__value" id="stat-active-users" style="color:var(--green-700);">0</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-card__label">Disabled Accounts</div>
          <div class="admin-stat-card__value" id="stat-disabled-users" style="color:var(--ink-500);">0</div>
        </div>
      </div>

      <!-- Table Wrap -->
      <div class="admin-table-wrap">
        <div id="users-table-container">
          <p class="admin-muted" style="padding:24px;text-align:center;">Loading users…</p>
        </div>
      </div>

      <!-- Add User Modal -->
      <div id="user-modal" class="admin-modal-overlay is-hidden">
        <div class="admin-modal">
          <h3>Create Staff Account</h3>
          <form id="user-form">
            <div class="form-field">
              <label for="new-user-name">Full Name</label>
              <input type="text" id="new-user-name" required placeholder="e.g. Sando Morris" />
            </div>
            <div class="form-field">
              <label for="new-user-email">Email Address</label>
              <input type="email" id="new-user-email" required placeholder="staff@upskillafricafoundation.org" />
            </div>
            <div class="form-field">
              <label for="new-user-role">Assigned Role</label>
              <select id="new-user-role" required>
                ${ROLES_LIST.map((r) => `<option value="${r.key}">${r.label}</option>`).join("")}
              </select>
            </div>
            <div class="form-field">
              <label for="new-user-password">Initial Password (optional, will auto-generate if empty)</label>
              <div style="display:flex;gap:6px;">
                <input type="text" id="new-user-password" placeholder="Leave blank to auto-generate" style="flex:1;" />
                <button type="button" id="btn-gen-pwd" class="btn btn--outline" style="font-size:11px;">Generate</button>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px;">
              <button type="button" id="user-modal-cancel" class="btn btn--outline">Cancel</button>
              <button type="submit" class="btn btn--primary">Create Account</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById("users-refresh-btn").addEventListener("click", () => loadUsers(session));

    const addBtn = document.getElementById("add-user-btn");
    const modal = document.getElementById("user-modal");
    if (addBtn && modal) {
      addBtn.addEventListener("click", () => {
        document.getElementById("user-form").reset();
        modal.classList.remove("is-hidden");
      });
      document.getElementById("user-modal-cancel").addEventListener("click", () => {
        modal.classList.add("is-hidden");
      });
      document.getElementById("btn-gen-pwd").addEventListener("click", () => {
        const rand = Math.random().toString(36).slice(-8);
        document.getElementById("new-user-password").value = "UAF-" + rand;
      });
      document.getElementById("user-form").addEventListener("submit", (e) => handleCreateUser(e, session));
    }

    loadUsers(session);
  }

  function flash(message, kind) {
    const el = document.getElementById("users-flash");
    if (!el) return;
    el.innerHTML = `<div class="admin-error" style="${kind === "success" ? "background:var(--green-050);color:var(--green-700);" : ""}">${escapeHtml(message)}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ""; }, 8000);
  }

  async function loadUsers(session) {
    const container = document.getElementById("users-table-container");
    if (!container) return;
    container.innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading users…</p>';

    try {
      const res = await callApi("listUsers", { token: session.token });
      if (!res.ok) {
        container.innerHTML = `<div class="admin-error" style="margin:16px;">${escapeHtml(res.error || "Failed to load staff list.")}</div>`;
        return;
      }

      cachedUsers = res.users || [];
      updateUserStats(cachedUsers);
      renderUsersTable(session);
    } catch (err) {
      container.innerHTML = '<div class="admin-error" style="margin:16px;">Error connecting to server.</div>';
    }
  }

  function updateUserStats(items) {
    let active = 0;
    let disabled = 0;

    items.forEach((u) => {
      if (String(u.status || "ACTIVE").toUpperCase() === "ACTIVE") active++;
      else disabled++;
    });

    const elTotal = document.getElementById("stat-total-users");
    const elActive = document.getElementById("stat-active-users");
    const elDisabled = document.getElementById("stat-disabled-users");

    if (elTotal) elTotal.textContent = items.length;
    if (elActive) elActive.textContent = active;
    if (elDisabled) elDisabled.textContent = disabled;
  }

  function renderUsersTable(session) {
    const container = document.getElementById("users-table-container");
    if (!container) return;

    if (cachedUsers.length === 0) {
      container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No user accounts found.</p>';
      return;
    }

    const rows = cachedUsers.map((u) => {
      const isActive = String(u.status || "ACTIVE").toUpperCase() === "ACTIVE";
      const isSelf = u.userId === session.userId;

      let actionsHtml = "";
      if (isSuperAdmin(session?.role)) {
        const targetIsAdmin = isSuperAdmin(u.role);
        // Only Super Admin should be able to disable other admin accounts
        const canToggle = !isSelf && (!targetIsAdmin || isSuperAdmin(session?.role));

        actionsHtml = `
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn--outline" style="padding:4px 8px;font-size:11.5px;" data-action="edit-role" data-id="${u.userId}" data-role="${u.role}">Role</button>
            <button class="btn btn--outline" style="padding:4px 8px;font-size:11.5px;" data-action="reset-pwd" data-id="${u.userId}">Reset Pwd</button>
            ${canToggle ? `<button class="btn btn--outline" style="padding:4px 8px;font-size:11.5px;color:${isActive ? "var(--red-600)" : "var(--green-700)"};" data-action="toggle-status" data-id="${u.userId}">${isActive ? "Disable" : "Enable"}</button>` : ""}
          </div>
        `;
      } else {
        actionsHtml = '<span class="admin-muted">—</span>';
      }

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${escapeHtml(u.name)}</div>
            <div style="font-size:11.5px;color:var(--ink-500);">${escapeHtml(u.email)}</div>
          </td>
          <td>
            <span class="admin-badge admin-badge--verified" style="background:var(--blue-050);color:var(--blue-900);border-color:var(--blue-200);">${escapeHtml(u.role)}</span>
            <span style="display:block;font-size:10.5px;color:var(--ink-500);margin-top:2px;">${isSuperAdmin(u.role) ? 'Matches Super Admin' : 'Matches Executive Staff'}</span>
          </td>
          <td>
            <span class="admin-badge ${isActive ? "admin-badge--verified" : "admin-badge--failed"}">${escapeHtml(u.status || "ACTIVE")}</span>
          </td>
          <td style="font-size:12px;color:var(--ink-500);">
            ${formatDate(u.lastLoginAt)}
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
            <th>User / Contact</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    // Event listeners
    container.querySelectorAll("button[data-action='edit-role']").forEach((b) => {
      b.addEventListener("click", () => handleEditRole(b.dataset.id, b.dataset.role, session));
    });
    container.querySelectorAll("button[data-action='toggle-status']").forEach((b) => {
      b.addEventListener("click", () => handleToggleStatus(b.dataset.id, session));
    });
    container.querySelectorAll("button[data-action='reset-pwd']").forEach((b) => {
      b.addEventListener("click", () => handleResetPwd(b.dataset.id, session));
    });
  }

  async function handleCreateUser(e, session) {
    e.preventDefault();
    const modal = document.getElementById("user-modal");
    const name = document.getElementById("new-user-name").value.trim();
    const email = document.getElementById("new-user-email").value.trim();
    const role = document.getElementById("new-user-role").value;
    const pwd = document.getElementById("new-user-password").value.trim();

    try {
      const res = await callApi("createUser", {
        token: session.token,
        name: name,
        email: email,
        role: role,
        password: pwd || undefined
      });

      if (res.ok) {
        modal.classList.add("is-hidden");
        flash(`Account created for ${name}. Temporary password: ${res.temporaryPassword} (Save this now)`, "success");
        loadUsers(session);
      } else {
        flash(res.error || "Failed to create user.");
      }
    } catch (err) {
      flash("Error connecting to server.");
    }
  }

  async function handleEditRole(userId, currentRole, session) {
    const newRole = window.prompt(`Enter new role for user (${ROLES_LIST.map((r) => r.key).join(", ")}):`, currentRole);
    if (!newRole || newRole.trim().toUpperCase() === currentRole) return;

    try {
      const res = await callApi("updateUserRole", {
        token: session.token,
        userId: userId,
        role: newRole.trim().toUpperCase()
      });

      if (res.ok) {
        flash(res.message || "Role updated.", "success");
        loadUsers(session);
      } else {
        flash(res.error || "Failed to update role.");
      }
    } catch (err) {
      flash("Connection error.");
    }
  }

  async function handleToggleStatus(userId, session) {
    if (!isSuperAdmin(session?.role)) {
      flash("Permission denied. Only Super Admin can disable or activate staff accounts.", "error");
      return;
    }
    const user = cachedUsers.find((u) => u.userId === userId);
    if (!user) return;

    if (user.userId === session?.userId) {
      flash("You cannot disable your own admin account.", "error");
      return;
    }

    const targetIsAdmin = isSuperAdmin(user.role);
    if (targetIsAdmin && !isSuperAdmin(session?.role)) {
      flash("Permission denied. Only Super Admin can disable other admin accounts.", "error");
      return;
    }

    const actionName = user.status === "ACTIVE" ? "disable" : "activate";
    const ok = window.confirm(`Are you sure you want to ${actionName} account for "${user.name}" (${user.role})?`);
    if (!ok) return;

    try {
      const res = await callApi("toggleUserStatus", {
        token: session.token,
        userId: userId
      });

      if (res.ok) {
        flash(res.message || "Account status updated.", "success");
        loadUsers(session);
      } else {
        flash(res.error || "Failed to change status.");
      }
    } catch (err) {
      flash("Connection error.");
    }
  }

  async function handleResetPwd(userId, session) {
    const ok = window.confirm("Reset password for this staff member? A new temporary password will be generated.");
    if (!ok) return;

    try {
      const res = await callApi("resetUserPassword", {
        token: session.token,
        userId: userId
      });

      if (res.ok) {
        window.alert(`Password reset successfully!\n\nNew Temporary Password: ${res.temporaryPassword}\n\nPlease share this securely with the user.`);
        loadUsers(session);
      } else {
        flash(res.error || "Failed to reset password.");
      }
    } catch (err) {
      flash("Connection error.");
    }
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("users", renderUsersModule);
})();
