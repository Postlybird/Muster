import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";
import { formatInTimeZone } from "date-fns-tz";

import { addDays, lastFullWeek } from "../../src/domain/pay-runs";
import { fromSydneyTime, sydneyDateKey } from "../../src/lib/format";
import { weekLabel } from "../../src/lib/pay-run-format";
import {
  pageAs,
  serviceClient,
  signInWithEmailCode,
  undoPayRuns,
} from "../helpers";
import {
  approveBusiness,
  approveRosteredHours,
  bookApplicant,
  payrollId,
  postWork,
  setUpBusiness,
  signUpWorker,
  takeJob,
  verifyWorker,
  type Worker,
} from "./flows";

/**
 * The Phase 1 acceptance run (brief §11): "an admin can onboard 10 workers
 * and 3 businesses, fill 20 shifts end to end, and produce the payroll
 * export and invoices without editing the database by hand".
 *
 * Everyone works through the app. The run touches the database for one
 * thing only, time: once the shifts are booked, they move back to last
 * week as if they'd been worked, so last week's pay run can include them.
 * (To run again on the same database, it first undoes any run of that
 * week, as the pay run tests do.) Checks read the database to count.
 */

const TIME_ZONE = "Australia/Sydney";

/** The Monday at least a week from today (Sydney), when the work is booked. */
function bookingMonday(today: string): string {
  let day = addDays(today, 7);
  while (new Date(`${day}T00:00:00Z`).getUTCDay() !== 1) day = addDays(day, 1);
  return day;
}

test("Phase 1 acceptance: 10 workers and 3 businesses onboarded, 20 shifts filled and worked, then payroll and invoices", async ({
  page,
  browser,
}) => {
  const service = serviceClient();
  const today = sydneyDateKey(new Date());
  const week = lastFullWeek(today);
  const monday = bookingMonday(today);
  // Names unique to this run, so it can run again on the same data.
  const tag = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join("");

  await test.step("Start from no pay run for last week", () =>
    undoPayRuns(week.start));

  // 1. Three businesses sign up, and an admin approves them.
  const businesses = await test.step("3 businesses sign up", async () => [
    await setUpBusiness(page, {
      name: "Main depot",
      address: "12 George St, Parramatta",
      suburb: "Parramatta",
    }),
    await setUpBusiness(page, {
      name: "Flood job",
      address: "40 Parramatta Rd, Granville",
      suburb: "Granville",
    }),
    await setUpBusiness(page, {
      name: "Office tower",
      address: "1 Main St, Blacktown",
      suburb: "Blacktown",
    }),
  ]);
  const [cleaning, restoration, offices] = businesses as [
    (typeof businesses)[number],
    (typeof businesses)[number],
    (typeof businesses)[number],
  ];
  const admin = await pageAs(browser, "Alex Morgan");
  await test.step("An admin approves them", async () => {
    for (const business of businesses) {
      await approveBusiness(admin, business.name);
    }
  });

  // 2. Ten workers sign up with their mobiles, and an admin checks them.
  const people = [
    "Ava",
    "Ben",
    "Chloe",
    "Dev",
    "Ella",
    "Finn",
    "Grace",
    "Hugo",
    "Isla",
    "Jack",
  ].map((first, index) => ({
    first,
    last: `Muster-${tag}`,
    // The last four work on restoration jobs, which need a White Card.
    category: index < 6 ? "Commercial cleaner" : "Restoration labourer",
    ticket: index < 6 ? null : "White Card",
  }));
  const workers: Worker[] = [];
  await test.step("10 workers sign up and submit their details", async () => {
    for (const person of people) workers.push(await signUpWorker(page, person));
  });
  await test.step("An admin checks each worker and activates them", async () => {
    for (const worker of workers) await verifyWorker(admin, worker);
  });
  const worker = (first: string) => workers.find((w) => w.first === first)!;

  // 3. The businesses post 20 shifts for the week after next.
  const friday = addDays(monday, 4);
  const tuesday = addDays(monday, 1);
  const jobs = await test.step("The businesses post 20 shifts", async () => {
    await signInWithEmailCode(page, cleaning.ownerEmail);
    const cleaningWeek = await postWork(page, {
      business: cleaning,
      category: "Commercial cleaner",
      workers: 2,
      fillMode: "First in",
      days: { first: monday, last: friday },
    });
    const cleaningTwoDays = await postWork(page, {
      business: cleaning,
      category: "Commercial cleaner",
      workers: 1,
      fillMode: "First in",
      days: { first: monday, last: tuesday },
    });
    await signInWithEmailCode(page, restoration.ownerEmail);
    const floodWeek = await postWork(page, {
      business: restoration,
      category: "Restoration labourer",
      workers: 1,
      fillMode: "I'll choose",
      days: { first: monday, last: friday },
    });
    const floodTwoDays = await postWork(page, {
      business: restoration,
      category: "Restoration labourer",
      workers: 1,
      fillMode: "I'll choose",
      days: { first: monday, last: tuesday },
    });
    await signInWithEmailCode(page, offices.ownerEmail);
    const officeWeek = await postWork(page, {
      business: offices,
      category: "Commercial cleaner",
      workers: 1,
      fillMode: "First in",
      days: { first: monday, last: friday },
    });
    const officeDay = await postWork(page, {
      business: offices,
      category: "Commercial cleaner",
      workers: 1,
      fillMode: "First in",
      day: addDays(monday, 2),
    });
    return {
      cleaningWeek,
      cleaningTwoDays,
      floodWeek,
      floodTwoDays,
      officeWeek,
      officeDay,
    };
  });
  const jobIds = Object.values(jobs);
  const { data: shifts } = await service
    .from("shifts")
    .select("id, starts_at, ends_at")
    .in("job_id", jobIds);
  expect(shifts).toHaveLength(20);

  // 4. Workers take the work; owners choose from applicants.
  await test.step("Workers accept and apply; owners pick", async () => {
    await takeJob(page, worker("Ava"), jobs.cleaningWeek);
    await takeJob(page, worker("Ben"), jobs.cleaningWeek);
    await takeJob(page, worker("Chloe"), jobs.cleaningTwoDays);
    await takeJob(page, worker("Dev"), jobs.officeWeek);
    await takeJob(page, worker("Ella"), jobs.officeDay);
    await takeJob(page, worker("Grace"), jobs.floodWeek);
    await takeJob(page, worker("Hugo"), jobs.floodTwoDays);
    await takeJob(page, worker("Isla"), jobs.floodTwoDays);
    await bookApplicant(page, restoration, jobs.floodWeek, worker("Grace"));
    await bookApplicant(page, restoration, jobs.floodTwoDays, worker("Hugo"));
  });
  const { data: filled } = await service
    .from("shifts")
    .select("status")
    .in("job_id", jobIds);
  expect(filled?.every((shift) => shift.status === "filled")).toBe(true);

  // 5. Fast-forward: the booked week becomes last week, same days and hours.
  await test.step("Fast-forward to after the work was done", async () => {
    const back = Math.round(
      (Date.parse(`${monday}T00:00:00Z`) -
        Date.parse(`${week.start}T00:00:00Z`)) /
        86_400_000,
    );
    const moved = (at: string) => {
      const day = formatInTimeZone(at, TIME_ZONE, "yyyy-MM-dd");
      const time = formatInTimeZone(at, TIME_ZONE, "HH:mm");
      return fromSydneyTime(addDays(day, -back), time).toISOString();
    };
    for (const shift of shifts ?? []) {
      await service
        .from("shifts")
        .update({
          starts_at: moved(shift.starts_at),
          ends_at: moved(shift.ends_at),
        })
        .eq("id", shift.id);
    }
  });

  // 6. Owners enter and approve the rostered hours.
  let approved = 0;
  await test.step("Owners approve everyone's hours", async () => {
    for (const business of businesses) {
      approved += await approveRosteredHours(page, business);
    }
  });
  expect(approved).toBe(25);

  // 7. The weekly run: payroll file and invoices.
  await test.step("An admin runs last week's pay and invoices", async () => {
    await admin.goto("/admin/pay-runs");
    await expect(
      admin.getByRole("heading", { name: `Week of ${weekLabel(week)}` }),
    ).toBeVisible();
    for (const business of businesses) {
      await expect(
        admin.getByRole("cell", { name: business.name, exact: true }),
      ).toBeVisible();
    }
    await admin.getByRole("button", { name: "Run pay and invoices" }).click();
    await admin.getByRole("button", { name: "Run it" }).click();
    await expect(
      admin.getByText(/^Done\. Each invoice has been emailed/),
    ).toBeVisible({ timeout: 60_000 });
  });
  const runPage = admin.url();

  await test.step("The payroll file has every shift worked", async () => {
    const [download] = await Promise.all([
      admin.waitForEvent("download"),
      admin.getByRole("link", { name: /Payroll file/ }).click(),
    ]);
    const csv = readFileSync((await download.path())!, "utf8");
    // Finn and Jack took no work, and Hugo was chosen over Isla.
    const shiftsWorked: Record<string, number> = {
      Ava: 5,
      Ben: 5,
      Chloe: 2,
      Dev: 5,
      Ella: 1,
      Finn: 0,
      Grace: 5,
      Hugo: 2,
      Isla: 0,
      Jack: 0,
    };
    for (const [first, count] of Object.entries(shiftsWorked)) {
      // Employee ID, then "Last, First".
      const start = `${payrollId(worker(first))},"Muster-${tag}, ${first}",`;
      const lines = csv.split("\r\n").filter((line) => line.startsWith(start));
      expect(lines, `${first}'s shifts`).toHaveLength(count);
    }
  });

  await test.step("Each business has an invoice with a PDF", async () => {
    const expected = new Map([
      [cleaning.name, 12],
      [restoration.name, 7],
      [offices.name, 6],
    ]);
    for (const [name, lines] of expected) {
      await admin.goto(runPage);
      const link = admin
        .getByRole("region", { name: "Invoices" })
        .getByRole("row")
        .filter({ hasText: name })
        .getByRole("link");
      const number = await link.innerText();
      await link.click();
      await expect(
        admin.getByRole("heading", { name: `Invoice ${number}` }),
      ).toBeVisible();
      const [pdf] = await Promise.all([
        admin.waitForEvent("download"),
        admin.getByRole("link", { name: "PDF" }).click(),
      ]);
      expect(
        readFileSync((await pdf.path())!)
          .subarray(0, 5)
          .toString(),
      ).toBe("%PDF-");
      const { data: invoice } = await service
        .from("invoices")
        .select("id")
        .eq("number", number)
        .single();
      const { count } = await service
        .from("pay_run_lines")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", invoice!.id);
      expect(count, `${name}'s invoice lines`).toBe(lines);
    }
  });

  await admin.context().close();
});
