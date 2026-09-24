"use client";

// Add-food flow, reused for both day-logging and plan-building. Search merges
// local foods (custom/seed) with debounced OpenFoodFacts results, plus a custom
// food path. Pick a food → portion picker with a live macro preview → Add, which
// calls `onAdd(food, qty, unit)` into the caller-supplied target (a logged meal
// or a plan meal). The sheet stays open after an Add ("Added ✓ — add another")
// so several items land in one meal fast; Done closes it.
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { gramsFor, macroFor } from "@/lib/macros";
import { searchOff } from "@/lib/off";
import type { Food } from "@/lib/types";
import { Sheet } from "@/components/Sheet";
import { Icon } from "@/data/icons";

type CustomForm = {
  name: string;
  base: "g" | "ml";
  kcal: string;
  p: string;
  c: string;
  f: string;
  servLabel: string;
  servG: string;
};

const emptyForm: CustomForm = { name: "", base: "g", kcal: "", p: "", c: "", f: "", servLabel: "", servG: "" };

export function AddFoodSheet({
  title = "Add food",
  onAdd,
  onClose,
}: {
  title?: string;
  onAdd: (food: Food, qty: number, unit: string) => void;
  onClose: () => void;
}) {
  const allFoods = useStore((s) => s.allFoods);
  const addCustomFood = useStore((s) => s.addCustomFood);

  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Food | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [form, setForm] = useState<CustomForm>(emptyForm);
  const [addedCount, setAddedCount] = useState(0);

  // portion picker state
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("g");

  // OpenFoodFacts (debounced, online-only)
  const [offResults, setOffResults] = useState<Food[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    set();
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online", set);
      window.removeEventListener("offline", set);
    };
  }, []);

  const foods = allFoods();
  const local = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? foods.filter((f) => f.name.toLowerCase().includes(needle) || (f.brand ?? "").toLowerCase().includes(needle))
      : foods;
    return [...list].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40);
  }, [foods, q]);

  // Debounce OFF search on the query; skip when offline or query too short.
  // All state updates run inside timeout callbacks (never synchronously in the
  // effect body) so a query change doesn't cascade an extra synchronous render.
  useEffect(() => {
    const needle = q.trim();
    if (!online || needle.length < 2) {
      const t = setTimeout(() => {
        setOffResults([]);
        setOffLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(async () => {
      setOffLoading(true);
      const res = await searchOff(needle);
      // Drop OFF rows that duplicate a local food id (already upserted).
      const localIds = new Set(foods.map((f) => f.id));
      setOffResults(res.filter((f) => !localIds.has(f.id)));
      setOffLoading(false);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, online]);

  const choose = (f: Food) => {
    setPicked(f);
    setQty(1);
    setUnit(f.servings[0]?.label ?? f.base); // default to a named serving when there is one
  };

  const createAndContinue = () => {
    const name = form.name.trim();
    if (!name) return;
    const servings =
      form.servLabel.trim() && +form.servG > 0 ? [{ label: form.servLabel.trim(), g: +form.servG }] : [];
    const draft = {
      name,
      base: form.base,
      kcal: +form.kcal || 0,
      p: +form.p || 0,
      c: +form.c || 0,
      f: +form.f || 0,
      servings,
    };
    const id = addCustomFood(draft);
    setCustomMode(false);
    setForm(emptyForm);
    choose({ ...draft, id, source: "custom", updatedAt: Date.now() });
  };

  const submit = () => {
    if (!picked) return;
    onAdd(picked, qty, unit);
    setAddedCount((n) => n + 1);
    setPicked(null); // back to search so the next item can go into the same meal
    setQ("");
  };

  // ----- custom food form -----
  if (customMode) {
    return (
      <Sheet title="Custom food" hint="Macros per 100 units of the base." onClose={onClose}>
        <label className="flbl">Name</label>
        <input className="search" value={form.name} autoComplete="off" placeholder="e.g. Homemade granola"
          onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label className="flbl">Base unit</label>
        <div className="seg" role="tablist">
          {(["g", "ml"] as const).map((b) => (
            <button key={b} className={"segb" + (form.base === b ? " on" : "")} onClick={() => setForm({ ...form, base: b })}>
              per 100 {b}
            </button>
          ))}
        </div>

        <div className="macro-grid">
          {([["kcal", "kcal"], ["p", "protein"], ["c", "carbs"], ["f", "fat"]] as const).map(([k, label]) => (
            <div key={k}>
              <label className="flbl">{label}</label>
              <input className="cell" inputMode="decimal" value={form[k]} autoComplete="off"
                onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
        </div>

        <label className="flbl">Optional serving</label>
        <div className="serv-row">
          <input className="search" value={form.servLabel} autoComplete="off" placeholder="label (e.g. katori)"
            onChange={(e) => setForm({ ...form, servLabel: e.target.value })} />
          <input className="cell" inputMode="numeric" value={form.servG} autoComplete="off" placeholder="grams"
            onChange={(e) => setForm({ ...form, servG: e.target.value })} />
        </div>

        <div className="afs-actions">
          <button className="btn ghost" onClick={() => { setCustomMode(false); setForm(emptyForm); }}>Back</button>
          <button className="btn primary" disabled={!form.name.trim()} onClick={createAndContinue}>Create & continue</button>
        </div>
      </Sheet>
    );
  }

  // ----- portion picker -----
  if (picked) {
    const grams = gramsFor(picked, qty, unit);
    const m = macroFor(picked, qty, unit);
    const pk = m.p * 4, ck = m.c * 4, fk = m.f * 9;
    const tot = pk + ck + fk || 1;
    const units = [picked.base, ...picked.servings.map((s) => s.label)];

    return (
      <Sheet title={picked.name} hint={picked.brand} onClose={onClose}>
        <div className="portion">
          <div className="stepper">
            <button className="stepbtn" onClick={() => setQty((n) => Math.max(0, Math.round((n - step(unit)) * 100) / 100))} aria-label="less">−</button>
            <input className="cell stepval" inputMode="decimal" value={qty}
              onChange={(e) => setQty(Math.max(0, +e.target.value || 0))} />
            <button className="stepbtn" onClick={() => setQty((n) => Math.round((n + step(unit)) * 100) / 100)} aria-label="more">+</button>
          </div>
          <select className="cell unitsel" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="preview">
          <div className="preview-line">
            <b className="cond">{fmt(grams)} {picked.base}</b>
            <span className="preview-kcal cond">{m.kcal} kcal</span>
          </div>
          <div className="propbar" role="img" aria-label={`${m.p}g protein, ${m.c}g carbs, ${m.f}g fat`}>
            <i style={{ width: `${(pk / tot) * 100}%`, background: "var(--macro-p)" }} />
            <i style={{ width: `${(ck / tot) * 100}%`, background: "var(--macro-c)" }} />
            <i style={{ width: `${(fk / tot) * 100}%`, background: "var(--macro-f)" }} />
          </div>
          <div className="chips">
            <span className="mchip p">{m.p} P</span>
            <span className="mchip c">{m.c} C</span>
            <span className="mchip f">{m.f} F</span>
          </div>
        </div>

        <div className="afs-actions">
          <button className="btn ghost" onClick={() => setPicked(null)}>Back</button>
          <button className="btn primary" disabled={grams <= 0} onClick={submit}>Add</button>
        </div>
      </Sheet>
    );
  }

  // ----- search / list -----
  return (
    <Sheet title={title} onClose={onClose}>
      {addedCount > 0 && (
        <div className="afs-added">Added ✓ — add another, or Done when finished.</div>
      )}
      <input className="search" value={q} autoFocus autoComplete="off" placeholder="Search foods…"
        onChange={(e) => setQ(e.target.value)} />
      <button className="btn ghost custom-cta" onClick={() => setCustomMode(true)}>
        <Icon name="plus" /> Custom food
      </button>

      <div className="foodlist">
        {local.map((f) => (
          <button key={f.id} className="foodrow" onClick={() => choose(f)}>
            <div className="foodrow-main">
              <span className="foodrow-name">{f.name}</span>
              {f.source === "custom" && <span className="foodrow-tag">custom</span>}
            </div>
            <span className="foodrow-kcal cond">{f.kcal} kcal · {f.p}P /100{f.base}</span>
          </button>
        ))}
        {local.length === 0 && offResults.length === 0 && !offLoading && (
          <div className="empty">No local foods match “{q}”. Try a custom food{online ? " or OpenFoodFacts" : ""}.</div>
        )}

        {/* OpenFoodFacts section */}
        <div className="off-head">
          <span className="upper">OpenFoodFacts</span>
          {!online && <span className="off-note">needs connection</span>}
          {online && offLoading && <span className="off-note">searching…</span>}
        </div>
        {online &&
          offResults.map((f) => (
            <button key={f.id} className="foodrow" onClick={() => choose(f)}>
              <div className="foodrow-main">
                <span className="foodrow-name">{f.name}</span>
              </div>
              <span className="foodrow-kcal cond">{f.kcal} kcal · {f.p}P /100{f.base}</span>
            </button>
          ))}
        {online && !offLoading && q.trim().length >= 2 && offResults.length === 0 && (
          <div className="off-note off-empty">No OpenFoodFacts matches.</div>
        )}
      </div>

      <div className="afs-actions">
        <button className="btn primary" style={{ width: "100%" }} onClick={onClose}>Done</button>
      </div>
    </Sheet>
  );
}

// Sensible step per unit: 10 for raw grams/ml, 1 for named servings.
function step(unit: string): number {
  return unit === "g" || unit === "ml" ? 10 : 1;
}
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
