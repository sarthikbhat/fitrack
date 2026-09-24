import { describe, expect, test } from "vitest";
import { mealNameForTime } from "@/lib/meals";

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
