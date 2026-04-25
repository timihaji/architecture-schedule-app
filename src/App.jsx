// App shell — navigation + edit/add material modal + Tweaks integration

function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v);
  } catch { return fallback; }
}

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

function migrateMaterials(list) {
  const K2L = window.KIND_TO_LIBRARY || {};
  const libForKind = (kind) => K2L[kind || 'material'] || 'lib-finishes';

  const stored = list.map(m => {
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
      // Strip any 'lib-master' references and ensure non-empty
      libs = libs.filter(id => id !== 'lib-master');
      if (libs.length === 0) libs = [libForKind(withKind.kind)];
    }
    return { ...withKind, libraryIds: libs };
  });

  // Read the user's recorded seed version. If absent or older than current,
  // backfill missing seed ids.
  let seedVer = 0;
  try { seedVer = parseInt(localStorage.getItem('aml-seed-version') || '0', 10) || 0; } catch {}
  if (seedVer < SEED_VERSION && Array.isArray(window.MATERIALS)) {
    const haveIds = new Set(stored.map(m => m.id));
    const newSeeds = window.MATERIALS
      .filter(m => !haveIds.has(m.id))
      .map(m => {
        const paintMig = migrateMaterialToPaint(m);
        const withKind = window.migrateItem ? window.migrateItem(paintMig) : paintMig;
        let libs = withKind.libraryIds || [];
        if (libs.length === 0) libs = [libForKind(withKind.kind)];
        return { ...withKind, libraryIds: libs };
      });
    try { localStorage.setItem('aml-seed-version', String(SEED_VERSION)); } catch {}
    const merged = [...stored, ...newSeeds];
    // Orphan check: any paintedWithId references that no longer resolve.
    try {
      const ids = new Set(merged.map(x => x.id));
      merged.forEach(x => {
        if (x.paintable && x.paintedWithId && !ids.has(x.paintedWithId)) {
          console.warn('[migrateMaterials] orphan paintedWithId:', x.id, '→', x.paintedWithId);
        }
      });
    } catch {}
    return merged;
  }
  return stored;
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
  return list.map(p => ({
    ...p,
    libraryIds: p.libraryIds || [],
  }));
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "umber",
  "density": "regular",
  "showImagery": true,
  "paper": "warm",
  "galleryWidth": "editorial"
}/*EDITMODE-END*/;

function RenumberModal({ state, onLeaveGap, onCloseGap, onCancel }) {
  const { toRenumber } = state;
  const backdrop = { position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 };
  const card = { background: 'var(--paper)', width: 460,
    boxShadow: '0 24px 56px rgba(20,20,20,0.2)', display: 'flex', flexDirection: 'column',
    overflow: 'hidden' };
  const btnBase = { padding: '7px 14px', fontSize: 13, cursor: 'pointer',
    border: '1px solid var(--rule-2)', background: 'transparent',
    fontFamily: 'var(--font-sans)' };
  const btnPrimary = { ...btnBase, background: 'var(--ink)', color: 'var(--paper)',
    border: '1px solid var(--ink)' };

  return (
    <div style={backdrop} onClick={onCancel}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 22px', background: 'var(--tint)',
          borderBottom: '1px solid var(--rule)' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13 }}>
            Close gap?
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>
            {toRenumber.length} material{toRenumber.length !== 1 ? 's' : ''} in this series will be renumbered.
            Previously exported PDFs will not update.
          </div>
        </div>
        <div style={{ padding: '14px 22px', maxHeight: 260, overflowY: 'auto' }}>
          {toRenumber.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '4px 0', fontSize: 12.5, fontFamily: 'var(--font-mono)',
              borderBottom: '1px dotted var(--rule-2)' }}>
              <span style={{ color: 'var(--ink-3)', minWidth: 80 }}>{r.from}</span>
              <span style={{ color: 'var(--ink-4)' }}>&rarr;</span>
              <span>{r.to}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end',
          padding: '14px 22px', borderTop: '1px solid var(--rule)' }}>
          <button style={btnBase} onClick={onCancel}>Cancel</button>
          <button style={btnBase} onClick={onLeaveGap}>Leave gap</button>
          <button style={btnPrimary} onClick={onCloseGap}>Close gap</button>
        </div>
      </div>
    </div>
  );
}

function ImportSummaryBanner({ summary, onFindDupes, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', bottom: 48, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--ink)', color: 'var(--paper)',
      padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 24px rgba(20,20,20,0.22)', zIndex: 8500,
      fontFamily: 'var(--font-sans)', fontSize: 13, whiteSpace: 'nowrap',
    }}>
      <span>Archive imported &middot; {summary.dupeCount} material{summary.dupeCount !== 1 ? 's' : ''} may be duplicates</span>
      <button onClick={onFindDupes} style={{
        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
        color: 'var(--paper)', padding: '3px 10px', fontSize: 12, cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
      }}>Review</button>
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
        cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1,
      }}>×</button>
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9000,
    }} onClick={onCancel}>
      <div style={{
        background: 'var(--paper)', width: 440,
        boxShadow: '0 28px 64px rgba(20,20,20,0.24)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Coloured header band */}
        <div style={{
          background: accentBg, padding: '16px 22px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16, color: '#fff', lineHeight: 1 }}>!</span>
          <span style={{
            fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13,
            color: '#fff', letterSpacing: '0.02em',
          }}>
            {headings[level] || 'Possible duplicate'}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            {bodies[level]}
          </div>

          {existing && (
            <div style={{
              padding: '10px 14px', fontSize: 13, lineHeight: 1.4,
              background: 'rgba(184,92,58,0.08)',
              borderLeft: '3px solid ' + accentBg,
            }}>
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

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button style={{
              padding: '7px 14px', fontSize: 13, cursor: 'pointer',
              border: '1px solid var(--rule-2)', background: 'transparent',
              fontFamily: 'var(--font-sans)',
            }} onClick={onCancel}>Cancel</button>
            <button style={{
              padding: '7px 14px', fontSize: 13, cursor: 'pointer',
              border: '1px solid var(--rule-2)', background: 'transparent',
              fontFamily: 'var(--font-sans)',
            }} onClick={onUseExisting}>Use existing</button>
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
  // User-facing settings — single source of truth for all style preferences.
  const [settings, _setSettings] = React.useState(() => window.loadSettings());
  const setSettings = React.useCallback((updater) => {
    _setSettings(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      window.saveSettings(next);
      window.applySettingsToDOM(next);
      return next;
    });
  }, []);

  // Apply settings on first mount
  React.useEffect(() => { window.applySettingsToDOM(settings); }, []);

  // Dev-only Tweaks panel — now for experiments only.
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [view, setView] = React.useState(() => {
    try { return localStorage.getItem('aml-view') || 'library'; } catch { return 'library'; }
  });
  const [materials, setMaterials] = React.useState(() => migrateMaterials(loadLS('aml-materials', window.MATERIALS)));
  const [projects, setProjects] = React.useState(() => migrateProjects(loadLS('aml-projects', window.PROJECTS)));
  const [libraries, setLibraries] = React.useState(() => migrateLibraries(loadLS('aml-libraries', window.LIBRARIES)));
  const [labelTemplates, setLabelTemplates] = React.useState(() => loadLS('aml-label-templates', window.DEFAULT_TEMPLATES));
  const [labelBuilderOpen, setLabelBuilderOpen] = React.useState(false);
  const [labelBuilderTab, setLabelBuilderTab] = React.useState('Global');
  const [activeLibraryId, setActiveLibraryId] = React.useState(() => {
    try { return localStorage.getItem('aml-active-library') || 'all'; } catch { return 'all'; }
  });
  const [activeProjectId, setActiveProjectId] = React.useState(() => {
    try { return localStorage.getItem('aml-active-project') || null; } catch { return null; }
  });
  const [editingMaterial, setEditingMaterial] = React.useState(null);
  const [editingProject, setEditingProject] = React.useState(null);
  const [kindPickerOpen, setKindPickerOpen] = React.useState(false);
  const [compareIds, setCompareIds] = React.useState([]);
  const [dupeCheckState, setDupeCheckState] = React.useState(null);
  const [findDupesOpen, setFindDupesOpen] = React.useState(false);
  const [renumberState, setRenumberState] = React.useState(null);
  const [importSummary, setImportSummary] = React.useState(null);
  const [libraryMode, setLibraryMode] = React.useState(() => {
    try { return localStorage.getItem('aml-library-mode') || 'gallery'; } catch { return 'gallery'; }
  });

  React.useEffect(() => { try { localStorage.setItem('aml-view', view); } catch {} }, [view]);
  React.useEffect(() => { try { localStorage.setItem('aml-library-mode', libraryMode); } catch {} }, [libraryMode]);
  React.useEffect(() => { try { localStorage.setItem('aml-materials', JSON.stringify(materials)); } catch {} }, [materials]);
  React.useEffect(() => { try { localStorage.setItem('aml-projects', JSON.stringify(projects)); } catch {} }, [projects]);
  React.useEffect(() => { try { localStorage.setItem('aml-libraries', JSON.stringify(libraries)); } catch {} }, [libraries]);
  React.useEffect(() => { try { localStorage.setItem('aml-label-templates', JSON.stringify(labelTemplates)); } catch {} }, [labelTemplates]);
  React.useEffect(() => { try { localStorage.setItem('aml-active-library', activeLibraryId); } catch {} }, [activeLibraryId]);
  React.useEffect(() => {
    try {
      if (activeProjectId) localStorage.setItem('aml-active-project', activeProjectId);
    } catch {}
  }, [activeProjectId]);

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

  function createNewItem(kindId) {
    const preselectLib = activeLibraryId && activeLibraryId !== 'all' ? [activeLibraryId] : ['lib-master'];
    const kindRec = (window.KINDS || []).find(k => k.id === kindId) || { id: 'material', defaultTrade: 'Paints & Finishes' };
    const isMaterial = kindRec.id === 'material';
    setKindPickerOpen(false);
    setEditingMaterial({
      id: 'm-' + Date.now(),
      kind: kindRec.id,
      trade: kindRec.defaultTrade,
      tags: [],
      code: (window.autoAssignCode ? window.autoAssignCode(materials, settings.dupePolicy || window.DUPE_PRESET_A, kindRec.id, isMaterial ? 'Timber' : undefined) : null) || '',
      name: '',
      // Category only makes sense for finishes/material kind
      category: isMaterial ? 'Timber' : 'Timber', // placeholder until P3 strips this
      supplier: '',
      origin: '',
      finish: '',
      thickness: '',
      dimensions: '',
      unitCost: 0,
      unit: isMaterial ? 'm²' : 'ea',
      leadTime: '',
      spec: '',
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

    // Rewrite materialId references in every project's schedule + spec
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('aml-schedule-') || key.startsWith('aml-spec-')) {
          const raw = localStorage.getItem(key);
          if (!raw || !raw.includes(loserId)) continue;
          // Replace all occurrences of the loser id in the JSON blob
          localStorage.setItem(key, raw.split('"' + loserId + '"').join('"' + survivorId + '"'));
        }
      }
    } catch {}

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
      const cols = ['code', 'name', 'category', 'supplier', 'origin', 'finish',
        'species', 'thickness', 'dimensions', 'unit', 'unitCost', 'leadTime'];
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
      code: '', name: '', client: '', location: '',
      type: '', stage: 'Concept', budget: '', lead: '',
      commenced: '', completion: '', description: '',
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
    try { localStorage.removeItem('aml-schedule-' + id); } catch {}
  }

  // ───────── Library CRUD ─────────
  function addLibrary(name) {
    const id = 'lib-' + Date.now();
    const clean = (name || '').trim() || 'New library';
    setLibraries(list => [...list, { id, name: clean, description: '', system: false }]);
    setActiveLibraryId(id);
    return id;
  }
  function renameLibrary(id, name) {
    setLibraries(list => list.map(l => l.id === id ? { ...l, name: (name || '').trim() || l.name } : l));
  }
  function duplicateLibrary(id) {
    const src = libraries.find(l => l.id === id);
    if (!src) return;
    const newId = 'lib-' + Date.now();
    setLibraries(list => [...list, { id: newId, name: src.name + ' (copy)', description: src.description, system: false }]);
    // Duplicate material tags
    setMaterials(list => list.map(m => m.libraryIds.includes(id)
      ? { ...m, libraryIds: [...m.libraryIds, newId] }
      : m));
    setActiveLibraryId(newId);
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
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <Nav view={view} setView={setView} settings={settings} />
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
            onEdit={setEditingMaterial}
            onDelete={deleteMaterial}
            onAddLibrary={addLibrary}
            onRenameLibrary={renameLibrary}
            onDuplicateLibrary={duplicateLibrary}
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
            materials={materials}
            labelTemplates={labelTemplates}
            onOpen={(pid) => { setActiveProjectId(pid); setView('cost'); }}
            onAdd={addProject}
            onEdit={setEditingProject}
            onDelete={deleteProject}
          />
        )}
        {view === 'spec' && window.ProjectSpec && (
          <window.ProjectSpec
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
            onRestoreSeed={() => {
              if (!window.confirm(
                'This will wipe ALL materials, projects, and libraries and ' +
                'reinstall the seed archive. This cannot be undone. Continue?')) return;
              setMaterials(migrateMaterials(window.MATERIALS));
              setProjects(migrateProjects(window.PROJECTS));
              setLibraries(window.LIBRARIES);
              setLabelTemplates(window.DEFAULT_TEMPLATES);
              try { Object.keys(localStorage).forEach(k => {
                if (k.startsWith('aml-schedule-')) localStorage.removeItem(k);
              }); } catch {}
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
              // Restore per-project cost schedules and specs to localStorage.
              try {
                Object.keys(localStorage).forEach(k => {
                  if (k.startsWith('aml-schedule-') || k.startsWith('aml-spec-')) {
                    localStorage.removeItem(k);
                  }
                });
                if (data.schedules && typeof data.schedules === 'object') {
                  Object.entries(data.schedules).forEach(([pid, sched]) => {
                    localStorage.setItem('aml-schedule-' + pid, JSON.stringify(sched));
                  });
                }
                if (data.specs && typeof data.specs === 'object') {
                  Object.entries(data.specs).forEach(([pid, spec]) => {
                    localStorage.setItem('aml-spec-' + pid, JSON.stringify(spec));
                  });
                }
              } catch {}
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
          requireCodeOnSave={!!(settings.dupePolicy || window.DUPE_PRESET_A).requireCodeOnSave}
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
  const [version, setVersion] = React.useState(() => {
    try { return localStorage.getItem('aml-schedule-version') || 'v2'; }
    catch { return 'v2'; }
  });
  function setV(v) {
    setVersion(v);
    try { localStorage.setItem('aml-schedule-version', v); } catch {}
  }
  const Current = version === 'v2' ? window.CostScheduleV2 : window.CostSchedule;
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        gap: 8, marginBottom: 10,
      }}>
        <VersionToggle version={version} setVersion={setV} />
      </div>
      {Current && <Current {...props} />}
    </div>
  );
}

function VersionToggle({ version, setVersion }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      border: '1px solid var(--rule-2)',
      padding: 2,
      background: 'var(--paper-2, var(--paper))',
    }}>
      <span style={{
        ...ui.mono, fontSize: 9, color: 'var(--ink-4)',
        letterSpacing: '0.14em', textTransform: 'uppercase',
        padding: '0 8px 0 6px',
      }}>
        Schedule
      </span>
      {[
        { key: 'v1', label: 'v1 · legacy' },
        { key: 'v2', label: 'v2 · new' },
      ].map(opt => {
        const active = version === opt.key;
        return (
          <button key={opt.key} type="button" onClick={() => setVersion(opt.key)}
            style={{
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--paper)' : 'var(--ink-3)',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 10px',
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 10.5, letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: active ? 500 : 400,
              transition: 'all 0.12s ease',
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
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9000,
      background: 'var(--paper-2, var(--paper))',
      borderTop: '1px solid var(--rule)',
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '3px 16px',
      ...mono, fontSize: 10, color: 'var(--ink-4)',
      userSelect: 'none',
    }}>
      {info ? (
        <>
          <a href={'https://github.com/' + REPO + '/commit/' + info.sha}
            target="_blank" rel="noreferrer"
            style={{ color: 'var(--ink-3)', textDecoration: 'none', fontWeight: 500, marginRight: 8 }}>
            {info.sha}
          </a>
          {dot}
          <span style={{ marginLeft: 8 }}>{info.date}</span>
          {info.msg && <>{dot}<span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 480, marginLeft: 8,
          }}>{info.msg}</span></>}
          <span style={{ flex: 1 }} />
          <a href={'https://github.com/' + REPO} target="_blank" rel="noreferrer"
            style={{ color: 'var(--ink-4)', textDecoration: 'none', opacity: 0.7 }}>
            github.com/{REPO}
          </a>
        </>
      ) : (
        <span style={{ opacity: 0.5 }}>fetching revision…</span>
      )}
    </div>
  );
}

function Nav({ view, setView, settings }) {
  const items = [
    { key: 'library',  label: 'Library',  num: 'I' },
    { key: 'projects', label: 'Projects', num: 'II' },
    { key: 'cost',     label: 'Cost Schedule', num: 'III' },
    { key: 'spec',     label: 'Spec',          num: 'IV' },
  ];
  const settingsActive = view === 'settings';
  return (
    <header style={{
      borderBottom: '1px solid var(--ink)',
      padding: '20px 56px 18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      background: 'var(--paper)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 32 }}>
        <nav style={{ display: 'flex', gap: 32 }}>
          {items.map(it => (
            <button
              key={it.key}
              type="button"
              onClick={() => setView(it.key)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: view === it.key ? 'var(--ink)' : 'var(--ink-4)',
                fontWeight: view === it.key ? 500 : 400,
                borderBottom: '1px solid ' + (view === it.key ? 'var(--ink)' : 'transparent'),
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <span style={{
                ...ui.mono,
                fontSize: 10,
                color: view === it.key ? 'var(--ink-3)' : 'var(--ink-4)',
              }}>{it.num}</span>
              {it.label}
            </button>
          ))}
        </nav>
        <div style={{
          width: 1, alignSelf: 'stretch',
          background: 'var(--rule)',
          margin: '2px 0',
        }} />
        <SettingsGearButton
          active={settingsActive}
          onClick={() => setView(settingsActive ? 'library' : 'settings')} />
      </div>
    </header>
  );
}

function SettingsGearButton({ active, onClick }) {
  const [hover, setHover] = React.useState(false);
  const state = active || hover;
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={active ? 'Close settings' : 'Open settings'}
      aria-label="Settings"
      style={{
        background: active ? 'var(--ink)' : 'transparent',
        border: '1px solid ' + (state ? 'var(--ink)' : 'var(--rule-2)'),
        padding: '5px 8px',
        cursor: 'pointer',
        color: active ? 'var(--paper)' : 'var(--ink-3)',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
        fontWeight: 500,
        transition: 'all 0.14s ease',
      }}>
      <GearIcon size={13} />
      <span style={{ fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, opacity: state ? 0.8 : 0.55, letterSpacing: '0.14em' }}>
        V
      </span>
    </button>
  );
}

function GearIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.4v2.2M8 12.4v2.2M2.2 8H4.4M11.6 8h2.2
        M3.76 3.76l1.55 1.55M10.69 10.69l1.55 1.55
        M3.76 12.24l1.55-1.55M10.69 5.31l1.55-1.55" />
    </svg>
  );
}

function Footer({ settings }) {
  return (
    <footer style={{
      borderTop: '1px solid var(--rule)',
      padding: '18px 56px',
      display: 'flex',
      justifyContent: 'space-between',
      color: 'var(--ink-4)',
    }}>
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

function MaterialEditor({ material, materials = [], labelTemplates, onOpenLabelBuilder, onClose, onSave, requireCodeOnSave }) {
  const [draft, setDraft] = React.useState(material);
  const [codeError, setCodeError] = React.useState(false);
  function set(k, v) { setDraft(d => ({ ...d, [k]: v })); if (k === 'code') setCodeError(false); }
  function setSwatch(k, v) { setDraft(d => ({ ...d, swatch: { ...d.swatch, [k]: v } })); }
  function handleSave() {
    if (requireCodeOnSave && !draft.code?.trim()) { setCodeError(true); return; }
    onSave(draft);
  }

  // Flip swatch kind when category changes in/out of Paint
  React.useEffect(() => {
    if (draft.category === 'Paint' && draft.swatch?.kind !== 'paint') {
      setDraft(d => ({
        ...d,
        swatch: { kind: 'paint', tone: d.swatch?.tone || '#e5e2d8', sheen: d.sheen || '' },
        unit: d.unit || 'm²',
      }));
    } else if (draft.category !== 'Paint' && draft.swatch?.kind === 'paint') {
      setDraft(d => ({ ...d, swatch: { kind: 'solid', tone: d.swatch?.tone || '#b8aa94' } }));
    }
  }, [draft.category]);

  // Keep paint swatch's sheen in sync with the sheen field
  React.useEffect(() => {
    if (draft.category === 'Paint' && draft.swatch?.kind === 'paint' && draft.swatch?.sheen !== draft.sheen) {
      setDraft(d => ({ ...d, swatch: { ...d.swatch, sheen: d.sheen || '' } }));
    }
  }, [draft.sheen, draft.category]);

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(20,20,20,0.55)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          width: 'min(780px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}>
        <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid var(--ink)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <Eyebrow>
              {material._isNew ? 'New ' : 'Edit '}
              {((window.kindById && window.kindById(draft.kind))?.label) || 'entry'}
              {draft.trade ? ' · ' + draft.trade : ''}
            </Eyebrow>
            <Serif size={24} style={{ marginTop: 4, display: 'block' }}>
              {draft.name || `Untitled ${((window.kindById && window.kindById(draft.kind))?.label || 'entry').toLowerCase()}`}
            </Serif>
          </div>
          <TextButton onClick={onClose}>Close ×</TextButton>
        </div>

        <CustomNameBar draft={draft} set={set}
          labelTemplates={labelTemplates}
          onOpenLabelBuilder={onOpenLabelBuilder} />

        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28 }}>
          <SwatchEditor swatch={draft.swatch} setSwatch={setSwatch}
            seed={parseInt((draft.id || '').slice(2)) || 1}
            category={draft.category}
            sheen={draft.sheen}
            linkedPaint={draft.paintable && draft.paintedWithId
              ? materials.find(x => x.id === draft.paintedWithId) : null}
            inheritPaintTone={!!draft.inheritPaintTone}
            setInheritPaintTone={v => set('inheritPaintTone', v)} />

          {(draft.kind === 'paint' || draft.category === 'Paint') ? (
            <PaintFields draft={draft} set={set} setSwatch={setSwatch} />
          ) : (
            <StandardFields draft={draft} set={set} materials={materials} />
          )}
        </div>

        <div style={{ padding: '14px 28px', borderTop: '1px solid var(--ink)',
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 20 }}>
          {codeError && (
            <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-sans)', marginRight: 'auto' }}>
              A code is required before saving.
            </span>
          )}
          <TextButton onClick={onClose}>Cancel</TextButton>
          <TextButton onClick={handleSave} accent>
            {material._isNew ? 'Add to library' : 'Save changes'}
          </TextButton>
        </div>
      </div>
    </div>
  );
}

// ───────── Standard (non-paint) material fields ─────────
function PaintSelect({ value, onChange, options, placeholder = '— unspecified —' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const selected = options.find(o => o.id === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...fieldStyle(),
          display: 'flex', alignItems: 'center', gap: 8,
          textAlign: 'left', cursor: 'pointer',
          background: 'var(--paper)',
        }}>
        {selected ? (
          <>
            <span style={{
              width: 14, height: 14, flexShrink: 0,
              background: selected.tone || '#ddd',
              outline: '1px solid rgba(20,20,20,0.15)',
              display: 'inline-block',
            }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selected.label}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-4)' }}>{placeholder}</span>
        )}
        <span style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-4)' }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          maxHeight: 260, overflowY: 'auto',
          zIndex: 20,
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
        }}>
          <button type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            style={{
              width: '100%', padding: '8px 10px', textAlign: 'left',
              background: value == null ? 'var(--tint)' : 'var(--paper)',
              border: 'none', borderBottom: '1px dotted var(--rule-2)', cursor: 'pointer',
              fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic',
              fontFamily: "'Newsreader', serif",
            }}>{placeholder}</button>
          {options.map(o => (
            <button key={o.id} type="button"
              onClick={() => { onChange(o.id); setOpen(false); }}
              style={{
                width: '100%', padding: '7px 10px',
                display: 'flex', alignItems: 'center', gap: 8,
                background: o.id === value ? 'var(--tint)' : 'var(--paper)',
                border: 'none', borderBottom: '1px dotted var(--rule-2)', cursor: 'pointer',
                textAlign: 'left',
              }}>
              <span style={{
                width: 16, height: 16, flexShrink: 0,
                background: o.tone || '#ddd',
                outline: '1px solid rgba(20,20,20,0.15)',
              }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink)',
                  fontFamily: "'Inter Tight', sans-serif",
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: 'block' }}>
                  {o.label}
                </span>
                {o.meta && (
                  <span style={{ ...ui.mono, fontSize: 9.5, color: 'var(--ink-4)',
                    letterSpacing: '0.06em' }}>{o.meta}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StandardFields({ draft, set, materials }) {
  const isFinish = !draft.kind || draft.kind === 'material';
  const isAppliance = draft.kind === 'appliance' || draft.kind === 'fitting';
  const isLighting = draft.kind === 'light' || draft.kind === 'ffe-lighting';
  const isFFE = draft.kind && draft.kind.startsWith('ffe-');

  // Paint-able: only show when the substrate could be painted
  const paintChoices = materials.filter(m => m.kind === 'paint' || m.category === 'Paint');
  const linkedPaint = draft.paintable && draft.paintedWithId
    ? paintChoices.find(p => p.id === draft.paintedWithId)
    : null;
  const inheritedFinish = linkedPaint
    ? `${linkedPaint.sheen || ''} · ${linkedPaint.brand || ''} ${linkedPaint.colourName || linkedPaint.name}`.trim()
    : null;

  // Auto-inherit finish & tone when a paint is linked (unless the user has overridden)
  React.useEffect(() => {
    if (linkedPaint && !draft.finishOverride) {
      if (draft.finish !== inheritedFinish) set('finish', inheritedFinish);
    }
  }, [linkedPaint?.id, linkedPaint?.sheen, linkedPaint?.colourName, draft.finishOverride]);

  React.useEffect(() => {
    if (linkedPaint && draft.inheritPaintTone) {
      const paintTone = linkedPaint.swatch?.tone;
      if (paintTone && draft.swatch?.tone !== paintTone) {
        set('swatch', { ...draft.swatch, tone: paintTone });
      }
    }
  }, [linkedPaint?.swatch?.tone, draft.inheritPaintTone]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <EditorField label="Name" full>
        <input value={draft.name} onChange={e => set('name', e.target.value)} style={fieldStyle()} />
      </EditorField>
      <EditorField label="Code">
        <input value={draft.code} onChange={e => set('code', e.target.value)} style={fieldStyle('mono')} />
      </EditorField>
      {isFinish && (
        <EditorField label="Category">
          <select value={draft.category} onChange={e => set('category', e.target.value)} style={fieldStyle()}>
            {window.CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </EditorField>
      )}
      <EditorField label="Trade">
        <input value={draft.trade || ''} onChange={e => set('trade', e.target.value)} style={fieldStyle()}
          placeholder="e.g. Joinery, Plumbing, Electrical"
          list="aml-trades" />
        <datalist id="aml-trades">
          {(window.TRADES || []).map(t => <option key={t} value={t} />)}
        </datalist>
      </EditorField>
      {isFinish && (
        <EditorField label="Species">
          <input value={draft.species || ''} onChange={e => set('species', e.target.value)} style={fieldStyle()} placeholder="optional — latin name" />
        </EditorField>
      )}
      {(isAppliance || isLighting || isFFE) && (
        <EditorField label="Model">
          <input value={draft.model || ''} onChange={e => set('model', e.target.value)} style={fieldStyle('mono')}
            placeholder="Model no. / SKU" />
        </EditorField>
      )}
      <EditorField label="Supplier">
        <input value={draft.supplier} onChange={e => set('supplier', e.target.value)} style={fieldStyle()} />
      </EditorField>
      <EditorField label="Supplier code">
        <input value={draft.supplier_code || ''} onChange={e => set('supplier_code', e.target.value)}
          style={fieldStyle('mono')} placeholder="Supplier's SKU / product no." />
      </EditorField>
      <EditorField label="Origin">
        <input value={draft.origin} onChange={e => set('origin', e.target.value)} style={fieldStyle()} />
      </EditorField>
      <div style={{ gridColumn: 'auto' }}>
        <div style={{ ...ui.label, marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span>Finish</span>
          {linkedPaint && (
            <button type="button"
              onClick={() => set('finishOverride', !draft.finishOverride)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: draft.finishOverride ? 'var(--accent-ink)' : 'var(--ink-4)',
                fontWeight: 500,
              }}>
              {draft.finishOverride ? 'Override ✓' : 'Override'}
            </button>
          )}
        </div>
        {linkedPaint && !draft.finishOverride ? (
          <div style={{
            ...fieldStyle(),
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--tint)',
            borderStyle: 'dashed',
            color: 'var(--ink-2)',
            cursor: 'not-allowed',
          }}>
            <div style={{
              width: 14, height: 14, flexShrink: 0,
              background: linkedPaint.swatch?.tone || '#ddd',
              outline: '1px solid rgba(20,20,20,0.15)',
            }} />
            <span style={{ fontSize: 13 }}>{inheritedFinish}</span>
            <span style={{ marginLeft: 'auto', ...ui.mono, fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>
              INHERITED
            </span>
          </div>
        ) : (
          <input value={draft.finish} onChange={e => set('finish', e.target.value)} style={fieldStyle()} />
        )}
      </div>
      {isFinish && (
        <EditorField label="Thickness">
          <input value={draft.thickness} onChange={e => set('thickness', e.target.value)} style={fieldStyle('mono')} />
        </EditorField>
      )}
      <EditorField label="Dimensions">
        <input value={draft.dimensions} onChange={e => set('dimensions', e.target.value)} style={fieldStyle('mono')}
          placeholder={isAppliance ? 'W × H × D mm' : isFFE ? 'W × H × D mm' : '2400 × 1200'} />
      </EditorField>
      {isAppliance && (
        <>
          <EditorField label="Rough-in">
            <input value={draft.roughIn || ''} onChange={e => set('roughIn', e.target.value)} style={fieldStyle('mono')}
              placeholder="e.g. 600w × 900h cutout" />
          </EditorField>
          <EditorField label="Power / services">
            <input value={draft.power || ''} onChange={e => set('power', e.target.value)} style={fieldStyle('mono')}
              placeholder="e.g. 15A GPO, cold + hot water" />
          </EditorField>
        </>
      )}
      {isLighting && (
        <>
          <EditorField label="Lamp">
            <input value={draft.lamp || ''} onChange={e => set('lamp', e.target.value)} style={fieldStyle()}
              placeholder="e.g. GU10 LED, integrated" />
          </EditorField>
          <EditorField label="Wattage">
            <input value={draft.wattage || ''} onChange={e => set('wattage', e.target.value)} style={fieldStyle('mono')}
              placeholder="e.g. 9W" />
          </EditorField>
          <EditorField label="Colour temp">
            <input value={draft.kelvin || ''} onChange={e => set('kelvin', e.target.value)} style={fieldStyle('mono')}
              placeholder="e.g. 2700K" />
          </EditorField>
          <EditorField label="Dimmable">
            <select value={draft.dimmable || ''} onChange={e => set('dimmable', e.target.value)} style={fieldStyle()}>
              <option value="">—</option>
              <option>Yes — phase-cut</option>
              <option>Yes — DALI</option>
              <option>Yes — 0-10V</option>
              <option>No</option>
            </select>
          </EditorField>
        </>
      )}
      {isFFE && (
        <EditorField label="Fabric">
          <input value={draft.fabric || ''} onChange={e => set('fabric', e.target.value)} style={fieldStyle()}
            placeholder="e.g. Warwick Fabric · COM" />
        </EditorField>
      )}
      <EditorField label="Lead time">
        <input value={draft.leadTime} onChange={e => set('leadTime', e.target.value)} style={fieldStyle('mono')} />
      </EditorField>
      <EditorField label="Unit cost">
        <input type="number" value={draft.unitCost} onChange={e => set('unitCost', parseFloat(e.target.value) || 0)} style={fieldStyle('mono')} />
      </EditorField>
      <EditorField label="Unit">
        <select value={draft.unit} onChange={e => set('unit', e.target.value)} style={fieldStyle('mono')}>
          {['m²', 'l/m', 'each', 'sheet', 'ea', 'set', 'item'].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </EditorField>

      {/* Paintable: opt-in flag + linked paint — finishes only */}
      {isFinish && (
      <div style={{ gridColumn: '1 / -1', marginTop: 4, padding: '12px 0 2px',
        borderTop: '1px dotted var(--rule-2)' }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}>
          <input type="checkbox" checked={!!draft.paintable}
            onChange={e => set('paintable', e.target.checked)}
            style={{ accentColor: 'var(--accent)', margin: 0 }} />
          <span style={{ ...ui.label, letterSpacing: '0.08em', color: 'var(--ink-2)' }}>
            This material is paintable — expose a paint finish
          </span>
        </label>
        {draft.paintable && (
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <EditorField label="Painted with">
              <PaintSelect
                value={draft.paintedWithId || null}
                onChange={v => set('paintedWithId', v)}
                options={paintChoices.map(p => ({
                  id: p.id,
                  tone: p.swatch?.tone,
                  label: `${p.brand || p.supplier} · ${p.colourName || p.name}`,
                  meta: [p.code, p.sheen].filter(Boolean).join(' · '),
                }))} />
            </EditorField>
            {linkedPaint && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 20 }}>
                <div style={{
                  width: 28, height: 28, flexShrink: 0,
                  background: linkedPaint.swatch?.tone || '#ddd',
                  outline: '1px solid rgba(20,20,20,0.15)',
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)' }}>{linkedPaint.code}</div>
                  <div style={{ ...ui.serif, fontSize: 13, color: 'var(--ink)' }}>
                    {linkedPaint.brand} {linkedPaint.colourName}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      <EditorField label="Specification" full>
        <textarea value={draft.spec} onChange={e => set('spec', e.target.value)}
          rows={4}
          style={{ ...fieldStyle(), padding: '8px 10px', resize: 'vertical',
            fontFamily: "'Newsreader', serif", fontSize: 14, lineHeight: 1.45 }} />
      </EditorField>
    </div>
  );
}

// ───────── Paint-specific fields ─────────
function PaintFields({ draft, set, setSwatch }) {
  // keep the paint swatch tone mirrored to a hex field
  const hex = draft.swatch?.tone || '#e5e2d8';

  // auto-derive $/m² from $/L × coats ÷ coverage
  React.useEffect(() => {
    if (draft.costModel === 'perLitre' && draft.pricePerL && draft.coveragePerL) {
      const derived = (draft.pricePerL * (draft.coats || 2)) / draft.coveragePerL;
      if (Math.abs((draft.unitCost || 0) - derived) > 0.5) {
        set('unitCost', Math.round(derived * 100) / 100);
      }
    }
  }, [draft.costModel, draft.pricePerL, draft.coveragePerL, draft.coats]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <EditorField label="Name" full>
        <input value={draft.name} onChange={e => set('name', e.target.value)}
          style={fieldStyle()} placeholder="Colour name, e.g. Natural White" />
      </EditorField>
      <EditorField label="Code">
        <input value={draft.code} onChange={e => set('code', e.target.value)} style={fieldStyle('mono')} />
      </EditorField>
      <EditorField label="Category">
        <select value={draft.category} onChange={e => set('category', e.target.value)} style={fieldStyle()}>
          {window.CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </EditorField>
      <EditorField label="Brand">
        <input list="paint-brands" value={draft.brand || ''}
          onChange={e => { set('brand', e.target.value); set('supplier', e.target.value); }}
          style={fieldStyle()} placeholder="Dulux, Porter's, Bauwerk…" />
        <datalist id="paint-brands">
          {(window.PAINT_BRANDS || []).map(b => <option key={b} value={b} />)}
        </datalist>
      </EditorField>
      <EditorField label="Colour code">
        <input value={draft.colourCode || ''} onChange={e => set('colourCode', e.target.value)}
          style={fieldStyle('mono')} placeholder="e.g. SW1F2, H168W" />
      </EditorField>
      <EditorField label="Colour (hex)">
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="color" value={hex}
            onChange={e => { setSwatch('kind', 'paint'); setSwatch('tone', e.target.value); }}
            style={{ ...colorFieldStyle, width: 44, height: 32, flexShrink: 0 }} />
          <input value={hex}
            onChange={e => { setSwatch('kind', 'paint'); setSwatch('tone', e.target.value); }}
            style={fieldStyle('mono')} />
        </div>
      </EditorField>
      <EditorField label="Sheen">
        <select value={draft.sheen || ''}
          onChange={e => { set('sheen', e.target.value); set('finish', e.target.value); setSwatch('sheen', e.target.value); }}
          style={fieldStyle()}>
          <option value="">—</option>
          {(window.PAINT_SHEENS || []).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </EditorField>
      <EditorField label="System">
        <input value={draft.system || ''} onChange={e => set('system', e.target.value)}
          style={fieldStyle()} placeholder="e.g. Wash & Wear Interior" />
      </EditorField>
      <EditorField label="Base type">
        <select value={draft.baseType || ''} onChange={e => set('baseType', e.target.value)} style={fieldStyle()}>
          <option value="">—</option>
          <option value="Water-based">Water-based</option>
          <option value="Enamel">Enamel</option>
          <option value="Oil">Oil</option>
        </select>
      </EditorField>
      <EditorField label="Finishes (use)" full>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Interior Walls', 'Ceilings', 'Doors', 'Trim', 'Exterior'].map(f => {
            const arr = Array.isArray(draft.finishes) ? draft.finishes : [];
            const on = arr.includes(f);
            return (
              <button key={f} type="button"
                onClick={() => {
                  const next = on ? arr.filter(x => x !== f) : [...arr, f];
                  set('finishes', next);
                }}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontFamily: "'Inter Tight', sans-serif",
                  border: '1px solid ' + (on ? 'var(--ink)' : 'var(--rule-2)'),
                  background: on ? 'var(--tint)' : 'var(--paper)',
                  color: on ? 'var(--ink)' : 'var(--ink-3)',
                  cursor: 'pointer',
                }}>{f}</button>
            );
          })}
        </div>
      </EditorField>
      <EditorField label="Coats">
        <input type="number" min="1" max="5" value={draft.coats || 2}
          onChange={e => set('coats', parseInt(e.target.value) || 1)} style={fieldStyle('mono')} />
      </EditorField>
      <EditorField label="Substrates">
        <input value={draft.substrates || ''} onChange={e => set('substrates', e.target.value)}
          style={fieldStyle()} placeholder="Plasterboard, primed MDF…" />
      </EditorField>
      <EditorField label="Lead time">
        <input value={draft.leadTime} onChange={e => set('leadTime', e.target.value)} style={fieldStyle('mono')} />
      </EditorField>

      {/* Pricing model */}
      <div style={{ gridColumn: '1 / -1', marginTop: 6, padding: '12px 0 2px',
        borderTop: '1px dotted var(--rule-2)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span style={{ ...ui.label }}>Pricing</span>
          {[
            { v: 'perSqm', l: 'per m²' },
            { v: 'perLitre', l: 'per litre (auto m²)' },
          ].map(o => (
            <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="radio" name="paint-cost-model"
                checked={(draft.costModel || 'perSqm') === o.v}
                onChange={() => set('costModel', o.v)}
                style={{ accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{o.l}</span>
            </label>
          ))}
        </div>
      </div>

      {(draft.costModel || 'perSqm') === 'perSqm' ? (
        <>
          <EditorField label="Unit cost (per m²)">
            <input type="number" value={draft.unitCost}
              onChange={e => set('unitCost', parseFloat(e.target.value) || 0)} style={fieldStyle('mono')} />
          </EditorField>
          <EditorField label="Unit">
            <select value={draft.unit || 'm²'} onChange={e => set('unit', e.target.value)} style={fieldStyle('mono')}>
              <option value="m²">m²</option>
            </select>
          </EditorField>
        </>
      ) : (
        <>
          <EditorField label="Price per litre (A$)">
            <input type="number" value={draft.pricePerL || 0}
              onChange={e => set('pricePerL', parseFloat(e.target.value) || 0)} style={fieldStyle('mono')} />
          </EditorField>
          <EditorField label="Coverage (m² / L)">
            <input type="number" value={draft.coveragePerL || 14}
              onChange={e => set('coveragePerL', parseFloat(e.target.value) || 0)} style={fieldStyle('mono')} />
          </EditorField>
          <div style={{ gridColumn: '1 / -1',
            background: 'var(--tint)', padding: '10px 12px',
            borderLeft: '2px solid var(--accent)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ ...ui.label }}>Derived cost per m²</span>
            <Mono size={14} color="var(--ink)">
              {draft.pricePerL && draft.coveragePerL
                ? 'A$' + ((draft.pricePerL * (draft.coats || 2)) / draft.coveragePerL).toFixed(2)
                : '—'}
              <span style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)', marginLeft: 6 }}>
                = {draft.pricePerL || 0}/L × {draft.coats || 2} coats ÷ {draft.coveragePerL || 0} m²/L
              </span>
            </Mono>
          </div>
        </>
      )}

      <EditorField label="Specification" full>
        <textarea value={draft.spec} onChange={e => set('spec', e.target.value)}
          rows={3}
          style={{ ...fieldStyle(), padding: '8px 10px', resize: 'vertical',
            fontFamily: "'Newsreader', serif", fontSize: 14, lineHeight: 1.45 }} />
      </EditorField>
    </div>
  );
}

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
function ProjectEditor({ project, onClose, onSave }) {
  const [draft, setDraft] = React.useState(project);
  function set(k, v) { setDraft(d => ({ ...d, [k]: v })); }

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stages = ['Concept', 'Documentation', 'Construction', 'Handover'];

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(20,20,20,0.55)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 30,
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          width: 'min(680px, 100%)',
          maxHeight: '92vh', overflowY: 'auto',
        }}>
        <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid var(--ink)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <Eyebrow>{project._isNew ? 'New project' : 'Edit project'}</Eyebrow>
            <Serif size={24} style={{ marginTop: 4, display: 'block' }}>
              {draft.name || 'Untitled project'}
            </Serif>
          </div>
          <TextButton onClick={onClose}>Close ×</TextButton>
        </div>
        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <EditorField label="Project name" full>
            <input value={draft.name} onChange={e => set('name', e.target.value)} style={fieldStyle()} />
          </EditorField>
          <EditorField label="Code">
            <input value={draft.code} onChange={e => set('code', e.target.value)} style={fieldStyle('mono')} placeholder="25·03" />
          </EditorField>
          <EditorField label="Lead">
            <input value={draft.lead} onChange={e => set('lead', e.target.value)} style={fieldStyle('mono')} placeholder="initials" />
          </EditorField>
          <EditorField label="Client">
            <input value={draft.client} onChange={e => set('client', e.target.value)} style={fieldStyle()} />
          </EditorField>
          <EditorField label="Location">
            <input value={draft.location} onChange={e => set('location', e.target.value)} style={fieldStyle()} />
          </EditorField>
          <EditorField label="Type" full>
            <input value={draft.type} onChange={e => set('type', e.target.value)} style={fieldStyle()} placeholder="New build — single dwelling" />
          </EditorField>
          <EditorField label="Stage">
            <select value={draft.stage} onChange={e => set('stage', e.target.value)} style={fieldStyle()}>
              {stages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </EditorField>
          <EditorField label="Budget">
            <input value={draft.budget} onChange={e => set('budget', e.target.value)} style={fieldStyle('mono')} placeholder="A$1.2M" />
          </EditorField>
          <EditorField label="Commenced">
            <input value={draft.commenced} onChange={e => set('commenced', e.target.value)} style={fieldStyle('mono')} placeholder="2025-03" />
          </EditorField>
          <EditorField label="Completion">
            <input value={draft.completion} onChange={e => set('completion', e.target.value)} style={fieldStyle('mono')} placeholder="2026-12" />
          </EditorField>
          <EditorField label="Description" full>
            <textarea value={draft.description} onChange={e => set('description', e.target.value)}
              rows={3}
              style={{ ...fieldStyle(), padding: '8px 10px', resize: 'vertical',
                fontFamily: "'Newsreader', serif", fontSize: 14, lineHeight: 1.45 }} />
          </EditorField>
        </div>
        <div style={{ padding: '14px 28px', borderTop: '1px solid var(--ink)',
          display: 'flex', justifyContent: 'flex-end', gap: 20 }}>
          <TextButton onClick={onClose}>Cancel</TextButton>
          <TextButton onClick={() => onSave(draft)} accent>
            {project._isNew ? 'Create project' : 'Save changes'}
          </TextButton>
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
Object.assign(window, { CustomNameBar });

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
