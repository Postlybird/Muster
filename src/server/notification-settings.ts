import "server-only";

import { z } from "zod";

import {
  CATEGORIES_FOR,
  NOTIFICATION_CATEGORIES,
  type Audience,
  type NotificationCategory,
} from "@/config/notifications";
import { readPrefs } from "@/domain/notifications";
import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

import { saveFailed } from "./errors";

/**
 * People choose what they hear about (brief §5: per-user preferences,
 * except critical messages). Saved on their own profile with their own
 * access.
 */

/** The categories someone can turn off: not critical ones, and not urgent call-outs (set with availability). */
export function choosableCategories(
  audience: Audience,
): NotificationCategory[] {
  return CATEGORIES_FOR[audience].filter(
    (category) =>
      !NOTIFICATION_CATEGORIES[category].critical && category !== "urgent_work",
  );
}

export async function saveNotificationPrefs(
  audience: Audience,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("Sign in again to change these.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .single();
  const prefs = readPrefs(profile?.notification_prefs);
  for (const category of choosableCategories(audience)) {
    prefs[category] = formData.get(category) === "on";
  }
  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: prefs })
    .eq("id", user.id);
  if (error) return saveFailed(error);
  return success("Saved. We'll send you what you've chosen.");
}

const device = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

/** This browser gets push notifications for the signed-in person. */
export async function savePushDevice(
  subscription: unknown,
  userAgent: string | null,
): Promise<ActionState> {
  const parsed = device.safeParse(subscription);
  if (!parsed.success) {
    return failure("This browser didn't give us what push needs.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
    p_user_agent: userAgent?.slice(0, 500) ?? undefined,
  });
  if (error) return saveFailed(error);
  return success("Notifications are on for this device.");
}

/** This browser stops getting them. */
export async function removePushDevice(endpoint: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_push_subscription", {
    p_endpoint: endpoint,
  });
  if (error) return saveFailed(error);
  return success("Notifications are off for this device.");
}

const phone = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(["ios", "android"]),
});

/** This phone (the app, docs/apps.md) gets notifications for the signed-in person. */
export async function saveAppDevice(
  token: unknown,
  platform: unknown,
): Promise<ActionState> {
  const parsed = phone.safeParse({ token, platform });
  if (!parsed.success) {
    return failure("This phone didn't give us what notifications need.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_app_device", {
    p_token: parsed.data.token,
    p_platform: parsed.data.platform,
  });
  if (error) return saveFailed(error);
  return success("Notifications are on for this phone.");
}

/** This phone stops getting them. */
export async function removeAppDevice(token: unknown): Promise<ActionState> {
  if (typeof token !== "string" || token.length > 4096) {
    return failure("That isn't this phone's notifications.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_app_device", { p_token: token });
  if (error) return saveFailed(error);
  return success("Notifications are off for this phone.");
}
