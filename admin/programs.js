/* =========================================================
   UAF IMPACT — ADMIN: UAF PROGRAMS MANAGEMENT
   ---------------------------------------------------------
   Administrative portal for adding, editing, and managing
   the core UAF intervention programs.
   ========================================================= */
(() => {
  "use strict";

  const STORAGE_KEY = "uaf_programs";

  const DEFAULT_PROGRAMS = [
    {
      id: "nic",
      icon: "NIC",
      title: "No Invisible Child",
      desc: "Identifying, supporting, and re-enrolling out-of-school children across vulnerable communities (NIC 2026/2027).",
      tag: "Flagship",
      status: "Active",
      goto: "submit-ossc",
      beneficiaries: "350+ Children",
      communities: "12 Communities"
    },
    {
      id: "edu_access",
      icon: "EDU",
      title: "Education Access",
      desc: "Household-level enrollment, school fee subsidization, and uniform/kit distribution for vulnerable learners.",
      tag: "Access",
      status: "Active",
      goto: "donate",
      beneficiaries: "500+ Students",
      communities: "15 Communities"
    },
    {
      id: "rights_advocacy",
      icon: "LAW",
      title: "Rights Advocacy",
      desc: "Advocating for educational rights, community policy awareness, and combating child labor across communities.",
      tag: "Advocacy",
      status: "Active",
      goto: "",
      beneficiaries: "1,200+ Individuals",
      communities: "18 Communities"
    },
    {
      id: "child_protection",
      icon: "SAFE",
      title: "Child Protection",
      desc: "Safeguarding, child protection standards, reporting mechanisms, and creating secure learning spaces.",
      tag: "Protection",
      status: "Active",
      goto: "",
      beneficiaries: "850+ Learners & Staff",
      communities: "14 Communities"
    }
  ];

  // Persistent Program Deletion Tombstones
  function getDeletedPrograms() {
    try {
      return JSON.parse(localStorage.getItem("uaf_deleted_programs") || "[]");
    } catch (_) {
      return [];
    }
  }

  function addDeletedProgram(p) {
    if (!p) return;
    const list = getDeletedPrograms();
    const idStr = String(p.id || p.title || "").trim();
    if (idStr && !list.includes(idStr)) {
      list.push(idStr);
      try {
        localStorage.setItem("uaf_deleted_programs", JSON.stringify(list));
      } catch (_) {}
    }
  }

  function getPrograms() {
    const deletedList = getDeletedPrograms();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => !deletedList.includes(String(p.id || p.title || "").trim()));
        }
      }
    } catch (e) {}
    const initial = DEFAULT_PROGRAMS.filter((p) => !deletedList.includes(String(p.id || p.title || "").trim()));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch (_) {}
    return initial;
  }

  function savePrograms(programs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
      window.dispatchEvent(new Event("uaf_programs_updated"));
    } catch (e) {
      console.error("Failed to save programs to storage:", e);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function renderProgramsModule(container, session) {
    let programs = getPrograms();
    let editingIndex = -1;

    function refresh() {
      programs = getPrograms();
      render();
    }

    function render() {
      container.innerHTML = `
        <div class="admin-module-header">
          <div>
            <h2>UAF Programs Management</h2>
            <p class="admin-muted" style="margin-top:4px;">Manage the core intervention programs displayed across the UAF Impact web application.</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="prog-reset-btn" class="btn btn--outline" style="font-size:12px;">Reset Defaults</button>
            <button id="prog-add-btn" class="btn btn--primary" style="font-size:12px;">+ Add Program</button>
          </div>
        </div>

        <div id="prog-flash" style="margin-bottom:12px;"></div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Program Name</th>
                <th>Category Tag</th>
                <th>Beneficiaries</th>
                <th># of Communities</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${programs.map((p, idx) => `
                <tr>
                  <td style="font-size:13px;font-weight:600;text-align:center;"><span class="admin-badge admin-badge--neutral">${escapeHtml(p.icon || "UAF")}</span></td>
                  <td><strong>${escapeHtml(p.title)}</strong></td>
                  <td><span class="admin-badge admin-badge--neutral">${escapeHtml(p.tag || "Core")}</span></td>
                  <td style="font-size:12.5px;font-weight:600;color:var(--blue-700);">${escapeHtml(p.beneficiaries || "—")}</td>
                  <td style="font-size:12.5px;font-weight:600;color:var(--ink-700);">${escapeHtml(p.communities || "—")}</td>
                  <td style="max-width:280px;font-size:12.5px;color:var(--ink-700);">${escapeHtml(p.desc)}</td>
                  <td>
                    <span class="admin-badge ${p.status === 'Active' ? 'admin-badge--verified' : 'admin-badge--review'}">
                      ${escapeHtml(p.status || 'Active')}
                    </span>
                  </td>
                  <td>
                    <div style="display:flex;gap:6px;">
                      <button class="btn btn--outline prog-edit-btn" data-index="${idx}" style="padding:4px 8px;font-size:11.5px;">Edit</button>
                      <button class="btn btn--outline prog-delete-btn" data-index="${idx}" style="padding:4px 8px;font-size:11.5px;color:var(--red-700);">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <!-- Edit/Add Modal -->
        <div id="prog-modal" class="admin-modal-overlay is-hidden">
          <div class="admin-modal" style="max-width:500px;">
            <h3 id="prog-modal-title">Edit Program</h3>
            <form id="prog-form" style="margin-top:14px;">
              <div style="display:grid;grid-template-columns:80px 1fr;gap:10px;">
                <div class="form-field">
                  <label for="prog-icon">Icon Code</label>
                  <input type="text" id="prog-icon" placeholder="NIC" required style="text-align:center;font-size:13px;font-weight:600;" />
                </div>
                <div class="form-field">
                  <label for="prog-title">Program Title</label>
                  <input type="text" id="prog-title" placeholder="Program name" required />
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div class="form-field">
                  <label for="prog-tag">Category Tag</label>
                  <input type="text" id="prog-tag" placeholder="e.g. Flagship, Access" required />
                </div>
                <div class="form-field">
                  <label for="prog-status">Status</label>
                  <select id="prog-status">
                    <option value="Active">Active</option>
                    <option value="Expanding">Expanding</option>
                    <option value="Planned">Planned</option>
                  </select>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div class="form-field">
                  <label for="prog-beneficiaries">Number of Beneficiaries</label>
                  <input type="text" id="prog-beneficiaries" placeholder="e.g. 350+ Children" />
                </div>
                <div class="form-field">
                  <label for="prog-communities"># of Communities</label>
                  <input type="text" id="prog-communities" placeholder="e.g. 12 Communities" />
                </div>
              </div>
              <div class="form-field">
                <label for="prog-desc">Description</label>
                <textarea id="prog-desc" rows="3" placeholder="Brief explanation of the program..." required></textarea>
              </div>
              <div class="form-field">
                <label for="prog-goto">Navigation Target / Link</label>
                <input type="text" id="prog-goto" placeholder="e.g. donate, submit-ossc, or URL" />
              </div>
              <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
                <button type="button" id="prog-modal-cancel" class="btn btn--outline">Cancel</button>
                <button type="submit" class="btn btn--primary">Save Program</button>
              </div>
            </form>
          </div>
        </div>
      `;

      // Event listeners
      container.querySelector("#prog-add-btn").addEventListener("click", () => {
        editingIndex = -1;
        document.getElementById("prog-modal-title").textContent = "Add New Program";
        document.getElementById("prog-form").reset();
        document.getElementById("prog-icon").value = "UAF";
        document.getElementById("prog-beneficiaries").value = "";
        document.getElementById("prog-communities").value = "";
        document.getElementById("prog-modal").classList.remove("is-hidden");
      });

      container.querySelector("#prog-reset-btn").addEventListener("click", () => {
        if (confirm("Reset programs list to default 4 core UAF programs?")) {
          savePrograms(DEFAULT_PROGRAMS);
          refresh();
          showFlash("Programs reset to default baseline.", "success");
        }
      });

      container.querySelectorAll(".prog-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.index);
          const p = programs[idx];
          if (!p) return;
          editingIndex = idx;
          document.getElementById("prog-modal-title").textContent = "Edit Program: " + p.title;
          document.getElementById("prog-icon").value = p.icon || "UAF";
          document.getElementById("prog-title").value = p.title || "";
          document.getElementById("prog-tag").value = p.tag || "";
          document.getElementById("prog-status").value = p.status || "Active";
          document.getElementById("prog-beneficiaries").value = p.beneficiaries || "";
          document.getElementById("prog-communities").value = p.communities || "";
          document.getElementById("prog-desc").value = p.desc || "";
          document.getElementById("prog-goto").value = p.goto || "";
          document.getElementById("prog-modal").classList.remove("is-hidden");
        });
      });

      container.querySelectorAll(".prog-delete-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.index);
          const p = programs[idx];
          if (!p) return;
          if (confirm(`Are you sure you want to delete "${p.title}"?`)) {
            addDeletedProgram(p);
            const deletedList = getDeletedPrograms();
            programs.splice(idx, 1);
            const updated = programs.filter((pr) => !deletedList.includes(String(pr.id || pr.title || "").trim()));
            savePrograms(updated);
            refresh();
            showFlash(`Deleted "${p.title}".`, "success");
          }
        });
      });

      const modal = container.querySelector("#prog-modal");
      const cancelBtn = container.querySelector("#prog-modal-cancel");
      const form = container.querySelector("#prog-form");

      cancelBtn.addEventListener("click", () => {
        modal.classList.add("is-hidden");
      });

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const updated = {
          id: editingIndex >= 0 ? programs[editingIndex].id : "prog_" + Date.now(),
          icon: document.getElementById("prog-icon").value.trim() || "UAF",
          title: document.getElementById("prog-title").value.trim(),
          tag: document.getElementById("prog-tag").value.trim(),
          status: document.getElementById("prog-status").value,
          beneficiaries: document.getElementById("prog-beneficiaries").value.trim(),
          communities: document.getElementById("prog-communities").value.trim(),
          desc: document.getElementById("prog-desc").value.trim(),
          goto: document.getElementById("prog-goto").value.trim()
        };

        if (editingIndex >= 0) {
          programs[editingIndex] = updated;
          showFlash(`Updated program "${updated.title}".`, "success");
        } else {
          programs.push(updated);
          showFlash(`Added new program "${updated.title}".`, "success");
        }

        savePrograms(programs);
        modal.classList.add("is-hidden");
        refresh();
      });
    }

    function showFlash(msg, type) {
      const el = container.querySelector("#prog-flash");
      if (!el) return;
      el.innerHTML = `<div class="admin-flash admin-flash--${type}">${escapeHtml(msg)}</div>`;
      setTimeout(() => { el.innerHTML = ""; }, 3500);
    }

    render();
  }

  // Register with Admin Module registry
  if (window.__uafRegisterAdminModule) {
    window.__uafRegisterAdminModule("programs", renderProgramsModule);
  }
})();
