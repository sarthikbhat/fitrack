// Muscle-group chip (legacy `chip`, 1582).
import { mc, withA } from "@/data/muscles";

export function Chip({ muscle }: { muscle: string }) {
  const c = mc(muscle);
  return (
    <span className="chip mg" style={{ background: withA(c, 0.16), color: c }}>
      {muscle}
    </span>
  );
}
