import { addDays, weekdayIndex } from "@/lib/dates";

export function bmi(kg: number, cm: number): number {
  const m = cm / 100;
  return kg / (m * m);
}
/** Match legacy:1857-1862 thresholds + color vars exactly. */
export function bmiTag(b: number): [label: string, color: string] {
  if (b < 18.5) return ["Underweight", "var(--gold)"];
  if (b < 25) return ["Healthy", "var(--go)"];
  if (b < 30) return ["Overweight", "var(--gold)"];
  return ["High", "var(--danger)"];
}
export function cmToFtIn(cm: number): string {
  const totalIn = cm / 2.54;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) {
    ft++;
    inch = 0;
  }
  return ft + "'" + inch + '"';
}

/** 13 weeks x 7 days (Mon-based) of per-day set counts, oldest week first. */
export function heatmapWeeks(sessions: { date: string; sets: number }[], today: string): number[][] {
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.sets);
  // Anchor to the Monday of this week, then walk back 12 more weeks.
  const startOfWeek = addDays(today, -weekdayIndex(new Date(today + "T12:00:00")));
  const weeks: number[][] = [];
  for (let w = 12; w >= 0; w--) {
    const monday = addDays(startOfWeek, -w * 7);
    const row: number[] = [];
    for (let d = 0; d < 7; d++) row.push(byDay.get(addDays(monday, d)) ?? 0);
    weeks.push(row);
  }
  return weeks;
}

/** 8 weekly volume totals, oldest first. */
export function volumeWeeks(sessions: { date: string; vol: number }[], today: string): number[] {
  const startOfWeek = addDays(today, -weekdayIndex(new Date(today + "T12:00:00")));
  const out: number[] = [];
  for (let w = 7; w >= 0; w--) {
    const monday = addDays(startOfWeek, -w * 7);
    const end = addDays(monday, 7);
    let sum = 0;
    for (const s of sessions) if (s.date >= monday && s.date < end) sum += s.vol;
    out.push(sum);
  }
  return out;
}
