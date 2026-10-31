import { expect, test, type Page } from "@playwright/test";

import {
  expectAccessible,
  randomEmail,
  readCodeFromOutbox,
  serviceClient,
  totp,
} from "./helpers";

async function signInByEmail(page: Page, email: string) {
  await page.goto("/login?as=business");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, email));
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("admins need an authenticator app as well as their email", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const email = randomEmail("admin");
  const supabase = serviceClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  expect(error).toBeNull();
  await supabase
    .from("profiles")
    .update({ role: "admin", full_name: "Test Admin" })
    .eq("id", data.user!.id);

  // First sign-in: set up the app.
  await signInByEmail(page, email);
  await expect(page).toHaveURL(/\/mfa$/);
  await expect(
    page.getByRole("heading", { name: "Set up your authenticator app" }),
  ).toBeVisible();
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/mfa$/);

  await page.getByRole("button", { name: "Show the QR code" }).click();
  const secret = (await page.getByTestId("mfa-secret").textContent()) ?? "";
  await expectAccessible(page);
  await page.getByLabel("6-digit code from your app").fill("000000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("That code didn't work")).toBeVisible();
  await page.getByLabel("6-digit code from your app").fill(totp(secret));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Admin data loads, so the database accepts the second factor too.
  await page.goto("/admin/catalogues/categories");
  await expect(
    page.getByRole("link", { name: "Restoration labourer" }),
  ).toBeVisible();

  // Next time: just the code. Codes can't be reused, so use the next one.
  await page.context().clearCookies();
  await signInByEmail(page, email);
  await expect(page).toHaveURL(/\/mfa$/);
  await expect(
    page.getByRole("heading", { name: "Enter your code" }),
  ).toBeVisible();
  const nextWindow = Math.ceil(Date.now() / 30_000) * 30_000;
  await page.waitForTimeout(nextWindow - Date.now() + 500);
  await page.getByLabel("6-digit code from your app").fill(totp(secret));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
