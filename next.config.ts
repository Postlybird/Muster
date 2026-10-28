import type { NextConfig } from "next";

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

export default nextConfig;
