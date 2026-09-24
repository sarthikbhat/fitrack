"use client";

// Exercise thumbnail (legacy `thumbHTML`/`framesHTML`/`initials`, 1579,1590-1599).
// Coloured monogram fallback with the free-exercise-db still image layered on top
// (single static frame - the animated loop lives only in the how-to modal).
// `how` adds a tap affordance that opens the exercise modal.
import { mc } from "@/data/muscles";
import { getEx, cdnImg, useExdbReady } from "@/lib/exdb";
import { useExerciseModal } from "@/components/exercise/ExerciseModalProvider";

export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function Thumb({
  ex,
  how = false,
  small = false,
  w,
}: {
  ex: { name: string; muscle: string };
  how?: boolean;
  small?: boolean;
  w?: number;
}) {
  const ready = useExdbReady(); // re-render once images become available
  const { openExercise } = useExerciseModal();
  const e = getEx(ex.name);
  const col = mc(ex.muscle);

  const cls = `thumb${small ? " sm" : ""}${how ? " tap" : ""}${ready ? "" : " loading"}`;
  const howProps = how
    ? {
        role: "button",
        tabIndex: 0,
        "aria-label": `How to do ${ex.name}`,
        onClick: () => openExercise(ex.name),
        onKeyDown: (ev: React.KeyboardEvent) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            openExercise(ex.name);
          }
        },
      }
    : {};

  return (
    <div className={cls} {...howProps}>
      <span className="ph" style={{ ["--phc" as string]: col }}>
        {initials(ex.name)}
      </span>
      {e && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="fr fr0"
          src={cdnImg(e.imgs[0], w || 220)}
          alt={ex.name}
          loading="lazy"
          onError={(ev) => (ev.currentTarget.style.display = "none")}
        />
      )}
    </div>
  );
}
