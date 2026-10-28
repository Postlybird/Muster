import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    passWithNoTests: true,
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    // Servers run in UTC (Vercel), so tests do too: code must convert to
    // Australia/Sydney explicitly rather than relying on the machine's zone.
    env: { TZ: "UTC" },
  },
});
