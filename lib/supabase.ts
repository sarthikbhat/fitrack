"use client";

// Optional browser Supabase client. Auth is a bolt-on: if the two public env
// vars are unset (no Supabase project yet), getSupabase() returns null and the
// whole app keeps working offline/local-first exactly as before - no crash.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Accept either the legacy anon key or Supabase's newer publishable key name.
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True only when both public env vars are present - i.e. cloud sync is available. */
export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

let client: SupabaseClient | null = null;

/**
 * Memoized browser client, or null when unconfigured.
 * SPA/client-first auth: persist the session, auto-refresh tokens, and let
 * supabase-js finalize the OAuth redirect via detectSessionInUrl.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  client = createClient(URL as string, ANON as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
