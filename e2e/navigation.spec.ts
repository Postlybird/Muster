import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

// Links swap pages in without a full reload, so the browser shows no
// loading of its own; the site shows a bar across the top instead.
test("a bar shows while the next page loads, and goes once it's there", async ({
  page,
}) => {
  await signInAsDemo(page, "Lisa Nguyen");
  // Hold the next page back (including any prefetch of it), so the wait
  // is long enough to see.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => url.pathname === "/business/jobs",
    async (route) => {
      await held;
      await route.continue();
    },
  );
  await page.goto("/business");
  const bar = page.getByTestId("navigation-progress").locator("div");
  await expect(bar).toHaveCount(0);

  await page
    .getByRole("link", { name: "Jobs", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(bar).toBeVisible();

  release();
  await expect(
    page.getByRole("heading", { level: 1, name: "Jobs" }),
  ).toBeVisible();
  await expect(bar).toHaveCount(0);
});
