import { expect, test, type Page } from "@playwright/test";

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

/** A Westside Cleaning shift at the Blacktown office, started a few minutes ago. */
async function shiftOnNow(worker: string) {
  const job = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });
  posted.push(job.jobId);
  const booked = await bookTestWorker(job.shiftId, worker);
  await moveShift(job.shiftId, -0.1);
  const { data: site } = await serviceClient()
    .from("sites")
    .select("lat, lng")
    .eq("name", "Blacktown office tower")
    .single();
  return {
    ...job,
    ...booked,
    site: { latitude: Number(site!.lat), longitude: Number(site!.lng) },
  };
}

async function standAt(
  page: Page,
  at: { latitude: number; longitude: number },
) {
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ ...at, accuracy: 10 });
}

test("a worker clocks in at the site, and out from somewhere else with a reason", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const shift = await shiftOnNow("Hannah Schmidt");
  await standAt(page, shift.site);

  await signInAsDemo(page, "Hannah Schmidt");
  await page.goto(`/worker/shifts/${shift.jobId}`);
  await expect(page.getByRole("heading", { name: /^On now:/ })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Clock in" }).click();
  await expect(
    page.getByText(/^Clocked in at \d+:\d\d [ap]m\.$/).first(),
  ).toBeVisible();

  // Five kilometres away, the phone needs a reason.
  await standAt(page, {
    latitude: shift.site.latitude,
    longitude: shift.site.longitude + 0.054,
  });
  await page.getByRole("button", { name: "Clock out" }).click();
  await page.getByLabel("Why?").fill("Dropping the rubbish at the tip");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Clock out anyway" }).click();
  await expect(
    page.getByText(/You weren't at the site, so we've noted your reason\./),
  ).toBeVisible();
  await expect(
    page.getByText(/Your hours go to the business to approve\./),
  ).toBeVisible();

  // The business sees when they came and went.
  await page.context().clearCookies();
  await signInAsDemo(page, "Sofia Rossi");
  await page.goto(`/business/jobs/${shift.jobId}`);
  await expect(
    page.getByText(/clocked in \d+:\d\d [ap]m, out \d+:\d\d [ap]m\./),
  ).toBeVisible();
});

test("a clock-in without signal is kept and sent once back online", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const shift = await shiftOnNow("Fatima Al-Sayed");
  await standAt(page, shift.site);
  await signInAsDemo(page, "Fatima Al-Sayed");
  await page.goto(`/worker/shifts/${shift.jobId}`);

  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Clock in" }).click();
  await expect(page.getByText(/saved on your phone/)).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByText(/^Clocked in at/).first()).toBeVisible();

  const { data: events } = await serviceClient()
    .from("attendance_events")
    .select("kind, offline")
    .eq("assignment_id", (await assignmentOf(shift.shiftId, shift.workerId))!);
  expect(events).toEqual([{ kind: "clock_in", offline: true }]);
});

async function assignmentOf(shiftId: string, workerId: string) {
  const { data } = await serviceClient()
    .from("assignments")
    .select("id")
    .eq("shift_id", shiftId)
    .eq("worker_id", workerId)
    .single();
  return data?.id as string | undefined;
}

test("a worker reports a safety issue and admins hear straight away", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const since = new Date().toISOString();
  const shift = await shiftOnNow("Priya Patel");
  await signInAsDemo(page, "Priya Patel");
  await page.goto(`/worker/shifts/${shift.jobId}`);
  await page.getByRole("link", { name: "Report a safety issue" }).click();
  await expect(
    page.getByRole("heading", { name: "Report a safety issue" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page
    .getByLabel("What's wrong?")
    .fill("Water pooling under a live power board on level 3.");
  await page.getByRole("button", { name: "Send to our team" }).click();
  await expect(
    page.getByText(/We've told our team about the safety issue/),
  ).toBeVisible();

  const { data: emails } = await serviceClient()
    .from("dev_outbox")
    .select("subject")
    .eq("channel", "email")
    .gte("created_at", since)
    .like("subject", "Safety issue at Blacktown office tower%");
  expect(emails?.length).toBeGreaterThan(0);
});

test("the business hears when someone hasn't clocked in, and can confirm they're there", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const since = new Date().toISOString();
  const shift = await shiftOnNow("Hannah Schmidt");
  await moveShift(shift.shiftId, -0.75);

  const response = await request.get("/api/cron/attendance", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  const { data: emails } = await serviceClient()
    .from("dev_outbox")
    .select("subject")
    .eq("channel", "email")
    .gte("created_at", since)
    .eq(
      "subject",
      "Hannah Schmidt hasn't clocked in at Blacktown office tower",
    );
  expect(emails).toHaveLength(1);

  await signInAsDemo(page, "Sofia Rossi");
  await page.goto(`/business/jobs/${shift.jobId}`);
  await expect(page.getByText(/not clocked in yet\./)).toBeVisible();
  await page.getByRole("button", { name: "They're here" }).click();
  await expect(page.getByText("Arrival confirmed")).toBeVisible();
  await expect(
    page.getByText(/arrival confirmed for \d+:\d\d [ap]m/),
  ).toBeVisible();
});
