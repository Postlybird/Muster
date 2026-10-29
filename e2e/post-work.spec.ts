import { expect, test } from "@playwright/test";

import {
  acceptCurrentAgreement,
  createPendingBusiness,
  expectAccessible,
  pageAs,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
  signInWithEmailCode,
} from "./helpers";

/** A date (yyyy-mm-dd, Sydney) on the given weekday, at least `minDays` ahead. */
function upcoming(weekday: number, minDays: number): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
  }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + minDays);
  while (date.getUTCDay() !== weekday) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function plusDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

test("a manager posts a shift and sees the cost first", async ({ page }) => {
  test.setTimeout(120_000);
  await acceptCurrentAgreement("Harbour Restoration");
  await signInAsDemo(page, "Lisa Nguyen");
  await page.goto("/business/post");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Start" }).click();

  // What and where
  await expect(page).toHaveURL(/\/what$/);
  await page.getByRole("radio", { name: /One shift/ }).check();
  await page
    .getByLabel("Where?")
    .selectOption({ label: "Parramatta depot (Parramatta)" });
  await page
    .getByLabel("Type of work")
    .selectOption({ label: "Restoration labourer" });
  await page.getByLabel("How many workers?").fill("2");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Save and continue" }).click();

  // When: a Wednesday morning, four hours.
  await expect(page).toHaveURL(/\/when$/);
  await page.getByLabel("Date", { exact: true }).fill(upcoming(3, 7));
  await page.getByLabel("Start").fill("08:00");
  await page.getByLabel("Finish").fill("12:00");
  await page.getByLabel("Unpaid break").selectOption({ label: "No break" });
  await expectAccessible(page);
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Tickets and instructions: the usual tickets are already ticked.
  await expect(page).toHaveURL(/\/needs$/);
  await expect(
    page.getByRole("checkbox", { name: /White Card/ }),
  ).toBeChecked();
  await page
    .getByLabel(/Instructions for workers/)
    .fill("Move drying equipment between floors.");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Safety: hazards need their controls.
  await expect(page).toHaveURL(/\/safety$/);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText(/Tick the hazards on site/)).toBeVisible();
  await page.getByRole("checkbox", { name: "Mould" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText(/Describe the controls/).first()).toBeVisible();
  await page
    .getByLabel("Controls in place")
    .fill("Affected rooms are sealed off. P2 masks on at all times.");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Check and post: 2 workers × 4 hours at $47.03, plus GST.
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByText("$413.86")).toBeVisible();
  await expect(page.getByRole("radio", { name: /I'll choose/ })).toBeChecked();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Post work" }).click();

  await expect(page).toHaveURL(/\/business\/jobs\/[0-9a-f-]+\?posted=1$/);
  await expect(page.getByText(/^Posted\./)).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Restoration labourer at Parramatta depot",
    }),
  ).toBeVisible();
  await expect(page.getByText("0 of 2 booked")).toBeVisible();
  await expectAccessible(page);
});

test("a business posts a past job again from its dashboard", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await acceptCurrentAgreement("Harbour Restoration");
  await signInAsDemo(page, "Lisa Nguyen");
  // Same work, site and crew: only the dates are left to choose.
  await page
    .getByRole("region", { name: "Post again" })
    .getByRole("button", { name: /^Post again/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/when$/);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await page.getByRole("button", { name: "Post work" }).click();
  await expect(page).toHaveURL(/\?posted=1$/);
  await releaseTestJob(new URL(page.url()).pathname.split("/").at(-1)!);
});

test("a template posts a week of shifts in a few clicks", async ({ page }) => {
  test.setTimeout(90_000);
  await acceptCurrentAgreement("Harbour Restoration");
  await signInAsDemo(page, "Lisa Nguyen");
  await page.goto("/business/post");
  await page.getByRole("button", { name: "Use Flood strip-out crew" }).click();

  await expect(page).toHaveURL(/\/when$/);
  const monday = upcoming(1, 21);
  await page.getByLabel("First day").fill(monday);
  await page.getByLabel("Last day").fill(plusDays(monday, 4));
  await expect(
    page.getByText("That's 5 shifts, each with the same hours."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Everything else came from the template, so it's straight to the review.
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByText(/^5 shifts,/)).toBeVisible();
  await page.getByRole("button", { name: "Post work" }).click();
  await expect(page).toHaveURL(/\?posted=1$/);
  await expect(page.getByText("0 of 3 booked")).toHaveCount(5);
});

test("favourite workers get a head start on new work", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const service = serviceClient();
  const [{ data: business }, { data: ethan }] = await Promise.all([
    service
      .from("businesses")
      .select("id")
      .eq("trading_name", "Harbour Restoration")
      .single(),
    service
      .from("workers")
      .select("id")
      .eq("legal_first_name", "Ethan")
      .eq("legal_last_name", "Murphy")
      .single(),
  ]);
  // Other tests expect Harbour Restoration to have no favourites.
  const unfavourite = () =>
    service
      .from("favourites")
      .delete()
      .eq("business_id", business!.id)
      .eq("worker_id", ethan!.id);
  await unfavourite();
  await acceptCurrentAgreement("Harbour Restoration");
  let jobId: string | undefined;
  try {
    // Ethan has worked for them before, and they make him a favourite.
    await signInAsDemo(page, "Lisa Nguyen");
    await page.goto("/business/workers");
    await page
      .getByRole("button", { name: "Add to favourites: Ethan Murphy" })
      .click();
    await expect(
      page
        .getByRole("region", { name: /^Favourites/ })
        .getByText("Ethan Murphy", { exact: true }),
    ).toBeVisible();

    // Their flood template gives favourites an hour's head start.
    await page.goto("/business/post");
    await page
      .getByRole("button", { name: "Use Flood strip-out crew" })
      .click();
    await expect(page).toHaveURL(/\/when$/);
    const wednesday = upcoming(3, 120);
    await page.getByLabel("First day").fill(wednesday);
    await page.getByLabel("Last day").fill(plusDays(wednesday, 1));
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/\/review$/);
    await expect(
      page.getByLabel("Offer it to your favourite workers first?"),
    ).toHaveValue("60");
    await page.getByRole("button", { name: "Post work" }).click();
    await expect(page).toHaveURL(/\?posted=1$/);
    jobId = new URL(page.url()).pathname.split("/").at(-1)!;
    await expect(
      page.getByText(
        /Your favourites see it first, until .+; then everyone who matches\./,
      ),
    ).toBeVisible();

    // Ethan can take it straight away.
    const favourite = await pageAs(browser, "Ethan Murphy");
    await favourite.goto(`/worker/shifts/${jobId}`);
    await expect(
      favourite.getByRole("button", { name: "Apply for 2 shifts" }),
    ).toBeVisible();
    await favourite.context().close();

    // Liam does the same work nearby, but has to wait.
    const other = await pageAs(browser, "Liam O'Brien");
    await other.goto(`/worker/shifts/${jobId}`);
    await expect(
      other.getByRole("heading", { name: "This work isn't available" }),
    ).toBeVisible();

    // An hour on, everyone who matches sees it.
    const { data: shifts } = await service
      .from("shifts")
      .select("id")
      .eq("job_id", jobId);
    await service
      .from("shift_matches")
      .update({ visible_from: new Date(Date.now() - 60_000).toISOString() })
      .in(
        "shift_id",
        (shifts ?? []).map((shift) => shift.id),
      );
    await other.reload();
    await expect(
      other.getByRole("button", { name: "Apply for 2 shifts" }),
    ).toBeVisible();
    await other.context().close();
  } finally {
    await unfavourite();
    if (jobId) await releaseTestJob(jobId);
  }
});

test("an urgent call-out texts workers nearby who opted in", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await acceptCurrentAgreement("Beaches Make Safe");
  // Liam does strip-outs within reach of Manly and takes urgent work; he's
  // switched on "available now", so the time of day doesn't matter.
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

  await signInAsDemo(page, "Craig Thompson");
  await page.goto("/business/post");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("radio", { name: /Urgent call-out/ }).check();
  await page
    .getByLabel("Where?")
    .selectOption({ label: "Manly storm repairs (Manly)" });
  await page
    .getByLabel("Type of work")
    .selectOption({ label: "Strip-out and demolition labourer" });
  await page.getByLabel("How many workers?").fill("1");
  await page.getByRole("button", { name: "Save and continue" }).click();

  // The start is already filled in: as soon as possible.
  await expect(
    page.getByLabel(/Date \(today for as soon as possible\)/),
  ).not.toHaveValue("");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.getByLabel("No known hazards").check();
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page.getByRole("radio", { name: /First in/ })).toBeChecked();
  await page.getByText("How we worked this out").click();
  await expect(page.getByText("Urgent call-out loading")).toBeVisible();
  // Urgent work goes to everyone at once, with no head start for favourites.
  await expect(
    page.getByLabel("Offer it to your favourite workers first?"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Post work" }).click();
  await expect(page).toHaveURL(/\?posted=1$/);
  await expect(
    page.getByText(/^Offered to \d+ workers? who match/),
  ).toBeVisible();

  const jobId = new URL(page.url()).pathname.split("/").at(-1);
  const { data: texts } = await service
    .from("dev_outbox")
    .select("body")
    .eq("channel", "sms")
    .eq("recipient", liam!.phone!)
    .like("body", `%/worker/shifts/${jobId}`);
  expect(texts).toHaveLength(1);
  expect(texts![0]!.body).toMatch(
    /Urgent work: Strip-out and demolition labourer in Manly, .* First in gets it:/,
  );
});

test("supervisors see their sites' jobs but don't post", async ({ page }) => {
  await signInAsDemo(page, "Tom Walsh");
  await page.goto("/business/post");
  await expect(page.getByText(/Owners and managers post work/)).toBeVisible();
  await page.goto("/business/jobs");
  await expect(
    page
      .getByRole("link", {
        name: /Restoration labourer at Granville flood job/,
      })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Post work" }),
  ).toHaveCount(0);
  await expectAccessible(page);
});

test("a business waiting for approval can't post yet", async ({ page }) => {
  const business = await createPendingBusiness();
  await signInWithEmailCode(page, business.ownerEmail);
  await page.goto("/business/post");
  await expect(
    page.getByText("You can post work once your business is approved."),
  ).toBeVisible();
});
