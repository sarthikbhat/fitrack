"use client";

// Social activity feed - your posts + everyone you follow, newest first. Signed-out
// visitors get a friendly sign-in prompt; signed-in users get an interactive feed
// with optimistic likes and expandable comments. Degrades gracefully when Supabase
// is unconfigured (no backend → a gentle note). Posting is opt-in and lives on the
// Train "finish" flow; this page is read + like + comment only.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/data/icons";
import { useConfirm } from "@/components/ConfirmProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useStore } from "@/lib/store";
import { useAuth, signInWithGoogle } from "@/lib/auth";
import { useMyProfile } from "@/lib/useMyProfile";
import { relativeTime } from "@/lib/sync/relativeTime";
import {
  getFeed,
  getComments,
  toggleLike,
  addComment,
  deleteComment,
  deleteActivity,
  sessionActivityText,
  type FeedItem,
  type FeedComment,
} from "@/lib/feed";

const PAGE = 30;

function authorName(p: FeedItem["author"]): string {
  return p?.display_name || p?.username || "Athlete";
}

/* ---- comments panel (lazy-loaded when expanded) ---- */
function Comments({
  activityId,
  myId,
  onCountChange,
}: {
  activityId: string;
  myId: string | null;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  // Snapshot the clock once (lazy init) so relative times stay pure in render.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    void (async () => {
      const rows = await getComments(activityId);
      if (active) setComments(rows);
    })();
    return () => {
      active = false;
    };
  }, [activityId]);

  const onAdd = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const res = await addComment(activityId, body);
    setBusy(false);
    if (res.ok) {
      setComments((c) => [...(c ?? []), res.comment]);
      setText("");
      onCountChange(1);
    }
  };

  const onDelete = async (id: string) => {
    const prev = comments;
    setComments((c) => (c ?? []).filter((x) => x.id !== id));
    onCountChange(-1);
    const res = await deleteComment(id);
    if (!res.ok) {
      setComments(prev); // rollback
      onCountChange(1);
    }
  };

  return (
    <div className="feed-comments">
      {comments === null ? (
        <p className="feed-comment-empty">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="feed-comment-empty">No comments yet.</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="feed-comment">
            <Avatar src={c.author?.avatar_url} name={authorName(c.author)} size={26} />
            <div className="feed-comment-body">
              <div className="feed-comment-head">
                <span className="feed-comment-name">{authorName(c.author)}</span>
                <span className="feed-comment-time">{relativeTime(new Date(c.created_at).getTime(), now)}</span>
              </div>
              <div className="feed-comment-text">{c.text}</div>
            </div>
            {myId && c.user_id === myId && (
              <button className="feed-comment-del" aria-label="Delete comment" onClick={() => onDelete(c.id)}>
                <Icon name="trash" />
              </button>
            )}
          </div>
        ))
      )}
      <div className="feed-comment-add">
        <input
          className="search"
          placeholder="Add a comment…"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onAdd();
            }
          }}
          aria-label="Add a comment"
        />
        <button className="btn sm primary" disabled={busy || !text.trim()} onClick={onAdd}>
          Post
        </button>
      </div>
    </div>
  );
}

/* ---- one feed card ---- */
function FeedCard({
  item,
  myId,
  onDelete,
}: {
  item: FeedItem;
  myId: string | null;
  onDelete: (item: FeedItem) => void;
}) {
  const [liked, setLiked] = useState(item.likedByMe);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [now] = useState(() => Date.now());

  const name = authorName(item.author);
  const handle = item.author?.username ?? null;
  const rel = relativeTime(new Date(item.created_at).getTime(), now);
  const mine = !!myId && item.user_id === myId;

  const onLike = async () => {
    if (likeBusy) return;
    const next = !liked;
    setLiked(next); // optimistic
    setLikeCount((n) => n + (next ? 1 : -1));
    setLikeBusy(true);
    const res = await toggleLike(item.id);
    setLikeBusy(false);
    if (!res.ok) {
      setLiked(!next); // rollback
      setLikeCount((n) => n + (next ? -1 : 1));
    }
  };

  return (
    <article className="feed-card panel">
      <header className="feed-card-head">
        {handle ? (
          <Link href={`/u/${handle}`} className="feed-ident">
            <Avatar src={item.author?.avatar_url} name={name} size={40} />
            <span className="feed-ident-text">
              <span className="feed-name">{name}</span>
              <span className="feed-handle">@{handle}</span>
            </span>
          </Link>
        ) : (
          <span className="feed-ident">
            <Avatar src={item.author?.avatar_url} name={name} size={40} />
            <span className="feed-ident-text">
              <span className="feed-name">{name}</span>
            </span>
          </span>
        )}
        {rel && <span className="feed-time">{rel}</span>}
        {mine && (
          <button
            className="feed-del"
            aria-label="Delete post"
            title="Delete post"
            onClick={() => onDelete(item)}
          >
            <Icon name="trash" />
          </button>
        )}
      </header>

      <p className="feed-activity">{sessionActivityText(item.data)}</p>

      <div className="feed-actions">
        <button
          className={`feed-act${liked ? " liked" : ""}`}
          onClick={onLike}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Icon name="heart" />
          {likeCount > 0 && <span className="tnum">{likeCount}</span>}
        </button>
        <button
          className={`feed-act${showComments ? " on" : ""}`}
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
        >
          <Icon name="comment" />
          {commentCount > 0 && <span className="tnum">{commentCount}</span>}
        </button>
      </div>

      {showComments && (
        <Comments
          activityId={item.id}
          myId={myId}
          onCountChange={(d) => setCommentCount((n) => Math.max(0, n + d))}
        />
      )}
    </article>
  );
}

export default function FeedPage() {
  const { status, user, loading } = useAuth();
  const { profile } = useMyProfile();
  const confirm = useConfirm();
  const { openSettings } = useSettings();
  const shareWorkouts = useStore((s) => s.settings.shareWorkouts);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const reqId = useRef(0);

  // Load the feed on sign-in / user change. All state updates run inside the async
  // closure (never synchronously in the effect body) to avoid cascading renders.
  useEffect(() => {
    let active = true;
    const id = ++reqId.current;
    void (async () => {
      if (status !== "signed-in") {
        if (active) {
          setItems([]);
          setLoaded(false);
        }
        return;
      }
      setFeedLoading(true);
      const rows = await getFeed({ limit: PAGE });
      if (!active || id !== reqId.current) return;
      setItems(rows);
      setMore(rows.length === PAGE);
      setLoaded(true);
      setFeedLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [status, user?.id]);

  const onLoadMore = async () => {
    if (loadingMore || items.length === 0) return;
    setLoadingMore(true);
    const before = items[items.length - 1].created_at;
    const rows = await getFeed({ limit: PAGE, before });
    setItems((cur) => [...cur, ...rows]);
    setMore(rows.length === PAGE);
    setLoadingMore(false);
  };

  const myId = profile?.id ?? user?.id ?? null;

  // Delete one of my own posts: confirm → optimistically drop it from the list →
  // rollback (and surface an error dialog) if the write fails.
  const onDelete = async (item: FeedItem) => {
    const ok = await confirm({
      title: "Delete post?",
      message: "This removes it from the feed for everyone, along with its likes and comments.",
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    const prev = items;
    setItems((cur) => cur.filter((x) => x.id !== item.id));
    const res = await deleteActivity(item.id);
    if (!res.ok) {
      setItems(prev); // rollback
      await confirm({
        title: "Couldn't delete post",
        message: res.error,
        confirmLabel: "OK",
        cancelLabel: "Close",
      });
    }
  };

  // --- unconfigured: no backend on this device ---
  if (status === "unconfigured") {
    return (
      <main className="feed-page">
        <header className="feed-head">
          <h1 className="page-title">Feed</h1>
        </header>
        <p className="empty">The activity feed isn&apos;t available on this device yet.</p>
      </main>
    );
  }

  // --- signed out: prompt sign-in ---
  if (status === "signed-out") {
    return (
      <main className="feed-page">
        <header className="feed-head">
          <h1 className="page-title">Feed</h1>
        </header>
        <section className="feed-signin panel">
          <h2 className="feed-signin-title">Sign in to see your feed</h2>
          <p className="feed-signin-sub">
            Follow athletes and see their workouts here. Sign in with Google to get started.
          </p>
          <button className="btn primary" disabled={loading} onClick={() => signInWithGoogle()}>
            Sign in with Google
          </button>
          <Link href="/people" className="feed-signin-link">
            Find people to follow
          </Link>
        </section>
      </main>
    );
  }

  // --- signed in ---
  return (
    <main className="feed-page">
      <header className="feed-head">
        <h1 className="page-title">Feed</h1>
        <p className="feed-sub">Your workouts and the people you follow.</p>
      </header>

      {!shareWorkouts && (
        <div className="feed-sharehint">
          <Icon name="bell" />
          <span>Your workouts aren&rsquo;t shared to the feed.</span>
          <button className="feed-sharehint-cta" onClick={openSettings}>
            Turn on sharing
          </button>
        </div>
      )}

      {feedLoading && !loaded && <p className="empty">Loading your feed…</p>}

      {loaded && items.length === 0 && (
        <div className="feed-empty">
          <p className="empty">Follow people to see their workouts.</p>
          <Link href="/people" className="btn">
            Find people
          </Link>
        </div>
      )}

      <div className="feed-list">
        {items.map((it) => (
          <FeedCard key={it.id} item={it} myId={myId} onDelete={onDelete} />
        ))}
      </div>

      {more && items.length > 0 && (
        <button className="btn ghost feed-more" disabled={loadingMore} onClick={onLoadMore}>
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </main>
  );
}
