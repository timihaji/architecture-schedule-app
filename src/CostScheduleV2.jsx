// Cost Schedule v2 — Phase D2 re-pointing.
//
// Reads schedule rows (post-v5: { id, specRef:{kind,id}, element, locationId,
// category, state, specMode, typeOrInstance, qty, unit, ... }) from
// window.useProjectSchedule and projects them on cost.
// Single source of truth shared with SchedulePage (IV) — Cost Schedule (III)
// is the cost projection.
//
// Group key = the v5 group label (e.g. "Finishes", "FF&E", "Sanitary, tapware
// & hydraulic fixtures"). Rows whose specRef is empty/unresolved drop into
// "Unspecified". Per-group subtotals + a grand total. Cell clipboard (C copy /
// V paste / Esc clear) carries the row's specRef. HTML5 drag-and-drop reorders
// within the rows[] array.

(function () {
  const { useState, useMemo, useEffect, useRef, useCallback } = React;

  function fmtCurrency(n) {
    if (n == null || !Number.isFinite(n)) return '—';
    const v = Math.round(n * 100) / 100;
    return '$' + v.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // Resolve the v5 group label that owns a material's category. Used to bucket
  // cost rows into per-group sections.
  function groupLabelFor(material) {
    if (!material) return 'Unspecified';
    const cat = material.category;
    if (!cat) return 'Unspecified';
    const catDef = window.categoryDef && window.categoryDef(cat);
    if (!catDef) return 'Unspecified';
    const grp = window.groupDef && window.groupDef(catDef.groupId);
    return (grp && grp.label) || 'Unspecified';
  }

  // v5 read: prefer m.fields[k]; fall back to legacy top-level for any
  // un-migrated material (defensive).
  function fv(material, fieldId) {
    if (!material) return null;
    if (window.getFieldValue) return window.getFieldValue(material, fieldId);
    return (material.fields && material.fields[fieldId]) ?? material[fieldId] ?? null;
  }

  function CostScheduleV2({ materials, projects, libraries, labelTemplates,
    activeProjectId, setActiveProjectId, onUpdateProject, density }) {

    const project = useMemo(() => {
      if (activeProjectId) {
        const p = projects.find(x => x.id === activeProjectId);
        if (p) return p;
      }
      return projects[0];
    }, [projects, activeProjectId]);

    if (!project) {
      return (
        <div className="sched-empty" style={{ padding: '120px 0' }}>
          <div className="sched-empty-eyebrow">No project selected</div>
          <div className="sched-empty-msg">Create a project in Volume II to begin costing.</div>
        </div>
      );
    }

    const fallback = useCallback(() => ({
      schemaVersion: 5, title: 'Schedule', options: [], components: [],
      cells: {}, rows: [],
    }), []);
    const transform = useCallback(x => x, []);
    const { data: schedule, set: setSchedule, status: scheduleStatus } =
      window.useProjectSchedule(project.id, fallback, transform);

    // Library scoping (preserved from v1 cost schedule).
    const projectLibIds = project.libraryIds || [];
    const scopedMaterials = useMemo(() => {
      if (projectLibIds.length === 0) return materials;
      return materials.filter(m => (m.libraryIds || []).some(lid => projectLibIds.includes(lid)));
    }, [materials, projectLibIds.join('|')]);

    // PickerDrawer state.
    //   { mode: 'single' | 'multi', rowId?, group?, eyebrow, title, subtitle }
    const [picker, setPicker] = useState(null);
    // Phase 4: group-by axis. Default '_group' preserves the prior UX (rows
    // bucket by the v5 group label). Empty string disables grouping.
    const [groupByAxis, setGroupByAxis] = useState('_group');
    // Cell clipboard — holds a row's specRef. Hover sets the focused row id.
    const [clipboard, setClipboard] = useState(null);  // { specRef, fromRowId }
    const [hoverRowId, setHoverRowId] = useState(null);
    // Drag state for HTML5 native drag-and-drop reorder.
    const [dragRowId, setDragRowId] = useState(null);
    const [dragOver, setDragOver] = useState(null);  // { rowId, edge: 'top'|'bottom' }

    const rows = (schedule && Array.isArray(schedule.rows)) ? schedule.rows : [];

    function setRows(updater) {
      setSchedule(prev => {
        const base = prev || { schemaVersion: 5, title: 'Schedule', options: [], components: [], cells: {}, rows: [] };
        const next = typeof updater === 'function' ? updater(base.rows || []) : updater;
        return { ...base, rows: next };
      });
    }
    function updateRow(id, patch) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    }
    function deleteRow(id) {
      setRows(prev => prev.filter(r => r.id !== id));
    }
    function newRowId() { return 'sr-' + Math.random().toString(36).slice(2, 10); }

    // Resolve each row to its material + group key.
    // Phase 4: bucket key is computed per the active groupByAxis (default
    // '_group' for parity with the prior UX). Multi-value axes (tags) get the
    // first value so a row appears in exactly one section here — split-view
    // duplication is not a fit for cost row totals.
    function bucketLabelForRow(material, matKind) {
      if (!material) return matKind === 'type' ? 'Assemblies' : 'Unspecified';
      if (!groupByAxis) return 'All';
      if (groupByAxis === '_group') return groupLabelFor(material);
      if (groupByAxis === '_category') {
        const cat = window.categoryDef && window.categoryDef(material.category);
        return (cat && cat.label) || material.category || 'Unspecified';
      }
      if (groupByAxis === '_trade') return fv(material, 'trade') || 'Unspecified';
      if (groupByAxis === '_supplier') return fv(material, 'supplier') || material.supplier || 'Unspecified';
      if (groupByAxis.indexOf('_tag_') === 0) {
        const ax = groupByAxis.substring(5);
        const tags = (material.fields && material.fields.tags && material.fields.tags[ax]) || [];
        if (tags.length === 0) return '—';
        // Resolve to label
        const def = (window.schemaActive && window.schemaActive().tagAxes && window.schemaActive().tagAxes[ax]) || [];
        const t = def.find(x => x.id === tags[0]);
        return (t && t.label) || tags[0];
      }
      // Field id (select)
      const v = fv(material, groupByAxis);
      const f = window.fieldDef && window.fieldDef(groupByAxis);
      if (f && f.options) {
        const opt = f.options.find(o => o.value === v);
        if (opt) return opt.label;
      }
      return v || '—';
    }

    const resolved = useMemo(() => {
      return rows.map(r => {
        const matKind = r.specRef && r.specRef.kind;
        const m = (matKind === 'product' && r.specRef.id)
          ? materials.find(x => x.id === r.specRef.id)
          : null;
        const category = bucketLabelForRow(m, matKind);
        const qty = (r.qty != null && r.qty !== '') ? parseFloat(r.qty) : null;
        const unitCost = m ? Number(fv(m, 'unit_cost')) : null;
        const subtotal = (m && Number.isFinite(unitCost) && qty != null && Number.isFinite(qty))
          ? qty * unitCost : null;
        return { row: r, material: m, unitCost, category, qty, subtotal };
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, materials, groupByAxis]);

    // Group, preserving first-appearance order.
    const grouped = useMemo(() => {
      const map = new Map();
      resolved.forEach((entry, idx) => {
        if (!map.has(entry.category)) map.set(entry.category, []);
        map.get(entry.category).push({ ...entry, globalIndex: idx });
      });
      return Array.from(map.entries()).map(([category, entries]) => ({
        category,
        entries,
        subtotal: entries.reduce((s, e) => s + (e.subtotal || 0), 0),
      }));
    }, [resolved]);

    // Available group-by axes for the dropdown — drawn from groupableFields()
    // over the visible materials.
    const groupByOptions = useMemo(() => {
      if (!window.groupableFields) return [];
      // Add '_group' synthetic explicitly since groupableFields doesn't include it.
      const visibleMaterials = resolved.map(e => e.material).filter(Boolean);
      const opts = window.groupableFields(visibleMaterials);
      // Ensure _group is first (cost schedule's traditional axis).
      if (!opts.find(o => o.id === '_group')) {
        opts.unshift({ id: '_group', label: 'Group', type: 'synthetic' });
      } else {
        // Move _group to front.
        const idx = opts.findIndex(o => o.id === '_group');
        const [g] = opts.splice(idx, 1);
        opts.unshift(g);
      }
      return opts;
    }, [resolved]);

    const grandTotal = grouped.reduce((s, g) => s + g.subtotal, 0);

    // Global C / V / Esc handler for cell clipboard.
    useEffect(() => {
      function onKey(e) {
        if (!schedule) return;
        const ae = document.activeElement;
        const tag = ae?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ae?.isContentEditable) return;
        if (picker) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;

        const k = e.key.toLowerCase();
        if (k === 'c') {
          if (!hoverRowId) return;
          const r = rows.find(x => x.id === hoverRowId);
          if (!r || !r.specRef || !r.specRef.id) return;
          setClipboard({ specRef: r.specRef, fromRowId: r.id });
          e.preventDefault();
        } else if (k === 'v') {
          if (!clipboard || !hoverRowId) return;
          updateRow(hoverRowId, { specRef: clipboard.specRef });
          e.preventDefault();
        } else if (e.key === 'Escape' && clipboard) {
          setClipboard(null);
          e.preventDefault();
        }
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [hoverRowId, clipboard, picker, schedule, rows]);

    // ─── PickerDrawer wiring ───
    function openPickerForSwap(rowId) {
      setPicker({
        mode: 'single', rowId,
        eyebrow: 'Swap product',
        title: 'Pick from Library',
        subtitle: 'Replace the product on this cost row.',
      });
    }
    function openPickerForGroup(category) {
      setPicker({
        mode: 'multi', group: category,
        eyebrow: `Add to · ${category}`,
        title: 'Add components',
        subtitle: `Each pick becomes a new ${category} row.`,
      });
    }
    function onPickerConfirm(idOrIds) {
      if (!picker) return;
      if (picker.mode === 'single') {
        updateRow(picker.rowId, { specRef: { kind: 'product', id: idOrIds } });
        setPicker(null);
        return;
      }
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const newRows = ids.map(pid => {
        const m = materials.find(x => x.id === pid);
        const trade = m ? (fv(m, 'trade') || (window.defaultTradeForCategory ? window.defaultTradeForCategory(m.category) : null)) : null;
        const catDef = m && window.categoryDef && window.categoryDef(m.category);
        return {
          id: newRowId(),
          specRef: { kind: 'product', id: pid },
          element: null,
          locationId: (project.locations && project.locations[0] && project.locations[0].id) || null,
          category: (m && m.category) || null,
          state: 'new',
          specMode: 'proprietary',
          typeOrInstance: 'instance',
          qty: null,
          unit: (catDef && catDef.defaultUnit) || (m && fv(m, 'unit')) || null,
          revision: null, approvalComment: null, note: null,
          hiddenFields: [], source: 'cost-schedule',
          trade,
        };
      });
      setRows(prev => [...prev, ...newRows]);
      setPicker(null);
    }

    // ─── Drag-and-drop reorder (HTML5 native) ───
    function onDragStart(e, rowId) {
      setDragRowId(rowId);
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', rowId); } catch {}
    }
    function onDragOver(e, rowId) {
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch {}
      const rect = e.currentTarget.getBoundingClientRect();
      const edge = (e.clientY - rect.top) < rect.height / 2 ? 'top' : 'bottom';
      if (!dragOver || dragOver.rowId !== rowId || dragOver.edge !== edge) {
        setDragOver({ rowId, edge });
      }
    }
    function onDrop(e, targetRowId) {
      e.preventDefault();
      const fromId = dragRowId;
      const edge = dragOver && dragOver.edge;
      setDragRowId(null);
      setDragOver(null);
      if (!fromId || fromId === targetRowId) return;
      setRows(prev => {
        const arr = prev.slice();
        const fromIdx = arr.findIndex(r => r.id === fromId);
        if (fromIdx < 0) return prev;
        const [moved] = arr.splice(fromIdx, 1);
        let toIdx = arr.findIndex(r => r.id === targetRowId);
        if (toIdx < 0) toIdx = arr.length;
        if (edge === 'bottom') toIdx += 1;
        arr.splice(toIdx, 0, moved);
        return arr;
      });
    }
    function onDragEnd() { setDragRowId(null); setDragOver(null); }

    // ─── Loading / error gates ───
    if (scheduleStatus === 'loading' || !schedule) {
      return (
        <div className="sched-empty" style={{ padding: '80px 0' }}>
          <div className="sched-empty-eyebrow">Loading schedule…</div>
        </div>
      );
    }
    if (scheduleStatus === 'error') {
      return (
        <div className="sched-empty" style={{ padding: '80px 0' }}>
          <div className="sched-empty-eyebrow">Couldn't load schedule</div>
          <button type="button" className="sched-add-btn" onClick={() => location.reload()}>Reload</button>
        </div>
      );
    }

    const clipboardMaterial = clipboard
      ? materials.find(m => m.id === clipboard.specRef.id)
      : null;

    return (
      <>
        <div className="sched-page-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="sched-page-eyebrow">III · Cost Schedule</div>
            <span className="sched-page-title">{project.name || 'Untitled project'}</span>
            <div className="sched-page-meta">
              {project.code && <span className="sched-meta-mono">{project.code}</span>}
              {project.client && <span className="sched-meta-for">for {project.client}</span>}
              <span className="sched-meta-mono">{rows.length} item{rows.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              ...window.ui.label, color: 'var(--ink-4)',
            }}>Group by</span>
            <select
              value={groupByAxis}
              onChange={e => setGroupByAxis(e.target.value)}
              style={{
                background: 'transparent', border: '1px solid var(--rule-2)',
                padding: '5px 26px 5px 9px',
                fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-2)',
                cursor: 'pointer', appearance: 'none', borderRadius: 0,
              }}>
              <option value="">None</option>
              {groupByOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {projects.length > 1 && (
              <select
                value={project.id}
                onChange={e => setActiveProjectId(e.target.value)}
                style={{
                  background: 'transparent', border: '1px solid var(--rule-2)',
                  padding: '5px 26px 5px 9px',
                  fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-2)',
                  cursor: 'pointer', appearance: 'none', borderRadius: 0,
                }}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name || p.code}</option>)}
              </select>
            )}
            <button type="button" className="sched-add-btn"
              onClick={() => openPickerForGroup('Unspecified')}>
              + Add component
            </button>
          </div>
        </div>

        {window.LibraryScopeRow && (
          <window.LibraryScopeRow
            libraries={libraries}
            selectedIds={projectLibIds}
            materials={materials}
            scopedCount={scopedMaterials.length}
            onChange={(ids) => onUpdateProject({ ...project, libraryIds: ids })}
          />
        )}

        {rows.length === 0 ? (
          <div className="sched-empty" style={{ padding: '80px 0' }}>
            <div className="sched-empty-eyebrow">No items yet</div>
            <div className="sched-empty-msg">Add a product to start costing</div>
            <button type="button" className="sched-add-btn"
              onClick={() => openPickerForGroup('Unspecified')}
              style={{ marginTop: 8 }}>
              + Add from Library
            </button>
          </div>
        ) : (
          <>
            {grouped.map(g => (
              <div key={g.category} className="sched-sec">
                <div className="sched-sec-head">
                  <span className="sched-sec-title">{g.category}</span>
                  <span className="sched-sec-count">{g.entries.length} item{g.entries.length === 1 ? '' : 's'}</span>
                  <span className="sched-sec-grow" />
                  <span className="cs-sec-subtotal">{fmtCurrency(g.subtotal)}</span>
                </div>

                <div className="cs-row-head">
                  <span></span>
                  <span></span>
                  <span>Code</span>
                  <span>Name</span>
                  <span>Type</span>
                  <span>Qty × Cost</span>
                  <span className="right">Subtotal</span>
                  <span></span>
                </div>

                {g.entries.map(({ row, material, unitCost, qty, subtotal }) => {
                  const isClipSrc = clipboard && clipboard.fromRowId === row.id;
                  const isDragOver = dragOver && dragOver.rowId === row.id;
                  const dropClass = isDragOver
                    ? (dragOver.edge === 'top' ? ' drop-above' : ' drop-below')
                    : '';
                  const dragClass = dragRowId === row.id ? ' dragging' : '';
                  const clipClass = isClipSrc ? ' cs-clip-src' : '';
                  const swatchTone = material ? ((material.swatch && material.swatch.tone) || material.color || '#a08660') : null;
                  const catDef = material && window.categoryDef && window.categoryDef(material.category);
                  const ptypeLabel = catDef ? catDef.label.toLowerCase()
                    : (material && material.category ? String(material.category).replace(/_/g, ' ') : '—');
                  const unit = row.unit || (catDef && catDef.defaultUnit) || (material && fv(material, 'unit')) || '';
                  return (
                    <div key={row.id}
                      className={`cs-row${dragClass}${dropClass}${clipClass}`}
                      data-row-id={row.id}
                      onMouseEnter={() => setHoverRowId(row.id)}
                      onMouseLeave={() => setHoverRowId(prev => prev === row.id ? null : prev)}
                      onDragOver={(e) => onDragOver(e, row.id)}
                      onDrop={(e) => onDrop(e, row.id)}>
                      <div className="cs-row-drag"
                        draggable
                        onDragStart={(e) => onDragStart(e, row.id)}
                        onDragEnd={onDragEnd}
                        title="Drag to reorder">⋮⋮</div>
                      {material ? (
                        <div className="cs-swatch"
                          style={{ background: swatchTone }}
                          onClick={() => openPickerForSwap(row.id)}
                          title="Click to swap product" />
                      ) : (
                        <div className="cs-swatch empty"
                          onClick={() => openPickerForSwap(row.id)}
                          title="Click to pick a product">+</div>
                      )}
                      <div className={`cs-cell-code${material ? '' : ' empty'}`}>
                        {material ? (material.code || '—') : '(unassigned)'}
                      </div>
                      <div>
                        <div className={`cs-cell-name${material ? '' : ' empty'}`}>
                          {material ? (material.name || material.code || 'Unnamed') : 'Pick a product'}
                        </div>
                        {material && (fv(material, 'brand') || fv(material, 'supplier')) && (
                          <div className="cs-cell-name-sub">{fv(material, 'brand') || fv(material, 'supplier')}</div>
                        )}
                      </div>
                      <div className="cs-cell-ptype">{ptypeLabel}</div>
                      <div className="cs-cell-qty">
                        <input type="text" value={row.qty == null ? '' : row.qty}
                          placeholder="—"
                          onChange={(e) => updateRow(row.id, { qty: e.target.value === '' ? null : e.target.value })} />
                        {unit && <span className="unit">{unit}</span>}
                        {Number.isFinite(unitCost) && (
                          <span className="cost">× {fmtCurrency(unitCost)}</span>
                        )}
                      </div>
                      <div className={`cs-cell-subtotal${subtotal == null ? ' empty' : ''}`}>
                        {subtotal == null ? '—' : fmtCurrency(subtotal)}
                      </div>
                      <div className="cs-row-actions">
                        <button type="button" className="del" title="Remove"
                          onClick={() => deleteRow(row.id)}>×</button>
                      </div>
                    </div>
                  );
                })}

                <div className="sched-add-row">
                  <button type="button" onClick={() => openPickerForGroup(g.category)}>
                    + Add component to {g.category}
                  </button>
                </div>
              </div>
            ))}

            <div className="cs-grand">
              <span className="cs-grand-label">Grand total</span>
              <span className="cs-grand-value">{fmtCurrency(grandTotal)}</span>
            </div>
          </>
        )}

        {clipboard && clipboardMaterial && (
          <div className="cs-clip-toast">
            <span className="lbl">Copied</span>
            <span className="name">{clipboardMaterial.name || clipboardMaterial.code || 'Unnamed'}</span>
            <span style={{ opacity: 0.55 }}>·</span>
            <span className="hint">press V to paste, Esc to clear</span>
            <button type="button" onClick={() => setClipboard(null)} title="Clear clipboard">×</button>
          </div>
        )}

        {picker && window.PickerDrawer && (
          <window.PickerDrawer
            open={true}
            eyebrow={picker.eyebrow}
            title={picker.title}
            subtitle={picker.subtitle}
            elementFilter={null}
            materials={scopedMaterials}
            typeTemplates={[]}
            selectionMode={picker.mode === 'multi' ? 'multi' : 'single'}
            initialSelected={picker.mode === 'single' && picker.rowId
              ? (() => {
                  const r = rows.find(x => x.id === picker.rowId);
                  return (r && r.specRef && r.specRef.id) ? [r.specRef.id] : [];
                })()
              : []}
            onPick={onPickerConfirm}
            onClose={() => setPicker(null)}
          />
        )}
      </>
    );
  }

  Object.assign(window, { CostScheduleV2 });
})();
