# Supabase setup (Spec-2)

Steps to wire the cloud sync + keep-alive backend.

## 1. Run the SQL migration

Supabase Dashboard → SQL Editor → New query → paste `migrations/0001_init.sql` → Run.
This creates the per-user sync tables (RLS-guarded) and the public `keepalive`
table used to stop the free project auto-pausing.

## 2. Set the public env vars

In Vercel (and `.env.local` for dev):

- `NEXT_PUBLIC_SUPABASE_URL` — project URL (Settings → API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key (Settings → API)

Without both, the app stays local-first and `/api/keepalive` returns
`{ ok: false, reason: "supabase not configured" }`.

## 3. Enable Google auth

Supabase → Authentication → Providers → Google: enable and add client ID/secret.
Add redirect URLs (Authentication → URL Configuration) for local + deployed
origins.

## 4. Keep-alive: Vercel cron

`vercel.json` runs `/api/keepalive` daily at `0 6 * * *` (UTC). Set `CRON_SECRET`
in Vercel (Settings → Environment Variables). Vercel cron sends it automatically
as `Authorization: Bearer <CRON_SECRET>`; the route rejects calls without it once
the secret is set.

## 5. Keep-alive: GitHub Actions backup

`.github/workflows/keepalive.yml` pings the endpoint daily at `0 18 * * *` (UTC),
independent of Vercel. Add two repo secrets (Settings → Secrets and variables →
Actions):

- `KEEPALIVE_URL` — deployed endpoint, e.g. `https://<app>.vercel.app/api/keepalive`
- `CRON_SECRET` — same value as the Vercel `CRON_SECRET`
