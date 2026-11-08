/* =========================================================
   UAF IMPACT — ADMIN: SHARED HELPERS FOR TEAM MODULES  (NEW FILE)
   Load this BEFORE programs-hub.js, partnerships.js, tasks.js,
   communications.js.
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

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function can(session, permission) {
    if (!session) return false;
    if (String(session.role).toUpperCase() === "SUPER_ADMIN") return true;
    const perms = session.permissions || [];
    return perms.indexOf("*") !== -1 || perms.indexOf(permission) !== -1;
  }

  function fmtDate(s) {
    if (!s) return "";
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T00:00:00" : s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", { dateStyle: "medium" });
  }

  function fmtDateTime(s) {
    if (!s) return "";
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(new Error("Could not read the file."));
      r.readAsDataURL(file);
    });
  }

  function downloadBase64(b64, fileName, mime) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: mime || "application/pdf" }));
    const a = document.createElement("a");
    a.href = url; a.download = fileName; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  const INPUT = "width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-family:inherit;";
  const SMALL_BTN = "padding:4px 8px;font-size:12px;";

  function field(id, label, value, type, extra) {
    return `<div class="form-field"><label for="${id}">${label}</label>
      <input id="${id}" type="${type || "text"}" value="${esc(value || "")}" ${extra || ""} /></div>`;
  }
  function area(id, label, value, rows) {
    return `<div class="form-field"><label for="${id}">${label}</label>
      <textarea id="${id}" rows="${rows || 3}" style="${INPUT}">${esc(value || "")}</textarea></div>`;
  }
  function badge(text, kind) {
    const colors = { green: ["var(--green-050)", "var(--green-700)"], red: ["var(--red-050)", "var(--red-700)"],
      amber: ["var(--amber-050)", "var(--amber-600)"], blue: ["var(--blue-050)", "var(--blue-700)"], grey: ["var(--surface-alt)", "var(--ink-500)"] };
    const c = colors[kind] || colors.grey;
    return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11.5px;font-weight:600;background:${c[0]};color:${c[1]};">${esc(text)}</span>`;
  }

  window.__uafTeam = { callApi, esc, can, fmtDate, fmtDateTime, fileToBase64, downloadBase64, field, area, badge, INPUT, SMALL_BTN };
})();
