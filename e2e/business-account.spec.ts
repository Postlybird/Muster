import { expect, test } from "@playwright/test";

import {
  expectAccessible,
  randomEmail,
  readCodeFromOutbox,
  signInAsDemo,
} from "./helpers";

test("an owner adds, changes and removes a site", async ({ page }) => {
  await signInAsDemo(page, "Mark Davies");
  await page.goto("/business/sites");
  const granville = page.getByRole("listitem").filter({
    has: page.getByRole("heading", { name: "Granville flood job" }),
  });
  await expect(granville).toContainText("Tom Walsh");
  await expectAccessible(page);

  const name = `Test site ${Date.now()}`;
  await page.getByRole("link", { name: "Add site" }).click();
  await expect(page.getByRole("heading", { name: "Add a site" })).toBeVisible();
  await page.getByLabel("Site name").fill(name);
  await page
    .getByRole("combobox", { name: "Street address" })
    .fill("12 George St, Parramatta");
  await page.getByRole("option", { name: /12 George St, Parramatta/ }).click();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Add site" }).click();
  await expect(page).toHaveURL(/\/business\/sites\?saved=1$/);
  await expect(page.getByText("Site added.")).toBeVisible();

  await page.getByRole("link", { name: `Edit ${name}` }).click();
  await page.getByLabel(/Clock-in distance/).fill("20");
  await page.getByRole("button", { name: "Save site" }).click();
  await expect(page.getByText(/between 50 and 5,000/)).toBeVisible();
  await page.getByLabel(/Clock-in distance/).fill("300");
  await page.getByRole("button", { name: "Save site" }).click();
  await expect(page.getByText("Site saved")).toBeVisible();

  await page.getByRole("link", { name: "All sites" }).click();
  const site = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name }) });
  await expect(site).toContainText("Clock-in distance: 300 m");
  await site.getByRole("button", { name: `Remove ${name}` }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(page.getByRole("heading", { name })).toHaveCount(0);
});

test("an owner invites a supervisor, who sees only their site", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signInAsDemo(page, "Mark Davies");
  await page.goto("/business/team");
  await expect(page.getByText("Lisa Nguyen")).toBeVisible();
  await expectAccessible(page);

  const email = randomEmail("supervisor");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByRole("combobox", { name: "What they can do" })
    .last()
    .selectOption("supervisor");
  await page.getByRole("button", { name: "Send invite", exact: true }).click();
  await expect(page.getByText(`Invite sent to ${email}`)).toBeVisible();

  const row = page.getByRole("listitem").filter({ hasText: email });
  await expect(row.getByText("Invited")).toBeVisible();
  await row.getByLabel("Parramatta depot").check();
  await row.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expectAccessible(page);

  // They sign in with that email and join Harbour Restoration.
  await page.context().clearCookies();
  await page.goto("/login?as=business");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/business$/);

  await page.goto("/business/sites");
  await expect(
    page.getByRole("heading", { name: "Parramatta depot" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Granville flood job" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add site" })).toHaveCount(0);

  // The owner removes them again.
  await page.context().clearCookies();
  await signInAsDemo(page, "Mark Davies");
  await page.goto("/business/team");
  const joined = page.getByRole("listitem").filter({ hasText: email });
  await joined.getByRole("button", { name: "Remove" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(
    page.getByRole("listitem").filter({ hasText: email }),
  ).toHaveCount(0);
});

test("managers run sites but not the team; supervisors only see", async ({
  page,
}) => {
  await signInAsDemo(page, "Lisa Nguyen");
  await page.goto("/business/team");
  await expect(page.getByText("Mark Davies")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send invite" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await page.goto("/business/sites");
  await expect(page.getByRole("link", { name: "Add site" })).toBeVisible();
  await page.goto("/business/settings");
  await expect(page.getByText("Accounts email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save details" })).toHaveCount(
    0,
  );

  await page.context().clearCookies();
  await signInAsDemo(page, "Tom Walsh");
  await page.goto("/business/sites");
  await expect(
    page.getByRole("heading", { name: "Granville flood job" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Parramatta depot" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Edit/ })).toHaveCount(0);
  await expectAccessible(page);
});

test("an owner sees their account details and agreement", async ({ page }) => {
  await signInAsDemo(page, "Mark Davies");
  await page.goto("/business/settings");
  await expect(page.getByText("Registered since")).toBeVisible();
  await expect(
    page.getByText(/Invoices due \d+ days after issue/),
  ).toBeVisible();
  await expect(page.getByText(/accepted .* by Mark Davies/)).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Details saved")).toBeVisible();
});
