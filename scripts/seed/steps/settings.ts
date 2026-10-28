import type { Json } from "../../../src/lib/supabase/database.types";
import { check, type SeedClient } from "../client";
import { SETTINGS } from "../data/settings";

/** Adds missing settings. Never overwrites a value an admin has changed. */
export async function seedSettings(client: SeedClient) {
  const rows = SETTINGS.map((s) => ({
    key: s.key,
    value: s.value as NonNullable<Json>,
    is_public: s.isPublic,
    description: s.description,
  }));
  const inserted = check(
    await client
      .from("settings")
      .upsert(rows, { onConflict: "key", ignoreDuplicates: true })
      .select("key"),
    "settings",
  );
  return { settings: inserted?.length ?? 0 };
}
