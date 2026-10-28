import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

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
