import { describe, expect, test } from "vitest";
import { sanitizeSearchQuery } from "@/lib/social";

describe("sanitizeSearchQuery", () => {
  test("trims surrounding whitespace", () => {
    expect(sanitizeSearchQuery("  jane  ")).toBe("jane");
  });

  test("returns empty string for blank / whitespace-only input", () => {
    expect(sanitizeSearchQuery("")).toBe("");
    expect(sanitizeSearchQuery("   ")).toBe("");
  });

  test("escapes LIKE wildcards so they match literally", () => {
    expect(sanitizeSearchQuery("100%")).toBe("100\\%");
    expect(sanitizeSearchQuery("a_b")).toBe("a\\_b");
    expect(sanitizeSearchQuery("%_%")).toBe("\\%\\_\\%");
  });

  test("escapes backslashes before wildcards", () => {
    expect(sanitizeSearchQuery("a\\b")).toBe("a\\\\b");
    // A literal backslash followed by a wildcard: both get escaped.
    expect(sanitizeSearchQuery("\\%")).toBe("\\\\\\%");
  });

  test("caps length at 60 characters", () => {
    const long = "a".repeat(100);
    expect(sanitizeSearchQuery(long)).toHaveLength(60);
  });

  test("leaves ordinary handles untouched", () => {
    expect(sanitizeSearchQuery("sarthik_b")).toBe("sarthik_b".replace("_", "\\_"));
    expect(sanitizeSearchQuery("Jane Doe")).toBe("Jane Doe");
  });
});
