"use client";

// Switch-workout sheet (legacy switchSheetHTML/pickWorkout, 2347-2365,2181-2187).
// Load any of the 6 planned days into today, start an empty freestyle day, or —
// when a custom day is already active — revert to the planned day.
import { useStore } from "@/lib/store";
import { todayISO } from "@/lib/dates";
import { plannedForToday, activeDays } from "@/lib/day";
import { Sheet } from "@/components/Sheet";

export function SwitchSheet({ onClose }: { onClose: () => void }) {
  const custom = useStore((s) => s.custom);
  const programs = useStore((s) => s.programs);
  const activeProgramId = useStore((s) => s.activeProgramId);
  const setCustomDay = useStore((s) => s.setCustomDay);
  const startFreestyle = useStore((s) => s.startFreestyle);
  const clearCustomDay = useStore((s) => s.clearCustomDay);

  const today = todayISO();
  const active = !!custom[today];
  const days = activeDays({ programs, activeProgramId });
  const planned = plannedForToday(new Date(), days);

  const pick = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <Sheet
      title="Today's workout"
      hint="Feel like something else? Pick a template or start blank — it records the same way."
      onClose={onClose}
    >
      {active && (
        <button className="pickrow" onClick={() => pick(() => clearCustomDay(today))}>
          <div className="pmeta">
            <div className="nm" style={{ color: "var(--accent)" }}>
              ↩ Back to planned
            </div>
            <div style={{ marginTop: 3, fontSize: 12, color: "var(--dim)" }}>
              {planned ? planned.name : "Rest day"}
            </div>
          </div>
        </button>
      )}
      <button className="pickrow" onClick={() => pick(() => startFreestyle(today))}>
        <div className="pmeta">
          <div className="nm">Freestyle</div>
          <div style={{ marginTop: 3, fontSize: 12, color: "var(--dim)" }}>Empty — add exercises as you go</div>
        </div>
        <span className="pickadd">Start</span>
      </button>
      {days.map((d) => (
        <button key={d.id} className="pickrow" onClick={() => pick(() => setCustomDay(today, d))}>
          <div className="pmeta">
            <div className="nm">{d.name}</div>
            <div style={{ marginTop: 3, fontSize: 12, color: "var(--dim)" }}>
              {d.label} · {d.focus}
            </div>
          </div>
          <span className="pickadd">Start</span>
        </button>
      ))}
    </Sheet>
  );
}
