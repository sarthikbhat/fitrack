"use client";

/** Port of legacy sparkline (legacy:1836-1850). pts.kg are display-unit values. */
export function Sparkline({ pts }: { pts: { kg: number }[] }) {
  if (!pts.length) {
    return <div className="empty" style={{ padding: 14 }}>Log your weight over time to see the trend.</div>;
  }
  let data = pts;
  if (data.length === 1) data = [data[0], data[0]]; // single reading → flat baseline
  const w = 320, h = 70, pad = 6;
  const xs = data.map((p) => p.kg);
  let mn = Math.min(...xs), mx = Math.max(...xs);
  if (mn === mx) {
    mn -= 1;
    mx += 1;
  }
  const X = (i: number) => pad + (i * (w - 2 * pad)) / (data.length - 1);
  const Y = (v: number) => h - pad - ((v - mn) / (mx - mn)) * (h - 2 * pad);
  const d = data.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.kg).toFixed(1)).join(" ");
  const area = d + ` L ${X(data.length - 1).toFixed(1)} ${h} L ${X(0).toFixed(1)} ${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity=".28" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
