"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Body,
  Food,
  Goals,
  LoggedSet,
  LogEntry,
  LoggedMeal,
  MealItem,
  Profile,
  Program,
  State,
  Units,
} from "@/lib/types";
import type { PlanDay, PlanExercise } from "@/data/plan";
import { TARGETS } from "@/data/nutrition";
import { templateById } from "@/data/templates";
import seedFoodsRaw from "@/data/seed-foods.json";
import { dayTotals as calcDayTotals, macroFor, type Macros } from "@/lib/macros";
import { makeId, now } from "@/lib/ids";
import { calcTargets } from "@/lib/targets";
import { CURRENT_VERSION, defaultProfile, emptyState, migrate } from "@/lib/migrate";
import { parseImport } from "@/lib/validate";
import { idbStorage } from "@/lib/db";
import { getSyncMeta, setLastSyncedAt, type SyncMeta } from "@/lib/sync/changes";
import {
  logFor,
  sessionFromDay,
  dayById,
  dayExercises,
  applyReorder,
  customDayId,
  addExercise,
  removeExercise,
  plannedForToday,
  activeDays,
} from "@/lib/day";
import { todayISO } from "@/lib/dates";
import { pruneEmptyMeals } from "@/lib/meals";

// Seed foods are a static import, merged in at read time by allFoods() - never
// copied into the persisted store, so the saved blob stays small.
const SEED_FOODS = seedFoodsRaw as unknown as Food[];

// A picked food + portion, the shared input for logging and plan-building.
export type FoodPortion = { food: Food; qty: number; unit: string };

/** Snapshot a food + portion into the shared macro fields used by items/entries. */
function portionSnapshot(input: FoodPortion): {
  foodId: string;
  name: string;
  qty: number;
  unit: string;
} & Macros {
  const m = macroFor(input.food, input.qty, input.unit);
  return {
    foodId: input.food.id,
    name: input.food.name,
    qty: input.qty,
    unit: input.unit,
    ...m,
  };
}

/** Upsert an OpenFoodFacts food into the library so it's reusable/offline later. */
function upsertOffFood(foods: State["foods"], food: Food): State["foods"] {
  if (food.source !== "off" || foods[food.id]) return foods;
  return { ...foods, [food.id]: { ...food, updatedAt: now() } };
}

/** Clone the logged map down to one exercise's set array so writes stay immutable. */
function withSets(
  logged: State["logged"],
  date: string,
  exName: string,
  plannedSets: number,
  fn: (sets: LoggedSet[]) => LoggedSet[],
): State["logged"] {
  const current = logFor(logged, date, exName, plannedSets).map((s) => ({ ...s }));
  return { ...logged, [date]: { ...(logged[date] || {}), [exName]: fn(current) } };
}

/** Deep-clone a PlanDay[] so a saved program owns independent day/exercise objects
    (mutating a program never touches the source template or PLAN). */
function cloneDays(days: PlanDay[]): PlanDay[] {
  return days.map((d) => ({ ...d, tags: [...d.tags], ex: d.ex.map((e) => ({ ...e })) }));
}

/** Drop any per-day edit slices for a custom day id (legacy:2183 resets added/removed/order). */
function clearedSlices(s: State, cid: string): Pick<State, "added" | "removed" | "order"> {
  const added = { ...s.added };
  const removed = { ...s.removed };
  const order = { ...s.order };
  delete added[cid];
  delete removed[cid];
  delete order[cid];
  return { added, removed, order };
}

export type OnboardingData = {
  name: string;
  sex: "male" | "female";
  age: number;
  heightCm: number;
  activity: 1 | 2 | 3 | 4 | 5;
  units: Units;
  bw: number; // kg (canonical)
  goalWeight: number; // kg (canonical)
  goalMode: Goals["mode"];
};

export type Store = State & {
  hydrated: boolean;
  setHydrated: () => void;
  // Auth: flip the id local data is tagged with. Never persisted as an action
  // (excluded from partialize); userId itself stays part of the persisted State.
  setUserId: (id: string) => void;
  reset: () => void;
  setBw: (kg: number) => void;
  setGoal: (kg: number) => void;
  setHeight: (cm: number) => void;
  deleteSession: (id: string) => void;
  setLoggedSet: (date: string, exName: string, i: number, field: "w" | "r", value: string, plannedSets: number) => void;
  toggleSetDone: (date: string, exName: string, i: number, plannedSets: number) => void;
  addSet: (date: string, exName: string, plannedSets: number) => void;
  delSet: (date: string, exName: string, i: number, plannedSets: number) => void;
  setNote: (date: string, text: string) => void;
  finishSession: (date: string, dayName: string, exercises: PlanExercise[]) => void;
  discardDay: (date: string, exNames: string[]) => void;
  // Day-edit slices (mutate persisted added/removed/order; legacy picker handlers 2140-2173).
  addExerciseToDay: (dayId: string, item: { name: string; muscle: string }) => void;
  addCustomExercise: (dayId: string, name: string, muscle: string) => void;
  removeExerciseFromDay: (dayId: string, name: string) => void;
  reorderExercise: (dayId: string, name: string, dir: -1 | 1) => void;
  // ---- program builder (multiple programs from templates) ----
  createProgramFromTemplate: (templateId: string) => string;
  createBlankProgram: (name: string) => string;
  saveActiveAsProgram: (name?: string) => string;
  renameProgram: (id: string, name: string) => void;
  deleteProgram: (id: string) => void;
  setActiveProgram: (id: string) => void;
  // Switch-workout sheet (per-date custom day; legacy pickWorkout 2181-2187).
  setCustomDay: (date: string, day: PlanDay) => void;
  startFreestyle: (date: string) => void;
  clearCustomDay: (date: string) => void;
  // ---- nutrition: plan editing (the user's recurring meals) ----
  addPlanMeal: (name: string) => string;
  renamePlanMeal: (id: string, name: string) => void;
  removePlanMeal: (id: string) => void;
  addPlanItem: (mealId: string, item: FoodPortion) => void;
  removePlanItem: (mealId: string, itemId: string) => void;
  // ---- nutrition: day logging (what actually happened) ----
  confirmPlanMeal: (date: string, planMealId: string) => string; // "Ate this" → returns loggedMeal id
  logDifferent: (date: string, planMealId: string) => string; // empty slot to log actual items into
  logToMeal: (date: string, loggedMealId: string, item: FoodPortion) => void;
  addCustomMeal: (date: string, name: string) => string;
  renameLoggedMeal: (date: string, id: string, name: string) => void;
  removeLoggedMeal: (date: string, id: string) => void;
  removeLoggedItem: (date: string, mealId: string, entryId: string) => void;
  // Safety net: drop any zero-item logged meals for a day (called when the add sheet closes)
  // so a deferred meal that never got a food never lingers as an empty card / stray delete icon.
  pruneEmptyMeals: (date: string) => void;
  dayTotals: (date: string) => Macros;
  // Food library.
  addCustomFood: (food: Omit<Food, "id" | "updatedAt" | "source">) => string;
  allFoods: () => Food[];
  setGoalsAuto: (profile: Profile, body: Body) => void;
  setGoalsManual: (patch: Partial<Goals>) => void;
  resetGoals: () => void;
  // ---- profile / settings (customization layer) ----
  updateProfile: (patch: Partial<Profile>) => void;
  setUnitsMass: (mass: "kg" | "lb") => void;
  setTheme: (theme: "dark" | "light") => void;
  setRest: (sec: number) => void;
  setAutoRest: (on: boolean) => void;
  setSex: (sex: "male" | "female") => void;
  setAge: (age: number) => void;
  setActivity: (activity: 1 | 2 | 3 | 4 | 5) => void;
  setAccent: (hex: string) => void;
  setStartDay: (day: 0 | 1) => void;
  completeOnboarding: (data: OnboardingData) => void;
  // ---- data export / import / reset ----
  exportState: () => string;
  importState: (json: string) => void;
  resetAll: () => void;
  // Active target: goals normalised to {kcal,p,c,f} (legacy curTargets, 1782).
  curTargets: () => { kcal: number; p: number; c: number; f: number };
  // ---- sync (foundation only; network push/pull lands in the next plan) ----
  // Expose the persist-diff SyncMeta + last-synced stamp to the future engine.
  getSyncMeta: () => SyncMeta;
  setLastSyncedAt: (t: number) => void;
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyState(),
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      setUserId: (id) => set({ userId: id }),
      reset: () => set({ ...emptyState() }),
      setBw: (kg) =>
        set((s) => {
          const date = new Date().toISOString().slice(0, 10);
          const history = [...s.body.history.filter((e) => e.date !== date), { date, kg }].sort(
            (a, b) => a.date.localeCompare(b.date),
          );
          return { body: { ...s.body, bw: kg, history } };
        }),
      setGoal: (kg) => set((s) => ({ body: { ...s.body, goalWeight: Math.min(300, Math.max(30, kg)) } })),
      setHeight: (cm) =>
        set((s) => ({
          profile: s.profile ? { ...s.profile, heightCm: Math.min(220, Math.max(120, cm)) } : s.profile,
        })),
      deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),
      setLoggedSet: (date, exName, i, field, value, plannedSets) =>
        set((s) => ({
          logged: withSets(s.logged, date, exName, plannedSets, (sets) => {
            if (sets[i]) sets[i] = { ...sets[i], [field]: value };
            return sets;
          }),
        })),
      toggleSetDone: (date, exName, i, plannedSets) =>
        set((s) => ({
          logged: withSets(s.logged, date, exName, plannedSets, (sets) => {
            if (sets[i]) sets[i] = { ...sets[i], done: !sets[i].done };
            return sets;
          }),
        })),
      addSet: (date, exName, plannedSets) =>
        set((s) => ({
          logged: withSets(s.logged, date, exName, plannedSets, (sets) => [
            ...sets,
            { w: "", r: "", done: false },
          ]),
        })),
      delSet: (date, exName, i, plannedSets) =>
        set((s) => ({
          logged: withSets(s.logged, date, exName, plannedSets, (sets) => sets.filter((_, j) => j !== i)),
        })),
      setNote: (date, text) => set((s) => ({ notes: { ...s.notes, [date]: text } })),
      finishSession: (date, dayName, exercises) =>
        set((s) => {
          const summary = sessionFromDay(s.logged, date, dayName, exercises);
          const rest = s.sessions.filter((h) => !(h.date === date && h.name === dayName));
          return { sessions: [summary, ...rest] };
        }),
      discardDay: (date, exNames) =>
        set((s) => {
          const day = { ...(s.logged[date] || {}) };
          for (const n of exNames) delete day[n];
          return { logged: { ...s.logged, [date]: day } };
        }),
      addExerciseToDay: (dayId, item) =>
        set((s) => addExercise(s, dayId, item.name, item.muscle, todayISO(), activeDays(s))),
      addCustomExercise: (dayId, name, muscle) =>
        set((s) => addExercise(s, dayId, name, muscle, todayISO(), activeDays(s))),
      removeExerciseFromDay: (dayId, name) =>
        set((s) => {
          const patch: Partial<State> = removeExercise(s, dayId, name);
          // Prune orphaned log data when removing from today's effective day (legacy:2156-2157).
          const dt = todayISO();
          const effTodayId = s.custom[dt] ? s.custom[dt].id : plannedForToday(new Date(), activeDays(s))?.id;
          if (dayId === effTodayId && s.logged[dt]?.[name]) {
            const dayLog = { ...s.logged[dt] };
            delete dayLog[name];
            patch.logged = { ...s.logged, [dt]: dayLog };
          }
          return patch;
        }),
      reorderExercise: (dayId, name, dir) =>
        set((s) => {
          const day = dayById(dayId, s.custom, todayISO(), activeDays(s));
          const names = dayExercises(day, s.added, s.removed, s.order).map((x) => x.name);
          const next = applyReorder(names, name, dir);
          if (!next) return {};
          return { order: { ...s.order, [dayId]: next } };
        }),
      // ---- program builder ----
      createProgramFromTemplate: (templateId) => {
        const tpl = templateById(templateId);
        const id = makeId();
        set((s) => {
          if (!tpl) return {};
          const prog: Program = { id, name: tpl.name, days: cloneDays(tpl.days), updatedAt: now() };
          return { programs: { ...s.programs, [id]: prog }, activeProgramId: id };
        });
        return id;
      },
      createBlankProgram: (name) => {
        const id = makeId();
        set((s) => {
          const prog: Program = { id, name: name.trim() || "New Program", days: [], updatedAt: now() };
          return { programs: { ...s.programs, [id]: prog }, activeProgramId: id };
        });
        return id;
      },
      // Snapshot the current effective days (active program, or PLAN as fallback) into a
      // new saved program so the default split becomes customizable. Day ids are preserved
      // (d1..d6 for PLAN), so existing added/removed/order edits keep applying.
      saveActiveAsProgram: (name) => {
        const id = makeId();
        set((s) => {
          const prog: Program = {
            id,
            name: (name ?? "").trim() || "My Program",
            days: cloneDays(activeDays(s)),
            updatedAt: now(),
          };
          return { programs: { ...s.programs, [id]: prog }, activeProgramId: id };
        });
        return id;
      },
      renameProgram: (id, name) =>
        set((s) => {
          const prog = s.programs[id];
          if (!prog) return {};
          return {
            programs: { ...s.programs, [id]: { ...prog, name: name.trim() || prog.name, updatedAt: now() } },
          };
        }),
      deleteProgram: (id) =>
        set((s) => {
          if (!s.programs[id]) return {};
          const programs = { ...s.programs };
          delete programs[id];
          // If the active program was deleted, fall back to another saved one, else null (→ PLAN).
          const activeProgramId =
            s.activeProgramId === id ? (Object.keys(programs)[0] ?? null) : s.activeProgramId;
          return { programs, activeProgramId };
        }),
      setActiveProgram: (id) =>
        set((s) => (s.programs[id] ? { activeProgramId: id } : {})),
      setCustomDay: (date, day) =>
        set((s) => {
          const cid = customDayId(date);
          const custom = {
            ...s.custom,
            [date]: {
              id: cid,
              label: "Custom",
              name: day.name,
              focus: day.focus,
              tags: day.tags.slice(),
              ex: day.ex.map((x) => ({ ...x })),
            } as PlanDay,
          };
          return { custom, ...clearedSlices(s, cid) };
        }),
      startFreestyle: (date) =>
        set((s) => {
          const cid = customDayId(date);
          const custom = {
            ...s.custom,
            [date]: { id: cid, label: "Custom", name: "Freestyle", focus: "Your picks today", tags: [], ex: [] } as PlanDay,
          };
          return { custom, ...clearedSlices(s, cid) };
        }),
      clearCustomDay: (date) =>
        set((s) => {
          const cid = customDayId(date);
          const custom = { ...s.custom };
          delete custom[date];
          return { custom, ...clearedSlices(s, cid) };
        }),
      // ---- nutrition: plan editing ----
      addPlanMeal: (name) => {
        const id = makeId();
        set((s) => ({
          plan: { meals: [...s.plan.meals, { id, name: name.trim() || "Meal", items: [] }] },
        }));
        return id;
      },
      renamePlanMeal: (id, name) =>
        set((s) => ({
          plan: {
            meals: s.plan.meals.map((m) => (m.id === id ? { ...m, name: name.trim() || m.name } : m)),
          },
        })),
      removePlanMeal: (id) =>
        set((s) => ({ plan: { meals: s.plan.meals.filter((m) => m.id !== id) } })),
      addPlanItem: (mealId, input) =>
        set((s) => {
          const item: MealItem = { id: makeId(), ...portionSnapshot(input) };
          return {
            foods: upsertOffFood(s.foods, input.food),
            plan: {
              meals: s.plan.meals.map((m) =>
                m.id === mealId ? { ...m, items: [...m.items, item] } : m,
              ),
            },
          };
        }),
      removePlanItem: (mealId, itemId) =>
        set((s) => ({
          plan: {
            meals: s.plan.meals.map((m) =>
              m.id === mealId ? { ...m, items: m.items.filter((it) => it.id !== itemId) } : m,
            ),
          },
        })),
      // ---- nutrition: day logging ----
      confirmPlanMeal: (date, planMealId) => {
        const id = makeId();
        set((s) => {
          const pm = s.plan.meals.find((m) => m.id === planMealId);
          if (!pm) return {};
          const day = s.diary[date] ?? { meals: [] };
          // Already logged this slot? leave it untouched.
          if (day.meals.some((m) => m.planMealId === planMealId)) return {};
          const items: LogEntry[] = pm.items.map((it) => ({
            id: makeId(),
            foodId: it.foodId,
            name: it.name,
            qty: it.qty,
            unit: it.unit,
            kcal: it.kcal,
            p: it.p,
            c: it.c,
            f: it.f,
            updatedAt: now(),
          }));
          const meal: LoggedMeal = { id, planMealId, name: pm.name, items };
          return { diary: { ...s.diary, [date]: { meals: [...day.meals, meal] } } };
        });
        return id;
      },
      logDifferent: (date, planMealId) => {
        const id = makeId();
        set((s) => {
          const pm = s.plan.meals.find((m) => m.id === planMealId);
          const day = s.diary[date] ?? { meals: [] };
          const existing = day.meals.find((m) => m.planMealId === planMealId);
          if (existing) return {}; // slot already has a logged meal; log into it instead
          const meal: LoggedMeal = { id, planMealId, name: pm?.name ?? "Meal", items: [] };
          return { diary: { ...s.diary, [date]: { meals: [...day.meals, meal] } } };
        });
        return id;
      },
      logToMeal: (date, loggedMealId, input) =>
        set((s) => {
          const day = s.diary[date] ?? { meals: [] };
          const entry: LogEntry = { id: makeId(), updatedAt: now(), ...portionSnapshot(input) };
          return {
            foods: upsertOffFood(s.foods, input.food),
            diary: {
              ...s.diary,
              [date]: {
                meals: day.meals.map((m) =>
                  m.id === loggedMealId ? { ...m, items: [...m.items, entry] } : m,
                ),
              },
            },
          };
        }),
      addCustomMeal: (date, name) => {
        const id = makeId();
        set((s) => {
          const day = s.diary[date] ?? { meals: [] };
          const meal: LoggedMeal = { id, planMealId: null, name: name.trim() || "Meal", items: [] };
          return { diary: { ...s.diary, [date]: { meals: [...day.meals, meal] } } };
        });
        return id;
      },
      renameLoggedMeal: (date, id, name) =>
        set((s) => {
          const day = s.diary[date];
          if (!day) return {};
          return {
            diary: {
              ...s.diary,
              [date]: {
                meals: day.meals.map((m) => (m.id === id ? { ...m, name: name.trim() || m.name } : m)),
              },
            },
          };
        }),
      removeLoggedMeal: (date, id) =>
        set((s) => {
          const day = s.diary[date];
          if (!day) return {};
          return { diary: { ...s.diary, [date]: { meals: day.meals.filter((m) => m.id !== id) } } };
        }),
      removeLoggedItem: (date, mealId, entryId) =>
        set((s) => {
          const day = s.diary[date];
          if (!day) return {};
          return {
            diary: {
              ...s.diary,
              [date]: {
                meals: day.meals.map((m) =>
                  m.id === mealId ? { ...m, items: m.items.filter((it) => it.id !== entryId) } : m,
                ),
              },
            },
          };
        }),
      pruneEmptyMeals: (date) =>
        set((s) => {
          const day = s.diary[date];
          if (!day) return {};
          const pruned = pruneEmptyMeals(day);
          if (pruned === day) return {}; // nothing to prune
          return { diary: { ...s.diary, [date]: pruned } };
        }),
      dayTotals: (date) => calcDayTotals(get().diary[date]?.meals ?? []),
      // ---- food library ----
      addCustomFood: (food) => {
        const id = makeId();
        const full: Food = { ...food, id, source: "custom", updatedAt: now() };
        set((s) => ({ foods: { ...s.foods, [id]: full } }));
        return id;
      },
      allFoods: () => {
        const merged: Record<string, Food> = {};
        for (const f of SEED_FOODS) merged[f.id] = f;
        for (const [id, f] of Object.entries(get().foods)) merged[id] = f; // custom overrides seed
        return Object.values(merged);
      },
      setGoalsAuto: (profile, body) =>
        set((s) => {
          const t = calcTargets({
            sex: profile.sex,
            age: profile.age,
            heightCm: profile.heightCm,
            activity: profile.activity,
            bw: body.bw,
            mode: s.goals.mode,
          });
          return { goals: { mode: s.goals.mode, ...t, auto: true } };
        }),
      setGoalsManual: (patch) =>
        set((s) => ({ goals: { ...s.goals, ...patch, auto: false } })),
      resetGoals: () =>
        set((s) => ({
          goals: {
            mode: s.goals.mode,
            kcal: TARGETS.kcal,
            p: TARGETS.protein,
            c: TARGETS.carbs,
            f: TARGETS.fat,
            auto: false,
          },
        })),
      curTargets: () => {
        const g = get().goals;
        return { kcal: g.kcal, p: g.p, c: g.c, f: g.f };
      },
      // ---- profile / settings ----
      updateProfile: (patch) =>
        set((s) => ({ profile: { ...(s.profile ?? defaultProfile()), ...patch } })),
      setUnitsMass: (mass) =>
        set((s) => {
          const base = s.profile ?? defaultProfile();
          return { profile: { ...base, units: { ...base.units, mass } } };
        }),
      setTheme: (theme) => set((s) => ({ profile: { ...(s.profile ?? defaultProfile()), theme } })),
      setRest: (sec) =>
        set((s) => ({ settings: { ...s.settings, rest: Math.max(15, Math.min(600, Math.round(sec))) } })),
      setAutoRest: (on) => set((s) => ({ settings: { ...s.settings, autoRest: on } })),
      setSex: (sex) => set((s) => ({ profile: { ...(s.profile ?? defaultProfile()), sex } })),
      setAge: (age) =>
        set((s) => ({ profile: { ...(s.profile ?? defaultProfile()), age: Math.max(13, Math.min(100, Math.round(age))) } })),
      setActivity: (activity) => set((s) => ({ profile: { ...(s.profile ?? defaultProfile()), activity } })),
      setAccent: (accent) => set((s) => ({ profile: { ...(s.profile ?? defaultProfile()), accent } })),
      setStartDay: (startDay) => set((s) => ({ profile: { ...(s.profile ?? defaultProfile()), startDay } })),
      completeOnboarding: (data) =>
        set(() => {
          const profile: Profile = {
            ...defaultProfile(),
            name: data.name.trim(),
            sex: data.sex,
            age: data.age,
            heightCm: data.heightCm,
            activity: data.activity,
            units: data.units,
          };
          const date = new Date().toISOString().slice(0, 10);
          const body: Body = {
            bw: data.bw,
            startWeight: data.bw,
            goalWeight: data.goalWeight,
            history: [{ date, kg: data.bw }],
          };
          const t = calcTargets({
            sex: profile.sex,
            age: profile.age,
            heightCm: profile.heightCm,
            activity: profile.activity,
            bw: body.bw,
            mode: data.goalMode,
          });
          const goals: Goals = { mode: data.goalMode, ...t, auto: true };
          return { profile, body, goals };
        }),
      // ---- data export / import / reset ----
      exportState: () => {
        const snapshot = get() as unknown as Record<string, unknown>;
        const data: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(snapshot)) {
          if (typeof val === "function" || k === "hydrated") continue;
          data[k] = val;
        }
        return JSON.stringify(data, null, 2);
      },
      importState: (json) => {
        // parseImport throws on invalid/newer blobs; caller catches and surfaces it.
        const next = parseImport(json);
        set({ ...next }); // shallow-merge: replaces data fields, keeps actions + hydrated.
      },
      resetAll: () => set({ ...emptyState() }),
      // ---- sync foundation ----
      getSyncMeta: () => getSyncMeta(),
      setLastSyncedAt: (t) => setLastSyncedAt(t),
    }),
    {
      name: "fitrack",
      version: CURRENT_VERSION,
      storage: createJSONStorage(() => idbStorage),
      // Bring older persisted shapes forward through our own migrate().
      migrate: (persisted) => migrate(persisted) as Store,
      partialize: (s) => {
        // Persist only data fields, never transient flags or actions.
        const {
          hydrated: _h,
          setHydrated: _sh,
          setUserId: _sui,
          reset: _r,
          setBw: _sb,
          setGoal: _sg,
          setHeight: _sht,
          deleteSession: _ds,
          setLoggedSet: _sls,
          toggleSetDone: _tsd,
          addSet: _as,
          delSet: _dls,
          setNote: _sn,
          finishSession: _fs,
          discardDay: _dd,
          addExerciseToDay: _aetd,
          addCustomExercise: _ace,
          removeExerciseFromDay: _refd,
          reorderExercise: _re,
          createProgramFromTemplate: _cpft,
          createBlankProgram: _cbp,
          saveActiveAsProgram: _saap,
          renameProgram: _rp,
          deleteProgram: _dp,
          setActiveProgram: _sap,
          setCustomDay: _scd,
          startFreestyle: _sf,
          clearCustomDay: _ccd,
          addPlanMeal: _apm,
          renamePlanMeal: _rpm,
          removePlanMeal: _rmpm,
          addPlanItem: _api,
          removePlanItem: _rpi,
          confirmPlanMeal: _cpm,
          logDifferent: _ld,
          logToMeal: _ltm,
          addCustomMeal: _acm,
          renameLoggedMeal: _rnlm,
          removeLoggedMeal: _rlm,
          removeLoggedItem: _rli,
          pruneEmptyMeals: _pem,
          dayTotals: _dt,
          addCustomFood: _acf,
          allFoods: _af,
          setGoalsAuto: _sga,
          setGoalsManual: _sgm,
          resetGoals: _rg,
          curTargets: _ct,
          updateProfile: _up,
          setUnitsMass: _sum,
          setTheme: _st,
          setRest: _sr,
          setAutoRest: _sar,
          setSex: _ssx,
          setAge: _sag,
          setActivity: _sac,
          setAccent: _sacc,
          setStartDay: _ssd,
          completeOnboarding: _co,
          exportState: _es,
          importState: _is,
          resetAll: _ra,
          getSyncMeta: _gsm,
          setLastSyncedAt: _slsa,
          ...data
        } = s;
        return data as State;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
