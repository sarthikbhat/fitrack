import { expect, test } from "vitest";
import { PLAN } from "@/data/plan";
import { MEALS } from "@/data/nutrition";
import { LIBRARY } from "@/data/library";

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
