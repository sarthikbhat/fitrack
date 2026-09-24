"use client";

// Exercise library — a LIVE, filterable catalog powered by the AscendAPI ExerciseDB v2
// API (via the /api/edb proxy). Unlike the rest of the app (local-first), catalog
// browsing is intentionally ONLINE: a debounced search box + Body Part / Equipment /
// Type / Target-muscle filters re-query the API; results stream into a card grid with
// cursor-based "Load more". Tapping a card opens the how-to modal BY ID (openExerciseById),
// which pulls the EDB detail record directly. The curated data/library.ts is untouched —
// it still backs the add-to-program picker.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  searchExercises,
  getBodyParts,
  getEquipments,
  getExerciseTypes,
  getMuscles,
  EdbCatalogError,
  type EdbListItem,
  type EdbQuery,
  type EdbRef,
} from "@/lib/edbCatalog";
import { useExerciseModal } from "@/components/exercise/ExerciseModalProvider";
import { initials } from "@/components/exercise/Thumb";

const PAGE = 24;
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const pretty = (s: string): string => cap(s.replace(/_/g, " ").toLowerCase());

function CatCard({ item, onOpen }: { item: EdbListItem; onOpen: () => void }) {
  const [broken, setBroken] = useState(false);
  const bp = item.bodyParts[0];
  const eq = item.equipments[0];
  return (
    <button className="libcard" onClick={onOpen} aria-label={`How to do ${item.name}`}>
      <div className="catimg">
        {item.img && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.img} alt={item.name} loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="ph">{initials(item.name)}</span>
        )}
      </div>
      <div className="libnm">{cap(item.name)}</div>
      <div className="catchips">
        {bp && <span className="chip">{pretty(bp)}</span>}
        {eq && <span className="chip">{pretty(eq)}</span>}
      </div>
    </button>
  );
}

/** A single-select dropdown populated from an EDB reference list. */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: EdbRef[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      className={`fsel${value ? " on" : ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.name} value={o.name}>
          {pretty(o.name)}
        </option>
      ))}
    </select>
  );
}

export default function LibraryPage() {
  const { openExerciseById } = useExerciseModal();

  const [rawQuery, setRawQuery] = useState("");
  const [search, setSearch] = useState(""); // debounced
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [exType, setExType] = useState("");
  const [muscle, setMuscle] = useState("");

  const [bodyParts, setBodyParts] = useState<EdbRef[]>([]);
  const [equipments, setEquipments] = useState<EdbRef[]>([]);
  const [types, setTypes] = useState<EdbRef[]>([]);
  const [muscles, setMuscles] = useState<EdbRef[]>([]);

  const [items, setItems] = useState<EdbListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);

  const [loading, setLoading] = useState(true); // initial / re-query load
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // bump to force a re-query (retry)

  // Debounce the search box (~300ms).
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // Load the reference lists once (cached). Failures leave the dropdowns empty but the
  // search box still works, so we swallow them here.
  useEffect(() => {
    getBodyParts().then(setBodyParts).catch(() => {});
    getEquipments().then(setEquipments).catch(() => {});
    getExerciseTypes().then(setTypes).catch(() => {});
    getMuscles().then(setMuscles).catch(() => {});
  }, []);

  const query = useMemo<EdbQuery>(
    () => ({
      search: search || undefined,
      bodyParts: bodyPart ? [bodyPart] : undefined,
      equipments: equipment ? [equipment] : undefined,
      exerciseType: exType || undefined,
      targetMuscles: muscle ? [muscle] : undefined,
      limit: PAGE,
    }),
    [search, bodyPart, equipment, exType, muscle],
  );

  // Entering a new query (filter change or retry): flag loading + clear the previous
  // error/results synchronously DURING render (guarded adjust-during-render — not an
  // effect — so it doesn't trip the cascading-set-state-in-effect rule).
  const queryKey = useMemo(() => JSON.stringify(query) + ":" + reloadKey, [query, reloadKey]);
  const [shownKey, setShownKey] = useState<string | null>(null);
  if (shownKey !== queryKey) {
    setShownKey(queryKey);
    setLoading(true);
    setError(null);
  }

  // Re-query from scratch whenever the search or any filter changes.
  useEffect(() => {
    let alive = true;
    searchExercises(query)
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setTotal(res.total);
        setCursor(res.nextCursor);
        setHasNext(res.hasNextPage);
      })
      .catch((e) => {
        if (!alive) return;
        setItems([]);
        setTotal(0);
        setCursor(null);
        setHasNext(false);
        setError(e instanceof EdbCatalogError ? e.message : "Something went wrong loading the catalog.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [query, reloadKey]);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    searchExercises({ ...query, after: cursor })
      .then((res) => {
        setItems((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor);
        setHasNext(res.hasNextPage);
      })
      .catch((e) => {
        setError(e instanceof EdbCatalogError ? e.message : "Something went wrong loading more.");
        setHasNext(false);
      })
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore, query]);

  const anyFilter = Boolean(search || bodyPart || equipment || exType || muscle);
  const clearAll = () => {
    setRawQuery("");
    setSearch("");
    setBodyPart("");
    setEquipment("");
    setExType("");
    setMuscle("");
  };

  return (
    <main>
      <div className="section-h">
        <h2>Exercise library</h2>
        <span className="sub">{loading ? "Loading…" : error ? "Offline" : `${total} moves`}</span>
      </div>

      <input
        className="search"
        placeholder="Search exercises…"
        value={rawQuery}
        onChange={(e) => setRawQuery(e.target.value)}
        autoComplete="off"
        style={{ marginBottom: 11 }}
        aria-label="Search exercises"
      />

      <div className="filterbar">
        <FilterSelect label="Body part" value={bodyPart} options={bodyParts} onChange={setBodyPart} />
        <FilterSelect label="Equipment" value={equipment} options={equipments} onChange={setEquipment} />
        <FilterSelect label="Type" value={exType} options={types} onChange={setExType} />
        <FilterSelect label="Target muscle" value={muscle} options={muscles} onChange={setMuscle} />
        {anyFilter && (
          <button className="fpill" onClick={clearAll}>
            Clear
          </button>
        )}
      </div>

      {error ? (
        <div className="empty catstate">
          <div className="catstate-t">Catalog needs a connection</div>
          <div>{error}</div>
          <button className="btn sm" style={{ marginTop: 12 }} onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="libgrid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="libcard skel">
              <div className="catimg skelbox" />
              <div className="skelline" />
              <div className="skelline sm" />
            </div>
          ))}
        </div>
      ) : items.length ? (
        <>
          <div className="libgrid">
            {items.map((it) => (
              <CatCard key={it.id} item={it} onOpen={() => openExerciseById(it.id, cap(it.name))} />
            ))}
          </div>
          {hasNext && (
            <button className="btn loadmore" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      ) : (
        <div className="empty">No exercises match your search.</div>
      )}
    </main>
  );
}
