/* =========================================================
   UAF IMPACT — ADMIN: ACCOUNTS & ACCESS  (NEW FILE)
   Super Admin only. Create staff logins and tick exactly
   which parts of the system each person may use.
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";
  const state = { users: [], catalog: [], presets: {}, editingId: null, resetId: null, msg: "" };

  async function callApi(action, payload) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ action }, payload))
    });
    return res.json();
  }

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function fmt(iso) {
    if (!iso) return "Never";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  }

  const ROLE_LABELS = ["CUSTOM", "ADMIN", "COORDINATOR", "EXECUTIVE_STAFF", "ADMINISTRATOR", "FINANCE", "VERIFIER", "PROGRAM_MANAGER", "SUPPORTER_MANAGER", "VIEWER"];

  async function render(container, session) {
    container.innerHTML = '<div class="admin-card"><p class="admin-muted">Loading accounts…</p></div>';
    const res = await callApi("listUsers", { token: session.token });
    if (!res.ok) {
      container.innerHTML = '<div class="admin-card"><h2>Accounts &amp; Access</h2><p class="admin-error">' + esc(res.error || "Could not load accounts.") + "</p></div>";
      return;
    }
    state.users = res.users;
    state.catalog = res.permissions;
    state.presets = res.presets;
    draw(container, session);
  }

  function formHtml() {
    const editing = state.users.find((u) => u.userId === state.editingId);
    const perms = editing ? editing.permissions : ["VIEW_DASHBOARD"];
    const roleOpts = ROLE_LABELS.map((r) =>
      `<option value="${r}" ${editing && editing.role === r ? "selected" : ""}>${esc(r.replace(/_/g, " "))}</option>`).join("");
    const checks = state.catalog.map((p) => `
      <label style="display:flex;gap:8px;align-items:center;font-size:13px;margin:4px 0;">
        <input type="checkbox" class="acc-perm" value="${p.key}" ${perms.indexOf(p.key) !== -1 ? "checked" : ""} ${p.key === "VIEW_DASHBOARD" ? "disabled checked" : ""}/>
        ${esc(p.label)}
      </label>`).join("");

    return `
      <h3 style="margin:0 0 10px;">${editing ? "Edit account — " + esc(editing.name) : "Create new account"}</h3>
      <div class="form-field"><label>Full name</label><input id="acc-name" value="${editing ? esc(editing.name) : ""}" /></div>
      ${editing ? `<p class="admin-muted">Username: <strong>${esc(editing.username || "—")}</strong></p>` :
        `<div class="form-field"><label>Username (used to sign in)</label><input id="acc-username" autocomplete="off" /></div>`}
      <div class="form-field"><label>Email</label><input id="acc-email" type="email" value="${editing ? esc(editing.email) : ""}" /></div>
      ${editing ? "" : `<div class="form-field"><label>Password (min 8, letters + numbers)</label><input id="acc-password" type="text" autocomplete="off" /></div>`}
      <div class="form-field"><label>Role (quick preset — you can still tick/untick below)</label>
        <select id="acc-role" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);">${roleOpts}</select>
      </div>
      <div class="form-field"><label>What this person can access / control</label>${checks}</div>
      <div id="acc-form-error" class="admin-error is-hidden"></div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button id="acc-save" class="btn btn--primary">${editing ? "Save changes" : "Create account"}</button>
        ${editing ? '<button id="acc-cancel" class="btn btn--outline">Cancel</button>' : ""}
      </div>`;
  }

  function draw(container, session) {
    const rows = state.users.map((u) => {
      const isSuper = String(u.role).toUpperCase() === "SUPER_ADMIN";
      const active = u.status === "ACTIVE";
      const actions = isSuper ? '<span class="admin-muted">—</span>' : `
        <button class="btn btn--outline" style="padding:4px 8px;font-size:12px;" data-act="edit" data-id="${u.userId}">Edit</button>
        <button class="btn btn--outline" style="padding:4px 8px;font-size:12px;" data-act="pwd" data-id="${u.userId}">Reset password</button>
        <button class="btn btn--outline" style="padding:4px 8px;font-size:12px;" data-act="toggle" data-id="${u.userId}">${active ? "Disable" : "Enable"}</button>
        <button class="btn btn--outline" style="padding:4px 8px;font-size:12px;color:var(--red-700);" data-act="delete" data-id="${u.userId}">Delete</button>`;
      return `<tr>
        <td><strong>${esc(u.name)}</strong><br><span class="admin-muted">${esc(u.email)}</span></td>
        <td>${esc(u.username || "—")}</td>
        <td>${esc(String(u.role).replace(/_/g, " "))}</td>
        <td style="font-size:12px;max-width:260px;">${isSuper ? "Full access" : esc(u.permissions.length ? u.permissions.map((p) => p.replace(/_/g, " ").toLowerCase()).join(", ") : "role default")}</td>
        <td>${active ? "Active" : "Disabled"}</td>
        <td>${esc(fmt(u.lastLoginAt))}</td>
        <td style="white-space:nowrap;">${actions}</td>
      </tr>`;
    }).join("");

    const resetUser = state.users.find((u) => u.userId === state.resetId);
    const resetBox = resetUser ? `
      <div class="admin-card" style="margin-top:14px;">
        <h3 style="margin:0 0 8px;">Set a new password for ${esc(resetUser.name)}</h3>
        <div class="form-field"><input id="acc-newpw" type="text" placeholder="New password (min 8, letters + numbers)" autocomplete="off" /></div>
        <div id="acc-reset-error" class="admin-error is-hidden"></div>
        <button id="acc-reset-save" class="btn btn--primary">Save password</button>
        <button id="acc-reset-cancel" class="btn btn--outline">Cancel</button>
      </div>` : "";

    container.innerHTML = `
      <div class="admin-card">
        <h2>Accounts &amp; Access</h2>
        <p class="admin-muted">Only you (Super Admin) can see this page. Changes apply immediately — the person is signed out and must log in again.</p>
        ${state.msg ? `<div style="padding:10px;background:var(--blue-050);border-radius:6px;margin:10px 0;">${esc(state.msg)}</div>` : ""}
        <div style="overflow-x:auto;"><table class="admin-table" style="width:100%;font-size:13px;">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Access</th><th>Status</th><th>Last login</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody></table></div>
      </div>
      ${resetBox}
      <div class="admin-card" style="margin-top:14px;max-width:640px;">${formHtml()}</div>`;

    wire(container, session);
  }

  function wire(container, session) {
    const q = (s) => container.querySelector(s);

    // role preset ticks the matching boxes
    q("#acc-role").addEventListener("change", (e) => {
      const preset = state.presets[e.target.value];
      if (!preset) return;
      container.querySelectorAll(".acc-perm").forEach((cb) => { cb.checked = preset.indexOf(cb.value) !== -1 || cb.value === "VIEW_DASHBOARD"; });
    });

    q("#acc-save").addEventListener("click", async () => {
      const err = q("#acc-form-error");
      err.classList.add("is-hidden");
      const perms = Array.from(container.querySelectorAll(".acc-perm:checked")).map((c) => c.value);
      const payload = {
        token: session.token,
        name: q("#acc-name").value.trim(),
        email: q("#acc-email").value.trim(),
        role: q("#acc-role").value,
        permissions: perms
      };
      let res;
      if (state.editingId) {
        payload.userId = state.editingId;
        res = await callApi("updateUser", payload);
      } else {
        payload.username = q("#acc-username").value.trim();
        payload.password = q("#acc-password").value;
        res = await callApi("createUser", payload);
      }
      if (!res.ok) { err.textContent = res.error || "Failed."; err.classList.remove("is-hidden"); return; }
      state.msg = state.editingId ? "Account updated." : "Account created. Give the person their username and password.";
      state.editingId = null;
      render(container, session);
    });

    const cancel = q("#acc-cancel");
    if (cancel) cancel.addEventListener("click", () => { state.editingId = null; draw(container, session); });

    container.querySelectorAll("button[data-act]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = b.dataset.id;
        const user = state.users.find((u) => u.userId === id);
        state.msg = "";
        if (b.dataset.act === "edit") { state.editingId = id; state.resetId = null; draw(container, session); window.scrollTo(0, document.body.scrollHeight); }
        if (b.dataset.act === "pwd") { state.resetId = id; state.editingId = null; draw(container, session); }
        if (b.dataset.act === "toggle") {
          const next = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
          if (!confirm(`${next === "DISABLED" ? "Disable" : "Enable"} ${user.name}?`)) return;
          const res = await callApi("updateUser", { token: session.token, userId: id, status: next });
          state.msg = res.ok ? "Status updated." : (res.error || "Failed.");
          render(container, session);
        }
        if (b.dataset.act === "delete") {
          if (!confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
          const res = await callApi("deleteUser", { token: session.token, userId: id });
          state.msg = res.ok ? "Account deleted." : (res.error || "Failed.");
          render(container, session);
        }
      });
    });

    const rs = q("#acc-reset-save");
    if (rs) {
      rs.addEventListener("click", async () => {
        const err = q("#acc-reset-error");
        err.classList.add("is-hidden");
        const res = await callApi("resetUserPassword", { token: session.token, userId: state.resetId, newPassword: q("#acc-newpw").value });
        if (!res.ok) { err.textContent = res.error || "Failed."; err.classList.remove("is-hidden"); return; }
        state.resetId = null;
        state.msg = "Password updated. Tell the user their new password.";
        render(container, session);
      });
      q("#acc-reset-cancel").addEventListener("click", () => { state.resetId = null; draw(container, session); });
    }
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("accounts", render);
})();
