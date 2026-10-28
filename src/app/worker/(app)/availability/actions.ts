"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  availableNowUntil,
  normaliseTime,
  windowProblem,
} from "@/domain/availability";
import { isIsoDate } from "@/domain/onboarding";
import { sydneyDateKey } from "@/lib/format";
import { failure, formBoolean, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { getMyWorker, goOn, saveFailed, stepsWith } from "@/server/workers";

/** Saves the weekly pattern and the urgent call-out choice. */
export async function saveWeekly(
  context: "onboarding" | "page",
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const errors: Record<string, string[]> = {};
  const rows: {
    worker_id: string;
    weekday: number;
    start_time: string;
    end_time: string;
  }[] = [];

  for (let day = 1; day <= 7; day++) {
    if (!formBoolean(formData.get(`day_${day}`))) continue;
    const start = normaliseTime(String(formData.get(`start_${day}`) ?? ""));
    const end = normaliseTime(String(formData.get(`end_${day}`) ?? ""));
    const problem = windowProblem(start, end);
    if (problem) errors[`day_${day}`] = [problem];
    else
      rows.push({
        worker_id: worker.id,
        weekday: day,
        start_time: start!,
        end_time: end!,
      });
  }
  if (rows.length === 0 && Object.keys(errors).length === 0) {
    errors.days = [
      "Choose at least one day. We use it to decide which shifts to tell you about.",
    ];
  }
  if (Object.keys(errors).length > 0) {
    return failure("Check the highlighted days.", errors);
  }

  const supabase = await createClient();
  const { error: upsertError } = await supabase
    .from("availability_weekly")
    .upsert(rows, { onConflict: "worker_id,weekday" });
  if (upsertError) return saveFailed(upsertError);
  const { error: deleteError } = await supabase
    .from("availability_weekly")
    .delete()
    .eq("worker_id", worker.id)
    .not("weekday", "in", `(${rows.map((r) => r.weekday).join(",")})`);
  if (deleteError) return saveFailed(deleteError);

  const { error } = await supabase
    .from("workers")
    .update({
      urgent_opt_in: formBoolean(formData.get("urgent_opt_in")),
      ...(context === "onboarding"
        ? { onboarding_steps: stepsWith(worker, "availability") }
        : {}),
    })
    .eq("id", worker.id);
  if (error) return saveFailed(error);

  if (context === "onboarding") return goOn(worker, "availability");
  revalidatePath("/worker", "layout");
  return success("Availability saved");
}

/** The "available now" switch: on for a few hours, or off. */
export async function setAvailableNow(on: boolean): Promise<ActionState> {
  const { worker } = await getMyWorker();
  if (on && worker.status !== "active") {
    return failure("You can switch this on once your details are verified.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .update({
      available_now_until: on
        ? availableNowUntil(new Date()).toISOString()
        : null,
    })
    .eq("id", worker.id);
  if (error) return saveFailed(error);
  revalidatePath("/worker", "layout");
  return success(on ? "You're available now" : "Available now is off");
}

const blockSchema = z.object({
  date: z
    .string()
    .refine(isIsoDate, "Enter a date")
    .refine(
      (date) => date >= sydneyDateKey(new Date()),
      "Choose today or a later date",
    ),
  note: z.string().trim().max(100, "Keep the note short"),
});

export async function addBlockedDate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const parsed = blockSchema.safeParse({
    date: formData.get("date") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return failure(
      "Check the date.",
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.from("availability_blocks").upsert(
    {
      worker_id: worker.id,
      date: parsed.data.date,
      note: parsed.data.note || null,
    },
    { onConflict: "worker_id,date" },
  );
  if (error) return saveFailed(error);
  revalidatePath("/worker/availability");
  return success("Date blocked out");
}

export async function removeBlockedDate(id: string): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_blocks")
    .delete()
    .eq("id", id)
    .eq("worker_id", worker.id);
  if (error) return saveFailed(error);
  revalidatePath("/worker/availability");
  return success("Date removed");
}
