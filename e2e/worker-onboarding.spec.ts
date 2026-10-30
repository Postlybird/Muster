import { expect, test, type Page } from "@playwright/test";

import {
  chooseWorkType,
  expectAccessible,
  randomEmail,
  readCodeFromOutbox,
  signInAsDemo,
  signInAsNewWorker,
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

test("a new worker goes from sign-up to submitted", async ({ page }) => {
  test.setTimeout(180_000);
  await signInAsNewWorker(page);

  // Home: what to have ready, then start.
  await expect(
    page.getByRole("heading", { name: "Let's get you set up" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Start" }).click();

  // 1. About you
  await expect(page).toHaveURL(/\/worker\/onboarding\/about$/);
  await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
  await next(page);
  await expect(page.getByText("Enter your first name")).toBeVisible();
  await page.getByLabel("First name").fill("Casey");
  await page.getByLabel("Last name").fill("Tester");
  await page.getByLabel("Day").fill("7");
  await page.getByLabel("Month").fill("3");
  await page.getByLabel("Year").fill(String(new Date().getFullYear() - 16));
  await upload(page, "photo", "photo-3.png");
  await next(page);
  await expect(page.getByText(/at least 18/)).toBeVisible();
  await page.getByLabel("Year").fill("1996");
  await expectAccessible(page);
  await next(page);

  // 2. Contact details: signed up by mobile, so add an email with a code.
  await expect(page).toHaveURL(/\/contact$/);
  const email = randomEmail("worker");
  await page.getByLabel("Email address").fill(email);
  await next(page, "Send code");
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, email));
  await expectAccessible(page);
  await next(page, "Confirm");

  // 3. Getting to work
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
  await expectAccessible(page);
  await next(page);

  // 4. Right to work
  await expect(page).toHaveURL(/\/right-to-work$/);
  await page.getByLabel("Australian citizen").check();
  await page.getByLabel("Australian passport").check();
  await upload(page, "evidence", "certificate.png");
  await expectAccessible(page);
  await next(page);

  // 5. Photo ID
  await expect(page).toHaveURL(/\/identity$/);
  await page.getByLabel("Driver licence").check();
  await upload(page, "document", "photo-id.png");
  await upload(page, "selfie", "photo-3.png");
  await expectAccessible(page);
  await next(page);

  // 6. Work types
  await expect(page).toHaveURL(/\/work-types$/);
  await next(page);
  await expect(
    page.getByText("Choose at least one type of work"),
  ).toBeVisible();
  await chooseWorkType(page, "Restoration", "Restoration labourer");
  await page.getByLabel("Experience in this work").selectOption("2");
  await page
    .getByLabel(/A little about you/)
    .fill("Two years on water damage jobs.");
  await expectAccessible(page);
  await next(page);

  // 7. Tickets: add the White Card the work type needs.
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

  // 8. Availability: weekdays by default; add Saturday and urgent call-outs.
  await expect(page).toHaveURL(/\/availability$/);
  await page.getByLabel("Saturday").check();
  await page.getByLabel("Urgent call-outs").check();
  await expectAccessible(page);
  await next(page);

  // 9. Employment paperwork
  await expect(page).toHaveURL(/\/paperwork$/);
  await next(page);
  await expect(page.getByText("Tick the box to confirm").first()).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await expectAccessible(page);
  await next(page);

  // 10. Check and submit
  await expect(page).toHaveURL(/\/submit$/);
  await expectAccessible(page);
  await next(page, "Submit for checking");
  await expect(page).toHaveURL(/\/worker\?submitted=1$/);
  await expect(page.getByText("Thanks, we've got your details")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your checks" }),
  ).toBeVisible();
  await expectAccessible(page);
});

test("onboarding needs the collection notice first", async ({ page }) => {
  await signInAsDemo(page, "Lucy Tran");
  await page.goto("/worker/onboarding/about");
  await expect(page).toHaveURL(/\/worker$/);
  await expect(
    page.getByRole("heading", { name: "Let's get you set up" }),
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
