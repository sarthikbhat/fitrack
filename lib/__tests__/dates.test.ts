import { expect, test } from "vitest";
import { addDays, weekdayIndex } from "@/lib/dates";

test("addDays adds and subtracts ISO days", () => {
  expect(addDays("2026-09-23", 1)).toBe("2026-09-24");
  expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
});
test("weekdayIndex is Monday-based (Mon=0..Sun=6)", () => {
  expect(weekdayIndex(new Date("2026-09-21T12:00:00"))).toBe(0); // Monday
  expect(weekdayIndex(new Date("2026-09-27T12:00:00"))).toBe(6); // Sunday
});
