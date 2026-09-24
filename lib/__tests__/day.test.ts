import { describe, expect, test } from "vitest";
import {
  plannedForToday,
  dayById,
  dayExercises,
  logFor,
  exDone,
  sessionFromDay,
  applyReorder,
  addExercise,
  removeExercise,
  customDayId,
  type Logged,
} from "@/lib/day";
import { PLAN, type PlanDay, type PlanExercise } from "@/data/plan";

describe("plannedForToday", () => {
  test("Monday resolves to PLAN[0]", () => {
    // 2024-01-01 is a Monday (local).
    expect(plannedForToday(new Date(2024, 0, 1))).toBe(PLAN[0]);
  });
  test("Saturday resolves to PLAN[5]", () => {
    // 2024-01-06 is a Saturday → index 5.
    expect(plannedForToday(new Date(2024, 0, 6))).toBe(PLAN[5]);
  });
  test("Sunday is a rest day (null)", () => {
    // 2024-01-07 is a Sunday → index 6 → null.
    expect(plannedForToday(new Date(2024, 0, 7))).toBeNull();
  });
});

describe("dayById", () => {
  const today = "2026-09-24";
  test("returns the base plan day by id", () => {
    expect(dayById("d3", {}, today)).toBe(PLAN[2]);
  });
  test("prefers a matching custom override for today", () => {
    const custom: Record<string, PlanDay> = {
      [today]: { id: "d1", label: "Custom", name: "My Push", focus: "x", tags: [], ex: [] },
    };
    expect(dayById("d1", custom, today)).toBe(custom[today]);
  });
  test("ignores a custom override with a different id", () => {
    const custom: Record<string, PlanDay> = {
      [today]: { id: "d9", label: "X", name: "X", focus: "x", tags: [], ex: [] },
    };
    expect(dayById("d1", custom, today)).toBe(PLAN[0]);
  });
  test("returns undefined for an unknown id", () => {
    expect(dayById("nope", {}, today)).toBeUndefined();
  });
});

describe("dayExercises", () => {
  const ex = (name: string): PlanExercise => ({ name, muscle: "Chest", sets: 3, reps: "8", start: 10 });
  const day: PlanDay = {
    id: "d1",
    label: "Day 1",
    name: "Push",
    focus: "f",
    tags: [],
    ex: [ex("A"), ex("B"), ex("C")],
  };

  test("base list when no edits", () => {
    expect(dayExercises(day, {}, {}, {}).map((e) => e.name)).toEqual(["A", "B", "C"]);
  });
  test("removes named base exercises", () => {
    expect(dayExercises(day, {}, { d1: ["B"] }, {}).map((e) => e.name)).toEqual(["A", "C"]);
  });
  test("appends added exercises", () => {
    expect(dayExercises(day, { d1: [ex("Z")] }, {}, {}).map((e) => e.name)).toEqual(["A", "B", "C", "Z"]);
  });
  test("reorders by order override, unknowns last", () => {
    expect(dayExercises(day, {}, {}, { d1: ["C", "A"] }).map((e) => e.name)).toEqual(["C", "A", "B"]);
  });
  test("null day yields empty list", () => {
    expect(dayExercises(null, {}, {}, {})).toEqual([]);
  });
});

describe("customDayId", () => {
  test("prefixes the date (legacy 'custom:' + dt)", () => {
    expect(customDayId("2026-09-24")).toBe("custom:2026-09-24");
  });
});

describe("applyReorder", () => {
  const names = ["A", "B", "C"];
  test("moves an item up (dir -1)", () => {
    expect(applyReorder(names, "B", -1)).toEqual(["B", "A", "C"]);
  });
  test("moves an item down (dir +1)", () => {
    expect(applyReorder(names, "B", 1)).toEqual(["A", "C", "B"]);
  });
  test("clamps at the top (null when first moves up)", () => {
    expect(applyReorder(names, "A", -1)).toBeNull();
  });
  test("clamps at the bottom (null when last moves down)", () => {
    expect(applyReorder(names, "C", 1)).toBeNull();
  });
  test("null for an unknown name", () => {
    expect(applyReorder(names, "Z", 1)).toBeNull();
  });
  test("does not mutate the input array", () => {
    const src = ["A", "B", "C"];
    applyReorder(src, "A", 1);
    expect(src).toEqual(["A", "B", "C"]);
  });
});

describe("addExercise", () => {
  const today = "2026-09-24";
  const base = () => ({ added: {}, removed: {}, custom: {} });

  test("appends a new (non-base) exercise to added", () => {
    const r = addExercise(base(), "d1", "Machine Chest Press", "Chest", today);
    expect(r.added.d1.map((e) => e.name)).toEqual(["Machine Chest Press"]);
    expect(r.added.d1[0]).toMatchObject({ muscle: "Chest", sets: 3, reps: "10", start: 0 });
  });
  test("un-removes a base lift instead of adding it (d1 has Barbell Bench Press)", () => {
    const r = addExercise({ added: {}, removed: { d1: ["Barbell Bench Press"] }, custom: {} }, "d1", "Barbell Bench Press", "Chest", today);
    expect(r.removed.d1).toEqual([]);
    expect(r.added.d1).toBeUndefined();
  });
  test("no-op when the exercise is already a base lift of the day", () => {
    const s = base();
    const r = addExercise(s, "d1", "Barbell Bench Press", "Chest", today);
    expect(r.added).toBe(s.added);
    expect(r.removed).toBe(s.removed);
  });
  test("no-op when already present in added", () => {
    const s = { added: { d1: [{ name: "Push-Up", muscle: "Chest", sets: 3, reps: "10", start: 0 } as PlanExercise] }, removed: {}, custom: {} };
    const r = addExercise(s, "d1", "Push-Up", "Chest", today);
    expect(r.added).toBe(s.added);
  });
});

describe("removeExercise", () => {
  test("records a base lift as removed", () => {
    const r = removeExercise({ added: {}, removed: {} }, "d1", "Barbell Bench Press");
    expect(r.removed.d1).toEqual(["Barbell Bench Press"]);
  });
  test("splices an added exercise out instead of marking removed", () => {
    const s = { added: { d1: [{ name: "Push-Up", muscle: "Chest", sets: 3, reps: "10", start: 0 } as PlanExercise] }, removed: {} };
    const r = removeExercise(s, "d1", "Push-Up");
    expect(r.added.d1).toEqual([]);
    expect(r.removed.d1).toBeUndefined();
  });
  test("no-op when already removed", () => {
    const s = { added: {}, removed: { d1: ["Barbell Bench Press"] } };
    const r = removeExercise(s, "d1", "Barbell Bench Press");
    expect(r.removed).toBe(s.removed);
  });
});

describe("logFor", () => {
  test("generates plannedSets blank rows when absent", () => {
    const rows = logFor({}, "2026-09-24", "A", 3);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.w === "" && r.r === "" && r.done === false)).toBe(true);
  });
  test("defaults to a single row when plannedSets is 0", () => {
    expect(logFor({}, "2026-09-24", "A", 0)).toHaveLength(1);
  });
  test("passes through existing rows unchanged", () => {
    const logged: Logged = { "2026-09-24": { A: [{ w: "50", r: "5", done: true }] } };
    expect(logFor(logged, "2026-09-24", "A", 3)).toBe(logged["2026-09-24"].A);
  });
});

describe("exDone", () => {
  test("counts done sets", () => {
    expect(
      exDone([
        { w: "1", r: "1", done: true },
        { w: "", r: "", done: false },
        { w: "2", r: "2", done: true },
      ]),
    ).toBe(2);
  });
});

describe("sessionFromDay", () => {
  const exA: PlanExercise = { name: "A", muscle: "Chest", sets: 2, reps: "8", start: 0 };
  const exB: PlanExercise = { name: "B", muscle: "Back", sets: 1, reps: "8", start: 0 };
  const date = "2026-09-24";

  test("sums done sets and volume (parseFloat(w)*parseInt(r))", () => {
    const logged: Logged = {
      [date]: {
        A: [
          { w: "100", r: "10", done: true },
          { w: "50", r: "5", done: false },
        ],
        B: [{ w: "20", r: "8", done: true }],
      },
    };
    const sess = sessionFromDay(logged, date, "Push", [exA, exB]);
    expect(sess.sets).toBe(2);
    expect(sess.vol).toBe(100 * 10 + 20 * 8);
    expect(sess.name).toBe("Push");
    expect(sess.date).toBe(date);
    expect(typeof sess.id).toBe("string");
  });
  test("ignores non-numeric weights/reps in volume", () => {
    const logged: Logged = { [date]: { A: [{ w: "", r: "10", done: true }] } };
    const sess = sessionFromDay(logged, date, "Push", [exA]);
    expect(sess.sets).toBe(1);
    expect(sess.vol).toBe(0);
  });
});
