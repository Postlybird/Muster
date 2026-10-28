import { expect, test } from "@playwright/test";

import { postTestJob, releaseTestJob, serviceClient } from "./helpers";

test("booked workers are reminded the day before, once", async ({
  request,
}) => {
  const service = serviceClient();
  // Scheduled jobs need the secret.
  expect((await request.get("/api/cron/reminders")).status()).toBe(401);

  const { jobId, shiftId } = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });
  const { data: hannah } = await service
    .from("profiles")
    .select("id, phone")
    .eq("email", "hannah.schmidt@demo.test")
    .single();
  const { data: worker } = await service
    .from("workers")
    .select("id")
    .eq("profile_id", hannah!.id)
    .single();
  const { data: result } = await service.rpc("book_worker", {
    p_shift_id: shiftId,
    p_worker_id: worker!.id,
    p_check_visible: false,
  });
  expect(result).toBe("booked");
  // The shift moves to tomorrow morning.
  const start = Date.now() + 20 * 3_600_000;
  await service
    .from("shifts")
    .update({
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(start + 2 * 3_600_000).toISOString(),
    })
    .eq("id", shiftId);

  try {
    const run = () =>
      request.get("/api/cron/reminders", {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
    expect((await run()).status()).toBe(200);
    expect((await run()).status()).toBe(200);
    const { data: texts } = await service
      .from("dev_outbox")
      .select("body")
      .eq("recipient", hannah!.phone!)
      .like("body", `%Reminder: %/worker/shifts/${jobId}`);
    expect(texts).toHaveLength(1);
    expect(texts![0]!.body).toMatch(
      /Commercial cleaner for Westside Cleaning on \w{3} \d+ \w{3} from .* at .*, Blacktown\./,
    );
  } finally {
    // Out of the way of later runs.
    await releaseTestJob(jobId);
  }
});

test("finished shifts are closed off on schedule", async ({ request }) => {
  serviceClient(); // loads the local environment
  const { jobId, shiftId } = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });
  // It ended an hour ago.
  const start = Date.now() - 3 * 3_600_000;
  const service = serviceClient();
  await service
    .from("shifts")
    .update({
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(start + 2 * 3_600_000).toISOString(),
    })
    .eq("id", shiftId);

  const response = await request.get("/api/cron/finish-shifts", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  const { data: job } = await service
    .from("jobs")
    .select("status, shifts(status)")
    .eq("id", jobId)
    .single();
  expect(job?.status).toBe("completed");
  expect(job?.shifts).toEqual([{ status: "completed" }]);
});
