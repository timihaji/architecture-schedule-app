// Library Table — side panel, column picker, bulk bar, command palette, cheatsheet

// ───────── Side panel (Linear-style right drawer) ─────────
function LTSidePanel({ material: m, materials, libraries, labelTemplates,
  onClose, onEdit, onDelete, onNavigateTo }) {
  if (!m) return null;
  const label = window.formatLabel(m, labelTemplates);
  const mLibs = libraries.filter(l => (m.libraryIds || []).includes(l.id));
  const linkedPaint = m.paintedWithId ? materials.find(x => x.id === m.paintedWithId) : null;
  const usedByPaintable = m.category === 'Paint'
    ? materials.filter(x => x.paintedWithId === m.id) : [];

  const swatchFor = (m.swatch?.inheritTone && linkedPaint)
    ? { ...m.swatch, tone: linkedPaint.swatch?.tone } : m.swatch;

  return (
    <div className="lt-sp">
      <div className="lt-sp-head">
        <div className="lt-sp-head-left">
          <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.12em' }}>
            {m.code}
          </Mono>
          <span className="lt-sp-badge">
            {((window.kindById && window.kindById(m.kind))?.label) || 'Material'}
          </span>
          {m.trade && (
            <span className="lt-sp-trade">· {m.trade}</span>
          )}
        </div>
        <div className="lt-sp-head-btns">
          <button type="button" onClick={onEdit} title="Edit entry (E)" className="lt-sp-btn">E</button>
          <button type="button" onClick={onClose} title="Close panel (Esc)" className="lt-sp-btn">×</button>
        </div>
      </div>

      <div className="lt-sp-body">
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

      <div className="lt-sp-fields">
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
        <div className="lt-sp-section">
          <Eyebrow>Painted with</Eyebrow>
          <button type="button" onClick={() => onNavigateTo(linkedPaint.id)}
            className="lt-sp-paint-link">
            <span className="lt-sp-paint-swatch"
              style={{ background: linkedPaint.swatch?.tone }} />
            <div className="lt-sp-paint-info">
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
        <div className="lt-sp-section">
          <Eyebrow>Applied on ({usedByPaintable.length})</Eyebrow>
          <div className="lt-sp-applied-list">
            {usedByPaintable.slice(0, 8).map(x => (
              <button key={x.id} type="button" onClick={() => onNavigateTo(x.id)}
                className="lt-sp-applied-row">
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

      <div className="lt-sp-section">
        <Eyebrow>Libraries</Eyebrow>
        <div className="lt-sp-lib-tags">
          {mLibs.map(lib => (
            <span key={lib.id} className="lt-sp-lib-tag">{lib.name}</span>
          ))}
        </div>
      </div>

      <div className="lt-sp-foot">
        <TextButton onClick={onEdit} accent>Edit entry</TextButton>
        <TextButton onClick={() => {
          if (confirm('Delete this material?')) onDelete();
        }}>Delete</TextButton>
      </div>
    </div>
  );
}

function PanelKV({ label, value }) {
  return (
    <div className="panel-kv">
      <span className="panel-kv-label">{label}</span>
      <span className={'panel-kv-value' + (value ? '' : ' empty')}>{value || '—'}</span>
    </div>
  );
}

// ───────── Column picker ─────────
function LTColumnPicker({ colPref, setColPref, onClose }) {
  const [dragId, setDragId] = React.useState(null);
  const [overId, setOverId] = React.useState(null);
  const COLUMNS = window.LIBRARY_COLUMNS || [];
  const DEFAULT_VISIBLE = window.LIBRARY_DEFAULT_VISIBLE || [];
  const DEFAULT_ORDER = window.LIBRARY_DEFAULT_ORDER || COLUMNS.map(c => c.id);

  function toggleVisible(id) {
    const col = COLUMNS.find(c => c.id === id);
    if (col && col.locked) return;
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
    <div className="ae-backdrop" onClick={onClose}>
      <div className="ae-panel" onClick={e => e.stopPropagation()}
        style={{ width: 360, maxHeight: '70vh' }}>
        <div className="ae-head">
          <div>
            <div className="ae-eyebrow">Columns</div>
            <div className="ae-title">Show, hide, reorder</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="ae-close">×</button>
        </div>
        <div className="ae-col-list">
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
                className={'ae-col-row' + (isOver ? ' over' : '') + (col.fixed ? ' fixed' : '')}
                style={{ opacity: dragId === id ? 0.4 : 1 }}>
                <span className="ae-col-drag">{col.fixed ? '·' : '⋮⋮'}</span>
                <Checkbox checked={visible} onChange={() => toggleVisible(id)} />
                <span className="ae-col-label">
                  {col.label || <em style={{ color: 'var(--ink-4)' }}>({col.id})</em>}
                </span>
                <Mono size={9} color="var(--ink-4)">
                  {(colPref.widths[id] || col.width) + 'px'}
                </Mono>
              </div>
            );
          })}
        </div>
        <div className="ae-foot">
          <TextButton onClick={resetDefaults}>Reset to defaults</TextButton>
          <Mono size={10} color="var(--ink-4)">Drag to reorder</Mono>
        </div>
      </div>
    </div>
  );
}

// ───────── Bulk action bar ─────────
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
          <div className="bulk-lib-drop">
            {libraries.map(l => (
              <button key={l.id} type="button"
                onClick={() => {
                  ids.forEach(id => onMoveMaterial(id, l.id));
                  setMoveOpen(false); clear();
                }}
                className="bulk-lib-item"
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
    <div className="cp-backdrop" onClick={onClose}>
      <div className="cp-panel" onClick={e => e.stopPropagation()}>
        <input autoFocus value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Jump to material, run command…"
          className="cp-input" />
        <div className="cp-list">
          {results.map((r, i) => {
            const active = i === idx;
            return (
              <div key={r.type + ':' + r.id}
                onMouseEnter={() => setIdx(i)}
                onClick={() => {
                  if (r.type === 'action') r.run();
                  else onPick(r.id);
                }}
                className={'cp-row' + (active ? ' active' : '')}>
                {r.type === 'material' ? (
                  <Swatch swatch={r.material.swatch} size="xs"
                    seed={parseInt(r.material.id.slice(2)) || 1}
                    style={{ width: 16, height: 16 }} />
                ) : (
                  <span className="cp-icon">→</span>
                )}
                <span className="cp-label">{r.label}</span>
                <Mono size={10} color="var(--ink-4)">{r.hint}</Mono>
              </div>
            );
          })}
          {results.length === 0 && (
            <div className="cp-empty">
              <Mono size={11} color="var(--ink-4)">No matches</Mono>
            </div>
          )}
        </div>
        <div className="cp-foot">
          <Mono size={9.5} color="var(--ink-4)">↑↓ navigate · ↵ select · esc close</Mono>
          <Mono size={9.5} color="var(--ink-4)">{results.length} results</Mono>
        </div>
      </div>
    </div>
  );
}

// (LTCheatsheet removed Phase 2 — `?` modal deleted along with the rest of
// the Library table chrome. Keyboard reference now lives only in Settings → 11.)

Object.assign(window, { LTSidePanel, LTColumnPicker, LTBulkBar, LTCommandPalette });
