/* =========================================================
   UAF IMPACT — ADMIN: EMPOWERMENT DATA  (NEW FILE - own menu tab)
   Household livelihood empowerment training records (multiple trainings + beneficiary dependents).
   Separate permission: MANAGE_EMPOWERMENT (give it to any admin).
   Needs: admin-tools.js
   ========================================================= */
(() => {
  "use strict";

  const T = window.__uafTools;
  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  const COUNTIES = ["Bomi", "Bong", "Gbarpolu", "Grand Bassa", "Grand Cape Mount", "Grand Gedeh", "Grand Kru", "Lofa",
    "Margibi", "Maryland", "Montserrado", "Nimba", "River Cess", "River Gee", "Sinoe"];
  const SKILLS = ["Soap Making", "Tie-Dye / Batik", "Baking & Pastry", "Tailoring & Sewing", "Sustainable Agriculture",
    "Computer Literacy", "Small Business / Susu Management", "Other Vocational Skill"];

  let items = [];
  let childNames = [];
  let page = 0;
  let search = "";
  let root = null;
  let session = null;

  const esc = (s) => T.esc(s);
  const $ = (sel) => root.querySelector(sel);

  async function callApi(action, payload) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ action }, payload))
    });
    return res.json();
  }

  function can() {
    if (!session) return false;
    if (String(session.role).toUpperCase() === "SUPER_ADMIN") return true;
    const p = session.permissions || [];
    return p.includes("*") || p.includes("MANAGE_EMPOWERMENT");
  }

  function flash(message, kind) {
    const el = $("#emp-flash");
    if (!el) return;
    el.innerHTML = `<div class="admin-error" style="${kind === "success" ? "background:var(--green-050);color:var(--green-700);" : ""}">${esc(message)}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ""; }, 5000);
  }

  /* local-only trainee photos (kept in this browser, keyed by record id) */
  const photoKey = "uaf_empowerment_photos";
  const getPhotos = () => { try { return JSON.parse(localStorage.getItem(photoKey) || "{}"); } catch (_) { return {}; } };
  const setPhoto = (id, data) => { try { const p = getPhotos(); p[id] = data; localStorage.setItem(photoKey, JSON.stringify(p)); } catch (_) {} };

  function render(container, sess) {
    root = container;
    session = sess;
    if (!can()) {
      container.innerHTML = `<div class="admin-card"><h2>Access Restricted</h2>
        <p class="admin-muted">Your account does not have permission to manage Empowerment Data.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-module-header">
        <div>
          <h2>Empowerment Data</h2>
          <p class="admin-muted" style="margin-top:4px;">Household livelihood empowerment training records — vocational training for caregivers so families can sustain their children's schooling.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="emp-refresh" class="btn btn--outline">Refresh</button>
          <button id="emp-add" class="btn btn--primary">+ Add Empowerment Trainee</button>
        </div>
      </div>
      <div id="emp-flash"></div>
      <div style="margin:0 0 12px;">
        <input type="search" id="emp-search" placeholder="Search by name, community, skill, contact…" value="${esc(search)}"
          style="width:100%;max-width:420px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13.5px;" />
      </div>
      <div class="admin-table-wrap"><div id="emp-table"><p class="admin-muted" style="padding:24px;text-align:center;">Loading empowerment records…</p></div></div>

      <div id="emp-modal" class="admin-modal-overlay is-hidden">
        <div class="admin-modal" style="max-width:560px;">
          <h3 id="emp-modal-title">Add Empowerment Trainee</h3>
          <form id="emp-form" style="margin-top:12px;">
            <input type="hidden" id="emp-id" />
            <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;">
              <div class="form-field"><label for="emp-name">Caregiver / Trainee Full Name *</label><input type="text" id="emp-name" required /></div>
              <div class="form-field"><label for="emp-gender">Gender *</label>
                <select id="emp-gender" required><option>Female</option><option>Male</option><option>Other</option></select></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field"><label for="emp-county">County *</label>
                <select id="emp-county" required>${COUNTIES.map((c) => `<option ${c === "Montserrado" ? "selected" : ""}>${c}</option>`).join("")}</select></div>
              <div class="form-field"><label for="emp-community">Community / Town *</label><input type="text" id="emp-community" required placeholder="e.g. Duport Road" /></div>
            </div>
            <div class="form-field"><label>Training(s) received * <span class="admin-muted" style="font-weight:400;">(tick one or more)</span></label>
              <div id="emp-skills" style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;">
                ${SKILLS.map((sk, i) => `<label style="display:flex;gap:8px;align-items:center;font-size:13px;font-weight:400;"><input type="checkbox" class="emp-skill-cb" value="${esc(sk)}" data-i="${i}" /> ${esc(sk)}</label>`).join("")}
              </div>
              <input type="text" id="emp-skill-other" class="is-hidden" placeholder="Specify the other training(s), separated by commas" style="margin-top:6px;" />
            </div>
            <div class="form-field"><label for="emp-contact">Contact Telephone *</label><input type="tel" id="emp-contact" required placeholder="088... or 077..." /></div>
            <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;">
              <div class="form-field"><label for="emp-dep-count">Beneficiary dependents *</label>
                <input type="number" id="emp-dep-count" min="0" max="99" step="1" required placeholder="Number of people" /></div>
              <div class="form-field"><label for="emp-dep-details">Dependents' names / ages (optional)</label>
                <input type="text" id="emp-dep-details" maxlength="1000" placeholder="e.g. Mary 8, John 5, Grandmother 70" /></div>
            </div>
            <div class="form-field"><label for="emp-child">Connected to Child (optional)</label>
              <input type="text" id="emp-child" list="emp-child-list" placeholder="Pick an identified child or type a name — leave empty for general household" />
              <datalist id="emp-child-list"></datalist></div>
            <div class="form-field"><label for="emp-photo">Trainee Photo (optional, kept on this device)</label><input type="file" id="emp-photo" accept="image/*" /></div>
            <div id="emp-form-error" class="admin-error is-hidden"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
              <button type="button" id="emp-cancel" class="btn btn--outline">Cancel</button>
              <button type="submit" id="emp-save" class="btn btn--primary">Save Empowerment Record</button>
            </div>
          </form>
        </div>
      </div>`;

    $("#emp-refresh").addEventListener("click", load);
    $("#emp-add").addEventListener("click", () => openModal(null));
    $("#emp-cancel").addEventListener("click", closeModal);
    $("#emp-form").addEventListener("submit", save);
    $("#emp-skills").addEventListener("change", syncOther);
    $("#emp-search").addEventListener("input", (e) => {
      search = e.target.value; page = 0; drawTable();
    });
    load();
  }

  async function load() {
    $("#emp-table").innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading empowerment records…</p>';
    try {
      const res = await callApi("listEmpowermentData", { token: session.token });
      if (!res.ok) { $("#emp-table").innerHTML = `<div class="admin-error" style="margin:16px;">${esc(res.error || "Could not load records.")}</div>`; return; }
      items = res.empowermentRecords || [];
    } catch (_) {
      $("#emp-table").innerHTML = '<div class="admin-error" style="margin:16px;">Connection error. Please try again.</div>';
      return;
    }
    // names of identified children (only if this admin may view them)
    try {
      const c = await callApi("listOutOfSchoolSubmissions", { token: session.token });
      if (c && c.ok && Array.isArray(c.submissions)) {
        childNames = Array.from(new Set(c.submissions.map((s) => s.childName).filter(Boolean)));
      }
    } catch (_) {}
    page = 0;
    drawTable();
  }

  function filtered() {
    const q = search.toLowerCase().trim();
    let list = T.newestFirst(items, ["date", "createdAt"]);
    if (q) list = list.filter((e) => [e.name, e.community, e.county, e.skill, e.contact, e.connectedChild, e.dependentsDetails].join(" ").toLowerCase().includes(q));
    return list;
  }

  function drawTable() {
    const box = $("#emp-table");
    const list = filtered();
    if (!list.length) {
      box.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No empowerment records found. Click <strong>"+ Add Empowerment Trainee"</strong> to add one.</p>';
      return;
    }
    const pg = T.paginate(list, page, 10);
    page = pg.page;
    const photos = getPhotos();
    const rows = pg.slice.map((e) => {
      const photo = photos[e.id];
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px;">
          ${photo ? `<img src="${photo}" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #cbd5e1;" />`
                  : `<div style="width:34px;height:34px;border-radius:50%;background:#fef3c7;color:#b45309;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">${esc((e.name || "E").charAt(0).toUpperCase())}</div>`}
          <div><strong>${esc(e.name)}</strong><div style="font-size:11px;color:var(--ink-500);">${esc(e.gender || "—")}</div></div></div></td>
        <td>${esc(e.county)} · <span style="font-size:11.5px;color:var(--ink-500);">${esc(e.community)}</span></td>
        <td style="white-space:normal;min-width:180px;">${skillList(e.skill).map((sk) => `<span class="admin-badge admin-badge--neutral" style="font-size:11px;font-weight:600;display:inline-block;margin:1px 3px 1px 0;">${esc(sk)}</span>`).join("")}</td>
        <td title="${esc(e.dependentsDetails || "")}" style="white-space:normal;min-width:120px;"><strong>${e.dependentsCount === "" || e.dependentsCount == null ? "—" : esc(e.dependentsCount)}</strong>${e.dependentsDetails ? `<div style="font-size:11px;color:var(--ink-500);">${esc(e.dependentsDetails).slice(0, 60)}${e.dependentsDetails.length > 60 ? "…" : ""}</div>` : ""}</td>
        <td>${e.connectedChild ? `<span style="color:var(--blue-700);font-weight:600;">${esc(e.connectedChild)}</span>` : '<span style="color:var(--ink-400);">None</span>'}</td>
        <td><a href="tel:${esc(e.contact)}" style="color:var(--blue-700);text-decoration:none;">${esc(e.contact)}</a></td>
        <td><div style="display:flex;gap:6px;">
          <button class="btn btn--outline" style="padding:4px 9px;font-size:11.5px;" data-edit="${esc(e.id)}">Edit</button>
          <button class="btn btn--outline" style="padding:4px 9px;font-size:11.5px;color:var(--red-700);" data-del="${esc(e.id)}">Delete</button></div></td></tr>`;
    }).join("");

    box.innerHTML = `<table class="admin-table"><thead><tr>
      <th>Trainee / Caregiver</th><th>Location / Community</th><th>Training(s)</th><th>Dependents</th><th>Connected Child</th><th>Contact</th><th>Action</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
    T.attachPager(box, pg, (p) => { page = p; drawTable(); });
    box.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openModal(items.find((x) => x.id === b.dataset.edit))));
    box.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => remove(b.dataset.del)));
  }

  const OTHER = "Other Vocational Skill";
  function syncOther() {
    const other = root.querySelector('.emp-skill-cb[value="' + OTHER + '"]');
    $("#emp-skill-other").classList.toggle("is-hidden", !(other && other.checked));
  }
  const skillList = (txt) => String(txt || "").split(",").map((x) => x.trim()).filter(Boolean);

  function openModal(e) {
    $("#emp-form").reset();
    $("#emp-form-error").classList.add("is-hidden");
    $("#emp-child-list").innerHTML = childNames.map((n) => `<option value="${esc(n)}"></option>`).join("");
    $("#emp-id").value = e ? e.id : "";
    $("#emp-modal-title").textContent = e ? `Edit Empowerment Record: ${e.name}` : "Add Empowerment Trainee";
    if (e) {
      $("#emp-name").value = e.name || "";
      $("#emp-gender").value = e.gender || "Female";
      $("#emp-county").value = e.county || "Montserrado";
      $("#emp-community").value = e.community || "";
      const have = skillList(e.skill);
      const unknown = [];
      have.forEach((sk) => {
        const cb = root.querySelector('.emp-skill-cb[value="' + sk.replace(/"/g, '\\"') + '"]');
        if (cb) cb.checked = true; else unknown.push(sk);
      });
      if (unknown.length) {
        root.querySelector('.emp-skill-cb[value="' + OTHER + '"]').checked = true;
        $("#emp-skill-other").value = unknown.join(", ");
      }
      $("#emp-contact").value = e.contact || "";
      $("#emp-dep-count").value = e.dependentsCount === "" || e.dependentsCount == null ? "" : e.dependentsCount;
      $("#emp-dep-details").value = e.dependentsDetails || "";
      $("#emp-child").value = e.connectedChild || "";
    }
    syncOther();
    $("#emp-modal").classList.remove("is-hidden");
  }
  function closeModal() { $("#emp-modal").classList.add("is-hidden"); }

  async function save(ev) {
    ev.preventDefault();
    const err = $("#emp-form-error");
    err.classList.add("is-hidden");
    const btn = $("#emp-save");
    const id = $("#emp-id").value;
    const chosen = Array.from(root.querySelectorAll(".emp-skill-cb:checked")).map((c) => c.value).filter((v) => v !== OTHER);
    if (root.querySelector('.emp-skill-cb[value="' + OTHER + '"]').checked) {
      const extra = skillList($("#emp-skill-other").value);
      if (extra.length) extra.forEach((x) => chosen.push(x)); else chosen.push(OTHER);
    }
    if (!chosen.length) { err.textContent = "Select at least one training."; err.classList.remove("is-hidden"); return; }
    const payload = {
      token: session.token,
      name: $("#emp-name").value.trim(),
      gender: $("#emp-gender").value,
      county: $("#emp-county").value,
      community: $("#emp-community").value.trim(),
      skill: chosen.join(", "),
      contact: $("#emp-contact").value.trim(),
      dependentsCount: $("#emp-dep-count").value,
      dependentsDetails: $("#emp-dep-details").value.trim(),
      connectedChild: $("#emp-child").value.trim()
    };
    btn.disabled = true;
    try {
      let res;
      if (id) { payload.id = id; res = await callApi("updateEmpowermentData", payload); }
      else res = await callApi("createEmpowermentData", payload);
      if (!res.ok) { err.textContent = res.error || "Could not save."; err.classList.remove("is-hidden"); return; }

      const file = $("#emp-photo").files[0];
      const savedId = id || res.empowerId;
      if (file && savedId) {
        const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
        setPhoto(savedId, data);
      }
      closeModal();
      flash(id ? `Record for "${payload.name}" updated.` : `Record for "${payload.name}" saved.`, "success");
      window.dispatchEvent(new Event("uaf_data_updated"));
      await load();
    } catch (_) {
      err.textContent = "Couldn't reach the server."; err.classList.remove("is-hidden");
    } finally { btn.disabled = false; }
  }

  async function remove(id) {
    const e = items.find((x) => x.id === id);
    if (!confirm(`Permanently delete "${e ? e.name : id}"?`)) return;
    const res = await callApi("deleteEmpowermentData", { token: session.token, id: id, name: e ? e.name : "", rowNumber: e ? e.rowNumber : 0 });
    if (res.ok) { flash("Empowerment trainee record removed.", "success"); window.dispatchEvent(new Event("uaf_data_updated")); await load(); }
    else flash(res.error || "Could not delete.", "error");
  }

  if (window.__uafRegisterAdminModule) window.__uafRegisterAdminModule("empowerment", render);
})();
