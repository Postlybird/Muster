"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAbnLookup } from "@/adapters/abn";
import { requireAdmin } from "@/lib/auth";
import {
  failure,
  formBoolean,
  requiredNumber,
  success,
  type ActionState,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { businessName, registerColumns } from "@/server/businesses";
import { saveFailed } from "@/server/errors";
import { notifyBusinessOwners } from "@/server/notifications";
import { requestOrigin } from "@/server/request";

const ABN_CANCELLED =
  "Your ABN is cancelled on the Australian Business Register. Contact us once it's active again.";

async function loadBusiness(businessId: string) {
  const user = await requireAdmin();
  const supabase = await createClient();
  const { data: business } = z.uuid().safeParse(businessId).success
    ? await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .maybeSingle()
    : { data: null };
  return { user, supabase, business };
}

function done(businessId: string, message: string): ActionState {
  revalidatePath(`/admin/businesses/${businessId}`);
  revalidatePath("/admin/businesses");
  return success(message);
}

type Terms =
  | { account_terms_approved: boolean; payment_terms_days: number | null }
  | { error: ActionState };

/** Account terms: invoices paid after the work, due so many days after issue. */
function readTerms(formData: FormData): Terms {
  if (!formBoolean(formData.get("account_terms"))) {
    return { account_terms_approved: false, payment_terms_days: null };
  }
  const days = requiredNumber("Enter the number of days")
    .pipe(
      z
        .number()
        .int("Whole days only")
        .min(0, "Can't be negative")
        .max(90, "90 days at most"),
    )
    .safeParse(formData.get("payment_terms_days"));
  if (!days.success) {
    return {
      error: failure("Check the payment terms.", {
        payment_terms_days: [days.error.issues[0]?.message ?? "Check this"],
      }),
    };
  }
  return { account_terms_approved: true, payment_terms_days: days.data };
}

function readReason(formData: FormData): string | ActionState {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    return failure("Tell the business why.", {
      reason: ["Write a message, or pick one of the reasons"],
    });
  }
  if (reason.length > 500) {
    return failure("Keep the message under 500 characters.", {
      reason: ["Keep it under 500 characters"],
    });
  }
  return reason;
}

async function postWorkLink() {
  return new URL("/business/post", await requestOrigin()).toString();
}

/**
 * A decision on a business waiting for approval: approve (with or without
 * account terms) or decline with a reason (brief §4.2 step 7).
 */
export async function decideBusiness(
  businessId: string,
  prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const decision = formData.get("decision");
  if (decision === "approve")
    return approveBusiness(businessId, prev, formData);
  if (decision === "decline") return holdBusiness(businessId, prev, formData);
  return failure("Choose approve or decline.", {
    decision: ["Choose approve or decline"],
  });
}

/** Approves a business that's waiting, or takes one off hold. */
export async function approveBusiness(
  businessId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, supabase, business } = await loadBusiness(businessId);
  if (!business) return failure("That business no longer exists.");
  if (business.status !== "pending" && business.status !== "suspended") {
    return failure("This business isn't waiting for a decision.");
  }
  if (business.abn_status !== "active") {
    return failure(
      "The ABN is cancelled, so the business can't be approved. Check the register again if it's been reinstated.",
    );
  }
  const terms = readTerms(formData);
  if ("error" in terms) return terms.error;

  const { error } = await supabase
    .from("businesses")
    .update({
      status: "approved",
      status_reason: null,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      ...terms,
    })
    .eq("id", businessId);
  if (error) return saveFailed(error);

  const name = businessName(business);
  // Declined businesses are on hold too, but have never been approved.
  const wasOnHold = business.status === "suspended" && !!business.approved_at;
  await notifyBusinessOwners(
    wasOnHold ? "business_off_hold" : "business_approved",
    businessId,
    {
      business: name,
      next: terms.account_terms_approved
        ? `You can post work now: ${await postWorkLink()}\n\nWe invoice weekly. Invoices are due ${terms.payment_terms_days} days after issue.`
        : "Before you can post work we need to set up your account terms. We'll be in touch.",
    },
  );
  return done(businessId, wasOnHold ? "Taken off hold" : `${name} approved`);
}

/** Declines a business that's waiting, or puts an approved one on hold. */
export async function holdBusiness(
  businessId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, business } = await loadBusiness(businessId);
  if (!business) return failure("That business no longer exists.");
  if (business.status !== "pending" && business.status !== "approved") {
    return failure("Only a waiting or approved business can be put on hold.");
  }
  const reason = readReason(formData);
  if (typeof reason !== "string") return reason;

  const { error } = await supabase
    .from("businesses")
    .update({ status: "suspended", status_reason: reason })
    .eq("id", businessId);
  if (error) return saveFailed(error);

  const name = businessName(business);
  const declined = business.status === "pending";
  await notifyBusinessOwners(
    declined ? "business_declined" : "business_on_hold",
    businessId,
    { business: name, reason },
  );
  return done(businessId, declined ? "Declined" : "Put on hold");
}

/** Account terms for an approved business. */
export async function saveAccountTerms(
  businessId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, business } = await loadBusiness(businessId);
  if (!business) return failure("That business no longer exists.");
  if (business.status !== "approved") {
    return failure("Approve the business first.");
  }
  const terms = readTerms(formData);
  if ("error" in terms) return terms.error;

  const { error } = await supabase
    .from("businesses")
    .update(terms)
    .eq("id", businessId);
  if (error) return saveFailed(error);

  if (terms.account_terms_approved && !business.account_terms_approved) {
    const name = businessName(business);
    await notifyBusinessOwners(
      "business_terms_set",
      businessId,
      { business: name, terms: String(terms.payment_terms_days) },
      { url: "/business/post" },
    );
  }
  return done(businessId, "Account terms saved");
}

/**
 * Looks the ABN up again and updates the register details. A business whose
 * ABN has been cancelled goes on hold, because it can't be approved.
 */
export async function recheckAbn(businessId: string): Promise<ActionState> {
  const { supabase, business } = await loadBusiness(businessId);
  if (!business) return failure("That business no longer exists.");
  const result = await getAbnLookup().lookup(business.abn);
  if (!result.found) {
    return failure(
      result.reason === "unavailable"
        ? "The ABN register isn't answering. Try again in a few minutes."
        : "The register didn't return this ABN. Check it on abr.business.gov.au.",
    );
  }
  const cancelled = result.details.status === "cancelled";
  const hold =
    cancelled &&
    (business.status === "pending" || business.status === "approved");
  const { error } = await supabase
    .from("businesses")
    .update({
      ...registerColumns(result.details),
      ...(hold ? { status: "suspended", status_reason: ABN_CANCELLED } : {}),
    })
    .eq("id", businessId);
  if (error) return saveFailed(error);

  if (hold) {
    const name = businessName(business);
    await notifyBusinessOwners("business_on_hold", businessId, {
      business: name,
      reason: ABN_CANCELLED,
    });
  }
  return done(
    businessId,
    hold
      ? "The ABN is cancelled, so the business is now on hold"
      : cancelled
        ? "The ABN is still cancelled"
        : "Register details are up to date",
  );
}
