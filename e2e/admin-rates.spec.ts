import { expect, test } from "@playwright/test";

import { expectAccessible, randomFutureDate, signInAsDemo } from "./helpers";

test.describe("admin rates", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemo(page, "Alex Morgan");
  });

  test("lists the rate cards with hourly pay and the award's rules", async ({
    page,
  }) => {
    await page.goto("/admin/rates");
    await expect(page).toHaveURL(/\/admin\/rates\/rate-cards$/);
    const rows = page.getByRole("row", { name: /Commercial cleaner/ });
    // The accountant-checked card: $27.48 base × 1.25 = $34.35 ordinary.
    const current = rows.filter({ hasText: "$27.48" });
    await expect(current).toContainText("$34.35");
    await expect(current).toContainText("Overtime after 7.6 h a day");
    await expect(current).toContainText("Owner's accountant");
    // The placeholder card it replaced.
    await expect(rows.filter({ hasText: "$26.00" })).toContainText("Replaced");
    // The warehouse work types wait for their award's checked rates, so
    // there's no card to post them with (owner, 02/11/2026).
    await expect(
      page.getByRole("row", { name: /Forklift driver/ }),
    ).toHaveCount(0);
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

  test("shows a card's award rules and checks each rule is complete", async ({
    page,
  }) => {
    await page.goto("/admin/rates/rate-cards");
    await page
      .getByRole("row", { name: /General labourer/ })
      .filter({ hasText: "$28.84" })
      .getByRole("link", { name: "General labourer" })
      .click();
    await expect(
      page.getByRole("heading", { name: "General labourer, level 1" }),
    ).toBeVisible();
    // The building award: overtime after 8 hours, ordinary hours 7 am to
    // 6 pm, and Saturday's later rate from noon.
    await expect(
      page.getByLabel("Overtime starts after (hours a day)"),
    ).toHaveValue("8");
    await expect(page.getByLabel("Ordinary hours from")).toHaveValue("07:00");
    await expect(page.getByLabel("Ordinary hours to")).toHaveValue("18:00");
    await expect(page.getByLabel("Later Saturday rate from")).toHaveValue(
      "12:00",
    );
    await expect(page.getByText("$64.89 an hour").first()).toBeVisible();
    await expectAccessible(page);

    // A shift loading needs the times it applies to; nothing is saved.
    await page.getByLabel("Early or late shift multiplier").fill("1.5");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByText("Enter when a shift counts as early or late"),
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
      .selectOption({ label: "Builders cleaner" });
    await page.getByLabel("Fixed bill rates").check();
    // A unique start date: one rule per category from a given date.
    await page.getByLabel("Applies from").fill(randomFutureDate());
    await page.getByRole("button", { name: "Add bill rule" }).click();
    await expect(page.getByText("Enter a rate").first()).toBeVisible();

    await page.getByLabel(/Pay plus on-costs/).check();
    await page.getByLabel("Margin", { exact: true }).fill("25");
    await page.getByRole("button", { name: "Add bill rule" }).click();
    await expect(
      page.getByRole("heading", { name: "Builders cleaner" }),
    ).toBeVisible();

    await page.goto("/admin/rates/bill-rules");
    await expect(
      page.getByRole("row", { name: /Builders cleaner/ }).first(),
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
