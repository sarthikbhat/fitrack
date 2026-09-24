import { describe, expect, test } from "vitest";
import { applyPlan, buildLocalUnits, bootstrapUpdates } from "@/lib/sync/engine";
import { emptySyncMeta, type SyncMeta } from "@/lib/sync/changes";
import { unitKey } from "@/lib/sync/registry";
import { emptyState } from "@/lib/migrate";
import type { Food, Program, Settings, State } from "@/lib/types";
import type { Unit } from "@/lib/sync/merge";

function food(id: string, name: string): Food {
  return {
    id,
    name,
    base: "g",
    kcal: 100,
    p: 10,
    c: 5,
    f: 2,
    servings: [],
    source: "custom",
    updatedAt: 1,
  };
}

function program(id: string, name: string): Program {
  return { id, name, days: [], updatedAt: 1 };
}

describe("applyPlan", () => {
  test("collection upsert: applies a food into the foods map", () => {
    const state = emptyState();
    const unit: Unit = { table: "foods", id: "f1", updatedAt: 10, data: food("f1", "Oats") };

    const next = applyPlan(state, [unit]);

    expect(next.foods["f1"]?.name).toBe("Oats");
    // Purity: input state untouched.
    expect(state.foods["f1"]).toBeUndefined();
  });

  test("collection tombstone: a deleted unit removes the element", () => {
    const state: State = { ...emptyState(), programs: { p1: program("p1", "PPL") } };
    const unit: Unit = { table: "programs", id: "p1", updatedAt: 20, deleted: true };

    const next = applyPlan(state, [unit]);

    expect(next.programs["p1"]).toBeUndefined();
    // Purity: original still has it.
    expect(state.programs["p1"]).toBeDefined();
  });

  test("singleton replace: applies settings wholesale", () => {
    const state = emptyState();
    const replacement: Settings = { rest: 999, autoRest: false };
    const unit: Unit = { table: "singletons", id: "settings", updatedAt: 30, data: replacement };

    const next = applyPlan(state, [unit]);

    expect(next.settings.rest).toBe(999);
    expect(next.settings.autoRest).toBe(false);
  });
});

describe("buildLocalUnits", () => {
  test("attaches updatedAt/deleted from syncMeta, defaults to 0 when absent", () => {
    const state: State = {
      ...emptyState(),
      foods: { f1: food("f1", "Oats"), f2: food("f2", "Rice") },
    };
    const meta: SyncMeta = {
      ...emptySyncMeta(),
      units: { [unitKey("foods", "f1")]: { updatedAt: 555 } },
    };

    const units = buildLocalUnits(state, meta);

    const f1 = units.find((u) => u.table === "foods" && u.id === "f1");
    const f2 = units.find((u) => u.table === "foods" && u.id === "f2");
    expect(f1?.updatedAt).toBe(555); // stamped
    expect(f2?.updatedAt).toBe(0); // pre-existing / unstamped
  });

  test("emits meta-only tombstones for units removed from state", () => {
    const meta: SyncMeta = {
      ...emptySyncMeta(),
      units: { [unitKey("foods", "gone")]: { updatedAt: 777, deleted: true } },
    };

    const units = buildLocalUnits(emptyState(), meta);

    const gone = units.find((u) => u.table === "foods" && u.id === "gone");
    expect(gone).toBeDefined();
    expect(gone?.deleted).toBe(true);
    expect(gone?.updatedAt).toBe(777);
  });
});

describe("bootstrapUpdates", () => {
  test("marks every current local unit dirty with now", () => {
    const state: State = { ...emptyState(), foods: { f1: food("f1", "Oats") } };
    const now = 123456;

    const updates = bootstrapUpdates(state, now);

    // Every extracted unit is present and stamped with `now`.
    const local = buildLocalUnits(state, emptySyncMeta());
    expect(Object.keys(updates).length).toBe(local.length);
    for (const key of Object.keys(updates)) expect(updates[key].updatedAt).toBe(now);
    // Includes the seeded food and the always-present singletons.
    expect(updates[unitKey("foods", "f1")]?.updatedAt).toBe(now);
    expect(updates[unitKey("singletons", "settings")]?.updatedAt).toBe(now);
  });
});
