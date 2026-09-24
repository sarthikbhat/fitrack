"use client";

// Header notifications bell. Shows an unread badge when people have followed you
// since you last opened it, and lists them with a one-tap "Follow back". Follow
// notifications are derived from the existing `follows` table (getFollowers) and the
// last-seen watermark lives in localStorage - no backend or new table involved.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/data/icons";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { getFollowers, followUser, type FollowerNotice } from "@/lib/social";
import { getLastSeen, setLastSeen } from "@/lib/notifications";

function ago(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!t) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export function NotificationsBell() {
  const { user, status } = useAuth();
  const uid = user?.id ?? "";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FollowerNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [seen, setSeen] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Load followers once signed in. All setState happens inside the async closure.
  useEffect(() => {
    if (status !== "signed-in" || !uid) return;
    let alive = true;
    getFollowers().then((f) => {
      if (!alive) return;
      setItems(f);
      setSeen(getLastSeen(uid));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [status, uid]);

  // Dismiss on outside click / Escape (setState only from event callbacks).
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status !== "signed-in") return null;

  const unread = items.filter((f) => {
    const t = f.createdAt ? new Date(f.createdAt).getTime() : 0;
    return t > seen;
  }).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      getFollowers().then(setItems); // refresh in the background
      const now = Date.now();
      setLastSeen(uid, now);
      setSeen(now);
    }
  };

  const followBack = async (id: string) => {
    setBusy(id);
    const res = await followUser(id);
    setBusy(null);
    if (res.ok) {
      setItems((prev) => prev.map((f) => (f.id === id ? { ...f, youFollow: true } : f)));
    }
  };

  return (
    <div className="notif" ref={wrapRef}>
      <button className="gearbtn notif-btn" aria-label="Notifications" onClick={toggle}>
        <Icon name="bell" />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel" role="menu">
          <div className="notif-head">Notifications</div>
          {loading && items.length === 0 ? (
            <div className="notif-empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="notif-empty">
              No notifications yet. When someone follows you, it&rsquo;ll show up here.
            </div>
          ) : (
            <div className="notif-list">
              {items.map((f) => {
                const name = f.display_name || f.username || "Someone";
                return (
                  <div className="notif-row" key={f.id}>
                    <Link
                      href={f.username ? `/u/${f.username}` : "#"}
                      className="notif-who"
                      onClick={() => setOpen(false)}
                    >
                      <Avatar src={f.avatar_url} name={name} size={36} />
                      <span className="notif-text">
                        <span>
                          <b>{name}</b> followed you
                        </span>
                        <span className="notif-time">{ago(f.createdAt)}</span>
                      </span>
                    </Link>
                    {f.youFollow ? (
                      <span className="notif-following">Following</span>
                    ) : (
                      <button
                        className="btn primary notif-fb"
                        disabled={busy === f.id}
                        onClick={() => followBack(f.id)}
                      >
                        {busy === f.id ? "…" : "Follow back"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
