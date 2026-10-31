import "server-only";

import { cache } from "react";

import type { AbnDetails } from "@/adapters/abn";
import { requireRole, type SessionUser } from "@/lib/auth";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

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

/** Every business by name, for admins choosing one (e.g. for its own rates). */
export async function businessOptions(): Promise<
  { id: string; name: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, legal_name, trading_name")
    .is("archived_at", null);
  return (data ?? [])
    .map((business) => ({ id: business.id, name: businessName(business) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The columns that come from the Australian Business Register. Only the
 * server writes them, straight after a lookup.
 */
export function registerColumns(details: AbnDetails) {
  return {
    legal_name: details.entityName,
    entity_type_code: details.entityTypeCode,
    entity_type: details.entityTypeName,
    abn_status: details.status,
    abn_status_from: details.statusEffectiveFrom,
    gst_registered: !!details.gstRegisteredFrom,
    gst_registered_from: details.gstRegisteredFrom,
    acn: details.acn,
    abr_state: details.state,
    abr_postcode: details.postcode,
    abr_checked_at: new Date().toISOString(),
  };
}

/** Everything needed to know what's still missing before submitting. */
export async function businessSnapshot(business: BusinessRow) {
  const supabase = await createClient();
  const { data: agreement } = await supabase
    .from("agreements")
    .select("id")
    .eq("kind", "labour_hire_services")
    .is("jurisdiction", null)
    .eq("is_current", true)
    .maybeSingle();
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
    agreementAccepted,
  };
}
