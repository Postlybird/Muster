import { expect, test } from "@playwright/test";

import {
  randomEmail,
  randomMobile,
  readCodeFromOutbox,
  signInAsNewWorker,
} from "./helpers";

test.describe("sign-in", () => {
  test("a new worker signs up with an SMS code and lands in the worker area", async ({
    page,
  }) => {
    const mobile = randomMobile();
    await page.goto("/");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Find work" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Find work" }),
    ).toBeVisible();

    await page.getByLabel("Mobile number").fill(mobile.local);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(
      page.getByRole("heading", { name: "Enter your code" }),
    ).toBeVisible();

    const code = await readCodeFromOutbox(page, mobile.e164);
    await page.getByLabel("6-digit code").fill(code);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/worker$/);
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Let's get you set up" }),
    ).toBeVisible();
  });

  test("a new business signs up with an email code and lands in the business area", async ({
    page,
  }) => {
    const email = randomEmail("owner");
    await page.goto("/login?as=business");
    await expect(
      page.getByRole("heading", { name: "Hire staff" }),
    ).toBeVisible();

    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send code" }).click();

    const code = await readCodeFromOutbox(page, email);
    await page.getByLabel("6-digit code").fill(code);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/business$/);
  });

  test("a wrong code is rejected with a clear message", async ({ page }) => {
    const mobile = randomMobile();
    await page.goto("/login?as=worker");
    await page.getByLabel("Mobile number").fill(mobile.local);
    await page.getByRole("button", { name: "Send code" }).click();
    await page.getByLabel("6-digit code").fill("000000");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That code didn't work")).toBeVisible();
  });

  test("a non-Australian mobile is rejected before sending", async ({
    page,
  }) => {
    await page.goto("/login?as=worker");
    await page.getByLabel("Mobile number").fill("+1 415 555 0100");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(
      page.getByText("Enter an Australian mobile number"),
    ).toBeVisible();
  });

  test("the sign-in link in the email works too", async ({ page }) => {
    const email = randomEmail("link");
    await page.goto("/login?as=business");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(
      page.getByRole("heading", { name: "Enter your code" }),
    ).toBeVisible();

    await page.goto(`/dev/outbox?to=${encodeURIComponent(email)}`);
    await page.getByRole("link", { name: "Open sign-in link" }).first().click();

    // Opening the link alone doesn't sign in (email scanners open links too).
    await expect(
      page.getByRole("heading", { name: /^Sign in to / }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/business$/);
  });

  test("signed-out visitors are sent to sign in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });

  test("a worker can't open the admin or business areas", async ({ page }) => {
    await signInAsNewWorker(page);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/worker$/);
    await page.goto("/business");
    await expect(page).toHaveURL(/\/worker$/);

    // Sign out is in Settings, which is always on show.
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/worker");
    await expect(page).toHaveURL(/\/login/);
  });
});
