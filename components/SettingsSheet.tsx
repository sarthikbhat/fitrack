"use client";

// Settings sheet — ports legacy renderSheet('settings') (legacy:2385-2420) plus the
// export/import/resetAll data handlers (legacy:2328-2344, 2216). Reuses <Sheet>.
import { useRef, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { Seg, Toggle } from "@/components/Controls";
import { useStore } from "@/lib/store";
import { todayISO } from "@/lib/dates";

const ACCENTS = [
  { hex: "#10b981", name: "Emerald" },
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#f43f5e", name: "Rose" },
  { hex: "#8b5cf6", name: "Violet" },
];

const ACTIVITY: { v: "1" | "2" | "3" | "4" | "5"; l: string }[] = [
  { v: "1", l: "Sedentary" },
  { v: "2", l: "Light" },
  { v: "3", l: "Moderate" },
  { v: "4", l: "Active" },
  { v: "5", l: "Athlete" },
];

function fmtRest(sec: number): string {
  return `${Math.floor(sec / 60)}:${`0${sec % 60}`.slice(-2)}`;
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const profile = useStore((s) => s.profile);
  const settings = useStore((s) => s.settings);
  const setUnitsMass = useStore((s) => s.setUnitsMass);
  const setTheme = useStore((s) => s.setTheme);
  const setRest = useStore((s) => s.setRest);
  const setAutoRest = useStore((s) => s.setAutoRest);
  const setSex = useStore((s) => s.setSex);
  const setAge = useStore((s) => s.setAge);
  const setActivity = useStore((s) => s.setActivity);
  const setAccent = useStore((s) => s.setAccent);
  const setStartDay = useStore((s) => s.setStartDay);
  const updateProfile = useStore((s) => s.updateProfile);
  const exportState = useStore((s) => s.exportState);
  const importState = useStore((s) => s.importState);
  const resetAll = useStore((s) => s.resetAll);

  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  const mass = profile?.units.mass ?? "kg";
  const theme = profile?.theme ?? "dark";
  const sex = profile?.sex ?? "male";
  const age = profile?.age ?? 30;
  const activity = String(profile?.activity ?? 3);
  const accent = profile?.accent ?? ACCENTS[0].hex;
  const startDay = profile?.startDay ?? 1;

  const onExport = () => {
    const blob = new Blob([exportState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitrack-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImportFile = (file: File) => {
    setErr(null);
    const rd = new FileReader();
    rd.onload = () => {
      try {
        importState(String(rd.result));
        onClose();
      } catch {
        setErr("That file isn't a valid Fitrack backup.");
      }
    };
    rd.onerror = () => setErr("Couldn't read that file.");
    rd.readAsText(file);
  };

  const onErase = () => {
    if (window.confirm("Erase ALL Fitrack data on this device? This cannot be undone.")) {
      resetAll();
      onClose();
    }
  };

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="srow">
        <span>Weight units</span>
        <Seg
          ariaLabel="Weight units"
          value={mass}
          onChange={setUnitsMass}
          options={[
            { v: "kg", l: "kg" },
            { v: "lb", l: "lb" },
          ]}
        />
      </div>
      <div className="srow">
        <span>Theme</span>
        <Seg
          ariaLabel="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { v: "dark", l: "Dark" },
            { v: "light", l: "Light" },
          ]}
        />
      </div>
      <div className="srow">
        <span>Rest length</span>
        <div className="restset">
          <button className="btn sm" aria-label="less rest" onClick={() => setRest(settings.rest - 15)}>
            –
          </button>
          <span className="cond tnum" style={{ minWidth: 52, textAlign: "center" }}>
            {fmtRest(settings.rest)}
          </span>
          <button className="btn sm" aria-label="more rest" onClick={() => setRest(settings.rest + 15)}>
            +
          </button>
        </div>
      </div>
      <div className="srow">
        <span>Auto-start rest after a set</span>
        <Toggle on={settings.autoRest} onChange={setAutoRest} ariaLabel="Auto-start rest" />
      </div>

      <div className="srule" />

      <label className="flbl">Name</label>
      <input
        className="search"
        value={profile?.name ?? ""}
        placeholder="Your name"
        autoComplete="off"
        onChange={(e) => updateProfile({ name: e.target.value })}
      />

      <div className="srow" style={{ marginTop: 6 }}>
        <span>Sex</span>
        <Seg
          ariaLabel="Sex"
          value={sex}
          onChange={setSex}
          options={[
            { v: "male", l: "Male" },
            { v: "female", l: "Female" },
          ]}
        />
      </div>
      <div className="srow">
        <span>Age</span>
        <div className="restset">
          <button className="btn sm" aria-label="lower age" onClick={() => setAge(age - 1)}>
            –
          </button>
          <span className="cond tnum" style={{ minWidth: 40, textAlign: "center" }}>
            {age}
          </span>
          <button className="btn sm" aria-label="raise age" onClick={() => setAge(age + 1)}>
            +
          </button>
        </div>
      </div>
      <div className="srow" style={{ flexWrap: "wrap" }}>
        <span>Activity</span>
        <Seg
          ariaLabel="Activity level"
          value={activity as "1" | "2" | "3" | "4" | "5"}
          onChange={(v) => setActivity(Number(v) as 1 | 2 | 3 | 4 | 5)}
          options={ACTIVITY}
        />
      </div>
      <p className="shint" style={{ margin: "2px 0 0" }}>
        Age &amp; activity power the nutrition target calculator.
      </p>

      <div className="srule" />

      <div className="srow">
        <span>Accent</span>
        <div className="swatches">
          {ACCENTS.map((a) => (
            <button
              key={a.hex}
              type="button"
              className={`swatch${accent === a.hex ? " on" : ""}`}
              style={{ background: a.hex }}
              aria-label={a.name}
              aria-pressed={accent === a.hex}
              onClick={() => setAccent(a.hex)}
            />
          ))}
        </div>
      </div>
      <div className="srow">
        <span>Week starts</span>
        <Seg
          ariaLabel="Week start day"
          value={String(startDay) as "0" | "1"}
          onChange={(v) => setStartDay(Number(v) as 0 | 1)}
          options={[
            { v: "0", l: "Sun" },
            { v: "1", l: "Mon" },
          ]}
        />
      </div>

      <div className="srule" />

      <button className="btn" style={{ width: "100%" }} onClick={onExport}>
        Export backup (.json)
      </button>
      <button
        className="btn"
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => fileRef.current?.click()}
      >
        Import backup
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportFile(f);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
      {err && (
        <p className="shint" style={{ color: "var(--danger)", marginTop: 8 }}>
          {err}
        </p>
      )}
      <button
        className="btn ghost"
        style={{ width: "100%", marginTop: 8, color: "var(--danger)", borderColor: "var(--line2)" }}
        onClick={onErase}
      >
        Erase all data
      </button>
      <p className="shint">
        Data lives only on this device. Export now and then so you don&apos;t lose it.
      </p>
    </Sheet>
  );
}
