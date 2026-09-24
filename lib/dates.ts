export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
export function addDays(iso: string, n: number): string {
  // UTC calendar arithmetic so results are timezone-independent (pure date math).
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Monday-based weekday index: Mon=0 .. Sun=6 (legacy `(getDay()+6)%7`). */
export function weekdayIndex(d: Date = new Date()): number {
  return (d.getDay() + 6) % 7;
}
