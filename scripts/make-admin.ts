/**
 * Makes an existing account an admin: `npx tsx scripts/make-admin.ts <email>`.
 * Nobody can become an admin by signing up, so the live site's first admin
 * is made here, by the "Make an admin on the live site" workflow, after the
 * owner has signed in once. They set up an authenticator app the next time
 * they sign in, as every admin must (requireAdmin()).
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/database.types";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("Usage: npx tsx scripts/make-admin.ts <email address>");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }
  const client = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error } = await client
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error(`Couldn't look up the account: ${error.message}`);
  if (!profile) {
    throw new Error(
      "No account has that email. Sign in on the site once with it, then run this again.",
    );
  }
  if (profile.role === "admin") {
    console.log("That account is already an admin.");
    return;
  }
  const { error: updateError } = await client
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", profile.id);
  if (updateError) {
    throw new Error(
      `Couldn't make the account an admin: ${updateError.message}`,
    );
  }
  console.log(
    "Done: that account is an admin. It sets up an authenticator app at its next sign-in.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
