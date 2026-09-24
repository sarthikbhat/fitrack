import { unitKey } from "@/lib/sync/registry";

// Pure, side-effect-free merge logic for per-record last-write-wins sync.
// No network, no Date, no IO — everything here is deterministic and testable.

/** A unit as tracked locally (client-side stamp uses `updatedAt`). */
export type LocalUnit = {
  table: string;
  id: string;
  updatedAt: number;
  deleted?: boolean;
  data?: unknown;
};

/** A unit as it comes back from Supabase (snake_case `updated_at`). */
export type RemoteRow = {
  table: string;
  id: string;
  updated_at: number;
  deleted?: boolean;
  data?: unknown;
};

/** Normalised unit used in a sync plan (always `updatedAt`). */
export type Unit = {
  table: string;
  id: string;
  updatedAt: number;
  deleted?: boolean;
  data?: unknown;
};

export type MergeWinner = "local" | "remote" | "equal";

/**
 * Decide which side of a single unit wins under last-write-wins:
 *  - a missing side always loses,
 *  - the higher timestamp wins,
 *  - on a timestamp tie a tombstone wins (delete beats a same-time edit),
 *  - otherwise the two are equal (no-op).
 */
export function mergeUnit(
  local?: { updatedAt: number; deleted?: boolean; data?: unknown },
  remote?: { updated_at: number; deleted?: boolean; data?: unknown },
): MergeWinner {
  if (!local && !remote) return "equal";
  if (!local) return "remote";
  if (!remote) return "local";

  const lt = local.updatedAt;
  const rt = remote.updated_at;
  if (lt > rt) return "local";
  if (rt > lt) return "remote";

  // Equal timestamps: a tombstone wins as a delete.
  const ld = !!local.deleted;
  const rd = !!remote.deleted;
  if (ld && !rd) return "local";
  if (rd && !ld) return "remote";
  return "equal";
}

/** Convert a remote row into the normalised Unit shape. */
function fromRemote(r: RemoteRow): Unit {
  return { table: r.table, id: r.id, updatedAt: r.updated_at, deleted: r.deleted, data: r.data };
}

export type SyncPlan = { toApplyLocal: Unit[]; toPushRemote: Unit[] };

/**
 * Build a bidirectional sync plan over the union of local + remote units.
 * For every key present on either side pick the winner:
 *  - remote wins  → apply it locally,
 *  - local wins and is dirty (updatedAt > lastSyncedAt) → push it to remote,
 *  - local wins but already synced, or equal → no-op.
 * Tombstones flow in both directions like any other unit.
 */
export function planSync(
  localUnits: LocalUnit[],
  remoteRows: RemoteRow[],
  lastSyncedAt: number,
): SyncPlan {
  const locals = new Map<string, LocalUnit>();
  for (const u of localUnits) locals.set(unitKey(u.table, u.id), u);

  const remotes = new Map<string, RemoteRow>();
  for (const r of remoteRows) remotes.set(unitKey(r.table, r.id), r);

  const toApplyLocal: Unit[] = [];
  const toPushRemote: Unit[] = [];

  const keys = new Set<string>([...locals.keys(), ...remotes.keys()]);
  for (const key of keys) {
    const local = locals.get(key);
    const remote = remotes.get(key);
    const winner = mergeUnit(local, remote);

    if (winner === "remote" && remote) {
      toApplyLocal.push(fromRemote(remote));
    } else if (winner === "local" && local && local.updatedAt > lastSyncedAt) {
      toPushRemote.push({ ...local });
    }
  }

  return { toApplyLocal, toPushRemote };
}
