export function makeId(): string {
  // crypto.randomUUID is available in modern browsers and Node 18+.
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}
