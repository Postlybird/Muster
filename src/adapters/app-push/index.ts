import "server-only";

import { isDemoMode } from "@/lib/env";

import { providerFor } from "../provider";
import { FcmAppPushSender } from "./fcm";
import { MockAppPushSender } from "./mock";
import type { AppPushSender } from "./types";

export type { AppPushSender, AppPushTarget } from "./types";

/**
 * Notifications to the phone apps (docs/apps.md), or null where they can't
 * go: pretend ones would count as delivered, so nobody would get a text
 * instead, and outside the demo phones get them only once Firebase is set up.
 */
export function getAppPushSender(): AppPushSender | null {
  if (providerFor("APP_PUSH_PROVIDER", ["mock", "fcm"]) === "fcm") {
    return new FcmAppPushSender();
  }
  return isDemoMode() ? new MockAppPushSender() : null;
}
