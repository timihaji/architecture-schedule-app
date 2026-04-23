// Library Table — the actual table: header, rows, cells, inline edit

// Single-character glyph per kind for the swatch cell in non-material rows.
// Kept short + mono-ish so they don't draw more attention than a tone swatch.
function kindGlyph(kindId) {
  switch (kindId) {
    case 'material':      return '▦'; // finish/sample
    case 'fitting':       return '◎'; // tap/plumbing
    case 'appliance':     return '▣';
    case 'light':         return '✦';
    case 'joinery':       return '⌗';
    case 'door':          return '▯';
    case 'window':        return '▥';
    case 'ffe-seating':   return '◐';
    case 'ffe-tables':    return '⎕';
    case 'ffe-storage':   return '▤';
    case 'ffe-beds':      return '◱';
    case 'ffe-soft':      return '❋';
    case 'ffe-lighting':  return '✧';
    case 'ffe-art':       return '◇';
    case 'other':         return '·';
    default:              return '·';
  }
}

function LTTable({
  materials, allMaterials, libraries, labelTemplates,
  visibleCols, gridTemplate, rowH,
  colPref, setColPref,
  sort, setSort,
  selected, toggleSelect, selectRange,
  cursorId, setCursorId,
  openId, setOpenId,
  editingCell, setEditingCell,
  onSaveCell,
  onEdit,
}) {
  const containerRef = React.useRef(null);

  return (
    <div ref={containerRef} style={{
      flex: 1, minHeight: 0, overflow: 'auto',
      background: 'var(--paper)',
    }}>
      <LTHeader
        visibleCols={visibleCols}
        gridTemplate={gridTemplate}
        sort={sort} setSort={setSort}
        rowH={rowH}
        colPref={colPref} setColPref={setColPref}
        allSelected={materials.length > 0 && selected.size === materials.length}
        anySelected={selected.size > 0}
        onToggleAll={() => {
          if (selected.size === materials.length) {
            materials.forEach(m => { if (selected.has(m.id)) toggleSelect(m.id); });
          } else {
            materials.forEach(m => { if (!selected.has(m.id)) toggleSelect(m.id); });
          }
        }}
      />
      <div>
        {materials.map(m => (
          <LTRow
            key={m.id}
            material={m}
            libraries={libraries}
            allMaterials={allMaterials}
            labelTemplates={labelTemplates}
            visibleCols={visibleCols}
            gridTemplate={gridTemplate}
            rowH={rowH}
            isCursor={m.id === cursorId}
            isSelected={selected.has(m.id)}
            isOpen={m.id === openId}
            onRowClick={(e) => {
              if (e.shiftKey) { selectRange(m.id); return; }
              setCursorId(m.id);
              setOpenId(m.id);
            }}
            onToggleSelect={(e) => {
              if (e.shiftKey) selectRange(m.id);
              else toggleSelect(m.id);
            }}
            editingCell={editingCell}
            setEditingCell={setEditingCell}
            onSaveCell={onSaveCell}
            onEdit={() => onEdit(m)}
          />
        ))}
        {materials.length === 0 && (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <Serif size={16} color="var(--ink-3)">No materials match</Serif>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────── Header ─────────
function LTHeader({ visibleCols, gridTemplate, sort, setSort, rowH, colPref, setColPref,
  allSelected, anySelected, onToggleAll }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridTemplate,
      position: 'sticky', top: 0, zIndex: 2,
      background: 'var(--paper-2)',
      borderBottom: '1px solid var(--rule)',
      height: rowH + 4,
      alignItems: 'stretch',
    }}>
      {visibleCols.map((col, idx) => {
        const isSort = sort.id === col.id;
        const sortable = !['select', 'swatch'].includes(col.id);
        return (
          <div key={col.id}
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center',
              justifyContent: col.align === 'right' ? 'flex-end'
                : col.align === 'center' ? 'center' : 'flex-start',
              padding: col.id === 'select' ? '0' : '0 8px',
              borderRight: idx < visibleCols.length - 1 ? '1px solid var(--rule)' : 'none',
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: isSort ? 'var(--ink)' : 'var(--ink-4)',
              fontWeight: 500,
              cursor: sortable ? 'pointer' : 'default',
              userSelect: 'none',
            }}
            onClick={() => {
              if (!sortable) return;
              if (isSort) setSort(s => ({ id: s.id, dir: s.dir === 'asc' ? 'desc' : 'asc' }));
              else setSort({ id: col.id, dir: 'asc' });
            }}
          >
            {col.id === 'select' ? (
              <Checkbox checked={allSelected} indeterminate={anySelected && !allSelected}
                onChange={onToggleAll} />
            ) : (
              <>
                <span>{col.label}</span>
                {isSort && (
                  <span style={{ marginLeft: 4, fontSize: 9 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
                )}
              </>
            )}
            {/* Resize handle */}
            {!col.fixed && idx < visibleCols.length - 1 && (
              <ResizeHandle col={col} setColPref={setColPref} />
            )}
          </div>
        );
      })}
      <div /> {/* spacer for trailing 1fr */}
    </div>
  );
}

function ResizeHandle({ col, setColPref }) {
  const startX = React.useRef(0);
  const startW = React.useRef(0);
  function onDown(e) {
    e.stopPropagation(); e.preventDefault();
    startX.current = e.clientX;
    startW.current = col.width;
    const onMove = (ev) => {
      const dx = ev.clientX - startX.current;
      const nw = Math.max(col.minWidth || 40, startW.current + dx);
      setColPref(prev => ({ ...prev, widths: { ...prev.widths, [col.id]: nw } }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
  return (
    <div onMouseDown={onDown}
      style={{
        position: 'absolute', top: 0, right: -3, bottom: 0, width: 6,
        cursor: 'col-resize', zIndex: 3,
      }} />
  );
}

function Checkbox({ checked, indeterminate, onChange }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked}
      onChange={e => { e.stopPropagation(); onChange(e); }}
      onClick={e => e.stopPropagation()}
      style={{
        width: 12, height: 12, margin: 0, cursor: 'pointer',
        accentColor: 'var(--ink)',
      }} />
  );
}

// ───────── Row ─────────
function LTRow({ material: m, libraries, allMaterials, labelTemplates,
  visibleCols, gridTemplate, rowH, isCursor, isSelected, isOpen,
  onRowClick, onToggleSelect, editingCell, setEditingCell, onSaveCell, onEdit }) {
  const [hov, setHov] = React.useState(false);
  const bg = isOpen ? 'var(--tint-strong)'
    : isSelected ? 'rgba(var(--accent-rgb, 180, 90, 40), 0.08)'
    : hov ? 'var(--tint)'
    : 'transparent';
  return (
    <div
      data-row-id={m.id}
      onClick={onRowClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        height: rowH,
        alignItems: 'center',
        borderBottom: '1px solid var(--rule)',
        background: bg,
        cursor: 'pointer',
        position: 'relative',
        borderLeft: '2px solid ' + (isCursor ? 'var(--accent)' : 'transparent'),
        transition: 'background 0.06s',
      }}
    >
      {visibleCols.map((col, idx) => (
        <LTCell
          key={col.id}
          col={col}
          material={m}
          libraries={libraries}
          allMaterials={allMaterials}
          labelTemplates={labelTemplates}
          rowH={rowH}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          editing={editingCell?.id === m.id && editingCell?.field === col.id}
          setEditing={(v) => setEditingCell(v ? { id: m.id, field: col.id } : null)}
          onSave={(value) => { onSaveCell(m.id, col.id, value); setEditingCell(null); }}
          borderRight={idx < visibleCols.length - 1}
        />
      ))}
    </div>
  );
}

// ───────── Cell ─────────
function LTCell({ col, material: m, libraries, allMaterials, labelTemplates,
  rowH, isSelected, onToggleSelect, editing, setEditing, onSave, borderRight }) {
  const alignStyle = {
    justifyContent: col.align === 'right' ? 'flex-end'
      : col.align === 'center' ? 'center' : 'flex-start',
  };
  const baseStyle = {
    display: 'flex', alignItems: 'center',
    padding: col.id === 'select' ? '0' : '0 8px',
    borderRight: borderRight ? '1px solid var(--rule)' : 'none',
    minWidth: 0, height: '100%',
    fontSize: 11.5,
    fontFamily: col.mono ? "'JetBrains Mono', monospace"
      : col.serif ? "'Newsreader', serif"
      : "'Inter Tight', sans-serif",
    color: 'var(--ink)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    ...alignStyle,
  };

  // Render per column type
  if (col.id === 'select') {
    return (
      <div style={{ ...baseStyle, justifyContent: 'center' }}>
        <Checkbox checked={isSelected} onChange={onToggleSelect} />
      </div>
    );
  }

  if (col.id === 'swatch') {
    const kind = m.kind || 'material';
    // For non-finish kinds, render the subtype glyph (or kind glyph fallback)
    // on a tone-tinted square so the swatch column still carries colour rhythm.
    if (kind !== 'material') {
      const glyph = (window.subtypeGlyph ? window.subtypeGlyph(kind, m.subtype) : kindGlyph(kind));
      const tone = m.swatch?.tone;
      const bg = tone || 'var(--paper-2)';
      // Pick an ink colour readable on the tone: dark ink for light tones,
      // paper ink for dark tones. Fall back to default ink when no tone is set.
      const ink = tone
        ? (window.readableInk ? window.readableInk(tone) : 'var(--ink-2)')
        : 'var(--ink-3)';
      return (
        <div style={{ ...baseStyle, justifyContent: 'center' }}>
          <span style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 13, color: ink, lineHeight: 1,
            display: 'inline-flex', width: 20, height: 20,
            alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--rule-2)',
            background: bg,
          }}>{glyph}</span>
        </div>
      );
    }
    const mForSwatch = (m.category !== 'Paint' && m.swatch?.inheritTone && m.paintedWithId)
      ? allMaterials.find(x => x.id === m.paintedWithId) || m : m;
    return (
      <div style={{ ...baseStyle, justifyContent: 'center' }}>
        <Swatch
          swatch={{ ...m.swatch, tone: (m.swatch?.inheritTone && mForSwatch !== m) ? mForSwatch.swatch?.tone : m.swatch?.tone }}
          size="xs"
          seed={parseInt(m.id.slice(2)) || 1}
          style={{ width: 20, height: 20, flexShrink: 0 }}
        />
      </div>
    );
  }

  if (col.id === 'label') {
    const label = window.formatLabel(m, labelTemplates);
    return (
      <div style={{ ...baseStyle, fontSize: 12.5, gap: 6 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        {m.customName && (
          <span style={{
            ...ui.mono, fontSize: 8, color: 'var(--accent-ink)',
            letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
          }}>·</span>
        )}
      </div>
    );
  }

  if (col.id === 'code') {
    return <div style={baseStyle}>{m.code}</div>;
  }

  if (col.id === 'category') {
    const cat = m.category || '—';
    return (
      <div style={{ ...baseStyle, fontSize: 10, color: 'var(--ink-3)',
        textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {cat}
      </div>
    );
  }

  if (col.id === 'libraries') {
    const ids = m.libraryIds || [];
    return (
      <div style={{ ...baseStyle, gap: 3, overflow: 'hidden' }}>
        {ids.slice(0, 4).map(lid => {
          const lib = libraries.find(l => l.id === lid);
          return (
            <span key={lid} title={lib?.name}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--ink-3)', flexShrink: 0,
              }} />
          );
        })}
        {ids.length > 4 && (
          <span style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-4)', marginLeft: 2 }}>
            +{ids.length - 4}
          </span>
        )}
      </div>
    );
  }

  if (col.id === 'projects') {
    const n = (m.projects || []).length;
    return (
      <div style={baseStyle}>
        {n > 0 ? <span style={{ color: 'var(--ink)' }}>{n}</span>
          : <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>
    );
  }

  if (col.id === 'paintedWith') {
    if (m.category === 'Paint') {
      return <div style={{ ...baseStyle, color: 'var(--ink-4)' }}>—</div>;
    }
    if (!m.paintedWithId) {
      return <div style={{ ...baseStyle, color: 'var(--ink-4)' }}>—</div>;
    }
    const p = allMaterials.find(x => x.id === m.paintedWithId);
    if (!p) return <div style={{ ...baseStyle, color: 'var(--ink-4)' }}>—</div>;
    return (
      <div style={{ ...baseStyle, gap: 6 }}>
        <span style={{
          width: 10, height: 10, background: p.swatch?.tone || '#ddd',
          outline: '1px solid rgba(20,20,20,0.15)', flexShrink: 0,
        }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.colourName || p.name}
        </span>
      </div>
    );
  }

  if (col.id === 'kind') {
    const k = (window.kindById && window.kindById(m.kind)) || { label: 'Material' };
    return (
      <div style={{ ...baseStyle, fontSize: 10, color: 'var(--ink-3)',
        textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {k.label}
      </div>
    );
  }

  if (col.id === 'trade') {
    const t = m.trade || '—';
    return (
      <div style={{ ...baseStyle, fontSize: 10.5, color: t === '—' ? 'var(--ink-4)' : 'var(--ink-2)',
        letterSpacing: '0.02em' }}>
        {t}
      </div>
    );
  }

  if (col.id === 'tags') {
    const tags = m.tags || [];
    if (!tags.length) return <div style={{ ...baseStyle, color: 'var(--ink-4)' }}>—</div>;
    return (
      <div style={{ ...baseStyle, gap: 4, overflow: 'hidden' }}>
        {tags.slice(0, 3).map(t => (
          <span key={t} style={{
            ...ui.mono, fontSize: 9, padding: '2px 5px',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            border: '1px solid var(--rule-2)',
            background: 'var(--paper-2)', color: 'var(--ink-3)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>{t}</span>
        ))}
        {tags.length > 3 && (
          <span style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-4)' }}>
            +{tags.length - 3}
          </span>
        )}
      </div>
    );
  }

  if (col.id === 'unitCost') {
    if (editing) {
      return <InlineInput
        baseStyle={baseStyle}
        initial={m.unitCost || ''}
        type="number"
        onCommit={(v) => onSave(v === '' ? null : Number(v))}
        onCancel={() => setEditing(false)}
      />;
    }
    return (
      <div style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
        {m.unitCost != null ? <>${Number(m.unitCost).toFixed(0)}<span style={{ color: 'var(--ink-4)' }}>/{m.unit || 'u'}</span></>
          : <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>
    );
  }

  if (col.id === 'leadTime') {
    if (editing) {
      return <InlineInput
        baseStyle={baseStyle}
        initial={m.leadTime || ''}
        onCommit={(v) => onSave(v || null)}
        onCancel={() => setEditing(false)}
      />;
    }
    return (
      <div style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
        {m.leadTime || <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>
    );
  }

  if (col.id === 'thickness') {
    if (editing) {
      return <InlineInput
        baseStyle={baseStyle}
        initial={m.thickness || ''}
        onCommit={(v) => onSave(v || null)}
        onCancel={() => setEditing(false)}
      />;
    }
    return (
      <div style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
        {m.thickness || <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>
    );
  }

  if (col.id === 'dimensions') {
    if (editing) {
      return <InlineInput
        baseStyle={baseStyle}
        initial={m.dimensions || ''}
        onCommit={(v) => onSave(v || null)}
        onCancel={() => setEditing(false)}
      />;
    }
    return (
      <div style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
        {m.dimensions || <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>
    );
  }

  // Generic editable text column (supplier, origin, finish)
  if (col.editable) {
    if (editing) {
      return <InlineInput
        baseStyle={baseStyle}
        initial={m[col.id] || ''}
        onCommit={(v) => onSave(v || null)}
        onCancel={() => setEditing(false)}
      />;
    }
    return (
      <div style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
        {m[col.id] || <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>
    );
  }

  return <div style={baseStyle}>{m[col.id] || '—'}</div>;
}

function InlineInput({ baseStyle, initial, onCommit, onCancel, type = 'text' }) {
  const [val, setVal] = React.useState(initial);
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <div style={{ ...baseStyle, padding: 0, borderLeft: '2px solid var(--accent)' }}
      onClick={(e) => e.stopPropagation()}>
      <input ref={ref} type={type} value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => onCommit(val)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onCommit(val); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        style={{
          width: '100%', height: '100%',
          background: 'var(--paper)', border: 'none', outline: 'none',
          padding: '0 8px',
          fontFamily: baseStyle.fontFamily,
          fontSize: baseStyle.fontSize,
          color: 'var(--ink)',
          textAlign: baseStyle.justifyContent === 'flex-end' ? 'right' : 'left',
        }} />
    </div>
  );
}

Object.assign(window, { LTTable, LTHeader, LTRow, LTCell, InlineInput, Checkbox, kindGlyph });
