"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

// A tiny, non-persisted store for the "auth in progress" overlay. Sign-in kicks
// off a full-page redirect to Google and back, so we flash a backdrop + spinner
// to avoid a jarring blank reload. Deliberately separate from the persisted store
// so this transient flag never lands in IndexedDB or change-tracking.

export type AuthPendingState = {
  pending: boolean;
  message: string;
};

type AuthPendingStore = AuthPendingState & {
  set: (pending: boolean, message?: string) => void;
};

const DEFAULT_MESSAGE = "Signing you in…";

export const useAuthPendingStore = create<AuthPendingStore>((set) => ({
  pending: false,
  message: DEFAULT_MESSAGE,
  set: (pending, message) =>
    set((s) => ({ pending, message: message ?? (pending ? s.message : DEFAULT_MESSAGE) })),
}));

/** Imperative setter for non-React callers (auth.ts, the callback page). */
export function setAuthPending(pending: boolean, message?: string): void {
  useAuthPendingStore.getState().set(pending, message);
}

/** Hook: read the current auth-pending slice. */
export function useAuthPending(): AuthPendingState {
  return useAuthPendingStore(
    useShallow((s) => ({ pending: s.pending, message: s.message })),
  );
}
