import { expect, test } from "@playwright/test";

import {
  expectAccessible,
  randomAbn,
  randomEmail,
  registerAs,
  serviceClient,
  signInAsDemo,
} from "./helpers";

test("a business signs up in a minute, then sets up a shift while we check it", async ({
  page,
}) => {
  test.setTimeout(120_000);

  // Register: name, work email, mobile and ABN, then the emailed code.
  await page.goto("/register/business");
  await page.getByLabel("ABN").fill("12 345 678 901");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("Enter your first name")).toBeVisible();
  await expect(page.getByText(/isn't a valid ABN/)).toBeVisible();
  await expectAccessible(page);
  const abn = randomAbn();
  const email = randomEmail("owner");
  await registerAs(page, "business", {
    first: "Jordan",
    last: "Lee",
    email,
    abn,
  });

  // One screen: the business from the register, and the agreement.
  await expect(page).toHaveURL(/\/business\/onboarding$/);
  await expect(
    page.getByText(`DEMO BUSINESS ${abn.slice(-4)} PTY LTD`).first(),
  ).toBeVisible();
  await expect(page.getByText(/Invoices go to Jordan Lee/)).toBeVisible();
  // The wrong business? Another ABN can be tried until they're signed up.
  await expect(
    page.getByRole("button", { name: "Use a different ABN" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(
    page.getByText("Tick the box to accept the agreement").first(),
  ).toBeVisible();
  await page.getByLabel(/I accept the Labour Hire Services Agreement/).check();
  await page.getByRole("button", { name: "Create my account" }).click();

  // Signed up and waiting for us, and our team has heard.
  await expect(page).toHaveURL(/\/business\?submitted=1$/);
  await expect(page.getByText("Awaiting approval")).toBeVisible();
  const { data: alerts } = await serviceClient()
    .from("notifications")
    .select("title")
    .like("title", `New business to approve: Demo Business ${abn.slice(-4)}`);
  expect((alerts ?? []).length).toBeGreaterThan(0);
  await expectAccessible(page);

  // Their first shift, while they wait: the site goes in on the way.
  await page.getByRole("button", { name: "Set up a shift" }).click();
  await expect(page).toHaveURL(/\/business\/post\/[^/]+\/what$/);
  await expect(
    page.getByRole("heading", { name: "Where do you need workers?" }),
  ).toBeVisible();
  await page.getByLabel("Site name").fill("Main warehouse");
  await page
    .getByRole("combobox", { name: "Street address" })
    .fill("12 George St, Parramatta");
  await page.getByRole("option", { name: /12 George St, Parramatta/ }).click();
  await page.getByRole("button", { name: "Add site" }).click();
  await expect(page.getByLabel("Where?")).toBeVisible();
  await expectAccessible(page);

  // It waits as a draft until we've approved them.
  await page.goto("/business/post");
  await expect(page.getByText(/We're checking your business/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Carry on where you left off" }),
  ).toBeVisible();
});

test("an ABN we can't use is caught, and another can be tried", async ({
  page,
}) => {
  // Cancelled on the register.
  await registerAs(page, "business", {
    first: "Sam",
    last: "Ng",
    email: randomEmail("owner"),
    abn: "74 077 011 037",
  });
  await expect(page).toHaveURL(/\/business\/onboarding$/);
  await expect(page.getByText(/This ABN was cancelled/)).toBeVisible();
  // Already with us.
  await page.getByLabel("Your ABN").fill("90 551 661 605");
  await page.getByRole("button", { name: "Look up my business" }).click();
  await expect(page.getByText(/already has an account/)).toBeVisible();
  // A good one.
  const abn = randomAbn();
  await page.getByLabel("Your ABN").fill(abn);
  await page.getByRole("button", { name: "Look up my business" }).click();
  await expect(
    page.getByText(`DEMO BUSINESS ${abn.slice(-4)} PTY LTD`).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use a different ABN" }),
  ).toBeVisible();
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
