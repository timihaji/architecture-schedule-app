-- Architecture Schedule App — Supabase Schema
-- Run this once in a fresh Supabase project via the SQL editor.
-- All §16 ship-blocker fixes are baked in (§16.1 #1, #3, §16.2 #12, #13).

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

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

-- ─────────────────────────────────────────────
-- Allowlist check function
-- §16.2 #12: pin search_path to prevent SECURITY DEFINER privilege escalation
-- ─────────────────────────────────────────────
create or replace function is_allowed_user() returns boolean
  language sql stable security definer
  set search_path = public, auth
as $$
  select exists (
    select 1 from allowed_emails
    where email = (select email from auth.users where id = auth.uid())
  );
$$;

-- ─────────────────────────────────────────────
-- Version + updated_at trigger
-- ─────────────────────────────────────────────
create or replace function bump_version_updated_at() returns trigger as $$
begin
  new.version    = coalesce(old.version, 0) + 1;
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

-- ─────────────────────────────────────────────
-- Atomic version-checked upsert RPC
-- §16.1 #1: fixes the TOCTOU race in the original plan's SELECT-then-UPSERT.
-- This function does the version check + write in a single transaction.
-- Called by cloud.jsx instead of the JS-side SELECT + UPSERT pattern.
-- ─────────────────────────────────────────────
create or replace function upsert_with_version(
  p_table   text,
  p_id      text,
  p_data    jsonb,
  p_version bigint  -- pass NULL for a brand-new insert (no version check)
) returns jsonb
  language plpgsql security definer
  set search_path = public, auth
as $$
declare
  current_version bigint;
  new_version     bigint;
begin
  -- Lock the row for the duration of this transaction
  execute format('select version from %I where id = $1 for update', p_table)
    into current_version using p_id;

  if current_version is null then
    -- Row does not exist yet — insert
    execute format(
      'insert into %I (id, data) values ($1, $2) returning version',
      p_table
    ) into new_version using p_id, p_data;

  elsif p_version is not null and current_version <> p_version then
    -- Version mismatch — conflict
    return jsonb_build_object(
      'conflict', true,
      'local_version', p_version,
      'remote_version', current_version
    );

  else
    -- Update (trigger bumps version)
    execute format(
      'update %I set data = $1 where id = $2 returning version',
      p_table
    ) into new_version using p_data, p_id;
  end if;

  return jsonb_build_object('version', new_version);
end;
$$;

-- Per-project variant for schedules / specs (keyed on project_id, not id)
create or replace function upsert_project_blob_with_version(
  p_table      text,   -- 'schedules' or 'specs'
  p_project_id text,
  p_data       jsonb,
  p_version    bigint
) returns jsonb
  language plpgsql security definer
  set search_path = public, auth
as $$
declare
  current_version bigint;
  new_version     bigint;
begin
  execute format('select version from %I where project_id = $1 for update', p_table)
    into current_version using p_project_id;

  if current_version is null then
    execute format(
      'insert into %I (project_id, data) values ($1, $2) returning version',
      p_table
    ) into new_version using p_project_id, p_data;

  elsif p_version is not null and current_version <> p_version then
    return jsonb_build_object(
      'conflict', true,
      'local_version', p_version,
      'remote_version', current_version
    );

  else
    execute format(
      'update %I set data = $1 where project_id = $2 returning version',
      p_table
    ) into new_version using p_data, p_project_id;
  end if;

  return jsonb_build_object('version', new_version);
end;
$$;

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
alter table app_state       enable row level security;
alter table materials       enable row level security;
alter table projects        enable row level security;
alter table libraries       enable row level security;
alter table label_templates enable row level security;
alter table schedules       enable row level security;
alter table specs           enable row level security;
alter table allowed_emails  enable row level security;

-- RLS policies for the 7 main tables — allowlisted authenticated users only
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'app_state','materials','projects','libraries','label_templates','schedules','specs'
  ])
  loop
    execute format($f$
      create policy "allowlisted_read"   on %I for select to authenticated using      (is_allowed_user());
      create policy "allowlisted_insert" on %I for insert to authenticated with check (is_allowed_user());
      create policy "allowlisted_update" on %I for update to authenticated using      (is_allowed_user()) with check (is_allowed_user());
      create policy "allowlisted_delete" on %I for delete to authenticated using      (is_allowed_user());
    $f$, t, t, t, t);
  end loop;
end$$;

-- allowed_emails readable by allowlisted users only
create policy "allowlisted_read_self" on allowed_emails
  for select to authenticated using (is_allowed_user());

-- ─────────────────────────────────────────────
-- §16.2 #13: Verify policy count before finishing
-- Raises an exception (aborting the transaction) if any policy is missing.
-- ─────────────────────────────────────────────
do $$
declare
  policy_count int;
begin
  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('app_state','materials','projects','libraries','label_templates','schedules','specs');

  if policy_count <> 28 then
    raise exception 'RLS policy count mismatch — expected 28 (4 × 7 tables), got %. Check for errors above.', policy_count;
  end if;
end$$;

-- ─────────────────────────────────────────────
-- Seed data
-- ─────────────────────────────────────────────

-- EDIT these with real emails before running:
insert into allowed_emails (email) values
  ('timihajnady@gmail.com'),
  ('th@haja.com')
on conflict do nothing;

-- Seed the singleton row
insert into app_state (id, data) values ('singleton', '{}'::jsonb) on conflict do nothing;
