// Export profile · Project Schedule (Vol IV) — themed pdfmake renderers.
//
// Spec-focused PDF export (NO pricing). Reads SchedulePage's `groups`
// shape directly (each group = { key, title, groupValue, cards: [...] }
// where each card is the output of resolveCardFromRow() — see
// src/SchedulePage.jsx).
//
// Visual identity is delegated to the active theme (D1–D10, minus D7)
// from src/export-themes.jsx. This file owns:
//
//   • the "Schedule" toggle set (content blocks + per-item flags)
//   • card enrichment (computes specNotes strings ahead of theme)
//   • dispatch to theme.buildCoverGrouped() / buildTable() / buildCards()
//
// Every theme honours the same enriched-card shape — pricing fields
// are absent because Project Schedule doesn't carry them.

(function () {
  if (typeof window === 'undefined') return;
  const B = window.expPdf;
  if (!B) {
    console.error('[export-profile-schedule] requires window.expPdf — load src/export-pdf-builder.jsx first.');
    return;
  }
  const { fv } = B;

  // ─── Toggles ──────────────────────────────────────────────────────
  const SCHEDULE_TOGGLES = [
    { key: 'cover',     group: 'Content blocks', label: 'Cover sheet',         desc: 'Project name, code, client, stage, date and revision. Adds a final summary + sign-off page.', defaultOn: true },
    { key: 'imagery',   group: 'Content blocks', label: 'Material imagery',    desc: 'Swatch tones against each row.',                       defaultOn: true },
    { key: 'specNotes', group: 'Content blocks', label: 'Specification fields', desc: 'All specification fields recorded against each item, exactly as the schedule shows them.',  defaultOn: true },
    { key: 'element',   group: 'Per item',       label: 'Element',             desc: 'Which element the row belongs to (e.g. door, joinery).', defaultOn: true },
    { key: 'location',  group: 'Per item',       label: 'Location',            desc: 'Room / zone the row is assigned to.',                    defaultOn: true },
    { key: 'supplier',  group: 'Per item',       label: 'Brand & supplier',    desc: 'Brand name and supplier reference.',                     defaultOn: true },
    { key: 'trade',     group: 'Per item',       label: 'Trade',               desc: 'Which trade is responsible (e.g. joiner, plumber).',     defaultOn: false },
    { key: 'sku',       group: 'Per item',       label: 'SKU / product code',  desc: 'Supplier-side product reference (if present).',          defaultOn: false },
  ];

  // ─── Field value formatting ───────────────────────────────────────
  // Mirror FieldRenderer read mode (src/fields/FieldRenderer.jsx:389-438)
  // so the PDF shows each value exactly as the on-screen card does. Returns
  // a plain string, or null when the field is empty / not renderable here.
  // pdfmake's line-breaker infinite-loops on run-on URL tokens like
  // "https://…" in some monospace theme fonts (e.g. JetBrainsMono in D2) — even
  // the bare string "https://" hangs. Inserting a zero-width space (U+200B)
  // after ':' and '/' gives the breaker a safe break opportunity. It's
  // invisible and harmless in proportional fonts, and lets long URLs wrap.
  function softBreakUrls(s) {
    return (s && s.indexOf('://') !== -1) ? s.replace(/([:/])/g, '$1​') : s;
  }

  function formatFieldValue(field, raw) {
    if (raw == null || raw === '') return null;
    const t = field.type;
    const vlabel = (v, l) => (window.valueLabel ? window.valueLabel(v, l != null ? l : v) : String(v));
    if (t === 'boolean') return raw ? 'Yes' : 'No';
    if (t === 'currency') {
      const n = Number(raw);
      return isFinite(n) ? B.fmtCurrency(n) : String(raw);
    }
    if ((t === 'select' && field.multiple) || field.tagAxis) {
      const arr = Array.isArray(raw) ? raw : [];
      if (!arr.length) return null;
      return arr.map(v => {
        const opt = (field.options || []).find(o => o.value === v);
        return vlabel(v, opt ? opt.label : v);
      }).join(', ');
    }
    if (t === 'select') {
      const opt = (field.options || []).find(o => o.value === raw);
      return vlabel(raw, opt ? (opt.label || opt.value) : raw);
    }
    if (t === 'url') return softBreakUrls(String(raw));
    if (t === 'color' || t === 'swatchRef') {
      const tone = (raw && (raw.tone || raw)) || null;
      return typeof tone === 'string' ? tone : null;
    }
    if (t === 'itemRef') return null; // not resolved in export context
    // number / date / text (text may contain a pasted URL → soft-break it)
    return softBreakUrls(String(raw) + (field.unit ? ' ' + field.unit : ''));
  }

  // Identity / column fields rendered elsewhere — excluded from the spec grid
  // so they don't duplicate. Matches CardVariantD's FIELD_SKIP plus the
  // 'supplier' column the themes already render.
  const SPEC_SKIP = new Set(['code', 'name', 'swatch', 'image_ref', 'supplier']);

  // Schema-driven field list for a card, mirroring CardVariantD's selection
  // (src/schedule/CardVariantD.jsx:166-196): every field in the item's
  // category that has a value, minus hidden (project + per-row) and identity
  // fields. Returns [{ label, value, wide, mono }].
  function cardSpecs(card, globalHidden) {
    const m = card.material;
    if (!m || !window.fieldsForCategory) return [];
    const cat = card.category || m.category;
    const fields = window.fieldsForCategory(cat) || [];
    const hidden = new Set([].concat(card.hiddenFields || [], globalHidden || []));
    const out = [];
    fields.forEach(field => {
      if (!field || field.hidden) return;
      if (SPEC_SKIP.has(field.id)) return;
      if (hidden.has(field.id)) return;
      const value = formatFieldValue(field, fv(m, field.id));
      if (value == null || value === '') return;
      out.push({
        label: field.unit ? (field.label + ' (' + field.unit + ')') : field.label,
        value: value,
        // Wide → rendered full-width rather than in the 2-column grid. URLs and
        // other long single-token values have no break opportunity, so in a
        // narrow column they overflow and can hang pdfmake's layout; give them
        // the full page width.
        wide: field.type === 'longText' || field.type === 'url'
          || field.id === 'notes' || String(value).length > 30,
        mono: field.type === 'number' || field.type === 'currency' || field.type === 'date',
      });
    });
    return out;
  }

  // Short one-line note for the COMPACT TABLE layout (dims · finish · colour).
  // The dense table renders this in a narrow cell; a long multi-line value in a
  // monospace theme (e.g. D2's JetBrainsMono) makes pdfmake's table auto-width
  // resolution infinite-loop, so the table deliberately stays to a short note.
  // The full per-item field set lives in the cover-grouped layout (card._specs).
  function shortNote(card) {
    const m = card.material;
    if (!m) return null;
    const dims   = fv(m, 'dimensions') || fv(m, 'thickness');
    const sheen  = fv(m, 'sheen_paint');
    const finish = fv(m, 'finish') || (sheen && window.valueLabel ? window.valueLabel(sheen) : sheen);
    const colour = fv(m, 'colour_name') || fv(m, 'colour_code');
    let note = [dims, finish, colour].filter(Boolean).map(String).join('  ·  ');
    if (note.length > 60) note = note.slice(0, 58).replace(/\s+\S*$/, '') + '…';
    return note || null;
  }

  // ─── Card enrichment ──────────────────────────────────────────────
  // Precompute the schema-driven spec list (card._specs → full per-item grid in
  // cover-grouped) and a SHORT one-line note (card._specLine → compact table)
  // so themes stay focused on visual identity.
  function enrichCard(card, content, globalHidden) {
    const specs = (content && content.specNotes) ? cardSpecs(card, globalHidden) : [];
    return {
      ...card,
      _specs:    specs,
      _specLine: (content && content.specNotes) ? shortNote(card) : null,
    };
  }

  function enrichGroups(groups, content, globalHidden) {
    return (groups || []).map(g => ({
      ...g,
      cards: (g.cards || []).map(c => enrichCard(c, content, globalHidden)),
    }));
  }

  // ─── Layout dispatch ──────────────────────────────────────────────
  // Map each layout id to the theme method that renders it.
  const LAYOUT_METHOD = {
    'cover-grouped': 'buildCoverGrouped',
    'table':         'buildTable',
    'cards':         'buildCards',
  };

  function withTheme(layout) {
    return function ({ project, data, content, revision, builder, themeId }) {
      const themes = window.expThemes;
      if (!themes) throw new Error('export-themes.jsx not loaded — theme registry missing.');
      const theme = themes.get(themeId || themes.DEFAULT_ID);
      const fn = theme[LAYOUT_METHOD[layout]];
      if (!fn) throw new Error('Theme ' + theme.id + ' has no builder for layout ' + layout);
      const enrichedGroups = enrichGroups(data && data.groups, content, data && data.globalHiddenFields);
      // Empty groups → return a clean "Nothing to export" fragment.
      // Avoids pdfmake hanging on empty table bodies inside summary nodes.
      if (!enrichedGroups.length) {
        return {
          content: [{
            text: 'No items to export.',
            font: 'Roboto',
            fontSize: 12,
            italics: true,
            color: '#6a665d',
            margin: [0, 80, 0, 0],
            alignment: 'center',
          }],
        };
      }
      const enrichedData = { ...data, groups: enrichedGroups };
      const frag = fn({
        project,
        data: enrichedData,
        content,
        revision,
        builder,
        theme,
      });
      // Theme can supply its own page margins; bubble them up so the
      // wizard can pick them over the defaults.
      if (theme.pageMargins && theme.pageMargins[layout] && !frag.pageMargins) {
        frag.pageMargins = theme.pageMargins[layout];
      }
      return frag;
    };
  }

  // ─── Layout descriptors (A cover-grouped · B table · C cards) ─────
  const SCHEDULE_LAYOUTS = [
    {
      id: 'cover-grouped',
      eyebrow: 'A — Recommended',
      title: 'Cover & grouped sections',
      desc: 'Project cover sheet, then each group on its own page with the chosen visual direction. Ends with a summary + sign-off page.',
      meta: 'A4 portrait · multi-page',
    },
    {
      id: 'table',
      eyebrow: 'B',
      title: 'Compact table',
      desc: 'Dense single-row records grouped by section. Best for builder and consultant handover.',
      meta: 'A3 landscape · banded',
    },
    {
      id: 'cards',
      eyebrow: 'C — Mirrors the app',
      title: 'Schedule cards',
      desc: 'Editorial cards that mirror the on-screen Schedule — a product swatch on the left, then the element, name, category, quantity and every specification field. Grouped by section.',
      meta: 'A4 portrait · one card per item',
    },
  ];

  // ─── Profile ──────────────────────────────────────────────────────
  window.SCHEDULE_EXPORT_PROFILE = {
    id: 'schedule',
    filenameStem: 'project-schedule',
    eyebrow: 'IV · Project Schedule / Export',
    drawerTitle: 'Export to PDF',
    subtitle: ({ project, data }) => {
      const n = (data && data.itemCount) || 0;
      const groups = (data && data.groups) || [];
      const grouping = (data && data.grouping) || 'section';
      const groupingLabel = grouping === 'category' ? 'categories'
        : grouping === 'none' ? 'a single list'
        : 'sections';
      return (
        <>A printable record of <strong style={{ fontStyle: 'normal' }}>{(project && project.name) || 'Untitled project'}</strong> — {n} item{n === 1 ? '' : 's'} across {groups.length} {groupingLabel}.</>
      );
    },
    toggles: SCHEDULE_TOGGLES,
    // Default to the recommended cover-grouped layout; cards (C) is opt-in.
    defaultLayout: 'cover-grouped',
    // Profile owns the layout list — wizard uses this instead of its
    // own defaults.
    layouts: SCHEDULE_LAYOUTS,
    layoutPaperHint: {
      'cover-grouped': { paper: 'A4', orientation: 'portrait' },
      'table':         { paper: 'A3', orientation: 'landscape' },
      'cards':         { paper: 'A4', orientation: 'portrait' },
    },
    // Theme support — wizard reads this to know whether to show the
    // Theme step.
    themes: {
      enabled: true,
      defaultId: 'D1',
    },
    builders: {
      coverGrouped: withTheme('cover-grouped'),
      table:        withTheme('table'),
      cards:        withTheme('cards'),
    },
    estimatePages: (layout, data) => {
      const n = (data && data.itemCount) || 0;
      const groups = (data && data.groups) || [];
      if (layout === 'table') return Math.max(1, Math.ceil(n / 30));
      if (layout === 'cards') {
        // Editorial cards flow ~2 per A4 page, plus a masthead.
        return 1 + Math.max(1, Math.ceil(n / 2));
      }
      // cover-grouped: cover + (per-group pages, ~18 items/page) + summary
      const catPages = groups.reduce((s, g) => s + Math.max(1, Math.ceil(((g.cards || []).length) / 18)), 0);
      return 1 + (catPages || groups.length || 1) + 1;
    },
  };
})();
