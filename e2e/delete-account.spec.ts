import { expect, test, type Page } from "@playwright/test";

import {
  bookTestWorker,
  enterEmailedCode,
  expectAccessible,
  postTestJob,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
  signInAsNewBusiness,
  signInAsNewWorker,
} from "./helpers";

// Delete my account (owner, 14/11/2026; both app stores require it).

const posted: string[] = [];
test.afterEach(async () => {
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
});

/** Presses Delete my account and confirms, ending on the goodbye page. */
async function deleteAccount(page: Page) {
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page
    .getByRole("dialog", { name: "Delete your account?" })
    .getByRole("button", { name: "Delete my account" })
    .click();
  await expect(page).toHaveURL(/\/account-closed$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Your account is deleted" }),
  ).toBeVisible();
}

async function closedProfile(email: string) {
  const service = serviceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id, closed_at, archived_at")
    .eq("email", email)
    .single();
  const { data: auth } = await service.auth.admin.getUserById(profile!.id);
  return { profile: profile!, bannedUntil: auth.user?.banned_until ?? null };
}

test("a new worker deletes their account, and can't sign in to it again", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const email = await signInAsNewWorker(page);
  await page.goto("/worker/settings");
  await page.getByRole("link", { name: "Delete my account" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Delete my account" }),
  ).toBeVisible();
  await expect(
    page.getByText("We keep the records the law requires"),
  ).toBeVisible();
  await expectAccessible(page);

  await deleteAccount(page);
  await expectAccessible(page);
  const { profile, bannedUntil } = await closedProfile(email);
  expect(profile.closed_at).not.toBeNull();
  expect(profile.archived_at).not.toBeNull();
  expect(bannedUntil).not.toBeNull();

  // A new code still goes out, but it doesn't open the account.
  await page.goto("/login?as=worker");
  await page.getByLabel("Email address").fill(email);
  const sentAfter = new Date();
  await page.getByRole("button", { name: "Email me a code" }).click();
  await enterEmailedCode(page, email, sentAfter);
  await expect(page.getByText(/This account was deleted/)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("a worker with a shift booked cancels it first", async ({ page }) => {
  const job = await postTestJob({
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "Restoration technician",
    fillMode: "pick",
  });
  posted.push(job.jobId);
  await bookTestWorker(job.shiftId, "Ahmed Hassan");

  await signInAsDemo(page, "Ahmed Hassan");
  await page.goto("/worker/settings/delete-account");
  await expect(
    page.getByText(/You have (a shift|\d+ shifts) booked\. Cancel/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete my account" }),
  ).toHaveCount(0);
  await expectAccessible(page);
});

test("a business's only owner is told it closes too, once its shifts are cancelled", async ({
  page,
}) => {
  const job = await postTestJob({
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "Restoration technician",
    fillMode: "pick",
  });
  posted.push(job.jobId);

  await signInAsDemo(page, "Mark Davies");
  await page.goto("/business/settings");
  await page.getByRole("link", { name: "Delete my account" }).click();
  await expect(
    page.getByText("Harbour Restoration closes too, for everyone on your team"),
  ).toBeVisible();
  await expect(
    page.getByText(/Harbour Restoration has (a shift|\d+ shifts) coming up/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete my account" }),
  ).toHaveCount(0);
  await expectAccessible(page);
});

test("a new business user deletes their account", async ({ page }) => {
  const email = await signInAsNewBusiness(page);
  await page.goto("/business/settings");
  await page.getByRole("link", { name: "Delete my account" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Delete my account" }),
  ).toBeVisible();
  await deleteAccount(page);
  const { profile, bannedUntil } = await closedProfile(email);
  expect(profile.closed_at).not.toBeNull();
  expect(bannedUntil).not.toBeNull();
});

test("the website says how to delete an account", async ({ page }) => {
  await page.goto("/delete-account");
  await expect(
    page.getByRole("heading", { level: 1, name: "Delete your account" }),
  ).toBeVisible();
  await expect(
    page.getByText("Press “Delete my account”, and confirm."),
  ).toBeVisible();
  await expectAccessible(page);
  await page.goto("/privacy");
  await expect(
    page.getByRole("link", { name: "delete your account" }),
  ).toHaveAttribute("href", "/delete-account");
});
