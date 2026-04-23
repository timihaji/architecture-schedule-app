// Cost Schedule — Table mode. Uses the shared DataTable.
//
// Two row shapes, user-togglable:
//   · flat    — one row per (component × option). Row id = "optId:compId".
//   · grouped — one row per component; each option becomes a dynamic column.
//
// Edits go via the host-provided setComp / setCellMaterial / cellTotal /
// bulk-action helpers so all the existing schedule ops keep working.

// ───────── Column catalogues ─────────

function buildCstFlatColumns({ materials, labelTemplates, libraries, onOpenPicker, actionsRef }) {
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
    { id: 'category', label: 'Trade', width: 120, minWidth: 80, editable: true,
      get: (r) => r.component.category || '',
      render: (r, ctx) => {
        const { baseStyle, editing, setEditing, onSave } = ctx;
        if (editing) {
          return <window.DtInlineInput baseStyle={baseStyle}
            initial={r.component.category || ''}
            onCommit={(v) => onSave((v || '').trim() || 'Uncategorised')}
            onCancel={() => setEditing(false)} />;
        }
        return (
          <div data-dt-raw="true" style={{ ...baseStyle, fontSize: 10.5, color: 'var(--ink-2)' }}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
            {r.component.category || 'Uncategorised'}
          </div>
        );
      },
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
    { id: 'rowActions', label: '', width: 32, minWidth: 32, fixed: true, align: 'center', sortable: false,
      render: (r, ctx) => {
        const { removeComponent, duplicateComponent, setComp, setCellMaterial, schedule } = actionsRef.current;
        const otherOpts = (schedule?.options || []).filter(o => o.id !== r.option?.id);
        const items = [
          { label: 'Change material…', onClick: () => onOpenPicker(r.option.id, r.component.id) },
          ...otherOpts.map(opt => ({
            label: 'Copy to ' + opt.name,
            onClick: () => {
              const cell = (schedule?.cells || {})[r.option.id + ':' + r.component.id];
              if (cell?.materialId) setCellMaterial(opt.id, r.component.id, cell.materialId);
            },
          })),
          { separator: true },
          { label: 'Change category…', onClick: () => {
            const cat = window.prompt('Category:', r.component.category || '');
            if (cat !== null) setComp(r.component.id, 'category', (cat || '').trim());
          }},
          { label: 'Duplicate component', onClick: () => duplicateComponent && duplicateComponent(r.component.id) },
          { label: 'Delete component', danger: true, onClick: () => {
            if (window.confirm('Delete "' + (r.component.name || 'component') + '" and all its assignments?'))
              removeComponent(r.component.id);
          }},
        ];
        return (
          <div data-dt-raw="true" style={{ ...ctx.baseStyle, overflow: 'visible', justifyContent: 'center' }}>
            <CstRowMenu items={items} />
          </div>
        );
      },
    },
  ];
}

function buildCstGroupedColumns({ materials, labelTemplates, libraries, options, onOpenPicker, cellLookup, onMoveUp, onMoveDown, actionsRef }) {
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
    { id: 'category', label: 'Trade', width: 120, minWidth: 80, editable: true,
      get: (r) => r.category || '',
      render: (r, ctx) => {
        const { baseStyle, editing, setEditing, onSave } = ctx;
        if (editing) {
          return <window.DtInlineInput baseStyle={baseStyle}
            initial={r.category || ''}
            onCommit={(v) => onSave((v || '').trim() || 'Uncategorised')}
            onCancel={() => setEditing(false)} />;
        }
        return (
          <div data-dt-raw="true" style={{ ...baseStyle, fontSize: 10.5, color: 'var(--ink-2)' }}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
            {r.category || 'Uncategorised'}
          </div>
        );
      },
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

  const actionsCol = {
    id: 'rowActions', label: '', width: 32, minWidth: 32, fixed: true, align: 'center', sortable: false,
    render: (r, ctx) => {
      const { removeComponent, duplicateComponent, setComp } = actionsRef.current;
      const items = [
        { label: 'Change category…', onClick: () => {
          const cat = window.prompt('Category:', r.category || '');
          if (cat !== null) setComp(r.id, 'category', (cat || '').trim());
        }},
        { separator: true },
        { label: 'Duplicate component', onClick: () => duplicateComponent && duplicateComponent(r.id) },
        { label: 'Delete component', danger: true, onClick: () => {
          if (window.confirm('Delete "' + (r.name || 'component') + '" and all its assignments?'))
            removeComponent(r.id);
        }},
      ];
      return (
        <div data-dt-raw="true" style={{ ...ctx.baseStyle, overflow: 'visible', justifyContent: 'center' }}>
          <CstRowMenu items={items} />
        </div>
      );
    },
  };

  return [...base, ...optCols, actionsCol];
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
  renameOption, reorderOption, removeOption,
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
  const [cheatsheetOpen, setCheatsheetOpen] = React.useState(false);
  const searchRef = React.useRef(null);

  // Stable ref so column render fns can read fresh handlers without being in useMemo deps
  const actionsRef = React.useRef({});
  actionsRef.current = { removeComponent, duplicateComponent, setComp, setCellMaterial, schedule, onOpenPicker };

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
    if (field === 'count' || field === 'size' || field === 'unit' || field === 'category') {
      setComp(componentId, field, value);
    }
  }
  function handleGroupedSave(rowId, field, value) {
    if (field === 'count' || field === 'size' || field === 'unit' || field === 'category') {
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
      return buildCstFlatColumns({ materials, labelTemplates, libraries, onOpenPicker, actionsRef });
    }
    return buildCstGroupedColumns({
      materials, labelTemplates, libraries,
      options: schedule.options,
      onOpenPicker, cellLookup,
      onMoveUp: moveRowUp,
      onMoveDown: moveRowDown,
      actionsRef,
    });
  }, [rowShape, materials, labelTemplates, libraries, schedule.options, onOpenPicker, cellLookup]);

  const defaultVisible = React.useMemo(() => {
    if (rowShape === 'flat') {
      return ['select', 'component', 'option', 'swatch', 'material', 'count', 'size', 'unit', 'unitCost', 'lineTotal', 'rowActions'];
    }
    // Grouped: show component + size/unit + every option
    return [
      'select',
      ...(moveRowUp && moveRowDown ? ['reorder'] : []),
      'component', 'category', 'count', 'size', 'unit',
      ...schedule.options.map(o => 'opt:' + o.id),
      'rowActions',
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
        options={schedule.options}
        renameOption={renameOption}
        reorderOption={reorderOption}
        removeOption={removeOption}
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
        onEditRow={(rowId) => {
          if (rowShape === 'flat') {
            const [optId, compId] = rowId.split(':');
            onOpenPicker(optId, compId);
          } else {
            if (schedule.options[0]) onOpenPicker(schedule.options[0].id, rowId);
          }
        }}
        onAdd={appendComponentToCategory ? () => {
          const cats = Array.from(new Set(schedule.components.map(c => c.category || 'Uncategorised')));
          const defaultCat = cats[0] || 'Uncategorised';
          const hint = cats.length > 0 ? ' (' + cats.join(', ') + ')' : '';
          const cat = window.prompt('Trade / category' + hint + ':', defaultCat);
          if (cat !== null) appendComponentToCategory((cat || '').trim() || 'Uncategorised');
        } : null}
        onDeleteRow={(ids) => {
          const compIds = ids.map(id => rowShape === 'flat' ? id.split(':')[1] : id);
          const msg = compIds.length === 1
            ? 'Delete "' + (schedule.components.find(c => c.id === compIds[0])?.name || 'component') + '" and all its assignments?'
            : 'Delete ' + compIds.length + ' components and all their assignments?';
          if (window.confirm(msg)) compIds.forEach(id => removeComponent(id));
        }}
        onDuplicateRow={duplicateComponent ? (ids) => {
          ids.forEach(id => {
            const compId = rowShape === 'flat' ? id.split(':')[1] : id;
            duplicateComponent(compId);
          });
        } : null}
        groupBy={rowShape === 'flat'
          ? (r) => r.component.category || 'Uncategorised'
          : (r) => r.category || 'Uncategorised'}
        groupSubtotal={rowShape === 'flat'
          ? (groupRows) => {
              const total = groupRows.reduce((s, r) => s + (r.total || 0), 0);
              return total > 0 ? '$' + Math.round(total).toLocaleString() : null;
            }
          : (groupRows) => groupRows.length + ' component' + (groupRows.length === 1 ? '' : 's')}
        onCheatsheet={() => setCheatsheetOpen(true)}
        searchRef={searchRef}
        cellContext={{ libraries, allMaterials: materials, labelTemplates }}
        matchFilter={(r, f) => {
          if (f.field === 'category') {
            const cat = rowShape === 'flat' ? (r.component?.category || '') : (r.category || '');
            return cat.toLowerCase() === (f.value || '').toLowerCase();
          }
          if (f.field === 'option' && rowShape === 'flat') {
            return (r.option?.name || '').toLowerCase() === (f.value || '').toLowerCase();
          }
          if (f.field === 'supplier') {
            return (r.material?.supplier || '').toLowerCase().includes((f.value || '').toLowerCase());
          }
          if (f.field === 'hasMaterial') {
            return f.value === 'yes' ? !!r.material : !r.material;
          }
          return true;
        }}
        filtersBar={
          <CstFiltersBar
            filters={filters} setFilters={setFilters}
            schedule={schedule} rowShape={rowShape}
          />
        }
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
      {cheatsheetOpen && <CstCheatsheet onClose={() => setCheatsheetOpen(false)} rowShape={rowShape} />}
    </div>
  );
}

// ───────── Top bar ─────────

function CstTableTopBar({ rowShape, setRowShape, query, setQuery, searchRef, rowCount, grandTotal,
  onAddComponent, options, renameOption, reorderOption, removeOption }) {
  const hasOptions = options && options.length > 0 && renameOption;
  return (
    <div style={{ borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
      {/* Main toolbar row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 14px',
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

      {/* Options bar — rename and reorder */}
      {hasOptions && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          padding: '6px 14px 8px',
          borderTop: '1px solid var(--rule)',
        }}>
          <span style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--ink-4)', marginRight: 4, flexShrink: 0,
          }}>Options</span>
          {options.map((opt, i) => (
            <CstOptionChip
              key={opt.id}
              opt={opt}
              index={i}
              total={options.length}
              onRename={renameOption}
              onMoveUp={reorderOption ? () => reorderOption(opt.id, -1) : null}
              onMoveDown={reorderOption ? () => reorderOption(opt.id, 1) : null}
              onRemove={removeOption && options.length > 1 ? () => removeOption(opt.id) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CstOptionChip({ opt, index, total, onRename, onMoveUp, onMoveDown, onRemove }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(opt.name);
  const inputRef = React.useRef(null);

  React.useEffect(() => { if (editing && inputRef.current) inputRef.current.select(); }, [editing]);

  function commit() {
    const name = draft.trim();
    if (name && name !== opt.name) onRename(opt.id, name);
    else setDraft(opt.name);
    setEditing(false);
  }

  const chipBase = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    border: '1px solid var(--rule-2)', background: 'var(--paper)',
    padding: '3px 6px',
  };

  return (
    <div style={{ ...chipBase, gap: 0 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--ink-4)', marginRight: 5, flexShrink: 0,
      }}>OPT·{String(index + 1).padStart(2, '0')}</span>

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(opt.name); setEditing(false); } }}
          style={{
            width: Math.max(60, draft.length * 7.5),
            background: 'transparent', border: 'none', outline: '1px solid var(--ink-3)',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
            color: 'var(--ink)', padding: '0 3px',
          }}
        />
      ) : (
        <span
          onClick={() => { setDraft(opt.name); setEditing(true); }}
          title="Click to rename"
          style={{
            fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
            color: 'var(--ink-2)', cursor: 'text', padding: '0 2px',
          }}>
          {opt.name}
        </span>
      )}

      {onMoveUp && index > 0 && (
        <button onClick={onMoveUp} title="Move left"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--ink-4)', fontSize: 10, lineHeight: 1 }}>
          ←
        </button>
      )}
      {onMoveDown && index < total - 1 && (
        <button onClick={onMoveDown} title="Move right"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--ink-4)', fontSize: 10, lineHeight: 1 }}>
          →
        </button>
      )}
      {onRemove && (
        <button onClick={onRemove} title="Remove option"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px 0 4px', color: 'var(--ink-4)', fontSize: 11, lineHeight: 1 }}>
          ×
        </button>
      )}
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
    // Build: supplier → material key → { material, usages: [{comp, opt, qty, size, unit}] }
    const bySupplier = new Map();
    compIds.forEach(cid => {
      const comp = schedule.components.find(c => c.id === cid);
      if (!comp) return;
      schedule.options.forEach(opt => {
        const cell = schedule.cells[opt.id + ':' + cid];
        if (!cell?.materialId) return;
        const m = materials.find(x => x.id === cell.materialId);
        if (!m) return;
        const sup = m.supplier || '(no supplier)';
        const matKey = m.code + '|' + (m.name || '');
        if (!bySupplier.has(sup)) bySupplier.set(sup, new Map());
        const matMap = bySupplier.get(sup);
        if (!matMap.has(matKey)) matMap.set(matKey, { m, usages: [] });
        matMap.get(matKey).usages.push({ comp, opt, qty: comp.count, size: comp.size, unit: comp.unit });
      });
    });

    const lines = [];
    Array.from(bySupplier.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([sup, matMap]) => {
      lines.push(sup.toUpperCase());
      Array.from(matMap.values()).forEach(({ m, usages }) => {
        lines.push('  ' + (m.code || '—') + '  ' + (m.name || '(unnamed)'));
        usages.forEach(({ comp, opt, qty, size, unit }) => {
          const qtyStr = qty != null ? '×' + qty : '';
          const sizeStr = size != null ? ' ' + size + (unit || '') : '';
          const optStr = schedule.options.length > 1 ? '  [' + opt.name + ']' : '';
          lines.push('    · ' + (comp.name || '(unnamed)') + optStr + (qtyStr ? '  ' + qtyStr : '') + sizeStr);
        });
      });
      lines.push('');
    });

    const text = lines.join('\n').trimEnd();
    try {
      navigator.clipboard.writeText(text);
      window.alert('Copied supplier list (' + bySupplier.size + ' supplier' + (bySupplier.size === 1 ? '' : 's') + ').');
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

// ───────── Filters bar ─────────

const CST_FILTER_FIELDS = [
  { id: 'category',   label: 'Trade',        op: 'is',       values: null },
  { id: 'option',     label: 'Option',       op: 'is',       values: null, flatOnly: true },
  { id: 'supplier',   label: 'Supplier',     op: 'contains', values: null },
  { id: 'hasMaterial',label: 'Has material', op: 'is',       values: ['yes', 'no'] },
];

function CstFiltersBar({ filters, setFilters, schedule, rowShape }) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ field: 'category', value: '' });

  const fields = CST_FILTER_FIELDS.filter(f => !f.flatOnly || rowShape === 'flat');

  function addChip() {
    if (!draft.value) { setAdding(false); return; }
    setFilters(fs => [...fs, { field: draft.field, op: fields.find(f => f.id === draft.field)?.op || 'is', value: draft.value }]);
    setAdding(false);
    setDraft({ field: 'category', value: '' });
  }

  function removeChip(i) { setFilters(fs => fs.filter((_, idx) => idx !== i)); }

  if (filters.length === 0 && !adding) {
    return (
      <div style={{ padding: '5px 14px', borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)', display: 'flex' }}>
        <button onClick={() => setAdding(true)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)',
          padding: '3px 0',
        }}>+ Add filter</button>
      </div>
    );
  }

  const fieldDef = fields.find(f => f.id === draft.field) || fields[0];
  const valueChoices = fieldDef?.values
    || (draft.field === 'category' ? Array.from(new Set(schedule.components.map(c => c.category || 'Uncategorised'))).sort() : null)
    || (draft.field === 'option' ? schedule.options.map(o => o.name) : null);

  return (
    <div style={{
      padding: '6px 14px', borderBottom: '1px solid var(--rule)',
      background: 'var(--paper-2)', display: 'flex', alignItems: 'center',
      gap: 6, flexWrap: 'wrap', minHeight: 36,
    }}>
      <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--ink-4)', marginRight: 2 }}>Filter</span>

      {filters.map((f, i) => {
        const fd = CST_FILTER_FIELDS.find(x => x.id === f.field);
        return (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center',
            border: '1px solid var(--rule-2)', background: 'var(--paper)',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
          }}>
            <span style={{ padding: '3px 6px', color: 'var(--ink-3)' }}>{fd?.label || f.field}</span>
            <span style={{ padding: '3px 3px', color: 'var(--ink-4)', fontSize: 10 }}>
              {f.op === 'is' ? '=' : '~'}
            </span>
            <span style={{ padding: '3px 6px', color: 'var(--ink)' }}>{f.value}</span>
            <button onClick={() => removeChip(i)} style={{
              background: 'none', border: 'none', borderLeft: '1px solid var(--rule)',
              cursor: 'pointer', padding: '3px 6px', color: 'var(--ink-4)', fontSize: 12,
            }}>×</button>
          </div>
        );
      })}

      {adding ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <select value={draft.field} onChange={e => setDraft({ field: e.target.value, value: '' })}
            style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 11, padding: '3px 4px',
              border: '1px solid var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}>
            {fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          {valueChoices ? (
            <select value={draft.value} onChange={e => setDraft(d => ({ ...d, value: e.target.value }))}
              style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 11, padding: '3px 4px',
                border: '1px solid var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}>
              <option value="">— pick —</option>
              {valueChoices.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <input value={draft.value} onChange={e => setDraft(d => ({ ...d, value: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addChip(); if (e.key === 'Escape') setAdding(false); }}
              placeholder="value…" autoFocus
              style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 11, padding: '3px 6px',
                border: '1px solid var(--rule)', background: 'var(--paper)', color: 'var(--ink)',
                width: 120, outline: 'none' }} />
          )}
          <button onClick={addChip} style={{
            background: 'var(--ink)', color: 'var(--paper)', border: 'none', cursor: 'pointer',
            padding: '3px 8px', fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
          }}>Add</button>
          <button onClick={() => setAdding(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 11, color: 'var(--ink-4)',
          }}>×</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)',
          padding: '3px 0',
        }}>+ Add filter</button>
      )}
    </div>
  );
}

// ───────── Cheatsheet ─────────

function CstCheatsheet({ onClose, rowShape }) {
  const shortcuts = [
    ['j / ↓',       'Move cursor down'],
    ['k / ↑',       'Move cursor up'],
    ['g / G',       'First / last row'],
    ['o / Enter',   'Open side panel'],
    ['e',           'Open material picker (assign / change)'],
    ['x / Space',   'Toggle select cursor row'],
    ['Shift+x',     'Range-select to cursor'],
    ['c',           'Add component'],
    ['d / Delete',  'Delete cursor component'],
    ['Shift+D',     'Duplicate cursor component'],
    ['⌘A / Ctrl+A', 'Select all visible rows'],
    ['⌘-click',     'Toggle-add row to selection'],
    ['/',           'Focus search'],
    ['?',           'This cheatsheet'],
    ['Esc',         'Cancel edit → close panel → clear selection'],
    ['Click Trade', 'Inline-edit category / trade'],
    ['Click #',     'Inline-edit count'],
    ['Click size',  'Inline-edit size'],
    ['Click unit',  'Inline-edit unit'],
  ];

  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' || e.key === '?') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--paper)', border: '1px solid var(--rule)',
        padding: '24px 28px', maxWidth: 480, width: '90vw',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16 }}>
            Cost Schedule — Keyboard Shortcuts
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 18, color: 'var(--ink-3)',
          }}>×</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {shortcuts.map(([key, label]) => (
              <tr key={key} style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{
                  padding: '5px 12px 5px 0', whiteSpace: 'nowrap',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: 'var(--ink-2)',
                }}>{key}</td>
                <td style={{
                  padding: '5px 0', fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 12, color: 'var(--ink-3)',
                }}>{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{
          marginTop: 14, fontFamily: "'Inter Tight', sans-serif",
          fontSize: 10, color: 'var(--ink-4)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>Press ? or Esc to close</div>
      </div>
    </div>
  );
}

// ───────── Row actions menu ─────────

function CstRowMenu({ items }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const btnRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (!btnRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function toggle(e) {
    e.stopPropagation();
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 2, left: rect.left - 120 });
    setOpen(v => !v);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title="Row actions"
        style={{
          background: 'none', border: '1px solid transparent',
          cursor: 'pointer', borderRadius: 3,
          padding: '2px 5px', lineHeight: 1,
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 14, color: 'var(--ink-3)',
          letterSpacing: '0.05em',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--rule)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
      >
        ···
      </button>
      {open && (
        <div style={{
          position: 'fixed',
          top: pos.top, left: pos.left,
          background: 'var(--paper)', border: '1px solid var(--rule)',
          minWidth: 168, zIndex: 1000,
          boxShadow: '0 4px 18px rgba(0,0,0,0.12)',
        }}>
          {items.map((item, i) =>
            item.separator ? (
              <div key={i} style={{ height: 1, background: 'var(--rule)', margin: '3px 0' }} />
            ) : (
              <button key={i}
                onClick={(e) => { e.stopPropagation(); item.onClick(); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '8px 12px',
                  fontFamily: "'Inter Tight', sans-serif", fontSize: 11.5,
                  color: item.danger ? 'var(--accent, #c0392b)' : 'var(--ink)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}

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
