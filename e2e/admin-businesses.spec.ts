import { expect, test } from "@playwright/test";

import {
  createPendingBusiness,
  expectAccessible,
  signInAsDemo,
  signInWithEmailCode,
} from "./helpers";

test("an admin approves a business, which can then post work", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const business = await createPendingBusiness();
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/businesses");
  await page
    .getByRole("region", { name: /Awaiting approval/ })
    .getByRole("link", { name: business.name })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: business.name }),
  ).toBeVisible();
  await expect(page.getByText("Head office")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("radio", { name: "Approve" }).check();
  await expect(
    page.getByRole("checkbox", { name: "Approved for account terms" }),
  ).toBeChecked();
  await expect(page.getByLabel("Payment terms in days")).toHaveValue("14");
  await page.getByLabel("Payment terms in days").fill("120");
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByText("90 days at most")).toBeVisible();
  await page.getByLabel("Payment terms in days").fill("7");
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByText(`${business.name} approved`)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Account terms" }),
  ).toBeVisible();
  await expectAccessible(page);

  // Its own margin, from the business page.
  await page.getByRole("link", { name: "Add bill rule" }).click();
  await expect(
    page.getByRole("heading", { name: `Add a bill rule for ${business.name}` }),
  ).toBeVisible();
  await expect(page.getByLabel("Applies to")).toHaveValue(business.businessId);
  await expect(
    page.getByLabel("Work category").locator("option:checked"),
  ).toHaveText("All categories");
  await page.getByLabel("Margin", { exact: true }).fill("12");
  await page.getByLabel("Applies from").fill("2026-07-01");
  await page.getByRole("button", { name: "Add bill rule" }).click();
  await expect(
    page.getByRole("heading", { name: `All categories, ${business.name}` }),
  ).toBeVisible();
  await page.goto(`/admin/businesses/${business.businessId}`);
  await expect(
    page.getByRole("region", { name: "Rates for this business" }),
  ).toContainText("12% margin");

  // The owner is emailed, and can post work.
  await page.goto(`/dev/outbox?to=${encodeURIComponent(business.ownerEmail)}`);
  await expect(
    page.getByText(new RegExp(`^${business.name} is approved`)),
  ).toBeVisible();
  await signInWithEmailCode(page, business.ownerEmail);
  await expect(
    page.getByRole("main").getByRole("link", { name: "Post work" }),
  ).toBeVisible();
});

test("an admin declines a business, then approves it without account terms", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const business = await createPendingBusiness();
  await signInAsDemo(page, "Alex Morgan");
  await page.goto(`/admin/businesses/${business.businessId}`);

  await page.getByRole("radio", { name: "Decline" }).check();
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(
    page.getByText("Write a message, or pick one of the reasons"),
  ).toBeVisible();
  await page.getByLabel("Reason").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByText("Declined", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Reason given: We only place workers in Greater Sydney/),
  ).toBeVisible();
  await expectAccessible(page);

  await page
    .getByRole("checkbox", { name: "Approved for account terms" })
    .uncheck();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(`${business.name} approved`)).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Approved for account terms" }),
  ).not.toBeChecked();

  // Approved, but no posting until account terms are set up.
  await signInWithEmailCode(page, business.ownerEmail);
  await expect(
    page.getByText(/still setting up your account terms/),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Post work" }),
  ).toHaveCount(0);
});

test("checking the register again puts a business with a cancelled ABN on hold", async ({
  page,
}) => {
  // A cancelled demo ABN for each screen size, so both can run at once.
  const abn =
    test.info().project.name === "mobile" ? "74077011037" : "41824754014";
  const business = await createPendingBusiness({ abn });
  await signInAsDemo(page, "Alex Morgan");
  await page.goto(`/admin/businesses/${business.businessId}`);
  await expect(page.getByText("ABN active")).toBeVisible();
  await page.getByRole("button", { name: "Check the register again" }).click();
  await expect(
    page.getByText("The ABN is cancelled, so the business is now on hold"),
  ).toBeVisible();
  await expect(page.getByText("ABN cancelled")).toBeVisible();
  await expect(page.getByRole("heading", { name: "On hold" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
});

test("a supervisor can't open the admin business pages", async ({ page }) => {
  await signInAsDemo(page, "Tom Walsh");
  await page.goto("/admin/businesses");
  await expect(page).toHaveURL(/\/business$/);
});
