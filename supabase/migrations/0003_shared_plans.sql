-- =============================================================================
-- Fitrack shared plans - 0003_shared_plans.sql
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query, then
-- paste + Run) AFTER 0002_profiles.sql. It backs "share a plan via link": a user
-- publishes a workout program or nutrition plan to a short code, and anyone with
-- the link /p/<code> can view it and clone it into their own app.
--
-- This is a SEPARATE public table from the per-user private sync tables: rows are
-- world-readable by design (a share link is meant to be handed out), while only
-- the owner may create or delete their own shares. `data` holds the plan JSON
-- snapshot (a Program or a nutrition Plan) as it was at share time.
-- =============================================================================

create table if not exists public.shared_plans (
  code       text primary key,
  owner      uuid references auth.users(id) on delete set null,
  kind       text not null check (kind in ('program', 'nutrition')),
  title      text not null,
  data       jsonb not null,
  created_at timestamptz default now()
);

-- Fast "my shares" lookups (listMyShares filters by owner).
create index if not exists shared_plans_owner_idx on public.shared_plans (owner);

-- -----------------------------------------------------------------------------
-- Row-Level Security: shares are public to read, owner-only to write/delete.
-- -----------------------------------------------------------------------------
alter table public.shared_plans enable row level security;

-- Anyone (including anon) with the link can read a shared plan - powers /p/<code>.
create policy shared_plans_public_read on public.shared_plans
  for select using (true);

-- Only the signed-in owner may create their own share row.
create policy shared_plans_insert_own on public.shared_plans
  for insert with check (auth.uid() = owner);

-- Only the owner may delete their own share (revoke a link).
create policy shared_plans_delete_own on public.shared_plans
  for delete using (auth.uid() = owner);
