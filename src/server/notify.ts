import "server-only";

import { getEmailSender } from "@/adapters/email";
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

/**
 * Emails the owners of a business about their account (approval, holds).
 * Like texts to workers, these always go.
 */
export async function emailBusinessOwners(
  businessId: string,
  message: { subject: string; text: string },
) {
  const admin = createAdminClient();
  const { data: owners } = await admin
    .from("business_users")
    .select("profiles!business_users_profile_id_fkey(email)")
    .eq("business_id", businessId)
    .eq("role", "owner")
    .is("archived_at", null)
    .not("profile_id", "is", null);
  const emails = (owners ?? [])
    .map((owner) => owner.profiles?.email)
    .filter((email): email is string => !!email);
  for (const to of emails) {
    try {
      await getEmailSender().send({ to, ...message, tag: "business-account" });
    } catch (error) {
      console.error("Couldn't send an email", error);
    }
  }
}

/** Emails one person, e.g. whoever posted a job, about their work. */
export async function emailPerson(
  profileId: string,
  message: { subject: string; text: string; tag: string },
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("id", profileId)
    .maybeSingle();
  if (!data?.email) return;
  try {
    await getEmailSender().send({ to: data.email, ...message });
  } catch (error) {
    console.error("Couldn't send an email", error);
  }
}
