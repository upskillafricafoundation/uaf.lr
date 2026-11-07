/* =========================================================
   UAF IMPACT — ADMIN: TASKS  (NEW FILE)
   New menu item "Tasks" (data-module="tasks").
   Assigning a task emails the assignee immediately; the built-in
   daily trigger sends automatic reminders afterwards.
   Needs: team-common.js
   ========================================================= */
(() => {
  "use strict";
  const T = window.__uafTeam;
  if (!T) return;
  const { callApi, esc, fmtDate, field, area, badge, INPUT, SMALL_BTN } = T;

  const S = { tasks: [], assignees: [], canManage: false, me: "", today: "", filter: "open", form: null, msg: "", err: "" };
  let root = null, session = null;
  const $ = (s) => root.querySelector(s);

  async function render(container, sess) {
    root = container; session = sess;
    root.innerHTML = '<div class="admin-card"><p class="admin-muted">Loading tasks…</p></div>';
    const r = await callApi("listTasks", { token: session.token });
    if (!r.ok) { root.innerHTML = `<div class="admin-card"><h2>Tasks</h2><p class="admin-error">${esc(r.error || "Could not load.")}</p></div>`; return; }
    S.tasks = r.tasks; S.canManage = r.canManage; S.me = r.me; S.today = r.today;
    if (S.canManage && !S.assignees.length) {
      const a = await callApi("listTaskAssignees", { token: session.token });
      if (a.ok) S.assignees = a.assignees;
    }
    draw();
  }

  function statusBadge(t) {
    if (t.status === "Completed") return badge("Completed", "green");
    if (t.status === "Cancelled") return badge("Cancelled", "grey");
    if (t.overdue) return badge("Overdue", "red");
    return badge(t.status, t.status === "In Progress" ? "blue" : "amber");
  }

  function draw() {
    const filters = [["open", "Open"], ["overdue", "Overdue"], ["Completed", "Completed"], ["Cancelled", "Cancelled"], ["all", "All"]];
    const items = S.tasks.filter((t) => {
      if (S.filter === "all") return true;
      if (S.filter === "open") return t.status !== "Completed" && t.status !== "Cancelled";
      if (S.filter === "overdue") return t.overdue;
      return t.status === S.filter;
    });

    const rows = items.map((t) => {
      const mine = t.assigneeEmail && t.assigneeEmail.toLowerCase() === S.me;
      const open = t.status !== "Completed" && t.status !== "Cancelled";
      return `<tr>
        <td><strong>${esc(t.name)}</strong>${t.description ? `<div class="admin-muted" style="font-size:12px;">${esc(t.description).slice(0, 120)}</div>` : ""}${t.location ? `<div class="admin-muted" style="font-size:12px;">📍 ${esc(t.location)}</div>` : ""}</td>
        <td>${esc(t.assignedTo || "—")}<div class="admin-muted" style="font-size:12px;">${esc(t.assigneeEmail)}</div></td>
        <td style="white-space:nowrap;">${esc(fmtDate(t.deadlineDate))}</td>
        <td>${statusBadge(t)}</td>
        <td style="white-space:nowrap;">
          ${open && (mine || S.canManage) ? `<button class="btn btn--outline" style="${SMALL_BTN}" data-act="done" data-id="${esc(t.id)}">✓ Done</button>` : ""}
          ${S.canManage ? `
            ${open ? `<button class="btn btn--outline" style="${SMALL_BTN}" data-act="remind" data-id="${esc(t.id)}">Remind</button>
            <button class="btn btn--outline" style="${SMALL_BTN}" data-act="edit" data-id="${esc(t.id)}">Edit</button>
            <button class="btn btn--outline" style="${SMALL_BTN}" data-act="cancel" data-id="${esc(t.id)}">Cancel</button>` : ""}
            <button class="btn btn--outline" style="${SMALL_BTN}color:var(--red-700);" data-act="delete" data-id="${esc(t.id)}">Delete</button>` : ""}
        </td></tr>`;
    }).join("");

    root.innerHTML = `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <h2 style="margin:0;">Tasks</h2>
          ${S.canManage ? '<button id="tk-new" class="btn btn--primary">+ Assign task</button>' : ""}
        </div>
        <p class="admin-muted">${S.canManage ? "You can see every task." : "You can see tasks assigned to you or created by you."}
          Assignees get an email when a task is assigned, then automatic reminders 3 days before, 1 day before, on the due day, and when overdue.</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
          ${filters.map((f) => `<button class="btn ${S.filter === f[0] ? "btn--primary" : "btn--outline"}" style="${SMALL_BTN}" data-filter="${f[0]}">${f[1]}</button>`).join("")}
        </div>
      </div>
      <div class="admin-card" style="margin-top:14px;">
        ${S.msg ? `<div style="padding:10px;background:var(--blue-050);border-radius:6px;margin-bottom:10px;">${esc(S.msg)}</div>` : ""}
        ${S.err ? `<div class="admin-error" style="margin-bottom:10px;">${esc(S.err)}</div>` : ""}
        ${rows ? `<div style="overflow-x:auto;"><table class="admin-table" style="width:100%;font-size:13px;">
          <thead><tr><th>Task</th><th>Assigned to</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`
               : '<p class="admin-muted">No tasks in this view.</p>'}
      </div>
      ${S.form ? formHtml() : ""}`;
    S.msg = ""; S.err = "";

    root.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => { S.filter = b.dataset.filter; draw(); }));
    const n = $("#tk-new");
    if (n) n.addEventListener("click", () => { S.form = { mode: "new", data: {} }; draw(); $("#tf-name").focus(); });
    root.querySelectorAll("button[data-act]").forEach((b) => b.addEventListener("click", () => onAction(b.dataset.act, b.dataset.id)));
    wireForm();
  }

  async function onAction(act, id) {
    const t = S.tasks.find((x) => x.id === id);
    let r;
    if (act === "edit") { S.form = { mode: "edit", id, data: t }; draw(); return; }
    if (act === "done") r = await callApi("markTaskDone", { token: session.token, taskId: id });
    if (act === "remind") {
      r = await callApi("sendTaskReminder", { token: session.token, taskId: id });
      S.msg = r.ok ? (r.message || "Reminder sent.") : ""; S.err = r.ok ? "" : (r.error || "Failed.");
      draw(); return;
    }
    if (act === "cancel") {
      const reason = prompt(`Cancel "${t.name}"? Optional reason:`);
      if (reason === null) return;
      r = await callApi("cancelTask", { token: session.token, taskId: id, reason });
    }
    if (act === "delete") {
      if (!confirm(`Permanently delete "${t.name}"?`)) return;
      r = await callApi("deleteTask", { token: session.token, taskId: id });
    }
    if (r && r.ok) { S.msg = "Done."; render(root, session); }
    else { S.err = (r && r.error) || "Failed."; draw(); }
  }

  function formHtml() {
    const d = S.form.data || {};
    const known = S.assignees.some((a) => a.email === (d.assigneeEmail || "").toLowerCase());
    const opts = S.assignees.map((a) =>
      `<option value="${esc(a.email)}" data-name="${esc(a.name)}" ${(d.assigneeEmail || "").toLowerCase() === a.email ? "selected" : ""}>${esc(a.name)} — ${esc(a.email)}</option>`).join("");
    const other = d.assigneeEmail && !known;
    return `<div class="admin-card" style="margin-top:14px;max-width:680px;">
      <h3 style="margin:0 0 10px;">${S.form.mode === "edit" ? "Edit task" : "Assign a task"}</h3>
      ${field("tf-name", "Task name *", d.name)}
      ${area("tf-desc", "Description", d.description, 3)}
      ${field("tf-date", "Deadline date *", d.deadlineDate, "date")}
      ${field("tf-loc", "Location (optional)", d.location)}
      <div class="form-field"><label for="tf-assignee">Assign to</label>
        <select id="tf-assignee" style="${INPUT}">
          <option value="">— Nobody yet —</option>${opts}
          <option value="__other" ${other ? "selected" : ""}>Someone else (type email)…</option></select></div>
      <div id="tf-other" class="${other ? "" : "is-hidden"}">
        ${field("tf-oname", "Assignee name", other ? d.assignedTo : "")}
        ${field("tf-oemail", "Assignee email", other ? d.assigneeEmail : "", "email")}
      </div>
      ${S.form.mode === "edit" ? `<div class="form-field"><label for="tf-status">Status</label>
        <select id="tf-status" style="${INPUT}">${["Upcoming", "In Progress", "Completed", "Cancelled"].map((s) => `<option ${d.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>` : ""}
      <p class="admin-muted">The assignee receives an email as soon as you save.</p>
      <div id="tf-error" class="admin-error is-hidden"></div>
      <div style="display:flex;gap:8px;">
        <button id="tf-save" class="btn btn--primary">${S.form.mode === "edit" ? "Save changes" : "Assign task"}</button>
        <button id="tf-cancel" class="btn btn--outline">Cancel</button>
      </div></div>`;
  }

  function wireForm() {
    const save = $("#tf-save");
    if (!save) return;
    const sel = $("#tf-assignee");
    sel.addEventListener("change", () => $("#tf-other").classList.toggle("is-hidden", sel.value !== "__other"));
    $("#tf-cancel").addEventListener("click", () => { S.form = null; draw(); });

    save.addEventListener("click", async () => {
      const err = $("#tf-error"); err.classList.add("is-hidden");
      let assigneeEmail = "", assignedTo = "";
      if (sel.value === "__other") { assigneeEmail = $("#tf-oemail").value.trim(); assignedTo = $("#tf-oname").value.trim(); }
      else if (sel.value) { assigneeEmail = sel.value; assignedTo = sel.options[sel.selectedIndex].dataset.name || ""; }

      const payload = {
        token: session.token, name: $("#tf-name").value, description: $("#tf-desc").value,
        deadlineDate: $("#tf-date").value, location: $("#tf-loc").value, assigneeEmail, assignedTo
      };
      save.disabled = true;
      let r;
      if (S.form.mode === "edit") { payload.taskId = S.form.id; payload.status = $("#tf-status").value; r = await callApi("updateTask", payload); }
      else r = await callApi("createTask", payload);
      if (!r.ok) { err.textContent = r.error || "Failed."; err.classList.remove("is-hidden"); save.disabled = false; return; }
      S.msg = "Task saved." + (r.emailSent ? " Assignment email sent." : (assigneeEmail ? " (The assignment email could not be sent.)" : ""));
      S.form = null;
      render(root, session);
    });
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("tasks", render);
})();
