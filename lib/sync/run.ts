"use client";

import { runSync } from "@/lib/sync/engine";

// Serialized, fire-and-forget wrapper around runSync so no two sync cycles ever run
// concurrently. Every trigger (mount, store changes, focus/online, interval, the
// "Sync now" button) funnels through syncOnce. If a run is in flight, the request is
// coalesced into a single pending run that fires once the current one settles - so a
// burst of triggers collapses to at most one follow-up cycle. runSync itself self-
// guards (no-op when unconfigured / signed-out / offline), so callers need no checks.

let running = false;
let pending = false;
let pendingBootstrap = false;

export function syncOnce(opts?: { bootstrap?: boolean }): void {
  if (running) {
    pending = true;
    if (opts?.bootstrap) pendingBootstrap = true;
    return;
  }
  running = true;
  void runSync(opts?.bootstrap ? { bootstrap: true } : undefined).finally(() => {
    running = false;
    if (pending) {
      pending = false;
      const bootstrap = pendingBootstrap;
      pendingBootstrap = false;
      syncOnce(bootstrap ? { bootstrap: true } : undefined);
    }
  });
}
