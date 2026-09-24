"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { todayISO } from "@/lib/dates";
import { massToDisplay, massFromDisplay, fmtMass, massLabel, type MassUnit } from "@/lib/units";
import { bmi, bmiTag, cmToFtIn } from "@/lib/progress";
import { streak } from "@/lib/streak";
import { Sparkline } from "@/components/Sparkline";
import { Heatmap } from "@/components/Heatmap";
import { VolumeChart } from "@/components/VolumeChart";
import { Icon } from "@/data/icons";
import { useConfirm } from "@/components/ConfirmProvider";

const round2 = (n: number) => Math.round(n * 100) / 100;
const shortDate = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default function ProgressPage() {
  const body = useStore((s) => s.body);
  const sessions = useStore((s) => s.sessions);
  const notes = useStore((s) => s.notes);
  const heightCm = useStore((s) => s.profile?.heightCm ?? 170);
  const unit = useStore((s) => (s.profile?.units.mass ?? "kg") as MassUnit);
  const setBw = useStore((s) => s.setBw);
  const setGoal = useStore((s) => s.setGoal);
  const setStartWeight = useStore((s) => s.setStartWeight);
  const setHeight = useStore((s) => s.setHeight);
  const deleteSession = useStore((s) => s.deleteSession);
  const confirm = useConfirm();

  const u = massLabel(unit);
  const today = todayISO();

  const bwKg = body.bw;
  const startKg = body.startWeight;
  const goalKg = body.goalWeight;

  const bw = massToDisplay(bwKg, unit);
  const start = massToDisplay(startKg, unit);
  const goal = massToDisplay(goalKg, unit);
  const cut = goal < start;
  const denom = goal - start || 1;
  const pct = Math.max(0, Math.min(100, ((bw - start) / denom) * 100));
  const moved = bw - start;
  const remain = goal - bw;
  const reached = cut ? bw <= goal : bw >= goal;
  const leftTxt =
    Math.abs(moved) < 0.05
      ? "start " + start.toFixed(1) + " " + u
      : cut
        ? moved < 0
          ? Math.abs(moved).toFixed(1) + " " + u + " lost"
          : "+" + moved.toFixed(1) + " " + u
        : moved > 0
          ? "+" + moved.toFixed(1) + " " + u + " gained"
          : moved.toFixed(1) + " " + u;
  const rightTxt = reached
    ? "goal reached"
    : Math.abs(remain).toFixed(1) + " " + u + (cut ? " to lose" : " to go");

  const bmiVal = bmi(bwKg, heightCm);
  const [btag, bcol] = bmiTag(bmiVal);
  const strk = streak(sessions, today);
  const hist = sessions.slice(0, 20);

  // Bodyweight trend: history is stored sorted by date, but sort defensively.
  const wHist = [...body.history].sort((a, b) => a.date.localeCompare(b.date));
  const hasTrend = wHist.length >= 2;
  const trendPts = wHist.slice(-30).map((p) => ({ kg: massToDisplay(p.kg, unit) }));
  let deltaTxt: string | null = null;
  let deltaTowardGoal = false;
  if (hasTrend) {
    const prev = massToDisplay(wHist[wHist.length - 2].kg, unit);
    const last = massToDisplay(wHist[wHist.length - 1].kg, unit);
    const d = last - prev;
    if (Math.abs(d) >= 0.05) {
      deltaTxt = `${d > 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1)} ${u} vs last entry`;
      deltaTowardGoal = cut ? d < 0 : d > 0;
    }
  }

  // Local editable strings, resynced when the stored value or unit changes.
  // Uses the React "adjust state during render" pattern (a signature guard) rather than
  // effects, so store-driven changes reflect without cascading set-state-in-effect renders.
  const [bwStr, setBwStr] = useState(fmtMass(bwKg, unit));
  const [startStr, setStartStr] = useState(fmtMass(startKg, unit));
  const [goalStr, setGoalStr] = useState(fmtMass(goalKg, unit));
  const [heightStr, setHeightStr] = useState(String(Math.round(heightCm)));
  const sig = `${bwKg}|${startKg}|${goalKg}|${heightCm}|${unit}`;
  const [prevSig, setPrevSig] = useState(sig);
  if (prevSig !== sig) {
    setPrevSig(sig);
    setBwStr(fmtMass(bwKg, unit));
    setStartStr(fmtMass(startKg, unit));
    setGoalStr(fmtMass(goalKg, unit));
    setHeightStr(String(Math.round(heightCm)));
  }

  const commitBw = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return setBwStr(fmtMass(bwKg, unit));
    setBw(round2(massFromDisplay(n, unit)));
  };
  const commitStart = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return setStartStr(fmtMass(startKg, unit));
    setStartWeight(round2(massFromDisplay(n, unit)));
  };
  const commitGoal = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return setGoalStr(fmtMass(goalKg, unit));
    setGoal(round2(massFromDisplay(n, unit)));
  };
  const commitHeight = (v: string) => {
    const n = parseInt(v, 10);
    if (isNaN(n)) return setHeightStr(String(Math.round(heightCm)));
    setHeight(Math.round(n));
  };
  const adjustBw = (d: number) => setBw(round2(massFromDisplay(bw + d, unit)));
  const adjustStart = (d: number) => setStartWeight(round2(massFromDisplay(start + d, unit)));
  const adjustGoal = (d: number) => setGoal(round2(massFromDisplay(goal + d, unit)));
  const adjustHeight = (d: number) => setHeight(Math.round(heightCm) + d);

  return (
    <main>
      <div className="dash">
      <div className="dashcard wide">
      <div className="section-h">
        <h2>Bodyweight</h2>
        <span className="sub">{cut ? "cut" : "bulk"} target</span>
      </div>
      <section className="panel bwbox">
        <div className="big cond">
          {fmtMass(bwKg, unit)}
          <small> {u}</small>
        </div>
        <div className="bwlog-lbl">Log today&apos;s weight</div>
        <div className="bwlog-hint">Adjust below - it records today&apos;s entry and builds your trend.</div>
        <div className="bwedit">
          <button className="btn sm" onClick={() => adjustBw(-0.1)} aria-label="lower weight">–</button>
          <input
            className="cell"
            inputMode="decimal"
            value={bwStr}
            onChange={(e) => setBwStr(e.target.value)}
            onBlur={(e) => commitBw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="current weight"
          />
          <button className="btn sm" onClick={() => adjustBw(0.1)} aria-label="raise weight">+</button>
        </div>
        <div className="pbar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <div
          className="cond"
          style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--muted)" }}
        >
          <span>{leftTxt}</span>
          <span>{rightTxt}</span>
        </div>
        <div className="goalrow">
          <span className="goallbl">START WEIGHT</span>
          <button className="btn sm" onClick={() => adjustStart(-0.5)} aria-label="lower start weight">–</button>
          <input
            className="cell"
            inputMode="decimal"
            value={startStr}
            onChange={(e) => setStartStr(e.target.value)}
            onBlur={(e) => commitStart(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="start weight"
          />
          <button className="btn sm" onClick={() => adjustStart(0.5)} aria-label="raise start weight">+</button>
          <span className="chip" style={{ marginLeft: "auto" }}>baseline</span>
        </div>
        <div className="goalrow">
          <span className="goallbl">GOAL</span>
          <button className="btn sm" onClick={() => adjustGoal(-0.5)} aria-label="lower goal">–</button>
          <input
            className="cell"
            inputMode="decimal"
            value={goalStr}
            onChange={(e) => setGoalStr(e.target.value)}
            onBlur={(e) => commitGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="goal weight"
          />
          <button className="btn sm" onClick={() => adjustGoal(0.5)} aria-label="raise goal">+</button>
          <span
            className="chip"
            style={{
              marginLeft: "auto",
              color: cut ? "var(--gold)" : "var(--accent)",
              borderColor: cut ? "var(--gold)" : "var(--accent)",
            }}
          >
            {cut ? "Cut" : "Bulk"}
          </span>
        </div>
        <div className="goalrow">
          <span className="goallbl">HEIGHT</span>
          <button className="btn sm" onClick={() => adjustHeight(-1)} aria-label="lower height">–</button>
          <input
            className="cell"
            inputMode="numeric"
            value={heightStr}
            onChange={(e) => setHeightStr(e.target.value)}
            onBlur={(e) => commitHeight(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="height in cm"
          />
          <button className="btn sm" onClick={() => adjustHeight(1)} aria-label="raise height">+</button>
          <span className="chip" style={{ marginLeft: "auto" }}>
            {cmToFtIn(heightCm)} · {Math.round(heightCm)} cm
          </span>
        </div>
        <div className="wtrend">
          <div className="wtrend-h">
            <span className="wtrend-lbl">Weight trend</span>
            {deltaTxt && (
              <span
                className="wtrend-delta"
                style={{ color: deltaTowardGoal ? "var(--accent)" : "var(--muted)" }}
              >
                {deltaTxt}
              </span>
            )}
          </div>
          {hasTrend ? (
            <Sparkline pts={trendPts} />
          ) : (
            <div className="wtrend-hint">Log your weight over a few days to see your trend.</div>
          )}
        </div>
        <div className="stat" style={{ marginTop: 6, gridTemplateColumns: "repeat(3,1fr)" }}>
          <div className="macro">
            <b className="cond" style={{ color: strk ? "var(--gold)" : "var(--dim)" }}>{strk}</b>
            <span>day streak</span>
          </div>
          <div className="macro">
            <b className="cond" style={{ color: bcol }}>{bmiVal.toFixed(1)}</b>
            <span>BMI · {btag}</span>
          </div>
          <div className="macro">
            <b className="cond">{sessions.length}</b>
            <span>sessions</span>
          </div>
        </div>
      </section>
      </div>

      {sessions.length > 0 && (
        <div className="dash-secondary">
        <div className="dashcard">
          <div className="section-h">
            <h2>Consistency</h2>
            <span className="sub">
              {strk ? (
                <>
                  <Icon name="flame" /> {strk}-day streak
                </>
              ) : (
                "last 13 weeks"
              )}
            </span>
          </div>
          <section className="panel" style={{ padding: "14px 16px" }}>
            <Heatmap sessions={sessions} today={today} />
          </section>
        </div>

        {sessions.length >= 2 && (
        <div className="dashcard">
          <div className="section-h">
            <h2>Weekly volume</h2>
            <span className="sub">8 weeks</span>
          </div>
          <section className="panel" style={{ padding: "14px 16px" }}>
            <VolumeChart sessions={sessions} today={today} />
          </section>
        </div>
        )}
        </div>
      )}

      <div className="dashcard wide">
      <div className="section-h">
        <h2>Session log</h2>
        {hist.length > 0 && <span className="sub">tap 🗑 to delete</span>}
      </div>
      <section className="panel" style={{ padding: "6px 16px" }}>
        {hist.length ? (
          hist.map((h) => (
            <div className="histrow" key={h.id}>
              <div className="hd" style={{ color: "var(--accent)" }}>{shortDate(h.date)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{h.name}</div>
                <div style={{ fontSize: 12, color: "var(--dim)" }}>
                  {h.sets} sets{h.vol ? " · " + Math.round(h.vol).toLocaleString() + " vol" : ""}
                </div>
                {notes[h.date] && <div className="hnote">{notes[h.date]}</div>}
              </div>
              <button
                className="delbtn"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Delete session?",
                    message: `This removes "${h.name}" from ${shortDate(h.date)} and its logged sets. This can't be undone.`,
                    confirmLabel: "Delete",
                    danger: true,
                  });
                  if (ok) deleteSession(h.id);
                }}
                aria-label="delete session"
              >
                <Icon name="trash" />
              </button>
            </div>
          ))
        ) : (
          <div className="empty">
            Finish a session on the Train tab - your streak, heatmap, weekly volume and per-lift PRs build up here as
            you log.
          </div>
        )}
      </section>
      </div>
      </div>
    </main>
  );
}
