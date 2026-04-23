// LibraryColumns — material column catalogue for the shared DataTable.
//
// Each column owns its own cell rendering. The DataTable frame handles
// padding, border, alignment, and inline-edit plumbing via the `ctx` arg
// passed to each `render(row, ctx)` fn. Keep render fns pure + stateless.
//
// ctx shape (from DataTable): {
//   baseStyle, editing, setEditing, onSave, rowId,
//   isSelected, onToggleSelect, col,
//   colPref, setColPref, editingCell, setEditingCell,
//   onSaveCell, selected, toggleSelect, sort, setSort,
//   // host-provided via `cellCtx` extension:
//   libraries, allMaterials, labelTemplates,
// }

// ───────── Tiny leaf renderers ─────────

function SwatchCell(row, ctx) {
  const { baseStyle, allMaterials } = ctx;
  const m = row;
  const kind = m.kind || 'material';
  if (kind !== 'material') {
    const glyph = (window.subtypeGlyph ? window.subtypeGlyph(kind, m.subtype) : window.kindGlyph?.(kind)) || '·';
    const tone = m.swatch?.tone;
    const bg = tone || 'var(--paper-2)';
    const ink = tone
      ? (window.readableInk ? window.readableInk(tone) : 'var(--ink-2)')
      : 'var(--ink-3)';
    return (
      <div data-dt-raw="true" style={{ ...baseStyle, justifyContent: 'center' }}>
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
    ? (allMaterials || []).find(x => x.id === m.paintedWithId) || m
    : m;
  return (
    <div data-dt-raw="true" style={{ ...baseStyle, justifyContent: 'center' }}>
      <Swatch
        swatch={{ ...m.swatch, tone: (m.swatch?.inheritTone && mForSwatch !== m) ? mForSwatch.swatch?.tone : m.swatch?.tone }}
        size="xs"
        seed={parseInt((m.id || '').slice(2)) || 1}
        style={{ width: 20, height: 20, flexShrink: 0 }}
      />
    </div>
  );
}

function LabelCell(row, ctx) {
  const { baseStyle, labelTemplates } = ctx;
  const label = window.formatLabel(row, labelTemplates);
  return (
    <div data-dt-raw="true" style={{ ...baseStyle, fontSize: 12.5, gap: 6 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {row.customName && (
        <span style={{
          ...ui.mono, fontSize: 8, color: 'var(--accent-ink)',
          letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
        }}>·</span>
      )}
    </div>
  );
}

function CodeCell(row, ctx) {
  const { baseStyle, allMaterials } = ctx;
  const code = row.code || '';
  const hasDupe = code && allMaterials &&
    allMaterials.some(m => m.id !== row.id && m.code === code);
  return (
    <div data-dt-raw="true" style={{ ...baseStyle, gap: 5 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{code}</span>
      {hasDupe && (
        <span title="Duplicate code in library" style={{
          color: 'var(--accent)', fontSize: 11, lineHeight: 1, flexShrink: 0,
        }}>!</span>
      )}
    </div>
  );
}

function CategoryCell(row, ctx) {
  const cat = row.category || '—';
  return (
    <div data-dt-raw="true" style={{ ...ctx.baseStyle, fontSize: 10, color: 'var(--ink-3)',
      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {cat}
    </div>
  );
}

function KindCell(row, ctx) {
  const k = (window.kindById && window.kindById(row.kind)) || { label: 'Material' };
  return (
    <div data-dt-raw="true" style={{ ...ctx.baseStyle, fontSize: 10, color: 'var(--ink-3)',
      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {k.label}
    </div>
  );
}

function TradeCell(row, ctx) {
  const t = row.trade || '—';
  return (
    <div data-dt-raw="true" style={{ ...ctx.baseStyle, fontSize: 10.5,
      color: t === '—' ? 'var(--ink-4)' : 'var(--ink-2)',
      letterSpacing: '0.02em' }}>
      {t}
    </div>
  );
}

function TagsCell(row, ctx) {
  const { baseStyle } = ctx;
  const tags = row.tags || [];
  if (!tags.length) return <div data-dt-raw="true" style={{ ...baseStyle, color: 'var(--ink-4)' }}>—</div>;
  return (
    <div data-dt-raw="true" style={{ ...baseStyle, gap: 4, overflow: 'hidden' }}>
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

function LibrariesCell(row, ctx) {
  const { baseStyle, libraries } = ctx;
  const ids = row.libraryIds || [];
  return (
    <div data-dt-raw="true" style={{ ...baseStyle, gap: 3, overflow: 'hidden' }}>
      {ids.slice(0, 4).map(lid => {
        const lib = (libraries || []).find(l => l.id === lid);
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

function ProjectsCell(row, ctx) {
  const n = (row.projects || []).length;
  return (
    <div data-dt-raw="true" style={ctx.baseStyle}>
      {n > 0 ? <span style={{ color: 'var(--ink)' }}>{n}</span>
        : <span style={{ color: 'var(--ink-4)' }}>—</span>}
    </div>
  );
}

function PaintedWithCell(row, ctx) {
  const { baseStyle, allMaterials } = ctx;
  if (row.category === 'Paint') {
    return <div data-dt-raw="true" style={{ ...baseStyle, color: 'var(--ink-4)' }}>—</div>;
  }
  if (!row.paintedWithId) {
    return <div data-dt-raw="true" style={{ ...baseStyle, color: 'var(--ink-4)' }}>—</div>;
  }
  const p = (allMaterials || []).find(x => x.id === row.paintedWithId);
  if (!p) return <div data-dt-raw="true" style={{ ...baseStyle, color: 'var(--ink-4)' }}>—</div>;
  return (
    <div data-dt-raw="true" style={{ ...baseStyle, gap: 6 }}>
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

function UnitCostCell(row, ctx) {
  const { baseStyle, editing, setEditing, onSave } = ctx;
  if (editing) {
    return <window.DtInlineInput
      baseStyle={baseStyle}
      initial={row.unitCost || ''}
      type="number"
      onCommit={(v) => onSave(v === '' ? null : Number(v))}
      onCancel={() => setEditing(false)}
    />;
  }
  return (
    <div data-dt-raw="true" style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      {row.unitCost != null
        ? <>${Number(row.unitCost).toFixed(0)}<span style={{ color: 'var(--ink-4)' }}>/{row.unit || 'u'}</span></>
        : <span style={{ color: 'var(--ink-4)' }}>—</span>}
    </div>
  );
}

// Generic editable-text factory for leadTime / thickness / dimensions / supplier / origin / finish
function genericEditable(field) {
  return function (row, ctx) {
    const { baseStyle, editing, setEditing, onSave } = ctx;
    if (editing) {
      return <window.DtInlineInput
        baseStyle={baseStyle}
        initial={row[field] || ''}
        onCommit={(v) => onSave(v || null)}
        onCancel={() => setEditing(false)}
      />;
    }
    return (
      <div data-dt-raw="true" style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
        {row[field] || <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>
    );
  };
}

// ───────── Column catalogue ─────────

const LIBRARY_COLUMNS = [
  { id: 'select',   label: '', width: 32, minWidth: 32, fixed: true, align: 'center', sortable: false },
  { id: 'swatch',   label: '', width: 32, minWidth: 32, align: 'center', sortable: false, render: SwatchCell },
  { id: 'code',     label: 'Code', width: 82, minWidth: 60, mono: true,
    render: CodeCell,
    searchText: (m) => m.code,
  },
  { id: 'label',    label: 'Material', width: 280, minWidth: 160, serif: true,
    render: LabelCell,
    sortValue: (m) => window.formatLabel(m, window._labelTemplatesCache || {}).toLowerCase(),
    searchText: (m) => (m.name || '') + ' ' + (m.customName || ''),
  },
  { id: 'kind',     label: 'Kind', width: 120, minWidth: 80, render: KindCell,
    sortValue: (m) => m.kind || 'material' },
  { id: 'trade',    label: 'Trade', width: 140, minWidth: 90, render: TradeCell,
    sortValue: (m) => m.trade || '' },
  { id: 'tags',     label: 'Tags', width: 160, minWidth: 100, sortable: false,
    render: TagsCell },
  { id: 'category', label: 'Category', width: 100, minWidth: 70, render: CategoryCell,
    searchText: (m) => m.category },
  { id: 'supplier', label: 'Supplier', width: 140, minWidth: 90, editable: true,
    render: genericEditable('supplier'),
    searchText: (m) => m.supplier },
  { id: 'origin',   label: 'Origin', width: 110, minWidth: 70, editable: true,
    render: genericEditable('origin') },
  { id: 'finish',   label: 'Finish', width: 130, minWidth: 80, editable: true,
    render: genericEditable('finish'),
    searchText: (m) => m.finish },
  { id: 'thickness',label: 'Thk', width: 70, minWidth: 50, mono: true, editable: true, align: 'right',
    render: genericEditable('thickness') },
  { id: 'dimensions', label: 'Dims', width: 110, minWidth: 70, mono: true, editable: true,
    render: genericEditable('dimensions') },
  { id: 'leadTime', label: 'Lead', width: 80, minWidth: 50, mono: true, editable: true, align: 'right',
    render: genericEditable('leadTime') },
  { id: 'unitCost', label: 'Cost', width: 90, minWidth: 60, mono: true, editable: true, align: 'right',
    render: UnitCostCell,
    sortValue: (m) => m.unitCost || 0 },
  { id: 'libraries',label: 'Libs', width: 90, minWidth: 70, align: 'left',
    render: LibrariesCell,
    sortValue: (m) => (m.libraryIds || []).length },
  { id: 'projects', label: 'Projects', width: 70, minWidth: 50, mono: true, align: 'right',
    render: ProjectsCell,
    sortValue: (m) => (m.projects || []).length },
  { id: 'paintedWith', label: 'Painted with', width: 150, minWidth: 100, serif: true,
    render: PaintedWithCell,
    sortValue: (m) => m.paintedWithId || '' },
];

const LIBRARY_DEFAULT_VISIBLE = ['select', 'swatch', 'code', 'label', 'kind', 'trade', 'supplier', 'finish', 'leadTime', 'unitCost', 'libraries'];
const LIBRARY_DEFAULT_ORDER = LIBRARY_COLUMNS.map(c => c.id);

// Library-specific filter matcher — supports in-library op on top of defaults.
function libraryMatchFilter(m, f) {
  if (f.op === 'in-library') return (m.libraryIds || []).includes(f.value);
  return window.defaultMatchFilter(m, f);
}

Object.assign(window, {
  LIBRARY_COLUMNS, LIBRARY_DEFAULT_VISIBLE, LIBRARY_DEFAULT_ORDER,
  libraryMatchFilter,
  // Export leaf renderers in case other tables want to reuse (swatch etc)
  SwatchCell, LabelCell, CodeCell, CategoryCell, KindCell, TradeCell,
  TagsCell, LibrariesCell, ProjectsCell, PaintedWithCell, UnitCostCell,
  genericEditable,
});
