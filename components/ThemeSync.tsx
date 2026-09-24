"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function ThemeSync() {
  const theme = useStore((s) => s.profile?.theme ?? "dark");
  const accent = useStore((s) => s.profile?.accent);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    // Apply the chosen accent as a root override; falling back to the CSS token default.
    const root = document.documentElement;
    if (accent) {
      root.style.setProperty("--accent", accent);
      root.style.setProperty("--accentGlow", `color-mix(in srgb, ${accent} 22%, transparent)`);
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accentGlow");
    }
  }, [accent]);
  return null;
}
