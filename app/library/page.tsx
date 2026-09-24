"use client";

// Exercise library - a LOCAL, offline-first, filterable catalog. Backed by lib/catalog.ts,
// which merges free-exercise-db (~800, source A) with the AscendAPI ExerciseDB list (~200,
// source C: adds VIDEO + rich detail) into ONE index searched entirely client-side. No more
// 200-cap, no per-keystroke network: once loaded (both sources cached in IndexedDB) it works
// fully offline. A search box + Muscle / Equipment dropdowns filter in place; "Load more"
// pages the local slice. Tapping a card opens the how-to modal by id (video + rich detail)
// when the exercise has an AscendAPI match, else by name (source-A image + instructions).
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  loadCatalog,
  searchCatalog,
  catalogFacets,
  toMuscleGroup,
  type CatalogItem,
} from "@/lib/catalog";
import { useExerciseModal } from "@/components/exercise/ExerciseModalProvider";
import { initials } from "@/components/exercise/Thumb";

const PAGE = 24;
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const title = (s: string): string => s.split(" ").map(cap).join(" ");

function CatCard({
  item,
  onOpen,
  onChip,
}: {
  item: CatalogItem;
  onOpen: () => void;
  onChip: (kind: "muscle" | "equipment", value: string) => void;
}) {
  const [broken, setBroken] = useState(false);
  const muscle = item.muscles[0];
  const equip = item.equipment[0];
  // Chips filter the catalog in place. They live inside the card <button>, so they are
  // spans (not nested buttons) with stopPropagation to avoid also opening the modal.
  const chip = (kind: "muscle" | "equipment", value: string) => (
    <span
      className="chip chip-tap"
      role="button"
      tabIndex={0}
      onClick={(ev) => {
        ev.stopPropagation();
        onChip(kind, value);
      }}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          ev.stopPropagation();
          onChip(kind, value);
        }
      }}
    >
      {title(value)}
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
        {item.hasVideo && <span className="vidbadge">Video</span>}
      </div>
      <div className="libnm">{cap(item.name)}</div>
      <div className="catchips">
        {muscle && chip("muscle", muscle)}
        {equip && chip("equipment", equip)}
      </div>
    </button>
  );
}

/** A single-select dropdown of facet values (title-cased display). */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
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
        <option key={o} value={o}>
          {title(o)}
        </option>
      ))}
    </select>
  );
}

// Map an incoming URL param value (from a tapped detail-modal chip - AscendAPI vocabulary
// like "TRICEPS BRACHII" / "BARBELL", or a free-db lowercase value) onto a facet value.
const toMuscleFacet = (v: string): string => (v ? toMuscleGroup(v) || "" : "");
const toEquipFacet = (v: string): string => v.trim().toLowerCase();

function LibraryContent() {
  const { openExercise, openExerciseById } = useExerciseModal();
  const params = useSearchParams();

  const [ready, setReady] = useState(false);

  // Seed filters from the URL query so a deep link (e.g. a tapped tag in the detail modal,
  // which pushes AscendAPI-vocabulary values) lands on a pre-filtered catalog. Incoming
  // muscle values (targetMuscles / bodyParts) run through toMuscleGroup; equipment lowercases.
  const [rawQuery, setRawQuery] = useState(() => params.get("search") ?? "");
  const [search, setSearch] = useState(() => params.get("search") ?? ""); // debounced
  const [muscle, setMuscle] = useState(() =>
    toMuscleFacet(params.get("targetMuscles") || params.get("bodyParts") || ""),
  );
  const [equipment, setEquipment] = useState(() => toEquipFacet(params.get("equipments") ?? ""));

  // Re-seed when the query string changes via navigation while already mounted (a modal chip
  // on the /library route pushes new params). Adjust-during-render guard keyed on the string
  // form of the params - no set-state-in-effect cascade.
  const spString = params.toString();
  const [prevSp, setPrevSp] = useState(spString);
  if (prevSp !== spString) {
    setPrevSp(spString);
    setRawQuery(params.get("search") ?? "");
    setSearch(params.get("search") ?? "");
    setMuscle(toMuscleFacet(params.get("targetMuscles") || params.get("bodyParts") || ""));
    setEquipment(toEquipFacet(params.get("equipments") ?? ""));
  }

  const [page, setPage] = useState(0);

  // Load the merged catalog once. If the AscendAPI fetch fails, source A (~800) still shows.
  useEffect(() => {
    let alive = true;
    loadCatalog().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Debounce the search box (~250ms).
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const filters = useMemo(
    () => ({ text: search || undefined, muscle: muscle || undefined, equipment: equipment || undefined }),
    [search, muscle, equipment],
  );

  // Reset pagination whenever the filters change (adjust-during-render guard).
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const [shownKey, setShownKey] = useState(filterKey);
  if (shownKey !== filterKey) {
    setShownKey(filterKey);
    setPage(0);
  }

  const facets = useMemo(() => (ready ? catalogFacets() : { muscles: [], equipment: [] }), [ready]);
  const result = useMemo(
    () => (ready ? searchCatalog(filters, 0, (page + 1) * PAGE) : { items: [], total: 0, hasMore: false }),
    [ready, filters, page],
  );

  const anyFilter = Boolean(search || muscle || equipment);
  const clearAll = () => {
    setRawQuery("");
    setSearch("");
    setMuscle("");
    setEquipment("");
  };

  return (
    <main>
      <div className="section-h">
        <h2>Exercise library</h2>
        <span className="sub">{!ready ? "Loading…" : `${result.total} moves`}</span>
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
        <FilterSelect label="Muscle" value={muscle} options={facets.muscles} onChange={setMuscle} />
        <FilterSelect label="Equipment" value={equipment} options={facets.equipment} onChange={setEquipment} />
        {anyFilter && (
          <button className="fpill" onClick={clearAll}>
            Clear
          </button>
        )}
      </div>

      {!ready ? (
        <div className="libgrid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="libcard skel">
              <div className="catimg skelbox" />
              <div className="skelline" />
              <div className="skelline sm" />
            </div>
          ))}
        </div>
      ) : result.items.length ? (
        <>
          <div className="libgrid">
            {result.items.map((it) => (
              <CatCard
                key={it.key}
                item={it}
                onOpen={() =>
                  it.edbId ? openExerciseById(it.edbId, cap(it.name)) : openExercise(it.name)
                }
                onChip={(kind, value) => {
                  if (kind === "muscle") setMuscle(value);
                  else setEquipment(value);
                }}
              />
            ))}
          </div>
          {result.hasMore && (
            <button className="btn loadmore" onClick={() => setPage((p) => p + 1)}>
              Load more
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
