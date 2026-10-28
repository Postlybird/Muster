import { expect, test } from "@playwright/test";

import { expectAccessible, signInAsDemo } from "./helpers";

test.describe("admin catalogues", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemo(page, "Alex Morgan");
  });

  test("lists the seeded categories with their required tickets", async ({
    page,
  }) => {
    await page.goto("/admin/catalogues");
    await expect(page).toHaveURL(/\/admin\/catalogues\/categories$/);
    const row = page.getByRole("row", { name: /Restoration technician/ });
    await expect(row).toContainText("White Card");
    await expect(row).toContainText("IICRC WRT");
    await expectAccessible(page);
  });

  test("adds, edits and archives a category", async ({ page }) => {
    const name = `Test crew ${Date.now()}`;
    await page.goto("/admin/catalogues/categories/new");

    // An empty minimum engagement is an error, not zero hours.
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Minimum engagement").fill("");
    await page.getByRole("button", { name: "Add category" }).click();
    await expect(page.getByText("Enter a number of hours")).toBeVisible();

    await page.getByLabel("Minimum engagement").fill("4");
    await page.getByLabel("White Card").check();
    await page.getByLabel("Hi-vis").check();
    await page.getByRole("button", { name: "Add category" }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByLabel("White Card")).toBeChecked();

    await page.getByRole("switch", { name: /Police check required/ }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Category saved")).toBeVisible();

    await page.goto("/admin/catalogues/categories");
    const row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row).toContainText("Required");
    await expect(row).toContainText("White Card");

    await row.getByRole("link", { name }).click();
    await page.getByRole("button", { name: "Archive" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Archive" })
      .click();
    await expect(page.getByText("Archived").first()).toBeVisible();
  });

  test("adds a hazard", async ({ page }) => {
    const name = `Test hazard ${Date.now()}`;
    await page.goto("/admin/catalogues/hazards");
    await page.getByLabel("Add a hazard").fill(name);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Name" }).last(),
    ).toHaveValue(name);
  });
});
