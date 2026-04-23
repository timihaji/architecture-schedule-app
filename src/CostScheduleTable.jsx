// Cost Schedule — Table mode. Uses the shared DataTable.
//
// Two row shapes, user-togglable:
//   · flat    — one row per (component × option). Row id = "optId:compId".
//   · grouped — one row per component; each option becomes a dynamic column.
//
// Edits go via the host-provided setComp / setCellMaterial / cellTotal /
// bulk-action helpers so all the existing schedule ops keep working.

// ───────── Column catalogues ─────────

function buildCstFlatColumns({ materials, labelTemplates, libraries, onOpenPicker }) {
  return [
    { id: 'select',   label: '', width: 32, minWidth: 32, fixed: true, align: 'center', sortable: false },

    // Component context
    { id: 'component', label: 'Component', width: 200, minWidth: 140, serif: true,
      render: (r, ctx) => (
        <div data-dt-raw="true" style={{ ...ctx.baseStyle, fontSize: 12.5 }}>
          {r.component.name || <span style={{ color: 'var(--ink-4)' }}>(unnamed)</span>}
        </div>
      ),
      sortValue: (r) => (r.component.name || '').toLowerCase(),
      searchText: (r) => r.component.name || '',
    },
    { id: 'category', label: 'Trade', width: 120, minWidth: 80,
      render: (r, ctx) => (
        <div data-dt-raw="true" style={{ ...ctx.baseStyle, fontSize: 10.5, color: 'var(--ink-2)' }}>
          {r.component.category || 'Uncategorised'}
        </div>
      ),
      sortValue: (r) => r.component.category || '',
      searchText: (r) => r.component.category || '',
    },
    { id: 'option', label: 'Option', width: 110, minWidth: 80,
      render: (r, ctx) => (
        <div data-dt-raw="true" style={{ ...ctx.baseStyle, fontSize: 10.5, color: 'var(--ink-2)' }}>
          <span style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-4)', marginRight: 6 }}>
            OPT·{String(r.optionIndex + 1).padStart(2, '0')}
          </span>
          {r.option.name}
        </div>
      ),
      sortValue: (r) => r.optionIndex,
      searchText: (r) => r.option.name || '',
    },

    // Material assignment
    { id: 'swatch', label: '', width: 32, minWidth: 32, align: 'center', sortable: false,
      render: (r, ctx) => {
        if (!r.material) return <div data-dt-raw="true" style={ctx.baseStyle} />;
        return window.SwatchCell(r.material, { ...ctx, allMaterials: materials });
      },
    },
    { id: 'material', label: 'Material', width: 260, minWidth: 180, serif: true,
      render: (r, ctx) => {
        if (!r.material) {
          return (
            <div data-dt-raw="true" style={ctx.baseStyle}
              onClick={(e) => { e.stopPropagation(); onOpenPicker(r.option.id, r.component.id); }}>
              <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>assign…</span>
            </div>
          );
        }
        return window.LabelCell(r.material, { ...ctx, labelTemplates });
      },
      sortValue: (r) => r.material ? window.formatLabel(r.material, labelTemplates).toLowerCase() : '',
      searchText: (r) => r.material ? window.formatLabel(r.material, labelTemplates) : '',
    },
    { id: 'code', label: 'Code', width: 82, minWidth: 60, mono: true,
      render: (r, ctx) => <div data-dt-raw="true" style={ctx.baseStyle}>{r.material?.code || '—'}</div>,
      sortValue: (r) => r.material?.code || '',
    },
    { id: 'supplier', label: 'Supplier', width: 140, minWidth: 90,
      render: (r, ctx) => <div data-dt-raw="true" style={ctx.baseStyle}>
        {r.material?.supplier || <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>,
      sortValue: (r) => r.material?.supplier || '',
      searchText: (r) => r.material?.supplier || '',
    },

    // Component numeric fields — editable inline
    { id: 'count', label: '#', width: 54, minWidth: 44, mono: true, align: 'right', editable: true,
      inputType: 'number',
      get: (r) => r.component.count,
      render: (r, ctx) => {
        const { baseStyle, editing, setEditing, onSave } = ctx;
        if (editing) {
          return <window.DtInlineInput
            baseStyle={baseStyle}
            initial={r.component.count ?? ''}
            type="number"
            onCommit={(v) => onSave(v === '' ? null : Number(v))}
            onCancel={() => setEditing(false)}
          />;
        }
        return (
          <div data-dt-raw="true" style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
            {r.component.count != null ? r.component.count : <span style={{ color: 'var(--ink-4)' }}>—</span>}
          </div>
        );
      },
      sortValue: (r) => r.component.count || 0,
    },
    { id: 'size', label: 'Size', width: 80, minWidth: 60, mono: true, align: 'right', editable: true,
      inputType: 'number',
      get: (r) => r.component.size,
      render: (r, ctx) => {
        const { baseStyle, editing, setEditing, onSave } = ctx;
        if (editing) {
          return <window.DtInlineInput
            baseStyle={baseStyle}
            initial={r.component.size ?? ''}
            type="number"
            onCommit={(v) => onSave(v === '' ? '' : Number(v))}
            onCancel={() => setEditing(false)}
          />;
        }
        return (
          <div data-dt-raw="true" style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
            {r.component.size !== '' && r.component.size != null ? r.component.size : <span style={{ color: 'var(--ink-4)' }}>—</span>}
          </div>
        );
      },
      sortValue: (r) => Number(r.component.size) || 0,
    },
    { id: 'unit', label: 'Unit', width: 60, minWidth: 44, mono: true, editable: true,
      get: (r) => r.component.unit,
      render: (r, ctx) => {
        const { baseStyle, editing, setEditing, onSave } = ctx;
        if (editing) {
          return <window.DtInlineInput
            baseStyle={baseStyle}
            initial={r.component.unit || ''}
            onCommit={(v) => onSave(v || 'm²')}
            onCancel={() => setEditing(false)}
          />;
        }
        return (
          <div data-dt-raw="true" style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
            {r.component.unit || 'm²'}
          </div>
        );
      },
    },
    { id: 'unitCost', label: 'Unit cost', width: 90, minWidth: 70, mono: true, align: 'right',
      render: (r, ctx) => (
        <div data-dt-raw="true" style={ctx.baseStyle}>
          {r.material?.unitCost != null
            ? <>${Number(r.material.unitCost).toFixed(0)}<span style={{ color: 'var(--ink-4)' }}>/{r.material.unit || 'u'}</span></>
            : <span style={{ color: 'var(--ink-4)' }}>—</span>}
        </div>
      ),
      sortValue: (r) => r.material?.unitCost || 0,
    },
    { id: 'lineTotal', label: 'Line total', width: 110, minWidth: 80, mono: true, align: 'right',
      render: (r, ctx) => (
        <div data-dt-raw="true" style={{ ...ctx.baseStyle, color: r.total ? 'var(--ink)' : 'var(--ink-4)' }}>
          {r.total != null
            ? '$' + Math.round(r.total).toLocaleString()
            : '—'}
        </div>
      ),
      sortValue: (r) => r.total || 0,
    },
    { id: 'finish', label: 'Finish', width: 120, minWidth: 80,
      render: (r, ctx) => <div data-dt-raw="true" style={ctx.baseStyle}>
        {r.material?.finish || <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>,
      searchText: (r) => r.material?.finish || '',
    },
    { id: 'leadTime', label: 'Lead', width: 70, minWidth: 50, mono: true, align: 'right',
      render: (r, ctx) => <div data-dt-raw="true" style={ctx.baseStyle}>
        {r.material?.leadTime || <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </div>,
    },
  ];
}

function buildCstGroupedColumns({ materials, labelTemplates, libraries, options, onOpenPicker, cellLookup, onMoveUp, onMoveDown }) {
  const base = [
    { id: 'select',   label: '', width: 32, minWidth: 32, fixed: true, align: 'center', sortable: false },
    ...(onMoveUp && onMoveDown ? [{
      id: 'reorder', label: '', width: 46, minWidth: 46, fixed: true, align: 'center', sortable: false,
      render: (r, ctx) => (
        <div data-dt-raw="true" style={{ ...ctx.baseStyle, flexDirection: 'column', gap: 0, padding: '2px 0' }}>
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(r.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: '2px 8px', lineHeight: 1, fontSize: 12 }}
            title="Move up">&#8593;</button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(r.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: '2px 8px', lineHeight: 1, fontSize: 12 }}
            title="Move down">&#8595;</button>
        </div>
      ),
    }] : []),
    { id: 'component', label: 'Component', width: 220, minWidth: 140, serif: true,
      render: (r, ctx) => (
        <div data-dt-raw="true" style={{ ...ctx.baseStyle, fontSize: 12.5 }}>
          {r.name || <span style={{ color: 'var(--ink-4)' }}>(unnamed)</span>}
        </div>
      ),
      sortValue: (r) => (r.name || '').toLowerCase(),
      searchText: (r) => r.name || '',
    },
    { id: 'category', label: 'Trade', width: 120, minWidth: 80,
      render: (r, ctx) => (
        <div data-dt-raw="true" style={{ ...ctx.baseStyle, fontSize: 10.5, color: 'var(--ink-2)' }}>
          {r.category || 'Uncategorised'}
        </div>
      ),
      sortValue: (r) => r.category || '',
      searchText: (r) => r.category || '',
    },
    { id: 'count', label: '#', width: 54, minWidth: 44, mono: true, align: 'right', editable: true,
      inputType: 'number',
      render: (r, ctx) => {
        const { baseStyle, editing, setEditing, onSave } = ctx;
        if (editing) {
          return <window.DtInlineInput
            baseStyle={baseStyle}
            initial={r.count ?? ''}
            type="number"
            onCommit={(v) => onSave(v === '' ? null : Number(v))}
            onCancel={() => setEditing(false)}
          />;
        }
        return (
          <div data-dt-raw="true" style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
            {r.count != null ? r.count : <span style={{ color: 'var(--ink-4)' }}>—</span>}
          </div>
        );
      },
      sortValue: (r) => r.count || 0,
    },
    { id: 'size', label: 'Size', width: 80, minWidth: 60, mono: true, align: 'right', editable: true,
      inputType: 'number',
      render: (r, ctx) => {
        const { baseStyle, editing, setEditing, onSave } = ctx;
        if (editing) {
          return <window.DtInlineInput
            baseStyle={baseStyle}
            initial={r.size ?? ''}
            type="number"
            onCommit={(v) => onSave(v === '' ? '' : Number(v))}
            onCancel={() => setEditing(false)}
          />;
        }
        return (
          <div data-dt-raw="true" style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
            {r.size !== '' && r.size != null ? r.size : <span style={{ color: 'var(--ink-4)' }}>—</span>}
          </div>
        );
      },
    },
    { id: 'unit', label: 'Unit', width: 60, minWidth: 44, mono: true, editable: true,
      render: (r, ctx) => {
        const { baseStyle, editing, setEditing, onSave } = ctx;
        if (editing) {
          return <window.DtInlineInput
            baseStyle={baseStyle}
            initial={r.unit || ''}
            onCommit={(v) => onSave(v || 'm²')}
            onCancel={() => setEditing(false)}
          />;
        }
        return (
          <div data-dt-raw="true" style={baseStyle} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
            {r.unit || 'm²'}
          </div>
        );
      },
    },
  ];

  // One column per option
  const optCols = options.map((opt, optIdx) => ({
    id: 'opt:' + opt.id,
    label: opt.name,
    width: 180, minWidth: 120, serif: true,
    optionId: opt.id,
    sortable: false,
    render: (r, ctx) => {
      const cell = cellLookup(opt.id, r.id);
      const material = cell?.materialId ? materials.find(m => m.id === cell.materialId) : null;
      if (!material) {
        return (
          <div data-dt-raw="true" style={ctx.baseStyle}
            onClick={(e) => { e.stopPropagation(); onOpenPicker(opt.id, r.id); }}>
            <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>assign…</span>
          </div>
        );
      }
      return (
        <div data-dt-raw="true" style={{ ...ctx.baseStyle, gap: 8 }}
          onClick={(e) => { e.stopPropagation(); onOpenPicker(opt.id, r.id); }}>
          <Swatch swatch={material.swatch} size="xs" seed={parseInt((material.id || '').slice(2)) || 1}
            style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 }}>
            {window.formatLabel(material, labelTemplates)}
          </span>
        </div>
      );
    },
  }));

  return [...base, ...optCols];
}

// ───────── Grouped totals footer ─────────

function CstGroupedTotalsFooter({ schedule, cellTotal }) {
  const optionTotals = schedule.options.map(opt => ({
    opt,
    total: schedule.components.reduce((s, c) => s + (cellTotal ? (cellTotal(opt.id, c) || 0) : 0), 0),
  }));
  const min = optionTotals.length ? Math.min(...optionTotals.map(o => o.total)) : 0;
  return (
    <div style={{
      borderTop: '2px solid var(--rule)', background: 'var(--paper-2)',
      padding: '12px 14px', display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap',
    }}>
      <span style={{ ...ui.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
        Totals
      </span>
      {optionTotals.map(({ opt, total }) => (
        <span key={opt.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-3)' }}>{opt.name}</span>
          <span style={{ ...ui.mono, fontSize: 13, fontWeight: 500, color: total === min ? 'var(--ink)' : 'var(--ink-2)' }}>
            ${Math.round(total).toLocaleString()}
          </span>
          {total !== min && (
            <span style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-4)' }}>
              +${Math.round(total - min).toLocaleString()}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// ───────── Main component ─────────

function CostScheduleTable({
  schedule, materials, libraries, labelTemplates,
  setComp, setCellMaterial, removeComponent, duplicateComponent,
  changeComponentCategory, cellTotal,
  onOpenPicker,
  appendComponentToCategory, moveRowUp, moveRowDown,
}) {
  const [rowShape, setRowShape] = React.useState(() => {
    try { return localStorage.getItem('aml-cs-rowshape') || 'flat'; } catch { return 'flat'; }
  });
  function setRowShapePersist(v) {
    setRowShape(v);
    try { localStorage.setItem('aml-cs-rowshape', v); } catch {}
  }

  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState([]);
  const [sort, setSort] = React.useState({ id: 'component', dir: 'asc' });
  const [selected, setSelected] = React.useState(new Set());
  const [cursorId, setCursorId] = React.useState(null);
  const [openId, setOpenId] = React.useState(null);
  const [editingCell, setEditingCell] = React.useState(null);
  const searchRef = React.useRef(null);

  // Materials by id for quick lookups
  const matById = React.useMemo(() => {
    const m = new Map();
    materials.forEach(x => m.set(x.id, x));
    return m;
  }, [materials]);

  // ───── Flat rows: one per (option × component)
  const flatRows = React.useMemo(() => {
    if (rowShape !== 'flat') return [];
    const rows = [];
    schedule.components.forEach(comp => {
      schedule.options.forEach((opt, optIdx) => {
        const cell = schedule.cells[opt.id + ':' + comp.id];
        const material = cell?.materialId ? matById.get(cell.materialId) : null;
        const total = cellTotal ? cellTotal(opt.id, comp) : null;
        rows.push({
          id: opt.id + ':' + comp.id,
          component: comp,
          option: opt,
          optionIndex: optIdx,
          material,
          total,
        });
      });
    });
    return rows;
  }, [schedule, rowShape, matById, cellTotal]);

  // ───── Grouped rows: just the components (material cells are column-dynamic)
  const groupedRows = React.useMemo(() => {
    if (rowShape !== 'grouped') return [];
    return schedule.components;
  }, [schedule.components, rowShape]);

  // Save handler resolves to the correct schedule op based on the edited field
  function handleFlatSave(rowId, field, value) {
    const [optionId, componentId] = rowId.split(':');
    if (field === 'count' || field === 'size' || field === 'unit') {
      setComp(componentId, field, value);
    }
  }
  function handleGroupedSave(rowId, field, value) {
    if (field === 'count' || field === 'size' || field === 'unit') {
      setComp(rowId, field, value);
    }
  }

  // Row click → open side panel
  function handleFlatOpenRow(rowId) {
    setOpenId(rowId);
  }
  function handleGroupedOpenRow(rowId) {
    setOpenId(rowId);
  }

  // ───── Columns + lookup
  const cellLookup = React.useCallback(
    (optId, compId) => schedule.cells[optId + ':' + compId] || null,
    [schedule.cells]);

  const columns = React.useMemo(() => {
    if (rowShape === 'flat') {
      return buildCstFlatColumns({ materials, labelTemplates, libraries, onOpenPicker });
    }
    return buildCstGroupedColumns({
      materials, labelTemplates, libraries,
      options: schedule.options,
      onOpenPicker, cellLookup,
      onMoveUp: moveRowUp,
      onMoveDown: moveRowDown,
    });
  }, [rowShape, materials, labelTemplates, libraries, schedule.options, onOpenPicker, cellLookup]);

  const defaultVisible = React.useMemo(() => {
    if (rowShape === 'flat') {
      return ['select', 'component', 'option', 'swatch', 'material', 'count', 'size', 'unit', 'unitCost', 'lineTotal'];
    }
    // Grouped: show component + size/unit + every option
    return [
      'select',
      ...(moveRowUp && moveRowDown ? ['reorder'] : []),
      'component', 'category', 'count', 'size', 'unit',
      ...schedule.options.map(o => 'opt:' + o.id),
    ];
  }, [rowShape, schedule.options]);

  const defaultOrder = React.useMemo(() => columns.map(c => c.id), [columns]);
  const colStorageKey = rowShape === 'flat' ? 'aml-cs-cols-flat' : 'aml-cs-cols-grouped';

  // Totals footer
  const grandTotal = React.useMemo(() => {
    if (rowShape === 'flat') {
      return flatRows.reduce((s, r) => s + (r.total || 0), 0);
    }
    // Grouped: sum first option only (a hint; users can toggle columns)
    return schedule.components.reduce((s, c) => {
      const t = cellTotal ? cellTotal(schedule.options[0]?.id, c) : null;
      return s + (t || 0);
    }, 0);
  }, [rowShape, flatRows, schedule.components, schedule.options, cellTotal]);

  return (
    <div style={{ border: '1px solid var(--rule)', background: 'var(--paper)' }}>
      <CstTableTopBar
        rowShape={rowShape} setRowShape={setRowShapePersist}
        query={query} setQuery={setQuery} searchRef={searchRef}
        rowCount={rowShape === 'flat' ? flatRows.length : groupedRows.length}
        grandTotal={grandTotal}
        onAddComponent={appendComponentToCategory ? () => {
          const cats = Array.from(new Set(schedule.components.map(c => c.category || 'Uncategorised')));
          const defaultCat = cats[0] || 'Uncategorised';
          const hint = cats.length > 0 ? ' (' + cats.join(', ') + ')' : '';
          const cat = window.prompt('Trade / category' + hint + ':', defaultCat);
          if (cat !== null) appendComponentToCategory((cat || '').trim() || 'Uncategorised');
        } : null}
      />
      <window.DataTable
        key={rowShape}
        rows={rowShape === 'flat' ? flatRows : groupedRows}
        columns={columns}
        colStorageKey={colStorageKey}
        defaultVisible={defaultVisible}
        defaultOrder={defaultOrder}
        query={query}
        filters={filters}
        sort={sort} setSort={setSort}
        selected={selected} setSelected={setSelected}
        cursorId={cursorId} setCursorId={setCursorId}
        openId={openId} setOpenId={setOpenId}
        editingCell={editingCell} setEditingCell={setEditingCell}
        density="regular"
        onSaveCell={rowShape === 'flat' ? handleFlatSave : handleGroupedSave}
        onOpenRow={rowShape === 'flat' ? handleFlatOpenRow : handleGroupedOpenRow}
        searchRef={searchRef}
        cellContext={{ libraries, allMaterials: materials, labelTemplates }}
        sidePanel={
          openId ? (
            <CstSidePanel
              rowId={openId}
              rowShape={rowShape}
              schedule={schedule}
              matById={matById}
              labelTemplates={labelTemplates}
              libraries={libraries}
              onClose={() => setOpenId(null)}
              onOpenPicker={onOpenPicker}
              setComp={setComp}
            />
          ) : null
        }
        bulkBar={
          <CstBulkBar
            rowShape={rowShape}
            selected={selected}
            setSelected={setSelected}
            schedule={schedule}
            materials={materials}
            setCellMaterial={setCellMaterial}
            removeComponent={removeComponent}
            duplicateComponent={duplicateComponent}
            setComp={setComp}
          />
        }
      />
      {rowShape === 'grouped' && cellTotal && (
        <CstGroupedTotalsFooter schedule={schedule} cellTotal={cellTotal} />
      )}
    </div>
  );
}

// ───────── Top bar ─────────

function CstTableTopBar({ rowShape, setRowShape, query, setQuery, searchRef, rowCount, grandTotal, onAddComponent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 14px',
      borderBottom: '1px solid var(--rule)',
      background: 'var(--paper-2)',
      minHeight: 44,
    }}>
      <input ref={searchRef}
        placeholder="/  Search components, materials, suppliers…"
        value={query} onChange={e => setQuery(e.target.value)}
        style={{
          flex: 1, maxWidth: 420,
          background: 'transparent', border: '1px solid var(--rule)',
          padding: '6px 10px', outline: 'none',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 12,
          color: 'var(--ink)',
        }} />

      <div style={{ flex: 1 }} />

      <span style={{ ...ui.mono, fontSize: 10, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--ink-4)' }}>
        {rowCount} rows · grand total ${Math.round(grandTotal).toLocaleString()}
      </span>

      {onAddComponent && (
        <button onClick={onAddComponent} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 10, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--ink-3)',
          padding: '4px 8px',
        }}>
          + Add component
        </button>
      )}

      {/* Row-shape toggle */}
      <div style={{
        display: 'flex', border: '1px solid var(--rule-2)',
        background: 'var(--paper)',
      }}>
        {[
          { id: 'flat', label: 'Flat' },
          { id: 'grouped', label: 'Grouped' },
        ].map(opt => (
          <button key={opt.id} type="button"
            onClick={() => setRowShape(opt.id)}
            title={opt.id === 'flat'
              ? 'One row per (component × option) — sortable, filterable'
              : 'One row per component; each option is a column'}
            style={{
              background: rowShape === opt.id ? 'var(--ink)' : 'transparent',
              color: rowShape === opt.id ? 'var(--paper)' : 'var(--ink-3)',
              border: 'none', cursor: 'pointer',
              padding: '5px 12px',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500,
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────── Bulk bar ─────────

function CstBulkBar({ rowShape, selected, setSelected, schedule, materials,
  setCellMaterial, removeComponent, duplicateComponent, setComp }) {
  const [moveToOpen, setMoveToOpen] = React.useState(false);
  const [dupToOpen, setDupToOpen] = React.useState(false);
  const [qtyPromptOpen, setQtyPromptOpen] = React.useState(false);
  const count = selected.size;
  const ids = Array.from(selected);

  function clearAssignments() {
    if (!window.confirm(`Clear material from ${count} cell${count === 1 ? '' : 's'}?`)) return;
    if (rowShape === 'flat') {
      ids.forEach(id => {
        const [optionId, componentId] = id.split(':');
        setCellMaterial(optionId, componentId, null);
      });
    } else {
      // Grouped: clear across all options for each selected component
      ids.forEach(compId => {
        schedule.options.forEach(o => setCellMaterial(o.id, compId, null));
      });
    }
    setSelected(new Set());
  }

  function duplicateTo(targetOptId) {
    if (rowShape !== 'flat') return;
    ids.forEach(id => {
      const [sourceOptId, componentId] = id.split(':');
      const cell = schedule.cells[sourceOptId + ':' + componentId];
      if (cell?.materialId) setCellMaterial(targetOptId, componentId, cell.materialId);
    });
    setSelected(new Set());
    setDupToOpen(false);
  }

  function moveTo(targetOptId) {
    if (rowShape !== 'flat') return;
    ids.forEach(id => {
      const [sourceOptId, componentId] = id.split(':');
      const cell = schedule.cells[sourceOptId + ':' + componentId];
      if (cell?.materialId) {
        setCellMaterial(targetOptId, componentId, cell.materialId);
        setCellMaterial(sourceOptId, componentId, null);
      }
    });
    setSelected(new Set());
    setMoveToOpen(false);
  }

  function setCommonQty() {
    const v = window.prompt('Set size for all selected rows (leave blank to clear count):');
    if (v === null) return;
    const size = v === '' ? '' : Number(v);
    const compIds = new Set();
    if (rowShape === 'flat') {
      ids.forEach(id => compIds.add(id.split(':')[1]));
    } else {
      ids.forEach(id => compIds.add(id));
    }
    compIds.forEach(cid => setComp(cid, 'size', size));
    setSelected(new Set());
  }

  function copySupplierList() {
    const compIds = new Set();
    if (rowShape === 'flat') {
      ids.forEach(id => compIds.add(id.split(':')[1]));
    } else {
      ids.forEach(id => compIds.add(id));
    }
    // Gather every material assigned to any option for these components
    const bySupplier = new Map();
    compIds.forEach(cid => {
      schedule.options.forEach(opt => {
        const cell = schedule.cells[opt.id + ':' + cid];
        if (!cell?.materialId) return;
        const m = materials.find(x => x.id === cell.materialId);
        if (!m) return;
        const sup = m.supplier || '(no supplier)';
        if (!bySupplier.has(sup)) bySupplier.set(sup, []);
        bySupplier.get(sup).push(m);
      });
    });
    const lines = [];
    Array.from(bySupplier.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([sup, mats]) => {
      lines.push(sup.toUpperCase());
      const seen = new Set();
      mats.forEach(m => {
        const key = m.code + '|' + m.name;
        if (seen.has(key)) return;
        seen.add(key);
        lines.push(`  ${m.code} — ${m.name}`);
      });
      lines.push('');
    });
    const text = lines.join('\n');
    try {
      navigator.clipboard.writeText(text);
      window.alert('Copied supplier list to clipboard (' + bySupplier.size + ' suppliers).');
    } catch {
      window.prompt('Copy this:', text);
    }
  }

  function deleteRows() {
    const compIds = new Set();
    if (rowShape === 'flat') {
      ids.forEach(id => compIds.add(id.split(':')[1]));
    } else {
      ids.forEach(id => compIds.add(id));
    }
    const n = compIds.size;
    if (!window.confirm(`Delete ${n} component${n === 1 ? '' : 's'} and all their assignments?`)) return;
    compIds.forEach(id => removeComponent(id));
    setSelected(new Set());
  }

  const btnStyle = {
    background: 'transparent', border: '1px solid var(--rule-2)',
    color: 'var(--ink)', cursor: 'pointer',
    padding: '6px 10px',
    fontFamily: "'Inter Tight', sans-serif", fontSize: 10.5,
    letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500,
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      borderTop: '1px solid var(--rule)',
      background: 'var(--paper-2)',
      position: 'sticky', bottom: 0, zIndex: 3,
    }}>
      <span style={{ ...ui.mono, fontSize: 10, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--ink)' }}>
        {count} selected
      </span>
      <div style={{ flex: 1 }} />

      {rowShape === 'flat' && (
        <>
          <div style={{ position: 'relative' }}>
            <button style={btnStyle} onClick={() => { setDupToOpen(!dupToOpen); setMoveToOpen(false); }}>
              Duplicate to option ▾
            </button>
            {dupToOpen && (
              <div style={cstMenuStyle}>
                {schedule.options.map(o => (
                  <button key={o.id} style={cstMenuItemStyle}
                    onClick={() => duplicateTo(o.id)}>{o.name}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <button style={btnStyle} onClick={() => { setMoveToOpen(!moveToOpen); setDupToOpen(false); }}>
              Move to option ▾
            </button>
            {moveToOpen && (
              <div style={cstMenuStyle}>
                {schedule.options.map(o => (
                  <button key={o.id} style={cstMenuItemStyle}
                    onClick={() => moveTo(o.id)}>{o.name}</button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <button style={btnStyle} onClick={setCommonQty}>Set size…</button>
      <button style={btnStyle} onClick={copySupplierList}>Copy as supplier list</button>
      <button style={{ ...btnStyle, color: 'var(--accent-ink)' }} onClick={deleteRows}>
        Delete rows
      </button>
      <button style={{ ...btnStyle, color: 'var(--accent-ink)' }} onClick={clearAssignments}>
        Clear assignment
      </button>
      <button style={{ ...btnStyle, border: 'none', color: 'var(--ink-3)' }}
        onClick={() => setSelected(new Set())}>×</button>
    </div>
  );
}

const cstMenuStyle = {
  position: 'absolute', top: '100%', right: 0, marginTop: 4,
  background: 'var(--paper)', border: '1px solid var(--rule)',
  minWidth: 160, zIndex: 20,
  boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
};
const cstMenuItemStyle = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'transparent', border: 'none', cursor: 'pointer',
  padding: '8px 12px',
  fontFamily: "'Inter Tight', sans-serif", fontSize: 11.5,
  color: 'var(--ink)',
};

// ───────── Side panel ─────────

function CstSidePanel({ rowId, rowShape, schedule, matById, labelTemplates, libraries, onClose, onOpenPicker, setComp }) {
  const [editingField, setEditingField] = React.useState(null);
  const [draftVal, setDraftVal] = React.useState('');

  let comp = null, option = null, material = null;
  if (rowShape === 'flat') {
    const [optionId, componentId] = rowId.split(':');
    comp = schedule.components.find(c => c.id === componentId);
    option = schedule.options.find(o => o.id === optionId);
    const cell = schedule.cells[rowId];
    material = cell?.materialId ? matById.get(cell.materialId) : null;
  } else {
    comp = schedule.components.find(c => c.id === rowId);
  }

  if (!comp) return null;

  const label = material
    ? (window.formatLabel ? window.formatLabel(material, labelTemplates) : material.name)
    : null;

  function startEdit(field, current) {
    setEditingField(field);
    setDraftVal(current != null ? String(current) : '');
  }
  function commitEdit(field) {
    if (setComp) {
      const val = (field === 'count' || field === 'size')
        ? (draftVal === '' ? null : Number(draftVal))
        : draftVal;
      setComp(comp.id, field, val);
    }
    setEditingField(null);
  }

  const optIdx = option ? schedule.options.indexOf(option) : -1;

  return (
    <div style={{
      borderLeft: '1px solid var(--rule)',
      background: 'var(--paper)',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      minHeight: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px', borderBottom: '1px solid var(--rule)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 1, gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: "'Source Serif 4', serif",
            fontSize: 14, lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{comp.name || '(unnamed)'}</div>
          <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {comp.category && (
              <span style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--ink-3)',
              }}>{comp.category}</span>
            )}
            {option && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '1px 5px', border: '1px solid var(--rule-2)',
                color: 'var(--ink-3)', background: 'var(--paper-2)', whiteSpace: 'nowrap',
              }}>OPT·{String(optIdx + 1).padStart(2, '0')} {option.name}</span>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: '1px solid var(--rule-2)',
          cursor: 'pointer', padding: '3px 8px', flexShrink: 0,
          fontFamily: "'Inter Tight', sans-serif", fontSize: 12, color: 'var(--ink-3)',
        }}>×</button>
      </div>

      {/* Material section — flat mode shows the specific cell's material */}
      {rowShape === 'flat' ? (
        <div style={{ padding: '14px 14px 0' }}>
          {material ? (
            <>
              {material.swatch?.tone && (
                <div style={{
                  width: '100%', aspectRatio: '3/2',
                  background: material.swatch.tone,
                  marginBottom: 10,
                  outline: '1px solid rgba(20,20,20,0.08)',
                }} />
              )}
              <div style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: 17, lineHeight: 1.2, marginBottom: 10,
              }}>{label}</div>
              <CstKV label="Code"      value={material.code} />
              <CstKV label="Supplier"  value={material.supplier} />
              <CstKV label="Finish"    value={material.finish} />
              <CstKV label="Lead time" value={material.leadTime} />
              {material.unitCost != null && (
                <CstKV label="Unit cost"
                  value={'$' + Number(material.unitCost).toFixed(0) + ' / ' + (material.unit || 'u')} />
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center', padding: '24px 0',
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic',
            }}>No material assigned</div>
          )}
          <button
            onClick={() => { if (option) onOpenPicker(option.id, comp.id); }}
            style={{
              marginTop: 12, marginBottom: 14, width: '100%',
              background: 'var(--paper-2)', border: '1px solid var(--rule)',
              cursor: 'pointer', padding: '8px 10px',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 10.5,
              letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-2)',
            }}>
            {material ? 'Change material…' : 'Assign material…'}
          </button>
        </div>
      ) : (
        /* Grouped mode — list all options for this component */
        <div style={{ padding: '14px' }}>
          <div style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--ink-4)', marginBottom: 8,
          }}>Options</div>
          {schedule.options.map((opt, i) => {
            const cell = schedule.cells[opt.id + ':' + comp.id];
            const mat = cell?.materialId ? matById.get(cell.materialId) : null;
            const lbl = mat ? (window.formatLabel ? window.formatLabel(mat, labelTemplates) : mat.name) : null;
            return (
              <div key={opt.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 0', borderBottom: '1px solid var(--rule)',
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, color: 'var(--ink-4)', flexShrink: 0, width: 38,
                }}>OPT·{String(i + 1).padStart(2, '0')}</span>
                {mat?.swatch?.tone && (
                  <span style={{
                    width: 14, height: 14, flexShrink: 0,
                    background: mat.swatch.tone,
                    outline: '1px solid rgba(20,20,20,0.12)',
                  }} />
                )}
                <span style={{
                  fontFamily: "'Source Serif 4', serif",
                  fontSize: 12, flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: mat ? 'var(--ink)' : 'var(--ink-4)',
                  fontStyle: mat ? 'normal' : 'italic',
                }}>{lbl || 'unassigned'}</span>
                <button onClick={() => onOpenPicker(opt.id, comp.id)} style={{
                  background: 'none', border: '1px solid var(--rule-2)',
                  cursor: 'pointer', padding: '2px 6px',
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 9, color: 'var(--ink-4)',
                }}>{mat ? '↻' : '+'}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Component-level schedule fields (shared across options) */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid var(--rule)',
        marginTop: 'auto',
      }}>
        <div style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--ink-4)', marginBottom: 10,
        }}>Schedule</div>
        <CstFieldRow label="Count" field="count" value={comp.count} type="number"
          editingField={editingField} draftVal={draftVal}
          setDraftVal={setDraftVal} startEdit={startEdit} commitEdit={commitEdit} />
        <CstFieldRow label="Size"  field="size"  value={comp.size}  type="number"
          editingField={editingField} draftVal={draftVal}
          setDraftVal={setDraftVal} startEdit={startEdit} commitEdit={commitEdit} />
        <CstFieldRow label="Unit"  field="unit"  value={comp.unit}  type="text"
          editingField={editingField} draftVal={draftVal}
          setDraftVal={setDraftVal} startEdit={startEdit} commitEdit={commitEdit} />
      </div>
    </div>
  );
}

function CstKV({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'baseline' }}>
      <span style={{
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--ink-4)', width: 68, flexShrink: 0,
      }}>{label}</span>
      <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 12, color: 'var(--ink-2)' }}>
        {value}
      </span>
    </div>
  );
}

function CstFieldRow({ label, field, value, type, editingField, draftVal, setDraftVal, startEdit, commitEdit }) {
  const isEditing = editingField === field;
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
      <span style={{
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--ink-4)', width: 50, flexShrink: 0,
      }}>{label}</span>
      {isEditing ? (
        <input
          autoFocus type={type} value={draftVal}
          onChange={e => setDraftVal(e.target.value)}
          onBlur={() => commitEdit(field)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit(field);
            if (e.key === 'Escape') setDraftVal('');
          }}
          style={{
            flex: 1, background: 'var(--paper-2)', border: '1px solid var(--ink-3)',
            padding: '3px 6px', fontFamily: "'Inter Tight', sans-serif",
            fontSize: 12, color: 'var(--ink)', outline: 'none',
          }}
        />
      ) : (
        <span
          onClick={() => startEdit(field, value)}
          style={{
            flex: 1, cursor: 'text',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 12,
            color: value != null ? 'var(--ink-2)' : 'var(--ink-4)',
            fontStyle: value != null ? 'normal' : 'italic',
          }}>
          {value != null ? value : '—'}
        </span>
      )}
    </div>
  );
}

Object.assign(window, { CostScheduleTable });
