"use client";

// Followers / Following list, shown when you tap a count on a profile. Each row
// links to that person's profile and carries a Follow/Unfollow toggle (reusing
// FollowButton). On YOUR OWN followers list, each row also gets a "⋯" menu with
// "Remove follower", which deletes their edge to you (requires the 0006 policy).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/Sheet";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { useConfirm } from "@/components/ConfirmProvider";
import { useAuth } from "@/lib/auth";
import {
  getFollowersOf,
  getFollowingOf,
  removeFollower,
  type FollowerNotice,
} from "@/lib/social";

export function FollowListModal({
  userId,
  mode,
  onClose,
}: {
  userId: string;
  mode: "followers" | "following";
  onClose: () => void;
}) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [items, setItems] = useState<FollowerNotice[] | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Removing a follower only applies to YOUR OWN followers list.
  const canRemove = mode === "followers" && !!user?.id && user.id === userId;

  useEffect(() => {
    let alive = true;
    const load = mode === "followers" ? getFollowersOf(userId) : getFollowingOf(userId);
    load.then((r) => {
      if (alive) setItems(r);
    });
    return () => {
      alive = false;
    };
  }, [userId, mode]);

  // Close the row menu on outside click.
  useEffect(() => {
    if (!menuFor) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuFor(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuFor]);

  const onRemove = async (p: FollowerNotice) => {
    setMenuFor(null);
    const name = p.display_name || p.username || "this person";
    const ok = await confirm({
      title: "Remove follower?",
      message: `${name} will no longer follow you. They can follow you again later.`,
      danger: true,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    const prev = items;
    setItems((cur) => (cur ? cur.filter((x) => x.id !== p.id) : cur));
    const res = await removeFollower(p.id);
    if (!res.ok) {
      setItems(prev ?? null); // rollback
      await confirm({ title: "Couldn't remove", message: res.error, confirmLabel: "OK" });
    }
  };

  const title = mode === "followers" ? "Followers" : "Following";

  return (
    <Sheet title={title} onClose={onClose}>
      <div ref={rootRef}>
        {items === null ? (
          <p className="notif-empty">Loading…</p>
        ) : items.length === 0 ? (
          <p className="notif-empty">
            {mode === "followers" ? "No followers yet." : "Not following anyone yet."}
          </p>
        ) : (
          <div className="folllist">
            {items.map((p) => {
              const name = p.display_name || p.username || "Athlete";
              return (
                <div className="folllist-row" key={p.id}>
                  <Link
                    href={p.username ? `/u/${p.username}` : "#"}
                    className="folllist-who"
                    onClick={onClose}
                  >
                    <Avatar src={p.avatar_url} name={name} size={40} />
                    <span className="folllist-text">
                      <span className="folllist-name">{name}</span>
                      {p.username && <span className="folllist-handle">@{p.username}</span>}
                    </span>
                  </Link>
                  {user?.id !== p.id && (
                    <FollowButton targetId={p.id} initialFollowing={p.youFollow} size="sm" />
                  )}
                  {canRemove && user?.id !== p.id && (
                    <div className="folllist-menu">
                      <button
                        className="folllist-menu-btn"
                        aria-label="More"
                        onClick={() => setMenuFor((m) => (m === p.id ? null : p.id))}
                      >
                        ⋯
                      </button>
                      {menuFor === p.id && (
                        <div className="folllist-menu-pop" role="menu">
                          <button className="folllist-menu-item" onClick={() => onRemove(p)}>
                            Remove follower
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}
