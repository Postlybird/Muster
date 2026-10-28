import { expect, test } from "@playwright/test";

import { expectAccessible } from "./helpers";

test("the landing page shows both paths and how each works", async ({
  page,
}) => {
  await page.goto("/");
  for (const path of ["Find work", "Hire workers"]) {
    await expect(
      page.getByRole("region", { name: path }).getByRole("listitem"),
    ).toHaveCount(4);
  }
  await page.getByRole("link", { name: "Sign up to work" }).click();
  await expect(page).toHaveURL(/\/login\?as=worker$/);
});

test("questions are answered with the rules as they stand", async ({
  page,
}) => {
  await page.goto("/faq");
  const question = page
    .locator("details")
    .filter({ hasText: "What if I can't make a shift?" });
  await question.getByText("What if I can't make a shift?").click();
  await expect(
    question.getByText(/Cancelling within \d+ hours of the start/),
  ).toBeVisible();
  await expectAccessible(page);
});

test("sign-up links to the collection notice", async ({ page }) => {
  await page.goto("/login?as=worker");
  await page.getByRole("link", { name: "collection notice" }).click();
  await expect(page).toHaveURL(/\/privacy#collection-notice$/);
  await expect(
    page.getByRole("heading", { name: "Collection notice" }),
  ).toBeVisible();
});
