import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/** A random Australian mobile number in the 04xx range. */
export function randomMobile(): { local: string; e164: string } {
  const rest = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return { local: `04${rest}`, e164: `+614${rest}` };
}

export function randomEmail(prefix = "e2e"): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@e2e.test`;
}

/** Reads the newest sign-in code sent to `recipient` from the demo outbox. */
export async function readCodeFromOutbox(
  page: Page,
  recipient: string,
): Promise<string> {
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
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(
    page.getByRole("heading", { name: "Enter your code" }),
  ).toBeVisible();
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, email));
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
export async function expectAccessible(page: Page) {
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
