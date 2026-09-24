"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

// A tiny, non-persisted store for surfacing sync state to the UI (S4 wires the
// triggers/indicator). The engine writes to it; components read via useSyncStatus.
// Deliberately separate from the main persisted store so a transient status never
// lands in IndexedDB and never participates in change-tracking.

export type SyncStatusValue =
  | "idle"
  | "syncing"
  | "offline"
  | "error"
  | "signed-out"
  | "unconfigured";

export type SyncStatusState = {
  status: SyncStatusValue;
  lastSyncedAt: number;
  lastError: string | null;
};

type SyncStatusStore = SyncStatusState & {
  /** Patch the status slice (used by the engine). */
  patch: (p: Partial<SyncStatusState>) => void;
};

export const useSyncStatusStore = create<SyncStatusStore>((set) => ({
  status: "idle",
  lastSyncedAt: 0,
  lastError: null,
  patch: (p) => set(p),
}));

/** Imperative setter for non-React callers (the engine). */
export function setSyncStatus(p: Partial<SyncStatusState>): void {
  useSyncStatusStore.getState().patch(p);
}

/** Hook: read the current sync status slice. */
export function useSyncStatus(): SyncStatusState {
  return useSyncStatusStore(
    useShallow((s) => ({
      status: s.status,
      lastSyncedAt: s.lastSyncedAt,
      lastError: s.lastError,
    })),
  );
}
