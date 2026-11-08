/* =========================================================
   UAF IMPACT — ADMIN: FORGOT PASSWORD  (NEW FILE - FINAL VERSION)
   Injects a "Forgot password?" link under the password box and
   a recovery panel. Needs no changes to index.html markup.

   Super Admin: 7 questions -> emailed code -> new password
   Other staff: email -> emailed code -> new password
   ========================================================= */
(() => {
  "use strict";

  const API_URL = (window.UAF_CONFIG && window.UAF_CONFIG.API_URL) || "";
  const loginScreen = document.getElementById("login-screen");
  const loginForm = document.getElementById("login-form");
  const pwField = document.getElementById("login-password");
  if (!loginScreen || !loginForm || !pwField) return;

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

  // ---- link under the password field ----
  const link = document.createElement("a");
  link.href = "#";
  link.textContent = "Forgot password?";
  link.style.cssText = "display:inline-block;margin:-4px 0 12px;font-size:12.5px;";
  pwField.closest(".form-field").insertAdjacentElement("afterend", link);

  // ---- panel ----
  const panel = document.createElement("div");
  panel.className = "admin-card admin-card--login is-hidden";
  loginScreen.appendChild(panel);

  let resetToken = "";
  let staffEmail = "";
  let stageToken = "";

  function show() { loginForm.classList.add("is-hidden"); panel.classList.remove("is-hidden"); }
  function hide() { panel.classList.add("is-hidden"); loginForm.classList.remove("is-hidden"); }
  function setMsg(text, isError) {
    const m = panel.querySelector("#rec-msg");
    if (!m) return;
    m.className = isError ? "admin-error" : "admin-muted";
    m.textContent = text || "";
  }
  function field(id, label, type, ph) {
    return `<div class="form-field"><label for="${id}">${label}</label><input id="${id}" type="${type || "text"}" ${ph ? `placeholder="${ph}"` : ""} autocomplete="off" /></div>`;
  }
  const val = (id) => (panel.querySelector("#" + id) || {}).value || "";

  function backLink() {
    return '<p style="text-align:center;margin-top:12px;"><a href="#" id="rec-back">← Back to sign in</a></p>';
  }
  function bindBack() {
    panel.querySelector("#rec-back").addEventListener("click", (e) => {
      e.preventDefault();
      resetToken = ""; stageToken = ""; staffEmail = "";
      hide();
    });
  }

  /* ----- screen 1: choose who you are ----- */
  function screenChoose() {
    panel.innerHTML = `
      <h1>Forgot password</h1>
      <p class="admin-muted">Who are you?</p>
      <button id="rec-super" class="btn btn--primary btn--full">I am the Super Admin</button>
      <button id="rec-staff" class="btn btn--outline btn--full" style="margin-top:8px;">I am another staff member</button>
      ${backLink()}`;
    panel.querySelector("#rec-super").addEventListener("click", screenSuper);
    panel.querySelector("#rec-staff").addEventListener("click", screenStaffEmail);
    bindBack();
  }

  /* ----- Super Admin: 7 identity questions ----- */
  function screenSuper() {
    stageToken = "";
    panel.innerHTML = `
      <h1>Verify your identity</h1>
      <p class="admin-muted">Answer every question exactly as you gave it when recovery was set up. A verification code will then be emailed to you.</p>
      ${field("rq-fullName", "What is your full name?")}
      ${field("rq-position", "What is your position at UAF?")}
      ${field("rq-boardMembership", "What is your membership at the UAF Board of Directors?")}
      ${field("rq-phone", "Telephone number", "tel")}
      ${field("rq-dob", "Date of birth", "date")}
      ${field("rq-hometown", "Home town")}
      ${field("rq-motherName", "Mother's full name")}
      <div id="rec-msg"></div>
      <button id="rec-verify" class="btn btn--primary btn--full">Verify &amp; send code</button>
      ${backLink()}`;
    bindBack();
    panel.querySelector("#rec-verify").addEventListener("click", async (e) => {
      const btn = e.target;
      btn.disabled = true;
      setMsg("Checking…");
      try {
        const answers = {};
        ["fullName", "position", "boardMembership", "phone", "dob", "hometown", "motherName"].forEach((k) => { answers[k] = val("rq-" + k); });
        const res = await callApi("forgotPasswordIdentity", { answers });
        if (res.ok) {
          stageToken = res.stageToken;
          screenCode("Your details match. We sent a 6-digit code to " + (res.maskedEmail || "your account email") + ".");
        } else {
          setMsg(res.error || "Verification failed.", true);
        }
      } catch (err) { setMsg("Couldn't reach the server.", true); }
      btn.disabled = false;
    });
  }

  /* ----- Staff: email -> code ----- */
  function screenStaffEmail() {
    stageToken = "";
    panel.innerHTML = `
      <h1>Reset by email</h1>
      <p class="admin-muted">Enter your account email. We'll send a 6-digit code.</p>
      ${field("rs-email", "Email", "email")}
      <div id="rec-msg"></div>
      <button id="rs-send" class="btn btn--primary btn--full">Send code</button>
      ${backLink()}`;
    bindBack();
    panel.querySelector("#rs-send").addEventListener("click", async (e) => {
      const btn = e.target;
      btn.disabled = true;
      try {
        staffEmail = val("rs-email").trim();
        const res = await callApi("forgotPasswordEmail", { email: staffEmail });
        if (res.ok) screenCode(res.message);
        else setMsg(res.error || "Failed.", true);
      } catch (err) { setMsg("Couldn't reach the server.", true); }
      btn.disabled = false;
    });
  }

  /* ----- Both paths: enter the emailed code ----- */
  function screenCode(message) {
    panel.innerHTML = `
      <h1>Enter the code</h1>
      <p class="admin-muted">${esc(message || "Check your email for the 6-digit code.")}</p>
      ${field("rs-code", "6-digit code", "text")}
      <div id="rec-msg"></div>
      <button id="rs-verify" class="btn btn--primary btn--full">Continue</button>
      ${backLink()}`;
    bindBack();
    panel.querySelector("#rs-verify").addEventListener("click", async (e) => {
      const btn = e.target;
      btn.disabled = true;
      try {
        const code = val("rs-code").trim();
        const res = await callApi("forgotPasswordVerifyCode", stageToken ? { stageToken, code } : { email: staffEmail, code });
        if (res.ok) { resetToken = res.resetToken; stageToken = ""; screenNewPassword(); }
        else setMsg(res.error || "Invalid code.", true);
      } catch (err) { setMsg("Couldn't reach the server.", true); }
      btn.disabled = false;
    });
  }

  /* ----- Both paths: choose the new password ----- */
  function screenNewPassword() {
    panel.innerHTML = `
      <h1>Choose a new password</h1>
      <p class="admin-muted">At least 8 characters, with letters and numbers.</p>
      ${field("np-1", "New password", "password")}
      ${field("np-2", "Confirm new password", "password")}
      <div id="rec-msg"></div>
      <button id="np-save" class="btn btn--primary btn--full">Save password</button>`;
    panel.querySelector("#np-save").addEventListener("click", async (e) => {
      const btn = e.target;
      if (val("np-1") !== val("np-2")) return setMsg("Passwords do not match.", true);
      btn.disabled = true;
      try {
        const res = await callApi("completePasswordReset", { resetToken, newPassword: val("np-1") });
        if (res.ok) {
          resetToken = "";
          panel.innerHTML = `<h1>Password updated</h1><p>${esc(res.message || "You can now sign in.")}</p>
            <button id="np-done" class="btn btn--primary btn--full">Go to sign in</button>`;
          panel.querySelector("#np-done").addEventListener("click", hide);
        } else setMsg(res.error || "Failed.", true);
      } catch (err) { setMsg("Couldn't reach the server.", true); }
      btn.disabled = false;
    });
  }

  link.addEventListener("click", (e) => { e.preventDefault(); screenChoose(); show(); });
})();
