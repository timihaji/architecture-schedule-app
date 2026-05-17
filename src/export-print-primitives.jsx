// Shared print-region primitives + helpers used by every export profile.
//
// This module is loaded BEFORE ExportWizardDrawer.jsx and BEFORE any
// export-profile-*.jsx file. Profiles compose their layouts using the
// helpers exposed here (and read `window.expPrim.*`) so the
// vocabulary stays consistent across pages (cost / schedule / future).
//
// Anything page-agnostic enough to be used by ≥ 2 profiles belongs
// here. Anything page-specific (e.g. KV rows for "Brand + Lead time")
// stays in the relevant profile file.

(function () {
  if (typeof window === 'undefined') return;

  // ── Material field read — mirrors CostScheduleV2.jsx:38 ─────────────
  function fv(material, fieldId) {
    if (!material) return null;
    if (window.getFieldValue) return window.getFieldValue(material, fieldId);
    return (material.fields && material.fields[fieldId]) ?? material[fieldId] ?? null;
  }

  // ── Currency formatter — mirrors CostScheduleV2.jsx:18 ──────────────
  function fmtCurrency(n) {
    if (n == null || !Number.isFinite(n)) return '—';
    const v = Math.round(n * 100) / 100;
    return '$' + v.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // ── Filename derivation ─────────────────────────────────────────────
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

  // ── Today, formatted long-form (used on covers) ─────────────────────
  function todayLong() {
    return new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ── <SwatchCell> — small coloured square used in every layout ──────
  // Sizes match the existing print CSS — `.export-swatch` for table
  // rows, `.export-card-swatch` for cards. `kind` selects which.
  function SwatchCell({ tone, kind = 'inline', style = {} }) {
    const base = tone || '#e1dccd';
    if (kind === 'card') {
      return <div className="export-card-swatch export-swatch export-image" style={{ background: base, ...style }} />;
    }
    return (
      <span
        className="swatch export-swatch"
        style={{ background: base, ...style }}
      />
    );
  }

  // ── <KV> — a labelled key/value cell inside a card's grid ──────────
  // `group` is a free-form className tag that lets the parent renderer
  // attach extra CSS hooks if needed; not required by anything in the
  // shared stylesheet.
  function KV({ k, v, mono = false, group, style = {} }) {
    return (
      <div className={'export-kv' + (group ? ' export-kv-' + group : '')} style={style}>
        <span className="k">{k}</span>
        <span className={'v' + (mono ? ' mono' : '')}>{v}</span>
      </div>
    );
  }

  // ── <DocHead> — top-of-document title block for `table` layouts ────
  function DocHead({ eyebrow = 'Document', project, revision, meta }) {
    return (
      <div className="export-doc-head">
        <div className="export-doc-eyebrow">{eyebrow}</div>
        <h1 className="export-doc-title">
          {(project && project.name) || 'Untitled project'}
          {revision && <span className="export-rev">{revision}</span>}
        </h1>
        <div className="export-doc-meta">
          {project && project.code && <span>{project.code}</span>}
          {project && project.code && project.client && <span> · </span>}
          {project && project.client && <span>for {project.client}</span>}
          {meta && (<>{(project && (project.code || project.client)) ? <span> · </span> : null}{meta}</>)}
        </div>
      </div>
    );
  }

  // ── <Cover> — first-page cover for `cover-grouped` layouts ─────────
  // `rightSlot` is whatever the profile wants in the bottom-right block
  // (cost profile passes a grand-total panel; schedule profile passes
  // an item-count panel). Pass null to omit.
  function Cover({ eyebrow = 'Document', project, revision, rightSlot }) {
    return (
      <div className="export-cover">
        <div>
          <div className="export-cover-eyebrow">{eyebrow}</div>
          <h1 className="export-cover-title">{(project && project.name) || 'Untitled project'}</h1>
          <div className="export-cover-meta">
            {project && project.code && <span>{project.code}</span>}
            {project && project.client && <span>For {project.client}</span>}
            <span>{todayLong()}</span>
            {revision && <span>{revision}</span>}
          </div>
        </div>
        <div className="export-cover-rule" />
        {rightSlot ? rightSlot : <div />}
      </div>
    );
  }

  // ── Sanitise a filename for download / print dialog ────────────────
  function safeFilename(s) {
    return String(s || 'export').replace(/[^\w.\-_]+/g, '_');
  }

  window.expPrim = {
    fv,
    fmtCurrency,
    slugify,
    defaultFilename,
    todayLong,
    safeFilename,
    SwatchCell,
    KV,
    DocHead,
    Cover,
  };
})();
