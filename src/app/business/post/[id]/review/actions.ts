"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { FAVOURITES_FIRST_OPTIONS } from "@/domain/jobs";
import type { StateCode } from "@/domain/pay";
import { failure, formBoolean, type ActionState } from "@/lib/forms";
import { saveFailed } from "@/server/errors";
import { draftForAction, postingProblem } from "@/server/jobs";
import { matchPostedJob } from "@/server/matching";
import { loadPricing } from "@/server/pricing";

const schema = z.object({
  fill_mode: z.enum(["pick", "auto"], { error: "Choose how to fill the job" }),
  favourites_first_minutes: z
    .enum(["", ...FAVOURITES_FIRST_OPTIONS.map(String)] as [
      string,
      ...string[],
    ])
    .transform((value) => (value ? Number(value) : null)),
  template_name: z.string().trim().max(80, "Keep the name under 80 characters"),
});

/** Saves how to fill the job, works out the estimate, and posts it (brief §4.3). */
export async function postJob(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const draft = await draftForAction(jobId);
  if (!draft) return failure("This job can't be changed any more.");
  const { job, business, supabase } = draft;
  const problem = await postingProblem(business);
  if (problem) return failure(problem);

  const parsed = schema.safeParse({
    fill_mode: formData.get("fill_mode") ?? undefined,
    favourites_first_minutes: formData.get("favourites_first_minutes") ?? "",
    template_name: formData.get("template_name") ?? "",
  });
  if (!parsed.success) {
    return failure(
      "Check the highlighted fields.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }
  const saveTemplate = formBoolean(formData.get("save_template"));
  const templateName = parsed.data.template_name;
  if (saveTemplate) {
    if (!templateName) {
      return failure("Check the highlighted fields.", {
        template_name: ["Give the template a name"],
      });
    }
    const { count } = await supabase
      .from("job_templates")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .ilike("name", templateName.replace(/[%_\\]/g, "\\$&"))
      .is("archived_at", null);
    if ((count ?? 0) > 0) {
      return failure("Check the highlighted fields.", {
        template_name: ["You already have a template with that name"],
      });
    }
  }

  // The estimate shown on the job afterwards, worked out again here.
  const [{ data: site }, { data: shifts }] = await Promise.all([
    supabase
      .from("sites")
      .select("state")
      .eq("id", job.site_id ?? "")
      .maybeSingle(),
    supabase
      .from("shifts")
      .select("starts_at, ends_at, break_minutes")
      .eq("job_id", job.id),
  ]);
  if (!site || !job.category_id || !shifts?.length) {
    return failure("Finish the earlier steps first.");
  }
  const pricing = await loadPricing({
    businessId: business.id,
    categoryId: job.category_id,
    level: job.level,
    state: site.state as StateCode,
  });
  const estimate = pricing.estimate(
    shifts.map((shift) => ({
      start: new Date(shift.starts_at),
      end: new Date(shift.ends_at),
      breakMinutes: shift.break_minutes,
      urgent: job.type === "urgent",
    })),
    job.headcount,
  );
  if (!estimate.ok) {
    return failure(
      `We can't price this job yet: ${estimate.problem} Contact us and we'll sort it out.`,
    );
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      fill_mode: parsed.data.fill_mode,
      // Urgent call-outs go to everyone at once (brief §4.3).
      favourites_first_minutes:
        job.type === "urgent" ? null : parsed.data.favourites_first_minutes,
      estimate_cents: estimate.totals.billCents,
      estimate_gst_cents: estimate.totals.gstCents,
    })
    .eq("id", job.id);
  if (error) return saveFailed(error);

  const { error: postError } = await supabase.rpc("post_job", {
    p_job_id: job.id,
  });
  if (postError) {
    // The database explains what's missing in plain words.
    if (postError.code === "23514") return failure(`${postError.message}.`);
    return saveFailed(postError);
  }

  if (saveTemplate) {
    const { error: templateError } = await supabase
      .from("job_templates")
      .insert({ business_id: business.id, job_id: job.id, name: templateName });
    if (templateError) console.error("Couldn't save a template", templateError);
  }
  await matchPostedJob(job.id);
  revalidatePath("/business", "layout");
  redirect(`/business/jobs/${job.id}?posted=1`);
}
