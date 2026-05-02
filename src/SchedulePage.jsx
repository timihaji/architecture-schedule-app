// Phase D1a — Schedule page (nav slot IV).
//
// Page header (eyebrow + serif project title + Add button) + toolbar (group
// select, Fields popover, Schedule/Specification view toggle) + grouped sections
// rendered with CardVariantD (D1b). Reads the active project's schedule via
// window.useProjectSchedule(projectId). Schedule blob shape is post-v5:
//   { schemaVersion: 5, options, components, cells, rows: [...] }
// Row shape: { id, specRef:{kind, id}, element, locationId, state, specMode, ... }.
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
    { id: 'section',  label: 'Section' },
    { id: 'category', label: 'Category' },
    { id: 'none',     label: 'None' },
  ];
  const FIELD_CHOOSER_SKIP = new Set(['code', 'name', 'swatch', 'image_ref', 'longText']);

  function categoryLabel(catId) {
    if (!catId) return 'Uncategorised';
    const cat = window.categoryDef
      ? window.categoryDef(catId)
      : ((window.schemaActive && window.schemaActive().categories) || []).find(c => c.id === catId);
    return (cat && cat.label) || catId;
  }

  function fieldLabelForToolbar(field) {
    return field && field.unit ? `${field.label} (${field.unit})` : ((field && field.label) || '');
  }

  // Resolve a row → ScheduleCard props (the shape CardVariantD expects).
  // materials is the materials list from App; locations is project.locations.
  function resolveCardFromRow(row, { materials, locations, elementsById }) {
    const matchKind = row.specRef && row.specRef.kind;
    let kind = 'empty';
    let name = null, code = null, sku = null, supplier = null, trade = null;
    let swatchColor = null, swatchBrand = null, slots = null, trades = null;
    let material = null;

    if (matchKind === 'product' && row.specRef.id) {
      const m = materials.find(x => x.id === row.specRef.id);
      if (m) {
        material = m;
        kind = 'product';
        name = m.name || 'Unnamed';
        code = row.code || null;
        sku = m.sku || null;
        const _fv = window.getFieldValue || ((x, k) => (x.fields && x.fields[k]) ?? x[k]);
        supplier = _fv(m, 'supplier') || null;
        trade = _fv(m, 'trade') || (window.defaultTradeForCategory ? window.defaultTradeForCategory(m.category) : null);
        swatchColor = (m.swatch && m.swatch.tone) || '#a08660';
        swatchBrand = (_fv(m, 'brand') || _fv(m, 'supplier')) || null;
      }
    } else if (matchKind === 'type' && row.specRef.id) {
      const tpl = (window.applicableTypeTemplates && window.applicableTypeTemplates({}))
        || [];
      const t = tpl.find(x => x.id === row.specRef.id);
      kind = 'type';
      if (t) {
        // TODO(types): once types ship, derive `code` from row.code (assemblies
        // out of scope for v6 codes refactor — fall back to type template).
        name = t.name; code = row.code || t.code; slots = t.slots; trades = t.trades || [];
      } else {
        name = 'Unknown type';
      }
    }

    const elementMeta = row.element ? elementsById[row.element] : null;
    const elementLabel = elementMeta ? elementMeta.label : (row.element || 'Element');
    const locationName = (locations.find(r => r.id === row.locationId) || {}).name || 'Unassigned';

    return {
      id: row.id,
      kind,
      element: row.element || null,
      elementLabel,
      locationId: row.locationId || null,
      locationName,
      category: row.category || (material && material.category) || null,
      material,
      resolvedItem: material,
      name, code, sku, supplier, trade, trades,
      slots, swatchColor, swatchBrand,
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
      schemaVersion: 5, title: 'Schedule', options: [], components: [],
      cells: {}, rows: [],
    }), []);
    const sched = window.useProjectSchedule
      ? window.useProjectSchedule(projectId, () => fallback, x => x)
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

    const scheduleHiddenFields = Array.isArray(blob.scheduleHiddenFields) ? blob.scheduleHiddenFields : [];
    const setScheduleHiddenFields = (updater) => {
      sched.set(prev => {
        const base = prev || fallback;
        const prevHidden = Array.isArray(base.scheduleHiddenFields) ? base.scheduleHiddenFields : [];
        const nextHidden = typeof updater === 'function' ? updater(prevHidden) : updater;
        return { ...base, scheduleHiddenFields: Array.from(new Set(nextHidden || [])) };
      });
    };

    // Local UI state.
    const [grouping, setGrouping] = useState('section');
    const [view, setView] = useState('schedule');   // 'schedule' | 'specification'
    const [editingId, setEditingId] = useState(null);
    const [fieldsOpen, setFieldsOpen] = useState(false);
    // PickerDrawer state. mode='single' opens for one row's swatch click;
    // mode='multi' opens for "+ Add to Section" bulk-add.
    // null when closed. { mode, rowId?, element, eyebrow, title, subtitle, seed? }
    const [picker, setPicker] = useState(null);

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
    const taxonomies = (cs && cs.taxonomies)
      || (cs && cs.appState && cs.appState.taxonomies)
      || window.DEFAULT_TAXONOMIES || { elements: [] };
    const elements = taxonomies.elements || [];
    const elementsById = useMemo(
      () => Object.fromEntries(elements.map(e => [e.id, e])),
      [elements]
    );

    // Active dupePolicy — drives auto-suggest, swap re-suggest, and picker
    // preview rendering. Recomputes on settings change.
    const settingsDupePolicy = cs && cs.appState && cs.appState.settings
      && cs.appState.settings.dupePolicy;
    const policy = useMemo(
      () => (window.getDupePolicy
        ? window.getDupePolicy({ dupePolicy: settingsDupePolicy })
        : (settingsDupePolicy || window.DUPE_PRESET_A || {})),
      [settingsDupePolicy]
    );

    const locations = (project && project.locations) || [];

    // Resolved card data per row.
    const cards = useMemo(
      () => rows.map(r => resolveCardFromRow(r, { materials, locations, elementsById })),
      [rows, materials, locations, elementsById]
    );

    const categoriesPresent = useMemo(() => {
      const seen = new Set();
      const out = [];
      cards.forEach(c => {
        if (c.category && !seen.has(c.category)) {
          seen.add(c.category);
          out.push(c.category);
        }
      });
      return out;
    }, [cards]);

    const fieldChooserGroups = useMemo(() => {
      const groups = [];
      const seen = new Set();
      const clean = (fields) => (fields || []).filter(f =>
        f && !f.hidden && !FIELD_CHOOSER_SKIP.has(f.id)
      );
      const present = categoriesPresent.length ? categoriesPresent : [];
      const commonIds = new Set(window.commonFieldIds ? window.commonFieldIds() : []);
      const common = clean(window.commonFields ? window.commonFields() : [])
        .filter(f => {
          if (seen.has(f.id)) return false;
          seen.add(f.id);
          return true;
        });
      if (common.length) groups.push({ key: 'common', label: 'Common', fields: common });
      present.forEach(catId => {
        const fields = clean(window.fieldsForCategory ? window.fieldsForCategory(catId) : [])
          .filter(f => {
            if (commonIds.has(f.id) || seen.has(f.id)) return false;
            seen.add(f.id);
            return true;
          });
        if (fields.length) groups.push({ key: catId, label: categoryLabel(catId), fields });
      });
      return groups;
    }, [categoriesPresent]);

    // Filtered + grouped.
    const filteredCards = cards;  // No active filters in D1a; D1d adds the picker.
    const filteredOut = cards.length > 0 && filteredCards.length === 0;

    const groups = useMemo(() => {
      if (grouping === 'none') {
        return [{ key: 'all', title: 'All items', groupValue: null, cards: filteredCards }];
      }
      const buckets = new Map();
      for (const c of filteredCards) {
        let key, title;
        let groupValue = null;
        if (grouping === 'category') {
          groupValue = c.category || null;
          key = groupValue || 'uncategorised';
          title = categoryLabel(groupValue);
        } else {
          groupValue = c.element || null;
          key = groupValue || c.elementLabel || 'Unassigned';
          title = c.elementLabel || c.element || 'Unassigned';
        }
        if (!buckets.has(key)) buckets.set(key, { key, title, groupValue, cards: [] });
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
        locationId: seed.locationId || (locations[0] && locations[0].id) || null,
        category: seed.category || null,
        state: 'new',
        specMode: 'proprietary',
        typeOrInstance: 'instance',
        qty: null, unit: null,
        revision: null, approvalComment: null,
        note: null,
        hiddenFields: [],
        source: 'manual',
        trade: seed.trade || null,
        code: null,
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

    function updateMaterialField(materialId, fieldId, value) {
      if (!cs || !cs.setMaterials) return;
      cs.setMaterials(list => (list || []).map(m => {
        if (!m || m.id !== materialId) return m;
        if (window.setFieldOnDraft) {
          let next = { ...m };
          const set = (key, val) => { next = { ...next, [key]: val }; };
          window.setFieldOnDraft(set, fieldId, value, m);
          return next;
        }
        return {
          ...m,
          fields: { ...(m.fields || {}), [fieldId]: value },
          [fieldId]: value,
        };
      }));
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
      const isOffice = window.isOfficeMode && window.isOfficeMode(policy);
      if (picker.mode === 'single') {
        const productId = idOrIds;
        const m = materials.find(x => x.id === productId);
        const _fv2 = window.getFieldValue || ((x, k) => (x.fields && x.fields[k]) ?? x[k]);
        const tradeFromProduct = m
          ? (_fv2(m, 'trade') || (window.defaultTradeForCategory ? window.defaultTradeForCategory(m.category) : null))
          : null;
        const oldRow = rows.find(r => r.id === picker.rowId);
        const patch = { specRef: { kind: 'product', id: productId } };
        if (m) patch.category = m.category;
        if (tradeFromProduct) patch.trade = tradeFromProduct;
        if (m) {
          if (isOffice) {
            patch.code = m.code || (window.nextRowCodeFor
              ? window.nextRowCodeFor(rows.filter(r => r.id !== picker.rowId), m, policy)
              : '');
          } else if (oldRow) {
            const oldCatRows = rows.filter(r => r.id !== oldRow.id && r.category === oldRow.category);
            if (window.isAutoGeneratedCode && window.isAutoGeneratedCode(oldRow.code, oldCatRows)) {
              patch.code = window.nextRowCodeFor
                ? window.nextRowCodeFor(rows.filter(r => r.id !== oldRow.id), m, policy)
                : '';
            }
          }
        }
        // We treat anything matched in `materials` as a product; type ids would
        // come from typeTemplates once Types ship. For v1, products only.
        updateRow(picker.rowId, patch);
        setPicker(null);
        return;
      }
      // Bulk add — create one row per id, all carrying the seed.
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const seed = picker.seed || {};
      const newRows = [];
      let runningPool = rows.slice();
      for (const id of ids) {
        const m = materials.find(x => x.id === id);
        const _fv3 = window.getFieldValue || ((x, k) => (x.fields && x.fields[k]) ?? x[k]);
        const tradeFromProduct = m
          ? (_fv3(m, 'trade') || (window.defaultTradeForCategory ? window.defaultTradeForCategory(m.category) : null))
          : null;
        let code = null;
        if (m) {
          if (isOffice) {
            code = m.code || (window.nextRowCodeFor
              ? window.nextRowCodeFor(runningPool, m, policy) : '');
          } else if (window.nextRowCodeFor) {
            code = window.nextRowCodeFor(runningPool, m, policy);
          }
        }
        const row = {
          id: newRowId(),
          specRef: { kind: 'product', id },
          element: seed.element || null,
          locationId: seed.locationId || (locations[0] && locations[0].id) || null,
          category: (m && m.category) || null,
          state: 'new',
          specMode: 'proprietary',
          typeOrInstance: 'instance',
          qty: null, unit: null,
          revision: null, approvalComment: null,
          note: null,
          hiddenFields: [],
          source: 'manual',
          trade: seed.trade || tradeFromProduct || null,
          code: code || null,
        };
        newRows.push(row);
        runningPool = [...runningPool, row];
      }
      setRows(prev => [...prev, ...newRows]);
      setPicker(null);
    }

    // Picker preview shared between single-swap and multi-add.
    function codePreviewFor(materialId, prevSelectedIds) {
      if (!policy || policy.autoAssign === 'off' || policy.autoAssign === 'none') return null;
      const m = materials.find(x => x.id === materialId);
      if (!m) return null;
      const isOffice = window.isOfficeMode && window.isOfficeMode(policy);
      const baseRows = picker && picker.mode === 'single' && picker.rowId
        ? rows.filter(r => r.id !== picker.rowId)
        : rows.slice();
      if (isOffice && m.code) return m.code;
      let pool = baseRows;
      for (const id of (prevSelectedIds || [])) {
        const mm = materials.find(x => x.id === id);
        if (!mm) continue;
        const c = window.nextRowCodeFor ? window.nextRowCodeFor(pool, mm, policy) : '';
        pool = [...pool, { id: 'preview-' + id, specRef: { kind: 'product', id }, category: mm.category, code: c }];
      }
      return window.nextRowCodeFor ? window.nextRowCodeFor(pool, m, policy) : null;
    }

    // Per-card change handlers — translates CardVariantD fields back into the
    // row shape. Notes writes row.note (singular, matching the migration shape).
    function onCardFieldChange(cardId, field, value) {
      if (field === 'notes') return updateRow(cardId, { note: value });
      if (field === 'element') return updateRow(cardId, { element: value });
      if (field === 'hiddenFields') return updateRow(cardId, { hiddenFields: value });
      if (field === 'code') return updateRow(cardId, { code: value || null });
      if (field === 'locationId') return updateRow(cardId, { locationId: value || null });
      // Other field edits flow into the row directly (e.g. supplier, sku, trade)
      // — for product-bound rows these are derived from the material so the edit
      // doesn't persist. We still allow it on free rows.
      return updateRow(cardId, { [field]: value });
    }

    // Inline-create a new room: appends { id, name } to project.locations and
    // returns the new id so the caller can immediately assign it to a row.
    function addLocationInline(name) {
      if (!project || !cs || !cs.setProjects) return null;
      const trimmed = String(name || '').trim();
      if (!trimmed) return null;
      const newId = 'loc-' + Date.now();
      const entry = { id: newId, name: trimmed };
      cs.setProjects(list => list.map(p =>
        p.id === project.id
          ? Object.assign({}, p, {
              locations: [...(p.locations || []), entry],
              locationIds: [...(p.locationIds || []), newId],
            })
          : p
      ));
      return newId;
    }

    // Project header derived bits.
    const projectMeta = project && (project.code || project.client || project.stage);

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
            <div className="sched-page-eyebrow">Project Schedule</div>
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
          <div className="sched-group-select">
            <span>Group</span>
            <select value={grouping} onChange={e => setGrouping(e.target.value)}>
              {GROUP_OPTIONS_BASE.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div ref={fieldsPopRef} style={{ position: 'relative' }}>
            <button type="button" className="sched-fields-btn"
              onClick={() => setFieldsOpen(o => !o)}>
              Columns ▾
            </button>
            {fieldsOpen && (
              <div className="sched-fields-pop">
                {fieldChooserGroups.length === 0 ? (
                  <div className="sched-fields-empty">No category fields yet</div>
                ) : fieldChooserGroups.map(group => (
                  <div key={group.key} className="sched-fields-group">
                    <div className="sched-fields-heading">{group.label}</div>
                    {group.fields.map(f => {
                      const checked = !scheduleHiddenFields.includes(f.id);
                      return (
                        <label key={f.id}>
                          <input type="checkbox" checked={checked}
                            onChange={() => {
                              setScheduleHiddenFields(prev => checked
                                ? Array.from(new Set([...(prev || []), f.id]))
                                : (prev || []).filter(k => k !== f.id));
                            }} />
                          {fieldLabelForToolbar(f)}
                        </label>
                      );
                    })}
                  </div>
                ))}
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
          <div className="sched-empty">
            <div className="sched-empty-eyebrow">Empty schedule</div>
            <div className="sched-empty-msg">Use &ldquo;+ Add row&rdquo; above to get started</div>
          </div>
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
                  locations={locations}
                  materials={materials}
                  globalHiddenFields={scheduleHiddenFields}
                  onGlobalHiddenFieldsChange={setScheduleHiddenFields}
                  onAddLocation={addLocationInline}
                  density={density}
                  onSwatchClick={() => openPickerForRow(c)}
                  onFieldChange={(f, v) => onCardFieldChange(c.id, f, v)}
                  onHiddenFieldsChange={(arr) => updateRow(c.id, { hiddenFields: arr })}
                  onMaterialFieldChange={updateMaterialField}
                  isEditing={editingId === c.id}
                  onEdit={() => setEditingId(c.id)}
                  onSave={() => setEditingId(null)}
                />
              ))}
              <div className="sched-add-row" style={{ display: 'flex', gap: 16 }}>
                <button type="button" onClick={() => {
                  const seed = grouping === 'category'
                    ? { category: g.groupValue }
                    : grouping === 'section'
                    ? { element: g.groupValue || elements.find(e => e.label === g.title)?.id }
                    : {};
                  openPickerForBulkAdd(seed, g.title);
                }}>
                  + Add from Library to {g.title}
                </button>
                <button type="button" onClick={() => {
                  const seed = grouping === 'category'
                    ? { category: g.groupValue }
                    : grouping === 'section'
                    ? { element: g.groupValue || elements.find(e => e.label === g.title)?.id }
                    : {};
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
            codePreviewFor={codePreviewFor}
          />
        )}
      </>
    );
  }

  window.SchedulePage = SchedulePage;
})();
