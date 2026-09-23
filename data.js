/* =========================================================
   UAF IMPACT — LIVE PUBLIC DATA LAYER & OFFLINE-FIRST ENGINE
   Covers:
   - All 15 Counties of Liberia & Dynamic Community Indexing
   - Active Stories & Testimonials Dataset
   - Combined Statistics 7 KPIs & Comprehensive Directory Table
   - Impact Drive 5 Programs KPIs & Intervention Statements
   - Offline Queue & Auto-Sync Engine (Draft to Main System)
   ========================================================= */

(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";
  const isConfigured = API_URL && !API_URL.includes("PASTE_YOUR");

  let publicData = null;      // { counties, communities, funding, generatedAt }
  let fundingSummary = null;  // { totalVerifiedUSD, verifiedDonationCount, uniqueSupporterCount }

  /* ---------------------------------------------------------
     ALL 15 COUNTIES OF LIBERIA
  --------------------------------------------------------- */
  const ALL_15_COUNTIES = [
    "Bomi",
    "Bong",
    "Gbarpolu",
    "Grand Bassa",
    "Grand Cape Mount",
    "Grand Gedeh",
    "Grand Kru",
    "Lofa",
    "Margibi",
    "Maryland",
    "Montserrado",
    "Nimba",
    "River Cess",
    "River Gee",
    "Sinoe"
  ];
  window.UAF_COUNTIES = ALL_15_COUNTIES;

  /* ---------------------------------------------------------
     ACTIVE COMMUNITY STORIES & CAMPAIGNS DATASET (Dynamic Store)
  --------------------------------------------------------- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatMoney(num) {
    const n = Number(num) || 0;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const DEFAULT_STORIES_DATASET = [
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
      views: 0
    }
  ];

  function getUafStories() {
    try {
      const stored = localStorage.getItem("uaf_stories");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_STORIES_DATASET;
  }
  window.__uafGetStories = getUafStories;

  window.__uafGetStory = function (storyId) {
    const list = getUafStories();
    const found = list.find((s) => (s.id || s.storyId) === storyId);
    if (found) return found;
    return null;
  };

  function renderFundraisingStories() {
    const grid = document.getElementById("fundraising-stories-grid");
    if (!grid) return;

    const stories = getUafStories().filter((s) => String(s.status || "PUBLISHED").toUpperCase() !== "ARCHIVED");
    if (stories.length === 0) {
      grid.innerHTML = '<p style="padding:24px;text-align:center;color:var(--ink-400);grid-column:1/-1;">No active community stories at this time.</p>';
      return;
    }

    let viewsMap = {};
    try {
      viewsMap = JSON.parse(localStorage.getItem("uaf_story_views") || "{}");
    } catch (_) {}

    grid.innerHTML = stories.map((s) => {
      const storyId = s.id || s.storyId;
      const raised = Number(s.amountRaised || 0);
      const goal = Number(s.fundingGoal || 0);
      const views = (viewsMap[storyId] != null ? viewsMap[storyId] : (s.views || 0));
      const goalText = goal > 0 ? `<span class="goal-val">of ${formatMoney(goal)} goal</span>` : "";

      return `
        <div class="campaign-card campaign-card--clickable" data-story-id="${escapeHtml(storyId)}">
          <div class="campaign-card__img-wrap">
            <img src="${s.imageUrl || 'assets/uaf-logo.png'}" alt="${escapeHtml(s.title)}" class="campaign-card__img" onerror="this.src='assets/uaf-logo.png';" />
            <div class="campaign-card__views-badge">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span class="story-views-count" data-story-views="${escapeHtml(storyId)}">${views} ${views === 1 ? "read" : "reads"}</span>
            </div>
            <button type="button" class="btn-story-share-dots" data-share-story-id="${escapeHtml(storyId)}" title="Copy link to this story" aria-label="Share story link">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
          </div>
          <div class="campaign-card__body">
            <span class="campaign-card__tag">${escapeHtml(s.tag || s.category || "Field Story")}</span>
            <h3 class="campaign-card__title">${escapeHtml(s.title)}</h3>
            <p class="campaign-card__desc">${escapeHtml(s.summary || (s.narrative ? s.narrative.slice(0, 160) + "..." : ""))}</p>
            <div class="campaign-card__meta">
              <span class="raised-val">${formatMoney(raised)} raised</span>
              ${goalText}
            </div>
            <div class="story-card-action-group">
              <button type="button" class="btn-read-story-trigger" data-story-id="${escapeHtml(storyId)}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                <span>Read Full Story</span>
              </button>
              <button type="button" class="btn-story-support-trigger" data-story-id="${escapeHtml(storyId)}" data-story-title="${escapeHtml(s.title)}" data-story-category="${escapeHtml(s.tag || s.category || '')}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span>Support this Story</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    if (window.__uafInitStoryCarousel) {
      window.__uafInitStoryCarousel();
    }
  }
  window.__uafRenderFundraisingStories = renderFundraisingStories;

  /* ---------------------------------------------------------
     PARTNERS & COLLABORATORS DATASET (Dynamic Store)
  --------------------------------------------------------- */
  const DEFAULT_PARTNERS_DATASET = [
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

  function getUafPartners() {
    try {
      const stored = localStorage.getItem("uaf_partners");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_PARTNERS_DATASET;
  }
  window.__uafGetPartners = getUafPartners;

  function renderPartners() {
    const container = document.getElementById("partners-grid-display");
    if (!container) return;

    const partners = getUafPartners();
    if (partners.length === 0) {
      container.innerHTML = '<p style="padding:24px;text-align:center;color:var(--ink-400);grid-column:1/-1;">No partners registered yet.</p>';
      return;
    }

    container.innerHTML = partners.map((p) => `
      <div class="partner-card">
        <div class="partner-card__logo-wrap">
          <img src="${p.logoUrl || 'assets/uaf-logo.png'}" alt="${escapeHtml(p.name)}" class="partner-card__logo" onerror="this.src='assets/uaf-logo.png';" />
        </div>
        <div class="partner-card__title">${escapeHtml(p.name)}</div>
        <div class="partner-card__type">${escapeHtml(p.type || "Collaborator")}</div>
        <p class="partner-card__desc">${escapeHtml(p.desc || "")}</p>
      </div>
    `).join("");
  }
  window.__uafRenderPartners = renderPartners;

  // Real-time synchronization event listeners
  window.addEventListener("uaf_stories_updated", renderFundraisingStories);
  window.addEventListener("uaf_partners_updated", renderPartners);
  window.addEventListener("storage", (e) => {
    if (e.key === "uaf_stories") renderFundraisingStories();
    if (e.key === "uaf_partners") renderPartners();
  });

  /* ---------------------------------------------------------
     DEFAULT FALLBACK DATA (Clean Baseline across 15 Counties)
  --------------------------------------------------------- */
  const DEFAULT_COMMUNITIES = [];

  /* ---------------------------------------------------------
     STORAGE HELPERS FOR ADMIN DATA
  --------------------------------------------------------- */
  function getAdminCommunities() {
    try {
      const stored = localStorage.getItem("uaf_admin_communities");
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  }

  function getAdminFunding() {
    try {
      const stored = localStorage.getItem("uaf_admin_funding");
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  }

  function getAdminImpactKpis() {
    try {
      const stored = localStorage.getItem("uaf_admin_impact_kpis");
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  }

  /* ---------------------------------------------------------
     DYNAMIC COMMUNITIES ENGINE (Indexed in Local Storage)
  --------------------------------------------------------- */
  function getDynamicCommunities() {
    try {
      const stored = localStorage.getItem("uaf_dynamic_communities");
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  }

  function registerDynamicCommunity(commName, countyName, childCount) {
    if (!commName || !countyName) return;
    const cleanComm = commName.trim();
    const cleanCounty = countyName.trim();
    const count = Number(childCount) || 1;

    const list = getDynamicCommunities();
    const existingIdx = list.findIndex(
      (c) => c.community.toLowerCase() === cleanComm.toLowerCase() && c.county.toLowerCase() === cleanCounty.toLowerCase()
    );

    if (existingIdx >= 0) {
      list[existingIdx].outOfSchoolIdentified += count;
      list[existingIdx].yetToEnroll += count;
      list[existingIdx].childPopulation = (list[existingIdx].childPopulation || 0) + count * 4;
      list[existingIdx].amountNeeded = (list[existingIdx].amountNeeded || 0) + count * 125;
    } else {
      list.push({
        community: cleanComm,
        county: cleanCounty,
        year: "2026",
        outOfSchoolIdentified: count,
        supportedReenrolled: 0,
        yetToEnroll: count,
        childPopulation: Math.max(50, count * 4),
        parentsEmpowered: Math.max(1, Math.round(count * 0.4)),
        schoolPartners: 1,
        amountNeeded: count * 125,
        amountGenerated: 0
      });
    }

    try {
      localStorage.setItem("uaf_dynamic_communities", JSON.stringify(list));
    } catch (_) {}

    refreshMergedDataset();
    renderAll();
    updateCommunityDropdown(getSelectedFilters().county);
  }

  function getMergedCommunities() {
    const dynamic = getDynamicCommunities();
    const adminComms = getAdminCommunities();
    const base = (publicData && Array.isArray(publicData.communities) && publicData.communities.length > 0)
      ? publicData.communities
      : (adminComms.length > 0 ? adminComms : DEFAULT_COMMUNITIES);

    const map = new Map();
    base.forEach((c) => {
      const key = `${(c.county || "").toLowerCase()}|${(c.community || "").toLowerCase()}`;
      map.set(key, { ...c });
    });

    dynamic.forEach((d) => {
      const key = `${(d.county || "").toLowerCase()}|${(d.community || "").toLowerCase()}`;
      if (map.has(key)) {
        const item = map.get(key);
        item.outOfSchoolIdentified = (Number(item.outOfSchoolIdentified) || 0) + (Number(d.outOfSchoolIdentified) || 0);
        item.yetToEnroll = (Number(item.yetToEnroll) || 0) + (Number(d.yetToEnroll) || 0);
        item.amountNeeded = (Number(item.amountNeeded) || 0) + (Number(d.amountNeeded) || 0);
      } else {
        map.set(key, { ...d });
      }
    });

    return Array.from(map.values());
  }

  function refreshMergedDataset() {
    if (!publicData) publicData = {};
    publicData.communities = getMergedCommunities();
  }

  /* ---------------------------------------------------------
     OFFLINE QUEUE & AUTO-SYNC ENGINE (Draft to Main System)
  --------------------------------------------------------- */
  function getOfflineQueue() {
    try {
      return JSON.parse(localStorage.getItem("uaf_offline_queue") || "[]");
    } catch (_) {
      return [];
    }
  }

  function saveOfflineQueue(queue) {
    try {
      localStorage.setItem("uaf_offline_queue", JSON.stringify(queue));
    } catch (_) {}
    window.__uafUpdateOnlineStatus && window.__uafUpdateOnlineStatus();
  }

  function queueOfflineDraft(type, payload, friendlyDesc) {
    const queue = getOfflineQueue();
    const item = {
      id: "draft_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      type: type,
      payload: payload,
      friendlyDesc: friendlyDesc,
      queuedAt: new Date().toISOString(),
      status: "draft"
    };
    queue.push(item);
    saveOfflineQueue(queue);

    window.__uafShowToast?.("Saved offline as draft. Submission will auto-sync once internet connection is restored.");
  }

  let isSyncing = false;
  async function syncOfflineDrafts() {
    if (isSyncing) return;
    const queue = getOfflineQueue();
    if (!queue.length) return;

    if (!navigator.onLine) {
      return;
    }

    isSyncing = true;
    console.info(`UAF Impact: Auto-syncing ${queue.length} offline draft(s)...`);

    const successfulIds = [];
    for (const draft of queue) {
      try {
        if (isConfigured) {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(draft.payload)
          });
          const json = await res.json();
          if (json.ok) {
            successfulIds.push(draft.id);
          }
        } else {
          // Local offline-first fallback sync
          if (draft.type === "submitOutOfSchoolReport") {
            const reports = JSON.parse(localStorage.getItem("uaf_ossc_reports") || "[]");
            reports.unshift({ ...draft.payload, syncedAt: new Date().toISOString() });
            localStorage.setItem("uaf_ossc_reports", JSON.stringify(reports));
          } else if (draft.type === "createDonation") {
            const donations = JSON.parse(localStorage.getItem("uaf_local_donations") || "[]");
            donations.unshift({ ...draft.payload, syncedAt: new Date().toISOString() });
            localStorage.setItem("uaf_local_donations", JSON.stringify(donations));
          }
          successfulIds.push(draft.id);
        }
      } catch (err) {
        console.warn("UAF Impact: Sync failed for draft", draft.id, err);
      }
    }

    if (successfulIds.length > 0) {
      const remaining = queue.filter((d) => !successfulIds.includes(d.id));
      saveOfflineQueue(remaining);
      window.__uafShowToast?.(`Sync complete! ${successfulIds.length} draft(s) successfully synced to main system.`);
      loadFundingSummary();
    }

    isSyncing = false;
    window.__uafUpdateOnlineStatus && window.__uafUpdateOnlineStatus();
  }
  window.__uafSyncOfflineDrafts = syncOfflineDrafts;

  /* ---------------------------------------------------------
     FETCH — PUBLIC DATA
  --------------------------------------------------------- */
  async function loadPublicData() {
    if (!isConfigured) {
      const adminFunding = getAdminFunding();
      publicData = {
        communities: getMergedCommunities(),
        funding: adminFunding || {
          totalGeneratedUSD: 0,
          totalNeededUSD: 0,
          lastUpdated: new Date().toISOString()
        }
      };
      renderAll();
      return;
    }
    try {
      const res = await fetch(`${API_URL}?route=publicData`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown API error");
      publicData = json;
      refreshMergedDataset();
      renderAll();
    } catch (err) {
      console.warn("UAF Impact: failed to load live public data, using local storage baseline.", err);
      const adminFunding = getAdminFunding();
      publicData = {
        communities: getMergedCommunities(),
        funding: adminFunding || {
          totalGeneratedUSD: 0,
          totalNeededUSD: 0,
          lastUpdated: new Date().toISOString()
        }
      };
      renderAll();
    }
  }

  /* ---------------------------------------------------------
     FETCH — FUNDING SUMMARY
  --------------------------------------------------------- */
  async function loadFundingSummary() {
    if (!isConfigured) return;
    try {
      const res = await fetch(`${API_URL}?route=fundingSummary`);
      const json = await res.json();
      if (json.ok) {
        fundingSummary = json;
        renderCombinedStatistics();
        renderImpactDashboard();
      }
    } catch (err) {
      console.warn("UAF Impact: couldn't load remote funding summary.", err);
    }
  }

  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */
  function sum(list, key) {
    return list.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString("en-US");
  }

  function fmtUSD(n) {
    return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDate(iso) {
    if (!iso) return "Recently verified";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Recently verified";
    return d.toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* ---------------------------------------------------------
     FILTER STATE & SELECTORS
  --------------------------------------------------------- */
  function getSelectedFilters() {
    const countySel = document.getElementById("stats-county");
    const communitySel = document.getElementById("stats-community");
    const yearSel = document.getElementById("stats-year");
    return {
      county: countySel ? countySel.value : "",
      community: communitySel ? communitySel.value : "",
      year: yearSel ? yearSel.value : ""
    };
  }

  function filterCommunities(filter) {
    const dataset = (publicData && publicData.communities) ? publicData.communities : getMergedCommunities();
    return dataset.filter((c) => {
      if (filter.county && c.county !== filter.county) return false;
      if (filter.community && c.community !== filter.community) return false;
      if (filter.year && String(c.year) !== String(filter.year)) return false;
      return true;
    });
  }

  function updateCommunityDropdown(selectedCounty) {
    const communitySel = document.getElementById("stats-community");
    if (!communitySel) return;

    const dataset = (publicData && publicData.communities) ? publicData.communities : getMergedCommunities();
    const currentVal = communitySel.value;
    communitySel.innerHTML = "";

    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = selectedCounty ? "All communities in " + selectedCounty : "All communities";
    communitySel.appendChild(optAll);

    const relevant = selectedCounty
      ? dataset.filter((c) => c.county === selectedCounty)
      : dataset;

    const uniqueCommunities = Array.from(new Set(relevant.map((c) => c.community))).sort();
    uniqueCommunities.forEach((com) => {
      const opt = document.createElement("option");
      opt.value = com;
      opt.textContent = com;
      if (com === currentVal) opt.selected = true;
      communitySel.appendChild(opt);
    });
  }

  /* ---------------------------------------------------------
     RENDER — SCREEN 3: COMBINED COMMUNITIES STATISTICS & DIRECTORY
     Populates the 7 required KPIs:
     1. # of Parents Empowered with Skill Training
     2. # of Children Awaiting Support
     3. Communities Reached
     4. # of School Partners
     5. Amount Needed
     6. Amount Raised
     7. Balance to Raise
     Plus funding gap progress bar & full community directory table.
  --------------------------------------------------------- */
  function renderCombinedStatistics() {
    const screen = document.querySelector('[data-screen="statistics"]');
    if (!screen) return;

    const filter = getSelectedFilters();
    const rows = filterCommunities(filter);

    // Elements
    const parentsEl = document.getElementById("stat-parents-empowered");
    const identifiedEl = document.getElementById("stat-children-identified");
    const awaitingEl = document.getElementById("stat-children-awaiting");
    const commsEl = document.getElementById("stat-communities-reached");
    const schoolsEl = document.getElementById("stat-school-partners");
    const neededEl = document.getElementById("stat-amount-needed");
    const raisedEl = document.getElementById("stat-amount-raised");
    const balanceEl = document.getElementById("stat-balance-to-raise");

    const fillEl = document.getElementById("funding-bar-fill");
    const pctEl = document.getElementById("funding-progress-pct");
    const lastUpdatedEl = document.getElementById("stats-last-updated");
    const tbody = document.getElementById("stats-combined-table-body");

    if (!rows.length) {
      if (parentsEl) parentsEl.textContent = "0";
      if (identifiedEl) identifiedEl.textContent = "0";
      if (awaitingEl) awaitingEl.textContent = "0";
      if (commsEl) commsEl.textContent = "0";
      if (schoolsEl) schoolsEl.textContent = "0";
      if (neededEl) neededEl.textContent = "$0.00";
      if (raisedEl) raisedEl.textContent = "$0.00";
      if (balanceEl) balanceEl.textContent = "$0.00";
      if (fillEl) fillEl.style.width = "0%";
      if (pctEl) pctEl.textContent = "0%";
      if (lastUpdatedEl) {
        lastUpdatedEl.textContent = "Last updated: " + fmtDate(fundingSummary?.generatedAt || publicData?.funding?.lastUpdated);
      }
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:32px; color:var(--ink-500); font-weight:500;">No community records published yet. Field verifications and admin entries will appear here.</td></tr>`;
      }
      return;
    }

    const parentsEmpowered = sum(rows, "parentsEmpowered");
    const outOfSchoolIdentified = sum(rows, "outOfSchoolIdentified");
    const childrenAwaiting = sum(rows, "yetToEnroll");
    const communitiesReached = new Set(rows.map((r) => `${r.county}|${r.community}`)).size;
    const schoolPartners = sum(rows, "schoolPartners");
    const totalNeeded = sum(rows, "amountNeeded");
    const totalRaised = fundingSummary && !filter.county && !filter.community
      ? fundingSummary.totalVerifiedUSD
      : sum(rows, "amountGenerated");
    const balanceToRaise = Math.max(0, totalNeeded - totalRaised);

    if (parentsEl) parentsEl.textContent = fmt(parentsEmpowered);
    if (identifiedEl) identifiedEl.textContent = fmt(outOfSchoolIdentified);
    if (awaitingEl) awaitingEl.textContent = fmt(childrenAwaiting);
    if (commsEl) commsEl.textContent = fmt(communitiesReached);
    if (schoolsEl) schoolsEl.textContent = fmt(schoolPartners);
    if (neededEl) neededEl.textContent = fmtUSD(totalNeeded);
    if (raisedEl) raisedEl.textContent = fmtUSD(totalRaised);
    if (balanceEl) balanceEl.textContent = fmtUSD(balanceToRaise);

    // Progress Bar
    if (totalNeeded > 0) {
      const pct = Math.min(100, Math.round((totalRaised / totalNeeded) * 100));
      if (fillEl) fillEl.style.width = pct + "%";
      if (pctEl) pctEl.textContent = pct + "%";
    }

    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = "Last updated: " + fmtDate(fundingSummary?.generatedAt || publicData?.funding?.lastUpdated);
    }

    // Render 10-column table
    if (tbody) {
      tbody.innerHTML = rows.map((r) => {
        const bal = Math.max(0, (r.amountNeeded || 0) - (r.amountGenerated || 0));
        return `
          <tr>
            <td><strong>${escapeHtml(r.community)}</strong></td>
            <td>${escapeHtml(r.county)}</td>
            <td>${fmt(r.outOfSchoolIdentified)}</td>
            <td>${fmt(r.supportedReenrolled)}</td>
            <td>${fmt(r.yetToEnroll)}</td>
            <td>${fmt(r.parentsEmpowered || 0)}</td>
            <td>${fmt(r.schoolPartners || 1)}</td>
            <td>${fmtUSD(r.amountNeeded)}</td>
            <td>${fmtUSD(r.amountGenerated)}</td>
            <td><strong style="color:var(--blue-700);">${fmtUSD(bal)}</strong></td>
          </tr>
        `;
      }).join("");
    }
  }

  /* ---------------------------------------------------------
     RENDER — SCREEN 4: IMPACT DRIVE (5 General Overview KPIs)
     1. # of Children Enrolled & Supported
     2. # of Women Trained with Skills
     3. # of People Trained in Computer
     4. # of Youths Impacted through Youth Development
     5. # of Students Impacted through Career Development
  --------------------------------------------------------- */
  function renderImpactDashboard() {
    const screen = document.querySelector('[data-screen="impact-drive"]');
    if (!screen) return;

    const adminKpis = getAdminImpactKpis();
    const allRows = getMergedCommunities();

    const childrenTotal = adminKpis?.children != null
      ? Number(adminKpis.children)
      : (allRows.length > 0 ? sum(allRows, "supportedReenrolled") : 0);
    const womenTotal = adminKpis?.women != null
      ? Number(adminKpis.women)
      : (allRows.length > 0 ? sum(allRows, "parentsEmpowered") : 0);
    const computerTotal = adminKpis?.computer != null ? Number(adminKpis.computer) : 0;
    const youthTotal = adminKpis?.youth != null ? Number(adminKpis.youth) : 0;
    const careerTotal = adminKpis?.career != null ? Number(adminKpis.career) : 0;

    const elChildren = document.getElementById("impact-kpi-children");
    const elWomen = document.getElementById("impact-kpi-women");
    const elComputer = document.getElementById("impact-kpi-computer");
    const elYouth = document.getElementById("impact-kpi-youth");
    const elCareer = document.getElementById("impact-kpi-career");

    if (elChildren) elChildren.textContent = childrenTotal > 0 ? fmt(childrenTotal) + "+" : "0";
    if (elWomen) elWomen.textContent = womenTotal > 0 ? fmt(womenTotal) + "+" : "0";
    if (elComputer) elComputer.textContent = computerTotal > 0 ? fmt(computerTotal) + "+" : "0";
    if (elYouth) elYouth.textContent = youthTotal > 0 ? fmt(youthTotal) + "+" : "0";
    if (elCareer) elCareer.textContent = careerTotal > 0 ? fmt(careerTotal) + "+" : "0";
  }

  /* ---------------------------------------------------------
     RENDER — UAF PROGRAMS (from storage or defaults)
  --------------------------------------------------------- */
  function renderUafPrograms() {
    const grid = document.querySelector(".programs-square-grid");
    if (!grid) return;
    let programs = null;
    try {
      const stored = localStorage.getItem("uaf_programs");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) programs = parsed;
      }
    } catch (e) {}
    if (!programs) return; // Keep standard HTML baseline

    grid.innerHTML = programs.map((p) => {
      const isUrl = p.goto && (p.goto.startsWith("http://") || p.goto.startsWith("https://"));
      const clickAttr = isUrl ? `onclick="window.open('${p.goto}','_blank')"` : (p.goto ? `data-goto="${p.goto}"` : "");
      return `
        <div class="program-item-card" ${clickAttr}>
          <div class="program-item__icon">${p.icon ? escapeHtml(p.icon) : '<span class="program-badge-bullet"></span>'}</div>
          <div class="program-item__title">${escapeHtml(p.title)}</div>
          <p class="program-item__desc">${escapeHtml(p.desc)}</p>
          <span class="program-item__tag">${escapeHtml(p.tag || "Program")}</span>
        </div>
      `;
    }).join("");

    grid.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", () => {
        window.__uafGoTo && window.__uafGoTo(el.dataset.goto);
      });
    });
  }

  window.addEventListener("uaf_data_updated", () => {
    refreshMergedDataset();
    renderAll();
  });
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith("uaf_")) {
      refreshMergedDataset();
      renderAll();
    }
  });

  /* ---------------------------------------------------------
     RENDER — PARTNERS (from storage or defaults)
  --------------------------------------------------------- */
  function renderPartners() {
    const container = document.getElementById("partners-grid-display");
    if (!container) return;
    let partners = null;
    try {
      const stored = localStorage.getItem("uaf_partners");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) partners = parsed;
      }
    } catch (e) {}
    if (!partners) return;

    container.innerHTML = partners.map((p) => `
      <div class="partner-card">
        <div class="partner-card__logo-wrap">
          <img src="${p.logoUrl || 'assets/uaf-logo.png'}" alt="${escapeHtml(p.name)}" class="partner-card__logo" />
        </div>
        <div class="partner-card__title">${escapeHtml(p.name)}</div>
        <div class="partner-card__type">${escapeHtml(p.type || "Partner")}</div>
        <p class="partner-card__desc">${escapeHtml(p.desc || "")}</p>
      </div>
    `).join("");
  }
  window.addEventListener("uaf_partners_updated", renderPartners);
  window.addEventListener("uaf_programs_updated", renderUafPrograms);

  function renderAll() {
    renderCombinedStatistics();
    renderImpactDashboard();
    renderUafPrograms();
    renderPartners();
  }

  /* ---------------------------------------------------------
     SELECTORS POPULATION & LISTENERS (All 15 Counties)
  --------------------------------------------------------- */
  function initSelectorDropdowns() {
    const countySel = document.getElementById("stats-county");
    const yearSel = document.getElementById("stats-year");
    const repCountySel = document.getElementById("rep-county");
    const repChildCountySel = document.getElementById("rep-child-county");

    const years = ["2026", "2027"];

    if (countySel) {
      countySel.innerHTML = '<option value="">All 15 Counties</option>';
      ALL_15_COUNTIES.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        countySel.appendChild(opt);
      });

      countySel.addEventListener("change", () => {
        updateCommunityDropdown(countySel.value);
        renderCombinedStatistics();
      });
    }

    if (repCountySel) {
      repCountySel.innerHTML = '<option value="">Select County</option>';
      ALL_15_COUNTIES.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        repCountySel.appendChild(opt);
      });
    }

    if (repChildCountySel && repChildCountySel.options.length <= 1) {
      repChildCountySel.innerHTML = '<option value="">Select Child County</option>';
      ALL_15_COUNTIES.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        repChildCountySel.appendChild(opt);
      });
    }

    if (yearSel) {
      yearSel.innerHTML = '<option value="">All years</option>';
      years.forEach((y) => {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearSel.appendChild(opt);
      });
      yearSel.addEventListener("change", renderCombinedStatistics);
    }

    const commSel = document.getElementById("stats-community");
    if (commSel) {
      commSel.addEventListener("change", renderCombinedStatistics);
    }

    updateCommunityDropdown("");
  }

  function readFileAsBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  /* ---------------------------------------------------------
     FORM 1: OUT-OF-SCHOOL INTAKE (#report-form)
     Multi-Child Intake & Safeguarding Records with Dynamic Community Registration
  --------------------------------------------------------- */
  function initReportForm() {
    const form = document.getElementById("report-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const reporterName = document.getElementById("rep-name")?.value.trim() || "";
      const reporterPhone = document.getElementById("rep-phone")?.value.trim() || "";
      const reporterOrg = document.getElementById("rep-org")?.value.trim() || "";
      const community = document.getElementById("rep-community")?.value.trim() || "";
      const county = document.getElementById("rep-county")?.value.trim() || "";
      const childCountInput = document.getElementById("rep-count");

      if (!reporterName || !reporterPhone || !community || !county) {
        window.__uafShowToast?.("Please complete all required reporter information.");
        return;
      }

      const childCards = form.querySelectorAll(".child-profile-card");
      if (childCards.length === 0) {
        window.__uafShowToast?.("Please provide at least one child profile.");
        return;
      }

      const children = [];
      for (let i = 0; i < childCards.length; i++) {
        const card = childCards[i];
        const name = card.querySelector(".child-name")?.value.trim() || "";
        const gender = card.querySelector(".child-gender")?.value || "";
        const age = Number(card.querySelector(".child-age")?.value) || 0;
        const origin = card.querySelector(".child-origin")?.value || "";
        const childComm = card.querySelector(".child-community")?.value.trim() || community;
        const livingWith = card.querySelector(".child-living-with")?.value || "";
        const parentName = card.querySelector(".parent-name")?.value.trim() || "";
        const parentPhone = card.querySelector(".parent-phone")?.value.trim() || "";
        const yearsOut = card.querySelector(".child-years-out")?.value.trim() || "";
        const currentClass = card.querySelector(".child-class")?.value.trim() || "";
        const causeOfExclusion = card.querySelector(".child-cause")?.value || "";
        const abuseObserved = card.querySelector(".child-abuse-obs")?.value || "No";
        const abuseType = card.querySelector(".child-abuse-type")?.value || "";
        const statement = card.querySelector(".child-statement")?.value.trim() || "";
        const consent = card.querySelector(".child-consent")?.checked || false;

        if (!name || !gender || !age || !origin || !livingWith || !causeOfExclusion || !statement || !consent) {
          window.__uafShowToast?.(`Please complete all required fields and consent for Child #${i + 1}.`);
          return;
        }

        // Read child photo
        const childPhotoInput = card.querySelector(".child-photo");
        let childPhotoData = "";
        if (childPhotoInput && childPhotoInput.files && childPhotoInput.files[0]) {
          try {
            childPhotoData = await readFileAsBase64(childPhotoInput.files[0]);
          } catch (_) {}
        }

        // Read parent photo
        const parentPhotoInput = card.querySelector(".parent-photo");
        let parentPhotoData = "";
        if (parentPhotoInput && parentPhotoInput.files && parentPhotoInput.files[0]) {
          try {
            parentPhotoData = await readFileAsBase64(parentPhotoInput.files[0]);
          } catch (_) {}
        }

        children.push({
          childName: name,
          gender,
          childAge: age,
          childOrigin: origin,
          childCommunity: childComm,
          livingWith,
          childPhotoData,
          parentName,
          parentPhone,
          parentPhotoData,
          yearsOut,
          currentClass,
          causeOfExclusion,
          abuseObserved,
          abuseType: abuseObserved === "Yes" ? abuseType : "",
          statement,
          consent
        });
      }

      submitBtn?.setAttribute("disabled", "true");

      const firstChild = children[0] || {};
      const payload = {
        action: "submitOutOfSchoolReport",
        reporterName,
        reporterPhone,
        reporterOrg,
        community,
        county,
        childCount: children.length,
        // Backward compatibility single child aliases
        childName: children.map((c) => c.childName).join(", "),
        gender: firstChild.gender || "",
        childCommunity: firstChild.childCommunity || community,
        childCounty: firstChild.childOrigin || county,
        photoData: firstChild.childPhotoData || "",
        yearsOut: firstChild.yearsOut || "",
        currentClass: firstChild.currentClass || "",
        causeOfExclusion: firstChild.causeOfExclusion || "",
        parentName: firstChild.parentName || "",
        parentPhone: firstChild.parentPhone || "",
        statement: firstChild.statement || "",
        consent: firstChild.consent || false,
        // Complete multi-child structure
        children,
        timestamp: new Date().toISOString()
      };

      // Register the submitted community dynamically under its respective county
      registerDynamicCommunity(firstChild.childCommunity || community, firstChild.childOrigin || county, children.length);

      // OFFLINE HANDLING
      if (!navigator.onLine) {
        queueOfflineDraft("submitOutOfSchoolReport", payload, `OSSC: ${payload.childName} (${payload.childCommunity}, ${payload.childCounty})`);
        form.reset();
        if (childCountInput) {
          childCountInput.value = "1";
          childCountInput.dispatchEvent(new Event("change"));
        }
        submitBtn?.removeAttribute("disabled");
        return;
      }

      if (!isConfigured) {
        try {
          const reports = JSON.parse(localStorage.getItem("uaf_ossc_reports") || "[]");
          reports.unshift(payload);
          localStorage.setItem("uaf_ossc_reports", JSON.stringify(reports));
        } catch (_) {}

        window.__uafShowToast?.("Report submitted! A UAF verifier will investigate before publication.");
        form.reset();
        if (childCountInput) {
          childCountInput.value = "1";
          childCountInput.dispatchEvent(new Event("change"));
        }
        submitBtn?.removeAttribute("disabled");
        return;
      }

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.ok) {
          window.__uafShowToast?.(json.message || "Submitted for verification. Thank you.");
          form.reset();
          if (childCountInput) {
            childCountInput.value = "1";
            childCountInput.dispatchEvent(new Event("change"));
          }
        } else {
          window.__uafShowToast?.(json.error || "Couldn't submit — saved as offline draft.");
          queueOfflineDraft("submitOutOfSchoolReport", payload, `OSSC: ${payload.childName}`);
          form.reset();
          if (childCountInput) {
            childCountInput.value = "1";
            childCountInput.dispatchEvent(new Event("change"));
          }
        }
      } catch (err) {
        queueOfflineDraft("submitOutOfSchoolReport", payload, `OSSC: ${payload.childName}`);
        form.reset();
        if (childCountInput) {
          childCountInput.value = "1";
          childCountInput.dispatchEvent(new Event("change"));
        }
      } finally {
        submitBtn?.removeAttribute("disabled");
      }
    });
  }

  /* ---------------------------------------------------------
     FORM 2: REQUEST DATA & EVIDENCE (#evidence-form)
     Offline-first draft queuing with Reason & Referral Source
  --------------------------------------------------------- */
  function initEvidenceForm() {
    const form = document.getElementById("evidence-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const name = document.getElementById("ev-name")?.value.trim() || "";
      const email = document.getElementById("ev-email")?.value.trim() || "";
      const organization = document.getElementById("ev-org")?.value.trim() || "";
      const requestReason = document.getElementById("ev-reason")?.value.trim() || "";
      const referralSource = document.getElementById("ev-source")?.value.trim() || "";
      const requestDetails = document.getElementById("ev-request")?.value.trim() || "";

      if (!name || !email || !requestDetails) {
        window.__uafShowToast?.("Please complete all required evidence fields.");
        return;
      }

      const payload = {
        action: "submitEvidenceRequest",
        name,
        email,
        organization,
        requestReason,
        referralSource,
        requestDetails,
        timestamp: new Date().toISOString()
      };

      if (!navigator.onLine) {
        queueOfflineDraft("submitEvidenceRequest", payload, `Data Request: ${name} (${organization || "Individual"})`);
        form.reset();
        return;
      }

      if (!isConfigured) {
        try {
          const reqs = JSON.parse(localStorage.getItem("uaf_evidence_requests") || "[]");
          reqs.unshift(payload);
          localStorage.setItem("uaf_evidence_requests", JSON.stringify(reqs));
        } catch (_) {}

        window.__uafShowToast?.("Evidence request submitted. A UAF verifier will review it.");
        form.reset();
        return;
      }

      submitBtn?.setAttribute("disabled", "true");
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (json.ok) {
          window.__uafShowToast?.(json.message || "Evidence request received. Thank you.");
          form.reset();
        } else {
          queueOfflineDraft("submitEvidenceRequest", payload, `Data Request: ${name}`);
          form.reset();
        }
      } catch (err) {
        queueOfflineDraft("submitEvidenceRequest", payload, `Data Request: ${name}`);
        form.reset();
      } finally {
        submitBtn?.removeAttribute("disabled");
      }
    });
  }

  /* ---------------------------------------------------------
     BROCHURE PDF DOWNLOAD (Screen 5: Request Data)
  --------------------------------------------------------- */
  function initBrochureDownload() {
    const downloadBtn = document.getElementById("btn-download-uaf-brochure");
    if (!downloadBtn) return;

    downloadBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const customBrochure = localStorage.getItem("uaf_brochure_pdf");
      if (customBrochure) {
        const a = document.createElement("a");
        a.href = customBrochure;
        a.download = "UAF_Institutional_Brochure_2026.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.__uafShowToast?.("Downloading official UAF Institutional Brochure (PDF)...");
        return;
      }

      // Generate built-in official UAF Institutional Brochure PDF
      generateDefaultBrochurePDF();
    });
  }

  function generateDefaultBrochurePDF() {
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Title (Upskill Africa Foundation - Institutional Overview)
   /Author (Upskill Africa Foundation)
   /Creator (UAF Impact Platform)
   /Producer (UAF Document Engine)
   /CreationDate (D:20260321120000) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>
endobj
5 0 obj
<< /Length 750 >>
stream
BT
/F1 20 Tf
50 740 Td
(UPSKILL AFRICA FOUNDATION - UAF LIBERIA) Tj
0 -26 Td
/F1 13 Tf
(Protecting Children. Promoting Education. Empowering Communities.) Tj
0 -30 Td
/F1 11 Tf
(INSTITUTIONAL BROCHURE & STRATEGIC OVERVIEW (2026-2027)) Tj
0 -24 Td
(1. NO INVISIBLE CHILD (NIC): Community identification and school reintegration.) Tj
0 -18 Td
(2. CHILD PROTECTION: Rigorous field safeguarding protocols & ethical case monitoring.) Tj
0 -18 Td
(3. LIVELIHOOD EMPOWERMENT: Vocational soap making, tie-dye, and household savings.) Tj
0 -18 Td
(4. ALTERNATIVE LEARNING PROGRAM (ALP): Digital literacy & basic tech skills for youth.) Tj
0 -30 Td
/F1 10 Tf
(CHILD SAFEGUARDING POLICY & CONFIDENTIALITY:) Tj
0 -16 Td
(UAF strictly enforces the Child Rights Law of Liberia. Child identity data is) Tj
0 -14 Td
(accessible only to authorized child protection officers and certified partners.) Tj
0 -30 Td
(CONTACT & PHYSICAL LOCATION:) Tj
0 -16 Td
(Address: Duport Road, Paynesville, Montserrado County, Liberia) Tj
0 -14 Td
(Telephone / WhatsApp: +231 889 541 712 | Email: upskillafrica.lr@gmail.com) Tj
0 -14 Td
(Website: https://uafalp.blogspot.com/) Tj
ET
endstream
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000186 00000 n 
0000000236 00000 n 
0000000302 00000 n 
0000000424 00000 n 
0000001227 00000 n 
trailer
<< /Size 7 /Root 2 0 R /Info 1 0 R >>
startxref
1304
%%EOF`;

    const blob = new Blob([pdfContent], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "UAF_Institutional_Brochure_2026.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    window.__uafShowToast?.("Downloading official UAF Institutional Brochure (PDF)...");
  }

  /* ---------------------------------------------------------
     FORM 3: DONATION RECORDING (#donation-form)
     Offline-first draft queuing with live toast feedback
  --------------------------------------------------------- */
  function initDonationForm() {
    const form = document.getElementById("donation-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById("don-submit-btn") || form.querySelector('button[type="submit"]');

      // 1. Amount selection
      let amount = 0;
      const selectedChip = document.querySelector(".amount-chip--classic.is-selected, .amount-chip.is-selected");
      const customInput = document.getElementById("custom-amount");
      if (customInput && customInput.value && Number(customInput.value) > 0) {
        amount = Number(customInput.value);
      } else if (selectedChip) {
        if (selectedChip.dataset.amount === "custom") {
          amount = Number(customInput?.value || 0);
        } else {
          amount = Number(selectedChip.dataset.amount || 0);
        }
      }

      if (!amount || amount <= 0) {
        window.__uafShowToast?.("Please select or enter a valid donation amount.");
        return;
      }

      // 2. Currency & Frequency
      const activeCurrencyBtn = document.querySelector(".currency-btn.is-active");
      const currency = activeCurrencyBtn?.dataset.currency || "USD";

      const activeFreqChip = document.querySelector(".freq-chip.is-selected, .frequency-chip.is-selected");
      const frequency = activeFreqChip?.dataset.frequency || "Once";

      const impactArea = document.getElementById("don-impact-area")?.value || "General Support";

      // 3. Donor Details
      const name = document.getElementById("don-name")?.value.trim() || "";
      const phone = document.getElementById("don-phone")?.value.trim() || "";
      const email = document.getElementById("don-email")?.value.trim() || "";
      const address = document.getElementById("don-address")?.value.trim() || "";
      const country = document.getElementById("don-country")?.value.trim() || "Liberia";
      const message = document.getElementById("don-message")?.value.trim() || "";
      const anonymous = document.getElementById("don-anon")?.checked || false;
      const consent = document.getElementById("don-consent")?.checked || false;

      const dedicatedStoryTitle = document.getElementById("don-dedicated-story-title")?.value.trim() || "";
      const dedicatedStoryId = document.getElementById("don-dedicated-story-id")?.value.trim() || "";

      let finalMessage = message;
      if (dedicatedStoryTitle && !finalMessage.includes(dedicatedStoryTitle)) {
        finalMessage = finalMessage ? `[Dedicated to: ${dedicatedStoryTitle}] ${finalMessage}` : `[Dedicated to: ${dedicatedStoryTitle}]`;
      }

      if (!name || !phone || !address || !consent) {
        window.__uafShowToast?.("Full name, phone, home address, and communication consent are required.");
        return;
      }

      submitBtn?.setAttribute("disabled", "true");
      const span = submitBtn.querySelector("span");
      const originalText = span ? span.textContent : submitBtn.textContent;
      if (span) span.textContent = "Recording Transfer...";
      else submitBtn.textContent = "Recording Transfer...";

      const payload = {
        action: "createDonation",
        name,
        phone,
        email,
        address,
        country,
        amount,
        currency,
        frequency,
        impactArea,
        paymentMethod: "manual_momo",
        message: finalMessage,
        dedicatedStory: dedicatedStoryTitle,
        dedicatedStoryId: dedicatedStoryId,
        anonymous,
        consent,
        timestamp: new Date().toISOString()
      };

      // OFFLINE HANDLING
      if (!navigator.onLine) {
        queueOfflineDraft("createDonation", payload, `Donation: ${currency} ${amount} from ${name}${dedicatedStoryTitle ? ` (For: ${dedicatedStoryTitle})` : ""}`);
        form.reset();
        window.__uafClearStoryDonationTie && window.__uafClearStoryDonationTie();
        submitBtn?.removeAttribute("disabled");
        if (span) span.textContent = originalText;
        else submitBtn.textContent = originalText;
        return;
      }

      if (!isConfigured) {
        window.__uafShowToast?.(`Thank you! Transfer record submitted. Ref: UAF-MOMO-${Date.now().toString().slice(-6)}`);
        form.reset();
        window.__uafClearStoryDonationTie && window.__uafClearStoryDonationTie();
        submitBtn?.removeAttribute("disabled");
        if (span) span.textContent = originalText;
        else submitBtn.textContent = originalText;
        return;
      }

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (json.ok) {
          form.reset();
          window.__uafClearStoryDonationTie && window.__uafClearStoryDonationTie();
          window.__uafShowToast?.(json.message || `Donation Ref: ${json.transactionId}. Awaiting UAF verification.`);
          loadFundingSummary();
        } else {
          queueOfflineDraft("createDonation", payload, `Donation: ${currency} ${amount}`);
          form.reset();
          window.__uafClearStoryDonationTie && window.__uafClearStoryDonationTie();
        }
      } catch (err) {
        queueOfflineDraft("createDonation", payload, `Donation: ${currency} ${amount}`);
        form.reset();
        window.__uafClearStoryDonationTie && window.__uafClearStoryDonationTie();
      } finally {
        submitBtn?.removeAttribute("disabled");
        if (span) span.textContent = originalText;
        else submitBtn.textContent = originalText;
      }
    });
  }

  /* ---------------------------------------------------------
     INIT HOOK
  --------------------------------------------------------- */
  window.__uafDataInit = function () {
    renderFundraisingStories();
    renderPartners();
    initSelectorDropdowns();
    initReportForm();
    initEvidenceForm();
    initBrochureDownload();
    initDonationForm();
    loadPublicData();
    loadFundingSummary();
  };
})();
