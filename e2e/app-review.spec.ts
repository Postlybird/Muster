import { expect, test, type Page } from "@playwright/test";

import { expectAccessible, serviceClient, signInAsDemo } from "./helpers";

// The app stores' reviewers sign in with a fixed code (owner, 14/11/2026),
// only while an admin has switched it on. The tests use the values CI sets.

const email = process.env.APP_REVIEW_EMAIL ?? "";
const code = process.env.APP_REVIEW_CODE ?? "";

test.skip(
  !email || !code,
  "Needs APP_REVIEW_EMAIL and APP_REVIEW_CODE, as CI sets them",
);
test.describe.configure({ mode: "serial" });

const LABEL = "Let the app stores' reviewers sign in";

async function setReviewSignIn(page: Page, on: boolean) {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/settings");
  const form = page.getByRole("form", { name: "Workers" });
  const toggle = form.getByRole("switch", { name: LABEL });
  if ((await toggle.getAttribute("aria-checked")) !== String(on)) {
    await toggle.click();
  }
  await form.getByRole("button", { name: /^Save/ }).click();
  await expect(
    page.getByText(
      on
        ? "Settings saved. The reviewers' account is ready to sign in."
        : "Settings saved",
      { exact: true },
    ),
  ).toBeVisible();
}

async function typeCode(page: Page, value: string) {
  await page.context().clearCookies();
  await page.goto("/login?as=worker");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await page.getByLabel("6-digit code").fill(value);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.afterAll(async () => {
  await serviceClient()
    .from("settings")
    .update({ value: false })
    .eq("key", "app_review_sign_in");
});

test("reviewers sign in with the fixed code while it's switched on, to an unchecked worker", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await setReviewSignIn(page, true);
  const since = new Date().toISOString();

  // A wrong code doesn't open it.
  await typeCode(page, code === "000000" ? "111111" : "000000");
  await expect(
    page.getByText("That code didn't work. Check it and try again."),
  ).toBeVisible();

  await typeCode(page, code);
  await expect(page).toHaveURL(/\/worker$/);
  const nearby = page.getByRole("region", { name: "Shifts near you" });
  await expect(
    nearby.getByText("You can apply once we've checked your details."),
  ).toBeVisible();
  await expectAccessible(page);

  // No code was emailed, and both tries are on record.
  const service = serviceClient();
  const { data: emails } = await service
    .from("dev_outbox")
    .select("id")
    .eq("recipient", email)
    .gte("created_at", since);
  expect(emails).toEqual([]);
  const { data: tries } = await service
    .from("app_review_sign_ins")
    .select("ok")
    .gte("created_at", since)
    .order("created_at");
  expect(tries).toEqual([{ ok: false }, { ok: true }]);
});

test("switched off, the fixed code doesn't work", async ({ page }) => {
  await setReviewSignIn(page, false);
  await typeCode(page, code);
  await expect(
    page.getByText(
      "That code didn't work. It may have expired. Check it, or send a new code.",
    ),
  ).toBeVisible();
});

test("ten wrong codes switch it off", async ({ page }) => {
  await setReviewSignIn(page, true);
  const service = serviceClient();
  await service
    .from("app_review_sign_ins")
    .insert(Array.from({ length: 9 }, () => ({ ok: false })));

  await typeCode(page, code === "000000" ? "111111" : "000000");
  await expect(
    page.getByText("That code didn't work. Check it and try again."),
  ).toBeVisible();
  const { data: setting } = await service
    .from("settings")
    .select("value")
    .eq("key", "app_review_sign_in")
    .single();
  expect(setting!.value).toBe(false);
});
