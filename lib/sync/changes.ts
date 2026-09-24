import { get as idbGet, set as idbSet } from "idb-keyval";
import type { State } from "@/lib/types";
import { SYNC_TABLES, unitKey } from "@/lib/sync/registry";

// Change tracking by persist-diff. Rather than retrofitting every store action to
// stamp timestamps, we snapshot every sync unit (stable-serialised) after a store
// change and diff it against the previous snapshot. New/changed serialisations are
// stamped dirty; units that were present and are now gone become tombstones. This
// keeps the store actions untouched and the diff pure + testable.

const SYNCMETA_KEY = "fitrack-syncmeta";

/** Per-unit sync bookkeeping, keyed `${table}:${id}`. */
export type UnitMeta = { updatedAt: number; deleted?: boolean };

export type SyncMeta = {
  units: Record<string, UnitMeta>;
  lastSyncedAt: number;
};

export function emptySyncMeta(): SyncMeta {
  return { units: {}, lastSyncedAt: 0 };
}

// ---------------------------------------------------------------------------
// Stable JSON: sort object keys recursively so serialisation is order-stable
// and the diff never fires on mere key reordering.
// ---------------------------------------------------------------------------
export function stableStringify(value: unknown): string {
  return JSON.stringify(stabilise(value));
}

function stabilise(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stabilise);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) out[key] = stabilise(obj[key]);
  return out;
}

// ---------------------------------------------------------------------------
// Pure diff pieces (no IO, no Date) - these are the tested core.
// ---------------------------------------------------------------------------

/** Serialise every unit of a State into a Map<unitKey, stableJSON>. */
export function snapshotUnits(state: State): Map<string, string> {
  const map = new Map<string, string>();
  for (const table of SYNC_TABLES) {
    for (const { id, data } of table.extract(state)) {
      map.set(unitKey(table.name, id), stableStringify(data));
    }
  }
  return map;
}

export type Diff = { changed: string[]; deleted: string[] };

/**
 * Pure diff of two unit snapshots.
 *  - a key new-or-changed in `next` → changed (stamp updatedAt = now),
 *  - a key present in `prev` but absent in `next` → deleted (tombstone).
 * Singletons are always present in a snapshot, so only collections can appear
 * in `deleted` - singletons never produce tombstones.
 * `now` is threaded in so the function stays pure.
 */
export function recordChanges(
  prev: Map<string, string>,
  next: Map<string, string>,
  _now: number,
): Diff {
  const changed: string[] = [];
  const deleted: string[] = [];

  for (const [key, ser] of next) {
    if (prev.get(key) !== ser) changed.push(key);
  }
  for (const key of prev.keys()) {
    if (!next.has(key)) deleted.push(key);
  }

  return { changed, deleted };
}

// ---------------------------------------------------------------------------
// Stateful layer: memoised SyncMeta + last snapshot, persisted to IndexedDB.
// ---------------------------------------------------------------------------

let meta: SyncMeta = emptySyncMeta();
let lastSnapshot: Map<string, string> = new Map();
let loaded = false;
// Guard: until the snapshot baseline is primed (from the hydrated state), a diff
// against the empty initial snapshot would mark EVERY unit dirty with `now`, making
// stale local data win LWW and clobber the cloud. Until primed, trackChanges only
// baselines and never stamps.
let primed = false;

/** Load persisted SyncMeta into the in-module memo (once). */
export async function ensureSyncMetaLoaded(): Promise<SyncMeta> {
  if (loaded) return meta;
  const stored = (await idbGet(SYNCMETA_KEY)) as SyncMeta | undefined;
  if (stored && typeof stored === "object") {
    meta = { units: stored.units ?? {}, lastSyncedAt: stored.lastSyncedAt ?? 0 };
  }
  loaded = true;
  return meta;
}

/** Read the in-memory SyncMeta (synchronous; call ensureSyncMetaLoaded first). */
export function getSyncMeta(): SyncMeta {
  return meta;
}

function persist(): void {
  // Fire-and-forget: the memo is the source of truth during a session.
  void idbSet(SYNCMETA_KEY, meta);
}

/** Stamp the last successful sync time (called by the future engine). */
export function setLastSyncedAt(t: number): void {
  meta = { ...meta, lastSyncedAt: t };
  persist();
}

/**
 * Update the memoised + persisted SyncMeta from the diff vs the last snapshot,
 * stamping changed units with `now` and gone units as tombstones. Returns the
 * dirty unit keys (changed ∪ deleted). The pure diff lives in recordChanges.
 */
export function trackChanges(state: State, now: number): string[] {
  const next = snapshotUnits(state);

  // Not yet primed: just establish the baseline, never stamp. Prevents the
  // empty-baseline diff from marking every unit dirty on cold start.
  if (!primed) {
    lastSnapshot = next;
    primed = true;
    return [];
  }

  const { changed, deleted } = recordChanges(lastSnapshot, next, now);

  if (changed.length || deleted.length) {
    const units = { ...meta.units };
    for (const key of changed) units[key] = { updatedAt: now };
    for (const key of deleted) units[key] = { updatedAt: now, deleted: true };
    meta = { ...meta, units };
    persist();
  }

  lastSnapshot = next;
  return [...changed, ...deleted];
}

/**
 * Merge explicit per-unit meta into the memoised + persisted SyncMeta. The engine
 * uses this to (a) stamp applied remote units with their REMOTE timestamp (so they
 * are not re-pushed) and (b) mark every local unit dirty on a bootstrap claim.
 * No-op for an empty update set.
 */
export function stampUnits(updates: Record<string, UnitMeta>): void {
  if (Object.keys(updates).length === 0) return;
  meta = { ...meta, units: { ...meta.units, ...updates } };
  persist();
}

/**
 * Prime the last snapshot from the current state without stamping anything.
 * Used on hydration so the first real change diffs against the loaded state
 * rather than an empty baseline.
 */
export function primeSnapshot(state: State): void {
  lastSnapshot = snapshotUnits(state);
  primed = true;
}
