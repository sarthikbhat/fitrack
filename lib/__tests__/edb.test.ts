import { afterEach, describe, expect, test } from "vitest";
import { matchEdb, isEdbLoaded, _seedEdbIndex, _resetEdb } from "@/lib/edb";

const FAKE = [
  { id: "e1", name: "Barbell Squat", img: "squat.jpg" },
  { id: "e2", name: "Barbell Bench Press", img: "bench.jpg" },
  { id: "e3", name: "Butterfly", img: "fly.jpg" },
  { id: "e4", name: "Dumbbell Bicep Curl", img: "curl.jpg" },
];

afterEach(() => _resetEdb());

describe("matchEdb", () => {
  test("returns null before the index is loaded", () => {
    expect(matchEdb("Barbell Squat")).toBeNull();
    expect(isEdbLoaded()).toBe(false);
  });

  test("matches on the shared movement token and overlap", () => {
    _seedEdbIndex(FAKE);
    const m = matchEdb("Barbell Squat");
    expect(m?.id).toBe("e1");
    expect(m?.img).toBe("squat.jpg");
  });

  test("applies ALIAS (Pec Deck → butterfly)", () => {
    _seedEdbIndex(FAKE);
    expect(matchEdb("Pec Deck")?.id).toBe("e3");
  });

  test("gates on the movement token: no shared last-token → null", () => {
    _seedEdbIndex(FAKE);
    // "Deadlift" shares no movement word with any fake entry
    expect(matchEdb("Deadlift")).toBeNull();
  });

  test("does not cross movement families (squat query never returns a press)", () => {
    _seedEdbIndex(FAKE);
    const m = matchEdb("Back Squat"); // alias → "barbell squat", move = squat
    expect(m?.id).toBe("e1");
    expect(m?.id).not.toBe("e2");
  });

  test("memoizes results (stable reference)", () => {
    _seedEdbIndex(FAKE);
    expect(matchEdb("Dumbbell Bicep Curl")).toBe(matchEdb("Dumbbell Bicep Curl"));
  });
});
