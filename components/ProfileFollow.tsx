"use client";

// Client island for the profile hero's social block: follower / following counts
// stacked above the Follow / Edit action. Co-located so a follow toggle can bump
// the follower count optimistically. Seeded with the SSR-computed counts so the
// numbers paint immediately (no flash), then adjusted on the client as the viewer
// follows / unfollows.
import { useState } from "react";
import { ProfileActions } from "@/components/ProfileActions";
import { FollowListModal } from "@/components/FollowListModal";

export function ProfileFollow({
  profileId,
  followers,
  following,
}: {
  profileId: string;
  followers: number;
  following: number;
}) {
  const [count, setCount] = useState(followers);
  const [list, setList] = useState<"followers" | "following" | null>(null);

  return (
    <div className="profile-social">
      <div className="follow-counts">
        <button type="button" className="follow-count" onClick={() => setList("followers")}>
          <b>{count}</b> {count === 1 ? "follower" : "followers"}
        </button>
        <button type="button" className="follow-count" onClick={() => setList("following")}>
          <b>{following}</b> following
        </button>
      </div>
      {list && (
        <FollowListModal userId={profileId} mode={list} onClose={() => setList(null)} />
      )}
      <div className="profile-actions">
        <ProfileActions
          profileId={profileId}
          onFollowChange={(isFollowing) =>
            setCount((c) => Math.max(0, c + (isFollowing ? 1 : -1)))
          }
        />
      </div>
    </div>
  );
}
