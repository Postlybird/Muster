import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";

import {
  nextBusinessStep,
  type BusinessStepKey,
} from "@/domain/business-onboarding";
import { requireRole, type SessionUser } from "@/lib/auth";
import type { ActionState } from "@/lib/forms";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { saveFailed } from "./errors";

export type BusinessRow = Tables<"businesses">;
export type BusinessRole = Tables<"business_users">["role"];

export type MyBusiness = {
  user: SessionUser;
  business: BusinessRow | null;
  role: BusinessRole | null;
  membershipId: string | null;
};

/**
 * The signed-in business user, their business and role. Someone signing in
 * for the first time after being invited joins that business here.
 * Cached for the request.
 */
export const getMyBusiness = cache(async (): Promise<MyBusiness> => {
  const user = await requireRole("business_user");
  const supabase = await createClient();

  const load = () =>
    supabase
      .from("business_users")
      .select("id, role, businesses(*)")
      .eq("profile_id", user.id)
      .is("archived_at", null)
      .maybeSingle();

  let { data: membership } = await load();
  if (!membership) {
    const { data: joined } = await supabase.rpc("accept_business_invites");
    if (joined) ({ data: membership } = await load());
  }
  return {
    user,
    business: membership?.businesses ?? null,
    role: membership?.role ?? null,
    membershipId: membership?.id ?? null,
  };
});

/** Owners and managers run the account; supervisors look after their sites. */
export function canManage(role: BusinessRole | null): boolean {
  return role === "owner" || role === "manager";
}

/** "Harbour Restoration" (trading name), or the legal name. */
export function businessName(
  business: Pick<BusinessRow, "trading_name" | "legal_name">,
): string {
  return business.trading_name || business.legal_name;
}

/** Everything needed to know which steps are still missing. */
export async function businessSnapshot(business: BusinessRow) {
  const supabase = await createClient();
  const [{ count: siteCount }, { data: agreement }] = await Promise.all([
    supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .is("archived_at", null),
    supabase
      .from("agreements")
      .select("id")
      .eq("kind", "labour_hire_services")
      .is("jurisdiction", null)
      .eq("is_current", true)
      .maybeSingle(),
  ]);
  let agreementAccepted = !agreement;
  if (agreement) {
    const { count } = await supabase
      .from("agreement_acceptances")
      .select("id", { count: "exact", head: true })
      .eq("agreement_id", agreement.id)
      .eq("business_id", business.id);
    agreementAccepted = (count ?? 0) > 0;
  }
  return {
    abnActive: business.abn_status === "active",
    billingContactName: business.billing_contact_name,
    accountsEmail: business.accounts_email,
    siteCount: siteCount ?? 0,
    agreementAccepted,
  };
}

/** Records a finished step and goes to the next one. */
export async function finishBusinessStep(
  business: BusinessRow,
  step: BusinessStepKey,
): Promise<ActionState> {
  if (!business.onboarding_steps.includes(step)) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("businesses")
      .update({ onboarding_steps: [...business.onboarding_steps, step] })
      .eq("id", business.id);
    if (error) return saveFailed(error);
  }
  revalidatePath("/business", "layout");
  redirect(`/business/onboarding/${nextBusinessStep(step)}`);
}
