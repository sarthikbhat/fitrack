import { afterEach, describe, expect, test } from "vitest";
import { toks, getEx, _seedExdb, _resetExdb, type ExdbRaw } from "@/lib/exdb";

const FAKE: ExdbRaw[] = [
  { n: "Barbell Squat", imgs: ["squat.jpg"], ins: [], pm: ["quadriceps"], eq: "barbell", lv: "intermediate" },
  { n: "Barbell Bench Press", imgs: ["bench.jpg"], ins: [], pm: ["chest"], eq: "barbell", lv: "beginner" },
  { n: "Butterfly", imgs: ["fly.jpg"], ins: [], pm: ["chest"], eq: "machine", lv: "beginner" },
  { n: "Dumbbell Bicep Curl", imgs: ["curl.jpg"], ins: [], pm: ["biceps"], eq: "dumbbell", lv: "beginner" },
];

afterEach(() => _resetExdb());

describe("toks", () => {
  test("lowercases, splits, and drops stopwords", () => {
    expect(toks("The Barbell Bench Press")).toEqual(["barbell", "bench", "press"]);
  });

  test("drops domain stopwords (log / seconds / assisted / with / a)", () => {
    expect(toks("Hollow Hold (log seconds) with a Band")).toEqual(["hollow", "hold", "band"]);
  });

  test("strips parentheticals and punctuation", () => {
    expect(toks("Chest-Supported Row (machine)")).toEqual(["chest", "supported", "row"]);
  });
});

describe("getEx", () => {
  test("returns null before the DB is loaded", () => {
    expect(getEx("Barbell Squat")).toBeNull();
  });

  test("matches on the shared movement token and overlap", () => {
    _seedExdb(FAKE);
    const e = getEx("Barbell Squat");
    expect(e?.n).toBe("Barbell Squat");
  });

  test("applies ALIAS (Pec Deck → butterfly)", () => {
    _seedExdb(FAKE);
    const e = getEx("Pec Deck");
    expect(e?.n).toBe("Butterfly");
  });

  test("gates on the movement token: no shared last-token → null", () => {
    _seedExdb(FAKE);
    // "Deadlift" shares no movement word with any fake entry
    expect(getEx("Deadlift")).toBeNull();
  });

  test("does not cross movement families (squat query never returns a press)", () => {
    _seedExdb(FAKE);
    const e = getEx("Back Squat"); // alias → "barbell squat", move = squat
    expect(e?.n).toBe("Barbell Squat");
    expect(e?.n).not.toBe("Barbell Bench Press");
  });

  test("memoizes results in EX_CACHE (stable reference)", () => {
    _seedExdb(FAKE);
    expect(getEx("Dumbbell Bicep Curl")).toBe(getEx("Dumbbell Bicep Curl"));
  });
});
