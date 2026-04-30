// Library — Register layout (Layout A from design/handoff/v2/Library.html
// lines 771–899). Editorial row list with group sections, hover-reveal
// Edit/× buttons in the actions cell, sparse column subset, and a popover
// column picker. Sits alongside Gallery / Table / Split as a fourth view.
//
// Phase 2: in-toolbar chrome moved to the shared LibraryToolbar mounted by
// Library.jsx. This file owns only the row layout, group sections, and the
// Cols popover (whose button injects into the shared toolbar's columns slot).

const REG_COL_STORAGE = 'aml-register-cols';

// Register column subset. `live` is the LIBRARY_COLUMNS id used to derive
// the sortValue at the column-picker level; cell render is inlined here so
// the look matches the mockup.
const REGISTER_COLS = [
  { id: 'check',    label: 'Select',    width: '36px',  locked: true,  defaultOn: true },
  { id: 'thumb',    label: 'Thumbnail', width: '36px',  locked: true,  defaultOn: true },
  { id: 'code',     label: 'Code',      width: '90px',  locked: true,  defaultOn: true,  align: 'center' },
  { id: 'name',     label: 'Name',      width: '1fr',   locked: true,  defaultOn: true },
  { id: 'category', label: 'Category',  width: '110px',                defaultOn: true },
  { id: 'productType', label: 'Type',   width: '120px',                defaultOn: false },
  { id: 'supplier', label: 'Supplier',  width: '140px',                defaultOn: true },
  { id: 'finish',   label: 'Finish',    width: '130px',                defaultOn: false },
  { id: 'leadTime', label: 'Lead',      width: '70px',                 defaultOn: false, align: 'right', mono: true },
  { id: 'unitCost', label: 'Price',     width: '90px',                 defaultOn: true,  align: 'right' },
  { id: 'actions',  label: '',          width: '80px',  locked: true,  defaultOn: true,  align: 'right' },
];

function loadRegisterCols() {
  try {
    const raw = localStorage.getItem(REG_COL_STORAGE);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr);
  } catch {}
  return null;
}
function saveRegisterCols(set) {
  try { localStorage.setItem(REG_COL_STORAGE, JSON.stringify(Array.from(set))); } catch {}
}

function LibraryRegister({
  materials, libraries,
  labelTemplates,
  activeLibraryId,
  onEdit, onAdd, onAddInCategory, onDelete,
  selected = new Set(),
  setSelected = () => {},
  toolbarState,
  setColumnsButton,
}) {
  const { query, sort, group, toolbarFiltered } = toolbarState;
  const [colsOpen, setColsOpen] = React.useState(false);
  const [visibleCols, setVisibleCols] = React.useState(() =>
    loadRegisterCols() || new Set(REGISTER_COLS.filter(c => c.defaultOn).map(c => c.id)));
  const colsBtnRef = React.useRef(null);

  React.useEffect(() => { saveRegisterCols(visibleCols); }, [visibleCols]);

  // Close column popover on outside click
  React.useEffect(() => {
    if (!colsOpen) return;
    function onDoc(e) {
      if (colsBtnRef.current && !colsBtnRef.current.contains(e.target)) setColsOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [colsOpen]);

  // Sort + render the toolbar-filtered rows. Lifted sort uses canonical ids.
  const filtered = React.useMemo(() => {
    const list = toolbarFiltered.slice();
    const cmp = {
      code: (a, b) => (a.code || '').localeCompare(b.code || ''),
      name: (a, b) => (a.name || '').localeCompare(b.name || ''),
      cost: (a, b) => (a.unitCost || 0) - (b.unitCost || 0),
      lead: (a, b) => (a.leadTime || '').localeCompare(b.leadTime || ''),
    }[sort] || (() => 0);
    list.sort(cmp);
    return list;
  }, [toolbarFiltered, sort]);

  // Groups
  const groups = React.useMemo(() => {
    if (!group) return [{ key: 'all', label: null, items: filtered }];
    const map = new Map();
    for (const m of filtered) {
      const k = m.category || 'Uncategorised';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(m);
    }
    return Array.from(map, ([label, items]) => ({ key: label, label, items }));
  }, [filtered, group]);

  // Selection helpers
  const visibleIds = filtered.map(m => m.id);
  const allChecked = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));
  const someChecked = visibleIds.some(id => selected.has(id));
  function toggleAll() {
    const next = new Set(selected);
    if (allChecked) {
      visibleIds.forEach(id => next.delete(id));
    } else {
      visibleIds.forEach(id => next.add(id));
    }
    setSelected(next);
  }
  function toggleOne(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function categoryAdd(category) {
    if (onAddInCategory) onAddInCategory(category);
    else if (onAdd) onAdd();
  }

  // Inject the Cols button into the shared toolbar's columns slot. Wraps the
  // popover so its position anchors off the slot button, not the row.
  React.useEffect(() => {
    if (!setColumnsButton) return;
    setColumnsButton(
      <div ref={colsBtnRef} style={{ position: 'relative' }}>
        <button type="button" className="btn-ghost"
          onClick={() => setColsOpen(o => !o)}>
          Cols ({visibleCols.size})
        </button>
        {colsOpen && (
          <div className="reg-col-popover">
            <div className="reg-col-popover-h">Columns</div>
            {REGISTER_COLS.map(c => {
              const on = visibleCols.has(c.id);
              const locked = c.locked;
              return (
                <div key={c.id}
                  className={'reg-col-popover-row' + (locked ? ' locked' : '')}
                  onClick={() => {
                    if (locked) return;
                    const next = new Set(visibleCols);
                    if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                    setVisibleCols(next);
                  }}>
                  <div className={'cb' + (on ? ' checked' : '')} style={{ pointerEvents: 'none' }}>
                    {on && <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>}
                  </div>
                  <span>{c.label || c.id}</span>
                  {locked && <span className="reg-col-popover-lock">locked</span>}
                </div>
              );
            })}
            <div className="reg-col-popover-foot">
              <button onClick={() =>
                setVisibleCols(new Set(REGISTER_COLS.filter(c => c.defaultOn).map(c => c.id)))}>
                Reset
              </button>
              <button onClick={() =>
                setVisibleCols(new Set(REGISTER_COLS.map(c => c.id)))}>
                Show all
              </button>
            </div>
          </div>
        )}
      </div>
    );
    return () => setColumnsButton(null);
  }, [colsOpen, visibleCols, setColumnsButton]);

  // Render
  const visibleColDefs = REGISTER_COLS.filter(c => visibleCols.has(c.id));
  const gridTemplate = visibleColDefs.map(c => c.width).join(' ');

  return (
    <div style={{ marginTop: 4 }}>
      {/* Header row */}
      <div className="reg-head" style={{ gridTemplateColumns: gridTemplate }}>
        {visibleColDefs.map(c => {
          if (c.id === 'check') return (
            <div key="check"
              className={'cb' + (allChecked ? ' checked' : (someChecked ? ' indeterminate' : ''))}
              onClick={toggleAll}
              title={allChecked ? 'Clear selection' : 'Select all visible'}>
              {allChecked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/></svg>}
              {someChecked && !allChecked && <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
                <line x1="1" y1="1" x2="7" y2="1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </div>
          );
          if (c.id === 'thumb' || c.id === 'actions') return <div key={c.id}></div>;
          const align = c.align === 'right' ? { textAlign: 'right' }
            : c.align === 'center' ? { textAlign: 'center' } : null;
          return <div key={c.id} className="reg-head-cell" style={align}>{c.label}</div>;
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ padding: '40px 12px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 14, color: 'var(--ink-3)', marginBottom: 12 }}>
            {query ? 'No materials match your search' : 'This library is empty'}
          </div>
          {!query && onAdd && (
            <button onClick={onAdd}
              style={{ background: 'var(--ink)', color: 'var(--paper)',
                border: 'none', padding: '7px 14px', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 10.5,
                letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              + Add the first material
            </button>
          )}
        </div>
      )}

      {/* Groups */}
      {groups.map(grp => (
        <React.Fragment key={grp.key}>
          {grp.label && groups.length > 1 && (
            <div className="reg-section">
              <span className="reg-section-title">{grp.label}</span>
              <span className="reg-section-rule"></span>
              <span className="reg-section-count">
                {grp.items.length} {grp.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}

          {grp.items.map(m => {
            const sel = selected.has(m.id);
            return (
              <div key={m.id}
                className={'reg-row' + (sel ? ' selected' : '')}
                style={{ gridTemplateColumns: gridTemplate }}
                onClick={() => toggleOne(m.id)}>
                {visibleColDefs.map(c => regCell(c, m, sel, materials, labelTemplates, toggleOne, onEdit, onDelete))}
              </div>
            );
          })}

          {group && grp.label && groups.length > 1 && (
            <div className="lib-add-row">
              <button onClick={() => categoryAdd(grp.label)}>
                + Add to {grp.label}
              </button>
            </div>
          )}
        </React.Fragment>
      ))}

      {!group && filtered.length > 0 && (
        <div className="lib-add-row">
          <button onClick={() => onAdd && onAdd()}>+ Add material</button>
        </div>
      )}
    </div>
  );
}

// Per-cell renderer kept outside component so the row map stays terse.
function regCell(c, m, sel, allMaterials, labelTemplates, toggleOne, onEdit, onDelete) {
  if (c.id === 'check') return (
    <div key="check" className={'cb' + (sel ? ' checked' : '')}
      onClick={e => { e.stopPropagation(); toggleOne(m.id); }}>
      {sel && <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
        <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
  if (c.id === 'thumb') {
    const swatch = (() => {
      if (m.category !== 'Paint' && m.swatch?.inheritTone && m.paintedWithId) {
        const linked = allMaterials.find(x => x.id === m.paintedWithId);
        if (linked) return { ...m.swatch, tone: linked.swatch?.tone };
      }
      return m.swatch;
    })();
    return (
      <div key="thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {window.Swatch ? (
          <window.Swatch swatch={swatch} size="xs"
            seed={parseInt((m.id || '').slice(2)) || 1}
            style={{ width: 32, height: 32, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 32, height: 32, background: m.swatch?.tone || 'var(--paper-2)',
            border: '1px solid var(--rule)' }}></div>
        )}
      </div>
    );
  }
  if (c.id === 'code') return (
    <div key="code" style={{ textAlign: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
        fontWeight: 500, letterSpacing: '0.04em', color: 'var(--accent-ink)' }}>
        {m.code || ''}
      </span>
    </div>
  );
  if (c.id === 'name') {
    const display = window.formatLabel ? window.formatLabel(m, labelTemplates) : (m.name || '');
    const sub = m.category === 'Paint' ? (m.brand || m.supplier) : (m.brand || '');
    return (
      <div key="name">
        <div className="reg-name">{display}</div>
        {sub && <div className="reg-brand">{sub}</div>}
      </div>
    );
  }
  if (c.id === 'category') return <div key="category" className="reg-meta">{m.category || '—'}</div>;
  if (c.id === 'productType') {
    const id = m.productType;
    let label = '—';
    if (id) {
      const tx = window.DEFAULT_TAXONOMIES?.productTypes;
      const found = tx?.find(t => t.id === id);
      label = found ? found.label.toLowerCase() : String(id).replace(/_/g, ' ');
    }
    return <div key="productType" className="reg-meta">{label}</div>;
  }
  if (c.id === 'supplier') return <div key="supplier" className="reg-meta">{m.supplier || '—'}</div>;
  if (c.id === 'finish') return <div key="finish" className="reg-meta">{m.finish || '—'}</div>;
  if (c.id === 'leadTime') return (
    <div key="leadTime" className="reg-meta"
      style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
      {m.leadTime || '—'}
    </div>
  );
  if (c.id === 'unitCost') {
    const v = m.unitCost;
    return (
      <div key="unitCost" className="reg-price">
        {v != null && v !== '' ? (window.fmtCurrency ? window.fmtCurrency(v) : v) : '—'}
        {m.unit && <span style={{ color: 'var(--ink-4)', fontSize: 9, marginLeft: 3 }}>/{m.unit}</span>}
      </div>
    );
  }
  if (c.id === 'actions') return (
    <div key="actions" className="reg-actions">
      <button className="reg-act-btn"
        onClick={e => { e.stopPropagation(); onEdit && onEdit(m); }}>Edit</button>
      <button className="reg-act-btn remove"
        onClick={e => {
          e.stopPropagation();
          if (window.confirm('Delete ' + (m.name || m.code || 'this material') + '?')) onDelete(m.id, true);
        }}>×</button>
    </div>
  );
  return <div key={c.id}></div>;
}

Object.assign(window, { LibraryRegister });
