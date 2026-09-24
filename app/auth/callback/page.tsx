"use client";

// OAuth redirect target. The default signInWithOAuth flow is PKCE with the code
// verifier held in the browser, so the exchange must happen client-side — a server
// route handler can't see the verifier. We let supabase-js (detectSessionInUrl)
// finalize the session on mount, then send the user home. If Supabase is
// unconfigured or something goes wrong, we still redirect home (no dead end).
import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { setAuthPending } from "@/lib/authPending";

export default function AuthCallbackPage() {
  useEffect(() => {
    const sb = getSupabase();
    // Show the global sign-in overlay (backdrop + spinner) instead of a blank
    // flash while supabase finalizes the session. The destination's useAuth
    // clears it once the session resolves.
    setAuthPending(true, "Signing you in…");
    const home = () => window.location.replace("/");
    if (!sb) {
      home();
      return;
    }
    // detectSessionInUrl processes ?code= asynchronously; wait for the resulting
    // session (or a definitive no-session) before leaving this page.
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") home();
    });
    sb.auth.getSession().then(({ data }) => {
      if (data.session) home();
    });
    const t = window.setTimeout(home, 4000); // safety net
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        color: "var(--muted)",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      Signing you in…
    </main>
  );
}
