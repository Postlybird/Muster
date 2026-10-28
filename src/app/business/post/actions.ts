"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import {
  canManage,
  getMyBusiness,
  type BusinessRow,
} from "@/server/businesses";
import { saveFailed } from "@/server/errors";
import { postingProblem } from "@/server/jobs";

type Poster =
  { ok: true; business: BusinessRow } | { ok: false; error: ActionState };

/** An owner or manager of a business that can post work. */
async function poster(): Promise<Poster> {
  const mine = await getMyBusiness();
  if (!mine.business || !canManage(mine.role)) {
    return {
      ok: false,
      error: failure("Only owners and managers can post work."),
    };
  }
  const problem = await postingProblem(mine.business);
  if (problem) return { ok: false, error: failure(problem) };
  return { ok: true, business: mine.business };
}

export async function startJob(): Promise<ActionState> {
  const mine = await poster();
  if (!mine.ok) return mine.error;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({ business_id: mine.business.id })
    .select("id")
    .single();
  if (error) return saveFailed(error);
  redirect(`/business/post/${data.id}/what`);
}

/** Copies a job into a new draft: everything but the dates. */
export async function repeatJob(jobId: string): Promise<ActionState> {
  const mine = await poster();
  if (!mine.ok) return mine.error;
  if (!z.uuid().safeParse(jobId).success) return failure("Unknown job.");
  const supabase = await createClient();
  const { data: copy, error } = await supabase.rpc("duplicate_job", {
    p_job_id: jobId,
  });
  if (error || !copy) return saveFailed(error ?? { message: "No copy made" });
  redirect(`/business/post/${copy}/when`);
}

export async function startFromTemplate(
  templateId: string,
): Promise<ActionState> {
  const mine = await poster();
  if (!mine.ok) return mine.error;
  const supabase = await createClient();
  const { data: template } = z.uuid().safeParse(templateId).success
    ? await supabase
        .from("job_templates")
        .select("job_id")
        .eq("id", templateId)
        .eq("business_id", mine.business.id)
        .is("archived_at", null)
        .maybeSingle()
    : { data: null };
  if (!template) return failure("That template no longer exists.");
  return repeatJob(template.job_id);
}

export async function discardDraft(jobId: string): Promise<ActionState> {
  const mine = await getMyBusiness();
  if (!mine.business || !canManage(mine.role)) {
    return failure("Only owners and managers can post work.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("business_id", mine.business.id)
    .eq("status", "draft");
  if (error) return saveFailed(error);
  revalidatePath("/business", "layout");
  return success("Draft discarded");
}

export async function removeTemplate(templateId: string): Promise<ActionState> {
  const mine = await getMyBusiness();
  if (!mine.business || !canManage(mine.role)) {
    return failure("Only owners and managers can change templates.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_templates")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("business_id", mine.business.id);
  if (error) return saveFailed(error);
  revalidatePath("/business/post");
  return success("Template removed");
}
