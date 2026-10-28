import { expect, test } from "@playwright/test";

import {
  bookTestWorker,
  expectAccessible,
  moveShift,
  postTestJob,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
} from "./helpers";

// Jobs, favourites and blocks made by these tests, undone afterwards so
// later runs (and other tests) start clean.
const posted: string[] = [];
const workersToReset: { business: string; worker: string }[] = [];
test.afterEach(async () => {
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
  const service = serviceClient();
  for (const { business, worker } of workersToReset.splice(0)) {
    await service
      .from("favourites")
      .delete()
      .eq("business_id", business)
      .eq("worker_id", worker);
    await service
      .from("blocks")
      .update({ archived_at: new Date().toISOString() })
      .eq("business_id", business)
      .eq("worker_id", worker)
      .is("archived_at", null);
  }
});

async function idOf(table: "businesses" | "workers", name: string) {
  const service = serviceClient();
  if (table === "businesses") {
    const { data } = await service
      .from("businesses")
      .select("id")
      .eq("trading_name", name)
      .single();
    return data!.id as string;
  }
  const [first, ...rest] = name.split(" ");
  const { data } = await service
    .from("workers")
    .select("id")
    .eq("legal_first_name", first)
    .eq("legal_last_name", rest.join(" "))
    .single();
  return data!.id as string;
}

/** A finished Westside shift with the worker's hours approved. */
async function approvedHours(name: string) {
  const job = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });
  posted.push(job.jobId);
  const { workerId } = await bookTestWorker(job.shiftId, name);
  await moveShift(job.shiftId, -4);
  const service = serviceClient();
  const { data: shift } = await service
    .from("shifts")
    .select("starts_at, ends_at")
    .eq("id", job.shiftId)
    .single();
  const { data: booking } = await service
    .from("assignments")
    .select("id")
    .eq("shift_id", job.shiftId)
    .eq("worker_id", workerId)
    .single();
  await service.from("attendance_events").insert([
    {
      assignment_id: booking!.id,
      kind: "clock_in",
      occurred_at: shift!.starts_at,
      inside_geofence: true,
    },
    {
      assignment_id: booking!.id,
      kind: "clock_out",
      occurred_at: shift!.ends_at,
      inside_geofence: true,
    },
  ]);
  const { data: sheet } = await service
    .from("timesheets")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("assignment_id", booking!.id)
    .select("id")
    .single();
  return { timesheetId: sheet!.id as string, workerId };
}

test("the business rates a worker and makes them a favourite, and the worker rates the site", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { timesheetId, workerId } = await approvedHours("Fatima Al-Sayed");
  const businessId = await idOf("businesses", "Westside Cleaning");
  workersToReset.push({ business: businessId, worker: workerId });
  const service = serviceClient();
  const { data: before } = await service
    .from("workers")
    .select("rating_count")
    .eq("id", workerId)
    .single();

  await signInAsDemo(page, "Sofia Rossi");
  await page.goto(`/business/timesheets/${timesheetId}`);
  await expect(
    page.getByRole("heading", { name: "Rate Fatima" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "5 stars, excellent" }).click();
  await page.getByLabel("Punctual").check();
  await page.getByLabel("Would rehire").check();
  await page.getByText("Add them to your favourites").click();
  await page
    .getByLabel("Anything else? (optional)")
    .fill("Asked good questions about the chemicals.");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Send rating" }).click();
  await expect(
    page.getByText(
      "Thanks for rating them. They're now one of your favourites.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("You gave 5 stars: Punctual, Would rehire."),
  ).toBeVisible();
  const { data: after } = await service
    .from("workers")
    .select("rating_count")
    .eq("id", workerId)
    .single();
  expect(after!.rating_count).toBe(before!.rating_count + 1);

  // She's a favourite now.
  await page.goto("/business/workers");
  const favourites = page.getByRole("region", { name: /^Favourites/ });
  await expect(
    favourites.getByText("Fatima Al-Sayed", { exact: true }),
  ).toBeVisible();
  await expectAccessible(page);

  // The worker rates the site.
  await page.context().clearCookies();
  await signInAsDemo(page, "Fatima Al-Sayed");
  await page.goto(`/worker/timesheets/${timesheetId}`);
  await expect(
    page.getByRole("heading", { name: "Rate the site" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "4 stars, good" }).click();
  await page.getByLabel("Safe site").check();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Send rating" }).click();
  await expect(page.getByText("Thanks for rating the site.")).toBeVisible();
  await expect(page.getByText("You gave 4 stars: Safe site.")).toBeVisible();
});

test("a business blocks a worker, then offers them work again", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const businessId = await idOf("businesses", "Harbour Restoration");
  const workerId = await idOf("workers", "Ethan Murphy");
  workersToReset.push({ business: businessId, worker: workerId });

  await signInAsDemo(page, "Mark Davies");
  await page.goto("/business/workers");
  const worked = page.getByRole("region", { name: /^Worked with you/ });
  await expect(worked.getByText("Ethan Murphy", { exact: true })).toBeVisible();
  await expectAccessible(page);
  await worked.getByText("Don't offer Ethan Murphy our work").click();
  await worked
    .getByLabel("Why?")
    .fill("Kept leaving the site without telling anyone.");
  await worked.getByRole("button", { name: "Block" }).click();
  await expect(
    page.getByText("Blocked. They won't be offered your work."),
  ).toBeVisible();
  const blocked = page.getByRole("region", { name: /^Blocked/ });
  await expect(
    blocked.getByText("Ethan Murphy", { exact: true }),
  ).toBeVisible();
  await expect(
    blocked.getByText("Why: Kept leaving the site without telling anyone."),
  ).toBeVisible();

  await blocked
    .getByRole("button", { name: "Offer them work again: Ethan Murphy" })
    .click();
  await expect(
    page.getByText("Unblocked. They can be offered your work again."),
  ).toBeVisible();
  await expect(worked.getByText("Ethan Murphy", { exact: true })).toBeVisible();
});

test("workers see a business's rating with its work", async ({ page }) => {
  await signInAsDemo(page, "Liam O'Brien");
  await page.goto("/worker/shifts");
  await expect(
    page
      .getByText(/^Harbour Restoration · \d\.\d stars from \d+ ratings?$/)
      .first(),
  ).toBeVisible();
});
