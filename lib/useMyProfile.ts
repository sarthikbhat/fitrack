"use client";

// Reactive read of the signed-in user's public profile. Refetches when the
// signed-in user id changes; exposes refresh() so callers (e.g. the Settings
// editor) can re-pull after an update. Returns null when signed-out/unconfigured.
import { useCallback, useEffect, useState } from "react";
import { getMyProfile, type Profile } from "@/lib/profile";
import { useAuth } from "@/lib/auth";

export function useMyProfile(): {
  profile: Profile | null;
  loading: boolean;
  refresh: () => void;
} {
  const { user, status } = useAuth();
  const uid = user?.id ?? null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    // Wrapped in an async closure so state updates happen in a callback (syncing
    // from the external Supabase read), never synchronously in the effect body.
    void (async () => {
      if (status !== "signed-in" || !uid) {
        if (active) setProfile(null);
        return;
      }
      setLoading(true);
      const p = await getMyProfile();
      if (!active) return;
      setProfile(p);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [uid, status, tick]);

  return { profile, loading, refresh };
}
