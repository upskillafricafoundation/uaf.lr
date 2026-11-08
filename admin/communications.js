/* =========================================================
   UAF IMPACT — ADMIN: COMMUNICATIONS  (NEW FILE - VERSION 2, REPLACES THE FIRST)
   Tabs: Inbox | Sent | Compose | Scheduled | Contacts
     VIEW_INBOX      -> Inbox, Sent, Scheduled (list)
     SEND_EMAIL      -> Compose (send now / schedule / reply / attachment)
     MANAGE_CONTACTS -> Contacts
   Email text is always shown as escaped plain text.
   Needs: team-common.js
   ========================================================= */
(() => {
  "use strict";
  const T = window.__uafTeam;
  if (!T) return;
  const { callApi, esc, can, fmtDateTime, field, area, badge, INPUT, SMALL_BTN } = T;

  const CATEGORIES = ["Individual", "Organization", "School", "Government", "Donor", "Media", "Partner", "Other"];

  const S = {
    tab: "", mailbox: "all", page: 0, query: "", sentView: "log",
    info: null, list: null, thread: null, sentLog: [], scheduled: [],
    contacts: [], allContacts: [], contactForm: null, contactQ: "", contactCat: "",
    picked: {}, reply: null, draft: {}, msg: ""
  };
  let root = null, session = null;
  const $ = (s) => root.querySelector(s);
  const body = () => $("#cm-body");

  function tabs() {
    const t = [];
    if (can(session, "VIEW_INBOX")) { t.push(["inbox", "Inbox"], ["sent", "Sent"]); }
    if (can(session, "SEND_EMAIL")) t.push(["compose", "Compose"]);
    if (can(session, "VIEW_INBOX") || can(session, "SEND_EMAIL")) t.push(["scheduled", "Scheduled"]);
    if (can(session, "MANAGE_CONTACTS")) t.push(["contacts", "Contacts"]);
    return t;
  }

  async function render(container, sess) {
    root = container; session = sess;
    root.innerHTML = '<div class="admin-card"><p class="admin-muted">Loading communications…</p></div>';
    const info = await callApi("commsInfo", { token: session.token });
    if (!info.ok) { root.innerHTML = `<div class="admin-card"><h2>Communications</h2><p class="admin-error">${esc(info.error || "Could not load.")}</p></div>`; return; }
    S.info = info;
    const t = tabs();
    if (!t.some((x) => x[0] === S.tab)) S.tab = t.length ? t[0][0] : "";
    shell();
  }

  function shell() {
    const t = tabs();
    if (!t.length) { root.innerHTML = '<div class="admin-card"><h2>Communications</h2><p class="admin-muted">You have no communications permissions.</p></div>'; return; }
    root.innerHTML = `
      <div class="admin-card">
        <h2>Communications</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">
          ${t.map((x) => `<button class="btn ${x[0] === S.tab ? "btn--primary" : "btn--outline"}" data-tab="${x[0]}">${x[1]}</button>`).join("")}
        </div>
        <div id="cm-flash" class="${S.msg ? "" : "admin-muted"}" style="${S.msg ? "padding:8px 10px;background:var(--blue-050);border-radius:6px;" : ""}">${esc(S.msg)}</div>
      </div>
      <div id="cm-body" style="margin-top:14px;"></div>`;
    S.msg = "";
    root.querySelectorAll("button[data-tab]").forEach((b) => b.addEventListener("click", () => {
      S.tab = b.dataset.tab; S.thread = null; S.page = 0;
      if (S.tab !== "compose") S.reply = null;
      shell();
    }));
    ({ inbox: loadList, sent: loadSent, compose: drawCompose, scheduled: loadScheduled, contacts: loadContacts })[S.tab]();
  }

  /* ================= INBOX / GMAIL SENT ================= */
  async function loadList() {
    body().innerHTML = '<div class="admin-card"><p class="admin-muted">Loading messages…</p></div>';
    const res = await callApi("listMessages", { token: session.token, folder: S.tab === "sent" ? "sent" : "inbox", mailbox: S.mailbox, page: S.page, query: S.query });
    if (!res.ok) { body().innerHTML = `<div class="admin-card"><p class="admin-error">${esc(res.error || "Could not load messages.")}</p></div>`; return; }
    S.list = res; drawList();
  }

  function drawList() {
    const isSent = S.tab === "sent";
    const rows = S.list.items.map((m) => `
      <tr data-thread="${esc(m.threadId)}" style="cursor:pointer;${m.unread ? "font-weight:700;" : ""}">
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(isSent ? "To: " + m.to : m.from)}</td>
        <td>${esc(m.subject)}${m.count > 1 ? ` <span class="admin-muted">(${m.count})</span>` : ""}
          <div class="admin-muted" style="font-weight:400;font-size:12px;">${esc(m.snippet)}</div></td>
        <td style="white-space:nowrap;font-weight:400;">${esc(fmtDateTime(m.date))}</td></tr>`).join("");
    body().innerHTML = `
      <div class="admin-card">
        ${isSent ? sentSwitch() : ""}
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
          <select id="cm-mailbox" style="${INPUT}width:auto;">
            <option value="all">All mailboxes</option>
            <option value="contact">${esc(S.info.addresses[0])}</option>
            <option value="gmail">${esc(S.info.addresses[1])}</option></select>
          <input id="cm-search" placeholder="Search…" value="${esc(S.query)}" style="${INPUT}flex:1;min-width:140px;width:auto;" />
          <button id="cm-go" class="btn btn--primary">Search</button>
          <button id="cm-refresh" class="btn btn--outline">Refresh</button>
        </div>
        ${rows ? `<div style="overflow-x:auto;"><table class="admin-table" style="width:100%;font-size:13px;"><tbody>${rows}</tbody></table></div>` : '<p class="admin-muted">No messages found.</p>'}
        <div style="display:flex;gap:8px;margin-top:10px;align-items:center;">
          <button id="cm-prev" class="btn btn--outline" ${S.page === 0 ? "disabled" : ""}>← Newer</button>
          <button id="cm-next" class="btn btn--outline" ${S.list.hasMore ? "" : "disabled"}>Older →</button>
          <span class="admin-muted">Page ${S.page + 1}</span></div>
      </div>`;
    $("#cm-mailbox").value = S.mailbox;
    $("#cm-mailbox").addEventListener("change", (e) => { S.mailbox = e.target.value; S.page = 0; loadList(); });
    const run = () => { S.query = $("#cm-search").value.trim(); S.page = 0; loadList(); };
    $("#cm-go").addEventListener("click", run);
    $("#cm-search").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
    $("#cm-refresh").addEventListener("click", loadList);
    $("#cm-prev").addEventListener("click", () => { S.page = Math.max(0, S.page - 1); loadList(); });
    $("#cm-next").addEventListener("click", () => { S.page += 1; loadList(); });
    body().querySelectorAll("tr[data-thread]").forEach((tr) => tr.addEventListener("click", () => openThread(tr.dataset.thread)));
    wireSentSwitch();
  }

  async function openThread(id) {
    body().innerHTML = '<div class="admin-card"><p class="admin-muted">Opening…</p></div>';
    const res = await callApi("readThread", { token: session.token, threadId: id });
    if (!res.ok) { body().innerHTML = `<div class="admin-card"><p class="admin-error">${esc(res.error || "Could not open.")}</p><button id="cm-back" class="btn btn--outline">← Back</button></div>`; $("#cm-back").addEventListener("click", drawList); return; }
    S.thread = { id, subject: res.subject, messages: res.messages };
    const msgs = res.messages.map((m) => `
      <div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px;">
        <div style="font-size:13px;"><strong>${esc(m.from)}</strong>
          <span class="admin-muted"> to ${esc(m.to)}${m.cc ? " · cc " + esc(m.cc) : ""}</span></div>
        <div class="admin-muted" style="font-size:12px;margin-bottom:8px;">${esc(fmtDateTime(m.date))}</div>
        <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;margin:0;font-size:14px;">${esc(m.body)}</pre>
        ${m.attachments.length ? `<div class="admin-muted" style="margin-top:8px;font-size:12px;">Attachments (open in Gmail): ${m.attachments.map(esc).join(", ")}</div>` : ""}
      </div>`).join("");
    body().innerHTML = `<div class="admin-card">
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button id="cm-back" class="btn btn--outline">← Back</button>
        ${can(session, "SEND_EMAIL") ? '<button id="cm-reply" class="btn btn--primary">Reply</button>' : ""}</div>
      <h3 style="margin:0 0 12px;">${esc(res.subject)}</h3>${msgs}</div>`;
    $("#cm-back").addEventListener("click", () => { S.thread = null; drawList(); });
    const r = $("#cm-reply");
    if (r) r.addEventListener("click", () => { S.reply = { threadId: id, subject: res.subject }; S.tab = "compose"; shell(); });
  }

  /* ================= SENT (portal log + Gmail sent) ================= */
  function sentSwitch() {
    return `<div style="display:flex;gap:6px;margin-bottom:10px;">
      <button class="btn ${S.sentView === "log" ? "btn--primary" : "btn--outline"}" style="${SMALL_BTN}" data-sv="log">Sent from this portal</button>
      <button class="btn ${S.sentView === "gmail" ? "btn--primary" : "btn--outline"}" style="${SMALL_BTN}" data-sv="gmail">Gmail Sent folder</button></div>`;
  }
  function wireSentSwitch() {
    body().querySelectorAll("[data-sv]").forEach((b) => b.addEventListener("click", () => { S.sentView = b.dataset.sv; S.page = 0; loadSent(); }));
  }

  async function loadSent() {
    if (S.sentView === "gmail") return loadList();
    body().innerHTML = '<div class="admin-card"><p class="admin-muted">Loading sent log…</p></div>';
    const r = await callApi("listSentLog", { token: session.token });
    if (!r.ok) { body().innerHTML = `<div class="admin-card"><p class="admin-error">${esc(r.error || "Could not load.")}</p></div>`; return; }
    S.sentLog = r.sent;
    body().innerHTML = `<div class="admin-card">${sentSwitch()}
      ${r.sent.length ? r.sent.map((m) => `
        <details style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;">
          <summary style="cursor:pointer;"><strong>${esc(m.subject)}</strong>
            <span class="admin-muted"> · to ${esc(m.to.slice(0, 3).join(", "))}${m.to.length > 3 ? " +" + (m.to.length - 3) + " more" : ""} · ${esc(fmtDateTime(m.timestamp))}</span></summary>
          <div class="admin-muted" style="font-size:12px;margin:8px 0;">Sent by ${esc(m.sentByName)} (${esc(m.sentByEmail)}) from ${esc(m.from)}<br>To: ${esc(m.to.join(", "))}</div>
          <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;margin:0;font-size:14px;">${esc(m.body)}</pre>
        </details>`).join("") : '<p class="admin-muted">Nothing sent from the portal yet.</p>'}</div>`;
    wireSentSwitch();
  }

  /* ================= COMPOSE ================= */
  async function drawCompose() {
    if (!S.contacts.length) {
      const r = await callApi("listContacts", { token: session.token });
      if (r.ok) S.contacts = r.contacts;
    }
    const from = S.info.sendFrom, rp = S.reply;
    if (!from.length) {
      body().innerHTML = `<div class="admin-card"><p class="admin-error">This system cannot send from ${esc(S.info.addresses.join(" or "))} yet.
        Add the address as a "Send mail as" alias in the Gmail account that owns this script.</p></div>`;
      return;
    }
    const cats = Array.from(new Set(S.contacts.map((c) => c.category))).sort();
    body().innerHTML = `
      <div class="admin-card" style="max-width:760px;">
        <h3 style="margin:0 0 10px;">${rp ? "Reply: " + esc(rp.subject) : "New email"}</h3>
        <div class="form-field"><label>From</label>
          <select id="cp-from" style="${INPUT}">${from.map((a) => `<option>${esc(a)}</option>`).join("")}</select></div>
        ${rp ? '<p class="admin-muted">This reply goes to the sender of the original message.</p>' : `
          <div class="form-field"><label>Recipients from contacts <span class="admin-muted">(each person receives their own separate email)</span></label>
            <div style="display:flex;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
              <input id="cp-cq" placeholder="Search contacts…" style="${INPUT}flex:1;min-width:140px;width:auto;" />
              <select id="cp-ccat" style="${INPUT}width:auto;"><option value="">All categories</option>${cats.map((c) => `<option>${esc(c)}</option>`).join("")}</select>
              <button id="cp-selall" class="btn btn--outline" style="${SMALL_BTN}" type="button">Select shown</button>
              <button id="cp-clear" class="btn btn--outline" style="${SMALL_BTN}" type="button">Clear</button></div>
            <div id="cp-clist" style="max-height:180px;overflow:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;"></div>
            <div id="cp-count" class="admin-muted" style="font-size:12px;margin-top:4px;"></div></div>
          ${area("cp-extra", "Other email addresses (comma separated)", S.draft.extra || "", 2)}`}
        ${rp ? "" : field("cp-subject", "Subject", S.draft.subject || "")}
        ${area("cp-body", "Message", S.draft.body || "", 9)}
        ${rp ? "" : `<div class="form-field"><label for="cp-file">Attachment (optional, max 5 MB)</label><input id="cp-file" type="file" /></div>
        <div class="form-field"><label for="cp-when">Schedule for later (optional)</label><input id="cp-when" type="datetime-local" /></div>`}
        <div id="cp-error" class="admin-error is-hidden"></div>
        <div style="display:flex;gap:8px;">
          <button id="cp-send" class="btn btn--primary">Send now</button>
          ${rp ? '<button id="cp-cancel" class="btn btn--outline">Cancel reply</button>' : '<button id="cp-sched" class="btn btn--outline">Schedule</button>'}
        </div>
        <p class="admin-muted" style="font-size:12px;margin-top:8px;">Daily email quota remaining: ${esc(S.info.quotaRemaining)}</p>
      </div>`;

    if (!rp) { renderPicker(); wirePicker(); }
    const c = $("#cp-cancel"); if (c) c.addEventListener("click", () => { S.reply = null; drawCompose(); });
    $("#cp-send").addEventListener("click", () => submit(false));
    const sc = $("#cp-sched"); if (sc) sc.addEventListener("click", () => submit(true));
  }

  function shownContacts() {
    const q = ($("#cp-cq") ? $("#cp-cq").value : "").toLowerCase(), cat = $("#cp-ccat") ? $("#cp-ccat").value : "";
    return S.contacts.filter((c) => c.email && (!cat || c.category === cat) &&
      (!q || (c.name + " " + c.institution + " " + c.email).toLowerCase().includes(q)));
  }
  function renderPicker() {
    const list = shownContacts();
    $("#cp-clist").innerHTML = list.map((c) => `<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin:3px 0;">
      <input type="checkbox" data-email="${esc(c.email)}" ${S.picked[c.email] ? "checked" : ""} />
      <span>${esc(c.name)}${c.institution ? ` <span class="admin-muted">(${esc(c.institution)})</span>` : ""} — ${esc(c.email)}</span></label>`).join("")
      || '<span class="admin-muted">No contacts with an email.</span>';
    $("#cp-clist").querySelectorAll("input[data-email]").forEach((cb) => cb.addEventListener("change", () => { S.picked[cb.dataset.email] = cb.checked; if (!cb.checked) delete S.picked[cb.dataset.email]; count(); }));
    count();
  }
  function count() { $("#cp-count").textContent = Object.keys(S.picked).length + " contact(s) selected"; }
  function wirePicker() {
    $("#cp-cq").addEventListener("input", renderPicker);
    $("#cp-ccat").addEventListener("change", renderPicker);
    $("#cp-selall").addEventListener("click", () => { shownContacts().forEach((c) => { S.picked[c.email] = true; }); renderPicker(); });
    $("#cp-clear").addEventListener("click", () => { S.picked = {}; renderPicker(); });
  }

  async function submit(schedule) {
    const err = $("#cp-error"); err.classList.add("is-hidden");
    const sendBtn = $("#cp-send"), schBtn = $("#cp-sched");
    const rp = S.reply;
    const fail = (m) => { err.textContent = m; err.classList.remove("is-hidden"); sendBtn.disabled = false; if (schBtn) schBtn.disabled = false; };
    sendBtn.disabled = true; if (schBtn) schBtn.disabled = true;
    try {
      const payload = { token: session.token, from: $("#cp-from").value, body: $("#cp-body").value };
      if (rp) payload.threadId = rp.threadId;
      else {
        const extra = $("#cp-extra").value;
        S.draft = { extra, subject: $("#cp-subject").value, body: payload.body };
        payload.to = Object.keys(S.picked).concat(extra.split(/[,;\s]+/).filter(Boolean));
        payload.subject = $("#cp-subject").value;
        const file = $("#cp-file").files[0];
        if (file) {
          const up = await callApi("uploadTeamFile", { token: session.token, kind: "attachment", fileName: file.name, mimeType: file.type, base64Data: await T.fileToBase64(file) });
          if (!up.ok) return fail(up.error || "Attachment upload failed.");
          payload.attachmentFileId = up.fileId;
        }
      }
      let res;
      if (schedule) {
        const when = $("#cp-when").value;
        if (!when) return fail("Choose the date and time to send.");
        payload.sendAt = new Date(when).toISOString();
        res = await callApi("scheduleEmail", payload);
      } else res = await callApi("sendEmail", payload);
      if (!res.ok) return fail(res.error || "Failed.");
      S.msg = schedule ? "Email scheduled." : `Email sent${res.count ? " to " + res.count + " recipient(s)" : ""}.`;
      S.reply = null; S.draft = {}; S.picked = {};
      S.tab = schedule ? "scheduled" : "sent"; S.sentView = "log";
      shell();
    } catch (ex) { fail("Couldn't reach the server."); }
  }

  /* ================= SCHEDULED ================= */
  async function loadScheduled() {
    body().innerHTML = '<div class="admin-card"><p class="admin-muted">Loading…</p></div>';
    const r = await callApi("listScheduled", { token: session.token });
    if (!r.ok) { body().innerHTML = `<div class="admin-card"><p class="admin-error">${esc(r.error || "Could not load.")}</p></div>`; return; }
    const canSend = can(session, "SEND_EMAIL");
    body().innerHTML = `<div class="admin-card">
      <p class="admin-muted">Scheduled emails are sent automatically within about 5 minutes of their time.</p>
      ${r.scheduled.length ? `<div style="overflow-x:auto;"><table class="admin-table" style="width:100%;font-size:13px;"><thead><tr><th>When</th><th>Subject</th><th>To</th><th>By</th><th>Status</th><th></th></tr></thead><tbody>
      ${r.scheduled.map((m) => `<tr><td style="white-space:nowrap;">${esc(fmtDateTime(m.scheduledFor))}</td><td>${esc(m.subject)}</td>
        <td style="max-width:200px;">${esc(m.to.slice(0, 3).join(", "))}${m.to.length > 3 ? " +" + (m.to.length - 3) : ""}</td><td>${esc(m.sentByName)}</td>
        <td>${badge(m.status.split(":")[0], m.status === "Sent" ? "green" : m.status === "Pending" ? "amber" : m.status === "Cancelled" ? "grey" : "red")}</td>
        <td>${canSend && m.status === "Pending" ? `<button class="btn btn--outline" style="${SMALL_BTN}" data-cancel="${esc(m.id)}">Cancel</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : '<p class="admin-muted">Nothing scheduled.</p>'}</div>`;
    body().querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Cancel this scheduled email?")) return;
      const x = await callApi("cancelScheduled", { token: session.token, scheduleId: b.dataset.cancel });
      S.msg = x.ok ? "Cancelled." : (x.error || "Failed.");
      shell();
    }));
  }

  /* ================= CONTACTS ================= */
  async function loadContacts() {
    body().innerHTML = '<div class="admin-card"><p class="admin-muted">Loading contacts…</p></div>';
    const r = await callApi("listContacts", { token: session.token, includeDisabled: true });
    if (!r.ok) { body().innerHTML = `<div class="admin-card"><p class="admin-error">${esc(r.error || "Could not load.")}</p></div>`; return; }
    S.allContacts = r.contacts; drawContacts();
  }

  function drawContacts() {
    const q = S.contactQ.toLowerCase();
    const items = S.allContacts.filter((c) => (!S.contactCat || c.category === S.contactCat) &&
      (!q || (c.name + " " + c.institution + " " + c.email + " " + c.phone).toLowerCase().includes(q)));
    const cats = Array.from(new Set(S.allContacts.map((c) => c.category))).sort();
    const f = S.contactForm;
    const d = f ? f.data : {};
    body().innerHTML = `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <h3 style="margin:0;">Contacts (${S.allContacts.length})</h3>
          <button id="ct-new" class="btn btn--primary">+ Add contact</button></div>
        <div style="display:flex;gap:8px;margin:10px 0;flex-wrap:wrap;">
          <input id="ct-q" placeholder="Search…" value="${esc(S.contactQ)}" style="${INPUT}flex:1;min-width:140px;width:auto;" />
          <select id="ct-cat" style="${INPUT}width:auto;"><option value="">All categories</option>${cats.map((c) => `<option ${S.contactCat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
        ${items.length ? `<div style="overflow-x:auto;"><table class="admin-table" style="width:100%;font-size:13px;">
          <thead><tr><th>Name</th><th>Category</th><th>Institution</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${items.map((c) => `<tr style="${c.active ? "" : "opacity:.55;"}"><td><strong>${esc(c.name)}</strong>${c.address ? `<div class="admin-muted" style="font-size:12px;">${esc(c.address)}</div>` : ""}</td>
            <td>${esc(c.category)}</td><td>${esc(c.institution)}</td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td>
            <td>${c.active ? badge("Active", "green") : badge("Disabled", "grey")}</td>
            <td style="white-space:nowrap;">
              <button class="btn btn--outline" style="${SMALL_BTN}" data-act="edit" data-id="${esc(c.id)}">Edit</button>
              <button class="btn btn--outline" style="${SMALL_BTN}" data-act="toggle" data-id="${esc(c.id)}">${c.active ? "Disable" : "Enable"}</button>
              <button class="btn btn--outline" style="${SMALL_BTN}color:var(--red-700);" data-act="delete" data-id="${esc(c.id)}">Delete</button></td></tr>`).join("")}
          </tbody></table></div>` : '<p class="admin-muted">No contacts found.</p>'}
      </div>
      ${f ? `<div class="admin-card" style="margin-top:14px;max-width:600px;">
        <h3 style="margin:0 0 10px;">${f.mode === "edit" ? "Edit contact" : "New contact"}</h3>
        ${field("cf-name", "Name *", d.name)}
        <div class="form-field"><label for="cf-cat">Category</label>
          <input id="cf-cat" list="cf-cats" value="${esc(d.category || "Individual")}" /><datalist id="cf-cats">${CATEGORIES.map((c) => `<option value="${c}">`).join("")}</datalist></div>
        ${field("cf-inst", "Institution / organization", d.institution)}
        ${field("cf-email", "Email", d.email, "email")}
        ${field("cf-phone", "Phone / WhatsApp", d.phone)}
        ${field("cf-addr", "Address", d.address)}
        <div id="cf-error" class="admin-error is-hidden"></div>
        <div style="display:flex;gap:8px;"><button id="cf-save" class="btn btn--primary">${f.mode === "edit" ? "Save changes" : "Add contact"}</button>
          <button id="cf-cancel" class="btn btn--outline">Cancel</button></div></div>` : ""}`;

    $("#ct-new").addEventListener("click", () => { S.contactForm = { mode: "new", data: {} }; drawContacts(); });
    $("#ct-q").addEventListener("input", (e) => { S.contactQ = e.target.value; const p = e.target.selectionStart; drawContacts(); const i = $("#ct-q"); i.focus(); i.setSelectionRange(p, p); });
    $("#ct-cat").addEventListener("change", (e) => { S.contactCat = e.target.value; drawContacts(); });
    body().querySelectorAll("button[data-act]").forEach((b) => b.addEventListener("click", () => contactAction(b.dataset.act, b.dataset.id)));
    const save = $("#cf-save");
    if (save) {
      $("#cf-cancel").addEventListener("click", () => { S.contactForm = null; drawContacts(); });
      save.addEventListener("click", async () => {
        const err = $("#cf-error"); err.classList.add("is-hidden");
        const payload = { token: session.token, name: $("#cf-name").value, category: $("#cf-cat").value, institution: $("#cf-inst").value,
          contactEmail: $("#cf-email").value, phone: $("#cf-phone").value, address: $("#cf-addr").value };
        let r;
        if (f.mode === "edit") { payload.contactId = f.id; r = await callApi("updateContact", payload); } else r = await callApi("createContact", payload);
        if (!r.ok) { err.textContent = r.error || "Failed."; err.classList.remove("is-hidden"); return; }
        S.contactForm = null; S.contacts = []; S.msg = "Contact saved."; shell();
      });
    }
  }

  async function contactAction(act, id) {
    const c = S.allContacts.find((x) => x.id === id);
    if (act === "edit") { S.contactForm = { mode: "edit", id, data: c }; drawContacts(); return; }
    let r;
    if (act === "toggle") r = await callApi("updateContact", { token: session.token, contactId: id, active: !c.active });
    if (act === "delete") {
      if (!confirm(`Permanently delete ${c.name}?`)) return;
      r = await callApi("deleteContact", { token: session.token, contactId: id });
    }
    S.contacts = []; S.msg = r && r.ok ? "Done." : ((r && r.error) || "Failed."); shell();
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("communications", render);
})();
