# Supabase Runbook

Access control for the Architecture Schedule App workspace.

## Initial setup

1. Run `schema.sql` in the Supabase SQL editor (Project → SQL Editor → New query → paste → Run).
2. In **Auth → Providers → Email**: ensure email+password is enabled, **"Enable new user signups"** is **ON**, and **"Confirm email"** is **ON**. Access is gated by the `allowed_emails` table — not by the signup toggle — so leaving signups on is safe.
3. In **Auth → URL Configuration**: set Site URL and add the deployment URL to Redirect URLs (e.g. `https://timihajnady.github.io/architecture-schedule-app`) so the email confirmation link returns to the app.

## Adding a collaborator

1. **They sign themselves up** — collaborator opens the app, clicks "Create an account" on the sign-in screen, and confirms their email via the link Supabase sends them.
2. **They tell you out-of-band** that they've signed up (the app does not notify the owner).
3. **Add to allowlist** — SQL editor:
   ```sql
   insert into allowed_emails (email) values ('newperson@example.com');
   ```
4. **They sign out and back in** — until they do, they sit on the "Not authorised" screen.

## Removing a collaborator

1. **Remove from allowlist** — SQL editor (takes effect immediately, no app restart needed):
   ```sql
   delete from allowed_emails where email = 'oldperson@example.com';
   ```
2. **Delete their account** — Authentication → Users → find user → Delete.

## Current allowed users

| Email | Role |
|---|---|
| timihajnady@gmail.com | Owner |
| th@haja.com | Collaborator |

## Verifying access control

Run in SQL editor to confirm a user is (or isn't) on the allowlist:
```sql
select * from allowed_emails;
```

To confirm RLS is working: use the Supabase API explorer with an authenticated token for a user NOT in `allowed_emails` — all table queries should return 0 rows.

## What lives in Supabase vs browser

**Supabase (shared across all devices):**
- Materials, projects, libraries, label templates
- Per-project cost schedules and specs
- App settings, UI state, seed version

**Browser localStorage only (per-device ephemeral prefs):**
- Supabase session (SDK-managed, unavoidable)
- `aml-table-density`, `aml-dt-*` — table density / column widths
- `aml-desktop-view` — viewport mode toggle
- `aml-gallery-sidebar`, `aml-kind-filter` — gallery filter state
- `aml-cs-*`, `aml-cs-mode`, `aml-cs-rowshape` — schedule/gallery display filters
- `aml-spec-mode` — spec view: List vs Register (per-device preference)
- `aml-spec-cols` — legacy; migrated to `appState.ui.specV2Cols` on first load (now cloud-synced)

## Emergency: reset the workspace

To wipe all app data and start fresh (irreversible):
```sql
delete from materials;
delete from projects;
delete from libraries;
delete from label_templates;
delete from schedules;
delete from specs;
update app_state set data = '{}'::jsonb where id = 'singleton';
```
