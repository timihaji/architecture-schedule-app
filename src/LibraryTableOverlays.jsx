// Library Table — side panel, column picker, bulk bar, command palette, cheatsheet

// ───────── Side panel (Linear-style right drawer) ─────────
function LTSidePanel({ material: m, materials, libraries, labelTemplates,
  onClose, onEdit, onDelete, onNavigateTo }) {
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    // handled by global listener but keep local as safety
    return () => {};
  }, []);

  if (!m) return null;
  const label = window.formatLabel(m, labelTemplates);
  const mLibs = libraries.filter(l => (m.libraryIds || []).includes(l.id));
  const linkedPaint = m.paintedWithId ? materials.find(x => x.id === m.paintedWithId) : null;
  const usedByPaintable = m.category === 'Paint'
    ? materials.filter(x => x.paintedWithId === m.id) : [];

  const swatchFor = (m.swatch?.inheritTone && linkedPaint)
    ? { ...m.swatch, tone: linkedPaint.swatch?.tone } : m.swatch;

  return (
    <div style={{
      borderLeft: '1px solid var(--rule)',
      background: 'var(--paper)',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      minHeight: 0,
    }}>
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid var(--rule)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.12em' }}>
            {m.code}
          </Mono>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '2px 6px', border: '1px solid var(--rule-2)',
            color: 'var(--ink-3)', background: 'var(--paper-2)',
            whiteSpace: 'nowrap',
          }}>
            {((window.kindById && window.kindById(m.kind))?.label) || 'Material'}
          </span>
          {m.trade && (
            <span style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 10, color: 'var(--ink-3)',
              whiteSpace: 'nowrap',
            }}>· {m.trade}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={onEdit}
            title="Edit entry (E)"
            style={panelBtn}>E</button>
          <button type="button" onClick={onClose}
            title="Close panel (Esc)"
            style={panelBtn}>×</button>
        </div>
      </div>

      <div style={{ padding: '18px 18px 12px' }}>
        <Swatch swatch={swatchFor} size="lg"
          seed={parseInt(m.id.slice(2)) || 1}
          glyph={m.kind && m.kind !== 'material' && window.subtypeGlyph
            ? window.subtypeGlyph(m.kind, m.subtype) : null}
          style={{ width: '100%', aspectRatio: '3/2', marginBottom: 14 }} />
        <Serif size={22} style={{ lineHeight: 1.15, display: 'block' }}>{label}</Serif>
        {m.customName && (
          <Mono size={10} color="var(--accent-ink)"
            style={{ letterSpacing: '0.1em', textTransform: 'uppercase',
              display: 'inline-block', marginTop: 6 }}>Custom label</Mono>
        )}
      </div>

      <div style={{ padding: '0 18px 18px' }}>
        <PanelKV label="Supplier" value={m.supplier} />
        <PanelKV label="Origin"   value={m.origin} />
        <PanelKV label="Finish"   value={m.finish} />
        {m.category === 'Paint' ? (
          <>
            <PanelKV label="Brand"     value={m.brand} />
            <PanelKV label="Colour"    value={m.colourName} />
            <PanelKV label="Sheen"     value={m.sheen} />
            <PanelKV label="LRV"       value={m.lrv} />
          </>
        ) : (m.kind === 'appliance' || m.kind === 'fitting') ? (
          <>
            <PanelKV label="Model"     value={m.model} />
            <PanelKV label="Finish"    value={m.finish} />
            <PanelKV label="Dimensions" value={m.dimensions} />
            <PanelKV label="Rough-in"  value={m.roughIn} />
            <PanelKV label="Power"     value={m.power} />
          </>
        ) : (m.kind === 'light') ? (
          <>
            <PanelKV label="Model"     value={m.model} />
            <PanelKV label="Lamp"      value={m.lamp} />
            <PanelKV label="Wattage"   value={m.wattage} />
            <PanelKV label="Colour temp" value={m.kelvin} />
            <PanelKV label="Dimmable"  value={m.dimmable} />
          </>
        ) : (m.kind && m.kind.startsWith('ffe-')) ? (
          <>
            <PanelKV label="Model"     value={m.model} />
            <PanelKV label="Finish"    value={m.finish} />
            <PanelKV label="Fabric"    value={m.fabric} />
            <PanelKV label="Dimensions" value={m.dimensions} />
          </>
        ) : (
          <>
            <PanelKV label="Species"   value={m.species} />
            <PanelKV label="Thickness" value={m.thickness} />
            <PanelKV label="Dimensions" value={m.dimensions} />
          </>
        )}
        <PanelKV label="Lead time" value={m.leadTime} />
        <PanelKV label="Unit cost"
          value={m.unitCost != null ? `$${Number(m.unitCost).toFixed(0)} / ${m.unit || 'u'}` : null} />
      </div>

      {linkedPaint && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)' }}>
          <Eyebrow>Painted with</Eyebrow>
          <button type="button" onClick={() => onNavigateTo(linkedPaint.id)}
            style={{
              marginTop: 8, background: 'var(--paper-2)',
              border: '1px solid var(--rule-2)', width: '100%',
              padding: '8px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ink)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--rule-2)'}
          >
            <span style={{ width: 22, height: 22, background: linkedPaint.swatch?.tone,
              outline: '1px solid rgba(20,20,20,0.15)', flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Serif size={13} style={{ display: 'block', lineHeight: 1.2 }}>
                {linkedPaint.brand || linkedPaint.supplier} · {linkedPaint.colourName || linkedPaint.name}
              </Serif>
              <Mono size={9.5} color="var(--ink-4)">{linkedPaint.code}
                {linkedPaint.sheen ? ' · ' + linkedPaint.sheen : ''}</Mono>
            </div>
            <Mono size={10} color="var(--ink-4)">→</Mono>
          </button>
        </div>
      )}

      {usedByPaintable.length > 0 && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)' }}>
          <Eyebrow>Applied on ({usedByPaintable.length})</Eyebrow>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {usedByPaintable.slice(0, 8).map(x => (
              <button key={x.id} type="button" onClick={() => onNavigateTo(x.id)}
                style={{ ...panelListRow }}>
                <Swatch swatch={x.swatch} size="xs" seed={parseInt(x.id.slice(2)) || 1}
                  style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span style={{ ...ui.serif, fontSize: 12, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</span>
                <Mono size={9} color="var(--ink-4)">{x.code}</Mono>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)' }}>
        <Eyebrow>Libraries</Eyebrow>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {mLibs.map(lib => (
            <span key={lib.id} style={{
              ...ui.mono, fontSize: 9.5,
              padding: '3px 6px', background: 'var(--paper-2)',
              border: '1px solid var(--rule-2)',
              color: 'var(--ink-2)',
            }}>{lib.name}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)',
        marginTop: 'auto', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <TextButton onClick={onEdit} accent>Edit entry</TextButton>
        <TextButton onClick={() => {
          if (confirm('Delete this material?')) onDelete();
        }}>Delete</TextButton>
      </div>
    </div>
  );
}

const panelBtn = {
  background: 'transparent', border: '1px solid var(--rule-2)',
  width: 22, height: 22, cursor: 'pointer',
  fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
  color: 'var(--ink-3)', padding: 0, fontWeight: 500,
};
const panelListRow = {
  display: 'grid', gridTemplateColumns: '14px 1fr auto',
  gap: 8, alignItems: 'center',
  padding: '4px 6px',
  background: 'transparent',
  border: '1px solid transparent',
  cursor: 'pointer', width: '100%', textAlign: 'left',
};

function PanelKV({ label, value }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10,
      padding: '5px 0',
      borderBottom: '1px dotted var(--rule-2)',
    }}>
      <span style={{ ...ui.mono, fontSize: 9.5, color: 'var(--ink-4)',
        letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ ...ui.serif, fontSize: 13, color: value ? 'var(--ink)' : 'var(--ink-4)' }}>
        {value || '—'}
      </span>
    </div>
  );
}

// ───────── Column picker ─────────
// Adopts the .ae aesthetic: 1px ink frame, paper bg, no shadow, no radius.
// Reads the full column catalogue + default-visible set from window so the
// picker stays in sync with LibraryColumns.jsx.
function LTColumnPicker({ colPref, setColPref, onClose }) {
  const [dragId, setDragId] = React.useState(null);
  const [overId, setOverId] = React.useState(null);
  const COLUMNS = window.LIBRARY_COLUMNS || [];
  const DEFAULT_VISIBLE = window.LIBRARY_DEFAULT_VISIBLE || [];
  const DEFAULT_ORDER = window.LIBRARY_DEFAULT_ORDER || COLUMNS.map(c => c.id);

  function toggleVisible(id) {
    setColPref(p => ({
      ...p,
      visible: p.visible.includes(id)
        ? p.visible.filter(x => x !== id)
        : [...p.visible, id],
    }));
  }
  function resetDefaults() {
    setColPref({
      visible: DEFAULT_VISIBLE.slice(),
      order: DEFAULT_ORDER.slice(),
      widths: {},
    });
  }
  function onDragStart(id) { setDragId(id); }
  function onDragOver(e, id) { e.preventDefault(); setOverId(id); }
  function onDrop() {
    if (!dragId || !overId || dragId === overId) { setDragId(null); setOverId(null); return; }
    setColPref(p => {
      const ord = p.order.slice();
      const from = ord.indexOf(dragId);
      const to = ord.indexOf(overId);
      ord.splice(from, 1);
      ord.splice(to, 0, dragId);
      return { ...p, order: ord };
    });
    setDragId(null); setOverId(null);
  }

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={aePanel(360, '70vh')}>
        <div style={aeHead}>
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--ink-3)', marginBottom: 4,
            }}>Columns</div>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 18,
              color: 'var(--ink)', lineHeight: 1.2,
            }}>Show, hide, reorder</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={aeClose}>×</button>
        </div>
        <div style={{ padding: '6px 0', overflowY: 'auto', flex: 1 }}>
          {colPref.order.map(id => {
            const col = COLUMNS.find(c => c.id === id);
            if (!col) return null;
            const visible = colPref.visible.includes(id);
            const isOver = overId === id && dragId !== id;
            return (
              <div key={id}
                draggable={!col.fixed}
                onDragStart={() => onDragStart(id)}
                onDragOver={(e) => onDragOver(e, id)}
                onDrop={onDrop}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                style={{
                  display: 'grid', gridTemplateColumns: '16px 16px 1fr auto',
                  gap: 8, alignItems: 'center',
                  padding: '6px 16px',
                  background: isOver ? 'var(--tint)' : 'transparent',
                  opacity: dragId === id ? 0.4 : 1,
                  cursor: col.fixed ? 'default' : 'grab',
                  borderTop: isOver ? '1px solid var(--accent)' : '1px solid transparent',
                }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)',
                  userSelect: 'none',
                }}>
                  {col.fixed ? '·' : '⋮⋮'}
                </span>
                <Checkbox checked={visible} onChange={() => toggleVisible(id)} />
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13 }}>
                  {col.label || <em style={{ color: 'var(--ink-4)' }}>({col.id})</em>}
                </span>
                <Mono size={9} color="var(--ink-4)">
                  {(colPref.widths[id] || col.width) + 'px'}
                </Mono>
              </div>
            );
          })}
        </div>
        <div style={aeFoot}>
          <TextButton onClick={resetDefaults}>Reset to defaults</TextButton>
          <Mono size={10} color="var(--ink-4)">Drag to reorder</Mono>
        </div>
      </div>
    </div>
  );
}

// ───────── Bulk action bar ─────────
// Phase B7: tokenised chrome (.bulk-bar) — fixed at viewport bottom with
// barUp slide-in on mount. Caller MUST unmount when selected.size === 0
// so the slide-in animation re-fires on the next selection. Buttons map
// to existing handlers; only chrome and animation change.
function LTBulkBar({ selected, clear, libraries, onMoveMaterial, onDuplicateMaterial, onDuplicate, onDelete }) {
  const [moveOpen, setMoveOpen] = React.useState(false);
  const ids = Array.from(selected);
  return (
    <div className="bulk-bar">
      <span className="bulk-count">{ids.length} selected</span>
      <div style={{ position: 'relative' }}>
        <button type="button" className="bulk-act" onClick={() => setMoveOpen(v => !v)}>
          Move to library…
        </button>
        {moveOpen && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
            background: 'var(--paper)', color: 'var(--ink)',
            border: '1px solid var(--ink)',
            minWidth: 200, zIndex: 2,
          }}>
            {libraries.map(l => (
              <button key={l.id} type="button"
                onClick={() => {
                  ids.forEach(id => onMoveMaterial(id, l.id));
                  setMoveOpen(false); clear();
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '7px 10px',
                  fontFamily: "'Newsreader', serif", fontSize: 13,
                  color: 'var(--ink)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >{l.name}</button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="bulk-act" onClick={() => {
        ids.forEach(id => (onDuplicate || onDuplicateMaterial)(id));
        clear();
      }}>Duplicate</button>
      <button type="button" className="bulk-act" onClick={() => {
        const csv = window.buildCSVFromIds(ids);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'materials.csv';
        a.click();
        URL.revokeObjectURL(url);
      }}>Export CSV</button>
      <button type="button" className="bulk-act danger" onClick={() => {
        if (confirm(`Delete ${ids.length} material${ids.length > 1 ? 's' : ''}?`)) onDelete(ids);
      }}>Remove</button>
      <button type="button" className="bulk-clear" onClick={clear}>Clear</button>
    </div>
  );
}

// ───────── Command palette (⌘K) ─────────
function LTCommandPalette({ materials, labelTemplates, onClose, onPick, onAdd, onAction }) {
  const [q, setQ] = React.useState('');
  const [idx, setIdx] = React.useState(0);

  const commands = [
    { type: 'action', id: 'new', label: 'Create new entry', hint: 'C', run: onAdd },
    { type: 'action', id: 'columns', label: 'Configure columns', hint: '', run: () => onAction('columns') },
    { type: 'action', id: 'toggle-mode', label: 'Switch to Gallery mode', hint: '', run: () => onAction('toggle-mode') },
    { type: 'action', id: 'cheatsheet', label: 'Show keyboard shortcuts', hint: '?', run: () => onAction('cheatsheet') },
  ];

  const results = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    const mItems = materials.map(m => ({
      type: 'material', id: m.id,
      label: window.formatLabel(m, labelTemplates),
      hint: (m.code + ' · ' + (m.category || '')).trim(),
      material: m,
    }));
    const all = [...commands, ...mItems];
    if (!query) return all.slice(0, 40);
    return all.filter(r => (r.label + ' ' + (r.hint || '')).toLowerCase().includes(query)).slice(0, 50);
  }, [q, materials, labelTemplates]);

  React.useEffect(() => { setIdx(0); }, [q]);

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[idx];
      if (!r) return;
      if (r.type === 'action') r.run();
      else if (r.type === 'material') onPick(r.id);
    }
  }

  return (
    <div onClick={onClose} style={{ ...modalBackdrop, alignItems: 'flex-start', paddingTop: '14vh' }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--paper)', border: '1px solid var(--ink)',
          width: 560, maxHeight: '60vh', display: 'flex', flexDirection: 'column',
        }}>
        <input autoFocus value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Jump to material, run command…"
          style={{
            border: 'none', borderBottom: '1px solid var(--rule)',
            outline: 'none',
            padding: '14px 18px',
            fontFamily: 'var(--font-sans)',
            fontSize: 15, color: 'var(--ink)',
            background: 'transparent',
          }} />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.map((r, i) => {
            const active = i === idx;
            return (
              <div key={r.type + ':' + r.id}
                onMouseEnter={() => setIdx(i)}
                onClick={() => {
                  if (r.type === 'action') r.run();
                  else onPick(r.id);
                }}
                style={{
                  display: 'grid', gridTemplateColumns: '20px 1fr auto',
                  gap: 10, alignItems: 'center',
                  padding: '8px 16px',
                  background: active ? 'var(--tint)' : 'transparent',
                  borderLeft: '2px solid ' + (active ? 'var(--accent)' : 'transparent'),
                  cursor: 'pointer',
                }}>
                {r.type === 'material' ? (
                  <Swatch swatch={r.material.swatch} size="xs"
                    seed={parseInt(r.material.id.slice(2)) || 1}
                    style={{ width: 16, height: 16 }} />
                ) : (
                  <span style={{ ...ui.mono, fontSize: 11, color: 'var(--ink-4)' }}>→</span>
                )}
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5, color: 'var(--ink)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.label}
                </span>
                <Mono size={10} color="var(--ink-4)">{r.hint}</Mono>
              </div>
            );
          })}
          {results.length === 0 && (
            <div style={{ padding: '30px 16px', textAlign: 'center' }}>
              <Mono size={11} color="var(--ink-4)">No matches</Mono>
            </div>
          )}
        </div>
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--rule)',
          display: 'flex', justifyContent: 'space-between',
          background: 'var(--paper-2)',
        }}>
          <Mono size={9.5} color="var(--ink-4)">↑↓ navigate · ↵ select · esc close</Mono>
          <Mono size={9.5} color="var(--ink-4)">{results.length} results</Mono>
        </div>
      </div>
    </div>
  );
}

// ───────── Cheatsheet ─────────
function LTCheatsheet({ onClose }) {
  const rows = [
    ['j / ↓',      'Next row'],
    ['k / ↑',      'Previous row'],
    ['g / G',      'Jump to first / last row'],
    ['o or ↵',     'Open detail panel'],
    ['e',          'Edit entry (full editor)'],
    ['x / space',  'Toggle selection'],
    ['Shift+x',    'Range select to cursor'],
    ['⌘A',         'Select all in view'],
    ['c',          'Create new entry'],
    ['d / Delete', 'Delete cursor row'],
    ['Shift+D',    'Duplicate cursor row'],
    ['/',          'Focus search'],
    ['⌘K',         'Command palette'],
    ['?',          'This cheatsheet'],
    ['Esc',        'Close panel / palette / clear selection'],
    ['Click cell', 'Inline-edit supplier / cost / lead / etc.'],
  ];
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={aePanel(480, 'auto')}>
        <div style={aeHead}>
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--ink-3)', marginBottom: 4,
            }}>Shortcuts</div>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 20,
              color: 'var(--ink)', lineHeight: 1.2,
            }}>Keyboard</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={aeClose}>×</button>
        </div>
        <div style={{ padding: '16px 22px 20px', display: 'grid',
          gridTemplateColumns: '110px 1fr', rowGap: 7, columnGap: 16 }}>
          {rows.map(([k, v]) => (
            <React.Fragment key={k}>
              <Mono size={11} color="var(--ink-2)"
                style={{ background: 'var(--paper-2)',
                  border: '1px solid var(--rule-2)',
                  padding: '2px 6px', textAlign: 'center',
                  justifySelf: 'start',
                }}>{k}</Mono>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13,
                color: 'var(--ink-2)', lineHeight: 1.5 }}>{v}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───── Shared modal styles (.ae aesthetic — 1px ink frame, no shadow) ─────
const modalBackdrop = {
  position: 'fixed', inset: 0,
  background: 'rgba(20,20,20,0.42)',
  zIndex: 90,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24,
};
const modalHead = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--rule)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

function aePanel(width, maxHeight) {
  return {
    background: 'var(--paper)',
    border: '1px solid var(--ink)',
    width, maxWidth: '92vw',
    maxHeight: maxHeight === 'auto' ? undefined : maxHeight,
    display: 'flex', flexDirection: 'column',
  };
}
const aeHead = {
  padding: '14px 22px 12px',
  borderBottom: '1px solid var(--rule)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  gap: 12,
};
const aeFoot = {
  padding: '12px 18px',
  borderTop: '1px solid var(--rule)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const aeClose = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: 4,
  fontFamily: 'var(--font-sans)', fontSize: 18, lineHeight: 1,
  color: 'var(--ink-3)',
};

Object.assign(window, { LTSidePanel, LTColumnPicker, LTBulkBar, LTCommandPalette, LTCheatsheet });
