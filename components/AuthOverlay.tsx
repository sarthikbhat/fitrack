"use client";

// Full-screen sign-in progress overlay. Google OAuth is a full-page redirect out
// and back, so without this the app just blinks to blank and reloads. We show a
// blurred backdrop + spinner from the moment sign-in is clicked until the session
// resolves on the destination. Mounted globally in AppShell; renders only while
// auth is pending. Styled inline (globals.css is owned by another task) but reuses
// the existing `.spinner` class, which already respects prefers-reduced-motion.
import { useEffect } from "react";
import { setAuthPending, useAuthPending } from "@/lib/authPending";

export function AuthOverlay() {
  const { pending, message } = useAuthPending();

  // Safety net: if auth never resolves (hung redirect, silent failure), don't
  // leave the backdrop stuck forever. Restarts whenever pending flips on.
  useEffect(() => {
    if (!pending) return;
    const t = window.setTimeout(() => setAuthPending(false), 8000);
    return () => window.clearTimeout(t);
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000, // above every modal/picker/rest bar
        display: "grid",
        placeItems: "center",
        background: "color-mix(in srgb, var(--bg) 72%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "24px 32px",
          borderRadius: 16,
          background: "var(--panel)",
          border: "1px solid var(--line2, var(--line))",
          boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
          color: "var(--text)",
        }}
      >
        <span className="spinner" style={{ transform: "scale(2)", margin: 6 }} aria-hidden="true" />
        <span style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text)" }}>{message}</span>
      </div>
    </div>
  );
}
