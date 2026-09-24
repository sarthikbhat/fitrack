"use client";

// Exercise picker overlay (legacy renderPicker/pickBodyHTML, 2027-2070).
// A search box + muscle filter pills over LIBRARY; each row can add/remove the move
// and open its how-to modal. A trailing custom-add row appears when the query has no
// exact match. Reflects the day's live added/removed/order state.
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { todayISO } from "@/lib/dates";
import { dayById, dayExercises, activeDays } from "@/lib/day";
import { LIBRARY } from "@/data/library";
import { MG_ORDER, mc, type MuscleGroup } from "@/data/muscles";
import { Thumb } from "@/components/exercise/Thumb";
import { Chip } from "@/components/exercise/Chip";
import { useExerciseModal } from "@/components/exercise/ExerciseModalProvider";
import { Icon } from "@/data/icons";

export function Picker({ dayId, onClose }: { dayId: string; onClose: () => void }) {
  const added = useStore((s) => s.added);
  const removed = useStore((s) => s.removed);
  const order = useStore((s) => s.order);
  const custom = useStore((s) => s.custom);
  const programs = useStore((s) => s.programs);
  const activeProgramId = useStore((s) => s.activeProgramId);
  const addExerciseToDay = useStore((s) => s.addExerciseToDay);
  const addCustomExercise = useStore((s) => s.addCustomExercise);
  const removeExerciseFromDay = useStore((s) => s.removeExerciseFromDay);
  const { openExercise } = useExerciseModal();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | MuscleGroup>("All");

  const overlayRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.classList.add("locked");
    return () => document.body.classList.remove("locked");
  }, []);
  useEffect(() => {
    searchRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const day = dayById(dayId, custom, todayISO(), activeDays({ programs, activeProgramId }));

  const existing = useMemo(
    () => new Set(dayExercises(day, added, removed, order).map((e) => e.name)),
    [day, added, removed, order],
  );

  const q = query.toLowerCase().trim();
  const items = LIBRARY.filter(
    (e) => (filter === "All" || e.muscle === filter) && (!q || e.name.toLowerCase().includes(q)),
  );
  const exact = items.some((e) => e.name.toLowerCase() === q);
  const customMus: MuscleGroup = filter === "All" ? "Chest" : filter;

  return (
    <div
      className="overlay"
      ref={overlayRef}
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="modal picker" role="dialog" aria-modal="true" aria-label={day ? `Edit ${day.name}` : "Edit day"}>
        <div className="pickhead">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h3 className="cond" style={{ fontSize: 19 }}>
              Edit {day ? day.name : "day"}
            </h3>
            <button className="close" style={{ position: "static" }} onClick={onClose} aria-label="done">
              <Icon name="close" />
            </button>
          </div>
          <input
            ref={searchRef}
            className="search"
            placeholder="Search or type a custom name…"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="filters">
            {(["All", ...MG_ORDER] as const).map((m) => (
              <button
                key={m}
                className={`fpill${filter === m ? " on" : ""}`}
                onClick={() => setFilter(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="pickbody">
          {q && !exact && (
            <div className="pickrow">
              <div className="thumb sm">
                <span className="ph" style={{ ["--phc" as string]: mc(customMus) }}>
                  +
                </span>
              </div>
              <div className="pmeta">
                <div className="nm">Add “{query.trim()}”</div>
                <div style={{ marginTop: 4 }}>
                  <span className="chip">custom · {customMus}</span>
                </div>
              </div>
              <button className="pickadd" onClick={() => addCustomExercise(dayId, query.trim(), customMus)}>
                + Add
              </button>
            </div>
          )}
          {items.map((e) => {
            const inDay = existing.has(e.name);
            return (
              <div key={e.name} className={`pickrow${inDay ? " added" : ""}`}>
                <Thumb ex={e} small how />
                <div className="pmeta">
                  <div className="nm">{e.name}</div>
                  <div style={{ marginTop: 4 }}>
                    <Chip muscle={e.muscle} />
                  </div>
                </div>
                <button className="phow" onClick={() => openExercise(e.name)} aria-label={`how to do ${e.name}`}>
                  <Icon name="book" />
                </button>
                {inDay ? (
                  <button
                    className="pickadd rm"
                    onClick={() => removeExerciseFromDay(dayId, e.name)}
                    aria-label={`remove ${e.name}`}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    className="pickadd"
                    onClick={() => addExerciseToDay(dayId, { name: e.name, muscle: e.muscle })}
                  >
                    + Add
                  </button>
                )}
              </div>
            );
          })}
          {!items.length && !(q && !exact) && (
            <div className="empty">No matches. Type a name to add it as a custom exercise.</div>
          )}
        </div>
      </div>
    </div>
  );
}
