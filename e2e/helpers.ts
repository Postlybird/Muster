import { expect, type Page } from "@playwright/test";

/** A random Australian mobile number in the 04xx range, e.g. "0491 234 567". */
export function randomMobile(): { local: string; e164: string } {
  const rest = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return { local: `04${rest}`, e164: `+614${rest}` };
}

export function randomEmail(prefix = "e2e"): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@e2e.test`;
}

/** Reads the newest sign-in code sent to `recipient` from the demo outbox. */
export async function readCodeFromOutbox(page: Page, recipient: string): Promise<string> {
  const outbox = await page.context().newPage();
  await outbox.goto(`/dev/outbox?to=${encodeURIComponent(recipient)}`);
  const code = outbox.getByLabel(/^Code /).first();
  await expect(code).toBeVisible();
  const text = (await code.textContent())?.trim() ?? "";
  await outbox.close();
  expect(text).toMatch(/^\d{6}$/);
  return text;
}
