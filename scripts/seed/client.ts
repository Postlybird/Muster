import { existsSync } from "node:fs";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/supabase/database.types";

export type SeedClient = SupabaseClient<Database>;

/** Reads .env.local when present (CI passes real environment variables). */
export function loadEnv() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
}

/**
 * The seed only ever writes demo data. It runs against the local database,
 * or a remote one only when SEED_ALLOW_REMOTE=true (the dev project in CI).
 */
export function createSeedClient(): { client: SeedClient; url: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (see .env.example).",
    );
  }

  const host = new URL(url).hostname;
  const isLocal = host === "127.0.0.1" || host === "localhost";
  if (!isLocal && process.env.SEED_ALLOW_REMOTE !== "true") {
    throw new Error(
      `Refusing to seed ${host}. Demo data only goes into the local database, or the dev project with SEED_ALLOW_REMOTE=true.`,
    );
  }

  const client = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { client, url };
}

export function check<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

/** Like check(), for queries that must return something. */
export function must<T>(
  result: { data: T | null; error: { message: string } | null },
  what: string,
): T {
  const data = check(result, what);
  if (data === null) throw new Error(`${what}: nothing returned`);
  return data;
}
