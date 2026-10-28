import { expect, test, type APIRequestContext } from "@playwright/test";

import { addDays } from "../src/domain/pay-runs";
import { formatCalendarDate, sydneyDateKey } from "../src/lib/format";
import {
  bookTestWorker,
  expectAccessible,
  postTestJob,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
} from "./helpers";

// Jobs posted and demo records changed by these tests, put back afterwards.
const posted: string[] = [];
const undo: (() => PromiseLike<unknown>)[] = [];
test.afterEach(async () => {
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
  for (const step of undo.splice(0).reverse()) await step();
});

async function runChecks(request: APIRequestContext) {
  serviceClient(); // loads the local environment
  const response = await request.get("/api/cron/compliance", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
}

async function messages(profileId: string, template: string, since: string) {
  const { data } = await serviceClient()
    .from("notifications")
    .select("body")
    .eq("profile_id", profileId)
    .eq("template", template)
    .gte("created_at", since);
  return (data ?? []).map((row) => row.body as string);
}

test("tickets are warned about, then expire, and a booking that needs them is flagged", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const service = serviceClient();
  const today = sydneyDateKey(new Date());
  const since = new Date().toISOString();
  const { data: worker } = await service
    .from("workers")
    .select("id, profile_id")
    .eq("legal_first_name", "Ahmed")
    .eq("legal_last_name", "Hassan")
    .single();
  const { data: wrt } = await service
    .from("worker_credentials")
    .select(
      "id, expires_on, last_expiry_warning_days, credential_types!inner(name)",
    )
    .eq("worker_id", worker!.id)
    .eq("status", "verified")
    .eq("credential_types.name", "IICRC WRT")
    .is("archived_at", null)
    .single();
  undo.push(() =>
    service
      .from("worker_credentials")
      .update({
        status: "verified",
        expires_on: wrt!.expires_on,
        last_expiry_warning_days: wrt!.last_expiry_warning_days,
      })
      .eq("id", wrt!.id),
  );
  // Earlier runs' messages about this ticket, so each goes again.
  await service
    .from("notifications")
    .delete()
    .like("dedupe_key", `%${wrt!.id}%`);

  // Good for a year, so he can be booked on work months away.
  await service
    .from("worker_credentials")
    .update({ expires_on: addDays(today, 365), last_expiry_warning_days: null })
    .eq("id", wrt!.id);
  const job = await postTestJob({
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "Restoration technician",
    fillMode: "pick",
  });
  posted.push(job.jobId);
  await bookTestWorker(job.shiftId, "Ahmed Hassan");

  // Ten days left: one warning, however often the checks run, and the
  // booking months away is flagged straight away, for admins and him.
  const tenDays = addDays(today, 10);
  await service
    .from("worker_credentials")
    .update({ expires_on: tenDays })
    .eq("id", wrt!.id);
  await runChecks(request);
  await runChecks(request);
  expect(await messages(worker!.profile_id, "ticket_expiring", since)).toEqual([
    `Your IICRC WRT expires on ${formatCalendarDate(tenDays)}.`,
  ]);
  expect(await messages(worker!.profile_id, "booking_at_risk", since)).toEqual([
    expect.stringMatching(
      /^Your booking for Restoration technician with Harbour Restoration on .+ can't go ahead as it is: a ticket the job needs expires before then\. Our team will be in touch\.$/,
    ),
  ]);
  const { data: booking } = await service
    .from("assignments")
    .select("id")
    .eq("shift_id", job.shiftId)
    .eq("worker_id", worker!.id)
    .single();
  undo.push(() =>
    service
      .from("admin_flags")
      .update({ status: "resolved", resolution: "Browser test" })
      .eq("assignment_id", booking!.id),
  );
  const flags = async () =>
    (
      await service
        .from("admin_flags")
        .select("summary")
        .eq("kind", "booking_at_risk")
        .eq("assignment_id", booking!.id)
    ).data ?? [];
  expect(await flags()).toEqual([
    {
      summary: expect.stringMatching(
        /^Booked for Restoration technician with Harbour Restoration on .+, but a ticket the job needs expires before then\.$/,
      ),
    },
  ]);

  // Expired yesterday: marked expired and he's told. The booking was
  // already flagged, so nobody hears about it twice.
  const yesterday = addDays(today, -1);
  await service
    .from("worker_credentials")
    .update({ expires_on: yesterday })
    .eq("id", wrt!.id);
  await runChecks(request);
  const { data: ticket } = await service
    .from("worker_credentials")
    .select("status")
    .eq("id", wrt!.id)
    .single();
  expect(ticket!.status).toBe("expired");
  expect(await messages(worker!.profile_id, "ticket_expired", since)).toEqual([
    `Your IICRC WRT expired on ${formatCalendarDate(yesterday)}.`,
  ]);
  expect(
    await messages(worker!.profile_id, "booking_at_risk", since),
  ).toHaveLength(1);
  expect(await flags()).toHaveLength(1);

  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/queues");
  await expect(
    page.getByRole("row").filter({ hasText: "Booking at risk" }).filter({
      hasText: "Ahmed Hassan",
    }),
  ).toBeVisible();
  await expectAccessible(page);
});

test("admins are told when a VEVO re-check is due", async ({
  page,
  request,
}) => {
  const service = serviceClient();
  const today = sydneyDateKey(new Date());
  const { data: rights } = await service
    .from("work_rights")
    .select("id, next_check_due, workers!inner(legal_first_name)")
    .eq("workers.legal_first_name", "Aisha")
    .single();
  undo.push(() =>
    service
      .from("work_rights")
      .update({ next_check_due: rights!.next_check_due })
      .eq("id", rights!.id),
  );
  await service
    .from("notifications")
    .delete()
    .like("dedupe_key", `vevo_recheck:${rights!.id}:%`);
  const due = addDays(today, 3);
  await service
    .from("work_rights")
    .update({ next_check_due: due })
    .eq("id", rights!.id);

  await runChecks(request);
  const { data: emails } = await service
    .from("dev_outbox")
    .select("body")
    .eq("channel", "email")
    .eq("subject", "VEVO re-check due: Aisha Rahman");
  expect(emails?.at(-1)?.body).toContain(
    `due for a VEVO re-check by ${formatCalendarDate(due)}`,
  );

  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/verification");
  const row = page
    .getByRole("region", { name: /Visa re-checks due/ })
    .getByRole("row")
    .filter({ hasText: "Aisha Rahman" });
  await expect(row.getByText(formatCalendarDate(due))).toBeVisible();
});
