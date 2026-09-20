/* =========================================================
   UAF IMPACT — ADMIN: PARTNERS & COLLABORATORS MANAGEMENT
   ---------------------------------------------------------
   Administrative portal for adding, editing, and managing
   UAF partner organizations, institutions, and their logos.
   Provides active, always-accessible form fields with logo
   file upload (base64) and URL options.
   ========================================================= */
(() => {
  "use strict";

  const STORAGE_KEY = "uaf_partners";

  const DEFAULT_PARTNERS = [
    {
      id: "part_cas",
      name: "Community School Alliances",
      type: "Education Access Partner",
      logoUrl: "assets/uaf-logo.png",
      desc: "Partnering with verified community primary and junior high schools across Montserrado County to admit out-of-school learners with waived or subsidized fees."
    },
    {
      id: "part_lcpn",
      name: "Liberia Child Protection Network",
      type: "Safeguarding Alliance",
      logoUrl: "assets/nic-logo.png",
      desc: "Collaborating on child protection referrals, household counseling, and community awareness against child labor and early school drop-outs."
    },
    {
      id: "part_alp",
      name: "Learning Alternative Program (ALP)",
      type: "Digital Literacy & Skills",
      logoUrl: "assets/icon-partners.png",
      desc: "Empowering youth and young mothers with computer literacy, job readiness, and technology training to fund household educational needs."
    },
    {
      id: "part_clc",
      name: "Community Leadership Councils",
      type: "Local Governance",
      logoUrl: "assets/icon-impact.jpg",
      desc: "Zone leaders, block chairs, and community elders who guide UAF field verifiers through neighborhoods to identify every out-of-school child."
    },
    {
      id: "part_nic",
      name: "No Invisible Child (NIC)",
      type: "Founding Coalition",
      logoUrl: "assets/nic-logo.png",
      desc: "Flagship educational initiative ensuring every marginalized out-of-school child in Liberia is identified, supported, and re-enrolled."
    },
    {
      id: "part_uaf",
      name: "Upskill Africa Foundation",
      type: "Implementing Organization",
      logoUrl: "assets/uaf-logo.png",
      desc: "Community grassroots non-profit dedicated to child protection, literacy, livelihood empowerment, and digital access."
    }
  ];

  function getPartners() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_PARTNERS;
  }

  function savePartners(partners) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
      window.dispatchEvent(new Event("uaf_partners_updated"));
    } catch (e) {
      console.error("Failed to save partners to storage:", e);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function renderPartnersModule(container, session) {
    let partners = getPartners();
    let editingPartnerId = null;
    let currentLogoDataUrl = "assets/uaf-logo.png";

    function refresh() {
      partners = getPartners();
      render();
    }

    function render() {
      const isEditing = Boolean(editingPartnerId);
      const editingPartner = isEditing ? partners.find((p) => p.id === editingPartnerId) : null;

      container.innerHTML = `
        <div class="admin-module-header">
          <div>
            <h2 style="font-family:'Lorem ipsum dolor sit amet' !important;">Partners &amp; Collaborators Management</h2>
            <p class="admin-muted" style="margin-top:4px;font-family:'Lorem ipsum dolor sit amet' !important;">Add and manage partner organizations, institutions, and their official logos displayed across the UAF platform.</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="partner-reset-btn" class="btn btn--outline" style="font-size:12px;">Reset Defaults</button>
          </div>
        </div>

        <div id="partner-flash" style="margin-bottom:14px;"></div>

        <!-- ACTIVE PARTNER FORM CARD (Always Active & Directly Accessible) -->
        <div class="admin-card" id="partner-form-card" style="margin-bottom:24px;border:2px solid var(--blue-200);background:#fff;padding:22px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--ink-100);padding-bottom:10px;">
            <div>
              <h3 id="partner-form-title" style="margin:0;font-size:17px;color:var(--blue-900);font-weight:700;">
                ${isEditing ? `Edit Partner: ${escapeHtml(editingPartner?.name || "")}` : "Add New Partner &amp; Logo"}
              </h3>
              <p class="admin-muted" style="margin:4px 0 0;font-size:12.5px;">
                ${isEditing ? "Modify partner details or change the logo below, then click Update." : "Fill out partner information and upload or select their logo to display on the public site."}
              </p>
            </div>
            ${isEditing ? `<button type="button" id="partner-cancel-edit-btn" class="btn btn--outline" style="font-size:12px;padding:5px 10px;">Cancel Edit</button>` : ""}
          </div>

          <form id="active-partner-form">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
              <div class="form-field">
                <label for="partner-name" style="font-weight:600;">Partner / Organization Name *</label>
                <input type="text" id="partner-name" required placeholder="e.g. Community School Alliances" value="${isEditing ? escapeHtml(editingPartner?.name || "") : ""}" />
              </div>

              <div class="form-field">
                <label for="partner-type" style="font-weight:600;">Classification / Partnership Type *</label>
                <input type="text" id="partner-type" list="partner-types-list" required placeholder="e.g. Education Access Partner, Safeguarding Alliance" value="${isEditing ? escapeHtml(editingPartner?.type || "") : ""}" />
                <datalist id="partner-types-list">
                  <option value="Education Access Partner" />
                  <option value="Safeguarding Alliance" />
                  <option value="Digital Literacy &amp; Skills" />
                  <option value="Local Governance" />
                  <option value="Founding Coalition" />
                  <option value="Implementing Organization" />
                  <option value="Donor &amp; Philanthropic Partner" />
                </datalist>
              </div>
            </div>

            <!-- LOGO SELECTION & UPLOAD SECTION -->
            <div class="form-field" style="margin-top:10px;background:var(--surface-alt,#f8fafc);padding:14px;border-radius:10px;border:1px solid var(--border,#e2e8f0);">
              <label style="font-weight:700;display:block;margin-bottom:8px;color:var(--ink-800);">Partner Logo (File Upload or Image URL) *</label>
              
              <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
                <!-- Logo Preview Box -->
                <div style="width:72px;height:72px;background:#fff;border:2px solid var(--ink-200);border-radius:10px;padding:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,0.06);overflow:hidden;">
                  <img id="partner-logo-preview" src="${isEditing && editingPartner?.logoUrl ? editingPartner.logoUrl : currentLogoDataUrl}" alt="Logo Preview" style="max-width:100%;max-height:100%;object-fit:contain;" />
                </div>

                <!-- Upload & URL Controls -->
                <div style="flex:1;min-width:240px;">
                  <div style="margin-bottom:8px;">
                    <label for="partner-logo-file" style="font-size:12px;color:var(--ink-600);display:block;margin-bottom:3px;">
                      <strong>Option A:</strong> Upload Logo Image File from your device
                    </label>
                    <input type="file" id="partner-logo-file" accept="image/*" style="font-size:12px;width:100%;" />
                  </div>

                  <div style="margin-bottom:8px;">
                    <label for="partner-logo-url" style="font-size:12px;color:var(--ink-600);display:block;margin-bottom:3px;">
                      <strong>Option B:</strong> Or enter direct Image URL / asset path
                    </label>
                    <input type="text" id="partner-logo-url" placeholder="assets/uaf-logo.png or https://..." value="${isEditing ? escapeHtml(editingPartner?.logoUrl || "") : ""}" style="font-size:12.5px;" />
                  </div>

                  <!-- Quick Preset Logos -->
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px;">
                    <span style="font-size:11.5px;color:var(--ink-500);font-weight:600;">Quick Presets:</span>
                    <button type="button" class="btn btn--outline btn-logo-preset" data-src="assets/uaf-logo.png" style="padding:2px 8px;font-size:11px;">UAF Logo</button>
                    <button type="button" class="btn btn--outline btn-logo-preset" data-src="assets/nic-logo.png" style="padding:2px 8px;font-size:11px;">NIC Logo</button>
                    <button type="button" class="btn btn--outline btn-logo-preset" data-src="assets/icon-partners.png" style="padding:2px 8px;font-size:11px;">Partners Icon</button>
                    <button type="button" class="btn btn--outline btn-logo-preset" data-src="assets/icon-impact.jpg" style="padding:2px 8px;font-size:11px;">Impact Icon</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-field" style="margin-top:12px;">
              <label for="partner-desc" style="font-weight:600;">Description / Scope of Collaboration *</label>
              <textarea id="partner-desc" rows="3" required placeholder="Explain the partner's role, educational alignment, and collaborative community impact...">${isEditing ? escapeHtml(editingPartner?.desc || "") : ""}</textarea>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
              <button type="button" id="partner-clear-btn" class="btn btn--outline">${isEditing ? "Cancel" : "Clear"}</button>
              <button type="submit" class="btn btn--primary" id="partner-submit-btn" style="min-width:140px;">
                ${isEditing ? "Update Partner" : "+ Add Partner"}
              </button>
            </div>
          </form>
        </div>

        <!-- PARTNERS LIST TABLE -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:16px;color:var(--ink-800);">Registered Partners &amp; Alliances (${partners.length})</h3>
          <span style="font-size:12px;color:var(--ink-500);">Displays in the public Partners tab</span>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width:72px;text-align:center;">Logo</th>
                <th>Partner Name</th>
                <th>Classification / Type</th>
                <th>Description</th>
                <th style="width:140px;text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${partners.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align:center;padding:24px;color:var(--ink-400);">No partners registered yet. Use the active form above to add your first partner.</td>
                </tr>
              ` : partners.map((p, idx) => `
                <tr style="${editingPartnerId === p.id ? "background:var(--blue-050,#eff6ff);" : ""}">
                  <td style="text-align:center;vertical-align:middle;">
                    <div style="width:48px;height:48px;background:#fff;border:1px solid var(--ink-200);border-radius:8px;padding:3px;display:flex;align-items:center;justify-content:center;margin:0 auto;overflow:hidden;">
                      <img src="${p.logoUrl || 'assets/uaf-logo.png'}" alt="${escapeHtml(p.name)}" style="max-width:100%;max-height:100%;object-fit:contain;" onerror="this.src='assets/uaf-logo.png';" />
                    </div>
                  </td>
                  <td>
                    <strong>${escapeHtml(p.name)}</strong>
                    ${editingPartnerId === p.id ? `<span class="admin-badge admin-badge--neutral" style="margin-left:6px;font-size:10px;">Editing</span>` : ""}
                  </td>
                  <td><span class="admin-badge admin-badge--neutral">${escapeHtml(p.type || "Partner")}</span></td>
                  <td style="max-width:320px;font-size:12.5px;color:var(--ink-700);line-height:1.45;">${escapeHtml(p.desc || "")}</td>
                  <td style="text-align:right;">
                    <div style="display:flex;gap:6px;justify-content:flex-end;">
                      <button type="button" class="btn btn--outline partner-edit-btn" data-id="${p.id}" style="padding:4px 9px;font-size:11.5px;">Edit</button>
                      <button type="button" class="btn btn--outline partner-delete-btn" data-id="${p.id}" style="padding:4px 9px;font-size:11.5px;color:var(--red-700);">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;

      // Form Elements
      const form = container.querySelector("#active-partner-form");
      const nameInput = container.querySelector("#partner-name");
      const typeInput = container.querySelector("#partner-type");
      const descInput = container.querySelector("#partner-desc");
      const logoFileInput = container.querySelector("#partner-logo-file");
      const logoUrlInput = container.querySelector("#partner-logo-url");
      const logoPreview = container.querySelector("#partner-logo-preview");
      const clearBtn = container.querySelector("#partner-clear-btn");
      const cancelEditBtn = container.querySelector("#partner-cancel-edit-btn");
      const resetBtn = container.querySelector("#partner-reset-btn");

      function updateLogo(src) {
        currentLogoDataUrl = src || "assets/uaf-logo.png";
        if (logoPreview) logoPreview.src = currentLogoDataUrl;
      }

      // Preset buttons
      container.querySelectorAll(".btn-logo-preset").forEach((b) => {
        b.addEventListener("click", () => {
          const src = b.dataset.src;
          if (logoUrlInput) logoUrlInput.value = src;
          updateLogo(src);
        });
      });

      // File input change -> base64
      logoFileInput?.addEventListener("change", () => {
        if (logoFileInput.files && logoFileInput.files[0]) {
          const file = logoFileInput.files[0];
          const reader = new FileReader();
          reader.onload = (e) => {
            updateLogo(e.target.result);
            if (logoUrlInput) logoUrlInput.value = "";
          };
          reader.readAsDataURL(file);
        }
      });

      // URL input change
      logoUrlInput?.addEventListener("input", () => {
        const val = logoUrlInput.value.trim();
        if (val) {
          updateLogo(val);
        }
      });

      // Reset to defaults
      resetBtn?.addEventListener("click", () => {
        if (confirm("Reset partners list to default UAF verified baseline?")) {
          savePartners(DEFAULT_PARTNERS);
          editingPartnerId = null;
          refresh();
          showFlash("Partners reset to default baseline.", "success");
        }
      });

      // Clear / Cancel button
      clearBtn?.addEventListener("click", () => {
        editingPartnerId = null;
        render();
      });

      cancelEditBtn?.addEventListener("click", () => {
        editingPartnerId = null;
        render();
      });

      // Edit partner button
      container.querySelectorAll(".partner-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          const target = partners.find((p) => p.id === id);
          if (!target) return;
          editingPartnerId = id;
          currentLogoDataUrl = target.logoUrl || "assets/uaf-logo.png";
          render();
          const card = container.querySelector("#partner-form-card");
          if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "start" });
            container.querySelector("#partner-name")?.focus();
          }
        });
      });

      // Delete partner button
      container.querySelectorAll(".partner-delete-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          const target = partners.find((p) => p.id === id);
          if (!target) return;
          if (confirm(`Are you sure you want to delete "${target.name}"?`)) {
            const updatedList = partners.filter((p) => p.id !== id);
            if (editingPartnerId === id) editingPartnerId = null;
            savePartners(updatedList);
            refresh();
            showFlash(`Deleted partner "${target.name}".`, "success");
          }
        });
      });

      // Form submission
      form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const type = typeInput.value.trim();
        const desc = descInput.value.trim();
        const logo = (logoUrlInput.value.trim()) || currentLogoDataUrl || "assets/uaf-logo.png";

        if (!name || !type || !desc) {
          showFlash("Please complete all required fields.", "error");
          return;
        }

        if (editingPartnerId) {
          // Update existing
          const idx = partners.findIndex((p) => p.id === editingPartnerId);
          if (idx >= 0) {
            partners[idx] = {
              ...partners[idx],
              name,
              type,
              desc,
              logoUrl: logo
            };
            showFlash(`Updated partner "${name}".`, "success");
          }
          editingPartnerId = null;
        } else {
          // Create new
          const newPartner = {
            id: "part_" + Date.now(),
            name,
            type,
            desc,
            logoUrl: logo
          };
          partners.unshift(newPartner);
          showFlash(`Added new partner "${name}".`, "success");
        }

        savePartners(partners);
        refresh();
      });
    }

    function showFlash(msg, type) {
      const el = container.querySelector("#partner-flash");
      if (!el) return;
      el.innerHTML = `<div class="admin-flash admin-flash--${type === "error" ? "error" : "success"}">${escapeHtml(msg)}</div>`;
      setTimeout(() => { if (el) el.innerHTML = ""; }, 4000);
    }

    render();
  }

  // Register with Admin Module registry
  if (window.__uafRegisterAdminModule) {
    window.__uafRegisterAdminModule("partners", renderPartnersModule);
  }
})();
