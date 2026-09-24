// Social activity feed layer - opt-in workout posts + likes + comments on top of
// the follow graph. Backs /feed (your posts + everyone you follow) and the recent
// activity list on the public profile page. Like the rest of the cloud bolt-on,
// everything degrades gracefully: reads return safe empties when Supabase is
// unconfigured or the visitor is signed out, and writes report a typed error.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { Profile } from "@/lib/profile";
import { makeId } from "@/lib/ids";

// ---- shapes -----------------------------------------------------------------

export type ActivityType = "session" | "pr";

/** Snapshot the feed renders directly for a finished-workout post. */
export type SessionActivityData = {
  name: string;
  sets: number;
  vol: number;
  date: string;
};

export type ActivityRow = {
  id: string;
  user_id: string;
  type: ActivityType;
  data: SessionActivityData & Record<string, unknown>;
  created_at: string;
};

/** An activity plus everything the feed UI needs to render + interact with it. */
export type FeedItem = ActivityRow & {
  author: Profile | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export type FeedComment = {
  id: string;
  activity_id: string;
  user_id: string;
  text: string;
  created_at: string;
  author: Profile | null;
};

export type PostInput = {
  // Explicit row id. For session posts, pass the SessionSummary.id so the activity
  // row === the session (lets us delete/replace it when the session is deleted or
  // re-finished). Omit for other posts and a fresh id is generated.
  id?: string;
  type: ActivityType;
  data: SessionActivityData & Record<string, unknown>;
};
export type PostResult = { ok: true; id: string } | { ok: false; error: string };
export type CommentResult = { ok: true; comment: FeedComment } | { ok: false; error: string };
export type SimpleResult = { ok: true } | { ok: false; error: string };

const MISSING_TABLE = "Activity table missing - run the 0005 SQL migration.";
const SIGN_IN = "Sign in to share your workouts.";
const COMMENT_SIGN_IN = "Sign in to comment.";

// ---- pure helpers (unit-tested) --------------------------------------------

/**
 * Human sentence for a finished-workout post, e.g.
 *   finished "Push A" - 12 sets · 4,200 vol
 * Volume is dropped when zero (bodyweight / unlogged), and the sets label is
 * singular for one set. Pure + testable (no volume unit here - matches Progress).
 */
export function sessionActivityText(data: Partial<SessionActivityData>): string {
  const name = (data.name || "Workout").trim() || "Workout";
  const sets = Math.max(0, Math.round(Number(data.sets) || 0));
  const vol = Math.max(0, Math.round(Number(data.vol) || 0));
  const setsLabel = `${sets} ${sets === 1 ? "set" : "sets"}`;
  const volLabel = vol ? ` · ${vol.toLocaleString()} vol` : "";
  return `finished “${name}” - ${setsLabel}${volLabel}`;
}

/** Tally like/comment rows by activity id, and note which activities I liked. */
export function summariseInteractions(
  likeRows: { activity_id: string; user_id: string }[],
  commentRows: { activity_id: string }[],
  myId: string | null,
): Record<string, { likeCount: number; likedByMe: boolean; commentCount: number }> {
  const out: Record<string, { likeCount: number; likedByMe: boolean; commentCount: number }> = {};
  const ensure = (id: string) => (out[id] ??= { likeCount: 0, likedByMe: false, commentCount: 0 });
  for (const r of likeRows) {
    const e = ensure(r.activity_id);
    e.likeCount++;
    if (myId && r.user_id === myId) e.likedByMe = true;
  }
  for (const r of commentRows) ensure(r.activity_id).commentCount++;
  return out;
}

// ---- internals --------------------------------------------------------------

async function currentUserId(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

/** Batch-load profiles for a set of user ids into an id→Profile map. */
async function profilesByIds(
  sb: SupabaseClient,
  ids: string[],
): Promise<Record<string, Profile>> {
  const map: Record<string, Profile> = {};
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return map;
  const { data } = await sb.from("profiles").select("*").in("id", unique);
  for (const p of (data as Profile[] | null) ?? []) map[p.id] = p;
  return map;
}

// ---- writes -----------------------------------------------------------------

/**
 * Post an activity for the signed-in user. Guarded: a friendly "sign in" error
 * when signed-out/unconfigured, and a run-the-migration hint on the missing-table
 * error (42P01). Fire-and-forget callers can ignore the result.
 */
export async function postActivity({ id: explicitId, type, data }: PostInput): Promise<PostResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: SIGN_IN };
  const uid = await currentUserId(sb);
  if (!uid) return { ok: false, error: SIGN_IN };

  const id = explicitId ?? makeId();
  // When the caller supplies the id (session posts keyed by SessionSummary.id), also
  // stash it in data for robustness, and upsert on id so re-finishing the same day
  // replaces the existing post cleanly instead of erroring on the duplicate key.
  const row = explicitId
    ? { id, user_id: uid, type, data: { ...data, sessionId: id } }
    : { id, user_id: uid, type, data };
  const { error } = explicitId
    ? await sb.from("activity").upsert(row, { onConflict: "id" })
    : await sb.from("activity").insert(row);
  if (error) {
    if (error.code === "42P01") return { ok: false, error: MISSING_TABLE };
    return { ok: false, error: "Couldn't post your workout. Try again." };
  }
  return { ok: true, id };
}

/**
 * Delete the feed activity linked to a session (its row id === the SessionSummary.id).
 * Called fire-and-forget when a session is deleted so its post leaves the feed too.
 * Cascade removes the row's likes/comments. Guards signed-out/unconfigured and
 * ignores the missing-table error / absent rows silently.
 */
export async function deleteActivityForSession(sessionId: string): Promise<SimpleResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: SIGN_IN };
  const uid = await currentUserId(sb);
  if (!uid) return { ok: false, error: SIGN_IN };
  if (!sessionId) return { ok: true };

  const { error } = await sb.from("activity").delete().eq("id", sessionId).eq("user_id", uid);
  if (error && error.code !== "42P01") {
    return { ok: false, error: "Couldn't remove the feed post." };
  }
  return { ok: true };
}

/**
 * Delete one of your own feed posts by its activity id. Owner-scoped in the query
 * (user_id = current uid) and enforced again by RLS. Cascade removes the row's
 * likes/comments. Guards signed-out/unconfigured and ignores the missing-table
 * error / absent rows silently. Used by the feed's per-post delete control.
 */
export async function deleteActivity(activityId: string): Promise<SimpleResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: SIGN_IN };
  const uid = await currentUserId(sb);
  if (!uid) return { ok: false, error: SIGN_IN };
  if (!activityId) return { ok: true };

  const { error } = await sb.from("activity").delete().eq("id", activityId).eq("user_id", uid);
  if (error && error.code !== "42P01") {
    return { ok: false, error: "Couldn't delete that post. Try again." };
  }
  return { ok: true };
}

/**
 * Toggle a like for the signed-in user (idempotent). We check current state, then
 * insert or delete. A duplicate insert (race) is treated as success.
 */
export async function toggleLike(activityId: string): Promise<SimpleResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: SIGN_IN };
  const uid = await currentUserId(sb);
  if (!uid) return { ok: false, error: SIGN_IN };

  const { count } = await sb
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("activity_id", activityId)
    .eq("user_id", uid);

  if ((count ?? 0) > 0) {
    const { error } = await sb.from("likes").delete().eq("activity_id", activityId).eq("user_id", uid);
    if (error) return { ok: false, error: "Couldn't update your like. Try again." };
    return { ok: true };
  }
  const { error } = await sb.from("likes").insert({ activity_id: activityId, user_id: uid });
  if (error) {
    if (error.code === "23505") return { ok: true }; // already liked - fine
    if (error.code === "42P01") return { ok: false, error: MISSING_TABLE };
    return { ok: false, error: "Couldn't update your like. Try again." };
  }
  return { ok: true };
}

/** Add a comment to an activity (owner-scoped by RLS). Returns the created comment. */
export async function addComment(activityId: string, text: string): Promise<CommentResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: COMMENT_SIGN_IN };
  const uid = await currentUserId(sb);
  if (!uid) return { ok: false, error: COMMENT_SIGN_IN };
  const body = text.trim().slice(0, 500);
  if (!body) return { ok: false, error: "Write something first." };

  const id = makeId();
  const { data, error } = await sb
    .from("comments")
    .insert({ id, activity_id: activityId, user_id: uid, text: body })
    .select("*")
    .single();
  if (error || !data) {
    if (error?.code === "42P01") return { ok: false, error: MISSING_TABLE };
    return { ok: false, error: "Couldn't post your comment. Try again." };
  }
  const authors = await profilesByIds(sb, [uid]);
  return { ok: true, comment: { ...(data as Omit<FeedComment, "author">), author: authors[uid] ?? null } };
}

/** Delete one of your own comments (RLS enforces ownership). */
export async function deleteComment(id: string): Promise<SimpleResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: COMMENT_SIGN_IN };
  const uid = await currentUserId(sb);
  if (!uid) return { ok: false, error: COMMENT_SIGN_IN };
  const { error } = await sb.from("comments").delete().eq("id", id).eq("user_id", uid);
  if (error) return { ok: false, error: "Couldn't delete that comment. Try again." };
  return { ok: true };
}

// ---- reads ------------------------------------------------------------------

/**
 * The signed-in user's feed: their own posts + everyone they follow, newest first.
 * Attaches author profile, like count, whether I liked, and comment count per item.
 * Returns [] when signed-out / unconfigured. `before` is a created_at cursor for
 * load-more (strictly older than the given timestamp).
 */
export async function getFeed(opts?: { limit?: number; before?: string }): Promise<FeedItem[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const uid = await currentUserId(sb);
  if (!uid) return [];

  const limit = opts?.limit ?? 30;

  // Who I follow → the set of authors whose posts appear in my feed (+ me).
  const follows = await sb.from("follows").select("followee").eq("follower", uid);
  if (follows.error && follows.error.code === "42P01") return [];
  const followees = ((follows.data as { followee: string }[] | null) ?? []).map((r) => r.followee);
  const authorIds = [...new Set([uid, ...followees])];

  let q = sb
    .from("activity")
    .select("*")
    .in("user_id", authorIds)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts?.before) q = q.lt("created_at", opts.before);

  const { data, error } = await q;
  if (error || !data) return [];
  const rows = data as ActivityRow[];
  if (rows.length === 0) return [];

  const activityIds = rows.map((r) => r.id);
  const [authors, likeRes, commentRes] = await Promise.all([
    profilesByIds(sb, rows.map((r) => r.user_id)),
    sb.from("likes").select("activity_id, user_id").in("activity_id", activityIds),
    sb.from("comments").select("activity_id").in("activity_id", activityIds),
  ]);

  const stats = summariseInteractions(
    (likeRes.data as { activity_id: string; user_id: string }[] | null) ?? [],
    (commentRes.data as { activity_id: string }[] | null) ?? [],
    uid,
  );

  return rows.map((r) => {
    const s = stats[r.id] ?? { likeCount: 0, likedByMe: false, commentCount: 0 };
    return { ...r, author: authors[r.user_id] ?? null, ...s };
  });
}

/** Comments for one activity (oldest first), with author profiles attached. */
export async function getComments(activityId: string): Promise<FeedComment[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("comments")
    .select("*")
    .eq("activity_id", activityId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  const rows = data as Omit<FeedComment, "author">[];
  const authors = await profilesByIds(sb, rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, author: authors[r.user_id] ?? null }));
}

/**
 * Recent activity for one user (for the public profile page). Public read, so it
 * works signed-out and from a server component when passed a server client.
 * Returns [] when unconfigured / on error.
 */
export async function getUserActivity(
  userId: string,
  client?: SupabaseClient | null,
  limit = 20,
): Promise<ActivityRow[]> {
  const sb = client ?? getSupabase();
  if (!sb || !userId) return [];
  const { data, error } = await sb
    .from("activity")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as ActivityRow[];
}
