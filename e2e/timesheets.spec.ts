import { expect, test } from "@playwright/test";

import { formatDayShort, formatTime } from "../src/lib/format";
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

type Person = { name: string; clockIn?: boolean; clockOut?: boolean };

/**
 * A Westside Cleaning shift that ran from four hours ago to two hours ago,
 * with each person clocked in a couple of minutes after the start and out a
 * few minutes before the end, unless told otherwise.
 */
async function workedShift(people: Person[]) {
  const job = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
    headcount: people.length,
  });
  posted.push(job.jobId);
  const booked = [];
  for (const person of people) {
    booked.push({
      ...person,
      ...(await bookTestWorker(job.shiftId, person.name)),
    });
  }
  await moveShift(job.shiftId, -4);
  const service = serviceClient();
  const { data: shift } = await service
    .from("shifts")
    .select("starts_at, ends_at")
    .eq("id", job.shiftId)
    .single();
  const startsAt = new Date(shift!.starts_at);
  const endsAt = new Date(shift!.ends_at);
  const bookings = [];
  for (const person of booked) {
    const { data: assignment } = await service
      .from("assignments")
      .select("id")
      .eq("shift_id", job.shiftId)
      .eq("worker_id", person.workerId)
      .single();
    const events = [
      ...(person.clockIn === false
        ? []
        : [{ kind: "clock_in", at: startsAt.getTime() + 2 * 60_000 }]),
      ...(person.clockIn === false || person.clockOut === false
        ? []
        : [{ kind: "clock_out", at: endsAt.getTime() - 3 * 60_000 }]),
    ];
    if (events.length > 0) {
      const { error } = await service.from("attendance_events").insert(
        events.map((event) => ({
          assignment_id: assignment!.id,
          kind: event.kind,
          occurred_at: new Date(event.at).toISOString(),
          inside_geofence: true,
          distance_m: 0,
        })),
      );
      expect(error).toBeNull();
    }
    bookings.push({ ...person, assignmentId: assignment!.id as string });
  }
  return { ...job, startsAt, endsAt, day: formatDayShort(startsAt), bookings };
}

async function timesheetFor(assignmentId: string) {
  const { data } = await serviceClient()
    .from("timesheets")
    .select("*, timesheet_costs(pay_cents, bill_cents)")
    .eq("assignment_id", assignmentId)
    .maybeSingle();
  return data;
}

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("the business approves workers' hours in one go", async ({ page }) => {
  test.setTimeout(90_000);
  const shift = await workedShift([
    { name: "Hannah Schmidt" },
    { name: "Fatima Al-Sayed" },
  ]);
  await signInAsDemo(page, "Sofia Rossi");
  await page.goto("/business/timesheets");
  await expect(page.getByRole("heading", { name: "To approve" })).toBeVisible();
  await expectAccessible(page);

  // Untick anything else waiting, from earlier runs or the demo data.
  const ours = shift.bookings.map((b) => escape(`${b.name}, ${shift.day}`));
  const others = page.getByRole("checkbox", {
    name: new RegExp(`^(?!(?:${ours.join("|")})$)`),
  });
  for (const box of await others.all()) await box.uncheck();
  await page.getByRole("button", { name: "Approve 2 timesheets" }).click();
  await expect(page.getByText("2 timesheets approved")).toBeVisible();

  for (const booking of shift.bookings) {
    const sheet = await timesheetFor(booking.assignmentId);
    expect(sheet?.status).toBe("approved");
    // Costed with the booking's rates.
    expect(sheet?.timesheet_costs?.bill_cents).toBeGreaterThan(0);
  }
});

test("the business changes hours, the worker queries them, and an admin settles it", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const since = new Date().toISOString();
  const shift = await workedShift([{ name: "Priya Patel" }]);
  const [booking] = shift.bookings;
  const sheet = await timesheetFor(booking!.assignmentId);
  expect(sheet?.status).toBe("submitted");

  await signInAsDemo(page, "Sofia Rossi");
  await page.goto(`/business/timesheets/${sheet!.id}`);
  await expect(
    page.getByRole("heading", { name: `Priya Patel, ${shift.day}` }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByText("Change the hours").click();
  const leftAt = new Date(shift.endsAt.getTime() - 45 * 60_000);
  await page.getByLabel("Finished").fill(timeValue(leftAt));
  await page
    .getByLabel("What changed, for the worker")
    .fill("Left 45 minutes early to catch a train.");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Save and approve" }).click();
  await expect(page.getByText("Approved with changes").first()).toBeVisible();
  const { data: texts } = await serviceClient()
    .from("dev_outbox")
    .select("body")
    .eq("channel", "sms")
    .gte("created_at", since)
    .like("body", "%set your hours%");
  expect(texts?.length).toBeGreaterThan(0);

  // The worker queries the change.
  await page.context().clearCookies();
  await signInAsDemo(page, "Priya Patel");
  await page.goto("/worker/timesheets");
  await expect(page.getByText("Changed by the business").first()).toBeVisible();
  await expectAccessible(page);
  await page.goto(`/worker/timesheets/${sheet!.id}`);
  await expect(
    page.getByText(
      `out ${formatTime(new Date(shift.endsAt.getTime() - 3 * 60_000))}`,
    ),
  ).toBeVisible();
  await page
    .getByLabel("What's wrong with these hours?")
    .fill("The supervisor asked me to stay to finish level 4.");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Query these hours" }).click();
  await expect(page.getByText("With our team").first()).toBeVisible();
  const { data: emails } = await serviceClient()
    .from("dev_outbox")
    .select("subject")
    .eq("channel", "email")
    .gte("created_at", since)
    .eq(
      "subject",
      "Priya Patel has queried their hours at Blacktown office tower",
    );
  expect(emails).toHaveLength(1);

  // An admin settles it with the rostered finish.
  await page.context().clearCookies();
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/queues");
  await expect(
    page.getByRole("heading", { name: /^Timesheet queries/ }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.goto(`/admin/timesheets/${sheet!.id}`);
  await expect(
    page.getByRole("heading", { name: "Settle the query" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Finished").fill(timeValue(shift.endsAt));
  await page
    .getByLabel("What was decided, for both sides")
    .fill("Paid to the rostered finish: the supervisor confirmed she stayed.");
  await page.getByRole("button", { name: "Pay these hours" }).click();
  await expect(
    page.getByText("Settled. We've told the worker and the business."),
  ).toBeVisible();
  const settled = await timesheetFor(booking!.assignmentId);
  expect(settled?.status).toBe("approved");
  // To the minute, as typed.
  expect(new Date(settled!.finish_at).getTime()).toBe(
    Math.floor(shift.endsAt.getTime() / 60_000) * 60_000,
  );
  expect(settled?.timesheet_costs?.pay_cents).toBeGreaterThan(0);
});

test("hours nobody approves in time approve themselves, and the business hears", async ({
  request,
}) => {
  const since = new Date().toISOString();
  const shift = await workedShift([{ name: "Hannah Schmidt" }]);
  const sheet = await timesheetFor(shift.bookings[0]!.assignmentId);
  await serviceClient()
    .from("timesheets")
    .update({ approve_by: new Date(Date.now() - 60_000).toISOString() })
    .eq("id", sheet!.id);

  expect((await request.get("/api/cron/timesheets")).status()).toBe(401);
  const response = await request.get("/api/cron/timesheets", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  const approved = await timesheetFor(shift.bookings[0]!.assignmentId);
  expect(approved?.status).toBe("auto_approved");
  expect(approved?.timesheet_costs?.pay_cents).toBeGreaterThan(0);
  const { data: emails } = await serviceClient()
    .from("dev_outbox")
    .select("subject")
    .eq("channel", "email")
    .gte("created_at", since)
    .eq("subject", "Approved automatically: Hannah Schmidt's hours");
  expect(emails).toHaveLength(1);
});

test("a missed clock-out uses the roster, and the business enters hours for someone who didn't clock in", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const shift = await workedShift([
    { name: "Hannah Schmidt", clockOut: false },
    { name: "Fatima Al-Sayed", clockIn: false },
  ]);
  const response = await request.get("/api/cron/timesheets", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  const fromRoster = await timesheetFor(shift.bookings[0]!.assignmentId);
  expect(fromRoster?.recorded_finish).toBeNull();
  expect(new Date(fromRoster!.finish_at).getTime()).toBe(
    shift.endsAt.getTime(),
  );
  expect(await timesheetFor(shift.bookings[1]!.assignmentId)).toBeNull();

  await signInAsDemo(page, "Sofia Rossi");
  await page.goto("/business/timesheets");
  await expect(
    page.getByRole("checkbox", { name: `Hannah Schmidt, ${shift.day}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No hours yet" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: `Add Fatima Al-Sayed's hours for ${shift.day}` })
    .click();
  await expect(
    page.getByRole("heading", { name: "Add Fatima Al-Sayed's hours" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Approve these hours" }).click();
  await expect(page.getByText("Approved with changes").first()).toBeVisible();
  const entered = await timesheetFor(shift.bookings[1]!.assignmentId);
  expect(entered?.status).toBe("adjusted");
  expect(entered?.recorded_start).toBeNull();
});

/** "07:30" in Sydney, as a time input takes it. */
function timeValue(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
