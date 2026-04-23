// Library Table — top bar + filters bar + compact sidebar

// ───────── Compact sidebar (180px, denser than Gallery's 220px) ─────────
function LibrarySidebarCompact({ libraries, materials, activeLibraryId, setActiveLibraryId,
  onAddLibrary, onRenameLibrary, onDuplicateLibrary, onDeleteLibrary }) {
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

  return (
    <aside style={{
      borderRight: '1px solid var(--rule)',
      background: 'var(--paper-2)',
      overflowY: 'auto',
      padding: '14px 0',
      minWidth: 0,
    }}>
      <div style={{
        padding: '0 14px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        borderBottom: '1px dotted var(--rule-2)',
      }}>
        <Eyebrow>Libraries</Eyebrow>
        <Mono size={10} color="var(--ink-4)">{libraries.length}</Mono>
      </div>
      <div style={{ padding: '6px 0' }}>
        <SidebarRow
          name="All libraries"
          count={materials.length}
          active={activeLibraryId === 'all'}
          onClick={() => setActiveLibraryId('all')}
        />
        <div style={{ height: 6 }} />
        {libraries.map(lib => {
          const count = materials.filter(m => (m.libraryIds || []).includes(lib.id)).length;
          const isActive = activeLibraryId === lib.id;
          const isRenaming = renamingId === lib.id;
          return (
            <div key={lib.id}>
              {isRenaming ? (
                <input autoFocus value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={submitRename}
                  onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setRenamingId(null); setRenameVal(''); } }}
                  style={{
                    width: 'calc(100% - 14px)', margin: '2px 7px',
                    background: 'transparent',
                    border: 'none', borderBottom: '1px solid var(--ink)',
                    outline: 'none',
                    fontFamily: "'Newsreader', serif", fontSize: 13,
                    padding: '4px 4px', color: 'var(--ink)',
                  }} />
              ) : (
                <SidebarRow
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
      </div>
      <div style={{ padding: '8px 14px', borderTop: '1px dotted var(--rule-2)' }}>
        {adding ? (
          <input autoFocus value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={() => { if (newName.trim()) submitNew(); else setAdding(false); }}
            onKeyDown={e => { if (e.key === 'Enter') submitNew(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
            placeholder="Library name"
            style={{
              width: '100%', background: 'transparent',
              border: 'none', borderBottom: '1px solid var(--ink)', outline: 'none',
              fontFamily: "'Newsreader', serif", fontSize: 13,
              padding: '4px 0', color: 'var(--ink)',
            }} />
        ) : (
          <button type="button"
            onClick={() => { setAdding(true); setNewName(''); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 0',
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--accent-ink)', fontWeight: 500,
            }}>＋ New library</button>
        )}
      </div>
    </aside>
  );
}

function SidebarRow({ name, count, active, onClick, onRename, onDuplicate, onDelete }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 6,
        alignItems: 'center',
        padding: '5px 14px',
        cursor: 'pointer',
        background: active ? 'var(--ink)' : (hov ? 'var(--tint)' : 'transparent'),
        color: active ? 'var(--paper)' : 'var(--ink)',
        borderLeft: '2px solid ' + (active ? 'var(--accent)' : 'transparent'),
        fontFamily: "'Newsreader', serif",
        fontSize: 13, lineHeight: 1.2,
        transition: 'background 0.08s',
      }}
    >
      <span style={{
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        color: active ? 'var(--paper)' : 'var(--ink)',
      }}>{name}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: active ? 'var(--paper-2)' : 'var(--ink-4)',
      }}>{String(count).padStart(2, '0')}</span>
      {hov && !active && (onRename || onDuplicate || onDelete) && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, paddingTop: 2 }}
          onClick={e => e.stopPropagation()}>
          {onRename && <TinyAction onClick={onRename}>rename</TinyAction>}
          {onDuplicate && <TinyAction onClick={onDuplicate}>dup</TinyAction>}
          {onDelete && <TinyAction onClick={onDelete} danger>del</TinyAction>}
        </div>
      )}
    </div>
  );
}

function TinyAction({ children, onClick, danger }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: danger ? 'var(--accent-ink)' : 'var(--ink-3)',
        fontWeight: 500,
      }}>{children}</button>
  );
}

// ───────── Top bar ─────────
function LTTopBar({
  query, setQuery, searchRef,
  mode, setMode,
  labelTemplates, setLabelTemplates, onOpenLabelBuilder,
  onAdd, density, setDensity,
  onOpenColPicker, onOpenCheatsheet, onFindDupes,
  activeLibraryId, libraries, count, total,
}) {
  const activeLib = libraries.find(l => l.id === activeLibraryId);
  const scopeLabel = activeLibraryId === 'all' ? 'All libraries' : (activeLib?.name || 'Library');
  return (
    <div style={{
      padding: '10px 16px',
      borderBottom: '1px solid var(--rule)',
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 14,
      alignItems: 'center',
      background: 'var(--paper)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <span style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)',
            letterSpacing: '0.1em', textTransform: 'uppercase' }}>Vol I</span>
          <span style={{ ...ui.serif, fontSize: 17, color: 'var(--ink)',
            whiteSpace: 'nowrap' }}>{scopeLabel}</span>
          <span style={{ ...ui.mono, fontSize: 10.5, color: 'var(--ink-4)' }}>
            {count === total ? `${total} entries` : `${count} of ${total}`}
          </span>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, maxWidth: 440,
          border: '1px solid var(--rule-2)', padding: '3px 10px',
          background: 'var(--paper-2)' }}>
          <span style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)' }}>/</span>
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search materials…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 12.5,
              color: 'var(--ink)', padding: '3px 0',
            }} />
          {query && (
            <button type="button" onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-4)', fontSize: 13, padding: 0 }}>×</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <DensityToggle density={density} setDensity={setDensity} />
        <Divider />
        {onFindDupes && (
          <button type="button" onClick={onFindDupes} title="Find duplicates"
            style={barBtn}>Find dupes</button>
        )}
        <button type="button" onClick={onOpenColPicker}
          title="Columns"
          style={barBtn}>⊞ Columns</button>
        <LabelFormatQuickPick
          templates={labelTemplates}
          setTemplates={setLabelTemplates}
          onOpenBuilder={() => onOpenLabelBuilder('Global')} />
        <Divider />
        <ModeToggle mode={mode} setMode={setMode} />
        <button type="button" onClick={onOpenCheatsheet}
          title="Keyboard shortcuts ( ? )"
          style={{ ...barBtn, padding: '0 7px' }}>?</button>
        <button type="button" onClick={onAdd}
          style={{
            background: 'var(--ink)', color: 'var(--paper)',
            border: '1px solid var(--ink)',
            padding: '4px 12px',
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer', fontWeight: 500,
          }}>＋ New</button>
      </div>
    </div>
  );
}

const barBtn = {
  background: 'transparent',
  border: '1px solid var(--rule-2)',
  height: 26,
  padding: '0 10px',
  fontFamily: "'Inter Tight', sans-serif",
  fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--ink-2)', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 5,
};

function Divider() {
  return <div style={{ width: 1, height: 18, background: 'var(--rule-2)' }} />;
}

function DensityToggle({ density, setDensity }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--rule-2)', height: 26 }}>
      {[
        { id: 'compact', l: '≣' },
        { id: 'regular', l: '≡' },
        { id: 'comfortable', l: '☰' },
      ].map((d, i) => {
        const active = density === d.id;
        return (
          <button key={d.id} type="button" onClick={() => setDensity(d.id)}
            title={d.id}
            style={{
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--paper)' : 'var(--ink-4)',
              border: 'none',
              borderLeft: i === 0 ? 'none' : '1px solid var(--rule-2)',
              padding: '0 8px',
              fontSize: 13, lineHeight: 1,
              cursor: 'pointer',
            }}>{d.l}</button>
        );
      })}
    </div>
  );
}

// ───────── Kind tabs (groups) ─────────
function LTKindTabs({ materials, kindFilter, setKindFilter }) {
  const KINDS = window.KINDS || [];
  const KIND_GROUPS = window.KIND_GROUPS || [];

  // Count per kind for the active library scope
  const kindCounts = React.useMemo(() => {
    const c = {};
    for (const m of materials) {
      const k = m.kind || 'material';
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [materials]);

  // A group is visible only if it has items OR is 'Finishes' (always show legacy home)
  const visibleGroups = React.useMemo(() => {
    return KIND_GROUPS.filter(g => {
      if (g === 'Finishes') return true;
      return KINDS.some(k => k.group === g && (kindCounts[k.id] || 0) > 0);
    });
  }, [KIND_GROUPS, KINDS, kindCounts]);

  function groupCount(group) {
    return KINDS
      .filter(k => k.group === group)
      .reduce((sum, k) => sum + (kindCounts[k.id] || 0), 0);
  }

  // The kind filter stored in state is actually a kind id OR 'all'. We group-switch
  // by picking the group's primary kind (first in list).
  function setGroup(group) {
    if (group === 'all') { setKindFilter('all'); return; }
    const first = KINDS.find(k => k.group === group);
    if (first) setKindFilter(first.id);
  }

  function groupIsActive(group) {
    if (kindFilter === 'all') return group === 'all';
    const k = KINDS.find(x => x.id === kindFilter);
    return k && k.group === group;
  }

  const totalCount = materials.length;

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      borderBottom: '1px solid var(--rule)',
      background: 'var(--paper)',
      paddingLeft: 16, paddingRight: 16,
      gap: 0,
      overflowX: 'auto',
    }}>
      <Tab
        label="All"
        count={totalCount}
        active={kindFilter === 'all'}
        onClick={() => setGroup('all')}
      />
      <span style={{ width: 1, background: 'var(--rule-2)', margin: '6px 6px' }} />
      {visibleGroups.map(g => (
        <Tab
          key={g}
          label={g}
          count={groupCount(g)}
          active={groupIsActive(g)}
          onClick={() => setGroup(g)}
        />
      ))}
    </div>
  );
}

function Tab({ label, count, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '8px 12px 7px',
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'baseline', gap: 6,
        borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
        marginBottom: -1, // hug the chrome border
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 11.5, letterSpacing: '0.04em',
        color: active ? 'var(--ink)' : 'var(--ink-3)',
        fontWeight: active ? 500 : 400,
        whiteSpace: 'nowrap',
      }}>
      <span>{label}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9.5, color: 'var(--ink-4)',
      }}>{count}</span>
    </button>
  );
}

// ───────── Filters bar ─────────
const FILTER_FIELDS = [
  { id: 'category', label: 'Category', op: 'is', values: ['Timber', 'Stone', 'Composite', 'Metal', 'Paint', 'Textile'] },
  { id: 'supplier', label: 'Supplier', op: 'contains' },
  { id: 'origin',   label: 'Origin',   op: 'contains' },
  { id: 'finish',   label: 'Finish',   op: 'contains' },
  { id: 'unitCost', label: 'Cost',     op: 'lt',  valueType: 'number' },
  { id: 'libraries', label: 'In library', op: 'in-library' },
];

function LTFiltersBar({ filters, setFilters, libraries, materials }) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ field: 'category', op: 'is', value: '' });

  function addChip() {
    if (!draft.value) { setAdding(false); return; }
    setFilters(fs => [...fs, { ...draft }]);
    setAdding(false);
    setDraft({ field: 'category', op: 'is', value: '' });
  }

  function removeChip(i) {
    setFilters(fs => fs.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{
      padding: '7px 16px',
      borderBottom: '1px solid var(--rule)',
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      background: 'var(--paper-2)',
      minHeight: 36,
    }}>
      <span style={{ ...ui.mono, fontSize: 9.5, color: 'var(--ink-4)',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 4 }}>
        FILTER
      </span>
      {filters.map((f, i) => {
        const fieldDef = FILTER_FIELDS.find(ff => ff.id === f.field);
        let valueLabel = f.value;
        if (f.field === 'libraries') {
          const lib = libraries.find(l => l.id === f.value);
          valueLabel = lib ? lib.name : f.value;
        }
        return (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 0,
            background: 'var(--paper)',
            border: '1px solid var(--rule-2)',
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 11,
          }}>
            <span style={{ padding: '3px 6px', color: 'var(--ink-4)' }}>{fieldDef?.label || f.field}</span>
            <span style={{ padding: '3px 3px', color: 'var(--ink-4)' }}>{opLabel(f.op)}</span>
            <span style={{ padding: '3px 8px', color: 'var(--ink)', fontWeight: 500,
              background: 'var(--tint)' }}>{valueLabel}</span>
            <button type="button" onClick={() => removeChip(i)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '3px 6px', color: 'var(--ink-4)', fontSize: 12, lineHeight: 1,
              }}>×</button>
          </div>
        );
      })}
      {adding ? (
        <AddFilterControl
          draft={draft} setDraft={setDraft}
          libraries={libraries}
          onAdd={addChip}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          style={{
            background: 'transparent', border: '1px dashed var(--rule-2)',
            padding: '3px 10px', cursor: 'pointer',
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 10.5, letterSpacing: '0.06em',
            color: 'var(--ink-3)',
          }}>＋ Add filter</button>
      )}
      {filters.length > 0 && (
        <button type="button" onClick={() => setFilters([])}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '3px 6px',
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ink-4)', marginLeft: 'auto',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-ink)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-4)'}
        >Clear all</button>
      )}
    </div>
  );
}

function opLabel(op) {
  if (op === 'is') return 'is';
  if (op === 'contains') return 'contains';
  if (op === 'lt') return '<';
  if (op === 'gt') return '>';
  if (op === 'in-library') return 'in';
  return op;
}

function AddFilterControl({ draft, setDraft, libraries, onAdd, onCancel }) {
  const fieldDef = FILTER_FIELDS.find(f => f.id === draft.field);
  React.useEffect(() => {
    setDraft(d => ({ ...d, op: fieldDef?.op || 'contains', value: '' }));
  }, [draft.field]);

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 0,
      border: '1px solid var(--ink)',
    }}>
      <select value={draft.field}
        onChange={e => setDraft(d => ({ ...d, field: e.target.value }))}
        style={filterInput}>
        {FILTER_FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
      <span style={{
        padding: '3px 6px',
        fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
        color: 'var(--ink-4)',
        borderLeft: '1px solid var(--rule-2)', borderRight: '1px solid var(--rule-2)',
      }}>{opLabel(draft.op)}</span>
      {fieldDef?.values ? (
        <select autoFocus value={draft.value}
          onChange={e => setDraft(d => ({ ...d, value: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') onAdd(); if (e.key === 'Escape') onCancel(); }}
          style={filterInput}>
          <option value="">—</option>
          {fieldDef.values.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      ) : fieldDef?.id === 'libraries' ? (
        <select autoFocus value={draft.value}
          onChange={e => setDraft(d => ({ ...d, value: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') onAdd(); if (e.key === 'Escape') onCancel(); }}
          style={filterInput}>
          <option value="">—</option>
          {libraries.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      ) : (
        <input autoFocus value={draft.value}
          type={fieldDef?.valueType === 'number' ? 'number' : 'text'}
          onChange={e => setDraft(d => ({ ...d, value: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') onAdd(); if (e.key === 'Escape') onCancel(); }}
          placeholder="value"
          style={{ ...filterInput, width: 100 }} />
      )}
      <button type="button" onClick={onAdd}
        style={{ ...barBtn, border: 'none', background: 'var(--ink)',
          color: 'var(--paper)', height: 26, padding: '0 10px' }}>Add</button>
      <button type="button" onClick={onCancel}
        style={{ ...barBtn, border: 'none', height: 26, padding: '0 8px' }}>×</button>
    </div>
  );
}

const filterInput = {
  background: 'transparent',
  border: 'none',
  padding: '3px 8px',
  fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
  color: 'var(--ink)',
  outline: 'none',
};

Object.assign(window, { LibrarySidebarCompact, LTTopBar, LTKindTabs, LTFiltersBar, DensityToggle });
