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

// Fields to never expose as columns (structural, tag axes, long text).
const REG_FIELD_SKIP = new Set([
  'code', 'name', 'swatch', 'image_ref', 'notes', 'libraries',
  'tags_performance', 'tags_location', 'tags_material_family',
]);
const REG_LOCKED_COLS = REGISTER_COLS.filter(c => c.locked);
const REG_DEFAULT_SUPPLEMENT = REGISTER_COLS.filter(c => !c.locked);
const REG_FIELD_TO_COL_ID = {
  unit_cost: 'unitCost',
  lead_time: 'leadTime',
};
const REG_COL_ID_TO_FIELD = {
  unitCost: 'unit_cost',
  leadTime: 'lead_time',
};
const REG_RECOMMENDED_COL_IDS = ['category', 'supplier', 'unitCost', 'leadTime', 'finish', 'productType'];
const REG_COMMON_FIELD_IDS = ['supplier', 'country_of_origin', 'unit', 'unit_cost', 'lead_time'];
const REG_OTHER_POPULATED_LIMIT = 12;
// Fields that default ON when their category is selected.
const REG_PRIORITY_DEFAULT = new Set(['supplier', 'unitCost', 'unit_cost', 'brand', 'leadTime', 'lead_time']);

function normaliseRegisterColId(id) {
  return REG_FIELD_TO_COL_ID[id] || id;
}

function normaliseRegisterColSet(ids) {
  return new Set((ids || []).map(normaliseRegisterColId).filter(Boolean));
}

function fieldIdForRegCol(col) {
  return col && (col.fieldId || REG_COL_ID_TO_FIELD[col.id] || col.id);
}

function isEligibleRegisterField(f) {
  if (!f || f.hidden) return false;
  if (REG_FIELD_SKIP.has(f.id) || f.tagAxis) return false;
  return !['longText', 'itemRef', 'swatch'].includes(f.type);
}

function regFieldLabel(f) {
  if (!f) return '';
  return f.unit ? `${f.label} (${f.unit})` : f.label;
}

function regColForField(f) {
  const id = normaliseRegisterColId(f.id);
  const staticCol = REGISTER_COLS.find(c => c.id === id);
  const numeric = f.type === 'currency' || f.type === 'number';
  return {
    ...(staticCol || {
      id,
      label: regFieldLabel(f),
      width: numeric ? '90px' : '130px',
      align: numeric ? 'right' : undefined,
      mono: numeric,
    }),
    id,
    fieldId: f.id,
    label: staticCol ? staticCol.label : regFieldLabel(f),
    defaultOn: !!(staticCol && staticCol.defaultOn) || REG_PRIORITY_DEFAULT.has(id) || REG_PRIORITY_DEFAULT.has(f.id),
    scopeLabel: f.scopeLabel,
  };
}

function dedupeRegisterCols(cols) {
  const seen = new Set();
  return (cols || []).filter(c => {
    if (!c || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function registerFieldValue(row, col) {
  const fieldId = fieldIdForRegCol(col);
  const fv = window.getFieldValue || ((m, k) => (m.fields && m.fields[k]) ?? m[k]);
  return fv(row, fieldId);
}

function buildRegisterColumnModel(filterCategory, libraryScoped) {
  const schema = window.schemaActive ? window.schemaActive() : null;
  const allFields = (schema && schema.fields) || [];
  const fieldById = new Map(allFields.map(f => [f.id, f]));
  const eligibleFieldCols = allFields
    .filter(isEligibleRegisterField)
    .map(regColForField);

  const byId = new Map();
  dedupeRegisterCols([...REG_LOCKED_COLS, ...REG_DEFAULT_SUPPLEMENT, ...eligibleFieldCols])
    .forEach(c => byId.set(c.id, c));
  const colForId = (id) => byId.get(normaliseRegisterColId(id));
  const colsForIds = (ids) => (ids || []).map(colForId).filter(Boolean);

  const sectionSeen = new Set();
  const take = (cols) => {
    const out = [];
    (cols || []).forEach(c => {
      if (!c || sectionSeen.has(c.id)) return;
      sectionSeen.add(c.id);
      out.push(c);
    });
    return out;
  };

  const sourceRows = (filterCategory && filterCategory !== 'All')
    ? (libraryScoped || []).filter(m => m.category === filterCategory)
    : (libraryScoped || []);

  const sections = [];
  sections.push({ title: 'Pinned', cols: take(REG_LOCKED_COLS) });

  const recommended = take(colsForIds(REG_RECOMMENDED_COL_IDS));
  if (recommended.length) sections.push({ title: 'Recommended', cols: recommended });

  if (filterCategory && filterCategory !== 'All' && window.fieldsForCategory) {
    const current = take(window.fieldsForCategory(filterCategory)
      .filter(isEligibleRegisterField)
      .map(regColForField)
      .filter(c => byId.has(c.id)));
    if (current.length) sections.push({ title: 'Current category fields', cols: current });
  }

  const common = take((schema?.commonFieldIds || REG_COMMON_FIELD_IDS)
    .filter(id => REG_COMMON_FIELD_IDS.includes(id))
    .map(id => fieldById.get(id))
    .filter(isEligibleRegisterField)
    .map(regColForField)
    .filter(c => byId.has(c.id)));
  if (common.length) sections.push({ title: 'Common fields', cols: common });

  const populated = eligibleFieldCols
    .map(c => {
      let filled = 0;
      (sourceRows || []).forEach(row => {
        const v = registerFieldValue(row, c);
        if (v != null && v !== '' && (!Array.isArray(v) || v.length)) filled++;
      });
      return { col: c, coverage: sourceRows.length ? filled / sourceRows.length : 0 };
    })
    .filter(x => x.coverage > 0)
    .sort((a, b) => b.coverage - a.coverage || String(a.col.label).localeCompare(String(b.col.label)))
    .map(x => x.col);
  const other = take(populated).slice(0, REG_OTHER_POPULATED_LIMIT);
  if (other.length) sections.push({ title: 'Other populated fields', cols: other });

  const suggestedIds = normaliseRegisterColSet(
    sections.flatMap(sec => sec.cols.filter(c => c.locked || c.defaultOn || sec.title === 'Recommended').map(c => c.id))
  );

  return {
    allCols: Array.from(byId.values()),
    sections,
    suggestedIds,
  };
}

function loadRegisterCols() {
  try {
    const raw = localStorage.getItem(REG_COL_STORAGE);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return normaliseRegisterColSet(arr);
  } catch {}
  return null;
}
function saveRegisterCols(set) {
  try { localStorage.setItem(REG_COL_STORAGE, JSON.stringify(Array.from(normaliseRegisterColSet(Array.from(set))))); } catch {}
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
  const { query, sort, group, groupBy, filterCategory, toolbarFiltered, libraryScoped } = toolbarState;

  const columnModel = React.useMemo(() =>
    buildRegisterColumnModel(filterCategory, libraryScoped || []),
    [filterCategory, libraryScoped]);
  const availableCols = columnModel.allCols;
  const colById = React.useMemo(() => {
    const map = new Map();
    availableCols.forEach(c => map.set(c.id, c));
    return map;
  }, [availableCols]);
  const [colsOpen, setColsOpen] = React.useState(false);
  const [colsAlignLeft, setColsAlignLeft] = React.useState(false);
  const [colSearch, setColSearch] = React.useState('');
  const [visibleCols, setVisibleCols] = React.useState(() =>
    loadRegisterCols() || normaliseRegisterColSet(REGISTER_COLS.filter(c => c.defaultOn).map(c => c.id)));
  const colsBtnRef = React.useRef(null);

  React.useEffect(() => { saveRegisterCols(visibleCols); }, [visibleCols]);

  React.useEffect(() => {
    setVisibleCols(prev => {
      const next = normaliseRegisterColSet(Array.from(prev));
      REG_LOCKED_COLS.forEach(c => next.add(c.id));
      Array.from(next).forEach(id => { if (!colById.has(id)) next.delete(id); });
      if (next.size === prev.size && Array.from(next).every(id => prev.has(id))) return prev;
      return next;
    });
  }, [colById]);

  React.useEffect(() => {
    if (!colsOpen) setColSearch('');
  }, [colsOpen]);

  React.useEffect(() => {
    if (!colsOpen) return;
    function updatePopoverAlign() {
      const rect = colsBtnRef.current && colsBtnRef.current.getBoundingClientRect();
      if (!rect) return;
      const popoverWidth = Math.min(300, window.innerWidth - 32);
      setColsAlignLeft(rect.right - popoverWidth < 16);
    }
    updatePopoverAlign();
    window.addEventListener('resize', updatePopoverAlign);
    return () => window.removeEventListener('resize', updatePopoverAlign);
  }, [colsOpen]);

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
    const fv = window.getFieldValue || ((m, k) => (m.fields && m.fields[k]) ?? m[k]);
    const cmp = {
      code: (a, b) => (a.code || '').localeCompare(b.code || ''),
      name: (a, b) => (a.name || '').localeCompare(b.name || ''),
      cost: (a, b) => (Number(fv(a, 'unit_cost')) || 0) - (Number(fv(b, 'unit_cost')) || 0),
      lead: (a, b) => (fv(a, 'lead_time') || '').localeCompare(fv(b, 'lead_time') || ''),
    }[sort] || (() => 0);
    list.sort(cmp);
    return list;
  }, [toolbarFiltered, sort]);

  // Groups
  const groups = React.useMemo(() => {
    if (!groupBy) return [{ key: 'all', label: null, items: filtered }];
    const buckets = window.bucketItems
      ? window.bucketItems(filtered, groupBy)
      : [['All', filtered]];
    return buckets.map(([label, items]) => ({ key: label, label, items }));
  }, [filtered, groupBy]);

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

  function categoryAdd(categoryId) {
    if (!categoryId) return;
    if (onAddInCategory) onAddInCategory(categoryId);
    else if (onAdd) onAdd();
  }

  const pickerSections = React.useMemo(() => {
    const isOffice = !!(window.isOfficeMode && window.isOfficeMode(window.appState?.settings?.dupePolicy));
    const filterCode = cols => isOffice ? cols : cols.filter(c => c.id !== 'code');
    const q = colSearch.trim().toLowerCase();
    if (!q) return columnModel.sections.map(sec => ({ ...sec, cols: filterCode(sec.cols) }));
    const matches = filterCode(availableCols).filter(c => {
      const hay = [
        c.label, c.id, c.fieldId, c.scopeLabel,
        fieldIdForRegCol(c),
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
    return [{ title: 'Search results', cols: matches }];
  }, [colSearch, columnModel.sections, availableCols]);

  function setSuggestedCols() {
    setVisibleCols(new Set(columnModel.suggestedIds));
  }

  function setDefaultCols() {
    setVisibleCols(normaliseRegisterColSet(REGISTER_COLS.filter(c => c.defaultOn).map(c => c.id)));
  }

  function toggleColumn(c) {
    if (!c || c.locked) return;
    const next = new Set(visibleCols);
    if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
    REG_LOCKED_COLS.forEach(col => next.add(col.id));
    setVisibleCols(next);
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
          <div className={'reg-col-popover' + (colsAlignLeft ? ' is-left' : '')}>
            <div className="reg-col-popover-h">Columns</div>
            <input
              className="reg-col-popover-search"
              type="text"
              placeholder="Find a column..."
              value={colSearch}
              onChange={e => setColSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setColsOpen(false); }}
              autoFocus
            />
            <div className="reg-col-popover-list">
              {pickerSections.every(sec => !sec.cols.length) && (
                <div className="reg-col-popover-empty">No matching columns</div>
              )}
              {pickerSections.map(sec => sec.cols.length > 0 && (
                <div className="reg-col-popover-section" key={sec.title}>
                  <div className="reg-col-popover-section-h">{sec.title}</div>
                  {sec.cols.map(c => {
                    const on = visibleCols.has(c.id);
                    const locked = c.locked;
                    return (
                      <div key={c.id}
                        className={'reg-col-popover-row' + (locked ? ' locked' : '')}
                        onClick={() => toggleColumn(c)}>
                        <div className={'cb' + (on ? ' checked' : '')} style={{ pointerEvents: 'none' }}>
                          {on && <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5"
                              strokeLinecap="round" strokeLinejoin="round" />
                          </svg>}
                        </div>
                        <span className="reg-col-popover-label">{c.label || (c.id === 'actions' ? 'Actions' : c.id)}</span>
                        {c.scopeLabel && <span className="reg-col-popover-scope">{c.scopeLabel}</span>}
                        {locked && <span className="reg-col-popover-lock">locked</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="reg-col-popover-foot">
              <button onClick={setDefaultCols}>
                Reset
              </button>
              <button onClick={setSuggestedCols}>
                Show suggested
              </button>
            </div>
          </div>
        )}
      </div>
    );
    return () => setColumnsButton(null);
  }, [colsOpen, colsAlignLeft, visibleCols, colSearch, pickerSections, columnModel.suggestedIds, setColumnsButton]);

  // Render
  const officeMode = !!(window.isOfficeMode && window.isOfficeMode(window.appState?.settings?.dupePolicy));
  const visibleColDefs = availableCols.filter(c => visibleCols.has(c.id) && (c.id !== 'code' || officeMode));
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
      {groups.map(grp => {
        const addCategoryId = groupBy === '_category'
          ? (grp.items.find(m => m && m.category && window.categoryDef && window.categoryDef(m.category))?.category || null)
          : null;
        return (
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

            {group && grp.label && groups.length > 1 && addCategoryId && (
              <div className="lib-add-row">
                <button onClick={() => categoryAdd(addCategoryId)}>
                  + Add to {grp.label}
                </button>
              </div>
            )}
          </React.Fragment>
        );
      })}

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
      const paintedWithId = window.getFieldValue ? window.getFieldValue(m, 'paintedWith') : m.paintedWithId;
      if (m.swatch?.inheritTone && paintedWithId) {
        const linked = allMaterials.find(x => x.id === paintedWithId);
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
    // Sub-line: brand (if set) else supplier — category-agnostic.
    const brand = window.getFieldValue ? window.getFieldValue(m, 'brand') : m.brand;
    const supplier = window.getFieldValue ? window.getFieldValue(m, 'supplier') : m.supplier;
    const sub = brand || supplier || '';
    return (
      <div key="name">
        <div className="reg-name">{display}</div>
        {sub && <div className="reg-brand">{sub}</div>}
      </div>
    );
  }
  if (c.id === 'category') {
    const def = m.category && window.categoryDef && window.categoryDef(m.category);
    return <div key="category" className="reg-meta">{(def && def.label) || m.category || '—'}</div>;
  }
  if (c.id === 'productType') {
    const def = m.category && window.categoryDef && window.categoryDef(m.category);
    const grp = def && window.groupDef && window.groupDef(def.groupId);
    return <div key="productType" className="reg-meta">{(grp && grp.label.toLowerCase()) || '—'}</div>;
  }
  if (c.id === 'supplier') {
    const v = window.getFieldValue ? window.getFieldValue(m, 'supplier') : m.supplier;
    return <div key="supplier" className="reg-meta">{v || '—'}</div>;
  }
  if (c.id === 'finish') {
    const v = window.getFieldValue ? window.getFieldValue(m, 'finish') : m.finish;
    return <div key="finish" className="reg-meta">{v || '—'}</div>;
  }
  if (c.id === 'leadTime') {
    const v = window.getFieldValue ? window.getFieldValue(m, 'lead_time') : m.leadTime;
    return (
      <div key="leadTime" className="reg-meta"
        style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
        {v || '—'}
      </div>
    );
  }
  if (c.id === 'unitCost') {
    const v = window.getFieldValue ? window.getFieldValue(m, 'unit_cost') : m.unitCost;
    const unit = (window.getFieldValue && window.getFieldValue(m, 'unit')) || m.unit;
    return (
      <div key="unitCost" className="reg-price">
        {v != null && v !== '' ? (window.fmtCurrency ? window.fmtCurrency(v) : v) : '—'}
        {unit && <span style={{ color: 'var(--ink-4)', fontSize: 9, marginLeft: 3 }}>/{unit}</span>}
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
  // Schema-field fallback: any col not handled above is a v5 field id.
  const _fv = window.getFieldValue || ((x, k) => (x.fields && x.fields[k]) ?? x[k]);
  const _v = _fv(m, fieldIdForRegCol(c));
  return (
    <div key={c.id} className={'reg-meta' + (c.mono ? ' reg-meta-mono' : '')}
      style={c.align === 'right' ? { textAlign: 'right' } : {}}>
      {(_v != null && _v !== '') ? String(_v) : '—'}
    </div>
  );
}

Object.assign(window, { LibraryRegister });
