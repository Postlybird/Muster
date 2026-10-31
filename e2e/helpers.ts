import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { loadMatchingSettings } from "../scripts/seed/steps/matches";
import { fromSydneyTime } from "../src/lib/format";
import { matchJob } from "../src/lib/matching";
import type { Database } from "../src/lib/supabase/database.types";

/** A random Australian mobile number in the 04xx range. */
export function randomMobile(): { local: string; e164: string } {
  const rest = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return { local: `04${rest}`, e164: `+614${rest}` };
}

export function randomEmail(prefix = "e2e"): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@e2e.test`;
}

/**
 * Reads the newest sign-in code sent to `recipient` from the demo outbox.
 * With `sentAfter` (taken just before asking for the code), it waits for a
 * code sent since then, so an earlier code to someone signing in again
 * can't be read by mistake.
 */
export async function readCodeFromOutbox(
  page: Page,
  recipient: string,
  { sentAfter }: { sentAfter?: Date } = {},
): Promise<string> {
  if (sentAfter) {
    // A second's leeway either side of the clocks; earlier codes are older.
    const since = new Date(sentAfter.getTime() - 1000).toISOString();
    let code = "";
    await expect
      .poll(
        async () => {
          const { data } = await serviceClient()
            .from("dev_outbox")
            .select("meta")
            .eq("recipient", recipient)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(1);
          code = String(
            (data?.[0]?.meta as { otp?: string } | undefined)?.otp ?? "",
          );
          return code;
        },
        { message: `a new code for ${recipient}` },
      )
      .toMatch(/^\d{6}$/);
    return code;
  }
  const outbox = await page.context().newPage();
  await outbox.goto(`/dev/outbox?to=${encodeURIComponent(recipient)}`);
  const code = outbox.getByLabel(/^Code /).first();
  await expect(code).toBeVisible();
  const text = (await code.textContent())?.trim() ?? "";
  await outbox.close();
  expect(text).toMatch(/^\d{6}$/);
  return text;
}

/** Signs up a brand-new worker with an SMS code. */
export async function signInAsNewWorker(page: Page) {
  const mobile = randomMobile();
  await page.goto("/login?as=worker");
  await page.getByLabel("Mobile number").fill(mobile.local);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(
    page.getByRole("heading", { name: "Enter your code" }),
  ).toBeVisible();
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, mobile.e164));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/worker$/);
  return mobile;
}

/** Signs a business user in (or up) with a code emailed to them. */
export async function signInWithEmailCode(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/login?as=business");
  await page.getByLabel("Email address").fill(email);
  const sentAfter = new Date();
  await page.getByRole("button", { name: "Send code" }).click();
  // The code step, or the reason there isn't one.
  const codeStep = page.getByRole("heading", { name: "Enter your code" });
  const problem = page.getByRole("main").getByRole("alert");
  await expect(codeStep.or(problem)).toBeVisible();
  if (await problem.isVisible()) {
    throw new Error(`No code sent to ${email}: ${await problem.innerText()}`);
  }
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, email, { sentAfter }));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/business$/);
}

/** Signs up a brand-new business user with an email code. */
export async function signInAsNewBusiness(page: Page) {
  const email = randomEmail("owner");
  await signInWithEmailCode(page, email);
  return email;
}

/** Fails the test with a readable list if the page breaks WCAG 2.1 AA rules. */
/**
 * On the work types step: opens the industry (they start closed) and ticks
 * one of its work types.
 */
export async function chooseWorkType(
  page: Page,
  industry: string,
  workType: string,
) {
  const section = page
    .locator("details")
    .filter({ has: page.getByText(industry, { exact: true }) });
  if (!(await section.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await section.locator("summary").click();
  }
  await section.getByLabel(new RegExp(`^${workType}`)).check();
}

/**
 * Waits until a signed-in page has swapped its loading outline for the
 * real page. Pages arrive as an outline first, and the address changes
 * then, so check for something on the page (or call this) before checking
 * that something isn't there.
 */
export async function pageLoaded(page: Page) {
  await expect(page.locator("[data-page-skeleton]")).toHaveCount(0);
}

export async function expectAccessible(page: Page) {
  await pageLoaded(page);
  // Let fades finish: a toast that's still appearing is partly transparent.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary, `Accessibility problems on ${page.url()}`).toEqual([]);
  // WCAG 1.4.10 (reflow): nothing makes the page scroll sideways.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, `The page scrolls sideways on ${page.url()}`).toBe(0);
}

/** Demo mode: signs in as a seeded account by name ("Alex Morgan" is an admin). */
export async function signInAsDemo(page: Page, name: string) {
  await page.goto("/login");
  const button = page.getByRole("button", { name: new RegExp(name) });
  if (!(await button.isVisible())) {
    // Worker accounts are folded away by default.
    await page.getByText(/Worker accounts/).click();
  }
  await button.click();
  await page.waitForURL(/\/(admin|business|worker)$/);
}

/**
 * Supabase with the secret key, for setting up test data the app can't
 * create itself (e.g. a non-demo admin). Local and CI databases only.
 */
export function serviceClient() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase URL and secret key are needed");
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("Browser tests only change the local database");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** The current code an authenticator app would show for a base32 secret (RFC 6238). */
export function totp(secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.replace(/[\s=]/g, "").toUpperCase()) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("Not a base32 secret");
    bits += value.toString(2).padStart(5, "0");
  }
  const key = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

/**
 * A worker who has submitted everything and is waiting to be checked,
 * created directly in the database so admin tests can be repeated.
 */
export async function createPendingWorker(
  options: { visa?: boolean; ticketCode?: string } = {},
) {
  const supabase = serviceClient();
  const mobile = randomMobile();
  const email = randomEmail("pending");
  const lastName = `Tester${Math.floor(Math.random() * 1e6)}`;
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    phone: mobile.e164,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { full_name: `Pat ${lastName}` },
  });
  if (error || !created.user) throw new Error(error?.message);
  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("profile_id", created.user.id)
    .single();
  const workerId = worker!.id as string;

  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const upload = async (bucket: string, path: string) => {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, image, { contentType: "image/png", upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    return path;
  };

  await supabase
    .from("workers")
    .update({
      legal_first_name: "Pat",
      legal_last_name: lastName,
      date_of_birth: "1995-04-02",
      photo_path: await upload("worker-photos", `${workerId}/photo-e2e.png`),
      photo_status: "pending",
      home_suburb: "Parramatta",
      home_postcode: "2150",
      status: "pending",
      submitted_at: new Date().toISOString(),
      onboarding_steps: ["about", "contact", "travel", "right-to-work"],
    })
    .eq("id", workerId);
  await supabase.from("work_rights").insert(
    options.visa
      ? {
          worker_id: workerId,
          basis: "visa",
          passport_number: "E2E12345",
          passport_country: "Japan",
          visa_subclass: "500",
          vevo_consent_at: new Date().toISOString(),
        }
      : {
          worker_id: workerId,
          basis: "citizen",
          citizenship_evidence: "australian_passport",
          evidence_path: await upload(
            "identity",
            `${workerId}/citizenship-e2e.png`,
          ),
        },
  );
  await supabase.from("identity_checks").insert({
    worker_id: workerId,
    document_type: "driver_licence",
    document_path: await upload("identity", `${workerId}/id-document-e2e.png`),
    selfie_path: await upload("identity", `${workerId}/selfie-e2e.png`),
  });
  if (options.ticketCode) {
    const { data: type } = await supabase
      .from("credential_types")
      .select("id, kind")
      .eq("code", options.ticketCode)
      .single();
    await supabase.from("worker_credentials").insert({
      worker_id: workerId,
      credential_type_id: type!.id,
      number: "E2E-1",
      issued_on: new Date(Date.now() - 30 * 86_400_000)
        .toISOString()
        .slice(0, 10),
      document_path: await upload(
        type!.kind === "police_check" ? "identity" : "worker-docs",
        `${workerId}/ticket-e2e.png`,
      ),
    });
  }
  return { workerId, email, mobile, name: `Pat ${lastName}` };
}

/** A random ABN with a valid checksum (the demo register accepts any). */
export function randomAbn(): string {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  for (;;) {
    const digits = Array.from({ length: 11 }, () =>
      Math.floor(Math.random() * 10),
    );
    if (digits[0] === 0) continue;
    const sum = digits.reduce(
      (total, digit, i) => total + (i === 0 ? digit - 1 : digit) * weights[i]!,
      0,
    );
    if (sum % 89 === 0) return digits.join("");
  }
}

/** A random date far in the future (yyyy-mm-dd), so repeated runs don't clash. */
export function randomFutureDate(): string {
  const pick = (min: number, max: number) =>
    min + Math.floor(Math.random() * (max - min + 1));
  const month = String(pick(1, 12)).padStart(2, "0");
  const day = String(pick(1, 28)).padStart(2, "0");
  return `${pick(2040, 2099)}-${month}-${day}`;
}

/**
 * A business that has submitted everything and is waiting for approval,
 * created directly in the database so admin tests can be repeated. Pass an
 * ABN to reuse one (any earlier business with it is archived first).
 */
export async function createPendingBusiness(options: { abn?: string } = {}) {
  const supabase = serviceClient();
  const abn = options.abn ?? randomAbn();
  if (options.abn) {
    await supabase
      .from("businesses")
      .update({ archived_at: new Date().toISOString() })
      .eq("abn", abn)
      .is("archived_at", null);
  }
  const email = randomEmail("pending.owner");
  const name = `Test Business ${Math.floor(Math.random() * 1e6)}`;
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: "Robin Owner", signup_role: "business_user" },
  });
  if (error || !created.user) throw new Error(error?.message);
  const ownerId = created.user.id;

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      abn,
      legal_name: `${name.toUpperCase()} PTY LTD`,
      entity_type: "Australian Private Company",
      abn_status: "active",
      gst_registered: true,
      gst_registered_from: "2015-07-01",
      abr_state: "NSW",
      abr_postcode: "2150",
      abr_checked_at: new Date().toISOString(),
      trading_name: name,
      billing_contact_name: "Robin Owner",
      billing_contact_phone: "+61255501234",
      accounts_email: email,
      onboarding_steps: ["abn", "details", "sites", "team", "agreement"],
      status: "pending",
      submitted_at: new Date().toISOString(),
      created_by: ownerId,
    })
    .select("id")
    .single();
  if (businessError || !business) throw new Error(businessError?.message);
  await supabase.from("business_users").insert({
    business_id: business.id,
    profile_id: ownerId,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });
  await supabase.from("sites").insert({
    business_id: business.id,
    name: "Head office",
    address_line1: "12 George St",
    suburb: "Parramatta",
    state: "NSW",
    postcode: "2150",
    lat: -33.8148,
    lng: 151.0017,
  });
  return { businessId: business.id as string, name, ownerEmail: email };
}

/**
 * Makes sure a demo business has accepted the current services agreement.
 * Another test publishes new versions, which (rightly) stops posting.
 */
export async function acceptCurrentAgreement(tradingName: string) {
  const supabase = serviceClient();
  const [{ data: business }, { data: agreement }] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, created_by")
      .eq("trading_name", tradingName)
      .is("archived_at", null)
      .single(),
    supabase
      .from("agreements")
      .select("id")
      .eq("kind", "labour_hire_services")
      .is("jurisdiction", null)
      .eq("is_current", true)
      .maybeSingle(),
  ]);
  if (!business || !agreement) return;
  const { count } = await supabase
    .from("agreement_acceptances")
    .select("id", { count: "exact", head: true })
    .eq("agreement_id", agreement.id)
    .eq("business_id", business.id);
  if (!count) {
    await supabase.from("agreement_acceptances").insert({
      agreement_id: agreement.id,
      profile_id: business.created_by,
      business_id: business.id,
      user_agent: "Browser test setup",
    });
  }
}

/**
 * A one-shift job posted straight into the local database, with workers
 * matched to it as posting through the app would (without texting). It's
 * two hours at a random time on a random day 30 to 170 days ahead, so it
 * doesn't clash with bookings from earlier test runs.
 */
export async function postTestJob(options: {
  business: string;
  site: string;
  category: string;
  fillMode: "pick" | "auto";
  headcount?: number;
}): Promise<{ jobId: string; shiftId: string }> {
  const supabase = serviceClient() as unknown as SupabaseClient<Database>;
  const pick = (min: number, max: number) =>
    min + Math.floor(Math.random() * (max - min + 1));
  const [{ data: business }, { data: category }] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_users(profile_id, role)")
      .eq("trading_name", options.business)
      .single(),
    supabase
      .from("categories")
      .select(
        "id, default_level, police_check_required, category_credentials(credential_type_id)",
      )
      .eq("name", options.category)
      .single(),
  ]);
  if (!business || !category) throw new Error("Demo data is missing");
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("business_id", business.id)
    .eq("name", options.site)
    .single();
  if (!site) throw new Error(`No site called ${options.site}`);

  const headcount = options.headcount ?? 1;
  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      business_id: business.id,
      site_id: site.id,
      category_id: category.id,
      level: category.default_level,
      headcount,
      fill_mode: options.fillMode,
      police_check_required: category.police_check_required,
      no_known_hazards: true,
      instructions: "Browser test job.",
      steps: ["what", "when", "needs", "safety", "review"],
      status: "posted",
      posted_at: new Date().toISOString(),
      posted_by:
        business.business_users.find((u) => u.role === "owner")?.profile_id ??
        null,
    })
    .select("id")
    .single();
  if (!job) throw new Error(`Couldn't post a test job: ${error?.message}`);
  const tickets = category.category_credentials.map((c) => ({
    job_id: job.id,
    credential_type_id: c.credential_type_id,
  }));
  if (tickets.length > 0)
    await supabase.from("job_credentials").insert(tickets);

  const day = new Date(Date.now() + pick(30, 170) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const minutes = pick(24, 72) * 15; // 6:00 am to 6:00 pm
  const time = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const { data: shift } = await supabase
    .from("shifts")
    .insert({
      job_id: job.id,
      starts_at: fromSydneyTime(day, time(minutes)).toISOString(),
      ends_at: fromSydneyTime(day, time(minutes + 120)).toISOString(),
      headcount,
    })
    .select("id")
    .single();
  if (!shift) throw new Error("Couldn't add a shift to the test job");
  await matchJob(supabase, job.id, await loadMatchingSettings(supabase), {
    notify: false,
  });
  return { jobId: job.id, shiftId: shift.id };
}

/**
 * A second person signed in on their own browser, the same size as the
 * test's, for flows where two people act at once. Close its context after.
 */
export async function pageAs(browser: Browser, name: string): Promise<Page> {
  const use = test.info().project.use;
  const context = await browser.newContext({
    baseURL: use.baseURL,
    locale: use.locale,
    timezoneId: use.timezoneId,
    viewport: use.viewport,
    userAgent: use.userAgent,
    deviceScaleFactor: use.deviceScaleFactor,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
  });
  const page = await context.newPage();
  await signInAsDemo(page, name);
  return page;
}

/** Books a demo worker on a shift directly, as if they'd been picked. */
export async function bookTestWorker(shiftId: string, name: string) {
  const supabase = serviceClient();
  const [first, ...rest] = name.split(" ");
  const { data: worker } = await supabase
    .from("workers")
    .select("id, profile_id, profiles(phone)")
    .eq("legal_first_name", first)
    .eq("legal_last_name", rest.join(" "))
    .single();
  if (!worker) throw new Error(`No demo worker called ${name}`);
  const { data: result } = await supabase.rpc("book_worker", {
    p_shift_id: shiftId,
    p_worker_id: worker.id,
    p_check_visible: false,
  });
  expect(result).toBe("booked");
  const profile = worker.profiles as unknown as { phone: string };
  return { workerId: worker.id as string, phone: profile.phone };
}

/** Moves a shift to start `hours` from now (negative: already started). */
export async function moveShift(shiftId: string, hours: number) {
  const start = Date.now() + hours * 3_600_000;
  await serviceClient()
    .from("shifts")
    .update({
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(start + 2 * 3_600_000).toISOString(),
    })
    .eq("id", shiftId);
}

/**
 * Releases everyone booked on a test job and cancels it, so bookings from
 * earlier runs never clash with later ones.
 */
export async function releaseTestJob(jobId: string) {
  const supabase = serviceClient();
  const { data: shifts } = await supabase
    .from("shifts")
    .select("id")
    .eq("job_id", jobId);
  await supabase
    .from("assignments")
    .update({ status: "cancelled_by_business" })
    .eq("status", "confirmed")
    .in(
      "shift_id",
      (shifts ?? []).map((shift) => shift.id),
    );
  await supabase.from("jobs").update({ status: "cancelled" }).eq("id", jobId);
}

/**
 * Removes the pay runs for weeks from `from` on, as if they had never been
 * done, so a test (and the next test run) can run the week again.
 */
export async function undoPayRuns(from: string) {
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
