import type { MuscleGroup } from "@/data/muscles";
import { PLAN } from "@/data/plan";

export type LibraryItem = { name: string; muscle: MuscleGroup };

const EXTRA: LibraryItem[] = [
  { name: "Machine Chest Press", muscle: "Chest" },
  { name: "Push-Up", muscle: "Chest" },
  { name: "Pec Deck", muscle: "Chest" },
  { name: "Straight-Arm Pulldown", muscle: "Back" },
  { name: "T-Bar Row", muscle: "Back" },
  { name: "Shrug", muscle: "Back" },
  { name: "Arnold Press", muscle: "Shoulders" },
  { name: "Cable Lateral Raise", muscle: "Shoulders" },
  { name: "Preacher Curl", muscle: "Arms" },
  { name: "Skull Crusher", muscle: "Arms" },
  { name: "Cable Curl", muscle: "Arms" },
  { name: "Close-Grip Bench Press", muscle: "Arms" },
  { name: "Front Squat", muscle: "Legs" },
  { name: "Walking Lunge", muscle: "Legs" },
  { name: "Lying Leg Curl", muscle: "Legs" },
  { name: "Goblet Squat", muscle: "Legs" },
  { name: "Dead Bug", muscle: "Core" },
  { name: "Hanging Leg Raise", muscle: "Core" },
  { name: "Hollow Hold (log seconds)", muscle: "Core" },
  { name: "Russian Twist", muscle: "Core" },
  { name: "Cable Woodchopper", muscle: "Core" },
  { name: "Suitcase Carry (log seconds)", muscle: "Core" },
  { name: "Decline Sit-Up", muscle: "Core" },
];

export const LIBRARY: LibraryItem[] = (() => {
  const seen = new Set<string>();
  const out: LibraryItem[] = [];
  for (const d of PLAN)
    for (const e of d.ex) {
      if (!seen.has(e.name)) {
        seen.add(e.name);
        out.push({ name: e.name, muscle: e.muscle });
      }
    }
  for (const e of EXTRA)
    if (!seen.has(e.name)) {
      seen.add(e.name);
      out.push(e);
    }
  return out;
})();
