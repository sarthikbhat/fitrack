import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this repo (a stray lockfile sits above it).
  outputFileTracingRoot: process.cwd(),
};

// Serwist injects a *webpack* plugin. Next 16 dev defaults to Turbopack, which
// errors when a webpack config is present — so apply Serwist ONLY for the
// production build (`next build --webpack`), and leave dev on clean Turbopack.
const isDev = process.env.NODE_ENV === "development";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

export default isDev ? nextConfig : withSerwist(nextConfig);
