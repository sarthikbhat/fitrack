export type MuscleGroup = "Chest" | "Back" | "Shoulders" | "Arms" | "Legs" | "Core";

/* six clearly separated hues — completed sets stay green, so no green here */
export const MG: Record<MuscleGroup, string> = {
  Chest: "#00A8FF",
  Back: "#7C5CFF",
  Shoulders: "#22D3EE",
  Arms: "#FF4D8D",
  Legs: "#FF8A3D",
  Core: "#FFD23F",
};
export const MG_ORDER: MuscleGroup[] = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"];

export function withA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}
export function mc(m: string): string {
  return (MG as Record<string, string>)[m] || "#5A6A7C";
}
