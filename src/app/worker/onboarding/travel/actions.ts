"use server";

import { z } from "zod";

import { getGeocoder } from "@/adapters/geocode";
import { failure, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { getMyWorker, goOn, saveFailed, stepsWith } from "@/server/workers";

import { LICENCE_LABELS, RADIUS_OPTIONS_KM, suburbLabel } from "./options";

const yesNo = z.enum(["yes", "no"], { error: "Choose yes or no" });

const schema = z.object({
  travel_radius_km: z.coerce
    .number()
    .refine((km) => RADIUS_OPTIONS_KM.includes(km), "Choose a distance"),
  has_car: yesNo,
  licence_class: z.enum(
    Object.keys(LICENCE_LABELS) as [keyof typeof LICENCE_LABELS],
    { error: "Choose your licence" },
  ),
  uses_public_transport: yesNo,
});

export async function saveTravel(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  const parsed = schema.safeParse({
    travel_radius_km: formData.get("travel_radius_km"),
    has_car: formData.get("has_car") ?? undefined,
    licence_class: formData.get("licence_class") ?? undefined,
    uses_public_transport: formData.get("uses_public_transport") ?? undefined,
  });
  const errors: Record<string, string[] | undefined> = parsed.success
    ? {}
    : z.flattenError(parsed.error).fieldErrors;

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

  if (!parsed.success || Object.values(errors).some(Boolean)) {
    return failure("Check the highlighted fields.", errors);
  }

  const supabase = await createClient();
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
      travel_radius_km: parsed.data.travel_radius_km,
      has_car: parsed.data.has_car === "yes",
      licence_class: parsed.data.licence_class,
      uses_public_transport: parsed.data.uses_public_transport === "yes",
      onboarding_steps: stepsWith(worker, "travel"),
    })
    .eq("id", worker.id);
  if (error) return saveFailed(error);
  return goOn(worker, "travel");
}
