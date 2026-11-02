import { expect, test } from "@playwright/test";

import {
  acceptCurrentAgreement,
  expectAccessible,
  quickSignUp,
  randomEmail,
  registerAs,
  serviceClient,
  signInAsDemo,
} from "./helpers";

// Tickets issued state by state (working with children checks, the RSA and
// traffic control) don't carry across borders, so each side is asked for
// the right state's version. None of the work types we focus on needs one
// by default (owner, 02/11/2026), so these tests add one that does: school
// cleaning, which needs a working with children check.

let workType: { id: string; name: string };

test.beforeAll(async () => {
  const service = serviceClient();
  const [{ data: cleaning }, { data: wwcc }] = await Promise.all([
    service.from("industries").select("id").eq("code", "cleaning").single(),
    service.from("credential_types").select("id").eq("code", "wwcc").single(),
  ]);
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const name = `E2E school cleaner ${stamp}`;
  const { data: category, error } = await service
    .from("categories")
    .insert({
      code: `e2e_school_cleaner_${stamp}`,
      name,
      industry_id: cleaning!.id,
      description: "Browser test work type.",
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  const [{ error: ticketError }, { error: cardError }] = await Promise.all([
    service
      .from("category_credentials")
      .insert({ category_id: category!.id, credential_type_id: wwcc!.id }),
    // Rates, so it can be posted.
    service.from("rate_cards").insert({
      category_id: category!.id,
      base_rate_cents: 2748,
      effective_from: "2026-07-01",
      notes: "Browser test.",
    }),
  ]);
  expect(ticketError).toBeNull();
  expect(cardError).toBeNull();
  workType = { id: category!.id, name };
});

test.afterAll(async () => {
  // Archived, never deleted.
  const service = serviceClient();
  const now = new Date().toISOString();
  await service
    .from("rate_cards")
    .update({ archived_at: now })
    .eq("category_id", workType.id);
  await service
    .from("categories")
    .update({ archived_at: now })
    .eq("id", workType.id);
});

test("a worker in Victoria is asked for Victoria's check, not the NSW one", async ({
  page,
}) => {
  await registerAs(page, "worker", {
    first: "Mia",
    last: "Rossi",
    email: randomEmail("worker"),
  });
  await quickSignUp(page, {
    suburb: ["Richmond", "Richmond VIC 3121"],
    industry: "Cleaning",
    workType: workType.name,
  });

  await page.goto("/worker/onboarding/tickets");
  const needed = page.getByRole("region", {
    name: "Needed for your work types",
  });
  await expect(
    needed.getByText("Working with Children Check (Victoria)"),
  ).toBeVisible();
  await expect(page.getByText("Working with Children Check (NSW)")).toHaveCount(
    0,
  );
  await expectAccessible(page);
});

test("work at a site in Victoria asks for Victoria's check", async ({
  page,
}) => {
  const service = serviceClient();
  const { data: business } = await service
    .from("businesses")
    .select("id")
    .eq("trading_name", "Harbour Restoration")
    .single();
  const siteName = `E2E school ${Date.now()}`;
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
    await page
      .getByLabel("Type of work")
      .selectOption({ label: workType.name });
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/\/when$/);

    // The work type's usual tickets, in the site's state.
    await page.goto(page.url().replace(/\/when$/, "/needs"));
    await expect(
      page.getByRole("checkbox", {
        name: "Working with Children Check (Victoria)",
      }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Working with Children Check (NSW)" }),
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
