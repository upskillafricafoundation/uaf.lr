/* =========================================================
   UAF IMPACT — ADMIN: MEDIA REVIEW MODULE (Phase 7)
   ---------------------------------------------------------
   Registers itself with admin.js's module registry (see the
   Phase 7 addition at the bottom of admin.js) and renders into
   #admin-module-panel when "Media Review" is clicked. Does not
   touch admin.js's login/session logic — only reads
   window.__uafAdminSession, which Phase 6 already exposes.

   Client-side permission checks below are UX ONLY (hide/disable
   buttons that would fail) — Config.gs's ROLE_PERMISSIONS on the
   server is what actually enforces every action via requireAuth_.
   Keep this mirror in sync with Config.gs's ROLE_PERMISSIONS
   whenever a Media permission changes there.
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  // Mirrors Config.gs ROLE_PERMISSIONS for MANAGE_MEDIA / APPROVE_MEDIA /
  // PUBLISH_MEDIA only — UX convenience, not authoritative.
  const ROLE_CAN = {
    MANAGE_MEDIA: ["ADMIN", "PROGRAM_MANAGER"],
    APPROVE_MEDIA: ["ADMIN"],
    PUBLISH_MEDIA: ["ADMIN"]
  };
  function can(permission, role) {
    if (role === "SUPER_ADMIN") return true;
    return (ROLE_CAN[permission] || []).indexOf(role) !== -1;
  }

  const COUNTIES = ["Montserrado", "Margibi", "Bong", "Nimba", "Grand Bassa"];
  const CATEGORIES = ["Field Visit", "Re-enrollment", "Community Outreach", "Training / Workshop", "Program Activity", "Other"];

  const STATUS_GROUPS = [
    { key: "DRAFT", label: "Draft" },
    { key: "UNDER_REVIEW", label: "Under Review" },
    { key: "APPROVED", label: "Approved" },
    { key: "PUBLISHED", label: "Published" },
    { key: "ARCHIVED", label: "Archived" }
  ];

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

  /* ---------------------------------------------------------
     ENTRY POINT
  --------------------------------------------------------- */
  function renderMediaModule(container, session) {
    container.innerHTML = `
      <div class="admin-module-header">
        <h2>Media Review</h2>
      </div>
      <div id="media-flash"></div>

      <div class="admin-card">
        <h3 style="font-size:15px;">Upload a photo</h3>
        <form id="media-upload-form">
          <div class="media-upload-grid">
            <div class="form-field">
              <label for="media-title">Title</label>
              <input type="text" id="media-title" required maxlength="120" />
            </div>
            <div class="form-field">
              <label for="media-category">Category</label>
              <select id="media-category">
                <option value="">Select a category</option>
                ${CATEGORIES.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}
              </select>
            </div>
            <div class="form-field">
              <label for="media-county">County</label>
              <select id="media-county">
                <option value="">Select a county</option>
                ${COUNTIES.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}
              </select>
            </div>
            <div class="form-field">
              <label for="media-community">Community</label>
              <input type="text" id="media-community" />
            </div>
            <div class="form-field">
              <label for="media-program">Program</label>
              <input type="text" id="media-program" />
            </div>
            <div class="form-field">
              <label for="media-photo-date">Photo date</label>
              <input type="date" id="media-photo-date" />
            </div>
          </div>
          <div class="form-field">
            <label for="media-caption">Caption</label>
            <textarea id="media-caption" maxlength="400"></textarea>
          </div>
          <div class="form-field">
            <label for="media-file">Image file (JPEG, PNG or WebP, 10MB max)</label>
            <input type="file" id="media-file" accept="image/jpeg,image/png,image/webp" required />
          </div>
          <button type="submit" class="btn btn--primary">Upload as draft</button>
        </form>
      </div>

      <div id="media-groups"></div>
    `;

    document.getElementById("media-upload-form").addEventListener("submit", (e) => handleUpload(e, session));
    loadAndRenderList(session);
  }

  function flash(message, kind) {
    const el = document.getElementById("media-flash");
    if (!el) return;
    el.innerHTML = `<div class="admin-error" style="${kind === "success" ? "background:var(--green-050);color:var(--green-700);" : ""}">${escapeHtml(message)}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ""; }, 5000);
  }

  /* ---------------------------------------------------------
     UPLOAD — resize + compress client-side first. Apps Script's
     web app plumbing (the exec -> echo -> exec redirect dance)
     struggles with multi-megabyte POST bodies — a raw phone
     photo, base64-encoded, easily runs 5-10MB and can leave the
     request hanging indefinitely rather than failing cleanly.
     Capping the longest edge and re-encoding as JPEG keeps
     uploads fast and reliable, and is lighter for field users on
     mobile data regardless.
  --------------------------------------------------------- */
  function resizeAndCompressImage(file, maxDimension, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error("Could not process image.")); return; }
            const outReader = new FileReader();
            outReader.onload = () => {
              const commaIndex = outReader.result.indexOf(",");
              resolve({ base64: outReader.result.slice(commaIndex + 1), mimeType: "image/jpeg" });
            };
            outReader.onerror = reject;
            outReader.readAsDataURL(blob);
          }, "image/jpeg", quality);
        };
        img.onerror = () => reject(new Error("Could not read this image file."));
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload(e, session) {
    e.preventDefault();
    const form = e.target;
    const fileInput = document.getElementById("media-file");
    const file = fileInput.files[0];
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!file) {
      flash("Please choose an image file.");
      return;
    }

    const originalLabel = submitBtn.textContent;
    submitBtn.setAttribute("disabled", "true");
    submitBtn.textContent = "Preparing image…";
    try {
      const { base64: imageBase64, mimeType } = await resizeAndCompressImage(file, 1600, 0.82);
      submitBtn.textContent = "Uploading…";
      const result = await callApi("uploadMedia", {
        token: session.token,
        title: document.getElementById("media-title").value.trim(),
        caption: document.getElementById("media-caption").value.trim(),
        category: document.getElementById("media-category").value,
        county: document.getElementById("media-county").value,
        community: document.getElementById("media-community").value.trim(),
        program: document.getElementById("media-program").value.trim(),
        photoDate: document.getElementById("media-photo-date").value,
        mimeType: mimeType,
        imageBase64: imageBase64
      });

      if (result.ok) {
        flash(result.message || "Photo uploaded.", "success");
        form.reset();
        loadAndRenderList(session);
      } else {
        flash(result.error || "Upload failed.");
      }
    } catch (err) {
      flash("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      submitBtn.removeAttribute("disabled");
      submitBtn.textContent = originalLabel;
    }
  }

  /* ---------------------------------------------------------
     LIST + GROUPS
  --------------------------------------------------------- */
  async function loadAndRenderList(session) {
    const groupsEl = document.getElementById("media-groups");
    if (!groupsEl) return;
    groupsEl.innerHTML = '<p class="admin-muted">Loading media…</p>';

    const result = await callApi("listMedia", { token: session.token });
    if (!result.ok) {
      groupsEl.innerHTML = `<div class="admin-error">${escapeHtml(result.error || "Could not load media.")}</div>`;
      return;
    }

    const items = result.items || [];
    groupsEl.innerHTML = "";

    STATUS_GROUPS.forEach((group) => {
      const groupItems = items.filter((it) => it.status === group.key);
      const section = document.createElement("div");
      section.className = "media-group";
      section.innerHTML = `
        <div class="media-group__title">${escapeHtml(group.label)} <span class="media-group__count">${groupItems.length}</span></div>
        <div class="media-grid" id="media-grid-${group.key}"></div>
      `;
      groupsEl.appendChild(section);

      const grid = section.querySelector(".media-grid");
      if (!groupItems.length) {
        grid.innerHTML = '<p class="admin-muted">Nothing here.</p>';
        return;
      }
      groupItems.forEach((item) => grid.appendChild(renderCard(item, session)));
    });
  }

  /* ---------------------------------------------------------
     CARD
  --------------------------------------------------------- */
  function renderCard(item, session) {
    const card = document.createElement("div");
    card.className = "media-card";

    const metaParts = [item.community, item.county, item.program].filter(Boolean).join(" · ");

    card.innerHTML = `
      <div class="media-card__thumb-wrap" data-photo-id="${escapeHtml(item.photoId)}">
        <span class="admin-muted">Loading…</span>
      </div>
      <div class="media-card__body">
        <span class="media-status-tag media-status-tag--${escapeHtml(item.status)}">${escapeHtml(item.status.replace("_", " "))}</span>
        <div class="media-card__title" style="margin-top:6px;">${escapeHtml(item.title || "(untitled)")}</div>
        <div class="media-card__meta">${escapeHtml(metaParts || "—")}</div>
        <div class="media-card__action-slot"></div>
      </div>
    `;

    loadThumbnail(card.querySelector(".media-card__thumb-wrap"), item.photoId, session);
    renderCardActions(card.querySelector(".media-card__action-slot"), item, session);

    return card;
  }

  async function loadThumbnail(wrap, photoId, session) {
    try {
      const result = await callApi("getMediaImage", { token: session.token, photoId: photoId });
      if (!result.ok) {
        wrap.innerHTML = '<span class="admin-muted">Preview unavailable</span>';
        return;
      }
      const img = document.createElement("img");
      img.src = `data:${result.mimeType};base64,${result.imageBase64}`;
      img.alt = "";
      wrap.innerHTML = "";
      wrap.appendChild(img);
    } catch (err) {
      wrap.innerHTML = '<span class="admin-muted">Preview unavailable</span>';
    }
  }

  function renderCardActions(slot, item, session) {
    const role = session.role;

    if (item.status === "DRAFT") {
      if (!can("MANAGE_MEDIA", role)) return;
      const btn = actionButton("Submit for review", "btn--outline");
      btn.addEventListener("click", () => runAction(btn, "submitMediaForReview", { photoId: item.photoId }, session));
      slot.appendChild(btn);
      return;
    }

    if (item.status === "UNDER_REVIEW") {
      if (!can("APPROVE_MEDIA", role)) {
        slot.innerHTML = '<p class="admin-muted" style="margin:0;">Awaiting review by an admin.</p>';
        return;
      }
      // Distinct, unmissable consent control — never bundled into a
      // generic "approve" click (Rule 0/Phase 7 step 7.17).
      const consentWrap = document.createElement("div");
      consentWrap.className = "media-card__consent";
      const consentId = "consent-" + item.photoId;
      consentWrap.innerHTML = `
        <input type="checkbox" id="${consentId}" />
        <label for="${consentId}">I have reviewed this photo for consent and child safeguarding.</label>
      `;
      slot.appendChild(consentWrap);

      const btn = actionButton("Approve", "btn--primary");
      btn.addEventListener("click", () => {
        const checked = document.getElementById(consentId).checked;
        if (!checked) {
          flash("Please confirm the consent/safeguarding checkbox before approving.");
          return;
        }
        runAction(btn, "approveMedia", { photoId: item.photoId, consentReviewed: true }, session);
      });
      slot.appendChild(btn);
      return;
    }

    if (item.status === "APPROVED") {
      if (can("PUBLISH_MEDIA", role)) {
        const publishBtn = actionButton("Publish", "btn--primary");
        publishBtn.addEventListener("click", () => runAction(publishBtn, "publishMedia", { photoId: item.photoId }, session));
        slot.appendChild(publishBtn);
      }
      if (can("MANAGE_MEDIA", role)) {
        const archiveBtn = actionButton("Archive", "btn--outline");
        archiveBtn.addEventListener("click", () => runAction(archiveBtn, "archiveMedia", { photoId: item.photoId }, session));
        slot.appendChild(archiveBtn);
      }
      return;
    }

    if (item.status === "PUBLISHED") {
      if (!can("MANAGE_MEDIA", role)) return;
      const archiveBtn = actionButton("Archive", "btn--outline");
      archiveBtn.addEventListener("click", () => runAction(archiveBtn, "archiveMedia", { photoId: item.photoId }, session));
      slot.appendChild(archiveBtn);
      return;
    }

    // ARCHIVED — no further actions in Phase 7.
  }

  function actionButton(label, cls) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn " + cls;
    btn.textContent = label;
    return btn;
  }

  async function runAction(triggerBtn, action, payload, session) {
    triggerBtn.setAttribute("disabled", "true");
    try {
      const result = await callApi(action, Object.assign({ token: session.token }, payload));
      if (result.ok) {
        flash(result.message || "Done.", "success");
        loadAndRenderList(session);
      } else {
        flash(result.error || "Action failed.");
        triggerBtn.removeAttribute("disabled");
      }
    } catch (err) {
      flash("Couldn't reach the server. Please check your connection and try again.");
      triggerBtn.removeAttribute("disabled");
    }
  }

  window.__uafRegisterAdminModule && window.__uafRegisterAdminModule("media", renderMediaModule);
})();
