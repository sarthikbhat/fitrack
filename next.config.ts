import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this repo (a stray lockfile sits above it).
  outputFileTracingRoot: process.cwd(),
  // Inline the (public) Supabase env vars into the CLIENT bundle. The Vercel vars
  // are unprefixed (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY), and a browser can
  // only see env vars that Next inlines - bare `process.env.X` reads are undefined
  // client-side otherwise. next.config runs at build with access to every env var,
  // so we resolve each name here (accepting bare, PUBLIC_, or NEXT_PUBLIC_ spellings)
  // and inline it. Both the bare and NEXT_PUBLIC_ keys are emitted so the client
  // works whichever spelling the code reads. Empty string when unconfigured, so
  // isSupabaseConfigured() stays false and the app runs local-first.
  // NOTE: the service-role key is deliberately NOT here - it must never reach the
  // client; server code reads process.env.SUPABASE_SERVICE_ROLE_KEY at runtime.
  env: {
    SUPABASE_URL:
      process.env.SUPABASE_URL ??
      process.env.PUBLIC_SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      "",
    SUPABASE_PUBLISHABLE_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      "",
    SUPABASE_ANON_KEY:
      process.env.SUPABASE_ANON_KEY ??
      process.env.PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "",
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
};

// Serwist injects a *webpack* plugin. Next 16 dev defaults to Turbopack, which
// errors when a webpack config is present - so apply Serwist ONLY for the
// production build (`next build --webpack`), and leave dev on clean Turbopack.
const isDev = process.env.NODE_ENV === "development";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

export default isDev ? nextConfig : withSerwist(nextConfig);
