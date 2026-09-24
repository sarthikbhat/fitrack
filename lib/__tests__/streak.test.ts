import { expect, test } from "vitest";
import { streak } from "@/lib/streak";

test("streak counts consecutive days ending today", () => {
  const today = "2026-09-23";
  const sessions = [
    { date: "2026-09-23" }, { date: "2026-09-22" }, { date: "2026-09-21" },
    { date: "2026-09-19" }, // gap
  ];
  expect(streak(sessions, today)).toBe(3);
});
test("streak is 0 when no session today or yesterday", () => {
  expect(streak([{ date: "2026-09-01" }], "2026-09-23")).toBe(0);
});
