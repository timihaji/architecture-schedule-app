// Library — Table mode. Thin wrapper around the shared DataTable.
//
// Phase 2: top-bar / kind tabs / advanced filters bar / cheatsheet / density
// / label-format quick pick all removed. The page-level shared LibraryToolbar
// (mounted by Library.jsx) drives query / sort / filterCategory / group;
// this file only renders the DataTable, the side panel, the column picker
// (injected into the toolbar's columns slot), and the command palette.

// Map between the lifted toolbar's canonical sort id (string) and DataTable's
// column id, since the column ids in LIBRARY_COLUMNS use a different naming.
const TBSORT_TO_COL = { code: 'code', name: 'label', cost: 'unitCost', lead: 'leadTime' };
const COL_TO_TBSORT = { code: 'code', label: 'name', unitCost: 'cost', leadTime: 'lead' };

function LibraryTable(props) {
  const {
    materials, libraries, labelTemplates, setLabelTemplates, onOpenLabelBuilder,
    mode, setMode,
    activeLibraryId, setActiveLibraryId,
    onEdit, onAdd, onDelete,
    onToggleMaterialInLibrary, onMoveMaterial, onDuplicateMaterial, onDuplicate,
    onFindDupes,
    selected: extSelected, setSelected: extSetSelected,
    toolbarState,
    setColumnsButton,
  } = props;

  const { query, sort: tbSort, setSort: setTbSort,
          filterCategory, groupBy: tbGroupBy, toolbarFiltered } = toolbarState;

  // Phase 4: thread the toolbar's groupBy axis into DataTable's grouping hook.
  // DataTable wants a (row) => key fn (single bucket per row). For the multi-
  // value tag axes, we collapse to the first value — table grouping doesn't
  // support row duplication. Group-by tag still works in Gallery / Register /
  // Split which can render the same row in multiple groups.
  const tableGroupByFn = React.useMemo(() => {
    if (!tbGroupBy || !window.bucketKeysFor) return null;
    let axis = null;
    if (tbGroupBy === '_category' || tbGroupBy === '_group' || tbGroupBy === '_trade' || tbGroupBy === '_supplier') {
      axis = { id: tbGroupBy, type: 'synthetic' };
    } else if (tbGroupBy.indexOf('_tag_') === 0) {
      axis = { id: tbGroupBy, tagAxis: tbGroupBy.substring(5), type: 'tag' };
    } else {
      const f = window.fieldDef && window.fieldDef(tbGroupBy);
      if (f) axis = { id: f.id, type: f.type, multiple: f.multiple };
    }
    if (!axis) return null;
    return (row) => {
      const keys = window.bucketKeysFor(axis, row);
      const arr = Array.isArray(keys) ? keys : [keys];
      const k = arr[0] || '—';
      // Resolve to label
      if (axis.id === '_category') {
        const c = window.categoryDef && window.categoryDef(k);
        return (c && c.label) || k || '—';
      }
      if (axis.id === '_group') {
        const g = window.groupDef && window.groupDef(k);
        return (g && g.label) || k || '—';
      }
      return k || '—';
    };
  }, [tbGroupBy]);

  // Keep labelTemplates accessible to column sort fns (they can't take args)
  window._labelTemplatesCache = labelTemplates;

  const LTBulkBar = window.LTBulkBar;
  const LTSidePanel = window.LTSidePanel;
  const LTColumnPicker = window.LTColumnPicker;
  const LTCommandPalette = window.LTCommandPalette;

  // Direction is local — toolbar drives axis; column-clicks flip dir.
  const [dir, setDir] = React.useState('asc');
  const sort = { id: TBSORT_TO_COL[tbSort] || 'code', dir };
  const setSort = React.useCallback((next) => {
    const resolved = typeof next === 'function' ? next(sort) : next;
    if (!resolved) return;
    if (resolved.id !== sort.id) {
      const tb = COL_TO_TBSORT[resolved.id];
      if (tb) setTbSort(tb);
      // unmapped column (e.g. tags / kind / brand) — ignore: lifted axis
      // stays the source of truth, dir change still applies.
    }
    if (resolved.dir && resolved.dir !== dir) setDir(resolved.dir);
  }, [sort.id, dir, setTbSort]);

  // Selection state lifted to Library.jsx (B6) so it persists across layout
  // switches; fall back to local state if a host doesn't pass it.
  const [localSelected, setLocalSelected] = React.useState(new Set());
  const selected = extSelected || localSelected;
  const setSelected = extSetSelected || setLocalSelected;
  const [cursorId, setCursorId] = React.useState(null);
  const [openId, setOpenId] = React.useState(null);
  const [editingCell, setEditingCell] = React.useState(null);
  const [colPickerOpen, setColPickerOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const colPrefRef = React.useRef(null);

  // Inject the Columns button into the shared toolbar's slot.
  React.useEffect(() => {
    if (!setColumnsButton) return;
    setColumnsButton(
      <button type="button" className="btn-ghost"
        onClick={() => setColPickerOpen(true)}
        title="Columns">⊞ Columns</button>
    );
    return () => setColumnsButton(null);
  }, [setColumnsButton]);

  // Global shortcuts for overlays that DataTable doesn't know about
  React.useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setPaletteOpen(true); return;
      }
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (colPickerOpen) { setColPickerOpen(false); return; }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, colPickerOpen]);

  // Need columns with labelTemplates baked into searchText (so query catches labels)
  const columns = React.useMemo(() => {
    return window.LIBRARY_COLUMNS
      .filter(c => !c.visible || c.visible())
      .map(c => {
        if (c.id === 'label') {
          return {
            ...c,
            searchText: (m) => {
              const label = window.formatLabel(m, labelTemplates);
              return label + ' ' + (m.name || '') + ' ' + (m.customName || '');
            },
            sortValue: (m) => window.formatLabel(m, labelTemplates).toLowerCase(),
          };
        }
        return c;
      });
  }, [labelTemplates]);

  // Additional text fields to include in full-text search
  const searchRowText = React.useCallback((m) => {
    const _fv = window.getFieldValue || ((x, k) => (x.fields && x.fields[k]) ?? x[k]);
    return [m.name, m.code, _fv(m, 'supplier'), m.category, _fv(m, 'finish'), _fv(m, 'species')]
      .filter(Boolean).join(' ');
  }, []);

  // DataTable does its own query filter via columns[].searchText; we extend
  // via a pseudo-column (no render) so supplier/category/etc are all searched.
  const searchColumns = React.useMemo(() => {
    return [
      ...columns,
      { id: '__search', label: '', width: 0, minWidth: 0, searchText: searchRowText, sortable: false },
    ];
  }, [columns, searchRowText]);

  // Pre-filter rows by the lifted category (DataTable handles query + sort).
  const categoryScoped = React.useMemo(() => {
    if (filterCategory && filterCategory !== 'All') {
      return toolbarFiltered;
    }
    // toolbarFiltered already has the active library scope baked in;
    // when filterCategory is 'All' we still want the library scope.
    return toolbarFiltered;
  }, [toolbarFiltered, filterCategory]);

  // openId-derived material for side panel
  const openMaterial = openId ? materials.find(m => m.id === openId) : null;

  return (
    <>
      <window.DataTable
        rows={categoryScoped}
        columns={searchColumns}
        colPrefRef={colPrefRef}
        cellContext={{
          libraries, allMaterials: materials, labelTemplates,
          onEditMaterial: (m) => onEdit(m),
          onDuplicateMaterial: (m) => {
            const newId = onDuplicate && onDuplicate(m.id);
            if (newId) { setCursorId(newId); setEditingCell({ id: newId, field: 'code' }); }
          },
          onDeleteMaterial: (m) => {
            if (!window.confirm('Delete ' + (m.name || m.code || 'this material') + '?')) return;
            onDelete(m.id, true);
          },
        }}
        colStorageKey="aml-table-cols-v2"
        defaultVisible={window.LIBRARY_DEFAULT_VISIBLE}
        defaultOrder={window.LIBRARY_DEFAULT_ORDER}
        query={query}
        filters={[]}
        matchFilter={window.libraryMatchFilter}
        sort={sort} setSort={setSort}
        selected={selected} setSelected={setSelected}
        cursorId={cursorId} setCursorId={setCursorId}
        openId={openId} setOpenId={setOpenId}
        editingCell={editingCell} setEditingCell={setEditingCell}
        density="regular"
        onSaveCell={(id, field, value) => window.saveMaterialCell(id, field, value)}
        onOpenRow={(id) => setOpenId(id)}
        onEditRow={(id) => { const m = materials.find(x => x.id === id); if (m) onEdit(m); }}
        onDeleteRow={(ids) => {
          if (!window.confirm('Delete ' + ids.length + ' material' + (ids.length !== 1 ? 's' : '') + '?')) return;
          ids.forEach(id => onDelete(id, true));
          setSelected(new Set());
        }}
        onDuplicateRow={(ids) => {
          if (ids.length === 1) {
            const newId = onDuplicate && onDuplicate(ids[0]);
            if (newId) { setCursorId(newId); setEditingCell({ id: newId, field: 'code' }); }
          } else {
            ids.forEach(id => onDuplicate && onDuplicate(id));
          }
        }}
        onAdd={onAdd}
        onAddRow={onAdd ? (groupKey) => onAdd(groupKey || undefined) : undefined}
        groupBy={tableGroupByFn}
        topBar={null}
        kindTabs={null}
        filtersBar={null}
        bulkBar={null}
        sidePanel={
          openMaterial && (
            <LTSidePanel
              material={openMaterial}
              materials={materials}
              libraries={libraries}
              labelTemplates={labelTemplates}
              onClose={() => setOpenId(null)}
              onEdit={() => onEdit(openMaterial)}
              onDelete={() => { onDelete(openId); setOpenId(null); }}
              onNavigateTo={(id) => setOpenId(id)}
            />
          )
        }
      />
      {colPickerOpen && colPrefRef.current && (
        <LTColumnPicker
          colPref={colPrefRef.current.colPref}
          setColPref={colPrefRef.current.setColPref}
          onClose={() => setColPickerOpen(false)}
        />
      )}
      {paletteOpen && (
        <LTCommandPalette
          materials={materials}
          labelTemplates={labelTemplates}
          onClose={() => setPaletteOpen(false)}
          onPick={(id) => { setOpenId(id); setCursorId(id); setPaletteOpen(false); }}
          onAdd={() => { onAdd(); setPaletteOpen(false); }}
          onAction={(action) => {
            if (action === 'toggle-mode') setMode(mode === 'table' ? 'gallery' : 'table');
            if (action === 'columns') setColPickerOpen(true);
            setPaletteOpen(false);
          }}
        />
      )}
    </>
  );
}

Object.assign(window, { LibraryTable });
