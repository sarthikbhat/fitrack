// Workout program templates — the seed catalogue the Program Builder clones from.
// Each template is a ready-made split of PlanDay[]; cloning one (store.createProgramFromTemplate)
// deep-copies these days into a new Program so edits never touch the template.
//
// Every template day carries a program-unique id (prefixed with the template id) EXCEPT
// "6-Day PPL", which keeps d1..d6 so the app's existing added/removed/order edits — which are
// keyed by day id — continue to apply to the default split when it becomes a saved program.
import type { PlanDay } from "@/data/plan";
import { PLAN } from "@/data/plan";

export type ProgramTemplate = { id: string; name: string; description: string; days: PlanDay[] };

const fullBody: PlanDay[] = [
  {
    id: "full-d1",
    label: "Day 1",
    name: "Full Body A",
    focus: "Squat lead",
    tags: ["Legs", "Chest", "Back", "Core"],
    ex: [
      { name: "Back Squat", muscle: "Legs", sets: 3, reps: "6–8", start: 40 },
      { name: "Barbell Bench Press", muscle: "Chest", sets: 3, reps: "6–8", start: 35 },
      { name: "Seated Cable Row", muscle: "Back", sets: 3, reps: "10–12", start: 40 },
      { name: "Lateral Raise", muscle: "Shoulders", sets: 3, reps: "15", start: 6 },
      { name: "Plank (log seconds)", muscle: "Core", sets: 3, reps: "45s", start: 0 },
    ],
  },
  {
    id: "full-d2",
    label: "Day 2",
    name: "Full Body B",
    focus: "Hinge lead",
    tags: ["Legs", "Back", "Shoulders", "Arms"],
    ex: [
      { name: "Romanian Deadlift", muscle: "Legs", sets: 3, reps: "8–10", start: 40 },
      { name: "Lat Pulldown", muscle: "Back", sets: 3, reps: "8–10", start: 40 },
      { name: "Standing Overhead Press", muscle: "Shoulders", sets: 3, reps: "6–8", start: 25 },
      { name: "Leg Press", muscle: "Legs", sets: 3, reps: "10–12", start: 80 },
      { name: "Barbell Curl", muscle: "Arms", sets: 3, reps: "10–12", start: 20 },
    ],
  },
  {
    id: "full-d3",
    label: "Day 3",
    name: "Full Body C",
    focus: "Upper lead",
    tags: ["Chest", "Back", "Legs", "Arms"],
    ex: [
      { name: "Incline Dumbbell Press", muscle: "Chest", sets: 3, reps: "8–10", start: 14 },
      { name: "Barbell Row", muscle: "Back", sets: 3, reps: "8–10", start: 35 },
      { name: "Leg Extension", muscle: "Legs", sets: 3, reps: "12–15", start: 30 },
      { name: "Seated Leg Curl", muscle: "Legs", sets: 3, reps: "12–15", start: 25 },
      { name: "Rope Pushdown", muscle: "Arms", sets: 3, reps: "12–15", start: 20 },
    ],
  },
];

const upperLower: PlanDay[] = [
  {
    id: "ul-d1",
    label: "Day 1",
    name: "Upper A",
    focus: "Push emphasis",
    tags: ["Chest", "Shoulders", "Arms", "Back"],
    ex: [
      { name: "Barbell Bench Press", muscle: "Chest", sets: 4, reps: "6–8", start: 35 },
      { name: "Seated Dumbbell Shoulder Press", muscle: "Shoulders", sets: 3, reps: "8–10", start: 12 },
      { name: "Lat Pulldown", muscle: "Back", sets: 3, reps: "8–10", start: 40 },
      { name: "Cable Fly", muscle: "Chest", sets: 3, reps: "12–15", start: 10 },
      { name: "Rope Pushdown", muscle: "Arms", sets: 3, reps: "12–15", start: 20 },
    ],
  },
  {
    id: "ul-d2",
    label: "Day 2",
    name: "Lower A",
    focus: "Quad lead",
    tags: ["Legs", "Core"],
    ex: [
      { name: "Back Squat", muscle: "Legs", sets: 4, reps: "6–8", start: 40 },
      { name: "Romanian Deadlift", muscle: "Legs", sets: 3, reps: "8–10", start: 40 },
      { name: "Leg Press", muscle: "Legs", sets: 3, reps: "10–12", start: 80 },
      { name: "Standing Calf Raise", muscle: "Legs", sets: 4, reps: "12–15", start: 40 },
      { name: "Hanging Knee Raise", muscle: "Core", sets: 3, reps: "12", start: 0 },
    ],
  },
  {
    id: "ul-d3",
    label: "Day 3",
    name: "Upper B",
    focus: "Pull emphasis",
    tags: ["Back", "Shoulders", "Arms", "Chest"],
    ex: [
      { name: "Barbell Row", muscle: "Back", sets: 4, reps: "8–10", start: 35 },
      { name: "Incline Dumbbell Press", muscle: "Chest", sets: 3, reps: "8–10", start: 14 },
      { name: "Face Pull", muscle: "Shoulders", sets: 3, reps: "15", start: 15 },
      { name: "Barbell Curl", muscle: "Arms", sets: 3, reps: "10–12", start: 20 },
      { name: "Lateral Raise", muscle: "Shoulders", sets: 3, reps: "15", start: 6 },
    ],
  },
  {
    id: "ul-d4",
    label: "Day 4",
    name: "Lower B",
    focus: "Posterior chain",
    tags: ["Legs", "Core"],
    ex: [
      { name: "Deadlift", muscle: "Back", sets: 3, reps: "5", start: 60 },
      { name: "Bulgarian Split Squat", muscle: "Legs", sets: 3, reps: "8–10", start: 8 },
      { name: "Seated Leg Curl", muscle: "Legs", sets: 3, reps: "12–15", start: 25 },
      { name: "Barbell Hip Thrust", muscle: "Legs", sets: 3, reps: "10–12", start: 50 },
      { name: "Plank (log seconds)", muscle: "Core", sets: 3, reps: "45s", start: 0 },
    ],
  },
];

const ppl3: PlanDay[] = [
  {
    id: "ppl-d1",
    label: "Day 1",
    name: "Push",
    focus: "Chest, shoulders, triceps",
    tags: ["Chest", "Shoulders", "Arms"],
    ex: [
      { name: "Barbell Bench Press", muscle: "Chest", sets: 4, reps: "6–8", start: 35 },
      { name: "Standing Overhead Press", muscle: "Shoulders", sets: 3, reps: "6–8", start: 25 },
      { name: "Incline Dumbbell Press", muscle: "Chest", sets: 3, reps: "8–10", start: 14 },
      { name: "Lateral Raise", muscle: "Shoulders", sets: 3, reps: "15", start: 6 },
      { name: "Rope Pushdown", muscle: "Arms", sets: 3, reps: "12–15", start: 20 },
    ],
  },
  {
    id: "ppl-d2",
    label: "Day 2",
    name: "Pull",
    focus: "Back and biceps",
    tags: ["Back", "Arms", "Core"],
    ex: [
      { name: "Deadlift", muscle: "Back", sets: 3, reps: "5", start: 60 },
      { name: "Lat Pulldown", muscle: "Back", sets: 4, reps: "8–10", start: 40 },
      { name: "Seated Cable Row", muscle: "Back", sets: 3, reps: "10–12", start: 40 },
      { name: "Face Pull", muscle: "Shoulders", sets: 3, reps: "15", start: 15 },
      { name: "Barbell Curl", muscle: "Arms", sets: 3, reps: "10–12", start: 20 },
    ],
  },
  {
    id: "ppl-d3",
    label: "Day 3",
    name: "Legs",
    focus: "Full lower body",
    tags: ["Legs", "Core"],
    ex: [
      { name: "Back Squat", muscle: "Legs", sets: 4, reps: "6–8", start: 40 },
      { name: "Romanian Deadlift", muscle: "Legs", sets: 3, reps: "8–10", start: 40 },
      { name: "Leg Press", muscle: "Legs", sets: 3, reps: "10–12", start: 80 },
      { name: "Standing Calf Raise", muscle: "Legs", sets: 4, reps: "12–15", start: 40 },
      { name: "Hanging Knee Raise", muscle: "Core", sets: 3, reps: "12", start: 0 },
    ],
  },
];

export const TEMPLATES: ProgramTemplate[] = [
  {
    id: "ppl6",
    name: "6-Day PPL",
    description: "Push · Pull · Legs run twice a week — the app's original split.",
    days: PLAN,
  },
  {
    id: "full3",
    name: "3-Day Full Body",
    description: "Three balanced full-body sessions — ideal for beginners or busy weeks.",
    days: fullBody,
  },
  {
    id: "ul4",
    name: "4-Day Upper/Lower",
    description: "Two upper and two lower days for a strong strength-hypertrophy balance.",
    days: upperLower,
  },
  {
    id: "ppl3",
    name: "3-Day Push/Pull/Legs",
    description: "One push, one pull, one legs — the classic split on a 3-day cadence.",
    days: ppl3,
  },
];

export function templateById(id: string): ProgramTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
