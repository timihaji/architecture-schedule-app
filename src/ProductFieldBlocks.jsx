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

// Painted-with picker — colour-swatch dropdown filtered to paint products.
// Replaces the in-App.jsx PaintSelect helper used by StandardFields.
function PFB_PaintSelect({ value, onChange, options, placeholder = '— unspecified —' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const selected = options.find(o => o.id === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="sel-d"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          textAlign: 'left', cursor: 'pointer',
          backgroundImage: 'none', paddingRight: 28,
        }}>
        {selected ? (
          <>
            <span style={{
              width: 14, height: 14, flexShrink: 0,
              background: selected.tone || '#ddd',
              outline: '1px solid rgba(20,20,20,0.15)',
              display: 'inline-block',
            }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selected.label}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-4)' }}>{placeholder}</span>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)',
          position: 'absolute', right: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          maxHeight: 260, overflowY: 'auto',
          zIndex: 20,
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
        }}>
          <button type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            style={{
              width: '100%', padding: '8px 10px', textAlign: 'left',
              background: value == null ? 'var(--tint)' : 'var(--paper)',
              border: 'none', borderBottom: '1px dotted var(--rule-2)', cursor: 'pointer',
              fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic',
              fontFamily: 'var(--font-serif)',
            }}>{placeholder}</button>
          {options.map(o => (
            <button key={o.id} type="button"
              onClick={() => { onChange(o.id); setOpen(false); }}
              style={{
                width: '100%', padding: '7px 10px',
                display: 'flex', alignItems: 'center', gap: 8,
                background: o.id === value ? 'var(--tint)' : 'var(--paper)',
                border: 'none', borderBottom: '1px dotted var(--rule-2)', cursor: 'pointer',
                textAlign: 'left',
              }}>
              <span style={{
                width: 16, height: 16, flexShrink: 0,
                background: o.tone || '#ddd',
                outline: '1px solid rgba(20,20,20,0.15)',
              }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink)',
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: 'block' }}>{o.label}</span>
                {o.meta && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5,
                    color: 'var(--ink-4)', letterSpacing: '0.06em' }}>{o.meta}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PFB_Specs({ draft, set, materials = [] }) {
  const isFinish = !draft.kind || draft.kind === 'material';
  const isAppliance = draft.kind === 'appliance' || draft.kind === 'fitting';
  const isLighting = draft.kind === 'light' || draft.kind === 'ffe-lighting';
  const isFFE = draft.kind && draft.kind.startsWith('ffe-');
  const isPaint = draft.kind === 'paint' || draft.category === 'Paint';

  const paintChoices = materials.filter(m => m.kind === 'paint' || m.category === 'Paint');
  const linkedPaint = draft.paintable && draft.paintedWithId
    ? paintChoices.find(p => p.id === draft.paintedWithId) : null;
  const inheritedFinish = linkedPaint
    ? `${linkedPaint.sheen || ''} · ${linkedPaint.brand || ''} ${linkedPaint.colourName || linkedPaint.name}`.trim()
    : null;

  // Auto-inherit Finish text when a paint is linked (unless user toggled override).
  React.useEffect(() => {
    if (linkedPaint && !draft.finishOverride) {
      if (draft.finish !== inheritedFinish) set('finish', inheritedFinish);
    }
  }, [linkedPaint?.id, linkedPaint?.sheen, linkedPaint?.colourName, draft.finishOverride]);

  // Auto-inherit swatch tone when a paint is linked + user opted in.
  React.useEffect(() => {
    if (linkedPaint && draft.inheritPaintTone) {
      const paintTone = linkedPaint.swatch?.tone;
      if (paintTone && draft.swatch?.tone !== paintTone) {
        set('swatch', { ...draft.swatch, tone: paintTone });
      }
    }
  }, [linkedPaint?.swatch?.tone, draft.inheritPaintTone]);

  return (
    <PFB_Section num="03" label="Specs">
      {/* Row 1 — Dimensions (single string preserved) + optional Thickness */}
      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <label className="lbl-d">Dimensions</label>
          <input className="inp-d mono"
            value={draft.dimensions || ''}
            onChange={e => set('dimensions', e.target.value)}
            placeholder={isAppliance || isFFE ? 'W × H × D mm' : '2400 × 1200'} />
        </div>
        {isFinish && (
          <div>
            <label className="lbl-d">Thickness</label>
            <input className="inp-d mono"
              value={draft.thickness || ''}
              onChange={e => set('thickness', e.target.value)} />
          </div>
        )}
      </div>

      {/* Row 2 — Finish (with paint inheritance + override) + Unit */}
      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: 4 }}>
            <label className="lbl-d" style={{ marginBottom: 0 }}>Finish</label>
            {linkedPaint && (
              <button type="button"
                onClick={() => set('finishOverride', !draft.finishOverride)}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: draft.finishOverride ? 'var(--accent-ink)' : 'var(--ink-4)',
                  fontWeight: 500,
                }}>{draft.finishOverride ? 'Override ✓' : 'Override'}</button>
            )}
          </div>
          {linkedPaint && !draft.finishOverride ? (
            <div className="inp-d" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--tint)', borderStyle: 'dashed',
              color: 'var(--ink-2)', cursor: 'not-allowed',
            }}>
              <div style={{
                width: 14, height: 14, flexShrink: 0,
                background: linkedPaint.swatch?.tone || '#ddd',
                outline: '1px solid rgba(20,20,20,0.15)',
              }} />
              <span style={{ fontSize: 13 }}>{inheritedFinish}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)',
                fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>INHERITED</span>
            </div>
          ) : (
            <input className="inp-d"
              value={draft.finish || ''}
              onChange={e => set('finish', e.target.value)} />
          )}
        </div>
        <div>
          <label className="lbl-d">Unit</label>
          <select className="sel-d"
            value={draft.unit || (isPaint ? 'm²' : 'ea')}
            onChange={e => set('unit', e.target.value)}>
            {['m²', 'l/m', 'each', 'sheet', 'ea', 'set', 'item'].map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Per-kind extras */}
      {isAppliance && (
        <div className="row-2" style={{ marginBottom: 10 }}>
          <div>
            <label className="lbl-d">Rough-in</label>
            <input className="inp-d mono"
              value={draft.roughIn || ''}
              onChange={e => set('roughIn', e.target.value)}
              placeholder="e.g. 600w × 900h cutout" />
          </div>
          <div>
            <label className="lbl-d">Power / services</label>
            <input className="inp-d mono"
              value={draft.power || ''}
              onChange={e => set('power', e.target.value)}
              placeholder="e.g. 15A GPO, cold + hot water" />
          </div>
        </div>
      )}

      {isLighting && (
        <>
          <div className="row-2" style={{ marginBottom: 10 }}>
            <div>
              <label className="lbl-d">Lamp</label>
              <input className="inp-d"
                value={draft.lamp || ''}
                onChange={e => set('lamp', e.target.value)}
                placeholder="e.g. GU10 LED, integrated" />
            </div>
            <div>
              <label className="lbl-d">Wattage</label>
              <input className="inp-d mono"
                value={draft.wattage || ''}
                onChange={e => set('wattage', e.target.value)}
                placeholder="e.g. 9W" />
            </div>
          </div>
          <div className="row-2" style={{ marginBottom: 10 }}>
            <div>
              <label className="lbl-d">Colour temp</label>
              <input className="inp-d mono"
                value={draft.kelvin || ''}
                onChange={e => set('kelvin', e.target.value)}
                placeholder="e.g. 2700K" />
            </div>
            <div>
              <label className="lbl-d">Dimmable</label>
              <select className="sel-d"
                value={draft.dimmable || ''}
                onChange={e => set('dimmable', e.target.value)}>
                <option value="">—</option>
                <option>Yes — phase-cut</option>
                <option>Yes — DALI</option>
                <option>Yes — 0-10V</option>
                <option>No</option>
              </select>
            </div>
          </div>
        </>
      )}

      {isFFE && (
        <div style={{ marginBottom: 10 }}>
          <label className="lbl-d">Fabric</label>
          <input className="inp-d"
            value={draft.fabric || ''}
            onChange={e => set('fabric', e.target.value)}
            placeholder="e.g. Warwick Fabric · COM" />
        </div>
      )}

      {isPaint && (
        <>
          <div className="row-2" style={{ marginBottom: 10 }}>
            <div>
              <label className="lbl-d">Base type</label>
              <select className="sel-d"
                value={draft.baseType || ''}
                onChange={e => set('baseType', e.target.value)}>
                <option value="">—</option>
                <option value="Water-based">Water-based</option>
                <option value="Enamel">Enamel</option>
                <option value="Oil">Oil</option>
              </select>
            </div>
            <div>
              <label className="lbl-d">Coats</label>
              <input className="inp-d mono" type="number" min="1" max="5"
                value={draft.coats || 2}
                onChange={e => set('coats', parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="lbl-d">Finishes (use)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Interior Walls', 'Ceilings', 'Doors', 'Trim', 'Exterior'].map(f => {
                const arr = Array.isArray(draft.finishes) ? draft.finishes : [];
                const on = arr.includes(f);
                return (
                  <button key={f} type="button"
                    onClick={() => {
                      const next = on ? arr.filter(x => x !== f) : [...arr, f];
                      set('finishes', next);
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      fontFamily: 'var(--font-sans)',
                      border: '1px solid ' + (on ? 'var(--ink)' : 'var(--rule-2)'),
                      background: on ? 'var(--tint)' : 'var(--paper)',
                      color: on ? 'var(--ink)' : 'var(--ink-3)',
                      cursor: 'pointer',
                    }}>{f}</button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="lbl-d">Substrates</label>
            <input className="inp-d"
              value={draft.substrates || ''}
              onChange={e => set('substrates', e.target.value)}
              placeholder="Plasterboard, primed MDF…" />
          </div>
        </>
      )}

      {/* Paintable opt-in (finishes only) + linked paint preview */}
      {isFinish && (
        <div style={{ marginTop: 10, padding: '12px 0 2px',
          borderTop: '1px dotted var(--rule-2)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!draft.paintable}
              onChange={e => set('paintable', e.target.checked)}
              style={{ accentColor: 'var(--accent)', margin: 0 }} />
            <span className="lbl-d" style={{ marginBottom: 0 }}>
              This material is paintable — expose a paint finish
            </span>
          </label>
          {draft.paintable && (
            <div className="row-2" style={{ marginTop: 10 }}>
              <div>
                <label className="lbl-d">Painted with</label>
                <PFB_PaintSelect
                  value={draft.paintedWithId || null}
                  onChange={v => set('paintedWithId', v)}
                  options={paintChoices.map(p => ({
                    id: p.id,
                    tone: p.swatch?.tone,
                    label: `${p.brand || p.supplier} · ${p.colourName || p.name}`,
                    meta: [p.code, p.sheen].filter(Boolean).join(' · '),
                  }))} />
              </div>
              {linkedPaint && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 20 }}>
                  <div style={{
                    width: 28, height: 28, flexShrink: 0,
                    background: linkedPaint.swatch?.tone || '#ddd',
                    outline: '1px solid rgba(20,20,20,0.15)',
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: 'var(--ink-4)' }}>{linkedPaint.code}</div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13,
                      color: 'var(--ink)' }}>
                      {linkedPaint.brand} {linkedPaint.colourName}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PFB_Section>
  );
}

function PFB_Commercial({ draft, set }) {
  const isPaint = draft.kind === 'paint' || draft.category === 'Paint';
  const tradeDiscounts = Array.isArray(draft.tradeDiscounts) ? draft.tradeDiscounts : [];

  // Auto-derive $/m² from $/L × coats ÷ coverage (paint, perLitre model only).
  React.useEffect(() => {
    if (isPaint && draft.costModel === 'perLitre' && draft.pricePerL && draft.coveragePerL) {
      const derived = (draft.pricePerL * (draft.coats || 2)) / draft.coveragePerL;
      if (Math.abs((draft.unitCost || 0) - derived) > 0.5) {
        set('unitCost', Math.round(derived * 100) / 100);
      }
    }
  }, [isPaint, draft.costModel, draft.pricePerL, draft.coveragePerL, draft.coats]);

  return (
    <PFB_Section num="04" label="Commercial">
      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <label className="lbl-d">{isPaint && (draft.costModel || 'perSqm') === 'perSqm' ? 'Price (per m²)' : 'Price'}</label>
          <input className="inp-d mono" type="number"
            value={draft.unitCost || 0}
            onChange={e => set('unitCost', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="lbl-d">Currency</label>
          <select className="sel-d"
            value={draft.currency || 'AUD'}
            onChange={e => set('currency', e.target.value)}>
            {['AUD', 'USD', 'EUR', 'GBP', 'NZD'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="row-2" style={{ marginBottom: 10 }}>
        <div>
          <label className="lbl-d">Lead time</label>
          <input className="inp-d mono"
            value={draft.leadTime || ''}
            onChange={e => set('leadTime', e.target.value)} />
        </div>
        <div>
          <label className="lbl-d">Supplier code</label>
          <input className="inp-d mono"
            value={draft.supplier_code || ''}
            onChange={e => set('supplier_code', e.target.value)}
            placeholder="Supplier's SKU / product no." />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label className="lbl-d">Origin</label>
        <input className="inp-d"
          value={draft.origin || ''}
          onChange={e => set('origin', e.target.value)} />
      </div>

      {isPaint && (
        <div style={{ marginTop: 10, padding: '12px 0 4px',
          borderTop: '1px dotted var(--rule-2)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginBottom: 8 }}>
            <span className="lbl-d" style={{ marginBottom: 0 }}>Pricing model</span>
            {[
              { v: 'perSqm', l: 'per m²' },
              { v: 'perLitre', l: 'per litre (auto m²)' },
            ].map(o => (
              <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="radio" name="paint-cost-model"
                  checked={(draft.costModel || 'perSqm') === o.v}
                  onChange={() => set('costModel', o.v)}
                  style={{ accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{o.l}</span>
              </label>
            ))}
          </div>
          {(draft.costModel || 'perSqm') === 'perLitre' && (
            <>
              <div className="row-2" style={{ marginBottom: 10 }}>
                <div>
                  <label className="lbl-d">Price per litre</label>
                  <input className="inp-d mono" type="number"
                    value={draft.pricePerL || 0}
                    onChange={e => set('pricePerL', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="lbl-d">Coverage (m² / L)</label>
                  <input className="inp-d mono" type="number"
                    value={draft.coveragePerL || 14}
                    onChange={e => set('coveragePerL', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div style={{
                background: 'var(--tint)', padding: '10px 12px',
                borderLeft: '2px solid var(--accent)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: 10,
              }}>
                <span className="lbl-d" style={{ marginBottom: 0 }}>Derived cost per m²</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                  {draft.pricePerL && draft.coveragePerL
                    ? (draft.currency || 'AUD') + ' ' +
                      ((draft.pricePerL * (draft.coats || 2)) / draft.coveragePerL).toFixed(2)
                    : '—'}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--ink-4)', marginLeft: 6 }}>
                    = {draft.pricePerL || 0}/L × {draft.coats || 2} coats ÷ {draft.coveragePerL || 0} m²/L
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 10, padding: '12px 0 4px',
        borderTop: '1px dotted var(--rule-2)' }}>
        <label className="lbl-d">Trade discounts</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {tradeDiscounts.map((d, i) => (
            <span key={`${d}-${i}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 6px 4px 10px',
              fontSize: 11,
              fontFamily: 'var(--font-sans)',
              border: '1px solid var(--rule-2)',
              background: 'var(--paper)',
              color: 'var(--ink-2)',
            }}>
              {d}
              <button type="button"
                onClick={() => set('tradeDiscounts',
                  tradeDiscounts.filter((_, j) => j !== i))}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 14, color: 'var(--ink-4)', lineHeight: 1,
                }}
                aria-label={`Remove ${d}`}>×</button>
            </span>
          ))}
          <button type="button"
            onClick={() => {
              const v = window.prompt('Trade discount (e.g. "GC 10%")');
              if (v && v.trim()) {
                set('tradeDiscounts', [...tradeDiscounts, v.trim()]);
              }
            }}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontFamily: 'var(--font-sans)',
              border: '1px dashed var(--rule-2)',
              background: 'transparent',
              color: 'var(--ink-3)',
              cursor: 'pointer',
            }}>+ Add</button>
        </div>
      </div>
    </PFB_Section>
  );
}

function PFB_Notes({ draft, set }) {
  return (
    <PFB_Section num="05" label="Notes">
      <div style={{ marginBottom: 14 }}>
        <label className="lbl-d">Specification</label>
        <textarea
          className="tarea-d"
          rows={4}
          value={draft.spec || ''}
          onChange={e => set('spec', e.target.value)}
          placeholder="Add specification notes…"
        />
      </div>

      <div style={{ marginTop: 10, padding: '12px 0 4px',
        borderTop: '1px dotted var(--rule-2)' }}>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 8.5, letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginBottom: 10,
        }}>Submittal details</div>

        <div className="row-2" style={{ marginBottom: 10 }}>
          <div>
            <label className="lbl-d">Manufacturer</label>
            <input className="inp-d"
              value={draft.mfr || ''}
              onChange={e => set('mfr', e.target.value)}
              placeholder="If different from supplier" />
          </div>
          <div>
            <label className="lbl-d">Contact</label>
            <input className="inp-d"
              value={draft.contact || ''}
              onChange={e => set('contact', e.target.value)}
              placeholder="Name · phone / email" />
          </div>
        </div>

        <div className="row-2" style={{ marginBottom: 10 }}>
          <div>
            <label className="lbl-d">Product URL</label>
            <input className="inp-d mono"
              value={draft.url || ''}
              onChange={e => set('url', e.target.value)}
              placeholder="supplier.com/product" />
          </div>
          <div>
            <label className="lbl-d">Warranty</label>
            <input className="inp-d"
              value={draft.warranty || ''}
              onChange={e => set('warranty', e.target.value)}
              placeholder="e.g. 25yr structural / 5yr finish" />
          </div>
        </div>

        <div>
          <label className="lbl-d">Installation notes</label>
          <textarea
            className="tarea-d"
            rows={3}
            value={draft.installNotes || ''}
            onChange={e => set('installNotes', e.target.value)}
            placeholder="Adhesive, fixings, expansion gaps, sequence…"
          />
        </div>
      </div>
    </PFB_Section>
  );
}

window.ProductFieldBlocks = {
  Identity: PFB_Identity,
  Visual: PFB_Visual,
  Specs: PFB_Specs,
  Commercial: PFB_Commercial,
  Notes: PFB_Notes,
};
