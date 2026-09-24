-- =============================================================================
-- Fitrack sync schema — 0001_init.sql
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query, then
-- paste + Run). It provisions the per-record, last-write-wins sync backend used
-- by the local-first client.
--
-- Sync model: every syncable record is one "unit" row keyed (user_id, id):
--     data       jsonb   -- the record's serialised value
--     updated_at bigint  -- client Date.now() stamp; higher wins (LWW)
--     deleted    boolean -- tombstone flag (collections only)
--
-- Six tables. Five are collections (one row per element); `singletons` holds the
-- one-of-a-kind slices (profile/body/goals/settings/plan/notes/added/removed/
-- order/custom/activeProgramId), one row each, id = the slice key.
--
-- Row-Level Security is enabled on every table so a signed-in user can only ever
-- read or write rows tagged with their own auth.uid().
-- =============================================================================

-- Reusable table shape: (user_id, id) primary key + LWW columns + owner index.
create table if not exists public.programs (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  id         text    not null,
  data       jsonb,   -- nullable: singletons like activeProgramId can be null
  updated_at bigint  not null,
  deleted    boolean not null default false,
  primary key (user_id, id)
);
create index if not exists programs_user_updated_idx on public.programs (user_id, updated_at);

create table if not exists public.sessions (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  id         text    not null,
  data       jsonb,   -- nullable: singletons like activeProgramId can be null
  updated_at bigint  not null,
  deleted    boolean not null default false,
  primary key (user_id, id)
);
create index if not exists sessions_user_updated_idx on public.sessions (user_id, updated_at);

create table if not exists public.foods (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  id         text    not null,
  data       jsonb,   -- nullable: singletons like activeProgramId can be null
  updated_at bigint  not null,
  deleted    boolean not null default false,
  primary key (user_id, id)
);
create index if not exists foods_user_updated_idx on public.foods (user_id, updated_at);

create table if not exists public.diary (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  id         text    not null,
  data       jsonb,   -- nullable: singletons like activeProgramId can be null
  updated_at bigint  not null,
  deleted    boolean not null default false,
  primary key (user_id, id)
);
create index if not exists diary_user_updated_idx on public.diary (user_id, updated_at);

create table if not exists public.training_log (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  id         text    not null,
  data       jsonb,   -- nullable: singletons like activeProgramId can be null
  updated_at bigint  not null,
  deleted    boolean not null default false,
  primary key (user_id, id)
);
create index if not exists training_log_user_updated_idx on public.training_log (user_id, updated_at);

create table if not exists public.singletons (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  id         text    not null,
  data       jsonb,   -- nullable: singletons like activeProgramId can be null
  updated_at bigint  not null,
  deleted    boolean not null default false,
  primary key (user_id, id)
);
create index if not exists singletons_user_updated_idx on public.singletons (user_id, updated_at);

-- -----------------------------------------------------------------------------
-- Row-Level Security: a user sees and writes only their own rows.
-- One permissive "for all" policy per table covers select/insert/update/delete.
-- -----------------------------------------------------------------------------
alter table public.programs     enable row level security;
alter table public.sessions     enable row level security;
alter table public.foods        enable row level security;
alter table public.diary        enable row level security;
alter table public.training_log enable row level security;
alter table public.singletons   enable row level security;

create policy programs_owner on public.programs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy sessions_owner on public.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy foods_owner on public.foods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy diary_owner on public.diary
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy training_log_owner on public.training_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy singletons_owner on public.singletons
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Keep-alive: a tiny public table pinged daily so a Supabase free project does
-- not auto-pause after 7 idle days. A public SELECT counts as DB activity; no
-- user data is exposed (single fixed row, id = 1).
-- -----------------------------------------------------------------------------
create table if not exists public.keepalive (
  id      int primary key default 1,
  ping_at timestamptz default now()
);
insert into public.keepalive (id) values (1) on conflict (id) do nothing;
alter table public.keepalive enable row level security;
create policy "keepalive read" on public.keepalive for select using (true);
