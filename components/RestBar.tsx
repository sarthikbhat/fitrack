"use client";

// Fixed rest-timer bar above the bottom nav (legacy `.restbar` markup, restRender 2305-2315).
// Reads the transient rest store; renders nothing while idle.
import { Icon } from "@/data/icons";
import { useRest, useRestRemaining } from "@/lib/rest";

export function RestBar() {
  const endsAt = useRest((s) => s.endsAt);
  const durationSec = useRest((s) => s.durationSec);
  const stop = useRest((s) => s.stop);
  const add = useRest((s) => s.add);
  const left = useRestRemaining();

  if (!endsAt) return null;

  const mm = Math.floor(left / 60);
  const ss = ("0" + (left % 60)).slice(-2);
  const pct = durationSec ? Math.max(0, Math.min(100, (left / durationSec) * 100)) : 0;

  return (
    <div className="restbar on">
      <div className="rest-fill" style={{ width: pct + "%" }} />
      <button className="rest-x" onClick={stop} aria-label="skip rest">
        <Icon name="close" />
      </button>
      <div className="rest-mid">
        <span className="rest-t">
          {mm}:{ss}
        </span>
        <span className="rest-l">REST</span>
      </div>
      <button className="rest-add" onClick={() => add(15)}>
        +15s
      </button>
    </div>
  );
}
