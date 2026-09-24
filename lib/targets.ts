// TDEE / macro-target engine — Mifflin-St Jeor, local, no API.
// Ported from legacy `calcTarget` (legacy:1783-1795). Pure & tested.
import type { Goals } from "@/lib/types";

export type Sex = "male" | "female";
export type TargetMode = Goals["mode"]; // "cut" | "maintain" | "bulk"

export type TargetInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  activity: number; // 1..5
  bw: number; // kg
  mode: TargetMode;
};

export type Targets = { kcal: number; p: number; c: number; f: number };

// Activity multipliers indexed by (activity - 1); legacy:1787.
export const ACTIVITY_FACTORS = [1.2, 1.375, 1.55, 1.725, 1.9] as const;

// Mode adjustment to maintenance calories; legacy:1789 (cut -400, bulk +300).
export const MODE_ADJUST: Record<TargetMode, number> = {
  cut: -400,
  maintain: 0,
  bulk: 300,
};

/** Mifflin-St Jeor BMR × activity, mode-adjusted, split into P/C/F. */
export function calcTargets({ sex, age, heightCm, activity, bw, mode }: TargetInput): Targets {
  const bmr = 10 * bw + 6.25 * heightCm - 5 * age + (sex === "female" ? -161 : 5);
  const af = ACTIVITY_FACTORS[Math.max(0, Math.min(4, (activity || 3) - 1))];
  let kcal = bmr * af + MODE_ADJUST[mode];
  kcal = Math.round(kcal / 10) * 10; // round to nearest 10 kcal
  const p = Math.round(1.8 * bw); // protein 1.8 g/kg
  const f = Math.round((kcal * 0.25) / 9); // fat 25% of kcal
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4)); // carbs = remainder
  return { kcal, p, c, f };
}
