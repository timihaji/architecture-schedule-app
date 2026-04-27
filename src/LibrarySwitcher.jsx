// Phase B1 — LibrarySwitcher overlay anchored to LibraryMasthead.
// Dropdown variant per design/INTEGRATION_PLAN.md §B1. Per-library palette
// swatches deferred to v2 (V2_BACKLOG §2).

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

  return (
    <div
      role="listbox"
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        left: 0,
        zIndex: 60,
        width: 320,
        background: 'var(--paper)',
        border: '1px solid var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 200px)',
      }}
    >
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid var(--rule)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
      }}>
        <Eyebrow>Libraries</Eyebrow>
        <MetaMono>{String(totalLibs).padStart(2, '0')} TOTAL</MetaMono>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        <SwitcherRow
          code="ALL"
          name="All libraries"
          count={allCount}
          active={activeLibraryId === 'all'}
          system
          onPick={() => onPick('all')}
        />
        <div style={{ height: 4 }} />
        {libraries.map((lib, i) => {
          const count = materials.filter(m => (m.libraryIds || []).includes(lib.id)).length;
          const isActive = activeLibraryId === lib.id;
          const isRenaming = renamingId === lib.id;
          const code = 'LIB-' + String(i + 1).padStart(2, '0');
          if (isRenaming) {
            return (
              <div
                key={lib.id}
                style={{
                  padding: '7px 14px',
                  borderLeft: '2px solid var(--ink)',
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr',
                  gap: 10,
                  alignItems: 'center',
                  minHeight: 32,
                }}
              >
                <MetaMono style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>{code}</MetaMono>
                <input
                  autoFocus
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={submitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitRename();
                    if (e.key === 'Escape') { setRenamingId(null); setRenameVal(''); }
                  }}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--ink)',
                    outline: 'none',
                    fontFamily: "'Newsreader', serif",
                    fontSize: 14,
                    padding: '4px 0',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            );
          }
          return (
            <SwitcherRow
              key={lib.id}
              code={code}
              name={lib.name}
              count={count}
              active={isActive}
              system={lib.system}
              onPick={() => onPick(lib.id)}
              onRename={() => { setRenamingId(lib.id); setRenameVal(lib.name); }}
              onDuplicate={() => onDuplicateLibrary(lib.id)}
              onDelete={lib.system ? null : () => onDeleteLibrary(lib.id)}
            />
          );
        })}
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--rule)' }}>
        {adding ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={() => { if (newName.trim()) submitNew(); else setAdding(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') submitNew();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); }
            }}
            placeholder="Library name"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--ink)',
              outline: 'none',
              fontFamily: "'Newsreader', serif",
              fontSize: 14,
              padding: '4px 0',
              color: 'var(--ink)',
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setAdding(true); setNewName(''); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--accent-ink)',
              fontWeight: 500,
            }}
          >＋ New library</button>
        )}
      </div>
    </div>
  );
}

function SwitcherRow({ code, name, count, active, system, onPick, onRename, onDuplicate, onDelete }) {
  const [hov, setHov] = React.useState(false);
  const showActions = hov && !active && !system && (onRename || onDuplicate || onDelete);
  return (
    <div
      role="option"
      aria-selected={active}
      onClick={onPick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '50px 1fr auto',
        gap: 10,
        alignItems: 'center',
        padding: '7px 14px',
        cursor: 'pointer',
        background: active
          ? 'rgba(20,20,20,0.04)'
          : (hov ? 'var(--tint)' : 'transparent'),
        borderLeft: '2px solid ' + (active ? 'var(--ink)' : 'transparent'),
        transition: 'background 0.1s',
        minHeight: 32,
      }}
    >
      <MetaMono style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>{code}</MetaMono>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 14,
          color: 'var(--ink)',
          fontWeight: active ? 500 : 400,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{name}</div>
        {showActions && (
          <div
            style={{ display: 'flex', gap: 12, marginTop: 3 }}
            onClick={e => e.stopPropagation()}
          >
            {onRename && <SwitcherAction onClick={onRename}>rename</SwitcherAction>}
            {onDuplicate && <SwitcherAction onClick={onDuplicate}>duplicate</SwitcherAction>}
            {onDelete && <SwitcherAction onClick={onDelete} danger>delete</SwitcherAction>}
          </div>
        )}
      </div>
      <MetaMono style={{ fontSize: 10 }}>{String(count).padStart(2, '0')}</MetaMono>
    </div>
  );
}

function SwitcherAction({ children, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: 'var(--font-sans)',
        fontSize: 9.5,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: danger ? 'var(--accent-ink)' : 'var(--ink-3)',
        fontWeight: 500,
      }}
    >{children}</button>
  );
}

Object.assign(window, { LibrarySwitcher });
