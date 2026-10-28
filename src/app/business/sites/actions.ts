"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getGeocoder } from "@/adapters/geocode";
import { failure, success, type ActionState } from "@/lib/forms";
import { normaliseAuPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { canManage, getMyBusiness } from "@/server/businesses";
import { saveFailed } from "@/server/errors";

const siteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the site a name")
    .max(80, "Keep it under 80 characters"),
  access_notes: z.string().trim().max(1000, "Keep it under 1,000 characters"),
  parking_notes: z.string().trim().max(1000, "Keep it under 1,000 characters"),
  report_to_name: z.string().trim().max(80, "That's too long"),
  report_to_phone: z.string().trim(),
  geofence_radius_m: z.string().trim(),
});

/** "12 George St, Parramatta NSW 2150": how a saved address shows in the picker. */
function savedLabel(site: {
  address_line1: string;
  suburb: string;
  state: string;
  postcode: string;
}) {
  return `${site.address_line1}, ${site.suburb} ${site.state} ${site.postcode}`;
}

/** Adds or changes a site. During setup the page stays put so another can be added. */
export async function saveSite(
  siteId: string | null,
  context: "onboarding" | "page",
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) {
    return failure("Only owners and managers can change sites.");
  }
  const supabase = await createClient();
  const parsed = siteSchema.safeParse({
    name: formData.get("name") ?? "",
    access_notes: formData.get("access_notes") ?? "",
    parking_notes: formData.get("parking_notes") ?? "",
    report_to_name: formData.get("report_to_name") ?? "",
    report_to_phone: formData.get("report_to_phone") ?? "",
    geofence_radius_m: formData.get("geofence_radius_m") ?? "",
  });
  const errors: Record<string, string[] | undefined> = parsed.success
    ? {}
    : z.flattenError(parsed.error).fieldErrors;

  let phone: string | null = null;
  if (parsed.success && parsed.data.report_to_phone) {
    phone = normaliseAuPhone(parsed.data.report_to_phone);
    if (!phone) errors.report_to_phone = ["Enter an Australian phone number"];
  }
  let radius: number | null = null;
  if (parsed.success && parsed.data.geofence_radius_m) {
    radius = Number(parsed.data.geofence_radius_m);
    if (!Number.isInteger(radius) || radius < 50 || radius > 5000) {
      errors.geofence_radius_m = [
        "Use a number of metres between 50 and 5,000",
      ];
    }
  }

  // The address: a newly chosen suggestion, or the saved one left as it was.
  const existing = siteId
    ? (
        await supabase
          .from("sites")
          .select("address_line1, suburb, state, postcode")
          .eq("id", siteId)
          .maybeSingle()
      ).data
    : null;
  if (siteId && !existing) return failure("That site no longer exists.");
  const placeId = String(formData.get("address") ?? "");
  const placeText = String(formData.get("address_text") ?? "").trim();
  let place = null;
  if (placeId) {
    place = await getGeocoder().resolve(placeId);
    if (!place?.line1) {
      errors.address = ["Choose a street address from the list"];
    }
  } else if (!existing || placeText !== savedLabel(existing)) {
    errors.address = [
      placeText
        ? "Choose the address from the list"
        : "Start typing the street address",
    ];
  }

  if (!parsed.success || Object.values(errors).some(Boolean)) {
    return failure("Check the highlighted fields.", errors);
  }
  const { data: jurisdiction } = place
    ? await supabase
        .from("jurisdictions")
        .select("code")
        .eq("code", place.state)
        .maybeSingle()
    : { data: { code: existing!.state } };
  if (!jurisdiction) {
    return failure("Check the highlighted fields.", {
      address: [
        "We can only place workers in Australian states and territories",
      ],
    });
  }

  const fields = {
    name: parsed.data.name,
    access_notes: parsed.data.access_notes || null,
    parking_notes: parsed.data.parking_notes || null,
    report_to_name: parsed.data.report_to_name || null,
    report_to_phone: phone,
    geofence_radius_m: radius,
    ...(place
      ? {
          address_line1: place.line1!,
          suburb: place.suburb,
          state: place.state,
          postcode: place.postcode,
          lat: place.lat,
          lng: place.lng,
        }
      : {}),
  };
  let error;
  if (siteId) {
    ({ error } = await supabase.from("sites").update(fields).eq("id", siteId));
  } else if (place?.line1) {
    ({ error } = await supabase.from("sites").insert({
      ...fields,
      business_id: business.id,
      address_line1: place.line1,
      suburb: place.suburb,
      state: place.state,
      postcode: place.postcode,
      lat: place.lat,
      lng: place.lng,
    }));
  }
  if (error) return saveFailed(error);

  revalidatePath("/business", "layout");
  if (context === "page" && !siteId) redirect("/business/sites?saved=1");
  return success(siteId ? "Site saved" : `${fields.name} added`);
}

export async function archiveSite(siteId: string): Promise<ActionState> {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) {
    return failure("Only owners and managers can change sites.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", siteId)
    .eq("business_id", business.id);
  if (error) return saveFailed(error);
  revalidatePath("/business", "layout");
  return success("Site removed");
}
