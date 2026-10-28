import { expect, test, type APIRequestContext } from "@playwright/test";

import { brand } from "../src/config/brand";
import {
  bookTestWorker,
  expectAccessible,
  postTestJob,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
} from "./helpers";

// Jobs, devices, preferences and settings these tests change, put back
// afterwards so later runs (and other tests) start clean.
const posted: string[] = [];
const people: string[] = [];

async function putBack(profileId: string) {
  const service = serviceClient();
  await service.from("push_subscriptions").delete().eq("profile_id", profileId);
  await service
    .from("profiles")
    .update({ notification_prefs: {} })
    .eq("id", profileId);
}

test.afterEach(async () => {
  const service = serviceClient();
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
  for (const profileId of people.splice(0)) await putBack(profileId);
  await service
    .from("settings")
    .update({ value: { start: "00:00", end: "00:00" } })
    .eq("key", "quiet_hours");
  await service.from("notification_templates").delete().neq("key", "");
});

/**
 * A demo worker's profile, with no devices or preferences left from
 * earlier runs, put back the same way afterwards.
 */
async function personCalled(name: string) {
  const [first, ...rest] = name.split(" ");
  const { data } = await serviceClient()
    .from("workers")
    .select("profiles(id, email)")
    .eq("legal_first_name", first)
    .eq("legal_last_name", rest.join(" "))
    .single();
  const profile = data!.profiles as unknown as { id: string; email: string };
  await putBack(profile.id);
  people.push(profile.id);
  return profile;
}

/** A Westside shift tomorrow morning, booked for the worker. */
async function shiftTomorrow(name: string) {
  const job = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });
  posted.push(job.jobId);
  const { phone } = await bookTestWorker(job.shiftId, name);
  const start = Date.now() + 20 * 3_600_000;
  await serviceClient()
    .from("shifts")
    .update({
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(start + 2 * 3_600_000).toISOString(),
    })
    .eq("id", job.shiftId);
  return { jobId: job.jobId, phone };
}

async function runJob(request: APIRequestContext, job: string) {
  serviceClient(); // loads the local environment
  const response = await request.get(`/api/cron/${job}`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
}

async function sent(channel: "sms" | "push", recipient: string, jobId: string) {
  const { data } = await serviceClient()
    .from("dev_outbox")
    .select("subject, body")
    .eq("channel", channel)
    .eq("recipient", recipient)
    .like(
      channel === "sms" ? "body" : "meta->>url",
      `%/worker/shifts/${jobId}`,
    );
  return data ?? [];
}

test("a worker who turns notifications on gets them in the app instead of texts", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const name = "Fatima Al-Sayed";
  const { email } = await personCalled(name);
  await signInAsDemo(page, name);
  await page.goto("/worker/settings");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Turn on notifications" }).click();
  await expect(
    page.getByRole("button", { name: "Turn off notifications" }),
  ).toBeVisible();

  const { jobId, phone } = await shiftTomorrow(name);
  await runJob(request, "reminders");
  expect(await sent("push", email, jobId)).toEqual([
    expect.objectContaining({ subject: "Shift tomorrow" }),
  ]);
  expect(await sent("sms", phone, jobId)).toEqual([]);

  await page.goto("/worker/notifications");
  const reminder = page
    .getByRole("listitem")
    .filter({ hasText: "Shift tomorrow" })
    .first();
  await expect(reminder.getByText("New")).toBeVisible();
  await expect(
    reminder.getByText(/^Reminder: Commercial cleaner for Westside Cleaning/),
  ).toBeVisible();
  await expectAccessible(page);
});

test("a worker can turn reminders off, and still sees them in the app", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const name = "Priya Patel";
  await personCalled(name);
  await signInAsDemo(page, name);
  await page.goto("/worker/settings");
  await page.getByLabel(/Shift reminders/).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByText("Saved. We'll send you what you've chosen."),
  ).toBeVisible();

  const { jobId, phone } = await shiftTomorrow(name);
  await runJob(request, "reminders");
  expect(await sent("sms", phone, jobId)).toEqual([]);
  await page.goto("/worker/notifications");
  await expect(page.getByText("Shift tomorrow").first()).toBeVisible();
});

test("non-urgent messages wait for quiet hours to end", async ({ request }) => {
  test.setTimeout(90_000);
  const service = serviceClient();
  const name = "Hannah Schmidt";
  await personCalled(name);
  // Quiet hours from an hour ago to an hour from now, Sydney time.
  const local = (offset: number) =>
    new Date(Date.now() + offset * 3_600_000).toLocaleTimeString("en-GB", {
      timeZone: "Australia/Sydney",
      hour: "2-digit",
      minute: "2-digit",
    });
  await service
    .from("settings")
    .update({ value: { start: local(-1), end: local(1) } })
    .eq("key", "quiet_hours");

  const { jobId, phone } = await shiftTomorrow(name);
  await runJob(request, "reminders");
  expect(await sent("sms", phone, jobId)).toEqual([]);

  // Quiet hours end: the notifications job sends it.
  const { data: held } = await service
    .from("notifications")
    .update({ send_after: new Date(Date.now() - 60_000).toISOString() })
    .eq("url", `/worker/shifts/${jobId}`)
    .is("sent_at", null)
    .select("id");
  expect(held).toHaveLength(1);
  await runJob(request, "notifications");
  expect(await sent("sms", phone, jobId)).toHaveLength(1);
});

test("an admin changes a message's words, and messages use them", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/templates");
  await expectAccessible(page);
  await page.getByRole("link", { name: "Reminder the day before" }).click();
  const message = page.getByLabel("Message");
  await message.fill("Don't forget: {{work}} {{when}} at {{shop}}.");
  await page.getByRole("button", { name: "Save wording" }).click();
  await expect(
    page.getByText("{{shop}} isn't something this message can fill in"),
  ).toBeVisible();
  await message.fill(
    "Don't forget: {{work}} for {{business}} {{when}}. Details: {{link}}",
  );
  await expect(
    page.getByText(
      /^Don't forget: Commercial cleaner for Westside Cleaning on Wed 4 Nov from 7:00 am\. Details: https:/,
    ),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Save wording" }).click();
  await expect(
    page.getByText("Saved. Messages sent from now on use this wording."),
  ).toBeVisible();

  await personCalled("Hannah Schmidt");
  const { jobId, phone } = await shiftTomorrow("Hannah Schmidt");
  await runJob(request, "reminders");
  const [text] = await sent("sms", phone, jobId);
  expect(text?.body).toMatch(
    new RegExp(
      `^${brand.name}: Don't forget: Commercial cleaner for Westside Cleaning on `,
    ),
  );

  await page.getByRole("button", { name: "Use the standard wording" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Use the standard wording" })
    .click();
  await expect(page.getByText("Back to the standard wording.")).toBeVisible();
});
