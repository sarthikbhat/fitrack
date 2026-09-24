"use client";

// free-exercise-db integration (source A: public, MIT/unlicense) — ported from
// legacy:1371-1422. Static ~800-entry JSON of exercise names, photos, instructions
// and muscles. Lazy-loaded once, then cached as a big blob in IndexedDB (NOT the
// zustand store, which is for user data). Provides the still-image thumbnails and
// the fallback technique guide used across the app.
import { useEffect, useState } from "react";
import { get, set } from "idb-keyval";

export const EXDB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
export const IMG_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const EXDB_KEY = "fitrack-exdb";

export const STOP = new Set([
  "the",
  "a",
  "an",
  "with",
  "and",
  "of",
  "log",
  "seconds",
  "assisted",
  "if",
  "needed",
]);
export const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export const toks = (s: string): string[] => norm(s).split(" ").filter((t) => t && !STOP.has(t));

/* hand-tuned aliases for lifts whose database entry is named differently (legacy:1380-1387) */
export const ALIAS: Record<string, string> = {
  "Back Squat": "barbell squat",
  "Incline Dumbbell Fly": "incline dumbbell flyes",
  "Pec Deck": "butterfly",
  "Chest-Supported Row": "dumbbell incline row",
  "Overhead Cable Triceps Ext.": "cable rope overhead triceps extension",
  "Cable Woodchopper": "standing cable wood chop",
};

// The serializable shape we cache; `set` (the token index) is rebuilt on load.
export type ExdbRaw = {
  n: string;
  imgs: string[];
  ins: string[];
  pm: string[];
  eq: string;
  lv: string;
};
export type ExdbEntry = ExdbRaw & { set: Set<string> };

type RawUpstream = {
  name: string;
  images?: string[];
  instructions?: string[];
  primaryMuscles?: string[];
  equipment?: string;
  level?: string;
};

let EXDB: ExdbEntry[] | null = null;
export const EX_CACHE: Record<string, ExdbEntry | null> = {};

/** Attach a token Set to each raw entry (legacy exProcess, 1378). */
function exProcess(raw: ExdbRaw[]): void {
  EXDB = raw.map((e) => ({ ...e, set: new Set(toks(e.n)) }));
}

/** Match our exercise name to a database entry (legacy:1393-1407). Require the
    movement word (last token, e.g. press/squat/row) to be shared so the picture is
    the right lift, then rank by overlap. Falls back to null (→ monogram). */
export function getEx(name: string): ExdbEntry | null {
  if (!EXDB) return null;
  if (name in EX_CACHE) return EX_CACHE[name];
  const q = toks(ALIAS[name] || name);
  if (!q.length) return (EX_CACHE[name] = null);
  const move = q[q.length - 1],
    minHit = Math.min(2, q.length);
  let best: ExdbEntry | null = null,
    bestScore = 0;
  for (const e of EXDB) {
    if (!e.set.has(move)) continue; // same movement family
    let hit = 0;
    for (const t of q) if (e.set.has(t)) hit++;
    if (hit < minHit) continue; // need real overlap, not just the verb
    const score = hit * 100 - Math.abs(e.set.size - q.length) * 4 - e.set.size;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return (EX_CACHE[name] = best);
}

/* Resize + re-encode exercise images through a free image CDN (weserv.nl):
   source JPGs are ~850px/~90KB but render into small thumbs, so we pull width-capped
   WebP instead — ~95% smaller, modern format (legacy:1587). */
export const cdnImg = (src: string, w: number, q?: number): string =>
  "https://images.weserv.nl/?url=" + encodeURIComponent(src) + "&w=" + w + "&output=webp&q=" + (q || 82) + "&we";

let loadPromise: Promise<void> | null = null;
let loaded = false;

/** Lazy-load the JSON once; cache the processed array in IndexedDB (legacy:1408-1421). */
export function loadExdb(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const cached = (await get(EXDB_KEY)) as ExdbRaw[] | undefined;
      if (cached && cached.length) {
        exProcess(cached);
        loaded = true;
        return;
      }
    } catch {
      /* ignore cache read failures */
    }
    const list = (await fetch(EXDB_URL).then((r) => r.json())) as RawUpstream[];
    const raw: ExdbRaw[] = list
      .filter((e) => e.images && e.images.length)
      .map((e) => ({
        n: e.name,
        imgs: e.images!.map((p) => IMG_BASE + p),
        ins: e.instructions || [],
        pm: e.primaryMuscles || [],
        eq: e.equipment || "",
        lv: e.level || "",
      }));
    exProcess(raw);
    loaded = true;
    try {
      await set(EXDB_KEY, raw);
    } catch {
      /* ignore cache write failures (quota / private mode) */
    }
  })().catch(() => {
    // Allow a later mount to retry after a transient/offline failure.
    loadPromise = null;
  });
  return loadPromise;
}

/** Trigger loadExdb() on mount; returns whether the DB is ready so consumers
    re-render (and re-call getEx) once images/instructions become available. */
export function useExdbReady(): boolean {
  const [ready, setReady] = useState(loaded);
  useEffect(() => {
    if (loaded) return; // already ready from the initial state; nothing to sync
    let alive = true;
    // loadExdb() resolves immediately if the DB loaded between render and this effect,
    // so the setReady lives in the async callback (not a sync set-state-in-effect).
    loadExdb().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/** True once the DB is in memory (legacy used the bare `EXDB` truthiness). */
export function isExdbLoaded(): boolean {
  return EXDB != null;
}

/** All loaded source-A entries (empty until loadExdb resolves). Used by the merged
    catalog (lib/catalog.ts) to seed its base of ~800 exercises. */
export function allExdb(): ExdbEntry[] {
  return EXDB || [];
}

/* ---- test seams: inject a fake in-memory EXDB without any network ---- */
export function _seedExdb(raw: ExdbRaw[]): void {
  exProcess(raw);
  loaded = true;
  for (const k of Object.keys(EX_CACHE)) delete EX_CACHE[k];
}
export function _resetExdb(): void {
  EXDB = null;
  loaded = false;
  loadPromise = null;
  for (const k of Object.keys(EX_CACHE)) delete EX_CACHE[k];
}
