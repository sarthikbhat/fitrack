// Progress ring (legacy `ringSVG`, 1625-1636). Used by Train's day header.
export function Ring({ pct }: { pct: number }) {
  const r = 30,
    c = 2 * Math.PI * r,
    off = c * (1 - pct / 100);
  return (
    <div className="ring" style={{ width: 74, height: 74 }}>
      <svg width="74" height="74" viewBox="0 0 74 74">
        <circle cx="37" cy="37" r="30" fill="none" stroke="var(--line2)" strokeWidth="6" />
        <circle
          cx="37"
          cy="37"
          r="30"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={off.toFixed(1)}
          style={{
            transition: "stroke-dashoffset .6s cubic-bezier(.22,.9,.3,1)",
            filter: "drop-shadow(0 0 5px var(--accentGlow))",
          }}
        />
      </svg>
      <div className="lbl">
        <b>{Math.round(pct)}%</b>
        <span>DONE</span>
      </div>
    </div>
  );
}
