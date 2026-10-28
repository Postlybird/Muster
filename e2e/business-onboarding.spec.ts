import { expect, test } from "@playwright/test";

import {
  expectAccessible,
  randomAbn,
  randomEmail,
  readCodeFromOutbox,
  signInAsDemo,
  signInAsNewBusiness,
} from "./helpers";

test("a business owner sets up their account and submits it", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInAsNewBusiness(page);
  await expect(
    page.getByRole("heading", { name: "Set up your business" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Start" }).click();

  // ABN: invalid, cancelled, then a good one.
  await expect(page).toHaveURL(/\/business\/onboarding\/abn$/);
  await page.getByLabel("ABN").fill("12 345 678 901");
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText(/isn't a valid ABN/)).toBeVisible();
  await page.getByLabel("ABN").fill("74 077 011 037");
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText(/This ABN was cancelled/)).toBeVisible();
  const abn = randomAbn();
  await page.getByLabel("ABN").fill(abn);
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(
    page.getByText(`DEMO BUSINESS ${abn.slice(-4)} PTY LTD`),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "This is my business" }).click();

  // Billing contact
  await expect(page).toHaveURL(/\/details$/);
  await page.getByLabel("Billing contact").fill("Robin Accounts");
  await page.getByLabel("Their phone").fill("02 5550 1234");
  await page.getByLabel("Accounts email").fill(randomEmail("accounts"));
  await expectAccessible(page);
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Sites: can't continue without one.
  await expect(page).toHaveURL(/\/sites$/);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Add at least one site.")).toBeVisible();
  await page.getByLabel("Site name").fill("Main warehouse");
  await page
    .getByRole("combobox", { name: "Street address" })
    .fill("12 George St, Parramatta");
  await page.getByRole("option", { name: /12 George St, Parramatta/ }).click();
  await page
    .getByLabel(/Access instructions/)
    .fill("Ring the bell at the side door.");
  await page.getByRole("button", { name: "Add site" }).click();
  await expect(page.getByText("Main warehouse added")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Add another site" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Continue" }).click();

  // Team: invite a manager.
  await expect(page).toHaveURL(/\/team$/);
  const managerEmail = randomEmail("manager");
  await page.getByLabel("Email address").fill(managerEmail);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(`Invite sent to ${managerEmail}`)).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Continue" }).click();

  // Agreement
  await expect(page).toHaveURL(/\/agreement$/);
  await page.getByRole("button", { name: "Accept and continue" }).click();
  await expect(
    page.getByText("Tick the box to accept the agreement").first(),
  ).toBeVisible();
  await page.getByLabel(/I accept this agreement/).check();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Accept and continue" }).click();

  // Submit
  await expect(page).toHaveURL(/\/submit$/);
  await expectAccessible(page);
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page).toHaveURL(/\/business\?submitted=1$/);
  await expect(page.getByText("Awaiting approval")).toBeVisible();

  // The invited manager signs in and joins.
  await page.context().clearCookies();
  await page.goto("/login?as=business");
  await page.getByLabel("Email address").fill(managerEmail);
  await page.getByRole("button", { name: "Send code" }).click();
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, managerEmail));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/business$/);
  await expect(
    page.getByRole("heading", { name: `Demo Business ${abn.slice(-4)}` }),
  ).toBeVisible();
});

test("an ABN that's already registered is turned away", async ({ page }) => {
  await signInAsNewBusiness(page);
  await page.goto("/business/onboarding/abn");
  await page.getByLabel("ABN").fill("90 551 661 605");
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText(/already has an account/)).toBeVisible();
});

test("a seeded owner sees their approved business", async ({ page }) => {
  await signInAsDemo(page, "Mark Davies");
  await expect(
    page.getByRole("heading", { name: "Harbour Restoration" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Post work" }),
  ).toBeVisible();
});
