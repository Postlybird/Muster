import { expect, test } from "@playwright/test";

import { expectAccessible, signInAsDemo } from "./helpers";

test.describe("admin agreements and licences", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemo(page, "Alex Morgan");
  });

  test("drafts, previews and publishes a new agreement version", async ({
    page,
  }) => {
    const version = `0.2-e2e-${Date.now()}`;
    await page.goto("/admin/agreements");
    await expectAccessible(page);
    await page
      .getByRole("link", {
        name: "New version of Labour Hire Services Agreement",
      })
      .click();

    // A new version starts from the current wording.
    await expect(page.getByLabel("Wording")).not.toHaveValue("");
    await page.getByLabel("Version").fill(version);
    await page
      .getByLabel("Wording")
      .fill("## Test terms\n\nThis is **test** wording.");
    await page.getByRole("tab", { name: "Preview" }).click();
    await expect(
      page.getByRole("heading", { name: "Test terms" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Write" }).click();
    await page.getByRole("button", { name: "Create draft" }).click();

    await expect(
      page.getByRole("heading", { name: `Version ${version}` }),
    ).toBeVisible();
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Publish" })
      .click();
    await expect(page.getByText("Published and now current")).toBeVisible();
    await expect(
      page.getByText("Published wording can't be changed"),
    ).toBeVisible();
    await expect(page.getByLabel("Wording")).toHaveCount(0);

    await page.goto("/admin/agreements");
    const section = page.getByRole("region", {
      name: "Labour Hire Services Agreement",
    });
    await expect(
      section.getByRole("listitem").filter({ hasText: version }),
    ).toContainText("Current");
  });

  test("shows where jobs are blocked, and adding a licence lifts the block", async ({
    page,
  }) => {
    await page.goto("/admin/licences");
    await expectAccessible(page);
    const alert = page.getByText(/^Jobs are blocked in/);
    await expect(alert).toContainText("QLD");

    await page.getByText("Add a licence").click();
    const form = page.getByRole("form", { name: "New licence" });
    await form.getByLabel("State").click();
    await page.getByRole("option", { name: "QLD" }).click();
    const number = `LHL-${Date.now()}`;
    await form.getByLabel("Licence number").fill(number);
    await form.getByLabel("Licence holder").fill("Muster Labour Hire Pty Ltd");
    await form.getByLabel("Expires").fill("2030-12-31");
    await form.getByRole("button", { name: "Add licence" }).click();
    await expect(page.getByText("Licence added")).toBeVisible();

    await page.reload();
    await expect(page.getByText(/^Jobs are blocked in/)).not.toContainText(
      "QLD",
    );
    await expect(
      page.getByRole("form", { name: "Queensland" }).getByText("Licensed"),
    ).toBeVisible();

    // Clean up: a cancelled licence doesn't count, so QLD is blocked again.
    const added = page.getByRole("form", { name: `Licence ${number}` });
    await added.getByLabel("Status").click();
    await page.getByRole("option", { name: "Cancelled" }).click();
    await added.getByRole("button", { name: "Save licence" }).click();
    await expect(page.getByText("Licence saved")).toBeVisible();
    await page.reload();
    await expect(page.getByText(/^Jobs are blocked in/)).toContainText("QLD");
  });
});
