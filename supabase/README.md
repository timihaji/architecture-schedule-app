# Supabase Runbook

Access control for the Architecture Schedule App workspace.

## Initial setup

1. Run `schema.sql` in the Supabase SQL editor (Project → SQL Editor → New query → paste → Run).
2. In **Auth → Providers → Email**: ensure email+password is enabled.
3. In **Auth → Providers → Email**: set **"Enable new user signups"** to **OFF** once all accounts are created.
4. In **Auth → URL Configuration**: set Site URL to your deployment URL (e.g. `https://timihajnady.github.io/architecture-schedule-app`).

## Adding a collaborator

1. **Create their account** — Supabase dashboard → Authentication → Users → **Invite user** → enter their email. They receive a magic-link email to set their password.
2. **Add to allowlist** — SQL editor:
   ```sql
   insert into allowed_emails (email) values ('newperson@example.com');
   ```

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

**Browser localStorage only (per-device):**
- Supabase session cookie (SDK-managed)
- `aml-table-density` — table row density preference
- `aml-dt-*` — column width preferences per table

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
