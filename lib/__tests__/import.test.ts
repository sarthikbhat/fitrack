import { describe, expect, test } from "vitest";
import { parseImport } from "@/lib/validate";
import { CURRENT_VERSION, emptyState } from "@/lib/migrate";

describe("parseImport", () => {
  test("round-trips a valid current-version blob", () => {
    const s = emptyState();
    s.body.bw = 71;
    s.body.goalWeight = 68;
    s.settings.rest = 120;
    const out = parseImport(JSON.stringify(s));
    expect(out.v).toBe(CURRENT_VERSION);
    expect(out.body.bw).toBe(71);
    expect(out.body.goalWeight).toBe(68);
    expect(out.settings.rest).toBe(120);
  });

  test("migrates a legacy-shaped (versionless) blob", () => {
    const legacy = { bw: 82, goal: 78, height: 179, rest: 60, autoRest: false };
    const out = parseImport(JSON.stringify(legacy));
    expect(out.v).toBe(CURRENT_VERSION);
    expect(out.userId).toBe("local");
    expect(out.body.bw).toBe(82);
    expect(out.body.goalWeight).toBe(78);
    expect(out.profile?.heightCm).toBe(179);
    expect(out.settings.rest).toBe(60);
    expect(out.settings.autoRest).toBe(false);
  });

  test("throws on non-JSON garbage", () => {
    expect(() => parseImport("not json at all {{{")).toThrow();
  });

  test("throws on a non-object JSON value (array / primitive)", () => {
    expect(() => parseImport("[1,2,3]")).toThrow();
    expect(() => parseImport("42")).toThrow();
  });

  test("rejects a blob from a newer app version", () => {
    const future = { ...emptyState(), v: CURRENT_VERSION + 5 };
    expect(() => parseImport(JSON.stringify(future))).toThrow(/newer/i);
  });
});
