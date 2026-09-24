"use client";

// Home dashboard - the app's landing page. A read-only overview that pulls live
// from the store and links out to the working views (Train / Nutrition / Progress /
// Library). Every card degrades to a friendly first-run prompt when its data is empty.
import Link from "next/link";
import { useStore } from "@/lib/store";
import { todayISO, addDays, weekdayIndex } from "@/lib/dates";
import { activeDays, plannedForToday, dayExercises, logFor, exDone } from "@/lib/day";
import { dayTotals } from "@/lib/macros";
import { streak } from "@/lib/streak";
import { volumeWeeks } from "@/lib/progress";
import { fmtMass, massToDisplay, massLabel, type MassUnit } from "@/lib/units";
import { Ring } from "@/components/exercise/Ring";
import { Sparkline } from "@/components/Sparkline";
import { Chip } from "@/components/exercise/Chip";
import { Icon } from "@/data/icons";

const shortDate = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default function DashboardPage() {
  const profile = useStore((s) => s.profile);
  const body = useStore((s) => s.body);
  const sessions = useStore((s) => s.sessions);
  const diary = useStore((s) => s.diary);
  const goals = useStore((s) => s.goals);
  const logged = useStore((s) => s.logged);
  const custom = useStore((s) => s.custom);
  const added = useStore((s) => s.added);
  const removed = useStore((s) => s.removed);
  const order = useStore((s) => s.order);
  const programs = useStore((s) => s.programs);
  const activeProgramId = useStore((s) => s.activeProgramId);

  const date = todayISO();
  const unit: MassUnit = profile?.units.mass ?? "kg";
  const firstName = (profile?.name || "").trim().split(/\s+/)[0] || "there";
  const prettyToday = new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  // ---- Today's workout ----
  const days = activeDays({ programs, activeProgramId });
  const plan = custom[date] || plannedForToday(new Date(), days);
  let wTotal = 0;
  let wDone = 0;
  if (plan) {
    for (const e of dayExercises(plan, added, removed, order)) {
      const a = logFor(logged, date, e.name, e.sets);
      wTotal += a.length;
      wDone += exDone(a);
    }
  }
  const wPct = wTotal ? (wDone / wTotal) * 100 : 0;
  const started = wDone > 0;

  // ---- Nutrition today ----
  const totals = dayTotals(diary[date]?.meals ?? []);
  const T = { kcal: goals.kcal, p: goals.p, c: goals.c, f: goals.f };
  const kpct = T.kcal ? Math.min(100, Math.round((totals.kcal / T.kcal) * 100)) : 0;
  const ateAnything = (diary[date]?.meals ?? []).some((m) => m.items.length > 0);

  // ---- Bodyweight ----
  const wHist = [...body.history].sort((a, b) => a.date.localeCompare(b.date));
  const hasTrend = wHist.length >= 2;
  const trendPts = wHist.slice(-30).map((p) => ({ kg: massToDisplay(p.kg, unit) }));
  const strk = streak(sessions, date);

  // ---- This week ----
  const startOfWeek = addDays(date, -weekdayIndex(new Date(date + "T12:00:00")));
  const weekSessions = sessions.filter((s) => s.date >= startOfWeek);
  const weekVol = volumeWeeks(sessions, date).at(-1) ?? 0;

  // ---- Recent activity ----
  const recent = sessions.slice(0, 5);

  return (
    <main>
      <div className="home-hi">
        <div className="eyebrow upper">{prettyToday}</div>
        <h1 className="home-greet cond">Hi {firstName}</h1>
      </div>

      <div className="dash">
        {/* --- Today's workout --- */}
        <div className="dashcard">
          <div className="section-h">
            <h2>Today&apos;s workout</h2>
            <span className="sub">{plan ? (started ? "in progress" : "ready") : "rest day"}</span>
          </div>
          <section className="panel home-card">
            {plan ? (
              <>
                <div className="home-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="home-title cond">{plan.name}</div>
                    <div className="home-focus">{plan.focus}</div>
                    <div className="home-meta">
                      {wDone}/{wTotal} sets done
                    </div>
                  </div>
                  <Ring pct={wPct} />
                </div>
                {plan.tags.length > 0 && (
                  <div className="home-chips">
                    {plan.tags.map((t) => (
                      <Chip key={t} muscle={t} />
                    ))}
                  </div>
                )}
                <Link href="/train" className="btn primary home-cta">
                  <Icon name="train" /> {started ? "Resume workout" : "Start workout"}
                </Link>
              </>
            ) : (
              <>
                <div className="home-title cond">Rest day</div>
                <div className="home-focus">
                  No lifting scheduled. Walk, stretch, eat and sleep - muscle is built while you recover.
                </div>
                <Link href="/train" className="btn ghost home-cta">
                  <Icon name="plus" /> Start a workout anyway
                </Link>
              </>
            )}
          </section>
        </div>

        {/* --- Nutrition today --- */}
        <div className="dashcard">
          <div className="section-h">
            <h2>Nutrition</h2>
            <span className="sub">today</span>
          </div>
          <section className="panel home-card">
            <div className="rollup" style={{ padding: 0, margin: 0 }}>
              <Ring pct={kpct} />
              <div className="rollup-macros">
                <div className="rollup-kcal cond">
                  <b>{totals.kcal}</b> <span>/ {T.kcal} kcal</span>
                </div>
                <MacroBar label="Protein" cls="p" val={totals.p} target={T.p} />
                <MacroBar label="Carbs" cls="c" val={totals.c} target={T.c} />
                <MacroBar label="Fat" cls="f" val={totals.f} target={T.f} />
              </div>
            </div>
            {!ateAnything && <div className="home-focus" style={{ marginTop: 10 }}>Nothing logged yet today.</div>}
            <Link href="/nutrition" className="btn ghost home-cta">
              <Icon name="plus" /> Add food
            </Link>
          </section>
        </div>

        {/* --- Bodyweight --- */}
        <div className="dashcard">
          <div className="section-h">
            <h2>Bodyweight</h2>
            {strk > 0 && (
              <span className="sub">
                <Icon name="flame" /> {strk}-day streak
              </span>
            )}
          </div>
          <section className="panel home-card">
            <div className="home-row">
              <div className="home-bw cond">
                {fmtMass(body.bw, unit)}
                <small> {massLabel(unit)}</small>
              </div>
              <div className="home-stat">
                <b className="cond" style={{ color: strk ? "var(--gold)" : "var(--dim)" }}>{strk}</b>
                <span>day streak</span>
              </div>
            </div>
            {hasTrend ? (
              <Sparkline pts={trendPts} />
            ) : (
              <div className="home-focus" style={{ marginTop: 6 }}>Log your weight over a few days to see your trend.</div>
            )}
            <Link href="/progress" className="btn ghost home-cta">
              <Icon name="up" /> Log weight
            </Link>
          </section>
        </div>

        {/* --- This week --- */}
        <div className="dashcard">
          <div className="section-h">
            <h2>This week</h2>
            <span className="sub">since Monday</span>
          </div>
          <section className="panel home-card">
            <div className="stat">
              <div className="macro">
                <b className="cond">{weekSessions.length}</b>
                <span>sessions</span>
              </div>
              <div className="macro">
                <b className="cond">{Math.round(weekVol).toLocaleString()}</b>
                <span>volume</span>
              </div>
            </div>
            {weekSessions.length === 0 && (
              <div className="home-focus" style={{ marginTop: 10 }}>No sessions logged this week yet.</div>
            )}
          </section>
        </div>

        {/* --- Recent activity --- */}
        <div className="dashcard wide">
          <div className="section-h">
            <h2>Recent activity</h2>
            {recent.length > 0 && (
              <Link href="/progress" className="sub" style={{ color: "var(--accent)" }}>
                View all
              </Link>
            )}
          </div>
          <section className="panel" style={{ padding: "6px 16px" }}>
            {recent.length ? (
              recent.map((h) => (
                <div className="histrow" key={h.id}>
                  <div className="hd" style={{ color: "var(--accent)" }}>{shortDate(h.date)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{h.name}</div>
                    <div style={{ fontSize: 12, color: "var(--dim)" }}>
                      {h.sets} sets{h.vol ? " · " + Math.round(h.vol).toLocaleString() + " vol" : ""}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty sm">
                Finish a workout to see it here. <Link href="/train" style={{ color: "var(--accent)" }}>Start training</Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function MacroBar({ label, cls, val, target }: { label: string; cls: "p" | "c" | "f"; val: number; target: number }) {
  const pct = target ? Math.min(100, Math.round((val / target) * 100)) : 0;
  return (
    <div className="macrobar">
      <div className="macrobar-top">
        <span className="macrobar-lbl">{label}</span>
        <span className="macrobar-val cond">{val} / {target} g</span>
      </div>
      <div className="macrobar-track">
        <i className={"macrobar-fill " + cls} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
