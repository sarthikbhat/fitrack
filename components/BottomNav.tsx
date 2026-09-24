"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/data/icons";
import { NAV } from "@/lib/nav";

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Primary">
      {NAV.map(([href, label, icon]) => (
        <Link
          key={href}
          href={href}
          className={`tab${path === href ? " active" : ""}`}
          aria-current={path === href ? "page" : undefined}
        >
          <Icon name={icon} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
