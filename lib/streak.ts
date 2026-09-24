import { addDays } from "@/lib/dates";

export function workoutDays(sessions: { date: string }[]): Set<string> {
  return new Set(sessions.map((s) => s.date));
}
/** Consecutive workout days ending today (or yesterday) — mirrors legacy:1539-1545. */
export function streak(sessions: { date: string }[], today: string): number {
  const days = workoutDays(sessions);
  if (!days.size) return 0;
  let n = 0;
  let cur = today;
  if (!days.has(cur)) {
    cur = addDays(cur, -1);
    if (!days.has(cur)) return 0;
  }
  while (days.has(cur)) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}
