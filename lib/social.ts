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

/** A follower shown in the notifications bell: who followed you + whether you follow back. */
export type FollowerNotice = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  createdAt: string | null;
  youFollow: boolean;
};

/**
 * The people who follow the signed-in user, newest first, joined with their public
 * profile and a `youFollow` flag (do you already follow them back?). Backs the
 * notifications bell. Returns [] when signed out / unconfigured / on error. No new
 * table: derived from the existing `follows` edges + `profiles`.
 */
export async function getFollowers(limit = 50): Promise<FollowerNotice[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const uid = await currentUserId(sb);
  if (!uid) return [];

  const { data: edges, error } = await sb
    .from("follows")
    .select("follower, created_at")
    .eq("followee", uid)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !edges || edges.length === 0) return [];

  const ids = edges.map((e) => e.follower as string);
  const [profRes, mineRes] = await Promise.all([
    sb.from("profiles").select("id, username, display_name, avatar_url").in("id", ids),
    sb.from("follows").select("followee").eq("follower", uid).in("followee", ids),
  ]);

  const pById = new Map(
    (profRes.data ?? []).map((p) => [p.id as string, p as Record<string, unknown>]),
  );
  const following = new Set((mineRes.data ?? []).map((r) => r.followee as string));

  return edges.map((e) => {
    const fid = e.follower as string;
    const p = pById.get(fid);
    return {
      id: fid,
      username: (p?.username as string) ?? null,
      display_name: (p?.display_name as string) ?? null,
      avatar_url: (p?.avatar_url as string) ?? null,
      createdAt: (e.created_at as string) ?? null,
      youFollow: following.has(fid),
    };
  });
}

/**
 * Shared helper: given a set of follow edges (already selected), resolve the other
 * party's profile and whether the signed-in viewer follows each of them.
 * `otherIds` is the list of user ids to look up profiles for.
 */
async function hydrateFollowList(
  sb: SupabaseClient,
  otherIds: string[],
): Promise<FollowerNotice[]> {
  if (otherIds.length === 0) return [];
  const viewer = await currentUserId(sb);
  const [profRes, mineRes] = await Promise.all([
    sb.from("profiles").select("id, username, display_name, avatar_url").in("id", otherIds),
    viewer
      ? sb.from("follows").select("followee").eq("follower", viewer).in("followee", otherIds)
      : Promise.resolve({ data: [] as { followee: string }[] }),
  ]);
  const pById = new Map(
    (profRes.data ?? []).map((p) => [p.id as string, p as Record<string, unknown>]),
  );
  const iFollow = new Set(((mineRes.data ?? []) as { followee: string }[]).map((r) => r.followee));
  return otherIds.map((id) => {
    const p = pById.get(id);
    return {
      id,
      username: (p?.username as string) ?? null,
      display_name: (p?.display_name as string) ?? null,
      avatar_url: (p?.avatar_url as string) ?? null,
      createdAt: null,
      youFollow: iFollow.has(id),
    };
  });
}

/** People who follow `userId` (public), each with a `youFollow` flag for the viewer. */
export async function getFollowersOf(userId: string, limit = 200): Promise<FollowerNotice[]> {
  const sb = getSupabase();
  if (!sb || !userId) return [];
  const { data, error } = await sb
    .from("follows")
    .select("follower, created_at")
    .eq("followee", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return hydrateFollowList(sb, data.map((r) => r.follower as string));
}

/** People `userId` follows (public), each with a `youFollow` flag for the viewer. */
export async function getFollowingOf(userId: string, limit = 200): Promise<FollowerNotice[]> {
  const sb = getSupabase();
  if (!sb || !userId) return [];
  const { data, error } = await sb
    .from("follows")
    .select("followee, created_at")
    .eq("follower", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return hydrateFollowList(sb, data.map((r) => r.followee as string));
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
