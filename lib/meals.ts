// Nutrition helpers for the unified Plan/Diary model. Pure & tested.
import type { DiaryDay } from "@/lib/types";

/** True when the day holds at least one logged meal with no items. */
export function hasEmptyMeals(day: DiaryDay | undefined): boolean {
  return !!day && day.meals.some((m) => m.items.length === 0);
}

/**
 * Drop any logged meals with zero items from a day, returning a new DiaryDay.
 * Returns the same reference when nothing needs pruning so callers can no-op.
 */
export function pruneEmptyMeals(day: DiaryDay): DiaryDay {
  if (!hasEmptyMeals(day)) return day;
  return { ...day, meals: day.meals.filter((m) => m.items.length > 0) };
}

/**
 * Default name for a freshly-added custom meal, chosen by time of day:
 * Breakfast before 11:00, Lunch 11:00–15:59, Dinner 16:00–20:59, else Snack.
 */
export function mealNameForTime(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 11) return "Breakfast";
  if (h < 16) return "Lunch";
  if (h < 21) return "Dinner";
  return "Snack";
}
