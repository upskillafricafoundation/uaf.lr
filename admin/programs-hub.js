/* =========================================================
   UAF IMPACT — ADMIN: PROGRAMS, IMPACT & PDF REPORTS  (NEW FILE)
   Replaces the old programs.js (load this INSTEAD of it).
   Registers the existing "programs" menu item.
   Needs: team-common.js
   ========================================================= */
(() => {
  "use strict";
  const T = window.__uafTeam;
  if (!T) return;
  const { callApi, esc, can, fmtDate, field, area, badge, INPUT, SMALL_BTN } = T;

  const S = { programs: [], impact: [], selected: null, form: null, msg: "" };
  let root = null, session = null;

  const $ = (s) => root.querySelector(s);

  async function render(container, sess) {
    root = container; session = sess;
    root.innerHTML = '<div class="admin-card"><p class="admin-muted">Loading programs…</p></div>';
    const [p, i] = await Promise.all([
      callApi("listPrograms", { token: session.token }),
      callApi("listImpact", { token: session.token })
    ]);
    if (!p.ok) { root.innerHTML = `<div class="admin-card"><h2>UAF Programs</h2><p class="admin-error">${esc(p.error || "Could not load.")}</p></div>`; return; }
    S.programs = p.programs;
    S.impact = i.ok ? i.impact : [];
    S.selected ? drawDetail() : drawList();
  }

  const flash = () => S.msg ? `<div style="padding:10px;background:var(--blue-050);border-radius:6px;margin-bottom:10px;">${esc(S.msg)}</div>` : "";

  /* ---------------- list ---------------- */
  function drawList() {
    S.selected = null;
    const canEdit = can(session, "MANAGE_PROGRAMS");
    const cards = S.programs.map((p) => {
      const n = S.impact.filter((x) => x.programId === p.id).reduce((a, x) => a + x.maleReached + x.femaleReached, 0);
      return `<div class="admin-card" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div>
            <strong style="font-size:15px;">${esc(p.title)}</strong> ${p.shortCode ? `<span class="admin-muted">· ${esc(p.shortCode)}</span>` : ""}
            ${p.status === "ACTIVE" ? badge("Public", "green") : badge("Hidden", "grey")}
            <div class="admin-muted" style="margin-top:4px;">${esc(p.description).slice(0, 180)}${p.description.length > 180 ? "…" : ""}</div>
            <div class="admin-muted" style="font-size:12px;margin-top:4px;">${p.targetBeneficiaries ? "Target: " + esc(p.targetBeneficiaries) + " · " : ""}People reached (logged): <strong>${n}</strong></div>
          </div>
          <div style="display:flex;gap:6px;align-items:flex-start;">
            <button class="btn btn--primary" style="${SMALL_BTN}" data-act="view" data-id="${esc(p.id)}">Open</button>
            ${canEdit ? `<button class="btn btn--outline" style="${SMALL_BTN}" data-act="edit" data-id="${esc(p.id)}">Edit</button>
            <button class="btn btn--outline" style="${SMALL_BTN}color:var(--red-700);" data-act="delete" data-id="${esc(p.id)}">Delete</button>` : ""}
          </div>
        </div></div>`;
    }).join("");

    root.innerHTML = `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h2 style="margin:0;">UAF Programs</h2>
          ${canEdit ? '<button id="pg-new" class="btn btn--primary">+ Add program</button>' : ""}
        </div>
        <p class="admin-muted">Programs marked <em>Public</em> also appear on the public website.</p>
      </div>
      <div style="margin-top:14px;">${flash()}${cards || '<div class="admin-card"><p class="admin-muted">No programs yet.</p></div>'}</div>
      ${S.form ? formHtml() : ""}`;
    S.msg = "";

    const n = $("#pg-new");
    if (n) n.addEventListener("click", () => { S.form = { mode: "new", data: {} }; drawList(); });
    root.querySelectorAll("button[data-act]").forEach((b) => b.addEventListener("click", () => onListAction(b.dataset.act, b.dataset.id)));
    wireForm();
  }

  async function onListAction(act, id) {
    const p = S.programs.find((x) => x.id === id);
    if (act === "view") { S.selected = id; drawDetail(); }
    if (act === "edit") { S.form = { mode: "edit", id, data: p }; drawList(); }
    if (act === "delete") {
      if (!confirm(`Delete "${p.title}"? Its impact entries will stay in the sheet but no longer be listed.`)) return;
      const r = await callApi("deleteProgram", { token: session.token, programId: id });
      S.msg = r.ok ? "Program deleted." : (r.error || "Failed.");
      render(root, session);
    }
  }

  /* ---------------- form ---------------- */
  function formHtml() {
    const d = S.form.data || {};
    return `<div class="admin-card" style="margin-top:14px;max-width:700px;">
      <h3 style="margin:0 0 10px;">${S.form.mode === "edit" ? "Edit program" : "New program"}</h3>
      ${field("pf-title", "Program title *", d.title)}
      ${field("pf-code", "Short code (e.g. NIC)", d.shortCode)}
      ${field("pf-cat", "Tag shown on the public site (e.g. Flagship)", d.category)}
      ${area("pf-desc", "Description / Introduction", d.description, 3)}
      ${field("pf-target", "Target beneficiaries", d.targetBeneficiaries)}
      ${area("pf-obj", "Objectives", d.objectives, 3)}
      ${area("pf-details", "Details", d.details, 4)}
      ${field("pf-order", "Display order on public site (1 = first)", d.displayOrder || "", "number")}
      <label style="display:flex;gap:8px;align-items:center;margin:8px 0;">
        <input type="checkbox" id="pf-public" ${!d.status || d.status === "ACTIVE" ? "checked" : ""} /> Show on public website
      </label>
      <div id="pf-error" class="admin-error is-hidden"></div>
      <div style="display:flex;gap:8px;">
        <button id="pf-save" class="btn btn--primary">Save program</button>
        <button id="pf-cancel" class="btn btn--outline">Cancel</button>
      </div></div>`;
  }

  function wireForm() {
    const save = $("#pf-save");
    if (!save) return;
    $("#pf-cancel").addEventListener("click", () => { S.form = null; S.selected ? drawDetail() : drawList(); });
    save.addEventListener("click", async () => {
      const err = $("#pf-error"); err.classList.add("is-hidden");
      const payload = {
        token: session.token,
        title: $("#pf-title").value, shortCode: $("#pf-code").value, category: $("#pf-cat").value,
        description: $("#pf-desc").value, targetBeneficiaries: $("#pf-target").value,
        objectives: $("#pf-obj").value, details: $("#pf-details").value,
        displayOrder: $("#pf-order").value, status: $("#pf-public").checked ? "ACTIVE" : "DRAFT"
      };
      let r;
      if (S.form.mode === "edit") { payload.programId = S.form.id; r = await callApi("updateProgram", payload); }
      else r = await callApi("createProgram", payload);
      if (!r.ok) { err.textContent = r.error || "Failed."; err.classList.remove("is-hidden"); return; }
      S.msg = "Program saved.";
      S.form = null;
      render(root, session);
    });
  }

  /* ---------------- detail + impact + PDF ---------------- */
  function drawDetail() {
    const p = S.programs.find((x) => x.id === S.selected);
    if (!p) { drawList(); return; }
    const rows = S.impact.filter((x) => x.programId === p.id);
    const male = rows.reduce((a, x) => a + x.maleReached, 0);
    const female = rows.reduce((a, x) => a + x.femaleReached, 0);
    const canImpact = can(session, "MANAGE_IMPACT");
    const canEdit = can(session, "MANAGE_PROGRAMS");

    const sec = (t, v) => `<h4 style="margin:14px 0 4px;">${t}</h4><div style="white-space:pre-wrap;">${esc(v || "—")}</div>`;
    const tbody = rows.map((x) => `<tr>
      <td>${esc(fmtDate(x.date))}</td><td>${esc(x.location)}</td>
      <td>${x.femaleReached}</td><td>${x.maleReached}</td><td>${esc(x.averageAge)}</td>
      <td>${esc(x.directImpact)}</td><td>${esc(x.indirectImpact)}</td>
      <td>${canImpact ? `<button class="btn btn--outline" style="${SMALL_BTN}color:var(--red-700);" data-del-imp="${esc(x.id)}">Delete</button>` : ""}</td></tr>`).join("");

    root.innerHTML = `
      <div class="admin-card">
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <button id="pd-back" class="btn btn--outline">← All programs</button>
          ${canEdit ? '<button id="pd-edit" class="btn btn--outline">Edit program</button>' : ""}
        </div>
        ${flash()}
        <h2 style="margin:0;">${esc(p.title)} ${p.shortCode ? `<span class="admin-muted">· ${esc(p.shortCode)}</span>` : ""}</h2>
        ${sec("Introduction", p.description)}${sec("Objectives", p.objectives)}
        ${sec("Target beneficiaries", p.targetBeneficiaries)}${sec("Details", p.details)}
      </div>

      <div class="admin-card" style="margin-top:14px;">
        <h3 style="margin:0 0 4px;">Impact data</h3>
        <p class="admin-muted">Total reached: <strong>${male + female}</strong> (Female ${female} · Male ${male})</p>
        ${rows.length ? `<div style="overflow-x:auto;"><table class="admin-table" style="width:100%;font-size:13px;">
          <thead><tr><th>Date</th><th>Location</th><th>Female</th><th>Male</th><th>Avg age</th><th>Direct impact</th><th>Indirect impact</th><th></th></tr></thead>
          <tbody>${tbody}</tbody></table></div>` : '<p class="admin-muted">No impact entries yet.</p>'}
      </div>

      ${canImpact ? `<div class="admin-card" style="margin-top:14px;max-width:700px;">
        <h3 style="margin:0 0 10px;">Add impact entry</h3>
        ${field("im-date", "Date", new Date().toISOString().slice(0, 10), "date")}
        ${field("im-loc", "Location")}
        ${field("im-f", "Females reached", "", "number", 'min="0"')}
        ${field("im-m", "Males reached", "", "number", 'min="0"')}
        ${field("im-age", "Average age")}
        ${area("im-direct", "Direct impact", "", 2)}
        ${area("im-indirect", "Indirect impact", "", 2)}
        <div id="im-error" class="admin-error is-hidden"></div>
        <button id="im-add" class="btn btn--primary">Add entry</button></div>` : ""}

      <div class="admin-card" style="margin-top:14px;max-width:700px;">
        <h3 style="margin:0 0 10px;">PDF report</h3>
        <p class="admin-muted">Leave dates empty to include all impact data.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <div class="form-field" style="flex:1;min-width:150px;"><label for="rp-start">From</label><input id="rp-start" type="date" /></div>
          <div class="form-field" style="flex:1;min-width:150px;"><label for="rp-end">To</label><input id="rp-end" type="date" /></div>
        </div>
        <div id="rp-error" class="admin-error is-hidden"></div>
        <button id="rp-go" class="btn btn--primary">Download PDF report</button>
      </div>
      ${S.form ? formHtml() : ""}`;
    S.msg = "";

    $("#pd-back").addEventListener("click", () => { S.selected = null; S.form = null; drawList(); });
    const ed = $("#pd-edit");
    if (ed) ed.addEventListener("click", () => { S.form = { mode: "edit", id: p.id, data: p }; drawDetail(); });
    wireForm();

    root.querySelectorAll("[data-del-imp]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delete this impact entry?")) return;
      const r = await callApi("deleteImpact", { token: session.token, impactId: b.dataset.delImp });
      S.msg = r.ok ? "Entry deleted." : (r.error || "Failed.");
      render(root, session);
    }));

    const add = $("#im-add");
    if (add) add.addEventListener("click", async () => {
      const err = $("#im-error"); err.classList.add("is-hidden");
      const r = await callApi("addImpact", {
        token: session.token, programId: p.id, date: $("#im-date").value, location: $("#im-loc").value,
        femaleReached: $("#im-f").value, maleReached: $("#im-m").value, averageAge: $("#im-age").value,
        directImpact: $("#im-direct").value, indirectImpact: $("#im-indirect").value
      });
      if (!r.ok) { err.textContent = r.error || "Failed."; err.classList.remove("is-hidden"); return; }
      S.msg = "Impact entry added.";
      render(root, session);
    });

    $("#rp-go").addEventListener("click", async (e) => {
      const btn = e.target, err = $("#rp-error");
      err.classList.add("is-hidden");
      btn.disabled = true; btn.textContent = "Building report…";
      try {
        const r = await callApi("generateProgramPdfReport", { token: session.token, programId: p.id, startDate: $("#rp-start").value, endDate: $("#rp-end").value });
        if (r.ok) T.downloadBase64(r.base64, r.fileName, "application/pdf");
        else { err.textContent = r.error || "Could not build the report."; err.classList.remove("is-hidden"); }
      } catch (ex) { err.textContent = "Couldn't reach the server."; err.classList.remove("is-hidden"); }
      btn.disabled = false; btn.textContent = "Download PDF report";
    });
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("programs", render);
})();
