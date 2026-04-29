// LibrarySwitcher — page-header dropdown anchored under LibraryMasthead.
// Markup ported from design/handoff/v2/Library.html lines 1143-1311 (the
// LibrarySwitcher with .lib-dropdown / .lib-row body). Each row shows a
// dot + name + description + count, with hover-reveal pill actions. The
// inline rename UX (one-shot input, Enter/Escape/blur) is preserved from
// the previous version. CSS lives in index.html alongside the .reg-* block.

function LibrarySwitcher({
  libraries,
  materials,
  activeLibraryId,
  onPick,
  onAddLibrary,
  onRenameLibrary,
  onDuplicateLibrary,
  onDeleteLibrary,
}) {
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [renamingId, setRenamingId] = React.useState(null);
  const [renameVal, setRenameVal] = React.useState('');

  function submitNew() {
    const name = newName.trim();
    if (name) onAddLibrary(name);
    setNewName('');
    setAdding(false);
  }
  function submitRename() {
    const name = renameVal.trim();
    if (name) onRenameLibrary(renamingId, name);
    setRenamingId(null);
    setRenameVal('');
  }

  const allCount = materials.length;
  const totalLibs = libraries.length;
  const userLibCount = libraries.filter(l => !l.system).length;

  function libraryCount(libId) {
    return materials.filter(m => (m.libraryIds || []).includes(libId)).length;
  }

  return (
    <div className="lib-dropdown" role="listbox" onClick={e => e.stopPropagation()}>
      <div className="lib-dropdown-head">
        <span className="lib-dropdown-label">Switch library</span>
        <span className="lib-dropdown-label">{totalLibs + 1} available</span>
      </div>

      {/* All libraries (system row) */}
      <div
        role="option"
        aria-selected={activeLibraryId === 'all'}
        className={'lib-row' + (activeLibraryId === 'all' ? ' active' : '')}
        onClick={() => onPick('all')}
      >
        <div className="lib-row-dot"></div>
        <div className="lib-row-body">
          <div className="lib-row-name">All libraries</div>
          <div className="lib-row-desc">Every product, regardless of library</div>
        </div>
        <span className="lib-row-counts">{String(allCount).padStart(2, '0')}</span>
      </div>

      {libraries.map(lib => {
        const active = activeLibraryId === lib.id;
        const isRenaming = renamingId === lib.id;
        const count = libraryCount(lib.id);
        if (isRenaming) {
          return (
            <div key={lib.id} className={'lib-row' + (active ? ' active' : '')}>
              <div className="lib-row-dot"></div>
              <input
                autoFocus
                className="lib-row-rename-input"
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={submitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitRename();
                  if (e.key === 'Escape') { setRenamingId(null); setRenameVal(''); }
                }}
              />
              <span className="lib-row-counts">{String(count).padStart(2, '0')}</span>
            </div>
          );
        }
        return (
          <div
            key={lib.id}
            role="option"
            aria-selected={active}
            className={'lib-row' + (active ? ' active' : '')}
            onClick={() => onPick(lib.id)}
          >
            <div className="lib-row-dot"></div>
            <div className="lib-row-body">
              <div className="lib-row-name">{lib.name}</div>
              {lib.description && <div className="lib-row-desc">{lib.description}</div>}
            </div>
            <span className="lib-row-counts">{String(count).padStart(2, '0')}</span>
            {!lib.system && (
              <div className="lib-row-actions" onClick={e => e.stopPropagation()}>
                <button
                  className="lib-row-act"
                  onClick={() => { setRenamingId(lib.id); setRenameVal(lib.name); }}
                >Rename</button>
                {onDuplicateLibrary && (
                  <button
                    className="lib-row-act"
                    onClick={() => onDuplicateLibrary(lib.id)}
                  >Duplicate</button>
                )}
                {onDeleteLibrary && userLibCount > 1 && (
                  <button
                    className="lib-row-act del"
                    onClick={() => onDeleteLibrary(lib.id)}
                    title="Delete library"
                  >×</button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="lib-dropdown-foot">
        {adding ? (
          <input
            autoFocus
            className="lib-add-input"
            value={newName}
            placeholder="Library name"
            onChange={e => setNewName(e.target.value)}
            onBlur={() => { if (newName.trim()) submitNew(); else setAdding(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') submitNew();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); }
            }}
          />
        ) : (
          <button
            type="button"
            className="lib-add-btn"
            onClick={() => { setAdding(true); setNewName(''); }}
          >
            <span style={{ fontSize: 16, lineHeight: 1, fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>+</span>
            New library
          </button>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { LibrarySwitcher });
