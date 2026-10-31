import { expect, test } from "@playwright/test";

import { expectAccessible } from "./helpers";

test("the home page shows the promise, call-outs and each side's steps", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Work, sorted." }),
  ).toBeVisible();
  await expect(
    page
      .getByText(
        "Connecting great businesses with great people, one shift at a time.",
      )
      .first(),
  ).toBeVisible();

  // Call-outs, step by step, with the extra pay.
  const callouts = page.getByRole("region", {
    name: "Someone off sick? Find cover fast.",
  });
  await expect(callouts.getByRole("listitem")).toHaveCount(4);
  await expect(callouts).toContainText("20% more an hour");

  // Each side's steps open with a tap.
  const steps = page.getByRole("region", {
    name: "Step by step, from sign-up to pay day",
  });
  await expect(
    steps
      .getByRole("tablist", { name: "Steps for businesses" })
      .getByRole("tab"),
  ).toHaveCount(6);
  await steps.getByRole("tab", { name: "Post your shift" }).click();
  await expect(
    steps.getByRole("heading", { name: "Post your shift" }),
  ).toBeVisible();
  await expect(steps).toContainText("You see the full cost");

  await steps.getByRole("tab", { name: "For workers" }).click();
  await steps.getByRole("tab", { name: "Add your documents" }).click();
  await expect(steps).toContainText("photo ID with a selfie");
  await expectAccessible(page);
  await steps.getByRole("link", { name: "Start your sign-up" }).click();
  await expect(page).toHaveURL(/\/login\?as=worker$/);

  // The footer's link for workers opens their side, from another page or
  // from this one.
  await page.goto("/#how-it-works-workers");
  const forWorkers = page.getByRole("tab", { name: "For workers" });
  const forBusinesses = page.getByRole("tab", { name: "For businesses" });
  await expect(forWorkers).toHaveAttribute("aria-selected", "true");
  const footer = page.getByRole("contentinfo");
  await footer
    .getByRole("link", { name: "How it works for businesses" })
    .click();
  await expect(forBusinesses).toHaveAttribute("aria-selected", "true");
  await footer.getByRole("link", { name: "How it works for workers" }).click();
  await expect(forWorkers).toHaveAttribute("aria-selected", "true");
});

test("we're in Sydney for now, with no state-by-state pages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/Sydney · Every industry/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /Melbourne|Brisbane|Perth|Adelaide|Hobart|Darwin|Canberra|Locations/,
  );
  const gone = await page.goto("/locations");
  expect(gone?.status()).toBe(404);
});

test("each industry has a page with the work and the tickets it needs", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("region", { name: "Staff for the work you do" })
    .getByRole("link", { name: "Hospitality" })
    .click();
  await expect(page).toHaveURL(/\/industries\/hospitality$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Hospitality staff, sorted.",
    }),
  ).toBeVisible();
  const bartender = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Bartender" }) });
  // Tickets each state issues are named by what every state's has in common.
  await expect(bartender).toContainText(
    "Needs: Responsible Service of Alcohol (RSA)",
  );

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
