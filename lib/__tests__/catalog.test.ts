import { afterEach, describe, expect, test } from "vitest";
import {
  toMuscleGroup,
  normName,
  matchItem,
  searchCatalog,
  catalogFacets,
  _seedCatalog,
  _resetCatalog,
  type CatalogItem,
} from "@/lib/catalog";

afterEach(() => _resetCatalog());

const item = (over: Partial<CatalogItem>): CatalogItem => ({
  key: normName(over.name || "x"),
  name: "X",
  img: "",
  muscles: [],
  equipment: [],
  edbId: null,
  hasVideo: false,
  ...over,
});

describe("toMuscleGroup", () => {
  test("passes canonical free-db lowercase values through unchanged", () => {
    expect(toMuscleGroup("chest")).toBe("chest");
    expect(toMuscleGroup("biceps")).toBe("biceps");
    expect(toMuscleGroup("lower back")).toBe("lower back");
  });

  test("maps AscendAPI uppercase anatomical names to canonical groups", () => {
    expect(toMuscleGroup("PECTORALIS MAJOR")).toBe("chest");
    expect(toMuscleGroup("TRICEPS BRACHII")).toBe("triceps");
    expect(toMuscleGroup("BICEPS BRACHII")).toBe("biceps");
    expect(toMuscleGroup("BRACHIALIS")).toBe("biceps");
    expect(toMuscleGroup("ANTERIOR DELTOID")).toBe("shoulders");
    expect(toMuscleGroup("ROTATOR CUFF")).toBe("shoulders");
    expect(toMuscleGroup("LATISSIMUS DORSI")).toBe("lats");
    expect(toMuscleGroup("TRAPEZIUS")).toBe("traps");
    expect(toMuscleGroup("ERECTOR SPINAE")).toBe("lower back");
    expect(toMuscleGroup("QUADRICEPS")).toBe("quadriceps");
    expect(toMuscleGroup("GLUTEUS MAXIMUS")).toBe("glutes");
    expect(toMuscleGroup("GASTROCNEMIUS")).toBe("calves");
    expect(toMuscleGroup("SOLEUS")).toBe("calves");
    expect(toMuscleGroup("RECTUS ABDOMINIS")).toBe("abdominals");
    expect(toMuscleGroup("OBLIQUES")).toBe("abdominals");
    expect(toMuscleGroup("FOREARMS")).toBe("forearms");
    expect(toMuscleGroup("WRIST FLEXORS")).toBe("forearms");
    expect(toMuscleGroup("HAMSTRINGS")).toBe("hamstrings");
  });

  test("collapses middle/upper back to back", () => {
    expect(toMuscleGroup("middle back")).toBe("back");
    expect(toMuscleGroup("UPPER BACK")).toBe("back");
  });

  test("returns null for empty and lowercased raw for unmapped", () => {
    expect(toMuscleGroup("")).toBeNull();
    expect(toMuscleGroup("   ")).toBeNull();
    expect(toMuscleGroup("SERRATUS ANTERIOR")).toBe("serratus anterior");
  });
});

describe("normName", () => {
  test("normalises case, parentheticals and punctuation for dedupe", () => {
    expect(normName("Barbell Bench Press")).toBe(normName("barbell bench press"));
    expect(normName("Chest-Supported Row (machine)")).toBe("chest supported row");
  });
});

describe("matchItem", () => {
  const chestBarbell = item({
    name: "Barbell Bench Press",
    muscles: ["chest", "triceps"],
    equipment: ["barbell"],
  });

  test("filters by muscle membership", () => {
    expect(matchItem(chestBarbell, { muscle: "chest" })).toBe(true);
    expect(matchItem(chestBarbell, { muscle: "back" })).toBe(false);
  });

  test("filters by equipment membership", () => {
    expect(matchItem(chestBarbell, { equipment: "barbell" })).toBe(true);
    expect(matchItem(chestBarbell, { equipment: "dumbbell" })).toBe(false);
  });

  test("text matches by case-insensitive substring", () => {
    expect(matchItem(chestBarbell, { text: "bench" })).toBe(true);
    expect(matchItem(chestBarbell, { text: "BENCH PRESS" })).toBe(true);
    expect(matchItem(chestBarbell, { text: "squat" })).toBe(false);
  });

  test("text matches by token overlap when not a substring", () => {
    // "press barbell" is not a substring of the name but tokens overlap
    expect(matchItem(chestBarbell, { text: "press barbell" })).toBe(true);
  });

  test("combines filters (all must pass)", () => {
    expect(matchItem(chestBarbell, { muscle: "chest", equipment: "barbell", text: "bench" })).toBe(true);
    expect(matchItem(chestBarbell, { muscle: "chest", equipment: "dumbbell" })).toBe(false);
  });
});

describe("searchCatalog", () => {
  const seed = (): void =>
    _seedCatalog([
      item({ name: "Zercher Squat", muscles: ["quadriceps"], equipment: ["barbell"], hasVideo: false }),
      item({ name: "Air Squat", muscles: ["quadriceps"], equipment: ["body only"], hasVideo: true, edbId: "e2" }),
      item({ name: "Barbell Curl", muscles: ["biceps"], equipment: ["barbell"], hasVideo: false }),
    ]);

  test("sorts video-first, then by name", () => {
    seed();
    const { items } = searchCatalog({});
    expect(items.map((i) => i.name)).toEqual(["Air Squat", "Barbell Curl", "Zercher Squat"]);
  });

  test("filters by muscle then paginates", () => {
    seed();
    const { items, total, hasMore } = searchCatalog({ muscle: "quadriceps" });
    expect(total).toBe(2);
    expect(hasMore).toBe(false);
    expect(items.map((i) => i.name)).toEqual(["Air Squat", "Zercher Squat"]);
  });

  test("client-side pagination via slice", () => {
    seed();
    const p0 = searchCatalog({}, 0, 2);
    expect(p0.items).toHaveLength(2);
    expect(p0.hasMore).toBe(true);
    const p1 = searchCatalog({}, 1, 2);
    expect(p1.items).toHaveLength(1);
    expect(p1.hasMore).toBe(false);
  });

  test("catalogFacets returns distinct sorted values", () => {
    seed();
    const f = catalogFacets();
    expect(f.muscles).toEqual(["biceps", "quadriceps"]);
    expect(f.equipment).toEqual(["barbell", "body only"]);
  });
});
