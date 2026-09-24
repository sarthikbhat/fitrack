import { expect, test } from "vitest";
import { bmi, bmiTag, cmToFtIn, heatmapWeeks, volumeWeeks } from "@/lib/progress";

test("bmi + tag", () => {
  expect(bmi(60, 170)).toBeCloseTo(20.76, 1);
  expect(bmiTag(20.76)[0]).toBe("Healthy"); // legacy label
});
test("cmToFtIn", () => {
  expect(cmToFtIn(170)).toBe("5'7\"");
});
test("heatmapWeeks returns 13 weeks x 7 days of set counts", () => {
  const grid = heatmapWeeks([{ date: "2026-09-23", sets: 12 }], "2026-09-23");
  expect(grid).toHaveLength(13);
  expect(grid[0]).toHaveLength(7);
});
test("volumeWeeks returns 8 weekly totals", () => {
  const v = volumeWeeks([{ date: "2026-09-23", vol: 4200 }], "2026-09-23");
  expect(v).toHaveLength(8);
});
