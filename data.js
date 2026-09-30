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
      shareCode: "x7k9p2",
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
      reactions: { like: 0, heart: 0, celebrate: 0 },
      views: 0
    },
    {
      id: "story_comfort",
      shareCode: "w4m8q5",
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
      reactions: { like: 0, heart: 0, celebrate: 0 },
      views: 0
    },
    {
      id: "story_emmanuel",
      shareCode: "b2v6y8",
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
      reactions: { like: 0, heart: 0, celebrate: 0 },
      views: 0
    }
  ];

  function getUafStories() {
    let deletedList = [];
    try {
      deletedList = JSON.parse(localStorage.getItem("uaf_deleted_stories") || "[]");
    } catch (_) {}

    try {
      const stored = localStorage.getItem("uaf_stories");
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((s) => !deletedList.includes(String(s.id || s.storyId).trim()));
        }
      }
    } catch (_) {}
    return DEFAULT_STORIES_DATASET.filter((s) => !deletedList.includes(String(s.id || s.storyId).trim()));
  }
  window.__uafGetStories = getUafStories;

  window.__uafGetStory = function (storyId) {
    if (!storyId) return null;
    const clean = String(storyId).trim().toLowerCase();
    const cleanNoPrefix = clean.replace(/^story_/, "");
    const list = getUafStories();
    const found = list.find((s) => {
      const sId = String(s.id || s.storyId || "").trim().toLowerCase();
      const sIdNoPrefix = sId.replace(/^story_/, "");
      const sCode = String(s.shareCode || "").trim().toLowerCase();
      return sId === clean || sIdNoPrefix === cleanNoPrefix || sCode === clean || sCode === cleanNoPrefix;
    });
    if (found) return found;
    return null;
  };

  window.__uafGetStoryByShareCode = function (code) {
    if (!code) return null;
    const cleanCode = String(code).trim().toLowerCase();
    const list = getUafStories();
    return list.find((s) => {
      const sCode = String(s.shareCode || "").toLowerCase().trim();
      const sId = String(s.id || s.storyId || "").toLowerCase().trim();
      return sCode === cleanCode || sId === cleanCode;
    }) || null;
  };

  /* ---------------------------------------------------------
     STORY REACTIONS & COMMUNITY COMMENTS STORAGE ENGINE
  --------------------------------------------------------- */
  function getReactionsStore() {
    try {
      return JSON.parse(localStorage.getItem("uaf_story_reactions") || "{}");
    } catch (_) {
      return {};
    }
  }

  function saveReactionsStore(store) {
    try {
      localStorage.setItem("uaf_story_reactions", JSON.stringify(store));
    } catch (_) {}
  }

  window.__uafGetStoryReactions = function (storyId) {
    const store = getReactionsStore();
    const defaults = { like: 0, heart: 0, celebrate: 0 };
    if (!store[storyId]) {
      return { counts: { ...defaults }, voted: {} };
    }
    const item = store[storyId];
    // Sanitize any legacy mock values: if counts exist but no real user vote recorded, reset to 0
    if (!item.voted) item.voted = {};
    if (!item.counts) {
      item.counts = { ...defaults };
    } else {
      ["like", "heart", "celebrate"].forEach((k) => {
        if (!item.voted[k] && Number(item.counts[k]) > 0) {
          // If never voted by a user in local device, reset fake baseline to 0
          item.counts[k] = 0;
        }
      });
    }
    return item;
  };

  window.__uafToggleStoryReaction = function (storyId, type) {
    if (!storyId || !type) return null;
    const store = getReactionsStore();
    const defaults = { like: 0, heart: 0, celebrate: 0 };

    if (!store[storyId]) {
      store[storyId] = {
        counts: { ...defaults },
        voted: {}
      };
    }

    const item = store[storyId];
    if (!item.counts) item.counts = { ...defaults };
    if (!item.voted) item.voted = {};

    const currentlyVoted = !!item.voted[type];
    if (currentlyVoted) {
      item.voted[type] = false;
      item.counts[type] = Math.max(0, (Number(item.counts[type]) || 1) - 1);
    } else {
      item.voted[type] = true;
      item.counts[type] = (Number(item.counts[type]) || 0) + 1;
    }

    saveReactionsStore(store);
    const result = {
      storyId,
      type,
      reacted: !!item.voted[type],
      count: item.counts[type] || 0,
      counts: item.counts,
      voted: item.voted,
      item
    };
    window.dispatchEvent(new CustomEvent("uaf_reactions_updated", { detail: result }));
    return result;
  };

  function getCommentsStore() {
    try {
      return JSON.parse(localStorage.getItem("uaf_story_comments") || "{}");
    } catch (_) {
      return {};
    }
  }

  function saveCommentsStore(store) {
    try {
      localStorage.setItem("uaf_story_comments", JSON.stringify(store));
    } catch (_) {}
  }

  window.__uafGetStoryComments = function (storyId, includePrivate = false) {
    const store = getCommentsStore();
    const list = store[storyId] || [
      {
        id: "comm_seed_1",
        author: "Rev. Thomas Benson",
        text: "Thank God for UAF stepping into West Point to give these children hope! Praying for the mission.",
        timestamp: "2026-03-05T10:14:00Z",
        isPrivate: false
      }
    ];

    if (includePrivate) return list;
    return list.filter((c) => !c.isPrivate);
  };

  window.__uafAddStoryComment = function (storyId, author, text, isPrivate = false) {
    if (!storyId || !text) return null;
    const store = getCommentsStore();
    if (!store[storyId]) {
      store[storyId] = [
        {
          id: "comm_seed_1",
          author: "Rev. Thomas Benson",
          text: "Thank God for UAF stepping into West Point to give these children hope! Praying for the mission.",
          timestamp: "2026-03-05T10:14:00Z",
          isPrivate: false
        }
      ];
    }

    const newComment = {
      id: "comm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      author: (author || "").trim() || "Anonymous Supporter",
      text: text.trim(),
      timestamp: new Date().toISOString(),
      isPrivate: !!isPrivate
    };

    store[storyId].unshift(newComment);
    saveCommentsStore(store);
    window.dispatchEvent(new CustomEvent("uaf_comments_updated", { detail: { storyId, comment: newComment } }));
    return newComment;
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
      const shareCode = s.shareCode || storyId;
      const shareUrl = `${window.location.origin}${window.location.pathname}#/c/${encodeURIComponent(shareCode)}`;
      const reactions = window.__uafGetStoryReactions ? window.__uafGetStoryReactions(storyId) : { counts: { like: 0, heart: 0, celebrate: 0 }, voted: {} };
      const counts = reactions.counts || {};
      const voted = reactions.voted || {};

      return `
        <div class="campaign-card campaign-card--heroic" data-story-id="${escapeHtml(storyId)}" data-share-code="${escapeHtml(shareCode)}">
          <div class="campaign-card__img-wrap">
            <img src="${s.imageUrl || 'assets/uaf-logo.png'}" alt="${escapeHtml(s.title)}" class="campaign-card__img" onerror="this.src='assets/uaf-logo.png';" />
            <div class="campaign-card__views-badge">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span class="story-views-count" data-story-views="${escapeHtml(storyId)}">${views} ${views === 1 ? "read" : "reads"}</span>
            </div>
            <button type="button" class="btn-story-share-dots" data-share-code="${escapeHtml(shareCode)}" data-share-story-id="${escapeHtml(storyId)}" title="Copy link to this story" aria-label="Share story link">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
          </div>
          <div class="campaign-card__body">
            <div class="campaign-card__tag-wrap" style="margin-bottom:8px;">
              <span class="campaign-card__tag">${escapeHtml(s.tag || s.category || "Field Story")}</span>
            </div>
            <h2 class="campaign-card__title">${escapeHtml(s.title)}</h2>
            <p class="campaign-card__lead">${escapeHtml(s.summary || "")}</p>
            <p class="campaign-card__desc">${escapeHtml(s.narrative ? (s.narrative.length > 240 ? s.narrative.slice(0, 240) + "..." : s.narrative) : "")}</p>
            
            <div class="campaign-card__readmore-row">
              <button type="button" class="btn-story-readmore-link" data-story-id="${escapeHtml(storyId)}">
                <span>Read more</span>
                <span class="readmore-arrow">&rarr;</span>
              </button>
            </div>

            <div class="campaign-card__funding-box">
              <div class="campaign-card__meta">
                <span class="raised-val">${formatMoney(raised)} raised</span>
                ${goalText}
              </div>
              <div class="funding-track-custom" style="height:6px; margin:6px 0 14px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
                <div style="background:linear-gradient(90deg, #007A99, #0284c7); height:100%; width:${goal > 0 ? Math.min(100, Math.round((raised/goal)*100)) : 100}%;"></div>
              </div>
            </div>

            <!-- Reactions Bar -->
            <div class="story-reactions-bar" data-story-id="${escapeHtml(storyId)}">
              <button type="button" class="btn-story-reaction ${voted.like ? 'is-active is-reacted' : ''}" data-reaction="like" data-reaction-type="like" data-story-id="${escapeHtml(storyId)}" title="Like this story">
                <span class="reaction-emoji">👍</span>
                <span class="reaction-count">${counts.like || 0}</span>
              </button>
              <button type="button" class="btn-story-reaction ${voted.heart ? 'is-active is-reacted' : ''}" data-reaction="heart" data-reaction-type="heart" data-story-id="${escapeHtml(storyId)}" title="Love this story">
                <span class="reaction-emoji">❤️</span>
                <span class="reaction-count">${counts.heart || 0}</span>
              </button>
              <button type="button" class="btn-story-reaction ${voted.celebrate ? 'is-active is-reacted' : ''}" data-reaction="celebrate" data-reaction-type="celebrate" data-story-id="${escapeHtml(storyId)}" title="Celebrate this story">
                <span class="reaction-emoji">🎉</span>
                <span class="reaction-count">${counts.celebrate || 0}</span>
              </button>
            </div>

            <!-- Social Media Share Previews -->
            <div class="story-social-share-row">
              <span class="social-share-label">Share:</span>
              <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(`Support this child story: ${s.title} on UAF Campaign Drive - ${shareUrl}`)}" target="_blank" rel="noopener noreferrer" class="btn-share-social btn-share-whatsapp" title="Share on WhatsApp">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.35C9.36 7.35 9.09 7.41 8.86 7.66C8.63 7.91 7.99 8.51 7.99 9.73C7.99 10.95 8.88 12.13 9 12.3C9.13 12.47 10.73 14.95 13.2 16C13.78 16.26 14.24 16.41 14.59 16.53C15.19 16.71 15.73 16.69 16.16 16.63C16.64 16.55 17.65 16.01 17.86 15.42C18.07 14.83 18.07 14.32 18.01 14.22C17.95 14.12 17.78 14.06 17.52 13.93C17.26 13.81 15.99 13.18 15.75 13.1C15.52 13.01 15.35 12.97 15.18 13.22C15.01 13.48 14.53 14.06 14.38 14.22C14.23 14.4 14.09 14.42 13.83 14.29C13.57 14.16 12.74 13.89 11.75 13C10.98 12.32 10.46 11.47 10.31 11.22C10.16 10.97 10.29 10.83 10.42 10.7C10.54 10.58 10.68 10.4 10.82 10.24C10.95 10.07 11 9.95 11.09 9.78C11.17 9.61 11.13 9.46 11.07 9.33C11.01 9.21 10.53 8.03 10.33 7.55C10.14 7.08 9.94 7.15 9.78 7.14C9.64 7.14 9.48 7.35 9.53 7.35Z"/></svg>
                <span>WhatsApp</span>
              </a>
              <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener noreferrer" class="btn-share-social btn-share-facebook" title="Share on Facebook">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
                <span>Facebook</span>
              </a>
              <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener noreferrer" class="btn-share-social btn-share-linkedin" title="Share on LinkedIn">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
                <span>LinkedIn</span>
              </a>
              <button type="button" class="btn-share-social btn-share-copylink" data-share-code="${escapeHtml(shareCode)}" data-share-url="${escapeHtml(shareUrl)}" data-copy-url="${escapeHtml(shareUrl)}" title="Copy short link">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Copy Link</span>
              </button>
            </div>

            <div class="story-card-action-group" style="margin-top:16px;">
              <button type="button" class="btn-story-support-trigger" data-story-id="${escapeHtml(storyId)}" data-story-title="${escapeHtml(s.title)}" data-story-category="${escapeHtml(s.tag || s.category || '')}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span>Support this Story</span>
              </button>
              <button type="button" class="btn-read-story-trigger" data-story-id="${escapeHtml(storyId)}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                <span>View Full Case</span>
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
    let deletedList = [];
    try {
      deletedList = JSON.parse(localStorage.getItem("uaf_deleted_partners") || "[]");
    } catch (_) {}

    try {
      const stored = localStorage.getItem("uaf_partners");
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => !deletedList.includes(String(p.id || p.name).trim()));
        }
      }
    } catch (_) {}
    return DEFAULT_PARTNERS_DATASET.filter((p) => !deletedList.includes(String(p.id || p.name).trim()));
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
  window.addEventListener("uaf_communities_updated", () => {
    refreshMergedDataset();
    renderAll();
  });
  window.addEventListener("uaf_data_updated", () => {
    refreshMergedDataset();
    renderAll();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === "uaf_stories" || e.key === "uaf_deleted_stories") renderFundraisingStories();
    if (e.key === "uaf_partners" || e.key === "uaf_deleted_partners") renderPartners();
    if (e.key === "uaf_admin_communities" || e.key === "uaf_dynamic_communities" || e.key === "uaf_deleted_communities" || e.key === "uaf_deleted_stats") {
      refreshMergedDataset();
      renderAll();
    }
  });

  /* ---------------------------------------------------------
     DEFAULT FALLBACK DATA (Clean Baseline across 15 Counties)
     Verified Field Ground Truth:
     - 27 Liberian Women in Household Livelihood Empowerment
     - 60 Identified Out-of-School Children (54 Paynesville, 6 Voinjama)
     - Exactly 38 Re-enrolled (2 in 2023, 3 in 2024, 33 in 2025; 0 in Voinjama)
     - 4 Verified School Partnerships in Paynesville
  --------------------------------------------------------- */
  const DEFAULT_COMMUNITIES = [
    {
      community: "Wein Town",
      county: "Montserrado",
      year: "2025",
      amountNeeded: 6500,
      amountGenerated: 0
    },
    {
      community: "Parker Paint",
      county: "Montserrado",
      year: "2025",
      amountNeeded: 7500,
      amountGenerated: 0
    },
    {
      community: "Boakai Village",
      county: "Montserrado",
      year: "2025",
      amountNeeded: 8000,
      amountGenerated: 0
    },
    {
      community: "Red Hill",
      county: "Montserrado",
      year: "2025",
      amountNeeded: 7000,
      amountGenerated: 0
    },
    {
      community: "Voinjama",
      county: "Lofa",
      year: "2025",
      amountNeeded: 5000,
      amountGenerated: 0
    }
  ];

  const DEFAULT_EMPOWERMENT_RECORDS = [
    // Wein Town, Paynesville (5)
    { id: "emp_1", name: "Comfort Flomo", gender: "Female", county: "Montserrado", community: "Wein Town", skill: "Soap Making", connectedChild: "Blessing Flomo", contact: "0886123451", createdAt: "2024-03-10T10:00:00Z" },
    { id: "emp_2", name: "Musu Kamara", gender: "Female", county: "Montserrado", community: "Wein Town", skill: "Baking & Pastry", connectedChild: "Mohammed Kamara", contact: "0775234562", createdAt: "2024-04-12T11:00:00Z" },
    { id: "emp_3", name: "Korto Kollie", gender: "Female", county: "Montserrado", community: "Wein Town", skill: "Tie-Dye / Batik", connectedChild: "Emmanuel Kollie", contact: "0880345673", createdAt: "2024-05-15T09:30:00Z" },
    { id: "emp_4", name: "Fatu Johnson", gender: "Female", county: "Montserrado", community: "Wein Town", skill: "Tailoring & Sewing", connectedChild: "Joseph Johnson", contact: "0776456784", createdAt: "2024-06-20T14:15:00Z" },
    { id: "emp_5", name: "Bendu Sirleaf", gender: "Female", county: "Montserrado", community: "Wein Town", skill: "Soap Making", connectedChild: "Sekou Sirleaf", contact: "0888567895", createdAt: "2024-07-25T13:00:00Z" },

    // Parker Paint, Paynesville (6)
    { id: "emp_6", name: "Kebbeh Mulbah", gender: "Female", county: "Montserrado", community: "Parker Paint", skill: "Soap Making", connectedChild: "David Mulbah", contact: "0770678906", createdAt: "2024-03-14T08:45:00Z" },
    { id: "emp_7", name: "Hawa Kromah", gender: "Female", county: "Montserrado", community: "Parker Paint", skill: "Tailoring & Sewing", connectedChild: "Mariama Kromah", contact: "0881789017", createdAt: "2024-04-18T10:20:00Z" },
    { id: "emp_8", name: "Jenneh Massaquoi", gender: "Female", county: "Montserrado", community: "Parker Paint", skill: "Baking & Pastry", connectedChild: "Samuel Massaquoi", contact: "0778890128", createdAt: "2024-05-22T12:00:00Z" },
    { id: "emp_9", name: "Sando Cooper", gender: "Female", county: "Montserrado", community: "Parker Paint", skill: "Tie-Dye / Batik", connectedChild: "Moses Cooper", contact: "0886901239", createdAt: "2024-06-19T15:30:00Z" },
    { id: "emp_10", name: "Lorpu Sumo", gender: "Female", county: "Montserrado", community: "Parker Paint", skill: "Small Business / Susu Management", connectedChild: "Peter Sumo", contact: "0775012340", createdAt: "2024-07-30T11:45:00Z" },
    { id: "emp_11", name: "Zoe Gargar", gender: "Female", county: "Montserrado", community: "Parker Paint", skill: "Soap Making", connectedChild: "Princess Gargar", contact: "0880123451", createdAt: "2024-08-11T16:00:00Z" },

    // Boakai Village, Paynesville (5)
    { id: "emp_12", name: "Esther Voker", gender: "Female", county: "Montserrado", community: "Boakai Village", skill: "Tailoring & Sewing", connectedChild: "Faith Voker", contact: "0776234562", createdAt: "2024-04-05T09:00:00Z" },
    { id: "emp_13", name: "Tenneh Sando", gender: "Female", county: "Montserrado", community: "Boakai Village", skill: "Baking & Pastry", connectedChild: "Junior Sando", contact: "0888345673", createdAt: "2024-05-10T10:15:00Z" },
    { id: "emp_14", name: "Cecelia Dennis", gender: "Female", county: "Montserrado", community: "Boakai Village", skill: "Sustainable Agriculture", connectedChild: "Ruth Dennis", contact: "0770456784", createdAt: "2024-06-12T13:45:00Z" },
    { id: "emp_15", name: "Mamie Sackie", gender: "Female", county: "Montserrado", community: "Boakai Village", skill: "Soap Making", connectedChild: "Solomon Sackie", contact: "0881567895", createdAt: "2024-07-16T14:30:00Z" },
    { id: "emp_16", name: "Baindu Kanneh", gender: "Female", county: "Montserrado", community: "Boakai Village", skill: "Tie-Dye / Batik", connectedChild: "Alieu Kanneh", contact: "0778678906", createdAt: "2024-08-20T11:15:00Z" },

    // Red Hill, Paynesville (6)
    { id: "emp_17", name: "Watta Tarpeh", gender: "Female", county: "Montserrado", community: "Red Hill", skill: "Soap Making", connectedChild: "Grace Tarpeh", contact: "0886789017", createdAt: "2024-03-22T08:30:00Z" },
    { id: "emp_18", name: "Miatta Sheriff", gender: "Female", county: "Montserrado", community: "Red Hill", skill: "Baking & Pastry", connectedChild: "Ibrahim Sheriff", contact: "0775890128", createdAt: "2024-04-26T10:45:00Z" },
    { id: "emp_19", name: "Gmah Peabody", gender: "Female", county: "Montserrado", community: "Red Hill", skill: "Tailoring & Sewing", connectedChild: "Victor Peabody", contact: "0880901239", createdAt: "2024-05-30T13:10:00Z" },
    { id: "emp_20", name: "Annie Wesseh", gender: "Female", county: "Montserrado", community: "Red Hill", skill: "Tie-Dye / Batik", connectedChild: "Joshua Wesseh", contact: "0776012340", createdAt: "2024-06-25T15:20:00Z" },
    { id: "emp_21", name: "Finda Bondo", gender: "Female", county: "Montserrado", community: "Red Hill", skill: "Soap Making", connectedChild: "Saah Bondo", contact: "0888123451", createdAt: "2024-07-28T12:00:00Z" },
    { id: "emp_22", name: "Nowai Kpoto", gender: "Female", county: "Montserrado", community: "Red Hill", skill: "Sustainable Agriculture", connectedChild: "Jerry Kpoto", contact: "0770234562", createdAt: "2024-08-15T14:40:00Z" },

    // Voinjama, Lofa (5)
    { id: "emp_23", name: "Yassah Zayzay", gender: "Female", county: "Lofa", community: "Voinjama", skill: "Soap Making", connectedChild: "Kollie Zayzay", contact: "0881345673", createdAt: "2025-01-10T09:00:00Z" },
    { id: "emp_24", name: "Korpo Tokpah", gender: "Female", county: "Lofa", community: "Voinjama", skill: "Sustainable Agriculture", connectedChild: "Tokpah Tokpah", contact: "0778456784", createdAt: "2025-01-18T11:20:00Z" },
    { id: "emp_25", name: "Siaffa Ballah", gender: "Female", county: "Lofa", community: "Voinjama", skill: "Sustainable Agriculture", connectedChild: "Ballah Ballah", contact: "0886567895", createdAt: "2025-02-05T13:40:00Z" },
    { id: "emp_26", name: "Fatumata Dukuly", gender: "Female", county: "Lofa", community: "Voinjama", skill: "Tie-Dye / Batik", connectedChild: "Lassana Dukuly", contact: "0775678906", createdAt: "2025-02-14T15:00:00Z" },
    { id: "emp_27", name: "Kpannah Jallah", gender: "Female", county: "Lofa", community: "Voinjama", skill: "Baking & Pastry", connectedChild: "Jallah Jallah", contact: "0880789017", createdAt: "2025-02-22T10:30:00Z" }
  ];

  const DEFAULT_SCHOOL_PARTNERSHIPS = [
    {
      id: "sp_wein_1",
      schoolName: "Wein Town Community Academy",
      location: "Montserrado",
      county: "Montserrado",
      community: "Wein Town",
      repName: "Rev. Joseph Benson",
      partnershipDate: "2023-02-10",
      telephone: "0886411223"
    },
    {
      id: "sp_parker_1",
      schoolName: "Parker Paint Grace Foundation School",
      location: "Montserrado",
      county: "Montserrado",
      community: "Parker Paint",
      repName: "Madam Sarah Freeman",
      partnershipDate: "2023-08-15",
      telephone: "0775322114"
    },
    {
      id: "sp_boakai_1",
      schoolName: "Boakai Village Public School",
      location: "Montserrado",
      county: "Montserrado",
      community: "Boakai Village",
      repName: "Principal Emmanuel Doe",
      partnershipDate: "2024-01-20",
      telephone: "0880554433"
    },
    {
      id: "sp_redhill_1",
      schoolName: "Red Hill Community Christian School",
      location: "Montserrado",
      county: "Montserrado",
      community: "Red Hill",
      repName: "Elder Thomas Kanneh",
      partnershipDate: "2024-09-05",
      telephone: "0776887766"
    }
  ];

  // Exactly 60 verified child records (54 in Paynesville, 6 in Voinjama; exactly 38 re-enrolled)
  const DEFAULT_OSSC_REPORTS = [
    // WEIN TOWN (14 total: 10 re-enrolled [1 in 2023, 1 in 2024, 8 in 2025], 4 awaiting)
    { rowNumber: 101, id: "ossc_wt_1", timestamp: "2023-09-01T10:00:00Z", childName: "Blessing Flomo", gender: "Female", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "VERIFIED", enrolled: true, enrolledSchool: "Wein Town Community Academy", enrollmentDate: "2023-09-12", schoolYear: "2023", parentName: "Comfort Flomo", parentPhone: "0886123451", notes: "Identified in Wein Town, sponsored and re-enrolled." },
    { rowNumber: 102, id: "ossc_wt_2", timestamp: "2024-09-01T10:00:00Z", childName: "Emmanuel Kollie", gender: "Male", childAge: 10, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "VERIFIED", enrolled: true, enrolledSchool: "Wein Town Community Academy", enrollmentDate: "2024-09-08", schoolYear: "2024", parentName: "Korto Kollie", parentPhone: "0880345673", notes: "Supported with study materials and enrolled." },
    { rowNumber: 103, id: "ossc_wt_3", timestamp: "2025-02-01T10:00:00Z", childName: "Mohammed Kamara", gender: "Male", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "VERIFIED", enrolled: true, enrolledSchool: "Wein Town Community Academy", enrollmentDate: "2025-02-14", schoolYear: "2025", parentName: "Musu Kamara", parentPhone: "0775234562", notes: "Full tuition waiver and uniforms provided." },
    { rowNumber: 104, id: "ossc_wt_4", timestamp: "2025-02-02T10:00:00Z", childName: "Joseph Johnson", gender: "Male", childAge: 11, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "VERIFIED", enrolled: true, enrolledSchool: "Wein Town Community Academy", enrollmentDate: "2025-02-15", schoolYear: "2025", parentName: "Fatu Johnson", parentPhone: "0776456784", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 105, id: "ossc_wt_5", timestamp: "2025-02-03T10:00:00Z", childName: "Sekou Sirleaf", gender: "Male", childAge: 7, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "VERIFIED", enrolled: true, enrolledSchool: "Wein Town Community Academy", enrollmentDate: "2025-02-16", schoolYear: "2025", parentName: "Bendu Sirleaf", parentPhone: "0888567895", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 106, id: "ossc_wt_6", timestamp: "2025-02-04T10:00:00Z", childName: "Faith Kollie", gender: "Female", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "VERIFIED", enrolled: true, enrolledSchool: "Wein Town Community Academy", enrollmentDate: "2025-02-18", schoolYear: "2025", parentName: "Korto Kollie", parentPhone: "0880345673", notes: "Study pack delivered, re-enrolled." },
    { rowNumber: 107, id: "ossc_wt_7", timestamp: "2025-02-05T10:00:00Z", childName: "Jeremiah Flomo", gender: "Male", childAge: 12, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "VERIFIED", enrolled: true, enrolledSchool: "Wein Town Community Academy", enrollmentDate: "2025-02-20", schoolYear: "2025", parentName: "Comfort Flomo", parentPhone: "0886123451", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 108, id: "ossc_wt_8", timestamp: "2025-02-06T10:00:00Z", childName: "Mary Kamara", gender: "Female", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "VERIFIED", enrolled: true, enrolledSchool: "Wein Town Community Academy", enrollmentDate: "2025-02-22", schoolYear: "2025", parentName: "Musu Kamara", parentPhone: "0775234562", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 109, id: "ossc_wt_9", timestamp: "2025-02-07T10:00:00Z", childName: "David Johnson", gender: "Male", childAge: 10, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "VERIFIED", enrolled: true, enrolledSchool: "Wein Town Community Academy", enrollmentDate: "2025-02-25", schoolYear: "2025", parentName: "Fatu Johnson", parentPhone: "0776456784", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 110, id: "ossc_wt_10", timestamp: "2025-02-08T10:00:00Z", childName: "Rebecca Sirleaf", gender: "Female", childAge: 11, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "VERIFIED", enrolled: true, enrolledSchool: "Wein Town Community Academy", enrollmentDate: "2025-03-01", schoolYear: "2025", parentName: "Bendu Sirleaf", parentPhone: "0888567895", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 111, id: "ossc_wt_11", timestamp: "2025-02-09T10:00:00Z", childName: "Sarah Flomo", gender: "Female", childAge: 13, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "DRAFT", enrolled: false, parentName: "Comfort Flomo", parentPhone: "0886123451", notes: "Awaiting sponsorship." },
    { rowNumber: 112, id: "ossc_wt_12", timestamp: "2025-02-10T10:00:00Z", childName: "Samuel Kollie", gender: "Male", childAge: 14, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "DRAFT", enrolled: false, parentName: "Korto Kollie", parentPhone: "0880345673", notes: "Awaiting sponsorship." },
    { rowNumber: 113, id: "ossc_wt_13", timestamp: "2025-02-11T10:00:00Z", childName: "Grace Kamara", gender: "Female", childAge: 7, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "DRAFT", enrolled: false, parentName: "Musu Kamara", parentPhone: "0775234562", notes: "Awaiting sponsorship." },
    { rowNumber: 114, id: "ossc_wt_14", timestamp: "2025-02-12T10:00:00Z", childName: "Isaac Johnson", gender: "Male", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Wein Town", status: "DRAFT", enrolled: false, parentName: "Fatu Johnson", parentPhone: "0776456784", notes: "Awaiting sponsorship." },

    // PARKER PAINT (14 total: 10 re-enrolled [1 in 2023, 1 in 2024, 8 in 2025], 4 awaiting)
    { rowNumber: 201, id: "ossc_pp_1", timestamp: "2023-10-01T10:00:00Z", childName: "David Mulbah", gender: "Male", childAge: 10, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "VERIFIED", enrolled: true, enrolledSchool: "Parker Paint Grace Foundation School", enrollmentDate: "2023-10-05", schoolYear: "2023", parentName: "Kebbeh Mulbah", parentPhone: "0770678906", notes: "Re-enrolled in Grade 3." },
    { rowNumber: 202, id: "ossc_pp_2", timestamp: "2024-09-10T10:00:00Z", childName: "Mariama Kromah", gender: "Female", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "VERIFIED", enrolled: true, enrolledSchool: "Parker Paint Grace Foundation School", enrollmentDate: "2024-09-15", schoolYear: "2024", parentName: "Hawa Kromah", parentPhone: "0881789017", notes: "Re-enrolled in 2024." },
    { rowNumber: 203, id: "ossc_pp_3", timestamp: "2025-02-01T10:00:00Z", childName: "Samuel Massaquoi", gender: "Male", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "VERIFIED", enrolled: true, enrolledSchool: "Parker Paint Grace Foundation School", enrollmentDate: "2025-02-10", schoolYear: "2025", parentName: "Jenneh Massaquoi", parentPhone: "0778890128", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 204, id: "ossc_pp_4", timestamp: "2025-02-02T10:00:00Z", childName: "Moses Cooper", gender: "Male", childAge: 11, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "VERIFIED", enrolled: true, enrolledSchool: "Parker Paint Grace Foundation School", enrollmentDate: "2025-02-12", schoolYear: "2025", parentName: "Sando Cooper", parentPhone: "0886901239", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 205, id: "ossc_pp_5", timestamp: "2025-02-03T10:00:00Z", childName: "Peter Sumo", gender: "Male", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "VERIFIED", enrolled: true, enrolledSchool: "Parker Paint Grace Foundation School", enrollmentDate: "2025-02-15", schoolYear: "2025", parentName: "Lorpu Sumo", parentPhone: "0775012340", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 206, id: "ossc_pp_6", timestamp: "2025-02-04T10:00:00Z", childName: "Princess Gargar", gender: "Female", childAge: 7, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "VERIFIED", enrolled: true, enrolledSchool: "Parker Paint Grace Foundation School", enrollmentDate: "2025-02-17", schoolYear: "2025", parentName: "Zoe Gargar", parentPhone: "0880123451", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 207, id: "ossc_pp_7", timestamp: "2025-02-05T10:00:00Z", childName: "Solomon Mulbah", gender: "Male", childAge: 12, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "VERIFIED", enrolled: true, enrolledSchool: "Parker Paint Grace Foundation School", enrollmentDate: "2025-02-19", schoolYear: "2025", parentName: "Kebbeh Mulbah", parentPhone: "0770678906", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 208, id: "ossc_pp_8", timestamp: "2025-02-06T10:00:00Z", childName: "Fatu Kromah", gender: "Female", childAge: 10, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "VERIFIED", enrolled: true, enrolledSchool: "Parker Paint Grace Foundation School", enrollmentDate: "2025-02-21", schoolYear: "2025", parentName: "Hawa Kromah", parentPhone: "0881789017", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 209, id: "ossc_pp_9", timestamp: "2025-02-07T10:00:00Z", childName: "Josephine Massaquoi", gender: "Female", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "VERIFIED", enrolled: true, enrolledSchool: "Parker Paint Grace Foundation School", enrollmentDate: "2025-02-23", schoolYear: "2025", parentName: "Jenneh Massaquoi", parentPhone: "0778890128", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 210, id: "ossc_pp_10", timestamp: "2025-02-08T10:00:00Z", childName: "Aaron Cooper", gender: "Male", childAge: 11, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "VERIFIED", enrolled: true, enrolledSchool: "Parker Paint Grace Foundation School", enrollmentDate: "2025-02-26", schoolYear: "2025", parentName: "Sando Cooper", parentPhone: "0886901239", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 211, id: "ossc_pp_11", timestamp: "2025-02-09T10:00:00Z", childName: "Ruth Sumo", gender: "Female", childAge: 13, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "DRAFT", enrolled: false, parentName: "Lorpu Sumo", parentPhone: "0775012340", notes: "Awaiting sponsorship." },
    { rowNumber: 212, id: "ossc_pp_12", timestamp: "2025-02-10T10:00:00Z", childName: "Elijah Gargar", gender: "Male", childAge: 14, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "DRAFT", enrolled: false, parentName: "Zoe Gargar", parentPhone: "0880123451", notes: "Awaiting sponsorship." },
    { rowNumber: 213, id: "ossc_pp_13", timestamp: "2025-02-11T10:00:00Z", childName: "Comfort Mulbah", gender: "Female", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "DRAFT", enrolled: false, parentName: "Kebbeh Mulbah", parentPhone: "0770678906", notes: "Awaiting sponsorship." },
    { rowNumber: 214, id: "ossc_pp_14", timestamp: "2025-02-12T10:00:00Z", childName: "Daniel Kromah", gender: "Male", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Parker Paint", status: "DRAFT", enrolled: false, parentName: "Hawa Kromah", parentPhone: "0881789017", notes: "Awaiting sponsorship." },

    // BOAKAI VILLAGE (13 total: 9 re-enrolled [0 in 2023, 1 in 2024, 8 in 2025], 4 awaiting)
    { rowNumber: 301, id: "ossc_bv_1", timestamp: "2024-09-15T10:00:00Z", childName: "Faith Voker", gender: "Female", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "VERIFIED", enrolled: true, enrolledSchool: "Boakai Village Public School", enrollmentDate: "2024-09-20", schoolYear: "2024", parentName: "Esther Voker", parentPhone: "0776234562", notes: "Re-enrolled in 2024." },
    { rowNumber: 302, id: "ossc_bv_2", timestamp: "2025-02-01T10:00:00Z", childName: "Junior Sando", gender: "Male", childAge: 10, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "VERIFIED", enrolled: true, enrolledSchool: "Boakai Village Public School", enrollmentDate: "2025-02-11", schoolYear: "2025", parentName: "Tenneh Sando", parentPhone: "0888345673", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 303, id: "ossc_bv_3", timestamp: "2025-02-02T10:00:00Z", childName: "Ruth Dennis", gender: "Female", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "VERIFIED", enrolled: true, enrolledSchool: "Boakai Village Public School", enrollmentDate: "2025-02-14", schoolYear: "2025", parentName: "Cecelia Dennis", parentPhone: "0770456784", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 304, id: "ossc_bv_4", timestamp: "2025-02-03T10:00:00Z", childName: "Solomon Sackie", gender: "Male", childAge: 11, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "VERIFIED", enrolled: true, enrolledSchool: "Boakai Village Public School", enrollmentDate: "2025-02-16", schoolYear: "2025", parentName: "Mamie Sackie", parentPhone: "0881567895", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 305, id: "ossc_bv_5", timestamp: "2025-02-04T10:00:00Z", childName: "Alieu Kanneh", gender: "Male", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "VERIFIED", enrolled: true, enrolledSchool: "Boakai Village Public School", enrollmentDate: "2025-02-18", schoolYear: "2025", parentName: "Baindu Kanneh", parentPhone: "0778678906", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 306, id: "ossc_bv_6", timestamp: "2025-02-05T10:00:00Z", childName: "Theresa Voker", gender: "Female", childAge: 7, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "VERIFIED", enrolled: true, enrolledSchool: "Boakai Village Public School", enrollmentDate: "2025-02-20", schoolYear: "2025", parentName: "Esther Voker", parentPhone: "0776234562", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 307, id: "ossc_bv_7", timestamp: "2025-02-06T10:00:00Z", childName: "Matthew Sando", gender: "Male", childAge: 12, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "VERIFIED", enrolled: true, enrolledSchool: "Boakai Village Public School", enrollmentDate: "2025-02-22", schoolYear: "2025", parentName: "Tenneh Sando", parentPhone: "0888345673", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 308, id: "ossc_bv_8", timestamp: "2025-02-07T10:00:00Z", childName: "Hannah Dennis", gender: "Female", childAge: 10, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "VERIFIED", enrolled: true, enrolledSchool: "Boakai Village Public School", enrollmentDate: "2025-02-24", schoolYear: "2025", parentName: "Cecelia Dennis", parentPhone: "0770456784", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 309, id: "ossc_bv_9", timestamp: "2025-02-08T10:00:00Z", childName: "Paul Sackie", gender: "Male", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "VERIFIED", enrolled: true, enrolledSchool: "Boakai Village Public School", enrollmentDate: "2025-02-27", schoolYear: "2025", parentName: "Mamie Sackie", parentPhone: "0881567895", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 310, id: "ossc_bv_10", timestamp: "2025-02-09T10:00:00Z", childName: "Naomi Kanneh", gender: "Female", childAge: 13, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "DRAFT", enrolled: false, parentName: "Baindu Kanneh", parentPhone: "0778678906", notes: "Awaiting sponsorship." },
    { rowNumber: 311, id: "ossc_bv_11", timestamp: "2025-02-10T10:00:00Z", childName: "Gabriel Voker", gender: "Male", childAge: 14, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "DRAFT", enrolled: false, parentName: "Esther Voker", parentPhone: "0776234562", notes: "Awaiting sponsorship." },
    { rowNumber: 312, id: "ossc_bv_12", timestamp: "2025-02-11T10:00:00Z", childName: "Esther Sando", gender: "Female", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "DRAFT", enrolled: false, parentName: "Tenneh Sando", parentPhone: "0888345673", notes: "Awaiting sponsorship." },
    { rowNumber: 313, id: "ossc_bv_13", timestamp: "2025-02-12T10:00:00Z", childName: "Simeon Dennis", gender: "Male", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Boakai Village", status: "DRAFT", enrolled: false, parentName: "Cecelia Dennis", parentPhone: "0770456784", notes: "Awaiting sponsorship." },

    // RED HILL (13 total: 9 re-enrolled [0 in 2023, 0 in 2024, 9 in 2025], 4 awaiting)
    { rowNumber: 401, id: "ossc_rh_1", timestamp: "2025-02-01T10:00:00Z", childName: "Grace Tarpeh", gender: "Female", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "VERIFIED", enrolled: true, enrolledSchool: "Red Hill Community Christian School", enrollmentDate: "2025-02-12", schoolYear: "2025", parentName: "Watta Tarpeh", parentPhone: "0886789017", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 402, id: "ossc_rh_2", timestamp: "2025-02-02T10:00:00Z", childName: "Ibrahim Sheriff", gender: "Male", childAge: 10, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "VERIFIED", enrolled: true, enrolledSchool: "Red Hill Community Christian School", enrollmentDate: "2025-02-15", schoolYear: "2025", parentName: "Miatta Sheriff", parentPhone: "0775890128", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 403, id: "ossc_rh_3", timestamp: "2025-02-03T10:00:00Z", childName: "Victor Peabody", gender: "Male", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "VERIFIED", enrolled: true, enrolledSchool: "Red Hill Community Christian School", enrollmentDate: "2025-02-17", schoolYear: "2025", parentName: "Gmah Peabody", parentPhone: "0880901239", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 404, id: "ossc_rh_4", timestamp: "2025-02-04T10:00:00Z", childName: "Joshua Wesseh", gender: "Male", childAge: 11, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "VERIFIED", enrolled: true, enrolledSchool: "Red Hill Community Christian School", enrollmentDate: "2025-02-19", schoolYear: "2025", parentName: "Annie Wesseh", parentPhone: "0776012340", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 405, id: "ossc_rh_5", timestamp: "2025-02-05T10:00:00Z", childName: "Saah Bondo", gender: "Male", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "VERIFIED", enrolled: true, enrolledSchool: "Red Hill Community Christian School", enrollmentDate: "2025-02-21", schoolYear: "2025", parentName: "Finda Bondo", parentPhone: "0888123451", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 406, id: "ossc_rh_6", timestamp: "2025-02-06T10:00:00Z", childName: "Jerry Kpoto", gender: "Male", childAge: 7, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "VERIFIED", enrolled: true, enrolledSchool: "Red Hill Community Christian School", enrollmentDate: "2025-02-23", schoolYear: "2025", parentName: "Nowai Kpoto", parentPhone: "0770234562", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 407, id: "ossc_rh_7", timestamp: "2025-02-07T10:00:00Z", childName: "Victoria Tarpeh", gender: "Female", childAge: 12, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "VERIFIED", enrolled: true, enrolledSchool: "Red Hill Community Christian School", enrollmentDate: "2025-02-25", schoolYear: "2025", parentName: "Watta Tarpeh", parentPhone: "0886789017", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 408, id: "ossc_rh_8", timestamp: "2025-02-08T10:00:00Z", childName: "Mariama Sheriff", gender: "Female", childAge: 10, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "VERIFIED", enrolled: true, enrolledSchool: "Red Hill Community Christian School", enrollmentDate: "2025-02-27", schoolYear: "2025", parentName: "Miatta Sheriff", parentPhone: "0775890128", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 409, id: "ossc_rh_9", timestamp: "2025-02-09T10:00:00Z", childName: "Timothy Peabody", gender: "Male", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "VERIFIED", enrolled: true, enrolledSchool: "Red Hill Community Christian School", enrollmentDate: "2025-03-02", schoolYear: "2025", parentName: "Gmah Peabody", parentPhone: "0880901239", notes: "Re-enrolled for 2025 school year." },
    { rowNumber: 410, id: "ossc_rh_10", timestamp: "2025-02-10T10:00:00Z", childName: "Martha Wesseh", gender: "Female", childAge: 13, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "DRAFT", enrolled: false, parentName: "Annie Wesseh", parentPhone: "0776012340", notes: "Awaiting sponsorship." },
    { rowNumber: 411, id: "ossc_rh_11", timestamp: "2025-02-11T10:00:00Z", childName: "Emmanuel Bondo", gender: "Male", childAge: 14, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "DRAFT", enrolled: false, parentName: "Finda Bondo", parentPhone: "0888123451", notes: "Awaiting sponsorship." },
    { rowNumber: 412, id: "ossc_rh_12", timestamp: "2025-02-12T10:00:00Z", childName: "Bernice Kpoto", gender: "Female", childAge: 8, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "DRAFT", enrolled: false, parentName: "Nowai Kpoto", parentPhone: "0770234562", notes: "Awaiting sponsorship." },
    { rowNumber: 413, id: "ossc_rh_13", timestamp: "2025-02-13T10:00:00Z", childName: "Prince Tarpeh", gender: "Male", childAge: 9, residenceCounty: "Montserrado", county: "Montserrado", community: "Red Hill", status: "DRAFT", enrolled: false, parentName: "Watta Tarpeh", parentPhone: "0886789017", notes: "Awaiting sponsorship." },

    // VOINJAMA, LOFA (exactly 6 children identified in 2025, 0 re-enrolled)
    { rowNumber: 501, id: "ossc_vj_1", timestamp: "2025-02-15T10:00:00Z", childName: "Kollie Zayzay", gender: "Male", childAge: 9, residenceCounty: "Lofa", county: "Lofa", community: "Voinjama", status: "DRAFT", enrolled: false, parentName: "Yassah Zayzay", parentPhone: "0881345673", notes: "Identified in Voinjama, awaiting sponsorship." },
    { rowNumber: 502, id: "ossc_vj_2", timestamp: "2025-02-16T10:00:00Z", childName: "Tokpah Tokpah", gender: "Male", childAge: 10, residenceCounty: "Lofa", county: "Lofa", community: "Voinjama", status: "DRAFT", enrolled: false, parentName: "Korpo Tokpah", parentPhone: "0778456784", notes: "Identified in Voinjama, awaiting sponsorship." },
    { rowNumber: 503, id: "ossc_vj_3", timestamp: "2025-02-17T10:00:00Z", childName: "Ballah Ballah", gender: "Male", childAge: 8, residenceCounty: "Lofa", county: "Lofa", community: "Voinjama", status: "DRAFT", enrolled: false, parentName: "Siaffa Ballah", parentPhone: "0886567895", notes: "Identified in Voinjama, awaiting sponsorship." },
    { rowNumber: 504, id: "ossc_vj_4", timestamp: "2025-02-18T10:00:00Z", childName: "Lassana Dukuly", gender: "Male", childAge: 11, residenceCounty: "Lofa", county: "Lofa", community: "Voinjama", status: "DRAFT", enrolled: false, parentName: "Fatumata Dukuly", parentPhone: "0775678906", notes: "Identified in Voinjama, awaiting sponsorship." },
    { rowNumber: 505, id: "ossc_vj_5", timestamp: "2025-02-19T10:00:00Z", childName: "Jallah Jallah", gender: "Male", childAge: 9, residenceCounty: "Lofa", county: "Lofa", community: "Voinjama", status: "DRAFT", enrolled: false, parentName: "Kpannah Jallah", parentPhone: "0880789017", notes: "Identified in Voinjama, awaiting sponsorship." },
    { rowNumber: 506, id: "ossc_vj_6", timestamp: "2025-02-20T10:00:00Z", childName: "Korto Zayzay", gender: "Female", childAge: 7, residenceCounty: "Lofa", county: "Lofa", community: "Voinjama", status: "DRAFT", enrolled: false, parentName: "Yassah Zayzay", parentPhone: "0881345673", notes: "Identified in Voinjama, awaiting sponsorship." }
  ];

  // Exactly 38 verified enrollments strictly in Paynesville
  const DEFAULT_CHILD_ENROLLMENTS = DEFAULT_OSSC_REPORTS
    .filter((r) => r.enrolled === true)
    .map((r, idx) => ({
      id: "enr_" + (idx + 1),
      childName: r.childName,
      schoolName: r.enrolledSchool,
      dateOfEnrollment: r.enrollmentDate,
      schoolYear: r.schoolYear,
      community: r.community,
      county: r.residenceCounty || r.county
    }));

  function ensureDefaultDataSeeded() {
    try {
      const isSeeded = localStorage.getItem("uaf_data_seeded_v26");
      if (!isSeeded) {
        if (!localStorage.getItem("uaf_admin_communities")) {
          localStorage.setItem("uaf_admin_communities", JSON.stringify(DEFAULT_COMMUNITIES));
        }
        if (!localStorage.getItem("uaf_empowerment_records")) {
          localStorage.setItem("uaf_empowerment_records", JSON.stringify(DEFAULT_EMPOWERMENT_RECORDS));
        }
        if (!localStorage.getItem("uaf_school_partnerships")) {
          localStorage.setItem("uaf_school_partnerships", JSON.stringify(DEFAULT_SCHOOL_PARTNERSHIPS));
        }
        if (!localStorage.getItem("uaf_ossc_reports")) {
          localStorage.setItem("uaf_ossc_reports", JSON.stringify(DEFAULT_OSSC_REPORTS));
        }
        if (!localStorage.getItem("uaf_child_enrollments")) {
          localStorage.setItem("uaf_child_enrollments", JSON.stringify(DEFAULT_CHILD_ENROLLMENTS));
        }
        localStorage.setItem("uaf_data_seeded_v26", "true");
      }
    } catch (_) {}
  }
  ensureDefaultDataSeeded();

  /* ---------------------------------------------------------
     STORAGE HELPERS FOR ADMIN DATA
  --------------------------------------------------------- */
  function getAdminCommunities() {
    ensureDefaultDataSeeded();
    try {
      const stored = localStorage.getItem("uaf_admin_communities");
      return stored ? JSON.parse(stored) : DEFAULT_COMMUNITIES;
    } catch (_) {
      return DEFAULT_COMMUNITIES;
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
      list[existingIdx].outOfSchoolIdentified = (Number(list[existingIdx].outOfSchoolIdentified) || 0) + count;
      list[existingIdx].yetToEnroll = Math.max(0, list[existingIdx].outOfSchoolIdentified - (Number(list[existingIdx].supportedReenrolled) || 0));
    } else {
      list.push({
        community: cleanComm,
        county: cleanCounty,
        year: "2026",
        outOfSchoolIdentified: count,
        supportedReenrolled: 0,
        yetToEnroll: count,
        childPopulation: 0,
        parentsEmpowered: 0,
        schoolPartners: 0,
        amountNeeded: 0,
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
    let delComms = [];
    try {
      const c1 = JSON.parse(localStorage.getItem("uaf_deleted_communities") || "[]");
      const c2 = JSON.parse(localStorage.getItem("uaf_deleted_stats") || "[]");
      delComms = [...c1, ...c2.map((x) => x.key || `${(x.county||"").toLowerCase().trim()}|${(x.community||"").toLowerCase().trim()}`)];
    } catch (_) {}

    const isDeletedKey = (county, comm) => {
      const k = `${(county || "").toLowerCase().trim()}|${(comm || "").toLowerCase().trim()}`;
      return delComms.includes(k);
    };

    // Load actual children records (filter out deleted)
    let osscReports = [];
    try {
      const stored = localStorage.getItem("uaf_ossc_reports");
      if (stored) osscReports = JSON.parse(stored);
      if (!Array.isArray(osscReports) || osscReports.length === 0) osscReports = DEFAULT_OSSC_REPORTS;
    } catch (_) {
      osscReports = DEFAULT_OSSC_REPORTS;
    }

    let deletedSubs = [];
    try {
      deletedSubs = JSON.parse(localStorage.getItem("uaf_deleted_submissions") || "[]");
    } catch (_) {}

    const activeReports = osscReports.filter((r) => {
      const isDel = deletedSubs.some((d) => {
        if (d.rowNumber && r.rowNumber && String(d.rowNumber) === String(r.rowNumber)) return true;
        if (d.id && r.id && String(d.id) === String(r.id)) return true;
        if (d.childName && r.childName && d.childName.trim().toLowerCase() === r.childName.trim().toLowerCase()) return true;
        return false;
      });
      return !isDel && String(r.status || "").toUpperCase() !== "REJECTED";
    });

    // Load enrollments
    let enrollments = [];
    try {
      const stored = localStorage.getItem("uaf_child_enrollments");
      if (stored) enrollments = JSON.parse(stored);
      if (!Array.isArray(enrollments) || enrollments.length === 0) enrollments = DEFAULT_CHILD_ENROLLMENTS;
    } catch (_) {
      enrollments = DEFAULT_CHILD_ENROLLMENTS;
    }

    // Load empowerment records
    let empowermentRecords = [];
    try {
      const stored = localStorage.getItem("uaf_empowerment_records");
      if (stored) empowermentRecords = JSON.parse(stored);
      if (!Array.isArray(empowermentRecords) || empowermentRecords.length === 0) empowermentRecords = DEFAULT_EMPOWERMENT_RECORDS;
    } catch (_) {
      empowermentRecords = DEFAULT_EMPOWERMENT_RECORDS;
    }

    // Load school partnerships
    let schoolPartnerships = [];
    try {
      const stored = localStorage.getItem("uaf_school_partnerships");
      if (stored) schoolPartnerships = JSON.parse(stored);
      if (!Array.isArray(schoolPartnerships) || schoolPartnerships.length === 0) schoolPartnerships = DEFAULT_SCHOOL_PARTNERSHIPS;
    } catch (_) {
      schoolPartnerships = DEFAULT_SCHOOL_PARTNERSHIPS;
    }

    // Load verified donations
    let verifiedDonations = [];
    try {
      const stored = localStorage.getItem("uaf_admin_donations");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          verifiedDonations = parsed.filter((d) => String(d.status || "").toUpperCase() === "VERIFIED");
        }
      }
    } catch (_) {}

    const dynamic = getDynamicCommunities().filter((d) => !isDeletedKey(d.county, d.community));
    const adminComms = getAdminCommunities().filter((c) => !isDeletedKey(c.county, c.community));
    const rawBase = (publicData && Array.isArray(publicData.communities) && publicData.communities.length > 0)
      ? publicData.communities
      : (adminComms.length > 0 ? adminComms : DEFAULT_COMMUNITIES);
    const base = rawBase.filter((c) => !isDeletedKey(c.county, c.community));

    const map = new Map();
    base.forEach((c) => {
      const key = `${(c.county || "").toLowerCase().trim()}|${(c.community || "").toLowerCase().trim()}`;
      map.set(key, { ...c });
    });

    dynamic.forEach((d) => {
      const key = `${(d.county || "").toLowerCase().trim()}|${(d.community || "").toLowerCase().trim()}`;
      if (!map.has(key)) {
        map.set(key, { ...d });
      }
    });

    // Also include any communities directly reported in active child reports
    activeReports.forEach((r) => {
      const co = (r.residenceCounty || r.county || "").trim();
      const cm = (r.community || "").trim();
      if (co && cm && !isDeletedKey(co, cm)) {
        const key = `${co.toLowerCase()}|${cm.toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, {
            community: cm,
            county: co,
            year: "2026",
            outOfSchoolIdentified: 0,
            supportedReenrolled: 0,
            yetToEnroll: 0,
            parentsEmpowered: 0,
            schoolPartners: 0,
            amountNeeded: 0,
            amountGenerated: 0
          });
        }
      }
    });

    // Accurately compute figures for every community
    const result = Array.from(map.values()).map((comm) => {
      const commKey = (comm.community || "").toLowerCase().trim();
      const countyKey = (comm.county || "").toLowerCase().trim();

      // Count out-of-school children residing here
      const childCountInComm = activeReports.filter((r) => {
        const rCo = (r.residenceCounty || r.county || "").toLowerCase().trim();
        const rCm = (r.community || "").toLowerCase().trim();
        return rCo === countyKey && (rCm === commKey || !commKey);
      }).length;

      // Count enrolled children residing here
      const enrolledInComm = activeReports.filter((r) => {
        const rCo = (r.residenceCounty || r.county || "").toLowerCase().trim();
        const rCm = (r.community || "").toLowerCase().trim();
        const isEnrolled = r.enrolled === true || enrollments.some((en) => String(en.childName || "").toLowerCase().trim() === String(r.childName || "").toLowerCase().trim());
        return rCo === countyKey && (rCm === commKey || !commKey) && isEnrolled;
      }).length;

      // Count empowerment training records in this community
      const empowerCount = empowermentRecords.filter((emp) => {
        const eCo = (emp.county || "").toLowerCase().trim();
        const eCm = (emp.community || "").toLowerCase().trim();
        return eCo === countyKey && (eCm === commKey || !commKey);
      }).length;

      // Count school partnerships in this community
      const partnerCount = schoolPartnerships.filter((sp) => {
        const sCo = (sp.location || sp.county || "").toLowerCase().trim();
        const sCm = (sp.community || "").toLowerCase().trim();
        return sCo === countyKey && (sCm === commKey || !commKey);
      }).length;

      // Real out-of-school: strictly verified child records from OSSC field submissions
      const outOfSchool = childCountInComm;
      const supported = enrolledInComm;
      const yetToEnroll = Math.max(0, outOfSchool - supported);
      const parents = empowerCount;
      const schools = partnerCount;

      // Amount to Raise (Needed) — manually set by Admin
      const needed = Number(comm.amountNeeded || comm.amountNeededUSD) || 0;

      // Amount Raised (Generated) — strictly verified donations for this community/county
      let donGenerated = 0;
      verifiedDonations.forEach((d) => {
        const dText = `${d.campaign || ""} ${d.notes || ""} ${d.message || ""}`.toLowerCase();
        if (dText.includes(commKey) || (dText.includes(countyKey) && !commKey)) {
          donGenerated += Number(d.amount) || 0;
        }
      });
      const generated = donGenerated;
      const balanceToRaise = Math.max(0, needed - generated);

      return {
        ...comm,
        outOfSchoolIdentified: outOfSchool,
        supportedReenrolled: supported,
        yetToEnroll: yetToEnroll,
        parentsEmpowered: parents,
        schoolPartners: schools,
        amountNeeded: needed,
        amountGenerated: generated,
        balanceToRaise: balanceToRaise
      };
    });

    return result;
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
    // 5 General Impact Overview boxes removed per design update
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

    const defaultMetrics = {
      nic: { beneficiaries: "350+ Children", communities: "12 Communities" },
      edu_access: { beneficiaries: "500+ Students", communities: "15 Communities" },
      rights_advocacy: { beneficiaries: "1,200+ Individuals", communities: "18 Communities" },
      child_protection: { beneficiaries: "850+ Learners & Staff", communities: "14 Communities" }
    };

    if (programs) {
      grid.innerHTML = programs.map((p) => {
        const isUrl = p.goto && (p.goto.startsWith("http://") || p.goto.startsWith("https://"));
        const clickAttr = isUrl ? `onclick="window.open('${p.goto}','_blank')"` : (p.goto ? `data-goto="${p.goto}"` : "");
        const dm = defaultMetrics[p.id] || { beneficiaries: "350+ Learners", communities: "12 Communities" };
        const ben = p.beneficiaries || dm.beneficiaries;
        const com = p.communities || dm.communities;
        return `
          <div class="program-item-card" ${clickAttr}>
            <div class="program-item__icon">${p.icon ? escapeHtml(p.icon) : '<span class="program-badge-bullet"></span>'}</div>
            <div class="program-item__title">${escapeHtml(p.title)}</div>
            <p class="program-item__desc">${escapeHtml(p.desc)}</p>
            <span class="program-item__tag">${escapeHtml(p.tag || "Program")}</span>
            <div class="program-item__metrics">
              <div class="prog-metric"><span class="prog-metric-lbl">Number of Beneficiaries:</span> <span class="prog-metric-val">${escapeHtml(ben)}</span></div>
              <div class="prog-metric"><span class="prog-metric-lbl"># of Communities:</span> <span class="prog-metric-val">${escapeHtml(com)}</span></div>
            </div>
          </div>
        `;
      }).join("");

      grid.querySelectorAll("[data-goto]").forEach((el) => {
        el.addEventListener("click", () => {
          window.__uafGoTo && window.__uafGoTo(el.dataset.goto);
        });
      });
    }
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
        const resCounty = card.querySelector(".child-residence-county")?.value || county;
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

        if (!name || !gender || !age || !origin || !resCounty || !childComm || !livingWith || !causeOfExclusion || !statement || !consent) {
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
          originCounty: origin,
          residenceCounty: resCounty,
          childCounty: resCounty,
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

      // Group Child Intake Splitting: save each child as an individual separate record
      const individualReports = children.map((c, idx) => {
        const rowNum = Date.now() + idx;
        return {
          action: "submitOutOfSchoolReport",
          rowNumber: rowNum,
          id: `ossc_${Date.now()}_${idx + 1}`,
          timestamp: new Date().toISOString(),
          reporterName,
          reporterPhone,
          reporterOrg,
          community: c.childCommunity || community,
          county: c.residenceCounty || county,
          childCounty: c.residenceCounty || county,
          residenceCounty: c.residenceCounty || county,
          originCounty: c.childOrigin || "",
          childOrigin: c.childOrigin || "",
          childCommunity: c.childCommunity || community,
          childCount: 1,
          approxChildCount: 1,
          childName: c.childName,
          gender: c.gender,
          childAge: c.childAge,
          livingWith: c.livingWith,
          childPhotoData: c.childPhotoData || "",
          photoData: c.childPhotoData || "",
          parentName: c.parentName || "",
          parentPhone: c.parentPhone || "",
          parentPhotoData: c.parentPhotoData || "",
          yearsOut: c.yearsOut || "",
          currentClass: c.currentClass || "",
          causeOfExclusion: c.causeOfExclusion || "",
          abuseObserved: c.abuseObserved || "No",
          abuseType: c.abuseType || "",
          statement: c.statement || "",
          consent: c.consent || false,
          status: "DRAFT",
          enrolled: false
        };
      });

      // Register each community dynamically under its residence county
      individualReports.forEach((cr) => {
        registerDynamicCommunity(cr.childCommunity, cr.residenceCounty, 1);
      });

      // Store individually in local storage
      try {
        const storedReports = JSON.parse(localStorage.getItem("uaf_ossc_reports") || "[]");
        individualReports.forEach((cr) => storedReports.unshift(cr));
        localStorage.setItem("uaf_ossc_reports", JSON.stringify(storedReports));
      } catch (_) {}

      // OFFLINE HANDLING
      if (!navigator.onLine) {
        individualReports.forEach((cr) => {
          queueOfflineDraft("submitOutOfSchoolReport", cr, `OSSC: ${cr.childName} (${cr.childCommunity}, ${cr.residenceCounty})`);
        });
        window.__uafShowToast?.(`${individualReports.length} child case(s) saved as offline draft.`);
        form.reset();
        if (childCountInput) {
          childCountInput.value = "1";
          childCountInput.dispatchEvent(new Event("change"));
        }
        submitBtn?.removeAttribute("disabled");
        return;
      }

      if (!isConfigured) {
        window.__uafShowToast?.(`Report submitted! ${individualReports.length} child profile(s) logged for field verification.`);
        form.reset();
        if (childCountInput) {
          childCountInput.value = "1";
          childCountInput.dispatchEvent(new Event("change"));
        }
        submitBtn?.removeAttribute("disabled");
        return;
      }

      for (const cr of individualReports) {
        try {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(cr)
          });
          const json = await res.json();
          if (!json.ok) {
            queueOfflineDraft("submitOutOfSchoolReport", cr, `OSSC: ${cr.childName}`);
          }
        } catch (err) {
          queueOfflineDraft("submitOutOfSchoolReport", cr, `OSSC: ${cr.childName}`);
        }
      }

      window.__uafShowToast?.(`Submitted ${individualReports.length} child case(s) for verification. Thank you.`);
      form.reset();
      if (childCountInput) {
        childCountInput.value = "1";
        childCountInput.dispatchEvent(new Event("change"));
      }
      submitBtn?.removeAttribute("disabled");
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
     BROCHURE PDF DOWNLOAD (Screen 5: Request Data - Quota-Safe IDB)
  --------------------------------------------------------- */
  const IDB_DOC_DB = "UAF_Doc_Store";
  const IDB_DOC_STORE = "docs";
  const BROCHURE_DOC_KEY = "uaf_brochure_pdf";

  function openBrochureDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB not available"));
        return;
      }
      const req = indexedDB.open(IDB_DOC_DB, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_DOC_STORE)) {
          db.createObjectStore(IDB_DOC_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getBrochureFromIDB() {
    try {
      const db = await openBrochureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_DOC_STORE, "readonly");
        const store = tx.objectStore(IDB_DOC_STORE);
        const req = store.get(BROCHURE_DOC_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (_) {
      return null;
    }
  }

  function initBrochureDownload() {
    const downloadBtn = document.getElementById("btn-download-uaf-brochure");
    if (!downloadBtn) return;

    downloadBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      downloadBtn.setAttribute("disabled", "true");
      const origText = downloadBtn.innerHTML;
      downloadBtn.textContent = "Retrieving Document...";

      try {
        let customBrochure = await getBrochureFromIDB();
        if (!customBrochure) {
          customBrochure = localStorage.getItem("uaf_brochure_pdf");
        }
        if (customBrochure) {
          const metaStr = localStorage.getItem("uaf_brochure_meta");
          let dlName = "UAF_Institutional_Brochure_2026.pdf";
          if (metaStr) {
            try {
              const meta = JSON.parse(metaStr);
              if (meta.fileName) dlName = meta.fileName;
            } catch (_) {}
          }
          const a = document.createElement("a");
          a.href = customBrochure;
          a.download = dlName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.__uafShowToast?.("Downloading official UAF Institutional Brochure (PDF)...");
          return;
        }

        // Generate built-in official UAF Institutional Brochure PDF
        generateDefaultBrochurePDF();
      } finally {
        downloadBtn.removeAttribute("disabled");
        downloadBtn.innerHTML = origText;
      }
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
      const senderNumber = document.getElementById("don-sender-number")?.value.trim() || "";
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
      if (senderNumber && !finalMessage.includes(`Sender: ${senderNumber}`)) {
        finalMessage = finalMessage ? `[Sender: ${senderNumber}] ${finalMessage}` : `[Sender: ${senderNumber}]`;
      }

      if (!name || !phone || !senderNumber || !address || !consent) {
        window.__uafShowToast?.("Full name, contact phone, sender number, home address, and communication consent are required.");
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
        senderNumber,
        mtnReference: senderNumber,
        email,
        address,
        country,
        amount,
        currency,
        frequency,
        impactArea,
        paymentMethod: "manual_momo",
        message: finalMessage,
        notes: `Sender Number: ${senderNumber} | Address: ${address}`,
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
