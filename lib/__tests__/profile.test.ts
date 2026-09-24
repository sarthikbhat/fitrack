import { describe, expect, test } from "vitest";
import {
  slugifyUsername,
  suggestUsername,
  validateUsername,
  usernameErrorMessage,
  withSuffix,
  randomSuffix,
} from "@/lib/profile";

describe("slugifyUsername", () => {
  test("lowercases and strips to [a-z0-9_]", () => {
    expect(slugifyUsername("Jane Doe")).toBe("jane_doe");
    expect(slugifyUsername("Sam.O'Neil")).toBe("sam_o_neil");
  });

  test("collapses repeated separators and trims underscores", () => {
    expect(slugifyUsername("  --Hello...World--  ")).toBe("hello_world");
    expect(slugifyUsername("__weird__")).toBe("weird");
  });

  test("caps length at 20 chars", () => {
    expect(slugifyUsername("a".repeat(40)).length).toBe(20);
  });

  test("empty / all-symbols input yields empty string", () => {
    expect(slugifyUsername("")).toBe("");
    expect(slugifyUsername("!!!")).toBe("");
  });
});

describe("suggestUsername", () => {
  test("prefers the email local-part", () => {
    expect(suggestUsername({ email: "jane.doe@example.com" })).toBe("jane_doe");
  });

  test("falls back to display name when no email", () => {
    expect(suggestUsername({ display_name: "Big Lifter" })).toBe("big_lifter");
  });

  test("falls back to 'user' when nothing usable", () => {
    expect(suggestUsername({ email: "", display_name: "" })).toBe("user");
  });

  test("pads a too-short handle to at least 3 chars", () => {
    const s = suggestUsername({ email: "a@x.com" });
    expect(s.length).toBeGreaterThanOrEqual(3);
    expect(s.startsWith("a")).toBe(true);
  });

  test("always produces a valid username shape", () => {
    for (const input of [
      { email: "jo@x.com" },
      { display_name: "X" },
      { email: "verylongemailaddresslocalpart@example.com" },
    ]) {
      expect(validateUsername(suggestUsername(input))).toBeNull();
    }
  });
});

describe("validateUsername", () => {
  test("accepts a valid handle", () => {
    expect(validateUsername("jane_doe")).toBeNull();
    expect(validateUsername("abc")).toBeNull();
    expect(validateUsername("a1_9")).toBeNull();
  });

  test("rejects on length", () => {
    expect(validateUsername("ab")).toBe("length");
    expect(validateUsername("a".repeat(21))).toBe("length");
  });

  test("rejects on charset (uppercase, spaces, symbols)", () => {
    expect(validateUsername("JaneDoe")).toBe("charset");
    expect(validateUsername("jane doe")).toBe("charset");
    expect(validateUsername("jane-doe")).toBe("charset");
  });
});

describe("usernameErrorMessage", () => {
  test("maps codes to friendly copy, null → empty", () => {
    expect(usernameErrorMessage("length")).toMatch(/3.20/);
    expect(usernameErrorMessage("charset")).toMatch(/lowercase/);
    expect(usernameErrorMessage(null)).toBe("");
  });
});

describe("withSuffix / randomSuffix", () => {
  test("randomSuffix returns lowercase alphanumerics of requested length", () => {
    const s = randomSuffix(6);
    expect(s).toHaveLength(6);
    expect(/^[a-z0-9]+$/.test(s)).toBe(true);
  });

  test("withSuffix keeps result ≤20 chars and valid", () => {
    const out = withSuffix("a".repeat(30));
    expect(out.length).toBeLessThanOrEqual(20);
    expect(validateUsername(out)).toBeNull();
  });

  test("withSuffix appends an underscore-delimited suffix to the base", () => {
    const out = withSuffix("jane");
    expect(out.startsWith("jane_")).toBe(true);
    expect(validateUsername(out)).toBeNull();
  });
});
