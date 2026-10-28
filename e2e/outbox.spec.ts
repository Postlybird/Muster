import { expect, test } from "@playwright/test";

test("each messaging adapter delivers to the demo outbox", async ({ page }) => {
  await page.goto("/dev/outbox");
  await page.getByRole("button", { name: "Send test messages" }).click();
  await expect(
    page.getByText("This is a test email from the email adapter.").first(),
  ).toBeVisible();
  await expect(
    page.getByText("this is a test text from the SMS adapter.").first(),
  ).toBeVisible();
  await expect(
    page.getByText("This is a test from the push adapter.").first(),
  ).toBeVisible();
});
