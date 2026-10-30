import type { Json } from "../../../src/lib/supabase/database.types";
import { check, type SeedClient } from "../client";
import { DEMO_ONLY_SETTINGS, SEED_SETTINGS } from "../data/settings";

/**
 * Demo company and bank names from before the rename to Shifta. Where a
 * setting still has one, nobody has changed it, so it takes the new demo
 * value.
 */
const RENAMED_DEMO_VALUES: { key: string; field: string; old: string }[] = [
  {
    key: "company_details",
    field: "legal_name",
    old: "Muster Labour Hire Pty Ltd (demo)",
  },
  {
    key: "bank_details",
    field: "account_name",
    old: "Muster Labour Hire (demo)",
  },
];

/** Adds missing settings. Never overwrites a value an admin has changed. */
export async function seedSettings(client: SeedClient) {
  const rows = [...SEED_SETTINGS, ...DEMO_ONLY_SETTINGS].map((s) => ({
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

  for (const { key, field, old } of RENAMED_DEMO_VALUES) {
    const current = check(
      await client.from("settings").select("value").eq("key", key).single(),
      `settings ${key}`,
    );
    const value = current?.value as Record<string, unknown> | null;
    const seeded = SEED_SETTINGS.find((s) => s.key === key);
    if (value?.[field] !== old || !seeded) continue;
    check(
      await client
        .from("settings")
        .update({ value: seeded.value as NonNullable<Json> })
        .eq("key", key)
        .select("key"),
      `settings ${key}`,
    );
  }
  return { settings: inserted?.length ?? 0 };
}
