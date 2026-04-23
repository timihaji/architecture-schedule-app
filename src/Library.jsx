// Library — dense editorial spec-book list with left library sidebar

function Library({
  materials, libraries,
  labelTemplates, setLabelTemplates, onOpenLabelBuilder,
  mode = 'gallery', setMode,
  activeLibraryId, setActiveLibraryId,
  onEdit, onAdd, onDelete,
  onAddLibrary, onRenameLibrary, onDuplicateLibrary, onDeleteLibrary,
  onToggleMaterialInLibrary, onMoveMaterial, onDuplicateMaterial, onDuplicate,
  onFindDupes,
  compareIds, toggleCompare, showImagery, density,
}) {
  if (mode === 'table') {
    return (
      <LibraryTable
        materials={materials}
        libraries={libraries}
        labelTemplates={labelTemplates}
        setLabelTemplates={setLabelTemplates}
        onOpenLabelBuilder={onOpenLabelBuilder}
        mode={mode} setMode={setMode}
        activeLibraryId={activeLibraryId}
        setActiveLibraryId={setActiveLibraryId}
        onEdit={onEdit} onAdd={onAdd} onDelete={onDelete}
        onAddLibrary={onAddLibrary}
        onRenameLibrary={onRenameLibrary}
        onDuplicateLibrary={onDuplicateLibrary}
        onDeleteLibrary={onDeleteLibrary}
        onToggleMaterialInLibrary={onToggleMaterialInLibrary}
        onMoveMaterial={onMoveMaterial}
        onDuplicateMaterial={onDuplicateMaterial}
        onDuplicate={onDuplicate}
        onFindDupes={onFindDupes}
      />
    );
  }
  return (
    <LibraryGallery
      materials={materials}
      libraries={libraries}
      labelTemplates={labelTemplates}
      setLabelTemplates={setLabelTemplates}
      onOpenLabelBuilder={onOpenLabelBuilder}
      mode={mode} setMode={setMode}
      activeLibraryId={activeLibraryId}
      setActiveLibraryId={setActiveLibraryId}
      onEdit={onEdit} onAdd={onAdd} onDelete={onDelete}
      onAddLibrary={onAddLibrary}
      onRenameLibrary={onRenameLibrary}
      onDuplicateLibrary={onDuplicateLibrary}
      onDeleteLibrary={onDeleteLibrary}
      onToggleMaterialInLibrary={onToggleMaterialInLibrary}
      onMoveMaterial={onMoveMaterial}
      onDuplicateMaterial={onDuplicateMaterial}
      onDuplicate={onDuplicate}
      onFindDupes={onFindDupes}
      compareIds={compareIds} toggleCompare={toggleCompare}
      showImagery={showImagery} density={density}
    />
  );
}

function LibraryGallery({
  materials, libraries,
  labelTemplates, setLabelTemplates, onOpenLabelBuilder,
  mode, setMode,
  activeLibraryId, setActiveLibraryId,
  onEdit, onAdd, onDelete,
  onAddLibrary, onRenameLibrary, onDuplicateLibrary, onDeleteLibrary,
  onToggleMaterialInLibrary, onMoveMaterial, onDuplicateMaterial, onDuplicate,
  onFindDupes,
  compareIds, toggleCompare, showImagery, density,
}) {
  const [query, setQuery] = React.useState('');
  const [group, setGroup] = React.useState('category');
  const [sort, setSort] = React.useState('code');
  const [openId, setOpenId] = React.useState(null);
  const [menuForId, setMenuForId] = React.useState(null);
  const [flashId, setFlashId] = React.useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try { return localStorage.getItem('aml-gallery-sidebar') === 'collapsed'; }
    catch { return false; }
  });
  function toggleSidebar() {
    setSidebarCollapsed(v => {
      const next = !v;
      try { localStorage.setItem('aml-gallery-sidebar', next ? 'collapsed' : 'open'); } catch {}
      return next;
    });
  }

  // ⌘\ or Ctrl+\ toggles the libraries rail
  React.useEffect(() => {
    function onKey(e) {
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (inInput) return;
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Clean jump to a material by id — clears filters, switches library scope if needed,
  // opens the target row, scrolls to it and flashes it briefly.
  function navigateToMaterial(targetId) {
    const target = materials.find(x => x.id === targetId);
    if (!target) return;
    setQuery('');
    if (activeLibraryId !== 'all' && !target.libraryIds.includes(activeLibraryId)) {
      setActiveLibraryId('all');
    }
    setOpenId(targetId);
    setFlashId(targetId);
    // wait a tick for DOM to reflect new filters/open state
    setTimeout(() => {
      const el = document.getElementById('mat-row-' + targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        const targetY = rect.top + window.scrollY - (window.innerHeight / 2) + (rect.height / 2);
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
      setTimeout(() => setFlashId(null), 1600);
    }, 50);
  }

  // Filter by active library
  const libraryScoped = React.useMemo(() => {
    if (activeLibraryId === 'all') return materials;
    return materials.filter(m => m.libraryIds.includes(activeLibraryId));
  }, [materials, activeLibraryId]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = libraryScoped.slice();
    if (q) {
      list = list.filter(m =>
        (window.formatLabel(m, labelTemplates) + ' ' + m.name + ' ' + m.code + ' ' + m.category + ' ' + m.supplier + ' ' + (m.species || '') + ' ' + m.finish).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sort === 'code') return a.code.localeCompare(b.code);
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'cost') return a.unitCost - b.unitCost;
      if (sort === 'lead') return a.leadTime.localeCompare(b.leadTime);
      return 0;
    });
    return list;
  }, [libraryScoped, query, sort]);

  const grouped = React.useMemo(() => {
    const map = new Map();
    filtered.forEach(m => {
      let key;
      if (group === 'category') key = m.category;
      else if (group === 'supplier') key = m.supplier;
      else if (group === 'cost') {
        const c = m.unitCost;
        key = c < 150 ? 'Under $150' : c < 300 ? '$150 – $300' : c < 500 ? '$300 – $500' : '$500+';
      } else key = 'All';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    });
    return Array.from(map.entries());
  }, [filtered, group]);

  const activeLibrary = libraries.find(l => l.id === activeLibraryId);
  const scopeLabel = activeLibraryId === 'all' ? 'All libraries' : (activeLibrary?.name || 'Library');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: (sidebarCollapsed ? '40px' : '220px') + ' 1fr',
      gap: sidebarCollapsed ? 28 : 40,
      alignItems: 'start',
      transition: 'grid-template-columns 0.22s ease, gap 0.22s ease',
    }}>
      <LibrarySidebar
        libraries={libraries}
        materials={materials}
        activeLibraryId={activeLibraryId}
        setActiveLibraryId={setActiveLibraryId}
        onAddLibrary={onAddLibrary}
        onRenameLibrary={onRenameLibrary}
        onDuplicateLibrary={onDuplicateLibrary}
        onDeleteLibrary={onDeleteLibrary}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />

      <div style={{ minWidth: 0 }}>
        <header style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <Eyebrow>Volume I · Materials · {scopeLabel}</Eyebrow>
              <h1 style={{
                fontFamily: "'Newsreader', serif",
                fontWeight: 300,
                fontSize: 52,
                letterSpacing: '-0.015em',
                lineHeight: 1,
                margin: '10px 0 6px',
              }}>
                {scopeLabel === 'All libraries' ? 'Material Library' : scopeLabel}
              </h1>
              <div style={{ ...ui.mono, fontSize: 11.5, color: 'var(--ink-3)', letterSpacing: '0.02em' }}>
                {libraryScoped.length} entries · {[...new Set(libraryScoped.map(m => m.supplier))].filter(Boolean).length} suppliers
                {activeLibrary?.description ? ' · ' + activeLibrary.description : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {compareIds.length >= 2 && (
                <Tag tone="accent">Comparing {compareIds.length}</Tag>
              )}
              <ModeToggle mode={mode} setMode={setMode} />
              <LabelFormatQuickPick
                templates={labelTemplates}
                setTemplates={setLabelTemplates}
                onOpenBuilder={() => onOpenLabelBuilder('Global')} />
              {onFindDupes && (
                <TextButton onClick={onFindDupes}>Find dupes</TextButton>
              )}
              <TextButton onClick={onAdd} accent>＋ Add entry</TextButton>
            </div>
          </div>
          <Rule heavy style={{ marginTop: 20 }} />
        </header>

        {compareIds.length >= 2 && (
          <CompareStrip
            ids={compareIds}
            materials={materials}
            labelTemplates={labelTemplates}
            onClose={() => compareIds.forEach(toggleCompare)}
          />
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) auto auto',
          gap: 28,
          alignItems: 'end',
          marginBottom: 26,
        }}>
          <SearchField value={query} onChange={setQuery} placeholder="Search name, code, supplier, finish…" />
          <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
            <span style={{ ...ui.label, marginRight: 6 }}>Group</span>
            {['category', 'supplier', 'cost'].map(g => (
              <GroupChip key={g} active={group === g} onClick={() => setGroup(g)}>{g}</GroupChip>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
            <span style={{ ...ui.label, marginRight: 6 }}>Sort</span>
            {['code', 'name', 'cost', 'lead'].map(s => (
              <GroupChip key={s} active={sort === s} onClick={() => setSort(s)}>{s}</GroupChip>
            ))}
          </div>
        </div>

        <div style={rowGrid(showImagery)}>
          {showImagery && <div />}
          <Eyebrow style={{ paddingBottom: 8 }}>Code</Eyebrow>
          <Eyebrow style={{ paddingBottom: 8 }}>Material</Eyebrow>
          <Eyebrow style={{ paddingBottom: 8 }}>Supplier / Origin</Eyebrow>
          <Eyebrow style={{ paddingBottom: 8, textAlign: 'right' }}>Finish · Thk</Eyebrow>
          <Eyebrow style={{ paddingBottom: 8, textAlign: 'right' }}>Lead</Eyebrow>
          <Eyebrow style={{ paddingBottom: 8, textAlign: 'right' }}>Unit · Cost</Eyebrow>
          <div />
        </div>
        <Rule />

        {grouped.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <Mono size={12} color="var(--ink-4)" style={{ display: 'block', marginBottom: 14 }}>
              {query ? 'No materials match your search' : 'This library is empty'}
            </Mono>
            <TextButton onClick={onAdd} accent>＋ Add the first material</TextButton>
          </div>
        )}

        {grouped.map(([key, items]) => (
          <section key={key} style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginTop: 28, marginBottom: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <Mono size={11} color="var(--ink-4)">§ {String(grouped.findIndex(g => g[0] === key) + 1).padStart(2, '0')}</Mono>
                <Serif size={22} style={{ fontStyle: 'italic', color: 'var(--ink)' }}>{key}</Serif>
              </div>
              <Mono size={11} color="var(--ink-4)">{items.length} {items.length === 1 ? 'entry' : 'entries'}</Mono>
            </div>
            <Rule />
            {items.map(m => (
              <MaterialRow
                key={m.id}
                material={m}
                materials={materials}
                libraries={libraries}
                labelTemplates={labelTemplates}
                showImagery={showImagery}
                open={openId === m.id}
                flash={flashId === m.id}
                onNavigateTo={navigateToMaterial}
                menuOpen={menuForId === m.id}
                onToggle={() => setOpenId(openId === m.id ? null : m.id)}
                onOpenMenu={() => setMenuForId(menuForId === m.id ? null : m.id)}
                onCloseMenu={() => setMenuForId(null)}
                onEdit={() => onEdit(m)}
                onDelete={() => onDelete(m.id)}
                inCompare={compareIds.includes(m.id)}
                toggleCompare={() => toggleCompare(m.id)}
                onToggleLib={(libId) => onToggleMaterialInLibrary(m.id, libId)}
                onMoveLib={(libId) => { onMoveMaterial(m.id, libId); setMenuForId(null); }}
                onDuplicateLib={(libId) => { onDuplicateMaterial(m.id, libId); setMenuForId(null); }}
                onDuplicate={() => { onDuplicate && onDuplicate(m.id); setMenuForId(null); }}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

// ───────── Sidebar ─────────

function LibrarySidebar({ libraries, materials, activeLibraryId, setActiveLibraryId,
  onAddLibrary, onRenameLibrary, onDuplicateLibrary, onDeleteLibrary,
  collapsed, onToggleCollapsed }) {
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [renamingId, setRenamingId] = React.useState(null);
  const [renameVal, setRenameVal] = React.useState('');

  function submitNew() {
    if (newName.trim()) onAddLibrary(newName);
    setNewName(''); setAdding(false);
  }
  function submitRename() {
    if (renameVal.trim()) onRenameLibrary(renamingId, renameVal);
    setRenamingId(null); setRenameVal('');
  }

  if (collapsed) {
    return (
      <CollapsedLibraryRail
        libraries={libraries}
        materials={materials}
        activeLibraryId={activeLibraryId}
        setActiveLibraryId={setActiveLibraryId}
        onExpand={onToggleCollapsed}
      />
    );
  }

  return (
    <aside style={{
      position: 'sticky',
      top: 80,
      paddingRight: 8,
      borderRight: '1px solid var(--rule)',
      marginRight: -8,
      minHeight: 300,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <Eyebrow>Libraries</Eyebrow>
          <Mono size={10} color="var(--ink-4)">{libraries.length}</Mono>
        </div>
        <CollapseToggle collapsed={false} onClick={onToggleCollapsed} />
      </div>

      <LibraryItem
        name="All libraries"
        count={materials.length}
        active={activeLibraryId === 'all'}
        system
        onClick={() => setActiveLibraryId('all')}
      />
      <div style={{ height: 10 }} />
      {libraries.map(lib => {
        const count = materials.filter(m => m.libraryIds.includes(lib.id)).length;
        const isActive = activeLibraryId === lib.id;
        const isRenaming = renamingId === lib.id;
        return (
          <div key={lib.id} style={{ marginBottom: 2 }}>
            {isRenaming ? (
              <input autoFocus value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={submitRename}
                onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setRenamingId(null); setRenameVal(''); } }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--ink)',
                  outline: 'none',
                  fontFamily: "'Newsreader', serif",
                  fontSize: 14,
                  padding: '7px 8px',
                  color: 'var(--ink)',
                }} />
            ) : (
              <LibraryItem
                name={lib.name}
                count={count}
                active={isActive}
                system={lib.system}
                onClick={() => setActiveLibraryId(lib.id)}
                onRename={() => { setRenamingId(lib.id); setRenameVal(lib.name); }}
                onDuplicate={() => onDuplicateLibrary(lib.id)}
                onDelete={lib.system ? null : () => onDeleteLibrary(lib.id)}
              />
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dotted var(--rule-2)' }}>
        {adding ? (
          <input autoFocus value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={() => { if (newName.trim()) submitNew(); else setAdding(false); }}
            onKeyDown={e => { if (e.key === 'Enter') submitNew(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
            placeholder="Library name"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--ink)',
              outline: 'none',
              fontFamily: "'Newsreader', serif",
              fontSize: 14,
              padding: '7px 8px',
              color: 'var(--ink)',
            }} />
        ) : (
          <button type="button"
            onClick={() => { setAdding(true); setNewName(''); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 0',
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--accent-ink)', fontWeight: 500,
            }}>＋ New library</button>
        )}
      </div>
    </aside>
  );
}

function CollapseToggle({ collapsed, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={collapsed ? 'Expand libraries (⌘\\)' : 'Collapse libraries (⌘\\)'}
      aria-label={collapsed ? 'Expand libraries' : 'Collapse libraries'}
      style={{
        background: 'transparent',
        border: '1px solid ' + (hov ? 'var(--ink)' : 'var(--rule-2)'),
        cursor: 'pointer',
        width: 22, height: 22,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: hov ? 'var(--ink)' : 'var(--ink-3)',
        transition: 'all 0.14s ease',
        padding: 0,
      }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.18s' }}>
        <path d="M3.5 2 L6.5 5 L3.5 8" />
      </svg>
    </button>
  );
}

function CollapsedLibraryRail({ libraries, materials, activeLibraryId, setActiveLibraryId, onExpand }) {
  const activeLib = libraries.find(l => l.id === activeLibraryId);
  const activeIsAll = activeLibraryId === 'all';
  return (
    <aside style={{
      position: 'sticky', top: 80,
      minHeight: 300,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 14,
      paddingTop: 2,
    }}>
      <CollapseToggle collapsed={true} onClick={onExpand} />

      {/* vertical spine */}
      <div style={{
        width: 1, flex: 'none', height: 18,
        background: 'var(--rule-2)',
      }} />

      {/* Tiny rail marks: active library gets a filled square; others are dots.
          Click = switch; hover shows a flyout label. */}
      <RailDot
        label="All libraries"
        count={materials.length}
        active={activeIsAll}
        system
        onClick={() => setActiveLibraryId('all')}
      />
      <div style={{ height: 4 }} />
      {libraries.map(lib => {
        const count = materials.filter(m => m.libraryIds.includes(lib.id)).length;
        return (
          <RailDot
            key={lib.id}
            label={lib.name}
            count={count}
            active={activeLibraryId === lib.id}
            system={lib.system}
            onClick={() => setActiveLibraryId(lib.id)}
          />
        );
      })}

      <div style={{
        width: 12, flex: 'none', height: 1,
        background: 'var(--rule-2)',
        marginTop: 8,
      }} />

      {/* Vertical "Libraries" label as quiet wayfinding */}
      <div style={{
        marginTop: 4,
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 9.5, letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--ink-4)',
      }}>
        {activeIsAll ? 'All libraries' : (activeLib?.name || 'Libraries')}
      </div>
    </aside>
  );
}

function RailDot({ label, count, active, system, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <button type="button" onClick={onClick}
        aria-label={label}
        style={{
          background: active ? 'var(--ink)' : 'transparent',
          border: '1px solid ' + (active ? 'var(--ink)' : (hov ? 'var(--ink-3)' : 'var(--rule-2)')),
          width: active ? 14 : 10,
          height: active ? 14 : 10,
          borderRadius: system ? 0 : 999,
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.14s ease',
          display: 'block',
        }} />
      {hov && (
        <div style={{
          position: 'absolute',
          left: 26, top: '50%', transform: 'translateY(-50%)',
          background: 'var(--ink)',
          color: 'var(--paper)',
          padding: '4px 10px 5px',
          whiteSpace: 'nowrap',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 11, letterSpacing: '0.04em',
          pointerEvents: 'none',
          zIndex: 40,
          display: 'flex', alignItems: 'baseline', gap: 8,
        }}>
          <span>{label}</span>
          <span style={{ ...ui.mono, fontSize: 9, opacity: 0.65 }}>
            {String(count).padStart(2, '0')}
          </span>
        </div>
      )}
    </div>
  );
}

function LibraryItem({ name, count, active, system, onClick, onRename, onDuplicate, onDelete }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        gap: 6,
        padding: '7px 8px',
        cursor: 'pointer',
        background: active ? 'var(--ink)' : (hov ? 'var(--tint)' : 'transparent'),
        color: active ? 'var(--paper)' : 'var(--ink)',
        borderLeft: '2px solid ' + (active ? 'var(--ink)' : 'transparent'),
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Serif size={14} style={{
          display: 'block',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: active ? 'var(--paper)' : 'var(--ink)',
        }}>{name}</Serif>
        {hov && !active && (onRename || onDuplicate || onDelete) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}
            onClick={e => e.stopPropagation()}>
            {onRename && <MiniAction onClick={onRename}>rename</MiniAction>}
            {onDuplicate && <MiniAction onClick={onDuplicate}>duplicate</MiniAction>}
            {onDelete && <MiniAction onClick={onDelete} danger>delete</MiniAction>}
          </div>
        )}
      </div>
      <Mono size={11} color={active ? 'var(--paper-2)' : 'var(--ink-4)'}
        style={{ paddingLeft: 6 }}>
        {String(count).padStart(2, '0')}
      </Mono>
    </div>
  );
}

function MiniAction({ children, onClick, danger }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: danger ? 'var(--accent-ink)' : 'var(--ink-3)',
        fontWeight: 500,
      }}>{children}</button>
  );
}

function rowGrid(showImagery) {
  return {
    display: 'grid',
    gridTemplateColumns: (showImagery ? '56px ' : '') + '68px 2.6fr 1.1fr 1.1fr 0.7fr 1.1fr 84px',
    columnGap: 14,
    alignItems: 'center',
  };
}

function GroupChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '2px 4px',
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 11,
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--ink)' : 'var(--ink-4)',
        borderBottom: '1px solid ' + (active ? 'var(--ink)' : 'transparent'),
        textTransform: 'lowercase',
      }}>
      {children}
    </button>
  );
}

function MaterialRow({ material, materials, libraries, labelTemplates, showImagery, open, menuOpen,
  flash, onNavigateTo,
  onToggle, onOpenMenu, onCloseMenu, onEdit, onDelete, inCompare, toggleCompare,
  onToggleLib, onMoveLib, onDuplicateLib, onDuplicate }) {
  const [hov, setHov] = React.useState(false);
  const m = material;

  return (
    <>
      <div
        id={'mat-row-' + m.id}
        onClick={onToggle}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          ...rowGrid(showImagery),
          padding: 'var(--row-pad) 0',
          borderBottom: '1px solid var(--rule)',
          background: flash ? 'rgba(184,92,58,0.12)' : (hov ? 'var(--tint)' : 'transparent'),
          cursor: 'pointer',
          transition: 'background 0.35s',
          position: 'relative',
          boxShadow: flash ? 'inset 3px 0 0 var(--accent)' : 'none',
        }}
      >
        {showImagery && (
          <Swatch
            swatch={(() => {
              // Paintables inherit the linked paint's tone for visual continuity.
              if (m.category !== 'Paint' && m.swatch?.inheritTone && m.paintedWithId) {
                const linked = materials.find(x => x.id === m.paintedWithId);
                if (linked) return { ...m.swatch, tone: linked.swatch?.tone };
              }
              return m.swatch;
            })()}
            size="sm"
            seed={parseInt(m.id.slice(2)) || 1}
            glyph={m.kind && m.kind !== 'material' && window.subtypeGlyph
              ? window.subtypeGlyph(m.kind, m.subtype) : null}
          />
        )}
        <Mono size={11} color="var(--ink-4)" style={{ letterSpacing: '0.03em' }}>{m.code}</Mono>
        <div>
          <Serif size={17} style={{ lineHeight: 1.1, display: 'block' }}>
            {window.formatLabel(m, labelTemplates)}
          </Serif>
          {m.category === 'Paint' && m.colourCode ? (
            <Mono size={11} color="var(--ink-4)" style={{ letterSpacing: '0.04em' }}>{m.colourCode}</Mono>
          ) : m.species ? (
            <span style={{ ...ui.serif, fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)' }}>
              {m.species}
            </span>
          ) : null}
        </div>
        {m.category === 'Paint' ? (
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.3 }}>
            <div style={{ ...ui.serif, fontStyle: 'italic' }}>{m.brand || m.supplier}</div>
            <div style={{ color: 'var(--ink-4)', fontSize: 11 }}>{m.system || m.origin}</div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.3 }}>
            <div>{m.supplier}</div>
            <div style={{ color: 'var(--ink-4)', fontSize: 11 }}>{m.origin}</div>
          </div>
        )}
        {m.category === 'Paint' ? (
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.3 }}>
            <div>{m.sheen || '—'}</div>
            <Mono size={11} color="var(--ink-4)">{m.coats || 2} coats</Mono>
          </div>
        ) : (
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.3 }}>
            <div>{m.finish}</div>
            <Mono size={11} color="var(--ink-4)">{m.thickness}</Mono>
          </div>
        )}
        <div style={{ textAlign: 'right' }}>
          <Mono size={12} color="var(--ink-3)">{m.leadTime}</Mono>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Mono size={14} color="var(--ink)">{fmtCurrency(m.unitCost)}</Mono>
          <div><Mono size={10} color="var(--ink-4)">per {m.unit}</Mono></div>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
          <label
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: inCompare ? 'var(--accent-ink)' : 'var(--ink-4)',
              opacity: hov || inCompare ? 1 : 0,
              transition: 'opacity 0.12s', fontWeight: 500,
            }}
          >
            <input type="checkbox" checked={inCompare} onChange={toggleCompare}
              style={{ accentColor: 'var(--accent)', margin: 0 }} />
            cmp
          </label>
          <button type="button"
            onClick={e => { e.stopPropagation(); onOpenMenu(); }}
            title="Library actions"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 14,
              color: menuOpen ? 'var(--ink)' : 'var(--ink-4)',
              opacity: (hov || menuOpen) ? 1 : 0,
              transition: 'opacity 0.12s',
              lineHeight: 1,
            }}
          >⋯</button>
          <span style={{
            ...ui.mono, fontSize: 14, color: 'var(--ink-4)',
            transition: 'transform 0.18s',
            transform: open ? 'rotate(90deg)' : 'none',
            display: 'inline-block', width: 10, textAlign: 'center',
          }}>›</span>

          {menuOpen && (
            <LibraryActionMenu
              material={m}
              libraries={libraries}
              onClose={onCloseMenu}
              onToggleLib={onToggleLib}
              onMoveLib={onMoveLib}
              onDuplicateLib={onDuplicateLib}
              onDuplicate={onDuplicate}
            />
          )}
        </div>
      </div>

      {open && (
        <MaterialDetail material={m} materials={materials} libraries={libraries} labelTemplates={labelTemplates} onEdit={onEdit} onDelete={onDelete} onNavigateTo={onNavigateTo} />
      )}
    </>
  );
}

function LibraryActionMenu({ material, libraries, onClose, onToggleLib, onMoveLib, onDuplicateLib, onDuplicate }) {
  const ref = React.useRef();
  React.useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref}
      onClick={e => { e.stopPropagation(); }}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        right: 0,
        zIndex: 40,
        background: 'var(--paper)',
        border: '1px solid var(--ink)',
        boxShadow: '0 8px 24px rgba(20,20,20,0.14)',
        width: 260,
        padding: '12px 0',
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto',
      }}>
      {onDuplicate && (
        <div style={{ padding: '0 14px 8px', borderBottom: '1px dotted var(--rule-2)' }}>
          <button type="button" onClick={onDuplicate}
            style={{
              width: '100%', background: 'none', border: '1px solid var(--rule-2)',
              cursor: 'pointer', padding: '6px 10px', textAlign: 'left',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 12, color: 'var(--ink)',
            }}>
            Duplicate (keep libraries)
          </button>
        </div>
      )}
      <div style={{ padding: '0 14px 8px', borderBottom: '1px dotted var(--rule-2)', marginTop: onDuplicate ? 8 : 0 }}>
        <Eyebrow>Appears in</Eyebrow>
      </div>
      <div style={{ padding: '6px 0' }}>
        {libraries.map(lib => {
          const isIn = material.libraryIds.includes(lib.id);
          return (
            <label key={lib.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px 1fr auto',
                gap: 8, alignItems: 'center',
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 13,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <input type="checkbox" checked={isIn}
                onChange={() => onToggleLib(lib.id)}
                style={{ accentColor: 'var(--ink)', margin: 0 }} />
              <span style={{ ...ui.serif, fontSize: 14 }}>{lib.name}</span>
              <Mono size={10} color="var(--ink-4)">
                {isIn ? 'in' : '—'}
              </Mono>
            </label>
          );
        })}
      </div>
      <div style={{ padding: '8px 14px 4px', borderTop: '1px dotted var(--rule-2)' }}>
        <Eyebrow>Move to (replaces)</Eyebrow>
      </div>
      <select defaultValue=""
        onChange={e => { if (e.target.value) onMoveLib(e.target.value); }}
        style={{
          width: 'calc(100% - 28px)', margin: '4px 14px 10px',
          background: 'transparent',
          border: '1px solid var(--rule-2)',
          padding: '5px 8px',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 12,
          color: 'var(--ink)',
          outline: 'none',
        }}>
        <option value="">Choose library…</option>
        {libraries.map(lib => <option key={lib.id} value={lib.id}>{lib.name}</option>)}
      </select>
      <div style={{ padding: '4px 14px 0', borderTop: '1px dotted var(--rule-2)' }}>
        <Eyebrow style={{ paddingTop: 8 }}>Duplicate into…</Eyebrow>
      </div>
      <select defaultValue=""
        onChange={e => { if (e.target.value) onDuplicateLib(e.target.value); }}
        style={{
          width: 'calc(100% - 28px)', margin: '4px 14px 10px',
          background: 'transparent',
          border: '1px solid var(--rule-2)',
          padding: '5px 8px',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 12,
          color: 'var(--ink)',
          outline: 'none',
        }}>
        <option value="">Choose library…</option>
        {libraries.map(lib => <option key={lib.id} value={lib.id}>{lib.name}</option>)}
      </select>
    </div>
  );
}

function MaterialDetail({ material: m, materials = [], libraries, labelTemplates, onEdit, onDelete, onNavigateTo }) {
  const projectNames = (m.projects || []).map(pid => (window.PROJECTS.find(p => p.id === pid) || {}).name).filter(Boolean);
  const libs = (m.libraryIds || []).map(lid => libraries.find(l => l.id === lid)).filter(Boolean);
  const isPaint = m.category === 'Paint';
  const paintedWith = m.paintedWithId ? materials.find(x => x.id === m.paintedWithId) : null;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '260px 1fr', gap: 36,
      padding: '28px 0 36px', borderBottom: '1px solid var(--rule)',
      background: 'var(--tint)',
      paddingLeft: 24, paddingRight: 24,
      marginLeft: -24, marginRight: -24,
    }}>
      <div>
        <Swatch
          swatch={(() => {
            if (!isPaint && m.swatch?.inheritTone && paintedWith) {
              return { ...m.swatch, tone: paintedWith.swatch?.tone };
            }
            return m.swatch;
          })()}
          size="xl"
          seed={parseInt(m.id.slice(2)) || 1}
          glyph={m.kind && m.kind !== 'material' && window.subtypeGlyph
            ? window.subtypeGlyph(m.kind, m.subtype) : null}
          style={{ width: '100%', height: 180 }} />
        <div style={{ marginTop: 10, ...ui.mono, fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
          {isPaint ? 'PAINT CHIP · INDICATIVE' : 'SWATCH · INDICATIVE'}
        </div>
      </div>
      <div>
        <div style={{ marginBottom: 22, paddingBottom: 14, borderBottom: '1px dotted var(--rule-2)' }}>
          <Eyebrow style={{ marginBottom: 4 }}>
            {m.customName ? 'Custom label' : 'Display label'}
          </Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ ...ui.serif, fontSize: 22, lineHeight: 1.2, color: 'var(--ink)' }}>
              {window.formatLabel(m, labelTemplates)}
            </span>
            {m.customName && (
              <Tag tone="accent">Custom</Tag>
            )}
          </div>
          {m.customName && m.name !== window.formatLabel(m, labelTemplates) && (
            <div style={{ ...ui.serif, fontStyle: 'italic', fontSize: 12.5,
              color: 'var(--ink-4)', marginTop: 4 }}>
              Primary name: {m.name}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          {isPaint ? (
            <>
              <DetailField label="Brand" value={m.brand || m.supplier} />
              <DetailField label="Colour code" value={m.colourCode || '—'} mono />
              <DetailField label="Sheen" value={m.sheen || '—'} />
              <DetailField label="Coats" value={String(m.coats || 2)} mono />
              <DetailField label="System" value={m.system || '—'} />
              <DetailField label="Substrates" value={m.substrates || '—'} />
              <DetailField label="Coverage" value={m.coveragePerL ? `${m.coveragePerL} m²/L` : '—'} mono />
              <DetailField label="Lead time" value={m.leadTime} mono />
            </>
          ) : (
            <>
              <DetailField label="Finish" value={m.finish} />
              <DetailField label="Thickness" value={m.thickness} mono />
              <DetailField label="Dimensions" value={m.dimensions} mono />
              <DetailField label="Lead time" value={m.leadTime} mono />
            </>
          )}
        </div>
        <Eyebrow style={{ marginBottom: 8 }}>Specification</Eyebrow>
        <p style={{
          ...ui.serif, fontSize: 15, lineHeight: 1.55,
          color: 'var(--ink)', margin: 0, maxWidth: '62ch', textWrap: 'pretty',
        }}>
          {m.spec}
        </p>

        {!isPaint && m.paintable && (
          <div style={{ marginTop: 22, padding: '14px 16px',
            background: 'var(--paper)', borderLeft: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', gap: 14 }}>
            <Eyebrow>Painted with</Eyebrow>
            {paintedWith ? (
              <button type="button"
                onClick={(e) => { e.stopPropagation(); onNavigateTo && onNavigateTo(paintedWith.id); }}
                style={{
                  background: 'none', border: 'none', padding: 0, margin: 0,
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: onNavigateTo ? 'pointer' : 'default',
                  textAlign: 'left',
                  borderRadius: 0,
                }}
                onMouseEnter={e => { e.currentTarget.querySelector('[data-arrow]').style.color = 'var(--accent-ink)'; e.currentTarget.querySelector('[data-arrow]').style.transform = 'translateX(2px)'; }}
                onMouseLeave={e => { e.currentTarget.querySelector('[data-arrow]').style.color = 'var(--ink-4)'; e.currentTarget.querySelector('[data-arrow]').style.transform = 'translateX(0)'; }}
                title="Go to paint entry"
              >
                <div style={{ width: 28, height: 28, flexShrink: 0,
                  background: paintedWith.swatch?.tone || '#ddd',
                  outline: '1px solid rgba(20,20,20,0.15)' }} />
                <div>
                  <Mono size={10} color="var(--ink-4)">{paintedWith.code}</Mono>
                  <div style={{ ...ui.serif, fontSize: 14 }}>
                    {paintedWith.brand} {paintedWith.colourName} · <span style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>{paintedWith.sheen}</span>
                  </div>
                </div>
                <span data-arrow style={{
                  ...ui.mono, fontSize: 10, color: 'var(--ink-4)',
                  letterSpacing: '0.08em', marginLeft: 4,
                  transition: 'color 0.15s, transform 0.15s',
                }}>OPEN ENTRY →</span>
              </button>
            ) : (
              <Mono size={12} color="var(--ink-4)">Paintable — finish unspecified</Mono>
            )}
          </div>
        )}

        <div style={{ marginTop: 26 }}>
          <Eyebrow style={{ marginBottom: 8 }}>Libraries</Eyebrow>
          {libs.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {libs.map(l => <Tag key={l.id} tone="neutral">{l.name}</Tag>)}
            </div>
          ) : (
            <Mono size={12} color="var(--ink-4)">Not in any library</Mono>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <Eyebrow style={{ marginBottom: 8 }}>Used in</Eyebrow>
          {projectNames.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {projectNames.map(n => <Tag key={n} tone="soft">{n}</Tag>)}
            </div>
          ) : (
            <Mono size={12} color="var(--ink-4)">Not yet specified on a project</Mono>
          )}
        </div>

        <div style={{ display: 'flex', gap: 20, marginTop: 28 }}>
          <TextButton onClick={onEdit}>Edit entry</TextButton>
          <TextButton onClick={onDelete} accent>Delete</TextButton>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value, mono }) {
  return (
    <div>
      <Eyebrow style={{ marginBottom: 4 }}>{label}</Eyebrow>
      {mono
        ? <Mono size={13} color="var(--ink)">{value}</Mono>
        : <span style={{ fontSize: 13, color: 'var(--ink)' }}>{value}</span>}
    </div>
  );
}

function CompareStrip({ ids, materials, labelTemplates, onClose }) {
  const items = ids.map(id => materials.find(m => m.id === id)).filter(Boolean);
  const rows = [
    { label: 'Category',   get: m => m.category },
    { label: 'Supplier',   get: m => m.supplier },
    { label: 'Origin',     get: m => m.origin },
    { label: 'Finish',     get: m => m.finish },
    { label: 'Thickness',  get: m => m.thickness, mono: true },
    { label: 'Lead time',  get: m => m.leadTime, mono: true },
    { label: 'Unit cost',  get: m => fmtCurrency(m.unitCost) + ' / ' + m.unit, mono: true, heavy: true },
  ];
  return (
    <div style={{
      border: '1px solid var(--ink)',
      background: 'var(--paper-2)',
      padding: '24px 24px 20px',
      marginBottom: 36,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <Eyebrow>Comparison</Eyebrow>
          <Mono size={11} color="var(--ink-3)">{items.length} materials side-by-side</Mono>
        </div>
        <TextButton onClick={onClose}>Close ×</TextButton>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `110px repeat(${items.length}, 1fr)`,
        columnGap: 18,
      }}>
        <div />
        {items.map(m => (
          <div key={m.id} style={{ paddingBottom: 10, borderBottom: '1px solid var(--ink)' }}>
            <Swatch swatch={m.swatch} size="md" seed={parseInt(m.id.slice(2)) || 1}
              style={{ width: '100%', height: 64 }} />
            <div style={{ marginTop: 8 }}>
              <Mono size={10} color="var(--ink-4)">{m.code}</Mono>
              <Serif size={15} style={{ display: 'block', lineHeight: 1.15, marginTop: 2 }}>
                {window.formatLabel(m, labelTemplates)}
              </Serif>
            </div>
          </div>
        ))}
        {rows.map(r => (
          <React.Fragment key={r.label}>
            <div style={{ ...ui.label, paddingTop: 12, paddingBottom: 12, borderBottom: '1px dotted var(--rule-2)' }}>
              {r.label}
            </div>
            {items.map(m => (
              <div key={m.id + r.label} style={{
                paddingTop: 12, paddingBottom: 12,
                borderBottom: '1px dotted var(--rule-2)',
                fontSize: r.heavy ? 14 : 12.5,
                color: r.heavy ? 'var(--ink)' : 'var(--ink-2)',
                fontFamily: r.mono ? "'JetBrains Mono', monospace" : "'Inter Tight', sans-serif",
                fontWeight: r.heavy ? 500 : 400,
              }}>
                {r.get(m)}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Library });

// ───────── Gallery / Table mode toggle ─────────
function ModeToggle({ mode, setMode }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'stretch',
      border: '1px solid var(--rule-2)',
      height: 26,
    }}>
      {[
        { id: 'gallery', label: 'Gallery', icon: '▦' },
        { id: 'table',   label: 'Table',   icon: '≡' },
      ].map((m, i) => {
        const active = mode === m.id;
        return (
          <button key={m.id} type="button"
            onClick={() => setMode(m.id)}
            title={m.label + ' mode'}
            style={{
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--paper)' : 'var(--ink-3)',
              border: 'none',
              borderLeft: i === 0 ? 'none' : '1px solid var(--rule-2)',
              padding: '0 11px',
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 10.5, letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer', fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            <span style={{ fontSize: 12, lineHeight: 1 }}>{m.icon}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
Object.assign(window, { ModeToggle });
