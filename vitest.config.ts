import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    passWithNoTests: true,
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    // Servers run in UTC (Vercel), so tests do too: code must convert to
    // Australia/Sydney explicitly rather than relying on the machine's zone.
    env: { TZ: "UTC" },
  },
});
