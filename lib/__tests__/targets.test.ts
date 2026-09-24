import { describe, expect, test } from "vitest";
import { calcTargets } from "@/lib/targets";

describe("calcTargets", () => {
  test("known male maintenance case (Mifflin-St Jeor)", () => {
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; ×1.55 = 2759 → 2760
    const t = calcTargets({ sex: "male", age: 30, heightCm: 180, activity: 3, bw: 80, mode: "maintain" });
    expect(t.kcal).toBe(2760);
    expect(t.p).toBe(144); // 1.8 * 80
    expect(t.f).toBe(77); // round(2760 * 0.25 / 9)
    expect(t.c).toBe(373); // remaining kcal / 4
  });

  test("known female maintenance case", () => {
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 1345.25; ×1.375 = 1849.72 → 1850
    const t = calcTargets({ sex: "female", age: 25, heightCm: 165, activity: 2, bw: 60, mode: "maintain" });
    expect(t.kcal).toBe(1850);
    expect(t.p).toBe(108);
    expect(t.f).toBe(51);
    expect(t.c).toBe(240);
  });

  test("each mode shifts kcal correctly (cut -400, bulk +300)", () => {
    const base = { sex: "male", age: 30, heightCm: 180, activity: 3, bw: 80 } as const;
    const maintain = calcTargets({ ...base, mode: "maintain" });
    const cut = calcTargets({ ...base, mode: "cut" });
    const bulk = calcTargets({ ...base, mode: "bulk" });
    expect(cut.kcal).toBe(maintain.kcal - 400);
    expect(bulk.kcal).toBe(maintain.kcal + 300);
  });

  test("macro split sums back to ~kcal", () => {
    const t = calcTargets({ sex: "female", age: 40, heightCm: 170, activity: 4, bw: 72, mode: "bulk" });
    const fromMacros = t.p * 4 + t.c * 4 + t.f * 9;
    expect(Math.abs(fromMacros - t.kcal)).toBeLessThanOrEqual(5); // rounding slack
  });

  test("protein scales with bodyweight (1.8 g/kg)", () => {
    const t = calcTargets({ sex: "male", age: 22, heightCm: 175, activity: 5, bw: 90, mode: "maintain" });
    expect(t.p).toBe(Math.round(1.8 * 90));
  });

  test("clamps out-of-range activity index without throwing", () => {
    const lo = calcTargets({ sex: "male", age: 30, heightCm: 180, activity: 0, bw: 80, mode: "maintain" });
    const hi = calcTargets({ sex: "male", age: 30, heightCm: 180, activity: 9, bw: 80, mode: "maintain" });
    expect(lo.kcal).toBeGreaterThan(0);
    expect(hi.kcal).toBeGreaterThan(lo.kcal); // higher activity → more kcal
  });
});
