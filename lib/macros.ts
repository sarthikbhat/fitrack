import type { Food, LoggedMeal } from "@/lib/types";

export type Macros = { kcal: number; p: number; c: number; f: number };

/**
 * Resolve a portion to grams (or ml — the food's base unit).
 * `unit === 'g' | 'ml'` is taken as a literal quantity; any other unit is
 * treated as a named serving label and multiplied by that serving's gram weight.
 * An unknown label resolves to 0 grams (nothing logged rather than a wrong guess).
 */
export function gramsFor(food: Food, qty: number, unit: string): number {
  if (unit === "g" || unit === "ml") return qty;
  const serving = food.servings.find((s) => s.label === unit);
  return serving ? qty * serving.g : 0;
}

/**
 * Scale a food's per-100 macros to the given portion.
 * kcal uses the stored value when present; otherwise it is derived from the
 * scaled macros (4/4/9 Atwater factors) so foods without kcal still total up.
 */
export function macroFor(food: Food, qty: number, unit: string): Macros {
  const factor = gramsFor(food, qty, unit) / 100;
  const p = round1(food.p * factor);
  const c = round1(food.c * factor);
  const f = round1(food.f * factor);
  const kcal = food.kcal > 0 ? Math.round(food.kcal * factor) : Math.round(4 * p + 4 * c + 9 * f);
  return { kcal, p, c, f };
}

/** Sum a set of macro-bearing rows (log entries or meal items) into one rollup. */
export function sumMacros(rows: Macros[]): Macros {
  return rows.reduce<Macros>(
    (acc, e) => ({
      kcal: acc.kcal + (e.kcal || 0),
      p: round1(acc.p + (e.p || 0)),
      c: round1(acc.c + (e.c || 0)),
      f: round1(acc.f + (e.f || 0)),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
}

/**
 * A day's totals: the sum of every LogEntry across all of that day's LoggedMeals
 * (confirmed-as-planned, logged-different, and custom). Unconfirmed plan
 * placeholders are not part of the diary, so they never count here.
 */
export function dayTotals(meals: LoggedMeal[]): Macros {
  return sumMacros(meals.flatMap((m) => m.items));
}

/** One decimal place — keeps macro grams tidy without float dust. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
