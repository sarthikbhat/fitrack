"use client";

// Train view — core workout logging. Ports legacy renderTrain (1679-1728),
// exCard (1650-1678), setRow (1639-1649) and cueRow/cueList (1739-1745).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useRest } from "@/lib/rest";
import { todayISO } from "@/lib/dates";
import { plannedForToday, dayExercises, logFor, exDone, activeDays } from "@/lib/day";
import { lastEntry, exStats, type Logged } from "@/lib/exStats";
import { Ring } from "@/components/exercise/Ring";
import { Thumb } from "@/components/exercise/Thumb";
import { Chip } from "@/components/exercise/Chip";
import { Icon } from "@/data/icons";
import { WARMUP, COOLDOWN } from "@/data/cues";
import { mc, withA } from "@/data/muscles";
import { getEx } from "@/lib/exdb";
import { massLabel, type MassUnit } from "@/lib/units";
import { useExerciseModal } from "@/components/exercise/ExerciseModalProvider";
import { usePicker } from "@/components/PickerProvider";
import { useSwitch } from "@/components/SwitchProvider";
import type { PlanDay, PlanExercise } from "@/data/plan";

/* ---- warm-up / cool-down cue row (legacy:1739-1745) ---- */
function CueRow({ line }: { line: string }) {
  const { openExercise } = useExerciseModal();
  const name = line.split(/[—–-]|\(/)[0].trim();
  const e = getEx(name);
  const rest = line.slice(name.length);
  return (
    <div className="cue">
      {e ? <Thumb ex={{ name, muscle: "" }} small /> : <span className="cuedot" />}
      <div className="ct">
        {e ? (
          <>
            <a role="button" tabIndex={0} onClick={() => openExercise(name)} style={{ cursor: "pointer" }}>
              {name}
            </a>
            {rest}
          </>
        ) : (
          line
        )}
      </div>
    </div>
  );
}
function CueList({ cues }: { cues: string[] }) {
  return (
    <div className="cues">
      {cues.map((c) => (
        <CueRow key={c} line={c} />
      ))}
    </div>
  );
}

/* ---- single set row (legacy:1639-1649) ---- */
function SetRow({
  ex,
  i,
  date,
  unit,
  last,
}: {
  ex: PlanExercise;
  i: number;
  date: string;
  unit: MassUnit;
  last: ReturnType<typeof lastEntry>;
}) {
  const logged = useStore((s) => s.logged);
  const settings = useStore((s) => s.settings);
  const setLoggedSet = useStore((s) => s.setLoggedSet);
  const toggleSetDone = useStore((s) => s.toggleSetDone);
  const delSet = useStore((s) => s.delSet);
  const restStart = useRest((s) => s.start);

  const s = logFor(logged, date, ex.name, ex.sets)[i];
  if (!s) return null;
  const lw = last && last[i] && last[i].w ? last[i].w : ex.start || "";
  const lr = last && last[i] && last[i].r ? last[i].r : ex.reps;

  return (
    <div className={`setrow${s.done ? " done" : ""}`} data-row={i}>
      <div className="sn">{i + 1}</div>
      <input
        className="cell"
        inputMode="decimal"
        value={s.w}
        placeholder={String(lw || "–")}
        aria-label={`weight ${massLabel(unit)}`}
        onChange={(e) => setLoggedSet(date, ex.name, i, "w", e.target.value, ex.sets)}
      />
      <input
        className="cell"
        inputMode="numeric"
        value={s.r}
        placeholder={String(lr)}
        aria-label="reps"
        onChange={(e) => setLoggedSet(date, ex.name, i, "r", e.target.value, ex.sets)}
      />
      <button
        className="tick"
        aria-label="mark set done"
        onClick={() => {
          const willBeDone = !s.done;
          toggleSetDone(date, ex.name, i, ex.sets);
          if (willBeDone && settings.autoRest) restStart(settings.rest);
        }}
      >
        <Icon name="check" />
      </button>
      <button className="setdel" aria-label="remove set" onClick={() => delSet(date, ex.name, i, ex.sets)}>
        <Icon name="close" />
      </button>
    </div>
  );
}

/* ---- collapsible exercise card (legacy:1650-1678) ---- */
function ExCard({
  ex,
  date,
  unit,
  open,
  onToggle,
}: {
  ex: PlanExercise;
  date: string;
  unit: MassUnit;
  open: boolean;
  onToggle: () => void;
}) {
  const logged = useStore((s) => s.logged);
  const addSet = useStore((s) => s.addSet);

  const arr = logFor(logged, date, ex.name, ex.sets);
  const done = exDone(arr);
  const ns = arr.length;
  const last = lastEntry(logged as Logged, ex.name);
  const st = exStats(logged as Logged, ex.name);

  return (
    <div className={`ex${open ? " open" : ""}${done === ns && ns ? " done-all" : ""}`} data-card={ex.name}>
      <div className="head" onClick={onToggle}>
        <Thumb ex={ex} how />
        <div className="meta">
          <div className="nm">{ex.name}</div>
          <div className="sub">
            <Chip muscle={ex.muscle} />
            <span className="sr">
              {ns} × {ex.reps}
            </span>
            {st && <span className="pr">PR {st.bestTxt}</span>}
          </div>
          <div className="prog">
            {arr.map((s, i) => (
              <i key={i} className={s.done ? "on" : ""} />
            ))}
          </div>
        </div>
        <span className="caret">
          <Icon name="caret" />
        </span>
      </div>
      {open && (
        <div className="log">
          <div className="colh">
            <div>SET</div>
            <div>{massLabel(unit).toUpperCase()}</div>
            <div>REPS</div>
            <div></div>
            <div></div>
          </div>
          {arr.map((_, i) => (
            <SetRow key={i} ex={ex} i={i} date={date} unit={unit} last={last} />
          ))}
          <button className="btn sm ghost addset" onClick={() => addSet(date, ex.name, ex.sets)}>
            <Icon name="plus" />
            &nbsp;Add set
          </button>
        </div>
      )}
    </div>
  );
}

export default function TrainPage() {
  const router = useRouter();
  const logged = useStore((s) => s.logged);
  const notes = useStore((s) => s.notes);
  const custom = useStore((s) => s.custom);
  const added = useStore((s) => s.added);
  const removed = useStore((s) => s.removed);
  const order = useStore((s) => s.order);
  const programs = useStore((s) => s.programs);
  const activeProgramId = useStore((s) => s.activeProgramId);
  const profile = useStore((s) => s.profile);
  const setNote = useStore((s) => s.setNote);
  const finishSession = useStore((s) => s.finishSession);
  const discardDay = useStore((s) => s.discardDay);
  const { openPicker } = usePicker();
  const { openSwitch } = useSwitch();

  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const toggleCard = (name: string) => setOpenCards((o) => ({ ...o, [name]: !o[name] }));

  const date = todayISO();
  const unit: MassUnit = profile?.units.mass ?? "kg";
  const wd = new Date().toLocaleDateString("en-GB", { weekday: "long" });
  // Today's plan comes from the active program's days (or PLAN as the SAFE FALLBACK);
  // a per-date custom "switch workout" still overrides.
  const days = activeDays({ programs, activeProgramId });
  const plan: PlanDay | null = custom[date] || plannedForToday(new Date(), days);

  /* ---- rest day / no plan ---- */
  if (!plan) {
    return (
      <main>
        <section className="panel today" style={{ ["--dayhue" as string]: withA(mc("Core"), 0.18) }}>
          <div className="eyebrow upper">{wd} · Recovery</div>
          <div className="dname" style={{ marginTop: 6 }}>
            Rest Day
          </div>
          <div className="focus">
            No lifting today. Walk, stretch, eat, sleep. Muscle is built while you recover.
          </div>
        </section>
        <div style={{ margin: "14px 2px" }}>
          <button className="btn ghost" style={{ width: "100%" }} onClick={openSwitch}>
            + Start a workout anyway
          </button>
        </div>
        <div className="section-h">
          <h2>Mobility</h2>
        </div>
        <section className="panel" style={{ padding: "6px 16px" }}>
          <CueList cues={COOLDOWN} />
        </section>
      </main>
    );
  }

  /* ---- training day ---- */
  const exs = dayExercises(plan, added, removed, order);
  let total = 0;
  let done = 0;
  exs.forEach((e) => {
    const a = logFor(logged, date, e.name, e.sets);
    total += a.length;
    done += exDone(a);
  });
  const pct = total ? (done / total) * 100 : 0;
  const first = exs[0] || plan.ex[0];
  const hue = withA(mc(first ? first.muscle : "Chest"), 0.22);

  const onFinish = () => {
    finishSession(date, plan.name, exs);
    router.push("/progress");
  };
  const onDiscard = () => {
    if (window.confirm("Discard today's sets for this workout?")) {
      discardDay(date, exs.map((e) => e.name));
      setOpenCards({});
    }
  };

  return (
    <main>
      <section className="panel today" style={{ ["--dayhue" as string]: hue }}>
        <div className="row1">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow upper">
              {wd} · {plan.label}
            </div>
            <div className="dname cond">{plan.name}</div>
            <div className="focus">{plan.focus}</div>
          </div>
          <Ring pct={pct} />
        </div>
        {plan.tags.length > 0 && (
          <div className="chips">
            {plan.tags.map((t) => (
              <Chip key={t} muscle={t} />
            ))}
          </div>
        )}
        <button className="btn sm ghost" style={{ marginTop: 13 }} onClick={openSwitch}>
          ⇄ Switch workout
        </button>
      </section>

      <div className="section-h">
        <h2>Warm-up</h2>
        <span className="sub">5–8 min</span>
      </div>
      <section className="panel" style={{ padding: "6px 16px" }}>
        <CueList cues={WARMUP} />
      </section>

      <div className="section-h">
        <h2>Session</h2>
        <span className="sub">
          {done}/{total} sets
        </span>
      </div>
      <div className="exlist">
        {exs.length ? (
          exs.map((e) => (
            <ExCard
              key={e.name}
              ex={e}
              date={date}
              unit={unit}
              open={!!openCards[e.name]}
              onToggle={() => toggleCard(e.name)}
            />
          ))
        ) : (
          <div className="empty">No exercises yet — add some below to start logging.</div>
        )}
      </div>
      <button className="btn ghost addex" style={{ width: "100%", marginTop: 10 }} onClick={() => openPicker(plan.id)}>
        + Add exercise
      </button>

      <div className="section-h">
        <h2>Notes</h2>
        <span className="sub">today</span>
      </div>
      <textarea
        className="notes"
        placeholder="How did it feel? Anything to remember next time…"
        value={notes[date] || ""}
        onChange={(e) => setNote(date, e.target.value)}
      />

      <div style={{ margin: "18px 2px", display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn primary" style={{ width: "100%" }} onClick={onFinish}>
          Finish &amp; log session
        </button>
        <button
          className="btn ghost"
          style={{ width: "100%", color: "var(--danger)", borderColor: "var(--line2)" }}
          onClick={onDiscard}
        >
          Discard today&apos;s sets
        </button>
      </div>

      <div className="section-h">
        <h2>Cooldown</h2>
      </div>
      <section className="panel" style={{ padding: "6px 16px" }}>
        <CueList cues={COOLDOWN} />
      </section>
    </main>
  );
}
