// Pure day-resolution + logging logic for the Train view.
// Ported from legacy/index.html (renderTrain helpers + finishSession).
// All functions are pure: state is passed in, nothing is mutated in place.
import type { LoggedSet, Program, SessionSummary } from "@/lib/types";
import type { PlanDay, PlanExercise } from "@/data/plan";
import { PLAN } from "@/data/plan";
import { weekdayIndex } from "@/lib/dates";
import { makeId, now } from "@/lib/ids";

export type Logged = Record<string, Record<string, LoggedSet[]>>;

/**
 * The days of the currently-active program, or the hardcoded PLAN as a SAFE FALLBACK.
 * With an empty registry (no active program) the app behaves exactly as before -
 * so plannedForToday / dayById route through this to stay program-aware.
 */
export function activeDays(state: {
  programs: Record<string, Program>;
  activeProgramId: string | null;
}): PlanDay[] {
  const id = state.activeProgramId;
  const prog = id ? state.programs[id] : undefined;
  if (prog && prog.days.length) return prog.days;
  return PLAN;
}

/** Today's planned day, Monday-based. Index 6 (Sunday) → null/rest (legacy:1552). */
export function plannedForToday(d: Date = new Date(), days: PlanDay[] = PLAN): PlanDay | null {
  const i = weekdayIndex(d);
  return i < days.length && i < 6 ? days[i] : null;
}

/** Resolve a day by id, preferring a per-date custom override (legacy:1547-1551).
    Searches the active program's days (or PLAN as the SAFE FALLBACK). */
export function dayById(
  id: string,
  custom: Record<string, PlanDay>,
  today: string,
  days: PlanDay[] = PLAN,
): PlanDay | undefined {
  const c = custom[today];
  if (c && c.id === id) return c;
  return days.find((d) => d.id === id);
}

/** Effective exercise list for a day: base minus removed, plus added, reordered (legacy:1555-1566). */
export function dayExercises(
  day: PlanDay | null | undefined,
  added: Record<string, PlanExercise[]>,
  removed: Record<string, string[]>,
  order: Record<string, string[]>,
): PlanExercise[] {
  if (!day) return [];
  const rm = new Set(removed[day.id] || []);
  const base = day.ex.filter((e) => !rm.has(e.name));
  let list = base.concat(added[day.id] || []);
  const ord = order[day.id];
  if (ord && ord.length) {
    const idx = (n: string) => {
      const i = ord.indexOf(n);
      return i < 0 ? 999 : i;
    };
    list = list.slice().sort((a, b) => idx(a.name) - idx(b.name));
  }
  return list;
}

/** Stable id for a per-date custom day (legacy `'custom:' + dt`, 2182). */
export function customDayId(date: string): string {
  return "custom:" + date;
}

/**
 * Pure reorder of a display-ordered name list: move `name` by `dir` (-1 up / +1 down)
 * and return the new order, or `null` when the move would fall off either end
 * (legacy `moveEx`, 2170-2173).
 */
export function applyReorder(names: string[], name: string, dir: -1 | 1): string[] | null {
  const i = names.indexOf(name);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= names.length) return null;
  const next = names.slice();
  next.splice(j, 0, next.splice(i, 1)[0]);
  return next;
}

export type EditSlices = {
  added: Record<string, PlanExercise[]>;
  removed: Record<string, string[]>;
  custom: Record<string, PlanDay>;
};

/**
 * New `added`/`removed` maps after adding `name` to a day (legacy addEx/addCustom, 2140-2151):
 * un-remove a base lift if it was removed, else append a new exercise (no-op if already present).
 */
export function addExercise(
  s: EditSlices,
  dayId: string,
  name: string,
  muscle: string,
  today: string,
  days: PlanDay[] = PLAN,
): { added: Record<string, PlanExercise[]>; removed: Record<string, string[]> } {
  const removedArr = s.removed[dayId] || [];
  if (removedArr.includes(name)) {
    return { added: s.added, removed: { ...s.removed, [dayId]: removedArr.filter((n) => n !== name) } };
  }
  const day = dayById(dayId, s.custom, today, days);
  const isBase = !!day && day.ex.some((e) => e.name === name);
  const list = s.added[dayId] || [];
  if (isBase || list.some((e) => e.name === name)) return { added: s.added, removed: s.removed };
  const item: PlanExercise = { name, muscle: muscle as PlanExercise["muscle"], sets: 3, reps: "10", start: 0 };
  return { added: { ...s.added, [dayId]: [...list, item] }, removed: s.removed };
}

/**
 * New `added`/`removed` maps after removing `name` from a day (legacy delEx, 2152-2155):
 * splice an added exercise out, else record a base lift as removed (no-op if already removed).
 */
export function removeExercise(
  s: Pick<EditSlices, "added" | "removed">,
  dayId: string,
  name: string,
): { added: Record<string, PlanExercise[]>; removed: Record<string, string[]> } {
  const list = s.added[dayId] || [];
  if (list.some((e) => e.name === name)) {
    return { added: { ...s.added, [dayId]: list.filter((e) => e.name !== name) }, removed: s.removed };
  }
  const removedArr = s.removed[dayId] || [];
  if (removedArr.includes(name)) return { added: s.added, removed: s.removed };
  return { added: s.added, removed: { ...s.removed, [dayId]: [...removedArr, name] } };
}

/** Existing logged sets for an exercise, or a fresh default of `plannedSets` blank rows (legacy:1568-1572). */
export function logFor(logged: Logged, date: string, exName: string, plannedSets: number): LoggedSet[] {
  const existing = logged[date]?.[exName];
  if (existing) return existing;
  return Array.from({ length: plannedSets || 1 }, () => ({ w: "", r: "", done: false }));
}

/** Count of done sets (legacy:1573). */
export function exDone(sets: LoggedSet[]): number {
  return sets.filter((s) => s.done).length;
}

/** Build a session summary from a day's logged sets - total done sets + volume (legacy:2289-2298). */
export function sessionFromDay(
  logged: Logged,
  date: string,
  dayName: string,
  exercises: PlanExercise[],
): SessionSummary {
  let sets = 0;
  let vol = 0;
  for (const ex of exercises) {
    for (const s of logFor(logged, date, ex.name, ex.sets)) {
      if (s.done) {
        sets++;
        vol += (parseFloat(s.w) || 0) * (parseInt(s.r) || 0);
      }
    }
  }
  return { id: makeId(), date, name: dayName, sets, vol, updatedAt: now() };
}
