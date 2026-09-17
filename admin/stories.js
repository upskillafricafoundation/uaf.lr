/* =========================================================
   UAF IMPACT — ADMIN: STORIES & EVIDENCE REQUESTS (Phase 10)
   ---------------------------------------------------------
   Administrative portal for creating and publishing field impact stories,
   and reviewing institutional evidence requests.
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  const CATEGORIES = ["Field Impact", "Re-enrollment Success", "Community Outreach", "Policy & Research", "General Update"];
  const COUNTIES = ["Montserrado", "Margibi", "Bong", "Nimba", "Grand Bassa"];

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
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch (e) {
      return isoStr;
    }
  }

  let cachedStories = [];
  let cachedEvidence = [];
  let currentTab = "stories";
  let storyFilter = "ALL";

  function renderStoriesModule(container, session) {
    container.innerHTML = `
      <div class="admin-module-header">
        <div>
          <h2>Field Stories &amp; Evidence Management</h2>
          <p class="admin-muted" style="margin-top:4px;">Publish field testimonials and process institutional evidence requests.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="stories-refresh-btn" class="btn btn--outline">Refresh</button>
        </div>
      </div>

      <div id="stories-flash"></div>

      <!-- View Switcher Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px;">
        <button id="tab-stories-btn" class="admin-filter-btn is-active">Field Stories &amp; News (<span id="count-stories-total">0</span>)</button>
        <button id="tab-evidence-btn" class="admin-filter-btn">Evidence Requests (<span id="count-evidence-total">0</span>)</button>
      </div>

      <!-- Stories View -->
      <div id="view-stories">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <div class="admin-filter-bar" style="margin-bottom:0;">
            <button class="admin-filter-btn is-active" data-story-filter="ALL">All Stories</button>
            <button class="admin-filter-btn" data-story-filter="PUBLISHED">Published</button>
            <button class="admin-filter-btn" data-story-filter="DRAFT">Draft</button>
            <button class="admin-filter-btn" data-story-filter="ARCHIVED">Archived</button>
          </div>
          <button id="create-story-btn" class="btn btn--primary">+ New Field Story</button>
        </div>

        <div class="admin-table-wrap">
          <div id="stories-table-container">
            <p class="admin-muted" style="padding:24px;text-align:center;">Loading stories…</p>
          </div>
        </div>
      </div>

      <!-- Evidence View -->
      <div id="view-evidence" class="is-hidden">
        <div class="admin-table-wrap">
          <div id="evidence-table-container">
            <p class="admin-muted" style="padding:24px;text-align:center;">Loading evidence requests…</p>
          </div>
        </div>
      </div>

      <!-- Create Story Modal -->
      <div id="story-modal" class="admin-modal-overlay is-hidden">
        <div class="admin-modal" style="max-width:560px;">
          <h3>Create Field Story</h3>
          <form id="story-form">
            <div class="form-field">
              <label for="story-title">Title</label>
              <input type="text" id="story-title" required maxlength="150" placeholder="e.g. 24 Children Re-enrolled in West Point" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-field">
                <label for="story-category">Category</label>
                <select id="story-category">
                  ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
                </select>
              </div>
              <div class="form-field">
                <label for="story-county">County</label>
                <select id="story-county">
                  <option value="">(Select county)</option>
                  ${COUNTIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
                </select>
              </div>
              <div class="form-field">
                <label for="story-community">Community</label>
                <input type="text" id="story-community" placeholder="e.g. West Point" />
              </div>
              <div class="form-field">
                <label for="story-date">Date</label>
                <input type="date" id="story-date" value="${new Date().toISOString().slice(0, 10)}" />
              </div>
            </div>
            <div class="form-field">
              <label for="story-summary">Summary (Short excerpt for cards)</label>
              <textarea id="story-summary" rows="2" maxlength="250" placeholder="Brief 1-2 sentence overview..."></textarea>
            </div>
            <div class="form-field">
              <label for="story-content">Full Story Content</label>
              <textarea id="story-content" rows="6" required placeholder="Write the story here..."></textarea>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
              <button type="button" id="story-modal-cancel" class="btn btn--outline">Cancel</button>
              <button type="submit" class="btn btn--primary">Save as Draft</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById("stories-refresh-btn").addEventListener("click", () => {
      loadStories(session);
      loadEvidence(session);
    });

    const tabStoriesBtn = document.getElementById("tab-stories-btn");
    const tabEvidenceBtn = document.getElementById("tab-evidence-btn");
    const viewStories = document.getElementById("view-stories");
    const viewEvidence = document.getElementById("view-evidence");

    tabStoriesBtn.addEventListener("click", () => {
      tabStoriesBtn.classList.add("is-active");
      tabEvidenceBtn.classList.remove("is-active");
      viewStories.classList.remove("is-hidden");
      viewEvidence.classList.add("is-hidden");
      currentTab = "stories";
    });

    tabEvidenceBtn.addEventListener("click", () => {
      tabEvidenceBtn.classList.add("is-active");
      tabStoriesBtn.classList.remove("is-active");
      viewEvidence.classList.remove("is-hidden");
      viewStories.classList.add("is-hidden");
      currentTab = "evidence";
      if (!cachedEvidence.length) loadEvidence(session);
    });

    container.querySelectorAll("button[data-story-filter]").forEach((b) => {
      b.addEventListener("click", () => {
        container.querySelectorAll("button[data-story-filter]").forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        storyFilter = b.dataset.storyFilter;
        renderStoriesTable(session);
      });
    });

    // Story Modal
    const modal = document.getElementById("story-modal");
    document.getElementById("create-story-btn").addEventListener("click", () => {
      document.getElementById("story-form").reset();
      document.getElementById("story-date").value = new Date().toISOString().slice(0, 10);
      modal.classList.remove("is-hidden");
    });
    document.getElementById("story-modal-cancel").addEventListener("click", () => {
      modal.classList.add("is-hidden");
    });
    document.getElementById("story-form").addEventListener("submit", (e) => handleCreateStory(e, session));

    loadStories(session);
  }

  function flash(message, kind) {
    const el = document.getElementById("stories-flash");
    if (!el) return;
    el.innerHTML = `<div class="admin-error" style="${kind === "success" ? "background:var(--green-050);color:var(--green-700);" : ""}">${escapeHtml(message)}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ""; }, 5000);
  }

  async function loadStories(session) {
    const container = document.getElementById("stories-table-container");
    if (!container) return;
    container.innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading stories…</p>';

    try {
      const res = await callApi("listStories", { token: session.token });
      if (!res.ok) {
        container.innerHTML = `<div class="admin-error" style="margin:16px;">${escapeHtml(res.error || "Failed to load stories.")}</div>`;
        return;
      }

      cachedStories = res.stories || [];
      const elCount = document.getElementById("count-stories-total");
      if (elCount) elCount.textContent = cachedStories.length;
      renderStoriesTable(session);
    } catch (err) {
      container.innerHTML = '<div class="admin-error" style="margin:16px;">Error connecting to server.</div>';
    }
  }

  function renderStoriesTable(session) {
    const container = document.getElementById("stories-table-container");
    if (!container) return;

    let items = cachedStories.slice();
    if (storyFilter !== "ALL") {
      items = items.filter((s) => String(s.status || "DRAFT").toUpperCase() === storyFilter);
    }

    if (items.length === 0) {
      container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No stories in this view.</p>';
      return;
    }

    const rows = items.map((s) => {
      const st = String(s.status || "DRAFT").toUpperCase();
      let badgeCls = "admin-badge--pending";
      if (st === "PUBLISHED") badgeCls = "admin-badge--verified";
      else if (st === "ARCHIVED") badgeCls = "admin-badge--failed";

      let actionsHtml = "";
      if (st === "DRAFT" || st === "UNDER_REVIEW") {
        actionsHtml = `
          <button class="btn--verify" data-story-action="PUBLISHED" data-id="${s.storyId}">Publish</button>
        `;
      } else if (st === "PUBLISHED") {
        actionsHtml = `
          <button class="btn btn--outline" style="padding:4px 8px;font-size:11.5px;" data-story-action="ARCHIVED" data-id="${s.storyId}">Archive</button>
        `;
      } else {
        actionsHtml = `
          <button class="btn btn--outline" style="padding:4px 8px;font-size:11.5px;" data-story-action="DRAFT" data-id="${s.storyId}">Restore</button>
        `;
      }

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${escapeHtml(s.title)}</div>
            <div style="font-size:11px;color:var(--ink-500);">${escapeHtml(s.category)} · ${escapeHtml(s.county || "Liberia")}</div>
          </td>
          <td>${formatDate(s.storyDate)}</td>
          <td><span class="admin-badge ${badgeCls}">${escapeHtml(st)}</span></td>
          <td><span style="font-size:12px;color:var(--ink-500);">${escapeHtml(s.createdBy || "Admin")}</span></td>
          <td>${actionsHtml}</td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Title / Category</th>
            <th>Date</th>
            <th>Status</th>
            <th>Author</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    container.querySelectorAll("button[data-story-action]").forEach((b) => {
      b.addEventListener("click", () => handleUpdateStory(b.dataset.id, b.dataset.storyAction, session));
    });
  }

  async function handleCreateStory(e, session) {
    e.preventDefault();
    const modal = document.getElementById("story-modal");

    const payload = {
      token: session.token,
      title: document.getElementById("story-title").value.trim(),
      category: document.getElementById("story-category").value,
      county: document.getElementById("story-county").value,
      community: document.getElementById("story-community").value.trim(),
      storyDate: document.getElementById("story-date").value,
      summary: document.getElementById("story-summary").value.trim(),
      content: document.getElementById("story-content").value.trim()
    };

    try {
      const res = await callApi("createStory", payload);
      if (res.ok) {
        modal.classList.add("is-hidden");
        flash(res.message || "Story created as draft.", "success");
        loadStories(session);
      } else {
        flash(res.error || "Failed to create story.");
      }
    } catch (err) {
      flash("Connection error.");
    }
  }

  async function handleUpdateStory(storyId, newStatus, session) {
    try {
      const res = await callApi("updateStoryStatus", {
        token: session.token,
        storyId: storyId,
        status: newStatus
      });

      if (res.ok) {
        flash(res.message || "Status updated.", "success");
        loadStories(session);
      } else {
        flash(res.error || "Failed to update story status.");
      }
    } catch (err) {
      flash("Connection error.");
    }
  }

  async function loadEvidence(session) {
    const container = document.getElementById("evidence-table-container");
    if (!container) return;
    container.innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading evidence requests…</p>';

    try {
      const res = await callApi("listEvidenceRequests", { token: session.token });
      if (!res.ok) {
        container.innerHTML = `<div class="admin-error" style="margin:16px;">${escapeHtml(res.error || "Failed to load requests.")}</div>`;
        return;
      }

      cachedEvidence = res.requests || [];
      const elCount = document.getElementById("count-evidence-total");
      if (elCount) elCount.textContent = cachedEvidence.length;

      if (!cachedEvidence.length) {
        container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No data or evidence requests logged yet.</p>';
        return;
      }

      const rows = cachedEvidence.map((r) => `
        <tr>
          <td>
            <div style="font-weight:600;">${escapeHtml(r.requesterName)}</div>
            <div style="font-size:11px;color:var(--ink-500);">${escapeHtml(r.organization || "Independent")} · ${escapeHtml(r.email)}</div>
          </td>
          <td style="max-width:280px;white-space:normal;font-size:12px;">${escapeHtml(r.requestDetails)}</td>
          <td><span class="admin-badge admin-badge--pending">${escapeHtml(r.status)}</span></td>
          <td>${formatDate(r.createdAt)}</td>
          <td>
            <button class="btn btn--outline" style="padding:4px 8px;font-size:11.5px;" data-evidence-id="${r.requestId}">Update</button>
          </td>
        </tr>
      `).join("");

      container.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Requester / Org</th>
              <th>Request Details</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;

      container.querySelectorAll("button[data-evidence-id]").forEach((b) => {
        b.addEventListener("click", () => handleUpdateEvidence(b.dataset.evidenceId, session));
      });
    } catch (e) {
      container.innerHTML = '<div class="admin-error" style="margin:16px;">Connection error.</div>';
    }
  }

  async function handleUpdateEvidence(requestId, session) {
    const statuses = ["UNDER_REVIEW", "APPROVED", "FULFILLED", "REJECTED", "CLOSED"];
    const st = window.prompt(`Enter new status (${statuses.join(", ")}):`, "APPROVED");
    if (!st) return;

    const notes = window.prompt("Enter review notes or fulfillment link:", "Datasets provided securely via email");

    try {
      const res = await callApi("updateEvidenceRequest", {
        token: session.token,
        requestId: requestId,
        status: st.trim().toUpperCase(),
        reviewerNotes: notes ? notes.trim() : ""
      });

      if (res.ok) {
        flash(res.message || "Evidence request updated.", "success");
        loadEvidence(session);
      } else {
        flash(res.error || "Failed to update evidence request.");
      }
    } catch (err) {
      flash("Connection error.");
    }
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("stories", renderStoriesModule);
})();
