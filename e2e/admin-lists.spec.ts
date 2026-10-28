import { expect, test } from "@playwright/test";

import { expectAccessible, signInAsDemo } from "./helpers";

test("an admin finds workers by work type, mobile and papers expiring soon", async ({
  page,
}) => {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/workers");
  await expectAccessible(page);
  const results = page.getByRole("region", { name: /workers?$/ });

  await page.getByLabel("Work type").selectOption("Restoration technician");
  await page.getByRole("button", { name: "Show workers" }).click();
  await expect(
    results.getByRole("link", { name: "Ahmed Hassan" }),
  ).toBeVisible();
  await expect(results.getByRole("link", { name: "Aisha Rahman" })).toHaveCount(
    0,
  );

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Work type")).toHaveValue("");
  await page.getByLabel("Name, mobile or email").fill("0491 570 157");
  await page.getByRole("button", { name: "Show workers" }).click();
  await expect(results.getByRole("heading")).toHaveText("1 worker");
  await expect(
    results.getByRole("row").filter({ hasText: "Ahmed Hassan" }),
  ).toContainText("Bankstown");

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Name, mobile or email")).toHaveValue("");
  await page.getByLabel(/Ticket or visa expiring within/).check();
  await page.getByRole("button", { name: "Show workers" }).click();
  await expect(
    results.getByRole("row").filter({ hasText: "Ahmed Hassan" }),
  ).toContainText("IICRC WRT");
  await expect(results.getByRole("link", { name: "Ben Carter" })).toHaveCount(
    0,
  );
  await expectAccessible(page);

  await results.getByRole("link", { name: "Ahmed Hassan" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: /Ahmed Hassan/ }),
  ).toBeVisible();
});

test("an admin finds businesses by site suburb and ABN", async ({ page }) => {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/businesses");
  await page.getByLabel("Site suburb or postcode").fill("Manly");
  await page.getByRole("button", { name: "Show businesses" }).click();
  await expect(
    page.getByRole("link", { name: "Beaches Make Safe" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Harbour Restoration" }),
  ).toHaveCount(0);
  await expectAccessible(page);

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Site suburb or postcode")).toHaveValue("");
  await page.getByLabel("Name or ABN").fill("50 893 268 002");
  await page.getByRole("button", { name: "Show businesses" }).click();
  await expect(
    page.getByRole("link", { name: "Southern Cross Pack-out" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Beaches Make Safe" }),
  ).toHaveCount(0);
});
