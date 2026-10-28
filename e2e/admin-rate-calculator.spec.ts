import { expect, test } from "@playwright/test";

import { expectAccessible, signInAsDemo } from "./helpers";

test("the rate calculator splits a shift and shows pay, bill and margin", async ({
  page,
}) => {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/rates/calculator");
  await expectAccessible(page);

  // A Saturday morning for a restoration labourer: 4 hours at $46.38.
  await page
    .getByLabel("Work category")
    .selectOption({ label: "Restoration labourer" });
  await page.getByLabel("Date").fill("2026-11-07");
  await page.getByLabel("Start").fill("08:00");
  await page.getByLabel("Finish").fill("12:00");
  await page.getByLabel("Unpaid break (minutes)").fill("0");
  await page.getByRole("button", { name: "Work it out" }).click();

  const row = page.getByRole("row", { name: /^Saturday/ });
  await expect(row).toContainText("4 h");
  await expect(row).toContainText("$46.38");
  await expect(row).toContainText("$185.52");
  await expect(page.getByText("the default margin")).toBeVisible();
  await expectAccessible(page);

  // Harbour Restoration has its own 15% margin.
  await page
    .getByLabel("Business")
    .selectOption({ label: "Harbour Restoration" });
  await page.getByRole("button", { name: "Work it out" }).click();
  await expect(page.getByText("Harbour Restoration's bill rule")).toBeVisible();

  // Overnight: a finish before the start is the next morning.
  await page.getByLabel("Start").fill("22:00");
  await page.getByLabel("Finish").fill("02:00");
  await page.getByRole("button", { name: "Work it out" }).click();
  await expect(page.getByRole("row", { name: /^Saturday/ })).toContainText(
    "2 h",
  );
  await expect(page.getByRole("row", { name: /^Sunday/ })).toContainText("2 h");
});
