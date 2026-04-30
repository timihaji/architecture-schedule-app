// Library — Layout C (Split / Detail). Phase B6 design integration.
// 340px left list + right detail panel. Click an item to view its detail;
// "Edit" opens the standalone material drawer. Active item accent: terracotta
// for products (sage reserved for v2 types behind window.SHOW_TYPES).

function LibraryLayoutC({
  materials, libraries,
  labelTemplates,
  activeLibraryId,
  onEdit, onAdd, onDelete,
  selected, setSelected,
  toolbarState,
}) {
  const { query, sort, group, toolbarFiltered } = toolbarState;
  const [activeId, setActiveId] = React.useState(null);

  // Sort the toolbar-filtered list with the canonical sort axis.
  const filtered = React.useMemo(() => {
    const list = toolbarFiltered.slice();
    list.sort((a, b) => {
      if (sort === 'code') return (a.code || '').localeCompare(b.code || '');
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'cost') return (a.unitCost || 0) - (b.unitCost || 0);
      if (sort === 'lead') return (a.leadTime || '').localeCompare(b.leadTime || '');
      return 0;
    });
    return list;
  }, [toolbarFiltered, sort]);

  const groups = React.useMemo(() => {
    if (!group) return [{ key: 'all', items: filtered }];
    const map = new Map();
    filtered.forEach(m => {
      const key = m.category || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    });
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [filtered, group]);

  // Keep activeId valid when filter set changes; default to first item.
  React.useEffect(() => {
    if (filtered.length === 0) { setActiveId(null); return; }
    if (!filtered.find(m => m.id === activeId)) {
      setActiveId(filtered[0].id);
    }
  }, [filtered, activeId]);

  const active = activeId ? filtered.find(m => m.id === activeId) : null;

  const selectItem = (id) => { setActiveId(id); };
  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleRemove = () => {
    if (!active) return;
    if (!window.confirm('Delete ' + (active.name || active.code || 'this material') + '?')) return;
    const idx = filtered.findIndex(m => m.id === active.id);
    const next = filtered[idx + 1] || filtered[idx - 1] || null;
    onDelete(active.id, true);
    setActiveId(next ? next.id : null);
  };

  // Resolve the active item's v5 category id (may be legacy on un-migrated items).
  const activeCatId = active
    ? ((active.category && window.categoryDef && window.categoryDef(active.category))
        ? active.category
        : (window.legacyCategoryFor ? window.legacyCategoryFor(active) : 'other'))
    : null;
  const isPaint = activeCatId === 'paint';
  const paintedWithId = active
    ? (window.getFieldValue ? window.getFieldValue(active, 'paintedWith') : active.paintedWithId)
    : null;
  const paintedWith = paintedWithId ? materials.find(x => x.id === paintedWithId) : null;

  // Resolve effective swatch (paintable inheritTone path)
  const effSwatch = active ? (() => {
    if (!isPaint && active.swatch?.inheritTone && paintedWith) {
      return { ...active.swatch, tone: paintedWith.swatch?.tone };
    }
    return active.swatch;
  })() : null;

  // Pick a small set of detail fields (similar to side panel / gallery detail).
  const allDetailFields = active && window.fieldsForCategory
    ? window.fieldsForCategory(activeCatId) : [];
  const SKIP_DETAIL = new Set(['code', 'name', 'swatch', 'image_ref', 'notes',
    'tags_performance', 'tags_location', 'tags_material_family', 'libraries']);
  const detailFields = allDetailFields.filter(f =>
    !SKIP_DETAIL.has(f.id) && !f.tagAxis && f.type !== 'longText' && f.type !== 'itemRef'
  ).slice(0, 6);

  return (
    <div style={{ minWidth: 0 }}>
      <div className="split">
        {/* Left list */}
        <div className="split-list">
          {groups.map(g => (
            <React.Fragment key={g.key}>
              {groups.length > 1 && (
                <div className="split-group-label">{g.key}</div>
              )}
              {g.items.map(item => {
                const isAct = item.id === activeId;
                const isSel = selected.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`split-item${isAct ? ' active p' : ''}`}
                    onClick={() => selectItem(item.id)}
                  >
                    <div
                      className={`split-cb${isSel ? ' checked' : ''}`}
                      style={{ opacity: isSel ? 1 : 0.35 }}
                      onClick={e => { e.stopPropagation(); toggleSelect(item.id); }}
                    >
                      {isSel && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="split-thumb">
                      <window.Swatch
                        swatch={item.swatch}
                        size="sm"
                        seed={parseInt((item.id || '').slice(2)) || 1}
                        glyph={item.kind && item.kind !== 'material' && window.subtypeGlyph
                          ? window.subtypeGlyph(item.kind, item.subtype) : null}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <window.CodeChip>{item.code}</window.CodeChip>
                        <span
                          className="split-name"
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                        >
                          {item.name}
                        </span>
                      </div>
                      <div className="split-sub">{(() => {
                        const id = (item.category && window.categoryDef && window.categoryDef(item.category))
                          ? item.category
                          : (window.legacyCategoryFor && window.legacyCategoryFor(item));
                        const def = id && window.categoryDef && window.categoryDef(id);
                        return (def && def.label) || item.category || item.type || '';
                      })()}</div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <span style={{ ...window.ui.mono, fontSize: 11, color: 'var(--ink-4)' }}>
                {query ? 'No matches' : 'Library is empty'}
              </span>
            </div>
          )}
        </div>

        {/* Right detail */}
        <div className="split-detail">
          {!active ? (
            <div className="split-detail-empty">
              <p>Select an item to see details.</p>
              <span className="hint">{filtered.length} item{filtered.length === 1 ? '' : 's'} in list</span>
            </div>
          ) : (
            <>
              <div className="detail-swatch">
                <window.Swatch
                  swatch={effSwatch}
                  size="xl"
                  seed={parseInt((active.id || '').slice(2)) || 1}
                  glyph={active.kind && active.kind !== 'material' && window.subtypeGlyph
                    ? window.subtypeGlyph(active.kind, active.subtype) : null}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <h2 className="detail-title">
                    <span style={{ marginRight: 10, display: 'inline-block' }}>
                      <window.CodeChip size="gallery">{active.code}</window.CodeChip>
                    </span>
                    {active.name}
                  </h2>
                  <div className="detail-brand">
                    {(() => {
                      const brand = window.getFieldValue ? window.getFieldValue(active, 'brand') : active.brand;
                      const supplier = window.getFieldValue ? window.getFieldValue(active, 'supplier') : active.supplier;
                      const primary = brand || supplier || '—';
                      const secondary = (supplier && brand && supplier !== brand) ? ` · ${supplier}` : '';
                      return primary + secondary;
                    })()}
                  </div>
                </div>
              </div>

              <div className="detail-fields">
                {detailFields.map(f => {
                  const v = window.getFieldValue ? window.getFieldValue(active, f.id) : active[f.id];
                  return (
                    <div key={f.id}>
                      <div className="detail-label">{f.unit ? `${f.label} (${f.unit})` : f.label}</div>
                      <div className={'detail-val' + (f.type === 'number' || f.type === 'currency' ? ' mono' : '')}>
                        {window.FieldRenderer
                          ? <window.FieldRenderer field={f} value={v} mode="read" onChange={() => {}} materials={materials} />
                          : (v || '—')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isPaint && active.paintable && (
                <div style={{
                  marginTop: 14, padding: '12px 14px',
                  background: 'var(--paper-2)', borderLeft: '2px solid var(--accent)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ ...window.ui.label }}>Painted with</span>
                  {paintedWith ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 22, height: 22, flexShrink: 0,
                        background: paintedWith.swatch?.tone || '#ddd',
                        outline: '1px solid rgba(20,20,20,0.15)',
                      }} />
                      <span style={{ ...window.ui.mono, fontSize: 10, color: 'var(--ink-4)' }}>{paintedWith.code}</span>
                      <span style={{ ...window.ui.serif, fontSize: 13 }}>
                        {paintedWith.brand} {paintedWith.colourName}
                      </span>
                    </span>
                  ) : (
                    <span style={{ ...window.ui.mono, fontSize: 11, color: 'var(--ink-4)' }}>
                      Paintable — finish unspecified
                    </span>
                  )}
                </div>
              )}

              <div className="detail-actions">
                <button
                  type="button"
                  onClick={() => onEdit && onEdit(active)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--rule-2)',
                    padding: '5px 12px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                    fontWeight: 500,
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  style={{
                    marginLeft: 'auto',
                    background: 'transparent',
                    border: '1px solid rgba(160,69,69,0.3)',
                    padding: '5px 12px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#a04545',
                    fontWeight: 500,
                  }}
                >
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LibraryLayoutC });
