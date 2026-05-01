// LibraryColumns — Phase B4 register catalogue.
//
// Row markup follows the design's `.reg-row` pattern: drag-handle gutter,
// checkbox, square thumb, mono accent code, serif name, sans brand, mono
// productType, sans supplier, right-aligned mono price, hover-reveal action
// cluster. Implemented as DataTable columns so search/sort/multi-select/
// bulk/inline-edit/keyboard-nav stay intact.
//
// Hover-reveal (drag handle, action cluster) uses :hover CSS injected once,
// keyed off the row's [data-row-id] attribute already set by DataTable.
//
// ctx (from DataTable) extended via cellContext from LibraryTable.jsx:
//   libraries, allMaterials, labelTemplates,
//   onEditMaterial, onDuplicateMaterial, onDeleteMaterial,

// Hover-reveal opacity for .reg-row-drag and .reg-actions is owned by
// index.html's LAYOUT A: REGISTER block (B4.1).

// ─── Helpers ───────────────────────────────────────────────────────────────

// Resolve a v5 category id off an item.
function resolveCategoryId(m) {
  if (!m) return null;
  return m.category || null;
}

// Display label for the "category" column. Looks up the v5 category def by id
// and uses its label. Falls back to whatever's on the item.
function categoryDisplayLabel(m) {
  const id = resolveCategoryId(m);
  if (id && window.categoryDef) {
    const def = window.categoryDef(id);
    if (def) return def.label;
  }
  return m && m.category ? String(m.category) : null;
}

// Effective swatch — paintable products inherit the linked paint's tone.
function effectiveSwatch(m, allMaterials) {
  const paintedWithId = window.getFieldValue ? window.getFieldValue(m, 'paintedWith') : m.paintedWithId;
  if (m.swatch?.inheritTone && paintedWithId) {
    const linked = (allMaterials || []).find(x => x.id === paintedWithId);
    if (linked) return { ...m.swatch, tone: linked.swatch?.tone };
  }
  return m.swatch;
}

// ─── Cell renderers ────────────────────────────────────────────────────────

// Drag-handle gutter — visual hover-reveal only for v1. Reorder behaviour
// stays parked in V2_BACKLOG (per-room canvas / spreadsheet entry).
function DragCell(row, ctx) {
  return (
    <div data-dt-raw="true" style={{ ...ctx.baseStyle, justifyContent: 'center', cursor: 'grab' }}>
      <span className="reg-row-drag"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11, color: 'var(--ink-4)', lineHeight: 1,
          userSelect: 'none',
        }}>⋮⋮</span>
    </div>
  );
}

// Square thumb — scales with density. Design's 36×36 lands at "comfortable"
// row height; compact/regular shrink the thumb proportionally.
function SwatchCell(row, ctx) {
  const { baseStyle, allMaterials, rowH = 32 } = ctx;
  const m = row;
  const thumbSize = Math.max(18, Math.min(rowH - 4, 36));
  const swatch = effectiveSwatch(m, allMaterials);
  return (
    <div data-dt-raw="true" style={{ ...baseStyle, justifyContent: 'center' }}>
      <Swatch
        swatch={swatch}
        size="xs"
        seed={parseInt((m.id || '').slice(2)) || 1}
        style={{ width: thumbSize, height: thumbSize, flexShrink: 0 }}
      />
    </div>
  );
}

// Code — Mono Clean variant in accent-ink. Duplicate marker preserved.
function CodeCell(row, ctx) {
  const { baseStyle, allMaterials } = ctx;
  const code = row.code || '';
  const hasDupe = code && allMaterials &&
    allMaterials.some(m => m.id !== row.id && m.code === code);
  return (
    <div data-dt-raw="true" style={{ ...baseStyle, gap: 5 }}>
      <window.CodeChip size="register">{code}</window.CodeChip>
      {hasDupe && (
        <span title="Duplicate code in library" style={{
          color: 'var(--accent)', fontSize: 11, lineHeight: 1, flexShrink: 0,
        }}>!</span>
      )}
    </div>
  );
}

// Material name — serif 14 to match design row spec. Custom-name pip preserved.
function LabelCell(row, ctx) {
  const { baseStyle, labelTemplates } = ctx;
  const label = window.formatLabel(row, labelTemplates);
  return (
    <div data-dt-raw="true" style={{
      ...baseStyle,
      fontFamily: 'var(--font-serif)',
      fontSize: 14,
      gap: 6,
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {row.customName && (
        <span title="Custom label"
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--accent-ink)',
            letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
          }}>·</span>
      )}
    </div>
  );
}

// Brand — sans 11. Reads via getFieldValue (supports new shape).
function BrandCell(row, ctx) {
  const { baseStyle } = ctx;
  const brand = window.getFieldValue ? window.getFieldValue(row, 'brand') : row.brand;
  return (
    <div data-dt-raw="true" style={{
      ...baseStyle,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      color: brand ? 'var(--ink-2)' : 'var(--ink-4)',
    }}>
      {brand || '—'}
    </div>
  );
}

// Group — mono 10 ink-3 lowercase. Renders the v5 group's label (replaces
// the legacy productType column). Falls back to '—' when category unknown.
function ProductTypeCell(row, ctx) {
  const { baseStyle } = ctx;
  const catId = resolveCategoryId(row);
  const cat = catId && window.categoryDef ? window.categoryDef(catId) : null;
  const grp = cat && window.groupDef ? window.groupDef(cat.groupId) : null;
  const label = grp ? grp.label.toLowerCase() : '—';
  return (
    <div data-dt-raw="true" style={{
      ...baseStyle,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: label === '—' ? 'var(--ink-4)' : 'var(--ink-3)',
      letterSpacing: '0.06em',
    }}>{label}</div>
  );
}

// Supplier — sans 11 ink-3, editable on click.
function SupplierCell(row, ctx) {
  const { baseStyle, editing, setEditing, onSave } = ctx;
  const supplier = window.getFieldValue ? window.getFieldValue(row, 'supplier') : row.supplier;
  if (editing) {
    return <window.DtInlineInput
      baseStyle={baseStyle}
      initial={supplier || ''}
      onCommit={(v) => onSave(v || null)}
      onCancel={() => setEditing(false)}
    />;
  }
  return (
    <div data-dt-raw="true"
      style={{ ...baseStyle, fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-3)' }}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      {supplier || <span style={{ color: 'var(--ink-4)' }}>—</span>}
    </div>
  );
}

// Price — mono 11 right-aligned. Inline-edit preserved.
function UnitCostCell(row, ctx) {
  const { baseStyle, editing, setEditing, onSave } = ctx;
  const unitCost = window.getFieldValue ? window.getFieldValue(row, 'unit_cost') : row.unitCost;
  const unit = window.getFieldValue ? window.getFieldValue(row, 'unit') : row.unit;
  if (editing) {
    return <window.DtInlineInput
      baseStyle={baseStyle}
      initial={unitCost || ''}
      type="number"
      onCommit={(v) => onSave(v === '' ? null : Number(v))}
      onCancel={() => setEditing(false)}
    />;
  }
  const styled = {
    ...baseStyle,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
  };
  return (
    <div data-dt-raw="true" style={styled}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      {unitCost != null
        ? <>${Number(unitCost).toFixed(0)}<span style={{ color: 'var(--ink-4)' }}>/{unit || 'u'}</span></>
        : <span style={{ color: 'var(--ink-4)' }}>—</span>}
    </div>
  );
}

// Hover-reveal action cluster — Edit / Duplicate / Remove. Uses
// `.reg-row-actions` class so the row's :hover toggles opacity (see CSS at
// the top of this file).
function ActionsCell(row, ctx) {
  const { baseStyle, onEditMaterial, onDuplicateMaterial, onDeleteMaterial } = ctx;
  function btn(label, title, onClick, danger = false) {
    return (
      <button type="button"
        onClick={(e) => { e.stopPropagation(); onClick && onClick(row); }}
        title={title}
        style={{
          background: 'none',
          border: 'none',
          padding: '0 4px',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: danger ? 'var(--accent-ink)' : 'var(--ink-4)',
          fontWeight: 500,
          lineHeight: 1,
        }}
        onMouseEnter={e => e.currentTarget.style.color = danger ? 'var(--accent)' : 'var(--ink)'}
        onMouseLeave={e => e.currentTarget.style.color = danger ? 'var(--accent-ink)' : 'var(--ink-4)'}
      >{label}</button>
    );
  }
  return (
    <div data-dt-raw="true" style={{ ...baseStyle, justifyContent: 'flex-end' }}>
      <span className="reg-actions"
        style={{ gap: 8 }}>
        {btn('Edit', 'Edit entry (E)', onEditMaterial)}
        <span style={{ width: 1, height: 10, background: 'var(--rule-2)' }} />
        {btn('Dup', 'Duplicate', onDuplicateMaterial)}
        <span style={{ width: 1, height: 10, background: 'var(--rule-2)' }} />
        {btn('Del', 'Remove from library', onDeleteMaterial, true)}
      </span>
    </div>
  );
}

// ─── Legacy / optional cell renderers (still available via column chooser) ─

function CategoryCell(row, ctx) {
  const cat = categoryDisplayLabel(row) || '—';
  return (
    <div data-dt-raw="true" style={{ ...ctx.baseStyle, fontSize: 10, color: 'var(--ink-3)',
      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {cat}
    </div>
  );
}

function KindCell(row, ctx) {
  // Phase 2: 'kind' is being phased out. Render the v5 group label, which
  // is the closest analogue ("Finishes", "Lighting", etc.).
  const catId = resolveCategoryId(row);
  const cat = catId && window.categoryDef ? window.categoryDef(catId) : null;
  const grp = cat && window.groupDef ? window.groupDef(cat.groupId) : null;
  const label = grp ? grp.label : 'Material';
  return (
    <div data-dt-raw="true" style={{ ...ctx.baseStyle, fontSize: 10, color: 'var(--ink-3)',
      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
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
          fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 5px',
          letterSpacing: '0.05em', textTransform: 'uppercase',
          border: '1px solid var(--rule-2)',
          background: 'var(--paper-2)', color: 'var(--ink-3)',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>{t}</span>
      ))}
      {tags.length > 3 && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)' }}>
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
              width: 6, height: 6,
              background: 'var(--ink-3)', flexShrink: 0,
            }} />
        );
      })}
      {ids.length > 4 && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginLeft: 2 }}>
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
  const catId = resolveCategoryId(row);
  if (catId === 'paint') {
    return <div data-dt-raw="true" style={{ ...baseStyle, color: 'var(--ink-4)' }}>—</div>;
  }
  const paintedWithId = window.getFieldValue ? window.getFieldValue(row, 'paintedWith') : row.paintedWithId;
  if (!paintedWithId) {
    return <div data-dt-raw="true" style={{ ...baseStyle, color: 'var(--ink-4)' }}>—</div>;
  }
  const p = (allMaterials || []).find(x => x.id === paintedWithId);
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

// Maps column ids to v5 field ids where they differ.
const COL_TO_V5_FIELD = { leadTime: 'lead_time', origin: 'country_of_origin' };

// Generic editable-text factory for leadTime / thickness / dimensions / origin / finish
function genericEditable(field) {
  const v5Id = COL_TO_V5_FIELD[field] || field;
  return function (row, ctx) {
    const { baseStyle, editing, setEditing, onSave } = ctx;
    const v = window.getFieldValue ? window.getFieldValue(row, v5Id) : (row[field] || row[v5Id]);
    if (editing) {
      return <window.DtInlineInput
        baseStyle={baseStyle}
        initial={v || ''}
        onCommit={(val) => onSave(val || null)}
        onCancel={() => setEditing(false)}
      />;
    }
    return (
      <div data-dt-raw="true" style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
        {v || <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>
    );
  };
}

// ───────── Column catalogue ─────────
//
// The first 10 entries are the design's `.reg-row` columns in order. The rest
// are optional columns surfaced via the column chooser.

const LIBRARY_COLUMNS = [
  // Design row, in spec order:
  { id: 'drag',     label: '', width: 24, minWidth: 24, fixed: true, locked: true, defaultOn: true, align: 'center', sortable: false,
    render: DragCell },
  { id: 'select',   label: '', width: 32, minWidth: 32, fixed: true, locked: true, defaultOn: true, align: 'center', sortable: false },
  { id: 'swatch',   label: '', width: 44, minWidth: 44, fixed: true, locked: true, defaultOn: true, align: 'center', sortable: false,
    render: SwatchCell },
  { id: 'code',     label: 'Code', width: 96, minWidth: 64, defaultOn: false,
    visible: () => !!(window.isOfficeMode && window.isOfficeMode(window.appState?.settings?.dupePolicy)),
    render: CodeCell,
    searchText: (m) => m.code,
  },
  { id: 'label',    label: 'Material', width: 320, minWidth: 180, locked: true, defaultOn: true,
    render: LabelCell,
    sortValue: (m) => window.formatLabel(m, window._labelTemplatesCache || {}).toLowerCase(),
    searchText: (m) => (m.name || '') + ' ' + (m.customName || ''),
  },
  { id: 'brand',    label: 'Brand', width: 130, minWidth: 80, defaultOn: true,
    render: BrandCell,
    searchText: (m) => window.getFieldValue ? window.getFieldValue(m, 'brand') : m.brand },
  { id: 'productType', label: 'Group', width: 130, minWidth: 90, defaultOn: true,
    render: ProductTypeCell,
    sortValue: (m) => {
      const id = resolveCategoryId(m);
      const c = id && window.categoryDef && window.categoryDef(id);
      const g = c && window.groupDef && window.groupDef(c.groupId);
      return g ? g.label : '';
    },
    searchText: (m) => {
      const id = resolveCategoryId(m);
      const c = id && window.categoryDef && window.categoryDef(id);
      const g = c && window.groupDef && window.groupDef(c.groupId);
      return g ? g.label : '';
    },
  },
  { id: 'supplier', label: 'Supplier', width: 150, minWidth: 90, editable: true, defaultOn: true,
    render: SupplierCell,
    searchText: (m) => window.getFieldValue ? window.getFieldValue(m, 'supplier') : m.supplier },
  { id: 'unitCost', label: 'Price', width: 100, minWidth: 70, mono: true, editable: true, align: 'right', defaultOn: true,
    render: UnitCostCell,
    sortValue: (m) => (window.getFieldValue ? Number(window.getFieldValue(m, 'unit_cost')) : m.unitCost) || 0 },
  { id: 'actions',  label: '', width: 130, minWidth: 130, fixed: true, locked: true, defaultOn: true, align: 'right', sortable: false,
    render: ActionsCell },

  // Optional columns (off by default; available via column chooser):
  { id: 'kind',     label: 'Group', width: 120, minWidth: 80, render: KindCell,
    sortValue: (m) => {
      const id = resolveCategoryId(m);
      const c = id && window.categoryDef && window.categoryDef(id);
      const g = c && window.groupDef && window.groupDef(c.groupId);
      return g ? g.label : '';
    } },
  { id: 'trade',    label: 'Trade', width: 140, minWidth: 90, render: TradeCell,
    sortValue: (m) => m.trade || '' },
  { id: 'tags',     label: 'Tags', width: 160, minWidth: 100, sortable: false,
    render: TagsCell },
  { id: 'category', label: 'Category', width: 100, minWidth: 70, render: CategoryCell,
    searchText: (m) => categoryDisplayLabel(m) || '' },
  { id: 'supplier_code', label: 'Supplier code', width: 120, minWidth: 70, mono: true, editable: true,
    render: genericEditable('supplier_code'),
    searchText: (m) => m.supplier_code },
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

// Default visible set is derived from per-column `defaultOn` flags.
const LIBRARY_DEFAULT_VISIBLE = LIBRARY_COLUMNS.filter(c => c.defaultOn).map(c => c.id);
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
  BrandCell, ProductTypeCell, SupplierCell, ActionsCell, DragCell,
  genericEditable,
  resolveCategoryId, categoryDisplayLabel,
});
