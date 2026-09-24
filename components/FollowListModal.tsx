"use client";

// Followers / Following list, shown when you tap a count on a profile. Each row
// links to that person's profile and carries a Follow/Unfollow toggle (reusing
// FollowButton), so you can unfollow people you follow straight from the list.
// Note: you can only unfollow people YOU follow - removing one of your own
// followers isn't possible (the follow graph is follower-owned).
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/Sheet";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/lib/auth";
import { getFollowersOf, getFollowingOf, type FollowerNotice } from "@/lib/social";

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
  const [items, setItems] = useState<FollowerNotice[] | null>(null);

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

  const title = mode === "followers" ? "Followers" : "Following";

  return (
    <Sheet title={title} onClose={onClose}>
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
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
