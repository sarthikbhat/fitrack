"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { State } from "@/lib/types";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { SYNC_TABLES, unitKey } from "@/lib/sync/registry";
import {
  ensureSyncMetaLoaded,
  getSyncMeta,
  primeSnapshot,
  setLastSyncedAt,
  stampUnits,
  type SyncMeta,
  type UnitMeta,
} from "@/lib/sync/changes";
import { planSync, type RemoteRow, type Unit } from "@/lib/sync/merge";
import { setSyncStatus } from "@/lib/sync/status";

// The push/pull sync engine. Bidirectional, per-record last-write-wins over the
// six sync tables. The pure transforms (buildLocalUnits, applyPlan, bootstrapUpdates)
// are exported and unit-tested; the network functions (pullRemote/pushRemote) are
// thin and always guarded behind a live Supabase client. UI triggers land in S4.

export type SyncResult = { pulled: number; pushed: number; applied: number };

const PUSH_CHUNK = 500;

// ---------------------------------------------------------------------------
// Pure transforms (no network, no Date, no store) — the tested core.
// ---------------------------------------------------------------------------

const TABLE_BY_NAME = new Map(SYNC_TABLES.map((t) => [t.name, t]));

/**
 * Build the full set of local units from a State + SyncMeta.
 *  - every extracted unit carries its meta `updatedAt`/`deleted` (default 0 for
 *    pre-existing/seeded data with no meta entry yet),
 *  - plus any tombstoned units that are meta-only (already removed from State) so
 *    deletes still propagate to remote.
 */
export function buildLocalUnits(state: State, syncMeta: SyncMeta): Unit[] {
  const units: Unit[] = [];
  const seen = new Set<string>();

  for (const table of SYNC_TABLES) {
    for (const { id, data } of table.extract(state)) {
      const key = unitKey(table.name, id);
      seen.add(key);
      const m = syncMeta.units[key];
      units.push({
        table: table.name,
        id,
        updatedAt: m?.updatedAt ?? 0,
        deleted: m?.deleted,
        data,
      });
    }
  }

  // Meta-only tombstones: collection elements deleted locally are gone from
  // State but must still be pushed as `deleted` rows.
  for (const [key, m] of Object.entries(syncMeta.units)) {
    if (seen.has(key) || !m.deleted) continue;
    const sep = key.indexOf(":");
    const table = key.slice(0, sep);
    const id = key.slice(sep + 1);
    units.push({ table, id, updatedAt: m.updatedAt, deleted: true });
  }

  return units;
}

/**
 * Bootstrap claim: mark EVERY current local unit dirty (updatedAt = now) so the
 * first sync after sign-in uploads all local data and claims it into the account.
 * Pure — returns the meta patch; the caller persists it via stampUnits.
 */
export function bootstrapUpdates(state: State, now: number): Record<string, UnitMeta> {
  const updates: Record<string, UnitMeta> = {};
  for (const table of SYNC_TABLES) {
    for (const { id } of table.extract(state)) {
      updates[unitKey(table.name, id)] = { updatedAt: now };
    }
  }
  return updates;
}

/**
 * Fold a set of remote-wins units into a State, returning the NEXT state.
 * Pure: deep-clones the input (JSON round-trip also strips any store action
 * functions, yielding a plain State) and drives every change through the
 * registry apply/remove. Tombstones (`deleted`) remove; everything else upserts.
 */
export function applyPlan(state: State, toApplyLocal: Unit[]): State {
  const draft = JSON.parse(JSON.stringify(state)) as State;
  for (const u of toApplyLocal) {
    const table = TABLE_BY_NAME.get(u.table);
    if (!table) continue;
    if (u.deleted) table.remove(draft, u.id);
    else table.apply(draft, u.id, u.data);
  }
  return draft;
}

// ---------------------------------------------------------------------------
// Network (thin, always guarded by a live client passed in).
// ---------------------------------------------------------------------------

type RemoteRecord = { id: string; data: unknown; updated_at: number; deleted: boolean | null };

/** Pull every row changed after `since` (since=0 pulls all), tagged by table. */
export async function pullRemote(supabase: SupabaseClient, since: number): Promise<Unit[]> {
  const out: Unit[] = [];
  for (const table of SYNC_TABLES) {
    const { data, error } = await supabase
      .from(table.name)
      .select("id,data,updated_at,deleted")
      .gt("updated_at", since);
    if (error) throw new Error(`pull ${table.name}: ${error.message}`);
    for (const row of (data ?? []) as RemoteRecord[]) {
      out.push({
        table: table.name,
        id: row.id,
        updatedAt: row.updated_at,
        deleted: row.deleted ?? undefined,
        data: row.data,
      });
    }
  }
  return out;
}

/** Upsert dirty units, grouped by table and chunked so a big push stays bounded. */
export async function pushRemote(
  supabase: SupabaseClient,
  userId: string,
  units: Unit[],
): Promise<void> {
  const byTable = new Map<string, Unit[]>();
  for (const u of units) {
    const list = byTable.get(u.table);
    if (list) list.push(u);
    else byTable.set(u.table, [u]);
  }

  for (const [table, list] of byTable) {
    for (let i = 0; i < list.length; i += PUSH_CHUNK) {
      const rows = list.slice(i, i + PUSH_CHUNK).map((u) => ({
        user_id: userId,
        id: u.id,
        data: u.data ?? null,
        updated_at: u.updatedAt,
        deleted: !!u.deleted,
      }));
      const { error } = await supabase.from(table).upsert(rows, { onConflict: "user_id,id" });
      if (error) throw new Error(`push ${table}: ${error.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Orchestrator.
// ---------------------------------------------------------------------------

const EMPTY: SyncResult = { pulled: 0, pushed: 0, applied: 0 };

/** Convert a pulled Unit into the RemoteRow shape planSync expects. */
function toRemoteRow(u: Unit): RemoteRow {
  return { table: u.table, id: u.id, updated_at: u.updatedAt, deleted: u.deleted, data: u.data };
}

/**
 * Run one full sync cycle: pull → merge (LWW) → apply remote locally → push local.
 * Guarded end-to-end; never touches the network when unconfigured, signed out, or
 * offline. On error it sets status 'error' and leaves dirty units for the next run
 * (apply happens only after a successful pull; a push failure does not advance
 * lastSyncedAt).
 */
export async function runSync(opts?: { bootstrap?: boolean }): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    setSyncStatus({ status: "unconfigured" });
    return EMPTY;
  }
  const supabase = getSupabase();
  if (!supabase) {
    setSyncStatus({ status: "unconfigured" });
    return EMPTY;
  }

  const userId = useStore.getState().userId;
  if (userId === "local") {
    setSyncStatus({ status: "signed-out" });
    return EMPTY;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setSyncStatus({ status: "offline" });
    return EMPTY;
  }

  const result: SyncResult = { pulled: 0, pushed: 0, applied: 0 };
  setSyncStatus({ status: "syncing", lastError: null });

  try {
    await ensureSyncMetaLoaded();
    let syncMeta = getSyncMeta();
    const bootstrap = opts?.bootstrap ?? syncMeta.lastSyncedAt === 0;
    const now = Date.now();

    // Bootstrap claim: stamp every current local unit dirty so all local data
    // uploads and claims into the just-signed-in account.
    if (bootstrap) {
      stampUnits(bootstrapUpdates(useStore.getState(), now));
      syncMeta = getSyncMeta();
    }

    const since = bootstrap ? 0 : syncMeta.lastSyncedAt;
    const local = buildLocalUnits(useStore.getState(), syncMeta);
    const remote = await pullRemote(supabase, since);
    result.pulled = remote.length;

    const { toApplyLocal, toPushRemote } = planSync(
      local,
      remote.map(toRemoteRow),
      syncMeta.lastSyncedAt,
    );

    // Apply remote → store, then stamp those units with their REMOTE timestamp and
    // re-prime the change-tracking baseline. This is what stops the ping-pong: the
    // applied units are NOT flagged as fresh local edits (baseline matches) and
    // their meta timestamp is the remote one (<= lastSyncedAt after advance), so
    // the next plan sees them as already-synced instead of dirty pushes.
    if (toApplyLocal.length > 0) {
      const next = applyPlan(useStore.getState(), toApplyLocal);
      useStore.setState(next);
      const applied: Record<string, UnitMeta> = {};
      for (const u of toApplyLocal) {
        applied[unitKey(u.table, u.id)] = { updatedAt: u.updatedAt, deleted: u.deleted };
      }
      stampUnits(applied);
      primeSnapshot(useStore.getState());
      result.applied = toApplyLocal.length;
    }

    // Push local winners. A failure here throws → dirty units survive for retry.
    if (toPushRemote.length > 0) {
      await pushRemote(supabase, userId, toPushRemote);
      result.pushed = toPushRemote.length;
    }

    // Advance the watermark to the max timestamp seen (or now, whichever is greater).
    let maxTs = syncMeta.lastSyncedAt;
    for (const u of remote) maxTs = Math.max(maxTs, u.updatedAt);
    for (const u of toPushRemote) maxTs = Math.max(maxTs, u.updatedAt);
    const advanced = Math.max(maxTs, Date.now());
    setLastSyncedAt(advanced);

    setSyncStatus({ status: "idle", lastSyncedAt: advanced, lastError: null });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setSyncStatus({ status: "error", lastError: message });
    return result;
  }
}
