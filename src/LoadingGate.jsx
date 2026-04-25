// src/LoadingGate.jsx — hydrates the cloud-backed app_state singleton and
// exposes it to children via React context.
//
// Runs after AuthGate confirms the user is authenticated + allowlisted.
// Renders a skeleton while loading, an error screen on failure, or the
// children wrapped in <CloudStateContext.Provider> on success.
//
// One-time silent migration: on first load, if cloud appState lacks a
// `settings` or `ui` key, copy the corresponding values from localStorage
// (aml-settings, aml-view, aml-library-mode, aml-active-library, etc.) and
// push back to cloud. Idempotent — only fills missing keys, never overwrites
// cloud data. The user's existing browser-local settings persist seamlessly.
//
// Phase 2 scope:
//   • settings  → app_state.data.settings  (full blob)
//   • ui.view, ui.libraryMode, ui.activeLibraryId, ui.activeProjectId,
//     ui.scheduleVersion  → app_state.data.ui.<key>
// Materials/projects/libraries stay localStorage-backed in Phase 2.

(function () {
  const { useState, useEffect, useCallback, useMemo, useContext, createContext } = React;

  const CloudStateContext = createContext(null);

  function LoadingGate({ children }) {
    const [appState, _setAppState] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
      let cancelled = false;
      (async () => {
        if (!window.cloud) {
          if (!cancelled) setError(new Error('Cloud module not loaded.'));
          return;
        }
        try {
          let cloudState = await window.cloud.loadAppState();
          if (!cloudState || typeof cloudState !== 'object') cloudState = {};

          const migrated = autoMigrateFromLocalStorage(cloudState);
          if (migrated.changed) {
            try {
              await window.cloud.saveAppStateNow(migrated.state);
            } catch (err) {
              console.error('[LoadingGate] one-time migration save failed:', err);
              // Continue anyway — user can keep working; future edits will save.
            }
          }
          if (cancelled) return;
          _setAppState(migrated.state);
        } catch (err) {
          console.error('[LoadingGate] loadAppState failed:', err);
          if (!cancelled) setError(err);
        }
      })();
      return () => { cancelled = true; };
    }, []);

    // Stable setters — closure-only references to _setAppState and window.cloud.
    const setSettings = useCallback((updater) => {
      _setAppState(prev => {
        const prevSettings = (prev && prev.settings) || {};
        const nextSettings = typeof updater === 'function' ? updater(prevSettings) : updater;
        const nextState = { ...(prev || {}), settings: nextSettings };
        if (window.cloud) window.cloud.saveAppState(nextState);
        return nextState;
      });
    }, []);

    const setUi = useCallback((patchOrUpdater) => {
      _setAppState(prev => {
        const prevUi = (prev && prev.ui) || {};
        const nextUi = typeof patchOrUpdater === 'function'
          ? patchOrUpdater(prevUi)
          : { ...prevUi, ...patchOrUpdater };
        const nextState = { ...(prev || {}), ui: nextUi };
        if (window.cloud) window.cloud.saveAppState(nextState);
        return nextState;
      });
    }, []);

    const ctxValue = useMemo(() => ({
      settings: mergeWithSettingsDefaults(appState && appState.settings),
      ui: (appState && appState.ui) || {},
      seedVersion: (appState && appState.seed_version) || 0,
      setSettings,
      setUi,
      _appState: appState,
    }), [appState, setSettings, setUi]);

    if (error)        return <ErrorScreen error={error} />;
    if (!appState)    return <SkeletonScreen />;

    return (
      <CloudStateContext.Provider value={ctxValue}>
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
  // One-time migration helpers
  // ─────────────────────────────────────────────
  function autoMigrateFromLocalStorage(cloudState) {
    let changed = false;
    const state = { ...cloudState };

    if (!state.settings) {
      const local = readLSJson('aml-settings');
      if (local && typeof local === 'object') {
        state.settings = local;
        changed = true;
      }
    }

    if (!state.ui) {
      const ui = {};
      const view             = readLSRaw('aml-view');
      const libraryMode      = readLSRaw('aml-library-mode');
      const activeLibraryId  = readLSRaw('aml-active-library');
      const activeProjectId  = readLSRaw('aml-active-project');
      const scheduleVersion  = readLSRaw('aml-schedule-version');

      if (view)             ui.view = view;
      if (libraryMode)      ui.libraryMode = libraryMode;
      if (activeLibraryId)  ui.activeLibraryId = activeLibraryId;
      if (activeProjectId)  ui.activeProjectId = activeProjectId;
      if (scheduleVersion)  ui.scheduleVersion = scheduleVersion;

      if (Object.keys(ui).length > 0) {
        state.ui = ui;
        changed = true;
      }
    }

    return { state, changed };
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

  Object.assign(window, { LoadingGate, useCloudState });
})();
