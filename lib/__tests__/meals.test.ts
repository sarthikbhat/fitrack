import { describe, expect, test } from "vitest";
import { hasEmptyMeals, mealNameForTime, pruneEmptyMeals } from "@/lib/meals";
import type { DiaryDay, LogEntry } from "@/lib/types";

/** Minimal logged entry for building non-empty meals. */
function entry(id: string): LogEntry {
  return { id, name: "Food", qty: 1, unit: "g", kcal: 10, p: 1, c: 1, f: 0, updatedAt: 0 };
}
function day(meals: DiaryDay["meals"]): DiaryDay {
  return { meals };
}

/** Build a Date at a fixed local hour (date part is irrelevant to the helper). */
function at(hour: number): Date {
  const d = new Date(2026, 8, 24, hour, 0, 0);
  return d;
}

describe("mealNameForTime", () => {
  test("before 11:00 → Breakfast", () => {
    expect(mealNameForTime(at(0))).toBe("Breakfast");
    expect(mealNameForTime(at(8))).toBe("Breakfast");
    expect(mealNameForTime(at(10))).toBe("Breakfast");
  });

  test("11:00–15:59 → Lunch", () => {
    expect(mealNameForTime(at(11))).toBe("Lunch");
    expect(mealNameForTime(at(15))).toBe("Lunch");
  });

  test("16:00–20:59 → Dinner", () => {
    expect(mealNameForTime(at(16))).toBe("Dinner");
    expect(mealNameForTime(at(20))).toBe("Dinner");
  });

  test("21:00 and later → Snack", () => {
    expect(mealNameForTime(at(21))).toBe("Snack");
    expect(mealNameForTime(at(23))).toBe("Snack");
  });
});

describe("hasEmptyMeals", () => {
  test("false for undefined / no meals", () => {
    expect(hasEmptyMeals(undefined)).toBe(false);
    expect(hasEmptyMeals(day([]))).toBe(false);
  });

  test("false when every meal has items", () => {
    const d = day([{ id: "m1", planMealId: null, name: "Lunch", items: [entry("e1")] }]);
    expect(hasEmptyMeals(d)).toBe(false);
  });

  test("true when any meal has zero items", () => {
    const d = day([
      { id: "m1", planMealId: null, name: "Lunch", items: [entry("e1")] },
      { id: "m2", planMealId: null, name: "Snack", items: [] },
    ]);
    expect(hasEmptyMeals(d)).toBe(true);
  });
});

describe("pruneEmptyMeals", () => {
  test("returns the same reference when nothing is empty (no-op)", () => {
    const d = day([{ id: "m1", planMealId: null, name: "Lunch", items: [entry("e1")] }]);
    expect(pruneEmptyMeals(d)).toBe(d);
  });

  test("drops zero-item meals, keeps the rest", () => {
    const keep = { id: "m1", planMealId: "p1", name: "Lunch", items: [entry("e1")] };
    const d = day([keep, { id: "m2", planMealId: null, name: "Snack", items: [] }]);
    const out = pruneEmptyMeals(d);
    expect(out).not.toBe(d); // new object
    expect(out.meals).toEqual([keep]);
  });
});
