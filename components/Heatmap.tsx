"use client";
import { addDays, weekdayIndex } from "@/lib/dates";
import { heatmapWeeks } from "@/lib/progress";

/** Port of legacy heatmapHTML (legacy:1863-1880): 13 week-columns x 7 day-rows. */
export function Heatmap({ sessions, today }: { sessions: { date: string; sets: number }[]; today: string }) {
  const grid = heatmapWeeks(sessions, today);
  const startOfWeek = addDays(today, -weekdayIndex(new Date(today + "T12:00:00")));
  return (
    <>
      <div className="heat">
        {grid.map((week, w) => {
          const monday = addDays(startOfWeek, -(grid.length - 1 - w) * 7);
          return (
            <div className="hcol" key={w}>
              {week.map((n, d) => {
                const date = addDays(monday, d);
                if (date > today) return <i className="hc empty" key={d} />;
                const lvl = n === 0 ? 0 : n < 8 ? 1 : n < 14 ? 2 : n < 20 ? 3 : 4;
                return <i className={`hc l${lvl}`} key={d} title={`${date}: ${n} sets`} />;
              })}
            </div>
          );
        })}
      </div>
      <div className="heatkey">
        <span>less</span>
        <i className="hc l0" />
        <i className="hc l1" />
        <i className="hc l2" />
        <i className="hc l3" />
        <i className="hc l4" />
        <span>more</span>
      </div>
    </>
  );
}
