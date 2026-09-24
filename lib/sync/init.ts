"use client";

import { useStore } from "@/lib/store";
import { ensureSyncMetaLoaded, primeSnapshot, trackChanges } from "@/lib/sync/changes";

// Small client-side init that wires the persist-diff tracker to the store. Kept
// out of changes.ts so the pure diff never depends on the store (no import cycle).
// Network push/pull is deferred to the next plan - this only maintains SyncMeta.

const DEBOUNCE_MS = 400;

let started = false;

/** Subscribe the change tracker to the store (idempotent, debounced). */
export function initSyncTracking(): () => void {
  if (started) return () => { };
  started = true;

  let timer: ReturnType<typeof setTimeout> | null = null;

  void ensureSyncMetaLoaded().then(() => {
    // Baseline against the hydrated state so the first edit diffs correctly.
    primeSnapshot(useStore.getState());
  });

  const unsub = useStore.subscribe((state) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      trackChanges(state, Date.now());
    }, DEBOUNCE_MS);
  });

  return () => {
    if (timer) clearTimeout(timer);
    unsub();
    started = false;
  };
}
