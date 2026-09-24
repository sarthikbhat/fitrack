// Standalone layout for the legal pages (Privacy Policy, Terms of Service).
// Rendered outside the app shell (AppShell bypasses the onboarding gate for
// /legal/*), so these pages are viewable by signed-out, data-less visitors -
// e.g. from the Google OAuth consent screen or an app listing. It provides its
// own minimal header + footer and cross-links the two documents.
import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="share-page">
      <header className="share-top">
        <div className="share-top-inner">
          <Link href="/" className="brand" style={{ textDecoration: "none" }}>
            Fitrack
          </Link>
          <Link href="/" className="chip" style={{ textDecoration: "none" }}>
            Back to app
          </Link>
        </div>
      </header>

      <main className="share-main">
        <article className="panel legal">{children}</article>
        <nav className="legal-foot">
          <Link href="/legal/privacy">Privacy Policy</Link>
          <span aria-hidden>·</span>
          <Link href="/legal/terms">Terms of Service</Link>
        </nav>
      </main>
    </div>
  );
}
