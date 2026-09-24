"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/data/icons";
import { NAV } from "@/lib/nav";
import { useSettings } from "@/components/SettingsProvider";
import { AccountControl } from "@/components/AccountControl";
import { useAuth } from "@/lib/auth";
import { NotificationsBell } from "@/components/NotificationsBell";

// Desktop-only left rail. Hidden < 900px via CSS (.sidebar); the mobile BottomNav
// covers the same routes. Purely CSS-toggled, so it renders on server + client alike.
export function Sidebar() {
  const path = usePathname();
  const { openSettings } = useSettings();
  const { status } = useAuth();
  return (
    <aside className="sidebar" aria-label="Primary">
      <Link href="/" className="sidebar-brand">
        <span className="sidebar-mark">
          <Icon name="dumbbell" />
        </span>
        Fitrack
      </Link>
      <nav className="snav">
        {NAV.map(([href, label, icon]) => (
          <Link
            key={href}
            href={href}
            className={`snav-item${path === href ? " active" : ""}`}
            aria-current={path === href ? "page" : undefined}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="snav-foot">
        {status === "signed-in" && <NotificationsBell variant="sidebar" />}
        <Link
          href="/feed"
          className={`snav-item${path === "/feed" ? " active" : ""}`}
          aria-current={path === "/feed" ? "page" : undefined}
        >
          <Icon name="feed" />
          <span>Feed</span>
        </Link>
        {status === "signed-in" && (
          <Link
            href="/people"
            className={`snav-item${path === "/people" ? " active" : ""}`}
            aria-current={path === "/people" ? "page" : undefined}
          >
            <Icon name="people" />
            <span>Find people</span>
          </Link>
        )}
        <button className="snav-item" onClick={openSettings}>
          <Icon name="gear" />
          <span>Settings</span>
        </button>
        <AccountControl variant="sidebar" />
        <div className="snav-legal">
          <Link href="/legal/privacy">Privacy</Link>
          <span aria-hidden>·</span>
          <Link href="/legal/terms">Terms</Link>
        </div>
      </div>
    </aside>
  );
}
