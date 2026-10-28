import "server-only";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import {
  missingPostSteps,
  postingBlocker,
  resumePostStep,
  type PostStepKey,
} from "@/domain/jobs";
import type { ActionState } from "@/lib/forms";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { businessSnapshot, canManage, getMyBusiness } from "./businesses";
import { saveFailed } from "./errors";

export type JobRow = Tables<"jobs">;

/** Why this business can't post work yet, or null if it can. */
export async function postingProblem(
  business: Tables<"businesses">,
): Promise<string | null> {
  const snapshot = await businessSnapshot(business);
  return postingBlocker({
    status: business.status,
    accountTermsApproved: business.account_terms_approved,
    agreementAccepted: snapshot.agreementAccepted,
  });
}

/**
 * Loads a draft job for a post-work step. Only owners and managers post
 * work; a job that's been posted opens on its own page instead.
 */
export async function loadDraft(jobId: string) {
  const mine = await getMyBusiness();
  if (!mine.business || !canManage(mine.role)) redirect("/business");
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("business_id", mine.business.id)
    .maybeSingle();
  if (!job || job.archived_at) notFound();
  if (job.status !== "draft") redirect(`/business/jobs/${job.id}`);
  return { ...mine, business: mine.business, job, supabase };
}

/** For an action: the draft, or null when it can't be changed any more. */
export async function draftForAction(jobId: string) {
  const mine = await getMyBusiness();
  if (!mine.business || !canManage(mine.role)) return null;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("business_id", mine.business.id)
    .eq("status", "draft")
    .is("archived_at", null)
    .maybeSingle();
  return job ? { ...mine, business: mine.business, job, supabase } : null;
}

/**
 * Records a finished step and goes to the next step that isn't done yet:
 * the review once everything is (so a change from the review goes back to
 * it, and a copied job skips what it already has).
 */
export async function finishPostStep(
  job: JobRow,
  step: PostStepKey,
): Promise<ActionState> {
  const steps = job.steps.includes(step) ? job.steps : [...job.steps, step];
  if (steps !== job.steps) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("jobs")
      .update({ steps })
      .eq("id", job.id);
    if (error) return saveFailed(error);
  }
  revalidatePath("/business", "layout");
  redirect(`/business/post/${job.id}/${resumePostStep(steps)}`);
}

/** What still needs doing before the job can be posted. */
export async function draftMissingSteps(job: JobRow) {
  const supabase = await createClient();
  const [{ data: shifts }, { count: hazardCount }] = await Promise.all([
    supabase
      .from("shifts")
      .select("starts_at")
      .eq("job_id", job.id)
      .order("starts_at")
      .limit(1),
    supabase
      .from("job_hazards")
      .select("hazard_id", { count: "exact", head: true })
      .eq("job_id", job.id),
  ]);
  const { count: shiftCount } = await supabase
    .from("shifts")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id);
  return missingPostSteps(
    {
      siteId: job.site_id,
      categoryId: job.category_id,
      shiftCount: shiftCount ?? 0,
      firstStart: shifts?.[0] ? new Date(shifts[0].starts_at) : null,
      hazardCount: hazardCount ?? 0,
      noKnownHazards: job.no_known_hazards,
      controls: job.hazard_controls,
    },
    new Date(),
  );
}

/** Everything shown about a job: where, when, tickets, safety and photos. */
export async function loadJobDetails(job: JobRow) {
  const supabase = await createClient();
  const byOrder = <T extends { sort_order: number; name: string }>(
    rows: (T | null)[],
  ) =>
    rows
      .filter((row): row is T => !!row)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => row.name);
  const [
    { data: site },
    { data: category },
    { data: shifts },
    { data: tickets },
    { data: hazards },
    { data: ppe },
    { data: photos },
  ] = await Promise.all([
    supabase
      .from("sites")
      .select("name, address_line1, suburb, state, postcode")
      .eq("id", job.site_id ?? "")
      .maybeSingle(),
    supabase
      .from("categories")
      .select("name")
      .eq("id", job.category_id ?? "")
      .maybeSingle(),
    supabase
      .from("shifts")
      .select("id, starts_at, ends_at, break_minutes, headcount, status")
      .eq("job_id", job.id)
      .order("starts_at"),
    supabase
      .from("job_credentials")
      .select("credential_types(name, sort_order)")
      .eq("job_id", job.id),
    supabase
      .from("job_hazards")
      .select("hazards(name, sort_order)")
      .eq("job_id", job.id),
    supabase
      .from("job_ppe")
      .select("ppe_items(name, sort_order)")
      .eq("job_id", job.id),
    supabase
      .from("job_photos")
      .select("id, path")
      .eq("job_id", job.id)
      .is("archived_at", null)
      .order("sort_order"),
  ]);
  const photoUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data } = await supabase.storage
        .from("job-photos")
        .createSignedUrl(photo.path, 600);
      return data?.signedUrl ?? null;
    }),
  );
  return {
    site,
    categoryName: category?.name ?? null,
    shifts: shifts ?? [],
    tickets: byOrder((tickets ?? []).map((row) => row.credential_types)),
    hazards: byOrder((hazards ?? []).map((row) => row.hazards)),
    ppe: byOrder((ppe ?? []).map((row) => row.ppe_items)),
    photoUrls: photoUrls.filter((url): url is string => !!url),
  };
}

export type JobDetails = Awaited<ReturnType<typeof loadJobDetails>>;
