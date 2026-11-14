/**
 * Screenshots for the App Store and Google Play listings (docs/apps.md),
 * taken from the demo at the sizes each store asks for, without the demo
 * banner. The people and businesses in them are the demo's made-up ones.
 *
 *   npm run app:screenshots            (the app on http://localhost:3000)
 *   SCREENSHOTS_URL=https://... npm run app:screenshots
 */
import { mkdirSync } from "node:fs";

import { chromium, type Page } from "@playwright/test";

const base = process.env.SCREENSHOTS_URL ?? "http://localhost:3000";

/** Apple's 6.9-inch iPhone size, and a 9:16 phone size Google Play takes. */
const SIZES = [
  { store: "apple", width: 440, height: 956 },
  { store: "google", width: 360, height: 640 },
] as const;

const HIDE_DEMO = `[data-demo-banner]{display:none!important}body{--banner-h:0px!important}`;

async function signIn(page: Page, name: string) {
  await page.goto(`${base}/login`);
  const button = page.getByRole("button", { name: new RegExp(name) });
  if (!(await button.isVisible())) {
    await page.getByText(/Worker accounts/).click();
  }
  await button.click();
  await page.waitForURL(/\/(admin|business|worker)$/);
}

async function shot(page: Page, dir: string, file: string, path: string) {
  await page.goto(`${base}${path}`);
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({ content: HIDE_DEMO });
  await page.screenshot({ path: `${dir}/${file}.png` });
  console.log("wrote", `${dir}/${file}.png`);
}

async function main() {
  const browser = await chromium.launch();
  for (const size of SIZES) {
    const dir = `docs/store/screenshots/${size.store}`;
    mkdirSync(dir, { recursive: true });

    const worker = await browser.newPage({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await signIn(worker, "Ahmed Hassan");
    await shot(worker, dir, "1-home", "/worker");
    await shot(worker, dir, "2-find-shifts", "/worker/shifts");
    const first = worker.locator('a[href^="/worker/shifts/"]').first();
    const href = await first.getAttribute("href");
    if (href) await shot(worker, dir, "3-shift", href);
    await shot(worker, dir, "4-my-shifts", "/worker/my-shifts");
    await shot(worker, dir, "5-timesheets", "/worker/timesheets");
    await worker.close();

    const business = await browser.newPage({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await signIn(business, "Mark Davies");
    await shot(business, dir, "6-business", "/business");
    await shot(business, dir, "7-post-work", "/business/post");
    await business.close();
  }
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
