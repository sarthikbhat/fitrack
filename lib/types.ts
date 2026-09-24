import type { PlanDay, PlanExercise } from "@/data/plan";

export type Units = { mass: "kg" | "lb"; len: "cm" | "ft"; energy: "kcal" | "kJ" };

export type Profile = {
  name: string;
  sex: "male" | "female";
  age: number;
  heightCm: number;
  activity: 1 | 2 | 3 | 4 | 5;
  units: Units;
  theme: "dark" | "light";
  accent: string;
  startDay: 0 | 1;
};

export type Body = {
  bw: number; // kg (canonical)
  startWeight: number; // kg
  goalWeight: number; // kg
  history: { date: string; kg: number }[]; // bodyweight log (was bwLog)
};

export type LoggedSet = { w: string; r: string; done: boolean }; // w/r are raw input strings (legacy)

export type SessionSummary = {
  id: string;
  date: string; // ISO
  name: string;
  sets: number;
  vol: number;
  updatedAt: number;
};

export type Settings = {
  rest: number; // seconds
  autoRest: boolean;
};

export type Goals = {
  mode: "cut" | "maintain" | "bulk";
  kcal: number;
  p: number;
  c: number;
  f: number;
  auto: boolean;
};

export type SetEntry = { reps: number; weight: number; done: boolean };

// A saved workout program carries the same PlanDay[] shape that Train / Program view /
// day.ts consume, so the active program is a drop-in replacement for the hardcoded PLAN.
export type Program = { id: string; name: string; days: PlanDay[]; updatedAt: number };

export type WorkoutLog = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  exercise: string;
  sets: SetEntry[];
  updatedAt: number;
};

export type Food = {
  id: string;
  name: string;
  brand?: string;
  base: "g" | "ml";
  kcal: number; // per 100 base units
  p: number;
  c: number;
  f: number;
  servings: { label: string; g: number }[];
  source: "seed" | "custom" | "off"; // off = OpenFoodFacts (upserted on first log)
  updatedAt: number;
};

// ---- Unified nutrition model: one Plan of recurring meals + a per-day Diary ----

// A food + portion snapshot. `foodId` links back to the food library when known;
// macros are stored so a meal totals up even if the source food later changes.
export type MealItem = {
  id: string;
  foodId?: string;
  name: string;
  qty: number;
  unit: string; // "g" | "ml" | a serving label
  kcal: number;
  p: number;
  c: number;
  f: number;
};

// A recurring meal the user expects to eat (Breakfast, Lunch, …).
export type PlannedMeal = { id: string; name: string; items: MealItem[] };
export type Plan = { meals: PlannedMeal[] };

// A concrete food actually eaten on a given day (macro snapshot at add-time).
export type LogEntry = {
  id: string;
  foodId?: string;
  name: string;
  qty: number;
  unit: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  updatedAt: number;
};

// A meal as it actually happened on a day. `planMealId` links it to the plan slot
// it fulfils (confirmed-as-planned or logged-different); null for a custom meal.
export type LoggedMeal = { id: string; planMealId: string | null; name: string; items: LogEntry[] };
export type DiaryDay = { meals: LoggedMeal[] };

export type State = {
  v: number;
  userId: string; // "local" in Spec 1
  profile: Profile | null; // null until onboarding completes
  body: Body;
  goals: Goals;
  programs: Record<string, Program>;
  activeProgramId: string | null;
  workouts: WorkoutLog[];
  sessions: SessionSummary[];
  logged: Record<string, Record<string, LoggedSet[]>>; // date -> exerciseName -> sets
  settings: Settings;
  notes: Record<string, string>; // date -> note
  // Today's-plan editing slices (read-only here; written by the later picker plan). Keyed by day id.
  added: Record<string, PlanExercise[]>; // extra exercises appended to a day
  removed: Record<string, string[]>; // base exercise names removed from a day
  order: Record<string, string[]>; // exercise-name ordering override for a day
  custom: Record<string, PlanDay>; // per-date day override (keyed by ISO date)
  foods: Record<string, Food>;
  // Unified nutrition model: the user's recurring plan + per-day diary of what was eaten.
  plan: Plan;
  diary: Record<string, DiaryDay>; // keyed by ISO date
};
