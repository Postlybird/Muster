import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: almost every page is per-user and
  // holds personal data, so we render on each request (see PROGRESS.md).
  poweredByHeader: false,
  // The dev-only badge covers buttons at the bottom of phone-sized screens
  // in local browser tests. Build and runtime errors still show.
  devIndicators: false,
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
