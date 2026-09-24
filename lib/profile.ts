// Public profiles layer. Backs the visible account presence (avatar + display
// name + @username) and the public profile page /u/<username>. Everything
// degrades gracefully when Supabase is unconfigured - every function no-ops or
// returns null so the local-first app keeps working with no backend.
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
};

// ---- pure username helpers (unit-tested) -----------------------------------

/** Lowercase, strip to [a-z0-9_], collapse repeats, trim to 20 chars. */
export function slugifyUsername(raw: string): string {
  const base = (raw || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_") // non-alphanumerics → underscore
    .replace(/_+/g, "_") // collapse repeats
    .replace(/^_+|_+$/g, ""); // trim leading/trailing underscores
  return base.slice(0, 20);
}

/**
 * Suggest a starting username from a Google user: prefer the email local-part,
 * fall back to the display name, then a generic "user". Always ≥3 chars (pads
 * with a numeric suffix so it can pass validation before uniqueness checks).
 */
export function suggestUsername(user: {
  email?: string | null;
  display_name?: string | null;
}): string {
  const local = user.email ? user.email.split("@")[0] : "";
  let s = slugifyUsername(local) || slugifyUsername(user.display_name ?? "") || "user";
  if (s.length < 3) s = `${s}${randomSuffix(3)}`.slice(0, 20);
  return s;
}

/** Short lowercase alphanumeric suffix used to de-collide usernames. */
export function randomSuffix(len = 4): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** Append a random suffix to a base, keeping the whole thing ≤20 chars. */
export function withSuffix(base: string, suffixLen = 4): string {
  const suffix = randomSuffix(suffixLen);
  const room = Math.max(1, 20 - suffix.length - 1); // 1 for the underscore
  const trimmed = base.slice(0, room).replace(/_+$/, "") || "u";
  return `${trimmed}_${suffix}`;
}

export type UsernameError = null | "length" | "charset";

/** Validate a chosen username: lowercase, 3–20 chars, [a-z0-9_]. */
export function validateUsername(name: string): UsernameError {
  const n = (name || "").trim();
  if (n.length < 3 || n.length > 20) return "length";
  if (!/^[a-z0-9_]+$/.test(n)) return "charset";
  return null;
}

/** Human-readable message for a UsernameError (null → empty string). */
export function usernameErrorMessage(err: UsernameError): string {
  switch (err) {
    case "length":
      return "Username must be 3–20 characters.";
    case "charset":
      return "Use only lowercase letters, numbers, and underscores.";
    default:
      return "";
  }
}

// ---- data access -----------------------------------------------------------

/** True when a Postgres error is a unique-constraint violation. */
function isUniqueViolation(err: { code?: string } | null): boolean {
  return err?.code === "23505";
}

/**
 * Ensure the signed-in user has a profiles row. Idempotent: a no-op when a row
 * already exists (or Supabase is unconfigured). On first sign-in it creates one
 * with a display name + avatar from the Google session and a suggested unique
 * username (retries with a random suffix a couple of times on collision).
 */
export async function ensureProfile(user: User): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb || !user) return null;

  const existing = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existing.data) return existing.data as Profile;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const display_name =
    (meta.full_name as string) || (meta.name as string) || user.email || "Athlete";
  const avatar_url = (meta.avatar_url as string) || null;
  const base = suggestUsername({ email: user.email, display_name });

  // Try the clean handle first, then a couple of suffixed variants on collision.
  const candidates = [base, withSuffix(base), withSuffix(base)];
  for (const username of candidates) {
    const insert = await sb
      .from("profiles")
      .insert({ id: user.id, username, display_name, avatar_url })
      .select("*")
      .single();
    if (!insert.error) return insert.data as Profile;
    if (!isUniqueViolation(insert.error)) break; // non-collision error: stop trying
  }

  // Last resort: create the row without a username (owner can set one later).
  const bare = await sb
    .from("profiles")
    .insert({ id: user.id, display_name, avatar_url })
    .select("*")
    .single();
  return bare.error ? null : (bare.data as Profile);
}

/** The signed-in user's own profile, or null (unconfigured / signed-out). */
export async function getMyProfile(): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  return (data as Profile) ?? null;
}

export type UpdateProfileInput = { username?: string; display_name?: string; bio?: string };
export type UpdateProfileResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string };

/**
 * Update the signed-in user's profile. Validates the username (lowercase, 3–20,
 * [a-z0-9_]) and surfaces a friendly message on a uniqueness conflict.
 */
export async function updateMyProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Sign in to edit your profile." };
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in to edit your profile." };

  const patch: Record<string, string | null> = {};
  if (input.username !== undefined) {
    const username = input.username.trim().toLowerCase();
    const err = validateUsername(username);
    if (err) return { ok: false, error: usernameErrorMessage(err) };
    patch.username = username;
  }
  if (input.display_name !== undefined) patch.display_name = input.display_name.trim() || null;
  if (input.bio !== undefined) patch.bio = input.bio.trim() || null;

  // Upsert (not update) so it succeeds even if the profiles row wasn't created on
  // sign-in. Only the changed columns are sent, so a partial edit never clobbers
  // other fields (e.g. editing bio won't wipe display_name/avatar).
  const { data, error } = await sb
    .from("profiles")
    .upsert({ id: auth.user.id, ...patch }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That username is taken." };
    if (error.code === "42P01")
      return { ok: false, error: "Profiles table missing - run the 0002 SQL migration in Supabase." };
    return { ok: false, error: "Couldn't save your profile. Try again." };
  }
  return { ok: true, profile: data as Profile };
}

/**
 * Look up a profile by user id (public read). Works from a server component: pass
 * a server client, or omit it to use the browser client. Used to resolve owner
 * attribution on the public shared-plan page. Returns null when unconfigured /
 * not found.
 */
export async function getProfileById(
  id: string,
  client?: SupabaseClient | null,
): Promise<Profile | null> {
  const sb = client ?? getSupabase();
  if (!sb || !id) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile) ?? null;
}

/**
 * Look up a profile by username (public read). Works from a server component:
 * pass a server client, or omit it to use the browser client. Returns null when
 * unconfigured or not found.
 */
export async function getProfileByUsername(
  username: string,
  client?: SupabaseClient | null,
): Promise<Profile | null> {
  const sb = client ?? getSupabase();
  if (!sb || !username) return null;
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  return (data as Profile) ?? null;
}
