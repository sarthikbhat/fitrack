// Muscle Visualizer API URL builder (source D). The current RapidAPI key plan caps
// the upstream to a single working variant: format=jpeg, background=transparent,
// size=small - anything else (png/webp, white background, larger sizes) 400s - so
// those are hardcoded. Colours match the app tokens: emerald primary / indigo
// secondary. The visualiser muscle vocabulary is a superset of EDB's target/secondary
// muscle names, so EDB names pass straight through.
export const MUSCLE_VIZ_HOST = "muscle-visualizer-api.p.rapidapi.com";

const PRIMARY_COLOR = "#10b981"; // --accent
const SECONDARY_COLOR = "#6366f1"; // --accent2

/** Build the upstream Muscle Visualizer workout URL. `target`/`secondary` are
    comma-separated muscle-name lists (EDB vocabulary); `gender` is male|female. */
export function buildMuscleVizUrl(target: string, secondary: string, gender: string): string {
  const p = new URLSearchParams();
  p.set("format", "jpeg");
  p.set("background", "transparent");
  p.set("size", "small");
  p.set("targetMusclesColor", PRIMARY_COLOR);
  p.set("secondaryMusclesColor", SECONDARY_COLOR);
  p.set("gender", gender === "female" ? "female" : "male");
  if (target) p.set("targetMuscles", target);
  if (secondary) p.set("secondaryMuscles", secondary);
  return `https://${MUSCLE_VIZ_HOST}/api/v1/visualize/workout?${p.toString()}`;
}
