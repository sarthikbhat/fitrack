"use client";

// Thin auth layer over supabase-js. Everything degrades gracefully when Supabase
// is unconfigured: the wrappers no-op and useAuth() reports status 'unconfigured'
// so the UI can hide/disable the account controls without ever throwing.
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { ensureProfile } from "@/lib/profile";
import { useStore } from "@/lib/store";
import { setAuthPending } from "@/lib/authPending";

export type AuthStatus = "signed-in" | "signed-out" | "unconfigured";

/** Start Google OAuth (PKCE); Supabase redirects back to /auth/callback. */
export async function signInWithGoogle(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
  // Flash the overlay during the brief moment before the browser navigates away
  // to Google, so the pending page doesn't reload out from under a blank screen.
  setAuthPending(true, "Redirecting to Google…");
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  // If the redirect never starts (error), don't leave the overlay stuck.
  if (error) setAuthPending(false);
}

/** End the session. Local IndexedDB data is untouched; only userId reverts. */
export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export type AuthState = {
  user: User | null;
  email: string | null;
  status: AuthStatus;
  loading: boolean;
};

/**
 * Reads the current session and subscribes to auth changes. On sign-in the store
 * userId flips to the Supabase user id; on sign-out it reverts to 'local'. Local
 * data always stays put — we only ever change the id we tag it with.
 */
export function useAuth(): AuthState {
  const setUserId = useStore((s) => s.setUserId);
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  // Track which user id we've already provisioned a profile row for, so
  // ensureProfile fires exactly once per sign-in (never on every auth event).
  const ensuredFor = useRef<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    // getSupabase() is null only when unconfigured, in which case `loading` was
    // already initialized to false — nothing to do, and no sync setState here
    // (which would trigger cascading renders).
    if (!sb) return;
    let active = true;

    // Provision a profiles row once per signed-in user (idempotent + guarded).
    const provision = (u: User | null) => {
      if (!u || ensuredFor.current === u.id) return;
      ensuredFor.current = u.id;
      void ensureProfile(u);
    };

    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user ?? null;
      setUser(u);
      setUserId(u ? u.id : "local");
      setLoading(false);
      provision(u);
      // Auth resolved on the destination — clear any sign-in overlay.
      setAuthPending(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setUserId(u ? u.id : "local");
      if (!u) ensuredFor.current = null; // reset on sign-out
      provision(u);
      // Any definitive auth event clears the pending overlay.
      setAuthPending(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [setUserId]);

  const status: AuthStatus = !configured ? "unconfigured" : user ? "signed-in" : "signed-out";

  return { user, email: user?.email ?? null, status, loading };
}
