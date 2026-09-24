"use client";

// Program view - the active workout program (Program Builder).
// A header shows the current program name and opens a switcher sheet to create programs
// from templates, start blank, rename, delete, or switch between saved programs.
// The day list renders the active program's days (or the default PLAN as a SAFE FALLBACK),
// each a collapsible card whose rows resolve through the live added/removed/order edits.
import { useState } from "react";
import { useStore } from "@/lib/store";
import { todayISO, weekdayIndex } from "@/lib/dates";
import { dayById, dayExercises, activeDays } from "@/lib/day";
import { type PlanDay, type PlanExercise } from "@/data/plan";
import { TEMPLATES } from "@/data/templates";
import { mc, withA } from "@/data/muscles";
import { Thumb } from "@/components/exercise/Thumb";
import { useExerciseModal } from "@/components/exercise/ExerciseModalProvider";
import { usePicker } from "@/components/PickerProvider";
import { Sheet } from "@/components/Sheet";
import { useConfirm, usePrompt } from "@/components/ConfirmProvider";
import { ShareButton } from "@/components/ShareButton";
import { now } from "@/lib/ids";
import { Icon } from "@/data/icons";

function MiniEx({ ex, dayId }: { ex: PlanExercise; dayId: string }) {
  const { openExercise } = useExerciseModal();
  const reorderExercise = useStore((s) => s.reorderExercise);
  const removeExerciseFromDay = useStore((s) => s.removeExerciseFromDay);
  return (
    <div className="miniex">
      <Thumb ex={ex} small how />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="nm">{ex.name}</div>
        <div className="sr">
          {ex.sets} × {ex.reps}
        </div>
      </div>
      <button className="btn sm ghost how" onClick={() => openExercise(ex.name)}>
        <Icon name="book" />
        &nbsp;How
      </button>
      <div className="reord">
        <button className="rbtn" onClick={() => reorderExercise(dayId, ex.name, -1)} aria-label={`move ${ex.name} up`}>
          <Icon name="up" />
        </button>
        <button className="rbtn" onClick={() => reorderExercise(dayId, ex.name, 1)} aria-label={`move ${ex.name} down`}>
          <Icon name="down" />
        </button>
      </div>
      <button className="delbtn" onClick={() => removeExerciseFromDay(dayId, ex.name)} aria-label={`remove ${ex.name}`}>
        <Icon name="trash" />
      </button>
    </div>
  );
}

function DayCard({ day, index, isToday, days }: { day: PlanDay; index: number; isToday: boolean; days: PlanDay[] }) {
  const added = useStore((s) => s.added);
  const removed = useStore((s) => s.removed);
  const order = useStore((s) => s.order);
  const custom = useStore((s) => s.custom);
  const { openPicker } = usePicker();
  const [open, setOpen] = useState(isToday);

  const resolved = dayById(day.id, custom, todayISO(), days) || day;
  const exs = dayExercises(resolved, added, removed, order);
  const col = mc(day.ex[0]?.muscle ?? "Core");

  return (
    <div className={`day${open ? " open" : ""}`}>
      <div className="dh" onClick={() => setOpen((o) => !o)}>
        <div
          className="idx cond"
          style={{ color: col, borderColor: withA(col, 0.5), background: withA(col, 0.1) }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm cond">
            {day.name}{" "}
            {isToday && (
              <span className="chip" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
                Today
              </span>
            )}
          </div>
          <div className="fc">
            {day.label} · {day.focus}
          </div>
        </div>
        <span className="caret" style={{ color: "var(--dim)" }}>
          <Icon name="caret" />
        </span>
      </div>
      <div className="body">
        {exs.map((ex) => (
          <MiniEx key={ex.name} ex={ex} dayId={day.id} />
        ))}
        <button
          className="btn ghost"
          onClick={() => openPicker(day.id)}
          style={{ width: "100%", marginTop: 10 }}
        >
          + Add / change exercises
        </button>
      </div>
    </div>
  );
}

/* ---- program switcher sheet (Program Builder) ---- */
function ProgramSheet({ onClose }: { onClose: () => void }) {
  const programs = useStore((s) => s.programs);
  const activeProgramId = useStore((s) => s.activeProgramId);
  const setActiveProgram = useStore((s) => s.setActiveProgram);
  const createProgramFromTemplate = useStore((s) => s.createProgramFromTemplate);
  const createBlankProgram = useStore((s) => s.createBlankProgram);
  const saveActiveAsProgram = useStore((s) => s.saveActiveAsProgram);
  const renameProgram = useStore((s) => s.renameProgram);
  const deleteProgram = useStore((s) => s.deleteProgram);
  const confirm = useConfirm();
  const prompt = usePrompt();

  const [mode, setMode] = useState<"main" | "template">("main");
  const list = Object.values(programs).sort((a, b) => b.updatedAt - a.updatedAt);
  const active = activeProgramId ? programs[activeProgramId] : undefined;

  const doRename = async (id: string, current: string) => {
    const next = await prompt({
      title: "Rename program",
      label: "Program name",
      defaultValue: current,
    });
    if (next != null && next.trim()) renameProgram(id, next);
  };
  const doDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Delete program?",
      message: `"${name}" and its days will be permanently deleted. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) deleteProgram(id);
  };
  const doBlank = async () => {
    const name = await prompt({
      title: "Name your program",
      label: "Program name",
      defaultValue: "New Program",
    });
    if (name != null && name.trim()) {
      createBlankProgram(name);
      onClose();
    }
  };

  if (mode === "template") {
    return (
      <Sheet title="New from template" hint="Pick a split - it's copied in so you can customize it freely." onClose={onClose}>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            className="pickrow"
            onClick={() => {
              createProgramFromTemplate(t.id);
              onClose();
            }}
          >
            <div className="pmeta">
              <div className="nm">{t.name}</div>
              <div style={{ marginTop: 3, fontSize: 12, color: "var(--dim)" }}>
                {t.days.length} days · {t.description}
              </div>
            </div>
            <span className="pickadd">Use</span>
          </button>
        ))}
        <button className="btn ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => setMode("main")}>
          ← Back
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Programs" hint="Switch between your programs, or build a new one." onClose={onClose}>
      {list.length === 0 && (
        <p className="shint" style={{ margin: "2px 0 12px" }}>
          You&apos;re on the default split. Save it as your own program to start customizing.
        </p>
      )}
      {list.map((p) => {
        const isActive = p.id === activeProgramId;
        return (
          <div key={p.id} className={`prow${isActive ? " active" : ""}`}>
            <button
              className="prow-main"
              onClick={() => {
                setActiveProgram(p.id);
                onClose();
              }}
            >
              <div className="pmeta">
                <div className="nm">
                  {p.name}{" "}
                  {isActive && (
                    <span className="chip" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
                      Active
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 3, fontSize: 12, color: "var(--dim)" }}>{p.days.length} days</div>
              </div>
            </button>
            <button
              className="btn sm ghost"
              onClick={() => doRename(p.id, p.name)}
              aria-label={`rename ${p.name}`}
            >
              Rename
            </button>
            <button className="delbtn" onClick={() => doDelete(p.id, p.name)} aria-label={`delete ${p.name}`}>
              <Icon name="trash" />
            </button>
          </div>
        );
      })}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        <button className="btn primary" style={{ width: "100%" }} onClick={() => setMode("template")}>
          + New from template
        </button>
        <button className="btn ghost" style={{ width: "100%" }} onClick={doBlank}>
          + New blank program
        </button>
        {!active && (
          <button
            className="btn ghost"
            style={{ width: "100%" }}
            onClick={() => {
              saveActiveAsProgram("My Program");
              onClose();
            }}
          >
            Save current split as my program
          </button>
        )}
      </div>
    </Sheet>
  );
}

export default function ProgramPage() {
  const programs = useStore((s) => s.programs);
  const activeProgramId = useStore((s) => s.activeProgramId);
  const [sheetOpen, setSheetOpen] = useState(false);

  const days = activeDays({ programs, activeProgramId });
  const active = activeProgramId ? programs[activeProgramId] : undefined;
  const title = active ? active.name : "Default Split";
  const tIdx = weekdayIndex();

  return (
    <main>
      <div className="section-h">
        <h2>Program</h2>
        <span className="sub">{days.length} training days</span>
      </div>
      <section className="panel progbar">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="dname cond">{title}</div>
          <div className="fc">{active ? "Your program" : "Built-in - save it to customize"}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ShareButton
            kind="program"
            getPayload={() => ({
              title,
              data: active ?? { id: "default", name: title, days, updatedAt: now() },
            })}
          />
          <button className="btn sm ghost" onClick={() => setSheetOpen(true)}>
            <Icon name="program" />
            &nbsp;Switch
          </button>
        </div>
      </section>

      <div className="days" style={{ marginTop: 14 }}>
        {days.map((d, i) => (
          <DayCard key={d.id} day={d} index={i} isToday={i === tIdx} days={days} />
        ))}
      </div>
      {days.length === 0 ? (
        <p className="empty">No days yet - add exercises, or switch to a template.</p>
      ) : (
        <p className="empty">Days beyond your split are rest days.</p>
      )}

      {sheetOpen && <ProgramSheet onClose={() => setSheetOpen(false)} />}
    </main>
  );
}
