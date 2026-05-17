// LibrarySwitcher — page-header dropdown anchored under LibraryMasthead.
// Markup ported from design/handoff/v2/Library.html lines 1143-1311 (the
// LibrarySwitcher with .lib-dropdown / .lib-row body). Each row shows a
// dot + name + description + count, with hover-reveal Edit/× actions.
// CSS lives in index.html alongside the .reg-* block.

function LibrarySwitcher({
  libraries,
  materials,
  activeLibraryId,
  onPick,
  onNewLibrary,
  onEditLibrary,
  onDeleteLibrary,
}) {
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
        const count = libraryCount(lib.id);
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
                  onClick={() => onEditLibrary && onEditLibrary(lib)}
                >Edit</button>
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
        <button
          type="button"
          className="lib-add-btn"
          onClick={() => onNewLibrary && onNewLibrary()}
        >
          <span style={{ fontSize: 16, lineHeight: 1, fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>+</span>
          New library
        </button>
      </div>
    </div>
  );
}

function LibraryModal({ lib, onClose, onSave }) {
  const isEdit = !!lib?.id;
  const [name, setName] = React.useState(lib?.name || '');
  const [desc, setDesc] = React.useState(lib?.description || '');

  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit() {
    const cleanName = name.trim();
    if (!cleanName) return;
    onSave({ id: lib?.id, name: cleanName, description: desc.trim() });
    onClose();
  }

  return (
    <div className="lib-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lib-modal" role="dialog" aria-label={isEdit ? 'Edit library' : 'New library'} aria-modal="true">
        <div className="lib-modal-head">
          <div>
            <div className="eyebrow">I · Library{isEdit ? ' / Edit' : ' / New'}</div>
            <div className="lib-modal-title">{isEdit ? 'Edit library' : 'New library'}</div>
          </div>
          <button type="button" className="drw-close" onClick={onClose}>×</button>
        </div>
        <div className="lib-modal-body">
          <div style={{ marginBottom: 12 }}>
            <label className="lbl-d">Name<span className="req-d">*</span></label>
            <input
              autoFocus
              className="inp-d"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              placeholder="e.g. Project Blackwood"
            />
          </div>
          <div>
            <label className="lbl-d">Description</label>
            <input
              className="inp-d"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              placeholder="Brief note about this library"
            />
          </div>
        </div>
        <div className="lib-modal-foot">
          <button type="button" className="btn-sec-d" onClick={onClose}>Cancel</button>
          <span style={{ flex: 1 }}></span>
          <button
            type="button"
            className="btn-pri-d"
            onClick={submit}
            disabled={!name.trim()}
          >
            {isEdit ? 'Save changes' : 'Create library'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LibrarySwitcher, LibraryModal });
