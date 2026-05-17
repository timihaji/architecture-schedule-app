// mobile-pages.jsx — Projects, Cost Schedule, Schedule, Settings.
// Port of proto-pages.jsx, swapped to read/write via useApp() (adapter).

(function () {
  const { useState, useMemo, useEffect } = React;
  const useApp = () => window.useApp();
  function P() {
    return {
      Mono: window.MB_Mono, Eyebrow: window.MB_Eyebrow,
      SwatchBox: window.MB_SwatchBox, Checkbox: window.MB_Checkbox,
      StageBar: window.MB_StageBar,
      SheetBg: window.MB_SheetBg, FullDrawer: window.MB_FullDrawer,
      ConfirmSheet: window.MB_ConfirmSheet, SegBtn: window.MB_SegBtn,
      Field: window.MB_Field, TopNav: window.MB_TopNav,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // PROJECTS
  // ════════════════════════════════════════════════════════════════

  function ProjectEditor({ project, onSave, onClose, isNew }) {
    const { Eyebrow, FullDrawer, Field } = P();
    const [d, setD] = useState({ ...project });
    const set = (k, v) => setD(p => ({ ...p, [k]: v }));
    const stages = ['Concept', 'Documentation', 'Construction', 'Handover'];
    return (
      <FullDrawer onClose={onClose}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ink)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Eyebrow>{isNew ? 'New project' : 'Edit project'}</Eyebrow>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--ink-4)', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, lineHeight: 1.15, marginTop: 4, color: 'var(--ink)' }}>
            {d.name || <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>Untitled project</span>}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', WebkitOverflowScrolling: 'touch' }}>
          <Field label="Project name" value={d.name} onChange={v => set('name', v)} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Code" value={d.code} onChange={v => set('code', v)} mono />
            <Field label="Budget" value={d.budget} onChange={v => set('budget', v)} placeholder="$980,000" />
          </div>
          <Field label="Client" value={d.client} onChange={v => set('client', v)} />
          <Field label="Address" value={d.address} onChange={v => set('address', v)} />
          <div style={{ marginBottom: 12 }}>
            <Eyebrow style={{ marginBottom: 8 }}>Stage</Eyebrow>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {stages.map(s => (
                <button key={s} onClick={() => set('stage', s)} style={{ padding: '6px 12px', border: '1px solid var(--rule-2)', background: d.stage === s ? 'var(--ink)' : 'transparent', color: d.stage === s ? 'var(--paper)' : 'var(--ink-3)', fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer', minHeight: 36 }}>{s}</button>
              ))}
            </div>
          </div>
          <Field label="Description" value={d.description} onChange={v => set('description', v)} multiline />
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--rule)', display: 'flex', gap: 8, flexShrink: 0, paddingBottom: 'calc(12px + env(safe-area-inset-bottom,0px))' }}>
          <button onClick={onClose} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid var(--rule-2)', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 44 }}>Cancel</button>
          <button onClick={() => { if (!d.name || !d.name.trim()) return; onSave(d); }} style={{ flex: 1, background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '9px 18px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, minHeight: 44 }}>
            {isNew ? 'Create project' : 'Save changes'}
          </button>
        </div>
      </FullDrawer>
    );
  }

  function ProjectsPage() {
    const { Mono, Eyebrow, StageBar, ConfirmSheet, TopNav } = P();
    const { projects, addProject, saveProject, deleteProject, duplicateProject, ui, setUi, toast } = useApp();
    const editMode = ui.editMode;
    const [editing, setEditing] = useState(null);
    const [isNew, setIsNew] = useState(false);
    const [confirmId, setConfirmId] = useState(null);

    function handleAdd() { setIsNew(true); setEditing({ id: '', code: '', name: '', client: '', address: '', stage: 'Concept', budget: '', description: '' }); }
    function handleSave(p) {
      if (isNew) { addProject(p); toast('Project created', { kind: 'success' }); }
      else { saveProject(p); toast('Project saved'); }
      setEditing(null); setIsNew(false);
    }
    function handleDelete(id) {
      const p = projects.find(x => x.id === id);
      deleteProject(id);
      setConfirmId(null);
      toast('Deleted "' + (p?.name || 'project') + '"', { kind: 'danger' });
    }
    function handleDuplicate(id) {
      duplicateProject(id);
      toast('Project duplicated');
    }

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', overflow: 'hidden' }}>
        <TopNav />
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
          <Eyebrow style={{ marginBottom: 4 }}>Projects</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 'clamp(24px, 6vw, 34px)', letterSpacing: '-0.015em' }}>Projects</div>
            <Mono size={9.5} color="var(--ink-4)" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>{projects.length} ON BOARD</Mono>
          </div>
          {editMode && <button onClick={handleAdd} style={{ width: '100%', background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginTop: 12, minHeight: 44 }}>＋ New project</button>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 60 }}>
          {projects.length === 0 && (
            <div style={{ padding: '48px 16px', textAlign: 'center' }}>
              <Mono size={11} color="var(--ink-4)" style={{ display: 'block', marginBottom: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>No projects yet</Mono>
              {editMode && <button onClick={handleAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--accent)', textDecoration: 'underline' }}>＋ Create the first project</button>}
            </div>
          )}
          {projects.map(p => (
            <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', background: 'var(--paper)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <Mono size={9.5} color="var(--ink-4)" style={{ letterSpacing: '0.06em' }}>{p.code}</Mono>
                <Mono size={11} color="var(--ink)">{p.budget}</Mono>
              </div>
              <button onClick={() => setUi({ activeProjectId: p.id, view: 'mobile-cost' })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%', display: 'block' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, lineHeight: 1.15, color: 'var(--ink)' }}>{p.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{p.client}{p.address && ' · ' + p.address}</div>
              </button>
              <div style={{ marginTop: 10 }}><StageBar stage={p.stage} /></div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {editMode && <button onClick={() => { setEditing(p); setIsNew(false); }} style={{ background: 'none', border: '1px solid var(--rule-2)', padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', minHeight: 36 }}>Edit</button>}
                {editMode && <button onClick={() => handleDuplicate(p.id)} style={{ background: 'none', border: '1px solid var(--rule-2)', padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', minHeight: 36 }}>Duplicate</button>}
                <button onClick={() => setUi({ activeProjectId: p.id, view: 'mobile-cost' })} style={{ background: 'none', border: '1px solid var(--rule-2)', padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', minHeight: 36 }}>Cost →</button>
                <button onClick={() => setUi({ activeProjectId: p.id, view: 'mobile-schedule' })} style={{ background: 'none', border: '1px solid var(--rule-2)', padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', minHeight: 36 }}>Schedule →</button>
                {editMode && <button onClick={() => setConfirmId(p.id)} style={{ background: 'none', border: '1px solid rgba(160,69,69,0.3)', padding: '5px 10px', cursor: 'pointer', color: '#a04545', fontSize: 14, minHeight: 36 }}>×</button>}
              </div>
            </div>
          ))}
        </div>
        {editing && <ProjectEditor project={editing} onSave={handleSave} onClose={() => { setEditing(null); setIsNew(false); }} isNew={isNew} />}
        {confirmId && <ConfirmSheet message="Delete this project? Its cost schedule will also be removed." onConfirm={() => handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // COST SCHEDULE
  // ════════════════════════════════════════════════════════════════

  function MaterialPicker({ onPick, onClose }) {
    const { Mono, Eyebrow, SheetBg, SwatchBox } = P();
    const { materials } = useApp();
    const [q, setQ] = useState('');
    const list = materials.filter(m => !q || [m.name, m.code, m.supplier].some(v => v && String(v).toLowerCase().includes(q.toLowerCase())));
    return (
      <SheetBg onClose={onClose}>
        <div style={{ padding: '12px 16px 24px' }}>
          <div style={{ width: 32, height: 3, background: 'var(--rule-2)', borderRadius: 2, margin: '4px auto 12px' }} />
          <Eyebrow style={{ marginBottom: 10 }}>Select material</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--rule-2)', padding: '7px 10px', marginBottom: 10 }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" style={{ color: 'var(--ink-4)', flexShrink: 0 }}><circle cx={10.5} cy={10.5} r={6} stroke="currentColor" strokeWidth={1.6} /><line x1={15} y1={15} x2={20} y2={20} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" /></svg>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search library…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)' }} />
          </div>
          <div style={{ maxHeight: '52vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {list.map(m => (
              <button key={m.id} onClick={() => onPick(m)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px dotted var(--rule-2)', padding: '10px 0', cursor: 'pointer', minHeight: 44 }}>
                <SwatchBox tone={m.tone} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                  <Mono size={9.5} color="var(--ink-4)">{m.code} · {m.supplier}</Mono>
                </div>
                <Mono size={10} color="var(--ink-3)" style={{ flexShrink: 0 }}>{m.unitCost ? '$' + m.unitCost + '/' + m.unit : '—'}</Mono>
              </button>
            ))}
            {list.length === 0 && <p style={{ padding: '20px 0', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-4)' }}>No materials found</p>}
          </div>
        </div>
      </SheetBg>
    );
  }

  function AddRowSheet({ projectId, onClose }) {
    const { Mono, Eyebrow, SheetBg, SwatchBox, Field } = P();
    const { addScheduleRow, toast } = useApp();
    const [mat, setMat] = useState(null);
    const [qty, setQty] = useState('');
    const [element, setEl] = useState('');
    const [code, setCode] = useState('');
    const [pickerOpen, setPO] = useState(false);
    const total = mat && qty ? (parseFloat(qty) || 0) * (mat.unitCost || 0) : 0;

    function handleAdd() {
      if (!mat) return;
      addScheduleRow(projectId, { code, element, materialId: mat.id, qty: parseFloat(qty) || 0 });
      toast('Row added', { kind: 'success' });
      onClose();
    }
    return (
      <SheetBg onClose={onClose}>
        <div style={{ padding: '12px 16px 24px' }}>
          <div style={{ width: 32, height: 3, background: 'var(--rule-2)', borderRadius: 2, margin: '4px auto 14px' }} />
          <Eyebrow style={{ marginBottom: 16 }}>Add schedule row</Eyebrow>
          <div style={{ marginBottom: 12 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Material</Eyebrow>
            <button onClick={() => setPO(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: '1px solid var(--rule-2)', padding: '9px 10px', cursor: 'pointer', textAlign: 'left', minHeight: 48 }}>
              {mat ? (
                <React.Fragment>
                  <SwatchBox tone={mat.tone} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mat.name}</div>
                    <Mono size={9.5} color="var(--ink-4)">{mat.code} · ${mat.unitCost}/{mat.unit}</Mono>
                  </div>
                </React.Fragment>
              ) : <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-4)', flex: 1 }}>Select from library…</span>}
              <span style={{ color: 'var(--ink-4)', fontSize: 14, flexShrink: 0 }}>›</span>
            </button>
          </div>
          <Field label="Element / description" value={element} onChange={setEl} placeholder="e.g. Living room floor" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Code" value={code} onChange={setCode} mono placeholder="FS-01" />
            <Field label="Quantity" value={qty} onChange={setQty} type="number" />
          </div>
          {total > 0 && (
            <div style={{ padding: '9px 12px', background: 'var(--tint)', border: '1px solid var(--rule)', marginBottom: 12 }}>
              <Mono size={11} color="var(--ink-2)">Estimated total: <strong>${total.toLocaleString()}</strong></Mono>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: '11px 16px', background: 'transparent', border: '1px solid var(--rule-2)', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', color: 'var(--ink-3)', minHeight: 44 }}>Cancel</button>
            <button onClick={handleAdd} disabled={!mat} style={{ flex: 1, background: mat ? 'var(--ink)' : 'var(--ink-4)', color: 'var(--paper)', border: 'none', padding: '11px', cursor: mat ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, minHeight: 44 }}>Add row</button>
          </div>
        </div>
        {pickerOpen && <MaterialPicker onPick={m => { setMat(m); setPO(false); }} onClose={() => setPO(false)} />}
      </SheetBg>
    );
  }

  function CostPage() {
    const { Mono, Eyebrow, Checkbox, ConfirmSheet, TopNav } = P();
    const { materials, projects, schedules, updateScheduleRow, deleteScheduleRow, duplicateScheduleRow, bulkDeleteScheduleRows, ui, setUi, toast } = useApp();
    const editMode = ui.editMode;
    const [addOpen, setAddOpen] = useState(false);
    const [editQty, setEditQty] = useState(null);
    const [qtyVal, setQtyVal] = useState('');
    const [selectMode, setSelectMode] = useState(false);
    const [sel, setSel] = useState(new Set());
    const [confirmBulk, setConfirmBulk] = useState(false);
    const [rowMenu, setRowMenu] = useState(null);

    const project = useMemo(() =>
      (ui.activeProjectId ? projects.find(p => p.id === ui.activeProjectId) : null) || projects[0]
    , [projects, ui.activeProjectId]);

    // Ensure the schedule hook is keyed on this project. The adapter only
    // exposes rows for the active project; if no project is active, set one.
    useEffect(() => {
      if (project && !ui.activeProjectId) setUi({ activeProjectId: project.id });
    }, [project, ui.activeProjectId]);

    const rows = project ? ((schedules[project.id] || {}).rows || []) : [];
    const grand = rows.reduce((s, r) => { const m = materials.find(x => x.id === r.materialId); return s + (r.qty || 0) * (m?.unitCost || 0); }, 0);

    function toggleSel(id) { setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
    function exitSelect() { setSelectMode(false); setSel(new Set()); }
    function selectAll() { if (sel.size === rows.length && rows.length > 0) setSel(new Set()); else setSel(new Set(rows.map(r => r.id))); }
    function handleBulkDelete() { const n = sel.size; bulkDeleteScheduleRows(project.id, [...sel]); setConfirmBulk(false); exitSelect(); toast(n + ' row' + (n === 1 ? '' : 's') + ' deleted', { kind: 'danger' }); }
    function handleDeleteRow(rid) { deleteScheduleRow(project.id, rid); setRowMenu(null); toast('Row deleted', { kind: 'danger' }); }
    function handleDuplicateRow(rid) { duplicateScheduleRow(project.id, rid); setRowMenu(null); toast('Row duplicated'); }

    useEffect(() => { if (!editMode) { exitSelect(); setAddOpen(false); setEditQty(null); setRowMenu(null); } }, [editMode]);

    if (!project) return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
        <TopNav />
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <Mono size={11} color="var(--ink-4)" style={{ display: 'block', marginBottom: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>No project selected</Mono>
          <button onClick={() => setUi({ view: 'mobile-projects' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--accent)', textDecoration: 'underline' }}>Go to Projects →</button>
        </div>
      </div>
    );

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', overflow: 'hidden', position: 'relative' }}>
        <TopNav />
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
          <Eyebrow style={{ marginBottom: 4 }}>Cost Schedule</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 'clamp(18px, 5vw, 26px)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>{project.name}</div>
            <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.06em', flexShrink: 0 }}>{project.code}</Mono>
          </div>
          {projects.length > 1 && (
            <div style={{ display: 'flex', gap: 0, marginTop: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexWrap: 'nowrap' }}>
              {projects.map(p => (
                <button key={p.id} onClick={() => setUi({ activeProjectId: p.id })} style={{ background: 'none', border: 'none', borderBottom: project.id === p.id ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -1, padding: '6px 10px', fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: project.id === p.id ? 'var(--ink)' : 'var(--ink-4)', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: project.id === p.id ? 600 : 400 }}>{p.code || p.name}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)', flexShrink: 0 }}>
          <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 }}>{rows.length} ROW{rows.length === 1 ? '' : 'S'}</Mono>
          {editMode && !selectMode && rows.length > 0 && (
            <button onClick={() => setSelectMode(true)} style={{ background: 'transparent', color: 'var(--ink-3)', border: '1px solid var(--rule-2)', padding: '6px 10px', fontFamily: 'var(--font-sans)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 34 }}>Select</button>
          )}
          {editMode && selectMode && (
            <button onClick={exitSelect} style={{ background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)', padding: '6px 10px', fontFamily: 'var(--font-sans)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 34 }}>Done</button>
          )}
          {editMode && !selectMode && <button onClick={() => setAddOpen(true)} style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '6px 12px', fontFamily: 'var(--font-sans)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 500, minHeight: 34 }}>＋ Add row</button>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: selectMode ? 110 : (rows.length > 0 ? 104 : 60) }} onClick={() => setRowMenu(null)}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ink)', background: 'var(--paper-2)' }}>
                  {selectMode && <th style={{ padding: '7px 6px 7px 12px', textAlign: 'left' }}>
                    <button onClick={selectAll} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <Checkbox checked={sel.size === rows.length && rows.length > 0} size={16} />
                    </button>
                  </th>}
                  {['Code', 'Element', 'Material', 'Qty', 'Unit', 'Total', ''].map((h, i) => (
                    <th key={i} style={{ padding: '7px 10px', fontFamily: 'var(--font-sans)', fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', textAlign: i >= 3 && i < 6 ? 'right' : 'left', whiteSpace: 'nowrap', fontWeight: 500, paddingRight: i === 6 ? '8px' : '10px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const mat = materials.find(m => m.id === row.materialId);
                  const tot = (row.qty || 0) * (mat?.unitCost || 0);
                  const isSel = sel.has(row.id);
                  return (
                    <tr key={row.id}
                      onClick={() => { if (selectMode) toggleSel(row.id); }}
                      style={{ borderBottom: '1px solid var(--rule)', background: selectMode && isSel ? 'var(--tint-2)' : (idx % 2 === 0 ? 'var(--paper)' : 'var(--tint)'), cursor: selectMode ? 'pointer' : 'default' }}>
                      {selectMode && <td style={{ padding: '9px 6px 9px 12px' }}>
                        <Checkbox checked={isSel} size={16} />
                      </td>}
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{row.code || '—'}</td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.element || '—'}</td>
                      <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', maxWidth: 140 }}>
                        {mat ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 14, height: 14, background: mat.tone, flexShrink: 0, outline: '1px solid rgba(20,20,20,0.1)' }} />
                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{mat.name}</span>
                          </div>
                        ) : <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {editQty === row.id && !selectMode && editMode ? (
                          <input autoFocus value={qtyVal} onChange={e => setQtyVal(e.target.value)}
                            onBlur={() => { updateScheduleRow(project.id, { ...row, qty: parseFloat(qtyVal) || 0 }); setEditQty(null); }}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.target.blur(); }}
                            style={{ width: 56, background: 'transparent', border: 'none', borderBottom: '1px solid var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink)', outline: 'none', textAlign: 'right', padding: '1px 0' }} />
                        ) : (
                          <span onClick={e => { if (selectMode || !editMode) return; e.stopPropagation(); setEditQty(row.id); setQtyVal(String(row.qty || 0)); }} style={{ cursor: editMode && !selectMode ? 'text' : 'default', textDecoration: editMode && !selectMode ? 'underline dotted' : 'none', textDecorationColor: 'var(--rule-2)' }} title={editMode ? 'Tap to edit' : ''}>{row.qty}</span>
                        )}
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{mat?.unit || '—'}</td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink)', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 500 }}>{tot > 0 ? '$' + tot.toLocaleString() : '—'}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', position: 'relative' }}>
                        {!selectMode && editMode && (
                          <button onClick={e => { e.stopPropagation(); setRowMenu(rowMenu === row.id ? null : row.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-4)', padding: '4px', minHeight: 36, minWidth: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>⋯</button>
                        )}
                        {rowMenu === row.id && !selectMode && editMode && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--paper)', border: '1px solid var(--ink)', zIndex: 80, minWidth: 140, boxShadow: '0 8px 24px rgba(20,20,20,0.14)', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleDuplicateRow(row.id)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '12px 14px', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer', color: 'var(--ink)', borderBottom: '1px solid var(--rule)' }}>Duplicate</button>
                            <button onClick={() => handleDeleteRow(row.id)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '12px 14px', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer', color: '#a04545' }}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={selectMode ? 8 : 7} style={{ padding: '32px 16px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--ink-4)' }}>{editMode ? 'No rows yet — tap Add row to begin.' : 'No rows yet. Tap Edit in the top bar to add.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {rows.length > 0 && !selectMode && (
          <div style={{ position: 'absolute', bottom: 56, left: 0, right: 0, background: 'var(--paper)', borderTop: '1px solid var(--ink)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 140, paddingBottom: 'calc(10px + env(safe-area-inset-bottom,0px))', boxShadow: '0 -2px 8px rgba(20,20,20,0.04)' }}>
            <Mono size={9} color="var(--ink-4)" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>Total estimated</Mono>
            <Mono size={16} color="var(--ink)" style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>${grand.toLocaleString()}</Mono>
          </div>
        )}
        {selectMode && (
          <div style={{ position: 'absolute', bottom: 56, left: 0, right: 0, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'stretch', zIndex: 150, boxShadow: '0 -8px 24px rgba(20,20,20,0.18)', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
            <button onClick={selectAll} style={{ background: 'transparent', color: 'var(--paper)', border: 'none', borderRight: '1px solid rgba(255,255,255,0.12)', padding: '10px 12px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', minHeight: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Mono size={11} color="var(--paper)" style={{ fontWeight: 600 }}>{sel.size}</Mono>
              <span style={{ fontSize: 8, opacity: 0.7, letterSpacing: '0.08em' }}>{sel.size === rows.length && rows.length > 0 ? 'NONE' : 'ALL'}</span>
            </button>
            <button onClick={() => setConfirmBulk(true)} disabled={!sel.size} style={{ flex: 1, background: 'transparent', color: sel.size ? '#ff9a9a' : 'rgba(255,154,154,0.4)', border: 'none', borderRight: '1px solid rgba(255,255,255,0.12)', padding: '10px 4px', cursor: sel.size ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', minHeight: 48 }}>Delete</button>
            <button onClick={exitSelect} style={{ flex: 1, background: 'transparent', color: 'var(--paper)', border: 'none', padding: '10px 4px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', minHeight: 48 }}>Cancel</button>
          </div>
        )}
        {confirmBulk && <ConfirmSheet message={'Delete ' + sel.size + ' schedule row' + (sel.size === 1 ? '' : 's') + '? This cannot be undone.'} onConfirm={handleBulkDelete} onCancel={() => setConfirmBulk(false)} />}
        {addOpen && <AddRowSheet projectId={project.id} onClose={() => setAddOpen(false)} />}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // SCHEDULE
  // ════════════════════════════════════════════════════════════════

  function ScheduleRowSheet({ projectId, row, onClose }) {
    const { Mono, Eyebrow, SheetBg, SwatchBox, Field } = P();
    const { materials, addScheduleRow, updateScheduleRow, toast } = useApp();
    const isEdit = !!row;
    const initial = row || { code: '', element: '', materialId: '', qty: '', note: '' };
    const [mat, setMat] = useState(isEdit ? materials.find(m => m.id === row.materialId) : null);
    const [qty, setQty] = useState(String(initial.qty == null ? '' : initial.qty));
    const [element, setEl] = useState(initial.element || '');
    const [code, setCode] = useState(initial.code || '');
    const [note, setNote] = useState(initial.note || '');
    const [pickerOpen, setPO] = useState(false);

    const total = mat && qty ? (parseFloat(qty) || 0) * (mat.unitCost || 0) : 0;

    function handleSave() {
      if (!mat) return;
      const payload = { code, element, materialId: mat.id, qty: parseFloat(qty) || 0, note };
      if (isEdit) { updateScheduleRow(projectId, { ...row, ...payload }); toast('Item saved'); }
      else { addScheduleRow(projectId, payload); toast('Item added', { kind: 'success' }); }
      onClose();
    }

    return (
      <SheetBg onClose={onClose}>
        <div style={{ padding: '12px 16px 24px' }}>
          <div style={{ width: 32, height: 3, background: 'var(--rule-2)', borderRadius: 2, margin: '4px auto 14px' }} />
          <Eyebrow style={{ marginBottom: 16 }}>{isEdit ? 'Edit schedule item' : 'New schedule item'}</Eyebrow>
          <div style={{ marginBottom: 12 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Specification</Eyebrow>
            <button onClick={() => setPO(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: '1px solid var(--rule-2)', padding: '9px 10px', cursor: 'pointer', textAlign: 'left', minHeight: 48 }}>
              {mat ? (
                <React.Fragment>
                  <SwatchBox tone={mat.tone} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mat.name}</div>
                    <Mono size={9.5} color="var(--ink-4)">{mat.code} · {mat.supplier}</Mono>
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>Change</span>
                </React.Fragment>
              ) : <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-4)', flex: 1 }}>Select from library…</span>}
              <span style={{ color: 'var(--ink-4)', fontSize: 14, flexShrink: 0 }}>›</span>
            </button>
          </div>
          <Field label="Element / location" value={element} onChange={setEl} placeholder="e.g. Living room floor" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Schedule code" value={code} onChange={setCode} mono placeholder="FS-01" />
            <Field label={'Quantity' + (mat?.unit ? ' (' + mat.unit + ')' : '')} value={qty} onChange={setQty} type="number" />
          </div>
          <Field label="Specification note" value={note} onChange={setNote} multiline placeholder="Setting, joint, exposure, fixings…" />
          {total > 0 && (
            <div style={{ padding: '9px 12px', background: 'var(--tint)', border: '1px solid var(--rule)', marginBottom: 12 }}>
              <Mono size={11} color="var(--ink-2)">Estimated cost: <strong>${total.toLocaleString()}</strong></Mono>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: '11px 16px', background: 'transparent', border: '1px solid var(--rule-2)', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', color: 'var(--ink-3)', minHeight: 44 }}>Cancel</button>
            <button onClick={handleSave} disabled={!mat} style={{ flex: 1, background: mat ? 'var(--ink)' : 'var(--ink-4)', color: 'var(--paper)', border: 'none', padding: '11px', cursor: mat ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, minHeight: 44 }}>
              {isEdit ? 'Save changes' : 'Add item'}
            </button>
          </div>
        </div>
        {pickerOpen && <MaterialPicker onPick={m => { setMat(m); setPO(false); }} onClose={() => setPO(false)} />}
      </SheetBg>
    );
  }

  function ScheduleRowActions({ row, projectId, onEdit, onClose }) {
    const { Eyebrow, SheetBg, ConfirmSheet } = P();
    const { duplicateScheduleRow, deleteScheduleRow, toast } = useApp();
    const [confirm, setConfirm] = useState(false);
    if (confirm) {
      return <ConfirmSheet message="Delete this schedule item? This cannot be undone."
        onConfirm={() => { deleteScheduleRow(projectId, row.id); toast('Item deleted', { kind: 'danger' }); onClose(); }}
        onCancel={() => setConfirm(false)} />;
    }
    return (
      <SheetBg onClose={onClose}>
        <div style={{ padding: '12px 0 20px' }}>
          <div style={{ width: 32, height: 3, background: 'var(--rule-2)', borderRadius: 2, margin: '4px auto 12px' }} />
          <Eyebrow style={{ padding: '0 16px', marginBottom: 10 }}>Schedule item · {row.code || '—'}</Eyebrow>
          <button onClick={() => { onEdit(); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 18px', fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer', color: 'var(--ink)', borderTop: '1px solid var(--rule)', minHeight: 50 }}>Edit details</button>
          <button onClick={() => { duplicateScheduleRow(projectId, row.id); toast('Item duplicated'); onClose(); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 18px', fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer', color: 'var(--ink)', borderTop: '1px solid var(--rule)', minHeight: 50 }}>Duplicate</button>
          <button onClick={() => setConfirm(true)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 18px', fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer', color: '#a04545', borderTop: '1px solid var(--rule)', minHeight: 50 }}>Delete item</button>
        </div>
      </SheetBg>
    );
  }

  function DetailGrid({ row, mat }) {
    const rows = [
      { k: 'Supplier', v: mat?.supplier },
      { k: 'Finish', v: mat?.finish },
      { k: 'Lead time', v: mat?.leadTime },
      { k: 'Product code', v: mat?.code, mono: true },
      { k: 'Unit cost', v: mat?.unitCost ? '$' + mat.unitCost + '/' + mat.unit : null, mono: true },
    ].filter(r => r.v);
    if (rows.length === 0) return null;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', rowGap: 5, columnGap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px dotted var(--rule-2)' }}>
        {rows.map(r => (
          <React.Fragment key={r.k}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', paddingTop: 1 }}>{r.k}</div>
            <div style={{ fontFamily: r.mono ? 'var(--font-mono)' : 'var(--font-serif)', fontSize: r.mono ? 11 : 13, color: 'var(--ink-2)', lineHeight: 1.35 }}>{r.v}</div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  function ScheduleRowCard({ card, detailed, onTap }) {
    const { Mono, SwatchBox } = P();
    const { row, mat } = card;
    const swatchSize = detailed ? 44 : 32;
    const interactive = !!onTap;
    return (
      <button onClick={onTap || undefined} disabled={!interactive}
        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: detailed ? '14px 16px' : '12px 16px', borderBottom: '1px solid var(--rule)', cursor: interactive ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: detailed ? 'flex-start' : 'flex-start', gap: 12 }}>
          <SwatchBox tone={mat?.tone} size={swatchSize} style={{ marginTop: detailed ? 2 : 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
              <div className={detailed ? '' : 'mb-clamp-2'} style={{ fontFamily: 'var(--font-serif)', fontSize: detailed ? 16 : 14.5, color: 'var(--ink)', lineHeight: 1.22, minWidth: 0, wordBreak: 'break-word' }}>
                {mat?.name || <span style={{ fontStyle: 'italic', color: 'var(--ink-4)' }}>Unspecified</span>}
              </div>
              {!detailed && <Mono size={10.5} color="var(--ink)" style={{ flexShrink: 0, paddingTop: 2 }}>{row.qty} {mat?.unit || ''}</Mono>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between', marginTop: 3 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, fontStyle: row.element ? 'normal' : 'italic' }}>{row.element || 'No location'}</div>
              <Mono size={9.5} color="var(--ink-4)" style={{ flexShrink: 0, letterSpacing: '0.06em' }}>{row.code || '—'}</Mono>
            </div>
            {detailed && (
              <React.Fragment>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                  <Mono size={11} color="var(--ink)"><strong style={{ fontWeight: 500 }}>{row.qty || 0}</strong> {mat?.unit || ''}</Mono>
                  {mat?.category && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>{mat.category}</span>}
                </div>
                <DetailGrid row={row} mat={mat} />
                {row.note && (
                  <div style={{ marginTop: 10, paddingLeft: 10, borderLeft: '2px solid var(--accent)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>{row.note}</div>
                )}
              </React.Fragment>
            )}
          </div>
          {!detailed && interactive && <span style={{ color: 'var(--ink-4)', fontSize: 18, lineHeight: 1, flexShrink: 0, marginLeft: 2, alignSelf: 'center' }}>›</span>}
        </div>
      </button>
    );
  }

  const GROUP_OPTS = [
    { key: 'element', label: 'Element' },
    { key: 'category', label: 'Category' },
    { key: 'code', label: 'Code' },
    { key: 'none', label: 'None' },
  ];

  function SchedulePage() {
    const { Mono, Eyebrow, TopNav } = P();
    const { materials, projects, schedules, ui, setUi } = useApp();
    const editMode = ui.editMode;
    const [groupBy, setGroupBy] = useState(() => { try { return localStorage.getItem('aml-mb-sched-group') || 'category'; } catch { return 'category'; } });
    const [detailed, setDetailed] = useState(() => { try { return localStorage.getItem('aml-mb-sched-detail') === '1'; } catch { return false; } });
    const [sheet, setSheet] = useState(null);

    useEffect(() => { try { localStorage.setItem('aml-mb-sched-group', groupBy); } catch {} }, [groupBy]);
    useEffect(() => { try { localStorage.setItem('aml-mb-sched-detail', detailed ? '1' : '0'); } catch {} }, [detailed]);

    const project = (ui.activeProjectId ? projects.find(p => p.id === ui.activeProjectId) : null) || projects[0];

    useEffect(() => {
      if (project && !ui.activeProjectId) setUi({ activeProjectId: project.id });
    }, [project, ui.activeProjectId]);

    const rows = project ? ((schedules[project.id] || {}).rows || []) : [];
    const cards = useMemo(() => rows.map(row => ({ row, mat: materials.find(m => m.id === row.materialId) })), [rows, materials]);

    const groups = useMemo(() => {
      if (groupBy === 'none') return [{ key: 'all', title: 'All items', cards }];
      const buckets = new Map();
      cards.forEach(c => {
        let key, title;
        if (groupBy === 'category') {
          key = c.mat?.category || 'unspecified';
          title = key === 'unspecified' ? 'Unspecified' : key.charAt(0).toUpperCase() + key.slice(1);
        } else if (groupBy === 'code') {
          const pre = (c.row.code || '').split('-')[0].trim();
          key = pre || '—';
          title = pre || 'No code';
        } else {
          key = (c.row.element || '').trim() || '—';
          title = key === '—' ? 'No location' : key;
        }
        if (!buckets.has(key)) buckets.set(key, { key, title, cards: [] });
        buckets.get(key).cards.push(c);
      });
      return [...buckets.values()].sort((a, b) => a.title.localeCompare(b.title));
    }, [cards, groupBy]);

    if (!project) return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
        <TopNav />
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <Mono size={11} color="var(--ink-4)" style={{ display: 'block', marginBottom: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>No project selected</Mono>
          <button onClick={() => setUi({ view: 'mobile-projects' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--accent)', textDecoration: 'underline' }}>Go to Projects →</button>
        </div>
      </div>
    );

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', overflow: 'hidden', position: 'relative' }}>
        <TopNav />
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
          <Eyebrow style={{ marginBottom: 4 }}>Schedule · Specification</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 'clamp(18px, 5vw, 26px)', letterSpacing: '-0.01em', lineHeight: 1.1, minWidth: 0, flex: 1 }}>{project.name}</div>
            <button onClick={() => setUi({ view: 'mobile-cost' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', flexShrink: 0, minHeight: 36 }}>Cost view →</button>
          </div>
          {projects.length > 1 && (
            <div style={{ display: 'flex', marginTop: 8, overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
              {projects.map(p => (
                <button key={p.id} onClick={() => setUi({ activeProjectId: p.id })} style={{ background: 'none', border: 'none', borderBottom: project.id === p.id ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -1, padding: '6px 10px', fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: project.id === p.id ? 'var(--ink)' : 'var(--ink-4)', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: project.id === p.id ? 600 : 400 }}>{p.code || p.name}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '7px 16px', gap: 8 }}>
            <Mono size={9.5} color="var(--ink-4)" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 }}>{rows.length} ITEM{rows.length === 1 ? '' : 'S'}</Mono>
            <button onClick={() => setDetailed(d => !d)} title="Toggle detail"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: detailed ? 'var(--ink)' : 'transparent', color: detailed ? 'var(--paper)' : 'var(--ink-3)', border: '1px solid ' + (detailed ? 'var(--ink)' : 'var(--rule-2)'), padding: '6px 10px', fontFamily: 'var(--font-sans)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 34, fontWeight: 500 }}>
              <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
                <path d="M2 4h12M2 8h12M2 12h7" />
                {detailed && <circle cx={13.5} cy={12} r={1.5} fill="currentColor" stroke="none" />}
              </svg>
              {detailed ? 'Detailed' : 'Compact'}
            </button>
            {editMode && <button onClick={() => setSheet({ kind: 'add' })} style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '6px 12px', fontFamily: 'var(--font-sans)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 500, minHeight: 34 }}>＋ Add</button>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 16px 7px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginRight: 8, flexShrink: 0 }}>Group</span>
            {GROUP_OPTS.map(o => (
              <button key={o.key} onClick={() => setGroupBy(o.key)} style={{ background: 'none', border: 'none', padding: '4px 9px', fontFamily: 'var(--font-sans)', fontSize: 11, color: groupBy === o.key ? 'var(--ink)' : 'var(--ink-4)', fontWeight: groupBy === o.key ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: groupBy === o.key ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -1 }}>{o.label}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 80 }}>
          {rows.length === 0 && (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 18 }}>No items in this schedule yet.</div>
              {editMode
                ? <button onClick={() => setSheet({ kind: 'add' })} style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '10px 18px', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 500, minHeight: 44 }}>＋ Add first item</button>
                : <Mono size={10} color="var(--ink-4)" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tap <strong style={{ color: 'var(--ink-3)' }}>Edit</strong> in the top bar to add items.</Mono>
              }
            </div>
          )}
          {rows.length > 0 && groups.map(g => (
            <div key={g.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 8px' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{g.title}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
                <Mono size={9.5} color="var(--ink-4)">{g.cards.length}</Mono>
              </div>
              {g.cards.map(c => (
                <ScheduleRowCard key={c.row.id} card={c} detailed={detailed} onTap={editMode ? () => setSheet({ kind: 'actions', row: c.row }) : null} />
              ))}
              {editMode && (
                <div style={{ padding: '8px 16px 4px' }}>
                  <button onClick={() => setSheet({ kind: 'add' })} style={{ background: 'transparent', border: '1px dashed var(--rule-2)', padding: '8px 12px', width: '100%', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 40 }}>＋ Add to {g.title}</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {sheet?.kind === 'add' && <ScheduleRowSheet projectId={project.id} onClose={() => setSheet(null)} />}
        {sheet?.kind === 'edit' && <ScheduleRowSheet projectId={project.id} row={sheet.row} onClose={() => setSheet(null)} />}
        {sheet?.kind === 'actions' && (
          <ScheduleRowActions row={sheet.row} projectId={project.id}
            onEdit={() => setSheet({ kind: 'edit', row: sheet.row })}
            onClose={() => setSheet(null)} />
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // SETTINGS
  // ════════════════════════════════════════════════════════════════

  function SettingRow({ label, desc, children }) {
    return (
      <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px dotted var(--rule-2)' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', fontWeight: 500, marginBottom: desc ? 4 : 8 }}>{label}</div>
        {desc && <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', marginBottom: 10, lineHeight: 1.4 }}>{desc}</div>}
        {children}
      </div>
    );
  }

  function SettingsPage() {
    const { Mono, SegBtn, TopNav } = P();
    const { settings, setSettings, ui, setUi, materials, projects } = useApp();
    const sec = ui.mobileSettingsSection || 'appearance';
    const setSec = s => setUi({ mobileSettingsSection: s });
    const navSecs = [
      { key: 'appearance', label: 'Appearance' }, { key: 'density', label: 'Density' },
      { key: 'typography', label: 'Typography' }, { key: 'library', label: 'Library' },
      { key: 'desktop', label: 'Desktop' }, { key: 'about', label: 'About' },
    ];

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', overflow: 'hidden' }}>
        <TopNav />
        <div style={{ borderBottom: '1px solid var(--rule)', background: 'var(--paper)', flexShrink: 0 }}>
          <div style={{ padding: '14px 16px 0' }}>
            <Mono size={9} color="var(--ink-4)" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Settings</Mono>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {navSecs.map(s => (
                <button key={s.key} onClick={() => setSec(s.key)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: sec === s.key ? '2px solid var(--ink)' : '2px solid transparent', padding: '6px 10px', marginBottom: -1, fontFamily: 'var(--font-sans)', fontSize: 12, color: sec === s.key ? 'var(--ink)' : 'var(--ink-3)', fontWeight: sec === s.key ? 500 : 400, flexShrink: 0, whiteSpace: 'nowrap' }}>{s.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px', paddingBottom: 80 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 4 }}>{navSecs.find(s => s.key === sec)?.label}</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.45, marginBottom: 24 }}>Customise the studio archive. Changes apply immediately.</div>

          {sec === 'appearance' && <React.Fragment>
            <SettingRow label="Theme" desc="Background tone for the entire interface.">
              <SegBtn options={[{ key: 'warm', label: 'Warm' }, { key: 'cool', label: 'Cool' }, { key: 'dark', label: 'Dark' }]} value={settings.theme} onChange={v => setSettings({ theme: v })} />
            </SettingRow>
            <SettingRow label="Accent colour" desc="Used for interactive highlights and indicators.">
              <div style={{ display: 'flex', gap: 8 }}>
                {[['umber', '#a85133'], ['forest', '#4a7a5a'], ['slate', '#4a6a8a'], ['ochre', '#c89040']].map(([k, c]) => (
                  <button key={k} onClick={() => setSettings({ accent: k })} title={k} style={{ width: 34, height: 34, background: c, cursor: 'pointer', border: settings.accent === k ? '2px solid var(--ink)' : '1px solid var(--rule-2)', outline: settings.accent === k ? '2px solid var(--paper)' : 'none', outlineOffset: settings.accent === k ? -4 : 0 }} />
                ))}
              </div>
            </SettingRow>
          </React.Fragment>}

          {sec === 'density' && (
            <SettingRow label="Row density" desc="Controls vertical padding across all lists, tables, and cards.">
              <SegBtn options={[{ key: 'compact', label: 'Compact' }, { key: 'regular', label: 'Regular' }, { key: 'open', label: 'Open' }]} value={settings.density} onChange={v => setSettings({ density: v })} />
            </SettingRow>
          )}

          {sec === 'typography' && (
            <React.Fragment>
              <div style={{ padding: '18px', background: 'var(--tint)', border: '1px solid var(--rule)', marginBottom: 18 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 8, color: 'var(--ink)' }}>Newsreader — Serif</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, marginBottom: 8, color: 'var(--ink)' }}>Inter Tight — Sans-serif</div>
                <Mono size={12} color="var(--ink)">JetBrains Mono — Monospace</Mono>
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>Typography is set to the studio system and is not user-configurable in this build.</p>
            </React.Fragment>
          )}

          {sec === 'library' && <React.Fragment>
            <SettingRow label="Default gallery view" desc="How many columns the gallery renders on wider viewports.">
              <SegBtn options={[{ key: 'editorial', label: 'Editorial' }, { key: 'roomy', label: 'Roomy' }, { key: 'wide', label: 'Wide' }]} value={settings.galleryWidth || 'editorial'} onChange={v => setSettings({ galleryWidth: v })} />
            </SettingRow>
            <SettingRow label="Show imagery" desc="Display attached image references in gallery cards.">
              <SegBtn options={[{ key: 'on', label: 'On' }, { key: 'off', label: 'Off' }]} value={settings.showImagery === false ? 'off' : 'on'} onChange={v => setSettings({ showImagery: v === 'on' })} />
            </SettingRow>
          </React.Fragment>}

          {sec === 'desktop' && (
            <SettingRow label="Switch to desktop view" desc="Open the full desktop application. You can return to mobile from the same toggle.">
              <button onClick={() => {
                const vp = document.querySelector('meta[name="viewport"]');
                if (vp) vp.content = 'width=1280';
                localStorage.setItem('aml-desktop-view', '1');
                setUi({ view: 'library' });
              }} style={{ padding: '10px 16px', background: 'var(--ink)', color: 'var(--paper)', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 44 }}>Open desktop view</button>
            </SettingRow>
          )}

          {sec === 'about' && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.8 }}>
              <div>Architecture Schedule</div>
              <div>Mobile view · wired to live cloud state</div>
              <div style={{ color: 'var(--ink-4)', marginTop: 8 }}>{materials.length} materials · {projects.length} projects</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  Object.assign(window, {
    MB_ProjectsPage: ProjectsPage,
    MB_CostPage: CostPage,
    MB_SchedulePage: SchedulePage,
    MB_SettingsPage: SettingsPage,
  });
})();
