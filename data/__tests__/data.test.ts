import { expect, test } from "vitest";
import { PLAN } from "@/data/plan";
import { MEALS } from "@/data/nutrition";
import { LIBRARY } from "@/data/library";
import { TEMPLATES, templateById } from "@/data/templates";
import { MG_ORDER } from "@/data/muscles";

test("PLAN has 6 days, each with exercises", () => {
  expect(PLAN).toHaveLength(6);
  for (const d of PLAN) expect(d.ex.length).toBeGreaterThan(0);
});
test("MEALS has 7 days", () => {
  expect(MEALS).toHaveLength(7);
});
test("LIBRARY dedupes and is non-empty", () => {
  const names = LIBRARY.map((l) => l.name);
  expect(new Set(names).size).toBe(names.length);
  expect(LIBRARY.length).toBeGreaterThan(20);
});

const NEW_TEMPLATE_IDS = ["anta3", "bro5", "arnold6", "phul4", "phat5"];
const VALID_MUSCLES = new Set(MG_ORDER);

test("every template is structurally valid", () => {
  const seenIds = new Set<string>();
  for (const t of TEMPLATES) {
    expect(seenIds.has(t.id)).toBe(false);
    seenIds.add(t.id);
    expect(t.days.length).toBeGreaterThanOrEqual(1);
    const dayIds = new Set<string>();
    for (const d of t.days) {
      // day ids unique within a template
      expect(dayIds.has(d.id)).toBe(false);
      dayIds.add(d.id);
      // each day has at least one exercise
      expect(d.ex.length).toBeGreaterThanOrEqual(1);
      // all muscle values are valid MuscleGroups
      for (const e of d.ex) expect(VALID_MUSCLES.has(e.muscle)).toBe(true);
    }
  }
});

test("new templates exist and are well-formed", () => {
  for (const id of NEW_TEMPLATE_IDS) {
    const t = templateById(id);
    expect(t, `template ${id} should exist`).toBeDefined();
    expect(t!.days.length).toBeGreaterThanOrEqual(1);
    for (const d of t!.days) expect(d.ex.length).toBeGreaterThanOrEqual(1);
  }
});

test("new template exercises reuse the exercise library", () => {
  const libraryNames = new Set(LIBRARY.map((l) => l.name));
  for (const id of NEW_TEMPLATE_IDS) {
    for (const d of templateById(id)!.days) {
      for (const e of d.ex) {
        expect(libraryNames.has(e.name), `${e.name} in ${id} should be in LIBRARY`).toBe(true);
      }
    }
  }
});

test("Antagonist split has a Core exercise on every day", () => {
  const anta = templateById("anta3");
  expect(anta).toBeDefined();
  expect(anta!.days).toHaveLength(3);
  for (const d of anta!.days) {
    expect(d.ex.some((e) => e.muscle === "Core"), `${d.name} should have core work`).toBe(true);
    expect(d.tags).toContain("Core");
  }
});
