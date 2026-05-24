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
    { key: 'specNotes', group: 'Content blocks', label: 'Specification notes', desc: 'Dimensions, finish and colour against each material.',  defaultOn: true },
    { key: 'element',   group: 'Per item',       label: 'Element',             desc: 'Which element the row belongs to (e.g. door, joinery).', defaultOn: true },
    { key: 'location',  group: 'Per item',       label: 'Location',            desc: 'Room / zone the row is assigned to.',                    defaultOn: true },
    { key: 'supplier',  group: 'Per item',       label: 'Brand & supplier',    desc: 'Brand name and supplier reference.',                     defaultOn: true },
    { key: 'trade',     group: 'Per item',       label: 'Trade',               desc: 'Which trade is responsible (e.g. joiner, plumber).',     defaultOn: false },
    { key: 'sku',       group: 'Per item',       label: 'SKU / product code',  desc: 'Supplier-side product reference (if present).',          defaultOn: false },
  ];

  // ─── Card enrichment ──────────────────────────────────────────────
  // Precompute display strings each theme can read without poking
  // into the underlying material object. Keeps themes pure.
  function enrichCard(card, content) {
    const m = card.material;
    const dims   = m ? (fv(m, 'dimensions') || fv(m, 'thickness')) : null;
    const finish = m ? (fv(m, 'finish') || fv(m, 'sheen_paint'))   : null;
    const colour = m ? (fv(m, 'colour_name') || fv(m, 'colour_code')) : null;
    const specNote = [dims, finish, colour].filter(Boolean).join(' · ') || null;
    return {
      ...card,
      _dims:     dims     || null,
      _finish:   finish   || null,
      _colour:   colour   || null,
      _specNote: content && content.specNotes ? specNote : null,
    };
  }

  function enrichGroups(groups, content) {
    return (groups || []).map(g => ({
      ...g,
      cards: (g.cards || []).map(c => enrichCard(c, content)),
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
      const enrichedGroups = enrichGroups(data && data.groups, content);
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
