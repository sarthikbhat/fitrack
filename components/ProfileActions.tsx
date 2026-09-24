"use client";

// Interactive actions on the public profile page. If the viewer is the profile's
// owner → "Edit profile" (opens the Settings sheet, which hosts the editor).
// Otherwise → a real Follow / Following toggle (FollowButton), which prompts a
// signed-out visitor to sign in with Google before following.
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/components/SettingsProvider";
import { FollowButton } from "@/components/FollowButton";

export function ProfileActions({
  profileId,
  onFollowChange,
}: {
  profileId: string;
  /** Bubbles follow toggles up so the page can adjust the follower count. */
  onFollowChange?: (following: boolean) => void;
}) {
  const { user, status } = useAuth();
  const { openSettings } = useSettings();
  const isOwner = status === "signed-in" && user?.id === profileId;

  if (isOwner) {
    return (
      <button className="btn" onClick={() => openSettings()}>
        Edit profile
      </button>
    );
  }
  return <FollowButton targetId={profileId} onChange={onFollowChange} />;
}
