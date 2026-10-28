import { expect, test } from "@playwright/test";

import { expectAccessible } from "./helpers";

// Needs the demo data: npm run seed.
test.describe("demo sign-in", () => {
  test("lists seeded accounts by role", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Admin accounts (2)")).toBeVisible();
    await expect(page.getByText(/Business accounts \(\d+\)/)).toBeVisible();
    await expect(page.getByText("Worker accounts (30)")).toBeVisible();
  });

  test("signs in as an admin", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Alex Morgan/ }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expectAccessible(page);
  });

  test("signs in as a business owner", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Mark Davies/ }).click();
    await expect(page).toHaveURL(/\/business$/);
  });

  test("signs in as a worker", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Worker accounts (30)").click();
    await page.getByRole("button", { name: /Liam O'Brien/ }).click();
    await expect(page).toHaveURL(/\/worker$/);
    await expect(page.getByRole("heading", { name: "Hi Liam" })).toBeVisible();
  });
});
