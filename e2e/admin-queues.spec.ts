import { expect, test, type Page } from "@playwright/test";

import {
  bookTestWorker,
  expectAccessible,
  moveShift,
  pageAs,
  postTestJob,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
} from "./helpers";

// Jobs posted, matters raised and workers changed by these tests, put back
// afterwards.
const posted: string[] = [];
const raised: string[] = [];
const undo: (() => PromiseLike<unknown>)[] = [];
test.afterEach(async () => {
  const service = serviceClient();
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
  await service
    .from("admin_flags")
    .update({
      status: "resolved",
      resolution: "Browser test",
      resolved_at: new Date().toISOString(),
    })
    .in("id", raised.splice(0))
    .eq("status", "open");
  for (const step of undo.splice(0).reverse()) await step();
});

/** A Westside shift with the worker booked, and its booking's id. */
async function bookedShift(worker: string) {
  const job = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "pick",
  });
  posted.push(job.jobId);
  const { workerId } = await bookTestWorker(job.shiftId, worker);
  const { data: booking } = await serviceClient()
    .from("assignments")
    .select("id")
    .eq("shift_id", job.shiftId)
    .eq("worker_id", workerId)
    .single();
  return { ...job, workerId, assignmentId: booking!.id as string };
}

/** A matter in the queues, as the scheduled jobs would raise it. */
async function raise(
  kind: string,
  workerId: string,
  assignmentId: string | null,
  summary: string,
) {
  const { data } = await serviceClient()
    .from("admin_flags")
    .insert({
      kind,
      worker_id: workerId,
      assignment_id: assignmentId,
      summary,
    })
    .select("id")
    .single();
  raised.push(data!.id);
  return data!.id as string;
}

async function messages(workerId: string, template: string, since: string) {
  const service = serviceClient();
  const { data: worker } = await service
    .from("workers")
    .select("profile_id")
    .eq("id", workerId)
    .single();
  const { data } = await service
    .from("notifications")
    .select("body")
    .eq("profile_id", worker!.profile_id)
    .eq("template", template)
    .gte("created_at", since);
  return (data ?? []).map((row) => row.body as string);
}

async function openMatter(page: Page, flagId: string) {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/queues");
  await page.locator(`a[href="/admin/queues/${flagId}"]`).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("an admin takes a worker off a booking at risk, and the shift is offered again", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const since = new Date().toISOString();
  const booking = await bookedShift("Priya Patel");
  const flagId = await raise(
    "booking_at_risk",
    booking.workerId,
    booking.assignmentId,
    "Booked, but a ticket the job needs expires before then.",
  );

  await openMatter(page, flagId);
  await expect(
    page.getByRole("heading", { level: 1, name: "Booking at risk" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Settle it" }).click();
  await expect(page.getByText("Say what was decided")).toBeVisible();
  await page.getByRole("radio", { name: /Take them off the shift/ }).check();
  await page
    .getByLabel("What was decided, and why")
    .fill("your white card expires the day before");
  await page.getByRole("button", { name: "Settle it" }).click();

  await expect(page).toHaveURL(/\/admin\/queues\?settled=1$/);
  await expect(
    page
      .getByRole("region", { name: "Recently settled" })
      .getByRole("row")
      .filter({ hasText: "Priya Patel" })
      .first(),
  ).toContainText(
    "Taken off the shift: your white card expires the day before",
  );

  const service = serviceClient();
  const { data: after } = await service
    .from("assignments")
    .select("status, shifts(status)")
    .eq("id", booking.assignmentId)
    .single();
  expect(after).toEqual({
    status: "cancelled_by_admin",
    shifts: { status: "open" },
  });
  expect(await messages(booking.workerId, "removed_from_shift", since)).toEqual(
    [
      expect.stringMatching(
        /^Our team has taken you off Commercial cleaner for Westside Cleaning in Blacktown, .+\. Your white card expires the day before\. It doesn't count against your reliability\.$/,
      ),
    ],
  );

  const worker = await pageAs(browser, "Priya Patel");
  await worker.goto("/worker/my-shifts");
  await expect(
    worker.getByRole("region", { name: "Taken off by our team" }),
  ).toBeVisible();
  await worker.context().close();
});

test("an admin settles a possible no-show: they were there", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const booking = await bookedShift("Hannah Schmidt");
  await moveShift(booking.shiftId, -1);
  const flagId = await raise(
    "possible_no_show",
    booking.workerId,
    booking.assignmentId,
    "No clock-in yet",
  );

  await openMatter(page, flagId);
  await expect(
    page.getByText("No clock-in or confirmed arrival"),
  ).toBeVisible();
  await page.getByRole("radio", { name: /They were there/ }).check();
  await page
    .getByLabel("What was decided, and why")
    .fill("Supervisor confirmed by phone");
  await page.getByRole("button", { name: "Settle it" }).click();
  await expect(page).toHaveURL(/\/admin\/queues\?settled=1$/);

  const { data: arrival } = await serviceClient()
    .from("attendance_events")
    .select("kind")
    .eq("assignment_id", booking.assignmentId);
  expect(arrival).toEqual([{ kind: "arrival_confirmed" }]);
  await page.goto(`/admin/queues/${flagId}`);
  await expect(
    page.getByText("They were there: Supervisor confirmed by phone"),
  ).toBeVisible();
});

test("an admin reviews a worker on hold: their bookings, then lifting the hold", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const since = new Date().toISOString();
  const booking = await bookedShift("Fatima Al-Sayed");
  const service = serviceClient();
  await service
    .from("workers")
    .update({ status: "suspended", status_reason: "2 no-shows in 30 days." })
    .eq("id", booking.workerId);
  undo.push(() =>
    service
      .from("workers")
      .update({ status: "active", status_reason: null })
      .eq("id", booking.workerId),
  );
  const flagId = await raise(
    "suspension",
    booking.workerId,
    null,
    "Suspended after 2 no-shows in 30 days",
  );

  await openMatter(page, flagId);
  await expect(page.getByText("2 no-shows in 30 days.")).toBeVisible();
  const shifts = page.getByRole("region", { name: "Their booked shifts" });
  const row = shifts
    .getByRole("listitem")
    .filter({ hasText: "Westside Cleaning" });
  await expect(row.first()).toBeVisible();
  const before = await row.count();
  await row
    .first()
    .getByRole("button", { name: "Take off this shift" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Take off" })
    .click();
  await expect(
    page.getByText("Taken off the shift. We've told them and the business."),
  ).toBeVisible();
  await expect(row).toHaveCount(before - 1);
  await expectAccessible(page);

  await page.getByRole("radio", { name: /Lift the hold/ }).check();
  await page
    .getByLabel("What was decided, and why")
    .fill("Talked it through. Both were family emergencies.");
  await page.getByRole("button", { name: "Settle it" }).click();
  await expect(page).toHaveURL(/\/admin\/queues\?settled=1$/);

  const { data: worker } = await service
    .from("workers")
    .select("status")
    .eq("id", booking.workerId)
    .single();
  expect(worker!.status).toBe("active");
  expect(await messages(booking.workerId, "hold_lifted", since)).toHaveLength(
    1,
  );
  expect(await messages(booking.workerId, "removed_from_shift", since)).toEqual(
    [expect.stringContaining("Your account is on hold.")],
  );
});
