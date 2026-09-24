import { describe, expect, test } from "vitest";
import { buildEdbQuery } from "@/lib/edbCatalog";

// Parse the querystring buildEdbQuery returns into a plain object for assertions.
const parse = (qs: string): Record<string, string> => Object.fromEntries(new URLSearchParams(qs));

describe("buildEdbQuery", () => {
  test("uses the /exercises/search endpoint when search is set", () => {
    const p = parse(buildEdbQuery({ search: "squat" }));
    expect(p.path).toBe("exercises/search");
    expect(p.search).toBe("squat");
  });

  test("trims the search term and ignores whitespace-only search", () => {
    expect(parse(buildEdbQuery({ search: "  bench  " })).search).toBe("bench");
    // whitespace-only search falls through to the filter endpoint
    expect(parse(buildEdbQuery({ search: "   " })).path).toBe("exercises");
  });

  test("uses /exercises with filters when no search is set", () => {
    const p = parse(buildEdbQuery({ bodyParts: ["CHEST"], equipments: ["BARBELL"] }));
    expect(p.path).toBe("exercises");
    expect(p.bodyParts).toBe("CHEST");
    expect(p.equipments).toBe("BARBELL");
  });

  test("comma-joins array filters", () => {
    const p = parse(buildEdbQuery({ bodyParts: ["CHEST", "BACK"], targetMuscles: ["PECS", "LATS"] }));
    expect(p.bodyParts).toBe("CHEST,BACK");
    expect(p.targetMuscles).toBe("PECS,LATS");
  });

  test("omits empty arrays, empty strings and undefined filters", () => {
    const p = parse(buildEdbQuery({ bodyParts: [], equipments: [""], exerciseType: "  " }));
    expect(p.bodyParts).toBeUndefined();
    expect(p.equipments).toBeUndefined();
    expect(p.exerciseType).toBeUndefined();
    expect(p.path).toBe("exercises");
  });

  test("clamps limit to a maximum of 25", () => {
    expect(parse(buildEdbQuery({ limit: 100 })).limit).toBe("25");
  });

  test("clamps limit to a minimum of 1", () => {
    expect(parse(buildEdbQuery({ limit: 0 })).limit).toBe("1");
  });

  test("defaults limit when omitted", () => {
    expect(parse(buildEdbQuery({})).limit).toBe("24");
  });

  test("includes the after cursor when present on both endpoints", () => {
    expect(parse(buildEdbQuery({ after: "cur123" })).after).toBe("cur123");
    expect(parse(buildEdbQuery({ search: "row", after: "cur456" })).after).toBe("cur456");
  });

  test("omits the after cursor when absent", () => {
    expect(parse(buildEdbQuery({ bodyParts: ["CHEST"] })).after).toBeUndefined();
  });

  test("includes exerciseType when set", () => {
    expect(parse(buildEdbQuery({ exerciseType: "weight_reps" })).exerciseType).toBe("weight_reps");
  });
});
