import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: almost every page is per-user and
  // holds personal data, so we render on each request (see PROGRESS.md).
  poweredByHeader: false,
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
