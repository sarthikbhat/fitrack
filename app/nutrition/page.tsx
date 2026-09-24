"use client";

// Unified nutrition screen. One model: a recurring Plan of meals + a per-day
// Diary of what actually happened. Each plan meal shows up as an expected slot
// with "Ate this" (confirm as planned) / "Log food" (log different) actions;
// once logged, the actual meal replaces the placeholder and counts toward totals.
// Custom meals and an inline plan editor round it out.
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { dayTotals } from "@/lib/macros";
import { mealNameForTime } from "@/lib/meals";
import { todayISO, addDays } from "@/lib/dates";
import type { Food, LoggedMeal, MealItem, PlannedMeal } from "@/lib/types";
import { Ring } from "@/components/exercise/Ring";
import { Icon } from "@/data/icons";
import { AddFoodSheet } from "@/components/nutrition/AddFoodSheet";
import { useConfirm } from "@/components/ConfirmProvider";
import { ShareButton } from "@/components/ShareButton";

// The add-food sheet targets a meal without writing to the store up-front: the
// LoggedMeal is only created on the first actual add (see onAdd), so opening the
// sheet never leaves an empty meal / stray delete icon behind.
//  - log:         an existing logged meal - append items to it
//  - newFromPlan: a plan slot with no logged meal yet - create (linked) on first add
//  - newCustom:   a brand-new custom meal - create on first add
//  - plan:        the plan editor - write straight into the recurring plan meal
type SheetTarget =
  | { kind: "log"; mealId: string; title: string }
  | { kind: "newFromPlan"; planMealId: string; name: string; title: string }
  | { kind: "newCustom"; name: string; title: string }
  | { kind: "plan"; mealId: string; title: string };

export default function NutritionPage() {
  const plan = useStore((s) => s.plan);
  const diary = useStore((s) => s.diary);
  const goals = useStore((s) => s.goals);

  const confirmPlanMeal = useStore((s) => s.confirmPlanMeal);
  const logDifferent = useStore((s) => s.logDifferent);
  const logToMeal = useStore((s) => s.logToMeal);
  const addCustomMeal = useStore((s) => s.addCustomMeal);
  const renameLoggedMeal = useStore((s) => s.renameLoggedMeal);
  const removeLoggedMeal = useStore((s) => s.removeLoggedMeal);
  const removeLoggedItem = useStore((s) => s.removeLoggedItem);
  const pruneEmptyMeals = useStore((s) => s.pruneEmptyMeals);
  const addPlanItem = useStore((s) => s.addPlanItem);
  const confirm = useConfirm();

  const [date, setDate] = useState(() => todayISO());
  const [editingPlan, setEditingPlan] = useState(false);
  const [target, setTarget] = useState<SheetTarget | null>(null);

  const day = useMemo(() => diary[date] ?? { meals: [] }, [diary, date]);
  const totals = dayTotals(day.meals);
  const T = { kcal: goals.kcal, p: goals.p, c: goals.c, f: goals.f };
  const kpct = T.kcal ? Math.min(100, Math.round((totals.kcal / T.kcal) * 100)) : 0;
  const isToday = date === todayISO();

  // Map each plan meal to its logged version for the day (if any).
  const loggedByPlan = new Map<string, LoggedMeal>();
  for (const m of day.meals) if (m.planMealId) loggedByPlan.set(m.planMealId, m);
  const planIds = new Set(plan.meals.map((m) => m.id));
  // Custom meals + any logged meals whose plan slot was since deleted.
  const extraMeals = day.meals.filter((m) => !m.planMealId || !planIds.has(m.planMealId));

  const onAdd = (food: Food, qty: number, unit: string) => {
    if (!target) return;
    const item = { food, qty, unit };
    if (target.kind === "plan") {
      addPlanItem(target.mealId, item);
      return;
    }
    if (target.kind === "log") {
      logToMeal(date, target.mealId, item);
      return;
    }
    // Deferred targets: create the LoggedMeal now (first food), then append into it.
    // Re-point the target at the freshly-created meal so further adds land in the same one.
    const id =
      target.kind === "newFromPlan" ? logDifferent(date, target.planMealId) : addCustomMeal(date, target.name);
    logToMeal(date, id, item);
    setTarget({ kind: "log", mealId: id, title: target.title });
  };

  const closeSheet = () => {
    pruneEmptyMeals(date); // safety net: drop any zero-item meal before leaving the day
    setTarget(null);
  };

  const askRemoveItem = async (mealId: string, entryId: string, mealName: string) => {
    const ok = await confirm({
      title: "Remove food?",
      message: `Remove this food from ${mealName}?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) removeLoggedItem(date, mealId, entryId);
  };
  const askRemoveMeal = async (mealId: string, mealName: string) => {
    const ok = await confirm({
      title: "Remove meal?",
      message: `"${mealName}" and its foods will be removed from this day.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) removeLoggedMeal(date, mealId);
  };

  return (
    <main>
      <div className="section-h">
        <h2>Nutrition</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <ShareButton
            kind="nutrition"
            label="Share plan"
            getPayload={() => ({ title: "My meal plan", data: plan })}
          />
          <button className="btn sm ghost" onClick={() => setEditingPlan((e) => !e)}>
            {editingPlan ? "Done" : "Edit plan"}
          </button>
        </div>
      </div>

      <div className="datebar">
        <button className="btn sm ghost" onClick={() => setDate((d) => addDays(d, -1))} aria-label="previous day">‹</button>
        <span className="cond datebar-lbl">{isToday ? "Today" : prettyDate(date)}</span>
        <button className="btn sm ghost" onClick={() => setDate((d) => addDays(d, 1))} aria-label="next day">›</button>
      </div>

      {editingPlan ? (
        <PlanEditor onAddFood={(pm) => setTarget({ kind: "plan", mealId: pm.id, title: `Add to ${pm.name}` })} />
      ) : (
        <div className="diary-grid">
          <div className="diary-left">
            <section className="panel rollup">
              <Ring pct={kpct} />
              <div className="rollup-macros">
                <div className="rollup-kcal cond">
                  <b>{totals.kcal}</b> <span>/ {T.kcal} kcal</span>
                </div>
                <MacroBar label="Protein" cls="p" val={totals.p} target={T.p} />
                <MacroBar label="Carbs" cls="c" val={totals.c} target={T.c} />
                <MacroBar label="Fat" cls="f" val={totals.f} target={T.f} />
              </div>
            </section>
          </div>

          <div className="diary-right">
            {plan.meals.map((pm) => {
              const logged = loggedByPlan.get(pm.id);
              return logged ? (
                <LoggedMealCard
                  key={pm.id}
                  meal={logged}
                  onAddFood={() => setTarget({ kind: "log", mealId: logged.id, title: `Add to ${logged.name}` })}
                  onRemoveItem={(entryId) => askRemoveItem(logged.id, entryId, logged.name)}
                  onRemoveMeal={() => askRemoveMeal(logged.id, logged.name)}
                />
              ) : (
                <PlanPlaceholder
                  key={pm.id}
                  meal={pm}
                  onAteThis={() => confirmPlanMeal(date, pm.id)}
                  onLogFood={() =>
                    setTarget({ kind: "newFromPlan", planMealId: pm.id, name: pm.name, title: `Log ${pm.name}` })
                  }
                />
              );
            })}

            {extraMeals.map((m) => (
              <LoggedMealCard
                key={m.id}
                meal={m}
                editableName
                onRename={(name) => renameLoggedMeal(date, m.id, name)}
                onAddFood={() => setTarget({ kind: "log", mealId: m.id, title: `Add to ${m.name}` })}
                onRemoveItem={(entryId) => askRemoveItem(m.id, entryId, m.name)}
                onRemoveMeal={() => askRemoveMeal(m.id, m.name)}
              />
            ))}

            <button
              className="btn ghost addex"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => setTarget({ kind: "newCustom", name: mealNameForTime(), title: "Add food" })}
            >
              <Icon name="plus" /> Add meal
            </button>
          </div>
        </div>
      )}

      {target && <AddFoodSheet title={target.title} onAdd={onAdd} onClose={closeSheet} />}
    </main>
  );
}

/** A logged (actual) meal: real items, a subtotal, add-item and remove controls. */
function LoggedMealCard({
  meal,
  editableName,
  onRename,
  onAddFood,
  onRemoveItem,
  onRemoveMeal,
}: {
  meal: LoggedMeal;
  editableName?: boolean;
  onRename?: (name: string) => void;
  onAddFood: () => void;
  onRemoveItem: (entryId: string) => void;
  onRemoveMeal: () => void;
}) {
  const sub = dayTotals([meal]);
  return (
    <section className="panel mealgroup">
      <div className="mealgroup-h">
        {editableName && onRename ? (
          <input
            className="mealname-input cond"
            defaultValue={meal.name}
            aria-label="meal name"
            onBlur={(e) => onRename(e.target.value)}
          />
        ) : (
          <span className="upper">{meal.name}</span>
        )}
        <span className="cond mealgroup-kcal">{sub.kcal} kcal · {sub.p}g protein</span>
      </div>

      {meal.items.map((it) => (
        <div className="diaryrow" key={it.id}>
          <div className="diaryrow-main">
            <span className="diaryrow-name">{it.name || "Food"}</span>
            <span className="diaryrow-portion">{fmtQty(it.qty)} {it.unit}</span>
          </div>
          <div className="diaryrow-macros cond">
            <span className="diaryrow-kcal">{it.kcal} kcal</span>
            <span className="mchip p">Protein {it.p}g</span>
            <span className="mchip c">Carbs {it.c}g</span>
            <span className="mchip f">Fat {it.f}g</span>
          </div>
          <button className="delbtn" onClick={() => onRemoveItem(it.id)} aria-label="remove item">
            <Icon name="trash" />
          </button>
        </div>
      ))}
      {meal.items.length === 0 && <div className="empty sm">No foods yet - add one below.</div>}

      <div className="meal-actions">
        <button className="btn sm ghost" onClick={onAddFood}><Icon name="plus" /> Add food</button>
        <button className="btn sm ghost danger" onClick={onRemoveMeal} aria-label="remove meal"><Icon name="trash" /></button>
      </div>
    </section>
  );
}

/** An expected (unconfirmed) plan meal, shown faint until confirmed or logged. */
function PlanPlaceholder({
  meal,
  onAteThis,
  onLogFood,
}: {
  meal: PlannedMeal;
  onAteThis: () => void;
  onLogFood: () => void;
}) {
  const sub = itemTotals(meal.items);
  return (
    <section className="panel mealgroup planned">
      <div className="mealgroup-h">
        <span className="upper">{meal.name} <span className="planned-tag">planned</span></span>
        {meal.items.length > 0 && <span className="cond mealgroup-kcal">{sub.kcal} kcal · {sub.p}g protein</span>}
      </div>
      {meal.items.length > 0 ? (
        <div className="planned-items">{meal.items.map((it) => it.name).join(", ")}</div>
      ) : (
        <div className="empty sm">Nothing planned here yet.</div>
      )}
      <div className="meal-actions">
        {meal.items.length > 0 && (
          <button className="btn sm primary" onClick={onAteThis}><Icon name="check" /> Ate this</button>
        )}
        <button className="btn sm ghost" onClick={onLogFood}>
          <Icon name="plus" /> {meal.items.length > 0 ? "Log different" : "Log food"}
        </button>
      </div>
    </section>
  );
}

/** Build/edit the recurring plan: add meals, rename, add/remove foods. */
function PlanEditor({ onAddFood }: { onAddFood: (m: PlannedMeal) => void }) {
  const plan = useStore((s) => s.plan);
  const addPlanMeal = useStore((s) => s.addPlanMeal);
  const renamePlanMeal = useStore((s) => s.renamePlanMeal);
  const removePlanMeal = useStore((s) => s.removePlanMeal);
  const removePlanItem = useStore((s) => s.removePlanItem);
  const confirm = useConfirm();

  const askRemovePlanItem = async (mealId: string, itemId: string) => {
    const ok = await confirm({
      title: "Remove food?",
      message: "This food will be removed from the recurring plan meal.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) removePlanItem(mealId, itemId);
  };
  const askRemovePlanMeal = async (mealId: string, name: string) => {
    const ok = await confirm({
      title: "Remove meal?",
      message: `"${name}" will be removed from your recurring plan.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) removePlanMeal(mealId);
  };

  return (
    <div className="plan-editor">
      <p className="tgtlbl" style={{ margin: "0 2px 10px" }}>
        Your recurring meals. These appear each day as expected meals you can confirm or change.
      </p>
      {plan.meals.map((pm) => {
        const sub = itemTotals(pm.items);
        return (
          <section className="panel mealgroup" key={pm.id}>
            <div className="mealgroup-h">
              <input
                className="mealname-input cond"
                defaultValue={pm.name}
                aria-label="plan meal name"
                onBlur={(e) => renamePlanMeal(pm.id, e.target.value)}
              />
              <span className="cond mealgroup-kcal">{sub.kcal} kcal · {sub.p}g protein</span>
            </div>
            {pm.items.map((it) => (
              <div className="diaryrow" key={it.id}>
                <div className="diaryrow-main">
                  <span className="diaryrow-name">{it.name}</span>
                  <span className="diaryrow-portion">{fmtQty(it.qty)} {it.unit}</span>
                </div>
                <div className="diaryrow-macros cond">
                  <span className="diaryrow-kcal">{it.kcal} kcal</span>
                  <span className="mchip p">Protein {it.p}g</span>
                </div>
                <button className="delbtn" onClick={() => askRemovePlanItem(pm.id, it.id)} aria-label="remove food">
                  <Icon name="trash" />
                </button>
              </div>
            ))}
            {pm.items.length === 0 && <div className="empty sm">No foods yet.</div>}
            <div className="meal-actions">
              <button className="btn sm ghost" onClick={() => onAddFood(pm)}><Icon name="plus" /> Add food</button>
              <button className="btn sm ghost danger" onClick={() => askRemovePlanMeal(pm.id, pm.name)} aria-label="remove meal"><Icon name="trash" /></button>
            </div>
          </section>
        );
      })}
      <button className="btn ghost addex" style={{ width: "100%", marginTop: 8 }} onClick={() => addPlanMeal("New meal")}>
        <Icon name="plus" /> Add meal
      </button>
    </div>
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

function itemTotals(items: MealItem[]) {
  return items.reduce(
    (a, it) => ({ kcal: a.kcal + it.kcal, p: Math.round((a.p + it.p) * 10) / 10 }),
    { kcal: 0, p: 0 },
  );
}
function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function prettyDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
