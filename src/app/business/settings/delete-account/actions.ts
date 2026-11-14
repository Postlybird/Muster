"use server";

import { requireRole } from "@/lib/auth";
import type { ActionState } from "@/lib/forms";
import { closeMyAccount } from "@/server/accounts";

/** Delete my account (owner, 14/11/2026). */
export async function deleteMyAccount(): Promise<ActionState> {
  await requireRole("business_user");
  const result = await closeMyAccount();
  return result.ok
    ? { status: "success", message: "Your account is deleted." }
    : { status: "error", message: result.error };
}
