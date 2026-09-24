"use client";

// Exercise library — a LIVE, filterable catalog powered by the AscendAPI ExerciseDB v2
// API (via the /api/edb proxy). Unlike the rest of the app (local-first), catalog
// browsing is intentionally ONLINE: a debounced search box + Body Part / Equipment /
// Type / Target-muscle filters re-query the API; results stream into a card grid with
// cursor-based "Load more". Tapping a card opens the how-to modal BY ID (openExerciseById),
// which pulls the EDB detail record directly. The curated data/library.ts is untouched —
// it still backs the add-to-program picker.
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

function CatCard({
  item,
  onOpen,
  onChip,
}: {
  item: EdbListItem;
  onOpen: () => void;
  onChip: (param: "bodyParts" | "equipments", value: string) => void;
}) {
  const [broken, setBroken] = useState(false);
  const bp = item.bodyParts[0];
  const eq = item.equipments[0];
  // Chips filter the catalog in place. They live inside the card <button>, so they are
  // spans (not nested buttons) with stopPropagation to avoid also opening the modal.
  const chip = (param: "bodyParts" | "equipments", value: string) => (
    <span
      className="chip chip-tap"
      role="button"
      tabIndex={0}
      onClick={(ev) => {
        ev.stopPropagation();
        onChip(param, value);
      }}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          ev.stopPropagation();
          onChip(param, value);
        }
      }}
    >
      {pretty(value)}
    </span>
  );
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
        {bp && chip("bodyParts", bp)}
        {eq && chip("equipments", eq)}
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

function LibraryContent() {
  const { openExerciseById } = useExerciseModal();
  const params = useSearchParams();

  // Seed the filters from the URL query so a deep link (e.g. from a tapped tag in the
  // detail modal) lands on a pre-filtered catalog. Values match the AscendAPI vocabulary
  // (UPPERCASE), which is exactly what the dropdown <option> values use, so the matching
  // filter dropdown also shows the active value.
  const [rawQuery, setRawQuery] = useState(() => params.get("search") ?? "");
  const [search, setSearch] = useState(() => params.get("search") ?? ""); // debounced
  const [bodyPart, setBodyPart] = useState(() => params.get("bodyParts") ?? "");
  const [equipment, setEquipment] = useState(() => params.get("equipments") ?? "");
  const [exType, setExType] = useState(() => params.get("exerciseType") ?? "");
  const [muscle, setMuscle] = useState(() => params.get("targetMuscles") ?? "");

  // Re-seed when the query string changes via navigation while the page is already mounted
  // (e.g. a modal chip on the Library route pushes /library?bodyParts=…). Lazy initial
  // state only runs on first mount, so this adjust-during-render guard — keyed on the
  // string form of the params — handles the same-route case without a set-state-in-effect
  // cascade. User dropdown changes don't touch the URL, so they never trip it.
  const spString = params.toString();
  const [prevSp, setPrevSp] = useState(spString);
  if (prevSp !== spString) {
    setPrevSp(spString);
    setRawQuery(params.get("search") ?? "");
    setSearch(params.get("search") ?? "");
    setBodyPart(params.get("bodyParts") ?? "");
    setEquipment(params.get("equipments") ?? "");
    setExType(params.get("exerciseType") ?? "");
    setMuscle(params.get("targetMuscles") ?? "");
  }

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
              <CatCard
                key={it.id}
                item={it}
                onOpen={() => openExerciseById(it.id, cap(it.name))}
                onChip={(param, value) => {
                  if (param === "bodyParts") setBodyPart(value);
                  else setEquipment(value);
                }}
              />
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

// useSearchParams requires a Suspense boundary so the page can still be statically
// prerendered; the content renders client-side once the query params are available.
export default function LibraryPage() {
  return (
    <Suspense fallback={<main />}>
      <LibraryContent />
    </Suspense>
  );
}
