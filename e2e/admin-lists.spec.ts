import { expect, test } from "@playwright/test";

import { shiftSummary } from "../src/lib/job-format";
import {
  bookTestWorker,
  expectAccessible,
  moveShift,
  postTestJob,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
} from "./helpers";

// Jobs posted by these tests, released afterwards.
const posted: string[] = [];
test.afterEach(async () => {
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
});

/**
 * A Westside shift for `headcount` with one worker booked, moved to start
 * `hours` from now.
 */
async function westsideShift(headcount: number, worker: string, hours: number) {
  const job = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "pick",
    headcount,
  });
  posted.push(job.jobId);
  await bookTestWorker(job.shiftId, worker);
  await moveShift(job.shiftId, hours);
  const { data: shift } = await serviceClient()
    .from("shifts")
    .select("starts_at, ends_at")
    .eq("id", job.shiftId)
    .single();
  return { ...job, when: shiftSummary([shift!]) };
}

test("an admin finds workers by work type, mobile and papers expiring soon", async ({
  page,
}) => {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/workers");
  await expectAccessible(page);
  const results = page.getByRole("region", { name: /workers?$/ });

  await page.getByLabel("Work type").selectOption("Restoration technician");
  await page.getByRole("button", { name: "Show workers" }).click();
  await expect(
    results.getByRole("link", { name: "Ahmed Hassan" }),
  ).toBeVisible();
  await expect(results.getByRole("link", { name: "Aisha Rahman" })).toHaveCount(
    0,
  );

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Work type")).toHaveValue("");
  await page.getByLabel("Name, mobile or email").fill("0491 570 157");
  await page.getByRole("button", { name: "Show workers" }).click();
  await expect(results.getByRole("heading")).toHaveText("1 worker");
  await expect(
    results.getByRole("row").filter({ hasText: "Ahmed Hassan" }),
  ).toContainText("Bankstown");

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Name, mobile or email")).toHaveValue("");
  await page.getByLabel(/Ticket or visa expiring within/).check();
  await page.getByRole("button", { name: "Show workers" }).click();
  await expect(
    results.getByRole("row").filter({ hasText: "Ahmed Hassan" }),
  ).toContainText("IICRC WRT");
  await expect(results.getByRole("link", { name: "Ben Carter" })).toHaveCount(
    0,
  );
  await expectAccessible(page);

  await results.getByRole("link", { name: "Ahmed Hassan" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: /Ahmed Hassan/ }),
  ).toBeVisible();
});

test("an admin finds businesses by site suburb and ABN", async ({ page }) => {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/businesses");
  await page.getByLabel("Site suburb or postcode").fill("Manly");
  await page.getByRole("button", { name: "Show businesses" }).click();
  await expect(
    page.getByRole("link", { name: "Beaches Make Safe" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Harbour Restoration" }),
  ).toHaveCount(0);
  await expectAccessible(page);

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Site suburb or postcode")).toHaveValue("");
  await page.getByLabel("Name or ABN").fill("50 893 268 002");
  await page.getByRole("button", { name: "Show businesses" }).click();
  await expect(
    page.getByRole("link", { name: "Southern Cross Pack-out" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Beaches Make Safe" }),
  ).toHaveCount(0);
});

test("the shift board shows unfilled shifts starting within a day in red", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const soon = await westsideShift(2, "Priya Patel", 5);
  const started = await westsideShift(1, "Fatima Al-Sayed", -1);

  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/shifts");
  await expect(
    page.getByText(/starting within 24 hours (isn't|aren't) fully booked/),
  ).toBeVisible();
  const unfilled = page
    .getByRole("region", { name: /Needs workers/ })
    .getByRole("row")
    .filter({ hasText: soon.when });
  await expect(unfilled).toContainText("1 of 2 booked");
  await expect(unfilled).toContainText("Starts within 24 hours");
  await expect(
    page
      .getByRole("region", { name: /Under way/ })
      .getByRole("row")
      .filter({ hasText: started.when }),
  ).toContainText("0 of 1 on site");
  await expectAccessible(page);
});
