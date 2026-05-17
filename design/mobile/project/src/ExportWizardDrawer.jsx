// ExportWizardDrawer — 3-step right-side drawer for exporting the active
// cost schedule as a PDF.
//
// Design source: /Downloads/schedule_pdf_export_extracted/PDF Export -
// Wizard (Hi-Fi).html. Adapted to the app's existing design tokens
// (--paper/--ink/--rule/--font-serif=Newsreader/--font-sans=Inter Tight/
// --font-mono=JetBrains Mono) and the established .drw-bg/.drw-panel
// drawer chrome from index.html.
//
// Pipeline: wizard collects { layout, content toggles, settings } into a
// `cfg` object → on "Generate PDF" we render the print-region DOM
// (PrintCards / PrintTable / PrintCoverGrouped) into the live React
// tree, call window.applyExportPrintConfig(cfg) to set data-export-*
// attrs + the @page rule, then window.print(). Browser's "Save as PDF"
// produces a real vector PDF (selectable text, sharp at any zoom). The
// `afterprint` event cleans up.
//
// No PDF library, no canvas — pure print stylesheet pipeline. See
// src/export-print-styles.jsx for the matching @media print rules.

(function () {
  if (typeof window === 'undefined') return;
  const { useState, useMemo, useEffect, useRef, useCallback } = React;

  // ─── One-time interior styles ───────────────────────────────────────
  // Only the wizard's own internals (.exp-*) — drawer chrome
  // (.drw-bg/.drw-panel/.drw-head/.drw-body/.drw-foot) is reused from
  // index.html so this drawer visually matches PickerDrawer/MaterialEditor.
  if (typeof document !== 'undefined' && !document.getElementById('exp-wizard-styles')) {
    const s = document.createElement('style');
    s.id = 'exp-wizard-styles';
    s.textContent = [
      /* Stepper */
      '.exp-stepper { display: flex; align-items: center; gap: 0; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--rule-2); }',
      '.exp-step { display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer; user-select: none; background: none; border: none; padding: 0; font-family: inherit; text-align: left; }',
      '.exp-step:disabled { cursor: not-allowed; opacity: 0.55; }',
      '.exp-step-num { width: 24px; height: 24px; border: 1px solid var(--rule-2); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 10px; color: var(--ink-3); transition: all 160ms; }',
      '.exp-step-label { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); transition: color 160ms; }',
      '.exp-step.active .exp-step-num { background: var(--ink); color: var(--paper); border-color: var(--ink); }',
      '.exp-step.active .exp-step-label { color: var(--ink); font-weight: 500; }',
      '.exp-step.done .exp-step-num { background: var(--paper-2, #eae5d9); border-color: var(--ink-3); color: var(--ink-2); }',
      '.exp-step.done .exp-step-label { color: var(--ink-2); }',
      '.exp-step-rule { flex: 0 0 20px; height: 1px; background: var(--rule-2); margin: 0 4px; }',

      /* Section eyebrow + heading */
      '.exp-section-eye { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 6px; }',
      '.exp-section-h { font-family: var(--font-serif); font-size: 21px; font-weight: 500; margin: 0 0 4px; color: var(--ink); line-height: 1.15; }',
      '.exp-section-d { font-family: var(--font-serif); font-style: italic; font-size: 13.5px; color: var(--ink-3); margin: 0 0 20px; }',

      /* Layout cards (Step 1) */
      '.exp-layout-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }',
      '.exp-layout-card { display: grid; grid-template-columns: 110px 1fr; gap: 16px; padding: 13px; border: 1px solid var(--rule-2); background: var(--paper); cursor: pointer; transition: all 140ms; position: relative; text-align: left; font-family: inherit; }',
      '.exp-layout-card:hover { border-color: var(--ink-3); }',
      '.exp-layout-card.selected { border-color: var(--ink); background: var(--paper-2, #eae5d9); }',
      '.exp-layout-card.selected::after { content: "\\2713"; position: absolute; top: 8px; right: 10px; font-family: var(--font-mono); font-size: 13px; color: var(--ink); }',
      '.exp-thumb { aspect-ratio: 0.707; background: #fcfaf3; border: 1px solid var(--rule-2); padding: 7px; display: flex; flex-direction: column; gap: 3px; }',
      '.exp-thumb .t-line { height: 2px; background: var(--ink-4); }',
      '.exp-thumb .t-line.short { width: 50%; }',
      '.exp-thumb .t-line.title { background: var(--ink-2); height: 3px; width: 60%; margin-bottom: 3px; }',
      '.exp-thumb .t-card { border: 1px solid var(--rule-2); padding: 3px; display: flex; gap: 3px; margin-bottom: 3px; }',
      '.exp-thumb .t-swatch { width: 9px; height: 9px; background: var(--ink-4); flex-shrink: 0; }',
      '.exp-thumb .t-stack { flex: 1; display: flex; flex-direction: column; gap: 2px; }',
      '.exp-thumb .t-stack .t-line { height: 1.5px; }',
      '.exp-thumb .t-row { display: flex; gap: 3px; align-items: center; border-bottom: 0.5px solid var(--rule-2); padding-bottom: 2px; }',
      '.exp-thumb .t-row .t-line { height: 1.5px; flex: 1; }',
      '.exp-thumb .t-cover { height: 22px; background: linear-gradient(135deg, var(--ink-3) 0%, var(--ink-4) 100%); margin-bottom: 4px; }',
      '.exp-thumb .t-group-h { font-family: var(--font-mono); font-size: 5px; letter-spacing: 0.1em; color: var(--ink-3); text-transform: uppercase; margin-top: 2px; }',
      '.exp-layout-info-eye { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 4px; }',
      '.exp-layout-info-h { font-family: var(--font-serif); font-size: 18px; font-weight: 500; margin: 0 0 5px; line-height: 1.15; color: var(--ink); }',
      '.exp-layout-info-d { font-size: 12.5px; color: var(--ink-3); line-height: 1.45; margin: 0 0 8px; }',
      '.exp-layout-info-meta { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.06em; color: var(--ink-4); text-transform: uppercase; }',

      /* Field groups + toggles (Step 2) */
      '.exp-fgroup { margin-bottom: 20px; }',
      '.exp-fgroup-h { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--rule-2); }',
      '.exp-toggle-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--rule-2); }',
      '.exp-toggle-row:last-child { border-bottom: none; }',
      '.exp-toggle-text { flex: 1; min-width: 0; }',
      '.exp-toggle-name { font-size: 13.5px; font-weight: 500; color: var(--ink); margin-bottom: 2px; }',
      '.exp-toggle-desc { font-family: var(--font-serif); font-style: italic; font-size: 12.5px; color: var(--ink-3); line-height: 1.4; }',
      '.exp-switch { width: 36px; height: 20px; background: var(--paper-2, #eae5d9); border: 1px solid var(--rule-2); border-radius: 10px; position: relative; cursor: pointer; transition: all 160ms; flex-shrink: 0; padding: 0; }',
      '.exp-switch::after { content: ""; position: absolute; top: 1px; left: 1px; width: 16px; height: 16px; background: var(--paper); border-radius: 50%; transition: all 200ms cubic-bezier(0.22, 1, 0.36, 1); box-shadow: 0 1px 2px rgba(20,18,14,0.18); }',
      '.exp-switch.on { background: var(--ink); border-color: var(--ink); }',
      '.exp-switch.on::after { transform: translateX(16px); }',
      '.exp-switch:focus { outline: 2px solid var(--ink-3); outline-offset: 2px; }',

      /* Settings (Step 3) */
      '.exp-row { display: flex; gap: 12px; margin-bottom: 12px; }',
      '.exp-field { flex: 1; min-width: 0; }',
      '.exp-field-label { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 6px; display: block; }',
      '.exp-seg { display: grid; grid-template-columns: repeat(var(--cols, 2), 1fr); border: 1px solid var(--rule-2); }',
      '.exp-seg button { background: none; border: none; padding: 8px 9px; cursor: pointer; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); border-right: 1px solid var(--rule-2); transition: all 120ms; }',
      '.exp-seg button:last-child { border-right: none; }',
      '.exp-seg button.on { background: var(--ink); color: var(--paper); font-weight: 500; }',
      '.exp-seg button:hover:not(.on) { background: var(--paper-2, #eae5d9); color: var(--ink-2); }',

      /* Summary card */
      '.exp-summary { border: 1px solid var(--rule-2); background: var(--paper-2, #eae5d9); padding: 14px; margin-top: 18px; }',
      '.exp-summary-h { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 8px; }',
      '.exp-summary-row { display: grid; grid-template-columns: 90px 1fr; gap: 10px; padding: 4px 0; border-bottom: 1px solid var(--rule-2); font-size: 12.5px; }',
      '.exp-summary-row:last-child { border-bottom: none; }',
      '.exp-summary-row .k { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); align-self: center; }',
      '.exp-summary-row .v { color: var(--ink); font-weight: 500; word-break: break-word; }',
      '.exp-summary-row .v.mono { font-family: var(--font-mono); font-size: 10.5px; font-weight: 400; }',

      /* Footer step counter */
      '.exp-foot-step { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.08em; color: var(--ink-3); flex: 1; }',
      '.exp-foot-step .cur { color: var(--ink); font-weight: 500; }',

      /* Generating state */
      '.exp-generating { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 80px 32px; }',
      '.exp-spin { width: 42px; height: 42px; border: 1px solid var(--rule-2); border-top-color: var(--ink); border-radius: 50%; animation: exp-spin 800ms linear infinite; margin-bottom: 22px; }',
      '@keyframes exp-spin { to { transform: rotate(360deg); } }',
      '.exp-gen-h { font-family: var(--font-serif); font-size: 22px; font-weight: 500; margin: 0 0 6px; color: var(--ink); }',
      '.exp-gen-d { font-family: var(--font-serif); font-style: italic; font-size: 13.5px; color: var(--ink-3); }',

      /* Drawer footer button styles (echoes index.html .btn, but we use */
      /* PrimaryButton/GhostButton from ui-components.jsx where possible) */
    ].join('\n');
    document.head.appendChild(s);
  }

  // ─── Field-read helper, mirroring CostScheduleV2's `fv` ────────────
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

  function defaultFilename(project) {
    const date = new Date().toISOString().slice(0, 10);
    const parts = [
      slugify(project && project.code),
      slugify(project && project.name) || 'untitled',
      'cost-schedule',
      date,
    ].filter(Boolean);
    return parts.join('_') + '.pdf';
  }

  // Page-count estimate for the summary card. Cheap heuristics — the real
  // count is whatever the browser produces; this is just a hint.
  function estimatePageCount(layout, entries, grouped) {
    const n = entries.length || 0;
    if (layout === 'cards') return Math.max(1, n);
    if (layout === 'table') return Math.max(1, Math.ceil(n / 22));
    /* cover-grouped: 1 cover + 1 page per category (assume ~14 rows/page) */
    const catPages = (grouped || []).reduce((s, g) => s + Math.max(1, Math.ceil((g.entries || []).length / 14)), 0);
    return 1 + catPages;
  }

  // ─── Small Switch ──────────────────────────────────────────────────
  function Switch({ on, onChange, label }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={!!on}
        aria-label={label}
        className={'exp-switch' + (on ? ' on' : '')}
        onClick={() => onChange(!on)}
      />
    );
  }

  // ─── Stepper ────────────────────────────────────────────────────────
  function Stepper({ current, onJump }) {
    const steps = [
      { n: 1, label: 'Layout' },
      { n: 2, label: 'Content' },
      { n: 3, label: 'Settings' },
    ];
    return (
      <div className="exp-stepper">
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <button
              type="button"
              className={'exp-step' + (s.n === current ? ' active' : (s.n < current ? ' done' : ''))}
              onClick={() => onJump(s.n)}
              disabled={s.n > current /* only allow jumping to a step we've reached */}
            >
              <span className="exp-step-num">{s.n}</span>
              <span className="exp-step-label">{s.label}</span>
            </button>
            {i < steps.length - 1 && <span className="exp-step-rule" />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // ─── Step 1 · Layout ────────────────────────────────────────────────
  function LayoutStep({ cfg, setCfg }) {
    function pick(layout) {
      setCfg(prev => {
        const next = { ...prev, layout };
        // Compact-table layout suits A3 landscape; the others A4 portrait.
        // Only auto-flip if the user hasn't manually changed settings.
        if (layout === 'table') {
          next.settings = { ...prev.settings, paper: 'A3', orientation: 'landscape' };
        } else {
          next.settings = { ...prev.settings, paper: 'A4', orientation: 'portrait' };
        }
        return next;
      });
    }
    const Card = ({ id, eyebrow, title, desc, meta, thumb }) => (
      <button
        type="button"
        className={'exp-layout-card' + (cfg.layout === id ? ' selected' : '')}
        onClick={() => pick(id)}
      >
        <div className="exp-thumb">{thumb}</div>
        <div>
          <div className="exp-layout-info-eye">{eyebrow}</div>
          <div className="exp-layout-info-h">{title}</div>
          <div className="exp-layout-info-d">{desc}</div>
          <div className="exp-layout-info-meta">{meta}</div>
        </div>
      </button>
    );
    return (
      <div>
        <div className="exp-section-eye">Step 01 / Choose a layout</div>
        <h3 className="exp-section-h">How should it look on the page?</h3>
        <p className="exp-section-d">Each layout is built from the same data — pick the one that suits your audience.</p>
        <div className="exp-layout-grid">
          <Card
            id="cards"
            eyebrow="A — Recommended"
            title="Schedule cards"
            desc="One material per card, with swatch, codes and pricing. Generous spacing for client review."
            meta="≈ 1 row per page · A4 portrait"
            thumb={<>
              <div className="t-line title" />
              <div className="t-line short" style={{ marginBottom: 4 }} />
              <div className="t-card"><div className="t-swatch" /><div className="t-stack"><div className="t-line" /><div className="t-line short" /></div></div>
              <div className="t-card"><div className="t-swatch" style={{ background: '#8a6a48' }} /><div className="t-stack"><div className="t-line" /><div className="t-line short" /></div></div>
              <div className="t-card"><div className="t-swatch" style={{ background: '#aaa298' }} /><div className="t-stack"><div className="t-line" /><div className="t-line short" /></div></div>
            </>}
          />
          <Card
            id="table"
            eyebrow="B"
            title="Compact table"
            desc="Dense single-row records. Best for builder and quantity surveyor handover."
            meta="≈ 22 rows per page · A3 landscape"
            thumb={<>
              <div className="t-line title" />
              <div className="t-line short" style={{ marginBottom: 4 }} />
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="t-row"><div className="t-line" /><div className="t-line" /><div className="t-line" /></div>
              ))}
            </>}
          />
          <Card
            id="cover-grouped"
            eyebrow="C — Editorial"
            title="Cover & grouped sections"
            desc="Project cover sheet, then materials grouped by trade with running subtotals."
            meta="≈ 8–12 pages · A4 portrait"
            thumb={<>
              <div className="t-cover" />
              <div className="t-line title" />
              <div className="t-line short" style={{ marginBottom: 6 }} />
              <div className="t-group-h">Floors</div>
              <div className="t-row"><div className="t-line" /><div className="t-line short" /></div>
              <div className="t-row"><div className="t-line" /><div className="t-line short" /></div>
              <div className="t-group-h">Walls</div>
              <div className="t-row"><div className="t-line" /><div className="t-line short" /></div>
            </>}
          />
        </div>
      </div>
    );
  }

  // ─── Step 2 · Content ───────────────────────────────────────────────
  function ContentStep({ cfg, setCfg }) {
    const set = (k, v) => setCfg(prev => ({ ...prev, content: { ...prev.content, [k]: v } }));
    const Row = ({ k, name, desc }) => (
      <div className="exp-toggle-row">
        <div className="exp-toggle-text">
          <div className="exp-toggle-name">{name}</div>
          <div className="exp-toggle-desc">{desc}</div>
        </div>
        <Switch on={cfg.content[k]} onChange={v => set(k, v)} label={name} />
      </div>
    );
    return (
      <div>
        <div className="exp-section-eye">Step 02 / Choose what to include</div>
        <h3 className="exp-section-h">Trim or expand the document.</h3>
        <p className="exp-section-d">Toggles only affect this export — your library and schedule are untouched.</p>

        <div className="exp-fgroup">
          <div className="exp-fgroup-h">Content blocks</div>
          <Row k="cover"            name="Cover sheet"           desc="Project name, address, stage and revision date." />
          <Row k="specNotes"        name="Specification notes"   desc="Dimensions, finish and colour against each material." />
          <Row k="imagery"          name="Material imagery"      desc="Swatch tones and product photography where present." />
          <Row k="supplierLeadTime" name="Supplier & lead time"  desc="Brand, supplier reference and weeks-to-deliver." />
        </div>

        <div className="exp-fgroup">
          <div className="exp-fgroup-h">Pricing</div>
          <Row k="pricing"        name="Show pricing"            desc="Rates, quantities and totals on each row." />
          <Row k="tradeSubtotals" name="Trade subtotals"         desc="Running totals between trade groupings." />
          <Row k="grandTotal"     name="Grand total"             desc="Final summary on the back page." />
        </div>
      </div>
    );
  }

  // ─── Step 3 · Settings ──────────────────────────────────────────────
  function SettingsStep({ cfg, setCfg, pageCount }) {
    const setS = (k, v) => setCfg(prev => ({ ...prev, settings: { ...prev.settings, [k]: v } }));
    const Seg = ({ cols, value, options, onChange }) => (
      <div className="exp-seg" style={{ '--cols': cols }}>
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className={value === o.value ? 'on' : ''}
            onClick={() => onChange(o.value)}
          >{o.label}</button>
        ))}
      </div>
    );

    const includesLabel = Object.entries(cfg.content)
      .filter(([_, v]) => v)
      .map(([k]) => CONTENT_LABEL[k] || k)
      .join(', ') || 'Nothing — toggles all off';

    return (
      <div>
        <div className="exp-section-eye">Step 03 / Final touches</div>
        <h3 className="exp-section-h">Paper, file, and you're done.</h3>
        <p className="exp-section-d">Defaults match the chosen layout's recommended setup.</p>

        <div className="exp-fgroup">
          <div className="exp-fgroup-h">Paper</div>
          <div className="exp-row">
            <div className="exp-field">
              <label className="exp-field-label">Size</label>
              <Seg cols={3}
                value={cfg.settings.paper}
                options={[
                  { value: 'A4', label: 'A4' },
                  { value: 'A3', label: 'A3' },
                  { value: 'Letter', label: 'Letter' },
                ]}
                onChange={v => setS('paper', v)} />
            </div>
            <div className="exp-field">
              <label className="exp-field-label">Orientation</label>
              <Seg cols={2}
                value={cfg.settings.orientation}
                options={[
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'landscape', label: 'Landscape' },
                ]}
                onChange={v => setS('orientation', v)} />
            </div>
          </div>
        </div>

        <div className="exp-fgroup">
          <div className="exp-fgroup-h">File</div>
          <div className="exp-field" style={{ marginBottom: 12 }}>
            <label className="exp-field-label">Filename</label>
            {window.Input ? (
              <window.Input
                mono
                value={cfg.settings.filename}
                onChange={e => setS('filename', e.target.value)}
              />
            ) : (
              <input
                value={cfg.settings.filename}
                onChange={e => setS('filename', e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--rule-2)', background: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
            )}
          </div>
          <div className="exp-row">
            <div className="exp-field">
              <label className="exp-field-label">Revision tag</label>
              {window.Input ? (
                <window.Input
                  mono
                  value={cfg.settings.revision}
                  placeholder="e.g. Rev. C — for client"
                  onChange={e => setS('revision', e.target.value)}
                />
              ) : (
                <input
                  value={cfg.settings.revision}
                  onChange={e => setS('revision', e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--rule-2)', background: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                />
              )}
            </div>
            <div className="exp-field">
              <label className="exp-field-label">Watermark</label>
              <Seg cols={3}
                value={cfg.settings.watermark}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'final', label: 'Final' },
                ]}
                onChange={v => setS('watermark', v)} />
            </div>
          </div>
        </div>

        <div className="exp-summary">
          <div className="exp-summary-h">Summary</div>
          <div className="exp-summary-row"><span className="k">Layout</span><span className="v">{LAYOUT_LABEL[cfg.layout]}</span></div>
          <div className="exp-summary-row"><span className="k">Includes</span><span className="v">{includesLabel}</span></div>
          <div className="exp-summary-row"><span className="k">Paper</span><span className="v">{cfg.settings.paper} {cfg.settings.orientation}</span></div>
          <div className="exp-summary-row"><span className="k">Pages</span><span className="v">~ {pageCount}</span></div>
          <div className="exp-summary-row"><span className="k">Filename</span><span className="v mono">{cfg.settings.filename}</span></div>
        </div>
      </div>
    );
  }

  const LAYOUT_LABEL = {
    cards: 'Schedule cards',
    table: 'Compact table',
    'cover-grouped': 'Cover & grouped sections',
  };

  const CONTENT_LABEL = {
    cover: 'cover',
    specNotes: 'notes',
    imagery: 'imagery',
    supplierLeadTime: 'supplier',
    pricing: 'pricing',
    tradeSubtotals: 'subtotals',
    grandTotal: 'grand total',
  };

  // ═══ Print-region renderers ════════════════════════════════════════
  // All three render the same data in different shapes. Class names
  // (.export-*) match the selectors in export-print-styles.jsx — the
  // wizard never needs to touch the stylesheet to add a new layout.

  function buildKVs(material, qty, unitCost, subtotal) {
    const kvs = [];
    const brand = fv(material, 'brand');
    const supplier = fv(material, 'supplier') || (material && material.supplier);
    const dims = fv(material, 'dimensions') || fv(material, 'thickness');
    const finish = fv(material, 'finish') || fv(material, 'sheen_paint');
    const colour = fv(material, 'colour_name') || fv(material, 'colour_code');
    const lead = fv(material, 'lead_time');
    const unit = fv(material, 'unit');
    if (brand) kvs.push({ k: 'Brand', v: brand, group: 'supplier' });
    if (supplier && supplier !== brand) kvs.push({ k: 'Supplier', v: supplier, group: 'supplier' });
    if (dims) kvs.push({ k: 'Dimensions', v: dims, group: 'notes' });
    if (finish) kvs.push({ k: 'Finish', v: finish, group: 'notes' });
    if (colour) kvs.push({ k: 'Colour', v: colour, group: 'notes' });
    if (lead) kvs.push({ k: 'Lead time', v: lead, group: 'supplier' });
    if (qty != null && Number.isFinite(qty)) kvs.push({ k: 'Quantity', v: qty + (unit ? ' ' + unit : ''), group: 'pricing', mono: true });
    if (Number.isFinite(unitCost)) kvs.push({ k: 'Rate', v: fmtCurrency(unitCost) + (unit ? ' / ' + unit : ''), group: 'pricing', mono: true });
    if (Number.isFinite(subtotal)) kvs.push({ k: 'Total', v: fmtCurrency(subtotal), group: 'pricing', mono: true });
    return kvs;
  }

  function DocHead({ project, revision }) {
    return (
      <div className="export-doc-head">
        <div className="export-doc-eyebrow">Cost Schedule</div>
        <h1 className="export-doc-title">
          {project.name || 'Untitled project'}
          {revision && <span className="export-rev">{revision}</span>}
        </h1>
        <div className="export-doc-meta">
          {project.code && <span>{project.code}</span>}
          {project.code && project.client && <span> · </span>}
          {project.client && <span>for {project.client}</span>}
        </div>
      </div>
    );
  }

  function Cover({ project, grandTotal, revision }) {
    const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    return (
      <div className="export-cover">
        <div>
          <div className="export-cover-eyebrow">Cost Schedule</div>
          <h1 className="export-cover-title">{project.name || 'Untitled project'}</h1>
          <div className="export-cover-meta">
            {project.code && <span>{project.code}</span>}
            {project.client && <span>For {project.client}</span>}
            <span>{today}</span>
            {revision && <span>{revision}</span>}
          </div>
        </div>
        <div className="export-cover-rule" />
        <div className="export-cover-grand export-grand">
          <span className="lbl">Grand total</span>
          <span className="val">{fmtCurrency(grandTotal)}</span>
        </div>
      </div>
    );
  }

  function PrintCards({ project, grouped, revision }) {
    const entries = [].concat(...grouped.map(g => g.entries.map(e => ({ ...e, category: g.category }))));
    return (
      <>
        {entries.map(({ row, material, qty, unitCost, subtotal, category }, i) => {
          const swatchTone = material ? ((material.swatch && material.swatch.tone) || material.color || '#a08660') : '#e1dccd';
          const kvs = buildKVs(material, qty, unitCost, subtotal);
          return (
            <div className="export-card" key={row.id || i}>
              <div className="export-card-swatch export-swatch export-image" style={{ background: swatchTone }} />
              <div>
                <div className="export-card-code">{row.code || '—'}</div>
                <h2 className="export-card-name">{material ? (material.name || 'Unnamed') : 'Unspecified'}</h2>
                <div className="export-card-cat">{category}</div>
                <div className="export-card-grid">
                  {kvs.map((kv, j) => (
                    <div
                      key={j}
                      className={
                        'export-kv'
                        + (kv.group === 'supplier' ? ' export-supplier' : '')
                        + (kv.group === 'notes' ? ' export-notes' : '')
                        + (kv.group === 'pricing' ? ' export-price' : '')
                      }
                    >
                      <span className="k">{kv.k}</span>
                      <span className={'v' + (kv.mono ? ' mono' : '')}>{kv.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  function PrintTable({ project, grouped, grandTotal, revision }) {
    return (
      <>
        <DocHead project={project} revision={revision} />
        <table className="export-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Material</th>
              <th>Type</th>
              <th className="export-supplier">Supplier</th>
              <th className="right">Qty</th>
              <th className="right export-price-col">Rate</th>
              <th className="right export-price-col">Total</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(g => (
              <React.Fragment key={g.category}>
                <tr className="export-cat-head"><td colSpan={7}>{g.category} <span style={{ float: 'right', opacity: 0.6 }}>{g.entries.length} item{g.entries.length === 1 ? '' : 's'}</span></td></tr>
                {g.entries.map(({ row, material, qty, unitCost, subtotal }) => {
                  const swatchTone = material ? ((material.swatch && material.swatch.tone) || material.color || '#a08660') : '#e1dccd';
                  const brand = material && (fv(material, 'brand') || fv(material, 'supplier'));
                  const catDef = material && window.categoryDef && window.categoryDef(material.category);
                  const ptype = catDef ? catDef.label : (material && material.category ? String(material.category).replace(/_/g, ' ') : '—');
                  const supplier = material && (fv(material, 'supplier') || material.supplier || brand);
                  const lead = material && fv(material, 'lead_time');
                  return (
                    <tr key={row.id} className="export-row">
                      <td className="code">{row.code || '—'}</td>
                      <td className="name">
                        <span className="swatch export-swatch" style={{ background: swatchTone }} />
                        {material ? (material.name || 'Unnamed') : 'Unspecified'}
                        {brand && <span className="sub">{brand}</span>}
                      </td>
                      <td>{ptype}</td>
                      <td className="export-supplier">{supplier || '—'}{lead && <span style={{ display: 'block', fontSize: '8pt', color: 'var(--ink-3, #6a665d)' }}>{lead}</span>}</td>
                      <td className="num">{qty == null ? '—' : qty}</td>
                      <td className="num export-rate">{Number.isFinite(unitCost) ? fmtCurrency(unitCost) : '—'}</td>
                      <td className="num export-total">{Number.isFinite(subtotal) ? fmtCurrency(subtotal) : '—'}</td>
                    </tr>
                  );
                })}
                <tr className="export-subtotal-row">
                  <td colSpan={6} className="num" style={{ textAlign: 'right' }}>{g.category} subtotal</td>
                  <td className="num">{fmtCurrency(g.subtotal)}</td>
                </tr>
              </React.Fragment>
            ))}
            <tr className="export-grand-row export-grand">
              <td colSpan={6} className="num" style={{ textAlign: 'right' }}>Grand total</td>
              <td className="num">{fmtCurrency(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </>
    );
  }

  function PrintCoverGrouped({ project, grouped, grandTotal, revision }) {
    return (
      <>
        <Cover project={project} grandTotal={grandTotal} revision={revision} />
        {grouped.map(g => (
          <section className="export-section" key={g.category}>
            <div className="export-cat-head export-cat-head-block">
              <h2 className="cat-name">{g.category}</h2>
              <span className="cat-meta">{g.entries.length} item{g.entries.length === 1 ? '' : 's'}</span>
            </div>
            <table className="export-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Material</th>
                  <th className="export-supplier">Supplier</th>
                  <th className="right">Qty</th>
                  <th className="right export-price-col">Rate</th>
                  <th className="right export-price-col">Total</th>
                </tr>
              </thead>
              <tbody>
                {g.entries.map(({ row, material, qty, unitCost, subtotal }) => {
                  const swatchTone = material ? ((material.swatch && material.swatch.tone) || material.color || '#a08660') : '#e1dccd';
                  const brand = material && (fv(material, 'brand') || fv(material, 'supplier'));
                  const supplier = material && (fv(material, 'supplier') || material.supplier || brand);
                  const dims = material && (fv(material, 'dimensions') || fv(material, 'finish') || fv(material, 'colour_name'));
                  return (
                    <tr key={row.id} className="export-row">
                      <td className="code">{row.code || '—'}</td>
                      <td className="name">
                        <span className="swatch export-swatch" style={{ background: swatchTone }} />
                        {material ? (material.name || 'Unnamed') : 'Unspecified'}
                        {dims && <span className="sub export-notes">{dims}</span>}
                      </td>
                      <td className="export-supplier">{supplier || '—'}</td>
                      <td className="num">{qty == null ? '—' : qty}</td>
                      <td className="num export-rate">{Number.isFinite(unitCost) ? fmtCurrency(unitCost) : '—'}</td>
                      <td className="num export-total">{Number.isFinite(subtotal) ? fmtCurrency(subtotal) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="export-section-subtotal export-subtotal">
              <span>{g.category} subtotal</span>
              <span className="val">{fmtCurrency(g.subtotal)}</span>
            </div>
          </section>
        ))}
        <div className="export-grand">
          <span className="lbl">Grand total</span>
          <span className="val">{fmtCurrency(grandTotal)}</span>
        </div>
      </>
    );
  }

  // ═══ Drawer ════════════════════════════════════════════════════════
  function ExportWizardDrawer({ open, onClose, project, grouped, rows }) {
    // cfg is the single source of truth for the wizard. Initialised on
    // first open and reset whenever the drawer opens with a different
    // project (filename derives from project metadata).
    const initial = useCallback(() => ({
      step: 1,
      layout: 'cards',
      content: {
        cover: true, specNotes: true, imagery: true, supplierLeadTime: true,
        pricing: true, tradeSubtotals: true, grandTotal: true,
      },
      settings: {
        paper: 'A4', orientation: 'portrait',
        filename: defaultFilename(project),
        revision: '',
        watermark: 'none',
      },
    }), [project && project.id]);

    const [cfg, setCfg] = useState(initial);
    const savedTitle = useRef(null);

    // Reset when (re)opening — fresh defaults, filename re-derived.
    useEffect(() => {
      if (open) setCfg(initial());
    }, [open, initial]);

    // Escape closes (when not in generating step — print dialog owns the kbd then).
    useEffect(() => {
      if (!open) return;
      function onKey(e) {
        if (e.key === 'Escape' && cfg.step !== 'generating') onClose && onClose();
      }
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose, cfg.step]);

    // Generate → kick off print after one paint, then clean up on afterprint.
    useEffect(() => {
      if (cfg.step !== 'generating') return;
      if (!window.applyExportPrintConfig) {
        // Stylesheet bridge missing — bail gracefully.
        console.warn('[ExportWizard] applyExportPrintConfig not loaded; aborting print.');
        setCfg(prev => ({ ...prev, step: 3 }));
        return;
      }
      // Pre-flight: configure data-export-* attrs + @page rule.
      window.applyExportPrintConfig(cfg);
      // Document title becomes the print-dialog default save name.
      savedTitle.current = document.title;
      document.title = cfg.settings.filename.replace(/\.pdf$/i, '');

      function cleanup() {
        if (savedTitle.current != null) document.title = savedTitle.current;
        savedTitle.current = null;
        if (window.clearExportPrintConfig) window.clearExportPrintConfig();
        setCfg(prev => ({ ...prev, step: 1 }));
        onClose && onClose();
      }
      function onAfterPrint() {
        window.removeEventListener('afterprint', onAfterPrint);
        cleanup();
      }
      window.addEventListener('afterprint', onAfterPrint);

      // Give React one frame to mount the print-region with the new cfg,
      // then trigger the browser print dialog.
      const t = setTimeout(() => {
        try { window.print(); }
        catch (err) {
          console.error('[ExportWizard] print failed:', err);
          window.removeEventListener('afterprint', onAfterPrint);
          cleanup();
        }
      }, 180);

      return () => {
        clearTimeout(t);
        window.removeEventListener('afterprint', onAfterPrint);
      };
    }, [cfg.step]); // eslint-disable-line react-hooks/exhaustive-deps

    const grandTotal = useMemo(
      () => (grouped || []).reduce((s, g) => s + (g.subtotal || 0), 0),
      [grouped]
    );
    const allEntries = useMemo(
      () => [].concat(...(grouped || []).map(g => g.entries || [])),
      [grouped]
    );
    const pageCount = useMemo(
      () => estimatePageCount(cfg.layout, allEntries, grouped),
      [cfg.layout, allEntries, grouped]
    );

    // ─── Render ────────────────────────────────────────────────────
    // Print region is always mounted while open (even on Step 1) — but
    // CSS keeps it hidden on screen, so it's "free" until print fires.
    // This avoids a mount-then-print race.
    const printRegion = open ? (
      <div id="export-print-region">
        {cfg.layout === 'cards' && (
          <PrintCards project={project} grouped={grouped || []} revision={cfg.settings.revision} />
        )}
        {cfg.layout === 'table' && (
          <PrintTable project={project} grouped={grouped || []} grandTotal={grandTotal} revision={cfg.settings.revision} />
        )}
        {cfg.layout === 'cover-grouped' && (
          <PrintCoverGrouped project={project} grouped={grouped || []} grandTotal={grandTotal} revision={cfg.settings.revision} />
        )}
      </div>
    ) : null;

    if (!open) return null;

    const totalSteps = 3;
    const goNext = () => {
      if (cfg.step === totalSteps) setCfg(prev => ({ ...prev, step: 'generating' }));
      else setCfg(prev => ({ ...prev, step: prev.step + 1 }));
    };
    const goBack = () => {
      if (typeof cfg.step === 'number' && cfg.step > 1) setCfg(prev => ({ ...prev, step: prev.step - 1 }));
    };

    const itemCount = (rows && rows.length) || allEntries.length;
    const subtitle = (
      <>A printable record of <strong style={{ fontStyle: 'normal' }}>{project.name || 'Untitled project'}</strong> — {itemCount} row{itemCount === 1 ? '' : 's'}, {fmtCurrency(grandTotal)} grand total.</>
    );

    return (
      <>
        {/* Drawer chrome — reuses index.html .drw-* classes for visual */}
        {/* consistency with PickerDrawer / MaterialEditor. */}
        <div className="drw-bg" onClick={onClose} />
        <div className="drw-panel" role="dialog" aria-modal="true" aria-label="Export to PDF">
          <div className="drw-head" style={{ paddingBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
                  III · Cost Schedule / Export
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.01em', margin: '4px 0 0' }}>
                  Export to PDF
                </h2>
                <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', marginTop: 6 }}>
                  {subtitle}
                </div>
              </div>
              <button
                type="button"
                className="drw-close"
                onClick={onClose}
                aria-label="Close"
                style={{ flex: '0 0 auto' }}
              >×</button>
            </div>
            {cfg.step !== 'generating' && (
              <Stepper
                current={typeof cfg.step === 'number' ? cfg.step : 3}
                onJump={n => setCfg(prev => ({ ...prev, step: n }))}
              />
            )}
          </div>

          <div className="drw-body" style={{ padding: '22px' }}>
            {cfg.step === 1 && <LayoutStep cfg={cfg} setCfg={setCfg} />}
            {cfg.step === 2 && <ContentStep cfg={cfg} setCfg={setCfg} />}
            {cfg.step === 3 && <SettingsStep cfg={cfg} setCfg={setCfg} pageCount={pageCount} />}
            {cfg.step === 'generating' && (
              <div className="exp-generating">
                <div className="exp-spin" />
                <div className="exp-gen-h">Composing your document</div>
                <div className="exp-gen-d">Typesetting {itemCount} record{itemCount === 1 ? '' : 's'} into ~{pageCount} page{pageCount === 1 ? '' : 's'}…</div>
              </div>
            )}
          </div>

          <div className="drw-foot">
            <div className="exp-foot-step">
              <span className="cur">{typeof cfg.step === 'number' ? cfg.step : totalSteps}</span> / {totalSteps}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {window.GhostButton ? (
                <window.GhostButton
                  onClick={goBack}
                  disabled={cfg.step === 1 || cfg.step === 'generating'}
                  style={{ padding: '8px 14px', fontSize: 11 }}
                >Back</window.GhostButton>
              ) : (
                <button onClick={goBack} disabled={cfg.step === 1 || cfg.step === 'generating'}>Back</button>
              )}
              {window.PrimaryButton ? (
                <window.PrimaryButton
                  onClick={goNext}
                  disabled={cfg.step === 'generating'}
                  style={{ padding: '8px 18px' }}
                >
                  {cfg.step === totalSteps ? 'Generate PDF →' : 'Next →'}
                </window.PrimaryButton>
              ) : (
                <button onClick={goNext} disabled={cfg.step === 'generating'}>
                  {cfg.step === totalSteps ? 'Generate PDF →' : 'Next →'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Print region — invisible on screen (CSS), shown only in print. */}
        {printRegion}
      </>
    );
  }

  window.ExportWizardDrawer = ExportWizardDrawer;
})();
