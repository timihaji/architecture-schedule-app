// DataTable — generic table mechanics shared by Library, Cost Schedule, and Spec.
//
// This file owns: column show/hide/reorder/resize (persisted), keyboard nav
// (j/k/o/e/x/g/G/Esc/? / ⌘K / ⌘A), shift-range selection, sort direction,
// sticky header, inline edit state, and the sticky filtered/sorted pipeline.
//
// It does NOT own: topbar, filters bar, kind tabs, bulk bar, side panel.
// Those are slot children provided by the host. The host also provides the
// column catalogue (with per-column render fns) and the rows.
//
// Column shape:
//   {
//     id:          'supplier',                    // unique + used as storage key
//     label:       'Supplier',
//     width:       140,
//     minWidth:    90,
//     align:       'left' | 'right' | 'center',
//     mono:        true,     // font hint for default cell
//     serif:       true,     // font hint for default cell
//     fixed:       true,     // not resizable (select / swatch)
//     sortable:    true,     // default true unless 'select' | 'swatch'
//     editable:    true,     // enables the generic inline-edit path
//     get:         (r) => ...,             // value used for sort/filter/edit
//     searchText:  (r) => '...',           // concat for full-text query
//     sortValue:   (r) => ...,             // optional: override get() for sort
//     render:      (r, ctx) => ReactNode,  // optional: custom cell
//   }
//
// Host wires rendering via a `renderCell(col, row, ctx)` prop (Pass A —
// lets existing callers keep their switch statement). Pass B will migrate
// switches into per-column .render fns.

const DT_DENSITY_ROW_H = { compact: 26, regular: 32, comfortable: 40 };

function loadDtColPref(storageKey, defaultVisible, defaultOrder) {
  let pref;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) pref = JSON.parse(raw);
  } catch {}
  if (!pref) {
    pref = {
      visible: defaultVisible.slice(),
      order: defaultOrder.slice(),
      widths: {},
    };
  }
  const existing = new Set(pref.order || []);
  const missing = defaultOrder.filter(id => !existing.has(id));
  if (missing.length) pref.order = [...(pref.order || []), ...missing];
  pref.visible = pref.visible || defaultVisible.slice();
  pref.widths  = pref.widths  || {};
  return pref;
}
function saveDtColPref(storageKey, pref) {
  try { localStorage.setItem(storageKey, JSON.stringify(pref)); } catch {}
}

function DataTable({
  rows,
  getRowId = (r) => r.id,

  columns,
  colStorageKey,
  defaultVisible,
  defaultOrder,

  // Controlled state — hosts own it so topbar/search/filters live alongside
  query = '',
  filters = [],
  sort, setSort,
  selected, setSelected,
  cursorId, setCursorId,
  openId, setOpenId,
  editingCell, setEditingCell,

  density = 'regular',

  // Row-level callbacks
  onSaveCell,
  onOpenRow,
  onEditRow,
  onAdd,
  onDeleteRow,

  // Filter matcher (per-row). Defaults to stringly-match.
  matchFilter,
  searchRef,

  // Extra ctx merged into the per-cell render args (libraries/allMaterials/etc)
  cellContext,

  // Receives the live colPref + setter so hosts can wire column pickers
  colPrefRef,

  // Grouping — optional. groupBy(row) → string key; groupSubtotal(rows) → string | null
  groupBy,
  groupSubtotal,

  // Slots
  topBar,
  kindTabs,
  filtersBar,
  bulkBar,
  sidePanel,

  // Layout
  containerStyle,
  sidebarSlot,      // rendered in left column; width set by sidebarWidth
  sidebarWidth = 180,
  rightPanelWidth = 440,
  minHeight = 600,
}) {
  // ───── column preferences
  const [colPref, setColPrefState] = React.useState(
    () => loadDtColPref(colStorageKey, defaultVisible, defaultOrder)
  );
  function setColPref(updater) {
    setColPrefState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveDtColPref(colStorageKey, next);
      return next;
    });
  }

  const rowH = DT_DENSITY_ROW_H[density] || DT_DENSITY_ROW_H.regular;

  // ───── filter + sort pipeline
  const filtered = React.useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    let list = rows.slice();
    if (q) {
      list = list.filter(r => {
        // Concatenate searchText from any column that declares it, plus a few
        // sensible defaults.
        const parts = [];
        columns.forEach(c => {
          if (c.searchText) parts.push(c.searchText(r) || '');
        });
        return parts.join(' ').toLowerCase().includes(q);
      });
    }
    for (const f of filters) {
      const fn = matchFilter || defaultMatchFilter;
      list = list.filter(r => fn(r, f));
    }
    if (sort?.id) {
      const col = columns.find(c => c.id === sort.id);
      const dir = sort.dir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const va = sortVal(a, col);
        const vb = sortVal(b, col);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    return list;
  }, [rows, query, filters, sort, columns, matchFilter]);

  // Keep cursor on-screen
  React.useEffect(() => {
    if (!filtered.length) { setCursorId && setCursorId(null); return; }
    if (!cursorId || !filtered.find(r => getRowId(r) === cursorId)) {
      setCursorId && setCursorId(getRowId(filtered[0]));
    }
  }, [filtered, cursorId]);

  // ───── selection
  const lastClickedRef = React.useRef(null);
  function toggleSelect(id) {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    lastClickedRef.current = id;
  }
  function selectRange(toId) {
    const from = lastClickedRef.current;
    if (!from) { toggleSelect(toId); return; }
    const ids = filtered.map(getRowId);
    const a = ids.indexOf(from);
    const b = ids.indexOf(toId);
    if (a < 0 || b < 0) { toggleSelect(toId); return; }
    const [lo, hi] = a < b ? [a, b] : [b, a];
    setSelected(s => {
      const next = new Set(s);
      for (let i = lo; i <= hi; i++) next.add(ids[i]);
      return next;
    });
  }
  function clearSelection() { setSelected(new Set()); }
  function selectAll() { setSelected(new Set(filtered.map(getRowId))); }

  // ───── keyboard
  React.useEffect(() => {
    function onKey(e) {
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (e.key === 'Escape') {
        if (editingCell) { setEditingCell(null); return; }
        if (openId) { setOpenId && setOpenId(null); return; }
        if (selected && selected.size) { clearSelection(); return; }
        return;
      }
      if (inInput) return;

      const ids = filtered.map(getRowId);
      const curIdx = cursorId ? ids.indexOf(cursorId) : -1;
      const move = (delta) => {
        if (!ids.length) return;
        const i = curIdx < 0 ? 0 : Math.max(0, Math.min(ids.length - 1, curIdx + delta));
        setCursorId && setCursorId(ids[i]);
        setTimeout(() => {
          const el = document.querySelector(`[data-row-id="${ids[i]}"]`);
          if (el) el.scrollIntoView({ block: 'nearest' });
        }, 0);
      };

      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'g') { e.preventDefault(); if (ids.length) setCursorId && setCursorId(ids[0]); }
      else if (e.key === 'G') { e.preventDefault(); if (ids.length) setCursorId && setCursorId(ids[ids.length - 1]); }
      else if (e.key === 'o' || e.key === 'Enter') {
        e.preventDefault();
        if (cursorId && onOpenRow) onOpenRow(cursorId);
      }
      else if (e.key === 'e') {
        e.preventDefault();
        if (cursorId && onEditRow) onEditRow(cursorId);
      }
      else if (e.key === 'x' || e.key === ' ') {
        e.preventDefault();
        if (cursorId) {
          if (e.shiftKey) selectRange(cursorId);
          else toggleSelect(cursorId);
        }
      }
      else if (e.key === '/') {
        e.preventDefault();
        searchRef?.current?.focus();
        searchRef?.current?.select();
      }
      else if (e.key === 'c') {
        if (onAdd) { e.preventDefault(); onAdd(); }
      }
      else if (e.key === 'd' || e.key === 'Delete') {
        if (onDeleteRow && cursorId) { e.preventDefault(); onDeleteRow(cursorId); }
      }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault(); selectAll();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, cursorId, openId, selected, editingCell, onDeleteRow, onEditRow, onOpenRow, onAdd]);

  // ───── visible cols
  const visibleCols = colPref.order
    .filter(id => colPref.visible.includes(id))
    .map(id => columns.find(c => c.id === id))
    .filter(Boolean);
  const colWidth = (c) => colPref.widths[c.id] || c.width;
  const gridTemplate = visibleCols.map(c => colWidth(c) + 'px').join(' ') + ' 1fr';

  // Expose colPref to host (column picker, etc.)
  React.useEffect(() => {
    if (colPrefRef) colPrefRef.current = { colPref, setColPref };
  }, [colPref]);

  // Build context passed to per-column renderers
  const cellCtx = {
    colPref, setColPref,
    editingCell, setEditingCell,
    onSaveCell,
    selected, toggleSelect,
    sort, setSort,
    ...(cellContext || {}),
  };

  // ───── render
  const hasSidebar = !!sidebarSlot;
  const rightOpen = !!(openId && sidePanel);
  const gridCols = [
    hasSidebar ? sidebarWidth + 'px' : null,
    '1fr',
    rightOpen ? rightPanelWidth + 'px' : null,
  ].filter(Boolean).join(' ');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridCols,
      height: 'calc(100vh - 48px - 48px)',
      minHeight,
      background: 'var(--paper)',
      borderTop: '1px solid var(--rule)',
      overflow: 'hidden',
      ...containerStyle,
    }}>
      {hasSidebar && sidebarSlot}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {topBar}
        {kindTabs}
        {filtersBar}
        <DtTable
          rows={filtered}
          getRowId={getRowId}
          visibleCols={visibleCols}
          gridTemplate={gridTemplate}
          rowH={rowH}
          colPref={colPref}
          setColPref={setColPref}
          sort={sort}
          setSort={setSort}
          selected={selected}
          toggleSelect={toggleSelect}
          selectRange={selectRange}
          cursorId={cursorId}
          setCursorId={setCursorId}
          openId={openId}
          setOpenId={setOpenId}
          editingCell={editingCell}
          setEditingCell={setEditingCell}
          onSaveCell={onSaveCell}
          cellCtx={cellCtx}
          groupBy={groupBy}
          groupSubtotal={groupSubtotal}
        />
        {selected && selected.size > 0 && bulkBar}
      </div>
      {rightOpen && sidePanel}
    </div>
  );
}

// ───────── Table body ─────────

function DtTable({ rows, getRowId, visibleCols, gridTemplate, rowH,
  colPref, setColPref, sort, setSort,
  selected, toggleSelect, selectRange,
  cursorId, setCursorId, openId, setOpenId,
  editingCell, setEditingCell, onSaveCell, cellCtx,
  groupBy, groupSubtotal }) {

  const [collapsed, setCollapsed] = React.useState(new Set());

  function toggleGroup(key) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Build groups if groupBy is provided; otherwise treat as a single ungrouped list
  const groups = React.useMemo(() => {
    if (!groupBy) return null;
    const map = new Map();
    rows.forEach(r => {
      const key = groupBy(r) || 'Uncategorised';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return Array.from(map.entries()).map(([key, groupRows]) => ({ key, rows: groupRows }));
  }, [rows, groupBy]);

  function renderRow(r) {
    const id = getRowId(r);
    return (
      <DtRow
        key={id}
        row={r} rowId={id}
        visibleCols={visibleCols}
        gridTemplate={gridTemplate}
        rowH={rowH}
        isCursor={id === cursorId}
        isSelected={selected && selected.has(id)}
        isOpen={id === openId}
        onRowClick={(e) => {
          if (e.shiftKey) { selectRange(id); return; }
          if (e.metaKey || e.ctrlKey) { toggleSelect(id); setCursorId && setCursorId(id); return; }
          setCursorId && setCursorId(id);
          setOpenId && setOpenId(id);
        }}
        onToggleSelect={(e) => {
          if (e && e.shiftKey) selectRange(id);
          else toggleSelect(id);
        }}
        cellCtx={cellCtx}
      />
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'var(--paper)' }}>
      <DtHeader
        visibleCols={visibleCols}
        gridTemplate={gridTemplate}
        sort={sort} setSort={setSort}
        rowH={rowH}
        colPref={colPref} setColPref={setColPref}
        allSelected={rows.length > 0 && selected && selected.size === rows.length}
        anySelected={selected && selected.size > 0}
        onToggleAll={() => {
          if (!selected) return;
          if (selected.size === rows.length) {
            rows.forEach(r => { if (selected.has(getRowId(r))) toggleSelect(getRowId(r)); });
          } else {
            rows.forEach(r => { if (!selected.has(getRowId(r))) toggleSelect(getRowId(r)); });
          }
        }}
      />
      {groups ? (
        groups.map(({ key, rows: groupRows }) => {
          const isCollapsed = collapsed.has(key);
          const subtotal = groupSubtotal ? groupSubtotal(groupRows) : null;
          return (
            <div key={key}>
              <DtGroupHeader
                label={key}
                count={groupRows.length}
                subtotal={subtotal}
                collapsed={isCollapsed}
                onToggle={() => toggleGroup(key)}
              />
              {!isCollapsed && groupRows.map(renderRow)}
            </div>
          );
        })
      ) : (
        <div>
          {rows.map(renderRow)}
          {rows.length === 0 && (
            <div style={{ padding: '80px 20px', textAlign: 'center' }}>
              <Serif size={16} color="var(--ink-3)">No rows match</Serif>
            </div>
          )}
        </div>
      )}
      {groups && groups.every(g => g.rows.length === 0) && (
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <Serif size={16} color="var(--ink-3)">No rows match</Serif>
        </div>
      )}
    </div>
  );
}

function DtGroupHeader({ label, count, subtotal, collapsed, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 14px',
        height: 30,
        background: 'var(--paper-2)',
        borderBottom: '1px solid var(--rule)',
        borderTop: '1px solid var(--rule)',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'sticky', top: 36, zIndex: 1,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--paper-2)'}
    >
      <span style={{
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 9, color: 'var(--ink-4)',
        transition: 'transform 0.1s',
        display: 'inline-block',
        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
      }}>▾</span>
      <span style={{
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
        color: 'var(--ink-2)', flex: 1,
      }}>{label}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--ink-4)',
      }}>{count} {count === 1 ? 'row' : 'rows'}{subtotal ? ' · ' + subtotal : ''}</span>
    </div>
  );
}

// ───────── Header ─────────

function DtHeader({ visibleCols, gridTemplate, sort, setSort, rowH, colPref, setColPref,
  allSelected, anySelected, onToggleAll }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridTemplate,
      position: 'sticky', top: 0, zIndex: 2,
      background: 'var(--paper-2)',
      borderBottom: '1px solid var(--rule)',
      height: rowH + 4,
      alignItems: 'stretch',
    }}>
      {visibleCols.map((col, idx) => {
        const isSort = sort?.id === col.id;
        const sortable = col.sortable !== false
          && !['select', 'swatch'].includes(col.id);
        return (
          <div key={col.id}
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center',
              justifyContent: col.align === 'right' ? 'flex-end'
                : col.align === 'center' ? 'center' : 'flex-start',
              padding: col.id === 'select' ? '0' : '0 8px',
              borderRight: idx < visibleCols.length - 1 ? '1px solid var(--rule)' : 'none',
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: isSort ? 'var(--ink)' : 'var(--ink-4)',
              fontWeight: 500,
              cursor: sortable ? 'pointer' : 'default',
              userSelect: 'none',
            }}
            onClick={() => {
              if (!sortable) return;
              if (isSort) setSort(s => ({ id: s.id, dir: s.dir === 'asc' ? 'desc' : 'asc' }));
              else setSort({ id: col.id, dir: 'asc' });
            }}>
            {col.id === 'select' ? (
              <DtCheckbox checked={allSelected} indeterminate={anySelected && !allSelected}
                onChange={onToggleAll} />
            ) : (
              <>
                <span>{col.label}</span>
                {isSort && <span style={{ marginLeft: 4, fontSize: 9 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>}
              </>
            )}
            {!col.fixed && idx < visibleCols.length - 1 && (
              <DtResizeHandle col={col} setColPref={setColPref} />
            )}
          </div>
        );
      })}
      <div />
    </div>
  );
}

function DtResizeHandle({ col, setColPref }) {
  const startX = React.useRef(0);
  const startW = React.useRef(0);
  function onDown(e) {
    e.stopPropagation(); e.preventDefault();
    startX.current = e.clientX;
    startW.current = col.width;
    const onMove = (ev) => {
      const dx = ev.clientX - startX.current;
      const nw = Math.max(col.minWidth || 40, startW.current + dx);
      setColPref(prev => ({ ...prev, widths: { ...prev.widths, [col.id]: nw } }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
  return (
    <div onMouseDown={onDown}
      style={{
        position: 'absolute', top: 0, right: -3, bottom: 0, width: 6,
        cursor: 'col-resize', zIndex: 3,
      }} />
  );
}

function DtCheckbox({ checked, indeterminate, onChange }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={!!checked}
      onChange={e => { e.stopPropagation(); onChange(e); }}
      onClick={e => e.stopPropagation()}
      style={{
        width: 12, height: 12, margin: 0, cursor: 'pointer',
        accentColor: 'var(--ink)',
      }} />
  );
}

// ───────── Row ─────────

function DtRow({ row, rowId, visibleCols, gridTemplate, rowH,
  isCursor, isSelected, isOpen, onRowClick, onToggleSelect, cellCtx }) {
  const [hov, setHov] = React.useState(false);
  const bg = isOpen ? 'var(--tint-strong)'
    : isSelected ? 'rgba(var(--accent-rgb, 180, 90, 40), 0.08)'
    : hov ? 'var(--tint)'
    : 'transparent';
  return (
    <div
      data-row-id={rowId}
      onClick={onRowClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        height: rowH,
        alignItems: 'center',
        borderBottom: '1px solid var(--rule)',
        background: bg,
        cursor: 'pointer',
        position: 'relative',
        borderLeft: '2px solid ' + (isCursor ? 'var(--accent)' : 'transparent'),
        transition: 'background 0.06s',
      }}>
      {visibleCols.map((col, idx) => (
        <DtCell
          key={col.id}
          col={col}
          row={row}
          rowId={rowId}
          rowH={rowH}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          editing={cellCtx.editingCell?.id === rowId && cellCtx.editingCell?.field === col.id}
          setEditing={(v) => cellCtx.setEditingCell(v ? { id: rowId, field: col.id } : null)}
          onSave={(value) => { cellCtx.onSaveCell && cellCtx.onSaveCell(rowId, col.id, value); cellCtx.setEditingCell(null); }}
          borderRight={idx < visibleCols.length - 1}
          ctx={cellCtx}
        />
      ))}
    </div>
  );
}

// ───────── Cell ─────────
//
// Each column can supply a `render(row, ctx)` fn. If it does, we render that
// inside the standard cell frame (padding, border, alignment). If it doesn't,
// we fall back to `col.get(row)` or `row[col.id]` with generic inline-edit
// support when `col.editable` is true.

function DtCell({ col, row, rowId, rowH, isSelected, onToggleSelect,
  editing, setEditing, onSave, borderRight, ctx }) {
  const alignStyle = {
    justifyContent: col.align === 'right' ? 'flex-end'
      : col.align === 'center' ? 'center' : 'flex-start',
  };
  const baseStyle = {
    display: 'flex', alignItems: 'center',
    padding: col.id === 'select' ? '0' : '0 8px',
    borderRight: borderRight ? '1px solid var(--rule)' : 'none',
    minWidth: 0, height: '100%',
    fontSize: 11.5,
    fontFamily: col.mono ? "'JetBrains Mono', monospace"
      : col.serif ? "'Newsreader', serif"
      : "'Inter Tight', sans-serif",
    color: 'var(--ink)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    ...alignStyle,
  };

  // Built-ins that every table shares
  if (col.id === 'select') {
    return (
      <div style={{ ...baseStyle, justifyContent: 'center' }}>
        <DtCheckbox checked={isSelected} onChange={onToggleSelect} />
      </div>
    );
  }

  // Custom render override
  if (typeof col.render === 'function') {
    const rendered = col.render(row, {
      ...ctx,
      baseStyle, editing, setEditing, onSave, rowId,
      isSelected, onToggleSelect, col,
    });
    // If the render fn returns a bare node (not a cell), wrap it
    if (React.isValidElement(rendered) && rendered.type === DtCell) return rendered;
    if (React.isValidElement(rendered) && rendered.props && rendered.props['data-dt-raw']) {
      return rendered;
    }
    return <div style={baseStyle}>{rendered}</div>;
  }

  // Generic editable text path
  const read = col.get ? col.get(row) : row[col.id];
  if (col.editable) {
    if (editing) {
      return <DtInlineInput
        baseStyle={baseStyle}
        initial={read == null ? '' : read}
        type={col.inputType || 'text'}
        onCommit={(v) => onSave(v === '' ? null : (col.inputType === 'number' ? Number(v) : v))}
        onCancel={() => setEditing(false)}
      />;
    }
    return (
      <div style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
        {read != null && read !== '' ? read : <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>
    );
  }

  // Default: read-only text
  return <div style={baseStyle}>{read != null && read !== '' ? read : '—'}</div>;
}

function DtInlineInput({ baseStyle, initial, onCommit, onCancel, type = 'text' }) {
  const [val, setVal] = React.useState(initial);
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <div style={{ ...baseStyle, padding: 0, borderLeft: '2px solid var(--accent)' }}
      onClick={(e) => e.stopPropagation()}>
      <input ref={ref} type={type} value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => onCommit(val)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onCommit(val); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        style={{
          width: '100%', height: '100%',
          background: 'var(--paper)', border: 'none', outline: 'none',
          padding: '0 8px',
          fontFamily: baseStyle.fontFamily,
          fontSize: baseStyle.fontSize,
          color: 'var(--ink)',
          textAlign: baseStyle.justifyContent === 'flex-end' ? 'right' : 'left',
        }} />
    </div>
  );
}

// ───────── helpers ─────────

function sortVal(row, col) {
  if (!col) return null;
  if (col.sortValue) return col.sortValue(row);
  if (col.get) return col.get(row);
  const v = row[col.id];
  return (v == null || v === '') ? null : v;
}

function defaultMatchFilter(row, f) {
  const v = row[f.field];
  if (f.op === 'is') return (v || '').toString().toLowerCase() === (f.value || '').toLowerCase();
  if (f.op === 'contains') return (v || '').toString().toLowerCase().includes((f.value || '').toLowerCase());
  if (f.op === 'lt') return Number(v) < Number(f.value);
  if (f.op === 'gt') return Number(v) > Number(f.value);
  return true;
}

Object.assign(window, {
  DataTable, DtTable, DtHeader, DtRow, DtCell,
  DtResizeHandle, DtCheckbox, DtInlineInput,
  DT_DENSITY_ROW_H,
  loadDtColPref, saveDtColPref, defaultMatchFilter,
});
