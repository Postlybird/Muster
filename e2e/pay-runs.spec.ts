import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { addDays, lastFullWeek } from "../src/domain/pay-runs";
import {
  formatCalendarDate,
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
} from "./helpers";

function runWeek() {
  return lastFullWeek(sydneyDateKey(new Date()));
}

/**
 * Removes the week's run, and any later one, as if it had never been done,
 * so each test (and the next test run) can run the week again.
 */
async function undoPayRuns(from: string) {
  const service = serviceClient();
  const { data: runs } = await service
    .from("pay_runs")
    .select("id")
    .gte("period_start", from);
  const ids = (runs ?? []).map((run) => run.id as string);
  if (ids.length === 0) return;
  const { data: invoices } = await service
    .from("invoices")
    .select("pdf_path")
    .in("pay_run_id", ids);
  const paths = (invoices ?? []).flatMap((i) => (i.pdf_path as string) ?? []);
  if (paths.length > 0) await service.storage.from("invoices").remove(paths);
  await service.from("pay_run_lines").delete().in("pay_run_id", ids);
  await service.from("invoices").delete().in("pay_run_id", ids);
  await service.from("pay_runs").delete().in("id", ids);
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
