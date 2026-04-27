// Library — dense editorial spec-book list. Phase B1: inline-disclosure
// masthead owns the page header + library selection; LibrarySwitcher overlay
// holds the libraries list and CRUD that used to live in the sidebar.

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
  return (
    <>
      <window.LibraryMasthead
        libraries={libraries}
        materials={materials}
        activeLibraryId={activeLibraryId}
        setActiveLibraryId={setActiveLibraryId}
        onAdd={onAdd}
        onAddLibrary={onAddLibrary}
        onRenameLibrary={onRenameLibrary}
        onDuplicateLibrary={onDuplicateLibrary}
        onDeleteLibrary={onDeleteLibrary}
      />
      {mode === 'table' ? (
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
          onToggleMaterialInLibrary={onToggleMaterialInLibrary}
          onMoveMaterial={onMoveMaterial}
          onDuplicateMaterial={onDuplicateMaterial}
          onDuplicate={onDuplicate}
          onFindDupes={onFindDupes}
        />
      ) : (
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
          onToggleMaterialInLibrary={onToggleMaterialInLibrary}
          onMoveMaterial={onMoveMaterial}
          onDuplicateMaterial={onDuplicateMaterial}
          onDuplicate={onDuplicate}
          onFindDupes={onFindDupes}
          compareIds={compareIds} toggleCompare={toggleCompare}
          showImagery={showImagery} density={density}
        />
      )}
    </>
  );
}

function LibraryGallery({
  materials, libraries,
  labelTemplates, setLabelTemplates, onOpenLabelBuilder,
  mode, setMode,
  activeLibraryId, setActiveLibraryId,
  onEdit, onAdd, onDelete,
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

  return (
    <div style={{ minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          marginBottom: 18,
        }}>
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
        </div>

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
  );
}

// (Sidebar / sidebar rail / library item code removed — see src/LibrarySwitcher.jsx)

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
// Wraps the shared SegmentedToggle atom. Defaults to Gallery / Table;
// ProjectSpec and CostScheduleV2 pass their own `modes` array via the same
// signature.
function ModeToggle({ mode, setMode, modes }) {
  const items = modes || [
    { id: 'gallery', label: 'Gallery', icon: '▦' },
    { id: 'table',   label: 'Table',   icon: '≡' },
  ];
  return (
    <window.SegmentedToggle
      items={items.map(m => ({ ...m, title: m.label + ' mode' }))}
      active={mode}
      onChange={setMode}
      inactiveColor="var(--ink-3)"
    />
  );
}
Object.assign(window, { ModeToggle });
