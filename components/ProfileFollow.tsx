"use client";

// Client island for the profile hero's social block: follower / following counts
// stacked above the Follow / Edit action. Co-located so a follow toggle can bump
// the follower count optimistically. Seeded with the SSR-computed counts so the
// numbers paint immediately (no flash), then adjusted on the client as the viewer
// follows / unfollows.
import { useState } from "react";
import { ProfileActions } from "@/components/ProfileActions";

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

  return (
    <div className="profile-social">
      <div className="follow-counts">
        <span className="follow-count">
          <b>{count}</b> {count === 1 ? "follower" : "followers"}
        </span>
        <span className="follow-count">
          <b>{following}</b> following
        </span>
      </div>
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
