/* =========================================================
   UAF IMPACT — ADMIN: PARTNERSHIPS  (NEW FILE)
   New menu item "Partnerships" (data-module="partnerships").
   Needs: team-common.js
   ========================================================= */
(() => {
  "use strict";
  const T = window.__uafTeam;
  if (!T) return;
  const { callApi, esc, fmtDate, field, area, badge, INPUT, SMALL_BTN } = T;

  const CATEGORIES = ["Collaborative Partner", "Funding Partner", "Implementing Partner", "Government", "School", "Community Organization", "Corporate", "Other"];
  const S = { list: [], form: null, selected: null, q: "", cat: "", msg: "", logo: undefined };
  let root = null, session = null;
  const $ = (s) => root.querySelector(s);

  async function render(container, sess) {
    root = container; session = sess;
    root.innerHTML = '<div class="admin-card"><p class="admin-muted">Loading partnerships…</p></div>';
    const r = await callApi("listPartnerships", { token: session.token });
    if (!r.ok) { root.innerHTML = `<div class="admin-card"><h2>Partnerships</h2><p class="admin-error">${esc(r.error || "Could not load.")}</p></div>`; return; }
    S.list = r.partnerships;
    S.selected ? drawDetail() : drawList();
  }

  const flash = () => S.msg ? `<div style="padding:10px;background:var(--blue-050);border-radius:6px;margin-bottom:10px;">${esc(S.msg)}</div>` : "";
  const logoImg = (p, size) => p.logoUrl
    ? `<img src="${esc(p.logoUrl)}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;border-radius:8px;border:1px solid var(--border);background:#fff;" />`
    : `<div style="width:${size}px;height:${size}px;border-radius:8px;background:var(--surface-alt);display:flex;align-items:center;justify-content:center;color:var(--ink-400);font-weight:700;">${esc((p.name || "?").charAt(0))}</div>`;

  function drawList() {
    S.selected = null;
    const q = S.q.toLowerCase();
    const items = S.list.filter((p) => (!S.cat || p.category === S.cat) &&
      (!q || (p.name + " " + p.purpose + " " + p.category).toLowerCase().includes(q)));
    const cats = Array.from(new Set(S.list.map((p) => p.category))).sort();

    root.innerHTML = `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <h2 style="margin:0;">Partnerships (${S.list.length})</h2>
          <button id="pt-new" class="btn btn--primary">+ Add partnership</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <input id="pt-q" placeholder="Search…" value="${esc(S.q)}" style="${INPUT}flex:1;min-width:140px;width:auto;" />
          <select id="pt-cat" style="${INPUT}width:auto;"><option value="">All categories</option>
            ${cats.map((c) => `<option ${S.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
        </div>
      </div>
      <div style="margin-top:14px;">${flash()}
        ${items.map((p) => `<div class="admin-card" style="margin-bottom:10px;display:flex;gap:12px;align-items:center;cursor:pointer;" data-open="${esc(p.id)}">
          ${logoImg(p, 52)}
          <div style="flex:1;"><strong>${esc(p.name)}</strong> ${badge(p.category, "blue")}
            <div class="admin-muted" style="font-size:12.5px;">${esc(p.purpose).slice(0, 140)}</div>
            <div class="admin-muted" style="font-size:12px;">${p.dateOfPartnership ? "Since " + esc(fmtDate(p.dateOfPartnership)) : ""}${p.partnershipPeriod ? " · " + esc(p.partnershipPeriod) : ""}</div></div>
        </div>`).join("") || '<div class="admin-card"><p class="admin-muted">No partnerships found.</p></div>'}
      </div>
      ${S.form ? formHtml() : ""}`;
    S.msg = "";

    $("#pt-new").addEventListener("click", () => { S.form = { mode: "new", data: {} }; S.logo = undefined; drawList(); });
    $("#pt-q").addEventListener("input", (e) => { S.q = e.target.value; const pos = e.target.selectionStart; drawList(); const i = $("#pt-q"); i.focus(); i.setSelectionRange(pos, pos); });
    $("#pt-cat").addEventListener("change", (e) => { S.cat = e.target.value; drawList(); });
    root.querySelectorAll("[data-open]").forEach((el) => el.addEventListener("click", () => { S.selected = el.dataset.open; drawDetail(); }));
    wireForm();
  }

  function drawDetail() {
    const p = S.list.find((x) => x.id === S.selected);
    if (!p) { drawList(); return; }
    const row = (l, v) => v ? `<p style="margin:6px 0;"><strong>${l}:</strong> ${esc(v)}</p>` : "";
    root.innerHTML = `
      <div class="admin-card">
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button id="pd-back" class="btn btn--outline">← All partnerships</button>
          <button id="pd-edit" class="btn btn--outline">Edit</button>
          <button id="pd-del" class="btn btn--outline" style="color:var(--red-700);">Delete</button>
        </div>
        ${flash()}
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:10px;">${logoImg(p, 80)}
          <div><h2 style="margin:0;">${esc(p.name)}</h2>${badge(p.category, "blue")}</div></div>
        ${row("Date of partnership", fmtDate(p.dateOfPartnership))}${row("Period", p.partnershipPeriod)}
        ${row("Purpose", p.purpose)}${row("What UAF gains", p.whatUafGains)}
        ${row("Email", p.email)}${row("Telephone", p.tel)}${row("Address", p.address)}
      </div>
      ${S.form ? formHtml() : ""}`;
    S.msg = "";
    $("#pd-back").addEventListener("click", () => { S.form = null; drawList(); });
    $("#pd-edit").addEventListener("click", () => { S.form = { mode: "edit", id: p.id, data: p }; S.logo = undefined; drawDetail(); });
    $("#pd-del").addEventListener("click", async () => {
      if (!confirm(`Delete the partnership with ${p.name}?`)) return;
      const r = await callApi("deletePartnership", { token: session.token, partnershipId: p.id });
      S.msg = r.ok ? "Partnership deleted." : (r.error || "Failed.");
      S.selected = null; render(root, session);
    });
    wireForm();
  }

  function formHtml() {
    const d = S.form.data || {};
    return `<div class="admin-card" style="margin-top:14px;max-width:700px;">
      <h3 style="margin:0 0 10px;">${S.form.mode === "edit" ? "Edit partnership" : "New partnership"}</h3>
      ${field("pf-name", "Partner name *", d.name)}
      <div class="form-field"><label for="pf-cat">Category</label>
        <select id="pf-cat" style="${INPUT}">${CATEGORIES.map((c) => `<option ${((d.category || "Collaborative Partner") === c) ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      ${field("pf-date", "Date of partnership", d.dateOfPartnership, "date")}
      ${field("pf-period", "Partnership period (e.g. 2 years)", d.partnershipPeriod)}
      ${area("pf-purpose", "Purpose", d.purpose, 3)}
      ${area("pf-gains", "What UAF gains", d.whatUafGains, 3)}
      ${field("pf-email", "Partner email", d.email, "email")}
      ${field("pf-tel", "Telephone", d.tel)}
      ${field("pf-addr", "Address", d.address)}
      <div class="form-field"><label for="pf-logo">Logo (image, max 2 MB)</label>
        <input id="pf-logo" type="file" accept="image/*" />
        ${d.logoUrl ? `<div class="admin-muted" style="margin-top:4px;">Current logo kept unless you choose a new file.</div>` : ""}</div>
      <div id="pf-error" class="admin-error is-hidden"></div>
      <div style="display:flex;gap:8px;">
        <button id="pf-save" class="btn btn--primary">Save</button>
        <button id="pf-cancel" class="btn btn--outline">Cancel</button>
      </div></div>`;
  }

  function wireForm() {
    const save = $("#pf-save");
    if (!save) return;
    $("#pf-cancel").addEventListener("click", () => { S.form = null; S.selected ? drawDetail() : drawList(); });
    save.addEventListener("click", async () => {
      const err = $("#pf-error"); err.classList.add("is-hidden");
      save.disabled = true; save.textContent = "Saving…";
      try {
        const payload = {
          token: session.token, name: $("#pf-name").value, category: $("#pf-cat").value,
          dateOfPartnership: $("#pf-date").value, partnershipPeriod: $("#pf-period").value,
          purpose: $("#pf-purpose").value, whatUafGains: $("#pf-gains").value,
          partnerEmail: $("#pf-email").value, tel: $("#pf-tel").value, address: $("#pf-addr").value
        };
        const file = $("#pf-logo").files[0];
        if (file) {
          const up = await callApi("uploadTeamFile", { token: session.token, kind: "logo", fileName: file.name, mimeType: file.type, base64Data: await T.fileToBase64(file) });
          if (!up.ok) throw new Error(up.error || "Logo upload failed.");
          payload.logoUrl = up.url;
        } else if (S.form.mode === "new") payload.logoUrl = "";
        let r;
        if (S.form.mode === "edit") { payload.partnershipId = S.form.id; r = await callApi("updatePartnership", payload); }
        else r = await callApi("createPartnership", payload);
        if (!r.ok) throw new Error(r.error || "Failed.");
        S.msg = "Partnership saved.";
        S.form = null;
        render(root, session);
        return;
      } catch (ex) { err.textContent = ex.message || "Failed."; err.classList.remove("is-hidden"); }
      save.disabled = false; save.textContent = "Save";
    });
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("partnerships", render);
})();
