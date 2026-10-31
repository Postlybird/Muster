import { expect, test } from "@playwright/test";

import {
  expectAccessible,
  postTestJob,
  releaseTestJob,
  serviceClient,
  signInAsDemo,
} from "./helpers";

// Jobs posted by these tests, released afterwards so bookings never pile up.
const posted: string[] = [];
test.afterEach(async () => {
  for (const jobId of posted.splice(0)) await releaseTestJob(jobId);
});

test("a business opens an applicant's profile, and businesses he hasn't applied to can't", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { jobId, shiftId } = await postTestJob({
    business: "Harbour Restoration",
    site: "Granville flood job",
    category: "Restoration labourer",
    fillMode: "pick",
  });
  posted.push(jobId);
  const supabase = serviceClient();
  const { data: liam } = await supabase
    .from("workers")
    .select("id")
    .eq("legal_first_name", "Liam")
    .eq("legal_last_name", "O'Brien")
    .single();
  const pitch = "Four years on water damage jobs, and my own ute.";
  await supabase
    .from("applications")
    .insert({ shift_id: shiftId, worker_id: liam!.id, note: pitch });

  await signInAsDemo(page, "Lisa Nguyen");
  await page.goto(`/business/jobs/${jobId}`);
  await page
    .getByRole("region", { name: "Applicants" })
    .getByRole("link", { name: "See Liam O.'s profile" })
    .click();
  // His full name once this business has booked him before.
  await expect(
    page.getByRole("heading", { level: 1, name: /^Liam O(\.|'Brien)$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Why they're a good fit for this job" }),
  ).toContainText(pitch);
  await expect(page.getByRole("region", { name: "About them" })).toContainText(
    "Four years on water damage jobs around Western Sydney",
  );
  const experience = page.getByRole("region", { name: "Experience" });
  await expect(experience.getByText("Restoration labourer")).toBeVisible();
  await expect(
    experience.getByText(
      /^4 years' experience · level \d+ · \d+ shifts? on Shifta$/,
    ),
  ).toBeVisible();
  const checks = page.getByRole("region", { name: "Checked by Shifta" });
  await expect(
    checks.getByText("Right to work in Australia checked"),
  ).toBeVisible();
  await expect(checks.getByText("White Card")).toBeVisible();
  await expectAccessible(page);

  // A business he's never applied to or worked for can't open it.
  await page.context().clearCookies();
  await signInAsDemo(page, "Sofia Rossi");
  await page.goto(`/business/workers/${liam!.id}`);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});
