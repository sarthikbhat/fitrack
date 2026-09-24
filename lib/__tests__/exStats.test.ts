import { describe, expect, test } from "vitest";
import { exStats, lastEntry, type Logged } from "@/lib/exStats";

const logged: Logged = {
  "2026-01-01": {
    Bench: [
      { w: "100", r: "5", done: true },
      { w: "90", r: "8", done: true },
    ],
  },
  "2026-01-03": {
    Bench: [{ w: "105", r: "3", done: true }],
    Squat: [{ w: "140", r: "5", done: true }],
  },
  "2026-01-05": {
    // never-completed / empty inputs must not count toward stats or last date
    Bench: [{ w: "", r: "", done: false }],
  },
};

describe("exStats", () => {
  test("returns null for an exercise that was never logged", () => {
    expect(exStats(logged, "Overhead Press")).toBeNull();
  });

  test("computes best set, est. 1RM (Epley), heaviest weight and last date", () => {
    const s = exStats(logged, "Bench")!;
    // best est.1RM: 100*(1+5/30)=116.67 beats 105*(1+3/30)=115.5 and 90*(1+8/30)=114
    expect(s.best1).toBe(117);
    expect(s.bestTxt).toBe("100 × 5");
    expect(s.bestW).toBe(105);
    // 2026-01-05 has only empty sets → last real day is 2026-01-03
    expect(s.last).toBe("2026-01-03");
  });

  test("single-day exercise reports that day as last", () => {
    const s = exStats(logged, "Squat")!;
    expect(s.best1).toBe(163); // 140*(1+5/30)=163.33 → 163
    expect(s.last).toBe("2026-01-03");
  });
});

describe("lastEntry", () => {
  test("returns the most recent prior day's sets with any input", () => {
    const a = lastEntry(logged, "Bench");
    // 2026-01-05 has empty sets so it is skipped; 2026-01-03 is the latest with data
    expect(a).toEqual([{ w: "105", r: "3", done: true }]);
  });

  test("returns null when the exercise has no prior entries", () => {
    expect(lastEntry(logged, "Deadlift")).toBeNull();
  });
});
