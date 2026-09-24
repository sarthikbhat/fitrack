import { describe, expect, test } from "vitest";
import { makeShareCode, cloneProgramForImport, clonePlanForImport } from "@/lib/share";
import type { Plan, Program } from "@/lib/types";

describe("makeShareCode", () => {
  test("defaults to 8 characters", () => {
    expect(makeShareCode()).toHaveLength(8);
  });

  test("honours a custom length", () => {
    expect(makeShareCode(12)).toHaveLength(12);
    expect(makeShareCode(1)).toHaveLength(1);
  });

  test("uses only the URL-safe, unambiguous alphabet (no 0/O/1/I/l)", () => {
    for (let i = 0; i < 200; i++) {
      expect(makeShareCode(16)).toMatch(/^[2-9A-HJ-NP-Za-km-z]+$/);
    }
  });

  test("is effectively unique across many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(makeShareCode());
    // 8 chars over a 56-symbol alphabet ≈ 10^14 space; no collisions expected.
    expect(seen.size).toBe(5000);
  });
});

describe("cloneProgramForImport", () => {
  const src: Program = {
    id: "orig",
    name: "PPL",
    days: [
      {
        id: "d1",
        label: "Day 1",
        name: "Push",
        focus: "Chest",
        tags: ["Chest", "Arms"],
        ex: [{ name: "Bench", muscle: "Chest", sets: 4, reps: "6-8", start: 40 }],
      },
    ],
    updatedAt: 1,
  };

  test("assigns the given id, timestamp, and a (copy) suffix", () => {
    const out = cloneProgramForImport(src, "new-id", 999);
    expect(out.id).toBe("new-id");
    expect(out.updatedAt).toBe(999);
    expect(out.name).toBe("PPL (copy)");
  });

  test("does not double-suffix an already-copied name", () => {
    const out = cloneProgramForImport({ ...src, name: "PPL (copy)" }, "x", 1);
    expect(out.name).toBe("PPL (copy)");
  });

  test("deep-clones days/exercises so mutating the copy never touches the source", () => {
    const out = cloneProgramForImport(src, "x", 1);
    expect(out.days).not.toBe(src.days);
    expect(out.days[0]).not.toBe(src.days[0]);
    expect(out.days[0].ex).not.toBe(src.days[0].ex);
    expect(out.days[0].tags).not.toBe(src.days[0].tags);
    out.days[0].name = "MUTATED";
    out.days[0].ex[0].sets = 99;
    out.days[0].tags.push("Core");
    expect(src.days[0].name).toBe("Push");
    expect(src.days[0].ex[0].sets).toBe(4);
    expect(src.days[0].tags).toEqual(["Chest", "Arms"]);
  });

  test("tolerates a missing/empty days array", () => {
    const out = cloneProgramForImport({ id: "o", name: "Bare", days: [], updatedAt: 1 }, "x", 1);
    expect(out.days).toEqual([]);
  });
});

describe("clonePlanForImport", () => {
  const src: Plan = {
    meals: [
      {
        id: "m1",
        name: "Breakfast",
        items: [
          { id: "i1", name: "Oats", qty: 100, unit: "g", kcal: 380, p: 13, c: 67, f: 7 },
          { id: "i2", name: "Milk", qty: 200, unit: "ml", kcal: 120, p: 8, c: 10, f: 5 },
        ],
      },
    ],
  };

  test("regenerates fresh ids for meals and items, keeping content", () => {
    let n = 0;
    const out = clonePlanForImport(src, () => `id${n++}`);
    expect(out.meals[0].id).toBe("id0");
    expect(out.meals[0].items[0].id).toBe("id1");
    expect(out.meals[0].items[1].id).toBe("id2");
    expect(out.meals[0].name).toBe("Breakfast");
    expect(out.meals[0].items[0].name).toBe("Oats");
    expect(out.meals[0].items[0].kcal).toBe(380);
  });

  test("produces independent objects (no shared refs with the source)", () => {
    const out = clonePlanForImport(src, () => Math.random().toString(36));
    expect(out.meals).not.toBe(src.meals);
    expect(out.meals[0]).not.toBe(src.meals[0]);
    expect(out.meals[0].items[0]).not.toBe(src.meals[0].items[0]);
    expect(out.meals[0].items[0].id).not.toBe("i1"); // id was regenerated
  });

  test("tolerates a missing meals array", () => {
    const out = clonePlanForImport({ meals: [] }, () => "x");
    expect(out.meals).toEqual([]);
  });
});
