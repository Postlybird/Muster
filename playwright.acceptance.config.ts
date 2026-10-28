import { defineConfig, devices } from "@playwright/test";

import base from "./playwright.config";

/**
 * The Phase 1 acceptance run (brief §11): one long test, on desktop only,
 * with no retries. `npm run test:acceptance`; CI runs it as its own job.
 */
export default defineConfig({
  ...base,
  testDir: "./e2e/acceptance",
  testIgnore: [],
  retries: 0,
  timeout: 20 * 60_000,
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
