// MaterialEditor — right-sliding drawer for adding / editing a product.
// Extracted from App.jsx in Phase 6. Includes the editor body, its glue
// pieces (DuplicatePicker, SwatchEditor, CustomNameBar) and the small
// field-style helpers (EditorField, fieldStyle, colorFieldStyle).
//
// Bare references (Eyebrow, Serif, Tag, TextButton, Mono, Swatch, ui) resolve
// via window — primitives.jsx and ui-components.jsx load earlier.

// Inline picker shown inside the Add Product drawer when mode === 'duplicate'.
// Search-at-top + click-to-confirm. Selecting a row prefills the draft from
// the picked product (everything except id + code) and flips mode back to
// 'manual' so the regular drawer body re-renders.
function DuplicatePicker({ products = [], onPick }) {
  const [q, setQ] = React.useState('');
  const ql = q.trim().toLowerCase();
  const visible = ql
    ? products.filter(p => {
        const hay = [p.name, p.code, p.brand, p.supplier, p.colourName, p.colourCode]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(ql);
      })
    : products;

  return (
    <div className="dup-pick-wrap">
      <input
        className="inp-d"
        autoFocus
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search products by name, code, brand or supplier…"
        style={{ marginBottom: 12 }}
      />
      {visible.length === 0 ? (
        <div className="dup-pick-empty">
          {products.length === 0
            ? 'No products to duplicate yet — create one in Manual mode first.'
            : 'No products match.'}
        </div>
      ) : (
        <div className="dup-pick-list">
          {visible.map(p => (
            <button key={p.id} type="button"
              onClick={() => onPick(p)}
              className="dup-pick-row">
              <div className="dup-pick-swatch"
                style={{ background: p.swatch?.tone || 'var(--paper-2)' }} />
              <div className="dup-pick-info">
                <div className="dup-pick-name">{p.colourName || p.name || '—'}</div>
                <div className="dup-pick-meta">
                  {[p.code, p.brand || p.supplier].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className="dup-pick-use">Use →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialEditor({ material, materials = [], labelTemplates, onOpenLabelBuilder, onClose, onSave, onSaveAndAddAnother, requireCodeOnSave, showLibraryCode = false }) {
  // Normalise currency on existing rows that pre-date the field so the
  // Commercial section doesn't crash on undefined. (tradeDiscounts removed —
  // legacy values stay on disk but are no longer surfaced.)
  const [draft, setDraft] = React.useState(() => ({
    ...material,
    currency: material.currency || 'AUD',
  }));
  const [codeError, setCodeError] = React.useState(false);
  // Phase C1 — intake-mode tabs. Manual is the only functional mode in v1;
  // Duplicate is selectable but its body lands in C9. URL/PDF/CSV are disabled.
  // C1 delta — gate behind material._isNew so tabs only render when CREATING.
  const [mode, setMode] = React.useState('manual');
  function set(k, v) { setDraft(d => ({ ...d, [k]: v })); if (k === 'code') setCodeError(false); }
  function setSwatch(k, v) { setDraft(d => ({ ...d, swatch: { ...d.swatch, [k]: v } })); }
  function handleSave() {
    if (requireCodeOnSave && !draft.code?.trim()) { setCodeError(true); return; }
    onSave(draft);
  }
  function handleSaveAndAddAnother() {
    if (requireCodeOnSave && !draft.code?.trim()) { setCodeError(true); return; }
    if (onSaveAndAddAnother) onSaveAndAddAnother(draft);
  }

  // Flip swatch kind when category changes in/out of Paint
  React.useEffect(() => {
    if ((draft.category === 'Paint' || draft.category === 'paint') && draft.swatch?.kind !== 'paint') {
      setDraft(d => ({
        ...d,
        swatch: { kind: 'paint', tone: d.swatch?.tone || '#e5e2d8', sheen: d.sheen || '' },
        unit: d.unit || 'm²',
      }));
    } else if (draft.category !== 'Paint' && draft.category !== 'paint' && draft.swatch?.kind === 'paint') {
      setDraft(d => ({ ...d, swatch: { kind: 'solid', tone: d.swatch?.tone || '#b8aa94' } }));
    }
  }, [draft.category]);

  // Keep paint swatch's sheen in sync with the sheen field
  React.useEffect(() => {
    if ((draft.category === 'Paint' || draft.category === 'paint') && draft.swatch?.kind === 'paint' && draft.swatch?.sheen !== draft.sheen) {
      setDraft(d => ({ ...d, swatch: { ...d.swatch, sheen: d.sheen || '' } }));
    }
  }, [draft.sheen, draft.category]);

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Drawer chrome (right-sliding panel, .drw-bg + .drw-panel from
  // design/handoff/v2/Library.html). Body sections — 01 Identity, 02 Visual,
  // 03 Specs, 04 Commercial, 05 Notes — render via window.ProductFieldBlocks.
  return (
    <>
      <div className="drw-bg" onClick={onClose} />
      <div className="drw-panel" role="dialog"
        aria-label={material._isNew ? 'Add product' : 'Edit product'}
        onClick={e => e.stopPropagation()}>
        <div className="drw-head">
          <Eyebrow style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
            I · Library / {material._isNew ? 'Add' : 'Edit'}
          </Eyebrow>
          <div className="drw-head-row" style={{ marginTop: 4 }}>
            <Serif size={22} style={{ display: 'block' }}>
              {material._isNew ? 'Add Product' : 'Edit Product'}
            </Serif>
            <button type="button" className="drw-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        {/* Mode tab strip — C1 delta #2: only render when creating. */}
        {material._isNew && window.ModeTabStrip && (
          <window.ModeTabStrip mode={mode} setMode={setMode} />
        )}

        <div className="drw-body">
          {mode === 'manual' && (
            <>
              <CustomNameBar draft={draft} set={set}
                labelTemplates={labelTemplates}
                onOpenLabelBuilder={onOpenLabelBuilder} />

              <window.ProductFieldBlocks.Visual
                draft={draft} set={set} setSwatch={setSwatch} materials={materials} />

              <window.ProductFieldBlocks.Identity
                draft={draft} set={set} codeError={codeError} showCode={showLibraryCode} />

              <window.ProductFieldBlocks.Specs
                draft={draft} set={set} materials={materials} />

              <window.ProductFieldBlocks.Notes
                draft={draft} set={set} />

              <window.ProductFieldBlocks.Commercial
                draft={draft} set={set} />
            </>
          )}

          {mode === 'duplicate' && (
            <DuplicatePicker
              products={materials}
              onPick={src => {
                const { id, code, codeHistory, _isNew, ...prefill } = src;
                const policy = window.DUPE_PRESET_A;
                const newCode = (window.autoAssignCode
                  ? window.autoAssignCode(materials, policy, src.category)
                  : '') || '';
                setDraft({
                  ...prefill,
                  id: 'm-' + Date.now(),
                  code: newCode,
                  currency: prefill.currency || 'AUD',
                  _isNew: true,
                });
                setMode('manual');
              }}
            />
          )}
        </div>

        <div className="drw-foot">
          {codeError && (
            <span style={{ fontSize: 11, color: 'var(--accent)',
              fontFamily: 'var(--font-sans)', marginRight: 'auto' }}>
              A code is required before saving.
            </span>
          )}
          <button type="button" className="btn-sec-d" onClick={onClose}>Cancel</button>
          {material._isNew && mode === 'manual' && onSaveAndAddAnother && (
            <button type="button" className="btn-sec-d" onClick={handleSaveAndAddAnother}>
              Save &amp; add another
            </button>
          )}
          <span style={{ flex: 1 }} />
          {mode === 'manual' && (
            <button type="button" className="btn-pri-d" onClick={handleSave}>
              {material._isNew ? 'Save Product' : 'Save changes'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// Phase 1B (commit 5): StandardFields / PaintFields / SubmittalFields are all
// gone — every field they used to render now lives in ProductFieldBlocks
// (Identity / Visual / Specs / Commercial / Notes). EditorField + fieldStyle
// remain because SwatchEditor (below) still uses them.

function EditorField({ label, children, full = false }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ ...ui.label, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function fieldStyle(variant) {
  return {
    width: '100%',
    background: 'transparent',
    border: '1px solid var(--rule-2)',
    padding: '6px 10px',
    fontFamily: variant === 'mono' ? "'JetBrains Mono', monospace" : "'Inter Tight', sans-serif",
    fontSize: 13,
    color: 'var(--ink)',
    outline: 'none',
  };
}

const colorFieldStyle = {
  width: '100%',
  height: 32,
  border: '1px solid var(--rule-2)',
  background: 'transparent',
  padding: 2,
  cursor: 'pointer',
};

// ───────── Swatch editor with tabs: Pattern / Color / Image ─────────
function SwatchEditor({ swatch, setSwatch, seed, category, sheen,
  linkedPaint, inheritPaintTone, setInheritPaintTone }) {
  // Paint renders its swatch editor inline within PaintFields — show a preview here only.
  if (category === 'Paint') {
    const previewSwatch = { kind: 'paint', tone: swatch?.tone || '#e5e2d8', sheen: sheen || swatch?.sheen || '' };
    return (
      <div>
        <Eyebrow style={{ marginBottom: 8 }}>Paint chip</Eyebrow>
        <Swatch swatch={previewSwatch} size="lg" seed={seed} style={{ width: '100%', height: 150 }} />
        <div style={{ marginTop: 10, ...ui.mono, fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
          EDIT HEX &amp; SHEEN IN THE PAINT FIELDS →
        </div>
        <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--tint)',
          fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)',
          lineHeight: 1.45 }}>
          Paint swatches render as a flat colour block with the sheen noted.
          Procedural / image patterns don't apply.
        </div>
      </div>
    );
  }

  const tabFromSwatch = swatch.kind === 'image' ? 'image'
    : swatch.kind === 'solid' ? 'color' : 'pattern';
  const [tab, setTab] = React.useState(tabFromSwatch);
  const fileRef = React.useRef();

  const patternKinds = ['woodgrain', 'veneer', 'castellation', 'fluted', 'vj', 'marble', 'travertine', 'stone', 'brushed', 'weave'];

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSwatch('kind', 'image');
      setSwatch('src', reader.result);
    };
    reader.readAsDataURL(file);
  }

  function onTab(t) {
    setTab(t);
    if (t === 'color' && swatch.kind !== 'solid') setSwatch('kind', 'solid');
    if (t === 'image' && swatch.kind !== 'image') setSwatch('kind', 'image');
    if (t === 'pattern' && (swatch.kind === 'solid' || swatch.kind === 'image')) {
      setSwatch('kind', 'woodgrain');
    }
  }

  return (
    <div>
      <Eyebrow style={{ marginBottom: 8 }}>Swatch</Eyebrow>
      <Swatch swatch={swatch} size="lg" seed={seed} style={{ width: '100%', height: 150 }} />
      {linkedPaint && (
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox"
              checked={!!inheritPaintTone}
              onChange={e => setInheritPaintTone(e.target.checked)}
              style={{ accentColor: 'var(--accent)', margin: '2px 0 0' }} />
            <span style={{ ...ui.label, letterSpacing: '0.08em', color: 'var(--ink-2)' }}>
              Use paint colour as base tone
            </span>
          </label>
        </div>
      )}
      {inheritPaintTone && linkedPaint && (
        <div style={{ marginTop: 10, padding: '9px 11px', background: 'var(--tint)',
          fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 12.5,
          color: 'var(--ink-2)', lineHeight: 1.4 }}>
          Base tone is inherited from {linkedPaint.brand} {linkedPaint.colourName}.
          Untick above to set it manually.
        </div>
      )}
      <div style={{ display: 'flex', gap: 0, marginTop: 14, borderBottom: '1px solid var(--rule)' }}>
        {['pattern', 'color', 'image'].map(t => (
          <button key={t} type="button" onClick={() => onTab(t)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              padding: '7px 0',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: tab === t ? 'var(--ink)' : 'var(--ink-4)',
              fontWeight: tab === t ? 500 : 400,
              borderBottom: '1px solid ' + (tab === t ? 'var(--ink)' : 'transparent'),
              marginBottom: -1,
            }}>{t}</button>
        ))}
      </div>
      <div style={{ paddingTop: 12 }}>
        {tab === 'pattern' && (
          <>
            <EditorField label="Pattern">
              <select value={patternKinds.includes(swatch.kind) ? swatch.kind : 'woodgrain'}
                onChange={e => setSwatch('kind', e.target.value)} style={fieldStyle()}>
                {patternKinds.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </EditorField>
            <div style={{ marginTop: 10 }}>
              <EditorField label="Base tone">
                <input type="color" value={swatch.tone || '#b8aa94'}
                  disabled={inheritPaintTone}
                  onChange={e => setSwatch('tone', e.target.value)}
                  style={{ ...colorFieldStyle, opacity: inheritPaintTone ? 0.45 : 1,
                    cursor: inheritPaintTone ? 'not-allowed' : 'pointer' }} />
              </EditorField>
            </div>
            {['woodgrain','veneer','castellation','fluted','stone','brushed','weave'].includes(swatch.kind) && (
              <div style={{ marginTop: 10 }}>
                <EditorField label="Grain">
                  <input type="color" value={swatch.grain || '#5a3319'}
                    onChange={e => setSwatch('grain', e.target.value)}
                    style={colorFieldStyle} />
                </EditorField>
              </div>
            )}
            {['marble','travertine'].includes(swatch.kind) && (
              <div style={{ marginTop: 10 }}>
                <EditorField label="Vein">
                  <input type="color" value={swatch.vein || '#7a7468'}
                    onChange={e => setSwatch('vein', e.target.value)}
                    style={colorFieldStyle} />
                </EditorField>
              </div>
            )}
          </>
        )}
        {tab === 'color' && (
          <>
            <EditorField label="Colour">
              <input type="color" value={swatch.tone || '#b8aa94'}
                disabled={inheritPaintTone}
                onChange={e => setSwatch('tone', e.target.value)}
                style={{ ...colorFieldStyle, height: 44,
                  opacity: inheritPaintTone ? 0.45 : 1,
                  cursor: inheritPaintTone ? 'not-allowed' : 'pointer' }} />
            </EditorField>
            <div style={{ marginTop: 10 }}>
              <EditorField label="Hex">
                <input value={swatch.tone || ''}
                  disabled={inheritPaintTone}
                  onChange={e => setSwatch('tone', e.target.value)}
                  style={{ ...fieldStyle('mono'),
                    opacity: inheritPaintTone ? 0.45 : 1,
                    cursor: inheritPaintTone ? 'not-allowed' : 'text' }}
                  placeholder="#b8aa94" />
              </EditorField>
            </div>
            <div style={{ marginTop: 10, opacity: inheritPaintTone ? 0.45 : 1,
              pointerEvents: inheritPaintTone ? 'none' : 'auto' }}>
              <Eyebrow style={{ marginBottom: 6 }}>Presets</Eyebrow>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                {['#1a1a1a','#4a3a2a','#8a6236','#b8aa94','#c9a778','#ede7da',
                  '#575a5a','#9a7a5c','#ece6dc','#b85c3a','#5c6b3a','#3a4a5c']
                  .map(c => (
                  <button key={c} type="button"
                    onClick={() => setSwatch('tone', c)}
                    title={c}
                    style={{ height: 24, background: c, border: swatch.tone === c ? '2px solid var(--ink)' : '1px solid var(--rule-2)', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
            </div>
          </>
        )}
        {tab === 'image' && (
          <>
            <input ref={fileRef} type="file" accept="image/*"
              onChange={handleFile} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileRef.current.click()}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px dashed var(--rule-2)',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--ink-3)',
                fontWeight: 500,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ink)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--rule-2)'}
            >
              {swatch.src ? 'Replace image' : '＋ Upload image'}
            </button>
            {swatch.src && (
              <div style={{ marginTop: 10 }}>
                <TextButton onClick={() => setSwatch('src', null)} accent>Remove image</TextButton>
              </div>
            )}
            <div style={{ marginTop: 10, ...ui.mono, fontSize: 10, color: 'var(--ink-4)' }}>
              jpg, png, webp · stored in-browser
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ───────── Custom name bar (inside Material Editor) ─────────
function CustomNameBar({ draft, set, labelTemplates, onOpenLabelBuilder }) {
  const hasOverride = !!(draft.customName && draft.customName.trim());
  // What would the template render? (using current draft as the material)
  const templatePreview = labelTemplates
    ? window.formatLabel({ ...draft, customName: null }, labelTemplates)
    : draft.name;
  const finalPreview = window.formatLabel(draft, labelTemplates);

  return (
    <div style={{
      padding: '14px 28px',
      background: 'var(--paper-2)',
      borderBottom: '1px solid var(--rule)',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 20, alignItems: 'start',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', marginBottom: 5, gap: 10, flexWrap: 'wrap' }}>
          <Eyebrow>Display label</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            {hasOverride ? (
              <Tag tone="accent">Custom override</Tag>
            ) : (
              <span style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)',
                letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                From {draft.category} template
              </span>
            )}
            <TextButton onClick={() => onOpenLabelBuilder(draft.category || 'Global')}>
              Edit template
            </TextButton>
          </div>
        </div>
        <input
          value={draft.customName || ''}
          onChange={e => set('customName', e.target.value)}
          placeholder={hasOverride ? '' : `Leave blank — will render as: ${templatePreview}`}
          style={{
            width: '100%',
            background: 'var(--paper)',
            border: '1px solid ' + (hasOverride ? 'var(--accent)' : 'var(--rule-2)'),
            padding: '7px 10px',
            fontFamily: "'Newsreader', serif",
            fontSize: 15,
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline',
          justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ ...ui.serif, fontStyle: 'italic', fontSize: 12,
            color: 'var(--ink-3)' }}>
            Leave blank to use the template. Any text here overrides it for this entry only.
          </span>
          {hasOverride && (
            <button type="button" onClick={() => set('customName', '')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--accent-ink)', fontWeight: 500,
              }}>↺ Clear override</button>
          )}
        </div>
      </div>
      <div style={{ minWidth: 200, maxWidth: 260, paddingLeft: 18,
        borderLeft: '1px dotted var(--rule-2)' }}>
        <Eyebrow style={{ marginBottom: 6 }}>Renders as</Eyebrow>
        <div style={{
          ...ui.serif, fontSize: 15, lineHeight: 1.3, color: 'var(--ink)',
          fontStyle: hasOverride ? 'normal' : 'normal',
        }}>
          {finalPreview || <span style={{ color: 'var(--ink-4)',
            fontStyle: 'italic' }}>—</span>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MaterialEditor, DuplicatePicker, EditorField, fieldStyle, colorFieldStyle, SwatchEditor, CustomNameBar });
