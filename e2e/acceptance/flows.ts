import { expect, type Page } from "@playwright/test";

import {
  randomAbn,
  randomEmail,
  readCodeFromOutbox,
  signInAsNewBusiness,
  signInAsNewWorker,
  signInWithEmailCode,
} from "../helpers";

/**
 * Steps of the Phase 1 acceptance run, done the way people do them in the
 * app: sign-ups and wizards, admin checks, posting, booking and hours.
 */

const ASSETS = "scripts/seed/assets";

async function upload(page: Page, inputId: string, file: string) {
  await page.locator(`#${inputId}`).setInputFiles(`${ASSETS}/${file}`);
  await expect(
    page
      .locator(`#${inputId}`)
      .locator("..")
      .getByText(/^Uploaded/),
  ).toBeVisible();
}

async function next(page: Page, label = "Save and continue") {
  await page.getByRole("button", { name: label, exact: true }).click();
}

export type Business = {
  name: string;
  /** As the posting wizard lists it: "Main depot (Parramatta)". */
  site: string;
  ownerEmail: string;
};

/** An owner signs up, sets up their business and submits it (brief §4.2). */
export async function setUpBusiness(
  page: Page,
  site: { name: string; address: string; suburb: string },
): Promise<Business> {
  const ownerEmail = await signInAsNewBusiness(page);
  await page.getByRole("link", { name: "Start" }).click();

  const abn = randomAbn();
  await page.getByLabel("ABN").fill(abn);
  await page.getByRole("button", { name: "Look up" }).click();
  await page.getByRole("button", { name: "This is my business" }).click();

  await expect(page).toHaveURL(/\/details$/);
  await page.getByLabel("Billing contact").fill("Robin Accounts");
  await page.getByLabel("Their phone").fill("02 5550 1234");
  await page.getByLabel("Accounts email").fill(randomEmail("accounts"));
  await next(page);

  await expect(page).toHaveURL(/\/sites$/);
  await page.getByLabel("Site name").fill(site.name);
  await page
    .getByRole("combobox", { name: "Street address" })
    .fill(site.address);
  await page
    .getByRole("option", { name: new RegExp(`^${site.address}`) })
    .click();
  await page.getByRole("button", { name: "Add site" }).click();
  await expect(page.getByText(`${site.name} added`)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/team$/);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/agreement$/);
  await page.getByLabel(/I accept this agreement/).check();
  await page.getByRole("button", { name: "Accept and continue" }).click();

  await expect(page).toHaveURL(/\/submit$/);
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page).toHaveURL(/\/business\?submitted=1$/);
  return {
    name: `Demo Business ${abn.slice(-4)}`,
    site: `${site.name} (${site.suburb})`,
    ownerEmail,
  };
}

/** An admin approves a business on account terms (brief §4.2 step 7). */
export async function approveBusiness(admin: Page, name: string) {
  await admin.goto("/admin/businesses?status=pending");
  await admin.getByRole("link", { name, exact: true }).click();
  await admin.getByRole("radio", { name: "Approve" }).check();
  await expect(
    admin.getByRole("checkbox", { name: "Approved for account terms" }),
  ).toBeChecked();
  await admin.getByRole("button", { name: "Save decision" }).click();
  await expect(admin.getByText(`${name} approved`)).toBeVisible();
}

export type Worker = {
  first: string;
  last: string;
  name: string;
  mobile: { local: string; e164: string };
  category: string;
  ticket: string | null;
};

/** A worker signs up on their phone and submits their details (brief §4.1). */
export async function signUpWorker(
  page: Page,
  person: {
    first: string;
    last: string;
    category: string;
    ticket: string | null;
  },
): Promise<Worker> {
  await page.context().clearCookies();
  const mobile = await signInAsNewWorker(page);
  await page.getByRole("button", { name: "Start" }).click();

  await expect(page).toHaveURL(/\/worker\/onboarding\/about$/);
  await page.getByLabel("First name").fill(person.first);
  await page.getByLabel("Last name").fill(person.last);
  await page.getByLabel("Day").fill("7");
  await page.getByLabel("Month").fill("3");
  await page.getByLabel("Year").fill("1994");
  await upload(page, "photo", "photo-3.png");
  await next(page);

  await expect(page).toHaveURL(/\/contact$/);
  const email = randomEmail("worker");
  await page.getByLabel("Email address").fill(email);
  await next(page, "Send code");
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, email));
  await next(page, "Confirm");

  await expect(page).toHaveURL(/\/travel$/);
  await page.getByRole("combobox", { name: "Your suburb" }).fill("Parra");
  await page.getByRole("option", { name: "Parramatta NSW 2150" }).click();
  await page.getByLabel("How far will you travel?").selectOption("40");
  await page
    .getByRole("radiogroup", { name: "Do you have a car to get to work?" })
    .getByLabel("No")
    .check();
  await page.getByLabel("Driver licence").selectOption("none");
  await page
    .getByRole("radiogroup", {
      name: "Can you get to work by public transport?",
    })
    .getByLabel("Yes")
    .check();
  await next(page);

  await expect(page).toHaveURL(/\/right-to-work$/);
  await page.getByLabel("Australian citizen").check();
  await page.getByLabel("Australian passport").check();
  await upload(page, "evidence", "certificate.png");
  await next(page);

  await expect(page).toHaveURL(/\/identity$/);
  await page.getByLabel("Driver licence").check();
  await upload(page, "document", "photo-id.png");
  await upload(page, "selfie", "photo-3.png");
  await next(page);

  await expect(page).toHaveURL(/\/work-types$/);
  await page.getByLabel(new RegExp(`^${person.category}`)).check();
  await page.getByLabel("Experience in this work").selectOption("2");
  await next(page);

  await expect(page).toHaveURL(/\/tickets$/);
  if (person.ticket) {
    await page.getByRole("link", { name: `Add: ${person.ticket}` }).click();
    await page
      .getByLabel("Ticket or licence number")
      .fill(`WC-${Math.floor(Math.random() * 1e6)}`);
    await page.getByLabel(/Date issued/).fill("2022-05-01");
    await upload(page, "document", "certificate.png");
    await next(page, "Save ticket");
    await expect(page.getByText(`${person.ticket} saved`)).toBeVisible();
  }
  await next(page, "Continue");

  await expect(page).toHaveURL(/\/availability$/);
  await next(page);

  await expect(page).toHaveURL(/\/paperwork$/);
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await next(page);

  await expect(page).toHaveURL(/\/submit$/);
  await next(page, "Submit for checking");
  await expect(page).toHaveURL(/\/worker\?submitted=1$/);
  return {
    ...person,
    name: `${person.first} ${person.last}`,
    mobile,
  };
}

/** The payroll employee ID the admin records for a worker. */
export function payrollId(worker: Worker): string {
  return `EH-${worker.mobile.e164.slice(-6)}`;
}

async function decide(page: Page, section: string, choice: string | RegExp) {
  const area = page.locator(`section#${section}`);
  await area.getByLabel(choice).first().check();
  await area.getByRole("button", { name: "Save decision" }).first().click();
}

/**
 * An admin checks a new worker's photo, right to work, ID and tickets,
 * records their payroll setup, and activates them (brief §4.1, §6).
 */
export async function verifyWorker(admin: Page, worker: Worker) {
  await admin.goto("/admin/verification");
  await admin.getByRole("link", { name: worker.name, exact: true }).click();
  await expect(
    admin.getByRole("heading", { level: 1, name: worker.name }),
  ).toBeVisible();

  await decide(admin, "photo", "Approve photo");
  await expect(admin.getByText("Photo approved")).toBeVisible();
  await decide(
    admin,
    "right-to-work",
    "The document shows Australian citizenship",
  );
  await expect(admin.getByText(/Citizenship confirmed/)).toBeVisible();
  await admin
    .locator("section#identity")
    .getByLabel(/ID matches/)
    .check();
  await admin.getByLabel(/Last 4 characters/).fill("7731");
  await admin
    .locator("section#identity")
    .getByRole("button", { name: "Save decision" })
    .click();
  await expect(
    admin.getByText("ID verified. The images have been deleted."),
  ).toBeVisible();
  if (worker.ticket) {
    await decide(admin, "tickets", "Verify");
    await expect(admin.getByText(`${worker.ticket} verified`)).toBeVisible();
  }
  await admin.getByLabel("Employment Hero employee ID").fill(payrollId(worker));
  await admin.getByLabel("Payroll setup").selectOption("complete");
  await admin.getByRole("button", { name: "Save payroll details" }).click();
  await expect(admin.getByText("Payroll details saved")).toBeVisible();

  await admin.getByRole("button", { name: "Activate" }).click();
  await admin
    .getByRole("dialog")
    .getByRole("button", { name: "Activate" })
    .click();
  await expect(admin.getByText("Worker activated")).toBeVisible();
}

export type Posting = {
  business: Business;
  category: string;
  workers: number;
  fillMode: "First in" | "I'll choose";
} & ({ days: { first: string; last: string } } | { day: string });

/** An owner posts work through the wizard (brief §4.3) and gets its id. */
export async function postWork(page: Page, posting: Posting): Promise<string> {
  await page.goto("/business/post");
  await page.getByRole("button", { name: "Start" }).click();

  await expect(page).toHaveURL(/\/what$/);
  await page
    .getByRole("radio", {
      name: new RegExp("days" in posting ? "^Several days" : "^One shift"),
    })
    .check();
  await page
    .getByLabel("Where?")
    .selectOption({ label: posting.business.site });
  await page
    .getByLabel("Type of work")
    .selectOption({ label: posting.category });
  await page.getByLabel("How many workers?").fill(String(posting.workers));
  await next(page);

  await expect(page).toHaveURL(/\/when$/);
  if ("days" in posting) {
    await page.getByLabel("First day").fill(posting.days.first);
    await page.getByLabel("Last day").fill(posting.days.last);
  } else {
    await page.getByLabel("Date", { exact: true }).fill(posting.day);
  }
  await page.getByLabel("Start").fill("07:00");
  await page.getByLabel("Finish").fill("15:30");
  await page.getByLabel("Unpaid break").selectOption({ label: "30 minutes" });
  await next(page);

  await expect(page).toHaveURL(/\/needs$/);
  await page
    .getByLabel(/Instructions for workers/)
    .fill("Report to the site lead at the front gate.");
  await next(page);

  await expect(page).toHaveURL(/\/safety$/);
  await page.getByLabel("No known hazards").check();
  await next(page);

  await expect(page).toHaveURL(/\/review$/);
  await page
    .getByRole("radio", { name: new RegExp(`^${posting.fillMode}`) })
    .check();
  await page.getByRole("button", { name: "Post work" }).click();
  await expect(page).toHaveURL(/\/business\/jobs\/[0-9a-f-]+\?posted=1$/);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

/** Signs a worker in again with a code texted to their mobile. */
export async function signInWorker(page: Page, worker: Worker) {
  await page.context().clearCookies();
  await page.goto("/login?as=worker");
  await page.getByLabel("Mobile number").fill(worker.mobile.local);
  await page.getByRole("button", { name: "Send code" }).click();
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, worker.mobile.e164));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/worker$/);
}

/** A worker takes every shift of a job: accepted, or applied for. */
export async function takeJob(page: Page, worker: Worker, jobId: string) {
  await signInWorker(page, worker);
  await page.goto(`/worker/shifts/${jobId}`);
  await page
    .getByRole("button", {
      name: /^(Accept|Apply for) \d+ shifts?$|^Accept this shift$|^Apply$/,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: /^(You're booked on|Applied for) / }),
  ).toBeVisible();
}

/** The owner books an applicant for all the shifts they applied for. */
export async function bookApplicant(
  page: Page,
  business: Business,
  jobId: string,
  worker: Worker,
) {
  await signInWithEmailCode(page, business.ownerEmail);
  await page.goto(`/business/jobs/${jobId}`);
  const shown = `${worker.first} ${worker.last[0]}.`;
  await page
    .getByRole("region", { name: "Applicants" })
    .getByRole("button", {
      name: new RegExp(`^Book \\d+ shifts? for ${shown}$`),
    })
    .click();
  await expect(
    page.getByText(new RegExp(`^Booked ${shown} for`)),
  ).toBeVisible();
}

/**
 * The owner enters and approves the rostered hours for everyone booked
 * whose shifts have finished, one at a time (brief §4.6).
 */
export async function approveRosteredHours(page: Page, business: Business) {
  await signInWithEmailCode(page, business.ownerEmail);
  let approved = 0;
  for (;;) {
    await page.goto("/business/timesheets");
    const add = page.getByRole("link", { name: /^Add .+'s hours for / });
    if ((await add.count()) === 0) break;
    await add.first().click();
    await page.getByRole("button", { name: "Approve these hours" }).click();
    await expect(page.getByText("Approved with changes").first()).toBeVisible();
    approved++;
  }
  return approved;
}
