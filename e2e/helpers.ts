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

/** Signs up a brand-new business user with an email code. */
export async function signInAsNewBusiness(page: Page) {
  const email = randomEmail("owner");
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
  return email;
}

/** Fails the test with a readable list if the page breaks WCAG 2.1 AA rules. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary, `Accessibility problems on ${page.url()}`).toEqual([]);
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
