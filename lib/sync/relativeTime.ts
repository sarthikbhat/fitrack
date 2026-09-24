// Tiny pure relative-time formatter for the sync status chip: "12s ago", "2m ago",
// "3h ago", "5d ago". `now` is threaded in so the function stays pure + testable.
// A zero/absent timestamp (never synced) yields "" so the caller can omit the suffix.

export function relativeTime(ts: number, now: number): string {
  if (!ts) return "";
  const secs = Math.max(0, Math.floor((now - ts) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
