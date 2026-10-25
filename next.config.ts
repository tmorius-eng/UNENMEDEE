import type { NextConfig } from "next";

import { TOPICS } from "./src/lib/topics";

// Feed filters that moved from "/?f=<key>" to static "/topic/<key>" pages.
const TOPIC_KEYS = ["risk", "budget", "ministry", ...TOPICS.map((t) => t.key)];

const nextConfig: NextConfig = {
  // The demo database (`npm run demo`) is loaded from node_modules at run time, never bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // sharp + libvips (glibc, musl and wasm builds, ~35 MB) were traced into every server
  // function. Vercel optimizes next/image on its own infrastructure and next/og uses Satori, so
  // no function needs them; with ~40 functions per deployment they filled the 10 GB Hobby
  // "Functions Storage".
  outputFileTracingExcludes: {
    "/**": ["node_modules/sharp/**", "node_modules/@img/**"],
    "/*": ["node_modules/sharp/**", "node_modules/@img/**"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [{ source: "/", has: [{ type: "query", key: "f", value: `(?<f>${TOPIC_KEYS.join("|")})` }], destination: "/topic/:f", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // The directives that cost nothing. No script-src on purpose: Next.js needs inline
          // scripts, and nonces would make every static page dynamic (no CDN, slower LCP).
          { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests" },
        ],
      },
      {
        // The service worker must never be cached, or users get stuck on an old version.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
