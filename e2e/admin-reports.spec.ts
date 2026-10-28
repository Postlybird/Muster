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
