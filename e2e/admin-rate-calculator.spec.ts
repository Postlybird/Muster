import { expect, test } from "@playwright/test";

import { expectAccessible, signInAsDemo } from "./helpers";

test("the rate calculator splits a shift and shows pay, bill and margin", async ({
  page,
}) => {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/rates/calculator");
  await expectAccessible(page);

  // A Saturday morning for a restoration labourer: 4 hours at $48.09
  // (the cleaning award's Saturday rate, plus 50c an hour).
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
  await expect(row).toContainText("$48.09");
  await expect(row).toContainText("$192.36");
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

test("the rate calculator pays a long weekday shift by the award's overtime rules", async ({
  page,
}) => {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/rates/calculator");

  // A restoration labourer (cleaning award) on a Wednesday, 7 am to 7 pm with
  // a 30-minute break: finishing after 6 pm makes it a late shift, overtime
  // starts after 7.6 hours, and the later overtime rate after 2 more.
  await page
    .getByLabel("Work category")
    .selectOption({ label: "Restoration labourer" });
  await page.getByLabel("Date").fill("2026-11-11");
  await page.getByLabel("Start").fill("07:00");
  await page.getByLabel("Finish").fill("19:00");
  await page.getByLabel("Unpaid break (minutes)").fill("30");
  await page.getByRole("button", { name: "Work it out" }).click();

  const late = page.getByRole("row", { name: /^Early or late shift/ });
  await expect(late).toContainText("7.6 h");
  await expect(late).toContainText("$38.47");
  const overtime = page.getByRole("row", { name: /^Overtime 2 h/ });
  await expect(overtime).toContainText("$48.09");
  const later = page.getByRole("row", { name: /^Overtime, later hours/ });
  await expect(later).toContainText("1.9 h");
  await expect(later).toContainText("$61.83");
  await expectAccessible(page);
});
