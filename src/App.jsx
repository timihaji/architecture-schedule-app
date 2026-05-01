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

function RenumberModal({ state, onLeaveGap, onCloseGap, onCancel }) {
  const { toRenumber } = state;
  return (
    <div className="rn-backdrop" onClick={onCancel}>
      <div className="rn-card" onClick={e => e.stopPropagation()}>
        <div className="rn-head">
          <div className="rn-head-title">Close gap?</div>
          <div className="rn-head-sub">
            {toRenumber.length} material{toRenumber.length !== 1 ? 's' : ''} in this series will be renumbered.
            Previously exported PDFs will not update.
          </div>
        </div>
        <div className="rn-list">
          {toRenumber.map(r => (
            <div key={r.id} className="rn-row">
              <span className="rn-row-from">{r.from}</span>
              <span className="rn-row-sep">&rarr;</span>
              <span>{r.to}</span>
            </div>
          ))}
        </div>
        <div className="rn-foot">
          <button className="rn-btn" onClick={onCancel}>Cancel</button>
          <button className="rn-btn" onClick={onLeaveGap}>Leave gap</button>
          <button className="rn-btn-pri" onClick={onCloseGap}>Close gap</button>
        </div>
      </div>
    </div>
  );
}

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

      {editingMaterial && (
        <MaterialEditor
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

      {editingProject && (
        <ProjectEditor
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
      {renumberState && (
        <RenumberModal
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

// ───────────────────── Material editor ─────────────────────

// Inline picker shown inside the Add Product drawer when mode === 'duplicate'.
// Search-at-top + click-to-confirm. Selecting a row prefills the draft from
// the picked product (everything except id + code) and flips mode back to
// 'manual' so the regular drawer body re-renders.
function DuplicatePicker({ products = [], onPick }) {
  const [q, setQ] = React.useState('');
  const ql = q.trim().toLowerCase();
  const visible = ql
    ? products.filter(p => {
        const hay = [p.name, p.code, p.brand, p.supplier, p.colourName, p.colourCode]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(ql);
      })
    : products;

  return (
    <div className="dup-pick-wrap">
      <input
        className="inp-d"
        autoFocus
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search products by name, code, brand or supplier…"
        style={{ marginBottom: 12 }}
      />
      {visible.length === 0 ? (
        <div className="dup-pick-empty">
          {products.length === 0
            ? 'No products to duplicate yet — create one in Manual mode first.'
            : 'No products match.'}
        </div>
      ) : (
        <div className="dup-pick-list">
          {visible.map(p => (
            <button key={p.id} type="button"
              onClick={() => onPick(p)}
              className="dup-pick-row">
              <div className="dup-pick-swatch"
                style={{ background: p.swatch?.tone || 'var(--paper-2)' }} />
              <div className="dup-pick-info">
                <div className="dup-pick-name">{p.colourName || p.name || '—'}</div>
                <div className="dup-pick-meta">
                  {[p.code, p.brand || p.supplier].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className="dup-pick-use">Use →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialEditor({ material, materials = [], labelTemplates, onOpenLabelBuilder, onClose, onSave, onSaveAndAddAnother, requireCodeOnSave, showLibraryCode = false }) {
  // Phase 1B (commit 4): normalise tradeDiscounts/currency on existing rows
  // that pre-date these fields so Commercial doesn't crash on undefined.
  const [draft, setDraft] = React.useState(() => ({
    ...material,
    tradeDiscounts: Array.isArray(material.tradeDiscounts) ? material.tradeDiscounts : [],
    currency: material.currency || 'AUD',
  }));
  const [codeError, setCodeError] = React.useState(false);
  // Phase C1 — intake-mode tabs. Manual is the only functional mode in v1;
  // Duplicate is selectable but its body lands in C9. URL/PDF/CSV are disabled.
  // C1 delta — gate behind material._isNew so tabs only render when CREATING.
  const [mode, setMode] = React.useState('manual');
  function set(k, v) { setDraft(d => ({ ...d, [k]: v })); if (k === 'code') setCodeError(false); }
  function setSwatch(k, v) { setDraft(d => ({ ...d, swatch: { ...d.swatch, [k]: v } })); }
  function handleSave() {
    if (requireCodeOnSave && !draft.code?.trim()) { setCodeError(true); return; }
    onSave(draft);
  }
  function handleSaveAndAddAnother() {
    if (requireCodeOnSave && !draft.code?.trim()) { setCodeError(true); return; }
    if (onSaveAndAddAnother) onSaveAndAddAnother(draft);
  }

  // Flip swatch kind when category changes in/out of Paint
  React.useEffect(() => {
    if ((draft.category === 'Paint' || draft.category === 'paint') && draft.swatch?.kind !== 'paint') {
      setDraft(d => ({
        ...d,
        swatch: { kind: 'paint', tone: d.swatch?.tone || '#e5e2d8', sheen: d.sheen || '' },
        unit: d.unit || 'm²',
      }));
    } else if (draft.category !== 'Paint' && draft.category !== 'paint' && draft.swatch?.kind === 'paint') {
      setDraft(d => ({ ...d, swatch: { kind: 'solid', tone: d.swatch?.tone || '#b8aa94' } }));
    }
  }, [draft.category]);

  // Keep paint swatch's sheen in sync with the sheen field
  React.useEffect(() => {
    if ((draft.category === 'Paint' || draft.category === 'paint') && draft.swatch?.kind === 'paint' && draft.swatch?.sheen !== draft.sheen) {
      setDraft(d => ({ ...d, swatch: { ...d.swatch, sheen: d.sheen || '' } }));
    }
  }, [draft.sheen, draft.category]);

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Drawer chrome (right-sliding panel, .drw-bg + .drw-panel from
  // design/handoff/v2/Library.html). Body sections — 01 Identity, 02 Visual,
  // 03 Specs, 04 Commercial, 05 Notes — render via window.ProductFieldBlocks.
  return (
    <>
      <div className="drw-bg" onClick={onClose} />
      <div className="drw-panel" role="dialog"
        aria-label={material._isNew ? 'Add product' : 'Edit product'}
        onClick={e => e.stopPropagation()}>
        <div className="drw-head">
          <Eyebrow style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
            I · Library / {material._isNew ? 'Add' : 'Edit'}
          </Eyebrow>
          <div className="drw-head-row" style={{ marginTop: 4 }}>
            <Serif size={22} style={{ display: 'block' }}>
              {material._isNew ? 'Add Product' : 'Edit Product'}
            </Serif>
            <button type="button" className="drw-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        {/* Mode tab strip — C1 delta #2: only render when creating. */}
        {material._isNew && window.ModeTabStrip && (
          <window.ModeTabStrip mode={mode} setMode={setMode} />
        )}

        <div className="drw-body">
          {mode === 'manual' && (
            <>
              <CustomNameBar draft={draft} set={set}
                labelTemplates={labelTemplates}
                onOpenLabelBuilder={onOpenLabelBuilder} />

              <window.ProductFieldBlocks.Identity
                draft={draft} set={set} codeError={codeError} showCode={showLibraryCode} />

              <window.ProductFieldBlocks.Visual
                draft={draft} set={set} setSwatch={setSwatch} materials={materials} />

              <window.ProductFieldBlocks.Specs
                draft={draft} set={set} materials={materials} />

              <window.ProductFieldBlocks.Commercial
                draft={draft} set={set} />

              <window.ProductFieldBlocks.Notes
                draft={draft} set={set} />
            </>
          )}

          {mode === 'duplicate' && (
            <DuplicatePicker
              products={materials}
              onPick={src => {
                const { id, code, codeHistory, _isNew, ...prefill } = src;
                const policy = window.DUPE_PRESET_A;
                const newCode = (window.autoAssignCode
                  ? window.autoAssignCode(materials, policy, src.category)
                  : '') || '';
                setDraft({
                  ...prefill,
                  id: 'm-' + Date.now(),
                  code: newCode,
                  tradeDiscounts: Array.isArray(prefill.tradeDiscounts) ? prefill.tradeDiscounts : [],
                  currency: prefill.currency || 'AUD',
                  _isNew: true,
                });
                setMode('manual');
              }}
            />
          )}
        </div>

        <div className="drw-foot">
          {codeError && (
            <span style={{ fontSize: 11, color: 'var(--accent)',
              fontFamily: 'var(--font-sans)', marginRight: 'auto' }}>
              A code is required before saving.
            </span>
          )}
          <button type="button" className="btn-sec-d" onClick={onClose}>Cancel</button>
          {material._isNew && mode === 'manual' && onSaveAndAddAnother && (
            <button type="button" className="btn-sec-d" onClick={handleSaveAndAddAnother}>
              Save &amp; add another
            </button>
          )}
          <span style={{ flex: 1 }} />
          {mode === 'manual' && (
            <button type="button" className="btn-pri-d" onClick={handleSave}>
              {material._isNew ? 'Save Product' : 'Save changes'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// Phase 1B (commit 5): StandardFields / PaintFields / SubmittalFields are all
// gone — every field they used to render now lives in ProductFieldBlocks
// (Identity / Visual / Specs / Commercial / Notes). EditorField + fieldStyle
// remain because SwatchEditor (below) still uses them.

function EditorField({ label, children, full = false }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ ...ui.label, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function fieldStyle(variant) {
  return {
    width: '100%',
    background: 'transparent',
    border: '1px solid var(--rule-2)',
    padding: '6px 10px',
    fontFamily: variant === 'mono' ? "'JetBrains Mono', monospace" : "'Inter Tight', sans-serif",
    fontSize: 13,
    color: 'var(--ink)',
    outline: 'none',
  };
}

// ───────── Swatch editor with tabs: Pattern / Color / Image ─────────
function SwatchEditor({ swatch, setSwatch, seed, category, sheen,
  linkedPaint, inheritPaintTone, setInheritPaintTone }) {
  // Paint renders its swatch editor inline within PaintFields — show a preview here only.
  if (category === 'Paint') {
    const previewSwatch = { kind: 'paint', tone: swatch?.tone || '#e5e2d8', sheen: sheen || swatch?.sheen || '' };
    return (
      <div>
        <Eyebrow style={{ marginBottom: 8 }}>Paint chip</Eyebrow>
        <Swatch swatch={previewSwatch} size="lg" seed={seed} style={{ width: '100%', height: 150 }} />
        <div style={{ marginTop: 10, ...ui.mono, fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
          EDIT HEX &amp; SHEEN IN THE PAINT FIELDS →
        </div>
        <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--tint)',
          fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)',
          lineHeight: 1.45 }}>
          Paint swatches render as a flat colour block with the sheen noted.
          Procedural / image patterns don't apply.
        </div>
      </div>
    );
  }

  const tabFromSwatch = swatch.kind === 'image' ? 'image'
    : swatch.kind === 'solid' ? 'color' : 'pattern';
  const [tab, setTab] = React.useState(tabFromSwatch);
  const fileRef = React.useRef();

  const patternKinds = ['woodgrain', 'veneer', 'castellation', 'fluted', 'vj', 'marble', 'travertine', 'stone', 'brushed', 'weave'];

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSwatch('kind', 'image');
      setSwatch('src', reader.result);
    };
    reader.readAsDataURL(file);
  }

  function onTab(t) {
    setTab(t);
    if (t === 'color' && swatch.kind !== 'solid') setSwatch('kind', 'solid');
    if (t === 'image' && swatch.kind !== 'image') setSwatch('kind', 'image');
    if (t === 'pattern' && (swatch.kind === 'solid' || swatch.kind === 'image')) {
      setSwatch('kind', 'woodgrain');
    }
  }

  return (
    <div>
      <Eyebrow style={{ marginBottom: 8 }}>Swatch</Eyebrow>
      <Swatch swatch={swatch} size="lg" seed={seed} style={{ width: '100%', height: 150 }} />
      {linkedPaint && (
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox"
              checked={!!inheritPaintTone}
              onChange={e => setInheritPaintTone(e.target.checked)}
              style={{ accentColor: 'var(--accent)', margin: '2px 0 0' }} />
            <span style={{ ...ui.label, letterSpacing: '0.08em', color: 'var(--ink-2)' }}>
              Use paint colour as base tone
            </span>
          </label>
        </div>
      )}
      {inheritPaintTone && linkedPaint && (
        <div style={{ marginTop: 10, padding: '9px 11px', background: 'var(--tint)',
          fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 12.5,
          color: 'var(--ink-2)', lineHeight: 1.4 }}>
          Base tone is inherited from {linkedPaint.brand} {linkedPaint.colourName}.
          Untick above to set it manually.
        </div>
      )}
      <div style={{ display: 'flex', gap: 0, marginTop: 14, borderBottom: '1px solid var(--rule)' }}>
        {['pattern', 'color', 'image'].map(t => (
          <button key={t} type="button" onClick={() => onTab(t)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              padding: '7px 0',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 10,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: tab === t ? 'var(--ink)' : 'var(--ink-4)',
              fontWeight: tab === t ? 500 : 400,
              borderBottom: '1px solid ' + (tab === t ? 'var(--ink)' : 'transparent'),
              marginBottom: -1,
            }}>{t}</button>
        ))}
      </div>
      <div style={{ paddingTop: 12 }}>
        {tab === 'pattern' && (
          <>
            <EditorField label="Pattern">
              <select value={patternKinds.includes(swatch.kind) ? swatch.kind : 'woodgrain'}
                onChange={e => setSwatch('kind', e.target.value)} style={fieldStyle()}>
                {patternKinds.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </EditorField>
            <div style={{ marginTop: 10 }}>
              <EditorField label="Base tone">
                <input type="color" value={swatch.tone || '#b8aa94'}
                  disabled={inheritPaintTone}
                  onChange={e => setSwatch('tone', e.target.value)}
                  style={{ ...colorFieldStyle, opacity: inheritPaintTone ? 0.45 : 1,
                    cursor: inheritPaintTone ? 'not-allowed' : 'pointer' }} />
              </EditorField>
            </div>
            {['woodgrain','veneer','castellation','fluted','stone','brushed','weave'].includes(swatch.kind) && (
              <div style={{ marginTop: 10 }}>
                <EditorField label="Grain">
                  <input type="color" value={swatch.grain || '#5a3319'}
                    onChange={e => setSwatch('grain', e.target.value)}
                    style={colorFieldStyle} />
                </EditorField>
              </div>
            )}
            {['marble','travertine'].includes(swatch.kind) && (
              <div style={{ marginTop: 10 }}>
                <EditorField label="Vein">
                  <input type="color" value={swatch.vein || '#7a7468'}
                    onChange={e => setSwatch('vein', e.target.value)}
                    style={colorFieldStyle} />
                </EditorField>
              </div>
            )}
          </>
        )}
        {tab === 'color' && (
          <>
            <EditorField label="Colour">
              <input type="color" value={swatch.tone || '#b8aa94'}
                disabled={inheritPaintTone}
                onChange={e => setSwatch('tone', e.target.value)}
                style={{ ...colorFieldStyle, height: 44,
                  opacity: inheritPaintTone ? 0.45 : 1,
                  cursor: inheritPaintTone ? 'not-allowed' : 'pointer' }} />
            </EditorField>
            <div style={{ marginTop: 10 }}>
              <EditorField label="Hex">
                <input value={swatch.tone || ''}
                  disabled={inheritPaintTone}
                  onChange={e => setSwatch('tone', e.target.value)}
                  style={{ ...fieldStyle('mono'),
                    opacity: inheritPaintTone ? 0.45 : 1,
                    cursor: inheritPaintTone ? 'not-allowed' : 'text' }}
                  placeholder="#b8aa94" />
              </EditorField>
            </div>
            <div style={{ marginTop: 10, opacity: inheritPaintTone ? 0.45 : 1,
              pointerEvents: inheritPaintTone ? 'none' : 'auto' }}>
              <Eyebrow style={{ marginBottom: 6 }}>Presets</Eyebrow>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                {['#1a1a1a','#4a3a2a','#8a6236','#b8aa94','#c9a778','#ede7da',
                  '#575a5a','#9a7a5c','#ece6dc','#b85c3a','#5c6b3a','#3a4a5c']
                  .map(c => (
                  <button key={c} type="button"
                    onClick={() => setSwatch('tone', c)}
                    title={c}
                    style={{ height: 24, background: c, border: swatch.tone === c ? '2px solid var(--ink)' : '1px solid var(--rule-2)', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
            </div>
          </>
        )}
        {tab === 'image' && (
          <>
            <input ref={fileRef} type="file" accept="image/*"
              onChange={handleFile} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileRef.current.click()}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px dashed var(--rule-2)',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--ink-3)',
                fontWeight: 500,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ink)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--rule-2)'}
            >
              {swatch.src ? 'Replace image' : '＋ Upload image'}
            </button>
            {swatch.src && (
              <div style={{ marginTop: 10 }}>
                <TextButton onClick={() => setSwatch('src', null)} accent>Remove image</TextButton>
              </div>
            )}
            <div style={{ marginTop: 10, ...ui.mono, fontSize: 10, color: 'var(--ink-4)' }}>
              jpg, png, webp · stored in-browser
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const colorFieldStyle = {
  width: '100%',
  height: 32,
  border: '1px solid var(--rule-2)',
  background: 'transparent',
  padding: 2,
  cursor: 'pointer',
};

// ───────── Project editor ─────────
function ProjectLocationsEditor({ locations, onChange }) {
  const [newName, setNewName] = React.useState('');
  const list = locations || [];

  function addLocation() {
    const name = newName.trim();
    if (!name) return;
    onChange([...list, { id: 'loc-' + Date.now(), name }]);
    setNewName('');
  }
  function renameLocation(id, name) {
    onChange(list.map(r => r.id === id ? { ...r, name } : r));
  }
  function deleteLocation(id) {
    onChange(list.filter(r => r.id !== id));
  }
  function moveLocation(idx, dir) {
    const next = list.slice();
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }

  return (
    <div className="locations-editor">
      {list.length > 0 && (
        <div className="locations-list">
          {list.map((r, i) => (
            <LocationRowEdit key={r.id} location={r} idx={i} total={list.length}
              onRename={name => renameLocation(r.id, name)}
              onDelete={() => deleteLocation(r.id)}
              onMove={dir => moveLocation(i, dir)} />
          ))}
        </div>
      )}
      <div className="locations-add-row">
        <input
          className="locations-add-input"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Location name"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLocation(); } }}
        />
        <button className="locations-add-btn" onClick={addLocation} disabled={!newName.trim()}>
          + Add
        </button>
      </div>
    </div>
  );
}

function LocationRowEdit({ location, idx, total, onRename, onDelete, onMove }) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(location.name);

  function commit() {
    const trimmed = val.trim();
    if (trimmed && trimmed !== location.name) onRename(trimmed);
    else setVal(location.name);
    setEditing(false);
  }

  return (
    <div className="location-row">
      <span className="location-row-idx">{String(idx + 1).padStart(2, '0')}</span>
      {editing ? (
        <input
          className="location-name-input"
          value={val}
          autoFocus
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(location.name); setEditing(false); } }}
        />
      ) : (
        <span className="location-row-name" onDoubleClick={() => setEditing(true)} title="Double-click to rename">{location.name}</span>
      )}
      <button className="location-ord-btn" onClick={() => onMove(-1)} disabled={idx === 0} title="Move up">↑</button>
      <button className="location-ord-btn" onClick={() => onMove(1)} disabled={idx === total - 1} title="Move down">↓</button>
      <button className="location-del-btn" onClick={onDelete} title="Remove">×</button>
    </div>
  );
}

function ProjectEditor({ project, onClose, onSave }) {
  const [draft, setDraft] = React.useState({ locations: [], ...project });
  function set(k, v) { setDraft(d => ({ ...d, [k]: v })); }

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stages = ['Concept', 'Documentation', 'Construction', 'Handover'];

  return (
    <div className="ae-modal-bg" onClick={onClose}>
      <div className="ae-modal" onClick={e => e.stopPropagation()}>
        <div className="ae-modal-head">
          <div>
            <Eyebrow>{project._isNew ? 'New project' : 'Edit project'}</Eyebrow>
            <span className="ae-modal-head-title">{draft.name || 'Untitled project'}</span>
          </div>
          <button className="ae-modal-close" onClick={onClose}>Close ×</button>
        </div>

        <div className="ae-modal-body">
          <div className="ae-modal-section">
            <div className="ae-modal-section-label">Identity</div>
            <div className="edit-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="edit-label">Project name</div>
                <input className="edit-input" value={draft.name || ''} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <div className="edit-label">Code</div>
                <input className="edit-input mono" value={draft.code || ''} onChange={e => set('code', e.target.value)} placeholder="25·03" />
              </div>
              <div>
                <div className="edit-label">Lead</div>
                <input className="edit-input mono" value={draft.lead || ''} onChange={e => set('lead', e.target.value)} placeholder="initials" />
              </div>
              <div>
                <div className="edit-label">Client</div>
                <input className="edit-input" value={draft.client || ''} onChange={e => set('client', e.target.value)} />
              </div>
              <div>
                <div className="edit-label">Address</div>
                <input className="edit-input" value={draft.address || ''} onChange={e => set('address', e.target.value)} />
              </div>
              <div>
                <div className="edit-label">Stage</div>
                <select className="edit-input" value={draft.stage || 'Concept'} onChange={e => set('stage', e.target.value)}>
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="ae-modal-section">
            <div className="ae-modal-section-label">Programme</div>
            <div className="edit-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="edit-label">Type</div>
                <input className="edit-input" value={draft.type || ''} onChange={e => set('type', e.target.value)} placeholder="New build — single dwelling" />
              </div>
              <div>
                <div className="edit-label">Budget</div>
                <input className="edit-input mono" value={draft.budget || ''} onChange={e => set('budget', e.target.value)} placeholder="A$1.2M" />
              </div>
              <div>
                <div className="edit-label">Commenced</div>
                <input className="edit-input mono" value={draft.commenced || ''} onChange={e => set('commenced', e.target.value)} placeholder="2025-03" />
              </div>
              <div>
                <div className="edit-label">Completion</div>
                <input className="edit-input mono" value={draft.completion || ''} onChange={e => set('completion', e.target.value)} placeholder="2026-12" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="edit-label">Description</div>
                <textarea className="tarea-d" value={draft.description || ''} onChange={e => set('description', e.target.value)} rows={3} />
              </div>
            </div>
          </div>

          <div className="ae-modal-section">
            <div className="ae-modal-section-label">Locations</div>
            <ProjectLocationsEditor
              locations={draft.locations}
              onChange={locations => set('locations', locations)}
            />
          </div>
        </div>

        <div className="ae-modal-foot">
          <button className="edit-cancel" onClick={onClose}>Cancel</button>
          <button className="edit-save" onClick={() => onSave(draft)}>
            {project._isNew ? 'Create project' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProjectEditor });

// ───────── Custom name bar (inside Material Editor) ─────────
function CustomNameBar({ draft, set, labelTemplates, onOpenLabelBuilder }) {
  const hasOverride = !!(draft.customName && draft.customName.trim());
  // What would the template render? (using current draft as the material)
  const templatePreview = labelTemplates
    ? window.formatLabel({ ...draft, customName: null }, labelTemplates)
    : draft.name;
  const finalPreview = window.formatLabel(draft, labelTemplates);

  return (
    <div style={{
      padding: '14px 28px',
      background: 'var(--paper-2)',
      borderBottom: '1px solid var(--rule)',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 20, alignItems: 'start',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', marginBottom: 5, gap: 10, flexWrap: 'wrap' }}>
          <Eyebrow>Display label</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            {hasOverride ? (
              <Tag tone="accent">Custom override</Tag>
            ) : (
              <span style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)',
                letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                From {draft.category} template
              </span>
            )}
            <TextButton onClick={() => onOpenLabelBuilder(draft.category || 'Global')}>
              Edit template
            </TextButton>
          </div>
        </div>
        <input
          value={draft.customName || ''}
          onChange={e => set('customName', e.target.value)}
          placeholder={hasOverride ? '' : `Leave blank — will render as: ${templatePreview}`}
          style={{
            width: '100%',
            background: 'var(--paper)',
            border: '1px solid ' + (hasOverride ? 'var(--accent)' : 'var(--rule-2)'),
            padding: '7px 10px',
            fontFamily: "'Newsreader', serif",
            fontSize: 15,
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline',
          justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ ...ui.serif, fontStyle: 'italic', fontSize: 12,
            color: 'var(--ink-3)' }}>
            Leave blank to use the template. Any text here overrides it for this entry only.
          </span>
          {hasOverride && (
            <button type="button" onClick={() => set('customName', '')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--accent-ink)', fontWeight: 500,
              }}>↺ Clear override</button>
          )}
        </div>
      </div>
      <div style={{ minWidth: 200, maxWidth: 260, paddingLeft: 18,
        borderLeft: '1px dotted var(--rule-2)' }}>
        <Eyebrow style={{ marginBottom: 6 }}>Renders as</Eyebrow>
        <div style={{
          ...ui.serif, fontSize: 15, lineHeight: 1.3, color: 'var(--ink)',
          fontStyle: hasOverride ? 'normal' : 'normal',
        }}>
          {finalPreview || <span style={{ color: 'var(--ink-4)',
            fontStyle: 'italic' }}>—</span>}
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { CustomNameBar, SwatchEditor });

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
