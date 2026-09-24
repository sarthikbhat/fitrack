"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/data/icons";
import { NAV } from "@/lib/nav";
import { useSettings } from "@/components/SettingsProvider";

// Desktop-only left rail. Hidden < 900px via CSS (.sidebar); the mobile BottomNav
// covers the same routes. Purely CSS-toggled, so it renders on server + client alike.
export function Sidebar() {
  const path = usePathname();
  const { openSettings } = useSettings();
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
      <button className="snav-item snav-foot" onClick={openSettings}>
        <Icon name="gear" />
        <span>Settings</span>
      </button>
    </aside>
  );
}
