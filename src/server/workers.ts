import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";

import {
  missingSteps,
  nextStep,
  type OnboardingSnapshot,
  type OnboardingStepKey,
} from "@/domain/onboarding";
import { requireRole, type SessionUser } from "@/lib/auth";
import { success, type ActionState } from "@/lib/forms";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { currentAgreement, hasAccepted } from "./agreements";
import { saveFailed } from "./errors";

export type WorkerRow = Tables<"workers">;

/** Employment documents every worker acknowledges (brief §4.1 step 9). */
export const EMPLOYMENT_DOCUMENTS = [
  "casual_employment_contract",
  "fair_work_information_statement",
  "casual_employment_information_statement",
] as const;

/** The signed-in worker and their worker record. Cached for the request. */
export const getMyWorker = cache(
  async (): Promise<{ user: SessionUser; worker: WorkerRow }> => {
    const user = await requireRole("worker");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .eq("profile_id", user.id)
      .is("archived_at", null)
      .maybeSingle();
    if (error) throw new Error(`Loading your details: ${error.message}`);
    if (!data) throw new Error("Your worker record is missing. Contact us.");
    return { user, worker: data };
  },
);

/**
 * Onboarding starts with the privacy collection notice (brief §4.9). True once
 * the worker has accepted the current one, or if none is published.
 */
export async function hasStartedOnboarding(
  profileId: string,
): Promise<boolean> {
  const notice = await currentAgreement("privacy_collection_notice");
  return !notice || (await hasAccepted(profileId, notice.id));
}

/** Current employment documents the worker hasn't accepted yet. */
export async function unacceptedEmploymentDocuments(
  profileId: string,
): Promise<Tables<"agreements">[]> {
  const supabase = await createClient();
  const [{ data: documents }, { data: accepted }] = await Promise.all([
    supabase
      .from("agreements")
      .select("*")
      .eq("is_current", true)
      .in("kind", [...EMPLOYMENT_DOCUMENTS]),
    supabase
      .from("agreement_acceptances")
      .select("agreement_id")
      .eq("profile_id", profileId),
  ]);
  const done = new Set((accepted ?? []).map((a) => a.agreement_id));
  return (documents ?? [])
    .filter((d) => !done.has(d.id))
    .sort(
      (a, b) =>
        EMPLOYMENT_DOCUMENTS.indexOf(a.kind as never) -
        EMPLOYMENT_DOCUMENTS.indexOf(b.kind as never),
    );
}

/** Everything needed to know which required steps are still missing. */
export async function onboardingSnapshot(
  user: SessionUser,
  worker: WorkerRow,
): Promise<OnboardingSnapshot> {
  const supabase = await createClient();
  const [rights, identity, categories, availability, unaccepted] =
    await Promise.all([
      supabase
        .from("work_rights")
        .select("id", { count: "exact", head: true })
        .eq("worker_id", worker.id),
      supabase
        .from("identity_checks")
        .select("id", { count: "exact", head: true })
        .eq("worker_id", worker.id),
      supabase
        .from("worker_categories")
        .select("category_id", { count: "exact", head: true })
        .eq("worker_id", worker.id),
      supabase
        .from("availability_weekly")
        .select("id", { count: "exact", head: true })
        .eq("worker_id", worker.id),
      unacceptedEmploymentDocuments(user.id),
    ]);
  return {
    legalFirstName: worker.legal_first_name,
    legalLastName: worker.legal_last_name,
    dateOfBirth: worker.date_of_birth,
    photoPath: worker.photo_path,
    email: user.email,
    phone: user.phone,
    homeSuburb: worker.home_suburb,
    hasRightToWork: (rights.count ?? 0) > 0,
    hasIdentityCheck: (identity.count ?? 0) > 0,
    categoryCount: categories.count ?? 0,
    hasAvailability: (availability.count ?? 0) > 0,
    unacceptedDocuments: unaccepted.length,
  };
}

export async function missingOnboardingSteps(
  user: SessionUser,
  worker: WorkerRow,
): Promise<OnboardingStepKey[]> {
  return missingSteps(await onboardingSnapshot(user, worker));
}

/** The step list with this one added (for saves that update the worker row). */
export function stepsWith(
  worker: WorkerRow,
  step: OnboardingStepKey,
): string[] {
  return worker.onboarding_steps.includes(step)
    ? worker.onboarding_steps
    : [...worker.onboarding_steps, step];
}

/**
 * After a step is saved: during onboarding, go to the next step; once the
 * worker has submitted, stay on the page and confirm the save.
 */
export function goOn(worker: WorkerRow, step: OnboardingStepKey): ActionState {
  revalidatePath("/worker", "layout");
  if (worker.status === "draft") {
    redirect(`/worker/onboarding/${nextStep(step) ?? "submit"}`);
  }
  return success("Saved");
}

/** Records a finished step, then moves on (see goOn). */
export async function finishStep(
  worker: WorkerRow,
  step: OnboardingStepKey,
): Promise<ActionState> {
  if (!worker.onboarding_steps.includes(step)) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("workers")
      .update({ onboarding_steps: stepsWith(worker, step) })
      .eq("id", worker.id);
    if (error) return saveFailed(error);
  }
  return goOn(worker, step);
}

/** Legal names and date of birth lock once photo ID has been checked. */
export async function identityVerified(workerId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("identity_checks")
    .select("id", { count: "exact", head: true })
    .eq("worker_id", workerId)
    .eq("status", "verified");
  return (count ?? 0) > 0;
}

/** A short-lived link to a private file the signed-in user may read. */
export async function signedUrl(
  bucket: "worker-photos" | "worker-docs",
  path: string | null,
  expiresInSeconds = 600,
): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  return data?.signedUrl ?? null;
}
