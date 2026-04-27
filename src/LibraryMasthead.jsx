// Phase B1 — Library page masthead. Inline-disclosure variant per
// design/INTEGRATION_PLAN.md §B1: eyebrow + serif title (active library) +
// chevron toggles LibrarySwitcher overlay. Right side: + Add Product.

function LibraryMasthead({
  libraries,
  materials,
  activeLibraryId,
  setActiveLibraryId,
  onAdd,
  onAddLibrary,
  onRenameLibrary,
  onDuplicateLibrary,
  onDeleteLibrary,
}) {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef(null);

  const activeLib = libraries.find(l => l.id === activeLibraryId);
  const activeIsAll = activeLibraryId === 'all';
  const titleText = activeIsAll ? 'All libraries' : (activeLib?.name || 'Library');
  const supplierCount = React.useMemo(() => {
    const scoped = activeIsAll
      ? materials
      : materials.filter(m => (m.libraryIds || []).includes(activeLibraryId));
    return new Set(scoped.map(m => m.supplier).filter(Boolean)).size;
  }, [materials, activeLibraryId, activeIsAll]);
  const productCount = activeIsAll
    ? materials.length
    : materials.filter(m => (m.libraryIds || []).includes(activeLibraryId)).length;

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      padding: '8px 0 22px',
      marginBottom: 22,
      borderBottom: '1px solid var(--rule)',
    }}>
      <div ref={wrapperRef} style={{ position: 'relative', minWidth: 0, flex: 1 }}>
        <Eyebrow style={{ marginBottom: 8 }}>Library</Eyebrow>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          onMouseEnter={e => {
            const c = e.currentTarget.querySelector('[data-chev]');
            if (c) c.style.color = 'var(--ink)';
          }}
          onMouseLeave={e => {
            const c = e.currentTarget.querySelector('[data-chev]');
            if (c) c.style.color = open ? 'var(--ink)' : 'var(--ink-4)';
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 14,
            fontFamily: "'Newsreader', serif",
            fontWeight: 300,
            fontSize: 48,
            letterSpacing: '-0.015em',
            lineHeight: 1.05,
            color: 'var(--ink)',
            textAlign: 'left',
            maxWidth: '100%',
          }}
        >
          <span style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{titleText}</span>
          <span data-chev style={{
            display: 'inline-block',
            fontFamily: 'var(--font-sans)',
            fontSize: 18,
            color: open ? 'var(--ink)' : 'var(--ink-4)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s, color 0.12s',
            lineHeight: 1,
            flexShrink: 0,
          }}>▾</span>
        </button>
        <div style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <MetaMono>{String(productCount).padStart(2, '0')} PRODUCTS</MetaMono>
          {supplierCount > 0 && (
            <>
              <span style={{ color: 'var(--rule-2)' }}>·</span>
              <MetaMono>{String(supplierCount).padStart(2, '0')} SUPPLIERS</MetaMono>
            </>
          )}
        </div>

        {open && (
          <window.LibrarySwitcher
            libraries={libraries}
            materials={materials}
            activeLibraryId={activeLibraryId}
            onPick={(id) => { setActiveLibraryId(id); setOpen(false); }}
            onAddLibrary={onAddLibrary}
            onRenameLibrary={onRenameLibrary}
            onDuplicateLibrary={onDuplicateLibrary}
            onDeleteLibrary={onDeleteLibrary}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <window.PrimaryButton onClick={onAdd}>＋ Add Product</window.PrimaryButton>
      </div>
    </div>
  );
}

Object.assign(window, { LibraryMasthead });
