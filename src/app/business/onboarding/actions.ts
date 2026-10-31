"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  formatAbn,
  getAbnLookup,
  isValidAbn,
  normaliseAbn,
} from "@/adapters/abn";
import { missingBusinessSteps } from "@/domain/business-onboarding";
import { failure, formBoolean, type ActionState } from "@/lib/forms";
import { normaliseAuPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { currentAgreement, recordAcceptances } from "@/server/agreements";
import {
  businessName,
  businessSnapshot,
  getMyBusiness,
  registerColumns,
} from "@/server/businesses";
import { saveFailed } from "@/server/errors";
import { notifyAdmins } from "@/server/notifications";
import { signUpDetails } from "@/server/sign-up";

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
 * Business sign-up in one go (owner, 01/11/2026): makes the business from
 * the register's details (looked up again here, so they can't be changed on
 * the way), fills in the billing contact from the owner's own details,
 * records their acceptance of the services agreement and submits it for our
 * approval. Our team hears straight away.
 */
export async function setUpBusiness(
  abnInput: string | null,
  agreementId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, business: existing, role } = await getMyBusiness();
  if (existing && existing.status !== "draft") redirect("/business");
  if (existing && role !== "owner") {
    return failure("Only the business owner can finish setting it up.");
  }
  const agreement = await currentAgreement("labour_hire_services");
  if (agreement) {
    if (agreement.id !== agreementId) {
      return failure(
        "The agreement has just been updated. Reload the page to read the new version.",
      );
    }
    if (!formBoolean(formData.get("accept"))) {
      return failure("Tick the box to accept the agreement.", {
        accept: ["Tick the box to accept the agreement"],
      });
    }
  }

  const details = await signUpDetails();
  const contactName =
    [details.firstName, details.lastName].filter(Boolean).join(" ") ||
    user.fullName ||
    null;
  const contactPhone = normaliseAuPhone(details.contactPhone ?? "");
  const admin = createAdminClient();

  let business = existing;
  if (!business) {
    const check = await checkAbn(abnInput ?? "");
    if (!check.ok) return failure(check.error);
    const result = await getAbnLookup().lookup(check.abn);
    if (!result.found) return failure("Please try again.");
    const d = result.details;
    const { data: created, error } = await admin
      .from("businesses")
      .insert({
        abn: d.abn,
        ...registerColumns(d),
        trading_name: d.businessNames[0] ?? null,
        billing_contact_name: contactName,
        billing_contact_phone: contactPhone,
        accounts_email: user.email,
        onboarding_steps: ["abn", "details"],
        created_by: user.id,
      })
      .select("*")
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
    business = created;
  } else if (!business.billing_contact_name || !business.accounts_email) {
    // Set up before sign-up got shorter: fill in what's missing.
    const supabase = await createClient();
    const { error } = await supabase
      .from("businesses")
      .update({
        billing_contact_name: business.billing_contact_name ?? contactName,
        billing_contact_phone: business.billing_contact_phone ?? contactPhone,
        accounts_email: business.accounts_email ?? user.email,
      })
      .eq("id", business.id);
    if (error) return saveFailed(error);
  }

  if (agreement) {
    const problem = await recordAcceptances(
      user.id,
      [agreement.id],
      business.id,
    );
    if (problem) return failure(problem);
  }

  const missing = missingBusinessSteps(
    await businessSnapshot({
      ...business,
      billing_contact_name: business.billing_contact_name ?? contactName,
      accounts_email: business.accounts_email ?? user.email,
    }),
  );
  if (missing.length > 0) {
    return failure(
      missing.includes("details")
        ? "Add a billing contact in Settings first."
        : "Some details are missing. Reload the page and try again.",
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_business");
  if (error) {
    if (error.code === "23514") return failure(`${error.message}.`);
    return saveFailed(error);
  }

  await notifyAdmins(
    "admin_business_submitted",
    {
      business: businessName(business),
      abn: formatAbn(business.abn),
      owner: contactName ?? user.email ?? "Someone",
    },
    {
      url: `/admin/businesses/${business.id}`,
      dedupeKey: `business-submitted:${business.id}`,
    },
  );
  revalidatePath("/business", "layout");
  redirect("/business?submitted=1");
}
