// src/LoadingGate.jsx — hydrates the cloud workspace on top of AuthGate's
// "ready" state, then exposes everything via React context.
//
// Loads in parallel: app_state (singleton) + materials + projects + libraries
// + label_templates. Renders a skeleton during load, an error screen on
// failure, or the children wrapped in <CloudStateContext.Provider> on success.
//
// One-time silent migration from localStorage:
//   • appState keys (settings, ui.*, seed_version, label_templates) — Phase 2/3
//   • collections (aml-materials, aml-projects, aml-libraries) — Phase 3
// Idempotent — only fills cloud rows that are empty/missing. Never overwrites.
//
// label_templates is a singleton object ({ global, byCategory }), not a
// collection — it lives inside appState.label_templates alongside settings.
// The label_templates Postgres table from schema.sql is unused after Phase 3
// (kept around so older deployments don't break; safe to drop in cleanup).
//
// Seed backfill: if appState.seed_version < SEED_VERSION (the constant defined
// in App.jsx), append any new starter materials the user doesn't already have
// (matched by id) and bump appState.seed_version. Runs once per version bump.
//
// Setters (setMaterials, setProjects, setLibraries, setLabelTemplates) take
// either a value or an updater function. The new list is diffed against the
// previous: added/changed items go to cloud.upsertItem, removed items go to
// cloud.deleteItem. Identical-by-reference items are skipped — React's
// immutable-update pattern means changed items get fresh refs anyway.
//
// What stays in localStorage (not migrated — per-device ephemeral prefs):
//   • Supabase session (SDK-managed, unavoidable)
//   • aml-table-density, aml-dt-* (table density / column widths)
//   • aml-desktop-view (viewport mode toggle)
//   • aml-gallery-sidebar, aml-kind-filter, aml-cs-*, aml-cs-mode,
//     aml-cs-rowshape (gallery/schedule ephemeral filters)
// Everything else (settings, ui.*, collections, schedules, specs) is in cloud.

(function () {
  const { useState, useEffect, useCallback, useMemo, useRef, useContext, createContext } = React;

  const CloudStateContext = createContext(null);

  // ─────────────────────────────────────────────
  // Component
  // ─────────────────────────────────────────────
  function LoadingGate({ children }) {
    // Hydrated state. null = still loading.
    const [appState, _setAppState] = useState(null);
    const [materials, _setMaterials] = useState(null);
    const [projects, _setProjects] = useState(null);
    const [libraries, _setLibraries] = useState(null);
    // labelTemplates is a SINGLETON config object ({ global, byCategory }),
    // not a collection — lives inside appState.label_templates. No separate
    // useState needed; it's derived from appState below.
    const [error, setError] = useState(null);

    // Cloud sync gating: setters only push to cloud once initial hydration is
    // complete. Otherwise the migration phase would race with itself (the
    // initial _setX would diff against null and try to push everything again,
    // duplicating writes already done during migration).
    const cloudSyncReady = useRef(false);
    // Phase 5: degraded mode — cloud unreachable but a sessionStorage snapshot
    // from earlier in this session lets the user keep browsing read-only.
    // Mirrored as a ref so setter closures (with empty useCallback deps) read
    // the live value rather than capturing the initial false.
    const [degraded, setDegradedState] = useState(false);
    const degradedRef = useRef(false);
    const setDegraded = (v) => { degradedRef.current = v; setDegradedState(v); };

    useEffect(() => {
      let cancelled = false;
      (async () => {
        if (!window.cloud) {
          if (!cancelled) setError(new Error('Cloud module not loaded.'));
          return;
        }
        try {
          const result = await hydrateAll();
          if (cancelled) return;
          // Set all state synchronously so the first context value has
          // everything, not a stream of partial states.
          _setAppState(result.appState);
          _setMaterials(result.materials);
          _setProjects(result.projects);
          _setLibraries(result.libraries);
          // Cache the snapshot for degraded-mode fallback within this session.
          // sessionStorage (not localStorage) so the snapshot dies with the tab
          // and never serves stale data on a fresh launch.
          try {
            sessionStorage.setItem('cloud-snapshot', JSON.stringify(result));
          } catch (_) { /* over quota / disabled — fine */ }
          // Enable cloud sync for subsequent setter calls.
          cloudSyncReady.current = true;
        } catch (err) {
          console.error('[LoadingGate] hydrate failed:', err);
          // Try a sessionStorage snapshot — degraded mode lets the user keep
          // browsing without write access.
          try {
            const cached = sessionStorage.getItem('cloud-snapshot');
            if (cached) {
              const snap = JSON.parse(cached);
              if (cancelled) return;
              console.warn('[LoadingGate] cloud unreachable; entering degraded mode from snapshot');
              _setAppState(snap.appState);
              _setMaterials(snap.materials);
              _setProjects(snap.projects);
              _setLibraries(snap.libraries);
              setDegraded(true);
              return;
            }
          } catch (_) { /* fall through to ErrorScreen */ }
          if (!cancelled) setError(err);
        }
      })();
      return () => { cancelled = true; };
    }, []);

    // ───── Singleton (appState) setters ─────
    // In degraded mode, setters update local state but do NOT push to cloud
    // (cloud is unreachable). The banner tells the user changes won't persist.
    const setSettings = useCallback((updater) => {
      if (degradedRef.current) return;
      _setAppState(prev => {
        const prevSettings = (prev && prev.settings) || {};
        const nextSettings = typeof updater === 'function' ? updater(prevSettings) : updater;
        const nextState = { ...(prev || {}), settings: nextSettings };
        if (cloudSyncReady.current && window.cloud) window.cloud.saveAppState(nextState);
        return nextState;
      });
    }, []);

    const setUi = useCallback((patchOrUpdater) => {
      if (degradedRef.current) return;
      _setAppState(prev => {
        const prevUi = (prev && prev.ui) || {};
        const nextUi = typeof patchOrUpdater === 'function'
          ? patchOrUpdater(prevUi)
          : { ...prevUi, ...patchOrUpdater };
        const nextState = { ...(prev || {}), ui: nextUi };
        if (cloudSyncReady.current && window.cloud) window.cloud.saveAppState(nextState);
        return nextState;
      });
    }, []);

    const setSeedVersion = useCallback((n) => {
      if (degradedRef.current) return;
      _setAppState(prev => {
        const nextState = { ...(prev || {}), seed_version: n };
        if (cloudSyncReady.current && window.cloud) window.cloud.saveAppState(nextState);
        return nextState;
      });
    }, []);

    const setLabelTemplates = useCallback((updater) => {
      if (degradedRef.current) return;
      _setAppState(prev => {
        const prevTpl = (prev && prev.label_templates) || (window.DEFAULT_TEMPLATES || {});
        const nextTpl = typeof updater === 'function' ? updater(prevTpl) : updater;
        const nextState = { ...(prev || {}), label_templates: nextTpl };
        if (cloudSyncReady.current && window.cloud) window.cloud.saveAppState(nextState);
        return nextState;
      });
    }, []);

    // ───── Collection setters: diff prev vs next, push add/update/delete ─────
    const makeCollectionSetter = (table, setter) => (updater) => {
      if (degradedRef.current) return;
      setter(prev => {
        const next = typeof updater === 'function' ? updater(prev || []) : (updater || []);
        if (cloudSyncReady.current && window.cloud) {
          const { additions, updates, deletions } = diffCollection(prev || [], next);
          additions.forEach(item => window.cloud.upsertItem(table, item.id, item));
          updates.forEach(item => window.cloud.upsertItem(table, item.id, item));
          deletions.forEach(item => {
            window.cloud.deleteItem(table, item.id).catch(err => {
              console.error(`[LoadingGate] delete failed: ${table}/${item.id}`, err);
            });
          });
        }
        return next;
      });
    };

    const setMaterials = useCallback(makeCollectionSetter('materials', _setMaterials), []);
    const setProjects  = useCallback(makeCollectionSetter('projects',  _setProjects),  []);
    const setLibraries = useCallback(makeCollectionSetter('libraries', _setLibraries), []);

    const ctxValue = useMemo(() => ({
      // Singleton
      settings:       mergeWithSettingsDefaults(appState && appState.settings),
      ui:             (appState && appState.ui) || {},
      seedVersion:    (appState && appState.seed_version) || 0,
      labelTemplates: (appState && appState.label_templates) || (window.DEFAULT_TEMPLATES || {}),
      setSettings, setUi, setSeedVersion, setLabelTemplates,
      // Collections
      materials: materials || [],
      projects:  projects  || [],
      libraries: libraries || [],
      setMaterials, setProjects, setLibraries,
      // Phase 5: degraded-mode flag — read-only when cloud is unreachable.
      cloudReadOnly: degraded,
      // Diagnostic / Phase 5+ access
      _appState: appState,
    }), [
      appState, materials, projects, libraries, degraded,
      setSettings, setUi, setSeedVersion, setLabelTemplates,
      setMaterials, setProjects, setLibraries,
    ]);

    if (error) return <ErrorScreen error={error} />;
    if (appState === null || materials === null || projects === null || libraries === null) {
      return <SkeletonScreen />;
    }

    // Empty workspace: cloud loaded fine but contains zero items in every
    // collection. Likely a fresh device that hasn't migrated or seeded yet.
    // Show a prominent banner pointing to the manual migration tools.
    const isEmpty = !degraded
      && (materials || []).length === 0
      && (projects || []).length === 0
      && (libraries || []).length === 0;

    return (
      <CloudStateContext.Provider value={ctxValue}>
        {degraded && <DegradedBanner />}
        {isEmpty && <EmptyWorkspaceBanner setUi={setUi} />}
        {children}
      </CloudStateContext.Provider>
    );
  }

  function useCloudState() {
    const ctx = useContext(CloudStateContext);
    if (!ctx) {
      throw new Error('useCloudState() must be called inside <LoadingGate>');
    }
    return ctx;
  }

  // ─────────────────────────────────────────────
  // Per-project blob hooks (Phase 4)
  // Used by CostSchedule, CostScheduleV2, ProjectSpec to lazily load each
  // project's schedule/spec from cloud on mount or project change.
  //
  // Race guard: if the user switches projects A → B mid-load, A's response
  // is dropped (cancelled flag) so it can't overwrite B's state.
  //
  // Auto-migration: if the cloud row is missing AND localStorage has the
  // legacy aml-schedule-<id> / aml-spec-<id> blob, push the local data to
  // cloud once (saveScheduleNow / saveSpecNow) and use it. After this runs,
  // cloud is the source of truth — subsequent loads ignore localStorage.
  //
  // Setter: the wrapped setSchedule / setSpec writes to cloud via the
  // debounced saveSchedule / saveSpec — keyed on projectId. Switching
  // projects mid-debounce does NOT lose the pending save (per-key debounce).
  //
  // Caller passes:
  //   • projectId  — the row key (cloud column = project_id)
  //   • fallback   — () => defaultData  (seed or blank, used if cloud + LS both empty)
  //   • transform  — (raw) => migrated  (data-shape migration, applied to whatever loads)
  //
  // Both fallback and transform must be referentially stable (defined outside
  // the component or via useCallback) — the hook only re-runs the load
  // effect when projectId changes.
  // ─────────────────────────────────────────────
  function useProjectBlob({ projectId, lsKey, cloudLoad, cloudSaveNow, cloudSave, fallback, transform }) {
    const [state, setState] = useState({ status: 'loading', data: null, error: null });
    // Active projectId at the time of the most recent setSchedule call —
    // captured in closure so saves flush to the right key even if React
    // hasn't re-rendered yet.
    const projectIdRef = useRef(projectId);

    useEffect(() => {
      let cancelled = false;
      projectIdRef.current = projectId;
      setState({ status: 'loading', data: null, error: null });

      (async () => {
        if (!projectId) {
          if (!cancelled) setState({ status: 'ready', data: null, error: null });
          return;
        }
        try {
          let raw = await cloudLoad(projectId);

          // Cloud empty? Try localStorage migration.
          if (raw == null && lsKey) {
            const local = readLSJson(lsKey);
            if (local != null) {
              raw = local;
              try {
                await cloudSaveNow(projectId, local);
              } catch (err) {
                console.error(`[useProjectBlob] migration save failed for ${lsKey}:`, err);
                // Continue — caller still gets the data; future edits will retry.
              }
            }
          }

          if (cancelled) return;

          if (raw == null && fallback) raw = fallback();
          const data = transform ? transform(raw) : raw;
          setState({ status: 'ready', data, error: null });
        } catch (err) {
          console.error('[useProjectBlob] load failed:', err);
          if (!cancelled) setState({ status: 'error', data: null, error: err });
        }
      })();

      return () => { cancelled = true; };
    }, [projectId]);

    const setBlob = useCallback((updater) => {
      setState(prev => {
        if (prev.status !== 'ready') return prev;  // ignore writes while loading
        const next = typeof updater === 'function' ? updater(prev.data) : updater;
        // Save is keyed on projectId at call time. Even if the active project
        // has since changed, this write goes to the correct row because the
        // closure captures projectId.
        if (window.cloud && cloudSave) cloudSave(projectId, next);
        return { ...prev, data: next };
      });
    }, [projectId]);

    return { data: state.data, set: setBlob, status: state.status, error: state.error };
  }

  function useProjectSchedule(projectId, fallback, transform) {
    return useProjectBlob({
      projectId,
      lsKey: projectId ? ('aml-schedule-' + projectId) : null,
      cloudLoad:    (id) => window.cloud.loadSchedule(id),
      cloudSaveNow: (id, data) => window.cloud.saveScheduleNow(id, data),
      cloudSave:    (id, data) => window.cloud.saveSchedule(id, data),
      fallback,
      transform,
    });
  }

  function useProjectSpec(projectId, fallback, transform) {
    return useProjectBlob({
      projectId,
      lsKey: projectId ? ('aml-spec-' + projectId) : null,
      cloudLoad:    (id) => window.cloud.loadSpec(id),
      cloudSaveNow: (id, data) => window.cloud.saveSpecNow(id, data),
      cloudSave:    (id, data) => window.cloud.saveSpec(id, data),
      fallback,
      transform,
    });
  }

  // ─────────────────────────────────────────────
  // Hydration orchestration
  // ─────────────────────────────────────────────
  async function hydrateAll() {
    // 1. Parallel cloud load. label_templates is a singleton — it lives
    //    inside appState (not as a collection), so no separate load.
    const [appStateRaw, materialsCloud, projectsCloud, librariesCloud] =
      await Promise.all([
        window.cloud.loadAppState().then(x => (x && typeof x === 'object') ? x : {}),
        window.cloud.loadCollection('materials'),
        window.cloud.loadCollection('projects'),
        window.cloud.loadCollection('libraries'),
      ]);

    // 2. Mutable working state. We accumulate migrations; one final
    //    saveAppStateNow at the end pushes any singleton changes.
    let appState = { ...appStateRaw };
    let appStateChanged = false;

    // 3. Auto-migrate appState keys from localStorage:
    //    Phase 2: settings, ui, seed_version
    //    Phase 3: label_templates
    if (!appState.settings) {
      const v = readLSJson('aml-settings');
      if (v && typeof v === 'object') { appState.settings = v; appStateChanged = true; }
    }
    if (!appState.ui) {
      const ui = collectLegacyUiKeys();
      if (Object.keys(ui).length > 0) { appState.ui = ui; appStateChanged = true; }
    }
    // Migrate specV2Cols: aml-spec-cols (old per-device localStorage blob) →
    // appState.ui.specV2Cols (cloud-synced, workspace-wide). Only runs once:
    // once the key is in cloud the condition is false. Does NOT delete the
    // localStorage key — leave that to the existing "Clear browser leftovers" flow.
    if (!(appState.ui && appState.ui.specV2Cols)) {
      const raw = readLSRaw('aml-spec-cols');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            appState = {
              ...appState,
              ui: {
                ...(appState.ui || {}),
                specV2Cols: {
                  // Keep in sync with DEFAULT_GLOBAL_COLS in ProjectSpecV2.jsx
                  global: ['finish', 'rooms', 'supplier', 'price'],
                  byTrade: parsed,
                },
              },
            };
            appStateChanged = true;
          }
        } catch {}
      }
    }
    if (appState.seed_version == null) {
      const ver = readLSRaw('aml-seed-version');
      if (ver) {
        const n = parseInt(ver, 10);
        if (!isNaN(n)) { appState.seed_version = n; appStateChanged = true; }
      }
    }
    if (!appState.label_templates) {
      const v = readLSJson('aml-label-templates');
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        appState.label_templates = v;
        appStateChanged = true;
      }
    }

    // 4. Migrate collections. For each: if cloud is empty, try localStorage;
    //    if also empty, leave empty (Phase 5 ships the explicit seed button).
    let materials = materialsCloud;
    let projects  = projectsCloud;
    let libraries = librariesCloud;

    if (materials.length === 0) {
      const local = readLSJson('aml-materials');
      if (Array.isArray(local) && local.length > 0) {
        materials = (window.migrateMaterials || identity)(local);
        await pushAllSequential('materials', materials);
      }
    }
    if (projects.length === 0) {
      const local = readLSJson('aml-projects');
      if (Array.isArray(local) && local.length > 0) {
        projects = (window.migrateProjects || identity)(local);
        await pushAllSequential('projects', projects);
      }
    }
    if (libraries.length === 0) {
      const local = readLSJson('aml-libraries');
      if (Array.isArray(local) && local.length > 0) {
        libraries = (window.migrateLibraries || identity)(local);
        await pushAllSequential('libraries', libraries);
      }
    }

    // 5. Seed backfill for materials. Idempotent: items already in `materials`
    //    are skipped by id. Bumps appState.seed_version regardless of whether
    //    items were added so we don't run this on every load.
    if (window.SEED_VERSION != null && window.backfillMaterialsFromSeed) {
      const currentSeed = (appState.seed_version | 0);
      if (currentSeed < window.SEED_VERSION) {
        const { items, added, newSeedVer } = window.backfillMaterialsFromSeed(materials, currentSeed);
        if (added.length > 0) {
          await pushAllSequential('materials', added);
          materials = items;
        }
        if (newSeedVer !== currentSeed) {
          appState = { ...appState, seed_version: newSeedVer };
          appStateChanged = true;
        }
      }
    }

    // 6. Push singleton if anything changed.
    if (appStateChanged) {
      try {
        await window.cloud.saveAppStateNow(appState);
      } catch (err) {
        console.error('[LoadingGate] singleton migration save failed:', err);
        // Non-fatal — user can continue; future edits will retry.
      }
    }

    return { appState, materials, projects, libraries };
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  function diffCollection(oldList, newList) {
    const oldById = new Map();
    for (const item of oldList) oldById.set(item.id, item);

    const additions = [];
    const updates = [];
    for (const item of newList) {
      const old = oldById.get(item.id);
      if (!old) {
        additions.push(item);
      } else if (old !== item) {
        // React's immutable-update pattern: changed items get fresh references.
        // Reference equality is sufficient and avoids deep-equal cost.
        updates.push(item);
      }
    }

    const newIds = new Set();
    for (const item of newList) newIds.add(item.id);
    const deletions = oldList.filter(item => !newIds.has(item.id));

    return { additions, updates, deletions };
  }

  // Sequential to keep the migration burst polite to Supabase. For 200 items
  // at ~50ms/round-trip, a one-time migration takes ~10s. Acceptable.
  async function pushAllSequential(table, items) {
    for (const item of items) {
      try {
        await window.cloud.upsertItemNow(table, item.id, item);
      } catch (err) {
        console.error(`[LoadingGate] migration upsert failed: ${table}/${item.id}`, err);
        // Continue — partial migration is recoverable on next load (cloud
        // will be partially populated; remaining items still in localStorage
        // — but cloud.length > 0 means we won't re-migrate. So if any items
        // failed here, the user will lose them on reload. Worth surfacing.)
      }
    }
  }

  function collectLegacyUiKeys() {
    const ui = {};
    const view             = readLSRaw('aml-view');
    const libraryMode      = readLSRaw('aml-library-mode');
    const activeLibraryId  = readLSRaw('aml-active-library');
    const activeProjectId  = readLSRaw('aml-active-project');
    const scheduleVersion  = readLSRaw('aml-schedule-version');
    if (view)            ui.view = view;
    if (libraryMode)     ui.libraryMode = libraryMode;
    if (activeLibraryId) ui.activeLibraryId = activeLibraryId;
    if (activeProjectId) ui.activeProjectId = activeProjectId;
    if (scheduleVersion) ui.scheduleVersion = scheduleVersion;
    return ui;
  }

  function readLSJson(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function readLSRaw(key) {
    try {
      const v = localStorage.getItem(key);
      return v || null;
    } catch (e) {
      return null;
    }
  }

  function mergeWithSettingsDefaults(s) {
    const defaults = window.SETTINGS_DEFAULTS || {};
    return { ...defaults, ...(s || {}) };
  }

  function identity(x) { return x; }

  // ─────────────────────────────────────────────
  // Screens
  // ─────────────────────────────────────────────
  function SkeletonScreen() {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}>
          Loading workspace…
        </div>
      </div>
    );
  }

  function EmptyWorkspaceBanner({ setUi }) {
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;
    return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 9100,
        padding: '12px 18px',
        background: 'var(--ink)',
        color: 'var(--paper)',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14, flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(20,20,20,0.18)',
      }}>
        <span>
          Workspace is empty. Migrate browser data, import a backup, or seed
          the starter library from{' '}
          <button onClick={() => setUi({ view: 'settings' })} style={{
            background: 'transparent', border: 'none', color: 'inherit',
            textDecoration: 'underline', cursor: 'pointer', font: 'inherit', padding: 0,
          }}>Settings → Cloud</button>.
        </span>
        <button onClick={() => setDismissed(true)} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
          color: 'inherit', font: 'inherit', cursor: 'pointer',
          padding: '2px 10px', borderRadius: 2,
        }}>Dismiss</button>
      </div>
    );
  }

  function DegradedBanner() {
    return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 9200,
        padding: '8px 16px',
        background: 'rgba(197, 74, 59, 0.96)',
        color: '#fff',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(20,20,20,0.18)',
      }}>
        Offline — changes disabled.{' '}
        <button onClick={() => location.reload()} style={{
          marginLeft: 12, padding: '2px 10px',
          background: 'rgba(255,255,255,0.18)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.4)',
          fontFamily: 'inherit', fontSize: 'inherit',
          letterSpacing: 'inherit', textTransform: 'inherit',
          borderRadius: 2, cursor: 'pointer',
        }}>Retry</button>
      </div>
    );
  }

  function ErrorScreen({ error }) {
    return (
      <div style={{
        minHeight: '100vh',
        padding: 40,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper)',
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--ink-3)', marginBottom: 12,
        }}>
          Workspace failed to load
        </div>
        <div style={{
          fontSize: 14, color: 'var(--ink-2)',
          maxWidth: 480, textAlign: 'center', marginBottom: 24,
          lineHeight: 1.4,
        }}>
          {error && error.message ? error.message : String(error)}
        </div>
        <button onClick={() => location.reload()} style={{
          padding: '10px 20px',
          fontFamily: 'var(--font-sans)', fontSize: 14,
          background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 2, cursor: 'pointer',
        }}>
          Reload
        </button>
      </div>
    );
  }

  Object.assign(window, { LoadingGate, useCloudState, useProjectSchedule, useProjectSpec });
})();
