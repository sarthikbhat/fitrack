// Catalog query layer for the live AscendAPI ExerciseDB v2 API, reached through the
// /api/edb serverless proxy (which injects the RapidAPI key and forwards ?path=<p> +
// the remaining query params). Unlike lib/edb.ts — which caches the ~200-item index
// once for OFFLINE name-matching in the how-to modal — this module powers the ONLINE
// Library catalog: every search/filter change is a fresh live query. Reference lists
// (body parts, muscles, equipment, types) rarely change, so those ARE cached in
// IndexedDB + memoised in-module. `buildEdbQuery` is a pure, network-free helper
// (unit-tested) that turns an EdbQuery into the proxy querystring.
import { get, set } from "idb-keyval";

export type EdbQuery = {
  search?: string;
  bodyParts?: string[];
  targetMuscles?: string[];
  equipments?: string[];
  exerciseType?: string;
  limit?: number;
  after?: string;
};

export type EdbListItem = {
  id: string;
  name: string;
  img: string;
  bodyParts: string[];
  targetMuscles: string[];
  equipments: string[];
  exerciseType: string;
};

export type EdbRef = { name: string; imageUrl?: string };

export type SearchResult = {
  items: EdbListItem[];
  total: number;
  nextCursor: string | null;
  hasNextPage: boolean;
};

/** Typed error the UI can surface as an offline / catalog-unreachable state. */
export class EdbCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EdbCatalogError";
  }
}

const LIMIT_MAX = 25;
const LIMIT_DEFAULT = 24;

function clampLimit(n: number | undefined): number {
  const v = Math.floor(typeof n === "number" && Number.isFinite(n) ? n : LIMIT_DEFAULT);
  return Math.max(1, Math.min(LIMIT_MAX, v));
}

/** PURE, network-free: build the proxy querystring for an EdbQuery.
    - When `search` is set → the fuzzy /exercises/search endpoint (better relevance).
    - Otherwise → /exercises with comma-joined filter arrays.
    Empty strings / empty arrays are omitted; `limit` is clamped to 1..25; `after`
    (forward cursor) is included when present. */
export function buildEdbQuery(q: EdbQuery): string {
  const p = new URLSearchParams();
  const limit = clampLimit(q.limit);
  const search = q.search?.trim();

  if (search) {
    p.set("path", "exercises/search");
    p.set("search", search);
    p.set("limit", String(limit));
    if (q.after) p.set("after", q.after);
    return p.toString();
  }

  p.set("path", "exercises");
  const join = (v?: string[]): string => (v && v.length ? v.filter(Boolean).join(",") : "");
  const bp = join(q.bodyParts);
  if (bp) p.set("bodyParts", bp);
  const tm = join(q.targetMuscles);
  if (tm) p.set("targetMuscles", tm);
  const eq = join(q.equipments);
  if (eq) p.set("equipments", eq);
  const type = q.exerciseType?.trim();
  if (type) p.set("exerciseType", type);
  p.set("limit", String(limit));
  if (q.after) p.set("after", q.after);
  return p.toString();
}

type RawItem = {
  exerciseId?: string;
  name?: string;
  imageUrl?: string;
  imageUrls?: Record<string, string>;
  bodyParts?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  equipments?: string[];
  exerciseType?: string;
};
type ListResp = {
  success?: boolean;
  meta?: { total?: number; hasNextPage?: boolean; hasPreviousPage?: boolean; nextCursor?: string | null };
  data?: RawItem[];
};

function mapItem(it: RawItem): EdbListItem | null {
  if (!it.exerciseId || !it.name) return null;
  return {
    id: it.exerciseId,
    name: it.name,
    img: it.imageUrls?.["360p"] || it.imageUrl || "",
    bodyParts: it.bodyParts || [],
    targetMuscles: it.targetMuscles || [],
    equipments: it.equipments || [],
    exerciseType: it.exerciseType || "",
  };
}

/** Live catalog query. Throws EdbCatalogError on non-OK / offline so the UI can show
    a connection state (catalog browsing is intentionally online-only). */
export async function searchExercises(q: EdbQuery): Promise<SearchResult> {
  let resp: Response;
  try {
    resp = await fetch("/api/edb?" + buildEdbQuery(q));
  } catch {
    throw new EdbCatalogError("The exercise catalog needs a connection.");
  }
  if (!resp.ok) throw new EdbCatalogError("The exercise catalog is unavailable right now.");
  let j: ListResp;
  try {
    j = (await resp.json()) as ListResp;
  } catch {
    throw new EdbCatalogError("The exercise catalog returned an unexpected response.");
  }
  const items = (j.data || []).map(mapItem).filter((x): x is EdbListItem => x != null);
  return {
    items,
    total: j.meta?.total ?? items.length,
    nextCursor: j.meta?.nextCursor ?? null,
    hasNextPage: Boolean(j.meta?.hasNextPage && j.meta?.nextCursor),
  };
}

// ---- reference lists: fetch once, cache in IndexedDB + memoise in-module ----
type RefResp = { success?: boolean; data?: EdbRef[] };
const REF_MEMO: Record<string, EdbRef[]> = {};

async function loadRef(path: string, cacheKey: string): Promise<EdbRef[]> {
  if (REF_MEMO[cacheKey]) return REF_MEMO[cacheKey];
  try {
    const cached = (await get(cacheKey)) as EdbRef[] | undefined;
    if (cached && cached.length) return (REF_MEMO[cacheKey] = cached);
  } catch {
    /* ignore cache read failures */
  }
  let resp: Response;
  try {
    resp = await fetch("/api/edb?path=" + encodeURIComponent(path));
  } catch {
    throw new EdbCatalogError("The exercise catalog needs a connection.");
  }
  if (!resp.ok) throw new EdbCatalogError("The exercise catalog is unavailable right now.");
  const j = (await resp.json()) as RefResp;
  const data = (j.data || []).filter((d) => d && d.name);
  REF_MEMO[cacheKey] = data;
  try {
    await set(cacheKey, data);
  } catch {
    /* ignore quota / private mode */
  }
  return data;
}

export const getBodyParts = (): Promise<EdbRef[]> => loadRef("bodyparts", "fitrack-edb-bodyparts");
export const getMuscles = (): Promise<EdbRef[]> => loadRef("muscles", "fitrack-edb-muscles");
export const getEquipments = (): Promise<EdbRef[]> => loadRef("equipments", "fitrack-edb-equipments");
export const getExerciseTypes = (): Promise<EdbRef[]> => loadRef("exercisetypes", "fitrack-edb-exercisetypes");
