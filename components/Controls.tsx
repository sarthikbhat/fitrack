"use client";

// Shared segmented-control + toggle primitives (legacy `.seg/.segb` and `.toggle`).
// Used by both the settings sheet and the onboarding wizard.

export type SegOption<T extends string> = { v: T; l: string };

export function Seg<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          className={`segb${value === o.v ? " on" : ""}`}
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  ariaLabel,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`toggle${on ? " on" : ""}`}
      aria-pressed={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  );
}
