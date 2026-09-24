import { describe, expect, test } from "vitest";
import { gramsFor, macroFor, dayTotals } from "@/lib/macros";
import type { Food, LoggedMeal } from "@/lib/types";

const dal: Food = {
  id: "seed-dal",
  name: "Cooked dal",
  base: "g",
  kcal: 116,
  p: 7,
  c: 16,
  f: 2.5,
  servings: [{ label: "katori", g: 150 }],
  source: "seed",
  updatedAt: 0,
};

// A food with no kcal, to exercise the derived-kcal fallback.
const nokcal: Food = {
  id: "x-nokcal",
  name: "No kcal",
  base: "g",
  kcal: 0,
  p: 10,
  c: 20,
  f: 5,
  servings: [{ label: "scoop", g: 50 }],
  source: "custom",
  updatedAt: 0,
};

describe("gramsFor", () => {
  test("g-unit returns qty verbatim", () => {
    expect(gramsFor(dal, 200, "g")).toBe(200);
  });

  test("ml-unit returns qty verbatim", () => {
    const milk: Food = { ...dal, base: "ml" };
    expect(gramsFor(milk, 250, "ml")).toBe(250);
  });

  test("named serving multiplies qty by serving grams", () => {
    expect(gramsFor(dal, 2, "katori")).toBe(300); // 2 * 150
  });

  test("unknown serving label resolves to 0 grams", () => {
    expect(gramsFor(dal, 3, "bowl")).toBe(0);
  });
});

describe("macroFor", () => {
  test("scales per-100 macros by grams", () => {
    // 300 g of dal → factor 3
    const m = macroFor(dal, 2, "katori");
    expect(m.kcal).toBe(348); // 116 * 3
    expect(m.p).toBe(21); // 7 * 3
    expect(m.c).toBe(48); // 16 * 3
    expect(m.f).toBe(7.5); // 2.5 * 3
  });

  test("scales for a raw gram quantity", () => {
    const m = macroFor(dal, 50, "g"); // factor 0.5
    expect(m.kcal).toBe(58); // round(116 * 0.5)
    expect(m.p).toBe(3.5);
    expect(m.c).toBe(8);
    expect(m.f).toBe(1.3); // 2.5 * 0.5 = 1.25 -> rounds to 1.3
  });

  test("derives kcal from macros when kcal is missing", () => {
    const m = macroFor(nokcal, 100, "g"); // factor 1
    expect(m.p).toBe(10);
    expect(m.c).toBe(20);
    expect(m.f).toBe(5);
    expect(m.kcal).toBe(4 * 10 + 4 * 20 + 9 * 5); // 165
  });
});

describe("dayTotals", () => {
  const entry = (over: Partial<LoggedMeal["items"][number]>) => ({
    id: "e", foodId: "a", name: "food", qty: 1, unit: "g", kcal: 0, p: 0, c: 0, f: 0, updatedAt: 0, ...over,
  });

  test("sums entries across all of a day's logged meals", () => {
    const meals: LoggedMeal[] = [
      { id: "m1", planMealId: "p1", name: "Breakfast", items: [entry({ kcal: 300, p: 20, c: 30, f: 10 })] },
      { id: "m2", planMealId: null, name: "Snack", items: [entry({ kcal: 200, p: 10, c: 25, f: 5 })] },
    ];
    expect(dayTotals(meals)).toEqual({ kcal: 500, p: 30, c: 55, f: 15 });
  });

  test("multiple items in one meal add up", () => {
    const meals: LoggedMeal[] = [
      {
        id: "m1", planMealId: null, name: "Lunch",
        items: [entry({ kcal: 100, p: 5, c: 10, f: 2 }), entry({ id: "e2", kcal: 150, p: 8, c: 12, f: 3 })],
      },
    ];
    expect(dayTotals(meals)).toEqual({ kcal: 250, p: 13, c: 22, f: 5 });
  });

  test("empty day totals to zero", () => {
    expect(dayTotals([])).toEqual({ kcal: 0, p: 0, c: 0, f: 0 });
  });
});
