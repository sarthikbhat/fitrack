// Social graph layer - the follow system on top of public profiles. Backs the
// Follow / Following toggle on /u/<username>, follower / following counts, and
// the "Find people" search. Like the rest of the cloud bolt-on, everything
// degrades gracefully when Supabase is unconfigured or the visitor is signed
// out: writes report a typed error (or a friendly "sign in" message) and reads
// return safe empties, so the local-first app never breaks.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { Profile } from "@/lib/profile";

// ---- pure helpers (unit-tested) --------------------------------------------

/**
 * Sanitize a raw search query for a Postgres `ilike` filter: trim, cap length,
 * and escape the LIKE wildcards `%` and `_` so a user typing them searches for
 * the literal characters instead of matching everything. Returns "" for empty
 * or whitespace-only input (callers short-circuit to [] on empty).
 */
export function sanitizeSearchQuery(raw: string): string {
  const trimmed = (raw || "").trim().slice(0, 60);
  // Escape backslash first, then the LIKE wildcards, so they match literally.
  return trimmed.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// ---- typed results ---------------------------------------------------------

export type FollowResult = { ok: true } | { ok: false; error: string };
export type FollowCounts = { followers: number; following: number };

const MISSING_TABLE =
  "Follows table missing - run the 0004 SQL migration.";
const SIGN_IN = "Sign in to follow people.";

/** The signed-in user's id, or null (signed-out / unconfigured). */
async function currentUserId(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Follow another user: insert a (me → followeeId) edge. Idempotent - a duplicate
 * follow is treated as success. Requires a signed-in user. Maps the missing-table
 * error (42P01) to a run-the-migration hint.
 */
export async function followUser(followeeId: string): Promise<FollowResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: SIGN_IN };
  const uid = await currentUserId(sb);
  if (!uid) return { ok: false, error: SIGN_IN };
  if (uid === followeeId) return { ok: false, error: "You can't follow yourself." };

  const { error } = await sb.from("follows").insert({ follower: uid, followee: followeeId });
  if (error) {
    if (error.code === "23505") return { ok: true }; // already following - fine
    if (error.code === "42P01") return { ok: false, error: MISSING_TABLE };
    return { ok: false, error: "Couldn't follow. Try again." };
  }
  return { ok: true };
}

/**
 * Unfollow a user: delete the (me → followeeId) edge. Requires a signed-in user.
 * A no-op delete (edge already gone) is success.
 */
export async function unfollowUser(followeeId: string): Promise<FollowResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: SIGN_IN };
  const uid = await currentUserId(sb);
  if (!uid) return { ok: false, error: SIGN_IN };

  const { error } = await sb
    .from("follows")
    .delete()
    .eq("follower", uid)
    .eq("followee", followeeId);
  if (error) {
    if (error.code === "42P01") return { ok: false, error: MISSING_TABLE };
    return { ok: false, error: "Couldn't unfollow. Try again." };
  }
  return { ok: true };
}

/**
 * Whether the signed-in user follows `followeeId`. Returns false when signed
 * out, unconfigured, or on any error (a safe default for the toggle's initial
 * state).
 */
export async function isFollowing(followeeId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const uid = await currentUserId(sb);
  if (!uid) return false;

  const { count, error } = await sb
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower", uid)
    .eq("followee", followeeId);
  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Follower + following counts for a user. Two public count queries (head-only,
 * no rows fetched). Works from a server component when passed a server client.
 * Returns zeros when unconfigured or on error.
 */
export async function getFollowCounts(
  userId: string,
  client?: SupabaseClient | null,
): Promise<FollowCounts> {
  const sb = client ?? getSupabase();
  if (!sb || !userId) return { followers: 0, following: 0 };

  const [followersRes, followingRes] = await Promise.all([
    sb.from("follows").select("*", { count: "exact", head: true }).eq("followee", userId),
    sb.from("follows").select("*", { count: "exact", head: true }).eq("follower", userId),
  ]);

  return {
    followers: followersRes.error ? 0 : followersRes.count ?? 0,
    following: followingRes.error ? 0 : followingRes.count ?? 0,
  };
}

/**
 * Search public profiles by username OR display name (case-insensitive, partial).
 * Public read, so it works signed-out too. Returns [] for an empty query or when
 * unconfigured. Pass `excludeSelf` to drop the signed-in user's own row from the
 * results (used by the "Find people" list). Works from SSR with a passed client.
 */
export async function searchProfiles(
  query: string,
  client?: SupabaseClient | null,
  opts?: { excludeSelf?: boolean; limit?: number },
): Promise<Profile[]> {
  const sb = client ?? getSupabase();
  if (!sb) return [];
  const q = sanitizeSearchQuery(query);
  if (!q) return [];

  const limit = opts?.limit ?? 20;
  const pattern = `%${q}%`;
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
    .limit(limit);
  if (error || !data) return [];

  let rows = data as Profile[];
  if (opts?.excludeSelf) {
    const uid = await currentUserId(sb);
    if (uid) rows = rows.filter((p) => p.id !== uid);
  }
  return rows;
}
