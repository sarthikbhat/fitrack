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

const antagonist3: PlanDay[] = [
  {
    id: "anta-d1",
    label: "Day 1",
    name: "Chest & Triceps",
    focus: "Push antagonists + core",
    tags: ["Chest", "Arms", "Core"],
    ex: [
      { name: "Barbell Bench Press", muscle: "Chest", sets: 4, reps: "6–8", start: 35 },
      { name: "Incline Dumbbell Press", muscle: "Chest", sets: 3, reps: "8–10", start: 14 },
      { name: "Close-Grip Bench Press", muscle: "Arms", sets: 3, reps: "8–10", start: 30 },
      { name: "Skull Crusher", muscle: "Arms", sets: 3, reps: "10–12", start: 20 },
      { name: "Rope Pushdown", muscle: "Arms", sets: 3, reps: "12–15", start: 20 },
      { name: "Plank (log seconds)", muscle: "Core", sets: 3, reps: "45s", start: 0 },
    ],
  },
  {
    id: "anta-d2",
    label: "Day 2",
    name: "Back & Biceps",
    focus: "Pull antagonists + core",
    tags: ["Back", "Arms", "Core"],
    ex: [
      { name: "Deadlift", muscle: "Back", sets: 3, reps: "5", start: 60 },
      { name: "Lat Pulldown", muscle: "Back", sets: 4, reps: "8–10", start: 40 },
      { name: "Barbell Row", muscle: "Back", sets: 3, reps: "8–10", start: 35 },
      { name: "Barbell Curl", muscle: "Arms", sets: 3, reps: "10–12", start: 20 },
      { name: "Hammer Curl", muscle: "Arms", sets: 3, reps: "12", start: 10 },
      { name: "Hanging Leg Raise", muscle: "Core", sets: 3, reps: "12", start: 0 },
    ],
  },
  {
    id: "anta-d3",
    label: "Day 3",
    name: "Shoulders & Legs",
    focus: "Overhead + lower body + core",
    tags: ["Shoulders", "Legs", "Core"],
    ex: [
      { name: "Standing Overhead Press", muscle: "Shoulders", sets: 4, reps: "6–8", start: 25 },
      { name: "Lateral Raise", muscle: "Shoulders", sets: 3, reps: "15", start: 6 },
      { name: "Back Squat", muscle: "Legs", sets: 4, reps: "6–8", start: 40 },
      { name: "Romanian Deadlift", muscle: "Legs", sets: 3, reps: "8–10", start: 40 },
      { name: "Standing Calf Raise", muscle: "Legs", sets: 4, reps: "12–15", start: 40 },
      { name: "Cable Crunch", muscle: "Core", sets: 3, reps: "12–15", start: 20 },
    ],
  },
];

const broSplit5: PlanDay[] = [
  {
    id: "bro-d1",
    label: "Day 1",
    name: "Chest",
    focus: "Chest volume",
    tags: ["Chest"],
    ex: [
      { name: "Barbell Bench Press", muscle: "Chest", sets: 4, reps: "6–8", start: 35 },
      { name: "Incline Dumbbell Press", muscle: "Chest", sets: 3, reps: "8–10", start: 14 },
      { name: "Machine Chest Press", muscle: "Chest", sets: 3, reps: "10–12", start: 30 },
      { name: "Cable Fly", muscle: "Chest", sets: 3, reps: "12–15", start: 10 },
      { name: "Push-Up", muscle: "Chest", sets: 3, reps: "12–15", start: 0 },
    ],
  },
  {
    id: "bro-d2",
    label: "Day 2",
    name: "Back",
    focus: "Back width & thickness",
    tags: ["Back"],
    ex: [
      { name: "Deadlift", muscle: "Back", sets: 3, reps: "5", start: 60 },
      { name: "Pull-Up (assisted if needed)", muscle: "Back", sets: 3, reps: "6–8", start: 0 },
      { name: "Barbell Row", muscle: "Back", sets: 3, reps: "8–10", start: 35 },
      { name: "Lat Pulldown", muscle: "Back", sets: 3, reps: "10–12", start: 40 },
      { name: "Seated Cable Row", muscle: "Back", sets: 3, reps: "10–12", start: 40 },
    ],
  },
  {
    id: "bro-d3",
    label: "Day 3",
    name: "Shoulders",
    focus: "Delts all heads",
    tags: ["Shoulders"],
    ex: [
      { name: "Standing Overhead Press", muscle: "Shoulders", sets: 4, reps: "6–8", start: 25 },
      { name: "Seated Dumbbell Shoulder Press", muscle: "Shoulders", sets: 3, reps: "8–10", start: 12 },
      { name: "Lateral Raise", muscle: "Shoulders", sets: 4, reps: "12–15", start: 6 },
      { name: "Rear Delt Fly", muscle: "Shoulders", sets: 3, reps: "15", start: 6 },
      { name: "Face Pull", muscle: "Shoulders", sets: 3, reps: "15", start: 15 },
    ],
  },
  {
    id: "bro-d4",
    label: "Day 4",
    name: "Arms",
    focus: "Biceps & triceps",
    tags: ["Arms"],
    ex: [
      { name: "Barbell Curl", muscle: "Arms", sets: 3, reps: "8–10", start: 20 },
      { name: "Close-Grip Bench Press", muscle: "Arms", sets: 3, reps: "8–10", start: 30 },
      { name: "Hammer Curl", muscle: "Arms", sets: 3, reps: "12", start: 10 },
      { name: "Skull Crusher", muscle: "Arms", sets: 3, reps: "10–12", start: 20 },
      { name: "Rope Pushdown", muscle: "Arms", sets: 3, reps: "12–15", start: 20 },
    ],
  },
  {
    id: "bro-d5",
    label: "Day 5",
    name: "Legs",
    focus: "Full lower body + core",
    tags: ["Legs", "Core"],
    ex: [
      { name: "Back Squat", muscle: "Legs", sets: 4, reps: "6–8", start: 40 },
      { name: "Leg Press", muscle: "Legs", sets: 3, reps: "10–12", start: 80 },
      { name: "Romanian Deadlift", muscle: "Legs", sets: 3, reps: "8–10", start: 40 },
      { name: "Leg Extension", muscle: "Legs", sets: 3, reps: "12–15", start: 30 },
      { name: "Standing Calf Raise", muscle: "Legs", sets: 4, reps: "12–15", start: 40 },
      { name: "Hanging Leg Raise", muscle: "Core", sets: 3, reps: "12", start: 0 },
    ],
  },
];

const arnold6: PlanDay[] = [
  {
    id: "arnold-d1",
    label: "Day 1",
    name: "Chest & Back A",
    focus: "Supersetted push/pull",
    tags: ["Chest", "Back", "Core"],
    ex: [
      { name: "Barbell Bench Press", muscle: "Chest", sets: 4, reps: "6–8", start: 35 },
      { name: "Barbell Row", muscle: "Back", sets: 4, reps: "8–10", start: 35 },
      { name: "Incline Dumbbell Press", muscle: "Chest", sets: 3, reps: "8–10", start: 14 },
      { name: "Lat Pulldown", muscle: "Back", sets: 3, reps: "10–12", start: 40 },
      { name: "Cable Fly", muscle: "Chest", sets: 3, reps: "12–15", start: 10 },
      { name: "Hanging Leg Raise", muscle: "Core", sets: 3, reps: "12", start: 0 },
    ],
  },
  {
    id: "arnold-d2",
    label: "Day 2",
    name: "Shoulders & Arms A",
    focus: "Delts, biceps, triceps",
    tags: ["Shoulders", "Arms", "Core"],
    ex: [
      { name: "Standing Overhead Press", muscle: "Shoulders", sets: 4, reps: "6–8", start: 25 },
      { name: "Lateral Raise", muscle: "Shoulders", sets: 3, reps: "15", start: 6 },
      { name: "Barbell Curl", muscle: "Arms", sets: 3, reps: "10–12", start: 20 },
      { name: "Rope Pushdown", muscle: "Arms", sets: 3, reps: "12–15", start: 20 },
      { name: "Hammer Curl", muscle: "Arms", sets: 3, reps: "12", start: 10 },
      { name: "Cable Crunch", muscle: "Core", sets: 3, reps: "12–15", start: 20 },
    ],
  },
  {
    id: "arnold-d3",
    label: "Day 3",
    name: "Legs A",
    focus: "Quad lead + core",
    tags: ["Legs", "Core"],
    ex: [
      { name: "Back Squat", muscle: "Legs", sets: 4, reps: "6–8", start: 40 },
      { name: "Romanian Deadlift", muscle: "Legs", sets: 3, reps: "8–10", start: 40 },
      { name: "Leg Press", muscle: "Legs", sets: 3, reps: "10–12", start: 80 },
      { name: "Standing Calf Raise", muscle: "Legs", sets: 4, reps: "12–15", start: 40 },
      { name: "Plank (log seconds)", muscle: "Core", sets: 3, reps: "45s", start: 0 },
    ],
  },
  {
    id: "arnold-d4",
    label: "Day 4",
    name: "Chest & Back B",
    focus: "Incline & vertical pull",
    tags: ["Chest", "Back", "Core"],
    ex: [
      { name: "Incline Dumbbell Press", muscle: "Chest", sets: 4, reps: "8–10", start: 14 },
      { name: "Pull-Up (assisted if needed)", muscle: "Back", sets: 3, reps: "6–8", start: 0 },
      { name: "Machine Chest Press", muscle: "Chest", sets: 3, reps: "10–12", start: 30 },
      { name: "Seated Cable Row", muscle: "Back", sets: 3, reps: "10–12", start: 40 },
      { name: "Pec Deck", muscle: "Chest", sets: 3, reps: "12–15", start: 20 },
      { name: "Hanging Knee Raise", muscle: "Core", sets: 3, reps: "12", start: 0 },
    ],
  },
  {
    id: "arnold-d5",
    label: "Day 5",
    name: "Shoulders & Arms B",
    focus: "Rear delts & peak work",
    tags: ["Shoulders", "Arms", "Core"],
    ex: [
      { name: "Seated Dumbbell Shoulder Press", muscle: "Shoulders", sets: 4, reps: "8–10", start: 12 },
      { name: "Rear Delt Fly", muscle: "Shoulders", sets: 3, reps: "15", start: 6 },
      { name: "Preacher Curl", muscle: "Arms", sets: 3, reps: "12", start: 15 },
      { name: "Skull Crusher", muscle: "Arms", sets: 3, reps: "10–12", start: 20 },
      { name: "Cable Curl", muscle: "Arms", sets: 3, reps: "12–15", start: 15 },
      { name: "Russian Twist", muscle: "Core", sets: 3, reps: "20", start: 0 },
    ],
  },
  {
    id: "arnold-d6",
    label: "Day 6",
    name: "Legs B",
    focus: "Posterior chain + core",
    tags: ["Legs", "Core"],
    ex: [
      { name: "Front Squat", muscle: "Legs", sets: 4, reps: "6–8", start: 30 },
      { name: "Bulgarian Split Squat", muscle: "Legs", sets: 3, reps: "8–10", start: 8 },
      { name: "Seated Leg Curl", muscle: "Legs", sets: 3, reps: "12–15", start: 25 },
      { name: "Seated Calf Raise", muscle: "Legs", sets: 4, reps: "15", start: 20 },
      { name: "Ab Wheel Rollout", muscle: "Core", sets: 3, reps: "8–10", start: 0 },
    ],
  },
];

const phul4: PlanDay[] = [
  {
    id: "phul-d1",
    label: "Day 1",
    name: "Upper Power",
    focus: "Heavy upper strength",
    tags: ["Chest", "Back", "Shoulders", "Arms"],
    ex: [
      { name: "Barbell Bench Press", muscle: "Chest", sets: 4, reps: "3–5", start: 40 },
      { name: "Barbell Row", muscle: "Back", sets: 4, reps: "5–7", start: 40 },
      { name: "Standing Overhead Press", muscle: "Shoulders", sets: 3, reps: "5–7", start: 25 },
      { name: "Lat Pulldown", muscle: "Back", sets: 3, reps: "8–10", start: 40 },
      { name: "Close-Grip Bench Press", muscle: "Arms", sets: 3, reps: "8–10", start: 30 },
      { name: "Barbell Curl", muscle: "Arms", sets: 3, reps: "8–10", start: 20 },
    ],
  },
  {
    id: "phul-d2",
    label: "Day 2",
    name: "Lower Power",
    focus: "Heavy lower strength",
    tags: ["Legs", "Back"],
    ex: [
      { name: "Back Squat", muscle: "Legs", sets: 4, reps: "3–5", start: 45 },
      { name: "Deadlift", muscle: "Back", sets: 3, reps: "3–5", start: 70 },
      { name: "Leg Press", muscle: "Legs", sets: 3, reps: "8–10", start: 90 },
      { name: "Seated Leg Curl", muscle: "Legs", sets: 3, reps: "8–10", start: 25 },
      { name: "Standing Calf Raise", muscle: "Legs", sets: 4, reps: "10–12", start: 40 },
    ],
  },
  {
    id: "phul-d3",
    label: "Day 3",
    name: "Upper Hypertrophy",
    focus: "Upper volume & pump",
    tags: ["Chest", "Back", "Shoulders", "Arms"],
    ex: [
      { name: "Incline Dumbbell Press", muscle: "Chest", sets: 3, reps: "10–12", start: 14 },
      { name: "Seated Cable Row", muscle: "Back", sets: 3, reps: "10–12", start: 40 },
      { name: "Cable Fly", muscle: "Chest", sets: 3, reps: "12–15", start: 10 },
      { name: "Lateral Raise", muscle: "Shoulders", sets: 4, reps: "12–15", start: 6 },
      { name: "Hammer Curl", muscle: "Arms", sets: 3, reps: "12", start: 10 },
      { name: "Rope Pushdown", muscle: "Arms", sets: 3, reps: "12–15", start: 20 },
    ],
  },
  {
    id: "phul-d4",
    label: "Day 4",
    name: "Lower Hypertrophy",
    focus: "Lower volume + core",
    tags: ["Legs", "Core"],
    ex: [
      { name: "Front Squat", muscle: "Legs", sets: 3, reps: "10–12", start: 30 },
      { name: "Romanian Deadlift", muscle: "Legs", sets: 3, reps: "10–12", start: 40 },
      { name: "Leg Extension", muscle: "Legs", sets: 3, reps: "12–15", start: 30 },
      { name: "Lying Leg Curl", muscle: "Legs", sets: 3, reps: "12–15", start: 25 },
      { name: "Seated Calf Raise", muscle: "Legs", sets: 4, reps: "15", start: 20 },
      { name: "Cable Crunch", muscle: "Core", sets: 3, reps: "12–15", start: 20 },
    ],
  },
];

const phat5: PlanDay[] = [
  {
    id: "phat-d1",
    label: "Day 1",
    name: "Upper Power",
    focus: "Heavy upper strength",
    tags: ["Chest", "Back", "Shoulders", "Arms"],
    ex: [
      { name: "Barbell Bench Press", muscle: "Chest", sets: 4, reps: "3–5", start: 40 },
      { name: "Barbell Row", muscle: "Back", sets: 4, reps: "5–7", start: 40 },
      { name: "Standing Overhead Press", muscle: "Shoulders", sets: 3, reps: "5–7", start: 25 },
      { name: "Pull-Up (assisted if needed)", muscle: "Back", sets: 3, reps: "6–8", start: 0 },
      { name: "Close-Grip Bench Press", muscle: "Arms", sets: 3, reps: "8–10", start: 30 },
    ],
  },
  {
    id: "phat-d2",
    label: "Day 2",
    name: "Lower Power",
    focus: "Heavy lower strength",
    tags: ["Legs", "Back"],
    ex: [
      { name: "Back Squat", muscle: "Legs", sets: 4, reps: "3–5", start: 45 },
      { name: "Deadlift", muscle: "Back", sets: 3, reps: "3–5", start: 70 },
      { name: "Leg Press", muscle: "Legs", sets: 3, reps: "8–10", start: 90 },
      { name: "Seated Leg Curl", muscle: "Legs", sets: 3, reps: "8–10", start: 25 },
      { name: "Standing Calf Raise", muscle: "Legs", sets: 4, reps: "10–12", start: 40 },
    ],
  },
  {
    id: "phat-d3",
    label: "Day 3",
    name: "Back & Shoulders Hypertrophy",
    focus: "Pull & delt volume",
    tags: ["Back", "Shoulders"],
    ex: [
      { name: "Lat Pulldown", muscle: "Back", sets: 4, reps: "10–12", start: 40 },
      { name: "Seated Cable Row", muscle: "Back", sets: 3, reps: "10–12", start: 40 },
      { name: "Seated Dumbbell Shoulder Press", muscle: "Shoulders", sets: 3, reps: "10–12", start: 12 },
      { name: "Lateral Raise", muscle: "Shoulders", sets: 4, reps: "12–15", start: 6 },
      { name: "Rear Delt Fly", muscle: "Shoulders", sets: 3, reps: "15", start: 6 },
      { name: "Shrug", muscle: "Back", sets: 3, reps: "12–15", start: 30 },
    ],
  },
  {
    id: "phat-d4",
    label: "Day 4",
    name: "Lower Hypertrophy",
    focus: "Leg volume & pump",
    tags: ["Legs"],
    ex: [
      { name: "Front Squat", muscle: "Legs", sets: 3, reps: "10–12", start: 30 },
      { name: "Romanian Deadlift", muscle: "Legs", sets: 3, reps: "10–12", start: 40 },
      { name: "Leg Extension", muscle: "Legs", sets: 3, reps: "12–15", start: 30 },
      { name: "Lying Leg Curl", muscle: "Legs", sets: 3, reps: "12–15", start: 25 },
      { name: "Seated Calf Raise", muscle: "Legs", sets: 4, reps: "15", start: 20 },
    ],
  },
  {
    id: "phat-d5",
    label: "Day 5",
    name: "Chest & Arms Hypertrophy",
    focus: "Push & arm volume",
    tags: ["Chest", "Arms"],
    ex: [
      { name: "Incline Dumbbell Press", muscle: "Chest", sets: 4, reps: "10–12", start: 14 },
      { name: "Cable Fly", muscle: "Chest", sets: 3, reps: "12–15", start: 10 },
      { name: "Barbell Curl", muscle: "Arms", sets: 3, reps: "10–12", start: 20 },
      { name: "Rope Pushdown", muscle: "Arms", sets: 3, reps: "12–15", start: 20 },
      { name: "Hammer Curl", muscle: "Arms", sets: 3, reps: "12", start: 10 },
      { name: "Skull Crusher", muscle: "Arms", sets: 3, reps: "10–12", start: 20 },
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
  {
    id: "anta3",
    name: "3-Day Antagonist Split",
    description: "Chest+triceps, back+biceps, shoulders+legs — opposing muscles paired, with a core finisher each day.",
    days: antagonist3,
  },
  {
    id: "bro5",
    name: "5-Day Bro Split",
    description: "One body part a day — chest, back, shoulders, arms, legs — for maximum per-muscle volume.",
    days: broSplit5,
  },
  {
    id: "arnold6",
    name: "Arnold Split",
    description: "Chest+back, shoulders+arms, legs — run twice a week the way Arnold trained.",
    days: arnold6,
  },
  {
    id: "phul4",
    name: "PHUL",
    description: "Power Hypertrophy Upper Lower — two heavy power days and two higher-volume hypertrophy days.",
    days: phul4,
  },
  {
    id: "phat5",
    name: "PHAT",
    description: "Power Hypertrophy Adaptive Training — two power days plus three body-part hypertrophy days.",
    days: phat5,
  },
];

export function templateById(id: string): ProgramTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
