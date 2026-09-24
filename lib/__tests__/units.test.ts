import { expect, test } from "vitest";
import { massToDisplay, massFromDisplay, fmtMass, massLabel } from "@/lib/units";

test("kg passthrough", () => {
  expect(massToDisplay(60, "kg")).toBeCloseTo(60);
  expect(fmtMass(60, "kg")).toBe("60.0");
  expect(massLabel("kg")).toBe("kg");
});
test("kg <-> lb round-trips", () => {
  const lb = massToDisplay(60, "lb");
  expect(lb).toBeCloseTo(132.28, 1);
  expect(massFromDisplay(lb, "lb")).toBeCloseTo(60, 3);
  expect(massLabel("lb")).toBe("lb");
});
