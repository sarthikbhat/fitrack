import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this repo (a stray lockfile sits above it).
  outputFileTracingRoot: process.cwd(),
  // Bridge the Supabase env vars to the NEXT_PUBLIC_ names the client reads.
  // The Supabase↔Vercel integration injects *unprefixed* managed vars
  // (SUPABASE_URL / SUPABASE_ANON_KEY) that can't be renamed, and a browser can
  // only see NEXT_PUBLIC_* vars. next.config runs at build with access to every
  // env var, so we resolve here (preferring an explicit prefixed var if set) and
  // inline the result into the client bundle. Empty string when unconfigured, so
  // isSupabaseConfigured() stays false and the app runs local-first.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      process.env.PUBLIC_SUPABASE_URL ??
      process.env.SUPABASE_URL ??
      "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      "",
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
