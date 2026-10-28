import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

import type { Database } from "./database.types";
import { freshFetch } from "./fresh-fetch";

/**
 * Service-role client. It BYPASSES row level security, so use it only for
 * scheduled jobs, seeding, demo-mode tools and admin actions that write to
 * the audit log. Never import it into client code.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Missing environment variable SUPABASE_SECRET_KEY. See .env.example.",
    );
  }
  return createClient<Database>(publicEnv.supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: freshFetch },
  });
}
