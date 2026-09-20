/* =========================================================
   UAF IMPACT — ADMIN: STORIES & EVIDENCE REQUESTS
   ---------------------------------------------------------
   Administrative portal for creating, publishing, and managing
   unlimited field impact stories with image upload (base64 & URL),
   amount raised, funding goals, and reviewing evidence requests.
   ========================================================= */
(() => {
  "use strict";

  const STORAGE_KEY = "uaf_stories";
  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";

  const CATEGORIES = [
    "No Invisible Child",
    "Education Access",
    "Women Livelihood Empowerment",
    "Alternative Learning (ALP)",
    "Child Protection",
    "Rights Advocacy",
    "Community Outreach",
    "Policy & Research",
    "General Update"
  ];

  const COUNTIES = [
    "Montserrado", "Margibi", "Bong", "Nimba", "Grand Bassa",
    "Bomi", "Gbarpolu", "Grand Cape Mount", "Grand Gedeh",
    "Grand Kru", "Lofa", "Maryland", "River Cess", "River Gee", "Sinoe"
  ];

  const DEFAULT_STORIES = [
    {
      id: "story_blessing",
      title: "Blessing's Journey Back to the Classroom",
      category: "No Invisible Child",
      tag: "No Invisible Child Flagship",
      community: "West Point",
      county: "Montserrado",
      storyDate: "2026-02-15",
      imageUrl: "assets/uaf-logo.png",
      amountRaised: 5250,
      fundingGoal: 7000,
      speaker: "Blessing K., Age 9 & Her Mother Ma Musu",
      testimonial: "“I thought I would sell cold water forever. When Teacher Joseph from UAF came to our zinc house with books and uniform, I cried. Now I am 1st place in Grade 3!”",
      activities: "Door-to-door community verification in West Point informal settlements, tuition waiver sponsorship, distribution of backpacks, geometry sets, shoes, and two full school uniforms, plus monthly academic check-ins.",
      narrative: "Blessing was forced out of school when her mother contracted a chronic illness and could no longer afford school registration. For 18 months, Blessing spent 9 hours every day dodging commercial vehicles along the Waterside traffic corridor selling plastic water sachets to generate 250 LRD ($1.30) for daily food. During the UAF door-to-door enumeration, field officers identified Blessing and enrolled her in the No Invisible Child initiative. UAF cleared her outstanding fees at St. Mary Public School, provided study materials, and enrolled her mother into our women's micro-enterprise savings group. Today, Blessing has maintained an exceptional 92% cumulative average and dreams of becoming a pediatric physician in Liberia.",
      summary: "From selling cold water in crowded Waterside traffic to topping her Grade 3 class in West Point after UAF paid her tuition and learning supplies.",
      status: "PUBLISHED",
      createdBy: "Field Team",
      views: 0
    },
    {
      id: "story_comfort",
      title: "Mother Comfort's Soap-Making Cooperative",
      category: "Women Livelihood Empowerment",
      tag: "Women Livelihood Empowerment",
      community: "Duport Road",
      county: "Montserrado",
      storyDate: "2026-03-01",
      imageUrl: "assets/icon-partners.png",
      amountRaised: 8800,
      fundingGoal: 10000,
      speaker: "Mother Comfort Toe, Cooperative Lead",
      testimonial: "“Before UAF trained us, every school opening was agony. We could not pay tuition. Today, our cooperative produces 300 soap bars weekly. My children will never drop out again.”",
      activities: "Intensive 6-week hands-on vocational training in cold-process laundry and medicated soap formulating, household financial bookkeeping, group rotating savings (Susu), and collective market distribution.",
      narrative: "In Paynesville, single mothers often face severe income volatility that causes their children to be sent home for tuition arrears mid-semester. To break this recurrent cycle, Upskill Africa Foundation established the Duport Road Women's Empowerment Guild. 25 mothers completed practical skill development in industrial liquid soap, dishwashing solution, and laundry bar formulation. Equipped with starter chemical kits and bulk molds, the cooperative now supplies regional vendors and community schools. Profit distribution directly funds a dedicated children's education account, permanently securing the schooling of 68 children who were previously on the verge of school dropout.",
      summary: "How practical soap formulating and savings cooperatives enabled 25 mothers in Duport Road to independently keep 68 children in school.",
      status: "PUBLISHED",
      createdBy: "Livelihoods Unit",
      views: 0
    },
    {
      id: "story_emmanuel",
      title: "Breaking the Digital Divide in Margibi",
      category: "Alternative Learning (ALP)",
      tag: "Alternative Learning Program (ALP)",
      community: "Kakata",
      county: "Margibi",
      storyDate: "2026-03-10",
      imageUrl: "assets/icon-impact.jpg",
      amountRaised: 6800,
      fundingGoal: 10000,
      speaker: "Emmanuel Flomo, Age 17, ALP Graduate",
      testimonial: "“I had never touched a computer keyboard in my life. UAF taught me how to type, format documents, and research on the internet. Now I work as a data clerk at Kakata Central Market.”",
      activities: "12-week modular curriculum covering fundamental computer hardware, touch typing, document formatting in Word and Excel, digital safety, resume building, and career mentorship for out-of-school teenagers.",
      narrative: "In post-secondary and informal employment across Liberia, basic digital literacy is a mandatory requirement. Adolescents who miss traditional secondary schooling are often locked out of clerical and logistics opportunities. Through the UAF Alternative Learning Program (ALP) Hub in Kakata, Emmanuel and 34 other out-of-school youth attended daily computer sessions powered by solar backup. Over 12 weeks, Emmanuel progressed from zero digital exposure to proficient spreadsheet data entry and typing 45 WPM. Upon graduation, he secured an apprentice recording role with a local produce cooperative, using his earned wage to self-fund his evening high school completion.",
      summary: "Equipping out-of-school adolescent youth in Kakata with computer literacy, office software, and career counseling for workplace readiness.",
      status: "PUBLISHED",
      createdBy: "ALP Coordinator",
      views: 0
    }
  ];

  function getLocalStories() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_STORIES;
  }

  function saveLocalStories(stories) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
      window.dispatchEvent(new Event("uaf_stories_updated"));
    } catch (e) {
      console.error("Failed to save stories to localStorage:", e);
    }
  }

  async function callApi(action, payload) {
    if (!API_URL || API_URL.includes("PASTE_YOUR")) {
      return { ok: false, error: "API not configured" };
    }
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

  function formatMoney(num) {
    const n = Number(num) || 0;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  let editingStoryId = null;
  let currentStoryImageDataUrl = "assets/uaf-logo.png";

  function renderStoriesModule(container, session) {
    cachedStories = getLocalStories();

    container.innerHTML = `
      <div class="admin-module-header">
        <div>
          <h2 style="font-family:'Lorem ipsum dolor sit amet' !important;">Field Stories &amp; Evidence Management</h2>
          <p class="admin-muted" style="margin-top:4px;font-family:'Lorem ipsum dolor sit amet' !important;">Create and publish unlimited field impact stories with photos, track amounts raised, and process evidence requests.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="stories-reset-btn" class="btn btn--outline" style="font-size:12px;">Reset Defaults</button>
          <button id="stories-refresh-btn" class="btn btn--outline" style="font-size:12px;">Refresh</button>
          <button id="create-story-btn" class="btn btn--primary" style="font-size:12px;">+ Post Field Story</button>
        </div>
      </div>

      <div id="stories-flash" style="margin-bottom:14px;"></div>

      <!-- View Switcher Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px;">
        <button id="tab-stories-btn" class="admin-filter-btn is-active">Field Stories &amp; News (<span id="count-stories-total">${cachedStories.length}</span>)</button>
        <button id="tab-evidence-btn" class="admin-filter-btn">Evidence Requests (<span id="count-evidence-total">0</span>)</button>
      </div>

      <!-- Stories View -->
      <div id="view-stories">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <div class="admin-filter-bar" style="margin-bottom:0;">
            <button class="admin-filter-btn is-active" data-story-filter="ALL">All Stories (${cachedStories.length})</button>
            <button class="admin-filter-btn" data-story-filter="PUBLISHED">Published</button>
            <button class="admin-filter-btn" data-story-filter="DRAFT">Draft</button>
            <button class="admin-filter-btn" data-story-filter="ARCHIVED">Archived</button>
          </div>
          <span style="font-size:12px;color:var(--ink-500);">Stories are dynamically rendered on the public Fundraising screen</span>
        </div>

        <div class="admin-table-wrap">
          <div id="stories-table-container"></div>
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

      <!-- Create / Edit Story Modal -->
      <div id="story-modal" class="admin-modal-overlay is-hidden">
        <div class="admin-modal" style="max-width:680px;max-height:90vh;overflow-y:auto;border-radius:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--ink-100);padding-bottom:12px;margin-bottom:16px;">
            <h3 id="story-modal-title" style="margin:0;color:var(--blue-900);font-size:18px;">Post Field Story &amp; News</h3>
            <button type="button" id="story-modal-close-x" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-500);line-height:1;">&times;</button>
          </div>

          <form id="story-form">
            <!-- 1. Title -->
            <div class="form-field">
              <label for="story-title" style="font-weight:600;">Story Title *</label>
              <input type="text" id="story-title" required maxlength="160" placeholder="e.g. 24 Children Re-enrolled in West Point Classrooms" />
            </div>

            <!-- 2. Category, County, Community, Date -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-field">
                <label for="story-category" style="font-weight:600;">Category / Program *</label>
                <select id="story-category" required>
                  ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
                </select>
              </div>

              <div class="form-field">
                <label for="story-county" style="font-weight:600;">County *</label>
                <select id="story-county" required>
                  ${COUNTIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
                </select>
              </div>

              <div class="form-field">
                <label for="story-community" style="font-weight:600;">Community / Town *</label>
                <input type="text" id="story-community" required placeholder="e.g. West Point, Duport Road, Kakata" />
              </div>

              <div class="form-field">
                <label for="story-date" style="font-weight:600;">Story Date *</label>
                <input type="date" id="story-date" value="${new Date().toISOString().slice(0, 10)}" required />
              </div>
            </div>

            <!-- 3. IMAGE UPLOAD & SELECTION SECTION -->
            <div class="form-field" style="margin-top:8px;background:var(--surface-alt,#f8fafc);padding:14px;border-radius:10px;border:1px solid var(--border,#e2e8f0);">
              <label style="font-weight:700;display:block;margin-bottom:8px;color:var(--ink-800);">Story Image / Photo (Upload from Device or enter URL) *</label>
              
              <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
                <!-- Thumbnail Preview -->
                <div style="width:100px;height:75px;background:#fff;border:2px solid var(--ink-200);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.08);">
                  <img id="story-img-preview" src="assets/uaf-logo.png" alt="Preview" style="width:100%;height:100%;object-fit:cover;" />
                </div>

                <!-- Controls -->
                <div style="flex:1;min-width:240px;">
                  <div style="margin-bottom:8px;">
                    <label for="story-img-file" style="font-size:12px;color:var(--ink-600);display:block;margin-bottom:3px;">
                      <strong>Option A:</strong> Upload photo file from computer/phone
                    </label>
                    <input type="file" id="story-img-file" accept="image/*" style="font-size:12px;width:100%;" />
                  </div>

                  <div style="margin-bottom:8px;">
                    <label for="story-img-url" style="font-size:12px;color:var(--ink-600);display:block;margin-bottom:3px;">
                      <strong>Option B:</strong> Or enter image path / online URL
                    </label>
                    <input type="text" id="story-img-url" placeholder="assets/uaf-logo.png or https://..." style="font-size:12.5px;" />
                  </div>

                  <!-- Quick Presets -->
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:11.5px;color:var(--ink-500);font-weight:600;">Presets:</span>
                    <button type="button" class="btn btn--outline btn-story-preset" data-src="assets/uaf-logo.png" style="padding:2px 7px;font-size:11px;">UAF Logo</button>
                    <button type="button" class="btn btn--outline btn-story-preset" data-src="assets/nic-logo.png" style="padding:2px 7px;font-size:11px;">NIC Logo</button>
                    <button type="button" class="btn btn--outline btn-story-preset" data-src="assets/icon-partners.png" style="padding:2px 7px;font-size:11px;">Partners</button>
                    <button type="button" class="btn btn--outline btn-story-preset" data-src="assets/icon-impact.jpg" style="padding:2px 7px;font-size:11px;">Impact</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. AMOUNT RAISED & FUNDING GOAL -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;background:#f0f9ff;padding:12px 14px;border-radius:8px;border:1px solid #bae6fd;">
              <div class="form-field">
                <label for="story-raised" style="font-weight:700;color:#0369a1;">Amount Raised ($ USD) *</label>
                <input type="number" id="story-raised" min="0" step="any" required placeholder="e.g. 5250" />
                <span style="font-size:11px;color:#0284c7;">Direct funding collected for this campaign</span>
              </div>

              <div class="form-field">
                <label for="story-goal" style="font-weight:700;color:#0369a1;">Target / Funding Goal ($ USD)</label>
                <input type="number" id="story-goal" min="0" step="any" placeholder="e.g. 7000" />
                <span style="font-size:11px;color:#0284c7;">Overall funding goal needed</span>
              </div>
            </div>

            <!-- 5. Summary -->
            <div class="form-field" style="margin-top:12px;">
              <label for="story-summary" style="font-weight:600;">Summary / Excerpt (Short description for card) *</label>
              <textarea id="story-summary" rows="2" maxlength="280" required placeholder="Brief 1-2 sentence overview shown directly on the story card..."></textarea>
            </div>

            <!-- 6. Speaker & Testimonial Quote -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-field">
                <label for="story-speaker" style="font-weight:600;">Speaker / Testimonial Author</label>
                <input type="text" id="story-speaker" placeholder="e.g. Blessing K., Age 9 &amp; Her Mother Ma Musu" />
              </div>
              <div class="form-field">
                <label for="story-tag" style="font-weight:600;">Campaign Tag / Badge</label>
                <input type="text" id="story-tag" placeholder="e.g. No Invisible Child Flagship" />
              </div>
            </div>

            <div class="form-field">
              <label for="story-quote" style="font-weight:600;">Direct Testimonial Quote</label>
              <textarea id="story-quote" rows="2" placeholder="“Enter the direct words spoken by the beneficiary, student, or community member...”"></textarea>
            </div>

            <!-- 7. Field Activities -->
            <div class="form-field">
              <label for="story-activities" style="font-weight:600;">Field Activities &amp; UAF Interventions</label>
              <textarea id="story-activities" rows="2" placeholder="Door-to-door verification, tuition sponsorship, backpack distribution, mother livelihood training..."></textarea>
            </div>

            <!-- 8. Full Narrative -->
            <div class="form-field">
              <label for="story-content" style="font-weight:600;">Full Story Narrative &amp; Background *</label>
              <textarea id="story-content" rows="6" required placeholder="Write the complete narrative detailing the background, challenge, intervention, and long-term community impact..."></textarea>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;border-top:1px solid var(--ink-100);padding-top:14px;">
              <button type="button" id="story-modal-cancel" class="btn btn--outline">Cancel</button>
              <div style="display:flex;gap:8px;">
                <button type="button" id="story-save-draft-btn" class="btn btn--outline">Save as Draft</button>
                <button type="submit" id="story-save-publish-btn" class="btn btn--primary" style="min-width:140px;">Publish Story</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    // References
    const modal = document.getElementById("story-modal");
    const storyForm = document.getElementById("story-form");
    const modalTitle = document.getElementById("story-modal-title");
    const imgFile = document.getElementById("story-img-file");
    const imgUrl = document.getElementById("story-img-url");
    const imgPreview = document.getElementById("story-img-preview");

    function updateStoryImage(src) {
      currentStoryImageDataUrl = src || "assets/uaf-logo.png";
      if (imgPreview) imgPreview.src = currentStoryImageDataUrl;
    }

    // Presets
    container.querySelectorAll(".btn-story-preset").forEach((b) => {
      b.addEventListener("click", () => {
        const src = b.dataset.src;
        if (imgUrl) imgUrl.value = src;
        updateStoryImage(src);
      });
    });

    // File input -> base64
    imgFile?.addEventListener("change", () => {
      if (imgFile.files && imgFile.files[0]) {
        const file = imgFile.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          updateStoryImage(e.target.result);
          if (imgUrl) imgUrl.value = "";
        };
        reader.readAsDataURL(file);
      }
    });

    imgUrl?.addEventListener("input", () => {
      const val = imgUrl.value.trim();
      if (val) updateStoryImage(val);
    });

    // Switch Tabs
    const tabStoriesBtn = document.getElementById("tab-stories-btn");
    const tabEvidenceBtn = document.getElementById("tab-evidence-btn");
    const viewStories = document.getElementById("view-stories");
    const viewEvidence = document.getElementById("view-evidence");

    tabStoriesBtn?.addEventListener("click", () => {
      tabStoriesBtn.classList.add("is-active");
      tabEvidenceBtn.classList.remove("is-active");
      viewStories.classList.remove("is-hidden");
      viewEvidence.classList.add("is-hidden");
      currentTab = "stories";
    });

    tabEvidenceBtn?.addEventListener("click", () => {
      tabEvidenceBtn.classList.add("is-active");
      tabStoriesBtn.classList.remove("is-active");
      viewEvidence.classList.remove("is-hidden");
      viewStories.classList.add("is-hidden");
      currentTab = "evidence";
      if (!cachedEvidence.length) loadEvidence(session);
    });

    // Story filter buttons
    container.querySelectorAll("button[data-story-filter]").forEach((b) => {
      b.addEventListener("click", () => {
        container.querySelectorAll("button[data-story-filter]").forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        storyFilter = b.dataset.storyFilter;
        renderStoriesTable(session);
      });
    });

    // Reset button
    document.getElementById("stories-reset-btn")?.addEventListener("click", () => {
      if (confirm("Reset stories to default UAF field stories baseline?")) {
        saveLocalStories(DEFAULT_STORIES);
        cachedStories = getLocalStories();
        renderStoriesTable(session);
        flash("Stories reset to default baseline.", "success");
      }
    });

    // Refresh button
    document.getElementById("stories-refresh-btn")?.addEventListener("click", () => {
      cachedStories = getLocalStories();
      renderStoriesTable(session);
      if (currentTab === "evidence") loadEvidence(session);
      flash("Refreshed stories list.", "success");
    });

    // Create Story button
    document.getElementById("create-story-btn")?.addEventListener("click", () => {
      editingStoryId = null;
      storyForm.reset();
      document.getElementById("story-date").value = new Date().toISOString().slice(0, 10);
      document.getElementById("story-raised").value = "0";
      document.getElementById("story-goal").value = "5000";
      currentStoryImageDataUrl = "assets/uaf-logo.png";
      updateStoryImage("assets/uaf-logo.png");
      modalTitle.textContent = "Post Field Story & News";
      modal.classList.remove("is-hidden");
    });

    // Close modal
    function closeModal() {
      modal?.classList.add("is-hidden");
      editingStoryId = null;
    }
    document.getElementById("story-modal-cancel")?.addEventListener("click", closeModal);
    document.getElementById("story-modal-close-x")?.addEventListener("click", closeModal);

    // Save as draft
    document.getElementById("story-save-draft-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      saveStoryRecord("DRAFT", session);
    });

    // Form submit -> Publish
    storyForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      saveStoryRecord("PUBLISHED", session);
    });

    function saveStoryRecord(status, session) {
      const title = document.getElementById("story-title").value.trim();
      const category = document.getElementById("story-category").value;
      const county = document.getElementById("story-county").value;
      const community = document.getElementById("story-community").value.trim();
      const storyDate = document.getElementById("story-date").value;
      const raised = Number(document.getElementById("story-raised").value) || 0;
      const goal = Number(document.getElementById("story-goal").value) || 0;
      const summary = document.getElementById("story-summary").value.trim();
      const speaker = document.getElementById("story-speaker").value.trim();
      const tag = document.getElementById("story-tag").value.trim() || category;
      const quote = document.getElementById("story-quote").value.trim();
      const activities = document.getElementById("story-activities").value.trim();
      const narrative = document.getElementById("story-content").value.trim();
      const image = imgUrl.value.trim() || currentStoryImageDataUrl || "assets/uaf-logo.png";

      if (!title || !narrative || !summary) {
        flash("Please fill in the title, summary, and full narrative.");
        return;
      }

      const stories = getLocalStories();

      if (editingStoryId) {
        const idx = stories.findIndex((s) => s.id === editingStoryId || s.storyId === editingStoryId);
        if (idx >= 0) {
          stories[idx] = {
            ...stories[idx],
            title,
            category,
            tag,
            county,
            community,
            storyDate,
            amountRaised: raised,
            fundingGoal: goal,
            summary,
            speaker,
            testimonial: quote,
            activities,
            narrative,
            imageUrl: image,
            status: status
          };
          flash(`Updated story "${title}".`, "success");
        }
      } else {
        const newStory = {
          id: "story_" + Date.now(),
          title,
          category,
          tag,
          county,
          community,
          storyDate,
          amountRaised: raised,
          fundingGoal: goal,
          summary,
          speaker,
          testimonial: quote,
          activities,
          narrative,
          imageUrl: image,
          status: status,
          createdBy: (session && session.name) || "Admin",
          views: 0
        };
        stories.unshift(newStory);
        flash(`Added new story "${title}".`, "success");
      }

      saveLocalStories(stories);
      cachedStories = stories;
      closeModal();
      renderStoriesTable(session);

      // Background API attempt
      callApi("createStory", {
        token: session?.token,
        title,
        category,
        county,
        community,
        storyDate,
        summary,
        content: narrative,
        imageUrl: image,
        amountRaised: raised,
        fundingGoal: goal
      }).catch(() => {});
    }

    renderStoriesTable(session);
  }

  function renderStoriesTable(session) {
    const container = document.getElementById("stories-table-container");
    if (!container) return;

    cachedStories = getLocalStories();
    const countEl = document.getElementById("count-stories-total");
    if (countEl) countEl.textContent = cachedStories.length;

    let items = cachedStories.slice();
    if (storyFilter !== "ALL") {
      items = items.filter((s) => String(s.status || "DRAFT").toUpperCase() === storyFilter);
    }

    if (items.length === 0) {
      container.innerHTML = '<p class="admin-muted" style="padding:28px;text-align:center;">No stories in this view. Click "+ Post Field Story" to add one.</p>';
      return;
    }

    const rows = items.map((s) => {
      const st = String(s.status || "DRAFT").toUpperCase();
      let badgeCls = "admin-badge--pending";
      if (st === "PUBLISHED") badgeCls = "admin-badge--verified";
      else if (st === "ARCHIVED") badgeCls = "admin-badge--failed";

      const raised = Number(s.amountRaised || 0);
      const goal = Number(s.fundingGoal || 0);
      const goalStr = goal > 0 ? ` / ${formatMoney(goal)}` : "";
      const storyId = s.id || s.storyId;

      return `
        <tr>
          <td style="width:60px;text-align:center;vertical-align:middle;">
            <div style="width:48px;height:48px;background:#fff;border:1px solid var(--ink-200);border-radius:6px;overflow:hidden;margin:0 auto;display:flex;align-items:center;justify-content:center;">
              <img src="${s.imageUrl || 'assets/uaf-logo.png'}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='assets/uaf-logo.png';" />
            </div>
          </td>
          <td>
            <div style="font-weight:700;color:var(--ink-900);">${escapeHtml(s.title)}</div>
            <div style="font-size:11.5px;color:var(--ink-500);margin-top:2px;">
              <span class="admin-badge admin-badge--neutral" style="font-size:10.5px;padding:1px 6px;">${escapeHtml(s.category)}</span>
              <span>${escapeHtml(s.community ? s.community + ", " : "")}${escapeHtml(s.county || "Liberia")}</span>
            </div>
          </td>
          <td>
            <div style="font-weight:700;color:var(--blue-700);">${formatMoney(raised)}</div>
            <div style="font-size:11px;color:var(--ink-500);">${goalStr ? "Goal: " + formatMoney(goal) : "No target set"}</div>
          </td>
          <td style="font-size:12px;color:var(--ink-600);">${formatDate(s.storyDate)}</td>
          <td><span class="admin-badge ${badgeCls}">${escapeHtml(st)}</span></td>
          <td style="text-align:right;">
            <div style="display:flex;gap:6px;justify-content:flex-end;">
              <button class="btn btn--outline story-edit-btn" data-id="${storyId}" style="padding:4px 8px;font-size:11.5px;">Edit</button>
              ${st === "PUBLISHED" 
                ? `<button class="btn btn--outline story-toggle-status-btn" data-id="${storyId}" data-status="DRAFT" style="padding:4px 8px;font-size:11.5px;">To Draft</button>`
                : `<button class="btn--verify story-toggle-status-btn" data-id="${storyId}" data-status="PUBLISHED" style="padding:4px 8px;font-size:11.5px;">Publish</button>`
              }
              <button class="btn btn--outline story-delete-btn" data-id="${storyId}" style="padding:4px 8px;font-size:11.5px;color:var(--red-700);">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width:60px;text-align:center;">Photo</th>
            <th>Title &amp; Location</th>
            <th>Amount Raised</th>
            <th>Date</th>
            <th>Status</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    // Edit handler
    container.querySelectorAll(".story-edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const s = cachedStories.find((x) => (x.id || x.storyId) === id);
        if (!s) return;

        editingStoryId = id;
        document.getElementById("story-modal-title").textContent = "Edit Story: " + s.title;
        document.getElementById("story-title").value = s.title || "";
        document.getElementById("story-category").value = s.category || "No Invisible Child";
        document.getElementById("story-county").value = s.county || "Montserrado";
        document.getElementById("story-community").value = s.community || "";
        document.getElementById("story-date").value = s.storyDate ? s.storyDate.slice(0, 10) : "";
        document.getElementById("story-raised").value = s.amountRaised != null ? s.amountRaised : 0;
        document.getElementById("story-goal").value = s.fundingGoal != null ? s.fundingGoal : "";
        document.getElementById("story-summary").value = s.summary || "";
        document.getElementById("story-speaker").value = s.speaker || "";
        document.getElementById("story-tag").value = s.tag || s.category || "";
        document.getElementById("story-quote").value = s.testimonial || "";
        document.getElementById("story-activities").value = s.activities || "";
        document.getElementById("story-content").value = s.narrative || "";
        document.getElementById("story-img-url").value = s.imageUrl || "";

        currentStoryImageDataUrl = s.imageUrl || "assets/uaf-logo.png";
        const imgPreview = document.getElementById("story-img-preview");
        if (imgPreview) imgPreview.src = currentStoryImageDataUrl;

        document.getElementById("story-modal").classList.remove("is-hidden");
      });
    });

    // Toggle status
    container.querySelectorAll(".story-toggle-status-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const newStatus = btn.dataset.status;
        const stories = getLocalStories();
        const idx = stories.findIndex((x) => (x.id || x.storyId) === id);
        if (idx >= 0) {
          stories[idx].status = newStatus;
          saveLocalStories(stories);
          cachedStories = stories;
          flash(`Story status updated to ${newStatus}.`, "success");
          renderStoriesTable(session);
        }
      });
    });

    // Delete handler
    container.querySelectorAll(".story-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const stories = getLocalStories();
        const target = stories.find((x) => (x.id || x.storyId) === id);
        if (!target) return;
        if (confirm(`Are you sure you want to permanently delete "${target.title}"?`)) {
          const updated = stories.filter((x) => (x.id || x.storyId) !== id);
          saveLocalStories(updated);
          cachedStories = updated;
          flash(`Deleted "${target.title}".`, "success");
          renderStoriesTable(session);
        }
      });
    });
  }

  function flash(message, kind) {
    const el = document.getElementById("stories-flash");
    if (!el) return;
    el.innerHTML = `<div class="admin-flash admin-flash--${kind === "success" ? "success" : "error"}">${escapeHtml(message)}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ""; }, 4000);
  }

  async function loadEvidence(session) {
    const container = document.getElementById("evidence-table-container");
    if (!container) return;
    container.innerHTML = '<p class="admin-muted" style="padding:24px;text-align:center;">Loading evidence requests…</p>';

    try {
      const res = await callApi("listEvidenceRequests", { token: session?.token });
      if (!res.ok) {
        container.innerHTML = `<div class="admin-error" style="margin:16px;">${escapeHtml(res.error || "No active connection to backend.")}</div>`;
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
      container.innerHTML = '<div class="admin-error" style="margin:16px;">Connection error or backend unavailable.</div>';
    }
  }

  async function handleUpdateEvidence(requestId, session) {
    const statuses = ["UNDER_REVIEW", "APPROVED", "FULFILLED", "REJECTED", "CLOSED"];
    const st = window.prompt(`Enter new status (${statuses.join(", ")}):`, "APPROVED");
    if (!st) return;

    const notes = window.prompt("Enter review notes or fulfillment link:", "Datasets provided securely via email");

    try {
      const res = await callApi("updateEvidenceRequest", {
        token: session?.token,
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
