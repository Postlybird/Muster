import { expect, test } from "@playwright/test";

import {
  acceptCurrentAgreement,
  expectAccessible,
  moveShift,
  postTestJob,
  readCodeFromOutbox,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
} from "./helpers";

// Jobs posted by these tests, released afterwards so bookings never pile up.
const posted: string[] = [];
test.afterEach(async () => {
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
});

/** Liam takes call-outs and is free now, so the time of day doesn't matter. */
async function liamTakesCallouts() {
  const service = serviceClient();
  const { data: liam } = await service
    .from("profiles")
    .select("id, phone")
    .eq("email", "liam.obrien@demo.test")
    .single();
  await service
    .from("workers")
    .update({
      urgent_opt_in: true,
      available_now_until: new Date(Date.now() + 4 * 3_600_000).toISOString(),
    })
    .eq("profile_id", liam!.id);
  return { phone: liam!.phone! };
}

test("open work becomes a call-out, and a worker accepts it from the text", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const liam = await liamTakesCallouts();
  const { jobId, shiftId } = await postTestJob({
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "Restoration labourer",
    fillMode: "pick",
  });
  posted.push(jobId);
  // Starting tomorrow, say after a booked worker cancelled.
  await moveShift(shiftId, 40 + Math.random() * 6);

  await signInAsDemo(page, "Lisa Nguyen");
  await page.goto(`/business/jobs/${jobId}`);
  await expect(
    page.getByRole("heading", { name: "Need someone fast?" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Make it a call-out" }).click();
  const dialog = page.getByRole("dialog", { name: "Make this a call-out?" });
  await expect(dialog).toContainText("costs 20% more per hour");
  await dialog.getByRole("button", { name: "Make it a call-out" }).click();
  await expect(
    page
      .getByRole("region", { name: "Call-out" })
      .getByText(/^Sent to \d+ workers? by text and app notification/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Need someone fast?" }),
  ).toHaveCount(0);

  // Liam is texted a link, with the call-out rate.
  const { data: texts } = await serviceClient()
    .from("dev_outbox")
    .select("body")
    .eq("channel", "sms")
    .eq("recipient", liam.phone)
    .like("body", `%/worker/shifts/${jobId}`);
  expect(texts).toHaveLength(1);
  expect(texts![0]!.body).toMatch(/with the call-out rate\. First in gets it:/);

  // Signed out, the link asks him to sign in, then brings him back to it.
  await page.context().clearCookies();
  await page.goto(`/worker/shifts/${jobId}`);
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Mobile number").fill("0491 570 006");
  const sentAfter = new Date();
  await page.getByRole("button", { name: "Send code" }).click();
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, liam.phone, { sentAfter }));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`/worker/shifts/${jobId}$`));
  await page.getByRole("button", { name: "Accept now" }).click();
  await expect(
    page.getByRole("heading", { name: "You're booked on 1 shift" }),
  ).toBeVisible();

  // His home screen has the call-out switches.
  await page.goto("/worker");
  const urgent = page.getByRole("region", { name: "Urgent work" });
  await expect(urgent.getByRole("switch", { name: /Call-outs/ })).toBeChecked();
  await expect(
    urgent.getByRole("switch", { name: /Available now/ }),
  ).toBeChecked();
  await expectAccessible(page);
});

test("a call-out nobody takes in 20 minutes alerts the business and our team", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const { jobId, shiftId } = await postTestJob({
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "Restoration labourer",
    fillMode: "auto",
  });
  posted.push(jobId);
  await moveShift(shiftId, 40 + Math.random() * 6);
  // Out for 25 minutes with no one accepting.
  await serviceClient()
    .from("jobs")
    .update({
      type: "urgent",
      callout_started_at: new Date(Date.now() - 25 * 60_000).toISOString(),
      callout_alerted_at: null,
    })
    .eq("id", jobId);

  const response = await request.get("/api/cron/callouts", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);

  const { data: messages } = await serviceClient()
    .from("dev_outbox")
    .select("body")
    .like("body", "%Nobody has accepted%call-out%");
  const bodies = (messages ?? []).map((m) => m.body);
  expect(
    bodies.filter((body) => body.includes(`/business/jobs/${jobId}`)),
  ).toHaveLength(1);
  expect(
    bodies.some(
      (body) =>
        body.includes("Harbour Restoration's call-out") &&
        body.includes("/admin/shifts"),
    ),
  ).toBe(true);

  await signInAsDemo(page, "Lisa Nguyen");
  await page.goto(`/business/jobs/${jobId}`);
  await expect(
    page
      .getByRole("region", { name: "Call-out" })
      .getByText(
        "No one has accepted yet, so our team is looking for someone too.",
      ),
  ).toBeVisible();
});

test("a business starts a call-out from its dashboard, from its latest job", async ({
  page,
}) => {
  // Another test publishes new agreement versions, which stops posting.
  await acceptCurrentAgreement("Harbour Restoration");
  await signInAsDemo(page, "Lisa Nguyen");
  await page.goto("/business");
  await page.getByRole("button", { name: "Post a call-out" }).click();
  await expect(page).toHaveURL(/\/business\/post\/[0-9a-f-]+\/when$/);
  // As soon as possible: the start is already filled in.
  await expect(
    page.getByLabel(/Date \(today for as soon as possible\)/),
  ).not.toHaveValue("");
});
