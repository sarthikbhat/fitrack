"use client";

// EDB-with-videos API (source C: MP4 video demos + images + overviews) via the
// /api/edb serverless proxy. Layered on top of free-exercise-db (source A) and
// ExerciseDB (source B): used by the how-to modal to show a looping video when
// available. There is NO reliable text-search endpoint upstream, so we cache the
// full ~200-item index once (IndexedDB) and match names LOCALLY, reusing the same
// tokenisation / movement-token gating as lib/exdb.ts getEx. Fails silently
// (offline / no API key) so the app still works from the local databases.
import { useEffect, useState } from "react";
import { get, set } from "idb-keyval";
import { toks, ALIAS } from "@/lib/exdb";

const EDB_INDEX_KEY = "fitrack-edb-index";
const EDB_DETAIL_KEY = "fitrack-edb-detail";

// Compact per-exercise index entry (the list endpoint has no video; detail does).
export type EdbIndexEntry = { id: string; name: string; tokens: string[]; img: string };
export type EdbDetail = {
  name?: string;
  videoUrl?: string;
  imageUrl?: string;
  overview?: string;
  instructions?: string[];
  exerciseTips?: string[];
  variations?: string[];
  relatedExerciseIds?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  bodyParts?: string[];
  equipments?: string[];
  exerciseType?: string;
};

type EdbListItem = {
  exerciseId?: string;
  name?: string;
  imageUrl?: string;
};
type EdbListResp = {
  success?: boolean;
  meta?: { total?: number; hasNextPage?: boolean; nextCursor?: string };
  data?: EdbListItem[];
};
type EdbDetailResp = {
  success?: boolean;
  data?: {
    name?: string;
    videoUrl?: string;
    imageUrl?: string;
    overview?: string;
    instructions?: string[];
    exerciseTips?: string[];
    variations?: string[];
    relatedExerciseIds?: string[];
    targetMuscles?: string[];
    secondaryMuscles?: string[];
    bodyParts?: string[];
    equipments?: string[];
    exerciseType?: string;
  };
};

let INDEX: EdbIndexEntry[] | null = null;
let indexPromise: Promise<void> | null = null;
let indexLoaded = false;

const MATCH_CACHE: Record<string, { id: string; img: string } | null> = {};
const DETAIL_CACHE: Record<string, EdbDetail | null> = {};

/** Page through the list endpoint following nextCursor; build + cache a compact index. */
export function loadEdbIndex(): Promise<void> {
  if (indexLoaded) return Promise.resolve();
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    try {
      const cached = (await get(EDB_INDEX_KEY)) as EdbIndexEntry[] | undefined;
      if (cached && cached.length) {
        INDEX = cached;
        indexLoaded = true;
        return;
      }
    } catch {
      /* ignore cache read failures */
    }
    const out: EdbIndexEntry[] = [];
    let cursor = "";
    // ~200 items over 2-3 pages; cap iterations defensively.
    for (let page = 0; page < 10; page++) {
      const cq = cursor ? "&cursor=" + encodeURIComponent(cursor) : "";
      const r = await fetch("/api/edb?path=exercises&limit=100" + cq);
      if (!r.ok) throw new Error("bad status");
      const j = (await r.json()) as EdbListResp;
      for (const it of j.data || []) {
        if (!it.exerciseId || !it.name) continue;
        out.push({
          id: it.exerciseId,
          name: it.name,
          tokens: toks(it.name),
          img: it.imageUrl || "",
        });
      }
      if (!j.meta?.hasNextPage || !j.meta?.nextCursor) break;
      cursor = j.meta.nextCursor;
    }
    INDEX = out;
    indexLoaded = true;
    try {
      await set(EDB_INDEX_KEY, out);
    } catch {
      /* ignore quota / private mode */
    }
  })().catch(() => {
    // Allow a later mount to retry after a transient/offline failure.
    indexPromise = null;
  });
  return indexPromise;
}

/** Local fuzzy match against the cached index (mirrors lib/exdb.ts getEx): require
    the movement word (last token) to be shared, then rank by overlap. → null misses. */
export function matchEdb(name: string): { id: string; img: string } | null {
  if (!INDEX) return null;
  if (name in MATCH_CACHE) return MATCH_CACHE[name];
  const q = toks(ALIAS[name] || name);
  if (!q.length) return (MATCH_CACHE[name] = null);
  const move = q[q.length - 1],
    minHit = Math.min(2, q.length);
  let best: EdbIndexEntry | null = null,
    bestScore = 0;
  for (const e of INDEX) {
    const s = new Set(e.tokens);
    if (!s.has(move)) continue; // same movement family
    let hit = 0;
    for (const t of q) if (s.has(t)) hit++;
    if (hit < minHit) continue; // need real overlap, not just the verb
    const score = hit * 100 - Math.abs(s.size - q.length) * 4 - s.size;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return (MATCH_CACHE[name] = best ? { id: best.id, img: best.img } : null);
}

/** Fetch (once) the detail record for an exercise id; cache in memory + IndexedDB.
    Returns the media fields, or null on any failure (silent). */
export async function loadEdbDetail(id: string): Promise<EdbDetail | null> {
  if (id in DETAIL_CACHE) return DETAIL_CACHE[id];
  try {
    const cached = (await get(EDB_DETAIL_KEY)) as Record<string, EdbDetail> | undefined;
    if (cached && id in cached) return (DETAIL_CACHE[id] = cached[id]);
  } catch {
    /* ignore cache read failures */
  }
  try {
    const r = await fetch("/api/edb?path=exercises/" + encodeURIComponent(id));
    if (!r.ok) throw new Error("bad status");
    const j = (await r.json()) as EdbDetailResp;
    const d = j.data || {};
    const detail: EdbDetail = {
      name: d.name,
      videoUrl: d.videoUrl,
      imageUrl: d.imageUrl,
      overview: d.overview,
      instructions: d.instructions,
      exerciseTips: d.exerciseTips,
      variations: d.variations,
      relatedExerciseIds: d.relatedExerciseIds,
      targetMuscles: d.targetMuscles,
      secondaryMuscles: d.secondaryMuscles,
      bodyParts: d.bodyParts,
      equipments: d.equipments,
      exerciseType: d.exerciseType,
    };
    DETAIL_CACHE[id] = detail;
    try {
      const cached = ((await get(EDB_DETAIL_KEY)) as Record<string, EdbDetail> | undefined) || {};
      cached[id] = detail;
      await set(EDB_DETAIL_KEY, cached);
    } catch {
      /* ignore quota / private mode */
    }
    return detail;
  } catch {
    return (DETAIL_CACHE[id] = null);
  }
}

/** Trigger loadEdbIndex() on mount; returns whether the index is ready so consumers
    re-render (and re-call matchEdb) once the index becomes available. */
export function useEdbReady(): boolean {
  const [ready, setReady] = useState(indexLoaded);
  useEffect(() => {
    if (indexLoaded) return;
    let alive = true;
    loadEdbIndex().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/** True once the index is in memory. */
export function isEdbLoaded(): boolean {
  return INDEX != null;
}

/* ---- test seams: inject a fake in-memory index without any network ---- */
export function _seedEdbIndex(entries: Array<{ id: string; name: string; img?: string }>): void {
  INDEX = entries.map((e) => ({ id: e.id, name: e.name, tokens: toks(e.name), img: e.img || "" }));
  indexLoaded = true;
  for (const k of Object.keys(MATCH_CACHE)) delete MATCH_CACHE[k];
}
export function _resetEdb(): void {
  INDEX = null;
  indexLoaded = false;
  indexPromise = null;
  for (const k of Object.keys(MATCH_CACHE)) delete MATCH_CACHE[k];
  for (const k of Object.keys(DETAIL_CACHE)) delete DETAIL_CACHE[k];
}
