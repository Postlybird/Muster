import { expect, test } from "@playwright/test";

import { fromSydneyTime, sydneyDateKey } from "../src/lib/format";
import {
  bookTestWorker,
  expectAccessible,
  postTestJob,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
} from "./helpers";

// Overtime across a worker's shifts (owner, 02/11/2026): their hours with
// us that day add up, the business whose booking goes past the limit pays
// the overtime, and it's told before it books.

const posted: string[] = [];
test.afterEach(async () => {
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
});

/**
 * A Wednesday (yyyy-mm-dd) 30 to 170 days ahead, clear of other runs. A
 * weekday, as on a Sunday or public holiday the day's own rate is as high
 * as overtime, so other shifts add nothing.
 */
function someWednesday(): string {
  const days = 30 + Math.floor(Math.random() * 141);
  const date = new Date(Date.now() + days * 86_400_000);
  while (date.getUTCDay() !== 3) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function setShift(
  shiftId: string,
  day: string,
  from: string,
  to: string,
) {
  const { error } = await serviceClient()
    .from("shifts")
    .update({
      starts_at: fromSydneyTime(day, from).toISOString(),
      ends_at: fromSydneyTime(day, to).toISOString(),
      break_minutes: 0,
    })
    .eq("id", shiftId);
  expect(error).toBeNull();
}

/** Hannah booked 8 am to 2 pm (6 hours) at Westside on `day`. */
async function bookedThatMorning(day: string) {
  const job = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });
  posted.push(job.jobId);
  const { workerId } = await bookTestWorker(job.shiftId, "Hannah Schmidt");
  await setShift(job.shiftId, day, "08:00", "14:00");
  return workerId;
}

/** Another Westside job, 3 pm to 7 pm the same day: 4 hours, 2.4 past 7.6. */
async function afternoonJob(day: string, fillMode: "pick" | "auto") {
  const job = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode,
  });
  posted.push(job.jobId);
  await setShift(job.shiftId, day, "15:00", "19:00");
  return job;
}

test("the business sees overtime from a worker's other shifts before it books them, and the worker sees it too", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const day = someWednesday();
  const workerId = await bookedThatMorning(day);
  const job = await afternoonJob(day, "pick");
  const { error } = await serviceClient()
    .from("applications")
    .insert({ shift_id: job.shiftId, worker_id: workerId });
  expect(error).toBeNull();

  await signInAsDemo(page, "Sofia Rossi");
  await page.goto(`/business/jobs/${job.jobId}`);
  const applicants = page.getByRole("region", { name: "Applicants" });
  await expect(
    applicants.getByText(
      /With their other shifts with us that day \(6 h\), 2\.4 h of this shift would be overtime: about \$\d+\.\d\d more, excluding GST\./,
    ),
  ).toBeVisible();
  await expectAccessible(page);

  await applicants
    .getByRole("button", { name: /^Book 1 shift for Hannah/ })
    .click();
  const booked = page.getByRole("region", { name: "Booked" });
  await expect(
    booked.getByText(
      /2\.4 h of this shift is overtime: about \$\d+\.\d\d more, excluding GST\./,
    ),
  ).toBeVisible();

  await page.context().clearCookies();
  await signInAsDemo(page, "Hannah Schmidt");
  await page.goto(`/worker/shifts/${job.jobId}`);
  await expect(
    page.getByText(
      /With your other shifts with us that day \(6 h\), 2\.4 h of this shift is overtime: about \$\d+\.\d\d more for you\./,
    ),
  ).toBeVisible();
  await expectAccessible(page);
});

test("a worker can't take a first-in shift their other shifts would put into overtime, unless the business allowed it", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const day = someWednesday();
  await bookedThatMorning(day);
  const job = await afternoonJob(day, "auto");

  // Finding shifts brings their offers up to date: this one isn't among them.
  await signInAsDemo(page, "Hannah Schmidt");
  await page.goto("/worker/shifts");
  await expect(
    page.getByRole("heading", { name: "Find shifts" }),
  ).toBeVisible();
  await page.goto(`/worker/shifts/${job.jobId}`);
  await expect(
    page.getByRole("heading", { name: "This work isn't available" }),
  ).toBeVisible();

  // The business opens it to workers on overtime.
  const { error } = await serviceClient()
    .from("jobs")
    .update({ allow_overtime: true })
    .eq("id", job.jobId);
  expect(error).toBeNull();
  await page.goto("/worker/shifts");
  await expect(
    page.getByRole("heading", { name: "Find shifts" }),
  ).toBeVisible();
  await page.goto(`/worker/shifts/${job.jobId}`);
  await page.getByRole("button", { name: "Accept this shift" }).click();
  await expect(
    page.getByText(/You're booked on 1 shift/).first(),
  ).toBeVisible();
  await expect(
    page.getByText(
      /2\.4 h of this shift is overtime: about \$\d+\.\d\d more for you\./,
    ),
  ).toBeVisible();
});

/** A Wednesday (yyyy-mm-dd, Sydney) two to three weeks ago, before any recent pay run. */
function aWednesdayAgo(): string {
  const date = new Date(`${sydneyDateKey(new Date())}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 14);
  while (date.getUTCDay() !== 3) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

test("hours are costed in the order they were booked, so the later booking pays the overtime", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const day = aWednesdayAgo();
  // Booked first: 8 am to 2 pm. Booked second: 3 pm to 7 pm, 2.4 hours of
  // it past 7.6 for the day.
  const morning = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });
  posted.push(morning.jobId);
  const { workerId } = await bookTestWorker(morning.shiftId, "Hannah Schmidt");
  const afternoon = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });
  posted.push(afternoon.jobId);
  await bookTestWorker(afternoon.shiftId, "Hannah Schmidt");

  // Worked as rostered.
  const service = serviceClient();
  const sheets: string[] = [];
  for (const [shiftId, from, to] of [
    [morning.shiftId, "08:00", "14:00"],
    [afternoon.shiftId, "15:00", "19:00"],
  ] as const) {
    await setShift(shiftId, day, from, to);
    const { data: booking } = await service
      .from("assignments")
      .select("id")
      .eq("shift_id", shiftId)
      .eq("worker_id", workerId)
      .single();
    const { error } = await service.from("attendance_events").insert(
      [
        {
          kind: "clock_in",
          occurred_at: fromSydneyTime(day, from).toISOString(),
        },
        {
          kind: "clock_out",
          occurred_at: fromSydneyTime(day, to).toISOString(),
        },
      ].map((event) => ({
        ...event,
        assignment_id: booking!.id,
        inside_geofence: true,
        distance_m: 0,
      })),
    );
    expect(error).toBeNull();
    const { data: sheet } = await service
      .from("timesheets")
      .select("id")
      .eq("assignment_id", booking!.id)
      .single();
    sheets.push(sheet!.id as string);
  }

  // The business approves the afternoon first, then the morning.
  await signInAsDemo(page, "Sofia Rossi");
  for (const id of [...sheets].reverse()) {
    await page.goto(`/business/timesheets/${id}`);
    await page.getByRole("button", { name: "Approve these hours" }).click();
    await expect(page.getByText("Hours approved")).toBeVisible();
  }

  // The afternoon, booked second, has the overtime; the morning has none.
  await page.context().clearCookies();
  await signInAsDemo(page, "Hannah Schmidt");
  await page.goto(`/worker/timesheets/${sheets[1]}`);
  const afternoonPay = page
    .getByRole("list")
    .filter({ hasText: "2 h at $48.09 an hour" });
  await expect(
    afternoonPay.getByText("Overtime", { exact: true }),
  ).toBeVisible();
  await expect(afternoonPay).toContainText("0.4 h at $61.83 an hour");
  await page.goto(`/worker/timesheets/${sheets[0]}`);
  await expect(page.getByText("6 h at $34.35 an hour")).toBeVisible();
  await expect(page.getByText("Overtime", { exact: true })).toHaveCount(0);
});
