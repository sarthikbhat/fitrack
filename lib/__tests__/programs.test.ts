import { describe, expect, test } from "vitest";
import { activeDays } from "@/lib/day";
import { PLAN } from "@/data/plan";
import { TEMPLATES, templateById } from "@/data/templates";
import type { Program } from "@/lib/types";

/** Deep-clone helper mirroring the store's cloneDays, for cloning-behaviour assertions. */
function cloneDays(days: typeof PLAN) {
  return days.map((d) => ({ ...d, tags: [...d.tags], ex: d.ex.map((e) => ({ ...e })) }));
}

describe("activeDays", () => {
  test("falls back to PLAN when no program is active", () => {
    expect(activeDays({ programs: {}, activeProgramId: null })).toBe(PLAN);
  });

  test("falls back to PLAN when activeProgramId points at a missing program", () => {
    expect(activeDays({ programs: {}, activeProgramId: "ghost" })).toBe(PLAN);
  });

  test("falls back to PLAN when the active program has no days", () => {
    const programs: Record<string, Program> = {
      p1: { id: "p1", name: "Empty", days: [], updatedAt: 1 },
    };
    expect(activeDays({ programs, activeProgramId: "p1" })).toBe(PLAN);
  });

  test("returns the active program's days when present", () => {
    const days = cloneDays(TEMPLATES[1].days);
    const programs: Record<string, Program> = {
      p1: { id: "p1", name: "Full Body", days, updatedAt: 1 },
    };
    expect(activeDays({ programs, activeProgramId: "p1" })).toBe(days);
  });
});

describe("templates", () => {
  test("includes the four required splits", () => {
    const names = TEMPLATES.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(["6-Day PPL", "3-Day Full Body", "4-Day Upper/Lower", "3-Day Push/Pull/Legs"]),
    );
  });

  test("6-Day PPL reuses PLAN and keeps d1..d6 ids", () => {
    const ppl = templateById("ppl6")!;
    expect(ppl.days).toBe(PLAN);
    expect(ppl.days.map((d) => d.id)).toEqual(["d1", "d2", "d3", "d4", "d5", "d6"]);
  });

  test("every day id is unique within its template", () => {
    for (const t of TEMPLATES) {
      const ids = t.days.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test("non-default templates namespace their day ids away from d1..d6", () => {
    const defaultIds = new Set(["d1", "d2", "d3", "d4", "d5", "d6"]);
    for (const t of TEMPLATES) {
      if (t.id === "ppl6") continue;
      for (const d of t.days) {
        expect(d.id).toContain("-");
        expect(defaultIds.has(d.id)).toBe(false);
      }
    }
  });
});

describe("template cloning", () => {
  test("cloned programs get independent day arrays - mutating one does not touch the template", () => {
    const tpl = templateById("full3")!;
    const a = cloneDays(tpl.days);
    const b = cloneDays(tpl.days);

    // Distinct top-level arrays and element objects.
    expect(a).not.toBe(tpl.days);
    expect(a[0]).not.toBe(tpl.days[0]);
    expect(a[0].ex).not.toBe(tpl.days[0].ex);

    // Mutating clone A leaves the template and clone B untouched.
    a[0].name = "MUTATED";
    a[0].ex.push({ name: "Extra", muscle: "Core", sets: 1, reps: "1", start: 0 });
    expect(tpl.days[0].name).not.toBe("MUTATED");
    expect(b[0].name).not.toBe("MUTATED");
    expect(a[0].ex.length).not.toBe(tpl.days[0].ex.length);
  });

  test("two clones of the same template produce independent objects", () => {
    const tpl = templateById("ul4")!;
    const a = cloneDays(tpl.days);
    const b = cloneDays(tpl.days);
    a[1].ex[0].sets = 99;
    expect(b[1].ex[0].sets).not.toBe(99);
  });
});
