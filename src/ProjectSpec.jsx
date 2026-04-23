// Project Spec — the outgoing bill-of-materials for a project.
//
// Unlike Cost Schedule (which compares options side-by-side), the Spec is the
// single agreed list of kit specified for this project: one row per item, in
// trade sections, with a supplier-ready summary. Rows are references into the
// Library (materialId) plus project-scoped qty/unit/tags/notes.
//
// Storage: aml-spec-<projectId>  →  { version, sections: [{trade, rowIds}], rows: {[id]: row} }
// Row shape:  { id, materialId, qty, unit, tags, note }
//   — trade is derived from the section the row lives in, not stored on the row.

function ProjectSpec({ materials, projects, libraries, labelTemplates,
  activeProjectId, setActiveProjectId, onUpdateProject, density }) {

  // Resolve
  const project = React.useMemo(() => {
    if (activeProjectId) {
      const p = projects.find(x => x.id === activeProjectId);
      if (p) return p;
    }
    return projects[0];
  }, [projects, activeProjectId]);

  if (!project) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <Eyebrow>No project selected</Eyebrow>
        <div style={{ marginTop: 20, ...ui.mono, color: 'var(--ink-3)', fontSize: 13 }}>
          Create a project in Volume II to begin specifying.
        </div>
      </div>
    );
  }

  const storageKey = 'aml-spec-' + project.id;
  const [spec, setSpec] = React.useState(() => loadSpec(storageKey, project, materials));
  const [drawer, setDrawer] = React.useState(null);  // { trade } | null
  const [tagFilter, setTagFilter] = React.useState(null);

  React.useEffect(() => {
    setSpec(loadSpec(storageKey, project, materials));
  }, [project.id]);

  React.useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(spec)); } catch {}
  }, [spec, storageKey]);

  const update = (fn) => setSpec(s => fn(s));

  // ───── Row / section ops
  function addRow(trade, materialId) {
    const m = materials.find(x => x.id === materialId);
    if (!m) return;
    update(s => {
      const id = 'r-' + Math.random().toString(36).slice(2, 8);
      const row = {
        id,
        materialId,
        qty: '',
        unit: m.unit || 'ea',
        tags: [],
        note: '',
      };
      const sections = s.sections.slice();
      let idx = sections.findIndex(sec => sec.trade === trade);
      if (idx < 0) { sections.push({ trade, rowIds: [] }); idx = sections.length - 1; }
      sections[idx] = { ...sections[idx], rowIds: [...sections[idx].rowIds, id] };
      return { ...s, sections, rows: { ...s.rows, [id]: row } };
    });
  }
  function removeRow(rowId) {
    update(s => {
      const { [rowId]: _, ...rest } = s.rows;
      const sections = s.sections.map(sec => ({
        ...sec,
        rowIds: sec.rowIds.filter(x => x !== rowId),
      }));
      return { ...s, sections, rows: rest };
    });
  }
  function updateRow(rowId, patch) {
    update(s => ({ ...s, rows: { ...s.rows, [rowId]: { ...s.rows[rowId], ...patch } } }));
  }
  function addSection(trade) {
    update(s => {
      if (s.sections.some(sec => sec.trade === trade)) return s;
      return { ...s, sections: [...s.sections, { trade, rowIds: [] }] };
    });
  }

  // ───── Library scoping (reuse project.libraryIds)
  const projectLibIds = project.libraryIds || [];
  const scopedMaterials = React.useMemo(() => {
    if (projectLibIds.length === 0) return materials;
    return materials.filter(m => (m.libraryIds || []).some(lid => projectLibIds.includes(lid)));
  }, [materials, projectLibIds.join('|')]);

  // ───── Totals
  const totals = React.useMemo(() => {
    const bySection = {};
    let grand = 0;
    spec.sections.forEach(sec => {
      let sub = 0;
      sec.rowIds.forEach(rid => {
        const r = spec.rows[rid];
        if (!r) return;
        const m = materials.find(x => x.id === r.materialId);
        if (!m) return;
        const q = parseFloat(r.qty) || 0;
        sub += q * (m.unitCost || 0);
      });
      bySection[sec.trade] = sub;
      grand += sub;
    });
    return { bySection, grand };
  }, [spec, materials]);

  // ───── All tags used in this spec (for filter pills)
  const allTags = React.useMemo(() => {
    const set = new Set();
    Object.values(spec.rows).forEach(r => (r.tags || []).forEach(t => set.add(t)));
    return [...set].sort();
  }, [spec]);

  const itemCount = Object.keys(spec.rows).length;

  return (
    <div style={{ position: 'relative' }}>
      <SpecHeader
        spec={spec}
        project={project}
        projects={projects}
        setActiveProjectId={setActiveProjectId}
        itemCount={itemCount}
        grand={totals.grand}
        onTitleChange={v => update(s => ({ ...s, title: v }))}
      />

      {allTags.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, alignItems: 'baseline',
          padding: '0 0 18px',
          flexWrap: 'wrap',
        }}>
          <Eyebrow style={{ marginRight: 8 }}>Filter by tag</Eyebrow>
          <TagPill label="All" active={!tagFilter} onClick={() => setTagFilter(null)} />
          {allTags.map(t => (
            <TagPill key={t} label={t} active={tagFilter === t}
              onClick={() => setTagFilter(tagFilter === t ? null : t)} />
          ))}
        </div>
      )}

      {spec.sections.length === 0 && (
        <EmptyState onPick={t => { addSection(t); setDrawer({ trade: t }); }} />
      )}

      {spec.sections.map(sec => (
        <TradeSection
          key={sec.trade}
          trade={sec.trade}
          rowIds={sec.rowIds}
          rows={spec.rows}
          materials={materials}
          labelTemplates={labelTemplates}
          subtotal={totals.bySection[sec.trade] || 0}
          tagFilter={tagFilter}
          onAdd={() => setDrawer({ trade: sec.trade })}
          onRemoveRow={removeRow}
          onUpdateRow={updateRow}
        />
      ))}

      {/* Add trade section button */}
      {spec.sections.length > 0 && (
        <AddTradeRow existing={spec.sections.map(s => s.trade)} onAdd={addSection} />
      )}

      {drawer && (
        <PickerDrawer
          trade={drawer.trade}
          materials={scopedMaterials}
          labelTemplates={labelTemplates}
          libraries={libraries}
          alreadyUsed={new Set(Object.values(spec.rows).map(r => r.materialId))}
          onClose={() => setDrawer(null)}
          onPick={(mid) => { addRow(drawer.trade, mid); }}
        />
      )}
    </div>
  );
}

// ───────── Header (project switcher + title + summary) ─────────

function SpecHeader({ spec, project, projects, setActiveProjectId, itemCount, grand, onTitleChange }) {
  const [editingTitle, setEditingTitle] = React.useState(false);
  return (
    <header style={{ marginBottom: 28 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 24,
        alignItems: 'end', paddingBottom: 18,
        borderBottom: '1px solid var(--ink)',
      }}>
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>IV · Project Spec</Eyebrow>
          {editingTitle ? (
            <input autoFocus value={spec.title}
              onChange={e => onTitleChange(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false); }}
              style={{
                ...ui.serif, fontSize: 32, fontWeight: 400,
                background: 'transparent', border: 'none',
                borderBottom: '1px dotted var(--ink)', width: '100%',
                padding: '2px 0', outline: 'none', color: 'var(--ink)',
              }} />
          ) : (
            <Serif size={32} style={{ display: 'block', cursor: 'text' }}
              onClick={() => setEditingTitle(true)}>
              {spec.title}
            </Serif>
          )}
          <div style={{
            display: 'flex', gap: 22, alignItems: 'baseline', marginTop: 10,
          }}>
            <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {project.code || project.id}
            </Mono>
            <span style={{ ...ui.serif, fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}>
              {project.name}
            </span>
            {project.client && (
              <span style={{ ...ui.mono, fontSize: 10.5, color: 'var(--ink-4)',
                letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                for {project.client}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 32, alignItems: 'baseline' }}>
          <Stat label="Items" value={itemCount} />
          <Stat label="Indicative total" value={grand ? fmtCurrency(grand) : '—'} big />
          <div style={{ textAlign: 'right' }}>
            <Eyebrow style={{ marginBottom: 6 }}>Project</Eyebrow>
            <select value={project.id} onChange={e => setActiveProjectId(e.target.value)}
              style={{
                background: 'transparent', border: 'none',
                borderBottom: '1px dotted var(--ink)',
                fontFamily: "'Newsreader', serif", fontSize: 15,
                padding: '2px 0', outline: 'none', color: 'var(--ink)', cursor: 'pointer',
              }}>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code || p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, big }) {
  return (
    <div>
      <Eyebrow style={{ marginBottom: 4 }}>{label}</Eyebrow>
      <div style={{
        ...ui.mono, fontSize: big ? 22 : 17,
        fontWeight: big ? 500 : 400, color: 'var(--ink)',
      }}>{value}</div>
    </div>
  );
}

function TagPill({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: active ? 'var(--ink)' : 'transparent',
      color: active ? 'var(--paper)' : 'var(--ink-2)',
      border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
      padding: '3px 10px', cursor: 'pointer',
      fontFamily: "'Inter Tight', sans-serif",
      fontSize: 11, letterSpacing: '0.04em',
      fontWeight: active ? 500 : 400,
    }}>{label}</button>
  );
}

// ───────── Trade section ─────────

function TradeSection({ trade, rowIds, rows, materials, labelTemplates,
  subtotal, tagFilter, onAdd, onRemoveRow, onUpdateRow }) {

  const visibleIds = tagFilter
    ? rowIds.filter(id => (rows[id]?.tags || []).includes(tagFilter))
    : rowIds;

  return (
    <section style={{ marginBottom: 40 }}>
      <header style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16,
        alignItems: 'baseline', padding: '14px 0 8px',
        borderBottom: '1px solid var(--ink)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <Serif size={20} style={{ fontWeight: 500 }}>{trade}</Serif>
          <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {rowIds.length} {rowIds.length === 1 ? 'item' : 'items'}
          </Mono>
        </div>
        <Mono size={13} color="var(--ink-2)" style={{ fontWeight: 500 }}>
          {subtotal ? fmtCurrency(subtotal) : '—'}
        </Mono>
        <button type="button" onClick={onAdd} style={{
          background: 'none', border: '1px solid var(--rule-2)',
          padding: '4px 10px', cursor: 'pointer',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ink-2)',
        }}>+ Add item</button>
      </header>

      {visibleIds.length === 0 && (
        <div style={{
          padding: '14px 0', borderBottom: '1px solid var(--rule)',
          ...ui.mono, fontSize: 11, color: 'var(--ink-4)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          fontStyle: 'italic',
        }}>
          {tagFilter ? 'No items match filter' : 'No items specified — click + Add item above'}
        </div>
      )}

      {visibleIds.map(rid => {
        const r = rows[rid];
        const m = materials.find(x => x.id === r.materialId);
        return (
          <SpecRow key={rid} row={r} material={m} labelTemplates={labelTemplates}
            onUpdate={patch => onUpdateRow(rid, patch)}
            onRemove={() => onRemoveRow(rid)} />
        );
      })}
    </section>
  );
}

// ───────── Spec row ─────────

function SpecRow({ row, material, labelTemplates, onUpdate, onRemove }) {
  const [hov, setHov] = React.useState(false);
  if (!material) {
    return (
      <div style={{
        padding: '10px 0', borderBottom: '1px solid var(--rule)',
        ...ui.mono, fontSize: 11, color: 'var(--accent-ink)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>↯ Material missing — was deleted from Library</span>
        <button onClick={onRemove} style={smallIconBtn}>Remove</button>
      </div>
    );
  }
  const q = parseFloat(row.qty) || 0;
  const total = q * (material.unitCost || 0);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr 140px 88px 120px 100px 22px',
        gap: 14, alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid var(--rule)',
        background: hov ? 'var(--tint)' : 'transparent',
      }}>
      <Swatch swatch={material.swatch} size="xs"
        seed={parseInt(material.id.slice(2)) || 1}
        style={{ width: 34, height: 34 }} />

      <div style={{ minWidth: 0 }}>
        <div style={{
          ...ui.serif, fontSize: 14, lineHeight: 1.2, color: 'var(--ink)',
        }}>
          {window.formatLabel(material, labelTemplates)}
        </div>
        <div style={{
          display: 'flex', gap: 12, alignItems: 'baseline', marginTop: 2,
        }}>
          <Mono size={10} color="var(--ink-4)">{material.code}</Mono>
          {material.supplier && (
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{material.supplier}</span>
          )}
        </div>
      </div>

      <input
        value={row.note || ''}
        onChange={e => onUpdate({ note: e.target.value })}
        placeholder="Location / note"
        style={{
          background: 'transparent', border: 'none',
          borderBottom: '1px dotted transparent',
          fontFamily: "'Newsreader', serif", fontSize: 13,
          padding: '2px 0', outline: 'none', width: '100%',
          fontStyle: row.note ? 'normal' : 'italic',
          color: row.note ? 'var(--ink)' : 'var(--ink-4)',
        }}
        onFocus={e => e.target.style.borderBottomColor = 'var(--ink)'}
        onBlur={e => e.target.style.borderBottomColor = 'transparent'} />

      <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
        <input
          value={row.qty}
          onChange={e => onUpdate({ qty: e.target.value })}
          placeholder="—"
          style={{
            background: 'transparent', border: 'none',
            borderBottom: '1px dotted var(--rule-2)',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
            textAlign: 'right', width: 48, outline: 'none',
            color: 'var(--ink)', padding: '2px 0',
          }} />
        <select value={row.unit} onChange={e => onUpdate({ unit: e.target.value })}
          style={{
            background: 'transparent', border: 'none',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: 'var(--ink-3)', outline: 'none', cursor: 'pointer',
          }}>
          {['m²','l/m','ea','each','sheet','set','item'].map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      <Mono size={11} color="var(--ink-4)" style={{ textAlign: 'right' }}>
        {fmtCurrency(material.unitCost)}<span style={{ opacity: 0.6 }}> / {material.unit}</span>
      </Mono>

      <Mono size={13} color="var(--ink)" style={{ textAlign: 'right', fontWeight: 500 }}>
        {total ? fmtCurrency(total) : '—'}
      </Mono>

      <button type="button" onClick={onRemove} title="Remove"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: hov ? 'var(--ink-4)' : 'transparent',
          fontSize: 14, padding: 0, transition: 'color 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = hov ? 'var(--ink-4)' : 'transparent'}
      >×</button>
    </div>
  );
}

// ───────── Empty state ─────────

function EmptyState({ onPick }) {
  const starters = ['Joinery', 'Paints & Finishes', 'Tiling', 'Flooring', 'Electrical', 'Plumbing'];
  return (
    <div style={{
      padding: '60px 0 40px', textAlign: 'center',
      border: '1px dashed var(--rule-2)', marginBottom: 30,
    }}>
      <Eyebrow>Empty spec</Eyebrow>
      <Serif size={22} style={{ display: 'block', marginTop: 10, fontStyle: 'italic' }}>
        Start by adding a trade section
      </Serif>
      <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {starters.map(t => (
          <button key={t} type="button" onClick={() => onPick(t)} style={{
            background: 'var(--paper-2)', border: '1px solid var(--rule-2)',
            padding: '6px 12px', cursor: 'pointer',
            fontFamily: "'Newsreader', serif", fontSize: 13,
            color: 'var(--ink-2)',
          }}>{t}</button>
        ))}
      </div>
    </div>
  );
}

// ───────── Add trade row ─────────

function AddTradeRow({ existing, onAdd }) {
  const [open, setOpen] = React.useState(false);
  const available = (window.TRADES || []).filter(t => !existing.includes(t));
  if (available.length === 0) return null;
  return (
    <div style={{ padding: '18px 0', borderTop: '1px dotted var(--rule-2)' }}>
      {open ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <Eyebrow style={{ marginRight: 8 }}>Add trade section</Eyebrow>
          {available.map(t => (
            <button key={t} type="button" onClick={() => { onAdd(t); setOpen(false); }} style={{
              background: 'transparent', border: '1px solid var(--rule-2)',
              padding: '4px 10px', cursor: 'pointer',
              fontFamily: "'Newsreader', serif", fontSize: 12, color: 'var(--ink-2)',
            }}>{t}</button>
          ))}
          <button type="button" onClick={() => setOpen(false)} style={smallIconBtn}>Close</button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}>+ Add trade section</button>
      )}
    </div>
  );
}

// ───────── Picker drawer (right-side slide-out) ─────────

function PickerDrawer({ trade, materials, labelTemplates, libraries, alreadyUsed, onClose, onPick }) {
  const [query, setQuery] = React.useState('');
  const [kind, setKind] = React.useState('all');

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const kindOptions = React.useMemo(() => {
    const set = new Set();
    materials.forEach(m => set.add(m.kind || 'material'));
    return ['all', ...[...set].sort()];
  }, [materials]);

  const filtered = React.useMemo(() => {
    let list = materials.slice();
    if (kind !== 'all') list = list.filter(m => (m.kind || 'material') === kind);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(m => {
        const label = window.formatLabel(m, labelTemplates);
        return (label + ' ' + m.name + ' ' + m.supplier + ' ' + m.code).toLowerCase().includes(q);
      });
    }
    // Rank: trade-match first, then rest
    const match = list.filter(m => (m.trade || '') === trade);
    const other = list.filter(m => (m.trade || '') !== trade);
    return { match, other };
  }, [materials, kind, query, trade]);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.35)',
        zIndex: 80, animation: 'fadeIn 0.15s ease',
      }} />
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(520px, 100%)',
        background: 'var(--paper)',
        borderLeft: '1px solid var(--ink)',
        zIndex: 81,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInR 0.2s ease',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ padding: '22px 26px 14px', borderBottom: '1px solid var(--ink)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <Eyebrow>Add to</Eyebrow>
              <Serif size={22} style={{ display: 'block', marginTop: 4 }}>{trade}</Serif>
            </div>
            <button type="button" onClick={onClose} style={smallIconBtn}>Close ×</button>
          </div>
          <input value={query} onChange={e => setQuery(e.target.value)}
            autoFocus placeholder="Search the library…"
            style={{
              marginTop: 14, width: '100%',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--ink)',
              fontFamily: "'Newsreader', serif", fontSize: 16,
              padding: '6px 0', outline: 'none', color: 'var(--ink)',
            }} />
          <div style={{ display: 'flex', gap: 2, marginTop: 10, flexWrap: 'wrap' }}>
            {kindOptions.map(k => {
              const active = kind === k;
              const label = k === 'all' ? 'All kinds'
                : (window.kindById && window.kindById(k)?.label) || k;
              return (
                <button key={k} type="button" onClick={() => setKind(k)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '3px 8px 3px 0',
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 11, color: active ? 'var(--ink)' : 'var(--ink-4)',
                  fontWeight: active ? 500 : 400,
                  borderBottom: '1px solid ' + (active ? 'var(--ink)' : 'transparent'),
                  marginRight: 6,
                }}>{label}</button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 26px 20px' }}>
          {filtered.match.length > 0 && (
            <PickGroup heading={`Matches "${trade}"`}
              items={filtered.match} labelTemplates={labelTemplates}
              alreadyUsed={alreadyUsed} onPick={onPick} />
          )}
          {filtered.other.length > 0 && (
            <PickGroup heading="Other"
              items={filtered.other} labelTemplates={labelTemplates}
              alreadyUsed={alreadyUsed} onPick={onPick} />
          )}
          {filtered.match.length + filtered.other.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Mono size={12} color="var(--ink-4)">No materials match</Mono>
            </div>
          )}
        </div>
        <div style={{ padding: '10px 26px', borderTop: '1px solid var(--rule)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Mono size={10} color="var(--ink-4)">
            {filtered.match.length + filtered.other.length} available · Esc to close
          </Mono>
        </div>
      </aside>
      <style>{`
        @keyframes slideInR { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

function PickGroup({ heading, items, labelTemplates, alreadyUsed, onPick }) {
  return (
    <>
      <div style={{
        ...ui.mono, fontSize: 9.5, color: 'var(--ink-4)',
        letterSpacing: '0.14em', textTransform: 'uppercase',
        padding: '14px 0 6px', borderBottom: '1px dotted var(--rule-2)',
      }}>
        {heading} · {items.length}
      </div>
      {items.map(m => {
        const used = alreadyUsed.has(m.id);
        return (
          <div key={m.id} onClick={() => onPick(m.id)} style={{
            display: 'grid', gridTemplateColumns: '36px 1fr 90px', gap: 12,
            alignItems: 'center', padding: '10px 0',
            borderBottom: '1px solid var(--rule)', cursor: 'pointer',
            opacity: used ? 0.5 : 1,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Swatch swatch={m.swatch} size="sm"
              seed={parseInt(m.id.slice(2)) || 1}
              style={{ width: 34, height: 34 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ ...ui.serif, fontSize: 13.5, lineHeight: 1.2, color: 'var(--ink)' }}>
                {window.formatLabel(m, labelTemplates)}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 2 }}>
                <Mono size={10} color="var(--ink-4)">{m.code}</Mono>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.supplier}</span>
                {used && (
                  <span style={{ ...ui.mono, fontSize: 9, color: 'var(--accent-ink)',
                    letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Already in spec
                  </span>
                )}
              </div>
            </div>
            <Mono size={11} color="var(--ink-2)" style={{ textAlign: 'right' }}>
              {fmtCurrency(m.unitCost)}<span style={{ color: 'var(--ink-4)' }}> / {m.unit}</span>
            </Mono>
          </div>
        );
      })}
    </>
  );
}

// ───────── Styles / helpers ─────────

const smallIconBtn = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--ink-4)', fontWeight: 500,
};

// ───────── Persistence + seed ─────────

function loadSpec(storageKey, project, materials) {
  try {
    const v = localStorage.getItem(storageKey);
    if (v) {
      const parsed = JSON.parse(v);
      if (parsed && parsed.rows && parsed.sections) {
        return { title: parsed.title || 'Project Specification', ...parsed };
      }
    }
  } catch {}
  const seeded = window.SEED_SPECS && window.SEED_SPECS[project.id];
  if (seeded && seeded.rows && seeded.sections) {
    return { title: seeded.title || 'Project Specification', ...seeded };
  }
  if (project.id === 'p-brunswick') return brunswickSpecSeed(materials);
  return blankSpec();
}

function blankSpec() {
  return {
    version: 1,
    title: 'Project Specification',
    sections: [],
    rows: {},
  };
}

function brunswickSpecSeed(materials) {
  // Try to locate a handful of real library items by code fragments;
  // fall back silently if the user has stripped seeds.
  const byCode = (frag) => materials.find(m => (m.code || '').toLowerCase().includes(frag.toLowerCase()));
  const byName = (frag) => materials.find(m => (m.name || '').toLowerCase().includes(frag.toLowerCase()));
  const pick = (...tries) => {
    for (const t of tries) {
      const m = typeof t === 'function' ? t() : t;
      if (m) return m;
    }
    return null;
  };

  const rows = {};
  const sections = [];
  let rn = 1;
  const add = (trade, mat, qty, unit, note) => {
    if (!mat) return;
    const id = 'r-seed-' + String(rn++).padStart(3, '0');
    rows[id] = { id, materialId: mat.id, qty: String(qty || ''), unit: unit || mat.unit || 'ea',
      tags: [], note: note || '' };
    let sec = sections.find(s => s.trade === trade);
    if (!sec) { sec = { trade, rowIds: [] }; sections.push(sec); }
    sec.rowIds.push(id);
  };

  add('Carpentry', pick(() => byName('Cedar'), () => byCode('TIM')), '18.4', 'm²', 'Street-facing castellation');
  add('Joinery',   pick(() => byName('Veneer'), () => byCode('VEN')), '6.2', 'm²', 'Kitchen island + tall units');
  add('Joinery',   pick(() => byName('Melamine'), () => byCode('MEL')), '9.8', 'm²', 'Base cab. carcases');
  add('Paints & Finishes', pick(() => byCode('PAI'), () => byName('White')), '42', 'm²', 'Walls + ceilings generally');
  add('Tiling',    pick(() => byCode('TIL'), () => byName('Tile')), '6.4', 'm²', 'Ensuite wet zone');
  add('Stonework', pick(() => byCode('STN'), () => byName('Marble')), '2.6', 'm²', 'Kitchen benchtop + splashback');
  add('Electrical', pick(() => byCode('LIT'), () => byName('Pendant')), '4', 'ea', 'Dining + hallway');

  return {
    version: 1,
    title: 'Specification — Brunswick House',
    sections,
    rows,
  };
}

Object.assign(window, { ProjectSpec });
