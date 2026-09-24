"use client";

import { useStore } from "@/lib/store";
import type { ReactNode } from "react";

/** Blocks render until the IndexedDB store has rehydrated (avoids a flash of empty state). */
export function HydrationGate({ children }: { children: ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  if (!hydrated) return null;
  return <>{children}</>;
}
