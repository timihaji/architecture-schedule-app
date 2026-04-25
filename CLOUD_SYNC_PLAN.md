# Claude Code Handoff — Cloud Sync via Supabase

Move all persistent app state from `localStorage` to a shared Supabase workspace so 2–3 collaborators see the same live data across machines. The export/import JSON "bandaid" stays as a manual backup.

This doc is the complete spec. Read the whole thing once before starting — the later sections contain ship-blocking requirements (concurrency safety, save observability, access control) that the architecture depends on.

---

## Goals & non-goals

### Goals
- All persistent state (settings, materials, projects, libraries, label templates, per-project schedules, per-project specs, UI prefs) lives in Supabase.
- `localStorage` is used ONLY for the Supabase session cookie (unavoidable) and a handful of truly per-device ergonomic prefs (see §9).
- Saves are fast, observable (user sees "saving…/saved/failed"), and safe against tab close.
- Two users editing different things = fine. Two users editing the SAME blob = last-write-wins but detected and surfaced, not silent.
- Offline = read-only banner, not a total brick.

### Non-goals (deferred)
- Realtime sync between simultaneously-open sessions. Manual refresh picks up changes.
- Full offline with write queue / CRDT.
- Per-user permissions within the workspace.
- Fine-grained row-level conflict resolution (we operate at blob granularity).

---

## Architecture overview

**One shared workspace.** All authenticated users see the same rows. No `user_id` partitioning.

**Hybrid schema:**
- Collections (materials, projects, libraries) = one row per entity, `data jsonb` blob holds the full object.
- Singleton (app_state) = single row, `data jsonb` blob for UI prefs + settings + seed_version.
- Per-project blobs (schedules, specs) = one row per project, `data jsonb` blob.

In-memory shapes stay identical to today, so React components barely change.

**Concurrency:** every table has a `version bigint` column. Clients send the version they read with every update; stale writes are rejected and the client reloads + notifies the user.

**Auth:** Supabase email+password. Self-signup DISABLED in the Supabase dashboard. Manual invites only.

**SDK:** Supabase JS v2, **pinned version, vendored into repo** (not CDN at runtime).

---

## Decisions locked in

1. 1 shared workspace (you + 1-2 collaborators).
2. Email + password (Supabase native). Public signup disabled.
3. Offline = read-only degraded mode (see §3), not total fail.
4. Backend = Supabase.
5. Optimistic concurrency via `version` column on every table.
6. Debounced save with `beforeunload` flush.
7. Blob is source of truth for `id`; the `id` column is an index over `data->>'id'`.
8. Seeding is explicit (button), not automatic.

---

# 1. Supabase setup

## 1.1 Create project

- Create a new Supabase project.
- In **Auth → Providers → Email**: enable email+password, **disable** "Enable new user signups" once you and your collaborators have accounts created.
- In **Auth → Users**: manually create accounts for yourself + collaborators.

## 1.2 Schema SQL

Commit this as `supabase/schema.sql`:

```sql
-- Singleton app state (settings + ui prefs + seed_version)
create table app_state (
  id text primary key default 'singleton',
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Collections
create table materials (
  id text primary key,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table projects (
  id text primary key,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table libraries (
  id text primary key,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table label_templates (
  id text primary key,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Per-project blobs
create table schedules (
  project_id text primary key,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table specs (
  project_id text primary key,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Email allowlist — second line of defence on top of disabled signup
create table allowed_emails (
  email text primary key,
  added_at timestamptz not null default now()
);

-- Helper: is the current session's email allowed?
create or replace function is_allowed_user() returns boolean as $$
  select exists (
    select 1 from allowed_emails
    where email = (select email from auth.users where id = auth.uid())
  );
$$ language sql stable security definer;

-- Updated_at + version bump trigger
create or replace function bump_version_updated_at() returns trigger as $$
begin
  new.version = coalesce(old.version, 0) + 1;
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$ language plpgsql;

create trigger _bump_app_state       before update on app_state       for each row execute function bump_version_updated_at();
create trigger _bump_materials       before update on materials       for each row execute function bump_version_updated_at();
create trigger _bump_projects        before update on projects        for each row execute function bump_version_updated_at();
create trigger _bump_libraries       before update on libraries       for each row execute function bump_version_updated_at();
create trigger _bump_label_templates before update on label_templates for each row execute function bump_version_updated_at();
create trigger _bump_schedules       before update on schedules       for each row execute function bump_version_updated_at();
create trigger _bump_specs           before update on specs           for each row execute function bump_version_updated_at();

-- Enable RLS on every table
alter table app_state       enable row level security;
alter table materials       enable row level security;
alter table projects        enable row level security;
alter table libraries       enable row level security;
alter table label_templates enable row level security;
alter table schedules       enable row level security;
alter table specs           enable row level security;
alter table allowed_emails  enable row level security;

-- RLS policies — auth + allowlisted email required
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'app_state','materials','projects','libraries','label_templates','schedules','specs'
  ])
  loop
    execute format($f$
      create policy "allowlisted_read"  on %I for select to authenticated using (is_allowed_user());
      create policy "allowlisted_write" on %I for insert to authenticated with check (is_allowed_user());
      create policy "allowlisted_update" on %I for update to authenticated using (is_allowed_user()) with check (is_allowed_user());
      create policy "allowlisted_delete" on %I for delete to authenticated using (is_allowed_user());
    $f$, t, t, t, t);
  end loop;
end$$;

-- allowed_emails visible to allowed users (so client can sanity-check)
create policy "allowlisted_read_self" on allowed_emails
  for select to authenticated using (is_allowed_user());

-- Seed the allowlist — EDIT this with your actual emails before running:
insert into allowed_emails (email) values
  ('you@example.com'),
  ('collab1@example.com'),
  ('collab2@example.com')
on conflict do nothing;

-- Seed the singleton row
insert into app_state (id, data) values ('singleton', '{}'::jsonb) on conflict do nothing;
```

**Definition of Done for §1:**
- [ ] `schema.sql` runs cleanly in a fresh Supabase project.
- [ ] 8 tables exist with RLS enabled.
- [ ] `is_allowed_user()` function exists and returns true for allowlisted users, false otherwise.
- [ ] Triggers bump `version`, `updated_at`, `updated_by` on every update.
- [ ] Manually verified: unauthenticated PostgREST request returns 401; authenticated but non-allowlisted request returns 0 rows.
- [ ] Email signup is disabled in Auth settings.
- [ ] At least one user account exists and is in `allowed_emails`.

---

# 2. Vendor the Supabase SDK

Do NOT load from CDN at runtime.

1. Download `supabase.js` (UMD build) for a pinned version, e.g. `@supabase/supabase-js@2.45.4`.
2. Save to `vendor/supabase.js`.
3. Commit the file. It's a pinned dependency.

```html
<!-- in index.html, BEFORE any app scripts -->
<script src="vendor/supabase.js"></script>
```

**Why**: CDN outage or network hiccup = app dead before it even tries to init. Vendoring removes that dependency.

**Definition of Done:**
- [ ] `vendor/supabase.js` exists; version pinned in a comment at top of the file.
- [ ] Load order verified in index.html: `vendor/supabase.js` → `src/cloud-config.jsx` → `src/cloud.jsx` → `src/AuthGate.jsx` → other app scripts.
- [ ] App loads cleanly offline-from-CDN (i.e. with `cdn.jsdelivr.net` blocked) in DevTools network throttling.

---

# 3. `src/cloud.jsx` — storage layer

Single file. Exposes `window.cloud` with the API below. Handles init, auth, CRUD, debounced saves, concurrency, save-status events, `beforeunload` flush.

## 3.1 Config file

`src/cloud-config.jsx`:

```jsx
// These are NOT secrets. The anon key is protected by RLS policies
// and the allowlist function. The SERVICE ROLE key must NEVER be committed.
window.CLOUD_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY-HERE',
};
```

## 3.2 The `cloud` module

`src/cloud.jsx` — full API:

```jsx
(function() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.CLOUD_CONFIG;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // ───── Save status bus (for toast UI) ─────
  const statusListeners = new Set();
  const pendingSaves = new Map(); // key → { timer, fn, lastArgs }
  let _saveState = { pending: 0, lastError: null, lastSavedAt: null };

  function emitStatus(patch) {
    _saveState = { ..._saveState, ...patch };
    statusListeners.forEach(fn => fn(_saveState));
  }
  function onSaveStatus(fn) {
    statusListeners.add(fn);
    fn(_saveState);
    return () => statusListeners.delete(fn);
  }

  // ───── Version cache (for optimistic concurrency) ─────
  // Keyed by `${table}:${id}`. Stores the last version we read/wrote.
  const versionCache = new Map();
  const vkey = (table, id) => `${table}:${id}`;

  // ───── Debounced save ─────
  // Per-key debounce, leading + trailing.
  function debouncedSave(key, fn, ms = 400) {
    const entry = pendingSaves.get(key);
    if (entry) clearTimeout(entry.timer);

    // Leading-edge: if nothing pending for this key, fire immediately
    const leading = !entry;
    if (leading) {
      emitStatus({ pending: _saveState.pending + 1 });
      fn().then(() => {
        emitStatus({ pending: Math.max(0, _saveState.pending - 1), lastSavedAt: Date.now(), lastError: null });
      }).catch(err => {
        emitStatus({ pending: Math.max(0, _saveState.pending - 1), lastError: err.message || String(err) });
      });
    }

    // Trailing-edge: schedule another save if edits continue
    const timer = setTimeout(() => {
      pendingSaves.delete(key);
      if (!leading) {
        emitStatus({ pending: _saveState.pending + 1 });
        fn().then(() => {
          emitStatus({ pending: Math.max(0, _saveState.pending - 1), lastSavedAt: Date.now(), lastError: null });
        }).catch(err => {
          emitStatus({ pending: Math.max(0, _saveState.pending - 1), lastError: err.message || String(err) });
        });
      }
    }, ms);
    pendingSaves.set(key, { timer, fn });
  }

  // ───── beforeunload flush ─────
  // Fire pending saves synchronously via fetch keepalive.
  window.addEventListener('beforeunload', () => {
    for (const [key, { timer, fn }] of pendingSaves) {
      clearTimeout(timer);
      // Fire and forget. fn() is an async upsert — with keepalive in fetch options
      // it survives the tab closing.
      fn().catch(() => {});
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
    // Fire once with current session
    sb.auth.getSession().then(r => cb(r.data.session));
    return sb.auth.onAuthStateChange((_evt, session) => cb(session)).data.subscription;
  }
  async function resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  }

  // ───── Generic CRUD ─────
  async function loadCollection(table) {
    const { data, error } = await sb.from(table).select('id, data, version');
    if (error) throw error;
    // Cache versions for later conflict checks
    data.forEach(r => versionCache.set(vkey(table, r.id), r.version));
    return data.map(r => r.data);
  }

  async function upsertItemNow(table, id, data) {
    // data.id is source of truth — enforce
    if (data.id && data.id !== id) {
      throw new Error(`id mismatch: column=${id} data.id=${data.id}`);
    }
    const prevVersion = versionCache.get(vkey(table, id));
    const payload = { id, data };
    // Optimistic concurrency: if we have a known version, assert it
    let query = sb.from(table).upsert(payload, { onConflict: 'id' }).select('version').single();
    if (prevVersion != null) {
      // `upsert` with a matching version — if the row exists with a different
      // version, we treat it as a conflict via a separate check.
      // Supabase upsert doesn't support version assertion directly, so use
      // update-if-match followed by insert-on-missing:
      const { data: existing, error: readErr } = await sb.from(table).select('version').eq('id', id).maybeSingle();
      if (readErr) throw readErr;
      if (existing && existing.version !== prevVersion) {
        throw new ConflictError(table, id, prevVersion, existing.version);
      }
    }
    const { data: result, error } = await query;
    if (error) throw error;
    versionCache.set(vkey(table, id), result.version);
    return result.version;
  }

  function upsertItem(table, id, data) {
    debouncedSave(`${table}:${id}`, () => upsertItemNow(table, id, data));
  }

  async function deleteItem(table, id) {
    // Flush pending save for this item first
    const key = `${table}:${id}`;
    const pending = pendingSaves.get(key);
    if (pending) { clearTimeout(pending.timer); pendingSaves.delete(key); }
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) throw error;
    versionCache.delete(vkey(table, id));
  }

  // ───── Singleton (app_state) ─────
  async function loadAppState() {
    const { data, error } = await sb.from('app_state').select('data, version').eq('id', 'singleton').single();
    if (error) throw error;
    versionCache.set(vkey('app_state', 'singleton'), data.version);
    return data.data;
  }
  async function saveAppStateNow(data) {
    return upsertItemNow('app_state', 'singleton', { id: 'singleton', ...data });
  }
  function saveAppState(data) {
    debouncedSave('app_state:singleton', () => saveAppStateNow(data));
  }

  // ───── Per-project blobs (schedules, specs) ─────
  async function loadSchedule(projectId) {
    const { data, error } = await sb.from('schedules').select('data, version').eq('project_id', projectId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    versionCache.set(vkey('schedules', projectId), data.version);
    return data.data;
  }
  async function saveScheduleNow(projectId, data) {
    const prevVersion = versionCache.get(vkey('schedules', projectId));
    if (prevVersion != null) {
      const { data: existing } = await sb.from('schedules').select('version').eq('project_id', projectId).maybeSingle();
      if (existing && existing.version !== prevVersion) {
        throw new ConflictError('schedules', projectId, prevVersion, existing.version);
      }
    }
    const { data: result, error } = await sb.from('schedules').upsert({ project_id: projectId, data }, { onConflict: 'project_id' }).select('version').single();
    if (error) throw error;
    versionCache.set(vkey('schedules', projectId), result.version);
    return result.version;
  }
  function saveSchedule(projectId, data) {
    debouncedSave(`schedules:${projectId}`, () => saveScheduleNow(projectId, data));
  }

  // loadSpec / saveSpec — identical shape to schedule. Copy the pattern.
  // [implement loadSpec, saveSpec following the schedule pattern]

  // ───── Conflict error ─────
  class ConflictError extends Error {
    constructor(table, id, localVersion, remoteVersion) {
      super(`conflict on ${table}:${id} — local v${localVersion} vs remote v${remoteVersion}`);
      this.name = 'ConflictError';
      this.table = table; this.id = id;
      this.localVersion = localVersion; this.remoteVersion = remoteVersion;
    }
  }

  // ───── Export ─────
  window.cloud = {
    signIn, signOut, getSession, onAuth, resetPassword,
    loadAppState, saveAppState,
    loadCollection, upsertItem, deleteItem,
    loadSchedule, saveSchedule,
    loadSpec: /* TODO */ null, saveSpec: /* TODO */ null,
    onSaveStatus,
    ConflictError,
  };
})();
```

**Definition of Done:**
- [ ] `window.cloud.*` API complete (signIn, signOut, onAuth, getSession, resetPassword, loadAppState, saveAppState, loadCollection, upsertItem, deleteItem, loadSchedule, saveSchedule, loadSpec, saveSpec, onSaveStatus, ConflictError).
- [ ] Debounce is per-key, leading + trailing, 400ms.
- [ ] `beforeunload` flushes all pending saves via `fetch` with `keepalive: true`.
- [ ] `versionCache` is updated on every load and every successful upsert.
- [ ] `ConflictError` thrown when local version doesn't match remote.
- [ ] `onSaveStatus` fires with `{pending, lastError, lastSavedAt}` on every state change.

---

# 4. Auth + loading gates

## 4.1 `src/AuthGate.jsx`

Wraps the whole app. Renders sign-in screen if no session, loading shim if session but not yet loaded, the app if loaded, and a degraded-mode screen if cloud init fails.

States:
- `status: 'init'` — cloud not yet contacted
- `status: 'signin'` — no session, show sign-in form
- `status: 'loading'` — session exists, LoadingGate is hydrating
- `status: 'ready'` — app renders
- `status: 'offline'` — cloud unreachable AND no session cache; show "cannot reach workspace" screen
- `status: 'degraded'` — cloud unreachable BUT we have an in-session snapshot (sessionStorage cache, see §4.4); show app in read-only mode

Sign-in form fields: Email, Password. Links: "Forgot password?" → opens reset form. **No "Sign up" button** (public signup is off).

If a non-allowlisted user successfully authenticates (possible only if an admin re-enables signup), the loadCollection calls will return 0 rows or RLS errors. Detect this: if the session exists but `loadAppState` returns no row AND the user isn't in `allowed_emails`, show "Your email isn't authorised for this workspace. Contact admin." and force sign-out.

## 4.2 `src/LoadingGate.jsx`

On mount (triggered when session becomes available):

```jsx
// Parallel load — app state + the three collections
const [appState, materials, projects, libraries, labelTemplates] = await Promise.all([
  cloud.loadAppState(),
  cloud.loadCollection('materials'),
  cloud.loadCollection('projects'),
  cloud.loadCollection('libraries'),
  cloud.loadCollection('label_templates'),
]);
```

After success, hydrate a root React context (`<CloudProvider value={...}>`) with these values + a setter per collection that wraps `cloud.upsertItem` / `cloud.deleteItem`. The `<App />` tree reads everything from context instead of initializing state from `localStorage`.

Per-project schedules/specs load LAZILY when a project is opened. NOT on initial mount.

**Important**: migrations (`migrateMaterials`, `migrateProjects`, `migrateLibraries`) run AFTER cloud load, BEFORE hydration. Same migration functions as today.

## 4.3 Race guards for per-project load

When user switches project A → B mid-load, don't let A's response overwrite B's state.

```jsx
function useProjectSchedule(projectId) {
  const [schedule, setSchedule] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    setSchedule(null); // show skeleton
    cloud.loadSchedule(projectId).then(data => {
      if (cancelled) return;
      setSchedule(data || window.SEED_SCHEDULES?.[projectId] || blankSchedule());
    });
    return () => { cancelled = true; };
  }, [projectId]);
  return [schedule, setSchedule];
}
```

Saves also guarded: every `saveSchedule` call captures `projectId` in closure. If the active project changes between state change and debounce flush, the save still goes to the correct row (`saveSchedule` keys on projectId).

## 4.4 Offline / degraded mode

Behaviour:
- On EVERY successful `cloud.load*`, stash the response in `sessionStorage` keyed by the table name. (NOT `localStorage` — sessionStorage dies on tab close so it's never stale across launches.)
- On init: if cloud init fails AND sessionStorage has a snapshot from this session, hydrate from snapshot and set `status: 'degraded'`. Show a sticky banner: "Offline — changes disabled." Disable all save buttons / editors (global flag in context: `cloudReadOnly: true`).
- On init: if cloud init fails AND no snapshot, show "Cannot reach workspace. Reconnect to continue." with a retry button.
- In degraded mode, user can STILL browse the current session's data. They just can't edit.

**Definition of Done:**
- [ ] Sign-in form: email, password, "forgot password" link, error messaging. NO "sign up" button.
- [ ] Password reset flow works end-to-end.
- [ ] LoadingGate hydrates materials/projects/libraries/labelTemplates/appState in parallel; migrations run post-load.
- [ ] LoadingGate shows a skeleton matching the app layout (not a spinner).
- [ ] Per-project loads are race-guarded (cancelled ref pattern).
- [ ] Degraded mode: cloud down + session snapshot exists = read-only banner, app browsable.
- [ ] Offline hard-fail: cloud down + no snapshot = "cannot reach workspace" screen with retry.
- [ ] Non-allowlisted user who somehow authenticates sees "not authorised" message and is signed out.

---

# 5. Refactoring existing `localStorage` call sites

## 5.1 `src/App.jsx` (the big one)

**Current (lines 102–137):**
```jsx
const [materials, setMaterials] = React.useState(() => migrateMaterials(loadLS('aml-materials', window.MATERIALS)));
// ... eight more useStates + eight persistence useEffects
```

**New:**
```jsx
const { materials, setMaterials, projects, setProjects, libraries, setLibraries,
        labelTemplates, setLabelTemplates, appState, updateAppState } = useCloud();

// `setMaterials` now: (fn) => { setLocal(fn); cloud.upsertItem('materials', item.id, item); }
// Needs to diff old vs new to detect which items changed / added / deleted.
```

The `setMaterials(list)` setter must diff:
1. New ids (not in old) → `cloud.upsertItem('materials', id, data)`
2. Changed ids (present in both but `data` reference differs) → `cloud.upsertItem`
3. Removed ids (in old, not in new) → `cloud.deleteItem('materials', id)`

Provide this as a utility `syncCollection(table, oldList, newList)` inside CloudProvider.

**Singleton UI keys** (view, libraryMode, activeLibraryId, activeProjectId, desktop-view, schedule-version, cs-mode, cs-rowshape, settings-section, kind-filter, gallery-sidebar) → read from and written to `appState.ui.<key>` via `updateAppState({ ui: { ...appState.ui, [key]: value } })`. Debounced by cloud.jsx.

**Settings** (`aml-settings` + legacy `aml-tweaks`) → becomes `appState.settings`. `saveSettings()` in `src/settings.jsx` calls `cloud.saveAppState`.

**Seed version** (`aml-seed-version`) → becomes `appState.seed_version`.

**Remove** these functions from App.jsx:
- `loadLS` — unused after refactor.
- The `localStorage.setItem` in `migrateMaterials` (line 51) — seed_version bump moves to `appState.seed_version`.
- The `localStorage.removeItem('aml-schedule-' + id)` in `onDeleteProject` (line 263) — replace with `cloud.deleteItem('schedules', id)`.
- The `Object.keys(localStorage).forEach(...)` reset handler (line 438–440) — replace with a "Reset workspace" that deletes all rows via cloud.

## 5.2 `src/settings.jsx`

Rewrite `loadSettings` to take the cloud-loaded app state instead of reading localStorage. `saveSettings` calls `cloud.saveAppState({...existingAppState, settings: s})`.

Remove the `TWEAKS_LEGACY_KEY` migration — if a user has legacy tweaks in localStorage, the one-time migration button (§8) handles it.

## 5.3 `src/CostScheduleV2.jsx` + `src/CostSchedule.jsx` + `src/ProjectSpec.jsx`

Replace sync load with the `useProjectSchedule` pattern from §4.3. Render a skeleton while `schedule === null`.

`loadScheduleV2` and `loadSchedule` keep their "try cloud → fallback to seed → fallback to blank" responsibility, but the first step is `await cloud.loadSchedule(project.id)` instead of `localStorage.getItem(...)`.

## 5.4 `src/CostScheduleTable.jsx`

`aml-cs-rowshape` → `appState.ui.cs_rowshape`.

## 5.5 `src/Library.jsx`, `src/LibraryTable.jsx`

`aml-gallery-sidebar`, `aml-kind-filter` → `appState.ui.gallery_sidebar`, `appState.ui.kind_filter`.
`aml-table-density` → keep in localStorage (per-device UI pref, acceptable exception).

## 5.6 `src/SettingsPage.jsx`

`aml-settings-section` → `appState.ui.settings_section`.

Rewire `exportAll()`: read from cloud (loadCollection on each table) and emit the same JSON shape as today.

Rewrite `handleImportFile()`: parse the JSON, push each section to cloud via a batch upsert. Show a progress bar ("Importing 142 of 284…"). Idempotent — re-running the same import doesn't duplicate, just overwrites.

Add new UI sections:
- "Migrate browser data to cloud" button (see §8).
- "Sign out" row.
- Read-only "Cloud status" row showing: signed-in email, last successful save timestamp, any current error.

## 5.7 `src/DataTable.jsx`

Column-width prefs (`aml-dt-<storageKey>`) → move to `appState.ui.dt_col_prefs[storageKey]`. Keep the localStorage fallback ONLY as a one-time migration path in §8.

**Definition of Done for §5:**
- [ ] No `localStorage.setItem` calls remain except: `aml-table-density` (§5.5) and anything the Supabase SDK itself writes for auth.
- [ ] `loadLS` function deleted from App.jsx.
- [ ] All `useState(() => localStorage...)` patterns replaced with context reads.
- [ ] All persistence `useEffect` blocks replaced with cloud save calls (debounced by cloud.jsx).
- [ ] `migrateMaterials` / `migrateProjects` / `migrateLibraries` now pure (no localStorage).
- [ ] Settings export includes all cloud collections + app state blob.
- [ ] Settings import uploads to cloud, shows progress.

---

# 6. Observability (save status UI)

**Ship-blocking.** Without this, silent failures go unnoticed for days.

## 6.1 Persistent save indicator

Top-right chrome (or wherever visible on every screen). Three states:

- **Saved** — green dot + "Saved" + timestamp "(just now / 2m ago / HH:MM)". Default state when idle.
- **Saving…** — pulsing dot + "Saving…" when `pending > 0`.
- **Failed** — red dot + "Couldn't save. [Retry]" button.

Wire via `cloud.onSaveStatus(setState)` in a component at the app root.

## 6.2 Conflict toast

When `ConflictError` thrown:

> ⚠ Someone else edited this. Your unsaved changes were not applied. [Reload]

"Reload" triggers a refetch of the affected table and resets the local state to cloud version. Do NOT silently auto-merge. User should see what happened.

## 6.3 Failed-save toast

When any non-conflict error:

> ⚠ Couldn't save "Oak flooring". [Retry] [Dismiss]

Retry re-fires the save with the current in-memory state.

**Definition of Done:**
- [ ] Save indicator visible on every screen.
- [ ] Saving / saved / failed states render correctly.
- [ ] Conflict toast appears and reload works.
- [ ] Failed-save toast appears on simulated network error and retry works.
- [ ] Test: disconnect network mid-edit, reconnect, indicator recovers.

---

# 7. Access control deep-dive

## 7.1 Supabase dashboard settings

- **Auth → Email**: enable email+password sign-in.
- **Auth → Email → Email Signup**: set to **DISABLED** once you've created all needed accounts.
- **Auth → URL Configuration**: set Site URL to your deployment URL. Password-reset emails link back here.
- **Auth → Email Templates**: customise the password reset email if you want.

## 7.2 Allowlist maintenance

To add a collaborator:
1. In Supabase dashboard → Auth → Users → Invite user (type their email, they get a magic-link invite).
2. SQL editor: `insert into allowed_emails (email) values ('new@example.com');`

To remove a collaborator:
1. SQL editor: `delete from allowed_emails where email = 'old@example.com';`
2. Supabase dashboard → Auth → Users → delete the user.

Document this runbook in `supabase/README.md`.

**Definition of Done:**
- [ ] Self-signup disabled in dashboard.
- [ ] `allowed_emails` table seeded with real emails.
- [ ] Verified: an authenticated user NOT in `allowed_emails` gets 0 rows from every table (RLS blocks them).
- [ ] Runbook documented in `supabase/README.md`.

---

# 8. One-time migration (existing data → cloud)

## 8.1 Migration button

In SettingsPage, under a new "Cloud" section:

> **Migrate browser data → cloud**
>
> Uploads everything currently in this browser's storage to the shared workspace. Safe to re-run — existing cloud data will be overwritten only by newer changes. Your browser data is NOT deleted by this action.
>
> [Start migration]

Clicking fires a modal with:
- Scanning phase: "Found 284 materials, 6 projects, 3 libraries, 4 schedules, 4 specs, 1 settings blob."
- Progress bar during upload: "Uploaded 142 of 298 items…"
- Success screen: "Migration complete. Refresh to load from cloud."

After success, the app does NOT automatically clear localStorage. A SEPARATE button below says:

> **Clear browser leftovers**
>
> Only press this after confirming your data is safe in the cloud (sign in on another device and check). This cannot be undone.
>
> [Clear localStorage]

## 8.2 What the migration handler does

```js
async function migrateLocalToCloud() {
  const scan = {
    materials: loadLS('aml-materials', []),
    projects: loadLS('aml-projects', []),
    libraries: loadLS('aml-libraries', []),
    labelTemplates: loadLS('aml-label-templates', []),
    settings: loadLS('aml-settings', null),
    ui: { /* all the individual aml-* keys, collected into one blob */ },
    schedules: { /* scan localStorage for 'aml-schedule-*' keys */ },
    specs: { /* scan for 'aml-spec-*' */ },
  };

  // Push collections
  for (const m of scan.materials) await cloud.upsertItem('materials', m.id, m);
  for (const p of scan.projects)  await cloud.upsertItem('projects', p.id, p);
  // ... etc

  // Push app_state
  await cloud.saveAppState({
    settings: scan.settings,
    ui: scan.ui,
    seed_version: loadLS('aml-seed-version', 0),
  });

  // Push per-project blobs
  for (const [projectId, data] of Object.entries(scan.schedules)) {
    await cloud.saveSchedule(projectId, data);
  }
}
```

Idempotent: re-running re-uploads the same data. Cloud versions bump but data is identical.

## 8.3 First-time seed (fresh workspace, no localStorage)

Separate flow. In SettingsPage:

> **Seed with starter library**
>
> Populates this workspace with the example projects, materials, and libraries. Only use this on a fresh workspace — running this on an existing workspace will add duplicate starter items.
>
> [Seed workspace]

Clicking pushes `window.MATERIALS`, `window.PROJECTS`, `window.LIBRARIES`, `window.DEFAULT_TEMPLATES` (the in-code seeds) up to cloud.

**IMPORTANT**: seeding is never automatic. If the cloud is empty and the user hasn't migrated / seeded, they see an empty app. A prominent banner prompts them: "Workspace is empty. Migrate browser data, import backup, or seed starter library."

**Definition of Done:**
- [ ] Migration button exists, idempotent, shows progress, non-destructive.
- [ ] "Clear localStorage" is a separate button, destructive with confirm.
- [ ] Seeding is a separate manual button, never auto-triggered.
- [ ] Empty-workspace banner surfaces the three options (migrate / import / seed).

---

# 9. What stays in localStorage

Only these:
- Supabase session cookie (SDK-managed, unavoidable).
- `aml-table-density` — per-device UI ergonomic. Table density on a 13" MBP differs from a 32" studio display.
- `aml-dt-<storageKey>` column-width prefs (DataTable per-key) — per-device. See review item #5.

Everything else goes to cloud.

Document this in `src/cloud.jsx` as a comment at the top of the file.

---

# 10. File-by-file change summary

| File | Action |
|---|---|
| `vendor/supabase.js` | **NEW** — pinned SDK vendored |
| `supabase/schema.sql` | **NEW** — full schema + RLS + allowlist |
| `supabase/README.md` | **NEW** — runbook for adding/removing users |
| `src/cloud-config.jsx` | **NEW** — URL + anon key |
| `src/cloud.jsx` | **NEW** — storage layer, auth, debounce, flush, versioning, status bus |
| `src/AuthGate.jsx` | **NEW** — sign-in / reset / offline / degraded / loading gate |
| `src/LoadingGate.jsx` | **NEW** — parallel hydration + migrations + context provider |
| `src/SaveStatusIndicator.jsx` | **NEW** — the "saving / saved / failed" chrome widget |
| `src/CloudToasts.jsx` | **NEW** — conflict + failed-save toasts |
| `src/App.jsx` | **MAJOR** — strip localStorage reads, consume cloud context, update setters to diff + push, update reset / import handlers |
| `src/settings.jsx` | **MAJOR** — loadSettings becomes pure merge; saveSettings calls cloud |
| `src/CostScheduleV2.jsx` + `src/CostScheduleV2Rows.jsx` | **MEDIUM** — async load via `useProjectSchedule`, skeleton, cloud save |
| `src/CostSchedule.jsx` | **MEDIUM** — same |
| `src/ProjectSpec.jsx` | **MEDIUM** — same |
| `src/SettingsPage.jsx` | **MEDIUM** — export/import rewired, migrate + seed buttons, sign-out, cloud status row |
| `src/CostScheduleTable.jsx` | **SMALL** — one UI pref moves to app_state |
| `src/Library.jsx`, `src/LibraryTable.jsx` | **SMALL** — two UI prefs move to app_state |
| `src/DataTable.jsx` | **SMALL** — col prefs **stay local** (review #5) |
| `index.html` | **SMALL** — 5 new script tags, wrap render in `<AuthGate>` |

---

# 11. Ship order (phased)

Each phase is shippable and reversible.

## Phase 1 — Infrastructure (no app changes yet)

1. Create Supabase project.
2. Run `schema.sql`.
3. Disable signup, create users, populate `allowed_emails`.
4. Vendor the SDK into `vendor/supabase.js`.
5. Create `src/cloud-config.jsx` with your URL/key.
6. Create `src/cloud.jsx` with the full API.
7. Create `src/AuthGate.jsx` + `src/LoadingGate.jsx` + `src/SaveStatusIndicator.jsx` + `src/CloudToasts.jsx`.
8. Wrap the app render in `<AuthGate><App /></AuthGate>` but have `App` continue to use localStorage. Sign-in works, but the app still runs off browser storage.

**Verify**: sign in / sign out / password reset all work. App loads as before (still localStorage-backed). No data moves yet.

> **Reviewer note (review item #7):** This claim is misleading. Once render is wrapped in `<AuthGate>`, the app stops working without Supabase — sign-in is now a hard gate. Choose one: (a) gate `<AuthGate>` behind a build flag (e.g. `window.CLOUD_ENABLED`) that defaults off until Phase 3, OR (b) restate the deliverable as "sign-in works and app functions post-sign-in using localStorage." Pick (b) unless you genuinely need to keep shipping un-gated builds during Phases 1–2.

## Phase 2 — Settings + app state to cloud

9. Refactor `src/settings.jsx` to read from cloud context.
10. Move the UI singleton keys (view, libraryMode, active*, etc.) into `appState.ui`.
11. Add save status indicator to chrome.

**Verify**: settings sync across two browsers. Toast fires on save. Sign in on browser B, change a setting, refresh browser A, change visible.

## Phase 3 — Collections to cloud (materials, projects, libraries, label templates)

12. Refactor App.jsx state init to consume cloud context.
13. Replace persistence useEffects with diff-and-upsert.
14. Wire deletion paths.

**Verify**: create a material on A, appears on B after refresh. Delete on B, gone on A after refresh. Simulate concurrent edit → conflict toast fires.

## Phase 4 — Per-project blobs (schedules, specs)

15. Refactor CostScheduleV2, CostSchedule, ProjectSpec to async load.
16. Add skeletons.
17. Race-guard project switches.

**Verify**: edit schedule on A, refresh on B, sees edit. Switch projects rapidly, no data leak between them.

## Phase 5 — Migration tools + degraded mode + polish

18. Add "Migrate browser data" button.
19. Add "Seed workspace" button.
20. Add "Clear browser leftovers" button.
21. Implement degraded mode (sessionStorage snapshot + read-only banner).
22. Rewire export/import to cloud.
23. Runbook documentation.

**Verify**: full migration flow on a browser with real data. Degraded mode when cloud is blocked. Export JSON matches pre-cloud shape.

## Phase 6 — Cleanup

24. Remove `loadLS` and all dead localStorage code.
25. Update any remaining per-device exceptions (§9).
26. Smoke test the entire app end-to-end with fresh cloud workspace + fresh browser.

---

# 12. Verification matrix

After all phases complete, verify each:

1. **Fresh workspace + fresh browser**: sign in → empty-workspace banner → seed → app populated. Data in Supabase SQL editor matches.
2. **Existing-data browser, fresh workspace**: sign in → migrate button → progress bar → data in cloud. Refresh: loads from cloud, not localStorage.
3. **Two browsers, one workspace**: edit material on A, refresh B, sees change.
4. **Rapid save**: type into a field for 10 seconds continuously. Save fires on leading edge, again 400ms after last keystroke. Network tab shows ~2-3 requests, not 20.
5. **Close tab mid-edit**: type, immediately close tab (⌘W). Reopen in another browser, change is saved.
6. **Concurrent edit**: open same material in A and B. Edit in A, save. Edit in B, save → conflict toast fires, B's change is not saved, B sees A's version.
7. **Project switching**: open project X's schedule, immediately click project Y. Only Y's schedule shows. No data bleed.
8. **Offline cold start**: disconnect network, load app. "Cannot reach workspace" screen. Reconnect → loads normally.
9. **Offline warm**: browse app, disconnect. Read-only banner appears. All edit affordances disabled. Reconnect → banner drops, edits re-enabled.
10. **Password reset**: click "Forgot password" → email arrives → click link → new password form → works.
11. **Non-allowlisted user**: create a user in dashboard, do NOT add to `allowed_emails`. Sign in. "Not authorised" screen. Signed out.
12. **Export JSON**: click export, JSON file contains same shape as today (materials, projects, schedules, specs, libraries, label_templates, settings).
13. **Import JSON**: delete everything in cloud, import the JSON from step 12 → everything restored.
14. **Sign out + sign back in**: no stale data leaks; app re-initializes cleanly.
15. **Third collaborator**: invite, allowlist, sign in from a third device → sees same data.

---

# 13. Gotchas & decisions documented

- **Blob is source of truth for `id`**. The `id` column is an index over `data->>'id'`. On every upsert, cloud.jsx asserts `data.id === id` and throws if not.
- **`version` is DB-maintained by trigger**. Client never sets version manually. Client only READS version to check for conflicts.
- **Debounce is leading + trailing.** First edit fires immediately; last edit in a burst fires after 400ms of quiet.
- **`beforeunload` flush uses `fetch keepalive`**. Works on all modern browsers; critical for not losing last-second edits.
- **sessionStorage vs localStorage for the offline cache**: session-only by design. Prevents stale-cache nightmare across days.
- **Migrations in App.jsx run AFTER cloud load, BEFORE hydration**. Same migration code paths as today. No schema change to existing blobs.
- **Seed version** lives in `appState.seed_version` now. The `migrateMaterials` logic that bumps it writes to cloud via `saveAppState`.
- **No realtime.** Manual refresh is the sync model. Document this in the app's help text.
- **Indexes beyond PKs are not needed.** Full-collection load is the access pattern. Client filters in-memory.
- **Rollback**: deploy prior code. All cloud tables remain; if you roll back to localStorage-only, cloud data sits untouched. Re-deploying picks up where it left off.

---

# 14. What's NOT in this plan (intentional omissions)

- Realtime subscription via Supabase channels (follow-up).
- File uploads (material images, etc.) via Supabase Storage (follow-up).
- Fine-grained row-level schema (keeping blobs is simpler and faster to ship).
- CRDTs for offline-first editing (overkill for 3 users).
- Per-user workspaces (explicitly rejected — shared workspace is the model).
- Activity log / audit trail UI (`updated_by` is captured server-side; UI can expose later).

---

# 15. Success criteria (user-visible)

After this ships:

1. You edit on laptop. Close lid. Open desktop. Open app. See the edit.
2. Collaborator signs in. Sees exactly what you see. Edits a schedule row. You refresh. See the change.
3. Save indicator in the chrome shows "Saved 3m ago." Every action is visibly acknowledged.
4. If both of you edit the same material: whoever saves second gets a "someone else edited this" toast and reloads. No silent data loss.
5. Supabase outage: you see a read-only banner. App still works for viewing. Reconnect: back to normal.
6. You forget your password. Reset flow works via email.
7. Random person finds the URL: sign-in screen, no signup button, allowlist-rejection if they somehow get an account.

---

# 16. Review notes (must-fix items folded in)

The plan above is solid overall — the phasing, allowlist-on-top-of-RLS, blob granularity, and the explicit "no automatic seeding" are all the right calls for a 3-user workspace. A few things will bite if you ship as written. **Address ship-blockers (#1–#3) and pull #9 forward before Phase 3.**

## 16.1 Ship-blockers

### #1. Optimistic-concurrency check is TOCTOU-racy

In `upsertItemNow` (§3.2) the code does `SELECT version` then `UPSERT`. Two clients at v5 can both pass the SELECT and both UPSERT; the trigger bumps to v6 for both, one silently overwrites the other. **The version column exists but isn't enforced.**

**Fix:** do an `UPDATE ... WHERE version = $prev` and check `rowCount`:
- If `rowCount === 1` → success, read back the new version.
- If `rowCount === 0` → either the row was deleted, or someone else bumped the version. Fetch to disambiguate; throw `ConflictError` if version moved.
- For brand-new inserts (no `prevVersion` cached), use plain `INSERT ... ON CONFLICT DO NOTHING` and detect collision separately.

Better still: wrap insert+update in a Postgres RPC (`upsert_with_version(table, id, data, expected_version)`) that does the check + write atomically inside one transaction. PostgREST's `Prefer: resolution=...` does NOT help here.

### #2. `beforeunload` flush is theater

`fn().catch(() => {})` in the unload handler fires a fetch whose promise is abandoned when the tab dies. **The Supabase JS SDK does NOT set `keepalive: true` on its internal fetch**, so those requests get killed. The comment "with keepalive in fetch options it survives" is aspirational.

**Fix — pick one:**
- (a) Build a `customFetch` that flips `keepalive: true` when a `flushing` flag is set, and pass it via `createClient({ global: { fetch: customFetch } })`. Set the flag in `beforeunload` before calling pending `fn()`s.
- (b) Bypass the SDK entirely on flush and `navigator.sendBeacon` a raw PostgREST call. Needs `apikey` + `Authorization: Bearer <jwt>` headers — workable but fiddly. sendBeacon is the most reliable mechanism browsers offer for unload-time delivery.

(a) is simpler if you're already on a recent SDK version.

### #3. Non-allowlisted detection path throws

`loadAppState` uses `.single()`, which throws on 0 rows. The spec says "detect this if `loadAppState` returns no row" — it won't, it'll throw with `error.code === 'PGRST116'`.

**Fix:** use `.maybeSingle()` and check for `null`, OR wrap in try/catch and inspect the error code. The "not authorised" screen path needs to handle both "RLS blocked you so you got 0 rows" and "the singleton row genuinely doesn't exist yet on a fresh workspace."

## 16.2 Issues to resolve before implementing

### #4. `loadLS` lifecycle

§5.1 says delete `loadLS`; §8.2 uses it. Migration handler needs its own scoped version, OR keep `loadLS` until Phase 5 migration ships, then delete in Phase 6. Recommend the latter — fewer moving parts.

### #5. `dt_col_prefs` doesn't belong in `app_state.ui`

Column widths are per-device — a 13" laptop and a 32" monitor want different widths. Moving to cloud means User A's resize changes User B's layout. **Keep `aml-dt-<storageKey>` local** alongside `aml-table-density`. §9 has been updated to reflect this; §5.7 and §10's DataTable row updated to "stays local."

### #6. Schedule loader fallback conflates "no row" with "network down"

§5.3's "cloud → seed → blank" ladder means a transient network error shows the seed, user edits, can't save, confusion ensues. **Split the cases:**
- `null` response (no row exists yet) → seed-or-blank, allow editing.
- Thrown error (network / RLS / server) → degraded-mode banner, do NOT render an editable state.

`useProjectSchedule` in §4.3 should propagate `error` separately from `null` data.

### #7. Phase 1 verification claim is misleading

Already noted inline at §11 Phase 1. Pick option (b) and restate the deliverable.

### #8. UMD path for the SDK

§2 says "download the UMD build" but doesn't pin the path. **Spell it out:** `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js` → save to `vendor/supabase.js`. Add a comment at the top of the vendored file with the source URL and version.

### #9. Debounce + concurrency interaction (pull forward to Phase 3)

Leading-edge save can still be in flight when trailing fires, producing two concurrent writes to the same row. Each will pass its own version check (same cached `prevVersion`), the second write bumps version; next leading call after that uses the NEW version, fine — UNTIL a remote write sneaks in between your two local writes, in which case you'll get a spurious `ConflictError`.

**Mitigation: serialize per-key saves.** Maintain a `Map<key, Promise>` and chain each save onto the previous one's resolution. Two-line fix, prevents a class of heisenbugs you'll chase for weeks. Worth doing alongside Fix #1 since both touch `upsertItemNow`.

```js
const saveChain = new Map();
function chainedSave(key, fn) {
  const prev = saveChain.get(key) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  saveChain.set(key, next);
  next.finally(() => { if (saveChain.get(key) === next) saveChain.delete(key); });
  return next;
}
```

## 16.3 Smaller refinements

### #10. No "someone else may have edited" hint for reads

The plan is explicit about no realtime, but users won't know to refresh. Add a lightweight `updated_at` check on window focus: if the cached `updated_at` for the current project's schedule has moved, show a non-modal banner — "This project was updated by Alice 8 minutes ago — [Reload]." Closes the loop cheaply without subscribing to realtime.

### #11. Seed-version migration ordering

`migrateMaterials` currently bumps `aml-seed-version` as a side effect. Moving it to `appState.seed_version` means migration now has to await a cloud save before marking done. **Make sure that's atomic** with the material writes — either:
- Run migration to completion in memory, then push (a) all materials and (b) the new seed_version in a single `Promise.all`, retry on partial failure, OR
- Use a Postgres RPC that takes both payloads and writes them in one transaction.

A crash mid-migration that has written some materials but not the seed_version will rerun the migration on next load — make sure that's idempotent (which today's migrations should already be).

### #12. `is_allowed_user()` SECURITY DEFINER footgun

Already `stable`, good. But pin `search_path` inside the function body to avoid the standard SECURITY DEFINER privilege-escalation hazard:

```sql
create or replace function is_allowed_user() returns boolean
  language sql stable security definer
  set search_path = public, auth
as $$
  select exists (
    select 1 from allowed_emails
    where email = (select email from auth.users where id = auth.uid())
  );
$$;
```

### #13. RLS policies loop is fragile

The `do $$ ... %I` block creates 28 policies via dynamic SQL. A typo in one row means a partial policy set with no error. **Add a verification query** at the bottom of `schema.sql`:

```sql
do $$
declare
  policy_count int;
begin
  select count(*) into policy_count from pg_policies
  where schemaname = 'public'
    and tablename in ('app_state','materials','projects','libraries','label_templates','schedules','specs');
  if policy_count <> 28 then
    raise exception 'expected 28 policies (4 × 7 tables), got %', policy_count;
  end if;
end$$;
```

Either this or unroll the loop and write the 28 policies explicitly.

## 16.4 What's good (keep these)

- **Blob granularity + `id`-as-index-over-`data->>'id'`** is pragmatic and keeps React untouched.
- **Allowlist on top of disabled signup** is correct defence-in-depth.
- **Three distinct buttons** for "migrate" / "seed" / "clear leftovers" avoids the classic data-loss trap.
- **Explicit `status: 'degraded' | 'offline'` split** with sessionStorage-only snapshot is the right call.
- **Phase plan is genuinely reversible** — each phase survives rollback independently.

## 16.5 Bottom line

The architecture is sound. **Fix #1 (real data loss), #2 (silent save loss on close), #3 (broken auth flow) before Phase 3.** Pull #9 (per-key serialization) forward to land alongside #1. Everything else is refinement that can be folded in during the relevant phase.
