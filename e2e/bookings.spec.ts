import { expect, test } from "@playwright/test";

import {
  expectAccessible,
  pageAs,
  postTestJob,
  serviceClient,
  signInAsDemo,
} from "./helpers";

test("a worker applies, the business picks them, and they see the address", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { jobId } = await postTestJob({
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "Restoration labourer",
    fillMode: "pick",
  });

  // Liam applies, changes his mind, then applies again.
  await signInAsDemo(page, "Liam O'Brien");
  await page.goto(`/worker/shifts/${jobId}`);
  await expect(
    page.getByRole("heading", { name: "Apply for this work" }),
  ).toBeVisible();
  await expect(page.getByText(/Parramatta Rd/)).toHaveCount(0);
  await expectAccessible(page);
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Applied for 1 shift" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Withdraw application" }).click();
  await expect(
    page.getByRole("heading", { name: "Apply for this work" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Applied for 1 shift" }),
  ).toBeVisible();
  await expectAccessible(page);

  // A manager sees him among the applicants and books him.
  await page.context().clearCookies();
  await signInAsDemo(page, "Lisa Nguyen");
  await page.goto(`/business/jobs/${jobId}`);
  const applicants = page.getByRole("region", { name: "Applicants" });
  await expect(applicants.getByText("Liam O.", { exact: true })).toBeVisible();
  await expect(applicants.getByText("White Card")).toBeVisible();
  await expectAccessible(page);
  await applicants
    .getByRole("button", { name: "Book 1 shift for Liam O." })
    .click();
  await expect(page.getByText("Booked Liam O. for 1 shift.")).toBeVisible();
  const booked = page.getByRole("region", { name: "Booked" });
  await expect(booked.getByText("Liam O'Brien")).toBeVisible();
  await expect(
    booked.getByRole("link", { name: "+61 491 570 006" }),
  ).toBeVisible();
  await expect(page.getByText("1 of 1 booked")).toBeVisible();

  // He's texted, and now sees the address and who to report to.
  const { data: texts } = await serviceClient()
    .from("dev_outbox")
    .select("body")
    .eq("recipient", "+61491570006")
    .like("body", `%You're booked%/worker/shifts/${jobId}`);
  expect(texts).toHaveLength(1);
  await page.context().clearCookies();
  await signInAsDemo(page, "Liam O'Brien");
  await page.goto(`/worker/shifts/${jobId}`);
  await expect(
    page.getByRole("heading", { name: "You're booked on 1 shift" }),
  ).toBeVisible();
  await expect(
    page.getByText("42 Parramatta Rd, Granville NSW 2142"),
  ).toBeVisible();
  await expect(page.getByText(/Report to Mark Davies/)).toBeVisible();
  await expectAccessible(page);
  const calendar = await page.request.get(`/worker/shifts/${jobId}/calendar`);
  expect(calendar.status()).toBe(200);
  expect(calendar.headers()["content-type"]).toContain("text/calendar");
  expect(await calendar.text()).toContain(
    "LOCATION:42 Parramatta Rd\\, Granville NSW 2142",
  );

  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "My shifts" })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Booked" })
      .getByRole("link", { name: /Restoration labourer.*Harbour Restoration/ })
      .first(),
  ).toBeVisible();
  await expectAccessible(page);
});

test("first in: the first worker to accept is booked, and the next is told it's full", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const { jobId } = await postTestJob({
    business: "Westside Cleaning",
    site: "Blacktown office tower",
    category: "Commercial cleaner",
    fillMode: "auto",
  });

  // Fatima opens it first...
  const fatima = await pageAs(browser, "Fatima Al-Sayed");
  await fatima.goto(`/worker/shifts/${jobId}`);
  await expect(
    fatima.getByRole("button", { name: "Accept this shift" }),
  ).toBeVisible();

  // ...but Hannah accepts before her and is booked straight away.
  await signInAsDemo(page, "Hannah Schmidt");
  await page.goto(`/worker/shifts/${jobId}`);
  await expect(
    page.getByRole("heading", { name: "Take this work" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Accept this shift" }).click();
  await expect(
    page.getByRole("heading", { name: "You're booked on 1 shift" }),
  ).toBeVisible();
  await expect(page.getByText(/Blacktown NSW/)).toBeVisible();

  await fatima.getByRole("button", { name: "Accept this shift" }).click();
  await expect(
    fatima.getByText("1 shift had already filled up."),
  ).toBeVisible();
  await fatima.context().close();

  // Whoever posted it hears it's fully booked.
  const service = serviceClient();
  const { data: job } = await service
    .from("jobs")
    .select("posted_by")
    .eq("id", jobId)
    .single();
  const { data: poster } = await service
    .from("profiles")
    .select("email")
    .eq("id", job!.posted_by)
    .single();
  const { data: emails } = await service
    .from("dev_outbox")
    .select("subject, body")
    .eq("channel", "email")
    .eq("recipient", poster!.email)
    .like("body", `%/business/jobs/${jobId}`);
  expect(emails?.map((email) => email.subject)).toEqual([
    "All booked: Commercial cleaner at Blacktown office tower",
  ]);
});
