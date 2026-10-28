import { expect, test, type Page } from "@playwright/test";

import {
  createPendingWorker,
  expectAccessible,
  readCodeFromOutbox,
  signInAsDemo,
} from "./helpers";

async function decide(
  page: Page,
  section: string,
  choice: string | RegExp,
  extra?: () => Promise<void>,
) {
  const area = page.locator(`section#${section}`);
  await area.getByLabel(choice).first().check();
  if (extra) await extra();
  await area.getByRole("button", { name: "Save decision" }).first().click();
}

test("an admin checks a new worker and activates them", async ({ page }) => {
  test.setTimeout(120_000);
  const worker = await createPendingWorker({ ticketCode: "white_card" });
  await signInAsDemo(page, "Alex Morgan");

  await page.goto("/admin/verification");
  await expect(
    page.getByRole("heading", { name: /New workers/ }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("link", { name: worker.name }).click();
  await expect(page.getByRole("heading", { name: worker.name })).toBeVisible();
  await expect(page.getByText(/To activate, finish/)).toBeVisible();
  await expectAccessible(page);

  await decide(page, "photo", "Approve photo");
  await expect(page.getByText("Photo approved")).toBeVisible();

  await decide(
    page,
    "right-to-work",
    "The document shows Australian citizenship",
  );
  await expect(page.getByText(/Citizenship confirmed/)).toBeVisible();
  await expect(
    page.locator("section#right-to-work").getByText(/Deleted after checking/),
  ).toBeVisible();

  // Approving ID needs a reference.
  await decide(page, "identity", /ID matches/);
  await expect(page.getByText(/last few characters/)).toBeVisible();
  await page.getByLabel(/Last 4 characters/).fill("7731");
  await page
    .locator("section#identity")
    .getByRole("button", { name: "Save decision" })
    .click();
  await expect(
    page.getByText("ID verified. The images have been deleted."),
  ).toBeVisible();
  await expect(page.locator("section#identity img")).toHaveCount(0);

  await decide(page, "tickets", "Verify");
  await expect(page.getByText("White Card verified")).toBeVisible();

  await page.getByLabel("Employment Hero employee ID").fill("EH-9001");
  await page.getByLabel("Payroll setup").selectOption("complete");
  await page.getByRole("button", { name: "Save payroll details" }).click();
  await expect(page.getByText("Payroll details saved")).toBeVisible();

  await page.getByRole("button", { name: "Activate" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Activate" })
    .click();
  await expect(page.getByText("Worker activated")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: worker.name }).locator(".."),
  ).toContainText("Active");

  // The worker is told by text.
  await page.goto(`/dev/outbox?to=${encodeURIComponent(worker.mobile.e164)}`);
  await expect(
    page.getByText(/You're verified and ready to work/),
  ).toBeVisible();
});

test("a rejection reaches the worker with the reason", async ({ page }) => {
  test.setTimeout(120_000);
  const worker = await createPendingWorker();
  await signInAsDemo(page, "Alex Morgan");
  await page.goto(`/admin/workers/${worker.workerId}`);

  await decide(page, "photo", "Reject", async () => {
    await page
      .locator("section#photo")
      .getByLabel("Reason")
      .selectOption({ index: 2 });
  });
  await expect(page.getByText("Photo rejected")).toBeVisible();

  // The worker signs in and sees what to fix.
  await page.context().clearCookies();
  await page.goto("/login?as=worker");
  await page.getByLabel("Mobile number").fill(worker.mobile.local);
  await page.getByRole("button", { name: "Send code" }).click();
  await page
    .getByLabel("6-digit code")
    .fill(await readCodeFromOutbox(page, worker.mobile.e164));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/worker$/);
  await expect(page.getByText(/take off sunglasses or a hat/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Change photo/ })).toBeVisible();
});

test("an admin records a VEVO check for a visa holder", async ({ page }) => {
  const worker = await createPendingWorker({ visa: true });
  await signInAsDemo(page, "Alex Morgan");
  await page.goto(`/admin/workers/${worker.workerId}`);

  await decide(page, "right-to-work", "VEVO shows they can work", async () => {
    const area = page.locator("section#right-to-work");
    await area.getByLabel("VEVO reference").fill("E2E-VEVO-1");
    await area.getByLabel(/Visa expiry/).fill("2028-02-01");
    await area
      .getByLabel("Work conditions shown in VEVO")
      .fill("8105: work limited to 48 hours per fortnight");
  });
  await expect(page.getByText("Right to work verified")).toBeVisible();
  const area = page.locator("section#right-to-work");
  await expect(area.getByText("01/02/2028").first()).toBeVisible();
  await expect(area.getByText("Yes", { exact: true })).toBeVisible();
  await expectAccessible(page);
});
