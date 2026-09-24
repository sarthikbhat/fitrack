"use client";

// "Find people" - search public profiles by @username or display name and follow
// them inline. Public read, so results show for signed-out visitors too; the
// Follow button prompts sign-in when tapped. Debounced client-side search over
// the public profiles table (lib/social.searchProfiles). Degrades gracefully when
// Supabase is unconfigured (shows a gentle "search unavailable" note).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { useAuth, signInWithGoogle } from "@/lib/auth";
import { searchProfiles } from "@/lib/social";
import type { Profile } from "@/lib/profile";

export default function PeoplePage() {
  const { status, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const reqId = useRef(0);

  // Debounced search: fire ~250ms after typing stops. Guards against races by
  // tagging each request and only applying the latest. All state updates happen
  // inside the timeout callback (never synchronously in the effect body) to avoid
  // cascading renders - the empty-query reset just runs on a 0ms timer.
  useEffect(() => {
    const q = query.trim();
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      if (!q) {
        if (id !== reqId.current) return;
        setResults([]);
        setSearched(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      const rows = await searchProfiles(q, undefined, { excludeSelf: true });
      if (id !== reqId.current) return; // a newer search superseded this one
      setResults(rows);
      setSearched(true);
      setLoading(false);
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [query]);

  // --- unconfigured: no backend on this device ---
  if (status === "unconfigured") {
    return (
      <main className="people-page">
        <header className="people-head">
          <h1 className="page-title">Find people</h1>
        </header>
        <p className="empty">Search isn&apos;t available on this device yet.</p>
      </main>
    );
  }

  // --- signed out: require sign-in before searching ---
  if (status === "signed-out") {
    return (
      <main className="people-page">
        <header className="people-head">
          <h1 className="page-title">Find people</h1>
        </header>
        <section className="feed-signin panel">
          <h2 className="feed-signin-title">Sign in to find people</h2>
          <p className="feed-signin-sub">
            Search athletes by name or @username and follow them. Sign in with Google to get started.
          </p>
          <button className="btn primary" disabled={authLoading} onClick={() => signInWithGoogle()}>
            Sign in with Google
          </button>
        </section>
      </main>
    );
  }

  // --- signed in ---
  return (
    <main className="people-page">
      <header className="people-head">
        <h1 className="page-title">Find people</h1>
        <p className="people-sub">Search athletes by name or @username and follow them.</p>
      </header>

      <input
        className="search people-search"
        type="search"
        placeholder="Search by name or @username…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        aria-label="Search people"
      />

      <div className="people-results">
        {loading && <p className="empty">Searching…</p>}

        {!loading &&
          results.map((p) => {
            const name = p.display_name || p.username || "Athlete";
            return (
              <div key={p.id} className="people-row panel">
                <Link
                  href={p.username ? `/u/${p.username}` : "#"}
                  className="people-ident"
                >
                  <Avatar src={p.avatar_url} name={name} size={44} />
                  <span className="people-text">
                    <span className="people-name">{name}</span>
                    {p.username && <span className="people-handle">@{p.username}</span>}
                  </span>
                </Link>
                <FollowButton targetId={p.id} size="sm" />
              </div>
            );
          })}

        {!loading && searched && results.length === 0 && (
          <p className="empty">No athletes match “{query.trim()}”.</p>
        )}

        {!loading && !searched && (
          <p className="empty">Start typing to find people to follow.</p>
        )}
      </div>
    </main>
  );
}
