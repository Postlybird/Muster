"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/forms";
import { getMyBusiness } from "@/server/businesses";
import { saveNotificationPrefs } from "@/server/notification-settings";

/** What this person at the business is emailed about. */
export async function savePreferences(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getMyBusiness();
  const result = await saveNotificationPrefs("business", formData);
  revalidatePath("/business/settings");
  return result;
}
