import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated service worker (serwist build output of app/sw.ts) — not hand-written source.
    "public/sw.js",
    // Legacy pre-Next single-file app, kept for reference only.
    "legacy/**",
  ]),
]);

export default eslintConfig;
