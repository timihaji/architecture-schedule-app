// src/cloud.jsx — Supabase storage layer.
//
// Exposes window.cloud with auth + CRUD + save status. Handles:
//   • Optimistic concurrency via the upsert_with_version RPC (fixes TOCTOU race).
//   • Per-key save serialization (prevents leading+trailing debounce edges from
//     racing each other on the same row).
//   • Debounced save (400ms, leading + trailing) per key.
//   • beforeunload flush via customFetch with keepalive=true.
//   • Save status bus for the chrome indicator.
//
// What stays in localStorage (per-device ephemeral prefs — NOT migrated):
//   • Supabase session (SDK-managed, unavoidable)
//   • aml-table-density, aml-dt-* (table density / column widths)
//   • aml-desktop-view, aml-gallery-sidebar, aml-kind-filter
//   • aml-cs-*, aml-cs-mode, aml-cs-rowshape (schedule/gallery filters)
//   • aml-spec-mode, aml-spec-cols (spec view + per-trade column visibility)
// Everything else (settings, ui, collections, schedules, specs) lives in Supabase.

(function () {
  if (typeof window.supabase === 'undefined') {
    console.error('[cloud] Supabase SDK not loaded — check vendor/supabase.js script tag.');
    return;
  }
  if (!window.CLOUD_CONFIG || !window.CLOUD_CONFIG.SUPABASE_URL) {
    console.error('[cloud] CLOUD_CONFIG missing — check src/cloud-config.jsx loads first.');
    return;
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.CLOUD_CONFIG;

  // ───── customFetch — sets keepalive:true while flushing on unload ─────
  // Without this, the SDK's pending fetch is killed when the tab closes,
  // and last-second edits are lost. (§16.1 #2)
  let _flushing = false;
  function customFetch(input, init) {
    const opts = init ? { ...init } : {};
    if (_flushing) opts.keepalive = true;
    return fetch(input, opts);
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: { fetch: customFetch },
  });

  // ───── Save status bus ─────
  const statusListeners = new Set();
  let _saveState = { pending: 0, lastError: null, lastSavedAt: null };
  function emitStatus(patch) {
    _saveState = { ..._saveState, ...patch };
    statusListeners.forEach(fn => { try { fn(_saveState); } catch (e) { /* listener bug */ } });
  }
  function onSaveStatus(fn) {
    statusListeners.add(fn);
    fn(_saveState);
    return () => statusListeners.delete(fn);
  }

  // ───── ConflictError ─────
  class ConflictError extends Error {
    constructor(table, id, localVersion, remoteVersion) {
      super(`conflict on ${table}:${id} — local v${localVersion} vs remote v${remoteVersion}`);
      this.name = 'ConflictError';
      this.table = table; this.id = id;
      this.localVersion = localVersion;
      this.remoteVersion = remoteVersion;
    }
  }

  // ───── Version cache (for optimistic concurrency) ─────
  const versionCache = new Map();
  const vkey = (table, id) => `${table}:${id}`;

  // ───── Per-key save serialization (§16.2 #9) ─────
  // Chains saves to the same key one after another. Without this, a leading-edge
  // save and a trailing-edge save can both pass their version check using the
  // same cached prevVersion, then the second silently overwrites the first.
  const saveChain = new Map();
  function chainedSave(key, fn) {
    const prev = saveChain.get(key) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    saveChain.set(key, next);
    next.finally(() => {
      if (saveChain.get(key) === next) saveChain.delete(key);
    });
    return next;
  }

  // ───── Debounced save (per-key, leading + trailing) ─────
  const pendingSaves = new Map(); // key → { timer, fn }

  function debouncedSave(key, fn, ms = 400) {
    const entry = pendingSaves.get(key);
    if (entry) clearTimeout(entry.timer);

    const leading = !entry;
    if (leading) runSave(key, fn);

    const timer = setTimeout(() => {
      pendingSaves.delete(key);
      if (!leading) runSave(key, fn);
    }, ms);

    pendingSaves.set(key, { timer, fn });
  }

  function runSave(key, fn) {
    emitStatus({ pending: _saveState.pending + 1 });
    chainedSave(key, fn).then(() => {
      emitStatus({
        pending: Math.max(0, _saveState.pending - 1),
        lastSavedAt: Date.now(),
        lastError: null,
      });
    }).catch(err => {
      emitStatus({
        pending: Math.max(0, _saveState.pending - 1),
        lastError: err && err.message ? err.message : String(err),
      });
    });
  }

  // ───── beforeunload flush ─────
  // Sets _flushing so customFetch flips keepalive on for the SDK's writes.
  window.addEventListener('beforeunload', () => {
    _flushing = true;
    for (const [key, { timer, fn }] of pendingSaves) {
      clearTimeout(timer);
      try { chainedSave(key, fn); } catch (e) { /* fire and forget */ }
    }
    pendingSaves.clear();
  });

  // ───── Auth ─────
  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }
  async function signOut() {
    await sb.auth.signOut();
  }
  function getSession() {
    return sb.auth.getSession().then(r => r.data.session);
  }
  function onAuth(cb) {
    sb.auth.getSession().then(r => cb(r.data.session));
    const { data } = sb.auth.onAuthStateChange((_evt, session) => cb(session));
    return data.subscription;
  }
  async function resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) throw error;
  }
  async function updatePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
  // 10s timeout — if the RPC hangs (stale token, network half-open after wake
  // from sleep), reject so the AuthGate can recover instead of spinning
  // forever on "Checking access…".
  async function isAllowedUser() {
    // PostgREST cold starts on Supabase free tier can stall the first RPC
    // for ~10–30s; subsequent calls are fast. We retry once on timeout so a
    // cold start doesn't surface as a UI-visible failure.
    async function attempt(timeoutMs) {
      const rpcPromise = sb.rpc('is_allowed_user').then(({ data, error }) => {
        if (error) throw error;
        return data === true;
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`access check timed out after ${timeoutMs}ms`)), timeoutMs)
      );
      return Promise.race([rpcPromise, timeoutPromise]);
    }
    try {
      return await attempt(15_000);
    } catch (err) {
      if (!/timed out/.test(String(err && err.message))) throw err;
      console.warn('[cloud] is_allowed_user slow on first try, retrying…');
      return attempt(20_000);
    }
  }

  // ───── Generic CRUD ─────
  async function loadCollection(table) {
    const { data, error } = await sb.from(table).select('id, data, version');
    if (error) throw error;
    data.forEach(r => versionCache.set(vkey(table, r.id), r.version));
    return data.map(r => r.data);
  }

  // §16.1 #1 — atomic version-checked upsert via RPC.
  // The RPC does SELECT ... FOR UPDATE + check + INSERT/UPDATE in one
  // transaction, so two clients at the same prevVersion can't both succeed.
  async function upsertItemNow(table, id, data) {
    if (data && data.id != null && data.id !== id) {
      throw new Error(`id mismatch: column=${id} data.id=${data.id}`);
    }
    const prevVersion = versionCache.get(vkey(table, id));
    const { data: result, error } = await sb.rpc('upsert_with_version', {
      p_table:   table,
      p_id:      id,
      p_data:    data,
      p_version: prevVersion != null ? prevVersion : null,
    });
    if (error) throw error;
    if (result && result.conflict) {
      throw new ConflictError(table, id, result.local_version, result.remote_version);
    }
    versionCache.set(vkey(table, id), result.version);
    return result.version;
  }

  function upsertItem(table, id, data) {
    debouncedSave(`${table}:${id}`, () => upsertItemNow(table, id, data));
  }

  async function deleteItem(table, id) {
    const key = `${table}:${id}`;
    const pending = pendingSaves.get(key);
    if (pending) { clearTimeout(pending.timer); pendingSaves.delete(key); }
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) throw error;
    versionCache.delete(vkey(table, id));
  }

  // ───── Singleton (app_state) ─────
  // §16.1 #3 — use .maybeSingle() so 0 rows returns null instead of throwing.
  // Caller (AuthGate via isAllowedUser) disambiguates "RLS blocked us" from
  // "fresh workspace, singleton row not seeded yet".
  async function loadAppState() {
    const { data, error } = await sb.from('app_state')
      .select('data, version')
      .eq('id', 'singleton')
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    versionCache.set(vkey('app_state', 'singleton'), data.version);
    return data.data;
  }

  async function saveAppStateNow(blob) {
    return upsertItemNow('app_state', 'singleton', { id: 'singleton', ...blob });
  }
  function saveAppState(blob) {
    debouncedSave('app_state:singleton', () => saveAppStateNow(blob));
  }

  // ───── Per-project blobs (schedules, specs) ─────
  async function loadPerProject(table, projectId) {
    const { data, error } = await sb.from(table)
      .select('data, version')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    versionCache.set(vkey(table, projectId), data.version);
    return data.data;
  }

  async function savePerProjectNow(table, projectId, payload) {
    const prevVersion = versionCache.get(vkey(table, projectId));
    const { data: result, error } = await sb.rpc('upsert_project_blob_with_version', {
      p_table:      table,
      p_project_id: projectId,
      p_data:       payload,
      p_version:    prevVersion != null ? prevVersion : null,
    });
    if (error) throw error;
    if (result && result.conflict) {
      throw new ConflictError(table, projectId, result.local_version, result.remote_version);
    }
    versionCache.set(vkey(table, projectId), result.version);
    return result.version;
  }

  function savePerProject(table, projectId, payload) {
    debouncedSave(`${table}:${projectId}`, () => savePerProjectNow(table, projectId, payload));
  }

  const loadSchedule    = projectId        => loadPerProject('schedules', projectId);
  const saveSchedule    = (projectId, data) => savePerProject('schedules', projectId, data);
  const saveScheduleNow = (projectId, data) => savePerProjectNow('schedules', projectId, data);
  const loadSpec        = projectId        => loadPerProject('specs',     projectId);
  const saveSpec        = (projectId, data) => savePerProject('specs',     projectId, data);
  const saveSpecNow     = (projectId, data) => savePerProjectNow('specs',     projectId, data);

  async function deleteSchedule(projectId) {
    const key = `schedules:${projectId}`;
    const pending = pendingSaves.get(key);
    if (pending) { clearTimeout(pending.timer); pendingSaves.delete(key); }
    const { error } = await sb.from('schedules').delete().eq('project_id', projectId);
    if (error) throw error;
    versionCache.delete(vkey('schedules', projectId));
  }
  async function deleteSpec(projectId) {
    const key = `specs:${projectId}`;
    const pending = pendingSaves.get(key);
    if (pending) { clearTimeout(pending.timer); pendingSaves.delete(key); }
    const { error } = await sb.from('specs').delete().eq('project_id', projectId);
    if (error) throw error;
    versionCache.delete(vkey('specs', projectId));
  }

  // ───── Manual flush (used by sign-out) ─────
  async function flushPending() {
    const tasks = [];
    for (const [key, { timer, fn }] of pendingSaves) {
      clearTimeout(timer);
      tasks.push(chainedSave(key, fn).catch(() => {}));
    }
    pendingSaves.clear();
    await Promise.all(tasks);
  }

  // ───── Diagnostics for the dev console ─────
  function _debugState() {
    return {
      saveState: { ..._saveState },
      pendingKeys: Array.from(pendingSaves.keys()),
      chainKeys: Array.from(saveChain.keys()),
      versionCacheSize: versionCache.size,
    };
  }

  window.cloud = {
    sb,
    signIn, signOut, getSession, onAuth, resetPassword, updatePassword,
    isAllowedUser,
    loadAppState, saveAppState, saveAppStateNow,
    loadCollection, upsertItem, upsertItemNow, deleteItem,
    loadSchedule, saveSchedule, saveScheduleNow, deleteSchedule,
    loadSpec,     saveSpec,     saveSpecNow,     deleteSpec,
    onSaveStatus,
    flushPending,
    ConflictError,
    _debugState,
  };
})();
