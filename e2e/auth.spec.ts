import { expect, test } from "@playwright/test";

import {
  enterEmailedCode,
  randomEmail,
  readCodeFromOutbox,
  signInAsNewWorker,
} from "./helpers";

test.describe("sign-in", () => {
  test("a new worker signs up with an email code and lands in the worker area", async ({
    page,
  }) => {
    const email = randomEmail("worker");
    await page.goto("/");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Find work" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Find work" }),
    ).toBeVisible();
    // Email only: there's no mobile sign-in (owner, 31/10/2026).
    await expect(page.getByLabel("Mobile number")).toHaveCount(0);

    await page.getByLabel("Email address").fill(email);
    const sentAfter = new Date();
    await page.getByRole("button", { name: "Email me a code" }).click();
    await enterEmailedCode(page, email, sentAfter);

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
      page.getByRole("heading", { level: 1, name: "Hire staff" }),
    ).toBeVisible();

    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    await expect(
      page.getByText(`We sent a 6-digit code to ${email}`),
    ).toBeVisible();

    const code = await readCodeFromOutbox(page, email);
    await page.getByLabel("6-digit code").fill(code);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/business$/);
  });

  test("a wrong code is rejected with a clear message", async ({ page }) => {
    await page.goto("/login?as=worker");
    await page.getByLabel("Email address").fill(randomEmail("wrong"));
    await page.getByRole("button", { name: "Email me a code" }).click();
    await page.getByLabel("6-digit code").fill("000000");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That code didn't work")).toBeVisible();
  });

  test("a mistyped email address is caught before sending", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("casey@example");
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(
      page.getByText("Enter an email address, like name@example.com."),
    ).toBeVisible();
    await expect(page.getByLabel("6-digit code")).toHaveCount(0);
  });

  test("the sign-in link in the email works too", async ({ page }) => {
    const email = randomEmail("link");
    await page.goto("/login?as=business");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(
      page.getByRole("heading", { name: "Check your email" }),
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
