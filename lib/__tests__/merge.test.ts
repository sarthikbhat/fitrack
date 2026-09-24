import { describe, expect, test } from "vitest";
import { mergeUnit, planSync, type LocalUnit, type RemoteRow } from "@/lib/sync/merge";

describe("mergeUnit", () => {
  test("missing side loses", () => {
    expect(mergeUnit(undefined, undefined)).toBe("equal");
    expect(mergeUnit({ updatedAt: 5 }, undefined)).toBe("local");
    expect(mergeUnit(undefined, { updated_at: 5 })).toBe("remote");
  });

  test("higher timestamp wins", () => {
    expect(mergeUnit({ updatedAt: 10 }, { updated_at: 5 })).toBe("local");
    expect(mergeUnit({ updatedAt: 5 }, { updated_at: 10 })).toBe("remote");
  });

  test("equal timestamps with no tombstone are equal", () => {
    expect(mergeUnit({ updatedAt: 7 }, { updated_at: 7 })).toBe("equal");
  });

  test("tombstone wins on a timestamp tie", () => {
    expect(mergeUnit({ updatedAt: 7, deleted: true }, { updated_at: 7 })).toBe("local");
    expect(mergeUnit({ updatedAt: 7 }, { updated_at: 7, deleted: true })).toBe("remote");
    // both tombstones at the same time → equal
    expect(mergeUnit({ updatedAt: 7, deleted: true }, { updated_at: 7, deleted: true })).toBe("equal");
  });

  test("higher timestamp beats a lower-timestamp tombstone", () => {
    expect(mergeUnit({ updatedAt: 9 }, { updated_at: 7, deleted: true })).toBe("local");
    expect(mergeUnit({ updatedAt: 7, deleted: true }, { updated_at: 9 })).toBe("remote");
  });
});

describe("planSync", () => {
  const L = (id: string, updatedAt: number, extra: Partial<LocalUnit> = {}): LocalUnit => ({
    table: "foods",
    id,
    updatedAt,
    ...extra,
  });
  const R = (id: string, updated_at: number, extra: Partial<RemoteRow> = {}): RemoteRow => ({
    table: "foods",
    id,
    updated_at,
    ...extra,
  });

  test("local newer + dirty pushes to remote", () => {
    const plan = planSync([L("a", 100, { data: { n: 1 } })], [R("a", 50)], 10);
    expect(plan.toPushRemote).toHaveLength(1);
    expect(plan.toPushRemote[0].id).toBe("a");
    expect(plan.toApplyLocal).toHaveLength(0);
  });

  test("local wins but already synced (not dirty) → no push", () => {
    const plan = planSync([L("a", 100)], [R("a", 50)], 100);
    expect(plan.toPushRemote).toHaveLength(0);
    expect(plan.toApplyLocal).toHaveLength(0);
  });

  test("remote newer applies locally", () => {
    const plan = planSync([L("a", 50)], [R("a", 100, { data: { n: 2 } })], 10);
    expect(plan.toApplyLocal).toHaveLength(1);
    expect(plan.toApplyLocal[0].updatedAt).toBe(100);
    expect(plan.toPushRemote).toHaveLength(0);
  });

  test("remote tombstone applies as a delete", () => {
    const plan = planSync([L("a", 50)], [R("a", 100, { deleted: true })], 10);
    expect(plan.toApplyLocal).toHaveLength(1);
    expect(plan.toApplyLocal[0].deleted).toBe(true);
  });

  test("local tombstone (dirty) pushes as a delete", () => {
    const plan = planSync([L("a", 100, { deleted: true })], [R("a", 50)], 10);
    expect(plan.toPushRemote).toHaveLength(1);
    expect(plan.toPushRemote[0].deleted).toBe(true);
  });

  test("equal units are a no-op", () => {
    const plan = planSync([L("a", 50)], [R("a", 50)], 10);
    expect(plan.toApplyLocal).toHaveLength(0);
    expect(plan.toPushRemote).toHaveLength(0);
  });

  test("brand-new local (dirty) pushes", () => {
    const plan = planSync([L("new", 100)], [], 10);
    expect(plan.toPushRemote).toHaveLength(1);
    expect(plan.toPushRemote[0].id).toBe("new");
  });

  test("brand-new remote applies", () => {
    const plan = planSync([], [R("new", 100)], 10);
    expect(plan.toApplyLocal).toHaveLength(1);
    expect(plan.toApplyLocal[0].id).toBe("new");
  });

  test("units in different tables with the same id don't collide", () => {
    const plan = planSync(
      [{ table: "foods", id: "x", updatedAt: 100 }],
      [{ table: "programs", id: "x", updated_at: 100 }],
      10,
    );
    // foods:x is brand-new-local (push), programs:x is brand-new-remote (apply)
    expect(plan.toPushRemote).toHaveLength(1);
    expect(plan.toPushRemote[0].table).toBe("foods");
    expect(plan.toApplyLocal).toHaveLength(1);
    expect(plan.toApplyLocal[0].table).toBe("programs");
  });
});
