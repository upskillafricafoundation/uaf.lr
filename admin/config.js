/* =========================================================
   UAF ADMIN — CONFIG  (the admin app's own settings)
   This folder is self-contained, so it can be hosted:
     (a) inside the public site at  https://YOUR-SITE/admin/   (default), or
     (b) on its own address, e.g.   https://admin.YOUR-SITE/
         -> upload the CONTENTS of this admin folder to that host's root.

   PUBLIC_URL : where the "Public Website" link goes.
                Default "../index.html" works for (a).
                For (b) use the full address, e.g. "https://www.upskillafrica.org/".
   ========================================================= */
window.UAF_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxmd3eYHQ2heZA7Q-lEkBARNzBRGHGuHBHqhJvu_uPlMEFINPbk37TfWbB_o1tM3_YJ/exec",
  SHARE_BASE: "https://uaf-share.upskillafrica-lr.workers.dev/",
  PUBLIC_URL: "../index.html"
};
