// Library — Table mode. Thin wrapper around the shared DataTable.
//
// This file owns only the domain slots (topbar / kind tabs / filters / bulk /
// side panel / column picker / command palette / cheatsheet) and the
// material-specific filter/sort/search glue. All table mechanics live in
// DataTable.jsx and the material column catalogue lives in LibraryColumns.jsx.

function loadDensity() {
  try { return localStorage.getItem('aml-table-density') || 'regular'; } catch { return 'regular'; }
}
function saveDensity(v) { try { localStorage.setItem('aml-table-density', v); } catch {} }

function LibraryTable(props) {
  const {
    materials, libraries, labelTemplates, setLabelTemplates, onOpenLabelBuilder,
    mode, setMode,
    activeLibraryId, setActiveLibraryId,
    onEdit, onAdd, onDelete,
    onAddLibrary, onRenameLibrary, onDuplicateLibrary, onDeleteLibrary,
    onToggleMaterialInLibrary, onMoveMaterial, onDuplicateMaterial, onDuplicate,
  } = props;

  // Keep labelTemplates accessible to column sort fns (they can't take args)
  window._labelTemplatesCache = labelTemplates;

  const LibrarySidebarCompact = window.LibrarySidebarCompact;
  const LTTopBar = window.LTTopBar;
  const LTKindTabs = window.LTKindTabs;
  const LTFiltersBar = window.LTFiltersBar;
  const LTBulkBar = window.LTBulkBar;
  const LTSidePanel = window.LTSidePanel;
  const LTColumnPicker = window.LTColumnPicker;
  const LTCommandPalette = window.LTCommandPalette;
  const LTCheatsheet = window.LTCheatsheet;

  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState([]);
  const [kindFilter, setKindFilter] = React.useState(() => {
    try { return localStorage.getItem('aml-kind-filter') || 'all'; } catch { return 'all'; }
  });
  React.useEffect(() => { try { localStorage.setItem('aml-kind-filter', kindFilter); } catch {} }, [kindFilter]);

  const [sort, setSort] = React.useState({ id: 'code', dir: 'asc' });
  const [selected, setSelected] = React.useState(new Set());
  const [cursorId, setCursorId] = React.useState(null);
  const [openId, setOpenId] = React.useState(null);
  const [editingCell, setEditingCell] = React.useState(null);
  const [density, setDensityState] = React.useState(loadDensity);
  function setDensity(v) { setDensityState(v); saveDensity(v); }
  const [colPickerOpen, setColPickerOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = React.useState(false);
  const searchRef = React.useRef(null);
  const colPrefRef = React.useRef(null);

  // Library-scoped + kind-scoped rows (feeds into DataTable's filter pipeline)
  const libraryScoped = React.useMemo(() => {
    if (activeLibraryId === 'all') return materials;
    return materials.filter(m => (m.libraryIds || []).includes(activeLibraryId));
  }, [materials, activeLibraryId]);

  const kindScoped = React.useMemo(() => {
    if (kindFilter === 'all') return libraryScoped;
    return libraryScoped.filter(m => (m.kind || 'material') === kindFilter);
  }, [libraryScoped, kindFilter]);

  // Global shortcuts for overlays that DataTable doesn't know about
  React.useEffect(() => {
    function onKey(e) {
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setPaletteOpen(true); return;
      }
      if (e.key === 'Escape') {
        if (cheatsheetOpen) { setCheatsheetOpen(false); return; }
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (colPickerOpen) { setColPickerOpen(false); return; }
      }
      if (inInput) return;
      if (e.key === '?') { e.preventDefault(); setCheatsheetOpen(true); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, cheatsheetOpen, colPickerOpen]);

  // Need columns with labelTemplates baked into searchText (so query catches labels)
  const columns = React.useMemo(() => {
    return window.LIBRARY_COLUMNS.map(c => {
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
    return [m.name, m.code, m.supplier, m.category, m.finish, m.species]
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

  // openId-derived material for side panel
  const openMaterial = openId ? materials.find(m => m.id === openId) : null;

  return (
    <>
      <window.DataTable
        rows={kindScoped}
        columns={searchColumns}
        colPrefRef={colPrefRef}
        cellContext={{ libraries, allMaterials: materials, labelTemplates }}
        colStorageKey="aml-table-cols"
        defaultVisible={window.LIBRARY_DEFAULT_VISIBLE}
        defaultOrder={window.LIBRARY_DEFAULT_ORDER}
        query={query}
        filters={filters}
        matchFilter={window.libraryMatchFilter}
        sort={sort} setSort={setSort}
        selected={selected} setSelected={setSelected}
        cursorId={cursorId} setCursorId={setCursorId}
        openId={openId} setOpenId={setOpenId}
        editingCell={editingCell} setEditingCell={setEditingCell}
        density={density}
        onSaveCell={(id, field, value) => window.saveMaterialCell(id, field, value)}
        onOpenRow={(id) => setOpenId(id)}
        onEditRow={(id) => { const m = materials.find(x => x.id === id); if (m) onEdit(m); }}
        onDuplicateRow={onDuplicate}
        onAdd={onAdd}
        searchRef={searchRef}
        sidebarSlot={
          <LibrarySidebarCompact
            libraries={libraries}
            materials={materials}
            activeLibraryId={activeLibraryId}
            setActiveLibraryId={setActiveLibraryId}
            onAddLibrary={onAddLibrary}
            onRenameLibrary={onRenameLibrary}
            onDuplicateLibrary={onDuplicateLibrary}
            onDeleteLibrary={onDeleteLibrary}
          />
        }
        topBar={
          <LTTopBar
            query={query} setQuery={setQuery} searchRef={searchRef}
            mode={mode} setMode={setMode}
            labelTemplates={labelTemplates} setLabelTemplates={setLabelTemplates}
            onOpenLabelBuilder={onOpenLabelBuilder}
            onAdd={onAdd}
            density={density} setDensity={setDensity}
            onOpenColPicker={() => setColPickerOpen(true)}
            onOpenCheatsheet={() => setCheatsheetOpen(true)}
            activeLibraryId={activeLibraryId}
            libraries={libraries}
            count={kindScoped.length}
            total={materials.length}
          />
        }
        kindTabs={
          <LTKindTabs
            materials={libraryScoped}
            kindFilter={kindFilter}
            setKindFilter={setKindFilter}
          />
        }
        filtersBar={
          <LTFiltersBar
            filters={filters} setFilters={setFilters}
            libraries={libraries}
            materials={libraryScoped}
          />
        }
        bulkBar={
          <LTBulkBar
            selected={selected}
            clear={() => setSelected(new Set())}
            libraries={libraries}
            onMoveMaterial={onMoveMaterial}
            onDuplicateMaterial={onDuplicateMaterial}
            onDelete={(ids) => { ids.forEach(id => onDelete(id, true)); setSelected(new Set()); }}
          />
        }
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
        // Extend cellCtx with material-specific context the renderers need.
        // (DataTable spreads whatever we pass — we patch via cellContext below.)
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
            if (action === 'cheatsheet') setCheatsheetOpen(true);
            setPaletteOpen(false);
          }}
        />
      )}
      {cheatsheetOpen && <LTCheatsheet onClose={() => setCheatsheetOpen(false)} />}
    </>
  );
}

Object.assign(window, { LibraryTable });
