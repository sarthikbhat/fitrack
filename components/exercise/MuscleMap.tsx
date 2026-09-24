"use client";

// Muscle visualizer (source D). Renders the EDB target/secondary muscles onto an anatomy
// figure via the /api/muscleviz proxy (emerald = primary, indigo = secondary). Renders
// nothing without target muscles; hides the whole block if the image fails to load
// (offline / no key / upstream cap), so the modal degrades gracefully.
import { useState } from "react";

const enc = encodeURIComponent;

export function MuscleMap({
  targetMuscles,
  secondaryMuscles = [],
  gender = "male",
}: {
  targetMuscles: string[];
  secondaryMuscles?: string[];
  gender?: "male" | "female";
}) {
  const [hidden, setHidden] = useState(false);
  if (!targetMuscles.length || hidden) return null;

  const src = `/api/muscleviz?target=${enc(targetMuscles.join(","))}&secondary=${enc(
    secondaryMuscles.join(","),
  )}&gender=${gender}`;

  return (
    <div className="musclemap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Muscles worked" loading="lazy" onError={() => setHidden(true)} />
      <div className="mmlegend">
        <span>
          <i className="dot dot-primary" /> Primary
        </span>
        {secondaryMuscles.length > 0 && (
          <span>
            <i className="dot dot-secondary" /> Secondary
          </span>
        )}
      </div>
    </div>
  );
}
