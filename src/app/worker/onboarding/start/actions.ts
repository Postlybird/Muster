"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getGeocoder } from "@/adapters/geocode";
import { RADIUS_OPTIONS_KM, suburbLabel } from "@/config/worker-options";
import { QUICK_START_STEPS } from "@/domain/onboarding";
import { failure, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { currentAgreement, recordAcceptances } from "@/server/agreements";
import { saveFailed } from "@/server/errors";
import { signUpDetails } from "@/server/sign-up";
import { getMyWorker } from "@/server/workers";

import { sendContactCode, type SendResult } from "../contact/actions";

/** Any time, every day, until the worker says otherwise (owner, 01/11/2026). */
const ANY_TIME = { start_time: "00:00", end_time: "23:59" };

/**
 * The collection notice: the register form said continuing means agreeing
 * to it, and the first thing saved here records that (brief §4.9).
 */
async function acceptCollectionNotice(profileId: string) {
  const notice = await currentAgreement("privacy_collection_notice");
  return notice ? recordAcceptances(profileId, [notice.id]) : null;
}

/** Texts a code to confirm the worker's mobile (we text call-outs and reminders). */
export async function sendMobileCode(value: string): Promise<SendResult> {
  const { user } = await getMyWorker();
  const problem = await acceptCollectionNotice(user.id);
  if (problem) return { ok: false, error: problem };
  return sendContactCode("phone", value);
}

export type ConfirmResult = { ok: true } | { ok: false; error: string };

export async function confirmMobileCode(
  destination: string,
  code: string,
): Promise<ConfirmResult> {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) {
    return { ok: false, error: "Enter the 6-digit code." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: destination,
    token,
    type: "phone_change",
  });
  if (error) {
    return {
      ok: false,
      error:
        "That code didn't work. It may have expired. Check it, or send a new code.",
    };
  }
  return { ok: true };
}

const schema = z.object({
  travel_radius_km: z.coerce
    .number()
    .refine((km) => RADIUS_OPTIONS_KM.includes(km), "Choose a distance"),
});

/**
 * The rest of the quick sign-up in one go: where they live, how far they'll
 * travel and the work they want. Availability starts as any time, and the
 * worker goes home to see shifts near them and what's left to do.
 */
export async function finishQuickStart(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, worker } = await getMyWorker();
  if (!user.phone) {
    return failure("Confirm your mobile number first.");
  }
  const errors: Record<string, string[] | undefined> = {};
  const parsed = schema.safeParse({
    travel_radius_km: formData.get("travel_radius_km"),
  });
  if (!parsed.success) {
    Object.assign(errors, z.flattenError(parsed.error).fieldErrors);
  }

  // The suburb: a newly chosen suggestion, or the saved one left as it was.
  const placeId = String(formData.get("home_place") ?? "");
  const placeText = String(formData.get("home_place_text") ?? "").trim();
  let place: Awaited<ReturnType<ReturnType<typeof getGeocoder>["resolve"]>> =
    null;
  const savedLabel = suburbLabel(
    worker.home_suburb,
    worker.home_state,
    worker.home_postcode,
  );
  if (placeId) {
    place = await getGeocoder().resolve(placeId);
    if (!place) errors.home_place = ["Choose your suburb from the list"];
  } else if (!worker.home_suburb || placeText !== savedLabel) {
    errors.home_place = [
      placeText
        ? "Choose your suburb from the list"
        : "Enter the suburb you live in",
    ];
  }

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
  const selected = (categories ?? []).map((c) => c.id);
  if (selected.length === 0) {
    errors.category_ids = ["Choose at least one type of work"];
  }
  if (!parsed.success || Object.values(errors).some(Boolean)) {
    return failure("Check the highlighted fields.", errors);
  }

  const problem = await acceptCollectionNotice(user.id);
  if (problem) return failure(problem);

  // The work they chose; experience can be added later from their profile.
  const { data: existing } = await supabase
    .from("worker_categories")
    .select("category_id")
    .eq("worker_id", worker.id);
  const had = new Set((existing ?? []).map((row) => row.category_id));
  const removed = [...had].filter((id) => !selected.includes(id));
  if (removed.length > 0) {
    const { error } = await supabase
      .from("worker_categories")
      .delete()
      .eq("worker_id", worker.id)
      .in("category_id", removed);
    if (error) return saveFailed(error);
  }
  const added = selected.filter((id) => !had.has(id));
  if (added.length > 0) {
    const { error } = await supabase.from("worker_categories").insert(
      added.map((categoryId) => ({
        worker_id: worker.id,
        category_id: categoryId,
        years_experience: 0,
      })),
    );
    if (error) return saveFailed(error);
  }

  const { count: windows } = await supabase
    .from("availability_weekly")
    .select("id", { count: "exact", head: true })
    .eq("worker_id", worker.id);
  if (!windows) {
    const { error } = await supabase.from("availability_weekly").insert(
      [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
        worker_id: worker.id,
        weekday,
        ...ANY_TIME,
      })),
    );
    if (error) return saveFailed(error);
  }

  const names = await signUpDetails();
  const { error } = await supabase
    .from("workers")
    .update({
      ...(place
        ? {
            home_suburb: place.suburb,
            home_postcode: place.postcode,
            home_state: place.state,
            home_lat: place.lat,
            home_lng: place.lng,
          }
        : {}),
      travel_radius_km: parsed.data!.travel_radius_km,
      // Their name as they typed it; photo ID confirms it later.
      legal_first_name: worker.legal_first_name ?? names.firstName,
      legal_last_name: worker.legal_last_name ?? names.lastName,
      onboarding_steps: [
        ...new Set([...worker.onboarding_steps, ...QUICK_START_STEPS]),
      ],
    })
    .eq("id", worker.id);
  if (error) return saveFailed(error);
  redirect("/worker?welcome=1");
}
