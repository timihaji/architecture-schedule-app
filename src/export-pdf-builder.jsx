// Shared pdfmake helpers + style tokens used by every export profile.
//
// pdfmake takes a declarative document definition object (docDef) and
// renders it to a real vector PDF — selectable text, searchable,
// small file size, no browser headers/footers, no print dialog.
//
// Every profile's three layout builders (cards / table / cover-grouped)
// returns a docDef-fragment (the `content` array + optional shared
// styles). The wizard then wraps it with page settings, watermark,
// info metadata before calling pdfMake.createPdf().
//
// Loaded BEFORE ExportWizardDrawer.jsx and BEFORE any profile file.

(function () {
  if (typeof window === 'undefined') return;

  // ─── Lazy-load pdfmake from CDN ────────────────────────────────────
  // ~1.3MB total (pdfmake + vfs_fonts). Triggered the first time the
  // wizard opens so the user's initial page load isn't penalised.
  const PDFMAKE_SRC   = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js';
  const VFS_FONTS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.js';

  let pdfMakePromise = null;
  function ensurePdfMake() {
    if (window.pdfMake) return Promise.resolve(window.pdfMake);
    if (pdfMakePromise) return pdfMakePromise;
    pdfMakePromise = loadScript(PDFMAKE_SRC)
      .then(() => loadScript(VFS_FONTS_SRC))
      .then(() => {
        if (!window.pdfMake) throw new Error('pdfMake failed to load');
        // Use the bundled Roboto font for everything. Other PDF
        // standard fonts (Times, Helvetica) would need vfs entries
        // pdfmake's default CDN bundle doesn't ship — referencing them
        // makes createPdf() hang silently waiting for missing data.
        // Roboto is a clean modern sans that prints beautifully.
        return window.pdfMake;
      })
      .catch(err => {
        pdfMakePromise = null; // allow retry
        throw err;
      });
    return pdfMakePromise;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Already loading / loaded?
      const existing = document.querySelector('script[data-export-cdn="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load ' + src)));
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = false; // preserve order across multiple loadScript calls
      s.dataset.exportCdn = src;
      s.onload  = () => { s.dataset.loaded = '1'; resolve(); };
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  // ─── Material field read (matches CostScheduleV2:38) ───────────────
  function fv(material, fieldId) {
    if (!material) return null;
    if (window.getFieldValue) return window.getFieldValue(material, fieldId);
    return (material.fields && material.fields[fieldId]) ?? material[fieldId] ?? null;
  }

  function fmtCurrency(n) {
    if (n == null || !Number.isFinite(n)) return '—';
    const v = Math.round(n * 100) / 100;
    return '$' + v.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function slugify(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function defaultFilename(project, stem) {
    const date = new Date().toISOString().slice(0, 10);
    const parts = [
      slugify(project && project.code),
      slugify(project && project.name) || 'untitled',
      stem || 'export',
      date,
    ].filter(Boolean);
    return parts.join('_') + '.pdf';
  }

  function todayLong() {
    return new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function safeFilename(s) {
    return String(s || 'export').replace(/[^\w.\-_]+/g, '_');
  }

  // ═══ pdfmake helpers ═══════════════════════════════════════════════

  // mm → points (pdfmake uses pt for pageMargins).
  const MM = 2.83465;

  // Paper sizes pdfmake accepts as keywords. Anything else falls back
  // to A4. Letter is 'LETTER' in pdfmake (case-sensitive).
  const PAPER_KEY = { A4: 'A4', A3: 'A3', Letter: 'LETTER' };

  // Margins (mm) per paper × orientation — landscape gets slightly
  // tighter so dense tables breathe.
  const PAGE_MARGINS_MM = {
    A4:     { portrait: 18, landscape: 14 },
    A3:     { portrait: 20, landscape: 16 },
    Letter: { portrait: 18, landscape: 14 },
  };

  function pageMargins(paper, orientation) {
    const mm = (PAGE_MARGINS_MM[paper] && PAGE_MARGINS_MM[paper][orientation]) || 16;
    const pt = Math.round(mm * MM);
    return [pt, pt, pt, pt];
  }

  // ─── Colour palette (matches app design tokens) ────────────────────
  const COLOR = {
    ink:    '#1a1815',
    ink2:   '#2c2924',
    ink3:   '#6a665d',
    ink4:   '#9a958a',
    rule:   '#1a1815',
    rule2:  '#c8c2b3',
    rule3:  '#d8d3c4',
    paper:  '#ffffff',
    accent: '#8a3020',
    sub:    '#9a958a',
  };

  // ─── Style tokens (pdfmake `styles` map) ───────────────────────────
  // All Roboto — pdfmake's bundled font. Roboto has Regular / Medium /
  // Italic / Medium-Italic which gives us enough hierarchy. Larger
  // sizes do most of the visual heavy lifting where a serif title
  // would otherwise.
  const STYLES = {
    /* Cover */
    coverEyebrow: { fontSize: 9,  characterSpacing: 1.2, color: COLOR.ink3, bold: true },
    coverTitle:   { fontSize: 36, color: COLOR.ink, bold: true, lineHeight: 1.05 },
    coverMeta:    { fontSize: 9,  characterSpacing: 0.6, color: COLOR.ink3 },

    /* Document head (table layout) */
    docEyebrow:   { fontSize: 8.5, characterSpacing: 1.3, color: COLOR.ink3, bold: true },
    docTitle:     { fontSize: 22,  color: COLOR.ink, bold: true },
    docMeta:      { fontSize: 8.5, characterSpacing: 0.6, color: COLOR.ink3 },

    /* Cards layout */
    cardCode:     { fontSize: 9,    characterSpacing: 0.6, color: COLOR.ink3, bold: true },
    cardName:     { fontSize: 24,   color: COLOR.ink, bold: true, lineHeight: 1.1 },
    cardCat:      { fontSize: 8.5,  characterSpacing: 1.3, color: COLOR.ink3, bold: true },
    cardKvK:      { fontSize: 7.5,  characterSpacing: 1.1, color: COLOR.ink3 },
    cardKvV:      { fontSize: 10,   color: COLOR.ink, bold: true },
    cardKvVMono:  { fontSize: 10,   color: COLOR.ink },

    /* Tables */
    tHead:        { fontSize: 8,   characterSpacing: 1.2, color: COLOR.ink2, bold: true },
    tCell:        { fontSize: 9,   color: COLOR.ink },
    tCellMono:    { fontSize: 8.5, color: COLOR.ink3 },
    tCellNum:     { fontSize: 9,   color: COLOR.ink, alignment: 'right' },
    tCellName:    { fontSize: 9.5, color: COLOR.ink, bold: true },
    tCellSub:     { fontSize: 8,   color: COLOR.ink3 },
    tCatHead:     { fontSize: 9,   characterSpacing: 1.2, color: COLOR.ink2, bold: true, margin: [0, 8, 0, 2] },
    tSubtotal:    { fontSize: 9.5, color: COLOR.ink, bold: true },
    grandLbl:     { fontSize: 10,  characterSpacing: 1.3, color: COLOR.ink2, bold: true },
    grandVal:     { fontSize: 22,  color: COLOR.ink, bold: true },

    /* Section block (cover-grouped) */
    catHeadBig:   { fontSize: 18,  color: COLOR.ink, bold: true },
    catHeadMeta:  { fontSize: 8.5, characterSpacing: 1.1, color: COLOR.ink3 },
    catSubtotal:  { fontSize: 9,   characterSpacing: 1.1, color: COLOR.ink2, bold: true },

    /* Misc */
    revTag:       { fontSize: 8,  characterSpacing: 0.6, color: COLOR.ink3 },
    italicNote:   { fontSize: 10, italics: true, color: COLOR.ink3 },
  };

  // ─── Reusable docDef-node builders ─────────────────────────────────

  // Horizontal rule across the printable width. pdfmake measures from
  // the left page margin — width 555 ≈ A4 portrait inner width at 18mm
  // margin; for our purposes it just needs to be wider than the column.
  function hr(thickness = 0.6, color = COLOR.ink, marginTop = 6, marginBottom = 6, width = 555) {
    return {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: width, y2: 0, lineWidth: thickness, lineColor: color }],
      margin: [0, marginTop, 0, marginBottom],
    };
  }

  // Coloured swatch square (canvas rect) — used in cards and table cells.
  function swatch(tone, size = 80) {
    return {
      canvas: [{ type: 'rect', x: 0, y: 0, w: size, h: size, color: tone || '#e1dccd', lineColor: '#cfc9b7', lineWidth: 0.4 }],
      width: size,
    };
  }

  // Tiny inline swatch for table rows.
  function inlineSwatch(tone) {
    return {
      canvas: [{ type: 'rect', x: 0, y: 1, w: 10, h: 10, color: tone || '#e1dccd', lineColor: '#cfc9b7', lineWidth: 0.3 }],
      width: 14,
    };
  }

  // Document head block (used by table layout — title + meta + rule).
  function docHead({ eyebrow, project, revision, meta }) {
    const metaParts = [];
    if (project && project.code) metaParts.push(project.code);
    if (project && project.client) metaParts.push('for ' + project.client);
    if (meta) metaParts.push(meta);
    return {
      stack: [
        { text: (eyebrow || 'Document').toUpperCase(), style: 'docEyebrow' },
        {
          columns: [
            { text: (project && project.name) || 'Untitled project', style: 'docTitle' },
            revision ? { text: revision, style: 'revTag', alignment: 'right', margin: [0, 12, 0, 0] } : { text: '' },
          ],
          margin: [0, 2, 0, 4],
        },
        { text: metaParts.join('  ·  '), style: 'docMeta' },
        hr(0.8, COLOR.ink, 8, 14),
      ],
    };
  }

  // Cover-page block.
  function cover({ eyebrow, project, revision, figure }) {
    const metaParts = [];
    if (project && project.code) metaParts.push(project.code);
    if (project && project.client) metaParts.push('For ' + project.client);
    metaParts.push(todayLong());
    if (revision) metaParts.push(revision);
    return {
      stack: [
        { text: '', margin: [0, 60, 0, 0] }, // top spacer
        { text: (eyebrow || 'Document').toUpperCase(), style: 'coverEyebrow' },
        { text: (project && project.name) || 'Untitled project', style: 'coverTitle', margin: [0, 8, 0, 14] },
        { text: metaParts.join('   ·   '), style: 'coverMeta' },
        { text: '', margin: [0, 40, 0, 0] }, // mid spacer
        hr(0.6, COLOR.ink, 0, 20),
        figure || { text: '' },
      ],
      pageBreak: 'after',
    };
  }

  // KV grid — a 2-column block of labelled cells used inside cards.
  // `pairs` is an array of {k, v, mono?}. Lays out as 2 columns by
  // default. Returns a pdfmake `table` node with no visible borders.
  function kvGrid(pairs, opts = {}) {
    if (!pairs || pairs.length === 0) return { text: '' };
    const cols = opts.cols || 2;
    // chunk into rows of `cols`
    const rows = [];
    for (let i = 0; i < pairs.length; i += cols) {
      const row = pairs.slice(i, i + cols);
      while (row.length < cols) row.push(null);
      rows.push(row);
    }
    const body = rows.map(r =>
      r.map(p => p ? ({
        stack: [
          { text: p.k.toUpperCase(), style: 'cardKvK', margin: [0, 0, 0, 2] },
          { text: p.v, style: p.mono ? 'cardKvVMono' : 'cardKvV' },
        ],
        margin: [0, 0, 0, 8],
      }) : { text: '' })
    );
    return {
      table: { widths: Array(cols).fill('*'), body },
      layout: 'noBorders',
      margin: [0, opts.marginTop != null ? opts.marginTop : 8, 0, 0],
    };
  }

  // Make a watermark spec from a wizard cfg setting ('none'|'draft'|'final').
  function makeWatermark(kind) {
    if (kind === 'none' || !kind) return undefined;
    return {
      text: kind.toUpperCase(),
      color: COLOR.ink,
      opacity: 0.06,
      bold: true,
      italics: false,
      fontSize: 140,
      angle: -30,
    };
  }

  // Document info metadata — populated on every PDF for cleanliness.
  function makeInfo({ project, profile }) {
    const subj = (project && project.name) || 'Untitled project';
    const stem = (profile && profile.filenameStem) || 'export';
    return {
      title: subj + ' — ' + stem,
      subject: subj,
      creator: 'Hollis & Arne — Studio Archive',
      producer: 'pdfmake',
    };
  }

  window.expPdf = {
    // bootstrap
    ensurePdfMake,
    // helpers
    fv, fmtCurrency, slugify, defaultFilename, todayLong, safeFilename,
    // pdfmake bits
    COLOR, STYLES, MM,
    PAPER_KEY, pageMargins,
    hr, swatch, inlineSwatch, docHead, cover, kvGrid, makeWatermark, makeInfo,
  };
})();
