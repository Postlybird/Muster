import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { brand } from "@/config/brand";
import { isDemoEmail } from "@/config/demo";
import { isDemoMode } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * Delete my account (owner, 14/11/2026; both app stores require it).
 * `close_my_account()` archives the person and removes what the law doesn't
 * need, refusing while they have shifts booked. Then, with the service role,
 * this deletes their photo files and blocks sign-in for good, after signing
 * them out everywhere. Hours, pay and invoices stay for 7 years.
 */
export type CloseAccountResult = { ok: true } | { ok: false; error: string };

/** Long enough to mean for good (about 100 years). */
const BLOCK_SIGN_IN = "876000h";

/** What someone sees when they try to sign in to a closed account. */
export const CLOSED_ACCOUNT_MESSAGE = `This account was deleted. To work with us again, email ${brand.supportEmail}.`;

/** Seeded demo accounts are shared, so the demo keeps them. */
export function demoAccountKept(email: string | null | undefined): boolean {
  return isDemoMode() && isDemoEmail(email ?? null);
}

export async function closeMyAccount(): Promise<CloseAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again, then try again." };
  if (demoAccountKept(user.email)) {
    return {
      ok: false,
      error:
        "Demo accounts can't be deleted. Sign up with your own email to try it.",
    };
  }

  const { data, error } = await supabase.rpc("close_my_account");
  if (error) {
    return {
      ok: false,
      error:
        error.message === "shifts_booked"
          ? (error.hint ?? "Cancel your booked shifts first.")
          : "We couldn't delete your account. Try again, or contact us.",
    };
  }

  const admin = createAdminClient();
  const workerId = workerIdOf(data);
  if (workerId) await removeFolder(admin, "worker-photos", workerId);
  await supabase.auth.signOut({ scope: "global" });
  await blockSignIn(admin, user);
  return { ok: true };
}

function workerIdOf(data: unknown): string | null {
  if (data && typeof data === "object" && "worker_id" in data) {
    const id = (data as { worker_id: unknown }).worker_id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

/** Every file in a worker's folder, like old photos as well as the current one. */
async function removeFolder(
  admin: SupabaseClient<Database>,
  bucket: string,
  folder: string,
): Promise<void> {
  const { data: files, error } = await admin.storage
    .from(bucket)
    .list(folder, { limit: 1000 });
  if (error) {
    console.error(`Couldn't list ${bucket}/${folder}: ${error.message}`);
    return;
  }
  const paths = (files ?? []).map((file) => `${folder}/${file.name}`);
  if (paths.length === 0) return;
  const { error: removeError } = await admin.storage.from(bucket).remove(paths);
  if (removeError) {
    console.error(
      `Couldn't remove ${bucket}/${folder}: ${removeError.message}`,
    );
  }
}

/**
 * The profile is archived already, which keeps them out of the app; this
 * also stops new sign-in codes working.
 */
async function blockSignIn(
  admin: SupabaseClient<Database>,
  user: User,
): Promise<void> {
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: BLOCK_SIGN_IN,
  });
  if (error) {
    console.error(
      `Couldn't block sign-in for a closed account: ${error.message}`,
    );
  }
}
