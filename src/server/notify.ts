import "server-only";

import { getSmsSender } from "@/adapters/sms";
import { brand } from "@/config/brand";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Texts a worker about their account. Step 1.14 replaces this with the full
 * notifications system (templates, preferences, quiet hours); account
 * messages like these are critical, so they always go.
 */
export async function textPerson(profileId: string, message: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("phone")
    .eq("id", profileId)
    .maybeSingle();
  if (!data?.phone) return;
  try {
    await getSmsSender().send({
      to: data.phone,
      body: `${brand.name}: ${message}`,
    });
  } catch (error) {
    console.error("Couldn't send a text", error);
  }
}
