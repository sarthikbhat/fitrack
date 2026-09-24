// Per-lift PR stats derived from the logged-sets map (legacy:1519-1537).
// `logged` is the store's date -> exerciseName -> sets structure; set weights/reps
// are the raw strings the user typed (legacy stored them verbatim in the unit typed).
import type { LoggedSet } from "@/lib/types";
import { todayISO } from "@/lib/dates";

export type Logged = Record<string, Record<string, LoggedSet[]>>;

export type ExStats = { best1: number; bestTxt: string; bestW: number; last: string };

/** Most recent prior day's sets for an exercise that has any weight/reps (legacy:1519-1524). */
export function lastEntry(logged: Logged, name: string): LoggedSet[] | null {
  const today = todayISO();
  const dates = Object.keys(logged)
    .filter((d) => d < today)
    .sort()
    .reverse();
  for (const d of dates) {
    const a = logged[d][name];
    if (a && a.some((s) => s.w || s.r)) return a;
  }
  return null;
}

/** Best set / est. 1RM / heaviest weight / last date for an exercise (legacy:1525-1537).
    est. 1RM uses the Epley formula w*(1+r/30). Returns null if never logged. */
export function exStats(logged: Logged, name: string): ExStats | null {
  let bestW = 0,
    best1 = 0,
    bestTxt = "",
    last = "";
  for (const d of Object.keys(logged)) {
    const a = logged[d][name];
    if (!a) continue;
    let dayHas = false;
    for (const s of a) {
      const w = parseFloat(s.w),
        r = parseInt(s.r);
      if (w > 0 && r > 0) {
        dayHas = true;
        const e1 = w * (1 + r / 30);
        if (e1 > best1) {
          best1 = e1;
          bestTxt = s.w + " × " + r;
        }
        if (w > bestW) bestW = w;
      }
    }
    if (dayHas && d > last) last = d;
  }
  return best1 ? { best1: Math.round(best1), bestTxt, bestW, last } : null;
}
