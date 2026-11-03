import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { isLiveBuild, liveSetupProblems } from "./src/lib/live-setup";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: almost every page is per-user and
  // holds personal data, so we render on each request (see PROGRESS.md).
  poweredByHeader: false,
  // The dev-only badge covers buttons at the bottom of phone-sized screens
  // in local browser tests. Build and runtime errors still show.
  devIndicators: false,
  // The service worker (public/sw.js) is always fetched fresh.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
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

/**
 * The live site won't build with anything pretend or missing (owner,
 * 03/11/2026), so a deployment that isn't set up fails and the last good
 * one stays up. The demo, previews and local builds aren't checked.
 */
export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD && isLiveBuild(process.env)) {
    const problems = liveSetupProblems(process.env);
    if (problems.length > 0) {
      throw new Error(
        `The live site isn't set up yet. Set these in Vercel: ${problems.join("; ")}. See .env.example.`,
      );
    }
  }
  return nextConfig;
}
