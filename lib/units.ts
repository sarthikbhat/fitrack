export const LB = 2.2046226;
export type MassUnit = "kg" | "lb";

export function massLabel(u: MassUnit): string {
  return u === "lb" ? "lb" : "kg";
}
export function massToDisplay(kg: number, u: MassUnit): number {
  return u === "lb" ? kg * LB : kg;
}
export function massFromDisplay(v: number, u: MassUnit): number {
  return u === "lb" ? v / LB : v;
}
export function fmtMass(kg: number, u: MassUnit): string {
  return massToDisplay(kg, u).toFixed(1);
}
