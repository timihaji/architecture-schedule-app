// Phase D1b — CardVariantD. Canonical schedule row card per
// design/handoff/v2/Schedule Cards.html (variant D, "Editorial + Edit").
//
// Schedule now mirrors the Library Detail field model: card fields are derived
// from fieldsForCategory(category), with row-level and project-level hidden
// field ids applied as presentation state. State/spec-mode row orthogonals stay
// in old blobs but are no longer rendered here.

(function () {
  const { useState, useEffect } = React;

  const FIELD_SKIP = new Set(['code', 'name', 'swatch', 'image_ref', 'longText']);

  function hasValue(value) {
    if (value == null) return false;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  function fieldLabel(field) {
    if (!field) return '';
    return field.unit ? `${field.label} (${field.unit})` : field.label;
  }

  function getCategoryLabel(catId) {
    if (!catId) return 'Uncategorised';
    const cat = window.categoryDef
      ? window.categoryDef(catId)
      : ((window.schemaActive && window.schemaActive().categories) || []).find(c => c.id === catId);
    return (cat && cat.label) || catId;
  }

  // Room picker for legacy row fields. Kept available for any custom schema
  // fields that still call into the schedule row's locationId path.
  function RoomPicker({ value, options, onChange, onAddLocation }) {
    const [draft, setDraft] = useState('');
    const canCreate = !!onAddLocation;

    function commitDraft() {
      const trimmed = draft.trim();
      if (!trimmed) return;
      const lc = trimmed.toLowerCase();
      const match = options.find(o => String(o.name || '').toLowerCase() === lc);
      if (match) {
        onChange && onChange(match.id);
        setDraft('');
        return;
      }
      if (!canCreate) return;
      const newId = onAddLocation(trimmed);
      if (newId && onChange) onChange(newId);
      setDraft('');
    }

    return (
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {options.map(o => {
            const on = value === o.id;
            return (
              <button key={o.id} type="button"
                onClick={() => onChange && onChange(on ? null : o.id)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontFamily: 'var(--font-sans)',
                  border: '1px solid ' + (on ? 'var(--ink)' : 'var(--rule-2)'),
                  background: on ? 'var(--tint)' : 'var(--paper)',
                  color: on ? 'var(--ink)' : 'var(--ink-3)',
                  cursor: 'pointer',
                }}>
                {o.name}
              </button>
            );
          })}
        </div>
        {canCreate && (
          <input
            type="text"
            value={draft}
            placeholder="Add new — type and press Enter"
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitDraft(); }
              else if (e.key === 'Escape') { setDraft(''); }
            }}
            onBlur={() => { if (draft.trim()) commitDraft(); }}
            style={{
              marginTop: 6,
              padding: '4px 8px',
              fontSize: 11,
              fontFamily: 'var(--font-sans)',
              border: '1px dashed var(--rule-2)',
              background: 'transparent',
              color: 'var(--ink-3)',
              outline: 'none',
              minWidth: 180,
            }}
          />
        )}
      </div>
    );
  }

  function CardVariantD({
    card,                   // resolved schedule row projection
    elements,               // kept for compatibility with older callers
    locations = [],
    materials = [],
    globalHiddenFields = [],
    onGlobalHiddenFieldsChange,
    onAddLocation,
    onSwatchClick,
    onFieldChange,
    onHiddenFieldsChange,
    onMaterialFieldChange,
    isEditing,
    onEdit,
    onSave,
  }) {
    const [hovered, setHovered] = useState(false);
    const [itemEditorOpen, setItemEditorOpen] = useState(false);

    useEffect(() => {
      if (!isEditing) setItemEditorOpen(false);
    }, [isEditing]);

    const row = card._row || {};
    const resolvedItem = card.material || card.resolvedItem || null;
    const cat = row.category || (resolvedItem && resolvedItem.category) || card.category || null;
    const categoryLabel = getCategoryLabel(cat);
    const schemaFields = cat && window.fieldsForCategory ? window.fieldsForCategory(cat) : [];
    const candidateFields = schemaFields.filter(f => f && !f.hidden && !FIELD_SKIP.has(f.id));
    const rowHidden = card.hiddenFields || [];
    const rowHiddenSet = new Set(rowHidden);
    const globalHiddenSet = new Set(globalHiddenFields || []);
    const hiddenSet = new Set([].concat(rowHidden, globalHiddenFields || []));
    const fv = window.getFieldValue || ((x, k) => (x && x.fields && x.fields[k]) ?? (x && x[k]));

    function getFieldValue(fieldId) {
      if (resolvedItem) {
        const itemVal = fv(resolvedItem, fieldId);
        if (hasValue(itemVal)) return itemVal;
      }
      if (fieldId === 'notes') {
        const rowNote = row.note != null ? row.note : row.notes;
        if (hasValue(rowNote)) return rowNote;
      }
      return fv(row, fieldId);
    }

    const allFields = candidateFields.map(field => ({
      key: field.id,
      field,
      label: fieldLabel(field),
      value: getFieldValue(field.id),
      wide: field.type === 'longText' || field.id === 'notes',
    }));

    const visFields = isEditing
      ? allFields.filter(f => !hiddenSet.has(f.key))
      : allFields.filter(f => !hiddenSet.has(f.key) && hasValue(f.value));
    const hidFields = allFields.filter(f => hiddenSet.has(f.key));
    const gridFields = visFields.filter(f => !f.wide);
    const wideFields = visFields.filter(f => f.wide);

    const hideField = (key) => {
      if (!rowHiddenSet.has(key)) {
        onHiddenFieldsChange && onHiddenFieldsChange(Array.from(new Set(rowHidden.concat(key))));
      }
    };
    const showField = (key) => {
      if (rowHiddenSet.has(key)) {
        onHiddenFieldsChange && onHiddenFieldsChange(rowHidden.filter(k => k !== key));
      }
      if (globalHiddenSet.has(key) && onGlobalHiddenFieldsChange) {
        onGlobalHiddenFieldsChange((globalHiddenFields || []).filter(k => k !== key));
      }
    };

    function commitField(field, value) {
      if (field.id === 'locationId') {
        onFieldChange && onFieldChange('locationId', value);
        return;
      }
      if (resolvedItem && onMaterialFieldChange) {
        onMaterialFieldChange(resolvedItem.id, field.id, value);
        return;
      }
      onFieldChange && onFieldChange(field.id, value);
    }

    function renderFieldVal(f) {
      if (!isEditing && (f.key === 'notes' || f.field.type === 'longText')) {
        return hasValue(f.value)
          ? <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13,
                          color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.6 }}>
              {f.value}
            </div>
          : null;
      }
      if (isEditing && f.field.id === 'locationId') {
        return (
          <RoomPicker
            value={f.value || null}
            options={locations}
            onChange={v => commitField(f.field, v)}
            onAddLocation={onAddLocation}
          />
        );
      }
      if (window.FieldRenderer) {
        return (
          <div className="sched-field-renderer">
            <window.FieldRenderer
              field={f.field}
              value={f.value}
              mode={isEditing ? 'edit' : 'read'}
              onChange={v => commitField(f.field, v)}
              materials={materials}
              draft={resolvedItem || row}
            />
          </div>
        );
      }
      return (
        <div className="fcell-val">
          {hasValue(f.value) ? String(f.value) : '—'}
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
    const itemFields = resolvedItem && window.fieldsForCategory
      ? window.fieldsForCategory(resolvedItem.category || cat).filter(f => f && !f.hidden)
      : [];

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
                    <CodeChip
                      value={card.code}
                      editable={isEditing}
                      onCommit={(v) => onFieldChange && onFieldChange('code', v)}
                    />
                  </span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                          flexShrink: 0, paddingTop: 2 }}>
              <span className="sched-category-chip">{categoryLabel}</span>
              {(hovered || isEditing) && (
                <button type="button"
                  className={`sched-edit-btn${isEditing ? ' active' : ''}`}
                  onClick={isEditing ? onSave : onEdit}>
                  {isEditing ? 'Done' : 'Edit'}
                </button>
              )}
            </div>
          </div>

          {gridFields.length > 0 && (
            <div className={`fgrid-d${hovered ? ' card-hov' : ''}`}>
              {gridFields.map(f => (
                <div key={f.key} className="fcell">
                  <div className="fcell-head">
                    <div className="field-label">{f.label}</div>
                    {isEditing && (
                      <button type="button" className="fcell-editbtn"
                        onClick={() => hideField(f.key)}>Hide ×</button>
                    )}
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
                {isEditing && (
                  <button type="button" className="fcell-editbtn"
                    onClick={() => hideField(f.key)}>Hide ×</button>
                )}
              </div>
              {renderFieldVal(f)}
            </div>
          ))}

          {isEditing && hidFields.length > 0 && (
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

          {isEditing && row.specRef && row.specRef.id && resolvedItem && (
            <div className="sched-card-item-edit">
              <button type="button" className="sched-edit-item-btn"
                onClick={() => setItemEditorOpen(open => !open)}>
                {itemEditorOpen ? 'Close item' : 'Edit item'}
              </button>
              {itemEditorOpen && (
                <div className="sched-item-editor">
                  <div className="sched-item-editor-head">
                    <span>{resolvedItem.name || 'Library item'}</span>
                    <span>{getCategoryLabel(resolvedItem.category || cat)}</span>
                  </div>
                  <div className="sched-item-editor-grid">
                    {itemFields.map(field => {
                      const value = fv(resolvedItem, field.id);
                      return (
                        <div key={field.id}>
                          <label className="lbl-d">{fieldLabel(field)}</label>
                          {window.FieldRenderer
                            ? <window.FieldRenderer
                                field={field}
                                value={value}
                                mode="edit"
                                onChange={v => onMaterialFieldChange && onMaterialFieldChange(resolvedItem.id, field.id, v)}
                                materials={materials}
                                draft={resolvedItem}
                              />
                            : <input className="inp-d" value={value || ''}
                                onChange={e => onMaterialFieldChange && onMaterialFieldChange(resolvedItem.id, field.id, e.target.value)} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline-editable row code chip. Empty codes only surface while editing so
  // read mode stays clean.
  function CodeChip({ value, editable, onCommit }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value || '');
    useEffect(() => { setDraft(value || ''); }, [value]);
    if (editing && editable) {
      return (
        <input className="sched-card-code"
          autoFocus value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            const next = draft.trim();
            if ((next || null) !== (value || null)) onCommit && onCommit(next || null);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') e.target.blur();
            if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
          }}
          style={{
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--ink)',
            outline: 'none', padding: '0 2px', minWidth: 60, width: 90,
          }}
        />
      );
    }
    if (!value) {
      if (!editable) return null;
      return (
        <span className="sched-card-code"
          onClick={() => setEditing(true)}
          title="Click to add a code"
          style={{ cursor: 'text', opacity: 0.5, fontStyle: 'italic' }}>
          + code
        </span>
      );
    }
    return (
      <span className="sched-card-code"
        onClick={() => editable && setEditing(true)}
        title={editable ? 'Click to edit code' : undefined}
        style={{ cursor: editable ? 'text' : 'default' }}>{value}</span>
    );
  }

  window.CardVariantD = CardVariantD;
})();
