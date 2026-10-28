import { expect, test } from "@playwright/test";

import { periodOf } from "../src/domain/reports";
import { formatCalendarDate, sydneyDateKey } from "../src/lib/format";
import { expectAccessible, signInAsDemo } from "./helpers";

test("an admin sees how filling work is going, and the money behind it", async ({
  page,
}) => {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/reports");
  await expect(
    page.getByRole("heading", { name: /^Shifts from / }),
  ).toBeVisible();
  for (const label of [
    "Fill rate",
    "Time to fill",
    "No-show rate",
    "Active workers",
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(
    page.getByRole("region", { name: "By work type", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "By business", exact: true }),
  ).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name: "Last month" }).click();
  await expect(page.getByRole("link", { name: "Last month" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const { from, to } = periodOf("last_month", sydneyDateKey(new Date()));
  await expect(
    page.getByRole("heading", {
      name: `Shifts from ${formatCalendarDate(from)} to ${formatCalendarDate(to)}`,
    }),
  ).toBeVisible();

  await page.getByLabel("From", { exact: true }).fill("2026-10-28");
  await page.getByLabel("To", { exact: true }).fill("2026-10-01");
  await page.getByRole("button", { name: "Show report" }).click();
  await expect(
    page.getByText("Choose a start date before the end date"),
  ).toBeVisible();
});

test("an admin sees who has looked at a worker's records", async ({ page }) => {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/workers?q=Ahmed+Hassan");
  await page.getByRole("link", { name: "Ahmed Hassan" }).click();
  await page
    .getByRole("link", { name: "Who has viewed or changed their records" })
    .click();
  await expect(
    page.getByText("Only records about Ahmed Hassan."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: /entr(y|ies)$/ })
      .getByRole("row")
      .nth(1),
  ).toContainText("Alex Morgan");
  await expect(
    page
      .getByRole("region", { name: /entr(y|ies)$/ })
      .getByRole("row")
      .nth(1),
  ).toContainText("Viewed documents: Worker details");
  await expectAccessible(page);

  await page
    .getByLabel("What was done")
    .selectOption("Added or changed records");
  await page.getByRole("button", { name: "Show entries" }).click();
  await expect(page).toHaveURL(/kind=changes/);
  await expect(
    page.getByText("Only records about Ahmed Hassan."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: /entr(y|ies)$/ })
      .getByRole("row")
      .nth(1),
  ).toContainText(/Added|Changed/);
});

test("the dashboard shows what needs attention, linking to where it's done", async ({
  page,
}) => {
  await signInAsDemo(page, "Alex Morgan");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expectAccessible(page);
  await page
    .getByRole("link", { name: /Unfilled shifts starting within 24 hours/ })
    .click();
  await expect(page).toHaveURL(/\/admin\/shifts\?next=24h$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Shift board" }),
  ).toBeVisible();
});
