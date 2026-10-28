import { test } from "@playwright/test";

import {
  expectAccessible,
  signInAsNewBusiness,
  signInAsNewWorker,
} from "./helpers";

test.describe("accessibility (WCAG 2.1 AA)", () => {
  for (const path of [
    "/",
    "/login",
    "/login?as=business",
    "/privacy",
    "/terms",
    "/faq",
    "/contact",
    "/dev/ui",
    "/dev/ui/wizard",
    "/dev/outbox",
  ]) {
    test(`public page ${path}`, async ({ page }) => {
      await page.goto(path);
      await expectAccessible(page);
    });
  }

  test("sign-in code step", async ({ page }) => {
    await page.goto("/login?as=worker");
    await page.getByLabel("Mobile number").fill("0412 345 678");
    await page.getByRole("button", { name: "Send code" }).click();
    await page.getByLabel("6-digit code").waitFor();
    await expectAccessible(page);
  });

  test("worker area", async ({ page }) => {
    await signInAsNewWorker(page);
    await expectAccessible(page);
    await page.goto("/worker/shifts");
    await expectAccessible(page);
  });

  test("business area", async ({ page }) => {
    await signInAsNewBusiness(page);
    await expectAccessible(page);
    await page.goto("/business/jobs");
    await expectAccessible(page);
  });
});
