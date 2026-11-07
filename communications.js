/* =========================================================
   UAF IMPACT — ADMIN: COMMUNICATIONS  (NEW FILE)
   Tabs: Inbox | Sent | Compose | Contacts
   Each tab only shows if the user holds the permission:
     VIEW_INBOX  -> Inbox, Sent
     SEND_EMAIL  -> Compose (and contact picker)
     MANAGE_CONTACTS -> Contacts
   Email text is always rendered as escaped plain text.
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  const state = {
    tab: "", mailbox: "all", page: 0, query: "",
    info: null, list: null, thread: null,
    contacts: [], contactsAll: [], editingContact: null, showContactForm: false,
    reply: null, draft: null, msg: ""
  };
  let session = null;
  let root = null;

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

  function fmt(iso) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  }

  function can(p) {
    if (String(session.role).toUpperCase() === "SUPER_ADMIN") return true;
    const perms = session.permissions || [];
    return perms.indexOf("*") !== -1 || perms.indexOf(p) !== -1;
  }

  const $ = (sel) => root.querySelector(sel);
  const body = () => $("#cm-body");
  const flash = (text, isError) => {
    const m = $("#cm-flash");
    if (!m) return;
    m.className = isError ? "admin-error" : "admin-muted";
    m.textContent = text || "";
  };

  /* ---------------- entry point ---------------- */
  async function render(container, sess) {
    session = sess;
    root = container;
    container.innerHTML = '<div class="admin-card"><p class="admin-muted">Loading communications…</p></div>';

    const info = await callApi("commsInfo", { token: session.token });
    if (!info.ok) {
      container.innerHTML = '<div class="admin-card"><h2>Communications</h2><p class="admin-error">' +
        esc(info.error || "Could not load.") + "</p></div>";
      return;
    }
    state.info = info;
    const tabs = availableTabs();
    if (!tabs.some((t) => t.key === state.tab)) state.tab = tabs.length ? tabs[0].key : "";
    shell();
  }

  function availableTabs() {
    const t = [];
    if (can("VIEW_INBOX")) { t.push({ key: "inbox", label: "Inbox" }); t.push({ key: "sent", label: "Sent" }); }
    if (can("SEND_EMAIL")) t.push({ key: "compose", label: "Compose" });
    if (can("MANAGE_CONTACTS")) t.push({ key: "contacts", label: "Contacts" });
    return t;
  }

  function shell() {
    const tabs = availableTabs();
    if (!tabs.length) {
      root.innerHTML = '<div class="admin-card"><h2>Communications</h2><p class="admin-muted">You have no communications permissions.</p></div>';
      return;
    }
    root.innerHTML = `
      <div class="admin-card">
        <h2>Communications</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">
          ${tabs.map((t) => `<button class="btn ${t.key === state.tab ? "btn--primary" : "btn--outline"}" data-tab="${t.key}">${t.label}</button>`).join("")}
        </div>
        <div id="cm-flash" class="admin-muted">${esc(state.msg)}</div>
      </div>
      <div id="cm-body" style="margin-top:14px;"></div>`;
    state.msg = "";
    root.querySelectorAll("button[data-tab]").forEach((b) => {
      b.addEventListener("click", () => {
        state.tab = b.dataset.tab;
        state.thread = null;
        state.page = 0;
        if (state.tab !== "compose") state.reply = null;
        shell();
      });
    });
    if (state.tab === "inbox" || state.tab === "sent") loadList();
    else if (state.tab === "compose") drawCompose();
    else if (state.tab === "contacts") loadContacts();
  }

  /* ---------------- inbox / sent ---------------- */
  async function loadList() {
    body().innerHTML = '<div class="admin-card"><p class="admin-muted">Loading messages…</p></div>';
    const res = await callApi("listMessages", {
      token: session.token, folder: state.tab, mailbox: state.mailbox, page: state.page, query: state.query
    });
    if (!res.ok) {
      body().innerHTML = '<div class="admin-card"><p class="admin-error">' + esc(res.error || "Could not load messages.") + "</p></div>";
      return;
    }
    state.list = res;
    drawList();
  }

  function drawList() {
    const isSent = state.tab === "sent";
    const rows = state.list.items.map((m) => `
      <tr data-thread="${esc(m.threadId)}" style="cursor:pointer;${m.unread ? "font-weight:700;" : ""}">
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(isSent ? "To: " + m.to : m.from)}</td>
        <td><span>${esc(m.subject)}</span>${m.count > 1 ? ` <span class="admin-muted">(${m.count})</span>` : ""}
            <div class="admin-muted" style="font-weight:400;font-size:12px;">${esc(m.snippet)}</div></td>
        <td style="white-space:nowrap;font-weight:400;">${esc(fmt(m.date))}</td>
      </tr>`).join("");

    body().innerHTML = `
      <div class="admin-card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
          <select id="cm-mailbox" style="padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);">
            <option value="all">All mailboxes</option>
            <option value="contact">${esc(state.info.addresses[0])}</option>
            <option value="gmail">${esc(state.info.addresses[1])}</option>
          </select>
          <input id="cm-search" placeholder="Search…" value="${esc(state.query)}" style="padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);flex:1;min-width:140px;" />
          <button id="cm-go" class="btn btn--primary">Search</button>
          <button id="cm-refresh" class="btn btn--outline">Refresh</button>
        </div>
        ${rows ? `<div style="overflow-x:auto;"><table class="admin-table" style="width:100%;font-size:13px;"><tbody>${rows}</tbody></table></div>`
               : '<p class="admin-muted">No messages found.</p>'}
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button id="cm-prev" class="btn btn--outline" ${state.page === 0 ? "disabled" : ""}>← Newer</button>
          <button id="cm-next" class="btn btn--outline" ${state.list.hasMore ? "" : "disabled"}>Older →</button>
          <span class="admin-muted" style="align-self:center;">Page ${state.page + 1}</span>
        </div>
      </div>`;

    $("#cm-mailbox").value = state.mailbox;
    $("#cm-mailbox").addEventListener("change", (e) => { state.mailbox = e.target.value; state.page = 0; loadList(); });
    const run = () => { state.query = $("#cm-search").value.trim(); state.page = 0; loadList(); };
    $("#cm-go").addEventListener("click", run);
    $("#cm-search").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
    $("#cm-refresh").addEventListener("click", loadList);
    $("#cm-prev").addEventListener("click", () => { state.page = Math.max(0, state.page - 1); loadList(); });
    $("#cm-next").addEventListener("click", () => { state.page += 1; loadList(); });
    body().querySelectorAll("tr[data-thread]").forEach((tr) => {
      tr.addEventListener("click", () => openThread(tr.dataset.thread));
    });
  }

  async function openThread(id) {
    body().innerHTML = '<div class="admin-card"><p class="admin-muted">Opening…</p></div>';
    const res = await callApi("readThread", { token: session.token, threadId: id });
    if (!res.ok) {
      body().innerHTML = '<div class="admin-card"><p class="admin-error">' + esc(res.error || "Could not open message.") + '</p><button id="cm-back" class="btn btn--outline">← Back</button></div>';
      $("#cm-back").addEventListener("click", drawList);
      return;
    }
    state.thread = { id, subject: res.subject, messages: res.messages };
    drawThread();
  }

  function drawThread() {
    const t = state.thread;
    const msgs = t.messages.map((m) => `
      <div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px;">
        <div style="font-size:13px;"><strong>${esc(m.from)}</strong>
          <span class="admin-muted"> to ${esc(m.to)}${m.cc ? " · cc " + esc(m.cc) : ""}</span></div>
        <div class="admin-muted" style="font-size:12px;margin-bottom:8px;">${esc(fmt(m.date))}</div>
        <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;margin:0;font-size:14px;">${esc(m.body)}</pre>
        ${m.attachments.length ? `<div class="admin-muted" style="margin-top:8px;font-size:12px;">Attachments (open in Gmail): ${m.attachments.map(esc).join(", ")}</div>` : ""}
      </div>`).join("");

    body().innerHTML = `
      <div class="admin-card">
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <button id="cm-back" class="btn btn--outline">← Back</button>
          ${can("SEND_EMAIL") ? '<button id="cm-reply" class="btn btn--primary">Reply</button>' : ""}
        </div>
        <h3 style="margin:0 0 12px;">${esc(t.subject)}</h3>
        ${msgs}
      </div>`;
    $("#cm-back").addEventListener("click", () => { state.thread = null; drawList(); });
    const r = $("#cm-reply");
    if (r) r.addEventListener("click", () => {
      state.reply = { threadId: t.id, subject: t.subject };
      state.tab = "compose";
      shell();
    });
  }

  /* ---------------- compose ---------------- */
  async function drawCompose() {
    if (!state.contacts.length) {
      const res = await callApi("listContacts", { token: session.token });
      if (res.ok) state.contacts = res.contacts;
    }
    const from = state.info.sendFrom;
    const rp = state.reply;

    if (!from.length) {
      body().innerHTML = `<div class="admin-card"><p class="admin-error">
        This system cannot send from ${esc(state.info.addresses.join(" or "))} yet.
        Add the address as a "Send mail as" alias in the Gmail account that owns this script.</p></div>`;
      return;
    }

    const picker = state.contacts.filter((c) => c.email).map((c) =>
      `<option value="${esc(c.email)}">${esc(c.name)}${c.organization ? " (" + esc(c.organization) + ")" : ""} — ${esc(c.email)}</option>`).join("");

    body().innerHTML = `
      <div class="admin-card" style="max-width:720px;">
        <h3 style="margin:0 0 10px;">${rp ? "Reply: " + esc(rp.subject) : "New email"}</h3>
        <div class="form-field"><label>From</label>
          <select id="cp-from" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);">
            ${from.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join("")}</select></div>
        ${rp ? '<p class="admin-muted">This reply goes to the sender of the original message.</p>' : `
        <div class="form-field"><label>To (separate several with commas)</label>
          <input id="cp-to" value="${esc(state.draft ? state.draft.to : "")}" /></div>
        ${picker ? `<div style="display:flex;gap:8px;margin-bottom:12px;">
          <select id="cp-picker" style="flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);">
            <option value="">Pick from contacts…</option>${picker}</select>
          <button id="cp-add" class="btn btn--outline" type="button">Add</button></div>` : ""}`}
        <div class="form-field"><label>Cc (optional)</label><input id="cp-cc" /></div>
        ${rp ? "" : `<div class="form-field"><label>Subject</label><input id="cp-subject" value="${esc(state.draft ? state.draft.subject : "")}" /></div>`}
        <div class="form-field"><label>Message</label>
          <textarea id="cp-body" rows="10" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-family:inherit;">${esc(state.draft ? state.draft.body : "")}</textarea></div>
        <div id="cp-error" class="admin-error is-hidden"></div>
        <div style="display:flex;gap:8px;">
          <button id="cp-send" class="btn btn--primary">Send</button>
          ${rp ? '<button id="cp-cancel" class="btn btn--outline">Cancel reply</button>' : ""}
        </div>
        <p class="admin-muted" style="font-size:12px;margin-top:8px;">Daily email quota remaining: ${esc(state.info.quotaRemaining)}</p>
      </div>`;

    const add = $("#cp-add");
    if (add) add.addEventListener("click", () => {
      const v = $("#cp-picker").value;
      if (!v) return;
      const to = $("#cp-to");
      const list = to.value.split(/[,;\s]+/).filter(Boolean);
      if (list.indexOf(v) === -1) list.push(v);
      to.value = list.join(", ");
      $("#cp-picker").value = "";
    });

    const cancel = $("#cp-cancel");
    if (cancel) cancel.addEventListener("click", () => { state.reply = null; drawCompose(); });

    $("#cp-send").addEventListener("click", async (e) => {
      const btn = e.target;
      const err = $("#cp-error");
      err.classList.add("is-hidden");
      const payload = {
        token: session.token,
        from: $("#cp-from").value,
        cc: $("#cp-cc").value,
        body: $("#cp-body").value
      };
      if (rp) payload.threadId = rp.threadId;
      else { payload.to = $("#cp-to").value; payload.subject = $("#cp-subject").value; }

      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        const res = await callApi("sendEmail", payload);
        if (res.ok) {
          state.reply = null;
          state.draft = null;
          state.msg = "Email sent.";
          state.tab = "sent";
          state.page = 0;
          shell();
          return;
        }
        err.textContent = res.error || "Could not send.";
        err.classList.remove("is-hidden");
      } catch (ex) {
        err.textContent = "Couldn't reach the server.";
        err.classList.remove("is-hidden");
      }
      btn.disabled = false;
      btn.textContent = "Send";
    });
  }

  /* ---------------- contacts ---------------- */
  async function loadContacts() {
    body().innerHTML = '<div class="admin-card"><p class="admin-muted">Loading contacts…</p></div>';
    const res = await callApi("listContacts", { token: session.token, includeDisabled: true });
    if (!res.ok) {
      body().innerHTML = '<div class="admin-card"><p class="admin-error">' + esc(res.error || "Could not load contacts.") + "</p></div>";
      return;
    }
    state.contactsAll = res.contacts;
    drawContacts();
  }

  function drawContacts() {
    const editing = state.contactsAll.find((c) => c.contactId === state.editingContact);
    const rows = state.contactsAll.map((c) => `
      <tr style="${c.status !== "ACTIVE" ? "opacity:.55;" : ""}">
        <td><strong>${esc(c.name)}</strong></td>
        <td>${esc(c.organization)}</td>
        <td>${esc(c.email)}</td>
        <td>${esc(c.phone)}</td>
        <td>${c.status === "ACTIVE" ? "Active" : "Disabled"}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn--outline" style="padding:4px 8px;font-size:12px;" data-act="edit" data-id="${esc(c.contactId)}">Edit</button>
          <button class="btn btn--outline" style="padding:4px 8px;font-size:12px;" data-act="toggle" data-id="${esc(c.contactId)}">${c.status === "ACTIVE" ? "Disable" : "Enable"}</button>
          <button class="btn btn--outline" style="padding:4px 8px;font-size:12px;color:var(--red-700);" data-act="delete" data-id="${esc(c.contactId)}">Delete</button>
        </td>
      </tr>`).join("");

    body().innerHTML = `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;">Contacts (${state.contactsAll.length})</h3>
          <button id="ct-new" class="btn btn--primary">+ Add contact</button>
        </div>
        ${rows ? `<div style="overflow-x:auto;"><table class="admin-table" style="width:100%;font-size:13px;">
          <thead><tr><th>Name</th><th>Organization</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody></table></div>` : '<p class="admin-muted">No contacts yet.</p>'}
      </div>
      ${state.showContactForm || editing ? `
      <div class="admin-card" style="margin-top:14px;max-width:560px;">
        <h3 style="margin:0 0 10px;">${editing ? "Edit contact" : "New contact"}</h3>
        <div class="form-field"><label>Name</label><input id="ct-name" value="${editing ? esc(editing.name) : ""}" /></div>
        <div class="form-field"><label>Organization</label><input id="ct-org" value="${editing ? esc(editing.organization) : ""}" /></div>
        <div class="form-field"><label>Email</label><input id="ct-email" type="email" value="${editing ? esc(editing.email) : ""}" /></div>
        <div class="form-field"><label>Phone</label><input id="ct-phone" value="${editing ? esc(editing.phone) : ""}" /></div>
        <div id="ct-error" class="admin-error is-hidden"></div>
        <div style="display:flex;gap:8px;">
          <button id="ct-save" class="btn btn--primary">${editing ? "Save changes" : "Add contact"}</button>
          <button id="ct-cancel" class="btn btn--outline">Cancel</button>
        </div>
      </div>` : ""}`;

    $("#ct-new").addEventListener("click", () => { state.editingContact = null; state.showContactForm = true; drawContacts(); });

    const cancel = $("#ct-cancel");
    if (cancel) cancel.addEventListener("click", () => { state.editingContact = null; state.showContactForm = false; drawContacts(); });

    const save = $("#ct-save");
    if (save) save.addEventListener("click", async () => {
      const err = $("#ct-error");
      err.classList.add("is-hidden");
      const payload = {
        token: session.token,
        name: $("#ct-name").value,
        organization: $("#ct-org").value,
        email: $("#ct-email").value,
        phone: $("#ct-phone").value
      };
      let res;
      if (state.editingContact) { payload.contactId = state.editingContact; res = await callApi("updateContact", payload); }
      else res = await callApi("createContact", payload);
      if (!res.ok) { err.textContent = res.error || "Failed."; err.classList.remove("is-hidden"); return; }
      state.msg = state.editingContact ? "Contact updated." : "Contact added.";
      state.editingContact = null;
      state.showContactForm = false;
      state.contacts = []; // refresh compose picker next time
      shell();
    });

    body().querySelectorAll("button[data-act]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = b.dataset.id;
        const c = state.contactsAll.find((x) => x.contactId === id);
        if (b.dataset.act === "edit") { state.editingContact = id; state.showContactForm = true; drawContacts(); return; }
        let res;
        if (b.dataset.act === "toggle") {
          res = await callApi("updateContact", { token: session.token, contactId: id, status: c.status === "ACTIVE" ? "DISABLED" : "ACTIVE" });
        } else {
          if (!confirm("Permanently delete " + c.name + "?")) return;
          res = await callApi("deleteContact", { token: session.token, contactId: id });
        }
        state.msg = res.ok ? "Done." : (res.error || "Failed.");
        state.contacts = [];
        shell();
      });
    });
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("communications", render);
})();
