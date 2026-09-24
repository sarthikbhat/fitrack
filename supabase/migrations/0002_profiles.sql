-- =============================================================================
-- Fitrack public profiles — 0002_profiles.sql
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query, then
-- paste + Run) AFTER 0001_init.sql. It adds first-class user profiles that back
-- the visible "account presence" (avatar + display name + @username) and the
-- public profile page at /u/<username>.
--
-- One row per auth user (id = auth.users.id). `username` is a case-insensitive
-- (citext) unique handle. Profiles are PUBLICLY readable so anyone — signed in
-- or not — can view /u/<username>; only the owner may insert/update their row.
-- =============================================================================

create extension if not exists citext;

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     citext unique,
  display_name text,
  avatar_url   text,
  bio          text,
  created_at   timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- Row-Level Security: profiles are public to read, owner-only to write.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Anyone (including anon) can read any profile — powers the public profile page.
create policy profiles_public_read on public.profiles
  for select using (true);

-- Only the owner may create their own row.
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

-- Only the owner may update their own row.
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
