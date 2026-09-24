import { describe, expect, test } from "vitest";
import { CURRENT_VERSION, emptyState, migrate, importLegacy, migrateDiary } from "@/lib/migrate";

describe("migrate", () => {
  test("returns empty state unchanged at current version", () => {
    const s = emptyState();
    expect(migrate(s).v).toBe(CURRENT_VERSION);
  });

  test("wraps a versionless blob to current version without throwing", () => {
    const legacyish = { bw: 80, goal: 75, height: 180 } as unknown;
    const out = migrate(legacyish);
    expect(out.v).toBe(CURRENT_VERSION);
    expect(out.userId).toBe("local");
  });

  test("leaves a newer-than-app blob untouched (returns as-is)", () => {
    const future = { ...emptyState(), v: CURRENT_VERSION + 5 };
    const out = migrate(future);
    expect(out.v).toBe(CURRENT_VERSION + 5); // not downgraded
  });
});

describe("shareWorkouts opt-in default + passthrough", () => {
  test("emptyState defaults shareWorkouts to false (opt-in / off by default)", () => {
    expect(emptyState().settings.shareWorkouts).toBe(false);
  });

  test("an older blob whose settings lack shareWorkouts gets it defaulted to false", () => {
    const blob = {
      ...emptyState(),
      settings: { rest: 120, autoRest: false }, // legacy shape, no shareWorkouts
    } as unknown;
    const out = migrate(blob);
    expect(out.settings.rest).toBe(120);
    expect(out.settings.autoRest).toBe(false);
    expect(out.settings.shareWorkouts).toBe(false);
  });

  test("preserves an already-set shareWorkouts flag", () => {
    const blob = {
      ...emptyState(),
      settings: { rest: 90, autoRest: true, shareWorkouts: true },
    } as unknown;
    expect(migrate(blob).settings.shareWorkouts).toBe(true);
  });
});

describe("importLegacy", () => {
  test("maps old fitrack-v2 fields into the new shape", () => {
    const legacy = {
      bw: 82,
      goal: 78,
      height: 179,
      history: [
        { date: "2026-09-01", name: "Bench Press", sets: 12, vol: 4200 },
      ],
      notes: { "2026-09-01": "felt strong" },
    };
    const s = importLegacy(legacy);
    expect(s.v).toBe(CURRENT_VERSION);
    expect(s.userId).toBe("local");
    expect(s.body.bw).toBe(82);
    expect(s.body.goalWeight).toBe(78);
    expect(s.profile?.heightCm).toBe(179);
    // legacy `history` maps to `sessions` (session summaries), not `workouts`.
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0].id).toBeTruthy(); // back-filled id
    expect(s.sessions[0].name).toBe("Bench Press");
    expect(s.sessions[0].updatedAt).toBeGreaterThan(0);
    expect(s.notes["2026-09-01"]).toBe("felt strong");
  });

  test("maps bwLog, history, start weight, and settings from legacy", () => {
    const legacy = {
      bw: 60, start: 59, goal: 68, height: 170,
      bwLog: [{ d: "2026-09-01", kg: 59 }, { d: "2026-09-08", kg: 60 }],
      history: [{ date: "2026-09-01", name: "Push A", sets: 12, vol: 4200 }],
      logged: { "2026-09-01": { "Barbell Bench Press": [{ w: "40", r: "8", done: true }] } },
      rest: 120, autoRest: false,
    };
    const s = importLegacy(legacy);
    expect(s.body.startWeight).toBe(59);
    expect(s.body.history).toEqual([
      { date: "2026-09-01", kg: 59 },
      { date: "2026-09-08", kg: 60 },
    ]);
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0].name).toBe("Push A");
    expect(s.sessions[0].vol).toBe(4200);
    expect(s.sessions[0].id).toBeTruthy();
    expect(s.logged["2026-09-01"]["Barbell Bench Press"][0].w).toBe("40");
    expect(s.settings.rest).toBe(120);
    expect(s.settings.autoRest).toBe(false);
  });

  test("handles a minimal/empty legacy blob without throwing", () => {
    const s = importLegacy({});
    expect(s.v).toBe(CURRENT_VERSION);
    expect(s.body.bw).toBeGreaterThan(0); // sensible default
  });
});

describe("plan seeding", () => {
  test("emptyState seeds a starter plan of three empty meals", () => {
    const s = emptyState();
    expect(s.plan.meals.map((m) => m.name)).toEqual(["Breakfast", "Lunch", "Dinner"]);
    expect(s.plan.meals.every((m) => m.items.length === 0)).toBe(true);
    expect(s.diary).toEqual({});
  });

  test("a pre-plan v1 blob gets the starter plan and new diary shape", () => {
    const v1 = { v: 1, userId: "local", body: { bw: 70 } } as unknown;
    const out = migrate(v1);
    expect(out.v).toBe(CURRENT_VERSION);
    expect(out.plan.meals).toHaveLength(3);
    expect(out.diary).toEqual({});
    // Retired nutrition slices are dropped.
    expect((out as Record<string, unknown>).eaten).toBeUndefined();
    expect((out as Record<string, unknown>).mealAdd).toBeUndefined();
  });
});

describe("migrateDiary", () => {
  test("groups a v1 flat diary array into custom LoggedMeals by meal tag", () => {
    const old = {
      "2026-09-01": [
        { id: "1", date: "2026-09-01", foodId: "seed-rice", qty: 1, unit: "katori", kcal: 200, p: 4, c: 40, f: 1, meal: "lunch", updatedAt: 1 },
        { id: "2", date: "2026-09-01", foodId: "seed-dal", qty: 1, unit: "katori", kcal: 170, p: 10, c: 24, f: 4, meal: "lunch", updatedAt: 2 },
        { id: "3", date: "2026-09-01", foodId: "seed-egg", qty: 2, unit: "egg", kcal: 155, p: 13, c: 1, f: 11, meal: "breakfast", updatedAt: 3 },
      ],
    };
    const out = migrateDiary(old);
    const meals = out["2026-09-01"].meals;
    expect(meals).toHaveLength(2); // lunch + breakfast groups
    const lunch = meals.find((m) => m.name === "Lunch")!;
    expect(lunch.planMealId).toBeNull();
    expect(lunch.items).toHaveLength(2);
    expect(lunch.items[0].foodId).toBe("seed-rice");
    const breakfast = meals.find((m) => m.name === "Breakfast")!;
    expect(breakfast.items).toHaveLength(1);
    expect(breakfast.items[0].kcal).toBe(155);
  });

  test("passes a v2 {meals:[]} day through unchanged", () => {
    const v2 = { "2026-09-02": { meals: [{ id: "m", planMealId: null, name: "Snack", items: [] }] } };
    const out = migrateDiary(v2);
    expect(out["2026-09-02"].meals[0].name).toBe("Snack");
  });

  test("empty / non-object input yields an empty map", () => {
    expect(migrateDiary(undefined)).toEqual({});
    expect(migrateDiary({})).toEqual({});
  });
});
