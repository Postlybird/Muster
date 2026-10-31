import { expect, test } from "@playwright/test";

import {
  acceptCurrentAgreement,
  expectAccessible,
  serviceClient,
  signInAsDemo,
  signInAsNewWorker,
} from "./helpers";

// Tickets issued state by state (the RSA, working with children checks and
// traffic control) don't carry across borders, so each side is asked for
// the right state's version.

test("a worker in Victoria is asked for Victoria's RSA, not the NSW card", async ({
  page,
}) => {
  const email = await signInAsNewWorker(page);
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/worker\/onboarding\/about$/);

  const service = serviceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  const [{ data: worker }, { data: bartender }] = await Promise.all([
    service.from("workers").select("id").eq("profile_id", profile!.id).single(),
    service.from("categories").select("id").eq("code", "bartender").single(),
  ]);
  await service
    .from("workers")
    .update({
      home_suburb: "Richmond",
      home_postcode: "3121",
      home_state: "VIC",
    })
    .eq("id", worker!.id);
  await service
    .from("worker_categories")
    .insert({ worker_id: worker!.id, category_id: bartender!.id });

  await page.goto("/worker/onboarding/tickets");
  const needed = page.getByRole("region", {
    name: "Needed for your work types",
  });
  await expect(needed.getByText("RSA (Victoria)")).toBeVisible();
  await expect(page.getByText("RSA (NSW Competency Card)")).toHaveCount(0);
  await expectAccessible(page);
});

test("work at a site in Victoria asks for Victoria's RSA", async ({ page }) => {
  const service = serviceClient();
  const { data: business } = await service
    .from("businesses")
    .select("id")
    .eq("trading_name", "Harbour Restoration")
    .single();
  const siteName = `E2E venue ${Date.now()}`;
  const { data: site } = await service
    .from("sites")
    .insert({
      business_id: business!.id,
      name: siteName,
      address_line1: "1 Swan St",
      suburb: "Richmond",
      state: "VIC",
      postcode: "3121",
      lat: -37.823,
      lng: 144.998,
    })
    .select("id")
    .single();

  try {
    await acceptCurrentAgreement("Harbour Restoration");
    await signInAsDemo(page, "Lisa Nguyen");
    await page.goto("/business/post");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/what$/);
    await page.getByRole("radio", { name: /One shift/ }).check();
    await page
      .getByLabel("Where?")
      .selectOption({ label: `${siteName} (Richmond)` });
    await page.getByLabel("Type of work").selectOption({ label: "Bartender" });
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/\/when$/);

    // The work type's usual tickets, in the site's state.
    await page.goto(page.url().replace(/\/when$/, "/needs"));
    await expect(
      page.getByRole("checkbox", { name: "RSA (Victoria)" }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "RSA (NSW Competency Card)" }),
    ).toHaveCount(0);
  } finally {
    const jobId = page.url().match(/\/business\/post\/([^/]+)/)?.[1];
    if (jobId) {
      await service
        .from("jobs")
        .update({ status: "cancelled" })
        .eq("id", jobId);
    }
    await service
      .from("sites")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", site!.id);
  }
});
