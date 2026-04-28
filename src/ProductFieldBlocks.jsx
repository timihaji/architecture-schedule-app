// ProductFieldBlocks — five drawer sections for Add Product / Edit Product.
// Phase 1B: lifts existing field code from MaterialEditor's StandardFields /
// PaintFields / SubmittalFields helpers into a single composition module
// rendered against the design's .section-h / .row-2 / .row-3 / .lbl-d /
// .inp-d / .sel-d / .tarea-d classes (defined in index.html).

function PFB_Section({ num, label, children }) {
  return (
    <>
      <div className="section-h">
        <span>{label}</span>
        <span className="num">{num}</span>
      </div>
      {children}
    </>
  );
}

function PFB_Identity({ draft, set, codeError = false }) {
  const isFinish = !draft.kind || draft.kind === 'material';
  const isAppliance = draft.kind === 'appliance' || draft.kind === 'fitting';
  const isLighting = draft.kind === 'light' || draft.kind === 'ffe-lighting';
  const isFFE = draft.kind && draft.kind.startsWith('ffe-');
  const isPaint = draft.kind === 'paint' || draft.category === 'Paint';
  const kindRec = (window.KINDS || []).find(k => k.id === draft.kind);
  const kindLabel = kindRec?.label || draft.kind || '—';

  return (
    <PFB_Section num="01" label="Identity">
      {/* Row 1 — Code + Name (Name spans 2 cols of an effective 3-col grid) */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 2fr',
        gap: '10px 14px', marginBottom: 10,
      }}>
        <div>
          <label className="lbl-d">Code<span className="req-d">*</span></label>
          <input
            className="inp-d mono"
            value={draft.code || ''}
            onChange={e => set('code', e.target.value)}
            style={codeError ? { borderColor: 'var(--accent)' } : undefined}
          />
        </div>
        <div>
          <label className="lbl-d">Name<span className="req-d">*</span></label>
          <input
            className="inp-d"
            value={draft.name || ''}
            onChange={e => set('name', e.target.value)}
            placeholder={isPaint ? 'Colour name, e.g. Natural White' : ''}
          />
        </div>
      </div>

      {/* Row 2 — Type (readonly display) + Category (when finish or paint) */}
      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <label className="lbl-d">Type</label>
          <div
            className="sel-d"
            style={{
              cursor: 'default',
              color: 'var(--ink-2)',
              backgroundImage: 'none',
              paddingRight: 10,
            }}
            title="Type is set when the product is created."
          >{kindLabel}</div>
        </div>
        {(isFinish || isPaint) && (
          <div>
            <label className="lbl-d">Category</label>
            <select
              className="sel-d"
              value={draft.category || ''}
              onChange={e => set('category', e.target.value)}
            >
              {(window.CATEGORIES || []).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Row 3 — Supplier + Trade */}
      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <label className="lbl-d">Supplier</label>
          <input
            className="inp-d"
            value={draft.supplier || ''}
            onChange={e => set('supplier', e.target.value)}
          />
        </div>
        <div>
          <label className="lbl-d">Trade</label>
          <input
            className="inp-d"
            list="aml-trades"
            value={draft.trade || ''}
            onChange={e => set('trade', e.target.value)}
            placeholder="e.g. Joinery, Plumbing, Electrical"
          />
          <datalist id="aml-trades">
            {(window.TRADES || []).map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
      </div>

      {/* Paint-only Identity rows: Brand + Colour code, Sheen + System */}
      {isPaint && (
        <>
          <div className="row-2" style={{ marginBottom: 10 }}>
            <div>
              <label className="lbl-d">Brand</label>
              <input
                className="inp-d"
                list="paint-brands"
                value={draft.brand || ''}
                onChange={e => {
                  set('brand', e.target.value);
                  set('supplier', e.target.value);
                }}
                placeholder="Dulux, Porter's, Bauwerk…"
              />
              <datalist id="paint-brands">
                {(window.PAINT_BRANDS || []).map(b => <option key={b} value={b} />)}
              </datalist>
            </div>
            <div>
              <label className="lbl-d">Colour code</label>
              <input
                className="inp-d mono"
                value={draft.colourCode || ''}
                onChange={e => set('colourCode', e.target.value)}
                placeholder="e.g. SW1F2, H168W"
              />
            </div>
          </div>
          <div className="row-2" style={{ marginBottom: 10 }}>
            <div>
              <label className="lbl-d">Sheen</label>
              <select
                className="sel-d"
                value={draft.sheen || ''}
                onChange={e => {
                  set('sheen', e.target.value);
                  set('finish', e.target.value);
                }}
              >
                <option value="">—</option>
                {(window.PAINT_SHEENS || []).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="lbl-d">System</label>
              <input
                className="inp-d"
                value={draft.system || ''}
                onChange={e => set('system', e.target.value)}
                placeholder="e.g. Wash & Wear Interior"
              />
            </div>
          </div>
        </>
      )}

      {/* Optional finish-only Species */}
      {isFinish && !isPaint && (
        <div style={{ marginBottom: 10 }}>
          <label className="lbl-d">Species</label>
          <input
            className="inp-d"
            value={draft.species || ''}
            onChange={e => set('species', e.target.value)}
            placeholder="optional — latin name"
          />
        </div>
      )}

      {/* Optional Model for appliance / lighting / FF&E */}
      {(isAppliance || isLighting || isFFE) && (
        <div style={{ marginBottom: 10 }}>
          <label className="lbl-d">Model</label>
          <input
            className="inp-d mono"
            value={draft.model || ''}
            onChange={e => set('model', e.target.value)}
            placeholder="Model no. / SKU"
          />
        </div>
      )}
    </PFB_Section>
  );
}

function PFB_Visual({ draft, set, setSwatch, materials = [] }) {
  const isPaint = draft.kind === 'paint' || draft.category === 'Paint';
  const seed = parseInt((draft.id || '').slice(2)) || 1;
  const linkedPaint = draft.paintable && draft.paintedWithId
    ? materials.find(x => x.id === draft.paintedWithId)
    : null;
  const hex = draft.swatch?.tone || (isPaint ? '#e5e2d8' : '#b8aa94');

  return (
    <PFB_Section num="02" label="Visual">
      {window.SwatchEditor && (
        <window.SwatchEditor
          swatch={draft.swatch}
          setSwatch={setSwatch}
          seed={seed}
          category={draft.category}
          sheen={draft.sheen}
          linkedPaint={linkedPaint}
          inheritPaintTone={!!draft.inheritPaintTone}
          setInheritPaintTone={v => set('inheritPaintTone', v)}
        />
      )}
      {isPaint && (
        <div style={{ marginTop: 12 }}>
          <label className="lbl-d">Colour (hex)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="color"
              value={hex}
              onChange={e => {
                setSwatch('kind', 'paint');
                setSwatch('tone', e.target.value);
              }}
              style={{
                width: 44, height: 32, flexShrink: 0,
                border: '1px solid var(--rule-2)',
                background: 'var(--paper)',
                padding: 0, cursor: 'pointer',
              }}
            />
            <input
              className="inp-d mono"
              value={hex}
              onChange={e => {
                setSwatch('kind', 'paint');
                setSwatch('tone', e.target.value);
              }}
            />
          </div>
        </div>
      )}
    </PFB_Section>
  );
}

window.ProductFieldBlocks = {
  Identity: PFB_Identity,
  Visual: PFB_Visual,
};
