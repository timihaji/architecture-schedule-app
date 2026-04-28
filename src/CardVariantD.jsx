// Phase D1b — CardVariantD. Canonical schedule row card per
// design/handoff/v2/Schedule Cards.html (variant D, "Editorial + Edit").
//
// Layout: 178px swatch column | content column. Three swatch kinds:
//   • product → solid colour block + brand watermark
//   • type    → sage-tinted block + serif italic code + "— N layers —"
//   • empty   → paper-2 ghost block + +-icon
//
// Hover reveals Edit button + per-cell × hide buttons. Edit mode renders
// inputs in place + a hidden-fields tray. Read-mode chips cycle on click;
// edit-mode chips become <select>. Save/Done is a no-op for the parent —
// state changes flow through onCardChange + onHiddenFieldsChange as they
// happen, so the Done button just exits edit mode.
//
// Element label is intentionally pulled from props.elementLabel (resolved
// upstream from the row.element id via taxonomies) rather than re-resolving
// here, so this stays a presentation component.

(function () {
  const { useState } = React;

  const STATE_INK = { new: '#3a6645', existing: '#6b6559', repair: '#7a5e20', match: '#2e5a7a', demolish: '#a04545' };
  const MODE_INK  = { prop: '#3a3630', perf: '#3a6645', open: '#2e5a7a', pc: '#7a5e20', tba: '#9a9385' };

  function CardVariantD({
    card,                   // { id, kind:'product'|'type'|'empty', element, elementLabel,
                            //   name, code, sku, supplier, trade, trades, slots, swatchColor,
                            //   swatchBrand, state, mode, hiddenFields, notes }
    elements,               // [{ id, label }] from taxonomies — for element <select>
    onSwatchClick,          // () => open PickerDrawer (D1d, future)
    onStateChange,          // (newState) => void
    onModeChange,           // (newMode) => void
    onFieldChange,          // (key, val) => void   — for editable fields
    onHiddenFieldsChange,   // (nextArr) => void
    onDelete,               // (id) => void
    isEditing,
    onEdit,
    onSave,
    q5trade = 'truncate',   // 'truncate' | 'chips' | 'suppress'
  }) {
    const [hovered, setHovered] = useState(false);
    const hidden = card.hiddenFields || [];
    const stateNorm = window.normState(card.state);
    const modeNorm  = window.normMode(card.mode);

    const elementOptions = (elements && elements.length > 0)
      ? elements
      : [{ id: card.element, label: card.elementLabel || card.element || '—' }];

    const allFields = [
      { key: 'element', label: 'Element', val: card.elementLabel || card.element || '—',
        rawVal: card.element || '', type: 'select',
        options: elementOptions.map(e => e.id),
        labelMap: Object.fromEntries(elementOptions.map(e => [e.id, e.label])),
        onChange: (v) => onFieldChange && onFieldChange('element', v) },
      { key: 'state', label: 'State', val: window.CHIP_STATE_LABEL[stateNorm],
        rawVal: stateNorm, color: STATE_INK[stateNorm], type: 'select',
        options: window.CHIP_STATES, labelMap: window.CHIP_STATE_LABEL,
        onChange: onStateChange },
      { key: 'mode', label: 'Spec Mode', val: window.CHIP_MODE_LABEL[modeNorm],
        rawVal: modeNorm, color: MODE_INK[modeNorm], type: 'select',
        options: window.CHIP_MODES, labelMap: window.CHIP_MODE_LABEL,
        onChange: onModeChange },
      card.supplier != null && card.supplier !== ''
        ? { key: 'supplier', label: 'Supplier', val: card.supplier,
            rawVal: card.supplier, type: 'text',
            onChange: (v) => onFieldChange && onFieldChange('supplier', v) }
        : null,
      card.sku != null && card.sku !== ''
        ? { key: 'sku', label: 'SKU', val: card.sku, rawVal: card.sku, type: 'text', mono: true,
            onChange: (v) => onFieldChange && onFieldChange('sku', v) }
        : null,
      (card.trade || (card.trades && card.trades.length))
        ? { key: 'trade', label: 'Trade',
            val: card.trade || (card.trades || []).join(' · '), rawVal: '',
            type: 'text', readonly: true }
        : null,
      { key: 'notes', label: 'Notes', val: card.notes || '', rawVal: card.notes || '',
        type: 'textarea', wide: true,
        onChange: (v) => onFieldChange && onFieldChange('notes', v) },
    ].filter(Boolean);

    const visFields = allFields.filter(f => !hidden.includes(f.key) && (f.val || isEditing));
    const hidFields = allFields.filter(f => hidden.includes(f.key));
    const gridFields = visFields.filter(f => !f.wide);
    const wideFields = visFields.filter(f => f.wide && (f.val || isEditing));

    const hideField = (key) => onHiddenFieldsChange && onHiddenFieldsChange([...hidden, key]);
    const showField = (key) => onHiddenFieldsChange && onHiddenFieldsChange(hidden.filter(k => k !== key));

    function renderFieldVal(f) {
      if (isEditing && !f.readonly) {
        if (f.type === 'select') return (
          <select className="sched-edit-select" value={f.rawVal}
            onChange={e => f.onChange && f.onChange(e.target.value)}
            style={{ color: f.color, fontWeight: f.color ? 500 : 400 }}>
            {f.options.map(o => (
              <option key={o} value={o}>{f.labelMap ? f.labelMap[o] : o}</option>
            ))}
          </select>
        );
        if (f.type === 'textarea') return (
          <textarea className="sched-edit-input" rows={2} value={f.rawVal || ''}
            onChange={e => f.onChange && f.onChange(e.target.value)}
            placeholder="Add a note…" />
        );
        return (
          <input className={`sched-edit-input${f.mono ? ' mono' : ''}`}
            value={f.rawVal || ''}
            onChange={e => f.onChange && f.onChange(e.target.value)} />
        );
      }
      if (f.type === 'textarea') {
        return f.val
          ? <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13,
                          color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.6 }}>
              {f.val}
            </div>
          : null;
      }
      return (
        <div className={`fcell-val${f.mono ? ' mono' : ''}${f.color ? ' colored' : ''}`}
          style={{ color: f.color || undefined }}>
          {f.val}
        </div>
      );
    }

    function Swatch() {
      if (card.kind === 'type') {
        return (
          <div className="sched-card-swatch type" onClick={onSwatchClick}>
            <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                          fontWeight: 300, fontSize: 44, color: 'var(--good-ink)',
                          lineHeight: 1 }}>{card.code || '—'}</div>
            {card.slots != null && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8,
                            letterSpacing: '0.16em', textTransform: 'uppercase',
                            color: 'var(--good-ink)', opacity: 0.55 }}>
                — {card.slots} layers —
              </div>
            )}
          </div>
        );
      }
      if (card.kind === 'empty') {
        return (
          <div className="sched-card-swatch empty" onClick={onSwatchClick} style={{ height: 168 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="var(--ink-4)" strokeWidth="1.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
        );
      }
      return (
        <div className="sched-card-swatch product" onClick={onSwatchClick}
          style={{ background: card.swatchColor || 'var(--paper-2)', height: 168 }}>
          {card.swatchBrand && <span className="sched-card-swatch-brand">{card.swatchBrand}</span>}
        </div>
      );
    }

    const eyebrowKind = card.kind === 'type' ? 'type' : card.kind === 'empty' ? 'empty' : 'product';

    return (
      <div className={`sched-card${isEditing ? ' editing' : ''}`}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <Swatch />
        <div className="sched-card-body">
          <div className={`sched-card-eyebrow ${eyebrowKind}`}>
            {card.elementLabel || card.element || (card.kind === 'empty' ? 'Empty' : '—')}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {card.kind === 'empty'
                ? <span className="sched-card-name empty">— pick a Product or Type —</span>
                : <span className="sched-card-name">
                    {card.name || <em style={{ color: 'var(--ink-4)' }}>Unnamed</em>}
                    {card.code && <span className="sched-card-code">{card.code}</span>}
                  </span>}
              <div className="sched-card-meta">
                {card.sku && !hidden.includes('sku') && (
                  <span className="sched-card-sku">{card.sku}</span>
                )}
                {card.supplier && !hidden.includes('supplier') && (
                  <span className="sched-card-supplier">{card.supplier}</span>
                )}
                {card.trade && !hidden.includes('trade') && (
                  <span className="sched-card-trade">{card.trade}</span>
                )}
              </div>
              {card.trades && card.trades.length > 0 && q5trade !== 'suppress' && (
                q5trade === 'chips'
                  ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                      {card.trades.map(t => <span key={t} className="trade-chip">{t}</span>)}
                    </div>
                  : <div style={{ marginTop: 3 }}>
                      <span className="sched-card-trade">
                        {card.trades[0]}{card.trades.length > 1 ? ` +${card.trades.length - 1}` : ''}
                      </span>
                    </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                          flexShrink: 0, paddingTop: 2 }}>
              {!isEditing && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span className="sched-state-chip"
                    style={{ background: `${STATE_INK[stateNorm]}18`, color: STATE_INK[stateNorm] }}>
                    {window.CHIP_STATE_LABEL[stateNorm]}
                  </span>
                  <span className="sched-state-chip"
                    style={{ background: `${MODE_INK[modeNorm]}14`, color: MODE_INK[modeNorm] }}>
                    {window.CHIP_MODE_LABEL[modeNorm]}
                  </span>
                </div>
              )}
              {(hovered || isEditing) && (
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {isEditing && onDelete && (
                    <button type="button" className="sched-remove-btn"
                      onClick={() => onDelete(card.id)}>Remove</button>
                  )}
                  <button type="button"
                    className={`sched-edit-btn${isEditing ? ' active' : ''}`}
                    onClick={isEditing ? onSave : onEdit}>
                    {isEditing ? 'Done' : 'Edit'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {gridFields.length > 0 && (
            <div className={`fgrid-d${hovered ? ' card-hov' : ''}`}>
              {gridFields.map(f => (
                <div key={f.key} className="fcell">
                  <div className="fcell-head">
                    <div className="field-label">{f.label}</div>
                    {isEditing
                      ? <button type="button" className="fcell-editbtn"
                          onClick={() => hideField(f.key)}>Hide ×</button>
                      : <button type="button" className="fcell-hide"
                          onClick={() => hideField(f.key)}>×</button>}
                  </div>
                  {renderFieldVal(f)}
                </div>
              ))}
            </div>
          )}

          {wideFields.map(f => (
            <div key={f.key} className="fwide-d">
              <div className="fcell-head">
                <div className="field-label">{f.label}</div>
                {isEditing
                  ? <button type="button" className="fcell-editbtn"
                      onClick={() => hideField(f.key)}>Hide ×</button>
                  : <button type="button" className={`fwide-hide${hovered ? ' fwide-hide-vis' : ''}`}
                      onClick={() => hideField(f.key)}>×</button>}
              </div>
              {renderFieldVal(f)}
            </div>
          ))}

          {hidFields.length > 0 && (
            <div className="hidden-tray">
              <div className="hidden-tray-label">Hidden fields</div>
              <div className="hidden-tray-btns">
                {hidFields.map(f => (
                  <button key={f.key} type="button" className="hidden-show-btn"
                    onClick={() => showField(f.key)}>+ {f.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  window.CardVariantD = CardVariantD;
})();
