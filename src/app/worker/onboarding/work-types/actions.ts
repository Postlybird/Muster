"use server";

import { z } from "zod";

import { failure, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { getMyWorker, goOn, stepsWith } from "@/server/workers";
import { saveFailed } from "@/server/errors";

const bioSchema = z.string().trim().max(500, "Keep it under 500 characters");

export async function saveWorkTypes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const supabase = await createClient();

  const chosen = [
    ...new Set(
      formData
        .getAll("category_ids")
        .filter((v): v is string => typeof v === "string"),
    ),
  ];
  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("active", true)
    .is("archived_at", null)
    .in(
      "id",
      chosen.length > 0 ? chosen : ["00000000-0000-0000-0000-000000000000"],
    );
  const valid = new Set((categories ?? []).map((c) => c.id));
  const selected = chosen.filter((id) => valid.has(id));

  const errors: Record<string, string[]> = {};
  if (selected.length === 0) {
    errors.category_ids = ["Choose at least one type of work"];
  }
  const bio = bioSchema.safeParse(formData.get("bio") ?? "");
  if (!bio.success) errors.bio = [bio.error.issues[0]!.message];
  if (Object.keys(errors).length > 0 || !bio.success) {
    return failure("Check the highlighted fields.", errors);
  }

  const rows = selected.map((categoryId) => {
    const years = Number(formData.get(`years_${categoryId}`) ?? 0);
    return {
      worker_id: worker.id,
      category_id: categoryId,
      years_experience: Number.isInteger(years)
        ? Math.min(Math.max(years, 0), 10)
        : 0,
    };
  });

  const { data: existing } = await supabase
    .from("worker_categories")
    .select("category_id")
    .eq("worker_id", worker.id);
  const removed = (existing ?? [])
    .map((row) => row.category_id)
    .filter((id) => !selected.includes(id));
  if (removed.length > 0) {
    const { error } = await supabase
      .from("worker_categories")
      .delete()
      .eq("worker_id", worker.id)
      .in("category_id", removed);
    if (error) return saveFailed(error);
  }

  const { error: upsertError } = await supabase
    .from("worker_categories")
    .upsert(rows, { onConflict: "worker_id,category_id" });
  if (upsertError) return saveFailed(upsertError);

  const { error } = await supabase
    .from("workers")
    .update({
      bio: bio.data || null,
      onboarding_steps: stepsWith(worker, "work-types"),
    })
    .eq("id", worker.id);
  if (error) return saveFailed(error);
  return goOn(worker, "work-types");
}
