/* =========================================================
   UAF CAMPAIGN DRIVE — ADMIN STORIES & CAMPAIGNS (v31)
   =========================================================
   Covers:
   - Create, edit, publish, unpublish, and delete stories
   - Required funding goal (USD) for live progress calculation
   - One-Click CSV Download button
   - Direct-to-database writes to News sheet
   ========================================================= */

(() => {
  "use strict";

  let storiesList = [];
  let editingStoryId = null;

  function renderStoriesModule(container, session) {
    container.innerHTML = `
      <div class="admin-card">
        <div class="dash-welcome-row" style="margin-bottom:18px;">
          <div>
            <h2>Campaign Stories &amp; Appeals</h2>
            <p class="admin-muted">Manage community stories, set funding goals, and update campaign statuses. Saving writes directly to the News sheet.</p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="btn btn--outline" id="btn-download-stories-csv">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download CSV (1-Click)</span>
            </button>
            <button type="button" class="btn btn--primary" id="btn-open-create-story">
              <span>+ Create Story</span>
            </button>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="admin-filter-bar">
          <input type="text" id="stories-search-input" class="admin-search-input" placeholder="Search by story title, community, or Story ID..." />
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:12px;font-weight:700;color:var(--ink-600);">Status:</label>
            <select id="stories-status-filter" class="input-select" style="min-width:130px;">
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <!-- Stories Table -->
        <div class="table-scroll-wrap" style="margin-top:14px;">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Story Details</th>
                <th>Location</th>
                <th>Funding Goal</th>
                <th>Raised</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="stories-table-body">
              <tr><td colspan="7" style="text-align:center;padding:24px;color:var(--ink-400);">Loading stories...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Story Modal Editor Form -->
      <div class="story-modal-backdrop is-hidden" id="story-editor-modal" style="display:none;">
        <div class="story-modal-card" style="max-width:680px;">
          <div class="story-modal-header">
            <h3 id="story-editor-title" style="margin:0;font-size:17px;font-weight:800;">Create Campaign Story</h3>
            <button type="button" class="story-modal-close" id="btn-close-story-editor">&times;</button>
          </div>
          <div class="story-modal-body">
            <form id="story-editor-form">
              <input type="hidden" id="se-story-id" value="" />

              <div class="form-field">
                <label for="se-title">Story Title *</label>
                <input type="text" id="se-title" required placeholder="e.g. Help Blessing Return to Primary School" />
              </div>

              <div class="form-row-2">
                <div class="form-field">
                  <label for="se-goal">Funding Goal (USD $) * <small style="color:var(--teal-600);">(Required)</small></label>
                  <input type="number" id="se-goal" required min="1" step="any" placeholder="e.g. 500.00" />
                </div>
                <div class="form-field">
                  <label for="se-status">Story Status *</label>
                  <select id="se-status" class="input-select" required>
                    <option value="PUBLISHED">PUBLISHED (Visible to public)</option>
                    <option value="DRAFT">DRAFT (Saved in admin only)</option>
                    <option value="CLOSED">CLOSED (Campaign completed)</option>
                  </select>
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-field">
                  <label for="se-county">County</label>
                  <input type="text" id="se-county" placeholder="e.g. Montserrado" />
                </div>
                <div class="form-field">
                  <label for="se-community">Community / Town</label>
                  <input type="text" id="se-community" placeholder="e.g. West Point, Duport Road" />
                </div>
              </div>

              <div class="form-field">
                <label for="se-summary">Brief Lead / Summary (Shown on Card Teaser) *</label>
                <textarea id="se-summary" rows="2" required placeholder="Short 1-2 sentence overview of the case..."></textarea>
              </div>

              <div class="form-field">
                <label for="se-content">Full Story Content &amp; Case Narrative *</label>
                <textarea id="se-content" rows="6" required placeholder="Complete multi-paragraph narrative, background history, family situation, and educational roadmap..."></textarea>
              </div>

              <!-- Story Image (File Upload or URL) -->
              <div class="form-field" style="background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;margin-bottom:14px;">
                <label style="font-weight:700;">Story Image Attachment</label>
                <div style="display:flex;gap:12px;align-items:center;margin-top:6px;flex-wrap:wrap;">
                  <input type="file" id="se-img-file" accept="image/*" style="font-size:12px;" />
                  <span style="font-size:12px;color:var(--ink-400);">or Image URL:</span>
                  <input type="url" id="se-img-url" placeholder="https://..." style="flex:1;min-width:180px;" />
                </div>
                <div id="se-img-preview-wrap" style="margin-top:10px;display:none;">
                  <img id="se-img-preview" src="" alt="Thumbnail preview" style="max-height:120px;border-radius:8px;border:1px solid var(--border);" />
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-field">
                  <label for="se-speaker">Testimonial Speaker (Optional)</label>
                  <input type="text" id="se-speaker" placeholder="e.g. Marie (Mother)" />
                </div>
                <div class="form-field">
                  <label for="se-testimonial">Testimonial Quote (Optional)</label>
                  <input type="text" id="se-testimonial" placeholder="e.g. Without this scholarship, my child would remain at home..." />
                </div>
              </div>

              <div class="form-field">
                <label for="se-activities">Field Activities &amp; Interventions (Optional)</label>
                <input type="text" id="se-activities" placeholder="e.g. Tuition subsidization, uniform distribution, mother pastry training" />
              </div>

              <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                <button type="button" class="btn btn--outline" id="btn-cancel-story-editor">Cancel</button>
                <button type="submit" class="btn btn--primary" id="btn-save-story">Save Story to Database</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Load stories from backend
    loadStoriesData();

    // Event Listeners
    document.getElementById("btn-open-create-story")?.addEventListener("click", () => openStoryEditor(null));
    document.getElementById("btn-close-story-editor")?.addEventListener("click", closeStoryEditor);
    document.getElementById("btn-cancel-story-editor")?.addEventListener("click", closeStoryEditor);
    document.getElementById("stories-search-input")?.addEventListener("input", renderStoriesTable);
    document.getElementById("stories-status-filter")?.addEventListener("change", renderStoriesTable);

    // Image compression on file select
    const fileInput = document.getElementById("se-img-file");
    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      compressImage(file, 1200, 900, 0.85, (dataUrl) => {
        document.getElementById("se-img-url").value = dataUrl;
        const preview = document.getElementById("se-img-preview");
        const previewWrap = document.getElementById("se-img-preview-wrap");
        if (preview && previewWrap) {
          preview.src = dataUrl;
          previewWrap.style.display = "block";
        }
      });
    });

    document.getElementById("se-img-url")?.addEventListener("input", (e) => {
      const url = e.target.value.trim();
      const preview = document.getElementById("se-img-preview");
      const previewWrap = document.getElementById("se-img-preview-wrap");
      if (preview && previewWrap) {
        if (url) {
          preview.src = url;
          previewWrap.style.display = "block";
        } else {
          previewWrap.style.display = "none";
        }
      }
    });

    // Form submit
    document.getElementById("story-editor-form")?.addEventListener("submit", handleSaveStory);

    // Download CSV button
    document.getElementById("btn-download-stories-csv")?.addEventListener("click", () => {
      const filtered = getFilteredStories();
      window.__uafDownloadCsv(
        `UAF_Stories_Export_${new Date().toISOString().slice(0, 10)}.csv`,
        ["storyId", "title", "goal", "raised", "percent", "status", "county", "community", "summary", "createdAt"],
        filtered
      );
    });
  }

  function compressImage(file, maxW, maxH, quality, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function loadStoriesData() {
    const session = window.__uafAdminSession;
    if (!session || !session.token) return;

    try {
      const res = await window.__uafAdminCallApi("listStories", { token: session.token });
      if (res.ok && Array.isArray(res.stories)) {
        storiesList = res.stories;
        renderStoriesTable();
      }
    } catch (err) {
      console.warn("Notice loading stories:", err);
    }
  }

  function getFilteredStories() {
    const search = (document.getElementById("stories-search-input")?.value || "").toLowerCase().trim();
    const status = (document.getElementById("stories-status-filter")?.value || "ALL").toUpperCase();

    return storiesList.filter((s) => {
      if (status !== "ALL" && String(s.status).toUpperCase() !== status) return false;
      if (search) {
        const text = `${s.title} ${s.storyId} ${s.community} ${s.county} ${s.summary}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  }

  function renderStoriesTable() {
    const tbody = document.getElementById("stories-table-body");
    if (!tbody) return;

    const filtered = getFilteredStories();
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--ink-400);">No stories matching filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((s) => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${s.imageUrl || '../assets/uaf-logo.png'}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" onerror="this.src='../assets/uaf-logo.png';" />
            <div>
              <strong>${window.__uafEscapeHtml(s.title)}</strong>
              <div style="font-size:11px;color:var(--ink-400);">${window.__uafEscapeHtml(s.storyId)}</div>
            </div>
          </div>
        </td>
        <td>${window.__uafEscapeHtml(s.community ? s.community + ", " : "")}${window.__uafEscapeHtml(s.county || "Liberia")}</td>
        <td><strong>${window.__uafFormatMoney(s.goal)}</strong></td>
        <td style="color:#0284c7;font-weight:700;">${window.__uafFormatMoney(s.raised)}</td>
        <td>
          <div style="font-size:12px;font-weight:700;margin-bottom:2px;">${s.percent}%</div>
          <div style="background:#e2e8f0;height:5px;width:80px;border-radius:999px;overflow:hidden;">
            <div style="background:#0284c7;height:100%;width:${s.percent}%;"></div>
          </div>
        </td>
        <td>
          <span class="status-badge status-badge--${s.status.toLowerCase()}">${window.__uafEscapeHtml(s.status)}</span>
        </td>
        <td>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn btn--outline btn-sm btn-edit-story" data-id="${s.storyId}">Edit</button>
            <button type="button" class="btn btn--outline btn-sm btn-toggle-story" data-id="${s.storyId}" data-status="${s.status}">
              ${s.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </button>
            <button type="button" class="btn btn--outline btn-sm btn-delete-story" data-id="${s.storyId}" style="color:#b91c1c;">Delete</button>
            <button type="button" class="btn btn--outline btn-sm btn-download-single-story" data-id="${s.storyId}" title="Download story record">Rec</button>
          </div>
        </td>
      </tr>
    `).join("");

    // Attach row button events
    tbody.querySelectorAll(".btn-edit-story").forEach((btn) => {
      btn.addEventListener("click", () => openStoryEditor(btn.dataset.id));
    });

    tbody.querySelectorAll(".btn-toggle-story").forEach((btn) => {
      btn.addEventListener("click", () => toggleStoryStatus(btn.dataset.id, btn.dataset.status));
    });

    tbody.querySelectorAll(".btn-delete-story").forEach((btn) => {
      btn.addEventListener("click", () => deleteStory(btn.dataset.id));
    });

    tbody.querySelectorAll(".btn-download-single-story").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = storiesList.find((x) => x.storyId === btn.dataset.id);
        if (item) {
          window.__uafDownloadRecordReceipt(`Story_Record_${item.storyId}.txt`, item.title, item);
        }
      });
    });
  }

  function openStoryEditor(storyId) {
    editingStoryId = storyId;
    const modal = document.getElementById("story-editor-modal");
    const titleEl = document.getElementById("story-editor-title");
    const form = document.getElementById("story-editor-form");
    const preview = document.getElementById("se-img-preview");
    const previewWrap = document.getElementById("se-img-preview-wrap");

    form.reset();
    if (previewWrap) previewWrap.style.display = "none";

    if (storyId) {
      titleEl.textContent = "Edit Campaign Story";
      const s = storiesList.find((x) => x.storyId === storyId);
      if (s) {
        document.getElementById("se-story-id").value = s.storyId;
        document.getElementById("se-title").value = s.title || "";
        document.getElementById("se-goal").value = s.goal || "";
        document.getElementById("se-status").value = s.status || "PUBLISHED";
        document.getElementById("se-county").value = s.county || "";
        document.getElementById("se-community").value = s.community || "";
        document.getElementById("se-summary").value = s.summary || "";
        document.getElementById("se-content").value = s.content || s.narrative || "";
        document.getElementById("se-speaker").value = s.speaker || "";
        document.getElementById("se-testimonial").value = s.testimonial || "";
        document.getElementById("se-activities").value = s.activities || "";
        document.getElementById("se-img-url").value = s.imageUrl || "";

        if (s.imageUrl && preview && previewWrap) {
          preview.src = s.imageUrl;
          previewWrap.style.display = "block";
        }
      }
    } else {
      titleEl.textContent = "Create Campaign Story";
      document.getElementById("se-story-id").value = "";
      document.getElementById("se-status").value = "PUBLISHED";
    }

    modal.classList.remove("is-hidden");
    modal.style.display = "flex";
  }

  function closeStoryEditor() {
    const modal = document.getElementById("story-editor-modal");
    if (modal) {
      modal.classList.add("is-hidden");
      modal.style.display = "none";
    }
  }

  async function handleSaveStory(e) {
    e.preventDefault();
    const session = window.__uafAdminSession;
    const saveBtn = document.getElementById("btn-save-story");

    const storyId = document.getElementById("se-story-id")?.value;
    const goal = Number(document.getElementById("se-goal")?.value);

    if (isNaN(goal) || goal <= 0) {
      alert("Please specify a valid funding goal amount greater than 0.");
      return;
    }

    const payload = {
      token: session.token,
      storyId: storyId || undefined,
      title: document.getElementById("se-title")?.value.trim(),
      goal: goal,
      status: document.getElementById("se-status")?.value,
      county: document.getElementById("se-county")?.value.trim(),
      community: document.getElementById("se-community")?.value.trim(),
      summary: document.getElementById("se-summary")?.value.trim(),
      content: document.getElementById("se-content")?.value.trim(),
      imageUrl: document.getElementById("se-img-url")?.value.trim(),
      speaker: document.getElementById("se-speaker")?.value.trim(),
      testimonial: document.getElementById("se-testimonial")?.value.trim(),
      activities: document.getElementById("se-activities")?.value.trim()
    };

    saveBtn.setAttribute("disabled", "true");
    saveBtn.textContent = "Saving to Database...";

    try {
      const action = storyId ? "updateStory" : "createStory";
      const res = await window.__uafAdminCallApi(action, payload);
      if (res.ok) {
        alert(res.message || "Story saved successfully!");
        closeStoryEditor();
        loadStoriesData();
      } else {
        alert(res.error || "Save failed.");
      }
    } catch (_) {
      alert("Connection error while saving story.");
    } finally {
      saveBtn.removeAttribute("disabled");
      saveBtn.textContent = "Save Story to Database";
    }
  }

  async function toggleStoryStatus(storyId, currentStatus) {
    const session = window.__uafAdminSession;
    const newStatus = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await window.__uafAdminCallApi("updateStoryStatus", {
        token: session.token,
        storyId: storyId,
        status: newStatus
      });
      if (res.ok) {
        loadStoriesData();
      } else {
        alert(res.error || "Status update failed.");
      }
    } catch (_) {
      alert("Connection notice: Could not update status.");
    }
  }

  async function deleteStory(storyId) {
    if (!confirm(`Are you sure you want to permanently delete story ${storyId}? This action cannot be undone.`)) {
      return;
    }
    const session = window.__uafAdminSession;
    try {
      const res = await window.__uafAdminCallApi("deleteStory", { token: session.token, storyId });
      if (res.ok) {
        alert("Story deleted successfully.");
        loadStoriesData();
      } else {
        alert(res.error || "Could not delete story.");
      }
    } catch (_) {
      alert("Error deleting story.");
    }
  }

  // Register with Admin Module Switcher
  window.__uafRegisterAdminModule("stories", renderStoriesModule);
})();
