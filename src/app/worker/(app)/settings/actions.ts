"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { pushPublicKey } from "@/adapters/push";
import { requireRole } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { failure, type ActionState } from "@/lib/forms";
import {
  removePushDevice,
  saveNotificationPrefs,
  savePushDevice,
} from "@/server/notification-settings";

export async function savePreferences(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("worker");
  const result = await saveNotificationPrefs("worker", formData);
  revalidatePath("/worker/settings");
  return result;
}

/** Push on this phone: the browser's subscription. */
export async function turnOnPush(subscription: unknown): Promise<ActionState> {
  await requireRole("worker");
  return savePushDevice(subscription, (await headers()).get("user-agent"));
}

/**
 * Demo mode without push keys: a stand-in device, so messages that would
 * be pushed show in the outbox.
 */
export async function turnOnDemoPush(): Promise<
  ActionState & { endpoint?: string }
> {
  await requireRole("worker");
  if (!isDemoMode() || pushPublicKey()) {
    return failure("Use your phone's own notifications.");
  }
  const endpoint = `https://push.example/demo/${randomUUID()}`;
  const result = await savePushDevice(
    { endpoint, keys: { p256dh: "demo", auth: "demo" } },
    (await headers()).get("user-agent"),
  );
  return { ...result, endpoint };
}

export async function turnOffPush(endpoint: string): Promise<ActionState> {
  await requireRole("worker");
  return removePushDevice(endpoint);
}
