import { expect, test } from "@playwright/test";

import { expectAccessible, signInAsDemo } from "./helpers";

test("a worker sees work they can take, without the address", async ({
  page,
}) => {
  await signInAsDemo(page, "Liam O'Brien");
  // Home shows the first offers.
  await expect(
    page.getByRole("heading", { name: "Shifts for you" }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Find shifts" })
    .click();
  await expect(page).toHaveURL(/\/worker\/shifts$/);
  const flood = page
    .getByRole("link", {
      name: /Restoration labourer.*Harbour Restoration.*Granville/,
    })
    .first();
  await expect(flood).toContainText(/\$\d+\.\d\d an hour/);
  await expect(flood).toContainText("Mould");
  await expectAccessible(page);

  // Everything needed to decide: pay, hazards, PPE, tickets, instructions.
  await flood.click();
  await expect(page).toHaveURL(/\/worker\/shifts\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "Restoration labourer" }),
  ).toBeVisible();
  await expect(page.getByText("for Harbour Restoration")).toBeVisible();
  await expect(
    page.getByText(/an hour, casual loading included/),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: /^Mould$/ }),
  ).toBeVisible();
  await expect(page.getByText(/Two-person lifts/)).toBeVisible();
  await expect(page.getByText(/The business supplies it/)).toBeVisible();
  await expect(page.getByText(/Strip wet carpet/)).toBeVisible();
  await expect(page.getByText(/Granville, [\d.]+ km from home/)).toBeVisible();
  // The street address and site contact wait until they're booked.
  await expect(
    page.getByText(/full address and who to report to once you're booked/),
  ).toBeVisible();
  await expect(page.getByText(/Parramatta Rd/)).toHaveCount(0);
  await expect(page.getByText(/site container/)).toHaveCount(0);
  await expectAccessible(page);
});

test("a business sees how many workers its job was offered to", async ({
  page,
}) => {
  await signInAsDemo(page, "Lisa Nguyen");
  await page.goto("/business/jobs");
  await page
    .getByRole("link", { name: /Restoration labourer at Granville flood job/ })
    .first()
    .click();
  await expect(
    page.getByText(/^Offered to \d+ workers? who match/),
  ).toBeVisible();
  // Never who, or what they're paid.
  await expect(page.getByText("Liam O'Brien")).toHaveCount(0);
  await expect(page.getByText(/an hour/)).toHaveCount(0);
});
