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
//   • dispatch to theme.buildCoverGrouped() / theme.buildTable()
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
    if (t === 'url') return String(raw);
    if (t === 'color' || t === 'swatchRef') {
      const tone = (raw && (raw.tone || raw)) || null;
      return typeof tone === 'string' ? tone : null;
    }
    if (t === 'itemRef') return null; // not resolved in export context
    // number / date / text
    return String(raw) + (field.unit ? ' ' + field.unit : '');
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
        wide: field.type === 'longText' || field.id === 'notes',
        mono: field.type === 'number' || field.type === 'currency' || field.type === 'date',
      });
    });
    return out;
  }

  // ─── Card enrichment ──────────────────────────────────────────────
  // Precompute the schema-driven spec list (for the full per-item grid in
  // cover-grouped) and a one-line spec string (for the compact table) so
  // themes stay focused on visual identity.
  function enrichCard(card, content, globalHidden) {
    const specs = (content && content.specNotes) ? cardSpecs(card, globalHidden) : [];
    const specLine = specs.map(s => s.label + ' ' + s.value).join('  ·  ') || null;
    return {
      ...card,
      _specs:    specs,
      _specLine: specLine,
    };
  }

  function enrichGroups(groups, content, globalHidden) {
    return (groups || []).map(g => ({
      ...g,
      cards: (g.cards || []).map(c => enrichCard(c, content, globalHidden)),
    }));
  }

  // ─── Layout dispatch ──────────────────────────────────────────────
  function withTheme(layout) {
    return function ({ project, data, content, revision, builder, themeId }) {
      const themes = window.expThemes;
      if (!themes) throw new Error('export-themes.jsx not loaded — theme registry missing.');
      const theme = themes.get(themeId || themes.DEFAULT_ID);
      const fn = theme[layout === 'cover-grouped' ? 'buildCoverGrouped' : 'buildTable'];
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

  // ─── Layout descriptors (no cards layout — dropped per spec) ──────
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
    // Cards layout is gone — default to cover-grouped so the wizard
    // doesn't try to dispatch to a missing builder.
    defaultLayout: 'cover-grouped',
    // Profile owns the layout list — wizard uses this instead of its
    // own defaults.
    layouts: SCHEDULE_LAYOUTS,
    layoutPaperHint: {
      'cover-grouped': { paper: 'A4', orientation: 'portrait' },
      'table':         { paper: 'A3', orientation: 'landscape' },
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
    },
    estimatePages: (layout, data) => {
      const n = (data && data.itemCount) || 0;
      const groups = (data && data.groups) || [];
      if (layout === 'table') return Math.max(1, Math.ceil(n / 30));
      // cover-grouped: cover + (per-group pages, ~18 items/page) + summary
      const catPages = groups.reduce((s, g) => s + Math.max(1, Math.ceil(((g.cards || []).length) / 18)), 0);
      return 1 + (catPages || groups.length || 1) + 1;
    },
  };
})();
