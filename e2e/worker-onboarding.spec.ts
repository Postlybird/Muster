import { expect, test, type Page } from "@playwright/test";

import {
  expectAccessible,
  postTestJob,
  quickSignUp,
  randomEmail,
  registerAs,
  releaseTestJob,
  signInAsDemo,
} from "./helpers";

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

test("a new worker signs up in two minutes, then gets ready to work", async ({
  page,
}) => {
  test.setTimeout(180_000);
  // Restoration work near Parramatta, for the preview.
  const { jobId } = await postTestJob({
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "Restoration labourer",
    fillMode: "pick",
  });
  try {
    await signUpAndGetReady(page);
  } finally {
    await releaseTestJob(jobId);
  }
});

async function signUpAndGetReady(page: Page) {
  // Register: name and email, then the emailed code.
  await page.goto("/register/worker");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("Enter your first name")).toBeVisible();
  await expectAccessible(page);
  const email = randomEmail("worker");
  await registerAs(page, "worker", { first: "Casey", last: "Tester", email });

  // The quick sign-up: a mobile, then where and what. No ID yet.
  await expect(page).toHaveURL(/\/worker\/onboarding\/start$/);
  await expect(
    page.getByRole("heading", { name: "Two quick things" }),
  ).toBeVisible();
  await expectAccessible(page);
  await quickSignUp(page);

  // Home: shifts near them, and what's left before we can check them.
  await expect(page.getByText("You're signed up")).toBeVisible();
  const ready = page.getByRole("region", { name: "Get ready to work" });
  await expect(ready.getByRole("listitem")).toHaveCount(4);
  const nearby = page.getByRole("region", { name: "Shifts near you" });
  await expect(
    nearby.getByText("You can apply once we've checked your details."),
  ).toBeVisible();
  // Seeded restoration work near Parramatta shows, without the business.
  await expect(nearby.getByText("Restoration labourer").first()).toBeVisible();
  await expect(nearby.getByText("Harbour Restoration")).toHaveCount(0);
  await expect(nearby.getByRole("link")).toHaveCount(0);
  await expectAccessible(page);
  await ready.getByRole("link", { name: "Start" }).click();

  // 1. About you: their name is already in.
  await expect(page).toHaveURL(/\/worker\/onboarding\/about$/);
  await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
  await expect(page.getByLabel("First name")).toHaveValue("Casey");
  await page.getByLabel("Day").fill("7");
  await page.getByLabel("Month").fill("3");
  await page.getByLabel("Year").fill(String(new Date().getFullYear() - 16));
  await upload(page, "photo", "photo-3.png");
  await next(page);
  await expect(page.getByText(/at least 18/)).toBeVisible();
  await page.getByLabel("Year").fill("1996");
  await expectAccessible(page);
  await next(page);

  // 2. Photo ID
  await expect(page).toHaveURL(/\/identity$/);
  await page.getByLabel("Driver licence").check();
  await upload(page, "document", "photo-id.png");
  await upload(page, "selfie", "photo-3.png");
  await expectAccessible(page);
  await next(page);

  // 3. Right to work
  await expect(page).toHaveURL(/\/right-to-work$/);
  await page.getByLabel("Australian citizen").check();
  await page.getByLabel("Australian passport").check();
  await upload(page, "evidence", "certificate.png");
  await expectAccessible(page);
  await next(page);

  // 4. Tickets: add the White Card their work needs.
  await expect(page).toHaveURL(/\/tickets$/);
  await expectAccessible(page);
  await page.getByRole("link", { name: "Add: White Card" }).click();
  await expect(page.getByRole("heading", { name: "White Card" })).toBeVisible();
  await page.getByLabel("Ticket or licence number").fill("WC-123456");
  await page.getByLabel(/Date issued/).fill("2022-05-01");
  await upload(page, "document", "certificate.png");
  await expectAccessible(page);
  await next(page, "Save ticket");
  await expect(page.getByText("White Card saved")).toBeVisible();
  await expect(page.getByText("Being checked")).toBeVisible();
  await next(page, "Continue");

  // 5. Employment paperwork
  await expect(page).toHaveURL(/\/paperwork$/);
  await next(page);
  await expect(page.getByText("Tick the box to confirm").first()).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await expectAccessible(page);
  await next(page);

  // 6. Check and submit
  await expect(page).toHaveURL(/\/submit$/);
  await expectAccessible(page);
  await next(page, "Submit for checking");
  await expect(page).toHaveURL(/\/worker\?submitted=1$/);
  await expect(page.getByText("Thanks, we've got your details")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your checks" }),
  ).toBeVisible();
  await expectAccessible(page);
}

test("the steps wait for the quick sign-up and the collection notice", async ({
  page,
}) => {
  await signInAsDemo(page, "Lucy Tran");
  await page.goto("/worker/onboarding/about");
  await expect(page).toHaveURL(/\/worker$/);
  await expect(
    page.getByRole("heading", { name: "Finish signing up" }),
  ).toBeVisible();
});

test("a worker sees why a check was rejected and how to fix it", async ({
  page,
}) => {
  await signInAsDemo(page, "Zoe Anderson");
  await expect(page.getByText("Being checked").first()).toBeVisible();
  await expect(page.getByText(/more than 12 months old/)).toBeVisible();
  await page
    .getByRole("link", { name: /Fix it.*National Police Check/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "National Police Check" }),
  ).toBeVisible();
  await expect(page.getByText(/This needs fixing/)).toBeVisible();
  await expectAccessible(page);
});

test("an active worker's profile and availability", async ({ page }) => {
  await signInAsDemo(page, "Liam O'Brien");
  await page.goto("/worker/profile");
  await expect(
    page.getByRole("heading", { name: "Liam O'Brien" }),
  ).toBeVisible();
  await expect(page.getByText("Restoration labourer")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name: /Change.*Availability/ }).click();
  await expect(page).toHaveURL(/\/worker\/availability$/);
  await expectAccessible(page);
  const date = new Date(Date.now() + 20 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByLabel("Note (optional)").fill("Exam");
  await page.getByRole("button", { name: "Block out" }).click();
  await expect(page.getByText("Exam")).toBeVisible();
  await page
    .getByRole("button", { name: /^Remove / })
    .last()
    .click();
  await expect(page.getByText("Exam")).toBeHidden();
});
