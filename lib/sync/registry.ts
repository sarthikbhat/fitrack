import type { SessionSummary, State } from "@/lib/types";
import { emptyState } from "@/lib/migrate";

// The sync registry is the single source of truth mapping the Zustand `State`
// onto the six sync tables. Each SYNC UNIT is one row (user_id, id, data,
// updated_at, deleted). The engine (next plan) stays generic by driving
// everything through these table descriptors — extract units out of a State,
// apply a unit back into a draft, or remove one.

export type SyncKind = "collection" | "singleton";

/** One syncable unit pulled from (or applied into) a State. */
export type ExtractedUnit = { id: string; data: unknown };

export type SyncTable = {
  /** Table name (also the `table` half of a `${table}:${id}` unit key). */
  name: string;
  kind: SyncKind;
  /** Pull every unit this table owns out of a State. */
  extract: (state: State) => ExtractedUnit[];
  /** Set/replace one unit (by id) into a draft State. Mutates the draft. */
  apply: (draft: State, id: string, data: unknown) => void;
  /** Remove one unit: delete a collection element / reset a singleton default. */
  remove: (draft: State, id: string) => void;
};

// --- Collections -----------------------------------------------------------
// A collection maps one State field to N units (one per element).

/** State fields that are `Record<id, value>` maps. */
type RecordField = "programs" | "foods" | "diary" | "logged";

/** Build a collection table over a `Record<id, value>` State field. */
function recordCollection(name: string, field: RecordField): SyncTable {
  return {
    name,
    kind: "collection",
    extract: (s) =>
      Object.entries(s[field] as Record<string, unknown>).map(([id, data]) => ({ id, data })),
    apply: (draft, id, data) => {
      (draft[field] as Record<string, unknown>)[id] = data;
    },
    remove: (draft, id) => {
      delete (draft[field] as Record<string, unknown>)[id];
    },
  };
}

/** `sessions` is an array keyed by each element's own `id`. */
const sessionsTable: SyncTable = {
  name: "sessions",
  kind: "collection",
  extract: (s) => s.sessions.map((x) => ({ id: x.id, data: x })),
  apply: (draft, id, data) => {
    const rest = draft.sessions.filter((x) => x.id !== id);
    rest.push(data as SessionSummary);
    draft.sessions = rest;
  },
  remove: (draft, id) => {
    draft.sessions = draft.sessions.filter((x) => x.id !== id);
  },
};

// --- Singletons ------------------------------------------------------------
// One fixed unit per key, all stored in a single `singletons` table (id = key).
// A singleton is never absent, so it never produces a tombstone; "removing" it
// resets the slice to its empty default.

export const SINGLETON_KEYS = [
  "profile",
  "body",
  "goals",
  "settings",
  "plan",
  "notes",
  "added",
  "removed",
  "order",
  "custom",
  "activeProgramId",
] as const;

export type SingletonKey = (typeof SINGLETON_KEYS)[number];

const SINGLETON_SET: ReadonlySet<string> = new Set(SINGLETON_KEYS);

/** The empty default a singleton resets to when removed. */
function singletonDefault(key: SingletonKey): unknown {
  const base = emptyState();
  switch (key) {
    case "profile":
    case "activeProgramId":
      return null;
    case "body":
      return base.body;
    case "goals":
      return base.goals;
    case "settings":
      return base.settings;
    case "plan":
      return { meals: [] };
    // notes / added / removed / order / custom are plain maps.
    default:
      return {};
  }
}

const singletonsTable: SyncTable = {
  name: "singletons",
  kind: "singleton",
  extract: (s) => SINGLETON_KEYS.map((k) => ({ id: k, data: s[k] })),
  apply: (draft, id, data) => {
    if (SINGLETON_SET.has(id)) (draft as Record<string, unknown>)[id] = data;
  },
  remove: (draft, id) => {
    if (SINGLETON_SET.has(id)) (draft as Record<string, unknown>)[id] = singletonDefault(id as SingletonKey);
  },
};

/** All sync tables, data-driven so the engine never special-cases a field. */
export const SYNC_TABLES: readonly SyncTable[] = [
  recordCollection("programs", "programs"),
  sessionsTable,
  recordCollection("foods", "foods"),
  recordCollection("diary", "diary"),
  recordCollection("training_log", "logged"),
  singletonsTable,
];

/** `${table}:${id}` — the stable key used across snapshots, meta, and merge. */
export function unitKey(table: string, id: string): string {
  return `${table}:${id}`;
}
