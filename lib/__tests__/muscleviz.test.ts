import { describe, expect, test } from "vitest";
import { buildMuscleVizUrl, MUSCLE_VIZ_HOST } from "@/lib/muscleviz";

describe("buildMuscleVizUrl", () => {
  test("hardcodes the plan-capped params (jpeg/transparent/small + token colours)", () => {
    const u = new URL(buildMuscleVizUrl("PECTORALIS MAJOR STERNAL HEAD", "TRICEPS BRACHII", "male"));
    expect(u.host).toBe(MUSCLE_VIZ_HOST);
    expect(u.pathname).toBe("/api/v1/visualize/workout");
    expect(u.searchParams.get("format")).toBe("jpeg");
    expect(u.searchParams.get("background")).toBe("transparent");
    expect(u.searchParams.get("size")).toBe("small");
    expect(u.searchParams.get("targetMusclesColor")).toBe("#10b981");
    expect(u.searchParams.get("secondaryMusclesColor")).toBe("#6366f1");
  });

  test("passes EDB muscle names straight through", () => {
    const u = new URL(buildMuscleVizUrl("PECTORALIS MAJOR STERNAL HEAD,BICEPS BRACHII", "DELTOID ANTERIOR", "female"));
    expect(u.searchParams.get("targetMuscles")).toBe("PECTORALIS MAJOR STERNAL HEAD,BICEPS BRACHII");
    expect(u.searchParams.get("secondaryMuscles")).toBe("DELTOID ANTERIOR");
    expect(u.searchParams.get("gender")).toBe("female");
  });

  test("defaults an unknown gender to male and omits empty muscle lists", () => {
    const u = new URL(buildMuscleVizUrl("QUADRICEPS", "", "unknown"));
    expect(u.searchParams.get("gender")).toBe("male");
    expect(u.searchParams.has("secondaryMuscles")).toBe(false);
  });
});
