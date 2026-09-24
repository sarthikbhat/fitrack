// Server-safe Supabase client (anon key, no session). Used by server components
// like the public profile page /u/<username> to read profiles via the public
// SELECT RLS policy. Kept separate from lib/supabase.ts (which is "use client"
// and carries a persisted browser session) so it never lands in a client bundle
// with session/refresh machinery. Returns null when Supabase is unconfigured so
// callers degrade gracefully (the app runs fully local-first without a backend).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Fresh anon client with no session persistence, or null when unconfigured. */
export function getServerSupabase(): SupabaseClient | null {
  if (!URL || !ANON) return null;
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
