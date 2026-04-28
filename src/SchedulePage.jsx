// Phase D1a — Schedule page (nav slot IV).
//
// Page header (eyebrow + serif project title + Add button) + toolbar (group
// select, Fields popover, Schedule/Specification view toggle) + grouped sections
// rendered with CardVariantD (D1b). Reads the active project's schedule via
// window.useProjectSchedule(projectId). Schedule blob shape is post-A3:
//   { schemaVersion: 4, options, components, cells, rows: [...] }
// Row shape: { id, specRef:{kind, id}, element, roomId, state, specMode, ... }.
//
// Empty states match the spec: an empty schedule offers paper-2 trade rows that
// add a starter row when picked; a populated view that gets filtered to nothing
// shows "No items match" + Clear filters. Type-related grouping ("By Type") is
// hidden behind window.SHOW_TYPES per the v1 plan.
//
// Specification view is a stub here — toolbar wiring is the deliverable for
// D1a; the actual Specification render is D1d/E territory. ProjectSpecV2 is
// still reachable from its own nav entry (slot V).

(function () {
  const { useState, useMemo, useEffect, useRef } = React;

  const GROUP_OPTIONS_BASE = [
    { id: 'room',    label: 'By Room' },
    { id: 'element', label: 'By Element' },
    { id: 'trade',   label: 'By Trade' },
  ];

  // Resolve a row → ScheduleCard props (the shape CardVariantD expects).
  // materials is the materials list from App; rooms is project.rooms.
  function resolveCardFromRow(row, { materials, rooms, elementsById }) {
    const matchKind = row.specRef && row.specRef.kind;
    let kind = 'empty';
    let name = null, code = null, sku = null, supplier = null, trade = null;
    let swatchColor = null, swatchBrand = null, slots = null, trades = null;

    if (matchKind === 'product' && row.specRef.id) {
      const m = materials.find(x => x.id === row.specRef.id);
      if (m) {
        kind = 'product';
        name = m.name || m.code || 'Unnamed';
        code = m.code || null;
        sku = m.sku || m.code || null;
        supplier = m.supplier || null;
        trade = m.trade || (window.inferTrade ? window.inferTrade(m) : null);
        swatchColor = (m.swatch && m.swatch.tone) || m.color || '#a08660';
        swatchBrand = m.brand || m.supplier || null;
      }
    } else if (matchKind === 'type' && row.specRef.id) {
      const tpl = (window.applicableTypeTemplates && window.applicableTypeTemplates({}))
        || [];
      const t = tpl.find(x => x.id === row.specRef.id);
      kind = 'type';
      if (t) {
        name = t.name; code = t.code; slots = t.slots; trades = t.trades || [];
      } else {
        name = 'Unknown type';
      }
    }

    const elementMeta = row.element ? elementsById[row.element] : null;
    const elementLabel = elementMeta ? elementMeta.label : (row.element || 'Element');
    const roomName = (rooms.find(r => r.id === row.roomId) || {}).name || 'Unassigned';

    return {
      id: row.id,
      kind,
      element: row.element || null,
      elementLabel,
      roomName,
      name, code, sku, supplier, trade, trades,
      slots, swatchColor, swatchBrand,
      state: row.state, mode: row.specMode,
      hiddenFields: row.hiddenFields || [],
      notes: row.note || row.notes || '',
      _row: row,
    };
  }

  function SchedulePage({ materials, projects, activeProjectId, setActiveProjectId, density }) {
    const project = projects.find(p => p.id === activeProjectId) || projects[0] || null;
    const projectId = project ? project.id : null;

    // Auto-set the active project if none is selected (parity with CostScheduleHost).
    useEffect(() => {
      if (!activeProjectId && project) setActiveProjectId(project.id);
    }, [activeProjectId, project, setActiveProjectId]);

    const fallback = useMemo(() => ({
      schemaVersion: 4, title: 'Schedule', options: [], components: [],
      cells: {}, rows: [],
    }), []);
    const sched = window.useProjectSchedule
      ? window.useProjectSchedule(projectId, fallback, x => x)
      : { data: fallback, set: () => {}, status: 'ready' };
    const blob = sched.data || fallback;
    const rows = Array.isArray(blob.rows) ? blob.rows : [];
    const setRows = (updater) => {
      sched.set(prev => {
        const base = prev || fallback;
        const next = typeof updater === 'function' ? updater(base.rows || []) : updater;
        return { ...base, rows: next };
      });
    };

    // Local UI state.
    const [grouping, setGrouping] = useState('room');
    const [view, setView] = useState('schedule');   // 'schedule' | 'specification'
    const [editingId, setEditingId] = useState(null);
    const [fieldsOpen, setFieldsOpen] = useState(false);
    // PickerDrawer state. mode='single' opens for one row's swatch click;
    // mode='multi' opens for "+ Add to Section" bulk-add.
    // null when closed. { mode, rowId?, element, eyebrow, title, subtitle, seed? }
    const [picker, setPicker] = useState(null);

    // Default visible fields per card. The Fields popover toggles these — the
    // toggle adds/removes the key from every row's hiddenFields[] simultaneously.
    const FIELD_TOGGLES = [
      { key: 'element',  label: 'Element' },
      { key: 'state',    label: 'State' },
      { key: 'mode',     label: 'Spec Mode' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'sku',      label: 'SKU' },
      { key: 'trade',    label: 'Trade' },
      { key: 'notes',    label: 'Notes' },
    ];
    const fieldsPopRef = useRef(null);
    useEffect(() => {
      if (!fieldsOpen) return;
      function onDoc(e) {
        if (fieldsPopRef.current && !fieldsPopRef.current.contains(e.target)) setFieldsOpen(false);
      }
      function onKey(e) { if (e.key === 'Escape') setFieldsOpen(false); }
      document.addEventListener('mousedown', onDoc);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onDoc);
        document.removeEventListener('keydown', onKey);
      };
    }, [fieldsOpen]);

    // Taxonomies for element <select> + element labels.
    const cs = window.useCloudState ? window.useCloudState() : null;
    const taxonomies = (cs && cs.appState && cs.appState.taxonomies)
      || window.DEFAULT_TAXONOMIES || { elements: [] };
    const elements = taxonomies.elements || [];
    const elementsById = useMemo(
      () => Object.fromEntries(elements.map(e => [e.id, e])),
      [elements]
    );

    const rooms = (project && project.rooms) || [];

    // Resolved card data per row.
    const cards = useMemo(
      () => rows.map(r => resolveCardFromRow(r, { materials, rooms, elementsById })),
      [rows, materials, rooms, elementsById]
    );

    // Filtered + grouped.
    const filteredCards = cards;  // No active filters in D1a; D1d adds the picker.
    const filteredOut = cards.length > 0 && filteredCards.length === 0;

    const groups = useMemo(() => {
      const buckets = new Map();
      for (const c of filteredCards) {
        let key, title;
        if (grouping === 'room')        { key = c.roomName || 'Unassigned'; title = key; }
        else if (grouping === 'element'){ key = c.elementLabel || 'Unassigned'; title = key; }
        else                            { key = c.trade || (c.trades && c.trades[0]) || 'Unassigned'; title = key; }
        if (!buckets.has(key)) buckets.set(key, { key, title, cards: [] });
        buckets.get(key).cards.push(c);
      }
      return Array.from(buckets.values());
    }, [filteredCards, grouping]);

    function newRowId() {
      return 'sr-' + Math.random().toString(36).slice(2, 10);
    }

    function addEmptyRow(seed = {}) {
      const next = {
        id: newRowId(),
        specRef: null,
        element: seed.element || null,
        roomId: seed.roomId || (rooms[0] && rooms[0].id) || null,
        state: 'new',
        specMode: 'prop',
        isInstance: false,
        qty: null, unit: null,
        revision: null, approvalComment: null,
        note: null,
        hiddenFields: [],
        source: 'manual',
        trade: seed.trade || null,
      };
      setRows(prev => [...prev, next]);
      setEditingId(next.id);
    }

    function updateRow(id, patch) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    }
    function deleteRow(id) {
      setRows(prev => prev.filter(r => r.id !== id));
      if (editingId === id) setEditingId(null);
    }

    function openPickerForRow(card) {
      const elementLabel = card.elementLabel || (card.element ? (elementsById[card.element]?.label || card.element) : null);
      setPicker({
        mode: 'single',
        rowId: card.id,
        element: card.element || null,
        eyebrow: elementLabel ? `Specify · ${elementLabel}` : 'Specify',
        title: 'Pick from Library',
        subtitle: 'Choose a product to attach to this row.',
      });
    }

    function openPickerForBulkAdd(seed, label) {
      setPicker({
        mode: 'multi',
        rowId: null,
        element: seed.element || null,
        seed,
        eyebrow: `Add to · ${label}`,
        title: 'Add items',
        subtitle: 'Pick one or more products — each becomes a new row in this section.',
      });
    }

    function onPickerConfirm(idOrIds) {
      if (!picker) return;
      if (picker.mode === 'single') {
        const productId = idOrIds;
        const m = materials.find(x => x.id === productId);
        const tradeFromProduct = m
          ? (m.trade || (window.inferTrade ? window.inferTrade(m) : null))
          : null;
        // We treat anything matched in `materials` as a product; type ids would
        // come from typeTemplates once Types ship. For v1, products only.
        updateRow(picker.rowId, {
          specRef: { kind: 'product', id: productId },
          ...(tradeFromProduct ? { trade: tradeFromProduct } : {}),
        });
        setPicker(null);
        return;
      }
      // Bulk add — create one row per id, all carrying the seed.
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const seed = picker.seed || {};
      const newRows = ids.map(id => {
        const m = materials.find(x => x.id === id);
        const tradeFromProduct = m
          ? (m.trade || (window.inferTrade ? window.inferTrade(m) : null))
          : null;
        return {
          id: newRowId(),
          specRef: { kind: 'product', id },
          element: seed.element || null,
          roomId:  seed.roomId  || (rooms[0] && rooms[0].id) || null,
          state: 'new',
          specMode: 'prop',
          isInstance: false,
          qty: null, unit: null,
          revision: null, approvalComment: null,
          note: null,
          hiddenFields: [],
          source: 'manual',
          trade: seed.trade || tradeFromProduct || null,
        };
      });
      setRows(prev => [...prev, ...newRows]);
      setPicker(null);
    }

    // Per-card change handlers — translates CardVariantD fields back into the
    // row shape. State and mode write the chip's short codes; Notes writes
    // row.note (singular, matching the migration shape).
    function onCardFieldChange(cardId, field, value) {
      if (field === 'notes') return updateRow(cardId, { note: value });
      if (field === 'element') return updateRow(cardId, { element: value });
      if (field === 'state') return updateRow(cardId, { state: value });
      if (field === 'mode' || field === 'specMode') return updateRow(cardId, { specMode: value });
      if (field === 'hiddenFields') return updateRow(cardId, { hiddenFields: value });
      // Other field edits flow into the row directly (e.g. supplier, sku, trade)
      // — for product-bound rows these are derived from the material so the edit
      // doesn't persist. We still allow it on free rows.
      return updateRow(cardId, { [field]: value });
    }

    // Project header derived bits.
    const projectMeta = project && (project.code || project.client || project.stage);

    // Empty-state trade picker (used when the project has 0 schedule rows).
    const TRADES = window.TRADES || ['Plumbing', 'Carpentry', 'Joinery', 'Electrical', 'Tiling', 'FFE'];

    if (!project) {
      return (
        <div className="sched-empty" style={{ padding: '120px 0' }}>
          <div className="sched-empty-eyebrow">No project selected</div>
          <div className="sched-empty-msg">Pick or create a project first</div>
        </div>
      );
    }

    return (
      <>
        <div className="sched-page-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="sched-page-eyebrow">IV · Project Schedule</div>
            <span className="sched-page-title">{project.name || 'Untitled project'}</span>
            {projectMeta && (
              <div className="sched-page-meta">
                {project.code && <span className="sched-meta-mono">{project.code}</span>}
                {project.client && <span className="sched-meta-for">for {project.client}</span>}
                {project.stage && <span className="sched-meta-mono">{project.stage}</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {projects.length > 1 && (
              <select
                value={projectId || ''}
                onChange={e => setActiveProjectId(e.target.value)}
                className="filter-sel"
                style={{
                  background: 'transparent', border: '1px solid var(--rule-2)',
                  padding: '5px 26px 5px 9px',
                  fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-2)',
                  cursor: 'pointer', appearance: 'none', borderRadius: 0,
                }}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name || p.code}</option>)}
              </select>
            )}
            <button type="button" className="sched-add-btn" onClick={() => addEmptyRow()}>
              + Add row
            </button>
          </div>
        </div>

        <div className="sched-toolbar">
          <div className="sched-vt" role="tablist">
            {GROUP_OPTIONS_BASE.map(opt => (
              <button key={opt.id} type="button"
                className={grouping === opt.id ? 'on' : ''}
                onClick={() => setGrouping(opt.id)}>
                {opt.label}
              </button>
            ))}
          </div>
          <div ref={fieldsPopRef} style={{ position: 'relative' }}>
            <button type="button" className="sched-fields-btn"
              onClick={() => setFieldsOpen(o => !o)}>
              Fields ▾
            </button>
            {fieldsOpen && (
              <div className="sched-fields-pop">
                {FIELD_TOGGLES.map(f => {
                  // A field is "shown" if it isn't hidden on any row.
                  const allHidden = rows.length > 0 && rows.every(
                    r => (r.hiddenFields || []).includes(f.key));
                  const checked = !allHidden;
                  return (
                    <label key={f.key}>
                      <input type="checkbox" checked={checked}
                        onChange={() => {
                          // Toggle: if currently shown, hide on every row; else show on every row.
                          if (checked) {
                            setRows(prev => prev.map(r => ({
                              ...r,
                              hiddenFields: Array.from(new Set([...(r.hiddenFields || []), f.key])),
                            })));
                          } else {
                            setRows(prev => prev.map(r => ({
                              ...r,
                              hiddenFields: (r.hiddenFields || []).filter(k => k !== f.key),
                            })));
                          }
                        }} />
                      {f.label}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ width: 1, height: 18, background: 'var(--rule-2)' }} />
          <div className="sched-vt">
            <button type="button" className={view === 'schedule' ? 'on' : ''}
              onClick={() => setView('schedule')}>Schedule</button>
            <button type="button" className={view === 'specification' ? 'on' : ''}
              onClick={() => setView('specification')}>Specification</button>
          </div>
          <span className="sched-tb-grow" />
          <span className="sched-tb-count">{rows.length} items</span>
        </div>

        {view === 'specification' ? (
          <div className="sched-empty" style={{ padding: '80px 0' }}>
            <div className="sched-empty-eyebrow">Specification view</div>
            <div className="sched-empty-msg">Coming next phase</div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-4)',
              maxWidth: 360, textAlign: 'center', lineHeight: 1.55,
            }}>
              The Specification render reuses the same schedule rows in a register-style
              layout. Toggle back to Schedule to keep editing.
            </div>
          </div>
        ) : rows.length === 0 ? (
          <EmptySchedule trades={TRADES} onPickTrade={(trade) => addEmptyRow({ trade })} />
        ) : filteredOut ? (
          <div className="sched-no-match">
            <div className="sched-no-match-msg">No items match</div>
            <button type="button" className="sched-no-match-clear"
              onClick={() => { /* filter state lives in D1d; no-op for now */ }}>
              Clear filters
            </button>
          </div>
        ) : (
          groups.map(g => (
            <div key={g.key} className="sched-sec">
              <div className="sched-sec-head">
                <span className="sched-sec-title">{g.title}</span>
                <span className="sched-sec-grow" />
                <span className="sched-sec-count">{g.cards.length} item{g.cards.length === 1 ? '' : 's'}</span>
              </div>
              {g.cards.map(c => (
                <window.CardVariantD
                  key={c.id} card={c} elements={elements}
                  density={density}
                  onSwatchClick={() => openPickerForRow(c)}
                  onStateChange={v => updateRow(c.id, { state: v })}
                  onModeChange={v => updateRow(c.id, { specMode: v })}
                  onFieldChange={(f, v) => onCardFieldChange(c.id, f, v)}
                  onHiddenFieldsChange={(arr) => updateRow(c.id, { hiddenFields: arr })}
                  onDelete={deleteRow}
                  isEditing={editingId === c.id}
                  onEdit={() => setEditingId(c.id)}
                  onSave={() => setEditingId(null)}
                />
              ))}
              <div className="sched-add-row" style={{ display: 'flex', gap: 16 }}>
                <button type="button" onClick={() => {
                  const seed = grouping === 'room'
                    ? { roomId: rooms.find(r => r.name === g.title)?.id }
                    : grouping === 'element'
                    ? { element: elements.find(e => e.label === g.title)?.id }
                    : { trade: g.title };
                  openPickerForBulkAdd(seed, g.title);
                }}>
                  + Add from Library to {g.title}
                </button>
                <button type="button" onClick={() => {
                  const seed = grouping === 'room'
                    ? { roomId: rooms.find(r => r.name === g.title)?.id }
                    : grouping === 'element'
                    ? { element: elements.find(e => e.label === g.title)?.id }
                    : { trade: g.title };
                  addEmptyRow(seed);
                }}>
                  + Add empty row
                </button>
              </div>
            </div>
          ))
        )}

        {picker && window.PickerDrawer && (
          <window.PickerDrawer
            open={true}
            eyebrow={picker.eyebrow}
            title={picker.title}
            subtitle={picker.subtitle}
            elementFilter={picker.element || null}
            materials={materials}
            typeTemplates={(taxonomies && taxonomies.typeTemplates) || []}
            selectionMode={picker.mode === 'multi' ? 'multi' : 'single'}
            initialSelected={picker.mode === 'single' && picker.rowId
              ? (() => {
                  const row = rows.find(r => r.id === picker.rowId);
                  return row && row.specRef && row.specRef.id ? [row.specRef.id] : [];
                })()
              : []}
            onPick={onPickerConfirm}
            onClose={() => setPicker(null)}
          />
        )}
      </>
    );
  }

  function EmptySchedule({ trades, onPickTrade }) {
    return (
      <div className="sched-empty">
        <div className="sched-empty-eyebrow">Empty schedule</div>
        <div className="sched-empty-msg">Start by picking a trade</div>
        <div className="sched-empty-trades">
          {trades.slice(0, 8).map(t => (
            <button key={t} type="button" className="sched-empty-trade"
              onClick={() => onPickTrade(t)}>
              <span>{t}</span>
              <span className="sched-empty-trade-arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  window.SchedulePage = SchedulePage;
})();
