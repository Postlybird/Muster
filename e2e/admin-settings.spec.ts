import { expect, test } from "@playwright/test";

import { expectAccessible, signInAsDemo } from "./helpers";

test.describe("admin settings", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemo(page, "Alex Morgan");
    await page.goto("/admin/settings");
  });

  test("shows every setting group and is accessible", async ({ page }) => {
    for (const heading of [
      "Workers",
      "Cancellations, no-shows and reliability",
      "On the day and timesheets",
      "Pay and billing",
    ]) {
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
    }
    await expectAccessible(page);
  });

  test("rejects an out-of-range value without saving anything", async ({
    page,
  }) => {
    const form = page.getByRole("form", { name: "On the day and timesheets" });
    await form.getByLabel("Clock-in distance").fill("10");
    await form.getByRole("button", { name: /^Save/ }).click();
    await expect(form.getByText("Must be at least 25.")).toBeVisible();
    await expect(form.getByText("Nothing was saved")).toBeVisible();
    // What was typed is kept so it can be corrected.
    await expect(form.getByLabel("Clock-in distance")).toHaveValue("10");
  });

  test("saves a group, which confirms its placeholders", async ({ page }) => {
    const form = page.getByRole("form", { name: "On the day and timesheets" });
    await form.getByLabel("Clock-in distance").fill("250");
    await form.getByRole("button", { name: /^Save/ }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();

    await page.reload();
    const reloaded = page.getByRole("form", {
      name: "On the day and timesheets",
    });
    await expect(reloaded.getByLabel("Clock-in distance")).toHaveValue("250");
    await expect(reloaded.getByText("Placeholder")).toHaveCount(0);
  });
});
