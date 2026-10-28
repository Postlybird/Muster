"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { canManage, getMyBusiness } from "@/server/businesses";
import { saveFailed } from "@/server/errors";

const name = z
  .string()
  .trim()
  .min(1, "Give the template a name")
  .max(80, "Keep the name under 80 characters");

/** Saves a posted job as a template, to post again quickly (brief §4.3). */
export async function saveTemplate(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) {
    return failure("Only owners and managers can save templates.");
  }
  const parsed = name.safeParse(formData.get("name") ?? "");
  if (!parsed.success) {
    return failure("Check the highlighted fields.", {
      name: [parsed.error.issues[0]?.message ?? "Check the name"],
    });
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_templates")
    .insert({ business_id: business.id, job_id: jobId, name: parsed.data });
  if (error) {
    if (error.code === "23505") {
      return failure("Check the highlighted fields.", {
        name: ["You already have a template with that name"],
      });
    }
    return saveFailed(error);
  }
  revalidatePath(`/business/jobs/${jobId}`);
  revalidatePath("/business/post");
  return success(`Saved as "${parsed.data}"`);
}
