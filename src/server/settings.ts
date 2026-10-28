import "server-only";

import { cache } from "react";

import {
  parseSetting,
  settingKeys,
  type SettingsValues,
} from "@/config/settings";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every policy setting, typed. Values that are missing or invalid fall back
 * to the registry default. Server-only: it can read commercial settings.
 */
export const getAllSettings = cache(async (): Promise<SettingsValues> => {
  const admin = createAdminClient();
  const { data } = await admin.from("settings").select("key, value");
  const stored = new Map((data ?? []).map((row) => [row.key, row.value]));
  return Object.fromEntries(
    settingKeys.map((key) => [key, parseSetting(key, stored.get(key)).value]),
  ) as SettingsValues;
});
