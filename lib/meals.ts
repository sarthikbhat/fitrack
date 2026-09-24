// Nutrition helpers for the unified Plan/Diary model. Pure & tested.

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
