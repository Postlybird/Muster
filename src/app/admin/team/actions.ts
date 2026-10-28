"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { failure, success, type ActionState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAccess } from "@/server/audit";

/** Removes another admin's authenticator app so they can set it up again. */
export async function resetAuthenticator(
  profileId: string,
): Promise<ActionState> {
  const me = await requireAdmin();
  if (profileId === me.id) {
    return failure("Ask another admin to reset your own authenticator app.");
  }
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  if (profile?.role !== "admin") return failure("That person isn't an admin.");

  const { data, error } = await admin.auth.admin.mfa.listFactors({
    userId: profileId,
  });
  if (error) return failure("Couldn't load their authenticator app.");
  for (const factor of data.factors) {
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: profileId,
    });
    if (deleteError) return failure("Couldn't reset it. Please try again.");
  }
  await logAccess(
    "reset_authenticator",
    "auth.mfa_factors",
    profileId,
    profileId,
    {
      factors: data.factors.length,
    },
  );
  revalidatePath("/admin/team");
  return success(
    "Reset. They'll set up their app again next time they sign in.",
  );
}
