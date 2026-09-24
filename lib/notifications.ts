"use client";

// Tiny per-user "last seen notifications" watermark, kept in localStorage. Follow
// notifications are derived from the `follows` table (see getFollowers), so "unread"
// just means a follow edge created after this timestamp. No backend, no new table.

const keyFor = (uid: string) => `fitrack:notif-seen:${uid}`;

/** Millisecond timestamp the user last opened their notifications, or 0. */
export function getLastSeen(uid: string): number {
  if (!uid || typeof localStorage === "undefined") return 0;
  const v = localStorage.getItem(keyFor(uid));
  return v ? Number(v) || 0 : 0;
}

/** Record that the user has now seen notifications up to `ts` (default: now-ish). */
export function setLastSeen(uid: string, ts: number): void {
  if (!uid || typeof localStorage === "undefined") return;
  localStorage.setItem(keyFor(uid), String(ts));
}
