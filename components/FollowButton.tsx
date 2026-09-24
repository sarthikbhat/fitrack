"use client";

// Reusable Follow / Following toggle. Shared by the public profile page and the
// "Find people" search rows. Optimistic: it flips state immediately on click and
// rolls back if the write fails. Signed-out visitors are prompted to sign in with
// Google via the confirm dialog. Never renders for your own row (callers hide it,
// but it also self-guards). Degrades to a no-op label when Supabase is unconfigured.
import { useEffect, useRef, useState } from "react";
import { useAuth, signInWithGoogle } from "@/lib/auth";
import { followUser, unfollowUser, isFollowing } from "@/lib/social";
import { useConfirm } from "@/components/ConfirmProvider";

export function FollowButton({
  targetId,
  initialFollowing,
  size,
  onChange,
}: {
  targetId: string;
  /** Optional known follow-state to seed from (skips the initial fetch flash). */
  initialFollowing?: boolean;
  size?: "sm";
  /** Notified after a successful toggle, e.g. to update a follower count. */
  onChange?: (following: boolean) => void;
}) {
  const { user, status } = useAuth();
  const confirm = useConfirm();
  const [following, setFollowing] = useState(Boolean(initialFollowing));
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);
  const seeded = useRef(initialFollowing !== undefined);

  const isSelf = status === "signed-in" && user?.id === targetId;

  // Load the real follow-state once signed in (unless a seed was provided). All
  // state updates run inside the async closure (never synchronously in the effect
  // body) to avoid cascading renders.
  useEffect(() => {
    let active = true;
    void (async () => {
      if (status !== "signed-in" || isSelf) {
        if (active) setFollowing(false);
        return;
      }
      if (seeded.current) return;
      const f = await isFollowing(targetId);
      if (active) setFollowing(f);
    })();
    return () => {
      active = false;
    };
  }, [status, isSelf, targetId]);

  // Never offer to follow yourself, and hide entirely when there's no backend.
  if (isSelf || status === "unconfigured") return null;

  const cls = `btn follow-btn${following ? " following" : " primary"}${size === "sm" ? " sm" : ""}`;

  async function onClick() {
    if (busy) return;

    // Signed out → prompt Google sign-in, then bail (they resume after redirect).
    if (status !== "signed-in") {
      const ok = await confirm({
        title: "Sign in to follow",
        message: "Follow athletes and build your feed. Sign in with Google to continue.",
        confirmLabel: "Sign in with Google",
      });
      if (ok) void signInWithGoogle();
      return;
    }

    const next = !following;
    setFollowing(next); // optimistic
    setBusy(true);
    const res = next ? await followUser(targetId) : await unfollowUser(targetId);
    setBusy(false);
    if (!res.ok) {
      setFollowing(!next); // rollback
      await confirm({
        title: "Something went wrong",
        message: res.error,
        confirmLabel: "OK",
        cancelLabel: "Dismiss",
      });
      return;
    }
    onChange?.(next);
  }

  // Following buttons read "Following" at rest and "Unfollow" on hover/focus.
  const label = following ? (hover ? "Unfollow" : "Following") : "Follow";

  return (
    <button
      className={cls}
      onClick={onClick}
      disabled={busy}
      aria-pressed={following}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      {label}
    </button>
  );
}
