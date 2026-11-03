import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { addDays, lastFullWeek } from "../src/domain/pay-runs";
import {
  formatCalendarDate,
  formatCents,
  fromSydneyTime,
  sydneyDateKey,
} from "../src/lib/format";
import { weekLabel } from "../src/lib/pay-run-format";
import {
  bookTestWorker,
  expectAccessible,
  postTestJob,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
  undoPayRuns,
} from "./helpers";

function runWeek() {
  return lastFullWeek(sydneyDateKey(new Date()));
}

const posted: string[] = [];
test.beforeEach(async () => {
  await undoPayRuns(runWeek().start);
});
test.afterEach(async () => {
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
  await undoPayRuns(runWeek().start);
});

/** Approved hours at Westside last Wednesday, 10 am to 2 pm. */
async function hoursLastWeek(name: string) {
  const job = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });
  posted.push(job.jobId);
  const { workerId } = await bookTestWorker(job.shiftId, name);
  const day = addDays(runWeek().start, 2);
  const start = fromSydneyTime(day, "10:00").toISOString();
  const end = fromSydneyTime(day, "14:00").toISOString();
  const service = serviceClient();
  await service
    .from("shifts")
    .update({ starts_at: start, ends_at: end })
    .eq("id", job.shiftId);
  const { data: booking } = await service
    .from("assignments")
    .select("id")
    .eq("shift_id", job.shiftId)
    .eq("worker_id", workerId)
    .single();
  await service.from("attendance_events").insert([
    {
      assignment_id: booking!.id,
      kind: "clock_in",
      occurred_at: start,
      inside_geofence: true,
    },
    {
      assignment_id: booking!.id,
      kind: "clock_out",
      occurred_at: end,
      inside_geofence: true,
    },
  ]);
  await service
    .from("timesheets")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("assignment_id", booking!.id);
  return { day, bookingId: booking!.id as string };
}

test("an admin runs the week's pay and invoices, and the business sees its invoice", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const week = runWeek();
  const { day, bookingId } = await hoursLastWeek("Fatima Al-Sayed");

  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/pay-runs");
  await expect(
    page.getByRole("heading", { name: `Week of ${weekLabel(week)}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Westside Cleaning", exact: true }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Run pay and invoices" }).click();
  await page.getByRole("button", { name: "Run it" }).click();
  await expect(
    page.getByText(/^Done\. Each invoice has been emailed/),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("row").filter({ hasText: "Fatima Al-Sayed" }),
  ).toBeVisible();
  await expectAccessible(page);

  // Her hours are in the payroll file, as worked.
  const [csv] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /Payroll file/ }).click(),
  ]);
  expect(csv.suggestedFilename()).toBe(
    `timesheets-${week.start}_${week.end}.csv`,
  );
  expect(readFileSync((await csv.path())!, "utf8")).toContain(
    `"Al-Sayed, Fatima",${formatCalendarDate(day)},10:00,14:00,0,`,
  );

  // Westside's invoice: its PDF, then the payment arrives.
  const invoice = page
    .getByRole("row")
    .filter({ hasText: "Westside Cleaning" })
    .getByRole("link");
  const number = await invoice.innerText();
  await invoice.click();
  await expect(
    page.getByRole("heading", { name: `Invoice ${number}` }),
  ).toBeVisible();
  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "PDF" }).click(),
  ]);
  expect(
    readFileSync((await pdf.path())!)
      .subarray(0, 5)
      .toString(),
  ).toBe("%PDF-");
  await expectAccessible(page);
  await page.getByLabel("Payment reference (optional)").fill("EFT 4471");
  await page.getByRole("button", { name: "Mark paid" }).click();
  await expect(
    page.getByText(/, reference EFT 4471\. Marked by/),
  ).toBeVisible();

  // The business sees it paid, line by line.
  await page.context().clearCookies();
  await signInAsDemo(page, "Sofia Rossi");
  await page.goto("/business/invoices");
  const row = page.getByRole("listitem").filter({ hasText: number });
  await expect(row.getByText("Paid", { exact: true })).toBeVisible();
  await expectAccessible(page);
  await row.getByRole("link", { name: number, exact: true }).click();
  await expect(
    page.getByText(
      "Fatima Al-Sayed · Commercial cleaner · Blacktown office tower",
    ),
  ).toBeVisible();
  await expect(page.getByText(/^10:00 am to 2:00 pm\. /)).toBeVisible();
  await expectAccessible(page);
  const [copy] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download PDF" }).click(),
  ]);
  expect(copy.suggestedFilename()).toBe(`${number}.pdf`);

  // Paid hours can't be changed now.
  const service = serviceClient();
  const { error } = await service
    .from("timesheets")
    .update({ break_minutes: 30 })
    .eq("assignment_id", bookingId);
  expect(error?.message).toBe(
    "These hours have been paid. Contact us if something's wrong",
  );
});

test("site supervisors don't see invoices", async ({ page }) => {
  await signInAsDemo(page, "Tom Walsh");
  await page.goto("/business/invoices");
  await expect(
    page.getByText("Your owner or managers look after invoices."),
  ).toBeVisible();
});

test("a business with an overdue invoice is reminded, once a day, with the invoice attached", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  await hoursLastWeek("Fatima Al-Sayed");
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/pay-runs");
  await page.getByRole("button", { name: "Run pay and invoices" }).click();
  await page.getByRole("button", { name: "Run it" }).click();
  await expect(
    page.getByText(/^Done\. Each invoice has been emailed/),
  ).toBeVisible({ timeout: 30_000 });
  const invoice = page
    .getByRole("row")
    .filter({ hasText: "Westside Cleaning" })
    .getByRole("link");
  const number = await invoice.innerText();

  // It fell due yesterday.
  const service = serviceClient();
  const today = sydneyDateKey(new Date());
  const { error } = await service
    .from("invoices")
    .update({ due_on: addDays(today, -1) })
    .eq("number", number);
  expect(error).toBeNull();
  const { data: westside } = await service
    .from("businesses")
    .select("accounts_email")
    .eq("trading_name", "Westside Cleaning")
    .single();
  const since = new Date().toISOString();
  const runReminders = async () => {
    const response = await request.get("/api/cron/invoice-reminders", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(response.status()).toBe(200);
  };
  await runReminders();
  await runReminders();

  const { data: emails } = await service
    .from("dev_outbox")
    .select("subject, body, meta")
    .eq("channel", "email")
    .eq("recipient", westside!.accounts_email)
    .eq("subject", `Reminder: invoice ${number} is overdue`)
    .gte("created_at", since);
  expect(emails).toHaveLength(1);
  expect(emails![0]!.body).toContain(`Reference: ${number}`);
  expect(emails![0]!.meta).toMatchObject({ attachments: [`${number}.pdf`] });

  await invoice.click();
  await expect(
    page.getByText(`1 sent, the last on ${formatCalendarDate(today)}`),
  ).toBeVisible();
  await expectAccessible(page);
});

test("an admin credits an invoice, and the business gets the credit note", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await hoursLastWeek("Fatima Al-Sayed");
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/pay-runs");
  await page.getByRole("button", { name: "Run pay and invoices" }).click();
  await page.getByRole("button", { name: "Run it" }).click();
  await expect(
    page.getByText(/^Done\. Each invoice has been emailed/),
  ).toBeVisible({ timeout: 30_000 });
  const invoice = page
    .getByRole("row")
    .filter({ hasText: "Westside Cleaning" })
    .getByRole("link");
  const number = await invoice.innerText();
  await invoice.click();
  await expect(
    page.getByRole("heading", { name: `Invoice ${number}` }),
  ).toBeVisible();

  const service = serviceClient();
  const { data: before } = await service
    .from("invoices")
    .select("id, total_cents, gst_cents, business_id")
    .eq("number", number)
    .single();
  const { data: westside } = await service
    .from("businesses")
    .select("accounts_email")
    .eq("id", before!.business_id)
    .single();
  const since = new Date().toISOString();

  // More than the invoice is refused; then $11.00 of it is credited.
  const amount = page.getByLabel("Amount to credit, including GST");
  await amount.fill(((before!.total_cents + 100) / 100).toFixed(2));
  await page.getByLabel("Reason").fill("Charged for a break that was taken.");
  await page.getByRole("button", { name: "Issue credit note" }).click();
  await expect(
    page.getByText("That's more than is left to credit on the invoice").first(),
  ).toBeVisible();
  await amount.fill("11.00");
  await page.getByRole("button", { name: "Issue credit note" }).click();
  const issued = page.getByText(
    /^Credit note CN-\d+ for \$11\.00 issued and emailed to the business\.$/,
  );
  await expect(issued).toBeVisible();
  const note = (await issued.innerText()).split(" ")[2]!;
  await expect(page.getByText(`${note}: $11.00`)).toBeVisible();
  await expect(
    page.getByText("Charged for a break that was taken."),
  ).toBeVisible();
  await expectAccessible(page);

  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: `Download ${note} (PDF)` }).click(),
  ]);
  expect(pdf.suggestedFilename()).toBe(`${note}.pdf`);
  expect(
    readFileSync((await pdf.path())!)
      .subarray(0, 5)
      .toString(),
  ).toBe("%PDF-");

  const { data: emails } = await service
    .from("dev_outbox")
    .select("subject, body, meta")
    .eq("channel", "email")
    .eq("recipient", westside!.accounts_email!)
    .eq("subject", `Credit note ${note} from Shifta`)
    .gte("created_at", since);
  expect(emails).toHaveLength(1);
  expect(emails![0]!.body).toContain(
    `We've credited $11.00 (including GST of $1.00) against invoice ${number}.`,
  );
  expect(emails![0]!.meta).toMatchObject({ attachments: [`${note}.pdf`] });

  // The business sees the credit note and what's left to pay.
  const left = before!.total_cents - 1_100;
  await page.context().clearCookies();
  await signInAsDemo(page, "Sofia Rossi");
  await page.goto(`/business/invoices/${before!.id}`);
  await expect(
    page.getByText(`${formatCents(left)} due by`, { exact: false }),
  ).toContainText("after $11.00 credited.");
  await expect(page.getByText(`${note}: $11.00 credited`)).toBeVisible();
  await expectAccessible(page);
  const [copy] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: `Download ${note} (PDF)` }).click(),
  ]);
  expect(copy.suggestedFilename()).toBe(`${note}.pdf`);

  // Crediting the rest closes it, and the notes' GST adds up to the invoice's.
  await page.context().clearCookies();
  await signInAsDemo(page, "Alex Morgan");
  await page.goto(`/admin/invoices/${before!.id}`);
  await page
    .getByLabel("Amount to credit, including GST")
    .fill((left / 100).toFixed(2));
  await page.getByLabel("Reason").fill("The shift was cancelled by us.");
  await page.getByRole("button", { name: "Issue credit note" }).click();
  await expect(page.getByText("There's nothing left to credit.")).toBeVisible();
  await expect(
    page.getByText(`${formatCents(before!.total_cents)} credited.`),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark paid" })).toHaveCount(0);
  await expectAccessible(page);
  const { data: notes } = await service
    .from("credit_notes")
    .select("gst_cents, total_cents")
    .eq("invoice_id", before!.id);
  expect(notes!.reduce((sum, n) => sum + n.total_cents, 0)).toBe(
    before!.total_cents,
  );
  expect(notes!.reduce((sum, n) => sum + n.gst_cents, 0)).toBe(
    before!.gst_cents,
  );
});
