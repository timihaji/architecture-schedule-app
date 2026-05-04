// CloudSettings — Cloud and Data sections.

function DataButton({ children, onClick, danger, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={'st-data-btn' + (danger ? ' danger' : '')}>
      {children}
    </button>
  );
}

function formatRelativeTime(ts) {
  const ms = Date.now() - ts;
  const s = Math.round(ms / 1000);
  if (s < 5)    return 'just now';
  if (s < 60)   return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24)   return `${h}h ago`;
  return new Date(ts).toLocaleString();
}

// Account chrome, manual migrate / seed / clear actions, sign-out.
// Migration is idempotent — only fills cloud rows that don't yet exist;
// never overwrites cloud data with stale localStorage data.
function CloudSection({ materials, projects, libraries, labelTemplates }) {
  const { useState, useEffect } = React;
  const [email, setEmail] = useState('');
  const [saveState, setSaveState] = useState({ pending: 0, lastError: null, lastSavedAt: null });
  const [busy, setBusy] = useState(null);          // 'migrate' | 'seed' | 'clear' | 'signout' | null
  const [progress, setProgress] = useState(null);  // { kind, line, total, current }
  const [done, setDone] = useState(null);          // { kind, summary } | null
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!window.cloud) return;
    window.cloud.getSession().then(s => {
      if (s && s.user) setEmail(s.user.email || '');
    });
    return window.cloud.onSaveStatus(setSaveState);
  }, []);

  function reset() { setProgress(null); setDone(null); setErr(null); }

  async function onMigrate() {
    if (!window.cloud) return;
    if (!window.confirm(
      'Migrate everything in this browser to the shared workspace? Cloud data ' +
      'is not overwritten — only items missing from cloud get inserted. ' +
      'Your browser data is not deleted.')) return;
    reset(); setBusy('migrate');
    try {
      const result = await migrateBrowserToCloud();
      setDone({ kind: 'migrate', summary: result });
    } catch (e) {
      setErr(e.message || String(e));
    } finally { setBusy(null); setProgress(null); }
  }

  async function onSeed() {
    if (!window.cloud) return;
    if (!window.confirm(
      'Seed the workspace with the starter library? This adds the example ' +
      'projects, materials, and libraries. Running on a workspace that already ' +
      'has these starter items will create duplicates if you have edited them.')) return;
    reset(); setBusy('seed');
    try {
      const result = await seedWorkspace();
      setDone({ kind: 'seed', summary: result });
    } catch (e) {
      setErr(e.message || String(e));
    } finally { setBusy(null); setProgress(null); }
  }

  function onClear() {
    if (!window.confirm(
      'Remove all aml-* keys from this browser\'s localStorage? Use this ONLY ' +
      'after you\'ve confirmed your data is safely in the cloud (sign in on ' +
      'another device and check). This cannot be undone.')) return;
    reset(); setBusy('clear');
    try {
      const removed = clearLegacyLocalStorage();
      setDone({ kind: 'clear', summary: { removed } });
    } catch (e) {
      setErr(e.message || String(e));
    } finally { setBusy(null); }
  }

  async function onSignOut() {
    if (!window.cloud) return;
    if (!window.confirm('Sign out of this device?')) return;
    setBusy('signout');
    try { await window.cloud.flushPending(); } catch {}
    try { await window.cloud.signOut(); } catch (e) { setErr(e.message || String(e)); }
    setBusy(null);
  }

  async function migrateBrowserToCloud() {
    const summary = { settings: 0, ui: 0, seedVersion: 0, labelTemplates: 0,
      materials: 0, projects: 0, libraries: 0, schedules: 0 };

    setProgress({ line: 'Reading workspace from cloud…' });
    const appStateCloud = (await window.cloud.loadAppState()) || {};
    const materialsCloud = await window.cloud.loadCollection('materials');
    const projectsCloud  = await window.cloud.loadCollection('projects');
    const librariesCloud = await window.cloud.loadCollection('libraries');

    const appPatch = { ...appStateCloud };
    let appChanged = false;

    setProgress({ line: 'Reading legacy keys from localStorage…' });
    const lsSettings = readLSJson('aml-settings');
    if (lsSettings && !appStateCloud.settings) {
      appPatch.settings = lsSettings; appChanged = true; summary.settings = 1;
    }
    const ui = collectLegacyUiKeys();
    if (Object.keys(ui).length > 0 && !appStateCloud.ui) {
      appPatch.ui = ui; appChanged = true; summary.ui = Object.keys(ui).length;
    }
    const seedVer = readLSRaw('aml-seed-version');
    if (seedVer != null && appStateCloud.seed_version == null) {
      const n = parseInt(seedVer, 10);
      if (!isNaN(n)) { appPatch.seed_version = n; appChanged = true; summary.seedVersion = 1; }
    }
    const lsTpl = readLSJson('aml-label-templates');
    if (lsTpl && typeof lsTpl === 'object' && !Array.isArray(lsTpl)
        && !appStateCloud.label_templates) {
      appPatch.label_templates = lsTpl; appChanged = true; summary.labelTemplates = 1;
    }
    if (appChanged) {
      setProgress({ line: 'Saving workspace settings…' });
      await window.cloud.saveAppStateNow(appPatch);
    }

    const cloudHasId = (list, id) => list.some(x => x.id === id);

    const lsMaterials = readLSJson('aml-materials');
    if (Array.isArray(lsMaterials)) {
      const todo = lsMaterials.filter(m => !cloudHasId(materialsCloud, m.id));
      for (let i = 0; i < todo.length; i++) {
        setProgress({ line: 'Uploading materials…', current: i + 1, total: todo.length });
        await window.cloud.upsertItemNow('materials', todo[i].id, todo[i]);
      }
      summary.materials = todo.length;
    }
    const lsProjects = readLSJson('aml-projects');
    if (Array.isArray(lsProjects)) {
      const todo = lsProjects.filter(p => !cloudHasId(projectsCloud, p.id));
      for (let i = 0; i < todo.length; i++) {
        setProgress({ line: 'Uploading projects…', current: i + 1, total: todo.length });
        await window.cloud.upsertItemNow('projects', todo[i].id, todo[i]);
      }
      summary.projects = todo.length;
    }
    const lsLibraries = readLSJson('aml-libraries');
    if (Array.isArray(lsLibraries)) {
      const todo = lsLibraries.filter(l => !cloudHasId(librariesCloud, l.id));
      for (let i = 0; i < todo.length; i++) {
        setProgress({ line: 'Uploading libraries…', current: i + 1, total: todo.length });
        await window.cloud.upsertItemNow('libraries', todo[i].id, todo[i]);
      }
      summary.libraries = todo.length;
    }

    const finalProjects = lsProjects || projectsCloud.map(r => r);
    for (let i = 0; i < finalProjects.length; i++) {
      const p = finalProjects[i];
      setProgress({ line: 'Uploading schedules…', current: i + 1, total: finalProjects.length });
      const lsSched = readLSJson('aml-schedule-' + p.id);
      if (lsSched) {
        const existing = await window.cloud.loadSchedule(p.id);
        if (!existing) {
          await window.cloud.saveScheduleNow(p.id, lsSched);
          summary.schedules++;
        }
      }
    }

    return summary;
  }

  async function seedWorkspace() {
    const summary = { materials: 0, projects: 0, libraries: 0, schedules: 0 };
    const seeds = {
      materials: window.MATERIALS || [],
      projects:  window.PROJECTS  || [],
      libraries: window.LIBRARIES || [],
      schedules: window.SEED_SCHEDULES || {},
    };
    const tpl = window.DEFAULT_TEMPLATES;
    if (tpl) {
      setProgress({ line: 'Seeding label templates…' });
      const cur = (await window.cloud.loadAppState()) || {};
      await window.cloud.saveAppStateNow({ ...cur, label_templates: tpl });
    }
    for (let i = 0; i < seeds.materials.length; i++) {
      setProgress({ line: 'Seeding materials…', current: i + 1, total: seeds.materials.length });
      const m = seeds.materials[i];
      await window.cloud.upsertItemNow('materials', m.id, m);
      summary.materials++;
    }
    for (let i = 0; i < seeds.projects.length; i++) {
      setProgress({ line: 'Seeding projects…', current: i + 1, total: seeds.projects.length });
      const p = seeds.projects[i];
      await window.cloud.upsertItemNow('projects', p.id, p);
      summary.projects++;
    }
    for (let i = 0; i < seeds.libraries.length; i++) {
      setProgress({ line: 'Seeding libraries…', current: i + 1, total: seeds.libraries.length });
      const l = seeds.libraries[i];
      await window.cloud.upsertItemNow('libraries', l.id, l);
      summary.libraries++;
    }
    const schedIds = Object.keys(seeds.schedules);
    for (let i = 0; i < schedIds.length; i++) {
      setProgress({ line: 'Seeding schedules…', current: i + 1, total: schedIds.length });
      await window.cloud.saveScheduleNow(schedIds[i], seeds.schedules[schedIds[i]]);
      summary.schedules++;
    }
    return summary;
  }

  function clearLegacyLocalStorage() {
    let count = 0;
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('aml-')) { localStorage.removeItem(k); count++; }
      }
    } catch {}
    return count;
  }

  function collectLegacyUiKeys() {
    const uiMap = {};
    const map = [
      ['aml-view', 'view'],
      ['aml-library-mode', 'libraryMode'],
      ['aml-active-library', 'activeLibraryId'],
      ['aml-active-project', 'activeProjectId'],
      ['aml-schedule-version', 'scheduleVersion'],
    ];
    map.forEach(([lsKey, uiKey]) => {
      const v = readLSRaw(lsKey);
      if (v) uiMap[uiKey] = v;
    });
    return uiMap;
  }
  function readLSJson(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  function readLSRaw(key) {
    try { return localStorage.getItem(key) || null; } catch { return null; }
  }

  // ───── Render ─────
  const lastSavedLabel = saveState.lastSavedAt
    ? formatRelativeTime(saveState.lastSavedAt)
    : '—';

  return (
    <section style={{ maxWidth: 720 }}>
      <SectionHeader kicker="09" title="Cloud" subtitle={
        'Workspace sync. All persistent data lives in the shared Supabase ' +
        'workspace; this page surfaces account info and one-time migration ' +
        'tools for moving legacy browser data into the cloud.'} />

      <SubsectionHeader>Account</SubsectionHeader>
      <SettingRow label="Signed in as" description="The email associated with this device's session.">
        <span style={{ ...ui.mono, fontSize: 12, color: 'var(--ink-2)' }}>{email || '—'}</span>
      </SettingRow>
      <SettingRow label="Last save" description="When this device most recently completed a cloud write.">
        <span style={{ ...ui.mono, fontSize: 12, color: saveState.lastError ? '#c54a3b' : 'var(--ink-2)' }}>
          {saveState.lastError ? 'Failed: ' + saveState.lastError : lastSavedLabel}
        </span>
      </SettingRow>
      <SettingRow label="Sign out" description="Ends this device's session. Cloud data is unaffected.">
        <DataButton onClick={onSignOut} disabled={busy === 'signout'}>
          {busy === 'signout' ? 'Signing out…' : 'Sign out'}
        </DataButton>
      </SettingRow>

      <SubsectionHeader>Migration</SubsectionHeader>
      <SettingRow
        label="Migrate browser data → cloud"
        description={
          'Uploads everything in this browser\'s localStorage to the shared ' +
          'workspace. Safe to re-run — only inserts items missing from cloud, ' +
          'never overwrites. Your browser data is NOT deleted by this action.'}>
        <DataButton onClick={onMigrate} disabled={!!busy}>
          {busy === 'migrate' ? 'Migrating…' : 'Start migration'}
        </DataButton>
      </SettingRow>

      <SubsectionHeader>Workspace</SubsectionHeader>
      <SettingRow
        label="Seed workspace"
        description={
          'Populates this workspace with the example projects, materials, ' +
          'and libraries. Only use on a fresh workspace — running on an ' +
          'existing workspace will add duplicates if you have edited the ' +
          'starter items.'}>
        <DataButton onClick={onSeed} disabled={!!busy}>
          {busy === 'seed' ? 'Seeding…' : 'Seed workspace'}
        </DataButton>
      </SettingRow>
      <SettingRow
        label="Clear browser leftovers"
        description={
          'Removes all aml-* keys from this browser\'s localStorage. Use ' +
          'after confirming your data is safely in the cloud (sign in on ' +
          'another device and check). This cannot be undone.'}>
        <DataButton onClick={onClear} danger disabled={!!busy}>
          {busy === 'clear' ? 'Clearing…' : 'Clear localStorage'}
        </DataButton>
      </SettingRow>

      {(progress || done || err) && (
        <div style={{
          marginTop: 28, padding: '14px 18px',
          background: err ? 'rgba(197, 74, 59, 0.08)' : 'var(--tint)',
          border: '1px solid ' + (err ? 'rgba(197, 74, 59, 0.3)' : 'var(--rule)'),
          fontSize: 13, lineHeight: 1.5,
        }}>
          {progress && (
            <div style={{ ...ui.mono, fontSize: 11, color: 'var(--ink-3)',
              letterSpacing: '0.08em' }}>
              {progress.line}{progress.total
                ? ` (${progress.current} / ${progress.total})` : ''}
            </div>
          )}
          {done && (
            <div>
              <div style={{ ...ui.mono, fontSize: 11, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
                {done.kind === 'migrate' && 'Migration complete'}
                {done.kind === 'seed' && 'Seed complete'}
                {done.kind === 'clear' && 'Cleared'}
              </div>
              <div style={{ color: 'var(--ink-2)' }}>
                {done.kind === 'clear'
                  ? `Removed ${done.summary.removed} key${done.summary.removed === 1 ? '' : 's'} from localStorage.`
                  : Object.entries(done.summary)
                      .filter(([_, v]) => v > 0)
                      .map(([k, v]) => `${v} ${k}`).join(' · ') || 'Nothing to do — cloud already populated.'}
              </div>
              <div style={{ marginTop: 10 }}>
                <DataButton onClick={() => location.reload()}>
                  Refresh app
                </DataButton>
              </div>
            </div>
          )}
          {err && (
            <div>
              <div style={{ ...ui.mono, fontSize: 11, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#c54a3b', marginBottom: 6 }}>
                Failed
              </div>
              <div style={{ color: '#7a2412' }}>{err}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DataSection({ settings, materials, projects, libraries, labelTemplates,
  setSettings, onRestoreSeed, onImport }) {
  const fileRef = React.useRef();
  const [importMsg, setImportMsg] = React.useState(null);

  const cs = window.useCloudState();
  const appState = cs._appState || {};
  const schemaVersion = appState.schemaVersion | 0;
  const migrations = Array.isArray(appState.migrations) ? appState.migrations : [];
  const [migMsg, setMigMsg] = React.useState(null);
  const [migBusy, setMigBusy] = React.useState(false);

  async function runDryRun() {
    if (!window.migrateV4) {
      setMigMsg({ kind: 'err', msg: 'migrateV4 not loaded.' });
      return;
    }
    setMigBusy(true); setMigMsg(null);
    try {
      const result = await window.migrateV4.runDry({
        appState, materials, projects, libraries,
        loadSpec:     () => Promise.resolve(null),
        loadSchedule: (id) => window.cloud.loadSchedule(id),
      });
      setMigMsg({ kind: 'ok',
        msg: 'Dry run complete. Two JSONs downloaded (before + after). Counts: ' +
          Object.entries(result.summary).map(([k,v]) => `${k}=${v}`).join(', ') });
    } catch (err) {
      setMigMsg({ kind: 'err', msg: 'Dry run failed: ' + (err.message || err) });
    } finally {
      setMigBusy(false);
    }
  }

  async function downloadSnapshot() {
    if (!window.migrateV4) {
      setMigMsg({ kind: 'err', msg: 'migrateV4 not loaded.' });
      return;
    }
    setMigBusy(true); setMigMsg(null);
    try {
      await window.migrateV4.snapshot({
        appState, materials, projects, libraries,
        loadSpec:     () => Promise.resolve(null),
        loadSchedule: (id) => window.cloud.loadSchedule(id),
        label: 'manual',
      });
      setMigMsg({ kind: 'ok', msg: 'Snapshot downloaded.' });
    } catch (err) {
      setMigMsg({ kind: 'err', msg: 'Snapshot failed: ' + (err.message || err) });
    } finally {
      setMigBusy(false);
    }
  }

  async function rerunLive() {
    if (!window.migrateV4) {
      setMigMsg({ kind: 'err', msg: 'migrateV4 not loaded.' });
      return;
    }
    if (!window.confirm(
      'Re-run the v4 migration against your current workspace?\n\n' +
      'A snapshot JSON will be auto-downloaded before any cloud writes. ' +
      'The migration is idempotent (safe to re-run), and will reload the ' +
      'page on success so the new schema is hydrated cleanly.')) return;
    setMigBusy(true); setMigMsg(null);
    try {
      const result = await window.migrateV4.runLive({
        appState, materials, projects, libraries,
        loadSpec:        () => Promise.resolve(null),
        loadSchedule:    (id) => window.cloud.loadSchedule(id),
        saveSchedule:    (id, data) => window.cloud.saveScheduleNow(id, data),
        upsertItem:      (table, id, item) => window.cloud.upsertItemNow(table, id, item),
        saveAppStateNow: (blob) => window.cloud.saveAppStateNow(blob),
      });
      setMigMsg({ kind: 'ok',
        msg: 'Migration complete. Reloading… Counts: ' +
          Object.entries(result.summary).map(([k,v]) => `${k}=${v}`).join(', ') });
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      setMigMsg({ kind: 'err', msg: 'Migration failed: ' + (err.message || err) +
        ' — workspace remains at v' + schemaVersion + '. Pre-migration snapshot was downloaded.' });
    } finally {
      setMigBusy(false);
    }
  }

  async function exportAll() {
    const schedules = {};
    if (window.cloud && Array.isArray(projects)) {
      const tasks = [];
      for (const p of projects) {
        tasks.push(
          window.cloud.loadSchedule(p.id).then(s => { if (s) schedules[p.id] = s; })
            .catch(err => console.error('[exportAll] schedule load failed:', p.id, err))
        );
      }
      await Promise.all(tasks);
    }

    const payload = {
      _type: 'hollis-arne-archive',
      _version: 2,
      _exportedAt: new Date().toISOString(),
      settings, materials, projects, libraries, labelTemplates,
      schedules,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)],
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'hollis-arne-archive-' + stamp + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data._type !== 'hollis-arne-archive') {
          setImportMsg({ kind: 'err', msg: 'That file does not look like an archive export.' });
          return;
        }
        if (!window.confirm(
          'Import will replace your current materials, projects, libraries, ' +
          'label templates and settings. Continue?')) return;
        onImport(data);
        setImportMsg({ kind: 'ok', msg: 'Imported. Your archive has been replaced.' });
      } catch (err) {
        setImportMsg({ kind: 'err', msg: 'Could not parse file: ' + err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function resetSettingsOnly() {
    if (!window.confirm('Reset ALL settings to factory defaults? ' +
      'Your materials, projects, and libraries are not affected.')) return;
    setSettings(window.resetSettings());
  }

  return (
    <>
      <SectionHeader kicker="10" title="Data"
        subtitle="Back up, restore, or reset the archive. Everything lives in your browser — export regularly." />

      <SettingRow label="Export archive"
        description="Download a complete JSON snapshot — materials, projects, libraries, label templates, and settings.">
        <DataButton onClick={exportAll}>Download JSON</DataButton>
        <div style={{ marginTop: 8, ...ui.mono, fontSize: 10,
          color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
          {materials.length} materials · {projects.length} projects · {libraries.length} libraries
        </div>
      </SettingRow>

      <SettingRow label="Import archive"
        description="Restore a previously exported JSON file. This replaces all current data.">
        <input ref={fileRef} type="file" accept="application/json,.json"
          onChange={handleImportFile} style={{ display: 'none' }} />
        <DataButton onClick={() => fileRef.current.click()}>Choose file…</DataButton>
        {importMsg && (
          <div style={{
            marginTop: 10, padding: '8px 12px',
            borderLeft: '2px solid ' + (importMsg.kind === 'ok' ? 'var(--accent)' : 'var(--ink)'),
            background: 'var(--tint)',
            fontFamily: "'Newsreader', var(--font-serif, serif)",
            fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)',
          }}>{importMsg.msg}</div>
        )}
      </SettingRow>

      <SubsectionHeader>Schema migrations</SubsectionHeader>

      <SettingRow label="Current schema version"
        description="The data shape your workspace currently uses. v4 introduces productType, extras, schedule rows, rooms, and the taxonomies singleton.">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
          v{schemaVersion || 3}
        </span>
        {schemaVersion < 4 && (
          <span style={{ marginLeft: 12, ...ui.mono, fontSize: 10,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>
            v4 migration available
          </span>
        )}
      </SettingRow>

      <SettingRow label="Migration history"
        description="Past schema migrations and their row counts.">
        {migrations.length === 0 ? (
          <span style={{ color: 'var(--ink-4)', fontStyle: 'italic',
            fontFamily: "'Newsreader', var(--font-serif, serif)", fontSize: 13 }}>
            No migrations have run on this workspace.
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {migrations.map((m, i) => (
              <div key={i} style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--ink-3)', letterSpacing: '0.04em',
                paddingLeft: 10,
                borderLeft: '2px solid ' + (m.error ? 'var(--accent)' : 'var(--rule-2)'),
              }}>
                <strong style={{ color: 'var(--ink)' }}>v{m.version}</strong>
                {' · '}{new Date(m.ranAt).toLocaleString()}
                {' · '}{(m.mode || 'live').toUpperCase()}
                {m.counts && (
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                    {Object.entries(m.counts).map(([k, v]) => `${k}:${v}`).join(' · ')}
                  </div>
                )}
                {m.error && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                    Error: {m.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SettingRow>

      <SettingRow label="Dry-run v4 migration"
        description="Loads everything from cloud, runs the migration in memory, downloads two JSONs (before + after) for inspection. Writes nothing to cloud or localStorage.">
        <DataButton onClick={runDryRun} disabled={migBusy}>
          {migBusy ? 'Running…' : 'Dry-run v4…'}
        </DataButton>
      </SettingRow>

      <SettingRow label="Download snapshot"
        description="Save a JSON backup of the current workspace state — same payload as Export archive, but labelled as a snapshot.">
        <DataButton onClick={downloadSnapshot} disabled={migBusy}>
          {migBusy ? 'Working…' : 'Download snapshot'}
        </DataButton>
      </SettingRow>

      {schemaVersion < 4 && (
        <SettingRow label="Re-run v4 migration"
          description="Re-runs the live migration against the current workspace. Idempotent. A snapshot JSON is auto-downloaded before any cloud writes. The page reloads on success.">
          <DataButton danger onClick={rerunLive} disabled={migBusy}>
            {migBusy ? 'Migrating…' : 'Re-run v4 migration…'}
          </DataButton>
        </SettingRow>
      )}

      {migMsg && (
        <SettingRow label="" description="">
          <div style={{
            padding: '8px 12px',
            borderLeft: '2px solid ' + (migMsg.kind === 'ok' ? 'var(--accent)' : 'var(--ink)'),
            background: 'var(--tint)',
            fontFamily: "'Newsreader', var(--font-serif, serif)",
            fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)',
          }}>{migMsg.msg}</div>
        </SettingRow>
      )}

      <SubsectionHeader>Reset</SubsectionHeader>

      <SettingRow label="Reset settings only"
        description="Restore appearance, typography, density and defaults to factory. Your materials and projects are preserved.">
        <DataButton onClick={resetSettingsOnly}>Reset settings</DataButton>
      </SettingRow>

      <SettingRow label="Restore seed library"
        description="Wipe all materials, projects and libraries and reinstall the original seed archive. Cannot be undone.">
        <DataButton danger onClick={onRestoreSeed}>Restore seed…</DataButton>
      </SettingRow>
    </>
  );
}

Object.assign(window, { CloudSection, DataSection });
