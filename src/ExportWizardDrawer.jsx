// ExportWizardDrawer — page-agnostic 3-step right-side drawer for
// exporting any of the app's grid-like views as a real vector PDF.
//
// The drawer owns the *wizard* (stepper, layout pick, content toggles,
// settings step, generate flow) — everything that should look and
// behave the same on every page that exports a PDF.
//
// Page-specific concerns (which content toggles exist, what each card
// or table row looks like, what the cover-page right-side block shows)
// live in a `profile` object passed in. See:
//
//   • src/export-profile-cost.jsx     (Cost Schedule)
//   • src/export-profile-schedule.jsx (Project Schedule)
//
// Add a new page that exports? Write a new profile file, wire one
// toolbar button, and you're done. Change how PDF export FEELS for
// every page at once? Edit this file (or src/export-pdf-builder.jsx).
//
// Pipeline: wizard collects { layout, content toggles, settings } into
// a `cfg` object → on "Generate PDF" we call
// profile.builders[layout]({ project, data, content, revision }) which
// returns a pdfmake docDef fragment → the wizard wraps it with page
// size / orientation / margins / watermark / info → pdfMake.createPdf()
// .download(filename) triggers a one-click download. No browser print
// dialog, no URL/date headers — a clean professional document.

(function () {
  if (typeof window === 'undefined') return;
  const { useState, useMemo, useEffect, useRef, useCallback } = React;

  // ─── One-time interior styles (drawer chrome reuses index.html ──
  // .drw-* classes; these are only for the wizard's own internals).
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

      /* Layout cards */
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

      /* Field groups + toggles */
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

      /* Settings */
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
    ].join('\n');
    document.head.appendChild(s);
  }

  // ─── Default per-layout paper hint (profiles can override) ────────
  const DEFAULT_LAYOUT_PAPER_HINT = {
    cards:           { paper: 'A4', orientation: 'portrait' },
    table:           { paper: 'A3', orientation: 'landscape' },
    'cover-grouped': { paper: 'A4', orientation: 'portrait' },
  };

  // ─── Library of layout-card thumbnails (one per layout id) ────────
  // Profiles don't override these — visual identity is the wizard's.
  function LayoutThumb({ layout }) {
    if (layout === 'cards') {
      return (
        <>
          <div className="t-line title" />
          <div className="t-line short" style={{ marginBottom: 4 }} />
          <div className="t-card"><div className="t-swatch" /><div className="t-stack"><div className="t-line" /><div className="t-line short" /></div></div>
          <div className="t-card"><div className="t-swatch" style={{ background: '#8a6a48' }} /><div className="t-stack"><div className="t-line" /><div className="t-line short" /></div></div>
          <div className="t-card"><div className="t-swatch" style={{ background: '#aaa298' }} /><div className="t-stack"><div className="t-line" /><div className="t-line short" /></div></div>
        </>
      );
    }
    if (layout === 'table') {
      return (
        <>
          <div className="t-line title" />
          <div className="t-line short" style={{ marginBottom: 4 }} />
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="t-row"><div className="t-line" /><div className="t-line" /><div className="t-line" /></div>
          ))}
        </>
      );
    }
    // cover-grouped
    return (
      <>
        <div className="t-cover" />
        <div className="t-line title" />
        <div className="t-line short" style={{ marginBottom: 6 }} />
        <div className="t-group-h">Floors</div>
        <div className="t-row"><div className="t-line" /><div className="t-line short" /></div>
        <div className="t-row"><div className="t-line" /><div className="t-line short" /></div>
        <div className="t-group-h">Walls</div>
        <div className="t-row"><div className="t-line" /><div className="t-line short" /></div>
      </>
    );
  }

  // ─── Small reusable Switch ─────────────────────────────────────────
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

  // ─── Wizard step list — derived from profile ────────────────────────
  // Layout → [Theme?] → Content → Settings. Theme step only appears
  // if the profile opts in (profile.themes.enabled).
  function wizardSteps(profile) {
    const out = [{ id: 'layout', label: 'Layout' }];
    if (profile && profile.themes && profile.themes.enabled) {
      out.push({ id: 'theme', label: 'Theme' });
    }
    out.push({ id: 'content', label: 'Content' });
    out.push({ id: 'settings', label: 'Settings' });
    return out.map((s, i) => ({ ...s, n: i + 1 }));
  }
  function stepIndex(steps, id) {
    return Math.max(0, steps.findIndex(s => s.id === id));
  }

  // ─── Stepper ────────────────────────────────────────────────────────
  function Stepper({ current, onJump, steps }) {
    return (
      <div className="exp-stepper">
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <button
              type="button"
              className={'exp-step' + (s.n === current ? ' active' : (s.n < current ? ' done' : ''))}
              onClick={() => onJump(s.n)}
              disabled={s.n > current}
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
  function LayoutStep({ cfg, setCfg, profile }) {
    const layoutPaperHint = profile.layoutPaperHint || DEFAULT_LAYOUT_PAPER_HINT;
    function pick(layout) {
      setCfg(prev => {
        const next = { ...prev, layout };
        const hint = layoutPaperHint[layout];
        if (hint) {
          next.settings = { ...prev.settings, paper: hint.paper, orientation: hint.orientation };
        }
        return next;
      });
    }
    const cards = profile.layouts || DEFAULT_LAYOUTS;
    return (
      <div>
        <div className="exp-section-eye">Step / Choose a layout</div>
        <h3 className="exp-section-h">How should it look on the page?</h3>
        <p className="exp-section-d">Each layout is built from the same data — pick the one that suits your audience.</p>
        <div className="exp-layout-grid">
          {cards.map(card => (
            <button
              key={card.id}
              type="button"
              className={'exp-layout-card' + (cfg.layout === card.id ? ' selected' : '')}
              onClick={() => pick(card.id)}
            >
              <div className="exp-thumb"><LayoutThumb layout={card.id} /></div>
              <div>
                <div className="exp-layout-info-eye">{card.eyebrow}</div>
                <div className="exp-layout-info-h">{card.title}</div>
                <div className="exp-layout-info-d">{card.desc}</div>
                <div className="exp-layout-info-meta">{card.meta}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Profile-overridable layout descriptions. Most profiles use these
  // defaults; only override if the layout means something materially
  // different on a specific page.
  const DEFAULT_LAYOUTS = [
    { id: 'cards',           eyebrow: 'A — Recommended', title: 'Schedule cards',           desc: 'One item per card with full detail. Generous spacing for client review.',                 meta: '≈ 1 row per page · A4 portrait' },
    { id: 'table',           eyebrow: 'B',               title: 'Compact table',            desc: 'Dense single-row records. Best for builder and consultant handover.',                       meta: '≈ 22 rows per page · A3 landscape' },
    { id: 'cover-grouped',   eyebrow: 'C — Editorial',   title: 'Cover & grouped sections', desc: 'Project cover sheet, then items grouped by section with running totals where relevant.',  meta: '≈ 8–12 pages · A4 portrait' },
  ];

  // ─── Step · Theme (profile.themes.enabled gates this) ──────────────
  // Picker over window.expThemes (loaded from src/export-themes.jsx).
  // Each card shows a small visual thumbnail (from
  // src/export-theme-thumbs.jsx) and the direction's name + description.
  function ThemeStep({ cfg, setCfg, profile }) {
    const themes = window.expThemes ? window.expThemes.list() : [];
    const Thumb = window.ExportThemeThumb;

    function pick(id) {
      setCfg(prev => ({ ...prev, theme: id }));
    }

    return (
      <div>
        <div className="exp-section-eye">Step / Pick a visual direction</div>
        <h3 className="exp-section-h">Which look should the PDF take?</h3>
        <p className="exp-section-d">Themes change the visual identity — typography, palette, page chrome — without affecting the data inside.</p>
        <div className="exp-layout-grid">
          {themes.map(t => (
            <button
              key={t.id}
              type="button"
              className={'exp-layout-card' + (cfg.theme === t.id ? ' selected' : '')}
              onClick={() => pick(t.id)}
            >
              <div className="exp-thumb" style={{ padding: 0, background: 'transparent', border: 'none' }}>
                {Thumb ? <Thumb id={t.id} provisional={!!t.provisional} /> : null}
              </div>
              <div>
                <div className="exp-layout-info-eye">{t.eyebrow}</div>
                <div className="exp-layout-info-h">{t.name}</div>
                <div className="exp-layout-info-d">{t.description}</div>
                <div className="exp-layout-info-meta">{t.meta}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Step · Content (profile-driven toggle list) ───────────────────
  function ContentStep({ cfg, setCfg, profile }) {
    const set = (k, v) => setCfg(prev => ({ ...prev, content: { ...prev.content, [k]: v } }));
    const grouped = useMemo(() => {
      const map = new Map();
      for (const t of profile.toggles) {
        const g = t.group || 'Content';
        if (!map.has(g)) map.set(g, []);
        map.get(g).push(t);
      }
      return Array.from(map.entries());
    }, [profile]);

    return (
      <div>
        <div className="exp-section-eye">Step / Choose what to include</div>
        <h3 className="exp-section-h">Trim or expand the document.</h3>
        <p className="exp-section-d">Toggles only affect this export — your library and schedule are untouched.</p>

        {grouped.map(([groupName, toggles]) => (
          <div key={groupName} className="exp-fgroup">
            <div className="exp-fgroup-h">{groupName}</div>
            {toggles.map(t => (
              <div key={t.key} className="exp-toggle-row">
                <div className="exp-toggle-text">
                  <div className="exp-toggle-name">{t.label}</div>
                  <div className="exp-toggle-desc">{t.desc}</div>
                </div>
                <Switch
                  on={!!cfg.content[t.key]}
                  onChange={v => set(t.key, v)}
                  label={t.label}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // ─── Step 3 · Settings ──────────────────────────────────────────────
  function SettingsStep({ cfg, setCfg, profile, pageCount }) {
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

    // Build the human-readable "Includes" list from the active profile.
    const includesLabel = useMemo(() => {
      const on = profile.toggles.filter(t => cfg.content[t.key]);
      if (on.length === 0) return 'Nothing — toggles all off';
      return on.map(t => t.label.toLowerCase()).join(', ');
    }, [cfg.content, profile]);

    const layoutLabel = (profile.layouts || DEFAULT_LAYOUTS).find(l => l.id === cfg.layout);
    const themeLabel = (() => {
      if (!profile.themes || !profile.themes.enabled || !window.expThemes) return null;
      const t = window.expThemes.get(cfg.theme);
      return t ? (t.name + (t.provisional ? ' · provisional render' : '')) : cfg.theme;
    })();
    return (
      <div>
        <div className="exp-section-eye">Step / Final touches</div>
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
          <div className="exp-summary-row"><span className="k">Layout</span><span className="v">{layoutLabel ? layoutLabel.title : cfg.layout}</span></div>
          {themeLabel && <div className="exp-summary-row"><span className="k">Theme</span><span className="v">{themeLabel}</span></div>}
          <div className="exp-summary-row"><span className="k">Includes</span><span className="v">{includesLabel}</span></div>
          <div className="exp-summary-row"><span className="k">Paper</span><span className="v">{cfg.settings.paper} {cfg.settings.orientation}</span></div>
          <div className="exp-summary-row"><span className="k">Pages</span><span className="v">~ {pageCount}</span></div>
          <div className="exp-summary-row"><span className="k">Filename</span><span className="v mono">{cfg.settings.filename}</span></div>
        </div>
      </div>
    );
  }

  // ═══ Drawer ════════════════════════════════════════════════════════
  function ExportWizardDrawer({ open, onClose, project, data, profile }) {
    // Profile is required. Render nothing if it (or its required parts)
    // is missing — better than crashing.
    if (!profile || !profile.toggles || !profile.builders) {
      if (open) console.error('[ExportWizardDrawer] missing profile or profile.toggles/builders');
      return null;
    }
    const builder = window.expPdf || {};

    // Kick off pdfmake CDN load as soon as the wizard opens, so the
    // ~1.3MB script is hopefully ready by the time the user clicks
    // "Generate PDF".
    useEffect(() => {
      if (!open || !builder.ensurePdfMake) return;
      builder.ensurePdfMake().catch(err => console.warn('[ExportWizard] preload failed:', err));
    }, [open]);

    // Steps depend on whether the profile opts into themes.
    const steps = useMemo(() => wizardSteps(profile), [profile]);
    const totalSteps = steps.length;
    const firstStepId = steps[0].id;
    const lastStepId  = steps[steps.length - 1].id;
    const themesEnabled = !!(profile.themes && profile.themes.enabled);

    // cfg is the single source of truth for the wizard. Initialised on
    // first open and re-derived when (open || profile || project.id) changes.
    // cfg.step is a string id ('layout' | 'theme' | 'content' | 'settings'
    // | 'generating'). Number coercion is centralised in cfgStepIndex.
    const initial = useCallback(() => ({
      step: firstStepId,
      layout: profile.defaultLayout || 'cards',
      theme: (profile.themes && profile.themes.defaultId) || 'D1',
      content: Object.fromEntries(profile.toggles.map(t => [t.key, !!t.defaultOn])),
      settings: {
        paper: 'A4', orientation: 'portrait',
        filename: builder.defaultFilename
          ? builder.defaultFilename(project, profile.filenameStem || 'export')
          : ((profile.filenameStem || 'export') + '.pdf'),
        revision: '',
        watermark: 'none',
      },
      error: null,
    }), [profile, project && project.id, firstStepId]);

    const [cfg, setCfg] = useState(initial);

    // Reset when opening or when profile / project changes.
    useEffect(() => {
      if (open) setCfg(initial());
    }, [open, initial]);

    // Escape closes (unless we're mid-generate).
    useEffect(() => {
      if (!open) return;
      function onKey(e) {
        if (e.key === 'Escape' && cfg.step !== 'generating') onClose && onClose();
      }
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose, cfg.step]);

    // When the user reaches Settings, kick off the theme's custom-font
    // load in parallel with the (already-warming) pdfmake load — by
    // the time they click Generate, both should be ready.
    useEffect(() => {
      if (!themesEnabled) return;
      if (cfg.step !== 'settings') return;
      const themeReg = window.expThemes;
      if (!themeReg) return;
      const theme = themeReg.get(cfg.theme);
      if (!theme || !theme.fonts || !theme.fonts.length) return;
      if (!builder.ensurePdfMake || !window.expFonts) return;
      builder.ensurePdfMake()
        .then(() => window.expFonts.ensureFonts(theme.fonts))
        .catch(err => console.warn('[ExportWizard] theme font preload failed:', err));
    }, [cfg.step, cfg.theme, themesEnabled]);

    // Generate → build pdfmake docDef + trigger download.
    useEffect(() => {
      if (cfg.step !== 'generating') return;
      if (!builder.ensurePdfMake) {
        console.error('[ExportWizard] export-pdf-builder.jsx not loaded');
        setCfg(prev => ({ ...prev, step: lastStepId, error: 'Export helper failed to load.' }));
        return;
      }
      let cancelled = false;
      // Hard timeout: if pdfmake hangs for any reason, surface an
      // error rather than leaving the user staring at a spinner.
      const watchdog = setTimeout(() => {
        if (cancelled) return;
        console.error('[ExportWizard] generate timed out after 15s');
        setCfg(prev => prev.step === 'generating'
          ? { ...prev, step: lastStepId, error: 'Generation timed out. Check the browser console for details.' }
          : prev);
      }, 15000);

      builder.ensurePdfMake()
        .then(pdfMake => {
          if (cancelled) return;
          // Load theme's custom fonts before composing the docDef so
          // the family names referenced in styles resolve at render.
          if (themesEnabled && window.expThemes && window.expFonts) {
            const theme = window.expThemes.get(cfg.theme);
            if (theme && theme.fonts && theme.fonts.length) {
              return window.expFonts.ensureFonts(theme.fonts).then(() => pdfMake);
            }
          }
          return pdfMake;
        })
        .then(pdfMake => {
          if (cancelled) return;
          // Ask the profile to assemble the layout-specific content.
          const build = profile.builders[
            cfg.layout === 'cover-grouped' ? 'coverGrouped' : cfg.layout
          ];
          if (!build) throw new Error('Layout "' + cfg.layout + '" not supported by this profile.');
          const docFragment = build({
            project,
            data,
            content: cfg.content,
            revision: cfg.settings.revision,
            builder,
            themeId: cfg.theme,
          });
          // Wrap the profile's fragment with the wizard-owned page
          // settings, watermark, info metadata and merged style map.
          // A theme can override pageMargins (via fragment.pageMargins)
          // — bigger margins for airy directions, tighter for dense.
          const docDef = {
            pageSize:        builder.PAPER_KEY[cfg.settings.paper] || 'A4',
            pageOrientation: cfg.settings.orientation,
            pageMargins:     docFragment.pageMargins || builder.pageMargins(cfg.settings.paper, cfg.settings.orientation),
            info:            builder.makeInfo({ project, profile }),
            defaultStyle:    docFragment.defaultStyle || { fontSize: 10, color: builder.COLOR.ink, lineHeight: 1.3 },
            styles:          Object.assign({}, builder.STYLES, docFragment.styles || {}),
            content:         docFragment.content || [],
            footer:          docFragment.footer || null,
            header:          docFragment.header || null,
            background:      docFragment.background || null,
          };
          const watermark = builder.makeWatermark(cfg.settings.watermark);
          if (watermark) docDef.watermark = watermark;

          const filename = builder.safeFilename(cfg.settings.filename || 'export.pdf');
          pdfMake.createPdf(docDef).download(filename, () => {
            if (cancelled) return;
            clearTimeout(watchdog);
            setCfg(prev => ({ ...prev, step: firstStepId, error: null }));
            onClose && onClose();
          });
        })
        .catch(err => {
          if (cancelled) return;
          clearTimeout(watchdog);
          console.error('[ExportWizard] generate failed:', err);
          setCfg(prev => ({ ...prev, step: lastStepId, error: (err && err.message) || String(err) }));
        });
      return () => { cancelled = true; clearTimeout(watchdog); };
    }, [cfg.step]); // eslint-disable-line react-hooks/exhaustive-deps

    const pageCount = useMemo(() => {
      if (typeof profile.estimatePages === 'function') {
        try { return profile.estimatePages(cfg.layout, data); }
        catch { /* fall through */ }
      }
      return 1;
    }, [cfg.layout, data, profile]);

    if (!open) return null;

    const curStepNum = cfg.step === 'generating' ? totalSteps : (stepIndex(steps, cfg.step) + 1);
    const goNext = () => {
      if (cfg.step === lastStepId) {
        setCfg(prev => ({ ...prev, step: 'generating' }));
      } else {
        const idx = stepIndex(steps, cfg.step);
        const next = steps[Math.min(idx + 1, steps.length - 1)];
        setCfg(prev => ({ ...prev, step: next.id }));
      }
    };
    const goBack = () => {
      if (cfg.step === 'generating') return;
      const idx = stepIndex(steps, cfg.step);
      if (idx > 0) setCfg(prev => ({ ...prev, step: steps[idx - 1].id }));
    };

    const subtitle = profile.subtitle
      ? profile.subtitle({ project, data })
      : null;

    const itemCount = (data && (data.itemCount != null ? data.itemCount : (data.rows && data.rows.length))) || 0;

    return (
      <>
        {/* Drawer chrome — reuses index.html .drw-* classes. */}
        <div className="drw-bg" onClick={onClose} />
        <div className="drw-panel" role="dialog" aria-modal="true" aria-label={profile.drawerTitle || 'Export to PDF'}>
          <div className="drw-head" style={{ paddingBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                {profile.eyebrow && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
                    {profile.eyebrow}
                  </div>
                )}
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.01em', margin: '4px 0 0' }}>
                  {profile.drawerTitle || 'Export to PDF'}
                </h2>
                {subtitle && (
                  <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', marginTop: 6 }}>
                    {subtitle}
                  </div>
                )}
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
                current={curStepNum}
                steps={steps}
                onJump={n => setCfg(prev => ({ ...prev, step: steps[n - 1].id }))}
              />
            )}
          </div>

          <div className="drw-body" style={{ padding: '22px' }}>
            {cfg.error && cfg.step !== 'generating' && (
              <div style={{ marginBottom: 18, padding: '12px 16px', background: 'rgba(138, 48, 32, 0.08)', borderLeft: '2px solid var(--accent, #8a3020)', fontFamily: 'var(--font-sans)', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                <strong style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent, #8a3020)', marginBottom: 4 }}>Last export failed</strong>
                {cfg.error}
              </div>
            )}
            {cfg.step === 'layout'   && <LayoutStep   cfg={cfg} setCfg={setCfg} profile={profile} />}
            {cfg.step === 'theme'    && <ThemeStep    cfg={cfg} setCfg={setCfg} profile={profile} />}
            {cfg.step === 'content'  && <ContentStep  cfg={cfg} setCfg={setCfg} profile={profile} />}
            {cfg.step === 'settings' && <SettingsStep cfg={cfg} setCfg={setCfg} profile={profile} pageCount={pageCount} />}
            {cfg.step === 'generating' && (
              <div className="exp-generating">
                <div className="exp-spin" />
                <div className="exp-gen-h">Composing your document</div>
                <div className="exp-gen-d">
                  Typesetting {itemCount || '…'} record{itemCount === 1 ? '' : 's'} into ~{pageCount} page{pageCount === 1 ? '' : 's'}…
                </div>
              </div>
            )}
          </div>

          <div className="drw-foot">
            <div className="exp-foot-step">
              <span className="cur">{curStepNum}</span> / {totalSteps}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {window.GhostButton ? (
                <window.GhostButton
                  onClick={goBack}
                  disabled={cfg.step === firstStepId || cfg.step === 'generating'}
                  style={{ padding: '8px 14px', fontSize: 11 }}
                >Back</window.GhostButton>
              ) : (
                <button onClick={goBack} disabled={cfg.step === firstStepId || cfg.step === 'generating'}>Back</button>
              )}
              {window.PrimaryButton ? (
                <window.PrimaryButton
                  onClick={goNext}
                  disabled={cfg.step === 'generating'}
                  style={{ padding: '8px 18px' }}
                >
                  {cfg.step === lastStepId ? 'Generate PDF →' : 'Next →'}
                </window.PrimaryButton>
              ) : (
                <button onClick={goNext} disabled={cfg.step === 'generating'}>
                  {cfg.step === lastStepId ? 'Generate PDF →' : 'Next →'}
                </button>
              )}
            </div>
          </div>
        </div>

      </>
    );
  }

  window.ExportWizardDrawer = ExportWizardDrawer;
  // Expose layout defaults so profiles that want to override only one
  // card can spread the rest.
  window.ExportWizardDrawer.DEFAULT_LAYOUTS = DEFAULT_LAYOUTS;
  window.ExportWizardDrawer.DEFAULT_LAYOUT_PAPER_HINT = DEFAULT_LAYOUT_PAPER_HINT;
})();
