// App shell — navigation + edit/add material modal + Tweaks integration

// Seed version. Bump whenever new seed items are added to window.MATERIALS.
// On mismatch, we merge in any seed items the user doesn't already have
// (matched by id) without touching their edits/additions.
const SEED_VERSION = 9;

// Upgrade a legacy paint material (category==='Paint') to a first-class paint kind.
// Idempotent. Non-destructive: unit + all existing fields preserved.
function migrateMaterialToPaint(m) {
  if (!m) return m;
  if (m.kind === 'paint') return m;
  if (m.category !== 'Paint') return m;
  const out = { ...m, kind: 'paint' };
  if (!out.tone && out.swatch?.tone) out.tone = out.swatch.tone;
  if (!out.brand) out.brand = m.supplier || '';
  // DO NOT overwrite unit — existing paints use 'm²' by design (cost rolled by area).
  return out;
}

// Per-item migration — paint kind upgrade + library remap. Pure: no
// localStorage side effects. Idempotent — running on already-migrated
// data is a no-op-equivalent (returns equivalent shape).
function migrateOneMaterial(m) {
  const K2L = window.KIND_TO_LIBRARY || {};
  const libForKind = (kind) => K2L[kind || 'material'] || 'lib-finishes';

  const paintMig = migrateMaterialToPaint(m);
  const withKind = window.migrateItem ? window.migrateItem(paintMig) : paintMig;
  // Library remap:
  //  - legacy 'lib-master' → map by kind
  //  - empty/missing → assign by kind
  //  - otherwise keep user's choice (they may have custom libraries)
  let libs = withKind.libraryIds || [];
  if (libs.length === 0 || (libs.length === 1 && libs[0] === 'lib-master')) {
    libs = [libForKind(withKind.kind)];
  } else {
    libs = libs.filter(id => id !== 'lib-master');
    if (libs.length === 0) libs = [libForKind(withKind.kind)];
  }
  return { ...withKind, libraryIds: libs };
}

function migrateMaterials(list) {
  return (list || []).map(migrateOneMaterial);
}

// Append any seed materials the user doesn't already have (matched by id).
// Returns { items, newSeedVer }. Pure — caller persists newSeedVer to
// appState.seed_version. Idempotent across runs because of the haveIds check.
function backfillMaterialsFromSeed(list, currentSeedVer) {
  const cur = currentSeedVer | 0;
  if (cur >= SEED_VERSION || !Array.isArray(window.MATERIALS)) {
    return { items: list, added: [], newSeedVer: cur };
  }
  const haveIds = new Set(list.map(m => m.id));
  const added = window.MATERIALS
    .filter(m => !haveIds.has(m.id))
    .map(migrateOneMaterial);
  const items = added.length > 0 ? [...list, ...added] : list;

  // Orphan check: warn on any paintedWithId references that don't resolve.
  try {
    const ids = new Set(items.map(x => x.id));
    items.forEach(x => {
      if (x.paintable && x.paintedWithId && !ids.has(x.paintedWithId)) {
        console.warn('[backfillMaterialsFromSeed] orphan paintedWithId:', x.id, '→', x.paintedWithId);
      }
    });
  } catch {}

  return { items, added, newSeedVer: SEED_VERSION };
}

function migrateLibraries(list) {
  // If user has the legacy [{id:'lib-master'}] blob stored, replace it with the
  // new multi-library seed. If they've added their own libraries, keep those
  // and strip the master stub.
  const hasOnlyMaster = list.length === 1 && list[0].id === 'lib-master';
  if (hasOnlyMaster) return window.LIBRARIES;

  const seeded = window.LIBRARIES || [];
  const seededIds = new Set(seeded.map(l => l.id));
  // Keep user-added libraries (anything not matching our seed ids and not lib-master)
  const userCustom = list.filter(l => l.id !== 'lib-master' && !seededIds.has(l.id));
  return [...seeded, ...userCustom];
}
function migrateProjects(list) {
  return (list || []).map(p => ({
    ...p,
    libraryIds: p.libraryIds || [],
  }));
}

// Expose migration helpers to window so LoadingGate (a separate script) can
// use them when hydrating cloud-loaded collections + running seed backfill.
Object.assign(window, {
  SEED_VERSION,
  migrateMaterials,
  migrateOneMaterial,
  backfillMaterialsFromSeed,
  migrateProjects,
  migrateLibraries,
});

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "umber",
  "density": "regular",
  "showImagery": true,
  "paper": "warm",
  "galleryWidth": "editorial"
}/*EDITMODE-END*/;

// RenumberModal extracted to src/RenumberModal.jsx (Phase 6).
// Resolved via window.RenumberModal at render time.

function ImportSummaryBanner({ summary, onFindDupes, onDismiss }) {
  return (
    <div className="import-banner">
      <span>Archive imported &middot; {summary.dupeCount} material{summary.dupeCount !== 1 ? 's' : ''} may be duplicates</span>
      <button onClick={onFindDupes} className="import-banner-btn">Review</button>
      <button onClick={onDismiss} className="import-banner-close">×</button>
    </div>
  );
}

function DupeMaterialModal({ state, onUseExisting, onSaveAnyway, onCancel }) {
  const { level, matches, isBlock } = state;
  const existing = matches[0];

  const headings = {
    'exact':         'Duplicate material',
    'code-supplier': 'Code already in use',
    'name-supplier': 'Similar material exists',
  };
  const bodies = {
    'exact':         'This material is identical to one already in your library.',
    'code-supplier': `Code "${existing?.code}" is already assigned to "${existing?.name || 'another material'}"${existing?.supplier ? ' from ' + existing.supplier : ''}.`,
    'name-supplier': `"${existing?.name}" from ${existing?.supplier || 'the same supplier'} already exists (${existing?.code || 'no code'}).`,
  };

  const accentBg = level === 'exact' ? '#8a3020' : '#b85c3a';

  return (
    <div className="dupe-modal-bg" onClick={onCancel}>
      <div className="dupe-modal-card" onClick={e => e.stopPropagation()}>

        {/* Coloured header band — background is dynamic */}
        <div className="dupe-modal-head" style={{ background: accentBg }}>
          <span className="dupe-modal-icon">!</span>
          <span className="dupe-modal-head-title">
            {headings[level] || 'Possible duplicate'}
          </span>
        </div>

        {/* Body */}
        <div className="dupe-modal-body">
          <div className="dupe-modal-body-text">{bodies[level]}</div>

          {existing && (
            <div className="dupe-modal-existing" style={{ borderLeft: '3px solid ' + accentBg }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--ink-3)', marginRight: 8 }}>{existing.code}</span>
              <span style={{ fontWeight: 500 }}>{existing.name}</span>
              {existing.supplier && (
                <span style={{ color: 'var(--ink-3)', marginLeft: 6 }}>
                  &middot; {existing.supplier}
                </span>
              )}
            </div>
          )}

          <div className="dupe-modal-foot">
            <button className="dupe-modal-btn" onClick={onCancel}>Cancel</button>
            <button className="dupe-modal-btn" onClick={onUseExisting}>Use existing</button>
            {!isBlock && (
              <button style={{
                padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                border: '1px solid ' + accentBg, background: accentBg,
                color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 500,
              }} onClick={onSaveAnyway}>Save anyway</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Phase 3: settings, UI singleton keys, AND collections all come from the
  // cloud-backed app_state + per-collection rows via LoadingGate's
  // CloudStateContext. Per-project schedules still come from
  // localStorage — Phase 4 moves those.
  const cs = window.useCloudState();
  const settings = cs.settings;
  const setSettings = cs.setSettings;

  // Apply settings to DOM on every change (initial mount + user edits).
  React.useEffect(() => { window.applySettingsToDOM(settings); }, [settings]);

  // Dev-only Tweaks panel — now for experiments only.
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  // ─── UI singleton keys (cloud) ───
  const view = cs.ui.view || 'library';
  const setView = React.useCallback((v) => cs.setUi({ view: v }), [cs]);
  const libraryMode = cs.ui.libraryMode || 'register';
  const setLibraryMode = React.useCallback((v) => cs.setUi({ libraryMode: v }), [cs]);
  const activeLibraryId = cs.ui.activeLibraryId || 'all';
  const setActiveLibraryId = React.useCallback((v) => cs.setUi({ activeLibraryId: v }), [cs]);
  const activeProjectId = cs.ui.activeProjectId || null;
  const setActiveProjectId = React.useCallback((v) => cs.setUi({ activeProjectId: v }), [cs]);

  // ─── Collections (cloud) ───
  const materials = cs.materials;
  const setMaterials = cs.setMaterials;
  const projects = cs.projects;
  const setProjects = cs.setProjects;
  const libraries = cs.libraries;
  const setLibraries = cs.setLibraries;
  const labelTemplates = cs.labelTemplates;
  const setLabelTemplates = cs.setLabelTemplates;

  const [labelBuilderOpen, setLabelBuilderOpen] = React.useState(false);
  const [labelBuilderTab, setLabelBuilderTab] = React.useState('Global');
  const [editingMaterial, setEditingMaterial] = React.useState(null);
  const [editingProject, setEditingProject] = React.useState(null);
  const [kindPickerOpen, setKindPickerOpen] = React.useState(false);
  const [compareIds, setCompareIds] = React.useState([]);
  const [dupeCheckState, setDupeCheckState] = React.useState(null);
  const [findDupesOpen, setFindDupesOpen] = React.useState(false);
  const [renumberState, setRenumberState] = React.useState(null);
  const [importSummary, setImportSummary] = React.useState(null);

  // Tweaks protocol
  React.useEffect(() => {
    function onMsg(e) {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    }
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function persistTweaks(updater) {
    setTweaks(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        window.parent.postMessage({ type: '__edit_mode_set_keys', edits: next }, '*');
      } catch {}
      return next;
    });
  }

  // Apply paper tone
  const paperMap = {
    warm:  { paper: '#f3efe7', paper2: '#eae5d9' },
    cool:  { paper: '#eef0ee', paper2: '#e3e6e2' },
    white: { paper: '#fafaf7', paper2: '#f0ede4' },
  };

  function toggleCompare(id) {
    setCompareIds(cs => cs.includes(id) ? cs.filter(x => x !== id) : [...cs, id]);
  }

  function addMaterial() {
    // Open kind picker instead of going straight to editor
    setKindPickerOpen(true);
  }

  // Register's "+ Add to {Category}" path — bypasses the category picker and
  // opens the editor directly with the chosen v5 category.
  function addMaterialInCategory(category) {
    createNewItem(category);
  }

  function createNewItem(categoryId) {
    const preselectLib = activeLibraryId && activeLibraryId !== 'all' ? [activeLibraryId] : ['lib-master'];
    const requestedCat = categoryId && window.categoryDef && window.categoryDef(categoryId);
    const fallbackCat = window.categoryDef && window.categoryDef('wall');
    const catDef = requestedCat || fallbackCat;
    const category = (catDef && catDef.id) || 'wall';
    const defaultUnit = (catDef && catDef.defaultUnit) || 'm²';
    const defaultTrade = (window.defaultTradeForCategory && window.defaultTradeForCategory(category)) || 'Other';
    setKindPickerOpen(false);
    setEditingMaterial({
      id: 'm-' + Date.now(),
      category,
      unit: defaultUnit,
      trade: defaultTrade,
      fields: {
        trade: defaultTrade,
        tags: { performance: [], location: [], materialFamily: [] },
        unit: defaultUnit,
      },
      _touched: {},
      code: (() => {
        const pol = settings.dupePolicy || window.DUPE_PRESET_A;
        // Library codes are an office-catalog concept; only auto-assign in
        // office mode (Preset C / scope:'library'). Project-mode firms hide
        // library codes entirely.
        if (!window.isOfficeMode || !window.isOfficeMode(pol)) return '';
        return (window.autoAssignCode && window.autoAssignCode(materials, pol, category, category)) || '';
      })(),
      name: '',
      projects: [],
      libraryIds: preselectLib,
      swatch: { kind: 'solid', tone: '#b8aa94' },
      _isNew: true,
    });
  }
  function saveMaterial(m) {
    if (m._isNew) {
      const policy = settings.dupePolicy || window.DUPE_PRESET_A;
      if (policy.warnOnMaterialDupe === 'auto-rename' && window.detectDuplicates && window.generateDuplicateCode) {
        const { level } = window.detectDuplicates(m, materials, policy);
        if (level === 'code-supplier' || level === 'exact') {
          const newCode = window.generateDuplicateCode(m, materials, policy);
          commitSaveMaterial({ ...m, code: newCode });
          return;
        }
      } else if (policy.warnOnMaterialDupe !== 'off' && window.detectDuplicates) {
        const { level, matches } = window.detectDuplicates(m, materials, policy);
        if (level) {
          const isBlock = policy.warnOnMaterialDupe === 'block' ||
            (level === 'code-supplier' && policy.uniquenessProject === 'block');
          setDupeCheckState({ material: m, level, matches, isBlock,
            onConfirm: () => commitSaveMaterial(m) });
          return;
        }
      }
    }
    commitSaveMaterial(m);
  }
  function commitSaveMaterial(m) {
    if (m._isNew) {
      const { _isNew, ...clean } = m;
      setMaterials(list => [...list, { ...clean, codeHistory: [] }]);
    } else {
      setMaterials(list => list.map(x => {
        if (x.id !== m.id) return x;
        const hist = x.codeHistory || [];
        const codeChanged = x.code && x.code !== m.code;
        const newHist = codeChanged
          ? [...hist, { code: x.code, changedAt: Date.now(), reason: 'manual' }]
          : hist;
        return { ...m, codeHistory: newHist };
      }));
    }
    setEditingMaterial(null);
    setDupeCheckState(null);
  }
  function deleteMaterial(id, skipConfirm = false) {
    if (!skipConfirm && !window.confirm('Delete this material?')) return;
    const policy = settings.dupePolicy || window.DUPE_PRESET_A;
    if ((policy.onDelete === 'ask' || policy.preset === 'B') && window.detectSeries) {
      const src = materials.find(m => m.id === id);
      if (src && src.code) {
        const series = window.detectSeries(src.code);
        if (series) {
          const { prefix, number, width } = series;
          const toRenumber = materials
            .filter(m => m.id !== id)
            .reduce((acc, m) => {
              const s = window.detectSeries(m.code || '');
              if (s && s.prefix === prefix && s.number > number) {
                const newNum = s.number - 1;
                const str = String(newNum);
                const newCode = prefix + (str.length >= s.width ? str : str.padStart(s.width, '0'));
                acc.push({ id: m.id, from: m.code, to: newCode });
              }
              return acc;
            }, []);
          if (toRenumber.length > 0) {
            setRenumberState({ deletingId: id, toRenumber });
            return;
          }
        }
      }
    }
    doDeleteMaterial(id);
  }
  function doDeleteMaterial(id) {
    setMaterials(list => list.filter(m => m.id !== id));
    setCompareIds(cs => cs.filter(x => x !== id));
  }
  function mergeMaterials(survivorId, loserId) {
    const loser = materials.find(m => m.id === loserId);
    if (!loser) return;

    // Phase 4: rewrite materialId references in every project's cloud
    // schedule. Best-effort: load each, swap, push back. Async and
    // fire-and-forget — the materials list update below is what the user sees
    // immediately; the cross-references catch up in the background.
    if (window.cloud && Array.isArray(projects)) {
      const swap = (raw) => {
        if (!raw) return null;
        const blob = JSON.stringify(raw);
        if (!blob.includes(loserId)) return null;
        return JSON.parse(blob.split('"' + loserId + '"').join('"' + survivorId + '"'));
      };
      projects.forEach(p => {
        window.cloud.loadSchedule(p.id).then(sched => {
          const next = swap(sched);
          if (next) window.cloud.saveScheduleNow(p.id, next).catch(err =>
            console.error('[mergeMaterials] schedule rewrite failed:', p.id, err));
        }).catch(() => {});
      });
    }

    setMaterials(list => list
      .filter(m => m.id !== loserId)
      .map(m => {
        // Update survivor — store mergedFrom history
        if (m.id === survivorId) {
          return { ...m, mergedFrom: [...(m.mergedFrom || []),
            { id: loser.id, fields: loser, mergedAt: Date.now() }] };
        }
        // Repoint any paintedWithId references
        if (m.paintedWithId === loserId) return { ...m, paintedWithId: survivorId };
        return m;
      })
    );
  }

  // Inline cell save (used by Library Table). Coerces empty strings to null.
  React.useEffect(() => {
    window.saveMaterialCell = function(id, field, value) {
      setMaterials(list => list.map(m =>
        m.id === id ? { ...m, [field]: value === '' ? null : value } : m));
    };
    window.buildCSVFromIds = function(ids) {
      const rows = materials.filter(m => ids.includes(m.id));
      const pol = settings.dupePolicy || window.DUPE_PRESET_A;
      const baseCols = ['name', 'category', 'supplier', 'origin', 'finish',
        'species', 'thickness', 'dimensions', 'unit', 'unitCost', 'leadTime'];
      const cols = (window.isOfficeMode && window.isOfficeMode(pol))
        ? ['code', ...baseCols] : baseCols;
      const esc = (v) => {
        if (v == null) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const header = cols.join(',');
      const body = rows.map(r => cols.map(c => esc(r[c])).join(',')).join('\n');
      return header + '\n' + body;
    };
  }, [materials]);

  function addProject() {
    setEditingProject({
      id: 'p-' + Date.now(),
      code: '', name: '', client: '', address: '',
      type: '', stage: 'Concept', budget: '', lead: '',
      commenced: '', completion: '', description: '',
      locations: [],
      _isNew: true,
    });
  }
  function saveProject(p) {
    if (p._isNew) {
      const { _isNew, ...clean } = p;
      setProjects(list => [...list, clean]);
    } else {
      setProjects(list => list.map(x => x.id === p.id ? p : x));
    }
    setEditingProject(null);
  }
  function deleteProject(id) {
    if (!window.confirm('Delete this project? Its cost schedule will also be removed.')) return;
    setProjects(list => list.filter(p => p.id !== id));
    // Drop the cloud schedule row. Cloud delete is best-effort —
    // the project itself is already gone from the user's perspective.
    if (window.cloud) {
      window.cloud.deleteSchedule(id).catch(err =>
        console.error('[deleteProject] schedule delete failed:', err));
    }
    // Also clear the legacy localStorage row so it doesn't re-migrate.
    try { localStorage.removeItem('aml-schedule-' + id); } catch {}
  }

  // ───────── Library CRUD ─────────
  function addLibrary(name, description = '') {
    const id = 'lib-' + Date.now();
    const clean = (name || '').trim() || 'New library';
    setLibraries(list => [...list, { id, name: clean, description: (description || '').trim(), system: false }]);
    setActiveLibraryId(id);
    return id;
  }
  function renameLibrary(id, name, description) {
    setLibraries(list => list.map(l => l.id === id
      ? {
          ...l,
          name: (name || '').trim() || l.name,
          description: description == null ? l.description : (description || '').trim(),
        }
      : l));
  }
  function deleteLibrary(id) {
    const lib = libraries.find(l => l.id === id);
    if (!lib || lib.system) return;
    const count = materials.filter(m => m.libraryIds.includes(id)).length;
    const msg = count
      ? `Delete "${lib.name}"? ${count} material${count===1?'':'s'} will be removed from this library (materials tagged ONLY to this library will be orphaned to Studio Master).`
      : `Delete "${lib.name}"?`;
    if (!window.confirm(msg)) return;
    setLibraries(list => list.filter(l => l.id !== id));
    setMaterials(list => list.map(m => {
      if (!m.libraryIds.includes(id)) return m;
      const filtered = m.libraryIds.filter(x => x !== id);
      return { ...m, libraryIds: filtered.length ? filtered : ['lib-master'] };
    }));
    setProjects(list => list.map(p => ({
      ...p,
      libraryIds: (p.libraryIds || []).filter(x => x !== id),
    })));
    if (activeLibraryId === id) setActiveLibraryId('all');
  }
  function toggleMaterialInLibrary(materialId, libraryId) {
    setMaterials(list => list.map(m => {
      if (m.id !== materialId) return m;
      const has = m.libraryIds.includes(libraryId);
      const next = has ? m.libraryIds.filter(x => x !== libraryId) : [...m.libraryIds, libraryId];
      return { ...m, libraryIds: next.length ? next : ['lib-master'] };
    }));
  }
  function moveMaterialToLibrary(materialId, libraryId) {
    // Replaces all library tags with just this one
    setMaterials(list => list.map(m =>
      m.id === materialId ? { ...m, libraryIds: [libraryId] } : m));
  }
  function duplicateMaterialIntoLibrary(materialId, libraryId) {
    const src = materials.find(m => m.id === materialId);
    if (!src) return;
    const policy = settings.dupePolicy || window.DUPE_PRESET_A;
    const newCode = window.generateDuplicateCode ? window.generateDuplicateCode(src, materials, policy) : src.code + '-copy';
    setMaterials(list => [...list, {
      ...src,
      id: 'm-' + Date.now(),
      code: newCode,
      libraryIds: [libraryId],
      codeHistory: [],
      mergedFrom: undefined,
    }]);
  }
  function duplicateMaterial(materialId) {
    const src = materials.find(m => m.id === materialId);
    if (!src) return null;
    const policy = settings.dupePolicy || window.DUPE_PRESET_A;
    const newCode = window.generateDuplicateCode ? window.generateDuplicateCode(src, materials, policy) : src.code + '-copy';
    const newId = 'm-' + Date.now();
    setMaterials(list => [...list, {
      ...src,
      id: newId,
      code: newCode,
      codeHistory: [],
      mergedFrom: undefined,
    }]);
    return newId;
  }

  return (
    <div
      data-accent={settings.accent}
      data-density={settings.density}
      className="app-shell"
    >
      <Nav view={view} setView={setView} settings={settings} setSettings={setSettings} />
      {(() => {
        const isTable = view === 'library' && libraryMode === 'table';
        const isSettings = view === 'settings';
        const gw = settings.galleryWidth || 'editorial';
        const widthMap = { editorial: 1240, roomy: 1360, studio: 1480, wide: 'none' };
        const isGalleryWide = !isTable && !isSettings && gw === 'wide';
        const mainStyle = {
          flex: 1,
          padding: isTable ? '0'
            : isSettings ? '48px 56px 80px'
            : isGalleryWide ? '42px 32px 80px'
            : '42px 56px 80px',
          maxWidth: isTable ? 'none'
            : isSettings ? 1320
            : widthMap[gw],
          width: '100%',
          margin: '0 auto',
        };
        return (
      <main style={mainStyle}>
        {view === 'library' && (
          <Library
            materials={materials}
            libraries={libraries}
            labelTemplates={labelTemplates}
            setLabelTemplates={setLabelTemplates}
            onOpenLabelBuilder={(tab) => { setLabelBuilderTab(tab || 'Global'); setLabelBuilderOpen(true); }}
            mode={libraryMode}
            setMode={setLibraryMode}
            activeLibraryId={activeLibraryId}
            setActiveLibraryId={setActiveLibraryId}
            onAdd={addMaterial}
            onAddInCategory={addMaterialInCategory}
            onEdit={setEditingMaterial}
            onDelete={deleteMaterial}
            onAddLibrary={addLibrary}
            onRenameLibrary={renameLibrary}
            onDeleteLibrary={deleteLibrary}
            onToggleMaterialInLibrary={toggleMaterialInLibrary}
            onMoveMaterial={moveMaterialToLibrary}
            onDuplicateMaterial={duplicateMaterialIntoLibrary}
            onDuplicate={duplicateMaterial}
            onFindDupes={() => setFindDupesOpen(true)}
            compareIds={compareIds}
            toggleCompare={toggleCompare}
            showImagery={settings.showImagery}
            density={settings.density}
          />
        )}
        {view === 'projects' && (
          <Projects
            projects={projects}
            onOpen={(pid) => { setActiveProjectId(pid); setView('cost'); }}
            onAdd={addProject}
            onEdit={setEditingProject}
            onDelete={deleteProject}
          />
        )}
        {view === 'schedule' && window.SchedulePage && (
          <window.SchedulePage
            materials={materials}
            projects={projects}
            libraries={libraries}
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
            density={settings.density}
          />
        )}
        {view === 'cost' && (
          <CostScheduleHost
            materials={materials}
            projects={projects}
            libraries={libraries}
            labelTemplates={labelTemplates}
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
            onUpdateProject={saveProject}
            density={settings.density}
          />
        )}
        {view === 'settings' && (
          <SettingsPage
            settings={settings}
            setSettings={setSettings}
            materials={materials}
            projects={projects}
            libraries={libraries}
            labelTemplates={labelTemplates}
            setLabelTemplates={setLabelTemplates}
            onOpenLabelBuilder={(tab) => { setLabelBuilderTab(tab || 'Global'); setLabelBuilderOpen(true); }}
            onFindDupes={() => setFindDupesOpen(true)}
            onRestoreSeed={() => {
              if (!window.confirm(
                'This will wipe ALL materials, projects, and libraries and ' +
                'reinstall the seed archive. This cannot be undone. Continue?')) return;
              setMaterials(migrateMaterials(window.MATERIALS));
              setProjects(migrateProjects(window.PROJECTS));
              setLibraries(window.LIBRARIES);
              setLabelTemplates(window.DEFAULT_TEMPLATES);
              // Bump seed_version so the LoadingGate backfill on next load
              // doesn't try to re-add the seeds we just wrote.
              cs.setSeedVersion(SEED_VERSION);
              // Phase 4: per-project schedules live in cloud now. Restore-seed
              // doesn't have schedules to write, but we should clear any
              // existing cloud rows so restored projects start fresh.
              if (window.cloud) {
                (projects || []).forEach(p => {
                  window.cloud.deleteSchedule(p.id).catch(() => {});
                });
              }
            }}
            onImport={(data) => {
              const imported = data.materials ? migrateMaterials(data.materials) : null;
              if (imported) {
                setMaterials(imported);
                if (window.countDuplicatesInList) {
                  const policy = settings.dupePolicy || window.DUPE_PRESET_A;
                  const dupeCount = window.countDuplicatesInList(imported, policy);
                  if (dupeCount > 0) setImportSummary({ total: imported.length, dupeCount });
                }
              }
              if (data.projects) setProjects(migrateProjects(data.projects));
              if (data.libraries) setLibraries(data.libraries);
              if (data.labelTemplates) setLabelTemplates(data.labelTemplates);
              if (data.settings) setSettings({ ...window.SETTINGS_DEFAULTS, ...data.settings });
              // Phase 4: per-project schedules go to cloud.
              if (window.cloud && data.schedules && typeof data.schedules === 'object') {
                Object.entries(data.schedules).forEach(([pid, sched]) => {
                  window.cloud.saveScheduleNow(pid, sched).catch(err =>
                    console.error('[onImport] schedule save failed:', pid, err));
                });
              }
            }}
          />
        )}
      </main>
        );
      })()}

      <Footer settings={settings} />

      {kindPickerOpen && window.KindPicker && (
        <window.KindPicker
          onPick={(kindId) => createNewItem(kindId)}
          onClose={() => setKindPickerOpen(false)}
        />
      )}

      {editingMaterial && window.MaterialEditor && (
        <window.MaterialEditor
          material={editingMaterial}
          materials={materials}
          labelTemplates={labelTemplates}
          onOpenLabelBuilder={(tab) => { setLabelBuilderTab(tab || 'Global'); setLabelBuilderOpen(true); }}
          onClose={() => setEditingMaterial(null)}
          onSave={saveMaterial}
          // Phase C2 — Save & add another: persist current draft, then re-init
          // editor with a fresh template of the same kind so the drawer stays
          // open. Only meaningful for new materials.
          onSaveAndAddAnother={editingMaterial._isNew ? (m) => {
            saveMaterial(m);
            // saveMaterial unmounts the editor (sets editingMaterial=null);
            // schedule a fresh createNewItem for the same kind on the next tick.
            setTimeout(() => createNewItem(m.category || 'wall'), 0);
          } : undefined}
          requireCodeOnSave={!!(settings.dupePolicy || window.DUPE_PRESET_A).requireCodeOnSave}
          showLibraryCode={!!(window.isOfficeMode && window.isOfficeMode(settings.dupePolicy || window.DUPE_PRESET_A))}
        />
      )}

      {labelBuilderOpen && (
        <LabelFormatModal
          templates={labelTemplates}
          setTemplates={setLabelTemplates}
          materials={materials}
          initialTab={labelBuilderTab}
          onClose={() => setLabelBuilderOpen(false)}
        />
      )}

      {editingProject && window.ProjectEditor && (
        <window.ProjectEditor
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={saveProject}
        />
      )}

      {tweaksOpen && (
        <Tweaks tweaks={tweaks} setTweaks={persistTweaks}
          onOpenLabelBuilder={() => { setLabelBuilderTab('Global'); setLabelBuilderOpen(true); }}
          onClose={() => setTweaksOpen(false)} />
      )}
      {dupeCheckState && (
        <DupeMaterialModal
          state={dupeCheckState}
          onUseExisting={() => {
            setDupeCheckState(null);
            setEditingMaterial(null);
            if (dupeCheckState.matches[0]) setEditingMaterial(dupeCheckState.matches[0]);
          }}
          onSaveAnyway={() => dupeCheckState.onConfirm()}
          onCancel={() => setDupeCheckState(null)}
        />
      )}
      {renumberState && window.RenumberModal && (
        <window.RenumberModal
          state={renumberState}
          onLeaveGap={() => { doDeleteMaterial(renumberState.deletingId); setRenumberState(null); }}
          onCloseGap={() => {
            setMaterials(list => list
              .filter(m => m.id !== renumberState.deletingId)
              .map(m => {
                const change = renumberState.toRenumber.find(r => r.id === m.id);
                if (!change) return m;
                return { ...m, code: change.to,
                  codeHistory: [...(m.codeHistory || []),
                    { code: change.from, changedAt: Date.now(), reason: 'renumber' }] };
              })
            );
            setCompareIds(cs => cs.filter(x => x !== renumberState.deletingId));
            setRenumberState(null);
          }}
          onCancel={() => setRenumberState(null)}
        />
      )}
      {findDupesOpen && window.FindDuplicatesPanel && (
        <window.FindDuplicatesPanel
          materials={materials}
          libraries={libraries}
          settings={settings}
          onMerge={mergeMaterials}
          onUpdateDismissed={(pairs) => setSettings(s => ({ ...s, dismissedDuplicatePairs: pairs }))}
          onClose={() => setFindDupesOpen(false)}
        />
      )}
      {importSummary && (
        <ImportSummaryBanner
          summary={importSummary}
          onFindDupes={() => { setImportSummary(null); setFindDupesOpen(true); }}
          onDismiss={() => setImportSummary(null)}
        />
      )}
      <RevisionBadge />
      <DesktopViewToggle />
    </div>
  );
}

function DesktopViewToggle() {
  const [isDesktop, setIsDesktop] = React.useState(
    () => localStorage.getItem('aml-desktop-view') === '1'
  );
  const [narrow, setNarrow] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    function onResize() { setNarrow(window.innerWidth < 768); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!narrow && !isDesktop) return null;

  function toggle() {
    const next = !isDesktop;
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.content = next ? 'width=1280' : 'width=device-width, initial-scale=1.0';
    localStorage.setItem('aml-desktop-view', next ? '1' : '');
    setIsDesktop(next);
  }

  return (
    <button onClick={toggle} style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      padding: '8px 14px', fontSize: 12,
      background: 'var(--ink)', color: 'var(--paper)',
      border: 'none', cursor: 'pointer',
      fontFamily: 'var(--font-sans)', fontWeight: 500,
      boxShadow: '0 4px 16px rgba(20,20,20,0.2)',
      borderRadius: 2,
    }}>
      {isDesktop ? 'Mobile view' : 'Desktop view'}
    </button>
  );
}

function CostScheduleHost(props) {
  const cs = window.useCloudState();
  const version = cs.ui.scheduleVersion || 'v2';
  function setV(v) {
    cs.setUi({ scheduleVersion: v });
  }
  const Current = version === 'v2' ? window.CostScheduleV2 : window.CostSchedule;
  return (
    <div>
      <div className="ver-toggle-row">
        <VersionToggle version={version} setVersion={setV} />
      </div>
      {Current && <Current {...props} />}
    </div>
  );
}

function VersionToggle({ version, setVersion }) {
  return (
    <div className="ver-toggle">
      <span className="ver-toggle-label">Schedule</span>
      {[
        { key: 'v1', label: 'v1 · legacy' },
        { key: 'v2', label: 'v2 · new' },
      ].map(opt => {
        const active = version === opt.key;
        return (
          <button key={opt.key} type="button" onClick={() => setVersion(opt.key)}
            className="ver-toggle-btn"
            style={{
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--paper)' : 'var(--ink-3)',
              fontWeight: active ? 500 : 400,
            }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

function RevisionBadge() {
  const [info, setInfo] = React.useState(null);
  const REPO = 'timihaji/architecture-schedule-app';

  React.useEffect(() => {
    fetch('https://api.github.com/repos/' + REPO + '/commits/master')
      .then(r => r.json())
      .then(data => {
        const sha = data.sha ? data.sha.slice(0, 7) : '?';
        const msg = (data.commit?.message || '').split('\n')[0];
        const raw = data.commit?.author?.date;
        const d = raw ? new Date(raw) : null;
        const date = d ? d.toLocaleString('en-AU', {
          timeZone: 'Australia/Brisbane',
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: false,
        }) + ' AEST' : '';
        setInfo({ sha, msg, date });
      })
      .catch(() => setInfo({ sha: 'offline', msg: '', date: '' }));
  }, []);

  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  const dot = <span style={{ color: 'var(--rule-2)', padding: '0 2px' }}>·</span>;

  return (
    <div className="rev-badge">
      {info ? (
        <>
          <a href={'https://github.com/' + REPO + '/commit/' + info.sha}
            target="_blank" rel="noreferrer"
            className="rev-badge-sha">
            {info.sha}
          </a>
          {dot}
          <span className="rev-badge-date">{info.date}</span>
          {info.msg && <>{dot}<span className="rev-badge-msg">{info.msg}</span></>}
          <span style={{ flex: 1 }} />
          {window.SaveStatusIndicator ? (
            <>
              <window.SaveStatusIndicator />
              {dot}
            </>
          ) : null}
          <a href={'https://github.com/' + REPO} target="_blank" rel="noreferrer"
            className="rev-badge-gh">
            github.com/{REPO}
          </a>
        </>
      ) : (
        <span style={{ opacity: 0.5 }}>fetching revision…</span>
      )}
    </div>
  );
}

function Nav({ view, setView, settings, setSettings }) {
  const items = [
    { key: 'library',  label: 'Library' },
    { key: 'projects', label: 'Projects' },
    { key: 'cost',     label: 'Cost Schedule' },
    { key: 'schedule', label: 'Schedule' },
  ];
  const settingsActive = view === 'settings';
  return (
    <header className="sched-nav">
      <div className="sched-nav-brand">
        {window.FirmLogo
          ? <window.FirmLogo settings={settings} size={22} />
          : <div style={{ width: 22, height: 22, background: 'var(--ink)' }} />}
        <div>
          <Serif size={18} style={{ fontWeight: 500, letterSpacing: '-0.005em' }}>
            {settings?.firmName || 'Hollis & Arne'}
            {settings?.firmTagline ? ' — ' + settings.firmTagline : ''}
          </Serif>
        </div>
      </div>
      <div className="sched-nav-right">
        <nav className="sched-nav-links">
          {items.map(it => (
            <button
              key={it.key}
              type="button"
              className={'sched-nav-btn' + (view === it.key ? ' active' : '')}
              onClick={() => setView(it.key)}
            >
              {it.label}
            </button>
          ))}
        </nav>
        <div className="sched-nav-sep" />
        <ThemeToggleButton settings={settings} setSettings={setSettings} />
        <SettingsGearButton
          active={settingsActive}
          onClick={() => setView(settingsActive ? 'library' : 'settings')} />
      </div>
    </header>
  );
}

function isDarkThemeKey(key) {
  const theme = (window.SETTINGS_THEMES || []).find(t => t.key === key);
  return !!(theme && theme.dark);
}

function animateThemeSwitch(applyChange) {
  const root = document.documentElement;
  const oldPaper = getComputedStyle(root).getPropertyValue('--paper').trim() || '#f3efe7';
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const swapDelay = reduceMotion ? 0 : 90;
  const cleanupDelay = reduceMotion ? 80 : 180;

  root.style.setProperty('--theme-cover-paper', oldPaper);
  root.classList.remove('theme-cover-in', 'theme-cover-out');
  root.classList.add('theme-switching');

  const cleanup = () => {
    root.classList.remove('theme-switching', 'theme-cover-in', 'theme-cover-out');
    root.style.removeProperty('--theme-cover-paper');
  };

  window.requestAnimationFrame(() => {
    root.classList.add('theme-cover-in');

    window.setTimeout(() => {
      if (ReactDOM.flushSync) ReactDOM.flushSync(applyChange);
      else applyChange();
      root.classList.remove('theme-cover-in');
      root.classList.add('theme-cover-out');
      window.setTimeout(cleanup, cleanupDelay);
    }, swapDelay);
  });
}

function ThemeToggleButton({ settings, setSettings }) {
  const isDark = isDarkThemeKey(settings?.theme);
  const nextLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  function onToggle() {
    animateThemeSwitch(() => {
      setSettings(prev => {
        const nextLightTheme = isDarkThemeKey(prev.lightModeTheme) ? 'light' : (prev.lightModeTheme || 'light');
        const nextDarkTheme = isDarkThemeKey(prev.darkModeTheme) ? prev.darkModeTheme : 'dark';
        const next = {
          ...prev,
          theme: isDarkThemeKey(prev.theme) ? nextLightTheme : nextDarkTheme,
        };
        if (window.applySettingsToDOM) window.applySettingsToDOM(next);
        return next;
      });
    });
  }

  return (
    <button
      type="button"
      className={'theme-toggle' + (isDark ? ' dark' : ' light')}
      onClick={onToggle}
      aria-label={nextLabel}
      aria-pressed={isDark}
      title={nextLabel}
    >
      <span className="theme-toggle-icon sun" aria-hidden="true"><SunIcon size={14} /></span>
      <span className="theme-toggle-icon moon" aria-hidden="true"><MoonIcon size={14} /></span>
    </button>
  );
}

function SunIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.7" />
      <path d="M8 1.4v1.5M8 13.1v1.5M1.4 8h1.5M13.1 8h1.5
        M3.34 3.34l1.06 1.06M11.6 11.6l1.06 1.06
        M3.34 12.66l1.06-1.06M11.6 4.4l1.06-1.06" />
    </svg>
  );
}

function MoonIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.85 10.26A5.35 5.35 0 0 1 5.74 3.15
        5.38 5.38 0 1 0 12.85 10.26Z" />
    </svg>
  );
}

function SettingsGearButton({ active, onClick }) {
  return (
    <button type="button"
      className={'sched-gear' + (active ? ' active' : '')}
      onClick={onClick}
      title={active ? 'Close settings' : 'Open settings'}
      aria-label="Settings"
    >
      <GearIcon size={14} />
    </button>
  );
}

function GearIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.05 2.19L13.95 2.19L13.37 5.13L15.89 6.18L17.56 3.69L20.31 6.44L17.82 8.11L18.87 10.63L21.81 10.05L21.81 13.95L18.87 13.37L17.82 15.89L20.31 17.56L17.56 20.31L15.89 17.82L13.37 18.87L13.95 21.81L10.05 21.81L10.63 18.87L8.11 17.82L6.44 20.31L3.69 17.56L6.18 15.89L5.13 13.37L2.19 13.95L2.19 10.05L5.13 10.63L6.18 8.11L3.69 6.44L6.44 3.69L8.11 6.18L10.63 5.13Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Footer({ settings }) {
  return (
    <footer className="app-footer">
      <Mono size={10} style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {settings?.firmFooterLeft || 'Hollis & Arne · Architecture'}
      </Mono>
      <Mono size={10} style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {settings?.firmFooterRight || 'Rev. 22·04·26 · Internal'}
      </Mono>
    </footer>
  );
}

// ───────────────────── Extracted (Phase 6) ─────────────────────
// MaterialEditor + glue (DuplicatePicker, EditorField, fieldStyle,
// colorFieldStyle, SwatchEditor, CustomNameBar) → src/MaterialEditor.jsx
// ProjectEditor + glue (ProjectLocationsEditor, LocationRowEdit) →
// src/ProjectEditor.jsx. RenumberModal → src/RenumberModal.jsx.
// All exposed via window.*; rendered from App via window.MaterialEditor /
// window.ProjectEditor / window.RenumberModal at render time.


// Phase 1b: wrap App in AuthGate so the cloud session is required before
// any UI renders. App itself still reads/writes localStorage in this phase;
// the cloud-backed state migration begins in Phase 2.
const RootGate = window.AuthGate;
const rootEl = document.getElementById('root');
if (RootGate) {
  ReactDOM.createRoot(rootEl).render(<RootGate><App /></RootGate>);
} else {
  console.error('[boot] window.AuthGate missing — cloud module failed to load. Rendering app without auth gate.');
  ReactDOM.createRoot(rootEl).render(<App />);
}
