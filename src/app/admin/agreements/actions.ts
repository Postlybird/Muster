"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import {
  failure,
  invalid,
  optionalText,
  success,
  type ActionState,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const draftSchema = z.object({
  kind: z.enum([
    "labour_hire_services",
    "casual_employment_contract",
    "fair_work_information_statement",
    "casual_employment_information_statement",
    "privacy_collection_notice",
    "worker_supply_notice",
  ]),
  jurisdiction: z
    .enum(["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"])
    .nullable(),
  version: z.string().trim().min(1, "Enter a version, like 1.0").max(30),
  title: z.string().trim().min(1, "Enter a title").max(150),
  body_md: z.string().trim().min(1, "Enter the wording").max(100_000),
});

/** Creates or edits a draft (published versions can't be edited). */
export async function saveAgreementDraft(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const jurisdiction = optionalText(formData.get("jurisdiction"));
  const parsed = draftSchema.safeParse({
    kind: formData.get("kind"),
    jurisdiction: jurisdiction === "all" ? null : jurisdiction,
    version: formData.get("version") ?? "",
    title: formData.get("title") ?? "",
    body_md: formData.get("body_md") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase
      .from("agreements")
      .update(parsed.data)
      .eq("id", id)
      .is("published_at", null);
    if (error) {
      return failure(
        error.code === "23505"
          ? "That version number is already used for this agreement."
          : `Couldn't save: ${error.message}`,
      );
    }
    revalidatePath(`/admin/agreements/${id}`);
    return success("Draft saved");
  }

  const { data, error } = await supabase
    .from("agreements")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error) {
    return failure(
      error.code === "23505"
        ? "That version number is already used for this agreement."
        : `Couldn't save: ${error.message}`,
    );
  }
  revalidatePath("/admin/agreements");
  redirect(`/admin/agreements/${data.id}?saved=1`);
}

/** Publishes a draft (its wording is then frozen) and optionally makes it current. */
export async function publishAgreement(
  id: string,
  makeCurrent: boolean,
): Promise<ActionState> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return failure("Unknown agreement.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agreements")
    .update({ published_at: new Date().toISOString() })
    .eq("id", id)
    .is("published_at", null)
    .select("id");
  if (error) return failure(`Couldn't publish: ${error.message}`);
  if (!data?.length) return failure("It's already published.");

  if (makeCurrent) {
    const { error: currentError } = await supabase.rpc(
      "set_current_agreement",
      {
        p_agreement_id: id,
      },
    );
    if (currentError)
      return failure(
        `Published, but couldn't make it current: ${currentError.message}`,
      );
  }
  revalidatePath("/admin/agreements", "layout");
  return success(makeCurrent ? "Published and now current" : "Published");
}

export async function makeAgreementCurrent(id: string): Promise<ActionState> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return failure("Unknown agreement.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_current_agreement", {
    p_agreement_id: id,
  });
  if (error) return failure(`Couldn't make it current: ${error.message}`);
  revalidatePath("/admin/agreements", "layout");
  return success("This version is now current");
}
