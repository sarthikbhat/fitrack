-- =============================================================================
-- Fitrack follows - 0004_follows.sql
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query, then
-- paste + Run) AFTER 0003_shared_plans.sql. It backs the social "follow" graph:
-- one row per (follower → followee) directed edge. This powers the Follow /
-- Following toggle on the public profile page, follower / following counts, and
-- the "Find people" search-and-follow flow.
--
-- The follow graph is PUBLIC by design (follower/following counts and edges are
-- visible to everyone, signed-in or anon), so SELECT is open. Writes are strictly
-- owner-scoped: you may only create or remove edges where YOU are the follower.
-- A composite primary key makes a follow idempotent (no duplicate edges), and a
-- check constraint forbids following yourself.
-- =============================================================================

create table if not exists public.follows (
  follower   uuid not null references auth.users(id) on delete cascade,
  followee   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower, followee),
  check (follower <> followee)
);

-- Fast edge lookups in both directions: "who do I follow" (by follower) and
-- "who follows this user" / follower counts (by followee).
create index if not exists follows_follower_idx on public.follows (follower);
create index if not exists follows_followee_idx on public.follows (followee);

-- -----------------------------------------------------------------------------
-- Row-Level Security: the follow graph is public to read, follower-only to write.
-- -----------------------------------------------------------------------------
alter table public.follows enable row level security;

-- Anyone (including anon) may read the follow graph - powers public counts,
-- follow-state checks, and the profile / people-search UI.
create policy follows_public_read on public.follows
  for select using (true);

-- You may only create an edge where you are the follower.
create policy follows_insert_own on public.follows
  for insert with check (auth.uid() = follower);

-- You may only remove an edge where you are the follower (unfollow).
create policy follows_delete_own on public.follows
  for delete using (auth.uid() = follower);
