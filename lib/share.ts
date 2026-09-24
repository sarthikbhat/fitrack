// Shared-plans layer: publish a workout program or nutrition plan to a short
// public code, read one back by code, and manage your own links. Backs the
// "share a plan via link" feature and the public /p/<code> page.
//
// Shares live in a SEPARATE public table (public.shared_plans, 0003 migration):
// world-readable by design so anyone with the link can view + clone, owner-only
// to create/delete. Like the rest of the app this degrades gracefully when
// Supabase is unconfigured - creation reports a typed error, reads return null.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { Plan, Program } from "@/lib/types";
import type { PlanDay } from "@/data/plan";

export type ShareKind = "program" | "nutrition";

/** A share row as read back from the public table. `data` is a Program or Plan snapshot. */
export type SharedPlan = {
  code: string;
  kind: ShareKind;
  title: string;
  data: unknown;
  owner: string | null;
};

// URL-safe alphabet with ambiguous characters removed (no 0/O, 1/I/l) so codes
// are easy to read aloud and retype from a link.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * A short, URL-safe share code (~8 chars) from crypto-strong randomness. Rejection
 * sampling keeps the distribution uniform (no modulo bias) over the alphabet.
 */
export function makeShareCode(len = 8): string {
  const n = CODE_ALPHABET.length;
  const max = 256 - (256 % n); // largest multiple of n ≤ 256; bytes ≥ max are discarded
  let out = "";
  while (out.length < len) {
    const bytes = new Uint8Array(len - out.length);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b >= max) continue; // discard to avoid modulo bias
      out += CODE_ALPHABET[b % n];
      if (out.length === len) break;
    }
  }
  return out;
}

export type CreateShareInput = { kind: ShareKind; title: string; data: unknown };
export type CreateShareResult =
  | { ok: true; code: string; url: string }
  | { ok: false; error: string };

/**
 * Publish a plan to a new public code. Requires a signed-in user (only the owner
 * may insert per RLS). Returns the code + the full share URL, or a typed error
 * when signed out, unconfigured, or the insert fails.
 */
export async function createShare(input: CreateShareInput): Promise<CreateShareResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Sign in to share a plan." };

  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in to share a plan." };

  const code = makeShareCode();
  const { error } = await sb.from("shared_plans").insert({
    code,
    owner: auth.user.id,
    kind: input.kind,
    title: input.title,
    data: input.data,
  });

  if (error) {
    if (error.code === "42P01")
      return { ok: false, error: "Shared plans table missing — run the 0003 SQL migration." };
    return { ok: false, error: "Couldn't create the share link. Try again." };
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return { ok: true, code, url: `${origin}/p/${code}` };
}

/**
 * Read a shared plan by code (public read). Works from a server component: pass a
 * server client, or omit it to use the browser client. Returns null when
 * unconfigured or not found.
 */
export async function getShare(
  code: string,
  client?: SupabaseClient | null,
): Promise<SharedPlan | null> {
  const sb = client ?? getSupabase();
  if (!sb || !code) return null;
  const { data } = await sb
    .from("shared_plans")
    .select("code,kind,title,data,owner")
    .eq("code", code)
    .maybeSingle();
  return (data as SharedPlan) ?? null;
}

/** The signed-in user's own shares, newest first (for managing/revoking links). */
export async function listMyShares(): Promise<SharedPlan[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data } = await sb
    .from("shared_plans")
    .select("code,kind,title,data,owner")
    .eq("owner", auth.user.id)
    .order("created_at", { ascending: false });
  return (data as SharedPlan[]) ?? [];
}

/** Delete one of your shares by code (owner-only per RLS). Returns success. */
export async function deleteShare(code: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("shared_plans").delete().eq("code", code);
  return !error;
}

// ---- pure import helpers (unit-tested; used by the store import actions) ------

/** Deep-clone a shared program into an importable Program under a fresh id.
    Names get a " (copy)" suffix unless they already carry one. */
export function cloneProgramForImport(program: Program, id: string, ts: number): Program {
  const base = program?.name?.trim() || "Shared Program";
  const name = /\(copy\)\s*$/i.test(base) ? base : `${base} (copy)`;
  const days: PlanDay[] = (program?.days ?? []).map((d) => ({
    ...d,
    tags: [...(d.tags ?? [])],
    ex: (d.ex ?? []).map((e) => ({ ...e })),
  }));
  return { id, name, days, updatedAt: ts };
}

/** Deep-clone a shared nutrition plan, regenerating meal/item ids so the imported
    copy owns fresh local ids (never collides with the sharer's records). */
export function clonePlanForImport(plan: Plan, newId: () => string): Plan {
  return {
    meals: (plan?.meals ?? []).map((m) => ({
      id: newId(),
      name: m.name,
      items: (m.items ?? []).map((it) => ({ ...it, id: newId() })),
    })),
  };
}
