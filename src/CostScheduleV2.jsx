// Cost Schedule 2.0 — simplified component/category model + inline insertion.
//
// Key changes vs v1:
//   1. Hover-between-rows → + handle appears in the left gutter for mid-list insertion.
//   2. Left-gutter row controls (drag-handle, "…" menu) on row hover; no more far-right ×.
//   3. Categories are derived from the per-row field; no separate "Add category" button.
//      Each category has its own + Add component button in its header.
//   4. Qty is structured as Count (optional) × Size — no freeform formulas. Blank count = 1.
//      Totals use `(count || 1) × size × unit cost`.
//   5. Shares storage with v1 (aml-schedule-<projectId>) so switching versions preserves work.

function CostScheduleV2({ materials, projects, libraries, labelTemplates,
  activeProjectId, setActiveProjectId, onUpdateProject, density }) {
  // Resolve shared components lazily — they're attached to window by sibling scripts.
  const MaterialPicker = window.MaterialPicker;
  const LibraryScopeRow = window.LibraryScopeRow;
  const CategoryGroup = window.CategoryGroup;
  const componentQty = window.componentQty;
  const DnDProvider = window.DnDProvider;
  const ScheduleGrid = window.ScheduleGrid;
  const project = React.useMemo(() => {
    if (activeProjectId) {
      const p = projects.find(x => x.id === activeProjectId);
      if (p) return p;
    }
    return projects[0];
  }, [projects, activeProjectId]);

  if (!project) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <Eyebrow>No project selected</Eyebrow>
        <div style={{ marginTop: 20, ...ui.mono, color: 'var(--ink-3)', fontSize: 13 }}>
          Create a project in Volume II to begin costing.
        </div>
      </div>
    );
  }

  const storageKey = 'aml-schedule-' + project.id;
  const [schedule, setSchedule] = React.useState(() => window.loadScheduleV2(storageKey, project));
  const [pickerFor, setPickerFor] = React.useState(null);
  const [editingOptionId, setEditingOptionId] = React.useState(null);
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [justInsertedId, setJustInsertedId] = React.useState(null);
  const [menuForCompId, setMenuForCompId] = React.useState(null);
  const [viewMode, setViewMode] = React.useState(() => {
    try { return localStorage.getItem('aml-cs-mode') || 'gallery'; } catch { return 'gallery'; }
  });

  // Cell clipboard — C to copy hovered cell's material, V to paste into hovered cell.
  const [clipboard, setClipboard] = React.useState(null);  // { materialId, optionId, componentId }
  const [hoverKey, setHoverKey] = React.useState(null);    // "optId:compId"
  function setViewModePersist(v) {
    setViewMode(v);
    try { localStorage.setItem('aml-cs-mode', v); } catch {}
  }

  React.useEffect(() => {
    setSchedule(window.loadScheduleV2(storageKey, project));
    setEditingOptionId(null);
    setEditingTitle(false);
  }, [project.id]);

  React.useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(schedule)); } catch {}
  }, [schedule, storageKey]);

  // Global C / V / Esc handler for cell clipboard.
  React.useEffect(() => {
    function onKey(e) {
      const ae = document.activeElement;
      const tag = ae?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ae?.isContentEditable) return;
      if (pickerFor) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === 'c') {
        if (!hoverKey) return;
        const cell = schedule.cells[hoverKey];
        if (!cell?.materialId) return;
        const [optionId, componentId] = hoverKey.split(':');
        setClipboard({ materialId: cell.materialId, optionId, componentId });
        e.preventDefault();
      } else if (k === 'v') {
        if (!clipboard || !hoverKey) return;
        const [optionId, componentId] = hoverKey.split(':');
        update(s => ({
          ...s,
          cells: { ...s.cells, [hoverKey]: { materialId: clipboard.materialId } },
        }));
        const el = document.querySelector(
          '[data-cs-cell="' + hoverKey + '"], [data-row-id="' + hoverKey + '"]'
        );
        if (el) {
          const prevOutline = el.style.outline;
          const prevOffset = el.style.outlineOffset;
          el.style.outline = '2px solid var(--accent)';
          el.style.outlineOffset = '-2px';
          setTimeout(() => {
            el.style.outline = prevOutline;
            el.style.outlineOffset = prevOffset;
          }, 260);
        }
        e.preventDefault();
      } else if (e.key === 'Escape' && clipboard) {
        setClipboard(null);
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hoverKey, clipboard, pickerFor, schedule.cells]);

  // Reflect the clipboard source cell with a dashed outline.
  React.useEffect(() => {
    if (!clipboard) return;
    const key = clipboard.optionId + ':' + clipboard.componentId;
    const el = document.querySelector(
      '[data-cs-cell="' + key + '"], [data-row-id="' + key + '"]'
    );
    if (!el) return;
    const prevOutline = el.style.outline;
    const prevOffset = el.style.outlineOffset;
    el.style.outline = '1px dashed var(--accent)';
    el.style.outlineOffset = '-1px';
    return () => {
      el.style.outline = prevOutline;
      el.style.outlineOffset = prevOffset;
    };
  }, [clipboard, viewMode]);

  const update = (fn) => setSchedule(s => fn(s));

  // ───── Library scoping
  const projectLibIds = project.libraryIds || [];
  const scopedMaterials = React.useMemo(() => {
    if (projectLibIds.length === 0) return materials;
    return materials.filter(m => (m.libraryIds || []).some(lid => projectLibIds.includes(lid)));
  }, [materials, projectLibIds.join('|')]);
  const setProjectLibraries = (ids) => onUpdateProject({ ...project, libraryIds: ids });

  // ───── Component ops
  function newComponent(category) {
    return {
      id: 'c-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3),
      name: '', count: null, size: '', unit: 'm²',
      category: category || 'Uncategorised',
    };
  }
  function insertComponentAt(index, category) {
    const c = newComponent(category);
    update(s => {
      const next = s.components.slice();
      next.splice(index, 0, c);
      return { ...s, components: next };
    });
    setJustInsertedId(c.id);
    return c.id;
  }
  function appendComponentToCategory(category) {
    // Find the last row in that category; insert right after it.
    const last = [...schedule.components].map((c, i) => ({ c, i }))
      .filter(x => (x.c.category || 'Uncategorised') === category).pop();
    const index = last ? last.i + 1 : schedule.components.length;
    return insertComponentAt(index, category);
  }
  function setComp(id, field, value) {
    update(s => ({
      ...s,
      components: s.components.map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  }
  function removeComponent(id) {
    update(s => ({
      ...s,
      components: s.components.filter(c => c.id !== id),
      cells: Object.fromEntries(Object.entries(s.cells).filter(([k]) => !k.endsWith(':' + id))),
    }));
  }
  function duplicateComponent(id) {
    update(s => {
      const idx = s.components.findIndex(c => c.id === id);
      if (idx < 0) return s;
      const src = s.components[idx];
      const copy = { ...src, id: 'c-' + Date.now() + '-d', name: src.name + ' (copy)' };
      const nextComponents = s.components.slice();
      nextComponents.splice(idx + 1, 0, copy);
      // Also duplicate the cell assignments
      const nextCells = { ...s.cells };
      s.options.forEach(o => {
        const src = s.cells[o.id + ':' + id];
        if (src) nextCells[o.id + ':' + copy.id] = { ...src };
      });
      return { ...s, components: nextComponents, cells: nextCells };
    });
  }
  function moveComponent(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    update(s => {
      const arr = s.components.slice();
      const [moved] = arr.splice(fromIdx, 1);
      // If we're moving a row between categories, adopt the target's category.
      const boundaryCategory = arr[toIdx]?.category
        ?? arr[toIdx - 1]?.category
        ?? moved.category;
      const rewritten = { ...moved, category: boundaryCategory };
      arr.splice(toIdx, 0, rewritten);
      return { ...s, components: arr };
    });
  }

  // DnD: the drop target's `data` has shape
  //   { kind: 'row-between', category, beforeIndex } for between-row zones
  //   { kind: 'row-before-cat', category } for "insert at start of this category"
  //   { kind: 'cat-between', beforeCategory } for category reordering
  function handleDrop(kind, id, over) {
    if (kind === 'row') {
      const fromIdx = schedule.components.findIndex(c => c.id === id);
      if (fromIdx < 0) return;
      const targetCat = over.category;
      let toIdx = typeof over.beforeIndex === 'number'
        ? over.beforeIndex
        : schedule.components.length;
      // Adjust for self-removal shift.
      if (fromIdx < toIdx) toIdx -= 1;
      update(s => {
        const arr = s.components.slice();
        const [moved] = arr.splice(fromIdx, 1);
        const withCat = { ...moved, category: targetCat || moved.category };
        const clamped = Math.max(0, Math.min(toIdx, arr.length));
        arr.splice(clamped, 0, withCat);
        return { ...s, components: arr };
      });
    } else if (kind === 'category') {
      // Reorder a whole category group within the components array.
      const currentOrder = Array.from(new Set(
        schedule.components.map(c => c.category || 'Uncategorised')));
      const fromOrderIdx = currentOrder.indexOf(id);
      if (fromOrderIdx < 0) return;
      let beforeCat = over.beforeCategory; // null = drop at the end
      const nextOrder = currentOrder.slice();
      nextOrder.splice(fromOrderIdx, 1);
      let toOrderIdx = beforeCat ? nextOrder.indexOf(beforeCat) : nextOrder.length;
      if (toOrderIdx < 0) toOrderIdx = nextOrder.length;
      nextOrder.splice(toOrderIdx, 0, id);
      // Rebuild components in the new category order, preserving intra-group order.
      update(s => {
        const byCat = new Map();
        s.components.forEach(c => {
          const k = c.category || 'Uncategorised';
          if (!byCat.has(k)) byCat.set(k, []);
          byCat.get(k).push(c);
        });
        const reordered = nextOrder.flatMap(cat => byCat.get(cat) || []);
        return { ...s, components: reordered };
      });
    }
  }

  // Menu "Move" actions — structured alternatives to drag.
  function moveRowUp(id) {
    update(s => {
      const idx = s.components.findIndex(c => c.id === id);
      if (idx <= 0) return s;
      const arr = s.components.slice();
      const [m] = arr.splice(idx, 1);
      arr.splice(idx - 1, 0, m);
      return { ...s, components: arr };
    });
  }
  function moveRowDown(id) {
    update(s => {
      const idx = s.components.findIndex(c => c.id === id);
      if (idx < 0 || idx >= s.components.length - 1) return s;
      const arr = s.components.slice();
      const [m] = arr.splice(idx, 1);
      arr.splice(idx + 1, 0, m);
      return { ...s, components: arr };
    });
  }
  function moveRowToCategoryEdge(id, edge) {
    update(s => {
      const idx = s.components.findIndex(c => c.id === id);
      if (idx < 0) return s;
      const comp = s.components[idx];
      const cat = comp.category || 'Uncategorised';
      const arr = s.components.slice();
      arr.splice(idx, 1);
      const firstInCat = arr.findIndex(c => (c.category || 'Uncategorised') === cat);
      let target;
      if (firstInCat < 0) {
        target = Math.min(idx, arr.length);
      } else {
        let lastInCat = firstInCat;
        for (let i = firstInCat; i < arr.length; i++) {
          if ((arr[i].category || 'Uncategorised') === cat) lastInCat = i;
        }
        target = edge === 'top' ? firstInCat : lastInCat + 1;
      }
      arr.splice(target, 0, comp);
      return { ...s, components: arr };
    });
  }
  function changeComponentCategory(id, newCategory) {
    const clean = (newCategory || '').trim() || 'Uncategorised';
    update(s => ({
      ...s,
      components: s.components.map(c => c.id === id ? { ...c, category: clean } : c),
    }));
  }
  function renameCategory(oldName, newName) {
    const clean = (newName || '').trim();
    if (!clean || clean === oldName) return;
    update(s => ({
      ...s,
      components: s.components.map(c =>
        (c.category || 'Uncategorised') === oldName ? { ...c, category: clean } : c),
    }));
  }
  function removeCategory(name) {
    const affected = schedule.components.filter(c => (c.category || 'Uncategorised') === name);
    if (affected.length > 0) {
      const msg = affected.length === 1
        ? `Delete category "${name}" and its 1 row?`
        : `Delete category "${name}" and its ${affected.length} rows?`;
      if (!window.confirm(msg)) return;
    }
    const removedIds = new Set(affected.map(c => c.id));
    update(s => ({
      ...s,
      components: s.components.filter(c => !removedIds.has(c.id)),
      cells: Object.fromEntries(
        Object.entries(s.cells).filter(([k]) => {
          const compId = k.split(':')[1];
          return !removedIds.has(compId);
        })
      ),
    }));
  }
  function duplicateCategory(name) {
    update(s => {
      const srcRows = s.components.filter(c => (c.category || 'Uncategorised') === name);
      if (srcRows.length === 0) return s;
      // Find a fresh name
      const existing = new Set(s.components.map(c => c.category || 'Uncategorised'));
      let newName = name + ' (copy)';
      let n = 2;
      while (existing.has(newName)) { newName = `${name} (copy ${n++})`; }
      const ts = Date.now();
      const idMap = {};
      const cloned = srcRows.map((c, i) => {
        const nid = 'c-' + ts + '-d' + i;
        idMap[c.id] = nid;
        return { ...c, id: nid, category: newName };
      });
      // Insert cloned rows right after the last row of the source category
      const lastSrcIdx = Math.max(...srcRows.map(c => s.components.indexOf(c)));
      const nextComponents = s.components.slice();
      nextComponents.splice(lastSrcIdx + 1, 0, ...cloned);
      // Duplicate cell assignments for each cloned component
      const nextCells = { ...s.cells };
      s.options.forEach(o => {
        srcRows.forEach(c => {
          const src = s.cells[o.id + ':' + c.id];
          if (src) nextCells[o.id + ':' + idMap[c.id]] = { ...src };
        });
      });
      return { ...s, components: nextComponents, cells: nextCells };
    });
  }

  // ───── Cells
  function setCellMaterial(optionId, componentId, materialId) {
    update(s => ({
      ...s,
      cells: { ...s.cells, [optionId + ':' + componentId]: materialId ? { materialId } : null },
    }));
    setPickerFor(null);
  }
  function cellTotal(optionId, component) {
    const cell = schedule.cells[optionId + ':' + component.id];
    if (!cell || !cell.materialId) return null;
    const m = materials.find(x => x.id === cell.materialId);
    if (!m) return null;
    const q = componentQty(component);
    if (q === null) return null;
    return q * m.unitCost;
  }
  function optionTotal(optionId) {
    return schedule.components.reduce((s, c) => {
      const t = cellTotal(optionId, c);
      return t !== null ? s + t : s;
    }, 0);
  }
  const optionTotals = schedule.options.map(o => optionTotal(o.id));
  const validTotals = optionTotals.filter(t => t > 0);
  const lowest = validTotals.length ? Math.min(...validTotals) : 0;

  // ───── Options
  function addOption() {
    const id = 'o-' + Date.now();
    update(s => ({ ...s, options: [...s.options, { id, name: 'Option ' + (s.options.length + 1) }] }));
  }
  function renameOption(id, name) {
    update(s => ({ ...s, options: s.options.map(o => o.id === id ? { ...o, name } : o) }));
  }
  function removeOption(id) {
    if (schedule.options.length <= 1) return;
    if (!window.confirm('Remove this option column?')) return;
    update(s => ({
      ...s,
      options: s.options.filter(o => o.id !== id),
      cells: Object.fromEntries(Object.entries(s.cells).filter(([k]) => !k.startsWith(id + ':'))),
    }));
  }
  function reorderOption(id, dir) {
    update(s => {
      const idx = s.options.findIndex(o => o.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= s.options.length) return s;
      const opts = [...s.options];
      [opts[idx], opts[newIdx]] = [opts[newIdx], opts[idx]];
      return { ...s, options: opts };
    });
  }
  function duplicateOption(sourceId) {
    const source = schedule.options.find(o => o.id === sourceId);
    const id = 'o-' + Date.now();
    update(s => {
      const newCells = { ...s.cells };
      Object.keys(s.cells).forEach(k => {
        if (k.startsWith(sourceId + ':')) {
          const compId = k.split(':')[1];
          newCells[id + ':' + compId] = s.cells[k];
        }
      });
      return {
        ...s,
        options: [...s.options, { id, name: source.name + ' (copy)' }],
        cells: newCells,
      };
    });
  }

  // ───── Group components by category, in the order they first appear
  const grouped = React.useMemo(() => {
    const map = new Map(); // preserves insertion order
    schedule.components.forEach((c, idx) => {
      const key = c.category || 'Uncategorised';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ component: c, globalIndex: idx });
    });
    return Array.from(map.entries());
  }, [schedule.components]);

  // Existing category names for the picker in the menu
  const categoryNames = React.useMemo(() =>
    Array.from(new Set(schedule.components.map(c => c.category || 'Uncategorised'))),
    [schedule.components]);

  const gridColumns = `72px minmax(220px, 2fr) 64px 96px repeat(${schedule.options.length}, minmax(180px, 1.4fr))`;

  function handleMouseOver(e) {
    const el = e.target.closest('[data-cs-cell]');
    if (el) { setHoverKey(el.getAttribute('data-cs-cell')); return; }
    if (viewMode === 'table') {
      const rowEl = e.target.closest('[data-row-id]');
      const id = rowEl?.getAttribute('data-row-id');
      if (id && id.includes(':')) { setHoverKey(id); return; }
    }
  }

  const clipboardMaterial = clipboard
    ? materials.find(m => m.id === clipboard.materialId)
    : null;

  return (
    <div onMouseOver={handleMouseOver}
      onMouseLeave={() => setHoverKey(null)}>
      <Header
        project={project}
        projects={projects}
        schedule={schedule}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        onTitleChange={(v) => update(s => ({ ...s, title: v }))}
        setActiveProjectId={setActiveProjectId}
        viewMode={viewMode} setViewMode={setViewModePersist}
      />

      <ToolbarV2 addOption={addOption} />

      <LibraryScopeRow
        libraries={libraries}
        selectedIds={projectLibIds}
        materials={materials}
        scopedCount={scopedMaterials.length}
        onChange={setProjectLibraries}
      />

      {viewMode === 'table' ? (
        <window.CostScheduleTable
          schedule={schedule}
          materials={scopedMaterials}
          libraries={libraries}
          labelTemplates={labelTemplates}
          setComp={setComp}
          setCellMaterial={setCellMaterial}
          removeComponent={removeComponent}
          duplicateComponent={duplicateComponent}
          changeComponentCategory={changeComponentCategory}
          cellTotal={cellTotal}
          onOpenPicker={(optionId, componentId) => setPickerFor({ optionId, componentId })}
          appendComponentToCategory={appendComponentToCategory}
          moveRowUp={moveRowUp}
          moveRowDown={moveRowDown}
          renameOption={renameOption}
          reorderOption={reorderOption}
          removeOption={removeOption}
        />
      ) : (
      <div style={{ overflowX: 'auto' }}>
        <DnDProvider onMove={handleDrop}>
          <ScheduleGrid
            gridColumns={gridColumns}
            schedule={schedule}
            grouped={grouped}
            materials={materials}
            labelTemplates={labelTemplates}
            categoryNames={categoryNames}
            justInsertedId={justInsertedId}
            menuForCompId={menuForCompId}
            setMenuForCompId={setMenuForCompId}
            editingOptionId={editingOptionId}
            setEditingOptionId={setEditingOptionId}
            optionTotals={optionTotals}
            lowest={lowest}
            renameOption={renameOption}
            duplicateOption={duplicateOption}
            removeOption={removeOption}
            setComp={setComp}
            removeComponent={removeComponent}
            duplicateComponent={duplicateComponent}
            changeComponentCategory={changeComponentCategory}
            moveComponent={moveComponent}
            moveRowUp={moveRowUp}
            moveRowDown={moveRowDown}
            moveRowToCategoryEdge={moveRowToCategoryEdge}
            setPickerFor={setPickerFor}
            cellTotal={cellTotal}
            insertComponentAt={insertComponentAt}
            appendComponentToCategory={appendComponentToCategory}
            renameCategory={renameCategory}
            removeCategory={removeCategory}
            duplicateCategory={duplicateCategory}
            onBlurInsert={() => setJustInsertedId(null)}
          />
        </DnDProvider>
      </div>
      )}

      <Footer
        schedule={schedule}
        onReset={() => {
          if (window.confirm('Reset this schedule to blank?')) {
            setSchedule({
              title: 'Materials Cost Schedule',
              options: [{ id: 'o-1', name: 'Option 1' }],
              components: [], cells: {},
            });
          }
        }}
      />

      {clipboard && clipboardMaterial && (
        <ClipboardToast
          label={window.formatLabel ? window.formatLabel(clipboardMaterial, labelTemplates) : clipboardMaterial.name}
          onClear={() => setClipboard(null)}
        />
      )}

      {pickerFor && (
        <MaterialPicker
          materials={scopedMaterials}
          libraries={libraries}
          labelTemplates={labelTemplates}
          component={schedule.components.find(c => c.id === pickerFor.componentId)}
          currentId={schedule.cells[pickerFor.optionId + ':' + pickerFor.componentId]?.materialId}
          projectId={project.id}
          onClose={() => setPickerFor(null)}
          onSelect={mid => setCellMaterial(pickerFor.optionId, pickerFor.componentId, mid)}
          onClear={() => setCellMaterial(pickerFor.optionId, pickerFor.componentId, null)}
        />
      )}
    </div>
  );
}

// ───────── Header / Toolbar / Footer ─────────

function Header({ project, projects, schedule, editingTitle, setEditingTitle, onTitleChange, setActiveProjectId, viewMode, setViewMode }) {
  return (
    <header style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <Eyebrow>Volume III · Cost schedule · v2</Eyebrow>
          {editingTitle ? (
            <input autoFocus value={schedule.title}
              onChange={e => onTitleChange(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false); }}
              style={{
                fontFamily: "'Newsreader', serif", fontWeight: 300,
                fontSize: 52, letterSpacing: '-0.015em', lineHeight: 1,
                margin: '10px 0 6px', background: 'transparent',
                border: 'none', borderBottom: '1px solid var(--ink)',
                outline: 'none', width: '100%', color: 'var(--ink)',
              }} />
          ) : (
            <h1 onClick={() => setEditingTitle(true)}
              title="Click to rename"
              style={{
                fontFamily: "'Newsreader', serif", fontWeight: 300,
                fontSize: 52, letterSpacing: '-0.015em', lineHeight: 1,
                margin: '10px 0 6px', cursor: 'text',
              }}>{schedule.title}</h1>
          )}
          <div style={{ ...ui.mono, fontSize: 11.5, color: 'var(--ink-3)' }}>
            {project.code || '—'} · {project.name} {project.client ? '· ' + project.client : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Eyebrow style={{ marginBottom: 6 }}>Project</Eyebrow>
          <select value={project.id} onChange={e => setActiveProjectId(e.target.value)}
            style={{
              background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--ink)',
              fontFamily: "'Newsreader', serif", fontSize: 17,
              padding: '2px 20px 4px 0', outline: 'none',
              cursor: 'pointer', color: 'var(--ink)',
            }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {setViewMode && (
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <window.ModeToggle mode={viewMode} setMode={setViewMode} />
            </div>
          )}
        </div>
      </div>
      <Rule heavy style={{ marginTop: 20 }} />
    </header>
  );
}

function ToolbarV2({ addOption }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 16, marginBottom: 10, flexWrap: 'wrap',
    }}>
      <div style={{ ...ui.serif, fontSize: 14, fontStyle: 'italic', color: 'var(--ink-3)', maxWidth: '62ch' }}>
        Hover between rows to insert. Leave <Mono size={12}>Count</Mono> blank for single items —
        totals use <Mono size={12}>size</Mono> alone. Filled, totals use <Mono size={12}>count × size</Mono>.
      </div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
        <TextButton onClick={addOption}>＋ Add option</TextButton>
      </div>
    </div>
  );
}

function Footer({ schedule, onReset }) {
  return (
    <div style={{
      marginTop: 42, paddingTop: 20, borderTop: '1px solid var(--rule)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    }}>
      <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {schedule.components.length} components · {schedule.options.length} options · autosaved
      </Mono>
      <TextButton onClick={onReset} accent>Reset schedule</TextButton>
    </div>
  );
}

// ───────── Option header ─────────

function OptionHeader({ index, option, canRemove, editing, setEditing, onRename, onDuplicate, onRemove }) {
  return (
    <div style={{ paddingBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Mono size={10} color="var(--ink-4)">OPT·{String(index + 1).padStart(2, '0')}</Mono>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={onDuplicate} title="Duplicate" style={v2SmallIcon}>dup</button>
          {canRemove && (
            <button type="button" onClick={onRemove} title="Remove" style={v2SmallIcon}>×</button>
          )}
        </div>
      </div>
      {editing ? (
        <input autoFocus value={option.name}
          onChange={e => onRename(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false); }}
          style={{
            ...ui.serif, fontSize: 15, fontWeight: 500,
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--ink)', outline: 'none',
            width: '100%', padding: '2px 0',
          }} />
      ) : (
        <div onClick={() => setEditing(true)} title="Click to rename"
          style={{ ...ui.serif, fontSize: 15, fontWeight: 500, cursor: 'text' }}>
          {option.name}
        </div>
      )}
    </div>
  );
}

const v2SmallIcon = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--ink-4)', fontWeight: 500,
};

function ClipboardToast({ label, onClear }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--ink)', color: 'var(--paper)',
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 6px 22px rgba(20,20,20,0.22)',
      zIndex: 60,
      fontFamily: "'Inter Tight', sans-serif", fontSize: 12,
      letterSpacing: '0.01em',
      maxWidth: 520,
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.6,
      }}>Copied</span>
      <span style={{
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: 260, fontWeight: 500,
      }}>{label}</span>
      <span style={{ opacity: 0.55 }}>·</span>
      <span style={{ opacity: 0.7 }}>press V to paste, Esc to clear</span>
      <button type="button" onClick={onClear}
        title="Clear clipboard"
        style={{
          background: 'none', border: 'none', color: 'var(--paper)',
          cursor: 'pointer', opacity: 0.6, padding: '0 0 0 6px',
          fontSize: 16, lineHeight: 1,
        }}>×</button>
    </div>
  );
}

Object.assign(window, { CostScheduleV2 });
