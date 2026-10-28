"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAbnLookup, isValidAbn, normaliseAbn } from "@/adapters/abn";
import {
  missingBusinessSteps,
  type BusinessStepKey,
} from "@/domain/business-onboarding";
import { failure, type ActionState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  businessSnapshot,
  finishBusinessStep,
  getMyBusiness,
} from "@/server/businesses";
import { saveFailed } from "@/server/errors";

export async function continueBusinessStep(
  step: BusinessStepKey,
): Promise<ActionState> {
  const { business, role } = await getMyBusiness();
  if (!business || role !== "owner") return failure("Set up your ABN first.");
  if (step === "sites") {
    const snapshot = await businessSnapshot(business);
    if (snapshot.siteCount === 0) return failure("Add at least one site.");
  }
  if (step === "agreement") {
    const snapshot = await businessSnapshot(business);
    if (!snapshot.agreementAccepted)
      return failure("Accept the agreement first.");
  } else if (step !== "abn" && step !== "sites" && step !== "team") {
    return failure("Fill in this step first.");
  }
  return finishBusinessStep(business, step);
}

export type AbnCheck =
  | {
      ok: true;
      abn: string;
      legalName: string;
      entityType: string;
      gstRegisteredFrom: string | null;
      location: string;
      businessNames: string[];
    }
  | { ok: false; error: string };

/** Looks an ABN up on the register and says whether it can be used. */
export async function checkAbn(input: string): Promise<AbnCheck> {
  const { business } = await getMyBusiness();
  if (business)
    return { ok: false, error: "You've already set up your business." };
  const abn = normaliseAbn(input);
  if (!isValidAbn(abn)) {
    return {
      ok: false,
      error: "That isn't a valid ABN. Check the 11 digits and try again.",
    };
  }
  const result = await getAbnLookup().lookup(abn);
  if (!result.found) {
    return {
      ok: false,
      error:
        result.reason === "unavailable"
          ? "The ABN register isn't answering right now. Try again in a few minutes."
          : "We couldn't find that ABN on the register. Check it and try again.",
    };
  }
  const d = result.details;
  if (d.status === "cancelled") {
    return {
      ok: false,
      error: `This ABN was cancelled${d.statusEffectiveFrom ? ` on ${d.statusEffectiveFrom.split("-").reverse().join("/")}` : ""}. You need an active ABN to hire workers through us.`,
    };
  }
  const admin = createAdminClient();
  const { count } = await admin
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("abn", abn)
    .is("archived_at", null);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "This business already has an account. Ask its owner to invite you from their Team page.",
    };
  }
  return {
    ok: true,
    abn,
    legalName: d.entityName,
    entityType: d.entityTypeName,
    gstRegisteredFrom: d.gstRegisteredFrom,
    location: [d.state, d.postcode].filter(Boolean).join(" "),
    businessNames: d.businessNames,
  };
}

/**
 * Creates the business from the register's details. The lookup is done
 * again here, and the details are written by the server, so they can't be
 * changed on the way.
 */
export async function createBusiness(input: string): Promise<ActionState> {
  const { user, business } = await getMyBusiness();
  if (business) redirect("/business/onboarding/details");
  const check = await checkAbn(input);
  if (!check.ok) return failure(check.error);
  const result = await getAbnLookup().lookup(check.abn);
  if (!result.found) return failure("Please try again.");
  const d = result.details;

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("businesses")
    .insert({
      abn: d.abn,
      legal_name: d.entityName,
      entity_type_code: d.entityTypeCode,
      entity_type: d.entityTypeName,
      abn_status: d.status,
      abn_status_from: d.statusEffectiveFrom,
      gst_registered: !!d.gstRegisteredFrom,
      gst_registered_from: d.gstRegisteredFrom,
      acn: d.acn,
      abr_state: d.state,
      abr_postcode: d.postcode,
      abr_checked_at: new Date().toISOString(),
      trading_name: d.businessNames[0] ?? null,
      onboarding_steps: ["abn"],
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !created) {
    if (error?.code === "23505") {
      return failure("This business already has an account.");
    }
    return saveFailed(error ?? { message: "No business created" });
  }
  const { error: memberError } = await admin.from("business_users").insert({
    business_id: created.id,
    profile_id: user.id,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });
  if (memberError) return saveFailed(memberError);

  revalidatePath("/business", "layout");
  redirect("/business/onboarding/details");
}

export async function submitBusiness(): Promise<ActionState> {
  const { business, role } = await getMyBusiness();
  if (!business || role !== "owner")
    return failure("Only the owner can submit.");
  const missing = missingBusinessSteps(await businessSnapshot(business));
  if (missing.length > 0)
    return failure("Finish the steps marked below first.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_business");
  if (error) {
    if (error.code === "23514") return failure(`${error.message}.`);
    return saveFailed(error);
  }
  revalidatePath("/business", "layout");
  redirect("/business?submitted=1");
}
