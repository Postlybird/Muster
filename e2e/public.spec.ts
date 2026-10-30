import { expect, test } from "@playwright/test";

import { expectAccessible } from "./helpers";

test("the landing page shows both paths and how each works", async ({
  page,
}) => {
  await page.goto("/");
  for (const path of ["Find work", "Hire staff"]) {
    await expect(
      page.getByRole("region", { name: path }).getByRole("listitem"),
    ).toHaveCount(4);
  }
  await page.getByRole("link", { name: "Sign up to work" }).click();
  await expect(page).toHaveURL(/\/login\?as=worker$/);
});

test("each industry has a page with the work and the tickets it needs", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("region", { name: "Staff for every industry" })
    .getByRole("link", { name: "Hospitality" })
    .click();
  await expect(page).toHaveURL(/\/industries\/hospitality$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Hospitality staff today, not someday.",
    }),
  ).toBeVisible();
  const bartender = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Bartender" }) });
  await expect(bartender).toContainText("Needs: RSA (NSW Competency Card)");

  // Every industry is listed, with a link to its page.
  await page.goto("/industries");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Warehousing and logistics" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Forklift driver" }),
  ).toBeVisible();

  const missing = await page.goto("/industries/not-an-industry");
  expect(missing?.status()).toBe(404);
});

test("cities show whether we're open, and closed ones invite sign-ups", async ({
  page,
}) => {
  await page.goto("/");
  const where = page.getByRole("region", {
    name: "Australia-wide, state by state",
  });
  await expect(
    where.getByRole("listitem").filter({ hasText: "Sydney" }),
  ).toContainText("Open now");
  await where.getByRole("link", { name: "Melbourne" }).click();
  await expect(page).toHaveURL(/\/locations\/melbourne$/);
  const band = page.getByRole("region", {
    name: "Staff in Melbourne today, not someday.",
  });
  await expect(band.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(band.getByText("Coming soon")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get your business ready" }),
  ).toHaveAttribute("href", "/login?as=business");
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
