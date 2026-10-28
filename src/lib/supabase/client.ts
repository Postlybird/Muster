import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

import type { Database } from "./database.types";

/** Supabase client for Client Components. Acts as the signed-in user. */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
  );
}
