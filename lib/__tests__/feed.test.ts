import { describe, expect, test } from "vitest";
import { sessionActivityText, summariseInteractions } from "@/lib/feed";

describe("sessionActivityText", () => {
  test("formats a normal session with name, sets, and volume", () => {
    expect(sessionActivityText({ name: "Push A", sets: 12, vol: 4200 })).toBe(
      "finished “Push A” — 12 sets · 4,200 vol",
    );
  });

  test("uses a singular 'set' label for one set", () => {
    expect(sessionActivityText({ name: "Quick", sets: 1, vol: 100 })).toBe(
      "finished “Quick” — 1 set · 100 vol",
    );
  });

  test("drops the volume clause when volume is zero (bodyweight / unlogged)", () => {
    expect(sessionActivityText({ name: "Mobility", sets: 5, vol: 0 })).toBe(
      "finished “Mobility” — 5 sets",
    );
  });

  test("falls back to 'Workout' and 0 sets on missing / blank data", () => {
    expect(sessionActivityText({})).toBe("finished “Workout” — 0 sets");
    expect(sessionActivityText({ name: "  ", sets: NaN as unknown as number })).toBe(
      "finished “Workout” — 0 sets",
    );
  });

  test("rounds fractional sets/volume and thousands-separates volume", () => {
    expect(sessionActivityText({ name: "Legs", sets: 8.6, vol: 12345.7 })).toBe(
      "finished “Legs” — 9 sets · 12,346 vol",
    );
  });
});

describe("summariseInteractions", () => {
  const likes = [
    { activity_id: "a", user_id: "u1" },
    { activity_id: "a", user_id: "u2" },
    { activity_id: "b", user_id: "u2" },
  ];
  const comments = [
    { activity_id: "a" },
    { activity_id: "a" },
    { activity_id: "c" },
  ];

  test("tallies like and comment counts per activity", () => {
    const s = summariseInteractions(likes, comments, null);
    expect(s.a).toEqual({ likeCount: 2, likedByMe: false, commentCount: 2 });
    expect(s.b).toEqual({ likeCount: 1, likedByMe: false, commentCount: 0 });
    expect(s.c).toEqual({ likeCount: 0, likedByMe: false, commentCount: 1 });
  });

  test("flags likedByMe only for activities the given user liked", () => {
    const s = summariseInteractions(likes, comments, "u1");
    expect(s.a.likedByMe).toBe(true); // u1 liked a
    expect(s.b.likedByMe).toBe(false); // only u2 liked b
  });

  test("empty inputs yield an empty map", () => {
    expect(summariseInteractions([], [], "u1")).toEqual({});
  });
});
