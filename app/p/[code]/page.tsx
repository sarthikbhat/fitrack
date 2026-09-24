// Public shared-plan page - server component (SSR). Reads the share by code via a
// server Supabase client (public SELECT RLS, anon key), so it renders for signed-in
// and signed-out visitors alike, with no local data required. 404s on an unknown
// code. AppShell bypasses the onboarding gate for /p/* so a brand-new visitor sees
// the shared plan instead of the onboarding wizard.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/Avatar";
import { getShare } from "@/lib/share";
import { getProfileById } from "@/lib/profile";
import { getServerSupabase } from "@/lib/supabaseServer";
import { mc, withA } from "@/data/muscles";
import type { PlanDay, PlanExercise } from "@/data/plan";
import type { MealItem, Plan, PlannedMeal, Program } from "@/lib/types";
import { CloneButton } from "./CloneButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const share = await getShare(code, getServerSupabase());
  if (!share) return { title: "Shared plan" };
  return { title: share.title };
}

export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const share = await getShare(code, getServerSupabase());
  if (!share) notFound();

  const owner = share.owner ? await getProfileById(share.owner, getServerSupabase()) : null;
  const ownerName = owner?.display_name || owner?.username || null;

  return (
    <div className="share-page">
      <header className="share-top">
        <span className="brand">Fitrack</span>
        <span className="chip">Shared {share.kind === "program" ? "program" : "meal plan"}</span>
      </header>

      <main className="share-main">
        <section className="panel share-hero">
          <div className="share-hero-id">
            <h1 className="share-title cond">{share.title}</h1>
            {ownerName ? (
              <div className="share-by">
                <Avatar src={owner?.avatar_url ?? null} name={ownerName} size={28} />
                <span>
                  Shared by {ownerName}
                  {owner?.username && <span className="share-handle"> @{owner.username}</span>}
                </span>
              </div>
            ) : (
              <div className="share-by">
                <span>Shared plan</span>
              </div>
            )}
          </div>
          <CloneButton kind={share.kind} data={share.data} title={share.title} />
        </section>

        {share.kind === "program" ? (
          <ProgramView program={share.data as Program} />
        ) : (
          <NutritionView plan={share.data as Plan} />
        )}
      </main>
    </div>
  );
}

/* ---- read-only program (days + exercises) ---- */
function ProgramView({ program }: { program: Program }) {
  const days = Array.isArray(program?.days) ? program.days : [];
  if (days.length === 0) return <p className="empty">This program has no days yet.</p>;
  return (
    <div className="days" style={{ marginTop: 14 }}>
      {days.map((d, i) => (
        <DayCard key={d.id ?? i} day={d} index={i} />
      ))}
    </div>
  );
}

function DayCard({ day, index }: { day: PlanDay; index: number }) {
  const col = mc(day.ex?.[0]?.muscle ?? "Core");
  return (
    <div className="day open share-day">
      <div className="dh" style={{ cursor: "default" }}>
        <div
          className="idx cond"
          style={{ color: col, borderColor: withA(col, 0.5), background: withA(col, 0.1) }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm cond">{day.name}</div>
          <div className="fc">
            {day.label ? `${day.label} · ` : ""}
            {day.focus}
          </div>
        </div>
      </div>
      <div className="body">
        {(day.ex ?? []).map((ex, j) => (
          <ExRow key={`${ex.name}-${j}`} ex={ex} />
        ))}
      </div>
    </div>
  );
}

function ExRow({ ex }: { ex: PlanExercise }) {
  const col = mc(ex.muscle);
  return (
    <div className="miniex share-ex">
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="nm">{ex.name}</div>
        <div className="sr">
          {ex.sets} × {ex.reps}
        </div>
      </div>
      <span className="chip" style={{ color: col, borderColor: withA(col, 0.5) }}>
        {ex.muscle}
      </span>
    </div>
  );
}

/* ---- read-only nutrition plan (meals + items) ---- */
function NutritionView({ plan }: { plan: Plan }) {
  const meals = Array.isArray(plan?.meals) ? plan.meals : [];
  if (meals.length === 0) return <p className="empty">This meal plan has no meals yet.</p>;
  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      {meals.map((m) => (
        <MealCard key={m.id} meal={m} />
      ))}
    </div>
  );
}

function MealCard({ meal }: { meal: PlannedMeal }) {
  const sub = (meal.items ?? []).reduce(
    (a, it) => ({ kcal: a.kcal + (it.kcal || 0), p: a.p + (it.p || 0) }),
    { kcal: 0, p: 0 },
  );
  return (
    <section className="panel mealgroup">
      <div className="mealgroup-h">
        <span className="upper">{meal.name}</span>
        <span className="cond mealgroup-kcal">
          {Math.round(sub.kcal)} kcal · {Math.round(sub.p)}g protein
        </span>
      </div>
      {(meal.items ?? []).map((it: MealItem) => (
        <div className="diaryrow" key={it.id}>
          <div className="diaryrow-main">
            <span className="diaryrow-name">{it.name || "Food"}</span>
            <span className="diaryrow-portion">
              {fmtQty(it.qty)} {it.unit}
            </span>
          </div>
          <div className="diaryrow-macros cond">
            <span className="diaryrow-kcal">{it.kcal} kcal</span>
            <span className="mchip p">Protein {it.p}g</span>
            <span className="mchip c">Carbs {it.c}g</span>
            <span className="mchip f">Fat {it.f}g</span>
          </div>
        </div>
      ))}
      {(meal.items ?? []).length === 0 && <div className="empty sm">No foods in this meal.</div>}
    </section>
  );
}

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
