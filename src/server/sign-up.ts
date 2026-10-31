import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SignUpDetails = {
  firstName: string | null;
  lastName: string | null;
  /** A business's ABN, as typed (checked again before use). */
  abn: string | null;
  /** A business's mobile, already in +61 form. */
  contactPhone: string | null;
};

/**
 * What someone typed on the register form (owner, 01/11/2026), kept with
 * their account until the email is confirmed. People can change their own
 * account details, so treat these as typed input and check them again.
 */
export async function signUpDetails(): Promise<SignUpDetails> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const text = (value: unknown) =>
    typeof value === "string" && value.trim()
      ? value.trim().slice(0, 120)
      : null;
  return {
    firstName: text(meta.first_name),
    lastName: text(meta.last_name),
    abn: text(meta.abn),
    contactPhone: text(meta.contact_phone),
  };
}
