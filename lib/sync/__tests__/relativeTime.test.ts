import { describe, expect, test } from "vitest";
import { relativeTime } from "@/lib/sync/relativeTime";

const NOW = 1_000_000_000_000;

describe("relativeTime", () => {
  test("returns empty string for a zero/absent timestamp", () => {
    expect(relativeTime(0, NOW)).toBe("");
  });

  test("formats seconds under a minute", () => {
    expect(relativeTime(NOW - 5_000, NOW)).toBe("5s ago");
    expect(relativeTime(NOW - 59_000, NOW)).toBe("59s ago");
  });

  test("formats minutes under an hour", () => {
    expect(relativeTime(NOW - 60_000, NOW)).toBe("1m ago");
    expect(relativeTime(NOW - 2 * 60_000, NOW)).toBe("2m ago");
    expect(relativeTime(NOW - 59 * 60_000, NOW)).toBe("59m ago");
  });

  test("formats hours under a day", () => {
    expect(relativeTime(NOW - 60 * 60_000, NOW)).toBe("1h ago");
    expect(relativeTime(NOW - 23 * 60 * 60_000, NOW)).toBe("23h ago");
  });

  test("formats days", () => {
    expect(relativeTime(NOW - 24 * 60 * 60_000, NOW)).toBe("1d ago");
    expect(relativeTime(NOW - 10 * 24 * 60 * 60_000, NOW)).toBe("10d ago");
  });

  test("clamps a future timestamp to 0s (never negative)", () => {
    expect(relativeTime(NOW + 5_000, NOW)).toBe("0s ago");
  });
});
