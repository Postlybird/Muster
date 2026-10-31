/**
 * After a deploy: asks the project for a code by text and by email, and
 * checks each one lands in the demo outbox. People sign in by email; texted
 * codes confirm a worker's mobile number, through the same hook.
 * It asks for demo accounts' codes only (the seed makes them), so no real
 * person is sent anything.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/database.types";
import { ADMINS, WORKERS } from "./seed/data/people";
import { loadEnv } from "./seed/client";

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
}
const client = createClient<Database>(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function outboxCount(recipient: string): Promise<number> {
  const { count, error } = await client
    .from("dev_outbox")
    .select("id", { count: "exact", head: true })
    .eq("recipient", recipient);
  if (error) throw new Error(`Couldn't read the outbox: ${error.message}`);
  return count ?? 0;
}

/** Asks for a code, then waits up to 10 seconds for it in the outbox. */
async function check(
  label: string,
  recipient: string,
  request: () => Promise<{
    error: { message: string; status?: number } | null;
  }>,
) {
  const before = await outboxCount(recipient);
  const { error } = await request();
  if (error?.status === 429) {
    // Back-to-back deploys can hit the hourly limit; that isn't a fault.
    console.log(`::warning::${label}: not checked (${error.message})`);
    return;
  }
  if (error) throw new Error(`${label}: ${error.message}`);
  for (let attempt = 0; attempt < 10; attempt++) {
    if ((await outboxCount(recipient)) > before) {
      console.log(`${label}: the code reached the demo outbox.`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${label}: no code reached the demo outbox.`);
}

async function main() {
  const worker = WORKERS[0]!;
  const admin = ADMINS[0]!;
  await check(`Text to ${worker.phone}`, worker.phone, () =>
    client.auth.signInWithOtp({
      phone: worker.phone,
      options: { shouldCreateUser: false },
    }),
  );
  await check(`Email to ${admin.email}`, admin.email, () =>
    client.auth.signInWithOtp({
      email: admin.email,
      options: { shouldCreateUser: false },
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
