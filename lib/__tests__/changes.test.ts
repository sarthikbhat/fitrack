import { describe, expect, test } from "vitest";
import { recordChanges, snapshotUnits, stableStringify } from "@/lib/sync/changes";
import { SINGLETON_KEYS } from "@/lib/sync/registry";
import { emptyState } from "@/lib/migrate";
import type { Food, Program, SessionSummary, State } from "@/lib/types";

function food(id: string, name: string): Food {
  return { id, name, base: "g", kcal: 100, p: 1, c: 1, f: 1, servings: [], source: "custom", updatedAt: 1 };
}
function program(id: string, name: string): Program {
  return { id, name, days: [], updatedAt: 1 };
}
function session(id: string): SessionSummary {
  return { id, date: "2026-09-01", name: "Push", sets: 3, vol: 100, updatedAt: 1 };
}

describe("stableStringify", () => {
  test("is key-order independent", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });
  test("recurses into nested objects and arrays", () => {
    expect(stableStringify({ x: { b: 1, a: 2 }, y: [{ n: 1, m: 2 }] })).toBe(
      stableStringify({ y: [{ m: 2, n: 1 }], x: { a: 2, b: 1 } }),
    );
  });
});

describe("snapshotUnits", () => {
  test("emits one unit per singleton key", () => {
    const snap = snapshotUnits(emptyState());
    for (const k of SINGLETON_KEYS) expect(snap.has(`singletons:${k}`)).toBe(true);
  });

  test("emits one unit per collection element, keyed by table:id", () => {
    const s: State = {
      ...emptyState(),
      foods: { f1: food("f1", "Rice") },
      programs: { p1: program("p1", "PPL") },
      sessions: [session("s1")],
      diary: { "2026-09-01": { meals: [] } },
      logged: { "2026-09-01": { Bench: [] } },
    };
    const snap = snapshotUnits(s);
    expect(snap.has("foods:f1")).toBe(true);
    expect(snap.has("programs:p1")).toBe(true);
    expect(snap.has("sessions:s1")).toBe(true);
    expect(snap.has("diary:2026-09-01")).toBe(true);
    expect(snap.has("training_log:2026-09-01")).toBe(true);
  });
});

describe("recordChanges", () => {
  test("a brand-new unit is changed", () => {
    const prev = new Map<string, string>();
    const next = new Map([["foods:f1", '{"n":1}']]);
    const diff = recordChanges(prev, next, 1000);
    expect(diff.changed).toEqual(["foods:f1"]);
    expect(diff.deleted).toEqual([]);
  });

  test("a re-serialised unit is changed", () => {
    const prev = new Map([["foods:f1", '{"n":1}']]);
    const next = new Map([["foods:f1", '{"n":2}']]);
    const diff = recordChanges(prev, next, 1000);
    expect(diff.changed).toEqual(["foods:f1"]);
    expect(diff.deleted).toEqual([]);
  });

  test("an unchanged unit is neither changed nor deleted", () => {
    const prev = new Map([["foods:f1", '{"n":1}']]);
    const next = new Map([["foods:f1", '{"n":1}']]);
    const diff = recordChanges(prev, next, 1000);
    expect(diff.changed).toEqual([]);
    expect(diff.deleted).toEqual([]);
  });

  test("a present-before-absent-now unit is a tombstone", () => {
    const prev = new Map([["foods:f1", '{"n":1}'], ["foods:f2", '{"n":2}']]);
    const next = new Map([["foods:f1", '{"n":1}']]);
    const diff = recordChanges(prev, next, 1000);
    expect(diff.changed).toEqual([]);
    expect(diff.deleted).toEqual(["foods:f2"]);
  });

  test("singletons always present → never tombstoned across real snapshots", () => {
    // Share one base so random-id singletons (e.g. the starter plan) are identical.
    const base = emptyState();
    const prev = snapshotUnits(base);
    const next = snapshotUnits({ ...base, foods: { f1: food("f1", "Rice") } });
    const diff = recordChanges(prev, next, 1000);
    // The only new/changed key is the new collection element; nothing deleted.
    expect(diff.changed).toEqual(["foods:f1"]);
    expect(diff.deleted).toEqual([]);
  });

  test("removing a collection element across real snapshots tombstones only it", () => {
    const base = emptyState();
    const prev = snapshotUnits({ ...base, foods: { f1: food("f1", "Rice") } });
    const next = snapshotUnits(base);
    const diff = recordChanges(prev, next, 1000);
    expect(diff.changed).toEqual([]);
    expect(diff.deleted).toEqual(["foods:f1"]);
  });
});
