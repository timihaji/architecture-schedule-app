// mobile-state.jsx — Adapter that exposes the prototype's API surface
// (useApp -> { materials, projects, schedules, libraries, settings, ui, toast,
// add/save/delete/duplicate/bulk*, setUi, setSettings }) on top of the real
// cloud-backed store (window.useCloudState + window.useProjectSchedule).
//
// The prototype assumed a single in-memory shape; the real codebase uses v5
// materials (m.fields, m.swatch.tone) and v5 schedule rows (specRef:{kind,id}).
// This file is the only place that knows about both shapes. Pages read the
// flat shape, writes get reshaped back to v5 before they hit the cloud.

(function () {
  const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  // ── Schema mappers ─────────────────────────────────────────────────
  // Material: v5 stores supplier/unit/unit_cost/lead_time/finish/notes inside
  // m.fields. migrate-v5 mirrors them at top-level (m.supplier, m.unitCost) so
  // legacy readers work — we accept either.
  function flattenMaterial(m) {
    if (!m) return m;
    const f = m.fields || {};
    return {
      id: m.id,
      code: m.code || '',
      name: m.name || '',
      category: m.category || '',
      tone: (m.swatch && m.swatch.tone) || m.tone || '#cdc7b8',
      supplier: f.supplier || m.supplier || '',
      unit: f.unit || m.unit || '',
      unitCost: f.unit_cost != null ? f.unit_cost : (m.unitCost != null ? m.unitCost : null),
      leadTime: f.lead_time || m.leadTime || '',
      finish: f.finish || m.finish || '',
      thickness: f.thickness != null ? f.thickness : (m.thickness != null ? m.thickness : ''),
      dimensions: f.dimensions || m.dimensions || '',
      origin: f.country_of_origin || m.origin || '',
      notes: f.notes || m.notes || '',
      libraryIds: m.libraryIds || [],
      _raw: m,
    };
  }

  // Build a v5 material from the flat draft used in the prototype's editor.
  function inflateMaterial(flat, prev) {
    const base = prev && prev._raw ? { ...prev._raw } : (prev || {});
    const fields = { ...(base.fields || {}) };
    if (flat.supplier != null)   fields.supplier = flat.supplier;
    if (flat.unit != null)       fields.unit = flat.unit;
    if (flat.unitCost != null && flat.unitCost !== '') fields.unit_cost = Number(flat.unitCost);
    else if (flat.unitCost === '' || flat.unitCost === null) delete fields.unit_cost;
    if (flat.leadTime != null)   fields.lead_time = flat.leadTime;
    if (flat.finish != null)     fields.finish = flat.finish;
    if (flat.thickness != null && flat.thickness !== '') fields.thickness = flat.thickness;
    if (flat.dimensions != null) fields.dimensions = flat.dimensions;
    if (flat.origin != null)     fields.country_of_origin = flat.origin;
    if (flat.notes != null)      fields.notes = flat.notes;
    if (!fields.tags) fields.tags = { performance: [], area: [], materialFamily: [] };

    const swatch = { ...(base.swatch || { kind: 'solid' }) };
    if (flat.tone) swatch.tone = flat.tone;

    return {
      ...base,
      id: flat.id || base.id,
      code: flat.code != null ? flat.code : base.code,
      name: flat.name != null ? flat.name : base.name,
      category: flat.category != null ? flat.category : base.category,
      fields,
      swatch,
      libraryIds: flat.libraryIds || base.libraryIds || [],
      projects: base.projects || [],
      _touched: base._touched || {},
    };
  }

  // Schedule row: v5 shape is { id, specRef:{kind,id}, element, code, qty,
  // unit, locationId, category, state, specMode, typeOrInstance }.
  // Prototype shape is { id, code, element, materialId, qty, note? }.
  function flattenRow(r) {
    if (!r) return r;
    const materialId = (r.specRef && r.specRef.kind === 'material') ? r.specRef.id : (r.materialId || '');
    return {
      id: r.id,
      code: r.code || '',
      element: r.element || '',
      materialId,
      qty: r.qty != null ? r.qty : 0,
      note: r.note || '',
      _raw: r,
    };
  }

  function inflateRow(flat, prev, materialById) {
    const base = prev && prev._raw ? { ...prev._raw } : (prev || {});
    const mat = flat.materialId ? materialById.get(flat.materialId) : null;
    return {
      ...base,
      id: flat.id || base.id || uid('r'),
      code: flat.code != null ? flat.code : base.code || '',
      element: flat.element != null ? flat.element : base.element || '',
      specRef: flat.materialId
        ? { kind: 'material', id: flat.materialId }
        : (base.specRef || null),
      materialId: flat.materialId || base.materialId || null, // mirror for legacy
      qty: flat.qty != null ? Number(flat.qty) || 0 : base.qty || 0,
      unit: (mat && (mat.fields?.unit || mat.unit)) || base.unit || '',
      category: (mat && mat.category) || base.category || '',
      locationId: base.locationId || null,
      state: base.state || 'specified',
      specMode: base.specMode || 'instance',
      typeOrInstance: base.typeOrInstance || 'instance',
      note: flat.note != null ? flat.note : base.note || '',
    };
  }

  // ── Toast bus ──────────────────────────────────────────────────────
  function useToasts() {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});
    const toast = useCallback((message, opts) => {
      opts = opts || {};
      const id = uid('t');
      const item = { id, message, kind: opts.kind || 'info' };
      setToasts(ts => [...ts.slice(-2), item]);
      timers.current[id] = setTimeout(() => {
        setToasts(ts => ts.filter(t => t.id !== id));
        delete timers.current[id];
      }, opts.duration || 2200);
      return id;
    }, []);
    const dismissToast = useCallback((id) => {
      setToasts(ts => ts.filter(t => t.id !== id));
      if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; }
    }, []);
    useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);
    return { toasts, toast, dismissToast };
  }

  // ── Theme: mirror prototype's applySettings ────────────────────────
  // The real app has its own theme application (window.applySettingsToDOM) but
  // it doesn't include the prototype's `cool`/`warm`/`dark` triple or accent
  // swatches. We only set vars that are missing; real CSS-var setup wins.
  function applyMobileExtras(settings) {
    const r = document.documentElement;
    if (!settings) return;
    const accents = { umber: '#a85133', forest: '#4a7a5a', slate: '#4a6a8a', ochre: '#c89040' };
    if (settings.accent && accents[settings.accent]) r.style.setProperty('--accent', accents[settings.accent]);
    const dp = { compact: '7px', regular: '11px', open: '15px' };
    if (settings.density && dp[settings.density]) r.style.setProperty('--row-pad', dp[settings.density]);
  }

  // ── Context provider ───────────────────────────────────────────────
  const MobileContext = createContext(null);

  function MobileStateProvider({ children }) {
    const cs = window.useCloudState();
    const activeProjectId = cs.ui.activeProjectId || null;
    // Lazy-load the active project's schedule from cloud. Switching projects
    // re-keys the hook automatically.
    const sched = window.useProjectSchedule(activeProjectId, () => ({ rows: [], cells: {} }));

    const { toasts, toast, dismissToast } = useToasts();

    // editMode lives locally — it's an ephemeral UI toggle, no need to sync.
    const [editMode, setEditMode] = useState(false);

    useEffect(() => { applyMobileExtras(cs.settings); }, [cs.settings]);

    // ── Memo-flattened views ──────────────────────────────────────
    const materials = useMemo(() => (cs.materials || []).map(flattenMaterial), [cs.materials]);
    const materialById = useMemo(() => {
      const m = new Map();
      (cs.materials || []).forEach(x => m.set(x.id, x));
      return m;
    }, [cs.materials]);

    const projects = useMemo(() => (cs.projects || []).map(p => ({
      id: p.id, code: p.code || '', name: p.name || '', client: p.client || '',
      address: p.address || p.location || '', stage: p.stage || 'Concept',
      budget: p.budget || '', description: p.description || '',
      _raw: p,
    })), [cs.projects]);

    const libraries = cs.libraries || [];

    // Schedules: prototype expected schedules[pid] = { rows: [...] }. We only
    // have the active project loaded — expose it that way, and best-effort
    // mirror other projects to empty arrays so iteration code doesn't crash.
    const activeRows = useMemo(() => {
      const raw = (sched.data && sched.data.rows) || [];
      return raw.map(flattenRow);
    }, [sched.data]);

    const schedules = useMemo(() => {
      const out = {};
      (cs.projects || []).forEach(p => { out[p.id] = { rows: [] }; });
      if (activeProjectId) out[activeProjectId] = { rows: activeRows };
      return out;
    }, [cs.projects, activeProjectId, activeRows]);

    // ── Mutations ────────────────────────────────────────────────
    const addMaterial = useCallback((flat) => {
      const inflated = inflateMaterial({ ...flat, id: flat.id || uid('m') });
      cs.setMaterials(prev => [...prev, inflated]);
      return inflated;
    }, [cs]);

    const saveMaterial = useCallback((flat) => {
      cs.setMaterials(prev => prev.map(m => {
        if (m.id !== flat.id) return m;
        return inflateMaterial(flat, flattenMaterial(m));
      }));
    }, [cs]);

    const deleteMaterial = useCallback((id) => {
      cs.setMaterials(prev => prev.filter(m => m.id !== id));
    }, [cs]);

    const duplicateMaterial = useCallback((id) => {
      let dup = null;
      cs.setMaterials(prev => {
        const src = prev.find(m => m.id === id);
        if (!src) return prev;
        dup = {
          ...src,
          id: uid('m'),
          name: (src.name || 'Untitled') + ' (copy)',
          code: src.code ? src.code + '·c' : '',
        };
        return [...prev, dup];
      });
      return dup;
    }, [cs]);

    const bulkDeleteMaterials = useCallback((ids) => {
      const s = new Set(ids);
      cs.setMaterials(prev => prev.filter(m => !s.has(m.id)));
    }, [cs]);

    const bulkDuplicateMaterials = useCallback((ids) => {
      const s = new Set(ids);
      cs.setMaterials(prev => {
        const dupes = prev.filter(m => s.has(m.id)).map(src => ({
          ...src,
          id: uid('m'),
          name: (src.name || 'Untitled') + ' (copy)',
          code: src.code ? src.code + '·c' : '',
        }));
        return [...prev, ...dupes];
      });
    }, [cs]);

    const bulkAssignLibrary = useCallback((ids, libId, add) => {
      const s = new Set(ids);
      cs.setMaterials(prev => prev.map(m => {
        if (!s.has(m.id)) return m;
        const cur = new Set(m.libraryIds || []);
        if (add === false) cur.delete(libId); else cur.add(libId);
        return { ...m, libraryIds: [...cur] };
      }));
    }, [cs]);

    // Projects
    const addProject = useCallback((flat) => {
      const id = flat.id || uid('p');
      const real = { ...flat, id, libraryIds: flat.libraryIds || [] };
      cs.setProjects(prev => [...prev, real]);
      return real;
    }, [cs]);

    const saveProject = useCallback((flat) => {
      cs.setProjects(prev => prev.map(p => {
        if (p.id !== flat.id) return p;
        // Preserve any v5 fields not exposed in mobile editor
        return { ...p, ...flat, _raw: undefined };
      }));
    }, [cs]);

    const deleteProject = useCallback((id) => {
      cs.setProjects(prev => prev.filter(p => p.id !== id));
      // Best-effort: clear the cloud schedule row too.
      if (window.cloud && window.cloud.saveScheduleNow) {
        try { window.cloud.saveScheduleNow(id, { rows: [], cells: {} }); } catch {}
      }
    }, [cs]);

    const duplicateProject = useCallback((id) => {
      let dup = null;
      cs.setProjects(prev => {
        const src = prev.find(p => p.id === id);
        if (!src) return prev;
        dup = {
          ...src,
          id: uid('p'),
          name: (src.name || 'Untitled') + ' (copy)',
          code: src.code ? src.code + '·c' : '',
        };
        return [...prev, dup];
      });
      return dup;
    }, [cs]);

    // Schedule rows (active project only — the prototype only ever wrote to
    // the active project's schedule anyway, since you have to switch to view
    // a different one).
    const addScheduleRow = useCallback((pid, flat) => {
      if (pid !== activeProjectId) return; // safety; mobile UI always uses active
      sched.set(prev => {
        const cur = (prev && prev.rows) || [];
        const inflated = inflateRow({ ...flat, id: flat.id || uid('r') }, null, materialById);
        return { ...(prev || {}), rows: [...cur, inflated] };
      });
    }, [sched, activeProjectId, materialById]);

    const updateScheduleRow = useCallback((pid, flat) => {
      if (pid !== activeProjectId) return;
      sched.set(prev => {
        const cur = (prev && prev.rows) || [];
        return {
          ...(prev || {}),
          rows: cur.map(r => r.id === flat.id ? inflateRow(flat, r, materialById) : r),
        };
      });
    }, [sched, activeProjectId, materialById]);

    const deleteScheduleRow = useCallback((pid, rid) => {
      if (pid !== activeProjectId) return;
      sched.set(prev => {
        const cur = (prev && prev.rows) || [];
        return { ...(prev || {}), rows: cur.filter(r => r.id !== rid) };
      });
    }, [sched, activeProjectId]);

    const duplicateScheduleRow = useCallback((pid, rid) => {
      if (pid !== activeProjectId) return;
      sched.set(prev => {
        const cur = (prev && prev.rows) || [];
        const i = cur.findIndex(r => r.id === rid);
        if (i < 0) return prev;
        const dup = { ...cur[i], id: uid('r'), code: cur[i].code ? cur[i].code + '·c' : '' };
        return { ...(prev || {}), rows: [...cur.slice(0, i + 1), dup, ...cur.slice(i + 1)] };
      });
    }, [sched, activeProjectId]);

    const bulkDeleteScheduleRows = useCallback((pid, ids) => {
      if (pid !== activeProjectId) return;
      const s = new Set(ids);
      sched.set(prev => {
        const cur = (prev && prev.rows) || [];
        return { ...(prev || {}), rows: cur.filter(r => !s.has(r.id)) };
      });
    }, [sched, activeProjectId]);

    // Libraries
    const addLibrary = useCallback((l) => {
      const id = uid('lib');
      const n = { id, system: false, name: (l.name || 'New library').trim(), description: (l.description || '').trim() };
      cs.setLibraries(prev => [...prev, n]);
      return n;
    }, [cs]);

    const saveLibrary = useCallback((l) => {
      cs.setLibraries(prev => prev.map(x => x.id === l.id ? { ...x, name: l.name, description: l.description } : x));
    }, [cs]);

    const deleteLibrary = useCallback((id) => {
      const lib = libraries.find(l => l.id === id);
      if (!lib || lib.system) return;
      cs.setLibraries(prev => prev.filter(l => l.id !== id));
      cs.setMaterials(prev => prev.map(m => ({
        ...m,
        libraryIds: (m.libraryIds || []).filter(x => x !== id),
      })));
      if (cs.ui.activeLibraryId === id) cs.setUi({ activeLibraryId: 'all' });
    }, [cs, libraries]);

    // ── Settings / UI wrappers ────────────────────────────────────
    const setSettings = useCallback((patch) => {
      cs.setSettings(prev => ({ ...(prev || {}), ...patch }));
    }, [cs]);

    const setUi = useCallback((patch) => {
      // The prototype expected editMode in ui; we keep it local.
      if ('editMode' in patch) {
        setEditMode(!!patch.editMode);
        const { editMode: _, ...rest } = patch;
        if (Object.keys(rest).length) cs.setUi(rest);
      } else {
        cs.setUi(patch);
      }
    }, [cs]);

    const value = useMemo(() => ({
      materials, addMaterial, saveMaterial, deleteMaterial, duplicateMaterial,
      bulkDeleteMaterials, bulkDuplicateMaterials, bulkAssignLibrary,
      projects, addProject, saveProject, deleteProject, duplicateProject,
      schedules, addScheduleRow, updateScheduleRow, deleteScheduleRow,
      duplicateScheduleRow, bulkDeleteScheduleRows,
      libraries, addLibrary, saveLibrary, deleteLibrary,
      settings: cs.settings, setSettings,
      ui: { ...cs.ui, editMode },
      setUi,
      toasts, toast, dismissToast,
      // Status hint for UI: schedule still loading?
      scheduleStatus: sched.status,
    }), [
      materials, projects, libraries, schedules, cs.settings, cs.ui, editMode, toasts, sched.status,
      addMaterial, saveMaterial, deleteMaterial, duplicateMaterial,
      bulkDeleteMaterials, bulkDuplicateMaterials, bulkAssignLibrary,
      addProject, saveProject, deleteProject, duplicateProject,
      addScheduleRow, updateScheduleRow, deleteScheduleRow, duplicateScheduleRow, bulkDeleteScheduleRows,
      addLibrary, saveLibrary, deleteLibrary,
      setSettings, setUi, toast, dismissToast,
    ]);

    return React.createElement(MobileContext.Provider, { value }, children);
  }

  function useApp() {
    const ctx = useContext(MobileContext);
    if (!ctx) throw new Error('useApp() must be called inside <MobileStateProvider>');
    return ctx;
  }

  Object.assign(window, { MobileStateProvider, useApp, applyMobileExtras });
})();
