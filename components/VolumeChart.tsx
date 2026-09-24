"use client";
import { addDays, weekdayIndex } from "@/lib/dates";
import { volumeWeeks } from "@/lib/progress";

const fmtMon = (mon: string) =>
  new Date(mon + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Port of legacy volumeHTML (legacy:1881-1899): 8 weekly bars scaled to the max. */
export function VolumeChart({ sessions, today }: { sessions: { date: string; vol: number }[]; today: string }) {
  const vols = volumeWeeks(sessions, today);
  const startOfWeek = addDays(today, -weekdayIndex(new Date(today + "T12:00:00")));
  const buckets = vols.map((vol, i) => ({ mon: addDays(startOfWeek, -(vols.length - 1 - i) * 7), vol }));
  const has = buckets.some((b) => b.vol);
  if (!has) return <div className="empty">Log sessions to see weekly volume.</div>;
  const mx = Math.max(1, ...buckets.map((b) => b.vol));
  return (
    <div className="vchart">
      {buckets.map((b, i) => {
        const hp = Math.max(b.vol ? 4 : 0, Math.round((b.vol / mx) * 100));
        const lbl = fmtMon(b.mon);
        return (
          <div className="vbar" key={i} title={`${lbl}: ${Math.round(b.vol).toLocaleString()}`}>
            <div className="vfill" style={{ height: `${hp}%` }} />
            <span>{lbl.split(" ")[0]}</span>
          </div>
        );
      })}
    </div>
  );
}
