"use client";

// Visible account presence. Two placements share one component:
//   variant="sidebar" → full block at the bottom of the desktop left rail
//                        (avatar + display name + @username), opens a menu.
//   variant="header"  → compact top-right avatar/sign-in button on mobile.
// Signed-out shows a prominent "Sign in"; unconfigured renders nothing.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { useAuth, signInWithGoogle, signOut } from "@/lib/auth";
import { useMyProfile } from "@/lib/useMyProfile";
import { useSettings } from "@/components/SettingsProvider";
import { useConfirm } from "@/components/ConfirmProvider";

export function AccountControl({ variant }: { variant: "sidebar" | "header" }) {
  const { status, email, loading } = useAuth();
  const { profile } = useMyProfile();
  const { openSettings } = useSettings();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Unconfigured: no backend, so no account affordance at all.
  if (status === "unconfigured") return null;

  const displayName = profile?.display_name || email || "Athlete";
  const username = profile?.username ?? null;

  // --- signed out: a prominent call to action ---
  if (status === "signed-out") {
    if (variant === "header") {
      return (
        <button
          className="acct-signin-mini"
          disabled={loading}
          onClick={() => signInWithGoogle()}
        >
          Sign in
        </button>
      );
    }
    return (
      <div className="acct-signin">
        <button className="btn primary" disabled={loading} onClick={() => signInWithGoogle()}>
          Sign in
        </button>
        <span className="acct-signin-sub">Sync &amp; share your training</span>
      </div>
    );
  }

  // --- signed in: avatar + name, opens a menu ---
  const menu = open && (
    <div className={`acct-menu acct-menu-${variant}`} role="menu">
      {username ? (
        <Link
          href={`/u/${username}`}
          className="acct-menu-item"
          role="menuitem"
          onClick={() => setOpen(false)}
        >
          View profile
        </Link>
      ) : (
        <button
          className="acct-menu-item"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            openSettings();
          }}
        >
          Set up profile
        </button>
      )}
      <Link
        href="/feed"
        className="acct-menu-item"
        role="menuitem"
        onClick={() => setOpen(false)}
      >
        Feed
      </Link>
      <Link
        href="/people"
        className="acct-menu-item"
        role="menuitem"
        onClick={() => setOpen(false)}
      >
        Find people
      </Link>
      <button
        className="acct-menu-item"
        role="menuitem"
        onClick={() => {
          setOpen(false);
          openSettings();
        }}
      >
        Settings
      </button>
      <button
        className="acct-menu-item danger"
        role="menuitem"
        onClick={async () => {
          setOpen(false);
          const ok = await confirm({
            title: "Sign out?",
            message: "You'll stop syncing on this device. Your data stays saved locally.",
            confirmLabel: "Sign out",
          });
          if (ok) void signOut();
        }}
      >
        Sign out
      </button>
    </div>
  );

  if (variant === "header") {
    return (
      <div className="acct-root" ref={rootRef}>
        <button
          className="acct-avatar-btn"
          aria-label="Account"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Avatar src={profile?.avatar_url} name={displayName} size={30} />
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div className="acct-root acct-root-sidebar" ref={rootRef}>
      <button
        className="acct-block"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar src={profile?.avatar_url} name={displayName} size={34} />
        <span className="acct-block-text">
          <span className="acct-name">{displayName}</span>
          {username && <span className="acct-username">@{username}</span>}
        </span>
      </button>
      {menu}
    </div>
  );
}
