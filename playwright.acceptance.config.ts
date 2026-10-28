import { defineConfig, devices } from "@playwright/test";

import base from "./playwright.config";

/**
 * The Phase 1 acceptance run (brief §11), on its own because it takes a
 * while: `npm run test:acceptance`.
 */
export default defineConfig({
  ...base,
  testDir: "./e2e/acceptance",
  testIgnore: [],
  retries: 0,
  timeout: 45 * 60_000,
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
