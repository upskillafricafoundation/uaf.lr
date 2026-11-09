/* =========================================================
   UAF IMPACT — ADMIN: SHARED TOOLS  (NEW FILE)
   - paginate / pagerHtml / bindPager : 10 per page with Previous / Next
   - exportExcel / exportPdf / bindExport : download buttons (Excel + PDF)
   Load this BEFORE community.js, donations.js, stories.js, empowerment.js,
   partnerships.js.
   ========================================================= */
(() => {
  "use strict";

  const PAGE_SIZE = 10;

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  /* ---------------- sorting ---------------- */
  function stamp(v) {
    if (!v) return 0;
    const t = new Date(v).getTime();
    return isNaN(t) ? 0 : t;
  }
  /** Newest first. keys = list of functions/field names tried in order for the date. */
  function newestFirst(list, keys) {
    const ks = (keys && keys.length ? keys : ["createdAt", "timestamp", "updatedAt", "date"]);
    const get = (x) => {
      for (const k of ks) {
        const v = typeof k === "function" ? k(x) : x[k];
        if (v) return stamp(v);
      }
      return 0;
    };
    return list.map((x, i) => ({ x, i, t: get(x) }))
      .sort((a, b) => (b.t - a.t) || (a.i - b.i))
      .map((o) => o.x);
  }

  /* ---------------- pagination ---------------- */
  function paginate(items, page, size) {
    const n = size || PAGE_SIZE;
    const pages = Math.max(1, Math.ceil(items.length / n));
    const p = Math.min(Math.max(0, Number(page) || 0), pages - 1);
    return {
      slice: items.slice(p * n, (p + 1) * n),
      page: p, pages: pages, total: items.length, size: n,
      from: items.length ? p * n + 1 : 0,
      to: Math.min(items.length, (p + 1) * n)
    };
  }

  function pagerHtml(pg) {
    if (!pg || !pg.total) return "";
    const btn = (dir, label, off) => `<button type="button" class="btn btn--outline" data-pager="${dir}" data-page="${pg.page}"
      style="padding:5px 12px;font-size:12.5px;" ${off ? "disabled" : ""}>${label}</button>`;
    return `<div class="uaf-pager" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 4px 4px;">
      <span class="admin-muted" style="font-size:12.5px;">Showing ${pg.from}–${pg.to} of ${pg.total} · Page ${pg.page + 1} of ${pg.pages}</span>
      <span style="display:flex;gap:8px;">${btn("prev", "← Previous", pg.page <= 0)}${btn("next", "Next →", pg.page >= pg.pages - 1)}</span>
    </div>`;
  }

  function bindPager(container, onChange) {
    container.querySelectorAll("button[data-pager]").forEach((b) => {
      b.addEventListener("click", () => {
        const cur = Number(b.dataset.page) || 0;
        onChange(b.dataset.pager === "next" ? cur + 1 : cur - 1);
      });
    });
  }

  /** Renders the pager under `container` and wires it. */
  function attachPager(container, pg, onChange) {
    container.insertAdjacentHTML("beforeend", pagerHtml(pg));
    bindPager(container, onChange);
  }

  /* ---------------- downloads ---------------- */
  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-lib="${src}"]`)) return resolve();
      const el = document.createElement("script");
      el.src = src; el.dataset.lib = src;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(el);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const clean = (v) => (v == null || v === "—" ? "" : String(v));

  async function exportExcel(base, sheet, headers, rows) {
    const body = rows.map((r) => r.map(clean));
    try {
      await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
      const ws = window.XLSX.utils.aoa_to_sheet([headers].concat(body));
      ws["!cols"] = headers.map((h, i) => ({ wch: Math.min(45, Math.max(String(h).length + 2, ...body.map((r) => String(r[i]).length + 2))) }));
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, String(sheet || "Data").slice(0, 31));
      window.XLSX.writeFile(wb, base + ".xlsx");
      return "xlsx";
    } catch (e) {
      const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
      const csv = "\ufeff" + [headers].concat(body).map((r) => r.map(q).join(",")).join("\r\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), base + ".csv");
      return "csv";
    }
  }

  async function exportPdf(title, subtitle, base, headers, rows, landscape) {
    await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
    const doc = new window.jspdf.jsPDF({ orientation: landscape === false ? "portrait" : "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(15);
    doc.text("Upskill Africa Foundation - " + title, 40, 40);
    doc.setFontSize(9);
    doc.text((subtitle ? subtitle + "  |  " : "") + rows.length + " record" + (rows.length === 1 ? "" : "s") + "  |  Generated " + new Date().toISOString().slice(0, 10), 40, 56);
    doc.autoTable({
      head: [headers], body: rows.map((r) => r.map(clean)), startY: 70,
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [0, 40, 104] }, margin: { left: 40, right: 40 }
    });
    doc.save(base + ".pdf");
  }

  /**
   * Wires buttons [data-export="xlsx"|"pdf"] inside `scope`.
   * getData() -> { base, title, subtitle, sheet, headers, rows }   (ALL records, not just the visible page)
   * notify(message, kind) is optional.
   */
  function bindExport(scope, getData, notify) {
    scope.querySelectorAll("[data-export]").forEach((btn) => {
      if (btn.dataset.exportBound) return;
      btn.dataset.exportBound = "1";
      btn.addEventListener("click", async () => {
        const d = getData();
        if (!d || !d.rows || !d.rows.length) { notify && notify("Nothing to download yet.", "error"); return; }
        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = "Preparing…";
        try {
          if (btn.dataset.export === "xlsx") {
            const kind = await exportExcel(d.base, d.sheet || d.title, d.headers, d.rows);
            notify && notify(kind === "csv" ? "Excel library unavailable - downloaded as CSV (opens in Excel)." : "Excel file downloaded.", "success");
          } else {
            await exportPdf(d.title, d.subtitle, d.base, d.headers, d.rows, d.landscape);
            notify && notify("PDF downloaded.", "success");
          }
        } catch (err) {
          console.warn("Export failed", err);
          notify && notify("Download failed. Check your internet connection and try again.", "error");
        } finally { btn.disabled = false; btn.textContent = orig; }
      });
    });
  }

  const exportButtonsHtml = (extraStyle) => `
    <span style="display:inline-flex;gap:6px;${extraStyle || ""}">
      <button type="button" class="btn btn--outline" data-export="xlsx" style="font-size:12px;padding:7px 12px;">⬇ Excel</button>
      <button type="button" class="btn btn--outline" data-export="pdf" style="font-size:12px;padding:7px 12px;">⬇ PDF</button>
    </span>`;

  const today = () => new Date().toISOString().slice(0, 10);

  window.__uafTools = { PAGE_SIZE, esc, newestFirst, paginate, pagerHtml, bindPager, attachPager,
    loadScriptOnce, downloadBlob, exportExcel, exportPdf, bindExport, exportButtonsHtml, today };
})();
