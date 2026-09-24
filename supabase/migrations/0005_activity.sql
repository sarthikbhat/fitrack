-- =============================================================================
-- Fitrack activity feed - 0005_activity.sql
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query, then
-- paste + Run) AFTER 0004_follows.sql. It backs the social activity feed: opt-in
-- workout posts, likes, and comments that show up on /feed (your posts + the
-- people you follow) and on the public profile page /u/<username>.
--
-- Posts are OPT-IN (Settings → "Share my workouts to the feed"), so everything
-- here is PUBLIC to read by design: an activity is only ever created when the
-- author chose to share it, and the feed + profile queries stay simple with an
-- open SELECT. Writes are strictly owner-scoped - you may only create or remove
-- your own activity rows, your own likes, and your own comments (auth.uid()).
-- Foreign keys cascade on delete, so removing an activity cleans up its likes and
-- comments, and deleting a user (auth.users) removes everything they authored.
-- =============================================================================

-- One row per shared activity. `type` is 'session' (a finished workout) or 'pr'
-- (reserved for future personal-record posts); `data` is a JSON snapshot the feed
-- renders directly (e.g. { name, sets, vol, date } for a session).
create table if not exists public.activity (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('session', 'pr')),
  data       jsonb not null,
  created_at timestamptz default now()
);

-- One row per (activity, liker). Composite primary key makes a like idempotent.
create table if not exists public.likes (
  activity_id text not null references public.activity(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (activity_id, user_id)
);

-- One row per comment on an activity.
create table if not exists public.comments (
  id          text primary key,
  activity_id text not null references public.activity(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  text        text not null,
  created_at  timestamptz default now()
);

-- Feed reads a user's timeline newest-first; likes/comments count + list by activity.
create index if not exists activity_user_created_idx on public.activity (user_id, created_at desc);
create index if not exists likes_activity_idx on public.likes (activity_id);
create index if not exists comments_activity_created_idx on public.comments (activity_id, created_at);

-- -----------------------------------------------------------------------------
-- Row-Level Security: public read, owner-only writes on all three tables.
-- -----------------------------------------------------------------------------
alter table public.activity enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- Activity: anyone may read (opt-in posts are meant to be seen); owner-only writes.
create policy activity_public_read on public.activity
  for select using (true);
create policy activity_insert_own on public.activity
  for insert with check (auth.uid() = user_id);
create policy activity_delete_own on public.activity
  for delete using (auth.uid() = user_id);

-- Likes: anyone may read (counts + "did I like this"); owner-only writes.
create policy likes_public_read on public.likes
  for select using (true);
create policy likes_insert_own on public.likes
  for insert with check (auth.uid() = user_id);
create policy likes_delete_own on public.likes
  for delete using (auth.uid() = user_id);

-- Comments: anyone may read; owner-only writes (create + delete your own).
create policy comments_public_read on public.comments
  for select using (true);
create policy comments_insert_own on public.comments
  for insert with check (auth.uid() = user_id);
create policy comments_delete_own on public.comments
  for delete using (auth.uid() = user_id);
