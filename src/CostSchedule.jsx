// Cost Schedule — per-project persistent working page.

function CostSchedule({ materials, projects, libraries, labelTemplates, activeProjectId, setActiveProjectId, onUpdateProject, density }) {
  // Resolve active project
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

  // Phase 4: schedule loaded asynchronously from cloud (Supabase row in
  // `schedules` table, project_id = this project's id). The hook handles
  // race-guarding (project switch mid-load) and one-time migration from
  // localStorage if the cloud row is missing.
  const fallback = React.useCallback(
    () => buildScheduleFallback(project),
    [project.id]
  );
  const transform = React.useCallback(transformSchedule, []);
  const { data: schedule, set: setSchedule, status: scheduleStatus } =
    window.useProjectSchedule(project.id, fallback, transform);

  const [pickerFor, setPickerFor] = React.useState(null);
  const [groupBy, setGroupBy] = React.useState('category');
  const [editingOptionId, setEditingOptionId] = React.useState(null);
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [addingCompTo, setAddingCompTo] = React.useState(null); // category name or '__new'
  const [newCompName, setNewCompName] = React.useState('');
  const [newCompCat, setNewCompCat] = React.useState('');
  const [editingCategory, setEditingCategory] = React.useState(null);
  const [addingCategory, setAddingCategory] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');

  // Reset transient editing state when the project changes.
  React.useEffect(() => {
    setEditingOptionId(null);
    setEditingTitle(false);
  }, [project.id]);

  function update(updater) { setSchedule(s => updater(s)); }

  // Source-library scoping. project.libraryIds = [] means "all libraries".
  const projectLibIds = project.libraryIds || [];
  const scopedMaterials = React.useMemo(() => {
    if (projectLibIds.length === 0) return materials;
    return materials.filter(m => (m.libraryIds || []).some(lid => projectLibIds.includes(lid)));
  }, [materials, projectLibIds.join('|')]);
  function setProjectLibraries(ids) {
    onUpdateProject({ ...project, libraryIds: ids });
  }

  function setCellMaterial(optionId, componentId, materialId) {
    update(s => ({ ...s, cells: { ...s.cells, [optionId + ':' + componentId]: materialId ? { materialId } : null } }));
    setPickerFor(null);
  }
  function setComp(componentId, field, value) {
    update(s => ({ ...s, components: s.components.map(c => c.id === componentId ? { ...c, [field]: value } : c) }));
  }
  function addComponent(category) {
    const name = newCompName.trim();
    if (!name) return;
    const id = 'c-' + Date.now();
    update(s => ({
      ...s,
      components: [...s.components, { id, name, qty: '', unit: 'm²',
        category: category || newCompCat.trim() || 'Joinery' }],
    }));
    setAddingCompTo(null);
    setNewCompName('');
    setNewCompCat('');
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
  function addCategory(name) {
    const clean = (name || '').trim();
    if (!clean) return;
    // Seed the category with one blank component so it shows up
    const id = 'c-' + Date.now();
    update(s => ({
      ...s,
      components: [...s.components, { id, name: 'New component', qty: '', unit: 'm²', category: clean }],
    }));
  }
  function removeComponent(id) {
    update(s => ({
      ...s,
      components: s.components.filter(c => c.id !== id),
      cells: Object.fromEntries(Object.entries(s.cells).filter(([k]) => !k.endsWith(':' + id))),
    }));
  }
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

  function cellTotal(optionId, component) {
    const cell = schedule.cells[optionId + ':' + component.id];
    if (!cell || !cell.materialId) return null;
    const m = materials.find(x => x.id === cell.materialId);
    if (!m) return null;
    const q = parseFloat(component.qty);
    if (Number.isNaN(q)) return null;
    return q * m.unitCost;
  }
  function optionTotal(optionId) {
    return schedule.components.reduce((s, c) => {
      const t = cellTotal(optionId, c);
      return t !== null ? s + t : s;
    }, 0);
  }
  // Guarded — schedule may still be null during load (the loading-gate
  // early return below catches that case after all hooks have run).
  const optionTotals = schedule ? schedule.options.map(o => optionTotal(o.id)) : [];
  const validTotals = optionTotals.filter(t => t > 0);
  const lowest = validTotals.length ? Math.min(...validTotals) : 0;

  // Guards null schedule so the hook count stays stable across loading→ready
  // transitions (the loading gate sits below all hooks per Rules of Hooks).
  const groups = React.useMemo(() => {
    if (!schedule) return [];
    if (groupBy === 'none') return [['All components', schedule.components]];
    const map = new Map();
    schedule.components.forEach(c => {
      const k = c.category || 'Uncategorised';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(c);
    });
    return Array.from(map.entries());
  }, [schedule, groupBy]);

  // Loading / error gates — must come AFTER all hooks (rules of hooks).
  if (scheduleStatus === 'loading' || !schedule) {
    return <ScheduleSkeleton />;
  }
  if (scheduleStatus === 'error') {
    return <ScheduleErrorState />;
  }

  function gridColumns() {
    return `2.2fr 70px 80px repeat(${schedule.options.length}, minmax(180px, 1.4fr)) 28px`;
  }

  return (
    <div>
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <Eyebrow>Volume III · Cost schedule</Eyebrow>
            {editingTitle ? (
              <input autoFocus value={schedule.title}
                onChange={e => update(s => ({ ...s, title: e.target.value }))}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false); }}
                style={{
                  fontFamily: "'Newsreader', serif",
                  fontWeight: 300,
                  fontSize: 52,
                  letterSpacing: '-0.015em',
                  lineHeight: 1,
                  margin: '10px 0 6px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--ink)',
                  outline: 'none',
                  width: '100%',
                  color: 'var(--ink)',
                }} />
            ) : (
              <h1 onClick={() => setEditingTitle(true)}
                title="Click to rename"
                style={{
                  fontFamily: "'Newsreader', serif",
                  fontWeight: 300,
                  fontSize: 52,
                  letterSpacing: '-0.015em',
                  lineHeight: 1,
                  margin: '10px 0 6px',
                  cursor: 'text',
                }}>{schedule.title}</h1>
            )}
            <div style={{ ...ui.mono, fontSize: 11.5, color: 'var(--ink-3)' }}>
              {project.code || '—'} · {project.name} {project.client ? '· ' + project.client : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Eyebrow style={{ marginBottom: 6 }}>Project</Eyebrow>
            <select
              value={project.id}
              onChange={e => setActiveProjectId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--ink)',
                fontFamily: "'Newsreader', serif",
                fontSize: 17,
                padding: '2px 20px 4px 0',
                outline: 'none',
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <Rule heavy style={{ marginTop: 20 }} />
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ ...ui.serif, fontSize: 14, fontStyle: 'italic', color: 'var(--ink-3)', maxWidth: '58ch' }}>
          Click any cell to assign a material from the library. Quantities are shared across options; unit costs come from the library entry.
        </div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
            <span style={{ ...ui.label, marginRight: 6 }}>Group</span>
            {['category', 'none'].map(g => (
              <button key={g} type="button" onClick={() => setGroupBy(g)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                  fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
                  fontWeight: groupBy === g ? 500 : 400,
                  color: groupBy === g ? 'var(--ink)' : 'var(--ink-4)',
                  borderBottom: '1px solid ' + (groupBy === g ? 'var(--ink)' : 'transparent'),
                  textTransform: 'lowercase',
                }}>{g}</button>
            ))}
          </div>
          <TextButton onClick={addOption}>＋ Add option</TextButton>
        </div>
      </div>

      <LibraryScopeRow
        libraries={libraries}
        selectedIds={projectLibIds}
        materials={materials}
        scopedCount={scopedMaterials.length}
        onChange={setProjectLibraries}
      />

      <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: gridColumns(), columnGap: 16, minWidth: 800 }}>
        <Eyebrow style={{ paddingBottom: 10 }}>Component</Eyebrow>
        <Eyebrow style={{ paddingBottom: 10, textAlign: 'right' }}>Qty</Eyebrow>
        <Eyebrow style={{ paddingBottom: 10 }}>Unit</Eyebrow>
        {schedule.options.map((o, i) => (
          <div key={o.id} style={{ paddingBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Mono size={10} color="var(--ink-4)">OPT·{String(i + 1).padStart(2, '0')}</Mono>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => duplicateOption(o.id)} title="Duplicate" style={smallIcon}>dup</button>
                {schedule.options.length > 1 && (
                  <button type="button" onClick={() => removeOption(o.id)} title="Remove" style={smallIcon}>×</button>
                )}
              </div>
            </div>
            {editingOptionId === o.id ? (
              <input autoFocus value={o.name}
                onChange={e => renameOption(o.id, e.target.value)}
                onBlur={() => setEditingOptionId(null)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingOptionId(null); }}
                style={{
                  ...ui.serif, fontSize: 15, fontWeight: 500,
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid var(--ink)', outline: 'none',
                  width: '100%', padding: '2px 0',
                }} />
            ) : (
              <div onClick={() => setEditingOptionId(o.id)}
                title="Click to rename"
                style={{ ...ui.serif, fontSize: 15, fontWeight: 500, cursor: 'text' }}>
                {o.name}
              </div>
            )}
          </div>
        ))}
        <div />

        <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--ink)' }} />

        {groups.map(([groupName, items]) => (
          <React.Fragment key={groupName}>
            {groupBy === 'category' && (
              <div style={{
                gridColumn: '1 / -1',
                padding: '20px 0 10px',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                borderBottom: '1px dotted var(--rule-2)',
              }}>
                {editingCategory === groupName ? (
                  <input autoFocus defaultValue={groupName}
                    onBlur={e => { renameCategory(groupName, e.target.value); setEditingCategory(null); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { renameCategory(groupName, e.target.value); setEditingCategory(null); }
                      if (e.key === 'Escape') { setEditingCategory(null); }
                    }}
                    style={{
                      ...ui.serif, fontSize: 18, fontStyle: 'italic',
                      background: 'transparent', border: 'none',
                      borderBottom: '1px solid var(--ink)', outline: 'none',
                      flex: 1, marginRight: 20, padding: '2px 0',
                      color: 'var(--ink)',
                    }} />
                ) : (
                  <Serif size={18}
                    onClick={() => setEditingCategory(groupName)}
                    style={{ fontStyle: 'italic', cursor: 'text' }}>{groupName}</Serif>
                )}
                <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                  <Mono size={10} color="var(--ink-4)">{items.length} components</Mono>
                  <TextButton onClick={() => { setAddingCompTo(groupName); setNewCompName(''); }}>
                    ＋ Add component
                  </TextButton>
                </div>
              </div>
            )}
            {items.map((c, rowIdx) => (
              <ScheduleRow
                key={c.id}
                component={c}
                options={schedule.options}
                cells={schedule.cells}
                materials={materials}
                labelTemplates={labelTemplates}
                rowIdx={rowIdx}
                gridColumns={gridColumns()}
                setComp={(field, v) => setComp(c.id, field, v)}
                onCellClick={(optionId) => setPickerFor({ optionId, componentId: c.id })}
                cellTotal={cellTotal}
                onRemove={() => removeComponent(c.id)}
              />
            ))}
            {addingCompTo === groupName && (
              <div style={{ gridColumn: '1 / -1', padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input autoFocus value={newCompName}
                    onChange={e => setNewCompName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addComponent(groupName); if (e.key === 'Escape') setAddingCompTo(null); }}
                    placeholder="Component name"
                    style={{
                      flex: 1, background: 'transparent',
                      border: 'none', borderBottom: '1px solid var(--ink)',
                      fontFamily: "'Newsreader', serif", fontSize: 15,
                      padding: '4px 0', outline: 'none', color: 'var(--ink)',
                    }} />
                  <TextButton onClick={() => addComponent(groupName)} accent>Add</TextButton>
                  <TextButton onClick={() => setAddingCompTo(null)}>Cancel</TextButton>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        <div style={{ gridColumn: '1 / -1', padding: '20px 0 16px', borderTop: '1px solid var(--rule)' }}>
          {addingCompTo === '__new' ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input autoFocus value={newCompName}
                onChange={e => setNewCompName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addComponent(newCompCat || null); if (e.key === 'Escape') setAddingCompTo(null); }}
                placeholder="Component name"
                style={{
                  flex: 1, background: 'transparent',
                  border: 'none', borderBottom: '1px solid var(--ink)',
                  fontFamily: "'Newsreader', serif", fontSize: 15,
                  padding: '4px 0', outline: 'none', color: 'var(--ink)',
                }} />
              <select value={newCompCat}
                onChange={e => setNewCompCat(e.target.value)}
                style={{
                  width: 200, background: 'transparent',
                  border: 'none', borderBottom: '1px solid var(--rule-2)',
                  fontFamily: "'Inter Tight', sans-serif", fontSize: 13,
                  padding: '4px 0', outline: 'none', color: 'var(--ink-2)',
                }}>
                <option value="">Category…</option>
                {Array.from(new Set(schedule.components.map(c => c.category || 'Uncategorised'))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <TextButton onClick={() => addComponent(newCompCat || null)} accent>Add</TextButton>
              <TextButton onClick={() => setAddingCompTo(null)}>Cancel</TextButton>
            </div>
          ) : addingCategory ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input autoFocus value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { addCategory(newCatName); setAddingCategory(false); setNewCatName(''); }
                  if (e.key === 'Escape') { setAddingCategory(false); setNewCatName(''); }
                }}
                placeholder="Category name (e.g. Bathroom joinery, Flooring, Hardware)"
                style={{
                  flex: 1, background: 'transparent',
                  border: 'none', borderBottom: '1px solid var(--ink)',
                  fontFamily: "'Newsreader', serif", fontSize: 17, fontStyle: 'italic',
                  padding: '4px 0', outline: 'none', color: 'var(--ink)',
                }} />
              <TextButton onClick={() => { addCategory(newCatName); setAddingCategory(false); setNewCatName(''); }} accent>Add category</TextButton>
              <TextButton onClick={() => { setAddingCategory(false); setNewCatName(''); }}>Cancel</TextButton>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 28, alignItems: 'baseline' }}>
              {groupBy === 'category' && (
                <TextButton onClick={() => { setAddingCategory(true); setNewCatName(''); }} accent>
                  ＋ Add category
                </TextButton>
              )}
              <TextButton onClick={() => { setAddingCompTo('__new'); setNewCompName(''); setNewCompCat(''); }}>
                ＋ Add component
              </TextButton>
              {groupBy === 'category' && (
                <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Click a category name to rename it
                </Mono>
              )}
            </div>
          )}
        </div>

        <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--ink)' }} />
        <div style={{ ...ui.label, padding: '18px 0' }}>Option Total</div>
        <div /><div />
        {schedule.options.map((o, i) => {
          const t = optionTotals[i];
          const isLowest = t > 0 && t === lowest;
          return (
            <div key={o.id} style={{ padding: '18px 0', textAlign: 'left' }}>
              <Mono size={17} color="var(--ink)" style={{ fontWeight: 500 }}>
                {t > 0 ? fmtCurrency(t) : '—'}
              </Mono>
              {t > 0 && (
                <div style={{ marginTop: 4 }}>
                  {isLowest ? (
                    <Tag tone="accent">Lowest</Tag>
                  ) : (
                    <Mono size={11} color="var(--accent-ink)">+{fmtCurrency(t - lowest)}</Mono>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div />
      </div>
      </div>

      <div style={{ marginTop: 42, paddingTop: 20, borderTop: '1px solid var(--rule)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {schedule.components.length} components · {schedule.options.length} options · autosaved
        </Mono>
        <TextButton onClick={() => {
          if (window.confirm('Reset this schedule to blank?')) {
            setSchedule({ title: 'Materials Cost Schedule', options: [{ id: 'o-1', name: 'Option 1' }], components: [], cells: {} });
          }
        }} accent>Reset schedule</TextButton>
      </div>

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

const smallIcon = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--ink-4)', fontWeight: 500,
};

function ScheduleRow({ component: c, options, cells, materials, labelTemplates, rowIdx, gridColumns, setComp, onCellClick, cellTotal, onRemove }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        gridColumn: '1 / -1',
        display: 'grid',
        gridTemplateColumns: gridColumns,
        columnGap: 16,
        padding: 'var(--row-pad) 0',
        borderBottom: '1px solid var(--rule)',
        background: hov ? 'var(--tint)' : 'transparent',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <Mono size={10} color="var(--ink-4)" style={{ minWidth: 20 }}>{String(rowIdx + 1).padStart(2, '0')}</Mono>
        <input value={c.name} onChange={e => setComp('name', e.target.value)}
          style={{
            background: 'transparent', border: 'none',
            fontFamily: "'Newsreader', serif", fontSize: 15,
            padding: '2px 0', outline: 'none', width: '100%',
            borderBottom: '1px dotted transparent',
          }}
          onFocus={e => e.target.style.borderBottomColor = 'var(--ink)'}
          onBlur={e => e.target.style.borderBottomColor = 'transparent'}
        />
      </div>
      <input value={c.qty} onChange={e => setComp('qty', e.target.value)} placeholder="—"
        style={qtyInput} onFocus={e => e.target.style.borderBottomColor = 'var(--ink)'}
        onBlur={e => e.target.style.borderBottomColor = 'var(--rule-2)'} />
      <select value={c.unit} onChange={e => setComp('unit', e.target.value)} style={unitInput}>
        {['m²', 'l/m', 'each', 'sheet'].map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      {options.map(o => {
        const cell = cells[o.id + ':' + c.id];
        const m = cell?.materialId ? materials.find(x => x.id === cell.materialId) : null;
        const total = cellTotal(o.id, c);
        return (
          <ScheduleCell key={o.id} material={m} labelTemplates={labelTemplates} total={total} onClick={() => onCellClick(o.id)} />
        );
      })}
      <button type="button" onClick={onRemove} title="Remove row"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: hov ? 'var(--ink-4)' : 'transparent',
          fontSize: 14, padding: 0, transition: 'color 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = hov ? 'var(--ink-4)' : 'transparent'}
      >×</button>
    </div>
  );
}

const qtyInput = {
  background: 'transparent', border: 'none',
  borderBottom: '1px dotted var(--rule-2)',
  fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
  textAlign: 'right', width: '100%', outline: 'none',
  color: 'var(--ink)', padding: '2px 0',
};
const unitInput = {
  background: 'transparent', border: 'none',
  borderBottom: '1px dotted var(--rule-2)',
  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
  width: '100%', outline: 'none',
  color: 'var(--ink-2)', padding: '2px 0', cursor: 'pointer',
};

function ScheduleCell({ material, labelTemplates, total, onClick }) {
  const [hov, setHov] = React.useState(false);
  if (!material) {
    return (
      <div onClick={onClick}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          cursor: 'pointer', padding: '6px 8px',
          border: '1px dashed var(--rule-2)',
          background: hov ? 'var(--tint)' : 'transparent',
          textAlign: 'center', minHeight: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.1s',
        }}>
        <Mono size={10} color={hov ? 'var(--accent-ink)' : 'var(--ink-4)'} style={{ letterSpacing: '0.1em' }}>
          {hov ? '+ assign' : '—'}
        </Mono>
      </div>
    );
  }
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        cursor: 'pointer', padding: '6px 8px 6px 6px',
        border: '1px solid ' + (hov ? 'var(--ink)' : 'var(--rule)'),
        display: 'grid', gridTemplateColumns: '28px 1fr', gap: 8,
        alignItems: 'center', transition: 'border-color 0.12s',
      }}>
      <Swatch swatch={material.swatch} size="xs" seed={parseInt(material.id.slice(2)) || 1}
        style={{ width: 28, height: 28 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{
          ...ui.serif, fontSize: 12.5, lineHeight: 1.15, color: 'var(--ink)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{window.formatLabel(material, labelTemplates)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
          <Mono size={10} color="var(--ink-4)">{material.code}</Mono>
          {total !== null && <Mono size={11} color="var(--ink-2)" style={{ fontWeight: 500 }}>{fmtCurrency(total)}</Mono>}
        </div>
      </div>
    </div>
  );
}

function MaterialPicker({ materials, libraries, labelTemplates, component, currentId, projectId, onClose, onSelect, onClear }) {
  const [query, setQuery] = React.useState('');
  const [cat, setCat] = React.useState('All');
  const [kindGroupFilter, setKindGroupFilter] = React.useState('All'); // 'All' or a KIND_GROUPS entry
  const [showHidden, setShowHidden] = React.useState(false);
  const cats = ['All', ...window.CATEGORIES];
  const KIND_GROUPS = window.KIND_GROUPS || [];

  const componentTypeId = component?.componentType || null;
  const contextualFilterActive = !!componentTypeId && kindGroupFilter === 'All';
  const typeRule = componentTypeId && window.componentTypeById
    ? window.componentTypeById(componentTypeId) : null;

  const storageKey = projectId ? 'aml-picker-lib-' + projectId : null;
  const [selectedLib, setSelectedLib] = React.useState(() => {
    if (!storageKey) return 'All';
    try { return localStorage.getItem(storageKey) || 'All'; } catch { return 'All'; }
  });

  React.useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, selectedLib); } catch {}
  }, [selectedLib, storageKey]);

  const filtered = React.useMemo(() => {
    let list = materials.slice();
    if (selectedLib !== 'All') list = list.filter(m => (m.libraryIds || ['lib-master']).includes(selectedLib));
    if (cat !== 'All') list = list.filter(m => m.category === cat);
    // Kind group tab (overrides contextual filter)
    if (kindGroupFilter !== 'All') {
      const KINDS = window.KINDS || [];
      const kindIds = new Set(KINDS.filter(k => k.group === kindGroupFilter).map(k => k.id));
      list = list.filter(m => kindIds.has(m.kind || 'material'));
    }
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(m => (window.formatLabel(m, labelTemplates) + ' ' + m.name + ' ' + m.supplier + ' ' + m.code).toLowerCase().includes(q));
    return list;
  }, [materials, selectedLib, cat, query, kindGroupFilter]);

  // Partition by component-type match (only when contextual filter is active).
  const partitioned = React.useMemo(() => {
    const match = window.materialMatchForComponentType;
    if (!contextualFilterActive || !match) {
      return { preferred: filtered, allowed: [], hidden: [] };
    }
    const preferred = [], allowed = [], hidden = [];
    filtered.forEach(m => {
      const r = match(m, componentTypeId);
      if (r === 'hidden') hidden.push(m);
      else if (r === 'preferred') preferred.push(m);
      else allowed.push(m);
    });
    return { preferred, allowed, hidden };
  }, [filtered, contextualFilterActive, componentTypeId]);

  // The set of materials actually rendered (after partition + showHidden).
  const renderedIds = React.useMemo(() => {
    const ids = new Set();
    partitioned.preferred.forEach(m => ids.add(m.id));
    partitioned.allowed.forEach(m => ids.add(m.id));
    if (showHidden) partitioned.hidden.forEach(m => ids.add(m.id));
    return ids;
  }, [partitioned, showHidden]);

  // Group by library — when a specific lib is selected, skip the section headers
  const grouped = React.useMemo(() => {
    if (selectedLib !== 'All') {
      return [[libraries.find(l => l.id === selectedLib) || { id: selectedLib, name: selectedLib }, filtered]];
    }
    const byLib = new Map();
    const seen = new Set();
    filtered.forEach(m => {
      (m.libraryIds || ['lib-master']).forEach(lid => {
        if (!byLib.has(lid)) byLib.set(lid, []);
        byLib.get(lid).push(m);
        seen.add(m.id);
      });
    });
    // Preserve library sidebar order
    return libraries
      .filter(l => byLib.has(l.id))
      .map(l => [l, byLib.get(l.id)]);
  }, [filtered, libraries, selectedLib]);

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.5)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--paper)', border: '1px solid var(--ink)',
          width: 'min(860px, 100%)', maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
        }}>
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--ink)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div>
              <Eyebrow>Assign to component</Eyebrow>
              <Serif size={24} style={{ marginTop: 4, display: 'block' }}>{component?.name}</Serif>
            </div>
            <TextButton onClick={onClose}>Close ×</TextButton>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'end', marginTop: 14 }}>
            <SearchField value={query} onChange={setQuery} placeholder="Filter materials…" style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 3, alignItems: 'baseline' }}>
              {cats.map(c => (
                <button key={c} type="button" onClick={() => setCat(c)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px',
                    fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
                    fontWeight: cat === c ? 500 : 400,
                    color: cat === c ? 'var(--ink)' : 'var(--ink-4)',
                    borderBottom: '1px solid ' + (cat === c ? 'var(--ink)' : 'transparent'),
                  }}>{c}</button>
              ))}
            </div>
          </div>
          {libraries.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {['All', ...libraries.map(l => l.id)].map(libId => {
                const lib = libraries.find(l => l.id === libId);
                const active = selectedLib === libId;
                return (
                  <button key={libId} type="button" onClick={() => setSelectedLib(libId)}
                    style={{
                      background: active ? 'var(--ink)' : 'transparent',
                      color: active ? 'var(--paper)' : 'var(--ink-3)',
                      border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule)'),
                      borderRadius: 3, padding: '2px 9px',
                      fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
                      cursor: 'pointer',
                    }}>
                    {libId === 'All' ? 'All libraries' : (lib?.name || libId)}
                  </button>
                );
              })}
            </div>
          )}
          {KIND_GROUPS.length > 0 && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'baseline', marginTop: 10, flexWrap: 'wrap' }}>
              {['All', ...KIND_GROUPS].map(g => {
                const active = kindGroupFilter === g;
                return (
                  <button key={g} type="button" onClick={() => setKindGroupFilter(g)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '3px 7px',
                      fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
                      fontWeight: active ? 500 : 400,
                      color: active ? 'var(--ink)' : 'var(--ink-4)',
                      borderBottom: '1px solid ' + (active ? 'var(--ink)' : 'transparent'),
                    }}>{g === 'All' ? 'All kinds' : g}</button>
                );
              })}
            </div>
          )}
          {contextualFilterActive && typeRule && partitioned.hidden.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
              padding: '6px 10px', background: 'var(--paper-2)',
              border: '1px dashed var(--rule-2)',
            }}>
              <Mono size={10.5} color="var(--ink-3)">
                Showing materials for {typeRule.label} · {partitioned.hidden.length} hidden
              </Mono>
              <button type="button" onClick={() => setShowHidden(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px',
                  fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
                  color: 'var(--ink)', textDecoration: 'underline',
                }}>{showHidden ? 'Hide' : 'Show all'}</button>
            </div>
          )}
        </div>
        <div style={{ overflowY: 'auto', padding: '8px 26px 16px' }}>
          {(() => {
            const renderRow = (m) => (
              <div key={m.id} onClick={() => onSelect(m.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '52px 64px 1fr 1.2fr 120px',
                  gap: 14, alignItems: 'center', padding: '10px 0',
                  borderBottom: '1px solid var(--rule)', cursor: 'pointer',
                  background: m.id === currentId ? 'var(--tint)' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
                onMouseLeave={e => e.currentTarget.style.background = m.id === currentId ? 'var(--tint)' : 'transparent'}
              >
                <Swatch swatch={m.swatch} size="sm" seed={parseInt(m.id.slice(2)) || 1} />
                <Mono size={11} color="var(--ink-4)">{m.code}</Mono>
                <div>
                  <Serif size={14} style={{ display: 'block', lineHeight: 1.15 }}>
                    {window.formatLabel(m, labelTemplates)}
                  </Serif>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{m.finish}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{m.supplier}</span>
                <Mono size={13} color="var(--ink)" style={{ textAlign: 'right' }}>
                  {fmtCurrency(m.unitCost)}<span style={{ color: 'var(--ink-4)' }}> / {m.unit}</span>
                </Mono>
              </div>
            );
            const sectionHeader = (label, count) => (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '14px 0 6px', borderBottom: '1px dotted var(--rule-2)', marginTop: 6,
              }}>
                <Serif size={13} style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>{label}</Serif>
                <Mono size={10} color="var(--ink-4)">{count}</Mono>
              </div>
            );

            if (contextualFilterActive && typeRule) {
              const pre = partitioned.preferred;
              const allow = partitioned.allowed;
              const hid = partitioned.hidden;
              const totalVisible = pre.length + allow.length + (showHidden ? hid.length : 0);
              if (totalVisible === 0 && hid.length === 0) {
                return (
                  <div style={{ padding: '48px 0', textAlign: 'center' }}>
                    <Mono size={12} color="var(--ink-4)">
                      No {typeRule.label.toLowerCase()} materials in this library
                    </Mono>
                    <div style={{ marginTop: 10 }}>
                      <button type="button" onClick={() => setKindGroupFilter('All')}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontFamily: "'Inter Tight', sans-serif", fontSize: 12,
                          color: 'var(--ink)', textDecoration: 'underline', padding: '0 6px',
                        }}>Show all kinds</button>
                    </div>
                  </div>
                );
              }
              return (
                <>
                  {pre.length > 0 && (
                    <>
                      {sectionHeader('Suggested for ' + typeRule.label, pre.length)}
                      {pre.map(renderRow)}
                    </>
                  )}
                  {allow.length > 0 && (
                    <>
                      {sectionHeader(pre.length > 0 ? 'More materials' : 'Materials', allow.length)}
                      {allow.map(renderRow)}
                    </>
                  )}
                  {showHidden && hid.length > 0 && (
                    <>
                      {sectionHeader('Hidden by component type', hid.length)}
                      {hid.map(renderRow)}
                    </>
                  )}
                </>
              );
            }

            // Non-contextual: render by library groups as before
            return (
              <>
                {grouped.map(([lib, items]) => (
                  <React.Fragment key={lib.id}>
                    {libraries.length > 1 && selectedLib === 'All' && sectionHeader(lib.name, items.length)}
                    {items.map(m => (
                      <React.Fragment key={lib.id + ':' + m.id}>{renderRow(m)}</React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <Mono size={12} color="var(--ink-4)">No materials match</Mono>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        <div style={{ padding: '12px 26px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between' }}>
          <TextButton onClick={onClear} accent>Clear selection</TextButton>
          <Mono size={11} color="var(--ink-4)">{renderedIds.size} materials · Esc to close</Mono>
        </div>
      </div>
    </div>
  );
}

// ───────── Library scope row ─────────

function LibraryScopeRow({ libraries, selectedIds, materials, scopedCount, onChange }) {
  const isAll = selectedIds.length === 0;
  function toggle(id) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    onChange(next);
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap',
      padding: '10px 14px', marginBottom: 22,
      background: 'var(--paper-2)',
      border: '1px solid var(--rule-2)',
    }}>
      <Eyebrow>Source libraries</Eyebrow>
      <button type="button" onClick={() => onChange([])}
        style={scopeChip(isAll)}>All libraries</button>
      {libraries.map(lib => {
        const active = selectedIds.includes(lib.id);
        const count = materials.filter(m => (m.libraryIds || []).includes(lib.id)).length;
        return (
          <button key={lib.id} type="button" onClick={() => toggle(lib.id)}
            style={scopeChip(active)}>
            {lib.name} <span style={{ opacity: 0.6, marginLeft: 4 }}>{count}</span>
          </button>
        );
      })}
      <div style={{ marginLeft: 'auto', ...ui.mono, fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {scopedCount} available to this project
      </div>
    </div>
  );
}

function scopeChip(active) {
  return {
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? 'var(--paper)' : 'var(--ink-2)',
    border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
    padding: '4px 10px',
    cursor: 'pointer',
    fontFamily: "'Inter Tight', sans-serif",
    fontSize: 11,
    letterSpacing: '0.04em',
    fontWeight: active ? 500 : 400,
  };
}

// ───────── Schedule persistence helpers (Phase 4: cloud-backed) ─────────
// transformSchedule applies per-component migration (legacy → current shape).
// Run via the useProjectSchedule hook on whatever data loads — cloud row,
// localStorage-migrated row, seed fallback, or blank fallback.
function transformSchedule(sched) {
  if (!sched) return null;
  return {
    title: sched.title || 'Materials Cost Schedule',
    ...sched,
    components: Array.isArray(sched.components) && window.migrateComponent
      ? sched.components.map(window.migrateComponent)
      : sched.components,
  };
}

// buildScheduleFallback returns the seed-or-blank schedule for a project when
// neither cloud nor localStorage has data. Phase 5 ships an explicit "seed
// workspace" button — until then we keep the legacy auto-seed from
// window.SEED_SCHEDULES so existing projects don't get blank schedules.
function buildScheduleFallback(project) {
  if (!project) return null;
  const seeded = window.SEED_SCHEDULES && window.SEED_SCHEDULES[project.id];
  if (seeded && seeded.options && seeded.components && seeded.cells) {
    return { title: seeded.title || 'Materials Cost Schedule', ...seeded };
  }
  if (project.id === 'p-brunswick') return brunswickSeed();
  return {
    title: 'Materials Cost Schedule',
    options: [{ id: 'o-1', name: 'Option 1' }],
    components: [],
    cells: {},
  };
}

function ScheduleSkeleton() {
  return (
    <div style={{ padding: '80px 0', textAlign: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 11,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      color: 'var(--ink-3)' }}>
      Loading schedule…
    </div>
  );
}

function ScheduleErrorState() {
  return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--ink-3)', marginBottom: 12 }}>
        Couldn't load schedule
      </div>
      <button onClick={() => location.reload()} style={{
        padding: '8px 16px', fontSize: 13, fontFamily: 'var(--font-sans)',
        background: 'var(--accent)', color: '#fff',
        border: 'none', borderRadius: 2, cursor: 'pointer',
      }}>Reload</button>
    </div>
  );
}

function brunswickSeed() {
  return {
    title: 'Materials Cost Schedule',
    options: [
      { id: 'o-mel', name: 'Melamine-faced MDF' },
      { id: 'o-ven', name: 'Veneer-faced MDF' },
      { id: 'o-ced', name: 'Cedar Castellation' },
      { id: 'o-vj',  name: 'Painted VJ MDF' },
    ],
    components: [
      { id: 'k-01', name: 'Base Fronts',        qty: '4.2', unit: 'm²',  category: 'Kitchen joinery' },
      { id: 'k-02', name: 'Base Top',           qty: '2.8', unit: 'm²',  category: 'Kitchen joinery' },
      { id: 'k-03', name: 'Top Sliding Panels', qty: '3.6', unit: 'm²',  category: 'Kitchen joinery' },
      { id: 'k-04', name: 'Cover Strips',       qty: '6.4', unit: 'l/m', category: 'Kitchen joinery' },
      { id: 'l-01', name: 'Top Sides',          qty: '1.9', unit: 'm²',  category: 'Living joinery' },
      { id: 'l-02', name: 'Top Shelves',        qty: '2.4', unit: 'm²',  category: 'Living joinery' },
      { id: 'l-03', name: 'Top Rear Panel',     qty: '3.1', unit: 'm²',  category: 'Living joinery' },
    ],
    cells: {
      'o-mel:k-01': { materialId: 'm-020' }, 'o-mel:k-02': { materialId: 'm-020' },
      'o-mel:k-03': { materialId: 'm-020' }, 'o-mel:k-04': { materialId: 'm-032' },
      'o-mel:l-01': { materialId: 'm-020' }, 'o-mel:l-02': { materialId: 'm-020' },
      'o-mel:l-03': { materialId: 'm-020' },
      'o-ven:k-01': { materialId: 'm-021' }, 'o-ven:k-02': { materialId: 'm-020' },
      'o-ven:k-03': { materialId: 'm-021' },
      'o-ven:l-01': { materialId: 'm-020' }, 'o-ven:l-02': { materialId: 'm-021' },
      'o-ced:k-01': { materialId: 'm-003' }, 'o-ced:k-03': { materialId: 'm-003' },
      'o-ced:l-01': { materialId: 'm-003' },
      'o-vj:k-01':  { materialId: 'm-022' }, 'o-vj:k-03':  { materialId: 'm-022' },
      'o-vj:l-01':  { materialId: 'm-022' }, 'o-vj:l-03':  { materialId: 'm-022' },
    },
  };
}

Object.assign(window, { CostSchedule, MaterialPicker, LibraryScopeRow, ScheduleCell, brunswickSeed });
