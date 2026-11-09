/* =========================================================
   UAF IMPACT — ADMIN AUTH (Phase 6)
   ---------------------------------------------------------
   Token lives in sessionStorage (cleared when the tab closes)
   rather than localStorage — an admin session should not
   silently persist across browser restarts on a shared device.
   Phase 7+ modules can read window.__uafAdminSession to get
   the current {token, name, role} without re-implementing login.
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  const loginScreen = document.getElementById("login-screen");
  const dashboardScreen = document.getElementById("dashboard-screen");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");

  async function callApi(action, payload) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ action }, payload))
    });
    return res.json();
  }

  function showLogin(message) {
    dashboardScreen.classList.add("is-hidden");
    loginScreen.classList.remove("is-hidden");
    if (message) {
      loginError.textContent = message;
      loginError.classList.remove("is-hidden");
    }
  }

  function isSuperAdmin(role) {
    const r = String(role || "").toUpperCase().trim().replace(/[\s-]+/g, "_");
    return r === "SUPER_ADMIN" || r === "SUPERADMIN";
  }

  function getDisplayRole(role) {
    const r = String(role || "").toUpperCase().trim().replace(/[\s-]+/g, "_");
    if (r === "SUPER_ADMIN") return "Super Admin";
    return r.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ") || "Staff";
  }

  // Which permission(s) unlock each menu module (the server enforces the same rules).
  const MODULE_PERMISSIONS = {
    dashboard: null,
    community: ["MANAGE_COMMUNITIES", "REVIEW_OUT_OF_SCHOOL_SUBMISSION", "MANAGE_IMPACT_DATA"],
    programs: ["MANAGE_PROGRAMS", "MANAGE_IMPACT"],
    empowerment: ["MANAGE_EMPOWERMENT"],
    partnerships: ["MANAGE_PARTNERSHIPS"],
    donations: ["VIEW_DONATIONS"],
    stories: ["MANAGE_NEWS", "REVIEW_EVIDENCE_REQUEST"],
    tasks: ["VIEW_TASKS", "MANAGE_TASKS"],
    communications: ["VIEW_INBOX", "SEND_EMAIL", "MANAGE_CONTACTS"],
    accounts: "SUPER_ONLY"
  };

  function canAccessModule(session, mod) {
    if (!session) return false;
    if (isSuperAdmin(session.role)) return true;
    const need = MODULE_PERMISSIONS[mod];
    if (need === undefined || need === "SUPER_ONLY") return false;
    if (need === null) return true;
    const perms = session.permissions || [];
    return perms.indexOf("*") !== -1 || need.some((p) => perms.indexOf(p) !== -1);
  }

  function applyRolePermissions(session) {
    document.querySelectorAll(".admin-nav__item[data-module]").forEach((item) => {
      item.style.display = canAccessModule(session, item.dataset.module) ? "" : "none";
    });
  }

  function showDashboard(session) {
    window.__uafAdminSession = session;
    const displayRole = getDisplayRole(session.role);
    document.getElementById("welcome-name").textContent = session.name;
    document.getElementById("welcome-role").textContent = displayRole;
    document.getElementById("admin-user-label").textContent = session.name + " · " + displayRole;
    applyRolePermissions(session);
    loginScreen.classList.add("is-hidden");
    dashboardScreen.classList.remove("is-hidden");
  }

  async function restoreSession() {
    const token = sessionStorage.getItem("uaf_admin_token");
    const savedRole = sessionStorage.getItem("uaf_admin_role");
    if (!token) return showLogin();
    const result = await callApi("adminWhoAmI", { token });
    if (result.ok) {
      showDashboard({ token, name: result.name, role: result.role || savedRole || "", permissions: result.permissions || [] });
    } else {
      sessionStorage.removeItem("uaf_admin_token");
      sessionStorage.removeItem("uaf_admin_role");
      showLogin();
    }
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("is-hidden");
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    submitBtn.setAttribute("disabled", "true");
    try {
      const result = await callApi("adminLogin", { email, password });
      if (result.ok) {
        sessionStorage.setItem("uaf_admin_token", result.token);
        sessionStorage.setItem("uaf_admin_role", result.role || "");
        showDashboard({ token: result.token, name: result.name, role: result.role, permissions: result.permissions || [] });
      } else {
        loginError.textContent = result.error || "Sign in failed.";
        loginError.classList.remove("is-hidden");
      }
    } catch (err) {
      loginError.textContent = "Couldn't reach the server. Please check your connection and try again.";
      loginError.classList.remove("is-hidden");
    } finally {
      submitBtn.removeAttribute("disabled");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    const token = sessionStorage.getItem("uaf_admin_token");
    sessionStorage.removeItem("uaf_admin_token");
    sessionStorage.removeItem("uaf_admin_role");
    window.__uafAdminSession = null;
    showLogin();
    if (token) callApi("adminLogout", { token }).catch(() => {});
  });

  restoreSession();

  /* =========================================================
     MODULE REGISTRY (Phase 7+)
     ---------------------------------------------------------
     The Phase 6 "Signed in" card lives in #admin-modules and
     showDashboard() above already sets #welcome-name/#welcome-role
     inside it directly — that markup and those IDs are untouched.
     Rather than risk breaking that by re-rendering #admin-modules'
     innerHTML, each new module (Phase 7's media.js, later phases'
     own files) renders into a separate sibling panel
     (#admin-module-panel) and the two are toggled by visibility.
     A module registers itself with window.__uafRegisterAdminModule
     and doesn't need to know about any other module.
  ========================================================= */
  const moduleRegistry = {};
  window.__uafRegisterAdminModule = function (key, renderFn) {
    moduleRegistry[key] = renderFn;
  };

  function activateModule(key) {
    document.querySelectorAll(".admin-nav__item[data-module]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.module === key);
    });

    const dashboardPanel = document.getElementById("admin-modules");
    const modulePanel = document.getElementById("admin-module-panel");
    if (!dashboardPanel || !modulePanel) return;

    if (key === "dashboard") {
      dashboardPanel.classList.remove("is-hidden");
      modulePanel.classList.add("is-hidden");
      return;
    }

    const session = window.__uafAdminSession;
    if (!canAccessModule(session, key)) {
      dashboardPanel.classList.add("is-hidden");
      modulePanel.classList.remove("is-hidden");
      modulePanel.innerHTML = `
        <div class="admin-card">
          <h2>Access Restricted</h2>
          <p class="admin-muted">Your current role (${escapeHtml(getDisplayRole(session?.role))}) does not have access to this module. Admin privileges are required.</p>
        </div>
      `;
      return;
    }

    dashboardPanel.classList.add("is-hidden");
    modulePanel.classList.remove("is-hidden");

    const renderFn = moduleRegistry[key];
    if (renderFn) {
      modulePanel.innerHTML = "";
      renderFn(modulePanel, window.__uafAdminSession);
    } else {
      modulePanel.innerHTML = '<div class="admin-card"><p class="admin-muted">This module isn\'t available yet.</p></div>';
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  document.querySelectorAll(".admin-nav__item[data-module]").forEach((item) => {
    item.addEventListener("click", () => activateModule(item.dataset.module));
  });
})();
