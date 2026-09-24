"use client";

// Transient global rest timer (legacy restStart/restStop/restAdd, 2317-2325).
// A separate, NON-persisted Zustand store — timer state must never survive a reload.
import { useEffect, useState } from "react";
import { create } from "zustand";

type RestState = {
  endsAt: number | null; // epoch ms when the timer finishes, or null when idle
  durationSec: number; // duration of the current run (for the progress fill)
  start: (sec: number) => void;
  stop: () => void;
  add: (sec: number) => void;
};

export const useRest = create<RestState>((set) => ({
  endsAt: null,
  durationSec: 0,
  start: (sec) => set({ endsAt: Date.now() + sec * 1000, durationSec: sec }),
  stop: () => set({ endsAt: null, durationSec: 0 }),
  add: (sec) =>
    set((s) => (s.endsAt ? { endsAt: s.endsAt + sec * 1000, durationSec: s.durationSec + sec } : s)),
}));

/** Whole seconds remaining on the current run (0 when idle). Ticks 4×/sec while running,
    fires the finish vibration once, and clears the timer at zero (legacy:2319-2321).
    `left` is seeded purely from durationSec and refined by the interval (which is the
    only place the impure Date.now() is read); a start/restart re-seeds during render. */
export function useRestRemaining(): number {
  const endsAt = useRest((s) => s.endsAt);
  const durationSec = useRest((s) => s.durationSec);
  const stop = useRest((s) => s.stop);
  const [left, setLeft] = useState(durationSec);
  const [prevEndsAt, setPrevEndsAt] = useState(endsAt);

  // Sanctioned "adjust state during render" pattern — re-seed when the run changes.
  if (endsAt !== prevEndsAt) {
    setPrevEndsAt(endsAt);
    setLeft(endsAt ? durationSec : 0);
  }

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => {
      setLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
      if (Date.now() >= endsAt) {
        stop();
        navigator.vibrate?.([40, 80, 40]);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt, stop]);

  return left;
}
