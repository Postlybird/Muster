"use server";

import { z } from "zod";

import { dateFromParts, dateOfBirthProblem } from "@/domain/onboarding";
import { sydneyDateKey } from "@/lib/format";
import { failure, type ActionState } from "@/lib/forms";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { acceptedUpload } from "@/lib/uploads";
import { getAllSettings } from "@/server/settings";
import {
  getMyWorker,
  goOn,
  identityVerified,
  stepsWith,
} from "@/server/workers";
import { saveFailed } from "@/server/errors";

const names = z.object({
  legal_first_name: z
    .string()
    .trim()
    .min(1, "Enter your first name, as it appears on your ID")
    .max(60, "That's too long"),
  legal_last_name: z
    .string()
    .trim()
    .min(1, "Enter your last name, as it appears on your ID")
    .max(60, "That's too long"),
});

const preferredName = z.string().trim().max(40, "Keep it under 40 characters");

export async function saveAbout(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const errors: Record<string, string[]> = {};
  const update: TablesUpdate<"workers"> = {};
  const text = (key: string) => String(formData.get(key) ?? "");

  // Names and date of birth can't change once ID has been checked.
  if (!(await identityVerified(worker.id))) {
    const parsed = names.safeParse({
      legal_first_name: text("legal_first_name"),
      legal_last_name: text("legal_last_name"),
    });
    if (parsed.success) Object.assign(update, parsed.data);
    else Object.assign(errors, z.flattenError(parsed.error).fieldErrors);

    const dateOfBirth = dateFromParts(
      text("date_of_birth_day"),
      text("date_of_birth_month"),
      text("date_of_birth_year"),
    );
    if (!dateOfBirth) {
      errors.date_of_birth = [
        "Enter your date of birth as numbers, for example 27 3 1995",
      ];
    } else {
      const settings = await getAllSettings();
      const problem = dateOfBirthProblem(
        dateOfBirth,
        sydneyDateKey(new Date()),
        settings.min_worker_age,
      );
      if (problem) errors.date_of_birth = [problem];
      else update.date_of_birth = dateOfBirth;
    }
  }

  const preferred = preferredName.safeParse(text("preferred_name"));
  if (preferred.success) update.preferred_name = preferred.data || null;
  else errors.preferred_name = [preferred.error.issues[0]!.message];

  const photo = acceptedUpload(
    formData.get("photo_path"),
    worker.photo_path,
    worker.id,
    "photo",
  );
  if (photo === undefined) errors.photo_path = ["Upload your photo again"];
  else if (photo === null) errors.photo_path = ["Add a photo of your face"];
  else update.photo_path = photo;

  if (Object.keys(errors).length > 0) {
    return failure("Check the highlighted fields.", errors);
  }

  update.onboarding_steps = stepsWith(worker, "about");
  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .update(update)
    .eq("id", worker.id);
  if (error) return saveFailed(error);
  return goOn(worker, "about");
}
