import { expect, test } from "@playwright/test";

import { expectAccessible, randomFutureDate, signInAsDemo } from "./helpers";

test.describe("admin rates", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemo(page, "Alex Morgan");
  });

  test("lists the placeholder rate cards with hourly pay for each day type", async ({
    page,
  }) => {
    await page.goto("/admin/rates");
    await expect(page).toHaveURL(/\/admin\/rates\/rate-cards$/);
    await expect(
      page.getByText(/haven't been checked by a payroll professional/),
    ).toBeVisible();
    // Restoration labourer placeholder: $26.50 base × 1.25 = $33.13 ordinary.
    const row = page.getByRole("row", { name: /Restoration labourer/ });
    await expect(row).toContainText("$26.50");
    await expect(row).toContainText("$33.13");
    await expectAccessible(page);
  });

  test("adds a rate card with a live preview and refuses a duplicate", async ({
    page,
  }) => {
    // A random level and date so the test can run again on the same database.
    const level = String(2 + Math.floor(Math.random() * 8));
    const from = randomFutureDate();
    const addCard = async () => {
      await page.goto("/admin/rates/rate-cards/new");
      await page.getByLabel("Work category").click();
      await page.getByRole("option", { name: "Commercial cleaner" }).click();
      await page.getByLabel("Level").fill(level);
      await page.getByLabel("Base rate").fill("28.00");
      await page.getByLabel("Applies from").fill(from);
    };

    await addCard();
    await expect(page.getByText("$35.00 an hour")).toBeVisible(); // ordinary preview
    await page.getByLabel("Checked by").fill("Test Payroll Co");
    await page.getByRole("button", { name: "Add rate card" }).click();
    await expect(
      page.getByRole("heading", { name: `Commercial cleaner, level ${level}` }),
    ).toBeVisible();

    await addCard();
    await page.getByRole("button", { name: "Add rate card" }).click();
    await expect(
      page.getByText("There's already a rate card for this category and level"),
    ).toBeVisible();
  });

  test("adds a bill rule and checks fixed rates are filled in", async ({
    page,
  }) => {
    await page.goto("/admin/rates/bill-rules/new");
    await page.getByRole("button", { name: "Add bill rule" }).click();
    await expect(
      page.getByText(
        "Choose a category, or a business for a rule that covers all",
      ),
    ).toBeVisible();
    await page
      .getByLabel("Work category")
      .selectOption({ label: "Trades assistant" });
    await page.getByLabel("Fixed bill rates").check();
    // A unique start date: one rule per category from a given date.
    await page.getByLabel("Applies from").fill(randomFutureDate());
    await page.getByRole("button", { name: "Add bill rule" }).click();
    await expect(page.getByText("Enter a rate").first()).toBeVisible();

    await page.getByLabel(/Pay plus on-costs/).check();
    await page.getByLabel("Margin", { exact: true }).fill("25");
    await page.getByRole("button", { name: "Add bill rule" }).click();
    await expect(
      page.getByRole("heading", { name: "Trades assistant" }),
    ).toBeVisible();

    await page.goto("/admin/rates/bill-rules");
    await expect(
      page.getByRole("row", { name: /Trades assistant/ }).first(),
    ).toContainText("25% margin");
  });

  test("adds and removes a public holiday", async ({ page }) => {
    await page.goto("/admin/rates/holidays");
    await expect(page.getByRole("heading", { name: "2026" })).toBeVisible();
    await expect(page.getByText("King's Birthday").first()).toBeVisible();

    const name = `Test holiday ${Date.now()}`;
    const form = page.getByRole("form", { name: "Add a public holiday" });
    await form.getByLabel("State").click();
    await page.getByRole("option", { name: "VIC" }).click();
    await form.getByLabel("Date").fill("2031-03-10");
    await form.getByLabel("Name").fill(name);
    await form.getByRole("button", { name: "Add holiday" }).click();
    await expect(page.getByText(name)).toBeVisible();

    await page
      .getByRole("button", { name: `Remove ${name} 2031-03-10` })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove" })
      .click();
    await expect(page.getByText(name)).toHaveCount(0);
  });
});
