"use client";

// First-run onboarding wizard (NEW - no legacy equivalent). Shown full-screen by
// AppShell whenever profile === null. One focus per step, Back/Next, and a Skip that
// fills sensible defaults. On finish it calls completeOnboarding(), which seeds
// profile/body/goals and makes the app appear.
import { useState, type FormEvent } from "react";
import { useStore, type OnboardingData } from "@/lib/store";
import { Seg } from "@/components/Controls";
import { LB } from "@/lib/units";
import type { Units } from "@/lib/types";

const METRIC: Units = { mass: "kg", len: "cm", energy: "kcal" };
const IMPERIAL: Units = { mass: "lb", len: "ft", energy: "kcal" };

const ACTIVITY = [
  { v: "1", l: "Sedentary" },
  { v: "2", l: "Light" },
  { v: "3", l: "Moderate" },
  { v: "4", l: "Active" },
  { v: "5", l: "Athlete" },
] as const;

const GOALS = [
  { v: "cut", l: "Cut", d: "Lose fat" },
  { v: "maintain", l: "Maintain", d: "Stay put" },
  { v: "bulk", l: "Bulk", d: "Build muscle" },
] as const;

const CM_PER_IN = 2.54;
const round1 = (n: number) => Math.round(n * 10) / 10;

const DEFAULTS: OnboardingData = {
  name: "",
  sex: "male",
  age: 30,
  heightCm: 175,
  activity: 3,
  units: METRIC,
  bw: 75,
  goalWeight: 75,
  goalMode: "maintain",
};

export function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState(30);
  const [units, setUnits] = useState<Units>(METRIC);
  const [heightCm, setHeightCm] = useState(175);
  const [bwKg, setBwKg] = useState(75);
  const [goalKg, setGoalKg] = useState(75);
  const [activity, setActivity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [goalMode, setGoalMode] = useState<"cut" | "maintain" | "bulk">("maintain");

  const STEPS = 6;
  const imperial = units.mass === "lb";

  const finish = () =>
    completeOnboarding({ name, sex, age, heightCm, activity, units, bw: bwKg, goalWeight: goalKg, goalMode });

  const next = () => (step >= STEPS - 1 ? finish() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const skip = () => completeOnboarding(DEFAULTS);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    next();
  };

  // Mass display helpers (canonical kg <-> chosen unit).
  const massVal = (kg: number) => (imperial ? Math.round(kg * LB) : round1(kg));
  const massToKg = (v: number) => (imperial ? v / LB : v);

  // Imperial height as feet + inches derived from canonical cm.
  const totalIn = Math.round(heightCm / CM_PER_IN);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  const setFtIn = (f: number, i: number) => setHeightCm(round1((f * 12 + i) * CM_PER_IN));

  return (
    <div className="onb">
      <div className="onbcard panel">
        <div className="onbtop">
          <span className="brand">Fitrack</span>
          <div className="onbdots" aria-hidden>
            {Array.from({ length: STEPS }, (_, i) => (
              <i key={i} className={i <= step ? "on" : ""} />
            ))}
          </div>
        </div>

        <form className="onbbody" onSubmit={onSubmit}>
          {step === 0 && (
            <>
              <h2 className="onbh">Welcome to Fitrack</h2>
              <p className="onbsub">Your training and nutrition, tracked on this device. Let&apos;s set it up.</p>
              <label className="flbl">What should we call you?</label>
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                className="search"
                autoFocus
                value={name}
                placeholder="Your name"
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="onbh">A bit about you</h2>
              <p className="onbsub">This personalises your calorie and macro targets.</p>
              <label className="flbl">Sex</label>
              <Seg
                ariaLabel="Sex"
                value={sex}
                onChange={setSex}
                options={[
                  { v: "male", l: "Male" },
                  { v: "female", l: "Female" },
                ]}
              />
              <label className="flbl">Age</label>
              <input
                className="search"
                type="number"
                inputMode="numeric"
                min={13}
                max={100}
                value={Number.isFinite(age) ? age : ""}
                onChange={(e) => setAge(parseInt(e.target.value, 10))}
              />
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="onbh">Your measurements</h2>
              <p className="onbsub">Used to estimate targets and track progress.</p>
              <label className="flbl">Height</label>
              {imperial ? (
                <div className="onbrow">
                  <div className="onbfield">
                    <input
                      className="cell"
                      type="number"
                      inputMode="numeric"
                      aria-label="height feet"
                      value={ft}
                      onChange={(e) => setFtIn(parseInt(e.target.value, 10) || 0, inch)}
                    />
                    <span className="onbunit">ft</span>
                  </div>
                  <div className="onbfield">
                    <input
                      className="cell"
                      type="number"
                      inputMode="numeric"
                      aria-label="height inches"
                      value={inch}
                      onChange={(e) => setFtIn(ft, parseInt(e.target.value, 10) || 0)}
                    />
                    <span className="onbunit">in</span>
                  </div>
                </div>
              ) : (
                <div className="onbfield">
                  <input
                    className="cell"
                    type="number"
                    inputMode="numeric"
                    aria-label="height cm"
                    value={Math.round(heightCm)}
                    onChange={(e) => setHeightCm(parseInt(e.target.value, 10) || 0)}
                  />
                  <span className="onbunit">cm</span>
                </div>
              )}

              <label className="flbl">Current weight</label>
              <div className="onbfield">
                <input
                  className="cell"
                  type="number"
                  inputMode="decimal"
                  aria-label="current weight"
                  value={massVal(bwKg)}
                  onChange={(e) => setBwKg(massToKg(parseFloat(e.target.value) || 0))}
                />
                <span className="onbunit">{units.mass}</span>
              </div>

              <label className="flbl">Goal weight</label>
              <div className="onbfield">
                <input
                  className="cell"
                  type="number"
                  inputMode="decimal"
                  aria-label="goal weight"
                  value={massVal(goalKg)}
                  onChange={(e) => setGoalKg(massToKg(parseFloat(e.target.value) || 0))}
                />
                <span className="onbunit">{units.mass}</span>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="onbh">Units &amp; activity</h2>
              <p className="onbsub">Pick how you like your numbers, and how active you are.</p>
              <label className="flbl">Units</label>
              <Seg
                ariaLabel="Units"
                value={imperial ? "imperial" : "metric"}
                onChange={(v) => setUnits(v === "imperial" ? IMPERIAL : METRIC)}
                options={[
                  { v: "metric", l: "Metric (kg, cm)" },
                  { v: "imperial", l: "Imperial (lb, ft)" },
                ]}
              />
              <label className="flbl">Activity level</label>
              <Seg
                ariaLabel="Activity level"
                value={String(activity) as "1" | "2" | "3" | "4" | "5"}
                onChange={(v) => setActivity(Number(v) as 1 | 2 | 3 | 4 | 5)}
                options={ACTIVITY.map((a) => ({ v: a.v, l: a.l }))}
              />
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="onbh">What&apos;s your goal?</h2>
              <p className="onbsub">We&apos;ll set your calorie target to match.</p>
              <div className="onbgoals">
                {GOALS.map((g) => (
                  <button
                    key={g.v}
                    type="button"
                    className={`onbgoal${goalMode === g.v ? " on" : ""}`}
                    aria-pressed={goalMode === g.v}
                    onClick={() => setGoalMode(g.v)}
                  >
                    <span className="onbgoall">{g.l}</span>
                    <span className="onbgoald">{g.d}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="onbh">You&apos;re all set{name ? `, ${name}` : ""}</h2>
              <p className="onbsub">
                We&apos;ll build your targets from these details. You can change anything later in Settings.
              </p>
              <div className="onbsummary">
                <div>
                  <span>Goal</span>
                  <b>{GOALS.find((g) => g.v === goalMode)?.l}</b>
                </div>
                <div>
                  <span>Weight</span>
                  <b>
                    {massVal(bwKg)} → {massVal(goalKg)} {units.mass}
                  </b>
                </div>
                <div>
                  <span>Activity</span>
                  <b>{ACTIVITY.find((a) => a.v === String(activity))?.l}</b>
                </div>
              </div>
            </>
          )}

          <div className="onbnav">
            {step > 0 ? (
              <button type="button" className="btn ghost" onClick={back}>
                Back
              </button>
            ) : (
              <span />
            )}
            <button type="submit" className="btn primary onbnext">
              {step >= STEPS - 1 ? "Start training" : "Next"}
            </button>
          </div>
        </form>

        {step < STEPS - 1 && (
          <button type="button" className="onbskip" onClick={skip}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
