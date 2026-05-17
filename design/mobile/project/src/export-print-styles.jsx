// PDF Export — print stylesheet + config bridge.
//
// Injects a single <style id="export-print-styles"> block into <head> on
// load and exposes window.applyExportPrintConfig({...}) which writes
// data-export-* attributes to <html>. The static stylesheet branches on
// those attributes for paper size, orientation, layout-specific page
// breaks, watermark and content-toggle visibility.
//
// Keeping the print CSS isolated here means editing print styles never
// churns ExportWizardDrawer.jsx.

(function () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('export-print-styles')) return;

  var css = [
    /* ─── Screen: hide the print region entirely ───────────────────── */
    '@media screen { #export-print-region { display: none !important; } }',

    /* ─── Print: hide everything else, show only the print region ── */
    /* The active @page rule (paper + orientation + margins) is injected   */
    /* by applyExportPrintConfig() into a separate <style id="export-page  */
    /* -rules"> block — CSS spec doesn\'t allow conditioning @page on      */
    /* attribute selectors, so we swap stylesheet contents instead.        */
    '@media print {',
    '  body > *:not(#export-print-region) { display: none !important; }',
    '  #export-print-region { display: block !important; }',
    '  html, body { background: white !important; color: var(--ink, #1a1815) !important; }',

    /* Layout-specific page breaks */
    '  html[data-export-layout="cards"] .export-card { page-break-after: always; break-inside: avoid; }',
    '  html[data-export-layout="cards"] .export-card:last-child { page-break-after: auto; }',
    '  html[data-export-layout="table"] .export-row { break-inside: avoid; page-break-inside: avoid; }',
    '  html[data-export-layout="table"] .export-section { break-inside: auto; }',
    '  html[data-export-layout="cover-grouped"] .export-cover { page-break-after: always; }',
    '  html[data-export-layout="cover-grouped"] .export-section { page-break-before: always; }',
    '  html[data-export-layout="cover-grouped"] .export-section:first-of-type { page-break-before: auto; }',

    /* Content-toggle visibility, driven by data-export-hide-* on <html> */
    '  html[data-export-hide-cover]     .export-cover         { display: none !important; }',
    '  html[data-export-hide-imagery]   .export-swatch,',
    '  html[data-export-hide-imagery]   .export-image         { display: none !important; }',
    '  html[data-export-hide-pricing]   .export-price-col,',
    '  html[data-export-hide-pricing]   .export-price,',
    '  html[data-export-hide-pricing]   .export-rate,',
    '  html[data-export-hide-pricing]   .export-total         { display: none !important; }',
    '  html[data-export-hide-subtotals] .export-subtotal-row,',
    '  html[data-export-hide-subtotals] .export-subtotal      { display: none !important; }',
    '  html[data-export-hide-grand]     .export-grand         { display: none !important; }',
    '  html[data-export-hide-notes]     .export-notes         { display: none !important; }',
    '  html[data-export-hide-supplier]  .export-supplier      { display: none !important; }',

    /* Watermark — fixed pseudo-element on every page */
    '  html[data-export-watermark="draft"] #export-print-region::before,',
    '  html[data-export-watermark="final"] #export-print-region::before {',
    '    position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
    '    display: flex; align-items: center; justify-content: center;',
    '    font-family: var(--font-serif, Georgia, serif);',
    '    font-weight: 600; font-size: 180px; letter-spacing: 0.04em;',
    '    color: rgba(26, 24, 21, 0.07);',
    '    transform: rotate(-30deg);',
    '    pointer-events: none; z-index: 9999;',
    '  }',
    '  html[data-export-watermark="draft"] #export-print-region::before { content: "DRAFT"; }',
    '  html[data-export-watermark="final"] #export-print-region::before { content: "FINAL"; }',
    '}',

    /* ─── Shared screen+print: print-region typography & layout ───── */
    /* Loaded outside @media print so a "Print preview" iframe (if any host */
    /* uses one) gets the same look. Visibility is still controlled above. */
    '#export-print-region {',
    '  font-family: var(--font-sans, system-ui, sans-serif);',
    '  font-size: 11pt; color: var(--ink, #1a1815);',
    '  line-height: 1.45; background: white;',
    '}',
    '#export-print-region * { box-sizing: border-box; }',

    /* Cover page */
    '#export-print-region .export-cover {',
    '  min-height: 90vh; display: flex; flex-direction: column; justify-content: space-between;',
    '  padding: 24mm 0;',
    '}',
    '#export-print-region .export-cover-eyebrow {',
    '  font-family: var(--font-mono, monospace); font-size: 10pt;',
    '  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3, #6a665d);',
    '  margin-bottom: 8mm;',
    '}',
    '#export-print-region .export-cover-title {',
    '  font-family: var(--font-serif, Georgia, serif); font-size: 48pt;',
    '  font-weight: 500; letter-spacing: -0.012em; line-height: 1.04;',
    '  margin: 0 0 12mm; max-width: 80%;',
    '}',
    '#export-print-region .export-cover-meta {',
    '  font-family: var(--font-mono, monospace); font-size: 10pt;',
    '  letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3, #6a665d);',
    '  display: flex; flex-wrap: wrap; gap: 14px 28px;',
    '}',
    '#export-print-region .export-cover-rule {',
    '  height: 1px; background: var(--ink, #1a1815); margin: 14mm 0;',
    '}',
    '#export-print-region .export-cover-grand {',
    '  display: flex; justify-content: space-between; align-items: baseline;',
    '  border-top: 1px solid var(--ink, #1a1815); padding-top: 6mm;',
    '}',
    '#export-print-region .export-cover-grand .lbl {',
    '  font-family: var(--font-mono, monospace); font-size: 10pt;',
    '  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3, #6a665d);',
    '}',
    '#export-print-region .export-cover-grand .val {',
    '  font-family: var(--font-serif, Georgia, serif); font-size: 32pt; font-weight: 500;',
    '}',

    /* Document header (table layout and cards layout, top-of-doc) */
    '#export-print-region .export-doc-head {',
    '  margin-bottom: 8mm; padding-bottom: 4mm; border-bottom: 1px solid var(--ink, #1a1815);',
    '}',
    '#export-print-region .export-doc-eyebrow {',
    '  font-family: var(--font-mono, monospace); font-size: 9pt;',
    '  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3, #6a665d);',
    '  margin-bottom: 3mm;',
    '}',
    '#export-print-region .export-doc-title {',
    '  font-family: var(--font-serif, Georgia, serif); font-size: 26pt;',
    '  font-weight: 500; letter-spacing: -0.008em; margin: 0 0 2mm;',
    '}',
    '#export-print-region .export-doc-meta {',
    '  font-family: var(--font-mono, monospace); font-size: 9pt;',
    '  letter-spacing: 0.08em; color: var(--ink-3, #6a665d);',
    '}',

    /* ── Layout: Cards (one row per page) ── */
    '#export-print-region .export-card {',
    '  display: grid; grid-template-columns: 36mm 1fr; gap: 12mm;',
    '  padding: 14mm 0; min-height: 220mm; align-content: start;',
    '}',
    '#export-print-region .export-card-swatch {',
    '  width: 36mm; height: 36mm; border: 0.5pt solid rgba(0,0,0,0.18);',
    '}',
    '#export-print-region .export-card-code {',
    '  font-family: var(--font-mono, monospace); font-size: 10pt;',
    '  letter-spacing: 0.06em; color: var(--ink-3, #6a665d);',
    '  text-transform: uppercase; margin-bottom: 2mm;',
    '}',
    '#export-print-region .export-card-name {',
    '  font-family: var(--font-serif, Georgia, serif); font-size: 28pt;',
    '  font-weight: 500; line-height: 1.1; margin: 0 0 3mm;',
    '}',
    '#export-print-region .export-card-cat {',
    '  font-family: var(--font-mono, monospace); font-size: 9pt;',
    '  letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3, #6a665d);',
    '  margin-bottom: 8mm;',
    '}',
    '#export-print-region .export-card-grid {',
    '  display: grid; grid-template-columns: 1fr 1fr; gap: 6mm 10mm;',
    '  border-top: 1px solid var(--ink, #1a1815); padding-top: 6mm;',
    '}',
    '#export-print-region .export-kv .k {',
    '  font-family: var(--font-mono, monospace); font-size: 8.5pt;',
    '  letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3, #6a665d);',
    '  display: block; margin-bottom: 1.5mm;',
    '}',
    '#export-print-region .export-kv .v {',
    '  font-family: var(--font-sans, system-ui, sans-serif); font-size: 11pt;',
    '  color: var(--ink, #1a1815); font-weight: 500;',
    '}',
    '#export-print-region .export-kv .v.mono {',
    '  font-family: var(--font-mono, monospace); font-size: 10pt;',
    '}',
    '#export-print-region .export-card-notes {',
    '  margin-top: 8mm; padding-top: 5mm; border-top: 1px solid var(--rule-2, #c8c2b3);',
    '  font-family: var(--font-serif, Georgia, serif); font-style: italic;',
    '  font-size: 11pt; color: var(--ink-3, #6a665d); line-height: 1.5;',
    '}',

    /* ── Layout: Table (compact dense rows) ── */
    '#export-print-region .export-table {',
    '  width: 100%; border-collapse: collapse;',
    '}',
    '#export-print-region .export-table thead th {',
    '  font-family: var(--font-mono, monospace); font-size: 8.5pt;',
    '  letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-2, #2c2924);',
    '  text-align: left; padding: 4mm 3mm; border-bottom: 1.5pt solid var(--ink, #1a1815);',
    '  vertical-align: bottom; font-weight: 500;',
    '}',
    '#export-print-region .export-table thead th.right { text-align: right; }',
    '#export-print-region .export-table tbody td {',
    '  padding: 3mm; border-bottom: 0.4pt solid var(--rule-2, #c8c2b3);',
    '  font-size: 10pt; vertical-align: top;',
    '}',
    '#export-print-region .export-table td.code { font-family: var(--font-mono, monospace); font-size: 9pt; color: var(--ink-3, #6a665d); }',
    '#export-print-region .export-table td.num  { font-family: var(--font-mono, monospace); font-size: 9.5pt; text-align: right; white-space: nowrap; }',
    '#export-print-region .export-table td.name { font-weight: 500; }',
    '#export-print-region .export-table td.name .swatch { display: inline-block; width: 14px; height: 14px; margin-right: 7px; vertical-align: middle; border: 0.3pt solid rgba(0,0,0,0.2); }',
    '#export-print-region .export-table td.name .sub { display: block; font-weight: 400; font-size: 8.5pt; color: var(--ink-3, #6a665d); margin-top: 0.5mm; }',
    '#export-print-region .export-table tr.export-subtotal-row td {',
    '  background: rgba(0,0,0,0.04); font-weight: 600;',
    '  border-top: 0.6pt solid var(--ink-3, #6a665d); border-bottom: 0.6pt solid var(--ink-3, #6a665d);',
    '}',
    '#export-print-region .export-table tr.export-cat-head td {',
    '  font-family: var(--font-mono, monospace); font-size: 9.5pt;',
    '  letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-2, #2c2924);',
    '  padding: 7mm 3mm 2mm; border-bottom: 0.4pt solid var(--ink-3, #6a665d);',
    '}',
    '#export-print-region .export-grand-row td {',
    '  padding: 6mm 3mm 2mm; font-size: 12pt; font-weight: 600;',
    '  border-top: 1.5pt solid var(--ink, #1a1815);',
    '}',

    /* ── Layout: Cover & grouped sections ── */
    '#export-print-region .export-section { padding-top: 4mm; }',
    '#export-print-region .export-cat-head-block {',
    '  margin-bottom: 6mm; padding-bottom: 3mm; border-bottom: 1.5pt solid var(--ink, #1a1815);',
    '  display: flex; justify-content: space-between; align-items: baseline;',
    '}',
    '#export-print-region .export-cat-head-block .cat-name {',
    '  font-family: var(--font-serif, Georgia, serif); font-size: 22pt;',
    '  font-weight: 500; margin: 0;',
    '}',
    '#export-print-region .export-cat-head-block .cat-meta {',
    '  font-family: var(--font-mono, monospace); font-size: 9pt;',
    '  letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3, #6a665d);',
    '}',
    '#export-print-region .export-section-subtotal {',
    '  margin-top: 6mm; padding-top: 3mm;',
    '  border-top: 1pt solid var(--ink, #1a1815);',
    '  display: flex; justify-content: space-between; align-items: baseline;',
    '  font-family: var(--font-mono, monospace); font-size: 10pt;',
    '  letter-spacing: 0.08em; text-transform: uppercase;',
    '}',
    '#export-print-region .export-section-subtotal .val {',
    '  font-family: var(--font-serif, Georgia, serif); font-size: 16pt;',
    '  font-weight: 500; text-transform: none; letter-spacing: 0;',
    '}',

    /* Final grand-total back page (cover-grouped layout) */
    '#export-print-region .export-grand {',
    '  margin-top: 14mm; padding: 8mm 0;',
    '  border-top: 1.5pt solid var(--ink, #1a1815);',
    '  border-bottom: 1.5pt solid var(--ink, #1a1815);',
    '  display: flex; justify-content: space-between; align-items: baseline;',
    '}',
    '#export-print-region .export-grand .lbl {',
    '  font-family: var(--font-mono, monospace); font-size: 11pt;',
    '  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-2, #2c2924);',
    '}',
    '#export-print-region .export-grand .val {',
    '  font-family: var(--font-serif, Georgia, serif); font-size: 32pt; font-weight: 500;',
    '}',

    /* Revision tag — appears under doc title and on cover */
    '#export-print-region .export-rev {',
    '  font-family: var(--font-mono, monospace); font-size: 9pt;',
    '  letter-spacing: 0.08em; color: var(--ink-3, #6a665d);',
    '  display: inline-block; padding: 2px 8px; border: 0.5pt solid var(--ink-3, #6a665d);',
    '  margin-left: 8px;',
    '}',
  ].join('\n');

  var style = document.createElement('style');
  style.id = 'export-print-styles';
  style.textContent = css;
  document.head.appendChild(style);

  // Page-size margin presets (mm). Landscape gets slightly tighter margins
  // so dense table layouts have more horizontal room.
  var PAGE_MARGINS = {
    A4:     { portrait: 18, landscape: 14 },
    A3:     { portrait: 20, landscape: 16 },
    Letter: { portrait: 18, landscape: 14 },
  };

  // Bridge: apply / clear data-export-* attributes on <html>, and inject
  // the active @page rule (paper size / orientation / margins) into its
  // own swappable <style> block. Called by ExportWizardDrawer right
  // before window.print().
  function applyExportPrintConfig(cfg) {
    var h = document.documentElement;
    h.setAttribute('data-export-paper', cfg.settings.paper);
    h.setAttribute('data-export-orientation', cfg.settings.orientation);
    h.setAttribute('data-export-layout', cfg.layout);
    h.setAttribute('data-export-watermark', cfg.settings.watermark);

    // content toggles: presence of data-export-hide-X means "hide it"
    var c = cfg.content || {};
    setOrRemove(h, 'data-export-hide-cover',     !c.cover);
    setOrRemove(h, 'data-export-hide-notes',     !c.specNotes);
    setOrRemove(h, 'data-export-hide-imagery',   !c.imagery);
    setOrRemove(h, 'data-export-hide-supplier',  !c.supplierLeadTime);
    setOrRemove(h, 'data-export-hide-pricing',   !c.pricing);
    setOrRemove(h, 'data-export-hide-subtotals', !c.tradeSubtotals);
    setOrRemove(h, 'data-export-hide-grand',     !c.grandTotal);

    // Active @page rule — swap a dedicated <style> block. Margin is
    // tightened for landscape so wide tables breathe.
    var paper = cfg.settings.paper;
    var orient = cfg.settings.orientation;
    var margin = (PAGE_MARGINS[paper] && PAGE_MARGINS[paper][orient]) || 16;
    var pageCss = '@page { size: ' + paper + ' ' + orient + '; margin: ' + margin + 'mm; }';
    var pageStyle = document.getElementById('export-page-rules');
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = 'export-page-rules';
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = pageCss;
  }

  function clearExportPrintConfig() {
    var h = document.documentElement;
    var attrs = [
      'data-export-paper', 'data-export-orientation', 'data-export-layout',
      'data-export-watermark',
      'data-export-hide-cover', 'data-export-hide-notes',
      'data-export-hide-imagery', 'data-export-hide-supplier',
      'data-export-hide-pricing', 'data-export-hide-subtotals',
      'data-export-hide-grand',
    ];
    for (var i = 0; i < attrs.length; i++) h.removeAttribute(attrs[i]);
    var pageStyle = document.getElementById('export-page-rules');
    if (pageStyle) pageStyle.textContent = '';
  }

  function setOrRemove(el, attr, on) {
    if (on) el.setAttribute(attr, '');
    else el.removeAttribute(attr);
  }

  window.applyExportPrintConfig = applyExportPrintConfig;
  window.clearExportPrintConfig = clearExportPrintConfig;
})();
