import { expect, test } from "@playwright/test";

import { expectAccessible, serviceClient, signInAsDemo } from "./helpers";

// The launch notice (owner, 20/11/2026): the live site takes sign-ups
// before shifts start, and says so on every page. It's a site-wide setting,
// so these tests switch it on and off again; browser tests run one at a
// time (playwright.config.ts).

async function setNotice(on: boolean) {
  const { error } = await serviceClient()
    .from("settings")
    .update({ value: on })
    .eq("key", "launch_notice");
  expect(error).toBeNull();
}

test.describe("before we open for shifts", () => {
  test.beforeEach(async () => {
    await setNotice(true);
  });
  test.afterEach(async () => {
    await setNotice(false);
  });

  test("every page says when shifts start, and sign-up promises an email", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-site-banner]")).toContainText(
      "Shifts start in early 2027.",
    );
    await page.getByRole("tab", { name: "For workers" }).click();
    await expect(page.getByText("Before shifts start")).toBeVisible();
    await expectAccessible(page);

    await page.goto("/register/worker");
    await expect(
      page.getByText(
        "Shifts start in early 2027. Sign up now and we'll email you as soon as they open.",
      ),
    ).toBeVisible();
  });

  test("workers and businesses hear what happens next", async ({ page }) => {
    await signInAsDemo(page, "Ava Wilson");
    await page.goto("/worker/onboarding/submit");
    await expect(
      page.getByText(
        /^Shifts start in early 2027\. Before then, we'll check your ID, right to work and tickets/,
      ),
    ).toBeVisible();

    await page.context().clearCookies();
    await signInAsDemo(page, "Lisa Nguyen");
    await expect(
      page.getByText(
        "Shifts start in early 2027. You can add your sites and set up your first shifts now, and we'll email you as soon as you can post them.",
      ),
    ).toBeVisible();
    await expectAccessible(page);

    // The email to everyone waits until the notice is off.
    await page.context().clearCookies();
    await signInAsDemo(page, "Alex Morgan");
    await page.goto("/admin/settings");
    const launch = page.getByRole("region", {
      name: "Tell everyone we're open",
    });
    await expect(
      launch.getByText("Switch off the launch notice above first."),
    ).toBeVisible();
    await expect(launch.getByRole("button")).toHaveCount(0);
  });
});

test("once we're open, an admin emails everyone who signed up, once each", async ({
  page,
}) => {
  await signInAsDemo(page, "Alex Morgan");
  await page.goto("/admin/settings");
  // The demo starts with the notice off and NSW open.
  await expect(page.locator("[data-site-banner]")).not.toContainText(
    "Shifts start",
  );
  const launch = page.getByRole("region", {
    name: "Tell everyone we're open",
  });
  await launch
    .getByRole("button", { name: "Email everyone that we're open" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Email everyone that we're open?",
  });
  await dialog.getByRole("button", { name: "Email them" }).click();
  await expect(
    page.getByText(/^(Told \d+ people|Everyone has already been told)/),
  ).toBeVisible({ timeout: 30_000 });

  // Each person once: a second message to the same person is the same row.
  const service = serviceClient();
  const { data: told } = await service
    .from("notifications")
    .select("profile_id")
    .like("dedupe_key", "launch_open:%");
  expect((told ?? []).length).toBeGreaterThan(0);
  const people = (told ?? []).map((row) => row.profile_id);
  expect(new Set(people).size).toBe(people.length);
});
