import "server-only";

import type { Tables } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { requestClientInfo } from "./request";

type AgreementKind = Tables<"agreements">["kind"];

/** The current published version of a document, if there is one. */
export async function currentAgreement(
  kind: AgreementKind,
): Promise<Tables<"agreements"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agreements")
    .select("*")
    .eq("kind", kind)
    .is("jurisdiction", null)
    .eq("is_current", true)
    .maybeSingle();
  return data;
}

export async function hasAccepted(
  profileId: string,
  agreementId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("agreement_acceptances")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("agreement_id", agreementId);
  return (count ?? 0) > 0;
}

/**
 * Records that someone accepted documents, with the time, IP address and
 * browser taken from this request. Written by the server (not the user's own
 * connection) so the details can't be forged; the records can't be changed.
 * Returns an error message, or null.
 */
export async function recordAcceptances(
  profileId: string,
  agreementIds: string[],
  businessId: string | null = null,
): Promise<string | null> {
  if (agreementIds.length === 0) return null;
  const admin = createAdminClient();

  const { data: current } = await admin
    .from("agreements")
    .select("id")
    .in("id", agreementIds)
    .eq("is_current", true);
  if ((current ?? []).length !== new Set(agreementIds).size) {
    return "One of these documents has just been updated. Reload the page to read the new version.";
  }

  const { data: existing } = await admin
    .from("agreement_acceptances")
    .select("agreement_id")
    .eq("profile_id", profileId)
    .in("agreement_id", agreementIds);
  const already = new Set((existing ?? []).map((row) => row.agreement_id));
  const toRecord = [...new Set(agreementIds)].filter((id) => !already.has(id));
  if (toRecord.length === 0) return null;

  const { ip, userAgent } = await requestClientInfo();
  const { error } = await admin.from("agreement_acceptances").insert(
    toRecord.map((agreementId) => ({
      agreement_id: agreementId,
      profile_id: profileId,
      business_id: businessId,
      ip: ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null,
      user_agent: userAgent?.slice(0, 500) ?? null,
    })),
  );
  if (error) {
    console.error("Recording acceptance failed", error);
    return "We couldn't record that. Please try again.";
  }
  return null;
}
