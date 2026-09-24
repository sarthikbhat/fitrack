"use client";

// Interactive actions on the public profile page. If the viewer is the profile's
// owner → "Edit profile" (opens the Settings sheet, which hosts the editor).
// Otherwise → a disabled "Follow" placeholder (real follow lands in a later plan).
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/components/SettingsProvider";

export function ProfileActions({ profileId }: { profileId: string }) {
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
  return (
    <button className="btn" disabled title="Coming soon">
      Follow
    </button>
  );
}
