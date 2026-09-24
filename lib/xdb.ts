"use client";

// ExerciseDB API (source B: animated GIFs + richer data) via the /api/exercisedb
// serverless proxy — ported from legacy:1427-1458. Layered on top of free-exercise-db:
// used ONLY by the how-to modal to show a live GIF when available. Fails silently
// (offline / no API key) so the app still works from the local DB.
import { get, set } from "idb-keyval";
import { toks, ALIAS } from "@/lib/exdb";

const XDB_KEY = "fitrack-xdb";

export type XdbEntry = {
  gif?: string;
  ins?: string[];
  target?: string;
  eq?: string;
  done: boolean;
  transient?: boolean;
};

type XdbApiItem = {
  name?: string;
  gifUrl?: string;
  instructions?: string[];
  target?: string;
  equipment?: string;
};

const XDB: Record<string, XdbEntry> = {};
let hydrated = false;

async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const cached = (await get(XDB_KEY)) as Record<string, XdbEntry> | undefined;
    if (cached) Object.assign(XDB, cached);
  } catch {
    /* ignore */
  }
}
async function persist(): Promise<void> {
  try {
    await set(XDB_KEY, XDB);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Pick the best-matching API item for our exercise name (legacy:1430-1441). */
export function pickXdb(name: string, list: XdbApiItem[]): XdbApiItem | null {
  if (!Array.isArray(list) || !list.length) return null;
  const q = toks(ALIAS[name] || name),
    move = q[q.length - 1];
  let best: XdbApiItem | null = null,
    bestScore = -1;
  for (const it of list) {
    const s = new Set(toks(it.name || ""));
    let hit = 0;
    for (const t of q) if (s.has(t)) hit++;
    const score = hit * 10 - Math.abs(s.size - q.length) + (move && s.has(move) ? 3 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return best;
}

/** Fetch (once) the ExerciseDB record for an exercise; cache in memory + IndexedDB.
    Resolves to the entry (also on failure, as {done:true}) (legacy:1442-1458). */
export async function loadXdb(name: string): Promise<XdbEntry> {
  await hydrate();
  const cur = XDB[name];
  if (cur && cur.done && !cur.transient) return cur;
  XDB[name] = { done: false };
  const q = encodeURIComponent(
    (ALIAS[name] || name)
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .trim(),
  );
  try {
    const r = await fetch("/api/exercisedb?path=exercises/name/" + q + "&limit=8");
    if (!r.ok) throw new Error("bad status");
    const list = (await r.json()) as XdbApiItem[];
    const b = pickXdb(name, list);
    XDB[name] = b
      ? { gif: b.gifUrl || "", ins: b.instructions || [], target: b.target || "", eq: b.equipment || "", done: true }
      : { done: true };
    await persist();
    return XDB[name];
  } catch {
    XDB[name] = { done: true, transient: true };
    return XDB[name];
  }
}

/** Synchronous peek at the in-memory cache (may be undefined before loadXdb). */
export function peekXdb(name: string): XdbEntry | undefined {
  return XDB[name];
}
