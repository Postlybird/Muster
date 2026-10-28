"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_WORKERS } from "@/domain/jobs";
import { failure, invalid, type ActionState } from "@/lib/forms";
import { saveFailed } from "@/server/errors";
import { draftForAction, finishPostStep } from "@/server/jobs";

const schema = z.object({
  type: z.enum(["single", "multi_day", "urgent"], {
    error: "Choose the kind of work",
  }),
  site_id: z.uuid("Choose a site"),
  category_id: z.uuid("Choose the type of work"),
  headcount: z.coerce
    .number({ error: "Enter how many workers you need" })
    .int("Enter a whole number")
    .min(1, "At least 1")
    .max(MAX_WORKERS, `Up to ${MAX_WORKERS} at a time`),
});

/** Kind of work, site, work type and how many workers (brief §4.3). */
export async function saveWhat(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const draft = await draftForAction(jobId);
  if (!draft) return failure("This job can't be changed any more.");
  const { job, supabase } = draft;
  const parsed = schema.safeParse({
    type: formData.get("type") ?? undefined,
    site_id: formData.get("site_id") || undefined,
    category_id: formData.get("category_id") || undefined,
    headcount: formData.get("headcount") || undefined,
  });
  if (!parsed.success) return invalid(parsed.error);
  const { type, site_id, category_id, headcount } = parsed.data;

  const [{ data: site }, { data: category }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, report_to_name, report_to_phone")
      .eq("id", site_id)
      .eq("business_id", job.business_id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("categories")
      .select(
        "id, police_check_required, category_credentials(credential_type_id), category_ppe(ppe_item_id)",
      )
      .eq("id", category_id)
      .eq("active", true)
      .is("archived_at", null)
      .maybeSingle(),
  ]);
  if (!site)
    return failure("Check the highlighted fields.", {
      site_id: ["Choose one of your sites"],
    });
  if (!category) {
    return failure("Check the highlighted fields.", {
      category_id: ["Choose the type of work"],
    });
  }

  const categoryChanged = category.id !== job.category_id;
  const siteChanged = site.id !== job.site_id;
  // A change of kind changes the dates question, so it's asked again.
  const steps =
    type !== job.type ? job.steps.filter((step) => step !== "when") : job.steps;
  const { error } = await supabase
    .from("jobs")
    .update({
      type,
      steps,
      site_id: site.id,
      category_id: category.id,
      headcount,
      // Urgent call-outs book the first eligible workers (brief §4.4).
      ...(type !== job.type
        ? { fill_mode: type === "urgent" ? "auto" : "pick" }
        : {}),
      ...(categoryChanged
        ? { police_check_required: category.police_check_required }
        : {}),
      ...(siteChanged
        ? {
            report_to_name: site.report_to_name,
            report_to_phone: site.report_to_phone,
          }
        : {}),
    })
    .eq("id", job.id);
  if (error) return saveFailed(error);

  // A new work type brings its usual tickets and PPE.
  if (categoryChanged) {
    const results = await Promise.all([
      supabase.from("job_credentials").delete().eq("job_id", job.id),
      supabase.from("job_ppe").delete().eq("job_id", job.id),
    ]);
    const cleared = results.find((r) => r.error);
    if (cleared?.error) return saveFailed(cleared.error);
    const tickets = category.category_credentials.map((link) => ({
      job_id: job.id,
      credential_type_id: link.credential_type_id,
    }));
    const ppe = category.category_ppe.map((link) => ({
      job_id: job.id,
      ppe_item_id: link.ppe_item_id,
    }));
    const added = await Promise.all([
      tickets.length ? supabase.from("job_credentials").insert(tickets) : null,
      ppe.length ? supabase.from("job_ppe").insert(ppe) : null,
    ]);
    const failed = added.find((r) => r?.error);
    if (failed?.error) return saveFailed(failed.error);
  }
  // Shifts already set up take the new number of workers.
  if (headcount !== job.headcount) {
    const { error: shiftError } = await supabase
      .from("shifts")
      .update({ headcount })
      .eq("job_id", job.id);
    if (shiftError) return saveFailed(shiftError);
  }
  revalidatePath(`/business/post/${job.id}`, "layout");
  return finishPostStep({ ...job, steps }, "what");
}
