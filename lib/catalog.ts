"use client";

// Unified, LOCAL, offline-first exercise catalog. Merges the two sources the app
// already integrates into ONE filterable index the Library searches client-side:
//   - source A (free-exercise-db, lib/exdb.ts): ~800 exercises with still images,
//     instructions and primary muscles. No key, no cap, cached in IndexedDB.
//   - source C (AscendAPI ExerciseDB, via /api/edb): ~200 exercises that add VIDEO +
//     rich detail. We page the whole list ONCE and cache it (fitrack-edb-catalog).
// The merge de-dupes by normalised name: an AscendAPI match on a source-A entry just
// upgrades that entry (edbId + hasVideo); AscendAPI-only exercises are added fresh.
// Every muscle string from both sources is normalised into ONE canonical vocabulary
// (free-exercise-db's) so the Muscle filter is coherent across sources.
import { get, set } from "idb-keyval";
import { allExdb, cdnImg, loadExdb, norm, toks } from "@/lib/exdb";

const CATALOG_KEY = "fitrack-edb-catalog";

export type CatalogItem = {
  key: string; // normName(name) - the dedupe key
  name: string;
  img: string;
  muscles: string[]; // canonical lowercase groups
  equipment: string[]; // lowercase
  edbId: string | null; // AscendAPI id when available (unlocks video + rich detail)
  hasVideo: boolean;
};

export type CatalogFilters = { text?: string; muscle?: string; equipment?: string };

// The serializable AscendAPI record we cache.
export type EdbCatalogRaw = {
  exerciseId: string;
  name: string;
  imageUrl: string;
  bodyParts: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipments: string[];
  exerciseType: string;
};

/** Stable dedupe / match key for an exercise name (reuses exdb's norm). */
export const normName = (name: string): string => norm(name);

// ---- canonical muscle-group mapping ----------------------------------------
// One simple set of groups matching free-exercise-db's vocabulary. Both sources'
// muscle strings (free-db lowercase, AscendAPI UPPERCASE anatomical) map into it.
const GROUPS = new Set([
  "chest", "back", "lats", "traps", "lower back", "shoulders", "biceps",
  "triceps", "forearms", "abdominals", "quadriceps", "hamstrings", "glutes",
  "calves", "adductors", "abductors", "neck",
]);

/** Map an anatomical / uppercase / free-db muscle name → a canonical group.
    Unmapped values fall through as their lowercased raw form. */
export function toMuscleGroup(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (GROUPS.has(s)) return s;
  if (s === "middle back" || s === "upper back") return "back";
  const has = (k: string): boolean => s.includes(k);
  // Order matters: narrower / prefix-colliding checks first.
  if (has("pectoral") || has("chest") || has("pec")) return "chest";
  if (has("tricep")) return "triceps";
  if (has("bicep") || has("brachialis")) return "biceps";
  if (has("brachioradialis") || has("forearm") || has("wrist") || has("grip")) return "forearms";
  if (has("deltoid") || has("delts") || has("shoulder") || has("rotator")) return "shoulders";
  if (has("latissimus") || has("lats")) return "lats";
  if (has("trapezius") || has("traps")) return "traps";
  if (has("erector spinae") || has("spinae") || has("lower back")) return "lower back";
  if (has("quadricep") || has("quads") || has("quad")) return "quadriceps";
  if (has("hamstring")) return "hamstrings";
  if (has("glute") || has("gluteal")) return "glutes";
  if (has("gastrocnemius") || has("soleus") || has("calves") || has("calf")) return "calves";
  if (has("abdominis") || has("abdominal") || has("abs") || has("oblique") || has("core")) return "abdominals";
  if (has("adductor")) return "adductors";
  if (has("abductor")) return "abductors";
  if (has("neck") || has("sternocleidomastoid")) return "neck";
  if (has("back")) return "back";
  return s; // unmapped → keep lowercased raw
}

const dedupe = (xs: Array<string | null>): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    if (!x) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
};

const normEquip = (eq: string): string => eq.trim().toLowerCase();

// ---- AscendAPI full-list fetch (paged once, cached) ------------------------
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
  meta?: { total?: number; hasNextPage?: boolean; nextCursor?: string | null };
  data?: RawItem[];
};

let ASCEND: EdbCatalogRaw[] = [];

/** Page the whole AscendAPI exercise list once, cache it, memoise. Never throws:
    on any failure ASCEND stays empty so the catalog still shows source A (~800). */
async function loadAscend(): Promise<void> {
  try {
    const cached = (await get(CATALOG_KEY)) as EdbCatalogRaw[] | undefined;
    if (cached && cached.length) {
      ASCEND = cached;
      return;
    }
  } catch {
    /* ignore cache read failures */
  }
  const out: EdbCatalogRaw[] = [];
  try {
    let cursor = "";
    for (let page = 0; page < 40; page++) {
      const cq = cursor ? "&after=" + encodeURIComponent(cursor) : "";
      const r = await fetch("/api/edb?path=exercises&limit=25" + cq);
      if (!r.ok) throw new Error("bad status");
      const j = (await r.json()) as ListResp;
      for (const it of j.data || []) {
        if (!it.exerciseId || !it.name) continue;
        out.push({
          exerciseId: it.exerciseId,
          name: it.name,
          imageUrl: it.imageUrls?.["360p"] || it.imageUrl || "",
          bodyParts: it.bodyParts || [],
          targetMuscles: it.targetMuscles || [],
          secondaryMuscles: it.secondaryMuscles || [],
          equipments: it.equipments || [],
          exerciseType: it.exerciseType || "",
        });
      }
      if (!j.meta?.hasNextPage || !j.meta?.nextCursor) break;
      cursor = j.meta.nextCursor;
    }
    ASCEND = out;
    try {
      await set(CATALOG_KEY, out);
    } catch {
      /* ignore quota / private mode */
    }
  } catch {
    // Offline / no key: keep whatever we paged (or empty). Source A still renders.
    ASCEND = out;
  }
}

// ---- merged index ----------------------------------------------------------
let CATALOG: CatalogItem[] | null = null;

function build(): void {
  const base = allExdb();
  const byKey = new Map<string, CatalogItem>();
  const items: CatalogItem[] = [];

  for (const e of base) {
    const item: CatalogItem = {
      key: normName(e.n),
      name: e.n,
      img: e.imgs[0] ? cdnImg(e.imgs[0], 220) : "",
      muscles: dedupe(e.pm.map((m) => toMuscleGroup(m))),
      equipment: e.eq ? dedupe([normEquip(e.eq)]) : [],
      edbId: null,
      hasVideo: false,
    };
    items.push(item);
    if (!byKey.has(item.key)) byKey.set(item.key, item);
  }

  for (const a of ASCEND) {
    const key = normName(a.name);
    const found = byKey.get(key);
    if (found) {
      found.edbId = a.exerciseId;
      found.hasVideo = true;
      if (a.imageUrl) found.img = a.imageUrl; // prefer AscendAPI image
    } else {
      const item: CatalogItem = {
        key,
        name: a.name,
        img: a.imageUrl || "",
        // Primary (target) muscles only - secondary muscles would make e.g. a
        // Triceps filter surface Bench Press (primary chest) and look wrong.
        muscles: dedupe(a.targetMuscles.map((m) => toMuscleGroup(m))),
        equipment: dedupe(a.equipments.map(normEquip)),
        edbId: a.exerciseId,
        hasVideo: true,
      };
      items.push(item);
      byKey.set(key, item);
    }
  }

  CATALOG = items;
}

let catalogPromise: Promise<void> | null = null;
let catalogReady = false;

/** Ensure source A is loaded, page + cache the AscendAPI list once, then build the
    merged index. Memoised: safe to call from every mount. */
export function loadCatalog(): Promise<void> {
  if (catalogReady) return Promise.resolve();
  if (catalogPromise) return catalogPromise;
  catalogPromise = (async () => {
    await loadExdb();
    await loadAscend();
    build();
    catalogReady = true;
  })().catch(() => {
    catalogPromise = null;
  });
  return catalogPromise;
}

/** True once the merged index is in memory. */
export function isCatalogReady(): boolean {
  return catalogReady && CATALOG != null;
}

/** Distinct, sorted muscle + equipment values present in the merged index. */
export function catalogFacets(): { muscles: string[]; equipment: string[] } {
  const cat = CATALOG || [];
  const m = new Set<string>();
  const e = new Set<string>();
  for (const it of cat) {
    for (const x of it.muscles) m.add(x);
    for (const x of it.equipment) e.add(x);
  }
  return { muscles: [...m].sort(), equipment: [...e].sort() };
}

/** PURE filter predicate (unit-tested): a text substring OR token overlap on the
    name, plus optional exact muscle / equipment membership. */
export function matchItem(it: CatalogItem, f: CatalogFilters): boolean {
  if (f.muscle && !it.muscles.includes(f.muscle)) return false;
  if (f.equipment && !it.equipment.includes(f.equipment)) return false;
  const text = f.text?.trim().toLowerCase();
  if (text) {
    if (!it.name.toLowerCase().includes(text)) {
      const q = toks(f.text!);
      const nt = new Set(toks(it.name));
      if (!q.length || !q.some((t) => nt.has(t))) return false;
    }
  }
  return true;
}

/** Local search over the merged index. Sorts hasVideo first, then name, and
    paginates client-side (slice). */
export function searchCatalog(
  filters: CatalogFilters,
  page = 0,
  pageSize = 24,
): { items: CatalogItem[]; total: number; hasMore: boolean } {
  const cat = CATALOG || [];
  const filtered = cat.filter((it) => matchItem(it, filters));
  filtered.sort((a, b) =>
    a.hasVideo === b.hasVideo ? a.name.localeCompare(b.name) : a.hasVideo ? -1 : 1,
  );
  const total = filtered.length;
  const start = page * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return { items, total, hasMore: start + items.length < total };
}

/* ---- test seams: inject a fake merged catalog without any network ---- */
export function _seedCatalog(items: CatalogItem[]): void {
  CATALOG = items;
  catalogReady = true;
}
export function _resetCatalog(): void {
  CATALOG = null;
  ASCEND = [];
  catalogReady = false;
  catalogPromise = null;
}
