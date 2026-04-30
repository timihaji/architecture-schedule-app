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

  // Resolve effective swatch (paintable inheritTone path)
  const effSwatch = active ? (() => {
    if (active.category !== 'Paint' && active.swatch?.inheritTone && active.paintedWithId) {
      const linked = materials.find(x => x.id === active.paintedWithId);
      if (linked) return { ...active.swatch, tone: linked.swatch?.tone };
    }
    return active.swatch;
  })() : null;

  const paintedWith = active && active.paintedWithId
    ? materials.find(x => x.id === active.paintedWithId) : null;
  const isPaint = active && active.category === 'Paint';

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
                      <div className="split-sub">{item.category || item.type}</div>
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
                    {(isPaint ? (active.brand || active.supplier) : active.supplier) || '—'}
                    {active.supplier && active.brand && active.supplier !== active.brand
                      ? ` · ${active.supplier}` : ''}
                  </div>
                </div>
              </div>

              <div className="detail-fields">
                {isPaint ? (
                  <>
                    <div><div className="detail-label">Brand</div><div className="detail-val">{active.brand || active.supplier || '—'}</div></div>
                    <div><div className="detail-label">Colour code</div><div className="detail-val mono">{active.colourCode || '—'}</div></div>
                    <div><div className="detail-label">Sheen</div><div className="detail-val">{active.sheen || '—'}</div></div>
                    <div><div className="detail-label">System</div><div className="detail-val">{active.system || '—'}</div></div>
                    <div><div className="detail-label">Coverage</div><div className="detail-val mono">{active.coveragePerL ? `${active.coveragePerL} m²/L` : '—'}</div></div>
                    <div><div className="detail-label">Lead time</div><div className="detail-val mono">{active.leadTime || '—'}</div></div>
                  </>
                ) : (
                  <>
                    <div><div className="detail-label">Type</div><div className="detail-val">{active.category || '—'}</div></div>
                    <div><div className="detail-label">Finish</div><div className="detail-val">{active.finish || '—'}</div></div>
                    <div><div className="detail-label">SKU</div><div className="detail-val mono">{active.sku || '—'}</div></div>
                    <div><div className="detail-label">Price</div><div className="detail-val mono">
                      {active.unitCost != null && window.fmtCurrency
                        ? `${window.fmtCurrency(active.unitCost)} / ${active.unit || 'unit'}`
                        : '—'}
                    </div></div>
                    <div><div className="detail-label">Supplier</div><div className="detail-val">{active.supplier || '—'}</div></div>
                    <div><div className="detail-label">Lead time</div><div className="detail-val mono">{active.leadTime || '—'}</div></div>
                  </>
                )}
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
