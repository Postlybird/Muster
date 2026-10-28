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

// Jobs posted by these tests, released afterwards so bookings never pile up.
const posted: string[] = [];
test.afterEach(async () => {
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
});

test("a worker who can't make it cancels, and the business is told", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const { jobId, shiftId } = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });
  posted.push(jobId);
  const hannah = await bookTestWorker(shiftId, "Hannah Schmidt");
  // It starts in six hours: inside the late cancellation window.
  await moveShift(shiftId, 6);

  await signInAsDemo(page, "Hannah Schmidt");
  await page.goto(`/worker/shifts/${jobId}`);
  await page.getByText("Can't make it?").click();
  await expect(page.getByText(/counts against your reliability/)).toBeVisible();
  await page.getByLabel("Why?").selectOption("I'm sick");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Cancel 1 shift" }).click();
  await expect(
    page.getByText(/^Cancelled 1 shift\. Thanks for letting us know\./),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "You're booked on 1 shift" }),
  ).toHaveCount(0);

  // The business is told, and late cancellations count against reliability.
  const service = serviceClient();
  const { data: emails } = await service
    .from("dev_outbox")
    .select("subject")
    .eq("channel", "email")
    .like("body", `%/business/jobs/${jobId}`);
  expect(emails?.map((email) => email.subject)).toContain(
    "Hannah S. can't make it: Commercial cleaner at Blacktown office tower",
  );
  const { data: worker } = await service
    .from("workers")
    .select("reliability_score")
    .eq("id", hannah.workerId)
    .single();
  expect(Number(worker?.reliability_score)).toBeLessThan(100);
});

test("a business cancels a shift late, and the booked worker is told", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const { jobId, shiftId } = await postTestJob({
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "Restoration labourer",
    fillMode: "pick",
  });
  posted.push(jobId);
  const liam = await bookTestWorker(shiftId, "Liam O'Brien");
  await moveShift(shiftId, 5);

  await signInAsDemo(page, "Lisa Nguyen");
  await page.goto(`/business/jobs/${jobId}`);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText(/each booking is charged 3 hours/),
  ).toBeVisible();
  await expectAccessible(page);
  await dialog.getByLabel(/Why\?/).fill("The insurer postponed the work.");
  await dialog.getByRole("button", { name: "Cancel this shift" }).click();
  await expect(
    page.getByText(
      /^Cancelled\. We've told the workers\. As it's close to the start, 1 booking is charged\./,
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Cancelled", { exact: true }).first(),
  ).toBeVisible();

  const { data: texts } = await serviceClient()
    .from("dev_outbox")
    .select("body")
    .eq("recipient", liam.phone)
    .like("body", "%Cancelled: Harbour Restoration has cancelled%")
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  expect(texts?.length).toBeGreaterThan(0);
});

test("two no-shows put a worker's account on hold", async ({ page }) => {
  test.setTimeout(120_000);
  const service = serviceClient();
  const since = new Date().toISOString();
  const jobs = [];
  for (let i = 0; i < 2; i++) {
    const job = await postTestJob({
      business: "Harbour Restoration",
      site: "Granville flood job",
      category: "Restoration labourer",
      fillMode: "pick",
    });
    posted.push(job.jobId);
    jobs.push({ ...job, ben: await bookTestWorker(job.shiftId, "Ben Carter") });
    // It started an hour ago, and Ben didn't come.
    await moveShift(job.shiftId, -1 - i);
  }
  const ben = jobs[0]!.ben;

  try {
    await signInAsDemo(page, "Lisa Nguyen");
    for (const job of jobs) {
      await page.goto(`/business/jobs/${job.jobId}`);
      await page
        .getByRole("button", { name: /^Didn't turn up/ })
        .first()
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Report no-show" })
        .click();
      await expect(
        page.getByText("Recorded. Thanks for letting us know."),
      ).toBeVisible();
    }

    const { data: worker } = await service
      .from("workers")
      .select("status")
      .eq("id", ben.workerId)
      .single();
    expect(worker?.status).toBe("suspended");
    const { data: texts } = await service
      .from("dev_outbox")
      .select("body")
      .eq("recipient", ben.phone)
      .like("body", "%your account is on hold%")
      .gte("created_at", since);
    expect(texts?.length).toBe(1);
  } finally {
    // Back to how the demo had him, so the test can run again.
    const shiftIds = jobs.map((job) => job.shiftId);
    await service
      .from("assignments")
      .update({ status: "cancelled_by_business" })
      .in("shift_id", shiftIds);
    await service
      .from("workers")
      .update({
        status: "active",
        status_reason: null,
        reliability_score: null,
      })
      .eq("id", ben.workerId);
    await service
      .from("admin_flags")
      .update({ status: "resolved", resolution: "Browser test" })
      .eq("worker_id", ben.workerId)
      .eq("status", "open");
  }
});
