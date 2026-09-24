import type { DiaryDay, LogEntry, LoggedMeal, Plan, Profile, State } from "@/lib/types";
import { makeId, now } from "@/lib/ids";
import { TARGETS } from "@/data/nutrition";

// v2: nutrition reshaped into one Plan (recurring meals) + a per-day Diary of
// LoggedMeals. Replaces the v1 eaten/mealAdd/mealEdit/mealDel + flat diary array.
export const CURRENT_VERSION = 2;

/** A fresh user's starter plan: three empty meals to fill in. */
export function starterPlan(): Plan {
  return {
    meals: [
      { id: makeId(), name: "Breakfast", items: [] },
      { id: makeId(), name: "Lunch", items: [] },
      { id: makeId(), name: "Dinner", items: [] },
    ],
  };
}

export function emptyState(): State {
  return {
    v: CURRENT_VERSION,
    userId: "local",
    profile: null,
    body: { bw: 75, startWeight: 75, goalWeight: 75, history: [] },
    // Default target is the plan default (TARGETS); auto:false means "not personalised".
    goals: { mode: "maintain", kcal: TARGETS.kcal, p: TARGETS.protein, c: TARGETS.carbs, f: TARGETS.fat, auto: false },
    programs: {},
    activeProgramId: null,
    workouts: [],
    sessions: [],
    logged: {},
    settings: { rest: 90, autoRest: true, shareWorkouts: true },
    notes: {},
    added: {},
    removed: {},
    order: {},
    custom: {},
    foods: {},
    plan: starterPlan(),
    diary: {},
  };
}

/** Bring any persisted blob forward to CURRENT_VERSION. Never downgrades. */
export function migrate(blob: unknown): State {
  if (blob && typeof blob === "object" && "v" in blob) {
    const v = (blob as { v: unknown }).v;
    if (typeof v === "number") {
      if (v > CURRENT_VERSION) return blob as State; // newer: leave as-is
      // v <= CURRENT_VERSION: merge onto empty base, then reshape nutrition.
      return reshape({ ...emptyState(), ...(blob as object), v: CURRENT_VERSION });
    }
  }
  // versionless (legacy or unknown): best-effort import.
  return importLegacy(blob);
}

/**
 * Normalise the nutrition shape on any migrated blob:
 *  - convert a v1 flat `diary` (Record<date, LogEntry[]>) into the LoggedMeal shape,
 *  - ensure a `plan` exists (seed the starter plan for pre-v2 blobs),
 *  - drop the retired eaten/mealAdd/mealEdit/mealDel slices.
 */
function reshape(s: Record<string, unknown>): State {
  s.diary = migrateDiary(s.diary);
  const plan = s.plan as Plan | undefined;
  if (!plan || typeof plan !== "object" || !Array.isArray(plan.meals)) s.plan = starterPlan();
  // Passthrough for the feed toggle: older blobs carry a settings object without
  // `shareWorkouts`, so default it to true (sharing on by default).
  const settings = s.settings as Partial<State["settings"]> | undefined;
  if (settings && typeof settings === "object" && typeof settings.shareWorkouts !== "boolean") {
    s.settings = { ...settings, shareWorkouts: true } as State["settings"];
  }
  delete s.eaten;
  delete s.mealAdd;
  delete s.mealEdit;
  delete s.mealDel;
  return s as unknown as State;
}

/** Cap a legacy meal key ("breakfast") into a display name ("Breakfast"). */
function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Meal";
}

/**
 * v1 → v2 diary conversion. The old shape was Record<date, LogEntry[]> where each
 * entry carried a `.meal` tag; group those entries into custom LoggedMeals named by
 * their old meal value. A value already in the new {meals:[]} shape passes through.
 */
export function migrateDiary(blob: unknown): Record<string, DiaryDay> {
  const out: Record<string, DiaryDay> = {};
  if (!blob || typeof blob !== "object") return out;
  for (const [date, val] of Object.entries(blob as Record<string, unknown>)) {
    if (Array.isArray(val)) {
      const order: string[] = [];
      const groups: Record<string, LogEntry[]> = {};
      for (const raw of val) {
        if (!raw || typeof raw !== "object") continue;
        const e = raw as Record<string, unknown>;
        const meal = typeof e.meal === "string" ? e.meal : "snack";
        if (!groups[meal]) {
          groups[meal] = [];
          order.push(meal);
        }
        groups[meal].push({
          id: typeof e.id === "string" ? e.id : makeId(),
          foodId: typeof e.foodId === "string" ? e.foodId : undefined,
          name: typeof e.name === "string" ? e.name : "",
          qty: Number(e.qty) || 0,
          unit: typeof e.unit === "string" ? e.unit : "g",
          kcal: Number(e.kcal) || 0,
          p: Number(e.p) || 0,
          c: Number(e.c) || 0,
          f: Number(e.f) || 0,
          updatedAt: Number(e.updatedAt) || now(),
        });
      }
      const meals: LoggedMeal[] = order.map((m) => ({
        id: makeId(),
        planMealId: null,
        name: cap(m),
        items: groups[m],
      }));
      out[date] = { meals };
    } else if (val && typeof val === "object" && Array.isArray((val as DiaryDay).meals)) {
      out[date] = val as DiaryDay; // already v2
    }
  }
  return out;
}

/** One-time conversion of the old single-user localStorage `fitrack-v2` blob. */
export function importLegacy(blob: unknown): State {
  const s = emptyState();
  if (!blob || typeof blob !== "object") return s;
  const o = blob as Record<string, unknown>;

  if (typeof o.bw === "number") s.body.bw = o.bw;
  if (typeof o.goal === "number") s.body.goalWeight = o.goal;
  if (typeof o.height === "number") {
    s.profile = { ...defaultProfile(), heightCm: o.height };
  }

  if (typeof o.start === "number") s.body.startWeight = o.start;
  else if (typeof o.bw === "number") s.body.startWeight = o.bw;

  if (Array.isArray(o.bwLog)) {
    s.body.history = o.bwLog
      .filter((e): e is { d: string; kg: number } => !!e && typeof e === "object")
      .map((e) => ({ date: String((e as { d: unknown }).d ?? ""), kg: Number((e as { kg: unknown }).kg ?? 0) }));
  }

  if (Array.isArray(o.history)) {
    s.sessions = o.history
      .filter((h): h is Record<string, unknown> => !!h && typeof h === "object")
      .map((h) => ({
        id: makeId(),
        date: typeof h.date === "string" ? h.date : "",
        name: typeof h.name === "string" ? h.name : "",
        sets: Number(h.sets ?? 0),
        vol: Number(h.vol ?? 0),
        updatedAt: now(),
      }));
  }

  if (o.logged && typeof o.logged === "object") {
    s.logged = o.logged as State["logged"];
  }

  if (typeof o.rest === "number") s.settings.rest = o.rest;
  if (typeof o.autoRest === "boolean") s.settings.autoRest = o.autoRest;

  if (o.notes && typeof o.notes === "object") {
    s.notes = o.notes as Record<string, string>;
  }

  // Best-effort passthrough of the legacy today's-plan editing maps.
  if (o.added && typeof o.added === "object") s.added = o.added as State["added"];
  if (o.removed && typeof o.removed === "object") s.removed = o.removed as State["removed"];
  if (o.order && typeof o.order === "object") s.order = o.order as State["order"];
  if (o.custom && typeof o.custom === "object") s.custom = o.custom as State["custom"];

  // Any legacy food diary comes through the shared reshape path.
  if (o.diary && typeof o.diary === "object") s.diary = migrateDiary(o.diary);

  // Legacy personalised target `targetOverride {kcal,protein,carbs,fat}` → goals {kcal,p,c,f,auto:true}.
  const to = o.targetOverride;
  if (to && typeof to === "object") {
    const t = to as Record<string, unknown>;
    s.goals = {
      mode: s.goals.mode,
      kcal: Number(t.kcal ?? s.goals.kcal),
      p: Number(t.protein ?? s.goals.p),
      c: Number(t.carbs ?? s.goals.c),
      f: Number(t.fat ?? s.goals.f),
      auto: true,
    };
  }

  return s;
}

export function defaultProfile(): Profile {
  return {
    name: "",
    sex: "male",
    age: 30,
    heightCm: 175,
    activity: 3,
    units: { mass: "kg", len: "cm", energy: "kcal" },
    theme: "dark",
    accent: "#2BE38B",
    startDay: 1,
  };
}
