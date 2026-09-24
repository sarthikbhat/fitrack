"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { syncOnce } from "@/lib/sync/run";

// Orchestrates the sync engine over the app lifecycle. Renders nothing. All triggers
// funnel through syncOnce (serialized + coalesced) and runSync self-guards, so this
// component only decides WHEN to nudge sync and tears everything down on sign-out.
//
// Triggers (only while signed in + configured):
//   - mount / sign-in: one bootstrap-aware run (runSync defaults bootstrap to
//     lastSyncedAt===0 after loading meta — more correct than reading meta here,
//     which may not be hydrated yet and would force a spurious bootstrap).
//   - local store changes: debounced ~2.5s.
//   - window focus / online: immediate.
//   - interval: every 60s (self-skips when nothing is dirty / offline).
//
// When signed out or unconfigured we fire a single guarded run (so the status chip
// reflects 'signed-out' / 'unconfigured') and attach NO listeners — no network, no
// timers. Flipping userId back to a real id re-runs the effect and re-arms triggers.

const CHANGE_DEBOUNCE_MS = 2500;
const INTERVAL_MS = 60_000;

export function SyncManager() {
  const userId = useStore((s) => s.userId);

  useEffect(() => {
    const signedIn = isSupabaseConfigured() && userId !== "local";

    if (!signedIn) {
      // Reflect status ('signed-out' / 'unconfigured'); no listeners, no network.
      syncOnce();
      return;
    }

    // Initial bootstrap-aware run.
    syncOnce();

    const onWake = () => syncOnce();
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    const interval = window.setInterval(() => syncOnce(), INTERVAL_MS);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncOnce(), CHANGE_DEBOUNCE_MS);
    });

    return () => {
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      window.clearInterval(interval);
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [userId]);

  return null;
}
